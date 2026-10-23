/** Bounded live fatigue/camp/rest/check pilot. NOT quest journeys or combat wins. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';
import { Character } from '../../src/systems/Character.js';
import SkillChallengeManager from '../../src/systems/SkillChallengeManager.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import { calcMovementFatigue, addFatigue, getFatigueState } from '../../src/systems/FatigueManager.js';

const read = path => JSON.parse(fs.readFileSync(new URL(`../../${path}`, import.meta.url)));
const output = console.log.bind(console);
const structuredClone = globalThis.structuredClone;
console.log = console.warn = () => {};
globalThis.window = { game: null };
globalThis.Audio = function() {
    return { play: async () => {}, pause() {}, addEventListener() {} };
};
const { default: Player } = await import('../../src/systems/Player.js');
const { default: restManager } = await import('../../src/systems/RestManager.js');
const calling = read('data/classes.json').classes.find(row => row.id === 'dedication');
const background = read('data/backgrounds.json').backgrounds.find(row => row.id === 'soldier');
const species = read('data/races.json').races.find(row => row.id === 'human');
const preset = read('data/kits.json').dedication.find(row => row.id === 'knight').preset;
const manager = new SkillChallengeManager();
manager.skillsData = read('data/skills.json').skills;
skillRegistry.setDefinitions(manager.skillsData);
gameState.addMessage = () => {};
gameState.set('party.activeSynergies', {});
gameState.set('party.companions', []);
gameState.set('combat', null);
function actor(level, trained) {
    const skills = [trained ? 'finesse' : 'empathy', 'perception'];
    assert.ok(skills.every(skill => calling.skillChoices.from.includes(skill) && !background.skillProficiencies.includes(skill)));
    const pc = new Character({ id:'pilot', name:'Pilot', class:calling, species, background,
        baseAbilities:preset.abilitiesNVSystem, skillChoices:skills, fightingStyle:preset.fightingStyle });
    for (let next = 2; next <= level; next++) {
        pc.levelUp(next);
        pc.applyLevelUpSelections({ asiChoice:next <= 5 ? 'prowess' : 'resilience' });
    }
    return pc;
}
function reset(supplies = RULES.fatigue.suppliesStartCount, exhaustionLevels = 0) {
    gameState.set('fatigue', { current:0, exhaustionLevels, supplies, suppliesZeroStreak:0, lastThreshold:'rested' });
}
function exactCheck(pc, dc) {
    const options = { skillId:'finesse', dc };
    const context = manager.getSkillCheckContext(pc, 'finesse', options);
    const size = context.advantage || context.disadvantage ? 400 : 20;
    const previousRandom = Math.random;
    const results = [];
    try {
        for (let i = 0; i < size; i++) {
            const draws = size === 20 ? [i + 1] : [Math.floor(i / 20) + 1, i % 20 + 1];
            let index = 0;
            Math.random = () => (draws[index++] - 0.5) / 20;
            results.push(manager.rollSkillCheck(pc, options));
        }
    } finally {
        Math.random = previousRandom;
    }
    const wins = results.filter(row => row.success);
    const losses = results.filter(row => !row.success);
    const extreme = results.reduce((a,b) => Math.abs(b.total - dc) > Math.abs(a.total - dc) ? b : a);
    return { modifier:context.modifier, disadvantage:context.disadvantage, resolutions:size,
        exactSuccessProbability:wins.length / size,
        traces:[wins[Math.floor(wins.length / 2)], losses[Math.floor(losses.length / 2)], extreme].filter(Boolean)
            .map(row => ({ rolls:row.rolls, modifier:row.modifier, total:row.total, dc, success:row.success })) };
}
const routes = [];
for (const level of [1,5,10]) {
    for (const trained of [false,true]) {
        const pc = actor(level, trained);
        for (const tiles of [40,120,180]) {
            for (const movementCost of [1,1.5]) {
                for (const camping of [false,true]) {
                    reset();
                    gameState.set('character', pc);
                    let camps = 0;
                    const events = [];
                    for (let tile = 1; tile <= tiles; tile++) {
                        addFatigue(calcMovementFatigue(movementCost, pc), 'movement');
                        if (camping && getFatigueState().current >= 75 && getFatigueState().supplies > 0) {
                            Player.prototype.makeCamp.call({});
                            camps++;
                            events.push({ tile, event:'camp', state:structuredClone(getFatigueState()) });
                        }
                    }
                    const check = exactCheck(pc, level < 4 ? 12 : level < 8 ? 14 : 16);
                    routes.push({ level, trained, tiles, movementCost, camping, camps,
                        finalState:structuredClone(getFatigueState()), events, check });
                }
            }
        }
    }
}
const rests = [];
const tiles = [{ terrain:'town', feature:{ type:'settlement' } }];
for (const level of [1,5,10]) {
    for (const supplies of [0,3]) {
        for (const initialExhaustion of [0,2]) {
            const pc = actor(level, false);
            reset(supplies, initialExhaustion);
            gameState.set('character', pc);
            gameState.set('player.position', { x:0, y:0 });
            gameState.set('world', { worldClock:0, generatedRegions:new Map([['0,0', { tiles }]]) });
            const trace = [];
            for (let rest = 1; rest <= 6; rest++) {
                pc.currentHP = Math.max(1, pc.maxHP - 1);
                const result = await restManager.longRest();
                assert.equal(result.success, true);
                trace.push({ rest, hp:pc.currentHP, maxHP:pc.maxHP,
                    worldClock:gameState.get('world.worldClock'), state:structuredClone(getFatigueState()) });
            }
            rests.push({ level, supplies, initialExhaustion, trace });
        }
    }
}
const sourceFiles = ['src/systems/FatigueManager.js', 'src/systems/RestManager.js', 'src/systems/Player.js',
    'src/systems/SkillChallengeManager.js', 'src/systems/Character.js', 'src/core/rulesEngine.js', 'data/classes.json', 'data/backgrounds.json'];
const result = { methodology:[
    'Exact conditional Finesse d20 support after synthetic movement segments through real fatigue consumers; no terrain/event generation or movement input pipeline.',
    'Paired creation-legal Dedication Knight profiles differ only in Finesse versus Empathy choice. Conditional levelUp/ASI projections; no earned progression or specialization.',
    'Diagnostic DC12/14/16 uses current quest tier numbers but does not imply existing quests offer Finesse routes.',
    'Real Player.makeCamp and RestManager.longRest at an explicitly supplied settlement fixture. No combat, quest acceptance, retry, reward or turn-in measured.',
    'Probabilities exhaust all d20 outcomes; no sampling confidence interval. Synthetic routes do not estimate naturally encountered opportunities.'
], sourceHashes:Object.fromEntries(sourceFiles.map(file => [file,createHash('sha256').update(fs.readFileSync(new URL(`../../${file}`, import.meta.url))).digest('hex')])),
routes, rests, exactResolutions:routes.reduce((sum,row) => sum + row.check.resolutions,0), restCalls:rests.reduce((sum,row) => sum + row.trace.length,0) };
fs.writeFileSync(new URL('./skill-journey-pilot.results.json', import.meta.url), JSON.stringify(result,null,2));
output(`Route/check cells ${routes.length}; exact resolutions ${result.exactResolutions}; live inn rests ${result.restCalls}`);
for (const row of routes.filter(row => row.tiles === 180 && row.movementCost === 1.5)) {
    output(JSON.stringify(row));
}
for (const row of rests.filter(row => row.level === 1 && row.supplies === 0)) {
    output(`REST TRACE ${JSON.stringify(row)}`);
}
