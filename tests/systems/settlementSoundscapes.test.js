import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadSettlementSoundscapes, prepareSettlementSoundscapes, resolveSettlementSoundscape } from '../../src/systems/SettlementSoundscapes.js';
import WorldGenerator from '../../src/systems/WorldGenerator.js';
import SettlementManager from '../../src/systems/SettlementManager.js';
import saveManager from '../../src/systems/SaveManager.js';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';

const mix = (id, extra = {}) => ({ id, label: id, tracks: [{ url: `${id}.wav`, volume: 0.3 }], ...extra });
const catalogue = { version: 1,
    buildings: { tavern: [mix('tavern-a'), mix('tavern-b')] },
    exteriors: { village: [mix('village-a'), mix('village-b')], town: [mix('town-a')], city: [mix('city-a')] }
};
const clone = value => JSON.parse(JSON.stringify(value));
const settlement = (x = 1) => ({ id: `${x},2`, x, y: 2, name: 'Crossing', settlementType: 'village', npcs: [] });

describe('persistent settlement soundscapes', () => {
    let state;
    let enabled;
    beforeEach(() => {
        state = gameState.data;
        enabled = RULES.settlementSoundscapes.enabled;
        RULES.settlementSoundscapes.enabled = true;
        gameState.data = { seed: 'sound', worldConfig: { campaignId: 'core' }, ui: {}, player: {}, world: {
            settlements: [], npcs: new Map(), generatedRegions: new Map()
        } };
        vi.stubGlobal('window', {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.stubGlobal('fetch', vi.fn(async path => ({ ok: true,
            json: async () => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')) })));
    });
    afterEach(() => {
        gameState.data = state;
        RULES.settlementSoundscapes.enabled = enabled;
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('uses isolated seeded choices independent of catalogue and visit ordering', () => {
        const random = vi.spyOn(Math, 'random');
        const original = Array.from({ length: 30 }, (_, x) => settlement(x));
        const reverse = clone(original).reverse();
        const reordered = clone(catalogue);
        reordered.buildings.tavern.reverse();
        reordered.exteriors.village.reverse();
        original.forEach(site => prepareSettlementSoundscapes(site, { seed: 'sound', catalogue }));
        reverse.forEach(site => prepareSettlementSoundscapes(site, { seed: 'sound', catalogue: reordered }));
        expect(reverse.reverse()).toEqual(original);
        expect(new Set(original.map(site => site.soundscapes.buildings.tavern)).size).toBe(2);
        expect(new Set(original.map(site => site.soundscapes.exteriorMixId)).size).toBe(2);
        expect(random).not.toHaveBeenCalled();
    });

    it('matches settlement size and pins versions against pool expansion', () => {
        const site = { ...settlement(), settlementType: 'city' };
        prepareSettlementSoundscapes(site, { seed: 'sound', catalogue });
        expect(site.soundscapes.exteriorMixId).toBe('city-a');
        const before = clone(site);
        const expanded = clone(catalogue);
        expanded.version = 2;
        expanded.exteriors.city.push(mix('city-new', { introducedVersion: 2 }));
        expanded.buildings.tavern.push(mix('tavern-new', { introducedVersion: 2 }));
        prepareSettlementSoundscapes(site, { seed: 'sound', catalogue: expanded });
        expect(site).toEqual(before);
        expect(resolveSettlementSoundscape(expanded, site).mixes.map(entry => entry.id)).toEqual(['city-a', 'city-new']);
        expect(resolveSettlementSoundscape(expanded, site).initialMixId).toBe('city-a');
        const unvisited = settlement(4);
        prepareSettlementSoundscapes(unvisited, { seed: 'sound', catalogue: expanded, catalogueVersion: 1 });
        expect(unvisited.soundscapes.buildings.tavern).not.toBe('tavern-new');
    });

    it('uses represented cultures outdoors and the relevant building roster indoors', () => {
        const expanded = clone(catalogue);
        expanded.version = 2;
        const music = [mix('kethara-song', { introducedVersion: 2, cultureIds: ['kethara'] }),
            mix('vaethori-song', { introducedVersion: 2, cultureIds: ['vaethori'] })];
        expanded.exteriors.town.push(...music);
        expanded.buildings.tavern.push(...music);
        const site = { ...settlement(), settlementType: 'town', npcs: [
            { culture: 'kethara', building: 'tavern' }, { culture: 'vaethori', building: 'greathall' }
        ] };
        prepareSettlementSoundscapes(site, { seed: 'sound', catalogue: expanded, catalogueVersion: 1 });
        const receipt = clone(site.soundscapes);
        expect(resolveSettlementSoundscape(expanded, site).mixes.map(entry => entry.id))
            .toEqual(['kethara-song', 'town-a', 'vaethori-song']);
        expect(resolveSettlementSoundscape(expanded, site, 'tavern').mixes.map(entry => entry.id))
            .toEqual(['kethara-song', 'tavern-a', 'tavern-b']);
        expect(site.soundscapes).toEqual(receipt);
        expect(receipt.exteriorMixId).toBe('town-a');
        site.npcs = [{ culture: null, building: 'tavern' }];
        expect(resolveSettlementSoundscape(expanded, site).mixes.map(entry => entry.id)).toEqual(['town-a']);
    });

    it('defers cultural default selection until the roster exists and preserves incompatible saved IDs', () => {
        const expanded = { version: 2, buildings: { tavern: [mix('kethara-song', { cultureIds: ['kethara'], introducedVersion: 2 })] },
            exteriors: { village: [] } };
        const site = settlement();
        prepareSettlementSoundscapes(site, { seed: 'sound', catalogue: expanded });
        expect(site.soundscapes.catalogueVersion).toBe(2);
        expect(site.soundscapes.buildings.tavern).toBeUndefined();
        const restored = clone(site);
        restored.npcs = [{ building: 'tavern', culture: 'kethara' }];
        prepareSettlementSoundscapes(restored, { seed: 'sound', catalogue: expanded });
        expect(restored.soundscapes.buildings.tavern).toBe('kethara-song');
        restored.npcs[0].culture = 'vaethori';
        expanded.buildings.tavern.push(mix('plain-room'));
        const before = clone(restored);
        prepareSettlementSoundscapes(restored, { seed: 'sound', catalogue: expanded });
        expect(resolveSettlementSoundscape(expanded, restored, 'tavern').initialMixId).toBe('plain-room');
        expect(restored).toEqual(before);
    });

    it('keeps private saved IDs through public fallback, empty pools and restoration', () => {
        const site = settlement();
        site.soundscapes = { schemaVersion: 1, catalogueVersion: 1,
            exteriorMixId: 'private-square', buildings: { tavern: 'private-tavern' } };
        const before = clone(site);
        const publicCatalogue = { ...catalogue, exteriors: { village: [] } };
        prepareSettlementSoundscapes(site, { seed: 'sound', catalogue: publicCatalogue });
        expect(resolveSettlementSoundscape(publicCatalogue, site, 'tavern').initialMixId).toBe('tavern-a');
        expect(resolveSettlementSoundscape(publicCatalogue, site)).toEqual({ mixes: [], initialMixId: null });
        expect(site).toEqual(before);
        const privateCatalogue = clone(catalogue);
        privateCatalogue.exteriors.village.push(mix('private-square'));
        privateCatalogue.buildings.tavern.push(mix('private-tavern'));
        expect(resolveSettlementSoundscape(privateCatalogue, site).initialMixId).toBe('private-square');
        expect(resolveSettlementSoundscape(privateCatalogue, site, 'tavern').initialMixId).toBe('private-tavern');
    });

    it('prepares metadata with art disabled and restores the same receipt through actual save/load', async () => {
        const world = new WorldGenerator('sound', { campaignId: 'core' });
        world.worldMetadata.settlements = [settlement(), settlement(3)];
        const rng = vi.spyOn(world.baseRNG, 'next');
        const artEnabled = RULES.buildingPresentation.proceduralPeople.enabled;
        RULES.buildingPresentation.proceduralPeople.enabled = false;
        try {
            await world.prepareSettlementPresentation(world.worldMetadata.settlements);
        } finally {
            RULES.buildingPresentation.proceduralPeople.enabled = artEnabled;
        }
        const site = world.worldMetadata.settlements[0];
        expect(site.soundscapes.exteriorMixId).toBeTruthy();
        expect(site.soundscapes.buildings.tavern).toBeTruthy();
        expect(rng).not.toHaveBeenCalled();
        const manager = new SettlementManager();
        manager._persistSettlement(site);
        const saved = JSON.parse(JSON.stringify(saveManager.serializeGameState()));
        saveManager.deserializeGameState(saved);
        const restored = settlement();
        manager._restoreSettlementFromPersistent(restored);
        await manager._prepareSoundscapes(restored);
        manager._persistSettlement(restored);
        expect(restored.soundscapes).toEqual(site.soundscapes);
        expect(gameState.get('world.metadata.settlements')[0].soundscapes).toEqual(site.soundscapes);
    });

    it('does not load data or create receipts when disabled', async () => {
        RULES.settlementSoundscapes.enabled = false;
        const world = new WorldGenerator('sound');
        const site = settlement();
        await world.prepareSettlementSoundscapes([site]);
        await new SettlementManager()._prepareSoundscapes(site);
        expect(site.soundscapes).toBeUndefined();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('filters campaign-specific mixes at load time', async () => {
        fetch.mockImplementation(async path => ({ ok: true, json: async () =>
            path === 'data/settlementSoundscapes.json'
                ? { version: 1, village: [mix('shared', { campaignIds: ['core'] }), mix('exclusive', { campaignIds: ['sound-test'] })] }
                : { tavern: { ambience: [mix('shared', { campaignIds: ['core'] }), mix('exclusive', { campaignIds: ['sound-test'] })] } }
        }));
        const filtered = await loadSettlementSoundscapes('sound-test');
        expect(filtered.buildings.tavern.map(entry => entry.id)).toEqual(['exclusive']);
        expect(filtered.exteriors.village.map(entry => entry.id)).toEqual(['exclusive']);
    });
});
