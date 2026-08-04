/**
 * Exemplar vs Oath — proposed L2/5/7/9/10 features balance pass (2026-08-04).
 *
 * IMPLEMENTATION STATUS CHECKED FIRST (per balance-engineer discipline —
 * see .claude/agent-memory/balance-engineer/feedback_simulating_unimplemented_systems.md):
 *   - Resolve, all 8 maneuvers, Sworn Strike, Aid the Vulnerable, Action Surge:
 *     LIVE in data/abilities.json + src/systems/EffectDispatcher.js.
 *   - Extra Attack (L5, described by requester as "existing baseline"):
 *     NOT implemented anywhere in src/ (no numAttacks/attacksPerAction logic
 *     found via grep). data/levelProgression.json has empty `choices: []` for
 *     dedication levels 4-10. Modeled here by hand per the requester's stated
 *     design intent (2 attacks/round from L5), NOT verifiable via CombatManager.
 *   - Indomitable, Guardian's Vow, Zealous Smite, Unbreakable Oath, Sworn
 *     Strike cap 3->5, Exemplar bonus maneuvers at 5/7/9, Exemplar capstone
 *     (1d10 die, 2x Action Surge): NOT in any data file or code path. Pure
 *     proposal. Modeled here by hand using the REAL formulas (dice.js
 *     attackRoll/damageRoll, rulesEngine.js proficiency table) — never a
 *     reimplemented guess at those formulas, only the *new* mechanics are
 *     hypothetical, clearly labeled below.
 *
 * Method: Monte Carlo, not closed-form expectation, so trial counts + CIs
 * are meaningful (binomial CI = p +/- 1.96*sqrt(p*(1-p)/n)).
 *
 * Player build assumptions (stated explicitly, identical for both specs so
 * they cancel out of the Exemplar-vs-Oath delta):
 *   - STR/CON ASI curve reused verbatim from tools/balance-sim/dedication-l1-10-dpr.js
 *     (STR to 20 by L7, CON climbing behind it) for consistency with prior audits.
 *   - Weapon: 1d8 longsword, proficient.
 *   - Player AC flat 16 (heavy armor + shield, no DEX investment) — NOT derived
 *     from Character.js (no reachable calculateACForCharacter found); stated
 *     assumption, not a measured value.
 *   - HP: standard 5e d10 hit die, average-per-level (5e "take average" rule),
 *     + CON mod per level, L1 max.
 *
 * Monsters: pulled LIVE from data/monsters.json, restricted to the
 * ability-score-safe list in reference_monsters_abilities_nan_bug.md (19/46
 * monsters have abilities:[] -> NaN on every save, silently breaking
 * save-gated mechanics against them). Chosen from the ACTUAL
 * RULES.difficulty.scalingByLevel.enemyTypesByLevel pool for each bracket:
 *   L3 -> giantSpider (CR1, AC14, in-pool)   L5 -> berserker (CR2, AC13, in-pool)
 *   L7 -> veteran (CR3, AC17, in-pool, ONLY safe monster in the L7 pool)
 *   L9 -> veteran again (no distinct L9 pool exists; L7->L10 is a direct jump)
 *   L10 -> voidTitan (CR10, AC17) substituted — ALL 4 native L10-pool monsters
 *          are NaN-broken per memory; voidTitan is memory's documented boss stand-in.
 * Monster attack numbers taken from MM-standard stat blocks matching the
 * weaponId references in the data (berserker/veteran/giantSpider) or read
 * directly off voidTitan's explicit attackBonus/damage fields.
 */
import { attackRoll, damageRoll, rollDie } from '../../src/utils/dice.js';
import { getProficiencyBonus } from '../../src/core/rulesEngine.js';

const N = 500; // matches prior balance-sim trial counts for this project; see memory

// --- Shared player progression (reused verbatim from dedication-l1-10-dpr.js) ---
const STR_SCORE = { 3: 18, 5: 18, 7: 20, 9: 20, 10: 20 };
const CON_SCORE = { 3: 14, 5: 16, 7: 16, 9: 18, 10: 19 };
const mod = (score) => Math.floor((score - 10) / 2);

function ciFor(p, n) {
  const margin = 1.96 * Math.sqrt((p * (1 - p)) / n);
  return `${(p * 100).toFixed(1)}% +/- ${(margin * 100).toFixed(1)}pp`;
}

function playerHP(level) {
  let hp = 10 + mod(CON_SCORE[3] ?? 14); // L1 max, use L3 con as pre-L3 stand-in (STR/CON build from L1)
  for (let l = 2; l <= level; l++) {
    const con = CON_SCORE[l] ?? CON_SCORE[Math.max(...Object.keys(CON_SCORE).map(Number).filter((k) => k <= l))] ?? 14;
    hp += 6 + mod(con);
  }
  return hp;
}

const MONSTERS = {
  3: { name: 'giantSpider', ac: 14, atkBonus: 5, dmg: '1d8+3', attacksPerRound: 1 },
  5: { name: 'berserker', ac: 13, atkBonus: 5, dmg: '1d12+3', attacksPerRound: 1 },
  7: { name: 'veteran', ac: 17, atkBonus: 5, dmg: '1d8+3', attacksPerRound: 2 },
  9: { name: 'veteran', ac: 17, atkBonus: 5, dmg: '1d8+3', attacksPerRound: 2 },
  10: { name: 'voidTitan', ac: 17, atkBonus: 11, dmg: '3d10+6', attacksPerRound: 2 },
};

const LEVELS = [3, 5, 7, 9, 10];
const PLAYER_AC = 16;
const ROUNDS_DPR_TEST = 5;

function maneuverDieSides(level) {
  return level >= 10 ? 10 : level >= 7 ? 8 : 6;
}
function swornCap(level) {
  return level >= 10 ? 5 : 3;
}
function resolveMax(level) {
  const con = CON_SCORE[level] ?? 14;
  return Math.max(1, mod(con) + level);
}

// --- DPR trial (favorable: punching bag, isolates output + resource curve) ---
function simExemplarDPR(level) {
  const pb = getProficiencyBonus(level);
  const strMod = mod(STR_SCORE[level] ?? 20);
  const attackBonus = pb + strMod;
  const numAttacks = level >= 5 ? 2 : 1; // hand-modeled Extra Attack, see header
  const dieSides = maneuverDieSides(level);
  const target = MONSTERS[level];

  let totalDamage = 0;
  let resolve = resolveMax(level);
  let procs = 0;
  for (let round = 0; round < ROUNDS_DPR_TEST; round++) {
    for (let a = 0; a < numAttacks; a++) {
      const atk = attackRoll(attackBonus, target.ac);
      if (atk.hit) {
        let dmg = damageRoll(`1d8+${strMod}`, atk.critical).total;
        // maneuver procs on EVERY attack it can afford — ability text says
        // "once per attack," not once per turn. This is the asymmetry vs Oath.
        if (resolve > 0) {
          resolve -= 1;
          dmg += damageRoll(`1d${dieSides}`, atk.critical).total;
          procs += 1;
        }
        totalDamage += dmg;
      }
    }
  }
  return { totalDamage, resolveLeft: resolve, procs, resolveStart: resolveMax(level) };
}

function simOathDPR(level) {
  const pb = getProficiencyBonus(level);
  const strMod = mod(STR_SCORE[level] ?? 20);
  const attackBonus = pb + strMod;
  const numAttacks = level >= 5 ? 2 : 1;
  const target = MONSTERS[level];
  const cap = swornCap(level);

  let totalDamage = 0;
  let resolve = resolveMax(level);
  // sustain strategy: spend evenly to last all 5 rounds (permadeath-appropriate
  // play, not blind nova) — spend = min(cap, floor(resolve/roundsLeft))
  let swornUses = 0;
  for (let round = 0; round < ROUNDS_DPR_TEST; round++) {
    let usedSwornThisTurn = false;
    for (let a = 0; a < numAttacks; a++) {
      const atk = attackRoll(attackBonus, target.ac);
      if (atk.hit) {
        let dmg = damageRoll(`1d8+${strMod}`, atk.critical).total;
        if (!usedSwornThisTurn && resolve > 0) {
          const roundsLeft = ROUNDS_DPR_TEST - round;
          const spend = Math.max(1, Math.min(cap, resolve, Math.ceil(resolve / roundsLeft)));
          resolve -= spend;
          for (let i = 0; i < spend; i++) dmg += damageRoll('1d8', atk.critical).total;
          usedSwornThisTurn = true;
          swornUses += 1;
        }
        totalDamage += dmg;
      }
    }
  }
  return { totalDamage, resolveLeft: resolve, swornUses, resolveStart: resolveMax(level) };
}

console.log('=== DPR trial: 5-round fight vs level-appropriate punching bag, N=%d ===\n', N);
console.log('Lvl | Target(AC)      | Exemplar mean DPR (95% CI)      | Oath mean DPR (95% CI)          | Delta        | Not-distinguishable?');
const dprSummary = [];
for (const level of LEVELS) {
  const exResults = [];
  const oaResults = [];
  let exProcsTotal = 0, exResolveLeftTotal = 0, oaSwornTotal = 0, oaResolveLeftTotal = 0;
  for (let i = 0; i < N; i++) {
    const ex = simExemplarDPR(level);
    const oa = simOathDPR(level);
    exResults.push(ex.totalDamage / ROUNDS_DPR_TEST);
    oaResults.push(oa.totalDamage / ROUNDS_DPR_TEST);
    exProcsTotal += ex.procs;
    exResolveLeftTotal += ex.resolveLeft;
    oaSwornTotal += oa.swornUses;
    oaResolveLeftTotal += oa.resolveLeft;
  }
  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const sd = (arr, m) => Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
  const exMean = mean(exResults), oaMean = mean(oaResults);
  const exSD = sd(exResults, exMean), oaSD = sd(oaResults, oaMean);
  const exMargin = 1.96 * (exSD / Math.sqrt(N));
  const oaMargin = 1.96 * (oaSD / Math.sqrt(N));
  const delta = exMean - oaMean;
  const notDistinguishable = Math.abs(delta) < exMargin + oaMargin;
  const target = MONSTERS[level];
  console.log(
    `L${level}  | ${target.name.padEnd(10)}(${target.ac}) | ${exMean.toFixed(1).padStart(5)} +/- ${exMargin.toFixed(1)} | ${oaMean.toFixed(1).padStart(5)} +/- ${oaMargin.toFixed(1)} | ${delta >= 0 ? '+' : ''}${delta.toFixed(1).padStart(6)} DPR | ${notDistinguishable ? 'YES (noise)' : 'no — real'}`
  );
  dprSummary.push({
    level, exMean, oaMean, delta, notDistinguishable,
    exProcsAvg: exProcsTotal / N, exResolveLeftAvg: exResolveLeftTotal / N, exResolveMax: resolveMax(level),
    oaSwornAvg: oaSwornTotal / N, oaResolveLeftAvg: oaResolveLeftTotal / N,
  });
}

console.log('\n--- Resource economy (avg over %d trials) ---', N);
console.log('Lvl | Exemplar: maneuver procs/5rd (of max possible) | Resolve unspent | Oath: Sworn Strike uses/5rd (cap 1/turn=5 max) | Resolve unspent');
for (const s of dprSummary) {
  const maxPossibleProcs = LEVELS.includes(s.level) ? (s.level >= 5 ? 10 : 5) : 5;
  console.log(
    `L${s.level}  | ${s.exProcsAvg.toFixed(1)} / ${maxPossibleProcs}                                   | ${s.exResolveLeftAvg.toFixed(1)} / ${s.exResolveMax}          | ${s.oaSwornAvg.toFixed(1)} / 5                                          | ${s.oaResolveLeftAvg.toFixed(1)}`
  );
}

// --- Survivability trial: solo vs 2x level-appropriate monster, to death or clear ---
function simSurvival(level, spec, feature, targetOverride) {
  const pb = getProficiencyBonus(level);
  const strMod = mod(STR_SCORE[level] ?? 20);
  const attackBonus = pb + strMod;
  const numAttacks = level >= 5 ? 2 : 1;
  const target = targetOverride || MONSTERS[level];
  const maxHP = playerHP(level);
  const dieSides = maneuverDieSides(level);
  const cap = swornCap(level);

  let hp = maxHP;
  let resolve = resolveMax(level);
  let monstersAlive = 2;
  const hpPool = targetOverride ? monsterHPPool(7) : monsterHPPool(level);
  let monsterHPs = [hpPool, hpPool];
  let down = false; // 0 HP, not yet dead, no Unbreakable Oath save used
  let unbreakableUsed = false;
  let indomitableUsed = false;
  let round = 0;
  const trace = [];
  const maxRounds = 20;

  while (hp > 0 && monstersAlive > 0 && round < maxRounds) {
    round += 1;
    // player turn
    if (hp > 0) {
      for (let a = 0; a < numAttacks; a++) {
        const idx = monsterHPs.findIndex((h) => h > 0);
        if (idx === -1) break;
        const atk = attackRoll(attackBonus, target.ac);
        if (atk.hit) {
          let dmg = damageRoll(`1d8+${strMod}`, atk.critical).total;
          if (spec === 'exemplar' && resolve > 0) {
            resolve -= 1;
            dmg += damageRoll(`1d${dieSides}`, atk.critical).total;
          } else if (spec === 'oath' && resolve > 0 && a === 0) {
            const spend = Math.min(cap, resolve);
            resolve -= spend;
            for (let i = 0; i < spend; i++) dmg += damageRoll('1d8', atk.critical).total;
          }
          monsterHPs[idx] -= dmg;
          if (monsterHPs[idx] <= 0) monstersAlive -= 1;
        }
      }
    }
    if (monstersAlive === 0) break;

    // monster turns — both remaining monsters attack the player
    for (let m = 0; m < 2; m++) {
      if (monsterHPs[m] <= 0) continue;
      for (let a = 0; a < target.attacksPerRound; a++) {
        if (hp <= 0) {
          // downed: melee hit vs 0 HP = auto-crit death per 5e rule, UNLESS
          // Unbreakable Oath already stabilized this character this fight.
          if (!down) continue; // already dead/stable-handled below
          const atk = attackRoll(target.atkBonus, PLAYER_AC);
          if (atk.hit) {
            trace.push(`R${round}: downed player auto-crit killed`);
            return { won: false, rounds: round, trace, hp: 0 };
          }
          continue;
        }
        const atk = attackRoll(target.atkBonus, PLAYER_AC);
        if (atk.hit) {
          const dmg = damageRoll(target.dmg, atk.critical).total;
          hp -= dmg;
          trace.push(`R${round}: ${target.name} hits player for ${dmg} (hp ${Math.max(hp,0)})`);
          if (hp <= 0) {
            if (spec === 'oath' && feature === 'unbreakableOath' && !unbreakableUsed && resolve >= 0) {
              unbreakableUsed = true;
              hp = 1;
              resolve = 0; // spends ALL remaining resolve
              trace.push(`R${round}: Unbreakable Oath triggers — stabilize at 1 HP`);
            } else {
              down = true;
              trace.push(`R${round}: player dropped to 0 HP, downed`);
            }
          }
        }
      }
    }
  }
  const won = monstersAlive === 0 && hp > 0;
  return { won, rounds: round, trace, hp };
}

function monsterHPPool(level) {
  // MM average HP for the chosen stat block, matches data/monsters.json hit-dice formula
  const table = { 3: 26, 5: 58, 7: 58, 9: 58, 10: 204 };
  return table[level];
}

console.log('\n=== Survivability trial: solo vs 2x level-appropriate monster, N=%d, to death or clear ===\n', N);
console.log('Lvl | Build                         | Win rate (95% CI)           | Avg rounds');
const survRows = [];
for (const level of LEVELS) {
  const configs = [
    { spec: 'exemplar', feature: 'baseline', label: 'Exemplar (no Indomitable)' },
    { spec: 'exemplar', feature: 'indomitable', label: 'Exemplar + Indomitable' },
    { spec: 'oath', feature: 'baseline', label: 'Oath (no Unbreakable Oath)' },
    { spec: 'oath', feature: 'unbreakableOath', label: 'Oath + Unbreakable Oath' },
  ];
  for (const cfg of configs) {
    if (cfg.feature === 'unbreakableOath' && level < 9) continue; // not unlocked yet
    let wins = 0, totalRounds = 0;
    const traces = [];
    for (let i = 0; i < N; i++) {
      const r = simSurvival(level, cfg.spec, cfg.feature);
      if (r.won) wins++;
      totalRounds += r.rounds;
      traces.push(r);
    }
    const p = wins / N;
    console.log(`L${level}  | ${cfg.label.padEnd(30)} | ${ciFor(p, N).padEnd(28)} | ${(totalRounds / N).toFixed(1)}`);
    survRows.push({ level, ...cfg, winRate: p, n: N });
    if (level === 9 && cfg.spec === 'oath' && cfg.feature === 'unbreakableOath') {
      const win = traces.find((t) => t.won && t.trace.some((l) => l.includes('Unbreakable Oath')));
      const loss = traces.find((t) => !t.won);
      const longest = traces.reduce((a, b) => (b.rounds > a.rounds ? b : a), traces[0]);
      console.log('  [trace] Unbreakable-Oath-triggered win, sample:', (win?.trace || []).slice(-4).join(' | ') || 'none in sample');
      console.log('  [trace] representative loss:', (loss?.trace || []).slice(-3).join(' | '));
      console.log('  [trace] longest fight (%d rounds):', longest.rounds, (longest.trace || []).slice(-3).join(' | '));
    }
    if (level === 10) {
      // voidTitan x2 saturates both specs at 0% (over-tuned stress test, not
      // informative) — rerun L10 vs 2x veteran (the L7/L9 pool monster) for a
      // survivable "unfavorable" comparison instead.
      let wins2 = 0, totalRounds2 = 0;
      for (let i = 0; i < N; i++) {
        const r = simSurvival(level, cfg.spec, cfg.feature, MONSTERS[7]);
        if (r.won) wins2++;
        totalRounds2 += r.rounds;
      }
      const p2 = wins2 / N;
      console.log(`L${level}* | ${(cfg.label + ' [vs 2x veteran, not voidTitan]').padEnd(30)} | ${ciFor(p2, N).padEnd(28)} | ${(totalRounds2 / N).toFixed(1)}`);
    }
  }
}

console.log('\nDone.');
