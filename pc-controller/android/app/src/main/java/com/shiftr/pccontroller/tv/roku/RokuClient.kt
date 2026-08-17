package com.shiftr.pccontroller.tv.roku

import com.shiftr.pccontroller.tv.TvActions
import com.shiftr.pccontroller.tv.TvClient
import com.shiftr.pccontroller.tv.TvHttp
import com.shiftr.pccontroller.tv.TvProtocol
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

class RokuClient(
    override val host: String,
    override val deviceName: String = "Roku",
    private val http: okhttp3.OkHttpClient = TvHttp.client(connectSec = 5, readMs = 4000, pingSec = 0),
) : TvClient {
    override val protocol = TvProtocol.ROKU
    private val base get() = "http://$host:8060"

    override suspend fun connect(): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                val req = Request.Builder().url("$base/query/device-info").get().build()
                http.newCall(req).execute().use { resp ->
                    if (!resp.isSuccessful) {
                        error("Roku refused control (${resp.code}). Enable Settings → System → Advanced system settings → Control by mobile apps.")
                    }
                }
            }.recoverCatching { e ->
                if (e.message?.contains("Roku refused") == true) throw e
                error("Roku not reachable at $host — same Wi‑Fi, Control by mobile apps on, TV not asleep.")
            }
        }

    override suspend fun disconnect() = Unit

    override suspend fun sendAction(action: String, down: Boolean): Boolean {
        if (!down) return true
        TvActions.streamingAppId(action, protocol)?.let { return launchApp(it) }
        val key =
            when (action) {
                "up" -> "Up"
                "down" -> "Down"
                "left" -> "Left"
                "right" -> "Right"
                "ok" -> "Select"
                "back" -> "Back"
                "home" -> "Home"
                "menu" -> "Info"
                "play" -> "Play"
                "next" -> "Fwd"
                "prev" -> "Rev"
                "volUp" -> "VolumeUp"
                "volDown" -> "VolumeDown"
                "mute" -> "VolumeMute"
                "power" -> "Power"
                "info" -> "Info"
                "input" -> "InputTuner"
                "red" -> "Lit_red"
                "green" -> "Lit_green"
                "yellow" -> "Lit_yellow"
                "blue" -> "Lit_blue"
                else -> null
            } ?: return false
        return postKey(key)
    }

    override suspend fun sendKeyCode(code: String, down: Boolean): Boolean {
        if (!down) return true
        val lit =
            when {
                code.startsWith("Key") && code.length == 4 -> "Lit_${code.last().lowercaseChar()}"
                code.startsWith("Digit") -> "Lit_${code.removePrefix("Digit")}"
                code == "Enter" -> "Enter"
                code == "Backspace" -> "Backspace"
                code == "Space" -> "Lit_%20"
                code == "Escape" -> "Back"
                else -> null
            } ?: return false
        return postKey(lit)
    }

    override suspend fun launchApp(appId: String): Boolean =
        withContext(Dispatchers.IO) {
            runCatching {
                val resolvedId = resolveAppId(appId)
                val req =
                    Request.Builder()
                        .url("$base/launch/$resolvedId")
                        .post(ByteArray(0).toRequestBody(null))
                        .build()
                http.newCall(req).execute().use { it.isSuccessful }
            }.getOrDefault(false)
        }

    private fun resolveAppId(fallbackId: String): String {
        val wanted =
            when (fallbackId) {
                "12" -> listOf("netflix")
                "13" -> listOf("prime video", "amazon prime", "amazon")
                "291097" -> listOf("disney+", "disney plus", "disney")
                "551012" -> listOf("apple tv")
                else -> emptyList()
            }
        if (wanted.isEmpty()) return fallbackId
        return runCatching {
            val req = Request.Builder().url("$base/query/apps").get().build()
            http.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) return@use fallbackId
                val body = resp.body?.string().orEmpty()
                val apps =
                    Regex("""<app\b[^>]*\bid="([^"]+)"[^>]*>(.*?)</app>""", RegexOption.IGNORE_CASE)
                        .findAll(body)
                        .map { it.groupValues[2].lowercase() to it.groupValues[1] }
                        .toList()
                for (name in wanted) {
                    apps.firstOrNull { (title, _) -> name in title }?.let { return@use it.second }
                }
                fallbackId
            }
        }.getOrDefault(fallbackId)
    }

    private suspend fun postKey(key: String): Boolean =
        withContext(Dispatchers.IO) {
            runCatching {
                val req =
                    Request.Builder()
                        .url("$base/keypress/$key")
                        .post(ByteArray(0).toRequestBody(null))
                        .build()
                http.newCall(req).execute().use { it.isSuccessful }
            }.getOrDefault(false)
        }
}
