import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { DungeonManager } from '../../src/systems/DungeonManager.js';
import { DungeonGenerator } from '../../src/systems/DungeonGenerator.js';
import Player from '../../src/systems/Player.js';
import saveManager from '../../src/systems/SaveManager.js';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';

vi.mock('../../src/systems/AudioManager.js', () => ({ default: {} }));

const json = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url)));
const challenge = json('skillChallenges').challenges.trap_detect_disarm;
let manager, player, tile, prompt;
beforeEach(() => {
    gameState.reset();
    vi.stubGlobal('window', {});
    const room = { id: 'test-room', tiles: [[{ isTrap: true, trapDetected: false,
        trapDC: 13, trapDamage: '1', featureType: 'trap' }]] };
    tile = room.tiles[0][0];
    const canonical = { x: 2, y: 3 };
    gameState.set('world.metadata', { features: [canonical] });
    gameState.set('world.generatedRegions', new Map());
    gameState.set('character', { level: 1, currentHP: 30, maxHP: 30, tempHP: 0 });
    gameState.set('dungeon', { active: true, currentRoomIndex: 0,
        playerPosition: { x: 0, y: 0 }, rooms: [room] });
    manager = new DungeonManager(null, null);
    manager.currentDungeon = { ...canonical, rooms: [room] };
    player = Object.create(Player.prototype);
    player.dungeonManager = manager;
    prompt = vi.fn(async () => ({ attempted: false }));
    window.game = { promptSkillCheck: prompt, updateHUD: vi.fn(), checkDeath: vi.fn() };
    window.skillChallengeManager = { terrainChallengesData: { challenges: { trap_detect_disarm: challenge } },
        getSkillCheckContext: vi.fn(() => ({ passiveScore: 20 })),
        calculateAdjustedDC: vi.fn((dc, level) => dc + level) };
});
afterEach(() => {
    vi.unstubAllGlobals(); vi.restoreAllMocks(); gameState.reset();
});

describe('physical trap decisions', () => {
    it.each([1, 5, 10])('keeps avoided traps armed and permits one later E attempt at level %i', async level => {
        gameState.set('character.level', level);
        await player.triggerDungeonTrapChallenge();
        expect(tile).toMatchObject({ isTrap: true, trapDetected: true });
        expect(manager.movePlayer(0, 0).isTrap).toBeUndefined();
        await player.triggerDungeonTrapChallenge();
        expect(prompt).toHaveBeenCalledTimes(1);
        prompt.mockResolvedValue({ attempted: true, success: true });
        await player.handleInteraction();
        expect(tile).toMatchObject({ isTrap: false, trapDetected: true });
        await player.triggerDungeonTrapChallenge(true);
        expect(prompt).toHaveBeenCalledTimes(2);
        expect(window.skillChallengeManager.calculateAdjustedDC).toHaveBeenLastCalledWith(14, level);
    });

    it.each([1, 5, 10])('damages once when moving back onto an avoided trap at level %i', async level => {
        gameState.set('character.level', level);
        const room = manager.getCurrentRoom();
        room.tiles[0].push({ isWall: false });
        player.checkForDungeonSkillChallenge = vi.fn(async () => {});
        player.checkForDungeonEncounter = vi.fn(async () => {});
        await player.triggerDungeonTrapChallenge();
        expect(tile).toMatchObject({ isTrap: true, trapDetected: true });
        await player.move(1, 0);
        await player.move(-1, 0);
        expect(gameState.get('character.currentHP')).toBe(29);
        expect(tile).toMatchObject({ isTrap: false, trapDetected: true });
        expect(prompt).toHaveBeenCalledTimes(1);
        const saved = JSON.parse(JSON.stringify(saveManager.serializeWorld(gameState.get('world'))));
        gameState.set('world.metadata', saved.metadata);
        const regenerated = { x: 2, y: 3, rooms: [{ id: room.id,
            tiles: [[{ isTrap: true, trapDC: 13, trapDamage: '1' }, { isWall: false }]] }] };
        manager.restoreTrapStates(regenerated);
        expect(regenerated.rooms[0].tiles[0][0].isTrap).toBe(false);
        await player.move(1, 0);
        await player.move(-1, 0);
        expect(gameState.get('character.currentHP')).toBe(29);
    });

    it('keeps a successfully disarmed trap safe when stepped on again', async () => {
        const room = manager.getCurrentRoom();
        room.tiles[0].push({ isWall: false });
        player.checkForDungeonSkillChallenge = vi.fn(async () => {});
        player.checkForDungeonEncounter = vi.fn(async () => {});
        prompt.mockResolvedValue({ attempted: true, success: true });
        await player.triggerDungeonTrapChallenge();
        await player.move(1, 0);
        await player.move(-1, 0);
        expect(gameState.get('character.currentHP')).toBe(30);
        expect(prompt).toHaveBeenCalledTimes(1);
    });

    it('does not apply authored disarm failure damage a second time', async () => {
        prompt.mockImplementation(async () => {
            gameState.set('character.currentHP', 27); // Shared prompt applied its failure consequence.
            return { attempted: true, success: false };
        });
        await player.triggerDungeonTrapChallenge();
        expect(gameState.get('character.currentHP')).toBe(27);
        expect(tile.isTrap).toBe(false);
        await player.triggerDungeonTrapChallenge(true);
        expect(prompt).toHaveBeenCalledTimes(1);
    });

    it('triggers undetected traps once with a plain restored character', async () => {
        window.skillChallengeManager.getSkillCheckContext.mockReturnValue({ passiveScore: 5 });
        await player.triggerDungeonTrapChallenge();
        expect(gameState.get('character.currentHP')).toBe(29);
        expect(tile).toMatchObject({ isTrap: false, trapDetected: true });
        await player.triggerDungeonTrapChallenge();
        expect(gameState.get('character.currentHP')).toBe(29);
        expect(prompt).not.toHaveBeenCalled();
    });

    it('blocks overlapping prompts and releases the guard after cancellation', async () => {
        let resolve;
        prompt.mockImplementation(() => new Promise(done => {
            resolve = done;
        }));
        const first = player.triggerDungeonTrapChallenge();
        await player.triggerDungeonTrapChallenge(true);
        expect(prompt).toHaveBeenCalledTimes(1);
        resolve({ attempted: false });
        await first;
        expect(player.trapChallengePending).toBe(false);
    });

    it('retains legacy exhausted avoidance when disabled', async () => {
        const enabled = RULES.dungeon.trapChoicesEnabled;
        try {
            RULES.dungeon.trapChoicesEnabled = false;
            await player.triggerDungeonTrapChallenge();
            expect(tile.isTrap).toBe(false);
        } finally {
            RULES.dungeon.trapChoicesEnabled = enabled;
        }
    });
});

describe('sparse trap persistence', () => {
    it('replays the initial automatic type selection draw after saving the selected type ID', async () => {
        const generator = new DungeonGenerator('trap-persistence-auto');
        generator.dungeonTypes = json('dungeonTypes').dungeonTypes;
        generator.roomTemplates = json('dungeonRooms').rooms;
        generator.terrainMap = Object.fromEntries(json('terrains').terrains.map(t => [t.id, t]));
        const feature = { x: 2, y: 3 };
        gameState.set('world.metadata', { features: [{ x: 2, y: 3 }] });
        gameState.set('dungeon.active', false);
        gameState.set('player.position', { x: 2, y: 3 });
        manager = new DungeonManager(generator, {});
        manager.getDungeonAtPlayerPosition = async () => feature;
        await manager.enterDungeon();
        manager.exitDungeon();
        const saved = JSON.parse(JSON.stringify(saveManager.serializeWorld(gameState.get('world'))));
        gameState.set('world.metadata', saved.metadata);
        // A region tile clone need not carry the marker; canonical metadata supplies it.
        const regenerated = { x: 2, y: 3, dungeonTypeId: feature.dungeonTypeId };
        manager.getDungeonAtPlayerPosition = async () => regenerated;
        await manager.enterDungeon();
        expect(regenerated.rooms).toEqual(feature.rooms);
    });

    it('consumes the same boss draw in fallback and eligible brackets without freezing boss identity', () => {
        const generator = new DungeonGenerator('trap-boss');
        const type = { bossPool: [{ id: 'late-boss', minLevel: 5, maxLevel: 10 }] };
        const early = { choice: vi.fn(values => values[0]) };
        const late = { choice: vi.fn(values => values[0]) };
        expect(generator.selectBoss(early, type, 1)).toBe('late-boss');
        expect(generator.selectBoss(late, type, 10)).toBe('late-boss');
        expect(early.choice).toHaveBeenCalledTimes(1);
        expect(late.choice).toHaveBeenCalledTimes(1);
    });

    it.each([true, false])('saves armed=%s in canonical metadata and restores after regeneration', armed => {
        manager.recordTrapState(0, 0, 0, armed);
        const saved = JSON.parse(JSON.stringify(saveManager.serializeWorld(gameState.get('world'))));
        gameState.set('world.metadata', saved.metadata);
        const regenerated = { x: 2, y: 3, rooms: [{ id: 'test-room', tiles: [[{ isTrap: false }]] }] };
        manager.restoreTrapStates(regenerated);
        expect(regenerated.rooms[0].tiles[0][0]).toMatchObject({ isTrap: armed,
            trapDetected: true, trapDC: 13, trapDamage: '1' });
        regenerated.rooms[0].id = 'different-room';
        regenerated.rooms[0].tiles[0][0] = { isTrap: false };
        manager.restoreTrapStates(regenerated);
        expect(regenerated.rooms[0].tiles[0][0].trapDetected).toBeUndefined();
    });

    it.each([1, 5, 10])('replays real seeded traps through exit and saved metadata at level %i', async level => {
        const generator = new DungeonGenerator('trap-persistence');
        generator.dungeonTypes = json('dungeonTypes').dungeonTypes;
        generator.roomTemplates = json('dungeonRooms').rooms;
        generator.terrainMap = Object.fromEntries(json('terrains').terrains.map(t => [t.id, t]));
        const canonical = { x: 2, y: 3, dungeonTypeId: generator.dungeonTypes[0].id };
        gameState.set('world.metadata', { features: [canonical] });
        gameState.set('character.level', level);
        const feature = { ...canonical };
        manager = new DungeonManager(generator, {});
        manager.getDungeonAtPlayerPosition = async () => feature;
        gameState.set('dungeon.active', false);
        gameState.set('player.position', { x: 2, y: 3 });
        await manager.enterDungeon();
        let source;
        feature.rooms.forEach((room, roomIndex) => room.tiles.forEach((row, y) => row.forEach((t, x) => {
            if (!source && t.isTrap) {
                source = { roomIndex, x, y };
            }
        })));
        expect(source).toBeDefined();
        manager.recordTrapState(source.roomIndex, source.x, source.y, true);
        manager.exitDungeon();
        const saved = JSON.parse(JSON.stringify(saveManager.serializeWorld(gameState.get('world'))));
        gameState.set('world.metadata', saved.metadata);
        const restored = { ...canonical, generated: false };
        manager.getDungeonAtPlayerPosition = async () => restored;
        await manager.enterDungeon();
        expect(restored.rooms[source.roomIndex].tiles[source.y][source.x])
            .toMatchObject({ isTrap: true, trapDetected: true });
        expect(manager.getEncounterLevel(level)).toBe(level);
    });

    it('keeps touched trap identity across level advancement without freezing boss selection', async () => {
        const generator = new DungeonGenerator('trap-persistence');
        generator.dungeonTypes = json('dungeonTypes').dungeonTypes;
        generator.roomTemplates = json('dungeonRooms').rooms;
        generator.terrainMap = Object.fromEntries(json('terrains').terrains.map(t => [t.id, t]));
        const type = generator.dungeonTypes[0];
        const feature = { x: 2, y: 3, dungeonTypeId: type.id };
        await generator.generateDungeon(feature, 1);
        gameState.set('world.metadata', { features: [{ x: 2, y: 3 }] });
        gameState.set('dungeon', { active: true, rooms: feature.rooms });
        manager.currentDungeon = feature;
        let source;
        feature.rooms.forEach((room, roomIndex) => room.tiles.forEach((row, y) => row.forEach((t, x) => {
            if (!source && t.isTrap) {
                source = { roomIndex, x, y };
            }
        })));
        manager.recordTrapState(source.roomIndex, source.x, source.y, true);
        const saved = JSON.parse(JSON.stringify(saveManager.serializeWorld(gameState.get('world'))));
        gameState.set('world.metadata', saved.metadata);
        const highLevel = { x: 2, y: 3, dungeonTypeId: type.id };
        const originalTrap = { ...feature.rooms[source.roomIndex].tiles[source.y][source.x] };
        await generator.generateDungeon(highLevel, 10);
        const actualBoss = highLevel.rooms.find(room => room.isBossRoom).boss;
        manager.restoreTrapStates(highLevel);
        expect(highLevel.rooms[source.roomIndex].tiles[source.y][source.x])
            .toMatchObject({ isTrap: true, trapDetected: true,
                trapDC: originalTrap.trapDC, trapDamage: originalTrap.trapDamage });
        expect(highLevel.rooms.find(room => room.isBossRoom).boss).toBe(actualBoss);
        expect(type.bossPool.filter(b => 10 >= (b.minLevel || 1) && 10 <= (b.maxLevel || 10))
            .map(b => b.id)).toContain(actualBoss);
    });
});
