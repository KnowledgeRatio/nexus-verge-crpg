import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tempDirs = [];

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

async function runPromotion(sourceBytes) {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'nexus-media-test-'));
    tempDirs.push(dir);
    const binDir = path.join(dir, 'bin');
    await mkdir(binDir);
    const source = path.join(dir, 'private-export.glb');
    const original = Buffer.from('approved model bytes');
    await writeFile(source, sourceBytes);
    const relative = 'data/graphics/combat/test-export.glb';
    const lock = path.join(dir, 'lock.json');
    await writeFile(lock, JSON.stringify({
        schemaVersion: 1,
        releaseId: 'combat-test',
        assets: {
            [relative]: {
                location: 'media', path: relative, bytes: original.length,
                sha256: createHash('sha256').update(original).digest('hex'),
                contentType: 'model/gltf-binary'
            }
        }
    }));
    const az = path.join(binDir, 'az');
    await writeFile(az, `#!/usr/bin/env node
import { copyFileSync } from 'node:fs';
const index = process.argv.indexOf('--file');
if (process.argv[2] !== 'storage' || process.argv[3] !== 'blob' ||
    process.argv[4] !== 'download' || index < 0) process.exit(3);
copyFileSync(process.env.FAKE_PRIVATE_BLOB, process.argv[index + 1]);
`);
    await chmod(az, 0o755);
    return spawnSync(process.execPath, ['scripts/promote-web-media.mjs'], {
        cwd: root,
        encoding: 'utf8',
        env: {
            ...process.env,
            PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
            FAKE_PRIVATE_BLOB: source,
            WEB_MEDIA_LOCK: lock,
            WEB_MEDIA_SOURCE_ACCOUNT: 'nexusvergeartsrc',
            WEB_MEDIA_ACCOUNT: 'nexusvergemedia'
        }
    });
}

describe('private media promotion', () => {
    it('verifies private export bytes before a public publish', async () => {
        const result = await runPromotion(Buffer.from('approved model bytes'));
        expect(result.status).toBe(0);
        expect(result.stdout).toContain('Verified 1 local assets');
        expect(result.stdout).toContain('Dry run only');
    });

    it('rejects a changed private export before publishing', async () => {
        const result = await runPromotion(Buffer.from('changed model bytes'));
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('Media bytes changed since lock');
    });
});
