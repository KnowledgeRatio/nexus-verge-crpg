/**
 * Characterization tests for RelationManager's choke-point methods, written per
 * ADR-015 ("Forking a Live System") before the faction-contribution hook lands in
 * modifyRelation(). Locks down CURRENT behavior:
 *   - modifyRelation() clamping at +/-100 and history trim to historyMaxLength
 *   - getRelation() with _getFactionModifier() as its current always-0 placeholder
 *   - tier-boundary edges (using relations.json's own tier table as source of truth)
 *   - gating methods (canOfferQuest/canTrade/canSpeak) at those boundaries
 *   - real call sites (MerchantManager.buyItem/sellItem) exercising the choke point
 *     end-to-end via window.game.relationManager, not just in isolation
 *
 * Built through real construction: real RelationManager, real data/relations.json,
 * matching the established convention in RelationManager.tradingPractice.test.js.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RelationManager from '../../src/systems/RelationManager.js';
import MerchantManager from '../../src/systems/MerchantManager.js';
import QuestManager from '../../src/systems/QuestManager.js';
import DialogueManager from '../../src/systems/DialogueManager.js';
import { gameState } from '../../src/core/GameState.js';
import relationsData from '../../data/relations.json' with { type: 'json' };

function makeManager() {
    const manager = new RelationManager();
    manager.config = relationsData;
    manager.tierLookup = [...relationsData.tiers].sort((a, b) => a.min - b.min);
    manager.startingScore = relationsData.defaults.startingScore;
    return manager;
}

function makeNpc(score = 0) {
    return { name: 'Test NPC', relations: { score, history: [] } };
}

const sortedTiers = [...relationsData.tiers].sort((a, b) => a.min - b.min);

globalThis.window = globalThis.window || {};

beforeEach(() => {
    gameState.data.factions = {};
    gameState.data.character = null;
    window.game = null;
});

afterEach(() => {
    vi.restoreAllMocks();
    window.game = null;
});

describe('RelationManager.modifyRelation — clamping', () => {
    it('clamps score at +100 when a positive modifier would exceed it', () => {
        const manager = makeManager();
        const npc = makeNpc(95);

        const result = manager.modifyRelation(npc, 'questCompleteForNPC', { exactPoints: 20 });

        expect(result.newScore).toBe(100);
        expect(npc.relations.score).toBe(100);
    });

    it('clamps score at -100 when a negative modifier would exceed it', () => {
        const manager = makeManager();
        const npc = makeNpc(-95);

        const result = manager.modifyRelation(npc, 'questAbandoned');

        expect(result.newScore).toBe(-100);
        expect(npc.relations.score).toBe(-100);
    });

    it('does not clamp when the result is within range', () => {
        const manager = makeManager();
        const npc = makeNpc(0);

        const result = manager.modifyRelation(npc, 'successfulTrade');

        expect(result.newScore).toBe(1);
    });
});

describe('RelationManager.modifyRelation — history', () => {
    it('records a history entry with type, points, description, timestamp', () => {
        const manager = makeManager();
        const npc = makeNpc(0);

        manager.modifyRelation(npc, 'successfulTrade');

        expect(npc.relations.history).toHaveLength(1);
        const entry = npc.relations.history[0];
        expect(entry.type).toBe('successfulTrade');
        expect(entry.points).toBe(1);
        expect(entry.description).toBe(relationsData.modifiers.successfulTrade.description);
        expect(typeof entry.timestamp).toBe('number');
    });

    it('trims history to historyMaxLength, keeping the most recent entries', () => {
        const manager = makeManager();
        const npc = makeNpc(0);
        const maxHistory = relationsData.defaults.historyMaxLength;

        for (let i = 0; i < maxHistory + 5; i++) {
            manager.modifyRelation(npc, 'successfulTrade');
        }

        expect(npc.relations.history).toHaveLength(maxHistory);
        // Oldest 5 were trimmed; total points applied across all calls is preserved on the score.
        expect(npc.relations.score).toBe(maxHistory + 5);
    });

    it('does not trim when history is at or under the max', () => {
        const manager = makeManager();
        const npc = makeNpc(0);
        const maxHistory = relationsData.defaults.historyMaxLength;

        for (let i = 0; i < maxHistory; i++) {
            manager.modifyRelation(npc, 'successfulTrade');
        }

        expect(npc.relations.history).toHaveLength(maxHistory);
    });
});

describe('RelationManager.modifyRelation — random range', () => {
    it('rolls within [min, max] inclusive when no exactPoints override is given', () => {
        const manager = makeManager();
        const npc = makeNpc(0);
        const modifier = relationsData.modifiers.questCompleteForNPC; // min 10, max 20

        vi.spyOn(Math, 'random').mockReturnValue(0); // floor of range
        const low = manager.modifyRelation(npc, 'questCompleteForNPC');
        expect(low.points).toBe(modifier.min);

        vi.spyOn(Math, 'random').mockReturnValue(0.999999); // ceiling of range
        const high = manager.modifyRelation(npc, 'questCompleteForNPC');
        expect(high.points).toBe(modifier.max);
    });

    it('returns null and warns for an unknown modifier key', () => {
        const manager = makeManager();
        const npc = makeNpc(0);
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = manager.modifyRelation(npc, 'notARealModifierKey');

        expect(result).toBeNull();
        expect(warnSpy).toHaveBeenCalled();
    });
});

describe('RelationManager.getRelation — faction modifier', () => {
    it('effectiveScore equals personal score for an NPC with no culture', () => {
        const manager = makeManager();
        const npc = makeNpc(42);

        const relation = manager.getRelation(npc);

        expect(manager._getFactionModifier(npc)).toBe(0);
        expect(relation.score).toBe(42);
        expect(relation.effectiveScore).toBe(42);
    });

    it('is unaffected by gameState.data.factions when the NPC has no culture', () => {
        gameState.data.factions = { someFaction: 80 };
        const manager = makeManager();
        const npc = makeNpc(10);

        const relation = manager.getRelation(npc);

        expect(relation.effectiveScore).toBe(10);
    });

    it('adds a scaled, clamped bonus from gameState.factions.{npc.culture}', () => {
        gameState.data.factions = { kethara: 50 }; // 50 * 0.15 = 7.5
        const manager = makeManager();
        const npc = { ...makeNpc(10), culture: 'kethara' };

        const relation = manager.getRelation(npc);

        expect(relation.effectiveScore).toBe(17.5);
    });

    it('clamps the faction modifier to maxBonus/maxPenalty', () => {
        gameState.data.factions = { kethara: 1000 };
        const manager = makeManager();
        const npc = { ...makeNpc(0), culture: 'kethara' };

        expect(manager._getFactionModifier(npc)).toBe(relationsData.factionModifier.maxBonus);
    });

    it('ensureRelations seeds an NPC with no relations block using startingScore', () => {
        const manager = makeManager();
        const npc = { name: 'Fresh NPC' };

        const relation = manager.getRelation(npc);

        expect(npc.relations).toEqual({ score: relationsData.defaults.startingScore, history: [] });
        expect(relation.score).toBe(relationsData.defaults.startingScore);
    });

    it('returns tierLabel, color, and tone matching relations.json for the resolved tier', () => {
        const manager = makeManager();
        const npc = makeNpc(50); // trusted: 40-69

        const relation = manager.getRelation(npc);

        expect(relation.tier.id).toBe('trusted');
        expect(relation.tierLabel).toBe('Trusted');
        expect(relation.color).toBe('#4488ff');
        expect(relation.tone).toBe('affable');
    });
});

describe('RelationManager tier boundaries', () => {
    it('crosses from neutral to friendly exactly between 19 and 20', () => {
        const manager = makeManager();

        expect(manager.getRelation(makeNpc(19)).tier.id).toBe('neutral');
        expect(manager.getRelation(makeNpc(20)).tier.id).toBe('friendly');
    });

    it.each(
        sortedTiers.slice(1).map((tier, i) => [sortedTiers[i], tier])
    )('boundary between %s.id and %s.id falls on the correct side (data-driven from relations.json)', (lowerTier, upperTier) => {
        const manager = makeManager();

        expect(manager.getRelation(makeNpc(lowerTier.max)).tier.id).toBe(lowerTier.id);
        expect(manager.getRelation(makeNpc(upperTier.min)).tier.id).toBe(upperTier.id);
    });

    it('resolves the extremes -100 and 100 to the outermost configured tiers', () => {
        const manager = makeManager();

        expect(manager.getRelation(makeNpc(-100)).tier.id).toBe('hostile');
        expect(manager.getRelation(makeNpc(100)).tier.id).toBe('allied');
    });
});

describe('RelationManager gating methods at tier boundaries', () => {
    it('canOfferQuest requires at least friendly tier for a non-great-hall NPC', () => {
        const manager = makeManager();

        expect(manager.canOfferQuest(makeNpc(19))).toBe(false); // neutral
        expect(manager.canOfferQuest(makeNpc(20))).toBe(true);  // friendly
    });

    it('canOfferQuest allows a great-hall leader down to unfriendly, but not hostile', () => {
        const manager = makeManager();
        const leader = { ...makeNpc(-21), role: 'leader' }; // unfriendly
        const hostileLeader = { ...makeNpc(-51), role: 'leader' }; // hostile

        expect(manager.canOfferQuest(leader)).toBe(true);
        expect(manager.canOfferQuest(hostileLeader)).toBe(false);
    });

    it('canTrade is false only at hostile tier', () => {
        const manager = makeManager();

        expect(manager.canTrade(makeNpc(-51))).toBe(false); // hostile
        expect(manager.canTrade(makeNpc(-50))).toBe(true);  // unfriendly
    });

    it('canSpeak is false only at hostile tier', () => {
        const manager = makeManager();

        expect(manager.canSpeak(makeNpc(-51))).toBe(false); // hostile
        expect(manager.canSpeak(makeNpc(-50))).toBe(true);  // unfriendly
    });
});

describe('RelationManager real call site — MerchantManager.buyItem/sellItem', () => {
    function makeCharacter(overrides = {}) {
        return {
            gold: 1000,
            removeGold: vi.fn(),
            addGold: vi.fn(),
            addItem: vi.fn(),
            removeItem: vi.fn(() => true),
            getSkillBonus: () => 0,
            ...overrides
        };
    }

    it('buyItem applies the successfulTrade modifier through window.game.relationManager end-to-end', () => {
        const relationManager = makeManager();
        window.game = { relationManager };

        const merchantManager = new MerchantManager('test-seed');
        const npc = makeNpc(0);
        const item = { id: 'itm1', name: 'Dagger', value: 10 };
        const character = makeCharacter();

        const result = merchantManager.buyItem(item, character, 1, npc);

        expect(result.success).toBe(true);
        expect(npc.relations.score).toBe(1); // successfulTrade min=max=1
        expect(npc.relations.history[0].type).toBe('successfulTrade');
    });

    it('sellItem applies the successfulTrade modifier through window.game.relationManager end-to-end', () => {
        const relationManager = makeManager();
        window.game = { relationManager };

        const merchantManager = new MerchantManager('test-seed');
        const npc = makeNpc(0);
        const item = { id: 'itm1', name: 'Dagger', value: 10 };
        const character = makeCharacter();

        const result = merchantManager.sellItem(item, character, 1, npc);

        expect(result.success).toBe(true);
        expect(npc.relations.score).toBe(1);
        expect(npc.relations.history[0].type).toBe('successfulTrade');
    });

    it('buyItem does not touch relations when no relationManager is present (fallback path)', () => {
        window.game = null;

        const merchantManager = new MerchantManager('test-seed');
        const npc = makeNpc(0);
        const item = { id: 'itm1', name: 'Dagger', value: 10 };
        const character = makeCharacter();

        const result = merchantManager.buyItem(item, character, 1, npc);

        expect(result.success).toBe(true);
        expect(npc.relations.score).toBe(0);
    });
});

describe('RelationManager.modifyRelation — faction contribution hook', () => {
    it('does not touch gameState.factions for an NPC with no culture', () => {
        const manager = makeManager();
        const npc = makeNpc(0);

        manager.modifyRelation(npc, 'questCompleteForNPC', { exactPoints: 20 });

        expect(gameState.data.factions).toEqual({});
    });

    it('writes an unrounded, base-rate-scaled delta to gameState.factions.{culture} with no character/wordcraft', () => {
        const manager = makeManager();
        const npc = { ...makeNpc(0), culture: 'kethara' };

        manager.modifyRelation(npc, 'successfulTrade'); // points = 1, baseRate 0.20

        expect(gameState.data.factions.kethara).toBeCloseTo(0.2);
    });

    it('does not round to zero on a single small-point event (the rounding-cliff case)', () => {
        const manager = makeManager();
        const npc = { ...makeNpc(0), culture: 'kethara' };

        manager.modifyRelation(npc, 'successfulTrade');

        expect(gameState.data.factions.kethara).toBeGreaterThan(0);
    });

    it('accumulates across repeated events instead of resetting', () => {
        const manager = makeManager();
        const npc = { ...makeNpc(0), culture: 'kethara' };

        manager.modifyRelation(npc, 'successfulTrade');
        manager.modifyRelation(npc, 'successfulTrade');

        expect(gameState.data.factions.kethara).toBeCloseTo(0.4);
    });

    it('rank 1 wordcraft multiplies the base rate to 0.40 instead of adding to it', () => {
        gameState.data.character = { practices: ['wordcraft'] };
        const manager = makeManager();
        const npc = { ...makeNpc(0), culture: 'kethara' };

        manager.modifyRelation(npc, 'successfulTrade'); // points=1 * (0.20*2)

        expect(gameState.data.factions.kethara).toBeCloseTo(0.4);
    });

    it('rank 2 wordcraft multiplies the base rate to 0.60', () => {
        gameState.data.character = { practices: ['wordcraft', 'wordcraft'] };
        const manager = makeManager();
        const npc = { ...makeNpc(0), culture: 'kethara' };

        manager.modifyRelation(npc, 'successfulTrade'); // points=1 * (0.20*3)

        expect(gameState.data.factions.kethara).toBeCloseTo(0.6);
    });

    it('clamps faction standing at -100/+100', () => {
        gameState.data.factions = { kethara: 99.9 };
        const manager = makeManager();
        const npc = { ...makeNpc(0), culture: 'kethara' };

        manager.modifyRelation(npc, 'questCompleteForNPC', { exactPoints: 20 });

        expect(gameState.data.factions.kethara).toBe(100);
    });
});

describe('generatedRegions Map lookup bug fix (RelationManager, QuestManager, DialogueManager)', () => {
    // world.generatedRegions is a real Map (see WorldGenerator.js / GameState.js constructor,
    // toJSON, fromJSON, and default init — all agree). Object.keys(aMap) always returns []
    // and aMap[key] is always undefined, so these three lookups silently found nothing.
    // Built through real construction: a real Map assigned to gameState, not a plain-object
    // stand-in, since that's exactly the shape distinction the bug hinges on.
    function makeWorldWithSettlement() {
        const region = {
            features: [
                {
                    type: 'settlement',
                    id: 'settlement-1',
                    x: 10,
                    y: 10,
                    name: 'Testford',
                    npcs: [
                        { id: 'npc-giver', name: 'Giver', relations: { score: 0, history: [] } },
                        { id: 'npc-other', name: 'Other', relations: { score: 0, history: [] } }
                    ]
                },
                {
                    type: 'dungeon',
                    id: 'dungeon-1',
                    x: 11,
                    y: 10,
                    name: 'Testford Crypt',
                    creatureType: 'skeletons'
                }
            ],
            tiles: []
        };
        const generatedRegions = new Map();
        generatedRegions.set('0,0', region);
        return { generatedRegions, modifiedTiles: [] };
    }

    it('RelationManager.modifySettlementRelations finds the region via the Map and applies the settlement bonus to non-excluded NPCs', () => {
        const world = makeWorldWithSettlement();
        gameState.data.world = world;

        const manager = makeManager();
        manager.modifySettlementRelations('settlement-1', 'npc-giver');

        const [giver, other] = world.generatedRegions.get('0,0').features[0].npcs;
        expect(giver.relations.score).toBe(0); // excluded (already got direct bonus elsewhere)
        expect(other.relations.score).toBeGreaterThan(0); // questCompleteInSettlement applied
        expect(other.relations.history[0].type).toBe('questCompleteInSettlement');
    });

    it('QuestManager._findNPCById finds an NPC nested inside a real Map-backed world.generatedRegions', () => {
        const world = makeWorldWithSettlement();
        gameState.data.world = world;

        const questManager = new QuestManager({ loadData: vi.fn() });
        const npc = questManager._findNPCById('npc-other');

        expect(npc).not.toBeNull();
        expect(npc.name).toBe('Other');
    });

    it('completeQuest end-to-end: quest-giver bonus and settlement bonus both reach modifyRelation via the fixed Map lookup', () => {
        const world = makeWorldWithSettlement();
        gameState.data.world = world;

        const relationManager = makeManager();
        window.game = { relationManager };

        gameState.data.quests = {
            available: [],
            active: [{
                id: 'quest-1',
                name: 'Test Quest',
                status: 'active',
                objectives: [{ completed: true }],
                rewards: {},
                questGiver: { npcId: 'npc-giver', settlementId: 'settlement-1' }
            }],
            completed: [],
            failed: []
        };
        gameState.data.character = {
            addXP: vi.fn(),
            addGold: vi.fn()
        };

        const questManager = new QuestManager({ loadData: vi.fn() });
        const result = questManager.completeQuest('quest-1');

        expect(result.success).toBe(true);

        const [giver, other] = world.generatedRegions.get('0,0').features[0].npcs;
        expect(giver.relations.history[0].type).toBe('questCompleteForNPC');
        expect(giver.relations.score).toBeGreaterThan(0);
        expect(other.relations.history[0].type).toBe('questCompleteInSettlement');
        expect(other.relations.score).toBeGreaterThan(0);
    });

    it('DialogueManager.getDynamicLines finds nearby features via the fixed Map lookup', () => {
        const world = makeWorldWithSettlement();
        gameState.data.world = world;

        const dialogueManager = new DialogueManager();
        dialogueManager.dialogueData = {
            dynamicTemplates: {
                dungeon: ['{creatureType} lurk in {dungeonName}, {distance} to the {direction}.']
            }
        };
        dialogueManager.config = {
            scanRadius: 5,
            maxDungeonLines: 2,
            maxSettlementLines: 1,
            maxTerrainLines: 1,
            distanceLabels: {
                near: { max: 2, label: 'nearby' },
                medium: { max: 4, label: "a day's travel away" },
                far: { max: 6, label: 'far to the' }
            }
        };

        const npc = { settlementId: '10_10' };
        const lines = dialogueManager.getDynamicLines(npc);

        expect(lines.length).toBeGreaterThan(0);
        expect(lines[0]).toContain('Testford Crypt');
    });
});

describe('RelationManager.getFactionStanding', () => {
    it('returns score, tier, tierLabel, and color for a culture with standing', () => {
        gameState.data.factions = { kethara: 45 };
        const manager = makeManager();

        const standing = manager.getFactionStanding('kethara');

        expect(standing.score).toBe(45);
        expect(standing.tier.id).toBe('trusted');
        expect(standing.tierLabel).toBe('Trusted');
        expect(standing.color).toBe('#4488ff');
    });

    it('defaults to 0/neutral for a culture with no recorded standing', () => {
        const manager = makeManager();

        const standing = manager.getFactionStanding('unrecorded-culture');

        expect(standing.score).toBe(0);
        expect(standing.tier.id).toBe('neutral');
    });

    it('rounds only for tier lookup, not the returned score', () => {
        gameState.data.factions = { kethara: 19.6 };
        const manager = makeManager();

        const standing = manager.getFactionStanding('kethara');

        expect(standing.score).toBe(19.6);
        expect(standing.tier.id).toBe('friendly'); // rounds to 20
    });
});
