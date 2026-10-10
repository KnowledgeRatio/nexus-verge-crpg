/** Publication census, not played travel/completion. Run from any directory with Node. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';
import WorldGenerator from '../../src/systems/WorldGenerator.js';
import NPCGenerator from '../../src/systems/NPCGenerator.js';
import QuestGenerator from '../../src/systems/QuestGenerator.js';
import QuestManager from '../../src/systems/QuestManager.js';
import SettlementManager from '../../src/systems/SettlementManager.js';
import MerchantManager from '../../src/systems/MerchantManager.js';
import RelationManager from '../../src/systems/RelationManager.js';

const root = new URL('../../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
globalThis.fetch = async path => ({ ok: true, json: async () => JSON.parse(read(String(path).split('?')[0])) });
globalThis.window = {};
const campaignId = 'nexus-verge';
const campaign = JSON.parse(read('data/campaigns.json')).campaigns.find(entry => entry.id === campaignId);
const worldCount = Number(process.env.QUEST_AUDIT_WORLDS || 20);
assert.ok(Number.isInteger(worldCount) && worldCount >= 2);
const quantiles = values => {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    return Object.fromEntries([0, 0.5, 0.9, 0.95, 1].map(p => [p, sorted[Math.floor((sorted.length - 1) * p)] ?? null]));
};
const worldInterval = values => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
    const margin = 1.96 * Math.sqrt(variance / values.length);
    return { mean, ci95: [Math.max(0, mean - margin), Math.min(1, mean + margin)], independentWorlds: values.length };
};
const oldLog = console.log;
const oldWarn = console.warn;
const oldOverrides = RULES.worldGen.campaignOverrides;
const worlds = [];
console.log = () => {};
console.warn = () => {};
try {
    RULES.worldGen.campaignOverrides = { ...campaign.featureGeneration };
    for (const level of [1, 5, 10]) {
        for (let seed = 0; seed < worldCount; seed++) {
            gameState.reset();
            gameState.set('character', { level });
            gameState.set('quests', { available: [], active: [], completed: [], failed: [] });
            const worldSeed = `procedural-quest-publication-${seed}`;
            const world = new WorldGenerator(worldSeed, { mapSize: 'small', difficulty: 'normal', campaignId });
            await world.generateWorldMetadata();
            const npcGenerator = new NPCGenerator(worldSeed, campaignId);
            const generator = new QuestGenerator(worldSeed, campaignId);
            const questManager = new QuestManager(generator);
            const relationManager = new RelationManager();
            const merchantManager = new MerchantManager(worldSeed, campaignId);
            await Promise.all([npcGenerator.loadData(), generator.loadData(), relationManager.init(campaignId), merchantManager.loadData()]);
            window.game = { worldGenerator: world, npcGenerator, questGenerator: generator,
                questManager, relationManager, merchantManager };
            const settlementManager = new SettlementManager(world, { showSettlementModal() {} }, npcGenerator, generator, questManager);
            const towns = [];
            const sorted = [...world.worldMetadata.settlements].sort((a, b) => a.x - b.x || a.y - b.y);
            for (const town of sorted) {
                // Synthetic visit policy: skip walking/region streaming; retain real entry/publication path.
                gameState.set('player.position', { x: town.x, y: town.y });
                settlementManager.getSettlementAtPlayerPosition = () => town;
                const hooksBefore = generator.getHooksForSettlement(town.id).length;
                const nearbyBefore = generator.getNearbyInvestigationHooks(town).length;
                const previous = gameState.get('quests.available').length;
                assert.equal(await settlementManager.enterSettlement(), true);
                const published = gameState.get('quests.available').slice(previous);
                const procedural = published.filter(quest => quest.procedural);
                const allProcedural = gameState.get('quests.available').filter(quest => quest.procedural);
                const targets = allProcedural.map(quest => quest.dungeonHookId);
                assert.equal(new Set(targets).size, targets.length, 'No simultaneous duplicate procedural incidents');
                const budget = RULES.quests.questSlotBudget[town.settlementType];
                assert.ok(published.length <= budget);
                for (const quest of published.filter(quest => quest.dungeonHookId)) {
                    const target = world.worldMetadata.features.find(feature => `${feature.x},${feature.y}` === quest.dungeonHookId);
                    assert.ok(target);
                    assert.ok(!quest.pendingBind);
                    if (quest.type === 'retrieve') {
                        assert.equal(target.questBind?.questId, quest.id);
                    }
                }
                for (const quest of procedural) {
                    assert.ok(town.npcs.some(npc => npc.id === quest.questGiverId));
                    for (const participant of Object.values(quest.procedural.participants)) {
                        assert.ok(town.npcs.some(npc => npc.id === participant.npcId));
                    }
                }
                towns.push({ id: town.id, x: town.x, y: town.y, type: town.settlementType, budget,
                    localHooksBefore: hooksBefore, nearbyCandidateBefore: nearbyBefore > 0,
                    offers: published.map(quest => ({ id: quest.id, type: quest.type, target: quest.dungeonHookId ?? null,
                        arrangement: quest.procedural?.arrangement ?? null,
                        variantId: quest.procedural?.variantId ?? null, distance: quest.distanceTiles ?? null,
                        worldEffectOpportunity: Boolean(quest.resolutions?.some(choice => choice.effects?.some(effect => effect.type === 'merchant_stock'))),
                        factionOpportunity: Boolean(quest.resolutions?.some(choice => choice.effects?.some(effect => effect.type === 'faction'))) })) });
            }
            worlds.push({ level, seed: worldSeed, towns, eligibleFeatures: world.worldMetadata.features.filter(feature =>
                feature.type === 'dungeon' || (feature.type === 'poi' && feature.resolvedType === 'dungeon')).length });
        }
        process.stderr.write(`Publication census: level ${level}, ${worldCount} worlds complete\n`);
    }
    const summaries = [1, 5, 10].map(level => {
        const selected = worlds.filter(world => world.level === level);
        const towns = selected.flatMap(world => world.towns);
        const offers = towns.flatMap(town => town.offers);
        const procedural = offers.filter(quest => quest.arrangement);
        return { level, worlds: selected.length, settlements: towns.length, offers: offers.length,
            proceduralOffers: procedural.length,
            fallbackInvestigations: offers.filter(quest => quest.type === 'investigate' && !quest.arrangement).length,
            worldEffectOpportunities: procedural.filter(quest => quest.worldEffectOpportunity).length,
            factionOpportunities: procedural.filter(quest => quest.factionOpportunity).length,
            eligibleBeforeEntry: towns.filter(town => town.localHooksBefore || town.nearbyCandidateBefore).length,
            zeroOfferBoards: towns.filter(town => !town.offers.length).length,
            variants: Object.fromEntries([...new Set(procedural.map(quest => quest.variantId))].sort()
                .map(variant => [variant, procedural.filter(quest => quest.variantId === variant).length])),
            arrangements: Object.fromEntries([...new Set(procedural.map(quest => quest.arrangement))].sort()
                .map(arrangement => [arrangement, procedural.filter(quest => quest.arrangement === arrangement).length])),
            proceduralDistance: quantiles(procedural.map(quest => quest.distance)),
            boardOffers: quantiles(towns.map(town => town.offers.length)),
            proceduralCoverage: worldInterval(selected.map(world => world.towns.filter(town => town.offers.some(quest => quest.arrangement)).length / world.towns.length)),
            worldEffectCoverage: worldInterval(selected.map(world => world.towns.filter(town => town.offers.some(quest => quest.worldEffectOpportunity)).length / world.towns.length)),
            investigationCoverage: worldInterval(selected.map(world => world.towns.filter(town => town.offers.some(quest => quest.type === 'investigate')).length / world.towns.length)) };
    });
    const rows = worlds.filter(world => world.level === 1).flatMap(world => world.towns.map(town => ({ seed: world.seed, ...town })));
    const offered = rows.filter(town => town.offers.some(quest => quest.arrangement))
        .sort((a, b) => a.offers.find(quest => quest.arrangement).distance - b.offers.find(quest => quest.arrangement).distance);
    const traces = [offered[Math.floor(offered.length / 2)], rows.find(town => !town.offers.some(quest => quest.arrangement)), offered.at(-1)].filter(Boolean);
    const output = { methodology: `${worldCount} independent seeded small nexus-verge worlds, paired level 1/5/10 projections. Real WorldGenerator/NPCGenerator/QuestGenerator/SettlementManager publication and pendingBind consumption; all offers retained available. Synthetic coordinate-sorted visits, no walking, encounters, acceptance, completion, reward receipts or renewals. World intervals use independent world fractions; towns are not independent trials. No combat win rates. Fixed seeds and policy characterize this sampled distribution only.`,
        campaignId, worldCount, config: { proceduralCore: RULES.quests.proceduralCore, questSlotBudget: RULES.quests.questSlotBudget },
        simultaneousDuplicateIncidents: 0, summaries, traces, worlds };
    fs.writeFileSync(new URL('./procedural-quest-audit.results.json', import.meta.url), `${JSON.stringify(output)}\n`);
    oldLog(JSON.stringify({ summaries, traces }, null, 2));
} finally {
    console.log = oldLog;
    console.warn = oldWarn;
    RULES.worldGen.campaignOverrides = oldOverrides;
}
