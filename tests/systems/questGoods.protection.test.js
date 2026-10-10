import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MerchantManager from '../../src/systems/MerchantManager.js';
import Character from '../../src/systems/Character.js';
import { gameState } from '../../src/core/GameState.js';

const main = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const method = name => new Function('gameState', `return function(item, character) {${
    main.match(new RegExp(`    ${name}\\(item, character\\) \\{([\\s\\S]*?)\\n {4}\\}`))[1]
}}`)(gameState);

afterEach(() => vi.restoreAllMocks());

describe('quest-bound custody cannot be traded or discarded', () => {
    const goods = { id: 'rations', consumable: true, quantity: 2,
        questSource: { questId: 'delivery', sourceId: 'consignment' } };

    it('rejects selling before removing inventory or granting gold, including restored characters', () => {
        const character = { inventory: [JSON.parse(JSON.stringify(goods))], gold: 3 };
        const merchant = new MerchantManager('goods');
        vi.spyOn(merchant, 'calculateSellPrice').mockImplementation(() => {
            throw new Error('must reject before pricing');
        });
        expect(merchant.sellItem(character.inventory[0], character, 1).success).toBe(false);
        expect(character.inventory[0].quantity).toBe(2);
        expect(character.gold).toBe(3);
    });

    it.each(['useItem', 'dropItem'])('rejects %s through the actual inventory handler', name => {
        vi.spyOn(gameState, 'addMessage').mockImplementation(() => {});
        const character = { inventory: [goods], currentHP: 1, gold: 3 };
        method(name).call({}, goods, character);
        expect(character.inventory).toEqual([goods]);
        expect(character.currentHP).toBe(1);
    });

    it.each([false, true])('keeps bought ordinary goods separate from custody (plain=%s)', plain => {
        const character = new Character({ name: 'Buyer', class: { id: 'dedication', hitDie: 8, features: {} },
            species: {}, background: {}, inventory: [] });
        character.inventory = [{ ...goods, type: 'quest_item' }];
        character.gold = 100;
        const buyer = plain ? JSON.parse(JSON.stringify(character)) : character;
        const merchant = new MerchantManager('goods');
        vi.spyOn(merchant, 'calculateBuyPrice').mockReturnValue(1);
        vi.stubGlobal('window', { game: {} });
        expect(merchant.buyItem({ id: 'rations', type: 'misc', name: 'Rations', stock: 3 }, buyer, 1).success).toBe(true);
        expect(buyer.inventory.find(item => item.questSource).quantity).toBe(2);
        expect(buyer.inventory.find(item => !item.questSource).quantity).toBe(1);
        if (!plain) {
            expect(buyer.removeItem('rations', 1)).toBe(true);
            expect(buyer.inventory).toHaveLength(1);
            expect(buyer.inventory[0].questSource).toEqual(goods.questSource);
        }
        vi.unstubAllGlobals();
    });
});
