# Campaign levels

Authored chapter layouts for the vertical slice. Code: `scripts/systems/campaign/campaign_level_catalog.gd`.

**Signal Awakening** (`ch_signal`) — 7 levels teaching swipe → laser → mirror → switch/door → color block → capstone.

Launch via Level Select → `GameServices.set_launch_play({mode:"campaign", ...})` → `concept_play_slice`.
