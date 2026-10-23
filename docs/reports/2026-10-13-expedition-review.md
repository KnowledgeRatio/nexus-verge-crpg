# Expedition review: findings and recommended actions

Date: 2026-10-13. Status: diagnostic review completed for the declared sample. This is consultation evidence; gameplay repairs and tuning have not been approved or implemented by this review. Whole-game skill value and complete campaign acceptance remain open.

**Subsequent approved repairs (2026-10-13):** the sponsor approved all three correctness repairs identified here. Live rest controls now share definition-driven resource recovery; level-three confirmation accepts complete Exemplar/Oath selections; dungeon connections share completed/locked state and saved endpoint receipts. The [repair report](2026-10-13-expedition-repairs.md) records current implementation and final validation status. This dated note supersedes earlier partial-repair notes below where they describe another defect as unresolved. The original findings, policies and upper-level fixture limitations remain historical pre-repair evidence; they are not rewritten as results of the repaired game.

**Subsequent repair (2026-10-13):** the sponsor authorised the specialization-validation correction after this review. `LevelUpManager.validateAndUpdateUI()` now checks the scalar specialization and proceeds to the remaining required choices. Four regressions using actual progression data, selection callbacks and a stub DOM pass for Exemplar/Oath completion and missing choices. Hands-on browser progression remains unverified; the original upper-level fixtures are still snapshots. Rest recharge and reverse-door findings remain unresolved. The findings and recommendations below record the pre-repair review baseline.

**Subsequent rest repair (2026-10-13):** the authorised recovery integration now shares resource-only recharge between `Character` and the actual `RestManager` flow. Eligible ability uses, equipment charges and Resolve recover for restored plain characters without duplicating healing, supply or clock effects. Automatic Calling abilities qualify by class, level and specialization; tactics and vows remain gated by known choices. Twenty-three new regressions include actual rest-button callbacks with stub DOM, levels 1/5/10 after serialization, loading concurrency and state replacement; validation is recorded in `docs/CHANGELOG.md`. Hands-on browser acceptance and repeating these expedition routes remain open. Reverse-door repair remains unresolved; the original measurements below have not been rerun.

## Main result

Three verified integration defects should be repaired before judging expedition difficulty or changing supply prices. The new provisioning system also contributed no benefit on the sampled destination routes because no opportunity was encountered. Increasing Survival's roll bonus cannot solve that exposure problem.

| Priority | Verified issue | Player consequence | Recommended repair scope |
|---|---|---|---|
| 1 | Live short/long rests omit class ability-use, Resolve and equipment-charge recovery. | A player can rest successfully but remain unable to reuse abilities. | Integrate data-driven recovery into the actual rest flow, respecting individual recharge rules and restored characters. Avoid duplicating HP, supply or clock effects. |
| 2 | Level-3 validation checks the scalar specialization, then demands a nonexistent plural selection array. | A valid specialization choice cannot enable confirmation. | Correct required-choice validation and verify actual level-3 UI completion before treating higher-level builds as achievable. |
| 3 | Dungeon doors hold separate completion/lock state in each direction. | An already crossed passage can ask for another check and lock the player inside. | Synchronize the physical connection state, preserving existing unopened-door rules; verify safe return after a successful opening. |

The Mechanics Master reproduced the rest defect through both live RestManager calls and the actual `restCompleted` callback in `Game.setupRestSystem`: HP, fatigue, supplies and clock changed, but depleted Resolve, ability uses and equipment charges did not. The level-3 probe used actual available choices, eligible Exemplar selection, tactics and ASI; confirmation stayed disabled with “Select 1 specialization(s)”. A two-room interaction probe opened A→B, then failed the new B→A check and permanently blocked retreat. These findings are not inferred from losing a simulated fight.

## Measured expedition evidence

The Balance Engineer executed **360 destination-bound overland trials across 15 independently seeded small worlds**, comparing 180 matched Knight skill pairs at levels 1/5/10. They used actual movement, encounters, 884 combat executions, loot, purchases and rests. Fifteen worlds contained 45 provision sources, yet the declared local-inspection route policy revealed and attempted **zero**. Survival-trained and alternative-skill pairs consequently behaved identically in this sample. This does not establish that Survival has no uses elsewhere.

Among returners, median supply purchases cost 102/99/62 gold at levels 1/5/10. These are controlled starting-budget and gear diagnostics; main routes contain no quest commission. They do not justify a new price. Fifty-eight short-rest calls left ability uses and Resolve unchanged.

A separate **27-trial dungeon pilot** made 16 entries, crossed five physical traps, took 34 total trap damage and achieved two actual paid Investigation completions. Twenty-six outbound door passages blocked. No boss victory was observed, so no boss balance recommendation follows. Nine trials stopped at the overland planner boundary before entering a dungeon and are not played quest failures.

## Limits that affect interpretation

- Levels 5/10 use data-eligible engine-confirmed snapshots; the level-3 UI blocker prevents calling them verified normal progression. Earned mid-journey level-ups were deferred, and advanced starting wealth/equipment were controlled fixtures.
- A* knows traversable terrain, granting navigation foresight; these routes are not a measured natural-player path distribution. Provision detours inspect visible ambiguous POIs, without consulting hidden source or resolution flags.
- Optional road skill events were declined to isolate the route-first policy. No active practice benefits or companions were used. This is not a whole-game comparison of Survival versus Empathy.
- Paired runs and sequential combats are correlated. The balance report supplies exact denominators and descriptive confidence intervals; 360 trials do not mean 360 independent world layouts.
- Real revealed sanctuaries can qualify for long rests. Ordinary field camping remains a distinct supply-for-fatigue action. The reviewed policies use actually revealed refuges, and hostile/unrestored towns are not working inns.

Other trace findings need separate confirmation or design judgment: ordinary terrain/trap modal checks lack the fatigue cost explicitly charged by dialogue/provisioning; nearby-inn lookup indexes flat tiles as if two-dimensional; hunger can set already-higher HP down to half maximum; fatigue-origin exhaustion does not enforce the same death handling as a terrain-failure exhaustion outcome. These are not production fixes in this review.

## Recommended execution

Bring the three correctness repairs above to the sponsor, then repeat the same seeds and policies after approved implementation. Next, define useful provision-clue exposure per expedition and investigate placement/discoverability relative to travelled routes, retaining finite saved attempts. Extend evidence to earned progression, later towns, actual quest commissions and cautious refuge/retreat policies before tuning price or difficulty.

Keep Craft shelter construction, Athletics/Finesse escaping and rune/Lore outcome reform as separate consultations. New mechanics would change the baseline under review. GitHub remains the product roadmap; this document is an evidence summary rather than a substitute task board.

## Evidence and verification

- [Balance report](2026-10-13-expedition-balance.md): trial tables, confidence intervals, selected traces, costs and reproducible harness commands.
- [Design brief](2026-10-13-expedition-design-brief.md): representative choices, progression caveats and reproducible play policies.
- [Product review](2026-10-13-expedition-product-review.md): live issue context, acceptance and ordered dependencies.
- [Overland harness](../../tools/balance-sim/expedition-review.js) and [results](../../tools/balance-sim/expedition-review.results.json).
- [Dungeon harness](../../tools/balance-sim/expedition-review-dungeon.js), [results](../../tools/balance-sim/expedition-review-dungeon.results.json) and [selected trace summary](../../tools/balance-sim/expedition-review-dungeon-summary.md).

Both harness syntax checks, result JSON parsing, replay checks and diff whitespace checks pass. Scoped harness lint has zero errors and 71 warnings. The Mechanics Master ran 55 relevant existing tests successfully; those tests did not catch the reproduced integration gaps. No production code, rules or data changes, commits, deployments or GitHub mutations were made by this review.
