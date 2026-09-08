import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalSaveStore } from '../../src/systems/saveStores/LocalSaveStore.js';
import { CloudSaveStore } from '../../src/systems/saveStores/CloudSaveStore.js';

const VERSION = '1.0.0';

function installLocalStorage() {
    const data = new Map();
    globalThis.localStorage = {
        getItem: key => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: key => data.delete(key)
    };
}

const identity = {
    hasIdentity: () => true,
    authHeaders: () => ({ Authorization: 'Bearer NV-TEST', 'X-Player-Name': 'tester' })
};

const SAVE = { version: VERSION, seed: 'abc', character: { name: 'Gil' } };
const META = { slotId: 1, isEmpty: false, characterName: 'Gil', level: 3 };

beforeEach(() => {
    installLocalStorage();
    vi.restoreAllMocks();
});

describe('LocalSaveStore', () => {
    it('round-trips a save and its metadata', async () => {
        const store = new LocalSaveStore(VERSION);

        await store.write(1, SAVE, META);

        expect(await store.read(1)).toEqual(SAVE);
        expect((await store.getSlots())[1]).toEqual(META);
    });

    it('starts with every slot empty', async () => {
        const slots = await new LocalSaveStore(VERSION).getSlots();

        expect(Object.keys(slots)).toHaveLength(5);
        expect(Object.values(slots).every(slot => slot.isEmpty)).toBe(true);
    });

    it('marks a slot empty again after removal', async () => {
        const store = new LocalSaveStore(VERSION);
        await store.write(2, SAVE, { ...META, slotId: 2 });

        await store.remove(2);

        expect(await store.read(2)).toBeNull();
        expect((await store.getSlots())[2].isEmpty).toBe(true);
    });
});

describe('CloudSaveStore', () => {
    it('writes through to the local cache and reports a sync', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        const store = new CloudSaveStore(VERSION, identity);

        const result = await store.write(1, SAVE, META);

        expect(result.synced).toBe(true);
        expect(await store.cache.read(1)).toEqual(SAVE);
    });

    it('keeps the save locally when the cloud write fails', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline'));
        const store = new CloudSaveStore(VERSION, identity);

        const result = await store.write(1, SAVE, META);

        expect(result.synced).toBe(false);
        expect(result.warning).toMatch(/this device only/);
        expect(await store.cache.read(1)).toEqual(SAVE);
    });

    it('falls back to the cached save when the cloud read fails', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        const store = new CloudSaveStore(VERSION, identity);
        await store.write(1, SAVE, META);

        globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline'));

        expect(await store.read(1)).toEqual(SAVE);
    });

    it('treats a 404 as an empty slot rather than an error', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });

        expect(await new CloudSaveStore(VERSION, identity).read(3)).toBeNull();
    });

    it('fills unlisted slots with empty placeholders', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ slots: { 1: META } })
        });

        const slots = await new CloudSaveStore(VERSION, identity).getSlots();

        expect(Object.keys(slots)).toHaveLength(5);
        expect(slots[1]).toEqual(META);
        expect(slots[4].isEmpty).toBe(true);
    });

    it('sends the recovery code and player name on every request', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ slots: {} }) });
        globalThis.fetch = fetchMock;

        await new CloudSaveStore(VERSION, identity).getSlots();

        const [, options] = fetchMock.mock.calls[0];
        expect(options.headers.Authorization).toBe('Bearer NV-TEST');
        expect(options.headers['X-Player-Name']).toBe('tester');
    });
});
