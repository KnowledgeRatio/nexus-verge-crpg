import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import ProvisioningManager from '../../src/systems/ProvisioningManager.js';
import SkillChallengeManager from '../../src/systems/SkillChallengeManager.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import saveManager from '../../src/systems/SaveManager.js';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';

const data = {
    cues: [{ id: 'food', title: 'Food source', campaignIds: ['core'] }],
    challenge: { skillId: 'survival', attribute: 'intuition', onSuccess: { message: 'Provisioned' },
        onFailure: { message: 'Nothing found' } }
};
const definitions = JSON.parse(readFileSync(new URL('../../data/skills.json', import.meta.url))).skills;

describe('Finite provisioning lifecycle', () => {
    let originalState;
    let originalRules;
    let originalDefinitions;
    let manager;
    let resolver;
    let generator;
    beforeEach(() => {
        originalState = gameState.data;
        originalRules = RULES.provisioning;
        originalDefinitions = skillRegistry.definitions;
        RULES.provisioning = { enabled: true, dc: 12, suppliesReward: 1 };
        vi.stubGlobal('window', {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        gameState.data = {
            seed: 'finite', worldConfig: { campaignId: 'frontier' }, character: {
                level: 1, abilities: { intuition: 14 }, skillProficiencies: ['survival'],
                proficiencyBonus: 2, gold: 10, xp: 0, currentHP: 10,
                class: { hitDie: 10, savingThrowProficiencies: [], features: {}, spellcaster: false },
                species: { abilityScoreIncrease: {}, traits: [], skillProficiencies: [] },
                background: { skillProficiencies: [], startingGold: 10 },
                baseAbilities: { intuition: 14 }
            }, world: { metadata: { generated: true, features: [
                { id: 'site', type: 'sanctuary', x: 4, y: 5, provisioning: { id: 'site', cueId: 'food', attempt: null } }
            ] }, generatedRegions: new Map(), npcs: new Map(), settlements: [], modifiedTiles: [] },
            player: { position: { x: 4, y: 5 } }, combat: null, dungeon: { active: false },
            fatigue: { current: 0, exhaustionLevels: 0, supplies: 1, suppliesZeroStreak: 0, lastThreshold: 'rested' },
            ui: {}, party: { companions: [] }
        };
        skillRegistry.setDefinitions(definitions);
        resolver = new SkillChallengeManager();
        resolver.skillsData = definitions;
        generator = { worldMetadata: gameState.get('world.metadata') };
        manager = new ProvisioningManager({ worldGenerator: generator, skillChallengeManager: resolver, data });
    });
    afterEach(() => {
        gameState.data = originalState;
        RULES.provisioning = originalRules;
        skillRegistry.setDefinitions(originalDefinitions);
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it.each([1, 5, 10])('uses real shared skill resolution on a plain level %i character, with one capped supply and no other rewards', level => {
        gameState.set('character.level', level);
        vi.spyOn(Math, 'random').mockReturnValue(0.95);
        const rollSpy = vi.spyOn(resolver, 'rollSkillCheck');
        const result = manager.attempt('site');
        expect(result).toMatchObject({ attempted: true, success: true, suppliesRestored: 1 });
        expect(rollSpy).toHaveBeenCalledWith(gameState.get('character'), expect.objectContaining({ skillId: 'survival', attribute: 'intuition', dc: 12 }));
        expect(gameState.get('fatigue.supplies')).toBe(2);
        expect(gameState.get('fatigue.current')).toBe(RULES.fatigue.skillChallengeFatigue);
        expect(gameState.get('character')).toMatchObject({ xp: 0, gold: 10, currentHP: 10 });
        expect(generator.worldMetadata.features[0].provisioning.attempt.status).toBe('success');
        expect(manager.attempt('site')).toEqual({ attempted: false, reason: 'spent' });
        expect(rollSpy).toHaveBeenCalledTimes(1);
    });

    it('spends failures, persists through actual save/load, and never refreshes on revisiting or rest', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        expect(manager.attempt('site')).toMatchObject({ success: false, suppliesRestored: 0 });
        const saved = JSON.parse(JSON.stringify(saveManager.serializeGameState()));
        saveManager.deserializeGameState(saved);
        gameState.set('fatigue.current', 0);
        gameState.set('player.position', { x: 99, y: 99 });
        gameState.set('player.position', { x: 4, y: 5 });
        const restored = new ProvisioningManager({ skillChallengeManager: resolver, data });
        expect(restored.attempt('site')).toEqual({ attempted: false, reason: 'spent' });
        expect(gameState.get('fatigue.supplies')).toBe(1);
    });

    it('preview/cancel and full supplies preserve the opportunity for later', () => {
        manager.getOpportunityAtPosition(4, 5);
        expect(gameState.get('world.metadata.features')[0].provisioning.attempt).toBeNull();
        gameState.set('fatigue.supplies', RULES.fatigue.suppliesMaxCarry);
        expect(manager.attempt('site')).toEqual({ attempted: false, reason: 'full' });
        expect(gameState.get('fatigue.current')).toBe(0);
        gameState.set('fatigue.supplies', RULES.fatigue.suppliesMaxCarry - 1);
        expect(manager.getOpportunityAtPosition(4, 5).canAttempt).toBe(true);
    });

    it.each(['combat', 'dungeon', 'moved', 'unrevealed', 'disabled'])('revalidates %s after opening a prompt without consuming an attempt', reason => {
        expect(manager.getOpportunityAtPosition(4, 5).canAttempt).toBe(true);
        if (reason === 'combat') {
            gameState.set('combat', { active: true });
        }
        if (reason === 'dungeon') {
            gameState.set('dungeon.active', true);
        }
        if (reason === 'moved') {
            gameState.set('player.position', { x: 5, y: 5 });
        }
        if (reason === 'unrevealed') {
            gameState.get('world.metadata.features')[0].type = 'poi';
        }
        if (reason === 'disabled') {
            RULES.provisioning.enabled = false;
        }
        expect(manager.attempt('site').attempted).toBe(false);
        expect(gameState.get('world.metadata.features')[0].provisioning.attempt).toBeNull();
        expect(gameState.get('fatigue.current')).toBe(0);
    });

    it('reserves before a reentrant callback or save during resolution can produce another roll', () => {
        const roll = vi.spyOn(resolver, 'rollSkillCheck').mockImplementation(() => {
            expect(manager.attempt('site')).toEqual({ attempted: false, reason: 'spent' });
            const saved = JSON.parse(JSON.stringify(saveManager.serializeGameState()));
            expect(saved.world.metadata.features[0].provisioning.attempt.status).toBe('pending');
            return { success: true, roll: 18, total: 22, dc: 12 };
        });
        manager.attempt('site');
        expect(roll).toHaveBeenCalledTimes(1);
        expect(gameState.get('fatigue.supplies')).toBe(2);
    });

    it('a resolver exception leaves a saved spent receipt, never a free retry', () => {
        vi.spyOn(resolver, 'rollSkillCheck').mockImplementation(() => {
            throw new Error('resolver failed');
        });
        expect(manager.attempt('site')).toMatchObject({ attempted: true, reason: 'error' });
        expect(manager.attempt('site')).toEqual({ attempted: false, reason: 'spent' });
        expect(gameState.get('world.metadata.features')[0].provisioning.attempt.status).toBe('error');
    });

    it('never grants more supplies on a critical, and respects the final carry slot', () => {
        gameState.set('fatigue.supplies', RULES.fatigue.suppliesMaxCarry - 1);
        vi.spyOn(Math, 'random').mockReturnValue(0.999);
        const result = manager.attempt('site');
        expect(result.rollResult.critical).toBe(true);
        expect(result.suppliesRestored).toBe(1);
        expect(gameState.get('fatigue.supplies')).toBe(RULES.fatigue.suppliesMaxCarry);
    });

    it('uses fatigue disadvantage and assigned companion help from the shared resolver', () => {
        gameState.set('fatigue.current', 90);
        gameState.set('party.companions', [{ proficiencyBonus: 2, companionMeta: { skillAssignments: ['survival'] } }]);
        const rng = vi.spyOn(Math, 'random').mockReturnValueOnce(0.95).mockReturnValueOnce(0.1);
        const expected = resolver.getSkillCheckContext(gameState.get('character'), 'survival', { attribute: 'intuition', dc: 12 });
        const result = manager.attempt('site');
        expect(result.rollResult.modifier).toBe(expected.modifier);
        expect(result.rollResult.disadvantage).toBe(true);
        expect(result.rollResult.roll).toBe(3);
        expect(rng).toHaveBeenCalledTimes(2);
        expect(result.success).toBe(false);
    });

    it('permits an inactive combat record and refuses unsupported cue data', () => {
        gameState.set('combat', { active: false });
        expect(manager.getOpportunityAtPosition(4, 5).canAttempt).toBe(true);
        manager.data = { ...data, cues: [] };
        expect(manager.attempt('site')).toMatchObject({ attempted: false });
        expect(gameState.get('world.metadata.features')[0].provisioning.attempt).toBeNull();
    });
});
