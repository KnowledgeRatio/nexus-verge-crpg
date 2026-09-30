import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, Group, LoopOnce, Texture, Vector3 } from '../../vendor/three/three.module.min.js';
import { combatActionVisual, combatPresentationSnapshot } from '../../src/ui/CombatPresentation.js';
import { planContact } from '../../src/rendering/CombatContact.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
const monsters = JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url))).monsters;
const items = JSON.parse(readFileSync(new URL('../../data/items.json', import.meta.url))).weapons;

it('admits the Minotaur and resolves its canonical axe and separate Gore', () => {
    const actor = { id: 'minotaur', team: 'enemy', hp: 76,
        character: { monsterId: 'minotaur', equipment: { mainHand: { id: 'greataxe' } } },
        toJSON: () => ({ id: 'minotaur', team: 'enemy', hp: 76, maxHP: 76, engagedWith: [] }) };
    const snapshot = combatPresentationSnapshot({ combatants: [actor], getCurrentCombatant: () => actor },
        config, { monsters, items });
    expect(snapshot.reason).toBe('');
    expect(snapshot.state.combatants[0].appearance).toBe('minotaur');
    expect(snapshot.state.combatants[0].weaponModel).toBe('axe');
    const resolved = monsters.find(m => m.id === 'minotaur').actions.map(action =>
        combatActionVisual(config, { kind: 'melee', actionName: action.name, weaponId: action.weaponId }, 'minotaur'));
    expect(resolved.map(v => v.model)).toEqual(['axe', 'unarmed']);
    expect(resolved.map(v => v.motion)).toEqual(['axe', 'gore']);
});

it('loads all configured motion and places the horn inside striking range at impact', async () => {
    const bytes = readFileSync(new URL('../../data/graphics/combat/minotaur-v1.glb', import.meta.url));
    globalThis.ProgressEvent ??= class ProgressEvent {};
    const gltf = await new GLTFLoader().register(() => ({ name: 'test-textures',
        loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const spec = config.artAssets.models.minotaur, mixer = new AnimationMixer(gltf.scene);
    expect(gltf.scene.getObjectByName('GiantClub')?.isMesh).not.toBe(true);
    for (const motion of [spec.motion.idle, spec.motion.walk, ...Object.values(spec.motion.actions)]) {
        const clip = gltf.animations.find(c => c.name === motion.clip);
        expect(clip).toBeDefined(); mixer.stopAllAction();
        mixer.clipAction(clip).setLoop(LoopOnce, 1).play().clampWhenFinished = true;
        for (const fraction of [0, .25, .5, .75, 1]) {
            mixer.setTime(clip.duration * fraction); gltf.scene.updateMatrixWorld(true);
            const box = new Box3().setFromObject(gltf.scene, true);
            expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
            expect(box.min.y).toBeGreaterThan(-.025); expect(box.min.y).toBeLessThan(.035);
        }
    }
    const contact = config.appearances.minotaur.contact;
    const source = { id: 'source', x: 3, z: 0, radius: contact.bodyRadius, reach: contact.reach };
    const target = { id: 'target', x: 0, z: 0, radius: config.contact.bodyRadius };
    const goal = planContact(source, target, [source, target], config.contact).at(-1);
    const group = new Group(); group.position.set(goal.x, 0, goal.z);
    group.rotation.y = Math.atan2(-goal.x, -goal.z); group.add(gltf.scene);
    const clip = gltf.animations.find(c => c.name === spec.motion.actions.gore.clip);
    const profile = config.animation.actionProfiles.hornGore;
    expect(clip.duration).toBeCloseTo(profile.seconds, 5);
    mixer.stopAllAction(); mixer.clipAction(clip).play(); mixer.setTime(clip.duration * profile.impact);
    group.updateMatrixWorld(true);
    const point = gltf.scene.getObjectByName('HornContact').getWorldPosition(new Vector3());
    expect(Math.hypot(point.x, point.z)).toBeLessThan(.35);
    expect(point.y).toBeGreaterThan(1); expect(point.y).toBeLessThan(1.6);
});
