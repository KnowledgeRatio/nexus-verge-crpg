import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture, Vector3 } from '../../vendor/three/three.module.min.js';

const source = new URL('../../tools/combat-art/sources/0ad-bear/', import.meta.url);

describe('Licensed bear adaptation base', () => {
    it('retains the exact downloaded sources and their upstream licence', () => {
        const hashes = JSON.parse(readFileSync(new URL('SHA256SUMS.json', source)));
        for (const [name, expected] of Object.entries(hashes)) {
            expect(createHash('sha256').update(readFileSync(new URL(name, source))).digest('hex')).toBe(expected);
        }
        expect(readFileSync(new URL('LICENSE.txt', source), 'utf8')).toContain('Attribution-Share Alike 3.0');
    });

    it('preserves the textured rig and ten clips with grounded defeat and changing walk limbs', async () => {
        const bytes = readFileSync(new URL('../../tools/combat-art/bear-candidate.glb', import.meta.url));
        const loader = new GLTFLoader().register(() => ({ name: 'test-textures', loadTexture: () => Promise.resolve(new Texture()) }));
        const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        expect(gltf.animations).toHaveLength(10);
        let skin;
        gltf.scene.traverse(node => {
            if (node.isSkinnedMesh) {
                skin = node;
            }
        });
        expect(skin.material.map).toBeTruthy();
        expect(skin.skeleton.bones.length).toBeGreaterThan(30);
        const mixer = new AnimationMixer(gltf.scene);
        for (const clip of gltf.animations) {
            mixer.stopAllAction();
            mixer.clipAction(clip).reset().setLoop(LoopOnce, 1).play().clampWhenFinished = true;
            for (let i = 0; i <= 37; i++) {
                mixer.setTime(clip.duration * i / 37); gltf.scene.updateMatrixWorld(true);
                const box = new Box3().setFromObject(gltf.scene, true);
                expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
                expect(box.min.y).toBeGreaterThan(-.02);
                expect(box.max.y).toBeLessThan(3.2);
            }
        }
        mixer.stopAllAction();
        const walk = gltf.animations.find(clip => clip.name === 'bear_walk');
        mixer.clipAction(walk).reset().play(); mixer.setTime(0); gltf.scene.updateMatrixWorld(true);
        const paw = gltf.scene.getObjectByName('Ursidae_Paw_L');
        const start = paw.getWorldPosition(new Vector3());
        mixer.setTime(walk.duration * .4); gltf.scene.updateMatrixWorld(true);
        expect(paw.getWorldPosition(new Vector3()).distanceTo(start)).toBeGreaterThan(.1);
    });
});
