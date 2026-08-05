package games.skitz.clickclack.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier as UiMod
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.ui.theme.SkitzBlue
import games.skitz.clickclack.ui.theme.SkitzInk
import games.skitz.clickclack.ui.theme.SkitzMuted
import games.skitz.clickclack.ui.theme.SkitzRed
import games.skitz.clickclack.ui.theme.SkitzYellow
import kotlin.math.abs
import kotlin.math.roundToInt

@Composable
fun TouchpadScreen(
    connected: Boolean,
    onMouse: (dx: Int, dy: Int, buttons: Int, wheel: Int) -> Unit,
) {
    var hint by remember { mutableStateOf("Drag to move · tap to click") }

    Column(
        modifier =
            UiMod
                .fillMaxSize()
                .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text("PAD", fontWeight = FontWeight.Black, fontSize = 34.sp, color = SkitzInk, letterSpacing = (-1).sp)
        Text(
            if (connected) "LIVE ON PC" else "CONNECT FIRST",
            color = if (connected) SkitzBlue else SkitzMuted,
            fontFamily = FontFamily.Monospace,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
        )

        Box(modifier = UiMod.fillMaxWidth().weight(1f)) {
            Box(
                modifier =
                    UiMod
                        .matchParentSize()
                        .offset(x = 6.dp, y = 6.dp)
                        .background(SkitzBlue),
            )
            Box(
                modifier =
                    UiMod
                        .fillMaxSize()
                        .border(3.dp, SkitzInk)
                        .background(Color(0xFFFFFEF9))
                        .pointerInput(connected) {
                            if (!connected) return@pointerInput
                            awaitEachGesture {
                                val first = awaitFirstDown(requireUnconsumed = false)
                                var totalMove = 0f
                                var lastScrollY = 0f
                                var multi = false
                                while (true) {
                                    val event = awaitPointerEvent()
                                    val pressed = event.changes.filter { it.pressed }
                                    if (pressed.isEmpty()) break
                                    multi = pressed.size >= 2
                                    if (multi) {
                                        val dy = pressed.map { it.positionChange().y }.average().toFloat()
                                        lastScrollY += dy
                                        while (abs(lastScrollY) >= 24f) {
                                            val wheel = if (lastScrollY > 0) -1 else 1
                                            onMouse(0, 0, 0, wheel)
                                            lastScrollY -= 24f * -wheel
                                        }
                                        pressed.forEach { it.consume() }
                                    } else {
                                        val p = pressed.first()
                                        val delta = p.positionChange()
                                        totalMove += abs(delta.x) + abs(delta.y)
                                        val dx = (delta.x * 1.35f).roundToInt()
                                        val dy = (delta.y * 1.35f).roundToInt()
                                        if (dx != 0 || dy != 0) onMouse(dx, dy, 0, 0)
                                        p.consume()
                                    }
                                }
                                if (!multi && totalMove < 18f) {
                                    onMouse(0, 0, 0x01, 0)
                                    onMouse(0, 0, 0, 0)
                                    hint = "LEFT CLICK"
                                } else if (multi && totalMove < 28f && abs(lastScrollY) < 20f) {
                                    onMouse(0, 0, 0x02, 0)
                                    onMouse(0, 0, 0, 0)
                                    hint = "RIGHT CLICK"
                                }
                            }
                        },
                contentAlignment = Alignment.Center,
            ) {
                Text(hint, color = SkitzMuted, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = UiMod.fillMaxWidth()) {
            PadBtn("L", SkitzRed, UiMod.weight(1f), connected) {
                onMouse(0, 0, 0x01, 0); onMouse(0, 0, 0, 0)
            }
            PadBtn("M", SkitzYellow, UiMod.weight(0.75f), connected) {
                onMouse(0, 0, 0x04, 0); onMouse(0, 0, 0, 0)
            }
            PadBtn("R", SkitzBlue, UiMod.weight(1f), connected) {
                onMouse(0, 0, 0x02, 0); onMouse(0, 0, 0, 0)
            }
        }
        Text(
            "Two-finger drag scrolls · two-finger tap right-clicks",
            color = SkitzMuted,
            fontSize = 12.sp,
            fontFamily = FontFamily.Monospace,
        )
        Spacer(modifier = UiMod.height(4.dp))
    }
}

@Composable
private fun PadBtn(
    label: String,
    shadow: Color,
    modifier: UiMod = UiMod,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    val interaction = remember { MutableInteractionSource() }
    Box(modifier = modifier) {
        Box(
            modifier =
                UiMod
                    .matchParentSize()
                    .offset(x = 4.dp, y = 4.dp)
                    .background(shadow),
        )
        Box(
            modifier =
                UiMod
                    .fillMaxWidth()
                    .height(56.dp)
                    .border(3.dp, SkitzInk)
                    .background(if (enabled) Color(0xFFFFFEF9) else Color(0xFFEDE7DB))
                    .clickable(enabled = enabled, interactionSource = interaction, indication = null, onClick = onClick),
            contentAlignment = Alignment.Center,
        ) {
            Text(label, fontWeight = FontWeight.Black, fontSize = 20.sp, color = SkitzInk)
        }
    }
}
