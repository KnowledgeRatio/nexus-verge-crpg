/**
 * Tests for LevelUpManager's Oath identity-pass rendering (2026-08-06/07):
 *   - renderTraitChoice() exercised for real for the first time as a genuine radio-vs-checkbox
 *     choice (level-3 Aura pick, count: 1 -> radio) — previously this function's `count === 1`
 *     branch had no direct test coverage.
 *   - renderVowChoice() (new): the level 5/7/9 Vow pool, the first choice UI built from two
 *     merged data sources — abilities.json (Challenge, Reprisal, Intervene, Bolster, all
 *     `specialization: 'oath'` + `tags: ['vow']`) and traits.json (Conviction, same filter
 *     shape) — 5 total candidates, matching the locked design's "pick 3 of 5 across L5/7/9"
 *     (see .claude/agent-memory/balance-engineer/project_oath_locked_spec_balance_pass.md;
 *     that memory names a since-cut "Zealous Smite" instead of Conviction as the 5th slot —
 *     verified against live data here, not a bug, just a naming drift between the pre-
 *     implementation balance pass and what actually shipped).
 *
 * Same stub pattern as tests/systems/LevelUpManager.tacticChoice.test.js: no jsdom/happy-dom
 * (vitest.config.js uses environment: 'node'), so `document` is stubbed to just enough to
 * observe what LevelUpManager queries and writes.
 */

import { describe, it, expect } from 'vitest';
import LevelUpManager from '../../src/systems/LevelUpManager.js';
import abilitiesData from '../../data/abilities.json' with { type: 'json' };
import traitsData from '../../data/traits.json' with { type: 'json' };

function makeDocumentStub() {
    const elements = {
        traitChoiceSection: { style: {} },
        traitChoiceList: { innerHTML: '' },
        traitChoiceCount: { textContent: '' },
        vowChoiceSection: { style: {} },
        vowChoiceList: { innerHTML: '' },
        vowChoiceCount: { textContent: '' }
    };
    return {
        elements,
        document: {
            getElementById: (id) => elements[id] || null
        }
    };
}

const auraChoice = {
    type: 'trait', count: 1, required: true,
    requiresSpecialization: 'oath', label: 'Choose an Aura',
    filter: { specialization: 'oath', tier: 3 }
};
const vowChoice = {
    type: 'vow', count: 1, required: false,
    requiresSpecialization: 'oath', label: 'Learn a Vow'
};

describe('LevelUpManager.renderTraitChoice — level-3 Oath Aura pick (real radio choice)', () => {
    it('renders exactly the 3 Auras as radio-select options, with names/descriptions from traits.json', () => {
        const { elements, document: documentStub } = makeDocumentStub();
        globalThis.document = documentStub;

        const manager = new LevelUpManager();
        manager.traitsData = traitsData;

        const character = { class: { id: 'dedication' } };
        manager.renderTraitChoice(character, auraChoice);

        expect(elements.traitChoiceCount.textContent).toBe('Choose 1 - Required');

        const html = elements.traitChoiceList.innerHTML;
        expect((html.match(/data-choice-type="trait"/g) || []).length).toBe(3);
        expect(html).toContain('data-choice-id="aura_of_exposure"');
        expect(html).toContain('data-choice-id="aura_of_sanctuary"');
        expect(html).toContain('data-choice-id="aura_of_mercy"');
        expect(html).toContain('Aura of Exposure');
        expect(html).toContain('Enemies engaged with you are Exposed: -1 AC');
        expect(html).toContain('Aura of Sanctuary');
        expect(html).toContain('Aura of Mercy');

        // count === 1 -> radio, not checkbox (single-select)
        expect(html).toContain('type="radio"');
        expect(html).not.toContain('type="checkbox"');
        expect(html).toContain('name="trait"');

        // Conviction (tier 5) must NOT leak into the tier-3 Aura pick
        expect(html).not.toContain('Conviction');
    });
});

describe('LevelUpManager.renderVowChoice — level 5/7/9 Vow pool (merged abilities.json + traits.json)', () => {
    it('renders all 5 candidates on first pick (Challenge, Reprisal, Intervene, Bolster, Conviction), checkbox-style', () => {
        const { elements, document: documentStub } = makeDocumentStub();
        globalThis.document = documentStub;

        const manager = new LevelUpManager();
        manager.abilitiesData = abilitiesData;
        manager.traitsData = traitsData;

        const character = { knownVows: [] };
        manager.renderVowChoice(character, vowChoice);

        expect(elements.vowChoiceCount.textContent).toBe('Choose 1 (optional)');

        const html = elements.vowChoiceList.innerHTML;
        expect((html.match(/data-choice-type="vow"/g) || []).length).toBe(5);
        ['challenge', 'reprisal', 'intervene', 'bolster', 'conviction'].forEach(id => {
            expect(html).toContain(`data-choice-id="${id}"`);
        });
        expect(html).toContain('Challenge');
        expect(html).toContain('Reprisal');
        expect(html).toContain('Intervene');
        expect(html).toContain('Bolster');
        expect(html).toContain('Conviction');
        expect(html).toContain('type="checkbox"');
    });

    it('excludes already-known Vows (abilities- and traits-sourced) from the pool', () => {
        const { elements, document: documentStub } = makeDocumentStub();
        globalThis.document = documentStub;

        const manager = new LevelUpManager();
        manager.abilitiesData = abilitiesData;
        manager.traitsData = traitsData;

        const character = { knownVows: ['challenge', 'conviction'] };
        manager.renderVowChoice(character, { ...vowChoice, required: true });

        expect(elements.vowChoiceCount.textContent).toBe('Choose 1 — Required');

        const html = elements.vowChoiceList.innerHTML;
        expect((html.match(/data-choice-type="vow"/g) || []).length).toBe(3);
        expect(html).not.toContain('data-choice-id="challenge"');
        expect(html).not.toContain('data-choice-id="conviction"');
        expect(html).toContain('data-choice-id="reprisal"');
        expect(html).toContain('data-choice-id="intervene"');
        expect(html).toContain('data-choice-id="bolster"');
    });

    it('does nothing (no throw) when the DOM section is missing', () => {
        const { elements, document: documentStub } = makeDocumentStub();
        delete elements.vowChoiceSection;
        delete elements.vowChoiceList;
        globalThis.document = documentStub;

        const manager = new LevelUpManager();
        manager.abilitiesData = abilitiesData;
        manager.traitsData = traitsData;

        expect(() => manager.renderVowChoice({ knownVows: [] }, vowChoice)).not.toThrow();
    });
});
