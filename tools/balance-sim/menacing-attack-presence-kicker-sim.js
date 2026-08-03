/**
 * Menacing Attack Presence-kicker review (balance-engineer, 2026-07-30).
 *
 * Context: docs/plans/2026-07-30-attribute-system-remap.md (six-attribute
 * remap, NOT implemented in code) is under active review. game-designer has
 * proposed a narrower, not-yet-written-into-the-plan retrofit: give the
 * existing Menacing Attack maneuver (data/abilities.json:123-145, Dedication/
 * Exemplar L3, an onHitSaveOrCondition frighten effect) a Presence "kicker"
 * on its save DC:
 *
 *   menaceDC = 8 + proficiencyBonus + Prowess_mod + floor(Presence_mod / 2)
 *
 * resisted by the Composure save Menacing Attack already migrates to under
 * the plan's LOCKED decision #2 (Composure consolidation, WIS+CHA -> single
 * Composure save). Neither Prowess nor Presence nor Composure exist in code
 * today -- this is a Monte Carlo of a HYPOTHETICAL formula layered on the
 * REAL engine, following the established pattern in
 * tools/balance-sim/attribute-remap-dump-dominance-sim.js:
 *   - Prowess/Vitality stand in 1:1 for the live STR/CON numbers already in
 *     Character.js/CombatManager.js (plan's own "clean 1:1" mapping).
 *   - Presence and the DC-kicker term have NO current analog anywhere in
 *     the engine -- modeled explicitly as the proposed formula, computed
 *     inline in this harness (maneuverSaveDC in EffectDispatcher.js:427 is
 *     unexported and today hardcodes str/dex with no Presence term, so it
 *     cannot be imported and monkey-patched without editing source, which
 *     this role does not do).
 *   - Composure (defender save stat) modeled as decision #2's own averaging
 *     rule applied to each monster's real wis/cha scores from
 *     data/monsters.json: floor((rawMod(wis) + rawMod(cha)) / 2) -- the
 *     "engine rule: fractional attribute rounding" section of the plan
 *     (sum raw, floor once) applied to decision #2's "average the two
 *     values when merging" instruction, since ordinary (non-dragon) monster
 *     blocks have no separate structured save-bonus fields to average
 *     directly, only raw ability scores.
 *
 * Everything else -- turn structure, d20 attack rolls, advantage/disadvantage
 * resolution (roll-twice-take-worse per CombatManager.js:620-624), the
 * Frightened-imposes-disadvantage-on-its-own-attacks rule (CombatManager.js:
 * 601, 955), condition clear-at-end-of-possessor's-own-turn (Combatant.
 * endTurn(), CombatManager.js:2981-2988), and the maneuver-die size table
 * (mirrors EffectDispatcher.js:403-408 resolveManeuverDieSides, unexported,
 * copied verbatim: d6 below L7, d8 at L7-9, d10 at L10+) are faithful
 * reproductions of the REAL live mechanics, not reimplemented guesses.
 *
 * PC builds -- reuses the exact DC-delta table independently verified via
 * RULES.core.pointBuyCosts + the CONFIRMED real level-up mechanic (see
 * finding below) immediately before this harness was written:
 *
 *   *** CORRECTION TO PRIOR ASSUMPTION ***
 *   The prior harness (attribute-remap-dump-dominance-sim.js) assumed ASI
 *   only lands at RULES.progression.asiLevels ([4,8,12,16,19], 5e RAW gating)
 *   because that is what companions get (CompanionManager.js:711, gated by
 *   asiLevels). Reading the PLAYER path (LevelUpManager.js renderASISelection
 *   / validateAndUpdateUI: "Check ASI selection (always required)", no
 *   asiLevels check anywhere in LevelUpManager.js or Character.js's
 *   applyLevelUpSelections) shows the player character gets a +1 ASI to a
 *   single chosen ability EVERY level-up, unconditionally, not just at
 *   traditional 5e ASI levels. That's 9 ASI events by level 10 (levels
 *   2-10), not 2. This harness uses the CORRECTED every-level mechanic for
 *   the player builds under test. Flagged separately to game-designer as an
 *   asymmetry worth its own look (player vs. companion ASI cadence
 *   diverges) -- not fixed here, diagnosis only.
 *
 *   PureProwess baseline (Presence dumped to point-buy floor 8, never
 *   invested): chargen Prowess15/Vitality15 (27-pt buy, both at the 15 cap,
 *   cost 9+9=18 of 27), all subsequent ASIs into Prowess until the 20 cap,
 *   then into Vitality.
 *   DreadKnight (Presence invested "alongside" Prowess, per the proposal's
 *   own framing): identical chargen floor+cap (Prowess15/Vitality15), but the
 *   free 9 remaining chargen points buy Presence 8->15 (exact cost, dumping
 *   Insight/Composure/Intellect instead), then ASIs ALTERNATE Prowess/
 *   Presence every level. This is the max plausible "genuinely invests
 *   alongside Prowess" build, not the degenerate "abandon Prowess entirely"
 *   case (that case was also checked arithmetically and DC-delta went
 *   NEGATIVE from L6 on -- consistent with the proposal's own claim, see
 *   report).
 *
 * Verified DC deltas (DreadKnight - PureProwess baseline, arithmetic, no
 * dice involved, cross-checked against a standalone script before writing
 * this harness):
 *   L3 +1, L4 +0, L5 +0, L6 +0, L7 +1, L8 +1, L9 +1, L10 +2
 *
 * This harness tests whether that +1/+2 DC swing (small in isolation)
 * produces a disproportionate frightened-uptime / win-rate effect once run
 * through real combat resolution across hundreds of trials.
 *
 * Monster picks -- same NaN-safe list as attribute-remap-dump-dominance-sim.js
 * (data/monsters.json 19/46 entries ship abilities:[] -> NaN ability mods,
 * see .claude/agent-memory/balance-engineer/reference_monsters_abilities_nan_bug.md):
 *   L3  favorable=goblin (CR .25)   unfavorable=bugbear (CR 1)
 *   L5  favorable=bugbear (CR 1)    unfavorable=ogre (CR 2)
 *   L7  favorable=ogre (CR 2)       unfavorable=veteran (CR 3)
 *   L10 favorable=veteran (CR 3)    unfavorable=voidTitan (CR 10, boss)
 */

import { RULES, getProficiencyBonus } from '../../src/core/rulesEngine.js';
import { rollDie, rollHitPoints } from '../../src/utils/dice.js';

const TRIALS_PER_CELL = 500; // hundreds per scenario, matches role's stated floor
const ROUND_CAP = 30;

const mod = (score) => Math.floor((score - 10) / 2);

// ---------------------------------------------------------------------------
// PC builds (see header derivation) -- level: { prowess, vitality, presence }
// ---------------------------------------------------------------------------
const PURE_PROWESS = {
  3: { prowess: 17, vitality: 15, presence: 8 },
  5: { prowess: 19, vitality: 15, presence: 8 },
  7: { prowess: 20, vitality: 16, presence: 8 },
  10: { prowess: 20, vitality: 19, presence: 8 },
};
const DREAD_KNIGHT = {
  3: { prowess: 16, vitality: 15, presence: 16 },
  5: { prowess: 17, vitality: 15, presence: 17 },
  7: { prowess: 18, vitality: 15, presence: 18 },
  10: { prowess: 20, vitality: 15, presence: 19 },
};
// Q3 regression check -- pure-Prowess build but Presence left at the natural
// point-buy floor (8) instead of the formula's "Presence 0 (mod)" reference
// point (score 10-11). Same chassis as PURE_PROWESS in every other respect;
// only the DC formula differs (adds the floor(Presence_mod/2) term with a
// NEGATIVE Presence_mod, since 8 -> mod -1, not 0).
const PRESENCE_DUMPED_WITH_KICKER = PURE_PROWESS;

function resolveManeuverDieSides(level) {
  // Mirrors EffectDispatcher.js:403-408 (unexported, copied verbatim).
  if (level >= 10) return 10;
  if (level >= 7) return 8;
  return 6;
}

function menaceDC(prof, prowessMod, presenceMod, useKicker) {
  const base = 8 + prof + prowessMod;
  return useKicker ? base + Math.floor(presenceMod / 2) : base;
}

// ---------------------------------------------------------------------------
// Monster chassis -- same values as attribute-remap-dump-dominance-sim.js,
// plus real wis/cha scores (data/monsters.json) for the Composure-save proxy.
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
  // Decision #2's "average the two values when merging" + the plan's own
  // "engine rule" (sum raw fractional contributions, floor once) applied to
  // a plain monster ability-score pair (no structured save-bonus field to
  // average directly, unlike the 3 blocking dragon cases decision #2 covers).
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
  // mode: 'normal' | 'advantage' | 'disadvantage' -- CombatManager.js:614-627
  // rollDie() (src/utils/dice.js:11-13) returns a plain number, not {natural}.
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

function simulateFight(level, build, monsterId, useKicker) {
  const pc = pcChassis(level, build);
  const mon = monsterChassis(monsterId);
  let pcHP = pc.maxHP;
  let monHP = mon.maxHP;
  let resolve = pc.maxResolve;
  let round = 0;
  let monsterFrightenedThisRound = false; // set on PC's turn, read on monster's turn this same round
  let monsterTurnsTotal = 0;
  let monsterTurnsFrightened = 0;

  const dc = menaceDC(pc.prof, pc.prowessMod, pc.presenceMod, useKicker);

  while (round < ROUND_CAP && pcHP > 0 && monHP > 0) {
    round++;

    // --- PC turn ---
    for (let a = 0; a < pc.attacksPerRound && monHP > 0; a++) {
      const attemptMenace = resolve > 0; // dread-knight-style: spend Resolve on Menacing Attack whenever available
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
            monsterFrightenedThisRound = true; // applies for the monster's upcoming turn
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
      // Frightened clears at the end of the possessor's (monster's) own turn -- CombatManager.js:2981-2988
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

function runCell(level, buildName, build, monsterId, useKicker) {
  let wins = 0;
  let totalRounds = 0;
  let totalHPPctOnWin = 0;
  let totalUptime = 0;
  let dc = null;
  for (let i = 0; i < TRIALS_PER_CELL; i++) {
    const r = simulateFight(level, build, monsterId, useKicker);
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

const results = [];
for (const { level, favorable, unfavorable } of SCENARIOS) {
  for (const monsterId of [favorable, unfavorable]) {
    results.push(runCell(level, 'PureProwess (no kicker)', PURE_PROWESS, monsterId, false));
    results.push(runCell(level, 'DreadKnight (kicker)', DREAD_KNIGHT, monsterId, true));
    results.push(runCell(level, 'PresenceDumped8 (kicker)', PRESENCE_DUMPED_WITH_KICKER, monsterId, true)); // Q3 regression check
  }
}

console.log('Lvl Build                       Monster     DC  WinRate  AvgRounds  FrightenedUptime%  AvgHP%OnWin');
for (const r of results) {
  console.log(
    `${String(r.level).padEnd(3)} ${r.build.padEnd(27)} ${r.monster.padEnd(11)} ${String(r.dc).padStart(2)}  ${(r.winRate * 100).toFixed(1).padStart(5)}%   ${r.avgRounds.toFixed(1).padStart(6)}     ${(r.avgFrightenedUptime * 100).toFixed(1).padStart(6)}%          ${(r.avgHPPctOnWin * 100).toFixed(1).padStart(5)}%`
  );
}

console.log('\n--- DreadKnight vs PureProwess delta (winRate pts, positive = DreadKnight ahead) ---');
for (const { level, favorable, unfavorable } of SCENARIOS) {
  for (const monsterId of [favorable, unfavorable]) {
    const pure = results.find((r) => r.level === level && r.build === 'PureProwess (no kicker)' && r.monster === monsterId);
    const dk = results.find((r) => r.level === level && r.build === 'DreadKnight (kicker)' && r.monster === monsterId);
    const deltaWin = (dk.winRate - pure.winRate) * 100;
    const deltaUptime = (dk.avgFrightenedUptime - pure.avgFrightenedUptime) * 100;
    console.log(
      `L${level} vs ${monsterId}: DC ${pure.dc}->${dk.dc} (Δ${dk.dc - pure.dc}) | WinRate ${pure.winRate * 100}%->${dk.winRate * 100}% (Δ${deltaWin >= 0 ? '+' : ''}${deltaWin.toFixed(1)}pts) | FrightenedUptime ${(pure.avgFrightenedUptime * 100).toFixed(1)}%->${(dk.avgFrightenedUptime * 100).toFixed(1)}% (Δ${deltaUptime >= 0 ? '+' : ''}${deltaUptime.toFixed(1)}pts)`
    );
  }
}

console.log('\n--- Q3 regression check: PresenceDumped8(kicker) vs PureProwess(no kicker), same chassis ---');
for (const { level, favorable, unfavorable } of SCENARIOS) {
  for (const monsterId of [favorable, unfavorable]) {
    const pure = results.find((r) => r.level === level && r.build === 'PureProwess (no kicker)' && r.monster === monsterId);
    const dumped = results.find((r) => r.level === level && r.build === 'PresenceDumped8 (kicker)' && r.monster === monsterId);
    console.log(`L${level} vs ${monsterId}: DC ${pure.dc} (today) vs ${dumped.dc} (kicker, Presence 8/mod -1) -- Δ=${dumped.dc - pure.dc}`);
  }
}
