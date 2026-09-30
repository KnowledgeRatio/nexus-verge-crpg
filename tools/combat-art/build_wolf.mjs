import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import console from 'node:console';
import { URL } from 'node:url';
import process from 'node:process';
import { AnimationMixer, Box3, LoopOnce, Vector3, Texture } from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';

const root = new URL('../../', import.meta.url);
const config = JSON.parse(fs.readFileSync(new URL('data/combatScene.json', root), 'utf8'));
const modelId = process.argv[2] || 'wolf';
const modelSpec = config.artAssets.models[modelId];
const spec = modelSpec.authoring;
const source = fs.readFileSync(new URL(spec.source || 'tools/combat-art/sources/quaternius-animals/Wolf.gltf', root), 'utf8');
const json = JSON.parse(source);
if (spec.chest) {
    const buffers = json.buffers.map(buffer => Buffer.from(buffer.uri.split(',')[1], 'base64'));
    const positions = new Set(json.meshes.flatMap(mesh => mesh.primitives.map(part => part.attributes.POSITION)));
    for (const id of positions) {
        const attribute = json.accessors[id];
        const view = json.bufferViews[attribute.bufferView];
        const bytes = buffers[view.buffer];
        attribute.min = [Infinity, Infinity, Infinity];
        attribute.max = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < attribute.count; i++) {
            const offset = (view.byteOffset || 0) + (attribute.byteOffset || 0) + i * (view.byteStride || 12);
            const x = bytes.readFloatLE(offset), y = bytes.readFloatLE(offset + 4), z = bytes.readFloatLE(offset + 8);
            const weight = Math.max(0, 1 - Math.abs(z - spec.chest.centreZ) / spec.chest.radiusZ) ** 2;
            const upper = Math.min(1, Math.max(0, (y - spec.chest.minimumY) / spec.chest.fadeHeight));
            const lower = Math.min(1, Math.max(0, (spec.chest.maximumY - y) / spec.chest.fadeHeight));
            bytes.writeFloatLE(x * (1 + weight * upper * spec.chest.widen), offset);
            bytes.writeFloatLE(y - weight * upper * lower * spec.chest.deepen, offset + 4);
            for (let axis = 0; axis < 3; axis++) {
                const value = bytes.readFloatLE(offset + axis * 4);
                attribute.min[axis] = Math.min(attribute.min[axis], value);
                attribute.max[axis] = Math.max(attribute.max[axis], value);
            }
        }
    }
    json.buffers.forEach((buffer, index) => {
        buffer.uri = 'data:application/octet-stream;base64,' + buffers[index].toString('base64');
    });
}
if (spec.coat) {
    const colours = new Map();
    const materialNames = new Set(spec.coat.materials);
    for (const mesh of json.meshes) {
        for (const part of mesh.primitives) {
            const material = json.materials[part.material];
            if (!materialNames.has(material.name)) {
                continue;
            }
            const positionId = part.attributes.POSITION;
            if (!colours.has(positionId)) {
                const attribute = json.accessors[positionId];
                const view = json.bufferViews[attribute.bufferView];
                const positions = Buffer.from(json.buffers[view.buffer].uri.split(',')[1], 'base64');
                const values = new Float32Array(attribute.count * 3);
                for (let i = 0; i < attribute.count; i++) {
                    const offset = (view.byteOffset || 0) + (attribute.byteOffset || 0) + i * (view.byteStride || 12);
                    const y = positions.readFloatLE(offset + 4);
                    const weight = Math.min(1, Math.max(0, (y - spec.coat.startHeight) /
                        (spec.coat.endHeight - spec.coat.startHeight)));
                    for (let axis = 0; axis < 3; axis++) {
                        values[i * 3 + axis] = spec.coat.flanks[axis] * (1 - weight) + spec.coat.spine[axis] * weight;
                    }
                }
                const bytes = Buffer.from(values.buffer);
                const buffer = json.buffers.length;
                json.buffers.push({ byteLength: bytes.length, uri: 'data:application/octet-stream;base64,' + bytes.toString('base64') });
                const bufferView = json.bufferViews.length;
                json.bufferViews.push({ buffer, byteOffset: 0, byteLength: bytes.length });
                colours.set(positionId, json.accessors.length);
                json.accessors.push({ bufferView, componentType: 5126, count: attribute.count, type: 'VEC3' });
            }
            part.attributes.COLOR_0 = colours.get(positionId);
            material.pbrMetallicRoughness.baseColorFactor = [1, 1, 1, 1];
            material.pbrMetallicRoughness.roughnessFactor = .9;
        }
    }
}
globalThis.ProgressEvent ??= class ProgressEvent {};
// Texture decoding is irrelevant to authoring bounds and requires a browser.
const loader = new GLTFLoader().register(() => ({ name: 'authoring-textures',
    loadTexture: () => Promise.resolve(new Texture()) }));
const asset = await loader.parseAsync(JSON.stringify(json), '');
const model = asset.scene;
model.updateMatrixWorld(true);
const neck = model.getObjectByName('Neck3');
const mouth = neck.worldToLocal(new Vector3(...spec.mouthPosition));
const mouthIndex = json.nodes.length;
json.nodes.push({ name: 'Mouth', translation: mouth.toArray() });
const neckIndex = json.nodes.findIndex(node => node.name === 'Neck3');
(json.nodes[neckIndex].children ||= []).push(mouthIndex);
const groundIndex = json.nodes.length;
json.nodes.push({ name: 'WolfGround', scale: [spec.scale, spec.scale, spec.scale],
    translation: [0, spec.floorClearance, 0], children: [...json.scenes[0].nodes] });
json.scenes[0].nodes = [groundIndex];
const chunks = [];
let offset = 0;
for (const [index, buffer] of json.buffers.entries()) {
    const bytes = Buffer.from(buffer.uri.split(',')[1], 'base64');
    for (const view of json.bufferViews.filter(view => view.buffer === index)) {
        view.buffer = 0;
        view.byteOffset = (view.byteOffset || 0) + offset;
    }
    const padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4);
    bytes.copy(padded);
    chunks.push(padded);
    offset += padded.length;
}
function accessor(values, type) {
    const array = new Float32Array(values);
    const bytes = Buffer.from(array.buffer);
    const view = json.bufferViews.length;
    json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length });
    chunks.push(bytes);
    offset += bytes.length;
    const id = json.accessors.length;
    json.accessors.push({ bufferView: view, componentType: 5126, count: values.length / (type === 'VEC3' ? 3 : 1), type,
        ...(type === 'SCALAR' ? { min: [Math.min(...values)], max: [Math.max(...values)] } : {}) });
    return id;
}
const mixer = new AnimationMixer(model);
const report = [];
const used = new Set([modelSpec.motion.idle.clip, modelSpec.motion.walk.clip,
    ...Object.values(modelSpec.motion.actions).map(action => action.clip)]);
json.animations = json.animations.filter(animation => used.has(animation.name));
for (const animation of json.animations) {
    const clip = asset.animations.find(clip => clip.name === animation.name);
    mixer.stopAllAction();
    const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play();
    action.clampWhenFinished = true;
    const times = [], positions = [];
    const count = Math.ceil(clip.duration * spec.sampleRate);
    let maximumCorrection = 0;
    for (let i = 0; i <= count; i++) {
        const time = clip.duration * i / count;
        mixer.setTime(time);
        model.updateMatrixWorld(true);
        const bounds = new Box3().setFromObject(model, true);
        const y = spec.floorClearance - bounds.min.y * spec.scale;
        times.push(time);
        positions.push(0, y, 0);
        maximumCorrection = Math.max(maximumCorrection, y);
    }
    const sampler = animation.samplers.length;
    animation.samplers.push({ input: accessor(times, 'SCALAR'), output: accessor(positions, 'VEC3'), interpolation: 'LINEAR' });
    animation.channels.push({ sampler, target: { node: groundIndex, path: 'translation' } });
    report.push({ clip: clip.name, duration: clip.duration, maximumCorrection });
}
json.asset.extras = { source: 'Quaternius Ultimate Animated Animals, CC0',
    adaptation: 'Original source rig and clips; metre scale, mouth socket and sampled floor correction.' };
json.buffers = [{ byteLength: offset }];
const encoded = Buffer.from(JSON.stringify(json));
const jsonChunk = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32);
encoded.copy(jsonChunk);
const binary = Buffer.concat(chunks);
const header = Buffer.alloc(20);
header.write('glTF'); header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + jsonChunk.length + binary.length, 8);
header.writeUInt32LE(jsonChunk.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binaryHeader = Buffer.alloc(8);
binaryHeader.writeUInt32LE(binary.length); binaryHeader.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(new URL(modelSpec.url, root), Buffer.concat([header, jsonChunk, binaryHeader, binary]));
fs.writeFileSync(new URL(`tools/combat-art/${modelId}-build-report.json`, root), JSON.stringify({ spec, clips: report }, null, 2) + '\n');
console.log('Built', modelSpec.url, report);
