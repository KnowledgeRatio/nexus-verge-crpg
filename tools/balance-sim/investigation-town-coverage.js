/** All-settlement metadata census. Not a travel, completion, or combat simulation.
 * Run: node tools/balance-sim/investigation-town-coverage.js --after
 * The historical baseline artifact was captured before the production fallback
 * patch. Reruns overwrite only the current after artifact.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';
import WorldGenerator from '../../src/systems/WorldGenerator.js';
import QuestGenerator from '../../src/systems/QuestGenerator.js';
import QuestManager from '../../src/systems/QuestManager.js';

const root = new URL('../../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
globalThis.fetch = async path => ({ ok: true, json: async () => JSON.parse(read(String(path).split('?')[0])) });
globalThis.window = {};
const campaigns = JSON.parse(read('data/campaigns.json'));
const campaign = campaigns.campaigns.find(entry => entry.id === 'defeatLichKing');
const suites = [
    { id: 'original-small-core', n: 100, config: { mapSize: 'small', difficulty: 'normal', campaignId: 'core' }, overrides: {}, prefix: 'approved-skill-route-' },
    { id: 'player-entry-default', n: 20, config: { mapSize: 'medium', difficulty: 'normal', campaignId: 'defeatLichKing' }, overrides: campaign.featureGeneration || {}, prefix: 'investigation-target-default-' }
];
const eligible = f => (f.type === 'dungeon' || (f.type === 'poi' && f.resolvedType === 'dungeon')) && !f.questBind;
const quantiles = values => {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    return Object.fromEntries([0, 0.5, 0.9, 0.95, 1].map(p => [p, sorted[Math.floor((sorted.length - 1) * p)] ?? null]));
};
const interval = values => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
    const margin = 1.96 * Math.sqrt(variance / values.length);
    return { mean, ci95: [Math.max(0, mean - margin), Math.min(1, mean + margin)], independentWorlds: values.length };
};
const oldLog = console.log;
const oldWarn = console.warn;
const oldOverrides = RULES.worldGen.campaignOverrides;
console.log = () => {};
console.warn = () => {};
const results = [];
try {
    for (const suite of suites) {
        RULES.worldGen.campaignOverrides = { ...suite.overrides };
        const worlds = [];
        for (let seed = 0; seed < suite.n; seed++) {
            gameState.set('world.metadata', null);
            gameState.set('world.generatedRegions', new Map());
            gameState.set('character', { level: 5 });
            const worldSeed = `${suite.prefix}${seed}`;
            const world = new WorldGenerator(worldSeed, suite.config);
            await world.generateWorldMetadata();
            const generator = new QuestGenerator(worldSeed, suite.config.campaignId);
            const manager = new QuestManager(generator);
            const features = world.worldMetadata.features.filter(eligible);
            const towns = [];
            for (const town of world.worldMetadata.settlements) {
                const hooks = generator.getHooksForSettlement(town.id);
                const nearest = features.map(f => ({ feature: f, distance: Math.hypot(f.x - town.x, f.y - town.y) }))
                    .sort((a, b) => a.distance - b.distance)[0];
                const levels = [];
                for (const level of [1, 5, 10]) {
                    gameState.set('character', { level });
                    const quests = await generator.generateQuestsForSettlement(town, level);
                    const investigations = quests.filter(q => q.type === 'investigate');
                    gameState.set('quests', { active: investigations });
                    for (const quest of investigations) {
                        const target = features.find(f => `${f.x},${f.y}` === quest.dungeonHookId);
                        assert.ok(target, 'Investigation must reference real eligible feature');
                        assert.equal(manager._getRoomInvestigations(target.x, target.y, 0).length, 1);
                        assert.equal(manager._getRoomInvestigations(target.x, target.y, 1).length, 0);
                        assert.equal(manager._getRoomInvestigations(target.x + 1, target.y, 0).length, 0);
                    }
                    levels.push({ level, offered: investigations.length, totalOffers: quests.length, target: investigations[0]?.dungeonHookId ?? null,
                        targetDistance: investigations.length ? Math.hypot(Number(investigations[0].dungeonHookId.split(',')[0]) - town.x,
                            Number(investigations[0].dungeonHookId.split(',')[1]) - town.y) : null });
                }
                towns.push({ id: town.id, type: town.settlementType, starting: town.x === 16 && town.y === 16,
                    localHooks: hooks.length, nearestEligibleDistance: nearest?.distance ?? null,
                    nearestEligibleTarget: nearest ? `${nearest.feature.x},${nearest.feature.y}` : null,
                    nearestOwnedBy: nearest?.feature.questHook?.nearestSettlementId ?? null,
                    within150: Boolean(nearest && nearest.distance <= 150),
                    withinFallback: Boolean(nearest && nearest.distance <= (RULES.quests.investigationFallbackDistanceTiles ?? 150)), levels });
            }
            const targetCounts = new Map();
            const actualTargetCounts = new Map();
            for (const town of towns) {
                const actual = town.levels.find(l => l.level === 5).target;
                const projected = actual || (town.withinFallback ? town.nearestEligibleTarget : null);
                if (projected) {
                    targetCounts.set(projected, (targetCounts.get(projected) || 0) + 1);
                }
                if (actual) {
                    actualTargetCounts.set(actual, (actualTargetCounts.get(actual) || 0) + 1);
                }
            }
            const concentration = counts => ({ distinctTargets: counts.size,
                sharedTargets: [...counts.values()].filter(v => v > 1).length,
                townsOnSharedTargets: [...counts.values()].filter(v => v > 1).reduce((a, b) => a + b, 0),
                maximumTownsPerTarget: Math.max(0, ...counts.values()) });
            const townTargetCounts = new Map();
            for (const town of towns.filter(t => t.type === 'town')) {
                const target = town.levels[1].target;
                if (target) {
                    townTargetCounts.set(target, (townTargetCounts.get(target) || 0) + 1);
                }
            }
            worlds.push({ seed, eligibleFeatures: features.length, towns,
                hypotheticalFallbackConcentration: concentration(targetCounts), actualConcentration: concentration(actualTargetCounts),
                actualTownOnlyConcentration: concentration(townTargetCounts) });
            if ((seed + 1) % 20 === 0) {
                process.stderr.write(`${suite.id}: ${seed + 1}/${suite.n} worlds\n`);
            }
        }
        const summaries = {};
        for (const [name, predicate] of Object.entries({ all: () => true, towns: t => t.type === 'town', starting: t => t.starting,
            nonstarting: t => !t.starting, nonstartingTowns: t => !t.starting && t.type === 'town' })) {
            const cells = worlds.flatMap(w => w.towns.filter(predicate));
            summaries[name] = { settlements: cells.length, localHookCoverage: interval(worlds.map(w => {
                const selected = w.towns.filter(predicate);
                return selected.filter(t => t.localHooks > 0).length / selected.length;
            })), within150Coverage: interval(worlds.map(w => {
                const selected = w.towns.filter(predicate);
                return selected.filter(t => t.within150).length / selected.length;
            })), withinFallbackCoverage: interval(worlds.map(w => {
                const selected = w.towns.filter(predicate);
                return selected.filter(t => t.withinFallback).length / selected.length;
            })), radiusSensitivity: Object.fromEntries([150, 200, 250, 300, 400, 600].map(radius => [radius,
                { count: cells.filter(t => t.nearestEligibleDistance <= radius).length, worldCoverage: interval(worlds.map(w => {
                    const selected = w.towns.filter(predicate);
                    return selected.filter(t => t.nearestEligibleDistance <= radius).length / selected.length;
                })) }])), nearestDistanceQuantiles: quantiles(cells.map(t => t.nearestEligibleDistance)),
            actualOffered: [1, 5, 10].map(level => ({ level, count: cells.filter(t => t.levels.find(l => l.level === level).offered > 0).length,
                worldCoverage: interval(worlds.map(w => {
                    const selected = w.towns.filter(predicate);
                    return selected.filter(t => t.levels.find(l => l.level === level).offered > 0).length / selected.length;
                })), targetDistanceQuantiles: quantiles(cells.map(t => t.levels.find(l => l.level === level).targetDistance)) })) };
        }
        const allTowns = worlds.flatMap(w => w.towns.map(t => ({ seed: w.seed, ...t })));
        const offered = allTowns.filter(t => t.levels[1].offered).sort((a, b) => a.levels[1].targetDistance - b.levels[1].targetDistance);
        const unavailable = allTowns.filter(t => !t.levels[1].offered).sort((a, b) => b.nearestEligibleDistance - a.nearestEligibleDistance);
        const traces = [offered[Math.floor(offered.length / 2)], unavailable[0], offered.at(-1)].filter(Boolean);
        const radiusSensitivity = Object.fromEntries([150, 200, 250, 300, 400, 600].map(radius => [radius,
            interval(worlds.map(w => w.towns.filter(t => t.nearestEligibleDistance <= radius).length / w.towns.length))]));
        results.push({ ...suite, summaries, radiusSensitivity, traces, worlds });
        oldLog(JSON.stringify({ id: suite.id, summaries, radiusSensitivity, traces }, null, 2));
    }
    const output = { methodology: 'Real generated metadata, all settlements, real QuestGenerator and QuestManager matcher at levels 1/5/10. Worlds are independent units; intervals on town proportions use variance across world fractions, never pretend towns are independent. No win rates, travel, safety, rolls, completion or encounter/resource conclusions. Fixed seeded census; CIs characterize sampled world distribution. within150 is hypothetical fallback availability, not production implementation. Representative world traces retained in full rows.',
        worldHooksEnabled: RULES.quests.enableWorldHooks, questSlotBudget: RULES.quests.questSlotBudget,
        investigationFallbackDistanceTiles: RULES.quests.investigationFallbackDistanceTiles ?? null, results };
    fs.writeFileSync(new URL('./investigation-town-coverage.after.results.json', import.meta.url), `${JSON.stringify(output)}\n`);
} finally {
    console.log = oldLog;
    console.warn = oldWarn;
    RULES.worldGen.campaignOverrides = oldOverrides;
}
