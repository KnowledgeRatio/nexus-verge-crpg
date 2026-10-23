import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';
import Player from '../../src/systems/Player.js';
import MapRenderer from '../../src/rendering/MapRenderer.js';

vi.mock('../../src/systems/AudioManager.js', () => ({ default: {} }));
const source = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const rest = { closeRestMenu: vi.fn(), openRestMenu: vi.fn() };
const extractMethod = name => {
    const body = source.match(new RegExp(` {4}(?:async )?${name}\\([^)]*\\) \\{([\\s\\S]*?)\\n {4}\\}`))[1];
    return new Function('gameState', 'RULES', 'restManager',
        `return async function(action) {${body}}`)(gameState, RULES, rest);
};
const promptProvisioning = extractMethod('promptProvisioning');
const quickMenuAction = extractMethod('handleQuickMenuAction');
const feature = { type: 'provisioning', renderLayer: 'overlay', x: 20, y: 30 };
const cue = { title: 'Edible plants', description: 'Leaves grow nearby.',
    marker: { symbol: '%', color: '#a8d67f' } };

beforeEach(() => {
    gameState.reset();
    vi.stubGlobal('window', {});
    rest.closeRestMenu.mockClear();
    rest.openRestMenu.mockClear();
});
afterEach(() => {
    gameState.reset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('wilderness supply presentation', () => {
    function rendererFixture() {
        const paint = [];
        const renderer = Object.create(MapRenderer.prototype);
        renderer.config = { tileWidth: 32, tileHeight: 32 };
        renderer.ctx = { save: vi.fn(), restore: vi.fn(), strokeText: vi.fn(),
            fillText: vi.fn(() => paint.push('object')) };
        renderer.terrainMap = new Map([['grassland', { symbol: '.', color: '#abc' }]]);
        renderer.getTileImage = vi.fn(() => ({ width: 32, height: 32 }));
        renderer.getTerrainImageOptions = vi.fn();
        renderer.drawImageTile = vi.fn(() => paint.push('terrain'));
        renderer.drawTerrainTransitions = vi.fn(() => paint.push('transition'));
        renderer.drawTile = vi.fn(() => paint.push('ascii'));
        renderer.isNearPlayer = vi.fn(() => false);
        window.game = { provisioningManager: {
            getOpportunityAtPosition: () => ({ feature, cue, status: 'available' })
        } };
        return { renderer, paint };
    }

    it.each([16, 24, 32, 48])('paints terrain before the data marker at %i-pixel zoom', size => {
        const { renderer, paint } = rendererFixture();
        renderer.config = { tileWidth: size, tileHeight: size };
        renderer.renderTile(2, 3, { terrain: 'grassland', visible: true, feature }, {}, {});
        expect(paint).toEqual(['terrain', 'transition', 'object']);
        expect(renderer.ctx.fillText).toHaveBeenCalledWith('%', 2.5 * size, 3.5 * size);
    });

    it('preserves ASCII terrain under the marker when art is unavailable', () => {
        const { renderer, paint } = rendererFixture();
        renderer.getTileImage.mockReturnValue(null);
        renderer.renderTile(0, 0, { terrain: 'grassland', visible: true, feature }, {}, {});
        expect(paint).toEqual(['ascii', 'object']);
    });

    it.each([false, true])('conceals objects outside visibility (explored=%s)', explored => {
        const { renderer } = rendererFixture();
        renderer.renderTile(0, 0, { terrain: 'grassland', explored, feature }, {}, {});
        expect(renderer.ctx.fillText).not.toHaveBeenCalled();
    });

    it('dims a spent marker using canonical status rather than a stale tile receipt', () => {
        const { renderer } = rendererFixture();
        window.game.provisioningManager.getOpportunityAtPosition = () => ({
            feature: { ...feature, provisioning: { attempt: { status: 'failure' } } }, cue, status: 'failure'
        });
        renderer.renderFeatureOverlay(0, 0, feature, true);
        expect(renderer.ctx.globalAlpha).toBe(0.4);
        expect(renderer.ctx.fillText).toHaveBeenCalledOnce();
    });
});

describe('wilderness supply interaction', () => {
    function promptFixture(overrides = {}) {
        gameState.set('world.metadata', { features: [feature] });
        gameState.set('player.position', { x: 20, y: 30 });
        const opportunity = { feature, cue, status: 'available', canAttempt: true, siteId: '20,30',
            challenge: { skillId: 'survival', attribute: 'intuition', dc: 12 }, ...overrides };
        const ui = { provisioningManager: {
            getOpportunityAtPosition: vi.fn(() => opportunity),
            attempt: vi.fn(() => ({ attempted: true, success: true }))
        }, promptSkillCheck: vi.fn(async () => ({ attempted: false })) };
        return ui;
    }

    it('routes keyboard E and touch Interact through the same wilderness prompt', async () => {
        const ui = promptFixture();
        ui.promptProvisioning = vi.fn(() => promptProvisioning.call(ui));
        window.game = ui;
        const player = Object.create(Player.prototype);
        player.x = 20;
        player.y = 30;
        player.handleInput({ key: 'e' });
        await vi.waitFor(() => expect(ui.promptSkillCheck).toHaveBeenCalledOnce());
        const hide = vi.fn();
        vi.stubGlobal('document', { querySelector: () => null,
            getElementById: () => ({ classList: { add: hide } }) });
        await quickMenuAction.call({ player }, 'interact');
        await vi.waitFor(() => expect(ui.promptSkillCheck).toHaveBeenCalledTimes(2));
        expect(hide).toHaveBeenCalledWith('hidden');
        expect(rest.openRestMenu).not.toHaveBeenCalled();
        expect(rest.closeRestMenu).not.toHaveBeenCalled();
        expect(ui.provisioningManager.attempt).not.toHaveBeenCalled();
    });

    it.each(['full', 'spent'])('explains %s sources without opening a roll or spending', async reason => {
        const ui = promptFixture({ canAttempt: false, reason });
        const messages = vi.spyOn(gameState, 'addMessage');
        await promptProvisioning.call(ui);
        expect(messages).toHaveBeenCalledWith(expect.stringContaining(reason), 'info');
        expect(ui.promptSkillCheck).not.toHaveBeenCalled();
        expect(ui.provisioningManager.attempt).not.toHaveBeenCalled();
        expect(rest.openRestMenu).not.toHaveBeenCalled();
    });

    it('confirms gathering through the shared resolver without granting shelter UI', async () => {
        const ui = promptFixture();
        ui.promptSkillCheck.mockImplementation(async config => config.resolveAttempt());
        await promptProvisioning.call(ui);
        expect(ui.provisioningManager.attempt).toHaveBeenCalledWith('20,30');
        expect(rest.openRestMenu).not.toHaveBeenCalled();
    });

    it('keeps wilderness encounter accumulation active on gathering tiles', () => {
        const player = Object.create(Player.prototype);
        player.checkForEncounters({ feature }, { movementCost: 1, encounterModifier: 1 });
        expect(gameState.get('player.encounterAccumulator')).toBe(1);
    });
});
