/**
 * Dedication L1-10 DPR curve estimator — design-stage audit (REV 2, 2026-07-17).
 *
 * L4-L10 ability content isn't authored yet (only L3 traits are), so this is
 * NOT a CombatManager sim. It's an analytical DPR model that reuses the REAL
 * proficiency table from rulesEngine.js and the concrete numbers that ARE
 * authored (maneuver-die progression from data/levelProgression.json,
 * Sworn Strike d8/Resolve scaling from the design doc) against the LOCKED
 * L1-10 skeleton.
 *
 * REV 2 corrects two premises from the prior run:
 *   1. Craft mods are NOT zero DPR (data/practices.json Forgecraft: Keen,
 *      Tempered, Balanced are live weapon mods) — but maxModsPerItem=1 caps
 *      a single weapon to exactly ONE offensive mod active at a time, ever.
 *   2. A permanent +1 ASI of choice is granted on EVERY level-up (L2-L10,
 *      9 points total) via LevelUpManager's unconditional asiChoice gate —
 *      independent of the calling grant table. Modeled below as STR-first-
 *      to-breakpoint, then CON, per realistic play.
 *
 * REV-2 VERIFICATION NOTE (do not re-flag without re-checking):
 * data/levelProgression.json progressionByClass.dedication only grants a
 * `type:"practice"` choice at LEVEL 2 (count 1, required). Levels 4,6,7,8,9,10
 * all have `choices: []`. The design doc (docs/designjams/2026-02-26-...)
 * describes an L6 "Trait OR Practice" option but that is NOT wired into the
 * live data file. There is only ONE craft pick in the shipped skeleton, not
 * three (no L4/L6/L8 cadence exists in code). This script models the ONE
 * real pick (taken at L2) persisting for the rest of the run, and reports
 * DPR at L4/6/8/10 as checkpoint levels (per audit request), not as if new
 * picks happen there.
 */
import { getProficiencyBonus } from '../../src/core/rulesEngine.js';

const GWF_BONUS_PER_DIE = 0.33; // reroll 1s/2s on d6, expected gain vs flat d6 avg
const GREATSWORD_DICE = 2; // 2d6
const DIE_AVG = 3.5 + GWF_BONUS_PER_DIE;
const DICE_AVG_TOTAL = DIE_AVG * GREATSWORD_DICE;

// Realistic per-level ASI allocation: STR to first breakpoint (18), then CON
// to breakpoint (16), STR to cap (20), then CON again. 9 points, L2-L10.
// score: L1 STR16/CON14 -> ... -> L10 STR20/CON19
const STR_SCORE = { 1: 16, 2: 17, 3: 18, 4: 18, 5: 18, 6: 19, 7: 20, 8: 20, 9: 20, 10: 20 };
const CON_SCORE = { 1: 14, 2: 14, 3: 14, 4: 15, 5: 16, 6: 16, 7: 16, 8: 17, 9: 18, 10: 19 };
const mod = (score) => Math.floor((score - 10) / 2);

const TARGET_AC = { 1: 13, 2: 13, 3: 13, 4: 14, 5: 14, 6: 15, 7: 15, 8: 16, 9: 16, 10: 16 };

function hitChance(attackBonus, ac) {
  const needed = ac - attackBonus;
  const raw = (21 - needed) / 20;
  return Math.max(0.05, Math.min(0.95, raw));
}

function maneuverDie(level) {
  // data/levelProgression.json specializationFeatures.exemplar.maneuverDie
  if (level < 3) return 0;
  if (level < 7) return 3.5; // 1d6
  if (level < 10) return 4.5; // 1d8
  return 5.5; // 1d10
}

function swornStrikeDie(resolveSpent) {
  return resolveSpent * 4.5; // 1d8 avg per Resolve, radiant
}

function computeBaseline(level) {
  const pb = getProficiencyBonus(level);
  const strMod = mod(STR_SCORE[level]);
  const conMod = mod(CON_SCORE[level]);
  const ac = TARGET_AC[level];
  const attacksPerRound = level >= 5 ? 2 : 1;
  return { pb, strMod, conMod, ac, attacksPerRound };
}

// Best single Forgecraft weapon mod available at `level` (maxModsPerItem: 1
// — Tempered/Keen/Balanced can NEVER stack, only one active at a time).
function forgecraftDPR(level, base) {
  const attackBonus = base.pb + base.strMod;
  const pHitNone = hitChance(attackBonus, base.ac);
  const hitDmgNone = DICE_AVG_TOTAL + base.strMod;
  const dprNone = base.attacksPerRound * pHitNone * hitDmgNone;

  // Tempered: +1 flat damage (levelRequired 2)
  const dprTempered = base.attacksPerRound * pHitNone * (hitDmgNone + 1);

  // Keen: crit range 19-20 vs 20-only baseline; crit doubles DICE only (levelRequired 2)
  const extraCritDPR = base.attacksPerRound * (1 / 20) * DICE_AVG_TOTAL;
  const dprKeen = dprNone + extraCritDPR;

  // Balanced: +1 attack roll (levelRequired 6)
  let dprBalanced = -Infinity;
  if (level >= 6) {
    const pHitBal = hitChance(attackBonus + 1, base.ac);
    dprBalanced = base.attacksPerRound * pHitBal * hitDmgNone;
  }

  const options = { none: dprNone, tempered: dprTempered, keen: dprKeen, balanced: dprBalanced };
  const bestKey = Object.keys(options).reduce((a, b) => (options[b] > options[a] ? b : a));
  return { dpr: options[bestKey], mod: bestKey, pHitNone };
}

function hearthcraftDPR(level, base) {
  // Zero weapon/armor mods. Pure ASI-driven baseline (no self-targeted meal
  // bonus assumed — meal is party-wide and modeled as spent on a support
  // stat, not this character's STR, to isolate the craft-slot's DPR cost).
  const attackBonus = base.pb + base.strMod;
  const pHit = hitChance(attackBonus, base.ac);
  const hitDmg = DICE_AVG_TOTAL + base.strMod;
  return { dpr: base.attacksPerRound * pHit * hitDmg, pHit };
}

const results = [];
for (let level = 1; level <= 10; level++) {
  const base = computeBaseline(level);
  const resolveOnline = level >= 3;
  const exemplarBonus = resolveOnline ? maneuverDie(level) : 0;
  const oathBonus = resolveOnline ? swornStrikeDie(1) : 0;

  const fc = forgecraftDPR(level, base);
  const hc = hearthcraftDPR(level, base);

  // Sustainable spec add-on applied identically to both craft builds (spec
  // choice is orthogonal to craft choice) — using Forgecraft's pHit as the
  // representative hit chance for the spec bonus's hit-gated portion.
  const specAdd = (pHit, bonus) => pHit * bonus;
  const fcExemplar = fc.dpr + specAdd(fc.pHitNone, exemplarBonus);
  const fcOath = fc.dpr + specAdd(fc.pHitNone, oathBonus);
  const hcExemplar = hc.dpr + specAdd(hc.pHit, exemplarBonus);
  const hcOath = hc.dpr + specAdd(hc.pHit, oathBonus);

  results.push({
    level, pb: base.pb, strMod: base.strMod, conMod: base.conMod, ac: base.ac,
    fcMod: fc.mod,
    fcExemplar: +fcExemplar.toFixed(2), hcExemplar: +hcExemplar.toFixed(2),
    fcOath: +fcOath.toFixed(2), hcOath: +hcOath.toFixed(2),
    deltaExemplar: +(fcExemplar - hcExemplar).toFixed(2),
    deltaOath: +(fcOath - hcOath).toFixed(2),
  });
}

console.log('Lvl PB STRmod CONmod AC  FCmod     FC-Exemplar HC-Exemplar Delta  FC-Oath HC-Oath Delta');
for (const r of results) {
  console.log(
    `${String(r.level).padEnd(3)} +${r.pb} +${r.strMod}     +${r.conMod}     ${r.ac}  ${r.fcMod.padEnd(9)} ${String(r.fcExemplar).padEnd(11)} ${String(r.hcExemplar).padEnd(11)} ${String(r.deltaExemplar).padEnd(6)} ${String(r.fcOath).padEnd(7)} ${String(r.hcOath).padEnd(7)} ${r.deltaOath}`
  );
}

console.log('\n--- Growth deltas (Hearthcraft-build Exemplar sustainable DPR, isolates ASI-only growth) ---');
for (let i = 1; i < results.length; i++) {
  const prev = results[i - 1];
  const cur = results[i];
  const delta = cur.hcExemplar - prev.hcExemplar;
  const pct = ((delta / prev.hcExemplar) * 100).toFixed(0);
  const flag = delta <= 0.3 ? '  <-- STALL' : Math.abs(pct) > 40 ? '  <-- SPIKE' : '';
  console.log(`L${prev.level}->L${cur.level}: ${delta >= 0 ? '+' : ''}${delta.toFixed(2)} DPR (${pct}%)${flag}`);
}

console.log('\nCheckpoint deltas (FC minus HC), requested levels:');
for (const lvl of [4, 6, 8, 10]) {
  const r = results.find((x) => x.level === lvl);
  console.log(`L${lvl}: Exemplar delta ${r.deltaExemplar} DPR, Oath delta ${r.deltaOath} DPR, best FC mod = ${r.fcMod}`);
}
