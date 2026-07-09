package expo.modules.androidgeofencing

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.concurrent.thread

private const val TAG = "GeofenceBroadcastReceiver"
private const val CHANNEL_ID = "geofence_alerts"
private const val PREFS_NAME = "AndroidGeofencing"
private const val PREFS_KEY = "pending_events"

class GeofenceBroadcastReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val event = GeofencingEvent.fromIntent(intent) ?: return

        if (event.hasError()) {
            Log.e(TAG, "GeofencingEvent error code: ${event.errorCode}")
            return
        }

        val transitionType = when (event.geofenceTransition) {
            Geofence.GEOFENCE_TRANSITION_ENTER -> "enter"
            Geofence.GEOFENCE_TRANSITION_EXIT -> "exit"
            else -> return
        }

        val deviceLocation = event.triggeringLocation
        val lat = deviceLocation?.latitude ?: 0.0
        val lng = deviceLocation?.longitude ?: 0.0
        val timestamp = isoTimestamp()

        val geofences = event.triggeringGeofences ?: return

        // The app being fully killed is the whole point of this receiver —
        // collect the new-state transitions on the main thread (fast,
        // SharedPreferences-only work), then do the slow parts (network) on
        // a background thread under goAsync() so we don't violate
        // NetworkOnMainThreadException or get killed mid-request.
        val newEvents = mutableListOf<Map<String, Any?>>()
        for (geofence in geofences) {
            // Skip if this geofence is already in this state (GPS oscillation guard)
            if (isSameState(context, geofence.requestId, transitionType)) continue
            saveState(context, geofence.requestId, transitionType)

            val data = mapOf<String, Any?>(
                "identifier" to geofence.requestId,
                "transitionType" to transitionType,
                "timestamp" to timestamp,
                "latitude" to lat,
                "longitude" to lng,
            )

            // Forward to JS if the module is alive (app in foreground/background)
            AndroidGeofencingModule.onTransition?.invoke(data)

            // Persist for when the app is killed — drained via getPendingEvents() on restart
            persistEvent(context, data)
            newEvents.add(data)
        }

        // Only handle the "app killed" fallback when JS is NOT listening.
        // When JS is alive it submits the event itself and shows its own
        // notification, so doing it here too would duplicate both.
        if (newEvents.isNotEmpty() && AndroidGeofencingModule.onTransition == null) {
            val pendingResult = goAsync()
            thread(start = true) {
                try {
                    newEvents.forEach { data ->
                        showNotification(context, data["transitionType"] as String, data["identifier"] as String)
                        submitDirectly(context, data)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to process killed-app geofence event", e)
                } finally {
                    pendingResult.finish()
                }
            }
        }
    }

    /**
     * Submits the geofence transition straight to the backend using a cached
     * token (see AndroidGeofencingModule.cacheAuthContext), so check-in/out
     * still happens immediately even though the app process is dead — not
     * just queued for whenever the user next opens the app. If this fails
     * (no network, expired token, etc.) the event stays queued via
     * persistEvent() above and will be retried by drainPendingGeofenceEvents()
     * on next launch — this is a best-effort fast path, not a replacement.
     */
    private fun submitDirectly(context: Context, data: Map<String, Any?>) {
        val authPrefs = context.getSharedPreferences(
            AndroidGeofencingModule.AUTH_PREFS_NAME, Context.MODE_PRIVATE
        )
        var token = authPrefs.getString(AndroidGeofencingModule.AUTH_TOKEN_KEY, null)
        val baseUrl = authPrefs.getString(AndroidGeofencingModule.AUTH_BASE_URL_KEY, null)
        val refreshToken = authPrefs.getString(AndroidGeofencingModule.AUTH_REFRESH_TOKEN_KEY, null)
        if (token.isNullOrEmpty() || baseUrl.isNullOrEmpty()) {
            Log.w(TAG, "No cached auth context — skipping direct submit, will drain on next app open")
            return
        }

        val eventId = "${data["identifier"]}:${data["transitionType"]}:${data["timestamp"]}"
        val body = JSONObject().apply {
            put("geofenceId", data["identifier"])
            put("eventType", data["transitionType"])
            put("latitude", data["latitude"])
            put("longitude", data["longitude"])
            put("timestamp", data["timestamp"])
            put("eventId", eventId)
        }.toString()

        var code = postGeofenceEvent(baseUrl, token, body)
        Log.i(TAG, "Direct geofence submit (${data["transitionType"]}) -> HTTP $code")

        // The cached access token is short-lived (15 min) and, unlike the JS
        // side, nothing refreshes it in the background once the app is
        // killed — so it's routinely stale by the time a geofence fires.
        // Use the long-lived cached refresh token to mint a new one here,
        // natively, and retry once, instead of giving up and only queuing.
        if (code == 401 && !refreshToken.isNullOrEmpty()) {
            val newToken = refreshAccessToken(baseUrl, refreshToken)
            if (!newToken.isNullOrEmpty()) {
                authPrefs.edit().putString(AndroidGeofencingModule.AUTH_TOKEN_KEY, newToken).apply()
                token = newToken
                code = postGeofenceEvent(baseUrl, token, body)
                Log.i(TAG, "Direct geofence submit retry after token refresh -> HTTP $code")
            }
        }
    }

    private fun postGeofenceEvent(baseUrl: String, token: String, body: String): Int {
        var connection: HttpURLConnection? = null
        return try {
            connection = (URL("$baseUrl/live-tracking/geofence-event").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                connectTimeout = 15_000
                readTimeout = 15_000
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer $token")
            }
            connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            connection.responseCode
        } catch (e: Exception) {
            Log.e(TAG, "Direct geofence submit failed, will rely on queued drain", e)
            -1
        } finally {
            connection?.disconnect()
        }
    }

    private fun refreshAccessToken(baseUrl: String, refreshToken: String): String? {
        var connection: HttpURLConnection? = null
        return try {
            connection = (URL("$baseUrl/auth/refresh").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                connectTimeout = 15_000
                readTimeout = 15_000
                setRequestProperty("Content-Type", "application/json")
            }
            val body = JSONObject().apply { put("refreshToken", refreshToken) }.toString()
            connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            if (connection.responseCode != 200) {
                Log.w(TAG, "Native token refresh failed -> HTTP ${connection.responseCode}")
                return null
            }
            val responseText = connection.inputStream.bufferedReader().use { it.readText() }
            JSONObject(responseText).getJSONObject("data").getString("token")
        } catch (e: Exception) {
            Log.e(TAG, "Native token refresh request failed", e)
            null
        } finally {
            connection?.disconnect()
        }
    }

    private fun isSameState(context: Context, geofenceId: String, transitionType: String): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString("gf_state_$geofenceId", null) == transitionType
    }

    private fun saveState(context: Context, geofenceId: String, transitionType: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString("gf_state_$geofenceId", transitionType).apply()
    }

    private fun persistEvent(context: Context, data: Map<String, Any?>) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val existing = JSONArray(prefs.getString(PREFS_KEY, "[]") ?: "[]")
        existing.put(
            JSONObject().apply {
                put("identifier", data["identifier"])
                put("transitionType", data["transitionType"])
                put("timestamp", data["timestamp"])
                put("latitude", data["latitude"])
                put("longitude", data["longitude"])
            }
        )
        prefs.edit().putString(PREFS_KEY, existing.toString()).apply()
    }

    private fun showNotification(context: Context, transitionType: String, geofenceId: String) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Geofence Alerts",
                NotificationManager.IMPORTANCE_HIGH
            )
            manager.createNotificationChannel(channel)
        }

        val title = if (transitionType == "exit") "Outside allowed area" else "Inside allowed area"
        val body = if (transitionType == "exit") {
            "Your location is outside the allowed area. Your HOD/admin may be notified."
        } else {
            "Your attendance location is inside the allowed area."
        }

        // Prefer the app's notification_icon (set by expo-notifications plugin), fall back to system icon
        val iconRes = context.resources
            .getIdentifier("notification_icon", "drawable", context.packageName)
            .takeIf { it != 0 } ?: android.R.drawable.ic_dialog_info

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(iconRes)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        manager.notify(geofenceId.hashCode(), notification)
    }
}

private fun isoTimestamp(): String {
    val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    sdf.timeZone = TimeZone.getTimeZone("UTC")
    return sdf.format(Date())
}
