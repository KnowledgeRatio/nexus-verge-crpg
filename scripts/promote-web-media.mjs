import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import console from 'node:console';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lockFile = process.env.WEB_MEDIA_LOCK;
const sourceAccount = process.env.WEB_MEDIA_SOURCE_ACCOUNT;
const sourceContainer = process.env.WEB_MEDIA_SOURCE_CONTAINER || 'approved-exports';
const publicAccount = process.env.WEB_MEDIA_ACCOUNT;
const apply = process.argv.includes('--apply');

if (!lockFile || !sourceAccount || !publicAccount || sourceAccount === publicAccount ||
    sourceAccount === 'nexusvergesaves' || publicAccount === 'nexusvergesaves' ||
    !/^[a-z0-9-]+$/.test(sourceContainer)) {
    throw new Error('Set WEB_MEDIA_LOCK, separate WEB_MEDIA_SOURCE_ACCOUNT and WEB_MEDIA_ACCOUNT');
}
const manifest = JSON.parse(await readFile(path.resolve(root, lockFile), 'utf8'));
if (manifest.schemaVersion !== 1 || !/^[\w.-]+$/.test(manifest.releaseId) ||
    !manifest.assets || typeof manifest.assets !== 'object' || Array.isArray(manifest.assets)) {
    throw new Error('Invalid media lock');
}
const entries = Object.keys(manifest.assets);
if (!entries.length) throw new Error('Media lock is empty');

const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'nexus-web-media-'));
try {
    for (const [index, relative] of entries.entries()) {
        if (!/^data\/graphics\/combat\/[\w./-]+$/.test(relative) ||
            path.posix.normalize(relative) !== relative || relative.includes('..')) {
            throw new Error(`Invalid media path: ${relative}`);
        }
        const target = path.join(tempRoot, relative);
        await mkdir(path.dirname(target), { recursive: true });
        execFileSync('az', ['storage', 'blob', 'download',
            '--account-name', sourceAccount, '--container-name', sourceContainer,
            '--auth-mode', 'login', '--name', `releases/${manifest.releaseId}/${relative}`,
            '--file', target, '--no-progress', '--output', 'none'], {
            cwd: root, stdio: 'pipe', maxBuffer: 1024 * 1024
        });
        if ((index + 1) % 10 === 0) {
            console.log(`Downloaded ${index + 1}/${entries.length} private source exports.`);
        }
    }
    const env = { ...process.env, WEB_MEDIA_SOURCE_ROOT: tempRoot };
    // The publisher hashes all downloaded bytes before performing any writes.
    execFileSync(process.execPath, ['scripts/publish-web-media.mjs', ...(apply ? ['--apply'] : [])], {
        cwd: root, env, stdio: 'inherit'
    });
} finally {
    await rm(tempRoot, { recursive: true, force: true });
}
