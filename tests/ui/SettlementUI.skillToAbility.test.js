/**
 * Tests for src/ui/SettlementUI.js's _skillToAbility() dual-mode fix
 * (docs/plans/2026-07-30-attribute-system-remap.md, M2 flagged loose end #1).
 *
 * Same discriminating case used in SkillChallengeManager.sixAttribute.test.js and
 * Character.characterization.test.js's updateSkillBonuses sixAttribute block: Perception's
 * legacy `ability` is "wis", but decision #1 maps it to "insight" for NVSystem mode, and
 * insight's legacy conversion source is DEX, not WIS. A discriminating skillsData fixture with
 * distinct legacy/sixAttribute answers proves the mode switch is actually consulted, not just
 * falling back to the legacy field in both modes.
 *
 * The project has no jsdom/happy-dom environment (vitest.config.js uses environment: 'node'),
 * so `document` is stubbed just enough for SettlementUI's constructor (initializeEventListeners
 * calls document.getElementById / document.querySelectorAll) — mirrors the stub pattern in
 * tests/ui/CharacterCreation.sixAttribute.test.js.
 */

import { describe, it, expect, afterEach } from 'vitest';

globalThis.document = globalThis.document || {
    getElementById: () => null,
    querySelectorAll: () => []
};

import SettlementUI from '../../src/ui/SettlementUI.js';
import { RULES } from '../../src/core/rulesEngine.js';

const originalSystem = RULES.attributes.system;
const originalSkillChallengeManager = globalThis.window?.skillChallengeManager;

function makeUI() {
    return new SettlementUI(null);
}

afterEach(() => {
    RULES.attributes.system = originalSystem;
    if (globalThis.window) {
        globalThis.window.skillChallengeManager = originalSkillChallengeManager;
    }
});

describe('SettlementUI._skillToAbility — delegates to window.skillChallengeManager.skillsData', () => {
    it('legacy mode: reads the skill\'s `ability` field', () => {
        RULES.attributes.system = '5EClassic';
        globalThis.window = globalThis.window || {};
        globalThis.window.skillChallengeManager = {
            skillsData: [{ id: 'perception', ability: 'wis', attributeNVSystem: 'insight' }]
        };

        const ui = makeUI();
        expect(ui._skillToAbility('perception')).toBe('wis');
    });

    it('NVSystem mode: reads the skill\'s `attributeNVSystem` field, not `ability`', () => {
        RULES.attributes.system = 'NVSystem';
        globalThis.window = globalThis.window || {};
        globalThis.window.skillChallengeManager = {
            skillsData: [{ id: 'perception', ability: 'wis', attributeNVSystem: 'insight' }]
        };

        const ui = makeUI();
        expect(ui._skillToAbility('perception')).toBe('insight');
        expect(ui._skillToAbility('perception')).not.toBe('wis');
    });
});

describe('SettlementUI._skillToAbility — fallback map when skillChallengeManager data is unavailable', () => {
    it('legacy mode: falls back to the static legacy map', () => {
        RULES.attributes.system = '5EClassic';
        globalThis.window = globalThis.window || {};
        globalThis.window.skillChallengeManager = undefined;

        const ui = makeUI();
        expect(ui._skillToAbility('perception')).toBe('wis');
        expect(ui._skillToAbility('athletics')).toBe('str');
    });

    it('NVSystem mode: falls back to the static NVSystem map, not the legacy one', () => {
        RULES.attributes.system = 'NVSystem';
        globalThis.window = globalThis.window || {};
        globalThis.window.skillChallengeManager = undefined;

        const ui = makeUI();
        expect(ui._skillToAbility('perception')).toBe('insight');
        expect(ui._skillToAbility('athletics')).toBe('prowess');
    });
});
