# Traveller animation candidate

Rebuild without Blender or added packages:

```sh
node tools/combat-art/retarget_humanoid.mjs
node tools/combat-art/retarget_humanoid.check.mjs
```

Input: original `traveller-v1.glb` plus the recorded CC0 Quaternius UAL1 Standard source. Output: `traveller-animated.glb`; the original asset is untouched. The original geometry, material/texture payload, skeleton, skin weights and named sockets are preserved byte-for-byte where applicable. New animation data is appended.

The retarget corrects the source's −Z facing and T-pose arms against the target's +Z facing and hanging arms. Joint world frames preserve segment direction and source twist. Hip motion rotates around the anatomical hip despite the target's ground-level root. Two-bone knee constraints preserve the source ankle trajectories and account for the traveller's wider hips and boot soles. Source clavicles, fingers and toes have no equivalent target joints, and cannot be retained independently.

## Available clips

| Use | Exact clip |
| --- | --- |
| Sword combat guard | `Sword_Idle` |
| Locomotion | `Walk_Loop` |
| Sword strike and return | `Sword_Attack` |
| Upper-body damage reaction | `Hit_Chest` |
| Fall and remain down | `Death01` |
| Relaxed noncombat stance | `Idle_Loop` |
| One-handed firearm guard/fire | `Pistol_Idle_Loop`, `Pistol_Shoot` |
| Spell guard/cast | `Spell_Simple_Idle_Loop`, `Spell_Simple_Shoot` |
| Unarmed actions | `Punch_Jab`, `Punch_Cross` |

Pistol motion is not a complete rifle/carbine two-hand profile. No bow motion is provided. Keep these coverage gaps explicit instead of labeling these clips as universal weapon support. `Hit_Chest` ends in a recoiled pose and needs a blend back to guard. Death needs LoopOnce with final-frame clamping. The sword guard is deliberately lower than the previous neutral stance; visual acceptance is still required.

## Runtime integration contract

Use one mixer per cloned rig, and do not overwrite the animated bones with the old procedural pose each frame. `Grip.L` and `Grip.R` retain their names. Existing static weapon socket Euler offsets were calibrated for a different pose controller and require visual recalibration; preserved names are not proof of correct weapon alignment. The new hand tracks include the horizontal-source-to-hanging-target bind correction.

Root translation includes source hip movement around a stationary encounter origin; keep the scene's engagement travel on its outer actor group. `Walk_Loop` is in-place: synchronize playback speed to scene translation. Attack has authored lunging/root offsets (right hand's farthest-forward sample is around0.30 seconds); impact timing and encounter clearance must be checked against the actual weapon blade and defender, not merely clip midpoint. Do not extract or double-apply the root offsets as gameplay movement.

The report measures every baked frame, including boot sole corners and idle ankle drift. The test checks that payload preservation and quaternion validity survive serialization. These checks do **not** prove realistic motion, collision-free clothing or correct weapon grip. Inspect guard, walking, attack, hit, death and their blends at normal gameplay camera distance before enabling the candidate.
