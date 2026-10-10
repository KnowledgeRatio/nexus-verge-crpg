/** Exact enumeration, not Monte Carlo: all normal d20 faces or all 400 paired faces.
 * Run: node tools/balance-sim/skill-party-exact.js > /tmp/skill-party-exact.json
 * Uses live SkillChallengeManager context/modifier and SkillRegistry.rollCheck.
 * Profiles match skill-challenge-balance.js; these are analytical fixtures, not legal builds.
 */
import fs from 'node:fs';
import { RULES, getProficiencyBonus } from '../../src/core/rulesEngine.js';
import { gameState } from '../../src/core/GameState.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import SkillChallengeManager from '../../src/systems/SkillChallengeManager.js';

const read = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));
const definitions = read('../../data/skills.json').skills;
const general = read('../../data/skillChallenges.json');
const bandit = read('../../data/skillChallenges/bandit-negotiation.json');
const relations = read('../../data/relations.json');
RULES.attributes.system = 'NVSystem';
skillRegistry.setDefinitions(definitions);
const manager = new SkillChallengeManager();
manager.skillsData = definitions;
manager.terrainChallengesData = general;
const checks = [];
function visit(value, source, path) {
    if (!value || typeof value !== 'object') {
        return;
    }
    if (value.skill && (value.dc !== undefined || value.baseDC !== undefined)) {
        checks.push({ path, source, skill: skillRegistry.normalizeId(value.skill),
            attribute: value.attribute || null, dc: value.baseDC ?? value.dc });
    }
    Object.entries(value).forEach(([key, child]) => visit(child, source, `${path}.${key}`));
}
visit(general.challenges, 'challenge', 'challenges');
visit(bandit.nodes, 'dialogue', 'bandit.nodes');
visit(relations.passiveApproachChecks, 'settlement', 'relations.passiveApproachChecks');
const profiles = {
    dedication: { prowess: 18, resilience: 18, intellect: 10, intuition: 12, presence: 10, composure: 14 },
    curiosity: { prowess: 10, resilience: 12, intellect: 18, intuition: 16, presence: 10, composure: 14 },
    audacity: { prowess: 14, resilience: 10, intellect: 12, intuition: 14, presence: 18, composure: 18 }
};
const helpModes = { solo: 0, helper: 1, twoHelpers: 2, trueParty: 1 };
const fatigueStates = { rested: 0, tired: RULES.fatigue.thresholds.tired,
    staggering: RULES.fatigue.thresholds.staggering };
let rollCount = 0;
const oldRandom = Math.random;
const oldLog = console.log;
console.log = () => {};
function enumerate(check, profile, level, rank, mode, fatigue) {
    const delta = level === 1 ? -2 : level === 10 ? 2 : 0;
    const actor = { level, proficiencyBonus: getProficiencyBonus(level),
        abilities: Object.fromEntries(Object.entries(profiles[profile]).map(([key, val]) =>
            [key, Math.max(8, Math.min(20, val + delta))])),
        skills: { [check.skill]: { proficient: rank !== 'untrained', expertise: rank === 'expert' } } };
    const companions = Array.from({ length: helpModes[mode] }, () => ({
        proficiencyBonus: actor.proficiencyBonus,
        companionMeta: { skillAssignments: [check.skill], isDowned: false }
    }));
    gameState.set('party.activeSynergies', { trueParty: mode === 'trueParty' });
    gameState.set('fatigue', { current: fatigueStates[fatigue], exhaustionLevels: 0 });
    const dc = check.source === 'challenge' ? manager.calculateAdjustedDC(check.dc, level) : check.dc;
    const options = { skillId: check.skill, attribute: check.attribute, dc, companions };
    const context = manager.getSkillCheckContext(actor, check.skill, options);
    const results = [];
    const faces = context.advantage || context.disadvantage ? 400 : 20;
    for (let i = 0; i < faces; i++) {
        const draws = faces === 20 ? [i + 1] : [Math.floor(i / 20) + 1, (i % 20) + 1];
        let cursor = 0;
        Math.random = () => (draws[cursor++] - 0.5) / 20;
        results.push(skillRegistry.rollCheck(actor, { ...options, ...context }));
        rollCount++;
    }
    Math.random = oldRandom;
    const successes = results.filter(result => result.success);
    const losses = results.filter(result => !result.success);
    const selected = [successes[Math.floor(successes.length / 2)], losses[0] || results[0], results.at(-1)].filter(Boolean);
    return { ...check, level, profile, rank, mode, fatigue, dc,
        modifier: context.modifier, probability: successes.length / faces,
        passiveSuccess: context.passiveScore >= dc,
        traces: selected.map(result => ({ rolls: result.rolls, roll: result.roll,
            modifier: result.modifier, total: result.total, dc, success: result.success })) };
}
const summaries = [];
const cells = [];
try {
    for (const level of [1, 5, 10]) {
        for (const profile of Object.keys(profiles)) {
            for (const rank of ['untrained', 'trained', 'expert']) {
                for (const mode of Object.keys(helpModes)) {
                    const own = checks.map(check => enumerate(check, profile, level, rank, mode, 'rested'));
                    cells.push(...own);
                    summaries.push({ level, profile, rank, mode,
                        meanProbability: own.reduce((sum, cell) => sum + cell.probability, 0) / own.length,
                        min: Math.min(...own.map(cell => cell.probability)),
                        max: Math.max(...own.map(cell => cell.probability)),
                        automatic: own.filter(cell => cell.probability === 1).length,
                        impossible: own.filter(cell => cell.probability === 0).length,
                        passive: own.filter(cell => cell.passiveSuccess).length });
                }
            }
        }
    }
    const example = { source: 'challenge', path: 'synthetic.DC15.Finesse', skill: 'finesse',
        attribute: 'prowess', dc: 15 };
    const fatigueExamples = Object.keys(fatigueStates).map(fatigue =>
        enumerate(example, 'dedication', 5, 'trained', 'helper', fatigue));
    const verdictTraces = [
        cells.find(cell => cell.level === 10 && cell.rank === 'expert' && cell.mode === 'trueParty' && cell.probability === 1),
        cells.find(cell => cell.level === 10 && cell.rank === 'expert' && cell.mode === 'trueParty' && cell.probability < 0.75),
        cells.find(cell => cell.level === 1 && cell.rank === 'untrained' && cell.mode === 'solo' && cell.probability < 0.4)
    ].filter(Boolean);
    console.log = oldLog;
    console.log(JSON.stringify({ methodology: 'Exact full d20 enumeration; no sampling uncertainty or binomial confidence interval applies. Authored checks equally weighted; not encounter frequencies. Profiles are analytical attributes from previous harness, not full legal characters.',
        checkCount: checks.length, rollCount, dcRange: [Math.min(...checks.map(c => c.dc)), Math.max(...checks.map(c => c.dc))],
        summaries, verdictTraces, fatigueExamples,
        retries: [0.25, 0.5, 0.75].map(p => ({ perAttempt: p,
            atLeastOneSuccess3: 1 - (1 - p) ** 3, atLeastOneSuccess5: 1 - (1 - p) ** 5,
            expectedAttempts: 1 / p })) }, null, 2));
} finally {
    Math.random = oldRandom;
    console.log = oldLog;
}
