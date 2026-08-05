package games.skitz.clickclack.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier as UiMod
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.ui.theme.SkitzInk

@Composable
fun StickerPanel(
    shadow: Color,
    modifier: UiMod = UiMod,
    contentPadding: Dp = 14.dp,
    content: @Composable BoxScope.() -> Unit,
) {
    Box(modifier = modifier) {
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
                    .background(Color(0xFFFFFEF9))
                    .padding(contentPadding),
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
) {
    val interaction = remember { MutableInteractionSource() }
    Box(modifier = modifier.fillMaxWidth()) {
        Box(
            modifier =
                UiMod
                    .matchParentSize()
                    .offset(x = 4.dp, y = 4.dp)
                    .background(shadow),
        )
        Box(
            modifier =
                UiMod
                    .fillMaxWidth()
                    .border(3.dp, SkitzInk)
                    .background(Color(0xFFFFFEF9))
                    .clickable(interactionSource = interaction, indication = null, onClick = onClick)
                    .padding(vertical = 14.dp, horizontal = 12.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(label, fontWeight = FontWeight.Black, fontSize = 15.sp, color = SkitzInk)
        }
    }
}
