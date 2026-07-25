# Object icon atlas
#
# ## Hand-painted drop-in (optional)
# Authored neon PNGs replace procedural bakes automatically — no code change.
# Place files here as `<occupant_id>.png` (48×48 RGBA preferred; 96×96 ok).
# Examples: `laser_emitter.png`, `mirror.png`, `block_red.png`, `align_a.png`.
# `ObjectIconAtlas.texture_for` checks this folder first, then falls back to bake.
#
# Bake procedural set (3× supersample → Lanczos downscale):
#   godot --headless -s res://tools/developer/bake_object_icons.gd
#
# Current bake includes: laser_emitter/receiver, mirrors, magnet, ghost, time,
# door, switch, plate, teleporter, color blocks, crate, wall, ice, fire, enemy,
# Align palette A–F (distinct silhouettes for Daily/Endless).
