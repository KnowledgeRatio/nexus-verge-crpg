# Shared traveller grounded motion

The runtime asset is `data/graphics/combat/traveller-grounded.glb`. It retains
the modular clothing and hair meshes from `traveller-modular.glb`, and every
existing animation track. Only the newly authored `Ground_` clips receive the
additional floor correction. The same attributed CC0 source motions are used.

Rebuild from the unchanged modular source:

```sh
node tools/combat-art/build_traveller_grounded.mjs
cp tools/combat-art/traveller-grounded-candidate.glb data/graphics/combat/traveller-grounded.glb
```

The source recovery clip supplies a supported, low torso and leg pose. Arm
motion is transferred from the equipped action; the body stays down. Separate
grounded rest clips cover ranged weapons, two-handed weapons and shields.
Recovery continues the source get-up motion from that supported pose. Defeat
reverses the initial portion towards a collapsed pose instead of starting a
standing death clip.

Runtime condition metadata selects the clips and opts into weapon aiming while
grounded. Standing head/hand posture corrections stay disabled in this state.
A condition-specific bow mount rotates the bow sideways without changing its
forward shooting direction. This is presentation only; no weapon, condition,
targeting or movement rule is changed.

Verification captures are `grounded-traveller-*-idle.png` and
`grounded-traveller-*-impact.png`, from the real runtime renderer in a browser
harness. The full suite passes 1,151 tests. Legal verification passes. Existing
repository lint failures remain (203 standard / 3,279 broader lint errors).
The changed authoring scripts and new grounded-motion test lint cleanly.

Known limits: short-weapon contact still needs refinement, and prone travel
uses the existing presentation movement rather than a crawl. Separate creature
derivative GLBs have not inherited these new clips. See `coverage-audit.md`.
