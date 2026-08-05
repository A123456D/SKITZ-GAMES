package games.skitz.clickclack.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val SkitzPaper = Color(0xFFF3EEE4)
val SkitzInk = Color(0xFF161310)
val SkitzRed = Color(0xFFE0312E)
val SkitzBlue = Color(0xFF1E5BB8)
val SkitzGreen = Color(0xFF2E7D32)
val SkitzYellow = Color(0xFFE8A317)
val SkitzMuted = Color(0xFF6E665C)

private val LightColors =
    lightColorScheme(
        primary = SkitzRed,
        onPrimary = SkitzPaper,
        secondary = SkitzBlue,
        onSecondary = SkitzPaper,
        tertiary = SkitzGreen,
        background = SkitzPaper,
        onBackground = SkitzInk,
        surface = Color(0xFFFFFEF9),
        onSurface = SkitzInk,
        outline = SkitzInk,
    )

@Composable
fun ClickClackTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColors,
        content = content,
    )
}
