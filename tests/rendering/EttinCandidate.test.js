import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture } from '../../vendor/three/three.module.min.js';

it('fits two complete heads without extracting arms, and preserves grounded shared motion', async () => {
    globalThis.ProgressEvent ??= class ProgressEvent {};
    const source = readFileSync(new URL('../../tools/combat-art/ettin-candidate.gltf', import.meta.url), 'utf8');
    const model = await new GLTFLoader().register(() => ({ name: 'test-textures',
        loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(source, '');
    const heads = ['EttinHead1', 'EttinHead2'].map(name => model.scene.getObjectByName(name));
    model.scene.getObjectByName('GiantClub').removeFromParent();
    model.scene.updateMatrixWorld(true);
    const rest = new Box3().setFromObject(model.scene, true);
    expect(rest.max.y - rest.min.y).toBeGreaterThan(3.4);
    expect(rest.max.y - rest.min.y).toBeLessThan(4);
    heads.forEach(head => {
        expect(head.parent.name).toBe('Head');
        const box = new Box3().setFromObject(head, true);
        // A height-only cut of the T-pose accidentally included raised arm fragments.
        expect(box.max.x - box.min.x).toBeLessThan(.8);
        expect(box.min.y).toBeGreaterThan(2.8);
        head.traverse(node => {
            if (node.isMesh) {
                expect(node.geometry.attributes.position.count).toBe(node.geometry.attributes.normal.count);
                expect(node.geometry.attributes.uv.count).toBe(node.geometry.attributes.position.count);
            }
        });
    });
    const bounds = heads.map(head => new Box3().setFromObject(head, true));
    expect(bounds[0].max.x).toBeLessThan(bounds[1].max.x);
    const mixer = new AnimationMixer(model.scene);
    for (const name of ['Sword_Idle', 'Walk_Loop', 'Sword_Attack', 'Hit_Chest', 'Death01']) {
        const clip = model.animations.find(clip => clip.name === name);
        expect(clip).toBeDefined(); mixer.stopAllAction();
        mixer.clipAction(clip).setLoop(LoopOnce, 1).play().clampWhenFinished = true;
        for (const fraction of [0, .25, .5, .75, 1]) {
            mixer.setTime(clip.duration * fraction); model.scene.updateMatrixWorld(true);
            const box = new Box3().setFromObject(model.scene, true);
            expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
            expect(box.min.y).toBeGreaterThan(-.025); expect(box.min.y).toBeLessThan(.035);
        }
    }
});
