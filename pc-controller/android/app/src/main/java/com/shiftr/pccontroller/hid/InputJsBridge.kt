package com.shiftr.pccontroller.hid

import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.shiftr.pccontroller.tv.TvRemoteHub
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Direct JS → Java input. Capacitor's plugin bridge queues every key; this path
 * does not wait for a plugin round-trip or a JS promise.
 */
object InputJsBridge {
    @Volatile
    var hid: HidController? = null

    @Volatile
    var tvHub: TvRemoteHub? = null

    private var host: Host? = null
    private var attachedWebView: WebView? = null

    private val tvScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    @JvmStatic
    fun attach(webView: WebView?) {
        webView ?: return
        if (host == null) host = Host()
        if (attachedWebView === webView) return
        attachedWebView = webView
        webView.addJavascriptInterface(host as Host, "HidInput")
    }

    private class Host {
        @JavascriptInterface
        fun key(code: String, down: Boolean) {
            hid?.keyEvent(code, down)
        }

        @JavascriptInterface
        fun tvKey(code: String, down: Boolean) {
            val hub = tvHub ?: return
            tvScope.launch { hub.sendKey(code, down) }
        }

        @JavascriptInterface
        fun consumer(action: String, down: Boolean) {
            hid?.consumer(action, down)
        }

        @JavascriptInterface
        fun tvConsumer(action: String, down: Boolean) {
            val hub = tvHub ?: return
            tvScope.launch { hub.sendAction(action, down) }
        }
    }
}
