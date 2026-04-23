package com.paulstewart.tvinfopanel.firetv

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.paulstewart.tvinfopanel.firetv.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {
  private lateinit var binding: ActivityMainBinding

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    binding = ActivityMainBinding.inflate(layoutInflater)
    setContentView(binding.root)

    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    WindowCompat.setDecorFitsSystemWindows(window, false)
    WindowInsetsControllerCompat(window, binding.root).let { controller ->
      controller.hide(WindowInsetsCompat.Type.systemBars())
      controller.systemBarsBehavior =
        WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }

    binding.retryButton.setOnClickListener { loadDashboard() }
    configureWebView()
    loadDashboard()
  }

  override fun onResume() {
    super.onResume()
    binding.webView.onResume()
    hideSystemBars()
  }

  override fun onPause() {
    binding.webView.onPause()
    super.onPause()
  }

  override fun onDestroy() {
    binding.webView.destroy()
    super.onDestroy()
  }

  override fun onBackPressed() {
    if (binding.webView.canGoBack()) {
      binding.webView.goBack()
      return
    }
    super.onBackPressed()
  }

  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    if (keyCode == KeyEvent.KEYCODE_MENU) {
      hideSystemBars()
    }
    return super.onKeyDown(keyCode, event)
  }

  @SuppressLint("SetJavaScriptEnabled")
  private fun configureWebView() {
    binding.webView.apply {
      isFocusable = true
      isFocusableInTouchMode = true
      keepScreenOn = true
      setBackgroundColor(0xFF050816.toInt())

      settings.apply {
        javaScriptEnabled = true
        domStorageEnabled = true
        loadsImagesAutomatically = true
        mediaPlaybackRequiresUserGesture = false
        loadWithOverviewMode = true
        useWideViewPort = true
        cacheMode = WebSettings.LOAD_DEFAULT
        builtInZoomControls = false
        displayZoomControls = false
      }

      webChromeClient = WebChromeClient()
      webViewClient = object : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
          val target = request.url.toString()
          if (target.startsWith("http://") || target.startsWith("https://")) {
            return false
          }
          return try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(target)))
            true
          } catch (_: Exception) {
            false
          }
        }

        override fun onPageCommitVisible(view: WebView, url: String?) {
          hideError()
          hideSystemBars()
        }

        override fun onReceivedError(
          view: WebView,
          request: WebResourceRequest,
          error: WebResourceError,
        ) {
          if (request.isForMainFrame) {
            showError(error.description?.toString() ?: "Unable to load dashboard.")
          }
        }
      }
    }
  }

  private fun loadDashboard() {
    val url = BuildConfig.DASHBOARD_URL
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      showError("Set dashboardUrl in dashboard.local.properties before building.")
      return
    }

    binding.webView.loadUrl(url)
  }

  private fun showError(message: String) {
    binding.errorMessage.text = message
    binding.errorView.visibility = View.VISIBLE
  }

  private fun hideError() {
    binding.errorView.visibility = View.GONE
  }

  private fun hideSystemBars() {
    WindowInsetsControllerCompat(window, binding.root).let { controller ->
      controller.hide(WindowInsetsCompat.Type.systemBars())
      controller.systemBarsBehavior =
        WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }
  }
}
