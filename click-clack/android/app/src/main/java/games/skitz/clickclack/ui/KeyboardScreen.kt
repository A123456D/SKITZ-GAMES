package games.skitz.clickclack.ui

import android.content.res.Configuration
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.unit.min
import androidx.compose.ui.unit.sp
import games.skitz.clickclack.hid.HidKeys
import games.skitz.clickclack.ui.theme.TechAccent

private data class KeyDef(
    val label: String,
    val usage: Byte,
    val weight: Float = 1f,
    val isModifier: Boolean = false,
    val modifierBit: Byte = 0,
    val tapMods: Byte? = null,
    val round: Boolean = true,
    /** Letter-style keys stay circular via aspectRatio. */
    val square: Boolean = true,
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
        )
    val bottomLetter =
        listOf(
            KeyDef("Z", HidKeys.Z),
            KeyDef("X", HidKeys.X),
            KeyDef("C", HidKeys.C),
            KeyDef("V", HidKeys.V),
            KeyDef("B", HidKeys.B),
            KeyDef("N", HidKeys.N),
            KeyDef("M", HidKeys.M),
        )
    val utilRow =
        listOf(
            KeyDef("Shift", HidKeys.NONE, 1.15f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_SHIFT, square = false, fontSp = 11f),
            KeyDef(",", HidKeys.COMMA),
            KeyDef(".", HidKeys.DOT),
            KeyDef("/", HidKeys.SLASH),
            KeyDef("?", HidKeys.SLASH, tapMods = HidKeys.MOD_LEFT_SHIFT),
            KeyDef("Bksp", HidKeys.BACKSPACE, 1.25f, square = false, fontSp = 11f),
        )
    val mods =
        listOf(
            KeyDef("Ctrl", HidKeys.NONE, 1f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_CTRL, round = false, square = false, fontSp = 11f),
            KeyDef("Win", HidKeys.NONE, 1f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_GUI, round = false, square = false, fontSp = 11f),
            KeyDef("Alt", HidKeys.NONE, 1f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_ALT, round = false, square = false, fontSp = 11f),
            KeyDef("Space", HidKeys.SPACE, 3.2f, round = false, square = false, fontSp = 12f),
            KeyDef("Enter", HidKeys.ENTER, 1.2f, square = false, fontSp = 11f),
        )
    val fRow =
        listOf(
            KeyDef("Esc", HidKeys.ESCAPE, square = false, fontSp = 10f),
            KeyDef("F1", HidKeys.F1, square = false, fontSp = 10f),
            KeyDef("F2", HidKeys.F2, square = false, fontSp = 10f),
            KeyDef("F3", HidKeys.F3, square = false, fontSp = 10f),
            KeyDef("F4", HidKeys.F4, square = false, fontSp = 10f),
            KeyDef("F5", HidKeys.F5, square = false, fontSp = 10f),
            KeyDef("F6", HidKeys.F6, square = false, fontSp = 10f),
            KeyDef("F7", HidKeys.F7, square = false, fontSp = 10f),
            KeyDef("F8", HidKeys.F8, square = false, fontSp = 10f),
            KeyDef("F9", HidKeys.F9, square = false, fontSp = 10f),
            KeyDef("F10", HidKeys.F10, square = false, fontSp = 9f),
            KeyDef("F11", HidKeys.F11, square = false, fontSp = 9f),
            KeyDef("F12", HidKeys.F12, square = false, fontSp = 9f),
        )
    // Unicode escapes avoid encoding corruption on Windows tooling.
    val arrows =
        listOf(
            KeyDef("\u2190", HidKeys.LEFT, fontSp = 13f),
            KeyDef("\u2191", HidKeys.UP, fontSp = 13f),
            KeyDef("\u2193", HidKeys.DOWN, fontSp = 13f),
            KeyDef("\u2192", HidKeys.RIGHT, fontSp = 13f),
        )

    @Composable
    fun RenderKey(key: KeyDef, keyModifier: Modifier) {
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
            aspectSquare = key.square,
            fontSize = key.fontSp.sp,
            modifier = keyModifier,
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

    /** Letter rows: equal circular keys sized from available width (never squished). */
    @Composable
    fun LetterRow(keys: List<KeyDef>, keySize: Dp, gap: Dp) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(gap, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            keys.forEach { key ->
                RenderKey(key, Modifier.size(keySize))
            }
        }
    }

    @Composable
    fun WeightedRow(keys: List<KeyDef>, rowHeight: Dp, gap: Dp) {
        Row(
            modifier = Modifier.fillMaxWidth().height(rowHeight),
            horizontalArrangement = Arrangement.spacedBy(gap, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            keys.forEach { key ->
                // Round keys keep a fixed circle; only stadium keys stretch with weight.
                val keyModifier =
                    if (key.square) {
                        Modifier.size(rowHeight)
                    } else {
                        Modifier.weight(key.weight).fillMaxHeight()
                    }
                RenderKey(key, keyModifier)
            }
        }
    }

    /** Compact inverted-T cluster — much smaller footprint than a full-width arrow row. */
    @Composable
    fun CompactArrows(arrowKeySize: Dp, gap: Dp) {
        val left = arrows[0]
        val up = arrows[1]
        val down = arrows[2]
        val right = arrows[3]
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(gap),
        ) {
            RenderKey(up, Modifier.size(arrowKeySize))
            Row(horizontalArrangement = Arrangement.spacedBy(gap)) {
                RenderKey(left, Modifier.size(arrowKeySize))
                RenderKey(down, Modifier.size(arrowKeySize))
                RenderKey(right, Modifier.size(arrowKeySize))
            }
        }
    }

    BoxWithConstraints(
        modifier =
            Modifier
                .fillMaxSize()
                .padding(horizontal = 10.dp, vertical = 8.dp),
    ) {
        val gap = if (landscape) 5.dp else 7.dp
        if (landscape) {
            // Letters claim most of the width; arrows sit in a narrow rail.
            val letterSize = min(maxWidth * 0.062f, maxHeight * 0.15f)
            val arrowSize = letterSize * 0.52f
            Row(
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Column(
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                    verticalArrangement = Arrangement.SpaceEvenly,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    WeightedRow(fRow, letterSize * 0.62f, gap)
                    LetterRow(numberRow, letterSize, gap)
                    LetterRow(topLetter, letterSize, gap)
                    LetterRow(midLetter, letterSize, gap)
                    LetterRow(bottomLetter, letterSize, gap)
                    WeightedRow(utilRow, letterSize, gap)
                    WeightedRow(mods, letterSize * 0.82f, gap)
                }
                Column(
                    modifier = Modifier.width(arrowSize * 3.4f).fillMaxHeight(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    CompactArrows(arrowSize, gap * 0.75f)
                }
            }
        } else {
            // Portrait: letters dominate; tiny inverted-T arrows in the footer.
            val letterCount = 10
            val letterSize = (maxWidth - gap * (letterCount - 1)) / letterCount
            val arrowSize = letterSize * 0.55f
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.SpaceBetween,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Column(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    verticalArrangement = Arrangement.SpaceEvenly,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    LetterRow(numberRow, letterSize, gap)
                    LetterRow(topLetter, letterSize, gap)
                    LetterRow(midLetter, letterSize, gap)
                    LetterRow(bottomLetter, letterSize, gap)
                    WeightedRow(utilRow, letterSize, gap)
                    WeightedRow(mods, letterSize * 0.88f, gap)
                }
                Spacer(Modifier.height(4.dp))
                CompactArrows(arrowSize, gap * 0.75f)
            }
        }
    }
}
