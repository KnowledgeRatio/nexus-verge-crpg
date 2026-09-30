import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Vector3 } from '../../vendor/three/three.module.min.js';
import { combatActionVisual, combatPresentationSnapshot } from '../../src/ui/CombatPresentation.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
const monsters = JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url))).monsters;
describe('Floating flameskull', () => {
    it('keeps a hand-sized skull and mouth socket at eye level, then falls and extinguishes on defeat', async () => {
        const b = readFileSync(new URL('../../data/graphics/combat/flameskull-v1.glb', import.meta.url));
        const gltf = await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
        const mixer = new AnimationMixer(gltf.scene);
        for (const name of ['Float', 'Fire', 'Hit']) {
            mixer.stopAllAction();
            const clip = gltf.animations.find(c => c.name === name);
            const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play(); action.clampWhenFinished = true;
            for (let i = 0; i <= 10; i++) {
                mixer.setTime(clip.duration * i / 10); gltf.scene.updateMatrixWorld(true);
                const box = new Box3().setFromObject(gltf.scene, true);
                expect(box.max.y - box.min.y).toBeLessThan(.3);
                expect(box.min.y).toBeGreaterThan(1.3);
                expect(gltf.scene.getObjectByName('RayOrigin').getWorldPosition(new Vector3()).y).toBeGreaterThan(1.4);
                expect(gltf.scene.getObjectByName('EyeFire').scale.x).toBe(1);
            }
        }
        mixer.stopAllAction();
        const death = mixer.clipAction(gltf.animations.find(c => c.name === 'Death')).setLoop(LoopOnce, 1).play();
        death.clampWhenFinished = true; mixer.setTime(1); gltf.scene.updateMatrixWorld(true);
        expect(gltf.scene.getObjectByName('EyeFire').scale.x).toBe(0);
        const fallen = new Box3().setFromObject(gltf.scene, true);
        expect(fallen.min.y).toBeGreaterThan(-.02);
        expect(fallen.min.y).toBeLessThan(.04);
    });
    it('admits the canonical tiny creature and maps both implemented actions to its firing motion', () => {
        const actor = { id: 'skull', team: 'enemy', hp: 49, character: { monsterId: 'flameskull' },
            toJSON: () => ({ id: 'skull', team: 'enemy', hp: 49, maxHP: 49, engagedWith: [] }) };
        const snapshot = combatPresentationSnapshot({ combatants: [actor], getCurrentCombatant: () => actor },
            config, { monsters, items: [] });
        expect(snapshot.reason).toBe('');
        expect(snapshot.state.combatants[0].appearance).toBe('flameskull');
        for (const action of monsters.find(m => m.id === 'flameskull').actions) {
            const visual = combatActionVisual(config, { actionName: action.name }, 'flameskull');
            expect(config.artAssets.models.flameskull.motion.actions[visual.motion].clip).toBe('Fire');
            expect(config.animation.actionProfiles[visual.action].arcHeight).toBe(0);
        }
    });
});
