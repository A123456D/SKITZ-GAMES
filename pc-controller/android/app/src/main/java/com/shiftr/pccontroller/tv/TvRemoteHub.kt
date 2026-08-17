package com.shiftr.pccontroller.tv

import android.content.Context
import android.util.Log
import com.shiftr.pccontroller.tv.androidtv.AndroidTvClient
import com.shiftr.pccontroller.tv.bravia.BraviaClient
import com.shiftr.pccontroller.tv.discovery.TvDiscovery
import com.shiftr.pccontroller.tv.lg.LgClient
import com.shiftr.pccontroller.tv.roku.RokuClient
import com.shiftr.pccontroller.tv.samsung.SamsungClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

class TvRemoteHub(private val context: Context) {
    private val tag = "TvRemoteHub"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val discovery = TvDiscovery(context)
    private val active = AtomicReference<TvClient?>(null)
    private val lastDevices = AtomicReference<List<DiscoveredTv>>(emptyList())
    private val lastConnection = AtomicReference<SavedConnection?>(null)
    private val reconnecting = AtomicBoolean(false)

    private data class SavedConnection(val device: DiscoveredTv, val psk: String?)

    var listener: ((connected: Boolean, name: String?, protocol: String?, message: String) -> Unit)? = null

    fun lastScan(): List<DiscoveredTv> = lastDevices.get()

    suspend fun scan(): List<DiscoveredTv> {
        val list = discovery.scan()
        lastDevices.set(list)
        return list
    }

    suspend fun connect(id: String, psk: String? = null): Result<Unit> {
        val device =
            lastDevices.get().find { it.id == id }
                ?: id.toDiscoveredOrNull()
                ?: return Result.failure(IllegalArgumentException("Unknown TV $id — scan first"))
        lastConnection.set(SavedConnection(device, psk))
        return connectDevice(device, psk)
    }

    private suspend fun connectDevice(
        device: DiscoveredTv,
        psk: String?,
        showPairingHelp: Boolean = true,
    ): Result<Unit> {
        active.get()?.disconnect()
        val client = createClient(device, psk)
        client.onSessionLost = { handleSessionLost(client) }
        if (showPairingHelp) {
            when (device.protocol) {
                TvProtocol.SAMSUNG ->
                    listener?.invoke(
                        false,
                        device.name,
                        device.protocol.name,
                        "Look at the TV now — tap Allow for Pc Controller (up to 30s)",
                    )
                TvProtocol.LG ->
                    listener?.invoke(
                        false,
                        device.name,
                        device.protocol.name,
                        "Look at the LG — accept the pairing popup (up to 45s)",
                    )
                TvProtocol.BRAVIA ->
                    listener?.invoke(
                        false,
                        device.name,
                        device.protocol.name,
                        "Bravia: IP control must be on. Default PIN 0000.",
                    )
                TvProtocol.ANDROID_TV, TvProtocol.FIRE_TV ->
                    listener?.invoke(
                        false,
                        device.name,
                        device.protocol.name,
                        "Trying Wi‑Fi… if this fails, pair Bluetooth HID on the TV",
                    )
                else -> Unit
            }
        }
        val result = client.connect()
        if (result.isSuccess) {
            active.set(client)
            listener?.invoke(true, client.deviceName, client.protocol.name, "Connected to ${client.deviceName}")
        } else {
            listener?.invoke(false, null, device.protocol.name, result.exceptionOrNull()?.message ?: "Connect failed")
        }
        return result
    }

    suspend fun disconnect() {
        active.get()?.disconnect()
        active.set(null)
        listener?.invoke(false, null, null, "TV disconnected")
    }

    fun isConnected(): Boolean = active.get()?.isLive() == true

    fun activeProtocol(): String? = active.get()?.protocol?.name

    fun activeName(): String? = active.get()?.deviceName

    suspend fun sendAction(action: String, down: Boolean): Boolean {
        val client = active.get() ?: return false
        return try {
            client.sendAction(action, down).also { ok ->
                if (!ok && !client.isLive()) handleSessionLost(client)
            }
        } catch (e: Exception) {
            Log.w(tag, "sendAction", e)
            handleSessionLost(client)
            false
        }
    }

    suspend fun sendKey(code: String, down: Boolean): Boolean {
        val client = active.get() ?: return false
        return try {
            client.sendKeyCode(code, down).also { ok ->
                if (!ok && !client.isLive()) handleSessionLost(client)
            }
        } catch (e: Exception) {
            Log.w(tag, "sendKey", e)
            handleSessionLost(client)
            false
        }
    }

    suspend fun launchApp(action: String): Boolean {
        val client = active.get() ?: return false
        val appId = TvActions.streamingAppId(action, client.protocol) ?: return false
        return try {
            client.launchApp(appId).also { ok ->
                if (!ok && !client.isLive()) handleSessionLost(client)
            }
        } catch (e: Exception) {
            Log.w(tag, "launchApp", e)
            handleSessionLost(client)
            false
        }
    }

    private fun handleSessionLost(client: TvClient) {
        if (!active.compareAndSet(client, null)) return
        listener?.invoke(
            false,
            client.deviceName,
            client.protocol.name,
            "TV connection lost · reconnecting…",
        )
        reconnectLast()
    }

    private fun reconnectLast() {
        val saved = lastConnection.get() ?: return
        if (!reconnecting.compareAndSet(false, true)) return
        scope.launch {
            try {
                delay(350)
                val result = connectDevice(saved.device, saved.psk, showPairingHelp = false)
                if (result.isFailure) {
                    listener?.invoke(
                        false,
                        saved.device.name,
                        saved.device.protocol.name,
                        "TV reconnect failed · tap the connection status to retry",
                    )
                }
            } finally {
                reconnecting.set(false)
            }
        }
    }

    private fun createClient(device: DiscoveredTv, psk: String?): TvClient {
        return when (device.protocol) {
            TvProtocol.ROKU -> RokuClient(device.host, device.name)
            TvProtocol.SAMSUNG -> SamsungClient(context, device.host, device.name)
            TvProtocol.LG -> LgClient(context, device.host, device.name)
            TvProtocol.BRAVIA -> BraviaClient(device.host, device.name, psk ?: "0000")
            TvProtocol.ANDROID_TV, TvProtocol.FIRE_TV ->
                AndroidTvClient(device.host, device.name, device.protocol)
            TvProtocol.BLUETOOTH_HID -> error("Use Bluetooth HID plugin for BT devices")
        }
    }

    private fun String.toDiscoveredOrNull(): DiscoveredTv? {
        val parts = split(":", limit = 2)
        if (parts.size != 2) return null
        val host = parts[1]
        val protocol =
            when (parts[0].lowercase()) {
                "roku" -> TvProtocol.ROKU
                "samsung" -> TvProtocol.SAMSUNG
                "lg" -> TvProtocol.LG
                "bravia" -> TvProtocol.BRAVIA
                "androidtv" -> TvProtocol.ANDROID_TV
                "firetv" -> TvProtocol.FIRE_TV
                else -> return null
            }
        return DiscoveredTv(this, "${protocol.name} ($host)", host, protocol)
    }

    fun connectAsync(id: String, psk: String?, onDone: (Result<Unit>) -> Unit) {
        scope.launch {
            onDone(connect(id, psk))
        }
    }
}
