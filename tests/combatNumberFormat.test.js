import { afterEach, describe, expect, it } from 'vitest';
import { RULES } from '../src/core/rulesEngine.js';
import { formatCombatNumber, healthBarAttributes, conditionDescription, escapeAttribute } from '../src/utils/combatNumberFormat.js';

const originalConfig = RULES.combat.damageOverTime;
afterEach(() => {
    RULES.combat.damageOverTime = originalConfig;
});

describe('fractional combat presentation', () => {
    it('preserves legacy strings and attributes when the fork is off', () => {
        RULES.combat.damageOverTime = { enabled: false };
        for (const value of [0, 1, 0.001, 1.23456, 'MISS!', '?']) {
            expect(formatCombatNumber(value)).toBe(String(value));
        }
        expect(healthBarAttributes(0.001, 100)).toBe('');
        expect(conditionDescription({ icon: '🩸', type: 'bleeding' })).toBe('🩸 bleeding');
    });

    it('keeps positive ticks and living health visible at the precision boundary', () => {
        RULES.combat.damageOverTime = { enabled: true, unitsPerHP: 1000 };
        for (const [value, expected] of [[0.001, '0.001'], [0.134, '0.134'], [2.5000000001, '2.5'], [1.234, '1.234'], [0, '0'], [0.0001, '<0.001']]) {
            expect(formatCombatNumber(value)).toBe(expected);
        }
        expect(healthBarAttributes(0.001, 100)).toContain('aria-valuenow="0.001"');
        expect(healthBarAttributes(0.001, 100)).toContain('0.001 of 100 health');
    });

    it('shows each remaining schedule without claiming guaranteed post-defense damage', () => {
        RULES.combat.damageOverTime = { enabled: true, unitsPerHP: 1000 };
        const condition = { type: 'bleeding', icon: '🩸', periodicDamage: { tranches: [
            { sourceId: 'a', damageType: 'blood', ticksUnits: [134, 133, 133], cursor: 0 },
            { sourceId: 'b', damageType: 'blood', ticksUnits: [100, 100, 100], cursor: 1 }
        ] } };
        const description = conditionDescription(condition, id => ({ a: 'Dagger', b: 'Sword' })[id]);
        expect(description).toContain('next turn 0.234, pending 0.6 blood damage before defenses');
        expect(description).toContain('final tick in 3 target turns');
        expect(description).toContain('Sources: Dagger, Sword');
    });

    it('escapes untrusted source names in HTML attributes', () => {
        expect(escapeAttribute('"<script>&')).toBe('&quot;&lt;script&gt;&amp;');
    });
});
