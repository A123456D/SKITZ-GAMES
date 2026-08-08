package games.skitz.clickclack.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.hid.HidConnectionState
import games.skitz.clickclack.hid.HidService
import games.skitz.clickclack.hid.HidUiState
import games.skitz.clickclack.ui.theme.TechAccent
import games.skitz.clickclack.ui.theme.TechBg
import games.skitz.clickclack.ui.theme.TechInk
import games.skitz.clickclack.ui.theme.TechMuted
import games.skitz.clickclack.ui.theme.TechSans
import games.skitz.clickclack.ui.theme.TechSurface
import games.skitz.clickclack.ui.theme.TechSurfaceRaised
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
                    message = "Starting Bluetoothâ€¦",
                ),
            )
        }
    LaunchedEffect(bootMessage, controller == null) {
        if (controller == null) {
            fallback.value =
                HidUiState(
                    connection = HidConnectionState.Registering,
                    message = bootMessage.ifBlank { "Starting Bluetoothâ€¦" },
                )
        }
    }
    val state by (controller?.state ?: fallback).collectAsState()
    var tab by rememberSaveable { mutableIntStateOf(0) }

    Scaffold(
        containerColor = TechBg,
        topBar = { AppHeader() },
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
    data class NavItem(val label: String, val icon: @Composable (Color) -> Unit)
    val items =
        listOf(
            NavItem("Connect") { c -> LinkIcon(c) },
            NavItem("Pad") { c -> PadIcon(c) },
            NavItem("Keys") { c -> KeysIcon(c) },
        )
    val buzz = rememberBuzz()
    Column(
        modifier =
            Modifier
                .fillMaxWidth()
                .background(TechSurface)
                .navigationBarsPadding()
                .padding(horizontal = 14.dp, vertical = 10.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().height(58.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            items.forEachIndexed { index, item ->
                val on = selected == index
                val interaction = remember { MutableInteractionSource() }
                val tint = if (on) TechInk else TechMuted
                Column(
                    modifier =
                        Modifier
                            .weight(1f)
                            .fillMaxSize()
                            .background(
                                if (on) TechSurfaceRaised else Color.Transparent,
                                RoundedCornerShape(14.dp),
                            )
                            .clickable(interactionSource = interaction, indication = null) {
                                if (selected != index) {
                                    buzz.tick()
                                    onSelect(index)
                                }
                            },
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    item.icon(tint)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        item.label,
                        fontFamily = TechSans,
                        fontWeight = if (on) FontWeight.SemiBold else FontWeight.Medium,
                        fontSize = 11.sp,
                        color = tint,
                    )
                }
            }
        }
    }
}
@Composable
private fun LinkIcon(color: Color) {
    Text("<>", color = color, fontSize = 13.sp, fontFamily = TechSans, fontWeight = FontWeight.Bold)
}

@Composable
private fun PadIcon(color: Color) {
    Text(":::", color = color, fontSize = 12.sp, fontFamily = TechSans, fontWeight = FontWeight.Bold)
}

@Composable
private fun KeysIcon(color: Color) {
    Text("ABC", color = color, fontSize = 10.sp, fontFamily = TechSans, fontWeight = FontWeight.Bold)
}
