/**
 * Settlement UI Component
 * Handles all settlement and building UI rendering
 */

import { gameState } from '../core/GameState.js';

class SettlementUI {
  constructor(settlementManager) {
    this.settlementManager = settlementManager;
    this.initializeEventListeners();
  }

  /**
   * Initialize all event listeners for settlement UI
   */
  initializeEventListeners() {
    // Close settlement modal button
    const closeSettlementBtn = document.getElementById('closeSettlementBtn');
    if (closeSettlementBtn) {
      closeSettlementBtn.addEventListener('click', () => {
        this.settlementManager.exitSettlement();
      });
    }

    // Leave settlement button
    const leaveSettlementBtn = document.getElementById('leaveSettlementBtn');
    if (leaveSettlementBtn) {
      leaveSettlementBtn.addEventListener('click', () => {
        this.settlementManager.exitSettlement();
      });
    }

    // Building enter buttons
    document.querySelectorAll('.building .enter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const building = e.target.closest('.building');
        if (building) {
          const buildingType = building.dataset.building;
          this.settlementManager.enterBuilding(buildingType);
        }
      });
    });

    // Close building modal button
    const closeBuildingBtn = document.getElementById('closeBuildingBtn');
    if (closeBuildingBtn) {
      closeBuildingBtn.addEventListener('click', () => {
        this.settlementManager.exitBuilding();
      });
    }

    // Leave building button
    const leaveBuildingBtn = document.getElementById('leaveBuildingBtn');
    if (leaveBuildingBtn) {
      leaveBuildingBtn.addEventListener('click', () => {
        this.settlementManager.exitBuilding();
      });
    }

    console.log('🏘️ Settlement UI event listeners initialized');
  }

  /**
   * Show settlement town map modal
   * @param {Object} settlement - Settlement data
   */
  showSettlementModal(settlement) {
    // Hide game screen
    const gameScreen = document.getElementById('gameScreen');
    if (gameScreen) gameScreen.style.display = 'none';

    // Show settlement modal
    const settlementModal = document.getElementById('settlementModal');
    if (!settlementModal) {
      console.error('Settlement modal not found in HTML');
      return;
    }

    settlementModal.style.display = 'flex';

    // Update settlement info
    this.renderSettlementInfo(settlement);
  }

  /**
   * Hide settlement modal and return to game screen
   */
  hideSettlementModal() {
    // Hide settlement modal
    const settlementModal = document.getElementById('settlementModal');
    if (settlementModal) settlementModal.style.display = 'none';

    // Hide any open building interiors
    const buildingModal = document.getElementById('buildingModal');
    if (buildingModal) buildingModal.style.display = 'none';

    // Show game screen
    const gameScreen = document.getElementById('gameScreen');
    if (gameScreen) gameScreen.style.display = 'flex';
  }

  /**
   * Render settlement information (name, type, population)
   * @param {Object} settlement - Settlement data
   */
  renderSettlementInfo(settlement) {
    if (!settlement) return;

    const nameEl = document.getElementById('settlementName');
    const typeEl = document.getElementById('settlementType');

    if (nameEl) nameEl.textContent = settlement.name;
    if (typeEl) {
      const type = settlement.settlementType || 'village';
      typeEl.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    }

    const popEl = document.getElementById('settlementPopulation');
    if (popEl && settlement.population) {
      popEl.textContent = `Population: ${settlement.population}`;
    }
  }

  /**
   * Show building interior modal
   * @param {string} buildingType - Type of building ('tavern', 'merchant', etc.)
   */
  showBuildingModal(buildingType) {
    const buildingModal = document.getElementById('buildingModal');
    if (!buildingModal) {
      console.error('Building modal not found in HTML');
      return;
    }

    // Hide settlement town map
    const settlementModal = document.getElementById('settlementModal');
    if (settlementModal) settlementModal.style.display = 'none';

    buildingModal.style.display = 'flex';

    // Update building title
    const titleEl = document.getElementById('buildingTitle');
    if (titleEl) titleEl.textContent = this.getBuildingName(buildingType);

    // Render building-specific content
    this.renderBuildingContent(buildingType);
  }

  /**
   * Hide building modal and return to settlement town map
   */
  hideBuildingModal() {
    // Hide building modal
    const buildingModal = document.getElementById('buildingModal');
    if (buildingModal) buildingModal.style.display = 'none';

    // Show settlement town map again
    const settlementModal = document.getElementById('settlementModal');
    if (settlementModal) settlementModal.style.display = 'flex';
  }

  /**
   * Render building-specific content
   * @param {string} buildingType - Type of building
   */
  renderBuildingContent(buildingType) {
    const contentEl = document.getElementById('buildingContent');
    if (!contentEl) return;

    // TODO: Phase 3 - Implement building interiors with NPCs
    // For now, just show placeholder
    contentEl.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h3>Welcome to the ${this.getBuildingName(buildingType)}</h3>
        <p>Building interior coming soon...</p>
        <p style="margin-top: 20px; color: #888;">
          (Phase 3: NPC interactions, trading, quest offers)
        </p>
      </div>
    `;
  }

  /**
   * Get friendly name for building type
   * @param {string} buildingType - Building type ID
   * @returns {string} Display name
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
   * Render NPCs in building (Phase 3)
   * @param {string} buildingType - Building type
   * @param {Array} npcs - NPCs in this building
   */
  renderNPCs(buildingType, npcs) {
    // TODO: Phase 3 implementation
    // Will render NPC list with click handlers for dialogue
  }

  /**
   * Show NPC dialogue modal (Phase 3)
   * @param {Object} npc - NPC data
   */
  showNPCDialogue(npc) {
    // TODO: Phase 3 implementation
    // Will show dialogue modal with quest options
  }
}

export default SettlementUI;
