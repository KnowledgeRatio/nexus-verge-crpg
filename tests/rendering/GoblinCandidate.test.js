import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture } from '../../vendor/three/three.module.min.js';

it('keeps the goblin grounded through every shared combat clip', async () => {
    const bytes = readFileSync(new URL('../../data/graphics/combat/goblin-v1.glb', import.meta.url));
    const loader = new GLTFLoader().register(() => ({ name: 'test-textures', loadTexture: () => Promise.resolve(new Texture()) }));
    const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    expect(gltf.animations.map(clip => clip.name)).toEqual(expect.arrayContaining([
        'Sword_Idle', 'Ranged_Bow_Idle', 'Ranged_Bow_Shot', 'Death01'
    ]));
    const mixer = new AnimationMixer(gltf.scene);
    for (const clip of gltf.animations) {
        mixer.stopAllAction();
        mixer.clipAction(clip).reset().setLoop(LoopOnce, 1).play().clampWhenFinished = true;
        for (let i = 0; i <= 11; i++) {
            mixer.setTime(clip.duration * i / 11);
            gltf.scene.updateMatrixWorld(true);
            const bounds = new Box3().setFromObject(gltf.scene, true);
            expect(bounds.min.y, clip.name).toBeGreaterThan(-.025);
            expect(bounds.min.y, clip.name).toBeLessThan(.025);
        }
    }
});
