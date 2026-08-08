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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.hid.HidConnectionState
import games.skitz.clickclack.hid.HidUiState
import games.skitz.clickclack.ui.theme.TechAccent
import games.skitz.clickclack.ui.theme.TechConnected
import games.skitz.clickclack.ui.theme.TechError
import games.skitz.clickclack.ui.theme.TechInk
import games.skitz.clickclack.ui.theme.TechMono
import games.skitz.clickclack.ui.theme.TechMuted
import games.skitz.clickclack.ui.theme.TechSans

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
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                "Skitz Controller",
                fontFamily = TechSans,
                fontWeight = FontWeight.SemiBold,
                fontSize = 28.sp,
                color = TechInk,
                letterSpacing = (-0.4).sp,
            )
            Text(
                "Phone as mouse and keyboard.",
                fontFamily = TechSans,
                fontWeight = FontWeight.Normal,
                fontSize = 14.sp,
                color = TechMuted,
            )
        }

        StatusCard(state)

        SectionLabel("Setup")
        ActionRow(
            label = "Allow Bluetooth",
            onClick = onRequestPermissions,
            emphasized = true,
            subtitle = "Required before pairing",
        )
        if (state.connection == HidConnectionState.BluetoothOff) {
            ActionRow(label = "Turn on Bluetooth", onClick = onRequestBluetooth)
        }
        ActionRow(
            label = "Make phone discoverable",
            onClick = onRequestDiscoverable,
            subtitle = "Keep this screen open",
        )
        ActionRow(label = "Restart HID", onClick = onRestart)

        SectionLabel("Pair on PC")
        Panel(contentPadding = 14.dp) {
            StepRow("1", "Stay in Skitz Controller")
            StepRow("2", "Tap Make phone discoverable")
            StepRow("3", "PC → Bluetooth → Add → Skitz Controller")
            StepRow("4", "Accept the pair prompt on the phone")
            StepRow("5", "Tap Connect under Known devices")
        }

        if (bonded.isNotEmpty()) {
            SectionLabel("Known devices")
            bonded.forEach { device ->
                val label =
                    try {
                        device.name ?: device.address
                    } catch (_: SecurityException) {
                        device.address
                    }
                val live =
                    state.connection == HidConnectionState.Connected &&
                        !state.hostName.isNullOrBlank() &&
                        (state.hostName == label || state.hostName.equals(device.address, ignoreCase = true))
                ActionRow(
                    label = if (live) "Linked · $label" else "Connect · $label",
                    onClick = { onConnectBonded(device) },
                    emphasized = !live,
                    subtitle = if (live) "HID active" else "Required after pairing",
                )
            }
        }

        Text(
            "Pair only while this screen is open. After updates, forget Skitz Controller on PC and phone, then re-pair.",
            color = TechMuted,
            fontSize = 12.sp,
            fontFamily = TechSans,
            lineHeight = 17.sp,
        )
        Spacer(modifier = Modifier.height(8.dp))
    }
}

@Composable
private fun StatusCard(state: HidUiState) {
    val accent =
        when (state.connection) {
            HidConnectionState.Connected -> TechConnected
            HidConnectionState.Unsupported, HidConnectionState.Error -> TechError
            HidConnectionState.WaitingForHost, HidConnectionState.Registering -> TechAccent
            else -> TechMuted
        }
    val title =
        when (state.connection) {
            HidConnectionState.Connected -> "Connected"
            HidConnectionState.WaitingForHost -> "Waiting for PC"
            HidConnectionState.Registering -> "Starting"
            HidConnectionState.BluetoothOff -> "Bluetooth off"
            HidConnectionState.Unsupported -> "Not supported"
            HidConnectionState.Error -> "Error"
            HidConnectionState.Idle -> "Ready"
        }
    Panel(contentPadding = 14.dp) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            StatusDot(accent)
            Text(
                title,
                fontFamily = TechSans,
                fontWeight = FontWeight.SemiBold,
                color = accent,
                fontSize = 16.sp,
            )
        }
        if (!state.hostName.isNullOrBlank()) {
            Text(state.hostName, color = TechInk, fontFamily = TechMono, fontSize = 13.sp)
        }
        if (state.message.isNotBlank()) {
            Text(state.message, color = TechMuted, fontSize = 13.sp, fontFamily = TechSans, lineHeight = 18.sp)
        }
        if (state.detail.isNotBlank()) {
            Text(state.detail, color = TechMuted, fontSize = 12.sp, fontFamily = TechSans, lineHeight = 16.sp)
        }
    }
}

@Composable
private fun StepRow(n: String, text: String) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(
            n,
            fontFamily = TechSans,
            fontWeight = FontWeight.SemiBold,
            color = TechMuted,
            fontSize = 13.sp,
            modifier = Modifier.padding(top = 1.dp),
        )
        Text(text, color = TechInk, fontFamily = TechSans, fontSize = 13.sp, lineHeight = 18.sp)
    }
}
