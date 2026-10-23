import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { DungeonManager } from '../../src/systems/DungeonManager.js';
import { DungeonGenerator } from '../../src/systems/DungeonGenerator.js';
import Player from '../../src/systems/Player.js';
import { gameState } from '../../src/core/GameState.js';
import saveManager from '../../src/systems/SaveManager.js';

vi.mock('../../src/systems/AudioManager.js', () => ({ default: {} }));

let generator, manager, player, feature, prompt;
beforeEach(async () => {
    gameState.reset();
    vi.stubGlobal('window', {});
    vi.stubGlobal('fetch', vi.fn(async path => ({ json: async () =>
        JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url))) })));
    generator = new DungeonGenerator('door-connection-regression');
    await generator.loadData();
    feature = { type: 'dungeon', x: 2, y: 3 };
    gameState.set('world.metadata', { features: [{ ...feature }] });
    gameState.set('world.generatedRegions', new Map());
    gameState.set('player.position', { x: feature.x, y: feature.y });
    gameState.set('character', { level: 1, currentHP: 30, maxHP: 30 });
    manager = new DungeonManager(generator, { getTile: async () => ({ feature }) });
    expect(await manager.enterDungeon()).toBe(true);
    player = Object.create(Player.prototype);
    player.dungeonManager = manager;
    prompt = vi.fn(async () => ({ attempted: true, success: true }));
    window.game = { promptChoiceSkillChallenge: prompt };
    window.skillChallengeManager = { terrainChallengesData: { challenges: {
        locked_door: { doorChallenge: true, balance: { triggerFrequency: 1 } }
    } } };
    vi.spyOn(Math, 'random').mockReturnValue(0);
});
afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    gameState.reset();
});

function standAtDoor(from, to) {
    const room = gameState.get('dungeon.rooms')[from];
    const y = room.tiles.findIndex(row => row.some(tile => tile.isDoor && tile.connectsTo === to));
    const x = room.tiles[y].findIndex(tile => tile.isDoor && tile.connectsTo === to);
    gameState.set('dungeon.currentRoomIndex', from);
    gameState.set('dungeon.playerPosition', { x, y });
    return room.tiles[y][x];
}

describe('physical dungeon door connections', () => {
    it.each([1, 5, 10])('opens once and returns without another challenge at level %i', async level => {
        gameState.set('character.level', level);
        const destination = feature.rooms[0].connections[0];
        standAtDoor(0, destination);
        await player.handleInteraction();
        expect(gameState.get('dungeon.currentRoomIndex')).toBe(destination);
        expect(prompt).toHaveBeenCalledTimes(1);
        standAtDoor(destination, 0);
        prompt.mockResolvedValue({ attempted: true, success: false });
        await player.handleInteraction();
        expect(gameState.get('dungeon.currentRoomIndex')).toBe(0);
        expect(prompt).toHaveBeenCalledTimes(1);
        expect(manager.getConnectionDoors(feature.rooms, 0, destination)).toHaveLength(2);
        for (const door of manager.getConnectionDoors(feature.rooms, 0, destination)) {
            expect(door).toMatchObject({ challengeCompleted: true, locked: false });
        }
    });

    it('records an unchallenged passage as open so the reverse direction cannot reroll', async () => {
        const destination = feature.rooms[0].connections[0];
        standAtDoor(0, destination);
        Math.random.mockReturnValueOnce(1);
        await player.handleInteraction();
        standAtDoor(destination, 0);
        await player.handleInteraction();
        expect(gameState.get('dungeon.currentRoomIndex')).toBe(0);
        expect(prompt).not.toHaveBeenCalled();
    });

    it('keeps an unopened failed passage locked from both directions without affecting other passages', async () => {
        const destination = feature.rooms[0].connections[0];
        standAtDoor(0, destination);
        prompt.mockResolvedValue({ attempted: true, success: false });
        await player.handleInteraction();
        expect(gameState.get('dungeon.currentRoomIndex')).toBe(0);
        for (const door of manager.getConnectionDoors(feature.rooms, 0, destination)) {
            expect(door).toMatchObject({ locked: true, challengeCompleted: true });
        }
        await player.handleInteraction();
        expect(prompt).toHaveBeenCalledTimes(1);
        expect(manager.moveToRoom(destination).success).toBe(false);
        standAtDoor(destination, 0);
        await player.handleInteraction();
        expect(gameState.get('dungeon.currentRoomIndex')).toBe(destination);
        expect(prompt).toHaveBeenCalledTimes(1);
        const untouchedDoors = feature.rooms.flatMap((room, index) => room.tiles.flat()
            .filter(tile => tile.isDoor && !((index === 0 && tile.connectsTo === destination) ||
                (index === destination && tile.connectsTo === 0))));
        expect(untouchedDoors.length).toBeGreaterThan(0);
        expect(untouchedDoors.every(door =>
            door.locked === undefined && door.challengeCompleted === undefined)).toBe(true);
    });

    it('leaves cancellation retryable and clears stale reverse locks after a successful opening', async () => {
        const destination = feature.rooms[0].connections[0];
        standAtDoor(0, destination);
        prompt.mockResolvedValueOnce({ attempted: false });
        await player.handleInteraction();
        expect(gameState.get('dungeon.currentRoomIndex')).toBe(0);
        expect(gameState.get('world.metadata.features')[0].doorStates).toBeUndefined();
        standAtDoor(destination, 0).locked = true;
        standAtDoor(0, destination);
        await player.handleInteraction();
        expect(gameState.get('dungeon.currentRoomIndex')).toBe(destination);
        expect(manager.getConnectionDoors(feature.rooms, 0, destination).every(door => !door.locked)).toBe(true);
    });

    it.each([false, true])('restores locked=%s through actual world serialization and dungeon regeneration', async locked => {
        const destination = feature.rooms[0].connections[0];
        standAtDoor(0, destination);
        prompt.mockResolvedValue({ attempted: true, success: !locked });
        await player.handleInteraction();
        const topology = feature.rooms.map(room => ({ id: room.id, connections: room.connections }));
        const saved = JSON.parse(JSON.stringify(saveManager.serializeWorld(gameState.get('world'))));
        expect(saved.metadata.features[0].rooms).toBeUndefined();
        gameState.set('world.metadata', saved.metadata);
        gameState.set('dungeon.active', false);
        feature = { type: 'dungeon', x: 2, y: 3 };
        manager = new DungeonManager(generator, { getTile: async () => ({ feature }) });
        expect(await manager.enterDungeon()).toBe(true);
        player.dungeonManager = manager;
        expect(feature.rooms.map(room => ({ id: room.id, connections: room.connections }))).toEqual(topology);
        for (const door of manager.getConnectionDoors(feature.rooms, 0, destination)) {
            expect(door).toMatchObject({ challengeCompleted: true, locked });
        }
        standAtDoor(0, destination);
        await player.handleInteraction();
        expect(prompt).toHaveBeenCalledTimes(1);
        expect(gameState.get('dungeon.currentRoomIndex')).toBe(locked ? 0 : destination);
    });
});
