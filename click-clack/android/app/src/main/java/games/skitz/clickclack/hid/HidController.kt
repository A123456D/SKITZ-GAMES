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
 * Samsung note: register only while the Activity is in the foreground — the system
 * auto-unregisters background apps. Also avoid restarting mid-registration.
 */
class HidController(private val context: Context) {
    private val tag = "ClickClackHid"
    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var profileTimeout: Runnable? = null

    private val bluetoothManager =
        context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val adapter: BluetoothAdapter? = bluetoothManager.adapter

    private var hidDevice: BluetoothHidDevice? = null
    private var hostDevice: BluetoothDevice? = null
    private var registered = false
    private var starting = false
    private var wantRunning = false

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
                if (wantRunning) {
                    emit(HidConnectionState.Error, message = "Bluetooth HID service lost — tap Restart HID")
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
                    emit(
                        HidConnectionState.WaitingForHost,
                        message = "Ready — make phone discoverable, then pair from the PC",
                    )
                    pluggedDevice?.let { connectTo(it) }
                } else if (wantRunning) {
                    emit(
                        HidConnectionState.Error,
                        message = "HID unregistered (app must stay open in foreground). Tap Restart HID.",
                    )
                } else {
                    emit(HidConnectionState.Idle, message = "Stopped")
                }
            }

            override fun onConnectionStateChanged(device: BluetoothDevice?, state: Int) {
                Log.i(tag, "onConnectionStateChanged ${device?.address} state=$state")
                when (state) {
                    BluetoothProfile.STATE_CONNECTED -> {
                        hostDevice = device
                        emit(
                            HidConnectionState.Connected,
                            hostName = safeName(device),
                            message = "Connected — use Pad and Keys",
                        )
                    }
                    BluetoothProfile.STATE_DISCONNECTED -> {
                        if (hostDevice?.address == device?.address) hostDevice = null
                        if (registered) {
                            emit(HidConnectionState.WaitingForHost, message = "Disconnected — waiting for PC")
                        }
                    }
                    BluetoothProfile.STATE_CONNECTING -> {
                        emit(HidConnectionState.WaitingForHost, message = "Connecting to PC…")
                    }
                }
            }
        }

    fun start() {
        wantRunning = true
        if (adapter == null) {
            emit(HidConnectionState.Unsupported, message = "No Bluetooth adapter", profileAvailable = false)
            return
        }
        if (!adapter.isEnabled) {
            emit(HidConnectionState.BluetoothOff, message = "Turn on Bluetooth")
            return
        }
        // Already good — don't tear down a live registration (Samsung races hard on restart).
        if (registered && hidDevice != null) {
            emit(
                HidConnectionState.WaitingForHost,
                message = "Ready — make phone discoverable, then pair from the PC",
            )
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
        starting = false
        clearTimeout()
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
        emit(HidConnectionState.Idle, message = "Stopped")
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

    @SuppressLint("MissingPermission")
    fun connectTo(device: BluetoothDevice) {
        val hid = hidDevice ?: return
        if (!registered) {
            emit(HidConnectionState.Error, message = "HID not registered yet — tap Restart HID")
            return
        }
        try {
            emit(HidConnectionState.WaitingForHost, message = "Connecting to ${safeName(device)}…")
            hid.connect(device)
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
        val host = hostDevice ?: return false
        val hid = hidDevice ?: return false
        if (!registered) return false
        val report =
            byteArrayOf(
                buttons.toByte(),
                clampByte(dx),
                clampByte(dy),
                clampByte(wheel),
            )
        return try {
            hid.sendReport(host, HidDescriptors.MOUSE_REPORT_ID, report)
        } catch (e: SecurityException) {
            Log.w(tag, "mouse report", e)
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
        val host = hostDevice ?: return false
        val hid = hidDevice ?: return false
        if (!registered) return false
        val keys = ByteArray(6)
        pressedKeys.take(6).forEachIndexed { i, b -> keys[i] = b }
        val report = byteArrayOf(modifierByte, 0) + keys
        return try {
            hid.sendReport(host, HidDescriptors.KEYBOARD_REPORT_ID, report)
        } catch (e: SecurityException) {
            Log.w(tag, "keyboard report", e)
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
            emit(
                HidConnectionState.WaitingForHost,
                message = "Ready — make phone discoverable, then pair from the PC",
            )
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
