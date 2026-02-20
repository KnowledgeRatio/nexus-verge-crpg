/**
 * Map Renderer
 * Handles rendering of the game world using HTML5 Canvas
 * Supports hybrid ASCII/pixel art tile rendering
 */
import { RULES } from '../core/rulesEngine.js';

class MapRenderer {
    constructor(canvasId, config = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id "${canvasId}" not found`);
        }

        this.ctx = this.canvas.getContext('2d');
        // Disable image smoothing for crisp pixel art at all zoom levels
        this.ctx.imageSmoothingEnabled = false;

        // Configuration
        this.config = {
            tileWidth: config.tileWidth || 16,
            tileHeight: config.tileHeight || 16,
            viewportWidth: config.viewportWidth || 60,  // tiles (reduced for 16x16)
            viewportHeight: config.viewportHeight || 40, // tiles
            font: config.font || '14px "Courier New", monospace', // Slightly larger font for 16x16
            ...config
        };

        // Set canvas size
        this.canvas.width = this.config.viewportWidth * this.config.tileWidth;
        this.canvas.height = this.config.viewportHeight * this.config.tileHeight;

        // Camera position (world coordinates)
        this.cameraX = 0;
        this.cameraY = 0;

        // Terrain type cache (loaded from data/terrains.json)
        this.terrainTypes = null;
        this.terrainMap = new Map();

        // Pixel art tile system
        this.usePixelArt = this.loadGraphicsSetting(); // Load from localStorage
        this.tileImages = new Map(); // Cache of loaded tile images
        this.tilesLoading = new Set(); // Currently loading tiles
        this.failedTiles = new Set(); // Tiles that failed to load (404s)
        this.pixelArtPath = 'data/graphics/';

        // Zoom system - from centralized config
        this.zoomLevels = RULES.zoom.levels;
        this.currentZoomIndex = this.loadZoomSetting();

        // Apply saved zoom level to config (overrides defaults)
        const savedZoomSize = this.zoomLevels[this.currentZoomIndex];
        this.config.tileWidth = savedZoomSize;
        this.config.tileHeight = savedZoomSize;
        this.config.viewportWidth = Math.floor(this.canvas.width / savedZoomSize);
        this.config.viewportHeight = Math.floor(this.canvas.height / savedZoomSize);
        const fontSize = Math.floor(savedZoomSize * 0.875);
        this.config.font = `${fontSize}px "Courier New", monospace`;

        // Track if we've warned about beach terrain (only warn once)
        this.hasWarnedAboutBeach = false;

        // Player sprite
        this.playerSymbol = '@';
        this.playerColor = '#ffff00'; // Yellow

        this.playerAvatar = null;
        this.playerAvatarImage = null;
        this.playerAvatarFilename = null;
        this.playerAvatarLoading = false;
        console.log('🎨 MapRenderer initialized', {
            canvas: `${this.canvas.width}x${this.canvas.height}px`,
            viewport: `${this.config.viewportWidth}x${this.config.viewportHeight} tiles`,
            tileSize: `${this.config.tileWidth}x${this.config.tileHeight}px`,
            pixelArt: this.usePixelArt ? 'enabled' : 'disabled'
        });

        // Pre-load available tile images
        if (this.usePixelArt) {
            this.preloadTileImages();
        }
    }

    /**
     * Load graphics setting from localStorage
     */
    loadGraphicsSetting() {
        const saved = localStorage.getItem('nexusVerge_usePixelArt');
        // Default to true (pixel art enabled) if not set
        return saved === null ? true : saved === 'true';
    }

    /**
     * Save graphics setting to localStorage
     */
    saveGraphicsSetting(enabled) {
        localStorage.setItem('nexusVerge_usePixelArt', enabled.toString());
    }

    /**
     * Load zoom setting from localStorage
     */
    loadZoomSetting() {
        const saved = localStorage.getItem(RULES.zoom.storageKey);
        if (saved === null) return RULES.zoom.defaultIndex;
        const index = parseInt(saved, 10);
        // Clamp to valid range in case zoom levels changed
        return Math.max(0, Math.min(index, this.zoomLevels.length - 1));
    }

    /**
     * Save zoom setting to localStorage
     */
    saveZoomSetting(index) {
        localStorage.setItem(RULES.zoom.storageKey, index.toString());
    }

    /**
     * Get current zoom level (tile size)
     */
    getZoomLevel() {
        return this.zoomLevels[this.currentZoomIndex];
    }

    /**
     * Get current zoom index
     */
    getZoomIndex() {
        return this.currentZoomIndex;
    }

    /**
     * Set zoom level by index
     * @param {number} index - Index in zoomLevels array (0-3)
     * @returns {boolean} - True if zoom changed
     */
    setZoomIndex(index) {
        if (index < 0 || index >= this.zoomLevels.length) {
            return false;
        }
        if (index === this.currentZoomIndex) {
            return false;
        }

        this.currentZoomIndex = index;
        this.saveZoomSetting(index);

        const newSize = this.zoomLevels[index];
        this.config.tileWidth = newSize;
        this.config.tileHeight = newSize;

        // Recalculate viewport dimensions
        this.config.viewportWidth = Math.floor(this.canvas.width / newSize);
        this.config.viewportHeight = Math.floor(this.canvas.height / newSize);

        // Update font size proportionally
        const fontSize = Math.floor(newSize * 0.875); // 14px for 16px tiles
        this.config.font = `${fontSize}px "Courier New", monospace`;

        console.log(`🔍 Zoom set to ${newSize}x${newSize}px (level ${index + 1}/${this.zoomLevels.length})`);
        return true;
    }

    /**
     * Zoom in (increase tile size)
     * @returns {boolean} - True if zoom changed
     */
    zoomIn() {
        return this.setZoomIndex(this.currentZoomIndex + 1);
    }

    /**
     * Zoom out (decrease tile size)
     * @returns {boolean} - True if zoom changed
     */
    zoomOut() {
        return this.setZoomIndex(this.currentZoomIndex - 1);
    }

    /**
     * Toggle pixel art mode on/off
     */
    setPixelArtEnabled(enabled) {
        this.usePixelArt = enabled;
        this.saveGraphicsSetting(enabled);
        console.log(`🎨 Pixel art ${enabled ? 'enabled' : 'disabled'}`);

        // Pre-load tiles if enabling
        if (enabled && this.tileImages.size === 0) {
            this.preloadTileImages();
        }
    }

    /**
     * Check if pixel art is enabled
     */
    isPixelArtEnabled() {
        return this.usePixelArt;
    }

    /**
     * Set player avatar image
     * @param {Object|null} avatar - Avatar object with filename
     */
    setPlayerAvatar(avatar) {
        this.playerAvatar = avatar || null;

        if (!avatar || !avatar.filename) {
            this.playerAvatarImage = null;
            this.playerAvatarFilename = null;
            return;
        }

        if (this.playerAvatarFilename === avatar.filename && this.playerAvatarImage) {
            return;
        }

        this.playerAvatarFilename = avatar.filename;
        this.loadPlayerAvatar(avatar.filename);
    }

    /**
     * Load player avatar image
     * @param {string} filename - Avatar image filename
     */
    loadPlayerAvatar(filename) {
        if (!filename) {
            this.playerAvatarImage = null;
            this.playerAvatarFilename = null;
            return;
        }

        if (this.playerAvatarLoading && this.playerAvatarFilename === filename) {
            return;
        }

        this.playerAvatarLoading = true;

        const img = new Image();
        const imagePath = `${this.pixelArtPath}${filename}`;

        img.onload = () => {
            this.playerAvatarImage = img;
            this.playerAvatarLoading = false;
        };

        img.onerror = () => {
            this.playerAvatarImage = null;
            this.playerAvatarLoading = false;
            console.warn(`⚠️ Failed to load player avatar image: ${filename}`);
        };

        img.src = imagePath;
    }



    /**
     * Pre-load available tile images
     * Only loads images for terrains that have tileImage defined in terrains.json
     */
    async preloadTileImages() {
        // Wait for terrain data to be loaded
        await this.loadTerrainData();

        // Only load images for terrains with tileImage defined
        const terrainsWithImages = this.terrainTypes.filter(t => t.tileImage);

        console.log(`🖼️ Pre-loading ${terrainsWithImages.length} tile images from terrains.json...`);

        const loadPromises = terrainsWithImages.map(terrain =>
            this.loadTileImage(terrain.id, terrain.tileImage)
        );
        await Promise.allSettled(loadPromises);

        const loaded = Array.from(this.tileImages.keys());
        console.log(`✅ Loaded ${this.tileImages.size} tile images: ${loaded.join(', ')}`);

        if (this.tileImages.size === 0) {
            console.log('ℹ️ No tile images found - using ASCII rendering');
        }
    }

    /**
     * Load a single tile image
     * @param {string} tileId - Terrain ID (e.g., 'grassland', 'forest')
     * @param {string} filename - Image filename from terrain's tileImage field
     * @returns {Promise<HTMLImageElement|null>}
     */
    loadTileImage(tileId, filename) {
        // Already loaded?
        if (this.tileImages.has(tileId)) {
            return Promise.resolve(this.tileImages.get(tileId));
        }

        // Already failed?
        if (this.failedTiles.has(tileId)) {
            return Promise.resolve(null);
        }

        // No filename specified (tileImage is null)
        if (!filename) {
            return Promise.resolve(null);
        }

        // Currently loading?
        if (this.tilesLoading.has(tileId)) {
            // Return existing promise (not ideal but prevents duplicate loads)
            return new Promise(resolve => {
                const check = setInterval(() => {
                    if (!this.tilesLoading.has(tileId)) {
                        clearInterval(check);
                        resolve(this.tileImages.get(tileId) || null);
                    }
                }, 50);
            });
        }

        // Start loading
        this.tilesLoading.add(tileId);

        return new Promise((resolve) => {
            const img = new Image();
            const imagePath = `${this.pixelArtPath}${filename}`;

            img.onload = () => {
                this.tileImages.set(tileId, img);
                this.tilesLoading.delete(tileId);
                console.log(`✅ Loaded tile: ${tileId} (${filename})`);
                resolve(img);
            };

            img.onerror = () => {
                this.failedTiles.add(tileId);
                this.tilesLoading.delete(tileId);
                console.warn(`⚠️ Failed to load tile image: ${filename} for ${tileId}`);
                resolve(null);
            };

            img.src = imagePath;
        });
    }

    /**
     * Get tile image if available
     * @param {string} tileId - Terrain ID
     * @returns {HTMLImageElement|null}
     */
    getTileImage(tileId) {
        if (!this.usePixelArt) return null;
        return this.tileImages.get(tileId) || null;
    }

    /**
     * Load terrain definitions
     */
    async loadTerrainData() {
        if (!this.terrainTypes) {
            try {
                // Add cache-busting timestamp to force fresh load
                const response = await fetch(`data/terrains.json?v=${Date.now()}`);
                if (!response.ok) {
                    throw new Error(`Failed to load terrains.json: ${response.status}`);
                }

                const data = await response.json();
                this.terrainTypes = data.terrains;

                // Create map for quick lookups
                this.terrainMap.clear(); // Clear any existing entries
                this.terrainTypes.forEach(terrain => {
                    this.terrainMap.set(terrain.id, terrain);
                });

                console.log(`✅ Loaded ${this.terrainTypes.length} terrain types:`,
                    Array.from(this.terrainMap.keys()).join(', '));

                // Debug: Check if beach is loaded
                if (this.terrainMap.has('beach')) {
                    console.log('✅ Beach terrain found in terrainMap:', this.terrainMap.get('beach'));
                } else {
                    console.error('❌ Beach terrain NOT found in terrainMap!');
                }
            } catch (error) {
                console.error('❌ Failed to load terrain data:', error);
                throw error;
            }
        }
        return this.terrainTypes;
    }

    /**
     * Center camera on a world position
     */
    centerOn(worldX, worldY) {
        this.cameraX = worldX - Math.floor(this.config.viewportWidth / 2);
        this.cameraY = worldY - Math.floor(this.config.viewportHeight / 2);
    }

    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Draw a single tile (ASCII mode)
     * @param {number} screenX - Screen X coordinate (tile)
     * @param {number} screenY - Screen Y coordinate (tile)
     * @param {string} symbol - Character to draw
     * @param {string} fgColor - Foreground color
     * @param {string} bgColor - Background color
     */
    drawTile(screenX, screenY, symbol, fgColor, bgColor = null) {
        const pixelX = screenX * this.config.tileWidth;
        const pixelY = screenY * this.config.tileHeight;

        // Draw background
        if (bgColor) {
            this.ctx.fillStyle = bgColor;
            this.ctx.fillRect(pixelX, pixelY, this.config.tileWidth, this.config.tileHeight);
        }

        // Draw character - center it in the 16x16 tile
        this.ctx.fillStyle = fgColor;
        this.ctx.font = this.config.font;
        this.ctx.textBaseline = 'middle';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(symbol, pixelX + this.config.tileWidth / 2, pixelY + this.config.tileHeight / 2);
        // Reset text align for other drawing operations
        this.ctx.textAlign = 'left';
    }

    /**
     * Draw a pixel art tile
     * @param {number} screenX - Screen X coordinate (tile)
     * @param {number} screenY - Screen Y coordinate (tile)
     * @param {HTMLImageElement} image - Tile image to draw
     * @param {number} opacity - Opacity (0-1), used for fog of war dimming
     */
    drawImageTile(screenX, screenY, image, opacity = 1.0) {
        const pixelX = screenX * this.config.tileWidth;
        const pixelY = screenY * this.config.tileHeight;

        // Save context state if we need to change opacity
        if (opacity < 1.0) {
            this.ctx.save();
            this.ctx.globalAlpha = opacity;
        }

        // Draw the tile image, scaled to fit our tile size
        this.ctx.drawImage(
            image,
            pixelX,
            pixelY,
            this.config.tileWidth,
            this.config.tileHeight
        );

        // Restore context state
        if (opacity < 1.0) {
            this.ctx.restore();
        }
    }

    /**
     * Render the world
     * @param {Object} worldData - World data from WorldGenerator
     * @param {Object} playerPosition - Player position {x, y}
     */
    async renderWorld(worldData, playerPosition) {
        await this.loadTerrainData();

        this.clear();

        // Center camera on player
        this.centerOn(playerPosition.x, playerPosition.y);

        // Render tiles
        for (let screenY = 0; screenY < this.config.viewportHeight; screenY++) {
            for (let screenX = 0; screenX < this.config.viewportWidth; screenX++) {
                const worldX = this.cameraX + screenX;
                const worldY = this.cameraY + screenY;

                // Get tile from world data
                const tile = this.getTileAt(worldData, worldX, worldY);

                if (tile) {
                    this.renderTile(screenX, screenY, tile, playerPosition);
                } else {
                    // Unexplored/unknown
                    this.drawTile(screenX, screenY, ' ', '#333333', '#000000');
                }
            }
        }

        // Render player last (on top)
        const playerScreenX = playerPosition.x - this.cameraX;
        const playerScreenY = playerPosition.y - this.cameraY;

        if (playerScreenX >= 0 && playerScreenX < this.config.viewportWidth &&
            playerScreenY >= 0 && playerScreenY < this.config.viewportHeight) {
            if (this.playerAvatarImage) {
                this.drawImageTile(playerScreenX, playerScreenY, this.playerAvatarImage, 1.0);
            } else {
                this.drawTile(playerScreenX, playerScreenY, this.playerSymbol, this.playerColor);
            }
        }
    }

    /**
     * Render a single tile
     * Uses pixel art if available and enabled, falls back to ASCII
     */
    renderTile(screenX, screenY, tile, playerPosition) {
        // Check if tile is visible (fog of war) FIRST
        const visible = tile.visible || this.isNearPlayer(tile, playerPosition, 10);

        if (!visible && !tile.explored) {
            // Not explored yet - completely hidden under fog of war
            this.drawTile(screenX, screenY, ' ', '#000000', '#000000');
            return;
        }

        // Now lookup terrain (only for explored/visible tiles)
        const terrain = this.terrainMap.get(tile.terrain);

        if (!terrain) {
            // Unknown terrain type - log error ONCE for beach, always for others
            if (tile.terrain === 'beach' && !this.hasWarnedAboutBeach) {
                console.error('❌ BEACH TERRAIN NOT FOUND! terrainMap has:', Array.from(this.terrainMap.keys()));
                console.error('❌ Beach tile data:', tile);
                this.hasWarnedAboutBeach = true;
            } else if (tile.terrain !== 'beach') {
                console.warn(`⚠️ Unknown terrain type: "${tile.terrain}" at (${tile.x}, ${tile.y})`);
            }
            this.drawTile(screenX, screenY, '?', '#ff0000', '#440000');
            return;
        }

        // Check for features (settlements, dungeons, etc.) - always use ASCII for features
        if (tile.feature) {
            this.renderFeature(screenX, screenY, tile.feature, visible);
            return;
        }

        // Try to use pixel art tile if enabled
        const tileImage = this.getTileImage(tile.terrain);

        if (tileImage) {
            // Use pixel art tile
            const opacity = visible ? 1.0 : 0.4; // Dim for fog of war
            this.drawImageTile(screenX, screenY, tileImage, opacity);
        } else if (visible) {
            // ASCII fallback - currently visible - full color
            this.drawTile(screenX, screenY, terrain.symbol, terrain.color, null);
        } else {
            // ASCII fallback - explored but not visible - dimmed
            const dimmedColor = this.dimColor(terrain.color, 0.4);
            this.drawTile(screenX, screenY, terrain.symbol, dimmedColor, null);
        }
    }

    /**
     * Render a feature (settlement, dungeon, POI)
     * Looks up symbols from terrains.json for data-driven rendering
     */
    renderFeature(screenX, screenY, feature, visible) {
        let symbol, color;

        // Helper to get terrain data by ID
        const getTerrain = (terrainId) => {
            return this.terrainTypes?.find(t => t.id === terrainId);
        };

        switch (feature.type) {
            case 'settlement':
                // Look up town terrain from terrains.json
                const townTerrain = getTerrain('town');
                symbol = townTerrain?.symbol || '🏘️';
                color = townTerrain?.color || '#d4af37';
                break;

            case 'dungeon':
                // Keep generic dungeon symbol (not tied to specific terrain)
                symbol = 'D';
                color = '#8b0000';
                break;

            case 'sanctuary':
                // Look up sanctuary terrain from terrains.json
                const sanctuaryTerrain = getTerrain('sanctuary');
                symbol = sanctuaryTerrain?.symbol || '⛩️';
                color = sanctuaryTerrain?.color || '#f0e68c';
                break;

            case 'poi':
                switch (feature.poiType) {
                    case 'shrine':
                        // Keep generic shrine symbol (not in terrains.json)
                        symbol = '†';
                        color = '#ffffff';
                        break;
                    case 'ruins':
                        // Look up ruins terrain from terrains.json
                        const ruinsTerrain = getTerrain('ruins');
                        symbol = ruinsTerrain?.symbol || '🏛️';
                        color = ruinsTerrain?.color || '#7a7a7a';
                        break;
                    case 'cave':
                        // Look up cave terrain from terrains.json
                        const caveTerrain = getTerrain('cave');
                        symbol = caveTerrain?.symbol || '🕳️';
                        color = caveTerrain?.color || '#3d3d3d';
                        break;
                    case 'camp':
                        // Keep generic camp symbol (not in terrains.json)
                        symbol = 'A';
                        color = '#cd853f';
                        break;
                    case 'landmark':
                        // Keep generic landmark symbol (not in terrains.json)
                        symbol = '!';
                        color = '#00ff00';
                        break;
                    default:
                        symbol = '?';
                        color = '#ffffff';
                }
                break;

            default:
                symbol = '?';
                color = '#ff00ff';
        }

        if (!visible) {
            color = this.dimColor(color, 0.4);
        }

        this.drawTile(screenX, screenY, symbol, color);
    }

    /**
     * Get tile at world coordinates from world data
     */
    getTileAt(worldData, worldX, worldY) {
        // World data should have a method to get tiles by world coords
        // For now, we'll assume worldData has a tiles array
        // This will be improved when we integrate with WorldGenerator

        if (!worldData || !worldData.tiles) {
            return null;
        }

        return worldData.tiles.find(t => t.x === worldX && t.y === worldY) || null;
    }

    /**
     * Check if tile is near player (for visibility)
     */
    isNearPlayer(tile, playerPosition, radius) {
        const dx = tile.x - playerPosition.x;
        const dy = tile.y - playerPosition.y;
        return (dx * dx + dy * dy) <= radius * radius;
    }

    /**
     * Dim a color by a factor
     */
    dimColor(hexColor, factor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);

        // Dim
        const newR = Math.floor(r * factor);
        const newG = Math.floor(g * factor);
        const newB = Math.floor(b * factor);

        // Convert back to hex
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX, screenY) {
        return {
            x: this.cameraX + Math.floor(screenX / this.config.tileWidth),
            y: this.cameraY + Math.floor(screenY / this.config.tileHeight)
        };
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.cameraX) * this.config.tileWidth,
            y: (worldY - this.cameraY) * this.config.tileHeight
        };
    }

    /**
     * Draw text overlay (for messages, etc.)
     */
    drawText(text, x, y, color = '#ffffff', bgColor = null) {
        if (bgColor) {
            const metrics = this.ctx.measureText(text);
            this.ctx.fillStyle = bgColor;
            this.ctx.fillRect(x - 2, y - 2, metrics.width + 4, this.config.tileHeight + 4);
        }

        this.ctx.fillStyle = color;
        this.ctx.font = this.config.font;
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(text, x, y);
    }

    /**
     * Draw UI overlay (minimap, status, etc.)
     */
    drawOverlay(overlayData) {
        // Draw semi-transparent background for UI areas
        // This can be expanded with minimap, compass, etc.

        if (overlayData.message) {
            const y = this.canvas.height - 30;
            this.drawText(overlayData.message, 10, y, '#ffff00', 'rgba(0, 0, 0, 0.7)');
        }
    }

    /**
     * Resize canvas (if window resizes)
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        // Canvas resize resets context state - re-disable smoothing
        this.ctx.imageSmoothingEnabled = false;

        this.config.viewportWidth = Math.floor(width / this.config.tileWidth);
        this.config.viewportHeight = Math.floor(height / this.config.tileHeight);

        console.log(`📐 Resized to ${this.config.viewportWidth}x${this.config.viewportHeight} tiles`);
    }
}

export default MapRenderer;
