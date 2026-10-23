import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import WorldGenerator from '../../src/systems/WorldGenerator.js';
import { RULES } from '../../src/core/rulesEngine.js';
import { gameState } from '../../src/core/GameState.js';

const data = JSON.parse(fs.readFileSync('data/provisioning.json', 'utf8'));
const original = RULES.provisioning;
const site = (x, extra = {}) => ({ id: `${x},0`, x, y: 0, type: 'poi', poiType: 'camp', resolvedType: 'sanctuary', ...extra });

function world(seed = 'provisions') {
    const generator = new WorldGenerator(seed, { mapSize: 'small', campaignId: 'core' });
    generator.worldMetadata.features = Array.from({ length: 20 }, (_, i) => site(i * 100));
    vi.spyOn(generator, '_sampleTerrainAt').mockReturnValue('forest');
    return generator;
}

beforeEach(() => {
    RULES.provisioning = { enabled: true, generation: { maxSitesByMapSize: { small: 4 }, minSpacing: 80, candidateFraction: 1 } };
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => data })));
});

afterEach(() => {
    RULES.provisioning = original;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('Finite provisioning placement', () => {
    it('uses isolated deterministic placement and leaves feature positions and base RNG intact', async () => {
        const first = world();
        const second = world();
        const featuresBefore = JSON.parse(JSON.stringify(first.worldMetadata.features));
        second.worldMetadata.features.reverse();
        await first.placeProvisioningOpportunities();
        await second.placeProvisioningOpportunities();
        const receipts = generator => generator.worldMetadata.features.filter(f => f.provisioning).map(f => f.provisioning).sort((a, b) => a.id.localeCompare(b.id));
        expect(receipts(first)).toEqual(receipts(second));
        expect(receipts(first)).toHaveLength(4);
        expect(first.baseRNG.next()).toBe(second.baseRNG.next());
        expect(first.worldMetadata.features.map(({ provisioning, ...feature }) => feature)).toEqual(featuresBefore);
    });

    it('varies placement with seed and imposes both spacing and world cap', async () => {
        const first = world('one');
        const second = world('two');
        first.worldMetadata.features = Array.from({ length: 40 }, (_, i) => site(i * 10));
        await first.placeProvisioningOpportunities();
        await second.placeProvisioningOpportunities();
        const chosen = first.worldMetadata.features.filter(f => f.provisioning);
        expect(chosen.length).toBeGreaterThan(0);
        expect(chosen.length).toBeLessThanOrEqual(4);
        for (const a of chosen) {
            for (const b of chosen) {
                if (a !== b) {
                    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(80);
                }
            }
        }
        expect(chosen.map(f => f.id)).not.toEqual(second.worldMetadata.features.filter(f => f.provisioning).map(f => f.id));
    });

    it('never overwrites or removes a receipt, including a failed saved attempt', async () => {
        const generator = world();
        const receipt = { id: '0,0', cueId: 'tracks', attempt: { success: false } };
        generator.worldMetadata.features[0].provisioning = receipt;
        await generator.placeProvisioningOpportunities();
        expect(generator.worldMetadata.features[0].provisioning).toBe(receipt);
        expect(generator.worldMetadata.features.filter(f => f.provisioning)).toHaveLength(4);
        generator.worldMetadata = JSON.parse(JSON.stringify(generator.worldMetadata));
        generator.worldMetadata.generated = true;
        await generator.placeProvisioningOpportunities();
        expect(generator.worldMetadata.features[0].provisioning.attempt.success).toBe(false);
    });

    it('requires a sanctuary POI, eligible terrain, eligible type and campaign', async () => {
        const generator = world();
        generator.worldMetadata.features = [site(0, { resolvedType: 'dungeon' }), site(100, { type: 'settlement' }), site(200, { poiType: 'temple' }), site(300)];
        generator._sampleTerrainAt.mockReturnValue('water');
        await generator.placeProvisioningOpportunities();
        expect(generator.worldMetadata.features.some(f => f.provisioning)).toBe(false);
        generator._sampleTerrainAt.mockReturnValue('forest');
        fetch.mockResolvedValue({ json: async () => ({ cues: data.cues.map(cue => ({ ...cue, campaignIds: ['unrelated'] })) }) });
        await generator.placeProvisioningOpportunities();
        expect(generator.worldMetadata.features.some(f => f.provisioning)).toBe(false);
        fetch.mockResolvedValue({ json: async () => data });
        await generator.placeProvisioningOpportunities();
        expect(generator.worldMetadata.features.filter(f => f.provisioning).map(f => f.id)).toEqual(['300,0']);
    });

    it('can be disabled and zero candidate fraction produces no opportunities', async () => {
        const generator = world();
        RULES.provisioning.enabled = false;
        await generator.placeProvisioningOpportunities();
        expect(fetch).not.toHaveBeenCalled();
        RULES.provisioning.enabled = true;
        RULES.provisioning.generation.candidateFraction = 0;
        await generator.placeProvisioningOpportunities();
        expect(generator.worldMetadata.features.some(f => f.provisioning)).toBe(false);
    });

    it('loads old saved metadata without adding opportunities or requesting the catalog', async () => {
        const generator = world();
        const metadata = { generated: true, features: [site(0)], settlements: [], roads: [] };
        vi.spyOn(gameState, 'get').mockImplementation(key => key === 'world.metadata' ? metadata : undefined);
        expect(await generator.generateWorldMetadata()).toBe(metadata);
        expect(metadata.features[0].provisioning).toBeUndefined();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('hooks placement into new metadata creation before it is persisted', async () => {
        const generator = world();
        vi.spyOn(gameState, 'get').mockReturnValue(undefined);
        vi.spyOn(gameState, 'set').mockImplementation(() => {});
        vi.spyOn(generator, 'preGenerateSettlements').mockResolvedValue();
        vi.spyOn(generator, 'preGenerateFeatures').mockResolvedValue();
        vi.spyOn(generator, 'preGenerateRoads').mockResolvedValue();
        const metadata = await generator.generateWorldMetadata();
        expect(metadata.features.filter(f => f.provisioning)).toHaveLength(4);
        expect(gameState.set).toHaveBeenCalledWith('world.metadata', metadata);
    });

    it('gracefully omits provisioning when its catalog is absent or malformed', async () => {
        const generator = world();
        fetch.mockRejectedValue(new Error('offline'));
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        await generator.placeProvisioningOpportunities();
        expect(generator.worldMetadata.features.some(f => f.provisioning)).toBe(false);
        fetch.mockResolvedValue({ json: async () => ({}) });
        await generator.placeProvisioningOpportunities();
        expect(generator.worldMetadata.features.some(f => f.provisioning)).toBe(false);
    });
});
