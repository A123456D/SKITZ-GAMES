package games.skitz.clickclack.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.BottomSheetScaffold
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.SheetValue
import androidx.compose.material3.Text
import androidx.compose.material3.rememberBottomSheetScaffoldState
import androidx.compose.material3.rememberStandardBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.ui.theme.TechAccent
import games.skitz.clickclack.ui.theme.TechBg
import games.skitz.clickclack.ui.theme.TechHairline
import games.skitz.clickclack.ui.theme.TechMuted
import games.skitz.clickclack.ui.theme.TechSans
import games.skitz.clickclack.ui.theme.TechSurface
import kotlinx.coroutines.launch

/**
 * Pad-first workspace used by the best Bluetooth remotes:
 * trackpad fills the screen; swipe the bottom handle up to type
 * while the pad stays visible above.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PadWorkspace(
    connected: Boolean,
    onMouse: (dx: Int, dy: Int, buttons: Int, wheel: Int) -> Unit,
    onKeyDown: (Byte) -> Unit,
    onKeyUp: (Byte) -> Unit,
    onModifiers: (Byte) -> Unit,
    onTap: (Byte, Byte) -> Unit,
) {
    val scope = rememberCoroutineScope()
    val buzz = rememberBuzz()
    val sheetState =
        rememberStandardBottomSheetState(
            initialValue = SheetValue.PartiallyExpanded,
            skipHiddenState = true,
        )
    val scaffoldState = rememberBottomSheetScaffoldState(bottomSheetState = sheetState)

    fun expandKeyboard() {
        scope.launch {
            buzz.tick()
            sheetState.expand()
        }
    }

    fun collapseKeyboard() {
        scope.launch {
            buzz.tick()
            sheetState.partialExpand()
        }
    }

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val keyboardHeight = maxHeight * 0.58f
        val peek = 44.dp

        BottomSheetScaffold(
            scaffoldState = scaffoldState,
            containerColor = TechBg,
            sheetContainerColor = TechSurface,
            sheetContentColor = TechMuted,
            sheetShadowElevation = 12.dp,
            sheetTonalElevation = 0.dp,
            sheetShape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
            sheetPeekHeight = peek,
            sheetDragHandle = {
                KeyboardSheetHandle(
                    expanded = sheetState.targetValue == SheetValue.Expanded,
                    onToggle = {
                        if (sheetState.currentValue == SheetValue.Expanded) {
                            collapseKeyboard()
                        } else {
                            expandKeyboard()
                        }
                    },
                )
            },
            sheetContent = {
                Box(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .height(keyboardHeight)
                            .background(TechBg)
                            .padding(top = 2.dp, bottom = 4.dp),
                ) {
                    KeyboardScreen(
                        connected = connected,
                        onKeyDown = onKeyDown,
                        onKeyUp = onKeyUp,
                        onModifiers = onModifiers,
                        onTap = onTap,
                    )
                }
            },
        ) { padding ->
            TouchpadScreen(
                connected = connected,
                onMouse = onMouse,
                modifier = Modifier.fillMaxSize().padding(padding),
            )
        }
    }
}

@Composable
private fun KeyboardSheetHandle(
    expanded: Boolean,
    onToggle: () -> Unit,
) {
    val interaction = remember { MutableInteractionSource() }
    Column(
        modifier =
            Modifier
                .fillMaxWidth()
                .clickable(interactionSource = interaction, indication = null, onClick = onToggle)
                .padding(top = 8.dp, bottom = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(
            modifier =
                Modifier
                    .width(40.dp)
                    .height(4.dp)
                    .background(TechHairline, RoundedCornerShape(2.dp)),
        )
        Text(
            if (expanded) "Swipe down to hide keyboard" else "Swipe up for keyboard",
            color = if (expanded) TechAccent else TechMuted,
            fontFamily = TechSans,
            fontSize = 11.sp,
        )
        Spacer(Modifier.size(2.dp))
    }
}
