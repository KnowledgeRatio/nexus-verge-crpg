**Status:** Approved — 2026-10-24

# Procedural building interiors and people

## Implementation update — 2026-10-24

The sponsor authorised implementation. The initial local slice now separates
rooms and character pools, persists seeded room/NPC/slot receipts, restores old
saves and enables the generic path for all four buildings. Existing two-room
sets are retained. The first asset pool and final validation are recorded in the
[implementation report](../reports/2026-10-24-procedural-building-people.md).
The larger room/pool expansion below remains optional future work; this plan is
not marked wholly implemented. No commit, deployment or final sponsor visual
acceptance is implied. The starting-point table and proposal text below record
the pre-implementation design, not current runtime behavior.

## Player outcome and scope

Different taverns should combine different rooms, barkeeps and patrons; different shops should combine different rooms and merchants. Returning to a place, including after save/load, should preserve its room and people's appearances. Use authored image pools assembled locally during play, with no runtime AI generation or API charge.

The original plan proposed the counts and implementation boundaries below; the
sponsor subsequently authorised the initial slice. This does not approve release
or require the later expansion counts. It changes no roadmap priority and creates
no GitHub issues. Keep patrons stable initially. Time-based patron rotation, new
services, additional NPC population, animated people and player/companion portrait
selection are outside this slice.

## Verified starting point

Source inspection on 2026-10-24 establishes the following local behavior; deployment and new browser validation are not claimed.

| Surface | Current implementation | Proposed change |
| --- | --- | --- |
| Rooms | [Catalogue](../../data/buildingInteriors.json) contains two variants for each of four building types. [Selector](../../src/ui/BuildingInteriorArt.js) hashes settlement identity/building type into the array; no saved variant receipt. | Give rooms stable IDs and save the selected ID, independently of staff art. |
| People | Tavern variants share three fixed images. Other buildings have variant-specific keeper art. Slots bind actual NPCs by role/order. | Slots describe placement and eligibility; a separate character catalogue supplies compatible images. |
| Counters | A clipped copy of the background covers the keeper's lower body; height and placement vary by room. | Keep room-authored placement/occlusion, testing every supported combination. |
| NPC identities | [NPCGenerator](../../src/systems/NPCGenerator.js) seeds NPCs from world seed and settlement coordinates; records include role and culture but no explicit species/anatomy or gender identity fields. | Add persistent visual assignment without changing names, dialogue, quests or gameplay RNG. Do not infer anatomy or gender from names/culture. |
| Interaction | [SettlementUI](../../src/ui/SettlementUI.js) passes real building NPCs and dialogue callbacks; the complete list remains available. | Preserve all NPC access, even when an NPC has no suitable illustration. |
| Persistence | [SaveManager](../../src/systems/SaveManager.js) serializes settlements, NPC Map and metadata. [SettlementManager](../../src/systems/SettlementManager.js) restores only selected NPC fields when regenerating records. | Explicitly restore appearance receipts and reconcile settlement/metadata/NPC copies; adding a field alone is insufficient. |

The [approved visual direction](../art/visual-direction.md) retains detailed illustrated rooms and service-person layers. These in-scene cutouts are a separate asset family from oil-painted character/item portraits. Follow the [image guide](../../tools/image-gen/style-guide.md), [interior briefs](../art/building-interiors/prompts.md) and [interior reference](../art/building-interiors/README.md); preserve world canon and accepted audio.

## Proposed data and assignment contract

Architect review should settle exact field names and integration boundaries before implementation. Follow [ADR-000/010, seeded generation, world-generation timing, ADR-011 and campaign filtering](../../.claude/rules/architecture.md).

1. **Room catalogue:** stable room ID, building type, accessible description, image, lighting/perspective profile, and named slots. Each slot defines allowed roles, pose/framing profile, anchor/scale, draw order and foreground occlusion. Keep the existing simple counter clip where it works; author a separate mask only when furniture geometry requires it. Avoid per-room code branches.
2. **Character catalogue:** stable artwork ID, image, eligible roles, composition profiles, authored identity constraints where applicable, campaign availability and provenance. Lighting direction, camera angle, standing/seated pose, body crop, hand/prop clearance and anchor position are compatibility requirements. A full standing patron cannot substitute for a seated patron merely because both are patrons. Filter campaign content once at catalogue load.
3. **Separate identity from composition:** use explicit NPC identity data when present; do not equate culture with anatomy. Existing generated NPCs lack some identity fields, so choose a canon-compatible visual representation without claiming demographic matching. If richer identity matching becomes necessary, route that design through Worldbuilder and Architect before extending generation. Do not alter NPC identity to fit available art.
4. **Independent seeded selection:** derive presentation seeds from world seed, stable settlement identity/coordinates, building type and a presentation algorithm version. Use separate room and NPC/slot streams; never advance gameplay/NPC-generation RNG. Sort candidate IDs before selection so JSON ordering is immaterial. Persist choices; sorting alone does not protect against future pool expansion.
5. **Assignment timing:** precompute room IDs and presentation seeds in settlement world metadata during finite world generation. Bind character IDs when actual NPC records exist, using those independent seeds. Existing lazy NPC creation needs this explicit boundary; it must not delay seed-computable room choices until rendering. Integrate the supported legacy generation path as well. Architect must review the split against the world-generation rule; it is a proposal, not a new exception to that rule.
6. **Saved receipts:** proposed settlement fields record presentation schema/algorithm/catalogue version, room ID per building and stable slot-to-NPC bindings. NPCs store their selected artwork ID. Store IDs, not image bytes or array indices. Update shared state through `gameState.set`; keep the existing Map serialization contract and plain-object restoration. Renderer consumes assignments without rolling or mutating saves.
7. **Stable occupants:** assign service roles first, then eligible actual patrons in deterministic order. Do not assign an NPC twice or repeat a character artwork within a scene, including staff/patrons when pools overlap. Save assignments for non-visible NPCs consistently where applicable; extra people remain in the list. Cross-settlement reuse is allowed: a large pool reduces repetition but does not guarantee unique people across an entire world.
8. **Pool shortage and missing assets:** relax only documented cosmetic preferences, never hard pose/role/identity constraints. If no unused compatible image exists, omit that cutout and keep the NPC's named interaction/list entry. Missing backgrounds retain the original list; missing image files retain names. Preserve saved IDs across transient network failures. For retired IDs, use an explicit versioned alias/replacement map or deterministic compatible fallback; record any permanent repair so reload cannot reroll it.
9. **Old saves:** missing receipt keys must load safely without a migration script. Preserve an old save's current room using the frozen legacy two-variant mapping, then store its stable ID; assign new people once through the compatibility path. Do not overwrite dialogue, relations, quests or learned information. Keep historical IDs available or explicitly aliased. New saves pin a catalogue version; adding assets must not alter existing receipts or unvisited assignments in that world.

## Phased delivery

| Phase | Deliverable and completion evidence | Responsible disciplines |
| --- | --- | --- |
| 1. Composition pilot | Inventory reusable art; define room slots and character profiles. Demonstrate at least two barkeeps in both taverns and two merchants in both shops. Inspect actual desktop/mobile composites before generating a large batch. | Creative Director, Frontend, Creative Prompt Engineer; Worldbuilder for identity/canon |
| 2. Data and persistence | Implement generic catalogue loading, deterministic assignment and versioned receipts; wire world generation, lazy NPC creation, restoration and UI. Characterize existing selection/services first. Keep presentation disable behavior and a reversible rollout switch in `RULES`. | Architect, Backend, Data, Frontend |
| 3. First playable pool | Add accepted assets to the proposed initial counts below. Validate generated settlements, stable return visits and real trade/rest/dialogue. Repair composition problems before expanding. | Creative Prompt Engineer, Frontend, Creative Director |
| 4. Wider variety | Expand approved pools and add smith/hall compatibility without new building-specific selection code. Use a seeded sample report to assess visible repetition and compatibility coverage. | Data, art and implementation owners |
| 5. Release readiness | Validate packaged assets, load cost, provenance, save compatibility and fallback. Complete documentation handoff and sponsor hands-on acceptance before default cutover. | Implementers, Documentation, Creative Director, Product Owner; sponsor accepts |

Suggested **total usable counts**, including compatible existing assets, are planning proposals rather than generation orders or promised coverage:

| Asset family | First playable pool | Later expansion |
| --- | ---: | ---: |
| Tavern rooms | 2 | 6 |
| Barkeeps | 6 | 16 |
| Tavern patrons | 12 | 30 |
| Shop rooms | 2 | 6 |
| Merchants | 6 | 16 |
| Smithy rooms / smiths | Existing 2 / 2 | 4 / 8 |
| Hall rooms / leaders | Existing 2 / 2 | 4 / 8 |

The first pool has up to 12 tavern room/barkeep pairings before patrons, and 12 shop/merchant pairings. These are upper bounds: compatibility filters reduce combinations. Coverage across pose and identity needs matters more than the raw count. Reuse existing artwork only after cross-room inspection; today's fixed pairing does not prove interchangeability. Keep the current bounded visible occupant count initially, rather than crowding mobile scenes to exhibit the entire pool.

## Acceptance and validation

- Same seed and pinned catalogue produce identical assignments regardless of visit order or NPC-list ordering. Different sampled settlements show multiple rooms and staff/patron combinations. Report distributions and filter shortages, rather than promising every settlement is unique.
- Return, rerender, save/load and app restart retain room, NPC artwork and slot bindings. Pool reordering/addition and missing/retired IDs follow the stated version policy. Exercise fresh campaigns, old saves, populated generated regions, lazy-created NPCs and plain restored objects through real constructors and save paths.
- Adding presentation consumes no gameplay RNG: compare NPC identities, quests and world output before/after. Missing roles create no invented NPC; empty/undersized pools introduce no duplicate figures and block no services.
- Inspect every declared-compatible room/profile combination using contact sheets, then representative actual scenes at desktop, 375px mobile and narrow landscape. Check counter/waist alignment, hands, alpha edges, shadows, perspective, furniture intersections and face readability. Include the existing tavern patron/bench overlap as a pilot defect to resolve.
- Verify mouse, touch and keyboard selection; visible focus, accessible names, Escape/focus return, readable buttons and the complete NPC list. Narrow layouts may retain the existing separate person cards where compositing becomes unreadable. No horizontal overflow or art-dependent access to quests, standing, rest, trade or recruitment.
- Run `npm test`, `npm run lint`, catalogue/schema/reference checks and `npm run build:web` for implementation; use `npm run lint:all` if configuration/nonstandard tooling changes. Run `npm run legal:verify` when asset/legal artifacts change. Record exact failures and baseline differences; passing unit tests alone does not establish visual acceptance.

## Cost, performance and handoff

Generation and manual review are offline costs. Do not quote a total currency cost before measuring pilot generation attempts, rejected candidates, cleanup and review time; cost per accepted compatible image is the useful measure. Load catalogue metadata once and decode only the active room/figures. Reuse cached images, dispose listeners on exit, and avoid preloading the whole pool. Record bytes per asset, cold/warm scene load, decoded image memory and build-size delta on desktop/mobile before scaling. Image dimensions/compression and numeric performance budgets should be set from that pilot evidence.

Check [web build packaging](../../scripts/build-web.mjs), media locking and deployed path resolution when introducing assets or catalogue files; do not assume a new file is automatically released. Retain provenance for prompts, references, outputs and edits. Asset generation, local visual acceptance and release clearance are separate checkpoints. No audio change or external publication is required by this plan.

After implementation settles, Documentation updates the interior reference, affected schema/save contracts and validation report; amend this plan's status only with evidence and the appropriate owner. Record an implemented milestone in the changelog under the workflow rules. The original planning pass performed source/path checks only. Subsequent implementation and validation are recorded in the report linked above; no deployment is implied.
