/**
 * LootManager - Centralized loot generation system for combat drops
 *
 * Responsibilities:
 * - Load and cache loot table data from JSON files
 * - Roll on weighted tables with seeded RNG (deterministic loot)
 * - Generate combat drops based on monster type, CR, and player level
 * - Filter magic items by level requirements
 * - Calculate gold from level-scaled ranges
 *
 * @class LootManager
 */

import { SeededRandom } from '../utils/rng.js';
import { RULES } from '../core/rulesEngine.js';
import { loadCampaigns, filterByCampaign, getDefaultCampaignId } from '../utils/campaignFilter.js';

class LootManager {
    constructor(worldSeed, campaignId = null) {
        this.worldSeed = worldSeed;
        this.campaignId = campaignId;
        this.lootTables = null;
        this.magicItems = null;
        this.allItems = null; // Cache of all items (from items.json + magicItems.json)
    }

    /**
     * Set the campaign ID for filtering
     * @param {string} campaignId - Campaign ID
     */
    setCampaignId(campaignId) {
        this.campaignId = campaignId;
    }

    /**
     * Load loot table data from JSON files
     * Called once during game initialization
     */
    async loadData() {
        if (this.lootTables && this.magicItems) {
            return; // Already loaded
        }

        try {
            // Load campaign data for filtering
            await loadCampaigns();
            const campaignId = this.campaignId || getDefaultCampaignId();

            const [lootResponse, magicResponse, itemsResponse] = await Promise.all([
                fetch('data/lootTables.json'),
                fetch('data/magicItems.json'),
                fetch('data/items.json')
            ]);

            this.lootTables = await lootResponse.json();
            const rawMagicItems = await magicResponse.json();
            const itemsData = await itemsResponse.json();

            // Filter magic items by campaign
            this.magicItems = {};
            Object.keys(rawMagicItems).forEach(category => {
                if (Array.isArray(rawMagicItems[category])) {
                    this.magicItems[category] = filterByCampaign(rawMagicItems[category], campaignId);
                } else {
                    this.magicItems[category] = rawMagicItems[category];
                }
            });

            // Build combined item lookup (items.json + magicItems.json)
            this.allItems = {};

            // Add base items from items.json (filtered by campaign)
            Object.keys(itemsData).forEach(category => {
                if (Array.isArray(itemsData[category])) {
                    const filtered = filterByCampaign(itemsData[category], campaignId);
                    filtered.forEach(item => {
                        this.allItems[item.id] = item;
                    });
                }
            });

            // Add magic items from magicItems.json (already filtered)
            Object.keys(this.magicItems).forEach(category => {
                if (Array.isArray(this.magicItems[category])) {
                    this.magicItems[category].forEach(item => {
                        this.allItems[item.id] = item;
                    });
                }
            });

            // Merge itemTables and skillChallengeLootTables into a single flat lookup
            this.allTables = {
                ...(this.lootTables.itemTables || {}),
                ...(this.lootTables.skillChallengeLootTables || {})
            };

            console.log(`✅ LootManager: Loaded ${Object.keys(this.allItems).length} items (campaign: ${campaignId})`);
            console.log(`✅ LootManager: Loaded loot tables for ${Object.keys(this.lootTables.monsterLootTables.byCreatureType).length} creature types`);
        } catch (error) {
            console.error('❌ LootManager: Failed to load data:', error);
            throw error;
        }
    }

    /**
     * Generate loot for a defeated enemy
     * @param {Object} monster - Monster character object
     * @param {number} playerLevel - Player's current level
     * @param {SeededRandom} rng - Seeded RNG instance
     * @returns {Object} { items: [], gold: number }
     */
    generateCombatLoot(monster, playerLevel, rng) {
        const loot = {
            items: [],
            gold: 0
        };

        // Get monster type and CR
        const monsterType = monster.type || monster.race?.name || 'humanoid';
        const monsterCR = monster.challengeRating || monster.cr || 0;
        const isBoss = monster.isBoss || false;

        // Boss loot: guaranteed drops with multiplied gold and extra rolls
        const bossBuffs = isBoss ? (RULES?.encounters?.bossBuffs || {
            goldMultiplier: 3,
            guaranteedLoot: true,
            extraLootRolls: 2
        }) : null;

        // Get level tier for player
        const levelTier = this.getLevelTier(playerLevel);

        // Get loot table for this monster type and level tier
        let lootTable = this.lootTables.monsterLootTables.byCreatureType[monsterType];
        // Fallback to humanoid if creature type not found
        if (!lootTable || !lootTable[levelTier]) {
            lootTable = this.lootTables.monsterLootTables.byCreatureType['humanoid'];
        }
        if (!lootTable || !lootTable[levelTier]) {
            console.warn(`⚠️ LootManager: No loot table for ${monsterType} at level tier ${levelTier}`);
            return loot;
        }

        const tierTable = lootTable[levelTier];

        // Roll for drop (bosses always drop, otherwise check dropChance)
        const shouldDrop = isBoss || rng.next() < tierTable.dropChance;
        if (!shouldDrop) {
            return loot; // No loot
        }

        // Determine number of loot rolls (bosses get extra)
        const extraRolls = isBoss ? (bossBuffs.extraLootRolls || 2) : 0;
        const totalRolls = 1 + extraRolls;

        for (let rollNum = 0; rollNum < totalRolls; rollNum++) {
            // Weighted table selection
            const totalWeight = tierTable.tables.reduce((sum, t) => sum + t.weight, 0);
            const tableRoll = rng.nextInt(1, totalWeight);

            let currentWeight = 0;
            let selectedTable = null;
            for (const t of tierTable.tables) {
                currentWeight += t.weight;
                if (tableRoll <= currentWeight) {
                    selectedTable = t;
                    break;
                }
            }

            // Roll on the selected table
            if (selectedTable) {
                const items = this.rollOnTable(selectedTable.tableName, selectedTable.rollCount, rng, playerLevel);
                loot.items.push(...items);
            }
        }

        // Roll gold
        loot.gold = this.rollGold(monsterCR, playerLevel, rng);

        // Boss loot: use bossLootTables for items and gold multiplier
        if (isBoss) {
            const bossLevelBracket = this.getBossLevelBracket(playerLevel);
            const bossTableConfig = this.lootTables.bossLootTables?.[bossLevelBracket];
            if (bossTableConfig) {
                const minMagicLevel = bossTableConfig.guaranteedMagicMinLevel ?? 4;
                if (playerLevel >= minMagicLevel) {
                    // Pick a table by weight
                    const totalWeight = bossTableConfig.tables.reduce((s, t) => s + t.weight, 0);
                    let roll = rng.next() * totalWeight;
                    for (const tableEntry of bossTableConfig.tables) {
                        roll -= tableEntry.weight;
                        if (roll <= 0) {
                            const bossItems = this.rollOnTable(tableEntry.tableId, tableEntry.rollCount, rng, playerLevel);
                            loot.items.push(...bossItems);
                            break;
                        }
                    }
                }
                loot.gold = Math.floor(loot.gold * (bossTableConfig.guaranteedGoldMultiplier || 3));
            } else {
                // Fallback: use legacy gold multiplier if no boss table config
                loot.gold = Math.floor(loot.gold * (bossBuffs.goldMultiplier || 3));
            }
        }

        return loot;
    }

    /**
     * Map player level to boss loot bracket string
     * @param {number} level - Player level
     * @returns {string} Boss bracket string
     */
    getBossLevelBracket(level) {
        if (level <= 3) return '1-3';
        if (level <= 6) return '4-6';
        if (level <= 9) return '7-9';
        return '10';
    }

    /**
     * Get an item directly by ID with no level gate (for quest rewards)
     * @param {string} itemId - Item ID to look up
     * @returns {Object|null} Item object or null if not found
     */
    getItemById(itemId) {
        return this.allItems?.[itemId] ?? null;
    }

    /**
     * Roll on a weighted item table
     * @param {string} tableName - Name of table in lootTables.itemTables
     * @param {number} rollCount - Number of items to roll
     * @param {SeededRandom} rng - Seeded RNG instance
     * @param {number} playerLevel - Player level for magic item filtering
     * @returns {Array} Array of item objects
     */
    rollOnTable(tableName, rollCount = 1, rng, playerLevel) {
        const table = this.allTables[tableName];
        if (!table) {
            console.warn(`⚠️ LootManager: Table "${tableName}" not found`);
            return [];
        }

        const results = [];

        for (let i = 0; i < rollCount; i++) {
            // Calculate total weight
            const totalWeight = table.reduce((sum, entry) => sum + entry.weight, 0);

            // Roll random number
            const roll = rng.nextInt(1, totalWeight);

            // Find selected item
            let currentWeight = 0;
            for (const entry of table) {
                currentWeight += entry.weight;
                if (roll <= currentWeight) {
                    const item = this.resolveItem(entry, rng, playerLevel);
                    if (item) {
                        results.push(item);
                    }
                    break;
                }
            }
        }

        return results;
    }

    /**
     * Roll on a named table with optional rarity pre-filtering based on player level bracket.
     * Uses Math.random() instead of a SeededRNG because skill challenge loot is contextual
     * (not deterministic — triggered by player action at runtime).
     *
     * @param {string} tableId - Key in this.allTables
     * @param {number} rollCount - Number of items to roll for
     * @param {number} playerLevel - Player level (used for bracket lookup)
     * @param {Object|null} rarityFilter - Optional map of level bracket → allowed rarities array
     *   e.g. { "1-4": ["common"], "5-9": ["common","uncommon"], "10+": ["uncommon","rare"] }
     * @returns {Array} Array of resolved item objects (may include gold pseudo-items)
     */
    rollOnTableWithRarityFilter(tableId, rollCount = 1, playerLevel = 1, rarityFilter = null) {
        const table = this.allTables[tableId];
        if (!table) {
            console.warn(`⚠️ LootManager: Table "${tableId}" not found`);
            return [];
        }

        // Determine allowed rarities for this player level
        let allowedRarities = null;
        if (rarityFilter) {
            let bracketKey;
            if (playerLevel <= 4) {
                bracketKey = '1-4';
            } else if (playerLevel <= 9) {
                bracketKey = '5-9';
            } else {
                bracketKey = '10+';
            }
            allowedRarities = rarityFilter[bracketKey] || null;
        }

        // Pre-filter entries by rarity if a filter is active
        const filteredTable = allowedRarities
            ? table.filter(entry => {
                if (entry.itemId === 'gold') return true; // gold always passes
                const item = this.allItems[entry.itemId];
                if (!item) return false;
                return allowedRarities.includes(item.rarity || 'common');
            })
            : table;

        if (filteredTable.length === 0) {
            console.warn(`⚠️ LootManager: No entries remain after rarity filter for "${tableId}" at level ${playerLevel}`);
            return [];
        }

        const results = [];

        for (let i = 0; i < rollCount; i++) {
            const totalWeight = filteredTable.reduce((sum, entry) => sum + entry.weight, 0);
            const roll = Math.floor(Math.random() * totalWeight) + 1;

            let currentWeight = 0;
            for (const entry of filteredTable) {
                currentWeight += entry.weight;
                if (roll <= currentWeight) {
                    // Gold entries are returned as pseudo-item objects for caller to handle
                    if (entry.itemId === 'gold') {
                        results.push({ itemId: 'gold', amount: entry.amount || '1d6', isGold: true });
                    } else {
                        const item = this.allItems[entry.itemId];
                        if (item) {
                            // Check minimum level requirement
                            if (!item.minimumLevel || playerLevel >= item.minimumLevel) {
                                results.push({ ...item });
                            }
                        } else {
                            console.warn(`⚠️ LootManager: Item "${entry.itemId}" not found in allItems`);
                        }
                    }
                    break;
                }
            }
        }

        return results;
    }

    /**
     * Resolve an item table entry to an actual item object
     * @param {Object} entry - Table entry with itemId, weight, optional count
     * @param {SeededRandom} rng - Seeded RNG instance
     * @param {number} playerLevel - Player level for level checks
     * @returns {Object|null} Item object or null if not available
     */
    resolveItem(entry, rng, playerLevel) {
        const itemTemplate = this.allItems[entry.itemId];
        if (!itemTemplate) {
            console.warn(`⚠️ LootManager: Item "${entry.itemId}" not found in items database`);
            return null;
        }

        // Check minimum level requirement (for magic items)
        if (itemTemplate.minimumLevel && playerLevel < itemTemplate.minimumLevel) {
            // console.log(`⚠️ LootManager: Item "${entry.itemId}" requires level ${itemTemplate.minimumLevel}, player is ${playerLevel}`);
            return null; // Item not available yet
        }

        // Clone item template
        const item = { ...itemTemplate };

        // Handle count (e.g., "3d6" arrows)
        if (entry.count) {
            item.quantity = this.rollDiceString(entry.count, rng);
        }

        return item;
    }

    /**
     * Roll gold from level/CR-based gold table
     * @param {number} monsterCR - Monster challenge rating
     * @param {number} playerLevel - Player level
     * @param {SeededRandom} rng - Seeded RNG instance
     * @returns {number} Gold amount
     */
    rollGold(monsterCR, playerLevel, rng) {
        const levelTier = this.getLevelTier(playerLevel);
        const crBracket = this.getCRBracket(monsterCR);

        const goldTable = this.lootTables.goldTables.byLevelAndCR[levelTier];
        if (!goldTable || !goldTable[crBracket]) {
            console.warn(`⚠️ LootManager: No gold table for level ${levelTier}, CR ${crBracket}`);
            return 0;
        }

        const range = goldTable[crBracket];
        return rng.nextInt(range.min, range.max);
    }

    /**
     * Roll dice from a dice string (e.g., "3d6", "2d8")
     * @param {string} diceString - Dice notation (e.g., "3d6")
     * @param {SeededRandom} rng - Seeded RNG instance
     * @returns {number} Rolled result
     */
    rollDiceString(diceString, rng) {
        const match = diceString.match(/(\d+)d(\d+)/);
        if (!match) {
            console.warn(`⚠️ LootManager: Invalid dice string "${diceString}"`);
            return 1;
        }

        const count = parseInt(match[1]);
        const sides = parseInt(match[2]);

        let total = 0;
        for (let i = 0; i < count; i++) {
            total += rng.nextInt(1, sides);
        }

        return total;
    }

    /**
     * Map player level to tier string
     * @param {number} level - Player level
     * @returns {string} Tier string ("1-4", "5-9", "10-14", "15+")
     */
    getLevelTier(level) {
        if (level <= 4) {
            return '1-4';
        }
        if (level <= 9) {
            return '5-9';
        }
        if (level <= 14) {
            return '10-14';
        }
        return '15+';
    }

    /**
     * Map CR to CR bracket string
     * @param {number} cr - Challenge rating
     * @returns {string} CR bracket
     */
    getCRBracket(cr) {
        if (cr <= 0.5) {
            return '0-0.5';
        }
        if (cr <= 2) {
            return '1-2';
        }
        if (cr <= 5) {
            return '3-5';
        }
        if (cr <= 8) {
            return '6-8';
        }
        return '9-10';
    }

    /**
     * Check if an item is available at a given player level
     * @param {string} itemId - Item ID
     * @param {number} playerLevel - Player level
     * @returns {boolean} True if available
     */
    isItemAvailableAtLevel(itemId, playerLevel) {
        const item = this.allItems[itemId];
        if (!item) {
            return false;
        }

        if (item.minimumLevel && playerLevel < item.minimumLevel) {
            return false;
        }

        return true;
    }

    /**
     * Get all items matching a rarity level
     * @param {string} rarity - Rarity ("common", "uncommon", "rare", "veryRare", "legendary")
     * @returns {Array} Array of item IDs
     */
    getItemsByRarity(rarity) {
        return Object.keys(this.allItems).filter(id => {
            const item = this.allItems[id];
            return item.rarity === rarity;
        });
    }
}

// Export singleton instance
let lootManagerInstance = null;

export function createLootManager(worldSeed) {
    lootManagerInstance = new LootManager(worldSeed);
    return lootManagerInstance;
}

export function getLootManager() {
    return lootManagerInstance;
}

export default LootManager;
