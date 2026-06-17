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
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

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

            // Only show native notification when JS is NOT listening (app killed).
            // When JS is alive it handles the notification itself to avoid duplicates.
            if (AndroidGeofencingModule.onTransition == null) {
                showNotification(context, transitionType, geofence.requestId)
            }
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
