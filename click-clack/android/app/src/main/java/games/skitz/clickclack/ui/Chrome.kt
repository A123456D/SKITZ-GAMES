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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.ui.theme.TechBg
import games.skitz.clickclack.ui.theme.TechHairline
import games.skitz.clickclack.ui.theme.TechInk
import games.skitz.clickclack.ui.theme.TechMono
import games.skitz.clickclack.ui.theme.TechMuted
import games.skitz.clickclack.ui.theme.TechSans
import games.skitz.clickclack.ui.theme.TechSurface
import games.skitz.clickclack.ui.theme.TechSurfaceRaised

private val PanelShape = RoundedCornerShape(18.dp)

@Composable
fun AppHeader() {
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .background(TechBg)
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        // Decorative balance — keeps title centered like the mockup
        Spacer(modifier = Modifier.size(28.dp))
        Text(
            "Skitz Controller",
            fontFamily = TechSans,
            fontWeight = FontWeight.SemiBold,
            fontSize = 17.sp,
            color = TechInk,
            letterSpacing = (-0.2).sp,
        )
        Spacer(modifier = Modifier.size(28.dp))
    }
}

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
                .shadow(8.dp, PanelShape, clip = false, ambientColor = Color.Black.copy(alpha = 0.5f))
                .background(TechSurface, PanelShape)
                .border(1.dp, TechHairline, PanelShape)
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
    val bg = if (emphasized) TechSurfaceRaised else TechSurface
    Box(
        modifier =
            modifier
                .fillMaxWidth()
                .shadow(6.dp, RoundedCornerShape(16.dp), clip = false, ambientColor = Color.Black.copy(alpha = 0.45f))
                .background(bg, RoundedCornerShape(16.dp))
                .border(1.dp, TechHairline, RoundedCornerShape(16.dp))
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
                color = TechInk,
            )
            if (subtitle != null) {
                Text(
                    subtitle,
                    fontFamily = TechSans,
                    fontWeight = FontWeight.Normal,
                    fontSize = 12.sp,
                    color = TechMuted,
                )
            }
        }
    }
}

@Composable
fun StatusDot(color: Color) {
    Box(modifier = Modifier.size(8.dp).background(color, CircleShape))
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
    val fg = if (live) games.skitz.clickclack.ui.theme.TechConnected else TechMuted
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
}
