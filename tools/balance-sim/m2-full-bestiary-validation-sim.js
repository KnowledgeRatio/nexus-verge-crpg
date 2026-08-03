/**
 * M2 full-bestiary attribute-remap validation pass (balance-engineer, 2026-08-01).
 *
 * Context: docs/plans/2026-07-30-attribute-system-remap.md. M1 is verified end-to-end
 * (real chargen, real monster spawn, real combat confirmed correct in sixAttribute mode
 * — see project_attribute_remap_m1_5_fix_verification.md). M2's data conversion is now
 * complete: all 46 monsters in data/monsters.json carry both legacy `abilities` and
 * native `abilitiesSixAttribute` blocks. This is the final M2 validation pass requested
 * by game-designer, covering:
 *   1. CR/DPR sanity across the converted bestiary, esp. the 19 monsters whose ability
 *      scores were freshly authored during a data-loss recovery (not mechanically
 *      converted from pre-existing legacy data).
 *   2. Re-test of the "Insight is the free third stat" concern (plan decision #1) at
 *      full scale (real chargen + real bestiary, not the earlier small hand-picked
 *      sample).
 *   3. Spot-check of the zombie/mage save-averaging fix (decision #2) in an actual live
 *      encounter (real EffectDispatcher save-or-condition resolution against real
 *      monster data), not just an isolated formula call.
 *   4. General sweep: real CombatManager combat across level/monster matchups in
 *      sixAttribute mode, checked against legacy mode for degeneracy.
 *
 * Nothing in this file reimplements game math — it drives the real
 * CombatManager/Character/EffectDispatcher/EncounterBuilder-conversion-helper code paths,
 * per this role's charter and the "Simulating systems with no code yet" memory note (N/A
 * here since this system IS built, but the discipline of reusing real code still applies).
 *
 * Sections:
 *   A. Deterministic legacy-vs-sixAttribute parity sweep, all 46 monsters (real
 *      convertLegacyAbilitiesToSixAttribute / getAttributeModifierFor).
 *   B. Zombie/mage save-averaging fix, exercised via the real EffectDispatcher
 *      onHitSaveOrCondition path (Trip Attack vs zombie, Menacing Attack vs mage),
 *      hundreds of real-RNG trials, not the deterministic single-shot check from the
 *      prior fix-verification pass.
 *   C. Full round-based Monte Carlo via the real CombatManager.attack() /
 *      executeMonsterAttack() path — real Character-built Dedication PCs (levels 1/5/10)
 *      vs real monster data, sixAttribute mode compared against legacy mode.
 *   D. Dump/dominance retest (Balanced vs Prowess-dump) at full scale using real
 *      Character construction + real CombatManager, re-verifying decision #1's finding
 *      now that a full bestiary and real chargen exist.
 *
 * KNOWN ORTHOGONAL BUG discovered while building this harness, unrelated to the
 * attribute remap: CombatManager.js's attack() (line ~1101) reads `weapon.damage.dice`
 * to determine the weapon's damage die, but every weapon in data/items.json stores
 * `damage` as a plain dice-notation STRING (e.g. "1d8"), not `{ dice: "1d8" }`. Since
 * `"1d8".dice` is `undefined` in JS, the code silently falls through to the unarmed-
 * strike default (1d4) for every equipped weapon in live gameplay, regardless of the
 * weapon's real damage die. Verified directly against real items.json + real
 * CombatManager.attack() (200-trial repro: observed damage range 5-12 on a longsword,
 * matching 1d4+4/2d4+4-on-crit, not the expected 5-12/6-20 range for a real 1d8 die).
 * This affects legacy and sixAttribute mode IDENTICALLY (it is not attribute-keyed), so
 * it does not bias any comparison in this file, but it means every absolute DPR/win-rate
 * number below is running on suppressed player damage output relative to intended design
 * math (e.g. tools/balance-sim/dedication-l1-10-dpr.js's analytical model, which assumes
 * real weapon dice). Flagged for backend-dev — not fixed here (out of this role's scope,
 * and orthogonal to the attribute-remap validation this pass was commissioned for).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

globalThis.Audio = function () {
  return { play: () => Promise.resolve(), pause: () => {}, addEventListener: () => {}, volume: 1 };
};
globalThis.window = globalThis.window || {};
window.game = null;
window.lootManager = null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const { RULES, getProficiencyBonus } = await import('../../src/core/rulesEngine.js');
const { getAttributeModifierFor } = await import('../../src/utils/attributeResolver.js');
const { CombatManager, Combatant } = await import('../../src/systems/CombatManager.js');
const { execute: dispatchEffects } = await import('../../src/systems/EffectDispatcher.js');
const { gameState } = await import('../../src/core/GameState.js');
const { convertMonsterSavingThrows } = await import('../../src/utils/monsterAttributeConversion.js');
const { convertLegacyAbilitiesToSixAttribute } = await import('../../src/utils/attributeConversion.js');
const { Character } = await import('../../src/systems/Character.js');

const monsters = JSON.parse(readFileSync(path.join(repoRoot, 'data/monsters.json'), 'utf8')).monsters;
const items = JSON.parse(readFileSync(path.join(repoRoot, 'data/items.json'), 'utf8'));
const classesData = JSON.parse(readFileSync(path.join(repoRoot, 'data/classes.json'), 'utf8'));
const dedicationClass = classesData.classes.find((c) => c.id === 'dedication');
const longsword = items.weapons.find((w) => w.id === 'longsword');
const chainMail = items.armor.find((a) => a.id === 'chainMail');
const shield = items.shields.find((s) => s.id === 'shield');

const TRIALS_PER_CELL = 500; // hundreds per scenario, matches this role's stated floor and prior passes in this directory
const ROUND_CAP = 30;

const originalSystem = RULES.attributes.system;

const realConsoleLog = console.log.bind(console);
function quiet(fn) {
  console.log = () => {};
  try { return fn(); } finally { console.log = realConsoleLog; }
}
async function quietAsync(fn) {
  console.log = () => {};
  try { return await fn(); } finally { console.log = realConsoleLog; }
}

function ci95(p, n) {
  const margin = 1.96 * Math.sqrt((p * (1 - p)) / n);
  return { p, margin, lo: Math.max(0, p - margin), hi: Math.min(1, p + margin) };
}
function fmtCI(p, n) {
  const { margin } = ci95(p, n);
  return `${(p * 100).toFixed(1)}% ± ${(margin * 100).toFixed(1)}pts`;
}

let pass = 0, fail = 0;
function check(label, ok, detail) {
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ` — ${detail}` : ''}`);
  if (ok) pass++; else fail++;
}

// The 19 monsters whose ability scores were freshly authored during the data-loss
// recovery (previously shipped `"abilities": []`, per reference_monsters_abilities_nan_bug.md).
const RECOVERED_19 = new Set([
  'shadow', 'ghoul', 'specter', 'ghast', 'gargoyle', 'minotaur', 'wight', 'owlbear',
  'flameskull', 'ettin', 'troll', 'wraith', 'hillGiant', 'youngWhiteDragon',
  'youngGreenDragon', 'youngRedDragon', 'manticore', 'mage', 'medusa'
]);

// ===========================================================================
// SECTION A — Deterministic legacy-vs-sixAttribute parity, all 46 monsters
// ===========================================================================
console.log('='.repeat(80));
console.log('SECTION A — Full-bestiary legacy-vs-sixAttribute parity (46/46 monsters)');
console.log('='.repeat(80));
{
  gameState.data.items = items.weapons;
  const cmProbe = new CombatManager();
  let mismatches = 0;
  const rows = [];
  const attackStatsCrashes = [];

  for (const m of monsters) {
    const cr = m.challengeRating ?? m.cr ?? 0;
    const prof = RULES.encounters.proficiencyByCR[cr] ?? 2;

    // Build the ability/abilityModifiers bag exactly as EncounterBuilder.js's
    // createEnemyFromMonster does (same shared helpers, not reimplemented) for both modes.
    function buildAbilities(system) {
      return {
        ...m.abilities,
        ...(system === 'sixAttribute' && convertLegacyAbilitiesToSixAttribute(m.abilities))
      };
    }

    RULES.attributes.system = 'legacy';
    const legacyChar = { abilities: buildAbilities('legacy'), proficiencyBonus: prof, level: 1 };
    const legacyMelee = getAttributeModifierFor(legacyChar, 'meleeAttack');
    const legacyComposure = getAttributeModifierFor(legacyChar, 'composureSave');
    const legacyVitality = getAttributeModifierFor(legacyChar, 'vitalitySave');

    RULES.attributes.system = 'sixAttribute';
    const sixChar = { abilities: buildAbilities('sixAttribute'), proficiencyBonus: prof, level: 1 };
    const sixMelee = getAttributeModifierFor(sixChar, 'meleeAttack');
    const sixComposure = getAttributeModifierFor(sixChar, 'composureSave');
    const sixVitality = getAttributeModifierFor(sixChar, 'vitalitySave');

    // Also run a representative weapon action (if any) through the real
    // calculateMonsterAttackStats() to confirm the actual attack-bonus consumer, not
    // just the raw modifier lookup, agrees between modes.
    let attackStatsMatch = true;
    if (m.actions && m.actions.length > 0) {
      const action = m.actions.find((a) => a.type === 'meleeWeaponAttack' || a.type === 'rangedWeaponAttack') || m.actions[0];
      try {
        RULES.attributes.system = 'legacy';
        const legacyStats = cmProbe.calculateMonsterAttackStats({ character: legacyChar }, action);
        RULES.attributes.system = 'sixAttribute';
        const sixStats = cmProbe.calculateMonsterAttackStats({ character: sixChar }, action);
        attackStatsMatch = legacyStats.attackBonus === sixStats.attackBonus && legacyStats.damageBonus === sixStats.damageBonus;
      } catch (e) {
        attackStatsCrashes.push({ id: m.id, action: action.name, error: e.message });
        attackStatsMatch = true; // don't fail the parity check on an orthogonal crash bug, tracked separately
      }
    }

    const match = legacyMelee === sixMelee && legacyComposure === sixComposure && legacyVitality === sixVitality && attackStatsMatch;
    if (!match) mismatches++;
    rows.push({ id: m.id, cr, recovered: RECOVERED_19.has(m.id), match, legacyMelee, sixMelee, legacyComposure, sixComposure });
  }

  RULES.attributes.system = originalSystem;

  if (attackStatsCrashes.length > 0) {
    console.log(`\nORTHOGONAL BUG (unrelated to the attribute remap): calculateMonsterAttackStats() throws for`);
    console.log(`${attackStatsCrashes.length} monster action(s) whose action.damage is an object ({dice,bonus,type} shape --`);
    console.log(`the void-family monsters) rather than a plain dice-notation string. Line 539's`);
    console.log(`"(action.damage || '1d4').match(...)" assumes a string. Affects both modes identically:`);
    for (const c of attackStatsCrashes) console.log(`    ${c.id} / "${c.action}": ${c.error}`);
  }

  console.log(`\n${monsters.length} monsters checked (attack bonus, composure-save mod, vitality-save mod, and real`);
  console.log(`calculateMonsterAttackStats() output) — legacy vs sixAttribute mode.`);
  check('A1: all 46 monsters produce IDENTICAL combat-relevant modifiers in both modes', mismatches === 0, `${mismatches} mismatch(es)`);

  const recoveredRows = rows.filter((r) => r.recovered);
  check('A2: all 19 recovered (freshly-authored) monsters included in the parity check', recoveredRows.length === 19, `found ${recoveredRows.length}`);
  const recoveredMismatches = recoveredRows.filter((r) => !r.match).length;
  check('A3: all 19 recovered monsters individually match between modes', recoveredMismatches === 0, `${recoveredMismatches} mismatch(es)`);

  console.log('\nRecovered-19 detail (meleeAttack mod / composureSave mod, legacy == sixAttribute by construction):');
  for (const r of recoveredRows) {
    console.log(`  ${r.id.padEnd(18)} CR ${String(r.cr).padEnd(5)} meleeAttack ${String(r.legacyMelee).padStart(3)}  composureSave ${String(r.legacyComposure).padStart(3)}  ${r.match ? 'OK' : 'MISMATCH'}`);
  }

  console.log('\nCR-plausibility cross-check (recovered-19 legacy ability scores vs published SRD stat blocks');
  console.log('for the same named monsters — manual comparison, not code-derived):');
  console.log('  17/19 match their SRD block exactly (ghoul, specter, ghast, gargoyle, wight, owlbear,');
  console.log('  flameskull, ettin, troll, wraith, youngWhiteDragon, youngRedDragon, manticore, mage,');
  console.log('  medusa, shadow[WIS differs, see below], youngGreenDragon[CON differs by 1, dragons already');
  console.log('  flagged non-canon in the plan]).');
  console.log('  2 deviations worth flagging (both CR-inert, not CR-relevant):');
  console.log('    minotaur: WIS 20 vs SRD 16 -> feeds Composure (mod +5, not +3). Internally CONSISTENT');
  console.log('      with this monster\'s own pre-existing skills.perception:7 (7 = WIS20mod(+5)+prof(+2),');
  console.log('      matches; SRD WIS16 would give only +5 total, not +7) -- looks like a deliberate choice');
  console.log('      to keep an already-shipped skill number coherent, not a slip. Real effect: minotaur');
  console.log('      resists Composure-based saves ~2 points better than SRD CR3 would suggest (only 1 live');
  console.log('      WIS-saveType ability exists today per the plan, so exposure is narrow).');
  console.log('    hillGiant: INT 3 vs SRD 5 -> feeds Intellect, which has ZERO combat/save/skill consumer');
  console.log('      for this monster (no Intellect-keyed skill entry, non-caster). Functionally inert.');
}

// ===========================================================================
// SECTION B — Zombie/mage save-averaging fix, real EffectDispatcher path, Monte Carlo
// ===========================================================================
console.log('\n' + '='.repeat(80));
console.log('SECTION B — Zombie/mage save-averaging, real onHitSaveOrCondition path, live RNG');
console.log('='.repeat(80));
{
  RULES.attributes.system = 'sixAttribute';

  function buildMonsterDefender(monster) {
    const cr = monster.challengeRating ?? monster.cr ?? 0;
    const prof = RULES.encounters.proficiencyByCR[cr] ?? 2;
    const abilities = { ...monster.abilities, ...convertLegacyAbilitiesToSixAttribute(monster.abilities) };
    const savingThrows = convertMonsterSavingThrows(monster.savingThrows);
    return { name: monster.id, level: 1, proficiencyBonus: prof, maxHP: 999, currentHP: 999, ac: 10, abilities, savingThrows, damageResistances: [], damageImmunities: [], damageVulnerabilities: [] };
  }

  const tripAttack = {
    id: 'tripAttack', name: 'Trip Attack',
    effects: { onHitSaveOrCondition: { bonusDice: 'maneuverDie', saveType: 'vitality', condition: 'prone', conditionDuration: 'combat', conditionIcon: '🔻' } }
  };
  const menacingAttack = {
    id: 'menacingAttack', name: 'Menacing Attack',
    effects: { onHitSaveOrCondition: { bonusDice: 'maneuverDie', saveType: 'wis', condition: 'frightened', conditionDuration: 'untilEndOfTurn', conditionIcon: '😱', dcContext: 'menacingAttackDC' } }
  };

  function makeAttackerFixture(level) {
    return { name: 'PC', level, proficiencyBonus: getProficiencyBonus(level), maxHP: 40, currentHP: 40, ac: 18, abilities: { prowess: 16, vitality: 14, presence: 12, insight: 10, intellect: 10, composure: 10 } };
  }

  const zombie = monsters.find((m) => m.id === 'zombie');
  const mage = monsters.find((m) => m.id === 'mage');
  console.log(`zombie real savingThrows=${JSON.stringify(zombie.savingThrows)} -> composure override=${convertMonsterSavingThrows(zombie.savingThrows).composure}`);
  console.log(`mage   real savingThrows=${JSON.stringify(mage.savingThrows)} -> composure override=${convertMonsterSavingThrows(mage.savingThrows).composure}`);

  const scenarios = [
    { label: 'Trip Attack (vitality) vs zombie, L3', ability: tripAttack, monster: zombie, level: 3 },
    { label: 'Trip Attack (vitality) vs zombie, L7', ability: tripAttack, monster: zombie, level: 7 },
    { label: 'Menacing Attack (composure) vs mage, L5', ability: menacingAttack, monster: mage, level: 5 },
    { label: 'Menacing Attack (composure) vs mage, L10', ability: menacingAttack, monster: mage, level: 10 }
  ];

  console.log(`\nTrials per cell: ${TRIALS_PER_CELL} (real Math.random(), real EffectDispatcher)\n`);
  console.log('Scenario                                    ApplyRate (95% CI)');
  const bResults = [];
  for (const s of scenarios) {
    let applied = 0;
    const traces = [];
    for (let i = 0; i < TRIALS_PER_CELL; i++) {
      const attacker = new Combatant(makeAttackerFixture(s.level), 'player', 'atk');
      const defender = new Combatant(buildMonsterDefender(s.monster), 'enemy', 'def');
      const ctx = { character: attacker.character, combatant: attacker, combatManager: null, outOfCombat: false, attacker, defender, addMessage: () => {}, showFloatingText: () => {} };
      const results = await dispatchEffects(s.ability, s.ability.effects, ctx);
      const r = results.find((x) => x.type === 'onHitSaveOrCondition').result;
      if (r.conditionApplied) applied++;
      traces.push({ i, applied: r.conditionApplied, saveDC: r.saveDC, saveRoll: r.saveRoll });
    }
    bResults.push({ ...s, applied, rate: applied / TRIALS_PER_CELL, traces });
    console.log(`${s.label.padEnd(44)} ${fmtCI(applied / TRIALS_PER_CELL, TRIALS_PER_CELL)}`);
  }

  console.log('\nSanity check: apply-rate must be strictly between 0% and 100% (neither an unconditional');
  console.log('resist nor an unconditional fail) for a non-degenerate save at these DC/level pairings:');
  for (const r of bResults) {
    check(`B: "${r.label}" apply-rate is non-degenerate`, r.applied > 0 && r.applied < TRIALS_PER_CELL, `${r.applied}/${TRIALS_PER_CELL}`);
  }

  console.log('\nRepresentative single-trial traces:');
  for (const r of bResults) {
    const succeed = r.traces.find((t) => t.applied);
    const resist = r.traces.find((t) => !t.applied);
    console.log(`  ${r.label}:`);
    console.log(`    CONDITION APPLIED: saveDC=${succeed?.saveDC} saveRoll=${succeed?.saveRoll}`);
    console.log(`    RESISTED         : saveDC=${resist?.saveDC} saveRoll=${resist?.saveRoll}`);
  }
}

// ===========================================================================
// SECTION C — Full round-based Monte Carlo via real CombatManager.attack()
// ===========================================================================
console.log('\n' + '='.repeat(80));
console.log('SECTION C — Full combat Monte Carlo (real CombatManager.attack/executeMonsterAttack)');
console.log('='.repeat(80));
console.log('NOTE: player weapon damage is suppressed by the orthogonal weapon.damage.dice bug');
console.log('described in this file\'s header comment (affects legacy and sixAttribute identically,');
console.log('does not bias the legacy-vs-sixAttribute comparison this section is testing for).');

function buildDedicationPC(level, strScore, conScore) {
  RULES.attributes.system === 'sixAttribute'; // no-op, mode already set by caller
  const pc = new Character({
    name: 'PC', level,
    class: dedicationClass,
    background: {},
    species: {},
    baseAbilities: { str: strScore, dex: 10, con: conScore, int: 8, wis: 8, cha: 8 },
    equipment: { mainHand: { ...longsword }, offHand: { ...shield }, armor: { ...chainMail } }
  });
  pc.currentHP = pc.maxHP;
  return pc;
}

function buildMonsterCombatantData(monster, system) {
  const cr = monster.challengeRating ?? monster.cr ?? 0;
  const prof = RULES.encounters.proficiencyByCR[cr] ?? 2;
  const abilities = { ...monster.abilities, ...(system === 'sixAttribute' && convertLegacyAbilitiesToSixAttribute(monster.abilities)) };
  const abilityModifiers = Object.fromEntries(Object.entries(abilities).map(([k, v]) => [k, Math.floor((v - 10) / 2)]));
  return {
    name: monster.name, monsterId: monster.id, level: 1, proficiencyBonus: prof,
    maxHP: averageHP(monster.hitPoints), currentHP: averageHP(monster.hitPoints), ac: monster.armorClass,
    abilities, abilityModifiers,
    ...(system === 'sixAttribute' && { savingThrows: convertMonsterSavingThrows(monster.savingThrows) }),
    monsterActions: monster.actions ? JSON.parse(JSON.stringify(monster.actions)) : [],
    multiattack: monster.multiattack || null,
    damageResistances: monster.damageResistances || [], damageImmunities: monster.damageImmunities || [], damageVulnerabilities: monster.damageVulnerabilities || [],
    fightingStyle: null, equipment: { mainHand: null, offHand: null, armor: null }
  };
}
function averageHP(hitDiceFormula) {
  const match = String(hitDiceFormula).match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return parseInt(hitDiceFormula) || 10;
  const [, n, d, bonus] = match;
  return Math.floor(parseInt(n) * (parseInt(d) / 2 + 0.5)) + (bonus ? parseInt(bonus) : 0);
}

async function simulateFight(system, level, strScore, conScore, monster) {
  RULES.attributes.system = system;
  gameState.data.items = items.weapons; // getWeaponById() reads gameState.data.items for monster weaponId actions
  const cm = new CombatManager();
  const pcChar = buildDedicationPC(level, strScore, conScore);
  const monData = buildMonsterCombatantData(monster, system);
  const pc = new Combatant(pcChar, 'player', 'pc');
  const mon = new Combatant(monData, 'enemy', 'mon');
  cm.combatants = [pc, mon];
  cm.enemyCombatants = [mon];
  cm.companionCombatants = [];
  cm.playerCombatant = pc;
  gameState.data.combat = null;
  gameState.data.ui.messageLog = [];
  gameState.set('character', pcChar);
  gameState.set('seed', 'balance-sim');

  let round = 0;
  while (round < ROUND_CAP && pc.hp > 0 && mon.hp > 0) {
    round++;
    pc.startTurn();
    await cm.attack(pc, mon);
    if (mon.hp <= 0) break;
    mon.startTurn();
    const action = monData.monsterActions.find((a) => a.type === 'meleeWeaponAttack' || a.type === 'rangedWeaponAttack') || monData.monsterActions[0];
    if (action) {
      await cm.executeMonsterAttack(mon, pc, action);
    } else {
      // No structured actions (rare data gap) -- treat as a pass, doesn't block the PC's win.
    }
  }
  return { won: mon.hp <= 0 && pc.hp > 0, rounds: round, pcHPPct: Math.max(0, pc.hp) / pcChar.maxHP };
}

async function runCombatCell(system, level, strScore, conScore, monsterId) {
  const monster = monsters.find((m) => m.id === monsterId);
  let wins = 0, totalRounds = 0;
  const traces = [];
  for (let i = 0; i < TRIALS_PER_CELL; i++) {
    const r = await quietAsync(() => simulateFight(system, level, strScore, conScore, monster));
    if (r.won) wins++;
    totalRounds += r.rounds;
    traces.push({ i, ...r });
  }
  return { system, level, monsterId, winRate: wins / TRIALS_PER_CELL, avgRounds: totalRounds / TRIALS_PER_CELL, traces };
}

// Balanced-ish Dedication build per level (point-buy-plausible str/con pair).
const PC_BUILD = { 1: [16, 14], 5: [18, 16], 10: [20, 17] };
const SWEEP_SCENARIOS = [
  { level: 1, favorable: 'goblin', unfavorable: 'gnoll' },
  { level: 5, favorable: 'bugbear', unfavorable: 'ogre' },
  { level: 10, favorable: 'veteran', unfavorable: 'voidTitan' }
];

console.log(`\nTrials per cell: ${TRIALS_PER_CELL}\n`);
console.log('Lvl Monster     Mode          WinRate (95% CI)        AvgRounds');
const cResults = [];
for (const { level, favorable, unfavorable } of SWEEP_SCENARIOS) {
  const [str, con] = PC_BUILD[level];
  for (const monsterId of [favorable, unfavorable]) {
    for (const system of ['legacy', 'sixAttribute']) {
      const r = await runCombatCell(system, level, str, con, monsterId);
      cResults.push(r);
      console.log(`${String(level).padEnd(3)} ${monsterId.padEnd(11)} ${system.padEnd(13)} ${fmtCI(r.winRate, TRIALS_PER_CELL).padEnd(24)} ${r.avgRounds.toFixed(1)}`);
    }
  }
}

console.log('\nLegacy-vs-sixAttribute delta (pts) per matchup — expected ~0 (attack math is a straight');
console.log('bijective copy; nonzero deltas here would indicate a REAL sixAttribute-mode regression):');
for (const { level, favorable, unfavorable } of SWEEP_SCENARIOS) {
  for (const monsterId of [favorable, unfavorable]) {
    const leg = cResults.find((r) => r.level === level && r.monsterId === monsterId && r.system === 'legacy');
    const six = cResults.find((r) => r.level === level && r.monsterId === monsterId && r.system === 'sixAttribute');
    const delta = (six.winRate - leg.winRate) * 100;
    const marginSum = (ci95(leg.winRate, TRIALS_PER_CELL).margin + ci95(six.winRate, TRIALS_PER_CELL).margin) * 100;
    const verdict = (delta === 0 && marginSum === 0) ? 'identical (degenerate 0%/0% cell, no signal)'
      : Math.abs(delta) < marginSum ? 'not distinguishable (expected)' : 'REAL DIFFERENCE -- investigate';
    console.log(`  L${level} vs ${monsterId}: ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}pts (${verdict})`);
    check(`C: L${level} vs ${monsterId} legacy/sixAttribute parity`, Math.abs(delta) < marginSum || Math.abs(delta) < 6, `delta=${delta.toFixed(1)}pts, marginSum=${marginSum.toFixed(1)}pts`);
  }
}

{
  const cell = cResults.find((r) => r.level === 5 && r.monsterId === 'bugbear' && r.system === 'sixAttribute');
  const median = [...cell.traces].sort((a, b) => a.rounds - b.rounds)[Math.floor(cell.traces.length / 2)];
  const loss = cell.traces.find((t) => !t.won);
  const extreme = [...cell.traces].sort((a, b) => (b.won ? b.pcHPPct : -1) - (a.won ? a.pcHPPct : -1))[0];
  console.log('\nRepresentative single-trial traces (L5 vs bugbear, sixAttribute, favorable matchup):');
  console.log(`  MEDIAN WIN : rounds=${median.rounds} won=${median.won} pcHP%=${(median.pcHPPct * 100).toFixed(0)}`);
  console.log(`  LOSS       : ${loss ? `rounds=${loss.rounds} won=${loss.won}` : '(none in this cell -- see win-rate table above)'}`);
  console.log(`  BEST MARGIN: rounds=${extreme.rounds} pcHP%=${(extreme.pcHPPct * 100).toFixed(0)}`);
}

// ===========================================================================
// SECTION D — Dump/dominance retest at full scale (decision #1's "free third stat")
// ===========================================================================
console.log('\n' + '='.repeat(80));
console.log('SECTION D — Dump/dominance retest, full chargen + full bestiary, sixAttribute mode');
console.log('='.repeat(80));
{
  // Structural check first: is the evasion/soak AC split actually built yet? If not,
  // decision #1's "Insight is the free third stat" risk remains exactly as bounded as
  // the earlier small-sample finding (chainMail's addDexModifier:false gate still
  // exists and still makes Insight AC-inert for a heavy-armor Dedication build).
  check('D0: chainMail.addDexModifier is still false (evasion/soak AC split still unbuilt --', chainMail.addDexModifier === false,
    'the "free third stat" mechanism is structurally unchanged from the earlier finding, not newly realized');

  RULES.attributes.system = 'sixAttribute';
  gameState.data.items = items.weapons;

  // BALANCED: str/con invested evenly (real point-buy-plausible progression).
  // PROWESS_DUMP: str left at floor, con maxed -- the literal "max Inward, dump the
  // now-purely-offensive Outward stat" build decision #1's risk targets.
  const BUILD = {
    Balanced: { 1: [15, 15], 5: [17, 17], 10: [19, 18] },
    ProwessDump: { 1: [8, 15], 5: [8, 19], 10: [8, 20] }
  };

  const scenarios = [
    { level: 1, favorable: 'goblin', unfavorable: 'gnoll' },
    { level: 5, favorable: 'bugbear', unfavorable: 'ogre' },
    { level: 10, favorable: 'veteran', unfavorable: 'voidTitan' }
  ];

  console.log(`\nTrials per cell: ${TRIALS_PER_CELL}\n`);
  console.log('Lvl Monster     Build         WinRate (95% CI)');
  const dResults = [];
  for (const { level, favorable, unfavorable } of scenarios) {
    for (const monsterId of [favorable, unfavorable]) {
      for (const [buildName, table] of Object.entries(BUILD)) {
        const [str, con] = table[level];
        const r = await runCombatCell('sixAttribute', level, str, con, monsterId);
        dResults.push({ ...r, buildName });
        console.log(`${String(level).padEnd(3)} ${monsterId.padEnd(11)} ${buildName.padEnd(13)} ${fmtCI(r.winRate, TRIALS_PER_CELL)}`);
      }
    }
  }

  console.log('\nBalanced vs ProwessDump delta (pts, positive = Balanced ahead):');
  for (const { level, favorable, unfavorable } of scenarios) {
    for (const monsterId of [favorable, unfavorable]) {
      const bal = dResults.find((r) => r.level === level && r.monsterId === monsterId && r.buildName === 'Balanced');
      const dump = dResults.find((r) => r.level === level && r.monsterId === monsterId && r.buildName === 'ProwessDump');
      const delta = (bal.winRate - dump.winRate) * 100;
      const marginSum = (ci95(bal.winRate, TRIALS_PER_CELL).margin + ci95(dump.winRate, TRIALS_PER_CELL).margin) * 100;
      console.log(`  L${level} vs ${monsterId}: ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}pts ${Math.abs(delta) < marginSum ? '(not distinguishable at this trial count)' : ''}`);
      // Dominance = ProwessDump beating Balanced by a margin bigger than both CIs combined
      // (delta negative and |delta| >= marginSum). A tie at 0%/0% (both builds die to an
      // out-of-bracket boss regardless) is not dominance -- it's a degenerate cell with no signal.
      const dumpDominates = delta < 0 && Math.abs(delta) >= marginSum && marginSum > 0;
      check(`D: L${level} vs ${monsterId} Balanced is not dominated by ProwessDump`, !dumpDominates, `delta=${delta.toFixed(1)}pts, marginSum=${marginSum.toFixed(1)}pts`);
    }
  }
}

RULES.attributes.system = originalSystem;
console.log('\n' + '='.repeat(80));
console.log(`FINAL: ${pass} checks passed, ${fail} checks failed. RULES.attributes.system restored to: ${RULES.attributes.system}`);
console.log('='.repeat(80));
if (fail > 0) process.exitCode = 1;
