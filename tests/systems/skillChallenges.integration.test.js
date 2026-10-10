import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
vi.mock('../../src/systems/AudioManager.js', () => ({ default: {} }));
import Player from '../../src/systems/Player.js';
import SkillChallengeManager from '../../src/systems/SkillChallengeManager.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';
import { Character } from '../../src/systems/Character.js';

const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url)));
const skills = read('skills').skills;
const challenges = read('skillChallenges');
const social = read('skillChallenges/bandit-negotiation');
let manager;
let previous;
beforeEach(() => {
    previous = { data: gameState.data, window: globalThis.window, system: RULES.attributes.system };
    gameState.data = { character: { level: 5, proficiencyBonus: 3, gold: 100, xp: 0, currentHP: 30,
        abilities: { prowess: 14, resilience: 14, intellect: 14, intuition: 14, presence: 14, composure: 14 },
        skills: { athletics: { proficient: true }, influence: { proficient: true } } },
    fatigue: { current: 0, exhaustionLevels: 0 }, party: { companions: [], activeSynergies: {} },
    flags: {}, ui: { messageLog: [] }, dungeon: {}, quests: { active: [] } };
    RULES.attributes.system = 'NVSystem';
    skillRegistry.setDefinitions(skills);
    manager = new SkillChallengeManager();
    manager.skillsData = skills;
    manager.terrainChallengesData = challenges;
    globalThis.window = { skillChallengeManager: manager, dispatchEvent: vi.fn(),
        game: { updateHUD: vi.fn(), checkDeath: vi.fn() }, questManager: { onSkillChallengeCompleted: vi.fn() } };
    vi.stubGlobal('CustomEvent', class {
        constructor(type, options) {
            this.type = type;
            this.detail = options?.detail;
        }
    });
});
afterEach(() => {
    gameState.data = previous.data;
    globalThis.window = previous.window;
    RULES.attributes.system = previous.system;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('Shared skill checks across gameplay surfaces', () => {
    it.each([1, 5, 10])('preview and actual roll agree for fatigue, expertise and capped help at level %s', level => {
        const actor = gameState.get('character');
        actor.level = level;
        actor.proficiencyBonus = level < 5 ? 2 : level < 9 ? 3 : 4;
        actor.skills.athletics.expertise = true;
        const helper = { proficiencyBonus: actor.proficiencyBonus,
            companionMeta: { skillAssignments: ['athletics'] } };
        gameState.set('party.companions', [helper, helper]);
        gameState.set('fatigue', { current: 90, exhaustionLevels: 1 });
        const check = { skillId: 'athletics', attribute: 'resilience', dc: 18 };
        const context = manager.getSkillCheckContext(actor, 'athletics', check);
        expect(context.modifier).toBe(2 + 3 * actor.proficiencyBonus - 1);
        expect(context.disadvantage).toBe(true);
        const probability = Math.max(0, Math.min(1, (21 - 18 + context.modifier) / 20));
        expect(context.successChance).toBeCloseTo(100 * probability ** 2);
        vi.spyOn(Math, 'random').mockReturnValueOnce(0.99).mockReturnValueOnce(0);
        const result = manager.rollSkillCheck(JSON.parse(JSON.stringify(actor)), check);
        expect(result.roll).toBe(1);
        expect(result.modifier).toBe(context.modifier);
        expect(result.total).toBe(1 + context.modifier);
    });

    it('applies critical rewards, signed costs and exhaustion with the UI result contract', () => {
        const actor = gameState.get('character');
        const trap = challenges.challenges.trap_detect_disarm;
        const detection = manager.getOutcome(trap, trap.stages[0], true, { isCritical: true, type: 'success' });
        expect(detection.xp).toBeUndefined();
        expect(detection.nextStage).toBe('disarm');
        const outcome = manager.getOutcome(trap, trap.stages[1], true, { isCritical: true, type: 'success' });
        const result = manager.applyConsequences(actor, trap, { ...outcome, loot: null });
        expect(result).toMatchObject({ xp: 150, gold: 40, xpAwarded: 150, goldAwarded: 40, messages: [outcome.message] });
        const harm = manager.applyConsequences(actor, trap, { gold: -20, damage: 4,
            condition: 'exhaustion_1', triggerCombat: ['bandit'] });
        expect(actor).toMatchObject({ gold: 120, currentHP: 26 });
        expect(gameState.get('fatigue.exhaustionLevels')).toBe(1);
        expect(harm).toMatchObject({ gold: -20, damage: 4, conditions: ['exhaustion_1'],
            initiateCombat: true, enemyTypes: ['bandit'] });
    });

    it('normalizes every choice template and validates every authored skill pairing', () => {
        const visit = value => {
            if (!value || typeof value !== 'object') {
                return;
            }
            if (value.skill) {
                expect(skillRegistry.getDefinition(value.skill), value.skill).toBeDefined();
                expect(() => skillRegistry.resolveAttribute(value.skill, value.attribute)).not.toThrow();
            }
            Object.values(value).forEach(visit);
        };
        visit(challenges.challenges);
        visit(social.nodes);
        for (const challenge of Object.values(challenges.challenges).filter(entry => entry.type === 'choice')) {
            const options = manager.getChallengeOptions(challenge);
            expect(options.length, challenge.id).toBeGreaterThan(0);
            for (const option of options) {
                expect(Number.isFinite(option.baseDC), challenge.id).toBe(true);
                expect(typeof option.description).toBe('string');
            }
        }
    });

    it('uses a durable default cooldown while preserving explicit zero', () => {
        vi.spyOn(Date, 'now').mockReturnValue(1000000);
        manager.recordChallengeAttempt('guard_patrol');
        const restored = new SkillChallengeManager();
        restored.terrainChallengesData = challenges;
        expect(restored.canAttemptChallenge('guard_patrol')).toBe(false);
        manager.recordChallengeAttempt('locked_door');
        expect(restored.canAttemptChallenge('locked_door')).toBe(true);
    });

    it('resolves actual dialogue endings and hides unaffordable bribes', () => {
        gameState.set('quests.active', [{ id: 'test', objectives: [
            { type: 'social_challenge', challengeId: social.id, completed: false },
            { type: 'social_challenge', challengeId: 'other', completed: false }
        ] }]);
        window.game.questManager = { checkQuestCompletion: vi.fn() };
        manager.challenges.set(social.id, social);
        manager.startChallenge(social.id, { motivation: 'desperate', questId: 'test' });
        manager.moveToNode('peaceful_desperate');
        expect(manager.challengeActive).toBe(false);
        expect(gameState.get('quests.active')[0].objectives.map(objective => objective.completed)).toEqual([true, false]);
        manager.startChallenge(social.id, { motivation: 'desperate' });
        gameState.get('character').gold = 0;
        manager.moveToNode('opening_up');
        expect(manager.getAvailableChoices(manager.getCurrentNode()).some(choice => choice.effects?.goldChange < 0)).toBe(false);
    });

    it('preparation changes the next stage and boolean stage progression reaches completion', async () => {
        const player = Object.create(Player.prototype);
        const challenge = challenges.challenges.forge_accident;
        const prompts = [];
        window.game.promptSkillCheck = vi.fn(async (config, definition, stage) => {
            prompts.push(config);
            return { attempted: true, success: true, skill: stage.skill, outcome: stage.onSuccess };
        });
        const completed = await player.handleSequentialSkillChallenge(challenge, { dcModifier: 2 });
        expect(prompts).toHaveLength(2);
        expect(prompts.every(config => Number.isFinite(config.dc))).toBe(true);
        expect(completed.completed).toBe(true);
        const cliff = challenges.challenges.cliff_climb;
        prompts.length = 0;
        await player.handleSequentialSkillChallenge(cliff);
        expect(prompts[1].dc).toBe(manager.calculateAdjustedDC(cliff.stages[1].baseDC, 5) - 2);
    });

    it('cancelled challenges do not consume cooldowns or notify quests', async () => {
        window.game.promptSkillCheck = vi.fn().mockResolvedValue({ attempted: false, success: false });
        const player = Object.create(Player.prototype);
        await player.handleSingleSkillChallenge(challenges.challenges.market_haggle, 13);
        expect(gameState.get('flags.skillChallengeAttempts')).toBeUndefined();
        expect(window.questManager.onSkillChallengeCompleted).not.toHaveBeenCalled();
    });

    it('swimming failures use real dice and persistent fatigue on plain characters', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const player = Object.create(Player.prototype);
        player.applySkillCheckFailure([{ type: 'damage', dice: '2d6', damageType: 'drowning' },
            { type: 'exhaustion', level: 1 }]);
        expect(gameState.get('character.currentHP')).toBe(28);
        expect(gameState.get('fatigue.exhaustionLevels')).toBe(1);
        expect(window.game.checkDeath).toHaveBeenCalledWith(gameState.get('character'));
    });

    it('equipment loss uses actual slots and preserves another instance of the same item', () => {
        const actor = new Character({ name: 'Swimmer', level: 5,
            baseAbilities: gameState.get('character.abilities'),
            class: { id: 'dedication', hitDie: 8, savingThrowProficiencies: [], features: {} },
            species: { abilityScoreIncrease: {}, traits: [], speed: 30 },
            background: { skillProficiencies: [], startingGold: 100 },
            inventory: [
                { id: 'leather', instanceId: 'first', name: 'Leather', type: 'armor', armorClass: 12 },
                { id: 'leather', instanceId: 'second', name: 'Spare leather', type: 'armor', armorClass: 12 }
            ]
        });
        actor.equipItem('first');
        gameState.set('character', JSON.parse(JSON.stringify({ ...actor })));
        vi.spyOn(Math, 'random').mockReturnValue(0);
        Object.create(Player.prototype).applySkillCheckFailure([{ type: 'equipmentLoss', chance: 1 }]);
        expect(gameState.get('character.equipment.armor')).toBeNull();
        expect(gameState.get('character.inventory').map(item => item.instanceId)).toEqual(['second']);
        expect(gameState.get('character.ac')).toBe(12);
    });

    it('plain saved characters absorb challenge harm with temporary HP', () => {
        const actor = gameState.get('character');
        actor.tempHP = 3;
        manager.applyConsequences(actor, challenges.challenges.cliff_climb, { damage: 4 });
        expect(actor.tempHP).toBe(0);
        expect(actor.currentHP).toBe(29);
    });

    it('no-roll approaches never draw dice or produce critical rewards', () => {
        const random = vi.spyOn(Math, 'random');
        const result = manager.rollSkillCheck(gameState.get('character'), { skillId: null, dc: 0 });
        expect(result).toMatchObject({ success: true, roll: null, critical: false });
        expect(random).not.toHaveBeenCalled();
    });
});
