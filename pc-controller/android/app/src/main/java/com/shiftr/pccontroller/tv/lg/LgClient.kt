package com.shiftr.pccontroller.tv.lg

import android.content.Context
import com.shiftr.pccontroller.tv.TvActions
import com.shiftr.pccontroller.tv.TvClient
import com.shiftr.pccontroller.tv.TvHttp
import com.shiftr.pccontroller.tv.TvProtocol
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

class LgClient(
    private val context: Context,
    override val host: String,
    override val deviceName: String = "LG TV",
) : TvClient {
    override val protocol = TvProtocol.LG
    override var onSessionLost: (() -> Unit)? = null

    private val http = TvHttp.client()

    private var mainSocket: WebSocket? = null
    private var inputSocket: WebSocket? = null
    private val connected = AtomicBoolean(false)
    private val clientKey = AtomicReference(loadKey())
    private val nextId = AtomicInteger(1)
    private val appListRequestId = AtomicInteger(-1)
    private val appListLatch = AtomicReference(CountDownLatch(0))
    private val installedApps = ConcurrentHashMap<String, String>()

    override fun isLive(): Boolean = connected.get() && mainSocket != null

    private fun markSessionLost() {
        if (connected.getAndSet(false)) onSessionLost?.invoke()
    }

    private fun prefs() = context.getSharedPreferences("lg_tv_keys", Context.MODE_PRIVATE)

    private fun loadKey(): String? = prefs().getString(host, null)

    private fun saveKey(key: String) {
        prefs().edit().putString(host, key).apply()
        clientKey.set(key)
    }

    override suspend fun connect(): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                if (connected.get()) return@runCatching
                val urls = listOf("wss://$host:3001", "ws://$host:3000")
                var lastError: String? = null
                for (url in urls) {
                    lastError = null
                    val latch = CountDownLatch(1)
                    val err = AtomicReference<String?>(null)
                    mainSocket?.cancel()
                    mainSocket =
                        http.newWebSocket(
                            Request.Builder().url(url).build(),
                            object : WebSocketListener() {
                                override fun onOpen(webSocket: WebSocket, response: Response) {
                                    webSocket.send(registerPayload().toString())
                                }

                                override fun onMessage(webSocket: WebSocket, text: String) {
                                    val json = JSONObject(text)
                                    val type = json.optString("type")
                                    val payload = json.optJSONObject("payload")
                                    handleAppList(json, payload)
                                    payload?.optString("socketPath")?.takeIf { it.isNotBlank() }?.let {
                                        openInputSocketUrl(it)
                                    }
                                    when (type) {
                                        "registered" -> {
                                            payload?.optString("client-key")?.takeIf { it.isNotBlank() }?.let { saveKey(it) }
                                            connected.set(true)
                                            requestPointerSocket(webSocket)
                                            latch.countDown()
                                        }
                                        "error" -> {
                                            err.set(payload?.optString("errorText") ?: "Accept pairing on the LG TV")
                                            latch.countDown()
                                        }
                                    }
                                    payload?.optString("client-key")?.takeIf { it.isNotBlank() }?.let {
                                        saveKey(it)
                                        connected.set(true)
                                        requestPointerSocket(webSocket)
                                        latch.countDown()
                                    }
                                }

                                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                                    err.set(t.message)
                                    markSessionLost()
                                    latch.countDown()
                                }

                                override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                                    markSessionLost()
                                }
                            },
                        )
                    latch.await(45, TimeUnit.SECONDS)
                    if (connected.get()) return@runCatching
                    lastError = err.get()
                    mainSocket?.cancel()
                    mainSocket = null
                }
                error(lastError ?: "LG pairing timed out — accept Pc Controller on the TV (up to 45s)")
            }
        }

    private fun registerPayload(): JSONObject {
        val permissions =
            JSONArray()
                .put("LAUNCH")
                .put("LAUNCH_WEBAPP")
                .put("CONTROL_INPUT_TEXT")
                .put("CONTROL_MOUSE_AND_KEYBOARD")
                .put("CONTROL_POWER")
                .put("CONTROL_AUDIO")
                .put("CONTROL_TV_INPUT")
                .put("READ_INSTALLED_APPS")
        return JSONObject()
            .put("type", "register")
            .put("id", "reg")
            .put(
                "payload",
                JSONObject()
                    .put("forcePairing", false)
                    .put("pairingType", "PROMPT")
                    .put("client-key", clientKey.get() ?: "")
                    .put(
                        "manifest",
                        JSONObject()
                            .put("manifestVersion", 1)
                            .put("appVersion", "1.0")
                            .put(
                                "signed",
                                JSONObject()
                                    .put("created", "20240101")
                                    .put("appId", "com.shiftr.pccontroller")
                                    .put("vendorId", "SHIFTR")
                                    .put("localizedAppNames", JSONObject().put("", "Pc Controller"))
                                    .put("localizedVendorNames", JSONObject().put("", "SHIFTR"))
                                    .put("permissions", permissions)
                                    .put("serial", "1"),
                            )
                            .put("permissions", permissions)
                            .put("signatures", JSONArray()),
                    ),
            )
    }

    private fun requestPointerSocket(main: WebSocket) {
        val id = nextId.getAndIncrement()
        main.send(
            JSONObject()
                .put("id", id)
                .put("type", "request")
                .put("uri", "ssap://com.webos.service.networkinput/getPointerInputSocket")
                .put("payload", JSONObject())
                .toString(),
        )
        openInputSocketUrl("ws://$host:3000/input")
    }

    private fun openInputSocketUrl(url: String) {
        inputSocket?.cancel()
        inputSocket =
            http.newWebSocket(
                Request.Builder().url(url).build(),
                object : WebSocketListener() {
                    override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                        markSessionLost()
                    }
                },
            )
    }

    override suspend fun disconnect() {
        connected.set(false)
        inputSocket?.close(1000, null)
        mainSocket?.close(1000, null)
        inputSocket = null
        mainSocket = null
    }

    override suspend fun sendAction(action: String, down: Boolean): Boolean {
        if (!down) return true
        TvActions.streamingAppId(action, protocol)?.let { return launchApp(it) }
        when (action) {
            "volUp" -> return ssap("ssap://audio/volumeUp")
            "volDown" -> return ssap("ssap://audio/volumeDown")
            "mute" -> return ssap("ssap://audio/setMute", JSONObject().put("mute", true))
            "power" -> return ssap("ssap://system/turnOff")
            "home" -> return ssap("ssap://system.launcher/home")
            "netflix", "prime", "disney", "appletv" -> return false
        }
        val button =
            when (action) {
                "up" -> "UP"
                "down" -> "DOWN"
                "left" -> "LEFT"
                "right" -> "RIGHT"
                "ok" -> "ENTER"
                "back" -> "BACK"
                "menu" -> "MENU"
                "play" -> "PLAY"
                "next" -> "FASTFORWARD"
                "prev" -> "REWIND"
                "info" -> "INFO"
                "input" -> "INPUT_HUB"
                "red" -> "RED"
                "green" -> "GREEN"
                "yellow" -> "YELLOW"
                "blue" -> "BLUE"
                else -> null
            } ?: return false
        return sendButton(button)
    }

    override suspend fun sendKeyCode(code: String, down: Boolean): Boolean {
        if (!down) return true
        if (code.startsWith("Key") && code.length == 4) {
            return ssap(
                "ssap://com.webos.service.ime/insertText",
                JSONObject().put("text", code.last().lowercaseChar().toString()).put("replace", 0),
            )
        }
        if (code.startsWith("Digit")) {
            return ssap(
                "ssap://com.webos.service.ime/insertText",
                JSONObject().put("text", code.removePrefix("Digit")).put("replace", 0),
            )
        }
        return when (code) {
            "Enter" -> ssap("ssap://com.webos.service.ime/sendEnterKey")
            "Backspace" -> sendButton("BACK")
            "Space" ->
                ssap(
                    "ssap://com.webos.service.ime/insertText",
                    JSONObject().put("text", " ").put("replace", 0),
                )
            "Escape" -> sendButton("BACK")
            else -> false
        }
    }

    override suspend fun launchApp(appId: String): Boolean =
        ssap(
            "ssap://system.launcher/launch",
            JSONObject().put("id", resolveAppId(appId)),
        )

    private fun handleAppList(json: JSONObject, payload: JSONObject?) {
        if (json.optInt("id", -1) != appListRequestId.get()) return
        val apps = payload?.optJSONArray("apps") ?: return
        installedApps.clear()
        for (i in 0 until apps.length()) {
            val app = apps.optJSONObject(i) ?: continue
            val id = app.optString("id")
            val title = app.optString("title").lowercase()
            if (id.isNotBlank() && title.isNotBlank()) installedApps[title] = id
        }
        appListLatch.get().countDown()
    }

    private fun resolveAppId(fallbackId: String): String {
        val wanted =
            when (fallbackId) {
                "netflix" -> listOf("netflix")
                "amazon" -> listOf("prime video", "amazon prime", "amazon")
                "com.disney.disneyplus-prod" -> listOf("disney+", "disney plus", "disney")
                "com.apple.appletv" -> listOf("apple tv")
                else -> emptyList()
            }
        if (wanted.isEmpty()) return fallbackId
        val ws = mainSocket ?: return fallbackId
        val id = nextId.getAndIncrement()
        val latch = CountDownLatch(1)
        appListRequestId.set(id)
        appListLatch.set(latch)
        ws.send(
            JSONObject()
                .put("id", id)
                .put("type", "request")
                .put("uri", "ssap://com.webos.applicationManager/listApps")
                .put("payload", JSONObject())
                .toString(),
        )
        latch.await(2, TimeUnit.SECONDS)
        for (name in wanted) {
            installedApps.entries.firstOrNull { (title, _) -> name in title }?.let { return it.value }
        }
        return fallbackId
    }

    private fun sendButton(name: String): Boolean {
        val msg = "type:button\nname:$name\n\n"
        val sent = inputSocket?.send(msg) == true
        if (!sent) markSessionLost()
        return sent
    }

    private fun ssap(uri: String, payload: JSONObject = JSONObject()): Boolean {
        val ws = mainSocket ?: return false
        if (!connected.get()) return false
        val id = nextId.getAndIncrement()
        val sent = ws.send(
            JSONObject()
                .put("id", id)
                .put("type", "request")
                .put("uri", uri)
                .put("payload", payload)
                .toString(),
        )
        if (!sent) markSessionLost()
        return sent
    }
}
