/**
 * Practice rank system (2026-08-07): character.practices stays a flat string[] — rank is
 * just occurrence count, not a new field. getFilteredPractices() must exclude a practice
 * only once its known rank reaches maxRank (defaulting to 1, so Forgecraft/Hearthcraft's
 * exclude-if-known behavior is unchanged).
 *
 * Built through real construction: real LevelUpManager, real data/practices.json.
 */

import { describe, it, expect, afterEach } from 'vitest';
import LevelUpManager from '../../src/systems/LevelUpManager.js';
import { gameState } from '../../src/core/GameState.js';
import practicesData from '../../data/practices.json' with { type: 'json' };

function makeManager() {
    const manager = new LevelUpManager();
    manager.practicesData = practicesData;
    return manager;
}

describe('LevelUpManager.getFilteredPractices — rank-aware filtering', () => {
    afterEach(() => {
        gameState.set('character', null);
    });

    it('excludes a maxRank:1 practice (e.g. forgecraft) once known — unchanged behavior', () => {
        gameState.set('character', { practices: ['forgecraft'] });
        const manager = makeManager();

        const practices = manager.getFilteredPractices('dedication');

        expect(practices.some(p => p.id === 'forgecraft')).toBe(false);
    });

    it('still offers a maxRank:2 practice (foraging) at rank 1', () => {
        gameState.set('character', { practices: ['foraging'] });
        const manager = makeManager();

        const practices = manager.getFilteredPractices('dedication');

        expect(practices.some(p => p.id === 'foraging')).toBe(true);
    });

    it('excludes a maxRank:2 practice once known at rank 2', () => {
        gameState.set('character', { practices: ['foraging', 'foraging'] });
        const manager = makeManager();

        const practices = manager.getFilteredPractices('dedication');

        expect(practices.some(p => p.id === 'foraging')).toBe(false);
    });

    it('offers a maxRank:2 practice at rank 0 (not yet known)', () => {
        gameState.set('character', { practices: [] });
        const manager = makeManager();

        const practices = manager.getFilteredPractices('dedication');

        expect(practices.some(p => p.id === 'foraging')).toBe(true);
        expect(practices.some(p => p.id === 'trading')).toBe(true);
    });
});

describe('LevelUpManager.renderPracticeChoice — rank label', () => {
    afterEach(() => {
        gameState.set('character', null);
        delete globalThis.document;
    });

    function makeDocumentStub() {
        const elements = {
            practiceChoiceSection: { style: {} },
            practiceChoiceList: { innerHTML: '' },
            practiceChoiceCount: { textContent: '' }
        };
        globalThis.document = {
            getElementById: (id) => elements[id]
        };
        return elements;
    }

    it('labels an already-known multi-rank practice with its pending rank', () => {
        gameState.set('character', { practices: ['foraging'] });
        const manager = makeManager();
        const elements = makeDocumentStub();

        manager.renderPracticeChoice({ class: { id: 'dedication' }, practices: ['foraging'] }, { count: 1, required: true });

        expect(elements.practiceChoiceList.innerHTML).toContain('Foraging (Rank 2)');
    });

    it('does not add a rank label for a not-yet-known practice', () => {
        gameState.set('character', { practices: [] });
        const manager = makeManager();
        const elements = makeDocumentStub();

        manager.renderPracticeChoice({ class: { id: 'dedication' }, practices: [] }, { count: 1, required: true });

        expect(elements.practiceChoiceList.innerHTML).toContain('>Foraging<');
        expect(elements.practiceChoiceList.innerHTML).not.toContain('Rank');
    });
});
