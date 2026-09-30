import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce } from '../../vendor/three/three.module.min.js';
import { combatActionVisual, combatPresentationSnapshot } from '../../src/ui/CombatPresentation.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
const monsters = JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url))).monsters;
describe('Wraith presentation', () => {
    it('has a dark tapered lower body without feet and remains finite through its four spirit clips', async () => {
        const bytes = readFileSync(new URL('../../data/graphics/combat/wraith-v1.glb', import.meta.url));
        const gltf = await new GLTFLoader().parseAsync(
            bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        let lowerVertices = 0, lowerWidth = 0;
        gltf.scene.traverse(node => {
            if (!node.isSkinnedMesh) {
                return;
            }
            expect(node.material.color.r).toBeLessThan(.03);
            expect(node.material.transparent).toBe(true);
            const positions = node.geometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
                if (positions.getY(i) < .3) {
                    lowerVertices++;
                    lowerWidth = Math.max(lowerWidth, Math.abs(positions.getX(i)));
                }
            }
        });
        expect(lowerVertices).toBeGreaterThan(0);
        expect(lowerWidth).toBeLessThan(.08);
        const mixer = new AnimationMixer(gltf.scene);
        for (const clip of gltf.animations) {
            mixer.stopAllAction();
            const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play();
            action.clampWhenFinished = true;
            for (let i = 0; i <= 10; i++) {
                mixer.setTime(clip.duration * i / 10); gltf.scene.updateMatrixWorld(true);
                const box = new Box3().setFromObject(gltf.scene, true);
                expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
                expect(box.max.y - box.min.y).toBeLessThan(2.5);
            }
        }
        expect(gltf.animations.map(clip => clip.name).sort()).toEqual([
            'Hit_Chest', 'Specter_Still', 'Specter_Vanish', 'Spell_Simple_Shoot'
        ]);
    });

    it('admits the canonical Wraith and presents Life Drain with the shared reach', () => {
        const actor = { id: 'wraith', team: 'enemy', hp: 67, character: { monsterId: 'wraith' },
            toJSON: () => ({ id: 'wraith', team: 'enemy', hp: 67, maxHP: 67, engagedWith: [] }) };
        const snapshot = combatPresentationSnapshot({ combatants: [actor], getCurrentCombatant: () => actor },
            config, { monsters, items: [] });
        expect(snapshot.reason).toBe('');
        expect(snapshot.state.combatants[0].appearance).toBe('wraith');
        expect(combatActionVisual(config, { kind: 'melee', actionName: 'Life Drain' }, 'wraith').motion).toBe('drain');
        expect(config.artAssets.models.wraith.motion.walk.clip).toBe('Specter_Still');
    });
});
