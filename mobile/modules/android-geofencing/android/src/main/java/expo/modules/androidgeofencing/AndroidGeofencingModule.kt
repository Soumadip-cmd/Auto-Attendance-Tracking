package expo.modules.androidgeofencing

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import kotlinx.coroutines.suspendCancellableCoroutine
import org.json.JSONArray
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class GeofenceRegion : Record {
    @Field
    var identifier: String = ""

    @Field
    var latitude: Double = 0.0

    @Field
    var longitude: Double = 0.0

    @Field
    var radius: Double = 100.0

    @Field
    var notifyOnEnter: Boolean = true

    @Field
    var notifyOnExit: Boolean = true
}

class AndroidGeofencingModule : Module() {

    companion object {
        @Volatile
        var onTransition: ((Map<String, Any?>) -> Unit)? = null
    }

    private val context get() = appContext.reactContext!!

    private val geofencingClient by lazy {
        LocationServices.getGeofencingClient(context)
    }

    private val geofencePendingIntent: PendingIntent by lazy {
        val intent = Intent(context, GeofenceBroadcastReceiver::class.java)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
        PendingIntent.getBroadcast(context, 0, intent, flags)
    }

    override fun definition() = ModuleDefinition {
        Name("AndroidGeofencing")

        Events("onGeofenceTransition")

        OnStartObserving("onGeofenceTransition") {
            onTransition = { data -> sendEvent("onGeofenceTransition", data) }
        }

        OnStopObserving("onGeofenceTransition") {
            onTransition = null
        }

        AsyncFunction("addGeofences") { regions: List<GeofenceRegion> ->
            if (!hasPermission()) throw Exception("Location permission is not granted")

            val geofences = regions.map { region ->
                var transitions = 0
                if (region.notifyOnEnter) transitions = transitions or Geofence.GEOFENCE_TRANSITION_ENTER
                if (region.notifyOnExit) transitions = transitions or Geofence.GEOFENCE_TRANSITION_EXIT
                if (transitions == 0) transitions = Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT

                Geofence.Builder()
                    .setRequestId(region.identifier)
                    .setCircularRegion(
                        region.latitude,
                        region.longitude,
                        region.radius.toFloat().coerceAtLeast(10f)
                    )
                    .setExpirationDuration(Geofence.NEVER_EXPIRE)
                    .setTransitionTypes(transitions)
                    .setNotificationResponsiveness(5_000)
                    .build()
            }

            if (geofences.isNotEmpty()) {
                val request = GeofencingRequest.Builder()
                    .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
                    .addGeofences(geofences)
                    .build()

                suspendCancellableCoroutine { cont ->
                    geofencingClient.addGeofences(request, geofencePendingIntent)
                        .addOnSuccessListener { cont.resume(Unit) }
                        .addOnFailureListener { cont.resumeWithException(it) }
                }
            }
        }

        AsyncFunction("removeGeofences") { identifiers: List<String> ->
            suspendCancellableCoroutine { cont ->
                geofencingClient.removeGeofences(identifiers)
                    .addOnSuccessListener { cont.resume(Unit) }
                    .addOnFailureListener { cont.resumeWithException(it) }
            }
        }

        AsyncFunction("removeAllGeofences") {
            suspendCancellableCoroutine { cont ->
                geofencingClient.removeGeofences(geofencePendingIntent)
                    .addOnSuccessListener { cont.resume(Unit) }
                    .addOnFailureListener { cont.resumeWithException(it) }
            }
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
    }

    private fun hasPermission(): Boolean {
        val fg = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(
                    context, Manifest.permission.ACCESS_COARSE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED

        val bg = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
                ContextCompat.checkSelfPermission(
                    context, Manifest.permission.ACCESS_BACKGROUND_LOCATION
                ) == PackageManager.PERMISSION_GRANTED

        return fg && bg
    }
}
