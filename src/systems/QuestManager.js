/**
 * Quest Manager System
 * Handles quest lifecycle, progress tracking, and quest completion
 */

import { gameState } from '../core/GameState.js';
import QuestGenerator from './QuestGenerator.js';

class QuestManager {
    constructor(questGenerator) {
        this.generator = questGenerator;
        this.questLogOpen = false;
    }

    /**
   * Initialize quest system
   */
    async initialize() {
        await this.generator.loadData();
        console.log('📜 Quest system initialized');
    }

    /**
   * Accept a quest from an NPC
   * @param {string} questId - Quest to accept
   * @param {string} npcId - NPC offering quest
   * @returns {boolean} Success
   */
    acceptQuest(questId, npcId) {
        const quests = gameState.get('quests');
        if (!quests) {
            console.error('Quest state not initialized');
            return false;
        }

        // Find quest in available quests
        const quest = quests.available?.find(q => q.id === questId);
        if (!quest) {
            console.error('Quest not found:', questId);
            return false;
        }

        // Check if already at max active quests
        const maxActive = 10; // TODO: Move to rules engine
        if (quests.active.length >= maxActive) {
            gameState.addMessage(`Cannot accept more than ${maxActive} quests at once!`, 'error');
            return false;
        }

        // Move quest from available to active
        quest.status = 'active';
        quest.acceptedAt = Date.now();
        quest.questGiverId = npcId;

        // Remove from available
        quests.available = quests.available.filter(q => q.id !== questId);

        // Add to active
        quests.active.push(quest);

        // Update state
        gameState.set('quests', quests);

        // Log message
        gameState.addMessage(`📜 Quest Accepted: ${quest.name}`, 'success');
        console.log(`Quest accepted: ${quest.name} (${quest.id})`);

        return true;
    }

    /**
   * Abandon an active quest
   * @param {string} questId - Quest to abandon
   * @returns {boolean} Success
   */
    abandonQuest(questId) {
        const quests = gameState.get('quests');
        if (!quests) {
            return false;
        }

        // Find quest in active quests
        const questIndex = quests.active.findIndex(q => q.id === questId);
        if (questIndex === -1) {
            console.error('Active quest not found:', questId);
            return false;
        }

        const quest = quests.active[questIndex];

        // Remove from active
        quests.active.splice(questIndex, 1);

        // Add to failed
        quest.status = 'failed';
        quest.failedAt = Date.now();
        quest.failReason = 'abandoned';
        quests.failed.push(quest);

        // Update state
        gameState.set('quests', quests);

        // Log message
        gameState.addMessage(`Quest Abandoned: ${quest.name}`, 'error');
        console.log(`Quest abandoned: ${quest.name}`);

        // Apply relation penalty to quest giver NPC
        this._applyRelationChange(quest, 'questAbandoned');

        return true;
    }

    /**
   * Complete a quest and award rewards
   * @param {string} questId - Quest to complete
   * @returns {Object} Reward details
   */
    completeQuest(questId) {
        const quests = gameState.get('quests');
        const character = gameState.get('character');

        if (!quests || !character) {
            console.error('Quest or character state not found');
            return { success: false };
        }

        // Find quest in active quests
        const questIndex = quests.active.findIndex(q => q.id === questId);
        if (questIndex === -1) {
            console.error('Active quest not found:', questId);
            return { success: false };
        }

        const quest = quests.active[questIndex];

        // Check if all objectives are completed
        const allCompleted = quest.objectives.every(obj => obj.completed);
        if (!allCompleted) {
            gameState.addMessage('Quest objectives not yet completed!', 'error');
            return { success: false };
        }

        // Award rewards
        const rewardSummary = this.awardRewards(quest, character);

        // Move quest from active to completed
        quests.active.splice(questIndex, 1);
        quest.status = 'completed';
        quest.completedAt = Date.now();
        quests.completed.push(quest);

        // Update state
        gameState.set('quests', quests);

        // Log messages
        gameState.addMessage(`✅ Quest Completed: ${quest.name}`, 'success');
        if (rewardSummary.xp > 0) {
            gameState.addMessage(`+${rewardSummary.xp} XP`, 'success');
        }
        if (rewardSummary.gold > 0) {
            gameState.addMessage(`+${rewardSummary.gold} Gold`, 'success');
        }
        if (rewardSummary.item) {
            gameState.addMessage(`Received: ${rewardSummary.item}`, 'success');
        }

        console.log(`Quest completed: ${quest.name}`, rewardSummary);

        // Apply relation bonus to quest giver NPC and settlement
        this._applyRelationChange(quest, 'questCompleteForNPC');
        this._applySettlementRelationBonus(quest);

        // Check for campaign progression
        if (quest.type === 'campaign' && quest.nextStage) {
            this.advanceCampaign(quest.nextStage);
        }

        return {
            success: true,
            rewards: rewardSummary
        };
    }

    /**
   * Fail a quest
   * @param {string} questId - Quest to fail
   * @param {string} reason - Failure reason
   */
    failQuest(questId, reason) {
        const quests = gameState.get('quests');
        if (!quests) {
            return;
        }

        const questIndex = quests.active.findIndex(q => q.id === questId);
        if (questIndex === -1) {
            return;
        }

        const quest = quests.active[questIndex];

        // Move to failed
        quests.active.splice(questIndex, 1);
        quest.status = 'failed';
        quest.failedAt = Date.now();
        quest.failReason = reason;
        quests.failed.push(quest);

        gameState.set('quests', quests);
        gameState.addMessage(`Quest Failed: ${quest.name}`, 'error');

        // Apply relation penalty to quest giver NPC
        this._applyRelationChange(quest, 'questFailed');
    }

    /**
   * Award quest rewards to character
   * @param {Object} quest - Quest data
   * @param {Object} character - Character instance
   * @returns {Object} Reward summary
   */
    awardRewards(quest, character) {
        const rewards = quest.rewards || {};
        const summary = {
            xp: 0,
            gold: 0,
            item: null,
            reputation: null
        };

        // Award XP
        if (rewards.xp) {
            character.addXP(rewards.xp);
            summary.xp = rewards.xp;
        }

        // Award Gold
        if (rewards.gold) {
            character.addGold(rewards.gold);
            summary.gold = rewards.gold;
        }

        // Award Item (TODO: Implement item system)
        if (rewards.item && rewards.item !== 'random') {
            // Future: Add item to inventory
            summary.item = rewards.item;
            console.log(`Quest reward item: ${rewards.item} (not yet implemented)`);
        }

        // Award Reputation (TODO: Implement faction system)
        if (rewards.reputation) {
            summary.reputation = rewards.reputation;
            console.log('Quest reputation reward (not yet implemented):', rewards.reputation);
        }

        return summary;
    }

    /**
   * Update progress on kill objectives
   * @param {string} creatureId - Creature type killed
   * @param {Object} location - Where killed {x, y}
   */
    onCreatureKilled(creatureId, location) {
        const quests = gameState.get('quests');
        if (!quests || !quests.active) {
            return;
        }

        let updated = false;

        quests.active.forEach(quest => {
            quest.objectives.forEach(objective => {
                if (objective.type === 'kill' && !objective.completed) {
                    const req = objective.requirement;

                    // Check if this creature type matches
                    const matchesType = req.creatureTypes?.includes(creatureId) || req.anyCreature;

                    // Check location constraint (if any)
                    let matchesLocation = true;
                    if (req.location?.nearSettlement) {
                        const settlement = quest.settlement;
                        const distance = Math.sqrt(
                            Math.pow(location.x - settlement.x, 2) +
              Math.pow(location.y - settlement.y, 2)
                        );
                        matchesLocation = distance <= (req.location.radius || 100);
                    }

                    if (matchesType && matchesLocation) {
                        objective.progress++;
                        if (objective.progress >= objective.required) {
                            objective.completed = true;
                            gameState.addMessage(`Quest Objective Complete: ${objective.description}`, 'success');
                        } else {
                            gameState.addMessage(`Quest Progress: ${quest.name} (${objective.progress}/${objective.required})`, 'info');
                        }
                        updated = true;
                    }
                }
            });
        });

        if (updated) {
            gameState.set('quests', quests);
            this.checkQuestCompletion();
        }
    }

    /**
   * Update progress on item acquisition
   * @param {string} itemId - Item acquired
   */
    onItemAcquired(itemId) {
        const quests = gameState.get('quests');
        if (!quests || !quests.active) {
            return;
        }

        let updated = false;

        quests.active.forEach(quest => {
            quest.objectives.forEach(objective => {
                if (objective.type === 'retrieve' && !objective.completed) {
                    const req = objective.requirement;

                    if (req.itemId === itemId) {
                        objective.progress = 1;
                        objective.completed = true;
                        gameState.addMessage(`Quest Objective Complete: ${objective.description}`, 'success');
                        updated = true;
                    }
                }
            });
        });

        if (updated) {
            gameState.set('quests', quests);
            this.checkQuestCompletion();
        }
    }

    /**
   * Update progress on NPC interaction
   * @param {string} npcId - NPC interacted with
   */
    onNPCInteraction(npcId) {
        const quests = gameState.get('quests');
        if (!quests || !quests.active) {
            return;
        }

        let updated = false;

        quests.active.forEach(quest => {
            quest.objectives.forEach(objective => {
                if ((objective.type === 'return' || objective.type === 'interact' || objective.type === 'deliver') && !objective.completed) {
                    const req = objective.requirement;

                    // Check if this NPC matches
                    const matchesNPC = req.npcId === npcId ||
                           (req.npcRole && quest.questGiverId === npcId); // Return to quest giver

                    if (matchesNPC) {
                        objective.progress = 1;
                        objective.completed = true;
                        gameState.addMessage(`Quest Objective Complete: ${objective.description}`, 'success');
                        updated = true;
                    }
                }
            });
        });

        if (updated) {
            gameState.set('quests', quests);
            this.checkQuestCompletion();
        }
    }

    /**
   * Update progress on location discovery
   * @param {Object} location - Location discovered {x, y, featureType}
   */
    onLocationDiscovered(location) {
        const quests = gameState.get('quests');
        if (!quests || !quests.active) {
            return;
        }

        let updated = false;

        quests.active.forEach(quest => {
            quest.objectives.forEach(objective => {
                if (objective.type === 'explore' && !objective.completed) {
                    const req = objective.requirement;

                    // Check if feature type matches
                    const matchesType = req.featureType === location.featureType;

                    // Check distance constraint
                    let matchesDistance = true;
                    if (req.within) {
                        const settlement = quest.settlement;
                        const distance = Math.sqrt(
                            Math.pow(location.x - settlement.x, 2) +
              Math.pow(location.y - settlement.y, 2)
                        );
                        matchesDistance = distance <= req.within;
                    }

                    if (matchesType && matchesDistance) {
                        objective.progress = 1;
                        objective.completed = true;
                        gameState.addMessage(`Quest Objective Complete: ${objective.description}`, 'success');
                        updated = true;
                    }
                }
            });
        });

        if (updated) {
            gameState.set('quests', quests);
            this.checkQuestCompletion();
        }
    }

    /**
   * Update progress on skill challenge completion
   * @param {string} challengeId - Skill challenge ID
   * @param {Object} result - Challenge result {success, critical, rollResult}
   */
    onSkillChallengeCompleted(challengeId, result) {
        const quests = gameState.get('quests');
        if (!quests || !quests.active) {
            return;
        }

        let updated = false;

        quests.active.forEach(quest => {
            quest.objectives.forEach(objective => {
                if (objective.type === 'skill' && !objective.completed) {
                    const req = objective.requirement;

                    // Check if this challenge matches
                    const matchesChallenge = req.challengeId === challengeId;

                    // Check if success is required
                    const meetsSuccessReq = !req.requireSuccess || result.success;

                    if (matchesChallenge && meetsSuccessReq) {
                        objective.progress++;
                        if (objective.progress >= objective.required) {
                            objective.completed = true;
                            gameState.addMessage(`Quest Objective Complete: ${objective.description}`, 'success');
                        } else {
                            gameState.addMessage(`Quest Progress: ${quest.name} (${objective.progress}/${objective.required})`, 'info');
                        }
                        updated = true;
                    }
                }
            });
        });

        if (updated) {
            gameState.set('quests', quests);
            this.checkQuestCompletion();
        }
    }

    /**
   * Get active quests that require a specific skill challenge
   * @param {string} challengeId - Challenge ID
   * @returns {Array<Object>} Quests requiring this challenge
   */
    getQuestsRequiringChallenge(challengeId) {
        const quests = gameState.get('quests');
        if (!quests || !quests.active) {
            return [];
        }

        return quests.active.filter(quest => {
            return quest.objectives.some(obj =>
                obj.type === 'skill' &&
        !obj.completed &&
        obj.requirement.challengeId === challengeId
            );
        });
    }

    /**
   * Check all active quests for completion
   * @returns {Array<string>} Completed quest IDs
   */
    checkQuestCompletion() {
        const quests = gameState.get('quests');
        if (!quests || !quests.active) {
            return [];
        }

        const completedIds = [];

        quests.active.forEach(quest => {
            const allCompleted = quest.objectives.every(obj => obj.completed);
            if (allCompleted && quest.status === 'active') {
                // Mark as ready to turn in (not auto-complete)
                quest.status = 'ready_to_turn_in';
                completedIds.push(quest.id);
                gameState.addMessage(`✅ Quest Ready to Turn In: ${quest.name}`, 'success');
            }
        });

        if (completedIds.length > 0) {
            gameState.set('quests', quests);
        }

        return completedIds;
    }

    /**
   * Get current campaign quest
   * @returns {Object|null} Active campaign quest
   */
    getCurrentCampaignQuest() {
        const quests = gameState.get('quests');
        if (!quests) {
            return null;
        }

        // Check active quests for campaign quest
        const activeCampaign = quests.active.find(q => q.type === 'campaign');
        if (activeCampaign) {
            return activeCampaign;
        }

        // Check if we need to start next campaign stage
        const campaignProgress = gameState.get('campaignProgress') || 1;
        return this.generator.getCampaignQuest(campaignProgress);
    }

    /**
   * Advance campaign to next stage
   * @param {number} nextStage - Next stage number
   */
    advanceCampaign(nextStage) {
        gameState.set('campaignProgress', nextStage);
        gameState.addMessage(`📖 Campaign Advanced to Stage ${nextStage}`, 'info');
        console.log(`Campaign advanced to stage ${nextStage}`);

        // Auto-generate next campaign quest
        const nextQuest = this.generator.getCampaignQuest(nextStage);
        if (nextQuest) {
            const quests = gameState.get('quests');
            quests.available.push(nextQuest);
            gameState.set('quests', quests);
            gameState.addMessage(`New Campaign Quest Available: ${nextQuest.name}`, 'success');
        }
    }

    /**
   * Get all active quests
   * @returns {Array<Object>} Active quests
   */
    getActiveQuests() {
        const quests = gameState.get('quests');
        return quests?.active || [];
    }

    /**
   * Get all completed quests
   * @returns {Array<Object>} Completed quests
   */
    getCompletedQuests() {
        const quests = gameState.get('quests');
        return quests?.completed || [];
    }

    /**
   * Get all failed quests
   * @returns {Array<Object>} Failed quests
   */
    getFailedQuests() {
        const quests = gameState.get('quests');
        return quests?.failed || [];
    }

    /**
   * Get quest by ID
   * @param {string} questId - Quest ID
   * @returns {Object|null} Quest data
   */
    getQuest(questId) {
        const quests = gameState.get('quests');
        if (!quests) {
            return null;
        }

        // Search all quest lists
        const allQuests = [
            ...quests.available,
            ...quests.active,
            ...quests.completed,
            ...quests.failed
        ];

        return allQuests.find(q => q.id === questId) || null;
    }

    /**
   * Get quests available from an NPC
   * @param {Object} npc - NPC data
   * @returns {Array<Object>} Available quests
   */
    getAvailableQuestsFromNPC(npc) {
        if (!npc.availableQuests || npc.availableQuests.length === 0) {
            return [];
        }

        const quests = gameState.get('quests');
        if (!quests) {
            return [];
        }

        return npc.availableQuests
            .map(questId => quests.available.find(q => q.id === questId))
            .filter(q => q !== undefined);
    }

    /**
   * Get quests from a specific NPC by status
   * @param {string} npcId - NPC ID
   * @param {string} status - Quest status ('available', 'active', 'completed')
   * @returns {Array<Object>} Quests
   */
    getQuestsFromNPC(npcId, status = 'available') {
        const quests = gameState.get('quests');
        if (!quests) {
            return [];
        }

        let questList = [];

        if (status === 'available') {
            // Available quests that haven't been taken yet (from gameState, not this.availableQuests)
            questList = (quests.available || []).filter(q => q.questGiver?.npcId === npcId);
        } else if (status === 'active') {
            // Active quests from this NPC
            questList = quests.active.filter(q => q.questGiver?.npcId === npcId);
        } else if (status === 'completed') {
            // Completed quests from this NPC
            questList = quests.completed.filter(q => q.questGiver?.npcId === npcId);
        }

        return questList;
    }

    /**
   * Check if a quest is ready to complete (all objectives done)
   * @param {string} questId - Quest ID
   * @returns {boolean} Ready to complete
   */
    isQuestReadyToComplete(questId) {
        const quest = this.getQuest(questId);
        if (!quest) {
            return false;
        }

        return quest.objectives.every(obj => obj.completed);
    }

    /**
   * Get quests ready to turn in to an NPC
   * @param {string} npcId - NPC ID
   * @returns {Array<Object>} Turn-in ready quests
   */
    getTurnInQuestsForNPC(npcId) {
        const quests = gameState.get('quests');
        if (!quests) {
            return [];
        }

        return quests.active.filter(q =>
            q.questGiver?.npcId === npcId && this.isQuestReadyToComplete(q.id)
        );
    }

    /**
   * Open quest log UI
   */
    openQuestLog() {
        const modal = document.getElementById('questLogModal');
        if (!modal) {
            console.error('Quest log modal not found');
            return;
        }

        this.questLogOpen = true;
        this.renderQuestLog();
        modal.style.display = 'flex';
    }

    /**
   * Close quest log UI
   */
    closeQuestLog() {
        const modal = document.getElementById('questLogModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.questLogOpen = false;
    }

    /**
   * Render quest log (to be implemented in main.js)
   */
    renderQuestLog() {
    // This will be implemented in main.js with proper UI rendering
        console.log('Quest log render requested (UI not yet implemented)');
    }

    /**
     * Apply a relation change to the quest giver NPC
     * Finds the NPC in the world and applies the modifier
     * @param {Object} quest - Quest object with questGiver info
     * @param {string} modifierKey - Relation modifier key from relations.json
     */
    _applyRelationChange(quest, modifierKey) {
        const relationManager = window.game?.relationManager;
        if (!relationManager) return;

        const npcId = quest.questGiver?.npcId;
        if (!npcId) return;

        const npc = this._findNPCById(npcId);
        if (npc) {
            const result = relationManager.modifyRelation(npc, modifierKey);
            if (result) {
                const sign = result.points >= 0 ? '+' : '';
                gameState.addMessage(`${sign}${result.points} relation with ${npc.name} [${result.tier.label}]`, result.points >= 0 ? 'success' : 'warning');
            }
        }
    }

    /**
     * Apply settlement-wide relation bonus when a quest is completed
     * All NPCs in the settlement get a small bonus (except the quest giver who gets the direct bonus)
     * @param {Object} quest - Completed quest
     */
    _applySettlementRelationBonus(quest) {
        const relationManager = window.game?.relationManager;
        if (!relationManager) return;

        const npcId = quest.questGiver?.npcId;
        const settlementId = quest.questGiver?.settlementId
            || (quest.questGiver?.npcId ? quest.questGiver.npcId.split('_').slice(1, 3).join('_') : null);

        if (settlementId) {
            relationManager.modifySettlementRelations(settlementId, npcId);
        }
    }

    /**
     * Find an NPC by ID across all settlements in the world
     * @param {string} npcId - NPC ID
     * @returns {Object|null} NPC object or null
     */
    _findNPCById(npcId) {
        const world = gameState.get('world');
        if (!world?.generatedRegions) return null;

        for (const regionKey of Object.keys(world.generatedRegions)) {
            const region = world.generatedRegions[regionKey];
            if (!region?.features) continue;

            for (const feature of region.features) {
                if (feature.type !== 'settlement' || !feature.npcs) continue;

                const npc = feature.npcs.find(n => n.id === npcId);
                if (npc) return npc;
            }
        }

        // Also check persistent settlement data
        if (world.settlements) {
            for (const settlementData of Object.values(world.settlements)) {
                if (settlementData.npcs) {
                    const npc = settlementData.npcs.find(n => n.id === npcId);
                    if (npc) return npc;
                }
            }
        }

        return null;
    }
}

export default QuestManager;
