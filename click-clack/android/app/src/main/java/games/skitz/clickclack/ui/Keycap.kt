package games.skitz.clickclack.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
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
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.ui.theme.TechAccent
import games.skitz.clickclack.ui.theme.TechDisabled
import games.skitz.clickclack.ui.theme.TechHairline
import games.skitz.clickclack.ui.theme.TechInk
import games.skitz.clickclack.ui.theme.TechSans
import games.skitz.clickclack.ui.theme.TechSelected
import games.skitz.clickclack.ui.theme.TechSurface

/**
 * Premium round / stadium keycap.
 * @param round true = circle (unit keys); false = stadium pill (Space, etc.)
 */
@Composable
fun Keycap(
    label: String,
    modifier: Modifier = Modifier,
    accent: Color = TechAccent,
    enabled: Boolean = true,
    latched: Boolean = false,
    round: Boolean = true,
    fontSize: TextUnit = 15.sp,
    onPress: () -> Unit = {},
    onRelease: () -> Unit = {},
    onTap: (() -> Unit)? = null,
) {
    var pressed by remember { mutableStateOf(false) }
    val buzz = rememberBuzz()
    val shape = if (round) CircleShape else RoundedCornerShape(percent = 50)
    val active = pressed || latched
    val face by animateColorAsState(
        targetValue =
            when {
                !enabled -> TechDisabled
                latched -> accent
                pressed -> TechSelected
                else -> TechSurface
            },
        animationSpec = tween(70),
        label = "key-face",
    )
    val labelColor =
        when {
            !enabled -> TechInk.copy(alpha = 0.35f)
            active -> TechSurface
            else -> TechInk
        }
    val borderColor = if (active) Color.Transparent else TechHairline

    Box(
        modifier =
            modifier
                .border(1.dp, borderColor, shape)
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
            fontWeight = FontWeight.SemiBold,
            fontSize = fontSize,
            fontFamily = TechSans,
            maxLines = 1,
        )
    }
}
