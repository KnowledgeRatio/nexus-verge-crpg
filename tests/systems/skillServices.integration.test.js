import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import MerchantManager from '../../src/systems/MerchantManager.js';
import RelationManager from '../../src/systems/RelationManager.js';
import QuestManager from '../../src/systems/QuestManager.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';
const skillsData = JSON.parse(readFileSync(new URL('../../data/skills.json', import.meta.url)));
const relationsData = JSON.parse(readFileSync(new URL('../../data/relations.json', import.meta.url)));

describe('Skills beyond overworld encounters', () => {
    let previousAttributeSystem;
    let previousQuests;

    beforeEach(() => {
        previousAttributeSystem = RULES.attributes.system;
        previousQuests = gameState.get('quests');
        RULES.attributes.system = 'NVSystem';
        skillRegistry.setDefinitions(skillsData.skills);
        vi.stubGlobal('window', { game: {} });
        vi.spyOn(gameState, 'addMessage').mockImplementation(() => {});
    });

    afterEach(() => {
        RULES.attributes.system = previousAttributeSystem;
        gameState.set('quests', previousQuests);
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it.each([1, 5, 10])('preserves proficiency and expertise in merchant prices after level %i save/load', level => {
        const relation = new RelationManager();
        relation.config = relationsData;
        relation.tierLookup = [...relationsData.tiers].sort((a, b) => a.min - b.min);
        const merchant = new MerchantManager('skill-services');
        const npc = { relations: { score: 0, history: [] } };
        const item = { value: 1000 };
        const proficiencyBonus = RULES.core.proficiencyBonusByLevel[level];

        for (const expertise of [false, true]) {
            const original = {
                level,
                proficiencyBonus,
                abilities: { presence: 16, composure: 10 },
                skills: { influence: { proficient: true, expertise } },
                getSkillBonus: () => {
                    throw new Error('Pricing must use character data');
                }
            };
            const restored = JSON.parse(JSON.stringify(original));
            const modifier = 3 + proficiencyBonus * (expertise ? 2 : 1);
            const expectedBuy = Math.round(1000 * (1 - modifier * 0.01));
            const expectedSell = Math.round(500 * (1 + modifier * 0.01));
            for (const character of [original, restored]) {
                window.game = {};
                expect(merchant.calculateBuyPrice(item, character)).toBe(expectedBuy);
                expect(merchant.calculateSellPrice(item, character)).toBe(expectedSell);
                window.game.relationManager = relation;
                expect(merchant.calculateBuyPrice(item, character, npc)).toBe(expectedBuy);
                expect(merchant.calculateSellPrice(item, character, npc)).toBe(expectedSell);
                expect(relation.getPricingSummary(npc, character).influenceBonus).toBe(modifier);
            }
        }
    });

    it('retains old-save Influence aliases and hostile trading restrictions', () => {
        const relation = new RelationManager();
        relation.config = relationsData;
        relation.tierLookup = [...relationsData.tiers].sort((a, b) => a.min - b.min);
        const character = {
            abilities: { presence: 16 }, proficiencyBonus: 3, skills: { deception: { proficient: true } }
        };
        const hostile = { relations: { score: -100, history: [] } };
        expect(relation.getPricingSummary(hostile, character).influenceBonus).toBe(6);
        expect(relation.calculateBuyPrice({ value: 100 }, hostile, character)).toBe(Infinity);
        expect(relation.calculateSellPrice({ value: 100 }, hostile, character)).toBe(0);
    });

    it('advances only the matching skill objective from nested challenge results, once completed', () => {
        const manager = new QuestManager();
        vi.spyOn(manager, 'checkQuestCompletion').mockImplementation(() => {});
        const objective = {
            type: 'skill', requirement: { challengeId: 'rune_puzzle', skill: 'arcana', requireSuccess: true },
            progress: 0, required: 1, completed: false, description: 'Understand the runes'
        };
        gameState.set('quests', { active: [{ name: 'Rune quest', objectives: [objective] }] });
        manager.onSkillChallengeCompleted('rune_puzzle', { success: true, rollResult: { skill: 'investigation' } });
        manager.onSkillChallengeCompleted('rune_puzzle', { success: false, rollResult: { skill: 'lore' } });
        expect(objective.progress).toBe(0);
        manager.onSkillChallengeCompleted('rune_puzzle', { success: true, rollResult: { skill: 'lore' } });
        manager.onSkillChallengeCompleted('rune_puzzle', { success: true, rollResult: { skill: 'lore' } });
        expect(objective.progress).toBe(1);
        expect(objective.completed).toBe(true);
    });

    it('resolves authored quest Investigation with a plain expert character in the target room only', () => {
        const manager = new QuestManager();
        vi.spyOn(manager, 'checkQuestCompletion').mockImplementation(() => {});
        const roll = vi.spyOn(skillRegistry, 'rollCheck');
        vi.spyOn(Math, 'random').mockReturnValue(0.45); // d20 = 10
        const objective = { type: 'investigate', targetLocation: '4,7', payoffRoom: 2, investigationDC: 20 };
        gameState.set('quests', { active: [{ type: 'investigate', objectives: [objective] }] });
        const restored = {
            abilities: { intellect: 18 }, proficiencyBonus: 3,
            skills: { investigation: { proficient: true, expertise: true } }
        };
        manager.onRoomEntered(4, 7, 0, restored);
        manager.onRoomEntered(4, 8, 1, restored);
        expect(roll).not.toHaveBeenCalled();
        manager.onRoomEntered(4, 7, 1, restored);
        expect(objective.completed).toBe(true);
        expect(roll.mock.results[0].value).toMatchObject({ skill: 'investigation', modifier: 10, total: 20, success: true });
        manager.onRoomEntered(4, 7, 1, restored);
        expect(roll).toHaveBeenCalledTimes(1);
    });
});
