/**
 * GameState - Centralized State Management with Observer Pattern
 * Single source of truth for all game state
 */

import { getNestedProperty, setNestedProperty } from '../utils/helpers.js';

export class GameState {
    constructor() {
        // Game state data
        this.data = {
            // Game metadata
            version: "1.0.0",
            seed: null,
            worldConfig: {
                mapSize: "medium",
                difficulty: "normal",
                campaignId: null
            },

            // Character
            character: null,

            // World state
            world: {
                generatedRegions: new Map(),  // regionKey -> region data
                settlements: [],
                npcs: new Map(),              // npcId -> npc
                modifiedTiles: []             // tiles changed by quests/events
            },

            // Quests
            quests: {
                active: [],
                completed: [],
                failed: [],
                campaignProgress: {
                    currentStage: 1
                }
            },

            // Factions and reputation
            factions: {},  // factionId -> reputation (0-100)

            // Combat state (null when not in combat)
            combat: null,

            // Rest state
            rest: {
                shortRestsUsed: 0,
                lastLongRest: null
            },

            // UI state
            ui: {
                currentScreen: "mainMenu",  // mainMenu, newGame, charCreation, game, combat
                modalOpen: null,
                selectedTile: null,
                hoveredTile: null,
                messageLog: []
            },

            // Flags for quest/story tracking
            flags: {},

            // Dev mode
            devMode: false,

            // Statistics
            stats: {
                playTime: 0,
                combatsWon: 0,
                combatsLost: 0,
                questsCompleted: 0,
                enemiesDefeated: 0,
                deaths: 0
            },

            // Static game data (loaded from JSON files)
            weaponMasteries: null,
            items: null,
            spells: null
        };

        // Observers: path -> array of callbacks
        this.observers = new Map();

        // History for undo/debugging (optional)
        this.history = [];
        this.maxHistory = 50;

        // Playtime tracking
        this.sessionStartTime = null;
        this.playtimeInterval = null;
    }

    /**
     * Subscribe to state changes at a specific path
     * @param {string} path - Dot-notation path (e.g., "character.hp.current")
     * @param {function} callback - Function to call when state changes
     * @returns {function} Unsubscribe function
     */
    subscribe(path, callback) {
        if (!this.observers.has(path)) {
            this.observers.set(path, []);
        }
        this.observers.get(path).push(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.observers.get(path);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        };
    }

    /**
     * Update state and notify observers
     * @param {string} path - Dot-notation path
     * @param {any} value - New value
     */
    update(path, value) {
        // Store old value for history
        const oldValue = getNestedProperty(this.data, path);

        // Update state
        setNestedProperty(this.data, path, value);

        // Add to history
        this.addToHistory(path, oldValue, value);

        // Notify observers
        this.notify(path, value);
    }

    /**
     * Set state value (alias for update)
     * @param {string} path - Dot-notation path
     * @param {any} value - New value
     */
    set(path, value) {
        this.update(path, value);
    }

    /**
     * Get state value at path
     * @param {string} path - Dot-notation path
     * @returns {any} Value at path
     */
    get(path) {
        return getNestedProperty(this.data, path);
    }

    /**
     * Notify all observers of a state change
     * @param {string} path - Path that changed
     * @param {any} value - New value
     */
    notify(path, value) {
        // Notify exact path
        if (this.observers.has(path)) {
            this.observers.get(path).forEach(callback => {
                try {
                    callback(value);
                } catch (error) {
                    console.error(`Error in observer for ${path}:`, error);
                }
            });
        }

        // Notify parent paths (e.g., "character" when "character.hp" changes)
        const parts = path.split('.');
        for (let i = parts.length - 1; i > 0; i--) {
            const parentPath = parts.slice(0, i).join('.');
            if (this.observers.has(parentPath)) {
                const parentValue = getNestedProperty(this.data, parentPath);
                this.observers.get(parentPath).forEach(callback => {
                    try {
                        callback(parentValue);
                    } catch (error) {
                        console.error(`Error in parent observer for ${parentPath}:`, error);
                    }
                });
            }
        }

        // Notify wildcard observers ("*")
        if (this.observers.has('*')) {
            this.observers.get('*').forEach(callback => {
                try {
                    callback({ path, value });
                } catch (error) {
                    console.error('Error in wildcard observer:', error);
                }
            });
        }
    }

    /**
     * Add state change to history
     */
    addToHistory(path, oldValue, newValue) {
        this.history.push({
            timestamp: Date.now(),
            path,
            oldValue,
            newValue
        });

        // Trim history if too long
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    /**
     * Initialize a new game
     */
    initNewGame(seed, worldConfig) {
        this.data.seed = seed;
        this.data.worldConfig = worldConfig;
        this.data.rest.lastLongRest = Date.now();
        this.data.stats.playTime = 0;

        // Initialize empty world
        this.data.world = {
            generatedRegions: new Map(),
            settlements: [],
            npcs: new Map(),
            modifiedTiles: []
        };

        // Initialize quest system
        this.data.quests = {
            available: [],
            active: [],
            completed: [],
            failed: []
        };
        this.data.campaignProgress = 1; // Start at campaign stage 1

        this.notify('game', 'initialized');
    }

    /**
     * Set current character
     */
    setCharacter(character) {
        this.data.character = character;
        this.notify('character', character);
    }

    /**
     * Add message to log
     */
    addMessage(message, type = 'info') {
        this.data.ui.messageLog.push({
            text: message,
            type: type,
            timestamp: Date.now()
        });

        // Keep only last 100 messages
        if (this.data.ui.messageLog.length > 100) {
            this.data.ui.messageLog.shift();
        }

        this.notify('ui.messageLog', this.data.ui.messageLog);
    }

    /**
     * Change current screen
     */
    changeScreen(screenName) {
        this.data.ui.currentScreen = screenName;
        this.notify('ui.currentScreen', screenName);
    }

    /**
     * Start combat
     */
    startCombat(combatData) {
        this.data.combat = combatData;
        this.changeScreen('combat');
        this.notify('combat', combatData);
    }

    /**
     * End combat
     */
    endCombat(victory) {
        if (victory) {
            this.data.stats.combatsWon++;
        } else {
            this.data.stats.combatsLost++;
        }

        this.data.combat = null;
        this.changeScreen('game');
        this.notify('combat', null);
    }

    /**
     * Add quest
     */
    addQuest(quest) {
        this.data.quests.active.push(quest);
        this.notify('quests.active', this.data.quests.active);
        this.addMessage(`New quest: ${quest.name}`, 'info');
    }

    /**
     * Complete quest
     */
    completeQuest(questId) {
        const questIndex = this.data.quests.active.findIndex(q => q.id === questId);
        if (questIndex > -1) {
            const quest = this.data.quests.active.splice(questIndex, 1)[0];
            this.data.quests.completed.push(quest);
            this.data.stats.questsCompleted++;

            this.notify('quests.active', this.data.quests.active);
            this.notify('quests.completed', this.data.quests.completed);
            this.addMessage(`Quest completed: ${quest.name}`, 'success');

            return quest;
        }
        return null;
    }

    /**
     * Modify faction reputation
     */
    modifyReputation(factionId, amount) {
        if (!this.data.factions[factionId]) {
            this.data.factions[factionId] = 0;
        }

        const oldRep = this.data.factions[factionId];
        this.data.factions[factionId] = Math.max(0, Math.min(100, oldRep + amount));

        this.notify(`factions.${factionId}`, this.data.factions[factionId]);

        if (amount > 0) {
            this.addMessage(`Reputation with ${factionId} increased by ${amount}`, 'success');
        } else {
            this.addMessage(`Reputation with ${factionId} decreased by ${Math.abs(amount)}`, 'warning');
        }
    }

    /**
     * Set flag
     */
    setFlag(flagName, value = true) {
        this.data.flags[flagName] = value;
        this.notify(`flags.${flagName}`, value);
    }

    /**
     * Get flag
     */
    getFlag(flagName) {
        return this.data.flags[flagName] || false;
    }

    /**
     * Toggle dev mode
     */
    toggleDevMode() {
        this.data.devMode = !this.data.devMode;
        
        if (this.data.devMode) {
            // Set HP to 9999
            if (this.data.character) {
                this.data.character.maxHP = 9999;
                this.data.character.currentHP = 9999;
            }
            console.log('🔧 Dev Mode ENABLED - 9999 HP, no combat encounters');
        } else {
            console.log('🔧 Dev Mode DISABLED');
        }
        
        this.notify('devMode', this.data.devMode);
        return this.data.devMode;
    }

    /**
     * Serialize state for saving
     */
    toJSON() {
        // Convert Maps to objects for JSON
        const world = {
            ...this.data.world,
            generatedRegions: Array.from(this.data.world.generatedRegions.entries()),
            npcs: Array.from(this.data.world.npcs.entries())
        };

        return {
            ...this.data,
            world,
            character: this.data.character?.toJSON() || null
        };
    }

    /**
     * Load state from saved data
     */
    fromJSON(savedData) {
        // Restore basic data
        this.data = {
            ...savedData,
            world: {
                ...savedData.world,
                generatedRegions: new Map(savedData.world.generatedRegions),
                npcs: new Map(savedData.world.npcs)
            }
        };

        // Restore character if exists
        if (savedData.character) {
            const Character = require('../systems/Character.js').default;
            this.data.character = Character.fromJSON(savedData.character);
        }

        // Notify all observers of full state reload
        this.notify('*', this.data);
    }

    /**
     * Reset to initial state
     */
    reset() {
        this.data = {
            version: "1.0.0",
            seed: null,
            worldConfig: {
                mapSize: "medium",
                difficulty: "normal",
                campaignId: null
            },
            character: null,
            world: {
                generatedRegions: new Map(),
                settlements: [],
                npcs: new Map(),
                modifiedTiles: []
            },
            quests: {
                active: [],
                completed: [],
                failed: [],
                campaignProgress: { currentStage: 1 }
            },
            factions: {},
            combat: null,
            rest: {
                shortRestsUsed: 0,
                lastLongRest: null
            },
            ui: {
                currentScreen: "mainMenu",
                modalOpen: null,
                selectedTile: null,
                hoveredTile: null,
                messageLog: []
            },
            flags: {},
            devMode: false,
            stats: {
                playTime: 0,
                combatsWon: 0,
                combatsLost: 0,
                questsCompleted: 0,
                enemiesDefeated: 0,
                deaths: 0
            }
        };

        this.history = [];
        this.notify('*', this.data);
    }

    /**
     * Load static game data from JSON files
     */
    async loadStaticData() {
        console.log('[DEBUG loadStaticData] Starting to load static data...');
        try {
            // HARDCODED weaponMasteries to bypass JSON loading issues
            const weaponMasteriesData = {
                weaponMasteryAssignments: {
                    assignments: {
                        "club": "slow", "dagger": "nick", "greatclub": "push", "handaxe": "vex",
                        "javelin": "slow", "lightHammer": "nick", "mace": "sap", "quarterstaff": "topple",
                        "sickle": "nick", "spear": "sap", "dart": "vex", "lightCrossbow": "slow",
                        "shortbow": "vex", "sling": "slow", "battleaxe": "topple", "flail": "sap",
                        "glaive": "graze", "greataxe": "cleave", "greatsword": "graze", "halberd": "cleave",
                        "lance": "topple", "longsword": "sap", "maul": "topple", "morningstar": "sap",
                        "pike": "push", "rapier": "vex", "scimitar": "nick", "shortsword": "vex",
                        "trident": "topple", "warhammer": "push", "warpick": "sap", "whip": "slow",
                        "blowgun": "vex", "handCrossbow": "vex", "heavyCrossbow": "push", "longbow": "slow"
                    }
                }
            };
            
            const cacheBust = Date.now();
            const [items, spells] = await Promise.all([
                fetch(`data/items.json?v=${cacheBust}`).then(r => r.json()),
                fetch(`data/spells.json?v=${cacheBust}`).then(r => r.json())
            ]);

            this.data.weaponMasteries = weaponMasteriesData;
            this.data.items = items.items;
            this.data.spells = spells.spells;

            console.log('[DEBUG loadStaticData] weaponMasteries hardcoded:', this.data.weaponMasteries);
            console.log('✅ Static game data loaded');
        } catch (error) {
            console.error('Failed to load static game data:', error);
        }
    }

    /**
     * Debug: Print current state
     */
    debug() {
        console.log('=== GAME STATE DEBUG ===');
        console.log('Seed:', this.data.seed);
        console.log('Character:', this.data.character?.name, 'Level', this.data.character?.level);
        console.log('Current Screen:', this.data.ui.currentScreen);
        console.log('Active Quests:', this.data.quests.active.length);
        console.log('Generated Regions:', this.data.world.generatedRegions.size);
        console.log('Factions:', Object.keys(this.data.factions));
        console.log('In Combat:', this.data.combat !== null);
        console.log('Stats:', this.data.stats);
        console.log('========================');
    }

    /**
     * Debug: Get state change history
     */
    getHistory(count = 10) {
        return this.history.slice(-count);
    }

    /**
     * Start tracking playtime
     */
    startPlaytimeTracking() {
        if (this.playtimeInterval) {
            this.stopPlaytimeTracking();
        }

        this.sessionStartTime = Date.now();

        // Update playtime every second
        this.playtimeInterval = setInterval(() => {
            this.data.stats.playTime += 1000; // Add 1 second
        }, 1000);

        console.log('⏱️ Playtime tracking started');
    }

    /**
     * Stop tracking playtime
     */
    stopPlaytimeTracking() {
        if (this.playtimeInterval) {
            clearInterval(this.playtimeInterval);
            this.playtimeInterval = null;
        }

        if (this.sessionStartTime) {
            // Add final session time
            const sessionTime = Date.now() - this.sessionStartTime;
            this.data.stats.playTime += sessionTime;
            this.sessionStartTime = null;
        }

        console.log('⏱️ Playtime tracking stopped');
    }

    /**
     * Get total playtime in milliseconds
     */
    getPlaytime() {
        return this.data.stats.playTime;
    }
}

// Create and export singleton instance
export const gameState = new GameState();

export default gameState;
