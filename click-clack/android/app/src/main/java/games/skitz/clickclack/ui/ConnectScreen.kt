package games.skitz.clickclack.ui

import android.bluetooth.BluetoothDevice
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier as UiMod
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.hid.HidConnectionState
import games.skitz.clickclack.hid.HidUiState
import games.skitz.clickclack.ui.theme.SkitzBlue
import games.skitz.clickclack.ui.theme.SkitzCream
import games.skitz.clickclack.ui.theme.SkitzGreen
import games.skitz.clickclack.ui.theme.SkitzInk
import games.skitz.clickclack.ui.theme.SkitzMuted
import games.skitz.clickclack.ui.theme.SkitzRed
import games.skitz.clickclack.ui.theme.SkitzWashYellow
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
                .padding(horizontal = 20.dp, vertical = 18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(
            modifier = UiMod.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(0.dp)) {
                Text(
                    "CLICK",
                    fontSize = 46.sp,
                    fontWeight = FontWeight.Black,
                    color = SkitzRed,
                    letterSpacing = (-2).sp,
                    lineHeight = 44.sp,
                )
                Text(
                    "CLACK",
                    fontSize = 46.sp,
                    fontWeight = FontWeight.Black,
                    color = SkitzBlue,
                    letterSpacing = (-2).sp,
                    lineHeight = 44.sp,
                )
                Spacer(modifier = UiMod.height(8.dp))
                Text(
                    "Your phone is the mouse\nand keyboard.",
                    color = SkitzInk,
                    fontFamily = FontFamily.Monospace,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                )
            }
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = UiMod.padding(top = 6.dp),
            ) {
                MiniKey("A", SkitzGreen, -8f)
                MiniKey("W", SkitzBlue, 6f)
                MiniKey("⏎", SkitzRed, -3f)
            }
        }

        StatusCard(state)

        SectionLabel("SETUP")
        StickerAction("Allow Bluetooth", SkitzRed, onRequestPermissions, subtitle = "Required before pairing")
        if (state.connection == HidConnectionState.BluetoothOff) {
            StickerAction("Turn on Bluetooth", SkitzBlue, onRequestBluetooth)
        }
        StickerAction("Make phone discoverable", SkitzYellow, onRequestDiscoverable, subtitle = "Keep this screen open")
        StickerAction("Restart HID", Color(0xFFBDB5A6), onRestart)

        SectionLabel("PAIR ON YOUR PC")
        StickerPanel(shadow = SkitzWashYellow, contentPadding = 14.dp) {
            StepRow("1", "PC → Bluetooth → Add device")
            StepRow("2", "Phone → Make discoverable")
            StepRow("3", "Select ClickClack and pair")
            StepRow("4", "Status becomes Connected")
        }

        if (bonded.isNotEmpty()) {
            SectionLabel("KNOWN DEVICES")
            bonded.forEach { device ->
                val label =
                    try {
                        device.name ?: device.address
                    } catch (_: SecurityException) {
                        device.address
                    }
                val already =
                    state.connection == HidConnectionState.Connected &&
                        !state.hostName.isNullOrBlank() &&
                        (state.hostName == label || state.hostName.equals(device.address, ignoreCase = true))
                if (already) {
                    StickerAction("Connected · $label", SkitzGreen, { }, subtitle = "Already linked")
                } else {
                    StickerAction("Connect · $label", SkitzBlue, { onConnectBonded(device) })
                }
            }
        }

        Text(
            "Android 9+ · keep Click Clack open while pairing · close other BT remote apps first",
            color = SkitzMuted,
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace,
            lineHeight = 16.sp,
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
    val title =
        when (state.connection) {
            HidConnectionState.Connected -> "CONNECTED"
            HidConnectionState.WaitingForHost -> "WAITING FOR PC"
            HidConnectionState.Registering -> "STARTING"
            HidConnectionState.BluetoothOff -> "BLUETOOTH OFF"
            HidConnectionState.Unsupported -> "NOT SUPPORTED"
            HidConnectionState.Error -> "ERROR"
            HidConnectionState.Idle -> "READY"
        }
    StickerPanel(shadow = accent) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            StatusDot(accent)
            Text(title, fontWeight = FontWeight.Black, color = accent, fontSize = 18.sp, letterSpacing = 0.5.sp)
        }
        if (!state.hostName.isNullOrBlank()) {
            Text(state.hostName, color = SkitzInk, fontFamily = FontFamily.Monospace, fontSize = 13.sp)
        }
        if (state.message.isNotBlank()) {
            Text(state.message, color = SkitzMuted, fontSize = 13.sp, fontFamily = FontFamily.Monospace, lineHeight = 18.sp)
        }
    }
}

@Composable
private fun StepRow(n: String, text: String) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        modifier = UiMod.fillMaxWidth(),
    ) {
        Box(
            modifier =
                UiMod
                    .width(26.dp)
                    .height(26.dp)
                    .border(2.dp, SkitzInk)
                    .background(SkitzCream),
            contentAlignment = Alignment.Center,
        ) {
            Text(n, fontWeight = FontWeight.Black, color = SkitzRed, fontSize = 13.sp)
        }
        Text(text, color = SkitzInk, fontFamily = FontFamily.Monospace, fontSize = 13.sp)
    }
}
