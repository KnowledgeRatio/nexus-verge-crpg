/** Reproduce legal-build skill arithmetic: node tools/balance-sim/legal-skill-baseline.js.
 * Exhaustive dice enumeration is exact, not a Monte Carlo win-rate estimate.
 * Does not measure exposure, route frequency, travel, or completed gameplay runs.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { RULES } from '../../src/core/rulesEngine.js';
import { gameState } from '../../src/core/GameState.js';
import { Character } from '../../src/systems/Character.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import SkillChallengeManager from '../../src/systems/SkillChallengeManager.js';
import LootManager from '../../src/systems/LootManager.js';
import QuestGenerator from '../../src/systems/QuestGenerator.js';
import { SeededRandom } from '../../src/utils/rng.js';

const read = path => JSON.parse(fs.readFileSync(new URL(`../../${path}`, import.meta.url)));
const general = read('data/skillChallenges.json');
const classes = read('data/classes.json').classes;
const backgrounds = read('data/backgrounds.json').backgrounds;
const species = read('data/races.json').races.find(row => row.id === 'human');
const knight = read('data/kits.json').dedication.find(row => row.id === 'knight').preset;
const keys = ['prowess', 'resilience', 'intellect', 'intuition', 'presence', 'composure'];
const profiles = [
    { id: 'knight', calling: 'dedication', background: knight.background, skills: knight.skills,
        base: keys.map(key => knight.abilitiesNVSystem[key]), investments: ['prowess', 'resilience'], kit: 'knight' },
    { id: 'trailGuardian', calling: 'dedication', background: 'folkHero', skills: ['athletics', 'perception'],
        base: [15, 14, 8, 13, 10, 12], investments: ['prowess', 'resilience'], kit: 'custom' },
    { id: 'investigator', calling: 'curiosity', background: 'sage', skills: ['craft', 'finesse', 'empathy'],
        base: [8, 12, 15, 13, 10, 14], investments: ['intellect', 'composure'], kit: 'custom' },
    { id: 'envoy', calling: 'audacity', background: 'criminal', skills: ['craft', 'investigation', 'perception', 'empathy'],
        base: [14, 10, 12, 13, 15, 8], investments: ['presence', 'prowess'], kit: 'custom' }
];
const original = { random: Math.random, log: console.log, warn: console.warn, fetch: globalThis.fetch,
    window: globalThis.window, now: Date.now, attributeSystem: RULES.attributes.system };
const manager = new SkillChallengeManager();
manager.skillsData = read('data/skills.json').skills;
manager.terrainChallengesData = general;
RULES.attributes.system = 'NVSystem';
skillRegistry.setDefinitions(manager.skillsData);
const checks = [];
function visit(value, source, path, passive = false) {
    if (!value || typeof value !== 'object') {
        return;
    }
    if (value.skill && (value.dc !== undefined || value.baseDC !== undefined)) {
        checks.push({ path, source, skill: skillRegistry.normalizeId(value.skill),
            attribute: value.attribute || null, baseDC: value.baseDC ?? value.dc,
            mode: passive ? 'passive' : 'active' });
    }
    for (const [key, child] of Object.entries(value)) {
        visit(child, source, `${path}.${key}`, passive || key === 'passiveChecks');
    }
}
visit(general.challenges, 'challenge', 'challenges');
visit(read('data/skillChallenges/bandit-negotiation.json').nodes, 'dialogue', 'bandit.nodes');
visit(read('data/relations.json').passiveApproachChecks, 'settlement', 'relations.passiveApproachChecks', true);

function reset(fatigue) {
    gameState.set('party.activeSynergies', {});
    gameState.set('party.companions', []);
    gameState.set('fatigue', { current: fatigue, exhaustionLevels: 0, supplies: 0 });
}
function actorFor(profile, level) {
    const calling = classes.find(row => row.id === profile.calling);
    const background = backgrounds.find(row => row.id === profile.background);
    assert.ok(background, `Missing background ${profile.background}`);
    assert.equal(profile.skills.length, calling.skillChoices.choose);
    for (const skill of profile.skills) {
        assert.ok(calling.skillChoices.from.includes(skill));
        assert.ok(!background.skillProficiencies.includes(skill));
    }
    if (profile.kit === 'custom') {
        assert.deepEqual([...profile.base].sort((a, b) => a - b), [...RULES.core.standardArray].sort((a, b) => a - b));
    }
    const actor = new Character({ id: `baseline-${profile.id}`, name: profile.id, species,
        class: calling, background, baseAbilities: Object.fromEntries(keys.map((key, i) => [key, profile.base[i]])),
        skillChoices: profile.skills, fightingStyle: profile.kit === 'knight' ? knight.fightingStyle : 'defense' });
    for (let next = 2; next <= level; next++) {
        actor.levelUp(next);
        actor.applyLevelUpSelections({ asiChoice: profile.investments[next <= 5 ? 0 : 1] });
    }
    assert.ok(Object.values(actor.skills).every(skill => !skill.expertise));
    return actor;
}
function chosenTraces(results) {
    const wins = results.filter(row => row.success);
    const losses = results.filter(row => !row.success);
    return [wins[Math.floor(wins.length / 2)], losses[0], results.reduce((a, b) =>
        Math.abs(b.total - b.dc) > Math.abs(a.total - a.dc) ? b : a)].filter(Boolean)
        .map(({ rolls, total, dc, modifier, success }) => ({ rolls, total, dc, modifier, success }));
}
let rollCount = 0;
function enumerate(check, actor, fatigue, dc) {
    reset(fatigue);
    const options = { skillId: check.skill, attribute: check.attribute, dc, companions: [] };
    const context = manager.getSkillCheckContext(actor, check.skill, options);
    if (check.mode === 'passive') {
        return { ...check, dc, fatigue, modifier: context.modifier, trained: actor.skills[check.skill].proficient,
            passiveScore: context.passiveScore, passiveSuccess: context.passiveScore >= dc, faces: 0 };
    }
    const faces = context.disadvantage || context.advantage ? 400 : 20;
    const results = [];
    for (let index = 0; index < faces; index++) {
        const draws = faces === 20 ? [index + 1] : [Math.floor(index / 20) + 1, index % 20 + 1];
        let cursor = 0;
        Math.random = () => (draws[cursor++] - 0.5) / 20;
        results.push(manager.rollSkillCheck(actor, options));
        rollCount++;
    }
    Math.random = original.random;
    return { ...check, dc, fatigue, modifier: context.modifier, trained: actor.skills[check.skill].proficient,
        faces, exactSuccessProbability: results.filter(row => row.success).length / faces,
        passiveScore: context.passiveScore, disadvantage: context.disadvantage,
        rawTotals: results.map(row => row.total), traces: chosenTraces(results) };
}

try {
    console.log = () => {};
    console.warn = () => {};
    globalThis.fetch = async path => ({ ok: true, json: async () => read(String(path).split('?')[0]) });
    const lootManager = new LootManager('legal-skill-baseline', 'core');
    await lootManager.loadData();
    globalThis.window = { lootManager };
    Date.now = () => 1791590400000;
    const generator = new QuestGenerator();
    const cells = [];
    const actors = [];
    const consequences = [];
    for (const profile of profiles) {
        for (const level of [1, 5, 10]) {
            reset(0);
            const actor = actorFor(profile, level);
            actors.push({ profile: profile.id, level, calling: profile.calling, kit: profile.kit,
                creationSelectable: true, fullCallingPlayableVerified: false,
                abilities: actor.abilities, trainedSkills: Object.keys(actor.skills).filter(id => actor.skills[id].proficient) });
            const quest = generator._generateInvestigateChain({ x: 16, y: 16 }, level,
                [{ x: 17, y: 17, name: 'audit ruin' }], new SeededRandom(`legal-skill-${level}`));
            assert.ok(Number.isFinite(quest.objectives[0].investigationDC));
            const questCheck = { source: 'quest', path: 'generated.investigation', skill: 'investigation',
                attribute: 'intellect', mode: 'active', baseDC: quest.objectives[0].investigationDC,
                initialAttemptFatigue: 0, deliberateRetryFatigue: 2, questRewards: quest.rewards };
            for (const fatigue of [0, 75, 90]) {
                for (const check of [...checks, questCheck]) {
                    const dc = check.source === 'challenge' ? manager.calculateAdjustedDC(check.baseDC, level) : check.baseDC;
                    cells.push({ profile: profile.id, level, ...enumerate(check, actor, fatigue, dc) });
                }
            }
            const challenge = general.challenges.arcane_puzzle;
            for (const option of challenge.options) {
                const trials = [];
                for (let face = 1; face <= 20; face++) {
                    for (const lootBranch of ['passes', 'fails']) {
                        reset(0);
                        const fresh = actorFor(profile, level);
                        const hpBefore = fresh.currentHP;
                        let first = true;
                        Math.random = () => {
                            if (first) {
                                first = false;
                                return (face - 0.5) / 20;
                            }
                            return lootBranch === 'passes' ? 0.25 : 0.75;
                        };
                        const dc = manager.calculateAdjustedDC(option.baseDC, level);
                        const rolled = manager.rollSkillCheck(fresh, { skillId: option.skill, attribute: option.attribute, dc, companions: [] });
                        const outcome = manager.getOutcome(challenge, option, rolled.success,
                            manager.checkCritical(rolled.roll, rolled.total, dc));
                        const result = manager.applyConsequences(fresh, challenge, outcome, rolled);
                        trials.push({ face, lootBranch, success: rolled.success, total: rolled.total, dc,
                            xp: result.xp, gold: result.gold, hpLost: hpBefore - fresh.currentHP,
                            fatigueDelta: gameState.get('fatigue.current'), items: result.items.map(item => item.id),
                            flags: result.consequenceFlags });
                    }
                }
                Math.random = original.random;
                consequences.push({ profile: profile.id, level, challenge: challenge.id, skill: option.skill,
                    meanXP: trials.reduce((sum, row) => sum + row.xp, 0) / trials.length,
                    meanAuthoredGold: trials.filter(row => row.success).length / trials.length * option.onSuccess.gold,
                    fixtureMeanGoldIncludingFixedLootDraws: trials.reduce((sum, row) => sum + row.gold, 0) / trials.length,
                    meanHPLost: trials.reduce((sum, row) => sum + row.hpLost, 0) / trials.length,
                    meanFatigueDelta: trials.reduce((sum, row) => sum + row.fatigueDelta, 0) / trials.length,
                    lootTriggerProbability: option.onSuccess.loot ? trials.filter(row => row.success).length / trials.length * option.onSuccess.loot.chance : 0,
                    trials });
            }
        }
    }
    const sourcePaths = ['src/core/rulesEngine.js', 'src/systems/Character.js', 'src/systems/SkillRegistry.js',
        'src/systems/SkillChallengeManager.js', 'src/systems/QuestGenerator.js', 'src/systems/LootManager.js',
        'data/skills.json', 'data/skillChallenges.json', 'data/skillChallenges/bandit-negotiation.json',
        'data/classes.json', 'data/races.json', 'data/backgrounds.json', 'data/kits.json', 'data/relations.json',
        'data/lootTables.json'];
    const sourceHashes = Object.fromEntries(sourcePaths.map(path => [path,
        createHash('sha256').update(fs.readFileSync(new URL(`../../${path}`, import.meta.url))).digest('hex')]));
    const output = { methodology: 'Full die-support enumeration. Exact conditional probabilities; no binomial sampling CI applies. Passive eligibility is deterministic, not rolled. Each active cell contains all totals in face order (1..20 or ordered pairs 1,1..20,20).',
        sourceHashes,
        limitations: ['No frequency weighting or played routes; no physical travel or full Calling play acceptance.',
            'Creation choices are legal and selectable; levels use actual levelUp/applyLevelUpSelections with attainable +1 attribute investments. These are skill-stat projections, not completed legal progression: earned XP and mandatory ability/spell/practice/specialization selection or whole UI confirmation are not simulated.',
            'Creation-selectable custom Curiosity/Audacity are capability baselines, not fully implemented Calling claims.',
            'No expertise, helpers, synergies, meals, practices or newly granted skill training.',
            'Rune consequence trials exhaust d20 faces and both 50% loot trigger branches; fixed branch draws/world seed/time provide loot consumer spot checks, not loot table value distributions. Fixture mean gold including fixed loot draws is not an expected value over the loot table.',
            'Only ordinary rune modal consequences are applied: zero automatic attempt fatigue; quest initial search zero, deliberate retry two. Quest reward values shown but turn-in not played here.'],
        checkCount: checks.length, cellCount: cells.length, activeRollCount: rollCount,
        actors, cells, runeConsequences: consequences };
    fs.writeFileSync(new URL('./legal-skill-baseline.results.json', import.meta.url), `${JSON.stringify(output)}\n`);
    console.log = original.log;
    console.log(JSON.stringify({ checkCount: checks.length, cellCount: cells.length, activeRollCount: rollCount,
        examples: cells.filter(row => row.fatigue === 0 && row.profile === 'investigator' &&
            (row.path.startsWith('challenges.arcane_puzzle.options') || row.source === 'quest'))
            .map(({ level, path, skill, dc, modifier, exactSuccessProbability, traces }) => ({ level, path, skill, dc, modifier, exactSuccessProbability, traces })),
        consequences: consequences.filter(row => row.profile === 'investigator').map(({ trials, ...row }) => row) }, null, 2));
} finally {
    Math.random = original.random;
    console.log = original.log;
    console.warn = original.warn;
    globalThis.fetch = original.fetch;
    globalThis.window = original.window;
    Date.now = original.now;
    RULES.attributes.system = original.attributeSystem;
}
