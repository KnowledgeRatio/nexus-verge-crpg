import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { Texture, Vector3, AnimationMixer, LoopOnce } from '../../vendor/three/three.module.min.js';
import { CombatAnimator } from '../../src/rendering/CombatAnimator.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
async function load(path) {
    const bytes = readFileSync(new URL(`../../${path}`, import.meta.url));
    return new GLTFLoader().register(() => ({ name: 'test-textures',
        loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}

it('preserves every original standing track and modular mesh in the grounded derivative', async () => {
    const original = await load('data/graphics/combat/traveller-modular.glb');
    const derived = await load(config.artAssets.models.traveller.url);
    for (const clip of original.animations) {
        const result = derived.animations.find(entry => entry.name === clip.name);
        expect(result.duration).toBe(clip.duration);
        expect(result.toJSON().tracks).toEqual(clip.toJSON().tracks);
    }
    const meshes = model => {
        const names = [];
        model.scene.traverse(node => {
            if (node.isMesh) {
                names.push(node.name);
            }
        });
        return names.sort();
    };
    expect(meshes(derived)).toEqual(meshes(original));
});

it('keeps the torso grounded throughout every authored armed and handed action', async () => {
    const gltf = await load(config.artAssets.models.traveller.url);
    const profile = config.artAssets.models.traveller.motion;
    const clips = new Set(Object.entries(profile.conditions.prone.actions)
        .filter(([key]) => key !== 'death').flatMap(([, entry]) => [entry.clip, ...Object.values(entry.handClips || {})]));
    expect(clips.size).toBeGreaterThan(15);
    const head = gltf.scene.getObjectByName(config.artAssets.models.traveller.joints.head);
    const mixer = new AnimationMixer(gltf.scene);
    for (const name of clips) {
        const clip = gltf.animations.find(entry => entry.name === name);
        expect(clip, name).toBeDefined();
        mixer.stopAllAction();
        mixer.clipAction(clip).reset().setLoop(LoopOnce, 1).play().clampWhenFinished = true;
        for (let frame = 0; frame <= 30; frame++) {
            mixer.setTime(clip.duration * frame / 30);
            gltf.scene.updateMatrixWorld(true);
            const height = head.getWorldPosition(new Vector3()).y;
            expect(height, `${name}: head height`).toBeLessThan(.8);
            expect(height, `${name}: head clearance`).toBeGreaterThan(.3);
        }
    }
    mixer.stopAllAction();
});

it('recovers from the supported pose, collapses from that pose at zero HP and can resume', async () => {
    const gltf = await load(config.artAssets.models.traveller.url);
    const animator = new CombatAnimator(gltf.scene, gltf.animations, config.artAssets.models.traveller.motion);
    const head = gltf.scene.getObjectByName(config.artAssets.models.traveller.joints.head);
    const height = () => {
        gltf.scene.updateMatrixWorld(true);
        return head.getWorldPosition(new Vector3()).y;
    };
    animator.setCondition('prone');
    const supported = height();
    animator.setCondition(null);
    expect(animator.presentation.action.getClip().name).toBe('Ground_GetUp');
    animator.update(3);
    expect(height()).toBeGreaterThan(supported + .6);
    animator.setCondition('prone');
    animator.playAction('death');
    expect(animator.presentation.action.getClip().name).toBe('Ground_Death');
    animator.update(1);
    expect(height()).toBeLessThan(supported - .2);
    expect(animator.held).toBe(true);
    animator.setCondition(null);
    animator.resume();
    animator.update(1);
    expect(height()).toBeGreaterThan(supported + .6);
    animator.update(0, { reducedMotion: true });
    animator.setCondition('prone');
    animator.playAction('meleeStab1h');
    expect(height()).toBeLessThan(.8);
    expect(animator.isBusy()).toBe(false);
    animator.dispose();
});
