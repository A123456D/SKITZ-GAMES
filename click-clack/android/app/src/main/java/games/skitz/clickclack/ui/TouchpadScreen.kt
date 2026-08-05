package games.skitz.clickclack.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
                .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("TOUCH PAD", fontWeight = FontWeight.Black, fontSize = 28.sp, color = SkitzInk)
        Text(
            if (connected) "Live on PC" else "Connect on the Connect tab first",
            color = if (connected) SkitzBlue else SkitzMuted,
            fontFamily = FontFamily.Monospace,
            fontSize = 13.sp,
        )

        Box(
            modifier =
                UiMod
                    .fillMaxWidth()
                    .weight(1f)
                    .border(2.dp, SkitzInk)
                    .background(Color(0xFFFFFEF9))
                    .pointerInput(connected) {
                        if (!connected) return@pointerInput
                        awaitEachGesture {
                            val first = awaitFirstDown(requireUnconsumed = false)
                            val startPositions = mutableMapOf<Long, Offset>()
                            startPositions[first.id.value] = first.position
                            var totalMove = 0f
                            var lastScrollY = 0f
                            var multi = false
                            var buttons = 0

                            while (true) {
                                val event = awaitPointerEvent()
                                val pressed = event.changes.filter { it.pressed }
                                if (pressed.isEmpty()) break

                                multi = pressed.size >= 2
                                if (multi) {
                                    // Two-finger scroll: average Y delta
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
                                    if (dx != 0 || dy != 0) {
                                        onMouse(dx, dy, buttons, 0)
                                    }
                                    p.consume()
                                }
                            }

                            // Tap classification
                            if (!multi && totalMove < 18f) {
                                onMouse(0, 0, 0x01, 0)
                                onMouse(0, 0, 0, 0)
                                hint = "Left click"
                            } else if (multi && totalMove < 28f && abs(lastScrollY) < 20f) {
                                onMouse(0, 0, 0x02, 0)
                                onMouse(0, 0, 0, 0)
                                hint = "Right click"
                            }
                        }
                    },
            contentAlignment = Alignment.Center,
        ) {
            Text(hint, color = SkitzMuted, fontFamily = FontFamily.Monospace)
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = UiMod.fillMaxWidth()) {
            PadButton("L", UiMod.weight(1f), enabled = connected) {
                onMouse(0, 0, 0x01, 0)
                onMouse(0, 0, 0, 0)
            }
            PadButton("M", UiMod.weight(0.7f), enabled = connected) {
                onMouse(0, 0, 0x04, 0)
                onMouse(0, 0, 0, 0)
            }
            PadButton("R", UiMod.weight(1f), enabled = connected) {
                onMouse(0, 0, 0x02, 0)
                onMouse(0, 0, 0, 0)
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
private fun PadButton(
    label: String,
    modifier: UiMod = UiMod,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    androidx.compose.material3.Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(52.dp),
        shape = androidx.compose.ui.graphics.RectangleShape,
        colors =
            androidx.compose.material3.ButtonDefaults.buttonColors(
                containerColor = Color(0xFFFFFEF9),
                contentColor = SkitzInk,
                disabledContainerColor = Color(0xFFEDE7DB),
            ),
        border = androidx.compose.foundation.BorderStroke(2.dp, SkitzInk),
    ) {
        Text(label, fontWeight = FontWeight.Black, color = if (label == "L") SkitzRed else SkitzInk)
    }
}
