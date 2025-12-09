/**
 * Player System
 * Handles player input, movement, and exploration
 */

import { gameState } from '../core/GameState.js';

class Player {
    constructor(worldGenerator, mapRenderer) {
        this.worldGenerator = worldGenerator;
        this.mapRenderer = mapRenderer;

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

        return true;
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

        if (Math.random() < encounterChance * 0.05) { // 5% base, modified by terrain
            gameState.addMessage('⚔️ A hostile creature appears!', 'warning');
            // TODO: Trigger combat encounter
            console.log('🎲 Encounter triggered!');
        }
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
     * Action handlers
     */
    openInventory() {
        gameState.addMessage('📦 Inventory opened (not yet implemented)', 'info');
        // TODO: Show inventory UI
    }

    openCharacterSheet() {
        gameState.addMessage('📊 Character sheet opened (not yet implemented)', 'info');
        // TODO: Show character sheet UI
    }

    openQuestLog() {
        gameState.addMessage('📜 Quest log opened (not yet implemented)', 'info');
        // TODO: Show quest log UI
    }

    openMap() {
        gameState.addMessage('🗺️ Map opened (not yet implemented)', 'info');
        // TODO: Show full map UI
    }

    rest() {
        gameState.addMessage('😴 Rest system not yet implemented', 'info');
        // TODO: Show rest options
    }

    interact() {
        gameState.addMessage('👋 Interact with nearby objects (not yet implemented)', 'info');
        // TODO: Check for nearby NPCs/objects
    }

    showHelp() {
        gameState.addMessage('❓ Press H for help (help UI not yet implemented)', 'info');
        // TODO: Show help overlay
    }
}

export default Player;
