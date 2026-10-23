import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gameState } from '../../src/core/GameState.js';
import SettlementUI from '../../src/ui/SettlementUI.js';

describe('levelled quest stakes', () => {
    let ui;
    let quest;
    beforeEach(() => {
        gameState.reset();
        ui = Object.create(SettlementUI.prototype);
        quest = {
            offeredLevel: 5, status: 'available', deadlineDuration: 4,
            actions: [{ skillId: 'craft', label: 'Repair the torn packaging', dc: 14 }],
            resolutions: [{ effects: [{ description: 'Supplies return to the shop.' }] }],
            failureEffects: [{ description: 'The missing supplies become scarce.' }]
        };
        vi.stubGlobal('window', { questManager: { getQuestDeadlineState: vi.fn(() => ({ remaining: 2 })) } });
    });
    afterEach(() => vi.unstubAllGlobals());

    it('advertises the clock and consequences before acceptance', () => {
        const html = ui.renderQuestStakes(quest);
        expect(html).toContain('Level 5 commission');
        expect(html).toContain('4 long rests after acceptance');
        expect(html).toContain('DC 14');
        expect(html).toContain('Supplies return to the shop.');
        expect(html).toContain('The missing supplies become scarce.');
        expect(html).toContain('half the commission');
    });
    it('shows the remaining accepted clock and the return protection', () => {
        quest.status = 'active';
        expect(ui.renderQuestStakes(quest)).toContain('2 long rests remaining');
        window.questManager.getQuestDeadlineState.mockReturnValue({ suspended: true });
        expect(ui.renderQuestStakes(quest)).toContain('deadline is paused for your return');
    });
    it('keeps ordinary offers untimed and escapes outcome prose', () => {
        quest.deadlineDuration = null;
        quest.resolutions[0].effects[0].description = '<img src=x onerror=bad()> & stock';
        const html = ui.renderQuestStakes(quest);
        expect(html).toContain('No deadline.');
        expect(html).not.toContain('If the deadline expires');
        expect(html).not.toContain('<img');
        expect(html).toContain('&lt;img');
    });
    it('preserves presentation of old saved quests', () => {
        expect(ui.renderQuestStakes({ name: 'Old quest' })).toBe('');
    });
});
