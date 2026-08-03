/**
 * Tests for src/ui/CharacterCreation.js's NVSystem-mode chargen rework
 * (docs/plans/2026-07-30-attribute-system-remap.md, M1 step 9).
 *
 * No test coverage existed for CharacterCreation.js before this file. The project has no
 * jsdom/happy-dom environment configured (vitest.config.js uses environment: 'node'), so
 * these tests stub just enough of `document`/DOM to exercise the render methods that don't
 * go through renderStep() (which is the only place real document.createElement/getElementById
 * calls happen) — a minimal FakeContainer standing in for the container element the
 * production code already receives as a parameter.
 *
 * Covers:
 *  - Pure mapping helpers (isSixAttributeMode, getNewToLegacyMap, getSixAttributeIds,
 *    getAttributeName, formatLegacyAbilityLabel, getSpeciesBonus, formatKitPresetAbilities,
 *    formatAbilityIncreases, convertLegacyToSixAttributeDisplay).
 *  - The critical round trip: renderAbilityScoresStep natively labels/collects the six new
 *    attributes, and a change event writes back into characterData.baseAbilities (always
 *    legacy-keyed, per Character.js's contract) through the locked bijection — not a
 *    display-only relabel over the old str/dex/... keys.
 *  - renderReviewStep's ability/HP/AC display in both modes.
 *  - Legacy mode is a pure regression check: behavior must be byte-for-byte the same as
 *    before this task.
 */

import { describe, it, expect, afterEach } from 'vitest';

globalThis.document = globalThis.document || { getElementById: () => null };

import { CharacterCreationUI } from '../../src/ui/CharacterCreation.js';
import { RULES } from '../../src/core/rulesEngine.js';

// Mirrors data/attributes.json's real id/name/domain-grid order. Kept as an inline fixture
// (like tests/systems/character.characterization.test.js's makeCharacter fixtures) rather
// than fetched, since these tests run in a fetch-less node environment.
const attributesFixture = [
    { id: 'prowess', name: 'Prowess', abbr: 'PRO', domain: 'physical', direction: 'outward' },
    { id: 'vitality', name: 'Vitality', abbr: 'VIT', domain: 'physical', direction: 'inward' },
    { id: 'intellect', name: 'Intellect', abbr: 'INT', domain: 'mental', direction: 'outward' },
    { id: 'insight', name: 'Insight', abbr: 'INS', domain: 'mental', direction: 'inward' },
    { id: 'presence', name: 'Presence', abbr: 'PRE', domain: 'social', direction: 'outward' },
    { id: 'composure', name: 'Composure', abbr: 'COM', domain: 'social', direction: 'inward' }
];

/** Minimal fake element standing in for a <select>/<span> the production code binds to. */
class FakeElement {
    constructor() {
        this.value = '';
        this.textContent = '';
        this._listeners = {};
    }
    addEventListener(type, cb) {
        this._listeners[type] = cb;
    }
    triggerChange(value) {
        this.value = String(value);
        this._listeners.change?.({ target: this });
    }
}

/** Minimal fake container: stores raw innerHTML, lazily vends FakeElements by id for querySelector. */
class FakeContainer {
    constructor() {
        this.innerHTML = '';
        this._els = new Map();
    }
    querySelector(selector) {
        const id = selector.slice(1);
        if (!this._els.has(id)) {
            this._els.set(id, new FakeElement());
        }
        return this._els.get(id);
    }
}

function extractSpanText(html, id) {
    const match = html.match(new RegExp(`id="${id}">([\\s\\S]*?)</span>`));
    return match ? match[1].trim() : null;
}

const originalSystem = RULES.attributes.system;

function makeUI({ sixMode = false } = {}) {
    RULES.attributes.system = sixMode ? 'NVSystem' : '5EClassic';
    const ui = new CharacterCreationUI();
    ui.attributesData = sixMode ? attributesFixture : null;
    return ui;
}

afterEach(() => {
    RULES.attributes.system = originalSystem;
});

// ---------------------------------------------------------------------------
// Pure mapping helpers
// ---------------------------------------------------------------------------
describe('isSixAttributeMode', () => {
    it('reflects RULES.attributes.system', () => {
        expect(makeUI({ sixMode: false }).isSixAttributeMode()).toBe(false);
        expect(makeUI({ sixMode: true }).isSixAttributeMode()).toBe(true);
    });
});

describe('getNewToLegacyMap', () => {
    it('is the exact inverse of RULES.attributes.legacyToNew', () => {
        const ui = makeUI({ sixMode: true });
        expect(ui.getNewToLegacyMap()).toEqual({
            prowess: 'str',
            vitality: 'con',
            intellect: 'int',
            insight: 'dex',
            composure: 'wis',
            presence: 'cha'
        });
    });
});

describe('getSixAttributeIds', () => {
    it('uses the domain-grid order from attributesData when loaded', () => {
        const ui = makeUI({ sixMode: true });
        expect(ui.getSixAttributeIds()).toEqual(['prowess', 'vitality', 'intellect', 'insight', 'presence', 'composure']);
    });

    it('falls back to RULES.attributes.legacyToNew\'s value set when attributesData has not loaded', () => {
        const ui = makeUI({ sixMode: true });
        ui.attributesData = null;
        expect(ui.getSixAttributeIds().sort()).toEqual(Object.values(RULES.attributes.legacyToNew).sort());
    });
});

describe('getAttributeName', () => {
    it('resolves a new attribute id to its display name', () => {
        const ui = makeUI({ sixMode: true });
        expect(ui.getAttributeName('insight')).toBe('Insight');
    });

    it('falls back to the raw id when attributesData has no match', () => {
        const ui = makeUI({ sixMode: true });
        expect(ui.getAttributeName('unknown')).toBe('unknown');
    });
});

describe('formatLegacyAbilityLabel', () => {
    it('legacy mode: uppercases the raw legacy key', () => {
        const ui = makeUI({ sixMode: false });
        expect(ui.formatLegacyAbilityLabel('dex')).toBe('DEX');
    });

    it('NVSystem mode: translates through the bijection, not a direct relabel', () => {
        const ui = makeUI({ sixMode: true });
        // dex -> insight (NOT prowess) — the split-attribute reassignment, per the plan.
        expect(ui.formatLegacyAbilityLabel('dex')).toBe('Insight');
        expect(ui.formatLegacyAbilityLabel('wis')).toBe('Composure');
        expect(ui.formatLegacyAbilityLabel('cha')).toBe('Presence');
        expect(ui.formatLegacyAbilityLabel('str')).toBe('Prowess');
    });
});

describe('getSpeciesBonus', () => {
    it('legacy mode: reads the species bonus directly by legacy key', () => {
        const ui = makeUI({ sixMode: false });
        ui.characterData.species = { abilityScoreIncrease: { dex: 2 } };
        expect(ui.getSpeciesBonus('dex')).toBe(2);
        expect(ui.getSpeciesBonus('str')).toBe(0);
    });

    it('NVSystem mode: translates the new key back to its legacy source before lookup', () => {
        const ui = makeUI({ sixMode: true });
        ui.characterData.species = { abilityScoreIncrease: { dex: 2 } };
        expect(ui.getSpeciesBonus('insight')).toBe(2); // insight's legacy source is dex
        expect(ui.getSpeciesBonus('prowess')).toBe(0);
    });
});

describe('convertLegacyToSixAttributeDisplay', () => {
    it('converts a legacy-keyed bag to a six-attribute-keyed bag via the locked bijection', () => {
        const ui = makeUI({ sixMode: true });
        const result = ui.convertLegacyToSixAttributeDisplay({
            str: 16, dex: 14, con: 12, int: 10, wis: 13, cha: 15
        });
        expect(result).toEqual({
            prowess: 16, vitality: 12, intellect: 10, insight: 14, presence: 15, composure: 13
        });
    });

    it('defaults a missing legacy key to 10', () => {
        const ui = makeUI({ sixMode: true });
        const result = ui.convertLegacyToSixAttributeDisplay({ str: 16 });
        expect(result.vitality).toBe(10);
    });
});

describe('formatAbilityIncreases', () => {
    it('legacy mode: uppercases legacy keys unchanged', () => {
        const ui = makeUI({ sixMode: false });
        expect(ui.formatAbilityIncreases({ wis: 1, cha: 2 })).toBe('WIS +1, CHA +2');
    });

    it('NVSystem mode: translates split-attribute keys correctly, not identity-mapped', () => {
        const ui = makeUI({ sixMode: true });
        expect(ui.formatAbilityIncreases({ wis: 1, cha: 2 })).toBe('Composure +1, Presence +2');
    });
});

describe('formatKitPresetAbilities', () => {
    const presetAbilities = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
    const preset = { abilities: presetAbilities };

    it('legacy mode: unchanged STR/DEX/CON/INT/WIS/CHA order and labels', () => {
        const ui = makeUI({ sixMode: false });
        expect(ui.formatKitPresetAbilities(preset)).toBe('STR 15, DEX 14, CON 13, INT 12, WIS 10, CHA 8');
    });

    it('NVSystem mode: falls back to the bijection conversion when the preset has no native block, domain-grid order, translated labels', () => {
        const ui = makeUI({ sixMode: true });
        expect(ui.formatKitPresetAbilities(preset))
            .toBe('Prowess 15, Vitality 13, Intellect 12, Insight 14, Presence 8, Composure 10');
    });

    it('NVSystem mode: uses the preset\'s native abilitiesNVSystem block directly when present, ignoring the legacy block', () => {
        const ui = makeUI({ sixMode: true });
        const nativePreset = {
            abilities: presetAbilities,
            abilitiesNVSystem: { prowess: 99, vitality: 99, intellect: 99, insight: 99, presence: 99, composure: 99 }
        };
        expect(ui.formatKitPresetAbilities(nativePreset))
            .toBe('Prowess 99, Vitality 99, Intellect 99, Insight 99, Presence 99, Composure 99');
    });
});

// ---------------------------------------------------------------------------
// renderAbilityScoresStep — the critical native-collection round trip
// ---------------------------------------------------------------------------
describe('renderAbilityScoresStep', () => {
    function fixtureClass() {
        return { name: 'Test Calling', primaryAbility: ['dex', 'wis'] };
    }

    it('legacy mode: renders STR/DEX/CON/INT/WIS/CHA labels (regression, unchanged from before this task)', () => {
        const ui = makeUI({ sixMode: false });
        ui.characterData.class = fixtureClass();
        ui.characterData.baseAbilities = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
        const container = new FakeContainer();

        ui.renderAbilityScoresStep(container);

        for (const label of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']) {
            expect(container.innerHTML).toContain(`<label>${label}</label>`);
        }
        expect(container.innerHTML).toContain('Recommended for Test Calling:\n                DEX, WIS');
    });

    it('NVSystem mode: natively labels the six new attributes, not STR/DEX relabeled', () => {
        const ui = makeUI({ sixMode: true });
        ui.characterData.class = fixtureClass();
        ui.characterData.species = { abilityScoreIncrease: { dex: 2 } };
        ui.characterData.baseAbilities = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
        const container = new FakeContainer();

        ui.renderAbilityScoresStep(container);

        for (const label of ['Prowess', 'Vitality', 'Intellect', 'Insight', 'Presence', 'Composure']) {
            expect(container.innerHTML).toContain(`<label>${label}</label>`);
        }
        for (const legacyLabel of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']) {
            expect(container.innerHTML).not.toContain(`<label>${legacyLabel}</label>`);
        }

        // Insight's initial modifier reflects dex=14 (its legacy source): floor((14-10)/2) = +2
        expect(extractSpanText(container.innerHTML, 'mod-insight')).toBe('+2');
        // Species dex+2 bonus surfaces on the Insight row, translated correctly.
        expect(extractSpanText(container.innerHTML, 'racial-insight')).toBe('+2 (species)');
        // Recommended-for hint translates class.primaryAbility (['dex','wis']) too.
        expect(container.innerHTML).toContain('Insight, Composure');
    });

    it('NVSystem mode: a change on the Insight select writes into baseAbilities.dex (legacy), not .insight', () => {
        const ui = makeUI({ sixMode: true });
        ui.characterData.class = fixtureClass();
        ui.characterData.baseAbilities = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
        const container = new FakeContainer();

        ui.renderAbilityScoresStep(container);
        container.querySelector('#ability-insight').triggerChange(8);

        expect(ui.characterData.baseAbilities.dex).toBe(8);
        expect(ui.characterData.baseAbilities.insight).toBeUndefined();
        // Untouched keys are unaffected by the write-back.
        expect(ui.characterData.baseAbilities.str).toBe(15);
        expect(ui.characterData.baseAbilities.con).toBe(13);
        // baseAbilities stays exactly legacy-shaped (Character.js's contract) after collection.
        expect(Object.keys(ui.characterData.baseAbilities).sort()).toEqual(['cha', 'con', 'dex', 'int', 'str', 'wis']);

        // updateAbilityModifiers is invoked by the change handler: floor((8-10)/2) = -1
        expect(container.querySelector('#mod-insight').textContent).toBe('-1');
    });

    it('NVSystem mode: a change on the Presence select writes into baseAbilities.cha, mirroring the locked bijection', () => {
        const ui = makeUI({ sixMode: true });
        ui.characterData.class = fixtureClass();
        ui.characterData.baseAbilities = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
        const container = new FakeContainer();

        ui.renderAbilityScoresStep(container);
        container.querySelector('#ability-presence').triggerChange(15);

        expect(ui.characterData.baseAbilities.cha).toBe(15);
        expect(ui.characterData.baseAbilities.wis).toBe(10); // Composure's select untouched
    });
});

// ---------------------------------------------------------------------------
// renderReviewStep
// ---------------------------------------------------------------------------
describe('renderReviewStep', () => {
    function fixtureCharacterData(ui) {
        ui.characterData.name = 'Fixture Hero';
        ui.characterData.species = { name: 'Human', speed: 30, abilityScoreIncrease: { dex: 1 } };
        ui.characterData.class = {
            name: 'Dedication', displayName: 'Dedication', hitDie: 10,
            armorProficiencies: [], weaponProficiencies: [], features: {}
        };
        ui.characterData.kit = { isCustom: true };
        ui.characterData.background = { name: 'Soldier', skillProficiencies: [] };
        ui.characterData.skillChoices = [];
        ui.characterData.weaponMasteries = [];
        ui.characterData.baseAbilities = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
    }

    it('legacy mode: shows STR/DEX/... and HP/AC from CON/DEX (regression, unchanged)', () => {
        const ui = makeUI({ sixMode: false });
        fixtureCharacterData(ui);
        const container = new FakeContainer();

        ui.renderReviewStep(container);

        expect(container.innerHTML).toContain('<span class="ability-name">STR</span>');
        expect(container.innerHTML).toContain('<span class="ability-name">DEX</span>');
        // HP: hitDie(10) + CON mod. Species doesn't touch con: floor((13-10)/2) = +1 -> 11
        expect(container.innerHTML).toContain('<strong>Hit Points:</strong> 11');
        // AC: 10 + DEX mod. dex 14 + species +1 = 15 -> mod +2 -> AC 12
        expect(container.innerHTML).toContain('<strong>Armor Class:</strong> 12');
    });

    it('NVSystem mode: shows Prowess/Vitality/... and HP/AC from Vitality/Insight', () => {
        const ui = makeUI({ sixMode: true });
        fixtureCharacterData(ui);
        const container = new FakeContainer();

        ui.renderReviewStep(container);

        expect(container.innerHTML).toContain('<span class="ability-name">Prowess</span>');
        expect(container.innerHTML).toContain('<span class="ability-name">Vitality</span>');
        expect(container.innerHTML).toContain('<span class="ability-name">Insight</span>');
        expect(container.innerHTML).not.toContain('<span class="ability-name">STR</span>');
        expect(container.innerHTML).not.toContain('<span class="ability-name">DEX</span>');

        // HP: hitDie(10) + Vitality mod, Vitality <- con(13), species doesn't touch con: +1 -> 11
        expect(container.innerHTML).toContain('<strong>Hit Points:</strong> 11');
        // AC: 10 + Insight mod, Insight <- dex(14) + species dex+1 = 15 -> mod +2 -> AC 12
        expect(container.innerHTML).toContain('<strong>Armor Class:</strong> 12');
    });
});
