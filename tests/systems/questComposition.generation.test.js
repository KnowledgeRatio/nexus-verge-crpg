import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuestGenerator from '../../src/systems/QuestGenerator.js';
import { gameState } from '../../src/core/GameState.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';

const data = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));

describe('Compatible quest composition', () => {
    let previous;
    let generator;
    let town;
    let hook;
    beforeEach(() => {
        previous = { state: gameState.data, definitions: skillRegistry.definitions };
        skillRegistry.setDefinitions(data('skills').skills);
        town = { id: '2,3', name: 'Town', x: 2, y: 3, settlementType: 'town', npcs: [
            { id: 'giver', name: 'Leader', role: 'leader', offersQuest: true, culture: 'kethara' },
            { id: 'merchant', name: 'Trader', role: 'merchant', culture: 'kethara' }
        ] };
        hook = { type: 'dungeon', x: 4, y: 7, name: 'Hall', dungeonTypeId: 'cave',
            questHook: { nearestSettlementId: town.id, namedBossId: 'invented_metadata_species', distanceTiles: 6 } };
        gameState.data = { quests: { available: [], active: [], completed: [], failed: [] },
            world: { settlements: [town], metadata: { features: [hook] } } };
        vi.stubGlobal('window', { game: {
            npcGenerator: { culturesData: [{ id: 'kethara' }] },
            relationManager: { modifyFactionReputation: vi.fn(), config: data('relations') },
            merchantManager: { canAddQuestStock: vi.fn(() => true) },
            dungeonManager: { canClearQuestEncounter: vi.fn(), clearQuestEncounter: vi.fn(),
                dungeonGenerator: { dungeonTypes: [{ id: 'cave', bossPool: [{ id: 'actual_boss', minLevel: 1, maxLevel: 10 }] }] } }
        } });
        generator = new QuestGenerator('composition-proof', 'nexus-verge');
        generator.questData = data('quests');
        generator.monsterData = data('monsters');
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });
    afterEach(() => {
        gameState.data = previous.state;
        skillRegistry.setDefinitions(previous.definitions);
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });
    function constrain(values) {
        const grammar = data('quests').questComposition;
        for (const [dimension, id] of Object.entries(values)) {
            grammar.dimensions[dimension] = grammar.dimensions[dimension].filter(entry => entry.id === id);
        }
        generator.questData = { ...generator.questData, questComposition: grammar, proceduralBundles: [] };
    }
    async function offer(values, level = 1) {
        constrain(values);
        return (await generator.generateQuestsForSettlement(town, level)).find(quest => quest.procedural?.components);
    }

    it('reuses damaged salvage across causes and occupation across goals', () => {
        const combos = generator.getCompatibleCompositions();
        expect(combos.some(c => c.cause.id === 'abandonment' && c.materialState.id === 'damaged')).toBe(true);
        expect(combos.some(c => c.cause.id === 'occupation' && c.materialState.id === 'damaged')).toBe(true);
        expect(combos.some(c => c.hazard.id === 'occupied' && c.goal.id === 'access')).toBe(true);
        expect(combos.some(c => c.hazard.id === 'occupied' && c.goal.id === 'recovery')).toBe(true);
        expect(combos.some(c => c.goal.id === 'access' && c.subject.itemId)).toBe(false);
        expect(combos.some(c => c.cause.id === 'occupation' && c.hazard.id === 'unopposed')).toBe(false);
    });

    it.each([1, 5, 10])('publishes real noncombat delivery at level %i', async level => {
        const quest = await offer({ cause: 'abandonment', hazard: 'unopposed', materialState: 'intact',
            subject: 'rope-hempen', goal: 'recovery' }, level);
        expect(quest).toBeDefined();
        expect(quest.objectives.map(obj => obj.type)).toEqual(['observe', 'retrieve']);
        expect(quest.actions.find(action => action.acquire).acquire).toEqual({
            itemId: 'rope-hempen', sourceId: 'consignment', quantity: 3
        });
        expect(quest.actions.some(action => action.salvage)).toBe(false);
        expect(quest.rewards).toEqual({ xp: 80 * level, gold: 20 * level });
        expect(JSON.stringify(quest)).not.toMatch(/\{\w+\}/);
    });

    it('publishes a boss-role access quest without phantom goods or named targets', async () => {
        const quest = await offer({ cause: 'occupation', goal: 'access' });
        expect(quest).toBeDefined();
        expect(quest.objectives.map(obj => obj.type)).toEqual(['observe', 'defeat_encounter']);
        expect(quest.objectives.find(obj => obj.type === 'defeat_encounter').requirement.source).toEqual({
            siteId: '4,7', encounterRole: 'boss', encounterKey: '4,7:boss'
        });
        expect(quest.resolutions.find(choice => choice.fulfilled).effects).toContainEqual({
            id: 'cleared_occupation', type: 'target_cleared', sourceObjectiveId: 'defeat_occupation'
        });
        expect(quest.actions.some(action => action.acquire)).toBe(false);
        expect(quest.resolutions.some(choice => choice.custody)).toBe(false);
        expect(JSON.stringify(quest)).not.toContain('invented_metadata_species');
        expect(hook.generated).toBeUndefined();
        expect(hook.rooms).toBeUndefined();
    });

    it('blocks base recovery behind combat and adds one optional real salvage unit', async () => {
        const quest = await offer({ cause: 'occupation', goal: 'recovery', materialState: 'damaged', subject: 'torch' });
        const acquire = quest.actions.find(action => action.acquire);
        const salvage = quest.actions.find(action => action.salvage);
        expect(acquire.requiresObjectives).toContain('defeat_occupation');
        expect(quest.difficulty).toBe('deadly');
        expect(acquire.acquire.quantity).toBe(2);
        expect(salvage.salvage.quantity).toBe(1);
        expect(salvage.skillId).toBe('craft');
        expect(salvage.requiresActions).toContain(acquire.id);
        expect(quest.resolutions.find(choice => choice.fulfilled).custody[0].minimumQuantity).toBe(2);
        expect(quest.resolutions.some(choice => choice.requiresFacts?.includes('cause_established'))).toBe(false);
    });

    it('withholds occupied combinations without a real eligible boss producer', async () => {
        window.game.dungeonManager.dungeonGenerator.dungeonTypes[0].bossPool = [{ id: 'too_high', minLevel: 5, maxLevel: 10 }];
        expect(await offer({ cause: 'occupation', goal: 'access' }, 1)).toBeUndefined();
    });
    it('withholds goods without a compatible actual merchant consumer', async () => {
        window.game.merchantManager.canAddQuestStock.mockReturnValue(false);
        expect(await offer({ cause: 'abandonment', goal: 'recovery', hazard: 'unopposed' })).toBeUndefined();
    });
    it.each(['questEncounterClears', 'questEncounterVictories'])(
        'does not advertise an already defeated occupation (%s)', async field => {
            hook[field] = [{ siteId: '4,7', encounterRole: 'boss', encounterKey: '4,7:boss' }];
            expect(await offer({ cause: 'occupation', goal: 'access' })).toBeUndefined();
        });
    it('reserves a newly composed combat target before ordinary board jobs', async () => {
        hook.questHook.namedBossId = 'goblin';
        constrain({ cause: 'occupation', goal: 'access' });
        const offers = await generator.generateQuestsForSettlement(town, 1);
        const composed = offers.find(quest => quest.procedural?.components);
        expect(composed).toBeDefined();
        expect(offers.filter(quest => quest !== composed)
            .some(quest => quest.dungeonHookId === composed.dungeonHookId)).toBe(false);
    });

    it('does not attach a new occupation to a saved competing bounty', async () => {
        gameState.set('quests.available', [{ id: 'bounty', type: 'kill', status: 'available', dungeonHookId: '4,7' }]);
        expect(await offer({ cause: 'occupation', goal: 'access' })).toBeUndefined();
    });

    it('persists instantiated truth and uses seeded deterministic content', async () => {
        const a = await offer({ cause: 'abandonment', materialState: 'damaged', hazard: 'unopposed' });
        const b = await offer({ cause: 'abandonment', materialState: 'damaged', hazard: 'unopposed' });
        expect(b).toEqual(a);
        expect(JSON.parse(JSON.stringify(a))).toEqual(a);
        gameState.set('quests.available', [a]);
        expect(await offer({ cause: 'abandonment', materialState: 'damaged', hazard: 'unopposed' })).toBeUndefined();
    });
});
