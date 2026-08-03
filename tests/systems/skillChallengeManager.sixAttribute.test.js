/**
 * Tests for src/systems/SkillChallengeManager.js's getSkillModifier() under both
 * RULES.attributes.system modes (docs/plans/2026-07-30-attribute-system-remap.md, M1.5
 * flip-readiness bugfix pass, Bug B).
 *
 * Builds a real `new Character(...)` and a real `SkillChallengeManager` populated from the
 * actual data/skills.json content (via readFileSync, not a fetch mock) — deliberately not a
 * hand-built fixture with a pre-picked ability field. Bug 2's post-mortem (see
 * .claude/agent-memory/backend-dev/attribute_remap_m1_formulas.md) flagged that every prior
 * NVSystem-mode test used fixtures that already had the answer baked in; this file
 * exercises the real skills.json data + the real per-skill attribute lookup instead.
 *
 * Perception is the discriminating case: its legacy `ability` is "wis", but decision #1 maps
 * it to "insight" for NVSystem mode — and insight's legacy conversion source is DEX, not
 * WIS (see "Legacy split-attribute conversion" in the plan). So a character with divergent
 * WIS/DEX scores produces genuinely different modifiers depending on which field
 * getSkillModifier reads, proving the fix actually switches attribute source rather than
 * silently falling back to the legacy `ability` field in both modes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Character } from '../../src/systems/Character.js';
import SkillChallengeManager from '../../src/systems/SkillChallengeManager.js';
import { RULES } from '../../src/core/rulesEngine.js';
import { getAbilityModifier } from '../../src/utils/dice.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const skillsData = JSON.parse(readFileSync(join(repoRoot, 'data/skills.json'), 'utf8')).skills;

function makeCharacter(overrides = {}) {
    const base = {
        name: 'Test Hero',
        level: 5,
        baseAbilities: { str: 10, dex: 18, con: 10, int: 10, wis: 8, cha: 10 },
        skillChoices: ['perception', 'athletics'],
        class: {
            id: 'testClass',
            hitDie: 8,
            savingThrowProficiencies: ['str', 'con'],
            armorProficiencies: [],
            weaponProficiencies: [],
            toolProficiencies: [],
            features: {},
            spellcaster: false
        },
        species: { abilityScoreIncrease: {}, traits: [], speed: 30, languages: [], skillProficiencies: [] },
        background: { skillProficiencies: [], feature: null, startingGold: 100 }
    };
    return new Character({ ...base, ...overrides });
}

function makeManager() {
    const manager = new SkillChallengeManager();
    manager.skillsData = skillsData;
    return manager;
}

describe('SkillChallengeManager.getSkillModifier — real character + real skills.json', () => {
    // Default flag flipped to 'NVSystem' at M1.5 (2026-08-03). These outer-scope tests
    // characterize '5EClassic'-mode lookups specifically, so force that mode; the nested
    // 'NVSystem mode' describe below overrides it back in its own beforeEach.
    const originalSystem = RULES.attributes.system;
    beforeEach(() => {
        RULES.attributes.system = '5EClassic';
    });
    afterEach(() => {
        RULES.attributes.system = originalSystem;
    });

    it('legacy mode: Perception reads the WIS modifier', () => {
        const character = makeCharacter(); // wis 8 -> mod -1, proficient (in skillChoices) -> +3 prof
        const manager = makeManager();

        expect(manager.getSkillModifier(character, 'perception')).toBe(-1 + character.proficiencyBonus);
    });

    it('legacy mode: proficient Athletics adds STR mod + proficiency bonus', () => {
        const character = makeCharacter({ baseAbilities: { str: 16, dex: 18, con: 10, int: 10, wis: 8, cha: 10 } });
        const manager = makeManager();

        // str 16 -> mod +3, proficient at level 5 -> +3 proficiency
        expect(manager.getSkillModifier(character, 'athletics')).toBe(3 + character.proficiencyBonus);
    });

    it('unproficient skill omits the proficiency bonus', () => {
        const character = makeCharacter(); // 'deception' not in skillChoices
        const manager = makeManager();

        expect(manager.getSkillModifier(character, 'deception')).toBe(character.abilityModifiers.cha);
    });

    describe('NVSystem mode', () => {
        beforeEach(() => {
            RULES.attributes.system = 'NVSystem';
        });

        it('Perception reads the Insight modifier (DEX-derived), not WIS — proves attributeNVSystem is actually consulted', () => {
            const character = makeCharacter(); // wis 8 -> mod -1, dex 18 -> insight mod +4, proficient -> +3 prof
            const manager = makeManager();

            expect(character.abilities.insight).toBe(18); // dex -> insight bijection
            expect(manager.getSkillModifier(character, 'perception')).toBe(4 + character.proficiencyBonus);
            expect(manager.getSkillModifier(character, 'perception')).not.toBe(
                getAbilityModifier(character.abilities.wis) + character.proficiencyBonus
            );
        });

        it('Athletics still reads Prowess (STR-derived) — unsplit ability, same numeric answer as legacy', () => {
            const character = makeCharacter({ baseAbilities: { str: 16, dex: 18, con: 10, int: 10, wis: 8, cha: 10 } });
            const manager = makeManager();

            expect(manager.getSkillModifier(character, 'athletics')).toBe(3 + character.proficiencyBonus);
        });

        it('proficiency lookup still reads character.skills[skillId].proficient (object shape), not a broken array .find', () => {
            const character = makeCharacter();
            const manager = makeManager();

            // Confirms getSkillModifier doesn't throw against the real Character.skills shape
            // (a dictionary keyed by skill id, not an array) — the pre-existing bug this fix
            // also closed.
            expect(() => manager.getSkillModifier(character, 'deception')).not.toThrow();
            expect(manager.getSkillModifier(character, 'deception')).toBe(character.abilityModifiers.composure);
        });
    });
});
