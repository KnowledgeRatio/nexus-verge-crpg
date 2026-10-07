**Status:** Superseded (2026-10-07). Historical evidence for the original 100%-total-damage prototype. Replaced by the [compensated-damage evaluation](../../tools/balance-sim/results-compensated/report.md) and the revised [implementation specification](2026-10-04-blood-dot-precision.md). These historical runs did not test 140% total damage and cannot select or reject a compensation multiplier.

# Fractional blood DoT — actual feature-fork simulation

**Result:** 80/20 immediate/deferred remains the conservative prototype. The real fractional implementation preserves tiny-hit bleeding and removes the old whole-HP resistance floor. Increasing delayed share generally allows more enemy actions and loses more pending damage before combat ends. This is scoped quantitative evidence, not full-game or deployment acceptance.

Final runs: **128,800 fights** — 396 cells × 300 trials, plus 10 focused cells × 1,000. 19 deterministic real-resolver/lifecycle fixtures passed. Superseded instrumentation runs and smoke trials are excluded from that count. All raw/scheduled damage reconciliation and finite nonnegative HP assertions passed.

Reference source: KnowledgeRatio/nexus-verge-crpg, main-beta-quests, SHA 7c4e16ca738774617e7bc0f022594165e2e1a4cf. Tested code is the actual local production feature fork, with six SHA256 source hashes embedded in each result JSON. The report verifies those hashes still match the working files. No generated simulation-only CombatManager or replacement scheduler is used.

## Tested implementation

- RULES.combat.damageOverTime.enabled remains false by default. The harness deliberately enables it; 100/0 uses the same new precision and is the fair split control. Legacy integer flag-off controls are separate.
- 1,000 units per HP. Each eligible landed blood weapon packet is partitioned once after hit/crit/relevant reductions. Independent three-target-start tranches preserve raw budget and do not refresh earlier schedules. Typed defenses are evaluated on each occurrence. No new minimum-one damage rule, damage premium, or blood-to-neutral conversion; authored monsters retain their existing minimum-hit floor.
- Mitigation rounds to the nearest 0.001 HP per component. This is documented quantization, not a hidden fractional carry. A raw 1 hit at 80/20 under half resistance delivers 0.501 rather than exact 0.500; each component error is at most 0.0005 HP. Cumulative error can scale with component count.
- Actual CombatManager.startTurn/endTurn drives the queue, including lethal-tick advancement. Runtime wrappers only observe real resolver/condition-removal outcomes. A target killed by its tick does not take its action or receive an extra externally scheduled tick.
- Healing and temporary HP numerical fixtures use the real edited paths. Applied tranches survive source defeat; cleanse cancels remaining damage; target defeat clears its pending tranches. Bleeding-condition immunity suppresses the deferred share rather than converting it to immediate damage. Blood damage immunity suppresses the deferred application and permits no blood damage.

## Encounter scope

Current Dedication Prowess-oriented melee builds at levels 1/5/10, dagger and sword, solo and two-character party. The companion is a constructed equal-level Character. Short targets: goblin/gnoll/bugbear; durable targets: gnoll/ogre/veteran, respectively. Party cases use two authored enemies. Average authored HP, normal difficulty, no inflated stat blocks. Actual enemy multiattack runs; players use the currently implemented one attack/action. No proposed Extra Attack or fictional Calling kits.

Controlled lowest-current-HP targeting, no cover, consumables, selected tactics, spells, reactions or advanced build passives. Test-only semantic-role RNG creates reproducible paired encounters; live combat remains unseeded. Numeric raw1/2 fixtures call the actual weapon resolver rather than pretending a selected high-Prowess build naturally rolls that low.

396 cells: 120 default-defense fractional cases, 24 legacy integer controls, 180 enabled-defense sensitivity cases (half resistance, double vulnerability, immunity), 12 legacy-resistance controls, and 60 player-only offense diagnostics.

## Main matchup means

Equal-weight descriptive averages across 24 matchups per split; they are not a pooled population confidence interval. Each individual cell has a Wilson 95% win interval in JSON/CSV.

| Immediate/deferred | Mean win rate | Enemy actions/fight | Observed rounds | Remaining party HP | Pending player raw lost/fight |
|---|---:|---:|---:|---:|---:|
| 100/0 | 59.82% | 7.589 | 6.270 | 54.87% | 0.000 |
| 80/20 | 59.03% | 8.012 | 6.584 | 54.13% | 3.026 |
| 70/30 | 59.03% | 8.153 | 6.690 | 54.08% | 4.387 |
| 60/40 | 58.54% | 8.328 | 6.816 | 53.82% | 5.598 |
| 50/50 | 58.17% | 8.488 | 6.931 | 53.61% | 6.716 |

Observed rounds are the maximum actor-start count, keeping legacy skipped-index round counters from distorting comparisons. Actions, starts, damage, defeat and advancement still execute through the real manager.

All tested nonimmune eligible partial-blood hits produced a nonzero deferred tranche on both sides. The 100/0 control intentionally has no bleed. The 24 default-defense 100/0 fractional cells exactly match their legacy controls’ paired wins, enemy actions, observed rounds, remaining HP and timeout outcomes.

## Focused difficult matchups

Sword, two-character party versus two durable enemies; 1,000 trials per split at each level. Wilson win intervals are marginal intervals. Paired delta intervals use per-trial outcome differences under semantic-role test RNG; interpret them as evidence for these scripted matchups. Overlapping marginal intervals trigger the skill’s conservative warning against asserting an independent win-rate difference; paired estimates are shown separately.

| Level/opponent | Split | Win rate | Wilson 95% interval | Paired win delta vs fractional instant, 95% interval | Enemy actions |
|---|---|---:|---|---|---:|
| L1/gnoll | 100/0 | 7.20% | 5.76%–8.97% | +0.00 pp [+0.00, +0.00] | 5.237 |
| L1/gnoll | 80/20 | 5.80% | 4.51%–7.42% | -1.40 pp [-2.40, -0.40] | 5.843 |
| L1/gnoll | 70/30 | 5.50% | 4.25%–7.09% | -1.70 pp [-2.75, -0.65] | 6.053 |
| L1/gnoll | 60/40 | 5.40% | 4.16%–6.98% | -1.80 pp [-2.87, -0.73] | 6.301 |
| L1/gnoll | 50/50 | 4.90% | 3.73%–6.42% | -2.30 pp [-3.38, -1.22] | 6.530 |

L1, 70/30 minus 80/20: paired win delta -0.30 pp, 95% [-0.89, +0.29]; enemy-action delta +0.210, 95% [+0.179, +0.241].

| L10/veteran | 100/0 | 28.90% | 26.18%–31.79% | +0.00 pp [+0.00, +0.00] | 13.681 |
| L10/veteran | 80/20 | 26.00% | 23.38%–28.81% | -2.90 pp [-4.29, -1.51] | 14.236 |
| L10/veteran | 70/30 | 24.60% | 22.03%–27.36% | -4.30 pp [-5.83, -2.77] | 14.467 |
| L10/veteran | 60/40 | 23.00% | 20.50%–25.71% | -5.90 pp [-7.60, -4.20] | 14.683 |
| L10/veteran | 50/50 | 21.20% | 18.78%–23.84% | -7.70 pp [-9.51, -5.89] | 14.889 |

L10, 70/30 minus 80/20: paired win delta -1.40 pp, 95% [-2.27, -0.53]; enemy-action delta +0.231, 95% [+0.198, +0.264].

## Offense and defense diagnostics

The player-only diagnostic deliberately leaves enemy damage instant, isolating the weapon user’s timing penalty. It is not proposed live asymmetry. Across 12 solo matchups, means are:

| Split | Win rate | Enemy actions | Remaining player HP |
|---|---:|---:|---:|
| 100/0 | 67.75% | 6.655 | 43.91% |
| 80/20 | 66.17% | 6.865 | 42.46% |
| 70/30 | 65.89% | 6.915 | 42.15% |
| 60/40 | 65.53% | 6.995 | 41.56% |
| 50/50 | 65.22% | 7.058 | 41.17% |

Enabled-defense sensitivity changes enemy blood resistance/vulnerability/immunity using the real typed resolver. These are authored diagnostic overrides, separate from default resistance-off balance. Fractional instant against half resistance averages 47.03% wins versus 45.83% for the old integer floor across the same 12 matchups; that is a descriptive control change, not proof of a universal buff magnitude. Removing whole-HP floors changes instant damage too.

No default-defense, legacy, player-only or focused matchup reached the turn cap. There were **2,325 capped fights, all in immunity-only diagnostics**: a policy that keeps attacking blood-immune targets with blood cannot win; some characters survived the 30-start limit. Do not count those caps as successful encounters or claim zero timeouts for the entire sensitivity matrix.

## Deterministic fixtures and limits

Nineteen fixtures cover raw1/2 under normal, half, double and zero multipliers; three independent schedules; cleanse; condition immunity; source/target defeat; temporary HP; fractional healing; neutral injury resistance behavior; and actual startTurn lethal-tick queue advancement. Full observed values are in resolver-fixtures.json. The 12-damage 50/50 illustration yields ticks 2,4,6,4,2 after three successive hits through the real scheduler.

Guarantee is conditional on a positive eligible weapon-base budget large enough for the configured unit precision and an eligible target. Tested positive integer base packets of 1 HP and above now bleed. No artificial minimum weapon damage is added: a zero/nonpositive base does not bleed, and an immediate paid rider does not create a deferred base budget. A hypothetical sub-unit/future fractional weapon packet needs its own authoring rule; immunity and cleansing intentionally prevent damage.

Defeat, tiny damage, healing and queue behavior are exercised here; save/load, player UI flows, all rider combinations, arbitrary future multipliers and comprehensive Calling build balance require their separate implementation checks. HP attribution across simultaneous tick components uses their share of the resolver’s total final damage; total HP loss is the engine result. Raw potential instant-finisher counts do not imply defense-adjusted guaranteed kills.

**Untested utility:** a positive periodic damage event can trigger a concentration save even when damage is tiny; the current concentration floor is DC 10. Simultaneous tranches are delivered as one tick event, preventing per-tranche multiplication, but added turn-start saves can make bleeding disproportionately useful against concentrating casters. This melee-only matrix does not price that utility or full control/spell interactions. Do not add a raw damage premium before those tests.

Recommendation: retain 80/20 as the feature-on prototype with the feature OFF by default. 70/30 supplies more delayed identity but no demonstrated offsetting payoff in these encounters. Do not infer an automatic damage premium, declare global balance, or activate resistances from this matrix alone.

## Integration validation

The coordinating agent verified the implementation against the complete reference checkout: 1,235/1,235 tests passed across 106 files using `npm test -- --testTimeout 10000`, versus baseline 1,212/1,212. A resource-heavy existing Goblin rendering test exceeded its default 5-second timeout during the latest full run; the explicit 10-second test limit resolved that timing failure. The 205 existing standard-lint errors match baseline signatures; no new errors were introduced. The new harness was autofixed and has zero lint errors. Git whitespace checks passed. Desktop/mobile DOM rendering fixtures passed; complete visual acceptance remains outstanding, including an existing mobile overlay issue. The feature stays disabled by default and has not been activated for a campaign. These checks are separate from the headless encounter evidence above.

## Reproduction

```bash
DOT_TRIALS=300 node tools/balance-sim/fractional-blood-dot.js
DOT_TRIALS=1000 DOT_FOCUSED=1 DOT_FOCUS_LEVEL=1 DOT_OUTPUT=results-fractional-focused-l1 node tools/balance-sim/fractional-blood-dot.js
DOT_TRIALS=1000 DOT_FOCUSED=1 DOT_OUTPUT=results-fractional-focused-l10 node tools/balance-sim/fractional-blood-dot.js
python tools/balance-sim/report-fractional-blood-dot.py
```

Artifacts: fractional-blood-dot.csv contains the compact 396-cell summary; JSON contains all confidence intervals, budget/cancellation and HP metrics, paired outcomes and selected engine-roll traces. Focused outputs are in results-fractional-focused-l1 and results-fractional-focused-l10. Representative traces are also collected in representative-traces.md. Audio presentation is disabled; an Audio API fallback log is expected under Node.
