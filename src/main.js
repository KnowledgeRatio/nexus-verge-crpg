/**
 * Nexus Verge - Main Entry Point
 * Bootstraps the application and handles screen transitions
 */

import { gameState } from './core/GameState.js';
import { RULES } from './core/rulesEngine.js';
import { generateSeedString } from './utils/rng.js';
import { rollDice } from './utils/dice.js';
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
import MerchantManager from './systems/MerchantManager.js';
import audioManager from './systems/AudioManager.js';
import skillChallengeManager from './systems/SkillChallengeManager.js';

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

        // Merchant system
        this.merchantManager = null;

        // Skill challenge system
        this.skillChallengeManager = skillChallengeManager;

        // Combat systems
        this.combatManager = null;
        this.combatRenderer = null;

        // Audio system (singleton, initialized on import)
        this.audioManager = audioManager;

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

        // Handle window resize for responsive viewport
        window.addEventListener('resize', () => {
            if (this.mapRenderer && this.currentScreen === 'game') {
                this.handleWindowResize();
            }
        });

        console.log('✅ Game initialized');
    }

    /**
     * Calculate optimal viewport size based on available screen space
     */
    calculateOptimalViewport() {
        const TILE_WIDTH = 16;  // 16x16 pixel art tiles
        const TILE_HEIGHT = 16;
        const SIDE_PANEL_WIDTH = 400; // Widened from 300px
        const HUD_HEIGHT = 60; // Top HUD
        const CONTROLS_HEIGHT = 40; // Bottom controls
        const MIN_WIDTH = 60; // Minimum viewport width in tiles (adjusted for 16x16)
        const MIN_HEIGHT = 35; // Minimum viewport height in tiles (adjusted for 16x16)
        const MAX_WIDTH = 120; // Maximum viewport width (prevents too wide)
        const MAX_HEIGHT = 60; // Maximum viewport height (prevents too tall)

        // Get available screen space
        const availableWidth = window.innerWidth - SIDE_PANEL_WIDTH - 40; // 40px margins
        const availableHeight = window.innerHeight - HUD_HEIGHT - CONTROLS_HEIGHT - 40; // 40px margins

        // Calculate how many tiles fit
        let tilesWide = Math.floor(availableWidth / TILE_WIDTH);
        let tilesHigh = Math.floor(availableHeight / TILE_HEIGHT);

        // Clamp to min/max bounds
        tilesWide = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, tilesWide));
        tilesHigh = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, tilesHigh));

        console.log(`📐 Optimal viewport: ${tilesWide}x${tilesHigh} tiles (${tilesWide * TILE_WIDTH}x${tilesHigh * TILE_HEIGHT}px)`);

        return {
            width: tilesWide,
            height: tilesHigh
        };
    }

    /**
     * Handle window resize - recalculate and resize viewport
     */
    handleWindowResize() {
        if (!this.mapRenderer) return;

        // Debounce resize events (wait 250ms after last resize)
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            const newSize = this.calculateOptimalViewport();
            const currentWidth = this.mapRenderer.config.viewportWidth;
            const currentHeight = this.mapRenderer.config.viewportHeight;

            // Only resize if dimensions changed significantly (avoid flickering)
            if (Math.abs(newSize.width - currentWidth) >= 5 ||
                Math.abs(newSize.height - currentHeight) >= 5) {

                this.mapRenderer.resize(
                    newSize.width * 16,  // tileWidth (16x16 tiles)
                    newSize.height * 16  // tileHeight (16x16 tiles)
                );

                // Re-render the map
                if (this.player) {
                    this.mapRenderer.renderWorld(
                        gameState.get('world'),
                        { x: this.player.x, y: this.player.y }
                    );
                }

                console.log(`🔄 Viewport resized to ${newSize.width}x${newSize.height} tiles`);
            }
        }, 250);
    }

    /**
     * Show floating combat text above a combatant card
     * @param {string} combatantId - ID of the target combatant
     * @param {string} text - Text to display (e.g., "-15", "MISS!", "+8 HP")
     * @param {string} type - Type of text: 'damage', 'critical', 'healing', 'buff', 'miss', 'condition'
     * @param {number} delay - Optional delay in ms before showing (for staggering multiple texts)
     */
    showFloatingCombatText(combatantId, text, type = 'damage', delay = 0) {
        setTimeout(() => {
            const combatantCard = document.querySelector(`.combatant-card[data-combatant-id="${combatantId}"]`);
            if (!combatantCard) {
                console.warn(`⚠️ Combatant card not found for ID: ${combatantId}`);
                return;
            }

            // Get position of combatant card
            const rect = combatantCard.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 3; // Position near top of card

            // Count existing floating texts for this combatant to stagger position
            const existingTexts = document.querySelectorAll(
                `.floating-combat-text[data-combatant="${combatantId}"]`
            );
            const offsetY = existingTexts.length * 40; // Offset by 40px for each existing text

            // Create floating text element
            const floatingText = document.createElement('div');
            floatingText.className = `floating-combat-text ${type}`;
            floatingText.textContent = text;
            floatingText.setAttribute('data-combatant', combatantId);
            floatingText.style.left = `${centerX}px`;
            floatingText.style.top = `${centerY + offsetY}px`;
            floatingText.style.transform = 'translate(-50%, -50%)'; // Center on position

            // Add to container
            const container = document.getElementById('floatingCombatTextContainer');
            container.appendChild(floatingText);

            // Remove after animation completes
            setTimeout(() => {
                floatingText.remove();
            }, 1500);
        }, delay);
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

        // Worldbuilder button
        this.setupWorldbuilder();
    }

    /**
     * Setup Worldbuilder modal
     */
    setupWorldbuilder() {
        const worldbuilderBtn = document.getElementById('worldbuilderBtn');
        const worldbuilderModal = document.getElementById('worldbuilderModal');
        const closeBtn = document.getElementById('closeWorldbuilderBtn');
        const resetBtn = document.getElementById('wbResetBtn');
        const applyBtn = document.getElementById('wbApplyBtn');
        // Store custom overrides
        this.worldbuilderOverrides = null;

        if (!worldbuilderBtn || !worldbuilderModal) return;

        // Open modal
        worldbuilderBtn.addEventListener('click', () => {
            this.updateWorldbuilderDefaults();
            worldbuilderModal.classList.add('active');
        });

        // Close modal
        closeBtn.addEventListener('click', () => {
            worldbuilderModal.classList.remove('active');
        });

        // Close on backdrop click
        worldbuilderModal.addEventListener('click', (e) => {
            if (e.target === worldbuilderModal) {
                worldbuilderModal.classList.remove('active');
            }
        });

        // Reset to defaults
        resetBtn.addEventListener('click', () => {
            this.worldbuilderOverrides = null;
            this.updateWorldbuilderDefaults();
        });

        // Apply changes
        applyBtn.addEventListener('click', () => {
            this.applyWorldbuilderSettings();
            worldbuilderModal.classList.remove('active');
        });

        // Update when campaign changes (load campaign-specific overrides)
        const campaignSelect = document.getElementById('campaign');
        if (campaignSelect) {
            campaignSelect.addEventListener('change', () => {
                this.loadCampaignFeatureOverrides();
                if (worldbuilderModal.classList.contains('active')) {
                    this.updateWorldbuilderDefaults();
                }
            });
            // Load initial campaign overrides
            this.loadCampaignFeatureOverrides();
        }

        // Update summary on input change
        ['wbSettlements', 'wbDungeons', 'wbSanctuaries', 'wbPOIs', 'wbVillageRatio', 'wbTownRatio', 'wbCityRatio'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => this.updateWorldbuilderSummary());
            }
        });
    }

    /**
     * Load feature generation overrides from selected campaign
     */
    async loadCampaignFeatureOverrides() {
        const campaignId = document.getElementById('campaign')?.value;
        if (!campaignId) return;

        try {
            // Load campaigns.json
            const response = await fetch('data/campaigns.json');
            const data = await response.json();

            // Find the selected campaign (check inherited campaigns for mapSize)
            const allCampaigns = [...(data.campaigns || []), ...(data.templateCampaigns || [])];
            const campaign = allCampaigns.find(c => c.id === campaignId);

            if (campaign) {
                // Get mapSize (check campaign, then inherited campaigns, default to 'medium')
                let mapSize = campaign.mapSize;
                if (!mapSize && campaign.inherits) {
                    for (const inheritId of campaign.inherits) {
                        const parent = allCampaigns.find(c => c.id === inheritId);
                        if (parent?.mapSize) {
                            mapSize = parent.mapSize;
                            break;
                        }
                    }
                }
                this.campaignMapSize = mapSize || 'medium';

                if (campaign.featureGeneration) {
                    // Merge campaign overrides into RULES
                    RULES.worldGen.campaignOverrides = { ...campaign.featureGeneration };
                    console.log(`📜 Loaded campaign overrides for "${campaign.name}":`, campaign.featureGeneration);
                } else {
                    RULES.worldGen.campaignOverrides = {};
                }

                // Reset user overrides so campaign settings take effect
                this.worldbuilderOverrides = null;
            } else {
                // No campaign found
                RULES.worldGen.campaignOverrides = {};
                this.campaignMapSize = 'medium';
            }
        } catch (error) {
            console.warn('Failed to load campaign overrides:', error);
            RULES.worldGen.campaignOverrides = {};
            this.campaignMapSize = 'medium';
        }
    }

    /**
     * Update Worldbuilder modal with default values
     * Priority: User overrides > Campaign overrides > Base defaults
     */
    updateWorldbuilderDefaults() {
        const mapSize = this.campaignMapSize || 'medium'; // From campaign config
        const fg = RULES.worldGen.featureGeneration;
        const campaignOverrides = RULES.worldGen.campaignOverrides || {};

        // Calculate scale factor
        const sizes = RULES.worldGen.worldSizes;
        const regionCount = sizes[mapSize] || sizes.medium;
        const totalRegions = regionCount * regionCount;
        const scaleFactor = totalRegions / 10000;

        // Get base values (campaign override or default, then scaled)
        const baseSettlements = campaignOverrides.baseSettlements || fg.baseSettlements;
        const baseDungeons = campaignOverrides.baseDungeons || fg.baseDungeons;
        const baseSanctuaries = campaignOverrides.baseSanctuaries || fg.baseSanctuaries;
        const basePOIs = campaignOverrides.basePOIs || fg.basePOIs;

        // Get settlement distribution (campaign override or default)
        const distrib = campaignOverrides.settlementDistribution || fg.settlementDistribution;

        // If we have user overrides, use those; otherwise use scaled campaign/base defaults
        const settlements = this.worldbuilderOverrides?.baseSettlements ?? Math.round(baseSettlements * scaleFactor);
        const dungeons = this.worldbuilderOverrides?.baseDungeons ?? Math.round(baseDungeons * scaleFactor);
        const sanctuaries = this.worldbuilderOverrides?.baseSanctuaries ?? Math.round(baseSanctuaries * scaleFactor);
        const pois = this.worldbuilderOverrides?.basePOIs ?? Math.round(basePOIs * scaleFactor);

        const villageRatio = this.worldbuilderOverrides?.villageRatio ?? Math.round(distrib.village * 100);
        const townRatio = this.worldbuilderOverrides?.townRatio ?? Math.round(distrib.town * 100);
        const cityRatio = this.worldbuilderOverrides?.cityRatio ?? Math.round(distrib.city * 100);

        // Set input values
        document.getElementById('wbSettlements').value = settlements;
        document.getElementById('wbDungeons').value = dungeons;
        document.getElementById('wbSanctuaries').value = sanctuaries;
        document.getElementById('wbPOIs').value = pois;
        document.getElementById('wbVillageRatio').value = villageRatio;
        document.getElementById('wbTownRatio').value = townRatio;
        document.getElementById('wbCityRatio').value = cityRatio;

        this.updateWorldbuilderSummary();
    }

    /**
     * Update Worldbuilder summary display
     */
    updateWorldbuilderSummary() {
        const settlements = parseInt(document.getElementById('wbSettlements').value) || 0;
        const dungeons = parseInt(document.getElementById('wbDungeons').value) || 0;
        const sanctuaries = parseInt(document.getElementById('wbSanctuaries').value) || 0;
        const pois = parseInt(document.getElementById('wbPOIs').value) || 0;

        const villageRatio = parseInt(document.getElementById('wbVillageRatio').value) || 0;
        const townRatio = parseInt(document.getElementById('wbTownRatio').value) || 0;
        const cityRatio = parseInt(document.getElementById('wbCityRatio').value) || 0;

        const villages = Math.round(settlements * villageRatio / 100);
        const towns = Math.round(settlements * townRatio / 100);
        const cities = Math.round(settlements * cityRatio / 100);

        const totalFeatures = settlements + dungeons + sanctuaries + pois;
        const ratioSum = villageRatio + townRatio + cityRatio;

        const summaryEl = document.getElementById('worldbuilderSummary');
        summaryEl.innerHTML = `
            <strong>World Summary:</strong><br>
            🏘️ ${villages} villages, ${towns} towns, ${cities} cities<br>
            🏛️ ${dungeons} dungeons to explore<br>
            ☼ ${sanctuaries} safe rest locations<br>
            📍 ${pois} points of interest<br>
            <br>
            <strong>Total: ${totalFeatures} features</strong>
            ${ratioSum !== 100 ? `<br><span style="color: var(--warning-color);">⚠️ Settlement ratios sum to ${ratioSum}% (should be 100%)</span>` : ''}
        `;
    }

    /**
     * Apply Worldbuilder settings as campaign overrides
     */
    applyWorldbuilderSettings() {
        const settlements = parseInt(document.getElementById('wbSettlements').value) || 150;
        const dungeons = parseInt(document.getElementById('wbDungeons').value) || 200;
        const sanctuaries = parseInt(document.getElementById('wbSanctuaries').value) || 100;
        const pois = parseInt(document.getElementById('wbPOIs').value) || 300;

        const villageRatio = (parseInt(document.getElementById('wbVillageRatio').value) || 60) / 100;
        const townRatio = (parseInt(document.getElementById('wbTownRatio').value) || 30) / 100;
        const cityRatio = (parseInt(document.getElementById('wbCityRatio').value) || 10) / 100;

        // Store as overrides (these will be passed to WorldGenerator)
        this.worldbuilderOverrides = {
            baseSettlements: settlements,
            baseDungeons: dungeons,
            baseSanctuaries: sanctuaries,
            basePOIs: pois,
            villageRatio: Math.round(villageRatio * 100),
            townRatio: Math.round(townRatio * 100),
            cityRatio: Math.round(cityRatio * 100),
            settlementDistribution: {
                village: villageRatio,
                town: townRatio,
                city: cityRatio
            }
        };

        // Update the RULES.worldGen.campaignOverrides so WorldGenerator uses them
        RULES.worldGen.campaignOverrides = this.worldbuilderOverrides;

        console.log('⚙️ Worldbuilder settings applied:', this.worldbuilderOverrides);
    }

    /**
     * Start a new game
     */
    startNewGame() {
        const seed = document.getElementById('seedInput').value.trim();
        const mapSize = this.campaignMapSize || 'medium'; // From campaign config
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
        // Get campaign ID from game state or world config
        const worldConfig = gameState.get('worldConfig');
        const campaignId = worldConfig?.campaignId || 'nexus-verge';
        console.log(`🎯 Starting character creation for campaign: ${campaignId}`);
        await this.characterCreationUI.init(campaignId);
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

            // Generate world metadata upfront (finite world system)
            if (RULES.worldGen.finiteWorld.enabled && RULES.worldGen.finiteWorld.preGenerateMetadata) {
                console.log('🗺️ Pre-generating world metadata (settlements, roads, features)...');
                try {
                    await this.worldGenerator.generateWorldMetadata();
                } catch (error) {
                    console.error('❌ Failed to generate world metadata:', error);
                    gameState.addMessage('Warning: World generation encountered an error. Some features may be missing.', 'warning');
                }
            }
        }

        if (!this.mapRenderer) {
            console.log('🎨 Initializing map renderer...');
            const viewportSize = this.calculateOptimalViewport();
            this.mapRenderer = new MapRenderer('gameCanvas', {
                tileWidth: 16,  // 16x16 pixel art tiles
                tileHeight: 16,
                viewportWidth: viewportSize.width,
                viewportHeight: viewportSize.height
            });
        }

        if (!this.settlementUI) {
            console.log('🏘️ Initializing settlement UI...');
            this.settlementUI = new SettlementUI(null); // Will set manager reference after creation
        }

        // Get campaign ID for filtering
        const campaignId = worldConfig?.campaignId || 'nexus-verge';

        if (!this.npcGenerator) {
            console.log('👥 Initializing NPC generator...');
            this.npcGenerator = new NPCGenerator(seed, campaignId);
            await this.npcGenerator.loadData();
        }

        if (!this.questGenerator) {
            console.log('📜 Initializing quest generator...');
            this.questGenerator = new QuestGenerator(seed, campaignId);
            await this.questGenerator.loadData();
        }

        if (!this.questManager) {
            console.log('📜 Initializing quest manager...');
            this.questManager = new QuestManager(this.questGenerator);
            await this.questManager.initialize();
        }

        if (!this.lootManager) {
            console.log('💰 Initializing loot manager...');
            this.lootManager = new LootManager(seed, campaignId);
            await this.lootManager.loadData();
            // Make lootManager globally accessible for combat
            window.lootManager = this.lootManager;
        }

        if (!this.merchantManager) {
            console.log('🏪 Initializing merchant manager...');
            this.merchantManager = new MerchantManager(seed, campaignId);
            await this.merchantManager.loadData();
            // Pass merchant manager to settlement UI
            this.settlementUI.merchantManager = this.merchantManager;
        }

        if (!this.skillChallengeManager.challenges) {
            console.log('🎲 Initializing skill challenge system...');
            const skillChallengesData = await fetch('data/skillChallenges.json').then(r => r.json());
            await this.skillChallengeManager.loadChallenges(skillChallengesData);
            // Make globally accessible for UI
            window.skillChallengeManager = this.skillChallengeManager;
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

        // Add welcome messages (only shown once at game start, not after combat)
        gameState.addMessage(`Welcome to Nexus Verge, ${character.name}!`, 'success');
        gameState.addMessage(`You are a Level ${character.level} ${character.race.name} ${character.class.displayName || character.class.name}.`, 'info');

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

        // Setup Help System
        this.setupHelp();

        // Setup Settings System
        this.setupSettings();

        // Setup Legal Modal System
        this.setupLegalModal();

        // Setup Quick Menu System (mouse-clickable UI)
        this.setupQuickMenu();

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
            if (!combatState || !combatState.active) {
                // Combat ended - return to game screen
                if (this.currentScreen === 'combatScreen' || this.currentScreen === 'combat') {
                    this.showScreen('game');
                }
                return;
            }

            // Combat started - switch to combat screen
            if (this.currentScreen !== 'combatScreen' && this.currentScreen !== 'combat') {
                this.showScreen('combatScreen');
            }

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

        if (!playerDiv || !enemyDiv || !combatState || !combatState.combatants) return;

        const currentTurn = combatState.currentTurn;

        // Render player combatants (clickable for self-targeting)
        const playerCombatants = combatState.combatants.filter(c => c.team === 'player');
        playerDiv.innerHTML = playerCombatants.map(c => {
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
                <button class="action-btn" onclick="window.game.selectAction('dodge')"
                        ${!hasAction ? 'disabled' : ''}>
                    🛡️ Dodge
                </button>
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

        if (actionType === 'flee') {
            this.combatManager.flee(this.combatManager.playerCombatant);
            this.selectedAction = null;
            return;
        }

        if (actionType === 'dodge') {
            this.dodge();
            this.selectedAction = null;
            return;
        }

        if (actionType === 'ability') {
            // Show ability selection modal instead of asking for target
            this.showAbilitySelection();
            this.selectedAction = null;
            return;
        }

        // For attack actions, ask for target
        gameState.addMessage(`Select a target to ${actionType}`, 'info');
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

        // Allow targeting self or enemies
        let target;
        if (targetId === 'player' || targetId === currentCombatant.id) {
            target = this.combatManager.playerCombatant;
        } else {
            target = this.combatManager.enemyCombatants.find(e => e.id === targetId);
        }

        if (!target || target.hp <= 0) {
            gameState.addMessage('Invalid target!', 'error');
            return;
        }

        // Default to attack if no action selected
        if (!this.selectedAction) {
            this.selectedAction = 'attack';
        }

        const attacker = this.combatManager.playerCombatant;
        const character = gameState.get('character');

        switch(this.selectedAction) {
            case 'attack':
                this.combatManager.attack(attacker, target, 'mainHand');
                break;
            case 'attackOffHand':
                this.combatManager.attack(attacker, target, 'offHand');
                break;
            case 'steadyNerveAttack':
                // This is a bonus action attack from Steady Nerve
                // Check if bonus action is still available
                if (!attacker.hasAction('bonusAction')) {
                    gameState.addMessage('❌ No bonus action available!', 'error');
                    this.selectedAction = null;
                    return;
                }

                // Make the attack (using mainHand weapon, but as a bonus action)
                this.combatManager.attack(attacker, target, 'mainHand', { consumeAction: false });

                // Consume bonus action instead of action
                attacker.consumeAction('bonusAction');

                // Track Steady Nerve usage
                if (!character.abilityUses) {
                    character.abilityUses = {};
                }
                character.abilityUses['steadyNerve'] = (character.abilityUses['steadyNerve'] || 0) + 1;
                gameState.set('character', character);

                // Update combat state to reflect bonus action consumption
                gameState.set('combat', {
                    active: true,
                    round: this.combatManager.round,
                    currentTurn: this.combatManager.getCurrentCombatant()?.id,
                    combatants: this.combatManager.combatants.map(c => c.toJSON())
                });

                gameState.addMessage('💪 Steady Nerve attack complete! (Bonus Action used)', 'success');
                break;
            case 'ability':
                // This should not be called anymore - abilities go through modal
                gameState.addMessage('Use the Ability button to select an ability', 'error');
                break;
            case 'spell':
                gameState.addMessage('Spells not yet implemented', 'error');
                break;
        }

        this.selectedAction = null;
    }

    /**
     * Dodge action - focus entirely on avoiding attacks
     * D&D 5e: Until start of your next turn, attack rolls against you have disadvantage
     * and you make DEX saving throws with advantage
     */
    dodge() {
        if (!this.combatManager || !this.combatManager.active) {
            gameState.addMessage('Cannot dodge outside of combat!', 'error');
            return;
        }

        const combatant = this.combatManager.playerCombatant;

        // Check if combatant has action available
        if (!combatant.hasAction('action')) {
            gameState.addMessage('No action available to dodge!', 'error');
            return;
        }

        // Apply dodging condition
        const added = combatant.addCondition('dodging', 'untilStartOfTurn', combatant.id, {
            isBuff: true,
            curable: false,
            icon: '🛡️'
        });

        if (added) {
            gameState.addMessage(`🛡️ ${combatant.name} takes the Dodge action! Attackers have disadvantage until the start of your next turn.`, 'success');

            // Consume action
            combatant.consumeAction('action');

            // Update combat state
            gameState.set('combat', {
                active: true,
                round: this.combatManager.round,
                currentTurn: this.combatManager.getCurrentCombatant()?.id,
                combatants: this.combatManager.combatants.map(c => c.toJSON())
            });

            // End turn after dodging
            this.combatManager.endTurn();
        } else {
            gameState.addMessage('Already dodging!', 'warning');
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
        const locationDisplay = document.getElementById('location');

        if (charName) charName.textContent = character.name;
        if (charLevel) charLevel.textContent = `Level ${character.level} ${character.class.displayName || character.class.name}`;
        if (hpDisplay) hpDisplay.textContent = `HP: ${character.currentHP}/${character.maxHP}`;
        if (acDisplay) acDisplay.textContent = `AC: ${character.ac}`;

        // Update location display
        this.updateLocationDisplay();

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

        // Subscribe to location changes
        gameState.subscribe('world.currentLocation', () => {
            this.updateLocationDisplay();
        });
    }

    /**
     * Update location display in HUD
     */
    updateLocationDisplay() {
        const locationDisplay = document.getElementById('location');
        if (!locationDisplay) return;

        const location = this.getCurrentLocationString();
        locationDisplay.textContent = location;
    }

    /**
     * Get current location string for HUD
     * Returns settlement name if in/near settlement, otherwise terrain type + coordinates
     */
    getCurrentLocationString() {
        // Check if player is in/near a settlement
        if (this.settlementManager && this.player) {
            const settlement = this.settlementManager.getSettlementAtPlayerPosition();
            if (settlement) {
                return settlement.name;
            }
        }

        // Get current position and terrain
        const currentLocation = gameState.get('world.currentLocation');
        if (!currentLocation) {
            return 'Unknown';
        }

        const { x, y } = currentLocation;

        // Get terrain type at current position
        if (this.worldGenerator) {
            const tile = this.worldGenerator.getCachedTile(x, y);

            if (tile && tile.terrain) {
                // tile.terrain is a string ID (e.g., "grassland"), need to look up terrain object
                const terrainId = tile.terrain;
                const terrainData = this.worldGenerator.terrainData;

                if (terrainData && terrainData.terrains) {
                    const terrainObj = terrainData.terrains.find(t => t.id === terrainId);
                    if (terrainObj && terrainObj.name) {
                        const terrainName = terrainObj.name; // Already capitalized in JSON
                        return `${terrainName} (${x}, ${y})`;
                    } else {
                        // Fallback: capitalize the ID
                        const terrainName = terrainId.charAt(0).toUpperCase() + terrainId.slice(1);
                        return `${terrainName} (${x}, ${y})`;
                    }
                } else {
                    // Fallback: use terrain ID
                    const terrainName = terrainId.charAt(0).toUpperCase() + terrainId.slice(1);
                    return `${terrainName} (${x}, ${y})`;
                }
            } else if (!tile) {
                // Tile not in cache yet (region compressed or not generated)
                // Show coordinates while waiting for region to load
                return `Loading... (${x}, ${y})`;
            }
        }

        // Fallback to just coordinates
        return `(${x}, ${y})`;
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

        // Backtick key (`) to open settings (when in game screen)
        document.addEventListener('keydown', (e) => {
            if (e.key === '`' && this.currentScreen === 'game' && !gameState.get('combat')) {
                this.openSettings();
            }
        });

        // +/= key to zoom in (when in game screen)
        document.addEventListener('keydown', (e) => {
            if ((e.key === '+' || e.key === '=') && this.currentScreen === 'game') {
                this.handleZoom(1);
                e.preventDefault();
            }
        });

        // -/_ key to zoom out (when in game screen)
        document.addEventListener('keydown', (e) => {
            if ((e.key === '-' || e.key === '_') && this.currentScreen === 'game') {
                this.handleZoom(-1);
                e.preventDefault();
            }
        });

        // ESC key to close any open modal (when in game screen)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentScreen === 'game') {
                const combat = gameState.get('combat');
                const inCombat = combat && combat.active;

                // Allow ESC during non-combat gameplay
                if (!inCombat) {
                    this.closeAnyOpenModal();
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        });

        console.log('💾 Save/Load system initialized');
    }

    /**
     * Close any open modals
     */
    closeAnyOpenModal() {
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
            'worldMapModal',
            'characterSheetModal',
            'skillCheckModal',
            'settingsModal',
            'helpModal'
        ];

        const openModals = modalIds
            .map(id => document.getElementById(id))
            .filter(modal => modal && modal.classList.contains('active'));

        // Close all open modals
        openModals.forEach(modal => {
            modal.classList.remove('active');
        });
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
     * Show ability selection modal
     */
    async showAbilitySelection() {
        const character = gameState.get('character');
        if (!character) return;

        // Load abilities data if not already loaded
        if (!this.abilitiesData) {
            try {
                const response = await fetch('data/abilities.json');
                this.abilitiesData = await response.json();
            } catch (error) {
                console.error('Failed to load abilities data:', error);
                gameState.addMessage('Failed to load abilities data', 'error');
                return;
            }
        }

        // Get available abilities for character's calling
        const callingAbilities = this.abilitiesData.abilities[character.class.id] || [];
        const availableAbilities = callingAbilities.filter(ability =>
            character.level >= ability.levelRequired
        );

        if (availableAbilities.length === 0) {
            gameState.addMessage('No abilities available yet', 'info');
            return;
        }

        // Create ability selection modal HTML
        const modalHTML = `
            <div id="abilitySelectionModal" class="modal active">
                <div class="modal-content ability-modal">
                    <div class="modal-header">
                        <h2>Select Ability</h2>
                        <button id="closeAbilityModalBtn" class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="ability-list">
                            ${availableAbilities.map(ability => this.renderAbilityOption(ability, character)).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('abilitySelectionModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Setup event listeners
        const modal = document.getElementById('abilitySelectionModal');
        const closeBtn = document.getElementById('closeAbilityModalBtn');

        closeBtn.addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Ability button clicks
        document.querySelectorAll('.ability-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const abilityId = btn.dataset.abilityId;
                const ability = availableAbilities.find(a => a.id === abilityId);
                if (ability) {
                    this.useAbility(ability, character);
                    modal.remove();
                }
            });
        });
    }

    /**
     * Render an ability option in the selection modal
     */
    renderAbilityOption(ability, character) {
        // Check if ability is usable (has charges remaining)
        const canUse = this.canUseAbility(ability, character);
        const usesText = this.getAbilityUsesText(ability, character);

        return `
            <div class="ability-option ${!canUse ? 'disabled' : ''}">
                <div class="ability-option-header">
                    <h3>${ability.name}</h3>
                    <span class="ability-uses">${usesText}</span>
                </div>
                <p class="ability-description">${ability.description}</p>
                <div class="ability-meta">
                    <span class="ability-action-type">${this.formatActionType(ability.actionType)}</span>
                    ${ability.resourceType ? `<span class="ability-resource">${this.formatResourceType(ability.resourceType)}</span>` : ''}
                </div>
                <button class="ability-option-btn" data-ability-id="${ability.id}" ${!canUse ? 'disabled' : ''}>
                    Use Ability
                </button>
            </div>
        `;
    }

    /**
     * Check if character can use an ability
     */
    canUseAbility(ability, character) {
        // Check resource availability
        if (ability.resourceType === 'shortRest') {
            const used = character.abilityUses?.[ability.id] || 0;
            const max = ability.usesPerShortRest || 1;
            return used < max;
        }
        // Add more resource type checks as needed
        return true;
    }

    /**
     * Get ability uses remaining text
     */
    getAbilityUsesText(ability, character) {
        if (ability.resourceType === 'shortRest') {
            const used = character.abilityUses?.[ability.id] || 0;
            const max = ability.usesPerShortRest || 1;
            const remaining = max - used;
            return `${remaining}/${max} uses`;
        }
        return 'Available';
    }

    /**
     * Format action type for display
     */
    formatActionType(actionType) {
        const types = {
            action: 'Action',
            bonusAction: 'Bonus Action',
            reaction: 'Reaction',
            free: 'Free'
        };
        return types[actionType] || actionType;
    }

    /**
     * Format resource type for display
     */
    formatResourceType(resourceType) {
        const types = {
            shortRest: 'Short Rest',
            longRest: 'Long Rest',
            stamina: 'Stamina'
        };
        return types[resourceType] || resourceType;
    }

    /**
     * Use an ability
     */
    async useAbility(ability, character) {
        console.log('Using ability:', ability.name);

        // Initialize abilityUses if not exists
        if (!character.abilityUses) {
            character.abilityUses = {};
        }

        // Handle Steady Nerve ability with choices
        if (ability.id === 'steadyNerve' && ability.effects.choice) {
            this.showSteadyNerveChoices(ability, character);
            return;
        }

        // For other abilities, implement their effects
        gameState.addMessage(`${ability.name} used! (Effect not yet implemented)`, 'info');

        // Track usage
        if (ability.resourceType === 'shortRest') {
            character.abilityUses[ability.id] = (character.abilityUses[ability.id] || 0) + 1;
            gameState.set('character', character);
        }

        // End turn if it consumed an action
        if (ability.actionType === 'action' || ability.actionType === 'bonusAction') {
            this.combatManager.endTurn();
        }
    }

    /**
     * Show Steady Nerve ability choices modal
     */
    showSteadyNerveChoices(ability, character) {
        const options = ability.effects.options.filter(opt => opt.implemented !== false);

        const modalHTML = `
            <div id="steadyNerveModal" class="modal active">
                <div class="modal-content ability-modal">
                    <div class="modal-header">
                        <h2>${ability.name}</h2>
                        <button id="closeSteadyNerveBtn" class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>${ability.description}</p>
                        <div class="ability-choices">
                            ${options.map(option => `
                                <button class="ability-choice-btn" data-option-id="${option.id}">
                                    <strong>${option.name}</strong>
                                    <p>${option.description}</p>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal
        const existingModal = document.getElementById('steadyNerveModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = document.getElementById('steadyNerveModal');
        const closeBtn = document.getElementById('closeSteadyNerveBtn');

        closeBtn.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Choice button clicks
        document.querySelectorAll('.ability-choice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const optionId = btn.dataset.optionId;
                const option = options.find(o => o.id === optionId);
                if (option) {
                    this.executeSteadyNerveOption(option, ability, character);
                    modal.remove();
                }
            });
        });
    }

    /**
     * Execute a Steady Nerve option
     */
    executeSteadyNerveOption(option, ability, character) {
        const combatant = this.combatManager.playerCombatant;

        // Check if bonus action is available
        if (!combatant.hasAction('bonusAction')) {
            gameState.addMessage('❌ No bonus action available!', 'error');
            return;
        }

        switch (option.id) {
            case 'heal':
                // Heal: 1d8 + level + CON modifier
                const healAmount = rollDice(1, 8) + character.level + character.abilityModifiers.con;
                const oldHP = combatant.hp;
                combatant.hp = Math.min(combatant.maxHP, combatant.hp + healAmount);
                const actualHealing = combatant.hp - oldHP;

                gameState.addMessage(`💚 Steady Nerve (Heal): ${character.name} heals for ${actualHealing} HP!`, 'success');

                // Update combat state to reflect HP change
                gameState.set('combat', {
                    active: true,
                    round: this.combatManager.round,
                    currentTurn: this.combatManager.getCurrentCombatant()?.id,
                    combatants: this.combatManager.combatants.map(c => c.toJSON())
                });

                // Consume bonus action
                combatant.consumeAction('bonusAction');
                break;

            case 'attack':
                // Make weapon attack - need to select target
                gameState.addMessage(`⚔️ Steady Nerve (Attack): Select a target to attack`, 'info');
                this.selectedAction = 'steadyNerveAttack'; // Special flag to track this is a bonus action attack
                // Don't consume bonus action yet - wait until attack is executed
                return; // Early return - don't track usage or end turn yet
                break;

            case 'dodge':
                // Apply Dodge condition
                combatant.addCondition('dodging', 'untilStartOfTurn', combatant.id, {
                    isBuff: true,
                    curable: false,
                    icon: '🛡️'
                });
                gameState.addMessage(`🛡️ Steady Nerve (Dodge): ${character.name} takes the Dodge action! Attackers have disadvantage.`, 'info');

                // Consume bonus action
                combatant.consumeAction('bonusAction');
                break;

            default:
                gameState.addMessage(`${option.name} not yet implemented`, 'warning');
                return;
        }

        // Track usage
        if (!character.abilityUses) {
            character.abilityUses = {};
        }
        character.abilityUses[ability.id] = (character.abilityUses[ability.id] || 0) + 1;
        gameState.set('character', character);

        // Update combat state
        gameState.set('combat', {
            active: true,
            round: this.combatManager.round,
            currentTurn: this.combatManager.getCurrentCombatant()?.id,
            combatants: this.combatManager.combatants.map(c => c.toJSON())
        });

        // End turn after using ability (bonus action consumed)
        this.combatManager.endTurn();
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
     * Setup Help Modal
     */
    setupHelp() {
        const modal = document.getElementById('helpModal');
        const closeBtn = document.getElementById('closeHelpBtn');

        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeHelp();
            });
        }

        // Close on backdrop click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeHelp();
                }
            });
        }
    }

    /**
     * Open Help Modal
     */
    async openHelp() {
        const modal = document.getElementById('helpModal');
        if (!modal) return;

        // Load terrain reference data dynamically
        await this.loadTerrainReference();

        modal.classList.add('active');
    }

    /**
     * Load and render terrain reference section dynamically
     */
    async loadTerrainReference() {
        const container = document.getElementById('terrainReference');
        if (!container) return;

        try {
            // Fetch terrain data with cache-busting
            const response = await fetch(`data/terrains.json?v=${Date.now()}`);
            const terrainData = await response.json();

            // Render terrain reference table
            let html = '<div class="terrain-grid">';

            terrainData.terrains.forEach(terrain => {
                const { symbol, name, color, description, movementCost, difficultTerrain, traversable } = terrain;

                // Format movement cost
                const moveInfo = traversable
                    ? `Movement: ${movementCost}×`
                    : 'Impassable';

                // Format terrain properties
                const properties = [];
                if (difficultTerrain) properties.push('Difficult');
                if (!traversable) properties.push('Blocked');
                const propsText = properties.length > 0 ? ` (${properties.join(', ')})` : '';

                html += `
                    <div class="terrain-item">
                        <div class="terrain-symbol" style="background-color: ${color}; color: ${this.getContrastColor(color)};">
                            ${symbol}
                        </div>
                        <div class="terrain-info">
                            <div class="terrain-name">${name}${propsText}</div>
                            <div class="terrain-desc">${description}</div>
                            <div class="terrain-move">${moveInfo}</div>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            container.innerHTML = html;
        } catch (error) {
            console.error('Failed to load terrain reference:', error);
            container.innerHTML = '<div class="terrain-error">Failed to load terrain data. Please refresh the page.</div>';
        }
    }

    /**
     * Setup Settings Modal
     */
    setupSettings() {
        const modal = document.getElementById('settingsModal');
        const closeBtn = document.getElementById('closeSettingsBtn');

        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSettings());
        }

        // Close on backdrop click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeSettings();
                }
            });
        }

        // Volume sliders
        const masterSlider = document.getElementById('masterVolumeSlider');
        const sfxSlider = document.getElementById('sfxVolumeSlider');
        const musicSlider = document.getElementById('musicVolumeSlider');

        if (masterSlider) {
            masterSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                document.getElementById('masterVolumeValue').textContent = `${value}%`;
                audioManager.setMasterVolume(value / 100);
            });
        }

        if (sfxSlider) {
            sfxSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                document.getElementById('sfxVolumeValue').textContent = `${value}%`;
                audioManager.setSFXVolume(value / 100);
            });
        }

        if (musicSlider) {
            musicSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                document.getElementById('musicVolumeValue').textContent = `${value}%`;
                audioManager.setMusicVolume(value / 100);
            });
        }

        // Test sound button
        const testSoundBtn = document.getElementById('testSoundBtn');
        if (testSoundBtn) {
            testSoundBtn.addEventListener('click', () => {
                audioManager.play('meleeHit', 1.0);
            });
        }

        // Pixel art toggle
        const pixelArtToggle = document.getElementById('pixelArtToggle');
        if (pixelArtToggle) {
            pixelArtToggle.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                if (this.mapRenderer) {
                    this.mapRenderer.setPixelArtEnabled(enabled);
                    // Re-render the map to show the change immediately
                    if (this.player) {
                        this.mapRenderer.renderWorld(
                            gameState.get('world'),
                            { x: this.player.x, y: this.player.y }
                        );
                    }
                } else {
                    // Store setting for when mapRenderer is initialized
                    localStorage.setItem('nexusVerge_usePixelArt', enabled.toString());
                }
                console.log(`🎨 Pixel art ${enabled ? 'enabled' : 'disabled'}`);
            });
        }

        // Zoom controls
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.handleZoom(1));
        }
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.handleZoom(-1));
        }
    }

    /**
     * Handle zoom change
     * @param {number} direction - 1 for zoom in, -1 for zoom out
     */
    handleZoom(direction) {
        if (!this.mapRenderer) return;

        const changed = direction > 0 ? this.mapRenderer.zoomIn() : this.mapRenderer.zoomOut();

        if (changed) {
            // Update display
            this.updateZoomDisplay();

            // Re-render the map with new zoom
            if (this.player) {
                this.mapRenderer.renderWorld(
                    gameState.get('world'),
                    { x: this.player.x, y: this.player.y }
                );
            }
        }
    }

    /**
     * Update zoom level display in settings
     */
    updateZoomDisplay() {
        if (!this.mapRenderer) return;

        const zoomLevels = this.mapRenderer.zoomLevels;
        const currentIndex = this.mapRenderer.getZoomIndex();
        const currentSize = this.mapRenderer.getZoomLevel();

        // Update display elements
        const levelDisplay = document.getElementById('zoomLevelDisplay');
        const sizeDisplay = document.getElementById('zoomSizeDisplay');
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');

        if (levelDisplay) {
            levelDisplay.textContent = `${currentIndex + 1}×`;
        }
        if (sizeDisplay) {
            sizeDisplay.textContent = `${currentSize}×${currentSize}`;
        }

        // Enable/disable buttons at bounds
        if (zoomOutBtn) {
            zoomOutBtn.disabled = currentIndex === 0;
        }
        if (zoomInBtn) {
            zoomInBtn.disabled = currentIndex === zoomLevels.length - 1;
        }
    }

    /**
     * Open Settings Modal
     */
    openSettings() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;

        // Load current volume values
        const masterVolume = Math.round(audioManager.getMasterVolume() * 100);
        const sfxVolume = Math.round(audioManager.getSFXVolume() * 100);
        const musicVolume = Math.round(audioManager.getMusicVolume() * 100);

        document.getElementById('masterVolumeSlider').value = masterVolume;
        document.getElementById('masterVolumeValue').textContent = `${masterVolume}%`;

        document.getElementById('sfxVolumeSlider').value = sfxVolume;
        document.getElementById('sfxVolumeValue').textContent = `${sfxVolume}%`;

        document.getElementById('musicVolumeSlider').value = musicVolume;
        document.getElementById('musicVolumeValue').textContent = `${musicVolume}%`;

        // Load current pixel art setting
        const pixelArtToggle = document.getElementById('pixelArtToggle');
        if (pixelArtToggle) {
            // Get setting from MapRenderer if available, otherwise from localStorage
            if (this.mapRenderer) {
                pixelArtToggle.checked = this.mapRenderer.isPixelArtEnabled();
            } else {
                const saved = localStorage.getItem('nexusVerge_usePixelArt');
                pixelArtToggle.checked = saved === null ? true : saved === 'true';
            }
        }

        // Load current zoom setting
        this.updateZoomDisplay();

        modal.classList.add('active');
    }

    /**
     * Close Settings Modal
     */
    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        modal.classList.remove('active');
    }

    /**
     * Setup Legal Modal
     */
    setupLegalModal() {
        const modal = document.getElementById('legalModal');
        const closeBtn = document.getElementById('closeLegalBtn');
        const footerLink = document.getElementById('footerLegalLink');

        console.log('Legal Modal Setup:', {
            modal: modal ? 'Found' : 'NOT FOUND',
            closeBtn: closeBtn ? 'Found' : 'NOT FOUND',
            footerLink: footerLink ? 'Found' : 'NOT FOUND'
        });

        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeLegal());
        }

        // Footer link
        if (footerLink) {
            footerLink.addEventListener('click', (e) => {
                console.log('Footer legal link clicked!');
                e.preventDefault();
                this.openLegal();
            });
        }

        // Close on backdrop click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeLegal();
                }
            });
        }

        // ESC key to close (when modal is open)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
                this.closeLegal();
            }
        });
    }

    /**
     * Open Legal Modal
     */
    openLegal() {
        const modal = document.getElementById('legalModal');
        console.log('openLegal called:', {
            modal: modal ? 'Found' : 'NOT FOUND',
            hasActiveClass: modal?.classList.contains('active')
        });
        if (!modal) {
            console.error('Legal modal element not found!');
            return;
        }
        modal.classList.add('active');
        console.log('Legal modal opened - active class added');
    }

    /**
     * Close Legal Modal
     */
    closeLegal() {
        const modal = document.getElementById('legalModal');
        if (!modal) return;
        modal.classList.remove('active');
    }

    /**
     * Get contrasting text color (black or white) based on background color
     */
    getContrastColor(hexColor) {
        // Convert hex to RGB
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Return black for light backgrounds, white for dark
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    /**
     * Close Help Modal
     */
    closeHelp() {
        const modal = document.getElementById('helpModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Setup Quick Menu System (mouse-clickable UI bar)
     */
    setupQuickMenu() {
        const quickMenu = document.getElementById('quickMenu');
        const quickMenuToggle = document.getElementById('quickMenuToggle');
        const quickMenuChevron = document.getElementById('quickMenuChevron');
        const questBadge = document.getElementById('questBadge');

        if (!quickMenu || !quickMenuToggle) return;

        // Track collapsed state
        let isCollapsed = false;

        // Show quick menu when game screen is active
        const showQuickMenu = () => {
            if (this.currentScreen === 'game') {
                quickMenu.classList.remove('hidden');
            } else {
                quickMenu.classList.add('hidden');
            }
        };

        // Hide quick menu when combat starts
        gameState.subscribe('combat', (combat) => {
            if (combat && combat.active) {
                quickMenu.classList.add('hidden');
            } else if (this.currentScreen === 'game') {
                quickMenu.classList.remove('hidden');
            }
        });

        // Update quest badge count
        gameState.subscribe('quests', (quests) => {
            const activeCount = quests?.active?.length || 0;
            if (activeCount > 0) {
                questBadge.textContent = activeCount;
                questBadge.style.display = 'flex';
            } else {
                questBadge.style.display = 'none';
            }
        });

        // Collapse/Expand chevron button
        if (quickMenuChevron) {
            quickMenuChevron.addEventListener('click', (e) => {
                e.stopPropagation();
                isCollapsed = !isCollapsed;
                quickMenu.classList.toggle('collapsed', isCollapsed);
                quickMenuChevron.textContent = isCollapsed ? '▼' : '▲';
                quickMenuChevron.title = isCollapsed ? 'Expand Menu' : 'Collapse Menu';
            });
        }

        // Mobile toggle button
        quickMenuToggle.addEventListener('click', () => {
            quickMenu.classList.toggle('hidden');
        });

        // Quick menu button handlers
        const buttons = quickMenu.querySelectorAll('.quick-menu-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleQuickMenuAction(action);
            });
        });

        // Show/hide based on screen changes
        gameState.subscribe('ui.currentScreen', () => {
            showQuickMenu();
        });

        // Show quick menu immediately if already on game screen
        showQuickMenu();

        console.log('✅ Quick Menu initialized');
    }

    /**
     * Handle Quick Menu Actions
     */
    handleQuickMenuAction(action) {
        const combat = gameState.get('combat');

        // Prevent actions during combat (except help)
        if (combat && combat.active && action !== 'help') {
            gameState.addMessage('⚠️ Cannot access this during combat!', 'warning');
            return;
        }

        switch (action) {
            case 'inventory':
                this.openInventory();
                break;
            case 'character':
                this.openCharacterSheet();
                break;
            case 'quests':
                this.openQuestLog();
                break;
            case 'rest':
                restManager.openRestMenu();
                break;
            case 'map':
                this.openWorldMap();
                break;
            case 'save':
                this.openSaveMenu();
                break;
            case 'help':
                this.openHelp();
                break;
            case 'settings':
                this.openSettings();
                break;
            default:
                console.warn(`Unknown quick menu action: ${action}`);
        }
    }

    /**
     * Execute Passive Skill Check (Auto-roll, no user interaction)
     * Used for perception checks, passive detection, etc.
     * @param {Object} config - Skill check configuration
     * @param {Object} challenge - Challenge template
     * @param {Object} stage - Current stage
     * @param {Object} character - Character object
     * @param {string} skillId - Skill ID
     * @param {number} dc - Difficulty class
     * @param {number} skillBonus - Skill bonus
     * @returns {Promise<Object>} - Roll result and consequences
     */
    async executePassiveSkillCheck(config, challenge, stage, character, skillId, dc, skillBonus) {
        const modal = document.getElementById('skillCheckModal');

        // Auto-roll the skill check
        const rollResult = character.rollSkill(skillId, {
            advantage: config.advantage || false,
            disadvantage: config.disadvantage || false
        });

        const success = rollResult.total >= dc;

        // Build roll message
        let rollMessage = '';
        if (rollResult.advantage) {
            rollMessage = `🎲 Advantage: Rolled ${rollResult.rolls.join(' and ')}, using ${rollResult.roll}`;
        } else if (rollResult.disadvantage) {
            rollMessage = `🎲 Disadvantage: Rolled ${rollResult.rolls.join(' and ')}, using ${rollResult.roll}`;
        } else {
            rollMessage = `🎲 Rolled ${rollResult.roll}`;
        }
        rollMessage += ` + ${skillBonus} = ${rollResult.total}`;

        // Check for critical success/failure
        let criticalInfo = null;
        if (challenge && window.skillChallengeManager) {
            criticalInfo = window.skillChallengeManager.checkCritical(rollResult.roll, rollResult.total, dc);
        }

        // Log to message system
        if (success) {
            if (criticalInfo?.isCritical && criticalInfo.type === 'success') {
                gameState.addMessage(`🌟 CRITICAL SUCCESS! ${rollMessage} vs DC ${dc}`, 'success');
            } else {
                gameState.addMessage(`✅ Success! ${rollMessage} vs DC ${dc}`, 'success');
            }
        } else {
            if (criticalInfo?.isCritical && criticalInfo.type === 'failure') {
                gameState.addMessage(`💥 CRITICAL FAILURE! ${rollMessage} vs DC ${dc}`, 'danger');
            } else {
                gameState.addMessage(`❌ Failed! ${rollMessage} vs DC ${dc}`, 'danger');
            }
        }

        // Apply consequences if challenge provided
        let consequences = null;
        let outcome = null;
        if (challenge && window.skillChallengeManager) {
            outcome = success ? (stage?.onSuccess || challenge.onSuccess) : (stage?.onFailure || challenge.onFailure);
            if (outcome) {
                consequences = window.skillChallengeManager.applyConsequences(
                    character,
                    challenge,
                    outcome,
                    {
                        success,
                        critical: criticalInfo?.isCritical || false,
                        criticalType: criticalInfo?.type || null,
                        ...rollResult
                    }
                );

                // Save modified character back to gameState (damage, conditions, etc.)
                gameState.set('character', character);

                // Update HUD to reflect HP changes
                this.updateHUD(character);

                // Display consequence messages (kept for message log history)
                consequences.messages.forEach(msg => {
                    gameState.addMessage(msg, success ? 'success' : 'warning');
                });

                // Handle combat initiation
                if (outcome.consequences && outcome.consequences.includes('initiateCombat')) {
                    consequences.initiateCombat = true;
                }
            }
        }

        // Build final roll result object
        const finalRollResult = {
            ...rollResult,
            dc,
            modifier: skillBonus,
            critical: criticalInfo?.isCritical || false,
            criticalType: criticalInfo?.type || null
        };

        // Show outcome screen for passive checks (replaces old showPassiveCheckResult)
        if (challenge) {
            const triggersCombat = consequences?.initiateCombat || false;
            await this.showSkillChallengeOutcome({
                challenge,
                stage,
                rollResult: finalRollResult,
                success,
                consequences,
                outcome,
                stageHistory: config.stageHistory || [],
                triggersCombat
            });
        } else {
            // Fallback for non-challenge passive checks (show old modal briefly)
            this.showPassiveCheckResult(config, challenge, stage, rollResult, success, criticalInfo, dc, skillBonus);
        }

        return {
            attempted: true,
            success,
            rollResult: finalRollResult,
            consequences,
            // Pass enemyTypes for combat initiation from skill challenges
            enemyTypes: consequences?.enemyTypes || (outcome?.enemyTypes || null)
        };
    }

    /**
     * Show passive check result modal (auto-closes after delay)
     */
    showPassiveCheckResult(config, challenge, stage, rollResult, success, criticalInfo, dc, skillBonus) {
        const modal = document.getElementById('skillCheckModal');
        const skillId = stage?.skill || config.skill;
        const description = stage?.description || config.description;

        // Populate modal with result
        document.getElementById('skillCheckTitle').textContent = (config.title || challenge?.name || 'Skill Challenge') + ' - Result';
        document.getElementById('skillCheckDescription').textContent = description;
        document.getElementById('skillCheckType').textContent = `${skillId.toUpperCase()} Check (Passive)`;
        document.getElementById('skillCheckDC').textContent = `DC ${dc}`;
        document.getElementById('skillCheckBonus').textContent = `${skillBonus >= 0 ? '+' : ''}${skillBonus}`;

        // Show roll result
        const successChance = success ? '✅ SUCCESS' : '❌ FAILED';
        document.getElementById('skillCheckChance').textContent = successChance;

        // Show consequences
        const outcome = success ? (stage?.onSuccess || challenge?.onSuccess) : (stage?.onFailure || challenge?.onFailure);
        const consequencesList = document.getElementById('skillCheckConsequences');
        const resultMessages = [];

        if (success) {
            resultMessages.push(`<strong style="color: var(--success-color);">✅ ${outcome?.message || 'Success!'}</strong>`);
        } else {
            resultMessages.push(`<strong style="color: var(--error-color);">❌ ${outcome?.message || 'Failed!'}</strong>`);
        }

        consequencesList.innerHTML = resultMessages.join('<br>');

        // Hide buttons (passive roll, no interaction needed)
        document.getElementById('attemptSkillCheck').style.display = 'none';
        document.getElementById('cancelSkillCheck').style.display = 'none';

        // Show modal
        modal.classList.add('active');

        // Auto-close after 2 seconds
        setTimeout(() => {
            modal.classList.remove('active');
            // Restore buttons for future active challenges
            document.getElementById('attemptSkillCheck').style.display = 'inline-block';
            document.getElementById('cancelSkillCheck').style.display = 'inline-block';
        }, 2000);
    }

    /**
     * Prompt Skill Check Modal (Enhanced for Skill Challenges)
     * @param {Object} config - Skill check configuration
     * @param {Object} challenge - Optional challenge template from SkillChallengeManager
     * @param {Object} stage - Optional current stage for sequential challenges
     * @returns {Promise<Object>} - { attempted: boolean, success: boolean, rollResult: Object, consequences: Object }
     */
    async promptSkillCheck(config, challenge = null, stage = null) {
        const modal = document.getElementById('skillCheckModal');
        const character = gameState.get('character');

        // Get skill for current stage (sequential challenges) or main config
        const skillId = stage?.skill || config.skill;
        const dc = stage?.baseDC || config.dc;
        const description = stage?.description || config.description;
        const isPassiveRoll = stage?.passiveRoll || config.passiveRoll || false;

        // Calculate skill bonus
        const skillBonus = character.getSkillBonus(skillId);

        // If passive roll, auto-execute immediately
        if (isPassiveRoll) {
            return this.executePassiveSkillCheck(config, challenge, stage, character, skillId, dc, skillBonus);
        }

        // Populate modal
        document.getElementById('skillCheckTitle').textContent = config.title || challenge?.name || 'Skill Challenge';
        document.getElementById('skillCheckDescription').textContent = description;
        document.getElementById('skillCheckType').textContent = `${skillId.toUpperCase()} Check`;
        document.getElementById('skillCheckDC').textContent = `DC ${dc}`;
        document.getElementById('skillCheckBonus').textContent = `${skillBonus >= 0 ? '+' : ''}${skillBonus}`;

        // Calculate success chance (d20 + bonus >= DC)
        const successChance = Math.max(0, Math.min(100, ((21 - dc + skillBonus) * 5)));
        document.getElementById('skillCheckChance').textContent = `${successChance}%`;

        // Populate consequences (show outcomes but hide exact rewards)
        const consequencesList = document.getElementById('skillCheckConsequences');
        if (config.consequences && config.consequences.length > 0) {
            consequencesList.innerHTML = config.consequences
                .map(c => `<li>${c.description}</li>`)
                .join('');
        } else if (challenge) {
            // Auto-generate consequences from challenge template
            const consequences = [];

            // Success outcomes
            if (stage?.onSuccess || challenge.onSuccess) {
                const successData = stage?.onSuccess || challenge.onSuccess;
                if (successData.xp) consequences.push(`<strong>Success:</strong> Gain experience`);
                if (successData.gold) consequences.push(`<strong>Success:</strong> Find gold`);
                if (successData.loot) consequences.push(`<strong>Success:</strong> Discover treasure`);
                if (successData.message) consequences.push(`<strong>Success:</strong> ${successData.message}`);
            }

            // Failure outcomes
            if (stage?.onFailure || challenge.onFailure) {
                const failureData = stage?.onFailure || challenge.onFailure;
                if (failureData.damage) consequences.push(`<strong>Failure:</strong> Take damage`);
                if (failureData.condition) consequences.push(`<strong>Failure:</strong> Suffer ${failureData.condition}`);
                if (failureData.consequences) {
                    if (failureData.consequences.includes('initiateCombat')) {
                        consequences.push(`<strong>Failure:</strong> Combat!`);
                    }
                }
                if (failureData.message) consequences.push(`<strong>Failure:</strong> ${failureData.message}`);
            }

            consequencesList.innerHTML = consequences.join('<br>');
        } else {
            consequencesList.innerHTML = '<li>Unknown consequences</li>';
        }

        // Show/hide cancel button based on challenge
        const cancelBtn = document.getElementById('cancelSkillCheck');
        const canTurnBack = challenge?.canTurnBack !== false; // Default to true if not specified

        if (canTurnBack) {
            cancelBtn.style.display = 'inline-block';
        } else {
            cancelBtn.style.display = 'none';
        }

        // Show modal
        modal.classList.add('active');

        // Wait for user decision
        return new Promise((resolve) => {
            const attemptBtn = document.getElementById('attemptSkillCheck');

            const handleAttempt = async () => {
                cleanup();

                // Roll skill check using Character.rollSkill() with advantage/disadvantage support
                const rollResult = character.rollSkill(skillId, {
                    advantage: config.advantage || false,
                    disadvantage: config.disadvantage || false
                });

                const success = rollResult.total >= dc;

                // Show result message with roll details
                let rollMessage = '';
                if (rollResult.advantage) {
                    rollMessage = `🎲 Advantage: Rolled ${rollResult.rolls.join(' and ')}, using ${rollResult.roll}`;
                } else if (rollResult.disadvantage) {
                    rollMessage = `🎲 Disadvantage: Rolled ${rollResult.rolls.join(' and ')}, using ${rollResult.roll}`;
                } else {
                    rollMessage = `🎲 Rolled ${rollResult.roll}`;
                }

                rollMessage += ` + ${skillBonus} = ${rollResult.total}`;

                // Check for critical success/failure (if using SkillChallengeManager)
                let criticalInfo = null;
                if (challenge && window.skillChallengeManager) {
                    criticalInfo = window.skillChallengeManager.checkCritical(rollResult.roll, rollResult.total, dc);
                }

                if (success) {
                    if (criticalInfo?.isCritical && criticalInfo.type === 'success') {
                        gameState.addMessage(`🌟 CRITICAL SUCCESS! ${rollMessage} vs DC ${dc}`, 'success');
                    } else {
                        gameState.addMessage(`✅ Success! ${rollMessage} vs DC ${dc}`, 'success');
                    }
                } else {
                    if (criticalInfo?.isCritical && criticalInfo.type === 'failure') {
                        gameState.addMessage(`💥 CRITICAL FAILURE! ${rollMessage} vs DC ${dc}`, 'danger');
                    } else {
                        gameState.addMessage(`❌ Failed! ${rollMessage} vs DC ${dc}`, 'danger');
                    }
                }

                // Apply consequences if challenge provided
                let consequences = null;
                let outcome = null;
                if (challenge && window.skillChallengeManager) {
                    outcome = success ? (stage?.onSuccess || challenge.onSuccess) : (stage?.onFailure || challenge.onFailure);
                    if (outcome) {
                        consequences = window.skillChallengeManager.applyConsequences(
                            character,
                            challenge,
                            outcome,
                            {
                                success,
                                critical: criticalInfo?.isCritical || false,
                                criticalType: criticalInfo?.type || null,
                                ...rollResult
                            }
                        );

                        // Save modified character back to gameState (damage, conditions, etc.)
                        gameState.set('character', character);

                        // Update HUD to reflect HP changes
                        this.updateHUD(character);

                        // Display consequence messages (kept for message log history)
                        consequences.messages.forEach(msg => {
                            gameState.addMessage(msg, success ? 'success' : 'warning');
                        });

                        // Handle combat initiation
                        if (outcome.consequences && outcome.consequences.includes('initiateCombat')) {
                            consequences.initiateCombat = true;
                        }
                    }
                }

                // Build the final roll result object
                const finalRollResult = {
                    ...rollResult,
                    dc,
                    modifier: skillBonus,
                    critical: criticalInfo?.isCritical || false,
                    criticalType: criticalInfo?.type || null
                };

                // Show outcome screen if this is a skill challenge (not just a simple skill check)
                if (challenge) {
                    const triggersCombat = consequences?.initiateCombat || false;
                    console.log('🎭 Calling showSkillChallengeOutcome with outcome:', outcome);
                    console.log('🎭 Outcome keys:', outcome ? Object.keys(outcome) : 'null');
                    await this.showSkillChallengeOutcome({
                        challenge,
                        stage,
                        rollResult: finalRollResult,
                        success,
                        consequences,
                        outcome,
                        stageHistory: config.stageHistory || [],
                        triggersCombat
                    });
                }

                resolve({
                    attempted: true,
                    success,
                    rollResult: finalRollResult,
                    consequences,
                    // Pass enemyTypes for combat initiation from skill challenges
                    enemyTypes: consequences?.enemyTypes || (outcome?.enemyTypes || null)
                });
            };

            const handleCancel = () => {
                cleanup();
                resolve({ attempted: false, success: false, rollResult: null, consequences: null, enemyTypes: null });
            };

            const cleanup = () => {
                modal.classList.remove('active');
                attemptBtn.removeEventListener('click', handleAttempt);
                if (canTurnBack) {
                    cancelBtn.removeEventListener('click', handleCancel);
                }
            };

            attemptBtn.addEventListener('click', handleAttempt);
            if (canTurnBack) {
                cancelBtn.addEventListener('click', handleCancel);
            }
        });
    }

    /**
     * Show Skill Challenge Outcome Screen
     * Displays a dedicated outcome modal with narrative, dice breakdown, rewards/consequences
     * @param {Object} params - Outcome parameters
     * @param {Object} params.challenge - The challenge template
     * @param {Object} params.stage - Current stage (for sequential challenges)
     * @param {Object} params.rollResult - Roll result with dc, total, roll, critical, criticalType
     * @param {boolean} params.success - Whether the check was successful
     * @param {Object} params.consequences - Applied consequences (xp, gold, damage, items, messages)
     * @param {Object} params.outcome - The outcome object (onSuccess or onFailure)
     * @param {Array} params.stageHistory - History of completed stages for sequential challenges
     * @param {boolean} params.triggersCombat - Whether this outcome will initiate combat
     * @returns {Promise<void>} - Resolves when user dismisses the modal
     */
    showSkillChallengeOutcome({
        challenge,
        stage = null,
        rollResult,
        success,
        consequences,
        outcome,
        stageHistory = [],
        triggersCombat = false
    }) {
        return new Promise((resolve) => {
            const modal = document.getElementById('skillOutcomeModal');
            const header = document.getElementById('outcomeHeader');
            const icon = document.getElementById('outcomeIcon');
            const title = document.getElementById('outcomeTitle');
            const challengeName = document.getElementById('outcomeChallengeName');
            const narrativeEl = document.getElementById('outcomeNarrative');
            const rollDetails = document.getElementById('outcomeRollDetails');
            const stageProgress = document.getElementById('outcomeStageProgress');
            const rewardsSection = document.getElementById('outcomeRewards');
            const consequencesSection = document.getElementById('outcomeConsequences');
            const combatWarning = document.getElementById('outcomeCombatWarning');
            const closeBtn = document.getElementById('outcomeCloseBtn');

            // Determine outcome type for styling
            const isCriticalSuccess = rollResult.critical && rollResult.criticalType === 'success';
            const isCriticalFailure = rollResult.critical && rollResult.criticalType === 'failure';

            let outcomeClass = success ? 'success' : 'failure';
            if (isCriticalSuccess) outcomeClass = 'critical-success';
            if (isCriticalFailure) outcomeClass = 'critical-failure';

            // Set header styling
            header.className = `outcome-header ${outcomeClass}`;

            // Set icon and title
            if (isCriticalSuccess) {
                icon.textContent = '🌟';
                title.textContent = 'Critical Success!';
            } else if (isCriticalFailure) {
                icon.textContent = '💥';
                title.textContent = 'Critical Failure!';
            } else if (success) {
                icon.textContent = '✅';
                title.textContent = 'Success!';
            } else {
                icon.textContent = '❌';
                title.textContent = 'Failed!';
            }

            // Challenge name
            const stageName = stage?.description ? ` - ${stage.description}` : '';
            challengeName.textContent = (challenge?.name || 'Skill Challenge') + stageName;

            // Narrative text
            console.log('🎭 Outcome modal - outcome object:', outcome);
            console.log('🎭 Outcome message:', outcome?.message);
            const narrativeText = outcome?.message ||
                (success ? 'You succeed in your endeavor.' : 'Your attempt fails.');
            console.log('🎭 Final narrative text:', narrativeText);
            narrativeEl.textContent = narrativeText;

            // Roll details breakdown
            const skillId = stage?.skill || challenge?.skill || 'skill';
            const skillBonus = rollResult.modifier || 0;
            const dc = rollResult.dc;

            document.getElementById('outcomeRollDice').textContent = rollResult.roll;
            document.getElementById('outcomeRollBonus').textContent = `${skillBonus >= 0 ? '+' : ''}${skillBonus}`;
            document.getElementById('outcomeRollTotal').textContent = rollResult.total;
            document.getElementById('outcomeRollDC').textContent = dc;

            // Result indicator
            const resultEl = document.getElementById('outcomeRollResult');
            if (success) {
                resultEl.textContent = `Pass by ${rollResult.total - dc}`;
                resultEl.className = 'roll-value pass';
            } else {
                resultEl.textContent = `Miss by ${dc - rollResult.total}`;
                resultEl.className = 'roll-value fail';
            }

            // Stage progress (for sequential challenges)
            const stageList = document.getElementById('outcomeStageList');
            if (stageHistory && stageHistory.length > 0) {
                stageProgress.classList.add('active');
                stageList.innerHTML = stageHistory.map((s, i) => {
                    const stageClass = s.success ? 'completed' : 'failed';
                    const stageIcon = s.success ? '✅' : '❌';
                    const resultClass = s.success ? 'pass' : 'fail';
                    const resultText = s.success ?
                        `${s.rollResult.total} ≥ ${s.dc}` :
                        `${s.rollResult.total} < ${s.dc}`;
                    return `
                        <div class="stage-item ${stageClass}">
                            <span class="stage-icon">${stageIcon}</span>
                            <div class="stage-info">
                                <div class="stage-name">Stage ${i + 1}: ${s.description || s.skill}</div>
                                <div class="stage-skill">${s.skill?.toUpperCase() || 'SKILL'} Check (DC ${s.dc})</div>
                            </div>
                            <span class="stage-result ${resultClass}">${resultText}</span>
                        </div>
                    `;
                }).join('');
            } else {
                stageProgress.classList.remove('active');
            }

            // Rewards (on success)
            const rewardsList = document.getElementById('outcomeRewardsList');
            if (success && consequences && (consequences.xp > 0 || consequences.gold > 0 || (consequences.items && consequences.items.length > 0))) {
                rewardsSection.classList.add('active');
                let rewardsHTML = '';
                if (consequences.xp > 0) {
                    rewardsHTML += `<div class="reward-item"><span class="reward-icon">✨</span><span class="reward-value">+${consequences.xp} XP</span></div>`;
                }
                if (consequences.gold > 0) {
                    rewardsHTML += `<div class="reward-item"><span class="reward-icon">💰</span><span class="reward-value">+${consequences.gold} Gold</span></div>`;
                }
                if (consequences.items && consequences.items.length > 0) {
                    consequences.items.forEach(item => {
                        rewardsHTML += `<div class="reward-item"><span class="reward-icon">📦</span><span class="reward-value">${item.name}</span></div>`;
                    });
                }
                rewardsList.innerHTML = rewardsHTML;
            } else {
                rewardsSection.classList.remove('active');
            }

            // Consequences (damage, conditions on failure)
            const consequencesList = document.getElementById('outcomeConsequencesList');
            if (consequences && (consequences.damage > 0 || (consequences.conditions && consequences.conditions.length > 0))) {
                consequencesSection.classList.add('active');
                let consequencesHTML = '';
                if (consequences.damage > 0) {
                    const damageType = outcome?.damageType || 'damage';
                    consequencesHTML += `
                        <div class="consequence-item">
                            <span class="consequence-icon">💔</span>
                            <span class="consequence-text">Took</span>
                            <span class="consequence-value">${consequences.damage} ${damageType}</span>
                        </div>
                    `;
                }
                if (consequences.conditions && consequences.conditions.length > 0) {
                    consequences.conditions.forEach(condition => {
                        consequencesHTML += `
                            <div class="consequence-item">
                                <span class="consequence-icon">🌀</span>
                                <span class="consequence-text">Afflicted:</span>
                                <span class="consequence-value">${condition}</span>
                            </div>
                        `;
                    });
                }
                consequencesList.innerHTML = consequencesHTML;
            } else {
                consequencesSection.classList.remove('active');
            }

            // Combat warning
            if (triggersCombat) {
                combatWarning.classList.add('active');
                closeBtn.classList.add('combat');
                closeBtn.textContent = 'Engage Combat!';
            } else {
                combatWarning.classList.remove('active');
                closeBtn.classList.remove('combat');
                closeBtn.textContent = 'Continue';
            }

            // Show modal
            modal.classList.add('active');

            // Handle close
            const handleClose = () => {
                modal.classList.remove('active');
                closeBtn.removeEventListener('click', handleClose);
                resolve();
            };

            closeBtn.addEventListener('click', handleClose);
        });
    }

    /**
     * Render Complete Character Sheet
     */
    renderCharacterSheet() {
        const character = gameState.get('character');
        if (!character) return;

        // Debug logging for fighting style
        console.log('🎯 Rendering character sheet');
        console.log('Fighting Style:', character.fightingStyle);
        console.log('Ability Uses:', character.abilityUses);
        console.log('Weapon Masteries:', character.weaponMasteries);

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
                    // Skip "Fighting Style" feature - we'll display it separately
                    if (feature.name === 'Fighting Style') {
                        return;
                    }
                    features.push(feature);
                });
            }
        }

        // Add selected fighting style as a separate feature if one is selected
        if (character.fightingStyle) {
            const fightingStyleDetails = this.getFightingStyleDetails(character.fightingStyle);
            features.unshift({
                name: `Fighting Style: ${fightingStyleDetails.name}`,
                description: fightingStyleDetails.description
            });
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
     * Get fighting style details by ID
     */
    getFightingStyleDetails(styleId) {
        const styles = {
            marksmanship: {
                name: 'Marksmanship',
                description: '+2 bonus to attack rolls with ranged weapons.'
            },
            defense: {
                name: 'Defense',
                description: '+1 bonus to AC while wearing armor.'
            },
            dueling: {
                name: 'Dueling',
                description: '+2 bonus to damage rolls when wielding a melee weapon in one hand and no other weapons.'
            },
            greatWeaponFighting: {
                name: 'Great Weapon Fighting',
                description: 'When you roll a 1 or 2 on a damage die for an attack with a two-handed melee weapon, you can reroll the die (must use new roll).'
            },
            mariner: {
                name: 'Mariner',
                description: 'You can traverse deep water without penalty. While not wearing heavy armor or using a shield, you gain +1 bonus to AC and swimming/climbing speed equal to walking speed.'
            },
            unarmedFighting: {
                name: 'Unarmed Fighting',
                description: 'Your unarmed strikes deal 1d6 bludgeoning damage (1d8 if both hands are free). At the start of your turn, you can deal 1d4 bludgeoning damage to one creature grappled by you.'
            },
            twoWeaponFighting: {
                name: 'Two-Weapon Fighting',
                description: 'When engaging in two-weapon fighting, you can add your ability modifier to the damage of the second attack.'
            },
            protection: {
                name: 'Protection',
                description: 'When a creature you can see attacks a target other than you within 5 feet, you can use your reaction to impose disadvantage on the attack roll. You must be wielding a shield.'
            },
            blindFighting: {
                name: 'Blind Fighting',
                description: 'You have blindsight with a range of 10 feet. Within that range, you can see invisible creatures and objects, and darkness doesn\'t impose disadvantage on your attacks.'
            },
            interception: {
                name: 'Interception',
                description: 'When a creature you can see hits a target within 5 feet of you with an attack, you can use your reaction to reduce the damage by 1d10 + your proficiency bonus. You must be wielding a shield or simple/martial weapon.'
            },
            thrownWeaponFighting: {
                name: 'Thrown Weapon Fighting',
                description: 'You can draw a weapon with the thrown property as part of the attack. When you hit with a ranged attack using a thrown weapon, you gain +2 bonus to the damage roll.'
            },
            superiorTechnique: {
                name: 'Superior Technique',
                description: 'You learn one maneuver from the Battle Master archetype. You gain one superiority die (d6), which you can use to fuel the maneuver. It recharges on a short or long rest.'
            }
        };

        return styles[styleId] || { name: 'Unknown', description: 'Fighting style not found.' };
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
            offHand: character.equipment.offHand,
            helmet: character.equipment.helmet,
            artifact: character.equipment.artifact
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
            const viewportSize = this.calculateOptimalViewport();
            this.mapRenderer = new MapRenderer('gameCanvas', {
                tileWidth: 16,  // 16x16 pixel art tiles
                tileHeight: 16,
                viewportWidth: viewportSize.width,
                viewportHeight: viewportSize.height
            });
        }

        // Reinitialize settlement UI
        if (!this.settlementUI) {
            this.settlementUI = new SettlementUI(null);
        }

        // Get campaign ID for filtering
        const campaignId = worldConfig?.campaignId || 'nexus-verge';

        // Initialize NPC generator
        if (!this.npcGenerator) {
            console.log('👥 Initializing NPC generator...');
            this.npcGenerator = new NPCGenerator(seed, campaignId);
            await this.npcGenerator.loadData();
        }

        // Initialize quest systems
        if (!this.questGenerator) {
            console.log('📜 Initializing quest generator...');
            this.questGenerator = new QuestGenerator(seed, campaignId);
            await this.questGenerator.loadData();
        }

        if (!this.questManager) {
            console.log('📜 Initializing quest manager...');
            this.questManager = new QuestManager(this.questGenerator);
            await this.questManager.initialize();
        }

        // Initialize merchant manager
        if (!this.merchantManager) {
            console.log('🏪 Initializing merchant manager...');
            this.merchantManager = new MerchantManager(seed, campaignId);
            await this.merchantManager.loadData();
            this.settlementUI.merchantManager = this.merchantManager;
        }

        // Initialize skill challenge system
        if (!this.skillChallengeManager.challenges) {
            console.log('🎲 Initializing skill challenge system...');
            const skillChallengesData = await fetch('data/skillChallenges.json').then(r => r.json());
            await this.skillChallengeManager.loadChallenges(skillChallengesData);
            window.skillChallengeManager = this.skillChallengeManager;
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
