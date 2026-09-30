/** Translucent spirit derived from the original shared shadow body and humanoid rig. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import process from 'node:process';
import { spiritSurface } from './spirit_surface.mjs';
import { compactSkinnedBuffers } from './compact_skinned_glb.mjs';

const root = new URL('../../', import.meta.url);
const trailing = process.argv.includes('--wraith');
const source = fs.readFileSync(new URL('data/graphics/combat/shadow-v1.glb', root));
const length = source.readUInt32LE(12);
const data = JSON.parse(source.subarray(20, 20 + length));
const binary = source.subarray(28 + length), chunks = [binary];
let offset = binary.length;
function floats(values, type, width) {
    const bytes = Buffer.alloc(values.length * 4);
    values.forEach((value, i) => bytes.writeFloatLE(value, i * 4));
    const view = data.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length }) - 1;
    chunks.push(bytes); offset += bytes.length;
    const accessor = { bufferView: view, componentType: 5126, type, count: values.length / width };
    if (width === 1) { accessor.min = [Math.min(...values)]; accessor.max = [Math.max(...values)]; }
    return data.accessors.push(accessor) - 1;
}
const still = globalThis.structuredClone(data.animations.find(clip => clip.name === 'Idle_Loop'));
still.name = 'Specter_Still';
const times = floats([0, 2], 'SCALAR', 1);
for (const sampler of still.samplers) {
    const accessor = data.accessors[sampler.output], view = data.bufferViews[accessor.bufferView];
    const width = accessor.type === 'VEC4' ? 4 : 3;
    const address = (view.byteOffset || 0) + (accessor.byteOffset || 0);
    const pose = Array.from({ length: width }, (_, i) => binary.readFloatLE(address + i * 4));
    sampler.input = times; sampler.output = floats([...pose, ...pose], accessor.type, width);
    sampler.interpolation = 'LINEAR';
}
data.animations.push(still);
const scene = data.scenes[data.scene || 0];
const wrapper = data.nodes.push({ name: 'SpecterDissolution', children: scene.nodes, scale: [1, 1, 1] }) - 1;
scene.nodes = [wrapper];
// Vanishing into a narrow trace avoids a solid corpse for an incorporeal creature.
data.animations.push({ name: 'Specter_Vanish', samplers: [{
    input: floats([0, .35, .9], 'SCALAR', 1),
    output: floats([1, 1, 1, .45, 1.05, .45, .001, .001, .001], 'VEC3', 3), interpolation: 'LINEAR'
}], channels: [{ sampler: 0, target: { node: wrapper, path: 'scale' } }] });
data.materials[0].name = trailing ? 'Dark trailing spirit' : 'Pale translucent spirit';
data.materials[0].alphaMode = 'BLEND';
data.materials[0].pbrMetallicRoughness.baseColorFactor = trailing ? [.012, .017, .024, .84] : [.53, .66, .68, .33];
const raw = spiritSurface(name => {
    const joint = data.skins[0].joints.indexOf(data.nodes.findIndex(node => node.name === name));
    if (joint < 0) { throw new Error(`Unknown spirit joint ${name}`); }
    return joint;
}, { trailing });
const surface = { positions: [], normals: [], weights: [], joints: [] }, indices = [], vertices = new Map();
for (let i = 0; i < raw.positions.length / 3; i++) {
    const key = raw.positions.slice(i * 3, i * 3 + 3).map(v => Math.round(v * 10000000)).join(',');
    if (!vertices.has(key)) {
        vertices.set(key, surface.positions.length / 3);
        for (const [name, width] of [['positions', 3], ['normals', 3], ['weights', 4], ['joints', 4]]) {
            surface[name].push(...raw[name].slice(i * width, i * width + width));
        }
    }
    indices.push(vertices.get(key));
}
const position = floats(surface.positions, 'VEC3', 3);
data.accessors[position].min = [Infinity, Infinity, Infinity];
data.accessors[position].max = [-Infinity, -Infinity, -Infinity];
surface.positions.forEach((value, i) => {
    data.accessors[position].min[i % 3] = Math.min(data.accessors[position].min[i % 3], value);
    data.accessors[position].max[i % 3] = Math.max(data.accessors[position].max[i % 3], value);
});
const jointBytes = Buffer.alloc(surface.joints.length * 2);
surface.joints.forEach((value, i) => jointBytes.writeUInt16LE(value, i * 2));
const jointView = data.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: jointBytes.length }) - 1;
chunks.push(jointBytes); offset += jointBytes.length;
const jointAccessor = data.accessors.push({ bufferView: jointView, componentType: 5123,
    type: 'VEC4', count: surface.joints.length / 4 }) - 1;
const indexBytes = Buffer.alloc(indices.length * 4);
indices.forEach((value, i) => indexBytes.writeUInt32LE(value, i * 4));
const indexView = data.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: indexBytes.length }) - 1;
chunks.push(indexBytes); offset += indexBytes.length;
const indexAccessor = data.accessors.push({ bufferView: indexView, componentType: 5125,
    type: 'SCALAR', count: indices.length }) - 1;
data.meshes[0] = { name: 'Continuous spirit surface', primitives: [{ material: 0, indices: indexAccessor, attributes: {
    POSITION: position, NORMAL: floats(surface.normals, 'VEC3', 3),
    WEIGHTS_0: floats(surface.weights, 'VEC4', 4), JOINTS_0: jointAccessor
} }] };
data.buffers = [{ byteLength: offset }];
const usedClips = new Set(['Specter_Still', 'Specter_Vanish', 'Spell_Simple_Shoot', 'Hit_Chest']);
data.animations = data.animations.filter(clip => usedClips.has(clip.name));
const packed = compactSkinnedBuffers(data, Buffer.concat(chunks));
offset = packed.length;
const encoded = Buffer.from(JSON.stringify(data)), json = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32);
encoded.copy(json);
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + offset, 8);
header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(new URL(`data/graphics/combat/${trailing ? 'wraith' : 'specter'}-v1.glb`, root),
    Buffer.concat([header, json, binHeader, packed]));
