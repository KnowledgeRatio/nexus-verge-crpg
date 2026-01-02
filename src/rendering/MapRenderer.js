/**
 * Map Renderer
 * Handles rendering of the game world using HTML5 Canvas
 */

class MapRenderer {
    constructor(canvasId, config = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id "${canvasId}" not found`);
        }

        this.ctx = this.canvas.getContext('2d');

        // Configuration
        this.config = {
            tileWidth: config.tileWidth || 12,
            tileHeight: config.tileHeight || 16,
            viewportWidth: config.viewportWidth || 80,  // tiles
            viewportHeight: config.viewportHeight || 40, // tiles
            font: config.font || '12px "Courier New", monospace',
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

        // Track if we've warned about beach terrain (only warn once)
        this.hasWarnedAboutBeach = false;

        // Player sprite
        this.playerSymbol = '@';
        this.playerColor = '#ffff00'; // Yellow

        console.log('🎨 MapRenderer initialized', {
            canvas: `${this.canvas.width}x${this.canvas.height}px`,
            viewport: `${this.config.viewportWidth}x${this.config.viewportHeight} tiles`,
            tileSize: `${this.config.tileWidth}x${this.config.tileHeight}px`
        });
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
     * Draw a single tile
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

        // Draw character
        this.ctx.fillStyle = fgColor;
        this.ctx.font = this.config.font;
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(symbol, pixelX + 2, pixelY + 2);
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
            this.drawTile(playerScreenX, playerScreenY, this.playerSymbol, this.playerColor);
        }
    }

    /**
     * Render a single tile
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
                console.error(`❌ BEACH TERRAIN NOT FOUND! terrainMap has:`, Array.from(this.terrainMap.keys()));
                console.error(`❌ Beach tile data:`, tile);
                this.hasWarnedAboutBeach = true;
            } else if (tile.terrain !== 'beach') {
                console.warn(`⚠️ Unknown terrain type: "${tile.terrain}" at (${tile.x}, ${tile.y})`);
            }
            this.drawTile(screenX, screenY, '?', '#ff0000', '#440000');
            return;
        }

        // Check for features (settlements, dungeons, etc.)
        if (tile.feature) {
            this.renderFeature(screenX, screenY, tile.feature, visible);
        } else if (visible) {
            // Currently visible - full color
            this.drawTile(screenX, screenY, terrain.symbol, terrain.color, null);
        } else {
            // Explored but not visible - dimmed
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

        this.config.viewportWidth = Math.floor(width / this.config.tileWidth);
        this.config.viewportHeight = Math.floor(height / this.config.tileHeight);

        console.log(`📐 Resized to ${this.config.viewportWidth}x${this.config.viewportHeight} tiles`);
    }
}

export default MapRenderer;
