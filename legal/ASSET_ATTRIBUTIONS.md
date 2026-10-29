# Third-Party Asset Attributions

This document provides attribution and licensing information for all third-party assets used in **Nexus Verge**.

---

## Creature Asset Evaluation Source

**Quaternius — Ultimate Animated Animal Pack, Wolf**

- Source: https://quaternius.com/packs/ultimateanimatedanimals.html
- Licence: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
- Unmodified source, accompanying licence and download provenance:
  `tools/combat-art/sources/quaternius-animals/`
- Retrieved 2026-09-25. The adapted `data/graphics/combat/wolf-v1.glb` is loaded
  for the canonical medium wolf. `tools/combat-art/build_wolf.mjs` retains the
  source rig and selected clips, adding metre scale, a mouth socket and
  sampled ground correction. The derived `dire-wolf-v1.glb` also adapts the chest
  geometry and adds vertex coat colours for the canonical dire wolf. Other animal models are not enabled. Final creature
  art acceptance is still outstanding.

## Humanoid Animation Authoring Source

**Quaternius — Universal Animation Libraries 1 and 2, free Standard editions**

- Sources: https://quaternius.itch.io/universal-animation-library and
  https://quaternius.itch.io/universal-animation-library-2
- Licence: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
- Original GLBs, licences and provenance: `tools/combat-art/sources/quaternius-ual1/`
  and `tools/combat-art/sources/quaternius-ual2/`
- Downloaded 2026-09-24 and 2026-09-25; both retained as unmodified
  non-root-motion GLBs with 43 named clips each.
- Current use: selected clips are retargeted offline onto the original traveller
  rig in `data/graphics/combat/traveller-animated.glb`; source mannequins are not
  loaded by the game.

The creator credits Gonzalo Furnier for animation contributions. The original
licence is retained alongside the source file; no endorsement is implied.

**Kay Lousberg — KayKit Character Animations 1.1, free edition**

- Source: https://kaylousberg.itch.io/kaykit-character-animations
- Licence: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
- Original ranged and melee GLBs, licence and provenance:
  `tools/combat-art/sources/kaykit-character-animations-1.1/`
- Downloaded 2026-09-25 from free upload 15799903; no paid Source files included.
- Current use: selected one-handed firearm, two-handed firearm and bow draw/release
  clips are retargeted offline onto the original traveller rig. Melee-family clips
  are retained for in-game comparison before selection. The bow action is assembled
  from the source draw and release clips. Source geometry is not shipped.

The retained source is not loaded by the game; no endorsement is implied.

---

## Sound Effects

The original 13 sound effects are sourced from Thomas Devlin and require proper attribution.
The generated tavern ambience is recorded separately below.

### Thomas Devlin - Music & Audio
**Source:** https://tommusic.itch.io/
**Author:** Thomas Devlin
**License:** Please verify specific license terms at source

**Assets Used:**
- All combat sound effects in `data/sound/` directory
- All movement footstep sounds
- All UI interaction sounds
- Original sound-effect assets (13 files total; excludes generated tavern ambience)

**Attribution Statement:**
Original sound effects created by Thomas Devlin. For more works and licensing information, visit https://tommusic.itch.io/

**Note:** If you have specific license information from Thomas Devlin (e.g., Creative Commons, royalty-free with attribution, commercial license, etc.), please update this section with complete license details including:
- License type (e.g., CC BY 4.0, royalty-free, etc.)
- Usage terms (commercial use allowed, attribution required, etc.)
- Any restrictions or requirements

---

## Sound Asset Inventory

The 13 sound files listed below are created by Thomas Devlin (https://tommusic.itch.io/).

### Combat Sounds
| File | Purpose |
|------|---------|
| `Bow Blocked 1.wav` | Ranged miss sound |
| `Sword Attack 1.wav` | Melee miss sound |
| `Sword Impact Hit 2.wav` | Melee critical hit |
| `Sword Impact Hit 3.wav` | Melee regular hit |
| `Spell Impact 1.wav` | Ranged regular hit |
| `Spell Impact 2.wav` | Ranged critical hit |
| `Ice Freeze 1.wav` | Healing/buff sound |

### Movement Sounds
| File | Purpose |
|------|---------|
| `Dirt Run 1.wav` | Footstep variant 1 |
| `Dirt Run 2.wav` | Footstep variant 2 |
| `Dirt Run 3.wav` | Footstep variant 3 |
| `Dirt Run 4.wav` | Footstep variant 4 |
| `Dirt Run 5.wav` | Footstep variant 5 |

### UI Sounds
| File | Purpose |
|------|---------|
| `Light Torch 2.wav` | UI interaction |

---

## Attribution Statement

**Original Sound Effects by Thomas Devlin**

Website: https://tommusic.itch.io/

The original sound-effect assets (13 files) are created by Thomas Devlin. We gratefully acknowledge Thomas's contribution to this project.

**Support Thomas:** https://tommusic.itch.io/

---

## Fonts

**No custom fonts are used.** The game uses system fonts specified in CSS:
- **Primary:** `var(--font-mono)` = `'Courier New', Courier, monospace`
- **Fallback:** System default monospace fonts

System fonts do not require attribution as they are pre-installed on user devices.

---

## Textures and Graphics

The 3D traveller, waystation, dungeon, settlement, woodland road, woodland glade,
woodland bend and open meadow meshes are original repository-authored work.
Mountain scree, desert dunes, snowy plains and snow forest combat environments
are also original repository-authored meshes and procedural surface textures.
Hills, sandstone hills, plains and tundra use the same original authoring pipeline.
Beach, shallow ford and swamp scenes add original procedural shorelines, water
ripple textures, reeds and dead-tree meshes through that pipeline.
Dense forest, jungle and savanna use original forked trees, leaf crowns, broad
fronds and terrain textures generated by the same authoring script.
Road, timber crossing, farm headland and tent-camp environments add original
procedural plank/furrow textures, wooden structures, milestones and canvas tents.
Cave, ruins, temple, monastery, watchtower, villa, residential and industrial
environments reuse those original architectural modules and the approved
generated flagstone texture, with original data-defined landmark arrangements.
Dungeon passage gates, exit stairs, strongrooms, pressure-plate halls, ritual
altars and collapsed galleries also use original data-defined meshes exported
by that script, reusing the same approved flagstone texture.
Web strands, fungal growth, scattered bones/skulls and frozen-vault scenery are
original procedural meshes. The frozen floor is an original seeded texture.
Unmodified rat, spider and wasp Blender sources from Quaternius's CC0 Easy Enemy
Pack are retained under `tools/combat-art/sources/quaternius-easy-enemies/`.
Adapted runtime derivatives are `giant-rat-v1.glb` and `giant-spider-v1.glb`,
with original head-recoil clips, sampled ground correction and a revised spider
collapse. Creator licence statements, download source and archive checksum are
recorded in that directory's `PROVENANCE.md`.
The wasp is retained only as an inspected Stirge authoring candidate; it is not a
registered runtime model. Its exported rig and sampled motion audit remain with
the source for reproducible adaptation.
`tools/combat-art/stirge-candidate.gltf` is an authoring derivative of that wasp,
with original proboscis geometry and colour/eye/sting adjustments from
`prepare_stirge.mjs`. It retains the source CC0 animation provenance and is not
registered for runtime encounters yet.
The subsequent `stirge-v1.glb` runtime derivative uses that adapted source with
calibrated hover clearance, a falling defeat and an airborne hit reaction from
the generic `build_creature.mjs` pipeline. Original proboscis geometry and the
source CC0 provenance are retained.
Inspected CC0 skeleton, dragon, bat and slime sources from Quaternius's Animated
Monster Pack are retained under `tools/combat-art/sources/quaternius-animated-monsters/`
with provenance and audit records. They were rejected for direct integration and
are not registered runtime assets.
The runtime `skeleton-v1.glb` instead uses original procedural bone geometry
authored by `tools/combat-art/build_skeleton.mjs`. It reuses the traveller's
armature and animation tracks, including the CC0-derived tracks attributed above.
`traveller-modular.glb` reorganises that original traveller geometry into reusable
scalp-hair, coat and trouser choices, plus original hood geometry, through
`build_player_parts.mjs`, retaining the same attributed
animation tracks and existing surface textures.
`traveller-grounded.glb` retains those modular meshes and original animation
tracks, adding grounded armed poses, recovery and defeat through
`build_traveller_grounded.mjs` and `author_grounded_motion.mjs`. The added motion
is derived from the same attributed CC0 clips; no additional external source
is included.
`data/graphics/combat/portrait-traveller*.png` are local head-and-shoulder renders
of the same original traveller geometry and attributed motion, produced by
`tools/combat-art/render_player_portraits.mjs`. They introduce no external image
source or additional licence.
`goblin-grounded.glb`, `skeleton-grounded.glb`, `wight-grounded.glb` and
`zombie-grounded.glb` preserve their corresponding original `*-v1.glb` geometry
and existing clips, adding grounded motion through `build_grounded_humanoids.mjs`
and the shared grounded authoring helpers. The motion derives from the same
attributed CC0 library; no new external asset source is used.
`goblin-v1.glb` is an original traveller derivative built by
`tools/combat-art/build_goblin.mjs`, with original ears, eyes and nose geometry,
recoloured clothing and skin, and the same attributed CC0 motion tracks.
It serves both canonical goblin types; no additional external asset is included.

`kobold-v1.glb` also derives from that original traveller body and attributed CC0
motions. `build_kobold.mjs` authors the original reptilian facial geometry and
tapered tail. Tail rotation and shape tracks are generated offline to preserve
floor clearance. `traveller_derivative.mjs` shares packaging and grounding with
the goblin builder. No additional external source is included.

`kobold-grounded.glb` preserves the original kobold mesh and animation tracks,
adding grounded body poses and tail-clearance tracks through the shared grounded
authoring pipeline. It uses the same original features and attributed CC0 motion
sources, with no additional external asset.

`zombie-v1.glb` is an original weathered traveller derivative built by
`build_zombie.mjs`, with a ragged hem, hollowed face and adapted idle/walk/slam
clips. Its underlying retargeted clips retain the CC0 source attribution above.
`wight-v1.glb` is an upright traveller derivative from `build_wight.mjs`, with
original skinned iron-mail rings, pale eyes and preserved-undead material colours.
It retains the same attributed shared humanoid animation tracks and textures.
`medusa-v1.glb` reuses that original traveller body and attributed shared motions.
`build_medusa.mjs` adds nine original morph-animated serpents, gold-green eyes,
olive clothing colours and an original head-led Serpent_Strike motion. No new
third-party asset is included.
`medusa-grounded.glb` preserves the Medusa geometry and original animation tracks,
adding supported grounded poses through `build_grounded_humanoids.mjs`.
The serpent morph animation is sampled from the original authored clips; the
body motion uses the same attributed CC0 sources. No new external asset is used.
`smoke-rig-v1.glb` is an original node-based motion rig from `build_smoke_rig.mjs`.
The universal settlement scene reuses the attributed settlement environment,
traveller models and textures above. Its added storefront boxes and composition
are original procedural geometry; no new third-party asset is introduced.
The five Void creatures use this rig with original data-authored volume shapes
and the original `CombatSmoke.js` shader. Their idle flow, touch, recoil and
dissolution use no downloaded model, texture or third-party animation. The larger
forms add original arm-density motion and a pulse clip on the same rig.
`gargoyle-v1.glb` adapts the CC0 anatomical base and shared clawed-body motions
described below. Its folded wing geometry is original work from `stone_wings.mjs`;
stone colours, stationary idle and fitted wing placement are original adaptations.
The source eyes retain their CC0 textures. No additional third-party art is used.
`minotaur-candidate.gltf` is an authoring-only adaptation of the retained CC0
anatomical body and shared animations. Its bovine head, horns and split hooves
are original geometry from `bovine_features.mjs`; no downloaded bull geometry
is included. The authoring source is retained alongside the runtime derivative below.
The subsequent `minotaur-v1.glb` runtime derivative retains those original features
and the attributed shared animation library. `author_horn_attack.mjs` adds an
original head-led Gore clip; no additional third-party motion is included.
`ettin-candidate.gltf` is an authoring-only derivative of the same retained CC0
anatomical base and shared animation library. `twin_heads.mjs` originally adapts
the source head into two fitted heads while retaining its texture provenance.
No new third-party asset is included; the authoring source is retained alongside its runtime derivative.
The subsequent `ettin-v1.glb` runtime derivative uses those adapted heads and the
same attributed motion library. `mirror_body_motion.mjs` derives a left-hand
strike from the retained source clip; the morningstar spikes are original
procedural geometry in the combat scene data.
The Ghoul/Ghast authoring candidates from `prepare_ghouls.mjs` reuse that original
head/rig and the attributed shared clips, with original gaunt body geometry,
curled claws and a head-led bite. They are not registered runtime assets yet.
An unchanged adult base from Quaternius's CC0 Universal Base Characters Standard
pack, with its textures and licence, is retained under
`tools/combat-art/sources/quaternius-base-characters/`. Creator links, archive hash
and exact retained content are recorded in `PROVENANCE.md` there. The anatomical
inspection candidate combines this base with rest-pose-adjusted CC0 UAL1 clips;
it is not registered for runtime use or selected as a player avatar.
`prepare_anatomical_ghouls.mjs` derives thinner corpse candidates from that CC0
base, retaining its normal/roughness textures and adapted UAL1 clips. Original
vertex colours provide corpse skin and integrated cloth; original claws attach
to the distal finger joints. Crouched head tracks are adjusted in the animated
parent frame. `build_anatomical_models.mjs` packages these derivatives as
`ghoul-v1.glb` and `ghast-v1.glb`, sharing unchanged source textures under
`data/graphics/combat/textures/anatomical-*`. The retained source licence applies
to these meshes and textures. Hair surface maps are replaced with a plain material.
Original crouched bite/claw tracks and a crouch-to-collapse adaptation of the
attributed UAL1 death pose are authored by the same preparer, with floor tracks.
`prepare_base_body.mjs --giant` and `prepare_ogre.mjs` also create an authoring-only
Ogre derivative of the retained CC0 anatomical base, using attributed UAL1 and
UAL2 clips. The wider proportions and attached rough-club geometry are original
adaptations. The fitted hide/fabric layers derive from the attributed body's
geometry and weights; neck/arm proportions, jaw/brow shape, skin material and
floor tracks are adapted in the same preparer. `build_anatomical_models.mjs ogre`
packages `ogre-v1.glb` for the canonical monster, removing the authoring club in
favour of the game's equipped weapon geometry. It shares the attributed source
surface textures and is not offered as a player avatar.
`giantBodySpecs.json` supplies a separate six-metre Hill Giant proportion/material
profile to the same authoring pipeline. `hillGiant-v1.glb` reuses the attributed
base and UAL1/UAL2 animations, with the same original fitted garment adaptations.
Its held rock uses the game's original primitive geometry. No new external asset
or licence is introduced by this variant.
`clawedBodySpecs.json` also supplies a Troll variant to
`prepare_anatomical_ghouls.mjs`, using the same CC0 anatomical source and adapted
UAL1 clips as the Ghoul/Ghast pair. The longer limbs, leaner proportions,
flattened claws and scar vertex colours are original adaptations. `troll-v1.glb`
shares the attributed anatomical surface textures through the existing packager.
`shadow-v1.glb` uses original faceless silhouette geometry authored by
`build_shadow.mjs`, bound to the same traveller armature and attributed shared
animation tracks. No external character mesh or texture is used.
`specter-v1.glb` uses an original continuous silhouette from `spirit_surface.mjs`
and the shared reaching/recoil clips, with an original still pose and vanishing
defeat animation from `build_specter.mjs`.
`wraith-v1.glb` uses the same original surface authoring and shared spirit clips,
with an original tapered lower-body profile (`build_specter.mjs --wraith`).
`flameskull-v1.glb` and its float, fire, recoil and extinguishing defeat animations
are original procedural work authored in `build_flameskull.mjs`, with no external
mesh, animation or texture source.
The first-pass `giant-hyena-v1.glb` runtime derivative derives from the retained
CC0 Quaternius Wolf source, with original anatomical adjustments and an original
procedural spotted coat and rounded ear geometry from `prepare_hyena.mjs`.
Outdoor earth and vegetation textures are generated by the repository's seeded
authoring script, `tools/combat-art/build_slice.py`. The
retargeted traveller contains animation tracks derived from the CC0 sources listed
above; their source mannequins and textures are not shipped. Procedural Three.js
geometry remains in use for weapons, props, fallbacks and effects.

Generated dungeon masonry and flagstone textures are stored under
`data/graphics/combat/textures/`. Their generation prompts, dimensions and hashes
are recorded under `docs/art/combat-study/`. The game also retains its existing
HTML, Canvas, CSS and Unicode presentation paths.

`data/graphics/tavern-interior-v1.png` is a fixed-view tavern backdrop generated
on 2026-10-23 with OpenAI's built-in image generation tool. Its exact prompt and
prototype scope are retained in `docs/art/tavern-study/`. This entry records AI
generation provenance; it does not assign a third-party licence or assert
exclusive rights to the generated image.

`data/graphics/tavern-keeper-v1.png`, `tavern-patron-v1.png` and
`tavern-guest-v1.png` are transparent person illustrations generated with
OpenAI image generation on 2026-10-23. They are shared visual stand-ins, not
likenesses of generated NPCs. The same provenance limitation applies.

The illustrated-building expansion adds `data/graphics/tavern-interior-v2.png`,
`merchant-interior-v1.png` / `-v2.png`, `blacksmith-interior-v1.png` / `-v2.png`,
and `greathall-interior-v1.png` / `-v2.png`, plus two transparent keeper images
per merchant, blacksmith and great hall (`{building}-keeper-v1.png` / `-v2.png`).
These were generated with OpenAI image generation on 2026-10-23. Keepers are
reusable illustrative stand-ins, not generated-NPC likenesses. The current
catalogue and provenance are documented in `docs/art/building-interiors/`;
no third-party licence or exclusive rights are asserted by this entry.

The 2026-10-24 procedural-people expansion adds separately generated transparent
barkeep, merchant and patron illustrations for independent assignment to NPCs.
The exact generated files, prompts, references and any processing are recorded
in the [procedural people generation manifest](../docs/art/building-interiors/procedural-people-generation-manifest.json).
These use OpenAI image generation and the project's written illustrated-interior
direction, with no reference images submitted. The manifest records 19 outputs
copied unchanged into the project. Reused 2026-10-23 images retain their provenance above. This entry
records generation history; it does not assert third-party licence clearance,
exclusive rights or a likeness of a real person. Final delivered coverage and
validation are recorded in the [implementation report](../docs/reports/2026-10-24-procedural-building-people.md).

`data/sound/tavern-ambience-v1.wav` was generated with ElevenLabs
`eleven_text_to_sound_v2` on 2026-10-23, generation `Wuv02Xke4rAqXC6amv42`.
The eight-second source was converted to PCM with `afconvert` and given a
0.3-second overlap crossfade, producing a 7.7-second, 44,100 Hz stereo loop.
Its source terms have not been independently verified; this entry records
provenance rather than licence clearance. See `docs/art/tavern-study/README.md`.

`data/sound/tavern-voices-v2.wav` and `tavern-activity-v2.wav` are 30-second
ElevenLabs-generated audition stems from 2026-10-23, flow
`xodcX5C2kTM26WLbci1e`, generations `EDWAA0bgpn7mn5rG0LMN` and
`o1OausvqpDiro3uGL8Wn` respectively. MP3 outputs were converted to PCM WAV with
`afconvert`, without an additional crossfade. Exact prompts/settings and source
terms limitations are recorded in `docs/art/tavern-study/audio-v2-provenance.md`.

### Settlement soundscape candidates — local review only

On 2026-10-24, the connected ElevenLabs creative tools generated twelve
30-second candidates using `eleven_text_to_sound_v2`, flow
`ScDJRu6ck1X1AZIIxbbR`, with `loop: true` and `prompt_influence: 0.65`.
Three selected candidates are retained under ignored `data/audio/local/`:

| Local audition file | Source generation | Take |
| --- | --- | --- |
| `settlement-merchant-v1.wav` | `6wK6m6tBRHGlFFFotznL` | 3 |
| `settlement-blacksmith-v1.wav` | `zwhdkskf4hfy5nkJXACD` | 2 |
| `settlement-greathall-v1.wav` | `U3tmpNxQOyFT2loBa9yt` | 4 |

MP3 sources were decoded with `afconvert` to signed 16-bit PCM WAV and adjusted
using constant gain toward -42 dBFS RMS. No additional sounds, compression,
resampling or crossfade were applied. Source/output hashes, generation records
and measurements are retained in the
[generation manifest](../docs/art/building-interiors/soundscape-generation-manifest.json).
Measured signal quality and the provider loop flag do not establish listening
approval. The sponsor separately accepted the three selected local outputs and
signed off issue #59 on 2026-10-24; this is listening acceptance, not release
clearance. The existing tavern files are unchanged by this addition.

These candidates are for local in-game audition only, excluded from public
builds and source distribution, and are not offered under the repository MIT
or SRD CC BY licences. Generation-account commercial entitlement has not been
independently established; a reported paid subscription does not identify the
connected account's applicable entitlement.

Terms checked 2026-10-24: [ElevenCreative Terms, Exhibit 4 section 2](https://elevenlabs.io/creative-terms)
permits incorporation into games subject to the underlying agreement and plan,
but restricts standalone distribution, isolated audio files and sound libraries.
The [UK/EEA Terms, section 1(c)](https://elevenlabs.io/terms-of-use-eu) distinguishes
paid commercial use from free noncommercial use; the applicable agreement
depends on the account holder. Before commercial release, retain entitlement
evidence and review the intended game delivery against those terms. Public
isolated audio or reusable-library distribution requires separate express
permission. Listening approval is separate from release clearance. This record
does not assert exclusive rights or grant downstream asset reuse rights.

### Additional settlement soundscape variations — private candidates

Ten further takes were generated on 2026-10-24 through connected ElevenLabs
creative tools, model `eleven_text_to_sound_v2`, flow `n4eCU5QS1N4N2ABJD7g6`:
one alternative per building and two exterior takes per village/town/city.
Requests used 30 seconds, `loop: true` and `prompt_influence: 0.65`. Exact prompts,
generation IDs, original MP3s, decoded WAVs, constant-gain processing and hashes
are recorded in the [variants manifest](../docs/art/building-interiors/soundscape-variants-generation-manifest.json).
Final `settlement-*-v2.wav` files remain under ignored `data/audio/local/` and are
excluded from public packages together with their `localOnly` catalogue entries.
Provider-reported total generation cost is $0.1818; this is not an invoice audit
or evidence of account entitlement. These candidates have no sponsor listening
approval. Existing accepted files remain unchanged. The same private-review and
release boundaries above apply; this entry makes no new licence or exclusive-rights
claim. See the [implementation report](../docs/reports/2026-10-24-soundscape-variety.md).

The historical `data/graphics/interiors/tavern-common-room-v1.glb` is original procedural room
geometry authored by `tools/tavern-art/build-room.mjs`, with original procedural
wood and the existing generated `dungeon-masonry-v1.png` and
`dungeon-flagstone-v1.png` embedded as textures.
The archived 3D tavern experiment separately reuses the original traveller models and attributed
CC0-derived animation sources above, with original procedural seated skeleton
poses and head gestures. The room GLB contains no resident meshes;
no new external model or texture source is introduced.

---

## Icons and Emojis

**Unicode emoji characters** are used throughout the UI:
- ⚔️ (Crossed Swords) - Combat indicator
- 📜 (Scroll) - Quest indicator
- 🗡️ (Dagger) - Weapon icon
- 🛡️ (Shield) - Defense icon
- ✨ (Sparkles) - Buff indicator
- 💫 (Dizzy) - Debuff indicator

Unicode emoji are part of the Unicode Standard and do not require licensing or attribution.

---

## Music

**No background music is currently included.** The game framework supports music playback but no music files are distributed at this time.

If music is added in future versions, attribution will be provided here.

---

## Future Asset Additions

When new third-party assets are added, they will be documented in this file with:
1. **Source:** Where the asset was obtained
2. **License:** Full license type and terms
3. **Author:** Original creator
4. **Purpose:** How the asset is used in the game

---

## Lion source for manticore adaptation — Wildfire Games

The model, texture and six motion clips in `tools/combat-art/sources/0ad-lion/`
are by [Wildfire Games](https://wildfiregames.com/), retained from the
[0 A.D. art repository](https://github.com/0ad/0ad/tree/master/binaries/data/mods/public/art).
They are licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
Original files, upstream licence, hashes and provenance are retained together.
`tools/combat-art/lion-candidate.glb` is a modified inspection conversion: it
combines source animation, corrects source units/material opacity, connects the
original texture and adds sampled grounding. The conversion and its renders
remain CC BY-SA 3.0, separate from the default code licence. No endorsement is
implied.

`data/graphics/combat/manticore-v1.glb` adapts this lion with an original human-like
face, folded membrane wings, curved spiked tail, bite/claw/tail-release motion and
a wing-fold during defeat. `tools/combat-art/build_manticore.mjs` and the retained
source provide the editable derivation. The combined manticore asset and its
renders remain CC BY-SA 3.0.

## Dragons — Cethiel and Drummyfish, CC0

The retained model, texture and animation source in
`tools/combat-art/sources/cethiel-dragon/` is
[Cethiel's Dragon 3D](https://opengameart.org/content/cethiels-dragon-3d), by
Drummyfish (3D model, texture and animation) and Cethiel (original dragon).
The creators release the model and both textures under
[CC0](https://creativecommons.org/publicdomain/zero/1.0/).
Original files and hashes are retained with provenance. The runtime conversion
uses the unchanged original PNG and adds original claw, breath and hit motion.
`data/graphics/combat/dragon-v1.glb` serves all three young dragons; shader palettes
provide their red, green and white colour variants without altering the source PNG.

## Bugbear — Quaternius derivative

`bugbear-v1.glb` uses the same retained CC0 Quaternius body and attributed motion
library. `tools/combat-art/bugbear_features.mjs` authors the original skinned fur
tufts, muzzle, nose, brows and ears; it introduces no external texture or mesh.
Grounded attacks and recovery reuse the shared offline motion authoring utility.

## Orc — Quaternius derivative

`orc-v1.glb` also derives from the retained CC0 Quaternius anatomical base and
shared attributed motions. Original lower tusks and hammered shoulder plates are
authored by `tools/combat-art/orc_features.mjs`; proportions and clothing are set
in `giantBodySpecs.json`. Source textures are reused unchanged. No new external
source or purchase is involved.

## Gnoll — Quaternius and KayKit derivatives

The `gnoll-v1.glb` runtime model combines the retained CC0 Quaternius
humanoid base and UAL motions with the retained CC0 wolf-derived hyena head.
Its spear guard and thrust are retargeted from Kay Lousberg's CC0 KayKit
Character Animations 1.1 melee rig, whose licence and provenance are retained in
`tools/combat-art/sources/kaykit-character-animations-1.1/`.
The original procedural hyena coat is reused unchanged. Head extraction,
body proportions, fitted clothing and the head-led Bite are Nexus Verge
adaptations. Source licences remain in their respective `tools/combat-art/sources/`
directories; build details are in `docs/art/combat-study/gnoll-candidate.md`.

## Bear source and owlbear adaptation — Wildfire Games

The retained `tools/combat-art/sources/0ad-bear/` model, texture, animations and
reference XML files come from [0 A.D.](https://github.com/0ad/0ad/tree/master/binaries/data/mods/public/art),
by [Wildfire Games](https://wildfiregames.com/), under
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
The original licence, exact paths and file hashes are retained beside the sources.
`tools/combat-art/bear-candidate.glb` is a modified inspection conversion combining
the matching animations, original texture, scaled glTF coordinate conversion and
sampled ground alignment.
This converted asset and any adaptations remain CC BY-SA 3.0, separately from
the project's code licence. No endorsement is implied.

`data/graphics/combat/owlbear-v1.glb` and the inspection candidate
`tools/combat-art/owlbear-candidate.glb` adapt that bear with original owl head,
beak, facial discs, eyes and neck feathers, plus original Beak and recoil motions.
The combined derivative and its renders remain **CC BY-SA 3.0**. The original
bear texture is retained unchanged. The additional feather albedo was generated
with OpenAI's built-in image generation, without third-party reference images;
its saved prompt and provenance are in `docs/art/combat-study/owl-feathers-v1.md`.

## Verification

Asset attribution can be verified by:
1. Checking source URLs provided above
2. Reviewing license files at source repositories
3. Examining the `data/sound/` directory for included assets
4. Running `npm run legal:verify` to check for missing attributions

---

## Updating This Document

This document should be manually updated whenever:
- New audio assets are added
- New graphics/textures are included
- Custom fonts are integrated
- Music tracks are added

Automated checks can be run with:
```bash
npm run legal:verify-assets
```

---

**Last Updated:** 2026-09-25
**Asset Directories Covered:** `data/sound/`, `assets/`, `data/graphics/combat/`, `tools/combat-art/sources/`
