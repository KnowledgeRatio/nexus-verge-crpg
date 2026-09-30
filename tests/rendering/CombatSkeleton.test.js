import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce } from '../../vendor/three/three.module.min.js';
import { combatPresentationSnapshot, combatActionVisual } from '../../src/ui/CombatPresentation.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
const monsters = JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url))).monsters;
const items = JSON.parse(readFileSync(new URL('../../data/items.json', import.meta.url))).weapons;

describe('Original skeleton combat body', () => {
    it('loads all shared humanoid clips and remains finite through sword, bow, walk and death poses', async () => {
        const bytes = readFileSync(new URL('../../data/graphics/combat/skeleton-v1.glb', import.meta.url));
        const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        expect(gltf.animations.length).toBe(44);
        const mixer = new AnimationMixer(gltf.scene);
        for (const name of ['Sword_Idle', 'Ranged_Bow_Shot', 'Walk_Loop', 'Death01', 'Prone_Idle']) {
            const clip = gltf.animations.find(c => c.name === name);
            expect(clip).toBeDefined();
            mixer.stopAllAction();
            const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play();
            action.clampWhenFinished = true;
            for (let i = 0; i <= 10; i++) {
                mixer.setTime(clip.duration * i / 10); gltf.scene.updateMatrixWorld(true);
                const bounds = new Box3().setFromObject(gltf.scene, true);
                expect([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite)).toBe(true);
                expect(bounds.max.y - bounds.min.y).toBeGreaterThan(.1);
                expect(bounds.max.y - bounds.min.y).toBeLessThan(2.5);
            }
        }
    });

    it.each(['shortsword', 'shortbow'])('admits the skeleton with canonical %s equipment and motion', weaponId => {
        const actor = { id: 'skeleton', team: 'enemy', hp: 13,
            character: { monsterId: 'skeleton', equipment: { mainHand: { id: weaponId } } },
            toJSON: () => ({ id: 'skeleton', team: 'enemy', hp: 13, maxHP: 13, engagedWith: [] }) };
        const snapshot = combatPresentationSnapshot({ combatants: [actor], getCurrentCombatant: () => actor },
            config, { monsters, items });
        expect(snapshot.reason).toBe('');
        expect(snapshot.state.combatants[0].appearance).toBe('skeleton');
        const action = combatActionVisual(config, { weaponId }, 'skeleton');
        expect(config.artAssets.models.skeleton.motion.actions[action.motion]).toBeDefined();
        expect(config.artAssets.characterModels).toContain('skeleton');
    });
});
