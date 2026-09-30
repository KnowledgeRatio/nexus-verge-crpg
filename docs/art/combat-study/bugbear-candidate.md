# Bugbear combat body

2026-09-27. `bugbear-v1.glb` replaces the generic brute for the canonical bugbear.
It reuses the retained CC0 Quaternius anatomical body and attributed combat
motions. `bugbear_features.mjs` adds original skinned fur tufts and rigid head
features: broad muzzle, dark nose, yellow eyes, heavy brows and rounded ears.
The barrel torso, longer arms and layered hide follow the monster description.
No external asset, texture, dependency or purchase was added.

Rebuild with `node tools/combat-art/prepare_ogre.mjs bugbear`, then
`node tools/combat-art/build_anatomical_models.mjs bugbear`.

The actual Morningstar action uses the morningstar prop and one-handed mace
mount. The study's **Bugbear** encounter and main-game monster resolver share the
same configuration. Standing impact places the weapon-head centre 0.281 m from
the target centre horizontally, at 0.517 m height. Prone impact is 0.400 m away at
0.687 m height; the spiked head reaches toward the near leg.

Prone uses the shared grounded-motion authoring code, with a more upright seated
phase appropriate to this body. It has a grounded strike, recovery and separate
grounded defeat. `reachByCondition` supplies presentation contact spacing while
retaining the normal collision clearance; clearing prone restores ordinary
reach. This does not change rules, engagement or targeting.

Browser checks cover standing contact, prone contact, repeated prone attacks,
recovery and defeat without page errors. Captures: `bugbear-candidate-close.png`,
`live-bugbear-morningstar-grassland.png`,
`live-bugbear-ground-morningstar-grassland.png`, `live-bugbear-prone.png`,
`live-bugbear-prone-defeat.png`.

Tests load the packaged GLB, verify fur skinning and head attachment, sample
every animation for floor penetration, resolve the actual monster loadout, and
exercise grounded attacks/recovery/death through CombatAnimator. Fur is coarse
first-pass geometry; surface detail and clothing edges remain art-polish work.
