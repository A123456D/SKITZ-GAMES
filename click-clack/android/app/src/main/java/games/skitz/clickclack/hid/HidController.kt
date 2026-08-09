package games.skitz.clickclack.hid

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
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
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
    val message: String = "",
    val profileAvailable: Boolean = true,
    /** Extra diagnostics for the Connect screen. */
    val detail: String = "",
)

/**
 * Bluetooth HID peripheral (mouse + keyboard).
 *
 * Critical Samsung/Windows rules (from Kontroller / Android docs):
 * - Stay registered in the foreground while pairing (leaving the app drops HID SDP).
 * - Prefer in-app discoverable via [BluetoothAdapter.setScanMode] so we never pause.
 * - Reply to [BluetoothHidDevice.Callback.onGetReport] or Windows may sit dead.
 * - Use proven combo descriptor + outbound QoS; fall back to null QoS on OEMs that reject it.
 */
class HidController(private val context: Context) {
    private val tag = "ClickClackHid"
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

    private val _state = MutableStateFlow(HidUiState(message = "Tap Allow Bluetooth to begin"))
    val state: StateFlow<HidUiState> = _state.asStateFlow()

    private var modifierByte: Byte = 0
    private val pressedKeys = LinkedHashSet<Byte>()

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
                    // Host-initiated pair often leaves a plugged device that still needs connect().
                    if (pluggedDevice != null && !isConnectedTo(pluggedDevice)) {
                        connectTo(pluggedDevice, fromAuto = true)
                    } else if (hostDevice == null) {
                        tryAutoConnectBonded()
                    }
                } else if (intentionalStop) {
                    hostDevice = null
                    emit(HidConnectionState.Registering, hostName = null, message = "Restarting HID…")
                } else if (wantRunning) {
                    hostDevice = null
                    scheduleRecover()
                } else {
                    hostDevice = null
                    emit(HidConnectionState.Idle, hostName = null, message = "Stopped")
                }
            }

            override fun onConnectionStateChanged(device: BluetoothDevice?, state: Int) {
                Log.i(tag, "onConnectionStateChanged ${device?.address} state=$state")
                when (state) {
                    BluetoothProfile.STATE_CONNECTED -> {
                        hostDevice = device
                        recoverAttempts = 0
                        emit(
                            HidConnectionState.Connected,
                            hostName = safeName(device),
                            message = "HID live — use Pad and Keys (keep this app open)",
                            detail = diagLine(),
                        )
                    }
                    BluetoothProfile.STATE_DISCONNECTED -> {
                        if (hostDevice?.address == device?.address) hostDevice = null
                        if (registered && wantRunning) {
                            emit(
                                HidConnectionState.WaitingForHost,
                                hostName = null,
                                message = "HID dropped — tap Connect HID under Known devices",
                                detail = diagLine(),
                            )
                        }
                    }
                    BluetoothProfile.STATE_CONNECTING -> {
                        if (_state.value.connection != HidConnectionState.Connected) {
                            emit(
                                HidConnectionState.WaitingForHost,
                                hostName = safeName(device),
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
                Log.i(tag, "onGetReport type=$type id=$id size=$bufferSize")
                val hid = hidDevice ?: return
                val host = device ?: return
                try {
                    when (type) {
                        BluetoothHidDevice.REPORT_TYPE_FEATURE -> {
                            // Kontroller replies with resolution multipliers enabled.
                            val feature = byteArrayOf(0x05)
                            hid.replyReport(host, type, HidDescriptors.FEATURE_REPORT_ID.toByte(), feature)
                        }
                        BluetoothHidDevice.REPORT_TYPE_INPUT -> {
                            val empty =
                                when (id.toInt()) {
                                    HidDescriptors.MOUSE_REPORT_ID -> ByteArray(7)
                                    HidDescriptors.KEYBOARD_REPORT_ID -> ByteArray(3)
                                    else -> ByteArray(max(1, bufferSize).coerceAtMost(16))
                                }
                            hid.replyReport(host, type, id, empty)
                        }
                        else -> {
                            hid.reportError(host, BluetoothHidDevice.ERROR_RSP_INVALID_RPT_ID)
                        }
                    }
                } catch (e: Exception) {
                    Log.w(tag, "onGetReport reply failed", e)
                }
            }

            override fun onSetReport(
                device: BluetoothDevice?,
                type: Byte,
                id: Byte,
                data: ByteArray?,
            ) {
                Log.i(tag, "onSetReport type=$type id=$id bytes=${data?.size}")
            }

            override fun onSetProtocol(device: BluetoothDevice?, protocol: Byte) {
                Log.i(tag, "onSetProtocol $protocol")
            }
        }

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
        emit(HidConnectionState.Idle, hostName = null, message = "Stopped")
    }

    fun restart() {
        wantRunning = true
        intentionalStop = true
        starting = false
        recoverAttempts = 0
        clearTimeout()
        clearRecover()
        emit(HidConnectionState.Registering, hostName = null, message = "Restarting HID…")
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
            400L,
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

    /** Stay discoverable without leaving the app (keeps HID registration alive). */
    @SuppressLint("MissingPermission")
    fun makeDiscoverableInApp(): Boolean {
        val a = adapter ?: return false
        return try {
            // setScanMode(mode, durationSec) was removed from the public SDK; call via reflection.
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
                    _state.value.connection,
                    message = "Discoverable 5 min — on PC: Add device → Skitz Controller (stay in this app)",
                    detail = diagLine(),
                )
            }
            ok
        } catch (e: Exception) {
            Log.w(tag, "setScanMode failed", e)
            false
        }
    }

    fun makeDiscoverable(): Boolean = adapter != null

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
                    message = "HID live — use Pad and Keys (keep this app open)",
                    detail = diagLine(),
                )
                return
            }
            val current = hostDevice
            if (current != null && hid.getConnectionState(current) == BluetoothProfile.STATE_CONNECTED) {
                emit(
                    HidConnectionState.Connected,
                    hostName = safeName(current),
                    message = "HID live — use Pad and Keys (keep this app open)",
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
                "Ready — tap Make discoverable, then pair from the PC (stay in this app)"
            } else {
                "Ready — tap Connect HID under Known devices (phone Settings Connected is not enough)"
            }
        emit(
            HidConnectionState.WaitingForHost,
            hostName = null,
            message = tip,
            detail = diagLine(),
        )
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
                    message = "HID live — use Pad and Keys (keep this app open)",
                    detail = diagLine(),
                )
                return
            }
            if (state == BluetoothProfile.STATE_CONNECTING) {
                emit(
                    HidConnectionState.WaitingForHost,
                    hostName = safeName(device),
                    message = "Opening HID to ${safeName(device)}…",
                    detail = diagLine(),
                )
                return
            }
            if (hostDevice?.address == device.address) hostDevice = null
            emit(
                HidConnectionState.WaitingForHost,
                hostName = safeName(device),
                message = "Opening HID to ${safeName(device)}…",
                detail = diagLine(),
            )
            val ok = hid.connect(device)
            Log.i(tag, "connect(${device.address}) ok=$ok auto=$fromAuto")
            if (!ok) {
                emit(
                    HidConnectionState.WaitingForHost,
                    hostName = safeName(device),
                    message = "HID connect refused — forget Skitz Controller on PC + phone, pair again WHILE this app is open",
                    detail = diagLine(),
                )
            } else {
                mainHandler.postDelayed(
                    {
                        if (!isConnectedTo(device) && wantRunning && registered) {
                            emit(
                                HidConnectionState.WaitingForHost,
                                hostName = safeName(device),
                                message = "No HID after 4s — forget device both sides, reopen app, pair again, then Connect HID",
                                detail = diagLine(),
                            )
                        }
                    },
                    4_000L,
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

    fun sendMouse(dx: Int, dy: Int, buttons: Int = 0, wheel: Int = 0): Boolean {
        val host = hostDevice ?: return false
        val hid = hidDevice ?: return false
        if (!registered) return false
        // Hot path: don't call getConnectionState every move — that adds lag.
        val x = dx.coerceIn(-2047, 2047)
        val y = dy.coerceIn(-2047, 2047)
        val report =
            byteArrayOf(
                (buttons and 0x07).toByte(),
                (x and 0xff).toByte(),
                ((x shr 8) and 0xff).toByte(),
                (y and 0xff).toByte(),
                ((y shr 8) and 0xff).toByte(),
                clampByte(wheel),
                0,
            )
        return try {
            hid.sendReport(host, HidDescriptors.MOUSE_REPORT_ID, report)
        } catch (_: SecurityException) {
            false
        } catch (_: Exception) {
            false
        }
    }

    fun setModifiers(modifiers: Byte) {
        modifierByte = modifiers
        flushKeyboard()
    }

    fun keyDown(usage: Byte) {
        if (usage == HidKeys.NONE) return
        pressedKeys.add(usage)
        flushKeyboard()
    }

    fun keyUp(usage: Byte) {
        pressedKeys.remove(usage)
        flushKeyboard()
    }

    fun tapKey(usage: Byte, modifiers: Byte = 0) {
        val prev = modifierByte
        modifierByte = modifiers
        pressedKeys.clear()
        pressedKeys.add(usage)
        flushKeyboard()
        pressedKeys.clear()
        flushKeyboard()
        modifierByte = prev
        flushKeyboard()
    }

    private fun flushKeyboard(): Boolean {
        val host = hostDevice
        val hid = hidDevice
        if (host == null || hid == null || !registered) {
            onReportFailed("No HID host — Connect screen → Connect HID")
            return false
        }
        if (!isConnectedTo(host)) {
            onReportFailed("HID link dropped — Connect screen → Connect HID")
            return false
        }
        // Kontroller keyboard: modifier + reserved + single key
        val key = pressedKeys.firstOrNull() ?: 0
        val report = byteArrayOf(modifierByte, 0, key)
        return try {
            val ok = hid.sendReport(host, HidDescriptors.KEYBOARD_REPORT_ID, report)
            if (!ok) onReportFailed("Key report blocked — keep app open, tap Connect HID")
            ok
        } catch (e: SecurityException) {
            onReportFailed("Bluetooth permission denied")
            false
        }
    }

    private fun onReportFailed(message: String) {
        hostDevice = null
        if (!wantRunning || !registered) return
        emit(HidConnectionState.WaitingForHost, hostName = null, message = message, detail = diagLine())
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
        emit(HidConnectionState.Registering, message = "Registering as Skitz Controller…")
        val sdp =
            BluetoothHidDeviceAppSdpSettings(
                "Skitz Controller",
                "Mouse and Keyboard",
                "SKITZ",
                BluetoothHidDevice.SUBCLASS1_COMBO,
                HidDescriptors.COMBO,
            )

        // Kontroller uses null inQos + outQos. Samsung sometimes rejects any QoS — fall back.
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
                message = "Could not register HID — force-stop other BT remotes, keep Skitz Controller open, Restart HID",
            )
            return
        }
        armTimeout("Registration timed out — keep Skitz Controller open in front, then Restart HID")
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
        } catch (e: SecurityException) {
            Log.e(tag, "registerApp security", e)
            false
        } catch (e: Exception) {
            Log.e(tag, "registerApp", e)
            false
        }
    }

    @SuppressLint("MissingPermission")
    private fun tryAutoConnectBonded() {
        val hid = hidDevice ?: return
        for (device in bondedDevices()) {
            try {
                val st = hid.getConnectionState(device)
                if (st == BluetoothProfile.STATE_DISCONNECTED) {
                    Log.i(tag, "auto-connect ${device.address}")
                    connectTo(device, fromAuto = true)
                    return
                }
            } catch (_: Exception) {
            }
        }
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
                message = "HID dropped — keep Skitz Controller open in front, then tap Restart HID",
            )
            return
        }
        emit(
            HidConnectionState.Registering,
            hostName = null,
            message = "HID paused — re-registering…",
        )
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
            "$reg · $qos · " + if (parts.isEmpty()) "no paired PCs" else parts.joinToString(" · ")
        } catch (_: Exception) {
            "$reg · $qos"
        }
    }

    @SuppressLint("MissingPermission")
    private fun safeName(device: BluetoothDevice?): String {
        if (device == null) return "PC"
        return try {
            device.name?.takeIf { it.isNotBlank() } ?: device.address
        } catch (_: SecurityException) {
            device.address
        }
    }

    private fun emit(
        connection: HidConnectionState,
        hostName: String? = _state.value.hostName,
        message: String = _state.value.message,
        profileAvailable: Boolean = _state.value.profileAvailable,
        detail: String = _state.value.detail,
    ) {
        _state.value =
            HidUiState(
                connection = connection,
                hostName = hostName,
                message = message,
                profileAvailable = profileAvailable,
                detail = detail,
            )
    }

    private fun clampByte(v: Int): Byte = max(-127, min(127, v)).toByte()
}
