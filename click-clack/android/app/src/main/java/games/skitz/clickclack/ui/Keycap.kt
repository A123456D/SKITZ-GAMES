package games.skitz.clickclack.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier as UiMod
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.ui.theme.SkitzCream
import games.skitz.clickclack.ui.theme.SkitzInk

private val KeyShape = RoundedCornerShape(14.dp)

/** Soft keycap with shadow click, fill flash, and haptics. */
@Composable
fun Keycap(
    label: String,
    accent: Color,
    modifier: UiMod = UiMod,
    enabled: Boolean = true,
    latched: Boolean = false,
    fontSize: TextUnit = 16.sp,
    onPress: () -> Unit = {},
    onRelease: () -> Unit = {},
    onTap: (() -> Unit)? = null,
) {
    var pressed by remember { mutableStateOf(false) }
    val haptics = LocalHapticFeedback.current
    val depth by animateDpAsState(
        targetValue = if (pressed || latched) 1.dp else 5.dp,
        animationSpec = tween(70),
        label = "key-depth",
    )
    val face by animateColorAsState(
        targetValue =
            when {
                !enabled -> Color(0xFFE8E0D2)
                pressed || latched -> accent
                else -> SkitzCream
            },
        animationSpec = tween(80),
        label = "key-face",
    )
    val labelColor by animateColorAsState(
        targetValue = if (pressed || latched) Color.White else SkitzInk,
        animationSpec = tween(80),
        label = "key-label",
    )

    Box(modifier = modifier) {
        Box(
            modifier =
                UiMod
                    .matchParentSize()
                    .offset(x = depth, y = depth)
                    .background(accent, KeyShape),
        )
        Box(
            modifier =
                UiMod
                    .fillMaxSize()
                    .offset(
                        x = if (pressed || latched) depth - 1.dp else 0.dp,
                        y = if (pressed || latched) depth - 1.dp else 0.dp,
                    )
                    .border(2.5.dp, SkitzInk, KeyShape)
                    .background(
                        Brush.verticalGradient(
                            listOf(
                                face,
                                if (pressed || latched) accent.copy(alpha = 0.9f) else Color(0xFFF3EDE2),
                            ),
                        ),
                        KeyShape,
                    )
                    .pointerInput(enabled, latched) {
                        detectTapGestures(
                            onPress = {
                                if (!enabled) return@detectTapGestures
                                pressed = true
                                haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                if (onTap != null) {
                                    onTap()
                                    tryAwaitRelease()
                                    pressed = false
                                } else {
                                    onPress()
                                    tryAwaitRelease()
                                    onRelease()
                                    pressed = false
                                }
                            },
                        )
                    },
            contentAlignment = Alignment.Center,
        ) {
            Text(
                label,
                color = labelColor,
                fontWeight = FontWeight.Black,
                fontSize = fontSize,
                fontFamily = FontFamily.Monospace,
                maxLines = 1,
            )
        }
    }
}

@Composable
fun LivePill(live: Boolean, modifier: UiMod = UiMod) {
    val bg = if (live) Color(0xFFD9F2DC) else Color(0xFFEDE7DB)
    val fg = if (live) Color(0xFF1B5E20) else Color(0xFF6E665C)
    Box(
        modifier =
            modifier
                .border(2.dp, SkitzInk, RoundedCornerShape(999.dp))
                .background(bg, RoundedCornerShape(999.dp))
                .padding(horizontal = 10.dp, vertical = 5.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            if (live) "● LIVE" else "○ OFFLINE",
            color = fg,
            fontWeight = FontWeight.Black,
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace,
            letterSpacing = 0.5.sp,
        )
    }
}
