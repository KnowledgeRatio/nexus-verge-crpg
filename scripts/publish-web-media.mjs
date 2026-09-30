import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import console from 'node:console';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mediaSourceRoot = process.env.WEB_MEDIA_SOURCE_ROOT
    ? path.resolve(process.env.WEB_MEDIA_SOURCE_ROOT) : root;
const lockFile = process.env.WEB_MEDIA_LOCK;
const account = process.env.WEB_MEDIA_ACCOUNT;
const container = process.env.WEB_MEDIA_CONTAINER || 'media';
const apply = process.argv.includes('--apply');

if (!lockFile || (apply && !account) || !/^[a-z0-9-]+$/.test(container)) {
    throw new Error('Set WEB_MEDIA_LOCK; publishing also requires WEB_MEDIA_ACCOUNT');
}
if (apply && account === 'nexusvergesaves') {
    throw new Error('The private save-storage account cannot be used for public media');
}
const manifest = JSON.parse(await readFile(path.resolve(root, lockFile), 'utf8'));
if (manifest.schemaVersion !== 1 || !/^[a-zA-Z0-9._-]+$/.test(manifest.releaseId) ||
    !manifest.assets || typeof manifest.assets !== 'object' || Array.isArray(manifest.assets)) {
    throw new Error('Invalid media lock');
}

const entries = Object.entries(manifest.assets);
let bytes = 0;
for (const [relative, asset] of entries) {
    if (!/^data\/graphics\/combat\/[\w./-]+$/.test(relative) ||
        path.posix.normalize(relative) !== relative || relative.includes('..') ||
        asset.location !== 'media' || asset.path !== relative ||
        !/^[a-f0-9]{64}$/.test(asset.sha256) || !Number.isSafeInteger(asset.bytes)) {
        throw new Error(`Invalid locked media: ${relative}`);
    }
    const source = path.join(mediaSourceRoot, relative);
    const size = (await stat(source)).size;
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(source)) hash.update(chunk);
    if (size !== asset.bytes || hash.digest('hex') !== asset.sha256) {
        throw new Error(`Media bytes changed since lock: ${relative}`);
    }
    bytes += size;
}

console.log(`Verified ${entries.length} local assets, ${(bytes / 1048576).toFixed(2)} MiB, ` +
    `release ${manifest.releaseId}.`);
if (!apply) {
    console.log('Dry run only. Supply --apply and WEB_MEDIA_ACCOUNT to publish immutable blobs.');
    process.exit(0);
}

const base = ['storage', 'blob'];
const common = ['--account-name', account, '--container-name', container, '--auth-mode', 'login'];
function az(subcommand, args) {
    return execFileSync('az', [...base, subcommand, ...common, ...args, '--output', 'json'], {
        cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024
    });
}

let uploaded = 0;
let retained = 0;
for (const [relative, asset] of entries) {
    const name = `releases/${manifest.releaseId}/${relative}`;
    const existing = JSON.parse(az('exists', ['--name', name]));
    if (existing.exists) {
        const blob = JSON.parse(az('show', ['--name', name]));
        if (blob.metadata?.sha256 !== asset.sha256 ||
            blob.properties?.contentLength !== asset.bytes ||
            blob.properties?.contentSettings?.contentType !== asset.contentType) {
            throw new Error(`Existing blob differs; refusing overwrite: ${name}`);
        }
        retained++;
        continue;
    }
    az('upload', ['--name', name, '--file', path.join(mediaSourceRoot, relative),
        '--if-none-match', '*', '--content-type', asset.contentType,
        '--content-cache-control', 'public, max-age=31536000, immutable',
        '--metadata', `sha256=${asset.sha256}`, '--no-progress']);
    const blob = JSON.parse(az('show', ['--name', name]));
    if (blob.metadata?.sha256 !== asset.sha256 || blob.properties?.contentLength !== asset.bytes) {
        throw new Error(`Uploaded blob verification failed: ${name}`);
    }
    uploaded++;
    if ((uploaded + retained) % 10 === 0) {
        console.log(`Verified ${uploaded + retained}/${entries.length} immutable blobs.`);
    }
}
console.log(`Published ${uploaded} blobs; verified ${retained} existing immutable blobs.`);
