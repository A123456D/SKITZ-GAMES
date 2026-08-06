package games.skitz.clickclack.hid

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothHidDevice
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
)

/**
 * Wraps [BluetoothHidDevice] as a combo mouse + keyboard peripheral.
 *
 * Samsung note: the system auto-unregisters HID when the app leaves the foreground.
 * We re-register quietly on resume and avoid redundant connect() calls (those trigger
 * Android's "Can't connect to …" toasts even when already connected).
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
    /** True while stop()/restart intentionally tears down registration. */
    private var intentionalStop = false
    private var recoverAttempts = 0

    private val _state = MutableStateFlow(HidUiState(message = "Tap Allow Bluetooth to begin"))
    val state: StateFlow<HidUiState> = _state.asStateFlow()

    private var modifierByte: Byte = 0
    private val pressedKeys = LinkedHashSet<Byte>()

    private val profileListener =
        object : BluetoothProfile.ServiceListener {
            override fun onServiceConnected(profile: Int, proxy: BluetoothProfile?) {
                if (profile != BluetoothProfile.HID_DEVICE || proxy !is BluetoothHidDevice) return
                hidDevice = proxy
                Log.i(tag, "HID_DEVICE proxy connected")
                if (wantRunning) {
                    registerApp()
                }
            }

            override fun onServiceDisconnected(profile: Int) {
                if (profile != BluetoothProfile.HID_DEVICE) return
                Log.w(tag, "HID_DEVICE proxy disconnected")
                hidDevice = null
                registered = false
                hostDevice = null
                starting = false
                if (wantRunning && !intentionalStop) {
                    emit(HidConnectionState.Error, hostName = null, message = "Bluetooth HID service lost — tap Restart HID")
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
                    val connectedNow = isConnectedTo(pluggedDevice) || isConnectedTo(hostDevice)
                    if (connectedNow) {
                        val host = hostDevice ?: pluggedDevice
                        hostDevice = host
                        emit(
                            HidConnectionState.Connected,
                            hostName = safeName(host),
                            message = "Connected — use Pad and Keys",
                        )
                    } else {
                        emit(
                            HidConnectionState.WaitingForHost,
                            message = "Ready — make phone discoverable, then pair from the PC",
                        )
                        // Only auto-connect a plugged host if we are not already linked.
                        if (pluggedDevice != null && hostDevice == null) {
                            connectTo(pluggedDevice, fromAuto = true)
                        }
                    }
                } else if (intentionalStop) {
                    // Expected during Restart HID / stop — don't flash ERROR.
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
                            message = "Connected — use Pad and Keys",
                        )
                    }
                    BluetoothProfile.STATE_DISCONNECTED -> {
                        if (hostDevice?.address == device?.address) hostDevice = null
                        if (registered && wantRunning) {
                            emit(
                                HidConnectionState.WaitingForHost,
                                hostName = null,
                                message = "Disconnected — waiting for PC",
                            )
                        }
                    }
                    BluetoothProfile.STATE_CONNECTING -> {
                        // Don't overwrite Connected if we somehow get a stray connecting event.
                        if (_state.value.connection != HidConnectionState.Connected) {
                            emit(
                                HidConnectionState.WaitingForHost,
                                hostName = safeName(device),
                                message = "Connecting to ${safeName(device)}…",
                            )
                        }
                    }
                }
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
        // Already registered — verify the real HID link (Bluetooth paired ≠ mouse working).
        if (registered && hidDevice != null) {
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
        } catch (e: SecurityException) {
            Log.w(tag, "stop security", e)
        } catch (e: Exception) {
            Log.w(tag, "stop", e)
        }
        registered = false
        hostDevice = null
        // Keep profile proxy for faster resume; only close on release()
        emit(HidConnectionState.Idle, hostName = null, message = "Stopped")
    }

    /** Clean stop → start used by Restart HID (avoids ERROR flash mid-restart). */
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
        // Small delay so Samsung finishes unregister before we register again.
        mainHandler.postDelayed(
            {
                intentionalStop = false
                start()
            },
            350L,
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

    fun makeDiscoverable(): Boolean = adapter != null

    /**
     * Re-check HID profile connection against the Bluetooth stack.
     * Phone Bluetooth can show the laptop as "Connected" while HID mouse/keyboard is dead.
     */
    @SuppressLint("MissingPermission")
    fun refreshHostLink() {
        val hid = hidDevice
        if (!registered || hid == null) {
            if (wantRunning && !starting && !intentionalStop) {
                // Fall through to normal start path when called from UI.
            }
            return
        }
        try {
            // Prefer an already-known host if the profile says connected.
            val current = hostDevice
            if (current != null && hid.getConnectionState(current) == BluetoothProfile.STATE_CONNECTED) {
                emit(
                    HidConnectionState.Connected,
                    hostName = safeName(current),
                    message = "Connected — use Pad and Keys",
                )
                return
            }
            // Scan bonded PCs for a live HID host session.
            for (device in bondedDevices()) {
                if (hid.getConnectionState(device) == BluetoothProfile.STATE_CONNECTED) {
                    hostDevice = device
                    emit(
                        HidConnectionState.Connected,
                        hostName = safeName(device),
                        message = "Connected — use Pad and Keys",
                    )
                    return
                }
            }
        } catch (e: Exception) {
            Log.w(tag, "refreshHostLink", e)
        }
        hostDevice = null
        val tip =
            if (bondedDevices().isEmpty()) {
                "Ready — make phone discoverable, then pair from the PC"
            } else {
                "Paired in Bluetooth ≠ HID. Tap Connect HID under Known devices (keep app open)"
            }
        emit(
            HidConnectionState.WaitingForHost,
            hostName = null,
            message = tip,
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
            // Only treat as linked when the HID profile says so — not merely bonded / remembered.
            if (state == BluetoothProfile.STATE_CONNECTED) {
                hostDevice = device
                emit(
                    HidConnectionState.Connected,
                    hostName = safeName(device),
                    message = "Connected — use Pad and Keys",
                )
                return
            }
            if (state == BluetoothProfile.STATE_CONNECTING) {
                emit(
                    HidConnectionState.WaitingForHost,
                    hostName = safeName(device),
                    message = "Connecting to ${safeName(device)}…",
                )
                return
            }
            // Drop stale host so we don't falsely claim Connected.
            if (hostDevice?.address == device.address) hostDevice = null
            emit(
                HidConnectionState.WaitingForHost,
                hostName = safeName(device),
                message = "Connecting HID to ${safeName(device)}…",
            )
            val ok = hid.connect(device)
            if (!ok) {
                Log.w(tag, "connect() returned false for ${device.address} auto=$fromAuto")
                emit(
                    HidConnectionState.WaitingForHost,
                    hostName = safeName(device),
                    message = "HID connect failed — on PC: forget ClickClack, then pair again with this screen open",
                )
            } else {
                // connect() is async; verify shortly in case STATE_CONNECTED never arrives.
                mainHandler.postDelayed(
                    {
                        if (!isConnectedTo(device) && wantRunning && registered) {
                            emit(
                                HidConnectionState.WaitingForHost,
                                hostName = safeName(device),
                                message = "Still no HID link — forget device on PC & phone, pair again with app open",
                            )
                        }
                    },
                    4_000L,
                )
            }
        } catch (e: SecurityException) {
            Log.w(tag, "connect failed", e)
            emit(HidConnectionState.Error, message = "Bluetooth permission denied")
        } catch (e: Exception) {
            Log.w(tag, "connect failed", e)
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
        val host = hostDevice
        val hid = hidDevice
        if (host == null || hid == null || !registered) {
            onReportFailed("No HID host — go to Connect and tap Connect under Known devices")
            return false
        }
        if (!isConnectedTo(host)) {
            onReportFailed("HID link dropped — tap Connect under Known devices")
            return false
        }
        val report =
            byteArrayOf(
                buttons.toByte(),
                clampByte(dx),
                clampByte(dy),
                clampByte(wheel),
            )
        return try {
            val ok = hid.sendReport(host, HidDescriptors.MOUSE_REPORT_ID, report)
            if (!ok) onReportFailed("Mouse report blocked — reopen app and tap Connect")
            ok
        } catch (e: SecurityException) {
            Log.w(tag, "mouse report", e)
            onReportFailed("Bluetooth permission denied")
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
            onReportFailed("No HID host — go to Connect and tap Connect under Known devices")
            return false
        }
        if (!isConnectedTo(host)) {
            onReportFailed("HID link dropped — tap Connect under Known devices")
            return false
        }
        val keys = ByteArray(6)
        pressedKeys.take(6).forEachIndexed { i, b -> keys[i] = b }
        val report = byteArrayOf(modifierByte, 0) + keys
        return try {
            val ok = hid.sendReport(host, HidDescriptors.KEYBOARD_REPORT_ID, report)
            if (!ok) onReportFailed("Key report blocked — reopen app and tap Connect")
            ok
        } catch (e: SecurityException) {
            Log.w(tag, "keyboard report", e)
            onReportFailed("Bluetooth permission denied")
            false
        }
    }

    private fun onReportFailed(message: String) {
        hostDevice = null
        if (!wantRunning || !registered) return
        if (_state.value.connection == HidConnectionState.Connected ||
            _state.value.connection == HidConnectionState.WaitingForHost
        ) {
            emit(HidConnectionState.WaitingForHost, hostName = null, message = message)
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
        emit(HidConnectionState.Registering, message = "Registering as Click Clack…")
        // Keep SDP strings short/ASCII — some OEMs reject long names.
        val sdp =
            BluetoothHidDeviceAppSdpSettings(
                "ClickClack",
                "Mouse and Keyboard",
                "SKITZ",
                BluetoothHidDevice.SUBCLASS1_COMBO,
                HidDescriptors.COMBO,
            )
        // null QoS = system defaults. Custom QoS fails registerApp on some Samsungs.
        val ok =
            try {
                hid.registerApp(sdp, null, null, executor, callback)
            } catch (e: SecurityException) {
                Log.e(tag, "registerApp security", e)
                false
            } catch (e: Exception) {
                Log.e(tag, "registerApp", e)
                false
            }
        if (!ok) {
            starting = false
            clearTimeout()
            emit(
                HidConnectionState.Error,
                message = "Could not register HID — close other BT remote apps, keep Click Clack open, tap Restart HID",
                profileAvailable = true,
            )
            return
        }
        armTimeout("Registration timed out — keep Click Clack open in the foreground, then Restart HID")
    }

    /** Samsung often unregisters briefly (notification shade, discoverable dialog). Re-register quietly. */
    private fun scheduleRecover() {
        clearRecover()
        recoverAttempts += 1
        if (recoverAttempts > 3) {
            emit(
                HidConnectionState.Error,
                hostName = null,
                message = "HID dropped — keep Click Clack open in front, then tap Restart HID",
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
                Log.i(tag, "auto-recover register attempt=$attempt")
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
            hostDevice?.address == device.address &&
                _state.value.connection == HidConnectionState.Connected
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
    ) {
        _state.value =
            HidUiState(
                connection = connection,
                hostName = hostName,
                message = message,
                profileAvailable = profileAvailable,
            )
    }

    private fun clampByte(v: Int): Byte = max(-127, min(127, v)).toByte()
}
