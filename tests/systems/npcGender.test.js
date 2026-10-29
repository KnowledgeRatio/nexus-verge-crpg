import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import NPCGenerator from '../../src/systems/NPCGenerator.js';
import SettlementManager from '../../src/systems/SettlementManager.js';
import { SeededRandom } from '../../src/utils/rng.js';
import { gameState } from '../../src/core/GameState.js';
import saveManager from '../../src/systems/SaveManager.js';
import { assignBuildingPeople, prepareBuildingPresentation, resolveBuildingPresentation } from '../../src/systems/BuildingPresentation.js';

// Frozen pre-gender name selection: protects names and every following RNG draw.
function legacyName(role, settlementType, rng, namePool) {
    const gender = rng.next() < 0.5 ? 'male' : 'female';
    const pool = this.nameData[`${namePool}FirstNames`];
    const first = Array.isArray(pool) ? rng.choice(pool)
        : pool?.[gender] ? rng.choice(pool[gender]) : rng.choice(this.nameData.humanFirstNames[gender]);
    const last = rng.choice(this.nameData[`${namePool}LastNames`] || this.nameData.lastNames);
    if (role === 'leader') {
        return `${rng.choice(this.nameData.titles[settlementType].leader)} ${first} ${last}`;
    }
    if (role === 'guard' && rng.next() < 0.3) {
        return `${rng.choice(this.nameData.titles[settlementType].guard)} ${first}`;
    }
    return `${first} ${last}`;
}

const catalogue = {
    version: 1,
    interiors: { tavern: { variants: [{ id: 'room', people: [
        { id: 'keeper', roles: ['innkeeper'], profile: 'standing' }
    ] }] } },
    people: ['male', 'female'].map(gender => ({ id: gender, image: `${gender}.png`, roles: ['innkeeper'],
        profiles: ['standing'], identityConstraints: { gender: [gender] } }))
};

describe('NPC naming gender and visual identity', () => {
    let state;
    beforeEach(() => {
        state = gameState.data;
        gameState.data = { seed: 'gender', ui: {}, player: {}, world: {
            settlements: [], npcs: new Map(), generatedRegions: new Map()
        } };
        vi.stubGlobal('window', {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.stubGlobal('fetch', vi.fn(async path => ({ ok: true,
            json: async () => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')) })));
    });
    afterEach(() => {
        gameState.data = state;
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it.each(['core', 'nexus-verge'])('preserves every generated NPC field and RNG sequence in %s', async campaign => {
        const current = new NPCGenerator('gender', campaign);
        const previous = new NPCGenerator('gender', campaign);
        previous.generateName = legacyName;
        for (const x of [0, 3, 25]) {
            const settlement = { x, y: 12, name: 'Crossing', settlementType: 'city' };
            const actual = await current.generateNPCsForSettlement(settlement);
            const expected = await previous.generateNPCsForSettlement(settlement);
            expect(actual.every(npc => ['male', 'female'].includes(npc.gender))).toBe(true);
            const withoutGender = npc => {
                const copy = { ...npc };
                delete copy.gender;
                return copy;
            };
            expect(actual.map(withoutGender)).toEqual(expected.map(withoutGender));
        }
        const actualRNG = new SeededRandom('after-name');
        const previousRNG = new SeededRandom('after-name');
        current.generateName('guard', 'city', actualRNG, 'human');
        previous.generateName('guard', 'city', previousRNG, 'human');
        expect(actualRNG.next()).toBe(previousRNG.next());
    });

    it('uses gendered name pools and retains neutral names for either existing gender draw', () => {
        const generator = new NPCGenerator('gender');
        generator.nameData = { humanFirstNames: { male: ['Male'], female: ['Female'] },
            neutralFirstNames: ['Neutral'], lastNames: ['Surname'] };
        for (const [draw, gender, name] of [[0.1, 'male', 'Male'], [0.9, 'female', 'Female']]) {
            const rng = { next: () => draw, choice: list => list[0] };
            const identity = {};
            expect(generator.generateName('patron', 'village', rng, 'human', identity)).toBe(`${name} Surname`);
            expect(identity.gender).toBe(gender);
            expect(generator.generateName('patron', 'village', rng, 'neutral', identity)).toBe('Neutral Surname');
            expect(identity.gender).toBe(gender);
        }
    });

    it('replays old settlements by ID and name without replacing state or inferring renamed NPCs', async () => {
        const generator = new NPCGenerator('gender', 'core');
        const settlement = { x: 2, y: 7, name: 'Crossing', settlementType: 'town' };
        const original = await generator.generateNPCsForSettlement(settlement);
        settlement.npcs = JSON.parse(JSON.stringify(original));
        for (const npc of settlement.npcs) {
            delete npc.gender;
            npc.questIds = ['saved-quest'];
            npc.passiveFlags = { learned: true };
        }
        settlement.npcs[0].name = 'Authored replacement';
        settlement.npcs[1].gender = 'authored';
        await generator.reconcileNPCGenders(settlement);
        expect(settlement.npcs[0].gender).toBeUndefined();
        expect(settlement.npcs[1].gender).toBe('authored');
        expect(settlement.npcs.slice(2).map(npc => npc.gender)).toEqual(original.slice(2).map(npc => npc.gender));
        expect(settlement.npcs.every(npc => npc.questIds[0] === 'saved-quest' && npc.passiveFlags.learned)).toBe(true);
    });

    it('repairs incompatible saved artwork and persists gender/art through actual save/load', () => {
        const settlement = { id: '2,7', x: 2, y: 7, npcs: [{
            id: 'keeper', name: 'Saved', role: 'innkeeper', building: 'tavern', gender: 'female',
            buildingAppearance: { artworkId: 'male' }
        }] };
        prepareBuildingPresentation(settlement, { seed: 'gender', catalogue });
        assignBuildingPeople(settlement, catalogue);
        expect(settlement.npcs[0].buildingAppearance.artworkId).toBe('female');
        const manager = new SettlementManager();
        manager._persistSettlement(settlement);
        const saved = JSON.parse(JSON.stringify(saveManager.serializeGameState()));
        saveManager.deserializeGameState(saved);
        const live = { id: '2,7', x: 2, y: 7, npcs: [{ id: 'keeper', name: 'Saved',
            role: 'innkeeper', building: 'tavern', gender: 'male' }] };
        manager._restoreSettlementFromPersistent(live);
        manager._restoreNPCsFromPersistent(live);
        assignBuildingPeople(live, catalogue);
        expect(live.npcs[0].gender).toBe('female');
        expect(resolveBuildingPresentation(catalogue, 'tavern', live).people[0].image).toBe('female.png');
    });

    it('omits the cutout when the correct identity has no compatible art', () => {
        const limited = { ...catalogue, people: catalogue.people.filter(art => art.id === 'male') };
        const settlement = { id: 'town', npcs: [{ id: 'keeper', gender: 'female', role: 'innkeeper',
            building: 'tavern', buildingAppearance: { artworkId: 'male' } }] };
        prepareBuildingPresentation(settlement, { seed: 'gender', catalogue: limited });
        assignBuildingPeople(settlement, limited);
        expect(settlement.npcs[0].buildingAppearance.artworkId).toBeNull();
        expect(resolveBuildingPresentation(limited, 'tavern', settlement).people).toEqual([]);
        expect(settlement.npcs).toHaveLength(1);
    });

    it('keeps a saved settlement enterable when legacy identity replay is unavailable', async () => {
        fetch.mockRejectedValue(new Error('offline'));
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const settlement = { id: '2,7', x: 2, y: 7, name: 'Crossing', questsGenerated: true,
            npcs: [{ id: 'saved', name: 'Saved', role: 'innkeeper', building: 'tavern' }] };
        const manager = new SettlementManager(null, null, new NPCGenerator('gender', 'core'));
        vi.spyOn(manager, 'getSettlementAtPlayerPosition').mockReturnValue(settlement);
        vi.spyOn(manager, 'showSettlementUI').mockImplementation(() => {});
        vi.spyOn(gameState, 'addMessage').mockImplementation(() => {});
        expect(await manager.enterSettlement()).toBe(true);
        expect(manager.showSettlementUI).toHaveBeenCalled();
        expect(settlement.npcs[0].gender).toBeUndefined();
    });
});
