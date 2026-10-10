# Prevent targetless Investigation offers

**Status:** Implemented locally, then extended with sponsor approval on 2026-10-10. Desktop/mobile completion and rewards now pass. The original bounded specification and its initial validation below are historical; the approved extension is recorded at the end. **Date:** 2026-10-09; validated 2026-10-10.

**Approved policy:** the sponsor approved withholding Investigation offers when no eligible world target exists, and the Product Owner-led execution structure.

**Implementation authorization:** the sponsor authorized continuing this bounded repair on 2026-10-10, then requested near-universal town Investigation availability and continuation of the reward repair. Recovery of old targetless quests remains a separate decision. The active roadmap remains GitHub #41/#57, with #39 retaining tracking/reputation ownership; no GitHub mutation, commit or deployment is included.

## Player outcome and evidence

A newly visited settlement offers an Investigation quest only when its objective points to an existing eligible world feature. Fewer truthful offers are acceptable when no such feature exists.

The investigation report's explicit small/core/normal sample found 43 of 100 starting towns with no linked dungeon hook. Those towns generated Investigation objectives with null target fields. A direct `QuestManager._getRoomInvestigations` comparison showed a targetless objective matched no actual room; a bound control matched only the intended dungeon's first room. This establishes a producer/consumer gap, not a general rate for every world configuration.

## Bounded implementation

**Production ownership:** Backend Dev, after sponsor approval.

Change `src/systems/QuestGenerator.js`, `_generateInvestigateChain`:

```js
if (hooks.length === 0) {
    return null;
}
```

Place the guard before generating Investigation subjects or selecting a hook. Update the method's return documentation to allow null. Keep the valid-hook path and RNG operations unchanged.

Use the existing hook contract from `getHooksForSettlement`: authoritative metadata features that are either standalone dungeons or POIs resolved to dungeon, associated with this settlement, and not already bound at lookup. Sanctuary POIs and another settlement's hooks are ineligible. This repair does not create another world-ID scheme or widen the hook search.

`generateQuestsForSettlement` already applies `.filter(Boolean).slice(0, budget)`. `SettlementManager` assigns and persists the returned array rather than requiring three quests. Therefore the missing offer needs no replacement quest, new state field, schema or migration.

When `enableWorldHooks` is disabled or eligible metadata is absent, Investigation is withheld by the same empty-hook rule. Existing kill/retrieval behavior is outside this repair.

Valid Investigation targets, skills, room selection, DCs, rewards, narrative and completion consequences retain existing behavior. A reachable metadata target does not establish that every character can physically travel there without risk; navigation and skill-value evaluation remain separate evidence.

## Save compatibility

This is **prevention for newly generated offers**.

Existing available/active quests are restored directly. Settlements marked `questsGenerated` do not regenerate. Do not remove, fail, relocate or rebind old quests, clear that marker, or award compensation in this slice.

Previously saved targetless quests therefore remain unresolved. A recovery policy requires separate sponsor consultation. This boundary must be stated in completion notes so the prevention fix is not presented as a migration repair.

Valid existing quests, progress, NPC assignments and rewards must survive save/load and revisit without duplicates.

## Validation and acceptance

Backend Dev should add focused producer/consumer integration coverage under `tests/systems/`, following existing quest tests. Test distinct behavior, not merely the guard's implementation.

- [ ] Generate with no eligible hooks: no Investigation offer; no substitute; existing other quest payloads unchanged for the same seed.
- [ ] Generate with valid standalone and dungeon-POI hooks: the target references an actual eligible metadata feature and matches the intended room through real `QuestManager._getRoomInvestigations`.
- [ ] An unrelated dungeon/room, sanctuary POI, other settlement's hook or already-bound hook does not satisfy the offer's target contract.
- [ ] Missing metadata, disabled world hooks and multiple eligible hooks have defined results; quest caps 0/1/2/3 remain respected.
- [ ] Valid-hook generation remains identical for the same seed and level compared with the current baseline.
- [ ] Reduced offer counts pass through settlement assignment and presentation without dangling NPC quest IDs or exceptions.
- [ ] Save/load and revisit preserve valid targets/progress and the reduced offer count, without regeneration or duplicated rewards. Legacy invalid available/active quests remain unchanged.
- [ ] Repeat `approved-skill-route-0` through `approved-skill-route-99` under the original small/core/normal setup at levels 1/5/10: zero newly generated targetless Investigations. Record generated, withheld and target-valid counts separately; fewer offers must not be described as increased frequency.
- [ ] Sample 20 seeds using the verified player-entry default configuration, recording actual map size, campaign and difficulty. Do not infer shipping configuration solely from constructor defaults.
- [ ] Demonstrate a valid settlement offer → acceptance → correct-room search → completion/reward flow, including existing deliberate retry behavior and a representative legal nonspecialist. This does not add a guaranteed-success route.
- [ ] Run `npm test -- --testTimeout=30000`, `npm run lint` and `git diff --check`; distinguish new failures from the previously documented repository lint debt. Exercise relevant settlement UI flow; no new visual design is proposed.

Record any existing save/reward/UI defect exposed by the flow rather than expanding this repair silently. Consult the sponsor if it prevents acceptance.

### Local validation result — 2026-10-10

The guard and nullable return documentation are implemented. Twenty focused tests in `tests/systems/questInvestigation.targets.test.js` cover excluded hooks, real producer/consumer matching, unchanged valid and other-quest baseline payloads at levels 1/5/10, budgets, no-hook RNG preservation, settlement assignment, SaveManager restore and revisit. Valid progress persists; legacy invalid quests remain untouched. The first nine acceptance checks above pass for their stated target/persistence behavior; duplicate reward delivery is not proven because turn-in fails.

The reproducible `tools/balance-sim/investigation-target-audit.js` records 120 real worlds and 360 paired level evaluations in its adjacent results JSON: zero newly targetless Investigations. Each level in the original 100 small/core/normal worlds has 57 valid offers, 43 withheld and 257 total quest offers. Each level in 20 actual-entry medium/defeatLichKing/normal worlds has 18 valid offers, two withheld and 58 total offers. These are paired evaluations, not independent level trials. The selected entry campaign differs from the data default and is marked disabled in campaign data; this setup discrepancy is recorded without changing it.

Desktop 1440×900 and mobile 390×844 browser fixtures use the actual quest board, acceptance, room matcher, deliberate retry prompt and turn-in button with a legal nonspecialist Knight. Two no-hook offers and three bound offers render correctly. Initial search failure and paid retry success work; fatigue reaches two. Fixtures use supplied metadata and displayed containers, not physical world travel. Turn-in then throws `character.addXP is not a function` in `QuestManager.awardRewards`; `Character` implements `gainXP`. The quest remains active, with no completed entry, XP or gold awarded. The completion/reward acceptance checkbox remains open. This existing defect is outside this repair and requires sponsor consultation before changing reward code.

Full tests: 1,296 passed in 112 files. Standard lint fails with 190 existing errors and 1,062 warnings; broader lint fails with 3,266 existing errors and 1,862 warnings. The new audit harness has zero lint errors and contributes seven warnings. `git diff --check` passes. No data or balance settings changed, and nothing was committed or deployed.

## Dependencies and roles

Product Owner owns scope and acceptance gates. Architect has reviewed existing target IDs, caller handling and persistence; Game Designer/sponsor have approved absent-hook withholding. Backend Dev implements after approval, with targeted Frontend review of reduced offer presentation if needed. Balance Engineer reproduces target-validity samples; Mechanics Master verifies the actual objective consumer.

This creates a trustworthy foundation for #41 opportunity measurement and #57 evidence/resolution design. Neither issue is complete when this repair passes. #39 remains independent. Retrieval item production needs separate investigation; missing hooks do not establish kill quests are impossible.

After validation, report the exact local changes, results and compatibility limits to the sponsor. GitHub/project mutations, commits and deployment require applicable authorization; none are part of this specification.

## Approved extension — 2026-10-10

The sponsor requested almost every town, including later visited towns, have a valid Investigation offer. Game Designer and Architect approved preserving the owned-hook path and adding an Investigation-only fallback: nearest real unbound standalone dungeon or dungeon-resolved POI within `RULES.quests.investigationFallbackDistanceTiles` (300). Coordinate tie-breaking is deterministic; copied hook distance is measured from the issuing town. Metadata ownership, world generation, other quest candidates, rewards, DCs and slot caps remain unchanged. Sanctuaries and retrieval-bound sites are excluded. With no eligible candidate, an offer is still withheld. Some expeditions are farther away; target existence is not evidence of safe access or adequate travel reward.

The sponsor's continuation also authorized quest reward repair. `QuestManager.awardRewards` uses `gainXP`, handles plain characters and gold, and publishes the character state. Real and plain serializers preserve earned pending level-up choices; completed quests cannot award again after save/load. Twenty focused reward tests cover levels 1/5/10, actual XP thresholds and confirmed level-up choices. Twenty-nine target tests cover the extended candidate policy, unchanged owned-hook baselines, radius boundaries, lower caps, retrieval binding before a later town lookup, persistence and legacy saves.

Desktop 1440×900 and mobile 390×844 fixtures now accept a fallback Investigation, fail its initial search, succeed on deliberate retry and turn it in: one completed quest, 80 XP, 20 gold, fatigue two and no browser exceptions. This resolves the previously recorded completion blocker. Full tests pass: 1,325 in 113 files. Standard lint retains 190 errors/1,062 warnings; broader lint retains 3,266 errors with tooling warnings recorded in the report. No commits, deployment or GitHub mutation occurred. Previously generated saved offers are not regenerated or migrated; this policy applies when a settlement first generates its quests.

The all-town census and late-visit binding evidence are captured in the investigation report and `tools/balance-sim/investigation-town-coverage.*.results.json`. These changes establish valid opportunities and functioning rewards, not full skill-value or narrative-depth acceptance; #41/#57 remain open.

## References

- [Investigation report](../reports/2026-10-09-skill-balance-investigation.md), especially F17 and the mixed-surface controls.
- [Skill balance #41](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/41).
- [Quest consequences #57](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/57).
- Existing source: `QuestGenerator.getHooksForSettlement/generateQuestsForSettlement/_generateInvestigateChain`, `SettlementManager.enterSettlement/assignQuestsToNPCs`, `QuestManager._getRoomInvestigations`, `SaveManager` restore.
