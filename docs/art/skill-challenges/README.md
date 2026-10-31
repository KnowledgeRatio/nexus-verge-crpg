# Illustrated skill challenges

Implemented locally on 2026-10-30: all 41 definitions in
[`skillChallenges.json`](../../../data/skillChallenges.json) and the separate
[branching bandit conversation](../../../data/skillChallenges/bandit-negotiation.json)
have scene metadata. The current library uses 27 image families, including
setting and terrain variants with usable default scenes.
All 41 encounter setups have expanded prose; selected existing approaches,
outcomes and climbing/search stages also have more specific wording. This pass
does not add checks, branches, rewards or conversation trees.

## Presentation and player flow

The images extend the detailed illustrated treatment of the
[settlement interiors](../building-interiors/README.md): worn materials,
restrained colour and warm light against cool atmosphere. They are environment
illustrations, separate from the approved oil-painted portrait/item family.
They do not assign a face to the generated player or NPCs, identify a culture,
or reveal a puzzle solution or reward.

The current door, river, rock, ruin, swamp and shore scenes use the sponsor's
corrected camera brief: a standing adult observer, with eyes about 1.65 metres
above the local walking surface, a normal lens and a natural downward look at
low obstacles. Foreground objects retain believable human scale. The
[scene camera contract](../../../tools/image-gen/style-guide.md#skill-challenge-scenes)
records this requirement; “first-person” alone is not a sufficient prompt.
The desert scene also retains a standing-readable composition. The five outdoor
scenes from the original slice were simplified into continuous natural landforms,
with coherent strata, worn stones, quiet water and restrained vegetation. This
naturalism correction removes the repeated spires, splinters, stumps and bristly
silhouettes identified in sponsor feedback; the same scene contract records the
landform brief.

The full-coverage rollout adds quieter object/encounter vignettes for social,
craft, care, tracking and other checks. Snow-covered undergrowth and a neutral
travel vignette avoid forcing one landscape into every environmental context.

Choice encounters show the scene above their existing approaches. The chosen
approach retains the illustration in the confirmation prompt and result screen.
Sequential encounters show the encounter setup alongside the current stage's
description; passive stages continue to resolve automatically through the
existing flow. An unresolved scene image is reused on the result screen: it is
atmosphere, not a separate depiction of the rolled outcome.

The separate branching social panel also shows the authored scene. Its existing
conversation nodes, choices, history and tension remain in use; the panel is
bounded and scrollable to accommodate the illustration.

[`ChallengeScene.js`](../../../src/ui/ChallengeScene.js) mounts optional artwork
in the shared modals through [`main.js`](../../../src/main.js). Missing metadata,
missing alt text, unmatched restrictions without a usable default, or a failed
image leaves the text and controls available. Images
remain hidden until loaded. Opening another check removes the previous scene,
including when the next check has no art. The existing modals retain their
scrolling and interaction behavior; narrow screens use a shorter image crop.

Set `RULES.skillChallenges.presentation.enabled` to `false` in
[`rulesEngine.js`](../../../src/core/rulesEngine.js) to disable the images.
Expanded narrative text remains in use.

## Local review study

Open [the local encounter study](http://127.0.0.1:8792/skill-challenge-study.html)
while the source preview server is running. Its source is
[`skill-challenge-study.html`](../../../skill-challenge-study.html); it is a local
review page, not a campaign entry point or published URL.

Select an **Encounter**, **Character level** (1, 5 or 10), **Setting**
(outdoors or dungeon), and **Terrain**, then choose **Open encounter**. Terrain
may be unspecified, jungle, snow forest, tundra, desert or swamp. The study uses the actual
shared Game prompts and skill manager with a temporary character. For sequential
encounters it opens the first non-passive stage, rather than playing the whole
sequence. **Review success result** shows a synthetic successful result with
fixed dice and no reward payload; it is a layout review, not a recorded roll.
**Review missing-art fallback** deliberately requests a missing image.
**Open branching social encounter** starts the actual bandit conversation with
study context; **Close social study** ends it. A study-only stub reports a
combat transition instead of starting combat. No saved campaign is loaded or
written by the study.

## Current coverage

| Illustration | Challenge IDs |
| --- | --- |
| `challenge-door-v2.png` | `locked_door` |
| `challenge-ruin-v2.png` | `trap_detect_disarm`, `arcane_puzzle`, `votive_record`; `hidden_treasure` in dungeons |
| `challenge-rock-v3.png` | `cliff_climb`, `mountain_climb`, `cliff_climb_advanced`; `narrow_ledge` outdoors |
| `challenge-desert-v2.png` | `heat_endurance`, `desert_wayfinding`; harsh-environment desert variant |
| `challenge-swamp-v3.png` | `swamp_navigation`; harsh-environment swamp variant |
| `challenge-river-v3.png` | `river_crossing` |
| `challenge-shore-v3.png` | `beach_salvage` |
| `challenge-parley-v1.jpg` | `bandit_negotiation` check and separate bandit social tree |
| `challenge-cache-v1.jpg` | `hidden_treasure` default |
| `challenge-wolf-v1.jpg` | `calm_wild_beast` |
| `challenge-watch-v1.jpg` | `sneak_past_guards`, `guard_patrol`, `gather_information` |
| `challenge-tablet-v1.jpg` | `ancient_text` |
| `challenge-care-v1.jpg` | `stabilize_wounded` |
| `challenge-tracks-v1.jpg` | `track_creature`, `predator_stalk` |
| `challenge-dialogue-v1.jpg` | `detect_lie`, `gather_rumors`, `intimidate_npc`, `negotiate`, `persuade_npc` |
| `challenge-distraction-v1.jpg` | `creative_distraction` |
| `challenge-caveledge-v1.jpg` | `narrow_ledge` default |
| `challenge-travel-v1.jpg` | `endure_harsh_environment` default |
| `challenge-snowgrowth-v1.jpg` | `dense_undergrowth` snow-forest variant; harsh-environment snow/tundra variant |
| `challenge-undergrowth-v1.jpg` | `dense_undergrowth` default; harsh-environment jungle variant |
| `challenge-boulder-v1.jpg` | `boulder_push` |
| `challenge-ice-v1.jpg` | `ice_climbing` |
| `challenge-market-v1.jpg` | `market_haggle`, `pickpocket_attempt`, `appraise_goods` |
| `challenge-warehouse-v1.jpg` | `warehouse_sneak` |
| `challenge-crops-v1.jpg` | `crop_trampling` |
| `challenge-forgefire-v1.jpg` | `forge_accident` |
| `challenge-smith-v1.jpg` | `identify_item_quality`, `craft_assistance` |

All current images are under [`data/graphics/`](../../../data/graphics/).
`hidden_treasure` now has a neutral compartment default and a dungeon-specific
stone chamber; `narrow_ledge` has a cave-shelf default and an outdoor rock
variant. Harsh environments use a travel default, with swamp, desert, snow and
jungle alternatives. Exact terrain IDs and precedence are in the
[schema contract](../../DATA_SCHEMA.md#skill-challenge-presentation).

The earlier slice covered 14 definitions with seven images. Its original
`challenge-forest-v1.png` remains an unused candidate; the rollout supplies
separate green and snowy undergrowth images instead. Settlement room art and
its people layers are unchanged. Catalogue coverage is not browser acceptance
of every scene and player flow.

## Procedural and narrative contract

The illustration follows the challenge definition already selected by the
existing procedural systems. The renderer selects the first valid authored
variant matching the current environment and supplied terrain, then falls back
to a valid base scene. It makes no new random selection. The renderer
does not consume gameplay RNG, change encounter eligibility or write game state.
No presentation receipt, new save field or migration is introduced. These finite
vignettes illustrate the authored obstacle rather than an exact regional view;
the river and heat illustrations do not match every surrounding biome. See the
[schema contract](../../DATA_SCHEMA.md#skill-challenge-presentation).

`Player` carries the existing terrain context through single, sequential and
choice prompts; confirmation, passive and outcome screens retain it. The social
manager includes scene metadata in its existing `challengeUpdate` event, and the
social renderer mounts it with the conversation context.

Approach wording describes the existing skill and attribute pair, and outcome
messages remain attached to their existing consequences. The prose expansion
does not create additional physical routes, NPC commitments or hidden effects.
World canon and authored encounter mechanics remain authoritative.

## Assets and validation

The full rollout adds 20 generated image families to the seven retained PNG
families. Exact selected generated PNG bytes are preserved in
[`originals/`](originals/). Delivery copies are same-resolution JPEGs encoded at
quality 88 with the Windows System.Drawing JPEG codec, without resizing or
cropping; JPEG delivery bytes are not the original PNG bytes.
[`rollout-generation-manifest.json`](rollout-generation-manifest.json) records
the 20 selected sources, prompts, delivery paths and three corrective edit
chains. The generating agent inspected all 20 selected source images and two
encoded JPEG spot checks. The web build's root-image allowlist now includes
PNG, JPG and JPEG; originals and archival images remain outside that packaging.

Before the full rollout, eight original PNGs, six perspective edits and five
naturalism edits were generated with the same built-in OpenAI image generation
tool. That slice used seven families across 14 definitions. All eleven
superseded images are retained in [`archive/`](archive/), outside the root-PNG
packaging allowlist. The unused `challenge-forest-v1.png` candidate is also
archived there, rather than shipped in the current build.
[`generation-manifest.json`](generation-manifest.json) records exact prompts,
source filenames and original workspace destinations for the original eight
images; `archivedFile` gives the current location of each superseded source. The
tavern reference was visually inspected; it was not supplied as an image input
to those original requests.
[`perspective-generation-manifest.json`](perspective-generation-manifest.json)
records the six edit prompts, their submitted v1 reference paths, current
`archivedReference` paths, generated source filenames and v2 destinations.
The generating agent visually inspected all six perspective edits for camera
elevation and foreground scale.
[`naturalism-generation-manifest.json`](naturalism-generation-manifest.json)
records the five later edit prompts, submitted and archived references,
generated source filenames and current destinations. The generating agent
inspected all five outdoor results: rounded continuous ridges and limestone at
the ledge, fewer low river boulders, open marsh pools and smooth muddy banks,
open shore sand with flat kelp and a blunt worn log, and a continuous desert
gravel plain with subdued outcrops. Provenance records generation,
not third-party licence clearance or exclusive rights.

### Initial implementation checks

The generating agent inspected all eight original outputs. Three renderer tests pass,
covering environment gating, load/error visibility, accessible descriptions,
stale-scene removal and disabled presentation. The latest focused skill-flow
check passed 38 tests in six files after the environment fix. The three renderer
tests passed again after final formatting cleanup; scoped renderer/test lint is clean.

The implementation agent's broader run passed 1,724 tests and failed 20 tests in
eight files. Reported failure categories include absent licensed source files,
12 missing mirrored agent skills, unavailable `az` in promotion tests, existing
building-art expectations and concurrent CallingReference test incompatibilities.
This is not a passing full-suite result. Repository lint reported 186 errors and
1,258 warnings on that run; scoped formatting errors were subsequently corrected.
The web build passed with 371 application files, 107 media files and a
174.89 MiB application bundle. Legal verification passed 12 checks with audio
attribution and stale-SBOM warnings.

Desktop/mobile browser validation could not run. CUA browser access first
reported an unavailable host, and native/Node REPL helpers repeatedly reported
an active request. A later inventory found a native Edge window, but selecting it
with `cua.getApp` timed out after 300 seconds awaiting app approval. No browser
flow verification was obtained. Asset inspection and renderer tests do not
establish responsive flow acceptance. No deployment, sponsor visual acceptance
or played-campaign acceptance is claimed. The final rebuild passed with the same
counts above. A structural comparison against the starting challenge catalogue
confirmed every mechanical field unchanged after excluding descriptions, outcome
messages and presentation metadata. All assigned image paths exist, the study's
script parses, and `git diff --check` passes.

### Perspective correction checks

The perspective correction changed image files and 12 catalogue paths, with no
mechanics, JavaScript, CSS or save changes. At that pass all six v2 PNGs were
1672 × 941 pixels, with bytes matching both the built-in generated sources and
packaged `dist/app` copies. All 14 assigned paths and `git diff --check` passed.
Its final build passed with 371 application files, 107 media files and a
176.07 MiB application bundle. Archiving the six superseded sources resolved the
earlier bundle-size failure caused by shipping both image versions.
The earlier test/build figures above describe the initial implementation; no
new gameplay tests were needed for this asset-only correction. No additional
browser or responsive-flow acceptance is claimed.

### Naturalism correction checks

The five naturalism edits replace nine catalogue mappings and update the river
and marsh alt text to describe the new visible subjects. Door/ruin v2, mechanics,
JavaScript, CSS, saved state and RNG are unchanged. The five replaced images are
archived. All five new PNGs are 1672 × 941 pixels and match the generated source
bytes. Archived references and all 14 assigned scene paths exist. Mechanical
fields remain identical to the starting catalogue after excluding prose and
presentation metadata, and `git diff --check` passes. The web build passes with
371 application files, 107 media files and a 175.39 MiB application bundle.
No gameplay tests were rerun for this asset-only pass. These checks include
source-image visual inspection, not browser acceptance; earlier checks remain
historical.

### Full-coverage rollout checks

The final focused rollout check passes 44 tests in eight files, including data
coverage across both environments and all authored terrains, variant/default resolution
and the social scene host. Coverage checks consume no RNG and write no game
state. Both flat and social catalogues retain identical mechanical fields after
excluding descriptions, outcome messages and presentation metadata. All current
scene paths exist and all 27 unique runtime paths match packaged `dist/app`
bytes exactly. The 20 retained PNG originals match generated source bytes, and
all 20 JPEG delivery copies retain their original dimensions.

The full suite passed 1,734 tests and failed 18: 157 test files passed and six
failed, across 1,752 tests in 163 files. Failures concern 12 missing mirrored
role skills, bear/dragon/lion retained-source hashes, two promotion tests with
`az ENOENT`, and a building-ambience count expecting two entries rather than six.
This is not a passing full-suite result. Scoped module, test and build-script
lint is clean. Repository lint reports 169 errors and 1,257 warnings; broad lint
reports 3,245 errors and 2,502 warnings.

After archiving the unused forest candidate, the final web build passes with
390 application files, 107 media files and a 180.31 MiB application bundle.
The study URL returns HTTP 200, and `git diff --check` passes.
Source-image inspection and two encoded-image spot checks do not establish
desktop/mobile browser acceptance; the browser host remains unavailable, and
no renewed native-app approval attempt was made for this rollout. No new
gameplay mechanics, story branches or save migration are introduced.
