package games.skitz.clickclack.ui

import android.content.res.Configuration
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.ui.theme.TechAccent
import games.skitz.clickclack.ui.theme.TechHairline
import games.skitz.clickclack.ui.theme.TechPadField
import games.skitz.clickclack.ui.theme.TechSurfaceRaised
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.roundToInt

@Composable
fun TouchpadScreen(
    connected: Boolean,
    onMouse: (dx: Int, dy: Int, buttons: Int, wheel: Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    var finger by remember { mutableStateOf<Offset?>(null) }
    var heldButtons by remember { mutableIntStateOf(0) }
    var awaitSecondTap by remember { mutableStateOf(false) }
    var lastTapUp by remember { mutableLongStateOf(0L) }
    var singleClickJob by remember { mutableStateOf<Job?>(null) }
    val scope = rememberCoroutineScope()
    val buzz = rememberBuzz()
    val landscape = LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE
    val wellShape = RoundedCornerShape(24.dp)

    fun clickLeft() {
        onMouse(0, 0, 0x01, 0)
        onMouse(0, 0, heldButtons, 0)
        buzz.thump()
    }

    fun clickRight() {
        onMouse(0, 0, 0x02, 0)
        onMouse(0, 0, heldButtons, 0)
        buzz.thump()
    }

    @Composable
    fun PadWell(modifier: Modifier) {
        Box(
            modifier =
                modifier
                    .shadow(12.dp, wellShape, clip = false, ambientColor = Color.Black.copy(alpha = 0.55f))
                    .border(1.dp, TechHairline, wellShape)
                    .background(if (connected) TechPadField else TechPadField.copy(alpha = 0.7f), wellShape)
                    .pointerInput(connected, heldButtons) {
                        if (!connected) return@pointerInput
                        awaitEachGesture {
                            val down = awaitFirstDown(requireUnconsumed = false)
                            val downTime = System.currentTimeMillis()
                            finger = down.position
                            buzz.resetMove()
                            var totalMove = 0f
                            var lastScrollY = 0f
                            var multi = false
                            val isDoubleHold = awaitSecondTap && (downTime - lastTapUp) < 450L
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
                                        buzz.tick()
                                    }
                                    pressed.forEach { it.consume() }
                                    continue
                                }

                                val p = pressed.first()
                                val delta = p.positionChange()
                                val travel = abs(delta.x) + abs(delta.y)
                                totalMove += travel
                                val dx = (delta.x * 1.45f).roundToInt()
                                val dy = (delta.y * 1.45f).roundToInt()

                                if (dragArmed && !dragging) {
                                    val heldMs = System.currentTimeMillis() - holdStart
                                    if (heldMs >= 140L || totalMove > 10f) {
                                        dragging = true
                                        onMouse(0, 0, heldButtons or 0x01, 0)
                                        buzz.thump()
                                    }
                                }

                                val buttons = if (dragging) heldButtons or 0x01 else heldButtons
                                if (dx != 0 || dy != 0) {
                                    onMouse(dx, dy, buttons, 0)
                                    buzz.moveTick(travel)
                                }
                                p.consume()
                            }

                            if (dragging) {
                                onMouse(0, 0, heldButtons, 0)
                                return@awaitEachGesture
                            }
                            if (multi && totalMove < 28f && abs(lastScrollY) < 20f) {
                                clickRight()
                                return@awaitEachGesture
                            }
                            if (isDoubleHold && totalMove < 18f) {
                                clickLeft()
                                clickLeft()
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
            // Subtle mouse glyph when idle — like the reference remotes.
            if (finger == null) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val cx = size.width * 0.5f
                    val cy = size.height * 0.48f
                    val w = size.minDimension * 0.12f
                    val h = w * 1.55f
                    drawRoundRect(
                        color = TechAccent.copy(alpha = 0.22f),
                        topLeft = Offset(cx - w / 2f, cy - h / 2f),
                        size = Size(w, h),
                        cornerRadius = CornerRadius(w * 0.45f, w * 0.45f),
                        style = Stroke(width = 2.5f),
                    )
                    drawLine(
                        color = TechAccent.copy(alpha = 0.22f),
                        start = Offset(cx, cy - h / 2f + 4f),
                        end = Offset(cx, cy - h * 0.08f),
                        strokeWidth = 2.5f,
                    )
                }
            }
            finger?.let { pos ->
                Canvas(modifier = Modifier.fillMaxSize()) {
                    drawCircle(TechAccent.copy(alpha = 0.18f), 48f, pos)
                    drawCircle(TechAccent.copy(alpha = 0.7f), 14f, pos)
                    drawCircle(Color.White, 5f, pos)
                }
            }
        }
    }

    @Composable
    fun ScrollRail(modifier: Modifier) {
        var scrollAcc by remember { mutableStateOf(0f) }
        Box(
            modifier =
                modifier
                    .shadow(8.dp, RoundedCornerShape(18.dp), clip = false, ambientColor = Color.Black.copy(alpha = 0.5f))
                    .border(1.dp, TechHairline, RoundedCornerShape(18.dp))
                    .background(TechSurfaceRaised, RoundedCornerShape(18.dp))
                    .pointerInput(connected) {
                        if (!connected) return@pointerInput
                        awaitEachGesture {
                            awaitFirstDown(requireUnconsumed = false)
                            scrollAcc = 0f
                            while (true) {
                                val event = awaitPointerEvent()
                                val pressed = event.changes.filter { it.pressed }
                                if (pressed.isEmpty()) break
                                val dy = pressed.first().positionChange().y
                                scrollAcc += dy
                                while (abs(scrollAcc) >= 22f) {
                                    val wheel = if (scrollAcc > 0) -1 else 1
                                    onMouse(0, 0, heldButtons, wheel)
                                    scrollAcc -= 22f * -wheel
                                    buzz.tick()
                                }
                                pressed.forEach { it.consume() }
                            }
                        }
                    },
        ) {
            Box(
                modifier =
                    Modifier
                        .align(Alignment.Center)
                        .width(4.dp)
                        .fillMaxHeight(0.28f)
                        .background(TechHairline, RoundedCornerShape(2.dp)),
            )
        }
    }

    @Composable
    fun MouseButtons(modifier: Modifier = Modifier) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
            modifier = modifier.fillMaxWidth().height(56.dp).padding(horizontal = 4.dp),
        ) {
            // Wide L / narrow M / wide R — matches remote-app pad chrome.
            listOf(
                Triple("L", 0x01, 1.35f),
                Triple("M", 0x04, 0.55f),
                Triple("R", 0x02, 1.35f),
            ).forEach { (label, bit, w) ->
                Keycap(
                    label = label,
                    enabled = connected,
                    latched = heldButtons and bit != 0,
                    round = false,
                    filled = true,
                    corner = 12.dp,
                    fontSize = 16.sp,
                    modifier = Modifier.weight(w).fillMaxHeight(),
                    onPress = {
                        heldButtons = heldButtons or bit
                        onMouse(0, 0, heldButtons, 0)
                    },
                    onRelease = {
                        heldButtons = heldButtons and bit.inv()
                        onMouse(0, 0, heldButtons, 0)
                    },
                )
            }
        }
    }

    if (landscape) {
        Row(
            modifier = modifier.fillMaxSize().padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            PadWell(modifier = Modifier.weight(1f).fillMaxHeight())
            Column(
                modifier = Modifier.width(92.dp).fillMaxHeight(),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                ScrollRail(modifier = Modifier.weight(1f).fillMaxWidth())
                Column(
                    modifier = Modifier.weight(1.15f).fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    listOf(
                        Triple("L", 0x01, 1.2f),
                        Triple("M", 0x04, 0.7f),
                        Triple("R", 0x02, 1.2f),
                    ).forEach { (label, bit, h) ->
                        Keycap(
                            label = label,
                            enabled = connected,
                            latched = heldButtons and bit != 0,
                            round = false,
                            filled = true,
                            corner = 12.dp,
                            modifier = Modifier.fillMaxWidth().weight(h),
                            onPress = {
                                heldButtons = heldButtons or bit
                                onMouse(0, 0, heldButtons, 0)
                            },
                            onRelease = {
                                heldButtons = heldButtons and bit.inv()
                                onMouse(0, 0, heldButtons, 0)
                            },
                        )
                    }
                }
            }
        }
    } else {
        Column(
            modifier = modifier.fillMaxSize().padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                PadWell(modifier = Modifier.weight(1f).fillMaxHeight())
                ScrollRail(modifier = Modifier.width(46.dp).fillMaxHeight())
            }
            MouseButtons()
        }
    }
}
