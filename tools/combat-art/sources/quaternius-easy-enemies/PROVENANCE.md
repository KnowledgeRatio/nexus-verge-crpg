# Easy Enemy Pack — rat, spider and wasp sources

Creator: Quaternius. Retrieved 2026-09-26 from the creator's free itch.io download:
https://quaternius.itch.io/animated-easy-enemies

Creator pack page: https://quaternius.com/packs/easyenemy.html
Both pages identify the pack as CC0. The itch.io archive does not contain a
separate licence text. The creator-linked Drive licence download returned a
quota-exceeded HTML page; that response was discarded, not retained as a licence.

Archive: `Easy Animated Enemy Pack - Jan 2019.zip` (kept temporarily outside
the repository). SHA-256:
`a97f38b981fec2f42b263fe92828a7bf73f9da1228d5aac906fe354cd2b21004`.

`Rat.blend` and `Spider.blend` are unmodified files extracted from its `Blends/`
directory. `Wasp.blend` was subsequently extracted from the same verified archive
for Stirge authoring. Other pack models have not been imported. These are source candidates,
not enabled runtime models or approved final art.

## Wasp / Stirge candidate inspection

The retained unmodified `Wasp.blend` SHA-256 is
`0fe2cecff63443cc636231eee0b914d6fea45952d1265337dbf6093096a4b899`.
The creator's Easy Enemy page still explicitly marks this 2019 pack CC0 on
2026-09-26. That pack-specific licence is the basis for this import; the newer
Bestiary kit has a different QAL licence and was not imported.

`export_enemy_candidates.py --models Wasp`, run under Blender 4.5.9 with embedded
scripts disabled, produced `Wasp-candidate.gltf`. `wasp-motion-audit.json` samples
its actual skinned bounds at 30 Hz. It has `Wasp_Flying` (1.5 seconds),
`Wasp_Attack` (0.75 seconds), and `Wasp_Death` (0.75 seconds), with separate head,
wing, abdomen and six articulated leg chains. Rest bounds are approximately
3.620 × 3.780 × 2.387 source units; these are not game metres.

`docs/art/combat-study/wasp-candidate-poses.png` shows the three clips at mid-pose.
The body and rig are potentially reusable for the canonical Stirge, but the
yellow bands, oversized eye profile, blue wings and rear sting are not accepted
Stirge art. Needed adaptation: rust-red abdomen, dark membranous wings, restrained
head/eye proportions, an original long proboscis, frontal contact rather than
rear-sting action, calibrated tiny-body scale and airborne hit/death presentation.
The death clip penetrates below zero by 0.378 source units and needs inspection
and correction. No hit clip exists. No runtime Stirge mapping has been added.

`rig-audit.json` records source actions, objects, dimensions and bone names as
read by Blender 4.5.9 with embedded scripts disabled. Animation names alone do
not prove useful movement or contact. Next validation must export the clips,
inspect motion, establish scale/contact/grounding, and test the canonical giant
rat and giant spider actions in the existing combat presentation.

## Export and motion evidence

`tools/combat-art/export_enemy_candidates.py` exports both rigs to self-contained
candidate glTF files, preserves action names and converts legacy diffuse colors
to PBR materials. It does not register runtime appearances. Run it with Blender
4.5.9 in background/factory-startup mode. Source .blend files remain unmodified.

The existing `audit_creature.mjs` sampled every exported clip at 30 Hz. Reports
are `rat-motion-audit.json` and `spider-motion-audit.json`, including source
checksums and precise skinned bounds. Rat rest dimensions are 1.486 × 2.292 ×
6.976 source units (tail included); spider dimensions are 5.937 × 1.949 × 5.270.
Neither is calibrated to game metres yet.

Rat attack lasts 0.667 s, walk 1.333 s and death 1.083 s. The attack sinks to
-0.081 source units and death to -0.318; sampled grounding correction is needed.
Spider attack lasts 0.750 s, walk 0.833 s and death 1.042 s. The death clip lifts
its lowest vertex to 2.429 source units before falling. That bounce is unsuitable
for direct use; adapt the collapse before enabling it. Walk penetration reaches
-0.039 source units. Neither source provides a separate hit-reaction clip.

Browser pose captures under `docs/art/combat-study/` are
`rat-candidate-poses.png` and `spider-candidate-poses.png`: independent rigs at
idle, mid-attack, mid-death and final death, all scaled 0.45 for inspection.
These confirm recognisable silhouettes and exported skinning, not accepted
contact, normal combat framing, timing or final surface detail. Rat rolls onto
its side; spider turns over with elevated legs. Grounding, death adaptation,
hit reactions, equipment-free action mapping and actual encounter tests remain.

## Adapted assets

`tools/combat-art/build_creature.mjs` reads `creatureSpecs.json` and builds
`giant-rat-v1.glb` and `giant-spider-v1.glb`, with embedded adapted glTF copies
for inspection. Rat scale is provisionally 0.23; spider scale is 0.55. These
require in-encounter size/contact review before activation.

Both receive a short authored head-recoil hit clip and 60 Hz sampled ground
correction. The spider death interpolates from rest to the source final collapsed
pose over 0.8 s, removing the original upward bounce. Adapted audits sample all
clips at 30 Hz: minimum surface stays at 4.2–6.1 mm for rat and 2.8–10.7 mm for
spider. Candidate GLB tests independently check 41 poses per clip, including
finite skinning, clip availability and ground clearance. This does not prove
stable planted feet during every blend or meaningful attack contact.

Updated pose captures are `rat-adapted-poses.png` and `spider-adapted-poses.png`
in the study documentation. Rat is enlarged 1.8× in that inspection view; spider
is shown at authored scale. They are not a gameplay size comparison. Runtime
appearance mapping, effect origins, hit timing, spider web presentation and
actual encounter validation remain outstanding.

### Runtime registration

Both canonical giantRat and giantSpider now have explicit appearances, preload
entries, effect-origin joints and unarmed Bite mappings. Study scenarios cover
three rats and two spiders alongside the player/companion. Bite impact is 65%
through the rat clip and 60% through the spider clip, based on forward head
excursion measurements. No Web action was added: the canonical spider currently
defines only Bite. Unsupported prone poses still use the card fallback.

The full suite passed 970 tests. After correcting the explicit preload list and
impact timing, 75 focused tests passed; live study scenarios loaded and invoked
their canonical bites without page errors. Browser screenshots are
live-giantRat-encounter.png and live-giantSpider-encounter.png. These checks do not
yet establish frame-by-frame contact quality, all effect combinations or full
campaign traversal. Surface fidelity remains preliminary.
