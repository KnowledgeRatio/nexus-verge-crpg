/**
 * Trading practice (2026-08-07): a permanent passive pricing modifier, additive
 * alongside the existing relation-tier multiplier + Influence skill effect. Rank is
 * occurrence count in character.practices (flat string[]). Rank 2's
 * tradingDiscountPercentRank2 is the *total* discount at rank 2, not additive on top
 * of rank 1 (data/relations.json's values are already written as absolutes per rank).
 *
 * Built through real construction: real RelationManager, real data/relations.json.
 */

import { describe, it, expect } from 'vitest';
import RelationManager from '../../src/systems/RelationManager.js';
import relationsData from '../../data/relations.json' with { type: 'json' };

function makeManager() {
    const manager = new RelationManager();
    manager.config = relationsData;
    manager.tierLookup = [...relationsData.tiers].sort((a, b) => a.min - b.min);
    return manager;
}

function makeNpc(score = 0) {
    return { name: 'Test Merchant', relations: { score, history: [] } };
}

function makeCharacter(practices = []) {
    return { practices, getSkillBonus: () => 0 }; // no Influence bonus — isolate trading's effect
}

describe('RelationManager trading practice pricing', () => {
    it('has no effect on buy/sell price with no trading practice known', () => {
        const manager = makeManager();
        const item = { value: 100 };
        const npc = makeNpc(0); // neutral tier: buyMultiplier 1.00, sellMultiplier 0.50
        const character = makeCharacter([]);

        expect(manager.calculateBuyPrice(item, npc, character)).toBe(100);
        expect(manager.calculateSellPrice(item, npc, character)).toBe(50);
    });

    it('applies the rank-1 discount to buy price', () => {
        const manager = makeManager();
        const item = { value: 100 };
        const npc = makeNpc(0);
        const character = makeCharacter(['trading']);

        // 100 * 1.00 * (1 - 0.05) = 95
        expect(manager.calculateBuyPrice(item, npc, character)).toBe(95);
    });

    it('applies the rank-2 discount as the total effect, not additive on top of rank 1', () => {
        const manager = makeManager();
        const item = { value: 100 };
        const npc = makeNpc(0);
        const character = makeCharacter(['trading', 'trading']);

        // 100 * 1.00 * (1 - 0.10) = 90, not (1 - 0.05 - 0.10) = 85
        expect(manager.calculateBuyPrice(item, npc, character)).toBe(90);
    });

    it('applies the rank-1 bonus to sell price', () => {
        const manager = makeManager();
        const item = { value: 100 };
        const npc = makeNpc(0);
        const character = makeCharacter(['trading']);

        // 100 * 0.50 * (1 + 0.05) = 52.5 -> rounds to 53
        expect(manager.calculateSellPrice(item, npc, character)).toBe(53);
    });

    it('applies the rank-2 bonus to sell price as the total effect', () => {
        const manager = makeManager();
        const item = { value: 100 };
        const npc = makeNpc(0);
        const character = makeCharacter(['trading', 'trading']);

        // 100 * 0.50 * (1 + 0.10) = 55
        expect(manager.calculateSellPrice(item, npc, character)).toBe(55);
    });

    it('combines with an Influence bonus rather than replacing it', () => {
        const manager = makeManager();
        const item = { value: 100 };
        const npc = makeNpc(0);
        const character = { practices: ['trading'], getSkillBonus: () => 5 }; // +5 influence -> 5% effect

        // 100 * 1.00 * (1 - 0.05) * (1 - 0.05) = 90.25 -> rounds to 90
        expect(manager.calculateBuyPrice(item, npc, character)).toBe(90);
    });

    it('getPricingSummary reports the trading effect', () => {
        const manager = makeManager();
        const npc = makeNpc(0);

        expect(manager.getPricingSummary(npc, makeCharacter([])).tradingEffect).toBe('no trading discount');
        expect(manager.getPricingSummary(npc, makeCharacter(['trading'])).tradingEffect).toBe('5% trading discount');
        expect(manager.getPricingSummary(npc, makeCharacter(['trading', 'trading'])).tradingEffect).toBe('10% trading discount');
    });
});
