import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../src/systems/AudioManager.js', () => ({ default: { play: vi.fn() } }));
import { gameState, GameState } from '../../src/core/GameState.js';
import { ConsequenceManager } from '../../src/systems/ConsequenceManager.js';
import MerchantManager from '../../src/systems/MerchantManager.js';
import SettlementManager from '../../src/systems/SettlementManager.js';
import LootManager from '../../src/systems/LootManager.js';
import Player from '../../src/systems/Player.js';
import { RULES } from '../../src/core/rulesEngine.js';

const read = file => JSON.parse(readFileSync(new URL(`../../data/${file}.json`, import.meta.url)));
let previous, outcomes, merchant, town;
const quest = { id: 'outcome-test' };
beforeEach(() => {
    previous = gameState.data;
    gameState.data = new GameState().data;
    town = { id: '2,3', x: 2, y: 3, name: 'Town', settlementType: 'town',
        npcs: [{ id: 'seller', role: 'merchant' }, { id: 'smith', role: 'blacksmith' }] };
    gameState.set('world.settlements', [town]);
    gameState.set('world.metadata', { features: [{ x: 4, y: 5, type: 'dungeon' },
        { x: 5, y: 5, type: 'dungeon' }] });
    merchant = new MerchantManager('outcome-world', 'core');
    merchant.merchantInventoryData = read('merchantInventory');
    outcomes = new ConsequenceManager();
    vi.stubGlobal('window', { game: { consequenceManager: outcomes, merchantManager: merchant } });
    vi.stubGlobal('document', { addEventListener: vi.fn() });
    vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
    gameState.data = previous;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('typed outcomes with real downstream consumers', () => {
    it('persists strongest safety once, replaces failure with later success, and leaves outside unchanged', () => {
        const effect = { id: 'safety', type: 'local_safety', siteId: '4,5', multiplier: 1.25, radius: 12 };
        expect(outcomes.applyQuestEffect(effect, quest)).toBe(true);
        expect(outcomes.applyQuestEffect(effect, quest)).toBe(true);
        expect(gameState.get('world.metadata.questOutcomes')).toHaveLength(1);
        expect(outcomes.getEncounterMultiplier({ x: 4, y: 5 })).toBe(1.25);
        expect(outcomes.getEncounterMultiplier({ x: 17, y: 5 })).toBe(1);
        outcomes.applyQuestEffect({ ...effect, multiplier: 0.75 }, { id: 'later-success' });
        outcomes.applyQuestEffect({ ...effect, siteId: '5,5', multiplier: 0.75 }, { id: 'other-success' });
        gameState.set('world.metadata', JSON.parse(JSON.stringify(gameState.get('world.metadata'))));
        expect(new ConsequenceManager().getEncounterMultiplier({ x: 4, y: 5 })).toBe(0.75);
        const player = new Player({}, null);
        player.x = 4; player.y = 5;
        vi.spyOn(player, 'triggerCombatEncounter').mockResolvedValue();
        gameState.set('player.encounterAccumulator', RULES.movement.encounterAccumulatorThreshold);
        vi.spyOn(Math, 'random').mockReturnValue(RULES.movement.baseEncounterProbability * 0.9);
        player.checkForEncounters({}, { encounterModifier: 1, movementCost: 1 });
        expect(player.triggerCombatEncounter).not.toHaveBeenCalled();
    });

    it('shortage changes only the named ordinary stock and a later delivery restores availability', async () => {
        const baseline = await merchant.generateMerchantInventory(town);
        const named = baseline.find(item => item.stock >= 2);
        expect(named).toBeDefined();
        const effect = { id: 'shortage', type: 'merchant_availability', settlementId: town.id,
            merchantRole: 'merchant', itemId: named.id, availability: 0.5 };
        outcomes.applyQuestEffect(effect, quest);
        const shortage = await merchant.generateMerchantInventory(town);
        expect(shortage.find(item => item.id === named.id).stock).toBe(Math.ceil(named.stock * 0.5));
        expect(shortage.filter(item => item.id !== named.id)).toEqual(baseline.filter(item => item.id !== named.id));
        const restored = JSON.parse(JSON.stringify(gameState.get('world.settlements')));
        gameState.set('world.settlements', restored);
        const manager = new SettlementManager({});
        const live = { id: town.id, x: 2, y: 3 };
        manager._restoreSettlementFromPersistent(live);
        expect(live.questAvailability).toHaveLength(1);
        outcomes.applyQuestEffect({ ...effect, availability: 1 }, { id: 'delivery' });
        expect(await merchant.generateMerchantInventory(town)).toEqual(baseline);
    });

    it('reveals only an actual site and persists its map consumer record', () => {
        const tile = { x: 4, y: 5, explored: false };
        const refreshTrackingIntel = vi.fn();
        window.game.questManager = { refreshTrackingIntel };
        window.game.worldGenerator = { getCachedTile: () => tile };
        expect(outcomes.canApplyQuestEffect({ id: 'intel', type: 'reveal_location', siteId: '99,99' }, quest)).toBe(false);
        expect(outcomes.applyQuestEffect({ id: 'intel', type: 'reveal_location', siteId: '4,5' }, quest)).toBe(true);
        expect(tile.explored).toBe(true);
        expect(gameState.get('world.metadata.features')[0].explored).toBe(true);
        expect(gameState.get('world.modifiedTiles')).toEqual([{ x: 4, y: 5, explored: true }]);
        expect(refreshTrackingIntel).toHaveBeenCalledOnce();
        outcomes.applyQuestEffect({ id: 'intel', type: 'reveal_location', siteId: '4,5' }, quest);
        expect(refreshTrackingIntel).toHaveBeenCalledOnce();
    });

    it('saves one actual enchanted offer, buys its exact instance at canonical price and never replenishes', async () => {
        const loot = new LootManager('outcome-world', 'core');
        const items = read('items');
        loot.allItems = Object.fromEntries(Object.values(items).filter(Array.isArray).flat().map(item => [item.id, item]));
        loot.itemProperties = read('itemProperties').properties;
        window.lootManager = loot;
        const item = merchant.merchantInventoryData.blacksmithItems.find(candidate =>
            ['weapon', 'armor', 'shield'].includes(loot.allItems[candidate.id]?.type));
        expect(item).toBeDefined();
        expect(merchant.addQuestStock(town.id, quest.id, 'specialist', item.id, 'blacksmith', 1,
            { qualityScore: 4, level: 1 })).toBe(true);
        const before = JSON.parse(JSON.stringify(gameState.get('world.settlements')));
        gameState.set('world.settlements', before);
        const offer = (await merchant.generateMerchantInventory(town, 'blacksmith')).find(row => row.questStock);
        expect(offer.effectiveRarity).toBe('fine');
        expect(offer.instanceId).toBe(`quest_offer_${quest.id}_specialist`);
        expect(offer.bonus > 0 || offer.magicProperties.length > 0).toBe(true);
        expect(offer.value).toBe(item.value +
            RULES.quests.iteration.specialist.valuePremiumByRarity.fine);
        expect(merchant.canAddQuestSpecialistStock(town.id, item.id, 'blacksmith', 8, 1)).toBe(false);
        const character = { gold: 10000, inventory: [{ id: item.id, type: offer.type }], skills: {} };
        const price = merchant.calculateBuyPrice(offer, character, town.npcs[1]);
        gameState.set('ui.currentSettlement', town);
        expect(merchant.buyItem({ ...offer, value: 0 }, character, 1, town.npcs[1]).cost).toBe(price);
        expect(character.inventory).toHaveLength(2);
        expect(character.inventory[1].instanceId).toBe(offer.instanceId);
        expect(merchant.buyItem(offer, character, 1, town.npcs[1]).success).toBe(false);
        merchant.addQuestStock(town.id, quest.id, 'specialist', item.id, 'blacksmith', 1,
            { qualityScore: 8, level: 10 });
        expect((await merchant.generateMerchantInventory(town, 'blacksmith')).some(row => row.questStock)).toBe(false);
    });
});
