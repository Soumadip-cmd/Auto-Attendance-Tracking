package expo.modules.androidgeofencing

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionResult
import com.google.android.gms.location.DetectedActivity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

private const val TAG = "ActivityTransitionRcvr"

class ActivityTransitionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (!ActivityTransitionResult.hasResult(intent)) return
        val result = ActivityTransitionResult.extractResult(intent) ?: return

        for (event in result.transitionEvents) {
            val activity = activityName(event.activityType)
            val transition = if (event.transitionType == ActivityTransition.ACTIVITY_TRANSITION_ENTER) "ENTER" else "EXIT"

            val data = mapOf<String, Any?>(
                "activity" to activity,
                "transition" to transition,
                "isWalking" to (event.activityType == DetectedActivity.WALKING ||
                        event.activityType == DetectedActivity.ON_FOOT ||
                        event.activityType == DetectedActivity.RUNNING),
                "timestamp" to isoNow(),
            )

            Log.d(TAG, "Activity: $activity $transition")
            AndroidGeofencingModule.onActivityChanged?.invoke(data)
        }
    }

    private fun activityName(type: Int): String = when (type) {
        DetectedActivity.WALKING -> "WALKING"
        DetectedActivity.RUNNING -> "RUNNING"
        DetectedActivity.ON_BICYCLE -> "ON_BICYCLE"
        DetectedActivity.IN_VEHICLE -> "IN_VEHICLE"
        DetectedActivity.STILL -> "STILL"
        DetectedActivity.ON_FOOT -> "ON_FOOT"
        DetectedActivity.TILTING -> "TILTING"
        else -> "UNKNOWN"
    }
}

private fun isoNow(): String {
    val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    sdf.timeZone = TimeZone.getTimeZone("UTC")
    return sdf.format(Date())
}
