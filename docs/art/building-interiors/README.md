# Illustrated building interiors

Current local direction, 2026-10-23. The sponsor selected generated room images
with character-image layers after trying the [3D tavern experiment](../tavern-study/README.md).
There are two room variants for each existing building: tavern, merchant,
blacksmith and great hall. This changes interior presentation, not the outdoor
town scene or the existing services. No deployment or final acceptance of all
new compositions is implied.

## Preview and player flow

Enter a building through the settlement in `index.html`. In the standalone study,
open `settlement-study.html?building=merchant&variant=1` on the local preview
server (current review instance: port 8779). The **Visit** control selects the
square or any of the four buildings; **Interior version** selects the settlement
default, Version 1 or Version 2. URL `building` values are `tavern`, `merchant`,
`blacksmith` and `greathall`; optional `variant` is `1` or `2`.

The study uses six temporary NPCs and real dialogue/rest/trading code, with a
temporary character and merchant manager. It does not write a saved campaign.
Its variant override is a review control, not a player-facing preference.
The old `view=3d` parameter does not activate a 3D room.

Merchant and blacksmith views place the player on the customer's side of a
counter; the great hall uses a reception desk. A duplicate, clipped foreground
slice of the room image places the keeper behind the counter. Characters are
reusable illustrations, not likenesses of procedural NPCs. Role matching attaches
an actual NPC name and existing dialogue callback; empty slots add no invented
NPC. Tavern retains its common-room composition and up to three illustrated
occupants. Named interactions open the existing dialogue/service flow.

**Everyone here** retains all NPC cards with quests and standing, including
people without an illustration. It collapses only after the background loads.
Missing room art leaves the original NPC list available; missing character art
leaves its named button. Disabling `RULES.buildingPresentation.enabled` restores
the original NPC presentation. Existing dialogue focus, close/Escape, rest and
trading controls remain in use.

The tavern keeps the sponsor-approved voices/activity soundscape, unchanged at
gains 0.55 and 0.14. It starts off on entry; Enable/Mute and Room level remain.
The single mix hides the sound selector. Exit/rerender disposes playback; tab hide
pauses it; in-game master/music settings still apply. The earlier fireplace
file is retained historically but is no longer selected by the catalogue.
Merchant, smith and hall have no configured ambience in this pass. Acceptance of
the tavern sound does not approve the broader proposed audio identity.

## Data and implementation

[`data/buildingInteriors.json`](../../../data/buildingInteriors.json) maps building
types to presentation defaults and `variants`. A selected variant shallowly
overrides the base fields; its `people` array replaces the base array.

| Field | Meaning |
| --- | --- |
| `variants[].image`, `alt` | Room image path and accessible description |
| `caption` | Room caption/instruction |
| `people` | Slots with character `image`, percentage `x`, `y`, `width`, and optional eligible `roles` |
| `counterForeground` | Percentage from the top used to clip the duplicate foreground image; optional at base or variant level |
| `glow` | Optional percentage `x`/`y` for the hearth effect |
| `ambience` | Optional labelled mixes containing `tracks` with audio `url` and `volume` |

[`selectBuildingInterior`](../../../src/ui/BuildingInteriorArt.js) hashes
settlement `id` plus building type, falling back to settlement coordinates/name
when no ID is present. The resulting index is stable for that identity and
catalogue order. It consumes no world RNG and writes no variant receipt to the
save; changing variant order/count can change the selected artwork. No culture
or settlement-size art mapping is implied.

[`SettlementUI.js`](../../../src/ui/SettlementUI.js) passes settlement identity
and actual building NPCs to the generic mount.
[`SettlementStudy.js`](../../../src/ui/SettlementStudy.js) supplies review-only
variant overrides and fixture service routes.
[`BuildingAmbience.js`](../../../src/ui/BuildingAmbience.js) manages optional
audio independently of the room art. [`styles.css`](../../../styles.css)
controls responsive compositing and mobile interaction layout.

## Assets and provenance

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
