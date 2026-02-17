/**
 * Player System
 * Handles player input, movement, and exploration
 */

import { gameState } from '../core/GameState.js';
import restManager from './RestManager.js';
import { rollDice } from '../utils/dice.js';
import audioManager from './AudioManager.js';

class Player {
    constructor(worldGenerator, mapRenderer, settlementManager = null, dungeonManager = null) {
        this.worldGenerator = worldGenerator;
        this.mapRenderer = mapRenderer;
        this.settlementManager = settlementManager;
        this.dungeonManager = dungeonManager;

        // Player position (world coordinates)
        this.x = 0;
        this.y = 0;

        // Input state
        this.keys = new Set();
        this.moveDelay = 150; // ms between moves
        this.lastMoveTime = 0;
        this.shownCombatMovementWarning = false;

        // Settlement/dungeon notification tracking (prevent spam)
        this.shownSettlementNotification = null; // Track which settlement we notified about
        this.shownDungeonNotification = null; // Track which dungeon we notified about

        // Terrain tracking for description messages
        this.lastTerrainType = null;

        // Bind input handlers
        this.bindInput();

        console.log('🎮 Player system initialized');
    }

    /**
     * Initialize player at spawn location
     */
    async spawn() {
        const spawnTile = await this.worldGenerator.getSpawnLocation();
        this.x = spawnTile.x;
        this.y = spawnTile.y;

        // Update game state
        gameState.set('player.position', { x: this.x, y: this.y });
        gameState.set('world.currentLocation', { x: this.x, y: this.y });
        gameState.addMessage('You awaken in an unfamiliar land...', 'info');

        console.log(`📍 Player spawned at (${this.x}, ${this.y})`);

        // Mark spawn area as explored
        await this.updateVisibility();
    }

    /**
     * Bind keyboard input
     */
    bindInput() {
        document.addEventListener('keydown', (e) => {
            this.keys.add(e.key.toLowerCase());
            this.handleInput(e);
        });

        document.addEventListener('keyup', (e) => {
            this.keys.delete(e.key.toLowerCase());
        });
    }

    /**
     * Handle input
     */
    handleInput(e) {
        const key = e.key.toLowerCase();

        // Movement keys
        if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
            e.preventDefault();
            this.handleMovement(key);
        }

        // Action keys
        switch (key) {
            case 'e':
                this.handleInteraction();
                break;
            case 'i':
                this.openInventory();
                break;
            case 'c':
                this.openCharacterSheet();
                break;
            case 'q':
                this.openQuestLog();
                break;
            case 'm':
                this.openMap();
                break;
            case 'r':
                this.rest();
                break;
            case ' ':
                this.interact();
                break;
            case 'h':
                this.showHelp();
                break;
        }
    }

    /**
     * Handle movement input
     */
    async handleMovement(key) {
        // Block movement during combat
        if (gameState.get('combat')?.active) {
            // Show warning message once per combat
            if (!this.shownCombatMovementWarning) {
                gameState.addMessage('⚔️ Cannot move during combat!', 'warning');
                this.shownCombatMovementWarning = true;
            }
            return;
        }

        // Block movement when any modal is open
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            return; // Silently block movement while modal is open
        }

        const now = Date.now();
        if (now - this.lastMoveTime < this.moveDelay) {
            return; // Too soon
        }

        let dx = 0, dy = 0;

        switch (key) {
            case 'w':
            case 'arrowup':
                dy = -1;
                break;
            case 's':
            case 'arrowdown':
                dy = 1;
                break;
            case 'a':
            case 'arrowleft':
                dx = -1;
                break;
            case 'd':
            case 'arrowright':
                dx = 1;
                break;
        }

        if (dx !== 0 || dy !== 0) {
            await this.move(dx, dy);
            this.lastMoveTime = now;
        }
    }

    /**
     * Move player
     */
    async move(dx, dy) {
        // If inside dungeon, delegate movement to DungeonManager
        if (this.dungeonManager?.isInDungeon()) {
            const result = this.dungeonManager.movePlayer(dx, dy);

            if (!result.success) {
                if (result.reason === 'wall') {
                    // Silent - walls don't need messages
                } else if (result.reason === 'out_of_bounds') {
                    // Silent - out of bounds
                }
                return false;
            }

            // Check for special tiles
            if (result.isDoor) {
                const dungeonState = gameState.get('dungeon');
                const currentRoom = dungeonState.rooms[dungeonState.currentRoomIndex];
                const targetRoom = dungeonState.rooms[result.connectsTo];
                gameState.addMessage(`🚪 A door leads to ${targetRoom?.name || 'another room'}. Press E to enter.`, 'info');
            }

            if (result.isExit) {
                gameState.addMessage('🌤️ Stairs lead back to the surface. Press E to exit dungeon.', 'info');
            }

            if (result.isTrap) {
                // Trigger trap skill challenge
                await this.triggerDungeonTrapChallenge();
            }

            if (result.isInteractable) {
                gameState.addMessage(`💡 You see a ${result.featureType}. Press E to interact.`, 'info');
            }

            // Check for dungeon skill challenges (room-based, separate from traps)
            await this.checkForDungeonSkillChallenge();

            // Check for dungeon encounters
            await this.checkForDungeonEncounter();

            return true;
        }

        // World map movement
        const newX = this.x + dx;
        const newY = this.y + dy;

        // Check if move is valid
        const tile = await this.worldGenerator.getTile(newX, newY);

        if (!tile) {
            console.warn(`No tile at (${newX}, ${newY})`);
            return false;
        }

        // Load terrain data to check traversability
        await this.worldGenerator.loadTerrainData();
        const terrainDef = this.worldGenerator.terrainTypes.terrains.find(t => t.id === tile.terrain);

        if (!terrainDef) {
            console.warn(`Unknown terrain type: ${tile.terrain}`);
            return false;
        }

        // Check if terrain is normally traversable
        if (!terrainDef.traversable) {
            const character = gameState.get('character');
            const requirements = terrainDef.traversalRequirements || [];

            // Check if character has special ability to traverse this terrain
            if (this.canTraverseSpecialTerrain(tile.terrain)) {
                // Allow movement through special terrain (Mariner Fighting Style, etc.)
            } else if (requirements.length > 0 && character.traversalAbilities) {
                // Check if player has any required traversal ability
                const hasAbility = requirements.some(req =>
                    character.traversalAbilities.includes(req)
                );

                if (hasAbility) {
                    // Player has required ability, allow movement
                } else {
                    // No ability, check if skill check available
                    const skillCheckConfig = this.getSkillCheckForTerrain(terrainDef);

                    if (skillCheckConfig) {
                        // Show skill check modal, await user decision
                        const result = await this.promptSkillCheck(skillCheckConfig);

                        if (result.attempted && result.success) {
                            // Successful skill check, allow movement
                            gameState.addMessage('✅ Skill check success! You cross the dangerous terrain.', 'success');
                        } else if (result.attempted && !result.success) {
                            // Failed skill check - apply consequences
                            this.applySkillCheckFailure(skillCheckConfig.consequences);
                            return false; // Blocked from moving
                        } else {
                            // User turned back
                            gameState.addMessage('You decide not to risk the crossing.', 'info');
                            return false;
                        }
                    } else {
                        // No skill check available, hard block
                        const formattedReqs = requirements.map(r =>
                            r.replace(/([A-Z])/g, ' $1').trim().toLowerCase()
                        );
                        gameState.addMessage(
                            `⛔ ${terrainDef.name} is impassable! You need: ${formattedReqs.join(' OR ')}`,
                            'danger'
                        );
                        return false;
                    }
                }
            } else {
                // No requirements defined, completely impassable
                gameState.addMessage(`You cannot move there - ${terrainDef.description}`, 'error');
                return false;
            }
        }

        // Move successful
        this.x = newX;
        this.y = newY;

        // Play footstep sound
        audioManager.playFootstepSound();

        // Update game state
        gameState.set('player.position', { x: this.x, y: this.y });
        gameState.set('world.currentLocation', { x: this.x, y: this.y });

        // Mark tile as explored
        tile.explored = true;
        tile.visible = true;

        // Update visibility
        await this.updateVisibility();

        // Show terrain description when entering a NEW terrain type
        if (!this.lastTerrainType || this.lastTerrainType !== tile.terrain) {
            gameState.addMessage(`⛰️ ${terrainDef.name}: ${terrainDef.description}`, 'info');
            this.lastTerrainType = tile.terrain;
        }

        // Check for encounters
        this.checkForEncounters(tile, terrainDef);

        // Check for terrain-based skill challenges (after encounters to avoid spam)
        await this.checkForTerrainSkillChallenge(tile, terrainDef);

        // Check for features
        if (tile.feature) {
            this.handleFeature(tile.feature);
        }

        // Check for settlements
        this.checkForSettlement();

        return true;
    }

    /**
     * Check if player is at a settlement or dungeon and show notification
     * No longer auto-enters - player must press E to enter
     */
    async checkForSettlement() {
        // Check for settlement
        if (this.settlementManager) {
            const settlement = this.settlementManager.getSettlementAtPlayerPosition();
            if (settlement) {
                // Only show notification once per settlement (don't spam every move)
                if (this.shownSettlementNotification !== settlement.name) {
                    gameState.addMessage(`🏘️ You arrive at ${settlement.name}. Press E to enter.`, 'info');
                    this.shownSettlementNotification = settlement.name;
                }
            } else {
                // Clear notification tracking when leaving settlement
                this.shownSettlementNotification = null;
            }
        }

        // Check for dungeon
        if (this.dungeonManager) {
            const dungeonFeature = await this.dungeonManager.getDungeonAtPlayerPosition();
            if (dungeonFeature) {
                // Only show notification once per dungeon (don't spam every move)
                const dungeonKey = `${dungeonFeature.x}_${dungeonFeature.y}`;
                if (this.shownDungeonNotification !== dungeonKey) {
                    const dungeonName = dungeonFeature.dungeonType?.name || 'a dungeon';
                    gameState.addMessage(`⚔️ You discover the entrance to ${dungeonName}. Press E to enter.`, 'warning');
                    this.shownDungeonNotification = dungeonKey;
                }
            } else {
                // Clear notification tracking when leaving dungeon entrance
                this.shownDungeonNotification = null;
            }
        }
    }

    /**
     * Unified E key interaction handler
     * Handles dungeons, settlements, and dungeon exits based on current context
     */
    async handleInteraction() {
        // Don't allow interaction during combat
        if (gameState.get('combat')?.active) {
            gameState.addMessage('⚔️ Cannot interact during combat!', 'error');
            return;
        }

        // Check if player is inside a dungeon
        if (this.dungeonManager?.isInDungeon()) {
            // Check if at exit tile
            if (this.dungeonManager.isAtExit()) {
                this.dungeonManager.exitDungeon();
                // Sync Player.x/y with restored world position
                const restoredPos = gameState.get('player.position');
                if (restoredPos) {
                    this.x = restoredPos.x;
                    this.y = restoredPos.y;
                }
                return;
            }

            // Check if at door tile (room transition)
            if (this.dungeonManager.isAtDoor()) {
                const doorTile = this.dungeonManager.getCurrentDoorTile();

                // Check if door is permanently locked from a failed challenge
                if (doorTile?.locked) {
                    gameState.addMessage('🔒 This door is locked. You cannot open it.', 'warning');
                    return;
                }

                // Check for locked door skill challenge trigger
                const lockedDoorChallenge = window.skillChallengeManager?.challenges?.challenges?.['locked_door'];
                if (lockedDoorChallenge?.doorChallenge && !doorTile?.challengeCompleted) {
                    const triggerChance = lockedDoorChallenge.balance?.triggerFrequency || 0.6;
                    if (Math.random() < triggerChance) {
                        // Show choice skill challenge modal
                        const challengeResult = await window.game.promptChoiceSkillChallenge(lockedDoorChallenge);

                        if (!challengeResult.attempted) {
                            // Player backed out - don't enter but don't lock
                            return;
                        }

                        // Mark this door's challenge as completed (won't trigger again)
                        this.dungeonManager.markDoorChallengeCompleted();

                        if (!challengeResult.success) {
                            // FAILED - permanently lock this door
                            this.dungeonManager.markDoorLocked();
                            gameState.addMessage('🔒 The door remains locked. You cannot open it.', 'danger');
                            return;
                        }
                        // SUCCESS - fall through to normal door passage
                    }
                }

                // Normal door passage
                const destination = this.dungeonManager.getDoorDestination();
                if (destination !== null) {
                    const result = this.dungeonManager.moveToRoom(destination);
                    if (result.bossFight && result.bossId && window.game?.triggerBossEncounter) {
                        await window.game.triggerBossEncounter(result.bossId);
                    }
                }
                return;
            }

            // No interactable at current position in dungeon
            gameState.addMessage('Nothing to interact with here.', 'info');
            return;
        }

        // On world map - check for dungeon entrance first
        if (this.dungeonManager) {
            const dungeonFeature = await this.dungeonManager.getDungeonAtPlayerPosition();
            if (dungeonFeature) {
                const success = await this.dungeonManager.enterDungeon();
                if (success) {
                    // Notify game to switch to dungeon view
                    gameState.set('ui.currentScreen', 'dungeonScreen');
                }
                return;
            }
        }

        // Check for settlement
        if (this.settlementManager) {
            const settlement = this.settlementManager.getSettlementAtPlayerPosition();
            if (settlement) {
                await this.enterSettlement();
                return;
            }
        }

        // Nothing to interact with
        gameState.addMessage('There is nothing to interact with here.', 'info');
    }

    /**
     * Enter settlement if at a settlement tile
     */
    async enterSettlement() {
        if (!this.settlementManager) {
            gameState.addMessage('Settlement system not initialized', 'error');
            return;
        }

        // Don't allow settlement entry during combat
        if (gameState.get('combat')?.active) {
            gameState.addMessage('Cannot enter settlement during combat!', 'error');
            return;
        }

        await this.settlementManager.enterSettlement();
    }

    /**
     * Set dungeon manager reference (called from main.js after initialization)
     */
    setDungeonManager(dungeonManager) {
        this.dungeonManager = dungeonManager;
    }

    /**
     * Check for terrain-based skill challenges
     * @param {Object} tile - Current tile
     * @param {Object} terrainDef - Terrain definition
     */
    async checkForTerrainSkillChallenge(tile, terrainDef) {
        // Don't trigger during combat
        if (gameState.get('combat')?.active) {
            return;
        }

        // Don't trigger if no skill challenge manager
        if (!window.skillChallengeManager || !window.skillChallengeManager.challenges) {
            return;
        }

        const character = gameState.get('character');
        if (!character) {
            return;
        }

        // Map terrain types to challenge IDs
        const terrainChallengeMap = {
            'mountain': ['cliff_climb', 'boulder_push'],
            'hills': ['cliff_climb'],
            'dungeon': ['trap_detect_disarm', 'hidden_treasure'],
            'ruins': ['trap_detect_disarm', 'ancient_text', 'arcane_puzzle'],
            'forest': ['track_creature', 'calm_wild_beast'],
            'denseForest': ['sneak_past_guards', 'track_creature'],
            'swamp': ['endure_harsh_environment'],
            'desert': ['endure_harsh_environment'],
            'tundra': ['endure_harsh_environment'],
            'jungle': ['track_creature', 'endure_harsh_environment']
        };

        const possibleChallenges = terrainChallengeMap[tile.terrain];
        if (!possibleChallenges || possibleChallenges.length === 0) {
            return;
        }

        // Pick a random challenge from the terrain's list
        const challengeId = possibleChallenges[Math.floor(Math.random() * possibleChallenges.length)];
        const challenge = window.skillChallengeManager.challenges.challenges[challengeId];

        if (!challenge) {
            return;
        }

        // Check if challenge should trigger
        const context = {
            terrain: true,
            terrainType: tile.terrain
        };

        if (!window.skillChallengeManager.shouldTriggerChallenge(challengeId, context)) {
            return; // Frequency check failed or on cooldown
        }

        // Record attempt for cooldown
        window.skillChallengeManager.recordChallengeAttempt(challengeId);

        // Calculate level-adjusted DC
        const baseDC = challenge.type === 'single' ? challenge.baseDC : challenge.stages[0].baseDC;
        const adjustedDC = window.skillChallengeManager.calculateAdjustedDC(baseDC, character.level);

        // Handle challenge types
        if (challenge.type === 'single') {
            // Single skill check
            await this.handleSingleSkillChallenge(challenge, adjustedDC);
        } else if (challenge.type === 'sequential') {
            // Multi-stage challenge
            await this.handleSequentialSkillChallenge(challenge);
        } else if (challenge.type === 'choice') {
            // Multiple skill options
            await this.handleChoiceSkillChallenge(challenge, adjustedDC);
        }
    }

    /**
     * Handle single-skill challenge
     * @param {Object} challenge - Challenge template
     * @param {number} adjustedDC - Level-adjusted DC
     */
    async handleSingleSkillChallenge(challenge, adjustedDC) {
        const character = gameState.get('character');

        // Create config for skill check modal
        const config = {
            title: challenge.name,
            description: challenge.description,
            skill: challenge.skill,
            dc: adjustedDC
        };

        // Prompt skill check with challenge integration
        const result = await window.game.promptSkillCheck(config, challenge, null);

        if (!result.attempted) {
            gameState.addMessage('You decide to avoid the challenge.', 'info');
            return;
        }

        // Check if combat was initiated
        if (result.consequences?.initiateCombat) {
            gameState.addMessage('⚔️ Combat begins!', 'danger');

            // Hide skill challenge modal during combat
            const skillCheckModal = document.getElementById('skillCheckModal');
            if (skillCheckModal) {
                skillCheckModal.classList.remove('active');
            }

            // Save challenge state for resumption after combat
            gameState.set('pendingChallenge', {
                challenge,
                result,
                type: 'single'
            });

            // Trigger combat encounter with challenge-specific enemy types
            await this.triggerCombatFromChallenge(result.enemyTypes || null);

            // Challenge ends after combat (single challenges don't resume)
            gameState.set('pendingChallenge', null);
            return;
        }

        // Notify QuestManager of challenge completion
        if (window.questManager) {
            window.questManager.onSkillChallengeCompleted(challenge.id, result);
        }
    }

    /**
     * Handle sequential (multi-stage) skill challenge
     * @param {Object} challenge - Challenge template
     */
    async handleSequentialSkillChallenge(challenge) {
        const character = gameState.get('character');
        let currentStageIndex = 0;
        const stageHistory = []; // Track stage results for outcome display

        while (currentStageIndex < challenge.stages.length) {
            const stage = challenge.stages[currentStageIndex];

            // Calculate level-adjusted DC for this stage
            const adjustedDC = window.skillChallengeManager.calculateAdjustedDC(stage.baseDC, character.level);

            // Create config for this stage with stage history
            const config = {
                title: `${challenge.name} - Stage ${currentStageIndex + 1}/${challenge.stages.length}`,
                description: stage.description || challenge.description,
                skill: stage.skill,
                dc: adjustedDC,
                stageHistory: [...stageHistory] // Pass current history for display
            };

            // Prompt skill check
            const result = await window.game.promptSkillCheck(config, challenge, stage);

            // Record this stage's result for history (if attempted)
            if (result.attempted) {
                stageHistory.push({
                    description: stage.description,
                    skill: stage.skill,
                    dc: adjustedDC,
                    success: result.success,
                    rollResult: result.rollResult
                });
            }

            if (!result.attempted) {
                gameState.addMessage('You abandon the challenge.', 'info');
                break;
            }

            // Check if combat was initiated
            if (result.consequences?.initiateCombat) {
                gameState.addMessage('⚔️ Combat begins!', 'danger');

                // Hide skill challenge modal during combat
                const skillCheckModal = document.getElementById('skillCheckModal');
                if (skillCheckModal) {
                    skillCheckModal.classList.remove('active');
                }

                // Save challenge state for resumption after combat
                gameState.set('pendingChallenge', {
                    challenge,
                    currentStageIndex,
                    result,
                    stageHistory: [...stageHistory], // Include stage history for outcome display
                    type: 'sequential'
                });

                // Trigger combat encounter with challenge-specific enemy types
                await this.triggerCombatFromChallenge(result.enemyTypes || null);

                // Check if combat was fled or defeated - if so, abandon challenge
                const combat = gameState.get('combat');
                if (!combat?.active) {
                    const combatResult = gameState.get('lastCombatResult');
                    if (combatResult === 'fled' || combatResult === 'defeat') {
                        gameState.addMessage('Challenge abandoned due to combat outcome.', 'warning');
                        gameState.set('pendingChallenge', null);
                        break;
                    }
                }

                // Combat won - continue challenge from saved state
                const pendingChallenge = gameState.get('pendingChallenge');
                if (!pendingChallenge) {
                    break;
                } // Challenge was cleared

                // Continue from where we left off
                // Combat success allows progression
            }

            if (!result.success) {
                // Stage failed - check if there's a nextStage on failure or if challenge ends
                if (stage.onFailure?.nextStage) {
                    // Find next stage by ID
                    currentStageIndex = challenge.stages.findIndex(s => s.id === stage.onFailure.nextStage);
                    if (currentStageIndex === -1) {
                        break;
                    } // Stage not found, end challenge
                } else {
                    // Challenge failed, end
                    break;
                }
            } else {
                // Stage succeeded - check for next stage
                if (stage.onSuccess?.nextStage) {
                    // Find next stage by ID
                    currentStageIndex = challenge.stages.findIndex(s => s.id === stage.onSuccess.nextStage);
                    if (currentStageIndex === -1) {
                        break;
                    } // Stage not found, end challenge
                } else {
                    // Final stage completed
                    gameState.addMessage(`✨ Challenge complete: ${challenge.name}`, 'success');

                    // Notify QuestManager of challenge completion
                    if (window.questManager) {
                        window.questManager.onSkillChallengeCompleted(challenge.id, result);
                    }

                    // Clear pending challenge
                    gameState.set('pendingChallenge', null);

                    break;
                }
            }
        }

        // Clear pending challenge if we exit loop early
        gameState.set('pendingChallenge', null);
    }

    /**
     * Trigger combat encounter from skill challenge failure
     * @param {Array<string>} enemyTypes - Optional array of specific enemy IDs to spawn (e.g., ['wolf', 'direwolf', 'bear'])
     */
    async triggerCombatFromChallenge(enemyTypes = null) {
        const character = gameState.get('character');
        const location = gameState.get('world.currentLocation');

        // Get terrain at current location
        const tile = await this.worldGenerator.getTile(location.x, location.y);

        if (!tile) {
            console.error('⚠️ Cannot trigger combat - no tile data at location:', location);
            gameState.addMessage('⚠️ Combat encounter failed to trigger', 'warning');
            return;
        }

        // Generate appropriate enemy based on location/terrain
        // Force trigger combat (don't use random encounter check)
        // Pass enemyTypes to ensure contextually appropriate enemies (e.g., wolves for wild beast challenge)
        this.triggerCombatEncounter(tile.terrain, enemyTypes);
    }

    /**
     * Handle choice-based skill challenge
     * @param {Object} challenge - Challenge template
     * @param {number} baseAdjustedDC - Base level-adjusted DC
     */
    async handleChoiceSkillChallenge(challenge, baseAdjustedDC) {
        // Show choice UI - player picks which skill to use
        const result = await window.game.promptChoiceSkillChallenge(challenge);

        if (!result.attempted) {
            gameState.addMessage('You decide to find another way.', 'info');
            return;
        }

        // Check if combat was initiated
        if (result.consequences?.initiateCombat) {
            gameState.addMessage('⚔️ Combat begins!', 'danger');

            // Hide skill challenge modal during combat
            const skillCheckModal = document.getElementById('skillCheckModal');
            if (skillCheckModal) {
                skillCheckModal.classList.remove('active');
            }

            // Save challenge state for resumption after combat
            gameState.set('pendingChallenge', {
                challenge,
                result,
                type: 'choice'
            });

            // Trigger combat encounter with challenge-specific enemy types
            await this.triggerCombatFromChallenge(result.enemyTypes || null);

            // Challenge ends after combat (choice challenges don't resume)
            gameState.set('pendingChallenge', null);
            return;
        }

        // Notify QuestManager of challenge completion
        if (window.questManager) {
            window.questManager.onSkillChallengeCompleted(challenge.id, result);
        }
    }

    /**
     * Update visible tiles around player
     */
    async updateVisibility() {
        const viewRadius = 8;

        for (let dy = -viewRadius; dy <= viewRadius; dy++) {
            for (let dx = -viewRadius; dx <= viewRadius; dx++) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= viewRadius) {
                    const tile = await this.worldGenerator.getTile(this.x + dx, this.y + dy);
                    if (tile) {
                        tile.visible = true;
                        tile.explored = true;
                    }
                }
            }
        }
    }

    /**
     * Check for random encounters
     */
    checkForEncounters(tile, terrainDef) {
        const encounterChance = terrainDef.encounterModifier || 0.1;

        // Reduce base encounter rate to ~1% (previously 4%), still scaled by terrain modifier
        if (Math.random() < encounterChance * 0.01) {
            // Don't add message here - it will be added by CombatManager when combat starts
            this.triggerCombatEncounter(terrainDef);
        }
    }

    /**
     * Trigger a combat encounter using the XP-budget EncounterBuilder
     * @param {Object} terrainDef - Terrain definition
     * @param {Array<string>} enemyTypes - Optional array of specific enemy IDs to spawn (e.g., ['wolf', 'direwolf', 'bear'])
     */
    async triggerCombatEncounter(terrainDef, enemyTypes = null) {
        const playerLevel = gameState.get('character.level') || 1;
        const difficulty = gameState.get('worldConfig.difficulty') || 'normal';
        const campaignId = gameState.get('worldConfig.campaignId') || 'core';
        const terrainId = terrainDef?.id || 'grassland';

        const { buildEncounter } = await import('./EncounterBuilder.js');

        const encounter = await buildEncounter({
            partySize: 1,
            partyLevel: playerLevel,
            gameDifficulty: difficulty,
            terrain: terrainId,
            monsterPool: enemyTypes,
            campaignId,
            context: 'overworld'
        });

        if (!encounter.monsters || encounter.monsters.length === 0) {
            console.warn('⚠️ EncounterBuilder returned no monsters, skipping encounter');
            return;
        }

        console.log(`⚔️ Encounter: ${encounter.monsters.map(m => m.name).join(', ')} (${encounter.difficultyRating}, ${encounter.totalXP} XP)`);

        // Set combat state IMMEDIATELY to block further movement
        gameState.set('combat', { active: true, pending: true });

        // Trigger combat event
        gameState.set('ui.pendingCombat', { enemies: encounter.monsters });
        gameState.set('ui.currentScreen', 'combatScreen');
    }

    /**
     * Handle feature interaction
     */
    handleFeature(feature) {
        switch (feature.type) {
            case 'settlement':
                gameState.addMessage(`🏘️ You arrive at ${feature.name}, a ${feature.settlementType}.`, 'success');
                break;

            case 'dungeon':
                gameState.addMessage(`⚠️ You discover a dangerous dungeon! (Difficulty: ${feature.difficulty})`, 'warning');
                break;

            case 'poi':
                if (!feature.discovered) {
                    feature.discovered = true;
                    gameState.addMessage(`✨ You discover a ${feature.poiType}!`, 'success');
                }
                break;
        }
    }

    /**
     * Get current position
     */
    getPosition() {
        return { x: this.x, y: this.y };
    }

    /**
     * Action handlers - These are triggered by keyboard shortcuts
     * The actual UI logic is implemented in main.js Game class
     */
    openInventory() {
        // Inventory UI handled by Game.openInventory() in main.js
        // Triggered by 'I' key
    }

    openCharacterSheet() {
        // Character sheet UI handled by Game.openCharacterSheet() in main.js
        // Triggered by 'C' key
    }

    openQuestLog() {
        // Quest log UI handled by Game.openQuestLog() in main.js
        // Triggered by 'Q' key
    }

    openMap() {
        // World map UI - opens world map modal
        // Message removed - world map is implemented
    }

    rest() {
        // Rest UI handled by RestManager
        restManager.openRestMenu();
    }

    interact() {
        // Interact with nearby objects/NPCs - TODO: Implement interaction system
        gameState.addMessage('👋 Interact with nearby objects (not yet implemented)', 'info');
    }

    showHelp() {
        // Open help modal (main.js handles the actual modal)
        if (window.game && typeof window.game.openHelp === 'function') {
            window.game.openHelp();
        }
    }

    /**
     * Check if character can traverse special terrain types
     * Data-driven approach: checks terrain's marinerTraversable field from terrains.json
     * @param {string} terrainId - Terrain type ID (e.g., 'deepWater', 'ocean')
     * @returns {boolean} - True if character can traverse this terrain
     */
    canTraverseSpecialTerrain(terrainId) {
        const character = gameState.get('character');
        if (!character) {
            console.log('🌊 No character found');
            return false;
        }

        // Get terrain definition from data
        const terrainDef = this.worldGenerator.terrainTypes.terrains.find(t => t.id === terrainId);
        if (!terrainDef) {
            console.log(`🌊 Unknown terrain type: ${terrainId}`);
            return false;
        }

        console.log('🌊 Checking terrain traversal:', {
            terrainId,
            marinerTraversable: terrainDef.marinerTraversable,
            fightingStyle: character.fightingStyle,
            armor: character.equipment?.armor?.id,
            armorType: character.equipment?.armor?.armorType,
            offHand: character.equipment?.offHand?.id,
            offHandType: character.equipment?.offHand?.type
        });

        // Mariner Fighting Style: Can traverse terrain marked as marinerTraversable
        // (if not wearing heavy armor or shield)
        if (terrainDef.marinerTraversable && character.fightingStyle === 'mariner') {
            // Check if wearing heavy armor
            const isWearingHeavyArmor = character.equipment?.armor?.armorType === 'heavy';
            // Check if wielding a shield
            const isWieldingShield = character.equipment?.offHand?.type === 'shield';

            console.log('🌊 Mariner check:', {
                isWearingHeavyArmor,
                isWieldingShield,
                canTraverse: !isWearingHeavyArmor && !isWieldingShield
            });

            if (!isWearingHeavyArmor && !isWieldingShield) {
                // Use custom message from terrain data, or fallback
                const message = terrainDef.marinerMessage || `🌊 Traversing ${terrainDef.name} with Mariner training!`;
                gameState.addMessage(`🌊 ${message}`, 'success');
                return true;
            } else {
                if (isWearingHeavyArmor) {
                    gameState.addMessage('🌊 Mariner: Remove heavy armor to swim!', 'warning');
                }
                if (isWieldingShield) {
                    gameState.addMessage('🌊 Mariner: Unequip shield to swim!', 'warning');
                }
            }
        }

        return false;
    }

    /**
     * Get skill check configuration for impassable terrain
     * @param {Object} terrainDef - Terrain definition object
     * @returns {Object|null} - Skill check config or null if no check available
     */
    getSkillCheckForTerrain(terrainDef) {
        // Map terrain types to skill check configurations
        const skillChecks = {
            ocean: {
                skill: 'athletics',
                dc: 20,
                title: 'Attempt Ocean Crossing?',
                description: 'The churning ocean waters are too deep to swim across. You might drown.',
                consequences: [
                    { type: 'damage', dice: '2d6', damageType: 'drowning', description: 'Take 2d6 drowning damage' },
                    { type: 'exhaustion', level: 1, description: 'Gain Exhaustion (level 1)' },
                    { type: 'equipmentLoss', chance: 0.25, description: '25% chance to lose random equipment' }
                ]
            },
            deepWater: {
                skill: 'athletics',
                dc: 15,
                title: 'Attempt to Cross Deep Water?',
                description: 'The water is very deep. Swimming across is risky.',
                consequences: [
                    { type: 'damage', dice: '1d6', damageType: 'drowning', description: 'Take 1d6 drowning damage' },
                    { type: 'exhaustion', level: 1, description: 'Gain Exhaustion (level 1)' }
                ]
            }
        };

        return skillChecks[terrainDef.id] || null;
    }

    /**
     * Prompt player with skill check dialogue
     * @param {Object} config - Skill check configuration
     * @returns {Promise<Object>} - { attempted: boolean, success: boolean }
     */
    async promptSkillCheck(config) {
        // Delegate to Game.promptSkillCheck() in main.js
        if (window.game && typeof window.game.promptSkillCheck === 'function') {
            return await window.game.promptSkillCheck(config);
        }

        // Fallback if game instance not available
        console.warn('Game instance not available for skill check prompt');
        return { attempted: false, success: false };
    }

    /**
     * Trigger a trap using PASSIVE PERCEPTION when player steps on a trap tile.
     *
     * Flow:
     * 1. Calculate passive perception (10 + perception skill bonus)
     * 2. Compare against trap DC (from tile data or default 13)
     * 3. If DETECTED: Show modal offering disarm attempt (Sleight of Hand check)
     * 4. If NOT DETECTED: Immediately take damage, then show result
     *
     * The player does NOT get a modal asking "do you want to roll perception?"
     * Detection happens automatically via passive perception.
     */
    async triggerDungeonTrapChallenge() {
        const character = gameState.get('character');
        if (!character) return;

        // Get trap tile data for DC and damage
        const dungeonState = gameState.get('dungeon');
        let trapDC = 13; // Default trap detection DC
        let trapDamageDice = '2d6'; // Default trap damage
        let trapTile = null;

        if (dungeonState?.active) {
            const pos = dungeonState.playerPosition;
            const room = this.dungeonManager?.getCurrentRoom();
            trapTile = room?.tiles?.[pos.y]?.[pos.x];
            if (trapTile) {
                trapDC = trapTile.trapDC || trapDC;
                trapDamageDice = trapTile.trapDamage || trapDamageDice;
            }
        }

        // Calculate passive perception: 10 + perception skill bonus
        const perceptionBonus = character.skills?.perception?.bonus || 0;
        const passivePerception = 10 + perceptionBonus;

        const detected = passivePerception >= trapDC;

        if (detected) {
            // TRAP DETECTED - Show disarm modal
            gameState.addMessage(`👁️ Your keen senses detect a trap! (Passive Perception ${passivePerception} vs DC ${trapDC})`, 'warning');

            // Offer disarm attempt via skill challenge modal
            if (window.skillChallengeManager?.challenges) {
                const challenge = window.skillChallengeManager.challenges.challenges['trap_detect_disarm'];
                if (challenge && challenge.stages?.length >= 2) {
                    // Skip stage 1 (detect) - already detected via passive perception
                    // Go directly to stage 2 (disarm)
                    const disarmStage = challenge.stages[1]; // sleightOfHand disarm stage
                    const adjustedDC = window.skillChallengeManager.calculateAdjustedDC(
                        disarmStage.baseDC || 14,
                        character.level
                    );

                    const config = {
                        title: '🪤 Trap Detected!',
                        description: `You spot a hidden trap mechanism ahead. You can attempt to disarm it.`,
                        skill: disarmStage.skill || 'sleightOfHand',
                        dc: adjustedDC
                    };

                    const result = await window.game.promptSkillCheck(config, challenge, disarmStage);

                    if (result.attempted && result.success) {
                        gameState.addMessage('✅ You carefully disarm the trap!', 'success');
                    } else if (result.attempted && !result.success) {
                        // Failed disarm - take reduced damage (you knew it was there)
                        const { roll: rollFn } = await import('../utils/dice.js');
                        const damage = rollFn(trapDamageDice);
                        const reducedDamage = Math.max(1, Math.floor(damage / 2));
                        character.currentHP = Math.max(0, character.currentHP - reducedDamage);
                        gameState.set('character', character);
                        if (window.game) window.game.updateHUD(character);
                        gameState.addMessage(`💥 The trap triggers during disarm! You take ${reducedDamage} damage (reduced).`, 'danger');
                    } else {
                        // Player chose not to attempt - carefully step around
                        gameState.addMessage('🚶 You carefully avoid the trap.', 'info');
                    }
                } else {
                    // No challenge template - just allow avoiding
                    gameState.addMessage('🚶 You spot and avoid the trap.', 'info');
                }
            } else {
                gameState.addMessage('🚶 You spot and avoid the trap.', 'info');
            }
        } else {
            // TRAP NOT DETECTED - Immediate damage, no choice
            const { roll: rollFn } = await import('../utils/dice.js');
            const damage = rollFn(trapDamageDice);
            character.currentHP = Math.max(0, character.currentHP - damage);
            gameState.set('character', character);
            if (window.game) window.game.updateHUD(character);

            gameState.addMessage(`⚠️ You trigger a hidden trap! (Passive Perception ${passivePerception} vs DC ${trapDC})`, 'danger');
            gameState.addMessage(`💥 The trap deals ${damage} damage!`, 'danger');

            // Show floating combat text if available
            if (window.game?.showFloatingCombatText) {
                // Use player's combatant card if in view, otherwise skip
                const playerCard = document.querySelector('.combatant-card[data-combatant-id="player"]');
                if (playerCard) {
                    window.game.showFloatingCombatText('player', `-${damage}`, 'damage');
                }
            }
        }

        // Mark trap as dealt with (detected or triggered)
        if (dungeonState?.active && trapTile) {
            const pos = dungeonState.playerPosition;
            const room = this.dungeonManager?.getCurrentRoom();
            if (room?.tiles?.[pos.y]?.[pos.x]) {
                room.tiles[pos.y][pos.x].trapDetected = true;
                room.tiles[pos.y][pos.x].isTrap = false; // Don't trigger again
                gameState.set('dungeon', dungeonState);
            }
        }
    }

    /**
     * Check for room-based skill challenges during dungeon exploration
     * Triggered on movement based on room's skillChallengeChance
     * The room chance IS the per-step trigger rate (e.g., 0.2 = 20% per step)
     */
    async checkForDungeonSkillChallenge() {
        if (!this.dungeonManager?.isInDungeon()) return;
        if (gameState.get('combat')?.active) return;
        if (!window.skillChallengeManager || !window.skillChallengeManager.challenges) return;

        const character = gameState.get('character');
        if (!character) return;

        // Get current room data
        const currentRoom = this.dungeonManager.getCurrentRoom();
        if (!currentRoom) return;

        // Room's skillChallengeChance is the direct per-step trigger rate
        // Exploration rooms: 0.1-0.25, Puzzle rooms: 0.75-0.9, Treasure rooms: 0.25-0.5
        const challengeChance = currentRoom.skillChallengeChance || 0;
        if (challengeChance <= 0 || Math.random() > challengeChance) {
            return;
        }

        // Filter by room features for thematic relevance
        const features = currentRoom.features || [];
        const roomCategory = currentRoom.category || 'exploration';
        let relevantChallenges = [];

        // Feature-based challenge selection
        if (features.some(f => f.includes('trap') || f.includes('pressure') || f.includes('mechanism'))) {
            relevantChallenges.push('trap_detect_disarm');
        }
        // locked_door now triggers specifically on door tiles via E key interaction
        // Vault/sealed features use arcane_puzzle instead
        if (features.some(f => f.includes('vault') || f.includes('sealed'))) {
            relevantChallenges.push('arcane_puzzle');
        }
        if (features.some(f => f.includes('treasure') || f.includes('chest') || f.includes('hidden') || f.includes('secret'))) {
            relevantChallenges.push('hidden_treasure');
        }
        if (features.some(f => f.includes('rune') || f.includes('magic') || f.includes('crystal') || f.includes('arcane'))) {
            relevantChallenges.push('arcane_puzzle');
        }
        if (features.some(f => f.includes('text') || f.includes('book') || f.includes('carved') || f.includes('inscription'))) {
            relevantChallenges.push('ancient_text');
        }
        if (features.some(f => f.includes('guard') || f.includes('patrol') || f.includes('shadow'))) {
            relevantChallenges.push('sneak_past_guards');
        }
        if (features.some(f => f.includes('narrow') || f.includes('bridge') || f.includes('ledge') || f.includes('precarious'))) {
            relevantChallenges.push('narrow_ledge');
        }
        if (features.some(f => f.includes('altar') || f.includes('religious') || f.includes('holy') || f.includes('ritual'))) {
            relevantChallenges.push('holy_ritual');
        }

        // If no feature-specific match, fall back to room category defaults
        if (relevantChallenges.length === 0) {
            if (roomCategory === 'puzzle') {
                relevantChallenges = ['arcane_puzzle', 'hidden_treasure'];
            } else if (roomCategory === 'treasure') {
                relevantChallenges = ['trap_detect_disarm', 'hidden_treasure'];
            } else if (roomCategory === 'combat') {
                relevantChallenges = ['sneak_past_guards', 'trap_detect_disarm'];
            } else {
                // Generic exploration challenges
                relevantChallenges = ['hidden_treasure', 'narrow_ledge', 'ancient_text'];
            }
        }

        // Pick a random challenge from relevant pool
        const challengeId = relevantChallenges[Math.floor(Math.random() * relevantChallenges.length)];
        const challenge = window.skillChallengeManager.challenges.challenges[challengeId];

        if (!challenge) return;

        // Only check cooldown (not another random frequency check) for dungeon challenges
        // The room's skillChallengeChance already controls the trigger rate
        if (!window.skillChallengeManager.canAttemptChallenge(challengeId)) {
            return;
        }

        // Record attempt for cooldown tracking
        window.skillChallengeManager.recordChallengeAttempt(challengeId);

        // Calculate level-adjusted DC
        const baseDC = challenge.type === 'single' ? challenge.baseDC : (challenge.stages?.[0]?.baseDC || 12);
        const adjustedDC = window.skillChallengeManager.calculateAdjustedDC(baseDC, character.level);

        // Handle by challenge type
        if (challenge.type === 'single') {
            await this.handleSingleSkillChallenge(challenge, adjustedDC);
        } else if (challenge.type === 'sequential') {
            await this.handleSequentialSkillChallenge(challenge);
        } else if (challenge.type === 'choice') {
            await this.handleChoiceSkillChallenge(challenge, adjustedDC);
        }
    }

    /**
     * Check for random encounters while in dungeon
     * Uses dungeon-specific encounter modifier and monster pool
     */
    async checkForDungeonEncounter() {
        if (!this.dungeonManager?.isInDungeon()) {
            return;
        }

        // Get encounter modifier from dungeon
        const encounterModifier = this.dungeonManager.getEncounterModifier();

        // Base dungeon encounter rate - 12% base * room encounter modifier
        if (Math.random() < 0.12 * encounterModifier) {
            await this.triggerDungeonEncounter();
        }
    }

    /**
     * Trigger combat encounter within dungeon using dungeon's monster pool
     */
    async triggerDungeonEncounter() {
        const playerLevel = gameState.get('character.level') || 1;
        const dungeonState = gameState.get('dungeon');

        // Import rules engine
        const { RULES } = await import('../core/rulesEngine.js');
        const { min, max } = RULES.encounters.encounterSize;

        // Calculate number of enemies
        let numEnemies = Math.floor(Math.random() * (max - min + 1)) + min;

        // Scale with level
        if (playerLevel <= 2) {
            numEnemies = Math.min(numEnemies, 2);
        }

        // Get dungeon monster pool
        const monsterPool = this.dungeonManager.getDungeonMonsterPool();

        const enemies = [];
        for (let i = 0; i < numEnemies; i++) {
            const enemy = await this.generateDungeonEnemy(playerLevel, monsterPool);
            if (enemy) {
                enemies.push(enemy);
            }
        }

        if (enemies.length === 0) {
            console.warn('⚠️ Failed to generate dungeon enemies');
            return;
        }

        // Set combat state IMMEDIATELY to block further movement
        gameState.set('combat', { active: true, pending: true });

        // Trigger combat event
        gameState.set('ui.pendingCombat', { enemies });
        gameState.set('ui.currentScreen', 'combatScreen');
    }

    /**
     * Generate enemy from dungeon's monster pool
     * @param {number} playerLevel - Player character level
     * @param {Array<string>} monsterPool - Array of monster IDs valid for this dungeon
     */
    async generateDungeonEnemy(playerLevel, monsterPool) {
        // Load monster data
        const response = await fetch('data/monsters.json');
        const monsterData = await response.json();

        const { roll } = await import('../utils/dice.js');
        const { getEncounterCR, RULES } = await import('../core/rulesEngine.js');

        const difficulty = gameState.get('worldConfig.difficulty') || 'normal';
        const targetCR = getEncounterCR(playerLevel, difficulty);

        // Filter monsters by dungeon pool
        let dungeonMonsters = monsterData.monsters.filter(m =>
            monsterPool.includes(m.id)
        );

        // If no monsters match pool, fallback to any monster
        if (dungeonMonsters.length === 0) {
            console.warn('⚠️ No monsters in dungeon pool, using fallback');
            dungeonMonsters = monsterData.monsters;
        }

        // Filter by CR
        let appropriateMonsters = dungeonMonsters.filter(m => {
            const cr = m.challengeRating || m.cr || 0.25;
            return cr >= targetCR - 1 && cr <= targetCR + 1;
        });

        // Fallback to wider CR range
        if (appropriateMonsters.length === 0) {
            appropriateMonsters = dungeonMonsters.filter(m => {
                const cr = m.challengeRating || m.cr || 0.25;
                return cr >= targetCR - 2 && cr <= targetCR + 2;
            });
        }

        // Final fallback: any from pool
        if (appropriateMonsters.length === 0) {
            appropriateMonsters = dungeonMonsters;
        }

        // Pick random monster
        const monster = appropriateMonsters[Math.floor(Math.random() * appropriateMonsters.length)];

        if (!monster) {
            return null;
        }

        // Roll HP and create enemy
        const hp = roll(monster.hitPoints);

        return {
            name: monster.name,
            race: { name: monster.type },
            class: { name: 'Monster' },
            level: playerLevel,
            cr: monster.challengeRating || monster.cr,
            maxHP: hp,
            currentHP: hp,
            ac: monster.armorClass,
            speed: monster.speed || 30,
            abilities: monster.abilities,
            abilityModifiers: {
                str: Math.floor((monster.abilities.str - 10) / 2),
                dex: Math.floor((monster.abilities.dex - 10) / 2),
                con: Math.floor((monster.abilities.con - 10) / 2),
                int: Math.floor((monster.abilities.int - 10) / 2),
                wis: Math.floor((monster.abilities.wis - 10) / 2),
                cha: Math.floor((monster.abilities.cha - 10) / 2)
            },
            proficiencyBonus: 2,
            skills: monster.skills || {},
            equipment: {
                mainHand: null,
                offHand: null,
                armor: null
            },
            isNPC: true
        };
    }

    /**
     * Apply consequences of failed skill check
     * @param {Array} consequences - Array of consequence objects
     */
    applySkillCheckFailure(consequences) {
        const character = gameState.get('character');

        consequences.forEach(consequence => {
            switch (consequence.type) {
                case 'damage':
                    const damage = rollDice(consequence.dice);
                    character.takeDamage(damage);
                    gameState.addMessage(
                        `💥 ${consequence.damageType} damage: ${damage} HP!`,
                        'danger'
                    );
                    break;

                case 'exhaustion':
                    character.addExhaustion(consequence.level);
                    gameState.addMessage(
                        `😓 You gain Exhaustion level ${consequence.level}!`,
                        'warning'
                    );
                    break;

                case 'equipmentLoss':
                    if (Math.random() < consequence.chance) {
                        const lostItem = character.loseRandomEquipment();
                        if (lostItem) {
                            gameState.addMessage(
                                `🌊 Your ${lostItem.name} was swept away by the current!`,
                                'danger'
                            );
                        }
                    }
                    break;

                case 'injury':
                    character.addInjury();
                    gameState.addMessage(
                        '🩹 You suffer an injury!',
                        'danger'
                    );
                    break;

                case 'death':
                    character.die();
                    gameState.addMessage(
                        '💀 You fall to your death...',
                        'danger'
                    );
                    break;
            }
        });

        // Update character state
        gameState.set('character', character);

        // Update HUD via Game instance
        if (window.game && typeof window.game.updateHUD === 'function') {
            window.game.updateHUD();
        }
    }
}

export default Player;
