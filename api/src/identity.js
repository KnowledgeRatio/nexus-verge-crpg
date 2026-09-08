import { createHmac, randomInt } from 'node:crypto';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 20;
const GROUP_SIZE = 5;
const USERNAME_MIN = 3;
const USERNAME_MAX = 32;

// Crockford base32 treats these as their visually identical digits.
const AMBIGUOUS = { I: '1', L: '1', O: '0', U: 'V' };

export function generateRecoveryCode() {
    let raw = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
        raw += ALPHABET[randomInt(0, ALPHABET.length)];
    }
    return formatRecoveryCode(raw);
}

export function formatRecoveryCode(raw) {
    const groups = [];
    for (let i = 0; i < raw.length; i += GROUP_SIZE) {
        groups.push(raw.slice(i, i + GROUP_SIZE));
    }
    return `NV-${groups.join('-')}`;
}

export function normalizeRecoveryCode(input) {
    if (typeof input !== 'string') {
        return null;
    }

    const stripped = input.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^NV/, '');
    const canonical = [...stripped].map(ch => AMBIGUOUS[ch] ?? ch).join('');

    if (canonical.length !== CODE_LENGTH) {
        return null;
    }
    if ([...canonical].some(ch => !ALPHABET.includes(ch))) {
        return null;
    }
    return canonical;
}

/**
 * Normalize a username into the stable form used for key derivation. Case, accent
 * composition, and run-length of internal whitespace must not change the derived key,
 * or a player retyping their own name on a second device would land on a different
 * (empty) save space.
 */
export function normalizeUsername(input) {
    if (typeof input !== 'string') {
        return null;
    }

    const canonical = input.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

    if (canonical.length < USERNAME_MIN || canonical.length > USERNAME_MAX) {
        return null;
    }
    return canonical;
}

/**
 * Derive the storage key from username AND recovery code together, so neither alone
 * is sufficient and the raw code never appears in storage.
 */
export function playerKeyFor(canonicalUsername, canonicalCode, secret) {
    return createHmac('sha256', secret)
        .update(`${canonicalUsername}:${canonicalCode}`)
        .digest('hex');
}
