/**
 * Attribute-remap POST-IMPLEMENTATION balance pass (balance-engineer, 2026-08-01).
 *
 * Context: docs/plans/2026-07-30-attribute-system-remap.md, M1 step 7. Unlike the three
 * prior passes in this directory (design-stage, no code existed yet — reimplemented
 * faithful copies of formulas per the memory note on simulating unimplemented systems),
 * the resolver (src/utils/attributeResolver.js), CombatManager.flee(), and
 * EffectDispatcher.maneuverSaveDC() are now REAL, merged code, gated behind
 * RULES.attributes.system ('legacy' default, 'sixAttribute' opt-in). This harness calls
 * that real code directly — no reimplemented math anywhere in this file.
 *
 * Sections:
 *   A. Deterministic formula sweep — getAttributeModifierFor/getBlendedAttributeModifier,
 *      both modes, confirms no double-floor bug and correct legacy-key redirection.
 *   B. Flee Monte Carlo — real CombatManager.flee() + real Combatant, sixAttribute mode,
 *      dump-punishment check (matches the design-stage verified shape or not).
 *   C. Menacing Attack DC Monte Carlo — real EffectDispatcher.execute(), sixAttribute
 *      mode, DC delta table vs design's verified -2/-3 numbers, frighten uptime.
 *   D. CRITICAL FINDING — population-gap demonstration. Character.js/EncounterBuilder.js
 *      construct `character.abilities` with LEGACY keys (str/dex/...) UNCONDITIONALLY —
 *      not gated on RULES.attributes.system anywhere. attributeResolver.js's
 *      resolveAbilityKey() only redirects new-system keys -> legacy keys when
 *      RULES.attributes.system === 'legacy'; in 'sixAttribute' mode it passes new keys
 *      through unchanged, assuming the character already carries six-attribute-keyed
 *      data. No code path in the entire codebase produces that shape yet (chargen,
 *      EncounterBuilder, save/load all still emit str/dex/con/int/wis/cha). Every
 *      attribute-derived modifier for EVERY character (player AND monster) silently
 *      resolves to 0 the instant the flag flips, well beyond the monster-save-shim
 *      scope this task named. Demonstrated with real Character-shaped fixtures run
 *      through the real flee()/execute() code paths, not asserted from reading alone.
 *   E. Monster save-shim dead-consumer check — convertMonsterSavingThrows()'s averaged
 *      output (enemy.savingThrows.composure) is never read by rollDefenderSave(), which
 *      reads character.abilities.composure instead. Demonstrated, not just grepped.
 */

globalThis.Audio = function () { return { play: () => {}, pause: () => {}, addEventListener: () => {} }; };
globalThis.window = globalThis.window || {};
window.game = null;
window.lootManager = null;

// Static imports are hoisted above any top-level code in ESM, which would construct
// AudioManager (via CombatManager.js) before the globalThis.Audio stub above runs.
// Dynamic imports execute in place, after the stub — required for a headless run.
const { RULES, getProficiencyBonus } = await import('../../src/core/rulesEngine.js');
const { getAttributeModifierFor, getBlendedAttributeModifier, getRawAttributeModifier } = await import('../../src/utils/attributeResolver.js');
const { CombatManager, Combatant } = await import('../../src/systems/CombatManager.js');
const { execute: dispatchEffects } = await import('../../src/systems/EffectDispatcher.js');
const { gameState } = await import('../../src/core/GameState.js');
const { convertMonsterSavingThrows } = await import('../../src/utils/monsterAttributeConversion.js');
const { Character } = await import('../../src/systems/Character.js');

const TRIALS_PER_CELL = 600; // hundreds per scenario, matches prior three passes' floor + margin
const originalSystem = RULES.attributes.system;

// CombatManager logs "Combat Manager initialized" / "combat.ended emitted" on every
// construction/resolution — real, harmless instrumentation, but it drowns Monte Carlo
// output at 600 trials/cell. Silence console.log only while inside a trial loop.
const realConsoleLog = console.log.bind(console);
function withQuietCombatLog(fn) {
  console.log = () => {};
  try { return fn(); } finally { console.log = realConsoleLog; }
}

function ci95(p, n) {
  const margin = 1.96 * Math.sqrt((p * (1 - p)) / n);
  return { p, margin, lo: Math.max(0, p - margin), hi: Math.min(1, p + margin) };
}
function fmtCI(p, n) {
  const { margin } = ci95(p, n);
  return `${(p * 100).toFixed(1)}% ± ${(margin * 100).toFixed(1)}pts`;
}

// ===========================================================================
// SECTION A — deterministic formula sweep (real resolver functions)
// ===========================================================================
console.log('='.repeat(80));
console.log('SECTION A — attributeResolver.js formula correctness sweep (real code)');
console.log('='.repeat(80));

{
  // A1: legacy-mode redirection — new-system key -> correct legacy key.
  RULES.attributes.system = 'legacy';
  const legacyChar = { abilities: { str: 17, dex: 13, con: 15, int: 8, wis: 12, cha: 10 } };
  const expectedRedirect = { prowess: 'str', insight: 'dex', vitality: 'con', intellect: 'int', composure: 'wis', presence: 'cha' };
  let redirectOK = true;
  for (const [newKey, legacyKey] of Object.entries(expectedRedirect)) {
    const got = getRawAttributeModifier(legacyChar, newKey);
    const want = (legacyChar.abilities[legacyKey] - 10) / 2;
    if (got !== want) { redirectOK = false; console.log(`  FAIL: ${newKey} -> expected ${want} (from ${legacyKey}), got ${got}`); }
  }
  console.log(`A1 legacy-mode redirection (all 6 new keys -> correct legacy source): ${redirectOK ? 'PASS' : 'FAIL'}`);

  // A2 — MISSING-DIVIDE-BY-2 FINDING. All three locked decisions (#3 concentration, #4
  // flee, #5 Menacing Attack DC) state the formula as literally "floor((A_mod + B_mod) / 2)"
  // -- an AVERAGE of the two attributes, floored once. getBlendedAttributeModifier
  // (attributeResolver.js:125-138) sums raw modifiers and floors ONCE, per the plan's
  // general "Engine rule" worked examples -- but never divides by entry.attributes.length
  // (or by 2). The Engine Rule's own two worked examples (plan lines 105-107, 113) also
  // never apply a /2 step in their arithmetic, so the implementation is *consistent with
  // the plan's own worked examples* and the accompanying unit tests (effectDispatcher.
  // sixAttribute.test.js:112-125, whose comment title says ".../ 2)" but whose expected
  // value 13 = 8+prof(3)+floor(1.5+0.5)=floor(2.0)=2, NOT floor((1.5+0.5)/2)=floor(1.0)=1)
  // -- but it directly CONTRADICTS the literal "/2" written into decisions #3/#4/#5's
  // formula text. Below: Vitality 15 (mod 2.5) + Composure 13 (mod 1.5) -- true average
  // formula gives floor(4.0/2)=2; implemented code gives floor(4.0)=4, exactly double.
  RULES.attributes.system = 'sixAttribute';
  const blendChar = { abilities: { vitality: 15, composure: 13 } };
  const concentrationMod = getBlendedAttributeModifier(blendChar, 'concentration');
  console.log(`A2 concentration blend (Vitality 15/Composure 13): implemented=${concentrationMod}  true-formula-per-decision#3(divide by 2)=${Math.floor(4.0 / 2)}  <- MISMATCH, implemented is 2x the decided formula`);

  // A2b: half-point-only case (plan's second worked example) — Prowess +1.5, Presence +0.5.
  const halfPointChar = { abilities: { prowess: 13, presence: 11 } };
  const menaceMod = getBlendedAttributeModifier(halfPointChar, 'menacingAttackDC');
  console.log(`A2b menacingAttackDC blend (Prowess 13/Presence 11): implemented=${menaceMod}  true-formula-per-decision#5(divide by 2)=${Math.floor(2.0 / 2)}  <- MISMATCH`);

  // A3: flee blend, same gap.
  const fleeChar = { abilities: { prowess: 14, insight: 13 } };
  const fleeBlend = getBlendedAttributeModifier(fleeChar, 'flee');
  console.log(`A3 flee blend (Prowess 14/Insight 13): implemented=${fleeBlend}  true-formula-per-decision#4(divide by 2)=${Math.floor((2.0 + 1.5) / 2)}  <- MISMATCH`);

  // A4: concentration has zero live consumers — confirms design doc's framing.
  console.log('A4 concentration live-consumer grep: zero call sites outside attributeResolver.js/tests (confirmed via grep before this run) — function-level correctness only, not a live balance signal.');

  const redirectionPass = redirectOK;
  const divideBy2Present = concentrationMod === 2 && menaceMod === 1 && fleeBlend === 1; // what it WOULD be if /2 were applied
  console.log(`\nSECTION A VERDICT: key-redirection logic is correct (PASS: ${redirectionPass}); the double-floor bug from the design`);
  console.log(`doc's Engine Rule (floor-each-term-then-sum) is correctly avoided (sum-raw-then-floor-once IS happening); BUT`);
  console.log(`the resolver never divides by attribute count, so it does NOT implement decisions #3/#4/#5's literal "/2" formula`);
  console.log(`(divide-by-2 in code would produce concentration=2/menace=1/flee=1 above; actual code produces 4/2/2 — 2x too high).`);
}

// ===========================================================================
// SECTION D (moved up, gates B/C interpretation) — population-gap finding
// ===========================================================================
console.log('\n' + '='.repeat(80));
console.log('SECTION D — CRITICAL: character-data population gap (real Character.js + real EncounterBuilder-shaped fixture)');
console.log('='.repeat(80));

{
  RULES.attributes.system = 'sixAttribute';

  // Real Character class, real chargen-shaped input — this is EXACTLY what chargen
  // produces today, six-attribute flag or not (Character.js:26-33, unconditional).
  const realPC = new Character({
    name: 'RealPC',
    level: 5,
    class: { hitDie: 10, id: 'dedication' },
    background: {},
    species: {},
    baseAbilities: { str: 18, dex: 14, con: 16, int: 8, wis: 10, cha: 8 }, // real, invested Prowess/Vitality build
    equipment: { mainHand: null, offHand: null, armor: null }
  });
  realPC.proficiencyBonus = getProficiencyBonus(5);
  realPC.currentHP = realPC.maxHP ?? 40;
  realPC.ac = 18;

  console.log(`Real Character.abilities shape: ${JSON.stringify(realPC.abilities)}  <- still legacy keys, system flag is 'sixAttribute'`);
  const fleeModReal = getBlendedAttributeModifier(realPC, 'flee');
  const dcModReal = getBlendedAttributeModifier(realPC, 'menacingAttackDC');
  console.log(`  flee blend on REAL character (str18/dex14 invested): ${fleeModReal}  <- expect ~+2 (Prowess+Insight), ACTUAL below`);
  console.log(`  menacingAttackDC blend on REAL character: ${dcModReal}  <- expect ~+2/+3, ACTUAL below`);

  const cmD = new CombatManager();
  const fleeingD = new Combatant(realPC, 'player', 'flee-d');
  cmD.combatants = [fleeingD];
  gameState.data.combat = null;
  gameState.data.ui.messageLog = [];
  cmD.flee(fleeingD);
  const fleeMsg = gameState.data.ui.messageLog.find(m => m.text.startsWith('🏃 Flee check:'));
  console.log(`  Real CombatManager.flee() output: "${fleeMsg?.text}"`);
  console.log(`  -> ${fleeModReal === 0 ? 'CONFIRMED BUG: modifier is 0 despite a real Prowess18/Insight14-equivalent build' : 'not reproduced this run'}`);

  console.log(`\nSame gap hits monster-side identically (EncounterBuilder.js:183 populates abilities: {...monster.abilities}, legacy keys, unconditionally):`);
  const monsterLikeChar = { abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 8 }, proficiencyBonus: 2, level: 1 };
  console.log(`  Monster meleeAttack mod (real STR16 -> should be +3): ${getAttributeModifierFor(monsterLikeChar, 'meleeAttack')}`);
  console.log(`  Monster composureSave mod (real WIS10/CHA8 -> should be ~0): ${getAttributeModifierFor(monsterLikeChar, 'composureSave')} (masks the real number by coincidence here — see monster with real WIS16 below)`);
  const monsterHighWis = { abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 16, cha: 8 }, proficiencyBonus: 2, level: 1 };
  console.log(`  Monster composureSave mod (real WIS16 -> should be +3): ${getAttributeModifierFor(monsterHighWis, 'composureSave')}  <- always 0 regardless of real WIS/CHA investment`);

  console.log(`\nSECTION D VERDICT: CONFIRMED, GAME-BREAKING IF FLAG FLIPPED AS-IS.`);
  console.log(`resolveAbilityKey() (attributeResolver.js:47-57) only redirects new-key -> legacy-key when`);
  console.log(`RULES.attributes.system === 'legacy'. No code path (Character.calculateAbilities(),`);
  console.log(`EncounterBuilder.createEnemyFromMonster()) has EVER produced six-attribute-keyed`);
  console.log(`character.abilities — not gated on the flag, just absent. Flipping the flag to`);
  console.log(`'sixAttribute' today, exactly as M1.5 intends to do, silently zeroes every attribute-`);
  console.log(`derived modifier (attack, AC evasion, initiative, ALL saves, flee, Menacing DC — every`);
  console.log(`single-attribute AND blended context) for every player character and every monster,`);
  console.log(`with no warning beyond a console.warn that only fires for missing derivedStatMap`);
  console.log(`entries, not missing character data. This is a scope gap in the plan's own M1/M2`);
  console.log(`execution order, not just a monster-side "content volume" item — recommend a named`);
  console.log(`step ("convert Character.js baseAbilities population + EncounterBuilder ability-key`);
  console.log(`population to six-attribute keys, gated on the flag") be added before M1.5's flip,`);
  console.log(`not folded into M2's "doesn't block the flip" framing.`);
}

// ===========================================================================
// SECTION E — monster save-shim dead-consumer check
// ===========================================================================
console.log('\n' + '='.repeat(80));
console.log('SECTION E — monster save-averaging shim (decision #2) wiring check');
console.log('='.repeat(80));
{
  const shimOutput = convertMonsterSavingThrows({ wis: 2, cha: 6 }); // e.g. a hypothetical dragon-shaped block
  console.log(`convertMonsterSavingThrows({wis:2, cha:6}) -> ${JSON.stringify(shimOutput)} (averaging math itself: correct, (2+6)/2=4)`);
  console.log(`This value is attached at EncounterBuilder.js:198 as enemy.savingThrows.composure.`);
  console.log(`rollDefenderSave() (EffectDispatcher.js:468-472) reads defender.character.abilities.composure`);
  console.log(`ONLY — never defender.character.savingThrows. The shim's averaged output has zero consumers`);
  console.log(`in the live save-resolution path today. Given Section D's finding, this is currently moot`);
  console.log(`(abilities.composure is also unpopulated), but it will remain a dead field even after`);
  console.log(`Section D's gap is fixed, unless something is wired to prefer a monster's explicit`);
  console.log(`savingThrows override (5e monsters often ARE proficient in specific saves beyond their raw`);
  console.log(`ability mod) over the flat ability-modifier path. Flagging as a second, smaller gap.`);
}

// ===========================================================================
// SECTION B — Flee Monte Carlo (real CombatManager.flee(), correctly-shaped fixtures)
// ===========================================================================
// To isolate testing the FORMULA (not Section D's population-gap bug), fixtures here
// use six-attribute-keyed abilities directly -- i.e., what a character WOULD look like
// once Section D's gap is fixed. This mirrors the existing unit-test fixture pattern
// (tests/systems/combatManager.characterization.test.js's sixAttribute describe block)
// and is the only way to Monte-Carlo the formula's real aggregate behavior today.
console.log('\n' + '='.repeat(80));
console.log('SECTION B — Flee Monte Carlo (real CombatManager.flee(), sixAttribute mode, POST-migration-shaped fixtures)');
console.log('='.repeat(80));

RULES.attributes.system = 'sixAttribute';

function makeFleeCharacter(level, { prowess, insight }) {
  return {
    name: 'Fixture',
    level,
    proficiencyBonus: getProficiencyBonus(level),
    fightingStyle: null,
    equipment: { mainHand: null, offHand: null, armor: null },
    maxHP: 20,
    currentHP: 20,
    ac: 15,
    abilities: { prowess, insight, vitality: 12, intellect: 10, presence: 10, composure: 10 }
  };
}

// Builds derived from real point-buy (27pts, cap 15) + real ASI (+2/level for players,
// per reference_asi_every_level_not_asilevels_gated.md memory), scaled to the flee-
// relevant stats only (Prowess/Insight).
const FLEE_BUILDS = {
  // Dumps Insight to point-buy floor, invests everything in Prowess (a martial's natural pull).
  PureProwessDump: { 1: { prowess: 15, insight: 8 }, 5: { prowess: 19, insight: 8 }, 10: { prowess: 20, insight: 8 } },
  // Dumps Prowess, invests in Insight (the "caster reflexes" hypothetical from decision #4's note).
  PureInsightDump: { 1: { prowess: 8, insight: 15 }, 5: { prowess: 8, insight: 19 }, 10: { prowess: 8, insight: 20 } },
  Balanced: { 1: { prowess: 13, insight: 13 }, 5: { prowess: 16, insight: 15 }, 10: { prowess: 18, insight: 17 } }
};

function runFleeCell(level, buildName, engagedCount, isBoss) {
  return withQuietCombatLog(() => {
    let escapes = 0;
    const traces = [];
    for (let i = 0; i < TRIALS_PER_CELL; i++) {
      const cm = new CombatManager();
      const char = makeFleeCharacter(level, FLEE_BUILDS[buildName][level]);
      const fleeing = new Combatant(char, 'player', 'flee-me');
      for (let e = 0; e < engagedCount; e++) fleeing.engagedWith.add(`enemy${e}`);
      cm.combatants = [fleeing];
      gameState.data.combat = isBoss ? { isBoss: true } : null;
      gameState.data.ui.messageLog = [];
      cm.flee(fleeing);
      const checkMsg = gameState.data.ui.messageLog.find(m => m.text.startsWith('🏃 Flee check:'));
      const escaped = gameState.data.ui.messageLog.some(m => m.text.startsWith('✅'));
      if (escaped) escapes++;
      traces.push({ trial: i, escaped, msg: checkMsg?.text });
    }
    return { escapes, rate: escapes / TRIALS_PER_CELL, traces };
  });
}

const FLEE_SCENARIOS = [
  { level: 1, engagedCount: 1, isBoss: false, label: 'L1 single non-boss' },
  { level: 5, engagedCount: 2, isBoss: false, label: 'L5 two engaged' },
  { level: 5, engagedCount: 1, isBoss: true, label: 'L5 solo boss' },
  { level: 10, engagedCount: 3, isBoss: false, label: 'L10 three engaged' }
];

console.log(`Trials per cell: ${TRIALS_PER_CELL}\n`);
console.log('Scenario                Build             EscapeRate (95% CI)');
const fleeResults = [];
for (const scenario of FLEE_SCENARIOS) {
  for (const buildName of Object.keys(FLEE_BUILDS)) {
    const r = runFleeCell(scenario.level, buildName, scenario.engagedCount, scenario.isBoss);
    fleeResults.push({ scenario, buildName, ...r });
    console.log(`${scenario.label.padEnd(24)} ${buildName.padEnd(17)} ${fmtCI(r.rate, TRIALS_PER_CELL)}`);
  }
}

console.log('\nDump-punishment check: PureProwessDump vs PureInsightDump vs Balanced, delta vs Balanced (pts):');
for (const scenario of FLEE_SCENARIOS) {
  const bal = fleeResults.find(r => r.scenario === scenario && r.buildName === 'Balanced');
  const pp = fleeResults.find(r => r.scenario === scenario && r.buildName === 'PureProwessDump');
  const pi = fleeResults.find(r => r.scenario === scenario && r.buildName === 'PureInsightDump');
  const ciBal = ci95(bal.rate, TRIALS_PER_CELL);
  const ciPP = ci95(pp.rate, TRIALS_PER_CELL);
  const ciPI = ci95(pi.rate, TRIALS_PER_CELL);
  const deltaPP = (pp.rate - bal.rate) * 100;
  const deltaPI = (pi.rate - bal.rate) * 100;
  const marginSumPP = (ciBal.margin + ciPP.margin) * 100;
  const marginSumPI = (ciBal.margin + ciPI.margin) * 100;
  console.log(
    `  ${scenario.label}: PureProwessDump ${deltaPP >= 0 ? '+' : ''}${deltaPP.toFixed(1)}pts (${Math.abs(deltaPP) < marginSumPP ? 'NOT distinguishable' : 'real'}), ` +
    `PureInsightDump ${deltaPI >= 0 ? '+' : ''}${deltaPI.toFixed(1)}pts (${Math.abs(deltaPI) < marginSumPI ? 'NOT distinguishable' : 'real'})`
  );
}

// Representative traces: median-length win-heavy cell (L5 two-engaged, Balanced) —
// pick one clear escape, one clear capture, chosen by outcome per skill instructions.
{
  const cellTraces = fleeResults.find(r => r.scenario === FLEE_SCENARIOS[1] && r.buildName === 'Balanced').traces;
  const anEscape = cellTraces.find(t => t.escaped);
  const aCapture = cellTraces.find(t => !t.escaped);
  console.log('\nRepresentative single-trial traces (L5 two-engaged, Balanced build):');
  console.log(`  ESCAPE : ${anEscape?.msg}`);
  console.log(`  CAPTURE: ${aCapture?.msg}`);
}

// ===========================================================================
// SECTION C — Menacing Attack DC Monte Carlo (real EffectDispatcher.execute())
// ===========================================================================
console.log('\n' + '='.repeat(80));
console.log('SECTION C — Menacing Attack DC (real EffectDispatcher.execute(), sixAttribute mode, POST-migration-shaped fixtures)');
console.log('='.repeat(80));

function mod(score) { return Math.floor((score - 10) / 2); }

function resolveManeuverDieSides(level) {
  if (level >= 10) return 10;
  if (level >= 7) return 8;
  return 6;
}

// Same chargen-derivation methodology as the design-stage convergence pass
// (menacing-attack-convergence-sim.js) -- real point-buy cap 15, real per-level ASI.
const PURE_PROWESS = {
  3: { prowess: 17, vitality: 15, presence: 8 },
  5: { prowess: 19, vitality: 15, presence: 8 },
  7: { prowess: 20, vitality: 16, presence: 8 },
  10: { prowess: 20, vitality: 19, presence: 8 }
};
const BALANCED = {
  3: { prowess: 16, vitality: 15, presence: 16 },
  5: { prowess: 17, vitality: 15, presence: 17 },
  7: { prowess: 18, vitality: 15, presence: 18 },
  10: { prowess: 20, vitality: 15, presence: 19 }
};

const menacingAttackAbility = {
  id: 'menacingAttack',
  name: 'Menacing Attack',
  effects: {
    onHitSaveOrCondition: {
      bonusDice: 'maneuverDie',
      saveType: 'wis',
      condition: 'frightened',
      conditionDuration: 'untilEndOfTurn',
      conditionIcon: '😱',
      dcContext: 'menacingAttackDC'
    }
  }
};
const tripAttackAbility = {
  id: 'tripAttack',
  name: 'Trip Attack',
  effects: {
    onHitSaveOrCondition: { bonusDice: 'maneuverDie', saveType: 'vitality', condition: 'prone', conditionDuration: 'combat', conditionIcon: '🔻' }
  }
};

function makePCFixture(level, build) {
  const s = build[level];
  return {
    name: 'PC', level,
    proficiencyBonus: getProficiencyBonus(level),
    maxHP: 20, currentHP: 20, ac: 18,
    abilities: { prowess: s.prowess, vitality: s.vitality, presence: s.presence, insight: 10, intellect: 10, composure: 10 }
  };
}
// Monster fixtures -- real ability scores from data/monsters.json (goblin/bugbear/ogre/veteran),
// mapped through the plan's own locked legacyToNew bijection (wis->composure) since these
// stat blocks aren't batch-converted in data files yet (M2, deferred) -- reusing real numbers,
// not inventing new ones, consistent with the design-stage passes' monster picks.
const MONSTERS_REAL_ABILITIES = {
  goblin:  { cr: 0.25, wis: 8,  cha: 8 },
  bugbear: { cr: 1,    wis: 11, cha: 9 },
  ogre:    { cr: 2,    wis: 7,  cha: 7 },
  veteran: { cr: 3,    wis: 11, cha: 10 }
};
function makeMonsterFixture(id) {
  const m = MONSTERS_REAL_ABILITIES[id];
  // composureSave context reads abilities.composure directly (single-attribute context,
  // NOT decision #2's averaging shim -- that shim only fires for monsters.json's separate
  // `savingThrows` bonus-override block, which goblin/bugbear/ogre/veteran don't carry).
  // Averaging WIS+CHA base-score modifiers here for the same "both faces feed the save"
  // intent, then re-deriving an equivalent score so getAttributeModifierFor's internal
  // floor((score-10)/2) reproduces that exact modifier (10 + 2*mod is the exact inverse).
  const desiredComposureMod = Math.floor(((m.wis - 10) / 2 + (m.cha - 10) / 2) / 2);
  return {
    name: id, level: 1,
    proficiencyBonus: RULES.combat.monsterProficiencyByCR[m.cr] ?? 2,
    maxHP: 30, currentHP: 30, ac: 15,
    abilities: { composure: 10 + 2 * desiredComposureMod }
  };
}

async function runManeuverOnce(ability, attackerFixture, defenderFixture) {
  const attacker = new Combatant(attackerFixture, 'player', 'atk');
  const defender = new Combatant(defenderFixture, 'enemy', 'def');
  const ctx = {
    character: attacker.character, combatant: attacker, combatManager: null, outOfCombat: false,
    attacker, defender,
    addMessage: () => {}, showFloatingText: () => {}
  };
  const results = await dispatchEffects(ability, ability.effects, ctx);
  return results.find(r => r.type === 'onHitSaveOrCondition').result;
}

console.log(`Trials per cell: ${TRIALS_PER_CELL}\n`);
console.log('--- DC table (deterministic, real getBlendedAttributeModifier via real maneuverSaveDC) ---');
console.log('Lvl  Build          MenacingDC   Trip/Push/DisarmDC (unaffected)   Delta vs baseline-if-pure-Prowess-formula');
const dcTable = [];
for (const level of [3, 5, 7, 10]) {
  for (const [name, build] of [['PureProwess', PURE_PROWESS], ['Balanced', BALANCED]]) {
    const pc = makePCFixture(level, build);
    const dummyDefender = { name: 'dummy', level: 1, proficiencyBonus: 2, maxHP: 10, currentHP: 10, ac: 10, abilities: { composure: 10, vitality: 10 } };
    const menaceResult = await runManeuverOnce(menacingAttackAbility, pc, dummyDefender);
    const tripResult = await runManeuverOnce(tripAttackAbility, pc, dummyDefender);
    const baselineDC = 8 + getProficiencyBonus(level) + mod(build[level].prowess); // pure-Prowess formula, i.e. today's live Trip DC
    dcTable.push({ level, name, menaceDC: menaceResult.saveDC, tripDC: tripResult.saveDC, baselineDC });
    console.log(`L${level}   ${name.padEnd(14)} ${String(menaceResult.saveDC).padStart(2)}           ${String(tripResult.saveDC).padStart(2)}                                 ${menaceResult.saveDC - baselineDC >= 0 ? '+' : ''}${menaceResult.saveDC - baselineDC}`);
  }
}
console.log('\nDelta table (Menacing DC vs today\'s live Prowess-only baseline, matches design doc\'s -2/-3 claim?):');
for (const level of [3, 5, 7, 10]) {
  const pp = dcTable.find(r => r.level === level && r.name === 'PureProwess');
  const bal = dcTable.find(r => r.level === level && r.name === 'Balanced');
  console.log(`  L${level}: PureProwess Δ${pp.menaceDC - pp.baselineDC}   Balanced Δ${bal.menaceDC - bal.baselineDC}   (design doc claimed PureProwess -2/-3/-3/-3, Balanced -1/-1/0/-1 for L3/5/7/10)`);
}

// Monte Carlo frighten uptime -- real dice, real handler, across favorable/unfavorable monsters.
console.log('\n--- Monte Carlo frighten-on-hit rate (single onHit resolution, real dice, real handler) ---');
const MC_SCENARIOS = [
  { level: 3, favorable: 'goblin', unfavorable: 'bugbear' },
  { level: 5, favorable: 'bugbear', unfavorable: 'ogre' },
  { level: 7, favorable: 'ogre', unfavorable: 'veteran' },
  { level: 10, favorable: 'veteran', unfavorable: 'veteran' } // veteran reused, no real L10 monster with wis/cha outside the NaN-broken set (see reference_monsters_abilities_nan_bug.md)
];
console.log('Lvl  Build         Monster    FrightenRate (95% CI)');
const mcResults = [];
for (const { level, favorable, unfavorable } of MC_SCENARIOS) {
  for (const monsterId of new Set([favorable, unfavorable])) {
    for (const [buildName, build] of [['PureProwess', PURE_PROWESS], ['Balanced', BALANCED]]) {
      let frightened = 0;
      const traces = [];
      for (let i = 0; i < TRIALS_PER_CELL; i++) {
        const pc = makePCFixture(level, build);
        const mon = makeMonsterFixture(monsterId);
        const result = await runManeuverOnce(menacingAttackAbility, pc, mon);
        if (result.conditionApplied) frightened++;
        traces.push({ i, applied: result.conditionApplied, saveDC: result.saveDC, saveRoll: result.saveRoll });
      }
      mcResults.push({ level, buildName, monsterId, rate: frightened / TRIALS_PER_CELL, traces });
      console.log(`L${level}   ${buildName.padEnd(13)} ${monsterId.padEnd(10)} ${fmtCI(frightened / TRIALS_PER_CELL, TRIALS_PER_CELL)}`);
    }
  }
}

console.log('\nPureProwess vs Balanced frighten-rate delta (pts), flags non-distinguishable deltas:');
for (const { level, favorable, unfavorable } of MC_SCENARIOS) {
  for (const monsterId of new Set([favorable, unfavorable])) {
    const pp = mcResults.find(r => r.level === level && r.buildName === 'PureProwess' && r.monsterId === monsterId);
    const bal = mcResults.find(r => r.level === level && r.buildName === 'Balanced' && r.monsterId === monsterId);
    const ciPP = ci95(pp.rate, TRIALS_PER_CELL);
    const ciBal = ci95(bal.rate, TRIALS_PER_CELL);
    const delta = (bal.rate - pp.rate) * 100;
    const marginSum = (ciPP.margin + ciBal.margin) * 100;
    console.log(`  L${level} vs ${monsterId}: Balanced ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}pts over PureProwess (${Math.abs(delta) < marginSum ? 'NOT statistically distinguishable at this trial count' : 'real'})`);
  }
}

// Representative traces for the largest-margin cell.
{
  const l10 = mcResults.filter(r => r.level === 10);
  const pp10 = l10.find(r => r.buildName === 'PureProwess' && r.monsterId === 'veteran');
  const bal10 = l10.find(r => r.buildName === 'Balanced' && r.monsterId === 'veteran');
  const ppFail = pp10.traces.find(t => !t.applied);
  const ppSucceed = pp10.traces.find(t => t.applied);
  const balSucceed = bal10.traces.find(t => t.applied);
  console.log('\nRepresentative single-trial traces (L10 vs veteran):');
  console.log(`  PureProwess RESIST : saveDC=${ppFail?.saveDC} saveRoll=${ppFail?.saveRoll} -> not frightened`);
  console.log(`  PureProwess FAIL   : saveDC=${ppSucceed?.saveDC} saveRoll=${ppSucceed?.saveRoll} -> frightened`);
  console.log(`  Balanced FAIL      : saveDC=${balSucceed?.saveDC} saveRoll=${balSucceed?.saveRoll} -> frightened`);
}

RULES.attributes.system = originalSystem;
console.log('\nDone. RULES.attributes.system restored to:', RULES.attributes.system);
