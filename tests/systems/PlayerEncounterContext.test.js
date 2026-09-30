import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
vi.mock('../../src/systems/AudioManager.js', () => ({ default: { play: vi.fn() } }));
vi.mock('../../src/systems/EncounterBuilder.js', () => ({ buildEncounter: vi.fn() }));
import Player from '../../src/systems/Player.js';
import { DungeonManager } from '../../src/systems/DungeonManager.js';
import { buildEncounter } from '../../src/systems/EncounterBuilder.js';
import { gameState } from '../../src/core/GameState.js';
import { combatSceneConfig } from '../../src/ui/CombatPresentation.js';
import { RULES } from '../../src/core/rulesEngine.js';

const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url)));
const config = read('combatScene');
const terrains = read('terrains').terrains;
const keys = ['character', 'world', 'worldConfig', 'dungeon', 'combat', 'ui', 'player'];
let saved;
beforeEach(() => {
    saved = Object.fromEntries(keys.map(key => [key, gameState.get(key)]));
    gameState.set('character', { level: 5 });
    gameState.set('world', { currentLocation: { x: 4, y: 7 } });
    gameState.set('worldConfig', { difficulty: 'normal', campaignId: 'core' });
    gameState.set('ui', {});
    buildEncounter.mockResolvedValue({ monsters: [{ name: 'Bandit', monsterId: 'bandit' }] });
});
afterEach(() => {
    keys.forEach(key => gameState.set(key, saved[key]));
    vi.clearAllMocks();
});

function player() {
    return Object.assign(Object.create(Player.prototype), {
        worldGenerator: { getTile: vi.fn().mockResolvedValue({ terrain: 'forest' }) },
        dungeonManager: new DungeonManager(null, null)
    });
}

describe('Challenge combat scenery context', () => {
    it.each(terrains.filter(terrain => terrain.traversable && terrain.encounterModifier > 0 &&
        !terrain.id.startsWith('dungeon')))(
        'carries $id through the random encounter check into its explicit combat scene', async terrain => {
            gameState.set('dungeon', { active: false });
            gameState.set('player', { encounterAccumulator: RULES.movement.encounterAccumulatorThreshold });
            const subject = player();
            const trigger = vi.spyOn(subject, 'triggerCombatEncounter');
            const random = vi.spyOn(Math, 'random').mockReturnValue(0);
            try {
                subject.checkForEncounters({ terrain: terrain.id }, terrain);
                expect(trigger).toHaveBeenCalledOnce();
                await trigger.mock.results[0].value;
                const pending = gameState.get('ui.pendingCombat');
                expect(pending).toMatchObject({ context: 'overworld', terrainId: terrain.id });
                expect(buildEncounter).toHaveBeenCalledWith(expect.objectContaining({ terrain: terrain.id }));
                const scene = combatSceneConfig(config, pending);
                expect([config.sceneSelection.terrains[terrain.id]].flat()).toContain(scene.activeScene);
                expect(scene.artAssets.models[scene.artAssets.environment].url).toBeDefined();
                expect(gameState.get('player.encounterAccumulator')).toBe(0);
            } finally {
                random.mockRestore(); trigger.mockRestore();
            }
        });

    it('does not introduce random encounters in safe terrain to justify its scene', () => {
        const subject = player();
        const trigger = vi.spyOn(subject, 'triggerCombatEncounter');
        gameState.set('player', { encounterAccumulator: RULES.movement.encounterAccumulatorThreshold });
        for (const terrain of terrains.filter(entry => entry.encounterModifier === 0)) {
            subject.checkForEncounters({ terrain: terrain.id }, terrain);
        }
        expect(trigger).not.toHaveBeenCalled();
        trigger.mockRestore();
    });

    it.each(terrains.filter(terrain => terrain.traversable && terrain.id.startsWith('dungeon')))(
        'carries $id through the dungeon random encounter path, including restored tiles', async terrain => {
            const subject = player();
            gameState.set('dungeon', JSON.parse(JSON.stringify({ active: true, dungeonTypeId: 'tomb',
                currentRoomIndex: 0, playerPosition: { x: 0, y: 0 },
                rooms: [{ encounterChance: 1, tiles: [[{ terrain }]] }] })));
            subject.generateDungeonEnemy = vi.fn().mockResolvedValue({ name: 'Skeleton', monsterId: 'skeleton' });
            const random = vi.spyOn(Math, 'random').mockReturnValue(0);
            try {
                await subject.checkForDungeonEncounter();
                const pending = gameState.get('ui.pendingCombat');
                expect(pending).toMatchObject({ context: 'dungeon', terrainId: terrain.id, dungeonTypeId: 'tomb' });
                expect(pending.enemies.length).toBeGreaterThan(0);
                expect(combatSceneConfig(config, pending).activeScene)
                    .toBe(config.sceneSelection.dungeonTerrains[terrain.id]);
            } finally {
                random.mockRestore();
            }
        });
    it('uses the town scene for forced guard combat even though town has no random encounters', async () => {
        gameState.set('dungeon', { active: false });
        const subject = player();
        subject.worldGenerator.getTile.mockResolvedValue({ terrain: 'town' });
        await subject.triggerCombatFromChallenge(['bandit']);
        const pending = gameState.get('ui.pendingCombat');
        expect(pending.terrainId).toBe('town');
        expect(combatSceneConfig(config, pending).activeScene).toBe('settlement');
        expect(terrains.find(terrain => terrain.id === 'town').encounterModifier).toBe(0);
    });

    it('captures dungeon scenery before asynchronous generation can observe a changed room', async () => {
        const subject = player();
        gameState.set('dungeon', { active: true, dungeonTypeId: 'tomb', currentRoomIndex: 0,
            playerPosition: { x: 0, y: 0 }, rooms: [{ tiles: [[{ terrain: { id: 'dungeonAltar' } }]] }] });
        buildEncounter.mockImplementationOnce(async () => {
            gameState.set('dungeon', { active: false });
            return { monsters: [{ name: 'Bandit' }] };
        });
        await subject.triggerCombatEncounter({ id: 'forest' }, ['bandit']);
        expect(gameState.get('ui.pendingCombat')).toMatchObject({ context: 'dungeon', terrainId: 'dungeonAltar' });
    });
    it.each(terrains.filter(terrain => terrain.traversable && terrain.id.startsWith('dungeon')))(
        'keeps restored $id scenery when a dungeon challenge becomes combat', async terrain => {
            gameState.set('dungeon', JSON.parse(JSON.stringify({ active: true, dungeonTypeId: 'tomb',
                currentRoomIndex: 0, playerPosition: { x: 0, y: 0 }, rooms: [{ tiles: [[{ terrain }]] }] })));
            await player().triggerCombatFromChallenge(['bandit']);
            const pending = gameState.get('ui.pendingCombat');
            expect(pending).toMatchObject({ context: 'dungeon', terrainId: terrain.id, dungeonTypeId: 'tomb' });
            expect(combatSceneConfig(config, pending).activeScene)
                .toBe(config.sceneSelection.dungeonTerrains[terrain.id]);
            // The existing generator receives the actual world-tile ID and requested enemies.
            expect(buildEncounter).toHaveBeenCalledWith(expect.objectContaining({
                monsterPool: ['bandit'], terrain: 'forest', context: 'overworld'
            }));
        });

    it.each([1, 5, 10])('keeps overworld terrain and the requested enemies at level %s', async level => {
        gameState.set('character', { level }); gameState.set('dungeon', { active: false });
        await player().triggerCombatFromChallenge(['wolf']);
        const pending = gameState.get('ui.pendingCombat');
        expect(pending).toMatchObject({ context: 'overworld', terrainId: 'forest' });
        expect(combatSceneConfig(config, pending).activeScene).toBe('woodland');
        expect(buildEncounter).toHaveBeenCalledWith(expect.objectContaining({ partyLevel: level, monsterPool: ['wolf'] }));
    });
});
