import java.util.Properties

plugins {
  id("com.android.application")
  kotlin("android")
}

val dashboardProps = Properties().apply {
  val propsFile = rootProject.file("dashboard.local.properties")
  if (propsFile.exists()) {
    propsFile.inputStream().use(::load)
  }
}

fun propertyOrDefault(name: String, fallback: String): String {
  return dashboardProps.getProperty(name)?.trim()?.takeIf { it.isNotEmpty() } ?: fallback
}

fun escapeBuildConfig(value: String): String {
  return value
    .replace("\\", "\\\\")
    .replace("\"", "\\\"")
}

fun escapeAndroidString(value: String): String {
  return value
    .replace("\\", "\\\\")
    .replace("\"", "\\\"")
    .replace("'", "\\'")
}

val dashboardUrl = propertyOrDefault("dashboardUrl", "http://replace-me.local/display")
val appName = propertyOrDefault("appName", "Office TV Panel")

android {
  namespace = "com.paulstewart.tvinfopanel.firetv"
  compileSdk = 35

  defaultConfig {
    applicationId = "com.paulstewart.tvinfopanel.firetv"
    minSdk = 23
    targetSdk = 35
    versionCode = 1
    versionName = "0.1.0"

    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    buildConfigField("String", "DASHBOARD_URL", "\"${escapeBuildConfig(dashboardUrl)}\"")
    resValue("string", "app_name", "\"${escapeAndroidString(appName)}\"")
  }

  buildFeatures {
    buildConfig = true
    viewBinding = true
  }

  buildTypes {
    release {
      isMinifyEnabled = false
      proguardFiles(
        getDefaultProguardFile("proguard-android-optimize.txt"),
        "proguard-rules.pro",
      )
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  kotlinOptions {
    jvmTarget = "17"
  }
}

dependencies {
  implementation("androidx.core:core-ktx:1.15.0")
  implementation("androidx.appcompat:appcompat:1.7.0")
  implementation("androidx.webkit:webkit:1.12.1")
}
