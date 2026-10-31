import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import SkillChallengeManager from '../../src/systems/SkillChallengeManager.js';

afterEach(() => vi.unstubAllGlobals());

describe('social scene handoff', () => {
    it('sends authored presentation with every social update', () => {
        const presentation = { image: 'parley.jpg', alt: 'A road barrier.' };
        const manager = new SkillChallengeManager();
        manager.currentChallenge = { tree: { presentation, tensionThreshold: 80 }, context: {} };
        manager.getCurrentNode = () => ({ choices: [] });
        manager.getAvailableChoices = () => [];
        const dispatchEvent = vi.fn();
        vi.stubGlobal('window', { dispatchEvent });
        vi.stubGlobal('CustomEvent', class {
            constructor(type, options) {
                this.type = type;
                this.detail = options.detail;
            }
        });
        manager.renderChallenge();
        expect(dispatchEvent.mock.calls[0][0].detail.presentation).toBe(presentation);
    });

    it('mounts scene art in the separate social modal without replacing its choices', () => {
        const source = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
        const body = source.match(/ {4}renderSocialChallenge\(detail\) \{([\s\S]*?)\n {4}\}/)[1];
        const modal = { classList: { add: vi.fn() } };
        const mount = vi.fn();
        const render = new Function('document', 'mountChallengeScene', `return function(detail) {${body}}`)(
            { getElementById: id => id === 'socialChallengeModal' ? modal : null }, mount);
        const ui = { renderConversationHistory: vi.fn(), renderSocialChoices: vi.fn() };
        const detail = { presentation: { image: 'parley.jpg', alt: 'Barrier' }, context: {},
            tension: 1, tensionThreshold: 80, history: [], choices: [], node: {} };
        render.call(ui, detail);
        expect(mount).toHaveBeenCalledWith(modal, { presentation: detail.presentation }, detail.context);
        expect(ui.renderSocialChoices).toHaveBeenCalledWith(detail.choices);
    });
});
