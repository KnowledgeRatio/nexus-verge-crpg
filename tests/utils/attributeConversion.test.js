/**
 * Tests for src/utils/attributeConversion.js — the shared legacy->six-attribute
 * ability-score conversion function (docs/plans/2026-07-30-attribute-system-remap.md,
 * "Legacy split-attribute conversion"; Bug 2 fix, 2026-08-01). One shared implementation,
 * reused by both Character.js's calculateAbilities() (player) and EncounterBuilder.js's
 * createEnemyFromMonster() (monster) — these tests pin its behavior so neither caller can
 * drift from it, and cover the plain-object shape EncounterBuilder.js actually passes
 * (monster.abilities, not a Character instance).
 */

import { describe, it, expect } from 'vitest';
import { convertLegacyAbilitiesToSixAttribute } from '../../src/utils/attributeConversion.js';

describe('convertLegacyAbilitiesToSixAttribute', () => {
    it('converts all six legacy keys via the locked 1:1 bijection (str/con/int clean, dex/wis/cha reassigned)', () => {
        const result = convertLegacyAbilitiesToSixAttribute({
            str: 16, dex: 14, con: 12, int: 10, wis: 13, cha: 15
        });

        expect(result).toEqual({
            prowess: 16,   // str -> prowess
            insight: 14,   // dex -> insight (not prowess)
            vitality: 12,  // con -> vitality
            intellect: 10, // int -> intellect
            composure: 13, // wis -> composure (not insight)
            presence: 15   // cha -> presence (not composure)
        });
    });

    it('is a straight base-score copy, not an average — distinct from the wis+cha save-averaging shim', () => {
        // If this silently averaged like monsterAttributeConversion.js's save shim,
        // composure/presence would come out identical or blended; they must not.
        const result = convertLegacyAbilitiesToSixAttribute({ wis: 20, cha: 8 });
        expect(result.composure).toBe(20);
        expect(result.presence).toBe(8);
    });

    it('the resulting bijection has zero collisions — every new key traces to exactly one legacy source', () => {
        const result = convertLegacyAbilitiesToSixAttribute({
            str: 11, dex: 12, con: 13, int: 14, wis: 15, cha: 16
        });
        const newKeys = Object.keys(result).sort();
        expect(newKeys).toEqual(['composure', 'insight', 'intellect', 'presence', 'prowess', 'vitality']);
    });

    it('a monster-shaped partial legacy bag (missing some keys) only produces keys for scores actually present', () => {
        const result = convertLegacyAbilitiesToSixAttribute({ str: 18, con: 16 });
        expect(result).toEqual({ prowess: 18, vitality: 16 });
    });

    it('empty/missing legacy bag produces an empty object, not a throw', () => {
        expect(convertLegacyAbilitiesToSixAttribute()).toEqual({});
        expect(convertLegacyAbilitiesToSixAttribute({})).toEqual({});
    });
});
