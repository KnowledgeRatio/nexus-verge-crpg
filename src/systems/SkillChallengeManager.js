/**
 * Nexus Verge - Skill Challenge Manager
 *
 * Manages skill challenge execution with balance-aware reward calculation.
 * Integrates with existing LootManager for item rewards.
 *
 * Key Features:
 * - Multi-layered reward calculation (Base × SkillValue × Challenge × Risk × Level × Critical)
 * - Cooldown system to prevent spam
 * - Frequency-based triggering with context modifiers
 * - Critical success/failure detection
 * - Loot integration via LootManager
 * - Sequential, choice, and single challenge types
 */

import { RULES } from '../core/rulesEngine.js';
import { gameState } from '../core/GameState.js';
import { rollDice, rollD20, roll } from '../utils/dice.js';
import { createRNG } from '../utils/rng.js';

export class SkillChallengeManager {
    constructor() {
        this.challenges = null; // Loaded from data/skillChallenges.json
        this.activeChallenges = new Map(); // Track active sequential challenges
        this.challengeCooldowns = new Map(); // Track cooldowns per challenge type
        this.lastChallengeTime = new Map(); // Timestamp of last challenge attempt
    }

    /**
     * Load skill challenges from JSON data
     * @param {Object} challengeData - Challenge data from data/skillChallenges.json
     */
    async loadChallenges(challengeData) {
        this.challenges = challengeData;
        console.log(`✅ Loaded ${Object.keys(challengeData.challenges).length} skill challenges`);
    }

    /**
     * Check if a challenge should trigger based on frequency and context
     * @param {string} templateId - Challenge template ID
     * @param {Object} context - Trigger context (questRequires, npcDialogue, terrain, etc.)
     * @returns {boolean} - True if challenge should trigger
     */
    shouldTriggerChallenge(templateId, context = {}) {
        const template = this.challenges.challenges[templateId];
        if (!template) {
            console.warn(`⚠️ Challenge template not found: ${templateId}`);
            return false;
        }

        const balance = template.balance || {};
        const baseFrequency = balance.triggerFrequency || 0.1;

        // Check cooldown
        if (!this.canAttemptChallenge(templateId)) {
            return false;
        }

        // Context modifiers
        let frequencyMod = 1.0;

        if (context.questRequires) {
            // Quest explicitly requires this challenge - always trigger
            frequencyMod = 10.0; // Effectively guaranteed
        } else if (context.npcDialogue) {
            frequencyMod = RULES.skillChallenges.balancing.triggerFrequencyModifiers.npc_dialogue || 0.3;
        } else if (context.terrain) {
            frequencyMod = RULES.skillChallenges.balancing.triggerFrequencyModifiers.terrain_base || 0.1;
        } else if (context.dungeonFeature) {
            frequencyMod = RULES.skillChallenges.balancing.triggerFrequencyModifiers.dungeon_feature || 0.25;
        }

        const finalFrequency = Math.min(1.0, baseFrequency * frequencyMod);

        return Math.random() < finalFrequency;
    }

    /**
     * Check if challenge can be attempted (not on cooldown)
     * @param {string} templateId - Challenge template ID
     * @returns {boolean} - True if challenge can be attempted
     */
    canAttemptChallenge(templateId) {
        if (!RULES.skillChallenges.cooldowns.enabled) {
            return true;
        }

        const lastAttempt = this.lastChallengeTime.get(templateId);
        if (!lastAttempt) {
            return true;
        }

        const template = this.challenges.challenges[templateId];
        const cooldown = template.balance?.cooldown || RULES.skillChallenges.cooldowns.defaultCooldown;

        const timeSinceLastAttempt = Date.now() - lastAttempt;
        return timeSinceLastAttempt >= cooldown;
    }

    /**
     * Record challenge attempt for cooldown tracking
     * @param {string} templateId - Challenge template ID
     */
    recordChallengeAttempt(templateId) {
        this.lastChallengeTime.set(templateId, Date.now());
    }

    /**
     * Calculate level-adjusted DC
     * @param {number} baseDC - Base DC from challenge template
     * @param {number} playerLevel - Player's level
     * @returns {number} - Adjusted DC
     */
    calculateAdjustedDC(baseDC, playerLevel) {
        if (!RULES.skillChallenges.difficultyScaling.enabled) {
            return baseDC;
        }

        const dcIncrease = RULES.skillChallenges.balancing.levelScaling.dcIncreasePerLevel;
        return Math.round(baseDC + (playerLevel * dcIncrease));
    }

    /**
     * Calculate final rewards with all balance multipliers
     * @param {Object} template - Challenge template
     * @param {number} playerLevel - Player's level
     * @param {boolean} success - Whether challenge was successful
     * @param {boolean} critical - Whether roll was critical (success or failure)
     * @returns {Object} - Final rewards with breakdown
     */
    calculateFinalRewards(template, playerLevel, success, critical) {
        const balance = template.balance || {};
        const baseRewards = success ? (template.onSuccess || {}) : {};

        if (!success) {
            return {
                xp: 0,
                gold: 0,
                loot: null,
                breakdown: {
                    base: { xp: 0, gold: 0 },
                    finalReason: 'Challenge failed - no rewards'
                }
            };
        }

        // Base reward values
        let xp = baseRewards.xp || 0;
        let gold = baseRewards.gold || 0;

        // Apply skill value multiplier
        const skillValueMult = RULES.skillChallenges.balancing.skillValueMultipliers[balance.skillValue] || 1.0;

        // Apply challenge-specific multiplier
        const challengeMult = balance.rewardMultiplier || 1.0;

        // Apply risk level multiplier
        const riskMult = RULES.skillChallenges.balancing.riskLevelModifiers[balance.riskLevel] || 1.0;

        // Apply level scaling
        const levelMult = 1 + (playerLevel * RULES.skillChallenges.balancing.levelScaling.xpMultiplierPerLevel);

        // Apply critical success bonus
        const critMult = critical ? (1 + RULES.skillChallenges.balancing.criticalThresholds.critSuccessBonus) : 1.0;

        // Calculate final values
        const finalXP = Math.floor(xp * skillValueMult * challengeMult * riskMult * levelMult * critMult);
        const finalGold = Math.floor(gold * skillValueMult * challengeMult * riskMult * levelMult * critMult);

        return {
            xp: finalXP,
            gold: finalGold,
            loot: this.calculateLootReward(template, playerLevel, critical),
            breakdown: {
                base: { xp, gold },
                skillValueMult,
                challengeMult,
                riskMult,
                levelMult,
                critMult,
                final: { xp: finalXP, gold: finalGold }
            }
        };
    }

    /**
     * Calculate loot reward based on challenge and player level
     * @param {Object} template - Challenge template
     * @param {number} playerLevel - Player's level
     * @param {boolean} critical - Whether critical success
     * @returns {Object|null} - Loot configuration or null
     */
    calculateLootReward(template, playerLevel, critical) {
        const balance = template.balance || {};
        const lootConfig = template.onSuccess?.loot;

        if (!lootConfig) {
            return null;
        }

        // Calculate final loot chance
        const baseLootChance = lootConfig.chance || 0.7;
        const skillValueMult = RULES.skillChallenges.balancing.lootChanceBySkillValue[balance.skillValue] || 1.0;
        const lootChanceMult = balance.lootChanceMultiplier || 1.0;
        const critMult = critical ? (1 + RULES.skillChallenges.criticals.critSuccessRewards.lootRollsBonus) : 1.0;

        const finalLootChance = Math.min(1.0, baseLootChance * skillValueMult * lootChanceMult);

        return {
            table: lootConfig.table,
            rolls: Math.floor(lootConfig.rolls * critMult),
            chance: finalLootChance,
            rarityFilter: this.getRarityFilterForLevel(playerLevel, lootConfig.rarityFilter)
        };
    }

    /**
     * Get rarity filter for player level
     * @param {number} playerLevel - Player's level
     * @param {Object} rarityFilter - Rarity filter from challenge template
     * @returns {Array<string>} - Allowed rarities
     */
    getRarityFilterForLevel(playerLevel, rarityFilter) {
        if (!rarityFilter) {
            return ['common', 'uncommon'];
        }

        const levelTier = this.getLevelTier(playerLevel);
        return rarityFilter[levelTier] || ['common'];
    }

    /**
     * Get level tier string
     * @param {number} level - Player level
     * @returns {string} - Level tier (e.g., "1-4", "5-9")
     */
    getLevelTier(level) {
        if (level <= 4) return '1-4';
        if (level <= 9) return '5-9';
        if (level <= 14) return '10-14';
        return '15+';
    }

    /**
     * Check if roll is critical success or failure
     * @param {number} roll - d20 roll result (natural, before modifiers)
     * @param {number} total - Total roll result (with modifiers)
     * @param {number} dc - Challenge DC
     * @returns {Object} - { isCritical: boolean, type: 'success'|'failure'|null }
     */
    checkCritical(roll, total, dc) {
        if (!RULES.skillChallenges.criticals.enabled) {
            return { isCritical: false, type: null };
        }

        // Natural 20/1
        if (RULES.skillChallenges.balancing.criticalThresholds.naturalCrit) {
            if (roll === 20) {
                return { isCritical: true, type: 'success' };
            }
            if (roll === 1) {
                return { isCritical: true, type: 'failure' };
            }
        }

        // Margin critical (±10 from DC)
        if (RULES.skillChallenges.balancing.criticalThresholds.marginCrit) {
            const margin = RULES.skillChallenges.balancing.criticalThresholds.critMargin;
            const difference = total - dc;

            if (difference >= margin) {
                return { isCritical: true, type: 'success' };
            }
            if (difference <= -margin && total < dc) {
                return { isCritical: true, type: 'failure' };
            }
        }

        return { isCritical: false, type: null };
    }

    /**
     * Execute a single skill check
     * @param {Object} character - Character object
     * @param {string} skillId - Skill ID
     * @param {number} dc - Challenge DC
     * @param {Object} options - Options (advantage, disadvantage)
     * @returns {Object} - Roll result with success/failure and critical info
     */
    executeSkillCheck(character, skillId, dc, options = {}) {
        // Roll skill check (will use Character.rollSkill() method)
        const rollResult = character.rollSkill(skillId, options);

        const { roll, total, modifier, advantage, disadvantage } = rollResult;

        // Check if success
        const success = total >= dc;

        // Check for critical
        const critical = this.checkCritical(roll, total, dc);

        return {
            success,
            roll,
            total,
            modifier,
            dc,
            advantage,
            disadvantage,
            critical: critical.isCritical,
            criticalType: critical.type,
            margin: total - dc
        };
    }

    /**
     * Get suggested reward multiplier for a skill (for balancing new challenges)
     * @param {string} skillName - Skill name
     * @returns {number} - Suggested multiplier
     */
    getSuggestedMultiplierForSkill(skillName) {
        // Map skills to value tiers
        const skillValueMap = {
            // Very High Value (already enables major gameplay benefits)
            cunning: 'very_high',       // Stealth = sneak attack + combat avoidance
            perception: 'very_high',    // Spot ambushes, find treasure, avoid traps

            // High Value (significant external benefits)
            influence: 'high',          // Better prices, quest alternatives
            deception: 'high',          // Quest alternatives, social manipulation
            acrobatics: 'high',         // Dodge bonus, movement advantages

            // Medium Value (moderate external benefits)
            investigation: 'medium',    // Find clues, quest progress
            arcana: 'medium',           // Identify magic, dispel effects
            empathy: 'medium',          // Detect lies, animal handling
            sleightOfHand: 'medium',    // Pickpocket, lockpicking

            // Low Value (limited external benefits)
            athletics: 'low',           // Grapple, jump, climb
            endurance: 'low',           // Resist exhaustion
            creativity: 'low',          // Improvisation
            academia: 'low'             // Lore knowledge
        };

        const valueTier = skillValueMap[skillName] || 'medium';
        return RULES.skillChallenges.balancing.skillValueMultipliers[valueTier];
    }

    /**
     * Apply challenge consequences (rewards, damage, conditions, etc.)
     * @param {Object} character - Character object
     * @param {Object} challenge - Challenge template
     * @param {Object} outcome - Challenge outcome (onSuccess or onFailure)
     * @param {Object} rollResult - Roll result from executeSkillCheck
     * @returns {Object} - Applied consequences summary
     */
    applyConsequences(character, challenge, outcome, rollResult) {
        console.log('🔍 applyConsequences called:', {
            success: rollResult.success,
            outcomeKeys: Object.keys(outcome),
            hasDamage: !!outcome.damage,
            hasCondition: !!outcome.condition,
            outcome
        });

        const consequences = {
            messages: [],
            xp: 0,
            gold: 0,
            items: [],
            damage: 0,
            conditions: []
        };

        const playerLevel = character.level;
        const { success, critical, criticalType } = rollResult;

        // XP and Gold rewards (only on success)
        if (success) {
            const rewards = this.calculateFinalRewards(challenge, playerLevel, true, critical && criticalType === 'success');

            if (rewards.xp > 0) {
                character.gainXP(rewards.xp);
                consequences.xp = rewards.xp;
                consequences.messages.push(`✨ Gained ${rewards.xp} XP`);
            }

            if (rewards.gold > 0) {
                character.gold += rewards.gold;
                gameState.set('character', character);
                consequences.gold = rewards.gold;
                consequences.messages.push(`💰 Found ${rewards.gold} gold`);
            }

            // Item Rewards (uses existing LootManager)
            if (rewards.loot && window.lootManager) {
                const lootConfig = rewards.loot;

                // Check loot chance
                const lootChanceRoll = Math.random();

                if (lootChanceRoll < lootConfig.chance) {
                    const lootTable = lootConfig.table;
                    const rollCount = lootConfig.rolls || 1;

                    // Get rarity filter for player level
                    const allowedRarities = lootConfig.rarityFilter;

                    // Roll on loot table using LootManager
                    const rng = createRNG(challenge.seed + '_loot');
                    const items = window.lootManager.rollOnTable(
                        lootTable,
                        rollCount,
                        rng,
                        character.level
                    );

                    // Filter by rarity (LootManager already filters by minimumLevel)
                    const filteredItems = items.filter(item =>
                        allowedRarities.includes(item.rarity)
                    );

                    // Add items to character inventory
                    filteredItems.forEach(item => {
                        const quantity = item.quantity || 1;
                        character.addItem(item, quantity);  // Uses Character.addItem() - handles stacking
                        consequences.items.push(item);

                        const quantityText = quantity > 1 ? ` (×${quantity})` : '';
                        consequences.messages.push(`✨ Found: ${item.name}${quantityText}`);
                    });

                    gameState.set('character.inventory', character.inventory);

                    // Success notification
                    if (filteredItems.length > 0) {
                        consequences.messages.push(`📦 Looted ${filteredItems.length} item(s)`);
                    }
                } else {
                    // Loot chance failed
                    consequences.messages.push(`🔍 You search but find nothing of value`);
                }
            }
        }

        // Damage (usually on failure)
        console.log('🔍 Checking for damage:', { hasDamage: !!outcome.damage, damage: outcome.damage });
        if (outcome.damage) {
            let damageAmount = 0;

            if (typeof outcome.damage === 'string') {
                // Dice notation (e.g., "2d6")
                damageAmount = roll(outcome.damage);
                console.log(`🎲 Rolled damage: ${outcome.damage} = ${damageAmount}`);
            } else if (typeof outcome.damage === 'number') {
                damageAmount = outcome.damage;
                console.log(`🎲 Fixed damage: ${damageAmount}`);
            }

            // Apply critical failure multiplier
            if (!success && critical && criticalType === 'failure') {
                const oldAmount = damageAmount;
                damageAmount = Math.floor(damageAmount * RULES.skillChallenges.balancing.criticalThresholds.critFailureSeverity);
                console.log(`💥 Critical failure! Damage ${oldAmount} → ${damageAmount}`);
            }

            if (damageAmount > 0) {
                console.log(`💔 Applying ${damageAmount} damage to character`);
                character.takeDamage(damageAmount);
                consequences.damage = damageAmount;
                consequences.messages.push(`💔 Took ${damageAmount} ${outcome.damageType || 'damage'}`);
                console.log('✅ Damage applied, messages:', consequences.messages);
            } else {
                console.log('⚠️ Damage amount is 0, not applying');
            }
        } else {
            console.log('⚠️ No damage in outcome');
        }

        // Conditions (poisoned, prone, etc.)
        if (outcome.condition) {
            character.addCondition(outcome.condition, outcome.duration || 'untilEndOfTurn');
            consequences.conditions.push(outcome.condition);
            consequences.messages.push(`🌀 Afflicted: ${outcome.condition}`);
        }

        return consequences;
    }
}

// Create singleton instance
const skillChallengeManager = new SkillChallengeManager();

export default skillChallengeManager;
