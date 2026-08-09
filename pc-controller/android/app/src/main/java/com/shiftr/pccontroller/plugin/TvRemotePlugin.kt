package com.shiftr.pccontroller.plugin

import android.Manifest
import android.os.Build
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.shiftr.pccontroller.tv.TvRemoteHub
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

@CapacitorPlugin(
    name = "TvRemote",
    permissions = [
        Permission(
            alias = "network",
            strings = [
                Manifest.permission.ACCESS_NETWORK_STATE,
                Manifest.permission.CHANGE_WIFI_MULTICAST_STATE,
            ],
        ),
        Permission(
            alias = "nearby",
            strings = [Manifest.permission.NEARBY_WIFI_DEVICES],
        ),
    ],
)
class TvRemotePlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var hub: TvRemoteHub? = null

    override fun load() {
        hub = TvRemoteHub(context.applicationContext)
        hub?.listener = { connected, name, protocol, message ->
            val obj =
                JSObject()
                    .put("connected", connected)
                    .put("name", name)
                    .put("protocol", protocol)
                    .put("message", message)
            notifyListeners("tvState", obj)
        }
    }

    @PluginMethod
    fun ensurePermissions(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= 33) {
            if (getPermissionState("nearby") != com.getcapacitor.PermissionState.GRANTED) {
                requestPermissionForAlias("nearby", call, "nearbyCallback")
                return
            }
        }
        call.resolve(JSObject().put("granted", true))
    }

    @PermissionCallback
    private fun nearbyCallback(call: PluginCall) {
        call.resolve(JSObject().put("granted", true))
    }

    @PluginMethod
    fun scan(call: PluginCall) {
        val h = hub ?: return call.reject("TV hub not ready")
        scope.launch(Dispatchers.IO) {
            try {
                h.ensurePermissionsQuiet()
                val devices = h.scan()
                val arr = JSArray()
                for (d in devices) {
                    arr.put(
                        JSObject()
                            .put("id", d.id)
                            .put("name", d.name)
                            .put("host", d.host)
                            .put("protocol", d.protocol.name.lowercase())
                            .put("kind", "tv"),
                    )
                }
                call.resolve(JSObject().put("devices", arr))
            } catch (e: Exception) {
                call.reject(e.message ?: "TV scan failed")
            }
        }
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("id required")
        val psk = call.getString("psk")
        val h = hub ?: return call.reject("TV hub not ready")
        scope.launch(Dispatchers.IO) {
            val result = h.connect(id, psk)
            if (result.isSuccess) {
                call.resolve(
                    JSObject()
                        .put("ok", true)
                        .put("name", h.activeName())
                        .put("protocol", h.activeProtocol()),
                )
            } else {
                call.reject(result.exceptionOrNull()?.message ?: "TV connect failed")
            }
        }
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        scope.launch(Dispatchers.IO) {
            hub?.disconnect()
            call.resolve()
        }
    }

    @PluginMethod
    fun getState(call: PluginCall) {
        val h = hub
        call.resolve(
            JSObject()
                .put("connected", h?.isConnected() == true)
                .put("name", h?.activeName())
                .put("protocol", h?.activeProtocol()),
        )
    }

    @PluginMethod
    fun sendAction(call: PluginCall) {
        val action = call.getString("action") ?: return call.reject("action required")
        val down = call.getBoolean("down") ?: true
        val ok = hub?.sendAction(action, down) == true
        call.resolve(JSObject().put("ok", ok))
    }

    @PluginMethod
    fun sendKey(call: PluginCall) {
        val code = call.getString("code") ?: return call.reject("code required")
        val down = call.getBoolean("down") ?: true
        val ok = hub?.sendKey(code, down) == true
        call.resolve(JSObject().put("ok", ok))
    }

    @PluginMethod
    fun launchApp(call: PluginCall) {
        val action = call.getString("action") ?: return call.reject("action required")
        val ok = hub?.launchApp(action) == true
        call.resolve(JSObject().put("ok", ok))
    }
}

private fun TvRemoteHub.ensurePermissionsQuiet() = Unit
