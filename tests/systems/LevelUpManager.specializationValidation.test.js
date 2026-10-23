import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import LevelUpManager from '../../src/systems/LevelUpManager.js';
import Character from '../../src/systems/Character.js';
import { gameState } from '../../src/core/GameState.js';

const progressionData = JSON.parse(readFileSync(new URL('../../data/levelProgression.json', import.meta.url), 'utf8'));
const classesData = JSON.parse(readFileSync(new URL('../../data/classes.json', import.meta.url), 'utf8'));

describe('Level-three specialization confirmation', () => {
    let manager;
    let confirmButton;
    let hint;

    beforeEach(() => {
        confirmButton = { disabled: true };
        hint = { textContent: '' };
        const sections = {
            tacticChoiceSection: { style: {} },
            traitChoiceSection: { style: {}, querySelectorAll: () => [] }
        };
        vi.stubGlobal('document', {
            getElementById: id => ({ confirmLevelUpBtn: confirmButton, levelUpHint: hint, ...sections })[id] || null,
            querySelectorAll: () => []
        });
        manager = new LevelUpManager();
        manager.progressionData = progressionData;
        manager.availableChoices = manager.getAvailableChoices('dedication', 3);
        manager.currentSelections.asiChoice = 'prowess';
    });

    afterEach(() => {
        gameState.set('character', null);
        vi.unstubAllGlobals();
    });

    function select(type, id) {
        const classes = new Set();
        const input = { checked: false };
        manager.toggleChoiceSelection({
            dataset: { choiceType: type, choiceId: id },
            classList: {
                add: value => classes.add(value),
                remove: value => classes.delete(value),
                contains: value => classes.has(value)
            },
            querySelector: () => input
        });
    }

    it('requires a specialization before confirmation', () => {
        manager.validateAndUpdateUI();
        expect(confirmButton.disabled).toBe(true);
        expect(hint.textContent).toBe('Select a Choose Specialization');
    });

    it('enables Exemplar confirmation only after all three tactics are selected', () => {
        select('specialization', 'exemplar');
        expect(confirmButton.disabled).toBe(true);
        expect(hint.textContent).toBe('Choose 3 tactics (0/3 selected)');

        select('tactic', 'precisionStrike');
        select('tactic', 'tripAttack');
        expect(confirmButton.disabled).toBe(true);
        select('tactic', 'parry');

        expect(confirmButton.disabled).toBe(false);
        expect(hint.textContent).toBe('Ready to level up!');
        expect(manager.currentSelections.traits).toEqual([]);
    });

    it('enables Oath confirmation only after an aura is selected', () => {
        select('specialization', 'oath');
        expect(confirmButton.disabled).toBe(true);
        expect(hint.textContent).toBe('Select 1 Choose an Aura(s)');

        select('trait', 'aura_of_sanctuary');
        expect(confirmButton.disabled).toBe(false);
        expect(hint.textContent).toBe('Ready to level up!');
        expect(manager.currentSelections.tactics).toEqual([]);
    });

    it('still requires an attribute increase after specialization choices are complete', () => {
        select('specialization', 'oath');
        select('trait', 'aura_of_sanctuary');
        manager.currentSelections.asiChoice = null;
        manager.validateAndUpdateUI();
        expect(confirmButton.disabled).toBe(true);
        expect(hint.textContent).toBe('Select an ability score to increase');
    });

    it('clears choices from the previous specialization when switching paths', () => {
        select('specialization', 'exemplar');
        ['precisionStrike', 'tripAttack', 'parry'].forEach(id => select('tactic', id));
        select('specialization', 'oath');
        expect(manager.currentSelections.tactics).toEqual([]);
        expect(confirmButton.disabled).toBe(true);
        select('trait', 'aura_of_sanctuary');
        select('specialization', 'exemplar');
        expect(manager.currentSelections.traits).toEqual([]);
        expect(confirmButton.disabled).toBe(true);
        expect(hint.textContent).toBe('Choose 3 tactics (0/3 selected)');
    });

    it.each(['exemplar', 'oath'])('confirms and preserves %s choices after restoring a pending level-up', specialization => {
        const created = new Character({
            name: 'Knight', class: classesData.classes.find(entry => entry.id === 'dedication'),
            level: 2, baseAbilities: { prowess: 14, resilience: 14 },
            species: { id: 'test', speed: 30, abilityScoreIncrease: {} }
        });
        created.levelUp(3);
        const restored = Character.fromJSON(JSON.parse(JSON.stringify(created.toJSON())));
        gameState.set('character', restored);
        const priorProwess = restored.baseAbilities.prowess;
        manager.modal = { classList: { remove: vi.fn() } };
        vi.stubGlobal('window', { game: { updateHUD: vi.fn() } });

        select('specialization', specialization);
        if (specialization === 'exemplar') {
            ['precisionStrike', 'tripAttack', 'parry'].forEach(id => select('tactic', id));
        } else {
            select('trait', 'aura_of_sanctuary');
        }
        expect(confirmButton.disabled).toBe(false);
        manager.confirmLevelUp();

        const saved = JSON.parse(JSON.stringify(gameState.get('character').toJSON()));
        expect(saved.level).toBe(3);
        expect(saved.specialization).toBe(specialization);
        expect(saved.pendingLevelUp).toBeNull();
        expect(saved.baseAbilities.prowess).toBe(priorProwess + 1);
        if (specialization === 'exemplar') {
            expect(saved.knownTactics).toEqual(['precisionStrike', 'tripAttack', 'parry']);
            expect(restored.resolvePoints).toBe(restored.maxResolvePoints);
            expect(restored.maxResolvePoints).toBeGreaterThan(0);
        } else {
            expect(saved.selectedTraits).toContain('aura_of_sanctuary');
            expect(saved.knownTactics).toEqual([]);
        }
        expect(manager.modal.classList.remove).toHaveBeenCalledWith('active');
        expect(window.game.updateHUD).toHaveBeenCalledWith(restored);
    });
});
