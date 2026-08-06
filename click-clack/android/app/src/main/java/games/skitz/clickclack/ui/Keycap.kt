package games.skitz.clickclack.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.ui.theme.SkitzDisplay
import games.skitz.clickclack.ui.theme.SkitzInk
import games.skitz.clickclack.ui.theme.SkitzMono
import games.skitz.clickclack.ui.theme.SkitzMuted

/** Sharp sticker keycap — same energy as the original web Click Clack desk. */
@Composable
fun Keycap(
    label: String,
    accent: Color,
    modifier: UiMod = UiMod,
    enabled: Boolean = true,
    latched: Boolean = false,
    fontSize: TextUnit = 15.sp,
    onPress: () -> Unit = {},
    onRelease: () -> Unit = {},
    onTap: (() -> Unit)? = null,
) {
    var pressed by remember { mutableStateOf(false) }
    val buzz = rememberBuzz()
    val depth by animateDpAsState(
        targetValue = if (pressed || latched) 0.dp else 4.dp,
        animationSpec = tween(60),
        label = "key-depth",
    )
    val face by animateColorAsState(
        targetValue =
            when {
                !enabled -> Color(0xFFE8E0D2)
                pressed || latched -> accent
                else -> Color(0xFFFFFEF9)
            },
        animationSpec = tween(60),
        label = "key-face",
    )
    val labelColor = if (pressed || latched) Color(0xFFFFFEF9) else SkitzInk

    Box(modifier = modifier) {
        Box(
            modifier =
                UiMod
                    .matchParentSize()
                    .offset(x = depth, y = depth)
                    .background(accent),
        )
        Box(
            modifier =
                UiMod
                    .fillMaxSize()
                    .offset(
                        x = if (pressed || latched) 2.dp else 0.dp,
                        y = if (pressed || latched) 2.dp else 0.dp,
                    )
                    .border(2.5.dp, SkitzInk)
                    .background(face)
                    .pointerInput(enabled, latched) {
                        detectTapGestures(
                            onPress = {
                                if (!enabled) return@detectTapGestures
                                pressed = true
                                buzz.tick()
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
                fontWeight = FontWeight.Bold,
                fontSize = fontSize,
                fontFamily = SkitzMono,
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
                .border(2.dp, SkitzInk)
                .background(bg)
                .padding(horizontal = 10.dp, vertical = 5.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            if (live) "● LIVE" else "○ OFFLINE",
            color = fg,
            fontWeight = FontWeight.Bold,
            fontSize = 11.sp,
            fontFamily = SkitzMono,
            letterSpacing = 0.5.sp,
        )
    }
}

@Composable
fun PanelHead(title: String, hint: String, trailing: @Composable (() -> Unit)? = null) {
    Row(
        modifier = UiMod.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Bottom,
    ) {
        Row(
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            modifier = UiMod.weight(1f),
        ) {
            Text(
                title.uppercase(),
                fontFamily = SkitzDisplay,
                fontSize = 26.sp,
                color = SkitzInk,
                letterSpacing = (-0.8).sp,
                lineHeight = 28.sp,
            )
            Text(
                hint,
                fontFamily = SkitzMono,
                fontSize = 11.sp,
                color = SkitzMuted,
                modifier = UiMod.padding(bottom = 3.dp),
            )
        }
        trailing?.invoke()
    }
}
