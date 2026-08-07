/**
 * Foraging practice's banked bonus loot roll (2026-08-07): character.bankedForagingRolls,
 * set by main.js's bankForagingRoll() on long rest, is consumed by the next qualifying
 * loot event and reset to 0 ("use it or lose it"). This covers the
 * SkillChallengeManager.applyConsequences() consumption site; CombatManager.endCombat()'s
 * site mirrors the same logic inline.
 *
 * Built through real construction: real SkillChallengeManager, real applyConsequences()
 * call path. window.lootManager is stubbed (no fetch/data loading needed for this system).
 */

import { describe, it, expect, afterEach } from 'vitest';
import SkillChallengeManager from '../../src/systems/SkillChallengeManager.js';

globalThis.window = globalThis.window || {};

function makeChallenge() {
    return { id: 'test_challenge', balance: { riskLevel: 'medium' } };
}

function makeOutcome(overrides = {}) {
    return {
        xp: 0,
        loot: { tableId: 'sc_lore_reward', chance: 1.0, rolls: 1 },
        ...overrides
    };
}

describe('SkillChallengeManager.applyConsequences — Foraging bonus loot', () => {
    afterEach(() => {
        window.lootManager = null;
    });

    it('does not roll foraging bonus loot when bankedForagingRolls is 0', () => {
        const rollCalls = [];
        window.lootManager = {
            rollOnTableWithRarityFilter: (tableId, rolls) => {
                rollCalls.push({ tableId, rolls });
                return [];
            },
            getForagingBonusLootConfig: () => ({ tableId: 'wildernessReward_common', rarityFilter: null }),
            computeSkillChallengeQualityScore: () => 0,
            applyMagicProperties: () => {}
        };

        const character = { level: 1, gold: 0, inventory: [], bankedForagingRolls: 0 };
        const manager = new SkillChallengeManager();
        manager.applyConsequences(character, makeChallenge(), makeOutcome());

        expect(rollCalls).toEqual([{ tableId: 'sc_lore_reward', rolls: 1 }]); // only the normal loot roll
        expect(character.bankedForagingRolls).toBe(0);
    });

    it('rolls the foraging bonus table and awards items, resetting bankedForagingRolls to 0', () => {
        window.lootManager = {
            rollOnTableWithRarityFilter: (tableId) => {
                if (tableId === 'sc_lore_reward') return []; // no normal loot this attempt
                if (tableId === 'wildernessReward_common') return [{ id: 'rations', name: 'Rations' }];
                return [];
            },
            getForagingBonusLootConfig: () => ({ tableId: 'wildernessReward_common', rarityFilter: null }),
            computeSkillChallengeQualityScore: () => 0,
            applyMagicProperties: () => {}
        };

        const character = { level: 1, gold: 0, inventory: [], bankedForagingRolls: 2 };
        const manager = new SkillChallengeManager();
        const result = manager.applyConsequences(character, makeChallenge(), makeOutcome());

        expect(result.itemsAwarded).toEqual([{ id: 'rations', name: 'Rations' }]);
        expect(character.inventory).toEqual([{ id: 'rations', name: 'Rations' }]);
        expect(character.bankedForagingRolls).toBe(0);
    });

    it('awards gold from a gold pseudo-item in the foraging bonus roll', () => {
        window.lootManager = {
            rollOnTableWithRarityFilter: (tableId) => {
                if (tableId === 'sc_lore_reward') return [];
                if (tableId === 'wildernessReward_common') return [{ itemId: 'gold', amount: 5, isGold: true }];
                return [];
            },
            getForagingBonusLootConfig: () => ({ tableId: 'wildernessReward_common', rarityFilter: null }),
            computeSkillChallengeQualityScore: () => 0,
            applyMagicProperties: () => {}
        };

        const character = { level: 1, gold: 10, inventory: [], bankedForagingRolls: 1 };
        const manager = new SkillChallengeManager();
        const result = manager.applyConsequences(character, makeChallenge(), makeOutcome());

        expect(result.goldAwarded).toBe(5);
        expect(character.gold).toBe(15);
        expect(character.bankedForagingRolls).toBe(0);
    });
});
