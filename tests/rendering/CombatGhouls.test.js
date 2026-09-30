import { it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { Group, AnimationMixer, Vector3, Texture, Box3, LoopOnce } from '../../vendor/three/three.module.min.js';
import { planContact } from '../../src/rendering/CombatContact.js';
import { combatActionVisual, combatPresentationSnapshot } from '../../src/ui/CombatPresentation.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
const monsters = JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url))).monsters;
it.each(['ghoul', 'ghast', 'troll', 'gargoyle'])('%s loads its configured clips and contacts with bite and claws', async id => {
    const spec = config.artAssets.models[id], appearance = config.appearances[id];
    const assetURL = new URL(`../../${spec.url}`, import.meta.url), bytes = readFileSync(assetURL);
    const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
    for (const image of json.images) {
        expect(existsSync(new URL(image.uri, assetURL))).toBe(true);
    }
    globalThis.ProgressEvent ??= class ProgressEvent {};
    const gltf = await new GLTFLoader().register(() => ({ name: 'test-textures',
        loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const mixer = new AnimationMixer(gltf.scene);
    if (id === 'gargoyle') {
        const wings = gltf.scene.getObjectByName('FoldedStoneWings');
        expect(wings.parent.name).toBe('spine_03');
        const idle = gltf.animations.find(clip => clip.name === spec.motion.idle.clip);
        mixer.clipAction(idle).play();
        mixer.setTime(0); gltf.scene.updateMatrixWorld(true);
        const joints = ['Head', 'hand_l', 'hand_r', 'FoldedStoneWings'].map(name => gltf.scene.getObjectByName(name));
        const still = joints.map(joint => joint.matrixWorld.elements.slice());
        for (const time of [.25, .8, 1.2]) {
            mixer.setTime(time); gltf.scene.updateMatrixWorld(true);
            joints.forEach((joint, index) => joint.matrixWorld.elements.forEach((value, axis) => {
                expect(value).toBeCloseTo(still[index][axis], 6);
            }));
        }
    }
    for (const motion of [spec.motion.idle, spec.motion.walk, ...Object.values(spec.motion.actions)]) {
        const clip = gltf.animations.find(candidate => candidate.name === motion.clip);
        expect(clip).toBeDefined();
        mixer.stopAllAction(); mixer.clipAction(clip).setLoop(LoopOnce, 1).play().clampWhenFinished = true;
        for (const fraction of [0, .25, .5, .75, 1]) {
            mixer.setTime(clip.duration * fraction); gltf.scene.updateMatrixWorld(true);
            const box = new Box3().setFromObject(gltf.scene, true);
            expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
            expect(box.min.y).toBeGreaterThan(-.004); expect(box.min.y).toBeLessThan(.018);
        }
    }
    const source = { id, x: 3, z: 0, radius: appearance.contact.bodyRadius, reach: appearance.contact.reach };
    const target = { id: 'hero', x: 0, z: 0, radius: config.contact.bodyRadius, reach: config.contact.reach };
    const destination = planContact(source, target, [source, target], config.contact).at(-1);
    const body = new Group(); body.position.set(destination.x, 0, destination.z);
    body.rotation.y = Math.atan2(-destination.x, -destination.z); body.add(gltf.scene);
    expect(Math.hypot(destination.x, destination.z)).toBeGreaterThan(source.radius + target.radius);
    for (const name of monsters.find(monster => monster.id === id).actions.map(action => action.name)) {
        const visual = combatActionVisual(config, { kind: 'melee', actionName: name }, id);
        const motion = spec.motion.actions[visual.motion], profile = config.animation.actionProfiles[visual.action];
        const clip = gltf.animations.find(candidate => candidate.name === motion.clip);
        expect(clip.duration).toBeCloseTo(profile.seconds, 5); expect(motion.impact).toBe(profile.impact);
        mixer.stopAllAction(); mixer.clipAction(clip).play(); mixer.setTime(clip.duration * motion.impact);
        body.updateMatrixWorld(true);
        const contact = gltf.scene.getObjectByName(name === 'Bite' ? 'BiteContact' : 'Claw_middle_r');
        const point = contact.localToWorld(new Vector3(0, name === 'Bite' ? 0 : .06, 0));
        expect(Math.hypot(point.x, point.z)).toBeLessThan(.3);
        const heightScale = gltf.scene.getObjectByName('CorpseGround').scale.y;
        expect(point.y).toBeGreaterThan(.75 * heightScale); expect(point.y).toBeLessThan(1.05 * heightScale);
    }
    const actor = { id, team: 'enemy', hp: 22, character: { monsterId: id },
        toJSON: () => ({ id, team: 'enemy', hp: 22, maxHP: 22, engagedWith: [] }) };
    const snapshot = combatPresentationSnapshot({ combatants: [actor], getCurrentCombatant: () => actor },
        config, { monsters, items: [] });
    expect(snapshot.reason).toBe(''); expect(snapshot.state.combatants[0].appearance).toBe(id);
});
