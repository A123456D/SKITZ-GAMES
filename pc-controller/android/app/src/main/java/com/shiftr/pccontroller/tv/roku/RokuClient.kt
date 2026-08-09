package com.shiftr.pccontroller.tv.roku

import com.shiftr.pccontroller.tv.TvActions
import com.shiftr.pccontroller.tv.TvClient
import com.shiftr.pccontroller.tv.TvProtocol
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class RokuClient(
    override val host: String,
    override val deviceName: String = "Roku",
    private val http: OkHttpClient =
        OkHttpClient.Builder()
            .connectTimeout(3, TimeUnit.SECONDS)
            .readTimeout(3, TimeUnit.SECONDS)
            .build(),
) : TvClient {
    override val protocol = TvProtocol.ROKU
    private val base get() = "http://$host:8060"

    override suspend fun connect(): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                val req = Request.Builder().url("$base/query/device-info").get().build()
                http.newCall(req).execute().use { resp ->
                    if (!resp.isSuccessful) error("Roku not reachable (${resp.code})")
                }
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
                val req =
                    Request.Builder()
                        .url("$base/launch/$appId")
                        .post(ByteArray(0).toRequestBody(null))
                        .build()
                http.newCall(req).execute().use { it.isSuccessful }
            }.getOrDefault(false)
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
