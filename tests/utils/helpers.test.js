/**
 * Tests for src/utils/helpers.js
 * General-purpose utilities — UUID, nested property access, math helpers,
 * string formatters, array utilities, EventEmitter.
 */

import { describe, it, expect } from 'vitest';
import {
    generateUUID,
    getNestedProperty,
    setNestedProperty,
    deepClone,
    clamp,
    lerp,
    manhattanDistance,
    euclideanDistance,
    formatModifier,
    capitalize,
    camelToTitle,
    groupBy,
    sortBy,
    formatDuration,
    pointInRect,
    EventEmitter,
    randomChoice,
    shuffle
} from '../../src/utils/helpers.js';

// ---------------------------------------------------------------------------
// generateUUID
// ---------------------------------------------------------------------------
describe('generateUUID', () => {
    it('matches UUID v4 pattern', () => {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        for (let i = 0; i < 20; i++) {
            expect(generateUUID()).toMatch(uuidPattern);
        }
    });

    it('generates unique values', () => {
        const ids = new Set(Array.from({ length: 50 }, () => generateUUID()));
        expect(ids.size).toBe(50);
    });
});

// ---------------------------------------------------------------------------
// getNestedProperty
// ---------------------------------------------------------------------------
describe('getNestedProperty', () => {
    it('returns deeply nested value via dot notation', () => {
        const obj = { a: { b: { c: 42 } } };
        expect(getNestedProperty(obj, 'a.b.c')).toBe(42);
    });

    it('returns undefined for missing path', () => {
        const obj = { a: { b: 1 } };
        expect(getNestedProperty(obj, 'a.x.y')).toBeUndefined();
    });

    it('handles null gracefully — returns undefined', () => {
        expect(getNestedProperty(null, 'a.b')).toBeUndefined();
    });

    it('returns top-level value for single key', () => {
        const obj = { foo: 'bar' };
        expect(getNestedProperty(obj, 'foo')).toBe('bar');
    });
});

// ---------------------------------------------------------------------------
// setNestedProperty
// ---------------------------------------------------------------------------
describe('setNestedProperty', () => {
    it('sets a deeply nested value', () => {
        const obj = { a: { b: {} } };
        setNestedProperty(obj, 'a.b.c', 99);
        expect(obj.a.b.c).toBe(99);
    });

    it('creates intermediate objects when missing', () => {
        const obj = {};
        setNestedProperty(obj, 'x.y.z', 'hello');
        expect(obj.x.y.z).toBe('hello');
    });

    it('does nothing on null target', () => {
        // Should not throw
        expect(() => setNestedProperty(null, 'a.b', 1)).not.toThrow();
    });

    it('overwrites an existing value', () => {
        const obj = { a: { b: 10 } };
        setNestedProperty(obj, 'a.b', 20);
        expect(obj.a.b).toBe(20);
    });
});

// ---------------------------------------------------------------------------
// deepClone
// ---------------------------------------------------------------------------
describe('deepClone', () => {
    it('returns a new object — not the same reference', () => {
        const obj = { a: 1 };
        const clone = deepClone(obj);
        expect(clone).not.toBe(obj);
    });

    it('nested objects are cloned — not shared references', () => {
        const obj = { a: { b: 42 } };
        const clone = deepClone(obj);
        clone.a.b = 99;
        expect(obj.a.b).toBe(42);
    });

    it('arrays inside objects are cloned', () => {
        const obj = { arr: [1, 2, 3] };
        const clone = deepClone(obj);
        clone.arr.push(4);
        expect(obj.arr).toHaveLength(3);
    });

    it('preserves all values', () => {
        const obj = { x: 1, y: 'two', z: true };
        expect(deepClone(obj)).toEqual(obj);
    });
});

// ---------------------------------------------------------------------------
// clamp
// ---------------------------------------------------------------------------
describe('clamp', () => {
    it('returns value when within range', () => {
        expect(clamp(5, 0, 10)).toBe(5);
    });

    it('clamps to min when below range', () => {
        expect(clamp(-1, 0, 10)).toBe(0);
    });

    it('clamps to max when above range', () => {
        expect(clamp(15, 0, 10)).toBe(10);
    });

    it('returns min when value equals min', () => {
        expect(clamp(0, 0, 10)).toBe(0);
    });

    it('returns max when value equals max', () => {
        expect(clamp(10, 0, 10)).toBe(10);
    });
});

// ---------------------------------------------------------------------------
// lerp
// ---------------------------------------------------------------------------
describe('lerp', () => {
    it('lerp(0, 10, 0.5) → 5', () => {
        expect(lerp(0, 10, 0.5)).toBe(5);
    });

    it('lerp(0, 10, 0) → 0', () => {
        expect(lerp(0, 10, 0)).toBe(0);
    });

    it('lerp(0, 10, 1) → 10', () => {
        expect(lerp(0, 10, 1)).toBe(10);
    });

    it('lerp(2, 8, 0.25) → 3.5', () => {
        expect(lerp(2, 8, 0.25)).toBe(3.5);
    });
});

// ---------------------------------------------------------------------------
// manhattanDistance
// ---------------------------------------------------------------------------
describe('manhattanDistance', () => {
    it('(0,0) to (3,4) → 7', () => {
        expect(manhattanDistance(0, 0, 3, 4)).toBe(7);
    });

    it('same point → 0', () => {
        expect(manhattanDistance(5, 5, 5, 5)).toBe(0);
    });

    it('handles negative coordinates', () => {
        expect(manhattanDistance(-1, -1, 1, 1)).toBe(4);
    });
});

// ---------------------------------------------------------------------------
// euclideanDistance
// ---------------------------------------------------------------------------
describe('euclideanDistance', () => {
    it('(0,0) to (3,4) → 5', () => {
        expect(euclideanDistance(0, 0, 3, 4)).toBe(5);
    });

    it('same point → 0', () => {
        expect(euclideanDistance(2, 3, 2, 3)).toBe(0);
    });

    it('(0,0) to (1,1) → sqrt(2)', () => {
        expect(euclideanDistance(0, 0, 1, 1)).toBeCloseTo(Math.SQRT2, 10);
    });
});

// ---------------------------------------------------------------------------
// formatModifier
// ---------------------------------------------------------------------------
describe('formatModifier', () => {
    it('+3 → "+3"', () => {
        expect(formatModifier(3)).toBe('+3');
    });

    it('-2 → "-2"', () => {
        expect(formatModifier(-2)).toBe('-2');
    });

    it('0 → "+0"', () => {
        expect(formatModifier(0)).toBe('+0');
    });

    it('+10 → "+10"', () => {
        expect(formatModifier(10)).toBe('+10');
    });
});

// ---------------------------------------------------------------------------
// capitalize
// ---------------------------------------------------------------------------
describe('capitalize', () => {
    it('"hello" → "Hello"', () => {
        expect(capitalize('hello')).toBe('Hello');
    });

    it('empty string → empty string', () => {
        expect(capitalize('')).toBe('');
    });

    it('already-capitalized string unchanged', () => {
        expect(capitalize('Hello')).toBe('Hello');
    });

    it('null/undefined → empty string', () => {
        expect(capitalize(null)).toBe('');
        expect(capitalize(undefined)).toBe('');
    });
});

// ---------------------------------------------------------------------------
// camelToTitle
// ---------------------------------------------------------------------------
describe('camelToTitle', () => {
    it('"fooBar" → "Foo Bar"', () => {
        expect(camelToTitle('fooBar')).toBe('Foo Bar');
    });

    it('"helloWorld" → "Hello World"', () => {
        expect(camelToTitle('helloWorld')).toBe('Hello World');
    });

    it('single word unchanged in case', () => {
        expect(camelToTitle('hello')).toBe('Hello');
    });

    it('empty string → empty string', () => {
        expect(camelToTitle('')).toBe('');
    });
});

// ---------------------------------------------------------------------------
// groupBy
// ---------------------------------------------------------------------------
describe('groupBy', () => {
    it('groups objects by a string key', () => {
        const arr = [
            { type: 'a', val: 1 },
            { type: 'b', val: 2 },
            { type: 'a', val: 3 }
        ];
        const grouped = groupBy(arr, 'type');
        expect(grouped.a).toHaveLength(2);
        expect(grouped.b).toHaveLength(1);
    });

    it('group values contain the original objects', () => {
        const arr = [{ type: 'x', id: 1 }, { type: 'x', id: 2 }];
        const grouped = groupBy(arr, 'type');
        expect(grouped.x[0].id).toBe(1);
        expect(grouped.x[1].id).toBe(2);
    });

    it('handles single-element array', () => {
        const arr = [{ cat: 'only', v: 99 }];
        const grouped = groupBy(arr, 'cat');
        expect(grouped.only).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// sortBy
// ---------------------------------------------------------------------------
describe('sortBy', () => {
    const items = [{ v: 3 }, { v: 1 }, { v: 2 }];

    it('sorts ascending by default', () => {
        const result = sortBy(items, 'v');
        expect(result.map(i => i.v)).toEqual([1, 2, 3]);
    });

    it('sorts descending when ascending=false', () => {
        const result = sortBy(items, 'v', false);
        expect(result.map(i => i.v)).toEqual([3, 2, 1]);
    });

    it('returns a new array — does not mutate original', () => {
        const original = [{ v: 3 }, { v: 1 }];
        const sorted = sortBy(original, 'v');
        expect(sorted).not.toBe(original);
        expect(original[0].v).toBe(3); // unchanged
    });
});

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------
describe('formatDuration', () => {
    it('3600000ms → "1h 0m"', () => {
        expect(formatDuration(3600000)).toBe('1h 0m');
    });

    it('90000ms → "1m 30s"', () => {
        expect(formatDuration(90000)).toBe('1m 30s');
    });

    it('5000ms → "5s"', () => {
        expect(formatDuration(5000)).toBe('5s');
    });

    it('0ms → "0s"', () => {
        expect(formatDuration(0)).toBe('0s');
    });

    it('7200000ms → "2h 0m"', () => {
        expect(formatDuration(7200000)).toBe('2h 0m');
    });

    it('61000ms → "1m 1s"', () => {
        expect(formatDuration(61000)).toBe('1m 1s');
    });
});

// ---------------------------------------------------------------------------
// pointInRect
// ---------------------------------------------------------------------------
describe('pointInRect', () => {
    it('point inside rect → true', () => {
        expect(pointInRect(5, 5, 0, 0, 10, 10)).toBe(true);
    });

    it('point outside rect → false', () => {
        expect(pointInRect(15, 5, 0, 0, 10, 10)).toBe(false);
    });

    it('point at top-left corner → true', () => {
        expect(pointInRect(0, 0, 0, 0, 10, 10)).toBe(true);
    });

    it('point at exact right boundary (exclusive) → false', () => {
        expect(pointInRect(10, 5, 0, 0, 10, 10)).toBe(false);
    });

    it('point at exact bottom boundary (exclusive) → false', () => {
        expect(pointInRect(5, 10, 0, 0, 10, 10)).toBe(false);
    });

    it('point at 9,9 (just inside) → true', () => {
        expect(pointInRect(9, 9, 0, 0, 10, 10)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// EventEmitter
// ---------------------------------------------------------------------------
describe('EventEmitter', () => {
    it('on/emit: listener is called with data', () => {
        const emitter = new EventEmitter();
        let received = null;
        emitter.on('test', data => {
            received = data;
        });
        emitter.emit('test', 42);
        expect(received).toBe(42);
    });

    it('off: removes listener so it is no longer called', () => {
        const emitter = new EventEmitter();
        let count = 0;
        const cb = () => {
            count++;
        };
        emitter.on('evt', cb);
        emitter.emit('evt');
        emitter.off('evt', cb);
        emitter.emit('evt');
        expect(count).toBe(1);
    });

    it('once: listener fires only on the first emit', () => {
        const emitter = new EventEmitter();
        let count = 0;
        emitter.once('click', () => {
            count++;
        });
        emitter.emit('click');
        emitter.emit('click');
        emitter.emit('click');
        expect(count).toBe(1);
    });

    it('multiple listeners on same event all fire', () => {
        const emitter = new EventEmitter();
        let a = 0;
        let b = 0;
        emitter.on('x', () => {
            a++;
        });
        emitter.on('x', () => {
            b++;
        });
        emitter.emit('x');
        expect(a).toBe(1);
        expect(b).toBe(1);
    });

    it('emit on non-existent event does not throw', () => {
        const emitter = new EventEmitter();
        expect(() => emitter.emit('ghost')).not.toThrow();
    });

    it('off on non-existent event does not throw', () => {
        const emitter = new EventEmitter();
        expect(() => emitter.off('ghost', () => {})).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// randomChoice
// ---------------------------------------------------------------------------
describe('randomChoice', () => {
    it('returns null for empty array', () => {
        expect(randomChoice([])).toBeNull();
    });

    it('returns null for null input', () => {
        expect(randomChoice(null)).toBeNull();
    });

    it('returns an element from the array', () => {
        const arr = [1, 2, 3];
        for (let i = 0; i < 30; i++) {
            expect(arr).toContain(randomChoice(arr));
        }
    });

    it('returns the only element from a single-element array', () => {
        expect(randomChoice(['solo'])).toBe('solo');
    });
});

// ---------------------------------------------------------------------------
// shuffle
// ---------------------------------------------------------------------------
describe('shuffle', () => {
    it('returns a new array — not the original reference', () => {
        const arr = [1, 2, 3, 4];
        expect(shuffle(arr)).not.toBe(arr);
    });

    it('returned array has the same elements', () => {
        const arr = [1, 2, 3, 4, 5];
        const result = shuffle(arr);
        expect(result.sort((a, b) => a - b)).toEqual([...arr].sort((a, b) => a - b));
    });

    it('does not mutate the original array', () => {
        const arr = [1, 2, 3, 4, 5];
        const snapshot = [...arr];
        shuffle(arr);
        expect(arr).toEqual(snapshot);
    });
});
