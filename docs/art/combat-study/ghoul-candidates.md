# Ghoul and Ghast authoring

`prepare_ghouls.mjs` builds two authoring candidates on the original traveller /
zombie armature. New work includes original extended curled fingers and dark
claw tips, a head-mounted bite contact marker and a short head/spine-driven bite
clip. The Ghast has longer fingers. Original gaunt torso/arm geometry reuses the
continuous-surface authoring method with a separate gaunt profile; existing spirit
profiles retain their previous defaults.

The first candidate retained the zombie coat. Visual review rejected that body:
the clothing hid the gaunt shape and the standing idle remained too human. The
revision exposes the torso and arms, retaining the original head and worn trousers.
No Ghoul/Ghast runtime mapping has been added. Candidates are not accepted final
art or full monster coverage.

The standing Zombie_Idle and Zombie_Walk are temporary authoring references. The
retained CC0 UAL1 source contains actual `Crouch_Idle_Loop` and `Crouch_Fwd_Loop`
clips; these need retargeting and visual evaluation as the basis for the intended
predatory crouch. The bite needs contact calibration and a mouth/jaw review, the
claw swipe needs hand/contact review, and newly deformed geometry needs ground
and defeat checks. No paralysis, stench or other description-only mechanic is
added by this work.

## Revised candidate review

`ghoul-candidate-poses.png` and `ghast-candidate-poses.png` record the exposed-body
revision. It is also rejected for runtime admission: joint shapes still read as
a mannequin, and source trousers intersect the generated legs in movement/defeat.
The reusable claws, contact marker and bite clip are useful authoring work, but
the body needs a continuous anatomical base with compatible clothing. Merely
retargeting the crouch will not resolve those geometry defects.

New candidate tests verify claw/contact attachment and finite deformation through
idle, bite, swipe and defeat. The full suite had 1,017 passing tests and two
five-second timeouts (the existing Shadow test and one candidate test); both files
then passed all four tests with a single worker. No functional assertion failed.
Affected authoring/test lint and all 12 legal checks pass. These checks do not
override the failed visual acceptance above.

## Anatomical replacement candidate

The free CC0 Universal Base Characters Standard pack supplies a continuous adult
body with the same 65 joint names as the retained UAL1 rig. Its source, licence
and archive provenance are retained under `sources/quaternius-base-characters/`.
`prepare_base_body.mjs` adapts six UAL1 clips to this body's rest rotations and
bone lengths, preserving the original source files and fixing two broken texture
references only in the candidate. `anatomical-candidate-poses.png` shows idle,
crouched idle, crouched movement and a jab with the actual textures.

Visual review found coherent anatomical joints and a useful low crouch, unlike
the rejected procedural body. This is a promising replacement base, not accepted
Ghoul art: it needs less muscular proportions, corpse surfaces, forward head
orientation, claws, bite and contact/grounding work. Player avatars are unchanged.
The focused actual-asset test passes across all six adapted clips and verifies
that crouches lower the body; authoring/test lint and all 12 legal checks pass.

## Anatomical corpse derivatives

`prepare_anatomical_ghouls.mjs` now produces separate
`ghoul-anatomical-candidate.gltf` and `ghast-anatomical-candidate.gltf` files.
Skin-weighted radial thinning preserves bone lengths and pivots while reducing
limb/torso bulk. Surface normals are recalculated; source normal and roughness
textures remain. Corpse vertex colours and integrated dark cloth replace the
base diffuse texture, avoiding separate intersecting trousers. Ten original
claws follow the actual distal finger joints, with longer claws on the Ghast.
Crouch head rotations are corrected in the animated parent frame to look forward.

`ghoul-anatomical-poses.png` and `ghast-anatomical-poses.png` show the revised
bodies in the browser. They resolve the disconnected mannequin joints and old
trouser intersections. The borrowed jab remains an authoring reference only.
No additional monster is counted as encounter-ready by this authoring step.

## Dedicated actions and grounding

The anatomical candidates now include `Corpse_Bite`, `Corpse_Claw` and
`Corpse_Death`. Bite advances the upper body/neck with a head-mounted contact
marker. Claw uses a two-bone arm solve and an open, forward-facing hand rather
than the borrowed jab. Both start/end in the same crouch and keep the planted
foot in place. Defeat interpolates from that crouch into the source's collapsed
pose, avoiding the standing start of `Death01`. Every candidate clip has a
60 Hz ground-correction track.

`ghoul-anatomical-actions.png` and `ghast-anatomical-actions.png` record browser
poses. Actual-asset checks cover finite deformation, floor contact, action
start/end continuity, planted foot stability, forward claw/mouth motion and
collapse height. Mouth/jaw articulation still needs work; the model has a static
mouth. No mechanics were added.

## First runtime pass

`build_anatomical_models.mjs` packages six used clips, compacted geometry/skin
buffers and shared unchanged source textures into `ghoul-v1.glb` and
`ghast-v1.glb` (about 2 MB each, plus shared textures). A crouched `Corpse_Hit`
keeps recoil from switching into a standing pose. Canonical Ghoul/Ghast IDs now
select these assets, with distinct Bite/Claws action mappings. The study includes
the mixed **Ghouls and Ghasts** encounter. Prone still uses cards until a supported
prone presentation is supplied; this does not imply immunity.

The live woodland encounter exposed a bite gap from a model origin ahead of the
crouched hips. A 0.25 m forward model offset aligns the body with the existing
contact planner; the claw extension is shortened accordingly. At impact, browser
measurements place the bite about 0.238 m horizontally from the target torso
centre and the claw about 0.131 m away, at abdomen height. The two actions produce
no browser errors. Screenshots: `live-ghoul-contact-woodland.png` and
`live-ghoul-claw-contact-woodland.png`. Actual GLB tests check both models, shared
texture paths, configured clips, grounding, canonical presentation admission,
action timing and planner contact. Static mouths and basic corpse surfaces remain
first-pass art limitations; this is not complete creature coverage.

Validation after integration: all 1,030 tests across 73 files pass; affected
authoring/rendering tests pass lint; all 12 legal checks pass (existing audio
attribution/SBOM warnings remain). The asset dependency check now validates both
embedded images and packaged local PNG textures, rejecting remote/path traversal
references instead of requiring duplicate embedded textures for the pair.
