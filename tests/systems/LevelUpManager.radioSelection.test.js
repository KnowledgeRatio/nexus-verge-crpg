/**
 * Regression test for a live bug (2026-08-07) in toggleChoiceSelection(): count === 1
 * ("radio") choices were routed through the same push/splice array logic as checkbox
 * (count > 1) choices, with no exclusivity enforcement. Native <input type="radio">
 * behavior visually unchecks the prior option when a new one in the same `name` group
 * is clicked, but currentSelections never cleared the old pick — so confirming could
 * apply a different option than the one the radio UI showed as selected.
 *
 * Built through real construction per project convention: real LevelUpManager, real
 * data/levelProgression.json choice definitions (the level-3 Oath `trait` choice,
 * count: 1), not a hand-built choice fixture.
 */

import { describe, it, expect } from 'vitest';
import LevelUpManager from '../../src/systems/LevelUpManager.js';
import levelProgressionData from '../../data/levelProgression.json' with { type: 'json' };

function makeChoiceElement(choiceType, choiceId) {
    const classes = new Set();
    const input = { checked: false };
    return {
        dataset: { choiceType, choiceId },
        classList: {
            add: (c) => classes.add(c),
            remove: (c) => classes.delete(c),
            contains: (c) => classes.has(c)
        },
        querySelector: () => input,
        _input: input
    };
}

function makeDocumentStub(choiceElements) {
    return {
        getElementById: () => null,
        querySelectorAll: (selector) => {
            const match = selector.match(/data-choice-type="([^"]+)"/);
            const type = match ? match[1] : null;
            return choiceElements.filter(el => el.dataset.choiceType === type);
        }
    };
}

describe('LevelUpManager.toggleChoiceSelection — radio (count === 1) exclusivity', () => {
    it('replaces the prior selection instead of accumulating it, using the real level-3 trait choice', () => {
        const manager = new LevelUpManager();
        manager.progressionData = levelProgressionData;
        manager.availableChoices = manager.getAvailableChoices('dedication', 3);
        manager.validateAndUpdateUI = () => {};

        const traitChoice = manager.availableChoices.find(c => c.type === 'trait');
        expect(traitChoice.count).toBe(1); // sanity check we grabbed a real radio-style choice

        const optionA = makeChoiceElement('trait', 'auraA');
        const optionB = makeChoiceElement('trait', 'auraB');
        globalThis.document = makeDocumentStub([optionA, optionB]);

        manager.toggleChoiceSelection(optionA);
        expect(manager.currentSelections.traits).toEqual(['auraA']);
        expect(optionA.classList.contains('selected')).toBe(true);
        expect(optionA._input.checked).toBe(true);

        manager.toggleChoiceSelection(optionB);

        // The bug: this stayed ['auraA'] because count===1 choices went through the
        // checkbox branch, where currentCount (1) >= maxCount (1) blocked the push.
        expect(manager.currentSelections.traits).toEqual(['auraB']);
        expect(optionB.classList.contains('selected')).toBe(true);
        expect(optionB._input.checked).toBe(true);

        // Prior option's visual state is cleared to match what the radio UI shows.
        expect(optionA.classList.contains('selected')).toBe(false);
        expect(optionA._input.checked).toBe(false);
    });

    it('leaves checkbox (count > 1) choices unaffected — multi-select still accumulates', () => {
        const manager = new LevelUpManager();
        manager.progressionData = levelProgressionData;
        manager.availableChoices = manager.getAvailableChoices('dedication', 3);
        manager.validateAndUpdateUI = () => {};

        const tacticChoice = manager.availableChoices.find(c => c.type === 'tactic');
        expect(tacticChoice.count).toBeGreaterThan(1);

        const optionA = makeChoiceElement('tactic', 'tacticA');
        const optionB = makeChoiceElement('tactic', 'tacticB');
        globalThis.document = makeDocumentStub([optionA, optionB]);

        manager.toggleChoiceSelection(optionA);
        manager.toggleChoiceSelection(optionB);
        expect(manager.currentSelections.tactics).toEqual(['tacticA', 'tacticB']);

        // Deselecting one leaves the other intact.
        manager.toggleChoiceSelection(optionA);
        expect(manager.currentSelections.tactics).toEqual(['tacticB']);
    });
});
