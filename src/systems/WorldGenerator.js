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

        // Carve rivers: thin, winding strips with occasional deeper channels
        if (terrainType !== 'deepWater' && terrainType !== 'shallowWater') {
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

        // Cold regions (low temperature)
        if (t < 0.3) {
            if (m > 0.5) return 'swampland'; // Cold swamps
            return 'tundra';
        }

        // Hot regions (high temperature)
        if (t > 0.7) {
            if (m < 0.3) return 'desert';
            if (m > 0.6) return 'jungle';
            return 'grassland'; // Hot grasslands/savanna
        }

        // Temperate regions - use biome noise for variation
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
     */
    async generateFeatures(regionX, regionY, rng, tiles) {
        const features = [];

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
}

export default WorldGenerator;
