import { describe, it, expect } from 'vitest';
import {
    normalizeRecoveryCode,
    formatRecoveryCode,
    isValidUsername
} from '../../src/systems/PlayerIdentity.js';
import {
    generateRecoveryCode,
    normalizeRecoveryCode as serverNormalizeCode,
    normalizeUsername,
    playerKeyFor
} from '../../api/src/identity.js';

const SECRET = 'test-secret';

describe('recovery code normalization', () => {
    it('accepts a freshly generated code', () => {
        const code = generateRecoveryCode();
        expect(normalizeRecoveryCode(code)).toHaveLength(20);
    });

    it('client and server agree on canonical form', () => {
        const code = generateRecoveryCode();
        expect(normalizeRecoveryCode(code)).toBe(serverNormalizeCode(code));
    });

    it('survives the ways a player retypes a code', () => {
        const canonical = normalizeRecoveryCode(generateRecoveryCode());
        const formatted = formatRecoveryCode(canonical);

        const variants = [
            formatted.toLowerCase(),
            formatted.replace(/-/g, ''),
            formatted.replace(/-/g, ' '),
            `  ${formatted}  `
        ];

        for (const variant of variants) {
            expect(normalizeRecoveryCode(variant)).toBe(canonical);
        }
    });

    it('maps Crockford-ambiguous characters to their digits', () => {
        // O/0 and I/1 are visually identical in most fonts; a player copying by eye
        // must not be sent to a different (empty) save space.
        const canonical = 'O1234I6789ABCDEFGHJK'.replace(/O/g, '0').replace(/I/g, '1');
        expect(normalizeRecoveryCode('NV-O1234-I6789-ABCDE-FGHJK')).toBe(canonical);
    });

    it('rejects codes of the wrong length', () => {
        expect(normalizeRecoveryCode('NV-ABC')).toBeNull();
        expect(normalizeRecoveryCode('')).toBeNull();
        expect(normalizeRecoveryCode(null)).toBeNull();
    });
});

describe('username normalization', () => {
    it('is stable across case, padding, and internal whitespace', () => {
        const forms = ['Gil the Grey', 'gil the grey', '  GIL   THE  GREY  '];
        const keys = forms.map(name => normalizeUsername(name));

        expect(new Set(keys).size).toBe(1);
    });

    it('enforces the same length bounds on both sides', () => {
        expect(normalizeUsername('ab')).toBeNull();
        expect(isValidUsername('ab')).toBe(false);

        expect(normalizeUsername('abc')).toBe('abc');
        expect(isValidUsername('abc')).toBe(true);

        const tooLong = 'x'.repeat(33);
        expect(normalizeUsername(tooLong)).toBeNull();
        expect(isValidUsername(tooLong)).toBe(false);
    });
});

describe('player key derivation', () => {
    const code = generateRecoveryCode();
    const canonicalCode = serverNormalizeCode(code);

    it('requires both username and code — neither alone reproduces the key', () => {
        const key = playerKeyFor(normalizeUsername('Gil'), canonicalCode, SECRET);

        const otherName = playerKeyFor(normalizeUsername('Mara'), canonicalCode, SECRET);
        const otherCode = playerKeyFor(
            normalizeUsername('Gil'),
            serverNormalizeCode(generateRecoveryCode()),
            SECRET
        );

        expect(otherName).not.toBe(key);
        expect(otherCode).not.toBe(key);
    });

    it('is stable for the same pair typed differently', () => {
        const a = playerKeyFor(normalizeUsername('Gil The Grey'), canonicalCode, SECRET);
        const b = playerKeyFor(
            normalizeUsername('  gil the   grey '),
            serverNormalizeCode(formatRecoveryCode(canonicalCode).toLowerCase()),
            SECRET
        );

        expect(a).toBe(b);
    });

    it('does not leak the code — the key is not derivable without the secret', () => {
        const withSecret = playerKeyFor(normalizeUsername('Gil'), canonicalCode, SECRET);
        const withOther = playerKeyFor(normalizeUsername('Gil'), canonicalCode, 'different-secret');

        expect(withSecret).not.toBe(withOther);
        expect(withSecret).not.toContain(canonicalCode);
    });
});
