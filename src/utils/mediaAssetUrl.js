const MEDIA_PREFIXES = ['data/graphics/combat/', 'data/audio/local/'];

/** Keep source-tree URLs working locally while release builds route bulky media off SWA. */
export function mediaAssetUrl(path) {
    if (!MEDIA_PREFIXES.some(prefix => path.startsWith(prefix))) {
        return path;
    }

    const release = globalThis.__NEXUS_VERGE_MEDIA__;
    if (!release) {
        return path;
    }
    if (!release.paths.includes(path)) {
        throw new Error(`Unpublished media asset: ${path}`);
    }
    return new URL(path, release.baseUrl).href;
}

/** Null means the source-tree dev server has no generated media manifest. */
export function publishedMediaExists(path) {
    const release = globalThis.__NEXUS_VERGE_MEDIA__;
    return release ? release.paths.includes(path) : null;
}
