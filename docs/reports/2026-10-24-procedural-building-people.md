# Procedural building people — initial local implementation

2026-10-24. The sponsor authorised the initial slice of the
[plan](../plans/2026-10-24-procedural-building-people.md). This report distinguishes
implemented behavior from scoped verification and remaining limitations; no commit,
deployment or sponsor acceptance of every new composite is claimed.

## Implemented scope

All four building types use independent seeded room and character selection,
enabled by `RULES.buildingPresentation.proceduralPeople.enabled`. Existing two-room
sets remain. Tavern keeps a barkeep and up to two visible patrons; merchant,
smithy and hall keep their service person. Actual NPCs and service callbacks are
unchanged; extra or unillustrated people remain in the complete list.

`BuildingPresentation.js` loads campaign-filtered catalogues, sorts candidates by
stable ID and uses separate presentation seed streams. Room metadata is prepared
at finite-world generation; NPC art binds after creation/restoration. Saved
settlement receipts hold versions, room IDs and slot-to-NPC mappings; NPC records
hold artwork IDs. The renderer is read-only. World metadata pins the catalogue
version, including unvisited assignments. No new gameplay RNG draws are added.

`SettlementManager` restores artwork alongside existing persistent NPC fields,
and reconciles settlement/metadata/NPC copies. `WorldGenerator` prepares restored
receipts and reconciles generated-region copies. The normal saved-game path in
`main.js` explicitly calls that preparation before restoring region cache entries.
Old saves retain the legacy room mapping where available and obtain missing
receipts without a migration script. Transient image failures do not reroll art;
missing catalogue IDs use deterministic repair. Duplicate or incompatible
cutouts are omitted without hiding NPC services.

The study supplies independent per-slot artwork selection for composition review.
Illustrated cutouts retain the approved room style rather than using the separate
oil-painted portrait direction. Counter clips and room-relative anchors remain
authored data; tavern patron placement was adjusted away from the bench edge.
Audio is unchanged by this slice.

## Asset inventory

The delivered catalogue contains 28 illustrations: six barkeeps, twelve patrons,
six merchants, two smiths and two hall leaders. Nineteen newly generated images
add 38,422,731 bytes; the remainder reuse existing art. No new room backgrounds
are added. Counts include reused assets and represent catalogue coverage, not
unique people across an entire world.

Exact generation provenance belongs in the
[character manifest](../art/building-interiors/procedural-people-generation-manifest.json).
See the [interior reference](../art/building-interiors/README.md) and
[data/save contract](../DATA_SCHEMA.md#building-interior-presentation).

## Initial-slice validation

Evidence supplied by the coordinating implementation agent before the gender
mapping follow-up below. The unrestricted preview matrix is historical composition
coverage; it does not mean all those NPC/art pairings remain selectable now.

| Check | Result and limit |
| --- | --- |
| First full suite | 1,706 tests in 153 files passed; precedes final asset additions and the saved-game reload integration fix. |
| Final code suite | 1,707 tests in 153 files passed in 63.41 seconds after the reload integration fix; final patron data additions were subsequently checked by catalogue and browser validation. |
| First browser matrix | 32 composites across four buildings, both room variants, 1440px desktop and 375px mobile; service flows checked without page errors. This does not establish all final pool combinations. |
| Final generated-world sample | A controlled sample of 41 generated settlements reached both tavern rooms, all six barkeeps, all six merchants and all twelve patrons. Generated NPC dialogue worked without page errors; this is not a whole-campaign natural-play acceptance run. |
| Save/load integration | Real `SaveManager` serialization/deserialization, saved metadata preparation, `SettlementManager.enterSettlement` and NPC regeneration retained exact room/art/binding receipts. |
| Repository lint | 171 existing errors and 1,184 warnings reported; not a clean lint run. |
| Catalogue/package validation | Unique IDs, role/profile compatibility, introduction versions, source image paths and all packaged `dist/app` images passed Node checks. |
| Web build | Passed: 232 application files, 107 media files; application 151.76 MiB, media 438.52 MiB. |
| Legal verification | All 12 checks passed. This is project verification, not a claim of exclusive rights. |
| Inputs, sizes and failures | Touch and keyboard Enter opened dialogue. Checks at 320px, 667px landscape and 1920px retained full heads and no horizontal overflow. Failed person images retained named conversations; failed room images retained the full list and conversations. |
| Composition matrix | 160 automated compositions: 64 keeper cases across four building types/two room variants/two viewports, plus 96 patron cases across twelve images/two slots/two rooms/two viewports. Four actual service flows passed; no page errors. |
| Corrected counter rerun | All 40 counter compositions and three service flows passed after the mobile width fix; no page errors. |
| Final focused checks | 15 tests in three files passed in 2.27 seconds; scoped ESLint `--quiet` passed. |
| Independent creative review | Creative Director accepted the scoped final compositions with no remaining blockers: all six barkeeps and six merchants against both rooms, all twelve patrons in both slots/rooms, and smith/leader combinations through desktop/mobile contact sheets and full-size spot checks. Merchant mobile clipping is resolved. |

Documentation source inspection traced catalogues, selection, world-generation
and restoration entry points, renderer and study controls. It is not an
independent browser acceptance run.

Independent creative review caught top clipping on merchants 3 and 6 at mobile
widths: a forced 36% character width overrode the authored 28%. The generic CSS
now respects the authored width. Follow-up browser checks confirm head clearance;
the web build and complete counter-scene rerun passed after this correction.

Retained [validation evidence](../art/building-interiors/procedural-people-validation.json)
records the automated checks. Representative captures show a
[generated tavern](../art/building-interiors/procedural-generated-tavern.png),
[mobile merchant](../art/building-interiors/procedural-merchant-mobile.png),
[desktop merchant](../art/building-interiors/procedural-merchant-desktop.png) and
[alternate tavern](../art/building-interiors/procedural-tavern-variant.png).
Automated layout/service checks and these representative captures do not imply
manual artistic inspection of every possible patron pair.

Remaining visual limitations are consistent with the existing tavern presentation:
feet lack convincing contact shadows, wider garments occasionally meet bench
edges awkwardly, and full-body faces are small on mobile. The independent review
classified these as non-blocking for this slice. The coordinating agent also
inspected the final corrected mobile merchant and generated tavern captures.

## Follow-up — match existing artwork to the naming gender

The sponsor approved male/female mapping of existing images without regeneration.
`NPCGenerator` now records `npc.gender` from the gender draw already used by
`generateName`; generated names, IDs and RNG consumption remain unchanged.
Settlement entry restores saved gender, then replays the original seeded roster
for records still missing it. Replay copies only gender and only when both ID
and name match; unmatched/custom records remain unspecified, with no guessing
from a name or culture and no replacement of dialogue, quests or relations.

All 28 entries in `buildingPeople.json` now declare `identityConstraints.gender`.
Male/female counts are barkeeps 3/3, patrons 7/5, merchants 3/3, smiths 1/1 and
leaders 1/1. Generic compatibility matching filters these against explicit NPC
gender. Saved incompatible artwork is deterministically reassigned and persisted;
compatible saved artwork stays stable. Unknown gender retains the existing
unconstrained compatibility behavior, and saved null omissions remain intact.
The six study NPCs have explicit gender, and study selectors use the same
compatibility helper as production. No new assets or artistic regeneration are
part of this follow-up.

This supersedes the initial plan's observation that generated NPCs had no gender
field; it does not add anatomy/species matching. The earlier matrix and artistic
acceptance remain historical asset/composition evidence, not validation of this
new assignment filter. Focused backend checks passed 18 tests, including frozen
legacy generation equivalence for core/Nexus cities (all previous generated fields
identical except added gender), ID/name-only old-save recovery, artwork repair and
canonical saved-gender restoration. Seven focused frontend tests passed, including
rejection of mismatched study URL choices. Final full-suite, build/lint and
generated-browser results follow below.

The final controlled 41-settlement browser sample found every assigned image
consistent with explicit NPC gender and reached all six barkeeps, six merchants
and twelve patrons. Save/load remained stable. A synthetic old-save case removed
gender fields and substituted incompatible keeper artwork; ordinary settlement
entry recovered the original gender and repaired the art while preserving the
name. Dialogue worked without page errors. Retained
[gender validation](../art/building-interiors/procedural-gender-validation.json)
and a [tavern capture](../art/building-interiors/procedural-gender-tavern.png)
record this follow-up; it remains a controlled sample rather than full-campaign play.

The web build passed again with 232 application files, 107 media files and a
151.76 MiB application bundle. Repository lint reports 169 existing errors and
1,184 warnings; two nearby pre-existing curly-brace errors were corrected in
`NPCGenerator`, so the lower count is not a clean lint result. The final focused
rerun passed eight tests in two files in 5.72 seconds. The final complete suite
passed all 1,715 tests in 155 files in 236.67 seconds, including the eight new
tests. No images were regenerated and nothing was committed or deployed.

## Remaining boundaries

Larger room libraries and later pool counts are optional future expansion, not
completed work. Patrons remain stable; no time-based rotation, new NPC population,
demographic inference, runtime image generation or new services are introduced.
Profiles enforce authored composition compatibility but do not measure lighting
or anatomy automatically. Saved null omissions and unavailable identities remain
accessible through the list. Public release and whole-campaign visual acceptance
are separate from this local implementation.
