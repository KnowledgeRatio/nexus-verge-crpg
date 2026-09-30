import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture, Vector3 } from '../../vendor/three/three.module.min.js';
import { combatActionVisual, combatPresentationSnapshot } from '../../src/ui/CombatPresentation.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
const monsters = JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url))).monsters;
const items = JSON.parse(readFileSync(new URL('../../data/items.json', import.meta.url))).weapons;
const actor = { id: 'ettin', team: 'enemy', hp: 95, character: { monsterId: 'ettin' },
    toJSON: () => ({ id: 'ettin', team: 'enemy', hp: 95, maxHP: 95, engagedWith: [] }) };
const manager = { combatants: [actor], getCurrentCombatant: () => actor };

it('keeps both canonical weapons in their assigned hands across either attack', () => {
    for (const action of monsters.find(monster => monster.id === 'ettin').actions) {
        const visual = combatActionVisual(config, { weaponId: action.weaponId, kind: 'melee' }, 'ettin');
        const held = new Map([[actor.id, { weaponId: action.weaponId, visual }]]);
        const result = combatPresentationSnapshot(manager, config, { monsters, items }, held);
        expect(result.reason).toBe('');
        expect(result.state.combatants[0]).toMatchObject({ appearance: 'ettin', weaponModel: 'axe', offHandModel: 'morningstar' });
        expect(visual.weaponSlot).toBe(action.weaponId === 'morningstar' ? 'offHand' : 'mainHand');
    }
    expect(actor.character.equipment).toBeUndefined();
    const invalid = globalThis.structuredClone(config);
    invalid.appearances.ettin.loadout.offHand = 'longbow';
    const result = combatPresentationSnapshot(manager, invalid, { monsters, items });
    expect(result.state.combatants[0].offHandModel).toBeUndefined();
});

it('preserves finite grounded motion and mirrors the striking hand in the actual GLB', async () => {
    const bytes = readFileSync(new URL('../../data/graphics/combat/ettin-v1.glb', import.meta.url));
    globalThis.ProgressEvent ??= class ProgressEvent {};
    const gltf = await new GLTFLoader().register(() => ({ name: 'test-textures',
        loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const spec = config.artAssets.models.ettin, mixer = new AnimationMixer(gltf.scene);
    const handSamples = {};
    const motions = { idle: spec.motion.idle, walk: spec.motion.walk, ...spec.motion.actions };
    for (const [key, motion] of Object.entries(motions)) {
        const clip = gltf.animations.find(candidate => candidate.name === motion.clip);
        expect(clip).toBeDefined(); mixer.stopAllAction();
        mixer.clipAction(clip).setLoop(LoopOnce, 1).play().clampWhenFinished = true;
        for (const fraction of [0, .25, .5, .75, 1]) {
            mixer.setTime(clip.duration * fraction); gltf.scene.updateMatrixWorld(true);
            const bounds = new Box3().setFromObject(gltf.scene, true);
            expect([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite)).toBe(true);
            expect(bounds.min.y).toBeGreaterThan(-.03); expect(bounds.min.y).toBeLessThan(.04);
        }
        if (key.endsWith('Strike')) {
            mixer.stopAllAction(); mixer.clipAction(clip).play();
            mixer.setTime(clip.duration * motion.impact); gltf.scene.updateMatrixWorld(true);
            handSamples[key] = gltf.scene.getObjectByName(key === 'leftStrike' ? 'hand_l' : 'hand_r')
                .getWorldPosition(new Vector3());
        }
    }
    expect(handSamples.leftStrike.x).toBeCloseTo(-handSamples.rightStrike.x, 2);
    expect(handSamples.leftStrike.y).toBeCloseTo(handSamples.rightStrike.y, 2);
    expect(handSamples.leftStrike.z).toBeCloseTo(handSamples.rightStrike.z, 2);
});
