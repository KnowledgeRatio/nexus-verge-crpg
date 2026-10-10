import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import MerchantManager from '../../src/systems/MerchantManager.js';
import SettlementManager from '../../src/systems/SettlementManager.js';
import saveManager from '../../src/systems/SaveManager.js';
import { gameState, GameState } from '../../src/core/GameState.js';
import Character from '../../src/systems/Character.js';

const inventoryData = JSON.parse(readFileSync(new URL('../../data/merchantInventory.json', import.meta.url)));

describe('Recovered shipments in real merchant inventory', () => {
    let previous;
    let merchant;
    let town;
    let npc;
    beforeEach(() => {
        previous = gameState.data;
        gameState.data = new GameState().data;
        npc = { id: 'town-merchant', name: 'Merchant', role: 'merchant' };
        town = { id: '2,3', x: 2, y: 3, name: 'Town', settlementType: 'town', npcs: [npc] };
        gameState.set('world.settlements', [town,
            { id: '9,9', x: 9, y: 9, settlementType: 'town', npcs: [{ id: 'other', role: 'merchant' }] }]);
        gameState.set('ui.currentSettlement', town);
        const character = new Character({ name: 'Buyer', level: 1,
            class: { id: 'dedication', hitDie: 8, savingThrowProficiencies: [], features: {} },
            species: { abilityScoreIncrease: {}, traits: [], speed: 30 },
            background: { skillProficiencies: [], startingGold: 100 } });
        character.gold = 100;
        character.inventory = [];
        gameState.set('character', JSON.parse(JSON.stringify(character)));
        merchant = new MerchantManager('shipment-seed', 'core');
        merchant.merchantInventoryData = inventoryData;
        vi.stubGlobal('window', { game: {} });
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(merchant, 'calculateBuyPrice').mockImplementation(item => item.value);
    });
    afterEach(() => {
        gameState.data = previous;
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('adds separate finite stock without altering the seeded ordinary inventory', async () => {
        const before = await merchant.generateMerchantInventory(town);
        expect(merchant.addQuestStock(town.id, 'quest-one', 'shipment', 'rations', 'merchant', 2)).toBe(true);
        const after = await merchant.generateMerchantInventory(town);
        expect(after.filter(item => !item.questStock)).toEqual(before);
        expect(after.filter(item => item.questStock)).toMatchObject([{ id: 'rations', stock: 2 }]);
        expect((await merchant.generateMerchantInventory(gameState.get('world.settlements')[1]))
            .some(item => item.questStock)).toBe(false);
    });

    it('purchases persist and exhausted shipments never restock after save, restore or duplicate effects', async () => {
        merchant.addQuestStock(town.id, 'quest-one', 'shipment', 'rations', 'merchant', 2);
        const row = (await merchant.generateMerchantInventory(town)).find(item => item.questStock);
        expect(merchant.buyItem(row, gameState.get('character'), 2, npc).success).toBe(true);
        expect(gameState.get('character.gold')).toBe(90);
        expect(gameState.get('character.inventory')).toMatchObject([{ id: 'rations', quantity: 2 }]);
        expect(gameState.get('character.inventory')[0].questStock).toBeUndefined();
        expect(merchant.buyItem(row, gameState.get('character'), 1, npc).success).toBe(false);
        saveManager.deserializeGameState(JSON.parse(JSON.stringify(saveManager.serializeGameState())));
        town = gameState.get('world.settlements')[0];
        const regenerated = { ...town, questStock: undefined };
        new SettlementManager()._restoreSettlementFromPersistent(regenerated);
        expect(regenerated.questStock[0].remaining).toBe(0);
        expect(merchant.addQuestStock(town.id, 'quest-one', 'shipment', 'rations', 'merchant', 2)).toBe(true);
        expect((await merchant.generateMerchantInventory(regenerated)).some(item => item.questStock)).toBe(false);
    });

    it('retains partial quantity and keeps independently recovered shipments separate', async () => {
        merchant.addQuestStock(town.id, 'quest-one', 'shipment', 'rations', 'merchant', 2);
        merchant.addQuestStock(town.id, 'quest-two', 'shipment', 'rations', 'merchant', 1);
        const rows = (await merchant.generateMerchantInventory(town)).filter(item => item.questStock);
        expect(rows[0].stockId).not.toBe(rows[1].stockId);
        expect(merchant.buyItem(rows[0], gameState.get('character'), 1, npc).success).toBe(true);
        expect(town.questStock.map(entry => entry.remaining)).toEqual([1, 1]);
        expect((await merchant.generateMerchantInventory(town)).filter(item => item.questStock)
            .map(item => item.stock)).toEqual([1, 1]);
    });

    it('rejects unsupported binding, wrong merchants, remote purchases and invalid quantities', async () => {
        expect(merchant.addQuestStock('missing', 'quest', 'shipment', 'rations', 'merchant', 1)).toBe(false);
        expect(merchant.addQuestStock(town.id, 'quest', 'shipment', 'missing', 'merchant', 1)).toBe(false);
        expect(merchant.addQuestStock(town.id, 'quest', 'shipment', 'rations', 'blacksmith', 1)).toBe(false);
        merchant.addQuestStock(town.id, 'quest', 'shipment', 'rations', 'merchant', 1);
        const row = (await merchant.generateMerchantInventory(town)).find(item => item.questStock);
        for (const quantity of [0, -1, 0.5, 2]) {
            expect(merchant.buyItem(row, gameState.get('character'), quantity, npc).success).toBe(false);
        }
        expect(merchant.buyItem(row, gameState.get('character'), 1, { id: 'other' }).success).toBe(false);
        gameState.set('ui.currentSettlement', gameState.get('world.settlements')[1]);
        expect(merchant.buyItem(row, gameState.get('character'), 1, npc).success).toBe(false);
        expect(town.questStock[0].remaining).toBe(1);
        expect(gameState.get('character.gold')).toBe(100);
    });
});
