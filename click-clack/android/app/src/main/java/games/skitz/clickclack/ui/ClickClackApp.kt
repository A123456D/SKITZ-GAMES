package games.skitz.clickclack.ui

import android.app.Activity
import android.content.pm.ActivityInfo
import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.hid.HidConnectionState
import games.skitz.clickclack.hid.HidService
import games.skitz.clickclack.hid.HidUiState
import games.skitz.clickclack.ui.theme.TechAccent
import games.skitz.clickclack.ui.theme.TechBg
import games.skitz.clickclack.ui.theme.TechHairline
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
                    message = "Starting Bluetooth…",
                ),
            )
        }
    androidx.compose.runtime.LaunchedEffect(bootMessage, controller == null) {
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

    // Keys tab is landscape-only (matches approved design).
    val activity = LocalContext.current as? Activity
    DisposableEffect(tab) {
        if (tab == 2) {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        } else {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
        onDispose {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    }

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
                    PadWorkspace(
                        connected = state.connection == HidConnectionState.Connected,
                        onMouse = { dx, dy, buttons, wheel ->
                            controller?.sendMouse(dx, dy, buttons, wheel)
                        },
                        onKeyDown = { controller?.keyDown(it) },
                        onKeyUp = { controller?.keyUp(it) },
                        onModifiers = { controller?.setModifiers(it) },
                        onTap = { usage, mods -> controller?.tapKey(usage, mods) },
                    )
                else ->
                    KeyboardScreen(
                        connected = state.connection == HidConnectionState.Connected,
                        forceLandscape = true,
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
                .background(TechSurface.copy(alpha = 0.92f))
                .navigationBarsPadding()
                .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().height(58.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items.forEachIndexed { index, item ->
                val on = selected == index
                val interaction = remember { MutableInteractionSource() }
                val tint = if (on) TechAccent else TechMuted
                val labelTint = if (on) TechInk else TechMuted
                Column(
                    modifier =
                        Modifier
                            .weight(1f)
                            .fillMaxSize()
                            .background(
                                if (on) TechSurfaceRaised else Color.Transparent,
                                RoundedCornerShape(14.dp),
                            )
                            .then(
                                if (on) {
                                    Modifier.border(1.dp, TechHairline, RoundedCornerShape(14.dp))
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
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    item.icon(tint)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        item.label.uppercase(),
                        fontFamily = TechSans,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 10.sp,
                        letterSpacing = 0.6.sp,
                        color = labelTint,
                    )
                }
            }
        }
    }
}

@Composable
private fun LinkIcon(color: Color) {
    Canvas(modifier = Modifier.size(20.dp)) {
        val stroke = Stroke(width = 1.8.dp.toPx(), cap = StrokeCap.Round)
        drawCircle(color, radius = size.minDimension * 0.18f, center = Offset(size.width * 0.33f, size.height * 0.5f), style = stroke)
        drawCircle(color, radius = size.minDimension * 0.18f, center = Offset(size.width * 0.67f, size.height * 0.5f), style = stroke)
        drawLine(
            color,
            start = Offset(size.width * 0.42f, size.height * 0.5f),
            end = Offset(size.width * 0.58f, size.height * 0.5f),
            strokeWidth = 1.8.dp.toPx(),
            cap = StrokeCap.Round,
        )
    }
}

@Composable
private fun PadIcon(color: Color) {
    Canvas(modifier = Modifier.size(20.dp)) {
        val gap = size.width * 0.08f
        val cell = (size.width - gap * 2) / 3f
        val r = CornerRadius(cell * 0.22f, cell * 0.22f)
        for (row in 0 until 3) {
            for (col in 0 until 3) {
                drawRoundRect(
                    color = color,
                    topLeft = Offset(col * (cell + gap), row * (cell + gap)),
                    size = Size(cell, cell),
                    cornerRadius = r,
                    style = Stroke(width = 1.6.dp.toPx()),
                )
            }
        }
    }
}

@Composable
private fun KeysIcon(color: Color) {
    Canvas(modifier = Modifier.size(20.dp)) {
        val stroke = Stroke(width = 1.8.dp.toPx(), cap = StrokeCap.Round)
        drawRoundRect(
            color = color,
            topLeft = Offset(size.width * 0.12f, size.height * 0.22f),
            size = Size(size.width * 0.76f, size.height * 0.48f),
            cornerRadius = CornerRadius(size.width * 0.18f, size.width * 0.18f),
            style = stroke,
        )
        drawLine(
            color,
            start = Offset(size.width * 0.28f, size.height * 0.46f),
            end = Offset(size.width * 0.72f, size.height * 0.46f),
            strokeWidth = 1.8.dp.toPx(),
            cap = StrokeCap.Round,
        )
        drawLine(
            color,
            start = Offset(size.width * 0.36f, size.height * 0.62f),
            end = Offset(size.width * 0.64f, size.height * 0.62f),
            strokeWidth = 1.8.dp.toPx(),
            cap = StrokeCap.Round,
        )
    }
}
