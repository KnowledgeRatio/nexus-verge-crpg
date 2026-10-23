# Wilderness supply coverage across departure areas

Date: 2026-10-18. Status: validation only; production settings and content unchanged. This follows the [initial object and journey checks](2026-10-18-wilderness-supply-objects.md), whose 120-run results remain historical.

## Result

The 180-run sample reaches **13 distinct supply sites across all five worlds**, including 11 reached on outward journeys. It exceeds the preregistered review breadth of five distinct sites across at least three worlds, including later departures. That criterion tests sample breadth, not an approved spawn rate or balance target.

The runs see 19 distinct sites, make 54 repeated gathering attempts and restore 37 supplies, with 355 actual combats. Distinct attempted sites per world are 3/6/2/1/1; repeated levels and detour policies do not count as new locations. The sample uses 15 different functioning departure towns and includes no rows without a public target after the bounded town-selection fallback.

| One-way source detour limit | Gathering attempts / supplies | Target arrivals, gather / decline | Safe returns, gather / decline |
|---|---:|---:|---:|
| 3 actual moves | 20 / 14 | 25/45 / 24/45 | 45/45 / 45/45 |
| 8 actual moves | 34 / 23 | 23/45 / 23/45 | 45/45 / 44/45 |

These small differences do not establish a causal or statistically reliable improvement; none of the six level/budget return comparisons is statistically distinguishable under the runner's descriptive check. Extra gathering rolls and detours change later combat RNG. Safe returns alone also do not prove extra useful progress: the return policy deliberately allows turning back. Gathered sites are 33.1–94.6 straight-line tiles from working towns, with logged routes of 36–121 moves to the nearest of three candidate working towns.

The [phase and pair summary](../../tools/balance-sim/wilderness-provisioning-coverage.summary.json) confirms 15 departure areas and 15 town-to-target routes. Outward gathering makes 36 attempts for 24 supplies at 11 distinct sites across all five worlds, including nine later-town sites; logged resupply paths are 41–121 moves. Return gathering makes 18 attempts for 13 supplies at six sites, some also used on outward runs, with resupply paths of 36–97 moves. The short policy attempts eight distinct sites; the wider policy attempts 13.

Twelve paired rows across three worlds and five areas combine outward supply gains, more main-route progress and safe return. For example, one later departure records 27 extra main-route moves at level one and 37 at level ten under the short policy. These are observed differences, not isolated supply effects: gathering changes later RNG, and repeated levels are not independent locations.

## Method

The [runner](../../tools/balance-sim/wilderness-provisioning-coverage.js) and [results](../../tools/balance-sim/wilderness-provisioning-coverage.results.json) cover five reused small worlds × three departure towns × levels 1/5/10 × two detour budgets × gathering allowed/declined = **180 actual executions**. All use trained Dedication snapshots checked by the existing progression flow. This is a gathering-policy comparison; it does not add a trained/untrained comparison.

Each world supplies its starter town and two later functioning towns selected for geographic spread, without source or biome information. Each later selection checks up to five candidates for a reachable published quest target; rejected candidates are logged. Characters start at full health/supplies in those town fixtures before the journey. This is not played transfer between towns or free recovery during a journey.

Routes seek a reachable published quest destination without consulting hidden source locations. Gathering detours consider only observed standalone objects or revealed shelter sources. The decline policy visits the same kind of visible opportunities but refuses gathering. The runner uses real movement, fog discovery, combat, short rests, camps, gathering, merchant purchases and inn recovery. It camps at fatigue 30 and turns back when its projected return budget exceeds 85, accounting for carried supplies and retracing outward movement. Future combat and skill costs remain uncertain.

Main-route progress and detour movement are recorded separately. The 3/8 limits measure actual one-way path moves; an eight-tile geometric filter only narrows visible candidates before path checking. The runner's 32-tile straight-line remote filter is a test convention, not the design definition of difficult resupply. Access logs check routes to three nearby functioning towns, not every possible route.

## Limits and decision

Five world layouts, repeated levels/policies, one Calling and one fixed combat trial do not represent independent player journeys. A* has terrain knowledge. The later-town fixtures do not measure earned arrival state, whole-campaign economy, natural navigation or dungeon completion. Full capacity and deliberate reserve turnbacks are policy outcomes, not automatic evidence that source density is wrong. Seeing a site without reaching it calls for checking access and policy before changing density.

**Game Designer ruling:** retain current settings. The earlier coverage concern is addressed across several sites and later departure areas. Accept the locally implemented first slice with provisional settings; no density or reward change is justified, and automatic tuning stops here.

The three-move policy shows occasional useful reach, including one level-ten target-arrival example, rather than a general proven improvement. Eight-move detours restore more supplies without improving total target arrivals. A visible source is not always worth a long detour. The fixed out-and-back policy is conservative, and declined-gathering runs also approach sources, so this is not evidence that gathering beats a no-detour policy. Whole-campaign economy and natural player routing remain unaccepted.

## Reproduction and verification

```sh
COVERAGE_SEEDS=5 COVERAGE_TOWNS=3 COVERAGE_LEVELS=1,5,10 node tools/balance-sim/wilderness-provisioning-coverage.js
```

The runner writes `wilderness-provisioning-coverage.results.json`; `COVERAGE_OUTPUT` can select a separate filename. Historical artifacts are not overwritten. Recorded start/end input hashes match, and a separate check finds all 119 hashed production input files unchanged.

The full suite passes **1,604 tests in 143 files** with `npm test -- --testTimeout=30000` (55 seconds). Scoped runner/shared-harness lint reports zero errors and 104 warnings. Broader lint retains 3,251 errors and reports 2,356 warnings. Existing harness defaults pass a smoke run with 360 moves, three camps and safe return. This is validation evidence, not deployment, sponsor play acceptance or balance clearance.
