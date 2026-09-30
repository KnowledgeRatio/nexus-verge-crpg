/** Original weathered traveller derivative with a collapsed stance and downward slam. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { Quaternion, Vector3, AnimationMixer, Box3, LoopOnce, Texture } from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';

const root = new URL('../../', import.meta.url);
const source = fs.readFileSync(new URL('data/graphics/combat/traveller-animated.glb', root));
const jsonLength = source.readUInt32LE(12);
const data = JSON.parse(source.subarray(20, 20 + jsonLength));
const binary = Buffer.from(source.subarray(28 + jsonLength));
const chunks = [binary];
let offset = binary.length;
function address(index, vertex, component = 0) {
    const a = data.accessors[index], v = data.bufferViews[a.bufferView];
    const width = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
    return (v.byteOffset || 0) + (a.byteOffset || 0) + vertex * (v.byteStride || width * 4) + component * 4;
}
function appendFloats(values, type = 'VEC4') {
    const pad = (4 - offset % 4) % 4;
    chunks.push(Buffer.alloc(pad)); offset += pad;
    const bytes = Buffer.alloc(values.length * 4);
    values.forEach((value, i) => bytes.writeFloatLE(value, i * 4));
    const view = data.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length }) - 1;
    chunks.push(bytes); offset += bytes.length;
    const width = { VEC4: 4, VEC3: 3, SCALAR: 1 }[type];
    const accessor = { bufferView: view, componentType: 5126, count: values.length / width, type };
    if (type === 'SCALAR') { accessor.min = [Math.min(...values)]; accessor.max = [Math.max(...values)]; }
    return data.accessors.push(accessor) - 1;
}
const tint = {
    Skin: [.32, .35, .32, 1], 'Slate woven coat': [.105, .12, .10, 1],
    'Blue grey scarf': [.14, .135, .11, 1], 'Worn brown leather': [.11, .085, .06, 1],
    'Leather worn edges': [.19, .165, .125, 1], 'Charcoal trousers': [.085, .09, .08, 1],
    'Dark brown hair': [.09, .085, .075, 1]
};
for (const material of data.materials) {
    if (tint[material.name]) { material.pbrMetallicRoughness.baseColorFactor = tint[material.name]; }
}
for (const mesh of data.meshes) {
    for (const primitive of mesh.primitives) {
        const mat = data.materials[primitive.material].name;
        const index = primitive.attributes.POSITION, a = data.accessors[index];
        a.min = [Infinity, Infinity, Infinity]; a.max = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < a.count; i++) {
            const p = [0, 1, 2].map(axis => binary.readFloatLE(address(index, i, axis)));
            // Uneven split hem, continuous by position so duplicate seam vertices match.
            if (mat === 'Slate woven coat' && p[1] < .74) {
                const edge = Math.max(0, (.74 - p[1]) / .18);
                p[1] += edge * (.055 + .055 * Math.sin(Math.atan2(p[2], p[0]) * 19));
            }
            // A worn, slightly hollow face keeps its recognisable human proportions.
            if (mat === 'Skin' && p[1] > 1.62 && p[1] < 1.74) {
                const weight = Math.sin((p[1] - 1.62) / .12 * Math.PI);
                p[0] *= 1 - weight * .10;
                p[2] -= weight * .006;
            }
            p.forEach((value, axis) => {
                binary.writeFloatLE(value, address(index, i, axis));
                a.min[axis] = Math.min(a.min[axis], value); a.max[axis] = Math.max(a.max[axis], value);
            });
        }
    }
}
function motion(sourceName, name, resting) {
    const animation = JSON.parse(JSON.stringify(data.animations.find(a => a.name === sourceName)));
    animation.name = name;
    for (const channel of animation.channels) {
        if (channel.target.path !== 'rotation') { continue; }
        const node = data.nodes[channel.target.node];
        const sampler = animation.samplers[channel.sampler];
        const count = data.accessors[sampler.output].count;
        const values = [];
        for (let i = 0; i < count; i++) {
            const q = new Quaternion(...[0, 1, 2, 3].map(axis => binary.readFloatLE(address(sampler.output, i, axis))));
            if (node.name === 'Spine') { q.premultiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), .24)); }
            if (node.name === 'HeadJoint') { q.premultiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), .08)); }
            if (resting && /^(Arm|Elbow)\./.test(node.name)) {
                q.slerp(new Quaternion(...(node.rotation || [0, 0, 0, 1])), .78);
            }
            values.push(...q.normalize().toArray());
        }
        sampler.output = appendFloats(values);
    }
    data.animations.push(animation);
}
motion('Idle_Loop', 'Zombie_Idle', true);
motion('Walk_Loop', 'Zombie_Walk', true);
motion('Melee_1H_Attack_Chop', 'Zombie_Slam', false);
// Author floor correction into the asset, leaving runtime pose/movement code generic.
data.buffers[0].byteLength = offset;
const inspection = JSON.parse(JSON.stringify(data));
inspection.buffers[0].uri = 'data:application/octet-stream;base64,' + Buffer.concat(chunks).toString('base64');
const loader = new GLTFLoader().register(() => ({ name: 'authoring-textures', loadTexture: () => Promise.resolve(new Texture()) }));
globalThis.ProgressEvent ||= class ProgressEvent {
    constructor(type, options = {}) { this.type = type; Object.assign(this, options); }
};
const gltf = await loader.parseAsync(JSON.stringify(inspection), '');
const mixer = new AnimationMixer(gltf.scene);
const scene = data.scenes[data.scene || 0];
const ground = data.nodes.push({ name: 'ZombieGround', children: scene.nodes }) - 1;
scene.nodes = [ground];
const grounded = new Set(['Zombie_Idle', 'Zombie_Walk', 'Zombie_Slam', 'Hit_Chest', 'Death01', 'Prone_Idle', 'LayToIdle']);
for (const clip of gltf.animations.filter(clip => grounded.has(clip.name))) {
    mixer.stopAllAction();
    const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play();
    action.clampWhenFinished = true;
    const count = Math.ceil(clip.duration * 60), times = [], positions = [];
    for (let i = 0; i <= count; i++) {
        const time = clip.duration * i / count;
        mixer.setTime(time); gltf.scene.updateMatrixWorld(true);
        times.push(time); positions.push(0, .002 - new Box3().setFromObject(gltf.scene, true).min.y, 0);
    }
    const animation = data.animations.find(animation => animation.name === clip.name);
    const sampler = animation.samplers.push({ input: appendFloats(times, 'SCALAR'),
        output: appendFloats(positions, 'VEC3'), interpolation: 'LINEAR' }) - 1;
    animation.channels.push({ sampler, target: { node: ground, path: 'translation' } });
}
data.buffers[0].byteLength = offset;
let json = Buffer.from(JSON.stringify(data));
json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
let bin = Buffer.concat(chunks); bin = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]);
const header = Buffer.alloc(20); header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + json.length + bin.length, 8); header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(bin.length); binHeader.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(new URL('data/graphics/combat/zombie-v1.glb', root), Buffer.concat([header, json, binHeader, bin]));
