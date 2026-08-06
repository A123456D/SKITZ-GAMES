package games.skitz.clickclack.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier as UiMod
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.ui.theme.SkitzBlue
import games.skitz.clickclack.ui.theme.SkitzCream
import games.skitz.clickclack.ui.theme.SkitzInk
import games.skitz.clickclack.ui.theme.SkitzMuted
import games.skitz.clickclack.ui.theme.SkitzRed
import games.skitz.clickclack.ui.theme.SkitzWashBlue
import games.skitz.clickclack.ui.theme.SkitzYellow
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.roundToInt

private val PadShape = RoundedCornerShape(22.dp)

@Composable
fun TouchpadScreen(
    connected: Boolean,
    onMouse: (dx: Int, dy: Int, buttons: Int, wheel: Int) -> Unit,
) {
    var hint by remember { mutableStateOf("Drag to move · tap to click") }
    var finger by remember { mutableStateOf<Offset?>(null) }
    val flash = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    val haptics = LocalHapticFeedback.current
    val flashColor by animateColorAsState(
        targetValue = if (flash.value > 0.05f) SkitzYellow.copy(alpha = flash.value * 0.45f) else Color.Transparent,
        label = "pad-flash",
    )

    fun pulse(label: String) {
        hint = label
        haptics.performHapticFeedback(HapticFeedbackType.LongPress)
        scope.launch {
            flash.snapTo(1f)
            flash.animateTo(0f, tween(280))
        }
    }

    Column(
        modifier =
            UiMod
                .fillMaxSize()
                .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(
            modifier = UiMod.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text("PAD", fontWeight = FontWeight.Black, fontSize = 36.sp, color = SkitzInk, letterSpacing = (-1.5).sp)
                Text(
                    hint,
                    color = SkitzBlue,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                )
            }
            LivePill(connected)
        }

        Box(modifier = UiMod.fillMaxWidth().weight(1f)) {
            Box(
                modifier =
                    UiMod
                        .matchParentSize()
                        .offset(x = 8.dp, y = 8.dp)
                        .background(SkitzBlue, PadShape),
            )
            Box(
                modifier =
                    UiMod
                        .fillMaxSize()
                        .border(3.dp, SkitzInk, PadShape)
                        .background(
                            Brush.verticalGradient(
                                listOf(Color(0xFFFFFFF8), SkitzCream, Color(0xFFE8F0FF)),
                            ),
                            PadShape,
                        )
                        .pointerInput(connected) {
                            if (!connected) return@pointerInput
                            awaitEachGesture {
                                val down = awaitFirstDown(requireUnconsumed = false)
                                finger = down.position
                                var totalMove = 0f
                                var lastScrollY = 0f
                                var multi = false
                                while (true) {
                                    val event = awaitPointerEvent()
                                    val pressed = event.changes.filter { it.pressed }
                                    if (pressed.isEmpty()) {
                                        finger = null
                                        break
                                    }
                                    multi = pressed.size >= 2
                                    finger = pressed.first().position
                                    if (multi) {
                                        val dy = pressed.map { it.positionChange().y }.average().toFloat()
                                        lastScrollY += dy
                                        while (abs(lastScrollY) >= 24f) {
                                            val wheel = if (lastScrollY > 0) -1 else 1
                                            onMouse(0, 0, 0, wheel)
                                            lastScrollY -= 24f * -wheel
                                            hint = if (wheel < 0) "SCROLL ↑" else "SCROLL ↓"
                                        }
                                        pressed.forEach { it.consume() }
                                    } else {
                                        val p = pressed.first()
                                        val delta = p.positionChange()
                                        totalMove += abs(delta.x) + abs(delta.y)
                                        val dx = (delta.x * 1.45f).roundToInt()
                                        val dy = (delta.y * 1.45f).roundToInt()
                                        if (dx != 0 || dy != 0) {
                                            onMouse(dx, dy, 0, 0)
                                            hint = "MOVE"
                                        }
                                        p.consume()
                                    }
                                }
                                if (!multi && totalMove < 18f) {
                                    onMouse(0, 0, 0x01, 0)
                                    onMouse(0, 0, 0, 0)
                                    pulse("LEFT CLICK")
                                } else if (multi && totalMove < 28f && abs(lastScrollY) < 20f) {
                                    onMouse(0, 0, 0x02, 0)
                                    onMouse(0, 0, 0, 0)
                                    pulse("RIGHT CLICK")
                                }
                            }
                        },
            ) {
                Canvas(modifier = UiMod.fillMaxSize().padding(22.dp)) {
                    val effect = PathEffect.dashPathEffect(floatArrayOf(16f, 12f), 0f)
                    drawLine(
                        color = SkitzWashBlue,
                        start = Offset(size.width * 0.12f, size.height * 0.32f),
                        end = Offset(size.width * 0.82f, size.height * 0.58f),
                        strokeWidth = 7f,
                        cap = StrokeCap.Round,
                        pathEffect = effect,
                    )
                }
                // click flash overlay
                Box(
                    modifier =
                        UiMod
                            .fillMaxSize()
                            .background(flashColor, PadShape),
                )
                // finger ghost
                finger?.let { pos ->
                    Canvas(modifier = UiMod.fillMaxSize()) {
                        drawCircle(
                            color = SkitzBlue.copy(alpha = 0.22f),
                            radius = 48f,
                            center = pos,
                        )
                        drawCircle(
                            color = SkitzBlue.copy(alpha = 0.55f),
                            radius = 18f,
                            center = pos,
                        )
                        drawCircle(
                            color = Color.White.copy(alpha = 0.85f),
                            radius = 7f,
                            center = pos,
                        )
                    }
                }
                if (finger == null) {
                    Box(modifier = UiMod.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            if (connected) "Touch here" else "Connect first",
                            color = SkitzMuted.copy(alpha = 0.7f),
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                        )
                    }
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = UiMod.fillMaxWidth()) {
            Keycap(
                label = "LEFT",
                accent = SkitzRed,
                enabled = connected,
                fontSize = 15.sp,
                modifier = UiMod.weight(1.15f).height(62.dp),
                onTap = {
                    onMouse(0, 0, 0x01, 0)
                    onMouse(0, 0, 0, 0)
                    pulse("LEFT CLICK")
                },
            )
            Keycap(
                label = "MID",
                accent = SkitzYellow,
                enabled = connected,
                fontSize = 15.sp,
                modifier = UiMod.weight(0.85f).height(62.dp),
                onTap = {
                    onMouse(0, 0, 0x04, 0)
                    onMouse(0, 0, 0, 0)
                    pulse("MIDDLE")
                },
            )
            Keycap(
                label = "RIGHT",
                accent = SkitzBlue,
                enabled = connected,
                fontSize = 15.sp,
                modifier = UiMod.weight(1.15f).height(62.dp),
                onTap = {
                    onMouse(0, 0, 0x02, 0)
                    onMouse(0, 0, 0, 0)
                    pulse("RIGHT CLICK")
                },
            )
        }
        Text(
            "Two-finger drag scrolls · two-finger tap right-clicks",
            color = SkitzMuted,
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace,
        )
        Spacer(modifier = UiMod.height(2.dp))
    }
}
