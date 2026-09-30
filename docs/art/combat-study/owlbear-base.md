# Owlbear combat integration

The owlbear now uses a dedicated textured body in the runtime monster catalogue
and the combat study's **Owlbear** encounter. Canonical Beak and Claws actions
select separate motions; idle, walking, recoil and defeat are included. Prone
continues to use cards until a suitable creature pose exists.

The body and original UV texture come from Wildfire Games' 0 A.D. brown bear,
under CC BY-SA 3.0. Exact files, hashes and licence are retained in
`tools/combat-art/sources/0ad-bear/`. The combined owlbear derivative and its
renders remain CC BY-SA 3.0, separately from the game's code licence.

Rebuild in order:

1. `convert_bear_candidate.py` in Blender, then `node tools/combat-art/ground_bear_candidate.mjs`.
2. `node tools/combat-art/build_owlbear.mjs`.
3. `node tools/combat-art/ground_bear_candidate.mjs tools/combat-art/owlbear-candidate.glb OwlbearGround`.
4. `node tools/combat-art/package_owlbear.mjs`.

The original bear face is removed by head skin weights. Original owl skull,
facial discs, gold eyes, hooked upper and lower beak, and neck feathers follow
the existing rig. Placement uses the actual idle pose, not the differently angled
bind pose. The feather albedo and exact generation prompt are recorded in
`owl-feathers-v1.md`. The bear body texture remains unchanged.

Beak is a new head-led motion; Claws reuses the source paw swipe. The six selected
runtime clips have sampled ground correction. Independent tests sample between
authoring frames, including defeat, and check that the beak actually moves.
The runtime pack discards unused clips and buffers while preserving both embedded
textures. Its current size is about 5.3 MiB.

`owlbear-candidate-poses.png` shows six actual rendered poses.
`live-owlbear-beak-grassland.png` shows the runtime Beak impact: the beak marker
is 0.20 m horizontally from the target centre and 0.07 m below its effect anchor.
Both canonical attacks were played to completion in the browser without page or
shader errors. This is first-pass anatomy and surface work, not final art.

Claws contact uses 60% of the source swipe, when the right paw crosses the target,
rather than its earlier wind-up. The wrist marker is 0.24 m horizontally from the
target centre and 0.13 m above its effect anchor at the cue. See
`live-owlbear-claws-grassland.png`.

Validation: 1,085 tests across 86 files pass. Changed authoring scripts and tests
lint cleanly. Repository lint still reports its existing 203 errors (858 warnings).
Legal verification passes all 12 checks, with existing audio-attribution and SBOM
freshness warnings. The study was checked at 1024×768 and 1280×900; desktop
hardware performance and full natural encounter traversal remain outside this check.
