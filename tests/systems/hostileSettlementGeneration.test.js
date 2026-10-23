import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorldGenerator from '../../src/systems/WorldGenerator.js';
import { RULES } from '../../src/core/rulesEngine.js';
import { gameState } from '../../src/core/GameState.js';
import fs from 'node:fs';
import { selectHostileSettlementContent } from '../../src/systems/hostileSettlementContent.js';

const content = JSON.parse(fs.readFileSync('data/hostileSettlements.json', 'utf8'));

const original = RULES.hostileSettlements;
const overrides = RULES.worldGen.campaignOverrides;
const finiteEnabled = RULES.worldGen.finiteWorld.enabled;
const hostiles = generator => generator.worldMetadata.settlements.filter(s => s.hostileState);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function grid(seed = 'hostile-world') {
    const generator = new WorldGenerator(seed, { mapSize: 'small' });
    generator.worldMetadata.settlements = [];
    for (let x = -7; x <= 7; x++) {
        for (let y = -7; y <= 7; y++) {
            generator.worldMetadata.settlements.push({
                id: `${x},${y}`, x: x * 96 + 16, y: y * 96 + 16,
                type: 'settlement', settlementType: 'town'
            });
        }
    }
    return generator;
}

beforeEach(() => {
    RULES.hostileSettlements = {
        enabled: true, share: 0.1, clusterSize: [2, 4], isolatedShare: 0.15, starterSafeRadius: 96, rebuildStages: 3
    };
    RULES.worldGen.campaignOverrides = {};
    RULES.worldGen.finiteWorld.enabled = true;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => content })));
});

afterEach(() => {
    RULES.hostileSettlements = original;
    RULES.worldGen.campaignOverrides = overrides;
    RULES.worldGen.finiteWorld.enabled = finiteEnabled;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('Hostile settlement world assignment', () => {
    it('reproduces the bounded quota regardless of metadata order without adding settlements or consuming base RNG', () => {
        const first = grid();
        const second = grid();
        second.worldMetadata.settlements.reverse();
        const before = JSON.parse(JSON.stringify(first.worldMetadata.settlements));
        first.assignHostileSettlements();
        second.assignHostileSettlements();
        const ids = generator => hostiles(generator).map(s => s.id).sort();
        expect(ids(first)).toEqual(ids(second));
        expect(hostiles(first)).toHaveLength(Math.round(before.length * RULES.hostileSettlements.share));
        expect(first.worldMetadata.settlements.map(({ hostileState: _hostile, ...settlement }) => settlement)).toEqual(before);
        expect(first.baseRNG.next()).toBe(second.baseRNG.next());
        expect(hostiles(first).every(s => s.hostileState.phase === 'hostile')).toBe(true);
    });

    it('produces nearby hostile patches and occasional solitary sites across different seeds', () => {
        let paired = 0;
        let total = 0;
        const selections = [];
        for (let seed = 0; seed < 20; seed++) {
            const generator = grid(`hostile-${seed}`);
            generator.assignHostileSettlements();
            const selected = new Set(hostiles(generator));
            selections.push([...selected].map(s => s.id));
            for (const settlement of selected) {
                const nearestDistance = Math.min(...generator.worldMetadata.settlements
                    .filter(s => s !== settlement).map(s => distance(s, settlement)));
                // A regular grid has multiple equally close neighbours.
                paired += Number([...selected].some(s => s !== settlement &&
                    distance(s, settlement) === nearestDistance));
                total++;
            }
        }
        // Independent 10% sampling would yield approximately 10% paired neighbours.
        expect(paired / total).toBeGreaterThan(0.5);
        expect(paired).toBeLessThan(total);
        expect(selections[0]).not.toEqual(selections[1]);
    });

    it('protects the starting settlement and safety radius and caps excessive quotas at eligible sites', () => {
        const generator = grid();
        RULES.hostileSettlements.share = 1;
        generator.assignHostileSettlements();
        expect(hostiles(generator)).toHaveLength(220);
        expect(hostiles(generator).every(s => distance(s, { x: 16, y: 16 }) > 96)).toBe(true);
        const sparse = grid();
        sparse.worldMetadata.settlements = sparse.worldMetadata.settlements.slice(0, 3);
        sparse.assignHostileSettlements();
        expect(hostiles(sparse)).toHaveLength(2);
    });

    it('respects campaign enable/share overrides, disabled finite worlds, and zero quota', () => {
        for (const setting of [{ enabled: false }, { share: 0 }]) {
            const generator = grid();
            RULES.worldGen.campaignOverrides = { hostileSettlements: setting };
            generator.assignHostileSettlements();
            expect(hostiles(generator)).toHaveLength(0);
        }
        RULES.worldGen.campaignOverrides = { hostileSettlements: { share: 0.2 } };
        const generator = grid();
        generator.assignHostileSettlements();
        expect(hostiles(generator)).toHaveLength(45);
        RULES.worldGen.finiteWorld.enabled = false;
        const infinite = grid();
        infinite.assignHostileSettlements();
        expect(hostiles(infinite)).toHaveLength(0);
    });

    it('does not reroll completed assignment or backfill old saved metadata', async () => {
        const generator = grid();
        generator.assignHostileSettlements();
        hostiles(generator)[0].hostileState = { phase: 'rebuilding', readyAt: 700 };
        const snapshot = JSON.parse(JSON.stringify(generator.worldMetadata));
        generator.worldSeed = 'changed-seed';
        generator.assignHostileSettlements();
        expect(generator.worldMetadata).toEqual(snapshot);
        const old = grid();
        old.worldMetadata.generated = true;
        const saved = JSON.parse(JSON.stringify(old.worldMetadata));
        vi.spyOn(gameState, 'get').mockReturnValue(saved);
        const loaded = grid();
        expect(await loaded.generateWorldMetadata()).toBe(saved);
        loaded.assignHostileSettlements();
        expect(hostiles(loaded)).toHaveLength(0);
    });

    it('retains plain hostile state through settlement pruning, JSON serialization and restoration', () => {
        const generator = grid();
        generator.assignHostileSettlements();
        const settlement = hostiles(generator)[0];
        settlement.hostileState = { phase: 'rebuilding', readyAt: 700, completed: ['walls'] };
        let stored = [];
        vi.spyOn(gameState, 'get').mockImplementation(key => key === 'world.settlements' ? stored : undefined);
        vi.spyOn(gameState, 'set').mockImplementation((key, value) => {
            if (key === 'world.settlements') {
                stored = JSON.parse(JSON.stringify(value));
            }
        });
        generator.persistSettlementData({ features: [settlement] });
        const features = [{ ...settlement, hostileState: { phase: 'hostile' } }];
        generator.restoreSettlementData(features);
        expect(features[0].hostileState).toEqual(settlement.hostileState);
    });

    it('marks real generated settlements only once before new metadata is persisted', async () => {
        const generator = new WorldGenerator('real-hostile-world', { mapSize: 'small' });
        vi.spyOn(gameState, 'get').mockReturnValue(undefined);
        vi.spyOn(gameState, 'set').mockImplementation(() => {});
        vi.spyOn(generator, 'preGenerateFeatures').mockResolvedValue();
        vi.spyOn(generator, 'placeProvisioningOpportunities').mockResolvedValue();
        vi.spyOn(generator, 'placeWildernessProvisioning').mockResolvedValue();
        vi.spyOn(generator, 'preGenerateRoads').mockResolvedValue();
        const metadata = await generator.generateWorldMetadata();
        expect(metadata.settlements.length).toBeGreaterThan(0);
        expect(hostiles(generator)).toHaveLength(Math.round(metadata.settlements.length * 0.1));
        expect(metadata.settlements.find(s => s.x === 16 && s.y === 16).hostileState).toBeUndefined();
        expect(gameState.set).toHaveBeenCalledWith('world.metadata', metadata);
        expect(fetch).toHaveBeenCalledTimes(1);
        for (const site of hostiles(generator)) {
            expect(site.hostileState.contentPlan).toEqual(
                selectHostileSettlementContent(generator.worldSeed, site.id, content, 3)
            );
            expect(site.hostileState.level).toBeUndefined();
        }
        const snapshot = JSON.parse(JSON.stringify(metadata));
        await generator.generateWorldMetadata();
        expect(metadata).toEqual(snapshot);
    });

    it('preselects story variants deterministically and retains an existing plan', async () => {
        const first = grid('content-plan');
        const second = grid('content-plan');
        first.assignHostileSettlements();
        second.assignHostileSettlements();
        await first.prepareHostileSettlementContent();
        await second.prepareHostileSettlementContent();
        expect(first.worldMetadata).toEqual(second.worldMetadata);
        expect(hostiles(first).every(site => site.hostileState.contentPlan.steps.length === 3)).toBe(true);
        const snapshot = JSON.parse(JSON.stringify(first.worldMetadata));
        fetch.mockClear();
        await first.prepareHostileSettlementContent();
        expect(fetch).not.toHaveBeenCalled();
        expect(first.worldMetadata).toEqual(snapshot);
    });
});
