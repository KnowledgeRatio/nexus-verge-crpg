import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture, Vector3, Quaternion } from '../../vendor/three/three.module.min.js';

it('preserves the retained CC0 originals and their unchanged embedded texture', () => {
    const root = new URL('../../tools/combat-art/sources/cethiel-dragon/', import.meta.url);
    const hashes = JSON.parse(readFileSync(new URL('SHA256SUMS.json', root)));
    const digest = bytes => createHash('sha256').update(bytes).digest('hex');
    for (const [file, hash] of Object.entries(hashes)) {
        expect(digest(readFileSync(new URL(file, root))), file).toBe(hash);
    }
    const bytes = readFileSync(new URL('../../tools/combat-art/dragon-candidate.glb', import.meta.url));
    expect(digest(readFileSync(new URL('../../data/graphics/combat/dragon-v1.glb', import.meta.url))))
        .toBe(digest(bytes));
    const length = bytes.readUInt32LE(12), data = JSON.parse(bytes.subarray(20, 20 + length));
    const binary = bytes.subarray(28 + length), view = data.bufferViews[data.images[0].bufferView];
    expect(digest(binary.subarray(view.byteOffset, view.byteOffset + view.byteLength))).toBe(hashes['dragon.png']);
});

it('grounds all clips and gives bite, claw and breath distinct skeletal motion', async () => {
    const bytes = readFileSync(new URL('../../tools/combat-art/dragon-candidate.glb', import.meta.url));
    const gltf = await new GLTFLoader().register(() => ({ name: 'test-textures',
        loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const mixer = new AnimationMixer(gltf.scene);
    const sample = (name, fraction) => {
        const clip = gltf.animations.find(entry => entry.name === name);
        expect(clip).toBeDefined(); mixer.stopAllAction();
        mixer.clipAction(clip).reset().setLoop(LoopOnce, 1).play().clampWhenFinished = true;
        mixer.setTime(clip.duration * fraction); gltf.scene.updateMatrixWorld(true);
    };
    for (const clip of gltf.animations) {
        for (let i = 0; i <= 19; i++) {
            sample(clip.name, i / 19);
            const bounds = new Box3().setFromObject(gltf.scene, true);
            expect(bounds.min.y, clip.name).toBeGreaterThan(-.01);
            expect(bounds.min.y, clip.name).toBeLessThan(.02);
        }
    }
    const mouth = gltf.scene.getObjectByName('DragonMouth'), claw = gltf.scene.getObjectByName('DragonClaw');
    expect(mouth.parent.name).toBe('jaw_upper');
    expect(claw.parent.name).toBe('leg_front_footR');
    sample('Idle', 0);
    const mouthRest = mouth.getWorldPosition(new Vector3()), clawRest = claw.getWorldPosition(new Vector3());
    const jawRest = gltf.scene.getObjectByName('jaw_lower').getWorldQuaternion(new Quaternion());
    sample('Attack', .64);
    const bite = mouth.getWorldPosition(new Vector3());
    expect(bite.y).toBeLessThan(mouthRest.y - .15);
    expect(bite.z).toBeGreaterThan(mouthRest.z + .1);
    sample('Dragon_Claw', .5);
    const strike = claw.getWorldPosition(new Vector3());
    expect(strike.y).toBeGreaterThan(clawRest.y + .08);
    expect(strike.z).toBeGreaterThan(clawRest.z + .1);
    expect(Math.abs(strike.x)).toBeLessThan(.025);
    sample('Dragon_Breath', .45);
    const jaw = gltf.scene.getObjectByName('jaw_lower').getWorldQuaternion(new Quaternion());
    expect(jaw.angleTo(jawRest)).toBeGreaterThan(.35);
});
