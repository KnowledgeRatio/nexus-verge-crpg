import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ATLAS_WRAP_MODES, TERRAIN_RENDER_MODES } from '../../src/rendering/terrainAtlas.js';

const testsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testsDir, '../..');
const terrainData = JSON.parse(readFileSync(join(repoRoot, 'data/terrains.json'), 'utf8'));

describe('terrain visual data', () => {
    it('keeps every terrain image reference explicit', () => {
        for (const terrain of terrainData.terrains) {
            expect(terrain).toHaveProperty('tileImage');
        }
    });

    it('provides complete continuous-atlas metadata and existing assets', () => {
        const atlasTerrains = terrainData.terrains.filter(
            terrain => terrain.visual?.mode === TERRAIN_RENDER_MODES.CONTINUOUS_ATLAS
        );
        expect(atlasTerrains.length).toBeGreaterThan(0);

        for (const terrain of atlasTerrains) {
            expect(terrain.imageDescription).toBeTruthy();
            expect(terrain.visual.atlasTilesPerSide).toBeGreaterThan(0);
            expect(Object.values(ATLAS_WRAP_MODES)).toContain(terrain.visual.atlasWrapMode);
            expect(terrain.visual.transitionGroup).toBeTruthy();
            expect(Number.isFinite(terrain.visual.transitionPriority)).toBe(true);
            expect(existsSync(join(repoRoot, 'data/graphics', terrain.tileImage))).toBe(true);
        }
    });
});
