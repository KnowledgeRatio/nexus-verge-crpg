import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SettlementUI from '../../src/ui/SettlementUI.js';
import MapRenderer from '../../src/rendering/MapRenderer.js';
import { SettlementSceneUI } from '../../src/ui/SettlementSceneUI.js';

let ui, elements, services, options, view, restricted;

beforeEach(() => {
    restricted = true;
    services = Array.from({ length: 4 }, () => ({ hidden: false }));
    options = {
        buttons: [],
        appendChild(button) {
            this.buttons.push(button);
        },
        querySelectorAll() {
            return this.buttons;
        }
    };
    elements = {
        settlementModal: { querySelectorAll: () => services },
        hostileSettlementPanel: { hidden: true, querySelector: () => options },
        settlementSceneHost: { hidden: false }
    };
    view = {
        phase: 'hostile', name: 'Ashford', description: 'The gate is barred.',
        step: { name: 'A resident speaks', description: 'Help us.', npcName: 'Kestrel <Smith>' },
        options: [{ id: 'negotiate', label: 'Offer help', skill: 'influence', dc: 12 }],
        progress: { completed: 1, total: 3 }, remaining: 0, pendingCombat: false,
        lastResult: { message: 'The lookout is distracted.', total: 16, dc: 12 }
    };
    vi.stubGlobal('document', {
        getElementById: id => elements[id],
        querySelector: () => null,
        createElement: () => ({ addEventListener(event, handler) {
            this[event] = handler;
        } })
    });
    vi.stubGlobal('window', { game: { hostileSettlementManager: {
        isRestricted: () => restricted, getView: () => view
    } } });
    ui = Object.create(SettlementUI.prototype);
    ui.sceneUI = { hide: vi.fn() };
    ui.renderSettlementInfo = vi.fn();
    ui.showSettlementModal = vi.fn();
    ui.settlementManager = {
        currentSettlement: { id: 'ashford' }, performHostileAction: vi.fn().mockResolvedValue({})
    };
});

afterEach(() => vi.unstubAllGlobals());

it('replaces ordinary services with named dialogue, checks and persisted outcomes', async () => {
    expect(ui.renderHostileSettlement(ui.settlementManager.currentSettlement)).toBe(true);
    expect(services.every(element => element.hidden)).toBe(true);
    expect(elements.settlementSceneHost.hidden).toBe(true);
    expect(elements.hostileSettlementPanel.hidden).toBe(false);
    expect(elements.hostileSettlementPanel.innerHTML).toContain('expect combat');
    expect(elements.hostileSettlementPanel.innerHTML).toContain('Kestrel &lt;Smith&gt;');
    expect(elements.hostileSettlementPanel.innerHTML).toContain('Total 16 · DC 12');
    expect(options.buttons[0].textContent).toBe('Offer help (influence · DC 12)');
    await options.buttons[0].click();
    expect(ui.settlementManager.performHostileAction).toHaveBeenCalledExactlyOnceWith('negotiate');
    expect(ui.showSettlementModal).toHaveBeenCalledWith(ui.settlementManager.currentSettlement);
});

it('locks rebuilding work on the quest clock and explains long-rest timing', () => {
    view.phase = 'rebuilding';
    view.remaining = 1;
    ui.renderHostileSettlement(ui.settlementManager.currentSettlement);
    expect(options.buttons[0].disabled).toBe(true);
    expect(elements.hostileSettlementPanel.innerHTML).toContain('A long rest advances this clock');
    expect(elements.hostileSettlementPanel.innerHTML).toContain('Accepted urgent quests');
    expect(elements.hostileSettlementPanel.innerHTML).toContain('rebuilding projects');
});

it('restores service visibility after the final rebuilding project', () => {
    ui.renderHostileSettlement(ui.settlementManager.currentSettlement);
    restricted = false;
    expect(ui.renderHostileSettlement(ui.settlementManager.currentSettlement)).toBe(false);
    expect(services.every(element => !element.hidden)).toBe(true);
    expect(elements.hostileSettlementPanel.hidden).toBe(true);
});

it('prevents scene refresh and asynchronous building access while restricted', async () => {
    const map = { hidden: false };
    const scene = Object.create(SettlementSceneUI.prototype);
    Object.assign(scene, {
        host: { hidden: false }, button: {}, status: {}, map,
        settlement: ui.settlementManager.currentSettlement, generation: 0
    });
    await scene.refresh();
    expect(map.hidden).toBe(true);
    expect(scene.host.hidden).toBe(true);
    expect(scene.button.hidden).toBe(true);
});

it('distinguishes settlement phases with symbols as well as colour', () => {
    const renderer = Object.create(MapRenderer.prototype);
    Object.assign(renderer, {
        terrainTypes: [{ id: 'town', symbol: 'T', color: '#d4af37' }],
        drawTile: vi.fn(), drawRevealStateBadge: vi.fn(), drawProvisioningBadge: vi.fn()
    });
    for (const [phase, symbol] of [['hostile', 'map.hostile'], ['rebuilding', 'map.rebuilding'], ['restored', 'T']]) {
        renderer.renderFeature(0, 0, { type: 'settlement', hostileState: { phase } }, true, 1, 1);
        expect(renderer.drawTile.mock.lastCall[2]).toBe(symbol);
    }
    expect(new Set(renderer.drawTile.mock.calls.map(call => call[3])).size).toBe(3);
});
