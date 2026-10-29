import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import MapRenderer from '../../src/rendering/MapRenderer.js';
import { DungeonUI } from '../../src/ui/DungeonUI.js';
import { drawIcon, iconId } from '../../src/ui/Iconography.js';

vi.mock('../../src/ui/Iconography.js', async importOriginal => ({
    ...await importOriginal(), drawIcon: vi.fn()
}));

afterEach(() => vi.clearAllMocks());

const context = () => ({ fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn() });

describe('Shared map iconography', () => {
    it('draws every semantic terrain fallback without printing its identifier', () => {
        const terrains = JSON.parse(readFileSync(new URL('../../data/terrains.json', import.meta.url))).terrains;
        const ctx = context();
        const renderer = Object.assign(Object.create(MapRenderer.prototype), {
            ctx, config: { tileWidth: 16, tileHeight: 16, font: '16px monospace' }
        });
        for (const terrain of terrains.filter(t => t.symbol.includes('.'))) {
            if (terrain.symbol === '.') {
                continue;
            }
            expect(iconId(terrain.symbol, null), terrain.id).toBeTruthy();
            renderer.drawTile(2, 3, terrain.symbol, terrain.color);
            expect(drawIcon.mock.lastCall[1]).toBe(iconId(terrain.symbol, null));
        }
        expect(ctx.fillText).not.toHaveBeenCalled();
        renderer.drawTile(2, 3, '~', '#ffffff');
        expect(ctx.fillText).toHaveBeenCalledWith('~', 40, 56);
    });

    it('uses library symbols for dungeon furnishings and the same boss/entrance legend', () => {
        const ctx = context();
        const dungeon = Object.assign(Object.create(DungeonUI.prototype), { ctx });
        for (const feature of ['chest', 'altar', 'fountain', 'statue', 'brazier', 'bookshelf',
            'bed', 'table', 'barrel', 'crate', 'bones', 'web', 'mushroom']) {
            dungeon.renderFeatureIcon(0, 0, 16, feature);
            expect(drawIcon.mock.lastCall[1]).toBe(iconId(`object.${feature}`, null));
        }
        const canvas = { getContext: () => ctx };
        dungeon.renderMinimap(canvas, { rooms: [{ isEntrance: true }, { isBossRoom: true }],
            roomsExplored: [0, 1], currentRoomIndex: 0 });
        expect(drawIcon.mock.calls.filter(call => call[1] === 'map.entrance')).toHaveLength(2);
        expect(drawIcon.mock.calls.filter(call => call[1] === 'map.boss')).toHaveLength(2);
        expect(ctx.fillText.mock.calls.map(call => call[0])).toEqual(['Entrance', 'Boss']);
    });

    it('preserves original painted POI art after discovery', () => {
        const image = {};
        const renderer = Object.assign(Object.create(MapRenderer.prototype), {
            terrainTypes: [{ id: 'cave', symbol: 'map.dungeon', color: '#ffffff' }],
            getTileImage: vi.fn(() => image), getTerrainImageOptions: vi.fn(() => ({})),
            drawImageTile: vi.fn(), drawTile: vi.fn(), drawRevealStateBadge: vi.fn(),
            drawProvisioningBadge: vi.fn()
        });
        for (const type of ['dungeon', 'sanctuary']) {
            renderer.renderFeature(0, 0, { type, originalPoiType: 'cave' }, true, 1, 1);
            expect(renderer.getTileImage).toHaveBeenLastCalledWith('cave');
            expect(renderer.drawImageTile).toHaveBeenCalledWith(0, 0, image, 1, {});
        }
        expect(renderer.drawTile).not.toHaveBeenCalled();
    });
});
