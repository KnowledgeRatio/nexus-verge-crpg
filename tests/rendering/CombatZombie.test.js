import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture } from '../../vendor/three/three.module.min.js';
import { combatActionVisual, combatPresentationSnapshot } from '../../src/ui/CombatPresentation.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
const monsters = JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url))).monsters;
describe('Zombie presentation', () => {
    it('uses a downward Slam clip and preserves finite grounded motion through its existing combat states', async () => {
        const bytes = readFileSync(new URL('../../data/graphics/combat/zombie-v1.glb', import.meta.url));
        const loader = new GLTFLoader().register(() => ({ name: 'test-texture-decoder',
            loadTexture: () => Promise.resolve(new Texture()) }));
        const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        const mixer = new AnimationMixer(gltf.scene);
        for (const name of ['Zombie_Idle', 'Zombie_Walk', 'Zombie_Slam', 'Hit_Chest', 'Death01', 'Prone_Idle']) {
            const clip = gltf.animations.find(c => c.name === name);
            expect(clip).toBeDefined();
            mixer.stopAllAction();
            const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play();
            action.clampWhenFinished = true;
            for (let i = 0; i <= 20; i++) {
                mixer.setTime(clip.duration * i / 20); gltf.scene.updateMatrixWorld(true);
                const box = new Box3().setFromObject(gltf.scene, true);
                expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
                expect(box.max.y - box.min.y).toBeLessThan(2.5);
                expect(box.min.y).toBeGreaterThan(-.15);
                expect(box.min.y).toBeLessThan(.15);
            }
        }
        const visual = combatActionVisual(config, { kind: 'melee', actionName: 'Slam' }, 'zombie');
        expect(visual.motion).toBe('slam');
        const motion = config.artAssets.models.zombie.motion.actions.slam;
        const clip = gltf.animations.find(c => c.name === motion.clip);
        expect(clip.duration / motion.timeScale).toBeCloseTo(config.animation.actionProfiles[visual.action].seconds, 3);
        expect(motion.impact).toBe(config.animation.actionProfiles[visual.action].impact);
    });

    it('admits the canonical unarmed zombie and preloads its distinct body', () => {
        const actor = { id: 'zombie', team: 'enemy', hp: 22, character: { monsterId: 'zombie' },
            toJSON: () => ({ id: 'zombie', team: 'enemy', hp: 22, maxHP: 22, engagedWith: [] }) };
        const snapshot = combatPresentationSnapshot({ combatants: [actor], getCurrentCombatant: () => actor },
            config, { monsters, items: [] });
        expect(snapshot.reason).toBe('');
        expect(snapshot.state.combatants[0].appearance).toBe('zombie');
        expect(config.artAssets.characterModels).toContain('zombie');
        expect(config.artAssets.models.zombie.headAim).toBe(false);
    });
});
