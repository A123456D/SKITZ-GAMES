package games.skitz.clickclack.ui

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
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier as UiMod
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.ui.theme.SkitzBlue
import games.skitz.clickclack.ui.theme.SkitzInk
import games.skitz.clickclack.ui.theme.SkitzMono
import games.skitz.clickclack.ui.theme.SkitzMuted
import games.skitz.clickclack.ui.theme.SkitzRed
import games.skitz.clickclack.ui.theme.SkitzYellow
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.roundToInt

@Composable
fun TouchpadScreen(
    connected: Boolean,
    onMouse: (dx: Int, dy: Int, buttons: Int, wheel: Int) -> Unit,
) {
    var hint by remember { mutableStateOf("Drag · tap · double-tap+hold to drag windows") }
    var finger by remember { mutableStateOf<Offset?>(null) }
    var heldButtons by remember { mutableIntStateOf(0) }
    var awaitSecondTap by remember { mutableStateOf(false) }
    var lastTapUp by remember { mutableLongStateOf(0L) }
    var singleClickJob by remember { mutableStateOf<Job?>(null) }
    val flash = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    val buzz = rememberBuzz()

    fun pulse(label: String, heavy: Boolean = false) {
        hint = label
        if (heavy) buzz.thump() else buzz.click()
        scope.launch {
            flash.snapTo(1f)
            flash.animateTo(0f, tween(260))
        }
    }

    fun clickLeft() {
        onMouse(0, 0, 0x01, 0)
        onMouse(0, 0, heldButtons, 0)
        pulse("LEFT CLICK", heavy = true)
    }

    fun clickRight() {
        onMouse(0, 0, 0x02, 0)
        onMouse(0, 0, heldButtons, 0)
        pulse("RIGHT CLICK", heavy = true)
    }

    Column(
        modifier =
            UiMod
                .fillMaxSize()
                .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        PanelHead(
            title = "Mouse pad",
            hint = hint,
            trailing = { LivePill(connected) },
        )

        // Sticker panel — hard shadow like the original web desk
        Box(modifier = UiMod.fillMaxWidth().weight(1f)) {
            Box(
                modifier =
                    UiMod
                        .matchParentSize()
                        .offset(x = 6.dp, y = 6.dp)
                        .background(SkitzInk.copy(alpha = 0.18f)),
            )
            Box(
                modifier =
                    UiMod
                        .fillMaxSize()
                        .border(2.5.dp, SkitzInk)
                        .background(Color(0xFFFFFEF9))
                        .pointerInput(connected, heldButtons) {
                            if (!connected) return@pointerInput
                            awaitEachGesture {
                                val down = awaitFirstDown(requireUnconsumed = false)
                                val downTime = System.currentTimeMillis()
                                finger = down.position
                                var totalMove = 0f
                                var lastScrollY = 0f
                                var multi = false
                                val isDoubleHold =
                                    awaitSecondTap && (downTime - lastTapUp) < 450L
                                if (isDoubleHold) {
                                    awaitSecondTap = false
                                    singleClickJob?.cancel()
                                }
                                var dragArmed = isDoubleHold
                                var dragging = false
                                val holdStart = downTime

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
                                        dragArmed = false
                                        dragging = false
                                        val dy = pressed.map { it.positionChange().y }.average().toFloat()
                                        lastScrollY += dy
                                        while (abs(lastScrollY) >= 24f) {
                                            val wheel = if (lastScrollY > 0) -1 else 1
                                            onMouse(0, 0, heldButtons, wheel)
                                            lastScrollY -= 24f * -wheel
                                            hint = if (wheel < 0) "SCROLL ↑" else "SCROLL ↓"
                                        }
                                        pressed.forEach { it.consume() }
                                        continue
                                    }

                                    val p = pressed.first()
                                    val delta = p.positionChange()
                                    totalMove += abs(delta.x) + abs(delta.y)
                                    val dx = (delta.x * 1.45f).roundToInt()
                                    val dy = (delta.y * 1.45f).roundToInt()

                                    // Double-tap + hold → left-button drag (windows / icons)
                                    if (dragArmed && !dragging) {
                                        val heldMs = System.currentTimeMillis() - holdStart
                                        if (heldMs >= 140L || totalMove > 10f) {
                                            dragging = true
                                            onMouse(0, 0, heldButtons or 0x01, 0)
                                            pulse("DRAG", heavy = true)
                                        }
                                    }

                                    val buttons =
                                        when {
                                            dragging -> heldButtons or 0x01
                                            else -> heldButtons
                                        }
                                    if (dx != 0 || dy != 0) {
                                        onMouse(dx, dy, buttons, 0)
                                        if (!dragging && heldButtons == 0) hint = "MOVE"
                                        if (heldButtons and 0x02 != 0) hint = "RIGHT DRAG"
                                        if (heldButtons and 0x01 != 0 && !dragging) hint = "LEFT DRAG"
                                    }
                                    p.consume()
                                }

                                if (dragging) {
                                    onMouse(0, 0, heldButtons, 0)
                                    hint = "DROP"
                                    return@awaitEachGesture
                                }

                                if (multi && totalMove < 28f && abs(lastScrollY) < 20f) {
                                    clickRight()
                                    return@awaitEachGesture
                                }

                                if (isDoubleHold && totalMove < 18f) {
                                    // Second tap released quickly → double-click
                                    clickLeft()
                                    clickLeft()
                                    hint = "DOUBLE CLICK"
                                    return@awaitEachGesture
                                }

                                if (!multi && totalMove < 18f) {
                                    awaitSecondTap = true
                                    lastTapUp = System.currentTimeMillis()
                                    singleClickJob?.cancel()
                                    singleClickJob =
                                        scope.launch {
                                            delay(320)
                                            if (awaitSecondTap) {
                                                awaitSecondTap = false
                                                clickLeft()
                                            }
                                        }
                                }
                            }
                        },
            ) {
                // Graph-paper stage like the web mouse pad
                Canvas(modifier = UiMod.fillMaxSize()) {
                    val step = 28f
                    var x = 0f
                    while (x < size.width) {
                        drawLine(Color(0x14000000), Offset(x, 0f), Offset(x, size.height), 1f)
                        x += step
                    }
                    var y = 0f
                    while (y < size.height) {
                        drawLine(Color(0x14000000), Offset(0f, y), Offset(size.width, y), 1f)
                        y += step
                    }
                    // crosshair
                    drawLine(
                        SkitzRed.copy(alpha = 0.35f),
                        Offset(size.width / 2, 12f),
                        Offset(size.width / 2, size.height - 12f),
                        2f,
                    )
                    drawLine(
                        SkitzBlue.copy(alpha = 0.35f),
                        Offset(12f, size.height / 2),
                        Offset(size.width - 12f, size.height / 2),
                        2f,
                    )
                }
                if (flash.value > 0.05f) {
                    Box(
                        modifier =
                            UiMod
                                .fillMaxSize()
                                .background(SkitzYellow.copy(alpha = flash.value * 0.35f)),
                    )
                }
                finger?.let { pos ->
                    Canvas(modifier = UiMod.fillMaxSize()) {
                        drawCircle(SkitzBlue.copy(alpha = 0.2f), 52f, pos)
                        drawCircle(SkitzBlue.copy(alpha = 0.65f), 16f, pos)
                        drawCircle(Color.White, 6f, pos)
                    }
                }
                if (finger == null) {
                    Box(modifier = UiMod.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            if (connected) "Touch here" else "Connect first",
                            color = SkitzMuted.copy(alpha = 0.65f),
                            fontFamily = SkitzMono,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                        )
                    }
                }
            }
        }

        // Physical mouse buttons — hold to drag (L/R stay down until release)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = UiMod.fillMaxWidth()) {
            Keycap(
                label = "L",
                accent = SkitzRed,
                enabled = connected,
                latched = heldButtons and 0x01 != 0,
                fontSize = 20.sp,
                modifier = UiMod.weight(1.2f).height(64.dp),
                onPress = {
                    heldButtons = heldButtons or 0x01
                    onMouse(0, 0, heldButtons, 0)
                    pulse("LEFT HOLD")
                },
                onRelease = {
                    heldButtons = heldButtons and 0x01.inv()
                    onMouse(0, 0, heldButtons, 0)
                    hint = "LEFT UP"
                },
            )
            Keycap(
                label = "M",
                accent = SkitzYellow,
                enabled = connected,
                latched = heldButtons and 0x04 != 0,
                fontSize = 18.sp,
                modifier = UiMod.weight(0.8f).height(64.dp),
                onPress = {
                    heldButtons = heldButtons or 0x04
                    onMouse(0, 0, heldButtons, 0)
                    pulse("MID HOLD")
                },
                onRelease = {
                    heldButtons = heldButtons and 0x04.inv()
                    onMouse(0, 0, heldButtons, 0)
                },
            )
            Keycap(
                label = "R",
                accent = SkitzBlue,
                enabled = connected,
                latched = heldButtons and 0x02 != 0,
                fontSize = 20.sp,
                modifier = UiMod.weight(1.2f).height(64.dp),
                onPress = {
                    heldButtons = heldButtons or 0x02
                    onMouse(0, 0, heldButtons, 0)
                    pulse("RIGHT HOLD")
                },
                onRelease = {
                    heldButtons = heldButtons and 0x02.inv()
                    onMouse(0, 0, heldButtons, 0)
                    hint = "RIGHT UP"
                },
            )
        }
        Text(
            "Hold L or R + move to drag · double-tap then hold also drags · two-finger scroll",
            color = SkitzMuted,
            fontSize = 11.sp,
            fontFamily = SkitzMono,
        )
        Spacer(modifier = UiMod.height(2.dp))
    }
}
