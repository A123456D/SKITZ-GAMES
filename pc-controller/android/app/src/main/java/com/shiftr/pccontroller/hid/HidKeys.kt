package com.shiftr.pccontroller.hid

/** USB HID keyboard usage IDs. */
object HidKeys {
    const val NONE: Byte = 0x00
    const val A: Byte = 0x04
    const val B: Byte = 0x05
    const val C: Byte = 0x06
    const val D: Byte = 0x07
    const val E: Byte = 0x08
    const val F: Byte = 0x09
    const val G: Byte = 0x0A
    const val H: Byte = 0x0B
    const val I: Byte = 0x0C
    const val J: Byte = 0x0D
    const val K: Byte = 0x0E
    const val L: Byte = 0x0F
    const val M: Byte = 0x10
    const val N: Byte = 0x11
    const val O: Byte = 0x12
    const val P: Byte = 0x13
    const val Q: Byte = 0x14
    const val R: Byte = 0x15
    const val S: Byte = 0x16
    const val T: Byte = 0x17
    const val U: Byte = 0x18
    const val V: Byte = 0x19
    const val W: Byte = 0x1A
    const val X: Byte = 0x1B
    const val Y: Byte = 0x1C
    const val Z: Byte = 0x1D
    const val NUM_1: Byte = 0x1E
    const val NUM_2: Byte = 0x1F
    const val NUM_3: Byte = 0x20
    const val NUM_4: Byte = 0x21
    const val NUM_5: Byte = 0x22
    const val NUM_6: Byte = 0x23
    const val NUM_7: Byte = 0x24
    const val NUM_8: Byte = 0x25
    const val NUM_9: Byte = 0x26
    const val NUM_0: Byte = 0x27
    const val ENTER: Byte = 0x28
    const val ESCAPE: Byte = 0x29
    const val BACKSPACE: Byte = 0x2A
    const val TAB: Byte = 0x2B
    const val SPACE: Byte = 0x2C
    const val MINUS: Byte = 0x2D
    const val EQUAL: Byte = 0x2E
    const val LEFT_BRACKET: Byte = 0x2F
    const val RIGHT_BRACKET: Byte = 0x30
    const val BACKSLASH: Byte = 0x31
    const val SEMICOLON: Byte = 0x33
    const val APOSTROPHE: Byte = 0x34
    const val GRAVE: Byte = 0x35
    const val COMMA: Byte = 0x36
    const val DOT: Byte = 0x37
    const val SLASH: Byte = 0x38
    const val CAPS_LOCK: Byte = 0x39
    const val F1: Byte = 0x3A
    const val F2: Byte = 0x3B
    const val F3: Byte = 0x3C
    const val F4: Byte = 0x3D
    const val F5: Byte = 0x3E
    const val F6: Byte = 0x3F
    const val F7: Byte = 0x40
    const val F8: Byte = 0x41
    const val F9: Byte = 0x42
    const val F10: Byte = 0x43
    const val F11: Byte = 0x44
    const val F12: Byte = 0x45
    const val HOME: Byte = 0x4A
    const val PAGE_UP: Byte = 0x4B
    const val END: Byte = 0x4D
    const val PAGE_DOWN: Byte = 0x4E
    const val DELETE: Byte = 0x4C
    const val RIGHT: Byte = 0x4F
    const val LEFT: Byte = 0x50
    const val DOWN: Byte = 0x51
    const val UP: Byte = 0x52

    const val MOD_LEFT_CTRL: Byte = 0x01
    const val MOD_LEFT_SHIFT: Byte = 0x02
    const val MOD_LEFT_ALT: Byte = 0x04
    const val MOD_LEFT_GUI: Byte = 0x08
    const val MOD_RIGHT_CTRL: Byte = 0x10
    const val MOD_RIGHT_SHIFT: Byte = 0x20
    const val MOD_RIGHT_ALT: Byte = 0x40
    const val MOD_RIGHT_GUI: Byte = 0x80.toByte()

    fun fromDomCode(code: String): Pair<Byte, Byte> {
        // returns usage to modifier
        return when (code) {
            "KeyA" -> A to 0
            "KeyB" -> B to 0
            "KeyC" -> C to 0
            "KeyD" -> D to 0
            "KeyE" -> E to 0
            "KeyF" -> F to 0
            "KeyG" -> G to 0
            "KeyH" -> H to 0
            "KeyI" -> I to 0
            "KeyJ" -> J to 0
            "KeyK" -> K to 0
            "KeyL" -> L to 0
            "KeyM" -> M to 0
            "KeyN" -> N to 0
            "KeyO" -> O to 0
            "KeyP" -> P to 0
            "KeyQ" -> Q to 0
            "KeyR" -> R to 0
            "KeyS" -> S to 0
            "KeyT" -> T to 0
            "KeyU" -> U to 0
            "KeyV" -> V to 0
            "KeyW" -> W to 0
            "KeyX" -> X to 0
            "KeyY" -> Y to 0
            "KeyZ" -> Z to 0
            "Digit1" -> NUM_1 to 0
            "Digit2" -> NUM_2 to 0
            "Digit3" -> NUM_3 to 0
            "Digit4" -> NUM_4 to 0
            "Digit5" -> NUM_5 to 0
            "Digit6" -> NUM_6 to 0
            "Digit7" -> NUM_7 to 0
            "Digit8" -> NUM_8 to 0
            "Digit9" -> NUM_9 to 0
            "Digit0" -> NUM_0 to 0
            "Enter" -> ENTER to 0
            "Escape" -> ESCAPE to 0
            "Backspace" -> BACKSPACE to 0
            "Tab" -> TAB to 0
            "Space" -> SPACE to 0
            "Minus" -> MINUS to 0
            "Equal" -> EQUAL to 0
            "BracketLeft" -> LEFT_BRACKET to 0
            "BracketRight" -> RIGHT_BRACKET to 0
            "Backslash" -> BACKSLASH to 0
            "Semicolon" -> SEMICOLON to 0
            "Quote" -> APOSTROPHE to 0
            "Backquote" -> GRAVE to 0
            "Comma" -> COMMA to 0
            "Period" -> DOT to 0
            "Slash" -> SLASH to 0
            "Delete" -> DELETE to 0
            "ArrowUp" -> UP to 0
            "ArrowDown" -> DOWN to 0
            "ArrowLeft" -> LEFT to 0
            "ArrowRight" -> RIGHT to 0
            "F1" -> F1 to 0
            "F2" -> F2 to 0
            "F3" -> F3 to 0
            "F4" -> F4 to 0
            "F5" -> F5 to 0
            "F6" -> F6 to 0
            "F7" -> F7 to 0
            "F8" -> F8 to 0
            "F9" -> F9 to 0
            "F10" -> F10 to 0
            "F11" -> F11 to 0
            "F12" -> F12 to 0
            "Home" -> HOME to 0
            "End" -> END to 0
            "PageUp" -> PAGE_UP to 0
            "PageDown" -> PAGE_DOWN to 0
            "ShiftLeft" -> NONE to MOD_LEFT_SHIFT
            "ShiftRight" -> NONE to MOD_RIGHT_SHIFT
            "ControlLeft" -> NONE to MOD_LEFT_CTRL
            "ControlRight" -> NONE to MOD_RIGHT_CTRL
            "AltLeft" -> NONE to MOD_LEFT_ALT
            "AltRight" -> NONE to MOD_RIGHT_ALT
            "MetaLeft", "OSLeft" -> NONE to MOD_LEFT_GUI
            "MetaRight", "OSRight" -> NONE to MOD_RIGHT_GUI
            else -> NONE to 0
        }
    }
}
