/**
 * Regression test: toJSON() must serialize selectedAbilities/selectedTraits.
 * Both were silently dropped on save/load (fixed 2026-08-05) — anything granted through
 * those arrays (e.g. Steady Nerve, Vanguard, Grace Under Pressure) reset to [] on load.
 */

import { describe, it, expect } from 'vitest';
import { Character } from '../../src/systems/Character.js';

function makeCharacter(overrides = {}) {
    const base = {
        name: 'Test Hero',
        level: 1,
        baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        class: {
            id: 'testClass',
            hitDie: 8,
            savingThrowProficiencies: ['str', 'con'],
            armorProficiencies: [],
            weaponProficiencies: [],
            toolProficiencies: [],
            features: {},
            spellcaster: false
        },
        species: { abilityScoreIncrease: {}, traits: [], speed: 30, languages: [], skillProficiencies: [] },
        background: { skillProficiencies: [], feature: null, startingGold: 100 }
    };
    return new Character({ ...base, ...overrides });
}

describe('Character.toJSON — selectedAbilities/selectedTraits round-trip', () => {
    it('survives a toJSON -> new Character round-trip', () => {
        const original = makeCharacter({
            selectedAbilities: ['steadyNerve'],
            selectedTraits: ['vanguard', 'grace_under_pressure']
        });

        const restored = new Character(original.toJSON());

        expect(restored.selectedAbilities).toEqual(['steadyNerve']);
        expect(restored.selectedTraits).toEqual(['vanguard', 'grace_under_pressure']);
    });

    it('round-trips equipmentModCharges and bankedForagingRolls', () => {
        const original = makeCharacter({
            equipmentModCharges: { deflecting: 1 },
            bankedForagingRolls: 2
        });

        const restored = new Character(original.toJSON());

        expect(restored.equipmentModCharges).toEqual({ deflecting: 1 });
        expect(restored.bankedForagingRolls).toBe(2);
    });

    it('defaults equipmentModCharges to {} and bankedForagingRolls to 0 when absent', () => {
        const character = makeCharacter();
        expect(character.equipmentModCharges).toEqual({});
        expect(character.bankedForagingRolls).toBe(0);
    });
});
