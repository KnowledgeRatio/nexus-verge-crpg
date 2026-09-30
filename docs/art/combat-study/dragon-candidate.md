# Shared dragon candidate

2026-09-27. Shared first-pass runtime asset for the three canonical young dragons.
The previously retained Quaternius cartoon dragon remains
rejected because it lacks the necessary grounded combat clips.

The new source is [Cethiel's Dragon 3D](https://opengameart.org/content/cethiels-dragon-3d),
released under CC0 by Drummyfish and Cethiel. Source files, provenance and hashes
are retained under `tools/combat-art/sources/cethiel-dragon/`. Inspection confirmed
four legs, separate wings, 32 bones, a painted texture and four source actions.

Rebuild:

1. Run Blender with `--background --factory-startup --disable-autoexec --threads 1
   --python tools/combat-art/export_dragon_candidate.py`.
2. Run `node tools/combat-art/build_dragon_candidate.mjs`.
3. Run `node tools/combat-art/ground_bear_candidate.mjs tools/combat-art/dragon-candidate.glb DragonGround`.
4. Copy `tools/combat-art/dragon-candidate.glb` to `data/graphics/combat/dragon-v1.glb`.

The exporter keeps the body/rig, removes preview helpers from its in-memory copy,
and connects the original texture to a PBR material. It never saves source files.
The resulting candidate is about 0.75 MB, including the unchanged embedded PNG.

Source Idle, Walk, Attack and Die are retained. Attack is a downward bite, with a
useful impact around 64% of the clip. Original additions are Dragon_Claw (0.9 s,
impact 50%), Dragon_Breath (1.2 s, release 45%) and Dragon_Hit (0.35 s). They keep
the supporting body pose while moving the relevant leg, neck or jaw. Mouth and
claw sockets support later contact and effect calibration. Grounding is sampled
at 60 Hz without rewriting the original skeleton tracks.

Browser captures: `dragon-source-poses.png` and `dragon-authored-poses.png`.
They use scale 4 for inspection, not a final encounter scale. Tests verify source
hashes, byte-identical texture retention, floor contact throughout every clip,
and distinct jaw/foreleg movement. These checks do not prove encounter contact,
framing or effect timing.

The shared asset loader now accepts per-material palettes. Authoring values in
`tools/combat-art/dragonPalettes.json` produce red, forest-green and ice-white
scales while retaining the original texture detail. A browser check rendered all
three together through `CombatArtAssets` without shader errors, sharing one
geometry and texture with three cached materials. See
`dragon-palette-candidates.png`. These are colour candidates; the shared horns
and neck still need species-specific review, especially the green dragon's frill.
The palettes are registered in runtime appearance data. Each dragon uses the same
download and geometry, with its own cached material. Normal encounter snapshots
select these appearances from canonical monster IDs. The combat study includes
all three dragons and their canonical Bite, Claw and breath actions.

Runtime scale is 4 with a radius-3 footprint to retain the tail in the camera
envelope. Bite uses the source attack at 64%; Claw adds an inward shoulder swing
so the forepaw reaches the recipient instead of passing alongside them. Breath
uses the mouth socket and a directed, soft particle stream. Its first arrival
triggers impact feedback; the remaining emission continues for 0.35 seconds.
Particle resources are released on completion, skipping and scene disposal.
Browser flows exercised all three dragons through all actions and defeat.

Remaining refinements include species-specific anatomy and grounded condition
poses. Prone currently switches to cards, explicitly declared in appearance data.
The current
rules engine resolves special breath actions against one target; descriptive
cones and recharge are not structured area mechanics. Presentation must not
claim to damage an area until the underlying mechanics support it.
