package games.skitz.clickclack.ui.theme

import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import games.skitz.clickclack.R

val TechSans =
    FontFamily(
        Font(R.font.manrope_regular, FontWeight.Normal),
        Font(R.font.manrope_medium, FontWeight.Medium),
        Font(R.font.manrope_semibold, FontWeight.SemiBold),
        Font(R.font.manrope_bold, FontWeight.Bold),
    )

/** Technical strings only (addresses / HID detail). */
val TechMono =
    FontFamily(
        Font(R.font.ibm_plex_mono_medium, FontWeight.Medium),
        Font(R.font.ibm_plex_mono_bold, FontWeight.Bold),
    )

// Legacy names used across older call sites during the redesign.
val SkitzDisplay = TechSans
val SkitzMono = TechMono
