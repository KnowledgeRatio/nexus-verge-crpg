import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import QuestManager from '../../src/systems/QuestManager.js';
import QuestGenerator from '../../src/systems/QuestGenerator.js';
import { DungeonManager } from '../../src/systems/DungeonManager.js';
import { gameState } from '../../src/core/GameState.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import { RULES } from '../../src/core/rulesEngine.js';

const data = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));
describe('Frozen quest iteration and commitment lifecycle', () => {
    let previous;
    let manager;
    let relations;
    let consumer;
    beforeEach(() => {
        previous = { state: gameState.data, skills: skillRegistry.definitions };
        skillRegistry.setDefinitions(data('skills').skills);
        const giver = { id: 'giver', name: 'Giver', culture: 'kethara', role: 'leader', offersQuest: true, relations: {} };
        gameState.data = { world: { worldClock: 2, npcs: new Map([['giver', giver]]),
            settlements: [{ id: '0,0', x: 0, y: 0, name: 'Town', npcs: [giver,
                { id: 'merchant', name: 'Merchant', culture: 'kethara', role: 'merchant' }] }],
            metadata: { features: [{ x: 1, y: 1, type: 'dungeon', name: 'Site' }] } },
        quests: { available: [], active: [], completed: [], failed: [] },
        character: { level: 1, inventory: [] }, player: { position: { x: 0, y: 0 } },
        dungeon: { active: false }, ui: { messageLog: [] } };
        relations = { config: { modifiers: { questCompleteForNPC: {}, dialogueSkillCheckPass: {} } },
            modifyRelation: vi.fn(() => true), modifyFactionReputation: vi.fn(() => true) };
        consumer = { canApplyQuestEffect: vi.fn(() => true), applyQuestEffect: vi.fn(() => true) };
        vi.stubGlobal('window', { game: { relationManager: relations, consequenceManager: consumer,
            npcGenerator: { culturesData: [{ id: 'kethara' }] },
            merchantManager: { canAddQuestStock: () => true, canAddQuestSpecialistStock: () => false } } });
        manager = new QuestManager(null);
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });
    afterEach(() => {
        gameState.data = previous.state;
        skillRegistry.setDefinitions(previous.skills);
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });
    function offer() {
        const quest = { id: 'urgent', name: 'Urgent work', iteration: { version: 1 }, status: 'available',
            settlementId: '0,0', questGiver: { npcId: 'giver' }, deadlineDuration: 3,
            deadlineObjectives: ['observe'], objectives: [{ id: 'observe', completed: false }],
            procedural: { participants: { giver: { npcId: 'giver', culture: 'kethara' } } },
            failureEffects: [{ id: 'danger', type: 'local_safety', siteId: '1,1' }] };
        gameState.get('quests.available').push(quest);
        return quest;
    }
    it('starts the clock only on acceptance and applies expiry and standing exactly once', () => {
        const quest = offer();
        gameState.set('world.worldClock', 20);
        manager.checkQuestDeadlines();
        expect(quest.status).toBe('available');
        manager.acceptQuest(quest.id, 'giver');
        expect(quest.deadlineAt).toBe(23);
        gameState.set('world.worldClock', 23);
        manager.checkQuestDeadlines();
        manager.checkQuestDeadlines();
        expect(quest.status).toBe('failed');
        expect(consumer.applyQuestEffect).toHaveBeenCalledTimes(1);
        expect(relations.modifyFactionReputation).toHaveBeenCalledWith('kethara', -5);
        expect(relations.modifyRelation).toHaveBeenCalledWith(expect.anything(), 'questAbandoned',
            { exactPoints: -10, contributeToFaction: false });
        expect(manager.abandonQuest(quest.id)).toBe(false);
    });
    it('completed obligations stop expiry across plain-object restore', () => {
        const quest = offer();
        manager.acceptQuest(quest.id, 'giver');
        quest.objectives[0].completed = true;
        manager.checkQuestDeadlines();
        gameState.set('quests', JSON.parse(JSON.stringify(gameState.get('quests'))));
        gameState.set('world.worldClock', 100);
        manager.checkQuestDeadlines();
        expect(gameState.get('quests.active')).toHaveLength(1);
        expect(manager.getQuestDeadlineState(gameState.get('quests.active')[0]).suspended).toBe(true);
        expect(consumer.applyQuestEffect).not.toHaveBeenCalled();
    });
    it('protects pending handover and blocks abandonment while an expiry consumer retries', () => {
        const quest = offer();
        manager.acceptQuest(quest.id, 'giver');
        quest.resolutionPending = { choiceId: 'deliver' };
        gameState.set('world.worldClock', 100);
        manager.checkQuestDeadlines();
        expect(quest.status).toBe('active');
        delete quest.resolutionPending;
        consumer.applyQuestEffect.mockReturnValueOnce(false);
        manager.checkQuestDeadlines();
        expect(quest.expiryPending).toBe(true);
        consumer.canApplyQuestEffect.mockReturnValue(false);
        expect(manager.abandonQuest(quest.id)).toBe(false);
        expect(manager.getQuestActions(quest.id)).toEqual([]);
        consumer.canApplyQuestEffect.mockReturnValue(true);
        manager.checkQuestDeadlines();
        expect(quest.status).toBe('failed');
        expect(quest.expiryEffectsApplied).toEqual(['danger']);
        expect(relations.modifyFactionReputation).toHaveBeenCalledTimes(1);
    });
    it('does not freeze unrelated ordinary dungeon encounters', () => {
        const dungeon = new DungeonManager(null, null);
        dungeon.currentDungeon = { x: 1, y: 1 };
        expect(dungeon.getEncounterLevel(5)).toBe(5);
        gameState.get('quests.active').push({ iteration: { version: 1 }, offeredLevel: 1, dungeonHookId: '1,1' });
        expect(dungeon.getEncounterLevel(5)).toBe(1);
        dungeon.currentDungeon.questEncounterLevel = 1;
        gameState.set('quests.active', []);
        expect(dungeon.getEncounterLevel(10)).toBe(1);
    });
    it('requires every possible actual boss to meet the offered-level budget floor', () => {
        const generator = new QuestGenerator('boss-floor', 'nexus-verge');
        generator.monsterData = data('monsters');
        expect(generator._hasAppropriateQuestBoss({}, ['veteran'], 10)).toBe(false);
        expect(generator._hasAppropriateQuestBoss({}, ['wraith'], 10)).toBe(true);
        expect(generator._hasAppropriateQuestBoss({}, ['youngWhiteDragon'], 10)).toBe(true);
        expect(generator._hasAppropriateQuestBoss({}, ['veteran', 'wraith'], 10)).toBe(false);
        expect(generator._hasAppropriateQuestBoss({}, ['missing-monster'], 10)).toBe(false);
        expect(generator._hasAppropriateQuestBoss({}, ['spy'], 1)).toBe(true);
        expect(generator._hasAppropriateQuestBoss({ generated: true, rooms: [{ isBossRoom: true, boss: 'wraith' }] },
            ['veteran'], 10)).toBe(true);
        expect(generator._hasAppropriateQuestBoss({}, [{ id: 'wraith', minLevel: 5, maxLevel: 9 }], 10)).toBe(true);
    });
    it('withholds weak new L10 boss work while preserving the disabled legacy publication path', () => {
        const generator = new QuestGenerator('boss-publication', 'nexus-verge');
        generator.questData = data('quests');
        generator.monsterData = data('monsters');
        const grammar = generator.questData.questComposition;
        grammar.dimensions.goal = grammar.dimensions.goal.filter(entry => entry.id === 'access');
        const site = { x: 1, y: 1, name: 'Site', dungeonType: { bossPool: ['veteran'] } };
        window.game.dungeonManager = { canClearQuestEncounter: () => true, clearQuestEncounter: () => true };
        const rng = { choice: entries => entries[0], nextInt: () => 1234, next: () => 0 };
        const generate = () => generator._generateComposedQuest(gameState.get('world.settlements')[0], 10, [site], rng);
        expect(generate()).toBeNull();
        const enabled = RULES.quests.iteration.enabled;
        try {
            RULES.quests.iteration.enabled = false;
            expect(generate().type).toBe('kill');
        } finally {
            RULES.quests.iteration.enabled = enabled;
        }
        site.dungeonType.bossPool = ['wraith'];
        expect(generate().difficulty).toBe('deadly');
    });
    it.each([1, 5, 10])('publishes frozen level %i DC, risk payout and consequences', async level => {
        gameState.get('world.metadata.features').push({ type: 'dungeon', x: 3, y: 2, name: 'Hidden vault', explored: false });
        const generator = new QuestGenerator(`iteration-${level}`, 'nexus-verge');
        generator.questData = data('quests');
        generator.monsterData = data('monsters');
        const grammar = generator.questData.questComposition;
        grammar.dimensions.subject = grammar.dimensions.subject.filter(entry => entry.id === 'rations');
        grammar.dimensions.goal = grammar.dimensions.goal.filter(entry => entry.id === 'recovery');
        grammar.dimensions.hazard = grammar.dimensions.hazard.filter(entry => entry.id === 'unopposed');
        grammar.dimensions.materialState = grammar.dimensions.materialState.filter(entry => entry.id === 'damaged');
        const site = { x: 1, y: 1, name: 'Site', type: 'dungeon',
            questHook: { nearestSettlementId: '0,0', distanceTiles: 2 } };
        const quest = generator._generateComposedQuest(gameState.get('world.settlements')[0], level, [site],
            { choice: entries => entries[0], nextInt: () => 1234, next: () => 0 });
        const tier = RULES.quests.iteration.tiers.find(entry => level <= entry.maxLevel);
        expect(quest.offeredLevel).toBe(level);
        expect(quest.actions.filter(action => action.skillId).every(action => action.dc === tier.dc)).toBe(true);
        expect(quest.rewards).toEqual({ xp: 120 * level, gold: 30 * level });
        expect(quest.resolutions[0].effects.find(effect => effect.type === 'faction').amount).toBe(15);
        expect(quest.resolutions[0].effects.some(effect => effect.type === 'local_safety')).toBe(true);
        expect(quest.resolutions.find(choice => choice.id === 'deliver_explained').effects)
            .toContainEqual(expect.objectContaining({ type: 'reveal_location', siteId: '3,2' }));
        expect(quest.resolutions[0].effects.some(effect => effect.type === 'reveal_location')).toBe(false);
        gameState.set('character.level', 10);
        expect(quest.actions.find(action => action.skillId).dc).toBe(tier.dc);
    });
});
