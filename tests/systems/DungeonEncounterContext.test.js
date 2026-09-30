import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DungeonManager } from '../../src/systems/DungeonManager.js';
import { gameState } from '../../src/core/GameState.js';
import { combatSceneConfig } from '../../src/ui/CombatPresentation.js';

const terrains = JSON.parse(readFileSync(new URL('../../data/terrains.json', import.meta.url))).terrains;
const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
const previous = gameState.get('dungeon');
afterEach(() => gameState.set('dungeon', previous));

describe('Dungeon encounter scenery metadata', () => {
    it.each(terrains.filter(tile => tile.id.startsWith('dungeon') && tile.traversable))(
        'preserves the actual $id tile after save/load, including zero-modifier tiles', terrain => {
            const manager = new DungeonManager(null, null);
            gameState.set('dungeon', JSON.parse(JSON.stringify({
                active: true, dungeonTypeId: 'tomb', currentRoomIndex: 1,
                playerPosition: { x: 1, y: 0 },
                rooms: [{ tiles: [[{ terrain: { id: 'dungeonFloor' } }]] },
                    { tiles: [[{ terrain: { id: 'dungeonWall' } }, { terrain }]] }]
            })));
            expect(manager.getEncounterContext()).toEqual({
                context: 'dungeon', dungeonTypeId: 'tomb', terrainId: terrain.id
            });
            // A newly authored dungeon variant is selected for random and boss combat alike.
            const authored = { ...config, sceneSelection: { ...config.sceneSelection,
                dungeonTerrains: { [terrain.id]: 'temple' } } };
            for (const isBossFight of [false, true]) {
                expect(combatSceneConfig(authored, { ...manager.getEncounterContext(), isBossFight })
                    .activeScene).toBe('temple');
            }
        });

    it('falls back to the dungeon scene when restored location data is unavailable', () => {
        const manager = new DungeonManager(null, null);
        gameState.set('dungeon', { active: true, dungeonTypeId: 'tomb', rooms: [] });
        expect(manager.getEncounterContext().terrainId).toBeUndefined();
        expect(combatSceneConfig(config, manager.getEncounterContext()).activeScene).toBe('dungeon');
    });

    it('keeps overworld and dungeon mappings separate and permits explicit study selection', () => {
        const authored = { ...config, sceneSelection: { ...config.sceneSelection,
            dungeonTerrains: { dungeonAltar: 'temple' } } };
        expect(combatSceneConfig(authored, { context: 'overworld', terrainId: 'dungeonAltar' })
            .activeScene).toBe('waystation');
        expect(combatSceneConfig(authored, { context: 'dungeon', terrainId: 'forest' })
            .activeScene).toBe('dungeon');
        expect(combatSceneConfig(authored, { context: 'dungeon', terrainId: 'dungeonAltar', sceneId: 'ruins' })
            .activeScene).toBe('ruins');
    });
});
