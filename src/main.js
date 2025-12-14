/**
 * Nexus Verge - Main Entry Point
 * Bootstraps the application and handles screen transitions
 */

import { gameState } from './core/GameState.js';
import { generateSeedString } from './utils/rng.js';
import CharacterCreationUI from './ui/CharacterCreation.js';
import WorldGenerator from './systems/WorldGenerator.js';
import MapRenderer from './rendering/MapRenderer.js';
import Player from './systems/Player.js';
import CombatManager from './systems/CombatManager.js';
import restManager from './systems/RestManager.js';
import saveManager from './systems/SaveManager.js';

class Game {
    constructor() {
        this.characterCreationUI = null;
        this.currentScreen = null;

        // Game systems (initialized when game starts)
        this.worldGenerator = null;
        this.mapRenderer = null;
        this.player = null;

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

        // Subscribe to rest modal
        gameState.subscribe('ui.showRestModal', (show) => {
            if (show) {
                this.showRestModal();
            }
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

        if (!this.player) {
            console.log('👤 Initializing player...');
            this.player = new Player(this.worldGenerator, this.mapRenderer);
            await this.player.spawn();
        }

        // Add welcome messages
        gameState.addMessage(`Welcome to Nexus Verge, ${character.name}!`, 'success');
        gameState.addMessage(`You are a Level ${character.level} ${character.race.name} ${character.class.name}.`, 'info');
        gameState.addMessage('Use WASD or Arrow keys to move.', 'info');

        // Subscribe to messages
        this.setupMessageLog();

        // Setup Quick Stats
        this.setupQuickStats();

        // Setup Rest System
        this.setupRestSystem();

        // Setup Save/Load System
        this.setupSaveLoadSystem();

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
        playerDiv.innerHTML = playerCombatants.map(c => `
            <div class="combatant-card ${c.id === currentTurn ? 'current-turn' : ''} ${c.hp <= 0 ? 'dead' : ''}">
                <div class="combatant-name">${c.name}</div>
                <div class="combatant-hp">HP: ${c.hp}/${c.maxHP}</div>
                <div class="hp-bar">
                    <div class="hp-fill" style="width: ${(c.hp/c.maxHP)*100}%"></div>
                </div>
                <div class="combatant-ac">AC: ${c.ac}</div>
            </div>
        `).join('');

        // Render enemy combatants (clickable for targeting)
        const enemyCombatants = combatState.combatants.filter(c => c.team === 'enemy');
        enemyDiv.innerHTML = enemyCombatants.map(c => `
            <div class="combatant-card ${c.id === currentTurn ? 'current-turn' : ''} ${c.hp <= 0 ? 'dead' : ''}"
                 data-combatant-id="${c.id}"
                 onclick="window.game.handleTargetClick('${c.id}')">
                <div class="combatant-name">${c.name}</div>
                <div class="combatant-hp">HP: ${c.hp}/${c.maxHP}</div>
                <div class="hp-bar">
                    <div class="hp-fill" style="width: ${(c.hp/c.maxHP)*100}%"></div>
                </div>
                <div class="combatant-ac">AC: ${c.ac}</div>
            </div>
        `).join('');
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
            actionsEl.innerHTML = `
                <p style="color: var(--text-secondary); text-align: center; padding: 20px;">
                    ${currentCombatant?.name || 'Enemy'} is taking their turn...
                </p>
            `;
            return;
        }

        // Player turn - show action buttons
        actionsEl.innerHTML = `
            <div class="action-buttons">
                <button class="action-btn" onclick="window.game.selectAction('attack')"
                        ${!currentCombatant.actions.action ? 'disabled' : ''}>
                    ⚔️ Attack
                </button>
                <button class="action-btn" onclick="window.game.selectAction('ability')"
                        ${!currentCombatant.actions.action ? 'disabled' : ''}>
                    ✨ Ability
                </button>
                <button class="action-btn" onclick="window.game.selectAction('spell')"
                        ${!currentCombatant.actions.action ? 'disabled' : ''}>
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
                this.combatManager.attack(attacker, target);
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
        if (charLevel) charLevel.textContent = `Level ${character.level} ${character.class.name}`;
        if (hpDisplay) hpDisplay.textContent = `HP: ${character.currentHP}/${character.maxHP}`;
        if (acDisplay) acDisplay.textContent = `AC: ${character.ac}`;

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
     * Show load game screen
     */
    showLoadGameScreen() {
        this.showScreen('loadGameScreen');
        this.renderLoadGameSlots();
    }

    /**
     * Render load game save slots
     */
    renderLoadGameSlots() {
        const slotsContainer = document.getElementById('saveSlots');
        if (!slotsContainer) return;

        const slots = saveManager.getSaveSlots();

        slotsContainer.innerHTML = '';

        for (let i = 1; i <= saveManager.maxSlots; i++) {
            const slot = slots[i];
            const slotEl = document.createElement('div');
            slotEl.className = `save-slot ${slot.isEmpty ? 'empty' : ''}`;
            slotEl.dataset.slotId = i;

            if (slot.isEmpty) {
                slotEl.innerHTML = `
                    <div class="save-slot-header">
                        <span class="slot-number">Slot ${i}</span>
                    </div>
                    <div class="save-slot-body">
                        <p class="empty-slot-text">Empty Slot</p>
                    </div>
                `;
            } else {
                slotEl.innerHTML = `
                    <div class="save-slot-header">
                        <span class="slot-number">Slot ${i}</span>
                        <span class="slot-timestamp">${saveManager.formatTimestamp(slot.timestamp)}</span>
                    </div>
                    <div class="save-slot-body">
                        <div class="save-slot-character">
                            <span class="character-name">${slot.characterName}</span>
                            <span class="character-class">Level ${slot.level} ${slot.class}</span>
                        </div>
                        <div class="save-slot-info">
                            <span class="save-location">${slot.location}</span>
                            <span class="save-playtime">${saveManager.formatPlaytime(slot.playtime)}</span>
                        </div>
                        <div class="save-slot-actions">
                            <button class="btn-load" onclick="window.game.loadGameFromSlot(${i})">Load</button>
                            <button class="btn-delete" onclick="window.game.confirmDeleteSave(${i})">Delete</button>
                        </div>
                    </div>
                    <div class="save-slot-footer">
                        <span class="save-seed">Seed: ${slot.seed}</span>
                    </div>
                `;
            }

            slotsContainer.appendChild(slotEl);
        }
    }

    /**
     * Setup save/load system UI handlers
     */
    setupSaveLoadSystem() {
        // ESC key to open save menu (when in game screen)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentScreen === 'game' && !gameState.get('combat')) {
                this.openSaveMenu();
            }
        });

        console.log('💾 Save/Load system initialized');
    }

    /**
     * Open save menu
     */
    openSaveMenu() {
        const modalOverlay = document.getElementById('saveLoadModal');
        if (!modalOverlay) return;

        // Render save slots
        this.renderSaveSlots();

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

        const slots = saveManager.getSaveSlots();

        slotsContainer.innerHTML = '';

        for (let i = 1; i <= saveManager.maxSlots; i++) {
            const slot = slots[i];
            const slotEl = document.createElement('button');
            slotEl.className = `save-menu-slot ${slot.isEmpty ? 'empty' : ''}`;
            slotEl.onclick = () => this.saveToSlot(i);

            if (slot.isEmpty) {
                slotEl.innerHTML = `
                    <span class="slot-number">Slot ${i}</span>
                    <span class="empty-text">Empty</span>
                `;
            } else {
                slotEl.innerHTML = `
                    <span class="slot-number">Slot ${i}</span>
                    <span class="slot-char">${slot.characterName} - Level ${slot.level}</span>
                    <span class="slot-time">${saveManager.formatTimestamp(slot.timestamp)}</span>
                `;
            }

            slotsContainer.appendChild(slotEl);
        }
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
     * Load game from specific slot
     */
    loadGameFromSlot(slotId) {
        const result = saveManager.loadGame(slotId);

        if (result.success) {
            // Reinitialize game systems with loaded data
            this.reinitializeGameAfterLoad();
            this.showScreen('game');
        } else {
            alert(result.message);
        }
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

        // Reinitialize player at saved position
        this.player = new Player(this.worldGenerator, this.mapRenderer);
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

    /**
     * Show rest modal
     */
    showRestModal() {
        const character = gameState.get('character');
        if (!character) return;

        // Check if in settlement for long rest
        const inSettlement = this.isInSettlement();

        const restContent = `
            <h2>😴 Rest</h2>
            <div style="margin: 20px 0;">
                <div style="margin-bottom: 20px;">
                    <h3>Current Status</h3>
                    <p><strong>HP:</strong> ${character.currentHP} / ${character.maxHP}</p>
                    <p><strong>Hit Dice:</strong> ${character.hitDice.current} / ${character.hitDice.max} (d${character.hitDice.size})</p>
                    <p><strong>Short Rests Used:</strong> ${character.shortRestsUsed} / 2</p>
                </div>

                <div style="margin-bottom: 20px;">
                    <h3>Short Rest (1 hour)</h3>
                    <p>Spend hit dice to recover HP. Each hit die restores 1d${character.hitDice.size} + ${character.abilityModifiers.con} HP.</p>
                    <button id="shortRestBtn" class="menu-btn ${character.shortRestsUsed >= 2 || character.hitDice.current <= 0 ? 'disabled-btn' : ''}">
                        Take Short Rest
                    </button>
                    ${character.shortRestsUsed >= 2 ? '<p style="color: var(--text-warning);">⚠️ No short rests remaining. Need a long rest.</p>' : ''}
                    ${character.hitDice.current <= 0 ? '<p style="color: var(--text-warning);">⚠️ No hit dice remaining.</p>' : ''}
                </div>

                <div style="margin-bottom: 20px;">
                    <h3>Long Rest (8 hours)</h3>
                    <p>Recover all HP, half of your hit dice, and all spell slots. Resets short rests.</p>
                    <button id="longRestBtn" class="menu-btn ${!inSettlement ? 'disabled-btn' : ''}">
                        Take Long Rest
                    </button>
                    ${!inSettlement ? '<p style="color: var(--text-warning);">⚠️ You must be in a settlement (town/village) to take a long rest.</p>' : '<p style="color: var(--text-success);">✓ You are in a settlement and can rest safely.</p>'}
                </div>

                <button id="closeRestBtn" class="menu-btn secondary">Close</button>
            </div>
        `;

        const modal = document.getElementById('modalContent');
        const overlay = document.getElementById('modalOverlay');

        if (modal && overlay) {
            modal.innerHTML = restContent;
            overlay.classList.add('active');

            // Short rest button
            const shortRestBtn = document.getElementById('shortRestBtn');
            if (shortRestBtn) {
                shortRestBtn.addEventListener('click', () => {
                    this.takeShortRest();
                });
            }

            // Long rest button
            const longRestBtn = document.getElementById('longRestBtn');
            if (longRestBtn) {
                longRestBtn.addEventListener('click', () => {
                    this.takeLongRest();
                });
            }

            // Close button
            const closeBtn = document.getElementById('closeRestBtn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    overlay.classList.remove('active');
                    gameState.set('ui.showRestModal', false);
                });
            }

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                    gameState.set('ui.showRestModal', false);
                }
            });
        }
    }

    /**
     * Check if player is in a settlement
     */
    isInSettlement() {
        if (!this.player || !this.worldGenerator) {
            return false;
        }

        const playerPos = this.player.getPosition();

        // Check current tile and nearby tiles for settlement features
        // We check a 2-tile radius to allow resting near towns
        const searchRadius = 2;

        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
            for (let dy = -searchRadius; dy <= searchRadius; dy++) {
                const checkX = playerPos.x + dx;
                const checkY = playerPos.y + dy;

                const { regionX, regionY } = this.worldGenerator.getRegionCoords(checkX, checkY);
                const region = this.worldGenerator.regionCache.get(`${regionX},${regionY}`);

                if (!region) continue;

                // Check if there's a settlement feature at this location
                const settlement = region.features.find(f =>
                    f.type === 'settlement' &&
                    f.x === checkX &&
                    f.y === checkY
                );

                if (settlement) return true;
            }
        }

        return false;
    }

    /**
     * Take a short rest
     */
    takeShortRest() {
        const character = gameState.get('character');
        if (!character) return;

        // Validate conditions
        if (character.shortRestsUsed >= 2) {
            gameState.addMessage('❌ No short rests remaining. You need to take a long rest first.', 'error');
            return;
        }

        if (character.hitDice.current <= 0) {
            gameState.addMessage('❌ No hit dice remaining. You need to take a long rest to recover hit dice.', 'error');
            return;
        }

        const result = character.shortRest();

        if (result.success) {
            gameState.set('character', character);
            gameState.addMessage(`✅ Short rest complete! Healed ${result.healing} HP by spending ${result.hitDiceSpent} hit dice. ${result.shortRestsRemaining} short rests remaining.`, 'success');

            // Close modal and reopen to refresh
            document.getElementById('modalOverlay').classList.remove('active');
            gameState.set('ui.showRestModal', false);
            setTimeout(() => {
                gameState.set('ui.showRestModal', true);
            }, 100);
        } else {
            gameState.addMessage(`❌ ${result.reason}`, 'error');
        }
    }

    /**
     * Take a long rest
     */
    takeLongRest() {
        const character = gameState.get('character');
        if (!character) return;

        // Check if in settlement
        if (!this.isInSettlement()) {
            gameState.addMessage('❌ You must be in a settlement to take a long rest.', 'error');
            return;
        }

        const result = character.longRest();

        if (result.success) {
            gameState.set('character', character);
            gameState.addMessage(`✅ Long rest complete! HP fully restored. Recovered ${result.hitDiceRecovered} hit dice. Spell slots and short rests reset.`, 'success');

            // Close modal
            document.getElementById('modalOverlay').classList.remove('active');
            gameState.set('ui.showRestModal', false);
        }
    }

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
                    <div><strong>Initiative:</strong> +${character.initiative}</div>
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
        // Close button
        const closeRestBtn = document.getElementById('closeRestBtn');
        if (closeRestBtn) {
            closeRestBtn.addEventListener('click', () => {
                restManager.closeRestMenu();
            });
        }

        // Short rest button
        const shortRestBtn = document.getElementById('shortRestBtn');
        if (shortRestBtn) {
            shortRestBtn.addEventListener('click', async () => {
                const result = await restManager.shortRest();
                if (result.success) {
                    restManager.closeRestMenu();
                    this.updateHUD(gameState.get('character'));
                }
            });
        }

        // Long rest button
        const longRestBtn = document.getElementById('longRestBtn');
        if (longRestBtn) {
            longRestBtn.addEventListener('click', async () => {
                const result = await restManager.longRest();
                if (result.success) {
                    restManager.closeRestMenu();
                    this.updateHUD(gameState.get('character'));
                }
            });
        }

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
