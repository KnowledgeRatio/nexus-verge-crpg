# Manticore asset work

2026-09-27. First-pass manticore registered for normal combat and the visual study.

The canonical monster requires a lion body, human-like face with heavy brow and
forward golden eyes, folded grey-purple bat wings, reddish mane and a thick tail
with curved bone spikes. Its implemented actions are Tail Spike, Claw and Bite.
The source actor's idle-as-attack assignment is not suitable combat coverage.

The retained Wildfire Games lion provides a textured, weighted quadruped body,
three idles, walk, run and death. It uses the upstream horse-named skeleton; bone
names alone do not indicate the visible creature. Source licence is CC BY-SA 3.0,
with original files, attribution and hashes retained under
`tools/combat-art/sources/0ad-lion/`.

Rebuild the inspection asset:

1. Run Blender with `--background --factory-startup --disable-autoexec --threads 1
   --python tools/combat-art/convert_lion_candidate.py`.
2. Run `node tools/combat-art/ground_bear_candidate.mjs tools/combat-art/lion-candidate.glb LionGround`.
3. Run `node tools/combat-art/build_manticore.mjs`.
4. Copy `tools/combat-art/manticore-candidate.glb` to `data/graphics/combat/manticore-v1.glb`.

The conversion retains the original texture and UVs. A parent scale of 62
compensates for the imported centimetre unit scale and gives a roughly two-metre
inspection height. The imported material initially had zero opacity despite
valid geometry; the converter explicitly restores opaque fur. The sampled ground
wrapper preserves source clips while removing floor penetration.

`lion-source-poses.png` shows the six retained source motions.
`manticore-candidate-poses.png` shows the authored derivative: short human-like
face, forward golden eyes, folded grey-purple wings, thick curled tail and tapered
bone spikes. The source muzzle and thin tail are removed from the visible faces.
The original textured mane/body remain. Face and membranes still need texture
detail comparable to the body; this is a first-pass asset.

The derivative adds distinct 0.8-second Bite, 0.9-second Claw, 1-second Tail Spike
and 0.35-second hit motion. Bite and claw impact halfway through their clips;
Tail Spike releases at 45%, from the tail socket, followed by 0.3-second projectile
travel. The origin is fixed at release so tail recovery cannot drag the projectile.
These fields are generic presentation data; no per-monster runtime branch was
added. The source death is retained with a wing-fold so the membranes do not prop
the fallen body above the floor.

Tests cover canonical admission/action mapping, tail-origin release timing,
distinct socket motion, the packaged asset and body support through every clip.
Browser flows cover all three attacks and defeat, including contact captures.
Prone remains an explicit card fallback until a suitable grounded pose and actions
exist. The descriptive tail-spike regrowth trait does not add an ammunition system.

The reusable GLB editing/grounding helper is now `glb_derivative.mjs`; rebuilding
the goblin and kobold through it produced byte-identical runtime assets.
