/**
 * Player System
 * Handles player input, movement, and exploration
 */

import { gameState } from '../core/GameState.js';
import restManager from './RestManager.js';

class Player {
    constructor(worldGenerator, mapRenderer, settlementManager = null) {
        this.worldGenerator = worldGenerator;
        this.mapRenderer = mapRenderer;
        this.settlementManager = settlementManager;

        // Player position (world coordinates)
        this.x = 0;
        this.y = 0;

        // Input state
        this.keys = new Set();
        this.moveDelay = 150; // ms between moves
        this.lastMoveTime = 0;

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
        gameState.addMessage(`You awaken in an unfamiliar land...`, 'info');

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
        switch(key) {
            case 'e':
                this.enterSettlement();
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
        const now = Date.now();
        if (now - this.lastMoveTime < this.moveDelay) {
            return; // Too soon
        }

        let dx = 0, dy = 0;

        switch(key) {
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

        if (!terrainDef.traversable) {
            gameState.addMessage(`You cannot move there - ${terrainDef.description}`, 'error');
            return false;
        }

        // Move successful
        this.x = newX;
        this.y = newY;

        // Update game state
        gameState.set('player.position', { x: this.x, y: this.y });
        gameState.set('world.currentLocation', { x: this.x, y: this.y });

        // Mark tile as explored
        tile.explored = true;
        tile.visible = true;

        // Update visibility
        await this.updateVisibility();

        // Show terrain description occasionally
        if (Math.random() < 0.1) {
            gameState.addMessage(terrainDef.description, 'info');
        }

        // Check for encounters
        this.checkForEncounters(tile, terrainDef);

        // Check for features
        if (tile.feature) {
            this.handleFeature(tile.feature);
        }

        // Check for settlements
        this.checkForSettlement();

        return true;
    }

    /**
     * Check if player is at a settlement
     */
    checkForSettlement() {
        if (!this.settlementManager) return;

        const settlement = this.settlementManager.getSettlementAtPlayerPosition();
        if (settlement) {
            gameState.addMessage(`🏘️ Press E to enter ${settlement.name}`, 'info');
        }
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
        // Skip encounters in dev mode
        if (gameState.get('devMode')) {
            return;
        }

        const encounterChance = terrainDef.encounterModifier || 0.1;

        if (Math.random() < encounterChance * 0.04) { // 4% base, modified by terrain
            gameState.addMessage('⚔️ A hostile creature appears!', 'warning');
            this.triggerCombatEncounter();
        }
    }

    /**
     * Trigger a combat encounter
     */
    async triggerCombatEncounter() {
        // Generate enemies based on player level
        const playerLevel = gameState.get('character.level') || 1;

        // Import rules engine to get encounter size
        const { RULES } = await import('../core/rulesEngine.js');
        const { min, max } = RULES.encounters.encounterSize;

        // Calculate number of enemies (scaled by level if enabled)
        let numEnemies = Math.floor(Math.random() * (max - min + 1)) + min;

        // Scale with level if configured
        if (RULES.encounters.encounterSize.scaleWithLevel) {
            // At level 1-2: 1-2 enemies
            // At level 3-4: 1-3 enemies
            // At level 5+: full range
            if (playerLevel <= 2) {
                numEnemies = Math.min(numEnemies, 2);
            } else if (playerLevel <= 4) {
                // Already within 1-3 range
            }
        }

        const enemies = [];
        for (let i = 0; i < numEnemies; i++) {
            const enemy = await this.generateEnemy(playerLevel);
            enemies.push(enemy);
        }

        // Trigger combat event
        gameState.set('ui.pendingCombat', { enemies });
        gameState.set('ui.currentScreen', 'combatScreen');
    }

    /**
     * Generate an enemy for encounter
     */
    async generateEnemy(playerLevel) {
        // Load monster data
        const response = await fetch('data/monsters.json');
        const monsterData = await response.json();

        // Import dice rolling function and rules engine
        const { roll } = await import('../utils/dice.js');
        const { getEncounterCR, RULES } = await import('../core/rulesEngine.js');

        // Get difficulty setting
        const difficulty = gameState.get('worldConfig.difficulty') || 'normal';

        // Use rules engine to calculate target CR
        const targetCR = getEncounterCR(playerLevel, difficulty);

        // Get appropriate monster types for level (if defined)
        const levelBrackets = Object.entries(RULES.difficulty.scalingByLevel.enemyTypesByLevel)
            .map(([level, types]) => ({level: parseInt(level), types}))
            .sort((a, b) => b.level - a.level); // Sort descending

        let allowedTypes = null;
        for (const {level, types} of levelBrackets) {
            if (playerLevel >= level) {
                allowedTypes = types;
                break;
            }
        }

        // Filter by appropriate CR (within ±1 of target) and optionally by type
        let appropriateMonsters = monsterData.monsters.filter(m => {
            const cr = m.challengeRating || 0.25;
            const crMatch = cr >= targetCR - 1 && cr <= targetCR + 1;
            
            // If level-based types are defined, also filter by type
            if (allowedTypes && allowedTypes.length > 0) {
                const typeMatch = allowedTypes.some(type => 
                    m.type.toLowerCase().includes(type.toLowerCase()) ||
                    m.name.toLowerCase().includes(type.toLowerCase())
                );
                return crMatch && typeMatch;
            }
            
            return crMatch;
        });

        // Fallback: If no monsters match, widen CR range but keep type restrictions
        if (appropriateMonsters.length === 0) {
            appropriateMonsters = monsterData.monsters.filter(m => {
                const cr = m.challengeRating || 0.25;
                const crMatch = cr >= targetCR - 2 && cr <= targetCR + 2;

                // Still enforce type restrictions if they exist
                if (allowedTypes && allowedTypes.length > 0) {
                    const typeMatch = allowedTypes.some(type =>
                        m.type.toLowerCase().includes(type.toLowerCase()) ||
                        m.name.toLowerCase().includes(type.toLowerCase())
                    );
                    return crMatch && typeMatch;
                }

                return crMatch;
            });
        }

        // Final fallback: Get any low-CR monster
        const monster = appropriateMonsters[Math.floor(Math.random() * appropriateMonsters.length)]
            || monsterData.monsters.reduce((lowest, m) => 
                (m.challengeRating || 0.25) < (lowest.challengeRating || 0.25) ? m : lowest
            );

        // Roll HP from dice notation
        const hp = roll(monster.hitPoints);

        // Create enemy character from monster data
        return {
            name: monster.name,
            race: { name: monster.type },
            class: { name: 'Monster' },
            level: playerLevel,
            cr: monster.challengeRating,
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
            }
        };
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
        // Help overlay - TODO: Implement help UI
        gameState.addMessage('❓ Press H for help (help UI not yet implemented)', 'info');
    }
}

export default Player;
