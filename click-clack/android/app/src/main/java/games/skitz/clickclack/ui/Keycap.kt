package games.skitz.clickclack.ui

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.ui.theme.TechAccent
import games.skitz.clickclack.ui.theme.TechAccentHot
import games.skitz.clickclack.ui.theme.TechInk
import games.skitz.clickclack.ui.theme.TechKeyBorder
import games.skitz.clickclack.ui.theme.TechKeyFaceBottom
import games.skitz.clickclack.ui.theme.TechKeyFaceTop
import games.skitz.clickclack.ui.theme.TechKeyShadow
import games.skitz.clickclack.ui.theme.TechSans

/**
 * Solid filled keycap matching the approved web design —
 * gradient face, soft depth shadow, blue when pressed/latched.
 */
@Composable
fun Keycap(
    label: String,
    modifier: Modifier = Modifier,
    accent: Color = TechAccent,
    enabled: Boolean = true,
    latched: Boolean = false,
    /** true = circle, false = stadium/pill (or bar if [bar]=true) */
    round: Boolean = true,
    aspectSquare: Boolean = false,
    /** Kept for call-site compat; keys are always solid now. */
    filled: Boolean = true,
    /** Squarer radius (DEL / arrows / mouse buttons). */
    bar: Boolean = false,
    corner: Dp = 14.dp,
    fontSize: TextUnit = 15.sp,
    onPress: () -> Unit = {},
    onRelease: () -> Unit = {},
    onTap: (() -> Unit)? = null,
) {
    var pressed by remember { mutableStateOf(false) }
    val buzz = rememberBuzz()
    val shape: Shape =
        when {
            round -> CircleShape
            bar -> RoundedCornerShape(corner)
            else -> RoundedCornerShape(percent = 50)
        }
    val active = enabled && (pressed || latched)
    val pressOffset by animateDpAsState(
        targetValue = if (active) 2.dp else 0.dp,
        animationSpec = tween(60),
        label = "key-press",
    )

    val faceBrush =
        if (active) {
            Brush.verticalGradient(listOf(accent, TechAccentHot))
        } else {
            Brush.verticalGradient(listOf(TechKeyFaceTop, TechKeyFaceBottom))
        }
    val borderColor =
        when {
            !enabled -> TechKeyBorder.copy(alpha = 0.35f)
            active -> Color(0xFF60A5FA)
            else -> TechKeyBorder
        }
    val labelColor =
        when {
            !enabled -> TechInk.copy(alpha = 0.28f)
            else -> TechInk
        }

    Box(
        modifier =
            modifier
                .then(if (aspectSquare || round) Modifier.aspectRatio(1f) else Modifier)
                .offset(y = pressOffset)
                .shadow(
                    elevation = if (active) 2.dp else 6.dp,
                    shape = shape,
                    clip = false,
                    ambientColor = TechKeyShadow,
                    spotColor = TechKeyShadow,
                )
                .border(1.dp, borderColor, shape)
                .background(faceBrush, shape)
                .pointerInput(enabled, latched) {
                    detectTapGestures(
                        onPress = {
                            if (!enabled) return@detectTapGestures
                            pressed = true
                            if (onTap != null) {
                                buzz.thump()
                                onTap()
                                tryAwaitRelease()
                                pressed = false
                            } else {
                                buzz.click()
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
            fontWeight = FontWeight.SemiBold,
            fontSize = fontSize,
            fontFamily = TechSans,
            maxLines = 1,
            letterSpacing = (-0.3).sp,
        )
    }
}
