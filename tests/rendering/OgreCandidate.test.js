import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture } from '../../vendor/three/three.module.min.js';

it.each(['candidate', 'runtime'])('keeps the %s Ogre finite and grounded through its retargeted actions', async variant => {
    globalThis.ProgressEvent ??= class ProgressEvent {};
    const bytes = readFileSync(new URL(variant === 'candidate' ? '../../tools/combat-art/ogre-candidate.gltf' :
        '../../data/graphics/combat/ogre-v1.glb', import.meta.url));
    const text = variant === 'candidate' ? bytes.toString('utf8') :
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const gltf = await new GLTFLoader().register(() => ({ name: 'test-textures',
        loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(text, '');
    expect(gltf.scene.getObjectByName('GiantClub').parent.name).toBe('hand_r');
    expect(Boolean(gltf.scene.getObjectByName('GiantClub').isMesh || gltf.scene.getObjectByName('GiantClub').children.length))
        .toBe(variant === 'candidate');
    gltf.scene.updateMatrixWorld(true);
    const standing = new Box3().setFromObject(gltf.scene.getObjectByName('SuperHero_Male'), true);
    expect(standing.max.y - standing.min.y).toBeGreaterThan(2.9);
    expect(standing.max.y - standing.min.y).toBeLessThan(3.2);
    const mixer = new AnimationMixer(gltf.scene);
    for (const name of ['Sword_Idle', 'Walk_Loop', 'Sword_Attack', 'OverhandThrow', 'Hit_Chest', 'Death01']) {
        const clip = gltf.animations.find(candidate => candidate.name === name);
        expect(clip).toBeDefined();
        mixer.stopAllAction(); mixer.clipAction(clip).setLoop(LoopOnce, 1).play().clampWhenFinished = true;
        for (const fraction of [0, .25, .5, .75, 1]) {
            mixer.setTime(clip.duration * fraction); gltf.scene.updateMatrixWorld(true);
            const box = new Box3().setFromObject(gltf.scene, true);
            expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
            expect(box.max.y - box.min.y).toBeLessThan(5);
            const groundedBody = new Box3().setFromObject(gltf.scene.getObjectByName('SuperHero_Male'), true);
            groundedBody.union(new Box3().setFromObject(gltf.scene.getObjectByName('OgreClothing'), true));
            expect(groundedBody.min.y).toBeGreaterThan(-.015);
            expect(groundedBody.min.y).toBeLessThan(.025);
            if (name === 'Sword_Idle') {
                const body = new Box3().setFromObject(gltf.scene.getObjectByName('SuperHero_Male'), true);
                expect(body.max.y - body.min.y).toBeGreaterThan(2.5);
                expect(body.max.y - body.min.y).toBeLessThan(3.4);
            }
        }
    }
});
