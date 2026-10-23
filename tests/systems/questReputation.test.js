import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuestManager from '../../src/systems/QuestManager.js';
import QuestGenerator from '../../src/systems/QuestGenerator.js';
import SettlementManager from '../../src/systems/SettlementManager.js';
import RelationManager from '../../src/systems/RelationManager.js';
import Character from '../../src/systems/Character.js';
import { gameState } from '../../src/core/GameState.js';
import saveManager from '../../src/systems/SaveManager.js';
import { SeededRandom } from '../../src/utils/rng.js';
import { RULES } from '../../src/core/rulesEngine.js';

const data = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));
const copy = value => JSON.parse(JSON.stringify(value));
let manager, relations, town, catalog;

function completedQuest(reputation = { faction: 'settlement', amount: 25 }) {
    const quest = { id: 'commission', name: 'Commission', status: 'active', type: 'kill',
        questGiver: { npcId: 'giver', settlementId: 'town' },
        objectives: [{ id: 'done', completed: true }], rewards: { xp: 100, gold: 20, reputation } };
    gameState.set('quests', { active: [quest], available: [], completed: [], failed: [] });
    return quest;
}

beforeEach(() => {
    gameState.reset();
    gameState.initNewGame('standing', {});
    catalog = data('cultures').cultures;
    town = { id: 'town', x: 0, y: 0, npcs: [
        { id: 'giver', name: 'Giver', role: 'merchant', offersQuest: true, culture: 'kethara' },
        { id: 'neighbour', name: 'Neighbour', culture: 'kethara' },
        { id: 'resident', name: 'Resident', culture: 'vaethori' }
    ] };
    gameState.set('world.settlements', [town]);
    gameState.set('world.metadata', { settlements: [copy(town)] });
    gameState.set('world.npcs', new Map(town.npcs.map(npc => [npc.id, npc])));
    gameState.set('character', new Character({ name: 'Hero', level: 1,
        class: data('classes').classes.find(entry => entry.id === 'dedication'),
        species: { traits: [], abilityScoreIncrease: {} }, gold: 0 }));
    relations = new RelationManager();
    relations.config = data('relations');
    relations.tierLookup = [...relations.config.tiers].sort((a, b) => a.min - b.min);
    manager = new QuestManager();
    vi.stubGlobal('window', { game: { relationManager: relations, npcGenerator: { culturesData: catalog } } });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('authored quest culture standing', () => {
    it.each([1, 5, 10])('pays each community culture once at level %s with real and restored plain characters', level => {
        const character = gameState.get('character');
        character.level = level;
        character.xp = RULES.progression.xpTable[level];
        gameState.set('character', { ...Character.fromJSON(copy(character.toJSON())) });
        const quest = completedQuest();
        gameState.set('factions', { kethara: 99, vaethori: 0 });
        const before = copy(quest);
        const preview = manager.getQuestReputationPreview(quest);
        expect(copy(quest)).toEqual(before);
        expect(preview.changes.map(change => change.targetId).sort()).toEqual(['kethara', 'vaethori']);
        const result = manager.completeQuest(quest.id);
        expect(result.success).toBe(true);
        expect(gameState.get('factions')).toEqual({ kethara: 100, vaethori: 25 });
        expect(result.rewards.reputation).toEqual(expect.arrayContaining([
            expect.objectContaining({ targetId: 'kethara', amount: 1, previous: 99, current: 100 }),
            expect.objectContaining({ targetId: 'vaethori', amount: 25, previous: 0, current: 25 })
        ]));
        expect(quest.reputationRewardReceipt.changes).toHaveLength(2);
        expect(gameState.get('world.metadata.settlements')[0].npcs[0].relations.history).toHaveLength(1);
        expect(manager.completeQuest(quest.id).success).toBe(false);
    });

    it('all includes every loaded culture with unset standing, deduplicating catalogue entries', () => {
        const quest = completedQuest({ faction: 'all', amount: 5 });
        window.game.npcGenerator.culturesData.push(copy(catalog[0]));
        const ids = [...new Set(catalog.map(culture => culture.id))];
        expect(manager.completeQuest(quest.id).rewards.reputation).toHaveLength(ids.length);
        for (const id of ids) {
            expect(gameState.get(`factions.${id}`)).toBe(5);
        }
    });

    it('both is the union of actual communities, never twice for overlapping cultures', () => {
        const third = catalog.find(culture => !['kethara', 'vaethori'].includes(culture.id));
        gameState.get('world.settlements').push({ id: 'destination', npcs: [
            { id: 'recipient', culture: third.id }, { id: 'other', culture: 'kethara' }
        ] });
        const quest = completedQuest({ faction: 'both', amount: 15 });
        quest.generationData = { targetSettlementId: 'destination' };
        const result = manager.completeQuest(quest.id);
        expect(result.rewards.reputation).toHaveLength(3);
        expect(gameState.get('factions.kethara')).toBe(15);
        expect(gameState.get(`factions.${third.id}`)).toBe(15);
    });

    it('actual generated delivery plus NPC assignment binds both to one deduplicated community', async () => {
        const generator = new QuestGenerator('standing', 'core');
        const template = data('quests').sideQuestTemplates.find(entry => entry.id === 'deliver-message');
        const quest = await generator.generateFromTemplate(template, town, 5, new SeededRandom('delivery'));
        new SettlementManager(null).assignQuestsToNPCs(town, [quest]);
        expect(quest.generationData.targetSettlementId).toBe('town');
        expect(quest.questGiver.settlementId).toBe('town');
        const preview = manager.getQuestReputationPreview(quest);
        expect(preview.available).toBe(true);
        expect(preview.changes).toHaveLength(2);
        expect(preview.changes.every(change => change.amount === template.rewards.reputation.amount)).toBe(true);
        quest.objectives.forEach(objective => {
            objective.completed = true;
        });
        quest.status = 'active';
        gameState.set('quests.active', [quest]);
        manager.completeQuest(quest.id);
        expect(gameState.get('factions')).toEqual({ kethara: 15, vaethori: 15 });
    });

    it.each(['unknown', 'missing-origin', 'missing-destination', 'missing-manager', 'invalid-amount'])(
        '%s standing stays unpaid while XP/gold/completion remain valid', problem => {
            const quest = completedQuest();
            if (problem === 'unknown') {
                quest.rewards.reputation.faction = 'invented';
            }
            if (problem === 'missing-origin') {
                quest.questGiver = { settlementId: 'absent' };
            }
            if (problem === 'missing-destination') {
                quest.rewards.reputation.faction = 'both';
            }
            if (problem === 'missing-manager') {
                window.game.relationManager = null;
            }
            if (problem === 'invalid-amount') {
                quest.rewards.reputation.amount = Infinity;
            }
            const preview = manager.getQuestReputationPreview(quest);
            expect(preview).toMatchObject({ available: false, changes: [] });
            const result = manager.completeQuest(quest.id);
            expect(result.success).toBe(true);
            expect(result.rewards).toMatchObject({ xp: 100, gold: 20, reputation: [] });
            expect(result.rewards.reputationWarning).toBeTruthy();
            expect(gameState.get('factions')).toEqual({});
            expect(quest.reputationRewardReceipt).toBeUndefined();
        });

    it('legacy giver fallback is real NPC data, never the current player town', () => {
        const quest = completedQuest();
        quest.questGiver = { npcId: 'giver' };
        gameState.set('world.settlements', []);
        gameState.set('world.metadata', {});
        expect(manager.getQuestReputationPreview(quest).changes.map(change => change.targetId)).toEqual(['kethara']);
        quest.questGiver = {};
        gameState.set('ui.currentSettlement', town);
        expect(manager.getQuestReputationPreview(quest).available).toBe(false);
    });

    it('honors a bound campaign return settlement and legacy settlement coordinates without guessing', () => {
        const quest = completedQuest();
        quest.questGiver = {};
        quest.objectives = [{ type: 'return', completed: true, requirement: { settlementId: 'town' } }];
        expect(manager.getQuestReputationPreview(quest).changes).toHaveLength(2);
        quest.objectives[0].requirement.settlementId = '{startSettlement}';
        expect(manager.getQuestReputationPreview(quest).available).toBe(false);
        quest.settlement = { id: '0_0', x: 0, y: 0 };
        expect(manager.getQuestReputationPreview(quest).changes).toHaveLength(2);
        delete quest.settlement.x;
        delete quest.settlement.y;
        expect(manager.getQuestReputationPreview(quest).changes).toHaveLength(2);
    });

    it('a failed standing consumer leaves no paid standing or success message', () => {
        const quest = completedQuest();
        vi.spyOn(relations, 'modifyFactionReputation').mockReturnValue(null);
        const message = vi.spyOn(gameState, 'addMessage');
        const result = manager.completeQuest(quest.id);
        expect(result.success).toBe(true);
        expect(result.rewards.reputation).toEqual([]);
        expect(result.rewards.reputationWarning).toBeTruthy();
        expect(gameState.get('factions')).toEqual({});
        expect(quest.reputationRewardReceipt.changes).toEqual([]);
        expect(message.mock.calls.some(([text]) => text.includes('+25 standing'))).toBe(false);
    });

    it('records actual zero clamped standing without pretending the authored amount was paid', () => {
        const quest = completedQuest();
        gameState.set('factions', { kethara: 100, vaethori: 100 });
        const result = manager.completeQuest(quest.id);
        expect(result.rewards.reputation.every(change => change.amount === 0 && change.current === 100)).toBe(true);
        expect(quest.reputationRewardReceipt.changes).toHaveLength(2);
    });

    it('reentry from standing and character observers cannot duplicate completion, personal bonuses or remove other quests', () => {
        const quest = completedQuest();
        const other = { ...copy(quest), id: 'other' };
        gameState.get('quests.active').push(other);
        const attempts = [];
        const onReward = () => attempts.push(manager.completeQuest(quest.id).success);
        const stopFaction = gameState.subscribe('factions', onReward);
        const stopCharacter = gameState.subscribe('character', onReward);
        try {
            expect(manager.completeQuest(quest.id).success).toBe(true);
        } finally {
            stopFaction(); stopCharacter();
        }
        expect(attempts.length).toBeGreaterThan(0);
        expect(attempts.every(success => !success)).toBe(true);
        expect(gameState.get('quests.completed')).toHaveLength(1);
        expect(gameState.get('quests.active').map(entry => entry.id)).toEqual(['other']);
        expect(town.npcs.every(npc => npc.relations.history.length === 1)).toBe(true);
        expect(gameState.get('factions')).toEqual({ kethara: 25, vaethori: 25 });
    });

    it('saved receipts prevent direct repeated reward calls and interrupted faction payment from paying twice', () => {
        const quest = completedQuest();
        let snapshot;
        const stop = gameState.subscribe('factions.kethara', () => {
            snapshot ||= copy(saveManager.serializeGameState());
        });
        manager.completeQuest(quest.id);
        stop();
        saveManager.deserializeGameState(snapshot);
        manager = new QuestManager();
        const restoredQuest = gameState.get('quests.active')[0];
        expect(manager.completeQuest(restoredQuest.id).success).toBe(true);
        expect(gameState.get('factions')).toEqual({ kethara: 25, vaethori: 25 });
        expect(gameState.get('character').xp).toBe(100);
        expect(gameState.get('character').gold).toBe(20);
        const before = copy(gameState.get('factions'));
        manager.awardRewards(copy(restoredQuest), gameState.get('character'));
        expect(gameState.get('factions')).toEqual(before);
        expect(gameState.get('character').xp).toBe(100);
    });

    it('rich explicit faction effects own standing and expose actual chosen deltas without a legacy reward', () => {
        const quest = completedQuest({ faction: 'all', amount: 500 });
        quest.participants = { giver: { npcId: 'giver', culture: 'kethara' } };
        quest.settlementId = '0,0';
        quest.resolutions = [{ id: 'report', location: 'settlement', reply: 'Reported', effects: [
            { id: 'standing', type: 'faction', participant: 'giver', amount: 10 },
            { id: 'trust', type: 'relation', participant: 'giver', modifier: 'questCompleteForNPC' }
        ] }];
        gameState.set('player', { x: 0, y: 0 });
        gameState.set('factions.kethara', 99);
        expect(manager.getQuestReputationPreview(quest).changes).toEqual([]);
        const result = manager.resolveQuest(quest.id, 'report');
        expect(result.success).toBe(true);
        expect(gameState.get('factions')).toEqual({ kethara: 100 });
        expect(result.rewards.reputation).toEqual([expect.objectContaining({ targetId: 'kethara', amount: 1 })]);
        expect(quest.rewardReceipt.summary.reputation).toEqual(result.rewards.reputation);
        expect(manager.resolveQuest(quest.id, 'report').success).toBe(false);
        expect(gameState.get('factions')).toEqual({ kethara: 100 });
    });
});
