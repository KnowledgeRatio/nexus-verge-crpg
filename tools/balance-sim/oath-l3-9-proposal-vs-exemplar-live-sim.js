/**
 * Oath proposed L3-9 content vs Exemplar's shipped kit (balance-engineer, 2026-08-06).
 *
 * IMPLEMENTATION STATUS (checked first, per project convention):
 *   - Exemplar's full kit (8 tactics, Grace Under Pressure, Vanguard, Extra
 *     Attack): LIVE in data/abilities.json + data/traits.json + CombatManager.js
 *     /EffectDispatcher.js, per docs/callings/dedication.md (verified 2026-08-05).
 *   - Oath's proposed Ward/Challenge/Bulwark/Reprisal and the Sworn-Strike-vs-
 *     damageVulnerabilities swap: NOT in any data file (grepped abilities.json,
 *     traits.json — zero hits for ward/challenge/bulwark/reprisal). Pure
 *     proposal, modeled here by hand with the REAL formulas (dice.js
 *     attackRoll/damageRoll/rollDie, rulesEngine.js getProficiencyBonus,
 *     tacticSaveDC's real "8 + prof + attribute mod" shape).
 *
 *   *** CRITICAL WIRING FINDING ***
 *   RULES.combat.damageReductionSystem.enabled === false (rulesEngine.js:95,
 *   comment: "off until magic weapons are in loot pool"). CombatManager.js's
 *   resolveDamageModifier() short-circuits to 'normal' (no multiplier at all)
 *   whenever this flag is off — grepped, it is the ONLY gate, no override
 *   found anywhere else in src/. The proposal's core mechanism (undead/fiend
 *   damageVulnerabilities:["resonant"] granting 2x) is DEAD CODE as shipped
 *   today. This harness simulates both states (flag ON, the proposal's
 *   intended behavior, and flag OFF, today's actual live behavior) to
 *   quantify the gap between intent and reality.
 *
 *   *** MONSTER SAVE-DATA FINDING (Challenge) ***
 *   Per .claude/agent-memory/balance-engineer/reference_monsters_abilities_nan_bug.md,
 *   19/46 monsters ship abilities:[] -> NaN on every ability modifier, which
 *   makes any save-or-condition effect (Challenge included) auto-resist
 *   against them (NaN < DC is always false). Affects a MAJORITY of monsters
 *   in the L5/L7/L10 pools. This harness only simulates Challenge against the
 *   ability-safe monster list (giantSpider/berserker/veteran/voidTitan) and
 *   explicitly flags that real play will hit the broken majority often.
 *
 * Method: Monte Carlo (unseeded combat rolls are a deliberate ADR exemption —
 * one run proves nothing). N=500/cell, matches prior passes on this kit
 * (see .claude/agent-memory/balance-engineer/ — established baseline trial count).
 * CI = p +/- 1.96*sqrt(p*(1-p)/n).
 *
 * Player build: reused verbatim from the prior Exemplar-vs-Oath pass
 * (tools/balance-sim/dedication-exemplar-oath-l2-10-proposal-sim.js) for
 * continuity — STR/CON ASI curve, 1d8 longsword, flat AC 16, avg-per-level HP.
 * Composure (Oath's dump stat, since Dedication's identity is Prowess+Vitality
 * per dedication.md) modeled at chargen-dump floor, score 8 (mod -1),
 * unraised — realistic for a build spending all ASIs on Prowess/Vitality
 * exactly like the existing harness already does for STR/CON.
 */
import { attackRoll, damageRoll } from '../../src/utils/dice.js';
import { getProficiencyBonus } from '../../src/core/rulesEngine.js';

const N = 500;
const STR_SCORE = { 3: 18, 5: 18, 7: 20, 9: 20, 10: 20 };
const CON_SCORE = { 3: 14, 5: 16, 7: 16, 9: 18, 10: 19 };
const COMPOSURE_SCORE = 8; // dumped, mod -1, matches Dedication's stated attribute identity
const mod = (score) => Math.floor((score - 10) / 2);

function ciFor(p, n) {
  const margin = 1.96 * Math.sqrt((p * (1 - p)) / n);
  return `${(p * 100).toFixed(1)}% +/- ${(margin * 100).toFixed(1)}pp`;
}

const MONSTERS = {
  3: { name: 'giantSpider', ac: 14, atkBonus: 5, dmg: '1d8+3', attacksPerRound: 1, wisMod: mod(11), undeadFiend: false },
  5: { name: 'berserker', ac: 13, atkBonus: 5, dmg: '1d12+3', attacksPerRound: 1, wisMod: mod(11), undeadFiend: false },
  7: { name: 'veteran', ac: 17, atkBonus: 5, dmg: '1d8+3', attacksPerRound: 2, wisMod: mod(11), undeadFiend: false },
  9: { name: 'veteran', ac: 17, atkBonus: 5, dmg: '1d8+3', attacksPerRound: 2, wisMod: mod(11), undeadFiend: false },
  10: { name: 'voidTitan', ac: 17, atkBonus: 11, dmg: '3d10+6', attacksPerRound: 2, wisMod: mod(14), undeadFiend: false },
};

const LEVELS = [3, 5, 7, 9, 10];
const PLAYER_AC = 16;
const ROUNDS = 5;

function maneuverDieSides(level) { return level >= 10 ? 10 : level >= 7 ? 8 : 6; }
function swornCap(level) { return level >= 10 ? 5 : 3; }
function resolveMax(level) { const con = CON_SCORE[level] ?? 14; return Math.max(1, mod(con) + level); }

// --- Exemplar live DPR (3 known tactics rotated, Grace Under Pressure + Vanguard) ---
function simExemplarDPR(level) {
  const pb = getProficiencyBonus(level);
  const strMod = mod(STR_SCORE[level] ?? 20);
  const attackBonus = pb + strMod;
  const numAttacks = level >= 5 ? 2 : 1;
  const dieSides = maneuverDieSides(level);
  const target = MONSTERS[level];
  let totalDamage = 0, resolve = resolveMax(level);
  let engaged = false; // Vanguard: first hit vs unengaged target only
  for (let round = 0; round < ROUNDS; round++) {
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

// --- Oath proposed DPR: Sworn Strike, vulnerability-conditional bonus ---
function simOathDPR(level, { undeadFiendTarget, vulnSystemEnabled }) {
  const pb = getProficiencyBonus(level);
  const strMod = mod(STR_SCORE[level] ?? 20);
  const attackBonus = pb + strMod;
  const numAttacks = level >= 5 ? 2 : 1;
  const target = MONSTERS[level];
  const cap = swornCap(level);
  let totalDamage = 0, resolve = resolveMax(level);
  for (let round = 0; round < ROUNDS; round++) {
    let usedSwornThisTurn = false;
    for (let a = 0; a < numAttacks; a++) {
      const atk = attackRoll(attackBonus, target.ac);
      if (atk.hit) {
        let dmg = damageRoll(`1d8+${strMod}`, atk.critical).total;
        if (!usedSwornThisTurn && resolve > 0) {
          const roundsLeft = ROUNDS - round;
          const spend = Math.max(1, Math.min(cap, resolve, Math.ceil(resolve / roundsLeft)));
          resolve -= spend;
          let resonant = 0;
          for (let i = 0; i < spend; i++) resonant += damageRoll('1d8', atk.critical).total;
          if (undeadFiendTarget && vulnSystemEnabled) resonant *= 2; // matches CombatManager applyDamage's Math.floor(amount*2)
          dmg += resonant;
          usedSwornThisTurn = true;
        }
        totalDamage += dmg;
      }
    }
  }
  return totalDamage;
}

function meanCI(arr) {
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  const sd = Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
  return { mean: m, margin: 1.96 * (sd / Math.sqrt(arr.length)) };
}

console.log('=== 1. DPR vs standard (non-undead/fiend) target, N=%d — majority-case offense check ===\n', N);
console.log('Lvl | Exemplar (live kit)         | Oath (proposed, no vuln bonus) | Delta        | Distinguishable?');
for (const level of LEVELS) {
  const ex = [], oa = [];
  for (let i = 0; i < N; i++) {
    ex.push(simExemplarDPR(level) / ROUNDS);
    oa.push(simOathDPR(level, { undeadFiendTarget: false, vulnSystemEnabled: false }) / ROUNDS);
  }
  const e = meanCI(ex), o = meanCI(oa);
  const delta = e.mean - o.mean;
  const nd = Math.abs(delta) < e.margin + o.margin;
  console.log(`L${level}  | ${e.mean.toFixed(1).padStart(5)} +/- ${e.margin.toFixed(1)}          | ${o.mean.toFixed(1).padStart(5)} +/- ${o.margin.toFixed(1)}          | ${delta >= 0 ? '+' : ''}${delta.toFixed(1).padStart(6)} DPR | ${nd ? 'YES (noise)' : 'no — real'}`);
}

console.log('\n=== 2. DPR vs undead/fiend target, N=%d — Sworn Strike swap, flag ON vs flag OFF (live default) ===\n', N);
console.log('Lvl | Old (+1d8 flat, being removed) | New, flag ON (2x resonant)  | New, flag OFF (LIVE DEFAULT) | ON vs old   | OFF vs old');
for (const level of LEVELS) {
  const pb = getProficiencyBonus(level);
  const strMod = mod(STR_SCORE[level] ?? 20);
  const attackBonus = pb + strMod;
  const numAttacks = level >= 5 ? 2 : 1;
  const target = MONSTERS[level];
  const cap = swornCap(level);
  const oldResults = [], onResults = [], offResults = [];
  for (let i = 0; i < N; i++) {
    // old: flat +1d8 once per Sworn Strike use (same spend pattern as new)
    let totalOld = 0, resolve = resolveMax(level);
    for (let round = 0; round < ROUNDS; round++) {
      let used = false;
      for (let a = 0; a < numAttacks; a++) {
        const atk = attackRoll(attackBonus, target.ac);
        if (atk.hit) {
          let dmg = damageRoll(`1d8+${strMod}`, atk.critical).total;
          if (!used && resolve > 0) {
            const roundsLeft = ROUNDS - round;
            const spend = Math.max(1, Math.min(cap, resolve, Math.ceil(resolve / roundsLeft)));
            resolve -= spend;
            for (let s = 0; s < spend; s++) dmg += damageRoll('1d8', atk.critical).total;
            dmg += damageRoll('1d8', false).total; // flat bonus die, once per use
            used = true;
          }
          totalOld += dmg;
        }
      }
    }
    oldResults.push(totalOld / ROUNDS);
    onResults.push(simOathDPR(level, { undeadFiendTarget: true, vulnSystemEnabled: true }) / ROUNDS);
    offResults.push(simOathDPR(level, { undeadFiendTarget: true, vulnSystemEnabled: false }) / ROUNDS);
  }
  const o = meanCI(oldResults), on = meanCI(onResults), off = meanCI(offResults);
  console.log(`L${level}  | ${o.mean.toFixed(1).padStart(5)} +/- ${o.margin.toFixed(1)}                  | ${on.mean.toFixed(1).padStart(5)} +/- ${on.margin.toFixed(1)}                 | ${off.mean.toFixed(1).padStart(5)} +/- ${off.margin.toFixed(1)}                  | ${(on.mean - o.mean >= 0 ? '+' : '') + (on.mean - o.mean).toFixed(1)}       | ${(off.mean - o.mean).toFixed(1)}`);
}

// --- 3. Survivability: solo vs 2x monster, Bulwark (+1 AC while engaged 2+) ---
function simSurvival(level, bulwark) {
  const pb = getProficiencyBonus(level);
  const strMod = mod(STR_SCORE[level] ?? 20);
  const attackBonus = pb + strMod;
  const numAttacks = level >= 5 ? 2 : 1;
  const target = MONSTERS[level];
  const cap = swornCap(level);
  const hpTable = { 3: 26, 5: 58, 7: 58, 9: 58, 10: 204 };
  let hp = 10 + mod(CON_SCORE[3]) + (level - 1) * (6 + mod(CON_SCORE[level] ?? 14));
  let resolve = resolveMax(level);
  let monsterHPs = [hpTable[level], hpTable[level]];
  const playerAC = PLAYER_AC + (bulwark ? 1 : 0); // engaged w/ 2 for the whole fight by construction
  let round = 0;
  const maxRounds = 20;
  const trace = [];
  while (hp > 0 && monsterHPs.some((h) => h > 0) && round < maxRounds) {
    round++;
    let usedSworn = false;
    for (let a = 0; a < numAttacks; a++) {
      const idx = monsterHPs.findIndex((h) => h > 0);
      if (idx === -1) break;
      const atk = attackRoll(attackBonus, target.ac);
      if (atk.hit) {
        let dmg = damageRoll(`1d8+${strMod}`, atk.critical).total;
        if (!usedSworn && resolve > 0) {
          const spend = Math.min(cap, resolve);
          resolve -= spend;
          for (let s = 0; s < spend; s++) dmg += damageRoll('1d8', atk.critical).total;
          usedSworn = true;
        }
        monsterHPs[idx] -= dmg;
      }
    }
    if (monsterHPs.every((h) => h <= 0)) break;
    for (let m = 0; m < 2; m++) {
      if (monsterHPs[m] <= 0) continue;
      for (let a = 0; a < target.attacksPerRound; a++) {
        if (hp <= 0) break;
        const atk = attackRoll(target.atkBonus, playerAC);
        if (atk.hit) {
          const dmg = damageRoll(target.dmg, atk.critical).total;
          hp -= dmg;
          trace.push(`R${round}: ${target.name} hits for ${dmg} (hp ${Math.max(hp, 0)})`);
        }
      }
    }
  }
  return { won: monsterHPs.every((h) => h <= 0) && hp > 0, rounds: round, trace, hp };
}

console.log('\n=== 3. Survivability: solo vs 2x level-appropriate monster, Bulwark (+1 AC, always engaged 2+), N=%d ===\n', N);
console.log('Lvl | No Bulwark win rate          | With Bulwark win rate        | Delta');
for (const level of LEVELS) {
  let winsNo = 0, winsYes = 0;
  const noTraces = [], yesTraces = [];
  for (let i = 0; i < N; i++) {
    const r0 = simSurvival(level, false); if (r0.won) winsNo++; noTraces.push(r0);
    const r1 = simSurvival(level, true); if (r1.won) winsYes++; yesTraces.push(r1);
  }
  const p0 = winsNo / N, p1 = winsYes / N;
  const delta = (p1 - p0) * 100;
  console.log(`L${level}  | ${ciFor(p0, N).padEnd(28)} | ${ciFor(p1, N).padEnd(28)} | ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}pp`);
  if (level === 9) {
    const win = yesTraces.find((t) => t.won);
    const loss = yesTraces.find((t) => !t.won);
    console.log('  [trace] representative win (Bulwark):', (win?.trace || []).slice(-3).join(' | '));
    console.log('  [trace] representative loss (Bulwark):', (loss?.trace || []).slice(-3).join(' | '));
  }
}

// --- 4. Challenge: Composure save success rate vs safe monster list ---
console.log('\n=== 4. Challenge landing rate (Composure save, DC = 8+prof+Oath Composure mod), N=%d ===\n', N);
console.log('Lvl | Target(wisMod) | DC | Monster save bonus | Land rate (95% CI)');
for (const level of LEVELS) {
  const pb = getProficiencyBonus(level);
  const dc = 8 + pb + mod(COMPOSURE_SCORE);
  const target = MONSTERS[level];
  let lands = 0;
  for (let i = 0; i < N; i++) {
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + target.wisMod;
    if (total < dc) lands++; // save FAILS -> Taunted lands
  }
  const p = lands / N;
  console.log(`L${level}  | ${target.name.padEnd(11)}(${target.wisMod >= 0 ? '+' : ''}${target.wisMod}) | ${dc}  | +${target.wisMod}                  | ${ciFor(p, N)}`);
}

console.log('\nDone.');
