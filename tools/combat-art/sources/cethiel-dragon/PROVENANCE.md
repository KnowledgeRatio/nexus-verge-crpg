# Cethiel's Dragon 3D

Creators: Drummyfish (3D model, texture and animation), Cethiel (original dragon).
Creator listing: https://opengameart.org/content/cethiels-dragon-3d
Downloaded 2026-09-27 from
https://opengameart.org/sites/default/files/dragon_oga.zip

The creators explicitly release this rigged and animated model and its two
textures under CC0. The page identifies credit as optional; this project credits
both authors. Licence: https://creativecommons.org/publicdomain/zero/1.0/

Archive SHA-256:
`f6a8c25dd3b2abdb1e7830b0b88f9083052c0750e710e6439eceb320783a57c1`

All eleven archive members are retained unchanged. `SHA256SUMS.json` records their
hashes. No embedded scripts are run. Inspection/export uses Blender 4.5.9 with
`--background --factory-startup --disable-autoexec --threads 1` and explicitly
opens the file with `use_scripts=False`.

`inspect_dragon.py` identifies a four-legged, winged rig with 32 bones and Attack,
Die, Idle and Walk actions. `export_dragon_candidate.py` removes preview/helper
objects from the in-memory copy and converts the body material to PBR using the
original dragon.png; it never saves changes to the source blend files.

The grounded derivative is packaged as `data/graphics/combat/dragon-v1.glb`.
Runtime mappings and verification evidence are documented in
`docs/art/combat-study/dragon-candidate.md`. Species-specific anatomy and prone
poses remain incomplete; source provenance alone is not proof of combat coverage.
