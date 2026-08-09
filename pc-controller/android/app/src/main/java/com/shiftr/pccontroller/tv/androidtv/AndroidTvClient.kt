package com.shiftr.pccontroller.tv.androidtv

import com.shiftr.pccontroller.tv.TvActions
import com.shiftr.pccontroller.tv.TvClient
import com.shiftr.pccontroller.tv.TvProtocol
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.DataInputStream
import java.io.DataOutputStream
import java.net.InetSocketAddress
import java.net.Socket
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocket
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager
import java.security.cert.X509Certificate

/**
 * Best-effort Android / Google / Fire TV Wi‑Fi remote.
 *
 * Full cert pairing (port 6467) varies by OEM; when Wi‑Fi session isn't available,
 * the app still controls these TVs over Bluetooth HID (same UI).
 *
 * This client sends raw key frames on an already-trusted SSL session when possible.
 */
class AndroidTvClient(
    override val host: String,
    override val deviceName: String = "Android TV",
    override val protocol: TvProtocol = TvProtocol.ANDROID_TV,
) : TvClient {
    private var socket: SSLSocket? = null
    private var out: DataOutputStream? = null
    private var input: DataInputStream? = null

    override suspend fun connect(): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                // Attempt SSL to command port with trust-all (paired devices may still reject)
                val tm =
                    arrayOf<TrustManager>(
                        object : X509TrustManager {
                            override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) = Unit

                            override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) = Unit

                            override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
                        },
                    )
                val ctx = SSLContext.getInstance("TLS")
                ctx.init(null, tm, null)
                val s = ctx.socketFactory.createSocket() as SSLSocket
                s.connect(InetSocketAddress(host, 6466), 4000)
                s.startHandshake()
                socket = s
                out = DataOutputStream(s.getOutputStream())
                input = DataInputStream(s.getInputStream())
                // Send configure / start-ish preamble used by many clients
                writeRaw(byteArrayOf(0x0a, 0x00)) // soft ping; ignored if rejected
            }.recoverCatching {
                // Soft-fail: mark "connected" for UI routing to Bluetooth fallback messaging
                error(
                    "Wi‑Fi remote needs one-time pairing on this TV. " +
                        "Use Bluetooth (Start HID) for Google/Android/Fire TV, " +
                        "or Roku/Samsung/LG/Bravia Wi‑Fi from the TV scan list.",
                )
            }
        }

    override suspend fun disconnect() {
        runCatching { socket?.close() }
        socket = null
        out = null
        input = null
    }

    override suspend fun sendAction(action: String, down: Boolean): Boolean {
        TvActions.streamingAppId(action, protocol)?.let {
            if (down) return launchApp(it)
        }
        val code =
            when (action) {
                "up" -> 19
                "down" -> 20
                "left" -> 21
                "right" -> 22
                "ok" -> 23
                "back" -> 4
                "home" -> 3
                "menu" -> 82
                "play" -> 85
                "next" -> 87
                "prev" -> 88
                "volUp" -> 24
                "volDown" -> 25
                "mute" -> 164
                "power" -> 26
                "info" -> 165
                "input" -> 178
                else -> null
            } ?: return false
        return injectKey(code, down)
    }

    override suspend fun sendKeyCode(code: String, down: Boolean): Boolean {
        val key =
            when {
                code.startsWith("Digit") -> 7 + code.removePrefix("Digit").toInt()
                code.startsWith("Key") && code.length == 4 -> 29 + (code[3] - 'A')
                code == "Enter" -> 66
                code == "Backspace" -> 67
                code == "Space" -> 62
                code == "Escape" -> 4
                else -> null
            } ?: return false
        return injectKey(key, down)
    }

    override suspend fun launchApp(appId: String): Boolean {
        // App-link launch requires full protobuf session; report false so UI can hint Bluetooth/apps
        return false
    }

    private fun injectKey(keyCode: Int, down: Boolean): Boolean {
        val stream = out ?: return false
        // Minimal RemoteKeyInject-like frame (length-prefixed) — works on some builds after pairing
        val press = if (down) 1 else 2
        val payload = byteArrayOf(0x52, 0x04, 0x08, keyCode.toByte(), 0x10, press.toByte())
        return try {
            writeRaw(payload)
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun writeRaw(payload: ByteArray) {
        val stream = out ?: return
        // varint length
        var len = payload.size
        while (len > 0x7f) {
            stream.write(len and 0x7f or 0x80)
            len = len ushr 7
        }
        stream.write(len)
        stream.write(payload)
        stream.flush()
    }
}
