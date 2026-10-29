import { afterEach, expect, it, vi } from 'vitest';
import { mountSettlementAmbience } from '../../src/ui/SettlementAmbience.js';
import { loadSettlementSoundscapes, resolveSettlementSoundscape } from '../../src/systems/SettlementSoundscapes.js';
import { mountBuildingAmbience } from '../../src/ui/BuildingAmbience.js';

vi.mock('../../src/systems/SettlementSoundscapes.js', () => ({
    loadSettlementSoundscapes: vi.fn(), resolveSettlementSoundscape: vi.fn()
}));
vi.mock('../../src/ui/BuildingAmbience.js', () => ({ mountBuildingAmbience: vi.fn() }));

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

it('discards a pending square mount when the player enters a building before loading finishes', async () => {
    vi.stubGlobal('window', { AbortController: globalThis.AbortController });
    let finish;
    loadSettlementSoundscapes.mockReturnValue(new Promise(resolve => finish = resolve));
    const host = { isConnected: true, append: vi.fn() };
    const mounted = mountSettlementAmbience(host, { settlementType: 'village' });
    mounted.dispose();
    finish({});
    await mounted.ready;
    expect(host.append).not.toHaveBeenCalled();
    expect(mountBuildingAmbience).not.toHaveBeenCalled();
});

it('uses the saved square mix and aborts audio and removes controls on exit', async () => {
    vi.stubGlobal('window', { AbortController: globalThis.AbortController });
    const controls = { setAttribute: vi.fn(), remove: vi.fn() };
    vi.stubGlobal('document', { createElement: () => controls });
    const selection = { mixes: [{ id: 'city-street' }], initialMixId: 'city-street' };
    loadSettlementSoundscapes.mockResolvedValue({});
    resolveSettlementSoundscape.mockReturnValue(selection);
    const host = { isConnected: true, append: vi.fn() };
    const mounted = mountSettlementAmbience(host, { settlementType: 'city' });
    await mounted.ready;
    const [target, mixes, signal, options] = mountBuildingAmbience.mock.calls[0];
    expect(target).toBe(controls);
    expect(mixes).toBe(selection.mixes);
    expect(options).toEqual({ initialMixId: 'city-street', levelLabelText: 'Ambience level' });
    expect(signal.aborted).toBe(false);
    mounted.dispose();
    expect(signal.aborted).toBe(true);
    expect(controls.remove).toHaveBeenCalledOnce();
});

it('omits square controls when public packaging removes all private mixes', async () => {
    vi.stubGlobal('window', { AbortController: globalThis.AbortController });
    loadSettlementSoundscapes.mockResolvedValue({});
    resolveSettlementSoundscape.mockReturnValue({ mixes: [], initialMixId: null });
    const host = { isConnected: true, append: vi.fn() };
    const mounted = mountSettlementAmbience(host, { settlementType: 'town' });
    await mounted.ready;
    expect(host.append).not.toHaveBeenCalled();
    expect(mountBuildingAmbience).not.toHaveBeenCalled();
    mounted.dispose();
});
