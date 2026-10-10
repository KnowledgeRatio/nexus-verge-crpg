import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuestGenerator from '../../src/systems/QuestGenerator.js';
import QuestManager from '../../src/systems/QuestManager.js';
import SettlementManager from '../../src/systems/SettlementManager.js';
import saveManager from '../../src/systems/SaveManager.js';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';
import { SeededRandom } from '../../src/utils/rng.js';
import { Character } from '../../src/systems/Character.js';

const makeSettlement = () => ({ id: '2,3', x: 2, y: 3, name: 'Test Town', settlementType: 'town' });
const savedCopy = value => JSON.parse(JSON.stringify(value));
const makeHooks = () => [
    { type: 'dungeon', x: 4, y: 7, name: 'Ruined Hall',
        questHook: { nearestSettlementId: '2,3', distanceTiles: 6, namedBossId: 'goblin' } },
    { type: 'poi', resolvedType: 'dungeon', x: 8, y: 9, name: 'Old Mine',
        questHook: { nearestSettlementId: '2,3', distanceTiles: 12 } }
];

describe('Generated Investigation target contract', () => {
    let previous;
    let generator;
    let manager;

    beforeEach(() => {
        previous = { data: gameState.data, hooks: RULES.quests.enableWorldHooks,
            budget: RULES.quests.questSlotBudget.town };
        RULES.quests.enableWorldHooks = true;
        RULES.quests.questSlotBudget.town = 3;
        gameState.data = {
            character: new Character({ name: 'Search fixture', level: 5,
                class: { id: 'dedication', hitDie: 8, savingThrowProficiencies: [], features: {} },
                species: { abilityScoreIncrease: {}, traits: [], speed: 30 },
                background: { skillProficiencies: [], startingGold: 100 } }),
            quests: { available: [], active: [], completed: [], failed: [] },
            world: { metadata: { features: [] }, generatedRegions: new Map(), npcs: new Map(), settlements: [] },
            player: {}, ui: { messageLog: [] }, flags: {}
        };
        generator = new QuestGenerator('target-contract-baseline', 'core');
        generator.questData = {};
        generator.monsterData = { monsters: [] };
        manager = new QuestManager();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.stubGlobal('window', {});
    });

    afterEach(() => {
        gameState.data = previous.data;
        RULES.quests.enableWorldHooks = previous.hooks;
        RULES.quests.questSlotBudget.town = previous.budget;
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it.each([1, 5, 10])('withholds targetless public offers at level %i', async level => {
        const quests = await generator.generateQuestsForSettlement(makeSettlement(), level);
        expect(quests).toEqual([]);
        gameState.set('quests.active', quests);
        expect(manager._getRoomInvestigations(4, 7, 0)).toEqual([]);
    });

    it.each([1, 5, 10])('publishes valid seeded target contracts at level %i', async level => {
        gameState.set('world.metadata.features', makeHooks());
        const quests = await generator.generateQuestsForSettlement(makeSettlement(), level);
        expect(await generator.generateQuestsForSettlement(makeSettlement(), level)).toEqual(quests);
        expect(quests.find(quest => quest.type === 'kill').objectives[0].requirement.creatureTypes).toEqual(['goblin']);
        const investigation = quests.find(quest => quest.type === 'investigate');
        expect(makeHooks().some(hook => `${hook.x},${hook.y}` === investigation.dungeonHookId)).toBe(true);
    });

    it.each([0, 1])('produces a room-matching target for eligible hook %i', async hookIndex => {
        const hook = makeHooks()[hookIndex];
        gameState.set('world.metadata.features', [hook]);
        const quests = await generator.generateQuestsForSettlement(makeSettlement(), 5);
        const investigation = quests.find(quest => quest.type === 'investigate');
        expect(investigation.objectives[0].targetLocation).toBe(`${hook.x},${hook.y}`);
        gameState.set('quests.active', [investigation]);
        expect(manager._getRoomInvestigations(hook.x, hook.y, 0)).toEqual(investigation.objectives);
        expect(manager._getRoomInvestigations(hook.x, hook.y, 1)).toEqual([]);
        expect(manager._getRoomInvestigations(hook.x + 1, hook.y, 0)).toEqual([]);
    });

    it.each(['sanctuary', 'bound'])('rejects %s metadata without creating a fallback', async reason => {
        const hook = makeHooks()[1];
        if (reason === 'sanctuary') {
            hook.resolvedType = 'sanctuary';
        } else {
            hook.questBind = { questId: 'already-bound' };
        }
        gameState.set('world.metadata.features', [hook]);
        const quests = await generator.generateQuestsForSettlement(makeSettlement(), 5);
        expect(quests).toHaveLength(0);
        expect(quests.some(quest => quest.type === 'investigate')).toBe(false);
    });

    it.each([1, 5, 10])('uses a nearby neighbouring settlement site at level %i without changing ownership', async level => {
        const hook = makeHooks()[1];
        hook.questHook.nearestSettlementId = '99,99';
        const original = savedCopy(hook);
        gameState.set('world.metadata.features', [hook]);
        const quests = await generator.generateQuestsForSettlement(makeSettlement(), level);
        const investigation = quests.find(quest => quest.type === 'investigate');
        expect(investigation.dungeonHookId).toBe('8,9');
        expect(investigation.distanceTiles).toBe(Math.round(Math.hypot(6, 6)));
        expect(investigation.objectives[0].investigationDC).toBe(12 + Math.floor(level / 3));
        expect(hook).toEqual(original);
        expect(quests.filter(quest => quest.type !== 'investigate')).toEqual([]);
        gameState.set('quests.active', [investigation]);
        expect(manager._getRoomInvestigations(8, 9, 0)).toEqual(investigation.objectives);
        expect(manager._getRoomInvestigations(8, 9, 1)).toEqual([]);
    });

    it('selects the nearest unhooked real site with stable coordinate ties', async () => {
        const features = [
            { type: 'dungeon', x: 5, y: 3, name: 'East' },
            { type: 'poi', resolvedType: 'dungeon', x: -1, y: 3, name: 'West', explored: true },
            { type: 'dungeon', x: 3, y: 3, questBind: { questId: 'bound' } },
            { type: 'poi', resolvedType: 'sanctuary', x: 2, y: 3 }
        ];
        gameState.set('world.metadata.features', features);
        const generate = () => generator.generateQuestsForSettlement(makeSettlement(), 5);
        const first = (await generate()).find(quest => quest.type === 'investigate');
        expect(first.dungeonHookId).toBe('-1,3');
        features.reverse();
        expect((await generate()).find(quest => quest.type === 'investigate')).toEqual(first);
        expect(features.every(feature => !feature.questHook)).toBe(true);
    });

    it('withholds distant sites and includes the configured distance boundary', async () => {
        const limit = RULES.quests.investigationFallbackDistanceTiles;
        const site = { type: 'dungeon', x: 2 + limit + 1, y: 3, name: 'Far' };
        gameState.set('world.metadata.features', [site]);
        expect((await generator.generateQuestsForSettlement(makeSettlement(), 5)).some(quest => quest.type === 'investigate')).toBe(false);
        site.x--;
        expect((await generator.generateQuestsForSettlement(makeSettlement(), 5)).find(quest => quest.type === 'investigate').distanceTiles).toBe(limit);
    });

    it('uses another eligible site when an earlier town has bound the nearest one', async () => {
        const near = { type: 'dungeon', x: 4, y: 3, name: 'Near' };
        const next = { type: 'poi', resolvedType: 'dungeon', x: 170, y: 3, name: 'Next' };
        gameState.set('world.metadata.features', [near, next]);
        const first = (await generator.generateQuestsForSettlement(makeSettlement(), 5)).find(quest => quest.type === 'investigate');
        expect(first.dungeonHookId).toBe('4,3');
        const settlements = new SettlementManager(null, null, null, generator, manager);
        settlements._writeQuestBind(4, 3, 'retrieval', 'item', 'Relic');
        const laterTown = { ...makeSettlement(), id: '3,3', x: 3, name: 'Later Town' };
        const later = (await generator.generateQuestsForSettlement(laterTown, 5)).find(quest => quest.type === 'investigate');
        expect(later.dungeonHookId).toBe('170,3');
        expect(first.dungeonHookId).toBe('4,3');
        gameState.set('quests.active', [first, later]);
        saveManager.deserializeGameState(JSON.parse(JSON.stringify(saveManager.serializeGameState())));
        expect(manager._getRoomInvestigations(4, 3, 0)).toHaveLength(1);
        expect(manager._getRoomInvestigations(170, 3, 0)).toHaveLength(1);
        expect(gameState.get('world.metadata.features')[0].questBind.questId).toBe('retrieval');
    });

    it.each([0, 1, 2, 3])('respects a %i offer budget with fallback targets', async budget => {
        RULES.quests.questSlotBudget.town = budget;
        gameState.set('world.metadata.features', [{ type: 'dungeon', x: 200, y: 3, name: 'Expedition' }]);
        const quests = await generator.generateQuestsForSettlement(makeSettlement(), 5);
        expect(quests).toHaveLength(Math.min(budget, 1));
        expect(quests.some(quest => quest.type === 'investigate')).toBe(budget > 0);
    });

    it('withholds Investigation when metadata is missing or world hooks are disabled', async () => {
        gameState.set('world.metadata', undefined);
        expect(await generator.generateQuestsForSettlement(makeSettlement(), 5)).toHaveLength(0);
        gameState.set('world.metadata', { features: makeHooks() });
        RULES.quests.enableWorldHooks = false;
        expect(await generator.generateQuestsForSettlement(makeSettlement(), 5)).toHaveLength(0);
    });

    it.each([0, 1, 2, 3])('respects a %i offer budget both with and without targets', async budget => {
        RULES.quests.questSlotBudget.town = budget;
        expect(await generator.generateQuestsForSettlement(makeSettlement(), 5)).toHaveLength(0);
        gameState.set('world.metadata.features', makeHooks());
        expect(await generator.generateQuestsForSettlement(makeSettlement(), 5)).toHaveLength(budget);
    });

    it('does not consume randomness for a withheld offer', () => {
        const rng = new SeededRandom('missing-target');
        const untouched = new SeededRandom('missing-target');
        expect(generator._generateInvestigateChain(makeSettlement(), 5, [], rng)).toBeNull();
        expect(rng.nextInt(0, 9999)).toBe(untouched.nextInt(0, 9999));
    });

    it.each([false, true])('preserves assignments and progress through save/load and revisit (target=%s)', async valid => {
        const settlement = { ...makeSettlement(), npcs: [
            { id: 'leader', name: 'Leader', role: 'leader', offersQuest: true, questIds: [] },
            { id: 'innkeeper', name: 'Innkeeper', role: 'innkeeper', offersQuest: true, questIds: [] }
        ] };
        gameState.set('world.settlements', [settlement]);
        gameState.set('world.metadata.features', valid ? [makeHooks()[0]] : []);
        const settlementManager = new SettlementManager(null, null, null, generator, manager);
        vi.spyOn(settlementManager, 'getSettlementAtPlayerPosition').mockReturnValue(settlement);
        vi.spyOn(settlementManager, 'showSettlementUI').mockImplementation(() => {});
        const generate = vi.spyOn(generator, 'generateQuestsForSettlement');
        await settlementManager.enterSettlement();
        const quests = gameState.get('quests.available');
        expect(quests).toHaveLength(valid ? 3 : 0);
        expect(settlement.npcs.flatMap(npc => npc.questIds).sort()).toEqual(quests.map(quest => quest.id).sort());
        if (valid) {
            const investigation = quests.find(quest => quest.type === 'investigate');
            investigation.status = 'active';
            investigation.objectives[0].investigationAttempted = true;
            investigation.objectives[0].progress = 0;
            gameState.set('quests.active', [investigation]);
            gameState.set('quests.available', quests.filter(quest => quest !== investigation));
        }
        const originalQuests = savedCopy(gameState.get('quests'));
        const originalAssignments = savedCopy(settlement.npcs.map(npc => npc.questIds));
        const saved = JSON.parse(JSON.stringify(saveManager.serializeGameState()));
        saveManager.deserializeGameState(saved);
        const restored = gameState.get('world.settlements')[0];
        settlementManager.getSettlementAtPlayerPosition.mockReturnValue(restored);
        await settlementManager.enterSettlement();
        expect(generate).toHaveBeenCalledTimes(1);
        expect(restored.questsGenerated).toBe(true);
        expect(restored.npcs.map(npc => npc.questIds)).toEqual(originalAssignments);
        expect(gameState.get('quests')).toMatchObject(originalQuests);
        if (valid) {
            const objective = gameState.get('quests.active')[0].objectives[0];
            expect(objective.investigationAttempted).toBe(true);
            expect(manager._getRoomInvestigations(4, 7, 0)).toEqual([objective]);
        }
    });

    it('does not migrate targetless quests from existing saves', async () => {
        const legacy = { id: 'legacy', type: 'investigate', status: 'active', dungeonHookId: null,
            objectives: [{ type: 'investigate', targetLocation: null, progress: 0 }], rewards: { xp: 80, gold: 20 } };
        const settlement = { ...makeSettlement(), questsGenerated: true,
            npcs: [{ id: 'leader', name: 'Leader', questIds: ['legacy'] }] };
        gameState.set('world.settlements', [settlement]);
        gameState.set('quests.active', [legacy]);
        gameState.set('quests.available', [{ ...savedCopy(legacy), id: 'legacy-available', status: 'available' }]);
        const originalQuests = savedCopy(gameState.get('quests'));
        saveManager.deserializeGameState(JSON.parse(JSON.stringify(saveManager.serializeGameState())));
        const settlementManager = new SettlementManager(null, null, null, generator, manager);
        vi.spyOn(settlementManager, 'getSettlementAtPlayerPosition').mockReturnValue(gameState.get('world.settlements')[0]);
        vi.spyOn(settlementManager, 'showSettlementUI').mockImplementation(() => {});
        const generate = vi.spyOn(generator, 'generateQuestsForSettlement');
        await settlementManager.enterSettlement();
        expect(generate).not.toHaveBeenCalled();
        expect(gameState.get('quests')).toMatchObject(originalQuests);
        expect(manager._getRoomInvestigations(4, 7, 0)).toEqual([]);
    });
});
