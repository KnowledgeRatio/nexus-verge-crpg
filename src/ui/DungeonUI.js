/**
 * DungeonUI - Renders dungeon rooms and provides dungeon navigation UI
 *
 * Responsible for:
 * - Rendering the current dungeon room on canvas
 * - Displaying dungeon minimap
 * - Showing room connections and navigation
 * - Dungeon HUD elements (room name, explored rooms, boss status)
 */

import { gameState } from '../core/GameState.js';

export class DungeonUI {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Tile rendering options
        this.tileWidth = options.tileWidth || 16;
        this.tileHeight = options.tileHeight || 16;

        // Zoom levels (same as world map)
        this.zoomLevels = [16, 24, 32, 48];
        this.zoomIndex = options.zoomIndex || 0;

        // Player avatar support
        this.playerAvatarImage = null;
        this.playerAvatarFilename = null;

        // Terrain data cache
        this.terrainTypes = null;

        // Colors for dungeon rendering
        this.colors = {
            floor: '#4a4a4a',
            wall: '#2a2a2a',
            door: '#8b4513',
            exit: '#ffd700',
            player: '#00ff00',
            trap: '#ff4500',
            treasure: '#ffd700',
            water: '#4169e1',
            lava: '#ff4500',
            pit: '#1a1a1a',
            altar: '#9932cc',
            web: '#d3d3d3',
            ice: '#87ceeb',
            mushroom: '#32cd32',
            bones: '#f5f5dc',
            rubble: '#696969'
        };

        console.log('🏰 DungeonUI initialized');
    }

    /**
     * Load terrain data for rendering
     */
    async loadTerrainData() {
        if (this.terrainTypes) return;

        try {
            const response = await fetch('data/terrains.json');
            this.terrainTypes = await response.json();
        } catch (error) {
            console.error('Failed to load terrain data:', error);
        }
    }

    /**
     * Set player avatar image for dungeon rendering
     * @param {Object|null} avatar - Avatar object with filename
     */
    setPlayerAvatar(avatar) {
        if (!avatar || !avatar.filename) {
            this.playerAvatarImage = null;
            this.playerAvatarFilename = null;
            return;
        }

        if (this.playerAvatarFilename === avatar.filename && this.playerAvatarImage) {
            return;
        }

        this.playerAvatarFilename = avatar.filename;

        const img = new Image();
        img.onload = () => {
            this.playerAvatarImage = img;
        };
        img.onerror = () => {
            this.playerAvatarImage = null;
            console.warn(`⚠️ DungeonUI: Failed to load avatar: ${avatar.filename}`);
        };
        img.src = `data/graphics/${avatar.filename}`;
    }

    /**
     * Get current tile size based on zoom level
     */
    getTileSize() {
        return this.zoomLevels[this.zoomIndex];
    }

    /**
     * Get current zoom index
     */
    getZoomIndex() {
        return this.zoomIndex;
    }

    /**
     * Get current zoom pixel size
     */
    getZoomLevel() {
        return this.zoomLevels[this.zoomIndex];
    }

    /**
     * Zoom in
     */
    zoomIn() {
        if (this.zoomIndex < this.zoomLevels.length - 1) {
            this.zoomIndex++;
            return true;
        }
        return false;
    }

    /**
     * Zoom out
     */
    zoomOut() {
        if (this.zoomIndex > 0) {
            this.zoomIndex--;
            return true;
        }
        return false;
    }

    /**
     * Render the current dungeon room
     * @param {Object} dungeonManager - DungeonManager instance
     */
    async render(dungeonManager) {
        await this.loadTerrainData();

        const dungeonState = gameState.get('dungeon');
        if (!dungeonState?.active) {
            this.renderEmpty();
            return;
        }

        const currentRoom = dungeonManager.getCurrentRoom();
        if (!currentRoom || !currentRoom.tiles) {
            this.renderEmpty('No room data');
            return;
        }

        const tileSize = this.getTileSize();
        const playerPos = dungeonState.playerPosition;

        // Calculate canvas size needed
        const roomWidth = currentRoom.tiles[0]?.length || 0;
        const roomHeight = currentRoom.tiles.length;

        // Resize canvas to fit room
        this.canvas.width = roomWidth * tileSize;
        this.canvas.height = roomHeight * tileSize;

        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Render each tile
        for (let y = 0; y < roomHeight; y++) {
            for (let x = 0; x < roomWidth; x++) {
                const tile = currentRoom.tiles[y][x];
                this.renderTile(x, y, tile, tileSize);
            }
        }

        // Render player
        if (playerPos) {
            this.renderPlayer(playerPos.x, playerPos.y, tileSize);
        }

        // Render dungeon HUD overlay
        this.renderDungeonHUD(dungeonState, currentRoom);
    }

    /**
     * Render a single tile
     */
    renderTile(x, y, tile, tileSize) {
        const screenX = x * tileSize;
        const screenY = y * tileSize;

        // Get tile color based on type
        let color = this.colors.floor;
        let symbol = '.';

        if (tile.isWall) {
            color = this.colors.wall;
            symbol = '#';
        } else if (tile.isDoor) {
            color = this.colors.door;
            symbol = '+';
        } else if (tile.isExit) {
            color = this.colors.exit;
            symbol = '▲';
        } else if (tile.isTrap) {
            color = tile.trapDetected ? '#ff6347' : this.colors.floor;
            symbol = tile.trapDetected ? '!' : '.';
        } else if (tile.isTreasure) {
            color = this.colors.treasure;
            symbol = '$';
        } else if (tile.terrainType) {
            // Get color from terrain definition
            const terrainDef = this.getTerrainDef(tile.terrainType);
            if (terrainDef) {
                color = terrainDef.color || this.colors.floor;
                symbol = terrainDef.symbol || '.';
            }
        }

        // Draw tile background
        this.ctx.fillStyle = color;
        this.ctx.fillRect(screenX, screenY, tileSize, tileSize);

        // Draw tile border (subtle grid)
        this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        this.ctx.strokeRect(screenX, screenY, tileSize, tileSize);

        // Draw symbol for non-floor tiles
        if (symbol !== '.') {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = `${Math.floor(tileSize * 0.8)}px monospace`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(symbol, screenX + tileSize / 2, screenY + tileSize / 2);
        }

        // Draw feature icons
        if (tile.featureType) {
            this.renderFeatureIcon(screenX, screenY, tileSize, tile.featureType);
        }
    }

    /**
     * Render player character
     */
    renderPlayer(x, y, tileSize) {
        const screenX = x * tileSize;
        const screenY = y * tileSize;

        if (this.playerAvatarImage) {
            // Draw avatar image scaled to tile size
            this.ctx.drawImage(this.playerAvatarImage, screenX, screenY, tileSize, tileSize);
        } else {
            // Fallback: Draw player background (green circle) with @ symbol
            this.ctx.fillStyle = this.colors.player;
            this.ctx.beginPath();
            this.ctx.arc(
                screenX + tileSize / 2,
                screenY + tileSize / 2,
                tileSize / 3,
                0,
                Math.PI * 2
            );
            this.ctx.fill();

            this.ctx.fillStyle = '#000000';
            this.ctx.font = `bold ${Math.floor(tileSize * 0.6)}px monospace`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('@', screenX + tileSize / 2, screenY + tileSize / 2);
        }
    }

    /**
     * Render feature icon on tile
     */
    renderFeatureIcon(screenX, screenY, tileSize, featureType) {
        const icons = {
            chest: '📦',
            altar: '⛪',
            fountain: '⛲',
            statue: '🗿',
            brazier: '🔥',
            bookshelf: '📚',
            bed: '🛏️',
            table: '🪑',
            barrel: '🛢️',
            crate: '📦',
            bones: '💀',
            web: '🕸️',
            mushroom: '🍄'
        };

        const icon = icons[featureType];
        if (icon) {
            this.ctx.font = `${Math.floor(tileSize * 0.6)}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(icon, screenX + tileSize / 2, screenY + tileSize / 2);
        }
    }

    /**
     * Get terrain definition by ID
     */
    getTerrainDef(terrainId) {
        if (!this.terrainTypes?.terrains) return null;
        return this.terrainTypes.terrains.find(t => t.id === terrainId);
    }

    /**
     * Render empty dungeon state
     */
    renderEmpty(message = 'Not in dungeon') {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#666666';
        this.ctx.font = '16px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
    }

    /**
     * Render dungeon HUD overlay (room name, navigation hints)
     */
    renderDungeonHUD(dungeonState, currentRoom) {
        // Room name at top
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, 30);

        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            currentRoom.name || 'Unknown Room',
            this.canvas.width / 2,
            15
        );

        // Room progress at bottom
        const explored = dungeonState.roomsExplored?.length || 0;
        const total = dungeonState.rooms?.length || 0;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, this.canvas.height - 25, this.canvas.width, 25);

        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(
            `Rooms: ${explored}/${total}`,
            10,
            this.canvas.height - 10
        );

        // Boss status
        if (dungeonState.bossDefeated) {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(
                '✓ Boss Defeated',
                this.canvas.width - 10,
                this.canvas.height - 10
            );
        } else if (currentRoom.isBossRoom) {
            this.ctx.fillStyle = '#ff4500';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(
                '⚠️ BOSS ROOM',
                this.canvas.width - 10,
                this.canvas.height - 10
            );
        }
    }

    /**
     * Render dungeon minimap
     * @param {HTMLCanvasElement} minimapCanvas - Canvas element for minimap
     * @param {Object} dungeonState - Current dungeon state
     */
    renderMinimap(minimapCanvas, dungeonState) {
        if (!dungeonState?.rooms) return;

        const ctx = minimapCanvas.getContext('2d');
        const rooms = dungeonState.rooms;
        const currentRoomIndex = dungeonState.currentRoomIndex || 0;
        const exploredRooms = new Set(dungeonState.roomsExplored || []);

        // Calculate layout
        const roomSize = 30;
        const padding = 40;
        const cols = Math.ceil(Math.sqrt(rooms.length));
        const rows = Math.ceil(rooms.length / cols);

        // Size minimap canvas
        minimapCanvas.width = cols * roomSize + padding * 2;
        minimapCanvas.height = rows * roomSize + padding * 2;

        // Clear
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

        // Draw connections first (so they're behind rooms)
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 2;

        rooms.forEach((room, index) => {
            const x = (index % cols) * roomSize + padding + roomSize / 2;
            const y = Math.floor(index / cols) * roomSize + padding + roomSize / 2;

            if (room.connections) {
                room.connections.forEach(connIndex => {
                    if (connIndex > index) { // Only draw each connection once
                        const connX = (connIndex % cols) * roomSize + padding + roomSize / 2;
                        const connY = Math.floor(connIndex / cols) * roomSize + padding + roomSize / 2;

                        // Only show connection if both rooms explored
                        if (exploredRooms.has(index) && exploredRooms.has(connIndex)) {
                            ctx.beginPath();
                            ctx.moveTo(x, y);
                            ctx.lineTo(connX, connY);
                            ctx.stroke();
                        }
                    }
                });
            }
        });

        // Draw rooms
        rooms.forEach((room, index) => {
            const x = (index % cols) * roomSize + padding;
            const y = Math.floor(index / cols) * roomSize + padding;

            const isExplored = exploredRooms.has(index);
            const isCurrent = index === currentRoomIndex;
            const isBoss = room.isBossRoom;
            const isEntrance = room.isEntrance || index === 0;

            // Room background
            if (!isExplored) {
                ctx.fillStyle = '#333333'; // Unexplored
            } else if (isCurrent) {
                ctx.fillStyle = '#00aa00'; // Current room
            } else if (isBoss) {
                ctx.fillStyle = dungeonState.bossDefeated ? '#666666' : '#aa0000'; // Boss
            } else if (isEntrance) {
                ctx.fillStyle = '#0066aa'; // Entrance
            } else {
                ctx.fillStyle = '#666666'; // Explored
            }

            ctx.fillRect(x, y, roomSize - 4, roomSize - 4);

            // Room border
            ctx.strokeStyle = isCurrent ? '#00ff00' : '#888888';
            ctx.lineWidth = isCurrent ? 2 : 1;
            ctx.strokeRect(x, y, roomSize - 4, roomSize - 4);

            // Room icon
            if (isExplored || isCurrent) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                let icon = '';
                if (isEntrance) icon = '▲';
                else if (isBoss) icon = '☠';
                else icon = (index + 1).toString();

                ctx.fillText(icon, x + (roomSize - 4) / 2, y + (roomSize - 4) / 2);
            }
        });

        // Legend
        ctx.fillStyle = '#888888';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('▲ Entrance  ☠ Boss', 5, minimapCanvas.height - 5);
    }

    /**
     * Get room navigation info (for UI display)
     * @param {Object} dungeonState - Current dungeon state
     * @returns {Object} Navigation info with connected rooms
     */
    getRoomNavigation(dungeonState) {
        if (!dungeonState?.rooms) return { connections: [] };

        const currentRoom = dungeonState.rooms[dungeonState.currentRoomIndex || 0];
        if (!currentRoom) return { connections: [] };

        const connections = (currentRoom.connections || []).map(connIndex => {
            const room = dungeonState.rooms[connIndex];
            return {
                index: connIndex,
                name: room?.name || `Room ${connIndex + 1}`,
                isBoss: room?.isBossRoom,
                isEntrance: connIndex === 0,
                explored: dungeonState.roomsExplored?.includes(connIndex)
            };
        });

        return {
            currentRoom: currentRoom.name || 'Unknown Room',
            currentIndex: dungeonState.currentRoomIndex || 0,
            connections,
            hasExit: currentRoom.hasExit || currentRoom.isEntrance,
            isBossRoom: currentRoom.isBossRoom
        };
    }
}

export default DungeonUI;
