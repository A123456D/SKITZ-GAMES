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
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import java.util.concurrent.atomic.AtomicReference

class TvRemoteHub(private val context: Context) {
    private val tag = "TvRemoteHub"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val discovery = TvDiscovery(context)
    private val active = AtomicReference<TvClient?>(null)
    private val lastDevices = AtomicReference<List<DiscoveredTv>>(emptyList())

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
        active.get()?.disconnect()
        val client = createClient(device, psk)
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

    fun isConnected(): Boolean = active.get() != null

    fun activeProtocol(): String? = active.get()?.protocol?.name

    fun activeName(): String? = active.get()?.deviceName

    fun sendAction(action: String, down: Boolean): Boolean {
        val client = active.get() ?: return false
        return try {
            runBlocking(Dispatchers.IO) { client.sendAction(action, down) }
        } catch (e: Exception) {
            Log.w(tag, "sendAction", e)
            false
        }
    }

    fun sendKey(code: String, down: Boolean): Boolean {
        val client = active.get() ?: return false
        return try {
            runBlocking(Dispatchers.IO) { client.sendKeyCode(code, down) }
        } catch (e: Exception) {
            Log.w(tag, "sendKey", e)
            false
        }
    }

    fun launchApp(action: String): Boolean {
        val client = active.get() ?: return false
        val appId = TvActions.streamingAppId(action, client.protocol) ?: return false
        return try {
            runBlocking(Dispatchers.IO) { client.launchApp(appId) }
        } catch (e: Exception) {
            Log.w(tag, "launchApp", e)
            false
        }
    }

    private fun createClient(device: DiscoveredTv, psk: String?): TvClient {
        return when (device.protocol) {
            TvProtocol.ROKU -> RokuClient(device.host, device.name)
            TvProtocol.SAMSUNG -> SamsungClient(device.host, device.name)
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
