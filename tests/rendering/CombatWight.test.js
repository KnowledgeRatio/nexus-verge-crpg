import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture } from '../../vendor/three/three.module.min.js';
import { combatActionVisual, combatPresentationSnapshot } from '../../src/ui/CombatPresentation.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
const monsters = JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url))).monsters;
const items = JSON.parse(readFileSync(new URL('../../data/items.json', import.meta.url))).weapons;
describe('Wight presentation', () => {
    it('admits canonical equipment and resolves all three canonical attacks', () => {
        const monster = monsters.find(m => m.id === 'wight');
        for (const weaponId of ['longsword', 'longbow']) {
            const actor = { id: 'wight', team: 'enemy', hp: 45,
                character: { monsterId: 'wight', equipment: { mainHand: { id: weaponId } } },
                toJSON: () => ({ id: 'wight', team: 'enemy', hp: 45, maxHP: 45, engagedWith: [] }) };
            const snapshot = combatPresentationSnapshot({ combatants: [actor], getCurrentCombatant: () => actor },
                config, { monsters, items });
            expect(snapshot.reason).toBe('');
            expect(snapshot.state.combatants[0].appearance).toBe('wight');
        }
        for (const action of monster.actions) {
            const visual = combatActionVisual(config, { weaponId: action.weaponId,
                actionName: action.name, kind: action.type === 'rangedWeaponAttack' ? 'ranged' : 'melee' }, 'wight');
            expect(config.artAssets.models.wight.motion.actions[visual.motion]).toBeDefined();
            if (!action.weaponId) {
                expect(visual.model).toBe('unarmed'); expect(visual.motion).toBe('drain');
            }
        }
    });

    it('loads the authored armour and shared motions with finite bounds and aligned drain timing', async () => {
        const bytes = readFileSync(new URL('../../data/graphics/combat/wight-v1.glb', import.meta.url));
        const loader = new GLTFLoader().register(() => ({ name: 'test-texture-decoder', loadTexture: () => Promise.resolve(new Texture()) }));
        const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        const mixer = new AnimationMixer(gltf.scene);
        const materials = new Set();
        gltf.scene.traverse(node => {
            if (node.material) {
                materials.add(node.material.name);
            }
        });
        expect(materials.has('Wight aged iron mail')).toBe(true);
        expect(materials.has('Wight frost glass eyes')).toBe(true);
        for (const name of ['Sword_Idle', 'Melee_1H_Attack_Slice_Diagonal', 'Ranged_Bow_Shot', 'Spell_Simple_Shoot', 'Walk_Loop', 'Death01', 'Prone_Idle']) {
            const clip = gltf.animations.find(c => c.name === name);
            expect(clip).toBeDefined(); mixer.stopAllAction();
            mixer.clipAction(clip).setLoop(LoopOnce, 1).play().clampWhenFinished = true;
            for (let i = 0; i <= 4; i++) {
                mixer.setTime(clip.duration * i / 4); gltf.scene.updateMatrixWorld(true);
                const box = new Box3().setFromObject(gltf.scene, true);
                expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
                expect(box.max.y - box.min.y).toBeLessThan(2.5);
            }
        }
        const motion = config.artAssets.models.wight.motion.actions.drain;
        const profile = config.animation.actionProfiles.shadowDrain;
        const clip = gltf.animations.find(c => c.name === motion.clip);
        expect(clip.duration / motion.timeScale).toBeCloseTo(profile.seconds, 3);
        expect(motion.impact).toBe(profile.impact);
    });
});
