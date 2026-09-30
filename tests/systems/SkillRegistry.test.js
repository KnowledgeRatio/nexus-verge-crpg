import { beforeEach, describe, expect, it } from 'vitest';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import { RULES } from '../../src/core/rulesEngine.js';
import { readFileSync } from 'node:fs';

const skillsJson = JSON.parse(readFileSync(new URL('../../data/skills.json', import.meta.url)));

describe('SkillRegistry', () => {
    beforeEach(() => {
        RULES.attributes.system = 'NVSystem';
        skillRegistry.setDefinitions(skillsJson.skills);
    });

    it('contains the canonical nine-skill catalogue', () => {
        expect(skillRegistry.definitions.map(skill => skill.id)).toEqual([
            'athletics', 'finesse', 'survival', 'craft', 'lore',
            'investigation', 'perception', 'empathy', 'influence'
        ]);
    });

    it('merges old proficiency and expertise into canonical save state', () => {
        const migrated = skillRegistry.migrateSkillState({
            arcana: { proficient: true },
            academia: { expertise: true },
            deception: { proficient: true },
            sleightOfHand: { proficient: true }
        });

        expect(migrated.lore).toMatchObject({ proficient: true, expertise: true });
        expect(migrated.influence.proficient).toBe(true);
        expect(migrated.finesse.proficient).toBe(true);
        expect(migrated.arcana).toBeUndefined();
    });

    it('uses the authored approach while preserving shared proficiency', () => {
        const character = {
            abilities: { prowess: 10, resilience: 10, intellect: 10, intuition: 10, presence: 18, composure: 14 },
            proficiencyBonus: 3,
            skills: { influence: { proficient: true, expertise: false } }
        };

        expect(skillRegistry.getModifier(character, 'influence', 'presence')).toBe(7);
        expect(skillRegistry.getModifier(character, 'influence', 'composure')).toBe(5);
    });

    it('rejects a third-attribute pairing', () => {
        expect(() => skillRegistry.getModifier({ abilities: {} }, 'lore', 'presence')).toThrow(
            'presence is not an allowed attribute for lore'
        );
    });
});
