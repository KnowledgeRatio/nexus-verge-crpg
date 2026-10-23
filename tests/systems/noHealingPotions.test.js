import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import Character from '../../src/systems/Character.js';
import { gameState } from '../../src/core/GameState.js';

const dataDirectory = new URL('../../data/', import.meta.url);
const retiredPotion = /potion(?:of|[-_ ]of[-_ ]|[-_ ])?(?:greater|superior|supreme)?[-_ ]?healing/i;

describe('healing potion removal', () => {
    it('has no healing-potion definitions or references in loaded game data', () => {
        const inspect = (value, location) => {
            if (typeof value === 'string') {
                expect(value, location).not.toMatch(retiredPotion);
                expect(value, location).not.toMatch(/healing potions?/i);
            } else if (value && typeof value === 'object') {
                for (const [key, entry] of Object.entries(value)) {
                    inspect(entry, `${location}.${key}`);
                }
            }
        };
        for (const file of readdirSync(dataDirectory).filter(name => name.endsWith('.json'))) {
            inspect(JSON.parse(readFileSync(new URL(file, dataDirectory), 'utf8')), file);
        }
    });

    it('keeps trap reward tables usable after removing potion entries', () => {
        const loot = JSON.parse(readFileSync(new URL('lootTables.json', dataDirectory), 'utf8'));
        const tables = loot.skillChallengeLootTables;
        for (const name of ['trapDisarm_common', 'trapDisarm_uncommon']) {
            expect(tables[name].length).toBeGreaterThan(0);
            expect(tables[name].every(entry => entry.weight > 0)).toBe(true);
        }
    });

    it('does not heal through a legacy saved consumable effect', () => {
        const character = { currentHP: 1, maxHP: 20 };
        expect(Character.prototype.applyItemEffect.call(character, { healing: '2d4+2' })).toEqual({});
        expect(character.currentHP).toBe(1);
    });

    it('does not heal or consume a legacy potion through the inventory UI', () => {
        const source = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
        const body = source.match(/ {4}useItem\(item, character\) \{([\s\S]*?)\n {4}\}/)[1];
        const useItem = new Function('gameState', `return function(item, character) {${body}}`)(gameState);
        const potion = { id: 'potion-healing', name: 'Old potion', type: 'consumable', effect: { healing: '2d4+2' } };
        const character = { currentHP: 1, maxHP: 20, inventory: [potion] };
        const ui = { renderInventory: vi.fn(), updateHUD: vi.fn() };
        gameState.reset();
        useItem.call(ui, potion, character);
        expect(character.currentHP).toBe(1);
        expect(character.inventory).toEqual([potion]);
        expect(ui.updateHUD).not.toHaveBeenCalled();
        gameState.reset();
    });
});
