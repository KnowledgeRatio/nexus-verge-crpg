import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SettlementUI from '../../src/ui/SettlementUI.js';
import SkillChallengeManager from '../../src/systems/SkillChallengeManager.js';
import { gameState } from '../../src/core/GameState.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import skills from '../../data/skills.json';

describe('Settlement skill challenge outcomes', () => {
    let ui, npc, manager, relationManager, character;
    beforeEach(() => {
        skillRegistry.setDefinitions(skills.skills);
        character = { level: 1, xp: 0, gold: 0 };
        gameState.set('character', character);
        gameState.set('world.npcs', new Map());
        gameState.set('world.settlements', []);
        npc = { id: 'smith-1', name: 'Smith', intelStatus: null };
        manager = new SkillChallengeManager();
        manager.terrainChallengesData = { challenges: {} };
        relationManager = {
            getRelation: () => ({ tier: { id: 'friendly' } }),
            config: { intel: { dcModifierByTier: { friendly: -2 } } },
            applyRelationEvent: vi.fn()
        };
        ui = Object.create(SettlementUI.prototype);
        ui.settlementManager = { currentSettlement: { id: 'village-1', npcs: [npc] } };
        ui.closeNPCDialogue = vi.fn();
        vi.stubGlobal('window', {
            gameState, skillChallengeManager: manager, questManager: { onSkillChallengeCompleted: vi.fn() },
            game: { relationManager, player: {} }
        });
    });
    afterEach(() => vi.unstubAllGlobals());

    it('applies resources once and persists single-check NPC flags and intel', async () => {
        const challenge = {
            id: 'smith-help', type: 'single', skill: 'craft', baseDC: 12,
            onSuccess: { xp: 25, gold: 10, npcFlag: 'helped', revealIntel: true, relationChange: 'help' }
        };
        manager.terrainChallengesData.challenges[challenge.id] = challenge;
        window.game.promptSkillCheck = vi.fn(async config => {
            expect(config.dc).toBe(10);
            manager.applyConsequences(character, challenge, challenge.onSuccess, { success: true });
            return { attempted: true, success: true, outcome: challenge.onSuccess };
        });
        await ui.startSkillChallenge(challenge.id, npc);
        expect(character.xp).toBe(25);
        expect(character.gold).toBe(10);
        expect(relationManager.applyRelationEvent).toHaveBeenCalledExactlyOnceWith(npc, 'help');
        expect(gameState.get('world.settlements')[0].npcs[0].passiveFlags.helped).toBe(true);
        expect(gameState.get('world.npcs').get(npc.id).intelStatus).toBe('available');
        expect(window.questManager.onSkillChallengeCompleted).toHaveBeenCalledTimes(1);
    });

    it('preserves selected choice outcomes and passes the relation DC adjustment', async () => {
        const challenge = { id: 'help-choice', type: 'choice' };
        const outcome = { npcFlag: 'repaired', relationChange: 'help', revealIntel: true };
        manager.terrainChallengesData.challenges[challenge.id] = challenge;
        window.game.player.handleChoiceSkillChallenge = vi.fn(async () => ({ attempted: true, success: true, outcome }));
        await ui.startSkillChallenge(challenge.id, npc);
        expect(window.game.player.handleChoiceSkillChallenge).toHaveBeenCalledExactlyOnceWith(challenge, { dcModifier: -2 });
        expect(npc.passiveFlags.repaired).toBe(true);
        expect(relationManager.applyRelationEvent).toHaveBeenCalledTimes(1);
        expect(window.questManager.onSkillChallengeCompleted).not.toHaveBeenCalled();
    });

    it('does not consume cooldown or mutate NPC state when the player turns back', async () => {
        const challenge = { id: 'optional', type: 'single', skill: 'craft', baseDC: 12 };
        manager.terrainChallengesData.challenges.optional = challenge;
        window.game.promptSkillCheck = vi.fn(async () => ({ attempted: false, success: false }));
        const record = vi.spyOn(manager, 'recordChallengeAttempt');
        await ui.startSkillChallenge('optional', npc);
        expect(record).not.toHaveBeenCalled();
        expect(npc.passiveFlags).toBeUndefined();
        expect(window.questManager.onSkillChallengeCompleted).not.toHaveBeenCalled();
    });

    it('uses shared passive context and persists the permanent detection result once', () => {
        npc.hasIntel = true;
        relationManager.config.intel.passiveEmpathyBaseDC = 15;
        manager.getSkillCheckContext = vi.fn(() => ({ passiveScore: 13 }));
        ui._checkPassiveIntel(npc, relationManager.getRelation(npc));
        expect(npc.intelStatus).toBe('available');
        ui._checkPassiveIntel(npc, relationManager.getRelation(npc));
        expect(manager.getSkillCheckContext).toHaveBeenCalledTimes(1);
        expect(gameState.get('world.npcs').get(npc.id).intelStatus).toBe('available');
    });

    it('initiates an authored NPC consequence combat once and stops on fatal outcomes', async () => {
        const challenge = { id: 'guard', type: 'single', skill: 'influence', baseDC: 12 };
        manager.terrainChallengesData.challenges.guard = challenge;
        window.game.player.triggerCombatFromChallenge = vi.fn();
        window.game.promptSkillCheck = vi.fn(async () => ({
            attempted: true, success: false, consequences: { initiateCombat: true }, enemyTypes: ['guard']
        }));
        await ui.startSkillChallenge('guard', npc);
        expect(window.game.player.triggerCombatFromChallenge).toHaveBeenCalledExactlyOnceWith(['guard']);
        manager.lastAttemptTimes = {};
        window.game.promptSkillCheck = vi.fn(async () => ({
            attempted: true, success: false, dead: true, consequences: { initiateCombat: true }
        }));
        await ui.startSkillChallenge('guard', npc);
        expect(window.game.player.triggerCombatFromChallenge).toHaveBeenCalledTimes(1);
    });

    it('shows the actual Influence modifier for restored characters without a relation manager', () => {
        character.proficiencyBonus = 2;
        character.skills = { influence: { proficient: true } };
        const hint = { innerHTML: '' };
        vi.stubGlobal('document', { getElementById: id => id === 'chaHint' ? hint : null });
        window.game.relationManager = null;
        ui.selectedItem = { value: 10 };
        ui.tradeMode = 'buy';
        ui.tradeQuantity = 1;
        ui.merchantManager = { calculateBuyPrice: () => 10 };
        ui.renderTransactionPanel();
        expect(hint.innerHTML).toContain(`${skillRegistry.getModifier(character, 'influence')}% discount`);
    });

    it('blocks completed NPC work in both offers and direct calls after cooldown expires', async () => {
        const challenge = { id: 'craft_assistance', type: 'choice', choices: [
            { skill: 'craft', dc: 12, text: 'Repair it', onSuccess: { npcFlag: 'craftHelped', gold: 10 } },
            { skill: 'athletics', dc: 12, text: 'Help lift', onSuccess: { npcFlag: 'craftHelped', gold: 10 } }
        ] };
        manager.terrainChallengesData.challenges.craft_assistance = challenge;
        npc.role = 'blacksmith';
        npc.passiveFlags = { craftHelped: true };
        window.game.player.handleChoiceSkillChallenge = vi.fn();
        expect(manager.canAttemptChallenge(challenge.id)).toBe(true);
        expect(ui.getContextualSkillChallenges(npc)).toEqual([]);
        await ui.startSkillChallenge(challenge.id, npc);
        expect(window.game.player.handleChoiceSkillChallenge).not.toHaveBeenCalled();
        expect(ui.closeNPCDialogue).not.toHaveBeenCalled();
        expect(ui.getContextualSkillChallenges({ id: 'smith-2', role: 'blacksmith' })).toEqual([challenge]);
        manager.recordChallengeAttempt(challenge.id);
        expect(ui.getContextualSkillChallenges({ id: 'smith-2', role: 'blacksmith' })).toEqual([]);
    });
});
