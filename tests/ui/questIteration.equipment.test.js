import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';

const source = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const extract = (name, signature) => {
    const body = source.match(new RegExp(`    ${name}\\(${signature}\\) \\{([\\s\\S]*?)\\n {4}\\}`))[1];
    return new Function('gameState', 'RULES', `return function(${signature}) {${body}}`)(gameState, RULES);
};
const equip = extract('equipItem', 'item, character, forceSlot = null');
const unequip = extract('unequipItem', 'item, character');

describe('specialist gear instance selection', () => {
    it('equips the selected enchanted variant and preserves the same-base ordinary item', () => {
        gameState.reset();
        const mundane = { id: 'longsword', name: 'Sword', type: 'weapon', instanceId: 'ordinary' };
        const enchanted = { ...mundane, name: 'Enchanted sword', instanceId: 'enchanted', bonus: 1 };
        const character = { inventory: [mundane, enchanted], equipment: {} };
        const ui = { isCharacterProficientWithWeapon: () => true, recalculateCombatStats: vi.fn(),
            renderInventory: vi.fn(), updateHUD: vi.fn(), renderCharacterSheet: vi.fn() };
        equip.call(ui, enchanted, character);
        expect(character.inventory).toEqual([mundane]);
        expect(character.equipment.mainHand).toBe(enchanted);
    });
    it('unequips the selected instance when both hands share a base ID', () => {
        gameState.reset();
        const first = { id: 'dagger', name: 'First', instanceId: 'first' };
        const second = { id: 'dagger', name: 'Second', instanceId: 'second' };
        const character = { inventory: [], equipment: { mainHand: first, offHand: second } };
        const ui = { recalculateCombatStats: vi.fn(), renderInventory: vi.fn(), updateHUD: vi.fn(), renderCharacterSheet: vi.fn() };
        unequip.call(ui, second, character);
        expect(character.equipment.mainHand).toBe(first);
        expect(character.equipment.offHand).toBeNull();
        expect(character.inventory).toEqual([second]);
    });
});
