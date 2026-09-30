import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture, Vector3, Quaternion } from '../../vendor/three/three.module.min.js';

it.each(['anatomical-base-candidate', 'ghoul-anatomical-candidate', 'ghast-anatomical-candidate'])(
    '%s preserves anatomical deformation and a lower crouch through the adapted clips', async name => {
        const text = readFileSync(new URL(`../../tools/combat-art/${name}.gltf`, import.meta.url), 'utf8');
        globalThis.ProgressEvent ??= class ProgressEvent {};
        const loader = new GLTFLoader().register(() => ({ name: 'test-textures',
            loadTexture: () => Promise.resolve(new Texture()) }));
        const gltf = await loader.parseAsync(text, '');
        gltf.scene.updateMatrixWorld(true);
        const head = gltf.scene.getObjectByName('Head');
        const localForward = new Vector3(0, 0, 1).applyQuaternion(head.getWorldQuaternion(new Quaternion()).invert());
        const mixer = new AnimationMixer(gltf.scene), heights = new Map();
        for (const clip of gltf.animations) {
            mixer.stopAllAction();
            const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play();
            action.clampWhenFinished = true;
            for (const fraction of [0, .25, .5, .75, 1]) {
                mixer.setTime(clip.duration * fraction); gltf.scene.updateMatrixWorld(true);
                const box = new Box3().setFromObject(gltf.scene, true);
                expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
                expect(box.max.y - box.min.y).toBeLessThan(2.6);
                if (name !== 'anatomical-base-candidate') {
                    expect(box.min.y).toBeGreaterThan(-.004);
                    expect(box.min.y).toBeLessThan(.018);
                }
                if (name !== 'anatomical-base-candidate' && clip.name.startsWith('Crouch_')) {
                    const forward = localForward.clone().applyQuaternion(head.getWorldQuaternion(new Quaternion()));
                    expect(Math.abs(forward.y)).toBeLessThan(.15);
                }
                if (fraction === .5) {
                    heights.set(clip.name, box.max.y);
                }
            }
        }
        expect(heights.get('Crouch_Idle_Loop')).toBeLessThan(heights.get('Idle_Loop') * .85);
        expect(heights.get('Crouch_Fwd_Loop')).toBeLessThan(heights.get('Idle_Loop') * .85);
        expect(gltf.scene.getObjectByName('Head')).toBeDefined();
        if (name !== 'anatomical-base-candidate') {
            expect(gltf.scene.getObjectByName('BiteContact').parent).toBe(head);
            const samples = new Map();
            for (const clipName of ['Corpse_Bite', 'Corpse_Claw']) {
                mixer.stopAllAction();
                const clip = gltf.animations.find(candidate => candidate.name === clipName);
                mixer.clipAction(clip).setLoop(LoopOnce, 1).play().clampWhenFinished = true;
                const poses = [];
                for (const fraction of [0, .45, 1]) {
                    mixer.setTime(clip.duration * fraction); gltf.scene.updateMatrixWorld(true);
                    poses.push(Object.fromEntries(['BiteContact', 'hand_r', 'foot_l'].map(bone =>
                        [bone, gltf.scene.getObjectByName(bone).getWorldPosition(new Vector3())])));
                }
                for (const bone of ['BiteContact', 'hand_r', 'foot_l']) {
                    expect(poses[0][bone].distanceTo(poses[2][bone])).toBeLessThan(.001);
                }
                expect(poses[0].foot_l.distanceTo(poses[1].foot_l)).toBeLessThan(.01);
                samples.set(clipName, poses);
            }
            const claw = samples.get('Corpse_Claw'), bite = samples.get('Corpse_Bite');
            expect(claw[1].hand_r.z - claw[0].hand_r.z).toBeGreaterThan(.25);
            expect(claw[1].hand_r.y).toBeGreaterThan(.85);
            expect(bite[1].BiteContact.z - bite[0].BiteContact.z).toBeGreaterThan(.04);
            mixer.stopAllAction();
            const collapse = gltf.animations.find(clip => clip.name === 'Corpse_Death');
            mixer.clipAction(collapse).setLoop(LoopOnce, 1).play().clampWhenFinished = true;
            mixer.setTime(0); gltf.scene.updateMatrixWorld(true);
            expect(gltf.scene.getObjectByName('BiteContact').getWorldPosition(new Vector3())
                .distanceTo(bite[0].BiteContact)).toBeLessThan(.001);
            const crouchedHeight = new Box3().setFromObject(gltf.scene, true).max.y;
            const crouchedHip = gltf.scene.getObjectByName('pelvis').getWorldPosition(new Vector3()).y;
            for (const fraction of [.25, .5, .75, 1]) {
                mixer.setTime(collapse.duration * fraction); gltf.scene.updateMatrixWorld(true);
                // The head arcs upward briefly during the backward fall; the hips must not stand up.
                expect(gltf.scene.getObjectByName('pelvis').getWorldPosition(new Vector3()).y).toBeLessThan(crouchedHip + .02);
                expect(new Box3().setFromObject(gltf.scene, true).max.y).toBeLessThan(crouchedHeight + .2);
            }
            expect(new Box3().setFromObject(gltf.scene, true).max.y).toBeLessThan(.5);
            for (const side of ['l', 'r']) {
                for (const finger of ['index', 'middle', 'ring', 'pinky', 'thumb']) {
                    expect(gltf.scene.getObjectByName(`Claw_${finger}_${side}`).parent.name).toBe(`${finger}_03_${side}`);
                }
            }
        }
    });
