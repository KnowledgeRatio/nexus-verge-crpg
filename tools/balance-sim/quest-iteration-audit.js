/** Exact skill-support audit, not played quest or combat success. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { RULES } from '../../src/core/rulesEngine.js';
import { gameState } from '../../src/core/GameState.js';
import { Character } from '../../src/systems/Character.js';
import SkillChallengeManager from '../../src/systems/SkillChallengeManager.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
const read = path => JSON.parse(fs.readFileSync(new URL(`../../${path}`, import.meta.url)));
const classes = read('data/classes.json').classes;
const backgrounds = read('data/backgrounds.json').backgrounds;
const species = read('data/races.json').races.find(row => row.id === 'human');
const knight = read('data/kits.json').dedication.find(row => row.id === 'knight').preset;
const profiles = [
    { id: 'Knight', calling: 'dedication', background: knight.background, skills: knight.skills,
        stats: knight.abilitiesNVSystem, primary: 'prowess', secondary: 'resilience' },
    { id: 'Dedication Sage', calling: 'dedication', background: 'sage', skills: ['athletics', 'perception'],
        stats: { prowess: 8, resilience: 12, intellect: 15, intuition: 13, presence: 10, composure: 14 }, primary: 'intellect', secondary: 'composure' },
    { id: 'Curiosity investigator', calling: 'curiosity', background: 'sage', skills: ['craft', 'finesse', 'empathy'],
        stats: { prowess: 8, resilience: 12, intellect: 15, intuition: 13, presence: 10, composure: 14 }, primary: 'intellect', secondary: 'composure' },
    { id: 'Audacity envoy', calling: 'audacity', background: 'criminal', skills: ['craft', 'investigation', 'perception', 'empathy'],
        stats: { prowess: 14, resilience: 10, intellect: 12, intuition: 13, presence: 15, composure: 8 }, primary: 'presence', secondary: 'prowess' }
];
const manager = new SkillChallengeManager();
manager.skillsData = read('data/skills.json').skills;
skillRegistry.setDefinitions(manager.skillsData);
const previous = { random: Math.random, log: console.log, warn: console.warn };
const cells = [];
let rolls = 0;
console.log = console.warn = () => {};
try {
    for (const profile of profiles) {
        const calling = classes.find(row => row.id === profile.calling);
        const background = backgrounds.find(row => row.id === profile.background);
        assert.equal(profile.skills.length, calling.skillChoices.choose);
        assert.ok(profile.skills.every(id => calling.skillChoices.from.includes(id) && !background.skillProficiencies.includes(id)));
        for (const level of [1, 5, 10]) {
            const actor = new Character({ id: profile.id, name: profile.id, class: calling, species, background,
                baseAbilities: profile.stats, skillChoices: profile.skills, fightingStyle: 'defense' });
            for (let next = 2; next <= level; next++) {
                actor.levelUp(next);
                actor.applyLevelUpSelections({ asiChoice: next <= 5 ? profile.primary : profile.secondary });
            }
            for (const skillId of ['investigation', 'craft']) {
                for (const fatigue of [0, 75, 90]) {
                    for (const dc of [12, 14, 16]) {
                        gameState.set('party.activeSynergies', {});
                        gameState.set('party.companions', []);
                        gameState.set('fatigue', { current: fatigue, exhaustionLevels: 0, supplies: 0 });
                        const options = { skillId, dc };
                        const context = manager.getSkillCheckContext(actor, skillId, options);
                        const faces = context.advantage || context.disadvantage ? 400 : 20;
                        const results = [];
                        for (let index = 0; index < faces; index++) {
                            const draws = faces === 20 ? [index + 1] : [Math.floor(index / 20) + 1, index % 20 + 1];
                            let cursor = 0;
                            Math.random = () => (draws[cursor++] - 0.5) / 20;
                            results.push(manager.rollSkillCheck(actor, options));
                            rolls++;
                        }
                        const wins = results.filter(row => row.success);
                        const losses = results.filter(row => !row.success);
                        const extreme = results.reduce((a, b) => Math.abs(b.total - dc) > Math.abs(a.total - dc) ? b : a);
                        cells.push({ profile: profile.id, calling: profile.calling, level, skillId, fatigue, dc,
                            modifier: context.modifier, trained: actor.skills[skillId].proficient, faces,
                            exactSuccessProbability: wins.length / faces,
                            traces: [wins[Math.floor(wins.length / 2)], losses[0], extreme].filter(Boolean)
                                .map(({ rolls: dice, total, modifier, success }) => ({ dice, total, modifier, dc, success })) });
                    }
                }
            }
        }
    }
} finally {
    Math.random = previous.random;
    console.log = previous.log;
    console.warn = previous.warn;
}
const hashes = Object.fromEntries(['src/core/rulesEngine.js', 'src/systems/SkillChallengeManager.js', 'src/systems/Character.js', 'data/classes.json', 'data/quests.json'].map(path =>
    [path, createHash('sha256').update(fs.readFileSync(new URL(`../../${path}`, import.meta.url))).digest('hex')]));
const result = { methodology: 'Exact complete die support through live SkillChallengeManager. Creation-selectable profiles; L5/10 conditional actual levelUp + ASI stat projections, not earned full builds. Curiosity and Audacity full combat completeness unverified. No expertise, companion benefit, travel, quest completion or combat victory claim. Exact support probabilities have no sampling error and no binomial CI.', rolls, cells, hashes, currentQuestRules: RULES.quests.proceduralCore };
fs.writeFileSync(new URL('./quest-iteration-audit.results.json', import.meta.url), JSON.stringify(result, null, 2));
console.log(`Exact resolutions ${rolls}; cells ${cells.length}`);
for (const profile of profiles) {
    for (const level of [1, 5, 10]) {
        const dc = level < 4 ? 12 : level < 8 ? 14 : 16;
        for (const skillId of ['investigation', 'craft']) {
            const selected = cells.filter(row => row.profile === profile.id && row.level === level && row.dc === dc && row.skillId === skillId);
            console.log(`${profile.id} L${level} ${skillId} DC${dc}: fatigue0/75/90 ${selected.map(row => `${(100 * row.exactSuccessProbability).toFixed(2)}%`).join('/')}`);
            if (profile.id === 'Knight' || profile.id === 'Dedication Sage') {
                console.log(`TRACE ${JSON.stringify(selected[0].traces)}`);
            }
        }
    }
}
