/**
 * World Generator
 * Handles procedural generation of world regions using Simplex noise
 */

import SimplexNoise from '../utils/simplexNoise.js';
import { SeededRandom, hashString } from '../utils/rng.js';
import { RULES, getScaledFeatureGeneration } from '../core/rulesEngine.js';
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

        // PRIORITY 2.5: Urban sprawl around settlements
        // Check if this tile is within urban sprawl zone of any settlement
        const urbanTerrain = this.getUrbanSprawlTerrain(worldX, worldY, rng);
        if (urbanTerrain && terrainType !== 'deepWater' && terrainType !== 'shallowWater' && terrainType !== 'ocean' && terrainType !== 'mountain') {
            terrainType = urbanTerrain;
        }

        // Carve rivers BEFORE roads so roads can create bridges
        // Rivers: thin, winding strips with occasional deeper channels
        if (terrainType !== 'deepWater' && terrainType !== 'shallowWater') {
            if (riverMask < 0.02 && elevation > -0.2) {
                terrainType = 'deepWater';
            } else if (riverMask < 0.04 && elevation > -0.2) {
                terrainType = 'shallowWater';
            }
        }

        // Check if this tile is on a pre-generated road (FINITE WORLD FEATURE)
        // Roads now take priority and can create bridges over water (rivers, not ocean)
        if (this.isRoadTile(worldX, worldY)) {
            // Roads can cross water with bridges (except ocean and mountains)
            if (terrainType !== 'ocean' &&
                terrainType !== 'mountain') {
                // If crossing water (shallow or deep), it becomes a bridge
                // Deep water from rivers gets bridges, ocean is excluded above
                if (terrainType === 'shallowWater' || terrainType === 'deepWater') {
                    terrainType = 'bridge';
                } else {
                    terrainType = 'road';
                }
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
        if (e < 0.10) {
            return 'ocean';
        }

        // Coastal (low elevation near water)
        if (e < 0.30) {
            return 'coastal';
        }

        // Mountain (very high elevation)
        if (e > 0.75) {
            return 'mountain';
        }

        // SMOOTHED TEMPERATURE ZONES - wider thresholds prevent harsh adjacency
        // Very cold regions (temperature < 0.25)
        if (t < 0.25) {
            if (m > 0.5) {
                return 'swampland';
            } // Cold swamps
            return 'tundra';
        }

        // Cold-to-temperate transition zone (0.25-0.35)
        if (t < 0.35) {
            // Mix of cold forest and grassland based on moisture
            if (m > 0.6) {
                return 'swampland';
            }
            if (m > 0.4) {
                return 'temperateForest';
            } // Cold forests
            return 'grassland'; // Cool grasslands
        }

        // Very hot regions (temperature > 0.75)
        if (t > 0.75) {
            if (m < 0.3) {
                return 'desert';
            }
            if (m > 0.6) {
                return 'jungle';
            }
            return 'grassland'; // Hot grasslands/savanna
        }

        // Hot-to-temperate transition zone (0.65-0.75)
        if (t > 0.65) {
            // Mix of warm grassland and light forests
            if (m < 0.25) {
                return 'grassland';
            } // Warm dry grasslands (approaching desert)
            if (m > 0.7) {
                return 'temperateForest';
            } // Warm wet forests (approaching jungle)
            return 'grassland'; // Savanna-like temperate grasslands
        }

        // Temperate core zone (0.35-0.65) - use moisture + biome noise for variation
        if (m > 0.6) {
            // Wet temperate
            if (b > 0.6) {
                return 'swampland';
            }
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
            if (e < 0.15) {
                return 'shallowWater';
            }
            // Beach: narrow band between water and land (0.15-0.22)
            // This prevents beach from appearing in middle of lakes
            if (e < 0.22) {
                return 'beach';
            }
            // Higher coastal elevations based on moisture
            if (m > 0.6) {
                return 'swamp';
            }
            if (e < 0.28) {
                return 'grassland';
            }
            return 'plains'; // Transition to inland terrain
        }

        // Mountain biome - varies by elevation
        if (macroBiome === 'mountain') {
            if (e > 0.85) {
                return 'mountain';
            }
            return 'hills';
        }

        // Temperate Forest biome - varies by moisture
        if (macroBiome === 'temperateForest') {
            if (m < 0.3) {
                return 'grassland';
            }
            if (m < 0.5) {
                return 'plains';
            }
            if (m < 0.75) {
                return 'forest';
            }
            return 'denseForest';
        }

        // Grassland biome - subtle variation
        if (macroBiome === 'grassland') {
            if (m > 0.5) {
                return 'savanna';
            }
            if (m > 0.3) {
                return 'grassland';
            }
            return 'plains';
        }

        // Desert biome - single terrain
        if (macroBiome === 'desert') {
            return 'desert';
        }

        // Jungle biome - varies by moisture
        if (macroBiome === 'jungle') {
            if (m > 0.7) {
                return 'swamp';
            }
            return 'jungle';
        }

        // Tundra biome - varies by temperature
        if (macroBiome === 'tundra') {
            if (m > 0.5) {
                return 'tundra';
            }
            return 'snowyPlains';
        }

        // Swampland biome - varies by elevation
        if (macroBiome === 'swampland') {
            if (e < 0.35) {
                return 'shallowWater';
            }
            if (m > 0.6) {
                return 'swamp';
            }
            return 'grassland';
        }

        // Fallback: Return first terrain in pool
        return allowedTerrains[0];
    }

    /**
     * Get urban sprawl terrain type based on distance from settlement
     * Creates realistic urban sprawl zones around settlements:
     * - Inner ring: industrial (workshops, warehouses near settlement core)
     * - Middle ring: residential (houses, shops in suburbs)
     * - Outer ring: farmland (crops, pastures)
     *
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {Object} rng - Seeded RNG for variation
     * @returns {string|null} Urban terrain type or null if not in sprawl zone
     */
    getUrbanSprawlTerrain(worldX, worldY, rng) {
        // Check if finite world metadata is available
        if (!this.worldMetadata.generated) {
            return null;
        }

        // Get sprawl radii from rules (with defaults)
        // Config order: industrial (inner/smallest) < residential (middle) < farmland (outer/largest)
        const sprawlRadii = RULES.worldGen.urbanSprawl || {
            city: { industrial: 8, residential: 15, farmland: 25 },
            town: { industrial: 5, residential: 10, farmland: 18 },
            village: { industrial: 3, residential: 5, farmland: 10 }
        };

        // Check each settlement for proximity
        for (const settlement of this.worldMetadata.settlements) {
            const distance = Math.sqrt(
                Math.pow(worldX - settlement.x, 2) +
                Math.pow(worldY - settlement.y, 2)
            );

            // Get radii for this settlement type
            const radii = sprawlRadii[settlement.settlementType];
            if (!radii) continue;

            // Skip if outside all sprawl zones
            if (distance > radii.farmland) continue;

            // Skip the exact settlement tile
            if (distance < 1) continue;

            // Determine zone based on distance (with some randomness for natural edges)
            const variation = (rng ? rng.next() : Math.random()) * 1.5;

            // Inner ring: Industrial (workshops, warehouses near the settlement core)
            if (distance < radii.industrial + variation) {
                return 'industrial';
            }

            // Middle ring: Residential (houses, shops in suburbs)
            if (distance < radii.residential + variation) {
                // Mix of residential and industrial
                return (rng ? rng.next() : Math.random()) < 0.7 ? 'residential' : 'industrial';
            }

            // Outer ring: Farmland (crops, pastures)
            if (distance < radii.farmland + variation) {
                // Mostly farmland with some residential at inner edge
                return (rng ? rng.next() : Math.random()) < 0.85 ? 'farmland' : 'residential';
            }
        }

        return null; // Not in any urban sprawl zone
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
     * Get tile from cache synchronously (returns null if region not cached or compressed)
     * Used for HUD updates where async is not possible
     */
    getCachedTile(worldX, worldY) {
        const { regionX, regionY, localX, localY } = this.getRegionCoords(worldX, worldY);
        const cacheKey = `${regionX},${regionY}`;
        const generatedRegions = gameState.get('world.generatedRegions');

        if (!generatedRegions || !generatedRegions.has(cacheKey)) {
            return null; // Region not cached
        }

        const region = generatedRegions.get(cacheKey);

        // Check if region is in compressed save format (has exploredTiles but no tiles)
        if (region && region.exploredTiles && !region.tiles) {
            // Region is compressed, need to regenerate it asynchronously
            // For now, return null and trigger async regeneration
            this.getTile(worldX, worldY).then(() => {
                // After regeneration, trigger location update
                const game = window.game;
                if (game && game.updateLocationDisplay) {
                    game.updateLocationDisplay();
                }
            });
            return null;
        }

        if (!region || !region.tiles) {
            return null;
        }

        const regionSize = RULES.worldGen.regionSize;
        const index = localY * regionSize + localX;

        return region.tiles[index];
    }

    /**
     * Clear distant regions from cache to save memory
     */
    pruneCache(centerX, centerY, keepRadius = 3) {
        const generatedRegions = gameState.get('world.generatedRegions');
        if (!generatedRegions) {
            return;
        }

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
        if (!region || !region.features) {
            return;
        }

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

        if (persistedSettlements.length === 0) {
            return;
        }

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

        // Re-link features to their tiles (so tile.feature exists after regeneration)
        for (const feature of features) {
            const tile = tiles.find(t => t.x === feature.x && t.y === feature.y);
            if (tile) {
                tile.feature = feature;
            }
        }

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
        if (settlements.length === 0) {
            return;
        } // No settlements to connect

        const generatedRegions = gameState.get('world.generatedRegions') || new Map();
        const searchRadius = 3; // Check 3 regions in each direction

        // Collect all settlements within search radius (including current region)
        const nearbySettlements = [...settlements];

        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
            for (let dy = -searchRadius; dy <= searchRadius; dy++) {
                if (dx === 0 && dy === 0) {
                    continue;
                } // Skip current region (already added)

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
            if (otherSettlements.length === 0) {
                continue;
            }

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
            for (const { settlement: targetSettlement } of sortedByDistance) {
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
                // Roads can cross water (bridges) but not ocean or mountains
                const canPlaceRoad = terrain !== 'ocean' &&
                                     terrain !== 'mountain' &&
                                     !tile.feature;

                if (canPlaceRoad) {
                    // Use bridge for water tiles (rivers), road for land
                    if (terrain === 'shallowWater' || terrain === 'deepWater') {
                        tile.terrain = 'bridge';
                    } else {
                        tile.terrain = 'road';
                    }
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
        console.log(`✅ World metadata generated in ${(elapsed / 1000).toFixed(2)}s`);
        console.log(`   - ${this.worldMetadata.settlements.length} settlements`);
        console.log(`   - ${this.worldMetadata.roads.length} road segments`);
        console.log(`   - ${this.worldMetadata.features.length} features`);

        return this.worldMetadata;
    }

    /**
     * Pre-generate all settlement locations using quota-based system
     * Uses featureGeneration config from rulesEngine for counts and distribution
     */
    async preGenerateSettlements() {
        const settlements = [];
        const regionSize = RULES.worldGen.regionSize;

        // Get scaled feature counts for this world size
        const featureConfig = getScaledFeatureGeneration(this.config.mapSize, RULES.worldGen.campaignOverrides);
        const targetCounts = featureConfig.settlementCounts;
        const spacing = featureConfig.settlementSpacing;

        console.log(`   Target settlements: ${featureConfig.settlements} (${targetCounts.village} villages, ${targetCounts.town} towns, ${targetCounts.city} cities)`);

        // Track placed settlements for spacing checks
        const placedSettlements = [];
        const currentCounts = { village: 0, town: 0, city: 0 };

        // Build list of all valid region coordinates
        const allRegions = [];
        for (let rx = this.worldBounds.minX; rx <= this.worldBounds.maxX; rx++) {
            for (let ry = this.worldBounds.minY; ry <= this.worldBounds.maxY; ry++) {
                allRegions.push({ rx, ry });
            }
        }

        // Shuffle regions deterministically for even distribution
        const shuffleRNG = new SeededRandom(`${this.worldSeed}_settlements`);
        for (let i = allRegions.length - 1; i > 0; i--) {
            const j = shuffleRNG.nextInt(0, i);
            [allRegions[i], allRegions[j]] = [allRegions[j], allRegions[i]];
        }

        // Guarantee starting town at (0,0)
        if (RULES.worldGen.guaranteeStartingTown) {
            const startX = 0 * regionSize + Math.floor(regionSize / 2);
            const startY = 0 * regionSize + Math.floor(regionSize / 2);
            const startRNG = new SeededRandom(`${this.worldSeed}_0_0`);

            settlements.push({
                id: `${startX},${startY}`,
                x: startX,
                y: startY,
                type: 'settlement',
                settlementType: 'town',
                name: this.generateSettlementName(startRNG, 'town'),
                npcs: [],
                questsGenerated: false,
                visitedAt: null,
                merchantInventory: null
            });
            placedSettlements.push({ x: startX, y: startY, type: 'town' });
            currentCounts.town++;
        }

        // Helper to check spacing constraints
        const meetsSpacing = (x, y, type) => {
            const minSpacing = spacing[type] * regionSize;
            for (const placed of placedSettlements) {
                const dist = Math.sqrt(Math.pow(placed.x - x, 2) + Math.pow(placed.y - y, 2));
                // Use the larger of the two spacing requirements
                const requiredSpacing = Math.max(minSpacing, spacing[placed.type] * regionSize);
                if (dist < requiredSpacing) {
                    return false;
                }
            }
            return true;
        };

        // Place cities first (need most spacing), then towns, then villages
        const placementOrder = ['city', 'town', 'village'];

        for (const settlementType of placementOrder) {
            const target = targetCounts[settlementType];

            for (const { rx, ry } of allRegions) {
                if (currentCounts[settlementType] >= target) break;

                // Skip starting region (already handled)
                if (rx === 0 && ry === 0) continue;

                const regionSeedString = `${this.worldSeed}_${rx}_${ry}`;
                const regionRNG = new SeededRandom(regionSeedString);

                // Calculate position
                const settlementX = rx * regionSize + Math.floor(regionSize / 2);
                const settlementY = ry * regionSize + Math.floor(regionSize / 2);

                // Check if location already has a settlement
                const alreadyOccupied = placedSettlements.some(s =>
                    Math.abs(s.x - settlementX) < regionSize && Math.abs(s.y - settlementY) < regionSize
                );
                if (alreadyOccupied) continue;

                // Check spacing constraints
                if (!meetsSpacing(settlementX, settlementY, settlementType)) continue;

                // Use RNG to add some randomness (not every valid spot gets a settlement)
                const placementChance = settlementType === 'city' ? 0.8 :
                                       settlementType === 'town' ? 0.7 : 0.6;
                if (regionRNG.next() > placementChance) continue;

                // Place the settlement
                settlements.push({
                    id: `${settlementX},${settlementY}`,
                    x: settlementX,
                    y: settlementY,
                    type: 'settlement',
                    settlementType: settlementType,
                    name: this.generateSettlementName(regionRNG, settlementType),
                    npcs: [],
                    questsGenerated: false,
                    visitedAt: null,
                    merchantInventory: null
                });
                placedSettlements.push({ x: settlementX, y: settlementY, type: settlementType });
                currentCounts[settlementType]++;
            }
        }

        this.worldMetadata.settlements = settlements;
        console.log(`   Generated ${settlements.length} settlements (${currentCounts.village} villages, ${currentCounts.town} towns, ${currentCounts.city} cities)`);
    }

    /**
     * Pre-generate all feature locations (dungeons, sanctuaries, POIs)
     * Uses featureGeneration config from rulesEngine for counts and distribution
     */
    async preGenerateFeatures() {
        const features = [];
        const regionSize = RULES.worldGen.regionSize;

        // Get scaled feature counts for this world size
        const featureConfig = getScaledFeatureGeneration(this.config.mapSize, RULES.worldGen.campaignOverrides);

        console.log(`   Target features: ${featureConfig.dungeons} dungeons, ${featureConfig.sanctuaries} sanctuaries, ${featureConfig.pois} POIs`);

        // Build list of valid regions (excluding those with settlements)
        const validRegions = [];
        for (let rx = this.worldBounds.minX; rx <= this.worldBounds.maxX; rx++) {
            for (let ry = this.worldBounds.minY; ry <= this.worldBounds.maxY; ry++) {
                // Skip regions with settlements
                const hasSettlement = this.worldMetadata.settlements.some(s =>
                    Math.floor(s.x / regionSize) === rx &&
                    Math.floor(s.y / regionSize) === ry
                );
                if (!hasSettlement) {
                    validRegions.push({ rx, ry });
                }
            }
        }

        // Shuffle regions deterministically
        const shuffleRNG = new SeededRandom(`${this.worldSeed}_features`);
        for (let i = validRegions.length - 1; i > 0; i--) {
            const j = shuffleRNG.nextInt(0, i);
            [validRegions[i], validRegions[j]] = [validRegions[j], validRegions[i]];
        }

        // Track what we've placed
        const placedLocations = new Set(); // "x,y" strings to avoid duplicates
        let dungeonsPlaced = 0;
        let sanctuariesPlaced = 0;
        const poisPlaced = { shrine: 0, ruins: 0, cave: 0, camp: 0, landmark: 0 };

        // Helper to get a unique position within a region
        const getUniquePosition = (rx, ry, rng) => {
            for (let attempt = 0; attempt < 5; attempt++) {
                const x = rx * regionSize + rng.nextInt(5, regionSize - 5);
                const y = ry * regionSize + rng.nextInt(5, regionSize - 5);
                const key = `${x},${y}`;
                if (!placedLocations.has(key)) {
                    placedLocations.add(key);
                    return { x, y };
                }
            }
            return null;
        };

        // Place dungeons first (most important)
        const dungeonRNG = new SeededRandom(`${this.worldSeed}_dungeons`);

        // Helper to place a dungeon at a region
        const placeDungeon = (rx, ry) => {
            const regionRNG = new SeededRandom(`${this.worldSeed}_${rx}_${ry}_dungeon`);
            const pos = getUniquePosition(rx, ry, regionRNG);
            if (!pos) return false;

            // Determine difficulty based on distribution
            const diffRoll = regionRNG.next();
            let difficulty = 1;
            let cumulative = 0;
            for (const [diff, chance] of Object.entries(featureConfig.dungeonDifficultyDistribution)) {
                cumulative += chance;
                if (diffRoll < cumulative) {
                    difficulty = parseInt(diff);
                    break;
                }
            }

            features.push({
                id: `${pos.x},${pos.y}`,
                x: pos.x,
                y: pos.y,
                type: 'dungeon',
                difficulty: difficulty,
                explored: false
            });
            dungeonsPlaced++;
            return true;
        };

        // First pass: spread dungeons across regions (skip some for distribution)
        const skippedRegions = [];
        for (const { rx, ry } of validRegions) {
            if (dungeonsPlaced >= featureConfig.dungeons) break;

            // Skip ~40% of regions for spread - but track skipped ones for second pass
            if (dungeonRNG.next() > 0.6) {
                skippedRegions.push({ rx, ry });
                continue;
            }

            placeDungeon(rx, ry);
        }

        // Second pass: fill remaining target from skipped regions
        if (dungeonsPlaced < featureConfig.dungeons) {
            for (const { rx, ry } of skippedRegions) {
                if (dungeonsPlaced >= featureConfig.dungeons) break;
                placeDungeon(rx, ry);
            }
        }

        console.log(`   Dungeons placed: ${dungeonsPlaced}/${featureConfig.dungeons}`);

        // Place sanctuaries
        const sanctuaryRNG = new SeededRandom(`${this.worldSeed}_sanctuaries`);

        for (const { rx, ry } of validRegions) {
            if (sanctuariesPlaced >= featureConfig.sanctuaries) break;

            if (sanctuaryRNG.next() > 0.3) continue; // Check ~30% of regions

            const regionRNG = new SeededRandom(`${this.worldSeed}_${rx}_${ry}_sanctuary`);
            const pos = getUniquePosition(rx, ry, regionRNG);
            if (!pos) continue;

            features.push({
                id: `${pos.x},${pos.y}`,
                x: pos.x,
                y: pos.y,
                type: 'sanctuary',
                name: this.generateSanctuaryName(regionRNG)
            });
            sanctuariesPlaced++;
        }

        // Place POIs by type
        const poiTypes = ['shrine', 'ruins', 'cave', 'camp', 'landmark'];
        const poiRNG = new SeededRandom(`${this.worldSeed}_pois`);

        for (const { rx, ry } of validRegions) {
            const totalPoisPlaced = Object.values(poisPlaced).reduce((a, b) => a + b, 0);
            if (totalPoisPlaced >= featureConfig.pois) break;

            if (poiRNG.next() > 0.4) continue; // Check ~40% of regions

            const regionRNG = new SeededRandom(`${this.worldSeed}_${rx}_${ry}_poi`);
            const pos = getUniquePosition(rx, ry, regionRNG);
            if (!pos) continue;

            // Pick POI type based on distribution, prioritizing under-quota types
            let poiType = null;
            const typeRoll = regionRNG.next();
            let cumulative = 0;

            for (const type of poiTypes) {
                const targetCount = featureConfig.poiCounts[type];
                if (poisPlaced[type] >= targetCount) continue;

                cumulative += featureConfig.poiDistribution[type];
                if (typeRoll < cumulative || !poiType) {
                    poiType = type;
                }
            }

            if (!poiType) continue;

            features.push({
                id: `${pos.x},${pos.y}`,
                x: pos.x,
                y: pos.y,
                type: 'poi',
                poiType: poiType,
                discovered: false
            });
            poisPlaced[poiType]++;
        }

        this.worldMetadata.features = features;

        const totalPois = Object.values(poisPlaced).reduce((a, b) => a + b, 0);
        console.log(`   Generated ${features.length} features:`);
        console.log(`     - ${dungeonsPlaced} dungeons`);
        console.log(`     - ${sanctuariesPlaced} sanctuaries`);
        console.log(`     - ${totalPois} POIs (${poisPlaced.shrine} shrines, ${poisPlaced.ruins} ruins, ${poisPlaced.cave} caves, ${poisPlaced.camp} camps, ${poisPlaced.landmark} landmarks)`);
    }

    /**
     * Pre-generate all roads connecting settlements
     * Called ONCE upfront, creates complete road network
     * OPTIMIZED: Uses Set for duplicate detection, checks before pathfinding
     */
    async preGenerateRoads() {
        const roads = [];
        const existingConnections = new Set(); // Track connections with O(1) lookup
        let totalConnections = 0;
        let skippedDuplicates = 0;

        console.log(`🛣️ Road generation starting with ${this.worldMetadata.settlements.length} settlements`);

        // For each settlement, connect to nearest 2-4 settlements
        for (const settlement of this.worldMetadata.settlements) {
            const maxConnections = settlement.settlementType === 'city' ? 4 :
                settlement.settlementType === 'town' ? 3 : 2;

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
                .filter(s => s.distance < 400)
                .sort((a, b) => a.distance - b.distance)
                .slice(0, maxConnections);

            // Create road paths to each nearby settlement
            for (const { settlement: target } of nearestSettlements) {
                // Check for duplicate BEFORE pathfinding (saves expensive A* calls)
                const forwardKey = `${settlement.x},${settlement.y}-${target.x},${target.y}`;
                const reverseKey = `${target.x},${target.y}-${settlement.x},${settlement.y}`;

                if (existingConnections.has(reverseKey)) {
                    skippedDuplicates++;
                    continue; // Already have this road in opposite direction
                }

                // Generate path only for new connections
                const roadPath = this.generateRoadPath(settlement, target);
                totalConnections++;

                existingConnections.add(forwardKey);
                roads.push({
                    start: { x: settlement.x, y: settlement.y },
                    end: { x: target.x, y: target.y },
                    path: roadPath
                });
            }
        }

        this.worldMetadata.roads = roads;
        console.log(`   Generated ${roads.length} road segments (${skippedDuplicates} duplicates skipped)`);

        // Log total road tiles
        let totalRoadTiles = 0;
        for (const road of roads) {
            totalRoadTiles += road.path.length;
        }
        console.log(`   📏 Total road tiles: ${totalRoadTiles}`);
    }

    /**
     * Generate road path between two points using A* pathfinding
     * Routes around impassable terrain (deep water, ocean, mountains)
     * Falls back to Bresenham if path is impossible
     * Returns array of {x, y} coordinates
     */
    generateRoadPath(start, end) {
        const x0 = Math.round(start.x);
        const y0 = Math.round(start.y);
        const x1 = Math.round(end.x);
        const y1 = Math.round(end.y);

        // Try A* pathfinding first
        const astarPath = this.astarRoadPath(x0, y0, x1, y1);
        if (astarPath && astarPath.length > 0) {
            return astarPath;
        }

        // Fallback to Bresenham if A* fails (shouldn't happen but safety)
        return this.bresenhamPath(x0, y0, x1, y1);
    }

    /**
     * A* pathfinding for roads - routes around impassable terrain
     * Uses noise functions to predict terrain without generating tiles
     * OPTIMIZED: Uses binary heap, caches terrain lookups, reduced iterations
     */
    astarRoadPath(x0, y0, x1, y1) {
        const scale = RULES.worldGen.biomeNoiseScale;
        const maxIterations = 2000; // Reduced - Bresenham fallback is fine for long paths
        let iterations = 0;

        // Cache for terrain data (avoid recalculating noise)
        const terrainCache = new Map();

        // Get cached terrain info (passable + cost)
        const getTerrainInfo = (x, y) => {
            const key = `${x},${y}`;
            if (terrainCache.has(key)) return terrainCache.get(key);

            const elevation = this.elevationNoise.octaveNoise2D(x * scale, y * scale, 4, 0.5);
            const e = (elevation + 1) / 2;

            // Check passability first
            if (e < 0.10 || e > 0.78) {
                const info = { passable: false, cost: Infinity };
                terrainCache.set(key, info);
                return info;
            }

            // Calculate cost (simplified - skip expensive moisture/river checks for speed)
            let cost = 1;
            if (e > 0.6) cost += 1; // Hills

            const info = { passable: true, cost };
            terrainCache.set(key, info);
            return info;
        };

        // Heuristic: Manhattan distance
        const heuristic = (x, y) => Math.abs(x - x1) + Math.abs(y - y1);

        // Simple priority queue using sorted insertion (faster than sorting entire array)
        const openSet = [];
        const openSetMap = new Map(); // Fast lookup for membership
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();

        const startKey = `${x0},${y0}`;
        gScore.set(startKey, 0);
        const startNode = { x: x0, y: y0, g: 0, f: heuristic(x0, y0) };
        openSet.push(startNode);
        openSetMap.set(startKey, startNode);

        // Directions: 4-way for speed (8-way is slower and roads look fine with 4-way)
        const directions = [
            { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
            { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
        ];

        while (openSet.length > 0 && iterations < maxIterations) {
            iterations++;

            // Get node with lowest f score (last element after reverse sort)
            // Using pop() is O(1), sorting once is faster than maintaining heap for small sets
            if (iterations % 50 === 1) {
                openSet.sort((a, b) => b.f - a.f); // Reverse sort so pop() gets lowest
            }
            const current = openSet.pop();
            const currentKey = `${current.x},${current.y}`;
            openSetMap.delete(currentKey);

            // Reached destination
            if (current.x === x1 && current.y === y1) {
                const path = [];
                let node = currentKey;
                while (node) {
                    const [x, y] = node.split(',').map(Number);
                    path.unshift({ x, y });
                    node = cameFrom.get(node);
                }
                return path;
            }

            closedSet.add(currentKey);

            // Explore neighbors
            for (const { dx, dy } of directions) {
                const nx = current.x + dx;
                const ny = current.y + dy;
                const neighborKey = `${nx},${ny}`;

                // Skip if already evaluated
                if (closedSet.has(neighborKey)) continue;

                // Get terrain info (cached)
                const terrain = getTerrainInfo(nx, ny);
                if (!terrain.passable) continue;

                const tentativeG = current.g + terrain.cost;

                // Skip if we've found a better path
                const existingG = gScore.get(neighborKey);
                if (existingG !== undefined && tentativeG >= existingG) continue;

                // This is the best path so far
                cameFrom.set(neighborKey, currentKey);
                gScore.set(neighborKey, tentativeG);

                // Add/update in open set
                if (!openSetMap.has(neighborKey)) {
                    const node = { x: nx, y: ny, g: tentativeG, f: tentativeG + heuristic(nx, ny) };
                    openSet.push(node);
                    openSetMap.set(neighborKey, node);
                }
            }
        }

        // No path found - return null to trigger Bresenham fallback
        return null;
    }

    /**
     * Bresenham's line algorithm - fallback for road generation
     */
    bresenhamPath(x0, y0, x1, y1) {
        const path = [];

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            path.push({ x: x0, y: y0 });

            if (x0 === x1 && y0 === y1) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }

        return path;
    }

    /**
     * Check if tile should be a road (called during terrain generation)
     * Uses cached Set for O(1) lookup instead of iterating all roads
     */
    isRoadTile(worldX, worldY) {
        if (!this.worldMetadata.generated) {
            return false;
        }

        // Build road tile set on first call (lazy initialization)
        if (!this.worldMetadata.roadTileSet) {
            this.worldMetadata.roadTileSet = new Set();
            for (const road of this.worldMetadata.roads) {
                for (const p of road.path) {
                    this.worldMetadata.roadTileSet.add(`${p.x},${p.y}`);
                }
            }
        }

        return this.worldMetadata.roadTileSet.has(`${worldX},${worldY}`);
    }

    /**
     * Get settlement at specific coordinates (from pre-generated metadata)
     */
    getSettlementAt(worldX, worldY) {
        if (!this.worldMetadata.generated) {
            return null;
        }

        return this.worldMetadata.settlements.find(s => s.x === worldX && s.y === worldY);
    }

    /**
     * Get feature at specific coordinates (from pre-generated metadata)
     */
    getFeatureAt(worldX, worldY) {
        if (!this.worldMetadata.generated) {
            return null;
        }

        return this.worldMetadata.features.find(f => f.x === worldX && f.y === worldY);
    }

}

export default WorldGenerator;
