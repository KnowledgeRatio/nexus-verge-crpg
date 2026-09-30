import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture } from '../../vendor/three/three.module.min.js';
import { combatActionVisual, combatPresentationSnapshot } from '../../src/ui/CombatPresentation.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
it('grounds the six-metre Hill Giant through all configured actions and selects its canonical rock', async () => {
    const bytes = readFileSync(new URL('../../data/graphics/combat/hillGiant-v1.glb', import.meta.url));
    globalThis.ProgressEvent ??= class ProgressEvent {};
    const gltf = await new GLTFLoader().register(() => ({ name: 'test-textures',
        loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    gltf.scene.updateMatrixWorld(true);
    const standing = new Box3().setFromObject(gltf.scene.getObjectByName('SuperHero_Male'), true);
    expect(standing.max.y - standing.min.y).toBeGreaterThan(5.8);
    expect(standing.max.y - standing.min.y).toBeLessThan(6.5);
    const motion = config.artAssets.models.hillGiant.motion, mixer = new AnimationMixer(gltf.scene);
    for (const spec of [motion.idle, motion.walk, ...Object.values(motion.actions)]) {
        const clip = gltf.animations.find(candidate => candidate.name === spec.clip);
        expect(clip).toBeDefined();
        mixer.stopAllAction(); mixer.clipAction(clip).setLoop(LoopOnce, 1).play().clampWhenFinished = true;
        for (const fraction of [0, .25, .5, .75, 1]) {
            mixer.setTime(clip.duration * fraction); gltf.scene.updateMatrixWorld(true);
            const bounds = new Box3().setFromObject(gltf.scene, true);
            expect([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite)).toBe(true);
            expect(bounds.min.y).toBeGreaterThan(-.025); expect(bounds.min.y).toBeLessThan(.035);
        }
    }
    for (const [name, expected] of [['Greatclub', 'club'], ['Rock', 'rock']]) {
        const visual = combatActionVisual(config, { actionName: name, kind: name === 'Rock' ? 'ranged' : 'melee' }, 'hillGiant');
        expect(visual.model).toBe(expected);
        const clipSpec = motion.actions[visual.motion], profile = config.animation.actionProfiles[visual.action];
        const clip = gltf.animations.find(candidate => candidate.name === clipSpec.clip);
        expect(clip.duration / clipSpec.timeScale).toBeCloseTo(profile.seconds, 5);
        expect(clipSpec.impact).toBe(profile.impact);
    }
    const actor = { id: 'giant', team: 'enemy', hp: 105, character: { monsterId: 'hillGiant' },
        toJSON: () => ({ id: 'giant', team: 'enemy', hp: 105, maxHP: 105, engagedWith: [] }) };
    const snapshot = combatPresentationSnapshot({ combatants: [actor], getCurrentCombatant: () => actor }, config,
        { monsters: JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url))).monsters, items: [] });
    expect(snapshot.reason).toBe(''); expect(snapshot.state.combatants[0].appearance).toBe('hillGiant');
    expect(snapshot.state.combatants[0].weaponModel).toBe('club');
});
