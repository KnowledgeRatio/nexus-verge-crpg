# Grounded goblin and undead coverage

Kobold now uses `kobold-grounded.glb`, retaining the original reptilian features,
tail mesh and standing clips. Its authoring specification supplies tail droop,
clearance and sway parameters. New grounded clips counter pelvis rotation and
flatten the tail near the supporting plane; collapsed defeat stops the sway.
The original source model is retained unchanged. All previously packaged shared
grounded derivatives rebuild byte-identically with this helper extension.

`CombatKobold.test.js` now checks the runtime asset across all original and added
clips, ensuring that tail clearance does not lift the body off the floor. The
canonical encounter snapshot admits prone, dagger and sling. Live runtime
captures are `grounded-kobold-action-0.png`, `grounded-kobold-action-1.png` and
`grounded-kobold-defeat.png`; both actions and defeat passed without page errors.
This does not add crawling motion, and exact short-weapon contact remains an
existing limitation of the shared grounded poses.

After the kobold addition: 1,206 tests pass. Legal verification passes. The
repository lint totals remain at their existing 203 standard and 3,279 broad
errors; the changed kobold and authoring files have no new lint errors.

Medusa additionally uses `medusa-grounded.glb`. The same authoring helper now
samples explicitly configured morph nodes alongside the body motion, preserving
her nine serpent shapes and strike timing. Her supported torso leans forward
so the head-led attack extends toward the opponent rather than behind her feet.
That adjustment fades out through recovery/defeat. Existing goblin and undead
derivatives rebuilt byte-identically after the helper extension.

`CombatMedusa.test.js` checks serpent extension in the grounded strike and
relaxation on defeat; the shared derivative tests check original track/geometry
preservation and floor support across every new clip. Browser captures are
`grounded-medusa-action-0.png` (bow), `grounded-medusa-action-1.png` (Snake Hair)
and `grounded-medusa-defeat.png`. Contact remains approximate; this pass does
not add crawling locomotion or new monster mechanics.

After the Medusa addition: 1,204 tests pass and legal verification passes.
The final browser run used the packaged runtime URL/configuration, with both
canonical attacks and grounded defeat passing without page errors. Standard
and broad lint totals remain unchanged from the existing repository baseline.

The goblin, skeleton, wight and zombie runtime entries now use `*-grounded.glb`
derivatives. Both canonical goblin types share the goblin body. No monster rules,
equipment or actions were changed.

`groundedHumanoidSpecs.json` names the stable source assets. Running
`node tools/combat-art/build_grounded_humanoids.mjs` produces candidate GLBs and
motion metadata under `tools/combat-art/`. After validation, copy each candidate
to its configured runtime path and apply the generated motion metadata to its
model entry in `data/combatScene.json`. The source `*-v1.glb` files are retained.

The same request/profile helper is used by the traveller authoring pipeline.
Rebuilding the traveller after this extraction produced a byte-identical asset.
The new body derivatives preserve their original meshes and every original clip
track. Only added `Ground_` clips receive the new grounding correction. Zombie
uses its own idle arm posture; all four retain their existing action timing.

`GroundedHumanoids.test.js` checks the packaged asset bytes and metadata against
the candidates, original mesh/track preservation, floor support throughout all
grounded clips, recovery and grounded defeat. Browser captures use canonical
monster records and action selection through `combatActionVisual`:

- `grounded-goblinArcher-action-0.png` and `-1.png`: shortbow and scimitar.
- `grounded-skeleton-action-0.png` and `-1.png`: shortsword and shortbow.
- `grounded-wight-action-0.png` through `-2.png`: longsword, longbow, life drain.
- `grounded-zombie-action-0.png`: slam.
- `grounded-*-defeat.png`: the separate collapsed pose after zero HP.

These poses do not provide crawling locomotion. Exact short-weapon contact is
still approximate, as for the shared traveller. Other creature rigs and the
remaining prone card fallbacks have not been changed by this pass.

Validation: 1,160 tests pass; legal verification passes. Changed authoring/test
files lint cleanly. Repository-wide lint retains its existing 203 standard and
3,279 broader errors. The final browser pass used the packaged runtime URLs and
configuration without interception; all eight canonical attacks and all four
grounded defeat transitions passed.
