/**
 * DungeonManager - Handles dungeon entry, exit, state, and lifecycle
 *
 * Manages:
 * - World map position preservation
 * - Dungeon entry/exit transitions
 * - Current dungeon state
 * - Room navigation within dungeons
 * - Monster pools for encounters
 */

import { gameState } from '../core/GameState.js';

export class DungeonManager {
    constructor(dungeonGenerator, worldGenerator) {
        this.dungeonGenerator = dungeonGenerator;
        this.worldGenerator = worldGenerator;
        this.currentDungeon = null;
        this.worldMapPosition = null;
        this.monstersData = null;
    }

    /**
     * Set monsters data for dungeon encounters
     */
    setMonstersData(monstersData) {
        this.monstersData = monstersData;
    }

    /**
     * Check if player is currently in a dungeon
     */
    isInDungeon() {
        const dungeonState = gameState.get('dungeon');
        return dungeonState?.active === true;
    }

    /**
     * Get dungeon feature at player's current world position
     */
    async getDungeonAtPlayerPosition() {
        const playerPos = gameState.get('player.position');
        if (!playerPos) {
            return null;
        }

        const tile = await this.worldGenerator.getTile(playerPos.x, playerPos.y);
        if (!tile) {
            return null;
        }

        // Check if tile has a dungeon feature
        // Features from worldMetadata have type: 'dungeon', not isDungeon
        if (tile.feature?.type === 'dungeon' || tile.feature?.isDungeon) {
            return tile.feature;
        }

        return null;
    }

    /**
     * Enter a dungeon - called from Player.js on E key press
     * @returns {boolean} True if successfully entered dungeon
     */
    async enterDungeon() {
        // Don't enter if already in a dungeon
        if (this.isInDungeon()) {
            gameState.addMessage('⚠️ You are already in a dungeon!', 'warning');
            return false;
        }

        // Get dungeon at player position
        const dungeonFeature = await this.getDungeonAtPlayerPosition();
        if (!dungeonFeature) {
            gameState.addMessage('⚠️ No dungeon entrance here.', 'warning');
            return false;
        }

        // 1. Save world map position
        const playerPos = gameState.get('player.position');
        this.worldMapPosition = { x: playerPos.x, y: playerPos.y };

        // 2. Generate dungeon if not already generated
        if (!dungeonFeature.generated) {
            const character = gameState.get('character');
            const playerLevel = character?.level || 1;
            await this.dungeonGenerator.generateDungeon(dungeonFeature, playerLevel);
        }

        // 3. Set current dungeon context
        this.currentDungeon = dungeonFeature;

        // 4. Get entrance room spawn position
        const entranceRoom = dungeonFeature.rooms[0];
        const spawnPos = entranceRoom.playerSpawn || { x: 1, y: 1 };

        // 5. Update game state for dungeon mode
        gameState.set('dungeon', {
            active: true,
            dungeonId: `${dungeonFeature.x}_${dungeonFeature.y}`,
            dungeonTypeId: dungeonFeature.dungeonTypeId,
            dungeonTypeName: dungeonFeature.dungeonType?.name || 'Unknown Dungeon',
            currentRoomIndex: 0,
            playerPosition: { x: spawnPos.x, y: spawnPos.y },
            worldMapPosition: this.worldMapPosition,
            rooms: dungeonFeature.rooms,
            roomsExplored: [0], // Start with entrance explored
            bossDefeated: false
        });

        // 6. Show entry message
        const dungeonName = dungeonFeature.dungeonType?.name || 'the dungeon';
        gameState.addMessage(`🚪 You enter ${dungeonName}...`, 'info');

        if (dungeonFeature.ambientDescription) {
            gameState.addMessage(`📜 ${dungeonFeature.ambientDescription}`, 'info');
        }

        return true;
    }

    /**
     * Exit dungeon - called from Player.js on E key press at exit tile
     * @returns {boolean} True if successfully exited dungeon
     */
    exitDungeon() {
        if (!this.isInDungeon()) {
            return false;
        }

        const dungeonState = gameState.get('dungeon');

        // 1. Restore world map position
        const returnPosition = dungeonState.worldMapPosition || this.worldMapPosition;
        if (returnPosition) {
            gameState.set('player.position', { x: returnPosition.x, y: returnPosition.y });
        }

        // 2. Clear dungeon state
        gameState.set('dungeon', {
            active: false,
            dungeonId: null,
            currentRoomIndex: 0,
            playerPosition: null,
            worldMapPosition: null,
            rooms: null
        });

        // 3. Clear current dungeon reference
        this.currentDungeon = null;
        this.worldMapPosition = null;

        // 4. Show exit message
        gameState.addMessage('🌤️ You emerge from the dungeon into daylight.', 'success');

        return true;
    }

    /**
     * Get current room data
     */
    getCurrentRoom() {
        const dungeonState = gameState.get('dungeon');
        if (!dungeonState?.active || !dungeonState.rooms) {
            return null;
        }

        const roomIndex = dungeonState.currentRoomIndex || 0;
        return dungeonState.rooms[roomIndex] || null;
    }

    /**
     * Get tile at position in current room
     */
    getTileInCurrentRoom(x, y) {
        const room = this.getCurrentRoom();
        if (!room || !room.tiles) {
            return null;
        }

        if (y >= 0 && y < room.tiles.length && x >= 0 && x < room.tiles[y].length) {
            return room.tiles[y][x];
        }
        return null;
    }

    /**
     * Move player within the dungeon room
     * @returns {Object} Result of movement attempt
     */
    movePlayer(dx, dy) {
        const dungeonState = gameState.get('dungeon');
        if (!dungeonState?.active) {
            return { success: false, reason: 'not_in_dungeon' };
        }

        const currentPos = dungeonState.playerPosition;
        const newX = currentPos.x + dx;
        const newY = currentPos.y + dy;

        // Get tile at new position
        const tile = this.getTileInCurrentRoom(newX, newY);
        if (!tile) {
            return { success: false, reason: 'out_of_bounds' };
        }

        // Check if traversable
        if (tile.isWall) {
            return { success: false, reason: 'wall' };
        }

        // Update position
        dungeonState.playerPosition = { x: newX, y: newY };
        gameState.set('dungeon', dungeonState);

        // Check for special tiles
        const result = { success: true, tile };

        if (tile.isDoor) {
            result.isDoor = true;
            result.connectsTo = tile.connectsTo;
        }

        if (tile.isExit) {
            result.isExit = true;
        }

        if (tile.isTrap && !tile.trapDetected) {
            result.isTrap = true;
        }

        if (tile.isInteractable) {
            result.isInteractable = true;
            result.featureType = tile.featureType;
        }

        return result;
    }

    /**
     * Move to a connected room
     * @param {number} roomIndex - Index of the room to move to
     * @returns {Object} Result with { success, bossFight, bossId }
     */
    moveToRoom(roomIndex) {
        const dungeonState = gameState.get('dungeon');
        if (!dungeonState?.active || !dungeonState.rooms) {
            return { success: false };
        }

        const currentRoom = this.getCurrentRoom();
        if (!currentRoom) {
            return { success: false };
        }

        // Check if rooms are connected
        if (!currentRoom.connections.includes(roomIndex)) {
            gameState.addMessage('⚠️ These rooms are not connected!', 'warning');
            return { success: false };
        }

        // Get target room
        const targetRoom = dungeonState.rooms[roomIndex];
        if (!targetRoom) {
            return { success: false };
        }

        // Update dungeon state
        dungeonState.currentRoomIndex = roomIndex;
        dungeonState.playerPosition = targetRoom.playerSpawn || { x: 1, y: 1 };

        // Mark room as explored
        if (!dungeonState.roomsExplored.includes(roomIndex)) {
            dungeonState.roomsExplored.push(roomIndex);
        }

        gameState.set('dungeon', dungeonState);

        // Show room entry message
        gameState.addMessage(`🚪 You enter ${targetRoom.name || 'a new room'}.`, 'info');

        // --- Quest: Retrieve item injection on boss room entry ---
        if (targetRoom.isBossRoom && this.currentDungeon) {
            this._injectQuestBind(this.currentDungeon.x, this.currentDungeon.y);
        }

        // --- Quest: Investigate room completion check ---
        if (window.questManager && this.currentDungeon) {
            const character = gameState.get('character');
            window.questManager.onRoomEntered(
                this.currentDungeon.x,
                this.currentDungeon.y,
                roomIndex,
                character
            );
        }

        // --- Quest: Time-limit check for timed quests ---
        if (this.currentDungeon) {
            this._checkTimeLimitQuests(
                this.currentDungeon.x,
                this.currentDungeon.y,
                dungeonState.roomsExplored.length
            );
        }

        // Check for boss room with undefeated boss
        const bossFight = targetRoom.isBossRoom && targetRoom.boss && !dungeonState.bossDefeated;
        if (bossFight) {
            gameState.addMessage('⚠️ A powerful enemy blocks your path!', 'warning');
        }

        return { success: true, bossFight, bossId: bossFight ? targetRoom.boss : null };
    }

    /**
     * Check whether any active time-limited quests have exceeded their room budget.
     * Fails the quest and writes a pendingEvent for the ConsequenceManager.
     * @param {number} dungeonX
     * @param {number} dungeonY
     * @param {number} roomsExploredCount - total rooms explored so far (length of the array)
     */
    _checkTimeLimitQuests(dungeonX, dungeonY, roomsExploredCount) {
        const quests = gameState.get('quests');
        if (!quests?.active?.length) return;

        const hookKey = `${dungeonX},${dungeonY}`;
        let stateModified = false;

        for (let i = quests.active.length - 1; i >= 0; i--) {
            const quest = quests.active[i];
            if (!quest.timeLimit || quest.dungeonHookId !== hookKey) continue;
            if (quest.status !== 'active') continue;

            const remaining = quest.timeLimit - roomsExploredCount;

            if (remaining > 0) {
                gameState.addMessage(
                    `⚠️ ${remaining} room${remaining === 1 ? '' : 's'} remaining — hurry!`,
                    'warning'
                );
            } else {
                // Time limit exceeded — fail the quest
                quest.status = 'failed';
                quest.failReason = 'Time limit exceeded — the ritual completed.';
                gameState.addMessage(`💀 Too late. The ritual is complete. Quest failed: ${quest.name}`, 'error');
                console.log(`⏰ Quest time limit exceeded: ${quest.name} (${quest.id})`);

                // Route failure consequence through ConsequenceManager
                if (window.consequenceManager) {
                    window.consequenceManager.queueConsequence('quest_failure_consequence', {
                        flagToApply: 'cursed',
                        targetSettlementId: quest.settlementId || null,
                        sourceQuestId: quest.id
                    });
                } else {
                    // Fallback: write directly if ConsequenceManager not yet available
                    const pendingEvents = gameState.get('world.pendingEvents') || [];
                    pendingEvents.push({
                        id: `evt_${Date.now()}_timelimit_fail`,
                        type: 'quest_failure_consequence',
                        sourceSettlementId: quest.settlementId || null,
                        sourceQuestId: quest.id,
                        payload: { flagToApply: 'cursed', targetSettlementId: quest.settlementId || null },
                        expiresAtVisitCount: (gameState.get('world.visitCount') || 0) + 999,
                        visitWindow: 999,
                        useLocalCounter: false,
                        isProcessed: false,
                        resolved: false
                    });
                    gameState.set('world.pendingEvents', pendingEvents);
                }

                // Move to failed list
                quests.active.splice(i, 1);
                quests.failed = quests.failed || [];
                quests.failed.push(quest);
                stateModified = true;
            }
        }

        if (stateModified) {
            gameState.set('quests', quests);
        }
    }

    /**
     * Get monsters valid for the current dungeon's monster pool
     */
    getDungeonMonsterPool() {
        if (!this.currentDungeon?.dungeonType) {
            return [];
        }

        const dungeonType = this.currentDungeon.dungeonType;
        return dungeonType.monsterPool || [];
    }

    /**
     * Get the boss monster for the current dungeon
     */
    getDungeonBoss() {
        if (!this.currentDungeon?.dungeonType) {
            return null;
        }

        const dungeonType = this.currentDungeon.dungeonType;
        const bossPool = dungeonType.bossPool || [];

        if (bossPool.length === 0) {
            return null;
        }

        // Find boss room and return its assigned boss
        const dungeonState = gameState.get('dungeon');
        if (dungeonState?.rooms) {
            const bossRoom = dungeonState.rooms.find(r => r.isBossRoom);
            if (bossRoom?.boss) {
                return bossRoom.boss;
            }
        }

        // Fallback to random from pool (supports both old string and new object format)
        const pick = bossPool[Math.floor(Math.random() * bossPool.length)];
        return typeof pick === 'object' ? pick.id : pick;
    }

    /**
     * Check if current tile is an exit
     */
    isAtExit() {
        const dungeonState = gameState.get('dungeon');
        if (!dungeonState?.active) {
            return false;
        }

        const tile = this.getTileInCurrentRoom(
            dungeonState.playerPosition.x,
            dungeonState.playerPosition.y
        );

        return tile?.isExit === true;
    }

    /**
     * Check if current tile is a door
     */
    isAtDoor() {
        const dungeonState = gameState.get('dungeon');
        if (!dungeonState?.active) {
            return false;
        }

        const tile = this.getTileInCurrentRoom(
            dungeonState.playerPosition.x,
            dungeonState.playerPosition.y
        );

        return tile?.isDoor === true;
    }

    /**
     * Get the room index that the current door connects to
     */
    getDoorDestination() {
        const dungeonState = gameState.get('dungeon');
        if (!dungeonState?.active) {
            return null;
        }

        const tile = this.getTileInCurrentRoom(
            dungeonState.playerPosition.x,
            dungeonState.playerPosition.y
        );

        if (tile?.isDoor && tile.connectsTo !== undefined) {
            return tile.connectsTo;
        }

        return null;
    }

    /**
     * Get the current door tile (if player is standing on one)
     * @returns {Object|null} The door tile object or null
     */
    getCurrentDoorTile() {
        const dungeonState = gameState.get('dungeon');
        if (!dungeonState?.active) {
            return null;
        }

        const tile = this.getTileInCurrentRoom(
            dungeonState.playerPosition.x,
            dungeonState.playerPosition.y
        );

        return (tile?.isDoor) ? tile : null;
    }

    /**
     * Mark the current door tile as permanently locked (failed skill challenge)
     */
    markDoorLocked() {
        const dungeonState = gameState.get('dungeon');
        if (!dungeonState?.active) {
            return;
        }

        const pos = dungeonState.playerPosition;
        const room = this.getCurrentRoom();
        if (room?.tiles?.[pos.y]?.[pos.x]?.isDoor) {
            room.tiles[pos.y][pos.x].locked = true;
            gameState.set('dungeon', dungeonState);
        }
    }

    /**
     * Mark the current door's skill challenge as completed (won't trigger again)
     */
    markDoorChallengeCompleted() {
        const dungeonState = gameState.get('dungeon');
        if (!dungeonState?.active) {
            return;
        }

        const pos = dungeonState.playerPosition;
        const room = this.getCurrentRoom();
        if (room?.tiles?.[pos.y]?.[pos.x]?.isDoor) {
            room.tiles[pos.y][pos.x].challengeCompleted = true;
            gameState.set('dungeon', dungeonState);
        }
    }

    /**
     * Mark boss as defeated, and inject any bound quest item into the player's inventory.
     */
    markBossDefeated() {
        const dungeonState = gameState.get('dungeon');
        if (dungeonState) {
            dungeonState.bossDefeated = true;
            gameState.set('dungeon', dungeonState);
            gameState.addMessage('🏆 The dungeon boss has been defeated!', 'success');
        }

        // Inject quest item if this dungeon has a retrieve questBind
        if (this.currentDungeon) {
            this._injectQuestBind(this.currentDungeon.x, this.currentDungeon.y);
        }
    }

    /**
     * Inject a quest-bound retrieve item into the player's inventory when the dungeon boss is defeated.
     * Always reads questBind from world.metadata by coordinate — never from the region feature object,
     * which may be re-inflated from compressed save data and will not contain questBind written after
     * initial generation.
     * @param {number} dungeonX - World X coordinate of this dungeon
     * @param {number} dungeonY - World Y coordinate of this dungeon
     */
    _injectQuestBind(dungeonX, dungeonY) {
        const metadata = gameState.get('world.metadata');
        const feature = metadata?.features?.find(f => f.x === dungeonX && f.y === dungeonY);
        if (!feature?.questBind || feature.questBind.bindType !== 'retrieve') return;

        // Only inject once — guard against duplicate injection on re-entry
        if (feature.questBind.injected) return;

        const { itemId, itemName } = feature.questBind;

        // Add to player inventory
        const character = gameState.get('character');
        if (!character) {
            console.warn('🏰 _injectQuestBind: no character in gameState');
            return;
        }

        const questItem = {
            id: itemId,
            name: itemName,
            type: 'quest_item',
            description: 'A quest item. Return this to the quest giver.',
            weight: 1,
            value: 0,
            canDrop: false,
            quantity: 1
        };

        // Place item visibly in the boss room loot so it can be picked up like normal loot
        const dungeonState = gameState.get('dungeon');
        if (dungeonState?.rooms) {
            const bossRoom = dungeonState.rooms.find(r => r.isBossRoom);
            if (bossRoom) {
                bossRoom.loot = bossRoom.loot || [];
                if (!bossRoom.loot.some(l => l.id === itemId)) {
                    bossRoom.loot.push({ id: itemId, name: itemName, type: 'quest_item', canDrop: false });
                    gameState.set('dungeon', dungeonState);
                    console.log(`🏰 Quest item placed in boss room loot: ${itemName}`);
                }
            }
        }

        // Also add directly to character inventory as a fallback (e.g. boss killed before room loot picked up)
        if (typeof character.addItem === 'function') {
            character.addItem(questItem);
        } else {
            character.inventory = character.inventory || [];
            character.inventory.push(questItem);
        }

        gameState.set('character', character);
        gameState.addMessage(`📦 You find ${itemName} among the boss's remains.`, 'success');
        console.log(`🏰 Quest item injected: ${itemName} (${itemId}) for dungeon (${dungeonX},${dungeonY})`);

        // Mark as injected so re-entry doesn't duplicate
        feature.questBind.injected = true;
        gameState.set('world.metadata', metadata);
        // Keep worldGenerator in sync if accessible
        if (window.game?.worldGenerator) {
            window.game.worldGenerator.worldMetadata = metadata;
        }

        // Notify QuestManager of item acquisition
        if (window.questManager) {
            window.questManager.onItemAcquired(itemId);
        }
    }

    /**
     * Get encounter chance modifier for current room
     */
    getEncounterModifier() {
        const room = this.getCurrentRoom();
        if (!room) {
            return 1.0;
        }

        // Base modifier from dungeon type
        let modifier = this.currentDungeon?.dungeonType?.encounterModifier || 1.0;

        // Additional modifier from room encounter chance
        modifier *= room.encounterChance !== undefined ? room.encounterChance : 1.0;

        return modifier;
    }

    /**
     * Get skill challenges available in current room
     */
    getRoomSkillChallenges() {
        const room = this.getCurrentRoom();
        if (!room) {
            return [];
        }

        const dungeonType = this.currentDungeon?.dungeonType;
        if (!dungeonType?.skillChallenges) {
            return [];
        }

        // Return skill challenges that match room type
        return dungeonType.skillChallenges;
    }

    /**
     * Get dungeon state summary for UI
     */
    getDungeonSummary() {
        const dungeonState = gameState.get('dungeon');
        if (!dungeonState?.active) {
            return null;
        }

        const currentRoom = this.getCurrentRoom();

        return {
            dungeonName: dungeonState.dungeonTypeName,
            currentRoomName: currentRoom?.name || 'Unknown Room',
            currentRoomIndex: dungeonState.currentRoomIndex,
            totalRooms: dungeonState.rooms?.length || 0,
            roomsExplored: dungeonState.roomsExplored?.length || 0,
            bossDefeated: dungeonState.bossDefeated,
            playerPosition: dungeonState.playerPosition,
            connections: currentRoom?.connections || []
        };
    }
}

export default DungeonManager;
