/**
 * Save Manager
 * Handles saving and loading game state to/from LocalStorage
 */

import { gameState } from '../core/GameState.js';

class SaveManager {
    constructor() {
        this.maxSlots = 5;
        this.storagePrefix = 'nexus-verge-save-';
        this.metadataKey = 'nexus-verge-metadata';
        this.version = '1.0.0';
    }

    /**
     * Get all save slot metadata
     * @returns {Object} Metadata for all save slots
     */
    getSaveSlots() {
        const metadata = localStorage.getItem(this.metadataKey);
        if (!metadata) {
            return this.initializeSaveSlots();
        }
        return JSON.parse(metadata);
    }

    /**
     * Initialize empty save slots
     * @returns {Object} Empty save slot metadata
     */
    initializeSaveSlots() {
        const slots = {};
        for (let i = 1; i <= this.maxSlots; i++) {
            slots[i] = {
                slotId: i,
                isEmpty: true,
                characterName: null,
                level: null,
                location: null,
                playtime: 0,
                timestamp: null,
                seed: null,
                version: this.version
            };
        }
        localStorage.setItem(this.metadataKey, JSON.stringify(slots));
        return slots;
    }

    /**
     * Save current game to a slot
     * @param {number} slotId - Save slot ID (1-5)
     * @returns {Object} { success: boolean, message: string }
     */
    saveGame(slotId) {
        const startTime = performance.now();

        try {
            // Validate slot ID
            if (slotId < 1 || slotId > this.maxSlots) {
                return { success: false, message: `Invalid slot ID: ${slotId}` };
            }

            // Check if in combat
            if (gameState.get('combat')) {
                return { success: false, message: 'Cannot save during combat!' };
            }

            // Serialize game state
            const saveData = this.serializeGameState();

            // Save to LocalStorage
            const saveKey = `${this.storagePrefix}${slotId}`;
            localStorage.setItem(saveKey, JSON.stringify(saveData));

            // Update metadata
            this.updateSaveMetadata(slotId, saveData);

            const elapsed = performance.now() - startTime;
            console.log(`💾 Game saved to slot ${slotId} in ${elapsed.toFixed(2)}ms`);

            return {
                success: true,
                message: `Game saved to slot ${slotId}`,
                elapsed: elapsed
            };

        } catch (error) {
            console.error('Save error:', error);
            return {
                success: false,
                message: `Failed to save: ${error.message}`
            };
        }
    }

    /**
     * Load game from a slot
     * @param {number} slotId - Save slot ID (1-5)
     * @returns {Object} { success: boolean, message: string, data: Object }
     */
    loadGame(slotId) {
        const startTime = performance.now();

        try {
            // Validate slot ID
            if (slotId < 1 || slotId > this.maxSlots) {
                return { success: false, message: `Invalid slot ID: ${slotId}` };
            }

            // Check if slot exists and has data
            const metadata = this.getSaveSlots();
            if (metadata[slotId].isEmpty) {
                return { success: false, message: 'Save slot is empty!' };
            }

            // Load from LocalStorage
            const saveKey = `${this.storagePrefix}${slotId}`;
            const saveDataStr = localStorage.getItem(saveKey);

            if (!saveDataStr) {
                return { success: false, message: 'Save data not found!' };
            }

            const saveData = JSON.parse(saveDataStr);

            // Version compatibility check
            if (saveData.version !== this.version) {
                console.warn(`Loading save from version ${saveData.version}, current version is ${this.version}`);
            }

            // Deserialize and restore game state
            this.deserializeGameState(saveData);

            const elapsed = performance.now() - startTime;
            console.log(`📂 Game loaded from slot ${slotId} in ${elapsed.toFixed(2)}ms`);

            return {
                success: true,
                message: `Game loaded from slot ${slotId}`,
                data: saveData,
                elapsed: elapsed
            };

        } catch (error) {
            console.error('Load error:', error);
            return {
                success: false,
                message: `Failed to load: ${error.message}`
            };
        }
    }

    /**
     * Delete a save slot
     * @param {number} slotId - Save slot ID (1-5)
     * @returns {Object} { success: boolean, message: string }
     */
    deleteSave(slotId) {
        try {
            // Validate slot ID
            if (slotId < 1 || slotId > this.maxSlots) {
                return { success: false, message: `Invalid slot ID: ${slotId}` };
            }

            // Delete from LocalStorage
            const saveKey = `${this.storagePrefix}${slotId}`;
            localStorage.removeItem(saveKey);

            // Update metadata to mark slot as empty
            const metadata = this.getSaveSlots();
            metadata[slotId] = {
                slotId: slotId,
                isEmpty: true,
                characterName: null,
                level: null,
                location: null,
                playtime: 0,
                timestamp: null,
                seed: null,
                version: this.version
            };
            localStorage.setItem(this.metadataKey, JSON.stringify(metadata));

            console.log(`🗑️ Save slot ${slotId} deleted`);

            return {
                success: true,
                message: `Save slot ${slotId} deleted`
            };

        } catch (error) {
            console.error('Delete error:', error);
            return {
                success: false,
                message: `Failed to delete: ${error.message}`
            };
        }
    }

    /**
     * Serialize current game state to JSON-compatible object
     * @returns {Object} Serialized game state
     */
    serializeGameState() {
        const state = gameState.data;

        return {
            version: this.version,
            timestamp: Date.now(),
            seed: state.seed,
            worldConfig: state.worldConfig,
            character: this.serializeCharacter(state.character),
            world: this.serializeWorld(state.world),
            quests: state.quests || { active: [], completed: [] },
            factions: this.serializeMap(state.factions),
            playtime: state.stats?.playTime || 0,
            ui: {
                currentScreen: state.ui?.currentScreen || 'game'
            }
        };
    }

    /**
     * Deserialize and restore game state
     * @param {Object} saveData - Serialized save data
     */
    deserializeGameState(saveData) {
        // Restore seed and world config
        gameState.set('seed', saveData.seed);
        gameState.set('worldConfig', saveData.worldConfig);

        // Restore character (need to reconstruct Character instance)
        const Character = window.Character; // Assume Character class is globally available
        if (Character && saveData.character) {
            const character = Object.assign(new Character(), saveData.character);
            gameState.set('character', character);
        } else {
            gameState.set('character', saveData.character);
        }

        // Restore world (reconstruct Map for regions)
        if (saveData.world) {
            const world = {
                ...saveData.world,
                generatedRegions: this.deserializeMap(saveData.world.regions),
                npcs: this.deserializeMap(saveData.world.npcs)
            };
            // Remove the serialized arrays
            delete world.regions;
            gameState.set('world', world);
        }

        // Restore quests
        gameState.set('quests', saveData.quests || { active: [], completed: [] });

        // Restore factions (reconstruct Map)
        gameState.set('factions', this.deserializeMap(saveData.factions));

        // Restore playtime
        gameState.set('stats.playTime', saveData.playtime || 0);

        // Restore UI state
        gameState.set('ui.currentScreen', saveData.ui?.currentScreen || 'game');

        // Clear combat state (don't save/load active combat)
        gameState.set('combat', null);
    }

    /**
     * Serialize character object
     * @param {Object} character - Character instance
     * @returns {Object} Serialized character
     */
    serializeCharacter(character) {
        if (!character) return null;

        // Create plain object copy (handle Character class instance)
        return {
            name: character.name,
            race: character.race,
            class: character.class,
            background: character.background,
            level: character.level,
            xp: character.xp,
            abilities: character.abilities,
            abilityModifiers: character.abilityModifiers,
            proficiencyBonus: character.proficiencyBonus,
            maxHP: character.maxHP,
            currentHP: character.currentHP,
            ac: character.ac,
            speed: character.speed,
            hitDice: character.hitDice,
            shortRestsUsed: character.shortRestsUsed,
            skills: character.skills,
            savingThrows: character.savingThrows,
            proficiencies: character.proficiencies,
            equipment: character.equipment,
            inventory: character.inventory,
            spellcasting: character.spellcasting,
            features: character.features,
            conditions: character.conditions || []
        };
    }

    /**
     * Serialize world object
     * @param {Object} world - World state
     * @returns {Object} Serialized world
     */
    serializeWorld(world) {
        if (!world) return null;

        return {
            regions: this.serializeMap(world.generatedRegions || world.regions),
            settlements: world.settlements || [],
            npcs: this.serializeMap(world.npcs),
            currentLocation: world.currentLocation || { x: 0, y: 0 }
        };
    }

    /**
     * Serialize Map object to array of entries
     * @param {Map} map - Map to serialize
     * @returns {Array} Array of [key, value] pairs
     */
    serializeMap(map) {
        if (!map || !(map instanceof Map)) {
            return [];
        }
        return Array.from(map.entries());
    }

    /**
     * Deserialize array of entries back to Map
     * @param {Array} entries - Array of [key, value] pairs
     * @returns {Map} Reconstructed Map
     */
    deserializeMap(entries) {
        if (!Array.isArray(entries)) {
            return new Map();
        }
        return new Map(entries);
    }

    /**
     * Update save slot metadata
     * @param {number} slotId - Save slot ID
     * @param {Object} saveData - Save data to extract metadata from
     */
    updateSaveMetadata(slotId, saveData) {
        const metadata = this.getSaveSlots();

        const character = saveData.character;
        const world = saveData.world;

        metadata[slotId] = {
            slotId: slotId,
            isEmpty: false,
            characterName: character?.name || 'Unknown',
            level: character?.level || 1,
            class: character?.class?.name || 'Unknown',
            location: this.getLocationName(world?.currentLocation),
            playtime: saveData.playtime || 0,
            timestamp: saveData.timestamp,
            seed: saveData.seed,
            version: saveData.version
        };

        localStorage.setItem(this.metadataKey, JSON.stringify(metadata));
    }

    /**
     * Get location name from coordinates
     * @param {Object} coords - { x, y }
     * @returns {string} Location description
     */
    getLocationName(coords) {
        if (!coords) return 'Unknown';
        return `(${coords.x}, ${coords.y})`;
    }

    /**
     * Format playtime in human-readable format
     * @param {number} milliseconds - Playtime in ms
     * @returns {string} Formatted playtime
     */
    formatPlaytime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Format timestamp in human-readable format
     * @param {number} timestamp - Unix timestamp
     * @returns {string} Formatted date/time
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    /**
     * Auto-save to slot 1 (quick save)
     * @returns {Object} Save result
     */
    quickSave() {
        return this.saveGame(1);
    }

    /**
     * Quick load from slot 1
     * @returns {Object} Load result
     */
    quickLoad() {
        return this.loadGame(1);
    }
}

// Export singleton instance
const saveManager = new SaveManager();
export default saveManager;
