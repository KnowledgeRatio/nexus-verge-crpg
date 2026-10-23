import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorldGenerator from '../../src/systems/WorldGenerator.js';
import ProvisioningManager from '../../src/systems/ProvisioningManager.js';
import restManager from '../../src/systems/RestManager.js';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';

const read = name => JSON.parse(fs.readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));
const catalogue = read('provisioning');
let previous;
beforeEach(() => {
    previous = { state: gameState.data, rules: RULES.provisioning };
    RULES.provisioning = JSON.parse(JSON.stringify(previous.rules));
    gameState.reset();
    vi.stubGlobal('window', {});
    vi.stubGlobal('fetch', vi.fn(async path => ({ ok: true, json: async () =>
        read(String(path).split('/').at(-1).split('.')[0]) })));
});
afterEach(() => {
    gameState.data = previous.state;
    RULES.provisioning = previous.rules;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

function makeWorld(seed = 'wilderness') {
    const world = new WorldGenerator(seed, { mapSize: 'small', campaignId: 'core' });
    world.worldBounds = { minX: -3, minY: -3, maxX: 3, maxY: 3, size: 6 };
    world.worldMetadata.settlements = [{ id: '0,0', x: 0, y: 0 }];
    world.worldMetadata.roads = [{ path: [{ x: 33, y: 33 }, { x: 34, y: 33 }] }];
    world.worldMetadata.features = [{ id: 'shelter', type: 'sanctuary', x: 64, y: 64,
        provisioning: { id: 'shelter', cueId: 'tracks', attempt: null } }];
    return world;
}

describe('Independent wilderness provisioning generation', () => {
    it('is deterministic, collision-free, remote and compatible with actual traversable ground', async () => {
        const first = makeWorld();
        const second = makeWorld();
        const base = JSON.parse(JSON.stringify(first.worldMetadata));
        await first.placeWildernessProvisioning();
        await second.placeWildernessProvisioning();
        const sites = first.worldMetadata.features.filter(site => site.type === 'provisioning');
        expect(sites.length).toBeGreaterThan(0);
        expect(second.worldMetadata.features).toEqual(first.worldMetadata.features);
        expect(first.baseRNG.next()).toBe(second.baseRNG.next());
        expect(first.worldMetadata.settlements).toEqual(base.settlements);
        expect(first.worldMetadata.roads).toEqual(base.roads);
        expect(first.worldMetadata.features.filter(site => site.type !== 'provisioning')).toEqual(base.features);
        const regions = new Set();
        for (const site of sites) {
            const key = `${Math.floor(site.x / RULES.worldGen.regionSize)},${Math.floor(site.y / RULES.worldGen.regionSize)}`;
            expect(regions.has(key)).toBe(false);
            regions.add(key);
            expect(site.renderLayer).toBe('overlay');
            expect(site.resolvedType).toBeUndefined();
            expect(Math.hypot(site.x, site.y)).toBeGreaterThanOrEqual(RULES.provisioning.wilderness.settlementExclusion);
            const tile = first.generateTile(site.x, site.y, first.baseRNG);
            expect(first.terrainTypes.terrains.find(terrain => terrain.id === tile.terrain).traversable).toBe(true);
            const cue = catalogue.cues.find(cue => cue.id === site.provisioning.cueId);
            expect(cue.eligibleHostTypes).toContain('provisioning');
            expect(cue.eligibleBiomes).toContain(tile.terrain);
            for (const other of first.worldMetadata.features.filter(feature => feature.provisioning && feature !== site)) {
                expect(Math.hypot(site.x - other.x, site.y - other.y))
                    .toBeGreaterThanOrEqual(RULES.provisioning.wilderness.minSpacing);
            }
        }
    });

    it('does not add sites to old generated metadata or duplicate existing regions', async () => {
        const world = makeWorld();
        await world.placeWildernessProvisioning();
        const count = world.worldMetadata.features.length;
        await world.placeWildernessProvisioning();
        expect(world.worldMetadata.features).toHaveLength(count);
        world.worldMetadata.generated = true;
        const saved = JSON.stringify(world.worldMetadata);
        await world.placeWildernessProvisioning();
        expect(JSON.stringify(world.worldMetadata)).toBe(saved);
    });

    it('honours its kill switch and excludes unsupported campaigns and impossible ground', async () => {
        const world = makeWorld();
        RULES.provisioning.wilderness.enabled = false;
        await world.placeWildernessProvisioning();
        expect(fetch).not.toHaveBeenCalled();
        RULES.provisioning.wilderness.enabled = true;
        vi.spyOn(world, 'generateTile').mockReturnValue({ terrain: 'ocean' });
        await world.placeWildernessProvisioning();
        expect(world.worldMetadata.features).toHaveLength(1);
        vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({
            cues: catalogue.cues.map(cue => ({ ...cue, campaignIds: ['unsupported'] }))
        }) })));
        await world.placeWildernessProvisioning();
        expect(world.worldMetadata.features).toHaveLength(1);
    });

    it('does not block road paint over a terrain overlay', () => {
        const world = makeWorld();
        const tiles = [{ x: 1, y: 0, terrain: 'grassland', feature: { renderLayer: 'overlay' } },
            { x: 2, y: 0, terrain: 'grassland', feature: { type: 'poi' } }];
        world.createSimpleRoad({ x: 0, y: 0 }, { x: 3, y: 0 }, tiles);
        expect(tiles[0].terrain).toBe('road');
        expect(tiles[1].terrain).toBe('grassland');
    });
});

describe('Independent wilderness provisioning lifecycle', () => {
    it('uses canonical saved attempts without granting safe rest, money or XP', () => {
        const site = { id: 'wild', x: 4, y: 5, type: 'provisioning', renderLayer: 'overlay',
            provisioning: { id: 'wild', cueId: 'wild_plants', attempt: null } };
        gameState.set('world.metadata', { features: [site], settlements: [] });
        gameState.set('world.generatedRegions', new Map([['0,0', {
            tiles: Array.from({ length: 32 }, () => Array.from({ length: 32 }, () => ({ terrain: 'grassland' })))
        }]]));
        gameState.set('character', { name: 'Traveller', level: 5, gold: 40, xp: 0 });
        gameState.set('player.position', { x: 4, y: 5 });
        gameState.set('fatigue', { current: 0, supplies: 2, exhaustionLevels: 0 });
        const skills = { rollSkillCheck: vi.fn(() => ({ success: true })) };
        const manager = new ProvisioningManager({ data: catalogue, skillChallengeManager: skills });
        expect(manager.getOpportunityAtPosition(4, 5).canAttempt).toBe(true);
        expect(restManager.isPlayerInTavern()).toBe(false);
        const result = manager.attempt('wild');
        expect(result.suppliesRestored).toBe(1);
        expect(gameState.get('fatigue.current')).toBe(RULES.fatigue.skillChallengeFatigue);
        expect(gameState.get('character.gold')).toBe(40);
        expect(gameState.get('character.xp')).toBe(0);
        const saved = JSON.parse(JSON.stringify(gameState.get('world.metadata')));
        gameState.set('world.metadata', saved);
        expect(manager.attempt('wild')).toEqual({ attempted: false, reason: 'spent' });
        expect(skills.rollSkillCheck).toHaveBeenCalledTimes(1);
        RULES.provisioning.wilderness.enabled = false;
        expect(manager.getOpportunityAtPosition(4, 5)).toBeNull();
    });
});
