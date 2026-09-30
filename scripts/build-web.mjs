import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { Buffer } from 'node:buffer';
import { copyFile, mkdir, open, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import console from 'node:console';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const appOutput = path.join(output, 'app');
const mediaLockFile = process.env.WEB_MEDIA_LOCK;
const lockedMedia = mediaLockFile
    ? JSON.parse(await readFile(path.resolve(root, mediaLockFile), 'utf8')) : null;
const releaseId = process.env.WEB_RELEASE_ID || lockedMedia?.releaseId || 'local-preview';
const appLimit = Number(process.env.WEB_APP_MAX_BYTES || 200_000_000);

if (!/^[a-zA-Z0-9._-]+$/.test(releaseId) || !Number.isSafeInteger(appLimit) || appLimit <= 0) {
    throw new Error('Invalid WEB_RELEASE_ID or WEB_APP_MAX_BYTES');
}
if (lockedMedia && (lockedMedia.schemaVersion !== 1 || lockedMedia.releaseId !== releaseId ||
    !lockedMedia.assets || Array.isArray(lockedMedia.assets) || typeof lockedMedia.assets !== 'object')) {
    throw new Error('Invalid media lock or release ID mismatch');
}

const mediaOutput = path.join(output, 'media', 'releases', releaseId);
const mediaOrigin = process.env.WEB_MEDIA_ORIGIN;
if (lockedMedia && !mediaOrigin) {
    throw new Error('WEB_MEDIA_ORIGIN is required with WEB_MEDIA_LOCK');
}
if (mediaOrigin) {
    const url = new URL(mediaOrigin);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) {
        throw new Error('WEB_MEDIA_ORIGIN must use HTTPS (or localhost HTTP for testing)');
    }
}
const mediaBaseUrl = mediaOrigin
    ? new URL(`releases/${releaseId}/`, mediaOrigin.endsWith('/') ? mediaOrigin : `${mediaOrigin}/`).href
    : `/media/releases/${releaseId}/`;

const appFiles = new Set([
    'index.html', 'styles.css', 'LICENSE'
]);
const mediaFiles = new Set();

async function addFilesUnder(relativeDir, accept) {
    const absoluteDir = path.join(root, relativeDir);
    for (const entry of await readdir(absoluteDir, { withFileTypes: true })) {
        const relative = path.posix.join(relativeDir, entry.name);
        if (entry.isDirectory()) {
            await addFilesUnder(relative, accept);
        } else if (entry.isFile() && accept(relative)) {
            appFiles.add(relative);
        }
    }
}

async function fileHash(filename) {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(filename)) hash.update(chunk);
    return hash.digest('hex');
}

function mediaContentType(relative) {
    if (relative.endsWith('.glb')) return 'model/gltf-binary';
    if (relative.endsWith('.png')) return 'image/png';
    if (/\.jpe?g$/.test(relative)) return 'image/jpeg';
    if (relative.endsWith('.webp')) return 'image/webp';
    if (relative.endsWith('.bin')) return 'application/octet-stream';
    return null;
}

async function copy(relative, destinationRoot) {
    const source = path.join(root, relative);
    const destination = path.join(destinationRoot, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
    return (await stat(source)).size;
}

function visitMediaReferences(value) {
    if (Array.isArray(value)) {
        value.forEach(visitMediaReferences);
    } else if (value && typeof value === 'object') {
        Object.values(value).forEach(visitMediaReferences);
    } else if (typeof value === 'string' && value.startsWith('data/graphics/combat/')) {
        mediaFiles.add(value);
    }
}

async function glbDependencies(relative) {
    const file = await open(path.join(root, relative), 'r');
    try {
        const header = Buffer.alloc(20);
        await file.read(header, 0, header.length, 0);
        if (header.toString('ascii', 0, 4) !== 'glTF' ||
            header.toString('ascii', 16, 20) !== 'JSON') {
            throw new Error(`Invalid GLB header: ${relative}`);
        }
        const jsonLength = header.readUInt32LE(12);
        const chunk = Buffer.alloc(jsonLength);
        await file.read(chunk, 0, jsonLength, 20);
        const gltf = JSON.parse(chunk.toString('utf8'));
        const dependencies = [];
        for (const spec of [...(gltf.buffers || []), ...(gltf.images || [])]) {
            if (!spec.uri || spec.uri.startsWith('data:')) {
                continue;
            }
            if (/^[a-z][a-z0-9+.-]*:/i.test(spec.uri) || spec.uri.startsWith('/')) {
                throw new Error(`External GLB URL is not supported: ${relative} -> ${spec.uri}`);
            }
            dependencies.push(path.posix.normalize(path.posix.join(path.posix.dirname(relative), spec.uri)));
        }
        return dependencies;
    } finally {
        await file.close();
    }
}

await addFilesUnder('src', file => file.endsWith('.js') && !/Study\.js$/.test(file) &&
    file !== 'src/ui/CombatEncounterSetup.js');
await addFilesUnder('vendor', file => file.endsWith('.js'));
await addFilesUnder('legal', file => /\.(md|json|xml)$/.test(file));
await addFilesUnder('data', file =>
    /^data\/[^/]+\.json$/.test(file) && !/(Study|\.example)\.json$/.test(file));
await addFilesUnder('data/skillChallenges', file => file.endsWith('.json'));
await addFilesUnder('data/graphics', file =>
    /^data\/graphics\/[^/]+\.png$/.test(file));
await addFilesUnder('data/sound', file => file.endsWith('.wav'));
appFiles.add('data/audio/combat-sfx.json');
if (await stat(path.join(root, 'combat-scene.css')).catch(() => null)) {
    appFiles.add('combat-scene.css');
}
const combatScene = JSON.parse(await readFile(path.join(root, 'data/combatScene.json'), 'utf8'));
visitMediaReferences(combatScene);
for (const appearance of combatScene.playerAppearances || []) {
    const portrait = appearance.portrait;
    if (typeof portrait !== 'string' || !/^combat\/[\w.-]+\.png$/.test(portrait) ||
        portrait.includes('..') || path.posix.normalize(portrait) !== portrait) {
        throw new Error(`Invalid player portrait path: ${portrait}`);
    }
    appFiles.add(`data/graphics/${portrait}`);
}
if (process.env.WEB_REQUIRE_TRACKED_APP === '1') {
    const tracked = new Set(execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
        .split('\0').filter(Boolean));
    const lockSource = mediaLockFile && path.relative(root, path.resolve(root, mediaLockFile));
    const sources = [...appFiles, 'deployment/swa-release-config.json', 'scripts/build-web.mjs',
        'package.json', ...(lockSource ? [lockSource] : [])];
    const missing = sources.filter(file => !tracked.has(file));
    if (missing.length) {
        throw new Error(`Web release has ${missing.length} untracked source files:\n${missing.join('\n')}`);
    }
}
// Local generated audio candidates are not approved for public distribution.
// AudioManager uses the published manifest to select bundled fallback sounds.

if (lockedMedia) {
    for (const relative of mediaFiles) {
        if (!Object.hasOwn(lockedMedia.assets, relative)) {
            throw new Error(`Combat scene references unlocked media: ${relative}`);
        }
    }
    for (const relative of Object.keys(lockedMedia.assets)) {
        mediaFiles.add(relative);
    }
} else {
    for (const relative of [...mediaFiles]) {
        if (relative.endsWith('.glb')) {
            for (const dependency of await glbDependencies(relative)) {
                mediaFiles.add(dependency);
            }
        }
    }
}

for (const relative of mediaFiles) {
    if (!/^data\/graphics\/combat\/[\w./-]+$/.test(relative) ||
        path.posix.normalize(relative) !== relative || relative.includes('..') ||
        /\.(blend|blend1|psd|wav)$/i.test(relative)) {
        throw new Error(`Invalid published media path: ${relative}`);
    }
    if (!lockedMedia && !(await stat(path.join(root, relative)).catch(() => null))?.isFile()) {
        throw new Error(`Missing published media asset: ${relative}`);
    }
}
if (lockedMedia) {
    for (const [relative, asset] of Object.entries(lockedMedia.assets)) {
        if (asset.location !== 'media' || asset.path !== relative ||
            !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0 ||
            !/^[a-f0-9]{64}$/.test(asset.sha256) ||
            !mediaContentType(relative) || asset.contentType !== mediaContentType(relative)) {
            throw new Error(`Invalid locked media entry: ${relative}`);
        }
    }
}

// Clean only our generated outputs; Finder may create .DS_Store in dist concurrently.
await rm(appOutput, { recursive: true, force: true });
await rm(path.join(output, 'media'), { recursive: true, force: true });
await mkdir(appOutput, { recursive: true });

let appBytes = 0;
for (const relative of [...appFiles].sort()) appBytes += await copy(relative, appOutput);

const indexFile = path.join(appOutput, 'index.html');
let index = await readFile(indexFile, 'utf8');
index = index.replace(/^\s*<a href="combat-study\.html"[^\n]*\n/m, '\n');
if (!index.includes('<script type="module" src="src/main.js"></script>')) {
    throw new Error('Cannot insert release media configuration before the application module');
}
index = index.replace('<script type="module" src="src/main.js"></script>',
    '<script src="media-config.js"></script>\n    <script type="module" src="src/main.js"></script>');
await writeFile(indexFile, index);

const manifest = {
    schemaVersion: 1,
    releaseId,
    mediaBaseUrl,
    assets: {}
};
let mediaBytes = 0;
for (const relative of [...mediaFiles].sort()) {
    if (lockedMedia) {
        manifest.assets[relative] = lockedMedia.assets[relative];
        mediaBytes += lockedMedia.assets[relative].bytes;
        continue;
    }
    const bytes = await copy(relative, mediaOutput);
    mediaBytes += bytes;
    const contentType = mediaContentType(relative);
    if (!contentType) {
        throw new Error(`Unknown media content type: ${relative}`);
    }
    manifest.assets[relative] = {
        location: 'media',
        path: relative,
        bytes,
        sha256: await fileHash(path.join(root, relative)),
        contentType
    };
}
await writeFile(path.join(appOutput, 'media-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(path.join(appOutput, 'media-config.js'),
    `globalThis.__NEXUS_VERGE_MEDIA__ = ${JSON.stringify({
        baseUrl: mediaBaseUrl,
        paths: Object.keys(manifest.assets)
    })};\n`);

const configFile = path.join(appOutput, 'staticwebapp.config.json');
const config = JSON.parse(await readFile(path.join(root, 'deployment/swa-release-config.json'), 'utf8'));
config.navigationFallback.exclude.push('/vendor/*', '/legal/*', '/media/*',
    '/*.{glb,mp3,wav,webp,woff,woff2,md}');
if (mediaOrigin) {
    const origin = new URL(mediaOrigin).origin;
    const policy = config.globalHeaders['Content-Security-Policy'];
    config.globalHeaders['Content-Security-Policy'] = policy.replace(
        /connect-src ([^;]+);/, `connect-src $1 ${origin};`).replace(
        /img-src ([^;]+);/, `img-src $1 blob: ${origin};`) + ` media-src 'self' ${origin};`;
} else {
    const policy = config.globalHeaders['Content-Security-Policy'];
    config.globalHeaders['Content-Security-Policy'] = policy.replace(
        /img-src ([^;]+);/, 'img-src $1 blob:;');
}
await writeFile(configFile, `${JSON.stringify(config, null, 2)}\n`);

const generatedBytes = await Promise.all(['index.html', 'staticwebapp.config.json',
    'media-manifest.json', 'media-config.js'].map(async name =>
    (await stat(path.join(appOutput, name))).size));
const replacedBytes = await Promise.all(['index.html'].map(async name =>
    (await stat(path.join(root, name))).size));
appBytes += generatedBytes.reduce((sum, bytes) => sum + bytes, 0) -
    replacedBytes.reduce((sum, bytes) => sum + bytes, 0);
if (appBytes > appLimit) {
    throw new Error(`SWA package ${(appBytes / 1048576).toFixed(1)} MiB exceeds limit ${(appLimit / 1048576).toFixed(1)} MiB`);
}

const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
console.log(JSON.stringify({
    releaseId, gitHead: head, appFiles: appFiles.size + 3, mediaFiles: mediaFiles.size,
    appMiB: +(appBytes / 1048576).toFixed(2), mediaMiB: +(mediaBytes / 1048576).toFixed(2),
    mediaBaseUrl, appOutput: 'dist/app',
    mediaOutput: lockedMedia ? null : `dist/media/releases/${releaseId}`
}, null, 2));
