package games.skitz.clickclack.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.input.pointer.pointerInput
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

private data class KeyDef(
    val label: String,
    val usage: Byte,
    val weight: Float = 1f,
    val isModifier: Boolean = false,
    val modifierBit: Byte = 0,
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

    val rows =
        listOf(
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
                KeyDef("⌫", HidKeys.BACKSPACE, 1.4f),
            ),
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
            ),
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
                KeyDef("⏎", HidKeys.ENTER, 1.4f),
            ),
            listOf(
                KeyDef("⇧", HidKeys.NONE, 1.3f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_SHIFT),
                KeyDef("Z", HidKeys.Z),
                KeyDef("X", HidKeys.X),
                KeyDef("C", HidKeys.C),
                KeyDef("V", HidKeys.V),
                KeyDef("B", HidKeys.B),
                KeyDef("N", HidKeys.N),
                KeyDef("M", HidKeys.M),
                KeyDef(",", HidKeys.COMMA),
                KeyDef(".", HidKeys.DOT),
                KeyDef("?", HidKeys.SLASH),
            ),
            listOf(
                KeyDef("Ctrl", HidKeys.NONE, 1.2f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_CTRL),
                KeyDef("Win", HidKeys.NONE, 1.1f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_GUI),
                KeyDef("Alt", HidKeys.NONE, 1.1f, isModifier = true, modifierBit = HidKeys.MOD_LEFT_ALT),
                KeyDef("Space", HidKeys.SPACE, 3.2f),
                KeyDef("←", HidKeys.LEFT),
                KeyDef("↑", HidKeys.UP),
                KeyDef("↓", HidKeys.DOWN),
                KeyDef("→", HidKeys.RIGHT),
            ),
        )

    Column(
        modifier =
            UiMod
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text("KEYBOARD", fontWeight = FontWeight.Black, fontSize = 28.sp, color = SkitzInk)
        Text(
            if (connected) "Typing to PC" else "Connect first",
            color = if (connected) SkitzGreen else SkitzMuted,
            fontFamily = FontFamily.Monospace,
            fontSize = 13.sp,
        )

        rows.forEach { row ->
            Row(
                modifier = UiMod.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                row.forEach { key ->
                    val active =
                        when (key.modifierBit) {
                            HidKeys.MOD_LEFT_SHIFT -> shift
                            HidKeys.MOD_LEFT_CTRL -> ctrl
                            HidKeys.MOD_LEFT_ALT -> alt
                            HidKeys.MOD_LEFT_GUI -> gui
                            else -> false
                        }
                    Box(
                        modifier =
                            UiMod
                                .weight(key.weight)
                                .height(46.dp)
                                .border(1.5.dp, SkitzInk, RectangleShape)
                                .background(if (active) SkitzBlue else Color(0xFFFFFEF9))
                                .pointerInput(connected, shift, ctrl, alt, gui) {
                                    detectTapGestures(
                                        onPress = {
                                            if (!connected) return@detectTapGestures
                                            if (key.isModifier) {
                                                when (key.modifierBit) {
                                                    HidKeys.MOD_LEFT_SHIFT -> shift = !shift
                                                    HidKeys.MOD_LEFT_CTRL -> ctrl = !ctrl
                                                    HidKeys.MOD_LEFT_ALT -> alt = !alt
                                                    HidKeys.MOD_LEFT_GUI -> gui = !gui
                                                }
                                                syncMods()
                                                tryAwaitRelease()
                                                return@detectTapGestures
                                            }
                                            onKeyDown(key.usage)
                                            val released = tryAwaitRelease()
                                            onKeyUp(key.usage)
                                            if (!released) {
                                                // cancelled
                                            }
                                            // one-shot clear sticky shift after letter
                                            if (shift && key.usage >= HidKeys.A && key.usage <= HidKeys.Z) {
                                                shift = false
                                                syncMods()
                                            }
                                        },
                                    )
                                },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            key.label,
                            color = if (active) Color.White else SkitzInk,
                            fontWeight = FontWeight.Bold,
                            fontSize = if (key.label.length > 3) 11.sp else 14.sp,
                        )
                    }
                }
            }
        }

        Text(
            "Hold keys for repeat · ⇧ Ctrl Alt Win stick until tapped again",
            color = SkitzMuted,
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace,
        )
    }
}

