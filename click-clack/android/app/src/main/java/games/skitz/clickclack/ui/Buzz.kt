package games.skitz.clickclack.ui

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext

/** Real device vibration — Compose LocalHapticFeedback is often a no-op on Samsung. */
class Buzz(private val context: Context) {
    private val vibrator: Vibrator? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = context.getSystemService(VibratorManager::class.java)
            manager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Vibrator::class.java)
        }

    private var moveAccum = 0f

    fun click() = pulse(28, 180, heavy = false)

    fun tick() = pulse(14, 90, heavy = false, preferTick = true)

    fun thump() = pulse(42, 255, heavy = true)

    /** Soft textured ticks while the finger travels on the pad. */
    fun moveTick(distancePx: Float, thresholdPx: Float = 28f) {
        moveAccum += distancePx
        while (moveAccum >= thresholdPx) {
            moveAccum -= thresholdPx
            tick()
        }
    }

    fun resetMove() {
        moveAccum = 0f
    }

    private fun pulse(
        ms: Long,
        amplitude: Int,
        heavy: Boolean,
        preferTick: Boolean = false,
    ) {
        val v = vibrator ?: return
        if (!v.hasVibrator()) return
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val effect =
                    when {
                        preferTick -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK)
                        heavy -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK)
                        ms >= 25 -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)
                        else -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK)
                    }
                v.vibrate(effect)
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createOneShot(ms, amplitude.coerceIn(1, 255)))
            } else {
                @Suppress("DEPRECATION")
                v.vibrate(ms)
            }
        } catch (_: Exception) {
        }
    }
}

@Composable
fun rememberBuzz(): Buzz {
    val context = LocalContext.current
    return remember(context) { Buzz(context.applicationContext) }
}
