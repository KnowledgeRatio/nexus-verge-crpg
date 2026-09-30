import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture } from '../../vendor/three/three.module.min.js';

it('keeps original bovine features attached and hooves grounded through shared candidate motion', async () => {
    globalThis.ProgressEvent ??= class ProgressEvent {};
    const source = readFileSync(new URL('../../tools/combat-art/minotaur-candidate.gltf', import.meta.url), 'utf8');
    const model = await new GLTFLoader().register(() => ({ name: 'test-textures',
        loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(source, '');
    const features = [];
    model.scene.traverse(node => {
        if (node.isMesh && node.material.name.startsWith('Bovine')) {
            features.push(node);
        }
    });
    expect(features.filter(node => node.parent.name === 'Head').length).toBeGreaterThan(2);
    for (const bone of ['foot_l', 'foot_r']) {
        expect(features.some(node => node.parent.name === bone)).toBe(true);
    }
    model.scene.getObjectByName('GiantClub').removeFromParent();
    model.scene.updateMatrixWorld(true);
    const restBounds = new Box3().setFromObject(model.scene, true);
    expect(restBounds.max.y - restBounds.min.y).toBeGreaterThan(2.1);
    expect(restBounds.max.y - restBounds.min.y).toBeLessThan(2.35);
    const mixer = new AnimationMixer(model.scene);
    for (const name of ['Sword_Idle', 'Walk_Loop', 'Sword_Attack', 'Hit_Chest', 'Death01']) {
        const clip = model.animations.find(clip => clip.name === name);
        expect(clip).toBeDefined(); mixer.stopAllAction();
        mixer.clipAction(clip).setLoop(LoopOnce, 1).play().clampWhenFinished = true;
        for (const fraction of [0, .25, .5, .75, 1]) {
            mixer.setTime(clip.duration * fraction); model.scene.updateMatrixWorld(true);
            const bounds = new Box3().setFromObject(model.scene, true);
            expect([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite)).toBe(true);
            expect(bounds.min.y).toBeGreaterThan(-.02);
            expect(bounds.min.y).toBeLessThan(.03);
            if (name === 'Sword_Idle') {
                // The bent-knee combat guard is lower than the canonical standing height.
                expect(bounds.max.y).toBeGreaterThan(1.8);
                expect(bounds.max.y).toBeLessThan(2.35);
            }
            for (const feature of features.filter(node => node.parent.name.startsWith('foot_'))) {
                const hoof = new Box3().setFromObject(feature, true);
                const foot = model.scene.getObjectByName(feature.parent.name);
                const opposite = model.scene.getObjectByName(feature.parent.name === 'foot_l' ? 'foot_r' : 'foot_l');
                const centre = hoof.getCenter(foot.position.clone());
                const own = foot.getWorldPosition(foot.position.clone());
                const other = opposite.getWorldPosition(opposite.position.clone());
                // Catches accidentally binding the left hoof to the right foot (and vice versa).
                if (own.distanceTo(other) > .2) {
                    expect(centre.distanceTo(own)).toBeLessThan(centre.distanceTo(other));
                }
            }
        }
    }
});
