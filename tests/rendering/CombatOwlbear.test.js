import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture, Vector3 } from '../../vendor/three/three.module.min.js';
import { combatActionVisual } from '../../src/ui/CombatPresentation.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
const monsters = JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url))).monsters;

describe('Owlbear presentation', () => {
    it('maps canonical Beak and Claws to distinct unarmed motions', () => {
        const motions = monsters.find(monster => monster.id === 'owlbear').actions.map(action => {
            const visual = combatActionVisual(config, { actionName: action.name, kind: 'melee' }, 'owlbear');
            expect(visual.model).toBe('unarmed');
            expect(config.artAssets.models.owlbear.motion.actions[visual.motion]).toBeDefined();
            return visual.motion;
        });
        expect(motions).toEqual(['beak', 'claws']);
        expect(config.monsterAppearance.owlbear).toBe('owlbear');
    });

    it('keeps every runtime clip grounded and moves the beak at impact', async () => {
        const bytes = readFileSync(new URL('../../data/graphics/combat/owlbear-v1.glb', import.meta.url));
        const loader = new GLTFLoader().register(() => ({ name: 'test-textures', loadTexture: () => Promise.resolve(new Texture()) }));
        const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        expect(gltf.animations).toHaveLength(6);
        const mixer = new AnimationMixer(gltf.scene);
        const sample = (clip, time) => {
            mixer.stopAllAction();
            mixer.clipAction(clip).reset().setLoop(LoopOnce, 1).play().clampWhenFinished = true;
            mixer.setTime(time); gltf.scene.updateMatrixWorld(true);
        };
        for (const clip of gltf.animations) {
            for (let i = 0; i <= 37; i++) {
                sample(clip, clip.duration * i / 37);
                const bounds = new Box3().setFromObject(gltf.scene, true);
                expect(bounds.min.y, clip.name).toBeGreaterThan(-.02);
                expect(bounds.min.y, clip.name).toBeLessThan(.025);
                expect(bounds.max.y, clip.name).toBeLessThan(3.2);
            }
        }
        const beak = gltf.animations.find(clip => clip.name === 'Owlbear_Beak');
        const mouth = gltf.scene.getObjectByName('BeakContact');
        sample(beak, 0); const rest = mouth.getWorldPosition(new Vector3());
        sample(beak, beak.duration * .45);
        expect(mouth.getWorldPosition(new Vector3()).distanceTo(rest)).toBeGreaterThan(.1);
        const clawMotion = config.artAssets.models.owlbear.motion.actions.claws;
        const claws = gltf.animations.find(clip => clip.name === clawMotion.clip);
        sample(claws, claws.duration * clawMotion.impact);
        const paw = gltf.scene.getObjectByName('Ursidae_Paw_R').getWorldPosition(new Vector3());
        expect(Math.abs(paw.x)).toBeLessThan(.1);
        expect(paw.z).toBeGreaterThan(1.7);
        expect(paw.y).toBeGreaterThan(.9);
        expect(config.animation.actionProfiles.owlClaws.impact).toBe(clawMotion.impact);
    });
});
