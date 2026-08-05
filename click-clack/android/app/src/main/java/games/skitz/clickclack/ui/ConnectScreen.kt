package games.skitz.clickclack.ui

import android.bluetooth.BluetoothDevice
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier as UiMod
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.hid.HidConnectionState
import games.skitz.clickclack.hid.HidUiState
import games.skitz.clickclack.ui.theme.SkitzBlue
import games.skitz.clickclack.ui.theme.SkitzGreen
import games.skitz.clickclack.ui.theme.SkitzInk
import games.skitz.clickclack.ui.theme.SkitzMuted
import games.skitz.clickclack.ui.theme.SkitzRed
import games.skitz.clickclack.ui.theme.SkitzYellow

@Composable
fun ConnectScreen(
    state: HidUiState,
    bonded: List<BluetoothDevice>,
    onRequestPermissions: () -> Unit,
    onRequestBluetooth: () -> Unit,
    onRequestDiscoverable: () -> Unit,
    onConnectBonded: (BluetoothDevice) -> Unit,
    onRestart: () -> Unit,
) {
    Column(
        modifier =
            UiMod
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text("CLICK", fontSize = 42.sp, fontWeight = FontWeight.Black, color = SkitzRed, letterSpacing = (-1.5).sp)
            Text("CLACK", fontSize = 42.sp, fontWeight = FontWeight.Black, color = SkitzBlue, letterSpacing = (-1.5).sp)
        }
        Text(
            "Your phone is the mouse and keyboard.",
            color = SkitzInk,
            fontFamily = FontFamily.Monospace,
            fontSize = 14.sp,
        )

        StatusCard(state)

        StickerAction("Allow Bluetooth", SkitzRed, onRequestPermissions)
        if (state.connection == HidConnectionState.BluetoothOff) {
            StickerAction("Turn on Bluetooth", SkitzBlue, onRequestBluetooth)
        }
        StickerAction("Make phone discoverable", SkitzYellow, onRequestDiscoverable)
        StickerAction("Restart HID", Color(0xFFBDB5A6), onRestart)

        Text("PAIR ON YOUR PC", fontWeight = FontWeight.Black, fontSize = 18.sp, color = SkitzInk)
        StepRow("1", "PC Bluetooth settings → Add device")
        StepRow("2", "Phone → Make phone discoverable")
        StepRow("3", "Select Click Clack and pair")
        StepRow("4", "When Connected, use Pad / Keys")

        if (bonded.isNotEmpty()) {
            Text("KNOWN DEVICES", fontWeight = FontWeight.Black, color = SkitzInk)
            bonded.forEach { device ->
                val label =
                    try {
                        device.name ?: device.address
                    } catch (_: SecurityException) {
                        device.address
                    }
                StickerAction("Connect: $label", SkitzBlue, { onConnectBonded(device) })
            }
        }

        Text(
            "Needs Android 9+ with Bluetooth HID Device support. Some OEMs disable this profile.",
            color = SkitzMuted,
            fontSize = 12.sp,
            fontFamily = FontFamily.Monospace,
        )
        Spacer(modifier = UiMod.height(10.dp))
    }
}

@Composable
private fun StatusCard(state: HidUiState) {
    val accent =
        when (state.connection) {
            HidConnectionState.Connected -> SkitzGreen
            HidConnectionState.Unsupported, HidConnectionState.Error -> SkitzRed
            HidConnectionState.WaitingForHost, HidConnectionState.Registering -> SkitzBlue
            else -> SkitzYellow
        }
    StickerPanel(shadow = accent) {
        Text(
            state.connection.name.replace('_', ' ').uppercase(),
            fontWeight = FontWeight.Black,
            color = accent,
            fontSize = 18.sp,
        )
        if (!state.hostName.isNullOrBlank()) {
            Text(state.hostName, color = SkitzInk, fontFamily = FontFamily.Monospace, fontSize = 13.sp)
        }
        Text(state.message, color = SkitzMuted, fontSize = 13.sp, fontFamily = FontFamily.Monospace)
    }
}

@Composable
private fun StepRow(n: String, text: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = UiMod.fillMaxWidth()) {
        Text(n, fontWeight = FontWeight.Black, color = SkitzRed, fontSize = 16.sp)
        Text(text, color = SkitzInk, fontFamily = FontFamily.Monospace, fontSize = 13.sp)
    }
}
