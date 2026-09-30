/** Settlement skill checks use the shared registry rather than a UI-owned map. */

import { describe, it, expect, beforeEach } from 'vitest';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import { RULES } from '../../src/core/rulesEngine.js';
import { readFileSync } from 'node:fs';

const skillsJson = JSON.parse(readFileSync(new URL('../../data/skills.json', import.meta.url)));

describe('Settlement skill resolution', () => {
    beforeEach(() => {
        RULES.attributes.system = 'NVSystem';
        skillRegistry.setDefinitions(skillsJson.skills);
    });

    it('uses the primary attribute when an approach omits one', () => {
        expect(skillRegistry.resolveAttribute('perception')).toBe('intuition');
        expect(skillRegistry.resolveAttribute('influence')).toBe('presence');
    });

    it('allows the authored secondary attribute', () => {
        expect(skillRegistry.resolveAttribute('empathy', 'presence')).toBe('presence');
        expect(skillRegistry.resolveAttribute('influence', 'composure')).toBe('composure');
    });

    it('rejects an unauthorised third attribute', () => {
        expect(() => skillRegistry.resolveAttribute('influence', 'prowess')).toThrow(
            'prowess is not an allowed attribute for influence'
        );
    });

    it('normalises retired skills at the shared boundary', () => {
        expect(skillRegistry.normalizeId('deception')).toBe('influence');
        expect(skillRegistry.normalizeId('arcana')).toBe('lore');
        expect(skillRegistry.normalizeId('sleightOfHand')).toBe('finesse');
    });
});
