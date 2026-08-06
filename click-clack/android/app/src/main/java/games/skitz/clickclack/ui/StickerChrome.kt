package games.skitz.clickclack.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier as UiMod
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.ui.theme.SkitzCream
import games.skitz.clickclack.ui.theme.SkitzDisplay
import games.skitz.clickclack.ui.theme.SkitzInk
import games.skitz.clickclack.ui.theme.SkitzMono
import games.skitz.clickclack.ui.theme.SkitzMuted

@Composable
fun StickerPanel(
    shadow: Color,
    modifier: UiMod = UiMod,
    contentPadding: Dp = 16.dp,
    content: @Composable ColumnScope.() -> Unit,
) {
    Box(modifier = modifier) {
        Box(
            modifier =
                UiMod
                    .matchParentSize()
                    .offset(x = 6.dp, y = 6.dp)
                    .background(shadow),
        )
        Column(
            modifier =
                UiMod
                    .fillMaxWidth()
                    .border(3.dp, SkitzInk)
                    .background(
                        Brush.verticalGradient(
                            listOf(Color(0xFFFFFFF8), SkitzCream, Color(0xFFF7F1E6)),
                        ),
                    )
                    .padding(contentPadding),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            content = content,
        )
    }
}

@Composable
fun StickerAction(
    label: String,
    shadow: Color,
    onClick: () -> Unit,
    modifier: UiMod = UiMod,
    subtitle: String? = null,
) {
    val interaction = remember { MutableInteractionSource() }
    Box(modifier = modifier.fillMaxWidth()) {
        Box(
            modifier =
                UiMod
                    .matchParentSize()
                    .offset(x = 5.dp, y = 5.dp)
                    .background(shadow),
        )
        Box(
            modifier =
                UiMod
                    .fillMaxWidth()
                    .border(3.dp, SkitzInk)
                    .background(SkitzCream)
                    .clickable(interactionSource = interaction, indication = null, onClick = onClick)
                    .padding(vertical = 15.dp, horizontal = 14.dp),
            contentAlignment = Alignment.CenterStart,
        ) {
            Column {
                Text(label, fontWeight = FontWeight.Black, fontSize = 15.sp, color = SkitzInk, fontFamily = SkitzDisplay)
                if (subtitle != null) {
                    Text(subtitle, fontFamily = SkitzMono, fontSize = 11.sp, color = SkitzMuted)
                }
            }
        }
    }
}

@Composable
fun StatusDot(color: Color) {
    Box(
        modifier =
            UiMod
                .size(10.dp)
                .background(color, CircleShape)
                .border(1.5.dp, SkitzInk, CircleShape),
    )
}

@Composable
fun MiniKey(label: String, shadow: Color, rotation: Float = 0f) {
    Box(modifier = UiMod.rotate(rotation)) {
        Box(
            modifier =
                UiMod
                    .size(36.dp)
                    .offset(x = 3.dp, y = 3.dp)
                    .background(shadow),
        )
        Box(
            modifier =
                UiMod
                    .size(36.dp)
                    .border(2.5.dp, SkitzInk)
                    .background(SkitzCream),
            contentAlignment = Alignment.Center,
        ) {
            Text(label, fontWeight = FontWeight.Black, fontSize = 14.sp, color = SkitzInk, fontFamily = SkitzDisplay)
        }
    }
}

@Composable
fun SectionLabel(text: String) {
    Text(
        text,
        fontWeight = FontWeight.Black,
        fontSize = 13.sp,
        color = SkitzMuted,
        letterSpacing = 1.sp,
        fontFamily = SkitzMono,
    )
}
