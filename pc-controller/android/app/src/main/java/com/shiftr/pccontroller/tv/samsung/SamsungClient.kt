package com.shiftr.pccontroller.tv.samsung

import android.util.Base64
import com.shiftr.pccontroller.tv.TvActions
import com.shiftr.pccontroller.tv.TvClient
import com.shiftr.pccontroller.tv.TvProtocol
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import org.json.JSONObject
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Samsung Tizen remote via WebSocket (SmartThings remote channel).
 * First connect: accept "Pc Controller" on the TV popup.
 */
class SamsungClient(
    override val host: String,
    override val deviceName: String = "Samsung TV",
    private val http: OkHttpClient =
        OkHttpClient.Builder()
            .connectTimeout(5, TimeUnit.SECONDS)
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .pingInterval(20, TimeUnit.SECONDS)
            .hostnameVerifier { _, _ -> true }
            .build(),
) : TvClient {
    override val protocol = TvProtocol.SAMSUNG
    private var socket: WebSocket? = null
    private val connected = AtomicBoolean(false)

    override suspend fun connect(): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                if (connected.get()) return@runCatching
                val name = Base64.encodeToString("Pc Controller".toByteArray(), Base64.NO_WRAP)
                val url =
                    "wss://$host:8002/api/v2/channels/samsung.remote.control?name=$name"
                val latch = CountDownLatch(1)
                var error: String? = null
                val req = Request.Builder().url(url).build()
                socket =
                    http.newWebSocket(
                        req,
                        object : WebSocketListener() {
                            override fun onOpen(webSocket: WebSocket, response: Response) {
                                connected.set(true)
                                latch.countDown()
                            }

                            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                                // Fallback to ws://8001
                                error = t.message
                                latch.countDown()
                            }

                            override fun onMessage(webSocket: WebSocket, text: String) {
                                // token / allowed events ignored for key sending
                            }

                            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                                connected.set(false)
                            }
                        },
                    )
                latch.await(6, TimeUnit.SECONDS)
                if (!connected.get()) {
                    socket?.cancel()
                    connectPlain(name)
                }
            }
        }

    private fun connectPlain(name: String) {
        val latch = CountDownLatch(1)
        val url = "ws://$host:8001/api/v2/channels/samsung.remote.control?name=$name"
        val req = Request.Builder().url(url).build()
        socket =
            http.newWebSocket(
                req,
                object : WebSocketListener() {
                    override fun onOpen(webSocket: WebSocket, response: Response) {
                        connected.set(true)
                        latch.countDown()
                    }

                    override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                        latch.countDown()
                    }

                    override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                        connected.set(false)
                    }

                    override fun onMessage(webSocket: WebSocket, bytes: ByteString) = Unit
                },
            )
        latch.await(6, TimeUnit.SECONDS)
        if (!connected.get()) error("Samsung TV did not allow the connection — accept the popup on the TV")
    }

    override suspend fun disconnect() {
        socket?.close(1000, "bye")
        socket = null
        connected.set(false)
    }

    override suspend fun sendAction(action: String, down: Boolean): Boolean {
        if (!down) return true
        TvActions.streamingAppId(action, protocol)?.let { return launchApp(it) }
        val key =
            when (action) {
                "up" -> "KEY_UP"
                "down" -> "KEY_DOWN"
                "left" -> "KEY_LEFT"
                "right" -> "KEY_RIGHT"
                "ok" -> "KEY_ENTER"
                "back" -> "KEY_RETURN"
                "home" -> "KEY_HOME"
                "menu" -> "KEY_MENU"
                "play" -> "KEY_PLAY"
                "next" -> "KEY_FF"
                "prev" -> "KEY_REWIND"
                "volUp" -> "KEY_VOLUP"
                "volDown" -> "KEY_VOLDOWN"
                "mute" -> "KEY_MUTE"
                "power" -> "KEY_POWER"
                "info" -> "KEY_INFO"
                "input" -> "KEY_SOURCE"
                "red" -> "KEY_RED"
                "green" -> "KEY_GREEN"
                "yellow" -> "KEY_YELLOW"
                "blue" -> "KEY_CYAN"
                else -> null
            } ?: return false
        return sendKey(key)
    }

    override suspend fun sendKeyCode(code: String, down: Boolean): Boolean {
        if (!down) return true
        val key =
            when {
                code.startsWith("Digit") -> "KEY_${code.removePrefix("Digit")}"
                code.startsWith("Key") && code.length == 4 -> null // letters via KEY_ not reliable
                code == "Enter" -> "KEY_ENTER"
                code == "Backspace" -> "KEY_BACK"
                code == "Space" -> "KEY_ENTER"
                code == "Escape" -> "KEY_RETURN"
                else -> null
            } ?: return sendLetter(code)
        return sendKey(key)
    }

    override suspend fun launchApp(appId: String): Boolean =
        withContext(Dispatchers.IO) {
            runCatching {
                // REST app launch (Tizen 2016+)
                val body =
                    JSONObject()
                        .put("id", appId)
                        .toString()
                        .toByteArray()
                val req =
                    Request.Builder()
                        .url("http://$host:8001/api/v2/applications/$appId")
                        .post(okhttp3.RequestBody.create(null, ByteArray(0)))
                        .build()
                http.newCall(req).execute().use { resp ->
                    if (resp.isSuccessful) return@runCatching true
                }
                // Fallback: remote app launch command over WS
                sendWsCommand(
                    JSONObject()
                        .put("method", "ms.channel.emit")
                        .put(
                            "params",
                            JSONObject()
                                .put("event", "ed.apps.launch")
                                .put("to", "host")
                                .put(
                                    "data",
                                    JSONObject()
                                        .put("appId", appId)
                                        .put("action_type", "DEEP_LINK"),
                                ),
                        ),
                )
            }.getOrDefault(false)
        }

    private fun sendLetter(code: String): Boolean {
        // Samsung doesn't expose full keyboard over remote channel reliably
        return false
    }

    private fun sendKey(key: String): Boolean {
        return sendWsCommand(
            JSONObject()
                .put("method", "ms.remote.control")
                .put(
                    "params",
                    JSONObject()
                        .put("Cmd", "Click")
                        .put("DataOfCmd", key)
                        .put("Option", "false")
                        .put("TypeOfRemote", "SendRemoteKey"),
                ),
        )
    }

    private fun sendWsCommand(payload: JSONObject): Boolean {
        val ws = socket ?: return false
        if (!connected.get()) return false
        return ws.send(payload.toString())
    }
}
