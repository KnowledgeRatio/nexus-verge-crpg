/**
 * Tests for src/utils/rng.js
 * Seeded PRNG utilities — determinism, range checks, and collection helpers.
 */

import { describe, it, expect } from 'vitest';
import {
    mulberry32,
    hashString,
    generateSeedString,
    createSeededRNG,
    createRNG,
    seedToNumber,
    SeededRandom
} from '../../src/utils/rng.js';

// ---------------------------------------------------------------------------
// mulberry32
// ---------------------------------------------------------------------------
describe('mulberry32', () => {
    it('returns a function', () => {
        expect(typeof mulberry32(42)).toBe('function');
    });

    it('produces values in [0, 1)', () => {
        const rng = mulberry32(12345);
        for (let i = 0; i < 100; i++) {
            const v = rng();
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });

    it('same seed produces same sequence', () => {
        const rng1 = mulberry32(99999);
        const rng2 = mulberry32(99999);
        for (let i = 0; i < 20; i++) {
            expect(rng1()).toBe(rng2());
        }
    });

    it('different seeds produce different first values', () => {
        const v1 = mulberry32(1)();
        const v2 = mulberry32(2)();
        // Overwhelmingly likely to differ; if they happen to match, the hash collision
        // would be caught by the sequence test below
        expect(v1).not.toBe(v2);
    });
});

// ---------------------------------------------------------------------------
// hashString
// ---------------------------------------------------------------------------
describe('hashString', () => {
    it('same string returns same hash', () => {
        expect(hashString('hello')).toBe(hashString('hello'));
    });

    it('different strings return different hashes', () => {
        expect(hashString('hello')).not.toBe(hashString('world'));
    });

    it('returns a non-negative integer', () => {
        const h = hashString('nexus-verge');
        expect(Number.isInteger(h)).toBe(true);
        expect(h).toBeGreaterThanOrEqual(0);
    });

    it('empty string returns 0', () => {
        expect(hashString('')).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// generateSeedString
// ---------------------------------------------------------------------------
describe('generateSeedString', () => {
    it('matches WORD-NNNN-WORD pattern', () => {
        const pattern = /^[A-Z]+-\d{4}-[A-Z]+$/;
        for (let i = 0; i < 20; i++) {
            expect(generateSeedString()).toMatch(pattern);
        }
    });

    it('produces different seeds on successive calls (usually)', () => {
        const seeds = new Set();
        for (let i = 0; i < 10; i++) {
            seeds.add(generateSeedString());
        }
        // With 10 calls over 28*28*10000 = 7,840,000 combinations, collisions are extremely rare
        expect(seeds.size).toBeGreaterThan(1);
    });
});

// ---------------------------------------------------------------------------
// createSeededRNG
// ---------------------------------------------------------------------------
describe('createSeededRNG', () => {
    it('returns a function', () => {
        expect(typeof createSeededRNG('my-seed')).toBe('function');
    });

    it('same seed string produces same first value', () => {
        const rng1 = createSeededRNG('determinism-test');
        const rng2 = createSeededRNG('determinism-test');
        expect(rng1()).toBe(rng2());
    });

    it('produces values in [0, 1)', () => {
        const rng = createSeededRNG('range-test');
        for (let i = 0; i < 50; i++) {
            const v = rng();
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });
});

// ---------------------------------------------------------------------------
// createRNG
// ---------------------------------------------------------------------------
describe('createRNG', () => {
    it('works with a string seed', () => {
        const rng = createRNG('string-seed');
        expect(typeof rng).toBe('function');
        const v = rng();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
    });

    it('works with a numeric seed', () => {
        const rng = createRNG(42);
        expect(typeof rng).toBe('function');
        const v = rng();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
    });

    it('same string seed → same sequence as createSeededRNG', () => {
        const seed = 'same-string';
        const rng1 = createRNG(seed);
        const rng2 = createSeededRNG(seed);
        expect(rng1()).toBe(rng2());
    });

    it('same numeric seed → same sequence as mulberry32', () => {
        const seed = 77777;
        const rng1 = createRNG(seed);
        const rng2 = mulberry32(seed);
        expect(rng1()).toBe(rng2());
    });
});

// ---------------------------------------------------------------------------
// seedToNumber
// ---------------------------------------------------------------------------
describe('seedToNumber', () => {
    it('returns same value as hashString', () => {
        const str = 'NEXUS-1234-SHADOW';
        expect(seedToNumber(str)).toBe(hashString(str));
    });

    it('same string → same number every call', () => {
        expect(seedToNumber('foo')).toBe(seedToNumber('foo'));
    });

    it('returns a non-negative integer', () => {
        const n = seedToNumber('any-seed');
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(0);
    });
});

// ---------------------------------------------------------------------------
// SeededRandom
// ---------------------------------------------------------------------------
describe('SeededRandom', () => {
    // --- next() ---
    describe('next()', () => {
        it('returns values in [0, 1)', () => {
            const rng = new SeededRandom('test-next');
            for (let i = 0; i < 100; i++) {
                const v = rng.next();
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThan(1);
            }
        });
    });

    // --- nextInt() ---
    describe('nextInt()', () => {
        it('returns integers in [1, 6] inclusive', () => {
            const rng = new SeededRandom('test-int');
            for (let i = 0; i < 100; i++) {
                const v = rng.nextInt(1, 6);
                expect(Number.isInteger(v)).toBe(true);
                expect(v).toBeGreaterThanOrEqual(1);
                expect(v).toBeLessThanOrEqual(6);
            }
        });

        it('produces multiple distinct values over many calls', () => {
            const rng = new SeededRandom('test-int-variance');
            const values = new Set();
            for (let i = 0; i < 50; i++) {
                values.add(rng.nextInt(1, 6));
            }
            // Should get at least 2 different values in 50 rolls of a d6
            expect(values.size).toBeGreaterThan(1);
        });
    });

    // --- nextFloat() ---
    describe('nextFloat()', () => {
        it('returns values in [0, 1)', () => {
            const rng = new SeededRandom('test-float');
            for (let i = 0; i < 100; i++) {
                const v = rng.nextFloat(0, 1);
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThan(1);
            }
        });

        it('respects min/max bounds', () => {
            const rng = new SeededRandom('test-float-bounds');
            for (let i = 0; i < 50; i++) {
                const v = rng.nextFloat(5, 10);
                expect(v).toBeGreaterThanOrEqual(5);
                expect(v).toBeLessThan(10);
            }
        });
    });

    // --- nextBool() ---
    describe('nextBool()', () => {
        it('returns true or false', () => {
            const rng = new SeededRandom('test-bool');
            for (let i = 0; i < 20; i++) {
                const v = rng.nextBool();
                expect(typeof v).toBe('boolean');
            }
        });

        it('nextBool(1) always returns true', () => {
            const rng = new SeededRandom('test-bool-always-true');
            for (let i = 0; i < 20; i++) {
                expect(rng.nextBool(1)).toBe(true);
            }
        });

        it('nextBool(0) always returns false', () => {
            const rng = new SeededRandom('test-bool-always-false');
            for (let i = 0; i < 20; i++) {
                expect(rng.nextBool(0)).toBe(false);
            }
        });
    });

    // --- choice() ---
    describe('choice()', () => {
        it('returns null for empty array', () => {
            const rng = new SeededRandom('test-choice-empty');
            expect(rng.choice([])).toBeNull();
        });

        it('returns null for null input', () => {
            const rng = new SeededRandom('test-choice-null');
            expect(rng.choice(null)).toBeNull();
        });

        it('returns one of the elements in the array', () => {
            const rng = new SeededRandom('test-choice');
            const arr = ['a', 'b', 'c'];
            for (let i = 0; i < 30; i++) {
                const v = rng.choice(arr);
                expect(arr).toContain(v);
            }
        });

        it('returns the only element from a single-element array', () => {
            const rng = new SeededRandom('test-choice-single');
            expect(rng.choice(['only'])).toBe('only');
        });
    });

    // --- shuffle() ---
    describe('shuffle()', () => {
        it('returns a new array (not the original reference)', () => {
            const rng = new SeededRandom('test-shuffle-ref');
            const original = [1, 2, 3, 4, 5];
            const shuffled = rng.shuffle(original);
            expect(shuffled).not.toBe(original);
        });

        it('returned array has the same elements as the original', () => {
            const rng = new SeededRandom('test-shuffle-elements');
            const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const shuffled = rng.shuffle(original);
            expect(shuffled).toHaveLength(original.length);
            expect(shuffled.sort((a, b) => a - b)).toEqual([...original].sort((a, b) => a - b));
        });

        it('does not mutate the original array', () => {
            const rng = new SeededRandom('test-shuffle-mutation');
            const original = [1, 2, 3, 4, 5];
            const snapshot = [...original];
            rng.shuffle(original);
            expect(original).toEqual(snapshot);
        });

        it('produces a (usually) different order with a large array', () => {
            const rng = new SeededRandom('test-shuffle-order');
            const original = Array.from({ length: 20 }, (_, i) => i);
            const shuffled = rng.shuffle(original);
            // The probability of an identical order is 1/20! ≈ 4e-19
            expect(shuffled).not.toEqual(original);
        });
    });

    // --- sample() ---
    describe('sample()', () => {
        it('returns n unique elements', () => {
            const rng = new SeededRandom('test-sample');
            const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const sampled = rng.sample(arr, 3);
            expect(sampled).toHaveLength(3);
            // All returned elements exist in original
            sampled.forEach(v => expect(arr).toContain(v));
            // All returned elements are unique
            expect(new Set(sampled).size).toBe(3);
        });

        it('returns all elements when n >= array length', () => {
            const rng = new SeededRandom('test-sample-overflow');
            const arr = [1, 2, 3];
            const sampled = rng.sample(arr, arr.length + 10);
            expect(sampled).toHaveLength(arr.length);
        });
    });

    // --- Determinism ---
    describe('Determinism (most critical)', () => {
        it('same seed string → identical next() sequence', () => {
            const rng1 = new SeededRandom('determinism-key');
            const rng2 = new SeededRandom('determinism-key');
            for (let i = 0; i < 50; i++) {
                expect(rng1.next()).toBe(rng2.next());
            }
        });

        it('same seed → identical nextInt sequence', () => {
            const rng1 = new SeededRandom('det-int');
            const rng2 = new SeededRandom('det-int');
            for (let i = 0; i < 30; i++) {
                expect(rng1.nextInt(1, 100)).toBe(rng2.nextInt(1, 100));
            }
        });

        it('same seed → identical choice sequence', () => {
            const rng1 = new SeededRandom('det-choice');
            const rng2 = new SeededRandom('det-choice');
            const arr = ['alpha', 'beta', 'gamma', 'delta'];
            for (let i = 0; i < 20; i++) {
                expect(rng1.choice(arr)).toBe(rng2.choice(arr));
            }
        });

        it('same seed → identical shuffle output', () => {
            const arr = [1, 2, 3, 4, 5, 6, 7, 8];
            const rng1 = new SeededRandom('det-shuffle');
            const rng2 = new SeededRandom('det-shuffle');
            expect(rng1.shuffle(arr)).toEqual(rng2.shuffle(arr));
        });

        it('different seeds → different first next() values', () => {
            const rng1 = new SeededRandom('seed-A');
            const rng2 = new SeededRandom('seed-B');
            expect(rng1.next()).not.toBe(rng2.next());
        });
    });
});
