/** Owl anatomy on Wildfire Games' CC BY-SA 3.0 bear. The derivative remains CC BY-SA 3.0. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { SphereGeometry, BufferGeometry, Float32BufferAttribute, Vector3, Quaternion,
    AnimationMixer, Texture } from '../../vendor/three/three.module.min.js';

const bytes = fs.readFileSync('tools/combat-art/bear-candidate.glb');
const length = bytes.readUInt32LE(12), data = JSON.parse(bytes.subarray(20, 20 + length));
const binary = bytes.subarray(28 + length), chunks = [binary]; let offset = binary.length;
const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const types = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
function read(index) {
    const a = data.accessors[index], view = data.bufferViews[a.bufferView], Type = types[a.componentType];
    const size = Type.BYTES_PER_ELEMENT, width = widths[a.type];
    const start = (view.byteOffset || 0) + (a.byteOffset || 0), stride = view.byteStride || width * size;
    const values = [];
    for (let vertex = 0; vertex < a.count; vertex++) {
        for (let axis = 0; axis < width; axis++) {
            const at = start + vertex * stride + axis * size;
            values.push(a.componentType === 5126 ? binary.readFloatLE(at) :
                a.componentType === 5125 ? binary.readUInt32LE(at) :
                    a.componentType === 5123 ? binary.readUInt16LE(at) : binary.readUInt8(at));
        }
    }
    return values;
}
function append(values, type = 'VEC3', componentType = 5126, normalized = false) {
    const Type = types[componentType], buffer = Buffer.from(new Type(values).buffer);
    const padded = Buffer.alloc(Math.ceil(buffer.length / 4) * 4); buffer.copy(padded);
    const view = data.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: buffer.length }) - 1;
    chunks.push(padded); offset += padded.length;
    const width = widths[type], accessor = { bufferView: view, componentType, type, count: values.length / width };
    if (normalized) { accessor.normalized = true; }
    if (componentType === 5126) {
        accessor.min = Array.from({ length: width }, (_, a) => values.reduce((n, v, i) => i % width === a ? Math.min(n, v) : n, Infinity));
        accessor.max = Array.from({ length: width }, (_, a) => values.reduce((n, v, i) => i % width === a ? Math.max(n, v) : n, -Infinity));
    }
    return data.accessors.push(accessor) - 1;
}
const loader = new GLTFLoader().register(() => ({ name: 'authoring-textures', loadTexture: () => Promise.resolve(new Texture()) }));
const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const mixer = new AnimationMixer(gltf.scene);
mixer.clipAction(gltf.animations.find(clip => clip.name === 'bear_idle_01')).play();
mixer.setTime(0);
gltf.scene.updateMatrixWorld(true);
const head = gltf.scene.getObjectByName('Ursidae_Head'), jaw = gltf.scene.getObjectByName('Ursidae_Jaw_01');
const inverse = { Ursidae_Head: head.matrixWorld.clone().invert(), Ursidae_Jaw_01: jaw.matrixWorld.clone().invert() };
// Cut only the source face and ears. Keep the weighted neck and its original texture.
for (const node of data.nodes.filter(node => node.mesh !== undefined && node.skin !== undefined)) {
    const skin = data.skins[node.skin];
    const headJoints = new Set(skin.joints.map((node, joint) =>
        /Ursidae_(Head|ear|Jaw)/.test(data.nodes[node].name) ? joint : -1).filter(joint => joint >= 0));
    for (const primitive of data.meshes[node.mesh].primitives) {
        const weights = read(primitive.attributes.WEIGHTS_0), joints = read(primitive.attributes.JOINTS_0);
        const weightAccessor = data.accessors[primitive.attributes.WEIGHTS_0];
        const divisor = weightAccessor.normalized ? (weightAccessor.componentType === 5121 ? 255 : 65535) : 1;
        const headWeight = vertex => [0, 1, 2, 3].reduce((sum, axis) => sum +
            (headJoints.has(joints[vertex * 4 + axis]) ? weights[vertex * 4 + axis] / divisor : 0), 0);
        const indices = read(primitive.indices), kept = [];
        for (let i = 0; i < indices.length; i += 3) {
            const face = indices.slice(i, i + 3);
            if (face.reduce((sum, vertex) => sum + headWeight(vertex), 0) / 3 < .45) { kept.push(...face); }
        }
        const used = [...new Set(kept)], remap = new Map(used.map((vertex, i) => [vertex, i]));
        primitive.indices = append(kept.map(vertex => remap.get(vertex)), 'SCALAR', 5125);
        for (const [name, index] of Object.entries(primitive.attributes)) {
            const accessor = data.accessors[index], values = read(index), width = widths[accessor.type];
            primitive.attributes[name] = append(used.flatMap(vertex => values.slice(vertex * width, (vertex + 1) * width)),
                accessor.type, accessor.componentType, accessor.normalized);
        }
    }
}
const featherBytes = fs.readFileSync('data/graphics/combat/textures/owl-feathers-v1.png');
const featherBuffer = Buffer.alloc(Math.ceil(featherBytes.length / 4) * 4); featherBytes.copy(featherBuffer);
const featherView = data.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: featherBytes.length }) - 1;
chunks.push(featherBuffer); offset += featherBuffer.length;
const featherImage = data.images.push({ name: 'Original owl feather albedo', bufferView: featherView, mimeType: 'image/png' }) - 1;
const featherTexture = data.textures.push({ source: featherImage }) - 1;
const materials = [
    ['Owl brown grey mantle', [.75, .7, .63, 1], 1],
    ['Owl facial feathers', [1, .96, .87, 1], 1],
    ['Owl dark feather tips', [.38, .34, .29, 1], 1],
    ['Owl horn beak', [.045, .037, .029, 1], .78],
    ['Owl golden irises', [.55, .32, .055, 1], .38],
    ['Owl pupils', [.003, .004, .003, 1], .3]
].map(([name, baseColorFactor, roughnessFactor], i) => data.materials.push({ name,
    pbrMetallicRoughness: { baseColorFactor, metallicFactor: 0, roughnessFactor,
        ...(i < 3 ? { baseColorTexture: { index: featherTexture } } : {}) } }) - 1);
const groups = new Map();
function add(geometry, material, bone = 'Ursidae_Head') {
    if (!geometry.attributes.uv) {
        const uv = [], position = geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
            uv.push(position.getX(i) * 1.7, position.getY(i) * 1.7);
        }
        geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    }
    geometry.applyMatrix4(inverse[bone]);
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    const key = `${bone}:${material}`;
    if (!groups.has(key)) { groups.set(key, { bone, material, positions: [], normals: [], uv: [] }); }
    const group = groups.get(key);
    group.positions.push(...flat.attributes.position.array); group.normals.push(...flat.attributes.normal.array);
    group.uv.push(...flat.attributes.uv.array);
    geometry.dispose(); if (flat !== geometry) { flat.dispose(); }
}
function mass(position, scale, material, bone) {
    add(new SphereGeometry(1, 24, 16).scale(...scale).translate(...position), materials[material], bone);
}
function feather(base, tip, width, material) {
    const a = new Vector3(...base), b = new Vector3(...tip), direction = b.clone().sub(a);
    const side = new Vector3(direction.y, -direction.x, 0).normalize().multiplyScalar(width);
    const mid = a.clone().lerp(b, .45), ridge = mid.clone().add(new Vector3(0, 0, .018));
    const points = [a, mid.clone().add(side), b, mid.clone().sub(side), ridge];
    const indices = [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4, 0, 3, 2, 0, 2, 1];
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(indices.flatMap(i => points[i].toArray()), 3));
    geometry.computeVertexNormals(); add(geometry, materials[material]);
}
mass([0, 1.48, 1.28], [.48, .46, .40], 0);
mass([0, 1.43, 1.03], [.54, .38, .42], 0);
for (let layer = 0; layer < 1; layer++) {
    for (let i = 0; i < 28; i++) {
        const angle = (i + layer * .37) / 28 * Math.PI * 2, x = Math.cos(angle), y = Math.sin(angle);
        feather([x * (.37 + layer * .035), 1.48 + y * (.34 + layer * .03), 1.47 - layer * .07],
            [x * (.50 + layer * .025), 1.48 + y * (.46 + layer * .03), 1.39 - layer * .11], .055,
            i % 5 === 0 ? 2 : 0);
    }
}
for (const sign of [-1, 1]) {
    mass([sign * .225, 1.59, 1.605], [.218, .25, .092], 1);
    mass([sign * .225, 1.64, 1.69], [.105, .10, .048], 2);
    mass([sign * .225, 1.64, 1.726], [.074, .072, .032], 4);
    mass([sign * .225, 1.64, 1.752], [.037, .04, .015], 5);
    mass([sign * .225, 1.71, 1.71], [.12, .032, .05], 0);
    for (let i = 0; i < 22; i++) {
        const a = i / 22 * Math.PI * 2;
        feather([sign * .225 + Math.cos(a) * .11, 1.59 + Math.sin(a) * .13, 1.703],
            [sign * .225 + Math.cos(a) * .207, 1.59 + Math.sin(a) * .24, 1.654], .024,
            i % 4 === 0 ? 2 : 1);
    }
    feather([sign * .035, 1.73, 1.70], [sign * .40, 1.80, 1.61], .05, 0);
}
// Curved solid upper beak: broad root, forward ridge, downward hook.
const rings = [[1.49, 1.72, .095, .08], [1.43, 1.80, .09, .10],
    [1.32, 1.85, .055, .075], [1.20, 1.80, .005, .005]];
const positions = [];
for (let ring = 0; ring < rings.length - 1; ring++) {
    for (let i = 0; i < 16; i++) {
        const point = (r, n) => {
            const [y, z, rx, rz] = rings[r], angle = n / 16 * Math.PI * 2;
            return [Math.cos(angle) * rx, y, z + Math.sin(angle) * rz];
        };
        positions.push(...point(ring, i), ...point(ring, i + 1), ...point(ring + 1, i),
            ...point(ring, i + 1), ...point(ring + 1, i + 1), ...point(ring + 1, i));
    }
}
const beak = new BufferGeometry(); beak.setAttribute('position', new Float32BufferAttribute(positions, 3));
beak.computeVertexNormals(); add(beak, materials[3]);
mass([0, 1.28, 1.69], [.068, .046, .115], 3, 'Ursidae_Jaw_01');
for (const group of groups.values()) {
    const name = data.materials[group.material].name;
    const mesh = data.meshes.push({ name, primitives: [{ material: group.material, attributes: {
        POSITION: append(group.positions), NORMAL: append(group.normals), TEXCOORD_0: append(group.uv, 'VEC2')
    } }] }) - 1;
    const node = data.nodes.push({ name, mesh }) - 1;
    const parent = data.nodes.findIndex(node => node.name === group.bone);
    (data.nodes[parent].children ||= []).push(node);
}
const contact = new Vector3(0, 1.23, 1.82).applyMatrix4(inverse.Ursidae_Head);
const contactNode = data.nodes.push({ name: 'BeakContact', translation: contact.toArray() }) - 1;
data.nodes.find(node => node.name === 'Ursidae_Head').children.push(contactNode);
// Original head-led peck and short recoil, based on the actual four-paw idle pose.
const bones = data.skins[0].joints.map(index => ({ index,
    object: gltf.scene.getObjectByName(data.nodes[index].name) }));
const rest = bones.map(({ object }) => ({ position: object.position.clone(), rotation: object.quaternion.clone() }));
function authorMotion(name, seconds, impact, neckAngle, headAngle, forward) {
    const times = [], values = bones.map(() => ({ rotation: [], translation: [] }));
    function rotateWorld(bone, angle) {
        const world = bone.getWorldQuaternion(new Quaternion());
        bone.quaternion.copy(bone.parent.getWorldQuaternion(new Quaternion()).invert()
            .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angle)).multiply(world));
        gltf.scene.updateMatrixWorld(true);
    }
    for (let frame = 0; frame <= 60; frame++) {
        const t = frame / 60, phase = t < impact ? t / impact : (1 - t) / (1 - impact);
        const weight = phase * phase * (3 - 2 * phase);
        times.push(t * seconds);
        bones.forEach(({ object }, i) => {
            object.position.copy(rest[i].position); object.quaternion.copy(rest[i].rotation);
        });
        gltf.scene.updateMatrixWorld(true);
        rotateWorld(gltf.scene.getObjectByName('Ursidae_Neck'), neckAngle * weight);
        const position = head.getWorldPosition(new Vector3()).add(new Vector3(0, 0, forward * weight));
        head.position.copy(head.parent.worldToLocal(position));
        gltf.scene.updateMatrixWorld(true);
        rotateWorld(head, headAngle * weight);
        bones.forEach(({ object }, i) => {
            values[i].rotation.push(...object.quaternion.toArray());
            values[i].translation.push(...object.position.toArray());
        });
    }
    const input = append(times, 'SCALAR'), animation = { name, samplers: [], channels: [] };
    bones.forEach(({ index }, i) => {
        for (const path of ['rotation', 'translation']) {
            const sampler = animation.samplers.push({ input,
                output: append(values[i][path], path === 'rotation' ? 'VEC4' : 'VEC3'), interpolation: 'LINEAR' }) - 1;
            animation.channels.push({ sampler, target: { node: index, path } });
        }
    });
    data.animations.push(animation);
}
authorMotion('Owlbear_Beak', .8, .45, .12, .26, .12);
authorMotion('Owlbear_Hit', .35, .3, -.10, -.08, -.07);
data.asset.copyright = 'Derived from 0 A.D. bear by Wildfire Games; CC BY-SA 3.0. Owl head adaptation: Nexus Verge.';
data.buffers[0].byteLength = offset;
const encoded = Buffer.from(JSON.stringify(data)), json = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32); encoded.copy(json);
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + offset, 8);
header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync('tools/combat-art/owlbear-candidate.glb', Buffer.concat([header, json, binHeader, ...chunks]));
