/**
 * DungeonGenerator - Procedural dungeon layout generation
 *
 * Generates dungeons from templates with:
 * - Room selection based on dungeon type
 * - Connection generation using spanning tree + random extras
 * - Tile-based room layout generation
 * - Entrance and boss room placement
 */

import { SeededRandom } from '../utils/rng.js';

export class DungeonGenerator {
    constructor(seed) {
        this.seed = seed;
        this.dungeonTypes = [];
        this.roomTemplates = [];
        this.terrains = [];
        this.terrainMap = {};
        this.dataLoaded = false;
    }

    /**
     * Load dungeon data from JSON files
     * Must be called before generating dungeons
     */
    async loadData() {
        if (this.dataLoaded) return;

        try {
            const [dungeonTypesData, dungeonRoomsData, terrainsData] = await Promise.all([
                fetch('data/dungeonTypes.json').then(r => r.json()),
                fetch('data/dungeonRooms.json').then(r => r.json()),
                fetch('data/terrains.json').then(r => r.json())
            ]);

            this.dungeonTypes = dungeonTypesData.dungeonTypes || [];
            this.roomTemplates = dungeonRoomsData.rooms || [];
            this.terrains = terrainsData.terrains || [];

            // Create terrain lookup map
            this.terrainMap = {};
            for (const terrain of this.terrains) {
                this.terrainMap[terrain.id] = terrain;
            }

            this.dataLoaded = true;
            console.log(`🏰 DungeonGenerator loaded: ${this.dungeonTypes.length} dungeon types, ${this.roomTemplates.length} room templates`);
        } catch (error) {
            console.error('Failed to load dungeon data:', error);
        }
    }

    /**
     * Generate a complete dungeon for a feature
     * @param {Object} dungeonFeature - The dungeon feature from the world map
     * @param {number} playerLevel - Current player level for scaling
     * @returns {Object} Generated dungeon data
     */
    async generateDungeon(dungeonFeature, playerLevel = 1) {
        // Create RNG from dungeon's unique seed
        const dungeonSeed = `${this.seed}_dungeon_${dungeonFeature.x}_${dungeonFeature.y}`;
        const rng = new SeededRandom(dungeonSeed);

        // 1. Select or use existing dungeon type
        const dungeonType = dungeonFeature.dungeonTypeId
            ? this.dungeonTypes.find(dt => dt.id === dungeonFeature.dungeonTypeId)
            : this.selectDungeonType(rng);

        if (!dungeonType) {
            console.error('No valid dungeon type found');
            return null;
        }

        dungeonFeature.dungeonType = dungeonType;
        dungeonFeature.dungeonTypeId = dungeonType.id;

        // 2. Determine room count from dungeon type data (no artificial cap)
        const minRooms = Math.max(3, dungeonType.minRooms || 5);
        const maxRooms = Math.max(minRooms, dungeonType.maxRooms || 12);
        const roomCount = rng.nextInt(minRooms, maxRooms);

        // 3. Select rooms from pool (boss room placed separately after depth calculation)
        const rooms = this.selectRooms(rng, dungeonType, roomCount);

        // 4. Generate connections (spanning tree + extras)
        this.generateConnections(rng, rooms);

        // 5. Mark entrance and place boss at maximum depth from entrance
        rooms[0].isEntrance = true;
        rooms[0].hasExit = true; // Primary exit at entrance

        // Find the room at maximum graph depth from the entrance using BFS
        const deepestIndex = this.findDeepestRoom(rooms, 0);
        const bossTemplateIndex = rooms.length - 1; // Boss template was added last by selectRooms

        // Swap the boss room template to the deepest position so the boss-themed
        // room visuals appear at the end of the longest path, not adjacent to entrance
        if (deepestIndex !== bossTemplateIndex && deepestIndex !== 0) {
            this.swapRoomTemplates(rooms[deepestIndex], rooms[bossTemplateIndex]);
        }

        // Mark the deepest room as the boss room
        const bossRoom = rooms[deepestIndex !== 0 ? deepestIndex : bossTemplateIndex];
        bossRoom.isBossRoom = true;
        bossRoom.hasExit = true; // Secondary exit at boss room
        bossRoom.boss = this.selectBoss(rng, dungeonType, playerLevel);

        // 6. Generate tile layouts for each room
        for (const room of rooms) {
            room.tiles = this.generateRoomTiles(rng, room, dungeonType);
            room.playerSpawn = this.findPlayerSpawnInRoom(room);
        }

        // 6.5. Procedural trap placement based on room category and dungeon difficulty
        this.placeProceduralTraps(rng, rooms, dungeonType, playerLevel);

        // 7. Store generated data
        dungeonFeature.rooms = rooms;
        dungeonFeature.roomCount = rooms.length;
        dungeonFeature.currentRoomIndex = 0;
        dungeonFeature.generated = true;
        dungeonFeature.ambientDescription = dungeonType.ambientDescription;

        console.log(`🏰 Generated ${dungeonType.name}: ${rooms.length} rooms (boss at depth ${this.getRoomDepth(rooms, 0, deepestIndex !== 0 ? deepestIndex : bossTemplateIndex)})`);

        return dungeonFeature;
    }

    /**
     * Select a random dungeon type, weighted by sizeWeight (larger dungeons are rarer)
     */
    selectDungeonType(rng) {
        if (this.dungeonTypes.length === 0) return null;

        // Build weighted selection using sizeWeight (default 1.0)
        const totalWeight = this.dungeonTypes.reduce((sum, dt) => sum + (dt.sizeWeight || 1.0), 0);
        let roll = rng.next() * totalWeight;

        for (const dt of this.dungeonTypes) {
            roll -= (dt.sizeWeight || 1.0);
            if (roll <= 0) return dt;
        }

        // Fallback
        return this.dungeonTypes[this.dungeonTypes.length - 1];
    }

    /**
     * Select rooms for the dungeon
     * - Exactly 1 entrance (first)
     * - Fill with middle rooms (exploration/combat/puzzle/treasure/corridor)
     * - Boss room template is reserved and swapped to deepest position after connections
     * - No duplicate room templates
     */
    selectRooms(rng, dungeonType, count) {
        const rooms = [];
        const usedRoomIds = new Set();
        const theme = dungeonType.terrainTheme;

        // RULE: Exactly 1 entrance room (required, always first)
        const entranceRoom = this.getRandomRoom(rng, 'entrance', theme, usedRoomIds);
        if (entranceRoom) {
            entranceRoom.roomIndex = 0;
            entranceRoom.connections = [];
            rooms.push(entranceRoom);
            usedRoomIds.add(entranceRoom.id);
        }

        // Reserve boss room template (will be placed at deepest position later)
        const bossRoomTemplate = this.getRandomRoom(rng, 'boss', theme, usedRoomIds);
        if (bossRoomTemplate) {
            usedRoomIds.add(bossRoomTemplate.id);
        }

        // Fill middle rooms (exploration/combat/puzzle/treasure/corridor)
        const middleCategories = ['exploration', 'combat', 'puzzle', 'treasure', 'corridor'];
        const remaining = count - 2; // Subtract entrance and boss

        for (let i = 0; i < remaining; i++) {
            const category = rng.choice(middleCategories);
            const room = this.getRandomRoom(rng, category, theme, usedRoomIds);
            if (room) {
                room.roomIndex = rooms.length;
                room.connections = [];
                rooms.push(room);
                usedRoomIds.add(room.id);
            }
        }

        // Add boss room template at end (will be swapped to deepest position in generateDungeon)
        if (bossRoomTemplate) {
            bossRoomTemplate.roomIndex = rooms.length;
            bossRoomTemplate.connections = [];
            rooms.push(bossRoomTemplate);
        }

        return rooms;
    }

    /**
     * Get a random room from a category, excluding already-used templates
     */
    getRandomRoom(rng, category, theme, usedRoomIds = new Set()) {
        // Filter candidates by category and theme
        let candidates = this.roomTemplates.filter(r =>
            r.category === category &&
            r.compatibleThemes.includes(theme) &&
            !usedRoomIds.has(r.id)
        );

        // Fallback: if no candidates, try without theme restriction
        if (candidates.length === 0) {
            candidates = this.roomTemplates.filter(r =>
                r.category === category &&
                !usedRoomIds.has(r.id)
            );
        }

        // Final fallback: allow duplicates if pool exhausted
        if (candidates.length === 0) {
            candidates = this.roomTemplates.filter(r =>
                r.category === category
            );
        }

        if (candidates.length === 0) {
            console.warn(`No room template found for category: ${category}`);
            return null;
        }

        // Clone to allow modifications
        const template = rng.choice(candidates);
        return { ...template };
    }

    /**
     * Generate room connections using spanning tree + random extras.
     * For larger dungeons, favors a more linear/branching structure to create depth,
     * ensuring the boss room ends up far from the entrance.
     */
    generateConnections(rng, rooms) {
        if (rooms.length <= 1) return;

        // Initialize connections arrays
        for (const room of rooms) {
            room.connections = room.connections || [];
        }

        // Create spanning tree (ensures all rooms reachable)
        // For larger dungeons, prefer connecting to the most recently added room
        // to create longer chains rather than star topologies
        const connected = [0];
        const unconnected = [];
        for (let i = 1; i < rooms.length; i++) {
            unconnected.push(i);
        }

        // Shuffle unconnected for randomness
        this.shuffleArray(rng, unconnected);

        // For dungeons with 10+ rooms, bias connections toward recent nodes (linear paths)
        // For smaller dungeons, use random connections (more interconnected)
        const isLargeDungeon = rooms.length >= 10;

        while (unconnected.length > 0) {
            const toIdx = unconnected.shift();

            // Pick source room: large dungeons prefer recent nodes for depth
            let fromIdx;
            if (isLargeDungeon && rng.next() < 0.75) {
                // 75% chance: connect to one of the last 3 connected rooms (creates chains)
                const recentCount = Math.min(3, connected.length);
                fromIdx = connected[connected.length - 1 - rng.nextInt(0, recentCount - 1)];
            } else {
                fromIdx = rng.choice(connected);
            }

            // Check connection limits
            const fromRoom = rooms[fromIdx];
            const toRoom = rooms[toIdx];
            const fromMax = fromRoom.maxConnections || 4;
            const toMax = toRoom.maxConnections || 4;

            if (fromRoom.connections.length < fromMax && toRoom.connections.length < toMax) {
                fromRoom.connections.push(toIdx);
                toRoom.connections.push(fromIdx);
                connected.push(toIdx);
            } else {
                // Try another source
                let found = false;
                for (const altFromIdx of connected) {
                    const altFromRoom = rooms[altFromIdx];
                    const altMax = altFromRoom.maxConnections || 4;
                    if (altFromRoom.connections.length < altMax && toRoom.connections.length < toMax) {
                        altFromRoom.connections.push(toIdx);
                        toRoom.connections.push(altFromIdx);
                        connected.push(toIdx);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    // Force connection anyway
                    fromRoom.connections.push(toIdx);
                    toRoom.connections.push(fromIdx);
                    connected.push(toIdx);
                }
            }
        }

        // Add some extra connections for alternate paths
        // Fewer shortcuts in large dungeons to maintain depth
        const shortcutChance = isLargeDungeon ? 0.08 : 0.2;
        for (let i = 0; i < rooms.length; i++) {
            for (let j = i + 2; j < rooms.length; j++) {
                const roomI = rooms[i];
                const roomJ = rooms[j];

                // Skip if already connected
                if (roomI.connections.includes(j)) continue;

                // Check if both have room for more connections
                const maxI = roomI.maxConnections || 4;
                const maxJ = roomJ.maxConnections || 4;

                if (rng.next() < shortcutChance &&
                    roomI.connections.length < maxI &&
                    roomJ.connections.length < maxJ) {
                    roomI.connections.push(j);
                    roomJ.connections.push(i);
                }
            }
        }
    }

    /**
     * Find the room at maximum graph depth from a starting room using BFS.
     * Returns the index of the deepest room.
     */
    findDeepestRoom(rooms, startIndex) {
        const visited = new Set();
        const queue = [{ index: startIndex, depth: 0 }];
        visited.add(startIndex);

        let deepestIndex = startIndex;
        let maxDepth = 0;

        while (queue.length > 0) {
            const { index, depth } = queue.shift();

            if (depth > maxDepth) {
                maxDepth = depth;
                deepestIndex = index;
            }

            const room = rooms[index];
            for (const connIdx of (room.connections || [])) {
                if (!visited.has(connIdx)) {
                    visited.add(connIdx);
                    queue.push({ index: connIdx, depth: depth + 1 });
                }
            }
        }

        return deepestIndex;
    }

    /**
     * Swap the visual/template properties of two rooms while preserving
     * their graph positions (connections, roomIndex).
     * Used to place the boss room template at the deepest position.
     */
    swapRoomTemplates(roomA, roomB) {
        const templateProps = [
            'id', 'name', 'category', 'description', 'width', 'height',
            'shape', 'features', 'compatibleThemes', 'maxConnections',
            'encounterChance', 'skillChallengeChance'
        ];

        for (const prop of templateProps) {
            const temp = roomA[prop];
            roomA[prop] = roomB[prop];
            roomB[prop] = temp;
        }
    }

    /**
     * Get the BFS depth of a specific room from a start room.
     * Used for logging/debugging.
     */
    getRoomDepth(rooms, startIndex, targetIndex) {
        const visited = new Set();
        const queue = [{ index: startIndex, depth: 0 }];
        visited.add(startIndex);

        while (queue.length > 0) {
            const { index, depth } = queue.shift();
            if (index === targetIndex) return depth;

            const room = rooms[index];
            for (const connIdx of (room.connections || [])) {
                if (!visited.has(connIdx)) {
                    visited.add(connIdx);
                    queue.push({ index: connIdx, depth: depth + 1 });
                }
            }
        }

        return -1; // Unreachable
    }

    /**
     * Generate tile layout for a room
     */
    generateRoomTiles(rng, room, dungeonType) {
        const width = room.width || 8;
        const height = room.height || 8;
        const shape = room.shape || 'rectangle';
        const tiles = [];

        const wallTerrain = this.terrainMap['dungeonWall'] || { id: 'dungeonWall', symbol: '#', color: '#2a2a2a' };
        const floorTerrain = this.terrainMap['dungeonFloor'] || { id: 'dungeonFloor', symbol: '.', color: '#4a4a4a' };

        // Build a shape mask: true = floor, false = wall/void
        const shapeMask = this.buildShapeMask(rng, width, height, shape);

        // Create tiles from mask
        for (let y = 0; y < height; y++) {
            tiles[y] = [];
            for (let x = 0; x < width; x++) {
                if (!shapeMask[y][x]) {
                    // Outside shape - solid wall
                    tiles[y][x] = { terrain: wallTerrain, isWall: true };
                } else {
                    // Inside shape - check if perimeter
                    const isPerimeter = this.isShapePerimeter(shapeMask, x, y, width, height);
                    if (isPerimeter) {
                        tiles[y][x] = { terrain: wallTerrain, isWall: true };
                    } else {
                        tiles[y][x] = { terrain: floorTerrain, isWall: false };
                    }
                }
            }
        }

        // Add features based on room features array
        const features = room.features || [];
        for (const feature of features) {
            this.placeFeature(rng, tiles, feature, width, height);
        }

        // Add exit markers
        if (room.hasExit) {
            const exitPos = this.findValidExitPosition(tiles, width, height, room.isEntrance);
            if (exitPos) {
                tiles[exitPos.y][exitPos.x] = {
                    terrain: this.terrainMap['dungeonExit'] || { id: 'dungeonExit', symbol: '▲', color: '#ffd700', isExit: true },
                    isExit: true,
                    isWall: false
                };
            }
        }

        // Add doors for connections (represented as openings in walls)
        this.addConnectionDoors(rng, tiles, room, width, height);

        return tiles;
    }

    /**
     * Build a boolean mask for the room shape
     * true = inside the shape, false = outside (void)
     */
    buildShapeMask(rng, width, height, shape) {
        const mask = [];
        for (let y = 0; y < height; y++) {
            mask[y] = [];
            for (let x = 0; x < width; x++) {
                mask[y][x] = true; // Default: everything inside
            }
        }

        switch (shape) {
            case 'round':
            case 'oval':
                this.applyEllipseMask(mask, width, height);
                break;
            case 'L':
                this.applyLShapeMask(rng, mask, width, height);
                break;
            case 'T':
                this.applyTShapeMask(rng, mask, width, height);
                break;
            case 'cross':
                this.applyCrossMask(mask, width, height);
                break;
            case 'cavern':
                this.applyCavernMask(rng, mask, width, height);
                break;
            case 'irregular':
                this.applyIrregularMask(rng, mask, width, height);
                break;
            case 'rectangle':
            default:
                // No carving needed
                break;
        }

        return mask;
    }

    /**
     * Check if a cell is on the perimeter of the shape
     * (inside the shape but adjacent to outside or grid edge)
     */
    isShapePerimeter(mask, x, y, width, height) {
        if (!mask[y][x]) return false; // Not in shape at all

        // Edge of grid is always perimeter
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) return true;

        // Adjacent to void (outside shape) is perimeter
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || nx >= width || ny < 0 || ny >= height) return true;
                if (!mask[ny][nx]) return true;
            }
        }

        return false;
    }

    /**
     * Ellipse/oval shape - carve corners to form rounded room
     */
    applyEllipseMask(mask, width, height) {
        const cx = (width - 1) / 2;
        const cy = (height - 1) / 2;
        const rx = width / 2;
        const ry = height / 2;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = (x - cx) / rx;
                const dy = (y - cy) / ry;
                if (dx * dx + dy * dy > 1.0) {
                    mask[y][x] = false;
                }
            }
        }
    }

    /**
     * L-shape - remove one corner quadrant
     */
    applyLShapeMask(rng, mask, width, height) {
        // Pick which corner to cut (0=TL, 1=TR, 2=BL, 3=BR)
        const corner = rng.nextInt(0, 3);
        const cutW = Math.floor(width * 0.4);
        const cutH = Math.floor(height * 0.4);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                switch (corner) {
                    case 0: // Top-left
                        if (x < cutW && y < cutH) mask[y][x] = false;
                        break;
                    case 1: // Top-right
                        if (x >= width - cutW && y < cutH) mask[y][x] = false;
                        break;
                    case 2: // Bottom-left
                        if (x < cutW && y >= height - cutH) mask[y][x] = false;
                        break;
                    case 3: // Bottom-right
                        if (x >= width - cutW && y >= height - cutH) mask[y][x] = false;
                        break;
                }
            }
        }
    }

    /**
     * T-shape - remove two corners on one side
     */
    applyTShapeMask(rng, mask, width, height) {
        // Pick which side to cut (0=top, 1=bottom, 2=left, 3=right)
        const side = rng.nextInt(0, 3);
        const cutW = Math.floor(width * 0.3);
        const cutH = Math.floor(height * 0.3);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                switch (side) {
                    case 0: // Cut top-left and top-right
                        if (y < cutH && (x < cutW || x >= width - cutW)) mask[y][x] = false;
                        break;
                    case 1: // Cut bottom-left and bottom-right
                        if (y >= height - cutH && (x < cutW || x >= width - cutW)) mask[y][x] = false;
                        break;
                    case 2: // Cut top-left and bottom-left
                        if (x < cutW && (y < cutH || y >= height - cutH)) mask[y][x] = false;
                        break;
                    case 3: // Cut top-right and bottom-right
                        if (x >= width - cutW && (y < cutH || y >= height - cutH)) mask[y][x] = false;
                        break;
                }
            }
        }
    }

    /**
     * Cross/plus shape - cut all four corners
     */
    applyCrossMask(mask, width, height) {
        const cutW = Math.floor(width * 0.25);
        const cutH = Math.floor(height * 0.25);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const inLeftCut = x < cutW;
                const inRightCut = x >= width - cutW;
                const inTopCut = y < cutH;
                const inBottomCut = y >= height - cutH;

                // Cut all four corners
                if ((inLeftCut && inTopCut) || (inRightCut && inTopCut) ||
                    (inLeftCut && inBottomCut) || (inRightCut && inBottomCut)) {
                    mask[y][x] = false;
                }
            }
        }
    }

    /**
     * Cavern shape - organic irregular edges using seeded noise
     */
    applyCavernMask(rng, mask, width, height) {
        const cx = (width - 1) / 2;
        const cy = (height - 1) / 2;
        const rx = width / 2;
        const ry = height / 2;

        // Generate noise offsets for angular variation
        const numAngles = 16;
        const radiusNoise = [];
        for (let i = 0; i < numAngles; i++) {
            radiusNoise.push(0.7 + rng.next() * 0.5); // 0.7 to 1.2 multiplier
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - cx;
                const dy = y - cy;
                const angle = Math.atan2(dy, dx) + Math.PI; // 0 to 2PI
                const angleIndex = Math.floor((angle / (2 * Math.PI)) * numAngles) % numAngles;
                const nextIndex = (angleIndex + 1) % numAngles;

                // Interpolate between noise samples for smooth edges
                const t = ((angle / (2 * Math.PI)) * numAngles) % 1;
                const noiseMult = radiusNoise[angleIndex] * (1 - t) + radiusNoise[nextIndex] * t;

                const normDist = Math.sqrt((dx / rx) * (dx / rx) + (dy / ry) * (dy / ry));
                if (normDist > noiseMult) {
                    mask[y][x] = false;
                }
            }
        }
    }

    /**
     * Irregular shape - randomly cut 1-3 corners with varying depths
     */
    applyIrregularMask(rng, mask, width, height) {
        const numCuts = rng.nextInt(1, 3);
        const corners = [0, 1, 2, 3];
        this.shuffleArray(rng, corners);

        for (let i = 0; i < numCuts; i++) {
            const corner = corners[i];
            const cutW = Math.floor(width * (0.2 + rng.next() * 0.25));
            const cutH = Math.floor(height * (0.2 + rng.next() * 0.25));

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    switch (corner) {
                        case 0:
                            if (x < cutW && y < cutH) mask[y][x] = false;
                            break;
                        case 1:
                            if (x >= width - cutW && y < cutH) mask[y][x] = false;
                            break;
                        case 2:
                            if (x < cutW && y >= height - cutH) mask[y][x] = false;
                            break;
                        case 3:
                            if (x >= width - cutW && y >= height - cutH) mask[y][x] = false;
                            break;
                    }
                }
            }
        }
    }

    /**
     * Place a feature in the room
     */
    placeFeature(rng, tiles, featureType, width, height) {
        // Find a valid floor position
        const validPositions = [];
        for (let y = 2; y < height - 2; y++) {
            for (let x = 2; x < width - 2; x++) {
                if (tiles[y][x] && !tiles[y][x].isWall && !tiles[y][x].isExit) {
                    validPositions.push({ x, y });
                }
            }
        }

        if (validPositions.length === 0) return;

        const pos = rng.choice(validPositions);

        switch (featureType) {
            case 'treasure_chest':
            case 'treasure':
                tiles[pos.y][pos.x] = {
                    terrain: this.terrainMap['dungeonTreasure'] || { id: 'dungeonTreasure', symbol: '$', color: '#ffd700' },
                    isInteractable: true,
                    featureType: 'treasure',
                    isWall: false
                };
                break;
            case 'altar':
                tiles[pos.y][pos.x] = {
                    terrain: this.terrainMap['dungeonAltar'] || { id: 'dungeonAltar', symbol: '†', color: '#8b0000' },
                    isInteractable: true,
                    featureType: 'altar',
                    isWall: false
                };
                break;
            case 'trap':
            case 'pressure_plate':
                tiles[pos.y][pos.x] = {
                    terrain: this.terrainMap['dungeonTrap'] || { id: 'dungeonTrap', symbol: '!', color: '#ff4500' },
                    isTrap: true,
                    featureType: 'trap',
                    isWall: false,
                    trapDetected: false
                };
                break;
            case 'water_pool':
            case 'underground_pool':
                this.placeWaterPool(rng, tiles, pos, width, height);
                break;
            case 'rubble':
            case 'debris':
                tiles[pos.y][pos.x] = {
                    terrain: this.terrainMap['dungeonRubble'] || { id: 'dungeonRubble', symbol: ',', color: '#5a5a5a' },
                    isWall: false
                };
                break;
            case 'bones':
            case 'bone_pile':
                tiles[pos.y][pos.x] = {
                    terrain: this.terrainMap['dungeonBones'] || { id: 'dungeonBones', symbol: 'x', color: '#f5f5dc' },
                    isWall: false
                };
                break;
            case 'mushrooms':
            case 'glowing_fungi':
                tiles[pos.y][pos.x] = {
                    terrain: this.terrainMap['dungeonMushroom'] || { id: 'dungeonMushroom', symbol: '♠', color: '#9370db' },
                    isWall: false
                };
                break;
            case 'web':
            case 'spider_web':
                tiles[pos.y][pos.x] = {
                    terrain: this.terrainMap['dungeonWeb'] || { id: 'dungeonWeb', symbol: 'w', color: '#d3d3d3' },
                    isWall: false
                };
                break;
            case 'lava':
            case 'lava_pool':
                tiles[pos.y][pos.x] = {
                    terrain: this.terrainMap['dungeonLava'] || { id: 'dungeonLava', symbol: '≈', color: '#ff4500' },
                    isWall: true, // Not traversable
                    isHazard: true
                };
                break;
            case 'ice':
            case 'frozen_floor':
                tiles[pos.y][pos.x] = {
                    terrain: this.terrainMap['dungeonIce'] || { id: 'dungeonIce', symbol: '=', color: '#add8e6' },
                    isWall: false
                };
                break;
            case 'pit':
                tiles[pos.y][pos.x] = {
                    terrain: this.terrainMap['dungeonPit'] || { id: 'dungeonPit', symbol: 'O', color: '#1a1a1a' },
                    isWall: true, // Not traversable
                    isHazard: true
                };
                break;
            // Marker features don't need terrain changes
            case 'entrance_marker':
            case 'boss_marker':
            case 'exit_marker':
            case 'natural_light':
            case 'stalagmites':
            case 'stalactites':
                // These are atmospheric, don't need special tiles
                break;
            default:
                // Unknown feature, skip
                break;
        }
    }

    /**
     * Place a small water pool
     */
    placeWaterPool(rng, tiles, center, width, height) {
        const poolSize = rng.nextInt(1, 3);
        for (let dy = -poolSize; dy <= poolSize; dy++) {
            for (let dx = -poolSize; dx <= poolSize; dx++) {
                const y = center.y + dy;
                const x = center.x + dx;
                if (y > 0 && y < height - 1 && x > 0 && x < width - 1) {
                    if (rng.next() < 0.7) {
                        tiles[y][x] = {
                            terrain: this.terrainMap['dungeonWater'] || { id: 'dungeonWater', symbol: '~', color: '#1a4a5e' },
                            isWall: true,
                            isWater: true
                        };
                    }
                }
            }
        }
    }

    /**
     * Add door openings for connections.
     * Finds valid wall tiles on each side that are adjacent to at least one floor tile,
     * ensuring doors are always reachable from inside the room regardless of shape.
     */
    addConnectionDoors(rng, tiles, room, width, height) {
        const numConnections = room.connections?.length || 0;
        if (numConnections === 0) return;

        // For each wall side, find all valid wall tiles adjacent to a floor tile
        const wallCandidates = {
            north: [], // y=0 row
            south: [], // y=height-1 row
            west: [],  // x=0 column
            east: []   // x=width-1 column
        };

        // North wall: y=0, check that (x, 1) is a floor tile
        for (let x = 1; x < width - 1; x++) {
            if (tiles[0][x]?.isWall && tiles[1]?.[x] && !tiles[1][x].isWall) {
                wallCandidates.north.push({ x, y: 0, wall: 'north' });
            }
        }

        // South wall: y=height-1, check that (x, height-2) is a floor tile
        for (let x = 1; x < width - 1; x++) {
            if (tiles[height - 1]?.[x]?.isWall && tiles[height - 2]?.[x] && !tiles[height - 2][x].isWall) {
                wallCandidates.south.push({ x, y: height - 1, wall: 'south' });
            }
        }

        // West wall: x=0, check that (1, y) is a floor tile
        for (let y = 1; y < height - 1; y++) {
            if (tiles[y][0]?.isWall && tiles[y][1] && !tiles[y][1].isWall) {
                wallCandidates.west.push({ x: 0, y, wall: 'west' });
            }
        }

        // East wall: x=width-1, check that (width-2, y) is a floor tile
        for (let y = 1; y < height - 1; y++) {
            if (tiles[y][width - 1]?.isWall && tiles[y][width - 2] && !tiles[y][width - 2].isWall) {
                wallCandidates.east.push({ x: width - 1, y, wall: 'east' });
            }
        }

        // Collect sides that have valid candidates
        const validSides = ['north', 'south', 'east', 'west'].filter(
            side => wallCandidates[side].length > 0
        );
        this.shuffleArray(rng, validSides);

        // Place doors: pick one random valid position per side
        const doorsPlaced = [];
        for (const side of validSides) {
            if (doorsPlaced.length >= numConnections) break;
            // Pick the candidate closest to the midpoint of that wall for natural placement
            const candidates = wallCandidates[side];
            const mid = side === 'north' || side === 'south'
                ? Math.floor(width / 2)
                : Math.floor(height / 2);
            candidates.sort((a, b) => {
                const distA = Math.abs((side === 'north' || side === 'south' ? a.x : a.y) - mid);
                const distB = Math.abs((side === 'north' || side === 'south' ? b.x : b.y) - mid);
                return distA - distB;
            });
            // Pick from the 3 closest to midpoint for some variety
            const topCandidates = candidates.slice(0, Math.min(3, candidates.length));
            doorsPlaced.push(rng.choice(topCandidates));
        }

        // If we still need more doors (more connections than sides with candidates),
        // try placing additional doors on sides that have remaining candidates
        if (doorsPlaced.length < numConnections) {
            for (const side of validSides) {
                if (doorsPlaced.length >= numConnections) break;
                const candidates = wallCandidates[side];
                // Find a candidate not already used
                for (const c of candidates) {
                    if (!doorsPlaced.some(d => d.x === c.x && d.y === c.y)) {
                        doorsPlaced.push(c);
                        break;
                    }
                }
            }
        }

        // Place the door tiles
        for (let i = 0; i < doorsPlaced.length; i++) {
            const pos = doorsPlaced[i];
            tiles[pos.y][pos.x] = {
                terrain: this.terrainMap['dungeonDoor'] || { id: 'dungeonDoor', symbol: '+', color: '#8b4513', isConnection: true },
                isDoor: true,
                isWall: false,
                connectsTo: room.connections[i]
            };
        }
    }

    /**
     * Find a valid position for an exit tile.
     * Must be a floor tile (not wall, not door) reachable inside the room.
     * Prefers positions near the top (entrance) or bottom (boss) of the room.
     */
    findValidExitPosition(tiles, width, height, isEntrance) {
        // Collect all floor tiles (not wall, not door, not already exit)
        const floorTiles = [];
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                if (tiles[y][x] && !tiles[y][x].isWall && !tiles[y][x].isDoor && !tiles[y][x].isExit) {
                    floorTiles.push({ x, y });
                }
            }
        }

        if (floorTiles.length === 0) return null;

        // Prefer tiles near top for entrance exits, near bottom for boss exits
        const targetY = isEntrance ? 1 : height - 2;
        const targetX = Math.floor(width / 2);

        // Sort by distance to preferred position
        floorTiles.sort((a, b) => {
            const distA = Math.abs(a.y - targetY) * 2 + Math.abs(a.x - targetX);
            const distB = Math.abs(b.y - targetY) * 2 + Math.abs(b.x - targetX);
            return distA - distB;
        });

        return floorTiles[0];
    }

    /**
     * Find a valid spawn position in the room
     */
    findPlayerSpawnInRoom(room) {
        const tiles = room.tiles;
        if (!tiles) return { x: 1, y: 1 };

        const height = tiles.length;
        const width = tiles[0]?.length || 0;

        // Find center floor tile
        for (let y = Math.floor(height / 2); y < height - 1; y++) {
            for (let x = Math.floor(width / 2); x < width - 1; x++) {
                if (tiles[y][x] && !tiles[y][x].isWall && !tiles[y][x].isDoor && !tiles[y][x].isExit) {
                    return { x, y };
                }
            }
        }

        // Fallback: find any floor
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                if (tiles[y][x] && !tiles[y][x].isWall) {
                    return { x, y };
                }
            }
        }

        return { x: 1, y: 1 };
    }

    /**
     * Select a boss from the dungeon type's boss pool, filtered by player level
     * Supports both old format (string array) and new format (object array with minLevel/maxLevel)
     */
    selectBoss(rng, dungeonType, playerLevel = 1) {
        const bossPool = dungeonType.bossPool || [];
        if (bossPool.length === 0) return null;

        // Check if new level-bracketed format (objects with id, minLevel, maxLevel)
        if (bossPool[0] && typeof bossPool[0] === 'object' && bossPool[0].id) {
            // Filter by player level
            const eligible = bossPool.filter(b =>
                playerLevel >= (b.minLevel || 1) && playerLevel <= (b.maxLevel || 10)
            );

            if (eligible.length > 0) {
                return rng.choice(eligible).id;
            }

            // Fallback: pick the entry with the highest maxLevel that's still below player level
            const sorted = [...bossPool].sort((a, b) => (b.maxLevel || 10) - (a.maxLevel || 10));
            return sorted[0].id;
        }

        // Legacy format: flat string array
        return rng.choice(bossPool);
    }

    /**
     * Shuffle array in place using RNG
     */
    shuffleArray(rng, array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = rng.nextInt(0, i);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Get monsters valid for this dungeon type
     */
    getValidMonsters(dungeonType, monstersData) {
        if (!dungeonType || !monstersData) return [];

        return monstersData.monsters.filter(monster => {
            // Check if monster's dungeonTypes includes this dungeon type
            return monster.dungeonTypes && monster.dungeonTypes.includes(dungeonType.id);
        });
    }

    /**
     * Procedurally place trap tiles in dungeon rooms.
     * Traps are placed on floor tiles based on room category and dungeon difficulty.
     * Each trap gets a detection DC that scales with player level.
     *
     * Trap density by room category:
     *  - entrance/boss: 0 traps (safe zones)
     *  - corridor: 1-2 traps (high density for narrow spaces)
     *  - exploration: 0-2 traps
     *  - combat: 0-1 traps
     *  - puzzle: 1-2 traps (puzzles often have traps)
     *  - treasure: 1-3 traps (guarding treasure)
     */
    placeProceduralTraps(rng, rooms, dungeonType, playerLevel) {
        const trapTerrain = this.terrainMap['dungeonTrap'] || { id: 'dungeonTrap', symbol: '!', color: '#ff4500' };

        // Base trap DC scales with dungeon difficulty / player level
        const baseTrapDC = 10 + Math.floor(playerLevel * 0.5);

        // Trap count ranges by room category
        const trapRanges = {
            entrance: { min: 0, max: 0 },
            boss: { min: 0, max: 0 },
            corridor: { min: 1, max: 2 },
            exploration: { min: 0, max: 2 },
            combat: { min: 0, max: 1 },
            puzzle: { min: 1, max: 2 },
            treasure: { min: 1, max: 3 }
        };

        let totalTrapsPlaced = 0;

        for (const room of rooms) {
            const category = room.category || 'exploration';
            const range = trapRanges[category] || { min: 0, max: 1 };

            // Determine trap count for this room
            const trapCount = rng.nextInt(range.min, range.max);
            if (trapCount <= 0) continue;

            const tiles = room.tiles;
            if (!tiles) continue;

            const width = room.width || tiles[0]?.length || 8;
            const height = room.height || tiles.length || 8;

            // Find valid floor positions (not walls, exits, doors, spawns, or existing features)
            const validPositions = [];
            for (let y = 2; y < height - 2; y++) {
                for (let x = 2; x < width - 2; x++) {
                    const tile = tiles[y]?.[x];
                    if (tile && !tile.isWall && !tile.isExit && !tile.isDoor && !tile.isInteractable && !tile.isTrap) {
                        // Don't place on player spawn point
                        if (room.playerSpawn && room.playerSpawn.x === x && room.playerSpawn.y === y) continue;
                        validPositions.push({ x, y });
                    }
                }
            }

            if (validPositions.length === 0) continue;

            // Place traps
            const trapsToPlace = Math.min(trapCount, validPositions.length);
            for (let i = 0; i < trapsToPlace; i++) {
                const posIdx = rng.nextInt(0, validPositions.length - 1);
                const pos = validPositions.splice(posIdx, 1)[0];

                // Vary the DC slightly per trap
                const trapDC = baseTrapDC + rng.nextInt(-2, 3);

                tiles[pos.y][pos.x] = {
                    terrain: trapTerrain,
                    isTrap: true,
                    featureType: 'trap',
                    isWall: false,
                    trapDetected: false,
                    trapDC: Math.max(8, Math.min(20, trapDC)),
                    trapDamage: this.getTrapDamage(playerLevel, rng)
                };

                totalTrapsPlaced++;
            }
        }

        if (totalTrapsPlaced > 0) {
            console.log(`🪤 Placed ${totalTrapsPlaced} traps across dungeon rooms`);
        }
    }

    /**
     * Get trap damage dice based on player level
     */
    getTrapDamage(playerLevel, rng) {
        if (playerLevel <= 2) return '1d6';
        if (playerLevel <= 4) return '2d6';
        if (playerLevel <= 6) return '2d8';
        if (playerLevel <= 8) return '3d6';
        return '3d8';
    }
}

export default DungeonGenerator;
