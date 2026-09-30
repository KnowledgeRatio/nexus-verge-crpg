import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture } from '../../vendor/three/three.module.min.js';

it.each(['ghoul', 'ghast'])('%s candidate retains attached claws and finite bite/swipe deformation', async id => {
    const text = readFileSync(new URL(`../../tools/combat-art/${id}-candidate.gltf`, import.meta.url), 'utf8');
    const loader = new GLTFLoader().register(() => ({ name: 'test-textures',
        loadTexture: () => Promise.resolve(new Texture()) }));
    globalThis.ProgressEvent ??= class ProgressEvent {};
    const gltf = await loader.parseAsync(text, '');
    expect(gltf.scene.getObjectByName('GauntBody').isSkinnedMesh).toBe(true);
    for (const side of ['L', 'R']) {
        expect(gltf.scene.getObjectByName(`ClawedHand${side}`).parent.name).toBe(`Grip${side}`);
    }
    expect(gltf.scene.getObjectByName('BiteContact').parent.name).toBe('HeadJoint');
    const mixer = new AnimationMixer(gltf.scene);
    for (const name of ['Zombie_Idle', 'Corpse_Bite', 'Melee_1H_Attack_Slice_Diagonal', 'Death01']) {
        const clip = gltf.animations.find(c => c.name === name);
        expect(clip).toBeDefined();
        mixer.stopAllAction();
        const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play();
        action.clampWhenFinished = true;
        for (const fraction of [0, .5, 1]) {
            mixer.setTime(clip.duration * fraction); gltf.scene.updateMatrixWorld(true);
            const box = new Box3().setFromObject(gltf.scene, true);
            expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
            expect(box.max.y - box.min.y).toBeLessThan(2.5);
        }
    }
});
