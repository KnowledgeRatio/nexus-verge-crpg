/**
 * World Generator
 * Handles procedural generation of world regions using Simplex noise
 */

import SimplexNoise from '../utils/simplexNoise.js';
import { SeededRandom, hashString } from '../utils/rng.js';
import { RULES } from '../core/rulesEngine.js';
import { gameState } from '../core/GameState.js';
import NPCGenerator from './NPCGenerator.js';

class WorldGenerator {
    constructor(worldSeed, config = {}) {
        this.worldSeed = worldSeed;
        this.config = {
            mapSize: config.mapSize || 'medium',
            difficulty: config.difficulty || 'normal',
            campaignId: config.campaignId || 'default',
            ...config
        };

        // Initialize noise generators with seed
        const numericSeed = hashString(worldSeed);
        this.elevationNoise = new SimplexNoise(numericSeed);
        this.moistureNoise = new SimplexNoise(numericSeed + 1000);
        this.temperatureNoise = new SimplexNoise(numericSeed + 2000);
        this.featureNoise = new SimplexNoise(numericSeed + 3000);
        this.riverNoise = new SimplexNoise(numericSeed + 4000); // Separate noise channel to carve rivers
        this.biomeNoise = new SimplexNoise(numericSeed + 5000); // Coarse noise for macro biome regions

        // Base RNG for discrete decisions
        this.baseRNG = new SeededRandom(worldSeed);

        // NPC Generator
        this.npcGenerator = new NPCGenerator(worldSeed);

        // Terrain types (will be loaded from data/terrains.json)
        this.terrainTypes = null;

        // Finite world configuration
        const worldSize = RULES.worldGen.worldSizes[this.config.mapSize] || RULES.worldGen.worldSizes.medium;
        this.worldBounds = {
            minX: -Math.floor(worldSize / 2),
            maxX: Math.floor(worldSize / 2),
            minY: -Math.floor(worldSize / 2),
            maxY: Math.floor(worldSize / 2),
            size: worldSize
        };

        // World metadata (pre-generated, kept in memory)
        this.worldMetadata = {
            settlements: [],     // All settlement locations pre-generated
            roads: [],           // All road paths pre-generated
            features: [],        // All POI locations pre-generated
            generated: false     // Flag to track if metadata has been generated
        };
    }

    /**
     * Load terrain definitions
     */
    async loadTerrainData() {
        if (!this.terrainTypes) {
            // Add cache-busting timestamp to force fresh load
            const response = await fetch(`data/terrains.json?v=${Date.now()}`);
            this.terrainTypes = await response.json();
        }
        return this.terrainTypes;
    }

    /**
     * Generate a region at the given coordinates
     * @param {number} regionX - Region X coordinate
     * @param {number} regionY - Region Y coordinate
     * @returns {Object} Region data with tiles and features
     */
    async generateRegion(regionX, regionY) {
        // Check gameState cache first
        const cacheKey = `${regionX},${regionY}`;
        const generatedRegions = gameState.get('world.generatedRegions');

        if (generatedRegions && generatedRegions.has(cacheKey)) {
            const cached = generatedRegions.get(cacheKey);
            // Check if this is compressed saved data that needs restoration
            if (cached.exploredTiles && !cached.tiles) {
                // This is compressed data, regenerate and merge
                return await this.regenerateAndMerge(regionX, regionY, cached);
            }
            return cached;
        }

        // Ensure terrain data is loaded
        await this.loadTerrainData();

        // Create region-specific RNG
        const regionSeedString = `${this.worldSeed}_${regionX}_${regionY}`;
        const regionRNG = new SeededRandom(regionSeedString);

        const regionSize = RULES.worldGen.regionSize;
        const tiles = [];

        // Generate tiles
        for (let localY = 0; localY < regionSize; localY++) {
            for (let localX = 0; localX < regionSize; localX++) {
                const worldX = regionX * regionSize + localX;
                const worldY = regionY * regionSize + localY;

                const tile = this.generateTile(worldX, worldY, regionRNG);
                tiles.push(tile);
            }
        }

        // Generate features (settlements, dungeons, etc.)
        const features = await this.generateFeatures(regionX, regionY, regionRNG, tiles);

        // Restore persistent settlement data if this region was visited before
        this.restoreSettlementData(features);

        // Link features to their tiles (so tile.feature exists)
        for (const feature of features) {
            const tile = tiles.find(t => t.x === feature.x && t.y === feature.y);
            if (tile) {
                tile.feature = feature;
            }
        }

        // Generate roads connecting settlements BEFORE storing region
        await this.generateRoads(regionX, regionY, tiles, features);

        const region = {
            x: regionX,
            y: regionY,
            tiles,
            features,
            generated: Date.now()
        };

        // Store region in gameState
        const regions = gameState.get('world.generatedRegions') || new Map();
        regions.set(cacheKey, region);
        gameState.set('world.generatedRegions', regions);

        return region;
    }

    /**
     * Generate a single tile
     */
    generateTile(worldX, worldY, rng) {
        const scale = RULES.worldGen.biomeNoiseScale;

        // Get noise values
        const elevation = this.elevationNoise.octaveNoise2D(worldX * scale, worldY * scale, 4, 0.5);
        const moisture = this.moistureNoise.octaveNoise2D(worldX * scale * 0.6, worldY * scale * 0.6, 3, 0.5);
        const temperature = this.temperatureNoise.octaveNoise2D(worldX * scale * 0.8, worldY * scale * 0.8, 3, 0.5);
        const riverMask = Math.abs(this.riverNoise.octaveNoise2D(worldX * 0.01, worldY * 0.01, 2, 0.8));

        // Coarse biome noise for macro-scale biome regions (larger, smoother)
        const biomeNoise = this.biomeNoise.octaveNoise2D(worldX * 0.02, worldY * 0.02, 2, 0.5);

        // Select terrain based on two-layer system: macro biome → micro terrain
        let terrainType = this.selectTerrain(elevation, moisture, temperature, biomeNoise);

        // Check if this tile is on a pre-generated road (FINITE WORLD FEATURE)
        if (this.isRoadTile(worldX, worldY)) {
            // Only place roads on traversable land (not water/mountains)
            if (terrainType !== 'deepWater' &&
                terrainType !== 'shallowWater' &&
                terrainType !== 'ocean' &&
                terrainType !== 'mountain') {
                terrainType = 'road';
            }
        }

        // Carve rivers: thin, winding strips with occasional deeper channels
        if (terrainType !== 'deepWater' && terrainType !== 'shallowWater' && terrainType !== 'road') {
            if (riverMask < 0.02 && elevation > -0.2) {
                terrainType = 'deepWater';
            } else if (riverMask < 0.04 && elevation > -0.2) {
                terrainType = 'shallowWater';
            }
        }

        return {
            x: worldX,
            y: worldY,
            terrain: terrainType,
            elevation,
            moisture,
            temperature,
            explored: false,
            visible: false
        };
    }

    /**
     * Select macro biome based on elevation, moisture, temperature, and biome noise
     * Returns a biome ID that determines which terrain types can appear
     */
    selectMacroBiome(elevation, moisture, temperature, biomeNoise) {
        // Normalize noise values from [-1, 1] to [0, 1]
        const e = (elevation + 1) / 2;
        const m = (moisture + 1) / 2;
        const t = (temperature + 1) / 2;
        const b = (biomeNoise + 1) / 2;

        // Ocean (extreme low elevation)
        if (e < 0.10) return 'ocean';

        // Coastal (low elevation near water)
        if (e < 0.30) return 'coastal';

        // Mountain (very high elevation)
        if (e > 0.75) return 'mountain';

        // SMOOTHED TEMPERATURE ZONES - wider thresholds prevent harsh adjacency
        // Very cold regions (temperature < 0.25)
        if (t < 0.25) {
            if (m > 0.5) return 'swampland'; // Cold swamps
            return 'tundra';
        }

        // Cold-to-temperate transition zone (0.25-0.35)
        if (t < 0.35) {
            // Mix of cold forest and grassland based on moisture
            if (m > 0.6) return 'swampland';
            if (m > 0.4) return 'temperateForest'; // Cold forests
            return 'grassland'; // Cool grasslands
        }

        // Very hot regions (temperature > 0.75)
        if (t > 0.75) {
            if (m < 0.3) return 'desert';
            if (m > 0.6) return 'jungle';
            return 'grassland'; // Hot grasslands/savanna
        }

        // Hot-to-temperate transition zone (0.65-0.75)
        if (t > 0.65) {
            // Mix of warm grassland and light forests
            if (m < 0.25) return 'grassland'; // Warm dry grasslands (approaching desert)
            if (m > 0.7) return 'temperateForest'; // Warm wet forests (approaching jungle)
            return 'grassland'; // Savanna-like temperate grasslands
        }

        // Temperate core zone (0.35-0.65) - use moisture + biome noise for variation
        if (m > 0.6) {
            // Wet temperate
            if (b > 0.6) return 'swampland';
            return 'temperateForest';
        } else if (m > 0.3) {
            // Medium moisture temperate
            return 'grassland';
        } else {
            // Dry temperate
            return 'grassland';
        }
    }

    /**
     * Select terrain type based on environmental values using two-layer system
     * Layer 1: Determine macro biome (coarse, large regions)
     * Layer 2: Select micro terrain from allowed pool (fine detail)
     */
    selectTerrain(elevation, moisture, temperature, biomeNoise) {
        // Normalize noise values from [-1, 1] to [0, 1]
        const e = (elevation + 1) / 2;
        const m = (moisture + 1) / 2;

        // Step 1: Determine macro biome using coarse biome noise
        const macroBiome = this.selectMacroBiome(elevation, moisture, temperature, biomeNoise);

        // Step 2: Get allowed terrain types for this biome
        const allowedTerrains = RULES.biomes.terrainPools[macroBiome] || ['grassland'];

        // Step 3: Select micro terrain from allowed pool based on elevation/moisture
        // If only one terrain in pool, return it
        if (allowedTerrains.length === 1) {
            return allowedTerrains[0];
        }

        // Ocean biome - only ocean terrain
        if (macroBiome === 'ocean') {
            return 'ocean';
        }

        // Coastal biome - varies by elevation
        // Beach only appears at true coastlines (narrow elevation band)
        // Water appears at lower elevations (< 0.15)
        if (macroBiome === 'coastal') {
            if (e < 0.15) return 'shallowWater';
            // Beach: narrow band between water and land (0.15-0.22)
            // This prevents beach from appearing in middle of lakes
            if (e < 0.22) return 'beach';
            // Higher coastal elevations based on moisture
            if (m > 0.6) return 'swamp';
            if (e < 0.28) return 'grassland';
            return 'plains'; // Transition to inland terrain
        }

        // Mountain biome - varies by elevation
        if (macroBiome === 'mountain') {
            if (e > 0.85) return 'mountain';
            return 'hills';
        }

        // Temperate Forest biome - varies by moisture
        if (macroBiome === 'temperateForest') {
            if (m < 0.3) return 'grassland';
            if (m < 0.5) return 'plains';
            if (m < 0.75) return 'forest';
            return 'denseForest';
        }

        // Grassland biome - subtle variation
        if (macroBiome === 'grassland') {
            if (m > 0.5) return 'savanna';
            if (m > 0.3) return 'grassland';
            return 'plains';
        }

        // Desert biome - single terrain
        if (macroBiome === 'desert') {
            return 'desert';
        }

        // Jungle biome - varies by moisture
        if (macroBiome === 'jungle') {
            if (m > 0.7) return 'swamp';
            return 'jungle';
        }

        // Tundra biome - varies by temperature
        if (macroBiome === 'tundra') {
            if (m > 0.5) return 'tundra';
            return 'snowyPlains';
        }

        // Swampland biome - varies by elevation
        if (macroBiome === 'swampland') {
            if (e < 0.35) return 'shallowWater';
            if (m > 0.6) return 'swamp';
            return 'grassland';
        }

        // Fallback: Return first terrain in pool
        return allowedTerrains[0];
    }

    /**
     * Generate features for a region (settlements, dungeons, etc.)
     * UPDATED: Uses pre-generated metadata instead of procedural generation
     */
    async generateFeatures(regionX, regionY, rng, tiles) {
        const features = [];
        const regionSize = RULES.worldGen.regionSize;

        // If finite world is enabled and metadata is generated, use pre-generated features
        if (RULES.worldGen.finiteWorld.enabled && this.worldMetadata.generated) {
            // Find all settlements in this region
            const settlementsInRegion = this.worldMetadata.settlements.filter(s => {
                const sRegionX = Math.floor(s.x / regionSize);
                const sRegionY = Math.floor(s.y / regionSize);
                return sRegionX === regionX && sRegionY === regionY;
            });

            // Find all features in this region
            const featuresInRegion = this.worldMetadata.features.filter(f => {
                const fRegionX = Math.floor(f.x / regionSize);
                const fRegionY = Math.floor(f.y / regionSize);
                return fRegionX === regionX && fRegionY === regionY;
            });

            // Merge and return (NPCs already generated if settlement visited)
            return [...settlementsInRegion, ...featuresInRegion];
        }

        // FALLBACK: Old procedural generation if metadata not available
        // This shouldn't be reached if finite world is enabled

        // Check for settlement
        const settlementChance = 1.0 / RULES.worldGen.townSpacing;
        if (rng.next() < settlementChance) {
            // Find suitable location (not water, not mountain)
            const suitableTiles = tiles.filter(t => {
                const terrain = t.terrain;
                return terrain !== 'deepWater' &&
                       terrain !== 'shallowWater' &&
                       terrain !== 'mountain';
            });

            if (suitableTiles.length > 0) {
                const location = rng.choice(suitableTiles);

                // Settlement size based on distance from center
                const distFromCenter = Math.sqrt(regionX * regionX + regionY * regionY);
                let settlementType;

                if (distFromCenter < 3) {
                    settlementType = 'city';
                } else if (distFromCenter < 8) {
                    settlementType = 'town';
                } else {
                    settlementType = 'village';
                }

                const settlement = {
                    type: 'settlement',
                    settlementType,
                    x: location.x,
                    y: location.y,
                    name: this.generateSettlementName(rng),
                    population: this.getSettlementPopulation(settlementType, rng),
                    npcs: [] // Will be filled by NPC generator
                };

                // Generate NPCs for this settlement
                try {
                    settlement.npcs = await this.npcGenerator.generateNPCsForSettlement(settlement);
                } catch (error) {
                    console.error(`Failed to generate NPCs for ${settlement.name}:`, error);
                    settlement.npcs = []; // Fallback to no NPCs
                }

                features.push(settlement);
            }
        }

        // Check for sanctuary (2x as common as settlements)
        const sanctuaryChance = 2.0 / RULES.worldGen.townSpacing;
        if (rng.next() < sanctuaryChance) {
            // Find suitable location (prefer forests, hills, peaceful areas)
            const suitableTiles = tiles.filter(t => {
                const terrain = t.terrain;
                return terrain !== 'deepWater' &&
                       terrain !== 'shallowWater' &&
                       terrain !== 'mountain';
            });

            if (suitableTiles.length > 0) {
                const location = rng.choice(suitableTiles);

                features.push({
                    type: 'sanctuary',
                    x: location.x,
                    y: location.y,
                    name: this.generateSanctuaryName(rng),
                    discovered: false
                });
            }
        }

        // Check for dungeon
        if (rng.next() < RULES.worldGen.dungeonFrequency) {
            const mountainTiles = tiles.filter(t =>
                t.terrain === 'mountain' || t.terrain === 'hills'
            );

            if (mountainTiles.length > 0) {
                const location = rng.choice(mountainTiles);
                features.push({
                    type: 'dungeon',
                    x: location.x,
                    y: location.y,
                    difficulty: rng.nextInt(1, 5),
                    explored: false
                });
            }
        }

        // Check for points of interest
        if (rng.next() < 0.15) {
            const location = rng.choice(tiles);
            const poiTypes = ['shrine', 'ruins', 'cave', 'camp', 'landmark'];

            features.push({
                type: 'poi',
                poiType: rng.choice(poiTypes),
                x: location.x,
                y: location.y,
                discovered: false
            });
        }

        return features;
    }

    /**
     * Generate a settlement name
     */
    generateSettlementName(rng) {
        const prefixes = [
            'Iron', 'Stone', 'Silver', 'Gold', 'Green', 'Oak', 'Elm', 'River',
            'Lake', 'High', 'Low', 'New', 'Old', 'North', 'South', 'East', 'West',
            'Bright', 'Dark', 'Shadow', 'Sun', 'Moon', 'Star'
        ];

        const suffixes = [
            'vale', 'ford', 'bridge', 'port', 'haven', 'field', 'wood', 'shire',
            'ton', 'burg', 'hold', 'keep', 'mount', 'crest', 'fall', 'gate',
            'mill', 'brook', 'glen', 'hollow', 'peak', 'ridge'
        ];

        const prefix = rng.choice(prefixes);
        const suffix = rng.choice(suffixes);

        return `${prefix}${suffix}`;
    }

    /**
     * Generate a sanctuary name
     */
    generateSanctuaryName(rng) {
        const prefixes = [
            'Sacred', 'Blessed', 'Holy', 'Divine', 'Ancient', 'Peaceful', 'Serene',
            'Tranquil', 'Hallowed', 'Mystic', 'Celestial', 'Eternal'
        ];

        const types = [
            'Shrine', 'Grove', 'Temple', 'Chapel', 'Sanctum', 'Haven',
            'Refuge', 'Retreat', 'Rest', 'Oasis'
        ];

        const prefix = rng.choice(prefixes);
        const type = rng.choice(types);

        return `${prefix} ${type}`;
    }

    /**
     * Get settlement population range
     */
    getSettlementPopulation(type, rng) {
        switch (type) {
            case 'city':
                return rng.nextInt(5000, 20000);
            case 'town':
                return rng.nextInt(1000, 5000);
            case 'village':
                return rng.nextInt(50, 500);
            default:
                return 100;
        }
    }

    /**
     * Get spawn location (starting position for player)
     */
    async getSpawnLocation() {
        // Start near center (region 0,0) in a safe area
        const spawnRegion = await this.generateRegion(0, 0);

        // Find first non-water, non-mountain tile
        const safeTile = spawnRegion.tiles.find(t => {
            const terrain = t.terrain;
            return terrain !== 'deepWater' &&
                   terrain !== 'shallowWater' &&
                   terrain !== 'mountain';
        });

        return safeTile || spawnRegion.tiles[0];
    }

    /**
     * Get region coordinates from world coordinates
     */
    getRegionCoords(worldX, worldY) {
        const regionSize = RULES.worldGen.regionSize;
        return {
            regionX: Math.floor(worldX / regionSize),
            regionY: Math.floor(worldY / regionSize),
            localX: ((worldX % regionSize) + regionSize) % regionSize,
            localY: ((worldY % regionSize) + regionSize) % regionSize
        };
    }

    /**
     * Get tile at world coordinates
     */
    async getTile(worldX, worldY) {
        const { regionX, regionY, localX, localY } = this.getRegionCoords(worldX, worldY);
        const region = await this.generateRegion(regionX, regionY);

        const regionSize = RULES.worldGen.regionSize;
        const index = localY * regionSize + localX;

        // Return the tile reference (changes to this object will persist in the region)
        return region.tiles[index];
    }

    /**
     * Clear distant regions from cache to save memory
     */
    pruneCache(centerX, centerY, keepRadius = 3) {
        const generatedRegions = gameState.get('world.generatedRegions');
        if (!generatedRegions) return;

        const toDelete = [];

        for (const [key, region] of generatedRegions.entries()) {
            const distance = Math.sqrt(
                Math.pow(region.x - centerX, 2) +
                Math.pow(region.y - centerY, 2)
            );

            if (distance > keepRadius) {
                // Before deleting region, extract and persist settlement data
                this.persistSettlementData(region);
                toDelete.push(key);
            }
        }

        toDelete.forEach(key => generatedRegions.delete(key));

        if (toDelete.length > 0) {
            console.log(`🧹 Pruned ${toDelete.length} regions from cache (settlement data preserved)`);
        }
    }

    /**
     * Extract settlement data from a region before pruning
     * Stores settlement state in gameState.world.settlements
     */
    persistSettlementData(region) {
        if (!region || !region.features) return;

        const settlements = gameState.get('world.settlements') || [];
        const existingSettlementIds = new Set(settlements.map(s => `${s.x},${s.y}`));

        // Find all settlements in this region
        const regionSettlements = region.features.filter(f => f.type === 'settlement');

        for (const settlement of regionSettlements) {
            const settlementId = `${settlement.x},${settlement.y}`;

            // If this settlement is NOT already in persistent storage, add it
            if (!existingSettlementIds.has(settlementId)) {
                console.log(`💾 Persisting settlement: ${settlement.name} at (${settlement.x}, ${settlement.y})`);
                settlements.push({
                    ...settlement,
                    id: settlementId,
                    // Ensure these fields are preserved
                    npcs: settlement.npcs || [],
                    questsGenerated: settlement.questsGenerated || false,
                    visitedAt: settlement.visitedAt || null
                });
            } else {
                // Update existing settlement with latest state
                const index = settlements.findIndex(s => s.id === settlementId);
                if (index !== -1) {
                    console.log(`💾 Updating settlement: ${settlement.name} at (${settlement.x}, ${settlement.y})`);
                    settlements[index] = {
                        ...settlements[index],
                        ...settlement,
                        id: settlementId
                    };
                }
            }
        }

        gameState.set('world.settlements', settlements);
    }

    /**
     * Restore settlement data from persistent storage when regenerating a region
     * Replaces freshly-generated settlements with their persistent counterparts
     */
    restoreSettlementData(features) {
        const persistedSettlements = gameState.get('world.settlements') || [];

        if (persistedSettlements.length === 0) return;

        // Build lookup map by coordinates
        const persistedByCoords = new Map();
        for (const settlement of persistedSettlements) {
            persistedByCoords.set(`${settlement.x},${settlement.y}`, settlement);
        }

        // Replace generated settlements with persisted data
        for (let i = 0; i < features.length; i++) {
            const feature = features[i];
            if (feature.type === 'settlement') {
                const settlementId = `${feature.x},${feature.y}`;
                const persisted = persistedByCoords.get(settlementId);

                if (persisted) {
                    console.log(`♻️ Restoring settlement: ${persisted.name} at (${persisted.x}, ${persisted.y})`);
                    // Replace with persisted data
                    features[i] = persisted;
                }
            }
        }
    }

    /**
     * Load regions from game state (used after loading a save)
     * @param {Map} savedRegions - Map of region keys to region data
     */
    loadSavedRegions(savedRegions) {
        if (!savedRegions || !(savedRegions instanceof Map)) {
            console.warn('⚠️ No saved regions to load');
            return;
        }

        // Set regions directly in gameState (they're already there from deserialization)
        console.log(`📂 Loaded ${savedRegions.size} regions from save`);
    }

    /**
     * Regenerate region from seed and merge in saved data (fog of war, features)
     * @param {number} regionX - Region X coordinate
     * @param {number} regionY - Region Y coordinate
     * @param {Object} compressedData - Compressed region data from save
     * @returns {Object} Full region with merged data
     */
    async regenerateAndMerge(regionX, regionY, compressedData) {
        console.log(`🔄 Regenerating region ${regionX},${regionY} from seed and merging saved data`);

        // Ensure terrain data is loaded
        await this.loadTerrainData();

        // Regenerate terrain from seed (deterministic)
        const regionSeedString = `${this.worldSeed}_${regionX}_${regionY}`;
        const regionRNG = new SeededRandom(regionSeedString);

        const regionSize = RULES.worldGen.regionSize;
        const tiles = [];

        // Generate tiles
        for (let localY = 0; localY < regionSize; localY++) {
            for (let localX = 0; localX < regionSize; localX++) {
                const worldX = regionX * regionSize + localX;
                const worldY = regionY * regionSize + localY;

                const tile = this.generateTile(worldX, worldY, regionRNG);
                tiles.push(tile);
            }
        }

        // Restore fog of war from compressed data
        if (compressedData.exploredTiles) {
            for (const saved of compressedData.exploredTiles) {
                const index = saved.y * regionSize + saved.x;
                if (tiles[index]) {
                    tiles[index].explored = saved.explored;
                    tiles[index].visible = saved.visible;
                    tiles[index].modified = saved.modified;
                }
            }
        }

        // Use saved features (settlements, dungeons, etc.) - don't regenerate!
        const features = compressedData.features || [];

        // Restore settlement data if present
        this.restoreSettlementData(features);

        // Create full region object
        const region = {
            x: regionX,
            y: regionY,
            tiles: tiles,
            features: features,
            modifications: compressedData.modifications || []
        };

        // Store in cache
        const cacheKey = `${regionX},${regionY}`;
        const generatedRegions = gameState.get('world.generatedRegions');
        if (generatedRegions) {
            generatedRegions.set(cacheKey, region);
        }

        console.log(`✅ Region ${regionX},${regionY} regenerated with ${features.length} features`);

        return region;
    }

    /**
     * Generate roads connecting settlements
     * Roads connect settlements within a reasonable distance
     * SIMPLIFIED: Just marks settlement tiles as having road connections
     * Actual road rendering happens during tile generation based on proximity to settlements
     */
    async generateRoads(regionX, regionY, tiles, features) {
        const settlements = features.filter(f => f.type === 'settlement');
        if (settlements.length === 0) return; // No settlements to connect

        const generatedRegions = gameState.get('world.generatedRegions') || new Map();
        const searchRadius = 3; // Check 3 regions in each direction

        // Collect all settlements within search radius (including current region)
        const nearbySettlements = [...settlements];

        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
            for (let dy = -searchRadius; dy <= searchRadius; dy++) {
                if (dx === 0 && dy === 0) continue; // Skip current region (already added)

                const neighborKey = `${regionX + dx},${regionY + dy}`;
                const neighborRegion = generatedRegions.get(neighborKey);

                if (neighborRegion && neighborRegion.features) {
                    const neighborSettlements = neighborRegion.features.filter(f => f.type === 'settlement');
                    nearbySettlements.push(...neighborSettlements);
                }
            }
        }

        // For each settlement in THIS region, mark nearby tiles as roads based on direction to nearest settlement
        for (const settlement of settlements) {
            // Find nearest settlement
            const otherSettlements = nearbySettlements.filter(s => s !== settlement);
            if (otherSettlements.length === 0) continue;

            // Sort by distance and take closest 1-3 settlements
            const maxConnections = settlement.settlementType === 'city' ? 3 :
                                   settlement.settlementType === 'town' ? 2 : 1;

            const sortedByDistance = otherSettlements
                .map(s => ({
                    settlement: s,
                    distance: Math.sqrt(Math.pow(s.x - settlement.x, 2) + Math.pow(s.y - settlement.y, 2))
                }))
                .filter(s => s.distance < 200) // Increased from 150 to 200 tiles
                .sort((a, b) => a.distance - b.distance)
                .slice(0, maxConnections);

            // For each nearby settlement, create a simple straight-line road path in current region
            for (const {settlement: targetSettlement} of sortedByDistance) {
                this.createSimpleRoad(settlement, targetSettlement, tiles);
            }
        }
    }

    /**
     * Create a simple road path from settlement to target
     * Creates roads in a straight line for tiles in current region
     */
    createSimpleRoad(start, end, tiles) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Normalize direction
        const stepX = dx / distance;
        const stepY = dy / distance;

        // Create road tiles for first 20 tiles in direction of target
        for (let step = 1; step <= Math.min(20, distance); step++) {
            const roadX = Math.round(start.x + stepX * step);
            const roadY = Math.round(start.y + stepY * step);

            const tile = tiles.find(t => t.x === roadX && t.y === roadY);
            if (tile) {
                const terrain = tile.terrain;
                const canPlaceRoad = terrain !== 'deepWater' &&
                                     terrain !== 'shallowWater' &&
                                     terrain !== 'ocean' &&
                                     terrain !== 'mountain' &&
                                     !tile.feature;

                if (canPlaceRoad) {
                    tile.terrain = 'road';
                }
            }
        }
    }

    // ============================================================================
    // FINITE WORLD GENERATION - Metadata Pre-Generation
    // ============================================================================

    /**
     * Generate world metadata upfront (settlements, roads, features)
     * Called ONCE at world creation, results stored in gameState
     * Terrain tiles generated on-demand (deterministic)
     */
    async generateWorldMetadata() {
        console.log('🌍 Generating finite world metadata...');
        const start = performance.now();

        // Check if already generated
        if (this.worldMetadata.generated) {
            console.log('✅ World metadata already generated, skipping');
            return this.worldMetadata;
        }

        // Check if metadata exists in gameState (loaded from save)
        const savedMetadata = gameState.get('world.metadata');
        if (savedMetadata && savedMetadata.generated) {
            console.log('📂 Loading world metadata from save');
            this.worldMetadata = savedMetadata;
            return this.worldMetadata;
        }

        // 1. Pre-generate all settlement locations (deterministic)
        console.log('🏘️ Generating settlements...');
        await this.preGenerateSettlements();

        // 2. Pre-generate all feature locations (dungeons, shrines, sanctuaries)
        console.log('🏛️ Generating features...');
        await this.preGenerateFeatures();

        // 3. Generate roads connecting all settlements (upfront)
        console.log('🛣️ Generating road network...');
        await this.preGenerateRoads();

        // Mark as generated
        this.worldMetadata.generated = true;

        // Store in gameState for persistence
        gameState.set('world.metadata', this.worldMetadata);

        const elapsed = performance.now() - start;
        console.log(`✅ World metadata generated in ${(elapsed/1000).toFixed(2)}s`);
        console.log(`   - ${this.worldMetadata.settlements.length} settlements`);
        console.log(`   - ${this.worldMetadata.roads.length} road segments`);
        console.log(`   - ${this.worldMetadata.features.length} features`);

        return this.worldMetadata;
    }

    /**
     * Pre-generate all settlement locations
     * Iterates through all regions in world bounds
     */
    async preGenerateSettlements() {
        const settlements = [];
        const regionSize = RULES.worldGen.regionSize;

        // Iterate through all regions in world bounds
        for (let rx = this.worldBounds.minX; rx <= this.worldBounds.maxX; rx++) {
            for (let ry = this.worldBounds.minY; ry <= this.worldBounds.maxY; ry++) {
                // Use same RNG logic as original generateFeatures
                const regionSeedString = `${this.worldSeed}_${rx}_${ry}`;
                const regionRNG = new SeededRandom(regionSeedString);

                // Check for settlement (same logic as generateFeatures)
                const distanceFromCenter = Math.sqrt(rx * rx + ry * ry);
                const townSpacing = RULES.worldGen.townSpacing;

                let settlementType = null;

                // Starting region always gets a town
                if (rx === 0 && ry === 0 && RULES.worldGen.guaranteeStartingTown) {
                    settlementType = 'town';
                }
                // Towns at regular intervals
                else if (distanceFromCenter > 0 &&
                         distanceFromCenter % townSpacing === 0 &&
                         regionRNG.next() < 0.7) {
                    settlementType = 'town';
                }
                // Cities (rare)
                else if (distanceFromCenter > townSpacing * 2 && regionRNG.next() < 0.05) {
                    settlementType = 'city';
                }
                // Villages (common)
                else if (regionRNG.next() < RULES.worldGen.villageFrequency) {
                    settlementType = 'village';
                }

                if (settlementType) {
                    // Calculate settlement position (center of region)
                    const settlementX = rx * regionSize + Math.floor(regionSize / 2);
                    const settlementY = ry * regionSize + Math.floor(regionSize / 2);

                    // Generate settlement name
                    const settlementName = this.generateSettlementName(regionRNG, settlementType);

                    settlements.push({
                        id: `${settlementX},${settlementY}`,
                        x: settlementX,
                        y: settlementY,
                        type: 'settlement',
                        settlementType: settlementType,
                        name: settlementName,
                        // Dynamic state (populated when player visits)
                        npcs: [],
                        questsGenerated: false,
                        visitedAt: null,
                        merchantInventory: null
                    });
                }
            }
        }

        this.worldMetadata.settlements = settlements;
        console.log(`   Generated ${settlements.length} settlements across world`);
    }

    /**
     * Pre-generate all feature locations (dungeons, shrines, etc.)
     */
    async preGenerateFeatures() {
        const features = [];
        const regionSize = RULES.worldGen.regionSize;

        // Iterate through all regions
        for (let rx = this.worldBounds.minX; rx <= this.worldBounds.maxX; rx++) {
            for (let ry = this.worldBounds.minY; ry <= this.worldBounds.maxY; ry++) {
                const regionSeedString = `${this.worldSeed}_${rx}_${ry}`;
                const regionRNG = new SeededRandom(regionSeedString);

                // Skip if this region has a settlement (already added)
                const hasSettlement = this.worldMetadata.settlements.some(s =>
                    Math.floor(s.x / regionSize) === rx &&
                    Math.floor(s.y / regionSize) === ry
                );
                if (hasSettlement) continue;

                // Check for dungeon/ruins
                if (regionRNG.next() < RULES.worldGen.dungeonFrequency) {
                    const featureX = rx * regionSize + regionRNG.nextInt(10, regionSize - 10);
                    const featureY = ry * regionSize + regionRNG.nextInt(10, regionSize - 10);

                    const featureType = regionRNG.next() < 0.5 ? 'ruins' : 'cave';

                    features.push({
                        id: `${featureX},${featureY}`,
                        x: featureX,
                        y: featureY,
                        type: 'poi',
                        poiType: featureType,
                        explored: false
                    });
                }

                // Check for sanctuary (2x as common as settlements)
                if (regionRNG.next() < (RULES.worldGen.villageFrequency * 2)) {
                    const sanctuaryX = rx * regionSize + regionRNG.nextInt(10, regionSize - 10);
                    const sanctuaryY = ry * regionSize + regionRNG.nextInt(10, regionSize - 10);

                    const sanctuaryName = this.generateSanctuaryName(regionRNG);

                    features.push({
                        id: `${sanctuaryX},${sanctuaryY}`,
                        x: sanctuaryX,
                        y: sanctuaryY,
                        type: 'sanctuary',
                        name: sanctuaryName
                    });
                }
            }
        }

        this.worldMetadata.features = features;
        console.log(`   Generated ${features.length} features (dungeons, sanctuaries)`);
    }

    /**
     * Pre-generate all roads connecting settlements
     * Called ONCE upfront, creates complete road network
     */
    async preGenerateRoads() {
        const roads = [];

        // For each settlement, connect to nearest 1-3 settlements
        for (const settlement of this.worldMetadata.settlements) {
            const maxConnections = settlement.settlementType === 'city' ? 3 :
                                   settlement.settlementType === 'town' ? 2 : 1;

            // Find nearest settlements
            const nearestSettlements = this.worldMetadata.settlements
                .filter(s => s !== settlement)
                .map(s => ({
                    settlement: s,
                    distance: Math.sqrt(
                        Math.pow(s.x - settlement.x, 2) +
                        Math.pow(s.y - settlement.y, 2)
                    )
                }))
                .filter(s => s.distance < 200) // Max connection distance
                .sort((a, b) => a.distance - b.distance)
                .slice(0, maxConnections);

            // Create road paths to each nearby settlement
            for (const {settlement: target} of nearestSettlements) {
                const roadPath = this.generateRoadPath(settlement, target);

                // Avoid duplicate roads (check if reverse path already exists)
                const isDuplicate = roads.some(r =>
                    (r.start.x === target.x && r.start.y === target.y &&
                     r.end.x === settlement.x && r.end.y === settlement.y)
                );

                if (!isDuplicate) {
                    roads.push({
                        start: { x: settlement.x, y: settlement.y },
                        end: { x: target.x, y: target.y },
                        path: roadPath // Array of {x, y} coordinates
                    });
                }
            }
        }

        this.worldMetadata.roads = roads;
        console.log(`   Generated ${roads.length} road segments`);
    }

    /**
     * Generate road path between two points (straight line)
     * Returns array of {x, y} coordinates
     */
    generateRoadPath(start, end) {
        const path = [];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Normalize direction
        const stepX = dx / distance;
        const stepY = dy / distance;

        // Generate path coordinates
        for (let step = 0; step <= distance; step++) {
            const x = Math.round(start.x + stepX * step);
            const y = Math.round(start.y + stepY * step);
            path.push({ x, y });
        }

        return path;
    }

    /**
     * Check if tile should be a road (called during terrain generation)
     */
    isRoadTile(worldX, worldY) {
        if (!this.worldMetadata.generated) return false;

        // Check if this coordinate is on any road path
        for (const road of this.worldMetadata.roads) {
            const isOnPath = road.path.some(p => p.x === worldX && p.y === worldY);
            if (isOnPath) return true;
        }

        return false;
    }

    /**
     * Get settlement at specific coordinates (from pre-generated metadata)
     */
    getSettlementAt(worldX, worldY) {
        if (!this.worldMetadata.generated) return null;

        return this.worldMetadata.settlements.find(s => s.x === worldX && s.y === worldY);
    }

    /**
     * Get feature at specific coordinates (from pre-generated metadata)
     */
    getFeatureAt(worldX, worldY) {
        if (!this.worldMetadata.generated) return null;

        return this.worldMetadata.features.find(f => f.x === worldX && f.y === worldY);
    }

}

export default WorldGenerator;
