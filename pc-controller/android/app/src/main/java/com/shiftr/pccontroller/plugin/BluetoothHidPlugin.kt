package com.shiftr.pccontroller.plugin

import android.Manifest
import android.annotation.SuppressLint
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.os.Build
import android.os.IBinder
import androidx.core.content.ContextCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.shiftr.pccontroller.hid.HidConnectionState
import com.shiftr.pccontroller.hid.HidController
import com.shiftr.pccontroller.hid.HidService
import com.shiftr.pccontroller.hid.HidUiState

@CapacitorPlugin(
    name = "BluetoothHid",
    permissions = [
        Permission(
            alias = "bluetooth",
            strings = [
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_SCAN,
            ],
        ),
        Permission(
            alias = "notifications",
            strings = [Manifest.permission.POST_NOTIFICATIONS],
        ),
    ],
)
class BluetoothHidPlugin : Plugin() {
    private var service: HidService? = null
    private var controller: HidController? = null
    private var bound = false

    private val connection =
        object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
                val local = binder as HidService.LocalBinder
                service = local.getService()
                controller = service?.controller
                bound = true
                controller?.listener =
                    HidStateListenerBridge { state ->
                        notifyState(state)
                        service?.updateNotification(state.message)
                    }
                controller?.currentState()?.let { notifyState(it) }
            }

            override fun onServiceDisconnected(name: ComponentName?) {
                bound = false
                controller = null
                service = null
            }
        }

    override fun load() {
        bindHidService()
    }

    override fun handleOnDestroy() {
        if (bound) {
            try {
                context.unbindService(connection)
            } catch (_: Exception) {
            }
            bound = false
        }
        super.handleOnDestroy()
    }

    override fun handleOnResume() {
        super.handleOnResume()
        // Samsung/Android: HID registration must happen while app is in foreground.
        controller?.let {
            if (it.currentState().connection != HidConnectionState.Idle &&
                it.currentState().connection != HidConnectionState.Unsupported
            ) {
                it.start()
            }
        }
    }

    @PluginMethod
    fun ensurePermissions(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (getPermissionState("bluetooth") != com.getcapacitor.PermissionState.GRANTED) {
                requestPermissionForAlias("bluetooth", call, "bluetoothPermsCallback")
                return
            }
        }
        // Notifications are optional — never block HID startup on them.
        if (Build.VERSION.SDK_INT >= 33 &&
            getPermissionState("notifications") != com.getcapacitor.PermissionState.GRANTED
        ) {
            requestPermissionForAlias("notifications", call, "notifPermsCallback")
            return
        }
        call.resolve(JSObject().put("granted", true))
    }

    @PermissionCallback
    private fun bluetoothPermsCallback(call: PluginCall) {
        val granted = getPermissionState("bluetooth") == com.getcapacitor.PermissionState.GRANTED
        // Always resolve so the WebView is never stuck on the splash/boot path.
        if (granted && Build.VERSION.SDK_INT >= 33 &&
            getPermissionState("notifications") != com.getcapacitor.PermissionState.GRANTED
        ) {
            requestPermissionForAlias("notifications", call, "notifPermsCallback")
            return
        }
        call.resolve(JSObject().put("granted", granted))
    }

    @PermissionCallback
    private fun notifPermsCallback(call: PluginCall) {
        val btOk =
            Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
                getPermissionState("bluetooth") == com.getcapacitor.PermissionState.GRANTED
        call.resolve(JSObject().put("granted", btOk))
    }

    @PluginMethod
    fun start(call: PluginCall) {
        bindHidService()
        val c = controller
        if (c == null) {
            // Service may still be binding
            activity.runOnUiThread {
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(
                    {
                        controller?.start()
                        call.resolve(stateObject(controller?.currentState()))
                    },
                    400,
                )
            }
            return
        }
        c.start()
        call.resolve(stateObject(c.currentState()))
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        controller?.stop()
        call.resolve(stateObject(controller?.currentState()))
    }

    @PluginMethod
    fun restart(call: PluginCall) {
        controller?.restart()
        call.resolve(stateObject(controller?.currentState()))
    }

    @PluginMethod
    fun makeDiscoverable(call: PluginCall) {
        val ok = controller?.makeDiscoverableInApp() == true
        call.resolve(JSObject().put("ok", ok).put("state", stateObject(controller?.currentState())))
    }

    @PluginMethod
    fun getState(call: PluginCall) {
        call.resolve(stateObject(controller?.currentState()))
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    fun listBonded(call: PluginCall) {
        val c = controller
        if (c == null) {
            call.resolve(JSObject().put("devices", JSArray()))
            return
        }
        if (!hasBtConnect()) {
            call.reject("Bluetooth permission required")
            return
        }
        val arr = JSArray()
        for (d in c.bondedDevices()) {
            val obj = JSObject()
            obj.put("id", d.address)
            obj.put("name", try {
                d.name?.takeIf { it.isNotBlank() } ?: d.address
            } catch (_: SecurityException) {
                d.address
            })
            obj.put("kind", "pc")
            arr.put(obj)
        }
        call.resolve(JSObject().put("devices", arr))
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        val address = call.getString("address")
        if (address.isNullOrBlank()) {
            call.reject("address required")
            return
        }
        val ok = controller?.connectToAddress(address) == true
        if (!ok) {
            call.reject("Could not connect to $address")
            return
        }
        call.resolve(stateObject(controller?.currentState()))
    }

    @PluginMethod
    fun mouseMove(call: PluginCall) {
        val dx = call.getInt("dx") ?: 0
        val dy = call.getInt("dy") ?: 0
        controller?.sendMouse(dx, dy)
        call.resolve()
    }

    @PluginMethod
    fun mouseButton(call: PluginCall) {
        val button = call.getString("button") ?: "left"
        val down = call.getBoolean("down") ?: false
        val index =
            when (button) {
                "right" -> 1
                "middle" -> 2
                else -> 0
            }
        controller?.setMouseButton(index, down)
        call.resolve()
    }

    @PluginMethod
    fun mouseScroll(call: PluginCall) {
        val dy = call.getInt("dy") ?: 0
        controller?.sendMouse(0, 0, wheel = dy)
        call.resolve()
    }

    @PluginMethod
    fun key(call: PluginCall) {
        val code = call.getString("code") ?: return call.reject("code required")
        val down = call.getBoolean("down") ?: false
        controller?.keyEvent(code, down)
        call.resolve()
    }

    @PluginMethod
    fun consumer(call: PluginCall) {
        val action = call.getString("action") ?: return call.reject("action required")
        val down = call.getBoolean("down") ?: false
        controller?.consumer(action, down)
        call.resolve()
    }

    @PluginMethod
    fun gamepad(call: PluginCall) {
        val lx = call.getFloat("lx") ?: 0f
        val ly = call.getFloat("ly") ?: 0f
        val rx = call.getFloat("rx") ?: 0f
        val ry = call.getFloat("ry") ?: 0f
        val buttonsObj = call.getObject("buttons") ?: JSObject()
        val buttons = HashMap<String, Boolean>()
        val keys = buttonsObj.keys()
        while (keys.hasNext()) {
            val k = keys.next()
            buttons[k] = buttonsObj.getBool(k) == true
        }
        controller?.gamepad(lx, ly, rx, ry, buttons)
        call.resolve()
    }

    private fun bindHidService() {
        val intent = Intent(context, HidService::class.java)
        ContextCompat.startForegroundService(context, intent)
        if (!bound) {
            context.bindService(intent, connection, Context.BIND_AUTO_CREATE)
        }
    }

    private fun notifyState(state: HidUiState) {
        notifyListeners("hidState", stateObject(state))
    }

    private fun stateObject(state: HidUiState?): JSObject {
        val s = state ?: HidUiState()
        return JSObject()
            .put("connection", s.connection.name)
            .put("hostName", s.hostName)
            .put("hostAddress", s.hostAddress)
            .put("message", s.message)
            .put("detail", s.detail)
            .put("profileAvailable", s.profileAvailable)
    }

    private fun hasBtConnect(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        return ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) ==
            PackageManager.PERMISSION_GRANTED
    }

    private fun interface HidStateListenerBridge : com.shiftr.pccontroller.hid.HidStateListener
}

private fun JSObject.getBool(key: String): Boolean? {
    return try {
        if (!has(key)) null else getBoolean(key)
    } catch (_: Exception) {
        null
    }
}
