package games.skitz.clickclack.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.hid.HidConnectionState
import games.skitz.clickclack.hid.HidService
import games.skitz.clickclack.hid.HidUiState
import games.skitz.clickclack.ui.theme.TechBg
import games.skitz.clickclack.ui.theme.TechHairline
import games.skitz.clickclack.ui.theme.TechInk
import games.skitz.clickclack.ui.theme.TechMuted
import games.skitz.clickclack.ui.theme.TechSans
import games.skitz.clickclack.ui.theme.TechSurface
import kotlinx.coroutines.flow.MutableStateFlow

@Composable
fun ClickClackApp(
    service: HidService?,
    bootMessage: String = "",
    onRequestBluetooth: () -> Unit,
    onRequestDiscoverable: () -> Unit,
    onRequestPermissions: () -> Unit,
    onRestart: () -> Unit,
) {
    SkitzControllerApp(
        service = service,
        bootMessage = bootMessage,
        onRequestBluetooth = onRequestBluetooth,
        onRequestDiscoverable = onRequestDiscoverable,
        onRequestPermissions = onRequestPermissions,
        onRestart = onRestart,
    )
}

@Composable
fun SkitzControllerApp(
    service: HidService?,
    bootMessage: String = "",
    onRequestBluetooth: () -> Unit,
    onRequestDiscoverable: () -> Unit,
    onRequestPermissions: () -> Unit,
    onRestart: () -> Unit,
) {
    val controller = service?.controller
    val fallback =
        remember {
            MutableStateFlow(
                HidUiState(
                    connection = HidConnectionState.Registering,
                    message = "Starting Bluetooth…",
                ),
            )
        }
    LaunchedEffect(bootMessage, controller == null) {
        if (controller == null) {
            fallback.value =
                HidUiState(
                    connection = HidConnectionState.Registering,
                    message = bootMessage.ifBlank { "Starting Bluetooth…" },
                )
        }
    }
    val state by (controller?.state ?: fallback).collectAsState()
    var tab by rememberSaveable { mutableIntStateOf(0) }

    Scaffold(
        containerColor = TechBg,
        bottomBar = { PremiumNavBar(selected = tab, onSelect = { tab = it }) },
    ) { padding ->
        Box(
            modifier =
                Modifier
                    .padding(padding)
                    .fillMaxSize()
                    .background(TechBg),
        ) {
            when (tab) {
                0 ->
                    ConnectScreen(
                        state = state,
                        bonded = controller?.bondedDevices().orEmpty(),
                        onRequestPermissions = onRequestPermissions,
                        onRequestBluetooth = onRequestBluetooth,
                        onRequestDiscoverable = onRequestDiscoverable,
                        onConnectBonded = { controller?.connectTo(it) },
                        onRestart = onRestart,
                    )
                1 ->
                    TouchpadScreen(
                        connected = state.connection == HidConnectionState.Connected,
                        onMouse = { dx, dy, buttons, wheel ->
                            controller?.sendMouse(dx, dy, buttons, wheel)
                        },
                    )
                else ->
                    KeyboardScreen(
                        connected = state.connection == HidConnectionState.Connected,
                        onKeyDown = { controller?.keyDown(it) },
                        onKeyUp = { controller?.keyUp(it) },
                        onModifiers = { controller?.setModifiers(it) },
                        onTap = { usage, mods -> controller?.tapKey(usage, mods) },
                    )
            }
        }
    }
}

@Composable
private fun PremiumNavBar(selected: Int, onSelect: (Int) -> Unit) {
    val items = listOf("Connect", "Pad", "Keys")
    val buzz = rememberBuzz()
    Column(
        modifier =
            Modifier
                .fillMaxWidth()
                .background(TechSurface)
                .border(width = 1.dp, color = TechHairline)
                .navigationBarsPadding()
                .padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .height(44.dp)
                    .background(TechBg, RoundedCornerShape(12.dp))
                    .padding(3.dp),
            horizontalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            items.forEachIndexed { index, label ->
                val on = selected == index
                val interaction = remember { MutableInteractionSource() }
                Box(
                    modifier =
                        Modifier
                            .weight(1f)
                            .fillMaxSize()
                            .background(
                                if (on) TechSurface else TechBg,
                                RoundedCornerShape(10.dp),
                            )
                            .then(
                                if (on) {
                                    Modifier.border(1.dp, TechHairline, RoundedCornerShape(10.dp))
                                } else {
                                    Modifier
                                },
                            )
                            .clickable(interactionSource = interaction, indication = null) {
                                if (selected != index) {
                                    buzz.tick()
                                    onSelect(index)
                                }
                            },
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        label,
                        fontFamily = TechSans,
                        fontWeight = if (on) FontWeight.SemiBold else FontWeight.Medium,
                        fontSize = 13.sp,
                        color = if (on) TechInk else TechMuted,
                    )
                }
            }
        }
    }
}
