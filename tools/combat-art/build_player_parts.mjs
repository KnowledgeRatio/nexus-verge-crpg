/** Reusable hair and clothing shapes; retain the complete shared rig and motion library. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { BufferGeometry, Float32BufferAttribute } from '../../vendor/three/three.module.min.js';

const root = new URL('../../', import.meta.url);
const bytes = fs.readFileSync(new URL('data/graphics/combat/traveller-animated.glb', root));
const length = bytes.readUInt32LE(12);
const data = JSON.parse(bytes.subarray(20, 20 + length));
const binary = bytes.subarray(28 + length);
const chunks = [binary];
let offset = binary.length;
function values(index) {
    const a = data.accessors[index], v = data.bufferViews[a.bufferView];
    const count = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    const size = { 5123: 2, 5125: 4, 5126: 4 }[a.componentType];
    const read = { 5123: 'readUInt16LE', 5125: 'readUInt32LE', 5126: 'readFloatLE' }[a.componentType];
    return Array.from({ length: a.count * count }, (_, i) => binary[read](
        (v.byteOffset || 0) + (a.byteOffset || 0) + Math.floor(i / count) * (v.byteStride || size * count) + i % count * size));
}
function append(array, type, componentType) {
    const pad = (4 - offset % 4) % 4;
    chunks.push(Buffer.alloc(pad)); offset += pad;
    const bytes = componentType === 5123 ? 2 : 4;
    const buffer = Buffer.alloc(array.length * bytes);
    const write = { 5123: 'writeUInt16LE', 5125: 'writeUInt32LE', 5126: 'writeFloatLE' }[componentType];
    array.forEach((v, i) => buffer[write](v, i * bytes));
    const view = data.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: buffer.length }) - 1;
    chunks.push(buffer); offset += buffer.length;
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[type];
    const accessor = { bufferView: view, componentType, count: array.length / size, type };
    if (type === 'VEC3') {
        accessor.min = [0, 1, 2].map(axis => Math.min(...array.filter((_, i) => i % 3 === axis)));
        accessor.max = [0, 1, 2].map(axis => Math.max(...array.filter((_, i) => i % 3 === axis)));
    }
    return data.accessors.push(accessor) - 1;
}
const node = data.nodes.find(n => n.name === 'Brow');
const primitive = data.meshes[node.mesh].primitives[0];
const positions = values(primitive.attributes.POSITION), indices = values(primitive.indices);
// Weld positional seams before finding components, so facial details stay intact.
const parents = Array.from({ length: positions.length / 3 }, (_, i) => i), welded = new Map();
const find = i => parents[i] === i ? i : (parents[i] = find(parents[i]));
const union = (a, b) => { parents[find(a)] = find(b); };
for (let i = 0; i < parents.length; i++) {
    const key = positions.slice(i * 3, i * 3 + 3).map(v => v.toFixed(6)).join(',');
    if (welded.has(key)) { union(i, welded.get(key)); } else { welded.set(key, i); }
}
for (let i = 0; i < indices.length; i += 3) { union(indices[i], indices[i + 1]); union(indices[i], indices[i + 2]); }
const tops = new Map();
for (let i = 0; i < parents.length; i++) { tops.set(find(i), Math.max(tops.get(find(i)) || 0, positions[i * 3 + 1])); }
const face = [], hair = [];
for (let i = 0; i < indices.length; i += 3) {
    (tops.get(find(indices[i])) > 1.75 ? hair : face).push(...indices.slice(i, i + 3));
}
if (!face.length || !hair.length) { throw new Error('Expected separate facial and scalp components'); }
data.meshes[node.mesh].primitives = [{ ...primitive, indices: append(face, 'SCALAR', 5125) }];
function add(name, points) {
    const attrs = { ...primitive.attributes };
    if (points) { attrs.POSITION = append(points, 'VEC3', 5126); }
    const mesh = data.meshes.push({ name, primitives: [{ ...primitive, attributes: attrs,
        indices: append(hair, 'SCALAR', 5125) }] }) - 1;
    const id = data.nodes.push({ name, mesh, skin: node.skin }) - 1;
    const parent = data.nodes.find(n => n.children?.includes(data.nodes.indexOf(node)));
    if (parent) { parent.children.push(id); } else { data.scenes[data.scene || 0].nodes.push(id); }
}
add('HairSwept');
// A close crop follows the scalp envelope while shortening the fringe and back locks.
const cropped = positions.map((value, i) => {
    const axis = i % 3;
    if (axis === 0) { return value * .94; }
    if (axis === 1) { return 1.82 + (value - 1.82) * .48; }
    return -.012 + (value + .012) * .92;
});
add('HairCropped', cropped);
function clothingVariant(sourceName, originalName, variantName, transform) {
    const source = data.nodes.find(n => n.name === sourceName);
    const sourcePrimitive = data.meshes[source.mesh].primitives[0];
    const sourcePositions = values(sourcePrimitive.attributes.POSITION);
    const changed = [];
    for (let i = 0; i < sourcePositions.length; i += 3) {
        changed.push(...transform(...sourcePositions.slice(i, i + 3)));
    }
    source.name = originalName;
    const mesh = data.meshes.push({ name: variantName, primitives: [{ ...sourcePrimitive,
        attributes: { ...sourcePrimitive.attributes, POSITION: append(changed, 'VEC3', 5126) } }] }) - 1;
    const id = data.nodes.push({ name: variantName, mesh, skin: source.skin }) - 1;
    const parent = data.nodes.find(n => n.children?.includes(data.nodes.indexOf(source)));
    if (parent) { parent.children.push(id); } else { data.scenes[data.scene || 0].nodes.push(id); }
}
// Raise only the lower coat panels. The overlapping hip section is retained,
// as the base traveller has no hidden body underneath its clothes.
clothingVariant('Tailored coat torso', 'CoatLong', 'CoatShort', (x, y, z) => {
    if (y >= .94) { return [x, y, z]; }
    const shortened = .82 + (y - .56) * (.12 / .38);
    const taper = 1 - Math.max(0, .94 - y) * .28;
    return [x * taper, shortened, z * taper];
});
// Gathered thighs taper into the same knee/boot interface and preserve the soles.
clothingVariant('Trouser L', 'TrousersFitted', 'TrousersGathered', (x, y, z) => {
    if (y < .51 || y > .91) { return [x, y, z]; }
    const fullness = 1 + .32 * Math.sin((y - .51) / .40 * Math.PI);
    const centre = Math.sign(x) * (.14 - (y - .51) * .0625);
    return [centre + (x - centre) * fullness, y, z * fullness];
});
// An open-faced travelling hood shares the head rig and the selected coat fabric.
const hoodRings = [[1.53, .14, .13, .95], [1.62, .13, .12, .66],
    [1.74, .135, .126, .66], [1.83, .106, .103, .46], [1.872, .012, .016, 0]];
const segments = 28, hoodPositions = [], hoodUV = [], hoodIndices = [];
for (const [ring, [y, rx, rz, opening]] of hoodRings.entries()) {
    for (let step = 0; step <= segments; step++) {
        const theta = opening + step / segments * (Math.PI * 2 - opening * 2);
        hoodPositions.push(Math.sin(theta) * rx, y, Math.cos(theta) * rz - .022);
        hoodUV.push(step / segments, ring / (hoodRings.length - 1));
        if (ring && step) {
            const a = ring * (segments + 1) + step, b = a - segments - 1;
            hoodIndices.push(a - 1, b - 1, b, a - 1, b, a);
        }
    }
}
const hood = new BufferGeometry();
hood.setAttribute('position', new Float32BufferAttribute(hoodPositions, 3)); hood.setIndex(hoodIndices);
hood.computeVertexNormals();
const headJoint = data.skins[0].joints.indexOf(data.nodes.findIndex(n => n.name === 'HeadJoint'));
const count = hoodPositions.length / 3;
const hoodMaterial = JSON.parse(JSON.stringify(data.materials.find(m => m.name === 'Slate woven coat')));
hoodMaterial.doubleSided = true;
const hoodMesh = data.meshes.push({ name: 'TravelHood', primitives: [{
    material: data.materials.push(hoodMaterial) - 1, indices: append(hoodIndices, 'SCALAR', 5125),
    attributes: { POSITION: append(hoodPositions, 'VEC3', 5126),
        NORMAL: append([...hood.attributes.normal.array], 'VEC3', 5126),
        TEXCOORD_0: append(hoodUV, 'VEC2', 5126),
        JOINTS_0: append(Array.from({ length: count }, () => [headJoint, 0, 0, 0]).flat(), 'VEC4', 5123),
        WEIGHTS_0: append(Array.from({ length: count }, () => [1, 0, 0, 0]).flat(), 'VEC4', 5126) }
}] }) - 1;
const hoodNode = data.nodes.push({ name: 'TravelHood', mesh: hoodMesh, skin: node.skin }) - 1;
const meshParent = data.nodes.find(n => n.children?.includes(data.nodes.indexOf(node)));
if (meshParent) { meshParent.children.push(hoodNode); } else { data.scenes[data.scene || 0].nodes.push(hoodNode); }
hood.dispose();
data.buffers[0].byteLength = offset;
let json = Buffer.from(JSON.stringify(data));
json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
let bin = Buffer.concat(chunks); bin = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]);
const header = Buffer.alloc(20); header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + json.length + bin.length, 8); header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(bin.length); binHeader.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(new URL('data/graphics/combat/traveller-modular.glb', root), Buffer.concat([header, json, binHeader, bin]));
