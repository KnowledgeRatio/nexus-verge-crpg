/**
 * Attribute-remap dump/dominance stress test (balance-engineer, 2026-07-30).
 *
 * Context: docs/plans/2026-07-30-attribute-system-remap.md proposes collapsing
 * ALL saving throws onto the 3 Inward attributes (Vitality/Insight/Composure),
 * retiring Prowess-save and Intellect-save entirely. This makes the 3 Outward
 * attributes (Prowess/Intellect/Presence) purely offensive with zero defensive
 * payoff. Only Dedication (Prowess+Vitality, STR+CON 1:1) is live today, so
 * this harness tests Dedication specifically per the plan's own scope note.
 *
 * The six-attribute system has NO implementation in code — there is nothing to
 * run through CombatManager. Per the precedent set by
 * tools/balance-sim/dedication-l1-10-dpr.js (REV 2), this is a REAL-VALUE
 * Monte Carlo, not a reimplementation of guessed math: it reuses the actual
 * D&D-labelled mechanics already live in this engine (Character.js /
 * CombatManager.js / EncounterBuilder.js), because the plan's own ability
 * mapping states STR->Prowess and CON->Vitality are "clean 1:1" — so today's
 * live STR/CON numbers ARE the Prowess/Vitality numbers the remap would ship.
 * DEX stands in for Insight's initiative/evasion role for this test.
 *
 * Reused directly (not reimplemented):
 *   - RULES from src/core/rulesEngine.js (proficiency table, ASI levels, ASI
 *     increase, point-buy cost table, monster proficiency-by-CR table)
 *   - attackRoll / damageRoll / rollHitPoints / rollDie from src/utils/dice.js
 *     (identical formula shape to Character.js/CombatManager.js/
 *     EncounterBuilder.js's real attack/damage/AC/HP resolution)
 *
 * PC chassis: longsword (1d8, data/items.json) + chainMail (AC 16,
 * addDexModifier:false, data/items.json) + shield (+2) = flat AC 18,
 * confirmed DEX-independent for Dedication's real starting kit
 * (data/classes.json dedication.startingEquipment). Damage stays single-stat
 * Prowess (STR) per the plan's own non-negotiable #4 ("damage stays
 * single-stat Prowess, deliberately not converged") -- this is the punishment
 * mechanism under test.
 *
 * Monster picks: EncounterBuilder.js:182-189 computes monster ability
 * modifiers as `monster.abilities.str` etc. 19/46 monsters in
 * data/monsters.json ship `"abilities": []` (an empty array, not a score
 * object) -- `[].str` is `undefined`, so every modifier becomes NaN. This
 * silently breaks any save/attack keyed off those monsters' ability scores,
 * INCLUDING the very saveType field this proposal reassigns (Trip/Pushing/
 * Disarming Attack). See findings note at bottom of this file. To keep this
 * harness's *own* results uncontaminated by that pre-existing bug, only
 * monsters with real `abilities` objects are used as combat opponents here:
 *   L1  favorable=goblin (CR 0.25)      unfavorable=gnoll (CR 0.5)
 *   L5  favorable=bugbear (CR 1)         unfavorable=ogre (CR 2)
 *   L10 favorable=veteran (CR 3)         unfavorable=voidTitan (CR 10, boss)
 * (troll/wraith/hillGiant/youngWhiteDragon -- the actual RULES.difficulty
 * L10 bracket monsters -- are ALL in the NaN-broken set; voidTitan is the
 * highest-CR monster in the file with real ability scores and stands in as
 * the L10 "unfavorable" boss case.)
 */

import { RULES, getProficiencyBonus } from '../../src/core/rulesEngine.js';
import { rollDie, rollHitPoints } from '../../src/utils/dice.js';

const TRIALS_PER_CELL = 500; // hundreds per scenario, matches role's stated floor
const ROUND_CAP = 30;

// ---------------------------------------------------------------------------
// PC builds — real point-buy (27 pts, cap 15) + real ASI progression
// (RULES.progression.asiLevels / asiIncrease). Point-buy costs verified
// against RULES.core.pointBuyCosts: 15 costs 9, the max reachable at chargen
// for ANY single stat under this table -- dumping other stats cannot push one
// stat past 15 pre-ASI. Derivation shown per level; only ASI levels <=10
// apply (RULES.progression.asiLevels = [4,8,12,16,19] -> 4 and 8 only).
// ---------------------------------------------------------------------------
const asiLevelsUnder10 = RULES.progression.asiLevels.filter((l) => l <= 10);
const asiIncrease = RULES.progression.asiIncrease;
console.log(`ASI levels <=10 (from RULES.progression.asiLevels): ${asiLevelsUnder10.join(', ')}, +${asiIncrease}/event`);

const mod = (score) => Math.floor((score - 10) / 2);

// BALANCED — str15(9)+con15(9)+dex13(5)=23/27 at chargen (int/wis/cha dumped
// to 8, inert for Dedication either way). ASI L4 -> con17, ASI L8 -> str17.
const BALANCED = {
  1: { str: 15, con: 15, dex: 13 },
  5: { str: 15, con: 17, dex: 13 },
  10: { str: 17, con: 17, dex: 13 },
};

// DUMP-OUTWARD — str8(0)+con15(9)+dex15(9)=18/27 at chargen (str dumped to
// the point-buy floor; the freed 9 points can't push con/dex past the 15 cap,
// so they go to inert stats). ASI L4 -> con17, ASI L8 -> dex17. Prowess is
// NEVER invested in, at chargen or via ASI -- this is the literal "max the
// Inward stats, dump the (now purely offensive) Outward stat" build the
// plan's own non-negotiable-checks section asks to test.
const DUMP_OUTWARD = {
  1: { str: 8, con: 15, dex: 15 },
  5: { str: 8, con: 17, dex: 15 },
  10: { str: 8, con: 17, dex: 17 },
};

function pcChassis(level, build) {
  const scores = build[level];
  const strMod = mod(scores.str);
  const conMod = mod(scores.con);
  const pb = getProficiencyBonus(level);
  // Character.js:216-225 calculateMaxHP: level-1 term uses hitDie+conMod,
  // EVERY subsequent level re-rolls using the CHARACTER'S CURRENT (final)
  // conMod, not the historical value at that level -- verified by reading
  // the loop body directly. That means an ASI invested in CON late still
  // retroactively raises HP earned at every prior level. Modeled faithfully
  // here with takeAverage=true (isolates the attribute-score effect from
  // HP-roll noise; combat rolls below stay fully Math.random()-driven).
  let maxHP = 10 + conMod; // hitDie 10 (Dedication, classes.json)
  for (let l = 2; l <= level; l++) {
    maxHP += rollHitPoints(10, conMod, true);
  }
  const dexMod = mod(scores.dex);
  // EVASION_AC_MODE models the plan's UNBUILT future split-AC (evasion=Insight
  // stacked additively on top of armor soak) to bound Q2's "does this widen
  // the free-third-stat gap" risk. Off by default -- today's live Character.js
  // calculateAC() formula is DEX-independent for chainMail (addDexModifier:false),
  // confirmed in data/items.json. This is a documented hypothetical, not a
  // claim about current behavior.
  const evasionBonus = process.env.EVASION_AC_MODE ? dexMod : 0;
  return {
    strMod,
    conMod,
    dexMod,
    attackBonus: strMod + pb,
    damageDie: 8, // longsword, data/items.json
    ac: 18 + evasionBonus, // chainMail(16, addDexModifier:false) + shield(+2) -- DEX-independent today
    maxHP,
    attacksPerRound: level >= 5 ? 2 : 1, // carried from dedication-l1-10-dpr.js precedent
  };
}

// ---------------------------------------------------------------------------
// Monster profiles — real data/monsters.json + data/items.json values only,
// restricted to monsters with real (non-NaN) ability score objects.
// ---------------------------------------------------------------------------
function monsterProficiency(cr) {
  return RULES.combat.monsterProficiencyByCR[cr] ?? 2;
}

const MONSTERS = {
  goblin: { cr: 0.25, ac: 15, hpDice: [2, 6], hpBonus: 0, atkMod: 2 /* dex, finesse scimitar */, dmgDie: 6, dmgBonus: 2, attacksPerRound: 1 },
  gnoll: { cr: 0.5, ac: 15, hpDice: [5, 8], hpBonus: 0, atkMod: 2 /* str bite */, dmgDie: 4, dmgBonus: 2, attacksPerRound: 1 },
  bugbear: { cr: 1, ac: 16, hpDice: [5, 8], hpBonus: 5, atkMod: 2 /* str morningstar */, dmgDie: 8, dmgBonus: 2, attacksPerRound: 1 },
  ogre: { cr: 2, ac: 11, hpDice: [7, 10], hpBonus: 21, atkMod: 4 /* str greatclub */, dmgDie: 8, dmgBonus: 4, attacksPerRound: 1 },
  veteran: { cr: 3, ac: 17, hpDice: [9, 8], hpBonus: 18, atkMod: 3 /* str longsword */, dmgDie: 8, dmgBonus: 3, attacksPerRound: 1 },
  voidTitan: { cr: 10, ac: 17, hpDice: [16, 12], hpBonus: 96, atkBonusOverride: 11 /* explicit in data */, dmgDie: 10, dmgDieCount: 3, dmgBonus: 6, attacksPerRound: 2 },
};

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
  };
}

// ---------------------------------------------------------------------------
// Combat resolution — mirrors CombatManager.js's real attack/damage shape:
// d20+attackBonus vs AC, nat20 always hits & doubles damage dice, damage =
// dice + flat bonus. No fighting style / maneuver / Resolve modeled -- base
// chassis only, isolating the ability-score effect under test.
// ---------------------------------------------------------------------------
function rollAttack(attackBonus, targetAC) {
  const nat = rollDie(20);
  const hit = nat === 20 || nat + attackBonus >= targetAC;
  return { hit, crit: nat === 20 };
}

function rollDamage(dieCount, dieSides, bonus, crit) {
  const dice = crit ? dieCount * 2 : dieCount;
  let total = bonus;
  for (let i = 0; i < dice; i++) total += rollDie(dieSides);
  return Math.max(0, total);
}

function simulateFight(level, build, monsterId) {
  const pc = pcChassis(level, build);
  const mon = monsterChassis(monsterId);
  let pcHP = pc.maxHP;
  let monHP = mon.maxHP;
  let round = 0;

  while (round < ROUND_CAP && pcHP > 0 && monHP > 0) {
    round++;
    for (let a = 0; a < pc.attacksPerRound && monHP > 0; a++) {
      const { hit, crit } = rollAttack(pc.attackBonus, mon.ac);
      if (hit) monHP -= rollDamage(1, pc.damageDie, pc.strMod, crit);
    }
    for (let a = 0; a < mon.attacksPerRound && pcHP > 0; a++) {
      const { hit, crit } = rollAttack(mon.attackBonus, pc.ac);
      if (hit) pcHP -= rollDamage(mon.dmgDieCount, mon.dmgDie, mon.dmgBonus, crit);
    }
  }

  return { won: monHP <= 0 && pcHP > 0, rounds: round, pcHPRemaining: Math.max(0, pcHP), pcMaxHP: pc.maxHP };
}

function runCell(level, buildName, build, monsterId) {
  let wins = 0;
  let totalRounds = 0;
  let totalHPPctOnWin = 0;
  for (let i = 0; i < TRIALS_PER_CELL; i++) {
    const r = simulateFight(level, build, monsterId);
    if (r.won) {
      wins++;
      totalHPPctOnWin += r.pcHPRemaining / r.pcMaxHP;
    }
    totalRounds += r.rounds;
  }
  return {
    level,
    build: buildName,
    monster: monsterId,
    winRate: wins / TRIALS_PER_CELL,
    avgRounds: totalRounds / TRIALS_PER_CELL,
    avgHPPctOnWin: wins > 0 ? totalHPPctOnWin / wins : 0,
  };
}

const SCENARIOS = [
  { level: 1, favorable: 'goblin', unfavorable: 'gnoll' },
  { level: 5, favorable: 'bugbear', unfavorable: 'ogre' },
  { level: 10, favorable: 'veteran', unfavorable: 'voidTitan' },
];

const results = [];
for (const { level, favorable, unfavorable } of SCENARIOS) {
  for (const [buildName, build] of [['Balanced', BALANCED], ['DumpOutward', DUMP_OUTWARD]]) {
    for (const monsterId of [favorable, unfavorable]) {
      results.push(runCell(level, buildName, build, monsterId));
    }
  }
}

console.log(`\nTrials per cell: ${TRIALS_PER_CELL}\n`);
console.log('Lvl Build        Monster     WinRate  AvgRounds  AvgHP%OnWin');
for (const r of results) {
  console.log(
    `${String(r.level).padEnd(3)} ${r.build.padEnd(12)} ${r.monster.padEnd(11)} ${(r.winRate * 100).toFixed(1).padStart(5)}%   ${r.avgRounds.toFixed(1).padStart(6)}     ${(r.avgHPPctOnWin * 100).toFixed(1).padStart(5)}%`
  );
}

console.log('\n--- Balanced vs DumpOutward delta (winRate pts, positive = Balanced ahead) ---');
for (const { level, favorable, unfavorable } of SCENARIOS) {
  for (const monsterId of [favorable, unfavorable]) {
    const bal = results.find((r) => r.level === level && r.build === 'Balanced' && r.monster === monsterId);
    const dump = results.find((r) => r.level === level && r.build === 'DumpOutward' && r.monster === monsterId);
    const delta = (bal.winRate - dump.winRate) * 100;
    console.log(`L${level} vs ${monsterId}: Balanced ${(bal.winRate * 100).toFixed(1)}% - DumpOutward ${(dump.winRate * 100).toFixed(1)}% = ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}pts`);
  }
}

// ---------------------------------------------------------------------------
// Separately verified finding (not part of the win-rate sim above, discovered
// while sourcing monster data for this harness): EncounterBuilder.js:182-189
// reads `monster.abilities.str/dex/con/...` directly. 19/46 monsters in
// data/monsters.json ship `"abilities": []`. `[].str` is `undefined` in JS,
// so `Math.floor((undefined - 10) / 2)` = NaN for EVERY ability modifier on
// those monsters. In EffectDispatcher.js's rollDefenderSave (used by Trip
// Attack / Pushing Attack / Disarming Attack today, and would be used by
// their proposed vitality-save target identically), `defender.character
// .abilityModifiers[saveType]` is NaN, so `saveRoll` (NaN + d20) is NaN, and
// `NaN < saveDC` is always `false` in JS -- the code takes the "resists"
// branch unconditionally. Confirmed by cross-referencing
// RULES.difficulty.scalingByLevel.enemyTypesByLevel against monsters.json:
//   L1 bracket (8 monsters):  0 broken
//   L5 bracket (11 monsters): 5 broken (ghoul, specter, ghast, gargoyle, manticore)
//   L7 bracket (8 monsters):  6 broken (minotaur, wight, owlbear, flameskull, ettin, mage, medusa -- 7 of 8)
//   L10 bracket (4 monsters): 4 broken -- ALL of troll, wraith, hillGiant, youngWhiteDragon
// This is independent of the str-save -> vitality-save reassignment (the bug
// is in ability-score sourcing, not save-type selection) but means Trip/
// Pushing/Disarming Attack ALREADY cannot land on the iconic L10 bracket
// monsters today, regardless of which attribute the save keys off after the
// remap. Flagged to data-agent/backend-dev as a standalone, pre-existing
// defect this diagnosis surfaced -- not something the remap creates or fixes.
