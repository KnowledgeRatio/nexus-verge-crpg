import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture } from '../../vendor/three/three.module.min.js';
import { combatPresentationSnapshot, combatActionVisual } from '../../src/ui/CombatPresentation.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
describe('Giant hyena presentation', () => {
    it('retains grounded reusable motions and an embedded original coat texture', async () => {
        const bytes = readFileSync(new URL('../../data/graphics/combat/giant-hyena-v1.glb', import.meta.url));
        const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
        expect(json.images[0].bufferView).toBeDefined();
        expect(json.images[0].uri).toBeUndefined();
        const loader = new GLTFLoader().register(() => ({ name: 'test-textures', loadTexture: () => Promise.resolve(new Texture()) }));
        const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        const mixer = new AnimationMixer(gltf.scene);
        for (const clip of gltf.animations) {
            mixer.stopAllAction();
            const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play(); action.clampWhenFinished = true;
            for (let i = 0; i <= 20; i++) {
                mixer.setTime(clip.duration * i / 20); gltf.scene.updateMatrixWorld(true);
                const box = new Box3().setFromObject(gltf.scene, true);
                expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
                expect(box.min.y).toBeGreaterThan(-.025);
                expect(box.min.y).toBeLessThan(.04);
            }
        }
        expect(config.monsterAppearance.giantHyena).toBe('giantHyena');
        expect(config.artAssets.characterModels).toContain('giantHyena');
    });
    it('admits the canonical large beast with its own footprint and Bite mapping', () => {
        const monsters = JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url))).monsters;
        const actor = { id: 'hyena', team: 'enemy', hp: 39, character: { monsterId: 'giantHyena' },
            toJSON: () => ({ id: 'hyena', team: 'enemy', hp: 39, maxHP: 39, engagedWith: [] }) };
        const snapshot = combatPresentationSnapshot({ combatants: [actor], getCurrentCombatant: () => actor },
            config, { monsters, items: [] });
        expect(snapshot.reason).toBe('');
        expect(snapshot.state.combatants[0].appearance).toBe('giantHyena');
        const visual = combatActionVisual(config, { actionName: 'Bite', kind: 'melee' }, 'giantHyena');
        expect(config.artAssets.models.giantHyena.motion.actions[visual.motion].clip).toBe('Attack');
        expect(config.appearances.giantHyena.footprintRadius).toBeGreaterThan(config.appearances.wolf.footprintRadius);
    });
});
