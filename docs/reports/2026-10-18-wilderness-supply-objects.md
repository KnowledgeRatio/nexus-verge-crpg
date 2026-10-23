# Standalone wilderness supply objects

Date: 2026-10-18. Status: sponsor-approved objects and rendering implemented locally. Density is provisional; remote-travel balance and hands-on acceptance remain open. Nothing committed or deployed.

## Player behavior

New worlds contain edible plants and fresh game tracks on compatible traversable ground, in addition to existing shelter clues. Their symbols draw over the terrain, stay hidden outside visibility and dim after an attempt. On the object, E or touch Interact opens the existing gathering prompt. The object does not grant shelter or open a rest menu.

Survival + Intuition DC12 still gives one saved attempt for +1 supply within the existing carry cap, with normal two-fatigue cost and no XP/gold. Full supplies and cancellation preserve the opportunity. Success, failure and resolver-error receipts spend it; resting/reloading does not renew it. Old saved worlds are not backfilled.

## Generation and data

`RULES.provisioning.wilderness` enables seeded placement after roads. Provisional settings are 75% region chance, six attempts, at most one object per 32×32 region, 24-tile spacing from existing supply sites and 32-tile settlement exclusion. Placement rejects roads, occupied tiles, nontraversable ground and incompatible biomes. Separate RNG streams preserve base world randomness; these rules do not guarantee an object in every eligible region.

Existing shelter allocation rises from 25% to 50%, keeping 96-tile spacing and small/medium/large caps of 6/24/54. Standalone objects are additional to those shelter caps. `data/provisioning.json` declares `wild_plants` and `wild_tracks` with `eligibleHostTypes:["provisioning"]`, biome filters and marker overrides. Metadata stores `type:"provisioning"`, `renderLayer:"overlay"` and the existing canonical `provisioning` receipt. Player interaction and map rendering use that shared state; terrain remains beneath the overlay.

## Purpose and limits

The approved purpose is to extend travel far from working settlement resupply. The earlier 1,080 starter-route trials remain historical and do not prove failure of that purpose. This later approval permits standalone objects and rendering; it does not establish a numerical balance target or approve supply-price/DC/reward changes.

Validate real long journeys at levels 1/5/10 with declared working resupply access, matched training/gathering comparisons where useful, real movement/combat/rest/supply spending, and evidence of extra onward travel or objectives, prevented turnbacks, safe return and costs. Visibility or source counts alone do not establish useful travel extension.

## Validation

The focused suite passes **53 tests in six files**. The full suite passes **1,604 tests in 143 files** using `npm test -- --testTimeout=30000`. The initial default run hit two unrelated five-second animation timeouts; a hostile-generation fixture was also updated to isolate the new placement step. Web build passes. Repository lint retains 175 errors/1,111 warnings; broader lint retains 3,251 errors/2,312 warnings.

The [generation audit](../../tools/balance-sim/wilderness-provisioning-generation.results.json) records 1,813/7,027/15,607 standalone objects in sampled small/medium/large worlds. Every object satisfies terrain compatibility, traversability, road exclusion, 32-tile settlement exclusion and 24-tile spacing. Repeated seeds give identical source hashes. Enabling/disabling the feature preserves settlement, road and pre-existing-feature hashes. Concurrent timings are not performance benchmarks.

Desktop 1440×900 and mobile 390×844 [browser fixtures](../../tools/balance-sim/wilderness-provisioning-browser.results.json) use a real generated world with 1,773 objects. Actual E and touch Interact open gathering without a rest modal; cancellation and a full supply meter preserve the attempt. A forced d20 success applies +1 supply and two fatigue. A forced failure at a second source adds two fatigue without restoring supplies. The outcome panel fits both viewports, and SaveManager serialization/restoration preserves the spent receipt. No page errors were reported. These controlled fixtures verify interaction, not naturally played journeys or every part of the surrounding mobile layout.

## Bounded remote-journey evidence

The [journey runner](../../tools/balance-sim/wilderness-provisioning-journey.js) and [results](../../tools/balance-sim/wilderness-provisioning-journey.results.json) record **120 executions across five reused small worlds**, using Dedication levels 1/5/10, trained/untrained Survival, two trial streams and gathering-allowed/declined pairs. It runs actual movement, combat, rest, camp, supply purchases and gathering, with **342 real combats**. Reproduce with `WILDERNESS_SEEDS=5 WILDERNESS_TRIALS=2 node tools/balance-sim/wilderness-provisioning-journey.js`; recorded input hashes are stable.

Sources were seen on three of five world routes. Conservative detours of at most three tiles each way reached one source location, producing 12 repeated attempts across the test cells and seven restored supplies. That source was 90.6 tiles in a straight line and 118 traversable path moves from a functioning town. These are one location's results, not 12 independent source placements.

Two paired level-one runs gathered a supply, reached the target and returned, while their declined-gathering counterparts turned back safely. This is observed travel benefit in those runs. Overall returns were 58/60 with gathering and 54/60 without, a difference not statistically distinguishable in this sample; target arrivals were 36/60 in each. Additional skill rolls change later combat RNG, so paired differences do not isolate supply alone.

The sample uses one Calling, starter-town departures, five world layouts, terrain-aware pathfinding and an explicit reserve-for-return policy. The runner's 32-tile straight-line screen is a test filter, not the design definition of remoteness. Logged path distances check only three nearby functioning towns, not every possible route to resupply. `outwardSteps` includes detours; `pairedExtensionRate` is a movement proxy, not proof of extra completed objectives. No dungeon entry or later-town departures are covered. These results demonstrate a bounded benefit and do not clear frequency, economy or campaign balance.

Documentation references: [player supplies](../../README.md), [data contract](../DATA_SCHEMA.md), [world-generation rules](../../.claude/rules/systems/world-gen.md).

**Later coverage check (2026-10-18):** a separate [180-run report](2026-10-18-wilderness-supply-coverage.md) covers starter and later departure areas, reaching 13 distinct sites across five worlds. Game Designer retains current settings and accepts the local first slice with provisional density. Occasional extra target reach is observed, but longer detours do not improve total target arrivals; whole-campaign balance remains open. The earlier 120-run evidence above is unchanged.
