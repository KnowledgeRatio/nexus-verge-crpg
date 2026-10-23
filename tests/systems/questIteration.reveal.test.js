import { describe, expect, it } from 'vitest';
import { gameState } from '../../src/core/GameState.js';
import WorldGenerator from '../../src/systems/WorldGenerator.js';

describe('persistent quest location reveal consumer', () => {
    it('restores only explicitly revealed coordinates after region replacement', () => {
        gameState.reset();
        gameState.set('world.modifiedTiles', [{ x: 12, y: -8, explored: true }, { x: 13, y: -8, tag: 'safer' }]);
        const generator = Object.create(WorldGenerator.prototype);
        const restored = { tiles: [
            { x: 12, y: -8, explored: false, feature: { explored: false } },
            { x: 13, y: -8, explored: false }
        ] };
        generator.restoreRevealedLocations(restored);
        expect(restored.tiles[0].explored).toBe(true);
        expect(restored.tiles[0].feature.explored).toBe(true);
        expect(restored.tiles[1].explored).toBe(false);
    });
});
