import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Character } from '../../src/systems/Character.js';
import { RULES } from '../../src/core/rulesEngine.js';

const originalSystem = RULES.attributes.system;

beforeEach(() => {
    RULES.attributes.system = 'NVSystem';
});

afterEach(() => {
    RULES.attributes.system = originalSystem;
});

function makeCharacter({ prowess = 15, intuition = 15, armor = null } = {}) {
    return new Character({
        name: 'AC Test Hero',
        level: 1,
        baseAbilities: {
            prowess,
            resilience: 15,
            intellect: 10,
            intuition,
            presence: 10,
            composure: 10
        },
        class: {
            id: 'dedication',
            hitDie: 10,
            savingThrowProficienciesNVSystem: ['resilience'],
            armorProficiencies: ['light', 'medium', 'heavy'],
            weaponProficiencies: [],
            toolProficiencies: [],
            features: {},
            spellcaster: false
        },
        species: {
            abilityScoreIncreaseNVSystem: {},
            traits: [],
            speed: 30,
            languages: [],
            skillProficiencies: []
        },
        background: { skillProficiencies: [], feature: null, startingGold: 0 },
        equipment: { mainHand: null, offHand: null, armor, helmet: null, artifact: null }
    });
}

describe('NVSystem weighted AC ownership', () => {
    it('uses floor((2 × Intuition raw modifier + Prowess raw modifier) / 3)', () => {
        const highProwess = makeCharacter({ prowess: 15, intuition: 8 });
        const balanced = makeCharacter({ prowess: 15, intuition: 15 });
        const highIntuition = makeCharacter({ prowess: 8, intuition: 19 });

        expect(highProwess.ac).toBe(10); // floor((2×-1 + 2.5) / 3) = 0
        expect(balanced.ac).toBe(12); // floor((2×2.5 + 2.5) / 3) = 2
        expect(highIntuition.ac).toBe(12); // floor((2×4.5 - 1) / 3) = 2
    });

    it('preserves light, medium, and heavy armour gates', () => {
        const light = makeCharacter({
            prowess: 15,
            intuition: 19,
            armor: { armorClass: 12, addEvasionModifier: true, maxEvasionBonus: null, armorType: 'light' }
        });
        const medium = makeCharacter({
            prowess: 15,
            intuition: 19,
            armor: { armorClass: 15, addEvasionModifier: true, maxEvasionBonus: 2, armorType: 'medium' }
        });
        const heavy = makeCharacter({
            prowess: 8,
            intuition: 20,
            armor: { armorClass: 18, addEvasionModifier: false, maxEvasionBonus: 0, armorType: 'heavy' }
        });

        expect(light.ac).toBe(15); // uncapped weighted modifier +3
        expect(medium.ac).toBe(17); // weighted modifier capped at +2
        expect(heavy.ac).toBe(18); // no attribute contribution
    });

    it('recalculates correctly when equipment changes', () => {
        const character = makeCharacter({ prowess: 15, intuition: 15 });
        expect(character.ac).toBe(12);

        character.equipment.armor = {
            armorClass: 15,
            addEvasionModifier: true,
            maxEvasionBonus: 2,
            armorType: 'medium'
        };
        expect(character.calculateAC()).toBe(17);

        character.equipment.armor = {
            armorClass: 18,
            addEvasionModifier: false,
            maxEvasionBonus: 0,
            armorType: 'heavy'
        };
        expect(character.calculateAC()).toBe(18);
    });

    it('survives save restoration and leaves initiative Intuition-only', () => {
        const original = makeCharacter({ prowess: 15, intuition: 13 });
        const restored = Character.fromJSON(original.toJSON());

        expect(restored.ac).toBe(original.ac);
        expect(restored.initiative).toBe(1);
    });
});
