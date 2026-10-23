# Expedition correctness repairs

Date: 2026-10-13. Sponsor-approved scope: rest resource recovery, level-three specialization confirmation and shared dungeon-door state. Implemented locally; no commit or deployment. This repairs the diagnostic baseline, not supply prices, provision frequency or encounter balance.

## Player behavior

- **Rest recovery:** the player short/long-rest controls now recharge eligible known ability uses and equipment charges and restore Resolve, including restored plain characters. Short rests preserve long-rest-only resources; long rests recharge both categories. Unknown definitions retain their counters. Healing, eligibility, supplies and world time retain their existing rules.
- **Specialization:** level-three Dedication confirmation accepts the scalar specialization selection once the attribute increase and its required tactics or aura are complete. Exemplar requires three tactics; Oath requires its aura. Missing selections remain blocked.
- **Dungeon passages:** both ends represent one physical connection. Successfully opening a door makes return traversal safe from a second independent door check. A failed opening still locks that connection according to the existing rule, from either side. Sparse saved receipts retain completed/locked passage state on re-entry and regeneration when both room endpoints still match.

## Integration and persistence

`src/systems/restRecovery.js` owns resource-only recharge shared by Character and RestManager. Ability eligibility follows the actual class, level and specialization, with tactics/vows restricted to known choices; automatic base Calling abilities do not require an entry in `selectedAbilities`. RestManager uses loaded definitions or fetches them when spent abilities require lookup. Failed loading refuses the rest without consuming it. Eligibility is checked before and after loading, overlapping requests are blocked, and a character/world replacement during preparation cancels the request rather than resting a different saved game.

`LevelUpManager.validateAndUpdateUI()` stops scalar specialization validation from falling through to a nonexistent plural-array requirement. Actual selected branch requirements and confirmation consumers remain authoritative; no progression definitions changed.

`DungeonManager` updates both generated door representations through a shared connection helper. Receipts live on the dungeon feature and canonical metadata, with room indices and IDs checked before restoration. Invalid or mismatched endpoints are ignored; the repair does not introduce repeatable checks or discard the existing failed-door consequence.

## Validation status

The first repeated-route attempt caught automatic Calling abilities missing from the helper's initial eligibility filter despite intermediate tests passing. This was corrected using actual class/level/specialization eligibility and choice-gated tactics/vows. The settled recovery checks use a real creation-UI Knight with empty `selectedAbilities`, serialize it to a plain object, and prove Steady Nerve recharges through the player rest path. The interrupted intermediate route batch is not final validation evidence.

The implementation owner reports settled rest recovery **54 tests**, progression **20 tests in five files**, and shared doors **40 tests in three files** passing. These overlap broader suites and should not be summed as independent checks. Door cases exercise levels 1/5/10, actual Player interaction, cancellation/retry, stale reverse locks, actual world serialization and regenerated passage receipts. Progression tests cover actual Exemplar/Oath confirmation and pending-level-up/save state; rest tests cover ordinary creation, plain restored characters and callback/async identity guards.

The complete settled-source suite passes **1,577 tests in 141 files**, using `npm test -- --maxWorkers=2 --testTimeout=30000` (88.56 seconds). These worker/time limits are explicit rather than an unchanged default-command pass. Scoped checks introduce no lint errors; unchanged file blocks retain two Character, one LevelUpManager and five DungeonManager errors. Repository lint reports 175 errors and 1,103 warnings. Syntax and diff-whitespace checks pass.

The final repeated 27-cell dungeon pilot produced **17 entries and 12 town returns**, versus 16 entries and 10 returns before repair. Six deaths and nine planner stops were unchanged; the two previous alive-but-stranded exit failures disappeared. It crossed six physical traps and incurred 34 total trap damage, with no boss kills. One quest paid versus two before; this tiny batch does not establish worse quest rewards or campaign balance.

The [final balance comparison](2026-10-13-expedition-post-repair-balance.md) repeats all **360 overland executions across 15 worlds**, including 888 actual fights. All 1,560 selected level-up steps pass the actual validator before engine confirmation; this establishes accepted selections, not an earned browser playthrough. Among one member of each matched pair, 59 short rests and 120 long rests pass their recharge assertions; 121 events clear spent ability counters and ten restore depleted Resolve.

Level-five returns increase from 36/60 to 39/60; level-one and level-ten counts remain unchanged. The difference is not statistically distinguishable at this sample size, and repaired charge availability changes later random draw sequences. Median supply expenditure remains 102/99/62 gold among returners, excluding quest commissions. These figures do not clear encounter or economy balance.

**Provisioning exposure remains unresolved:** zero clues or attempts across the same 15 worlds containing 45 sources, so all 180 matched skill pairs remain identical under this route policy. The next consultation concerns useful finite-source exposure along expeditions, rather than a Survival modifier increase or automatic supply-price change.

The documentation pass inspected current producers and consumers; it did not run gameplay tests or claim hands-on browser acceptance. Historical [diagnostic review](2026-10-13-expedition-review.md) remains a record of the pre-repair game. Results distinguish callback/DOM tests, automated actual-engine route execution and naturally played acceptance.

## Remaining scope

Finite Survival-source exposure, earned campaign economy, ordinary route behavior, full quest/boss journeys and sponsor play acceptance remain open. Craft shelter improvements and skill-based escape remain proposals. No numerical tuning or GitHub issue closure follows from these correctness repairs.

At the time of the route comparison above, the route policy still included reaction-eligibility and Trip Attack Resolve-charging limitations outside that repair scope. Those observed fights remain evidence of that historical engine policy, not fully accepted Calling resource balance. No build, dependency, asset or legal-artifact contract changed in that scope; those unrelated checks were not added to the documentation handoff.

## Subsequent combat correctness repair (2026-10-13)

The sponsor authorised the next correctness repair. Queued on-hit tactic dispatch in `CombatManager` no longer injects a zero-cost override: the shared effect dispatcher charges the authored Resolve cost once after a hit, rejects an unaffordable tactic and leaves misses without tactic expenditure. `Game.promptReaction()` uses shared class/level/specialization eligibility, including automatic Indomitable without selected IDs, while preserving known tactic/vow choices and existing availability gates. No numerical tuning or data changes were made.

Nine new regressions exercise actual ability data, `Character.fromJSON()` followed by plain restored statistics, Trip Attack hits at levels 3/5/10, zero Resolve, misses and reaction offer/click behavior. The focused suite passes 86 tests across three files. Reaction-modal checks use unit callbacks and stub DOM; they do not establish hands-on browser acceptance.

The settled full suite passes **1,586 tests in 141 files**, using `npm test -- --maxWorkers=2 --testTimeout=30000` (65.33 seconds). Repository lint remains at 175 errors and 1,103 warnings. These results follow the combat changes; earlier suite and route results above remain historical.

The [new overland artifact](../../tools/balance-sim/expedition-combat-resource-repair.results.json) completes **360 trials across 15 worlds**, with matching source hashes and **902 actual fights**. Counting one member of each matched pair gives 60 routes at each level: returns are 46/60 at level 1 (Wald 95% interval 66.0–87.4%), 39/60 at level 5 (52.9–77.1%) and 35/60 at level 10 (45.9–70.8%). These return counts match the previous post-repair batch, but fight outcomes and random-draw sequences differ; equal return totals do not establish equal resource costs or a causal balance result.

All 180 trained/untrained pairs remain identical under the declared route policy: zero provision clues or attempts despite 45 generated sources. The independent exposure denominator is zero of 15 worlds (Wilson 95% interval 0–20.4%), not 360 independent layouts. This still does not measure Survival value across the whole game or justify a bonus, placement or price change.

The [new dungeon artifact](../../tools/balance-sim/expedition-combat-resource-dungeon.results.json) completes **27 trials**, with 17 entries, 11 town returns, seven deaths, nine planner stops, no harness errors and one paid turn-in. Entries and town returns are distinct outcomes; these small counts do not clear boss, quest or campaign balance and were not treated as grounds for tuning.

The route sampler overrides reaction policy, including Parry handling. Automatic Indomitable is verified by unit offer/click checks, not natural reaction-modal use in these routes. Original and prior post-repair artifacts remain historical; neither automated matrix nor callback tests establish hands-on browser or whole-campaign acceptance. Nothing committed or deployed.
