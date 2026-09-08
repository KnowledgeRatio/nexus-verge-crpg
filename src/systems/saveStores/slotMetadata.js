import { RULES } from '../../core/rulesEngine.js';

export function emptySlot(slotId, version) {
    return {
        slotId,
        isEmpty: true,
        characterName: null,
        level: null,
        location: null,
        playtime: 0,
        timestamp: null,
        seed: null,
        version
    };
}

export function emptySlotTable(version) {
    const slots = {};
    for (let i = 1; i <= RULES.saves.maxSlots; i++) {
        slots[i] = emptySlot(i, version);
    }
    return slots;
}
