// Settlement Management System
// Handles settlement entry, state management, and building interactions

import { gameState } from '../core/GameState.js';

class SettlementManager {
  constructor(worldGenerator, settlementUI = null) {
    this.worldGenerator = worldGenerator;
    this.settlementUI = settlementUI;
    this.currentSettlement = null;
    this.currentBuilding = null;
  }

  /**
   * Check if player can enter settlement at current position
   * @returns {Object|null} Settlement data if available, null otherwise
   */
  getSettlementAtPlayerPosition() {
    const playerPos = gameState.get('player.position');
    if (!playerPos) return null;

    // Get region coordinates
    const { regionX, regionY } = this.worldGenerator.getRegionCoords(playerPos.x, playerPos.y);
    const regionKey = `${regionX},${regionY}`;
    const region = gameState.get('world.generatedRegions')?.get(regionKey);

    if (!region) return null;

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
  enterSettlement() {
    const settlement = this.getSettlementAtPlayerPosition();

    if (!settlement) {
      gameState.addMessage("No settlement here.", 'info');
      return false;
    }

    // Store current settlement
    this.currentSettlement = settlement;
    gameState.set('ui.currentSettlement', settlement);

    // Generate NPCs if first visit
    if (!settlement.npcs || settlement.npcs.length === 0) {
      // TODO: Will be implemented in Phase 2 (NPC Generation)
      settlement.npcs = [];
      settlement.visitedAt = Date.now();
    }

    // Show settlement UI
    this.showSettlementUI();
    gameState.addMessage(`You enter ${settlement.name}`, 'success');

    return true;
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
    gameState.addMessage("You leave the settlement", 'info');
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
    if (!this.currentBuilding) return;

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
