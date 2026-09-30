import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import console from 'node:console';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The web build owns asset selection and GLB dependency discovery. Use it to
// create the candidate manifest so lock generation cannot silently drift.
execFileSync(process.execPath, ['scripts/build-web.mjs'], {
    cwd: root,
    env: {
        ...process.env,
        WEB_MEDIA_LOCK: '',
        WEB_MEDIA_ORIGIN: '',
        WEB_RELEASE_ID: 'local-preview',
        WEB_REQUIRE_TRACKED_APP: ''
    },
    stdio: 'inherit'
});

const manifest = JSON.parse(await readFile(path.join(root, 'dist/app/media-manifest.json'), 'utf8'));
const fingerprint = Object.entries(manifest.assets)
    .map(([relative, asset]) => `${relative}:${asset.sha256}`)
    .sort((left, right) => left.localeCompare(right)).join('\n');
const id = createHash('sha256').update(fingerprint).digest('hex').slice(0, 12);
manifest.releaseId = `combat-${id}`;
manifest.mediaBaseUrl = `/media/releases/${manifest.releaseId}/`;

const relative = `deployment/media-releases/${manifest.releaseId}.json`;
const destination = path.join(root, relative);
const contents = `${JSON.stringify(manifest, null, 2)}\n`;
try {
    await writeFile(destination, contents, { flag: 'wx' });
    console.log(`Created ${relative} with ${Object.keys(manifest.assets).length} assets.`);
} catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (await readFile(destination, 'utf8') !== contents) {
        throw new Error(`Existing release lock differs; refusing overwrite: ${relative}`);
    }
    console.log(`Release lock unchanged: ${relative}`);
}
