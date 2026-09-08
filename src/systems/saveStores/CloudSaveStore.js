import { RULES } from '../../core/rulesEngine.js';
import { playerIdentity } from '../PlayerIdentity.js';
import { LocalSaveStore } from './LocalSaveStore.js';
import { emptySlotTable } from './slotMetadata.js';

export class CloudSaveStore {
    constructor(version, identity = playerIdentity) {
        this.version = version;
        this.identity = identity;
        this.cache = new LocalSaveStore(version);
        this.apiBaseUrl = RULES.saves.apiBaseUrl;
    }

    async request(path, options = {}) {
        return fetch(`${this.apiBaseUrl}${path}`, {
            ...options,
            headers: { ...options.headers, ...this.identity.authHeaders() }
        });
    }

    offlineWarning(action) {
        return this.identity.hasIdentity()
            ? `${action} on this device only — the cloud was unreachable.`
            : `${action} on this device only — set a player name to enable cloud saves.`;
    }

    async getSlots() {
        try {
            const response = await this.request('/saves');
            if (!response.ok) {
                throw new Error(`Slot list failed (${response.status})`);
            }

            const { slots } = await response.json();
            return { ...emptySlotTable(this.version), ...slots };
        } catch (error) {
            console.warn('Cloud slot list unavailable, using local cache:', error.message);
            return this.cache.getSlots();
        }
    }

    async read(slotId) {
        try {
            const response = await this.request(`/saves/${slotId}`);
            if (response.status === 404) {
                return null;
            }
            if (!response.ok) {
                throw new Error(`Slot read failed (${response.status})`);
            }
            return response.json();
        } catch (error) {
            console.warn(`Cloud read of slot ${slotId} failed, using local cache:`, error.message);
            return this.cache.read(slotId);
        }
    }

    async write(slotId, saveData, metadata) {
        await this.cache.write(slotId, saveData, metadata);

        try {
            const response = await this.request(`/saves/${slotId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ save: saveData, metadata })
            });
            if (!response.ok) {
                throw new Error(`Slot write failed (${response.status})`);
            }
            return { synced: true };
        } catch (error) {
            if (!RULES.saves.failSoftOnCloudWrite) {
                throw error;
            }
            return { synced: false, warning: this.offlineWarning('Saved') };
        }
    }

    async remove(slotId) {
        await this.cache.remove(slotId);

        try {
            const response = await this.request(`/saves/${slotId}`, { method: 'DELETE' });
            if (!response.ok) {
                throw new Error(`Slot delete failed (${response.status})`);
            }
            return { synced: true };
        } catch (error) {
            if (!RULES.saves.failSoftOnCloudWrite) {
                throw error;
            }
            return { synced: false, warning: this.offlineWarning('Deleted') };
        }
    }
}
