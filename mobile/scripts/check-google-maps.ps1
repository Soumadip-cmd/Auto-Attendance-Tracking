param(
  [switch]$CollectLogcat,
  [switch]$RunGradleSigningReport
)

$ErrorActionPreference = 'Continue'

function Write-Section($title) {
  Write-Host ""
  Write-Host "== $title ==" -ForegroundColor Cyan
}

function Write-Ok($message) {
  Write-Host "[OK] $message" -ForegroundColor Green
}

function Write-Warn($message) {
  Write-Host "[WARN] $message" -ForegroundColor Yellow
}

function Write-Fail($message) {
  Write-Host "[FAIL] $message" -ForegroundColor Red
}

function Mask-Key($key) {
  if ([string]::IsNullOrWhiteSpace($key)) { return '<missing>' }
  if ($key.Length -le 12) { return '<too-short>' }
  return "$($key.Substring(0, 8))...$($key.Substring($key.Length - 4))"
}

function Read-Text($path) {
  if (Test-Path $path) {
    return Get-Content -LiteralPath $path -Raw
  }
  return ''
}

function Match-First($text, $pattern) {
  $match = [regex]::Match($text, $pattern)
  if ($match.Success) { return $match.Groups[1].Value }
  return $null
}

function Find-Adb {
  $cmd = Get-Command adb -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $candidates = @(
    $env:ANDROID_HOME,
    $env:ANDROID_SDK_ROOT,
    (Join-Path $env:LOCALAPPDATA 'Android\Sdk')
  ) | Where-Object { $_ -and (Test-Path $_) }

  foreach ($sdk in $candidates) {
    $adb = Join-Path $sdk 'platform-tools\adb.exe'
    if (Test-Path $adb) { return $adb }
  }

  return $null
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobileRoot = Resolve-Path (Join-Path $scriptRoot '..')
$repoRoot = Resolve-Path (Join-Path $mobileRoot '..')

$manifestPath = Join-Path $mobileRoot 'android\app\src\main\AndroidManifest.xml'
$buildGradlePath = Join-Path $mobileRoot 'android\app\build.gradle'
$appConfigPath = Join-Path $mobileRoot 'app.config.js'
$appJsonPath = Join-Path $mobileRoot 'app.json'
$envPath = Join-Path $mobileRoot '.env'
$debugKeystorePath = Join-Path $mobileRoot 'android\app\debug.keystore'

$manifest = Read-Text $manifestPath
$buildGradle = Read-Text $buildGradlePath
$appConfig = Read-Text $appConfigPath
$appJson = Read-Text $appJsonPath
$envText = Read-Text $envPath

Write-Section 'Android Google Maps Config'

$applicationId = Match-First $buildGradle "applicationId\s+['""]([^'""]+)['""]"
$namespace = Match-First $buildGradle "namespace\s+['""]([^'""]+)['""]"
$manifestKey = Match-First $manifest 'com\.google\.android\.geo\.API_KEY" android:value="([^"]+)'
$envKey = Match-First $envText '(?m)^\s*GOOGLE_MAPS_API_KEY\s*=\s*([^\r\n#]+)'
$appJsonKey = Match-First $appJson '"googleMaps"\s*:\s*\{\s*"apiKey"\s*:\s*"([^"]+)'
$appConfigFallbackKey = Match-First $appConfig 'GOOGLE_MAPS_API_KEY\s*=.*?\|\|\s*"([^"]+)'

if ($applicationId) { Write-Ok "applicationId: $applicationId" } else { Write-Fail 'applicationId not found in android/app/build.gradle' }
if ($namespace) { Write-Ok "namespace: $namespace" } else { Write-Warn 'namespace not found in android/app/build.gradle' }

if ($manifestKey) {
  Write-Ok "AndroidManifest Google Maps key: $(Mask-Key $manifestKey)"
} else {
  Write-Fail 'AndroidManifest is missing com.google.android.geo.API_KEY metadata'
}

if ($envKey) { Write-Ok ".env GOOGLE_MAPS_API_KEY: $(Mask-Key $envKey.Trim())" } else { Write-Warn '.env GOOGLE_MAPS_API_KEY missing' }
if ($appConfigFallbackKey) { Write-Ok "app.config.js fallback key: $(Mask-Key $appConfigFallbackKey)" }
if ($appJsonKey) {
  if ($manifestKey -and $appJsonKey.Trim() -eq $manifestKey.Trim()) {
    Write-Ok "app.json key matches native key: $(Mask-Key $appJsonKey)"
  } else {
    Write-Warn "app.json has separate key: $(Mask-Key $appJsonKey) (ignored when app.config.js exists, but confusing if it differs)"
  }
}

$distinctKeys = @($manifestKey, $envKey, $appConfigFallbackKey) | Where-Object { $_ } | ForEach-Object { $_.Trim() } | Select-Object -Unique
if ($distinctKeys.Count -gt 1) {
  Write-Warn 'Manifest/.env/app.config keys are not all identical. Rebuild native app after changing keys.'
}
if ($appJsonKey -and $manifestKey -and $appJsonKey.Trim() -ne $manifestKey.Trim()) {
  Write-Warn 'app.json key differs from native AndroidManifest key. app.config.js should win, but keep only one key to avoid mistakes.'
}

Write-Section 'Required Android Permissions'

$requiredPermissions = @(
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION'
)

foreach ($permission in $requiredPermissions) {
  if ($manifest -match [regex]::Escape($permission)) {
    Write-Ok $permission
  } else {
    if ($permission -eq 'android.permission.ACCESS_NETWORK_STATE') {
      Write-Warn "$permission missing in generated manifest. Usually not fatal, but useful for network state."
    } else {
      Write-Fail "$permission missing in generated manifest"
    }
  }
}

if ($manifest -match 'android.permission.ACCESS_BACKGROUND_LOCATION') {
  Write-Ok 'android.permission.ACCESS_BACKGROUND_LOCATION present'
} else {
  Write-Warn 'Background location permission not present. Foreground map can still work.'
}

Write-Section 'Debug SHA-1 Fingerprint'

$keytool = Get-Command keytool -ErrorAction SilentlyContinue
if ($keytool -and (Test-Path $debugKeystorePath)) {
  $keytoolOutput = & $keytool.Source -list -v -keystore $debugKeystorePath -storepass android -alias androiddebugkey -keypass android 2>&1
  $sha1 = ($keytoolOutput | Select-String -Pattern 'SHA1:\s*(.+)$' | Select-Object -First 1).Matches.Groups[1].Value.Trim()
  $sha256 = ($keytoolOutput | Select-String -Pattern 'SHA256:\s*(.+)$' | Select-Object -First 1).Matches.Groups[1].Value.Trim()
  if ($sha1) {
    Write-Ok "debug SHA-1: $sha1"
    Write-Host "Use this in Google Cloud Android app restriction with package: $applicationId" -ForegroundColor Gray
  } else {
    Write-Fail 'Could not read debug SHA-1 from debug.keystore'
  }
  if ($sha256) { Write-Ok "debug SHA-256: $sha256" }
} else {
  Write-Warn 'keytool or android/app/debug.keystore not found'
}

if ($RunGradleSigningReport) {
  Write-Section 'Gradle signingReport'
  Push-Location (Join-Path $mobileRoot 'android')
  try {
    & .\gradlew.bat signingReport
  } finally {
    Pop-Location
  }
}

Write-Section 'Connected Device / Logcat'

$adb = Find-Adb
if (!$adb) {
  Write-Warn 'adb not found. Install Android platform-tools or set ANDROID_HOME.'
} else {
  Write-Ok "adb: $adb"
  $devicesOutput = & $adb devices
  $devices = $devicesOutput | Where-Object { $_ -match "`tdevice$" }

  if (!$devices -or $devices.Count -eq 0) {
    Write-Warn 'No Android device connected/authorized. Connect phone with USB debugging, then rerun with -CollectLogcat.'
  } else {
    Write-Ok "Connected devices: $($devices -join ', ')"
    if ($applicationId) {
      $installed = & $adb shell pm list packages $applicationId 2>$null
      if ($installed -match [regex]::Escape($applicationId)) {
        Write-Ok "App package installed on device: $applicationId"
        $permDump = & $adb shell dumpsys package $applicationId 2>$null
        foreach ($permission in $requiredPermissions) {
          if ($permDump -match [regex]::Escape($permission)) {
            Write-Ok "Device package permission seen: $permission"
          } else {
            Write-Warn "Device package permission not seen in dumpsys: $permission"
          }
        }
      } else {
        Write-Warn "Package $applicationId not installed on connected device"
      }
    }

    if ($CollectLogcat) {
      Write-Section 'Google Maps Logcat Errors'
      $patterns = 'Google Maps Android API|Authorization failure|API key|MapsInitializer|GoogleMap|MapView|Tile|DynamiteModule|com.google.android.gms.maps'
      $log = & $adb logcat -d -v time 2>$null | Select-String -Pattern $patterns
      if ($log) {
        $log | Select-Object -Last 120 | ForEach-Object { $_.Line }
      } else {
        Write-Ok 'No obvious Google Maps errors found in current logcat buffer.'
      }
      Write-Host ''
      Write-Host 'Tip: open the Map tab, wait 10 seconds, then rerun: powershell -ExecutionPolicy Bypass -File .\scripts\check-google-maps.ps1 -CollectLogcat' -ForegroundColor Gray
    }
  }
}

Write-Section 'Google Cloud Checklist'
Write-Host "1. API enabled: Maps SDK for Android" -ForegroundColor Gray
Write-Host "2. Billing enabled on the same Google Cloud project as the API key" -ForegroundColor Gray
Write-Host "3. API restriction: allow Maps SDK for Android" -ForegroundColor Gray
Write-Host "4. Application restriction: Android app package '$applicationId' with the SHA-1 printed above" -ForegroundColor Gray
Write-Host "5. If you changed key/restrictions, rebuild/reinstall the Android app; OTA JS reload cannot change native manifest metadata" -ForegroundColor Gray
