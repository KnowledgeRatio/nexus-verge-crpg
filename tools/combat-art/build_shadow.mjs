/** Original faceless shadow body, reusing the established humanoid armature and clips. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { SphereGeometry, CylinderGeometry, Quaternion, Vector3 } from '../../vendor/three/three.module.min.js';

const root = new URL('../../', import.meta.url);
const source = fs.readFileSync(new URL('data/graphics/combat/traveller-animated.glb', root));
const jsonLength = source.readUInt32LE(12);
const data = JSON.parse(source.subarray(20, 20 + jsonLength));
const chunks = [source.subarray(28 + jsonLength)];
let offset = chunks[0].length;
const positions = [], normals = [], weights = [], joints = [];
function add(geometry, bone) {
    const node = data.nodes.findIndex(n => n.name === bone);
    const joint = data.skins[0].joints.indexOf(node);
    if (joint < 0) { throw new Error(`Missing shadow joint ${bone}`); }
    const expanded = geometry.toNonIndexed();
    positions.push(...expanded.attributes.position.array);
    normals.push(...expanded.attributes.normal.array);
    for (let i = 0; i < expanded.attributes.position.count; i++) {
        weights.push(1, 0, 0, 0); joints.push(joint, 0, 0, 0);
    }
    expanded.dispose(); geometry.dispose();
}
function mass(position, scale, bone) {
    const geometry = new SphereGeometry(1, 16, 12);
    geometry.scale(...scale).translate(...position); add(geometry, bone);
}
function limb(a, b, radiusA, radiusB, bone) {
    const start = new Vector3(...a), end = new Vector3(...b);
    const delta = end.clone().sub(start);
    const geometry = new CylinderGeometry(radiusB, radiusA, delta.length(), 12);
    geometry.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize()));
    geometry.translate(...start.add(end).multiplyScalar(.5).toArray()); add(geometry, bone);
    mass(a, [radiusA, radiusA, radiusA], bone);
    mass(b, [radiusB, radiusB, radiusB], bone);
}
// No clothes, eyes or facial features: the canonical creature is an upright absence of light.
mass([0, 1.26, 0], [.19, .28, .105], 'Spine');
mass([0, .99, 0], [.165, .17, .09], 'Traveller');
limb([0, 1.44, 0], [0, 1.62, 0], .058, .05, 'HeadJoint');
mass([0, 1.70, .006], [.082, .115, .073], 'HeadJoint');
for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'L' : 'R';
    limb([sign * .115, .95, 0], [sign * .14, .51, .01], .085, .055, `Leg.${side}`);
    limb([sign * .14, .51, .01], [sign * .14, .09, .01], .055, .032, `Knee.${side}`);
    mass([sign * .14, .055, .075], [.043, .045, .11], `Foot.${side}`);
    limb([sign * .225, 1.40, 0], [sign * .315, 1.12, .035], .065, .041, `Arm.${side}`);
    limb([sign * .315, 1.12, .035], [sign * .30, .93, .13], .041, .025, `Elbow.${side}`);
    mass([sign * .30, .90, .15], [.035, .054, .024], `Grip.${side}`);
    for (let finger = 0; finger < 4; finger++) {
        const x = sign * .30 + (finger - 1.5) * .017;
        limb([x, .89, .15], [x, .82 - Math.sin(finger / 3 * Math.PI) * .02, .18],
            .009, .004, `Grip.${side}`);
    }
}
function accessor(values, type, componentType, width, bounds = false) {
    const bytes = Buffer.from(values.buffer), padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4);
    bytes.copy(padded);
    const view = data.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length }) - 1;
    chunks.push(padded); offset += padded.length;
    const item = { bufferView: view, componentType, type, count: values.length / width };
    if (bounds) {
        item.min = [Infinity, Infinity, Infinity]; item.max = [-Infinity, -Infinity, -Infinity];
        values.forEach((value, i) => {
            item.min[i % 3] = Math.min(item.min[i % 3], value);
            item.max[i % 3] = Math.max(item.max[i % 3], value);
        });
    }
    return data.accessors.push(item) - 1;
}
data.materials = [{ name: 'Lightless silhouette', extensions: { KHR_materials_unlit: {} },
    pbrMetallicRoughness: { baseColorFactor: [.008, .01, .014, 1], metallicFactor: 0, roughnessFactor: 1 } }];
data.extensionsUsed = [...new Set([...(data.extensionsUsed || []), 'KHR_materials_unlit'])];
data.meshes = [{ name: 'Original shadow silhouette', primitives: [{ material: 0, attributes: {
    POSITION: accessor(new Float32Array(positions), 'VEC3', 5126, 3, true),
    NORMAL: accessor(new Float32Array(normals), 'VEC3', 5126, 3),
    WEIGHTS_0: accessor(new Float32Array(weights), 'VEC4', 5126, 4),
    JOINTS_0: accessor(new Uint16Array(joints), 'VEC4', 5123, 4)
} }] }];
const body = data.nodes.find(node => node.mesh !== undefined);
for (const node of data.nodes) { delete node.mesh; delete node.skin; }
Object.assign(body, { name: 'Shadow body', mesh: 0, skin: 0 });
delete data.images; delete data.textures; delete data.samplers;
data.buffers = [{ byteLength: offset }];
const encoded = Buffer.from(JSON.stringify(data)), json = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32);
encoded.copy(json);
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + offset, 8);
header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(new URL('data/graphics/combat/shadow-v1.glb', root),
    Buffer.concat([header, json, binHeader, ...chunks]));
