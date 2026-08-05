package games.skitz.clickclack.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier as UiMod
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.hid.HidService
import games.skitz.clickclack.ui.theme.SkitzBlue
import games.skitz.clickclack.ui.theme.SkitzGreen
import games.skitz.clickclack.ui.theme.SkitzInk
import games.skitz.clickclack.ui.theme.SkitzPaper
import games.skitz.clickclack.ui.theme.SkitzRed
import games.skitz.clickclack.ui.theme.SkitzYellow

@Composable
fun ClickClackApp(
    service: HidService?,
    onRequestBluetooth: () -> Unit,
    onRequestDiscoverable: () -> Unit,
    onRequestPermissions: () -> Unit,
) {
    val controller = service?.controller
    val state by (controller?.state?.collectAsState()
        ?: kotlinx.coroutines.flow.MutableStateFlow(
            games.skitz.clickclack.hid.HidUiState(
                message = "Starting Bluetooth…",
            ),
        ).collectAsState())

    var tab by rememberSaveable { mutableIntStateOf(0) }

    Box(
        modifier =
            UiMod
                .fillMaxSize()
                .background(
                    Brush.linearGradient(
                        listOf(
                            Color(0xFFF7F2E8),
                            SkitzPaper,
                            Color(0xFFE8E0D2),
                        ),
                    ),
                ),
    ) {
        Scaffold(
            containerColor = Color.Transparent,
            bottomBar = {
                NavigationBar(containerColor = Color(0xFFFFFEF9), contentColor = SkitzInk) {
                    NavigationBarItem(
                        selected = tab == 0,
                        onClick = { tab = 0 },
                        icon = { Text("BT", fontWeight = FontWeight.Black, fontSize = 12.sp) },
                        label = { Text("Connect", fontWeight = FontWeight.Bold) },
                        colors =
                            NavigationBarItemDefaults.colors(
                                selectedIconColor = SkitzRed,
                                selectedTextColor = SkitzRed,
                                indicatorColor = Color(0xFFFFE8E6),
                            ),
                    )
                    NavigationBarItem(
                        selected = tab == 1,
                        onClick = { tab = 1 },
                        icon = { Text("PAD", fontWeight = FontWeight.Black, fontSize = 11.sp) },
                        label = { Text("Pad", fontWeight = FontWeight.Bold) },
                        colors =
                            NavigationBarItemDefaults.colors(
                                selectedIconColor = SkitzBlue,
                                selectedTextColor = SkitzBlue,
                                indicatorColor = Color(0xFFE6EEFF),
                            ),
                    )
                    NavigationBarItem(
                        selected = tab == 2,
                        onClick = { tab = 2 },
                        icon = { Text("ABC", fontWeight = FontWeight.Black, fontSize = 11.sp) },
                        label = { Text("Keys", fontWeight = FontWeight.Bold) },
                        colors =
                            NavigationBarItemDefaults.colors(
                                selectedIconColor = SkitzGreen,
                                selectedTextColor = SkitzGreen,
                                indicatorColor = Color(0xFFE7F5E8),
                            ),
                    )
                }
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
                            onRestart = { controller?.start() },
                        )
                    1 ->
                        TouchpadScreen(
                            connected = state.connection == games.skitz.clickclack.hid.HidConnectionState.Connected,
                            onMouse = { dx, dy, buttons, wheel ->
                                controller?.sendMouse(dx, dy, buttons, wheel)
                            },
                        )
                    else ->
                        KeyboardScreen(
                            connected = state.connection == games.skitz.clickclack.hid.HidConnectionState.Connected,
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

