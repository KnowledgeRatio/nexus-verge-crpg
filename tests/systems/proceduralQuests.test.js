import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import QuestGenerator from '../../src/systems/QuestGenerator.js';
import QuestManager from '../../src/systems/QuestManager.js';
import MerchantManager from '../../src/systems/MerchantManager.js';
import RelationManager from '../../src/systems/RelationManager.js';
import NPCGenerator from '../../src/systems/NPCGenerator.js';
import { Character } from '../../src/systems/Character.js';
import saveManager from '../../src/systems/SaveManager.js';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';

const data = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));
const bundles = data('quests').proceduralBundles;

describe('Public procedural quest flow', () => {
    let previous;
    let generator;
    let manager;
    let relations;
    let merchants;
    let town;
    beforeEach(() => {
        previous = { state: gameState.data, enabled: RULES.quests.proceduralCore.enabled,
            definitions: skillRegistry.definitions };
        skillRegistry.setDefinitions(data('skills').skills);
        RULES.quests.proceduralCore.enabled = true;
        town = { id: '2,3', x: 2, y: 3, name: 'Town', settlementType: 'town', npcs: [
            { id: 'giver', role: 'leader', name: 'Leader', offersQuest: true, culture: 'kethara' },
            { id: 'merchant', role: 'merchant', name: 'Merchant', offersQuest: true, culture: 'kethara' },
            { id: 'resident', role: 'innkeeper', name: 'Resident', offersQuest: true, culture: 'vaethori' }
        ] };
        gameState.data = {
            character: new Character({ name: 'Tester', level: 1,
                class: { id: 'dedication', hitDie: 8, savingThrowProficiencies: [], features: {} },
                species: { abilityScoreIncrease: {}, traits: [], speed: 30 },
                background: { skillProficiencies: [], startingGold: 100 } }),
            quests: { available: [], active: [], completed: [], failed: [] },
            world: { settlements: [town], generatedRegions: new Map(), npcs: new Map(),
                metadata: { features: [{ type: 'dungeon', name: 'Hall', x: 4, y: 7,
                    questHook: { nearestSettlementId: '2,3', distanceTiles: 6, namedBossId: 'goblin' } }] } },
            player: { position: { x: 2, y: 3 } }, dungeon: { active: false }, factions: {},
            ui: { messageLog: [] }, flags: {}
        };
        relations = new RelationManager();
        relations.config = data('relations');
        relations.tierLookup = [...relations.config.tiers];
        merchants = new MerchantManager('quest-seed');
        merchants.merchantInventoryData = data('merchantInventory');
        vi.stubGlobal('window', { game: { relationManager: relations, merchantManager: merchants,
            npcGenerator: { culturesData: data('cultures').cultures } },
        skillChallengeManager: { rollSkillCheck: vi.fn(() => ({ success: true })) } });
        vi.spyOn(console, 'log').mockImplementation(() => {});
        generator = new QuestGenerator('quest-seed', 'nexus-verge');
        generator.questData = { ...data('quests'), questComposition: null };
        generator.monsterData = data('monsters');
        manager = new QuestManager(generator);
    });
    afterEach(() => {
        gameState.data = previous.state;
        RULES.quests.proceduralCore.enabled = previous.enabled;
        skillRegistry.setDefinitions(previous.definitions);
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    async function generate(bundle, level = 1) {
        gameState.get('character').level = level;
        generator.questData = { ...generator.questData, proceduralBundles: [bundle] };
        const offers = await generator.generateQuestsForSettlement(town, level);
        const quest = offers.find(offer => offer.procedural);
        expect(quest).toBeDefined();
        expect(JSON.stringify(quest)).not.toMatch(/\{(?:giver|merchant|witness|claimant)Name\}/);
        expect(quest.description).toContain(quest.procedural.participants.giver.name);
        gameState.set('quests.available', offers);
        expect(manager.acceptQuest(quest.id, 'wrong-npc')).toBe(false);
        expect(manager.acceptQuest(quest.id, quest.questGiver.npcId)).toBe(true);
        return quest;
    }
    function enterSite(quest) {
        gameState.set('dungeon', { active: true, dungeonId: quest.dungeonHookId.replace(',', '_'), currentRoomIndex: 0 });
        manager.onRoomEntered(4, 7, 0, gameState.get('character'));
    }
    function enterTown() {
        gameState.set('dungeon.active', false);
        gameState.set('player.position', { x: 2, y: 3 });
    }

    it.each(bundles.flatMap(bundle => [1, 5, 10].map(level => [bundle.id, level])))(
        'resolves generated %s at level %i with once-only effects', async (id, level) => {
            const quest = await generate(bundles.find(bundle => bundle.id === id), level);
            expect(manager.completeQuest(quest.id).success).toBe(false);
            for (const action of quest.actions.filter(action => action.location === 'settlement')) {
                expect(manager.recordQuestAction(quest.id, action.id).success).toBe(false);
                expect(manager.recordQuestAction(quest.id, action.id,
                    quest.procedural.participants[action.npcParticipant].npcId).success).toBe(true);
            }
            enterSite(quest);
            expect(window.skillChallengeManager.rollSkillCheck).not.toHaveBeenCalled();
            for (const action of quest.actions.filter(action => action.location === 'site')) {
                expect(manager.recordQuestAction(quest.id, action.id).success).toBe(true);
            }
            const full = quest.resolutions.find(choice => !choice.incomplete);
            expect(manager.resolveQuest(quest.id, full.id).success).toBe(false);
            enterTown();
            const result = manager.resolveQuest(quest.id, full.id);
            expect(result.success).toBe(true);
            expect(result.rewards).toMatchObject({ xp: 80 * level, gold: 20 * level });
            expect(Object.values(gameState.get('factions')).reduce((sum, value) => sum + value, 0)).toBe(10);
            expect(manager.resolveQuest(quest.id, full.id).success).toBe(false);
            expect(manager.completeQuest(quest.id).success).toBe(false);
            const saved = JSON.parse(JSON.stringify(saveManager.serializeGameState()));
            saveManager.deserializeGameState(saved);
            expect(manager.getQuest(quest.id).resolution.reply).toBe(full.reply);
            expect(manager.resolveQuest(quest.id, full.id).success).toBe(false);
            if (full.effects.some(effect => effect.type === 'merchant_stock')) {
                expect(gameState.get('world.settlements')[0].questStock).toMatchObject([
                    { itemId: 'rations', remaining: RULES.quests.proceduralCore.shipmentQuantity }
                ]);
            }
        });

    it('preserves observations on failure and charges only deliberate retries', async () => {
        const quest = await generate(bundles.find(bundle => bundle.id === 'handling_mistake'));
        manager.onRoomEntered(4, 7, 0, gameState.get('character'));
        expect(quest.evidence.facts).toEqual([]);
        enterSite(quest);
        const observations = [...quest.evidence.facts];
        window.skillChallengeManager.rollSkillCheck.mockReturnValue({ success: false });
        expect(manager.recordQuestAction(quest.id, 'interpret').attempted).toBe(true);
        expect(quest.evidence.facts).toEqual(observations);
        const fatigue = gameState.get('fatigue.current') || 0;
        manager.onRoomEntered(4, 7, 0, gameState.get('character'));
        expect(window.skillChallengeManager.rollSkillCheck).toHaveBeenCalledTimes(1);
        manager.recordQuestAction(quest.id, 'interpret');
        expect(gameState.get('fatigue.current')).toBe(fatigue + RULES.fatigue.skillChallengeFatigue);
        enterTown();
        const result = manager.resolveQuest(quest.id, 'honest_inconclusive');
        expect(result.rewards).toMatchObject({ xp: 40, gold: 10 });
        expect(gameState.get('factions')).toEqual({});
        expect(result.quest.resolution.appliedEffects).toEqual([]);
    });

    it('withholds duplicate simultaneous incidents and keeps saved quests playable when disabled', async () => {
        const quest = await generate(bundles[0]);
        expect((await generator.generateQuestsForSettlement(town, 1)).some(offer => offer.procedural)).toBe(false);
        RULES.quests.proceduralCore.enabled = false;
        enterSite(quest);
        expect(manager.recordQuestAction(quest.id, 'recover_consignment').success).toBe(true);
        enterTown();
        expect(manager.resolveQuest(quest.id, 'return_goods').success).toBe(true);
    });

    it('repairs public kill and item objectives with live target guards', async () => {
        const offers = await generator.generateQuestsForSettlement(town, 1);
        gameState.set('quests.active', offers.filter(quest => !quest.procedural));
        const kill = offers.find(quest => quest.type === 'kill');
        manager.onCreatureKilled('goblin', { x: 9, y: 9 });
        expect(kill.objectives[0].completed).toBe(false);
        manager.onCreatureKilled('goblin', { x: 4, y: 7 });
        expect(kill.objectives[0].completed).toBe(true);
        const retrieve = offers.find(quest => quest.type === 'retrieve');
        manager.onItemAcquired(retrieve.pendingBind.itemId);
        expect(retrieve.objectives[0].completed).toBe(true);
    });

    it('binds the real merchant when generated town NPCs also contain a blacksmith', async () => {
        vi.stubGlobal('fetch', vi.fn(async path => ({ json: async () => data(path.replace(/^data\//, '').split('.')[0]) })));
        const npcs = new NPCGenerator('quest-seed', 'nexus-verge');
        town.npcs = await npcs.generateNPCsForSettlement(town);
        window.game.npcGenerator = npcs;
        expect(town.npcs.some(npc => npc.role === 'blacksmith')).toBe(true);
        expect(town.npcs.some(npc => npc.role === 'merchant')).toBe(true);
        const quest = await generate(bundles[0]);
        expect(quest.procedural.participants.merchant.role).toBe('merchant');
    });

    it('persists relation changes across distinct NPC copies and save restoration', async () => {
        gameState.set('world.npcs', new Map(town.npcs.map(npc => [npc.id, JSON.parse(JSON.stringify(npc))])));
        const quest = await generate(bundles[0]);
        enterSite(quest);
        manager.recordQuestAction(quest.id, 'recover_consignment');
        enterTown();
        expect(manager.resolveQuest(quest.id, 'return_goods').success).toBe(true);
        const npcId = quest.procedural.participants.merchant.npcId;
        const score = gameState.get('world.npcs').get(npcId).relations.score;
        expect(score).toBeGreaterThan(0);
        saveManager.deserializeGameState(JSON.parse(JSON.stringify(saveManager.serializeGameState())));
        expect(gameState.get('world.npcs').get(npcId).relations.score).toBe(score);
        expect(gameState.get('world.settlements')[0].npcs.find(npc => npc.id === npcId).relations.score).toBe(score);
    });

    it.each([['abandoned_consignment', 'return_goods_explained'], ['disputed_kit', 'award_a_corroborated']])(
        'gives evidence a concrete trust outcome in %s without another commission', async (id, choiceId) => {
            const quest = await generate(bundles.find(bundle => bundle.id === id));
            const modify = vi.spyOn(relations, 'modifyRelation');
            for (const action of quest.actions.filter(action => action.location === 'settlement')) {
                manager.recordQuestAction(quest.id, action.id, quest.procedural.participants[action.npcParticipant].npcId);
            }
            enterSite(quest);
            for (const action of quest.actions.filter(action => action.location === 'site')) {
                manager.recordQuestAction(quest.id, action.id);
            }
            enterTown();
            const result = manager.resolveQuest(quest.id, choiceId);
            expect(result.success).toBe(true);
            expect(result.rewards).toMatchObject({ xp: 80, gold: 20 });
            expect(modify.mock.calls.some(([, modifier, options]) => modifier === 'dialogueSkillCheckPass'
                && options.contributeToFaction === false)).toBe(true);
            expect(Object.values(gameState.get('factions')).reduce((sum, points) => sum + points, 0)).toBe(10);
        }
    );

    it('cannot reenter resolution through synchronous faction subscribers', async () => {
        const quest = await generate(bundles[0]);
        enterSite(quest);
        manager.recordQuestAction(quest.id, 'recover_consignment');
        enterTown();
        let recursive;
        const unsubscribe = gameState.subscribe('factions.kethara', () => {
            recursive = manager.resolveQuest(quest.id, 'return_goods');
        });
        try {
            expect(manager.resolveQuest(quest.id, 'return_goods').success).toBe(true);
            expect(recursive.success).toBe(false);
            expect(gameState.get('quests.completed')).toHaveLength(1);
            expect(gameState.get('factions.kethara')).toBe(10);
        } finally {
            unsubscribe();
        }
    });

    it('does not publish bundles that promise unsupported outcome handlers', async () => {
        const invalid = JSON.parse(JSON.stringify(bundles[0]));
        invalid.resolutions[0].effects.push({ id: 'fake', type: 'repair_expedition', participant: 'giver' });
        generator.questData.proceduralBundles = [invalid];
        expect((await generator.generateQuestsForSettlement(town, 1)).some(quest => quest.procedural)).toBe(false);
    });
});
