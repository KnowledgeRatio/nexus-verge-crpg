/**
 * Merchant Manager System
 * Handles trading logic, inventory generation, and relation/Influence-modified pricing
 */

import { SeededRandom } from '../utils/rng.js';
import { RULES } from '../core/rulesEngine.js';
import { loadCampaigns, filterByCampaign, getDefaultCampaignId } from '../utils/campaignFilter.js';

class MerchantManager {
    constructor(worldSeed, campaignId = null) {
        this.worldSeed = worldSeed;
        this.campaignId = campaignId;
        this.merchantInventoryData = null;
    }

    /**
     * Set the campaign ID for filtering
     * @param {string} campaignId - Campaign ID
     */
    setCampaignId(campaignId) {
        this.campaignId = campaignId;
    }

    /**
   * Load merchant inventory data
   */
    async loadData() {
        if (this.merchantInventoryData) {
            return; // Already loaded
        }

        try {
            // Load campaign data for filtering
            await loadCampaigns();
            const campaignId = this.campaignId || getDefaultCampaignId();

            const response = await fetch('data/merchantInventory.json');
            const rawData = await response.json();

            // Filter merchant items by campaign
            this.merchantInventoryData = {
                ...rawData,
                merchantItems: filterByCampaign(rawData.merchantItems, campaignId),
                blacksmithItems: filterByCampaign(rawData.blacksmithItems, campaignId)
            };

            console.log(`📦 Merchant inventory data loaded (campaign: ${campaignId})`);
        } catch (error) {
            console.error('Failed to load merchant inventory data:', error);
            throw error;
        }
    }

    /**
   * Generate merchant inventory for a settlement
   * @param {Object} settlement - Settlement data
   * @param {string} merchantType - 'merchant' or 'blacksmith'
   * @returns {Array<Object>} Array of items with quantities
   */
    async generateMerchantInventory(settlement, merchantType = 'merchant') {
        await this.loadData();

        const settlementType = settlement.settlementType || 'village';
        const seed = `${this.worldSeed}_${settlement.x}_${settlement.y}_${merchantType}`;
        const rng = new SeededRandom(seed);

        const inventory = [];
        const config = RULES.merchant.inventoryBySettlementType[settlementType];

        // Determine item pool based on merchant type
        const itemPool = merchantType === 'blacksmith'
            ? this.merchantInventoryData.blacksmithItems
            : this.merchantInventoryData.merchantItems;

        // Get item count range
        const itemCount = rng.nextInt(config.minItems, config.maxItems);

        // Filter items by rarity allowed in this settlement
        const allowedRarities = config.allowedRarities;
        const availableItems = itemPool.filter(item =>
            allowedRarities.includes(item.rarity)
        );

        // Select random items
        const selectedItems = new Set();
        while (selectedItems.size < Math.min(itemCount, availableItems.length)) {
            const item = rng.choice(availableItems);
            selectedItems.add(item);
        }

        // Add items to inventory with quantities
        for (const item of selectedItems) {
            let stock = 1;

            // Consumables have multiple stock
            if (item.type === 'consumable') {
                stock = rng.nextInt(3, 12);
            } else if (item.type === 'misc') {
                stock = rng.nextInt(1, 5);
            }

            inventory.push({
                ...item,
                stock,
                stockId: `${settlement.x}_${settlement.y}_${merchantType}_${item.id}`
            });
        }

        console.log(`🏪 Generated ${inventory.length} items for ${merchantType} in ${settlement.name}`);
        return inventory;
    }

    /**
   * Calculate buy price (player buying from merchant)
   * Delegates to RelationManager if available, falls back to Influence-only pricing
   * @param {Object} item - Item data
   * @param {Object} character - Player character
   * @param {Object} [npc] - Merchant NPC (for relation-based pricing)
   * @returns {number} Modified price
   */
    calculateBuyPrice(item, character, npc) {
        // Use RelationManager if available and NPC provided
        const relationManager = window.game?.relationManager;
        if (relationManager && npc) {
            return relationManager.calculateBuyPrice(item, npc, character);
        }

        // Fallback: Influence skill modifier only (no relation tier)
        const basePrice = item.value || 0;
        const influenceBonus = character.getSkillBonus ? character.getSkillBonus('influence') : 0;
        const influenceEffect = influenceBonus * 0.01;
        return Math.max(1, Math.round(basePrice * (1.0 - influenceEffect)));
    }

    /**
   * Calculate sell price (player selling to merchant)
   * Delegates to RelationManager if available, falls back to Influence-only pricing
   * @param {Object} item - Item data
   * @param {Object} character - Player character
   * @param {Object} [npc] - Merchant NPC (for relation-based pricing)
   * @returns {number} Modified price
   */
    calculateSellPrice(item, character, npc) {
        // Use RelationManager if available and NPC provided
        const relationManager = window.game?.relationManager;
        if (relationManager && npc) {
            return relationManager.calculateSellPrice(item, npc, character);
        }

        // Fallback: Influence skill modifier only (no relation tier)
        const basePrice = item.value || 0;
        const influenceBonus = character.getSkillBonus ? character.getSkillBonus('influence') : 0;
        const influenceEffect = influenceBonus * 0.01;
        const baseSellPrice = basePrice * 0.5;
        return Math.max(1, Math.round(baseSellPrice * (1.0 + influenceEffect)));
    }

    /**
   * Buy item from merchant
   * @param {Object} item - Item to buy
   * @param {Object} character - Player character
   * @param {number} quantity - Quantity to buy
   * @param {Object} [npc] - Merchant NPC
   * @returns {Object} Result {success, message, cost}
   */
    buyItem(item, character, quantity = 1, npc) {
        const unitPrice = this.calculateBuyPrice(item, character, npc);
        const totalCost = unitPrice * quantity;

        // Check if player has enough gold
        if (character.gold < totalCost) {
            return {
                success: false,
                message: `Not enough gold! Need ${totalCost} gp, have ${character.gold} gp`,
                cost: totalCost
            };
        }

        // Remove gold
        character.removeGold(totalCost);

        // Add item to inventory
        character.addItem(item, quantity);

        // Apply relation bonus for successful trade
        const relationManager = window.game?.relationManager;
        if (relationManager && npc) {
            relationManager.modifyRelation(npc, 'successfulTrade');
        }

        return {
            success: true,
            message: `Purchased ${quantity}x ${item.name} for ${totalCost} gp`,
            cost: totalCost
        };
    }

    /**
   * Sell item to merchant
   * @param {Object} item - Item to sell
   * @param {Object} character - Player character
   * @param {number} quantity - Quantity to sell
   * @param {Object} [npc] - Merchant NPC
   * @returns {Object} Result {success, message, earnings}
   */
    sellItem(item, character, quantity = 1, npc) {
        const unitPrice = this.calculateSellPrice(item, character, npc);
        const totalEarnings = unitPrice * quantity;

        // Remove item from inventory
        const removed = character.removeItem(item.id || item.instanceId, quantity);

        if (!removed) {
            return {
                success: false,
                message: 'Failed to remove item from inventory',
                earnings: 0
            };
        }

        // Add gold
        character.addGold(totalEarnings);

        // Apply relation bonus for successful trade
        const relationManager = window.game?.relationManager;
        if (relationManager && npc) {
            relationManager.modifyRelation(npc, 'successfulTrade');
        }

        return {
            success: true,
            message: `Sold ${quantity}x ${item.name} for ${totalEarnings} gp`,
            earnings: totalEarnings
        };
    }

    /**
   * Get price display string with modifiers
   * @param {Object} item - Item data
   * @param {Object} character - Character
   * @param {string} type - 'buy' or 'sell'
   * @param {Object} [npc] - Merchant NPC
   * @returns {string} Formatted price string
   */
    getPriceDisplay(item, character, type = 'buy', npc) {
        const price = type === 'buy'
            ? this.calculateBuyPrice(item, character, npc)
            : this.calculateSellPrice(item, character, npc);

        const basePrice = type === 'buy'
            ? item.value
            : Math.round(item.value * 0.5);

        if (price !== basePrice) {
            const diff = basePrice - price;
            const sign = diff > 0 ? '-' : '+';
            return `${price} gp (${sign}${Math.abs(diff)})`;
        }

        return `${price} gp`;
    }
}

export default MerchantManager;
