import { emptySlot, emptySlotTable } from './slotMetadata.js';

const STORAGE_PREFIX = 'nexus-verge-save-';
const METADATA_KEY = 'nexus-verge-metadata';

export class LocalSaveStore {
    constructor(version) {
        this.version = version;
    }

    async getSlots() {
        const stored = localStorage.getItem(METADATA_KEY);
        if (stored) {
            return JSON.parse(stored);
        }

        const slots = emptySlotTable(this.version);
        localStorage.setItem(METADATA_KEY, JSON.stringify(slots));
        return slots;
    }

    async read(slotId) {
        const stored = localStorage.getItem(`${STORAGE_PREFIX}${slotId}`);
        return stored ? JSON.parse(stored) : null;
    }

    async write(slotId, saveData, metadata) {
        localStorage.setItem(`${STORAGE_PREFIX}${slotId}`, JSON.stringify(saveData));

        const slots = await this.getSlots();
        slots[slotId] = metadata;
        localStorage.setItem(METADATA_KEY, JSON.stringify(slots));

        return { synced: true };
    }

    async remove(slotId) {
        localStorage.removeItem(`${STORAGE_PREFIX}${slotId}`);

        const slots = await this.getSlots();
        slots[slotId] = emptySlot(slotId, this.version);
        localStorage.setItem(METADATA_KEY, JSON.stringify(slots));

        return { synced: true };
    }
}
