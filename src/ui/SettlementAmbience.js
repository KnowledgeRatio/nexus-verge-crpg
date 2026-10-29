import { mountBuildingAmbience } from './BuildingAmbience.js';
import { loadSettlementSoundscapes, resolveSettlementSoundscape } from '../systems/SettlementSoundscapes.js';
import { RULES } from '../core/rulesEngine.js';

export function mountSettlementAmbience(host, settlement, { campaignId } = {}) {
    const lifetime = new window.AbortController();
    let controls;
    const dispose = () => {
        lifetime.abort();
        controls?.remove();
    };
    const ready = (async () => {
        if (!RULES.settlementSoundscapes?.enabled) {
            return;
        }
        try {
            const catalogue = await loadSettlementSoundscapes(campaignId);
            if (lifetime.signal.aborted || !host.isConnected) {
                return;
            }
            const { mixes, initialMixId } = resolveSettlementSoundscape(catalogue, settlement);
            if (!mixes.length) {
                return;
            }
            controls = document.createElement('div');
            controls.className = 'settlement-ambience';
            controls.setAttribute('role', 'group');
            controls.setAttribute('aria-label', 'Settlement ambience');
            mountBuildingAmbience(controls, mixes, lifetime.signal, { initialMixId, levelLabelText: 'Ambience level' });
            host.append(controls);
        } catch {
            dispose();
        }
    })();
    return { ready, dispose };
}
