/* global fetch, AbortSignal */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import console from 'node:console';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lockFile = process.env.WEB_MEDIA_LOCK;
const origin = process.env.WEB_MEDIA_ORIGIN;
if (!lockFile || !origin) {
    throw new Error('Set WEB_MEDIA_LOCK and WEB_MEDIA_ORIGIN');
}
const base = new URL(`releases/`, origin.endsWith('/') ? origin : `${origin}/`);
if (base.protocol !== 'https:' && !(base.protocol === 'http:' &&
    ['localhost', '127.0.0.1'].includes(base.hostname))) {
    throw new Error('WEB_MEDIA_ORIGIN must use HTTPS (or localhost HTTP for testing)');
}
const manifest = JSON.parse(await readFile(path.resolve(root, lockFile), 'utf8'));
if (manifest.schemaVersion !== 1 || !/^[\w.-]+$/.test(manifest.releaseId) ||
    !manifest.assets || typeof manifest.assets !== 'object' || Array.isArray(manifest.assets)) {
    throw new Error('Invalid media lock');
}
const entries = Object.entries(manifest.assets);
if (!entries.length) {
    throw new Error('Media lock is empty');
}
for (const [relative, asset] of entries) {
    if (!/^data\/graphics\/combat\/[\w./-]+$/.test(relative) || relative.includes('..') ||
        path.posix.normalize(relative) !== relative || asset.location !== 'media' ||
        asset.path !== relative || !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0) {
        throw new Error(`Invalid media lock entry: ${relative}`);
    }
}

async function check([relative, asset]) {
    const url = new URL(`${manifest.releaseId}/${relative}`, base);
    const response = await fetch(url, { method: 'HEAD', redirect: 'error',
        signal: AbortSignal.timeout(30000) });
    if (response.status !== 200 ||
        Number(response.headers.get('content-length')) !== asset.bytes ||
        response.headers.get('content-type')?.split(';')[0] !== asset.contentType ||
        !response.headers.get('cache-control')?.includes('immutable')) {
        throw new Error(`Published media response differs: ${url.pathname} ` +
            `(HTTP ${response.status}, ${response.headers.get('content-type')}, ` +
            `${response.headers.get('content-length')} bytes)`);
    }
}

let next = 0;
await Promise.all(Array.from({ length: Math.min(6, entries.length) }, async () => {
    while (next < entries.length) {
        await check(entries[next++]);
    }
}));

const missing = new URL(`${manifest.releaseId}/data/graphics/combat/__missing-release-check__.glb`, base);
const absent = await fetch(missing, { method: 'HEAD', redirect: 'error',
    signal: AbortSignal.timeout(30000) });
if (absent.status !== 404) {
    throw new Error(`Missing media must return 404; got ${absent.status}`);
}

if (process.env.WEB_APP_ORIGIN) {
    const sample = new URL(`${manifest.releaseId}/${entries[0][0]}`, base);
    const response = await fetch(sample, { method: 'OPTIONS', redirect: 'error',
        headers: { Origin: process.env.WEB_APP_ORIGIN, 'Access-Control-Request-Method': 'GET' },
        signal: AbortSignal.timeout(30000) });
    const allowed = response.headers.get('access-control-allow-origin');
    if (!response.ok || ![process.env.WEB_APP_ORIGIN, '*'].includes(allowed)) {
        throw new Error(`Media CORS preflight failed: HTTP ${response.status}, origin ${allowed}`);
    }
}
console.log(`Verified ${entries.length} published media responses, immutable caching and a real 404.`);
