/**
 * Nexus Verge - Main Entry Point
 * Bootstraps the application and handles screen transitions
 */

import { gameState } from './core/GameState.js';
import { generateSeedString } from './utils/rng.js';
import CharacterCreationUI from './ui/CharacterCreation.js';

class Game {
    constructor() {
        this.characterCreationUI = null;
        this.currentScreen = null;
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
    initGameScreen() {
        console.log('🎮 Initializing game screen...');

        const character = gameState.get('character');
        if (!character) {
            console.error('No character found!');
            this.showScreen('mainMenu');
            return;
        }

        // Update HUD
        this.updateHUD(character);

        // Add welcome message
        gameState.addMessage(`Welcome to Nexus Verge, ${character.name}!`, 'success');
        gameState.addMessage(`You are a Level ${character.level} ${character.race.name} ${character.class.name}.`, 'info');
        gameState.addMessage('Use WASD or Arrow keys to move.', 'info');

        // TODO: Initialize world generation and map renderer
        console.log('⚠️ World generation not yet implemented');
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
