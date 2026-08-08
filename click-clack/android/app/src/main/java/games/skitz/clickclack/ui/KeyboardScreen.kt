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
    val bar: Boolean = false,
    val fontSp: Float = 14f,
)

/**
 * @param forceLandscape Always use the landscape letter-first deck (Keys tab).
 * Pad sheet still follows device orientation when this is false.
 */
@Composable
fun KeyboardScreen(
    connected: Boolean,
    onKeyDown: (Byte) -> Unit,
    onKeyUp: (Byte) -> Unit,
    onModifiers: (Byte) -> Unit,
    onTap: (Byte, Byte) -> Unit,
    forceLandscape: Boolean = false,
) {
    var shift by remember { mutableStateOf(false) }
    var ctrl by remember { mutableStateOf(false) }
    var alt by remember { mutableStateOf(false) }
    var gui by remember { mutableStateOf(false) }
    val deviceLandscape =
        LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE
    val landscape = forceLandscape || deviceLandscape

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
            KeyDef("ESC", HidKeys.ESCAPE, circle = false, fontSp = 9f),
            KeyDef("F1", HidKeys.F1, circle = false, fontSp = 9f),
            KeyDef("F2", HidKeys.F2, circle = false, fontSp = 9f),
            KeyDef("F3", HidKeys.F3, circle = false, fontSp = 9f),
            KeyDef("F4", HidKeys.F4, circle = false, fontSp = 9f),
            KeyDef("F5", HidKeys.F5, circle = false, fontSp = 9f),
            KeyDef("F6", HidKeys.F6, circle = false, fontSp = 9f),
            KeyDef("F7", HidKeys.F7, circle = false, fontSp = 9f),
            KeyDef("F8", HidKeys.F8, circle = false, fontSp = 9f),
            KeyDef("F9", HidKeys.F9, circle = false, fontSp = 9f),
            KeyDef("F10", HidKeys.F10, circle = false, fontSp = 9f),
            KeyDef("F11", HidKeys.F11, circle = false, fontSp = 9f),
            KeyDef("F12", HidKeys.F12, circle = false, fontSp = 9f),
        )
    val numberRow =
        listOf(
            KeyDef("1", HidKeys.NUM_1, fontSp = 15f),
            KeyDef("2", HidKeys.NUM_2, fontSp = 15f),
            KeyDef("3", HidKeys.NUM_3, fontSp = 15f),
            KeyDef("4", HidKeys.NUM_4, fontSp = 15f),
            KeyDef("5", HidKeys.NUM_5, fontSp = 15f),
            KeyDef("6", HidKeys.NUM_6, fontSp = 15f),
            KeyDef("7", HidKeys.NUM_7, fontSp = 15f),
            KeyDef("8", HidKeys.NUM_8, fontSp = 15f),
            KeyDef("9", HidKeys.NUM_9, fontSp = 15f),
            KeyDef("0", HidKeys.NUM_0, fontSp = 15f),
        )
    val topLetter =
        listOf(
            KeyDef("Q", HidKeys.Q, fontSp = 15f),
            KeyDef("W", HidKeys.W, fontSp = 15f),
            KeyDef("E", HidKeys.E, fontSp = 15f),
            KeyDef("R", HidKeys.R, fontSp = 15f),
            KeyDef("T", HidKeys.T, fontSp = 15f),
            KeyDef("Y", HidKeys.Y, fontSp = 15f),
            KeyDef("U", HidKeys.U, fontSp = 15f),
            KeyDef("I", HidKeys.I, fontSp = 15f),
            KeyDef("O", HidKeys.O, fontSp = 15f),
            KeyDef("P", HidKeys.P, fontSp = 15f),
        )
    val midLetter =
        listOf(
            KeyDef("A", HidKeys.A, fontSp = 15f),
            KeyDef("S", HidKeys.S, fontSp = 15f),
            KeyDef("D", HidKeys.D, fontSp = 15f),
            KeyDef("F", HidKeys.F, fontSp = 15f),
            KeyDef("G", HidKeys.G, fontSp = 15f),
            KeyDef("H", HidKeys.H, fontSp = 15f),
            KeyDef("J", HidKeys.J, fontSp = 15f),
            KeyDef("K", HidKeys.K, fontSp = 15f),
            KeyDef("L", HidKeys.L, fontSp = 15f),
        )
    val bottomLetter =
        listOf(
            KeyDef("Z", HidKeys.Z, fontSp = 15f),
            KeyDef("X", HidKeys.X, fontSp = 15f),
            KeyDef("C", HidKeys.C, fontSp = 15f),
            KeyDef("V", HidKeys.V, fontSp = 15f),
            KeyDef("B", HidKeys.B, fontSp = 15f),
            KeyDef("N", HidKeys.N, fontSp = 15f),
            KeyDef("M", HidKeys.M, fontSp = 15f),
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
            KeyDef("SPACE", HidKeys.SPACE, 3.2f, circle = false, fontSp = 11f),
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
            KeyDef("\u2190", HidKeys.LEFT, circle = false, bar = true, fontSp = 14f),
            KeyDef("\u2191", HidKeys.UP, circle = false, bar = true, fontSp = 14f),
            KeyDef("\u2193", HidKeys.DOWN, circle = false, bar = true, fontSp = 14f),
            KeyDef("\u2192", HidKeys.RIGHT, circle = false, bar = true, fontSp = 14f),
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
            bar = key.bar,
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

    @Composable
    fun MixedRow(
        leading: KeyDef?,
        circles: List<KeyDef>,
        trailing: KeyDef?,
        keySize: Dp,
        gap: Dp,
        pillWidth: Dp = keySize * 1.28f,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().height(keySize),
            horizontalArrangement = Arrangement.spacedBy(gap, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (leading != null) {
                RenderKey(leading, Modifier.width(pillWidth).fillMaxHeight())
            }
            circles.forEach { key ->
                RenderKey(key, Modifier.size(keySize))
            }
            if (trailing != null) {
                RenderKey(trailing, Modifier.width(pillWidth).fillMaxHeight())
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

    @Composable
    fun ArrowCluster(rowHeight: Dp, gap: Dp) {
        val left = arrows[0].copy(bar = false)
        val up = arrows[1].copy(bar = false)
        val down = arrows[2].copy(bar = false)
        val right = arrows[3].copy(bar = false)
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
    val delKey = KeyDef("DEL", HidKeys.DELETE, circle = false, bar = true, fontSp = 11f)

    BoxWithConstraints(
        modifier =
            Modifier
                .fillMaxSize()
                .padding(horizontal = 8.dp, vertical = 4.dp),
    ) {
        if (landscape) {
            // During Keys orientation lock, first frame can still be portrait-sized.
            // Never use coerceIn(min, max) when max can be < min — that crashes the app.
            val gap = 5.dp
            val sideWidth = min(88.dp, maxWidth * 0.12f)
            val mainWidth = (maxWidth - sideWidth - 10.dp).coerceAtLeast(1.dp)
            val letterRows = 4
            val letterBudget = maxHeight * 0.62f
            val letterSize =
                min(
                    (letterBudget - gap * (letterRows - 1)) / letterRows,
                    (mainWidth - gap * 9) / 10,
                ).coerceAtLeast(20.dp)
            val fH = min(maxHeight * 0.09f, letterSize * 0.58f).coerceAtLeast(18.dp)
            val auxH = min(maxHeight * 0.095f, letterSize * 0.72f).coerceAtLeast(20.dp)
            val modH = min(maxHeight * 0.11f, letterSize * 0.82f).coerceAtLeast(22.dp)
            val delH = min(36.dp, maxHeight * 0.12f).coerceAtLeast(24.dp)

            Row(
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Column(
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                    verticalArrangement = Arrangement.SpaceBetween,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    PillRow(fRow, fH, 4.dp)
                    CircleRow(numberRow, letterSize, gap)
                    CircleRow(topLetter, letterSize, gap)
                    MixedRow(tabKey, midLetter, enterKey, letterSize, gap)
                    MixedRow(shiftKey, bottomLetter, bkspKey, letterSize, gap)
                    PillRow(punct, auxH, gap)
                    PillRow(mods, modH, gap)
                }
                Column(
                    modifier = Modifier.width(sideWidth).fillMaxHeight(),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    RenderKey(delKey, Modifier.fillMaxWidth().height(delH))
                    RenderKey(arrows[1], Modifier.fillMaxWidth().weight(1.2f))
                    Row(
                        modifier = Modifier.fillMaxWidth().weight(1f),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        RenderKey(arrows[0], Modifier.weight(1f).fillMaxHeight())
                        RenderKey(arrows[2], Modifier.weight(1f).fillMaxHeight())
                        RenderKey(arrows[3], Modifier.weight(1f).fillMaxHeight())
                    }
                }
            }
        } else {
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
                    MixedRow(tabKey, midLetter, null, letterSize, gap, pillWidth = letterSize * 1.2f)
                    MixedRow(shiftKey, bottomLetter, bkspKey, letterSize, gap, pillWidth = letterSize * 1.2f)
                    PillRow(punct, pillH, gap)
                    PillRow(mods, pillH, gap)
                }
                Spacer(Modifier.height(4.dp))
                ArrowCluster(arrowH, gap * 0.75f)
                Spacer(Modifier.height(4.dp))
                PillRow(nav, arrowH, gap)
            }
        }
    }
}
