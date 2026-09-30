import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce } from '../../vendor/three/three.module.min.js';
import { combatActionVisual, combatPresentationSnapshot } from '../../src/ui/CombatPresentation.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
const monsters = JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url))).monsters;
describe('Shadow presentation', () => {
    it('retains an unlit faceless silhouette through shared motion and a timed reaching attack', async () => {
        const bytes = readFileSync(new URL('../../data/graphics/combat/shadow-v1.glb', import.meta.url));
        const gltf = await new GLTFLoader().parseAsync(
            bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        gltf.scene.traverse(node => {
            if (node.isMesh) {
                expect(node.material.isMeshBasicMaterial).toBe(true);
                expect(node.material.map).toBeNull();
                expect(node.material.color.r).toBeLessThan(.02);
            }
        });
        const mixer = new AnimationMixer(gltf.scene);
        for (const name of ['Idle_Loop', 'Walk_Loop', 'Spell_Simple_Shoot', 'Hit_Chest', 'Death01']) {
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
            }
        }
        const visual = combatActionVisual(config, { kind: 'melee', actionName: 'Strength Drain' }, 'shadow');
        expect(visual.motion).toBe('drain');
        const motion = config.artAssets.models.shadow.motion.actions.drain;
        const clip = gltf.animations.find(c => c.name === motion.clip);
        expect(clip.duration / motion.timeScale).toBeCloseTo(config.animation.actionProfiles[visual.action].seconds, 3);
        expect(motion.impact).toBe(config.animation.actionProfiles[visual.action].impact);
        expect(config.artAssets.models.shadow.castShadow).toBe(false);
    });

    it('admits the canonical Shadow with no held weapon', () => {
        const actor = { id: 'shadow', team: 'enemy', hp: 16, character: { monsterId: 'shadow' },
            toJSON: () => ({ id: 'shadow', team: 'enemy', hp: 16, maxHP: 16, engagedWith: [] }) };
        const snapshot = combatPresentationSnapshot({ combatants: [actor], getCurrentCombatant: () => actor },
            config, { monsters, items: [] });
        expect(snapshot.reason).toBe('');
        expect(snapshot.state.combatants[0].appearance).toBe('shadow');
        expect(config.artAssets.characterModels).toContain('shadow');
        expect(monsters.find(m => m.id === 'shadow').conditionImmunities).toContain('prone');
    });
});
