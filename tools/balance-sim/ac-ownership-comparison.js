/**
 * Issue #42 AC ownership comparison (2026-09-22).
 *
 * Compares the live Intuition-only AC modifier with the proposed weighted blend:
 *   floor((2 * raw Intuition modifier + raw Prowess modifier) / 3)
 *
 * The harness drives Character.calculateAC(), the shared attribute resolver, and real
 * CombatManager player/monster attack paths. It does not duplicate AC, attack, damage,
 * initiative, HP, armour-cap, or monster-action math.
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

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { RULES } = await import('../../src/core/rulesEngine.js');
const { Character } = await import('../../src/systems/Character.js');
const { CombatManager, Combatant } = await import('../../src/systems/CombatManager.js');
const { gameState } = await import('../../src/core/GameState.js');

const items = JSON.parse(readFileSync(path.join(repoRoot, 'data/items.json'), 'utf8'));
const monsters = JSON.parse(readFileSync(path.join(repoRoot, 'data/monsters.json'), 'utf8')).monsters;
const classes = JSON.parse(readFileSync(path.join(repoRoot, 'data/classes.json'), 'utf8')).classes;
const dedication = classes.find(entry => entry.id === 'dedication');
const longsword = items.weapons.find(entry => entry.id === 'longsword');

const TRIALS = 500;
const ROUND_CAP = 30;
const originalSystem = RULES.attributes.system;
const originalACEvasion = RULES.attributes.derivedStatMap.acEvasion;

const FORMULAS = {
    intuitionOnly: { type: 'single', attributes: ['intuition'] },
    intuition2Prowess1: {
        type: 'blend',
        attributes: ['intuition', 'prowess'],
        weights: [2, 1]
    }
};

const BUILDS = {
    HighProwess: {
        1: { prowess: 15, intuition: 8, resilience: 15 },
        5: { prowess: 17, intuition: 8, resilience: 15 },
        10: { prowess: 19, intuition: 8, resilience: 15 }
    },
    Balanced: {
        1: { prowess: 13, intuition: 13, resilience: 15 },
        5: { prowess: 14, intuition: 14, resilience: 15 },
        10: { prowess: 15, intuition: 15, resilience: 15 }
    },
    HighIntuition: {
        1: { prowess: 8, intuition: 15, resilience: 15 },
        5: { prowess: 8, intuition: 17, resilience: 15 },
        10: { prowess: 8, intuition: 19, resilience: 15 }
    }
};

const ARMOUR_BY_LEVEL = {
    1: { unarmoured: null, light: 'leatherArmor', medium: 'hideArmor', heavy: 'ringMail' },
    5: { unarmoured: null, light: 'studdedLeather', medium: 'breastplate', heavy: 'chainMail' },
    10: { unarmoured: null, light: 'studdedLeather', medium: 'halfPlate', heavy: 'plateMail' }
};

const OPPONENT_BY_LEVEL = { 1: 'gnoll', 5: 'ogre', 10: 'veteran' };

function armourById(id) {
    return id ? items.armor.find(entry => entry.id === id) : null;
}

function averageHP(formula) {
    const match = String(formula).match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) return Number.parseInt(formula, 10) || 10;
    const [, count, sides, bonus] = match;
    return Math.floor(Number(count) * (Number(sides) / 2 + 0.5)) + Number(bonus || 0);
}

function makePC(level, buildName, armourCategory) {
    const core = BUILDS[buildName][level];
    return new Character({
        name: `${buildName}-${armourCategory}`,
        level,
        class: dedication,
        background: {},
        species: {},
        baseAbilities: {
            ...core,
            intellect: 10,
            presence: 10,
            composure: 10
        },
        equipment: {
            mainHand: { ...longsword },
            offHand: null,
            armor: armourById(ARMOUR_BY_LEVEL[level][armourCategory])
        }
    });
}

function makeMonster(monster) {
    const cr = monster.challengeRating ?? monster.cr ?? 0;
    const maxHP = averageHP(monster.hitPoints);
    const abilities = { ...monster.abilitiesNVSystem };
    return {
        name: monster.name,
        monsterId: monster.id,
        level: 1,
        proficiencyBonus: RULES.encounters.proficiencyByCR[cr] ?? 2,
        maxHP,
        currentHP: maxHP,
        ac: monster.armorClass,
        abilities,
        abilityModifiers: Object.fromEntries(
            Object.entries(abilities).map(([key, score]) => [key, Math.floor((score - 10) / 2)])
        ),
        monsterActions: structuredAttacks(monster),
        damageResistances: monster.damageResistances || [],
        damageImmunities: monster.damageImmunities || [],
        damageVulnerabilities: monster.damageVulnerabilities || [],
        fightingStyle: null,
        equipment: { mainHand: null, offHand: null, armor: null }
    };
}

function structuredAttacks(monster) {
    return (monster.actions || []).filter(action => [
        'meleeWeaponAttack', 'rangedWeaponAttack', 'meleeSpellAttack', 'rangedSpellAttack'
    ].includes(action.type));
}

function ci95(rate, n = TRIALS) {
    return 1.96 * Math.sqrt((rate * (1 - rate)) / n);
}

function percent(rate) {
    return `${(rate * 100).toFixed(1)}% ± ${(ci95(rate) * 100).toFixed(1)}pts`;
}

const realLog = console.log.bind(console);
async function quiet(fn) {
    console.log = () => {};
    try {
        return await fn();
    } finally {
        console.log = realLog;
    }
}

function hashSeed(text) {
    let hash = 2166136261;
    for (const char of text) {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function mulberry32(seed) {
    return function random() {
        let value = seed += 0x6D2B79F5;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

async function pairedTrial(seedKey, fn) {
    const originalRandom = Math.random;
    Math.random = mulberry32(hashSeed(seedKey));
    try {
        return await fn();
    } finally {
        Math.random = originalRandom;
    }
}

async function simulateFight(formulaName, level, buildName, armourCategory) {
    RULES.attributes.derivedStatMap.acEvasion = FORMULAS[formulaName];
    const playerCharacter = makePC(level, buildName, armourCategory);
    const monsterDef = monsters.find(entry => entry.id === OPPONENT_BY_LEVEL[level]);
    const monsterCharacter = makeMonster(monsterDef);
    const cm = new CombatManager();
    const pc = new Combatant(playerCharacter, 'player', 'pc');
    const enemy = new Combatant(monsterCharacter, 'enemy', 'enemy');
    cm.combatants = [pc, enemy];
    cm.playerCombatant = pc;
    cm.enemyCombatants = [enemy];
    cm.companionCombatants = [];
    cm.coverType = null;
    cm.coverWinner = null;
    gameState.data.ui.messageLog = [];
    gameState.data.items = items.weapons;
    gameState.data.fatigue = { current: 0, exhaustionLevels: 0 };
    gameState.set('character', playerCharacter);
    gameState.set('seed', 'ac-ownership-balance');
    cm.rollInitiative();

    const trace = [];
    let enemyAttacks = 0;
    let enemyHits = 0;
    let round = 0;
    while (round < ROUND_CAP && pc.hp > 0 && enemy.hp > 0) {
        round++;
        for (const actor of cm.turnOrder) {
            if (pc.hp <= 0 || enemy.hp <= 0) break;
            actor.startTurn();
            if (actor === pc) {
                await cm.attack(pc, enemy);
            } else {
                const action = monsterCharacter.monsterActions[0];
                if (action) {
                    enemyAttacks++;
                    const hpBefore = pc.hp;
                    await cm.executeMonsterAttack(enemy, pc, action);
                    if (pc.hp < hpBefore) enemyHits++;
                }
            }
        }
        trace.push(`R${round}: PC ${Math.max(0, pc.hp)}/${pc.maxHP}, enemy ${Math.max(0, enemy.hp)}/${enemy.maxHP}`);
    }
    return {
        won: enemy.hp <= 0 && pc.hp > 0,
        rounds: round,
        pcHPPct: Math.max(0, pc.hp) / pc.maxHP,
        enemyAttacks,
        enemyHits,
        ac: playerCharacter.ac,
        trace
    };
}

async function runCell(formulaName, level, buildName, armourCategory) {
    let wins = 0;
    let rounds = 0;
    let enemyAttacks = 0;
    let enemyHits = 0;
    const traces = [];
    for (let trial = 0; trial < TRIALS; trial++) {
        const seedKey = `${level}:${buildName}:${armourCategory}:${trial}`;
        const result = await quiet(() => pairedTrial(
            seedKey,
            () => simulateFight(formulaName, level, buildName, armourCategory)
        ));
        if (result.won) wins++;
        rounds += result.rounds;
        enemyAttacks += result.enemyAttacks;
        enemyHits += result.enemyHits;
        traces.push(result);
    }
    return {
        formulaName,
        level,
        buildName,
        armourCategory,
        opponent: OPPONENT_BY_LEVEL[level],
        ac: traces[0].ac,
        winRate: wins / TRIALS,
        avgRounds: rounds / TRIALS,
        incomingHitRate: enemyAttacks ? enemyHits / enemyAttacks : 0,
        traces
    };
}

try {
    RULES.attributes.system = 'NVSystem';

    console.log('Issue #42 — AC ownership comparison');
    console.log(`Trials: ${TRIALS} per cell; 72 cells; real Character + CombatManager paths`);
    console.log('Candidate: floor((2 × raw Intuition modifier + raw Prowess modifier) / 3)');

    console.log('\nDeterministic attainable AC table');
    console.log('Lvl Build          Armour      Intuition-only  2:1 blend');
    for (const level of [1, 5, 10]) {
        for (const buildName of Object.keys(BUILDS)) {
            for (const armourCategory of Object.keys(ARMOUR_BY_LEVEL[level])) {
                RULES.attributes.derivedStatMap.acEvasion = FORMULAS.intuitionOnly;
                const currentAC = makePC(level, buildName, armourCategory).ac;
                RULES.attributes.derivedStatMap.acEvasion = FORMULAS.intuition2Prowess1;
                const candidateAC = makePC(level, buildName, armourCategory).ac;
                console.log(`${String(level).padEnd(3)} ${buildName.padEnd(14)} ${armourCategory.padEnd(11)} ${String(currentAC).padStart(8)} ${String(candidateAC).padStart(13)}`);
            }
        }
    }

    const results = [];
    for (const formulaName of Object.keys(FORMULAS)) {
        for (const level of [1, 5, 10]) {
            for (const buildName of Object.keys(BUILDS)) {
                for (const armourCategory of Object.keys(ARMOUR_BY_LEVEL[level])) {
                    results.push(await runCell(formulaName, level, buildName, armourCategory));
                }
            }
        }
    }

    console.log('\nCombat results');
    console.log('Lvl Opponent Formula                Build          Armour      AC  Win rate (95% CI)      Incoming hit');
    for (const result of results) {
        console.log(
            `${String(result.level).padEnd(3)} ${result.opponent.padEnd(8)} ${result.formulaName.padEnd(22)} ` +
            `${result.buildName.padEnd(14)} ${result.armourCategory.padEnd(11)} ${String(result.ac).padStart(2)}  ` +
            `${percent(result.winRate).padEnd(24)} ${(result.incomingHitRate * 100).toFixed(1)}%`
        );
    }

    console.log('\nFormula deltas (candidate minus current; positive win-rate delta favours candidate)');
    for (const candidate of results.filter(result => result.formulaName === 'intuition2Prowess1')) {
        const current = results.find(result =>
            result.formulaName === 'intuitionOnly'
            && result.level === candidate.level
            && result.buildName === candidate.buildName
            && result.armourCategory === candidate.armourCategory
        );
        const delta = candidate.winRate - current.winRate;
        const distinguishable = Math.abs(delta) > ci95(candidate.winRate) + ci95(current.winRate);
        console.log(
            `L${candidate.level} ${candidate.buildName}/${candidate.armourCategory}: ` +
            `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}pts ` +
            `(${distinguishable ? 'distinguishable' : 'not distinguishable'})`
        );
    }

    console.log('\nRepresentative traces (cells with the largest absolute formula deltas)');
    const paired = results
        .filter(result => result.formulaName === 'intuition2Prowess1')
        .map(candidate => {
            const current = results.find(result =>
                result.formulaName === 'intuitionOnly'
                && result.level === candidate.level
                && result.buildName === candidate.buildName
                && result.armourCategory === candidate.armourCategory
            );
            return { candidate, current, delta: candidate.winRate - current.winRate };
        })
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 3);
    for (const { candidate, current, delta } of paired) {
        const medianCandidate = [...candidate.traces].sort((a, b) => a.rounds - b.rounds)[Math.floor(TRIALS / 2)];
        const candidateLoss = candidate.traces.find(trace => !trace.won);
        const bestCandidate = [...candidate.traces].sort((a, b) => b.pcHPPct - a.pcHPPct)[0];
        console.log(`  L${candidate.level} ${candidate.buildName}/${candidate.armourCategory}: current ${percent(current.winRate)}, candidate ${percent(candidate.winRate)}, delta ${(delta * 100).toFixed(1)}pts`);
        console.log(`    median: ${medianCandidate.trace.join(' | ')}`);
        console.log(`    loss: ${(candidateLoss || medianCandidate).trace.join(' | ')}`);
        console.log(`    best margin: ${bestCandidate.trace.join(' | ')}`);
    }
} finally {
    RULES.attributes.system = originalSystem;
    RULES.attributes.derivedStatMap.acEvasion = originalACEvasion;
}
