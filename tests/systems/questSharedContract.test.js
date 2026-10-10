import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import QuestGenerator from '../../src/systems/QuestGenerator.js';
import QuestManager from '../../src/systems/QuestManager.js';
import MerchantManager from '../../src/systems/MerchantManager.js';
import RelationManager from '../../src/systems/RelationManager.js';
import { DungeonManager } from '../../src/systems/DungeonManager.js';
import { Character } from '../../src/systems/Character.js';
import { isRichQuest, getCustodyQuantity } from '../../src/systems/ProceduralQuest.js';
import saveManager from '../../src/systems/SaveManager.js';
import { gameState } from '../../src/core/GameState.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import { RULES } from '../../src/core/rulesEngine.js';

const data = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));

describe('Shared objective, encounter and custody contract', () => {
    let previous;
    let manager;
    let generator;
    let dungeonManager;
    let merchantManager;
    let relationManager;
    let town;
    beforeEach(() => {
        previous = { state: gameState.data, definitions: skillRegistry.definitions };
        skillRegistry.setDefinitions(data('skills').skills);
        town = { id: '2,3', x: 2, y: 3, name: 'Town', settlementType: 'town', npcs: [
            { id: 'giver', name: 'Commissioner', role: 'leader', culture: 'kethara', offersQuest: true },
            { id: 'merchant', name: 'Supplier', role: 'merchant', culture: 'vaethori', offersQuest: true }
        ] };
        const dungeonType = data('dungeonTypes').dungeonTypes[0];
        gameState.data = {
            character: new Character({ name: 'Tester', level: 1,
                class: { id: 'dedication', hitDie: 8, savingThrowProficiencies: [], features: {} },
                species: { abilityScoreIncrease: {}, traits: [], speed: 30 },
                background: { skillProficiencies: [], startingGold: 100 } }),
            quests: { available: [], active: [], completed: [], failed: [] },
            world: { settlements: [town], generatedRegions: new Map(), npcs: new Map(), metadata: { features: [
                { type: 'dungeon', x: 4, y: 7, name: 'Hall', dungeonType,
                    questHook: { nearestSettlementId: '2,3', distanceTiles: 6, namedBossId: 'bandit' } }
            ] } }, player: { position: { x: 2, y: 3 } }, dungeon: { active: false }, factions: {},
            ui: { messageLog: [] }, flags: {}
        };
        relationManager = new RelationManager();
        relationManager.config = data('relations');
        relationManager.tierLookup = relationManager.config.tiers;
        merchantManager = new MerchantManager('shared-contract');
        merchantManager.merchantInventoryData = data('merchantInventory');
        dungeonManager = new DungeonManager(null, null);
        vi.stubGlobal('window', { game: { relationManager, merchantManager, dungeonManager,
            npcGenerator: { culturesData: data('cultures').cultures } },
        skillChallengeManager: { rollSkillCheck: vi.fn(() => ({ success: true })) } });
        vi.spyOn(console, 'log').mockImplementation(() => {});
        generator = new QuestGenerator('shared-contract', 'nexus-verge');
        generator.questData = data('quests');
        generator.monsterData = data('monsters');
        manager = new QuestManager(generator);
    });
    afterEach(() => {
        gameState.data = previous.state;
        skillRegistry.setDefinitions(previous.definitions);
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    async function generate({ hazard = 'unopposed', materialState = 'damaged', goal = 'recovery', level = 1 } = {}) {
        gameState.get('character').level = level;
        const grammar = generator.questData.questComposition;
        for (const [dimension, id] of Object.entries({ hazard, materialState, goal })) {
            grammar.dimensions[dimension] = grammar.dimensions[dimension].filter(component => component.id === id);
        }
        const quests = await generator.generateQuestsForSettlement(town, level);
        const quest = quests.find(entry => entry.procedural?.components);
        expect(quest).toBeDefined();
        gameState.set('quests.available', quests);
        expect(manager.acceptQuest(quest.id, quest.questGiver.npcId)).toBe(true);
        return quest;
    }
    function enterSite(roomIndex = 0, level = 1) {
        const boss = level < 5 ? 'spy' : 'berserker';
        gameState.set('dungeon', { active: true, dungeonId: '4_7', worldMapPosition: { x: 4, y: 7 },
            currentRoomIndex: roomIndex, rooms: [{ isBossRoom: false }, { isBossRoom: true, boss }],
            bossDefeated: false });
        manager.onRoomEntered(4, 7, roomIndex, gameState.get('character'));
    }
    function enterTown() {
        gameState.set('dungeon.active', false);
        gameState.set('player.position', { x: 2, y: 3 });
    }
    function restore() {
        saveManager.deserializeGameState(JSON.parse(JSON.stringify(saveManager.serializeGameState())));
    }
    function victory(level = 1) {
        enterSite(1, level);
        const source = dungeonManager.getQuestEncounterSource(level < 5 ? 'spy' : 'berserker');
        expect(source).toBeDefined();
        manager.onQuestEncounterVictory(source);
        dungeonManager.markBossDefeated(source);
        return source;
    }

    it('uses stable observation IDs and shared capabilities without procedural provenance', async () => {
        const quest = await generate({ hazard: 'occupied' });
        quest.participants = quest.procedural.participants;
        delete quest.procedural;
        quest.objectives.reverse();
        expect(isRichQuest(quest)).toBe(true);
        enterSite();
        expect(quest.objectives.find(objective => objective.id === 'observe_site').completed).toBe(true);
        expect(quest.objectives.find(objective => objective.id === 'defeat_occupation').completed).toBe(false);
        expect(quest.objectives.find(objective => objective.id === 'recover_goods').completed).toBe(false);
        expect(manager.recordQuestAction(quest.id, 'recover_goods').success).toBe(false);
        expect(manager.completeQuest(quest.id).success).toBe(false);
        victory();
        enterSite();
        expect(manager.recordQuestAction(quest.id, 'recover_goods').success).toBe(true);
        enterTown();
        expect(manager.resolveQuest(quest.id, 'deliver_goods').success).toBe(true);
    });

    it('reevaluates observation prerequisites after the facts are already known', async () => {
        const quest = await generate({ hazard: 'occupied' });
        const observation = quest.objectives.find(objective => objective.id === 'observe_site');
        observation.requiresObjectives = ['defeat_occupation'];
        enterSite();
        expect(quest.evidence.facts).toContain('site_observed');
        expect(observation.completed).toBe(false);
        victory();
        enterSite();
        expect(observation.completed).toBe(true);
        expect(quest.objectives.find(objective => objective.id === 'recover_goods').completed).toBe(false);
    });

    it.each([1, 5, 10])('delivers actual base or salvaged quantity at level %i', async level => {
        const quest = await generate({ level });
        enterSite(0, level);
        expect(manager.recordQuestAction(quest.id, 'recover_goods').success).toBe(true);
        const itemId = quest.actions.find(action => action.acquire).acquire.itemId;
        const custody = { itemId, sourceId: 'consignment' };
        expect(getCustodyQuantity(quest, custody)).toBe(2);
        expect(manager.recordQuestAction(quest.id, 'recover_goods').success).toBe(false);
        const boundItem = gameState.get('character.inventory').find(item => item.questSource);
        expect(boundItem).toMatchObject({ type: 'quest_item', usable: false, canDrop: false,
            instanceId: `${quest.id}:consignment` });
        restore();
        expect(gameState.get('dungeon.active')).toBe(false);
        enterSite(0, level);
        expect(manager.recordQuestAction(quest.id, 'salvage_goods').success).toBe(true);
        const restoredQuest = manager.getQuest(quest.id);
        expect(getCustodyQuantity(restoredQuest, custody)).toBe(3);
        expect(manager.recordQuestAction(quest.id, 'salvage_goods').success).toBe(false);
        gameState.get('character.inventory').push({ id: itemId, quantity: 99 });
        enterTown();
        const result = manager.resolveQuest(quest.id, 'deliver_goods');
        expect(result.success).toBe(true);
        expect(result.rewards).toMatchObject({ xp: 80 * level, gold: 20 * level });
        expect(result.quest.resolution.deliveries[0].quantity).toBe(3);
        expect(gameState.get('world.settlements')[0].questStock[0].remaining).toBe(3);
        expect(gameState.get('character.inventory')).toContainEqual({ id: itemId, quantity: 99 });
        expect(getCustodyQuantity(restoredQuest, custody)).toBe(0);
        restore();
        expect(manager.resolveQuest(quest.id, 'deliver_goods').success).toBe(false);
    });

    it('failed optional salvage retains the full base commission and only base stock', async () => {
        const quest = await generate();
        enterSite();
        manager.recordQuestAction(quest.id, 'recover_goods');
        window.skillChallengeManager.rollSkillCheck.mockReturnValue({ success: false });
        const result = manager.recordQuestAction(quest.id, 'salvage_goods');
        expect(result.attempted).toBe(true);
        expect(gameState.get('fatigue.current') || 0).toBe(0);
        manager.recordQuestAction(quest.id, 'salvage_goods');
        expect(gameState.get('fatigue.current')).toBe(RULES.fatigue.skillChallengeFatigue);
        enterTown();
        expect(manager.resolveQuest(quest.id, 'report_inconclusive').success).toBe(false);
        expect(manager.resolveQuest(quest.id, 'deliver_goods').rewards).toMatchObject({ xp: 80, gold: 20 });
        expect(gameState.get('world.settlements')[0].questStock[0].remaining).toBe(2);
    });

    it('requires actual custody and rejects ordinary same-ID notifications and other incident goods', async () => {
        const quest = await generate();
        enterSite();
        const requirement = quest.objectives.find(objective => objective.id === 'recover_goods').requirement;
        gameState.get('character.inventory').push({ id: requirement.itemId, quantity: 100 });
        manager.onItemAcquired(requirement.itemId);
        manager.onItemAcquired(requirement.itemId, { questId: quest.id, sourceId: requirement.sourceId });
        expect(quest.objectives.find(objective => objective.id === 'recover_goods').completed).toBe(false);
        manager.recordQuestAction(quest.id, 'recover_goods');
        gameState.get('character.inventory').find(item => item.questSource).questSource.questId = 'another-incident';
        enterTown();
        expect(manager.resolveQuest(quest.id, 'deliver_goods').success).toBe(false);
    });

    it('requires matching captured encounter proof and clears only the bound boss slot', async () => {
        const quest = await generate({ hazard: 'occupied', materialState: 'unavailable', goal: 'access' });
        enterSite();
        enterSite(1);
        const source = dungeonManager.getQuestEncounterSource('spy');
        const objective = quest.objectives.find(entry => entry.id === 'defeat_occupation');
        for (const wrong of [{ siteId: '9,9' }, { encounterKey: '4,7:ordinary' },
            { encounterRole: 'ordinary' }, { outcome: 'fled' }]) {
            expect(manager.onQuestEncounterVictory({ ...source, ...wrong })).toEqual([]);
        }
        manager.onCreatureKilled('spy', { x: 4, y: 7 });
        expect(objective.completed).toBe(false);
        gameState.set('player.position', { x: 99, y: 99 });
        expect(manager.onQuestEncounterVictory(source)).toContain('defeat_occupation');
        expect(objective.proof).toEqual(source);
        expect(manager.onQuestEncounterVictory(source)).toEqual([]);
        enterTown();
        expect(manager.resolveQuest(quest.id, 'report_cleared').success).toBe(false);
        dungeonManager.markBossDefeated(source);
        const result = manager.resolveQuest(quest.id, 'report_cleared');
        expect(result.success).toBe(true);
        expect(gameState.get('world.metadata.features')[0].questEncounterClears).toHaveLength(1);
        restore();
        expect(manager.getQuest(quest.id).resolution.appliedEffects).toContain('cleared_occupation');
    });

    it('resumes an interrupted handover without duplicate goods, relations, faction or commission', async () => {
        const quest = await generate();
        enterSite();
        manager.recordQuestAction(quest.id, 'recover_goods');
        enterTown();
        const original = merchantManager.addQuestStock.bind(merchantManager);
        vi.spyOn(merchantManager, 'addQuestStock').mockReturnValueOnce(false).mockImplementation(original);
        expect(manager.resolveQuest(quest.id, 'deliver_goods').success).toBe(false);
        expect(gameState.get('factions.vaethori')).toBe(10);
        expect(quest.resolutionPending.custodyConsumed).toBe(true);
        expect(quest.resolutionPending.appliedEffects).toContain('standing_recipient');
        restore();
        const result = manager.resolveQuest(quest.id, 'deliver_goods');
        expect(result.success).toBe(true);
        expect(gameState.get('factions.vaethori')).toBe(10);
        expect(result.rewards).toMatchObject({ xp: 80, gold: 20 });
        expect(gameState.get('world.settlements')[0].questStock[0].remaining).toBe(2);
    });

    it('keeps legacy objectives-only completion and ID-based acquisition available', () => {
        const legacy = { id: 'legacy', type: 'retrieve', status: 'active', objectives: [
            { type: 'retrieve', requirement: { itemId: 'legacy-item' }, completed: false, required: 1, progress: 0 }
        ], rewards: { xp: 80, gold: 20 } };
        gameState.set('quests.active', [legacy]);
        expect(isRichQuest(legacy)).toBe(false);
        manager.onItemAcquired('legacy-item');
        expect(manager.completeQuest(legacy.id).success).toBe(true);
    });

    it('relinquishes only the abandoned commission goods and protects pending transfers', async () => {
        const quest = await generate();
        enterSite();
        manager.recordQuestAction(quest.id, 'recover_goods');
        const otherGoods = { id: 'rations', quantity: 4, questSource: { questId: 'other', sourceId: 'consignment' } };
        gameState.get('character.inventory').push(otherGoods);
        expect(manager.abandonQuest(quest.id)).toBe(true);
        expect(gameState.get('character.inventory')).toContainEqual(otherGoods);
        expect(gameState.get('character.inventory').some(item => item.questSource?.questId === quest.id)).toBe(false);
        expect(manager.recordQuestAction(quest.id, 'recover_goods').success).toBe(false);
        gameState.set('quests.active', [{ ...quest, id: 'pending', status: 'active', resolutionPending: { choiceId: 'delivery' } }]);
        expect(manager.abandonQuest('pending')).toBe(false);
    });
});
