# Armed giant authoring

The canonical monster data distinguishes these requirements:

| Monster | Required presentation |
| --- | --- |
| Ogre | Large, dense grey-green body, broad jaw, short neck, long arms, rough hide over fabric; one-handed Greatclub and thrown Javelin |
| Hill Giant | Huge humanoid, massive jaw/brow, mixed hides/canvas; Greatclub and thrown Rock |
| Ettin | Large two-headed body, distinct faces; right-hand Axe and left-hand Morningstar |
| Troll | Large lean hunched body with overlong arms, fibrous grey-green skin; Bite and Claw |
| Minotaur | Large bull-headed body, horns, hooves; Battleaxe and Gore |

These are asset requirements derived from `data/monsters.json`, not new rules.
The rigs can share compatible motion, but a generic enlarged traveller does not
fulfil these anatomy requirements.

## Ogre candidate

`prepare_base_body.mjs --giant` writes a separate anatomical candidate with UAL1
idle, sword idle, walk, strike, hit and death, plus UAL2 OverhandThrow. The ordinary
anatomical/corpse input remains unchanged. Both animation libraries and the base
body are retained CC0 sources with existing provenance.

`prepare_ogre.mjs` thickens the anatomical body around the existing bind axes,
including a wider head, recalculates surface normals and scales the body to about
three metres. Original rough-club geometry attaches to the actual right hand.
`ogre-candidate-poses.png` records idle, walk, strike and recoil in the browser.

Initial visual review rejected the enlarged human in source shorts. The revised
candidate has fitted woven fabric under rough hide layers, with the same skin
weights as the body; shorter neck and longer arm translations apply to both rest
and animated poses. Skin now uses a grey-green material with the source normal
and roughness textures, while the jaw and brow are broadened independently of the
separate eyes. The screenshot records the revised candidate. Each clip now has a
60 Hz floor-correction track.

The layers and proportions give a more suitable first-pass giant silhouette,
although cloth edges/surface detail and the stance still need refinement. The
asset test checks finite deformation and floor clearance over the actual clips,
including the clothing, rather than considering a bind-pose render enough.

## Ogre runtime integration

`build_anatomical_models.mjs ogre` packages the six used clips into `ogre-v1.glb`,
sharing the unchanged anatomical textures. It removes the fixed authoring club;
the runtime mounts the equipped greatclub/javelin on the actual right hand.
Canonical Ogre encounters now resolve to this model. The study has separate
**Ogre · greatclub** and **Ogre · javelin** cases for its two canonical attacks.
Prone remains an explicit card fallback, not an immunity or completed pose.

The Ogre's `weaponVisuals` entry overrides greatclub presentation with a slower
1.25-second swing and impact at 0.315 of the clip. This is visual timing only.
The source contact reach is 1.6 m in presentation space. Browser inspection in
the woodland scene places the sampled club head about 0.209 m horizontally from
the player torso centre at impact, at abdomen height. Framing accommodates the
three-metre model alongside both human participants. See
`live-ogre-club-contact-woodland.png`.

The javelin's `byKind.ranged` recipe selects its overhand throw while retaining
the melee stab recipe for melee use. The study now passes the canonical action
type into this resolver. `hideReleasedWeapon` hides the held weapon between
release and recovery, and fixes the projectile origin so hand recovery cannot
drag its flight path. Equipment and ammunition rules are unchanged. The flight
shape is currently a long shaft using the existing arrow geometry, not a detailed
copy of the held javelin. `live-ogre-javelin-release-woodland.png` records the
release; both browser scenarios completed with no page errors.

Ground correction excludes the temporary authoring club. Clothing buffers contain
only vertices used by their triangles, preventing unused displaced foot vertices
from enlarging animated bounds and creating false clearance. Candidate and runtime
tests measure the body/clothing floor contact independently of held weapons.

Validation: all 1,037 tests across 74 files pass. Affected-file lint has zero errors
(existing renderer warnings remain); all 12 legal checks pass with the existing
audio-attribution/SBOM warnings. Dedicated regressions cover melee versus ranged
javelin selection, appearance-specific greatclub timing, projectile origin after
release, held-weapon hiding/restoration and disarmed visibility.

## Hill Giant integration

`giantBodySpecs.json` now supplies explicit Ogre and Hill Giant body/material
profiles. `prepare_ogre.mjs hillGiant` uses the same anatomical source and clothing
construction with human-length arms/neck, a broader jaw/brow and roughly six-metre
standing height. `build_anatomical_models.mjs hillGiant` packages the shared clips
and texture references. The canonical `hillGiant` ID selects this model; the study
provides a **Hill Giant** encounter and both canonical actions.

The giant has its own 1.5-second greatclub swing, impact at 0.31 and presentation
reach of 3.2 m. In the grassland browser check the sampled club head reaches about
1.81 m height and 0.254 m horizontal distance from the player's torso centre,
meeting the head/upper body with its broad club. The six-metre model and both human
participants remain in frame at the tested 1024×768 viewport. See
`live-hill-giant-club-contact-grassland.png`.

Rock swaps the held model before the study action, uses the shared overhand throw
and fixed-origin release path, and hides the held rock during flight. The flight
sphere uses scene lighting (`litEffect`) so it reads as a solid stone instead of
an unlit disc. `live-hill-giant-rock-release-grassland.png` records the result;
both browser cases have no page errors. The actual-asset test covers standing
height, every configured clip, floor contact, action timing and canonical
presentation admission. These are first-pass surfaces; prone remains on cards.

Post-integration validation: all 1,040 tests across 75 files pass, affected-file
lint has no errors, and all 12 legal checks pass with the existing warnings.
