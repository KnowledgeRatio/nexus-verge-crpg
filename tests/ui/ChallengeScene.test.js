import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountChallengeScene, resolveChallengeScene } from '../../src/ui/ChallengeScene.js';
import { RULES } from '../../src/core/rulesEngine.js';
import { gameState } from '../../src/core/GameState.js';

function element() {
    return {
        children: [], hidden: false,
        appendChild(child) {
            this.children.push(child);
        },
        insertBefore(child) {
            this.children.unshift(child);
            child.remove = () => this.children.splice(this.children.indexOf(child), 1);
        },
        querySelector(selector) {
            if (selector === '.challenge-scene') {
                return this.children.find(child => child.className === 'challenge-scene') || null;
            }
            return this;
        }
    };
}

afterEach(() => vi.unstubAllGlobals());

describe('challenge scene presentation', () => {
    it('mounts into the social container when standard modal hosts are absent', () => {
        vi.stubGlobal('document', { createElement: () => element() });
        const host = element();
        const modal = { querySelector: selector => selector.includes('.social-challenge-container') ? host : null };
        mountChallengeScene(modal, { presentation: { image: 'parley.jpg', alt: 'Barrier' } });
        expect(host.children).toHaveLength(1);
    });

    it('selects authored terrain variants and keeps a usable default for unknown contexts', () => {
        const challenge = { presentation: { image: 'default.jpg', alt: 'Default', variants: [
            { terrains: ['snowForest'], image: 'snow.jpg', alt: 'Snow' },
            { terrains: ['jungle'], image: 'invalid.jpg' }
        ] } };
        expect(resolveChallengeScene(challenge, { terrainType: 'snowForest' }).image).toBe('snow.jpg');
        expect(resolveChallengeScene(challenge, { terrainType: 'jungle' }).image).toBe('default.jpg');
        expect(resolveChallengeScene(challenge).image).toBe('default.jpg');
    });

    it('preserves indoor/outdoor alternatives and uses the same variant in the mounted image', () => {
        vi.stubGlobal('document', { createElement: () => element() });
        const saved = gameState.data;
        const challenge = { presentation: { image: 'search.jpg', alt: 'Search', variants: [
            { environment: 'dungeon', image: 'chamber.jpg', alt: 'Chamber' }
        ] } };
        try {
            gameState.data = { dungeon: { active: true } };
            expect(resolveChallengeScene(challenge).image).toBe('chamber.jpg');
            const modal = element();
            mountChallengeScene(modal, challenge);
            expect(modal.children[0].children[0].src).toBe('chamber.jpg');
            gameState.data.dungeon.active = false;
            expect(resolveChallengeScene(challenge).image).toBe('search.jpg');
        } finally {
            gameState.data = saved;
        }
    });

    it('omits environment-specific art when the same challenge occurs in a different setting', () => {
        vi.stubGlobal('document', { createElement: () => element() });
        const saved = gameState.data;
        const modal = element();
        const challenge = { presentation: { image: 'data/graphics/challenge-ruin-v1.png', alt: 'Chamber', environment: 'dungeon' } };
        try {
            gameState.data = { dungeon: { active: false } };
            mountChallengeScene(modal, challenge);
            expect(modal.children).toHaveLength(0);
            gameState.data.dungeon.active = true;
            mountChallengeScene(modal, challenge);
            expect(modal.children).toHaveLength(1);
            challenge.presentation.environment = 'outdoors';
            mountChallengeScene(modal, challenge);
            expect(modal.children).toHaveLength(0);
        } finally {
            gameState.data = saved;
        }
    });

    it('keeps art hidden until loaded, with accessible description and graceful failure', () => {
        vi.stubGlobal('document', { createElement: () => element() });
        const modal = element();
        mountChallengeScene(modal, { presentation: { image: 'data/graphics/challenge-door-v1.png', alt: 'A closed iron-bound door.' } });
        const figure = modal.children[0];
        const image = figure.children[0];
        expect(figure.hidden).toBe(true);
        expect(image.alt).toBe('A closed iron-bound door.');
        image.onload();
        expect(figure.hidden).toBe(false);
        image.onerror();
        expect(figure.hidden).toBe(true);
    });

    it('removes previous art when the next check has no art or presentation is disabled', () => {
        vi.stubGlobal('document', { createElement: () => element() });
        const modal = element();
        const challenge = { presentation: { image: 'data/graphics/challenge-door-v1.png', alt: 'Door' } };
        mountChallengeScene(modal, challenge);
        const previous = modal.children[0];
        mountChallengeScene(modal, null);
        previous.children[0].onload();
        expect(modal.children).toHaveLength(0);
        const enabled = RULES.skillChallenges.presentation.enabled;
        try {
            RULES.skillChallenges.presentation.enabled = false;
            mountChallengeScene(modal, challenge);
            expect(modal.children).toHaveLength(0);
        } finally {
            RULES.skillChallenges.presentation.enabled = enabled;
        }
    });
});
