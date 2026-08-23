package com.shiftr.pccontroller.hid

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.widget.Button
import android.widget.LinearLayout

/**
 * Native on-screen keyboard. Finger down = HID key down, finger up = HID key up.
 * No WebView, no Capacitor, no queued synthetic taps.
 */
class NativeKeyboardView(
    context: Context,
    private val controller: () -> HidController?,
    private val onClose: () -> Unit,
) : LinearLayout(context) {
    private enum class Deck { Letters, Numbers, Symbols }

    private data class KeySpec(
        val label: String,
        val code: String? = null,
        val shift: Boolean = false,
        val deck: Deck? = null,
        val weight: Float = 1f,
        val accent: Boolean = false,
    )

    private val letters =
        listOf(
            listOf(
                KeySpec("Esc", "Escape", weight = 1.2f),
                KeySpec("Tab", "Tab", weight = 1.2f),
                KeySpec("⌫", "Backspace", weight = 1.2f),
                KeySpec("⏎", "Enter", weight = 1.2f),
            ),
            "QWERTYUIOP".map { KeySpec(it.toString(), "Key$it") },
            "ASDFGHJKL".map { KeySpec(it.toString(), "Key$it") },
            listOf(
                KeySpec("⇧", "ShiftLeft", weight = 1.4f),
                *"ZXCVBNM".map { KeySpec(it.toString(), "Key$it") }.toTypedArray(),
                KeySpec("⇧", "ShiftRight", weight = 1.4f),
            ),
            listOf(
                KeySpec("?123", deck = Deck.Numbers, weight = 1.4f, accent = true),
                KeySpec(",", "Comma"),
                KeySpec("Space", "Space", weight = 3.2f),
                KeySpec(".", "Period"),
                KeySpec("?", "Slash", shift = true, weight = 1.2f),
            ),
        )

    private val numbers =
        listOf(
            listOf(
                KeySpec("Esc", "Escape", weight = 1.2f),
                KeySpec("Tab", "Tab", weight = 1.2f),
                KeySpec("⌫", "Backspace", weight = 1.2f),
                KeySpec("⏎", "Enter", weight = 1.2f),
            ),
            (1..9).map { KeySpec(it.toString(), "Digit$it") } + KeySpec("0", "Digit0"),
            listOf(
                KeySpec("-", "Minus"),
                KeySpec("/", "Slash"),
                KeySpec(":", "Semicolon", shift = true),
                KeySpec(";", "Semicolon"),
                KeySpec("(", "Digit9", shift = true),
                KeySpec(")", "Digit0", shift = true),
                KeySpec("$", "Digit4", shift = true),
                KeySpec("&", "Digit7", shift = true),
                KeySpec("@", "Digit2", shift = true),
                KeySpec("\"", "Quote", shift = true),
            ),
            listOf(
                KeySpec("#+=", deck = Deck.Symbols, weight = 1.4f, accent = true),
                KeySpec(".", "Period"),
                KeySpec(",", "Comma"),
                KeySpec("?", "Slash", shift = true),
                KeySpec("!", "Digit1", shift = true),
                KeySpec("'", "Quote"),
            ),
            listOf(
                KeySpec("ABC", deck = Deck.Letters, weight = 1.4f, accent = true),
                KeySpec("Space", "Space", weight = 3.2f),
                KeySpec("⏎", "Enter", weight = 1.4f),
            ),
        )

    private val symbols =
        listOf(
            listOf(
                KeySpec("Esc", "Escape", weight = 1.2f),
                KeySpec("Tab", "Tab", weight = 1.2f),
                KeySpec("⌫", "Backspace", weight = 1.2f),
                KeySpec("⏎", "Enter", weight = 1.2f),
            ),
            listOf(
                KeySpec("[", "BracketLeft"),
                KeySpec("]", "BracketRight"),
                KeySpec("{", "BracketLeft", shift = true),
                KeySpec("}", "BracketRight", shift = true),
                KeySpec("#", "Digit3", shift = true),
                KeySpec("%", "Digit5", shift = true),
                KeySpec("^", "Digit6", shift = true),
                KeySpec("*", "Digit8", shift = true),
                KeySpec("+", "Equal", shift = true),
                KeySpec("=", "Equal"),
            ),
            listOf(
                KeySpec("_", "Minus", shift = true),
                KeySpec("\\", "Backslash"),
                KeySpec("|", "Backslash", shift = true),
                KeySpec("~", "Backquote", shift = true),
                KeySpec("`", "Backquote"),
                KeySpec("<", "Comma", shift = true),
                KeySpec(">", "Period", shift = true),
                KeySpec("@", "Digit2", shift = true),
                KeySpec("!", "Digit1", shift = true),
                KeySpec("?", "Slash", shift = true),
            ),
            listOf(
                KeySpec("?123", deck = Deck.Numbers, weight = 1.4f, accent = true),
                KeySpec(".", "Period"),
                KeySpec(",", "Comma"),
                KeySpec("'", "Quote"),
                KeySpec("\"", "Quote", shift = true),
                KeySpec(";", "Semicolon"),
            ),
            listOf(
                KeySpec("ABC", deck = Deck.Letters, weight = 1.4f, accent = true),
                KeySpec("Space", "Space", weight = 3.2f),
                KeySpec("⏎", "Enter", weight = 1.4f),
            ),
        )

    private val keysHost = LinearLayout(context)
    private var deck = Deck.Letters
    private var shiftHeld = 0
    private var tempShift = false
    private var handleDownY = 0f

    init {
        orientation = VERTICAL
        setBackgroundColor(Color.parseColor("#F20C0F12"))
        setPadding(dp(6), dp(4), dp(6), dp(10))
        isClickable = true
        elevation = dp(24).toFloat()

        addView(makeHandle(), LayoutParams(LayoutParams.MATCH_PARENT, dp(28)))
        keysHost.orientation = VERTICAL
        addView(keysHost, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))
        renderDeck()
    }

    fun reset() {
        releaseAll()
        translationY = 0f
        if (deck != Deck.Letters) {
            deck = Deck.Letters
            renderDeck()
        }
    }

    private fun makeHandle(): View {
        val wrap = LinearLayout(context).apply {
            gravity = Gravity.CENTER
            orientation = VERTICAL
        }
        val grip = View(context).apply {
            background = pill(Color.parseColor("#38FFFFFF"), dp(4).toFloat())
        }
        wrap.addView(grip, LayoutParams(dp(42), dp(4)))
        wrap.setOnTouchListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    handleDownY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dy = (event.rawY - handleDownY).coerceAtLeast(0f)
                    translationY = dy
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    if (translationY > dp(64)) {
                        translationY = 0f
                        onClose()
                    } else {
                        animate().translationY(0f).setDuration(160).start()
                    }
                    true
                }
                else -> false
            }
        }
        return wrap
    }

    private fun renderDeck() {
        keysHost.removeAllViews()
        val rows =
            when (deck) {
                Deck.Letters -> letters
                Deck.Numbers -> numbers
                Deck.Symbols -> symbols
            }
        for (row in rows) {
            val line = LinearLayout(context).apply {
                orientation = HORIZONTAL
                gravity = Gravity.CENTER
            }
            val rowLp = LayoutParams(LayoutParams.MATCH_PARENT, dp(46))
            rowLp.bottomMargin = dp(6)
            for (spec in row) {
                line.addView(makeKey(spec), LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, spec.weight).apply {
                    marginStart = dp(3)
                    marginEnd = dp(3)
                })
            }
            keysHost.addView(line, rowLp)
        }
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun makeKey(spec: KeySpec): Button {
        val idle = Color.parseColor("#1D2126")
        val down = Color.parseColor("#ECA33C")
        val labelColor = if (spec.accent) Color.parseColor("#ECA33C") else Color.parseColor("#EEF1F4")
        val btn =
            Button(context, null, android.R.attr.borderlessButtonStyle).apply {
                text = spec.label
                isAllCaps = false
                setTextColor(labelColor)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, if (spec.label.length > 1) 11f else 14f)
                typeface = Typeface.MONOSPACE
                background = pill(idle, dp(10).toFloat())
                setPadding(0, 0, 0, 0)
                stateListAnimator = null
                isSoundEffectsEnabled = false
                isHapticFeedbackEnabled = false
                minHeight = 0
                minimumHeight = 0
            }
        btn.setOnTouchListener { v, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    v.background = pill(down, dp(10).toFloat())
                    (v as Button).setTextColor(Color.parseColor("#1A1208"))
                    press(spec)
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    v.background = pill(idle, dp(10).toFloat())
                    (v as Button).setTextColor(labelColor)
                    release(spec)
                    true
                }
                else -> true
            }
        }
        return btn
    }

    private fun press(spec: KeySpec) {
        if (spec.deck != null) {
            deck = spec.deck
            releaseAll()
            renderDeck()
            return
        }
        val code = spec.code ?: return
        val hid = controller() ?: return
        if (code == "ShiftLeft" || code == "ShiftRight") {
            shiftHeld += 1
            hid.keyEvent(code, true)
            return
        }
        if (spec.shift && shiftHeld == 0) {
            tempShift = true
            hid.keyEvent("ShiftLeft", true)
        }
        hid.keyEvent(code, true)
    }

    private fun release(spec: KeySpec) {
        if (spec.deck != null) return
        val code = spec.code ?: return
        val hid = controller() ?: return
        if (code == "ShiftLeft" || code == "ShiftRight") {
            shiftHeld = (shiftHeld - 1).coerceAtLeast(0)
            hid.keyEvent(code, false)
            return
        }
        hid.keyEvent(code, false)
        if (tempShift) {
            tempShift = false
            hid.keyEvent("ShiftLeft", false)
        }
    }

    private fun releaseAll() {
        val hid = controller() ?: return
        hid.keyEvent("ShiftLeft", false)
        hid.keyEvent("ShiftRight", false)
        shiftHeld = 0
        tempShift = false
        hid.releaseAllKeys()
    }

    private fun pill(color: Int, radius: Float) =
        GradientDrawable().apply {
            setColor(color)
            cornerRadius = radius
        }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}
