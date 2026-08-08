package games.skitz.clickclack.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/** Dark tech premium palette — modern hardware companion. */
val TechBg = Color(0xFF050608)
val TechSurface = Color(0xFF12161C)
val TechSurfaceRaised = Color(0xFF1C222C)
val TechHairline = Color(0xFF2A3340)
val TechInk = Color(0xFFF2F4F7)
val TechMuted = Color(0xFF8B93A7)
val TechSelected = Color(0xFF3B82F6)
val TechAccent = Color(0xFF3B82F6)
val TechConnected = Color(0xFF22C55E)
val TechError = Color(0xFFF43F5E)
val TechPadField = Color(0xFF0F1A2E)
val TechDisabled = Color(0xFF2A303C)
val TechShadow = Color(0x99000000)

// Legacy aliases
val SkitzPaper = TechBg
val SkitzPaperDeep = TechSurface
val SkitzCream = TechSurfaceRaised
val SkitzInk = TechInk
val SkitzRed = TechError
val SkitzBlue = TechAccent
val SkitzGreen = TechConnected
val SkitzYellow = TechAccent
val SkitzMuted = TechMuted
val SkitzWashRed = Color(0x33F43F5E)
val SkitzWashBlue = Color(0x333B82F6)
val SkitzWashGreen = Color(0x3322C55E)
val SkitzWashYellow = Color(0x333B82F6)

private val DarkColors =
    darkColorScheme(
        primary = TechAccent,
        onPrimary = Color.White,
        secondary = TechInk,
        onSecondary = TechBg,
        tertiary = TechConnected,
        background = TechBg,
        onBackground = TechInk,
        surface = TechSurface,
        onSurface = TechInk,
        outline = TechHairline,
        error = TechError,
    )

@Composable
fun ClickClackTheme(content: @Composable () -> Unit) {
    SkitzControllerTheme(content)
}

@Composable
fun SkitzControllerTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = DarkColors, content = content)
}
