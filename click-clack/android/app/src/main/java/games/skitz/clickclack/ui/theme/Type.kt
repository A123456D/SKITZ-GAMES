package games.skitz.clickclack.ui.theme

import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import games.skitz.clickclack.R

/** Matches the original Click Clack web desk — Archivo Black + IBM Plex Mono. */
val SkitzDisplay =
    FontFamily(
        Font(R.font.archivo_black_regular, FontWeight.Black),
    )

val SkitzMono =
    FontFamily(
        Font(R.font.ibm_plex_mono_medium, FontWeight.Medium),
        Font(R.font.ibm_plex_mono_bold, FontWeight.Bold),
    )
