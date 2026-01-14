// Settlement Management System
// Handles settlement entry, state management, and building interactions

import { gameState } from '../core/GameState.js';

class SettlementManager {
    constructor(worldGenerator, settlementUI = null, npcGenerator = null, questGenerator = null, questManager = null) {
        this.worldGenerator = worldGenerator;
        this.settlementUI = settlementUI;
        this.npcGenerator = npcGenerator;
        this.questGenerator = questGenerator;
        this.questManager = questManager;
        this.currentSettlement = null;
        this.currentBuilding = null;

        console.log('🏘️ SettlementManager initialized with:', {
            npcGenerator: !!this.npcGenerator,
            questGenerator: !!this.questGenerator,
            questManager: !!this.questManager
        });
    }

    /**
   * Check if player can enter settlement at current position
   * @returns {Object|null} Settlement data if available, null otherwise
   */
    getSettlementAtPlayerPosition() {
        const playerPos = gameState.get('player.position');
        if (!playerPos) {
            return null;
        }

        // Get region coordinates
        const { regionX, regionY } = this.worldGenerator.getRegionCoords(playerPos.x, playerPos.y);
        const regionKey = `${regionX},${regionY}`;
        const region = gameState.get('world.generatedRegions')?.get(regionKey);

        if (!region) {
            return null;
        }

        // Check if any settlement feature is at player position
        const settlement = region.features?.find(f =>
            f.type === 'settlement' &&
      f.x === playerPos.x &&
      f.y === playerPos.y
        );

        return settlement || null;
    }

    /**
   * Attempt to enter settlement
   * Shows prompt if settlement available, opens UI if player presses E
   * @returns {boolean} True if settlement entered, false otherwise
   */
    async enterSettlement() {
        const settlement = this.getSettlementAtPlayerPosition();

        if (!settlement) {
            gameState.addMessage('No settlement here.', 'info');
            return false;
        }

        // Store current settlement
        this.currentSettlement = settlement;
        gameState.set('ui.currentSettlement', settlement);

        // Debug: Check settlement state
        console.log(`🏘️ Entering ${settlement.name}`);
        console.log(`   - Has NPCs: ${settlement.npcs ? 'yes' : 'no'}`);
        console.log(`   - NPC count: ${settlement.npcs?.length || 0}`);
        console.log(`   - Has quests generated: ${settlement.questsGenerated ? 'yes' : 'no'}`);
        console.log(`   - Previously visited: ${settlement.visitedAt ? 'yes' : 'no'}`);

        // Generate NPCs if they don't exist
        if (!settlement.npcs || settlement.npcs.length === 0) {
            console.log('👥 Generating NPCs for first visit...');

            if (this.npcGenerator) {
                settlement.npcs = await this.npcGenerator.generateNPCsForSettlement(settlement);
                console.log(`👥 Generated ${settlement.npcs.length} NPCs`);
            } else {
                settlement.npcs = [];
                console.warn('NPCGenerator not initialized');
            }
        }

        // Generate quests if they haven't been generated yet (separate from NPC check)
        if (!settlement.questsGenerated && this.questGenerator && this.questManager) {
            console.log('📜 Generating quests for first visit...');

            const playerLevel = gameState.get('character.level') || 1;
            const quests = await this.questGenerator.generateQuestsForSettlement(settlement, playerLevel);
            console.log(`📜 Generated ${quests.length} quests`);

            // Assign quests to NPCs
            this.assignQuestsToNPCs(settlement, quests);

            // Add quests to gameState.quests.available
            const questState = gameState.get('quests');
            if (!questState.available) {
                questState.available = [];
            }

            for (const quest of quests) {
                // Add to available quests in gameState
                questState.available.push(quest);
                console.log(`📜 Added quest "${quest.name}" to available quests (giver: ${quest.questGiver?.npcName})`);
            }

            gameState.set('quests', questState);
            console.log(`📜 Total available quests: ${questState.available.length}`);

            // Mark quests as generated
            settlement.questsGenerated = true;
        } else if (!this.questGenerator || !this.questManager) {
            console.warn('QuestGenerator or QuestManager not initialized');
        }

        // Mark as visited
        if (!settlement.visitedAt) {
            settlement.visitedAt = Date.now();
        }

        // Show settlement UI
        this.showSettlementUI();
        gameState.addMessage(`You enter ${settlement.name}`, 'success');

        return true;
    }

    /**
   * Assign generated quests to appropriate NPCs based on their roles
   * @param {Object} settlement - Settlement data
   * @param {Array<Object>} quests - Generated quests
   */
    assignQuestsToNPCs(settlement, quests) {
        if (!settlement.npcs || settlement.npcs.length === 0) {
            console.warn('No NPCs to assign quests to');
            return;
        }

        // Build role-based NPC lookup
        const npcsByRole = {};
        for (const npc of settlement.npcs) {
            if (npc.offersQuest) {
                if (!npcsByRole[npc.role]) {
                    npcsByRole[npc.role] = [];
                }
                npcsByRole[npc.role].push(npc);
            }
        }

        // Assign each quest to an appropriate NPC
        for (const quest of quests) {
            // Get quest giver preference from quest data
            const preferredRole = quest.questGiver?.role || 'leader';

            // Find NPCs with matching role
            let candidates = npcsByRole[preferredRole] || [];

            // Fallback to any quest-giving NPC if no match
            if (candidates.length === 0) {
                candidates = settlement.npcs.filter(npc => npc.offersQuest);
            }

            // Assign to NPC with fewest quests
            if (candidates.length > 0) {
                candidates.sort((a, b) => (a.questIds?.length || 0) - (b.questIds?.length || 0));
                const selectedNPC = candidates[0];

                if (!selectedNPC.questIds) {
                    selectedNPC.questIds = [];
                }
                selectedNPC.questIds.push(quest.id);

                // Update quest with NPC details
                quest.questGiver = {
                    npcId: selectedNPC.id,
                    npcName: selectedNPC.name,
                    role: selectedNPC.role,
                    building: selectedNPC.building
                };

                // Replace {npcName} placeholder in quest text with actual NPC name
                if (quest.description) {
                    quest.description = quest.description.replace(/{npcName}/g, selectedNPC.name);
                }
                if (quest.name) {
                    quest.name = quest.name.replace(/{npcName}/g, selectedNPC.name);
                }
                // Update objectives too
                if (quest.objectives) {
                    quest.objectives.forEach(obj => {
                        if (obj.description) {
                            obj.description = obj.description.replace(/{npcName}/g, selectedNPC.name);
                        }
                    });
                }

                console.log(`📜 Assigned quest "${quest.name}" to ${selectedNPC.name} (${selectedNPC.role})`);
            } else {
                console.warn(`No suitable NPC found for quest: ${quest.name}`);
            }
        }
    }

    /**
   * Exit settlement and return to world map
   */
    exitSettlement() {
        this.currentSettlement = null;
        this.currentBuilding = null;
        gameState.set('ui.currentSettlement', null);

        // Hide settlement UI
        this.hideSettlementUI();
        gameState.addMessage('You leave the settlement', 'info');
    }

    /**
   * Show settlement town map UI
   */
    showSettlementUI() {
        if (!this.settlementUI) {
            console.error('SettlementUI not initialized');
            return;
        }
        this.settlementUI.showSettlementModal(this.currentSettlement);
    }

    /**
   * Hide settlement UI and return to game screen
   */
    hideSettlementUI() {
        if (!this.settlementUI) {
            console.error('SettlementUI not initialized');
            return;
        }
        this.settlementUI.hideSettlementModal();
    }

    /**
   * Enter a specific building
   * @param {string} buildingType - 'tavern', 'merchant', 'blacksmith', 'greathall'
   */
    enterBuilding(buildingType) {
        if (!this.currentSettlement) {
            console.error('No settlement active');
            return;
        }

        if (!this.settlementUI) {
            console.error('SettlementUI not initialized');
            return;
        }

        this.currentBuilding = buildingType;
        this.settlementUI.showBuildingModal(buildingType);
        gameState.addMessage(`You enter the ${this.getBuildingName(buildingType)}`, 'info');
    }

    /**
   * Exit building and return to settlement town map
   */
    exitBuilding() {
        if (!this.currentBuilding) {
            return;
        }

        if (!this.settlementUI) {
            console.error('SettlementUI not initialized');
            return;
        }

        gameState.addMessage(`You leave the ${this.getBuildingName(this.currentBuilding)}`, 'info');
        this.currentBuilding = null;
        this.settlementUI.hideBuildingModal();
    }

    /**
   * Get friendly name for building type
   * @param {string} buildingType
   * @returns {string}
   */
    getBuildingName(buildingType) {
        const names = {
            'tavern': 'Tavern',
            'merchant': 'General Goods',
            'blacksmith': 'Blacksmith',
            'greathall': 'Great Hall'
        };
        return names[buildingType] || buildingType;
    }

    /**
   * Check if player is currently in a settlement
   * @returns {boolean}
   */
    isInSettlement() {
        return this.currentSettlement !== null;
    }

    /**
   * Check if player is currently in a building
   * @returns {boolean}
   */
    isInBuilding() {
        return this.currentBuilding !== null;
    }
}

export default SettlementManager;
