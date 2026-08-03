/**
 * Tests for src/utils/monsterAttributeConversion.js — the shared wis+cha Composure-save
 * averaging function (docs/plans/2026-07-30-attribute-system-remap.md, decision #2 and
 * M1 step 6, task 4). "Shim landmine" note in the plan: this must be the ONE
 * implementation of the averaging math, reused by both the live monster-loader shim
 * (EncounterBuilder.js) and the future data-agent batch-convert script — these tests pin
 * its behavior so neither caller can drift from it.
 */

import { describe, it, expect } from 'vitest';
import { averageComposureSaveBonus, convertMonsterSavingThrows } from '../../src/utils/monsterAttributeConversion.js';

describe('averageComposureSaveBonus', () => {
    it('averages when both wis and cha are present (decision #2: average, not keep-higher)', () => {
        // youngGreenDragon-shaped example: wis 4, cha 5
        expect(averageComposureSaveBonus(4, 5)).toBe(4.5);
    });

    it('returns the wis value unchanged when cha is absent (the real zombie/mage case)', () => {
        expect(averageComposureSaveBonus(0, undefined)).toBe(0);
        expect(averageComposureSaveBonus(4, undefined)).toBe(4);
    });

    it('returns the cha value unchanged when wis is absent', () => {
        expect(averageComposureSaveBonus(undefined, 5)).toBe(5);
    });

    it('returns undefined when neither is present', () => {
        expect(averageComposureSaveBonus(undefined, undefined)).toBeUndefined();
    });

    it('does not keep-higher — confirms the rejected alternative would give a different answer', () => {
        const result = averageComposureSaveBonus(1, 9);
        expect(result).toBe(5);
        expect(result).not.toBe(Math.max(1, 9));
    });
});

describe('convertMonsterSavingThrows', () => {
    it('maps con->vitality and dex->insight as clean 1:1 renames', () => {
        const result = convertMonsterSavingThrows({ con: 6, dex: 4 });
        expect(result.vitality).toBe(6);
        expect(result.insight).toBe(4);
    });

    it('averages wis+cha into composure when both present (dragon-shaped block)', () => {
        const result = convertMonsterSavingThrows({ dex: 4, con: 6, wis: 4, cha: 5 });
        expect(result.composure).toBe(4.5);
    });

    it('zombie-shaped block: wis only -> composure carries the single value, no other keys present', () => {
        const result = convertMonsterSavingThrows({ wis: 0 });
        expect(result).toEqual({ composure: 0 });
    });

    it('mage-shaped block: int+wis, no cha -> int is retired (dropped), wis carries through to composure', () => {
        const result = convertMonsterSavingThrows({ int: 6, wis: 4 });
        expect(result).toEqual({ composure: 4 });
    });

    it('str is retired entirely — never appears in the output even if present on input', () => {
        const result = convertMonsterSavingThrows({ str: 8, con: 6 });
        expect(result).toEqual({ vitality: 6 });
        expect(result.prowess).toBeUndefined();
    });

    it('empty/missing savingThrows produces an empty object, not a throw', () => {
        expect(convertMonsterSavingThrows()).toEqual({});
        expect(convertMonsterSavingThrows({})).toEqual({});
    });
});
