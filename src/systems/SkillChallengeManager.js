/**
 * Skill Challenge Manager System
 * Handles multi-turn skill challenge conversations with branching paths
 * Used for quest skill challenges, social encounters, and complex NPC interactions
 *
 * Separate from NPCDialogueGenerator (which handles NPC flavor text generation)
 */

import { gameState } from '../core/GameState.js';
import { rollD20 } from '../utils/dice.js';

class SkillChallengeManager {
    constructor() {
        // Social challenge trees (loaded from data/skillChallenges/<id>.json)
        // Used by startChallenge() — keyed by challenge id string
        this.challenges = new Map();

        // Terrain challenge data (loaded from data/skillChallenges.json)
        // Shape: { balancing: {...}, challenges: { [id]: challengeDef } }
        // Used by shouldTriggerChallenge(), canAttemptChallenge(), buildTerrainIndex()
        // TODO (backend-dev): populate this via a loadTerrainChallenges() call during init
        this.terrainChallengesData = null;

        // Per-terrain lookup built by buildTerrainIndex() after terrainChallengesData loads
        this.terrainChallengeIndex = {};

        // Cooldown timestamps: { [challengeId]: timestampMs }
        this.lastAttemptTimes = {};

        this.currentChallenge = null; // Active challenge state
        this.challengeHistory = []; // Track all exchanges
        this.tension = 0; // 0-100 tension meter
        this.revealedInfo = new Set(); // Information discovered via skill checks
        this.challengeActive = false;
    }

    /**
     * Load terrain challenge flat index from data/skillChallenges.json
     * Populates this.terrainChallengesData and builds the terrain index.
     */
    async loadTerrainChallenges() {
        try {
            const response = await fetch(`data/skillChallenges.json?v=${Date.now()}`);
            if (!response.ok) throw new Error(`Failed to load skillChallenges.json: ${response.status}`);
            this.terrainChallengesData = await response.json();
            this.buildTerrainIndex();
            console.log(`✅ Loaded ${Object.keys(this.terrainChallengesData.challenges || {}).length} terrain challenges`);
        } catch (error) {
            console.error('❌ Failed to load terrain challenges:', error);
            this.terrainChallengesData = { challenges: {}, balancing: { triggerFrequencyModifiers: { terrain_base: 0.1 } } };
        }
    }

    /**
     * Load all skill challenge trees from data files
     */
    async loadChallenges() {
        try {
            const response = await fetch(`data/skillChallenges/bandit-negotiation.json?v=${Date.now()}`);
            const challengeData = await response.json();
            this.challenges.set(challengeData.id, challengeData);
            console.log(`⚔️  Loaded skill challenge: ${challengeData.id}`);
        } catch (error) {
            console.error('Failed to load skill challenges:', error);
        }
    }

    /**
     * Start a skill challenge
     * @param {string} challengeId - Challenge tree ID
     * @param {Object} context - Context variables (NPC, quest, motivation, etc.)
     * @returns {boolean} Success
     */
    startChallenge(challengeId, context = {}) {
        const challenge = this.challenges.get(challengeId);
        if (!challenge) {
            console.error(`Skill challenge not found: ${challengeId}`);
            return false;
        }

        // Initialize challenge state
        this.currentChallenge = {
            id: challengeId,
            tree: challenge,
            currentNode: challenge.initialNode,
            context: context, // Store quest, NPC, motivation, etc.
            visitedNodes: new Set([challenge.initialNode])
        };

        this.challengeHistory = [];
        this.tension = challenge.initialTension || 50;
        this.revealedInfo = new Set();
        this.challengeActive = true;

        // Process initial node
        const initialNode = this.getCurrentNode();

        // Run passive skill checks
        this.processPassiveChecks(initialNode);

        // Add initial NPC line to history
        if (initialNode.text) {
            this.addToHistory(initialNode.speaker || 'npc', this.processText(initialNode.text));
        }

        // Render challenge UI
        this.renderChallenge();

        console.log(`Started skill challenge: ${challengeId}`, context);

        return true;
    }

    /**
     * Process passive skill checks (run automatically)
     * @param {Object} node - Challenge node
     */
    processPassiveChecks(node) {
        if (!node.passiveChecks) return;

        const character = gameState.get('character');

        node.passiveChecks.forEach(check => {
            const skillMod = this.getSkillModifier(character, check.skill);
            const passiveScore = 10 + skillMod; // Passive = 10 + modifier

            if (passiveScore >= check.dc) {
                // Success - reveal information
                if (check.reveal) {
                    this.revealedInfo.add(check.reveal);
                    const message = this.getRevealMessage(check.reveal, this.currentChallenge.context);
                    gameState.addMessage(`💡 ${message}`, 'info');
                }

                // Unlock additional dialogue options
                if (check.unlockChoices) {
                    check.unlockChoices.forEach(choiceId => {
                        this.revealedInfo.add(`unlock_${choiceId}`);
                    });
                }

                console.log(`✓ Passive ${check.skill} (${passiveScore} vs DC ${check.dc})`);
            } else {
                console.log(`✗ Passive ${check.skill} (${passiveScore} vs DC ${check.dc})`);
            }
        });
    }

    /**
     * Process active skill check (player attempts the check)
     * @param {Object} check - Skill check definition
     * @returns {Object} Result {success, roll, total, dc, critical, criticalFail}
     */
    processActiveCheck(check) {
        const character = gameState.get('character');
        const skillMod = this.getSkillModifier(character, check.skill);
        const roll = rollD20();
        const total = roll + skillMod;
        const success = total >= check.dc;

        const result = {
            success,
            roll,
            skillMod,
            total,
            dc: check.dc,
            critical: roll === 20,
            criticalFail: roll === 1,
            skill: check.skill
        };

        // Log to challenge history
        const skillName = check.skill.charAt(0).toUpperCase() + check.skill.slice(1);
        const emoji = success ? '✓' : '✗';
        this.addToHistory('system', `${emoji} ${skillName}: ${roll} + ${skillMod} = ${total} vs DC ${check.dc}`);

        // Apply tension changes
        if (success && check.onSuccess?.tensionChange) {
            this.modifyTension(check.onSuccess.tensionChange);
        } else if (!success && check.onFailure?.tensionChange) {
            this.modifyTension(check.onFailure.tensionChange);
        }

        // Reveal information on success
        if (success && check.onSuccess?.reveal) {
            this.revealedInfo.add(check.onSuccess.reveal);
        }

        // Critical success/failure
        if (result.critical && check.onCriticalSuccess) {
            this.handleCriticalSuccess(check.onCriticalSuccess);
        } else if (result.criticalFail && check.onCriticalFailure) {
            this.handleCriticalFailure(check.onCriticalFailure);
        }

        return result;
    }

    /**
     * Player selects a dialogue choice
     * @param {number} choiceIndex - Index of chosen option
     */
    selectChoice(choiceIndex) {
        if (!this.currentChallenge) return;

        const node = this.getCurrentNode();
        const availableChoices = this.getAvailableChoices(node);

        if (choiceIndex < 0 || choiceIndex >= availableChoices.length) {
            console.error('Invalid choice index:', choiceIndex);
            return;
        }

        const choice = availableChoices[choiceIndex];

        // Add player's choice to history
        this.addToHistory('player', choice.text);

        // Handle skill check requirement
        if (choice.skillCheck) {
            const result = this.processActiveCheck(choice.skillCheck);

            // Use success or failure path
            const path = result.success ? choice.skillCheck.onSuccess : choice.skillCheck.onFailure;

            if (path.text) {
                this.addToHistory('npc', this.processText(path.text));
            }

            if (path.nextNode) {
                this.moveToNode(path.nextNode);
                return;
            }

            if (path.endChallenge) {
                this.endChallenge(path.endChallenge);
                return;
            }
        }

        // Apply tension change
        if (choice.tensionChange) {
            this.modifyTension(choice.tensionChange);
        }

        // Apply effects (gold, items, reveals)
        if (choice.effects) {
            this.applyEffects(choice.effects);
        }

        // Check for combat/end conditions
        if (this.checkEndConditions()) {
            return;
        }

        // Move to next node
        if (choice.nextNode) {
            this.moveToNode(choice.nextNode);
        } else if (choice.endChallenge) {
            this.endChallenge(choice.endChallenge);
        }
    }

    /**
     * Move to a new challenge node
     * @param {string} nodeId - Node ID to move to
     */
    moveToNode(nodeId) {
        if (!this.currentChallenge) return;

        this.currentChallenge.currentNode = nodeId;
        this.currentChallenge.visitedNodes.add(nodeId);

        const node = this.getCurrentNode();

        // Process passive checks on new node
        this.processPassiveChecks(node);

        // Add NPC response to history
        if (node.text) {
            this.addToHistory(node.speaker || 'npc', this.processText(node.text));
        }

        // Check for automatic progression
        if (node.autoProgress) {
            setTimeout(() => {
                if (node.nextNode) {
                    this.moveToNode(node.nextNode);
                } else if (node.endChallenge) {
                    this.endChallenge(node.endChallenge);
                }
            }, node.autoProgressDelay || 1000);
        }

        // Check end conditions
        if (!this.checkEndConditions()) {
            // Re-render
            this.renderChallenge();
        }
    }

    /**
     * Modify tension level
     * @param {number} change - Tension change (+/-)
     */
    modifyTension(change) {
        const oldTension = this.tension;
        this.tension = Math.max(0, Math.min(100, this.tension + change));

        if (change > 0) {
            gameState.addMessage(`⚠️  Tension rises (${Math.floor(this.tension)}/100)`, 'warning');
        } else if (change < 0) {
            gameState.addMessage(`😌 Tension eases (${Math.floor(this.tension)}/100)`, 'info');
        }

        console.log(`Tension: ${oldTension} → ${this.tension} (${change > 0 ? '+' : ''}${change})`);
    }

    /**
     * Check if challenge should end
     * @returns {boolean} Challenge ended
     */
    checkEndConditions() {
        const tree = this.currentChallenge.tree;

        // Tension too high - combat!
        if (this.tension >= tree.tensionThreshold) {
            this.endChallenge('combat');
            return true;
        }

        // Check current node for end condition
        const node = this.getCurrentNode();
        if (node.endChallenge) {
            this.endChallenge(node.endChallenge);
            return true;
        }

        return false;
    }

    /**
     * End challenge with outcome
     * @param {string} outcome - Outcome type
     */
    endChallenge(outcome) {
        const context = this.currentChallenge.context;

        console.log(`Skill challenge ended: ${outcome}`);

        // Handle different outcomes
        switch (outcome) {
            case 'combat':
                gameState.addMessage('⚔️  Negotiations failed - combat begins!', 'error');
                this.triggerCombat(context);
                break;

            case 'peaceful_desperate':
            case 'peaceful_wronged':
            case 'peaceful_opportunists':
            case 'peaceful':
                gameState.addMessage('✅ Peaceful resolution achieved.', 'success');
                this.completeQuestObjective(context, outcome);
                break;

            case 'bribe_accepted':
                gameState.addMessage('💰 They accept your offer and depart.', 'success');
                this.completeQuestObjective(context, outcome);
                break;

            case 'walked_away':
                gameState.addMessage('You leave without resolving the situation.', 'info');
                break;

            default:
                console.warn(`Unknown outcome: ${outcome}`);
        }

        // Close challenge UI
        this.closeChallenge();
    }

    /**
     * Trigger combat
     * @param {Object} context - Challenge context
     */
    triggerCombat(context) {
        const event = new CustomEvent('challengeCombat', {
            detail: {
                enemyTypes: context.enemyTypes || ['bandit', 'bandit', 'bandit'],
                context: context.motivation,
                angered: this.tension >= 80
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * Complete quest objective
     * @param {Object} context - Challenge context
     * @param {string} outcome - Resolution type
     */
    completeQuestObjective(context, outcome) {
        if (context.questId && window.game?.questManager) {
            const questManager = window.game.questManager;

            // Find and mark the encounter objective as complete
            const quests = gameState.get('quests');
            const quest = quests?.active?.find(q => q.id === context.questId);

            if (quest) {
                quest.objectives.forEach(obj => {
                    if (obj.type === 'encounter' || obj.type === 'skill_choice') {
                        obj.completed = true;
                        obj.progress = 1;
                    }
                });

                gameState.set('quests', quests);
                questManager.checkQuestCompletion();
            }
        }
    }

    /**
     * Get current challenge node
     * @returns {Object} Current node
     */
    getCurrentNode() {
        if (!this.currentChallenge) return null;
        return this.currentChallenge.tree.nodes[this.currentChallenge.currentNode];
    }

    /**
     * Get available choices for current node
     * @param {Object} node - Challenge node
     * @returns {Array} Available choices
     */
    getAvailableChoices(node) {
        if (!node || !node.choices) return [];

        return node.choices.filter(choice => {
            // Check if requires revealed information
            if (choice.requiresReveal && !this.revealedInfo.has(choice.requiresReveal)) {
                return false;
            }

            // Check if requires unlock
            if (choice.requiresUnlock && !this.revealedInfo.has(`unlock_${choice.id}`)) {
                return false;
            }

            // Check if requires visited node
            if (choice.requiresVisited && !this.currentChallenge.visitedNodes.has(choice.requiresVisited)) {
                return false;
            }

            // Check if requires NOT visited (one-time choices)
            if (choice.requiresNotVisited && this.currentChallenge.visitedNodes.has(choice.requiresNotVisited)) {
                return false;
            }

            return true;
        });
    }

    /**
     * Get skill modifier for character
     * @param {Object} character - Character object
     * @param {string} skillId - Skill ID
     * @returns {number} Skill modifier
     */
    getSkillModifier(character, skillId) {
        const skillData = character.skills.find(s => s.id === skillId);
        if (!skillData) return 0;

        const abilityMod = character.abilityModifiers[skillData.ability];
        const profBonus = character.skillProficiencies.includes(skillId) ? character.proficiencyBonus : 0;

        return abilityMod + profBonus;
    }

    /**
     * Process text with variable substitution
     * @param {string} text - Text with {variables}
     * @returns {string} Processed text
     */
    processText(text) {
        if (!this.currentChallenge) return text;

        const context = this.currentChallenge.context;
        let processed = text;

        // Replace context variables
        Object.keys(context).forEach(key => {
            processed = processed.replace(new RegExp(`\\{${key}\\}`, 'g'), context[key] || '');
        });

        return processed;
    }

    /**
     * Get reveal message for discovered information
     * @param {string} revealId - Reveal ID
     * @param {Object} context - Challenge context
     * @returns {string} Message
     */
    getRevealMessage(revealId, context) {
        const messages = {
            'desperate_motivation': `These aren't hardened criminals - desperation drives them.`,
            'wronged_motivation': `They have a legitimate grievance against ${context.settlement || 'the settlement'}.`,
            'opportunists_motivation': `These are professionals running a protection racket.`,
            'weakening_resolve': `Their resolve is cracking - they want a way out.`,
            'angering': `You're pushing them towards violence.`,
            'lying': `Their body language suggests deception.`
        };

        return messages[revealId] || 'You learned something important.';
    }

    /**
     * Add message to challenge history
     * @param {string} speaker - Speaker ID (player, npc, system)
     * @param {string} text - Message text
     */
    addToHistory(speaker, text) {
        this.challengeHistory.push({
            speaker,
            text,
            timestamp: Date.now()
        });
    }

    /**
     * Apply choice effects
     * @param {Object} effects - Effects to apply
     */
    applyEffects(effects) {
        const character = gameState.get('character');

        if (effects.goldChange) {
            character.gold += effects.goldChange;
            gameState.set('character', character);

            const sign = effects.goldChange > 0 ? '+' : '';
            gameState.addMessage(`${sign}${effects.goldChange} gold`, effects.goldChange > 0 ? 'success' : 'warning');
        }

        if (effects.reveal) {
            this.revealedInfo.add(effects.reveal);
        }
    }

    /**
     * Handle critical success
     * @param {Object} critData - Critical success data
     */
    handleCriticalSuccess(critData) {
        gameState.addMessage('🎲 CRITICAL SUCCESS!', 'success');

        if (critData.tensionChange) {
            this.modifyTension(critData.tensionChange);
        }

        if (critData.text) {
            this.addToHistory('system', this.processText(critData.text));
        }
    }

    /**
     * Handle critical failure
     * @param {Object} critData - Critical failure data
     */
    handleCriticalFailure(critData) {
        gameState.addMessage('🎲 CRITICAL FAILURE!', 'error');

        if (critData.tensionChange) {
            this.modifyTension(critData.tensionChange);
        }

        if (critData.forceCombat) {
            this.tension = 100; // Force combat
        }

        if (critData.text) {
            this.addToHistory('system', this.processText(critData.text));
        }
    }

    /**
     * Render challenge UI
     */
    renderChallenge() {
        const event = new CustomEvent('challengeUpdate', {
            detail: {
                node: this.getCurrentNode(),
                choices: this.getAvailableChoices(this.getCurrentNode()),
                tension: this.tension,
                tensionThreshold: this.currentChallenge.tree.tensionThreshold,
                history: this.challengeHistory,
                context: this.currentChallenge.context
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * Close challenge UI
     */
    closeChallenge() {
        this.challengeActive = false;
        this.currentChallenge = null;

        const event = new CustomEvent('challengeClose');
        window.dispatchEvent(event);
    }

    // =========================================================================
    // TERRAIN CHALLENGE INDEX
    // Called once after challenges JSON is loaded. Builds a per-terrain lookup
    // so Player.js can query which challenges are valid for the current tile
    // without maintaining its own hardcoded map.
    // =========================================================================

    /**
     * Build the terrain → challenge index from loaded challenge data.
     * Must be called after loadChallenges() completes.
     * Challenges with no terrainModifiers field are placed in the 'universal' pool
     * and treated as if all modifiers are 1.0.
     */
    buildTerrainIndex() {
        this.terrainChallengeIndex = {};
        if (!this.terrainChallengesData?.challenges) return;

        for (const [id, challenge] of Object.entries(this.terrainChallengesData.challenges)) {
            const modifiers = challenge.terrainModifiers || {};

            if (Object.keys(modifiers).length === 0) {
                // No terrainModifiers = universal pool, triggers anywhere at modifier 1.0
                if (!this.terrainChallengeIndex['__universal__']) {
                    this.terrainChallengeIndex['__universal__'] = [];
                }
                this.terrainChallengeIndex['__universal__'].push(id);
            } else {
                for (const [terrain, modifier] of Object.entries(modifiers)) {
                    if (modifier > 0) {
                        if (!this.terrainChallengeIndex[terrain]) {
                            this.terrainChallengeIndex[terrain] = [];
                        }
                        if (!this.terrainChallengeIndex[terrain].includes(id)) {
                            this.terrainChallengeIndex[terrain].push(id);
                        }
                    }
                }
            }
        }
        console.log(`✅ Built terrain index for ${Object.keys(this.terrainChallengeIndex).length} terrain types`);
    }

    /**
     * Return candidate challenge IDs for a given terrain type.
     * Called by Player.js to replace the hardcoded terrainChallengeMap.
     * @param {string} terrainType - Terrain ID from tile.terrain
     * @returns {string[]} Array of challenge IDs that can trigger here
     */
    getCandidatesForTerrain(terrainType) {
        const terrainSpecific = this.terrainChallengeIndex[terrainType] || [];
        const universal = this.terrainChallengeIndex['__universal__'] || [];
        return [...terrainSpecific, ...universal];
    }

    // =========================================================================
    // COOLDOWN / FREQUENCY GATE
    // Called by Player.js checkForTerrainSkillChallenge() before each trigger.
    // These three methods replace the silent undefined-call errors that currently
    // prevent all terrain challenges from firing.
    // =========================================================================

    /**
     * Check whether a challenge should fire for a given terrain context.
     * Applies cooldown gate first, then rolls against effective trigger frequency.
     * @param {string} challengeId - Challenge ID
     * @param {Object} context - { terrainType: string, ... }
     * @returns {boolean}
     */
    shouldTriggerChallenge(challengeId, context) {
        if (!this.terrainChallengesData) return false;
        const challenge = this.terrainChallengesData.challenges?.[challengeId];
        if (!challenge) return false;

        if (!this.canAttemptChallenge(challengeId)) return false;

        const terrainMod = challenge.terrainModifiers?.[context.terrainType] ?? 1.0;
        const globalMod = this.terrainChallengesData.balancing?.triggerFrequencyModifiers?.terrain_base ?? 0.1;
        const chance = (challenge.balance?.triggerFrequency ?? 0.15) * terrainMod * globalMod;

        return Math.random() < chance;
    }

    /**
     * Check if enough time has passed since the last attempt of this challenge.
     * @param {string} challengeId
     * @returns {boolean} true if challenge can be attempted (not on cooldown)
     */
    canAttemptChallenge(challengeId) {
        if (!this.terrainChallengesData) return false;
        const challenge = this.terrainChallengesData.challenges?.[challengeId];
        if (!challenge) return false;

        const lastAttempt = this.lastAttemptTimes?.[challengeId] || 0;
        const cooldown = challenge.balance?.cooldown || 0;
        return (Date.now() - lastAttempt) >= cooldown;
    }

    /**
     * Record that a challenge was attempted (starts the cooldown timer).
     * @param {string} challengeId
     */
    recordChallengeAttempt(challengeId) {
        if (!this.lastAttemptTimes) this.lastAttemptTimes = {};
        this.lastAttemptTimes[challengeId] = Date.now();
    }
}

export default SkillChallengeManager;
