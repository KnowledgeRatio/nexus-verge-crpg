/**
 * Characterization tests for src/systems/Character.js — LEGACY (str/dex/con/int/wis/cha)
 * behavior, captured before the attribute-system remap (docs/plans/2026-07-30-attribute-
 * system-remap.md). These lock in current AC calculation, initiative, and saving-throw
 * behavior so M1 refactors can be verified against a known-good baseline.
 *
 * Covers: ability modifiers, calculateAC() (unarmored / armored / dex-capped / shield /
 * fighting style), initiative, initializeSavingThrows() (proficient vs non-proficient).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Character } from '../../src/systems/Character.js';
import { getAbilityModifier } from '../../src/utils/dice.js';
import { RULES } from '../../src/core/rulesEngine.js';
import { getAttributeModifierFor, getBlendedAttributeModifier } from '../../src/utils/attributeResolver.js';

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

// ---------------------------------------------------------------------------
// Ability modifiers
// ---------------------------------------------------------------------------
describe('Character ability modifiers', () => {
    it('every ability score floors to its D&D 5e modifier via getAbilityModifier', () => {
        const character = makeCharacter({
            baseAbilities: { str: 8, dex: 11, con: 15, int: 18, wis: 20, cha: 1 }
        });

        for (const ability of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
            expect(character.abilityModifiers[ability]).toBe(getAbilityModifier(character.abilities[ability]));
        }
    });

    it('species abilityScoreIncrease is applied before modifiers are calculated', () => {
        const character = makeCharacter({
            baseAbilities: { str: 14, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            species: { abilityScoreIncrease: { str: 2 }, traits: [], speed: 30, languages: [], skillProficiencies: [] }
        });

        expect(character.abilities.str).toBe(16);
        expect(character.abilityModifiers.str).toBe(3);
    });

    it('final ability scores are capped at 20', () => {
        const character = makeCharacter({
            baseAbilities: { str: 20, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            species: { abilityScoreIncrease: { str: 4 }, traits: [], speed: 30, languages: [], skillProficiencies: [] }
        });

        expect(character.abilities.str).toBe(20);
        expect(character.abilityModifiers.str).toBe(5);
    });
});

// ---------------------------------------------------------------------------
// calculateAC
// ---------------------------------------------------------------------------
describe('Character.calculateAC', () => {
    it('unarmored: 10 + DEX modifier', () => {
        const character = makeCharacter({ baseAbilities: { str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 10 } });
        expect(character.ac).toBe(10 + 3);
    });

    it('light armor with unlimited DEX bonus adds full DEX modifier', () => {
        const character = makeCharacter({
            baseAbilities: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 },
            equipment: {
                mainHand: null,
                offHand: null,
                armor: { armorClass: 11, addDexModifier: true, maxDexBonus: null, armorType: 'light' },
                helmet: null,
                artifact: null
            }
        });
        expect(character.ac).toBe(11 + 4);
    });

    it('medium armor caps the DEX bonus at maxDexBonus', () => {
        const character = makeCharacter({
            baseAbilities: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 }, // dex mod +4
            equipment: {
                mainHand: null,
                offHand: null,
                armor: { armorClass: 14, addDexModifier: true, maxDexBonus: 2, armorType: 'medium' },
                helmet: null,
                artifact: null
            }
        });
        expect(character.ac).toBe(14 + 2); // capped, not +4
    });

    it('heavy armor ignores DEX entirely', () => {
        const character = makeCharacter({
            baseAbilities: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 },
            equipment: {
                mainHand: null,
                offHand: null,
                armor: { armorClass: 18, addDexModifier: false, maxDexBonus: 0, armorType: 'heavy' },
                helmet: null,
                artifact: null
            }
        });
        expect(character.ac).toBe(18);
    });

    it('shield in offHand adds its armorClassBonus', () => {
        const character = makeCharacter({
            baseAbilities: { str: 10, dex: 12, con: 10, int: 10, wis: 10, cha: 10 }, // dex mod +1
            equipment: {
                mainHand: null,
                offHand: { type: 'shield', armorClassBonus: 2 },
                armor: null,
                helmet: null,
                artifact: null
            }
        });
        expect(character.ac).toBe(10 + 1 + 2);
    });

    it('defense fighting style adds +1 AC only while wearing armor', () => {
        const armored = makeCharacter({
            baseAbilities: { str: 10, dex: 12, con: 10, int: 10, wis: 10, cha: 10 },
            fightingStyle: 'defense',
            equipment: {
                mainHand: null,
                offHand: null,
                armor: { armorClass: 12, addDexModifier: true, maxDexBonus: null, armorType: 'light' },
                helmet: null,
                artifact: null
            }
        });
        expect(armored.ac).toBe(12 + 1 + 1); // armor + dex + defense bonus

        const unarmored = makeCharacter({
            baseAbilities: { str: 10, dex: 12, con: 10, int: 10, wis: 10, cha: 10 },
            fightingStyle: 'defense'
        });
        expect(unarmored.ac).toBe(10 + 1); // no armor -> defense style gives nothing
    });

    it('handles a null equipment.armor slot without throwing', () => {
        const character = makeCharacter({
            equipment: { mainHand: null, offHand: null, armor: null, helmet: null, artifact: null }
        });
        expect(character.ac).toBe(10 + character.abilityModifiers.dex);
    });
});

// ---------------------------------------------------------------------------
// Initiative
// ---------------------------------------------------------------------------
describe('Character initiative', () => {
    it('equals the DEX modifier', () => {
        const character = makeCharacter({ baseAbilities: { str: 10, dex: 17, con: 10, int: 10, wis: 10, cha: 10 } });
        expect(character.initiative).toBe(character.abilityModifiers.dex);
        expect(character.initiative).toBe(3);
    });

    it('is negative for a low DEX score', () => {
        const character = makeCharacter({ baseAbilities: { str: 10, dex: 6, con: 10, int: 10, wis: 10, cha: 10 } });
        expect(character.initiative).toBe(-2);
    });
});

// ---------------------------------------------------------------------------
// initializeSavingThrows
// ---------------------------------------------------------------------------
describe('Character.initializeSavingThrows', () => {
    it('proficient saves include the proficiency bonus', () => {
        const character = makeCharacter({
            level: 5, // proficiency bonus +3
            baseAbilities: { str: 16, dex: 10, con: 14, int: 10, wis: 10, cha: 10 }
        });

        expect(character.proficiencyBonus).toBe(3);
        expect(character.savingThrows.str.proficient).toBe(true);
        expect(character.savingThrows.str.bonus).toBe(character.abilityModifiers.str + 3);
        expect(character.savingThrows.con.proficient).toBe(true);
        expect(character.savingThrows.con.bonus).toBe(character.abilityModifiers.con + 3);
    });

    it('non-proficient saves are just the raw ability modifier', () => {
        const character = makeCharacter({
            level: 5,
            baseAbilities: { str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 10 }
        });

        expect(character.savingThrows.dex.proficient).toBe(false);
        expect(character.savingThrows.dex.bonus).toBe(character.abilityModifiers.dex);
    });

    it('produces all six legacy ability saves', () => {
        const character = makeCharacter();
        expect(Object.keys(character.savingThrows).sort()).toEqual(['cha', 'con', 'dex', 'int', 'str', 'wis']);
    });
});

// ---------------------------------------------------------------------------
// 'NVSystem' mode — Bug 2 regression (docs/plans/2026-07-30-attribute-system-remap.md,
// M1.5 flip-readiness bugfix, 2026-08-01). Deliberately builds the character through a real
// `new Character(...)` construction path (not a hand-built fixture with pre-populated
// new-attribute keys, the way tests/utils/attributeResolver.test.js and
// tests/systems/effectDispatcher.sixAttribute.test.js do) — that's the specific gap that let
// Bug 2 (no code path populates six-attribute-keyed character.abilities) ship undetected:
// every existing NVSystem-mode test up to this point used fixtures that already had
// .prowess/.vitality/etc. present, so the resolver's redirect-vs-populate distinction was
// never actually exercised end-to-end through real Character construction.
// ---------------------------------------------------------------------------
describe('Character abilities — NVSystem mode (Bug 2 regression)', () => {
    const originalSystem = RULES.attributes.system;

    beforeEach(() => {
        RULES.attributes.system = 'NVSystem';
    });

    afterEach(() => {
        RULES.attributes.system = originalSystem;
    });

    it('calculateAbilities() populates six-attribute keys (prowess/vitality/etc.) via the legacy->new bijection, not just legacy keys', () => {
        const character = makeCharacter({
            level: 5,
            baseAbilities: { str: 16, dex: 14, con: 12, int: 10, wis: 13, cha: 15 }
        });

        expect(character.abilities.prowess).toBe(16);   // str -> prowess
        expect(character.abilities.insight).toBe(14);    // dex -> insight
        expect(character.abilities.vitality).toBe(12);   // con -> vitality
        expect(character.abilities.intellect).toBe(10);  // int -> intellect
        expect(character.abilities.composure).toBe(13);  // wis -> composure
        expect(character.abilities.presence).toBe(15);   // cha -> presence
    });

    it('calculateAbilityModifiers() (generic, not hardcoded to 6 legacy keys) produces a modifier for every populated attribute, legacy AND new', () => {
        const character = makeCharacter({
            level: 5,
            baseAbilities: { str: 16, dex: 14, con: 12, int: 10, wis: 13, cha: 15 }
        });

        // Legacy keys still resolve (unaffected by the generic rewrite).
        expect(character.abilityModifiers.str).toBe(3);
        expect(character.abilityModifiers.wis).toBe(1);

        // New-key modifiers — the actual gap: SkillChallengeManager.getSkillModifier()
        // (NVSystem mode) reads character.abilityModifiers[newKey] directly, e.g.
        // .composure/.insight. A hardcoded-to-6-legacy-keys calculateAbilityModifiers()
        // never produces these, silently degrading every such lookup to 0.
        expect(character.abilityModifiers.prowess).toBe(3);   // str -> prowess
        expect(character.abilityModifiers.insight).toBe(2);   // dex 14 -> insight
        expect(character.abilityModifiers.vitality).toBe(1);  // con 12 -> vitality
        expect(character.abilityModifiers.intellect).toBe(0); // int 10 -> intellect
        expect(character.abilityModifiers.composure).toBe(1); // wis 13 -> composure
        expect(character.abilityModifiers.presence).toBe(2);  // cha 15 -> presence
    });

    it('a real Character resolves a real non-zero single-attribute modifier through the resolver, not the silent-0 bug', () => {
        const character = makeCharacter({
            level: 5,
            baseAbilities: { str: 16, dex: 14, con: 12, int: 10, wis: 13, cha: 15 }
        });

        // str 16 -> prowess mod +3. Before the fix this silently returned 0 for every
        // character regardless of real scores, since character.abilities.prowess never existed.
        expect(getAttributeModifierFor(character, 'meleeAttack')).toBe(3);
    });

    it('a real Character resolves a real non-zero blended modifier through the resolver, not the silent-0 bug', () => {
        const character = makeCharacter({
            level: 5,
            baseAbilities: { str: 16, dex: 14, con: 12, int: 10, wis: 13, cha: 15 }
        });

        // flee = floor((prowess(str 16 -> +3) + insight(dex 14 -> +2)) / 2) = floor(5/2) = 2
        expect(getBlendedAttributeModifier(character, 'flee')).toBe(2);
    });

    it('initializeSavingThrows() produces real non-zero bonuses for a real Character, not silent 0s', () => {
        const character = makeCharacter({
            level: 5, // proficiency bonus +3
            baseAbilities: { str: 16, dex: 14, con: 12, int: 10, wis: 13, cha: 15 }
        });

        // str proficient: prowess mod +3 (str 16) + prof 3 = 6
        expect(character.savingThrows.str.proficient).toBe(true);
        expect(character.savingThrows.str.bonus).toBe(6);
        // con proficient: vitality mod +1 (con 12) + prof 3 = 4
        expect(character.savingThrows.con.proficient).toBe(true);
        expect(character.savingThrows.con.bonus).toBe(4);
        // wis non-proficient: composure mod +1 (wis 13), no prof bonus
        expect(character.savingThrows.wis.proficient).toBe(false);
        expect(character.savingThrows.wis.bonus).toBe(1);
    });

    // Perception is the discriminating skill: legacy `ability` is "wis", but decision #1 maps
    // it to "insight" for NVSystem mode — and insight's legacy conversion source is DEX,
    // not WIS (see SkillChallengeManager.sixAttribute.test.js for the same discriminating
    // case). A character with divergent WIS/DEX scores proves updateSkillBonuses() actually
    // switched attribute source, rather than silently reading the legacy `wis` key in both modes.
    it('updateSkillBonuses() reads the Insight (DEX-derived) modifier for Perception, not WIS', () => {
        const character = makeCharacter({
            level: 5, // proficiency bonus +3
            baseAbilities: { str: 10, dex: 18, con: 10, int: 10, wis: 8, cha: 10 },
            skillChoices: ['perception']
        });

        expect(character.abilities.insight).toBe(18); // dex -> insight bijection
        // dex 18 -> insight mod +4, proficient -> +3 prof = 7
        expect(character.skills.perception.bonus).toBe(7);
        expect(character.skills.perception.bonus).not.toBe(character.abilityModifiers.wis + character.proficiencyBonus);
    });

    it('updateSkillBonuses() still reads Prowess (STR-derived) for Athletics — unsplit skill, same numeric answer as legacy', () => {
        const character = makeCharacter({
            level: 5,
            baseAbilities: { str: 16, dex: 18, con: 10, int: 10, wis: 8, cha: 10 },
            skillChoices: ['athletics']
        });

        // str 16 -> prowess mod +3, proficient -> +3 prof = 6
        expect(character.skills.athletics.bonus).toBe(6);
    });
});
