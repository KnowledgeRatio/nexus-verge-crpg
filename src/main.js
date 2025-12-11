/**
 * Nexus Verge - Main Entry Point
 * Bootstraps the application and handles screen transitions
 */

import { gameState } from './core/GameState.js';
import { generateSeedString } from './utils/rng.js';
import CharacterCreationUI from './ui/CharacterCreation.js';
import WorldGenerator from './systems/WorldGenerator.js';
import MapRenderer from './rendering/MapRenderer.js';
import CombatRenderer from './rendering/CombatRenderer.js';
import Player from './systems/Player.js';
import CombatManager from './systems/CombatManager.js';

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

        // Start game loop
        this.startGameLoop();

        console.log('✅ Game initialized successfully');
    }

    /**
     * Initialize combat screen
     */
    async initCombatScreen() {
        console.log('⚔️ Initializing combat screen...');

        // Initialize combat renderer if needed
        if (!this.combatRenderer) {
            this.combatRenderer = new CombatRenderer('combatCanvas', {
                tileSize: 40
            });
        }

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

        // Setup combat input
        this.setupCombatInput();

        // Setup combat UI
        this.setupCombatUI();

        console.log('✅ Combat screen initialized');
    }

    /**
     * Setup combat input handlers
     */
    setupCombatInput() {
        // Remove any existing handlers
        if (this.combatClickHandler) {
            this.combatRenderer.canvas.removeEventListener('click', this.combatClickHandler);
        }

        // Add click handler for combat grid
        this.combatClickHandler = (e) => {
            console.log('🖱️ Canvas clicked!', e);
            const rect = this.combatRenderer.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            console.log('Click coords:', x, y, 'Rect:', rect);

            const gridPos = this.combatRenderer.screenToGrid(x, y);
            console.log('Grid position:', gridPos);
            this.handleCombatClick(gridPos.x, gridPos.y);
        };

        console.log('✅ Adding click handler to combat canvas');
        this.combatRenderer.canvas.addEventListener('click', this.combatClickHandler);
        console.log('Canvas element:', this.combatRenderer.canvas);

        // Add keyboard handler for ending turn
        this.combatKeyHandler = (e) => {
            if (e.key.toLowerCase() === 'enter' || e.key === ' ') {
                e.preventDefault();
                const currentCombatant = this.combatManager.getCurrentCombatant();
                if (currentCombatant && currentCombatant.team === 'player') {
                    this.combatManager.endTurn();
                }
            }
        };

        document.addEventListener('keydown', this.combatKeyHandler);
    }

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
            this.updateCombatUI(combatState);
        });

        // Initial update
        const combatState = gameState.get('combat');
        if (combatState) {
            this.updateCombatUI(combatState);
        }
    }

    /**
     * Update combat UI with current state
     */
    updateCombatUI(combatState) {
        // Update turn order
        const turnOrderEl = document.getElementById('turnOrder');
        if (turnOrderEl && this.combatManager) {
            const turnOrder = this.combatManager.turnOrder || [];
            const currentCombatant = this.combatManager.getCurrentCombatant();

            turnOrderEl.innerHTML = `
                <h4 style="margin-bottom: 10px; color: #ffd700;">Turn Order - Round ${combatState.round || 1}</h4>
                ${turnOrder.map(c => {
                    const isCurrent = c.id === currentCombatant?.id;
                    const isDead = c.hp <= 0;
                    const style = isCurrent ? 'background: #4a9eff; color: #000; font-weight: bold;' :
                                 isDead ? 'opacity: 0.5; text-decoration: line-through;' : '';
                    const team = c.team === 'player' ? '🛡️' : '⚔️';
                    return `<div style="padding: 6px; margin-bottom: 4px; ${style}">
                        ${team} ${c.name} (HP: ${c.hp}/${c.maxHP})
                    </div>`;
                }).join('')}
            `;
        }

        // Update combat actions
        const actionsEl = document.getElementById('combatActions');
        if (actionsEl && this.combatManager) {
            const currentCombatant = this.combatManager.getCurrentCombatant();

            if (currentCombatant && currentCombatant.team === 'player') {
                actionsEl.innerHTML = `
                    <h4 style="margin-bottom: 10px; color: #44ff44;">Your Turn</h4>
                    <div style="font-size: 0.9rem; line-height: 1.6;">
                        <p><strong>Actions Available:</strong></p>
                        <ul style="margin-left: 20px; margin-bottom: 10px;">
                            <li>✅ Action: ${currentCombatant.actions.action ? 'Available' : 'Used'}</li>
                            <li>✅ Movement: ${currentCombatant.actions.movement} squares</li>
                            <li>✅ Bonus: ${currentCombatant.actions.bonus ? 'Available' : 'Used'}</li>
                        </ul>
                        <p><strong>How to Play:</strong></p>
                        <ul style="margin-left: 20px; font-size: 0.85rem;">
                            <li><strong>Click enemy</strong> to attack</li>
                            <li><strong>Click tile</strong> to move</li>
                            <li><strong>Press Enter</strong> to end turn</li>
                        </ul>
                    </div>
                    <button id="endTurnBtn" style="width: 100%; padding: 10px; margin-top: 10px;
                        background: #ff4444; border: none; color: white; cursor: pointer;
                        font-family: monospace; font-size: 1rem;">
                        End Turn
                    </button>
                `;

                // Add end turn button handler
                const endTurnBtn = document.getElementById('endTurnBtn');
                if (endTurnBtn) {
                    endTurnBtn.addEventListener('click', () => {
                        this.combatManager.endTurn();
                    });
                }
            } else if (currentCombatant) {
                actionsEl.innerHTML = `
                    <h4 style="margin-bottom: 10px; color: #ff4444;">Enemy Turn</h4>
                    <div style="font-size: 0.9rem; line-height: 1.6;">
                        <p>${currentCombatant.name} is taking their turn...</p>
                        <p style="color: #888; font-size: 0.85rem; margin-top: 10px;">Wait for them to finish.</p>
                    </div>
                `;
            }
        }
    }

    /**
     * Handle combat grid click
     */
    handleCombatClick(gridX, gridY) {
        console.log(`🖱️ COMBAT CLICK at grid position (${gridX}, ${gridY})`);
        console.log('Combat Manager active?', this.combatManager?.active);

        if (!this.combatManager || !this.combatManager.active) {
            console.log('⚠️ Combat manager not active!');
            return;
        }

        const currentCombatant = this.combatManager.getCurrentCombatant();
        console.log('Current combatant:', currentCombatant?.name, 'Team:', currentCombatant?.team);

        if (!currentCombatant || currentCombatant.team !== 'player') {
            gameState.addMessage("It's not your turn!", 'error');
            console.log('⚠️ Not player turn!');
            return;
        }

        const combatState = gameState.get('combat');
        if (!combatState) {
            console.log('⚠️ No combat state!');
            return;
        }

        console.log('Combat state:', combatState);
        console.log('Grid positions:', combatState.grid.positions);
        console.log('Looking for enemy at', gridX, gridY);

        // Check if clicked on an enemy
        const clickedEnemy = combatState.grid.positions.find(p => {
            console.log(`Checking position ${p.x},${p.y} vs click ${gridX},${gridY}`);
            return p.x === gridX && p.y === gridY;
        });

        console.log('Found position:', clickedEnemy);

        if (clickedEnemy) {
            const combatantAtPos = combatState.combatants.find(c => c.id === clickedEnemy.id);
            console.log('Combatant at position:', combatantAtPos);

            if (combatantAtPos && combatantAtPos.team === 'enemy') {
                console.log('✅ Found enemy!', combatantAtPos.name);
                const enemyCombatant = this.combatManager.enemyCombatants.find(e => e.id === clickedEnemy.id);
                console.log('Enemy combatant object:', enemyCombatant);

                if (enemyCombatant && enemyCombatant.hp > 0) {
                    console.log('🗡️ ATTACKING ENEMY:', enemyCombatant.name);
                    // Attack the enemy
                    this.combatManager.attack(this.combatManager.playerCombatant, enemyCombatant);
                    // Force UI update
                    setTimeout(() => {
                        const combatState = gameState.get('combat');
                        if (combatState) this.updateCombatUI(combatState);
                    }, 100);
                } else {
                    console.log('⚠️ Enemy is dead or not found');
                }
            } else {
                console.log('Not an enemy - trying to move instead');
            }

            if (!combatantAtPos || combatantAtPos.team !== 'enemy') {
                // Not an enemy, try to move
                if (currentCombatant.actions.movement > 0) {
                    console.log('Moving to', gridX, gridY);
                    this.combatManager.move(currentCombatant, gridX, gridY);
                    // Force UI update
                    setTimeout(() => {
                        const combatState = gameState.get('combat');
                        if (combatState) this.updateCombatUI(combatState);
                    }, 100);
                } else {
                    gameState.addMessage("No movement left!", 'error');
                }
            }
            return;
        }

        // Otherwise, try to move there
        if (currentCombatant.actions.movement > 0) {
            this.combatManager.move(currentCombatant, gridX, gridY);
            // Force UI update
            setTimeout(() => {
                const combatState = gameState.get('combat');
                if (combatState) this.updateCombatUI(combatState);
            }, 100);
        } else {
            gameState.addMessage("No movement left!", 'error');
        }
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

        // Subscribe to character HP changes
        gameState.subscribe('character.currentHP', (hp) => {
            if (hpDisplay) {
                hpDisplay.textContent = `HP: ${hp}/${character.maxHP}`;
            }
        });
    }

    /**
     * Show load game screen
     */
    showLoadGameScreen() {
        // TODO: Implement save/load system
        alert('Load Game feature not yet implemented. Coming in Phase 1 Day 2!');
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
