package games.skitz.clickclack.ui

import android.content.res.Configuration
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.hid.HidKeys
import games.skitz.clickclack.ui.theme.TechAccent

private data class KeyDef(
    val label: String,
    val usage: Byte,
    val weight: Float = 1f,
    val isModifier: Boolean = false,
    val modifierBit: Byte = 0,
    /** When set, key uses tapKey(usage, tapMods) instead of press/release. */
    val tapMods: Byte? = null,
    val round: Boolean = true,
    val fontSp: Float = 15f,
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
    val landscape = LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE

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

    val fRow =
        listOf(
            KeyDef("Esc", HidKeys.ESCAPE, fontSp = 11f),
            KeyDef("F1", HidKeys.F1, fontSp = 12f),
            KeyDef("F2", HidKeys.F2, fontSp = 12f),
            KeyDef("F3", HidKeys.F3, fontSp = 12f),
            KeyDef("F4", HidKeys.F4, fontSp = 12f),
            KeyDef("F5", HidKeys.F5, fontSp = 12f),
            KeyDef("F6", HidKeys.F6, fontSp = 12f),
            KeyDef("F7", HidKeys.F7, fontSp = 12f),
            KeyDef("F8", HidKeys.F8, fontSp = 12f),
            KeyDef("F9", HidKeys.F9, fontSp = 12f),
            KeyDef("F10", HidKeys.F10, fontSp = 11f),
            KeyDef("F11", HidKeys.F11, fontSp = 11f),
            KeyDef("F12", HidKeys.F12, fontSp = 11f),
        )
    val symbolRow =
        listOf(
            KeyDef("`", HidKeys.GRAVE),
            KeyDef("-", HidKeys.MINUS),
            KeyDef("=", HidKeys.EQUAL),
            KeyDef("[", HidKeys.LEFT_BRACKET),
            KeyDef("]", HidKeys.RIGHT_BRACKET),
            KeyDef("\\", HidKeys.BACKSLASH),
            KeyDef(";", HidKeys.SEMICOLON),
            KeyDef("'", HidKeys.APOSTROPHE),
            KeyDef("/", HidKeys.SLASH),
            KeyDef("?", HidKeys.SLASH, tapMods = HidKeys.MOD_LEFT_SHIFT),
            KeyDef("Del", HidKeys.DELETE, 1.2f, fontSp = 12f),
        )
    val numberRow =
        listOf(
            KeyDef("1", HidKeys.NUM_1),
            KeyDef("2", HidKeys.NUM_2),
            KeyDef("3", HidKeys.NUM_3),
            KeyDef("4", HidKeys.NUM_4),
            KeyDef("5", HidKeys.NUM_5),
            KeyDef("6", HidKeys.NUM_6),
            KeyDef("7", HidKeys.NUM_7),
            KeyDef("8", HidKeys.NUM_8),
            KeyDef("9", HidKeys.NUM_9),
            KeyDef("0", HidKeys.NUM_0),
            KeyDef("⌫", HidKeys.BACKSPACE, 1.5f, fontSp = 17f),
        )
    val topLetter =
        listOf(
            KeyDef("Q", HidKeys.Q),
            KeyDef("W", HidKeys.W),
            KeyDef("E", HidKeys.E),
            KeyDef("R", HidKeys.R),
            KeyDef("T", HidKeys.T),
            KeyDef("Y", HidKeys.Y),
            KeyDef("U", HidKeys.U),
            KeyDef("I", HidKeys.I),
            KeyDef("O", HidKeys.O),
            KeyDef("P", HidKeys.P),
        )
    val midLetter =
        listOf(
            KeyDef("A", HidKeys.A),
            KeyDef("S", HidKeys.S),
            KeyDef("D", HidKeys.D),
            KeyDef("F", HidKeys.F),
            KeyDef("G", HidKeys.G),
            KeyDef("H", HidKeys.H),
            KeyDef("J", HidKeys.J),
            KeyDef("K", HidKeys.K),
            KeyDef("L", HidKeys.L),
            KeyDef("⏎", HidKeys.ENTER, 1.5f, fontSp = 17f),
        )
    val bottomLetter =
        listOf(
            KeyDef("⇧", HidKeys.NONE, 1.4f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_SHIFT, fontSp = 17f),
            KeyDef("Z", HidKeys.Z),
            KeyDef("X", HidKeys.X),
            KeyDef("C", HidKeys.C),
            KeyDef("V", HidKeys.V),
            KeyDef("B", HidKeys.B),
            KeyDef("N", HidKeys.N),
            KeyDef("M", HidKeys.M),
            KeyDef(",", HidKeys.COMMA),
            KeyDef(".", HidKeys.DOT),
        )
    val mods =
        listOf(
            KeyDef("Ctrl", HidKeys.NONE, 1.1f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_CTRL, round = false, fontSp = 12f),
            KeyDef("Win", HidKeys.NONE, 1f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_GUI, round = false, fontSp = 12f),
            KeyDef("Alt", HidKeys.NONE, 1f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_ALT, round = false, fontSp = 12f),
            KeyDef("Space", HidKeys.SPACE, 3.4f, round = false, fontSp = 13f),
            KeyDef("/", HidKeys.SLASH, 1f),
            KeyDef("?", HidKeys.SLASH, 1f, tapMods = HidKeys.MOD_LEFT_SHIFT),
        )
    val arrows =
        listOf(
            KeyDef("←", HidKeys.LEFT, fontSp = 18f),
            KeyDef("↑", HidKeys.UP, fontSp = 18f),
            KeyDef("↓", HidKeys.DOWN, fontSp = 18f),
            KeyDef("→", HidKeys.RIGHT, fontSp = 18f),
        )
    val extras =
        listOf(
            KeyDef("Tab", HidKeys.TAB, round = false, fontSp = 12f),
            KeyDef("Esc", HidKeys.ESCAPE, round = false, fontSp = 12f),
            KeyDef("Del", HidKeys.DELETE, round = false, fontSp = 12f),
        )

    @Composable
    fun RenderKey(key: KeyDef, modifier: Modifier) {
        val latched =
            when (key.modifierBit) {
                HidKeys.MOD_LEFT_SHIFT -> shift
                HidKeys.MOD_LEFT_CTRL -> ctrl
                HidKeys.MOD_LEFT_ALT -> alt
                HidKeys.MOD_LEFT_GUI -> gui
                else -> false
            }
        Keycap(
            label = key.label,
            accent = TechAccent,
            enabled = connected,
            latched = latched,
            round = key.round,
            fontSize = key.fontSp.sp,
            modifier = modifier,
            onTap =
                when {
                    key.isModifier -> {
                        {
                            when (key.modifierBit) {
                                HidKeys.MOD_LEFT_SHIFT -> shift = !shift
                                HidKeys.MOD_LEFT_CTRL -> ctrl = !ctrl
                                HidKeys.MOD_LEFT_ALT -> alt = !alt
                                HidKeys.MOD_LEFT_GUI -> gui = !gui
                            }
                            syncMods()
                        }
                    }
                    key.tapMods != null -> {
                        { onTap(key.usage, key.tapMods) }
                    }
                    else -> null
                },
            onPress = {
                if (key.isModifier || key.tapMods != null) return@Keycap
                onKeyDown(key.usage)
            },
            onRelease = {
                if (key.isModifier || key.tapMods != null) return@Keycap
                onKeyUp(key.usage)
                if (shift && key.usage >= HidKeys.A && key.usage <= HidKeys.Z) {
                    shift = false
                    syncMods()
                }
            },
        )
    }

    @Composable
    fun KeyRow(keys: List<KeyDef>, rowHeight: Dp, gap: Dp) {
        Row(
            modifier = Modifier.fillMaxWidth().height(rowHeight),
            horizontalArrangement = Arrangement.spacedBy(gap),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            keys.forEach { key ->
                RenderKey(key, modifier = Modifier.weight(key.weight).fillMaxHeight())
            }
        }
    }

    BoxWithConstraints(
        modifier =
            Modifier
                .fillMaxSize()
                .padding(horizontal = 8.dp, vertical = 8.dp),
    ) {
        val gap = if (landscape) 8.dp else 10.dp
        val availableWidth = maxWidth
        val availableHeight = maxHeight
        if (landscape) {
            val rows = 7
            val rowH = (availableHeight - gap * (rows - 1)) / rows
            val sideWidth = availableWidth * 0.22f
            Row(
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Column(
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                    verticalArrangement = Arrangement.spacedBy(gap),
                ) {
                    KeyRow(fRow, rowH, gap)
                    KeyRow(symbolRow, rowH, gap)
                    KeyRow(numberRow, rowH, gap)
                    KeyRow(topLetter, rowH, gap)
                    KeyRow(midLetter, rowH, gap)
                    KeyRow(bottomLetter, rowH, gap)
                    KeyRow(mods, rowH, gap)
                }
                Column(
                    modifier =
                        Modifier
                            .width(sideWidth)
                            .fillMaxHeight(),
                    verticalArrangement = Arrangement.spacedBy(gap),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    extras.forEach { key ->
                        RenderKey(key, modifier = Modifier.fillMaxWidth().weight(1f))
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth().weight(1.2f),
                        horizontalArrangement = Arrangement.spacedBy(gap),
                    ) {
                        arrows.forEach { key ->
                            RenderKey(key, modifier = Modifier.weight(1f).fillMaxHeight())
                        }
                    }
                }
            }
        } else {
            val rows = 6
            val rowH = (availableHeight - gap * (rows - 1)) / rows
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(gap),
            ) {
                KeyRow(numberRow, rowH, gap)
                KeyRow(topLetter, rowH, gap)
                KeyRow(midLetter, rowH, gap)
                KeyRow(bottomLetter, rowH, gap)
                KeyRow(mods, rowH, gap)
                Row(
                    modifier = Modifier.fillMaxWidth().height(rowH),
                    horizontalArrangement = Arrangement.spacedBy(gap, Alignment.CenterHorizontally),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    arrows.forEach { key ->
                        RenderKey(
                            key,
                            modifier =
                                Modifier
                                    .weight(1f, fill = false)
                                    .fillMaxHeight()
                                    .width(rowH),
                        )
                    }
                }
            }
        }
    }
}
