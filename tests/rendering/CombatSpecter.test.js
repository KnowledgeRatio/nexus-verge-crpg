import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce } from '../../vendor/three/three.module.min.js';
import { combatActionVisual, combatPresentationSnapshot } from '../../src/ui/CombatPresentation.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
const monsters = JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url))).monsters;
describe('Specter presentation', () => {
    it('uses one connected surface with normalized skin weights rather than overlapping body pieces', async () => {
        const bytes = readFileSync(new URL('../../data/graphics/combat/specter-v1.glb', import.meta.url));
        const gltf = await new GLTFLoader().parseAsync(
            bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        const parents = new Map();
        const root = key => {
            if (!parents.has(key)) {
                parents.set(key, key);
            }
            let result = key;
            while (parents.get(result) !== result) {
                result = parents.get(result);
            }
            let next = key;
            while (parents.get(next) !== result) {
                const previous = parents.get(next); parents.set(next, result); next = previous;
            }
            return result;
        };
        gltf.scene.traverse(node => {
            if (!node.isSkinnedMesh) {
                return;
            }
            const p = node.geometry.attributes.position, weights = node.geometry.attributes.skinWeight;
            const indexBuffer = node.geometry.index;
            for (let i = 0; i < (indexBuffer?.count ?? p.count); i += 3) {
                const vertices = [i, i + 1, i + 2]
                    .map(index => indexBuffer ? indexBuffer.getX(index) : index).map(index =>
                        [p.getX(index), p.getY(index), p.getZ(index)].map(v => Math.round(v * 100000)).join(','));
                for (const vertex of vertices.slice(1)) {
                    parents.set(root(vertex), root(vertices[0]));
                }
            }
            let weightError = 0;
            for (let i = 0; i < weights.count; i++) {
                weightError = Math.max(weightError,
                    Math.abs(weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i) - 1));
            }
            expect(weightError).toBeLessThan(.00001);
        });
        expect(new Set([...parents.keys()].map(root)).size).toBe(1);
    });

    it('stands still, remains translucent and vanishes on defeat', async () => {
        const bytes = readFileSync(new URL('../../data/graphics/combat/specter-v1.glb', import.meta.url));
        const gltf = await new GLTFLoader().parseAsync(
            bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        gltf.scene.traverse(node => {
            if (node.isMesh) {
                expect(node.material.transparent).toBe(true);
                expect(node.material.opacity).toBeCloseTo(.33);
            }
        });
        const mixer = new AnimationMixer(gltf.scene);
        const still = gltf.animations.find(c => c.name === 'Specter_Still');
        mixer.clipAction(still).play();
        mixer.setTime(.1); gltf.scene.updateMatrixWorld(true);
        const before = new Box3().setFromObject(gltf.scene, true);
        mixer.setTime(1.7); gltf.scene.updateMatrixWorld(true);
        const after = new Box3().setFromObject(gltf.scene, true);
        expect(after.min.distanceTo(before.min)).toBeLessThan(.0001);
        expect(after.max.distanceTo(before.max)).toBeLessThan(.0001);
        mixer.stopAllAction();
        const death = gltf.animations.find(c => c.name === 'Specter_Vanish');
        const action = mixer.clipAction(death).setLoop(LoopOnce, 1).play();
        action.clampWhenFinished = true;
        mixer.setTime(death.duration); gltf.scene.updateMatrixWorld(true);
        const gone = new Box3().setFromObject(gltf.scene, true);
        expect(gone.max.y - gone.min.y).toBeLessThan(.003);
    });

    it('uses canonical Life Drain and shares a still pose for gliding', () => {
        const actor = { id: 'specter', team: 'enemy', hp: 22, character: { monsterId: 'specter' },
            toJSON: () => ({ id: 'specter', team: 'enemy', hp: 22, maxHP: 22, engagedWith: [] }) };
        const snapshot = combatPresentationSnapshot({ combatants: [actor], getCurrentCombatant: () => actor },
            config, { monsters, items: [] });
        expect(snapshot.reason).toBe('');
        expect(snapshot.state.combatants[0].appearance).toBe('specter');
        expect(combatActionVisual(config, { kind: 'melee', actionName: 'Life Drain' }, 'specter').motion).toBe('drain');
        const motion = config.artAssets.models.specter.motion;
        expect(motion.walk.clip).toBe(motion.idle.clip);
    });
});
