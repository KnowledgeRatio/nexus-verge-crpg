import { RULES } from '../core/rulesEngine.js';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 20;
const GROUP_SIZE = 5;
const USERNAME_MIN = 3;
const USERNAME_MAX = 32;
const AMBIGUOUS = { I: '1', L: '1', O: '0', U: 'V' };

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

export function formatRecoveryCode(canonical) {
    const groups = [];
    for (let i = 0; i < canonical.length; i += GROUP_SIZE) {
        groups.push(canonical.slice(i, i + GROUP_SIZE));
    }
    return `NV-${groups.join('-')}`;
}

export function isValidUsername(input) {
    if (typeof input !== 'string') {
        return false;
    }
    const trimmed = input.normalize('NFKC').trim().replace(/\s+/g, ' ');
    return trimmed.length >= USERNAME_MIN && trimmed.length <= USERNAME_MAX;
}

export class PlayerIdentity {
    constructor() {
        this.codeKey = RULES.saves.recoveryCodeStorageKey;
        this.usernameKey = RULES.saves.usernameStorageKey;
        this.apiBaseUrl = RULES.saves.apiBaseUrl;
    }

    getCode() {
        return localStorage.getItem(this.codeKey);
    }

    getUsername() {
        return localStorage.getItem(this.usernameKey);
    }

    hasIdentity() {
        return Boolean(this.getCode() && this.getUsername());
    }

    store(username, code) {
        localStorage.setItem(this.usernameKey, username.normalize('NFKC').trim().replace(/\s+/g, ' '));
        localStorage.setItem(this.codeKey, code);
    }

    clear() {
        localStorage.removeItem(this.codeKey);
        localStorage.removeItem(this.usernameKey);
    }

    /**
     * Adopt an existing username + code pair typed in by the player on another device.
     * @returns {Object} { success, message }
     */
    adopt(username, code) {
        if (!isValidUsername(username)) {
            return { success: false, message: `Name must be ${USERNAME_MIN}-${USERNAME_MAX} characters.` };
        }

        const canonical = normalizeRecoveryCode(code);
        if (!canonical) {
            return { success: false, message: 'That recovery code is not valid.' };
        }

        this.store(username, formatRecoveryCode(canonical));
        return { success: true, message: 'Cloud saves linked.' };
    }

    /**
     * Register a new player and mint their recovery code.
     * @returns {Promise<string>} The new recovery code
     */
    async register(username) {
        if (!isValidUsername(username)) {
            throw new Error(`Name must be ${USERNAME_MIN}-${USERNAME_MAX} characters.`);
        }

        const response = await fetch(`${this.apiBaseUrl}/player`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        if (!response.ok) {
            throw new Error(`Could not create a cloud save identity (${response.status})`);
        }

        const { code } = await response.json();
        this.store(username, code);
        return code;
    }

    /**
     * Auth headers for an authenticated save request.
     * Throws when no identity exists — callers must register or adopt first.
     */
    authHeaders() {
        if (!this.hasIdentity()) {
            throw new Error('No cloud save identity — set a name and recovery code first.');
        }

        return {
            Authorization: `Bearer ${this.getCode()}`,
            'X-Player-Name': this.getUsername()
        };
    }

    /**
     * Replace the current code with a fresh one, moving saves across.
     * Optionally changes the username at the same time.
     * @returns {Promise<string>} The new recovery code
     */
    async rotateCode(nextUsername = null) {
        const response = await fetch(`${this.apiBaseUrl}/player/rotate`, {
            method: 'POST',
            headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(nextUsername ? { username: nextUsername } : {})
        });
        if (!response.ok) {
            throw new Error(`Could not rotate the recovery code (${response.status})`);
        }

        const { code } = await response.json();
        this.store(nextUsername || this.getUsername(), code);
        return code;
    }
}

export const playerIdentity = new PlayerIdentity();
