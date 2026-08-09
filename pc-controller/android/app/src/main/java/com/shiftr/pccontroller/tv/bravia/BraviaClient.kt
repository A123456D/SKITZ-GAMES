package com.shiftr.pccontroller.tv.bravia

import com.shiftr.pccontroller.tv.TvActions
import com.shiftr.pccontroller.tv.TvClient
import com.shiftr.pccontroller.tv.TvProtocol
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/**
 * Sony Bravia IRCC over HTTP.
 * Enable Remote Start / IP control and set a Pre-Shared Key in TV network settings.
 */
class BraviaClient(
    override val host: String,
    override val deviceName: String = "Bravia",
    private val psk: String = "0000",
) : TvClient {
    override val protocol = TvProtocol.BRAVIA

    private val http =
        OkHttpClient.Builder()
            .connectTimeout(4, TimeUnit.SECONDS)
            .readTimeout(4, TimeUnit.SECONDS)
            .build()

    override suspend fun connect(): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                val req =
                    Request.Builder()
                        .url("http://$host/sony/system")
                        .addHeader("Content-Type", "application/json")
                        .post(
                            """{"method":"getRemoteDeviceSettings","params":[],"id":1,"version":"1.0"}"""
                                .toRequestBody("application/json".toMediaType()),
                        )
                        .build()
                http.newCall(req).execute().use { /* reachable enough */ }
            }
        }

    override suspend fun disconnect() = Unit

    override suspend fun sendAction(action: String, down: Boolean): Boolean {
        if (!down) return true
        TvActions.streamingAppId(action, protocol)?.let { return launchApp(it) }
        val code =
            when (action) {
                "up" -> "AAAAAQAAAAEAAAB0Aw=="
                "down" -> "AAAAAQAAAAEAAAB1Aw=="
                "left" -> "AAAAAQAAAAEAAAA0Aw=="
                "right" -> "AAAAAQAAAAEAAAAzAw=="
                "ok" -> "AAAAAQAAAAEAAABlAw=="
                "back" -> "AAAAAgAAAJcAAAAjAw=="
                "home" -> "AAAAAQAAAAEAAABgAw=="
                "menu" -> "AAAAAQAAAAEAAAAlAw==" // options/display
                "play" -> "AAAAAgAAAJcAAAAaAw=="
                "next" -> "AAAAAgAAAJcAAAA9Aw=="
                "prev" -> "AAAAAgAAAJcAAAA8Aw=="
                "volUp" -> "AAAAAQAAAAEAAAASAw=="
                "volDown" -> "AAAAAQAAAAEAAAATAw=="
                "mute" -> "AAAAAQAAAAEAAAAUAw=="
                "power" -> "AAAAAQAAAAEAAAAVAw=="
                "info" -> "AAAAAQAAAAEAAAA6Aw=="
                "input" -> "AAAAAQAAAAEAAAAlAw=="
                "red" -> "AAAAAgAAAJcAAAAbAw=="
                "green" -> "AAAAAgAAAJcAAAAcAw=="
                "yellow" -> "AAAAAgAAAJcAAAAdAw=="
                "blue" -> "AAAAAgAAAJcAAAAeAw=="
                else -> null
            } ?: return false
        return ircc(code)
    }

    override suspend fun sendKeyCode(code: String, down: Boolean): Boolean {
        if (!down) return true
        // Digits
        val digitCodes =
            mapOf(
                "Digit0" to "AAAAAQAAAAEAAAAAAw==",
                "Digit1" to "AAAAAQAAAAEAAAAAAw==",
                "Digit2" to "AAAAAQAAAAEAAAABAw==",
                "Digit3" to "AAAAAQAAAAEAAAACAw==",
                "Digit4" to "AAAAAQAAAAEAAAADAw==",
                "Digit5" to "AAAAAQAAAAEAAAAEAw==",
                "Digit6" to "AAAAAQAAAAEAAAAFAw==",
                "Digit7" to "AAAAAQAAAAEAAAAGAw==",
                "Digit8" to "AAAAAQAAAAEAAAAHAw==",
                "Digit9" to "AAAAAQAAAAEAAAAIAw==",
                "Enter" to "AAAAAQAAAAEAAABlAw==",
                "Escape" to "AAAAAgAAAJcAAAAjAw==",
            )
        // Fix digit0 - use proper codes
        val fixed =
            mapOf(
                "Digit0" to "AAAAAQAAAAEAAAAJAw==",
                "Digit1" to "AAAAAQAAAAEAAAAAAw==",
                "Digit2" to "AAAAAQAAAAEAAAABAw==",
                "Digit3" to "AAAAAQAAAAEAAAACAw==",
                "Digit4" to "AAAAAQAAAAEAAAADAw==",
                "Digit5" to "AAAAAQAAAAEAAAAEAw==",
                "Digit6" to "AAAAAQAAAAEAAAAFAw==",
                "Digit7" to "AAAAAQAAAAEAAAAGAw==",
                "Digit8" to "AAAAAQAAAAEAAAAHAw==",
                "Digit9" to "AAAAAQAAAAEAAAAIAw==",
            )
        val ir = fixed[code] ?: digitCodes[code] ?: return false
        return ircc(ir)
    }

    override suspend fun launchApp(appId: String): Boolean =
        withContext(Dispatchers.IO) {
            runCatching {
                val body =
                    """{"method":"setActiveApp","version":"1.0","id":1,"params":[{"uri":"localapp://webappruntime?url=$appId"}]}"""
                val req =
                    Request.Builder()
                        .url("http://$host/sony/appControl")
                        .addHeader("X-Auth-PSK", psk)
                        .addHeader("Content-Type", "application/json")
                        .post(body.toRequestBody("application/json".toMediaType()))
                        .build()
                http.newCall(req).execute().use { it.isSuccessful }
            }.getOrDefault(false)
        }

    private suspend fun ircc(code: String): Boolean =
        withContext(Dispatchers.IO) {
            runCatching {
                val soap =
                    """<?xml version="1.0"?>
                    <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
                    <s:Body><u:X_SendIRCC xmlns:u="urn:schemas-sony-com:service:IRCC:1">
                    <IRCCCode>$code</IRCCCode>
                    </u:X_SendIRCC></s:Body></s:Envelope>"""
                val req =
                    Request.Builder()
                        .url("http://$host/sony/IRCC")
                        .addHeader("Content-Type", "text/xml; charset=UTF-8")
                        .addHeader("SOAPACTION", "\"urn:schemas-sony-com:service:IRCC:1#X_SendIRCC\"")
                        .addHeader("X-Auth-PSK", psk)
                        .post(soap.toRequestBody("text/xml".toMediaType()))
                        .build()
                http.newCall(req).execute().use { it.isSuccessful }
            }.getOrDefault(false)
        }
}
