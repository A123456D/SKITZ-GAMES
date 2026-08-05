package games.skitz.clickclack

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import games.skitz.clickclack.hid.HidService
import games.skitz.clickclack.ui.ClickClackApp
import games.skitz.clickclack.ui.theme.ClickClackTheme

class MainActivity : ComponentActivity() {
    private var hidService by mutableStateOf<HidService?>(null)
    private var bound by mutableStateOf(false)
    private var bootMessage by mutableStateOf("Starting Bluetooth service…")

    private val connection =
        object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
                val binder = service as HidService.LocalBinder
                hidService = binder.getService()
                bound = true
                bootMessage = ""
                hidService?.controller?.start()
            }

            override fun onServiceDisconnected(name: ComponentName?) {
                hidService = null
                bound = false
                bootMessage = "Bluetooth service disconnected — tap Restart HID"
            }
        }

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
            if (grants.values.all { it }) {
                bootMessage = "Starting Bluetooth service…"
                startHidService()
            } else {
                bootMessage = "Bluetooth permission required — tap Allow Bluetooth"
            }
        }

    private val discoverableLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { /* no-op */ }

    private val enableBtLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
            ensurePermissionsAndStart()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ClickClackTheme {
                ClickClackApp(
                    service = hidService,
                    bootMessage = bootMessage,
                    onRequestBluetooth = { requestEnableBluetooth() },
                    onRequestDiscoverable = { requestDiscoverable() },
                    onRequestPermissions = { ensurePermissionsAndStart() },
                    onRestart = {
                        bootMessage = "Restarting…"
                        hidService?.controller?.stop()
                        hidService?.controller?.start()
                        if (hidService == null) startHidService()
                    },
                )
            }
        }
        ensurePermissionsAndStart()
    }

    override fun onStart() {
        super.onStart()
        if (hasBluetoothPermissions()) {
            bindService(Intent(this, HidService::class.java), connection, Context.BIND_AUTO_CREATE)
        }
    }

    override fun onDestroy() {
        if (bound) {
            try {
                unbindService(connection)
            } catch (_: IllegalArgumentException) {
            }
            bound = false
        }
        super.onDestroy()
    }

    private fun ensurePermissionsAndStart() {
        val needed =
            requiredPermissions().filter {
                ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
            }
        if (needed.isNotEmpty()) {
            bootMessage = "Bluetooth permission required — tap Allow Bluetooth"
            permissionLauncher.launch(needed.toTypedArray())
            return
        }
        bootMessage = "Starting Bluetooth service…"
        startHidService()
    }

    private fun startHidService() {
        val intent = Intent(this, HidService::class.java)
        try {
            ContextCompat.startForegroundService(this, intent)
        } catch (e: Exception) {
            bootMessage = "Could not start Bluetooth service: ${e.message}"
            return
        }
        bindService(intent, connection, Context.BIND_AUTO_CREATE)
    }

    private fun requestEnableBluetooth() {
        enableBtLauncher.launch(Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE))
    }

    private fun requestDiscoverable() {
        val discover =
            Intent(BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE).apply {
                putExtra(BluetoothAdapter.EXTRA_DISCOVERABLE_DURATION, 300)
            }
        discoverableLauncher.launch(discover)
        hidService?.controller?.makeDiscoverable()
    }

    private fun hasBluetoothPermissions(): Boolean =
        requiredPermissions().all {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }

    private fun requiredPermissions(): List<String> {
        val list = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            list += Manifest.permission.BLUETOOTH_CONNECT
            list += Manifest.permission.BLUETOOTH_ADVERTISE
            list += Manifest.permission.BLUETOOTH_SCAN
        } else {
            list += Manifest.permission.ACCESS_FINE_LOCATION
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            list += Manifest.permission.POST_NOTIFICATIONS
        }
        return list
    }
}
