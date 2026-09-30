# Troll presentation

The Troll uses the retained CC0 anatomical body and the shared clawed animation
pipeline. `clawedBodySpecs.json` keeps its differences explicit: a taller, leaner
body, 22% longer arm segments, grey-green skin, pale scar traces and heavier,
flattened claws. `prepare_anatomical_ghouls.mjs troll` builds the derivative;
`build_anatomical_models.mjs troll` packages it with shared source texture paths.
The original Ghoul/Ghast profiles retain their existing proportions.

The canonical `troll` ID selects the body. Its **Bite** and singular **Claw** names
map to the existing head-led bite and open-hand claw motions, with crouched idle,
movement, recoil and collapse. The study includes **Troll** as a selectable
encounter. Presentation contact dimensions are independent of combat rules.

Mouth articulation and finer fibrous/scar surface detail remain first-pass art
limitations. Prone uses cards until it has a supported pose. No regeneration,
damage or status rule is added or inferred from descriptive text by this change.

## Browser and asset checks

The initial browser load exposed an incorrectly inserted rig-joint block. The
Troll and affected neighbouring Shadow entry are repaired; registered-asset
attachment tests pass, and the edited JSON files have no duplicate object keys.

Both canonical attacks now run in the swamp study without page errors. The bite
uses a slightly stronger forward lean for this profile. At impact, the mouth
marker is about 0.296 m horizontally from the player's torso centre at 1.446 m
height; the claw sample is about 0.144 m away at 1.467 m height. Screenshots are
`live-troll-bite-contact-swamp.png` and `live-troll-claw-contact-swamp.png`.
The shared actual-GLB tests now include Troll, checking every configured clip,
grounding, texture dependencies, timing, contact and canonical admission. Existing
unsupported-large-creature checks use Minotaur, which remains without an asset.

Final validation: all 1,042 tests across 75 files pass; affected-file lint has no
errors; all 12 legal checks pass with the existing attribution/SBOM warnings.
