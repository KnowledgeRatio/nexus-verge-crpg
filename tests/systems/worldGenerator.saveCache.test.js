import { describe, it, expect } from 'vitest';
import WorldGenerator from '../../src/systems/WorldGenerator.js';

describe('Saved world road lookup', () => {
    it('rebuilds the derived road cache after a JSON save round trip', () => {
        const world = new WorldGenerator('road-save');
        world.worldMetadata = {
            generated: true,
            roads: [{ path: [{ x: 2, y: 3 }, { x: 3, y: 3 }] }]
        };
        expect(world.isRoadTile(2, 3)).toBe(true);
        world.worldMetadata = JSON.parse(JSON.stringify(world.worldMetadata));
        expect(world.isRoadTile(3, 3)).toBe(true);
        expect(world.isRoadTile(4, 3)).toBe(false);
    });
});
