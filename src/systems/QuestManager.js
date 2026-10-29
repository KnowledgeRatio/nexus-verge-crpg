/**
 * Quest Manager System
 * Handles quest lifecycle, progress tracking, and quest completion
 */

import { gameState } from '../core/GameState.js';
import QuestGenerator from './QuestGenerator.js';
import { SeededRandom } from '../utils/rng.js';
import { getLevelFromXP, RULES } from '../core/rulesEngine.js';
import Character from './Character.js';
import { skillRegistry } from './SkillRegistry.js';
import { addFatigue } from './FatigueManager.js';
import { hasExplicitQuestStanding, questStandingPreview, questOriginSettlementId } from './QuestReputation.js';
import { projectQuestTracking, questTrackingTarget, questIssuer, questBearing,
    questHasLocationProof, sanitizeTrackedQuestId } from './QuestTracking.js';
import { isRichQuest, atQuestLocation, questEntries, observeQuestRoom, performQuestAction,
    applyQuestResolution, ensureQuestState, matchesQuestEncounter, refreshCustodyObjectives,
    prerequisitesMet } from './ProceduralQuest.js';

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
        this.refreshTrackingIntel();
        console.log('Quest system initialized');
    }

    /** Select a single active quest, or clear tracking with null. */
    setTrackedQuest(idOrNull) {
        const quests = gameState.get('quests');
        if (!quests || (idOrNull !== null && !quests.active?.some(quest => quest.id === idOrNull
            && !['completed', 'failed'].includes(quest.status)))) {
            return false;
        }
        quests.trackedQuestId = idOrNull;
        this.refreshTrackingIntel();
        gameState.set('quests', quests);
        return true;
    }

    /** Persist actual discoveries once; render/read paths never acquire knowledge. */
    refreshTrackingIntel() {
        const quests = gameState.get('quests');
        if (!quests) {
            return false;
        }
        let changed = quests.trackedQuestId !== sanitizeTrackedQuestId(quests);
        quests.trackedQuestId = sanitizeTrackedQuestId(quests);
        if (RULES.quests.tracking.enabled) {
            const world = gameState.get('world') || {};
            for (const quest of quests.active || []) {
                const targets = [questTrackingTarget(quest), ...(quest.objectives || []).map(objective =>
                    questTrackingTarget(quest, objective))].filter(Boolean);
                for (const target of targets) {
                    if (!quest.trackingDiscoveries?.[target.key]
                        && questHasLocationProof(quest, target, world, RULES.worldGen.regionSize)) {
                        quest.trackingDiscoveries ||= {};
                        quest.trackingDiscoveries[target.key] = true;
                        changed = true;
                    }
                }
            }
        }
        if (changed) {
            gameState.set('quests', quests);
        }
        return changed;
    }

    /** Safe navigation VM only: no hidden coordinates outside exact guidance. */
    getTrackedQuestGuidance() {
        const quests = gameState.get('quests');
        const id = sanitizeTrackedQuestId(quests);
        return projectQuestTracking(quests?.active?.find(quest => quest.id === id),
            gameState.get('world') || {}, RULES.quests.tracking);
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
        if (isRichQuest(quest) && (quest.questGiver?.npcId !== npcId
            || !atQuestLocation(quest, { location: 'settlement' }))) {
            return false;
        }

        // Check if already at max active quests
        const maxActive = RULES.quests.maxActiveQuests;
        if (quests.active.length >= maxActive) {
            gameState.addMessage(`Cannot accept more than ${maxActive} quests at once!`, 'error');
            return false;
        }

        // Move quest from available to active
        quest.status = 'active';
        quest.acceptedAt = Date.now();
        quest.questGiverId = npcId;
        ensureQuestState(quest);
        if (quest.iteration && quest.deadlineDuration) {
            quest.deadlineAt = (gameState.get('world.worldClock') || 0) + quest.deadlineDuration;
        }

        // Remove from available
        quests.available = quests.available.filter(q => q.id !== questId);

        // Add to active
        quests.active.push(quest);

        // Only an actually delivered selected briefing authorizes tier guidance.
        const briefing = quest.intelDialogue?.[quest.intelQuality];
        if (typeof briefing === 'string' && briefing.trim()) {
            gameState.addMessage(briefing, 'info');
            const target = questTrackingTarget(quest);
            const origin = questIssuer(quest, gameState.get('world') || {});
            quest.trackingIntel = { quality: quest.intelQuality, origin,
                targetKey: target?.key || null,
                ...(quest.intelQuality === 'low' && origin && target
                    ? { bearing: questBearing(origin, target, RULES.quests.tracking.bearings) } : {}) };
        }

        // Update state
        gameState.set('quests', quests);

        this.refreshTrackingIntel();

        // Log message
        gameState.addMessage(`Quest Accepted: ${quest.name}`, 'success');
        console.log(`Quest accepted: ${quest.name} (${quest.id})`);

        return true;
    }

    /**
   * Abandon an active quest
   * @param {string} questId - Quest to abandon
   * @returns {boolean} Success
   */
    abandonQuest(questId) {
        this.checkQuestDeadlines();
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
        if (quest.resolutionPending || quest.expiryPending) {
            gameState.addMessage('Finish the current handover before abandoning this commission.', 'warning');
            return false;
        }
        this._releaseQuestCustody(quest);

        // Remove from active
        quests.active.splice(questIndex, 1);

        // Add to failed
        quest.status = 'failed';
        quest.failedAt = Date.now();
        quest.failReason = 'abandoned';
        quests.failed.push(quest);

        quests.trackedQuestId = sanitizeTrackedQuestId(quests);

        // Update state
        gameState.set('quests', quests);

        // Log message
        gameState.addMessage(`Quest Abandoned: ${quest.name}`, 'error');
        console.log(`Quest abandoned: ${quest.name}`);

        // Apply relation penalty to quest giver NPC
        if (quest.iteration) {
            this._applyIterationFailureStanding(quest);
        } else {
            this._applyRelationChange(quest, 'questAbandoned');
        }

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
        if (isRichQuest(quest)) {
            return { success: false };
        }
        const allCompleted = quest.objectives.every(obj => obj.completed);
        if (!allCompleted) {
            gameState.addMessage('Quest objectives not yet completed!', 'error');
            return { success: false };
        }

        if (this.completingQuests?.has(questId)) {
            return { success: false };
        }
        this.completingQuests ||= new Set();
        this.completingQuests.add(questId);

        try {
            return this._completeOrdinaryQuest(quests, quest, character, questIndex);
        } finally {
            this.completingQuests.delete(questId);
        }
    }

    _completeOrdinaryQuest(quests, quest, character, questIndex) {

        // Award rewards
        const rewardSummary = this.awardRewards(quest, character);

        // Move quest from active to completed
        quests.active.splice(questIndex, 1);
        quest.status = 'completed';
        quest.completedAt = Date.now();
        quests.completed.push(quest);

        quests.trackedQuestId = sanitizeTrackedQuestId(quests);

        // Update state
        gameState.set('quests', quests);

        // Log messages
        gameState.addMessage(`Quest Completed: ${quest.name}`, 'success');
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

        // Write worldTag to world.modifiedTiles for future rendering/consequence use
        if (quest.worldTag && quest.dungeonHookId) {
            const parts = quest.dungeonHookId.split(',');
            const x = Number(parts[0]);
            const y = Number(parts[1]);
            if (!isNaN(x) && !isNaN(y)) {
                const modifiedTiles = gameState.get('world.modifiedTiles') || [];
                modifiedTiles.push({
                    x,
                    y,
                    tag: quest.worldTag,
                    questId: quest.id,
                    timestamp: Date.now()
                });
                gameState.set('world.modifiedTiles', modifiedTiles);
                console.log(`worldTag '${quest.worldTag}' written to world.modifiedTiles at (${x},${y})`);
            }
        }

        // Route worldTag consequence through ConsequenceManager (ADR-010: by tag, not by quest ID)
        if (quest.worldTag && window.consequenceManager) {
            window.consequenceManager.queueConsequenceForTag(quest.worldTag, quest);
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
        this.checkQuestDeadlines();
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
        if (quest.resolutionPending || quest.expiryPending) {
            return;
        }
        this._releaseQuestCustody(quest);
        quests.active.splice(questIndex, 1);
        quest.status = 'failed';
        quest.failedAt = Date.now();
        quest.failReason = reason;
        quests.failed.push(quest);

        quests.trackedQuestId = sanitizeTrackedQuestId(quests);

        gameState.set('quests', quests);
        gameState.addMessage(`Quest Failed: ${quest.name}`, 'error');

        // Apply relation penalty to quest giver NPC
        if (quest.iteration) {
            this._applyIterationFailureStanding(quest);
        } else {
            this._applyRelationChange(quest, 'questFailed');
        }
    }

    /**
   * Award quest rewards to character
   * @param {Object} quest - Quest data
   * @param {Object} character - Character instance or restored plain object
   * @returns {Object} Reward summary
   */
    getQuestReputationPreview(quest) {
        return questStandingPreview(quest, gameState.get('world') || {},
            globalThis.window?.game?.npcGenerator?.culturesData,
            this._findNPCById(quest.questGiver?.npcId || quest.questGiverId),
            globalThis.window?.game?.relationManager);
    }

    awardRewards(quest, character, rewardsOverride = null) {
        this.awardingRewards ||= new Set();
        if (quest.rewardReceipt?.completed || this.awardingRewards.has(quest)) {
            return quest.rewardReceipt.summary;
        }
        this.awardingRewards.add(quest);
        try {
            return this._applyQuestRewards(quest, character, rewardsOverride || quest.rewards || {});
        } finally {
            this.awardingRewards.delete(quest);
        }
    }

    _applyQuestRewards(quest, character, rewards) {
        const preview = this.getQuestReputationPreview(quest);
        quest.rewardReceipt ||= { paid: {}, completed: false, summary: {
            xp: 0,
            gold: 0,
            item: null,
            reputation: [], reputationWarning: null
        } };
        const { paid, summary } = quest.rewardReceipt;

        // Award XP
        if (rewards.xp && !paid.xp) {
            paid.xp = true;
            if (typeof character.gainXP === 'function') {
                character.gainXP(rewards.xp);
            } else {
                character.xp = (character.xp || 0) + rewards.xp;
                const newLevel = getLevelFromXP(character.xp);
                if (newLevel > character.level) {
                    Character.prototype.levelUp.call(character, newLevel);
                }
            }
            summary.xp = rewards.xp;
        }

        // Award Gold
        if (rewards.gold && !paid.gold) {
            paid.gold = true;
            if (typeof character.addGold === 'function') {
                character.addGold(rewards.gold);
            } else {
                character.gold = (character.gold || 0) + rewards.gold;
            }
            summary.gold = rewards.gold;
        }

        // Award Item
        if (rewards.item && rewards.item !== 'random' && !paid.item) {
            paid.item = true;
            const baseItem = window.lootManager?.getItemById(rewards.item);
            if (baseItem) {
                const item = { ...baseItem, quantity: 1 };

                // Apply magic properties to item rewards, scaled by quest difficulty
                if (window.lootManager && quest.id) {
                    const questQualityScore = window.lootManager.computeQuestQualityScore(
                        character.level,
                        quest.difficulty || 'normal',
                        quest.id
                    );
                    const rng = new SeededRandom(`${window.lootManager.worldSeed}_questreward_${quest.id}`);
                    window.lootManager.applyMagicProperties(item, questQualityScore, rng);
                }

                character.inventory = character.inventory || [];
                character.inventory.push(item);
                summary.item = item.name;
                gameState.addMessage(`Quest reward: ${item.name}!`, 'success');
            } else {
                console.warn(`QuestManager: reward item '${rewards.item}' not found in items`);
                summary.item = rewards.item;
            }
        }

        if (!paid.reputation) {
            if (!preview.available) {
                summary.reputationWarning = preview.reason;
                paid.reputation = true;
                gameState.addMessage(`Standing reward unavailable: ${preview.reason}`, 'warning');
            } else {
                const relations = globalThis.window?.game?.relationManager;
                if (preview.changes.length) {
                    quest.reputationRewardReceipt ||= { changes: [] };
                }
                for (const target of preview.changes) {
                    if (quest.reputationRewardReceipt.changes.some(change => change.targetId === target.targetId)) {
                        continue;
                    }
                    const result = relations.previewFactionReputation(target.targetId, target.amount);
                    if (!result) {
                        summary.reputationWarning = 'The standing target is no longer available.';
                        gameState.addMessage(`Standing reward unavailable: ${summary.reputationWarning}`, 'warning');
                        break;
                    }
                    const change = { targetId: target.targetId, targetName: target.targetName,
                        amount: result.points, previous: result.previousScore, current: result.newScore };
                    quest.reputationRewardReceipt.changes.push(change);
                    summary.reputation = [...quest.reputationRewardReceipt.changes];
                    const applied = relations.modifyFactionReputation(target.targetId, target.amount);
                    if (!applied) {
                        quest.reputationRewardReceipt.changes = quest.reputationRewardReceipt.changes
                            .filter(entry => entry.targetId !== target.targetId);
                        summary.reputation = [...quest.reputationRewardReceipt.changes];
                        summary.reputationWarning = 'The standing change could not be applied.';
                        gameState.addMessage(`Standing reward unavailable: ${summary.reputationWarning}`, 'warning');
                        break;
                    }
                    this.reportQuestStandingChange(change);
                }
                paid.reputation = true;
            }
        }

        quest.rewardReceipt.completed = true;
        gameState.set('character', character);
        return summary;
    }

    reportQuestStandingChange(change) {
        const text = change.amount === 0
            ? `${change.targetName} standing unchanged (${change.current}; standing limit reached).`
            : `${change.amount > 0 ? '+' : ''}${change.amount} standing with ${change.targetName} (${change.previous} → ${change.current}).`;
        gameState.addMessage(text, change.amount < 0 ? 'warning' : 'success');
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
                    const req = objective.requirement || {};
                    if (req.source) {
                        return;
                    }

                    // Check if this creature type matches
                    const matchesType = req.creatureTypes?.includes(creatureId) || req.anyCreature;

                    // Check location constraint (if any)
                    let matchesLocation = true;
                    if (req.location?.dungeonHookId) {
                        matchesLocation = `${location?.x},${location?.y}` === req.location.dungeonHookId;
                    }
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
    onItemAcquired(itemId, source = null) {
        this.checkQuestDeadlines();
        const quests = gameState.get('quests');
        if (!quests || !quests.active) {
            return;
        }

        let updated = false;

        quests.active.forEach(quest => {
            quest.objectives.forEach(objective => {
                if (objective.type === 'retrieve' && !objective.completed) {
                    const req = objective.requirement;
                    if (req.sourceId) {
                        if (source?.questId === quest.id && source.sourceId === req.sourceId && req.itemId === itemId) {
                            refreshCustodyObjectives(quest);
                            updated = true;
                        }
                        return;
                    }

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
     * Called when the player enters a dungeon room.
     * Fires investigation skill checks for any active investigate quests targeting this dungeon.
     * @param {number} dungeonX - World X coordinate of the dungeon
     * @param {number} dungeonY - World Y coordinate of the dungeon
     * @param {number} roomIndex - 0-based index of the room entered
     * @param {Object} character - Plain character object from gameState
     */
    onRoomEntered(dungeonX, dungeonY, roomIndex, character) {
        this.checkQuestDeadlines();
        const quests = gameState.get('quests');
        let updated = false;
        for (const quest of quests?.active || []) {
            if (isRichQuest(quest)) {
                updated = observeQuestRoom(quest, dungeonX, dungeonY, roomIndex) || updated;
            }
        }
        for (const obj of this._getRoomInvestigations(dungeonX, dungeonY, roomIndex)) {
            if (obj.investigationAttempted) {
                gameState.addMessage('Press E to search again. Another search adds fatigue.', 'info');
                continue;
            }
            const dc = obj.investigationDC || 14;
            const checkConfig = {
                skillId: 'investigation',
                attribute: obj.attribute || 'intellect',
                dc
            };
            const manager = globalThis.window?.skillChallengeManager;
            const check = manager?.rollSkillCheck
                ? manager.rollSkillCheck(character, checkConfig) : skillRegistry.rollCheck(character, checkConfig);
            gameState.addMessage(
                `Investigation check: rolled ${check.roll} + ${check.modifier} = ${check.total} vs DC ${dc}`, 'info'
            );
            obj.investigationAttempted = true;
            updated = true;
            this._applyInvestigationResult(obj, check.success);
        }
        if (updated) {
            gameState.set('quests', quests);
            this.checkQuestCompletion();
        }
    }

    /** Find unresolved authored Investigation objectives in this dungeon room. */
    _getRoomInvestigations(dungeonX, dungeonY, roomIndex) {
        const hookKey = `${dungeonX},${dungeonY}`;
        return (gameState.get('quests')?.active || []).filter(quest => quest.type === 'investigate')
            .flatMap(quest => (quest.objectives || []).filter(obj => obj.type === 'investigate' && !obj.completed
                && (obj.targetLocation || quest.dungeonHookId) === hookKey
                && roomIndex === (obj.payoffRoom ?? obj.payoffRoomIndex ?? 1) - 1));
    }

    /** Deliberately retry a failed room search. Cancelled checks consume no fatigue. */
    async retryRoomInvestigations(dungeonX, dungeonY, roomIndex, character) {
        const objectives = this._getRoomInvestigations(dungeonX, dungeonY, roomIndex)
            .filter(obj => obj.investigationAttempted);
        const game = globalThis.window?.game;
        if (!objectives.length || !game?.promptSkillCheck) {
            return false;
        }
        if (this.investigationRetryActive) {
            return true;
        }
        this.investigationRetryActive = true;
        try {
            for (const obj of objectives) {
                const result = await game.promptSkillCheck({
                    title: 'Search again?',
                    skill: 'investigation',
                    attribute: obj.attribute || 'intellect',
                    dc: obj.investigationDC || 14,
                    description: obj.description || 'Search the room again for evidence.',
                    consequences: [{ description: 'Searching again adds fatigue.' }]
                });
                if (!result.attempted) {
                    break;
                }
                addFatigue(RULES.fatigue.skillChallengeFatigue, 'skillChallenge', character);
                obj.investigationAttempted = true;
                this._applyInvestigationResult(obj, result.success);
                gameState.set('quests', gameState.get('quests'));
                this.checkQuestCompletion();
                if (result.dead) {
                    break;
                }
            }
        } finally {
            this.investigationRetryActive = false;
        }
        return true;
    }

    _applyInvestigationResult(objective, success) {
        if (success) {
            objective.completed = true;
            objective.progress = 1;
            gameState.addMessage(objective.description
                ? `${objective.description} — complete.` : 'You find the evidence. Investigation complete.', 'success');
        } else {
            gameState.addMessage('You find nothing conclusive yet. Press E to search again; another search adds fatigue.',
                'warning');
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
                    const expectedChallenge = req.challengeId || quest.generationData?.skillChallengeId;
                    const matchesChallenge = expectedChallenge === challengeId;

                    // A multi-stage challenge can advance different skill objectives.
                    const resultSkill = result.skill || result.rollResult?.skill;
                    const matchesSkill = !req.skill
                        || skillRegistry.normalizeId(req.skill) === skillRegistry.normalizeId(resultSkill);

                    // Check if success is required
                    const meetsSuccessReq = !req.requireSuccess || result.success;

                    if (matchesChallenge && matchesSkill && meetsSuccessReq) {
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
            if (isRichQuest(quest)) {
                return;
            }
            const allCompleted = quest.objectives.every(obj => obj.completed);
            if (allCompleted && quest.status === 'active') {
                // Mark as ready to turn in (not auto-complete)
                quest.status = 'ready_to_turn_in';
                completedIds.push(quest.id);
                gameState.addMessage(`Quest Ready to Turn In: ${quest.name}`, 'success');
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
        gameState.addMessage(`Campaign Advanced to Stage ${nextStage}`, 'info');
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
        if (isRichQuest(quest)) {
            return this.getResolutionOptions(questId).some(option => option.available);
        }

        return quest.objectives.every(obj => obj.completed);
    }

    getQuestActions(questId) {
        this.checkQuestDeadlines();
        const quest = this.getQuest(questId);
        return isRichQuest(quest) ? questEntries(quest, quest.actions) : [];
    }

    getResolutionOptions(questId) {
        this.checkQuestDeadlines();
        const quest = this.getQuest(questId);
        return isRichQuest(quest) ? questEntries(quest, quest.resolutions) : [];
    }

    recordQuestAction(questId, actionId, npcId = null) {
        this.checkQuestDeadlines();
        const quest = this.getQuest(questId);
        this.performingQuestActions ||= new Set();
        if (!isRichQuest(quest) || this.performingQuestActions.has(questId)) {
            return { success: false };
        }
        this.performingQuestActions.add(questId);
        try {
            const result = performQuestAction(quest, actionId, npcId);
            this.checkQuestDeadlines();
            return result;
        } finally {
            this.performingQuestActions.delete(questId);
        }
    }

    resolveQuest(questId, choiceId) {
        this.checkQuestDeadlines();
        const quest = this.getQuest(questId);
        return isRichQuest(quest) ? applyQuestResolution(this, quest, choiceId) : { success: false };
    }

    onQuestEncounterVictory(source) {
        this.checkQuestDeadlines();
        if (!source || source.outcome && source.outcome !== 'victory') {
            return [];
        }
        const completed = [];
        for (const quest of gameState.get('quests.active') || []) {
            if (quest.expiryPending) {
                continue;
            }
            ensureQuestState(quest);
            for (const objective of quest.objectives || []) {
                if (objective.completed || !['kill', 'defeat_encounter'].includes(objective.type)
                    || !matchesQuestEncounter(objective.requirement?.source, source)
                    || !prerequisitesMet(quest, objective)) {
                    continue;
                }
                const receiptId = `${objective.id}:${source.encounterId}`;
                if (quest.receipts.victories.includes(receiptId)) {
                    continue;
                }
                quest.receipts.victories.push(receiptId);
                objective.proof = JSON.parse(JSON.stringify(source));
                objective.progress = objective.required || 1;
                objective.completed = true;
                completed.push(objective.id);
                gameState.addMessage(`Quest Objective Complete: ${objective.description}`, 'success');
            }
        }
        if (completed.length) {
            gameState.set('quests', gameState.get('quests'));
            this.checkQuestCompletion();
        }
        return completed;
    }

    getQuestDeadlineState(quest) {
        const urgent = Boolean(quest?.iteration && quest.deadlineDuration);
        const suspended = !quest?.expiryPending && Boolean(quest?.fulfilledAt !== undefined || quest?.resolutionPending
            || quest?.deadlineObjectives?.length && quest.deadlineObjectives.every(id =>
                quest.objectives?.some(objective => objective.id === id && objective.completed)));
        const remaining = quest?.deadlineAt === undefined ? quest?.deadlineDuration ?? null
            : Math.max(0, quest.deadlineAt - (gameState.get('world.worldClock') || 0));
        return { urgent, duration: quest?.deadlineDuration || null, remaining, suspended,
            expired: urgent && !suspended && quest.deadlineAt !== undefined && remaining === 0 };
    }

    checkQuestDeadlines() {
        if (this.checkingDeadlines) {
            return;
        }
        this.checkingDeadlines = true;
        try {
            const quests = gameState.get('quests');
            if (!quests) {
                return;
            }
            let changed = false;
            for (const quest of [...(quests.active || [])]) {
                const deadline = this.getQuestDeadlineState(quest);
                if (!deadline.urgent || quest.resolutionPending) {
                    continue;
                }
                if (deadline.suspended && quest.fulfilledAt === undefined) {
                    quest.fulfilledAt = gameState.get('world.worldClock') || 0;
                    changed = true;
                } else if (deadline.expired) {
                    quest.expiryPending = true;
                    quest.expiryEffectsApplied ||= [];
                    const consumer = globalThis.window?.game?.consequenceManager || globalThis.window?.consequenceManager;
                    const effects = quest.failureEffects || [];
                    if (effects.some(effect => !quest.expiryEffectsApplied.includes(effect.id)
                        && !consumer?.canApplyQuestEffect(effect, quest))) {
                        continue;
                    }
                    let succeeded = true;
                    for (const effect of effects) {
                        if (quest.expiryEffectsApplied.includes(effect.id)) {
                            continue;
                        }
                        quest.expiryEffectsApplied.push(effect.id);
                        if (!consumer.applyQuestEffect(effect, quest)) {
                            quest.expiryEffectsApplied = quest.expiryEffectsApplied.filter(id => id !== effect.id);
                            succeeded = false;
                            break;
                        }
                    }
                    if (!succeeded) {
                        continue;
                    }
                    this._releaseQuestCustody(quest);
                    this._applyIterationFailureStanding(quest);
                    quest.status = 'failed';
                    quest.failReason = 'expired';
                    delete quest.expiryPending;
                    quests.active = quests.active.filter(entry => entry.id !== quest.id);
                    quests.failed ||= [];
                    quests.failed.push(quest);
                    quests.trackedQuestId = sanitizeTrackedQuestId(quests);
                    gameState.addMessage(`Commission expired: ${quest.name}`, 'warning');
                    changed = true;
                }
            }
            if (changed) {
                gameState.set('quests', quests);
            }
        } finally {
            this.checkingDeadlines = false;
        }
    }

    _applyIterationFailureStanding(quest) {
        if (!quest.iteration || quest.failureStandingApplied) {
            return;
        }
        const giver = quest.participants?.giver || quest.procedural?.participants?.giver;
        const relations = globalThis.window?.game?.relationManager;
        const npc = giver && this._findNPCById(giver.npcId);
        if (!npc || !relations?.modifyFactionReputation) {
            return;
        }
        quest.failureStandingApplied = true;
        relations.modifyRelation(npc, 'questAbandoned', {
            exactPoints: RULES.quests.iteration.abandonment.personal, contributeToFaction: false
        });
        this._persistNPCRelations(npc);
        relations.modifyFactionReputation(giver.culture, RULES.quests.iteration.abandonment.faction);
    }

    getQuestEncounterLevel(fallbackLevel) {
        return globalThis.window?.game?.dungeonManager?.getQuestEncounterLevel(fallbackLevel)
            || fallbackLevel || gameState.get('character.level') || 1;
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
        if (!relationManager) {
            return;
        }

        const npcId = quest.questGiver?.npcId || quest.questGiverId;
        if (!npcId) {
            return;
        }

        const npc = this._findNPCById(npcId);
        if (npc) {
            const result = relationManager.modifyRelation(npc, modifierKey,
                { contributeToFaction: !hasExplicitQuestStanding(quest) });
            if (result) {
                this._persistNPCRelations(npc);
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
        if (!relationManager) {
            return;
        }

        const npcId = quest.questGiver?.npcId || quest.questGiverId;
        const settlementId = questOriginSettlementId(quest)
            || (quest.questGiver?.npcId ? quest.questGiver.npcId.split('_').slice(1, 3).join('_') : null);

        if (settlementId) {
            const changed = relationManager.modifySettlementRelations(settlementId, npcId,
                { contributeToFaction: !hasExplicitQuestStanding(quest) });
            for (const npc of changed || []) {
                this._persistNPCRelations(npc);
            }
        }
    }

    /**
     * Find an NPC by ID across all settlements in the world
     * @param {string} npcId - NPC ID
     * @returns {Object|null} NPC object or null
     */
    _findNPCById(npcId) {
        const world = gameState.get('world');
        if (!world) {
            return null;
        }
        if (world.npcs instanceof Map && world.npcs.has(npcId)) {
            return world.npcs.get(npcId);
        }

        for (const region of world.generatedRegions?.values?.() || []) {
            if (!region?.features) {
                continue;
            }

            for (const feature of region.features) {
                if (feature.type !== 'settlement' || !feature.npcs) {
                    continue;
                }

                const npc = feature.npcs.find(n => n.id === npcId);
                if (npc) {
                    return npc;
                }
            }
        }

        // Also check persistent settlement data
        if (world.settlements || world.metadata?.settlements) {
            for (const settlementData of [...Object.values(world.settlements || {}), ...(world.metadata?.settlements || [])]) {
                if (settlementData.npcs) {
                    const npc = settlementData.npcs.find(n => n.id === npcId);
                    if (npc) {
                        return npc;
                    }
                }
            }
        }

        return null;
    }

    _persistNPCRelations(npc) {
        const world = gameState.get('world');
        const sync = candidates => {
            for (const candidate of candidates || []) {
                if (candidate.id === npc.id) {
                    candidate.relations = JSON.parse(JSON.stringify(npc.relations));
                }
            }
        };
        for (const settlement of Object.values(world.settlements || [])) {
            sync(settlement.npcs);
        }
        for (const settlement of world.metadata?.settlements || []) {
            sync(settlement.npcs);
        }
        for (const region of world.generatedRegions?.values?.() || []) {
            for (const feature of region.features || []) {
                sync(feature.npcs);
            }
        }
        if (world.npcs instanceof Map) {
            world.npcs.set(npc.id, npc);
            gameState.set('world.npcs', world.npcs);
        }
        gameState.set('world.settlements', world.settlements);
        if (world.metadata) {
            gameState.set('world.metadata', world.metadata);
        }
        gameState.set('world.generatedRegions', world.generatedRegions);
    }

    _releaseQuestCustody(quest) {
        const character = gameState.get('character');
        if (character?.inventory?.some(item => item.questSource?.questId === quest.id)) {
            character.inventory = character.inventory.filter(item => item.questSource?.questId !== quest.id);
            gameState.set('character', character);
        }
    }
}

export default QuestManager;
