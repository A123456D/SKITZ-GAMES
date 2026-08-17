package com.shiftr.pccontroller.tv.samsung

import android.content.Context
import android.util.Base64
import android.util.Log
import com.shiftr.pccontroller.tv.TvActions
import com.shiftr.pccontroller.tv.TvClient
import com.shiftr.pccontroller.tv.TvHttp
import com.shiftr.pccontroller.tv.TvProtocol
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import org.json.JSONObject
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.util.concurrent.CountDownLatch
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

/**
 * Samsung Tizen remote (2016+ including 2018 Q6F).
 *
 * Pairing popup only appears on **wss://:8002** with the TV's self-signed cert
 * accepted. Socket-open is not enough — wait for `ms.channel.connect`.
 */
class SamsungClient(
    private val context: Context,
    override val host: String,
    override val deviceName: String = "Samsung TV",
) : TvClient {
    override val protocol = TvProtocol.SAMSUNG

    private val tag = "SamsungClient"
    private val http = TvHttp.client()
    private val infoHttp = TvHttp.client(connectSec = 2, readMs = 2000, pingSec = 0)
    private var socket: WebSocket? = null
    private val connected = AtomicBoolean(false)
    private val installedApps = ConcurrentHashMap<String, String>()
    private val appListLatch = AtomicReference(CountDownLatch(0))

    override suspend fun connect(): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                if (connected.get()) return@runCatching
                val name = Base64.encodeToString("Pc Controller".toByteArray(), Base64.NO_WRAP)
                val token = loadToken()
                var secure =
                    openChannel(
                        url = channelUrl("wss", 8002, name, token),
                        waitSeconds = PAIR_SECONDS,
                    )
                // A previously paired TV may be asleep. Wake it, then retry
                // the authorized channel without requiring a physical remote.
                if (secure == ChannelResult.Unreachable && wakeOnLan()) {
                    delay(WAKE_WAIT_MS)
                    secure =
                        openChannel(
                            url = channelUrl("wss", 8002, name, token),
                            waitSeconds = PAIR_SECONDS,
                        )
                }
                if (secure == ChannelResult.Connected) {
                    rememberMac()
                    requestInstalledApps()
                    return@runCatching
                }
                if (secure == ChannelResult.Denied) {
                    error(DENIED)
                }
                if (secure == ChannelResult.TimedOut) {
                    error(TIMEOUT)
                }
                // 8002 unreachable (older sets) — 8001 will not show a popup on Q6F.
                val plain =
                    openChannel(
                        url = channelUrl("ws", 8001, name, token),
                        waitSeconds = PAIR_SECONDS,
                    )
                when (plain) {
                    ChannelResult.Connected -> {
                        rememberMac()
                        requestInstalledApps()
                    }
                    ChannelResult.Denied -> error(DENIED)
                    ChannelResult.TimedOut -> error(TIMEOUT)
                    ChannelResult.Unreachable -> error(UNREACHABLE)
                }
            }
        }

    private fun channelUrl(scheme: String, port: Int, name: String, token: String?): String {
        val base = "$scheme://$host:$port/api/v2/channels/samsung.remote.control?name=$name"
        return if (token.isNullOrBlank()) base else "$base&token=$token"
    }

    private enum class ChannelResult {
        Connected,
        Denied,
        TimedOut,
        Unreachable,
    }

    private fun openChannel(url: String, waitSeconds: Long): ChannelResult {
        socket?.cancel()
        val latch = CountDownLatch(1)
        val outcome = AtomicReference(ChannelResult.Unreachable)
        val req = Request.Builder().url(url).build()
        Log.i(tag, "open $url")
        val ws =
            http.newWebSocket(
                req,
                object : WebSocketListener() {
                    override fun onOpen(webSocket: WebSocket, response: Response) {
                        Log.i(tag, "socket open — waiting for TV Allow")
                    }

                    override fun onMessage(webSocket: WebSocket, text: String) {
                        Log.i(tag, "msg $text")
                        handleChannelMessage(text, outcome, latch)
                    }

                    override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
                        handleChannelMessage(bytes.utf8(), outcome, latch)
                    }

                    override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                        Log.w(tag, "fail ${t.message}")
                        connected.set(false)
                        if (latch.count > 0) latch.countDown()
                    }

                    override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                        connected.set(false)
                        if (latch.count > 0) latch.countDown()
                    }
                },
            )
        socket = ws
        val arrived = latch.await(waitSeconds, TimeUnit.SECONDS)
        if (!arrived) {
            ws.cancel()
            return ChannelResult.TimedOut
        }
        val result = outcome.get()
        if (result != ChannelResult.Connected) {
            ws.cancel()
            socket = null
        }
        return result
    }

    private fun handleChannelMessage(
        text: String,
        outcome: AtomicReference<ChannelResult>,
        latch: CountDownLatch,
    ) {
        val event =
            try {
                JSONObject(text).optString("event")
            } catch (_: Exception) {
                ""
            }
        when (event) {
            "ms.channel.connect" -> {
                try {
                    val token =
                        JSONObject(text)
                            .optJSONObject("data")
                            ?.optString("token")
                            .orEmpty()
                    if (token.isNotBlank()) saveToken(token)
                } catch (_: Exception) {
                }
                connected.set(true)
                outcome.set(ChannelResult.Connected)
                latch.countDown()
            }
            "ms.channel.unauthorized", "ms.channel.clientConnectDenied" -> {
                connected.set(false)
                outcome.set(ChannelResult.Denied)
                latch.countDown()
            }
            "ms.channel.timeOut" -> {
                connected.set(false)
                outcome.set(ChannelResult.TimedOut)
                latch.countDown()
            }
            "ed.installedApp.get" -> {
                val apps =
                    try {
                        JSONObject(text)
                            .optJSONObject("data")
                            ?.optJSONArray("data")
                    } catch (_: Exception) {
                        null
                    }
                if (apps != null) {
                    installedApps.clear()
                    for (i in 0 until apps.length()) {
                        val app = apps.optJSONObject(i) ?: continue
                        val id = app.optString("appId")
                        val name = app.optString("name").lowercase()
                        if (id.isNotBlank() && name.isNotBlank()) installedApps[name] = id
                    }
                }
                appListLatch.get().countDown()
            }
        }
    }

    private fun requestInstalledApps() {
        val latch = CountDownLatch(1)
        appListLatch.set(latch)
        sendWsCommand(
            JSONObject()
                .put("method", "ms.channel.emit")
                .put(
                    "params",
                    JSONObject()
                        .put("event", "ed.installedApp.get")
                        .put("to", "host"),
                ),
        )
        // Supported Q6F-era sets answer immediately; newer sets may omit it.
        latch.await(2, TimeUnit.SECONDS)
    }

    private fun installedAppId(fallbackId: String): String {
        val names =
            when (fallbackId) {
                "11101200001" -> listOf("netflix")
                "3201512006785" -> listOf("prime video", "amazon prime", "amazon")
                "3201901017640" -> listOf("disney+", "disney plus", "disney")
                "3201807016597" -> listOf("apple tv")
                else -> emptyList()
            }
        for (wanted in names) {
            installedApps.entries.firstOrNull { (name, _) -> wanted in name }?.let { return it.value }
        }
        return fallbackId
    }

    override suspend fun disconnect() {
        socket?.close(1000, "bye")
        socket = null
        connected.set(false)
    }

    override suspend fun sendAction(action: String, down: Boolean): Boolean {
        if (!down) return true
        if (action == "power") {
            return if (connected.get()) sendKey("KEY_POWER") else wakeOnLan()
        }
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
                code == "Enter" -> "KEY_ENTER"
                code == "Backspace" -> "KEY_BACK"
                code == "Space" -> "KEY_ENTER"
                code == "Escape" -> "KEY_RETURN"
                else -> null
            } ?: return false
        return sendKey(key)
    }

    override suspend fun launchApp(appId: String): Boolean =
        withContext(Dispatchers.IO) {
            runCatching {
                val resolvedId = installedAppId(appId)
                // Standard control-channel launch is Samsung's preferred path.
                // Q6F firmware may accept ed.apps.launch without opening the
                // app, so try all three known local mechanisms in order.
                val standardSent =
                    sendWsCommand(
                        JSONObject()
                            .put("method", "ms.application.start")
                            .put("id", System.currentTimeMillis().toString())
                            .put("params", JSONObject().put("id", resolvedId)),
                    )
                delay(350)

                val remoteSent =
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
                                            .put("appId", resolvedId)
                                            .put("action_type", "DEEP_LINK"),
                                    ),
                            ),
                    )
                delay(350)

                val req =
                    Request.Builder()
                        .url("http://$host:8001/api/v2/applications/$resolvedId")
                        .post(okhttp3.RequestBody.create(null, ByteArray(0)))
                        .build()
                val restSent = http.newCall(req).execute().use { it.isSuccessful }
                standardSent || remoteSent || restSent
            }.getOrDefault(false)
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

    private fun rememberMac() {
        val urls =
            listOf(
                "http://$host:8001/api/v2/",
                "https://$host:8002/api/v2/",
            )
        for (url in urls) {
            val mac =
                runCatching {
                    val req = Request.Builder().url(url).get().build()
                    infoHttp.newCall(req).execute().use { resp ->
                        if (!resp.isSuccessful) return@use null
                        JSONObject(resp.body?.string().orEmpty())
                            .optJSONObject("device")
                            ?.optString("wifiMac")
                            ?.takeIf { it.isNotBlank() }
                    }
                }.getOrNull()
            if (mac != null && parseMac(mac) != null) {
                prefs().edit().putString("mac:$host", mac).apply()
                return
            }
        }
    }

    private fun wakeOnLan(): Boolean {
        val mac = prefs().getString("mac:$host", null) ?: return false
        val address = parseMac(mac) ?: return false
        val packet = ByteArray(6 + 16 * address.size)
        for (i in 0 until 6) packet[i] = 0xff.toByte()
        for (i in 0 until 16) {
            System.arraycopy(address, 0, packet, 6 + i * address.size, address.size)
        }
        val targets =
            buildSet {
                add("255.255.255.255")
                val parts = host.split(".")
                if (parts.size == 4) add("${parts[0]}.${parts[1]}.${parts[2]}.255")
            }
        return runCatching {
            DatagramSocket().use { socket ->
                socket.broadcast = true
                for (target in targets) {
                    val inet = InetAddress.getByName(target)
                    for (port in listOf(9, 7)) {
                        socket.send(DatagramPacket(packet, packet.size, inet, port))
                    }
                }
            }
            true
        }.getOrDefault(false)
    }

    private fun parseMac(value: String): ByteArray? {
        val parts = value.trim().split(":", "-")
        if (parts.size != 6) return null
        return try {
            ByteArray(6) { parts[it].toInt(16).toByte() }
        } catch (_: Exception) {
            null
        }
    }

    private fun prefs() = context.getSharedPreferences("samsung_tv_tokens", Context.MODE_PRIVATE)

    private fun loadToken(): String? = prefs().getString(host, null)

    private fun saveToken(token: String) {
        prefs().edit().putString(host, token).apply()
    }

    companion object {
        private const val PAIR_SECONDS = 30L
        private const val WAKE_WAIT_MS = 6_000L
        private const val DENIED =
            "TV blocked Pc Controller — Settings → General → External Device Manager → Device Connection Manager → Device List, delete it, then Connect again and tap Allow"
        private const val TIMEOUT =
            "No Allow popup on the TV. On a 2018 Q6F: leave the Home screen (not an app), Settings → General → External Device Manager → Device Connection Manager → Access Notification = First time only. Then Connect again and watch the TV for 30s."
        private const val UNREACHABLE =
            "Could not reach the Samsung remote port. Confirm the TV IP under Network settings (not a soundbar), same Wi‑Fi as the phone."
    }
}
