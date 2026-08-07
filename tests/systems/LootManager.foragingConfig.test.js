/**
 * LootManager.getForagingBonusLootConfig() — Foraging practice's banked bonus loot
 * table config, read from practices.json (loaded the same way itemProperties.json is).
 */

import { describe, it, expect } from 'vitest';
import { createLootManager } from '../../src/systems/LootManager.js';
import practicesData from '../../data/practices.json' with { type: 'json' };

describe('LootManager.getForagingBonusLootConfig', () => {
    it('returns the foraging practice bonusLoot config once practices are loaded', () => {
        const lootManager = createLootManager('test-seed');
        lootManager.practices = practicesData.practices;

        expect(lootManager.getForagingBonusLootConfig()).toEqual({
            tableId: 'wildernessReward_common',
            rarityFilter: null
        });
    });

    it('returns null when practices have not been loaded yet', () => {
        const lootManager = createLootManager('test-seed-2');
        expect(lootManager.getForagingBonusLootConfig()).toBeNull();
    });
});
