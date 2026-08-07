/**
 * RelationManager - NPC Relations System
 *
 * Manages personal disposition between the player and each NPC on a -100 to +100 scale.
 * Relations gate quest availability, affect merchant pricing, and drive dialogue tone.
 * All config loaded from data/relations.json — no hardcoded values.
 */

import { gameState } from '../core/GameState.js';

export default class RelationManager {
    constructor() {
        this.config = null;
        this.campaignId = null;
        this.startingScore = 0;
        this.tierLookup = []; // Sorted by min for fast lookup
    }

    /**
     * Initialize with config from data/relations.json and campaign overrides
     * @param {string} campaignId - Current campaign ID
     */
    async init(campaignId) {
        this.campaignId = campaignId;

        // Load relations config
        const response = await fetch(`data/relations.json?v=${Date.now()}`);
        this.config = await response.json();

        // Build sorted tier lookup (sorted ascending by min)
        this.tierLookup = [...this.config.tiers].sort((a, b) => a.min - b.min);

        // Determine starting score from campaign or default
        this.startingScore = this.config.defaults.startingScore;
        await this._applyCampaignOverride(campaignId);

        console.log(`📊 RelationManager initialized (campaign: ${campaignId}, startingScore: ${this.startingScore})`);
    }

    /**
     * Apply campaign-specific starting relation override
     */
    async _applyCampaignOverride(campaignId) {
        try {
            const response = await fetch(`data/campaigns.json?v=${Date.now()}`);
            const campaignData = await response.json();

            // Walk inheritance chain looking for startingRelation override
            const visited = new Set();
            let currentId = campaignId;

            while (currentId && !visited.has(currentId)) {
                visited.add(currentId);
                const campaign = campaignData.campaigns.find(c => c.id === currentId);
                if (!campaign) {
                    break;
                }

                if (campaign.featureGeneration?.startingRelation !== undefined) {
                    this.startingScore = campaign.featureGeneration.startingRelation;
                    return;
                }

                // Walk up inheritance chain
                currentId = campaign.inherits?.[0] || null;
            }
        } catch (e) {
            console.warn('⚠️ Could not load campaign overrides for relations:', e);
        }
    }

    /**
     * Initialize relations on an NPC if not already present
     * @param {Object} npc - NPC object
     */
    ensureRelations(npc) {
        if (!npc.relations) {
            npc.relations = {
                score: this.startingScore,
                history: []
            };
        }
    }

    /**
     * Get the full relation info for an NPC
     * @param {Object} npc - NPC object
     * @returns {{ score: number, effectiveScore: number, tier: Object, tierLabel: string, color: string, tone: string }}
     */
    getRelation(npc) {
        this.ensureRelations(npc);

        const personalScore = npc.relations.score;
        const factionMod = this._getFactionModifier(npc);
        const effectiveScore = Math.max(-100, Math.min(100, personalScore + factionMod));
        const tier = this._getTierForScore(effectiveScore);
        const tone = this.config.dialogueToneByTier[tier.id] || 'neutral';

        return {
            score: personalScore,
            effectiveScore,
            tier,
            tierLabel: tier.label,
            color: tier.color,
            tone
        };
    }

    /**
     * Modify an NPC's relation score by a config-defined modifier key
     * @param {Object} npc - NPC object
     * @param {string} modifierKey - Key from config.modifiers (e.g., 'questCompleteForNPC')
     * @param {Object} [options] - Optional overrides
     * @param {number} [options.exactPoints] - Override with exact point value instead of random range
     * @returns {{ points: number, newScore: number, tier: Object }} Change result
     */
    modifyRelation(npc, modifierKey, options = {}) {
        this.ensureRelations(npc);

        const modifier = this.config.modifiers[modifierKey];
        if (!modifier) {
            console.warn(`⚠️ Unknown relation modifier key: ${modifierKey}`);
            return null;
        }

        // Calculate points (exact override or random within range)
        let points;
        if (options.exactPoints !== undefined) {
            points = options.exactPoints;
        } else if (modifier.min === modifier.max) {
            points = modifier.min;
        } else {
            // Random within range (inclusive)
            const range = Math.abs(modifier.max - modifier.min);
            const minVal = Math.min(modifier.min, modifier.max);
            points = minVal + Math.floor(Math.random() * (range + 1));
        }

        // Apply and clamp
        const oldScore = npc.relations.score;
        npc.relations.score = Math.max(-100, Math.min(100, oldScore + points));

        // Faction contribution — stored unrounded to avoid a rounding cliff on small changes
        if (npc.culture) {
            const rate = this._getFactionContributionRate();
            const oldFactionScore = gameState.get(`factions.${npc.culture}`) || 0;
            const newFactionScore = Math.max(-100, Math.min(100, oldFactionScore + points * rate));
            gameState.set(`factions.${npc.culture}`, newFactionScore);
        }

        // Record history
        npc.relations.history.push({
            type: modifierKey,
            points,
            description: modifier.description,
            timestamp: Date.now()
        });

        // Trim history to max length
        const maxHistory = this.config.defaults.historyMaxLength;
        if (npc.relations.history.length > maxHistory) {
            npc.relations.history = npc.relations.history.slice(-maxHistory);
        }

        const newRelation = this.getRelation(npc);

        console.log(`📊 Relation changed: ${npc.name} ${points >= 0 ? '+' : ''}${points} (${modifierKey}) → ${npc.relations.score} [${newRelation.tierLabel}]`);

        return {
            points,
            newScore: npc.relations.score,
            tier: newRelation.tier
        };
    }

    /**
     * Apply relation bonus to all NPCs in a settlement when a quest is completed there
     * @param {string} settlementId - Settlement ID
     * @param {string} excludeNpcId - NPC who gave the quest (already gets direct bonus)
     */
    modifySettlementRelations(settlementId, excludeNpcId) {
        const world = gameState.get('world');
        if (!world?.generatedRegions) {
            return;
        }

        // Find settlement NPCs across all regions
        for (const region of world.generatedRegions.values()) {
            if (!region?.features) {
                continue;
            }

            for (const feature of region.features) {
                if (feature.type !== 'settlement') {
                    continue;
                }
                if (feature.id !== settlementId && `${feature.x},${feature.y}` !== settlementId) {
                    continue;
                }

                if (feature.npcs) {
                    for (const npc of feature.npcs) {
                        if (npc.id !== excludeNpcId) {
                            this.modifyRelation(npc, 'questCompleteInSettlement');
                        }
                    }
                }
                return;
            }
        }
    }

    /**
     * Get relation history for an NPC (for tooltip/UI display)
     * @param {Object} npc - NPC object
     * @returns {Array} Recent history entries
     */
    getHistory(npc) {
        this.ensureRelations(npc);
        return [...npc.relations.history].reverse(); // Most recent first
    }

    // --- Content Gating ---

    /**
     * Check if an NPC can offer quests to the player
     * @param {Object} npc - NPC object
     * @returns {boolean}
     */
    canOfferQuest(npc) {
        const { tier } = this.getRelation(npc);
        const questMinTier = this.config.thresholds.questMinimumTier;
        const greatHallMinTier = this.config.thresholds.greatHallQuestMinimumTier;

        // Great hall exception: leaders can offer quests at any tier except hostile
        const isGreatHall = npc.building === 'greathall' || npc.role === 'leader';
        if (isGreatHall) {
            return this._isTierAtOrAbove(tier.id, greatHallMinTier);
        }

        return this._isTierAtOrAbove(tier.id, questMinTier);
    }

    /**
     * Check if an NPC will trade with the player
     * @param {Object} npc - NPC object
     * @returns {boolean}
     */
    canTrade(npc) {
        const { tier } = this.getRelation(npc);
        const blockedTier = this.config.thresholds.tradingBlockedTier;
        return tier.id !== blockedTier;
    }

    /**
     * Check if an NPC will speak with the player
     * @param {Object} npc - NPC object
     * @returns {boolean}
     */
    canSpeak(npc) {
        const { tier } = this.getRelation(npc);
        const blockedTier = this.config.thresholds.dialogueBlockedTier;
        return tier.id !== blockedTier;
    }

    /**
     * Get the dialogue tone for an NPC based on current relation
     * @param {Object} npc - NPC object
     * @returns {string} Tone key (e.g., 'warm', 'hostile', 'neutral')
     */
    getDialogueTone(npc) {
        return this.getRelation(npc).tone;
    }

    // --- Pricing ---

    /**
     * Calculate buy price factoring in relation tier and Influence skill
     * @param {Object} item - Item with value property
     * @param {Object} npc - NPC (merchant) object
     * @param {Object} character - Player character
     * @returns {number} Final buy price
     */
    calculateBuyPrice(item, npc, character) {
        const basePrice = item.value || 0;
        if (basePrice <= 0) {
            return 0;
        }

        const { tier } = this.getRelation(npc);
        const tierPricing = this.config.pricingByTier[tier.id];

        // Trading blocked for hostile
        if (tierPricing.buyMultiplier === 0) {
            return Infinity;
        }

        // Influence skill modifier (ability mod + proficiency if proficient)
        const influenceBonus = character.getSkillBonus ? character.getSkillBonus('influence') : 0;
        const influenceEffect = influenceBonus * this.config.defaults.influencePercentPerPoint;

        // Trading practice — permanent passive discount, additive alongside Influence
        const tradingEffect = this._getTradingDiscount(character);

        const finalPrice = basePrice * tierPricing.buyMultiplier * (1.0 - influenceEffect) * (1.0 - tradingEffect);
        return Math.max(1, Math.round(finalPrice));
    }

    /**
     * Calculate sell price factoring in relation tier and Influence skill
     * @param {Object} item - Item with value property
     * @param {Object} npc - NPC (merchant) object
     * @param {Object} character - Player character
     * @returns {number} Final sell price
     */
    calculateSellPrice(item, npc, character) {
        const basePrice = item.value || 0;
        if (basePrice <= 0) {
            return 0;
        }

        const { tier } = this.getRelation(npc);
        const tierPricing = this.config.pricingByTier[tier.id];

        // Trading blocked for hostile
        if (tierPricing.sellMultiplier === 0) {
            return 0;
        }

        // Influence skill modifier
        const influenceBonus = character.getSkillBonus ? character.getSkillBonus('influence') : 0;
        const influenceEffect = influenceBonus * this.config.defaults.influencePercentPerPoint;

        // Trading practice — permanent passive bonus, additive alongside Influence
        const tradingEffect = this._getTradingDiscount(character);

        const finalPrice = basePrice * tierPricing.sellMultiplier * (1.0 + influenceEffect) * (1.0 + tradingEffect);
        return Math.max(1, Math.round(finalPrice));
    }

    /**
     * Trading practice's passive pricing effect. Rank is occurrence count in
     * character.practices (a flat string[], no separate rank field). Rank 2's
     * tradingDiscountPercentRank2 is the total effect at rank 2, not additive on top
     * of rank 1 — relations.json's values are already written as absolutes per rank.
     * @param {Object} character
     * @returns {number} 0, or the rank's discount percent (e.g. 0.05)
     */
    _getTradingDiscount(character) {
        const rank = (character.practices || []).filter(id => id === 'trading').length;
        if (rank >= 2) {
            return this.config.defaults.tradingDiscountPercentRank2 ?? 0;
        }
        if (rank === 1) {
            return this.config.defaults.tradingDiscountPercent ?? 0;
        }
        return 0;
    }

    /**
     * Get pricing summary for UI display
     * @param {Object} npc - NPC object
     * @param {Object} character - Player character
     * @returns {{ tierLabel: string, tierEffect: string, influenceBonus: number, influenceEffect: string, tradingEffect: string }}
     */
    getPricingSummary(npc, character) {
        const { tier, tierLabel } = this.getRelation(npc);
        const tierPricing = this.config.pricingByTier[tier.id];
        const influenceBonus = character.getSkillBonus ? character.getSkillBonus('influence') : 0;
        const influencePercent = Math.abs(influenceBonus);

        let tierEffect = 'normal prices';
        if (tierPricing.buyMultiplier < 1.0) {
            tierEffect = `${Math.round((1.0 - tierPricing.buyMultiplier) * 100)}% discount`;
        } else if (tierPricing.buyMultiplier > 1.0) {
            tierEffect = `${Math.round((tierPricing.buyMultiplier - 1.0) * 100)}% markup`;
        }

        let influenceEffect = 'no negotiation bonus';
        if (influenceBonus > 0) {
            influenceEffect = `${influencePercent}% negotiation bonus`;
        } else if (influenceBonus < 0) {
            influenceEffect = `${influencePercent}% negotiation penalty`;
        }

        const tradingDiscount = this._getTradingDiscount(character);
        const tradingEffect = tradingDiscount > 0
            ? `${Math.round(tradingDiscount * 100)}% trading discount`
            : 'no trading discount';

        return {
            tierLabel,
            tierEffect,
            influenceBonus,
            influenceEffect,
            tradingEffect
        };
    }

    // --- Internal Helpers ---

    /**
     * Get tier object for a given effective score
     */
    _getTierForScore(score) {
        for (const tier of this.tierLookup) {
            if (score >= tier.min && score <= tier.max) {
                return tier;
            }
        }
        // Fallback to neutral
        return this.tierLookup.find(t => t.id === 'neutral') || this.tierLookup[3];
    }

    /**
     * Check if a tier is at or above a minimum tier
     */
    _isTierAtOrAbove(tierId, minimumTierId) {
        const tierIndex = this.tierLookup.findIndex(t => t.id === tierId);
        const minIndex = this.tierLookup.findIndex(t => t.id === minimumTierId);
        return tierIndex >= minIndex;
    }

    /**
     * Get faction modifier for an NPC, derived from standing with npc.culture
     */
    _getFactionModifier(npc) {
        if (!npc.culture) {
            return 0;
        }
        const factionScore = gameState.get(`factions.${npc.culture}`) || 0;
        const { maxPenalty, maxBonus, scalingPerPoint } = this.config.factionModifier;
        return Math.max(maxPenalty, Math.min(maxBonus, factionScore * scalingPerPoint));
    }

    /**
     * Faction contribution rate: how much of a personal relation change also moves
     * faction standing. Wordcraft practice multiplies the base rate by rank (rank 1
     * makes the rate itself baseRate * multiplier, not additive).
     * @returns {number}
     */
    _getFactionContributionRate() {
        const baseRate = this.config.factionContribution.baseRate;
        const character = gameState.get('character');
        const rank = (character?.practices || []).filter(id => id === 'wordcraft').length;
        const multiplier = this.config.factionContribution.wordcraftMultiplierByRank[String(rank)];
        return multiplier ? baseRate * multiplier : baseRate;
    }

    /**
     * Get faction standing for display (character sheet faction panel)
     * @param {string} cultureId
     * @returns {{ score: number, tier: Object, tierLabel: string, color: string }}
     */
    getFactionStanding(cultureId) {
        const score = gameState.get(`factions.${cultureId}`) || 0;
        const tier = this._getTierForScore(Math.round(score));
        return { score, tier, tierLabel: tier.label, color: tier.color };
    }
}
