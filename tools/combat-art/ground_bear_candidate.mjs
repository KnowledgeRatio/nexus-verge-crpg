/** Ground the CC BY-SA 3.0 bear conversion without modifying its source clips. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture } from '../../vendor/three/three.module.min.js';

const path = process.argv[2] || 'tools/combat-art/bear-candidate.glb';
const groundName = process.argv[3] || 'BearGround';
const bytes = fs.readFileSync(path), length = bytes.readUInt32LE(12);
const data = JSON.parse(bytes.subarray(20, 20 + length));
if (data.nodes.some(node => node.name === groundName)) {
    throw new Error('Regenerate the candidate from source before grounding it again.');
}
const chunks = [bytes.subarray(28 + length)]; let offset = chunks[0].length;
const loader = new GLTFLoader().register(() => ({ name: 'authoring-textures', loadTexture: () => Promise.resolve(new Texture()) }));
const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const mixer = new AnimationMixer(gltf.scene);
const scene = data.scenes[data.scene || 0];
const ground = data.nodes.push({ name: groundName, children: scene.nodes }) - 1;
scene.nodes = [ground];
function append(values, type) {
    const binary = Buffer.from(new Float32Array(values).buffer);
    const view = data.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: binary.length }) - 1;
    chunks.push(binary); offset += binary.length;
    const accessor = { bufferView: view, componentType: 5126, type, count: values.length / (type === 'SCALAR' ? 1 : 3) };
    if (type === 'SCALAR') {
        accessor.min = [values[0]]; accessor.max = [values.at(-1)];
    }
    return data.accessors.push(accessor) - 1;
}
for (const animation of data.animations) {
    const clip = gltf.animations.find(entry => entry.name === animation.name);
    mixer.stopAllAction();
    mixer.clipAction(clip).reset().setLoop(LoopOnce, 1).play().clampWhenFinished = true;
    const steps = Math.ceil(clip.duration * 60), times = [], positions = [];
    for (let i = 0; i <= steps; i++) {
        const time = clip.duration * i / steps;
        mixer.setTime(time); gltf.scene.updateMatrixWorld(true);
        const box = new Box3().setFromObject(gltf.scene, true);
        times.push(time);
        // Preserve intentional airborne phases of the run while removing ground penetration.
        positions.push(0, Math.max(0, .003 - box.min.y), 0);
    }
    const sampler = animation.samplers.push({ input: append(times, 'SCALAR'),
        output: append(positions, 'VEC3'), interpolation: 'LINEAR' }) - 1;
    animation.channels.push({ sampler, target: { node: ground, path: 'translation' } });
}
data.buffers[0].byteLength = offset;
const encoded = Buffer.from(JSON.stringify(data)), json = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32);
encoded.copy(json);
const header = Buffer.alloc(20), binaryHeader = Buffer.alloc(8);
header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + offset, 8);
header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binaryHeader.writeUInt32LE(offset); binaryHeader.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(path, Buffer.concat([header, json, binaryHeader, ...chunks]));
