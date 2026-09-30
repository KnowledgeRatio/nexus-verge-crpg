import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { Texture, Vector3, Box3, AnimationMixer, LoopOnce } from '../../vendor/three/three.module.min.js';
import { CombatAnimator } from '../../src/rendering/CombatAnimator.js';

const read = path => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url)));
const config = read('data/combatScene.json');
const specs = read('tools/combat-art/groundedHumanoidSpecs.json');
async function load(path) {
    const bytes = readFileSync(new URL(`../../${path}`, import.meta.url));
    return new GLTFLoader().register(() => ({ name: 'test-textures',
        loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}

it.each(Object.keys(specs))('preserves the %s body and original action tracks in its grounded derivative', async id => {
    const original = await load(specs[id].source);
    const runtime = config.artAssets.models[id];
    const packaged = readFileSync(new URL(`../../${runtime.url}`, import.meta.url));
    const candidate = readFileSync(new URL(`../../tools/combat-art/${id}-grounded-candidate.glb`, import.meta.url));
    expect(packaged.equals(candidate)).toBe(true);
    expect(runtime.motion).toEqual(read(`tools/combat-art/${id}-grounded-motion.json`));
    const derived = await load(runtime.url);
    for (const clip of original.animations) {
        const result = derived.animations.find(entry => entry.name === clip.name);
        expect(result.duration).toBe(clip.duration);
        expect(result.toJSON().tracks).toEqual(clip.toJSON().tracks);
    }
    const meshes = model => {
        const result = [];
        model.scene.traverse(node => {
            if (node.isMesh) {
                result.push([node.name, node.geometry.attributes.position.count]);
            }
        });
        return result;
    };
    expect(meshes(derived)).toEqual(meshes(original));
});

it.each(Object.keys(specs))('keeps %s actions supported on the floor, then recovers or collapses', async id => {
    const gltf = await load(config.artAssets.models[id].url);
    const profile = config.artAssets.models[id].motion;
    const mixer = new AnimationMixer(gltf.scene);
    const head = gltf.scene.getObjectByName(config.artAssets.models[id].joints.head);
    const height = () => head.getWorldPosition(new Vector3()).y;
    for (const clip of gltf.animations.filter(entry => entry.name.startsWith('Ground_') && entry.name !== 'Ground_GetUp')) {
        mixer.stopAllAction();
        mixer.clipAction(clip).reset().setLoop(LoopOnce, 1).play().clampWhenFinished = true;
        for (let frame = 0; frame <= 12; frame++) {
            mixer.setTime(clip.duration * frame / 12); gltf.scene.updateMatrixWorld(true);
            expect(height(), `${id}/${clip.name} height`).toBeLessThan(.85);
            expect(new Box3().setFromObject(gltf.scene, true).min.y,
                `${id}/${clip.name} floor`).toBeCloseTo(.004, 2);
        }
    }
    mixer.stopAllAction();
    const animator = new CombatAnimator(gltf.scene, gltf.animations, profile);
    animator.setCondition('prone');
    animator.setCondition(null);
    expect(animator.presentation.action.getClip().name).toBe('Ground_GetUp');
    animator.update(3); gltf.scene.updateMatrixWorld(true);
    expect(height()).toBeGreaterThan(1.3);
    animator.setCondition('prone');
    animator.playAction('death'); animator.update(1); gltf.scene.updateMatrixWorld(true);
    expect(animator.held).toBe(true);
    expect(height()).toBeLessThan(.4);
    animator.dispose();
});
