/** Preserved undead soldier on the shared humanoid rig; original mail and eyes. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { TorusGeometry, SphereGeometry } from '../../vendor/three/three.module.min.js';

const root = new URL('../../', import.meta.url);
const source = fs.readFileSync(new URL('data/graphics/combat/traveller-animated.glb', root));
const length = source.readUInt32LE(12);
const data = JSON.parse(source.subarray(20, 20 + length));
const chunks = [source.subarray(28 + length)];
let offset = chunks[0].length;
const tints = {
    Skin: [.57, .60, .57, 1], 'Slate woven coat': [.15, .17, .16, 1],
    'Blue grey scarf': [.22, .20, .16, 1], 'Worn brown leather': [.12, .09, .065, 1],
    'Dark brown hair': [.17, .18, .17, 1], 'Charcoal trousers': [.10, .12, .12, 1]
};
for (const material of data.materials) {
    if (tints[material.name]) { material.pbrMetallicRoughness.baseColorFactor = tints[material.name]; }
}
function accessor(values, type, componentType, bounds = false) {
    const padding = (4 - offset % 4) % 4;
    chunks.push(Buffer.alloc(padding)); offset += padding;
    const bytes = Buffer.from(values.buffer);
    const bufferView = data.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length }) - 1;
    chunks.push(bytes); offset += bytes.length;
    const result = { bufferView, componentType, type,
        count: values.length / ({ SCALAR: 1, VEC3: 3, VEC4: 4 }[type]) };
    if (bounds) {
        result.min = [Infinity, Infinity, Infinity]; result.max = [-Infinity, -Infinity, -Infinity];
        values.forEach((v, i) => { result.min[i % 3] = Math.min(result.min[i % 3], v); result.max[i % 3] = Math.max(result.max[i % 3], v); });
    }
    return data.accessors.push(result) - 1;
}
function addParts(parts, bone, name, colour, metallic) {
    const positions = [], normals = [], weights = [], joints = [], indices = [];
    const joint = data.skins[0].joints.indexOf(data.nodes.findIndex(n => n.name === bone));
    if (joint < 0) { throw new Error(`Missing joint ${bone}`); }
    for (const geometry of parts) {
        const base = positions.length / 3;
        for (const index of geometry.index.array) { indices.push(base + index); }
        positions.push(...geometry.attributes.position.array); normals.push(...geometry.attributes.normal.array);
        for (let i = 0; i < geometry.attributes.position.count; i++) { weights.push(1, 0, 0, 0); joints.push(joint, 0, 0, 0); }
        geometry.dispose();
    }
    const material = data.materials.push({ name, pbrMetallicRoughness: {
        baseColorFactor: colour, metallicFactor: metallic, roughnessFactor: .7
    } }) - 1;
    // Append to an existing skinned mesh: positions are authored in the same bind space.
    data.meshes[0].primitives.push({ material,
        indices: accessor(new Uint32Array(indices), 'SCALAR', 5125), attributes: {
        POSITION: accessor(new Float32Array(positions), 'VEC3', 5126, true),
        NORMAL: accessor(new Float32Array(normals), 'VEC3', 5126),
        WEIGHTS_0: accessor(new Float32Array(weights), 'VEC4', 5126),
        JOINTS_0: accessor(new Uint16Array(joints), 'VEC4', 5123)
    } });
}
const mail = [];
for (let row = 0; row < 16; row++) {
    const y = 1.02 + row * .024;
    const width = .18 + .025 * row / 15;
    for (let column = 0; column < 36; column++) {
        const angle = (column + (row % 2) * .5) / 36 * Math.PI * 2;
        const ring = new TorusGeometry(.014, .0025, 3, 6);
        ring.rotateY(angle).translate(Math.sin(angle) * width, y, Math.cos(angle) * .137);
        mail.push(ring);
    }
}
addParts(mail, 'Spine', 'Wight aged iron mail', [.20, .23, .23, 1], .65);
const eyes = [-1, 1].map(side => new SphereGeometry(1, 8, 6)
    .scale(.011, .006, .004).translate(side * .033, 1.738, .085));
addParts(eyes, 'HeadJoint', 'Wight frost glass eyes', [.72, .79, .77, 1], .1);
const bin = Buffer.concat(chunks); const padding = Buffer.alloc((4 - bin.length % 4) % 4);
data.buffers[0].byteLength = bin.length + padding.length;
const encoded = Buffer.from(JSON.stringify(data));
const json = Buffer.concat([encoded, Buffer.alloc((4 - encoded.length % 4) % 4, 32)]);
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + bin.length + padding.length, 8);
header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(bin.length + padding.length); binHeader.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(new URL('data/graphics/combat/wight-v1.glb', root), Buffer.concat([header, json, binHeader, bin, padding]));
