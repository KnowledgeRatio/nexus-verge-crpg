/** Finite-resource census and exact live skill support; no played journeys. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { RULES } from '../../src/core/rulesEngine.js';
import { gameState } from '../../src/core/GameState.js';
import WorldGenerator from '../../src/systems/WorldGenerator.js';
import ProvisioningManager from '../../src/systems/ProvisioningManager.js';
import SkillChallengeManager from '../../src/systems/SkillChallengeManager.js';
import { Character } from '../../src/systems/Character.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import { applyLongRestFatigue } from '../../src/systems/FatigueManager.js';

const read = path => JSON.parse(fs.readFileSync(new URL(`../../${path}`, import.meta.url)));
const data = read('data/provisioning.json');
const classes = read('data/classes.json').classes;
const backgrounds = read('data/backgrounds.json').backgrounds;
const species = read('data/races.json').races.find(row => row.id === 'human');
const knight = read('data/kits.json').dedication.find(row => row.id === 'knight').preset;
const previous = { random: Math.random, log: console.log, warn: console.warn, fetch: globalThis.fetch, window: globalThis.window,
    overrides: RULES.worldGen.campaignOverrides };
globalThis.fetch = async path => ({ ok: true, json: async () => read(String(path).split('?')[0]) });
globalThis.window = {};
console.log = console.warn = () => {};
const census = [];
const cells = [];
let resolutions = 0;
const setActorState = (actor, fatigue = 0, supplies = 0) => {
    gameState.reset();
    gameState.set('character', actor);
    gameState.set('worldConfig.campaignId', 'nexus-verge');
    gameState.set('party.activeSynergies', {});
    gameState.set('party.companions', []);
    gameState.set('fatigue', { current: fatigue, supplies, exhaustionLevels: 0, suppliesZeroStreak: 0 });
    gameState.set('player.position', { x: 0, y: 0 });
    gameState.set('world.metadata', { generated: true, features: [{ id: 'audit', type: 'sanctuary',
        x: 0, y: 0, provisioning: { id: 'audit', cueId: data.cues[0].id, attempt: null } }] });
};
try {
    assert.ok(RULES.provisioning?.enabled, 'Run after production provisioning rules are ready');
    RULES.worldGen.campaignOverrides = read('data/campaigns.json').campaigns.find(row => row.id === 'nexus-verge').featureGeneration;
    skillRegistry.setDefinitions(read('data/skills.json').skills);
    for (const mapSize of ['small', 'medium', 'large']) {
        for (let seed = 0; seed < 5; seed++) {
            const snapshots = [];
            for (let repeat = 0; repeat < (seed === 0 ? 2 : 1); repeat++) {
                gameState.reset();
                const world = new WorldGenerator(`provisioning-audit-${seed}`, { mapSize, difficulty: 'normal', campaignId: 'nexus-verge' });
                await world.generateWorldMetadata();
                const sites = world.worldMetadata.features.filter(row => row.provisioning);
                let minimumSpacing = Infinity;
                for (let a = 0; a < sites.length; a++) {
                    for (let b = a + 1; b < sites.length; b++) {
                        minimumSpacing = Math.min(minimumSpacing, Math.hypot(sites[a].x - sites[b].x, sites[a].y - sites[b].y));
                    }
                }
                assert.ok(sites.length <= RULES.provisioning.generation.maxSitesByMapSize[mapSize]);
                assert.ok(minimumSpacing >= RULES.provisioning.generation.minSpacing);
                assert.ok(sites.every(row => row.type === 'poi' && row.resolvedType === 'sanctuary' && row.provisioning.attempt === null));
                const snapshot = { mapSize, seed, count: sites.length,
                    eligibleSanctuaries: world.worldMetadata.features.filter(row => row.resolvedType === 'sanctuary').length,
                    minimumSpacing: Number.isFinite(minimumSpacing) ? minimumSpacing : null,
                    sites: sites.map(row => ({ id: row.id, x: row.x, y: row.y, cue: row.provisioning.cueId })) };
                snapshots.push(snapshot);
            }
            if (snapshots.length === 2) {
                assert.deepEqual(snapshots[0], snapshots[1]);
            }
            census.push(snapshots[0]);
            process.stderr.write(`Census ${mapSize} seed ${seed}: ${snapshots[0].count} finite sites\n`);
        }
    }
    const profiles = [
        { id: 'Knight untrained', calling: 'dedication', background: 'soldier', skills: knight.skills, stats: knight.abilitiesNVSystem },
        { id: 'Knight Survival trained', calling: 'dedication', background: 'soldier', skills: ['survival', 'perception'], stats: knight.abilitiesNVSystem },
        { id: 'Intuition-invested Dedication', calling: 'dedication', background: 'soldier', skills: ['survival', 'perception'],
            stats: { prowess: 14, resilience: 13, intellect: 8, intuition: 15, presence: 10, composure: 12 } },
        ...['curiosity', 'audacity'].map(calling => {
            const from = classes.find(row => row.id === calling).skillChoices;
            return { id: `${calling} folkHero trained`, calling, background: 'folkHero',
                skills: from.from.filter(id => !['empathy', 'survival'].includes(id)).slice(0, from.choose),
                stats: { prowess: 14, resilience: 13, intellect: 8, intuition: 15, presence: 10, composure: 12 } };
        })
    ];
    const manager = new SkillChallengeManager();
    manager.skillsData = read('data/skills.json').skills;
    const provisioning = new ProvisioningManager({ skillChallengeManager: manager, data });
    for (const profile of profiles) {
        const calling = classes.find(row => row.id === profile.calling);
        const background = backgrounds.find(row => row.id === profile.background);
        assert.equal(profile.skills.length, calling.skillChoices.choose);
        assert.ok(profile.skills.every(id => calling.skillChoices.from.includes(id) && !background.skillProficiencies.includes(id)));
        for (const level of [1, 5, 10]) {
            const actor = new Character({ id: profile.id, name: profile.id, class: calling, species,
                background, baseAbilities: profile.stats, skillChoices: profile.skills, fightingStyle: 'defense' });
            for (let next = 2; next <= level; next++) {
                actor.levelUp(next);
                actor.applyLevelUpSelections({ asiChoice: profile.id.includes('Knight') ? (next <= 5 ? 'prowess' : 'resilience') : 'intuition' });
            }
            for (const fatigue of [0, 48, 73, 88, 98]) {
                setActorState(actor, fatigue);
                // The manager charges fatigue BEFORE rolling. Inspect the actual charged context.
                Math.random = () => 0.5;
                provisioning.attempt('audit');
                const afterCharge = gameState.get('fatigue');
                const context = manager.getSkillCheckContext(actor, 'survival', { ...data.challenge, dc: RULES.provisioning.dc });
                const faces = context.advantage || context.disadvantage ? 400 : 20;
                const outcomes = [];
                for (let index = 0; index < faces; index++) {
                    setActorState(actor, fatigue);
                    const draws = faces === 20 ? [index + 1] : [Math.floor(index / 20) + 1, index % 20 + 1];
                    let cursor = 0;
                    Math.random = () => (draws[cursor++] - 0.5) / 20;
                    const result = provisioning.attempt('audit');
                    assert.equal(result.attempted, true);
                    assert.equal(result.suppliesRestored, result.success ? 1 : 0);
                    assert.equal(result.consequences.xpAwarded, 0);
                    assert.equal(result.consequences.goldAwarded, 0);
                    assert.deepEqual(result.consequences.itemsAwarded, []);
                    assert.equal(provisioning.attempt('audit').reason, 'spent');
                    const metadata = JSON.parse(JSON.stringify(gameState.get('world.metadata')));
                    applyLongRestFatigue();
                    gameState.set('world.metadata', metadata);
                    assert.equal(provisioning.attempt('audit').reason, 'spent');
                    outcomes.push({ dice: result.rollResult.rolls, total: result.rollResult.total,
                        modifier: result.rollResult.modifier, success: result.success,
                        suppliesRestored: result.suppliesRestored });
                    resolutions++;
                }
                const successes = outcomes.filter(row => row.success);
                const losses = outcomes.filter(row => !row.success);
                const extreme = outcomes.reduce((a, b) => Math.abs(b.total - RULES.provisioning.dc) > Math.abs(a.total - RULES.provisioning.dc) ? b : a);
                const probability = successes.length / faces;
                cells.push({ profile: profile.id, calling: profile.calling, level, fatigueBefore: fatigue,
                    fatigueAtRoll: afterCharge.current, exhaustionAtRoll: afterCharge.exhaustionLevels,
                    trained: actor.skills.survival.proficient, modifier: context.modifier, dieSupport: faces,
                    exactSuccessProbability: probability, expectedSupplyPerOpportunity: probability,
                    traces: [successes[Math.floor(successes.length / 2)], losses[0], extreme].filter(Boolean) });
            }
        }
    }
    // Full meter preserves opportunity; success fills only the free slot and never rewards money/XP.
    const actor = gameState.get('character');
    setActorState(actor, 0, RULES.fatigue.suppliesMaxCarry);
    assert.equal(provisioning.attempt('audit').reason, 'full');
    assert.equal(gameState.get('world.metadata').features[0].provisioning.attempt, null);
    applyLongRestFatigue();
    Math.random = () => 0.975;
    assert.equal(provisioning.attempt('audit').suppliesRestored, 1);
    assert.equal(gameState.get('fatigue.supplies'), RULES.fatigue.suppliesMaxCarry);
} finally {
    Math.random = previous.random;
    console.log = previous.log;
    console.warn = previous.warn;
    globalThis.fetch = previous.fetch;
    globalThis.window = previous.window;
    RULES.worldGen.campaignOverrides = previous.overrides;
}
const summaries = ['small', 'medium', 'large'].map(mapSize => {
    const rows = census.filter(row => row.mapSize === mapSize);
    const counts = rows.map(row => row.count).sort((a, b) => a - b);
    return { mapSize, worlds: rows.length, min: counts[0], median: counts[Math.floor(counts.length / 2)],
        max: counts.at(-1), mean: counts.reduce((a, b) => a + b, 0) / counts.length,
        configuredSupplyCeiling: RULES.provisioning.generation.maxSitesByMapSize[mapSize] };
});
const hashes = Object.fromEntries(['src/core/rulesEngine.js', 'src/systems/ProvisioningManager.js', 'src/systems/WorldGenerator.js', 'data/provisioning.json'].map(path =>
    [path, createHash('sha256').update(fs.readFileSync(new URL(`../../${path}`, import.meta.url))).digest('hex')]));
const result = { methodology: '15 real metadata worlds plus three repeated-seed worlds. Exact complete die support through live ProvisioningManager/SkillChallengeManager, with actual fatigue charge, rest depletion and JSON receipt reload per outcome. Legal creation skill selections; L5/10 conditional stat projections via real levelUp/ASI, not earned played builds. Curiosity/Audacity combat completeness unverified. Exact probabilities have no sampling uncertainty; no binomial CI applies. No combat win rate or natural player route exposure claim.',
    resolutions, rules: RULES.provisioning, summaries, census, cells, hashes,
    limitations: ['Five independent seeds per map size are a bounded census, not world-population confidence bounds.',
        'A placed opportunity is not necessarily encountered; expected whole-map ceilings overstate natural expedition exposure.',
        'No played travel/combat costs, renewable merchant economy, difficulty variants, campaign variants or net detour benefit measured.',
        'JSON receipt reload exercises manager persistence, not browser storage or cloud-save integration.'] };
fs.writeFileSync(new URL('./provisioning-audit.results.json', import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ summaries, resolutions }, null, 2));
for (const row of cells.filter(row => (row.profile.includes('Knight') && [0, 88, 98].includes(row.fatigueBefore)) ||
    (row.profile === 'Intuition-invested Dedication' && row.fatigueBefore === 0))) {
    console.log(`${row.profile} L${row.level} fatigue ${row.fatigueBefore}: ${(100 * row.exactSuccessProbability).toFixed(2)}% exact; TRACE ${JSON.stringify(row.traces)}`);
}
