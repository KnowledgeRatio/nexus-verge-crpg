import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import QuestManager from '../../src/systems/QuestManager.js';
import SkillChallengeManager from '../../src/systems/SkillChallengeManager.js';
import saveManager from '../../src/systems/SaveManager.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';

const skills = JSON.parse(readFileSync(new URL('../../data/skills.json', import.meta.url))).skills;

describe('Deliberate quest Investigation retries', () => {
    let previous;
    let manager;
    let objective;
    let actor;

    beforeEach(() => {
        previous = { data: gameState.data, system: RULES.attributes.system, fatigue: RULES.fatigue.enabled };
        RULES.attributes.system = 'NVSystem';
        RULES.fatigue.enabled = true;
        skillRegistry.setDefinitions(skills);
        actor = { level: 5, proficiencyBonus: 3, abilities: { intellect: 14 },
            skills: { investigation: { proficient: true } } };
        objective = { type: 'investigate', targetLocation: '4,7', payoffRoom: 2, investigationDC: 20 };
        gameState.data = { character: null, quests: { active: [{ type: 'investigate', objectives: [objective] }] },
            fatigue: { current: 0, exhaustionLevels: 0 }, flags: {}, ui: { messageLog: [] },
            world: { generatedRegions: new Map(), npcs: new Map(), settlements: [] }, player: {}, party: {} };
        manager = new QuestManager();
        vi.spyOn(manager, 'checkQuestCompletion').mockImplementation(() => {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(Math, 'random').mockReturnValue(0);
        vi.stubGlobal('window', { game: { promptSkillCheck: vi.fn() }, skillChallengeManager: new SkillChallengeManager() });
    });

    afterEach(() => {
        gameState.data = previous.data;
        RULES.attributes.system = previous.system;
        RULES.fatigue.enabled = previous.fatigue;
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('automatically checks once and persists failed attempts through save/load and reentry', () => {
        const roll = vi.spyOn(window.skillChallengeManager, 'rollSkillCheck');
        manager.onRoomEntered(4, 7, 1, actor);
        expect(objective.investigationAttempted).toBe(true);
        expect(objective.completed).not.toBe(true);
        const saved = JSON.parse(JSON.stringify(saveManager.serializeGameState()));
        saveManager.deserializeGameState(saved);
        manager.onRoomEntered(4, 7, 1, actor);
        expect(roll).toHaveBeenCalledTimes(1);
        expect(gameState.get('ui.messageLog').some(message => message.text.includes('Press E'))).toBe(true);
        expect(gameState.get('fatigue.current')).toBe(0);
    });

    it('allows cancellation without fatigue and applies one fatigue cost per attempted retry', async () => {
        manager.onRoomEntered(4, 7, 1, actor);
        const prompt = window.game.promptSkillCheck;
        prompt.mockResolvedValueOnce({ attempted: false, success: false })
            .mockResolvedValueOnce({ attempted: true, success: false })
            .mockResolvedValueOnce({ attempted: true, success: true });
        expect(await manager.retryRoomInvestigations(4, 7, 1, actor)).toBe(true);
        expect(gameState.get('fatigue.current')).toBe(0);
        await manager.retryRoomInvestigations(4, 7, 1, actor);
        expect(gameState.get('fatigue.current')).toBe(RULES.fatigue.skillChallengeFatigue);
        expect(objective.completed).not.toBe(true);
        await manager.retryRoomInvestigations(4, 7, 1, actor);
        expect(gameState.get('fatigue.current')).toBe(2 * RULES.fatigue.skillChallengeFatigue);
        expect(objective).toMatchObject({ progress: 1, completed: true });
        expect(prompt.mock.calls[0]).toHaveLength(1); // No challenge reward payload.
        expect(prompt.mock.calls[0][0]).toMatchObject({ skill: 'investigation', attribute: 'intellect', dc: 20 });
        expect(await manager.retryRoomInvestigations(4, 7, 1, actor)).toBe(false);
        expect(manager.checkQuestCompletion).toHaveBeenCalledTimes(3);
    });

    it('does not offer retries before the first check or in a different dungeon room', async () => {
        expect(await manager.retryRoomInvestigations(4, 7, 1, actor)).toBe(false);
        manager.onRoomEntered(4, 7, 1, actor);
        expect(await manager.retryRoomInvestigations(4, 8, 1, actor)).toBe(false);
        expect(await manager.retryRoomInvestigations(4, 7, 0, actor)).toBe(false);
        expect(window.game.promptSkillCheck).not.toHaveBeenCalled();
    });
});
