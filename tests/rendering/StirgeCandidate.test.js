import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Vector3 } from '../../vendor/three/three.module.min.js';

describe('Stirge authoring candidate', () => {
    it('keeps its original proboscis attached to the head across finite source and feeding poses', async () => {
        globalThis.ProgressEvent ??= class ProgressEvent {};
        const text = readFileSync(new URL('../../tools/combat-art/stirge-candidate.gltf', import.meta.url), 'utf8');
        const gltf = await new GLTFLoader().parseAsync(text, '');
        const head = gltf.scene.getObjectByName('Head');
        const needle = gltf.scene.getObjectByName('StirgeProboscis');
        const contact = gltf.scene.getObjectByName('StirgeContact');
        expect(needle.parent).toBe(head);
        expect(contact.parent).toBe(head);
        expect(gltf.animations.some(clip => clip.name === 'Wasp_Attack')).toBe(false);
        const mixer = new AnimationMixer(gltf.scene);
        let distance;
        for (const clip of gltf.animations) {
            mixer.stopAllAction();
            const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play();
            action.clampWhenFinished = true;
            for (let i = 0; i <= 8; i++) {
                mixer.setTime(clip.duration * i / 8); gltf.scene.updateMatrixWorld(true);
                const box = new Box3().setFromObject(gltf.scene, true);
                expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
                const length = contact.getWorldPosition(new Vector3()).distanceTo(head.getWorldPosition(new Vector3()));
                distance ??= length;
                expect(length).toBeCloseTo(distance, 4);
            }
        }
        expect(gltf.animations.find(clip => clip.name === 'Stirge_Feed').duration).toBeCloseTo(.6);
    });
});
