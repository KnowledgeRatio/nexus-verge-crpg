/**
 * Tests for src/utils/practiceUtils.js
 * Level-keyed value resolution and buffed ability score helpers.
 */

import { describe, it, expect } from 'vitest';
import {
    resolveLevelKeyedValue
} from '../../src/utils/practiceUtils.js';

// ---------------------------------------------------------------------------
// resolveLevelKeyedValue
// ---------------------------------------------------------------------------
describe('resolveLevelKeyedValue', () => {
    it('returns value for the exact matching level', () => {
        expect(resolveLevelKeyedValue({ '1': 'a', '6': 'b' }, 1)).toBe('a');
    });

    it('returns value for highest threshold met', () => {
        expect(resolveLevelKeyedValue({ '1': 'a', '6': 'b' }, 7)).toBe('b');
    });

    it('returns intermediate tier value when level is between thresholds', () => {
        expect(resolveLevelKeyedValue({ '1': 'a', '6': 'b' }, 3)).toBe('a');
    });

    it('returns the higher-tier value exactly at threshold', () => {
        expect(resolveLevelKeyedValue({ '1': 'a', '6': 'b' }, 6)).toBe('b');
    });

    it('returns null when level is below all thresholds', () => {
        // Level 1 < first threshold of 2
        expect(resolveLevelKeyedValue({ '2': 1, '6': 2 }, 1)).toBeNull();
    });

    it('returns null for empty object', () => {
        expect(resolveLevelKeyedValue({}, 5)).toBeNull();
    });

    it('works with numeric values', () => {
        expect(resolveLevelKeyedValue({ '1': 10, '5': 20, '9': 30 }, 6)).toBe(20);
        expect(resolveLevelKeyedValue({ '1': 10, '5': 20, '9': 30 }, 9)).toBe(30);
    });

    it('works with object values', () => {
        const val = { mode: 'advanced' };
        const resolved = resolveLevelKeyedValue({ '5': val }, 5);
        expect(resolved).toBe(val);
    });

    it('handles a single-tier map', () => {
        expect(resolveLevelKeyedValue({ '3': 'unlocked' }, 3)).toBe('unlocked');
        expect(resolveLevelKeyedValue({ '3': 'unlocked' }, 2)).toBeNull();
    });
});
