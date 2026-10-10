import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import Character from '../../src/systems/Character.js';
import QuestManager from '../../src/systems/QuestManager.js';
import saveManager from '../../src/systems/SaveManager.js';
import { GameState, gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';

const loadData = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));
const species = loadData('races').races.find(entry => entry.id === 'human');
const calling = loadData('classes').classes.find(entry => entry.id === 'dedication');
const background = loadData('backgrounds').backgrounds.find(entry => entry.id === 'soldier');
const savedCopy = value => JSON.parse(JSON.stringify(value));

describe('Quest reward turn-in with real and restored characters', () => {
    let previousState;
    let manager;

    beforeEach(() => {
        previousState = gameState.data;
        gameState.data = new GameState().data;
        gameState.initNewGame('quest-rewards', { mapSize: 'small', campaign: 'core', difficulty: 'normal' });
        manager = new QuestManager();
        vi.stubGlobal('window', {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        gameState.data = previousState;
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    function prepare(level, shape, xpReward = 100) {
        const character = new Character({ name: 'Reward recipient', species, class: calling,
            background, level, xp: RULES.progression.xpTable[level], gold: 17 });
        gameState.set('character', character);
        const quest = { id: 'earned-reward', name: 'Completed Investigation', type: 'investigate',
            status: 'active', objectives: [{ type: 'investigate', completed: true }],
            rewards: { xp: xpReward, gold: 25 } };
        gameState.set('quests.active', [quest]);
        if (shape === 'save') {
            saveManager.deserializeGameState(savedCopy(saveManager.serializeGameState()));
        } else if (shape === 'plain') {
            gameState.set('character', savedCopy(character));
        }
        return gameState.get('character');
    }

    for (const shape of ['live', 'save', 'plain']) {
        it.each([1, 5, 10])(`awards XP and gold exactly once for a ${shape} character at level %i`, level => {
            const character = prepare(level, shape);
            const xpBefore = character.xp;
            const published = vi.fn();
            const unsubscribe = gameState.subscribe('character', published);
            try {
                expect(manager.completeQuest('earned-reward')).toEqual({ success: true,
                    rewards: { xp: 100, gold: 25, item: null, reputation: null } });
                expect(character.xp).toBe(xpBefore + 100);
                expect(character.gold).toBe(42);
                expect(character.level).toBe(level);
                expect(character.pendingLevelUp).toBeFalsy();
                expect(published).toHaveBeenCalledWith(character);
                expect(gameState.get('quests.active')).toHaveLength(0);
                expect(gameState.get('quests.completed')).toHaveLength(1);
                expect(gameState.get('ui.messageLog').map(message => message.text))
                    .toEqual(expect.arrayContaining(['+100 XP', '+25 Gold']));

                saveManager.deserializeGameState(savedCopy(saveManager.serializeGameState()));
                expect(manager.completeQuest('earned-reward')).toEqual({ success: false });
                expect(gameState.get('character.xp')).toBe(xpBefore + 100);
                expect(gameState.get('character.gold')).toBe(42);
                expect(gameState.get('quests.completed')).toHaveLength(1);
            } finally {
                unsubscribe();
            }
        });

        it.each([1, 5])(`offers normal level-up choices for a ${shape} character at level %i`, level => {
            const xpReward = RULES.progression.xpTable[level + 1] - RULES.progression.xpTable[level];
            const character = prepare(level, shape, xpReward);
            const hpBefore = character.maxHP;
            const proficiencyBefore = character.proficiencyBonus;
            expect(manager.completeQuest('earned-reward').success).toBe(true);
            expect(character.pendingLevelUp).toMatchObject({ oldLevel: level, newLevel: level + 1,
                oldHP: hpBefore });
            expect(character.pendingLevelUp.newHP).toBeGreaterThan(hpBefore);
            expect(character.levelUpSelections).toEqual({ asiChoice: null, abilities: [], spells: [],
                traits: [], specialization: null });
            expect(character.level).toBe(level);
            expect(character.maxHP).toBe(hpBefore);
            expect(character.proficiencyBonus).toBe(proficiencyBefore);

            const pending = savedCopy(character.pendingLevelUp);
            saveManager.deserializeGameState(savedCopy(saveManager.serializeGameState()));
            const restored = gameState.get('character');
            expect(restored.pendingLevelUp).toEqual(pending);
            expect(restored.level).toBe(level);
            expect(restored.maxHP).toBe(hpBefore);
            expect(manager.completeQuest('earned-reward').success).toBe(false);
            expect(restored.xp).toBe(RULES.progression.xpTable[level + 1]);
            expect(restored.gold).toBe(42);

            restored.applyLevelUpSelections({});
            expect(restored.level).toBe(level + 1);
            expect(restored.maxHP).toBe(pending.newHP);
            expect(restored.pendingLevelUp).toBeNull();
        });

        it(`keeps item rewards and their seeded properties for a ${shape} character`, () => {
            const character = prepare(5, shape);
            gameState.get('quests.active')[0].rewards.item = 'test-reward';
            const baseItem = { id: 'test-reward', name: 'Reward sword', type: 'weapon' };
            window.lootManager = {
                worldSeed: 'reward-seed',
                getItemById: vi.fn(() => baseItem),
                computeQuestQualityScore: vi.fn(() => 3),
                applyMagicProperties: vi.fn((item, quality, rng) => {
                    item.quality = quality;
                    item.seededRoll = rng.nextInt(1, 20);
                })
            };
            const result = manager.completeQuest('earned-reward');
            expect(result.rewards.item).toBe('Reward sword');
            expect(character.inventory).toHaveLength(1);
            expect(character.inventory[0]).toMatchObject({ ...baseItem, quantity: 1, quality: 3 });
            expect(baseItem).not.toHaveProperty('quality');
            expect(window.lootManager.computeQuestQualityScore).toHaveBeenCalledWith(5, 'normal', 'earned-reward');
            expect(manager.completeQuest('earned-reward').success).toBe(false);
            expect(window.lootManager.applyMagicProperties).toHaveBeenCalledTimes(1);
            expect(character.inventory).toHaveLength(1);
        });
    }

    it('does not grant rewards until every objective is completed', () => {
        const character = prepare(1, 'plain');
        gameState.get('quests.active')[0].objectives[0].completed = false;
        expect(manager.completeQuest('earned-reward')).toEqual({ success: false });
        expect(character.xp).toBe(0);
        expect(character.gold).toBe(17);
        expect(gameState.get('quests.active')).toHaveLength(1);
        expect(gameState.get('quests.completed')).toHaveLength(0);
    });
});
