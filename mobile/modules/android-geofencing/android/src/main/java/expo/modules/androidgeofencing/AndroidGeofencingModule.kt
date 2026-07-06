package expo.modules.androidgeofencing

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.android.gms.location.ActivityRecognition
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionRequest
import com.google.android.gms.location.DetectedActivity
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.tasks.Tasks
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import org.json.JSONArray
import org.json.JSONObject

class GeofenceRegion : Record {
    @Field var identifier: String = ""
    @Field var latitude: Double = 0.0
    @Field var longitude: Double = 0.0
    @Field var radius: Double = 100.0
    @Field var notifyOnEnter: Boolean = true
    @Field var notifyOnExit: Boolean = true
}

class AndroidGeofencingModule : Module() {

    companion object {
        @Volatile var onTransition: ((Map<String, Any?>) -> Unit)? = null
        @Volatile var onActivityChanged: ((Map<String, Any?>) -> Unit)? = null

        internal const val PREFS_NAME = "AndroidGeofencing"
        internal const val REGISTERED_KEY = "registered_geofences"

        internal fun persistRegisteredGeofences(context: Context, regions: List<GeofenceRegion>) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val array = JSONArray()
            regions.forEach { r ->
                array.put(
                    JSONObject().apply {
                        put("identifier", r.identifier)
                        put("latitude", r.latitude)
                        put("longitude", r.longitude)
                        put("radius", r.radius)
                        put("notifyOnEnter", r.notifyOnEnter)
                        put("notifyOnExit", r.notifyOnExit)
                    }
                )
            }
            prefs.edit().putString(REGISTERED_KEY, array.toString()).apply()
        }

        internal fun readRegisteredGeofences(context: Context): List<GeofenceRegion> {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val json = prefs.getString(REGISTERED_KEY, "[]") ?: "[]"
            val array = JSONArray(json)
            return (0 until array.length()).map { i ->
                val obj = array.getJSONObject(i)
                GeofenceRegion().apply {
                    identifier = obj.getString("identifier")
                    latitude = obj.getDouble("latitude")
                    longitude = obj.getDouble("longitude")
                    radius = obj.getDouble("radius")
                    notifyOnEnter = obj.getBoolean("notifyOnEnter")
                    notifyOnExit = obj.getBoolean("notifyOnExit")
                }
            }
        }
    }

    private val context get() = appContext.reactContext!!

    private val geofencingClient by lazy { LocationServices.getGeofencingClient(context) }
    private val activityClient by lazy { ActivityRecognition.getClient(context) }

    private val geofencePendingIntent: PendingIntent by lazy {
        val intent = Intent(context, GeofenceBroadcastReceiver::class.java)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or mutableFlag()
        PendingIntent.getBroadcast(context, 0, intent, flags)
    }

    private val activityPendingIntent: PendingIntent by lazy {
        val intent = Intent(context, ActivityTransitionReceiver::class.java)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or mutableFlag()
        PendingIntent.getBroadcast(context, 1, intent, flags)
    }

    private fun mutableFlag() =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0

    override fun definition() = ModuleDefinition {
        Name("AndroidGeofencing")

        Events("onGeofenceTransition", "onActivityChanged")

        OnStartObserving("onGeofenceTransition") {
            onTransition = { data -> sendEvent("onGeofenceTransition", data) }
        }
        OnStopObserving("onGeofenceTransition") {
            onTransition = null
        }

        OnStartObserving("onActivityChanged") {
            onActivityChanged = { data -> sendEvent("onActivityChanged", data) }
        }
        OnStopObserving("onActivityChanged") {
            onActivityChanged = null
        }

        // ── Geofencing ────────────────────────────────────────────────────────

        AsyncFunction("addGeofences") { regions: List<GeofenceRegion> ->
            if (!hasLocationPermission()) throw Exception("Location permission is not granted")

            val geofences = regions.map { r ->
                var t = 0
                if (r.notifyOnEnter) t = t or Geofence.GEOFENCE_TRANSITION_ENTER
                if (r.notifyOnExit) t = t or Geofence.GEOFENCE_TRANSITION_EXIT
                if (t == 0) t = Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT

                Geofence.Builder()
                    .setRequestId(r.identifier)
                    .setCircularRegion(r.latitude, r.longitude, r.radius.toFloat().coerceAtLeast(10f))
                    .setExpirationDuration(Geofence.NEVER_EXPIRE)
                    .setTransitionTypes(t)
                    .setNotificationResponsiveness(5_000)
                    .build()
            }

            if (geofences.isNotEmpty()) {
                val request = GeofencingRequest.Builder()
                    .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
                    .addGeofences(geofences)
                    .build()
                Tasks.await(geofencingClient.addGeofences(request, geofencePendingIntent))
            }

            // Snapshot what should be registered so BootCompletedReceiver can
            // restore it after a reboot, which wipes all geofences system-wide
            // and would otherwise leave auto check-in silently off until the
            // user manually reopens the app.
            persistRegisteredGeofences(context, regions)
        }

        AsyncFunction("removeGeofences") { identifiers: List<String> ->
            Tasks.await(geofencingClient.removeGeofences(identifiers))
        }

        AsyncFunction("removeAllGeofences") {
            Tasks.await(geofencingClient.removeGeofences(geofencePendingIntent))
            persistRegisteredGeofences(context, emptyList())
        }

        AsyncFunction("getPendingEvents") {
            val prefs = context.getSharedPreferences("AndroidGeofencing", Context.MODE_PRIVATE)
            val json = prefs.getString("pending_events", "[]") ?: "[]"
            prefs.edit().putString("pending_events", "[]").apply()
            val arr = JSONArray(json)
            (0 until arr.length()).map { i ->
                val obj = arr.getJSONObject(i)
                mapOf(
                    "identifier" to obj.getString("identifier"),
                    "transitionType" to obj.getString("transitionType"),
                    "timestamp" to obj.getString("timestamp"),
                    "latitude" to obj.getDouble("latitude"),
                    "longitude" to obj.getDouble("longitude"),
                )
            }
        }

        // ── Activity Recognition (Google SDK) ─────────────────────────────────

        AsyncFunction("startWalkingDetection") {
            if (!hasActivityPermission()) throw Exception("ACTIVITY_RECOGNITION permission not granted")

            val transitions = listOf(
                DetectedActivity.WALKING,
                DetectedActivity.RUNNING,
                DetectedActivity.ON_FOOT,
                DetectedActivity.STILL,
                DetectedActivity.IN_VEHICLE,
            ).flatMap { type ->
                listOf(
                    ActivityTransition.Builder()
                        .setActivityType(type)
                        .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER)
                        .build(),
                    ActivityTransition.Builder()
                        .setActivityType(type)
                        .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_EXIT)
                        .build(),
                )
            }

            Tasks.await(
                activityClient.requestActivityTransitionUpdates(
                    ActivityTransitionRequest(transitions),
                    activityPendingIntent
                )
            )
        }

        AsyncFunction("stopWalkingDetection") {
            Tasks.await(activityClient.removeActivityTransitionUpdates(activityPendingIntent))
        }
    }

    private fun hasLocationPermission(): Boolean {
        val fg = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED

        val bg = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) ==
                PackageManager.PERMISSION_GRANTED

        return fg && bg
    }

    private fun hasActivityPermission(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.ACTIVITY_RECOGNITION) ==
                PackageManager.PERMISSION_GRANTED
}
