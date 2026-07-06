package expo.modules.androidgeofencing

import android.Manifest
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.tasks.Tasks
import kotlin.concurrent.thread

private const val TAG = "BootCompletedReceiver"

/**
 * Android wipes every registered geofence on reboot (and can drop them across
 * an app update). Without this, auto check-in/out would silently stay off
 * until the user happened to reopen the app. We persist the last-registered
 * geofence list (see AndroidGeofencingModule.persistRegisteredGeofences) and
 * restore it here directly against Play Services — no JS/network call needed,
 * so it works even though the React Native runtime isn't running yet.
 */
class BootCompletedReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
            intent.action != Intent.ACTION_MY_PACKAGE_REPLACED
        ) {
            return
        }

        val appContext = context.applicationContext
        val pendingResult = goAsync()

        // GeofencingClient calls block, so do this off the main thread and
        // finish() the receiver's async token when done (or on any failure)
        // so Android doesn't consider it stuck.
        thread(start = true) {
            try {
                restoreGeofences(appContext)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to restore geofences after boot", e)
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun restoreGeofences(context: Context) {
        val regions = AndroidGeofencingModule.readRegisteredGeofences(context)
        if (regions.isEmpty()) {
            Log.i(TAG, "No persisted geofences to restore")
            return
        }

        if (!hasLocationPermission(context)) {
            Log.w(TAG, "Skipping geofence restore — background location permission not granted")
            return
        }

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

        val request = GeofencingRequest.Builder()
            .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
            .addGeofences(geofences)
            .build()

        val flags = PendingIntent.FLAG_UPDATE_CURRENT or
            (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
        val pendingIntent = PendingIntent.getBroadcast(
            context, 0, Intent(context, GeofenceBroadcastReceiver::class.java), flags
        )

        Tasks.await(LocationServices.getGeofencingClient(context).addGeofences(request, pendingIntent))
        Log.i(TAG, "Restored ${geofences.size} geofence(s) after boot/update")
    }

    private fun hasLocationPermission(context: Context): Boolean {
        val fg = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED

        val bg = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) ==
                PackageManager.PERMISSION_GRANTED

        return fg && bg
    }
}
