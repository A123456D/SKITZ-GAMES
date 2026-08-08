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
    /** Circle for letters/numbers; false = stadium pill. */
    val circle: Boolean = true,
    val fontSp: Float = 14f,
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
            KeyDef("ESC", HidKeys.ESCAPE, fontSp = 9f),
            KeyDef("F1", HidKeys.F1, fontSp = 10f),
            KeyDef("F2", HidKeys.F2, fontSp = 10f),
            KeyDef("F3", HidKeys.F3, fontSp = 10f),
            KeyDef("F4", HidKeys.F4, fontSp = 10f),
            KeyDef("F5", HidKeys.F5, fontSp = 10f),
            KeyDef("F6", HidKeys.F6, fontSp = 10f),
            KeyDef("F7", HidKeys.F7, fontSp = 10f),
            KeyDef("F8", HidKeys.F8, fontSp = 10f),
            KeyDef("F9", HidKeys.F9, fontSp = 10f),
            KeyDef("F10", HidKeys.F10, circle = false, fontSp = 9f),
            KeyDef("F11", HidKeys.F11, circle = false, fontSp = 9f),
            KeyDef("F12", HidKeys.F12, circle = false, fontSp = 9f),
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
    val punct =
        listOf(
            KeyDef(",", HidKeys.COMMA, circle = false, fontSp = 12f),
            KeyDef(".", HidKeys.DOT, circle = false, fontSp = 12f),
            KeyDef("/", HidKeys.SLASH, circle = false, fontSp = 12f),
            KeyDef("?", HidKeys.SLASH, circle = false, tapMods = HidKeys.MOD_LEFT_SHIFT, fontSp = 12f),
            KeyDef("-", HidKeys.MINUS, circle = false, fontSp = 12f),
            KeyDef("=", HidKeys.EQUAL, circle = false, fontSp = 12f),
        )
    val mods =
        listOf(
            KeyDef("CTRL", HidKeys.NONE, 1.1f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_CTRL, circle = false, fontSp = 11f),
            KeyDef("WIN", HidKeys.NONE, 1f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_GUI, circle = false, fontSp = 11f),
            KeyDef("ALT", HidKeys.NONE, 1f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_ALT, circle = false, fontSp = 11f),
            KeyDef("SPACE", HidKeys.SPACE, 3.4f, circle = false, fontSp = 11f),
            KeyDef("ENTER", HidKeys.ENTER, 1.3f, circle = false, fontSp = 11f),
        )
    val nav =
        listOf(
            KeyDef("HOME", HidKeys.HOME, circle = false, fontSp = 10f),
            KeyDef("END", HidKeys.END, circle = false, fontSp = 10f),
            KeyDef("PG UP", HidKeys.PAGE_UP, circle = false, fontSp = 10f),
            KeyDef("PG DN", HidKeys.PAGE_DOWN, circle = false, fontSp = 10f),
        )
    val arrows =
        listOf(
            KeyDef("\u2190", HidKeys.LEFT, circle = false, fontSp = 14f),
            KeyDef("\u2191", HidKeys.UP, circle = false, fontSp = 14f),
            KeyDef("\u2193", HidKeys.DOWN, circle = false, fontSp = 14f),
            KeyDef("\u2192", HidKeys.RIGHT, circle = false, fontSp = 14f),
        )
    val sideExtras =
        listOf(
            KeyDef("TAB", HidKeys.TAB, circle = false, fontSp = 11f),
            KeyDef("ESC", HidKeys.ESCAPE, circle = false, fontSp = 11f),
            KeyDef("DEL", HidKeys.DELETE, circle = false, fontSp = 11f),
            KeyDef("BKSP", HidKeys.BACKSPACE, circle = false, fontSp = 11f),
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
            round = key.circle,
            aspectSquare = key.circle,
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

    /** Equal circular keys — never squished. */
    @Composable
    fun CircleRow(keys: List<KeyDef>, keySize: Dp, gap: Dp) {
        Row(
            modifier = Modifier.fillMaxWidth().height(keySize),
            horizontalArrangement = Arrangement.spacedBy(gap, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            keys.forEach { key ->
                RenderKey(key, Modifier.size(keySize))
            }
        }
    }

    /** Mixed circle + pill row (e.g. TAB + letters + ENTER). */
    @Composable
    fun MixedRow(
        leading: KeyDef?,
        circles: List<KeyDef>,
        trailing: KeyDef?,
        keySize: Dp,
        gap: Dp,
        pillWeight: Float = 1.15f,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().height(keySize),
            horizontalArrangement = Arrangement.spacedBy(gap, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (leading != null) {
                RenderKey(leading, Modifier.weight(pillWeight).fillMaxHeight())
            }
            circles.forEach { key ->
                RenderKey(key, Modifier.size(keySize))
            }
            if (trailing != null) {
                RenderKey(trailing, Modifier.weight(pillWeight).fillMaxHeight())
            }
        }
    }

    @Composable
    fun PillRow(keys: List<KeyDef>, rowHeight: Dp, gap: Dp) {
        Row(
            modifier = Modifier.fillMaxWidth().height(rowHeight),
            horizontalArrangement = Arrangement.spacedBy(gap),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            keys.forEach { key ->
                RenderKey(key, Modifier.weight(key.weight).fillMaxHeight())
            }
        }
    }

    /** Compact inverted-T of wide pills — small footprint. */
    @Composable
    fun ArrowCluster(rowHeight: Dp, gap: Dp) {
        val left = arrows[0]
        val up = arrows[1]
        val down = arrows[2]
        val right = arrows[3]
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(gap),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            RenderKey(up, Modifier.fillMaxWidth(0.48f).height(rowHeight))
            Row(
                modifier = Modifier.fillMaxWidth().height(rowHeight),
                horizontalArrangement = Arrangement.spacedBy(gap),
            ) {
                RenderKey(left, Modifier.weight(1f).fillMaxHeight())
                RenderKey(down, Modifier.weight(1f).fillMaxHeight())
                RenderKey(right, Modifier.weight(1f).fillMaxHeight())
            }
        }
    }

    val shiftKey =
        KeyDef("SHIFT", HidKeys.NONE, isModifier = true, modifierBit = HidKeys.MOD_LEFT_SHIFT, circle = false, fontSp = 11f)
    val tabKey = KeyDef("TAB", HidKeys.TAB, circle = false, fontSp = 11f)
    val bkspKey = KeyDef("BKSP", HidKeys.BACKSPACE, circle = false, fontSp = 11f)
    val enterKey = KeyDef("ENTER", HidKeys.ENTER, circle = false, fontSp = 11f)

    BoxWithConstraints(
        modifier =
            Modifier
                .fillMaxSize()
                .padding(horizontal = 8.dp, vertical = 6.dp),
    ) {
        if (landscape) {
            // Restored 1.5 landscape: letters fill height; compact side rail for nav/arrows.
            val gap = 6.dp
            val rows = 7
            val rowH = (maxHeight - gap * (rows - 1)) / rows
            val sideWidth = maxWidth * 0.20f
            val mainWidth = maxWidth - sideWidth - 10.dp
            val letterSize = min(rowH, (mainWidth - gap * 9) / 10)

            Row(
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Column(
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                    verticalArrangement = Arrangement.spacedBy(gap),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    // F-row: circles + a few pills for F10-12
                    Row(
                        modifier = Modifier.fillMaxWidth().height(rowH),
                        horizontalArrangement = Arrangement.spacedBy(gap, Alignment.CenterHorizontally),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        fRow.forEach { key ->
                            if (key.circle) {
                                RenderKey(key, Modifier.size(min(rowH * 0.92f, letterSize * 0.85f)))
                            } else {
                                RenderKey(key, Modifier.weight(1f).fillMaxHeight())
                            }
                        }
                    }
                    CircleRow(numberRow, letterSize, gap)
                    CircleRow(topLetter, letterSize, gap)
                    MixedRow(tabKey, midLetter, enterKey, letterSize, gap)
                    MixedRow(shiftKey, bottomLetter, bkspKey, letterSize, gap)
                    PillRow(punct, rowH * 0.9f, gap)
                    PillRow(mods, rowH * 0.9f, gap)
                }
                Column(
                    modifier = Modifier.width(sideWidth).fillMaxHeight(),
                    verticalArrangement = Arrangement.spacedBy(gap),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    sideExtras.forEach { key ->
                        RenderKey(key, Modifier.fillMaxWidth().weight(1f))
                    }
                    Spacer(Modifier.height(2.dp))
                    Column(
                        modifier = Modifier.weight(2.2f).fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(gap),
                    ) {
                        RenderKey(arrows[1], Modifier.fillMaxWidth().weight(1f))
                        Row(
                            modifier = Modifier.fillMaxWidth().weight(1f),
                            horizontalArrangement = Arrangement.spacedBy(gap),
                        ) {
                            RenderKey(arrows[0], Modifier.weight(1f).fillMaxHeight())
                            RenderKey(arrows[2], Modifier.weight(1f).fillMaxHeight())
                            RenderKey(arrows[3], Modifier.weight(1f).fillMaxHeight())
                        }
                    }
                }
            }
        } else {
            // Portrait: letters dominate; small pill arrow cluster + nav at bottom.
            val gap = 7.dp
            val letterCount = 10
            val letterSize = min((maxWidth - gap * (letterCount - 1)) / letterCount, maxHeight * 0.105f)
            val pillH = letterSize * 0.78f
            val arrowH = letterSize * 0.62f

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
                    CircleRow(numberRow, letterSize, gap)
                    CircleRow(topLetter, letterSize, gap)
                    MixedRow(tabKey, midLetter, null, letterSize, gap, pillWeight = 1.1f)
                    MixedRow(shiftKey, bottomLetter, bkspKey, letterSize, gap)
                    PillRow(punct, pillH, gap)
                    PillRow(mods, pillH, gap)
                }
                Spacer(Modifier.height(4.dp))
                ArrowCluster(arrowH, gap * 0.7f)
                Spacer(Modifier.height(4.dp))
                PillRow(nav, arrowH, gap)
            }
        }
    }
}
