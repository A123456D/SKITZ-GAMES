package com.shiftr.pccontroller.hid

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothHidDevice
import android.bluetooth.BluetoothHidDeviceAppQosSettings
import android.bluetooth.BluetoothHidDeviceAppSdpSettings
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import java.util.concurrent.Executors
import kotlin.math.max
import kotlin.math.min

enum class HidConnectionState {
    Unsupported,
    BluetoothOff,
    Idle,
    Registering,
    WaitingForHost,
    Connected,
    Error,
}

data class HidUiState(
    val connection: HidConnectionState = HidConnectionState.Idle,
    val hostName: String? = null,
    val hostAddress: String? = null,
    val message: String = "",
    val detail: String = "",
    val profileAvailable: Boolean = true,
)

fun interface HidStateListener {
    fun onHidState(state: HidUiState)
}

/**
 * Bluetooth HID peripheral (mouse + keyboard + consumer).
 * Phone acts as the input device; PC/TV is the host.
 */
class HidController(private val context: Context) {
    private val tag = "PcControllerHid"
    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var profileTimeout: Runnable? = null
    private var recoverRunnable: Runnable? = null

    private val bluetoothManager =
        context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val adapter: BluetoothAdapter? = bluetoothManager.adapter

    private var hidDevice: BluetoothHidDevice? = null
    private var hostDevice: BluetoothDevice? = null
    private var registered = false
    private var starting = false
    private var wantRunning = false
    private var intentionalStop = false
    private var recoverAttempts = 0
    private var usedQos = false

    @Volatile
    private var uiState = HidUiState(message = "Tap Start HID to begin")
    var listener: HidStateListener? = null

    /** Modifiers from held keycaps (Shift, Ctrl, …). */
    private var modifierByte: Byte = 0
    private val pressedKeys = LinkedHashSet<Byte>()
    private var mouseButtons = 0
    private var consumerBits = 0

    private val qosOut =
        BluetoothHidDeviceAppQosSettings(
            BluetoothHidDeviceAppQosSettings.SERVICE_BEST_EFFORT,
            800,
            9,
            0,
            11250,
            BluetoothHidDeviceAppQosSettings.MAX,
        )

    private val profileListener =
        object : BluetoothProfile.ServiceListener {
            override fun onServiceConnected(profile: Int, proxy: BluetoothProfile?) {
                if (profile != BluetoothProfile.HID_DEVICE || proxy !is BluetoothHidDevice) return
                hidDevice = proxy
                Log.i(tag, "HID_DEVICE proxy connected")
                if (wantRunning) registerApp()
            }

            override fun onServiceDisconnected(profile: Int) {
                if (profile != BluetoothProfile.HID_DEVICE) return
                Log.w(tag, "HID_DEVICE proxy disconnected")
                hidDevice = null
                registered = false
                hostDevice = null
                starting = false
                if (wantRunning && !intentionalStop) {
                    emit(
                        HidConnectionState.Error,
                        hostName = null,
                        hostAddress = null,
                        message = "Bluetooth HID service lost — tap Restart HID",
                    )
                }
            }
        }

    private val callback =
        object : BluetoothHidDevice.Callback() {
            override fun onAppStatusChanged(pluggedDevice: BluetoothDevice?, registered: Boolean) {
                this@HidController.registered = registered
                starting = false
                Log.i(tag, "onAppStatusChanged registered=$registered plugged=${pluggedDevice?.address}")
                clearTimeout()
                if (registered) {
                    recoverAttempts = 0
                    intentionalStop = false
                    enableInAppDiscoverable()
                    refreshHostLink()
                    if (pluggedDevice != null && !isConnectedTo(pluggedDevice)) {
                        connectTo(pluggedDevice, fromAuto = true)
                    } else if (hostDevice == null) {
                        tryAutoConnectLastHost()
                    }
                } else if (intentionalStop) {
                    hostDevice = null
                    emit(HidConnectionState.Registering, hostName = null, hostAddress = null, message = "Restarting HID…")
                } else if (wantRunning) {
                    hostDevice = null
                    scheduleRecover()
                } else {
                    hostDevice = null
                    emit(HidConnectionState.Idle, hostName = null, hostAddress = null, message = "Stopped")
                }
            }

            override fun onConnectionStateChanged(device: BluetoothDevice?, state: Int) {
                Log.i(tag, "onConnectionStateChanged ${device?.address} state=$state")
                when (state) {
                    BluetoothProfile.STATE_CONNECTED -> {
                        hostDevice = device
                        recoverAttempts = 0
                        rememberHost(device?.address)
                        emit(
                            HidConnectionState.Connected,
                            hostName = safeName(device),
                            hostAddress = device?.address,
                            message = "HID live — keep Pc Controller open",
                            detail = diagLine(),
                        )
                    }
                    BluetoothProfile.STATE_DISCONNECTED -> {
                        if (hostDevice?.address == device?.address) hostDevice = null
                        if (registered && wantRunning) {
                            emit(
                                HidConnectionState.WaitingForHost,
                                hostName = null,
                                hostAddress = null,
                                message = "HID dropped — tap Connect under Known devices",
                                detail = diagLine(),
                            )
                        }
                    }
                    BluetoothProfile.STATE_CONNECTING -> {
                        if (uiState.connection != HidConnectionState.Connected) {
                            emit(
                                HidConnectionState.WaitingForHost,
                                hostName = safeName(device),
                                hostAddress = device?.address,
                                message = "Opening HID to ${safeName(device)}…",
                                detail = diagLine(),
                            )
                        }
                    }
                }
            }

            override fun onGetReport(
                device: BluetoothDevice?,
                type: Byte,
                id: Byte,
                bufferSize: Int,
            ) {
                val hid = hidDevice ?: return
                val host = device ?: return
                try {
                    when (type) {
                        BluetoothHidDevice.REPORT_TYPE_FEATURE -> {
                            hid.replyReport(host, type, HidDescriptors.FEATURE_REPORT_ID.toByte(), byteArrayOf(0x05))
                        }
                        BluetoothHidDevice.REPORT_TYPE_INPUT -> {
                            val empty =
                                when (id.toInt()) {
                                    HidDescriptors.MOUSE_REPORT_ID -> ByteArray(7)
                                    HidDescriptors.KEYBOARD_REPORT_ID -> ByteArray(8)
                                    HidDescriptors.CONSUMER_REPORT_ID -> ByteArray(2)
                                    else -> ByteArray(max(1, bufferSize).coerceAtMost(16))
                                }
                            hid.replyReport(host, type, id, empty)
                        }
                        else -> hid.reportError(host, BluetoothHidDevice.ERROR_RSP_INVALID_RPT_ID)
                    }
                } catch (e: Exception) {
                    Log.w(tag, "onGetReport reply failed", e)
                }
            }
        }

    fun currentState(): HidUiState = uiState

    fun start() {
        wantRunning = true
        intentionalStop = false
        if (adapter == null) {
            emit(HidConnectionState.Unsupported, message = "No Bluetooth adapter", profileAvailable = false)
            return
        }
        if (!adapter.isEnabled) {
            emit(HidConnectionState.BluetoothOff, message = "Turn on Bluetooth")
            return
        }
        if (registered && hidDevice != null) {
            enableInAppDiscoverable()
            refreshHostLink()
            return
        }
        if (starting) {
            emit(HidConnectionState.Registering, message = "Still starting Bluetooth HID…")
            return
        }
        starting = true
        emit(HidConnectionState.Registering, message = "Starting Bluetooth HID…")

        if (hidDevice != null) {
            registerApp()
            return
        }

        val ok = adapter.getProfileProxy(context, profileListener, BluetoothProfile.HID_DEVICE)
        if (!ok) {
            starting = false
            emit(
                HidConnectionState.Unsupported,
                message = "Bluetooth HID Device profile missing on this phone",
                profileAvailable = false,
            )
            return
        }
        armTimeout("Bluetooth HID timed out — keep the app open, then tap Restart HID")
    }

    fun stop() {
        wantRunning = false
        intentionalStop = true
        starting = false
        recoverAttempts = 0
        clearTimeout()
        clearRecover()
        try {
            hostDevice?.let { hidDevice?.disconnect(it) }
            if (registered) hidDevice?.unregisterApp()
        } catch (e: Exception) {
            Log.w(tag, "stop", e)
        }
        registered = false
        hostDevice = null
        emit(HidConnectionState.Idle, hostName = null, hostAddress = null, message = "Stopped")
    }

    fun restart() {
        wantRunning = true
        intentionalStop = true
        starting = false
        recoverAttempts = 0
        clearTimeout()
        clearRecover()
        emit(HidConnectionState.Registering, hostName = null, hostAddress = null, message = "Restarting HID…")
        try {
            hostDevice?.let { hidDevice?.disconnect(it) }
            if (registered) hidDevice?.unregisterApp()
        } catch (e: Exception) {
            Log.w(tag, "restart teardown", e)
        }
        registered = false
        hostDevice = null
        mainHandler.postDelayed(
            {
                intentionalStop = false
                start()
            },
            1_200L,
        )
    }

    fun release() {
        stop()
        try {
            adapter?.closeProfileProxy(BluetoothProfile.HID_DEVICE, hidDevice)
        } catch (_: Exception) {
        }
        hidDevice = null
    }

    @SuppressLint("MissingPermission")
    fun makeDiscoverableInApp(): Boolean {
        val a = adapter ?: return false
        return try {
            val method =
                BluetoothAdapter::class.java.getMethod(
                    "setScanMode",
                    Int::class.javaPrimitiveType,
                    Int::class.javaPrimitiveType,
                )
            val ok =
                method.invoke(
                    a,
                    BluetoothAdapter.SCAN_MODE_CONNECTABLE_DISCOVERABLE,
                    300,
                ) as? Boolean ?: false
            if (ok) {
                emit(
                    uiState.connection,
                    message = "Discoverable 5 min — on PC/TV: Add Bluetooth device → Pc Controller (stay in this app)",
                    detail = diagLine(),
                )
            }
            ok
        } catch (e: Exception) {
            Log.w(tag, "setScanMode failed", e)
            false
        }
    }

    @SuppressLint("MissingPermission")
    fun refreshHostLink() {
        val hid = hidDevice
        if (!registered || hid == null) return
        try {
            val connected = hid.connectedDevices
            if (!connected.isNullOrEmpty()) {
                val host = connected.first()
                hostDevice = host
                emit(
                    HidConnectionState.Connected,
                    hostName = safeName(host),
                    hostAddress = host.address,
                    message = "HID live — keep Pc Controller open",
                    detail = diagLine(),
                )
                return
            }
            val current = hostDevice
            if (current != null && hid.getConnectionState(current) == BluetoothProfile.STATE_CONNECTED) {
                emit(
                    HidConnectionState.Connected,
                    hostName = safeName(current),
                    hostAddress = current.address,
                    message = "HID live — keep Pc Controller open",
                    detail = diagLine(),
                )
                return
            }
        } catch (e: Exception) {
            Log.w(tag, "refreshHostLink", e)
        }
        hostDevice = null
        val tip =
            if (bondedDevices().isEmpty()) {
                "Ready — tap Make discoverable, then pair from the PC/TV (stay in this app)"
            } else {
                "Ready — tap Connect under Known devices"
            }
        emit(
            HidConnectionState.WaitingForHost,
            hostName = null,
            hostAddress = null,
            message = tip,
            detail = diagLine(),
        )
    }

    @SuppressLint("MissingPermission")
    fun connectToAddress(address: String): Boolean {
        val device =
            try {
                adapter?.getRemoteDevice(address)
            } catch (_: Exception) {
                null
            } ?: return false
        connectTo(device)
        return true
    }

    @SuppressLint("MissingPermission")
    fun connectTo(device: BluetoothDevice, fromAuto: Boolean = false) {
        val hid = hidDevice ?: return
        if (!registered) {
            emit(HidConnectionState.Error, message = "HID not registered yet — tap Restart HID")
            return
        }
        try {
            val state = hid.getConnectionState(device)
            if (state == BluetoothProfile.STATE_CONNECTED) {
                hostDevice = device
                emit(
                    HidConnectionState.Connected,
                    hostName = safeName(device),
                    hostAddress = device.address,
                    message = "HID live — keep Pc Controller open",
                    detail = diagLine(),
                )
                return
            }
            if (state == BluetoothProfile.STATE_CONNECTING) {
                emit(
                    HidConnectionState.WaitingForHost,
                    hostName = safeName(device),
                    hostAddress = device.address,
                    message = "Opening HID to ${safeName(device)}…",
                    detail = diagLine(),
                )
                return
            }
            if (hostDevice?.address == device.address) hostDevice = null
            emit(
                HidConnectionState.WaitingForHost,
                hostName = safeName(device),
                hostAddress = device.address,
                message = "Opening HID to ${safeName(device)}…",
                detail = diagLine(),
            )
            val ok = hid.connect(device)
            Log.i(tag, "connect(${device.address}) ok=$ok auto=$fromAuto")
            if (!ok) {
                emit(
                    HidConnectionState.WaitingForHost,
                    hostName = safeName(device),
                    hostAddress = device.address,
                    message = "HID connect refused — forget Pc Controller on both sides, pair again WHILE this app is open",
                    detail = diagLine(),
                )
            }
        } catch (e: SecurityException) {
            emit(HidConnectionState.Error, message = "Bluetooth permission denied")
        } catch (e: Exception) {
            emit(HidConnectionState.Error, message = "Connect failed: ${e.message}")
        }
    }

    @SuppressLint("MissingPermission")
    fun bondedDevices(): List<BluetoothDevice> {
        return try {
            adapter?.bondedDevices?.toList().orEmpty()
        } catch (_: SecurityException) {
            emptyList()
        }
    }

    fun sendMouse(dx: Int, dy: Int, buttons: Int = mouseButtons, wheel: Int = 0, pan: Int = 0): Boolean {
        mouseButtons = buttons and 0x1F
        val host = hostDevice
        val hid = hidDevice
        // Hot path: skip getConnectionState — it adds lag under high-rate moves.
        if (host == null || hid == null || !registered) return false
        val x = dx.coerceIn(-2047, 2047)
        val y = dy.coerceIn(-2047, 2047)
        val report =
            byteArrayOf(
                mouseButtons.toByte(),
                (x and 0xff).toByte(),
                ((x shr 8) and 0xff).toByte(),
                (y and 0xff).toByte(),
                ((y shr 8) and 0xff).toByte(),
                clampByte(wheel),
                clampByte(pan),
            )
        return try {
            hid.sendReport(host, HidDescriptors.MOUSE_REPORT_ID, report)
        } catch (_: SecurityException) {
            false
        } catch (_: Exception) {
            false
        }
    }

    fun setMouseButton(button: Int, down: Boolean): Boolean {
        val bit =
            when (button) {
                0 -> 0x01
                1 -> 0x02
                2 -> 0x04
                else -> 0x00
            }
        mouseButtons =
            if (down) {
                mouseButtons or bit
            } else {
                mouseButtons and bit.inv()
            }
        return sendMouse(0, 0, mouseButtons, 0)
    }

    fun keyEvent(domCode: String, down: Boolean): Boolean {
        if (typing) return false
        val (usage, mod) = HidKeys.fromDomCode(domCode)
        if (mod.toInt() != 0) {
            modifierByte =
                if (down) {
                    (modifierByte.toInt() or mod.toInt()).toByte()
                } else {
                    (modifierByte.toInt() and mod.toInt().inv()).toByte()
                }
            return flushKeyboard()
        }
        if (usage == HidKeys.NONE) return false
        if (down) pressedKeys.add(usage) else pressedKeys.remove(usage)
        return flushKeyboard()
    }

    fun releaseAllKeys(): Boolean {
        modifierByte = 0
        pressedKeys.clear()
        return flushKeyboard()
    }

    fun consumer(action: String, down: Boolean): Boolean {
        // Map UI actions → consumer bitfield or keyboard fallback
        when (action) {
            "up" -> return keyEvent("ArrowUp", down)
            "down" -> return keyEvent("ArrowDown", down)
            "left" -> return keyEvent("ArrowLeft", down)
            "right" -> return keyEvent("ArrowRight", down)
            "ok" -> return keyEvent("Enter", down)
            "back" -> return keyEvent("Escape", down)
            "netflix", "prime", "appletv", "disney", "info", "input" -> {
                // App shortcuts: send as letter chords hosts/apps can bind; still a real HID event
                if (down) {
                    val letter =
                        when (action) {
                            "netflix" -> "KeyN"
                            "prime" -> "KeyP"
                            "appletv" -> "KeyA"
                            "disney" -> "KeyD"
                            "info" -> "KeyI"
                            else -> "KeyO"
                        }
                    keyEvent(letter, true)
                    keyEvent(letter, false)
                }
                return true
            }
        }

        val bit =
            when (action) {
                "volUp" -> 1 shl 0
                "volDown" -> 1 shl 1
                "mute" -> 1 shl 2
                "play" -> 1 shl 3
                "next" -> 1 shl 4
                "prev" -> 1 shl 5
                "home" -> 1 shl 8
                "menu" -> 1 shl 10
                "power" -> 1 shl 11
                else -> 0
            }
        if (bit == 0) return false
        consumerBits = if (down) consumerBits or bit else consumerBits and bit.inv()
        return flushConsumer()
    }

    // ---- Type-on-host: paced HID keystrokes for real text entry ----

    private val typeExecutor = java.util.concurrent.Executors.newSingleThreadExecutor()

    @Volatile
    private var typing = false

    /** True while a text burst is mid-flight; keycaps pause so reports never interleave. */
    fun isTyping(): Boolean = typing

    fun typeText(text: String) {
        if (text.isEmpty()) return
        typeExecutor.execute {
            typing = true
            try {
                val hid = hidDevice ?: return@execute
                val host = hostDevice ?: return@execute
                for (c in text) {
                    if (hostDevice?.address != host.address) return@execute
                    val mapped = charToHid(c)
                    if (mapped == null) {
                        if (c == '\u000D') continue
                        Thread.sleep(24)
                        continue
                    }
                    val (usage, mods) = mapped
                    hid.sendReport(host, HidDescriptors.KEYBOARD_REPORT_ID, byteArrayOf(mods, 0, usage, 0, 0, 0, 0, 0))
                    Thread.sleep(12)
                    hid.sendReport(host, HidDescriptors.KEYBOARD_REPORT_ID, ByteArray(8))
                    Thread.sleep(24)
                }
            } catch (_: Exception) {
            } finally {
                typing = false
            }
        }
    }

    /** US-QWERTY scancode for a char; null = unsupported (skipped with a beat). */
    private fun charToHid(c: Char): Pair<Byte, Byte>? {
        val usage: Int
        val mods: Int
        when (c) {
            in 'a'..'z' -> { usage = 0x04 + (c - 'a'); mods = 0 }
            in 'A'..'Z' -> { usage = 0x04 + (c - 'A'); mods = HidKeys.MOD_LEFT_SHIFT.toInt() }
            in '1'..'9' -> { usage = 0x1E + (c - '1'); mods = 0 }
            '0' -> { usage = 0x27; mods = 0 }
            ' ' -> { usage = 0x2C; mods = 0 }
            '\u000A' -> { usage = 0x28; mods = 0 }
            '\u0009' -> { usage = 0x2B; mods = 0 }
            '!' -> { usage = 0x1E; mods = 2 }
            '@' -> { usage = 0x1F; mods = 2 }
            '#' -> { usage = 0x20; mods = 2 }
            '$' -> { usage = 0x21; mods = 2 }
            '%' -> { usage = 0x22; mods = 2 }
            '^' -> { usage = 0x23; mods = 2 }
            '&' -> { usage = 0x24; mods = 2 }
            '*' -> { usage = 0x25; mods = 2 }
            '(' -> { usage = 0x26; mods = 2 }
            ')' -> { usage = 0x27; mods = 2 }
            '-' -> { usage = 0x2D; mods = 0 }
            '_' -> { usage = 0x2D; mods = 2 }
            '=' -> { usage = 0x2E; mods = 0 }
            '+' -> { usage = 0x2E; mods = 2 }
            '[' -> { usage = 0x2F; mods = 0 }
            '{' -> { usage = 0x2F; mods = 2 }
            ']' -> { usage = 0x30; mods = 0 }
            '}' -> { usage = 0x30; mods = 2 }
            '\\' -> { usage = 0x31; mods = 0 }
            '|' -> { usage = 0x31; mods = 2 }
            ';' -> { usage = 0x33; mods = 0 }
            ':' -> { usage = 0x33; mods = 2 }
            '\'' -> { usage = 0x34; mods = 0 }
            '"' -> { usage = 0x34; mods = 2 }
            '`' -> { usage = 0x35; mods = 0 }
            '~' -> { usage = 0x35; mods = 2 }
            ',' -> { usage = 0x36; mods = 0 }
            '<' -> { usage = 0x36; mods = 2 }
            '.' -> { usage = 0x37; mods = 0 }
            '>' -> { usage = 0x37; mods = 2 }
            '/' -> { usage = 0x38; mods = 0 }
            '?' -> { usage = 0x38; mods = 2 }
            else -> return null
        }
        return usage.toByte() to mods.toByte()
    }

    private fun flushKeyboard(): Boolean {
        val host = hostDevice
        val hid = hidDevice
        // Hot path: skip getConnectionState — the binder round trip lags fast typing.
        if (host == null || hid == null || !registered) return false
        // Standard keyboard report: modifier, reserved, then six key slots.
        val report = ByteArray(8)
        report[0] = modifierByte
        pressedKeys.take(6).forEachIndexed { index, key ->
            report[index + 2] = key
        }
        return try {
            hid.sendReport(host, HidDescriptors.KEYBOARD_REPORT_ID, report)
        } catch (_: SecurityException) {
            false
        }
    }

    private fun flushConsumer(): Boolean {
        val host = hostDevice
        val hid = hidDevice
        if (host == null || hid == null || !registered) return false
        val report =
            byteArrayOf(
                (consumerBits and 0xff).toByte(),
                ((consumerBits shr 8) and 0xff).toByte(),
            )
        return try {
            hid.sendReport(host, HidDescriptors.CONSUMER_REPORT_ID, report)
        } catch (_: SecurityException) {
            false
        }
    }

    @SuppressLint("MissingPermission")
    private fun registerApp() {
        val hid = hidDevice ?: return
        if (!wantRunning) return
        if (registered) {
            starting = false
            clearTimeout()
            refreshHostLink()
            return
        }
        emit(HidConnectionState.Registering, message = "Registering as Pc Controller…")
        val sdp =
            BluetoothHidDeviceAppSdpSettings(
                "Pc Controller",
                "Mouse, Keyboard, Media",
                "SHIFTR",
                BluetoothHidDevice.SUBCLASS1_COMBO,
                HidDescriptors.COMBO,
            )

        var ok = tryRegister(hid, sdp, withQos = true)
        if (!ok) {
            Log.w(tag, "registerApp with QoS failed — retrying null QoS")
            ok = tryRegister(hid, sdp, withQos = false)
        }
        if (!ok) {
            starting = false
            clearTimeout()
            emit(
                HidConnectionState.Error,
                message = "Could not register HID — turn Bluetooth off/on, keep this screen open, Restart HID",
            )
            return
        }
        armTimeout("Registration timed out — keep Pc Controller open, then Restart HID")
    }

    @SuppressLint("MissingPermission")
    private fun tryRegister(
        hid: BluetoothHidDevice,
        sdp: BluetoothHidDeviceAppSdpSettings,
        withQos: Boolean,
    ): Boolean {
        return try {
            val result =
                if (withQos) {
                    hid.registerApp(sdp, null, qosOut, executor, callback)
                } else {
                    hid.registerApp(sdp, null, null, executor, callback)
                }
            usedQos = withQos && result
            result
        } catch (e: Exception) {
            Log.e(tag, "registerApp", e)
            false
        }
    }

    @SuppressLint("MissingPermission")
    private fun tryAutoConnectLastHost() {
        val hid = hidDevice ?: return
        val last = lastHostAddress() ?: return
        val device = bondedDevices().firstOrNull { it.address.equals(last, ignoreCase = true) } ?: return
        try {
            if (hid.getConnectionState(device) == BluetoothProfile.STATE_DISCONNECTED) {
                connectTo(device, fromAuto = true)
            }
        } catch (_: Exception) {
        }
    }

    private fun rememberHost(address: String?) {
        if (address.isNullOrBlank()) return
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(PREF_LAST_HOST, address)
            .apply()
    }

    private fun lastHostAddress(): String? {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(PREF_LAST_HOST, null)
            ?.takeIf { it.isNotBlank() }
    }

    @SuppressLint("MissingPermission")
    private fun enableInAppDiscoverable() {
        try {
            val a = adapter ?: return
            val method =
                BluetoothAdapter::class.java.getMethod(
                    "setScanMode",
                    Int::class.javaPrimitiveType,
                    Int::class.javaPrimitiveType,
                )
            method.invoke(a, BluetoothAdapter.SCAN_MODE_CONNECTABLE_DISCOVERABLE, 120)
        } catch (e: Exception) {
            Log.w(tag, "auto discoverable", e)
        }
    }

    private fun scheduleRecover() {
        clearRecover()
        recoverAttempts += 1
        if (recoverAttempts > 3) {
            emit(
                HidConnectionState.Error,
                hostName = null,
                hostAddress = null,
                message = "HID dropped — keep app open, then tap Restart HID",
            )
            return
        }
        emit(HidConnectionState.Registering, hostName = null, hostAddress = null, message = "HID paused — re-registering…")
        val attempt = recoverAttempts
        val run =
            Runnable {
                if (!wantRunning || registered || intentionalStop) return@Runnable
                starting = true
                registerApp()
            }
        recoverRunnable = run
        mainHandler.postDelayed(run, 400L * attempt)
    }

    private fun clearRecover() {
        recoverRunnable?.let { mainHandler.removeCallbacks(it) }
        recoverRunnable = null
    }

    private fun armTimeout(message: String) {
        clearTimeout()
        val timeout =
            Runnable {
                if (wantRunning && !registered) {
                    starting = false
                    emit(
                        HidConnectionState.Error,
                        message = message,
                        profileAvailable = hidDevice != null,
                    )
                }
            }
        profileTimeout = timeout
        mainHandler.postDelayed(timeout, 12_000L)
    }

    private fun clearTimeout() {
        profileTimeout?.let { mainHandler.removeCallbacks(it) }
        profileTimeout = null
    }

    @SuppressLint("MissingPermission")
    private fun isConnectedTo(device: BluetoothDevice?): Boolean {
        if (device == null) return false
        val hid = hidDevice ?: return false
        return try {
            hid.getConnectionState(device) == BluetoothProfile.STATE_CONNECTED
        } catch (_: Exception) {
            false
        }
    }

    @SuppressLint("MissingPermission")
    private fun diagLine(): String {
        val hid = hidDevice
        val reg = if (registered) "HID:on" else "HID:off"
        val qos = if (usedQos) "qos:on" else "qos:off"
        if (hid == null) return "$reg · proxy:off · $qos"
        return try {
            val parts =
                bondedDevices().take(3).map { d ->
                    val st =
                        when (hid.getConnectionState(d)) {
                            BluetoothProfile.STATE_CONNECTED -> "live"
                            BluetoothProfile.STATE_CONNECTING -> "…"
                            else -> "idle"
                        }
                    "${safeName(d)}=$st"
                }
            "$reg · $qos · " + if (parts.isEmpty()) "no paired hosts" else parts.joinToString(" · ")
        } catch (_: Exception) {
            "$reg · $qos"
        }
    }

    @SuppressLint("MissingPermission")
    private fun safeName(device: BluetoothDevice?): String {
        if (device == null) return "Host"
        return try {
            device.name?.takeIf { it.isNotBlank() } ?: device.address
        } catch (_: SecurityException) {
            device.address
        }
    }

    private fun emit(
        connection: HidConnectionState,
        hostName: String? = uiState.hostName,
        hostAddress: String? = uiState.hostAddress,
        message: String = uiState.message,
        profileAvailable: Boolean = uiState.profileAvailable,
        detail: String = uiState.detail,
    ) {
        uiState =
            HidUiState(
                connection = connection,
                hostName = hostName,
                hostAddress = hostAddress,
                message = message,
                profileAvailable = profileAvailable,
                detail = detail,
            )
        mainHandler.post { listener?.onHidState(uiState) }
    }

    private fun clampByte(v: Int): Byte = max(-127, min(127, v)).toByte()

    companion object {
        private const val PREFS = "pc_controller_hid"
        private const val PREF_LAST_HOST = "last_host_address"
    }
}
