import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/systems/AudioManager.js', () => ({ default: { play: vi.fn(), playCombatSound: vi.fn() } }));

import { gameState } from '../../src/core/GameState.js';
import { Character } from '../../src/systems/Character.js';
import { CombatManager } from '../../src/systems/CombatManager.js';
import { DungeonManager } from '../../src/systems/DungeonManager.js';
import { DungeonGenerator } from '../../src/systems/DungeonGenerator.js';
import { createEnemyFromMonster } from '../../src/systems/EncounterBuilder.js';

const classes = JSON.parse(readFileSync(new URL('../../data/classes.json', import.meta.url))).classes;
const monsters = JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url))).monsters;
const monster = monsters.find(entry => entry.id === 'goblin');
const rooms = () => [{ connections: [1], playerSpawn: { x: 1, y: 1 } },
    { connections: [0], isBossRoom: true, boss: monster.id, playerSpawn: { x: 1, y: 1 } }];
let dungeonManager;

beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const feature = { type: 'dungeon', x: 4, y: 9, generated: true, rooms: rooms() };
    gameState.set('world.metadata', { features: [feature, { type: 'dungeon', x: 5, y: 9, rooms: rooms() }] });
    gameState.set('player.position', { x: 4, y: 9 });
    gameState.set('dungeon', { active: true, worldMapPosition: { x: 4, y: 9 }, rooms: rooms(),
        currentRoomIndex: 1, roomsExplored: [0, 1], playerPosition: { x: 1, y: 1 }, bossDefeated: false });
    gameState.set('fatigue', { current: 0, exhaustionLevels: 0 });
    dungeonManager = new DungeonManager(null, null);
    dungeonManager.currentDungeon = feature;
    globalThis.window = { game: { dungeonManager }, questManager: {
        onCreatureKilled: vi.fn(), onQuestEncounterVictory: vi.fn(), onItemAcquired: vi.fn(),
        onRoomEntered: vi.fn() } };
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

async function combat(level, source, plain = false) {
    let player = new Character({ name: 'Knight', level,
        class: classes.find(entry => entry.id === 'dedication'), species: {}, background: {},
        baseAbilities: { prowess: 15, intuition: 13, resilience: 15, composure: 10, intellect: 10, presence: 10 },
        equipment: { mainHand: null, offHand: null, armor: null } });
    if (plain) {
        player = JSON.parse(JSON.stringify(player));
    }
    gameState.set('character', player);
    const manager = new CombatManager();
    // Isolate provenance from asset loading and automatic enemy-turn timers, retaining real combatants.
    vi.spyOn(manager, 'loadWeaponMasteryData').mockResolvedValue();
    vi.spyOn(manager, 'startTurn').mockImplementation(() => {});
    await manager.startCombat(player, [createEnemyFromMonster(monster, { isBoss: true })], [], source);
    return manager;
}

describe('actual combat provenance and persistent occupation consumer', () => {
    it('predicts virgin-site type without mutation, matching real seeded dungeon generation', async () => {
        const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url)));
        const generator = new DungeonGenerator('quest-type-proof');
        generator.dungeonTypes = read('dungeonTypes').dungeonTypes;
        generator.roomTemplates = read('dungeonRooms').rooms;
        generator.terrains = read('terrains').terrains;
        generator.terrainMap = Object.fromEntries(generator.terrains.map(terrain => [terrain.id, terrain]));
        generator.dataLoaded = true;
        const manager = new DungeonManager(generator, null);
        for (let x = 0; x < 12; x++) {
            const feature = { x, y: 7, type: 'dungeon' };
            const before = JSON.stringify(feature);
            const predicted = manager.getQuestDungeonType(feature);
            expect(JSON.stringify(feature)).toBe(before);
            expect(manager.getQuestDungeonType(feature)).toBe(predicted);
            await generator.generateDungeon(feature, 1);
            expect(feature.dungeonType.id).toBe(predicted.id);
        }
        expect(manager.getQuestDungeonType({ x: 0, y: 7, dungeonTypeId: 'invalid-type' })).toBeNull();
    });

    it.each([1, 5, 10])('credits only captured victory at level %s and persists the exact witness', async level => {
        const source = dungeonManager.getQuestEncounterSource(monster.id);
        const expected = { ...source };
        const manager = await combat(level, source, level === 5);
        source.siteId = '5,9'; // Caller mutation cannot redirect the recorded encounter.
        gameState.set('player.position', { x: 5, y: 9 });
        manager.enemyCombatants.forEach(enemy => {
            enemy.hp = 0;
        });
        manager.endCombat('victory');
        expect(window.questManager.onQuestEncounterVictory).toHaveBeenCalledExactlyOnceWith(expected);
        expect(window.questManager.onCreatureKilled).toHaveBeenCalledWith(monster.id, { x: 4, y: 9 });
        expect(gameState.get('world.metadata').features[0].questEncounterVictories).toEqual([expected]);
        expect(dungeonManager.canClearQuestEncounter(expected)).toBe(true);
        expect(dungeonManager.clearQuestEncounter(expected, 'quest-1', 'clear')).toBe(true);
        expect(dungeonManager.clearQuestEncounter(expected, 'quest-1', 'clear')).toBe(false);
        expect(dungeonManager.canClearQuestEncounter({ ...expected, siteId: '5,9', encounterKey: '5,9:boss' })).toBe(false);
    });

    it.each(['fled', 'defeat'])('%s does not produce victory proof or remove occupation', async result => {
        const source = dungeonManager.getQuestEncounterSource(monster.id);
        const manager = await combat(1, source);
        manager.endCombat(result);
        expect(window.questManager.onQuestEncounterVictory).not.toHaveBeenCalled();
        expect(dungeonManager.canClearQuestEncounter(source)).toBe(false);
        expect(gameState.get('dungeon.bossDefeated')).toBe(false);
    });

    it('does not treat damage or an unsupported victory notification as encounter defeat', async () => {
        const source = dungeonManager.getQuestEncounterSource(monster.id);
        const manager = await combat(1, source);
        manager.enemyCombatants[0].hp = 1;
        manager.endCombat('victory');
        expect(window.questManager.onQuestEncounterVictory).not.toHaveBeenCalled();
        expect(dungeonManager.canClearQuestEncounter(source)).toBe(false);
        expect(gameState.get('dungeon.bossDefeated')).toBe(false);
    });

    it('keeps captured victory with its original site when dungeon position changes during combat', async () => {
        const source = dungeonManager.getQuestEncounterSource(monster.id);
        const manager = await combat(1, source);
        gameState.set('dungeon.worldMapPosition', { x: 5, y: 9 });
        manager.enemyCombatants[0].hp = 0;
        manager.endCombat('victory');
        expect(dungeonManager.canClearQuestEncounter(source)).toBe(true);
        expect(gameState.get('world.metadata').features[1].questEncounterVictories).toBeUndefined();
        expect(gameState.get('dungeon.bossDefeated')).toBe(false);
    });

    it('same-species unrelated combat and visiting a boss room provide no source proof', async () => {
        const manager = await combat(1, null);
        manager.enemyCombatants.forEach(enemy => {
            enemy.hp = 0;
        });
        manager.endCombat('victory');
        expect(window.questManager.onQuestEncounterVictory).not.toHaveBeenCalled();
        expect(gameState.get('world.metadata').features[0].questEncounterVictories).toBeUndefined();
        gameState.set('dungeon.bossDefeated', false);
        expect(dungeonManager.getQuestEncounterSource('unspawned-monster')).toBeNull();
        gameState.set('dungeon.currentRoomIndex', 0);
        expect(dungeonManager.getQuestEncounterSource(monster.id)).toBeNull();
    });

    it('suppresses only the bound boss slot after save/load and level-scaled regeneration', async () => {
        const source = dungeonManager.getQuestEncounterSource(monster.id);
        dungeonManager.markBossDefeated(source);
        expect(dungeonManager.clearQuestEncounter(source, 'quest-1', 'clear')).toBe(true);
        const restored = JSON.parse(JSON.stringify(gameState.get('world.metadata')));
        gameState.set('world.metadata', restored);
        dungeonManager.exitDungeon();
        const feature = { ...restored.features[0], generated: false, rooms: undefined };
        const generator = { generateDungeon: vi.fn(async target => {
            target.generated = true;
            target.rooms = rooms();
            target.rooms[1].boss = 'ogre'; // The same occupied slot can scale on regeneration.
        }) };
        const world = { getTile: vi.fn(async () => ({ feature })) };
        const fresh = new DungeonManager(generator, world);
        gameState.set('character', { level: 10 });
        await fresh.enterDungeon();
        expect(gameState.get('dungeon.bossDefeated')).toBe(true);
        expect(fresh.moveToRoom(1).bossFight).toBe(false);
        expect(gameState.get('dungeon.rooms')[1].boss).toBe('ogre');
        expect(restored.features[1].questEncounterClears).toBeUndefined();
        expect(gameState.get('dungeon.rooms')[0]).toEqual(rooms()[0]);
    });

    it('never injects new source-bound recovery from boss room entry or victory, preserving legacy saves', () => {
        gameState.set('character', { inventory: [] });
        const feature = gameState.get('world.metadata').features[0];
        feature.questBind = { bindType: 'retrieve', itemId: 'rope', itemName: 'Rope', sourceId: 'goods-1' };
        dungeonManager._injectQuestBind(4, 9);
        dungeonManager.markBossDefeated(dungeonManager.getQuestEncounterSource(monster.id));
        expect(gameState.get('character.inventory')).toEqual([]);
        expect(window.questManager.onItemAcquired).not.toHaveBeenCalled();
        delete feature.questBind.sourceId;
        dungeonManager._injectQuestBind(4, 9);
        dungeonManager._injectQuestBind(4, 9);
        expect(gameState.get('character.inventory')).toHaveLength(1);
        expect(window.questManager.onItemAcquired).toHaveBeenCalledExactlyOnceWith('rope');
    });
});
