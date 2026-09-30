# Orc combat body

2026-09-27. The canonical orc now uses `orc-v1.glb` rather than the generic brute.
The original lower tusks and hammered shoulder plates are attached to the shared
anatomical rig. Grey-green skin, heavier jaw and brow, broader torso, hide layers
and a standing height above the traveller follow the monster description.

Rebuild with `node tools/combat-art/prepare_ogre.mjs orc`, then
`node tools/combat-art/build_anatomical_models.mjs orc`. The retained Quaternius
CC0 body, source textures and previously attributed shared motion clips are
reused. No additional external assets or dependencies are required.

The action is named Battleaxe in monster data but its weapon ID is greataxe.
Presentation follows that ID and uses the existing two-handed axe mount and
support-hand alignment. At the browser-frozen impact, the axe head was 0.287 m
from the target centre horizontally, at 0.838 m height: within the torso rather
than stopping short. These measurements validate presentation, not game distance
mechanics. The receiver remains stationary during the attacker's approach.

The study's **Orc** option and normal monster appearance resolver share the same
model configuration. Tests load the actual GLB, sample every configured animation
for floor penetration, check feature attachment and resolve the real monster's
weapon. Browser captures: `orc-candidate-close.png`, `live-orc-axe-grassland.png`.

This is first-pass art. Clothing edges and facial detail remain coarse.

## Prone support

The orc now remains in 3D when prone. `author_grounded_motion.mjs` holds a supported
seated phase of the retained CC0 LayToIdle motion and reuses the armed swing in
world space. The guard stays raised and the lower body stays on the floor.
Follow-through wrists are constrained above the supporting plane so grounding
does not lift the whole actor. Ground_Axe strikes low: browser-measured axe-head
height 0.445 m and horizontal distance 0.278 m from the opponent centre.

Ground_GetUp continues the recovery from that seated phase. Ground_Death reverses
the torso recovery into a flat, held collapse. The scene retains the animator's
condition at zero HP long enough to select this condition-specific death, instead
of clearing prone and playing a standing fall. Revival clears the condition from
the current rules state. No combat rules or prone duration changed.

Browser verification exercises two prone attacks, recovery, a second prone state
and defeat through the actual scene renderer. Captures are
`live-orc-prone.png` and `live-orc-prone-defeat.png`. Animation tests verify that
attacking never raises the head out of its grounded height, recovery stands up,
and prone defeat lowers the head and holds. The shared authoring utility is only
enabled for the orc so far; other anatomies still need individual validation.
