/**
 * Save Manager
 * Handles serializing game state and persisting it through a save store
 */

import { gameState } from '../core/GameState.js';
import { RULES } from '../core/rulesEngine.js';
import { Character } from './Character.js';
import { LocalSaveStore } from './saveStores/LocalSaveStore.js';
import { CloudSaveStore } from './saveStores/CloudSaveStore.js';

function createSaveStore(version) {
    return RULES.saves.backend === 'cloud'
        ? new CloudSaveStore(version)
        : new LocalSaveStore(version);
}

class SaveManager {
    constructor() {
        this.version = '1.0.0';
        this.maxSlots = RULES.saves.maxSlots;
        this.store = createSaveStore(this.version);
    }

    /**
     * Get all save slot metadata
     * @returns {Promise<Object>} Metadata for all save slots
     */
    async getSaveSlots() {
        return this.store.getSlots();
    }

    /**
     * Save current game to a slot
     * @param {number} slotId - Save slot ID (1-5)
     * @returns {Object} { success: boolean, message: string }
     */
    async saveGame(slotId) {
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

            const result = await this.store.write(slotId, saveData, this.buildSlotMetadata(slotId, saveData));

            const elapsed = performance.now() - startTime;
            console.log(`💾 Game saved to slot ${slotId} in ${elapsed.toFixed(2)}ms`);

            return {
                success: true,
                message: result.warning || `Game saved to slot ${slotId}`,
                synced: result.synced,
                elapsed: elapsed
            };

        } catch (error) {
            console.error('Save error:', error);

            // Special handling for quota exceeded
            if (error.name === 'QuotaExceededError') {
                return {
                    success: false,
                    message: 'Save file too large! Try saving in a different slot or clearing old saves.'
                };
            }

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
    async loadGame(slotId) {
        const startTime = performance.now();

        try {
            // Validate slot ID
            if (slotId < 1 || slotId > this.maxSlots) {
                return { success: false, message: `Invalid slot ID: ${slotId}` };
            }

            const saveData = await this.store.read(slotId);

            if (!saveData) {
                return { success: false, message: 'Save slot is empty!' };
            }

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
    async deleteSave(slotId) {
        try {
            // Validate slot ID
            if (slotId < 1 || slotId > this.maxSlots) {
                return { success: false, message: `Invalid slot ID: ${slotId}` };
            }

            const result = await this.store.remove(slotId);

            console.log(`🗑️ Save slot ${slotId} deleted`);

            return {
                success: true,
                message: result.warning || `Save slot ${slotId} deleted`,
                synced: result.synced
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

        // Snapshot weapon masteries explicitly for redundancy (helps migrate older saves)
        const weaponMasteries = Array.isArray(state.character?.weaponMasteries)
            ? [...state.character.weaponMasteries]
            : [];
        const gold = Number(state.character?.gold) || 0;

        // Serialize party companions (mirrors GameState.toJSON logic)
        const party = {
            companions: (state.party?.companions || []).map(c => ({
                characterData: c.toJSON ? c.toJSON() : c,
                companionMeta: { ...c.companionMeta, devotedPassiveUsedThisRest: false }
            }))
            // candidates intentionally omitted — transient, never persisted
        };

        // Capture dungeon exit position so we can place the player on the world map on load
        // (we never save active dungeon state — player is exited to world map on load)
        const dungeonExitPosition = state.dungeon?.active
            ? (state.dungeon.worldMapPosition || state.world?.currentLocation || { x: 0, y: 0 })
            : null;

        return {
            version: this.version,
            timestamp: Date.now(),
            seed: state.seed,
            worldConfig: state.worldConfig,
            character: this.serializeCharacter(state.character),
            weaponMasteries, // duplicate for backward compatibility/migration
            gold, // duplicate gold for backward compatibility/migration
            world: this.serializeWorld(state.world),
            playerPosition: dungeonExitPosition || state.world?.currentLocation || { x: 0, y: 0 },
            quests: {
                available: state.quests?.available || [],
                active: state.quests?.active || [],
                completed: state.quests?.completed || [],
                failed: state.quests?.failed || [],
                campaignProgress: state.quests?.campaignProgress || { currentStage: 1 }
            },
            party,
            fallenCompanions: [...(state.fallenCompanions || [])],
            rest: {
                shortRestsUsed: state.rest?.shortRestsUsed || 0,
                lastLongRest: state.rest?.lastLongRest || null
            },
            fatigue: state.fatigue ? { ...state.fatigue } : null,
            encounterAccumulator: state.player?.encounterAccumulator || 0,
            flags: { ...(state.flags || {}) },
            stats: { ...(state.stats || {}) },
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

        const savedWeaponMasteries = Array.isArray(saveData.weaponMasteries)
            ? saveData.weaponMasteries
            : [];
        const savedGold = Number(saveData.gold) || 0;

        // Restore character by creating a new Character instance with saved data
        if (saveData.character) {
            // Backfill missing fields from older saves
            const characterData = {
                ...saveData.character,
                weaponMasteries: saveData.character.weaponMasteries || savedWeaponMasteries || [],
                gold: saveData.character.gold !== undefined ? saveData.character.gold : savedGold,
                fightingStyle: saveData.character.fightingStyle !== undefined ? saveData.character.fightingStyle : null,
                abilityUses: saveData.character.abilityUses || {},
                baseAbilities: saveData.character.baseAbilities || saveData.character.abilities
            };

            // Create proper Character instance using fromJSON (which calls constructor)
            const character = Character.fromJSON(characterData);

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

        // Restore quests (full state including available, failed, campaignProgress)
        gameState.set('quests', {
            available: saveData.quests?.available || [],
            active: saveData.quests?.active || [],
            completed: saveData.quests?.completed || [],
            failed: saveData.quests?.failed || [],
            campaignProgress: saveData.quests?.campaignProgress || { currentStage: 1 }
        });

        // Restore party companions (Character instances with companionMeta)
        if (saveData.party?.companions?.length) {
            const companions = saveData.party.companions.map(entry => {
                const character = Character.fromJSON(entry.characterData);
                character.companionMeta = {
                    ...entry.companionMeta,
                    devotedPassiveUsedThisRest: false   // always reset on load
                };
                return character;
            });
            gameState.set('party', {
                companions,
                candidates: [],
                activeSynergies: { vanguard: false, arcaneAssembly: false, bandOfRogues: false, trueParty: false }
            });
        } else {
            gameState.set('party', {
                companions: [],
                candidates: [],
                activeSynergies: { vanguard: false, arcaneAssembly: false, bandOfRogues: false, trueParty: false }
            });
        }

        // Restore fallen companions
        gameState.set('fallenCompanions', saveData.fallenCompanions || []);

        // Restore rest state
        gameState.set('rest', {
            shortRestsUsed: saveData.rest?.shortRestsUsed || 0,
            lastLongRest: saveData.rest?.lastLongRest || null
        });

        // Restore fatigue state (always set to avoid null causing system errors)
        gameState.set('fatigue', saveData.fatigue ? { ...saveData.fatigue } : {
            current: 0,
            exhaustionLevels: 0,
            supplies: 3,
            suppliesZeroStreak: 0,
            lastThreshold: 'rested'
        });

        // Restore encounter accumulator
        gameState.set('player.encounterAccumulator', saveData.encounterAccumulator || 0);

        // Restore quest/story flags
        gameState.set('flags', saveData.flags || {});

        // Restore statistics (merge saved stats, preserve playTime from playtime field for backward compat)
        gameState.set('stats', {
            playTime: saveData.playtime || saveData.stats?.playTime || 0,
            combatsWon: saveData.stats?.combatsWon || 0,
            combatsLost: saveData.stats?.combatsLost || 0,
            questsCompleted: saveData.stats?.questsCompleted || 0,
            enemiesDefeated: saveData.stats?.enemiesDefeated || 0,
            deaths: saveData.stats?.deaths || 0
        });

        // Restore factions (reconstruct Map)
        gameState.set('factions', this.deserializeMap(saveData.factions));

        // Restore UI state
        gameState.set('ui.currentScreen', saveData.ui?.currentScreen || 'game');

        // Clear dungeon state — never restore active dungeons, player exits to world map on load
        gameState.set('dungeon', {
            active: false,
            dungeonId: null,
            dungeonTypeId: null,
            dungeonTypeName: null,
            currentRoomIndex: 0,
            playerPosition: null,
            worldMapPosition: null,
            rooms: null,
            roomsExplored: [],
            bossDefeated: false
        });

        // Store explicit player position as transient field for reinitializeGameAfterLoad.
        // playerPosition is the authoritative saved position (may be dungeon exit point).
        // Falls back to world.currentLocation from the saved world object for older saves.
        if (saveData.playerPosition) {
            gameState.set('_loadedPlayerPosition', saveData.playerPosition);
        } else if (saveData.world?.currentLocation) {
            gameState.set('_loadedPlayerPosition', saveData.world.currentLocation);
        }

        // Clear combat state (don't save/load active combat)
        gameState.set('combat', null);
    }

    /**
     * Serialize character object
     * @param {Object} character - Character instance
     * @returns {Object} Serialized character
     */
    serializeCharacter(character) {
        if (!character) {
            return null;
        }

        // Use Character's toJSON method if available, otherwise manually serialize
        if (typeof character.toJSON === 'function') {
            return character.toJSON();
        }

        // Fallback: Create plain object copy (handle Character class instance)
        return {
            id: character.id,
            name: character.name,
            avatar: character.avatar || null,
            species: character.species,
            class: character.class,
            background: character.background,
            fightingStyle: character.fightingStyle || null,
            level: character.level,
            xp: character.xp,
            baseAbilities: character.baseAbilities,
            abilities: character.abilities,
            abilityModifiers: character.abilityModifiers,
            proficiencyBonus: character.proficiencyBonus,
            maxHP: character.maxHP,
            currentHP: character.currentHP,
            tempHP: character.tempHP || 0,
            ac: character.ac,
            speed: character.speed,
            hitDice: character.hitDice,
            shortRestsUsed: character.shortRestsUsed,
            lastLongRest: character.lastLongRest,
            skillChoices: character.skillChoices || [], // Include chosen skill proficiencies
            skills: character.skills,
            savingThrows: character.savingThrows,
            proficiencies: character.proficiencies,
            weaponMasteries: character.weaponMasteries || [],
            abilityUses: character.abilityUses || {},
            gold: character.gold,
            equipment: character.equipment,
            inventory: character.inventory,
            spellcasting: character.spellcasting,
            features: character.features,
            conditions: character.conditions || [],
            effects: character.effects || [],
            position: character.position,
            isNPC: character.isNPC || false,
            isHostile: character.isHostile || false,
            faction: character.faction || null
        };
    }

    /**
     * Serialize world object (compress terrain data, keep important state)
     * @param {Object} world - World state
     * @returns {Object} Serialized world
     */
    serializeWorld(world) {
        if (!world) {
            return null;
        }

        const allRegions = world.generatedRegions || world.regions;
        const compressedRegions = new Map();

        if (allRegions && allRegions instanceof Map) {
            for (const [key, region] of allRegions.entries()) {
                // Only save fog of war and features, NOT terrain (it's regenerated from seed)
                const compressedRegion = {
                    // Save only explored/visible tiles (sparse array)
                    exploredTiles: this.compressFogOfWar(region.tiles),
                    // Save features (settlements, dungeons, etc.)
                    features: region.features || [],
                    // Save any modifications player made
                    modifications: region.modifications || []
                };

                compressedRegions.set(key, compressedRegion);
            }
        }

        const originalSize = allRegions?.size || 0;
        const compressedSize = JSON.stringify(Array.from(compressedRegions.entries())).length;
        console.log(`💾 Compressed ${originalSize} regions to ${(compressedSize / 1024).toFixed(2)} KB`);

        return {
            regions: this.serializeMap(compressedRegions),
            settlements: world.settlements || [],
            npcs: this.serializeMap(world.npcs),
            currentLocation: world.currentLocation || { x: 0, y: 0 },
            modifiedTiles: world.modifiedTiles || [],
            metadata: world.metadata || null,
            visitCount: world.visitCount || 0,
            pendingEvents: world.pendingEvents || [],
            worldClock: world.worldClock || 0
        };
    }

    /**
     * Compress fog of war data (only save explored/visible tiles)
     * @param {Array} tiles - 2D array of tile data
     * @returns {Array} Compressed tile data (sparse array)
     */
    compressFogOfWar(tiles) {
        if (!tiles || !Array.isArray(tiles)) {
            return [];
        }

        const compressed = [];

        for (let y = 0; y < tiles.length; y++) {
            for (let x = 0; x < tiles[y].length; x++) {
                const tile = tiles[y][x];
                // Only save tiles that have been explored or modified
                if (tile && (tile.explored || tile.visible || tile.modified)) {
                    compressed.push({
                        x,
                        y,
                        explored: tile.explored || false,
                        visible: tile.visible || false,
                        modified: tile.modified || false
                    });
                }
            }
        }

        return compressed;
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
     * Build save slot metadata for the slot list
     * @param {number} slotId - Save slot ID
     * @param {Object} saveData - Save data to extract metadata from
     * @returns {Object} Slot metadata
     */
    buildSlotMetadata(slotId, saveData) {
        const character = saveData.character;
        const world = saveData.world;

        return {
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
    }

    /**
     * Export save to downloadable file (no compression, full data)
     * @param {number} slotId - Save slot ID (1-5) or 0 for current game
     * @returns {Object} { success: boolean, message: string }
     */
    async exportSaveToFile(slotId = 0) {
        try {
            let saveData;

            if (slotId === 0) {
                // Export current game state (full data, no compression)
                saveData = this.serializeGameStateFull();
            } else {
                saveData = await this.store.read(slotId);
                if (!saveData) {
                    return { success: false, message: `No save in slot ${slotId}` };
                }
            }

            // Create filename
            const character = saveData.character;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `nexus-verge-${character?.name || 'save'}-lvl${character?.level || 1}-${timestamp}.json`;

            // Create download
            const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);

            console.log(`💾 Save exported to ${filename}`);

            return {
                success: true,
                message: `Save exported to ${filename}`
            };

        } catch (error) {
            console.error('Export error:', error);
            return {
                success: false,
                message: `Failed to export: ${error.message}`
            };
        }
    }

    /**
     * Import save from uploaded file
     * @param {File} file - JSON file to import
     * @returns {Promise<Object>} { success: boolean, message: string, saveData: Object }
     */
    async importSaveFromFile(file) {
        try {
            const text = await file.text();
            const saveData = JSON.parse(text);

            // Validate save data
            if (!saveData.version || !saveData.character || !saveData.seed) {
                return {
                    success: false,
                    message: 'Invalid save file format'
                };
            }

            // Version check
            if (saveData.version !== this.version) {
                console.warn(`⚠️ Save version mismatch: ${saveData.version} vs ${this.version}`);
            }

            console.log(`📂 Save imported from ${file.name}`);

            return {
                success: true,
                message: `Save imported from ${file.name}`,
                saveData: saveData
            };

        } catch (error) {
            console.error('Import error:', error);
            return {
                success: false,
                message: `Failed to import: ${error.message}`
            };
        }
    }

    /**
     * Serialize game state with FULL data (no compression)
     * Used for file exports where size doesn't matter
     * @returns {Object} Full serialized game state
     */
    serializeGameStateFull() {
        // Delegate to serializeGameState but replace world with full (uncompressed) version.
        const base = this.serializeGameState();
        base.world = this.serializeWorldFull(gameState.data.world);
        return base;
    }

    /**
     * Serialize world with FULL data (all regions, all tiles)
     * @param {Object} world - World state
     * @returns {Object} Full serialized world
     */
    serializeWorldFull(world) {
        if (!world) {
            return null;
        }

        const allRegions = world.generatedRegions || world.regions;

        console.log(`💾 Exporting ${allRegions?.size || 0} regions (FULL DATA)`);

        return {
            regions: this.serializeMap(allRegions), // ALL data, no compression
            settlements: world.settlements || [],
            npcs: this.serializeMap(world.npcs),
            currentLocation: world.currentLocation || { x: 0, y: 0 },
            modifiedTiles: world.modifiedTiles || [],
            metadata: world.metadata || null
        };
    }

    /**
     * Get location name from coordinates
     * @param {Object} coords - { x, y }
     * @returns {string} Location description
     */
    getLocationName(coords) {
        if (!coords) {
            return 'Unknown';
        }
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
     * @returns {Promise<Object>} Save result
     */
    async quickSave() {
        return this.saveGame(1);
    }

    /**
     * Quick load from slot 1
     * @returns {Promise<Object>} Load result
     */
    async quickLoad() {
        return this.loadGame(1);
    }
}

// Export singleton instance
const saveManager = new SaveManager();
export default saveManager;
