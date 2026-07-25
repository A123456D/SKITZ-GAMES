class_name AnalyticsEvents
extends RefCounted
## Canonical event names (GDD §21.7). Keep stable for dashboards.

const SESSION_START := "session_start"
const SESSION_END := "session_end"
const LEVEL_START := "level_start"
const LEVEL_CLEAR := "level_clear"
const LEVEL_FAIL := "level_fail"
const MOVES := "moves"
const UNDO := "undo"
const HINT := "hint"
const IAP_SUCCESS := "iap_success"
const DAILY_CLEAR := "daily_clear"
const ENDLESS_OVER := "endless_over"
const ACHIEVEMENT_UNLOCK := "achievement_unlock"
const CLOUD_SYNC := "cloud_sync"
const PRIVACY_CONSENT := "privacy_consent"
const LOCALE_CHANGED := "locale_changed"
