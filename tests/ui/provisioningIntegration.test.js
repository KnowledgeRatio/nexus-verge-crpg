import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';
import Player from '../../src/systems/Player.js';
import MapRenderer from '../../src/rendering/MapRenderer.js';

vi.mock('../../src/systems/AudioManager.js', () => ({ default: {} }));
const source = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const body = source.match(/ {4}async promptProvisioning\(\) \{([\s\S]*?)\n {4}\}/)[1];
const rest = { closeRestMenu: vi.fn(), openRestMenu: vi.fn() };
const promptProvisioning = new Function('gameState', 'RULES', 'restManager',
    `return async function() {${body}}`)(gameState, RULES, rest);

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

describe('provisioning integration', () => {
    it('synchronizes a revealed saved tile copy with canonical opportunity state', async () => {
        const canonical = { id: '2,3', x: 2, y: 3, type: 'poi', resolvedType: 'sanctuary',
            poiType: 'camp', provisioning: { id: '2,3', cueId: 'tracks', attempt: null } };
        const tileCopy = { ...canonical };
        gameState.set('world.metadata', { features: [canonical] });
        const player = Object.create(Player.prototype);
        player.x = 2;
        player.y = 3;
        player.worldGenerator = { getTile: async () => ({ feature: tileCopy }) };
        await player._revealPoiAtPlayerPosition();
        expect(canonical.type).toBe('sanctuary');
        expect(canonical.provisioning.attempt).toBeNull();
        expect(player.worldGenerator.worldMetadata).toBe(gameState.get('world.metadata'));
    });

    it('previews without spending, and guards confirmation against a different loaded run', async () => {
        const metadata = { features: [] };
        gameState.set('world.metadata', metadata);
        gameState.set('player.position', { x: 2, y: 3 });
        const attempt = vi.fn(() => ({ attempted: true }));
        const ui = { provisioningManager: {
            getOpportunityAtPosition: () => ({ canAttempt: true, siteId: '2,3',
                cue: { title: 'Tracks', description: 'Fresh tracks.' },
                challenge: { skillId: 'survival', attribute: 'intuition', dc: 12 } }), attempt
        }, promptSkillCheck: vi.fn(async config => {
            expect(attempt).not.toHaveBeenCalled();
            gameState.set('world.metadata', { features: [] });
            expect(config.resolveAttempt()).toEqual({ attempted: false });
        }) };
        await promptProvisioning.call(ui);
        expect(attempt).not.toHaveBeenCalled();
        expect(rest.openRestMenu).not.toHaveBeenCalled();
    });

    it('keeps cancellation free and explicitly defers odds until the fatigue charge', async () => {
        gameState.set('world.metadata', { features: [] });
        gameState.set('player.position', { x: 2, y: 3 });
        const attempt = vi.fn();
        const ui = { provisioningManager: {
            getOpportunityAtPosition: () => ({ canAttempt: true, siteId: '2,3',
                cue: { title: 'Tracks', description: 'Fresh tracks.' },
                challenge: { skillId: 'survival', attribute: 'intuition', dc: 12 } }), attempt
        }, promptSkillCheck: vi.fn(async config => {
            expect(config.deferRollPreview).toBe(true);
            return { attempted: false };
        }) };
        await promptProvisioning.call(ui);
        expect(attempt).not.toHaveBeenCalled();
        expect(rest.openRestMenu).toHaveBeenCalledOnce();
    });

    it('conceals provisioning markers on ambiguous or non-visible sites', () => {
        const ctx = { save: vi.fn(), restore: vi.fn(), fillText: vi.fn() };
        const renderer = { ctx, config: { tileWidth: 32, tileHeight: 32 } };
        window.game = { provisioningManager: {
            getOpportunityAtPosition: () => ({ status: 'available' }),
            data: { marker: { symbol: '+', color: '#a8d67f' } }
        } };
        MapRenderer.prototype.drawProvisioningBadge.call(renderer, 0, 0, { type: 'poi' }, true);
        MapRenderer.prototype.drawProvisioningBadge.call(renderer, 0, 0, { type: 'sanctuary' }, false);
        expect(ctx.fillText).not.toHaveBeenCalled();
        MapRenderer.prototype.drawProvisioningBadge.call(renderer, 0, 0, { type: 'sanctuary' }, true);
        expect(ctx.fillText).toHaveBeenCalledOnce();
    });
});
