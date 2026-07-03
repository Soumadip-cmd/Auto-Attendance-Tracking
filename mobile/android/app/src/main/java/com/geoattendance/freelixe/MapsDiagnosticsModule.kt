package com.geoattendance.freelixe

import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.security.MessageDigest

class MapsDiagnosticsModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "MapsDiagnostics"

  @ReactMethod
  fun getNativeConfig(promise: Promise) {
    try {
      val packageName = reactContext.packageName
      val packageManager = reactContext.packageManager
      val appInfo = getApplicationInfo(packageManager, packageName)
      val packageInfo = getPackageInfo(packageManager, packageName)
      val signatureBytes = getSignatures(packageInfo).firstOrNull()?.toByteArray()

      val result = Arguments.createMap()
      result.putBoolean("nativeModuleAvailable", true)
      result.putString("packageName", packageName)
      result.putString(
        "googleMapsApiKey",
        appInfo.metaData?.getString("com.google.android.geo.API_KEY")
      )
      result.putString("signingSha1", signatureBytes?.let { fingerprint(it, "SHA-1") })
      result.putString("signingSha256", signatureBytes?.let { fingerprint(it, "SHA-256") })
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("MAPS_DIAGNOSTICS_FAILED", error.message, error)
    }
  }

  private fun getApplicationInfo(
    packageManager: PackageManager,
    packageName: String
  ): ApplicationInfo =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      packageManager.getApplicationInfo(
        packageName,
        PackageManager.ApplicationInfoFlags.of(PackageManager.GET_META_DATA.toLong())
      )
    } else {
      @Suppress("DEPRECATION")
      packageManager.getApplicationInfo(packageName, PackageManager.GET_META_DATA)
    }

  private fun getPackageInfo(packageManager: PackageManager, packageName: String): PackageInfo =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      packageManager.getPackageInfo(
        packageName,
        PackageManager.PackageInfoFlags.of(PackageManager.GET_SIGNING_CERTIFICATES.toLong())
      )
    } else {
      @Suppress("DEPRECATION")
      packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNATURES)
    }

  private fun getSignatures(packageInfo: PackageInfo) =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      packageInfo.signingInfo?.apkContentsSigners?.toList().orEmpty()
    } else {
      @Suppress("DEPRECATION")
      packageInfo.signatures?.toList().orEmpty()
    }

  private fun fingerprint(bytes: ByteArray, algorithm: String): String {
    val digest = MessageDigest.getInstance(algorithm).digest(bytes)
    return digest.joinToString(":") { "%02X".format(it) }
  }
}
