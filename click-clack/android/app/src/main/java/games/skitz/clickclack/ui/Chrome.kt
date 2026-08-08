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
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.ui.theme.TechHairline
import games.skitz.clickclack.ui.theme.TechInk
import games.skitz.clickclack.ui.theme.TechMono
import games.skitz.clickclack.ui.theme.TechMuted
import games.skitz.clickclack.ui.theme.TechSans
import games.skitz.clickclack.ui.theme.TechSurface

private val PanelShape = RoundedCornerShape(16.dp)

@Composable
fun Panel(
    modifier: Modifier = Modifier,
    contentPadding: Dp = 16.dp,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier =
            modifier
                .fillMaxWidth()
                .border(1.dp, TechHairline, PanelShape)
                .background(TechSurface, PanelShape)
                .padding(contentPadding),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        content = content,
    )
}

@Composable
fun ActionRow(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    emphasized: Boolean = false,
) {
    val buzz = rememberBuzz()
    val interaction = remember { MutableInteractionSource() }
    val bg = if (emphasized) TechInk else TechSurface
    val fg = if (emphasized) TechSurface else TechInk
    Box(
        modifier =
            modifier
                .fillMaxWidth()
                .border(1.dp, if (emphasized) TechInk else TechHairline, RoundedCornerShape(14.dp))
                .background(bg, RoundedCornerShape(14.dp))
                .clickable(interactionSource = interaction, indication = null) {
                    buzz.click()
                    onClick()
                }
                .padding(horizontal = 16.dp, vertical = 14.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                label,
                fontFamily = TechSans,
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
                color = fg,
            )
            if (subtitle != null) {
                Text(
                    subtitle,
                    fontFamily = TechSans,
                    fontWeight = FontWeight.Normal,
                    fontSize = 12.sp,
                    color = if (emphasized) TechSurface.copy(alpha = 0.72f) else TechMuted,
                )
            }
        }
    }
}

@Composable
fun StatusDot(color: Color) {
    Box(
        modifier =
            Modifier
                .size(8.dp)
                .background(color, CircleShape),
    )
}

@Composable
fun SectionLabel(text: String) {
    Text(
        text.uppercase(),
        fontFamily = TechSans,
        fontWeight = FontWeight.SemiBold,
        fontSize = 11.sp,
        color = TechMuted,
        letterSpacing = 1.2.sp,
    )
}

@Composable
fun LivePill(live: Boolean, modifier: Modifier = Modifier) {
    val fg = if (live) Color(0xFF0F9F6E) else TechMuted
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        StatusDot(fg)
        Text(
            if (live) "Connected" else "Offline",
            fontFamily = TechSans,
            fontWeight = FontWeight.Medium,
            fontSize = 12.sp,
            color = fg,
        )
    }
}

// Compatibility wrappers for any leftover call sites
@Composable
fun StickerPanel(
    shadow: Color,
    modifier: Modifier = Modifier,
    contentPadding: Dp = 16.dp,
    content: @Composable ColumnScope.() -> Unit,
) {
    Panel(modifier = modifier, contentPadding = contentPadding, content = content)
}

@Composable
fun StickerAction(
    label: String,
    shadow: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
) {
    ActionRow(label = label, onClick = onClick, modifier = modifier, subtitle = subtitle)
}

@Composable
fun MiniKey(label: String, shadow: Color, rotation: Float = 0f) {
    // Decorative keys removed from Connect; no-op placeholder.
}
