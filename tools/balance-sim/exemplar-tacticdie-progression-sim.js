/**
 * Exemplar tactic-die progression review (balance-engineer, 2026-08-07).
 *
 * IMPLEMENTATION STATUS (checked first, per project convention) — CORRECTS THE
 * REQUEST'S PREMISE:
 *   The request states the tactic die is "stuck at flat 1d6" and the
 *   1d6->1d8@7->1d10@10 table "has never been wired into live code." As of
 *   commit 4692fc7 ("Implement attribute remap, ADR-010 & combat updates"),
 *   already on this branch, that is NOT what the code shows:
 *     - src/systems/EffectDispatcher.js:441 `resolveTacticDieSides(character)`
 *       returns 6/8/10 by level (>=10 -> 10, >=7 -> 8, else 6) and is called
 *       by every tactic-die-consuming handler (onHitSaveOrCondition,
 *       onHitCondition, onHitPush, selfTempHP, allyTempHP,
 *       precisionAttackBonus, reactionAttack, reactionDamageReduction).
 *     - src/systems/Character.js:299 `getTacticDie()` has the identical
 *       6/8/10-by-level table.
 *     - src/systems/CombatManager.js:1119 (Precision Strike's beforeAttack
 *       path) calls `attacker.character.getTacticDie?.()`.
 *   All three match data/levelProgression.json's specializationFeatures.
 *   exemplar.tacticDie table (1d6 @1, 1d8 @7, 1d10 @10) exactly. The scaling
 *   IS live, on both code paths (Character.js's method and EffectDispatcher's
 *   parallel free function), and matches data. This harness treats "LIVE" as
 *   already-scaled and adds a "FROZEN" 1d6-flat variant as the counterfactual
 *   the request actually wanted compared against, plus alternative candidate
 *   progressions.
 *
 *   Also corrects the request's claim about the prior Oath balance-pass
 *   memory: `tools/balance-sim/oath-locked-spec-vs-exemplar-sim.js`'s
 *   `maneuverDieSides(level)` (line 119, quoted in this file's LIVE
 *   progression below) ALREADY modeled the scaled 1d6/1d8/1d10 table, not a
 *   frozen 1d6. The prior finding ("Sworn Strike out-DPRs Exemplar by +1.4 at
 *   L3 growing to +4.6-4.7 by L9/10") already reflects scaled tactic die, not
 *   a pre-fix state. See .claude/agent-memory/balance-engineer/
 *   project_oath_locked_spec_balance_pass.md finding #2 for the mechanism:
 *   the gap is structurally driven by Exemplar's resolve-spend rate being
 *   capped by attacksPerRound (1 pre-L5, 2 from L5) while Sworn Strike's
 *   spend cap is a flat 3/turn regardless of attack count — resolveMax
 *   (con_mod + level) outgrows what Exemplar can spend in a fixed-round fight
 *   well before it outgrows what Oath can spend. Tactic die SIZE increases
 *   DPR-per-use but cannot fix an unspent-resolve problem; this harness
 *   quantifies how much of the gap size alone can close, and flags the
 *   remainder as out of scope for a die-size-only fix (matches the prior
 *   memory's own "out of scope for this pass" carve-out for Sworn Strike's
 *   cap).
 *
 * Method: Monte Carlo for damage/win-rate (unseeded combat rolls are a
 * deliberate ADR exemption, see .claude/rules/architecture.md), exact
 * enumeration for Precision Strike's hit-chance table (20 x dieSides outcomes
 * — small enough to enumerate exactly rather than sample). N=2000/cell for
 * DPR-only numeric means (cheap, tighter CI than the project's win-rate
 * baseline), N=500/cell for win-rate/survival (matches established project
 * baseline per MEMORY.md).
 *
 * Player build, monster table, Sworn Strike math, resolveMax formula: reused
 * verbatim from oath-locked-spec-vs-exemplar-sim.js for continuity (same
 * convention that file itself followed from its own predecessors). L1 entry
 * added (goblin, hand-adjusted stats in the same style as the reused L3-L10
 * rows — approximate, not raw monsters.json, matching this table's existing
 * convention of round, sim-friendly numbers rather than literal statblocks).
 */
import { attackRoll, damageRoll } from '../../src/utils/dice.js';
import { getProficiencyBonus } from '../../src/core/rulesEngine.js';

const N_DPR = 2000;
const N_WIN = 500;

const STR_SCORE = { 1: 16, 3: 18, 5: 18, 7: 20, 9: 20, 10: 20 };
const CON_SCORE = { 1: 14, 3: 14, 5: 16, 7: 16, 9: 18, 10: 19 };
const mod = (score) => Math.floor((score - 10) / 2);

function ciFor(p, n) {
  const margin = 1.96 * Math.sqrt((p * (1 - p)) / n);
  return `${(p * 100).toFixed(1)}% +/- ${(margin * 100).toFixed(1)}pp`;
}
function meanCI(arr) {
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  const sd = Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
  return { mean: m, margin: 1.96 * (sd / Math.sqrt(arr.length)) };
}
function notDistinguishable(aMean, aMargin, bMean, bMargin) {
  return Math.abs(aMean - bMean) < aMargin + bMargin;
}

// Safe (non-NaN-ability) monsters only, per
// .claude/agent-memory/balance-engineer/reference_monsters_abilities_nan_bug.md
const MONSTERS = {
  1: { name: 'goblin', ac: 15, atkBonus: 4, dmg: '1d6+2', attacksPerRound: 1, hp: 7 },
  3: { name: 'giantSpider', ac: 14, atkBonus: 5, dmg: '1d8+3', attacksPerRound: 1, hp: 26 },
  5: { name: 'berserker', ac: 13, atkBonus: 5, dmg: '1d12+3', attacksPerRound: 1, hp: 58 },
  7: { name: 'veteran', ac: 17, atkBonus: 5, dmg: '1d8+3', attacksPerRound: 2, hp: 58 },
  9: { name: 'veteran', ac: 17, atkBonus: 5, dmg: '1d8+3', attacksPerRound: 2, hp: 58 },
  10: { name: 'voidTitan', ac: 17, atkBonus: 11, dmg: '3d10+6', attacksPerRound: 2, hp: 204 },
};
const LEVELS = [1, 3, 5, 7, 9, 10];
const PLAYER_AC = 16;
const SWORN_CAP = 3;

function resolveMax(level) { const con = CON_SCORE[level] ?? 14; return Math.max(1, mod(con) + level); }
function playerHP(level) {
  let hp = 10 + mod(CON_SCORE[1] ?? 14);
  for (let l = 2; l <= level; l++) {
    const con = CON_SCORE[l] ?? CON_SCORE[Math.max(...Object.keys(CON_SCORE).map(Number).filter((k) => k <= l))] ?? 14;
    hp += 6 + mod(con);
  }
  return hp;
}
function attackBonusFor(level) { return getProficiencyBonus(level) + mod(STR_SCORE[level] ?? 20); }

// ============================================================
// Tactic die progression candidates
// ============================================================
// [minLevel, sides] breakpoints, evaluated highest-applicable-<=-level.
const PROGRESSIONS = {
  FROZEN:      [[1, 6]],                                   // counterfactual: never fixed
  LIVE:        [[1, 6], [7, 8], [10, 10]],                  // current data/levelProgression.json + wired code
  EARLY_STEP:  [[1, 6], [5, 8], [9, 10]],                   // step at Extra Attack (L5) / L9 instead of L7/L10
  THREE_STEP:  [[1, 6], [5, 8], [7, 10], [10, 12]],          // extra step + bigger cap die
  AGGRESSIVE:  [[1, 8], [5, 10], [9, 12]],                   // upper-bound overcorrect case
  LIVE_PLUS:   [[1, 6], [7, 8], [10, 12]],                   // same breakpoints as LIVE, higher L10 cap
  EARLY_PLUS:  [[1, 6], [5, 8], [9, 12]],                    // EARLY_STEP breakpoints, higher L9+ cap
  TOP_HEAVY:   [[1, 6], [7, 8], [9, 10], [10, 12]],          // LIVE's L1/L7 breakpoints unchanged, extra steps concentrated at L9-L10 where the gap was worst
};
function diceSidesFor(level, table) {
  let sides = table[0][1];
  for (const [lvl, s] of table) if (level >= lvl) sides = s;
  return sides;
}

// ============================================================
// EXEMPLAR generic on-hit tactic (Trip/Menacing/Disarming-Attack shape:
// weapon damage + tactic die once/attack if resolve available, Vanguard's
// Charge +1d4 on the fight's first hit only). Reused verbatim from
// oath-locked-spec-vs-exemplar-sim.js's simExemplarDPR/Survival.
// ============================================================
function simExemplarDPR(level, table) {
  const attackBonus = attackBonusFor(level);
  const strMod = mod(STR_SCORE[level] ?? 20);
  const numAttacks = level >= 5 ? 2 : 1;
  const dieSides = diceSidesFor(level, table);
  const target = MONSTERS[level];
  let totalDamage = 0, resolve = resolveMax(level), engaged = false;
  for (let round = 0; round < 5; round++) {
    for (let a = 0; a < numAttacks; a++) {
      const vanguardActive = !engaged;
      const atk = attackRoll(attackBonus + (vanguardActive ? 1 : 0), target.ac);
      engaged = true;
      if (atk.hit) {
        let dmg = damageRoll(`1d8+${strMod}`, atk.critical).total;
        if (vanguardActive) dmg += damageRoll('1d4', false).total;
        if (resolve > 0) { resolve -= 1; dmg += damageRoll(`1d${dieSides}`, atk.critical).total; }
        totalDamage += dmg;
      }
    }
  }
  return totalDamage;
}

function simExemplarSurvival(level, monsterCount, table, targetOverride) {
  const attackBonus = attackBonusFor(level);
  const strMod = mod(STR_SCORE[level] ?? 20);
  const numAttacks = level >= 5 ? 2 : 1;
  const dieSides = diceSidesFor(level, table);
  const target = targetOverride || MONSTERS[level];
  let hp = playerHP(level), resolve = resolveMax(level), engaged = false;
  let monsterHPs = Array(monsterCount).fill(target.hp);
  const trace = [];
  let round = 0;
  while (hp > 0 && monsterHPs.some((h) => h > 0) && round < 20) {
    round++;
    for (let a = 0; a < numAttacks; a++) {
      const idx = monsterHPs.findIndex((h) => h > 0);
      if (idx === -1) break;
      const vanguardActive = !engaged;
      const atk = attackRoll(attackBonus + (vanguardActive ? 1 : 0), target.ac);
      engaged = true;
      if (atk.hit) {
        let dmg = damageRoll(`1d8+${strMod}`, atk.critical).total;
        if (vanguardActive) dmg += damageRoll('1d4', false).total;
        if (resolve > 0) { resolve -= 1; dmg += damageRoll(`1d${dieSides}`, atk.critical).total; }
        monsterHPs[idx] -= dmg;
        trace.push(`R${round}: Exemplar hits ${target.name} for ${dmg} (d${dieSides} tactic${resolve >= 0 ? '' : ''}) [enemy hp ${Math.max(monsterHPs[idx], 0)}]`);
      } else {
        trace.push(`R${round}: Exemplar misses (roll ${atk.total} vs AC ${target.ac})`);
      }
    }
    if (monsterHPs.every((h) => h <= 0)) break;
    for (let m = 0; m < monsterHPs.length; m++) {
      if (monsterHPs[m] <= 0) continue;
      for (let a = 0; a < target.attacksPerRound; a++) {
        if (hp <= 0) break;
        const atk = attackRoll(target.atkBonus, PLAYER_AC);
        if (atk.hit) { const dmg = damageRoll(target.dmg, atk.critical).total; hp -= dmg; trace.push(`R${round}: ${target.name} hits for ${dmg} (hp ${Math.max(hp, 0)})`); }
      }
    }
  }
  return { won: monsterHPs.every((h) => h <= 0) && hp > 0, rounds: round, trace, hp };
}

// ============================================================
// OATH — Sworn Strike (live math, unchanged, flat cap-3 spend). Reused
// verbatim from oath-locked-spec-vs-exemplar-sim.js.
// ============================================================
function swornStrikeSpend(resolve, roundsLeft) {
  return Math.max(1, Math.min(SWORN_CAP, resolve, Math.ceil(resolve / roundsLeft)));
}
function simOathDPR(level) {
  const attackBonus = attackBonusFor(level);
  const strMod = mod(STR_SCORE[level] ?? 20);
  const numAttacks = level >= 5 ? 2 : 1;
  const target = MONSTERS[level];
  let totalDamage = 0, resolve = resolveMax(level);
  for (let round = 0; round < 5; round++) {
    let used = false;
    for (let a = 0; a < numAttacks; a++) {
      const atk = attackRoll(attackBonus, target.ac);
      if (atk.hit) {
        let dmg = damageRoll(`1d8+${strMod}`, atk.critical).total;
        if (!used && resolve > 0) {
          const spend = swornStrikeSpend(resolve, 5 - round);
          resolve -= spend;
          for (let i = 0; i < spend; i++) dmg += damageRoll('1d8', atk.critical).total;
          used = true;
        }
        totalDamage += dmg;
      }
    }
  }
  return totalDamage;
}
function simOathSurvival(level, monsterCount, targetOverride) {
  const attackBonus = attackBonusFor(level);
  const strMod = mod(STR_SCORE[level] ?? 20);
  const numAttacks = level >= 5 ? 2 : 1;
  const target = targetOverride || MONSTERS[level];
  let hp = playerHP(level), resolve = resolveMax(level);
  let monsterHPs = Array(monsterCount).fill(target.hp);
  const trace = [];
  let round = 0;
  while (hp > 0 && monsterHPs.some((h) => h > 0) && round < 20) {
    round++;
    let used = false;
    for (let a = 0; a < numAttacks; a++) {
      const idx = monsterHPs.findIndex((h) => h > 0);
      if (idx === -1) break;
      const atk = attackRoll(attackBonus, target.ac);
      if (atk.hit) {
        let dmg = damageRoll(`1d8+${strMod}`, atk.critical).total;
        if (!used && resolve > 0) {
          const spend = swornStrikeSpend(resolve, 5);
          resolve -= spend;
          for (let i = 0; i < spend; i++) dmg += damageRoll('1d8', atk.critical).total;
          used = true;
        }
        monsterHPs[idx] -= dmg;
        trace.push(`R${round}: Oath hits ${target.name} for ${dmg} (Sworn Strike spend) [enemy hp ${Math.max(monsterHPs[idx], 0)}]`);
      } else {
        trace.push(`R${round}: Oath misses (roll ${atk.total} vs AC ${target.ac})`);
      }
    }
    if (monsterHPs.every((h) => h <= 0)) break;
    for (let m = 0; m < monsterHPs.length; m++) {
      if (monsterHPs[m] <= 0) continue;
      for (let a = 0; a < target.attacksPerRound; a++) {
        if (hp <= 0) break;
        const atk = attackRoll(target.atkBonus, PLAYER_AC);
        if (atk.hit) { const dmg = damageRoll(target.dmg, atk.critical).total; hp -= dmg; trace.push(`R${round}: ${target.name} hits for ${dmg} (hp ${Math.max(hp, 0)})`); }
      }
    }
  }
  return { won: monsterHPs.every((h) => h <= 0) && hp > 0, rounds: round, trace, hp };
}

// ============================================================
// 1. DPR: Exemplar under each progression candidate vs Oath baseline
// ============================================================
console.log('=== 1. DPR (5-round punching bag), N=%d — Exemplar per progression vs Oath (Sworn Strike, unchanged) ===\n', N_DPR);
const dprResults = {}; // [progName][level] = {mean, margin}
for (const progName of Object.keys(PROGRESSIONS)) {
  dprResults[progName] = {};
  for (const level of LEVELS) {
    const arr = [];
    for (let i = 0; i < N_DPR; i++) arr.push(simExemplarDPR(level, PROGRESSIONS[progName]) / 5);
    dprResults[progName][level] = meanCI(arr);
  }
}
const oathDPR = {};
for (const level of LEVELS) {
  const arr = [];
  for (let i = 0; i < N_DPR; i++) arr.push(simOathDPR(level) / 5);
  oathDPR[level] = meanCI(arr);
}
console.log('Lvl | Oath DPR (95% CI) | ' + Object.keys(PROGRESSIONS).map((p) => p.padEnd(22)).join(' | '));
for (const level of LEVELS) {
  const o = oathDPR[level];
  const row = Object.keys(PROGRESSIONS).map((p) => {
    const e = dprResults[p][level];
    const delta = e.mean - o.mean;
    const nd = notDistinguishable(e.mean, e.margin, o.mean, o.margin);
    return `${e.mean.toFixed(1)}+/-${e.margin.toFixed(1)} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)}${nd ? '~' : ''})`.padEnd(22);
  }).join(' | ');
  console.log(`L${level.toString().padEnd(2)} | ${o.mean.toFixed(1).padStart(5)}+/-${o.margin.toFixed(1).padEnd(9)} | ${row}`);
}
console.log('(delta = Exemplar - Oath DPR; "~" = not statistically distinguishable at this N, i.e. within combined margins)\n');

// ============================================================
// 2. Precision Strike accuracy sanity check — EXACT enumeration
// (20 x dieSides outcomes; no need to sample this one).
// ============================================================
function hitChanceBase(attackBonus, ac) {
  let hits = 0;
  for (let d20 = 1; d20 <= 20; d20++) { const t = d20 + attackBonus; if (d20 === 20 || t >= ac) hits++; }
  return hits / 20;
}
function hitChanceWithTacticBonus(attackBonus, ac, dieSides) {
  let hits = 0, total = 0;
  for (let d20 = 1; d20 <= 20; d20++) {
    for (let die = 1; die <= dieSides; die++) {
      total++;
      const t = d20 + attackBonus + die;
      if (d20 === 20 || t >= ac) hits++;
    }
  }
  return hits / total;
}
console.log('=== 2. Precision Strike accuracy sanity check (exact enumeration, not damage) ===\n');
console.log('Lvl | Monster AC | No-tactic hit% | d6 hit% (+delta) | d8 hit% (+delta) | d10 hit% (+delta) | d12 hit% (+delta)');
for (const level of LEVELS) {
  const attackBonus = attackBonusFor(level);
  const ac = MONSTERS[level].ac;
  const base = hitChanceBase(attackBonus, ac);
  const sides = [6, 8, 10, 12].map((s) => {
    const h = hitChanceWithTacticBonus(attackBonus, ac, s);
    return `${(h * 100).toFixed(1)}% (+${((h - base) * 100).toFixed(1)}pp)`.padEnd(18);
  });
  console.log(`L${level.toString().padEnd(2)} | AC ${ac.toString().padEnd(8)} | ${(base * 100).toFixed(1)}%`.padEnd(35) + sides.join(' | '));
}
console.log('\n(Precision Strike is resolve-gated and declared pre-roll, mutually exclusive with per-attack on-hit tactics — a hit-chance ceiling matters here, not raw magnitude: watch for any cell approaching ~95%+, which would make the accuracy decision a no-brainer independent of resource cost.)\n');

// ============================================================
// 3. Full win-rate: LIVE progression vs Oath, L7/L9/L10, favorable+unfavorable
// ============================================================
console.log('=== 3. Solo survival win rate, N=%d — Exemplar (LIVE vs THREE_STEP candidate) vs Oath, L7/L9/L10 ===\n', N_WIN);
const traceStash = {};
for (const progName of ['LIVE', 'THREE_STEP', 'TOP_HEAVY']) {
  console.log(`-- Exemplar progression: ${progName} --`);
  console.log('Lvl  | Encounter          | Exemplar win rate              | Oath win rate                  | Delta        | Distinguishable?');
  for (const level of [7, 9, 10]) {
    for (const [label, count] of [['1x (favorable)', 1], ['2x (unfavorable)', 2]]) {
      // L10 native pool (voidTitan) saturates every build at 0% regardless of build (see
      // .claude/agent-memory/balance-engineer/project_oath_locked_spec_balance_pass.md
      // method note) — substitute L7/L9's veteran for a survivable L10 read, matching the
      // established substitution pattern in this directory.
      const targetOverride = level === 10 ? MONSTERS[7] : null;
      const lvlLabel = level === 10 ? 'L10*' : `L${level}`;
      let exWins = 0, oaWins = 0;
      const exTraces = [], oaTraces = [];
      for (let i = 0; i < N_WIN; i++) {
        const e = simExemplarSurvival(level, count, PROGRESSIONS[progName], targetOverride); if (e.won) exWins++; exTraces.push(e);
        const o = simOathSurvival(level, count, targetOverride); if (o.won) oaWins++; oaTraces.push(o);
      }
      const pe = exWins / N_WIN, po = oaWins / N_WIN;
      const marginE = 1.96 * Math.sqrt((pe * (1 - pe)) / N_WIN), marginO = 1.96 * Math.sqrt((po * (1 - po)) / N_WIN);
      const delta = (pe - po) * 100;
      const nd = Math.abs(pe - po) < marginE + marginO;
      console.log(`${lvlLabel.padEnd(4)} | ${label.padEnd(18)} | ${ciFor(pe, N_WIN).padEnd(31)} | ${ciFor(po, N_WIN).padEnd(30)} | ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}pp      | ${nd ? 'YES (noise)' : 'no — real'}`);
      if (progName === 'LIVE') traceStash[`${lvlLabel}_${count}`] = { exTraces, oaTraces };
    }
  }
  console.log('');
}

// ============================================================
// 4. Representative traces (chosen by outcome, not random) — L9 unfavorable
// (the cell most load-bearing for the verdict) and L7 favorable.
// ============================================================
console.log('\n=== 4. Representative traces ===\n');
function printTraceSet(label, traces) {
  const wins = traces.filter((t) => t.won).sort((a, b) => a.rounds - b.rounds);
  const losses = traces.filter((t) => !t.won);
  const median = wins[Math.floor(wins.length / 2)];
  const extreme = [...traces].sort((a, b) => (b.hp - a.hp))[0]; // largest final-HP margin
  console.log(`-- ${label} --`);
  if (median) console.log(`  Median-length win (${median.rounds} rounds, final hp ${median.hp}):`, median.trace.slice(0, 6).join(' | '));
  if (losses[0]) console.log(`  Loss sample:`, losses[0].trace.slice(-6).join(' | '));
  if (extreme) console.log(`  Most extreme margin (final hp ${extreme.hp}, won=${extreme.won}):`, extreme.trace.slice(0, 4).join(' | '));
  console.log('');
}
printTraceSet('L9 unfavorable (2x veteran) — Exemplar LIVE', traceStash['L9_2'].exTraces);
printTraceSet('L9 unfavorable (2x veteran) — Oath', traceStash['L9_2'].oaTraces);
printTraceSet('L7 favorable (1x veteran) — Exemplar LIVE', traceStash['L7_1'].exTraces);
printTraceSet('L7 favorable (1x veteran) — Oath', traceStash['L7_1'].oaTraces);

console.log('Done.');
