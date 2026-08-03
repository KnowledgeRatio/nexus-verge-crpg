/**
 * Menacing Attack full-convergence review (balance-engineer, 2026-07-31).
 *
 * Context: design lead rejected the prior asymmetric "kicker" proposal
 * (see .claude/agent-memory/balance-engineer/project_menacing_attack_presence_kicker.md,
 * tools/balance-sim/menacing-attack-presence-kicker-sim.js) and wants genuine
 * 50/50 convergence instead, replacing today's live formula entirely:
 *
 *   TODAY (live, data/abilities.json Menacing Attack + EffectDispatcher.js:427-432
 *   maneuverSaveDC, shared with Trip/Pushing/Disarming Attack):
 *     DC = 8 + proficiency + max(strMod, dexMod)   [Prowess stands in 1:1 for str]
 *
 *   PROPOSED (Menacing Attack ONLY -- Trip/Push/Disarm keep the formula above,
 *   unchanged, per the request):
 *     DC = 8 + proficiency + floor(Prowess_mod/2) + floor(Presence_mod/2)
 *
 * Neither Prowess nor Presence exist in code today (six-attribute remap,
 * docs/plans/2026-07-30-attribute-system-remap.md, still Proposed) -- this is
 * a Monte Carlo of a hypothetical formula layered on the REAL engine, same
 * pattern as the prior two passes: Prowess/Vitality stand in 1:1 for live
 * STR/CON, everything else (turn structure, d20 resolution, advantage/
 * disadvantage, frightened-imposes-disadvantage, condition-clears-at-end-of-
 * possessor's-own-turn, maneuver die size table) is a faithful reproduction
 * of CombatManager.js / EffectDispatcher.js, not a reimplemented guess.
 *
 * *** FORMULA-SHAPE FINDING (Q4) ***
 * The plan's own "Engine rule: fractional attribute rounding"
 * (docs/plans/2026-07-30-attribute-system-remap.md:101-116) explicitly
 * requires summing RAW fractional modifiers first and flooring ONCE on the
 * total for any multi-attribute blend -- and documents that the naive
 * "floor each term separately, then sum" version has a proven 1-point loss
 * whenever both contributing modifiers are odd integers. That exact bug was
 * found and fixed for the concentration formula (plan line 163: label reads
 * "floor(Vit/2) + floor(Comp/2)" but the resolved, correct formula per its
 * own worked example and the Engine Rule section is
 * floor(rawVitality/2 + rawComposure/2), i.e. sum-then-floor-once) and reused
 * for flee (plan line 180, same pattern, same citation).
 *
 * The formula given for this review -- literally
 * "DC = 8 + proficiency + floor(Prowess_mod/2) + floor(Presence_mod/2)" --
 * is written as two INDEPENDENT floors on already-integer modifiers, i.e.
 * the exact shape the plan calls "wrong" elsewhere in the same document.
 * This harness tests BOTH the formula AS LITERALLY SPECIFIED in the request
 * (double-floor) and the Engine-Rule-compliant alternative (raw-sum,
 * floor-once) to quantify the gap. Since Prowess_mod/Presence_mod are
 * already-floored integers in this game (getAbilityModifier floors at the
 * source, per the plan's own "Confirmed code gap" note), the Engine Rule's
 * "raw fractional" framing doesn't strictly apply to Menacing Attack's two
 * SEPARATE per-attribute modifiers the way it does to a single blended
 * derived stat computed from two raw scores -- but the double-floor-loses-a-
 * point-when-both-terms-are-odd arithmetic identity holds regardless of
 * whether the inputs started fractional or were already integers. Reported
 * as a real, quantified formula-shape risk, not asserted as certainly a bug
 * (see report for the precise framing).
 *
 * PC builds -- same chargen/ASI derivation as the presence-kicker pass
 * (point-buy caps at 15 pre-ASI, RULES.core.pointBuyCosts; player characters
 * get an ASI EVERY level-up per LevelUpManager.js, not just RULES.progression
 * .asiLevels -- see .claude/agent-memory/balance-engineer/
 * reference_asi_every_level_not_asilevels_gated.md):
 *
 *   PureProwess (Presence dumped to point-buy floor 8, never invested):
 *     L3 prowess17/vitality15/presence8, L5 prowess19/vitality15/presence8,
 *     L7 prowess20/vitality16/presence8, L10 prowess20/vitality19/presence8.
 *   Balanced (invests in Presence alongside Prowess every other ASI --
 *     identical chassis to the prior pass's "DreadKnight" build, now used as
 *     the genuine-convergence comparison point instead of a kicker case):
 *     L3 prowess16/vitality15/presence16, L5 prowess17/vitality15/presence17,
 *     L7 prowess18/vitality15/presence18, L10 prowess20/vitality15/presence19.
 *
 * Monster picks -- same NaN-safe list as both prior passes (data/monsters.json
 * 19/46 entries ship abilities:[] -> NaN ability mods, see
 * .claude/agent-memory/balance-engineer/reference_monsters_abilities_nan_bug.md):
 *   L3  favorable=goblin (CR .25)   unfavorable=bugbear (CR 1)
 *   L5  favorable=bugbear (CR 1)    unfavorable=ogre (CR 2)
 *   L7  favorable=ogre (CR 2)       unfavorable=veteran (CR 3)
 *   L10 favorable=veteran (CR 3)    unfavorable=voidTitan (CR 10, boss)
 */

import { RULES, getProficiencyBonus } from '../../src/core/rulesEngine.js';
import { rollDie, rollHitPoints } from '../../src/utils/dice.js';

const TRIALS_PER_CELL = 500; // hundreds per scenario, matches prior two passes' floor

const mod = (score) => Math.floor((score - 10) / 2);
const ROUND_CAP = 30;

// ---------------------------------------------------------------------------
// PC builds -- level: { prowess, vitality, presence }
// ---------------------------------------------------------------------------
const PURE_PROWESS = {
  3: { prowess: 17, vitality: 15, presence: 8 },
  5: { prowess: 19, vitality: 15, presence: 8 },
  7: { prowess: 20, vitality: 16, presence: 8 },
  10: { prowess: 20, vitality: 19, presence: 8 },
};
const BALANCED = {
  3: { prowess: 16, vitality: 15, presence: 16 },
  5: { prowess: 17, vitality: 15, presence: 17 },
  7: { prowess: 18, vitality: 15, presence: 18 },
  10: { prowess: 20, vitality: 15, presence: 19 },
};

function resolveManeuverDieSides(level) {
  // Mirrors EffectDispatcher.js:403-408 (unexported, copied verbatim).
  if (level >= 10) return 10;
  if (level >= 7) return 8;
  return 6;
}

// TODAY's live formula (also Trip/Pushing/Disarming Attack's formula, unchanged
// by this proposal) -- EffectDispatcher.js:427-432, Prowess standing in for str.
function baselineDC(prof, prowessMod) {
  return 8 + prof + prowessMod;
}

// PROPOSED formula, AS LITERALLY SPECIFIED in the request (double floor).
function convergenceDC_asSpecified(prof, prowessMod, presenceMod) {
  return 8 + prof + Math.floor(prowessMod / 2) + Math.floor(presenceMod / 2);
}

// Engine-Rule-compliant alternative (sum raw, floor once) -- what the plan's
// own documented pattern (concentration, flee) would produce for the same
// convergence shape. Provided for the Q4 comparison only.
function convergenceDC_engineRule(prof, prowessMod, presenceMod) {
  return 8 + prof + Math.floor((prowessMod + presenceMod) / 2);
}

// ---------------------------------------------------------------------------
// Monster chassis -- identical to both prior passes.
// ---------------------------------------------------------------------------
const MONSTERS = {
  goblin: { cr: 0.25, ac: 15, hpDice: [2, 6], hpBonus: 0, atkMod: 2, dmgDie: 6, dmgBonus: 2, attacksPerRound: 1, wis: 8, cha: 8 },
  gnoll: { cr: 0.5, ac: 15, hpDice: [5, 8], hpBonus: 0, atkMod: 2, dmgDie: 4, dmgBonus: 2, attacksPerRound: 1, wis: 10, cha: 7 },
  bugbear: { cr: 1, ac: 16, hpDice: [5, 8], hpBonus: 5, atkMod: 2, dmgDie: 8, dmgBonus: 2, attacksPerRound: 1, wis: 11, cha: 9 },
  ogre: { cr: 2, ac: 11, hpDice: [7, 10], hpBonus: 21, atkMod: 4, dmgDie: 8, dmgBonus: 4, attacksPerRound: 1, wis: 7, cha: 7 },
  veteran: { cr: 3, ac: 17, hpDice: [9, 8], hpBonus: 18, atkMod: 3, dmgDie: 8, dmgBonus: 3, attacksPerRound: 1, wis: 11, cha: 10 },
  voidTitan: { cr: 10, ac: 17, hpDice: [16, 12], hpBonus: 96, atkBonusOverride: 11, dmgDie: 10, dmgDieCount: 3, dmgBonus: 6, attacksPerRound: 2, wis: 14, cha: 8 },
};

function composureMod(m) {
  // Same proxy as the prior pass: decision #2's "average the two" +
  // Engine Rule's "sum raw, floor once" applied to plain monster ability
  // scores (no structured save-bonus field to average directly).
  const rawWis = (m.wis - 10) / 2;
  const rawCha = (m.cha - 10) / 2;
  return Math.floor((rawWis + rawCha) / 2);
}

function monsterProficiency(cr) {
  return RULES.combat.monsterProficiencyByCR[cr] ?? 2;
}

function monsterChassis(id) {
  const m = MONSTERS[id];
  const prof = monsterProficiency(m.cr);
  const attackBonus = m.atkBonusOverride ?? m.atkMod + prof;
  const [hpCount, hpSides] = m.hpDice;
  const maxHP = Array.from({ length: hpCount }, () => rollDie(hpSides)).reduce((a, b) => a + b, 0) + m.hpBonus;
  return {
    ac: m.ac,
    attackBonus,
    dmgDieCount: m.dmgDieCount ?? 1,
    dmgDie: m.dmgDie,
    dmgBonus: m.dmgBonus,
    maxHP,
    attacksPerRound: m.attacksPerRound,
    composureMod: composureMod(m),
  };
}

function pcChassis(level, build) {
  const scores = build[level];
  const prowessMod = mod(scores.prowess);
  const vitalityMod = mod(scores.vitality);
  const presenceMod = mod(scores.presence);
  const pb = getProficiencyBonus(level);
  let maxHP = 10 + vitalityMod; // hitDie 10 (Dedication, classes.json)
  for (let l = 2; l <= level; l++) maxHP += rollHitPoints(10, vitalityMod, true);
  return {
    prowessMod,
    vitalityMod,
    presenceMod,
    prof: pb,
    attackBonus: prowessMod + pb,
    weaponDie: 8, // longsword
    ac: 18, // chainMail(16, addDexModifier:false) + shield(+2), verified DEX-independent
    maxHP,
    attacksPerRound: level >= 5 ? 2 : 1,
    maneuverDieSides: resolveManeuverDieSides(level),
    maxResolve: Math.max(1, vitalityMod + level), // RULES.callingResources.resolve formula
  };
}

// ---------------------------------------------------------------------------
// Combat resolution -- mirrors CombatManager.js's real d20/advantage shape.
// ---------------------------------------------------------------------------
function rollD20WithMode(mode) {
  if (mode === 'normal') return rollDie(20);
  const a = rollDie(20);
  const b = rollDie(20);
  return mode === 'advantage' ? Math.max(a, b) : Math.min(a, b);
}

function rollDamage(dieCount, dieSides, bonus, crit) {
  const dice = crit ? dieCount * 2 : dieCount;
  let total = bonus;
  for (let i = 0; i < dice; i++) total += rollDie(dieSides);
  return Math.max(0, total);
}

function simulateFight(level, build, monsterId, formulaFn) {
  const pc = pcChassis(level, build);
  const mon = monsterChassis(monsterId);
  let pcHP = pc.maxHP;
  let monHP = mon.maxHP;
  let resolve = pc.maxResolve;
  let round = 0;
  let monsterFrightenedThisRound = false;
  let monsterTurnsTotal = 0;
  let monsterTurnsFrightened = 0;

  const dc = formulaFn(pc.prof, pc.prowessMod, pc.presenceMod);

  while (round < ROUND_CAP && pcHP > 0 && monHP > 0) {
    round++;

    // --- PC turn ---
    for (let a = 0; a < pc.attacksPerRound && monHP > 0; a++) {
      const attemptMenace = resolve > 0;
      const nat = rollD20WithMode('normal');
      const hit = nat === 20 || nat + pc.attackBonus >= mon.ac;
      const crit = nat === 20;
      if (hit) {
        let dmg = rollDamage(1, pc.weaponDie, pc.prowessMod, crit);
        if (attemptMenace) {
          resolve -= 1;
          const dieRoll = rollDie(pc.maneuverDieSides);
          dmg += dieRoll;
          const saveRoll = rollD20WithMode('normal') + mon.composureMod;
          if (saveRoll < dc) {
            monsterFrightenedThisRound = true;
          }
        }
        monHP -= dmg;
      }
    }

    // --- Monster turn ---
    if (monHP > 0 && pcHP > 0) {
      monsterTurnsTotal++;
      const frightened = monsterFrightenedThisRound;
      if (frightened) monsterTurnsFrightened++;
      for (let a = 0; a < mon.attacksPerRound && pcHP > 0; a++) {
        const d20 = rollD20WithMode(frightened ? 'disadvantage' : 'normal');
        const hit = d20 === 20 || d20 + mon.attackBonus >= pc.ac;
        const crit = d20 === 20;
        if (hit) pcHP -= rollDamage(mon.dmgDieCount, mon.dmgDie, mon.dmgBonus, crit);
      }
      monsterFrightenedThisRound = false;
    }
  }

  return {
    won: monHP <= 0 && pcHP > 0,
    rounds: round,
    pcHPRemaining: Math.max(0, pcHP),
    pcMaxHP: pc.maxHP,
    frightenedUptime: monsterTurnsTotal > 0 ? monsterTurnsFrightened / monsterTurnsTotal : 0,
    dc,
  };
}

function runCell(level, buildName, build, monsterId, formulaName, formulaFn) {
  let wins = 0;
  let totalRounds = 0;
  let totalHPPctOnWin = 0;
  let totalUptime = 0;
  let dc = null;
  for (let i = 0; i < TRIALS_PER_CELL; i++) {
    const r = simulateFight(level, build, monsterId, formulaFn);
    if (r.won) {
      wins++;
      totalHPPctOnWin += r.pcHPRemaining / r.pcMaxHP;
    }
    totalRounds += r.rounds;
    totalUptime += r.frightenedUptime;
    dc = r.dc;
  }
  return {
    level,
    build: buildName,
    monster: monsterId,
    formula: formulaName,
    dc,
    winRate: wins / TRIALS_PER_CELL,
    avgRounds: totalRounds / TRIALS_PER_CELL,
    avgHPPctOnWin: wins > 0 ? totalHPPctOnWin / wins : 0,
    avgFrightenedUptime: totalUptime / TRIALS_PER_CELL,
  };
}

const SCENARIOS = [
  { level: 3, favorable: 'goblin', unfavorable: 'bugbear' },
  { level: 5, favorable: 'bugbear', unfavorable: 'ogre' },
  { level: 7, favorable: 'ogre', unfavorable: 'veteran' },
  { level: 10, favorable: 'veteran', unfavorable: 'voidTitan' },
];

console.log(`Trials per cell: ${TRIALS_PER_CELL}\n`);

// -----------------------------------------------------------------------
// Q1 -- pure arithmetic DC table (no dice), all levels, both builds, both
// the live baseline and the two convergence formula variants.
// -----------------------------------------------------------------------
console.log('--- Q1/Q4: DC table (arithmetic, no dice) ---');
console.log('Lvl Build         ProwessMod PresenceMod  Baseline(today)  Convergence(asSpecified)  Convergence(engineRule)');
for (const level of [3, 5, 7, 10]) {
  for (const [name, build] of [['PureProwess', PURE_PROWESS], ['Balanced', BALANCED]]) {
    const s = build[level];
    const pm = mod(s.prowess);
    const prm = mod(s.presence);
    const prof = getProficiencyBonus(level);
    const base = baselineDC(prof, pm);
    const conv = convergenceDC_asSpecified(prof, pm, prm);
    const convER = convergenceDC_engineRule(prof, pm, prm);
    console.log(
      `L${level}  ${name.padEnd(12)} ${String(pm).padStart(3)}        ${String(prm).padStart(3)}          ${String(base).padStart(2)}               ${String(conv).padStart(2)} (Δ${conv - base >= 0 ? '+' : ''}${conv - base})              ${String(convER).padStart(2)} (Δvs-asSpecified ${convER - conv >= 0 ? '+' : ''}${convER - conv})`
    );
  }
}

// -----------------------------------------------------------------------
// Q2 -- Menacing Attack (convergence, as specified) DC vs Trip/Push/Disarm
// (baseline, unchanged) DC, SAME PureProwess build.
// -----------------------------------------------------------------------
console.log('\n--- Q2: PureProwess build, Menacing (convergence) DC vs Trip/Push/Disarm (baseline, unchanged) DC ---');
for (const level of [3, 5, 7, 10]) {
  const s = PURE_PROWESS[level];
  const pm = mod(s.prowess);
  const prm = mod(s.presence);
  const prof = getProficiencyBonus(level);
  const tripDC = baselineDC(prof, pm);
  const menaceDC = convergenceDC_asSpecified(prof, pm, prm);
  console.log(`L${level}: TripPushDisarm DC=${tripDC}  MenacingAttack DC=${menaceDC}  (Menacing is ${menaceDC - tripDC} vs Trip)`);
}

// -----------------------------------------------------------------------
// Q3 -- Monte Carlo win-rate / uptime, PureProwess vs Balanced, convergence
// formula (as specified) vs today's baseline, across the scenario matrix.
// -----------------------------------------------------------------------
console.log('\n--- Q3: Monte Carlo, 500 trials/cell ---');
const results = [];
for (const { level, favorable, unfavorable } of SCENARIOS) {
  for (const monsterId of [favorable, unfavorable]) {
    results.push(runCell(level, 'PureProwess', PURE_PROWESS, monsterId, 'baseline(today)', (p, pm) => baselineDC(p, pm)));
    results.push(runCell(level, 'PureProwess', PURE_PROWESS, monsterId, 'convergence', convergenceDC_asSpecified));
    results.push(runCell(level, 'Balanced', BALANCED, monsterId, 'baseline(today)', (p, pm) => baselineDC(p, pm)));
    results.push(runCell(level, 'Balanced', BALANCED, monsterId, 'convergence', convergenceDC_asSpecified));
  }
}

console.log('Lvl Build       Formula          Monster     DC  WinRate  AvgRounds  FrightenedUptime%  AvgHP%OnWin');
for (const r of results) {
  console.log(
    `${String(r.level).padEnd(3)} ${r.build.padEnd(11)} ${r.formula.padEnd(16)} ${r.monster.padEnd(11)} ${String(r.dc).padStart(2)}  ${(r.winRate * 100).toFixed(1).padStart(5)}%   ${r.avgRounds.toFixed(1).padStart(6)}     ${(r.avgFrightenedUptime * 100).toFixed(1).padStart(6)}%          ${(r.avgHPPctOnWin * 100).toFixed(1).padStart(5)}%`
  );
}

console.log('\n--- PureProwess: convergence vs baseline(today) delta (winRate pts, negative = convergence worse) ---');
for (const { level, favorable, unfavorable } of SCENARIOS) {
  for (const monsterId of [favorable, unfavorable]) {
    const base = results.find((r) => r.level === level && r.build === 'PureProwess' && r.formula === 'baseline(today)' && r.monster === monsterId);
    const conv = results.find((r) => r.level === level && r.build === 'PureProwess' && r.formula === 'convergence' && r.monster === monsterId);
    const deltaWin = (conv.winRate - base.winRate) * 100;
    const deltaUptime = (conv.avgFrightenedUptime - base.avgFrightenedUptime) * 100;
    console.log(
      `L${level} vs ${monsterId}: DC ${base.dc}->${conv.dc} (Δ${conv.dc - base.dc}) | WinRate ${(base.winRate * 100).toFixed(1)}%->${(conv.winRate * 100).toFixed(1)}% (Δ${deltaWin >= 0 ? '+' : ''}${deltaWin.toFixed(1)}pts) | FrightenedUptime ${(base.avgFrightenedUptime * 100).toFixed(1)}%->${(conv.avgFrightenedUptime * 100).toFixed(1)}% (Δ${deltaUptime >= 0 ? '+' : ''}${deltaUptime.toFixed(1)}pts)`
    );
  }
}

console.log('\n--- Balanced: convergence vs baseline(today) delta (winRate pts) ---');
for (const { level, favorable, unfavorable } of SCENARIOS) {
  for (const monsterId of [favorable, unfavorable]) {
    const base = results.find((r) => r.level === level && r.build === 'Balanced' && r.formula === 'baseline(today)' && r.monster === monsterId);
    const conv = results.find((r) => r.level === level && r.build === 'Balanced' && r.formula === 'convergence' && r.monster === monsterId);
    const deltaWin = (conv.winRate - base.winRate) * 100;
    const deltaUptime = (conv.avgFrightenedUptime - base.avgFrightenedUptime) * 100;
    console.log(
      `L${level} vs ${monsterId}: DC ${base.dc}->${conv.dc} (Δ${conv.dc - base.dc}) | WinRate ${(base.winRate * 100).toFixed(1)}%->${(conv.winRate * 100).toFixed(1)}% (Δ${deltaWin >= 0 ? '+' : ''}${deltaWin.toFixed(1)}pts) | FrightenedUptime ${(base.avgFrightenedUptime * 100).toFixed(1)}%->${(conv.avgFrightenedUptime * 100).toFixed(1)}% (Δ${deltaUptime >= 0 ? '+' : ''}${deltaUptime.toFixed(1)}pts)`
    );
  }
}
