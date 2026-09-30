import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture, Vector3, Quaternion } from '../../vendor/three/three.module.min.js';

describe('Gnoll anatomical candidate', () => {
    it('retains a textured hyena head, grounded shared motions and a separate head-led bite', async () => {
        const bytes = readFileSync(new URL('../../data/graphics/combat/gnoll-v1.glb', import.meta.url));
        const loader = new GLTFLoader().register(() => ({ name: 'test-textures', loadTexture: () => Promise.resolve(new Texture()) }));
        const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        const head = gltf.scene.getObjectByName('GnollHead');
        expect(head).toBeDefined();
        expect(head.parent.name).toBe('Head');
        let textured = 0;
        head.traverse(node => {
            if (node.material?.map) {
                textured++;
            }
        });
        expect(textured).toBeGreaterThan(0);
        expect(gltf.scene.getObjectByName('hand_r')).toBeDefined();
        const mixer = new AnimationMixer(gltf.scene);
        const sample = (clip, time) => {
            mixer.stopAllAction();
            mixer.clipAction(clip).reset().setLoop(LoopOnce, 1).play().clampWhenFinished = true;
            mixer.setTime(time); gltf.scene.updateMatrixWorld(true);
        };
        for (const clip of gltf.animations) {
            for (let i = 0; i <= 17; i++) {
                sample(clip, clip.duration * i / 17);
                const bounds = new Box3().setFromObject(gltf.scene, true);
                expect(bounds.min.y, clip.name).toBeGreaterThan(-.025);
                expect(bounds.min.y, clip.name).toBeLessThan(.025);
                expect(bounds.max.y, clip.name).toBeLessThan(2.6);
            }
        }
        const bite = gltf.animations.find(clip => clip.name === 'Gnoll_Bite');
        const mouth = gltf.scene.getObjectByName('GnollMouth');
        sample(bite, 0); const rest = mouth.getWorldPosition(new Vector3());
        sample(bite, bite.duration * .45); const impact = mouth.getWorldPosition(new Vector3());
        expect(impact.z - rest.z).toBeGreaterThan(.25);
        expect(impact.y).toBeLessThan(rest.y);
        const jaw = gltf.scene.getObjectByName('GnollJaw');
        sample(bite, bite.duration * .225);
        expect(jaw.quaternion.angleTo(new Quaternion())).toBeGreaterThan(.5);
        sample(bite, bite.duration * .45);
        expect(jaw.quaternion.angleTo(new Quaternion())).toBeLessThan(.025);
    });
});
