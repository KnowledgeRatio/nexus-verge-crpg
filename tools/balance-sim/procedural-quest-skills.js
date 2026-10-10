/** Exact optional Investigation rolls for two legal Dedication builds, not played runs. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { RULES } from '../../src/core/rulesEngine.js';
import { gameState } from '../../src/core/GameState.js';
import { Character } from '../../src/systems/Character.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import SkillChallengeManager from '../../src/systems/SkillChallengeManager.js';

const read = path => JSON.parse(fs.readFileSync(new URL(`../../${path}`, import.meta.url)));
const calling = read('data/classes.json').classes.find(row => row.id === 'dedication');
const backgrounds = read('data/backgrounds.json').backgrounds;
const species = read('data/races.json').races.find(row => row.id === 'human');
const knight = read('data/kits.json').dedication.find(row => row.id === 'knight').preset;
const keys = ['prowess', 'resilience', 'intellect', 'intuition', 'presence', 'composure'];
const profiles = [
    { id: 'knight', background: knight.background, skills: knight.skills,
        base: keys.map(key => knight.abilitiesNVSystem[key]), investments: ['prowess', 'resilience'] },
    { id: 'dedicationSage', background: 'sage', skills: ['athletics', 'perception'],
        base: [8, 12, 15, 13, 10, 14], investments: ['intellect', 'composure'] }
];
const original = { random: Math.random, log: console.log, warn: console.warn };
const manager = new SkillChallengeManager();
manager.skillsData = read('data/skills.json').skills;
skillRegistry.setDefinitions(manager.skillsData);
assert.equal(RULES.attributes.system, 'NVSystem');
function actorFor(profile, level) {
    const background = backgrounds.find(row => row.id === profile.background);
    assert.equal(profile.skills.length, calling.skillChoices.choose);
    for (const skill of profile.skills) {
        assert.ok(calling.skillChoices.from.includes(skill));
        assert.ok(!background.skillProficiencies.includes(skill));
    }
    if (profile.id !== 'knight') {
        assert.deepEqual([...profile.base].sort((a, b) => a - b), [...RULES.core.standardArray].sort((a, b) => a - b));
    }
    const actor = new Character({ id: profile.id, name: profile.id, species, class: calling, background,
        baseAbilities: Object.fromEntries(keys.map((key, i) => [key, profile.base[i]])),
        skillChoices: profile.skills, fightingStyle: profile.id === 'knight' ? knight.fightingStyle : 'defense' });
    for (let next = 2; next <= level; next++) {
        actor.levelUp(next);
        actor.applyLevelUpSelections({ asiChoice: profile.investments[next <= 5 ? 0 : 1] });
    }
    assert.ok(Object.values(actor.skills).every(skill => !skill.expertise));
    return actor;
}
let resolutions = 0;
const cells = [];
try {
    console.log = () => {};
    console.warn = () => {};
    for (const profile of profiles) {
        for (const level of [1, 5, 10]) {
            const actor = actorFor(profile, level);
            for (const fatigue of [0, 75, 90]) {
                gameState.set('party.activeSynergies', {});
                gameState.set('party.companions', []);
                gameState.set('fatigue', { current: fatigue, exhaustionLevels: 0, supplies: 0 });
                const options = { skillId: 'investigation', dc: RULES.quests.proceduralCore.investigationDC };
                const context = manager.getSkillCheckContext(actor, options.skillId, options);
                const faces = context.disadvantage || context.advantage ? 400 : 20;
                const trials = [];
                for (let index = 0; index < faces; index++) {
                    const draws = faces === 20 ? [index + 1] : [Math.floor(index / 20) + 1, index % 20 + 1];
                    let cursor = 0;
                    Math.random = () => (draws[cursor++] - 0.5) / 20;
                    trials.push(manager.rollSkillCheck(actor, options));
                    resolutions++;
                }
                const wins = trials.filter(row => row.success);
                const losses = trials.filter(row => !row.success);
                const extreme = trials.reduce((a, b) => Math.abs(b.total - b.dc) > Math.abs(a.total - a.dc) ? b : a);
                cells.push({ profile: profile.id, calling: calling.id, level, fatigue,
                    modifier: context.modifier, proficient: actor.skills.investigation.proficient,
                    dc: options.dc, faces, exactSuccessProbability: wins.length / faces,
                    traces: [wins[Math.floor(wins.length / 2)], losses[0], extreme].filter(Boolean)
                        .map(({ rolls, total, dc, modifier, success }) => ({ rolls, total, dc, modifier, success })) });
            }
        }
    }
    const output = { methodology: 'Exact complete d20 support through live SkillChallengeManager. Legal Dedication Knight preset and custom standard-array Sage; no expertise or companions. Level 5/10 are conditional skill-stat/ASI projections, not earned progression. Fatigue is supplied at roll time; repeat-attempt accumulation and travel are not simulated. This measures optional corroboration, not whole-quest completion or payout. No sampling-error CI applies to exact dice enumeration.', resolutions, cells };
    fs.writeFileSync(new URL('./procedural-quest-skills.results.json', import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
    original.log(JSON.stringify(output, null, 2));
} finally {
    Math.random = original.random;
    console.log = original.log;
    console.warn = original.warn;
}
