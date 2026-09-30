import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture } from '../../vendor/three/three.module.min.js';
import { combatActionVisual } from '../../src/ui/CombatPresentation.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
const monsters = JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url))).monsters;

describe('Medusa presentation', () => {
    it('resolves canonical bow and Snake Hair attacks to distinct motions', () => {
        for (const action of monsters.find(monster => monster.id === 'medusa').actions) {
            const visual = combatActionVisual(config, { weaponId: action.weaponId,
                actionName: action.name, kind: action.type === 'rangedWeaponAttack' ? 'ranged' : 'melee' }, 'medusa');
            expect(config.artAssets.models.medusa.motion.actions[visual.motion]).toBeDefined();
            expect(visual.model).toBe(action.weaponId ? 'bow' : 'unarmed');
            if (!action.weaponId) {
                expect(visual.motion).toBe('snake');
            }
        }
    });

    it('animates nine serpents and keeps configured upright motions grounded', async () => {
        const bytes = readFileSync(new URL('../../data/graphics/combat/medusa-v1.glb', import.meta.url));
        const loader = new GLTFLoader().register(() => ({ name: 'test-textures', loadTexture: () => Promise.resolve(new Texture()) }));
        const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        const serpents = [];
        gltf.scene.traverse(node => {
            if (/^Serpent\d+$/.test(node.name)) {
                serpents.push(node);
            }
        });
        expect(serpents).toHaveLength(9);
        const mixer = new AnimationMixer(gltf.scene);
        const sample = (name, time) => {
            mixer.stopAllAction();
            mixer.clipAction(gltf.animations.find(clip => clip.name === name)).reset()
                .setLoop(LoopOnce, 1).play().clampWhenFinished = true;
            mixer.setTime(time); gltf.scene.updateMatrixWorld(true);
        };
        sample('Serpent_Strike', 0);
        expect(serpents[0].morphTargetInfluences[0]).toBeCloseTo(0);
        const motion = config.artAssets.models.medusa.motion.actions.snake;
        const clip = gltf.animations.find(animation => animation.name === motion.clip);
        sample(motion.clip, clip.duration * motion.impact);
        for (const serpent of serpents) {
            expect(serpent.morphTargetInfluences[0]).toBeGreaterThan(.98);
        }
        sample('Ranged_Bow_Idle', 0);
        const idle = serpents.map(serpent => serpent.morphTargetInfluences[0]);
        sample('Ranged_Bow_Idle', .3);
        expect(serpents.some((serpent, index) => Math.abs(serpent.morphTargetInfluences[0] - idle[index]) > .001)).toBe(true);
        for (const name of ['Serpent_Strike', 'Ranged_Bow_Shot', 'Walk_Loop', 'Hit_Chest', 'Death01']) {
            const animation = gltf.animations.find(candidate => candidate.name === name);
            for (let i = 0; i <= 8; i++) {
                sample(name, animation.duration * i / 8);
                const box = new Box3().setFromObject(gltf.scene, true);
                expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
                expect(Math.abs(box.min.y)).toBeLessThan(.035);
            }
        }
    });

    it('retains the snake strike while prone and relaxes the crown on defeat', async () => {
        const model = config.artAssets.models.medusa;
        const bytes = readFileSync(new URL(`../../${model.url}`, import.meta.url));
        const gltf = await new GLTFLoader().register(() => ({ name: 'test-textures',
            loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(
            bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        const snakes = Array.from({ length: 9 }, (_, i) => gltf.scene.getObjectByName(`Serpent${i + 1}`));
        const mixer = new AnimationMixer(gltf.scene);
        const sample = (name, phase) => {
            const clip = gltf.animations.find(entry => entry.name === name);
            mixer.stopAllAction();
            mixer.clipAction(clip).reset().setLoop(LoopOnce, 1).play().clampWhenFinished = true;
            mixer.setTime(clip.duration * phase); gltf.scene.updateMatrixWorld(true);
            return snakes.reduce((box, snake) => box.union(new Box3().setFromObject(snake, true)), new Box3());
        };
        const prone = model.motion.conditions.prone;
        const rest = sample(prone.actions.snake.clip, 0);
        const impact = sample(prone.actions.snake.clip, model.motion.actions.snake.impact);
        expect(snakes.every(snake => snake.morphTargetInfluences[0] > .98)).toBe(true);
        expect(impact.max.z - rest.max.z).toBeGreaterThan(.15);
        expect(impact.max.z).toBeGreaterThan(.35);
        sample(prone.actions.death.clip, 1);
        expect(snakes.every(snake => snake.morphTargetInfluences[0] === 0)).toBe(true);
    });
});
