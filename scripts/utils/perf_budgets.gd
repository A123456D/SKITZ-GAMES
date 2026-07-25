class_name PerfBudgets
extends Object
## Mobile mid-tier budgets (GDD §21.4). Use in overlays + docs verification.

const TARGET_FPS_MIN := 60
const TARGET_FPS_IDEAL := 120
const FRAME_MS_60 := 16.67
const FRAME_MS_120 := 8.33

const MAX_DRAW_CALLS_PLAY := 50
const MAX_AMBIENT_PARTICLES_HIGH := 18
const MAX_AMBIENT_PARTICLES_MED := 8
const MAX_BOARD_BURST_SAMPLES := 4
const MAX_AUDIO_VOICES := 24
const AUDIO_POOL_SIZE := 16
const TRAIL_POOL_SIZE := 24
const TILE_POOL_WARM := 64 ## 8×8 board
const MAX_ACTIVE_BEAMS := 8 ## mobile 60fps soft cap; Low uses fewer
const MAX_ACTIVE_BEAMS_LOW := 3
const ICON_GLOW_PROCESS_CAP := 24 ## max tiles running soft-glow _process

const SIM_CPU_MS := 0.5
const CASCADE_CPU_MS := 2.0

## Soft texture memory guidance (MB) for playable + UI chrome.
const TEXTURE_MB_SOFT_CAP := 48.0
