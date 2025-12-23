/**
 * Nexus Verge - Main Entry Point
 * Bootstraps the application and handles screen transitions
 */

import { gameState } from './core/GameState.js';
import { generateSeedString } from './utils/rng.js';
import { CharacterCreationUI } from './ui/CharacterCreation.js';
import SettlementUI from './ui/SettlementUI.js';
import WorldGenerator from './systems/WorldGenerator.js';
import MapRenderer from './rendering/MapRenderer.js';
import Player from './systems/Player.js';
import CombatManager from './systems/CombatManager.js';
import restManager from './systems/RestManager.js';
import saveManager from './systems/SaveManager.js';
import SettlementManager from './systems/SettlementManager.js';
import NPCGenerator from './systems/NPCGenerator.js';
import QuestGenerator from './systems/QuestGenerator.js';
import QuestManager from './systems/QuestManager.js';
import LootManager from './systems/LootManager.js';

class Game {
    constructor() {
        this.characterCreationUI = null;
        this.settlementUI = null;
        this.currentScreen = null;

        // Game systems (initialized when game starts)
        this.worldGenerator = null;
        this.mapRenderer = null;
        this.player = null;
        this.settlementManager = null;

        // NPC and Quest systems
        this.npcGenerator = null;
        this.questGenerator = null;
        this.questManager = null;

        // Loot system
        this.lootManager = null;

        // Combat systems
        this.combatManager = null;
        this.combatRenderer = null;

        // Game loop
        this.gameLoopId = null;
        this.lastFrameTime = 0;
    }

    /**
     * Initialize the game
     */
    async init() {
        console.log('🎮 Nexus Verge - Starting...');

        // Show main menu
        this.showScreen('mainMenu');

        // Bind main menu buttons
        this.bindMainMenuButtons();

        // Subscribe to screen changes
        gameState.subscribe('ui.currentScreen', (screen) => {
            this.showScreen(screen);
        });

        // Rest modal handled by RestManager directly via 'R' key in Player.js

        // Subscribe to dev mode changes
        gameState.subscribe('devMode', (isDevMode) => {
            this.updateDevModeIndicator(isDevMode);
        });

        console.log('✅ Game initialized');
    }

    /**
     * Show a specific screen
     */
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show requested screen
        const screen = document.getElementById(`${screenName}Screen`) ||
                      document.getElementById(screenName);

        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenName;
            console.log(`📺 Showing screen: ${screenName}`);

            // Initialize screen-specific content
            if (screenName === 'characterCreation') {
                this.initCharacterCreation();
            } else if (screenName === 'game') {
                this.initGameScreen();
            } else if (screenName === 'combat' || screenName === 'combatScreen') {
                this.initCombatScreen();
            }
        } else {
            console.error(`Screen not found: ${screenName}`);
        }
    }

    /**
     * Bind main menu button handlers
     */
    bindMainMenuButtons() {
        // Dev Mode Toggle
        const devModeBtn = document.getElementById('devModeBtn');
        if (devModeBtn) {
            devModeBtn.addEventListener('click', () => {
                const isDevMode = gameState.toggleDevMode();
                devModeBtn.textContent = `Dev Mode: ${isDevMode ? 'ON' : 'OFF'}`;
                devModeBtn.classList.toggle('primary', isDevMode);
            });
        }

        const newGameBtn = document.getElementById('newGameBtn');
        const loadGameBtn = document.getElementById('loadGameBtn');
        const helpBtn = document.getElementById('helpBtn');

        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                this.showScreen('newGameScreen');
                this.bindNewGameButtons();
            });
        }

        if (loadGameBtn) {
            loadGameBtn.addEventListener('click', () => {
                this.showLoadGameScreen();
            });
        }

        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                this.showHelpScreen();
            });
        }
    }

    /**
     * Bind new game setup buttons
     */
    bindNewGameButtons() {
        const randomSeedBtn = document.getElementById('randomSeedBtn');
        const startGameBtn = document.getElementById('startGameBtn');
        const backToMenuBtn = document.getElementById('backToMenuBtn');
        const seedInput = document.getElementById('seedInput');

        if (randomSeedBtn) {
            randomSeedBtn.addEventListener('click', () => {
                seedInput.value = generateSeedString();
            });
        }

        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                this.startNewGame();
            });
        }

        if (backToMenuBtn) {
            backToMenuBtn.addEventListener('click', () => {
                this.showScreen('mainMenu');
            });
        }

        // Generate initial seed if empty
        if (!seedInput.value) {
            seedInput.value = generateSeedString();
        }
    }

    /**
     * Start a new game
     */
    startNewGame() {
        const seed = document.getElementById('seedInput').value.trim();
        const mapSize = document.getElementById('mapSize').value;
        const difficulty = document.getElementById('difficulty').value;
        const campaign = document.getElementById('campaign').value;

        if (!seed) {
            alert('Please enter or generate a seed.');
            return;
        }

        console.log('🌱 Starting new game:', { seed, mapSize, difficulty, campaign });

        // Initialize game state
        gameState.initNewGame(seed, {
            mapSize,
            difficulty,
            campaignId: campaign
        });

        // Move to character creation
        this.showScreen('characterCreation');
    }

    /**
     * Initialize character creation
     */
    async initCharacterCreation() {
        if (!this.characterCreationUI) {
            this.characterCreationUI = new CharacterCreationUI();
        }
        await this.characterCreationUI.init();
    }

    /**
     * Initialize game screen
     */
    async initGameScreen() {
        console.log('🎮 Initializing game screen...');

        const character = gameState.get('character');
        if (!character) {
            console.error('No character found!');
            this.showScreen('mainMenu');
            return;
        }

        // Update HUD
        this.updateHUD(character);

        // Initialize game systems
        const worldConfig = gameState.get('worldConfig');
        const seed = gameState.get('seed');

        if (!this.worldGenerator) {
            console.log('🌍 Initializing world generator...');
            this.worldGenerator = new WorldGenerator(seed, worldConfig);
        }

        if (!this.mapRenderer) {
            console.log('🎨 Initializing map renderer...');
            this.mapRenderer = new MapRenderer('gameCanvas', {
                tileWidth: 12,
                tileHeight: 16,
                viewportWidth: 80,
                viewportHeight: 40
            });
        }

        if (!this.settlementUI) {
            console.log('🏘️ Initializing settlement UI...');
            this.settlementUI = new SettlementUI(null); // Will set manager reference after creation
        }

        if (!this.npcGenerator) {
            console.log('👥 Initializing NPC generator...');
            this.npcGenerator = new NPCGenerator(seed);
            await this.npcGenerator.loadData();
        }

        if (!this.questGenerator) {
            console.log('📜 Initializing quest generator...');
            this.questGenerator = new QuestGenerator(seed);
            await this.questGenerator.loadData();
        }

        if (!this.questManager) {
            console.log('📜 Initializing quest manager...');
            this.questManager = new QuestManager(this.questGenerator);
            await this.questManager.initialize();
        }

        if (!this.lootManager) {
            console.log('💰 Initializing loot manager...');
            this.lootManager = new LootManager(seed);
            await this.lootManager.loadData();
            // Make lootManager globally accessible for combat
            window.lootManager = this.lootManager;
        }

        if (!this.settlementManager) {
            console.log('🏘️ Initializing settlement system...');
            this.settlementManager = new SettlementManager(
                this.worldGenerator,
                this.settlementUI,
                this.npcGenerator,
                this.questGenerator,
                this.questManager
            );
            this.settlementUI.settlementManager = this.settlementManager; // Set circular reference
        }

        if (!this.player) {
            console.log('👤 Initializing player...');
            this.player = new Player(this.worldGenerator, this.mapRenderer, this.settlementManager);
            await this.player.spawn();
        }

        // Add welcome messages
        gameState.addMessage(`Welcome to Nexus Verge, ${character.name}!`, 'success');
        gameState.addMessage(`You are a Level ${character.level} ${character.race.name} ${character.class.displayName || character.class.name}.`, 'info');
        gameState.addMessage('Use WASD or Arrow keys to move.', 'info');

        // Subscribe to messages
        this.setupMessageLog();

        // Setup Quick Stats
        this.setupQuickStats();

        // Setup Rest System
        this.setupRestSystem();

        // Setup Save/Load System
        this.setupSaveLoadSystem();

        // Setup Quest System
        this.setupQuestSystem();

        // Setup World Map System
        this.setupWorldMap();

        // Setup Character Sheet System
        this.setupCharacterSheet();

        // Setup Inventory System
        this.setupInventory();

        // Note: Settlement UI event listeners are initialized in SettlementUI constructor

        // Start playtime tracking
        gameState.startPlaytimeTracking();

        // Start game loop
        this.startGameLoop();

        console.log('✅ Game initialized successfully');
    }

    /**
     * Initialize combat screen
     */
    async initCombatScreen() {
        console.log('⚔️ Initializing combat screen...');

        // Initialize combat manager if needed
        if (!this.combatManager) {
            this.combatManager = new CombatManager();
        }

        // Get pending combat data
        const pendingCombat = gameState.get('ui.pendingCombat');
        if (!pendingCombat || !pendingCombat.enemies) {
            console.error('No pending combat data!');
            gameState.set('ui.currentScreen', 'game');
            return;
        }

        // Start combat
        const player = gameState.get('character');
        await this.combatManager.startCombat(player, pendingCombat.enemies);

        // Clear pending combat
        gameState.set('ui.pendingCombat', null);

        // Setup combat UI
        this.setupCombatUI();

        console.log('✅ Combat screen initialized');
    }

    /**
     * Action selection state
     */
    selectedAction = null;

    /**
     * Setup combat UI elements
     */
    setupCombatUI() {
        // Setup combat log
        const combatLog = document.getElementById('combatLog');
        if (combatLog) {
            gameState.subscribe('ui.messageLog', (messages) => {
                const recent = messages.slice(-15);
                combatLog.innerHTML = recent.map(msg => {
                    const className = `message message-${msg.type || 'info'}`;
                    return `<div class="${className}">${msg.text}</div>`;
                }).join('');
                combatLog.scrollTop = combatLog.scrollHeight;
            });
        }

        // Subscribe to combat state updates
        gameState.subscribe('combat', (combatState) => {
            if (!combatState || !combatState.active) return;
            this.renderCombatScreen(combatState);
        });

        // Initial render
        const combatState = gameState.get('combat');
        if (combatState) {
            this.renderCombatScreen(combatState);
        }

        // Expose handleTargetClick to window for onclick handlers
        window.game = this;
    }

    /**
     * Render full combat screen
     */
    renderCombatScreen(combatState) {
        // Update round number
        const roundEl = document.getElementById('roundNumber');
        if (roundEl) {
            roundEl.textContent = combatState.round;
        }

        // Render combatants
        this.renderCombatants(combatState);

        // Render turn order
        this.renderTurnOrder(combatState);

        // Render actions
        this.renderCombatActions(combatState);
    }

    /**
     * Render combatant cards
     */
    renderCombatants(combatState) {
        const playerDiv = document.getElementById('playerCombatants');
        const enemyDiv = document.getElementById('enemyCombatants');

        if (!playerDiv || !enemyDiv || !combatState) return;

        const currentTurn = combatState.currentTurn;

        // Render player combatants
        const playerCombatants = combatState.combatants.filter(c => c.team === 'player');
        playerDiv.innerHTML = playerCombatants.map(c => {
            const conditionsDisplay = c.conditions && c.conditions.length > 0
                ? `<div class="combatant-conditions" title="${c.conditions.map(cond => `${cond.icon} ${cond.type}`).join(', ')}">${c.conditions.map(cond => cond.icon).join(' ')}</div>`
                : '';
            return `
                <div class="combatant-card ${c.id === currentTurn ? 'current-turn' : ''} ${c.hp <= 0 ? 'dead' : ''}">
                    <div class="combatant-name">${c.name}</div>
                    <div class="combatant-hp">HP: ${c.hp}/${c.maxHP}</div>
                    <div class="hp-bar">
                        <div class="hp-fill" style="width: ${(c.hp/c.maxHP)*100}%"></div>
                    </div>
                    <div class="combatant-ac">AC: ${c.ac}</div>
                    ${conditionsDisplay}
                </div>
            `;
        }).join('');

        // Render enemy combatants (clickable for targeting)
        const enemyCombatants = combatState.combatants.filter(c => c.team === 'enemy');
        enemyDiv.innerHTML = enemyCombatants.map(c => {
            const conditionsDisplay = c.conditions && c.conditions.length > 0
                ? `<div class="combatant-conditions" title="${c.conditions.map(cond => `${cond.icon} ${cond.type}`).join(', ')}">${c.conditions.map(cond => cond.icon).join(' ')}</div>`
                : '';
            return `
                <div class="combatant-card ${c.id === currentTurn ? 'current-turn' : ''} ${c.hp <= 0 ? 'dead' : ''}"
                     data-combatant-id="${c.id}"
                     onclick="window.game.handleTargetClick('${c.id}')">
                    <div class="combatant-name">${c.name}</div>
                    <div class="combatant-hp">HP: ${c.hp}/${c.maxHP}</div>
                    <div class="hp-bar">
                        <div class="hp-fill" style="width: ${(c.hp/c.maxHP)*100}%"></div>
                    </div>
                    <div class="combatant-ac">AC: ${c.ac}</div>
                    ${conditionsDisplay}
                </div>
            `;
        }).join('');
    }

    /**
     * Render turn order
     */
    renderTurnOrder(combatState) {
        const turnOrderEl = document.getElementById('turnOrder');
        if (!turnOrderEl || !this.combatManager) return;

        const turnOrder = this.combatManager.turnOrder || [];
        const currentCombatant = this.combatManager.getCurrentCombatant();

        turnOrderEl.innerHTML = turnOrder.map(c => {
            const isCurrent = c.id === currentCombatant?.id;
            const isDead = c.hp <= 0;
            const style = isCurrent ? 'background: var(--accent-color); color: var(--bg-primary); font-weight: bold; padding: 8px; border-radius: 4px;' :
                         isDead ? 'opacity: 0.5; text-decoration: line-through;' : 'padding: 8px;';
            const team = c.team === 'player' ? '🛡️' : '⚔️';
            return `<div style="${style} margin-bottom: 6px; font-family: var(--font-mono); font-size: 0.9rem;">
                ${team} ${c.name} (HP: ${c.hp}/${c.maxHP})
            </div>`;
        }).join('');
    }

    /**
     * Render combat actions
     */
    renderCombatActions(combatState) {
        const actionsEl = document.getElementById('combatActions');
        if (!actionsEl || !this.combatManager) return;

        const currentCombatant = this.combatManager.getCurrentCombatant();

        if (!currentCombatant || currentCombatant.team !== 'player') {
            // Enemy turn - show their action economy
            const enemyActions = currentCombatant?.actions || { action: 0, bonusAction: 0, reaction: 0 };
            actionsEl.innerHTML = `
                <p style="color: var(--text-secondary); text-align: center; padding: 10px;">
                    ${currentCombatant?.name || 'Enemy'} is taking their turn...
                </p>
                <div style="display: flex; gap: 15px; justify-content: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-top: 10px;">
                    <div style="text-align: center;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 3px;">Actions</div>
                        <div style="font-size: 18px; font-weight: bold; color: var(--accent);">${enemyActions.action}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 3px;">Bonus</div>
                        <div style="font-size: 18px; font-weight: bold; color: var(--secondary);">${enemyActions.bonusAction}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 3px;">Reactions</div>
                        <div style="font-size: 18px; font-weight: bold; color: var(--success);">${enemyActions.reaction}</div>
                    </div>
                </div>
            `;
            return;
        }

        // Player turn - show action buttons and economy
        const hasAction = currentCombatant.hasAction('action');
        const hasBonusAction = currentCombatant.hasAction('bonusAction');

        // Check if player has off-hand weapon equipped
        const character = gameState.get('character');
        const hasOffHandWeapon = character?.equipment?.offHand?.type === 'weapon';

        actionsEl.innerHTML = `
            <div style="display: flex; gap: 15px; justify-content: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 15px;">
                <div style="text-align: center;">
                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 3px;">Actions</div>
                    <div style="font-size: 18px; font-weight: bold; color: ${hasAction ? 'var(--accent)' : 'var(--text-muted)'};">${currentCombatant.actions.action}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 3px;">Bonus</div>
                    <div style="font-size: 18px; font-weight: bold; color: ${hasBonusAction ? 'var(--secondary)' : 'var(--text-muted)'};">${currentCombatant.actions.bonusAction}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 3px;">Reactions</div>
                    <div style="font-size: 18px; font-weight: bold; color: ${currentCombatant.actions.reaction > 0 ? 'var(--success)' : 'var(--text-muted)'};">${currentCombatant.actions.reaction}</div>
                </div>
            </div>
            <div class="action-buttons">
                <button class="action-btn" onclick="window.game.selectAction('attack')"
                        ${!hasAction ? 'disabled' : ''}>
                    ⚔️ Attack
                </button>
                ${hasOffHandWeapon ? `
                    <button class="action-btn" onclick="window.game.selectAction('attackOffHand')"
                            ${!hasBonusAction ? 'disabled' : ''}>
                        ⚔️ Attack (Off-Hand)
                    </button>
                ` : ''}
                <button class="action-btn" onclick="window.game.selectAction('ability')"
                        ${!hasAction ? 'disabled' : ''}>
                    ✨ Ability
                </button>
                <button class="action-btn" onclick="window.game.selectAction('spell')"
                        ${!hasAction ? 'disabled' : ''}>
                    🔮 Spell
                </button>
                <button class="action-btn" onclick="window.game.selectAction('flee')">
                    🏃 Flee
                </button>
            </div>
            <button class="menu-btn" style="width: 100%; margin-top: 15px;"
                    onclick="window.game.combatManager.endTurn()">
                End Turn
            </button>
        `;
    }

    /**
     * Select an action
     */
    selectAction(actionType) {
        this.selectedAction = actionType;
        gameState.addMessage(`Select a target to ${actionType}`, 'info');

        if (actionType === 'flee') {
            this.combatManager.flee(this.combatManager.playerCombatant);
            this.selectedAction = null;
        }
    }

    /**
     * Handle target click
     */
    handleTargetClick(targetId) {
        console.log('🎯 Target clicked:', targetId);

        if (!this.combatManager || !this.combatManager.active) {
            console.log('⚠️ Combat not active');
            return;
        }

        const currentCombatant = this.combatManager.getCurrentCombatant();
        if (!currentCombatant || currentCombatant.team !== 'player') {
            gameState.addMessage("It's not your turn!", 'error');
            return;
        }

        const target = this.combatManager.enemyCombatants.find(e => e.id === targetId);
        if (!target || target.hp <= 0) {
            gameState.addMessage('Invalid target!', 'error');
            return;
        }

        // Default to attack if no action selected
        if (!this.selectedAction) {
            this.selectedAction = 'attack';
        }

        const attacker = this.combatManager.playerCombatant;

        switch(this.selectedAction) {
            case 'attack':
                this.combatManager.attack(attacker, target, 'mainHand');
                break;
            case 'attackOffHand':
                this.combatManager.attack(attacker, target, 'offHand');
                break;
            case 'ability':
                gameState.addMessage('Abilities not yet implemented', 'error');
                break;
            case 'spell':
                gameState.addMessage('Spells not yet implemented', 'error');
                break;
        }

        this.selectedAction = null;
    }


    /**
     * Update HUD with character info
     */
    updateHUD(character) {
        const charName = document.getElementById('charName');
        const charLevel = document.getElementById('charLevel');
        const hpDisplay = document.getElementById('hpDisplay');
        const acDisplay = document.getElementById('acDisplay');

        if (charName) charName.textContent = character.name;
        if (charLevel) charLevel.textContent = `Level ${character.level} ${character.class.displayName || character.class.name}`;
        if (hpDisplay) hpDisplay.textContent = `HP: ${character.currentHP}/${character.maxHP}`;
        if (acDisplay) acDisplay.textContent = `AC: ${character.ac}`;

        // Update dev mode indicator
        this.updateDevModeIndicator(gameState.get('devMode'));

        // Subscribe to character changes (entire object)
        // This fires when character is replaced via gameState.set('character', newChar)
        gameState.subscribe('character', (updatedChar) => {
            if (!updatedChar) return;
            if (charName) charName.textContent = updatedChar.name;
            if (charLevel) charLevel.textContent = `Level ${updatedChar.level} ${updatedChar.class.name}`;
            if (hpDisplay) hpDisplay.textContent = `HP: ${updatedChar.currentHP}/${updatedChar.maxHP}`;
            if (acDisplay) acDisplay.textContent = `AC: ${updatedChar.ac}`;
        });

        // Also subscribe to specific HP changes (for fine-grained updates via combat)
        gameState.subscribe('character.currentHP', (hp) => {
            const char = gameState.get('character');
            if (hpDisplay && char) {
                hpDisplay.textContent = `HP: ${hp}/${char.maxHP}`;
            }
        });
    }

    /**
     * Update dev mode indicator in HUD
     */
    updateDevModeIndicator(isDevMode) {
        const indicator = document.getElementById('devModeIndicator');
        if (indicator) {
            indicator.style.display = isDevMode ? 'inline' : 'none';
        }
    }

    /**
     * Show load game screen
     */
    showLoadGameScreen() {
        this.showScreen('loadGameScreen');
        this.renderLoadGameSlots();
    }

    /**
     * Render load game save slots (uses file import)
     */
    renderLoadGameSlots() {
        const slotsContainer = document.getElementById('saveSlots');
        if (!slotsContainer) return;

        slotsContainer.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <h3 style="margin-bottom: 20px;">📤 Import Save</h3>
                <p style="margin-bottom: 30px; color: var(--text-secondary);">
                    Upload a <strong>.json save file</strong> to continue your adventure
                </p>
                <input type="file" id="importSaveInputMenu" accept=".json"
                       style="display: none;"
                       onchange="window.game.importSaveFileFromMenu(event)">
                <button class="menu-btn" onclick="document.getElementById('importSaveInputMenu').click()"
                        style="margin: 0 auto; font-size: 18px; padding: 15px 40px;">
                    📤 Upload Save File
                </button>
                <p style="margin-top: 20px; font-size: 14px; color: var(--text-muted);">
                    Save files are created using the in-game save menu (press . or ESC during gameplay)
                </p>
            </div>
        `;
    }

    /**
     * Setup save/load system UI handlers
     */
    setupSaveLoadSystem() {
        // Tab switching for save/load modal
        const tabButtons = document.querySelectorAll('.saveload-tab-btn');
        tabButtons.forEach(btn => {
            // Disable in-game load tab; load is only available from main menu
            if (btn.dataset.tab === 'load') {
                btn.disabled = true;
                btn.title = 'Load from main menu only';
            } else {
                btn.addEventListener('click', () => {
                    this.switchSaveLoadTab(btn.dataset.tab);
                });
            }
        });

        // Period key (.) to open save/load menu (when in game screen)
        document.addEventListener('keydown', (e) => {
            if (e.key === '.' && this.currentScreen === 'game' && !gameState.get('combat')) {
                this.openSaveMenu();
            }
        });

        // ESC key to close any open modal (when in game screen)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentScreen === 'game' && !gameState.get('combat')) {
                this.handleEscapeKey();
            }
        });

        console.log('💾 Save/Load system initialized');
    }

    /**
     * Handle ESC key press - close open modals
     */
    handleEscapeKey() {
        // Check if any modal is currently open
        const modalIds = [
            'saveLoadModal',
            'questLogModal',
            'settlementModal',
            'restModal',
            'tradingModal',
            'buildingModal',
            'npcDialogueModal',
            'inventoryModal',
            'modalOverlay',
            'worldMapModal',
            'characterSheetModal'
        ];

        const openModals = modalIds
            .map(id => document.getElementById(id))
            .filter(modal => modal && modal.classList.contains('active'));

        if (openModals.length > 0) {
            // Close all open modals
            openModals.forEach(modal => {
                modal.classList.remove('active');
            });
        }
    }

    /**
     * Switch between save/load tabs
     */
    switchSaveLoadTab(tabName) {
        // In-game modal only supports saving; block load tab selection
        if (tabName === 'load') {
            gameState.addMessage('Load games from the main menu only.', 'warning');
            tabName = 'save';
        }

        // Update tab button active state
        document.querySelectorAll('.saveload-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content active state
        document.querySelectorAll('.saveload-tab-content').forEach(content => {
            const isActive = (tabName === 'save' && content.id === 'saveTab') ||
                            (tabName === 'load' && content.id === 'loadTab');
            content.classList.toggle('active', isActive);
        });

        // Render the appropriate slots
        if (tabName === 'save') {
            this.renderSaveSlots();
        } else if (tabName === 'load') {
            this.renderLoadSlots();
        }
    }

    /**
     * Setup quest system UI and event handlers
     */
    setupQuestSystem() {
        // Make quest manager globally accessible for UI
        window.questManager = this.questManager;

        // Quest Log Modal elements
        const questLogModal = document.getElementById('questLogModal');
        const closeQuestLogBtn = document.getElementById('closeQuestLogBtn');

        // Close button
        if (closeQuestLogBtn) {
            closeQuestLogBtn.addEventListener('click', () => {
                this.closeQuestLog();
            });
        }

        // Close on backdrop click
        if (questLogModal) {
            questLogModal.addEventListener('click', (e) => {
                if (e.target === questLogModal) {
                    this.closeQuestLog();
                }
            });
        }

        // Tab switching
        const tabButtons = document.querySelectorAll('.quest-tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchQuestTab(btn.dataset.tab);
            });
        });

        // Quest action buttons (delegated event handling)
        document.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('.quest-action-btn');
            if (!actionBtn) return;

            const action = actionBtn.dataset.action;
            const questItem = actionBtn.closest('.quest-item');
            if (!questItem) return;

            const questId = questItem.dataset.questId;

            switch (action) {
                case 'track':
                    this.trackQuest(questId);
                    break;
                case 'abandon':
                    this.abandonQuest(questId);
                    break;
                case 'complete':
                    this.completeQuest(questId);
                    break;
            }
        });

        // Subscribe to quest state changes
        gameState.subscribe('quests', (quests) => {
            this.updateQuestCounts(quests);
            this.renderCurrentQuestTab();
        });

        // Q key to open quest log (when not in combat)
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'q' || e.key === 'Q') && this.currentScreen === 'game' && !gameState.get('combat')) {
                this.openQuestLog();
            }
        });

        console.log('📜 Quest system initialized');
    }

    /**
     * Open quest log modal
     */
    openQuestLog() {
        const modal = document.getElementById('questLogModal');
        if (!modal) return;

        const quests = gameState.get('quests') || { active: [], completed: [], failed: [] };
        this.updateQuestCounts(quests);
        this.renderCurrentQuestTab();

        modal.classList.add('active');
    }

    /**
     * Close quest log modal
     */
    closeQuestLog() {
        const modal = document.getElementById('questLogModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Switch between quest tabs (active/completed/failed)
     */
    switchQuestTab(tabName) {
        // Update tab button active state
        document.querySelectorAll('.quest-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content active state
        document.querySelectorAll('.quest-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}QuestsTab`);
        });

        // Render selected tab
        this.renderQuestTab(tabName);
    }

    /**
     * Render current active quest tab
     */
    renderCurrentQuestTab() {
        const activeTab = document.querySelector('.quest-tab-btn.active');
        if (activeTab) {
            this.renderQuestTab(activeTab.dataset.tab);
        }
    }

    /**
     * Render specific quest tab
     */
    renderQuestTab(tabName) {
        const quests = gameState.get('quests') || { active: [], completed: [], failed: [] };
        const questList = document.getElementById(`${tabName}QuestsList`);
        if (!questList) return;

        const questArray = quests[tabName] || [];

        if (questArray.length === 0) {
            questList.innerHTML = '<div class="empty-message">No quests in this category.</div>';
            return;
        }

        questList.innerHTML = questArray.map(quest => this.renderQuestCard(quest, tabName)).join('');
    }

    /**
     * Render individual quest card HTML
     */
    renderQuestCard(quest, status) {
        const objectives = quest.objectives.map(obj => {
            const progress = obj.progress || 0;
            const required = obj.required || 1;
            const completed = obj.completed || false;
            const percentage = required > 0 ? (progress / required) * 100 : 0;

            return `
                <div class="objective-item ${completed ? 'completed' : ''}">
                    <span class="objective-checkbox">${completed ? '☑' : '☐'}</span>
                    <span class="objective-text">${obj.description}</span>
                    <span class="objective-progress">${progress}/${required}</span>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        const rewards = [];
        if (quest.rewards.xp) rewards.push(`${quest.rewards.xp} XP`);
        if (quest.rewards.gold) rewards.push(`${quest.rewards.gold} Gold`);
        if (quest.rewards.reputation) rewards.push(`+${quest.rewards.reputation.amount} Rep`);
        const rewardText = rewards.join(' | ');

        let actionButtons = '';
        if (status === 'active') {
            const allCompleted = quest.objectives.every(obj => obj.completed);
            actionButtons = `
                <div class="quest-actions">
                    <button class="quest-action-btn" data-action="track">Track</button>
                    ${allCompleted ? '<button class="quest-action-btn btn-success" data-action="complete">Complete</button>' : ''}
                    <button class="quest-action-btn btn-danger" data-action="abandon">Abandon</button>
                </div>
            `;
        }

        return `
            <div class="quest-item" data-quest-id="${quest.id}">
                <div class="quest-header">
                    <h3 class="quest-title">${quest.name}</h3>
                    <span class="quest-difficulty ${quest.difficulty}">${quest.difficulty}</span>
                </div>
                <p class="quest-description">${quest.description}</p>
                <div class="quest-objectives">
                    ${objectives}
                </div>
                <div class="quest-rewards">
                    🎁 ${rewardText}
                </div>
                ${actionButtons}
            </div>
        `;
    }

    /**
     * Update quest counts in tab buttons
     */
    updateQuestCounts(quests) {
        const activeCount = document.getElementById('activeQuestCount');
        const completedCount = document.getElementById('completedQuestCount');
        const failedCount = document.getElementById('failedQuestCount');

        if (activeCount) activeCount.textContent = `(${quests.active?.length || 0})`;
        if (completedCount) completedCount.textContent = `(${quests.completed?.length || 0})`;
        if (failedCount) failedCount.textContent = `(${quests.failed?.length || 0})`;
    }

    /**
     * Track quest (show marker on map - placeholder)
     */
    trackQuest(questId) {
        gameState.addMessage(`Now tracking quest: ${questId}`, 'info');
        // TODO: Add quest marker to map
    }

    /**
     * Abandon quest
     */
    abandonQuest(questId) {
        if (!confirm('Are you sure you want to abandon this quest?')) return;

        const result = this.questManager.abandonQuest(questId);
        if (result.success) {
            this.showQuestNotification('Quest Abandoned', result.message);
            this.renderCurrentQuestTab();
        } else {
            gameState.addMessage(result.message, 'error');
        }
    }

    /**
     * Complete quest
     */
    completeQuest(questId) {
        const result = this.questManager.completeQuest(questId);
        if (result.success) {
            this.showQuestNotification('Quest Completed!', result.message, 'success');
            this.renderCurrentQuestTab();
            this.updateHUD(gameState.get('character')); // Update XP/gold display
        } else {
            gameState.addMessage(result.message, 'error');
        }
    }

    /**
     * Show quest notification toast
     */
    showQuestNotification(title, message, type = 'info') {
        const toast = document.getElementById('questNotification');
        if (!toast) return;

        const titleEl = document.getElementById('toastTitle');
        const messageEl = document.getElementById('toastMessage');

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;

        toast.classList.add('show');

        // Auto-hide after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }

    /**
     * Setup world map system UI and event handlers
     */
    setupWorldMap() {
        // World Map Modal elements
        const worldMapModal = document.getElementById('worldMapModal');
        const closeWorldMapBtn = document.getElementById('closeWorldMapBtn');
        const worldMapCanvas = document.getElementById('worldMapCanvas');

        if (!worldMapCanvas) {
            console.error('World map canvas not found');
            return;
        }

        // Initialize canvas context
        this.worldMapCtx = worldMapCanvas.getContext('2d');
        this.worldMapZoom = 4; // 4 pixels per tile
        this.worldMapOffsetX = 0;
        this.worldMapOffsetY = 0;
        this.worldMapDragging = false;
        this.worldMapLastMouseX = 0;
        this.worldMapLastMouseY = 0;

        // Close button
        if (closeWorldMapBtn) {
            closeWorldMapBtn.addEventListener('click', () => {
                this.closeWorldMap();
            });
        }

        // Close on backdrop click
        if (worldMapModal) {
            worldMapModal.addEventListener('click', (e) => {
                if (e.target === worldMapModal) {
                    this.closeWorldMap();
                }
            });
        }

        // Canvas pan with mouse drag
        if (worldMapCanvas) {
            worldMapCanvas.addEventListener('mousedown', (e) => {
                this.worldMapDragging = true;
                this.worldMapLastMouseX = e.clientX;
                this.worldMapLastMouseY = e.clientY;
            });

            worldMapCanvas.addEventListener('mousemove', (e) => {
                if (this.worldMapDragging) {
                    const dx = e.clientX - this.worldMapLastMouseX;
                    const dy = e.clientY - this.worldMapLastMouseY;
                    this.worldMapOffsetX += dx;
                    this.worldMapOffsetY += dy;
                    this.worldMapLastMouseX = e.clientX;
                    this.worldMapLastMouseY = e.clientY;
                    this.renderWorldMap();
                }
            });

            worldMapCanvas.addEventListener('mouseup', () => {
                this.worldMapDragging = false;
            });

            worldMapCanvas.addEventListener('mouseleave', () => {
                this.worldMapDragging = false;
            });

            // Canvas zoom with mouse wheel
            worldMapCanvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -1 : 1;
                this.worldMapZoom = Math.max(1, Math.min(16, this.worldMapZoom + delta));
                this.renderWorldMap();
            });
        }

        // M key to open world map (when not in combat)
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'm' || e.key === 'M') && this.currentScreen === 'game' && !gameState.get('combat')) {
                this.openWorldMap();
            }
        });

        console.log('🗺️ World map system initialized');
    }

    /**
     * Open world map modal
     */
    openWorldMap() {
        const modal = document.getElementById('worldMapModal');
        if (!modal) return;

        modal.classList.add('active');

        // Wait for modal to be visible, then set canvas size and center
        requestAnimationFrame(() => {
            const canvas = document.getElementById('worldMapCanvas');
            const container = canvas.parentElement;
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;

            // Center on player position
            const playerPos = gameState.get('player.position');
            if (playerPos) {
                this.worldMapOffsetX = canvas.width / 2 - playerPos.x * this.worldMapZoom;
                this.worldMapOffsetY = canvas.height / 2 - playerPos.y * this.worldMapZoom;
            }

            this.renderWorldMap();
        });
    }

    /**
     * Close world map modal
     */
    closeWorldMap() {
        const modal = document.getElementById('worldMapModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Render the world map canvas
     */
    renderWorldMap() {
        const canvas = document.getElementById('worldMapCanvas');
        if (!canvas) return;

        // Set canvas size to match container
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        const ctx = this.worldMapCtx;
        const world = gameState.get('world');
        const playerPos = gameState.get('player.position');

        if (!world || !world.generatedRegions) {
            return;
        }

        // Clear canvas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Iterate through all generated regions
        world.generatedRegions.forEach((region, regionKey) => {
            const [regionX, regionY] = regionKey.split(',').map(Number);

            // Render each tile in the region (tiles are stored as 1D array)
            for (let localY = 0; localY < 32; localY++) {
                for (let localX = 0; localX < 32; localX++) {
                    const index = localY * 32 + localX;
                    const tile = region.tiles[index];
                    if (!tile) continue;

                    // Only render explored tiles
                    if (!tile.explored) continue;

                    const worldX = regionX * 32 + localX;
                    const worldY = regionY * 32 + localY;

                    const screenX = worldX * this.worldMapZoom + this.worldMapOffsetX;
                    const screenY = worldY * this.worldMapZoom + this.worldMapOffsetY;

                    // Skip if off-screen
                    if (screenX < -this.worldMapZoom || screenX > canvas.width ||
                        screenY < -this.worldMapZoom || screenY > canvas.height) {
                        continue;
                    }

                    // Get terrain color
                    const terrainColor = this.getTerrainColor(tile.terrain);

                    // Dim unexplored tiles
                    if (tile.visible) {
                        ctx.fillStyle = terrainColor;
                    } else {
                        ctx.fillStyle = this.dimColor(terrainColor, 0.5);
                    }

                    ctx.fillRect(screenX, screenY, this.worldMapZoom, this.worldMapZoom);

                    // Draw feature icons (settlements, sanctuaries)
                    if (tile.feature && this.worldMapZoom >= 3) {
                        if (tile.feature.type === 'settlement') {
                            ctx.fillStyle = '#8B0000';
                            ctx.fillRect(screenX, screenY, this.worldMapZoom, this.worldMapZoom);
                        } else if (tile.feature.type === 'sanctuary') {
                            ctx.fillStyle = '#FFD700';
                            ctx.fillRect(screenX + this.worldMapZoom / 4, screenY + this.worldMapZoom / 4,
                                       this.worldMapZoom / 2, this.worldMapZoom / 2);
                        }
                    }
                }
            }
        });

        // Draw player position
        if (playerPos) {
            const playerScreenX = playerPos.x * this.worldMapZoom + this.worldMapOffsetX;
            const playerScreenY = playerPos.y * this.worldMapZoom + this.worldMapOffsetY;

            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(playerScreenX + this.worldMapZoom / 2, playerScreenY + this.worldMapZoom / 2,
                   Math.max(3, this.worldMapZoom), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Get color for terrain type
     */
    getTerrainColor(terrain) {
        const colors = {
            grassland: '#90EE90',
            forest: '#228B22',
            hills: '#8B4513',
            mountains: '#808080',
            water: '#4682B4',
            ocean: '#000080',
            desert: '#FFD700',
            tundra: '#F0FFFF',
            swamp: '#556B2F',
            jungle: '#006400',
            plains: '#9ACD32',
            taiga: '#2F4F4F',
            savanna: '#DAA520',
            volcanic: '#8B0000',
            wasteland: '#696969',
            city: '#8B0000',
            town: '#8B4513',
            sanctuary: '#F0E68C'
        };
        return colors[terrain] || '#333333';
    }

    /**
     * Dim a hex color by a factor
     */
    dimColor(hexColor, factor) {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        const dimR = Math.floor(r * factor);
        const dimG = Math.floor(g * factor);
        const dimB = Math.floor(b * factor);

        return `rgb(${dimR}, ${dimG}, ${dimB})`;
    }

    /**
     * Setup Character Sheet System
     */
    setupCharacterSheet() {
        const modal = document.getElementById('characterSheetModal');
        const closeBtn = document.getElementById('closeCharacterSheetBtn');

        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeCharacterSheet();
            });
        }

        // C key to open character sheet (when not in combat)
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'c' || e.key === 'C') && this.currentScreen === 'game' && !gameState.get('combat')) {
                this.openCharacterSheet();
            }
        });

        console.log('📋 Character sheet system initialized');
    }

    /**
     * Open Character Sheet Modal
     */
    openCharacterSheet() {
        const modal = document.getElementById('characterSheetModal');
        if (!modal) return;

        modal.classList.add('active');
        this.renderCharacterSheet();
    }

    /**
     * Close Character Sheet Modal
     */
    closeCharacterSheet() {
        const modal = document.getElementById('characterSheetModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Render Complete Character Sheet
     */
    renderCharacterSheet() {
        const character = gameState.get('character');
        if (!character) return;

        const content = document.getElementById('characterSheetContent');
        if (!content) return;

        // Build character sheet HTML
        content.innerHTML = `
            <!-- Basic Info Section -->
            <div class="char-section full-width">
                <h3>Character Info</h3>
                <div class="char-row">
                    <span class="char-label">Name:</span>
                    <span class="char-value">${character.name}</span>
                </div>
                <div class="char-row">
                    <span class="char-label">Race:</span>
                    <span class="char-value">${character.race.name}</span>
                </div>
                <div class="char-row">
                    <span class="char-label">Class:</span>
                    <span class="char-value">${character.class.name}</span>
                </div>
                <div class="char-row">
                    <span class="char-label">Background:</span>
                    <span class="char-value">${character.background.name}</span>
                </div>
                <div class="char-row">
                    <span class="char-label">Level:</span>
                    <span class="char-value">${character.level}</span>
                </div>
                <div class="char-row">
                    <span class="char-label">Experience:</span>
                    <span class="char-value">${character.xp} XP</span>
                </div>
            </div>

            <!-- Ability Scores -->
            <div class="char-section full-width">
                <h3>Ability Scores</h3>
                <div class="ability-grid">
                    ${this.renderAbilityBox('STR', character.abilities.str, character.abilityModifiers.str)}
                    ${this.renderAbilityBox('DEX', character.abilities.dex, character.abilityModifiers.dex)}
                    ${this.renderAbilityBox('CON', character.abilities.con, character.abilityModifiers.con)}
                    ${this.renderAbilityBox('INT', character.abilities.int, character.abilityModifiers.int)}
                    ${this.renderAbilityBox('WIS', character.abilities.wis, character.abilityModifiers.wis)}
                    ${this.renderAbilityBox('CHA', character.abilities.cha, character.abilityModifiers.cha)}
                </div>
            </div>

            <!-- Combat Stats -->
            <div class="char-section">
                <h3>Combat Stats</h3>
                <div class="char-row">
                    <span class="char-label">Armor Class:</span>
                    <span class="char-value">${character.ac}</span>
                </div>
                <div class="char-row">
                    <span class="char-label">Hit Points:</span>
                    <span class="char-value">${character.currentHP} / ${character.maxHP}</span>
                </div>
                <div class="char-row">
                    <span class="char-label">Hit Dice:</span>
                    <span class="char-value">${character.hitDice.current}d${character.hitDice.size}</span>
                </div>
                <div class="char-row">
                    <span class="char-label">Initiative:</span>
                    <span class="char-value">${character.initiative >= 0 ? '+' : ''}${character.initiative || 0}</span>
                </div>
                <div class="char-row">
                    <span class="char-label">Speed:</span>
                    <span class="char-value">${character.speed} ft</span>
                </div>
                <div class="char-row">
                    <span class="char-label">Proficiency Bonus:</span>
                    <span class="char-value">+${character.proficiencyBonus}</span>
                </div>
                ${character.equipment.mainHand ? `
                <div class="char-row">
                    <span class="char-label">Main Hand Attack:</span>
                    <span class="char-value">${character.mainHandAttackBonus >= 0 ? '+' : ''}${character.mainHandAttackBonus || 0} (${character.equipment.mainHand.damage})</span>
                </div>
                ` : ''}
                ${character.equipment.offHand && character.equipment.offHand.type === 'weapon' ? `
                <div class="char-row">
                    <span class="char-label">Off Hand Attack:</span>
                    <span class="char-value">${character.offHandAttackBonus >= 0 ? '+' : ''}${character.offHandAttackBonus || 0} (${character.equipment.offHand.damage})</span>
                </div>
                ` : ''}
            </div>

            <!-- Saving Throws -->
            <div class="char-section">
                <h3>Saving Throws</h3>
                <div class="saving-throws-grid">
                    ${this.renderSavingThrow('STR', character.savingThrows.str.bonus, character.savingThrows.str.proficient)}
                    ${this.renderSavingThrow('DEX', character.savingThrows.dex.bonus, character.savingThrows.dex.proficient)}
                    ${this.renderSavingThrow('CON', character.savingThrows.con.bonus, character.savingThrows.con.proficient)}
                    ${this.renderSavingThrow('INT', character.savingThrows.int.bonus, character.savingThrows.int.proficient)}
                    ${this.renderSavingThrow('WIS', character.savingThrows.wis.bonus, character.savingThrows.wis.proficient)}
                    ${this.renderSavingThrow('CHA', character.savingThrows.cha.bonus, character.savingThrows.cha.proficient)}
                </div>
            </div>

            <!-- Skills -->
            <div class="char-section full-width">
                <h3>Skills</h3>
                <div class="skills-grid">
                    ${this.renderAllSkills(character)}
                </div>
            </div>

            <!-- Equipment -->
            <div class="char-section">
                <h3>Equipment</h3>
                <div class="equipment-grid">
                    ${this.renderEquipmentSlot('Main Hand', character.equipment.mainHand)}
                    ${this.renderEquipmentSlot('Off Hand', character.equipment.offHand)}
                    ${this.renderEquipmentSlot('Armor', character.equipment.armor)}
                    ${this.renderEquipmentSlot('Shield', character.equipment.shield)}
                    ${this.renderEquipmentSlot('Helmet', character.equipment.helmet)}
                    ${this.renderEquipmentSlot('Artifact', character.equipment.artifact)}
                </div>
            </div>

            <!-- Proficiencies -->
            <div class="char-section">
                <h3>Proficiencies</h3>
                <div class="char-row">
                    <span class="char-label">Armor:</span>
                    <span class="char-value">${character.proficiencies.armor.join(', ') || 'None'}</span>
                </div>
                <div class="char-row">
                    <span class="char-label">Weapons:</span>
                    <span class="char-value">${character.proficiencies.weapons.join(', ') || 'None'}</span>
                </div>
                <div class="char-row">
                    <span class="char-label">Tools:</span>
                    <span class="char-value">${character.proficiencies.tools.join(', ') || 'None'}</span>
                </div>
                <div class="char-row">
                    <span class="char-label">Languages:</span>
                    <span class="char-value">${character.proficiencies.languages.join(', ') || 'None'}</span>
                </div>
            </div>

            <!-- Weapon Masteries -->
            ${character.weaponMasteries && character.weaponMasteries.length > 0 ? `
            <div class="char-section full-width">
                <h3>Weapon Masteries</h3>
                <div class="masteries-list">
                    ${this.renderWeaponMasteries(character)}
                </div>
            </div>
            ` : ''}

            <!-- Class Features -->
            <div class="char-section full-width">
                <h3>Class Features</h3>
                <ul class="features-list">
                    ${this.renderClassFeatures(character)}
                </ul>
            </div>

            <!-- Racial Traits -->
            <div class="char-section full-width">
                <h3>Racial Traits</h3>
                <ul class="features-list">
                    ${this.renderRacialTraits(character)}
                </ul>
            </div>

            ${character.spellcasting && character.spellcasting.spellcastingAbility ? `
            <!-- Spellcasting -->
            <div class="char-section full-width">
                <h3>Spellcasting</h3>
                <div class="char-row">
                    <span class="char-label">Spellcasting Ability:</span>
                    <span class="char-value">${character.spellcasting.spellcastingAbility.toUpperCase()}</span>
                </div>
                <div class="char-row">
                    <span class="char-label">Spell Save DC:</span>
                    <span class="char-value">${character.spellcasting.spellSaveDC}</span>
                </div>
                <div class="char-row">
                    <span class="char-label">Spell Attack Bonus:</span>
                    <span class="char-value">+${character.spellcasting.spellAttackBonus}</span>
                </div>
                ${this.renderSpellSlots(character)}
            </div>
            ` : ''}
        `;
    }

    /**
     * Render Ability Score Box
     */
    renderAbilityBox(name, score, modifier) {
        const modStr = modifier >= 0 ? `+${modifier}` : modifier;
        return `
            <div class="ability-box">
                <div class="ability-name">${name}</div>
                <div class="ability-score">${score}</div>
                <div class="ability-modifier">${modStr}</div>
            </div>
        `;
    }

    /**
     * Render Saving Throw Box
     */
    renderSavingThrow(name, bonus, isProficient) {
        const bonusStr = bonus >= 0 ? `+${bonus}` : bonus;
        return `
            <div class="save-box ${isProficient ? 'proficient' : ''}">
                <div class="save-name">${name}</div>
                <div class="save-bonus">${bonusStr}</div>
            </div>
        `;
    }

    /**
     * Render All Skills
     */
    renderAllSkills(character) {
        const skills = character.skills;
        return Object.entries(skills).map(([skillId, skillData]) => {
            const bonusStr = skillData.bonus >= 0 ? `+${skillData.bonus}` : skillData.bonus;
            const skillName = skillId.charAt(0).toUpperCase() + skillId.slice(1).replace(/([A-Z])/g, ' $1');
            return `
                <div class="skill-row ${skillData.proficient ? 'proficient' : ''}">
                    <span class="skill-name">${skillName}</span>
                    <span class="skill-bonus">${bonusStr}</span>
                </div>
            `;
        }).join('');
    }

    /**
     * Render Equipment Slot
     */
    renderEquipmentSlot(slotName, item) {
        return `
            <div class="equipment-slot ${item ? 'equipped' : ''}">
                <span class="slot-label">${slotName}:</span>
                <span class="slot-item ${!item ? 'empty' : ''}">${item ? item.name : 'Empty'}</span>
            </div>
        `;
    }

    /**
     * Render Class Features
     */
    renderClassFeatures(character) {
        const features = [];
        const classData = character.class;

        // Get all features up to current level
        for (let level = 1; level <= character.level; level++) {
            if (classData.features && classData.features[level]) {
                classData.features[level].forEach(feature => {
                    features.push(feature);
                });
            }
        }

        if (features.length === 0) {
            return '<li class="feature-item"><div class="feature-description">No class features yet.</div></li>';
        }

        return features.map(feature => `
            <li class="feature-item">
                <div class="feature-name">${feature.name}</div>
                <div class="feature-description">${feature.description}</div>
            </li>
        `).join('');
    }

    /**
     * Render Racial Traits
     */
    renderRacialTraits(character) {
        const traits = character.race.traits || [];

        if (traits.length === 0) {
            return '<li class="feature-item"><div class="feature-description">No racial traits.</div></li>';
        }

        return traits.map(trait => `
            <li class="feature-item">
                <div class="feature-name">${trait.name}</div>
                <div class="feature-description">${trait.description}</div>
            </li>
        `).join('');
    }

    /**
     * Render Weapon Masteries
     */
    renderWeaponMasteries(character) {
        const masteries = character.weaponMasteries || [];

        if (masteries.length === 0) {
            return '<div class="mastery-item">No weapon masteries selected.</div>';
        }

        // Load mastery data
        const masteryDescriptions = {
            'cleave': {
                name: 'Cleave',
                description: 'When you hit with a melee attack, make an additional attack against a second creature within reach. The additional attack deals ability modifier damage (minimum 1).',
                icon: '⚔️'
            },
            'graze': {
                name: 'Graze',
                description: 'If your attack misses, you can deal ability modifier damage to the target anyway.',
                icon: '⚔️'
            },
            'nick': {
                name: 'Nick',
                description: 'When attacking with this Light weapon, make a free attack with a different Light weapon in your other hand. Don\'t add ability modifier to the extra attack\'s damage (unless negative).',
                icon: '⚔️'
            },
            'push': {
                name: 'Push',
                description: 'When you hit, push the target (Large or smaller) away. They cannot make melee attacks on their next turn.',
                icon: '💨'
            },
            'sap': {
                name: 'Sap',
                description: 'When you hit, the target has disadvantage on its next attack roll.',
                icon: '💫'
            },
            'slow': {
                name: 'Slow',
                description: 'When you hit, reduce the target\'s AC by 1 until the start of your next turn. This effect does not stack.',
                icon: '🐌'
            },
            'topple': {
                name: 'Topple',
                description: 'When you hit, force a CON save or knock the target prone. Prone creatures have disadvantage on attacks, and melee attackers have advantage against them.',
                icon: '🔻'
            },
            'vex': {
                name: 'Vex',
                description: 'When you hit and deal damage, you have advantage on your next attack roll against that target.',
                icon: '⚡'
            }
        };

        return masteries.map(masteryId => {
            const mastery = masteryDescriptions[masteryId] || {
                name: masteryId,
                description: 'Unknown mastery',
                icon: '❓'
            };

            return `
                <div class="mastery-item">
                    <div class="mastery-header">
                        <span class="mastery-icon">${mastery.icon}</span>
                        <span class="mastery-name">${mastery.name}</span>
                    </div>
                    <div class="mastery-description">${mastery.description}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render Spell Slots
     */
    renderSpellSlots(character) {
        if (!character.spellcasting || !character.spellcasting.spellSlots) {
            return '';
        }

        const slots = character.spellcasting.spellSlots;
        return `
            <div class="char-row">
                <span class="char-label">Spell Slots:</span>
                <span class="char-value">
                    ${Object.entries(slots).map(([level, data]) =>
                        `L${level}: ${data.current}/${data.max}`
                    ).join(' | ')}
                </span>
            </div>
        `;
    }

    /**
     * Setup Inventory System
     */
    setupInventory() {
        const modal = document.getElementById('inventoryModal');
        const closeBtn = document.getElementById('closeInventoryBtn');
        const closeFooterBtn = document.getElementById('closeInventoryFooterBtn');

        // Close buttons
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeInventory());
        }
        if (closeFooterBtn) {
            closeFooterBtn.addEventListener('click', () => this.closeInventory());
        }

        // Tab switching
        const tabButtons = document.querySelectorAll('.inv-tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchInventoryTab(tab);
            });
        });

        // I key to open inventory (when not in combat)
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'i' || e.key === 'I') && this.currentScreen === 'game' && !gameState.get('combat')) {
                this.openInventory();
            }
        });

        console.log('🎒 Inventory system initialized');
    }

    /**
     * Open Inventory Modal
     */
    openInventory() {
        const modal = document.getElementById('inventoryModal');
        if (!modal) return;

        modal.classList.add('active');
        this.renderInventory();
    }

    /**
     * Close Inventory Modal
     */
    closeInventory() {
        const modal = document.getElementById('inventoryModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Switch Inventory Tab
     */
    switchInventoryTab(tabName) {
        // Update tab button active state
        document.querySelectorAll('.inv-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Re-render inventory with filter
        this.currentInventoryTab = tabName;
        this.renderInventory();
    }

    /**
     * Render Complete Inventory
     */
    renderInventory() {
        const character = gameState.get('character');
        if (!character) return;

        // Clean up invalid items from inventory
        if (character.inventory) {
            const validItems = character.inventory.filter(item => item && item.id && item.name);
            if (validItems.length !== character.inventory.length) {
                character.inventory = validItems;
                gameState.set('character', character);
                console.log(`🧹 Cleaned up ${character.inventory.length - validItems.length} invalid items from inventory`);
            }
        }

        // Update character info
        const nameEl = document.getElementById('invCharName');
        const classEl = document.getElementById('invCharClass');
        const goldEl = document.getElementById('invGold');

        if (nameEl) nameEl.textContent = character.name;
        if (classEl) classEl.textContent = `${character.class.name} ${character.level}`;
        if (goldEl) goldEl.textContent = `${character.gold || 0} gp`;

        // Update equipment slots
        this.updateEquipmentSlots(character);

        // Update weight
        this.updateWeightDisplay(character);

        // Render inventory items
        this.renderInventoryItems(character);
    }

    /**
     * Update Equipment Slots Display
     */
    updateEquipmentSlots(character) {
        const slots = {
            weapon: character.equipment.mainHand,
            armor: character.equipment.armor,
            offHand: character.equipment.offHand
        };

        Object.entries(slots).forEach(([slotName, item]) => {
            const slotEl = document.getElementById(`eq${slotName.charAt(0).toUpperCase() + slotName.slice(1)}`);
            if (slotEl) {
                slotEl.textContent = item ? item.name : '—';
                slotEl.style.color = item ? 'var(--text-primary)' : 'var(--text-secondary)';
            }
        });
    }

    /**
     * Update Weight Display
     */
    updateWeightDisplay(character) {
        const totalWeight = this.calculateTotalWeight(character);
        const maxWeight = character.abilities.str * 15; // D&D 5e carrying capacity

        const weightEl = document.getElementById('invWeight');
        const maxWeightEl = document.getElementById('invMaxWeight');
        const weightBarEl = document.getElementById('invWeightBar');

        if (weightEl) weightEl.textContent = totalWeight.toFixed(1);
        if (maxWeightEl) maxWeightEl.textContent = maxWeight;

        const percentage = (totalWeight / maxWeight) * 100;
        if (weightBarEl) {
            weightBarEl.style.width = `${Math.min(percentage, 100)}%`;
            // Color based on encumbrance
            if (percentage > 100) {
                weightBarEl.style.backgroundColor = '#dc3545'; // Over encumbered (red)
            } else if (percentage > 75) {
                weightBarEl.style.backgroundColor = '#ffc107'; // Heavily encumbered (yellow)
            } else {
                weightBarEl.style.backgroundColor = '#28a745'; // Normal (green)
            }
        }
    }

    /**
     * Calculate Total Weight
     */
    calculateTotalWeight(character) {
        let totalWeight = 0;

        // Equipment weight
        Object.values(character.equipment).forEach(item => {
            if (item && item.weight) {
                totalWeight += item.weight;
            }
        });

        // Inventory weight
        if (character.inventory) {
            character.inventory.forEach(item => {
                if (item && item.weight) {
                    const quantity = item.quantity || 1;
                    totalWeight += item.weight * quantity;
                }
            });
        }

        return totalWeight;
    }

    /**
     * Render Inventory Items List
     */
    renderInventoryItems(character) {
        const listEl = document.getElementById('inventoryItemsList');
        if (!listEl) return;

        const tab = this.currentInventoryTab || 'all';

        // Combine inventory items AND equipped items
        let items = [...(character.inventory || [])];

        // Add equipped items to the list
        for (const slot in character.equipment) {
            if (character.equipment[slot]) {
                items.push(character.equipment[slot]);
            }
        }

        // Filter out undefined/invalid items
        items = items.filter(item => item && item.id && item.name);

        // Filter by tab
        if (tab !== 'all') {
            items = items.filter(item => {
                if (tab === 'weapons') return item.type === 'weapon';
                if (tab === 'armor') return item.type === 'armor' || item.type === 'shield';
                if (tab === 'consumables') return item.type === 'consumable' || item.consumable;
                if (tab === 'misc') return !['weapon', 'armor', 'shield', 'consumable'].includes(item.type) && !item.consumable;
                return true;
            });
        }

        if (items.length === 0) {
            listEl.innerHTML = '<div class="inventory-empty">No items in this category.</div>';
            return;
        }

        listEl.innerHTML = items.map(item => this.renderInventoryItem(item, character)).join('');

        // Attach event listeners to action buttons
        listEl.querySelectorAll('.item-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                const itemEl = btn.closest('.inventory-item');
                const itemId = itemEl.dataset.itemId;
                this.handleItemAction(action, itemId);
            });
        });
    }

    /**
     * Render Single Inventory Item
     */
    renderInventoryItem(item, character) {
        const isEquipped = this.isItemEquipped(item, character);
        const icon = this.getItemIcon(item);
        const rarity = item.rarity || 'common';
        const weight = item.weight || 0;
        const quantity = item.quantity || 1;

        let description = item.description || '';
        if (item.type === 'weapon' && item.damage) {
            // Handle both old format (item.damage.dice) and new format (item.damage string)
            const damageDice = item.damage.dice || item.damage;
            const damageType = item.damage.type || item.damageType;
            description = `${damageDice} ${damageType}`;
            // Don't add versatile to description - will be a tag instead
        } else if (item.type === 'armor' && item.armorClass) {
            description = `AC ${item.armorClass}`;
            // Add max DEX bonus info
            if (item.maxDexBonus !== undefined && item.maxDexBonus !== null) {
                description += ` (Max DEX +${item.maxDexBonus})`;
            } else if (item.addDexModifier) {
                description += ` (Max DEX Inf)`;
            }
        }

        // Build stats tags array
        const statTags = [];
        statTags.push(`<span class="item-weight">${weight} lbs</span>`);

        // Add weapon type tag for weapons
        if (item.type === 'weapon' && item.weaponType) {
            const weaponTypeClass = item.weaponType.toLowerCase();
            statTags.push(`<span class="item-weapon-type ${weaponTypeClass}">${item.weaponType.charAt(0).toUpperCase() + item.weaponType.slice(1)}</span>`);
        }

        // Add weapon properties as tags
        if (item.type === 'weapon' && item.properties && item.properties.length > 0) {
            item.properties.forEach(prop => {
                let displayText = prop.charAt(0).toUpperCase() + prop.slice(1);
                // Add versatile damage to versatile tag
                if (prop === 'versatile' && item.versatileDamage) {
                    displayText += ` (${item.versatileDamage})`;
                }
                statTags.push(`<span class="item-weapon-property ${prop.toLowerCase()}">${displayText}</span>`);
            });
        }

        // Add armor type tag for armor
        if (item.type === 'armor' && item.armorType) {
            const armorTypeClass = item.armorType.toLowerCase();
            statTags.push(`<span class="item-armor-type ${armorTypeClass}">${item.armorType.charAt(0).toUpperCase() + item.armorType.slice(1)}</span>`);
        }

        statTags.push(`<span class="item-rarity ${rarity}">${rarity.charAt(0).toUpperCase() + rarity.slice(1)}</span>`);

        return `
            <div class="inventory-item ${isEquipped ? 'equipped' : ''}" data-item-id="${item.id}">
                <div class="item-icon">${icon}</div>
                <div class="item-details">
                    <div class="item-name">
                        ${item.name}
                        ${isEquipped ? '<span class="equipped-badge">EQUIPPED</span>' : ''}
                        ${quantity > 1 ? `<span class="item-quantity">x${quantity}</span>` : ''}
                    </div>
                    <div class="item-description">${description}</div>
                    <div class="item-stats">
                        ${statTags.join('')}
                    </div>
                </div>
                <div class="item-actions">
                    ${this.renderItemActions(item, isEquipped, character)}
                </div>
            </div>
        `;
    }

    /**
     * Render Item Action Buttons
     */
    renderItemActions(item, isEquipped, character) {
        const buttons = [];

        if (item.type === 'weapon') {
            if (isEquipped) {
                buttons.push('<button class="item-action-btn equipped" data-action="unequip">Unequip</button>');
            } else {
                // Weapons can be equipped to main hand or off-hand (if Light property)
                buttons.push('<button class="item-action-btn" data-action="equip">Equip Main Hand</button>');

                // Only show "Equip Off-Hand" if weapon has Light property
                if (item.properties && item.properties.includes('light')) {
                    buttons.push('<button class="item-action-btn" data-action="equipOffHand">Equip Off-Hand</button>');
                }
            }
        } else if (item.type === 'armor' || item.type === 'shield') {
            if (isEquipped) {
                buttons.push('<button class="item-action-btn equipped" data-action="unequip">Unequip</button>');
            } else {
                buttons.push('<button class="item-action-btn" data-action="equip">Equip</button>');
            }
        }

        if (item.consumable || item.type === 'consumable') {
            buttons.push('<button class="item-action-btn" data-action="use">Use</button>');
        }

        buttons.push('<button class="item-action-btn" data-action="drop">Drop</button>');

        return buttons.join('');
    }

    /**
     * Get Item Icon
     */
    getItemIcon(item) {
        const icons = {
            weapon: '⚔️',
            sword: '⚔️',
            axe: '🪓',
            bow: '🏹',
            armor: '🛡️',
            shield: '🛡️',
            helmet: '⛑️',
            potion: '🧪',
            consumable: '🧪',
            scroll: '📜',
            ring: '💍',
            amulet: '📿',
            artifact: '✨',
            misc: '📦'
        };

        return icons[item.type] || icons[item.weaponType] || icons.misc;
    }

    /**
     * Check if Item is Equipped
     */
    isItemEquipped(item, character) {
        return Object.values(character.equipment).some(equipped => equipped && equipped.id === item.id);
    }

    /**
     * Handle Item Action
     */
    async handleItemAction(action, itemId) {
        const character = gameState.get('character');
        if (!character) return;

        // Find item in inventory OR equipment
        let item = character.inventory.find(i => i.id === itemId);

        // If not in inventory, check if it's equipped
        if (!item) {
            for (const slot in character.equipment) {
                if (character.equipment[slot] && character.equipment[slot].id === itemId) {
                    item = character.equipment[slot];
                    break;
                }
            }
        }

        if (!item) return;

        switch (action) {
            case 'equip':
                this.equipItem(item, character);
                break;
            case 'equipOffHand':
                this.equipItem(item, character, 'offHand');
                break;
            case 'unequip':
                this.unequipItem(item, character);
                break;
            case 'use':
                this.useItem(item, character);
                break;
            case 'drop':
                this.dropItem(item, character);
                break;
        }
    }

    /**
     * Equip Item
     */
    equipItem(item, character, forceSlot = null) {
        let slot = forceSlot; // Allow forced slot for off-hand weapons

        // Determine equipment slot if not forced
        if (!slot) {
            if (item.type === 'weapon') {
                slot = 'mainHand';
            } else if (item.type === 'armor') {
                slot = 'armor';
            } else if (item.type === 'shield') {
                slot = 'offHand';
            }
        }

        if (!slot) {
            gameState.addMessage(`Cannot equip ${item.name}.`, 'error');
            return;
        }

        // VALIDATION: Off-hand weapons must have Light property
        if (item.type === 'weapon' && slot === 'offHand') {
            if (!item.properties || !item.properties.includes('light')) {
                gameState.addMessage(`❌ Only weapons with the Light property can be equipped in the off-hand.`, 'error');
                return;
            }
        }

        // Check proficiency and strength requirements
        if (item.type === 'weapon') {
            if (!this.isCharacterProficientWithWeapon(character, item)) {
                gameState.addMessage(`You are not proficient with ${item.name}. You cannot add your proficiency bonus to attack rolls with this weapon.`, 'warning');
                // Still allow equipping, but warn about lack of proficiency bonus
            }
        } else if (item.type === 'armor') {
            // Check armor proficiency (HARD REQUIREMENT)
            if (!this.isCharacterProficientWithArmor(character, item)) {
                gameState.addMessage(`❌ You are not proficient with ${item.armorType} armor. You cannot wear this armor.`, 'error');
                return; // Prevent equipping armor without proficiency (per D&D 5e rules)
            }

            // Check strength requirement (HARD REQUIREMENT)
            if (item.strengthRequirement) {
                const charStrength = character.abilities.str;
                if (charStrength < item.strengthRequirement) {
                    gameState.addMessage(`❌ You need ${item.strengthRequirement} Strength to wear ${item.name} (you have ${charStrength}). You cannot wear this armor.`, 'error');
                    return; // Prevent equipping armor below strength requirement
                }
            }
        } else if (item.type === 'shield') {
            if (!this.isCharacterProficientWithShield(character)) {
                gameState.addMessage(`❌ You are not proficient with shields. You cannot use this shield.`, 'error');
                return; // Prevent equipping shield without proficiency
            }
        }

        // Unequip current item in slot (move to inventory)
        if (character.equipment[slot]) {
            const currentItem = character.equipment[slot];
            character.inventory.push(currentItem);
            gameState.addMessage(`Unequipped ${currentItem.name}.`, 'info');
        }

        // Remove from inventory and equip
        const index = character.inventory.findIndex(i => i.id === item.id);
        if (index !== -1) {
            character.inventory.splice(index, 1);
        }

        character.equipment[slot] = item;
        gameState.addMessage(`Equipped ${item.name}.`, 'success');

        // Recalculate combat stats (AC, attack bonuses, damage)
        this.recalculateCombatStats(character);

        // Update game state
        gameState.set('character', character);

        // Re-render inventory
        this.renderInventory();

        // Update HUD
        this.updateHUD(character);

        // Update character sheet if it's open
        this.renderCharacterSheet();
    }

    /**
     * Unequip Item
     */
    unequipItem(item, character) {
        // Find which slot has this item
        let slot = null;
        for (const [slotName, equipped] of Object.entries(character.equipment)) {
            if (equipped && equipped.id === item.id) {
                slot = slotName;
                break;
            }
        }

        if (!slot) {
            gameState.addMessage(`${item.name} is not equipped.`, 'error');
            return;
        }

        // Move to inventory
        character.inventory.push(character.equipment[slot]);
        character.equipment[slot] = null;

        gameState.addMessage(`Unequipped ${item.name}.`, 'info');

        // Recalculate combat stats (AC, attack bonuses, damage)
        this.recalculateCombatStats(character);

        // Update game state
        gameState.set('character', character);

        // Re-render inventory
        this.renderInventory();

        // Update HUD
        this.updateHUD(character);

        // Update character sheet if it's open
        this.renderCharacterSheet();
    }

    /**
     * Use Item (Consumables)
     */
    useItem(item, character) {
        if (!item.consumable && item.type !== 'consumable') {
            gameState.addMessage(`${item.name} cannot be used.`, 'error');
            return;
        }

        // Handle potion of healing
        if (item.id.includes('potion') && item.id.includes('healing')) {
            const healing = this.rollHealing(item);
            const oldHP = character.currentHP;
            character.currentHP = Math.min(character.maxHP, character.currentHP + healing);
            const actualHealing = character.currentHP - oldHP;

            gameState.addMessage(`You drink ${item.name} and restore ${actualHealing} HP!`, 'success');

            // Decrease quantity or remove item
            if (item.quantity && item.quantity > 1) {
                item.quantity--;
            } else {
                const index = character.inventory.findIndex(i => i.id === item.id);
                if (index !== -1) {
                    character.inventory.splice(index, 1);
                }
            }

            // Update game state
            gameState.set('character', character);

            // Re-render inventory
            this.renderInventory();

            // Update HUD
            this.updateHUD(character);
        } else {
            gameState.addMessage(`${item.name} cannot be used yet.`, 'info');
        }
    }

    /**
     * Roll Healing for Potion
     */
    rollHealing(item) {
        // Default healing potion: 2d4+2
        const dice = 2;
        const sides = 4;
        const bonus = 2;

        let total = bonus;
        for (let i = 0; i < dice; i++) {
            total += Math.floor(Math.random() * sides) + 1;
        }

        return total;
    }

    /**
     * Drop Item
     */
    dropItem(item, character) {
        // Check if item is equipped - must unequip first
        const isEquipped = this.isItemEquipped(item, character);
        if (isEquipped) {
            gameState.addMessage(`You must unequip ${item.name} before dropping it.`, 'error');
            return;
        }

        if (!confirm(`Drop ${item.name}? This cannot be undone.`)) {
            return;
        }

        const index = character.inventory.findIndex(i => i.id === item.id);
        if (index !== -1) {
            character.inventory.splice(index, 1);
            gameState.addMessage(`Dropped ${item.name}.`, 'info');

            // Update game state
            gameState.set('character', character);

            // Re-render inventory
            this.renderInventory();
        }
    }

    /**
     * Open save menu
     */
    openSaveMenu() {
        const modalOverlay = document.getElementById('saveLoadModal');
        if (!modalOverlay) return;

        // Switch to save tab by default
        this.switchSaveLoadTab('save');

        modalOverlay.classList.add('active');
    }

    /**
     * Close save menu
     */
    closeSaveMenu() {
        const modalOverlay = document.getElementById('saveLoadModal');
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    }

    /**
     * Render save slots in save menu
     */
    renderSaveSlots() {
        const slotsContainer = document.getElementById('saveMenuSlots');
        if (!slotsContainer) return;

        const character = gameState.get('character');

        slotsContainer.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <div style="margin-bottom: 30px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 3px solid var(--success);">
                    <h3 style="margin: 0 0 10px 0; color: var(--success);">📥 Export Save</h3>
                    <p style="margin: 0 0 20px 0; font-size: 14px; color: var(--text-secondary); line-height: 1.6;">
                        Download your game as a <strong>.json file</strong><br>
                        ✓ Full game state preserved<br>
                        ✓ No size limits<br>
                        ✓ Portable & backup-friendly<br>
                        ✓ Share between devices
                    </p>
                    <div style="padding: 15px; background: rgba(0,0,0,0.2); border-radius: 6px; margin-bottom: 20px;">
                        <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 5px;">Current Character:</div>
                        <div style="font-size: 16px; font-weight: bold; color: var(--accent);">
                            ${character?.name || 'Unknown'} - Level ${character?.level || 1} ${character?.class?.displayName || character?.class?.name || ''}
                        </div>
                    </div>
                    <button class="menu-btn" onclick="window.game.exportCurrentGame()" style="width: 100%; font-size: 16px; padding: 15px;">
                        📥 Download Save File
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render load slots in load menu
     */
    renderLoadSlots() {
        const slotsContainer = document.getElementById('loadMenuSlots');
        if (!slotsContainer) return;

        slotsContainer.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <div style="margin-bottom: 30px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 3px solid var(--success);">
                    <h3 style="margin: 0 0 10px 0; color: var(--success);">📤 Import Save</h3>
                    <p style="margin: 0 0 20px 0; font-size: 14px; color: var(--text-secondary); line-height: 1.6;">
                        Upload a <strong>.json save file</strong><br>
                        ✓ Full game state restored<br>
                        ✓ Load from any device<br>
                        ✓ Resume where you left off<br>
                        ✓ All quests & progress intact
                    </p>
                    <input type="file" id="importSaveInput" accept=".json" style="display: none;" onchange="window.game.importSaveFile(event)">
                    <button class="menu-btn" onclick="document.getElementById('importSaveInput').click()" style="width: 100%; font-size: 16px; padding: 15px;">
                        📤 Upload Save File
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Save game to specific slot
     */
    saveToSlot(slotId) {
        const result = saveManager.saveGame(slotId);

        if (result.success) {
            gameState.addMessage(result.message, 'success');
            this.closeSaveMenu();
        } else {
            gameState.addMessage(result.message, 'error');
        }
    }

    /**
     * Load game from specific slot (in-game load)
     */
    async loadFromSlot(slotId) {
        if (!confirm('Loading will overwrite your current game. Continue?')) {
            return;
        }

        const result = saveManager.loadGame(slotId);

        if (result.success) {
            // Reinitialize game systems with loaded data
            await this.reinitializeGameAfterLoad();
            this.closeSaveMenu();
            gameState.addMessage('Game loaded successfully!', 'success');
        } else {
            gameState.addMessage(result.message, 'error');
        }
    }

    /**
     * Load game from specific slot
     */
    async loadGameFromSlot(slotId) {
        const result = saveManager.loadGame(slotId);

        if (result.success) {
            // Reinitialize game systems with loaded data
            await this.reinitializeGameAfterLoad();
            this.showScreen('game');
        } else {
            alert(result.message);
        }
    }

    /**
     * Export current game to downloadable file
     */
    exportCurrentGame() {
        const result = saveManager.exportSaveToFile(0); // 0 = current game

        if (result.success) {
            gameState.addMessage(result.message, 'success');
        } else {
            gameState.addMessage(result.message, 'error');
        }
    }

    /**
     * Import save file
     */
    async importSaveFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const result = await saveManager.importSaveFromFile(file);

        if (result.success) {
            // Deserialize and load the game
            saveManager.deserializeGameState(result.saveData);

            // Reinitialize game systems
            await this.reinitializeGameAfterLoad();

            // Close load menu and show game
            this.showScreen('game');
            gameState.addMessage('Save file imported successfully!', 'success');
        } else {
            alert(result.message);
        }

        // Reset file input
        event.target.value = '';
    }

    /**
     * Import save file from main menu load game screen
     */
    async importSaveFileFromMenu(event) {
        const file = event.target.files[0];
        if (!file) return;

        const result = await saveManager.importSaveFromFile(file);

        if (result.success) {
            // Deserialize and load the game
            saveManager.deserializeGameState(result.saveData);

            // Reinitialize game systems
            await this.reinitializeGameAfterLoad();

            // Show game screen
            this.showScreen('game');
            gameState.addMessage('Save file imported successfully!', 'success');
        } else {
            alert(result.message);
        }

        // Reset file input
        event.target.value = '';
    }

    /**
     * Reinitialize game systems after loading
     */
    async reinitializeGameAfterLoad() {
        console.log('🔄 Reinitializing game after load...');

        const seed = gameState.get('seed');
        const worldConfig = gameState.get('worldConfig');
        const character = gameState.get('character');

        // Reinitialize world generator
        this.worldGenerator = new WorldGenerator(seed, worldConfig);

        // Load saved regions into WorldGenerator cache (preserves explored/visible state)
        const savedRegions = gameState.get('world.generatedRegions');
        if (savedRegions) {
            this.worldGenerator.loadSavedRegions(savedRegions);
        }

        // Reinitialize map renderer
        if (!this.mapRenderer) {
            this.mapRenderer = new MapRenderer('gameCanvas', {
                tileWidth: 12,
                tileHeight: 16,
                viewportWidth: 80,
                viewportHeight: 40
            });
        }

        // Reinitialize settlement UI
        if (!this.settlementUI) {
            this.settlementUI = new SettlementUI(null);
        }

        // Initialize NPC generator
        if (!this.npcGenerator) {
            console.log('👥 Initializing NPC generator...');
            this.npcGenerator = new NPCGenerator(seed);
            await this.npcGenerator.loadData();
        }

        // Initialize quest systems
        if (!this.questGenerator) {
            console.log('📜 Initializing quest generator...');
            this.questGenerator = new QuestGenerator(seed);
            await this.questGenerator.loadData();
        }

        if (!this.questManager) {
            console.log('📜 Initializing quest manager...');
            this.questManager = new QuestManager(this.questGenerator);
            await this.questManager.initialize();
        }

        // Initialize settlement manager with all dependencies
        if (!this.settlementManager) {
            console.log('🏘️ Initializing settlement system...');
            this.settlementManager = new SettlementManager(
                this.worldGenerator,
                this.settlementUI,
                this.npcGenerator,
                this.questGenerator,
                this.questManager
            );
            this.settlementUI.settlementManager = this.settlementManager;
        }

        // Reinitialize player at saved position
        this.player = new Player(this.worldGenerator, this.mapRenderer, this.settlementManager);
        const savedPosition = gameState.get('world.currentLocation');
        if (savedPosition) {
            this.player.x = savedPosition.x;
            this.player.y = savedPosition.y;
            await this.player.updateVisibility();
        }

        // Update HUD
        this.updateHUD(character);

        // Restart playtime tracking
        gameState.startPlaytimeTracking();

        // Restart game loop
        this.startGameLoop();

        gameState.addMessage('Game loaded successfully!', 'success');
        console.log('✅ Game reinitialized after load');
    }

    /**
     * Confirm delete save slot
     */
    confirmDeleteSave(slotId) {
        if (confirm(`Are you sure you want to delete save slot ${slotId}?`)) {
            const result = saveManager.deleteSave(slotId);
            if (result.success) {
                this.renderLoadGameSlots();
            } else {
                alert(result.message);
            }
        }
    }

    /**
     * Show help screen
     */
    showHelpScreen() {
        const helpContent = `
            <h2>Nexus Verge - Help</h2>
            <h3>Controls</h3>
            <ul>
                <li><strong>WASD / Arrow Keys:</strong> Move character</li>
                <li><strong>I:</strong> Open inventory</li>
                <li><strong>C:</strong> Open character sheet</li>
                <li><strong>Q:</strong> Open quest log</li>
                <li><strong>R:</strong> Rest</li>
                <li><strong>H:</strong> Help (this screen)</li>
                <li><strong>ESC:</strong> Close menus</li>
            </ul>
            <h3>Gameplay</h3>
            <ul>
                <li>Explore the procedurally generated world</li>
                <li>Complete quests to gain XP and reputation</li>
                <li>Fight enemies in turn-based combat</li>
                <li>Rest at taverns to recover HP and spell slots</li>
                <li>Unlock better equipment with faction reputation</li>
            </ul>
            <h3>D&D 5e Rules</h3>
            <p>This game follows D&D 5e 2024 rules including:</p>
            <ul>
                <li>Ability scores and modifiers</li>
                <li>Proficiency bonus</li>
                <li>Attack rolls (d20 + mods vs AC)</li>
                <li>Damage rolls</li>
                <li>Spell slots and spellcasting</li>
                <li>Short and long rests</li>
            </ul>
            <button id="closeHelpBtn" class="menu-btn">Close</button>
        `;

        const modal = document.getElementById('modalContent');
        const overlay = document.getElementById('modalOverlay');

        if (modal && overlay) {
            modal.innerHTML = helpContent;
            overlay.classList.add('active');

            const closeBtn = document.getElementById('closeHelpBtn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    overlay.classList.remove('active');
                });
            }

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                }
            });
        }
    }

    // OLD showRestModal() removed - using RestManager

    // OLD isInSettlement() removed - using RestManager.isPlayerInTavern()

    // OLD takeShortRest() removed - using RestManager.shortRest()

    // OLD takeLongRest() removed - using RestManager.longRest()

    /**
     * Setup message log
     */
    setupMessageLog() {
        const messageLog = document.getElementById('messageLog');
        if (!messageLog) return;

        gameState.subscribe('ui.messageLog', (messages) => {
            // Show last 10 messages
            const recent = messages.slice(-10);
            messageLog.innerHTML = recent.map(msg => {
                const className = `message message-${msg.type || 'info'}`;
                return `<div class="${className}">${msg.text}</div>`;
            }).join('');

            // Auto-scroll to bottom
            messageLog.scrollTop = messageLog.scrollHeight;
        });
    }

    /**
     * Setup Quick Stats display
     */
    setupQuickStats() {
        const quickStats = document.getElementById('quickStats');
        if (!quickStats) return;

        const updateStats = () => {
            const character = gameState.get('character');
            if (!character) return;

            quickStats.innerHTML = `
                <div style="font-family: monospace; font-size: 0.85rem; line-height: 1.6;">
                    <div><strong>STR:</strong> ${character.abilities.str} (${character.abilityModifiers.str >= 0 ? '+' : ''}${character.abilityModifiers.str})</div>
                    <div><strong>DEX:</strong> ${character.abilities.dex} (${character.abilityModifiers.dex >= 0 ? '+' : ''}${character.abilityModifiers.dex})</div>
                    <div><strong>CON:</strong> ${character.abilities.con} (${character.abilityModifiers.con >= 0 ? '+' : ''}${character.abilityModifiers.con})</div>
                    <div><strong>INT:</strong> ${character.abilities.int} (${character.abilityModifiers.int >= 0 ? '+' : ''}${character.abilityModifiers.int})</div>
                    <div><strong>WIS:</strong> ${character.abilities.wis} (${character.abilityModifiers.wis >= 0 ? '+' : ''}${character.abilityModifiers.wis})</div>
                    <div><strong>CHA:</strong> ${character.abilities.cha} (${character.abilityModifiers.cha >= 0 ? '+' : ''}${character.abilityModifiers.cha})</div>
                    <hr style="margin: 10px 0; border-color: #4a4a4a;">
                    <div><strong>Speed:</strong> ${character.speed} ft</div>
                    <div><strong>Initiative:</strong> ${character.initiative >= 0 ? '+' : ''}${character.initiative || 0}</div>
                    <div><strong>Prof Bonus:</strong> +${character.proficiencyBonus}</div>
                </div>
            `;
        };

        // Initial update
        updateStats();

        // Subscribe to character changes
        gameState.subscribe('character', updateStats);
    }

    /**
     * Setup Rest System UI
     */
    setupRestSystem() {
        // Listen for rest completion events from RestManager
        window.addEventListener('restCompleted', (event) => {
            const { type, result } = event.detail;
            // Update HUD after successful rest
            this.updateHUD(gameState.get('character'));
        });

        // Close modal when clicking outside
        const restModal = document.getElementById('restModal');
        if (restModal) {
            restModal.addEventListener('click', (e) => {
                if (e.target === restModal) {
                    restManager.closeRestMenu();
                }
            });
        }

        console.log('✅ Rest system UI initialized');
    }

    /**
     * Start game loop
     */
    startGameLoop() {
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }

        const gameLoop = async (timestamp) => {
            // Calculate delta time
            const deltaTime = timestamp - this.lastFrameTime;
            this.lastFrameTime = timestamp;

            // Update game state
            await this.update(deltaTime);

            // Render
            await this.render();

            // Continue loop
            this.gameLoopId = requestAnimationFrame(gameLoop);
        };

        this.gameLoopId = requestAnimationFrame(gameLoop);
        console.log('🔄 Game loop started');
    }

    /**
     * Stop game loop
     */
    stopGameLoop() {
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
            console.log('⏸️ Game loop stopped');
        }
    }

    /**
     * Update game state
     */
    async update(deltaTime) {
        // Game state updates will happen here
        // For now, most updates are event-driven (player input)
    }

    /**
     * Render game
     */
    async render() {
        // Check if in combat
        const combatState = gameState.get('combat');
        if (combatState && combatState.active && this.combatRenderer) {
            // Render combat
            this.combatRenderer.render(combatState);
            return;
        }

        // Render exploration
        if (!this.mapRenderer || !this.player || !this.worldGenerator) {
            return;
        }

        const playerPos = this.player.getPosition();

        // Get visible regions
        const { regionX, regionY } = this.worldGenerator.getRegionCoords(playerPos.x, playerPos.y);

        // Load current and adjacent regions
        const regions = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const region = await this.worldGenerator.generateRegion(regionX + dx, regionY + dy);
                regions.push(region);
            }
        }

        // Combine all tiles from loaded regions
        const allTiles = regions.flatMap(r => r.tiles);

        // Add features to tiles
        regions.forEach(region => {
            region.features.forEach(feature => {
                const tile = allTiles.find(t => t.x === feature.x && t.y === feature.y);
                if (tile) {
                    tile.feature = feature;
                }
            });
        });

        // Render world
        await this.mapRenderer.renderWorld({ tiles: allTiles }, playerPos);

        // Prune distant regions from cache
        this.worldGenerator.pruneCache(regionX, regionY, 3);
    }

    // ==================== HELPER FUNCTIONS FOR PLAIN CHARACTER OBJECTS ====================

    /**
     * Calculate AC from plain character object (not class instance)
     */
    calculateACForCharacter(character) {
        let ac = 10; // Base AC

        // Armor
        if (character.equipment.armor) {
            const armor = character.equipment.armor;
            ac = armor.armorClass;

            // Add DEX modifier if allowed
            if (armor.addDexModifier) {
                const dexBonus = armor.maxDexBonus !== null
                    ? Math.min(character.abilityModifiers.dex, armor.maxDexBonus)
                    : character.abilityModifiers.dex;
                ac += dexBonus;
            }
        } else {
            // No armor: 10 + DEX modifier
            ac = 10 + character.abilityModifiers.dex;
        }

        // Shield (shields are equipped in offHand slot)
        if (character.equipment.offHand && character.equipment.offHand.type === 'shield') {
            ac += character.equipment.offHand.armorClassBonus || 0;
        }

        // Other bonuses (magic items, spells, etc.)
        ac += character.armorBonus || 0;

        return ac;
    }

    /**
     * Calculate attack bonus for a weapon from plain character object
     */
    calculateAttackBonusForWeapon(character, weapon) {
        if (!weapon) return 0;

        // Determine which ability modifier to use
        let abilityMod;

        if (weapon.properties?.includes('finesse')) {
            // Finesse weapons can use DEX or STR (whichever is higher)
            abilityMod = Math.max(character.abilityModifiers.str, character.abilityModifiers.dex);
        } else if (weapon.weaponType === 'ranged') {
            abilityMod = character.abilityModifiers.dex;
        } else {
            abilityMod = character.abilityModifiers.str;
        }

        // Check weapon proficiency
        const proficient = this.isCharacterProficientWithWeapon(character, weapon);
        const profBonus = proficient ? character.proficiencyBonus : 0;

        return abilityMod + profBonus;
    }

    /**
     * Check if character is proficient with weapon
     */
    isCharacterProficientWithWeapon(character, weapon) {
        if (!weapon) return false;

        // Check if proficient with weapon category (simple, martial)
        if (character.proficiencies.weapons.includes(weapon.category)) {
            return true;
        }

        // Check if proficient with specific weapon
        if (character.proficiencies.weapons.includes(weapon.id)) {
            return true;
        }

        return false;
    }

    /**
     * Check if character is proficient with armor
     */
    isCharacterProficientWithArmor(character, armor) {
        if (!armor) return false;

        // Check if proficient with armor type (light, medium, heavy)
        if (character.proficiencies.armor.includes(armor.armorType)) {
            return true;
        }

        // Check if proficient with specific armor
        if (character.proficiencies.armor.includes(armor.id)) {
            return true;
        }

        return false;
    }

    /**
     * Check if character is proficient with shields
     */
    isCharacterProficientWithShield(character) {
        return character.proficiencies.armor.includes('shields');
    }

    /**
     * Recalculate all combat stats affected by equipment changes
     */
    recalculateCombatStats(character) {
        // Recalculate AC
        character.ac = this.calculateACForCharacter(character);

        // Recalculate attack bonus for equipped weapons
        if (character.equipment.mainHand) {
            character.mainHandAttackBonus = this.calculateAttackBonusForWeapon(character, character.equipment.mainHand);
        } else {
            character.mainHandAttackBonus = 0;
        }

        if (character.equipment.offHand && character.equipment.offHand.type === 'weapon') {
            character.offHandAttackBonus = this.calculateAttackBonusForWeapon(character, character.equipment.offHand);
        } else {
            character.offHandAttackBonus = 0;
        }

        console.log(`⚔️ Combat stats recalculated - AC: ${character.ac}, Main Hand Attack: +${character.mainHandAttackBonus}, Off Hand Attack: +${character.offHandAttackBonus}`);
    }
}


// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();

    // Expose to window for debugging
    window.game = game;
    window.gameState = gameState;
});

export default Game;
