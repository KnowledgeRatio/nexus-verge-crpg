import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';
import { escapeAttribute } from '../../src/utils/combatNumberFormat.js';
import MapRenderer from '../../src/rendering/MapRenderer.js';
import { formatQuestReputation } from '../../src/ui/SettlementUI.js';

const source = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const extract = name => {
    const [, parameters, body] = source.match(new RegExp(` {4}${name}\\(([^)]*)\\) \\{([\\s\\S]*?)\\n {4}\\}`));
    return new Function('gameState', 'RULES', 'escapeAttribute', 'isRichQuest', 'consequenceManager', 'formatQuestReputation',
        `return function(${parameters}) {${body}}`)(gameState, RULES, escapeAttribute, () => false, {}, formatQuestReputation);
};
const methods = Object.fromEntries(['trackQuest', 'questGuidanceText', 'refreshQuestTracking',
    'renderQuestCard', 'renderWorldMap', 'setupQuestSystem', 'setupWorldMap'].map(name => [name, extract(name)]));
const originalTracking = RULES.quests.tracking;
const guidance = navigation => ({ questId: 'quest-1', questName: 'A missing courier', stage: 'objective',
    objectiveId: 'search-1', objectiveText: 'Search for the courier', intelQuality: 'medium', navigation });
const area = { type: 'area', minX: 64, minY: 128, maxX: 128, maxY: 192, label: 'Last known area' };
const quest = { id: 'quest-1', name: 'A missing courier', description: 'Find the courier.',
    objectives: [{ description: 'Search', count: 1 }], distanceTiles: 917, dungeonHookId: 'secret-target' };

function context() {
    return Object.fromEntries(['save', 'restore', 'beginPath', 'rect', 'clip', 'fillRect', 'strokeRect',
        'setLineDash', 'moveTo', 'lineTo', 'closePath', 'stroke', 'arc', 'fill'].map(name => [name, vi.fn()]));
}
function panel() {
    const children = Object.fromEntries(['name', 'objective', 'location'].map(name => [`.quest-tracking-${name}`, {}]));
    return { hidden: true, querySelector: selector => children[selector], children };
}

beforeEach(() => {
    gameState.reset();
    RULES.quests.tracking = { enabled: true };
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', { querySelectorAll: () => [], querySelector: () => null,
        getElementById: () => null, addEventListener: vi.fn() });
});
afterEach(() => {
    RULES.quests.tracking = originalTracking;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('quest journal and HUD tracking', () => {
    it('shows Track/Untrack and toggles a single manager-owned quest', () => {
        let current = null;
        const ui = { ...methods, questManager: { getTrackedQuestGuidance: () => current,
            setTrackedQuest: vi.fn(id => {
                current = id ? guidance(area) : null;
                return true;
            }) },
        refreshQuestTracking: vi.fn(), renderCurrentQuestTab: vi.fn() };
        expect(ui.renderQuestCard(quest, 'active')).toContain('aria-pressed="false">Track');
        ui.trackQuest('quest-1');
        const html = ui.renderQuestCard(quest, 'active');
        expect(html).toContain('aria-pressed="true">Untrack');
        expect(html).toContain('search the marked area');
        expect(html).not.toContain('917');
        expect(html).not.toContain('secret-target');
        ui.trackQuest('quest-1');
        expect(ui.questManager.setTrackedQuest).toHaveBeenLastCalledWith(null);
        expect(ui.renderQuestCard(quest, 'active')).toContain('aria-pressed="false">Track');
    });

    it('hides tracking buttons when disabled and clears HUD after the quest ends', () => {
        let current = guidance(area);
        const hud = panel();
        document.querySelectorAll = () => [hud];
        const ui = { ...methods, questManager: { getTrackedQuestGuidance: () => current,
            refreshTrackingIntel: vi.fn() } };
        ui.refreshQuestTracking();
        expect(hud.hidden).toBe(false);
        expect(hud.children['.quest-tracking-objective'].textContent).toBe('Search for the courier');
        current = null;
        ui.refreshQuestTracking();
        expect(hud.hidden).toBe(true);
        expect(hud.children['.quest-tracking-location'].textContent).toBe('');
        RULES.quests.tracking.enabled = false;
        expect(ui.renderQuestCard(quest, 'active')).not.toContain('data-action="track"');
    });

    it('escapes authored guidance in journal HTML and writes literal text to HUD', () => {
        const current = guidance({ type: 'unknown', label: '<img src=x onerror=alert(1)>' });
        const hud = panel();
        document.querySelectorAll = () => [hud];
        const ui = { ...methods, questManager: { getTrackedQuestGuidance: () => current } };
        expect(ui.renderQuestCard(quest, 'active')).not.toContain('<img');
        expect(ui.renderQuestCard(quest, 'active')).toContain('&lt;img');
        ui.refreshQuestTracking();
        expect(hud.children['.quest-tracking-location'].textContent).toBe(current.navigation.label);
    });

    it('does not manufacture coordinates or player-relative directions from lower-quality intel', () => {
        expect(methods.questGuidanceText(guidance(area))).not.toMatch(/64|128|192/);
        const text = methods.questGuidanceText(guidance({ type: 'direction', originX: 8, originY: 14,
            bearing: 'NW', label: 'Reported NW of Haven' }));
        expect(text).toBe('Reported NW of Haven');
        expect(text).not.toMatch(/8|14|917/);
        expect(methods.questGuidanceText(guidance({ type: 'unknown', label: 'Location unknown' })))
            .toBe('Location unknown');
    });

    it('guards reentrant refresh and installs quest observers only once', () => {
        const ui = { ...methods, updateQuestCounts: vi.fn(), renderCurrentQuestTab: vi.fn(),
            questManager: { getTrackedQuestGuidance: () => null } };
        ui.questManager.refreshTrackingIntel = vi.fn(() => ui.refreshQuestTracking());
        const subscribe = vi.spyOn(gameState, 'subscribe').mockReturnValue(() => {});
        ui.setupQuestSystem();
        ui.setupQuestSystem();
        expect(subscribe.mock.calls.map(([path]) => path)).toEqual(['quests', 'world', '*']);
        expect(ui.questManager.refreshTrackingIntel).toHaveBeenCalledTimes(2);
    });
});

describe('quest map overlays', () => {
    const view = { scaleX: 2, scaleY: 2, offsetX: -100, offsetY: -200, width: 400, height: 300 };

    it('draws exclusive search bounds without a center pin', () => {
        const ctx = context();
        MapRenderer.prototype.drawQuestGuidance(ctx, guidance(area), view);
        expect(ctx.strokeRect).toHaveBeenCalledWith(28, 56, 128, 128);
        expect(ctx.setLineDash).toHaveBeenCalledWith([6, 4]);
        expect(ctx.moveTo).not.toHaveBeenCalled();
    });

    it('draws a known exact entrance only, with no world lookup or reveal', () => {
        const ctx = context();
        const vm = guidance({ type: 'exact', x: 75, y: 140, label: 'Entrance' });
        const before = JSON.stringify(vm);
        MapRenderer.prototype.drawQuestGuidance(ctx, vm, view);
        expect(ctx.moveTo).toHaveBeenCalledWith(51, 76);
        expect(ctx.strokeRect).not.toHaveBeenCalled();
        expect(JSON.stringify(vm)).toBe(before);
    });

    it('draws direction from its frozen issuer origin without a target pin', () => {
        const ctx = context();
        MapRenderer.prototype.drawQuestGuidance(ctx, guidance({ type: 'direction', originX: 75, originY: 140,
            bearing: 'N', label: 'North of town' }), view);
        expect(ctx.moveTo).toHaveBeenNthCalledWith(1, 51, 81);
        expect(ctx.lineTo).toHaveBeenNthCalledWith(1, 51, 57);
        expect(ctx.closePath).not.toHaveBeenCalled();
        expect(ctx.strokeRect).not.toHaveBeenCalled();
    });

    it('draws nothing for unknown or disabled guidance', () => {
        const ctx = context();
        MapRenderer.prototype.drawQuestGuidance(ctx, guidance({ type: 'unknown', label: 'Unknown' }), view);
        RULES.quests.tracking.enabled = false;
        MapRenderer.prototype.drawQuestGuidance(ctx, guidance(area), view);
        expect(ctx.save).not.toHaveBeenCalled();
    });

    it('draws briefing overlays over fog on world map without exposing terrain or features', () => {
        const tile = { terrain: 'mountain', explored: false, visible: false,
            feature: { type: 'poi', resolvedType: 'dungeon' } };
        gameState.set('world', { generatedRegions: new Map([['0,0', { tiles: [tile] }]]) });
        gameState.set('player.position', null);
        const canvas = { parentElement: { clientWidth: 400, clientHeight: 300 } };
        document.getElementById = id => id === 'worldMapCanvas' ? canvas : null;
        const ctx = context();
        const ui = { ...methods, worldMapCtx: ctx, worldMapZoom: 2, worldMapOffsetX: -100, worldMapOffsetY: -200,
            getTerrainColor: vi.fn(), questManager: { getTrackedQuestGuidance: () => guidance(area) },
            mapRenderer: { drawQuestGuidance: MapRenderer.prototype.drawQuestGuidance } };
        const before = JSON.stringify(tile);
        ui.renderWorldMap();
        expect(ui.getTerrainColor).not.toHaveBeenCalled();
        expect(ctx.strokeRect).toHaveBeenCalledWith(28, 56, 128, 128);
        expect(JSON.stringify(tile)).toBe(before);
    });

    it('keeps local terrain and POI hidden while painting disclosed entrance guidance above fog', async () => {
        const tile = { x: 0, y: 0, terrain: 'mountain', explored: false, visible: false,
            feature: { type: 'poi', resolvedType: 'dungeon', provisioning: { cueId: 'secret' } } };
        const renderer = Object.create(MapRenderer.prototype);
        renderer.ctx = context();
        renderer.canvas = { width: 32, height: 32 };
        renderer.config = { tileWidth: 32, tileHeight: 32, viewportWidth: 1, viewportHeight: 1 };
        renderer.loadTerrainData = vi.fn();
        renderer.clear = vi.fn();
        renderer.centerOn = vi.fn(() => {
            renderer.cameraX = 0;
            renderer.cameraY = 0;
        });
        renderer.getTileAt = vi.fn(() => tile);
        renderer.isNearPlayer = () => false;
        renderer.drawTile = vi.fn();
        renderer.renderFeature = vi.fn();
        window.questManager = { getTrackedQuestGuidance: () => guidance({
            type: 'exact', x: 0, y: 0, label: 'Reported entrance'
        }) };
        const before = JSON.stringify(tile);
        await renderer.renderWorld({ tiles: [tile] }, { x: 10, y: 10 });
        expect(renderer.drawTile).toHaveBeenCalledWith(0, 0, ' ', '#000000', '#000000');
        expect(renderer.renderFeature).not.toHaveBeenCalled();
        expect(renderer.ctx.stroke).toHaveBeenCalledOnce();
        expect(JSON.stringify(tile)).toBe(before);
    });

    it('renders guidance without regenerating compressed saved regions', () => {
        const region = { exploredTiles: [{ x: 2, y: 3, explored: true }], modifiedTiles: [] };
        gameState.set('world', { generatedRegions: new Map([['0,0', region]]) });
        gameState.set('player.position', null);
        const canvas = { parentElement: { clientWidth: 400, clientHeight: 300 } };
        document.getElementById = id => id === 'worldMapCanvas' ? canvas : null;
        const ctx = context();
        const ui = { ...methods, worldMapCtx: ctx, worldMapZoom: 2, worldMapOffsetX: -100, worldMapOffsetY: -200,
            getTerrainColor: vi.fn(), questManager: { getTrackedQuestGuidance: () => guidance(area) },
            mapRenderer: { drawQuestGuidance: MapRenderer.prototype.drawQuestGuidance } };
        const before = JSON.stringify(region);
        expect(() => ui.renderWorldMap()).not.toThrow();
        expect(ui.getTerrainColor).not.toHaveBeenCalled();
        expect(ctx.strokeRect).toHaveBeenCalledWith(28, 56, 128, 128);
        expect(JSON.stringify(region)).toBe(before);
    });
});

describe('world map pointer navigation', () => {
    it.each(['mouse', 'touch'])('pans with %s, captures the active pointer and releases on cancellation', pointerType => {
        const listeners = {};
        const canvas = {
            getContext: () => ({}),
            addEventListener: (name, listener) => {
                listeners[name] = listener;
            },
            setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn()
        };
        document.getElementById = id => id === 'worldMapCanvas' ? canvas : null;
        const ui = { ...methods, renderWorldMap: vi.fn() };
        ui.setupWorldMap();
        const pointer = (id, x, y, button = 0) => ({ pointerType, pointerId: id, clientX: x, clientY: y,
            button, preventDefault: vi.fn() });
        listeners.pointerdown(pointer(1, 200, 300));
        expect(canvas.setPointerCapture).toHaveBeenCalledWith(1);
        listeners.pointermove(pointer(1, 50, 100));
        expect([ui.worldMapOffsetX, ui.worldMapOffsetY]).toEqual([-150, -200]);
        expect(ui.renderWorldMap).toHaveBeenCalledOnce();
        listeners.pointerdown(pointer(2, 400, 500));
        listeners.pointermove(pointer(2, 600, 700));
        expect([ui.worldMapOffsetX, ui.worldMapOffsetY]).toEqual([-150, -200]);
        listeners.pointercancel(pointer(1, 50, 100));
        expect(canvas.releasePointerCapture).toHaveBeenCalledWith(1);
        expect(ui.worldMapDragging).toBe(false);
        listeners.pointermove(pointer(1, 0, 0));
        expect(ui.renderWorldMap).toHaveBeenCalledOnce();
        listeners.pointerdown(pointer(3, 0, 0, 2));
        expect(ui.worldMapPointerId).toBeNull();
        listeners.wheel({ deltaY: -1, preventDefault: vi.fn() });
        expect(ui.worldMapZoom).toBe(5);
    });
});
