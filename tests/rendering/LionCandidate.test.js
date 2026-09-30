import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture } from '../../vendor/three/three.module.min.js';

it('retains the licensed lion source unchanged and exports visible textured geometry', () => {
    const root = new URL('../../tools/combat-art/sources/0ad-lion/', import.meta.url);
    const hashes = JSON.parse(readFileSync(new URL('SHA256SUMS.json', root)));
    for (const [file, hash] of Object.entries(hashes)) {
        expect(createHash('sha256').update(readFileSync(new URL(file, root))).digest('hex'), file).toBe(hash);
    }
    const bytes = readFileSync(new URL('../../tools/combat-art/lion-candidate.glb', import.meta.url));
    const data = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
    expect(data.images).toHaveLength(1);
    expect(data.materials.every(material =>
        (material.pbrMetallicRoughness.baseColorFactor?.[3] ?? 1) === 1)).toBe(true);
    expect(data.materials.every(material => material.pbrMetallicRoughness.baseColorTexture)).toBe(true);
    expect(data.meshes.every(mesh => mesh.primitives.every(primitive =>
        primitive.attributes.TEXCOORD_0 !== undefined))).toBe(true);
});

it('retains all six clips at a consistent creature scale with grounded supporting geometry', async () => {
    const bytes = readFileSync(new URL('../../tools/combat-art/lion-candidate.glb', import.meta.url));
    const gltf = await new GLTFLoader().register(() => ({ name: 'test-textures',
        loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    expect(gltf.animations.map(clip => clip.name).sort()).toEqual([
        'lion_death', 'lion_idle_01', 'lion_idle_02', 'lion_idle_03', 'lion_run', 'lion_walk'
    ]);
    const mixer = new AnimationMixer(gltf.scene);
    for (const clip of gltf.animations) {
        mixer.stopAllAction();
        mixer.clipAction(clip).reset().setLoop(LoopOnce, 1).play().clampWhenFinished = true;
        for (let i = 0; i <= 20; i++) {
            mixer.setTime(clip.duration * i / 20); gltf.scene.updateMatrixWorld(true);
            const bounds = new Box3().setFromObject(gltf.scene, true);
            expect(bounds.min.y, clip.name).toBeGreaterThan(-.015);
            // Keep the source locomotion's small airborne phases, unlike stationary poses.
            expect(bounds.min.y, clip.name).toBeLessThan(['lion_run', 'lion_walk'].includes(clip.name) ? .1 : .025);
            expect(bounds.max.y, clip.name).toBeGreaterThan(.5);
            expect(bounds.max.y, clip.name).toBeLessThan(3);
        }
    }
});
