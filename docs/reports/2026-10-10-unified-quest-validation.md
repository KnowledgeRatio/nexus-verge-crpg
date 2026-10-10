# Unified quest validation — 2026-10-10

## Local implementation and functional evidence

The sponsor-approved bounded delivery is implemented and enabled locally. New town offers compose compatible causes, subjects, custody, hazards, material states and goals. Shared activity/resolution capabilities work independently of procedural provenance; existing saved boards and legacy bundles retain their content. Authored signatures keep their own conversations. Nothing committed or deployed.

Stable objective IDs and prerequisites connect observation, actual boss victory and protected recovery. Combat snapshots the real encounter source before asynchronous setup, checks the actual constructed boss and requires all enemies defeated. The previously ignored `buildBossEncounter.bossId` argument now honors a valid generated boss from the site's pool/campaign. Ordinary unrelated kills, room entry, flight and fake victory with living enemies grant no richer proof. Seeded type lookup matches actual dungeon generation without previewing/freezing a dungeon.

Acquisition and salvage create actual source-bound goods. Normal purchases cannot merge into custody; selling, use, dropping and ordinary removal cannot consume it. Handover checks provenance/quantity, transfers the goods once and drives actual finite stock. Damaged base recovery is two units; optional Craft salvages one more, with unchanged commission. Abandonment/failure removes only that quest's undelivered goods; pending resolution cannot be abandoned. Persisted pending application receipts support recovery after interrupted effect/reward application without duplication.

Boss-clear effects consume captured objective proof and persist with the actual feature owner. Resolution removes only the bound boss slot on revisit/regeneration, not all dungeon danger. Already defeated/cleared occupations cannot publish again. Independent review caught ordinary-inventory contamination, same-board bounty/composition collisions and stranded abandoned goods; all were corrected. Composition reserves its combat destination before ordinary board jobs, and saved competing bounties exclude new occupation there, avoiding accidental elite promotion/double commission.

Every boss composition now displays **Deadly**, independent of travel distance, with a boss objective. This is truthful presentation, not balance clearance. Commissions remain unchanged. The restricted combat sample below prompted this presentation review but supplies no basis for level gating or global tuning.

The final full suite passes **1,418 tests in 123 files** with `npm test -- --maxWorkers=1 --testTimeout=30000`. Meaningful regressions cover levels 1/5/10, captured/caller-mutated provenance, actual generated composition and owner APIs, normal/restored characters, stable observation selection, failed/paid retries, real goods quantities, wrong sources, interrupted resolution, duplicates, abandonment, legacy paths and save/load. The signature regression enters the real bandit approach/controller, preserves peaceful/bribe objective completion and ordinary turn-in, and rejects walked-away completion. It does not claim generic negotiated removal or fight-after-failed-negotiation completion.

Six browser fixtures exercise abandoned recovery, threat removal and occupied/damaged recovery plus Craft salvage at **1440×900 and 390×844**. They construct an actual Knight, actual NPCs, real public offers, real dungeon layouts and the actual boss encounter factory. Visible journal actions and resolutions complete; handover removes custody; commission pays 80 XP/20 gold at level 1; stock reaches three where delivered; clear/stock receipts survive save/load; duplicate resolution fails. All six report **zero page errors**.

Browser scenarios constrain compatible components to exercise contrasting paths and set location/room state directly. For combat proof they construct actual CombatManager/combatants, disable automatic turn timers and set enemies defeated before running the real victory handler. Craft success is controlled to exercise salvage UI. These are integration fixtures, not naturally walked journeys, measured win rates or evidence of sponsor play acceptance. The separate engine combat sample below runs actual attacks under its stated restricted policy.

`npm run build:web` and `npm run legal:verify` pass. Repository lint retains the same pre-existing error counts: **175** for `npm run lint`, **3,251** for `npm run lint:all`; new regression tests and audit scripts have no lint errors. Existing production lint errors remain outside this scoped delivery. JSON/reference checks and documentation links are checked separately below. No new dependencies were installed.

Product Owner refreshed and amended [#57](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/57) to the approved unified scope. #39/#41/#57 remain open for outstanding tracking, full-policy/whole-journey skill and balance evidence, and sponsor acceptance. No Project mutation or issue closure occurred.

The existing merchant `rope-hempen` definition is now also registered in canonical item data, preserving its identifier and values. Data review verified all 19 compatible assignments at levels 1/5/10, 81 source bindings, three goods across eight campaign inheritance sets and 33 boss references across those sets. The focused 27-test data/integration check passed after registration. This preserves the separate historical `rope` item rather than renaming saved goods or changing prices.

## Quantitative evidence scope

The audit distinguishes **authored combinations**, **published quest structures** and **played journeys**. Only the first two are measured here. The live optional-check resolver is separately exercised through complete dice enumeration. This establishes generated opportunities and conditional skill difficulty, not whole-journey profitability, safety, completion frequency or perceived variety.

Reproduce with:

```sh
node tools/balance-sim/unified-quest-audit.js
```

The [portable audit script](../../tools/balance-sim/unified-quest-audit.js) writes [full results](../../tools/balance-sim/unified-quest-audit.results.json). Historical fixed-bundle results remain unchanged. No production values were tuned by this audit.

### Authored possibilities versus generated structures

The current six-dimensional grammar has **192 raw Cartesian assignments**, of which **19 satisfy the authored compatibility constraints**. Those 19 yield **seven generic activity shapes**; changing provisions into rope or torches is not counted as a new structure.

The structural signature ignores player-facing names, prose, actual NPC identities, item identity and coordinates. It includes objective types and encounter role; action kinds, skills and prerequisite links; resolution prerequisite links and consequence types/roles. A dictionary in the results preserves each shape behind its stable hash. A signature describes dependencies and available branches, not a forced execution order: optional Investigation may be skipped.

The seven authored activity sets are:

- Observe → defeat.
- Observe → defeat → recover.
- Observe → defeat → recover → salvage.
- Observe → interpret → defeat → recover.
- Observe → interpret → defeat → recover → salvage.
- Observe → interpret → recover.
- Observe → interpret → recover → salvage.

Every generated order/level cell contains all **19 component assignments and seven structural signatures**. Each sampled world's first five composed offers have five distinct signatures under both declared visit orders. Across a whole world's offered sequence, repetition still occurs after the initial diversity preference is exhausted; more theoretical assignments do not imply indefinitely fresh play.

### Publication census

Twenty independent seeded **small** `nexus-verge` worlds are evaluated at levels 1/5/10 under coordinate-ascending and coordinate-descending visit orders: **4,560 settlement visits**, derived from the same **20 independent worlds**. Levels are generation projections, not earned play. The two visit orders are paired policies, not independent world samples.

The audit loads real WorldGenerator, NPCGenerator, QuestGenerator, QuestManager, RelationManager, MerchantManager, DungeonGenerator and DungeonManager, including campaign-filtered cultures/stock and actual dungeon types. It uses the real SettlementManager entry/publication path, NPC assignment, stored available history and retrieval binding. Position lookup skips walking and region streaming. Every offer stays available; nothing is accepted, completed or renewed.

| Measure, per level | Ascending order | Descending order |
| --- | ---: | ---: |
| Settlements visited | 760 | 760 |
| Total offers published | 1,263 | 1,213 |
| Composed offers | 521 | 521 |
| Ordinary Investigation fallback offers | 208 | 206 |
| Combat-containing composed offers | 359 | 365 |
| Composed offers combining combat and recovery | 332 | 335 |
| Composed Investigation opportunities | 330 | 327 |
| Composed Craft opportunities | 244 | 245 |
| Composed offers with a world-effect option | 521 | 521 |
| Composed offers with a faction-effect option | 521 | 521 |
| Concurrent duplicate composed incident destinations | 0 | 0 |

Mean world-level composed coverage is **68.55%**. Approximate 95% intervals are **66.03–71.08%** ascending and **65.87–71.24%** descending, using `mean ± 1.96 × SD(world fractions) / sqrt(20)`. Towns within a world are not treated as independent binomial trials. There is no coverage improvement to claim between these policies: their means coincide and their intervals overlap. Counts happen to match across level projections; this does not establish equal played difficulty or value.

Combined composed/ordinary Investigation availability is **95.92%** of settlements ascending (world-based approximate 95% interval **94.11–97.73%**) and **95.66%** descending (**93.63–97.68%**). This is supported site-quest availability, not the frequency of Investigation rolls: a composed quest can be combat/recovery without an Investigation action. The policy difference is smaller than the combined interval margins and is not distinguishable at this world count.

Every generated composed offer includes a supported world consequence: merchant stock, a bound encounter clearance, or both. This means an **option is published**, not that prerequisites were met, goods were delivered, proof was recorded or effects were consumed. Personal/faction standing is counted separately. Ordinary fallback opportunities remain available where an occupied destination blocks a fresh composed incident.

The largest structural signature accounts for **16.31% / 16.89%** of composed offers; the top three account for **48.37% / 48.94%**. Consecutive signature repeats number **47 / 42** across the 20 worlds. These are descriptive sampled distributions, not independent-player statistics. Human sessions must establish whether those changes feel different and whether the recovery-heavy goal mix remains interesting.

Direct target distances are median **129 / 123 tiles**, 95th percentile **251 / 245**, maximum **297**. These are geometric/metadata distances, not traversable route length or journey time. The earlier fixed-bundle 131-tile median does not serve as a played-travel baseline.

The audit generates one actual combat-bound dungeon per world/level/order, **120 layouts**, and checks that the actual seeded dungeon type matches the type used to permit quest generation, that a boss room/boss exists, and that the boss ID exists in monster data. This avoids falsely suppressing combat variants through an unloaded dungeon capability stub. It does **not** fight those encounters or prove that a victory receipt/clearance was delivered.

Representative publication/layout traces retained in the artifact include:

- A mixed recovery/combat offer in town `784,-560`, bound to site `759,-690`; recovery prerequisites include the bound occupation defeat.
- A town with no owned or nearby candidate, `-720,784`, where no offer is fabricated.
- A maximum-distance recovery/salvage case at site `147,-280` from town `48,-560`, 297 tiles away.
- A real seeded `forgottenTemple` layout at `-597,374`: boss `wight`, boss room index 5 among 10 rooms, using an occupation objective bound to that site's boss encounter.

### Exact Craft and Investigation difficulty

**5,280 live skill resolutions** enumerate every single-d20 outcome, or all 400 ordered d20 pairs under disadvantage, for two legal Dedication builds × levels 1/5/10 × fatigue 0/75/90 × Craft/Investigation. Knight uses the actual preset; the custom standard-array Sage is also Dedication. No unbuilt Calling or expertise grant is assumed. Upper levels are conditional skill-stat/ASI projections, not full earned/UI progression.

| Build / skill / level | Rested | Fatigue 75 | Fatigue 90 |
| --- | ---: | ---: | ---: |
| Knight / either skill / 1, 5, 10 | 40% | 35% | 16% |
| Dedication Sage / Investigation / 1 | 70% | 65% | 49% |
| Dedication Sage / Investigation / 5 | 85% | 80% | 72.25% |
| Dedication Sage / Investigation / 10 | 90% | 85% | 81% |
| Dedication Sage / Craft / 1 | 60% | 55% | 36% |
| Dedication Sage / Craft / 5, 10 | 70% | 65% | 49% |

Craft is **untrained** in this Sage build; its advantage over Knight comes from Intellect, while Investigation also receives proficiency. The harness uses the live action default DC, currently 12. These are exact conditional check probabilities with **no sampling error**, so sampling confidence intervals are inapplicable. They are neither combat win rates nor quest completion rates. Fatigue is supplied at roll time; cumulative retries, travel, companions and recovery economy are unmeasured.

Representative outcomes selected by success/failure/extreme margin allow spot-checking:

- Knight L1 rested, either skill: `17 − 1 = 16` succeeds; `1 − 1 = 0` is the extreme loss.
- Sage L1 Craft: `15 + 3 = 18` succeeds; `1 + 3 = 4` fails; `20 + 3 = 23` is the extreme success.
- Sage L1 Investigation: `14 + 5 = 19` succeeds; `1 + 5 = 6` fails; `20 + 5 = 25` is the extreme success.
- Knight L1 fatigue 90: `min(17,13) − 1 = 12` succeeds; `min(1,1) − 1 = 0` fails.

Investigation unlocks corroborated reporting/additional trust in supported branches; Craft salvages extra real source-owned goods in damaged recovery branches. This audit counts availability and conditional success, not the frequency with which players choose these actions or their aggregate downstream economic value. It does not conclude that every skill in the wider game has adequate use.

### Conditional live combat sample

The separate [combat harness](../../tools/balance-sim/unified-quest-combat.js) ran **3,000 actual-engine fights**, 500 in each build/level cell, with [results and outcome-selected traces](../../tools/balance-sim/unified-quest-combat.results.json). It uses the real seeded DungeonGenerator/DungeonManager boss selection and `buildBossEncounter`, including boss buffs and actual minions. One fixed seed was selected before outcomes: `unified-quest-combat-2026-10-10`, site `17,23`, `thievesGuild` at all three levels. The encounters are a buffed Spy at level 1, a buffed Veteran plus Bandit at level 5, and a buffed Veteran at level 10. This is one encounter archetype, not broad dungeon coverage.

Both characters use actual construction and starting equipment: longsword, shield and chain mail. They start at full HP and constructor resources, with no companions. The upper-level combat Sage invests in Intellect then **Resilience**, unlike the skill projection's later Composure investment. These are conditional stat projections without specializations or selected traits.

**The player policy is restricted to one ordinary weapon action against the lowest-HP living enemy.** Actual enemy AI/multiattack, initiative, turn lifecycle, weapon mastery and damage resolution run through the engine. Player healing/dodge, Action Surge, Resolve tactics, bonus abilities, specializations and consumables are unused. “Full initial resources” therefore does **not** mean a complete combat policy. Repeatable harness RNG replaces production combat randomness only for these trials.

| Level | Knight wins, Wilson 95% CI | Dedication Sage wins, Wilson 95% CI | Median rounds, Knight / Sage |
| --- | --- | --- | ---: |
| 1 | 204/500: **40.8% [36.58–45.16%]** | 12/500: **2.4% [1.38–4.15%]** | 10 / 9 |
| 5 | 17/500: **3.4% [2.13–5.38%]** | 0/500: **0% [0–0.76%]** | 11 / 9 |
| 10 | 478/500: **95.6% [93.43–97.08%]** | 1/500: **0.2% [0.04–1.12%]** | 18 / 25 |

Wilson intervals are primary because the symmetric Wald formula is unreliable near zero. Results also retain the specified supplementary `p ± 1.96 × sqrt(p(1-p)/n)` calculation, explicitly identifying its degenerate zero-width interval for 0/500. Zero observed wins does not establish impossibility. The three build deltas exceed the sums of conservative Wilson margins at this trial count; statistical separation is a finding **within this restricted policy**, not evidence that the Sage build is generally unviable.

Three level-10 Sage round-cap timeouts are counted as unsuccessful outcomes, separately identified in the artifact. Median remaining HP is 0 for both builds at levels 1 and 5, 44 for Knight at level 10, and 0 for Sage at level 10. Among level-5 Knight wins, median duration is 16 rounds and median remaining HP is approximately 16% of maximum. These distributions make the conditional attrition visible instead of relying on a single anecdotal fight.

The artifact contains 17 complete trial traces chosen by outcome: median-duration win where available, a loss where available, and an extreme-margin case. A compact round-by-round roll trace is printed by the harness. No median win is fabricated for the zero-win cell. These are individual fight traces, not walked quest journeys.

The important diagnostic is the level-5 weapon-only attrition, not a production tuning verdict. Game Designer should examine the actual encounter composition and a complete legal ability/resource policy before changing values or drawing overall build/quest conclusions. Difficulty presentation should reflect actual encounter threat where it promises combat; geometric proximity alone cannot establish an easy fight.

## Balance recommendation handoff

Do not tune difficulty or payments from these publication counts alone. The audit validates a working distribution of mixed activities; the principal remaining questions are whole-journey risk/reward, whether seven structures sustain player interest, how frequently optional skills change delivered outcomes, and whether the recovery-heavy core needs broader goals.

Next evidence should track accepted → attempted → resolved → consequential quests, actual travel/time, combat resources and loot, retries/fatigue, custody decisions, faction thresholds and persistent world consumers. Compare full legal builds on paired seeds without attributing every build difference to a single skill. Functional UI/source-proof acceptance belongs in the implementation owner's separate section.

Played journeys measured by this census: **0**. The isolated combat sample above does not measure dungeon attrition, retreat choices, travel, quest skill checks, custody/turn-in or the full game loop.

Validation of audit artifacts: publication script lint **0 errors, 46 warnings**; combat script lint **0 errors, 34 warnings** (fixed scenario numbers/analysis-line lengths). Report links resolve and `git diff --check` passes. Full gameplay tests and browser/source-proof acceptance are recorded separately by the implementation owner.
