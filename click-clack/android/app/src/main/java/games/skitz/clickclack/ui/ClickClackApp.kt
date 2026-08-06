package games.skitz.clickclack.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.Modifier as UiMod
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.hid.HidConnectionState
import games.skitz.clickclack.hid.HidService
import games.skitz.clickclack.hid.HidUiState
import games.skitz.clickclack.ui.theme.SkitzBlue
import games.skitz.clickclack.ui.theme.SkitzCream
import games.skitz.clickclack.ui.theme.SkitzGreen
import games.skitz.clickclack.ui.theme.SkitzInk
import games.skitz.clickclack.ui.theme.SkitzPaper
import games.skitz.clickclack.ui.theme.SkitzPaperDeep
import games.skitz.clickclack.ui.theme.SkitzRed
import games.skitz.clickclack.ui.theme.SkitzWashBlue
import games.skitz.clickclack.ui.theme.SkitzWashGreen
import games.skitz.clickclack.ui.theme.SkitzWashRed
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
    val controller = service?.controller
    val fallback =
        remember {
            MutableStateFlow(
                HidUiState(
                    connection = HidConnectionState.Registering,
                    message = "Starting Bluetooth service…",
                ),
            )
        }
    LaunchedEffect(bootMessage, controller == null) {
        if (controller == null) {
            fallback.value =
                HidUiState(
                    connection = HidConnectionState.Registering,
                    message = bootMessage.ifBlank { "Starting Bluetooth service…" },
                )
        }
    }
    val state by (controller?.state ?: fallback).collectAsState()
    var tab by rememberSaveable { mutableIntStateOf(0) }

    Box(
        modifier =
            UiMod
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color(0xFFFFFBF3),
                            SkitzPaper,
                            SkitzPaperDeep,
                        ),
                    ),
                ),
    ) {
        // soft brand washes
        Box(
            modifier =
                UiMod
                    .fillMaxSize()
                    .background(
                        Brush.radialGradient(
                            colors = listOf(Color(0x33E0312E), Color.Transparent),
                            center = androidx.compose.ui.geometry.Offset(80f, 120f),
                            radius = 520f,
                        ),
                    ),
        )
        Box(
            modifier =
                UiMod
                    .fillMaxSize()
                    .background(
                        Brush.radialGradient(
                            colors = listOf(Color(0x291E5BB8), Color.Transparent),
                            center = androidx.compose.ui.geometry.Offset(900f, 200f),
                            radius = 480f,
                        ),
                    ),
        )

        Scaffold(
            containerColor = Color.Transparent,
            bottomBar = {
                PremiumNavBar(selected = tab, onSelect = { tab = it })
            },
        ) { padding ->
            Box(modifier = UiMod.padding(padding).fillMaxSize()) {
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
}

@Composable
private fun PremiumNavBar(selected: Int, onSelect: (Int) -> Unit) {
    val items =
        listOf(
            Triple("CONNECT", SkitzRed, SkitzWashRed),
            Triple("PAD", SkitzBlue, SkitzWashBlue),
            Triple("KEYS", SkitzGreen, SkitzWashGreen),
        )
    Column(
        modifier =
            UiMod
                .fillMaxWidth()
                .background(SkitzCream)
                .border(width = 3.dp, color = SkitzInk)
                .navigationBarsPadding()
                .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Row(
            modifier = UiMod.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items.forEachIndexed { index, (label, accent, wash) ->
                val on = selected == index
                val interaction = remember { MutableInteractionSource() }
                Box(modifier = UiMod.weight(1f).height(54.dp)) {
                    if (on) {
                        Box(
                            modifier =
                                UiMod
                                    .matchParentSize()
                                    .offset(x = 3.dp, y = 3.dp)
                                    .background(accent, RoundedCornerShape(12.dp)),
                        )
                    }
                    Box(
                        modifier =
                            UiMod
                                .fillMaxSize()
                                .border(
                                    if (on) 3.dp else 2.dp,
                                    if (on) SkitzInk else SkitzInk.copy(alpha = 0.35f),
                                    RoundedCornerShape(12.dp),
                                )
                                .background(if (on) wash else SkitzCream, RoundedCornerShape(12.dp))
                                .clickable(interactionSource = interaction, indication = null) { onSelect(index) },
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(
                                modifier =
                                    UiMod
                                        .size(8.dp)
                                        .background(if (on) accent else Color.Transparent, CircleShape),
                            )
                            Spacer(modifier = UiMod.height(4.dp))
                            Text(
                                label,
                                fontWeight = FontWeight.Black,
                                fontSize = 13.sp,
                                color = if (on) accent else SkitzInk,
                                letterSpacing = 0.5.sp,
                            )
                        }
                    }
                }
            }
        }
    }
}
