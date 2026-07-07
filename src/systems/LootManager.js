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
        this.itemProperties = null; // Canonical property catalog from itemProperties.json
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

            const [lootResponse, magicResponse, itemsResponse, propertiesResponse, mythicEpithetsResponse] = await Promise.all([
                fetch('data/lootTables.json'),
                fetch('data/magicItems.json'),
                fetch('data/items.json'),
                fetch('data/itemProperties.json'),
                fetch('data/mythicEpithets.json')
            ]);

            this.lootTables = await lootResponse.json();
            const rawMagicItems = await magicResponse.json();
            const itemsData = await itemsResponse.json();
            const propertiesData = await propertiesResponse.json();
            this.itemProperties = propertiesData.properties || [];
            this.mythicEpithets = await mythicEpithetsResponse.json();

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
     * @param {number} qualityScore - Quality score from computeCombatQualityScore (0 = no properties)
     * @returns {Object} { items: [], gold: number }
     */
    generateCombatLoot(monster, playerLevel, rng, qualityScore = 0) {
        const loot = {
            items: [],
            gold: 0
        };

        // Get monster type and CR
        const monsterType = monster.type || monster.species?.name || 'humanoid';
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
                const items = this.rollOnTable(selectedTable.tableName, selectedTable.rollCount, rng, playerLevel, qualityScore);
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
                            const bossItems = this.rollOnTable(tableEntry.tableId, tableEntry.rollCount, rng, playerLevel, qualityScore);
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
     * @param {number} qualityScore - Quality score for magic property application (0 = none)
     * @returns {Array} Array of item objects
     */
    rollOnTable(tableName, rollCount = 1, rng, playerLevel, qualityScore = 0) {
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
                    const item = this.resolveItem(entry, rng, playerLevel, qualityScore);
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
     * @param {number} qualityScore - Quality score for magic property application (0 = none)
     * @returns {Object|null} Item object or null if not available
     */
    resolveItem(entry, rng, playerLevel, qualityScore = 0) {
        const itemTemplate = this.allItems[entry.itemId];
        if (!itemTemplate) {
            console.warn(`⚠️ LootManager: Item "${entry.itemId}" not found in items database`);
            return null;
        }

        // Check minimum level requirement (for magic items)
        if (itemTemplate.minimumLevel && playerLevel < itemTemplate.minimumLevel) {
            return null;
        }

        // Clone item template
        const item = { ...itemTemplate };

        // Handle count (e.g., "3d6" arrows)
        if (entry.count) {
            item.quantity = this.rollDiceString(entry.count, rng);
        }

        // Assign bonus + properties generically based on the rolled rarity (weapon/armor/shield only).
        // Always call — qualityScore 0 is a legitimate roll (easy fight, low level, bad d6) that must
        // still resolve to Common tier and strip any stale static bonus/name off a magicItems.json template.
        this.applyMagicProperties(item, qualityScore, rng);

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
     * Compute a quality score for a combat encounter.
     * qualityScore = d6 + levelBonus + encounterBonus + bossBonus
     *
     * @param {Array<{cr: number, isBoss: boolean}>} enemies - Enemy data for the encounter
     * @param {number} playerLevel - Player's current level
     * @param {SeededRandom} rng - Seeded RNG instance
     * @returns {number} Quality score (used to determine magic item rarity and property count)
     */
    computeCombatQualityScore(enemies, playerLevel, rng) {
        const rules = RULES.magicItems;
        if (!enemies || enemies.length === 0) return 0;

        // Average CR of defeated enemies
        const avgCR = enemies.reduce((sum, e) => sum + (e.cr || 0), 0) / enemies.length;
        const crDelta = avgCR - playerLevel;
        const hasBoss = enemies.some(e => e.isBoss);

        // Level bonus
        let levelBonus = 0;
        if (playerLevel <= 3) levelBonus = rules.levelBonus['1-3'];
        else if (playerLevel <= 6) levelBonus = rules.levelBonus['4-6'];
        else if (playerLevel <= 9) levelBonus = rules.levelBonus['7-9'];
        else levelBonus = rules.levelBonus['10'];

        // Encounter difficulty from CR delta
        const t = rules.crDeltaThresholds;
        let encounterBonus;
        if (crDelta <= t.easy) encounterBonus = rules.encounterBonus.easy;
        else if (crDelta <= t.normal) encounterBonus = rules.encounterBonus.normal;
        else if (crDelta <= t.hard) encounterBonus = rules.encounterBonus.hard;
        else encounterBonus = rules.encounterBonus.deadly;

        const bossBonus = hasBoss ? rules.bossBonusModifier : 0;
        const d6 = rng.nextInt(1, 6);

        return d6 + levelBonus + encounterBonus + bossBonus;
    }

    /**
     * Compute a quality score for a quest reward.
     * Uses the quest difficulty to add a bonus on top of a seeded d6 roll.
     *
     * @param {number} playerLevel - Player's current level
     * @param {string} questDifficulty - Quest difficulty ('easy'|'normal'|'hard'|'deadly')
     * @param {string} questId - Quest ID for seeding
     * @returns {number} Quality score
     */
    computeQuestQualityScore(playerLevel, questDifficulty, questId) {
        const rules = RULES.magicItems;
        const rng = new SeededRandom(`${this.worldSeed}_quest_${questId}`);

        let levelBonus = 0;
        if (playerLevel <= 3) levelBonus = rules.levelBonus['1-3'];
        else if (playerLevel <= 6) levelBonus = rules.levelBonus['4-6'];
        else if (playerLevel <= 9) levelBonus = rules.levelBonus['7-9'];
        else levelBonus = rules.levelBonus['10'];

        const questBonus = rules.questBonus[questDifficulty] ?? 0;
        const d6 = rng.nextInt(1, 6);

        return d6 + levelBonus + questBonus;
    }

    /**
     * Compute a quality score for a skill challenge reward.
     * Uses the challenge's balance.riskLevel to add a bonus on top of a seeded d6 roll.
     * Seeded per-attempt (includes attemptSeed, typically Date.now()) since challenges
     * are repeatable via cooldown, unlike quests which complete once.
     *
     * @param {number} playerLevel - Player's current level
     * @param {string} riskLevel - Challenge's balance.riskLevel ('low'|'medium'|'high'|'deadly')
     * @param {string} challengeId - Challenge ID for seeding
     * @param {number|string} attemptSeed - Per-attempt uniqueness (e.g. Date.now())
     * @returns {number} Quality score
     */
    computeSkillChallengeQualityScore(playerLevel, riskLevel, challengeId, attemptSeed) {
        const rules = RULES.magicItems;
        const rng = new SeededRandom(`${this.worldSeed}_skillchallenge_${challengeId}_${attemptSeed}`);

        let levelBonus = 0;
        if (playerLevel <= 3) levelBonus = rules.levelBonus['1-3'];
        else if (playerLevel <= 6) levelBonus = rules.levelBonus['4-6'];
        else if (playerLevel <= 9) levelBonus = rules.levelBonus['7-9'];
        else levelBonus = rules.levelBonus['10'];

        const riskBonus = rules.skillChallengeBonus[riskLevel] ?? 0;
        const d6 = rng.nextInt(1, 6);

        return d6 + levelBonus + riskBonus;
    }

    /**
     * Map a quality score to a rarity string.
     * @param {number} score
     * @returns {string} Rarity ('common'|'fine'|'great'|'heroic'|'legendary'|'mythic')
     */
    qualityScoreToRarity(score) {
        for (const entry of RULES.magicItems.qualityScoreToRarity) {
            if (entry.maxScore !== undefined && score <= entry.maxScore) return entry.rarity;
        }
        return 'mythic';
    }

    /**
     * Assign bonus + properties to an item in-place based on a quality score.
     * Sets item.bonus, item.magicProperties, and item.effectiveRarity generically —
     * overrides any static bonus the item's template carried, so a single rarity roll
     * governs both axes instead of leaving them independently determined.
     * Weapon/armor/shield only; no-op on other item types.
     *
     * @param {Object} item - Item object (mutated in place)
     * @param {number} qualityScore - From computeCombatQualityScore / computeQuestQualityScore
     * @param {SeededRandom} rng - Seeded RNG instance
     * @returns {Object} The mutated item
     */
    applyMagicProperties(item, qualityScore, rng) {
        const rarity = this.qualityScoreToRarity(qualityScore);
        item.effectiveRarity = rarity;

        if (!['weapon', 'armor', 'shield'].includes(item.type)) {
            return item;
        }

        const rarityDef = RULES.magicItems.rarityDefinitions[rarity];
        const { bonus, propertyCount } = rarityDef.variants
            ? rarityDef.variants[rng.nextInt(0, rarityDef.variants.length - 1)]
            : rarityDef;

        item.bonus = bonus;
        item.magicProperties = [];

        if (propertyCount > 0 && this.itemProperties) {
            // Build droppable pool filtered by item type, gated to mythic-exclusive
            // properties only when this roll actually landed on mythic.
            const itemType = item.type;
            const pool = this.itemProperties.filter(p =>
                p.droppable &&
                p.appliesTo.includes(itemType) &&
                (!p.minRarity || p.minRarity === rarity)
            );

            // Weighted selection without replacement — push order is preserved and
            // consumed by composeItemName() as the adjective/epithet/fragment slot order.
            const remaining = [...pool];
            const targetCount = Math.min(propertyCount, remaining.length);
            for (let i = 0; i < targetCount; i++) {
                const totalWeight = remaining.reduce((sum, p) => sum + p.weight, 0);
                let roll = rng.next() * totalWeight;
                for (let j = 0; j < remaining.length; j++) {
                    roll -= remaining[j].weight;
                    if (roll <= 0) {
                        item.magicProperties.push(remaining[j].id);
                        remaining.splice(j, 1);
                        break;
                    }
                }
            }
        }

        item.name = this.composeItemName(item, rng);
        return item;
    }

    /**
     * Compose a procedural display name from an item's rolled bonus/properties.
     * Overwrites item.name — the base item's own template name (or its baseItemId's
     * mundane name, for magicItems.json-sourced templates) is recovered first so the
     * stale static "+N" baked into e.g. "Sword +1" doesn't leak into the new name.
     *
     * Grammar (branches on how many properties actually resolved, not the requested
     * propertyCount — a shield capped by a small property pool still names correctly):
     *   0 props, bonus 0  → "{Base}"                              (common — not magic)
     *   0 props, bonus >0 → "{Base} +{bonus}"                     (fine's +1/0-prop variant)
     *   1 prop            → "{Adjective} {Base}"
     *   2 props           → "{Adjective} {Base} of {Epithet}"
     *   3 props           → "{Adjective} {Base}, the {Fragment} {Fragment}"
     * Mythic rarity additionally appends " — {TrueName}" from data/mythicEpithets.json,
     * picked by the same seeded rng — a true name, not a further description.
     *
     * @param {Object} item - Item with bonus/magicProperties/effectiveRarity already set
     * @param {SeededRandom} rng - Seeded RNG instance (same one used to roll properties)
     * @returns {string} Composed display name
     */
    composeItemName(item, rng) {
        const baseName = (item.baseItemId && this.allItems?.[item.baseItemId]?.name)
            || item.name.replace(/\s*\+\d+$/, '');

        const props = (item.magicProperties || [])
            .map(id => this.itemProperties?.find(p => p.id === id))
            .filter(Boolean);

        let composed;
        if (props.length === 0) {
            composed = item.bonus > 0 ? `${baseName} +${item.bonus}` : baseName;
        } else if (props.length === 1) {
            composed = `${props[0].adjective} ${baseName}`;
        } else if (props.length === 2) {
            composed = `${props[0].adjective} ${baseName} of ${props[1].epithet}`;
        } else {
            composed = `${props[0].adjective} ${baseName}, the ${props[1].fragment} ${props[2].fragment}`;
        }

        if (item.effectiveRarity === 'mythic' && this.mythicEpithets) {
            const pool = item.type === 'weapon' ? this.mythicEpithets.weapon : this.mythicEpithets.armorShield;
            if (pool?.length > 0) {
                composed += ` — ${pool[rng.nextInt(0, pool.length - 1)]}`;
            }
        }

        return composed;
    }

    /**
     * Apply a single Forgecraft modification to an item.
     * Wipes all existing magicProperties, preserves bonus, sets the new property.
     *
     * @param {Object} item - Item object (mutated in place)
     * @param {string} propertyId - Property ID from itemProperties.json
     * @returns {Object} The mutated item
     */
    applyForgecraftModification(item, propertyId) {
        item.magicProperties = [propertyId];
        item.forgecraftModified = true;
        return item;
    }

    /**
     * Look up the effect object for a property ID from the catalog.
     * Returns null if the property isn't found.
     * @param {string} propId
     * @returns {Object|null}
     */
    getPropertyEffect(propId) {
        return this.itemProperties?.find(p => p.id === propId)?.effect ?? null;
    }

    /**
     * Look up the display name for a property ID from the catalog.
     * @param {string} propId
     * @returns {string}
     */
    getPropertyName(propId) {
        return this.itemProperties?.find(p => p.id === propId)?.name ?? propId;
    }

    /**
     * Get all items matching a rarity level
     * @param {string} rarity - Rarity ("common", "fine", "great", "heroic", "legendary", "mythic")
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
