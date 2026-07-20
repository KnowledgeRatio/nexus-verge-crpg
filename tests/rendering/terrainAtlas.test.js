import { describe, expect, it } from 'vitest';
import {
    ATLAS_WRAP_MODES,
    getAtlasSampleRect,
    positiveModulo,
    shouldOverlayTerrainTransition,
    transitionNoise
} from '../../src/rendering/terrainAtlas.js';

describe('terrain atlas sampling', () => {
    it('maps adjacent world tiles to adjacent atlas cells', () => {
        const first = getAtlasSampleRect({
            imageWidth: 1024,
            imageHeight: 1024,
            worldX: 3,
            worldY: 5,
            atlasTilesAcross: 16
        });
        const next = getAtlasSampleRect({
            imageWidth: 1024,
            imageHeight: 1024,
            worldX: 4,
            worldY: 5,
            atlasTilesAcross: 16
        });

        expect(first).toEqual({
            sourceX: 192,
            sourceY: 320,
            sourceWidth: 64,
            sourceHeight: 64,
            flipX: false,
            flipY: false
        });
        expect(next.sourceX).toBe(first.sourceX + first.sourceWidth);
        expect(next.sourceY).toBe(first.sourceY);
    });

    it('mirror-wraps atlas boundaries without a pixel discontinuity', () => {
        const sample = getAtlasSampleRect({
            imageWidth: 1024,
            imageHeight: 1024,
            worldX: 16,
            worldY: -1,
            atlasTilesAcross: 16,
            wrapMode: ATLAS_WRAP_MODES.MIRROR
        });

        expect(sample.sourceX).toBe(960);
        expect(sample.sourceY).toBe(0);
        expect(sample.flipX).toBe(true);
        expect(sample.flipY).toBe(true);
    });

    it('wraps after traversing the complete atlas', () => {
        const wrapped = getAtlasSampleRect({
            imageWidth: 1024,
            imageHeight: 1024,
            worldX: 16,
            worldY: 16,
            atlasTilesAcross: 16
        });

        expect(wrapped.sourceX).toBe(0);
        expect(wrapped.sourceY).toBe(0);
    });

    it('supports negative world coordinates deterministically', () => {
        const sample = getAtlasSampleRect({
            imageWidth: 1024,
            imageHeight: 512,
            worldX: -1,
            worldY: -2,
            atlasTilesAcross: 16,
            atlasTilesDown: 8
        });

        expect(sample.sourceX).toBe(960);
        expect(sample.sourceY).toBe(384);
    });

    it('supports non-square atlas grids', () => {
        const sample = getAtlasSampleRect({
            imageWidth: 1200,
            imageHeight: 800,
            worldX: 11,
            worldY: 7,
            atlasTilesAcross: 12,
            atlasTilesDown: 8
        });

        expect(sample).toEqual({
            sourceX: 1100,
            sourceY: 700,
            sourceWidth: 100,
            sourceHeight: 100,
            flipX: false,
            flipY: false
        });
    });

    it('uses deterministic transition noise', () => {
        const value = transitionNoise(-4, 12, 'right', 2, 4);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
        expect(transitionNoise(-4, 12, 'right', 2, 4)).toBe(value);
        expect(transitionNoise(-4, 12, 'right', 3, 4)).not.toBe(value);
    });

    it('joins transition boundaries across adjacent tiles', () => {
        const lowerEdge = transitionNoise(5, 8, 'right', 4, 4);
        const nextTileEdge = transitionNoise(5, 9, 'right', 0, 4);
        expect(nextTileEdge).toBe(lowerEdge);
    });

    it('overlays only higher-priority materials in the same transition group', () => {
        const grassland = {
            id: 'grassland',
            visual: { mode: 'continuousAtlas', transitionGroup: 'natural', transitionPriority: 10 }
        };
        const forest = {
            id: 'forest',
            visual: { mode: 'continuousAtlas', transitionGroup: 'natural', transitionPriority: 20 }
        };
        const water = {
            id: 'water',
            visual: { mode: 'continuousAtlas', transitionGroup: 'water', transitionPriority: 30 }
        };

        expect(shouldOverlayTerrainTransition(grassland, forest)).toBe(true);
        expect(shouldOverlayTerrainTransition(forest, grassland)).toBe(false);
        expect(shouldOverlayTerrainTransition(grassland, water)).toBe(false);
        expect(shouldOverlayTerrainTransition(grassland, grassland)).toBe(false);
    });

    it('rejects invalid dimensions instead of producing invalid draw coordinates', () => {
        expect(positiveModulo(1, 0)).toBeNull();
        expect(getAtlasSampleRect({
            imageWidth: 0,
            imageHeight: 1024,
            worldX: 0,
            worldY: 0,
            atlasTilesAcross: 16
        })).toBeNull();
    });
});
