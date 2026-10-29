# Illustrated building interiors

Current local direction, updated 2026-10-24. The sponsor selected generated room images
with character-image layers after trying the [3D tavern experiment](../tavern-study/README.md).
There are two room variants for each existing building: tavern, merchant,
blacksmith and great hall. This changes interior presentation, not the outdoor
town scene or the existing services. No deployment or final acceptance of all
new compositions is implied.

The initial procedural-people slice is enabled locally: each building keeps a
saved room selection and independently assigned NPC artwork. Returning or loading
a save preserves those choices. The two existing rooms per building remain;
larger room libraries and rotating patrons are not implemented. See the
[implementation report](../../reports/2026-10-24-procedural-building-people.md)
for current pool counts and validation scope.
The current pool contains six barkeeps, twelve patrons, six merchants, two smiths
and two hall leaders. Independent creative review accepted the scoped final
compositions; tavern contact shadows, occasional bench/garment intersections and
small mobile faces remain non-blocking visual limitations.

## Preview and player flow

Enter a building through the settlement in `index.html`. In the standalone study,
open `settlement-study.html?building=merchant&variant=1` on the local preview
server (current soundscape review instance: port 8780). The **Visit** control selects the
square or any of the four buildings; **Interior version** selects the settlement
default, Version 1 or Version 2. URL `building` values are `tavern`, `merchant`,
`blacksmith` and `greathall`; optional `variant` is `1` or `2`.

The study also provides per-slot person selectors for reviewing compatible
cutouts against either room. These controls override the preview only.
Selectors honor the fixture NPCs' explicit genders as well as role/profile
constraints; the preview no longer offers every image to every fixture.
The study uses six temporary NPCs and real dialogue/rest/trading code, with a
temporary character and merchant manager. It does not write a saved campaign.
Its variant override is a review control, not a player-facing preference.
The old `view=3d` parameter does not activate a 3D room.

Merchant and blacksmith views place the player on the customer's side of a
counter; the great hall uses a reception desk. A duplicate, clipped foreground
slice of the room image places the keeper behind the counter. Characters are
reusable illustrations assigned to actual NPCs, not individually generated
likenesses or inferred matches for gender/anatomy. Role matching attaches
an actual NPC name and existing dialogue callback; empty slots add no invented
NPC. Tavern retains its common-room composition and up to three illustrated
occupants. Named interactions open the existing dialogue/service flow.

**Everyone here** retains all NPC cards with quests and standing, including
people without an illustration. It collapses only after the background loads.
Missing room art leaves the original NPC list available; missing character art
leaves its named button. Disabling `RULES.buildingPresentation.enabled` restores
the original NPC presentation. Existing dialogue focus, close/Escape, rest and
trading controls remain in use.
Disabling `RULES.buildingPresentation.proceduralPeople.enabled` instead retains
the illustrated fixed-art selection path. Saved procedural receipts are retained.

The tavern keeps the sponsor-approved voices/activity soundscape, unchanged at
gains 0.55 and 0.14. It starts off on entry; Enable/Mute and Room level remain.
Exit/rerender disposes playback; tab hide
pauses it; in-game master/music settings still apply. The earlier fireplace
file is retained historically but is no longer selected by the catalogue.
Merchant, smith and hall have private local soundscapes with the same opt-in
controls. On 2026-10-24, the sponsor accepted their final review and signed off
completion of [issue #59](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/59).
These mixes remain removed from public build catalogues; their ignored audio
files are not packaged. Listening acceptance does not establish public-release
clearance or approval of the broader proposed audio identity.
See the [soundscape review and validation](../../reports/2026-10-24-settlement-soundscapes.md)
for local audition links and [generation provenance](soundscape-generation-manifest.json).

The subsequent soundscape-variety slice adds one private candidate alternative
per building and two exterior candidates each for villages, towns and cities.
The local catalogue therefore has two mixes per building and per settlement size.
The original accepted four mixes and their files remain intact; the ten new takes
have no sponsor listening approval. Technical playback checks are not acoustic
acceptance. [Generation provenance](soundscape-variants-generation-manifest.json)
and the [variety report](../../reports/2026-10-24-soundscape-variety.md) distinguish
these candidates from the earlier accepted selection.

Audition at [the local settlement study](http://127.0.0.1:8781/settlement-study.html):
choose village/town/city, keep **Visit** on the square for exterior sound or select
a building, then **Enable ambience**. **Sound** chooses a mix; **Ambience level**
controls exterior gain and **Room level** controls interior gain. Mix selection
starts from the settlement's saved seeded choice, independently of its room art;
manual changes last only for that mounted view. All entries start muted. Entering
a building, leaving the settlement, a hostile/restricted view or hiding the tab
stops exterior playback; returning to the square requires enabling it again.
Two mixes expose a selector; a single available public mix hides it. Public builds
retain only the accepted tavern mix from these pools and expose no private exterior
controls. This is a local audition feature, not release or listening approval.

## Data and implementation

[`data/buildingInteriors.json`](../../../data/buildingInteriors.json) maps building
types to presentation defaults and `variants`. A selected variant shallowly
overrides the base fields; its `people` array replaces the base array.

| Field | Meaning |
| --- | --- |
| `variants[].id`, `introducedVersion`, `campaignIds` | Stable room identity, catalogue introduction version and campaign filtering |
| `variants[].image`, `alt` | Room image path and accessible description |
| `caption` | Room caption/instruction |
| `people` | Slots with stable `id`, compatible `profile`, percentage `x`, `y`, `width`, and eligible `roles`; `image` retains fixed-art rollback artwork |
| `legacyVariantIds` | Frozen room-ID order for restoring old saves' former room mapping |
| `counterForeground` | Percentage from the top used to clip the duplicate foreground image; optional at base or variant level |
| `glow` | Optional percentage `x`/`y` for the hearth effect |
| `ambience` | Optional labelled mixes containing `tracks` with audio `url` and `volume` |
| `ambience[].localOnly` | Private audition mix; stripped from the packaged catalogue, including variant-level mixes |
| `ambience[].id`, `campaignIds`, `introducedVersion`, `settlementTypes` | Stable sound identity, campaign/version eligibility and optional settlement-size filtering |

[`BuildingPresentation.js`](../../../src/systems/BuildingPresentation.js) loads
and campaign-filters both catalogues once. [`buildingPeople.json`](../../../data/buildingPeople.json)
defines independent artwork IDs, image paths, eligible roles and composition
profiles. Profiles represent pose/crop/lighting compatibility, not NPC demographics.
Optional identity constraints only compare explicitly present NPC fields.
All current images declare male/female eligibility. `NPCGenerator` saves the
gender already selected by name generation, with no new RNG draw or renamed
NPCs. Old generated NPCs recover that value by replay only when ID and name match;
unmatched/custom NPCs remain unspecified. Existing saved gender takes precedence.
Previously incompatible artwork is deterministically reassigned once, then saved.
This adds no images and makes no inference about anatomy or gender from culture
or the spelling of a name.

Room choices use a separate seeded stream and stable sorted candidate IDs.
Finite-world generation prepares room receipts; settlement entry restores actual
NPCs and binds their art and slots. NPC IDs, dialogue and gameplay RNG are unchanged.
The renderer resolves saved receipts without rolling. Selection is pinned by
world/settlement catalogue version, so later additions must increment the catalogue
version and their `introducedVersion`. Preserve stable IDs and profile meanings.
See the [save/data contract](../../DATA_SCHEMA.md#building-interior-presentation).

Each scene renders at most one copy of each artwork and NPC. Incompatible,
duplicate or unavailable art is omitted while people remain in the complete list.
Saved null omissions remain stable. Missing catalogue IDs can be repaired
deterministically; transient image failures do not change the saved assignment.
Old saves receive receipts through the existing load/entry paths using
`legacyVariantIds`. The old hash selector remains only for the disabled procedural
path and review controls. No culture/settlement-size room mapping is implied.

[`SettlementUI.js`](../../../src/ui/SettlementUI.js) passes settlement identity
and actual building NPCs to the generic mount.
[`SettlementStudy.js`](../../../src/ui/SettlementStudy.js) supplies review-only
variant overrides and fixture service routes.
[`BuildingAmbience.js`](../../../src/ui/BuildingAmbience.js) manages optional
audio independently of the room art. [`styles.css`](../../../styles.css)
controls responsive compositing and mobile interaction layout.

[`SettlementSoundscapes.js`](../../../src/systems/SettlementSoundscapes.js) selects
and resolves independent saved mix receipts. Exterior pools are in
[`settlementSoundscapes.json`](../../../data/settlementSoundscapes.json);
[`SettlementAmbience.js`](../../../src/ui/SettlementAmbience.js) mounts their
opt-in controls in the settlement toolbar. Missing private saved IDs are preserved
when only public media is available. The [schema](../../DATA_SCHEMA.md#settlement-and-building-soundscapes)
records persistence and fallback semantics.

## Assets and provenance

The 2026-10-24 character-pool expansion uses illustrated transparent cutouts,
separate from the approved oil-painted portrait family. Its exact asset list and
generation/editing provenance are recorded in
[`procedural-people-generation-manifest.json`](procedural-people-generation-manifest.json).
The report above records delivered counts; the paragraph below describes the
earlier room expansion and is retained as historical provenance.

The expansion adds seven room backgrounds and six transparent keeper images:
one additional tavern, two rooms each for merchant/blacksmith/great hall, and
two keepers each for those three counter/desk buildings. The original tavern
background and its three character images are reused. New images were generated
with OpenAI image generation on 2026-10-23. The art brief is in
[`prompts.md`](prompts.md); submitted prompts, reference assets and generated
source identifiers are recorded in
[`generation-manifest.json`](generation-manifest.json) (13 unique records).
This records generation provenance, not a third-party licence or exclusive-rights
claim. [Tavern audio provenance](../tavern-study/audio-v2-provenance.md) is unchanged.

Root-level PNGs are included by the existing application build allowlist. The
archival 3D room GLB is no longer explicitly packaged; its renderer/builder files
are retained for reference, without a normal UI mount.

## Validation

The following results describe the 2026-10-23 fixed-art expansion. For the
2026-10-24 procedural assignment slice, use the linked implementation report;
these older captures do not validate every newly generated person combination.

Implementation and data selection have been source-inspected. Four focused
selection/presentation tests passed. Browser checks covered all four buildings
and both variants on desktop and 375px mobile, named dialogue, merchant/smith
trading, missing-art fallback and audio cleanup, with no horizontal overflow.
These are fixture flows, not generated-campaign acceptance.

The full suite passed 1,694 tests and timed out in one existing animation test
at 30 seconds. An isolated `GroundedHumanoids` rerun with a 60-second allowance
passed all 12 tests in 13.14 seconds; this is an isolated recovery, not a second
complete-suite pass. The web build passed with 211 application files, 107 media
files and a 115.09 MiB application bundle. Legal verification passed 12 checks.
Repository lint reports 171 errors/1,174 warnings; broad lint reports 3,247
errors/2,419 warnings. Scoped lint passed.

Sixteen desktop/mobile captures are retained in this directory:

| Building | Version 1 | Version 2 |
| --- | --- | --- |
| Tavern | [Desktop](tavern-v1-desktop.png) / [mobile](tavern-v1-mobile.png) | [Desktop](tavern-v2-desktop.png) / [mobile](tavern-v2-mobile.png) |
| Merchant | [Desktop](merchant-v1-desktop.png) / [mobile](merchant-v1-mobile.png) | [Desktop](merchant-v2-desktop.png) / [mobile](merchant-v2-mobile.png) |
| Blacksmith | [Desktop](blacksmith-v1-desktop.png) / [mobile](blacksmith-v1-mobile.png) | [Desktop](blacksmith-v2-desktop.png) / [mobile](blacksmith-v2-mobile.png) |
| Great hall | [Desktop](greathall-v1-desktop.png) / [mobile](greathall-v1-mobile.png) | [Desktop](greathall-v2-desktop.png) / [mobile](greathall-v2-mobile.png) |

Additional browser checks verified genuine alpha in all six new keeper images
(corner samples 0–1/255, centre samples 252–253/255), stable variant selection
after reload, no 3D host, usable original NPC cards after background failure,
and usable named Talk after portrait failure. No page errors were reported.
Approved voices/activity file hashes match their pre-change values. The merchant
Version 1 mobile composite was independently inspected. Creative review inspected
all 16 captures and found no material defects in counter or mobile compositions.
The inherited tavern standing patron still overlaps a bench and has weak contact
shadows; this remains a non-blocking visual limitation. This scoped review does
not replace the sponsor's final acceptance of the new interiors.
