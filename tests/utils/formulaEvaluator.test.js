/**
 * Tests for src/utils/formulaEvaluator.js
 * D&D formula evaluation — token parsing, context variable resolution, dice ranges.
 */

import { describe, it, expect } from 'vitest';
import {
    evaluateFormula,
    buildFormulaContext
} from '../../src/utils/formulaEvaluator.js';

// ---------------------------------------------------------------------------
// evaluateFormula
// ---------------------------------------------------------------------------
describe('evaluateFormula', () => {
    const ctx = { level: 3, str: 2, dex: 1, con: 0, int: -1, wis: 1, cha: 0, proficiency: 2 };

    it('number input returns {total: number, breakdown: string}', () => {
        const result = evaluateFormula(5, ctx);
        expect(result.total).toBe(5);
        expect(result.breakdown).toBe('5');
    });

    it('plain number string "5" returns total 5', () => {
        const result = evaluateFormula('5', ctx);
        expect(result.total).toBe(5);
    });

    it('plain number string "0" returns total 0', () => {
        const result = evaluateFormula('0', ctx);
        expect(result.total).toBe(0);
    });

    it('"1d6" returns total in [1, 6]', () => {
        for (let i = 0; i < 50; i++) {
            const result = evaluateFormula('1d6', ctx);
            expect(result.total).toBeGreaterThanOrEqual(1);
            expect(result.total).toBeLessThanOrEqual(6);
        }
    });

    it('"1d8" returns total in [1, 8]', () => {
        for (let i = 0; i < 50; i++) {
            const result = evaluateFormula('1d8', ctx);
            expect(result.total).toBeGreaterThanOrEqual(1);
            expect(result.total).toBeLessThanOrEqual(8);
        }
    });

    it('"level" resolves from context (level=3) → total 3', () => {
        const result = evaluateFormula('level', ctx);
        expect(result.total).toBe(3);
    });

    it('"proficiency" resolves from context (proficiency=2) → total 2', () => {
        const result = evaluateFormula('proficiency', ctx);
        expect(result.total).toBe(2);
    });

    it('"str" resolves from context (str=2) → total 2', () => {
        const result = evaluateFormula('str', ctx);
        expect(result.total).toBe(2);
    });

    it('"dex" resolves from context (dex=1) → total 1', () => {
        const result = evaluateFormula('dex', ctx);
        expect(result.total).toBe(1);
    });

    it('"int" resolves negative ability mod (int=-1) → total -1', () => {
        const result = evaluateFormula('int', ctx);
        expect(result.total).toBe(-1);
    });

    it('"1d6 + level + str" with level=3, str=2 → total in [6, 11]', () => {
        for (let i = 0; i < 50; i++) {
            const result = evaluateFormula('1d6 + level + str', ctx);
            // 1d6 [1-6] + 3 + 2 = [6, 11]
            expect(result.total).toBeGreaterThanOrEqual(6);
            expect(result.total).toBeLessThanOrEqual(11);
        }
    });

    it('"2 + 3" returns total 5', () => {
        const result = evaluateFormula('2 + 3', ctx);
        expect(result.total).toBe(5);
    });

    it('"level + proficiency" adds both context values', () => {
        const result = evaluateFormula('level + proficiency', ctx);
        expect(result.total).toBe(ctx.level + ctx.proficiency);
    });

    it('"str + dex" adds two ability mods', () => {
        const result = evaluateFormula('str + dex', ctx);
        expect(result.total).toBe(ctx.str + ctx.dex);
    });

    it('null formula returns {total: 0, breakdown: "0"}', () => {
        const result = evaluateFormula(null, ctx);
        expect(result.total).toBe(0);
        expect(result.breakdown).toBe('0');
    });

    it('undefined formula returns {total: 0, breakdown: "0"}', () => {
        const result = evaluateFormula(undefined, ctx);
        expect(result.total).toBe(0);
        expect(result.breakdown).toBe('0');
    });

    it('object formula returns {total: 0, breakdown: "0"}', () => {
        const result = evaluateFormula({}, ctx);
        expect(result.total).toBe(0);
        expect(result.breakdown).toBe('0');
    });

    it('breakdown string is non-empty for valid formula', () => {
        const result = evaluateFormula('level', ctx);
        expect(result.breakdown.length).toBeGreaterThan(0);
    });

    it('returns total as a number (not string)', () => {
        const result = evaluateFormula('5', ctx);
        expect(typeof result.total).toBe('number');
    });
});

// ---------------------------------------------------------------------------
// buildFormulaContext
// ---------------------------------------------------------------------------
describe('buildFormulaContext', () => {
    it('extracts level from character', () => {
        const char = { level: 7, abilityModifiers: {}, proficiencyBonus: 3 };
        const ctx = buildFormulaContext(char);
        expect(ctx.level).toBe(7);
    });

    it('extracts all six ability modifiers', () => {
        const char = {
            level: 5,
            abilityModifiers: { str: 3, dex: 2, con: 1, int: 0, wis: -1, cha: 2 },
            proficiencyBonus: 3
        };
        const ctx = buildFormulaContext(char);
        expect(ctx.str).toBe(3);
        expect(ctx.dex).toBe(2);
        expect(ctx.con).toBe(1);
        expect(ctx.int).toBe(0);
        expect(ctx.wis).toBe(-1);
        expect(ctx.cha).toBe(2);
    });

    it('extracts proficiencyBonus', () => {
        const char = { level: 1, abilityModifiers: {}, proficiencyBonus: 2 };
        const ctx = buildFormulaContext(char);
        expect(ctx.proficiency).toBe(2);
    });

    it('defaults level to 1 when missing', () => {
        const ctx = buildFormulaContext({});
        expect(ctx.level).toBe(1);
    });

    it('defaults proficiency to 2 when missing', () => {
        const ctx = buildFormulaContext({});
        expect(ctx.proficiency).toBe(2);
    });

    it('defaults all ability mods to 0 when abilityModifiers is missing', () => {
        const ctx = buildFormulaContext({ level: 1 });
        expect(ctx.str).toBe(0);
        expect(ctx.dex).toBe(0);
        expect(ctx.con).toBe(0);
        expect(ctx.int).toBe(0);
        expect(ctx.wis).toBe(0);
        expect(ctx.cha).toBe(0);
    });

    it('defaults missing individual mods to 0', () => {
        const char = { level: 3, abilityModifiers: { str: 4 }, proficiencyBonus: 2 };
        const ctx = buildFormulaContext(char);
        expect(ctx.dex).toBe(0);
        expect(ctx.wis).toBe(0);
    });

    it('returned context works correctly with evaluateFormula', () => {
        const char = {
            level: 3,
            abilityModifiers: { str: 2, dex: 1, con: 0, int: -1, wis: 1, cha: 0 },
            proficiencyBonus: 2
        };
        const ctx = buildFormulaContext(char);
        const result = evaluateFormula('level + str + proficiency', ctx);
        // 3 + 2 + 2 = 7
        expect(result.total).toBe(7);
    });
});
