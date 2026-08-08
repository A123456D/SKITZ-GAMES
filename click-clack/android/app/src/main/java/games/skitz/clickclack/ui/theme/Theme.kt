package games.skitz.clickclack.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/** Cool tech premium palette — clinical hardware UI. */
val TechBg = Color(0xFFF2F4F7)
val TechSurface = Color(0xFFFFFFFF)
val TechHairline = Color(0xFFD5DAE2)
val TechInk = Color(0xFF0B1220)
val TechMuted = Color(0xFF6B7285)
val TechSelected = Color(0xFF0B1220)
val TechAccent = Color(0xFF2F6FED)
val TechConnected = Color(0xFF0F9F6E)
val TechError = Color(0xFFE11D48)
val TechPadField = Color(0xFFE8ECF2)
val TechDisabled = Color(0xFFE5E8EE)

// Legacy aliases kept so gradual renames don't break mid-edit
val SkitzPaper = TechBg
val SkitzPaperDeep = Color(0xFFE8ECF2)
val SkitzCream = TechSurface
val SkitzInk = TechInk
val SkitzRed = TechError
val SkitzBlue = TechAccent
val SkitzGreen = TechConnected
val SkitzYellow = TechAccent
val SkitzMuted = TechMuted
val SkitzWashRed = Color(0xFFFFE4EA)
val SkitzWashBlue = Color(0xFFE8F0FF)
val SkitzWashGreen = Color(0xFFE6F7F0)
val SkitzWashYellow = Color(0xFFE8F0FF)

private val LightColors =
    lightColorScheme(
        primary = TechAccent,
        onPrimary = TechSurface,
        secondary = TechInk,
        onSecondary = TechSurface,
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
    MaterialTheme(colorScheme = LightColors, content = content)
}
