import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SettlementSceneUI } from '../../src/ui/SettlementSceneUI.js';
import { gameState } from '../../src/core/GameState.js';

const control = vi.hoisted(() => ({ instances: [], ready: null }));
vi.mock('../../src/rendering/SettlementScene.js', () => ({ SettlementScene: class {
    constructor(host, options) {
        this.options = options;
        this.ready = control.ready || Promise.resolve();
        this.dispose = vi.fn();
        this.setActive = vi.fn();
        control.instances.push(this);
    }
} }));

let elements, ui, manager, media;
beforeEach(() => {
    control.instances = []; control.ready = null;
    const element = () => ({ hidden: false, textContent: '', addEventListener: vi.fn(), setAttribute: vi.fn() });
    elements = Object.fromEntries(['settlementSceneHost', 'settlementSceneToggle', 'settlementSceneStatus', 'map']
        .map(id => [id, element()]));
    media = { matches: false, addEventListener: vi.fn() };
    vi.stubGlobal('document', { getElementById: id => elements[id], querySelector: () => elements.map });
    vi.stubGlobal('window', { matchMedia: () => media });
    manager = { currentSettlement: { id: 'village-a' }, enterBuilding: vi.fn() };
    ui = new SettlementSceneUI({ settlementManager: manager });
    ui.settlement = manager.currentSettlement;
});
afterEach(() => {
    vi.unstubAllGlobals(); vi.restoreAllMocks();
});

it('uses the current character and actual building route, pausing for interiors', async () => {
    await ui.refresh();
    const scene = control.instances[0];
    expect(scene.options.character).toBe(gameState.get('character'));
    expect(elements.map.hidden).toBe(true);
    scene.options.onEnter('merchant');
    expect(manager.enterBuilding).toHaveBeenCalledWith('merchant');
    ui.setActive(false);
    expect(scene.setActive).toHaveBeenLastCalledWith(false);
    scene.options.onEnter('tavern');
    expect(manager.enterBuilding).toHaveBeenCalledTimes(1);
    ui.setActive(true);
    expect(scene.setActive).toHaveBeenLastCalledWith(true);
});

it('keeps service access and rejects stale entry after an in-flight scene is closed', async () => {
    let finish;
    control.ready = new Promise(resolve => {
        finish = resolve;
    });
    const loading = ui.refresh();
    await vi.waitFor(() => expect(control.instances).toHaveLength(1));
    expect(elements.map.hidden).toBe(false);
    ui.hide(); finish(); await loading;
    expect(control.instances[0].dispose).toHaveBeenCalled();
    control.instances[0].options.onEnter('merchant');
    expect(manager.enterBuilding).not.toHaveBeenCalled();
    expect(elements.map.hidden).toBe(false);
});

it('restores services on rendering failure and does not load 3D on mobile', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await ui.refresh();
    control.instances[0].options.onError(new Error('context lost'));
    expect(elements.map.hidden).toBe(false);
    expect(elements.settlementSceneHost.hidden).toBe(true);
    expect(elements.settlementSceneStatus.textContent).toContain('services');
    media.matches = true;
    await ui.refresh();
    expect(control.instances).toHaveLength(1);
    expect(elements.settlementSceneToggle.disabled).toBe(true);
});
