/** Retain the CC0 source motion and add distinct claw, breath and hit presentations. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Quaternion, Vector3, Texture, LoopOnce, Matrix4 } from '../../vendor/three/three.module.min.js';

const bytes = fs.readFileSync('tools/combat-art/dragon-source.glb'), length = bytes.readUInt32LE(12);
const data = JSON.parse(bytes.subarray(20, 20 + length)), chunks = [bytes.subarray(28 + length)];
let offset = chunks[0].length;
function append(values, type) {
    const buffer = Buffer.from(new Float32Array(values).buffer);
    const bufferView = data.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: buffer.length }) - 1;
    chunks.push(buffer); offset += buffer.length;
    return data.accessors.push({ bufferView, componentType: 5126, type,
        count: values.length / (type === 'SCALAR' ? 1 : type === 'VEC4' ? 4 : 3),
        ...(type === 'SCALAR' ? { min: [values[0]], max: [values.at(-1)] } : {}) }) - 1;
}
const model = await new GLTFLoader().register(() => ({ name: 'authoring-textures',
    loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const mixer = new AnimationMixer(model.scene), idle = model.animations.find(clip => clip.name === 'Idle');
mixer.clipAction(idle).setLoop(LoopOnce, 1).play(); mixer.setTime(0); model.scene.updateMatrixWorld(true);
const bones = [];
model.scene.traverse(object => {
    if (object.isBone) {
        const index = data.nodes.findIndex(node => node.name.replaceAll('.', '') === object.name);
        bones.push({ object, index, position: object.position.clone(), rotation: object.quaternion.clone() });
    }
});
function socket(name, boneName, worldOffset) {
    const bone = model.scene.getObjectByName(boneName), index = bones.find(entry => entry.object === bone).index;
    const point = bone.getWorldPosition(new Vector3()).add(new Vector3(...worldOffset))
        .applyMatrix4(new Matrix4().copy(bone.matrixWorld).invert());
    const node = data.nodes.push({ name, translation: point.toArray() }) - 1;
    (data.nodes[index].children ||= []).push(node);
}
socket('DragonMouth', 'jaw_upper', [0, -.018, .075]);
socket('DragonClaw', 'leg_front_footR', [0, 0, .035]);
function rotate(name, angle, axis = new Vector3(1, 0, 0)) {
    const bone = model.scene.getObjectByName(name);
    const world = new Quaternion().setFromAxisAngle(axis, angle)
        .multiply(bone.getWorldQuaternion(new Quaternion()));
    bone.quaternion.copy(bone.parent.getWorldQuaternion(new Quaternion()).invert().multiply(world));
    model.scene.updateMatrixWorld(true);
}
for (const [name, duration, impact] of [['Dragon_Claw', .9, .5], ['Dragon_Breath', 1.2, .45], ['Dragon_Hit', .35, .25]]) {
    const count = Math.ceil(duration * 60), times = [], poses = bones.map(() => ({ translation: [], rotation: [] }));
    for (let frame = 0; frame <= count; frame++) {
        const t = frame / count, phase = t < impact ? t / impact : (1 - t) / (1 - impact);
        const weight = phase * phase * (3 - 2 * phase);
        bones.forEach(({ object, position, rotation }) => { object.position.copy(position); object.quaternion.copy(rotation); });
        model.scene.updateMatrixWorld(true);
        if (name === 'Dragon_Claw') {
            rotate('leg_front_upperR', -1.15 * weight);
            rotate('leg_front_lowerR', -.15 * weight);
            rotate('leg_front_footR', .2 * weight);
            rotate('leg_front_upperR', .5 * weight, new Vector3(0, 1, 0));
            rotate('neck1', .08 * weight);
        } else if (name === 'Dragon_Breath') {
            rotate('neck1', .25 * weight);
            rotate('neck2', .15 * weight);
            rotate('jaw_lower', .5 * weight);
        } else {
            rotate('neck1', -.12 * weight);
            rotate('neck3', .08 * weight);
        }
        times.push(t * duration);
        bones.forEach(({ object }, i) => {
            poses[i].translation.push(...object.position.toArray()); poses[i].rotation.push(...object.quaternion.toArray());
        });
    }
    const input = append(times, 'SCALAR'), animation = { name, samplers: [], channels: [] };
    bones.forEach(({ index }, i) => {
        for (const path of ['rotation', 'translation']) {
            const sampler = animation.samplers.push({ input, output: append(poses[i][path], path === 'rotation' ? 'VEC4' : 'VEC3'),
                interpolation: 'LINEAR' }) - 1;
            animation.channels.push({ sampler, target: { node: index, path } });
        }
    });
    data.animations.push(animation);
}
data.buffers[0].byteLength = offset;
const encoded = Buffer.from(JSON.stringify(data)), json = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32); encoded.copy(json);
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + offset, 8);
header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync('tools/combat-art/dragon-candidate.glb', Buffer.concat([header, json, binHeader, ...chunks]));
