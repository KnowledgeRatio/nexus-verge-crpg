# Expedition review after runtime repairs — 13 October 2026

The approved runtime repairs were exercised successfully through actual progression validation, rest consumers and dungeon journeys. **This is not numerical balance clearance.** No supply price, provisioning placement, skill DC, reward, monster value or progression value was tuned by this review.

## Sample and verification

The final batch repeated the original **360 overland trials**: 15 small-world seeds × four trial RNG streams × levels 1/5/10 × two Dedication Knight skill selections. The paired characters differ only in Empathy versus Survival. Same gear, starting budget, route policy and initial stats; no companions or active practice benefits.

Every selected level-up now passes the actual `LevelUpManager` UI validator before confirmation: **1,560 validated level-up steps**, including the previously blocked Exemplar selection. These are selected engine snapshots, not earned full playthrough progression or a substitute for browser validation.

Actual `RestManager` receives the game's loaded ability definitions. The harness asserts that every used, available short-rest charge clears at a successful rest and Resolve returns to capacity. Among one member of each identical pair, **59 short rests and 120 town long rests passed**; 121 rest events actually cleared used charges and ten increased depleted Resolve. This includes Steady Nerve and Action Surge on characters whose base calling abilities are not stored in `selectedAbilities`. No fake grants or unused Character rest helpers were substituted.

Both historical result files were archived before rerunning. An intermediate recharge implementation missed those automatic base abilities; that run was stopped, excluded from final evidence, and retained only as a temporary diagnostic. The final measurements below use the corrected helper and complete batch.

## Overland comparison

One member of each matched pair is shown to avoid doubled denominators. Each cell contains 60 trials; twelve stopped alive at the bounded pathfinder in both versions. These stops do not prove destinations unreachable and are not played quest failures.

| Level | Returned before → after | Deaths before → after | After return proportion; Wald 95% CI | After individual fight wins; Wald 95% CI |
|---|---|---|---|---|
| 1 | 46 → 46 | 2 → 2 | 76.7%; 66.0–87.4% | 148/150 = 98.7%; 96.8–100% |
| 5 | 36 → 39 | 12 → 9 | 65.0%; 52.9–77.1% | 145/154 = 94.2%; 90.5–97.9% |
| 10 | 35 → 35 | 13 → 13 | 58.3%; 45.9–70.8% | 127/140 = 90.7%; 85.9–95.5% |

Fight Wilson intervals are respectively 95.3–99.6%, 89.3–96.9%, and 84.8–94.5%. The final paired batch executed **888 real fights**, representing 444 matched outcomes. The level-five five-point return difference is smaller than the sum of the before/after margins (24.5 points): **not statistically distinguishable at this trial count**. No verdict depends on claiming a significant win-rate improvement.

These are descriptive intervals. Trials share world layouts; fights share preceding attrition. Repairs change random draws consumed and consequently later encounter sequences, so equal initial RNG seeds do not mean identical fights. Advanced cells also use fresh-start equipment and budget rather than an earned higher-level economy.

The final main sample still revealed **zero provision clues and made zero provisioning attempts**, despite 45 sites in the 15 worlds. All 180 trained/untrained pairs remained identical. Independent-world exposure was 0/15; Wilson 95% interval 0–20.4% (the boundary Wald interval degenerates to zero). This cannot establish Survival's conditional value when clues are encountered. No farming loop was created or inferred.

Median supply purchase expenditure among returners remained **102 / 99 / 62 gold** at levels 1/5/10. Median gold remaining after real combat loot was 40 / 179 / 438. Main cells stop at dungeon entrances, contain no quest commissions, and use actual purchases followed by a supply-consuming town long rest. They do not settle complete quest profitability.

## Dungeon pilot

The same **27 dungeon pilots** were repeated: three worlds × three RNG streams × three levels. Final results: **17 actual entries, twelve town returns, six deaths, nine overland planner stops, six trap crossings, 34 total trap damage, no boss victories and one paid Investigation completion**. Before repairs there were 16 entries, ten returns, five trap crossings and two paid completions. These are small diagnostic counts, not comparative quest success estimates.

The two previously stranded living characters — world 1, level 1, trials 1 and 2 — now exited and returned. **No living exit-stranding remained.** Twenty-nine forward passages still failed legitimate door checks; restoring shared door state does not remove authored access challenges. The smaller paid-completion count is not evidence of a reward regression: passage/roll sequences changed, and this pilot is too small to support a completion-rate inference.

## Remaining limits and handoff

The route sampler uses full traversable-terrain A* navigation toward published targets, permits at most eight extra moves to inspect locally visible ambiguous points of interest, and declines optional road events. Dungeon pilots know room geometry and do not rest inside dungeons. This is bounded engine evidence, not a natural-player route census or whole-game skill comparison.

Existing on-hit tactic dispatch supplies a zero Resolve-spend context; automatic reaction availability also has a separate known-ID eligibility discrepancy. Those behaviors were not part of these repairs. Resource and combat results therefore do not prove all ability interactions balanced.

**Next decision:** Game Designer and Product Owner should define a useful encounter rate for finite provision clues along actual expeditions, then propose placement/discovery changes for sponsor review. Raising Survival modifiers or adding Craft shelter mechanics would not address the zero exposure observed here. Wider later-town journeys, earned gear/progression, refuge use and retreat policies remain necessary for complete expedition balance.

## Artifacts

- [Original diagnosis](2026-10-13-expedition-balance.md).
- `tools/balance-sim/expedition-review.before-repairs.json` and `expedition-review-dungeon.before-repairs.json`: unchanged archives.
- `tools/balance-sim/expedition-review.after-repairs.results.json`: final distributions, actual resource events, validated selections, source hashes and outcome-selected median win/loss/extreme traces.
- `tools/balance-sim/expedition-review-dungeon.after-repairs.results.json`: final dungeon paths, checks, traps and actual turn-ins.
- `tools/balance-sim/expedition-review-comparison.results.json`: explicit before/after denominators and interval comparisons.

Reproduce with `EXPEDITION_SEEDS=15 EXPEDITION_TRIALS=4 EXPEDITION_OUTPUT=expedition-review.after-repairs.results.json node tools/balance-sim/expedition-review.js`, then `DUNGEON_SEEDS=3 DUNGEON_TRIALS=3 DUNGEON_OUTPUT=expedition-review-dungeon.after-repairs.results.json node tools/balance-sim/expedition-review-dungeon.js` and `node tools/balance-sim/expedition-review-compare.js`.

All three harnesses pass syntax checks; generated JSON parses; recorded final production hashes still match; diff checks pass. Scoped ESLint reports zero errors and 73 warnings, primarily diagnostic constants and long analysis lines. The coordinating agent's final stable gameplay suite passed 1,577 tests across 141 files; this report's simulations are additional evidence rather than a substitute for those checks.
