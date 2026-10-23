/** Bounded public-path publication census; synthetic visits, zero played journeys. */
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
import LootManager from '../../src/systems/LootManager.js';
import { ConsequenceManager } from '../../src/systems/ConsequenceManager.js';
import { DungeonGenerator } from '../../src/systems/DungeonGenerator.js';
import { DungeonManager } from '../../src/systems/DungeonManager.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
const read = path => JSON.parse(fs.readFileSync(new URL(`../../${path}`, import.meta.url)));
globalThis.fetch = async path => ({ ok: true, json: async () => read(String(path).split('?')[0]) });
globalThis.window = {};
const original = { log: console.log, warn: console.warn, overrides: RULES.worldGen.campaignOverrides };
console.log = console.warn = () => {};
const cells = [];
try {
    skillRegistry.setDefinitions(read('data/skills.json').skills);
    RULES.worldGen.campaignOverrides = read('data/campaigns.json').campaigns.find(row => row.id === 'nexus-verge').featureGeneration;
    for (const level of [1, 5, 10]) {
        for (let seed = 0; seed < 3; seed++) {
            const worldSeed = `procedural-quest-publication-${seed}`;
            gameState.reset();
            gameState.set('character', { level });
            gameState.set('quests', { available: [], active: [], completed: [], failed: [] });
            const world = new WorldGenerator(worldSeed, { mapSize: 'small', difficulty: 'normal', campaignId: 'nexus-verge' });
            await world.generateWorldMetadata();
            const npcGenerator = new NPCGenerator(worldSeed, 'nexus-verge');
            const generator = new QuestGenerator(worldSeed, 'nexus-verge');
            const manager = new QuestManager(generator);
            const relations = new RelationManager();
            const merchant = new MerchantManager(worldSeed, 'nexus-verge');
            const loot = new LootManager(worldSeed, 'nexus-verge');
            const dungeonGenerator = new DungeonGenerator(worldSeed);
            const dungeon = new DungeonManager(dungeonGenerator, world);
            dungeon.setMonstersData(read('data/monsters.json'));
            await Promise.all([npcGenerator.loadData(), generator.loadData(), relations.init('nexus-verge'),
                merchant.loadData(), loot.loadData(), dungeonGenerator.loadData()]);
            window.lootManager = loot;
            window.game = { worldGenerator: world, npcGenerator, questGenerator: generator,
                questManager: manager, relationManager: relations, merchantManager: merchant,
                dungeonManager: dungeon, lootManager: loot, consequenceManager: new ConsequenceManager() };
            const settlement = new SettlementManager(world, { showSettlementModal() {} }, npcGenerator, generator, manager);
            const towns = [];
            for (const town of [...world.worldMetadata.settlements].sort((a, b) => a.x - b.x || a.y - b.y)) {
                gameState.set('player.position', { x: town.x, y: town.y });
                settlement.getSettlementAtPlayerPosition = () => town;
                const before = gameState.get('quests.available').length;
                assert.equal(await settlement.enterSettlement(), true);
                const offers = gameState.get('quests.available').slice(before);
                for (const quest of offers.filter(row => row.iteration && row.risk === 'perilous')) {
                    const site = world.worldMetadata.features.find(feature => `${feature.x},${feature.y}` === quest.dungeonHookId);
                    const type = dungeon.getQuestDungeonType(site);
                    assert.ok(generator._hasAppropriateQuestBoss(site, type.bossPool, quest.offeredLevel));
                }
                towns.push({ id: town.id, offers: offers.map(quest => ({ type: quest.type,
                    composed: Boolean(quest.procedural?.components), risk: quest.risk || null,
                    urgent: Boolean(quest.deadlineDuration), level: quest.offeredLevel || null,
                    specialist: Boolean(quest.procedural?.components?.subject === 'specialist_equipment') })) });
            }
            cells.push({ seed, level, towns });
            process.stderr.write(`World census L${level} seed${seed}: ${towns.length}towns\n`);
        }
    }
} finally {
    console.log = original.log;
    console.warn = original.warn;
    RULES.worldGen.campaignOverrides = original.overrides;
}
const summaries = [1, 5, 10].map(level => {
    const towns = cells.filter(cell => cell.level === level).flatMap(cell => cell.towns);
    const offers = towns.flatMap(town => town.offers);
    return { level, settlements: towns.length, offers: offers.length,
        townsWithComposed: towns.filter(town => town.offers.some(quest => quest.composed)).length,
        townsWithInvestigationOrComposed: towns.filter(town => town.offers.some(quest => quest.composed || quest.type === 'investigate')).length,
        zeroOfferBoards: towns.filter(town => !town.offers.length).length,
        composed: offers.filter(quest => quest.composed).length,
        combatComposed: offers.filter(quest => quest.composed && quest.risk === 'perilous').length,
        specialist: offers.filter(quest => quest.specialist).length,
        urgent: offers.filter(quest => quest.urgent).length };
});
const output = { methodology: 'Three independent seeded small worlds, paired levels1/5/10, one ascending-coordinate visit order. Actual loaded World/NPC/Settlement/public QuestGenerator, DungeonManager/Generator, Loot/Merchant/Relation/Consequence consumers. No naturally walked journeys, accepted quests or combat winrates. Small bounded census; not broad replayability or journey balance clearance.', playedJourneys: 0, independentWorlds: 3, summaries, cells };
fs.writeFileSync(new URL('./quest-iteration-world.results.json', import.meta.url), JSON.stringify(output, null, 2));
console.log(JSON.stringify(summaries));
