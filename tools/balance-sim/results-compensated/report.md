# Compensated blood weapon simulation — 2026-10-07

**Local playtest update (2026-10-07):** The user subsequently authorized enabling blood DoT in the local game. The following report records the pre-activation experiment and its source hashes; its default-disabled references describe that run. The 120-percent budget is unchanged. Gameplay acceptance remains outstanding.

The Game Designer chose a 120% total default: 80% of base damage on impact plus 40% over three target turns. The 140% candidate remains configurable. This pays for delay; full kit and player-flow acceptance remain outstanding, so the feature stays disabled.

Follow-up: [matched weapon-family results](matched-followup.md) add 84,000 fights at 1000 trials/cell. A final-source repeat adds 36,000 fights and exactly reproduces the matched outcomes after the 120% default, reaction-preview, final message and formatting changes; [final provenance](final-verification.json) records current source hashes. Accepted evidence: 271,200 fights, plus 12,100 concentration trials. A superseded 36,000-fight final-source repeat is excluded from this count.

Actual production-engine batch: 504 cells × 300 = 151200 fights, plus 2100 single-hit concentration trials and 19 resolver/lifecycle fixtures.

## Reproduction

Run from the repository root. The harness writes the full raw JSON, CSV, concentration probes and lifecycle fixtures to `DOT_OUTPUT`; raw JSON is large and excluded from the tracked evidence. The main report generator reads these generated files.

```sh
DOT_TRIALS=300 DOT_OUTPUT=/tmp/nexus-dot-main-reproduction node tools/balance-sim/compensated-blood-dot.js
node tools/balance-sim/report-compensated-blood-dot.js /tmp/nexus-dot-main-reproduction
DOT_MATCHED=1 DOT_TRIALS=1000 DOT_OUTPUT=/tmp/nexus-dot-matched-reproduction node tools/balance-sim/compensated-blood-dot.js
DOT_MATCHED=1 DOT_CANDIDATES=instant100,premium80_40,premium70_70 DOT_TRIALS=1000 DOT_OUTPUT=/tmp/nexus-dot-final-reproduction node tools/balance-sim/compensated-blood-dot.js
```

These run the 151,200-fight main matrix, 84,000-fight matched-family matrix and 36,000-fight final verification respectively. They run against the source currently checked out, so new source hashes are expected after subsequent edits. To reproduce the final verification assertions, compare the final three-candidate cells with their matched-matrix counterparts and verify the source bytes:

```sh
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const matched = read('/tmp/nexus-dot-matched-reproduction/compensated-blood-dot.json');
const final = read('/tmp/nexus-dot-final-reproduction/compensated-blood-dot.json');
const key = cell => JSON.stringify([cell.level, cell.profile, cell.weaponType, cell.candidate]);
const earlier = new Map(matched.cells.map(cell => [key(cell), cell]));
for (const cell of final.cells) {
    assert.deepEqual(cell.pairedOutcomes, earlier.get(key(cell)).pairedOutcomes);
    assert.deepEqual(cell.means, earlier.get(key(cell)).means);
    assert.equal(cell.means.timeoutCount, 0);
}
for (const [file, expected] of Object.entries(final.testedSourceHashes)) {
    assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), expected);
}
console.log('Matched outcomes, metrics, zero timeouts and source hashes verified.');
JS
```

This experiment separates total damage from timing. A 140% total budget at 50% immediate delivers 70% base on impact and schedules 70% over three target starts. Old 80/20 conserves 100%. All cells use the current production resolver, weapon packet builder, scheduler, defenses and defeat lifecycle. Config varies only through RULES; observers collect results without calculating damage.

Shared chassis: Prowess15/17/19 at levels1/5/10; ring/chain/plate armor; Dedication longsword, Audacity/Curiosity dagger; same-level second companion in party cells. These intentionally controlled weapon/HP/proficiency sensitivity probes are not representative complete Calling builds (Curiosity cannot normally use the heavy armor). One attack/action; no Extra Attack, tactics, spellcasting, consumables or Void monsters. Authored monster multiattack is live. Short opponents goblin/gnoll/bugbear; durable gnoll/ogre/veteran; average HP; no cover; lowest-HP targeting. No full kit, caster parity or encounter difficulty certification is implied.

Main applies the same premium rule to enemy eligible blood damage. PlayerOnly holds enemy damage at100% immediate. MatchedType changes only a cloned longsword’s damageType to bone; stats, mastery and enemies stay identical. This synthetic control isolates family timing/premium rather than comparing different authored weapon kits. HalfHP starts player side at50% HP. Defense probes enable actual resistance rules for blood-resistant, vulnerable or immune enemies.

Test-only semantic RNG keys omit candidate and weapon type, so candidate comparisons reuse construction and actor/turn/attack seeds. Concentration adds random draws inside the real damage lifecycle. Every scheduled tranche is reconciled as ticked, cancelled, or outstanding; HP must remain finite/nonnegative; timeouts are recorded. Live RNG unchanged.

95% CI uses the required normal approximation p ±1.96√(p(1−p)/n). Wilson is additionally shown for boundary cells because normal0/100% gives misleading zero-width intervals. A difference smaller than the sum of the two normal margins is labeled not statistically distinguishable at this count. Pooled main figures equally weight this authored scenario matrix; they are not a player population forecast.

| Main candidate | Win rate (95% CI) | Enemy turns | Player tick HP | Pending lost |
|---|---:|---:|---:|---:|
| instant100 | 55.25% (54.31%–56.19%) | 7.48 | 0.00 | 0.00 |
| old80_20 | 54.69% (53.76%–55.63%) | 7.90 | 4.50 | 2.77 |
| premium70_70 | 55.76% (54.82%–56.70%) | 6.59 | 12.42 | 8.65 |
| premium80_60 | 55.99% (55.05%–56.93%) | 6.46 | 10.26 | 7.62 |
| premium84_56 | 56.08% (55.15%–57.02%) | 6.44 | 9.45 | 7.18 |
| premium80_40 | 55.17% (54.23%–56.10%) | 7.08 | 7.76 | 5.27 |
| instant140 | 58.15% (57.22%–59.08%) | 5.79 | 0.00 | 0.00 |

## Verdict-driving cells

| Cohort / level / type / candidate | Win (95% CI; Wilson if boundary) | Rounds p50/p95 | Enemy turns | Tick HP | Lost raw | Δ versus control |
|---|---:|---:|---:|---:|---:|---|
| main L1 blood instant100 | 28.67% (23.55%–33.78%) | 4/8 | 4.54 | 0.00 | 0.00 | control |
| main L1 blood premium70_70 | 33.00% (27.68%–38.32%) | 4/7 | 3.90 | 5.13 | 3.50 | 4.33pp; not statistically distinguishable |
| main L1 blood premium84_56 | 31.67% (26.40%–36.93%) | 4/7 | 3.77 | 3.82 | 2.78 | 3.00pp; not statistically distinguishable |
| matchedType L5 blood instant100 | 45.00% (39.37%–50.63%) | 8/12 | 8.22 | 0.00 | 0.00 | control |
| matchedType L5 blood premium70_70 | 72.67% (67.62%–77.71%) | 7/10 | 6.92 | 24.20 | 6.80 | 27.67pp; exceeds summed margins |
| matchedType L5 blood premium80_40 | 60.33% (54.80%–65.87%) | 8/11 | 7.58 | 15.30 | 3.98 | 15.33pp; exceeds summed margins |
| matchedType L5 bone instant100 | 45.00% (39.37%–50.63%) | 8/12 | 8.22 | 0.00 | 0.00 | control |
| matchedType L5 bone premium70_70 | 45.00% (39.37%–50.63%) | 8/12 | 8.22 | 0.00 | 0.00 | 0.00pp; not statistically distinguishable |
| matchedType L5 bone premium80_40 | 45.00% (39.37%–50.63%) | 8/12 | 8.22 | 0.00 | 0.00 | 0.00pp; not statistically distinguishable |
| matchedType L10 blood instant100 | 76.33% (71.52%–81.14%) | 11/15 | 10.59 | 0.00 | 0.00 | control |
| matchedType L10 blood premium70_70 | 91.33% (88.15%–94.52%) | 9/13 | 8.49 | 24.76 | 7.62 | 15.00pp; exceeds summed margins |
| matchedType L10 blood premium80_40 | 85.00% (80.96%–89.04%) | 10/14 | 9.58 | 16.10 | 4.59 | 8.67pp; not statistically distinguishable |
| matchedType L10 bone instant100 | 76.33% (71.52%–81.14%) | 11/15 | 10.59 | 0.00 | 0.00 | control |
| matchedType L10 bone premium70_70 | 76.33% (71.52%–81.14%) | 11/15 | 10.59 | 0.00 | 0.00 | 0.00pp; not statistically distinguishable |
| matchedType L10 bone premium80_40 | 76.33% (71.52%–81.14%) | 11/15 | 10.59 | 0.00 | 0.00 | 0.00pp; not statistically distinguishable |
| playerOnly L1 blood instant100 | 32.00% (26.72%–37.28%) | 4/8 | 4.58 | 0.00 | 0.00 | control |
| playerOnly L1 blood premium70_70 | 43.67% (38.05%–49.28%) | 4/7 | 4.14 | 6.15 | 3.58 | 11.67pp; exceeds summed margins |
| playerOnly L1 blood premium84_56 | 44.67% (39.04%–50.29%) | 4/7 | 4.06 | 4.70 | 3.04 | 12.67pp; exceeds summed margins |
| halfHP L1 blood instant100 | 10.00% (6.61%–13.39%) | 3/6 | 2.90 | 0.00 | 0.00 | control |
| halfHP L1 blood premium70_70 | 13.00% (9.19%–16.81%) | 3/5 | 2.95 | 3.80 | 2.79 | 3.00pp; not statistically distinguishable |
| halfHP L1 blood premium84_56 | 12.00% (8.32%–15.68%) | 2/5 | 2.60 | 2.43 | 2.09 | 2.00pp; not statistically distinguishable |

## Concentration stress

One fixed10-base eligible blood hit on an ogre with100HP; real concentration saving throws on impact and every positive aggregate tick. No attacks or spell effects are approximated. Survival of concentration after impact+all3ticks:

| Candidate | Maintained (95% CI) |
|---|---:|
| instant100 | 58.00% (52.41%–63.59%) |
| old80_20 | 8.67% (5.48%–11.85%) |
| premium70_70 | 8.67% (5.48%–11.85%) |
| premium80_60 | 8.67% (5.48%–11.85%) |
| premium84_56 | 8.67% (5.48%–11.85%) |
| premium80_40 | 8.67% (5.48%–11.85%) |
| instant140 | 58.00% (52.41%–63.59%) |

This measures an additional benefit of recurring damage, not spellcaster encounter strength. Cleansing fixtures remove pending damage without acceleration; source defeat preserves prior damage; target defeat and combat end cancel it. No enemy cleanse policy or tactical player cleanse decision is modeled.

Total timeout fights: 914; all in blood-immune defense probes, treated as nonwins. No timeout occurred in a main or matched-family cell.

## Recommendation handoff

Game Designer decision: compensated default120% total, immediateFraction2/3,3ticks (80% base impact +40% base bleeding).140%70/70 remains a configurable higher-premium candidate. Both compensate delay;120% limits the passive premium while preserving the long-target niche. In the matched L5 ogre probe140% yields+27.67 percentage points versus an otherwise identical bone weapon;120%80/40 yields+15.33 points. Both exceed the summed confidence margins;140% also exceeds120% by12.33 points (distinguishable). This supports120% as the more conservative design default, not a declaration of complete family parity. Keep the feature disabled pending hands-on acceptance and full kits, Extra Attack/tactics, Challenge concentration and actual cleanse decisions. Do not call140% final balanced tuning or infer elemental tuning from these blood simulations.

## Representative traces

Selected by outcome: median-length win, shortest loss when present, and greatest surviving party-HP fraction (extreme margin proxy). All traced trials include actual roll messages and HP transitions. Fixtures and complete per-cell outcomes are in the generated JSON; the large raw batch is retained outside the repository and can be regenerated with the harness.

### main L1 blood instant100

**medianWin**
```text
R1 Attack roll: 10 + 2 (ability) + 2 (prof) = 14 vs AC 15
R1 Miss!
R1 🎲 Gnoll rolls 1 + 4 = 5 vs AC 14
R1 ❌ Critical miss!
R2 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R2 💥 Hit! Rolled Damage: 5 + 2 (ability) = 7
R2 impact pc→enemy0 final7 HP22→15
R2 🎲 Gnoll rolls 9 + 4 = 13 vs AC 14
R2 ❌ Gnoll misses!
R3 Attack roll: 3 + 2 (ability) + 2 (prof) = 7 vs AC 15
R3 Miss!
R3 🎲 Gnoll rolls 2 + 4 = 6 vs AC 14
R3 ❌ Gnoll misses!
R4 Attack roll: 15 + 2 (ability) + 2 (prof) = 19 vs AC 15
R4 💥 Hit! Rolled Damage: 8 + 2 (ability) = 10
R4 impact pc→enemy0 final10 HP15→5
R4 🎲 Gnoll rolls 2 + 4 = 6 vs AC 14
R4 ❌ Gnoll misses!
R5 Attack roll: 15 + 2 (ability) + 2 (prof) = 19 vs AC 15
R5 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R5 impact pc→enemy0 final6 HP5→0
```

**loss**
```text
R1 Attack roll: 18 + 2 (ability) + 2 (prof) = 22 vs AC 15
R1 💥 Hit! Rolled Damage: 6 + 2 (ability) = 8
R1 impact pc→enemy0 final8 HP22→14
R1 🎲 Gnoll rolls 18 + 4 = 22 vs AC 14
R1 impact enemy0→pc final6 HP12→6
R2 Attack roll: 1 + 2 (ability) + 2 (prof) = 5 vs AC 15
R2 💥 Critical miss!
R2 🎲 Gnoll rolls 13 + 4 = 17 vs AC 14
R2 impact enemy0→pc final6 HP6→0
```

**extreme**
```text
R1 Attack roll: 15 + 2 (ability) + 2 (prof) = 19 vs AC 15
R1 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R1 impact pc→enemy0 final6 HP22→16
R1 🎲 Gnoll rolls 2 + 4 = 6 vs AC 14
R1 ❌ Gnoll misses!
R2 Attack roll: 7 + 2 (ability) + 2 (prof) = 11 vs AC 15
R2 Miss!
R2 🎲 Gnoll rolls 8 + 4 = 12 vs AC 14
R2 ❌ Gnoll misses!
R3 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R3 ⭐ Critical hit!
R3 💥 Hit! Rolled Damage: 4 + 1 (crit) + 2 (ability) = 7
R3 impact pc→enemy0 final7 HP16→9
R3 🎲 Gnoll rolls 4 + 4 = 8 vs AC 14
R3 ❌ Gnoll misses!
R4 Attack roll: 2 + 2 (ability) + 2 (prof) = 6 vs AC 15
R4 Miss!
R4 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R4 ❌ Gnoll misses!
R5 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R5 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R5 impact pc→enemy0 final9 HP9→0
```

### main L1 blood premium70_70

**medianWin**
```text
R1 🎲 Gnoll rolls 4 + 4 = 8 vs AC 14
R1 ❌ Gnoll misses!
R1 Attack roll: 15 + 2 (ability) + 2 (prof) = 19 vs AC 15
R1 💥 Hit! Rolled Damage: 5 + 2 (ability) = 7
R1 impact pc→enemy0 final4.9 HP22→17.1
R2 tick scheduler→enemy0 final1.634 HP17.1→15.466
R2 🎲 Gnoll rolls 17 + 4 = 21 vs AC 14
R2 impact enemy0→pc final2.1 HP12→9.9
R2 tick scheduler→pc final0.7 HP9.9→9.2
R2 Attack roll: 3 + 2 (ability) + 2 (prof) = 7 vs AC 15
R2 Miss!
R3 tick scheduler→enemy0 final1.633 HP15.466→13.833
R3 🎲 Gnoll rolls 7 + 4 = 11 vs AC 14
R3 ❌ Gnoll misses!
R3 tick scheduler→pc final0.7 HP9.2→8.5
R3 Attack roll: 15 + 2 (ability) + 2 (prof) = 19 vs AC 15
R3 💥 Hit! Rolled Damage: 6 + 2 (ability) = 8
R3 impact pc→enemy0 final5.6 HP13.833→8.233
R4 tick scheduler→enemy0 final3.5 HP8.233→4.733
R4 🎲 Gnoll rolls 16 + 4 = 20 vs AC 14
R4 impact enemy0→pc final4.2 HP8.5→4.3
R4 tick scheduler→pc final2.1 HP4.3→2.2
R4 Attack roll: 16 + 2 (ability) + 2 (prof) = 20 vs AC 15
R4 💥 Hit! Rolled Damage: 6 + 2 (ability) = 8
R4 impact pc→enemy0 final5.6 HP4.733→0
```

**loss**
```text
R1 Attack roll: 18 + 2 (ability) + 2 (prof) = 22 vs AC 15
R1 💥 Hit! Rolled Damage: 6 + 2 (ability) = 8
R1 impact pc→enemy0 final5.6 HP22→16.4
R1 tick scheduler→enemy0 final1.867 HP16.4→14.533
R1 🎲 Gnoll rolls 18 + 4 = 22 vs AC 14
R1 impact enemy0→pc final4.2 HP12→7.8
R2 tick scheduler→pc final1.4 HP7.8→6.4
R2 Attack roll: 1 + 2 (ability) + 2 (prof) = 5 vs AC 15
R2 💥 Critical miss!
R2 tick scheduler→enemy0 final1.867 HP14.533→12.666
R2 🎲 Gnoll rolls 13 + 4 = 17 vs AC 14
R2 impact enemy0→pc final4.2 HP6.4→2.2
R3 tick scheduler→pc final2.8 HP2.2→0
```

**extreme**
```text
R1 Attack roll: 15 + 2 (ability) + 2 (prof) = 19 vs AC 15
R1 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R1 impact pc→enemy0 final4.2 HP22→17.8
R1 tick scheduler→enemy0 final1.4 HP17.8→16.4
R1 🎲 Gnoll rolls 2 + 4 = 6 vs AC 14
R1 ❌ Gnoll misses!
R2 Attack roll: 7 + 2 (ability) + 2 (prof) = 11 vs AC 15
R2 Miss!
R2 tick scheduler→enemy0 final1.4 HP16.4→15
R2 🎲 Gnoll rolls 8 + 4 = 12 vs AC 14
R2 ❌ Gnoll misses!
R3 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R3 ⭐ Critical hit!
R3 💥 Hit! Rolled Damage: 4 + 1 (crit) + 2 (ability) = 7
R3 impact pc→enemy0 final4.9 HP15→10.1
R3 tick scheduler→enemy0 final3.034 HP10.1→7.066
R3 🎲 Gnoll rolls 4 + 4 = 8 vs AC 14
R3 ❌ Gnoll misses!
R4 Attack roll: 2 + 2 (ability) + 2 (prof) = 6 vs AC 15
R4 Miss!
R4 tick scheduler→enemy0 final1.633 HP7.066→5.433
R4 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R4 ❌ Gnoll misses!
R5 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R5 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R5 impact pc→enemy0 final6.3 HP5.433→0
```

### main L1 blood premium84_56

**medianWin**
```text
R1 Attack roll: 6 + 2 (ability) + 2 (prof) = 10 vs AC 15
R1 Miss!
R1 🎲 Gnoll rolls 17 + 4 = 21 vs AC 14
R1 impact enemy0→pc final3.36 HP12→8.64
R2 tick scheduler→pc final0.747 HP8.64→7.893
R2 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R2 ⭐ Critical hit!
R2 💥 Hit! Rolled Damage: 6 + 7 (crit) + 2 (ability) = 15
R2 impact pc→enemy0 final12.6 HP22→9.4
R2 tick scheduler→enemy0 final2.8 HP9.4→6.6
R2 🎲 Gnoll rolls 5 + 4 = 9 vs AC 14
R2 ❌ Gnoll misses!
R3 tick scheduler→pc final0.747 HP7.893→7.146
R3 Attack roll: 5 + 2 (ability) + 2 (prof) = 9 vs AC 15
R3 Miss!
R3 tick scheduler→enemy0 final2.8 HP6.6→3.8
R3 🎲 Gnoll rolls 16 + 4 = 20 vs AC 14
R3 impact enemy0→pc final3.36 HP7.146→3.786
R4 tick scheduler→pc final1.493 HP3.786→2.293
R4 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R4 💥 Hit! Rolled Damage: 5 + 2 (ability) = 7
R4 impact pc→enemy0 final5.88 HP3.8→0
```

**loss**
```text
R1 Attack roll: 18 + 2 (ability) + 2 (prof) = 22 vs AC 15
R1 💥 Hit! Rolled Damage: 6 + 2 (ability) = 8
R1 impact pc→enemy0 final6.72 HP22→15.28
R1 tick scheduler→enemy0 final1.494 HP15.28→13.786
R1 🎲 Gnoll rolls 18 + 4 = 22 vs AC 14
R1 impact enemy0→pc final5.04 HP12→6.96
R2 tick scheduler→pc final1.12 HP6.96→5.84
R2 Attack roll: 1 + 2 (ability) + 2 (prof) = 5 vs AC 15
R2 💥 Critical miss!
R2 tick scheduler→enemy0 final1.493 HP13.786→12.293
R2 🎲 Gnoll rolls 13 + 4 = 17 vs AC 14
R2 impact enemy0→pc final5.04 HP5.84→0.8
R3 tick scheduler→pc final2.24 HP0.8→0
```

**extreme**
```text
R1 Attack roll: 1 + 2 (ability) + 2 (prof) = 5 vs AC 15
R1 💥 Critical miss!
R1 🎲 Gnoll rolls 4 + 4 = 8 vs AC 14
R1 ❌ Gnoll misses!
R2 Attack roll: 6 + 2 (ability) + 2 (prof) = 10 vs AC 15
R2 Miss!
R2 🎲 Gnoll rolls 2 + 4 = 6 vs AC 14
R2 ❌ Gnoll misses!
R3 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R3 💥 Hit! Rolled Damage: 5 + 2 (ability) = 7
R3 impact pc→enemy0 final5.88 HP22→16.12
R3 tick scheduler→enemy0 final1.307 HP16.12→14.813
R3 🎲 Gnoll rolls 4 + 4 = 8 vs AC 14
R3 ❌ Gnoll misses!
R4 Attack roll: 1 + 2 (ability) + 2 (prof) = 5 vs AC 15
R4 💥 Critical miss!
R4 tick scheduler→enemy0 final1.307 HP14.813→13.506
R4 🎲 Gnoll rolls 2 + 4 = 6 vs AC 14
R4 ❌ Gnoll misses!
R5 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R5 ⭐ Critical hit!
R5 💥 Hit! Rolled Damage: 4 + 7 (crit) + 2 (ability) = 13
R5 impact pc→enemy0 final10.92 HP13.506→2.586
R5 tick scheduler→enemy0 final3.733 HP2.586→0
```

### matchedType L5 blood instant100

**medianWin**
```text
R1 🎲 Ogre rolls 2 + 6 = 8 vs AC 16
R1 ❌ Ogre misses!
R1 Attack roll: 10 + 3 (ability) + 3 (prof) = 16 vs AC 11
R1 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R1 impact pc→enemy0 final7 HP59→52
R2 🎲 Ogre rolls 7 + 6 = 13 vs AC 16
R2 ❌ Ogre misses!
R2 Attack roll: 2 + 3 (ability) + 3 (prof) = 8 vs AC 11
R2 Miss!
R3 🎲 Ogre rolls 5 + 6 = 11 vs AC 16
R3 ❌ Ogre misses!
R3 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R3 💥 Hit! Rolled Damage: 6 + 3 (ability) = 9
R3 impact pc→enemy0 final9 HP52→43
R4 🎲 Ogre rolls 1 + 6 = 7 vs AC 16
R4 ❌ Critical miss!
R4 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R4 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R4 impact pc→enemy0 final6 HP43→37
R5 🎲 Ogre rolls 16 + 6 = 22 vs AC 16
R5 impact enemy0→pc final9 HP44→35
R5 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R5 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R5 impact pc→enemy0 final7 HP37→30
R6 🎲 Ogre rolls 8 + 6 = 14 vs AC 16
R6 ❌ Ogre misses!
R6 Attack roll: 15 + 3 (ability) + 3 (prof) = 21 vs AC 11
R6 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R6 impact pc→enemy0 final6 HP30→24
R7 🎲 Ogre rolls 15 + 6 = 21 vs AC 16
R7 impact enemy0→pc final5 HP35→30
R7 Attack roll: 19 + 3 (ability) + 3 (prof) = 25 vs AC 11
R7 💥 Hit! Rolled Damage: 6 + 3 (ability) = 9
R7 impact pc→enemy0 final9 HP24→15
R8 🎲 Ogre rolls 6 + 6 = 12 vs AC 16
R8 ❌ Ogre misses!
R8 Attack roll: 16 + 3 (ability) + 3 (prof) = 22 vs AC 11
R8 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R8 impact pc→enemy0 final11 HP15→4
R9 🎲 Ogre rolls 13 + 6 = 19 vs AC 16
R9 impact enemy0→pc final7 HP30→23
R9 Attack roll: 10 + 3 (ability) + 3 (prof) = 16 vs AC 11
R9 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R9 impact pc→enemy0 final7 HP4→0
```

**loss**
```text
R1 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R1 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R1 impact pc→enemy0 final10 HP59→49
R1 🎲 Ogre rolls 17 + 6 = 23 vs AC 16
R1 impact enemy0→pc final10 HP44→34
R2 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R2 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R2 impact pc→enemy0 final7 HP49→42
R2 🎲 Ogre rolls 20 + 6 = 26 vs AC 16
R2 ⭐ Critical hit! Greatclub: 13 bone damage
R2 impact enemy0→pc final13 HP34→21
R3 Attack roll: 13 + 3 (ability) + 3 (prof) = 19 vs AC 11
R3 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R3 impact pc→enemy0 final7 HP42→35
R3 🎲 Ogre rolls 14 + 6 = 20 vs AC 16
R3 impact enemy0→pc final9 HP21→12
R4 Attack roll: 1 + 3 (ability) + 3 (prof) = 7 vs AC 11
R4 💥 Critical miss!
R4 🎲 Ogre rolls 12 + 6 = 18 vs AC 16
R4 impact enemy0→pc final12 HP12→0
```

**extreme**
```text
R1 🎲 Ogre rolls 4 + 6 = 10 vs AC 16
R1 ❌ Ogre misses!
R1 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R1 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R1 impact pc→enemy0 final7 HP59→52
R2 🎲 Ogre rolls 5 + 6 = 11 vs AC 16
R2 ❌ Ogre misses!
R2 Attack roll: 17 + 3 (ability) + 3 (prof) = 23 vs AC 11
R2 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R2 impact pc→enemy0 final11 HP52→41
R3 🎲 Ogre rolls 7 + 6 = 13 vs AC 16
R3 ❌ Ogre misses!
R3 Attack roll: 13 + 3 (ability) + 3 (prof) = 19 vs AC 11
R3 💥 Hit! Rolled Damage: 5 + 3 (ability) = 8
R3 impact pc→enemy0 final8 HP41→33
R4 🎲 Ogre rolls 1 + 6 = 7 vs AC 16
R4 ❌ Critical miss!
R4 Attack roll: 11 + 3 (ability) + 3 (prof) = 17 vs AC 11
R4 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R4 impact pc→enemy0 final10 HP33→23
R5 🎲 Ogre rolls 9 + 6 = 15 vs AC 16
R5 ❌ Ogre misses!
R5 Attack roll: 18 + 3 (ability) + 3 (prof) = 24 vs AC 11
R5 💥 Hit! Rolled Damage: 5 + 3 (ability) = 8
R5 impact pc→enemy0 final8 HP23→15
R6 🎲 Ogre rolls 14 + 6 = 20 vs AC 16
R6 impact enemy0→pc final5 HP44→39
R6 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R6 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R6 impact pc→enemy0 final10 HP15→5
R7 🎲 Ogre rolls 9 + 6 = 15 vs AC 16
R7 ❌ Ogre misses!
R7 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R7 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R7 impact pc→enemy0 final6 HP5→0
```

### matchedType L5 blood premium70_70

**medianWin**
```text
R1 Attack roll: 1 + 3 (ability) + 3 (prof) = 7 vs AC 11
R1 💥 Critical miss!
R1 🎲 Ogre rolls 8 + 6 = 14 vs AC 16
R1 ❌ Ogre misses!
R2 Attack roll: 11 + 3 (ability) + 3 (prof) = 17 vs AC 11
R2 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R2 impact pc→enemy0 final7 HP59→52
R2 tick scheduler→enemy0 final2.334 HP52→49.666
R2 🎲 Ogre rolls 2 + 6 = 8 vs AC 16
R2 ❌ Ogre misses!
R3 Attack roll: 17 + 3 (ability) + 3 (prof) = 23 vs AC 11
R3 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R3 impact pc→enemy0 final7 HP49.666→42.666
R3 tick scheduler→enemy0 final4.667 HP42.666→37.999
R3 🎲 Ogre rolls 5 + 6 = 11 vs AC 16
R3 ❌ Ogre misses!
R4 Attack roll: 7 + 3 (ability) + 3 (prof) = 13 vs AC 11
R4 💥 Hit! Rolled Damage: 6 + 3 (ability) = 9
R4 impact pc→enemy0 final6.3 HP37.999→31.699
R4 tick scheduler→enemy0 final6.766 HP31.699→24.933
R4 🎲 Ogre rolls 16 + 6 = 22 vs AC 16
R4 impact enemy0→pc final11 HP44→33
R5 Attack roll: 10 + 3 (ability) + 3 (prof) = 16 vs AC 11
R5 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R5 impact pc→enemy0 final7.7 HP24.933→17.233
R5 tick scheduler→enemy0 final7 HP17.233→10.233
R5 🎲 Ogre rolls 12 + 6 = 18 vs AC 16
R5 impact enemy0→pc final11 HP33→22
R6 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R6 💥 Hit! Rolled Damage: 2 + 3 (ability) = 5
R6 impact pc→enemy0 final3.5 HP10.233→6.733
R6 tick scheduler→enemy0 final5.834 HP6.733→0.899
R6 🎲 Ogre rolls 7 + 6 = 13 vs AC 16
R6 ❌ Ogre misses!
R7 Attack roll: 19 + 3 (ability) + 3 (prof) = 25 vs AC 11
R7 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R7 impact pc→enemy0 final4.9 HP0.899→0
```

**loss**
```text
R1 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R1 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R1 impact pc→enemy0 final7 HP59→52
R1 tick scheduler→enemy0 final2.334 HP52→49.666
R1 🎲 Ogre rolls 17 + 6 = 23 vs AC 16
R1 impact enemy0→pc final10 HP44→34
R2 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R2 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R2 impact pc→enemy0 final4.9 HP49.666→44.766
R2 tick scheduler→enemy0 final3.967 HP44.766→40.799
R2 🎲 Ogre rolls 20 + 6 = 26 vs AC 16
R2 ⭐ Critical hit! Greatclub: 13 bone damage
R2 impact enemy0→pc final13 HP34→21
R3 Attack roll: 13 + 3 (ability) + 3 (prof) = 19 vs AC 11
R3 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R3 impact pc→enemy0 final4.9 HP40.799→35.899
R3 tick scheduler→enemy0 final5.6 HP35.899→30.299
R3 🎲 Ogre rolls 14 + 6 = 20 vs AC 16
R3 impact enemy0→pc final9 HP21→12
R4 Attack roll: 1 + 3 (ability) + 3 (prof) = 7 vs AC 11
R4 💥 Critical miss!
R4 tick scheduler→enemy0 final3.266 HP30.299→27.033
R4 🎲 Ogre rolls 12 + 6 = 18 vs AC 16
R4 impact enemy0→pc final12 HP12→0
```

**extreme**
```text
R1 🎲 Ogre rolls 6 + 6 = 12 vs AC 16
R1 ❌ Ogre misses!
R1 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R1 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R1 impact pc→enemy0 final4.2 HP59→54.8
R2 tick scheduler→enemy0 final1.4 HP54.8→53.4
R2 🎲 Ogre rolls 7 + 6 = 13 vs AC 16
R2 ❌ Ogre misses!
R2 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R2 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R2 impact pc→enemy0 final4.2 HP53.4→49.2
R3 tick scheduler→enemy0 final2.8 HP49.2→46.4
R3 🎲 Ogre rolls 1 + 6 = 7 vs AC 16
R3 ❌ Critical miss!
R3 Attack roll: 10 + 3 (ability) + 3 (prof) = 16 vs AC 11
R3 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R3 impact pc→enemy0 final7.7 HP46.4→38.7
R4 tick scheduler→enemy0 final5.367 HP38.7→33.333
R4 🎲 Ogre rolls 3 + 6 = 9 vs AC 16
R4 ❌ Ogre misses!
R4 Attack roll: 18 + 3 (ability) + 3 (prof) = 24 vs AC 11
R4 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R4 impact pc→enemy0 final7 HP33.333→26.333
R5 tick scheduler→enemy0 final6.301 HP26.333→20.032
R5 🎲 Ogre rolls 6 + 6 = 12 vs AC 16
R5 ❌ Ogre misses!
R5 Attack roll: 12 + 3 (ability) + 3 (prof) = 18 vs AC 11
R5 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R5 impact pc→enemy0 final7.7 HP20.032→12.332
R6 tick scheduler→enemy0 final7.466 HP12.332→4.866
R6 🎲 Ogre rolls 2 + 6 = 8 vs AC 16
R6 ❌ Ogre misses!
R6 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R6 💥 Hit! Rolled Damage: 6 + 3 (ability) = 9
R6 impact pc→enemy0 final6.3 HP4.866→0
```

### matchedType L5 blood premium80_40

**medianWin**
```text
R1 🎲 Ogre rolls 9 + 6 = 15 vs AC 16
R1 ❌ Ogre misses!
R1 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R1 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R1 impact pc→enemy0 final5.6 HP59→53.4
R2 tick scheduler→enemy0 final0.934 HP53.4→52.466
R2 🎲 Ogre rolls 16 + 6 = 22 vs AC 16
R2 impact enemy0→pc final7 HP44→37
R2 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R2 💥 Hit! Rolled Damage: 2 + 3 (ability) = 5
R2 impact pc→enemy0 final4 HP52.466→48.466
R3 tick scheduler→enemy0 final1.6 HP48.466→46.866
R3 🎲 Ogre rolls 3 + 6 = 9 vs AC 16
R3 ❌ Ogre misses!
R3 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R3 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R3 impact pc→enemy0 final8.8 HP46.866→38.066
R4 tick scheduler→enemy0 final3.067 HP38.066→34.999
R4 🎲 Ogre rolls 6 + 6 = 12 vs AC 16
R4 ❌ Ogre misses!
R4 Attack roll: 15 + 3 (ability) + 3 (prof) = 21 vs AC 11
R4 💥 Hit! Rolled Damage: 5 + 3 (ability) = 8
R4 impact pc→enemy0 final6.4 HP34.999→28.599
R5 tick scheduler→enemy0 final3.2 HP28.599→25.399
R5 🎲 Ogre rolls 13 + 6 = 19 vs AC 16
R5 impact enemy0→pc final7 HP37→30
R5 Attack roll: 19 + 3 (ability) + 3 (prof) = 25 vs AC 11
R5 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R5 impact pc→enemy0 final4.8 HP25.399→20.599
R6 tick scheduler→enemy0 final3.333 HP20.599→17.266
R6 🎲 Ogre rolls 3 + 6 = 9 vs AC 16
R6 ❌ Ogre misses!
R6 Attack roll: 3 + 3 (ability) + 3 (prof) = 9 vs AC 11
R6 Miss!
R7 tick scheduler→enemy0 final1.866 HP17.266→15.4
R7 🎲 Ogre rolls 13 + 6 = 19 vs AC 16
R7 impact enemy0→pc final10 HP30→20
R7 Attack roll: 19 + 3 (ability) + 3 (prof) = 25 vs AC 11
R7 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R7 impact pc→enemy0 final5.6 HP15.4→9.8
R8 tick scheduler→enemy0 final1.734 HP9.8→8.066
R8 🎲 Ogre rolls 8 + 6 = 14 vs AC 16
R8 ❌ Ogre misses!
R8 Attack roll: 10 + 3 (ability) + 3 (prof) = 16 vs AC 11
R8 💥 Hit! Rolled Damage: 6 + 3 (ability) = 9
R8 impact pc→enemy0 final7.2 HP8.066→0.866
R9 tick scheduler→enemy0 final2.133 HP0.866→0
```

**loss**
```text
R1 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R1 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R1 impact pc→enemy0 final8 HP59→51
R1 tick scheduler→enemy0 final1.334 HP51→49.666
R1 🎲 Ogre rolls 17 + 6 = 23 vs AC 16
R1 impact enemy0→pc final10 HP44→34
R2 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R2 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R2 impact pc→enemy0 final5.6 HP49.666→44.066
R2 tick scheduler→enemy0 final2.267 HP44.066→41.799
R2 🎲 Ogre rolls 20 + 6 = 26 vs AC 16
R2 ⭐ Critical hit! Greatclub: 13 bone damage
R2 impact enemy0→pc final13 HP34→21
R3 Attack roll: 13 + 3 (ability) + 3 (prof) = 19 vs AC 11
R3 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R3 impact pc→enemy0 final5.6 HP41.799→36.199
R3 tick scheduler→enemy0 final3.2 HP36.199→32.999
R3 🎲 Ogre rolls 14 + 6 = 20 vs AC 16
R3 impact enemy0→pc final9 HP21→12
R4 Attack roll: 1 + 3 (ability) + 3 (prof) = 7 vs AC 11
R4 💥 Critical miss!
R4 tick scheduler→enemy0 final1.866 HP32.999→31.133
R4 🎲 Ogre rolls 12 + 6 = 18 vs AC 16
R4 impact enemy0→pc final12 HP12→0
```

**extreme**
```text
R1 🎲 Ogre rolls 6 + 6 = 12 vs AC 16
R1 ❌ Ogre misses!
R1 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R1 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R1 impact pc→enemy0 final4.8 HP59→54.2
R2 tick scheduler→enemy0 final0.8 HP54.2→53.4
R2 🎲 Ogre rolls 7 + 6 = 13 vs AC 16
R2 ❌ Ogre misses!
R2 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R2 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R2 impact pc→enemy0 final4.8 HP53.4→48.6
R3 tick scheduler→enemy0 final1.6 HP48.6→47
R3 🎲 Ogre rolls 1 + 6 = 7 vs AC 16
R3 ❌ Critical miss!
R3 Attack roll: 10 + 3 (ability) + 3 (prof) = 16 vs AC 11
R3 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R3 impact pc→enemy0 final8.8 HP47→38.2
R4 tick scheduler→enemy0 final3.067 HP38.2→35.133
R4 🎲 Ogre rolls 3 + 6 = 9 vs AC 16
R4 ❌ Ogre misses!
R4 Attack roll: 18 + 3 (ability) + 3 (prof) = 24 vs AC 11
R4 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R4 impact pc→enemy0 final8 HP35.133→27.133
R5 tick scheduler→enemy0 final3.601 HP27.133→23.532
R5 🎲 Ogre rolls 6 + 6 = 12 vs AC 16
R5 ❌ Ogre misses!
R5 Attack roll: 12 + 3 (ability) + 3 (prof) = 18 vs AC 11
R5 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R5 impact pc→enemy0 final8.8 HP23.532→14.732
R6 tick scheduler→enemy0 final4.266 HP14.732→10.466
R6 🎲 Ogre rolls 2 + 6 = 8 vs AC 16
R6 ❌ Ogre misses!
R6 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R6 💥 Hit! Rolled Damage: 6 + 3 (ability) = 9
R6 impact pc→enemy0 final7.2 HP10.466→3.266
R7 tick scheduler→enemy0 final4 HP3.266→0
```

### matchedType L5 bone instant100

**medianWin**
```text
R1 🎲 Ogre rolls 2 + 6 = 8 vs AC 16
R1 ❌ Ogre misses!
R1 Attack roll: 10 + 3 (ability) + 3 (prof) = 16 vs AC 11
R1 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R1 impact pc→enemy0 final7 HP59→52
R2 🎲 Ogre rolls 7 + 6 = 13 vs AC 16
R2 ❌ Ogre misses!
R2 Attack roll: 2 + 3 (ability) + 3 (prof) = 8 vs AC 11
R2 Miss!
R3 🎲 Ogre rolls 5 + 6 = 11 vs AC 16
R3 ❌ Ogre misses!
R3 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R3 💥 Hit! Rolled Damage: 6 + 3 (ability) = 9
R3 impact pc→enemy0 final9 HP52→43
R4 🎲 Ogre rolls 1 + 6 = 7 vs AC 16
R4 ❌ Critical miss!
R4 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R4 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R4 impact pc→enemy0 final6 HP43→37
R5 🎲 Ogre rolls 16 + 6 = 22 vs AC 16
R5 impact enemy0→pc final9 HP44→35
R5 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R5 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R5 impact pc→enemy0 final7 HP37→30
R6 🎲 Ogre rolls 8 + 6 = 14 vs AC 16
R6 ❌ Ogre misses!
R6 Attack roll: 15 + 3 (ability) + 3 (prof) = 21 vs AC 11
R6 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R6 impact pc→enemy0 final6 HP30→24
R7 🎲 Ogre rolls 15 + 6 = 21 vs AC 16
R7 impact enemy0→pc final5 HP35→30
R7 Attack roll: 19 + 3 (ability) + 3 (prof) = 25 vs AC 11
R7 💥 Hit! Rolled Damage: 6 + 3 (ability) = 9
R7 impact pc→enemy0 final9 HP24→15
R8 🎲 Ogre rolls 6 + 6 = 12 vs AC 16
R8 ❌ Ogre misses!
R8 Attack roll: 16 + 3 (ability) + 3 (prof) = 22 vs AC 11
R8 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R8 impact pc→enemy0 final11 HP15→4
R9 🎲 Ogre rolls 13 + 6 = 19 vs AC 16
R9 impact enemy0→pc final7 HP30→23
R9 Attack roll: 10 + 3 (ability) + 3 (prof) = 16 vs AC 11
R9 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R9 impact pc→enemy0 final7 HP4→0
```

**loss**
```text
R1 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R1 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R1 impact pc→enemy0 final10 HP59→49
R1 🎲 Ogre rolls 17 + 6 = 23 vs AC 16
R1 impact enemy0→pc final10 HP44→34
R2 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R2 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R2 impact pc→enemy0 final7 HP49→42
R2 🎲 Ogre rolls 20 + 6 = 26 vs AC 16
R2 ⭐ Critical hit! Greatclub: 13 bone damage
R2 impact enemy0→pc final13 HP34→21
R3 Attack roll: 13 + 3 (ability) + 3 (prof) = 19 vs AC 11
R3 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R3 impact pc→enemy0 final7 HP42→35
R3 🎲 Ogre rolls 14 + 6 = 20 vs AC 16
R3 impact enemy0→pc final9 HP21→12
R4 Attack roll: 1 + 3 (ability) + 3 (prof) = 7 vs AC 11
R4 💥 Critical miss!
R4 🎲 Ogre rolls 12 + 6 = 18 vs AC 16
R4 impact enemy0→pc final12 HP12→0
```

**extreme**
```text
R1 🎲 Ogre rolls 4 + 6 = 10 vs AC 16
R1 ❌ Ogre misses!
R1 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R1 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R1 impact pc→enemy0 final7 HP59→52
R2 🎲 Ogre rolls 5 + 6 = 11 vs AC 16
R2 ❌ Ogre misses!
R2 Attack roll: 17 + 3 (ability) + 3 (prof) = 23 vs AC 11
R2 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R2 impact pc→enemy0 final11 HP52→41
R3 🎲 Ogre rolls 7 + 6 = 13 vs AC 16
R3 ❌ Ogre misses!
R3 Attack roll: 13 + 3 (ability) + 3 (prof) = 19 vs AC 11
R3 💥 Hit! Rolled Damage: 5 + 3 (ability) = 8
R3 impact pc→enemy0 final8 HP41→33
R4 🎲 Ogre rolls 1 + 6 = 7 vs AC 16
R4 ❌ Critical miss!
R4 Attack roll: 11 + 3 (ability) + 3 (prof) = 17 vs AC 11
R4 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R4 impact pc→enemy0 final10 HP33→23
R5 🎲 Ogre rolls 9 + 6 = 15 vs AC 16
R5 ❌ Ogre misses!
R5 Attack roll: 18 + 3 (ability) + 3 (prof) = 24 vs AC 11
R5 💥 Hit! Rolled Damage: 5 + 3 (ability) = 8
R5 impact pc→enemy0 final8 HP23→15
R6 🎲 Ogre rolls 14 + 6 = 20 vs AC 16
R6 impact enemy0→pc final5 HP44→39
R6 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R6 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R6 impact pc→enemy0 final10 HP15→5
R7 🎲 Ogre rolls 9 + 6 = 15 vs AC 16
R7 ❌ Ogre misses!
R7 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R7 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R7 impact pc→enemy0 final6 HP5→0
```

### matchedType L5 bone premium70_70

**medianWin**
```text
R1 🎲 Ogre rolls 2 + 6 = 8 vs AC 16
R1 ❌ Ogre misses!
R1 Attack roll: 10 + 3 (ability) + 3 (prof) = 16 vs AC 11
R1 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R1 impact pc→enemy0 final7 HP59→52
R2 🎲 Ogre rolls 7 + 6 = 13 vs AC 16
R2 ❌ Ogre misses!
R2 Attack roll: 2 + 3 (ability) + 3 (prof) = 8 vs AC 11
R2 Miss!
R3 🎲 Ogre rolls 5 + 6 = 11 vs AC 16
R3 ❌ Ogre misses!
R3 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R3 💥 Hit! Rolled Damage: 6 + 3 (ability) = 9
R3 impact pc→enemy0 final9 HP52→43
R4 🎲 Ogre rolls 1 + 6 = 7 vs AC 16
R4 ❌ Critical miss!
R4 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R4 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R4 impact pc→enemy0 final6 HP43→37
R5 🎲 Ogre rolls 16 + 6 = 22 vs AC 16
R5 impact enemy0→pc final9 HP44→35
R5 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R5 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R5 impact pc→enemy0 final7 HP37→30
R6 🎲 Ogre rolls 8 + 6 = 14 vs AC 16
R6 ❌ Ogre misses!
R6 Attack roll: 15 + 3 (ability) + 3 (prof) = 21 vs AC 11
R6 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R6 impact pc→enemy0 final6 HP30→24
R7 🎲 Ogre rolls 15 + 6 = 21 vs AC 16
R7 impact enemy0→pc final5 HP35→30
R7 Attack roll: 19 + 3 (ability) + 3 (prof) = 25 vs AC 11
R7 💥 Hit! Rolled Damage: 6 + 3 (ability) = 9
R7 impact pc→enemy0 final9 HP24→15
R8 🎲 Ogre rolls 6 + 6 = 12 vs AC 16
R8 ❌ Ogre misses!
R8 Attack roll: 16 + 3 (ability) + 3 (prof) = 22 vs AC 11
R8 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R8 impact pc→enemy0 final11 HP15→4
R9 🎲 Ogre rolls 13 + 6 = 19 vs AC 16
R9 impact enemy0→pc final7 HP30→23
R9 Attack roll: 10 + 3 (ability) + 3 (prof) = 16 vs AC 11
R9 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R9 impact pc→enemy0 final7 HP4→0
```

**loss**
```text
R1 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R1 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R1 impact pc→enemy0 final10 HP59→49
R1 🎲 Ogre rolls 17 + 6 = 23 vs AC 16
R1 impact enemy0→pc final10 HP44→34
R2 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R2 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R2 impact pc→enemy0 final7 HP49→42
R2 🎲 Ogre rolls 20 + 6 = 26 vs AC 16
R2 ⭐ Critical hit! Greatclub: 13 bone damage
R2 impact enemy0→pc final13 HP34→21
R3 Attack roll: 13 + 3 (ability) + 3 (prof) = 19 vs AC 11
R3 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R3 impact pc→enemy0 final7 HP42→35
R3 🎲 Ogre rolls 14 + 6 = 20 vs AC 16
R3 impact enemy0→pc final9 HP21→12
R4 Attack roll: 1 + 3 (ability) + 3 (prof) = 7 vs AC 11
R4 💥 Critical miss!
R4 🎲 Ogre rolls 12 + 6 = 18 vs AC 16
R4 impact enemy0→pc final12 HP12→0
```

**extreme**
```text
R1 🎲 Ogre rolls 4 + 6 = 10 vs AC 16
R1 ❌ Ogre misses!
R1 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R1 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R1 impact pc→enemy0 final7 HP59→52
R2 🎲 Ogre rolls 5 + 6 = 11 vs AC 16
R2 ❌ Ogre misses!
R2 Attack roll: 17 + 3 (ability) + 3 (prof) = 23 vs AC 11
R2 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R2 impact pc→enemy0 final11 HP52→41
R3 🎲 Ogre rolls 7 + 6 = 13 vs AC 16
R3 ❌ Ogre misses!
R3 Attack roll: 13 + 3 (ability) + 3 (prof) = 19 vs AC 11
R3 💥 Hit! Rolled Damage: 5 + 3 (ability) = 8
R3 impact pc→enemy0 final8 HP41→33
R4 🎲 Ogre rolls 1 + 6 = 7 vs AC 16
R4 ❌ Critical miss!
R4 Attack roll: 11 + 3 (ability) + 3 (prof) = 17 vs AC 11
R4 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R4 impact pc→enemy0 final10 HP33→23
R5 🎲 Ogre rolls 9 + 6 = 15 vs AC 16
R5 ❌ Ogre misses!
R5 Attack roll: 18 + 3 (ability) + 3 (prof) = 24 vs AC 11
R5 💥 Hit! Rolled Damage: 5 + 3 (ability) = 8
R5 impact pc→enemy0 final8 HP23→15
R6 🎲 Ogre rolls 14 + 6 = 20 vs AC 16
R6 impact enemy0→pc final5 HP44→39
R6 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R6 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R6 impact pc→enemy0 final10 HP15→5
R7 🎲 Ogre rolls 9 + 6 = 15 vs AC 16
R7 ❌ Ogre misses!
R7 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R7 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R7 impact pc→enemy0 final6 HP5→0
```

### matchedType L5 bone premium80_40

**medianWin**
```text
R1 🎲 Ogre rolls 2 + 6 = 8 vs AC 16
R1 ❌ Ogre misses!
R1 Attack roll: 10 + 3 (ability) + 3 (prof) = 16 vs AC 11
R1 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R1 impact pc→enemy0 final7 HP59→52
R2 🎲 Ogre rolls 7 + 6 = 13 vs AC 16
R2 ❌ Ogre misses!
R2 Attack roll: 2 + 3 (ability) + 3 (prof) = 8 vs AC 11
R2 Miss!
R3 🎲 Ogre rolls 5 + 6 = 11 vs AC 16
R3 ❌ Ogre misses!
R3 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R3 💥 Hit! Rolled Damage: 6 + 3 (ability) = 9
R3 impact pc→enemy0 final9 HP52→43
R4 🎲 Ogre rolls 1 + 6 = 7 vs AC 16
R4 ❌ Critical miss!
R4 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R4 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R4 impact pc→enemy0 final6 HP43→37
R5 🎲 Ogre rolls 16 + 6 = 22 vs AC 16
R5 impact enemy0→pc final9 HP44→35
R5 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R5 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R5 impact pc→enemy0 final7 HP37→30
R6 🎲 Ogre rolls 8 + 6 = 14 vs AC 16
R6 ❌ Ogre misses!
R6 Attack roll: 15 + 3 (ability) + 3 (prof) = 21 vs AC 11
R6 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R6 impact pc→enemy0 final6 HP30→24
R7 🎲 Ogre rolls 15 + 6 = 21 vs AC 16
R7 impact enemy0→pc final5 HP35→30
R7 Attack roll: 19 + 3 (ability) + 3 (prof) = 25 vs AC 11
R7 💥 Hit! Rolled Damage: 6 + 3 (ability) = 9
R7 impact pc→enemy0 final9 HP24→15
R8 🎲 Ogre rolls 6 + 6 = 12 vs AC 16
R8 ❌ Ogre misses!
R8 Attack roll: 16 + 3 (ability) + 3 (prof) = 22 vs AC 11
R8 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R8 impact pc→enemy0 final11 HP15→4
R9 🎲 Ogre rolls 13 + 6 = 19 vs AC 16
R9 impact enemy0→pc final7 HP30→23
R9 Attack roll: 10 + 3 (ability) + 3 (prof) = 16 vs AC 11
R9 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R9 impact pc→enemy0 final7 HP4→0
```

**loss**
```text
R1 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R1 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R1 impact pc→enemy0 final10 HP59→49
R1 🎲 Ogre rolls 17 + 6 = 23 vs AC 16
R1 impact enemy0→pc final10 HP44→34
R2 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R2 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R2 impact pc→enemy0 final7 HP49→42
R2 🎲 Ogre rolls 20 + 6 = 26 vs AC 16
R2 ⭐ Critical hit! Greatclub: 13 bone damage
R2 impact enemy0→pc final13 HP34→21
R3 Attack roll: 13 + 3 (ability) + 3 (prof) = 19 vs AC 11
R3 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R3 impact pc→enemy0 final7 HP42→35
R3 🎲 Ogre rolls 14 + 6 = 20 vs AC 16
R3 impact enemy0→pc final9 HP21→12
R4 Attack roll: 1 + 3 (ability) + 3 (prof) = 7 vs AC 11
R4 💥 Critical miss!
R4 🎲 Ogre rolls 12 + 6 = 18 vs AC 16
R4 impact enemy0→pc final12 HP12→0
```

**extreme**
```text
R1 🎲 Ogre rolls 4 + 6 = 10 vs AC 16
R1 ❌ Ogre misses!
R1 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R1 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R1 impact pc→enemy0 final7 HP59→52
R2 🎲 Ogre rolls 5 + 6 = 11 vs AC 16
R2 ❌ Ogre misses!
R2 Attack roll: 17 + 3 (ability) + 3 (prof) = 23 vs AC 11
R2 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R2 impact pc→enemy0 final11 HP52→41
R3 🎲 Ogre rolls 7 + 6 = 13 vs AC 16
R3 ❌ Ogre misses!
R3 Attack roll: 13 + 3 (ability) + 3 (prof) = 19 vs AC 11
R3 💥 Hit! Rolled Damage: 5 + 3 (ability) = 8
R3 impact pc→enemy0 final8 HP41→33
R4 🎲 Ogre rolls 1 + 6 = 7 vs AC 16
R4 ❌ Critical miss!
R4 Attack roll: 11 + 3 (ability) + 3 (prof) = 17 vs AC 11
R4 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R4 impact pc→enemy0 final10 HP33→23
R5 🎲 Ogre rolls 9 + 6 = 15 vs AC 16
R5 ❌ Ogre misses!
R5 Attack roll: 18 + 3 (ability) + 3 (prof) = 24 vs AC 11
R5 💥 Hit! Rolled Damage: 5 + 3 (ability) = 8
R5 impact pc→enemy0 final8 HP23→15
R6 🎲 Ogre rolls 14 + 6 = 20 vs AC 16
R6 impact enemy0→pc final5 HP44→39
R6 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R6 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R6 impact pc→enemy0 final10 HP15→5
R7 🎲 Ogre rolls 9 + 6 = 15 vs AC 16
R7 ❌ Ogre misses!
R7 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R7 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R7 impact pc→enemy0 final6 HP5→0
```

### matchedType L10 blood instant100

**medianWin**
```text
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R1 ❌ Veteran misses!
R1 Attack roll: 6 + 4 (ability) + 4 (prof) = 14 vs AC 17
R1 Miss!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R2 ❌ Veteran misses!
R2 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R2 💥 Critical miss!
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R3 ❌ Veteran misses!
R3 Attack roll: 14 + 4 (ability) + 4 (prof) = 22 vs AC 17
R3 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R3 impact pc→enemy0 final7 HP58→51
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R4 ❌ Veteran misses!
R4 Attack roll: 8 + 4 (ability) + 4 (prof) = 16 vs AC 17
R4 Miss!
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R5 impact enemy0→pc final10 HP84→74
R5 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R5 impact enemy0→pc final9 HP74→65
R5 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R5 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R5 impact pc→enemy0 final5 HP51→46
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R6 impact enemy0→pc final9 HP65→56
R6 Attack roll: 6 + 4 (ability) + 4 (prof) = 14 vs AC 17
R6 Miss!
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R7 impact enemy0→pc final8 HP56→48
R7 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R7 impact enemy0→pc final8 HP48→40
R7 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R7 💥 Hit! Rolled Damage: 4 + 4 (ability) = 8
R7 impact pc→enemy0 final8 HP46→38
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R8 ❌ Critical miss!
R8 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R8 ❌ Veteran misses!
R8 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R8 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R8 impact pc→enemy0 final9 HP38→29
R9 ⚔️ Veteran uses Multiattack!
R9 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R9 impact enemy0→pc final7 HP40→33
R9 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R9 impact enemy0→pc final9 HP33→24
R9 Attack roll: 12 + 4 (ability) + 4 (prof) = 20 vs AC 17
R9 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R9 impact pc→enemy0 final11 HP29→18
R10 ⚔️ Veteran uses Multiattack!
R10 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R10 ❌ Veteran misses!
R10 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R10 ⭐ Critical hit! Shortsword: 6 blood damage
R10 impact enemy0→pc final6 HP24→18
R10 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R10 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R10 impact pc→enemy0 final5 HP18→13
R11 ⚔️ Veteran uses Multiattack!
R11 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R11 ❌ Critical miss!
R11 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R11 impact enemy0→pc final4 HP18→14
R11 Attack roll: 20 + 4 (ability) + 4 (prof) = 28 vs AC 17
R11 ⭐ Critical hit!
R11 💥 Hit! Rolled Damage: 5 + 4 (crit) + 4 (ability) = 13
R11 impact pc→enemy0 final13 HP13→0
```

**loss**
```text
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R1 impact enemy0→pc final8 HP84→76
R1 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R1 💥 Critical miss!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R2 impact enemy0→pc final6 HP76→70
R2 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R2 ❌ Veteran misses!
R2 Attack roll: 2 + 4 (ability) + 4 (prof) = 10 vs AC 17
R2 Miss!
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R3 ⭐ Critical hit! Sword: 13 blood damage
R3 impact enemy0→pc final13 HP70→57
R3 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R3 ❌ Veteran misses!
R3 Attack roll: 5 + 4 (ability) + 4 (prof) = 13 vs AC 17
R3 Miss!
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final7 HP57→50
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final8 HP50→42
R4 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R4 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R4 impact pc→enemy0 final11 HP58→47
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R5 impact enemy0→pc final10 HP42→32
R5 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R5 impact enemy0→pc final6 HP32→26
R5 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R5 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R5 impact pc→enemy0 final12 HP47→35
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 13 + 5 = 18 vs AC 18
R6 impact enemy0→pc final10 HP26→16
R6 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R6 ⭐ Critical hit! Shortsword: 13 blood damage
R6 impact enemy0→pc final13 HP16→3
R6 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact pc→enemy0 final12 HP35→23
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R7 impact enemy0→pc final5 HP3→0
```

**extreme**
```text
R1 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R1 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R1 impact pc→enemy0 final6 HP58→52
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R1 ❌ Critical miss!
R2 Attack roll: 17 + 4 (ability) + 4 (prof) = 25 vs AC 17
R2 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R2 impact pc→enemy0 final5 HP52→47
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R2 ❌ Veteran misses!
R3 Attack roll: 12 + 4 (ability) + 4 (prof) = 20 vs AC 17
R3 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R3 impact pc→enemy0 final7 HP47→40
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R3 ❌ Veteran misses!
R4 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R4 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R4 impact pc→enemy0 final12 HP40→28
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R4 impact enemy0→pc final9 HP84→75
R5 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R5 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R5 impact pc→enemy0 final11 HP28→17
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R5 ❌ Veteran misses!
R5 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R5 ❌ Veteran misses!
R6 Attack roll: 18 + 4 (ability) + 4 (prof) = 26 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact pc→enemy0 final12 HP17→5
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R6 ❌ Veteran misses!
R7 Attack roll: 9 + 4 (ability) + 4 (prof) = 17 vs AC 17
R7 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R7 impact pc→enemy0 final10 HP5→0
```

### matchedType L10 blood premium70_70

**medianWin**
```text
R1 Attack roll: 20 + 4 (ability) + 4 (prof) = 28 vs AC 17
R1 ⭐ Critical hit!
R1 💥 Hit! Rolled Damage: 2 + 3 (crit) + 4 (ability) = 9
R1 impact pc→enemy0 final6.3 HP58→51.7
R1 tick scheduler→enemy0 final2.1 HP51.7→49.6
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R1 ❌ Critical miss!
R2 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R2 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R2 impact pc→enemy0 final6.3 HP49.6→43.3
R2 tick scheduler→enemy0 final4.2 HP43.3→39.1
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R2 ❌ Critical miss!
R2 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R2 ❌ Veteran misses!
R3 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R3 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R3 impact pc→enemy0 final6.3 HP39.1→32.8
R3 tick scheduler→enemy0 final6.3 HP32.8→26.5
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R3 ❌ Veteran misses!
R4 Attack roll: 8 + 4 (ability) + 4 (prof) = 16 vs AC 17
R4 Miss!
R4 tick scheduler→enemy0 final4.2 HP26.5→22.3
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R4 ❌ Veteran misses!
R5 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R5 Miss!
R5 tick scheduler→enemy0 final2.1 HP22.3→20.2
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R5 ❌ Veteran misses!
R5 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R5 ❌ Veteran misses!
R6 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R6 Miss!
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R6 ❌ Veteran misses!
R7 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R7 💥 Hit! Rolled Damage: 4 + 4 (ability) = 8
R7 impact pc→enemy0 final5.6 HP20.2→14.6
R7 tick scheduler→enemy0 final1.867 HP14.6→12.733
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R7 ❌ Veteran misses!
R7 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R7 ❌ Veteran misses!
R8 Attack roll: 2 + 4 (ability) + 4 (prof) = 10 vs AC 17
R8 Miss!
R8 tick scheduler→enemy0 final1.867 HP12.733→10.866
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R8 ❌ Veteran misses!
R8 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R8 ❌ Veteran misses!
R9 Attack roll: 9 + 4 (ability) + 4 (prof) = 17 vs AC 17
R9 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R9 impact pc→enemy0 final7 HP10.866→3.866
R9 tick scheduler→enemy0 final4.2 HP3.866→0
```

**loss**
```text
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R1 impact enemy0→pc final8 HP84→76
R1 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R1 💥 Critical miss!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R2 impact enemy0→pc final6 HP76→70
R2 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R2 ❌ Veteran misses!
R2 Attack roll: 2 + 4 (ability) + 4 (prof) = 10 vs AC 17
R2 Miss!
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R3 ⭐ Critical hit! Sword: 13 blood damage
R3 impact enemy0→pc final13 HP70→57
R3 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R3 ❌ Veteran misses!
R3 Attack roll: 5 + 4 (ability) + 4 (prof) = 13 vs AC 17
R3 Miss!
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final7 HP57→50
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final8 HP50→42
R4 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R4 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R4 impact pc→enemy0 final7.7 HP58→50.3
R5 tick scheduler→enemy0 final2.567 HP50.3→47.733
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R5 impact enemy0→pc final10 HP42→32
R5 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R5 impact enemy0→pc final6 HP32→26
R5 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R5 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R5 impact pc→enemy0 final8.4 HP47.733→39.333
R6 tick scheduler→enemy0 final5.367 HP39.333→33.966
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 13 + 5 = 18 vs AC 18
R6 impact enemy0→pc final10 HP26→16
R6 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R6 ⭐ Critical hit! Shortsword: 13 blood damage
R6 impact enemy0→pc final13 HP16→3
R6 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact pc→enemy0 final8.4 HP33.966→25.566
R7 tick scheduler→enemy0 final8.166 HP25.566→17.4
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R7 impact enemy0→pc final5 HP3→0
```

**extreme**
```text
R1 Attack roll: 20 + 4 (ability) + 4 (prof) = 28 vs AC 17
R1 ⭐ Critical hit!
R1 💥 Hit! Rolled Damage: 2 + 3 (crit) + 4 (ability) = 9
R1 impact pc→enemy0 final6.3 HP58→51.7
R1 tick scheduler→enemy0 final2.1 HP51.7→49.6
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R1 ❌ Critical miss!
R2 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R2 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R2 impact pc→enemy0 final6.3 HP49.6→43.3
R2 tick scheduler→enemy0 final4.2 HP43.3→39.1
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R2 ❌ Critical miss!
R2 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R2 ❌ Veteran misses!
R3 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R3 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R3 impact pc→enemy0 final6.3 HP39.1→32.8
R3 tick scheduler→enemy0 final6.3 HP32.8→26.5
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R3 ❌ Veteran misses!
R4 Attack roll: 8 + 4 (ability) + 4 (prof) = 16 vs AC 17
R4 Miss!
R4 tick scheduler→enemy0 final4.2 HP26.5→22.3
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R4 ❌ Veteran misses!
R5 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R5 Miss!
R5 tick scheduler→enemy0 final2.1 HP22.3→20.2
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R5 ❌ Veteran misses!
R5 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R5 ❌ Veteran misses!
R6 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R6 Miss!
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R6 ❌ Veteran misses!
R7 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R7 💥 Hit! Rolled Damage: 4 + 4 (ability) = 8
R7 impact pc→enemy0 final5.6 HP20.2→14.6
R7 tick scheduler→enemy0 final1.867 HP14.6→12.733
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R7 ❌ Veteran misses!
R7 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R7 ❌ Veteran misses!
R8 Attack roll: 2 + 4 (ability) + 4 (prof) = 10 vs AC 17
R8 Miss!
R8 tick scheduler→enemy0 final1.867 HP12.733→10.866
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R8 ❌ Veteran misses!
R8 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R8 ❌ Veteran misses!
R9 Attack roll: 9 + 4 (ability) + 4 (prof) = 17 vs AC 17
R9 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R9 impact pc→enemy0 final7 HP10.866→3.866
R9 tick scheduler→enemy0 final4.2 HP3.866→0
```

### matchedType L10 blood premium80_40

**medianWin**
```text
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R1 ❌ Veteran misses!
R1 Attack roll: 2 + 4 (ability) + 4 (prof) = 10 vs AC 17
R1 Miss!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R2 ⭐ Critical hit! Sword: 11 blood damage
R2 impact enemy0→pc final11 HP84→73
R2 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R2 impact enemy0→pc final8 HP73→65
R2 Attack roll: 9 + 4 (ability) + 4 (prof) = 17 vs AC 17
R2 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R2 impact pc→enemy0 final4 HP58→54
R3 tick scheduler→enemy0 final0.667 HP54→53.333
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R3 impact enemy0→pc final5 HP65→60
R3 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R3 ❌ Veteran misses!
R3 Attack roll: 11 + 4 (ability) + 4 (prof) = 19 vs AC 17
R3 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R3 impact pc→enemy0 final7.2 HP53.333→46.133
R4 tick scheduler→enemy0 final1.867 HP46.133→44.266
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R4 ❌ Veteran misses!
R4 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R4 Miss!
R5 tick scheduler→enemy0 final1.866 HP44.266→42.4
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R5 ❌ Veteran misses!
R5 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R5 impact enemy0→pc final4 HP60→56
R5 Attack roll: 8 + 4 (ability) + 4 (prof) = 16 vs AC 17
R5 Miss!
R6 tick scheduler→enemy0 final1.2 HP42.4→41.2
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R6 impact enemy0→pc final8 HP56→48
R6 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R6 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R6 impact pc→enemy0 final5.6 HP41.2→35.6
R7 tick scheduler→enemy0 final0.934 HP35.6→34.666
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R7 ❌ Veteran misses!
R7 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R7 ❌ Veteran misses!
R7 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R7 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R7 impact pc→enemy0 final5.6 HP34.666→29.066
R8 tick scheduler→enemy0 final1.867 HP29.066→27.199
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R8 impact enemy0→pc final4 HP48→44
R8 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R8 impact enemy0→pc final5 HP44→39
R8 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R8 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R8 impact pc→enemy0 final5.6 HP27.199→21.599
R9 tick scheduler→enemy0 final2.8 HP21.599→18.799
R9 ⚔️ Veteran uses Multiattack!
R9 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R9 ❌ Veteran misses!
R9 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R9 ❌ Veteran misses!
R9 Attack roll: 20 + 4 (ability) + 4 (prof) = 28 vs AC 17
R9 ⭐ Critical hit!
R9 💥 Hit! Rolled Damage: 5 + 7 (crit) + 4 (ability) = 16
R9 impact pc→enemy0 final12.8 HP18.799→5.999
R10 tick scheduler→enemy0 final4 HP5.999→1.999
R10 ⚔️ Veteran uses Multiattack!
R10 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R10 ❌ Critical miss!
R10 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R10 ⭐ Critical hit! Shortsword: 9 blood damage
R10 impact enemy0→pc final9 HP39→30
R10 Attack roll: 5 + 4 (ability) + 4 (prof) = 13 vs AC 17
R10 Miss!
R11 tick scheduler→enemy0 final3.066 HP1.999→0
```

**loss**
```text
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R1 impact enemy0→pc final8 HP84→76
R1 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R1 💥 Critical miss!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R2 impact enemy0→pc final6 HP76→70
R2 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R2 ❌ Veteran misses!
R2 Attack roll: 2 + 4 (ability) + 4 (prof) = 10 vs AC 17
R2 Miss!
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R3 ⭐ Critical hit! Sword: 13 blood damage
R3 impact enemy0→pc final13 HP70→57
R3 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R3 ❌ Veteran misses!
R3 Attack roll: 5 + 4 (ability) + 4 (prof) = 13 vs AC 17
R3 Miss!
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final7 HP57→50
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final8 HP50→42
R4 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R4 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R4 impact pc→enemy0 final8.8 HP58→49.2
R5 tick scheduler→enemy0 final1.467 HP49.2→47.733
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R5 impact enemy0→pc final10 HP42→32
R5 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R5 impact enemy0→pc final6 HP32→26
R5 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R5 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R5 impact pc→enemy0 final9.6 HP47.733→38.133
R6 tick scheduler→enemy0 final3.067 HP38.133→35.066
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 13 + 5 = 18 vs AC 18
R6 impact enemy0→pc final10 HP26→16
R6 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R6 ⭐ Critical hit! Shortsword: 13 blood damage
R6 impact enemy0→pc final13 HP16→3
R6 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact pc→enemy0 final9.6 HP35.066→25.466
R7 tick scheduler→enemy0 final4.666 HP25.466→20.8
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R7 impact enemy0→pc final5 HP3→0
```

**extreme**
```text
R1 Attack roll: 11 + 4 (ability) + 4 (prof) = 19 vs AC 17
R1 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R1 impact pc→enemy0 final8 HP58→50
R1 tick scheduler→enemy0 final1.334 HP50→48.666
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R1 ❌ Veteran misses!
R2 Attack roll: 4 + 4 (ability) + 4 (prof) = 12 vs AC 17
R2 Miss!
R2 tick scheduler→enemy0 final1.333 HP48.666→47.333
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R2 ❌ Veteran misses!
R3 Attack roll: 14 + 4 (ability) + 4 (prof) = 22 vs AC 17
R3 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R3 impact pc→enemy0 final5.6 HP47.333→41.733
R3 tick scheduler→enemy0 final2.267 HP41.733→39.466
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R3 ❌ Veteran misses!
R4 Attack roll: 9 + 4 (ability) + 4 (prof) = 17 vs AC 17
R4 💥 Hit! Rolled Damage: 4 + 4 (ability) = 8
R4 impact pc→enemy0 final6.4 HP39.466→33.066
R4 tick scheduler→enemy0 final2 HP33.066→31.066
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R4 ❌ Veteran misses!
R5 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R5 Miss!
R5 tick scheduler→enemy0 final2 HP31.066→29.066
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R5 ❌ Veteran misses!
R5 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R5 ❌ Veteran misses!
R6 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R6 Miss!
R6 tick scheduler→enemy0 final1.066 HP29.066→28
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R6 ❌ Veteran misses!
R7 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R7 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R7 impact pc→enemy0 final8 HP28→20
R7 tick scheduler→enemy0 final1.334 HP20→18.666
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R7 ❌ Veteran misses!
R7 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R7 ❌ Critical miss!
R8 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R8 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R8 impact pc→enemy0 final8.8 HP18.666→9.866
R8 tick scheduler→enemy0 final2.8 HP9.866→7.066
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R8 ❌ Veteran misses!
R8 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R8 ❌ Veteran misses!
R9 Attack roll: 11 + 4 (ability) + 4 (prof) = 19 vs AC 17
R9 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R9 impact pc→enemy0 final8.8 HP7.066→0
```

### matchedType L10 bone instant100

**medianWin**
```text
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R1 ❌ Veteran misses!
R1 Attack roll: 6 + 4 (ability) + 4 (prof) = 14 vs AC 17
R1 Miss!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R2 ❌ Veteran misses!
R2 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R2 💥 Critical miss!
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R3 ❌ Veteran misses!
R3 Attack roll: 14 + 4 (ability) + 4 (prof) = 22 vs AC 17
R3 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R3 impact pc→enemy0 final7 HP58→51
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R4 ❌ Veteran misses!
R4 Attack roll: 8 + 4 (ability) + 4 (prof) = 16 vs AC 17
R4 Miss!
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R5 impact enemy0→pc final10 HP84→74
R5 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R5 impact enemy0→pc final9 HP74→65
R5 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R5 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R5 impact pc→enemy0 final5 HP51→46
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R6 impact enemy0→pc final9 HP65→56
R6 Attack roll: 6 + 4 (ability) + 4 (prof) = 14 vs AC 17
R6 Miss!
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R7 impact enemy0→pc final8 HP56→48
R7 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R7 impact enemy0→pc final8 HP48→40
R7 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R7 💥 Hit! Rolled Damage: 4 + 4 (ability) = 8
R7 impact pc→enemy0 final8 HP46→38
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R8 ❌ Critical miss!
R8 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R8 ❌ Veteran misses!
R8 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R8 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R8 impact pc→enemy0 final9 HP38→29
R9 ⚔️ Veteran uses Multiattack!
R9 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R9 impact enemy0→pc final7 HP40→33
R9 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R9 impact enemy0→pc final9 HP33→24
R9 Attack roll: 12 + 4 (ability) + 4 (prof) = 20 vs AC 17
R9 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R9 impact pc→enemy0 final11 HP29→18
R10 ⚔️ Veteran uses Multiattack!
R10 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R10 ❌ Veteran misses!
R10 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R10 ⭐ Critical hit! Shortsword: 6 blood damage
R10 impact enemy0→pc final6 HP24→18
R10 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R10 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R10 impact pc→enemy0 final5 HP18→13
R11 ⚔️ Veteran uses Multiattack!
R11 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R11 ❌ Critical miss!
R11 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R11 impact enemy0→pc final4 HP18→14
R11 Attack roll: 20 + 4 (ability) + 4 (prof) = 28 vs AC 17
R11 ⭐ Critical hit!
R11 💥 Hit! Rolled Damage: 5 + 4 (crit) + 4 (ability) = 13
R11 impact pc→enemy0 final13 HP13→0
```

**loss**
```text
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R1 impact enemy0→pc final8 HP84→76
R1 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R1 💥 Critical miss!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R2 impact enemy0→pc final6 HP76→70
R2 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R2 ❌ Veteran misses!
R2 Attack roll: 2 + 4 (ability) + 4 (prof) = 10 vs AC 17
R2 Miss!
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R3 ⭐ Critical hit! Sword: 13 blood damage
R3 impact enemy0→pc final13 HP70→57
R3 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R3 ❌ Veteran misses!
R3 Attack roll: 5 + 4 (ability) + 4 (prof) = 13 vs AC 17
R3 Miss!
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final7 HP57→50
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final8 HP50→42
R4 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R4 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R4 impact pc→enemy0 final11 HP58→47
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R5 impact enemy0→pc final10 HP42→32
R5 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R5 impact enemy0→pc final6 HP32→26
R5 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R5 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R5 impact pc→enemy0 final12 HP47→35
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 13 + 5 = 18 vs AC 18
R6 impact enemy0→pc final10 HP26→16
R6 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R6 ⭐ Critical hit! Shortsword: 13 blood damage
R6 impact enemy0→pc final13 HP16→3
R6 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact pc→enemy0 final12 HP35→23
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R7 impact enemy0→pc final5 HP3→0
```

**extreme**
```text
R1 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R1 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R1 impact pc→enemy0 final6 HP58→52
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R1 ❌ Critical miss!
R2 Attack roll: 17 + 4 (ability) + 4 (prof) = 25 vs AC 17
R2 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R2 impact pc→enemy0 final5 HP52→47
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R2 ❌ Veteran misses!
R3 Attack roll: 12 + 4 (ability) + 4 (prof) = 20 vs AC 17
R3 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R3 impact pc→enemy0 final7 HP47→40
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R3 ❌ Veteran misses!
R4 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R4 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R4 impact pc→enemy0 final12 HP40→28
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R4 impact enemy0→pc final9 HP84→75
R5 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R5 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R5 impact pc→enemy0 final11 HP28→17
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R5 ❌ Veteran misses!
R5 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R5 ❌ Veteran misses!
R6 Attack roll: 18 + 4 (ability) + 4 (prof) = 26 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact pc→enemy0 final12 HP17→5
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R6 ❌ Veteran misses!
R7 Attack roll: 9 + 4 (ability) + 4 (prof) = 17 vs AC 17
R7 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R7 impact pc→enemy0 final10 HP5→0
```

### matchedType L10 bone premium70_70

**medianWin**
```text
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R1 ❌ Veteran misses!
R1 Attack roll: 6 + 4 (ability) + 4 (prof) = 14 vs AC 17
R1 Miss!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R2 ❌ Veteran misses!
R2 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R2 💥 Critical miss!
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R3 ❌ Veteran misses!
R3 Attack roll: 14 + 4 (ability) + 4 (prof) = 22 vs AC 17
R3 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R3 impact pc→enemy0 final7 HP58→51
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R4 ❌ Veteran misses!
R4 Attack roll: 8 + 4 (ability) + 4 (prof) = 16 vs AC 17
R4 Miss!
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R5 impact enemy0→pc final10 HP84→74
R5 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R5 impact enemy0→pc final9 HP74→65
R5 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R5 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R5 impact pc→enemy0 final5 HP51→46
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R6 impact enemy0→pc final9 HP65→56
R6 Attack roll: 6 + 4 (ability) + 4 (prof) = 14 vs AC 17
R6 Miss!
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R7 impact enemy0→pc final8 HP56→48
R7 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R7 impact enemy0→pc final8 HP48→40
R7 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R7 💥 Hit! Rolled Damage: 4 + 4 (ability) = 8
R7 impact pc→enemy0 final8 HP46→38
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R8 ❌ Critical miss!
R8 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R8 ❌ Veteran misses!
R8 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R8 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R8 impact pc→enemy0 final9 HP38→29
R9 ⚔️ Veteran uses Multiattack!
R9 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R9 impact enemy0→pc final7 HP40→33
R9 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R9 impact enemy0→pc final9 HP33→24
R9 Attack roll: 12 + 4 (ability) + 4 (prof) = 20 vs AC 17
R9 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R9 impact pc→enemy0 final11 HP29→18
R10 ⚔️ Veteran uses Multiattack!
R10 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R10 ❌ Veteran misses!
R10 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R10 ⭐ Critical hit! Shortsword: 6 blood damage
R10 impact enemy0→pc final6 HP24→18
R10 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R10 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R10 impact pc→enemy0 final5 HP18→13
R11 ⚔️ Veteran uses Multiattack!
R11 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R11 ❌ Critical miss!
R11 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R11 impact enemy0→pc final4 HP18→14
R11 Attack roll: 20 + 4 (ability) + 4 (prof) = 28 vs AC 17
R11 ⭐ Critical hit!
R11 💥 Hit! Rolled Damage: 5 + 4 (crit) + 4 (ability) = 13
R11 impact pc→enemy0 final13 HP13→0
```

**loss**
```text
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R1 impact enemy0→pc final8 HP84→76
R1 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R1 💥 Critical miss!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R2 impact enemy0→pc final6 HP76→70
R2 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R2 ❌ Veteran misses!
R2 Attack roll: 2 + 4 (ability) + 4 (prof) = 10 vs AC 17
R2 Miss!
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R3 ⭐ Critical hit! Sword: 13 blood damage
R3 impact enemy0→pc final13 HP70→57
R3 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R3 ❌ Veteran misses!
R3 Attack roll: 5 + 4 (ability) + 4 (prof) = 13 vs AC 17
R3 Miss!
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final7 HP57→50
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final8 HP50→42
R4 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R4 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R4 impact pc→enemy0 final11 HP58→47
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R5 impact enemy0→pc final10 HP42→32
R5 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R5 impact enemy0→pc final6 HP32→26
R5 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R5 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R5 impact pc→enemy0 final12 HP47→35
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 13 + 5 = 18 vs AC 18
R6 impact enemy0→pc final10 HP26→16
R6 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R6 ⭐ Critical hit! Shortsword: 13 blood damage
R6 impact enemy0→pc final13 HP16→3
R6 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact pc→enemy0 final12 HP35→23
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R7 impact enemy0→pc final5 HP3→0
```

**extreme**
```text
R1 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R1 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R1 impact pc→enemy0 final6 HP58→52
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R1 ❌ Critical miss!
R2 Attack roll: 17 + 4 (ability) + 4 (prof) = 25 vs AC 17
R2 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R2 impact pc→enemy0 final5 HP52→47
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R2 ❌ Veteran misses!
R3 Attack roll: 12 + 4 (ability) + 4 (prof) = 20 vs AC 17
R3 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R3 impact pc→enemy0 final7 HP47→40
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R3 ❌ Veteran misses!
R4 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R4 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R4 impact pc→enemy0 final12 HP40→28
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R4 impact enemy0→pc final9 HP84→75
R5 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R5 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R5 impact pc→enemy0 final11 HP28→17
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R5 ❌ Veteran misses!
R5 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R5 ❌ Veteran misses!
R6 Attack roll: 18 + 4 (ability) + 4 (prof) = 26 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact pc→enemy0 final12 HP17→5
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R6 ❌ Veteran misses!
R7 Attack roll: 9 + 4 (ability) + 4 (prof) = 17 vs AC 17
R7 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R7 impact pc→enemy0 final10 HP5→0
```

### matchedType L10 bone premium80_40

**medianWin**
```text
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R1 ❌ Veteran misses!
R1 Attack roll: 6 + 4 (ability) + 4 (prof) = 14 vs AC 17
R1 Miss!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R2 ❌ Veteran misses!
R2 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R2 💥 Critical miss!
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R3 ❌ Veteran misses!
R3 Attack roll: 14 + 4 (ability) + 4 (prof) = 22 vs AC 17
R3 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R3 impact pc→enemy0 final7 HP58→51
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R4 ❌ Veteran misses!
R4 Attack roll: 8 + 4 (ability) + 4 (prof) = 16 vs AC 17
R4 Miss!
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R5 impact enemy0→pc final10 HP84→74
R5 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R5 impact enemy0→pc final9 HP74→65
R5 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R5 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R5 impact pc→enemy0 final5 HP51→46
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R6 impact enemy0→pc final9 HP65→56
R6 Attack roll: 6 + 4 (ability) + 4 (prof) = 14 vs AC 17
R6 Miss!
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R7 impact enemy0→pc final8 HP56→48
R7 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R7 impact enemy0→pc final8 HP48→40
R7 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R7 💥 Hit! Rolled Damage: 4 + 4 (ability) = 8
R7 impact pc→enemy0 final8 HP46→38
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R8 ❌ Critical miss!
R8 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R8 ❌ Veteran misses!
R8 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R8 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R8 impact pc→enemy0 final9 HP38→29
R9 ⚔️ Veteran uses Multiattack!
R9 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R9 impact enemy0→pc final7 HP40→33
R9 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R9 impact enemy0→pc final9 HP33→24
R9 Attack roll: 12 + 4 (ability) + 4 (prof) = 20 vs AC 17
R9 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R9 impact pc→enemy0 final11 HP29→18
R10 ⚔️ Veteran uses Multiattack!
R10 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R10 ❌ Veteran misses!
R10 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R10 ⭐ Critical hit! Shortsword: 6 blood damage
R10 impact enemy0→pc final6 HP24→18
R10 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R10 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R10 impact pc→enemy0 final5 HP18→13
R11 ⚔️ Veteran uses Multiattack!
R11 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R11 ❌ Critical miss!
R11 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R11 impact enemy0→pc final4 HP18→14
R11 Attack roll: 20 + 4 (ability) + 4 (prof) = 28 vs AC 17
R11 ⭐ Critical hit!
R11 💥 Hit! Rolled Damage: 5 + 4 (crit) + 4 (ability) = 13
R11 impact pc→enemy0 final13 HP13→0
```

**loss**
```text
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R1 impact enemy0→pc final8 HP84→76
R1 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R1 💥 Critical miss!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R2 impact enemy0→pc final6 HP76→70
R2 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R2 ❌ Veteran misses!
R2 Attack roll: 2 + 4 (ability) + 4 (prof) = 10 vs AC 17
R2 Miss!
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R3 ⭐ Critical hit! Sword: 13 blood damage
R3 impact enemy0→pc final13 HP70→57
R3 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R3 ❌ Veteran misses!
R3 Attack roll: 5 + 4 (ability) + 4 (prof) = 13 vs AC 17
R3 Miss!
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final7 HP57→50
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final8 HP50→42
R4 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R4 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R4 impact pc→enemy0 final11 HP58→47
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R5 impact enemy0→pc final10 HP42→32
R5 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R5 impact enemy0→pc final6 HP32→26
R5 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R5 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R5 impact pc→enemy0 final12 HP47→35
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 13 + 5 = 18 vs AC 18
R6 impact enemy0→pc final10 HP26→16
R6 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R6 ⭐ Critical hit! Shortsword: 13 blood damage
R6 impact enemy0→pc final13 HP16→3
R6 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact pc→enemy0 final12 HP35→23
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R7 impact enemy0→pc final5 HP3→0
```

**extreme**
```text
R1 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R1 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R1 impact pc→enemy0 final6 HP58→52
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R1 ❌ Critical miss!
R2 Attack roll: 17 + 4 (ability) + 4 (prof) = 25 vs AC 17
R2 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R2 impact pc→enemy0 final5 HP52→47
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R2 ❌ Veteran misses!
R3 Attack roll: 12 + 4 (ability) + 4 (prof) = 20 vs AC 17
R3 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R3 impact pc→enemy0 final7 HP47→40
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R3 ❌ Veteran misses!
R4 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R4 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R4 impact pc→enemy0 final12 HP40→28
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R4 impact enemy0→pc final9 HP84→75
R5 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R5 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R5 impact pc→enemy0 final11 HP28→17
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R5 ❌ Veteran misses!
R5 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R5 ❌ Veteran misses!
R6 Attack roll: 18 + 4 (ability) + 4 (prof) = 26 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact pc→enemy0 final12 HP17→5
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R6 ❌ Veteran misses!
R7 Attack roll: 9 + 4 (ability) + 4 (prof) = 17 vs AC 17
R7 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R7 impact pc→enemy0 final10 HP5→0
```

### playerOnly L1 blood instant100

**medianWin**
```text
R1 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R1 💥 Hit! Rolled Damage: 2 + 2 (ability) = 4
R1 impact pc→enemy0 final4 HP22→18
R1 🎲 Gnoll rolls 19 + 4 = 23 vs AC 14
R1 impact enemy0→pc final6 HP12→6
R2 Attack roll: 14 + 2 (ability) + 2 (prof) = 18 vs AC 15
R2 💥 Hit! Rolled Damage: 5 + 2 (ability) = 7
R2 impact pc→enemy0 final7 HP18→11
R2 🎲 Gnoll rolls 7 + 4 = 11 vs AC 14
R2 ❌ Gnoll misses!
R3 Attack roll: 16 + 2 (ability) + 2 (prof) = 20 vs AC 15
R3 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R3 impact pc→enemy0 final9 HP11→2
R3 🎲 Gnoll rolls 2 + 4 = 6 vs AC 14
R3 ❌ Gnoll misses!
R4 Attack roll: 2 + 2 (ability) + 2 (prof) = 6 vs AC 15
R4 Miss!
R4 🎲 Gnoll rolls 17 + 4 = 21 vs AC 14
R4 impact enemy0→pc final5 HP6→1
R5 Attack roll: 11 + 2 (ability) + 2 (prof) = 15 vs AC 15
R5 💥 Hit! Rolled Damage: 8 + 2 (ability) = 10
R5 impact pc→enemy0 final10 HP2→0
```

**loss**
```text
R1 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R1 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R1 impact pc→enemy0 final9 HP22→13
R1 🎲 Gnoll rolls 20 + 4 = 24 vs AC 14
R1 ⭐ Critical hit! Bite: 10 blood damage
R1 impact enemy0→pc final10 HP12→2
R2 Attack roll: 10 + 2 (ability) + 2 (prof) = 14 vs AC 15
R2 Miss!
R2 🎲 Gnoll rolls 13 + 4 = 17 vs AC 14
R2 impact enemy0→pc final5 HP2→0
```

**extreme**
```text
R1 Attack roll: 14 + 2 (ability) + 2 (prof) = 18 vs AC 15
R1 💥 Hit! Rolled Damage: 2 + 2 (ability) = 4
R1 impact pc→enemy0 final4 HP22→18
R1 🎲 Gnoll rolls 9 + 4 = 13 vs AC 14
R1 ❌ Gnoll misses!
R2 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R2 ⭐ Critical hit!
R2 💥 Hit! Rolled Damage: 8 + 7 (crit) + 2 (ability) = 17
R2 impact pc→enemy0 final17 HP18→1
R2 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R2 ❌ Gnoll misses!
R3 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R3 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R3 impact pc→enemy0 final6 HP1→0
```

### playerOnly L1 blood premium70_70

**medianWin**
```text
R1 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R1 💥 Hit! Rolled Damage: 8 + 2 (ability) = 10
R1 impact pc→enemy0 final7 HP22→15
R1 tick scheduler→enemy0 final2.334 HP15→12.666
R1 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R1 ❌ Gnoll misses!
R2 Attack roll: 11 + 2 (ability) + 2 (prof) = 15 vs AC 15
R2 💥 Hit! Rolled Damage: 3 + 2 (ability) = 5
R2 impact pc→enemy0 final3.5 HP12.666→9.166
R2 tick scheduler→enemy0 final3.5 HP9.166→5.666
R2 🎲 Gnoll rolls 10 + 4 = 14 vs AC 14
R2 impact enemy0→pc final5 HP12→7
R3 Attack roll: 10 + 2 (ability) + 2 (prof) = 14 vs AC 15
R3 Miss!
R3 tick scheduler→enemy0 final3.5 HP5.666→2.166
R3 🎲 Gnoll rolls 3 + 4 = 7 vs AC 14
R3 ❌ Gnoll misses!
R4 Attack roll: 18 + 2 (ability) + 2 (prof) = 22 vs AC 15
R4 💥 Hit! Rolled Damage: 1 + 2 (ability) = 3
R4 impact pc→enemy0 final2.1 HP2.166→0.066
R4 tick scheduler→enemy0 final1.866 HP0.066→0
```

**loss**
```text
R1 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R1 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R1 impact pc→enemy0 final6.3 HP22→15.7
R1 tick scheduler→enemy0 final2.1 HP15.7→13.6
R1 🎲 Gnoll rolls 20 + 4 = 24 vs AC 14
R1 ⭐ Critical hit! Bite: 10 blood damage
R1 impact enemy0→pc final10 HP12→2
R2 Attack roll: 10 + 2 (ability) + 2 (prof) = 14 vs AC 15
R2 Miss!
R2 tick scheduler→enemy0 final2.1 HP13.6→11.5
R2 🎲 Gnoll rolls 13 + 4 = 17 vs AC 14
R2 impact enemy0→pc final5 HP2→0
```

**extreme**
```text
R1 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R1 ⭐ Critical hit!
R1 💥 Hit! Rolled Damage: 7 + 3 (crit) + 2 (ability) = 12
R1 impact pc→enemy0 final8.4 HP22→13.6
R1 tick scheduler→enemy0 final2.8 HP13.6→10.8
R1 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R1 ❌ Gnoll misses!
R2 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R2 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R2 impact pc→enemy0 final6.3 HP10.8→4.5
R2 tick scheduler→enemy0 final4.9 HP4.5→0
```

### playerOnly L1 blood premium84_56

**medianWin**
```text
R1 🎲 Gnoll rolls 8 + 4 = 12 vs AC 14
R1 ❌ Gnoll misses!
R1 Attack roll: 11 + 2 (ability) + 2 (prof) = 15 vs AC 15
R1 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R1 impact pc→enemy0 final5.04 HP22→16.96
R2 tick scheduler→enemy0 final1.12 HP16.96→15.84
R2 🎲 Gnoll rolls 3 + 4 = 7 vs AC 14
R2 ❌ Gnoll misses!
R2 Attack roll: 15 + 2 (ability) + 2 (prof) = 19 vs AC 15
R2 💥 Hit! Rolled Damage: 5 + 2 (ability) = 7
R2 impact pc→enemy0 final5.88 HP15.84→9.96
R3 tick scheduler→enemy0 final2.427 HP9.96→7.533
R3 🎲 Gnoll rolls 9 + 4 = 13 vs AC 14
R3 ❌ Gnoll misses!
R3 Attack roll: 10 + 2 (ability) + 2 (prof) = 14 vs AC 15
R3 Miss!
R4 tick scheduler→enemy0 final2.427 HP7.533→5.106
R4 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R4 ❌ Gnoll misses!
R4 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R4 💥 Hit! Rolled Damage: 3 + 2 (ability) = 5
R4 impact pc→enemy0 final4.2 HP5.106→0.906
R5 tick scheduler→enemy0 final2.24 HP0.906→0
```

**loss**
```text
R1 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R1 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R1 impact pc→enemy0 final7.56 HP22→14.44
R1 tick scheduler→enemy0 final1.68 HP14.44→12.76
R1 🎲 Gnoll rolls 20 + 4 = 24 vs AC 14
R1 ⭐ Critical hit! Bite: 10 blood damage
R1 impact enemy0→pc final10 HP12→2
R2 Attack roll: 10 + 2 (ability) + 2 (prof) = 14 vs AC 15
R2 Miss!
R2 tick scheduler→enemy0 final1.68 HP12.76→11.08
R2 🎲 Gnoll rolls 13 + 4 = 17 vs AC 14
R2 impact enemy0→pc final5 HP2→0
```

**extreme**
```text
R1 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R1 ⭐ Critical hit!
R1 💥 Hit! Rolled Damage: 7 + 3 (crit) + 2 (ability) = 12
R1 impact pc→enemy0 final10.08 HP22→11.92
R1 tick scheduler→enemy0 final2.24 HP11.92→9.68
R1 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R1 ❌ Gnoll misses!
R2 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R2 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R2 impact pc→enemy0 final7.56 HP9.68→2.12
R2 tick scheduler→enemy0 final3.92 HP2.12→0
```

### halfHP L1 blood instant100

**medianWin**
```text
R1 🎲 Gnoll rolls 4 + 4 = 8 vs AC 14
R1 ❌ Gnoll misses!
R1 Attack roll: 6 + 2 (ability) + 2 (prof) = 10 vs AC 15
R1 Miss!
R2 🎲 Gnoll rolls 7 + 4 = 11 vs AC 14
R2 ❌ Gnoll misses!
R2 Attack roll: 13 + 2 (ability) + 2 (prof) = 17 vs AC 15
R2 💥 Hit! Rolled Damage: 2 + 2 (ability) = 4
R2 impact pc→enemy0 final4 HP22→18
R3 🎲 Gnoll rolls 1 + 4 = 5 vs AC 14
R3 ❌ Critical miss!
R3 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R3 💥 Hit! Rolled Damage: 6 + 2 (ability) = 8
R3 impact pc→enemy0 final8 HP18→10
R4 🎲 Gnoll rolls 16 + 4 = 20 vs AC 14
R4 impact enemy0→pc final4 HP6→2
R4 Attack roll: 14 + 2 (ability) + 2 (prof) = 18 vs AC 15
R4 💥 Hit! Rolled Damage: 8 + 2 (ability) = 10
R4 impact pc→enemy0 final10 HP10→0
```

**loss**
```text
R1 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R1 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R1 impact pc→enemy0 final9 HP22→13
R1 🎲 Gnoll rolls 18 + 4 = 22 vs AC 14
R1 impact enemy0→pc final6 HP6→0
```

**extreme**
```text
R1 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R1 ❌ Gnoll misses!
R1 Attack roll: 13 + 2 (ability) + 2 (prof) = 17 vs AC 15
R1 💥 Hit! Rolled Damage: 5 + 2 (ability) = 7
R1 impact pc→enemy0 final7 HP22→15
R2 🎲 Gnoll rolls 5 + 4 = 9 vs AC 14
R2 ❌ Gnoll misses!
R2 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R2 💥 Hit! Rolled Damage: 8 + 2 (ability) = 10
R2 impact pc→enemy0 final10 HP15→5
R3 🎲 Gnoll rolls 7 + 4 = 11 vs AC 14
R3 ❌ Gnoll misses!
R3 Attack roll: 16 + 2 (ability) + 2 (prof) = 20 vs AC 15
R3 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R3 impact pc→enemy0 final9 HP5→0
```

### halfHP L1 blood premium70_70

**medianWin**
```text
R1 🎲 Gnoll rolls 8 + 4 = 12 vs AC 14
R1 ❌ Gnoll misses!
R1 Attack roll: 11 + 2 (ability) + 2 (prof) = 15 vs AC 15
R1 💥 Hit! Rolled Damage: 8 + 2 (ability) = 10
R1 impact pc→enemy0 final7 HP22→15
R2 tick scheduler→enemy0 final2.334 HP15→12.666
R2 🎲 Gnoll rolls 12 + 4 = 16 vs AC 14
R2 impact enemy0→pc final2.1 HP6→3.9
R2 tick scheduler→pc final0.7 HP3.9→3.2
R2 Attack roll: 18 + 2 (ability) + 2 (prof) = 22 vs AC 15
R2 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R2 impact pc→enemy0 final6.3 HP12.666→6.366
R3 tick scheduler→enemy0 final4.433 HP6.366→1.933
R3 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R3 ❌ Gnoll misses!
R3 tick scheduler→pc final0.7 HP3.2→2.5
R3 Attack roll: 1 + 2 (ability) + 2 (prof) = 5 vs AC 15
R3 💥 Critical miss!
R4 tick scheduler→enemy0 final4.433 HP1.933→0
```

**loss**
```text
R1 Attack roll: 3 + 2 (ability) + 2 (prof) = 7 vs AC 15
R1 Miss!
R1 🎲 Gnoll rolls 20 + 4 = 24 vs AC 14
R1 ⭐ Critical hit! Bite: 8 blood damage
R1 impact enemy0→pc final5.6 HP6→0.4
R2 tick scheduler→pc final1.867 HP0.4→0
```

**extreme**
```text
R1 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R1 💥 Hit! Rolled Damage: 1 + 2 (ability) = 3
R1 impact pc→enemy0 final2.1 HP22→19.9
R1 tick scheduler→enemy0 final0.7 HP19.9→19.2
R1 🎲 Gnoll rolls 5 + 4 = 9 vs AC 14
R1 ❌ Gnoll misses!
R2 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R2 ⭐ Critical hit!
R2 💥 Hit! Rolled Damage: 2 + 7 (crit) + 2 (ability) = 11
R2 impact pc→enemy0 final7.7 HP19.2→11.5
R2 tick scheduler→enemy0 final3.267 HP11.5→8.233
R2 🎲 Gnoll rolls 5 + 4 = 9 vs AC 14
R2 ❌ Gnoll misses!
R3 Attack roll: 13 + 2 (ability) + 2 (prof) = 17 vs AC 15
R3 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R3 impact pc→enemy0 final4.2 HP8.233→4.033
R3 tick scheduler→enemy0 final4.667 HP4.033→0
```

### halfHP L1 blood premium84_56

**medianWin**
```text
R1 🎲 Gnoll rolls 8 + 4 = 12 vs AC 14
R1 ❌ Gnoll misses!
R1 Attack roll: 11 + 2 (ability) + 2 (prof) = 15 vs AC 15
R1 💥 Hit! Rolled Damage: 8 + 2 (ability) = 10
R1 impact pc→enemy0 final8.4 HP22→13.6
R2 tick scheduler→enemy0 final1.867 HP13.6→11.733
R2 🎲 Gnoll rolls 12 + 4 = 16 vs AC 14
R2 impact enemy0→pc final2.52 HP6→3.48
R2 tick scheduler→pc final0.56 HP3.48→2.92
R2 Attack roll: 18 + 2 (ability) + 2 (prof) = 22 vs AC 15
R2 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R2 impact pc→enemy0 final7.56 HP11.733→4.173
R3 tick scheduler→enemy0 final3.547 HP4.173→0.626
R3 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R3 ❌ Gnoll misses!
R3 tick scheduler→pc final0.56 HP2.92→2.36
R3 Attack roll: 1 + 2 (ability) + 2 (prof) = 5 vs AC 15
R3 💥 Critical miss!
R4 tick scheduler→enemy0 final3.546 HP0.626→0
```

**loss**
```text
R1 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R1 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R1 impact pc→enemy0 final7.56 HP22→14.44
R1 tick scheduler→enemy0 final1.68 HP14.44→12.76
R1 🎲 Gnoll rolls 18 + 4 = 22 vs AC 14
R1 impact enemy0→pc final5.04 HP6→0.96
R2 tick scheduler→pc final1.12 HP0.96→0
```

**extreme**
```text
R1 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R1 💥 Hit! Rolled Damage: 1 + 2 (ability) = 3
R1 impact pc→enemy0 final2.52 HP22→19.48
R1 tick scheduler→enemy0 final0.56 HP19.48→18.92
R1 🎲 Gnoll rolls 5 + 4 = 9 vs AC 14
R1 ❌ Gnoll misses!
R2 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R2 ⭐ Critical hit!
R2 💥 Hit! Rolled Damage: 2 + 7 (crit) + 2 (ability) = 11
R2 impact pc→enemy0 final9.24 HP18.92→9.68
R2 tick scheduler→enemy0 final2.614 HP9.68→7.066
R2 🎲 Gnoll rolls 5 + 4 = 9 vs AC 14
R2 ❌ Gnoll misses!
R3 Attack roll: 13 + 2 (ability) + 2 (prof) = 17 vs AC 15
R3 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R3 impact pc→enemy0 final5.04 HP7.066→2.026
R3 tick scheduler→enemy0 final3.733 HP2.026→0
```

## Source provenance

```json
{
  "src/core/rulesEngine.js": "5b640103393081979c6eea741926d8d149538bc898e899457783cf94ddc204b9",
  "src/systems/CombatManager.js": "82d0464a021d68a107239b97673804652f76d506ef8e9fc1ac144de87e61299a",
  "src/systems/Character.js": "39da47924b6ced9885091328659e6d9e7cab470bb8f5e10d0d5d2cbf6d951f9b",
  "src/systems/EffectDispatcher.js": "227c168da0bbf63ebbff8a924769c759746b85d449f4c340ae8674c5c39a48f9",
  "src/systems/DamageResolver.js": "a7700c620e0e8ec071de6fcdbc3ea415a7979a370fc7df59a1b1349bc8b6c4df",
  "src/utils/damagePrecision.js": "5cee5ad7c2a530158e598007776937a52d675a7c8d2ee30e7779f14f6aee4e7c"
}
```
