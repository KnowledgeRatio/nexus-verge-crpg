import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { assignBuildingPeople, prepareBuildingPresentation, resolveBuildingPresentation, loadBuildingPresentation } from '../../src/systems/BuildingPresentation.js';
import WorldGenerator from '../../src/systems/WorldGenerator.js';
import SettlementManager from '../../src/systems/SettlementManager.js';
import saveManager from '../../src/systems/SaveManager.js';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';
import { selectBuildingInterior } from '../../src/ui/BuildingInteriorArt.js';

const clone = value => JSON.parse(JSON.stringify(value));
const catalogue = {
    version: 1,
    interiors: { tavern: { legacyVariantIds: ['one', 'two'], variants: ['one', 'two'].map(id => ({
        id, people: [{ id: 'keeper', roles: ['innkeeper'], profile: 'standing' },
            { id: 'patron', roles: ['patron'], profile: 'seated' }]
    })) } },
    people: [{ id: 'keeper-a', roles: ['innkeeper'], profiles: ['standing'], image: 'a.png' },
        { id: 'keeper-b', roles: ['innkeeper'], profiles: ['standing'], image: 'b.png' },
        { id: 'patron-a', roles: ['patron'], profiles: ['seated'], image: 'c.png' }]
};
const town = (x = 1) => ({ x, y: 2, npcs: [
    { id: 'keeper', role: 'innkeeper', building: 'tavern' },
    { id: 'guest', role: 'patron', building: 'tavern' }
] });

describe('building presentation receipts', () => {
    let state;
    let enabled;
    let soundscapesEnabled;
    beforeEach(() => {
        state = gameState.data;
        enabled = RULES.buildingPresentation.proceduralPeople.enabled;
        soundscapesEnabled = RULES.settlementSoundscapes.enabled;
        RULES.settlementSoundscapes.enabled = false;
        gameState.data = { seed: 'rooms', worldConfig: { campaignId: 'core' }, ui: {}, player: {},
            world: { settlements: [], npcs: new Map(), generatedRegions: new Map() } };
        vi.stubGlobal('window', {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.stubGlobal('fetch', vi.fn(async path => ({ ok: true,
            json: async () => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')) })));
    });
    afterEach(() => {
        gameState.data = state;
        RULES.buildingPresentation.proceduralPeople.enabled = enabled;
        RULES.settlementSoundscapes.enabled = soundscapesEnabled;
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('is independent of pool, NPC and visit ordering and does not use Math.random', () => {
        const random = vi.spyOn(Math, 'random');
        const forward = [town(1), town(2)];
        const reversed = clone(forward).reverse();
        const reordered = clone(catalogue);
        reordered.people.reverse();
        reordered.interiors.tavern.variants.reverse();
        for (const settlement of forward) {
            prepareBuildingPresentation(settlement, { seed: 'rooms', catalogue });
            assignBuildingPeople(settlement, catalogue);
        }
        for (const settlement of reversed) {
            settlement.npcs.reverse();
            prepareBuildingPresentation(settlement, { seed: 'rooms', catalogue: reordered });
            assignBuildingPeople(settlement, reordered);
            settlement.npcs.reverse();
        }
        expect(reversed.reverse()).toEqual(forward);
        expect(random).not.toHaveBeenCalled();
    });

    it('pins unvisited and saved assignments against later catalogue additions', () => {
        const settlement = town();
        prepareBuildingPresentation(settlement, { seed: 'rooms', catalogue });
        const expanded = clone(catalogue);
        expanded.version = 2;
        expanded.people.push({ id: 'new', roles: ['innkeeper'], profiles: ['standing'], introducedVersion: 2 });
        expanded.interiors.tavern.variants.push({ id: 'new-room', introducedVersion: 2 });
        const original = clone(settlement);
        assignBuildingPeople(original, catalogue);
        prepareBuildingPresentation(settlement, { seed: 'rooms', catalogue: expanded });
        assignBuildingPeople(settlement, expanded);
        expect(settlement).toEqual(original);
        expanded.people.reverse();
        assignBuildingPeople(settlement, expanded);
        expect(settlement).toEqual(original);
    });

    it('does not duplicate cutouts or relax pose constraints when pools are exhausted', () => {
        const settlement = town();
        settlement.npcs.push({ id: 'guest2', role: 'patron', building: 'tavern' });
        const crowded = clone(catalogue);
        for (const room of crowded.interiors.tavern.variants) {
            room.people.push({ id: 'patron2', roles: ['patron'], profile: 'seated' });
        }
        prepareBuildingPresentation(settlement, { seed: 'rooms', catalogue: crowded });
        assignBuildingPeople(settlement, crowded);
        const scene = resolveBuildingPresentation(crowded, 'tavern', settlement);
        expect(scene.people).toHaveLength(2);
        expect(settlement.npcs.find(npc => npc.id === 'guest2').buildingAppearance.artworkId).toBeNull();
        const before = clone(settlement);
        resolveBuildingPresentation(crowded, 'tavern', settlement);
        expect(settlement).toEqual(before);
    });

    it('preserves the normal old-save room hash and stores a repair for retired IDs', () => {
        const settlement = town();
        const old = selectBuildingInterior(catalogue.interiors, 'tavern', { ...settlement, id: '1,2' });
        prepareBuildingPresentation(settlement, { seed: 'rooms', catalogue, legacy: true });
        expect(settlement.buildingPresentation.buildings.tavern.roomId).toBe(old.id);
        assignBuildingPeople(settlement, catalogue);
        settlement.npcs[0].buildingAppearance.artworkId = 'retired';
        assignBuildingPeople(settlement, catalogue);
        expect(settlement.npcs[0].buildingAppearance.artworkId).not.toBe('retired');
        const repaired = clone(settlement);
        assignBuildingPeople(settlement, catalogue);
        expect(settlement).toEqual(repaired);
    });

    it('prepares real finite settlement metadata without changing layout or gameplay RNG', async () => {
        const first = new WorldGenerator('rooms', { mapSize: 'small', campaignId: 'core' });
        await first.preGenerateSettlements();
        const layout = clone(first.worldMetadata.settlements);
        const rng = vi.spyOn(first.baseRNG, 'next');
        RULES.buildingPresentation.proceduralPeople.enabled = false;
        await first.prepareSettlementPresentation(first.worldMetadata.settlements);
        expect(first.worldMetadata.settlements).toEqual(layout);
        RULES.buildingPresentation.proceduralPeople.enabled = true;
        await first.prepareSettlementPresentation(first.worldMetadata.settlements);
        expect(first.worldMetadata.settlements.every(s => s.buildingPresentation?.buildings.tavern.roomId)).toBe(true);
        expect(first.worldMetadata.settlements.map(({ buildingPresentation, ...rest }) => rest)).toEqual(layout);
        expect(rng).not.toHaveBeenCalled();
    });

    it('restores receipts and NPC appearances through real save/load and regenerated plain objects', async () => {
        RULES.buildingPresentation.proceduralPeople.enabled = true;
        const loaded = await loadBuildingPresentation('core');
        const settlement = { ...town(), id: '1,2' };
        prepareBuildingPresentation(settlement, { seed: 'rooms', catalogue: loaded });
        assignBuildingPeople(settlement, loaded);
        settlement.npcs[0].passiveFlags = { learned: true };
        gameState.set('world.metadata', { generated: true, settlements: [clone(settlement)] });
        const manager = new SettlementManager();
        manager._persistSettlement(settlement);
        const saved = JSON.parse(JSON.stringify(saveManager.serializeGameState()));
        saveManager.deserializeGameState(saved);
        const regenerated = { ...town(), id: '1,2' };
        manager._restoreSettlementFromPersistent(regenerated);
        manager._restoreNPCsFromPersistent(regenerated);
        await manager._prepareBuildingPresentation(regenerated);
        manager._persistSettlement(regenerated);
        expect(regenerated).toEqual(settlement);
        expect(gameState.get('world.npcs').get('keeper').buildingAppearance).toEqual(settlement.npcs[0].buildingAppearance);
        expect(gameState.get('world.metadata.settlements')[0].buildingPresentation).toEqual(settlement.buildingPresentation);
    });

    it.each(['metadata', 'app restore'])('loads old metadata via %s and restores NPC state before binding', async route => {
        RULES.buildingPresentation.proceduralPeople.enabled = true;
        const loaded = await loadBuildingPresentation('core');
        const settlement = { ...town(), id: '1,2', name: 'Saved tavern', type: 'settlement', questsGenerated: true };
        prepareBuildingPresentation(settlement, { seed: 'rooms', catalogue: loaded, legacy: true });
        assignBuildingPeople(settlement, loaded);
        const manager = new SettlementManager();
        gameState.set('world.metadata', { generated: true, settlements: [{ ...town(), type: 'settlement' }], features: [] });
        manager._persistSettlement(settlement);
        // Simulate an old/stale metadata copy, with canonical appearance still in world.npcs.
        delete gameState.get('world.metadata.settlements')[0].buildingPresentation;
        const saved = JSON.parse(JSON.stringify(saveManager.serializeGameState()));
        saveManager.deserializeGameState(saved);
        const world = new WorldGenerator('rooms', { campaignId: 'core' });
        if (route === 'metadata') {
            await world.generateWorldMetadata();
        } else {
            world.worldMetadata = gameState.get('world.metadata');
            await world.prepareSettlementPresentation(world.worldMetadata.settlements, true);
        }
        const live = { ...town(), id: '1,2', name: 'Saved tavern', type: 'settlement' };
        vi.spyOn(manager, 'getSettlementAtPlayerPosition').mockReturnValue(live);
        vi.spyOn(manager, 'showSettlementUI').mockImplementation(() => {});
        vi.spyOn(gameState, 'addMessage').mockImplementation(() => {});
        await manager.enterSettlement();
        expect(live.npcs.map(npc => npc.buildingAppearance)).toEqual(settlement.npcs.map(npc => npc.buildingAppearance));
        expect(live.buildingPresentation).toEqual(settlement.buildingPresentation);
        expect(world.worldMetadata.settlements[0].buildingPresentation).toEqual(settlement.buildingPresentation);
    });

    it('filters campaign-exclusive people and rooms at load time', async () => {
        const pathData = {
            'data/buildingPeople.json': { version: 1, people: [
                { id: 'shared', campaignIds: ['core'] }, { id: 'exclusive', campaignIds: ['other'] }
            ] },
            'data/buildingInteriors.json': { tavern: { variants: [
                { id: 'shared', campaignIds: ['core'] }, { id: 'exclusive', campaignIds: ['other'] }
            ] } }
        };
        fetch.mockImplementation(async path => ({ ok: true, json: async () => pathData[path] }));
        const loaded = await loadBuildingPresentation('core');
        // Core was already cached by the integration tests; a new campaign proves filtering on load.
        const filtered = await loadBuildingPresentation('other');
        expect(loaded.people.length).toBeGreaterThan(0);
        expect(filtered.people.map(person => person.id)).toEqual(['exclusive']);
        expect(filtered.interiors.tavern.variants.map(room => room.id)).toEqual(['exclusive']);
    });
});
