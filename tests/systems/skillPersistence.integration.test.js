import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import saveManager from '../../src/systems/SaveManager.js';
import SkillChallengeManager from '../../src/systems/SkillChallengeManager.js';
import SettlementManager from '../../src/systems/SettlementManager.js';
import { gameState } from '../../src/core/GameState.js';

describe('Skill attempts and learned NPC state persistence', () => {
    let originalState;

    beforeEach(() => {
        originalState = gameState.data;
        gameState.data = {
            character: null,
            flags: {},
            world: { generatedRegions: new Map(), npcs: new Map(), settlements: [] },
            player: {},
            ui: {}
        };
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.stubGlobal('window', {});
    });

    afterEach(() => {
        gameState.data = originalState;
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('keeps challenge cooldowns across real save serialization and a fresh manager', () => {
        vi.spyOn(Date, 'now').mockReturnValue(100000);
        const manager = new SkillChallengeManager();
        manager.terrainChallengesData = { challenges: { obstacle: { balance: { cooldown: 60000 } } } };
        manager.recordChallengeAttempt('obstacle');
        const saved = JSON.parse(JSON.stringify(saveManager.serializeGameState()));
        gameState.set('flags', {});
        saveManager.deserializeGameState(saved);
        const restoredManager = new SkillChallengeManager();
        restoredManager.terrainChallengesData = manager.terrainChallengesData;
        expect(restoredManager.lastAttemptTimes).toEqual({});
        expect(restoredManager.canAttemptChallenge('obstacle')).toBe(false);
        Date.now.mockReturnValue(160000);
        expect(restoredManager.canAttemptChallenge('obstacle')).toBe(true);
    });

    it('restores learned NPC outcomes onto regenerated NPCs after saving without reverting current content', () => {
        const persistedNPC = {
            id: 'smith', name: 'Old authored name', passiveFlags: { qualityRead: true, failedCheck: false },
            intelStatus: 'locked', relations: { score: 30, history: [] }, questIds: ['smith-quest']
        };
        gameState.set('world.settlements', [{ id: '2,3', questsGenerated: true, npcs: [persistedNPC] }]);
        gameState.set('world.npcs', new Map([['smith', persistedNPC], ['elsewhere', { id: 'elsewhere' }]]));
        const saved = JSON.parse(JSON.stringify(saveManager.serializeGameState()));
        saveManager.deserializeGameState(saved);
        const live = { id: '2,3', x: 2, y: 3, npcs: [{ id: 'smith', name: 'Updated authored name', passiveFlags: {}, intelStatus: null }] };
        const manager = new SettlementManager();
        manager._restoreSettlementFromPersistent(live);
        manager._restoreNPCsFromPersistent(live);
        expect(live.questsGenerated).toBe(true);
        expect(live.npcs).toHaveLength(1);
        expect(live.npcs[0]).toMatchObject({
            name: 'Updated authored name', passiveFlags: { qualityRead: true, failedCheck: false },
            intelStatus: 'locked', relations: { score: 30 }, questIds: ['smith-quest']
        });
        live.npcs[0].passiveFlags.qualityRead = false;
        expect(gameState.get('world.npcs').get('smith').passiveFlags.qualityRead).toBe(true);
    });

    it('restores failed checks during settlement entry after NPC generation and avoids regenerating assigned quests', async () => {
        gameState.set('world.settlements', [{ id: '2,3', questsGenerated: true, npcs: [
            { id: 'smith', passiveFlags: { qualityRead: false }, intelStatus: 'locked', questIds: ['existing-quest'] }
        ] }]);
        const live = { id: '2,3', x: 2, y: 3, name: 'Crossing' };
        const npcGenerator = { generateNPCsForSettlement: vi.fn().mockResolvedValue([{ id: 'smith', passiveFlags: {}, intelStatus: null }]) };
        const questGenerator = { generateQuestsForSettlement: vi.fn() };
        const manager = new SettlementManager(null, null, npcGenerator, questGenerator, {});
        vi.spyOn(manager, 'getSettlementAtPlayerPosition').mockReturnValue(live);
        vi.spyOn(manager, 'showSettlementUI').mockImplementation(() => {});
        vi.spyOn(gameState, 'addMessage').mockImplementation(() => {});
        expect(await manager.enterSettlement()).toBe(true);
        expect(live.npcs[0]).toMatchObject({ passiveFlags: { qualityRead: false }, intelStatus: 'locked', questIds: ['existing-quest'] });
        expect(questGenerator.generateQuestsForSettlement).not.toHaveBeenCalled();
    });
});
