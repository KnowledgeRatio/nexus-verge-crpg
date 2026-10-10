/** Bounded generated-dungeon exposure diagnostic, not a campaign simulation.
 * node tools/balance-sim/skill-exposure-audit.js > /tmp/skill-exposure-audit.json
 * Real dungeon generation and Player dispatch; synthetic 24 moves/room budget.
 * Every room visited, combat suppressed. No outcomes or player choices simulated.
 */
import fs from 'node:fs';
import { gameState } from '../../src/core/GameState.js';
import { SeededRandom } from '../../src/utils/rng.js';
import { DungeonGenerator } from '../../src/systems/DungeonGenerator.js';
import SkillChallengeManager from '../../src/systems/SkillChallengeManager.js';
const read = name => JSON.parse(fs.readFileSync(new URL(`../../data/${name}.json`, import.meta.url)));
const originalLog = console.log;
const originalWarn = console.warn;
console.log = () => {};
console.warn = () => {};
globalThis.window = { AudioContext: class {} };
globalThis.Audio = class {
    addEventListener() {}
};
globalThis.fetch = async () => ({ ok: false, status: 404 });
const { default: Player } = await import('../../src/systems/Player.js');
const manager = new SkillChallengeManager();
manager.terrainChallengesData = read('skillChallenges');
manager.challenges = new Map();
window.skillChallengeManager = manager;
const skills = read('skills').skills.map(skill => skill.id);
const generator = new DungeonGenerator('skill-exposure-2026-10-07');
generator.dungeonTypes = read('dungeonTypes').dungeonTypes;
generator.roomTemplates = read('dungeonRooms').rooms;
generator.terrains = read('terrains').terrains;
generator.terrainMap = Object.fromEntries(generator.terrains.map(terrain => [terrain.id, terrain]));
generator.dataLoaded = true;
const savedRandom = Math.random;
const savedNow = Date.now;
let clock = 1791331200000;
Date.now = () => clock;
const rows = [];
function challengeSkills(challenge) {
    const found = new Set();
    function visit(value) {
        if (!value || typeof value !== 'object') {
            return;
        }
        if (value.skill) {
            found.add(value.skill);
        }
        Object.values(value).forEach(visit);
    }
    visit(challenge);
    return found;
}
try {
    for (const level of [1, 5, 10]) {
        for (let seed = 0; seed < 500; seed++) {
            const feature = await generator.generateDungeon({ x: seed, y: level }, level);
            for (const policy of ['fresh-opportunities', 'attempt-every-offer']) {
                gameState.set('character', { level });
                gameState.set('combat', null);
                gameState.set('flags.skillChallengeAttempts', {});
                manager.lastAttemptTimes = {};
                const rng = new SeededRandom(`exposure_${level}_${seed}`);
                Math.random = () => rng.next();
                const counts = Object.fromEntries(skills.map(skill => [skill, 0]));
                const events = [];
                const player = Object.create(Player.prototype);
                let room;
                player.dungeonManager = { isInDungeon: () => true, getCurrentRoom: () => room };
                const capture = async challenge => {
                    for (const skill of challengeSkills(challenge)) {
                        counts[skill]++;
                    }
                    events.push({ room: room.id, category: room.category, challenge: challenge.id });
                    if (policy === 'attempt-every-offer') {
                        manager.recordChallengeAttempt(challenge.id);
                    }
                };
                player.handleSingleSkillChallenge = capture;
                player.handleSequentialSkillChallenge = capture;
                player.handleChoiceSkillChallenge = capture;
                for (const generatedRoom of feature.rooms) {
                    room = generatedRoom;
                    for (let move = 0; move < 24; move++) {
                        clock += 200;
                        await player.checkForDungeonSkillChallenge();
                    }
                }
                rows.push({ level, seed, policy, type: feature.dungeonTypeId,
                    rooms: feature.rooms.length, offerCount: events.length, counts, events });
            }
        }
    }
    const percentile = (values, fraction) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * fraction)];
    const summaries = [];
    for (const level of [1, 5, 10]) {
        for (const policy of ['fresh-opportunities', 'attempt-every-offer']) {
            const trials = rows.filter(row => row.level === level && row.policy === policy);
            for (const skill of skills) {
                const values = trials.map(row => row.counts[skill]);
                const rate = values.filter(value => value > 0).length / trials.length;
                const margin = 1.96 * Math.sqrt(rate * (1 - rate) / trials.length);
                summaries.push({ level, policy, skill, n: trials.length,
                    meanOffersContainingSkill: values.reduce((a, b) => a + b, 0) / values.length,
                    p10: percentile(values, 0.1), median: percentile(values, 0.5), p90: percentile(values, 0.9),
                    atLeastOneOffer: rate, ci95: [Math.max(0, rate - margin), Math.min(1, rate + margin)],
                    zeroEventsUpper95RuleOfThree: rate === 0 ? 3 / trials.length : null });
            }
        }
    }
    const traces = [1, 5, 10].flatMap(level => {
        const candidates = rows.filter(row => row.level === level && row.policy === 'attempt-every-offer')
            .sort((a, b) => a.offerCount - b.offerCount);
        return [candidates[0], candidates[Math.floor(candidates.length / 2)], candidates.at(-1)];
    });
    console.log = originalLog;
    console.log(JSON.stringify({ methodology: '1,500 real generated dungeons: 500 seeds at each level 1/5/10. Two synthetic dispatch policies per dungeon, 24 eligible movement checks per generated room, 200ms per move. All rooms visited, no combat. Fresh opportunities never starts cooldown; attempt-every-offer records only cooldown and assumes an attempted offer. Both intercept resolution: no actual attempts, conditional stages, rewards, fatigue, paths or choices measured. A challenge containing a skill is an availability offer, not a roll of that skill. Settlement, quest, passive trap tiles, doors and overworld excluded. CI is requested Wald interval for a generated dungeon containing an offer, not combat win rate; zero counts also provide rule-of-three upper bound.',
        summaries, traces }, null, 2));
} finally {
    Math.random = savedRandom;
    Date.now = savedNow;
    console.log = originalLog;
    console.warn = originalWarn;
}
