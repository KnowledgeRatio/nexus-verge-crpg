/**
 * Settlement UI Component
 * Handles all settlement and building UI rendering
 */

class SettlementUI {
  constructor(settlementManager, merchantManager = null) {
    this.settlementManager = settlementManager;
    this.merchantManager = merchantManager;
    this.currentMerchant = null;
    this.merchantInventory = [];
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

    const settlement = this.settlementManager?.currentSettlement;
    if (!settlement) return;

    // Get NPCs for this building
    const buildingNPCs = settlement.npcs?.filter(npc => npc.building === buildingType) || [];

    if (buildingNPCs.length === 0) {
      contentEl.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h3>Welcome to the ${this.getBuildingName(buildingType)}</h3>
          <p>The building is empty...</p>
        </div>
      `;
      return;
    }

    // Render NPCs list
    let html = `
      <div class="building-interior">
        <h3>${this.getBuildingName(buildingType)}</h3>
        <p class="building-description">${this.getBuildingDescription(buildingType)}</p>

        <div class="npc-list">
    `;

    buildingNPCs.forEach(npc => {
      const questBadge = npc.offersQuest ? '<span class="quest-badge">!</span>' : '';
      html += `
        <div class="npc-card" data-npc-id="${npc.id}">
          <div class="npc-header">
            <h4>${npc.name}${questBadge}</h4>
            <span class="npc-role">${this.formatRole(npc.role)}</span>
          </div>
          <p class="npc-personality">${npc.personality}</p>
          <button class="btn-primary talk-btn" data-npc-id="${npc.id}">Talk</button>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    contentEl.innerHTML = html;

    // Add click handlers for Talk buttons
    contentEl.querySelectorAll('.talk-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const npcId = e.target.dataset.npcId;
        const npc = buildingNPCs.find(n => n.id === npcId);
        if (npc) {
          this.showNPCDialogue(npc);
        }
      });
    });
  }

  /**
   * Get building description text
   * @param {string} buildingType - Building type
   * @returns {string} Description
   */
  getBuildingDescription(buildingType) {
    const descriptions = {
      'tavern': 'The smell of roasted meat and ale fills the air. Locals gather around the hearth.',
      'merchant': 'Shelves lined with goods and supplies. The merchant eyes you with interest.',
      'blacksmith': 'The heat from the forge warms the room. Tools and weapons line the walls.',
      'greathall': 'A grand hall where the settlement\'s leaders conduct their business.'
    };
    return descriptions[buildingType] || '';
  }

  /**
   * Format role name for display
   * @param {string} role - Role ID
   * @returns {string} Formatted role
   */
  formatRole(role) {
    const roleNames = {
      'innkeeper': 'Innkeeper',
      'patron': 'Patron',
      'merchant': 'Merchant',
      'blacksmith': 'Blacksmith',
      'leader': 'Settlement Leader',
      'guard': 'Guard',
      'citizen': 'Citizen'
    };
    return roleNames[role] || role;
  }

  /**
   * Show NPC dialogue modal
   * @param {Object} npc - NPC data
   */
  showNPCDialogue(npc) {
    const modal = document.getElementById('npcDialogueModal');
    if (!modal) {
      console.error('NPC dialogue modal not found');
      return;
    }

    // Update modal content
    const nameEl = document.getElementById('npcDialogueName');
    const roleEl = document.getElementById('npcDialogueRole');
    const textEl = document.getElementById('npcDialogueText');
    const optionsEl = document.getElementById('npcDialogueOptions');

    if (nameEl) nameEl.textContent = npc.name;
    if (roleEl) roleEl.textContent = this.formatRole(npc.role);
    if (textEl) textEl.textContent = npc.dialogue.greeting;

    // Build dialogue options
    let optionsHTML = '';

    // Flavor dialogue option
    if (npc.dialogue.flavorDialogue && npc.dialogue.flavorDialogue.length > 0) {
      optionsHTML += `
        <button class="dialogue-option" data-action="flavor">
          💬 Chat
        </button>
      `;
    }

    // Quest option (if NPC offers quest)
    if (npc.offersQuest && npc.questIds && npc.questIds.length > 0) {
      optionsHTML += `
        <button class="dialogue-option quest-option" data-action="quest">
          ❗ Ask about work
        </button>
      `;
    }

    // Trade option (for merchants/blacksmiths)
    if (npc.role === 'merchant' || npc.role === 'blacksmith') {
      optionsHTML += `
        <button class="dialogue-option" data-action="trade">
          💰 Trade
        </button>
      `;
    }

    // Rest option (for innkeepers)
    if (npc.role === 'innkeeper') {
      optionsHTML += `
        <button class="dialogue-option" data-action="rest">
          🛏️ Rest
        </button>
      `;
    }

    // Goodbye option
    optionsHTML += `
      <button class="dialogue-option" data-action="goodbye">
        👋 Goodbye
      </button>
    `;

    if (optionsEl) optionsEl.innerHTML = optionsHTML;

    // Add event listeners
    modal.querySelectorAll('.dialogue-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handleDialogueOption(e.target.dataset.action, npc);
      });
    });

    // Show modal
    modal.style.display = 'flex';
  }

  /**
   * Handle dialogue option selection
   * @param {string} action - Action type
   * @param {Object} npc - NPC data
   */
  handleDialogueOption(action, npc) {
    const textEl = document.getElementById('npcDialogueText');
    if (!textEl) return;

    switch (action) {
      case 'flavor':
        // Show random flavor dialogue
        const flavorLine = npc.dialogue.flavorDialogue[
          Math.floor(Math.random() * npc.dialogue.flavorDialogue.length)
        ];
        textEl.textContent = flavorLine;
        break;

      case 'quest':
        // TODO: Phase 5 - Show quest offer
        textEl.textContent = npc.dialogue.questOffer || 'I might have some work for you... (Quest system coming soon)';
        break;

      case 'trade':
        // Open trading UI
        this.closeNPCDialogue();
        this.openTradingModal(npc);
        break;

      case 'rest':
        // Open rest menu
        this.closeNPCDialogue();
        import('../systems/RestManager.js').then(module => {
          module.default.openRestMenu();
        });
        break;

      case 'goodbye':
        textEl.textContent = npc.dialogue.goodbye;
        setTimeout(() => {
          this.closeNPCDialogue();
        }, 1000);
        break;
    }
  }

  /**
   * Close NPC dialogue modal
   */
  closeNPCDialogue() {
    const modal = document.getElementById('npcDialogueModal');
    if (modal) {
      modal.style.display = 'none';
    }
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
   * Open trading modal with merchant/blacksmith
   * @param {Object} npc - NPC merchant data
   */
  async openTradingModal(npc) {
    if (!this.merchantManager) {
      console.error('MerchantManager not initialized');
      return;
    }

    // Get character from gameState
    const character = window.gameState?.get('character');
    if (!character) {
      console.error('No character found');
      return;
    }

    // Store current merchant
    this.currentMerchant = npc;

    // Generate merchant inventory
    const settlement = this.settlementManager?.currentSettlement;
    const merchantType = npc.role; // 'merchant' or 'blacksmith'
    this.merchantInventory = await this.merchantManager.generateMerchantInventory(
      settlement,
      merchantType
    );

    // Update modal content
    const modal = document.getElementById('tradingModal');
    if (!modal) {
      console.error('Trading modal not found');
      return;
    }

    // Set merchant name and shop name
    const merchantNameEl = document.getElementById('tradingMerchantName');
    const shopNameEl = document.getElementById('tradingShopName');
    if (merchantNameEl) merchantNameEl.textContent = npc.name;
    if (shopNameEl) shopNameEl.textContent = npc.shopName || 'Shop';

    // Initialize state
    this.selectedItem = null;
    this.tradeMode = 'buy'; // 'buy' or 'sell'
    this.tradeQuantity = 1;

    // Render initial view
    this.renderTradingView();

    // Setup event listeners
    this.setupTradingEventListeners();

    // Show modal
    modal.style.display = 'flex';
  }

  /**
   * Setup trading modal event listeners
   */
  setupTradingEventListeners() {
    // Close button
    const closeBtn = document.getElementById('closeTradingBtn');
    if (closeBtn) {
      closeBtn.replaceWith(closeBtn.cloneNode(true)); // Remove old listeners
      document.getElementById('closeTradingBtn').addEventListener('click', () => {
        this.closeTradingModal();
      });
    }

    // Tab buttons
    const buyTab = document.getElementById('buyTab');
    const sellTab = document.getElementById('sellTab');
    if (buyTab) {
      buyTab.replaceWith(buyTab.cloneNode(true));
      document.getElementById('buyTab').addEventListener('click', () => {
        this.switchTradeMode('buy');
      });
    }
    if (sellTab) {
      sellTab.replaceWith(sellTab.cloneNode(true));
      document.getElementById('sellTab').addEventListener('click', () => {
        this.switchTradeMode('sell');
      });
    }

    // Quantity buttons
    const qtyDecrease = document.getElementById('qtyDecrease');
    const qtyIncrease = document.getElementById('qtyIncrease');
    const qtyInput = document.getElementById('qtyInput');

    if (qtyDecrease) {
      qtyDecrease.replaceWith(qtyDecrease.cloneNode(true));
      document.getElementById('qtyDecrease').addEventListener('click', () => {
        this.changeQuantity(-1);
      });
    }
    if (qtyIncrease) {
      qtyIncrease.replaceWith(qtyIncrease.cloneNode(true));
      document.getElementById('qtyIncrease').addEventListener('click', () => {
        this.changeQuantity(1);
      });
    }
    if (qtyInput) {
      qtyInput.replaceWith(qtyInput.cloneNode(true));
      document.getElementById('qtyInput').addEventListener('change', (e) => {
        this.setQuantity(parseInt(e.target.value) || 1);
      });
    }

    // Trade button
    const tradeBtn = document.getElementById('executeTrade');
    if (tradeBtn) {
      tradeBtn.replaceWith(tradeBtn.cloneNode(true));
      document.getElementById('executeTrade').addEventListener('click', () => {
        this.executeTrade();
      });
    }
  }

  /**
   * Render the trading view (items list + transaction panel)
   */
  renderTradingView() {
    // Update tab states
    const buyTab = document.getElementById('buyTab');
    const sellTab = document.getElementById('sellTab');
    if (buyTab) {
      buyTab.classList.toggle('active', this.tradeMode === 'buy');
    }
    if (sellTab) {
      sellTab.classList.toggle('active', this.tradeMode === 'sell');
    }

    // Render items list
    this.renderTradingItems();

    // Render transaction panel
    this.renderTransactionPanel();
  }

  /**
   * Render items list (merchant inventory or player inventory)
   */
  renderTradingItems() {
    const itemsListEl = document.getElementById('tradingItemsList');
    if (!itemsListEl) return;

    const character = window.gameState?.get('character');
    if (!character) return;

    const items = this.tradeMode === 'buy' ? this.merchantInventory : (character.inventory || []);

    if (items.length === 0) {
      itemsListEl.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <p>No items available</p>
        </div>
      `;
      return;
    }

    let html = '';
    items.forEach((item, index) => {
      const isSelected = this.selectedItem?.id === item.id;
      const price = this.tradeMode === 'buy'
        ? this.merchantManager.calculateBuyPrice(item, character)
        : this.merchantManager.calculateSellPrice(item, character);

      const stockText = this.tradeMode === 'buy' && item.stock !== undefined
        ? `Stock: ${item.stock}`
        : (item.quantity > 1 ? `Owned: ${item.quantity}` : '');

      html += `
        <div class="trading-item ${isSelected ? 'selected' : ''}" data-item-index="${index}">
          <div class="trading-item-icon">${this.getItemIcon(item.type)}</div>
          <div class="trading-item-details">
            <div class="trading-item-name">${item.name}</div>
            <div class="trading-item-description">${item.description || ''}</div>
            <div class="trading-item-stats">
              ${item.weight ? `<span class="trading-item-weight">⚖️ ${item.weight} lb</span>` : ''}
              ${item.rarity ? `<span class="item-rarity ${item.rarity}">${item.rarity}</span>` : ''}
            </div>
          </div>
          <div class="trading-item-price-info">
            <div class="trading-item-price">${price} gp</div>
            ${stockText ? `<div class="trading-item-stock">${stockText}</div>` : ''}
          </div>
        </div>
      `;
    });

    itemsListEl.innerHTML = html;

    // Add click handlers
    itemsListEl.querySelectorAll('.trading-item').forEach(itemEl => {
      itemEl.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.itemIndex);
        const item = items[index];
        this.selectItem(item);
      });
    });
  }

  /**
   * Render transaction panel (selected item + quantity + total)
   */
  renderTransactionPanel() {
    const selectedItemEl = document.getElementById('selectedItemDisplay');
    const qtyInput = document.getElementById('qtyInput');
    const totalPriceEl = document.getElementById('totalPrice');
    const tradeBtnEl = document.getElementById('executeTrade');

    const character = window.gameState?.get('character');
    if (!character) return;

    // Update selected item display
    if (!this.selectedItem) {
      if (selectedItemEl) {
        selectedItemEl.innerHTML = `<div class="no-selection">Select an item to trade</div>`;
      }
      if (qtyInput) qtyInput.disabled = true;
      if (tradeBtnEl) tradeBtnEl.disabled = true;
      if (totalPriceEl) totalPriceEl.textContent = '0 gp';
      return;
    }

    // Calculate prices
    const unitPrice = this.tradeMode === 'buy'
      ? this.merchantManager.calculateBuyPrice(this.selectedItem, character)
      : this.merchantManager.calculateSellPrice(this.selectedItem, character);
    const totalPrice = unitPrice * this.tradeQuantity;

    // Update selected item display
    if (selectedItemEl) {
      selectedItemEl.innerHTML = `
        <div class="selected-item-header">
          <div class="icon">${this.getItemIcon(this.selectedItem.type)}</div>
          <div class="selected-item-info">
            <h4>${this.selectedItem.name}</h4>
            <p>${this.selectedItem.description || ''}</p>
          </div>
        </div>
        <div class="selected-item-details">
          <div class="detail-row">
            <span class="label">Unit Price:</span>
            <span class="value">${unitPrice} gp</span>
          </div>
          ${this.selectedItem.weight ? `
            <div class="detail-row">
              <span class="label">Weight:</span>
              <span class="value">${this.selectedItem.weight} lb</span>
            </div>
          ` : ''}
          ${this.selectedItem.rarity ? `
            <div class="detail-row">
              <span class="label">Rarity:</span>
              <span class="value item-rarity ${this.selectedItem.rarity}">${this.selectedItem.rarity}</span>
            </div>
          ` : ''}
        </div>
      `;
    }

    // Update quantity input
    if (qtyInput) {
      qtyInput.disabled = false;
      qtyInput.value = this.tradeQuantity;
      qtyInput.max = this.tradeMode === 'buy'
        ? (this.selectedItem.stock || 99)
        : (this.selectedItem.quantity || 1);
    }

    // Update total price
    if (totalPriceEl) {
      totalPriceEl.textContent = `${totalPrice} gp`;
    }

    // Update trade button
    if (tradeBtnEl) {
      const canAfford = this.tradeMode === 'buy'
        ? character.gold >= totalPrice
        : true;
      const hasStock = this.tradeMode === 'buy'
        ? (this.selectedItem.stock || 0) >= this.tradeQuantity
        : (this.selectedItem.quantity || 0) >= this.tradeQuantity;

      tradeBtnEl.disabled = !canAfford || !hasStock;
      tradeBtnEl.textContent = this.tradeMode === 'buy' ? 'BUY' : 'SELL';
      tradeBtnEl.className = 'trade-btn' + (this.tradeMode === 'sell' ? ' sell-mode' : '');

      if (!canAfford) {
        tradeBtnEl.title = 'Not enough gold';
      } else if (!hasStock) {
        tradeBtnEl.title = this.tradeMode === 'buy' ? 'Out of stock' : 'Not enough items';
      } else {
        tradeBtnEl.title = '';
      }
    }

    // Update CHA hint
    const chaHintEl = document.getElementById('chaHint');
    if (chaHintEl) {
      const chaModifier = character.getAbilityModifier(character.abilities.cha);
      const chaPercent = Math.abs(chaModifier);
      const direction = this.tradeMode === 'buy' ? 'discount' : 'bonus';
      chaHintEl.innerHTML = `Your Charisma gives you a <span class="cha-bonus">${chaPercent}% ${direction}</span> on prices`;
    }
  }

  /**
   * Switch between buy and sell modes
   * @param {string} mode - 'buy' or 'sell'
   */
  switchTradeMode(mode) {
    this.tradeMode = mode;
    this.selectedItem = null;
    this.tradeQuantity = 1;
    this.renderTradingView();
  }

  /**
   * Select an item for trading
   * @param {Object} item - Item data
   */
  selectItem(item) {
    this.selectedItem = item;
    this.tradeQuantity = 1;
    this.renderTradingView();
  }

  /**
   * Change quantity by delta
   * @param {number} delta - Amount to change (-1 or +1)
   */
  changeQuantity(delta) {
    if (!this.selectedItem) return;

    const maxQty = this.tradeMode === 'buy'
      ? (this.selectedItem.stock || 99)
      : (this.selectedItem.quantity || 1);

    this.tradeQuantity = Math.max(1, Math.min(maxQty, this.tradeQuantity + delta));
    this.renderTransactionPanel();
  }

  /**
   * Set quantity to specific value
   * @param {number} qty - Quantity value
   */
  setQuantity(qty) {
    if (!this.selectedItem) return;

    const maxQty = this.tradeMode === 'buy'
      ? (this.selectedItem.stock || 99)
      : (this.selectedItem.quantity || 1);

    this.tradeQuantity = Math.max(1, Math.min(maxQty, qty));
    this.renderTransactionPanel();
  }

  /**
   * Execute the trade (buy or sell)
   */
  executeTrade() {
    if (!this.selectedItem || !this.merchantManager) return;

    const character = window.gameState?.get('character');
    if (!character) return;

    try {
      let result;
      if (this.tradeMode === 'buy') {
        result = this.merchantManager.buyItem(this.selectedItem, character, this.tradeQuantity);
      } else {
        result = this.merchantManager.sellItem(this.selectedItem, character, this.tradeQuantity);
      }

      if (result.success) {
        // Add message to log
        const action = this.tradeMode === 'buy' ? 'Bought' : 'Sold';
        const message = `${action} ${this.tradeQuantity}x ${this.selectedItem.name} for ${result.totalCost} gp`;
        window.gameState?.addMessage(message, 'success');

        // Update merchant inventory stock
        if (this.tradeMode === 'buy' && this.selectedItem.stock !== undefined) {
          this.selectedItem.stock -= this.tradeQuantity;
        }

        // Reset selection
        this.selectedItem = null;
        this.tradeQuantity = 1;

        // Re-render view
        this.renderTradingView();

        // Update HUD
        if (window.game?.updateHUD) {
          window.game.updateHUD();
        }
      } else {
        // Show error message
        window.gameState?.addMessage(result.error || 'Trade failed', 'combat');
      }
    } catch (error) {
      console.error('Trade failed:', error);
      window.gameState?.addMessage('Trade failed: ' + error.message, 'combat');
    }
  }

  /**
   * Close trading modal
   */
  closeTradingModal() {
    const modal = document.getElementById('tradingModal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.currentMerchant = null;
    this.merchantInventory = [];
    this.selectedItem = null;
  }

  /**
   * Get icon for item type
   * @param {string} type - Item type
   * @returns {string} Emoji icon
   */
  getItemIcon(type) {
    const icons = {
      'weapon': '⚔️',
      'armor': '🛡️',
      'consumable': '🧪',
      'misc': '📦',
      'tool': '🔧',
      'shield': '🛡️'
    };
    return icons[type] || '📦';
  }

}

export default SettlementUI;
