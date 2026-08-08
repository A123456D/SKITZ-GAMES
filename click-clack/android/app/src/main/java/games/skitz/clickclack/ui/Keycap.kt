package games.skitz.clickclack.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.ui.theme.TechAccent
import games.skitz.clickclack.ui.theme.TechInk
import games.skitz.clickclack.ui.theme.TechMuted
import games.skitz.clickclack.ui.theme.TechSans
import games.skitz.clickclack.ui.theme.TechSurfaceRaised

/**
 * Outlined circle / capsule keycap — thin ring, blue when active.
 * Set [filled]=true for solid mouse buttons.
 */
@Composable
fun Keycap(
    label: String,
    modifier: Modifier = Modifier,
    accent: Color = TechAccent,
    enabled: Boolean = true,
    latched: Boolean = false,
    /** true = circle, false = stadium/pill */
    round: Boolean = true,
    aspectSquare: Boolean = false,
    filled: Boolean = false,
    corner: Dp = 14.dp,
    fontSize: TextUnit = 15.sp,
    onPress: () -> Unit = {},
    onRelease: () -> Unit = {},
    onTap: (() -> Unit)? = null,
) {
    var pressed by remember { mutableStateOf(false) }
    val buzz = rememberBuzz()
    val shape =
        when {
            round -> CircleShape
            filled -> RoundedCornerShape(corner)
            else -> RoundedCornerShape(percent = 50)
        }
    val active = enabled && (pressed || latched)

    val ring by animateColorAsState(
        targetValue =
            when {
                !enabled -> TechMuted.copy(alpha = 0.25f)
                active -> accent
                filled -> TechMuted.copy(alpha = 0.35f)
                else -> TechMuted.copy(alpha = 0.55f)
            },
        animationSpec = tween(80),
        label = "key-ring",
    )
    val face by animateColorAsState(
        targetValue =
            when {
                !enabled && filled -> TechSurfaceRaised.copy(alpha = 0.45f)
                active && filled -> accent.copy(alpha = 0.35f)
                filled -> TechSurfaceRaised
                active -> accent.copy(alpha = 0.12f)
                else -> Color.Transparent
            },
        animationSpec = tween(80),
        label = "key-face",
    )
    val labelColor by animateColorAsState(
        targetValue =
            when {
                !enabled -> TechInk.copy(alpha = 0.28f)
                active -> if (filled) TechInk else accent
                else -> TechInk
            },
        animationSpec = tween(80),
        label = "key-label",
    )

    Box(
        modifier =
            modifier
                .then(if (aspectSquare || (round && !filled)) Modifier.aspectRatio(1f) else Modifier)
                .border(if (filled) 1.dp else 1.5.dp, ring, shape)
                .background(face, shape)
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
            fontWeight = FontWeight.Medium,
            fontSize = fontSize,
            fontFamily = TechSans,
            maxLines = 1,
        )
    }
}
