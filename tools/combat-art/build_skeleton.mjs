/** Original skeletal mesh, bound to the established traveller skeleton and motion library. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import console from 'node:console';
import { SphereGeometry, CylinderGeometry, TubeGeometry, CatmullRomCurve3,
    Vector3, Quaternion } from '../../vendor/three/three.module.min.js';

const root = new URL('../../', import.meta.url);
const bytes = fs.readFileSync(new URL('data/graphics/combat/traveller-animated.glb', root));
const jsonLength = bytes.readUInt32LE(12);
const json = JSON.parse(bytes.subarray(20, 20 + jsonLength));
const chunks = [bytes.subarray(28 + jsonLength)];
let offset = chunks[0].length;
const joint = name => {
    const node = json.nodes.findIndex(n => n.name === name);
    const index = json.skins[0].joints.indexOf(node);
    if (index < 0) { throw new Error(`Missing joint ${name}`); }
    return index;
};
const groups = [[], []];
function add(geometry, bone, material = 0) {
    groups[material].push({ geometry: geometry.toNonIndexed(), joint: joint(bone) });
    geometry.dispose();
}
function sphere(position, size, bone, material = 0) {
    const geo = new SphereGeometry(1, 12, 8);
    geo.scale(...size).translate(...position); add(geo, bone, material);
}
function segment(a, b, radius, bone) {
    const start = new Vector3(...a), end = new Vector3(...b), delta = end.clone().sub(start);
    const geo = new CylinderGeometry(radius * .8, radius, delta.length(), 8);
    geo.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize()));
    geo.translate(...start.add(end).multiplyScalar(.5).toArray()); add(geo, bone);
    for (const point of [a, b]) { sphere(point, [radius * 1.35, radius * 1.2, radius * 1.35], bone); }
}
function curve(points, radius, bone) {
    add(new TubeGeometry(new CatmullRomCurve3(points.map(p => new Vector3(...p))), 20, radius, 6, false), bone);
}
// Vertebrae, sternum and an open rib cage preserve negative space at gameplay scale.
for (let i = 0; i < 12; i++) {
    sphere([0, .99 + i * .039, -.03], [.028, .019, .035], 'Spine');
}
segment([0, 1.18, .094], [0, 1.40, .065], .019, 'Spine');
for (let rib = 0; rib < 7; rib++) {
    const y = 1.17 + rib * .036, width = .145 + Math.sin(rib / 6 * Math.PI) * .045;
    for (const sign of [-1, 1]) {
        curve([[0, y, -.03], [sign * width * .7, y + .012, -.10],
            [sign * width, y - .005, -.01], [sign * width * .65, y - .035, .09],
            [sign * .015, y - .025, .095]], .010, 'Spine');
    }
}
for (const sign of [-1, 1]) {
    const side = sign < 0 ? 'L' : 'R';
    curve([[0, 1.40, .055], [sign * .12, 1.43, .03], [sign * .235, 1.4, 0]], .016, 'Spine');
    curve([[sign * .025, 1.0, 0], [sign * .13, 1.04, -.025],
        [sign * .15, .94, .015], [sign * .07, .88, .055], [0, .92, .06]], .027, 'Traveller');
    segment([sign * .115, .91, 0], [sign * .14, .51, .01], .024, 'Leg.' + side);
    segment([sign * .14, .51, .01], [sign * .14, .09, .01], .018, 'Knee.' + side);
    segment([sign * .165, .50, .01], [sign * .162, .10, .01], .009, 'Knee.' + side);
    sphere([sign * .14, .06, .055], [.045, .035, .072], 'Foot.' + side);
    for (let digit = 0; digit < 4; digit++) {
        segment([sign * .14 + (digit - 1.5) * .018, .04, .09],
            [sign * .14 + (digit - 1.5) * .018, .025, .19 - digit * .012], .007, 'Foot.' + side);
    }
    segment([sign * .235, 1.4, 0], [sign * .315, 1.12, .035], .020, 'Arm.' + side);
    for (const shift of [-.010, .010]) {
        segment([sign * .315 + shift, 1.12, .035], [sign * .30 + shift, .93, .13], .011, 'Elbow.' + side);
    }
    sphere([sign * .30, .91, .145], [.033, .034, .025], 'Grip.' + side);
    for (let digit = 0; digit < 4; digit++) {
        curve([[sign * .30 + (digit - 1.5) * .015, .92, .145],
            [sign * .30 + (digit - 1.5) * .015, .875, .16],
            [sign * .30 + (digit - 1.5) * .015, .88, .185]], .006, 'Grip.' + side);
    }
}
segment([0, 1.43, -.01], [0, 1.62, 0], .025, 'HeadJoint');
sphere([0, 1.713, -.008], [.087, .105, .078], 'HeadJoint');
sphere([0, 1.652, .043], [.058, .042, .051], 'HeadJoint');
for (const sign of [-1, 1]) {
    sphere([sign * .033, 1.724, .061], [.025, .027, .020], 'HeadJoint', 1);
    segment([sign * .068, 1.695, .048], [sign * .045, 1.658, .067], .010, 'HeadJoint');
}
sphere([0, 1.69, .085], [.012, .021, .009], 'HeadJoint', 1);
for (let tooth = 0; tooth < 8; tooth++) {
    sphere([(tooth - 3.5) * .010, 1.644, .087], [.004, .009, .005], 'HeadJoint');
}

function accessor(array, type, componentType, bounds = false) {
    const data = Buffer.from(array.buffer), id = json.accessors.length, view = json.bufferViews.length;
    json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: data.length });
    const padded = Buffer.alloc(Math.ceil(data.length / 4) * 4); data.copy(padded);
    chunks.push(padded); offset += padded.length;
    const width = type === 'VEC3' ? 3 : 4;
    const a = { bufferView: view, componentType, type, count: array.length / width };
    if (bounds) {
        a.min = [Infinity, Infinity, Infinity]; a.max = [-Infinity, -Infinity, -Infinity];
        array.forEach((v, i) => { a.min[i % 3] = Math.min(a.min[i % 3], v); a.max[i % 3] = Math.max(a.max[i % 3], v); });
    }
    json.accessors.push(a); return id;
}
json.materials = [{ name: 'Aged ivory bone', pbrMetallicRoughness: {
    baseColorFactor: [.58, .53, .40, 1], metallicFactor: 0, roughnessFactor: .92 } },
{ name: 'Bone cavities', pbrMetallicRoughness: { baseColorFactor: [.027, .024, .019, 1], metallicFactor: 0, roughnessFactor: 1 } }];
const primitives = groups.map((parts, material) => {
    const positions = [], normals = [], weights = [], joints = [];
    for (const part of parts) {
        positions.push(...part.geometry.attributes.position.array);
        normals.push(...part.geometry.attributes.normal.array);
        for (let i = 0; i < part.geometry.attributes.position.count; i++) {
            weights.push(1, 0, 0, 0); joints.push(part.joint, 0, 0, 0);
        }
    }
    return { material, attributes: { POSITION: accessor(new Float32Array(positions), 'VEC3', 5126, true),
        NORMAL: accessor(new Float32Array(normals), 'VEC3', 5126),
        WEIGHTS_0: accessor(new Float32Array(weights), 'VEC4', 5126),
        JOINTS_0: accessor(new Uint16Array(joints), 'VEC4', 5123) } };
});
const meshNode = json.nodes.find(node => node.mesh !== undefined);
for (const node of json.nodes) { delete node.mesh; delete node.skin; }
meshNode.mesh = 0; meshNode.skin = 0; meshNode.name = 'Original skeletal body';
json.meshes = [{ name: 'Original skeletal body', primitives }];
delete json.images; delete json.textures; delete json.samplers;
json.buffers = [{ byteLength: offset }];
const encoded = Buffer.from(JSON.stringify(json)), text = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32);
encoded.copy(text);
const header = Buffer.alloc(20), binaryHeader = Buffer.alloc(8);
header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + text.length + offset, 8);
header.writeUInt32LE(text.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binaryHeader.writeUInt32LE(offset); binaryHeader.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(new URL('data/graphics/combat/skeleton-v1.glb', root), Buffer.concat([header, text, binaryHeader, ...chunks]));
console.log('Built original skeleton with', json.animations.length, 'shared humanoid clips');
