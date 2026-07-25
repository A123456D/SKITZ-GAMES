class_name SaveSchema
extends RefCounted
## Player profile save schema constants. Board puzzles use BoardSerializer separately.

const FORMAT_ID := "shiftr_profile"
## Bump when adding required fields; add a migrator step in SaveMigrator.
const CURRENT_VERSION := 5

## v1: settings + currencies + chapter progress stubs
## v2: achievements progress map + daily streak
## v3: privacy consent + cloud sync prefs + leaderboard cache keys
## v4: campaign resume payload (last level / board snapshot) + world_skin
## v5: daily seed completion + endless wave best
## Chapter level stars live under campaign.chapters[id].levels (no schema bump).
