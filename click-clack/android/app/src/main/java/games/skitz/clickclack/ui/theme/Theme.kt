package games.skitz.clickclack.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val SkitzPaper = Color(0xFFF3EEE4)
val SkitzPaperDeep = Color(0xFFE8E0D2)
val SkitzCream = Color(0xFFFFFEF9)
val SkitzInk = Color(0xFF161310)
val SkitzRed = Color(0xFFE0312E)
val SkitzBlue = Color(0xFF1E5BB8)
val SkitzGreen = Color(0xFF2E7D32)
val SkitzYellow = Color(0xFFE8A317)
val SkitzMuted = Color(0xFF6E665C)
val SkitzWashRed = Color(0xFFFFE8E6)
val SkitzWashBlue = Color(0xFFE6EEFF)
val SkitzWashGreen = Color(0xFFE7F5E8)
val SkitzWashYellow = Color(0xFFFFF3D6)

private val LightColors =
    lightColorScheme(
        primary = SkitzRed,
        onPrimary = SkitzCream,
        secondary = SkitzBlue,
        onSecondary = SkitzCream,
        tertiary = SkitzGreen,
        background = SkitzPaper,
        onBackground = SkitzInk,
        surface = SkitzCream,
        onSurface = SkitzInk,
        outline = SkitzInk,
    )

@Composable
fun ClickClackTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = LightColors, content = content)
}
