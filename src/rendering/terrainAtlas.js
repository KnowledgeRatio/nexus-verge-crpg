export const TERRAIN_RENDER_MODES = Object.freeze({
    LEGACY_TILE: 'legacyTile',
    CONTINUOUS_ATLAS: 'continuousAtlas',
    AUTOTILE: 'autotile',
    LANDMARK: 'landmark'
});

export const ATLAS_WRAP_MODES = Object.freeze({
    REPEAT: 'repeat',
    MIRROR: 'mirror'
});

/**
 * JavaScript's remainder operator preserves the sign of the dividend. World
 * coordinates can be negative, so atlas lookup needs a true positive modulo.
 */
export function positiveModulo(value, divisor) {
    if (!Number.isFinite(value) || !Number.isFinite(divisor) || divisor <= 0) {
        return null;
    }
    return ((value % divisor) + divisor) % divisor;
}

function resolveAtlasIndex(coordinate, count, wrapMode) {
    if (wrapMode !== ATLAS_WRAP_MODES.MIRROR) {
        return {
            index: positiveModulo(Math.floor(coordinate), count),
            flipped: false
        };
    }

    const period = count * 2;
    const position = positiveModulo(Math.floor(coordinate), period);
    if (position < count) {
        return { index: position, flipped: false };
    }
    return {
        index: period - position - 1,
        flipped: true
    };
}

/**
 * Map a world coordinate to one cell of a continuous terrain atlas.
 *
 * The complete atlas represents atlasTilesAcross x atlasTilesDown world tiles.
 * Adjacent world coordinates therefore sample adjacent source rectangles; the
 * atlas repeats only after the full sheet has been traversed.
 */
export function getAtlasSampleRect({
    imageWidth,
    imageHeight,
    worldX,
    worldY,
    atlasTilesAcross,
    atlasTilesDown = atlasTilesAcross,
    wrapMode = ATLAS_WRAP_MODES.REPEAT
}) {
    const dimensions = [imageWidth, imageHeight, atlasTilesAcross, atlasTilesDown];
    if (dimensions.some(value => !Number.isFinite(value) || value <= 0)) {
        return null;
    }
    if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) {
        return null;
    }

    const columns = Math.max(1, Math.floor(atlasTilesAcross));
    const rows = Math.max(1, Math.floor(atlasTilesDown));
    const column = resolveAtlasIndex(worldX, columns, wrapMode);
    const row = resolveAtlasIndex(worldY, rows, wrapMode);
    const sourceWidth = imageWidth / columns;
    const sourceHeight = imageHeight / rows;

    return {
        sourceX: column.index * sourceWidth,
        sourceY: row.index * sourceHeight,
        sourceWidth,
        sourceHeight,
        flipX: column.flipped,
        flipY: row.flipped
    };
}

/**
 * A deterministic 0..1 value for an atlas boundary control point. Visual-only
 * variation is coordinate-derived, so it never affects saves or gameplay RNG.
 */
export function transitionNoise(worldX, worldY, side, pointIndex, segments) {
    const vertical = side === 'left' || side === 'right';
    const edgeX = vertical
        ? worldX + (side === 'right' ? 1 : 0)
        : worldX * segments + pointIndex;
    const edgeY = vertical
        ? worldY * segments + pointIndex
        : worldY + (side === 'bottom' ? 1 : 0);
    const axisSalt = vertical ? 23 : 47;
    let value = Math.imul(edgeX + axisSalt, 374761393);
    value = Math.imul(value ^ (edgeY * 668265263), 1274126177);
    value ^= value >>> 16;
    return (value >>> 0) / 4294967295;
}

export function shouldOverlayTerrainTransition(currentTerrain, neighborTerrain) {
    const currentVisual = currentTerrain?.visual;
    const neighborVisual = neighborTerrain?.visual;
    if (currentTerrain?.id === neighborTerrain?.id) {
        return false;
    }
    if (currentVisual?.mode !== TERRAIN_RENDER_MODES.CONTINUOUS_ATLAS ||
        neighborVisual?.mode !== TERRAIN_RENDER_MODES.CONTINUOUS_ATLAS) {
        return false;
    }
    if (!currentVisual.transitionGroup || currentVisual.transitionGroup !== neighborVisual.transitionGroup) {
        return false;
    }
    return (neighborVisual.transitionPriority || 0) > (currentVisual.transitionPriority || 0);
}
