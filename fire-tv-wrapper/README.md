# Fire TV Wrapper

This is a minimal Android / Fire TV wrapper app for the dashboard.

It opens the hosted dashboard URL inside a full-screen `WebView`, so the TV can run the board like an app instead of through the Silk browser chrome.

## What It Does

- launches from the Fire TV apps row
- loads the dashboard's `/display` route
- allows local-LAN `http://` URLs
- keeps the screen awake while the app is open
- uses a Leanback launcher entry for Fire TV

## Configure the Dashboard URL

1. Copy the example file:

   ```bash
   cp dashboard.local.properties.example dashboard.local.properties
   ```

2. Edit `dashboard.local.properties`:

   ```properties
   dashboardUrl=http://192.168.86.250:3030/display
   appName=Paul's Office Panel
   ```

## Build

Open `fire-tv-wrapper/` in Android Studio and let it sync the Gradle project.

Then build the debug APK from Android Studio or with Gradle once your Android SDK is installed.

## Install on Fire TV

With ADB connected to the Fire TV:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.paulstewart.tvinfopanel.firetv/.MainActivity
```

## Important Note About Auto-Launch

This wrapper gives you an app-style experience, but a normal sideloaded Android app is not the same as a guaranteed kiosk launcher.

Modern Android / Fire OS background launch rules can block apps from force-opening themselves at boot, so treat this wrapper as the clean app path, not a guaranteed "always become the home screen on reboot" path.
