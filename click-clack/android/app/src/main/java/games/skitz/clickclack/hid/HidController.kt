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
 */
class HidController(private val context: Context) {
    private val tag = "ClickClackHid"
    private val executor = Executors.newSingleThreadExecutor()

    private val bluetoothManager =
        context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val adapter: BluetoothAdapter? = bluetoothManager.adapter

    private var hidDevice: BluetoothHidDevice? = null
    private var hostDevice: BluetoothDevice? = null
    private var registered = false

    private val _state = MutableStateFlow(HidUiState())
    val state: StateFlow<HidUiState> = _state.asStateFlow()

    private var modifierByte: Byte = 0
    private val pressedKeys = LinkedHashSet<Byte>()

    private val profileListener =
        object : BluetoothProfile.ServiceListener {
            override fun onServiceConnected(profile: Int, proxy: BluetoothProfile?) {
                if (profile != BluetoothProfile.HID_DEVICE || proxy !is BluetoothHidDevice) return
                hidDevice = proxy
                Log.i(tag, "HID_DEVICE proxy connected")
                registerApp()
            }

            override fun onServiceDisconnected(profile: Int) {
                if (profile != BluetoothProfile.HID_DEVICE) return
                Log.w(tag, "HID_DEVICE proxy disconnected")
                hidDevice = null
                registered = false
                hostDevice = null
                emit(HidConnectionState.Error, message = "Bluetooth HID service lost")
            }
        }

    private val callback =
        object : BluetoothHidDevice.Callback() {
            override fun onAppStatusChanged(pluggedDevice: BluetoothDevice?, registered: Boolean) {
                this@HidController.registered = registered
                Log.i(tag, "onAppStatusChanged registered=$registered plugged=${pluggedDevice?.address}")
                if (registered) {
                    emit(HidConnectionState.WaitingForHost, message = "Ready — pair from your PC Bluetooth settings")
                    // Prefer already-bonded hosts when possible
                    pluggedDevice?.let { connectTo(it) }
                } else {
                    emit(HidConnectionState.Idle, message = "HID app unregistered")
                }
            }

            override fun onConnectionStateChanged(device: BluetoothDevice?, state: Int) {
                Log.i(tag, "onConnectionStateChanged ${device?.address} state=$state")
                when (state) {
                    BluetoothProfile.STATE_CONNECTED -> {
                        hostDevice = device
                        emit(
                            HidConnectionState.Connected,
                            hostName = device?.name ?: device?.address,
                            message = "Connected — use the touchpad and keyboard",
                        )
                    }
                    BluetoothProfile.STATE_DISCONNECTED -> {
                        if (hostDevice?.address == device?.address) hostDevice = null
                        if (registered) {
                            emit(HidConnectionState.WaitingForHost, message = "Disconnected — waiting for PC")
                        }
                    }
                    BluetoothProfile.STATE_CONNECTING -> {
                        emit(HidConnectionState.WaitingForHost, message = "Connecting…")
                    }
                }
            }
        }

    fun start() {
        if (adapter == null) {
            emit(HidConnectionState.Unsupported, message = "No Bluetooth adapter", profileAvailable = false)
            return
        }
        if (!adapter.isEnabled) {
            emit(HidConnectionState.BluetoothOff, message = "Turn on Bluetooth")
            return
        }
        emit(HidConnectionState.Registering, message = "Starting Bluetooth HID…")
        val ok = adapter.getProfileProxy(context, profileListener, BluetoothProfile.HID_DEVICE)
        if (!ok) {
            emit(
                HidConnectionState.Unsupported,
                message = "This phone does not expose Bluetooth HID Device (OEM may have disabled it)",
                profileAvailable = false,
            )
        }
    }

    fun stop() {
        try {
            hostDevice?.let { hidDevice?.disconnect(it) }
            if (registered) hidDevice?.unregisterApp()
        } catch (e: SecurityException) {
            Log.w(tag, "stop security", e)
        }
        adapter?.closeProfileProxy(BluetoothProfile.HID_DEVICE, hidDevice)
        hidDevice = null
        hostDevice = null
        registered = false
        emit(HidConnectionState.Idle, message = "Stopped")
    }

    fun makeDiscoverable(): Boolean = adapter != null

    @SuppressLint("MissingPermission")
    fun connectTo(device: BluetoothDevice) {
        val hid = hidDevice ?: return
        try {
            hid.connect(device)
        } catch (e: SecurityException) {
            Log.w(tag, "connect failed", e)
            emit(HidConnectionState.Error, message = "Bluetooth permission denied")
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
        val report = byteArrayOf(
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
        emit(HidConnectionState.Registering, message = "Registering as Click Clack…")
        val sdp =
            BluetoothHidDeviceAppSdpSettings(
                "Click Clack",
                "SKITZ Bluetooth mouse & keyboard",
                "SKITZ",
                BluetoothHidDevice.SUBCLASS1_COMBO,
                HidDescriptors.COMBO,
            )
        val qos =
            BluetoothHidDeviceAppQosSettings(
                BluetoothHidDeviceAppQosSettings.SERVICE_BEST_EFFORT,
                800,
                9,
                0,
                11250,
                BluetoothHidDeviceAppQosSettings.MAX,
            )
        val ok =
            try {
                hid.registerApp(sdp, null, qos, executor, callback)
            } catch (e: SecurityException) {
                Log.e(tag, "registerApp", e)
                false
            }
        if (!ok) {
            emit(
                HidConnectionState.Unsupported,
                message = "Could not register HID app — this phone may not support Bluetooth HID Device",
                profileAvailable = false,
            )
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
