/**
 * World Generator
 * Handles procedural generation of world regions using Simplex noise
 */

import SimplexNoise from '../utils/simplexNoise.js';
import { createRNG, seedToNumber } from '../utils/rng.js';
import { RULES } from '../core/rulesEngine.js';

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
        const numericSeed = seedToNumber(worldSeed);
        this.elevationNoise = new SimplexNoise(numericSeed);
        this.moistureNoise = new SimplexNoise(numericSeed + 1000);
        this.temperatureNoise = new SimplexNoise(numericSeed + 2000);
        this.featureNoise = new SimplexNoise(numericSeed + 3000);

        // Base RNG for discrete decisions
        this.baseRNG = createRNG(worldSeed);

        // Cache for generated regions
        this.regionCache = new Map();

        // Terrain types (will be loaded from data/terrains.json)
        this.terrainTypes = null;
    }

    /**
     * Load terrain definitions
     */
    async loadTerrainData() {
        if (!this.terrainTypes) {
            const response = await fetch('data/terrains.json');
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
        // Check cache first
        const cacheKey = `${regionX},${regionY}`;
        if (this.regionCache.has(cacheKey)) {
            return this.regionCache.get(cacheKey);
        }

        // Ensure terrain data is loaded
        await this.loadTerrainData();

        // Create region-specific RNG
        const regionSeed = seedToNumber(`${this.worldSeed}_${regionX}_${regionY}`);
        const regionRNG = createRNG(regionSeed);

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
        const features = this.generateFeatures(regionX, regionY, regionRNG, tiles);

        const region = {
            x: regionX,
            y: regionY,
            tiles,
            features,
            generated: Date.now()
        };

        // Cache the region
        this.regionCache.set(cacheKey, region);

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

        // Select terrain based on noise values
        const terrainType = this.selectTerrain(elevation, moisture, temperature);

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
     * Select terrain type based on environmental values
     */
    selectTerrain(elevation, moisture, temperature) {
        // Normalize noise values from [-1, 1] to [0, 1]
        const e = (elevation + 1) / 2;
        const m = (moisture + 1) / 2;
        const t = (temperature + 1) / 2;

        // Water (low elevation)
        if (e < 0.35) {
            if (e < 0.25) return 'deepWater';
            return 'shallowWater';
        }

        // Mountains (high elevation)
        if (e > 0.75) {
            if (e > 0.85) return 'mountain';
            return 'hills';
        }

        // Temperature-based biomes
        if (t < 0.3) {
            // Cold regions
            if (m > 0.5) return 'tundra';
            return 'snowyPlains';
        }

        if (t > 0.7) {
            // Hot regions
            if (m < 0.3) return 'desert';
            if (m > 0.6) return 'jungle';
            return 'savanna';
        }

        // Temperate regions
        if (m < 0.3) {
            return 'plains';
        } else if (m < 0.6) {
            if (elevation > 0.55) return 'hills';
            return 'grassland';
        } else if (m < 0.75) {
            return 'forest';
        } else {
            return 'denseForest';
        }
    }

    /**
     * Generate features for a region (settlements, dungeons, etc.)
     */
    generateFeatures(regionX, regionY, rng, tiles) {
        const features = [];

        // Check for settlement
        const settlementChance = 1.0 / RULES.worldGen.townSpacing;
        if (rng.random() < settlementChance) {
            // Find suitable location (not water, not mountain)
            const suitableTiles = tiles.filter(t => {
                const terrain = t.terrain;
                return terrain !== 'deepWater' &&
                       terrain !== 'shallowWater' &&
                       terrain !== 'mountain';
            });

            if (suitableTiles.length > 0) {
                const location = rng.pick(suitableTiles);

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

                features.push({
                    type: 'settlement',
                    settlementType,
                    x: location.x,
                    y: location.y,
                    name: this.generateSettlementName(rng),
                    population: this.getSettlementPopulation(settlementType, rng)
                });
            }
        }

        // Check for dungeon
        if (rng.random() < RULES.worldGen.dungeonFrequency) {
            const mountainTiles = tiles.filter(t =>
                t.terrain === 'mountain' || t.terrain === 'hills'
            );

            if (mountainTiles.length > 0) {
                const location = rng.pick(mountainTiles);
                features.push({
                    type: 'dungeon',
                    x: location.x,
                    y: location.y,
                    difficulty: rng.int(1, 5),
                    explored: false
                });
            }
        }

        // Check for points of interest
        if (rng.random() < 0.15) {
            const location = rng.pick(tiles);
            const poiTypes = ['shrine', 'ruins', 'cave', 'camp', 'landmark'];

            features.push({
                type: 'poi',
                poiType: rng.pick(poiTypes),
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

        const prefix = rng.pick(prefixes);
        const suffix = rng.pick(suffixes);

        return `${prefix}${suffix}`;
    }

    /**
     * Get settlement population range
     */
    getSettlementPopulation(type, rng) {
        switch (type) {
            case 'city':
                return rng.int(5000, 20000);
            case 'town':
                return rng.int(1000, 5000);
            case 'village':
                return rng.int(50, 500);
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

        return region.tiles[index];
    }

    /**
     * Clear distant regions from cache to save memory
     */
    pruneCache(centerX, centerY, keepRadius = 3) {
        const toDelete = [];

        for (const [key, region] of this.regionCache.entries()) {
            const distance = Math.sqrt(
                Math.pow(region.x - centerX, 2) +
                Math.pow(region.y - centerY, 2)
            );

            if (distance > keepRadius) {
                toDelete.push(key);
            }
        }

        toDelete.forEach(key => this.regionCache.delete(key));

        if (toDelete.length > 0) {
            console.log(`🧹 Pruned ${toDelete.length} regions from cache`);
        }
    }
}

export default WorldGenerator;
