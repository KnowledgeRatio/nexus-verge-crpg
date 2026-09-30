# First quadruped integration

The canonical medium `wolf` and large `direWolf` now have dedicated 3D appearances
alongside the reusable humanoids. Other beasts retain the card fallback. Admission
uses an explicit monster-to-appearance mapping rather than allowing all beasts.

`build_wolf.mjs` adapts the retained Quaternius CC0 source into a self-contained
GLB. Source data is unchanged. The export uses a 0.48 metre scale and the source
low-head idle, walk, attack, hit reaction and death clips. It adds a mouth socket
and a 60 Hz sampled vertical correction to prevent the death roll and moving feet
from penetrating the floor. The build report records correction magnitudes.
This correction is not a new foot IK system or proof that there is no foot sliding.

The renderer accepts rigs without hands, derives formation clearance from the
actors actually present, and allows separate contact radius/reach values per
appearance. Wolf actions select Bite without changing humanoid attack mappings.
Incoming effect placement follows the torso joint, including the fallen pose.
Combat decisions, HP, conditions, actions and engagement remain engine-owned.

Review in `combat-study.html`: select **Woodland road**, then **Wolf pack**. Engage
the opponents, select a wolf, and use **Show selected creature attack**. Hit/Miss
controls the recipient response. The player weapon and spell controls can target
wolves. Disengage still returns the player to their original position.

Known limits:

- Foliage and wolf surfaces remain study-quality. The wolf has the source's flat
  coat materials; the canon's two fur textures are not yet represented.
- Prone wolves deliberately trigger card fallback: there is no suitable prone
  clip in this source. Missing creature asset downloads also fall back to cards.
- Other large creatures require their own size/proportion/contact validation.
- The pre-existing humanoid gnoll Bite mapping is unchanged; a canine animation
  is not appropriate for that rig.
- The mouth socket establishes an attachment for future natural effects. Bite
  currently uses body contact and recipient feedback, without an extra projectile.

Validation on 2026-09-25: 790 tests passed, including canonical enemy construction,
wolf-only admission, prone fallback, handless-rig attachment and complete-clip
floor measurements. Legal verification passed all 12 checks. Changed files have
zero lint errors; repository-wide lint and lint:all retain existing errors.

A disposable main-game encounter with the player, one companion and three wolves
verified all three actual enemy Bite events selecting `bite` motion, player action
spending, card toggling and mobile fallback, with no browser page errors.
`main-game-wolves.png` records the integrated encounter. The harness supplies the
encounter directly; this is not a full campaign/save-load acceptance run.

The selected-frame browser inspection measured the mouth 0.352 m horizontally
from the humanoid root at Bite impact, within the configured 0.43 m body radius.
`wolf-bite-impact.png` shows contact at leg height. `wolf-pack-engaged.png` and
`wolf-defeated.png` record the pack formation and corrected death pose. Disengage
returned the player exactly to its reserved home, with no page errors. After the
final contact-distance tuning, all 27 focused contact/layout/asset/data tests
passed. These captures inspect poses and contact; gait quality remains subject to
hands-on review.

## Dire wolf variant

Build with `node tools/combat-art/build_wolf.mjs direWolf`. The variant retains the
same source skeleton and five clips, with a separate mesh export. Its authoring
profile deepens and widens the chest with a smoothly weighted vertex adjustment,
uses 0.68 metre scale, and paints pale grey along the spine over charcoal flanks
using vertex colours. Eyes use a pale blue material tint. These are silhouette and
colour adaptations; ribs, fur detail and pupil shape are still unfinished.

Select **Dire wolf mixed pack** in the study to compare the larger creature with
two ordinary wolves and the party. Only that appearance admits the canonical
`large` size; giants and other large beasts remain on cards. Formation spacing,
contact measurements and camera padding reserve room for its larger body. Prone
uses the same honest card fallback as the ordinary wolf.

Dire-wolf validation: all 793 tests passed, including both rigs' full-clip floor
checks, canonical factory construction, and continued rejection of unrelated large
creatures. The browser inspected a mixed pack, bite contact (mouth 0.341 m from the
human root horizontally), spell targeting, defeat and exact return-to-home retreat.
The main-game disposable mixed encounter played three canonical Bite events,
spent the player's action, and passed card/mobile toggles without page errors.
Artifacts: `dire-wolf-pack.png`, `dire-wolf-bite.png`, `main-game-dire-wolves.png`.
