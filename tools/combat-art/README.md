# Combat art authoring proof

The first non-humanoid runtime asset is the medium wolf. Build its CC0 source
adaptation with `node tools/combat-art/build_wolf.mjs`; this does not require
Blender or change the humanoid export. It adds a mouth socket, metre scaling and
sampled vertical floor correction, retaining the source skeleton and five clips.
Review **Encounter → Wolf pack** in `combat-study.html`, engage opponents, select
a wolf and choose **Show selected creature attack**. The Hit/Miss selector also
applies to this example. Main-game wolf encounters use the same asset and action
mapping. See `docs/art/combat-study/wolf-integration.md` for limits.

`node tools/combat-art/build_wolf.mjs direWolf` builds the larger, deeper-chested
dire-wolf variant from the same source skeleton and clips. Mesh shaping, coat
colours and scale are configured in the model's `authoring` entry. Select
**Dire wolf mixed pack** to compare it with ordinary wolves. Large-size admission
is per appearance, not an expansion of the global supported-creature filter.

Sponsor direction accepted 2026-09-25: the right-hand settlement floor in
`docs/art/combat-study/settlement-floor-comparison.png` — detailed image-textured
paving with 3D architecture and props. Carry that material-quality standard
across combat environments; approval does not establish completion of the other
scenes or character art. Creature compatibility findings are recorded in
`docs/art/combat-study/creature-compatibility-audit.md`.

`build_slice.py` authors original meshes, a weighted humanoid skeleton and small procedural
material textures using Blender 4.5.9 LTS. It writes editable `.blend` sources
and self-contained `.glb` exports for the traveller, waystation, dungeon, settlement and woodland to
`data/graphics/combat/`.

```sh
blender --background --factory-startup --python tools/combat-art/build_slice.py
# Rebuild only the traveller after rig/mesh changes:
blender --background --factory-startup --python tools/combat-art/build_slice.py -- --character-only
# Rebuild dungeon scenery without modifying the traveller or its animation export:
blender --background --factory-startup --python tools/combat-art/build_slice.py -- --dungeon-only
# Rebuild only the settlement:
blender --background --factory-startup --python tools/combat-art/build_slice.py -- --settlement-only
# Rebuild only the waystation:
blender --background --factory-startup --python tools/combat-art/build_slice.py -- --waystation-only
# Rebuild only the woodland and its original soil texture:
blender --background --factory-startup --python tools/combat-art/build_slice.py -- --woodland-only
# Rebuild all data-defined outdoor additions:
blender --background --factory-startup --python tools/combat-art/build_slice.py -- --outdoor-variants-only
# Rebuild selected terrain environments:
blender --background --factory-startup --python tools/combat-art/build_slice.py -- --outdoor-scene mountain desert snowyPlains snowForest
```

The woodland is the first contrasting open-ground composition: textured soil,
gravel, wheel ruts, an irregular pine verge and a receding road. Its tree and rock
placements live in `sceneVariants.woodland.authoring`; the fixed authoring seed
reproduces its texture and vegetation. Tall scenery stays behind the formation's
reserved boundary, which shifts with larger encounters. Distant trees form a
croppable backdrop; the foreground landmarks participate in camera framing.
Forest encounter metadata selects among woodland road, glade and bend using a
stable hash of the world seed and player location. Grassland selects open meadow;
dungeon and settlement contexts take precedence. Other terrains retain their existing fallback. In the study, select
**Environment → Woodland road**. These are original procedural assets and remain
an art study, especially the foliage. They introduce no movement or cover rules.

The generated exports use glTF Y-up, +Z forward and metres. The traveller stands
about 1.84m high. `data/combatScene.json` names the asset paths and attachment
nodes. Three.js sanitises punctuation in imported node names; the adapter resolves
that explicitly. Weapons are separate geometry attached through an orientation-
normalised grip node, and projectile origins follow the held weapon. Source
geometry uses its original pivot even when weapons are changed after import.

This is an **art pipeline and articulation proof**, not finished character art.
The traveller uses a deforming skeletal skin with blended shoulder, hip and coat
seams. Clothing folds, facial topology, hair, anatomy, wear and material finish
remain preliminary. Companions and humanoid enemies reuse the same mesh with
data-driven scale and material variants, while weapons remain simple procedural
geometry. This establishes reusable coverage; it does not establish the final
visual target.

The runtime keeps combat rules, action timing, engagement and impact cues outside
the art asset. `retarget_humanoid.mjs` samples free CC0 animation libraries onto
the original traveller rig and writes `traveller-animated.glb`. Active clips cover
guard, walking, sword strike, unarmed strike, hit reaction, death, spellcasting,
one-handed firearm, two-handed firearm and a combined bow draw/release. Candidate
block, alternate sword, knockback and throw clips remain embedded for review but
are not selected by runtime data. The bow composite is assembled offline to avoid
runtime sequencing special cases.

The renderer clones skeletons per actor while sharing geometry and materials.
The model adapter uses per-weapon hilt, trigger or bow-grip anchors. Grip
calibration is captured in the bind pose, never in the pose when equipment changes.
The author labels the +X side as right, opposite the source rigs. The offline
retarget mirrors source X (translations and rotations); a 180-degree yaw would
also reverse every forward action. Each clip starts calibration from reset rigs.
Melee orientation follows the source prop socket, not the forearm's longitudinal
axis. Ranged barrels align with the combat target; configurable shoulder-relative
holding positions keep both trigger and foregrip within the arms' reach.
The head's local -Y axis faces forward and +Z points up; aiming is limited to
60 degrees from its rest orientation and released on defeat or a held condition.
Forward-aligned weapons likewise release target aiming on defeat or a held
condition. Both main-hand and off-hand props then use their calibrated hand-local
grips, so falling wrists carry the weapons instead of leaving barrels level with
the horizon. Recovery restores the normal targeting alignment.
The compact target rig has no clavicle or neck chain. The retarget collapses the
source spine chain into an anatomical torso frame from hip/head and shoulder
landmarks. Pelvis orientation likewise uses the hip line and lower spine rather
than assuming its bind-bone axes match an upright body. Keeping only pelvis tilt discards the source's spine compensation and
produces a backward lean; do not freeze the spine to address bone-axis problems.
Head aiming remains separate. `motion.idles` selects a looping ready pose by
weapon mount/model, falling back to the default sword guard. Firearms reuse the
authored pistol idle with grip constraints for longarms; bows, two-handed melee
and unarmed actors use their own loops. The source aiming clips are transitions,
not loops, and must not be used as repeating idles. Reduced motion holds each
equipment idle at its configured `poseTime`. Attacks, locomotion, prone and death
take priority; recovery returns to the current equipment idle. Disarmed actors
use the unarmed guard without being constrained to the hidden weapon.
Casting profiles set `supportGrip: false`: the support constraint fades out
over the animation blend interval, then fades back in on recovery. This leaves
the authored gesture and its projectile origin free while the other hand retains
the weapon. `gestureHand` and `handClips` select the mirrored casting clip when
the normal gesture hand holds the weapon. Mirroring is baked offline across the
whole pose, including paired limbs and root translation. The active clip records
its gesture hand, which also supplies the spell origin; switching equipment does
not change an action already playing. Bows therefore remain in the left hand
while the right hand casts. Animation caches distinguish handed clip variants.
Action visuals may omit `model` to retain live equipment while selecting an
animation. Spell visuals use this so the main-game adapter preserves the weapon
and grip during casting. An explicit `model` remains an equipment override for
weapon attacks and natural attacks; missing equipped-weapon art still uses cards.
Off-hand props are independent of the main weapon: `offHandVisuals` maps canonical
item IDs to `offHandModels`, which specify reusable geometry and a humanoid joint
attachment. The first round shield follows the left hand through a one-handed
strike and can be equipped/removed without replacing the character or sword.
It remains prototype geometry; casting grips and the full set of
two-handed/off-hand combinations still need visual acceptance.
`motion.offHandIdles` selects an authored guard for an equipped off-hand prop.
The round shield uses the retained CC0 `Idle_Shield_Loop`; walking, actions and
held conditions retain priority, and recovery returns to the equipped guard.
The scene suppresses this override for a primary weapon that occupies the left
hand or requires a support hand. These are presentation choices, not equipment
eligibility rules. Missing clips fall back to the primary weapon's ordinary idle.
The equipped guard has been inspected on the rendered traveller in the study;
this establishes a working shield-ready pose, not final character-art acceptance.
Off-hand weapons reuse the normal weapon geometry and grip anchors. Attack events
carry `weaponSlot`, so two identical weapons remain distinguishable and an
off-hand attack does not replace the main-hand prop. Mirrored one-handed slash,
chop, stab, sidearm and punch clips select through `attackHand`/`handClips`;
projectiles and muzzle flashes retain the firing prop as their origin. The first
rendered acceptance check is a left-hand dagger strike with a retained sword.
An off-hand sidearm has also been inspected during firing; exported-rig tests
check both grips through mirrored stab, slash, chop and sidearm recovery. Firearm
flashes use `animation.muzzleFlash` for a short directional burst, separate from
the projectile's travel duration. This does not add phased firing/impact audio.
`combat-study.html` exposes an off-hand selector and attack button for reviewing
these attachments. Options use canonical item names and available left-hand
clips; shields have no attack button. The study clears off-hand equipment when
switching to a two-handed/left-hand primary setup pending compatible pose work.
This study restriction does not change game equipment or combat rules.
Structured spell action records carry each additional recipient as
`secondaryFeedback`. The renderer uses one casting motion and release time,
with a separate effect and impact reaction per recipient. Extra messages for
the same recipient remain sequential. This supplies target effects, not an
area-shape renderer; standalone dispatcher effects still use their separate queue.
Dispatcher feedback includes its generic `effectType`. The scene's
`effectVisuals` can mark non-casting effects as `feedbackOnly`; Dodge and extra
actions use this to retain their ready stance instead of inventing a spell cast.
Character clips and scene effects advance by the same elapsed frame time. Do not
cap only the mixer delta: doing so lets effects and sounds outrun the pose on
slow frames. A clip first evaluated after its scheduled start catches up only
from that start; a newly delivered hit reaction begins at its own feedback time.
Persistent combat state is data-driven: Prone holds a baked knockback pose between actions
and disables the standing hit clip through its `reactions.hit: false` mapping.
Damage text and impact effects still play. A condition may instead map a reaction
to a compatible configured action clip. Condition-specific `actions` override the
ordinary clip while retaining its presentation timing and handedness rules.
Prone spell/healing gestures now use original shoulder/elbow animation over the
same baked floor pose (`Prone_Cast_L/R` and `Prone_Idle`). The casting hand lifts
and returns while torso/legs remain fixed; the opposite hand retains its weapon.
These clips adapt the CC0 knockback base and are not imported motion capture.
Real-asset tests cover both free hands, lower-body stability and return to Prone.
Prone melee, firearm, bow and thrown attacks remain gaps.
Removing Prone now plays the retargeted `LayToIdle` recovery through the
condition's configured `exit` action before returning to the equipped idle.
Its `preservePose` flag retains authored head/arm motion and hand-local prop
orientation during recovery. Reduced motion skips the transition; reapplying
Prone interrupts it. The scene's busy state includes this recovery, so subsequent
presentation waits for it without adding any rules cost or action.
`docs/art/combat-study/prone-recovery.png` records the browser transition from
the held floor pose through seated/kneeling recovery to standing. It verifies
the transition at the normal camera, not the still-missing prone attack family.
Defeat and revival use the death/resume path, Disarmed hides the
held weapon, and buffs/debuffs appear in the roster and as a subtle ground cue.
Armour appearance is not yet driven by equipment, and no clip in this proof should
be treated as final motion capture quality.

## Combat composition

Settlement encounters select `settlement-v1.glb`. Two stone-and-timber frontages,
boarded roofs, an alley lintel, a small market stall and stacked crates form the
rear of the scene. These remain named component groups, built with the same
direct-mesh helper as the dungeon. Their tall geometry stays behind the same
clearance boundary; the street paving leaves the full combat formation open.
The settlement variant's composition supplies authoring depth and camera landmarks.
This is an initial shared street, not distinct architecture for every settlement.
The waystation, settlement and dungeon floors embed the same detailed flagstone image as their primitive
fallbacks, with matching texture density derived from each configured surface size
and repeat values. Broad floor detail uses a simple textured surface rather than
individual block meshes. Architecture remains modelled and currently uses simple
procedural grain materials. All three use the shared `image_floor` authoring helper.
Geometry coverage is not evidence of equivalent surface-detail
quality; compare both paths during art review.

Dungeon encounters select `dungeon-v1.glb` through the same encounter-context
mapping as the study selector. Its named arch, wall panels, buttresses, passage
returns, timber repair and floor groups remain separate reusable components in
the export. Meshes within each component share materials and are consolidated.
Repeated dungeon blocks use direct mesh construction to avoid rebuilding
Blender's dependency graph for every individual stone.
The existing primitive dungeon remains the asset-loading fallback. The authoring
script reads the dungeon variant's `composition.rearZ`; keep its landmark extents
and lantern coordinates aligned when changing the architecture. Tall scenery
stays behind the combat clearance plane, including for larger formations and
their retreat homes. The foreground remains open; scenery adds no movement rules.
This is the first shared masonry chamber; it does not yet distinguish individual
dungeon subtypes such as caves and tombs.
Scene variants also override `lighting`: the dungeon uses cool ambient fill,
a dimmer cool key light and a stronger local lantern. The base profile preserves the
waystation's existing lighting; scene choice does not add renderer branches.

The waystation's gateway and smaller shelter are composed behind the closer
combat formation. The authoring script reads `composition.rearZ` from
`data/combatScene.json`; rebuild the exports after changing that authoring value.
The same section defines key landmark extents, lantern/light positions, rear
clearance and camera bias. Keep those extents aligned with geometry changes.

At encounter setup, the renderer moves the whole backdrop and its lights farther
back when the formation needs more depth. That placement remains fixed throughout
combat. The overview frames both combatants and the landmark extents, including
their height, at the current viewport aspect ratio. It retains the encounter
envelope through movement rather than repeatedly zooming in after attacks.
Peripheral wall ends may leave the frame; the gateway and shelter should remain
recognisable at default zoom. Manual zoom can deliberately crop the overview.

## Ownership and reproducibility

All meshes in the traveller, waystation, dungeon and settlement exports are generated by the
repository's original authoring script. The animation source GLBs are retained
under `tools/combat-art/sources/`; only retargeted tracks, not source mannequins,
are embedded in the shipped traveller. Their CC0 provenance is recorded in
`legal/ASSET_ATTRIBUTIONS.md`. Blender and the retarget script are authoring tools,
not shipped runtime dependencies. Generated dungeon surface textures and their
exact prompts are recorded under `docs/art/combat-study/`.

Tested authoring tool: official Blender 4.5.9 macOS x64, downloaded from
https://download.blender.org/release/Blender4.5/ and verified against its published
SHA-256 (`00c8a433504291374bfa045c0c2d708a779f8abc8400b4718fdd11c117486fa4`).
It was run from a temporary read-only disk-image mount, not installed system-wide.

## Runtime fallback and resources

`artAssets.enabled: false` restores the geometric prototype. Missing or invalid
assets preserve that prototype, and compact/mobile/WebGL fallback remains usable.
Meshes and material textures are shared by instances and owned by the scene's
asset container; disposal releases them after actors, and late loads are disposed
if their scene has gone away. No asset is fetched by the compact-only mobile path.

The fixed authoring seed is for reproducible art only and has no connection to
combat rolls or saved world state. Browser test random stubs must generate distinct
values: forcing `Math.random` to a constant also gives Three.js duplicate resource
UUIDs and can falsely collapse all glTF materials into one.

## Rebuild the retargeted traveller

The retained CC0 source files make the selected animation library reproducible:

```sh
node tools/combat-art/retarget_humanoid.mjs
node tools/combat-art/retarget_humanoid.check.mjs
```

The numerical gate verifies the original mesh, skin and sockets remain unchanged,
all tracks are finite and normalized, feet clear the floor, the walk bends its
knees, and required configured clips exist. Browser review is still required for
contact, facing, weapon alignment and motion quality.
