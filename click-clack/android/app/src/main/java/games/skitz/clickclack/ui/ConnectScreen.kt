package games.skitz.clickclack.ui

import android.bluetooth.BluetoothDevice
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
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
import androidx.compose.ui.Modifier as UiMod

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
                .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            "CLICK CLACK",
            fontSize = 34.sp,
            fontWeight = FontWeight.Black,
            color = SkitzInk,
            letterSpacing = (-1).sp,
        )
        Text(
            "Bluetooth mouse & keyboard for your PC",
            color = SkitzMuted,
            fontFamily = FontFamily.Monospace,
            fontSize = 14.sp,
        )

        StatusCard(state)

        StickerButton("Allow Bluetooth", SkitzRed, onRequestPermissions)
        when (state.connection) {
            HidConnectionState.BluetoothOff ->
                StickerButton("Turn on Bluetooth", SkitzBlue, onRequestBluetooth)
            else -> Unit
        }
        StickerButton("Make phone discoverable", SkitzYellow, onRequestDiscoverable)
        OutlinedButton(
            onClick = onRestart,
            modifier = UiMod.fillMaxWidth(),
            shape = RectangleShape,
            colors = ButtonDefaults.outlinedButtonColors(contentColor = SkitzInk),
        ) {
            Text("Restart HID", fontWeight = FontWeight.Bold)
        }

        Text("Pair on your PC", fontWeight = FontWeight.Black, fontSize = 18.sp, color = SkitzInk)
        Step("1", "On the PC: open Bluetooth settings - Add device")
        Step("2", "On the phone: tap Make phone discoverable")
        Step("3", "Select Click Clack on the PC and pair")
        Step("4", "When status says Connected, use Pad / Keys tabs")

        if (bonded.isNotEmpty()) {
            Text("Known devices", fontWeight = FontWeight.Black, color = SkitzInk)
            bonded.forEach { device ->
                val label =
                    try {
                        device.name ?: device.address
                    } catch (_: SecurityException) {
                        device.address
                    }
                OutlinedButton(
                    onClick = { onConnectBonded(device) },
                    modifier = UiMod.fillMaxWidth(),
                    shape = RectangleShape,
                ) {
                    Text("Connect: $label")
                }
            }
        }

        Text(
            "Needs Android 9+ with Bluetooth HID Device support. Some OEMs disable this profile.",
            color = SkitzMuted,
            fontSize = 12.sp,
            fontFamily = FontFamily.Monospace,
        )
        Spacer(modifier = UiMod.height(8.dp))
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
    Column(
        modifier =
            UiMod
                .fillMaxWidth()
                .border(2.dp, SkitzInk)
                .padding(14.dp),
    ) {
        Text(
            state.connection.name.replace('_', ' '),
            fontWeight = FontWeight.Black,
            color = accent,
            fontSize = 16.sp,
        )
        if (!state.hostName.isNullOrBlank()) {
            Text(state.hostName, color = SkitzInk, fontFamily = FontFamily.Monospace)
        }
        Text(state.message, color = SkitzMuted, fontSize = 13.sp)
    }
}

@Composable
private fun Step(n: String, text: String) {
    Text("$n. $text", color = SkitzInk, fontFamily = FontFamily.Monospace, fontSize = 13.sp)
}

@Composable
fun StickerButton(label: String, shadow: Color, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = UiMod.fillMaxWidth(),
        shape = RectangleShape,
        colors =
            ButtonDefaults.buttonColors(
                containerColor = Color(0xFFFFFEF9),
                contentColor = SkitzInk,
            ),
        border = BorderStroke(2.dp, SkitzInk),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
    ) {
        Text(label, fontWeight = FontWeight.Bold)
    }
}

