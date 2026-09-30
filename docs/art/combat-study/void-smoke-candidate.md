# Void smoke body prototype

`src/rendering/CombatSmoke.js` supplies a reusable local-space volume renderer.
`tools/combat-art/voidSmokeSpecs.json` describes the first two silhouettes from
the canonical monster image descriptions: the cat-sized, asymmetric Void Trace
and the upright Void Spawn column. Neither has eyes, a face or clothing.
The geometry, shader and silhouette data are original; no downloaded asset or
new dependency is used.

`void-smoke-candidate.png` shows the actual WebGL render on a diagnostic floor.
Each volume uses one box draw call and 48 density samples along the view ray.
Noise moves through the silhouette rather than moving an entire rigid body up
and down. The renderer supports independent clocks and opacity per creature,
and transforms the camera into each volume's local frame so actor rotation,
translation and scale do not distort ray entry/exit.

Void Trace and Void Spawn are now registered in combat and available by name
in the study selector. They share `smoke-rig-v1.glb`: an original node rig with
idle, forward touch, hit recoil and dissolving defeat clips. Each instance has
independent opacity and motion. The model's core supplies its effect anchor.
Hunter, Shaper and Titan now use the same rig with separate data-authored
silhouettes. Hunter is human-height; Shaper is broader and taller; Titan's upper
silhouette reaches roughly 6.1 metres. Their strike moves the arm density toward
the target and down to human torso height, with a connecting shoulder volume.
This avoids stretching the whole giant body or striking above the victim.
More edge tendrils and environmental frost remain unfinished. Prone uses cards.

The Shaper and Titan's named pulse actions use a new original pulse clip and the
existing targeted spell effect. The engine currently resolves those special
attacks against one target; the art does not imply additional area damage or
implement the description-only movement effects. The area-mechanics gap is
tracked separately in issue #48.

The renderer now samples opaque scene depth, so bodies and scenery can obscure
part or all of a volume. A depth pass runs only in scenes containing smoke.
Rays reconstruct their origin from the camera near plane, supporting both the
combat orthographic camera and perspective inspection. The depth pass excludes
transparent surfaces; interactions between overlapping translucent effects are
still governed by ordinary object sorting rather than a unified volume solver.

The browser compiled and rendered both volumes without JavaScript or shader
errors. The isolated scene used four draw calls: floor, grid and two volumes.
CPU submission timings are not GPU frame-time evidence. Tests cover actor transforms,
independent animation state, GPU resource disposal and authored bounds.

## Integration evidence

- Both canonical creatures passed real browser attack, incoming-hit and zero-HP
  dissolution checks without page or shader errors. Captures: `live-voidTrace.png`
  and `live-voidSpawn.png`.
- GPU pixel checks put a red opaque plane in front of, halfway through and behind
  a volume. The foreground plane stays unobscured; the intersecting and rear planes
  receive successively more smoke occlusion, for both camera types.
- Real asset/animator tests verify attack extension, recovery, hit response,
  defeat opacity, revival and independence between two instances.
- Full suite: 1,071 tests passed. Changed JavaScript has no lint errors; existing
  repository lint failures remain elsewhere. Legal verification passed.
- A six-Spawn, two-humanoid waystation check at a 1280 × 900 browser viewport
  completed six sampled depth-plus-main renders in 2.7–4.1 ms each after warmup,
  with `gl.finish()` included. This is a narrow headless Chromium measurement,
  not a general hardware frame-rate guarantee or a large-volume stress test.

No combat rules changed. The existing Void Presence condition and canonical
Void Touch remain engine-owned; this integration adds their creature bodies.

The larger forms passed browser melee/pulse (where available), incoming-hit and
zero-HP dissolution checks without page or shader errors. The Titan's strike in
the grassland scene reaches within 0.25 metres horizontally of the human target's
centre, at roughly 1.27 metres above the floor. This is body-volume contact, not
a rigid articulated fist. `live-voidTitan-contact-grassland.png` records impact;
`live-voidHunter.png`, `live-voidShaper.png` and `live-voidTitan.png` record the
standard study framing. Tests also guard against lateral or overhead strike
drift and keep animated density lobes inside the rendering bounds.

The larger-form addition passed the full 1,080-test suite. After the final
connecting-volume adjustment, focused smoke, Void and asset checks were rerun.
Changed files have no lint errors and legal verification passed.
