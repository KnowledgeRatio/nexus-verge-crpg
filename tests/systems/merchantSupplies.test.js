import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import MerchantManager from '../../src/systems/MerchantManager.js';
import saveManager from '../../src/systems/SaveManager.js';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import { getSupplyCapacityRemaining, restoreSupplies } from '../../src/systems/FatigueManager.js';

const data = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));
const supply = () => ({ ...data('merchantInventory').merchantItems.find(item =>
    item.purchaseEffect?.type === 'restoreSupplies'), stock: 5 });

describe('Direct merchant supply refill', () => {
    let previous;
    let manager;
    let character;
    beforeEach(() => {
        previous = { state: gameState.data, enabled: RULES.fatigue.enabled, skills: skillRegistry.definitions };
        RULES.fatigue.enabled = true;
        skillRegistry.setDefinitions(data('skills').skills);
        character = { level: 1, gold: 200, inventory: [], skills: {} };
        gameState.data = { character, fatigue: { current: 75, exhaustionLevels: 2, supplies: 0,
            suppliesZeroStreak: 1, lastThreshold: 'staggering' }, world: { worldClock: 4, settlements: [] },
        ui: { messageLog: [] }, quests: { active: [{ deadlineAt: 7 }] } };
        vi.stubGlobal('window', { game: { updateFatigueHUD: vi.fn() } });
        vi.stubGlobal('fetch', vi.fn(async url => ({ json: async () => data(url.split('/').pop().replace('.json', '')) })));
        vi.spyOn(console, 'log').mockImplementation(() => {});
        manager = new MerchantManager('supplies-test', 'core');
    });
    afterEach(() => {
        gameState.data = previous.state;
        RULES.fatigue.enabled = previous.enabled;
        skillRegistry.setDefinitions(previous.skills);
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it.each([1, 5, 10])('refills level %i plain characters without changing fatigue, deadlines or creating inventory', level => {
        character.level = level;
        const result = manager.buyItem(supply(), character, 2);
        expect(result.success).toBe(true);
        expect(character.gold).toBe(200 - result.cost);
        expect(character.inventory).toEqual([]);
        expect(gameState.get('fatigue')).toEqual({ current: 75, exhaustionLevels: 2, supplies: 2,
            suppliesZeroStreak: 1, lastThreshold: 'staggering' });
        expect(gameState.get('world.worldClock')).toBe(4);
        expect(gameState.get('quests.active')[0].deadlineAt).toBe(7);
        const saved = JSON.parse(JSON.stringify(saveManager.serializeGameState()));
        gameState.set('fatigue', saved.fatigue);
        gameState.set('character', saved.character);
        expect(getSupplyCapacityRemaining()).toBe(1);
        expect(manager.buyItem(supply(), gameState.get('character')).success).toBe(true);
        expect(gameState.get('fatigue.supplies')).toBe(RULES.fatigue.suppliesMaxCarry);
    });

    it.each([0, -1, 1.5, NaN, Infinity, 4])('rejects invalid or overflowing quantity %s before any mutation', quantity => {
        const before = JSON.stringify(gameState.data);
        expect(manager.buyItem(supply(), character, quantity).success).toBe(false);
        expect(JSON.stringify(gameState.data)).toBe(before);
    });

    it('rejects full packs, insufficient gold, disabled effects and malformed stock/effects', () => {
        for (const entry of [{ supplies: 3 }, { gold: 0 }, { enabled: false },
            { stock: 0 }, { stock: Infinity }, { stock: NaN }, { stock: 1.5 }, { stock: undefined },
            { effect: { type: 'restoreSupplies', amount: 0 } }, { effect: { type: 'restoreSupplies', amount: 1.5 } },
            { effect: { type: 'unknown', amount: 1 } }]) {
            const item = supply();
            character.gold = entry.gold ?? 200;
            gameState.get('fatigue').supplies = entry.supplies ?? 0;
            RULES.fatigue.enabled = entry.enabled ?? true;
            if (Object.hasOwn(entry, 'stock')) {
                item.stock = entry.stock;
            }
            if (entry.effect) {
                item.purchaseEffect = entry.effect;
            }
            const before = JSON.stringify(gameState.data);
            expect(manager.buyItem(item, character).success).toBe(false);
            expect(JSON.stringify(gameState.data)).toBe(before);
        }
    });

    it('caps the helper, leaves hunger history untouched, and respects the disabled flag', () => {
        expect(restoreSupplies(10)).toBe(3);
        expect(restoreSupplies(1)).toBe(0);
        expect(gameState.get('fatigue.suppliesZeroStreak')).toBe(1);
        RULES.fatigue.enabled = false;
        expect(getSupplyCapacityRemaining()).toBe(0);
        expect(restoreSupplies(1)).toBe(0);
    });

    it.each([undefined, '0', NaN, Infinity, -1, 0.5])('rejects malformed saved supplies %s without charging', supplies => {
        gameState.get('fatigue').supplies = supplies;
        const before = JSON.stringify(gameState.data);
        expect(getSupplyCapacityRemaining()).toBe(0);
        expect(restoreSupplies(1)).toBe(0);
        expect(manager.buyItem(supply(), character).success).toBe(false);
        expect(JSON.stringify(gameState.data)).toBe(before);
    });

    it('keeps ordinary purchases in inventory and leaves ordinary stock consumption to the UI', () => {
        const item = { id: 'rope', type: 'misc', name: 'Rope', value: 5, stock: 3 };
        expect(manager.buyItem(item, character, 2).success).toBe(true);
        expect(character.inventory).toEqual([{ id: 'rope', type: 'misc', name: 'Rope', value: 5, quantity: 2 }]);
        expect(item.stock).toBe(3);
        expect(gameState.get('fatigue.supplies')).toBe(0);
    });

    it('guarantees eligible refill stock within seeded item budgets for every settlement type', async () => {
        for (const settlementType of Object.keys(RULES.merchant.inventoryBySettlementType)) {
            const settlement = { id: '0,0', x: 0, y: 0, settlementType, name: 'Town' };
            const generated = await manager.generateMerchantInventory(settlement);
            expect(generated).toEqual(await manager.generateMerchantInventory(settlement));
            expect(generated.filter(item => item.purchaseEffect?.type === 'restoreSupplies')).toHaveLength(1);
            const config = RULES.merchant.inventoryBySettlementType[settlementType];
            const eligibleCount = manager.merchantInventoryData.merchantItems.filter(item =>
                config.allowedRarities.includes(item.rarity)).length;
            expect(generated.length).toBeGreaterThanOrEqual(Math.min(config.minItems, eligibleCount));
            expect(generated.length).toBeLessThanOrEqual(config.maxItems);
            RULES.fatigue.enabled = false;
            expect((await manager.generateMerchantInventory(settlement)).some(item => item.purchaseEffect)).toBe(false);
            RULES.fatigue.enabled = true;
        }
    });

    it('filters guaranteed entries by actual rarity and campaign before selection', async () => {
        await manager.loadData();
        expect(manager.merchantInventoryData.merchantItems.every(item =>
            !item.campaignIds || item.campaignIds.includes('core'))).toBe(true);
        manager.merchantInventoryData.merchantItems = [
            { ...supply(), rarity: 'legendary' },
            { id: 'ordinary', type: 'misc', value: 5, rarity: 'common' }
        ];
        const generated = await manager.generateMerchantInventory({ x: 0, y: 0, settlementType: 'village' });
        expect(generated.map(item => item.id)).toEqual(['ordinary']);
    });
});
