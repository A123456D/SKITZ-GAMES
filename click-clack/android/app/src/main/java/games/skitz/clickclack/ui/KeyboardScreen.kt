package games.skitz.clickclack.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier as UiMod
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.hid.HidKeys
import games.skitz.clickclack.ui.theme.SkitzBlue
import games.skitz.clickclack.ui.theme.SkitzGreen
import games.skitz.clickclack.ui.theme.SkitzInk
import games.skitz.clickclack.ui.theme.SkitzMuted
import games.skitz.clickclack.ui.theme.SkitzRed
import games.skitz.clickclack.ui.theme.SkitzYellow

private data class KeyDef(
    val label: String,
    val usage: Byte,
    val weight: Float = 1f,
    val isModifier: Boolean = false,
    val modifierBit: Byte = 0,
    val accent: Color? = null,
    val fontSp: Float = 16f,
)

@Composable
fun KeyboardScreen(
    connected: Boolean,
    onKeyDown: (Byte) -> Unit,
    onKeyUp: (Byte) -> Unit,
    onModifiers: (Byte) -> Unit,
    onTap: (Byte, Byte) -> Unit,
) {
    var shift by remember { mutableStateOf(false) }
    var ctrl by remember { mutableStateOf(false) }
    var alt by remember { mutableStateOf(false) }
    var gui by remember { mutableStateOf(false) }
    var lastHit by remember { mutableStateOf(if (connected) "Ready" else "Connect first") }

    fun currentMods(): Byte {
        var m = 0
        if (ctrl) m = m or HidKeys.MOD_LEFT_CTRL.toInt()
        if (shift) m = m or HidKeys.MOD_LEFT_SHIFT.toInt()
        if (alt) m = m or HidKeys.MOD_LEFT_ALT.toInt()
        if (gui) m = m or HidKeys.MOD_LEFT_GUI.toInt()
        return m.toByte()
    }

    fun syncMods() {
        onModifiers(currentMods())
    }

    val numberRow =
        listOf(
            KeyDef("1", HidKeys.NUM_1), KeyDef("2", HidKeys.NUM_2), KeyDef("3", HidKeys.NUM_3),
            KeyDef("4", HidKeys.NUM_4), KeyDef("5", HidKeys.NUM_5), KeyDef("6", HidKeys.NUM_6),
            KeyDef("7", HidKeys.NUM_7), KeyDef("8", HidKeys.NUM_8), KeyDef("9", HidKeys.NUM_9),
            KeyDef("0", HidKeys.NUM_0),
            KeyDef("⌫", HidKeys.BACKSPACE, 1.55f, accent = SkitzRed, fontSp = 18f),
        )
    val topLetter =
        listOf(
            KeyDef("Q", HidKeys.Q), KeyDef("W", HidKeys.W), KeyDef("E", HidKeys.E), KeyDef("R", HidKeys.R),
            KeyDef("T", HidKeys.T), KeyDef("Y", HidKeys.Y), KeyDef("U", HidKeys.U), KeyDef("I", HidKeys.I),
            KeyDef("O", HidKeys.O), KeyDef("P", HidKeys.P),
        )
    val midLetter =
        listOf(
            KeyDef("A", HidKeys.A), KeyDef("S", HidKeys.S), KeyDef("D", HidKeys.D), KeyDef("F", HidKeys.F),
            KeyDef("G", HidKeys.G), KeyDef("H", HidKeys.H), KeyDef("J", HidKeys.J), KeyDef("K", HidKeys.K),
            KeyDef("L", HidKeys.L),
            KeyDef("⏎", HidKeys.ENTER, 1.55f, accent = SkitzGreen, fontSp = 18f),
        )
    val bottomLetter =
        listOf(
            KeyDef("⇧", HidKeys.NONE, 1.45f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_SHIFT, accent = SkitzYellow, fontSp = 18f),
            KeyDef("Z", HidKeys.Z), KeyDef("X", HidKeys.X), KeyDef("C", HidKeys.C), KeyDef("V", HidKeys.V),
            KeyDef("B", HidKeys.B), KeyDef("N", HidKeys.N), KeyDef("M", HidKeys.M),
            KeyDef(",", HidKeys.COMMA), KeyDef(".", HidKeys.DOT),
        )
    val mods =
        listOf(
            KeyDef("Ctrl", HidKeys.NONE, 1.15f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_CTRL, accent = SkitzRed, fontSp = 13f),
            KeyDef("Win", HidKeys.NONE, 1.05f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_GUI, accent = SkitzBlue, fontSp = 13f),
            KeyDef("Alt", HidKeys.NONE, 1.05f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_ALT, accent = SkitzYellow, fontSp = 13f),
            KeyDef("Space", HidKeys.SPACE, 3.6f, accent = SkitzBlue, fontSp = 14f),
            KeyDef("?", HidKeys.SLASH, 1.1f),
        )
    val arrows =
        listOf(
            KeyDef("←", HidKeys.LEFT, accent = SkitzInk, fontSp = 20f),
            KeyDef("↑", HidKeys.UP, accent = SkitzInk, fontSp = 20f),
            KeyDef("↓", HidKeys.DOWN, accent = SkitzInk, fontSp = 20f),
            KeyDef("→", HidKeys.RIGHT, accent = SkitzInk, fontSp = 20f),
        )

    @Composable
    fun KeyRow(keys: List<KeyDef>, tall: Boolean = false) {
        Row(
            modifier = UiMod.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            keys.forEach { key ->
                val latched =
                    when (key.modifierBit) {
                        HidKeys.MOD_LEFT_SHIFT -> shift
                        HidKeys.MOD_LEFT_CTRL -> ctrl
                        HidKeys.MOD_LEFT_ALT -> alt
                        HidKeys.MOD_LEFT_GUI -> gui
                        else -> false
                    }
                val accent =
                    key.accent
                        ?: when {
                            latched -> SkitzBlue
                            else -> Color(0xFFB7AE9E)
                        }
                Keycap(
                    label = key.label,
                    accent = accent,
                    enabled = connected,
                    latched = latched,
                    fontSize = key.fontSp.sp,
                    modifier = UiMod.weight(key.weight).height(if (tall) 58.dp else 54.dp),
                    onTap =
                        if (key.isModifier) {
                            {
                                when (key.modifierBit) {
                                    HidKeys.MOD_LEFT_SHIFT -> shift = !shift
                                    HidKeys.MOD_LEFT_CTRL -> ctrl = !ctrl
                                    HidKeys.MOD_LEFT_ALT -> alt = !alt
                                    HidKeys.MOD_LEFT_GUI -> gui = !gui
                                }
                                syncMods()
                                lastHit = key.label
                            }
                        } else {
                            null
                        },
                    onPress = {
                        if (key.isModifier) return@Keycap
                        onKeyDown(key.usage)
                        lastHit = key.label
                    },
                    onRelease = {
                        if (key.isModifier) return@Keycap
                        onKeyUp(key.usage)
                        if (shift && key.usage >= HidKeys.A && key.usage <= HidKeys.Z) {
                            shift = false
                            syncMods()
                        }
                    },
                )
            }
        }
    }

    Column(
        modifier =
            UiMod
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 12.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(
            modifier = UiMod.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text("KEYS", fontWeight = FontWeight.Black, fontSize = 36.sp, color = SkitzInk, letterSpacing = (-1.5).sp)
                AnimatedContent(
                    targetState = lastHit,
                    transitionSpec = { fadeIn() togetherWith fadeOut() },
                    label = "last-hit",
                ) { hit ->
                    Text(
                        "▸ $hit",
                        color = SkitzBlue,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                    )
                }
            }
            LivePill(connected)
        }

        KeyRow(numberRow)
        KeyRow(topLetter)
        KeyRow(midLetter)
        KeyRow(bottomLetter)
        KeyRow(mods, tall = true)

        Row(
            modifier = UiMod.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                arrows.forEach { key ->
                    Keycap(
                        label = key.label,
                        accent = key.accent ?: SkitzInk,
                        enabled = connected,
                        fontSize = key.fontSp.sp,
                        modifier = UiMod.width(64.dp).height(56.dp),
                        onPress = {
                            onKeyDown(key.usage)
                            lastHit = key.label
                        },
                        onRelease = { onKeyUp(key.usage) },
                    )
                }
            }
        }

        Text(
            "Keys flash + buzz on press · modifiers stay lit until tapped off",
            color = SkitzMuted,
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace,
        )
        Spacer(modifier = UiMod.height(4.dp))
    }
}
