/** Supported synthetic composition census; no naturally played journeys. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { RULES } from '../../src/core/rulesEngine.js';
import { gameState } from '../../src/core/GameState.js';
import { Character } from '../../src/systems/Character.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import QuestGenerator from '../../src/systems/QuestGenerator.js';
import QuestManager from '../../src/systems/QuestManager.js';
import MerchantManager from '../../src/systems/MerchantManager.js';
import LootManager from '../../src/systems/LootManager.js';
import RelationManager from '../../src/systems/RelationManager.js';
import { ConsequenceManager } from '../../src/systems/ConsequenceManager.js';
import { SeededRandom } from '../../src/utils/rng.js';
import { getXPForCR } from '../../src/systems/EncounterBuilder.js';
const read = file => JSON.parse(fs.readFileSync(new URL(`../../data/${file}.json`, import.meta.url)));
globalThis.fetch = async path => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(new URL(`../../${String(path).split('?')[0]}`, import.meta.url))) });
const previous = { log: console.log, warn: console.warn };
console.log = console.warn = () => {};
const production = { offers: [], rejected: [], safety: [], prices: [], deadlines: [], bossEligibility: [] };
const urgentSamples = [];
try {
    skillRegistry.setDefinitions(read('skills').skills);
    const town = { id: '2,3', x: 2, y: 3, settlementType: 'town', name: 'Audit town', npcs: [
        { id: 'giver', name: 'Giver', offersQuest: true, culture: 'kethara', role: 'leader' },
        { id: 'seller', name: 'Seller', culture: 'kethara', role: 'merchant' },
        { id: 'smith', name: 'Smith', culture: 'kethara', role: 'blacksmith' }
    ] };
    const site = { x: 4, y: 7, type: 'dungeon', name: 'Audit site', dungeonTypeId: 'cave' };
    gameState.set('world.settlements', [town]);
    gameState.set('world.metadata', { features: [site] });
    const merchant = new MerchantManager('iteration-audit', 'core');
    merchant.merchantInventoryData = read('merchantInventory');
    const outcomes = new ConsequenceManager();
    const loot = new LootManager('iteration-audit', 'core');
    loot.allItems = Object.fromEntries(Object.values(read('items')).filter(Array.isArray).flat().map(item => [item.id, item]));
    loot.itemProperties = read('itemProperties').properties;
    const relations = new RelationManager();
    await relations.init('core');
    globalThis.window = { lootManager: loot, game: { lootManager: loot, merchantManager: merchant,
        consequenceManager: outcomes, npcGenerator: { culturesData: [{ id: 'kethara' }] },
        relationManager: relations,
        dungeonManager: { canClearQuestEncounter() {}, clearQuestEncounter() {},
            dungeonGenerator: { dungeonTypes: [{ id: 'cave', bossPool: [{ id: 'goblin', minLevel: 1, maxLevel: 10 }] }] } } } };
    const generator = new QuestGenerator('iteration-audit', 'core');
    generator.questData = read('quests');
    generator.monsterData = read('monsters');
    const combinations = generator.getCompatibleCompositions();
    for (const level of [1, 5, 10]) {
        const history = [];
        for (let sample = 0; sample < 40; sample++) {
            for (const [index, combination] of combinations.entries()) {
                const grammar = read('quests').questComposition;
                for (const [dimension, component] of Object.entries(combination)) {
                    grammar.dimensions[dimension] = grammar.dimensions[dimension].filter(entry => entry.id === component.id);
                }
                generator.questData.questComposition = grammar;
                gameState.set('quests', { available: [], active: [], completed: history, failed: [] });
                const quest = generator._generateComposedQuest(town, level, [site], new SeededRandom(`iteration-${level}-${sample}-${index}`));
                if (!quest) {
                    assert.ok(Object.values(combination).some(component => component.capabilities?.includes('combat')),
                        `Missing noncombat composition ${level}/${index}`);
                    production.rejected.push({ level, index, reason: 'actual boss XP floor rejects fixture goblin' });
                    continue;
                }
                const tier = RULES.quests.iteration.tiers.find(entry => level <= entry.maxLevel);
                assert.equal(quest.offeredLevel, level);
                assert.ok(quest.actions.filter(action => action.skillId).every(action => action.dc === tier.dc));
                assert.equal(quest.rewards.gold, 20 * level * RULES.quests.iteration.riskMultipliers[quest.risk]);
                assert.equal(quest.rewards.xp, 80 * level * RULES.quests.iteration.riskMultipliers[quest.risk]);
                const snapshot = JSON.stringify(quest);
                gameState.set('character', { level: 10 });
                assert.equal(JSON.stringify(quest), snapshot);
                production.offers.push({ level, risk: quest.risk,
                    dc: quest.actions.filter(action => action.skillId).map(action => action.dc),
                    rewards: quest.rewards, urgent: Boolean(quest.deadlineDuration), duration: quest.deadlineDuration || null,
                    stockQuantity: quest.actions.filter(action => action.acquire || action.salvage).reduce((sum, action) => sum + (action.acquire || action.salvage).quantity, 0),
                    effects: quest.resolutions.flatMap(choice => choice.effects || []) });
                history.push({ ...quest, status: 'completed' });
                if (quest.deadlineDuration && urgentSamples.filter(entry => entry.offeredLevel === level).length < 30) {
                    urgentSamples.push(JSON.parse(JSON.stringify(quest)));
                }
                assert.ok(history.filter(entry => entry.deadlineDuration).length <= Math.floor(history.length * RULES.quests.iteration.urgentShare));
            }
        }
    }
    for (let level = 1; level <= 10; level++) {
        for (const dungeonType of read('dungeonTypes').dungeonTypes) {
            const pool = dungeonType.bossPool || [];
            const eligible = pool.filter(entry => typeof entry === 'string' || level >= (entry.minLevel || 1) && level <= (entry.maxLevel || 10));
            const candidates = eligible.length ? eligible : [[...pool].sort((a, b) => (b.maxLevel || 10) - (a.maxLevel || 10))[0]].filter(Boolean);
            const floor = RULES.quests.iteration.minimumBossBudgetFraction * RULES.encounters.encounterXPThresholds[level].deadly;
            const bosses = candidates.map(entry => {
                const id = typeof entry === 'string' ? entry : entry.id;
                const monster = generator.monsterData.monsters.find(candidate => candidate.id === id);
                const bossXP = monster ? getXPForCR(monster.challengeRating ?? monster.cr ?? 0) * RULES.encounters.bossBuffs.xpMultiplier : 0;
                return { id, bossXP, passes: bossXP >= floor };
            });
            const accepted = generator._hasAppropriateQuestBoss({ ...site, dungeonTypeId: dungeonType.id }, pool, level);
            assert.equal(accepted, Boolean(bosses.length && bosses.every(boss => boss.passes)));
            production.bossEligibility.push({ level, dungeonTypeId: dungeonType.id, floor, accepted, bosses });
        }
    }
    for (let index = 0; index < 100; index++) {
        outcomes.applyQuestEffect({ id: 'safety', type: 'local_safety', siteId: '4,7', multiplier: 0.75, radius: 12 }, { id: `safety-${index}` });
        production.safety.push(outcomes.getEncounterMultiplier({ x: 4, y: 7 }));
    }
    assert.ok(production.safety.every(multiplier => multiplier === 0.75));
    const knight = read('kits').dedication.find(entry => entry.id === 'knight').preset;
    const actor = new Character({ id: 'starting-knight', name: 'Knight', class: read('classes').classes.find(entry => entry.id === 'dedication'),
        species: read('races').races.find(entry => entry.id === 'human'), background: read('backgrounds').backgrounds.find(entry => entry.id === knight.background),
        baseAbilities: knight.abilitiesNVSystem, skillChoices: knight.skills });
    await actor.applyStartingEquipment();
    production.startingGold = actor.gold;
    for (const level of [1, 5, 10]) {
        const score = RULES.quests.iteration.specialist.scoreByLevel.find(entry => level <= entry.maxLevel).score;
        const rarity = loot.qualityScoreToRarity(score);
        const premium = RULES.quests.iteration.specialist.valuePremiumByRarity?.[rarity];
        if (premium === undefined) {
            production.prices.push({ level, pendingPriceConfiguration: true });
            continue;
        }
        assert.ok(merchant.addQuestStock(town.id, `price-${level}`, 'specialist', 'longsword', 'blacksmith', 1, { qualityScore: score, level }));
        const offer = town.questStock.find(entry => entry.sourceQuestId === `price-${level}`).generatedItem;
        const price = merchant.calculateBuyPrice(offer, actor, town.npcs[2]);
        production.prices.push({ level, score, rarity, merchantBaseValue: merchant.merchantInventoryData.blacksmithItems.find(entry => entry.id === 'longsword').value,
            generatedValue: offer.value, buyPrice: price, startingGold: actor.gold,
            routineCommissionsFromZero: Math.ceil(price / (20 * level)),
            routineCommissionsAfterStartingGold: Math.ceil(Math.max(0, price - actor.gold) / (20 * level)) });
    }
    const quests = new QuestManager(generator);
    gameState.set('character', actor);
    for (const [index, saved] of urgentSamples.entries()) {
        const quest = { ...saved, id: `expiry-audit-${index}`, status: 'active', deadlineAt: saved.deadlineDuration };
        gameState.set('quests', { available: [], active: [quest], completed: [], failed: [] });
        gameState.set('world.worldClock', quest.deadlineAt - 1);
        const beforeGold = actor.gold;
        quests.checkQuestDeadlines();
        assert.equal(gameState.get('quests.active').length, 1);
        gameState.set('world.worldClock', quest.deadlineAt);
        quests.checkQuestDeadlines();
        assert.equal(gameState.get('quests.failed').length, 1);
        const receipts = gameState.get('world.metadata.questOutcomes')?.length || 0;
        quests.checkQuestDeadlines();
        assert.equal(gameState.get('world.metadata.questOutcomes')?.length || 0, receipts);
        assert.equal(actor.gold, beforeGold);
        production.deadlines.push({ level: saved.offeredLevel, duration: saved.deadlineDuration, failedOnce: true, goldAwarded: 0 });
    }
} finally {
    console.log = previous.log;
    console.warn = previous.warn;
}
production.methodology = 'Constrained supported synthetic town/site fixture through actual composition compiler; sequential completed history for urgencyquota. No independent realworldcoverage or naturally completedquest claim. Actual ConsequenceManager safety consumer, MerchantManager finite offers and Character startingequipment.';
production.rules = RULES.quests.iteration;
fs.writeFileSync(new URL('./quest-iteration-production.results.json', import.meta.url), JSON.stringify(production, null, 2));
console.log(`Production offers ${production.offers.length}; urgent ${production.offers.filter(entry => entry.urgent).length}; startingGold ${production.startingGold}; prices ${JSON.stringify(production.prices)}`);
console.log(`Boss cells ${production.bossEligibility.length}; accepted L1/L5/L10 ${[1, 5, 10].map(level => production.bossEligibility.filter(cell => cell.level === level && cell.accepted).length).join('/')}; rejected fixtureoffers ${production.rejected.length}; expirytrials ${production.deadlines.length}`);
