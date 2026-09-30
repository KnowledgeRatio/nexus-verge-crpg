/** Inspect the CC0 anatomical base with rest-pose-adjusted clips from the retained CC0 library. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { Quaternion } from '../../vendor/three/three.module.min.js';

const directory = 'tools/combat-art/sources/quaternius-base-characters/';
const data = JSON.parse(fs.readFileSync(directory + 'Superhero_Male_FullBody.gltf'));
data.buffers.forEach(buffer => {
    buffer.uri = 'data:application/octet-stream;base64,' + fs.readFileSync(directory + buffer.uri).toString('base64');
});
for (const image of data.images) {
    if (!fs.existsSync(directory + image.uri)) {
        image.uri = image.uri.replace('_png.png', '.png');
    }
    if (!fs.existsSync(directory + image.uri)) { throw new Error(`Missing source texture ${image.uri}`); }
}
const libraries = new Map(['ual1', 'ual2'].map(id => {
    const bytes = fs.readFileSync(`tools/combat-art/sources/quaternius-${id}/${id.toUpperCase()}_Standard.glb`);
    const size = bytes.readUInt32LE(12);
    return [id, { json: JSON.parse(bytes.subarray(20, 20 + size)), binary: bytes.subarray(28 + size) }];
}));
let library, binary;
function values(index) {
    const a = library.accessors[index], view = library.bufferViews[a.bufferView];
    const width = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
    if (a.componentType !== 5126) { throw new Error('Animation accessor must contain floats'); }
    return Array.from({ length: a.count * width }, (_, i) => binary.readFloatLE(
        (view.byteOffset || 0) + (a.byteOffset || 0) + Math.floor(i / width) * (view.byteStride || width * 4) + i % width * 4));
}
function append(values, type) {
    const bytes = Buffer.from(new Float32Array(values).buffer), buffer = data.buffers.length;
    data.buffers.push({ byteLength: bytes.length, uri: 'data:application/octet-stream;base64,' + bytes.toString('base64') });
    const view = data.bufferViews.push({ buffer, byteLength: bytes.length }) - 1;
    const width = { SCALAR: 1, VEC3: 3, VEC4: 4 }[type];
    return data.accessors.push({ bufferView: view, componentType: 5126, type, count: values.length / width,
        ...(width === 1 ? { min: [Math.min(...values)], max: [Math.max(...values)] } : {}) }) - 1;
}
const names = new Map(data.nodes.map((node, i) => [node.name, i]));
const legLength = json => ['calf_l', 'foot_l'].reduce((sum, name) =>
    sum + Math.hypot(...json.nodes.find(node => node.name === name).translation), 0);
const giant = process.argv.includes('--giant');
const clips = giant ? ['Idle_Loop', 'Sword_Idle', 'Walk_Loop', 'Sword_Attack', 'OverhandThrow', 'Hit_Chest', 'Death01',
    'Hit_Knockback', 'LayToIdle'] :
    ['Idle_Loop', 'Crouch_Idle_Loop', 'Crouch_Fwd_Loop', 'Punch_Jab', 'Hit_Chest', 'Death01'];
data.animations = clips.map(name => {
    ({ json: library, binary } = libraries.get(['OverhandThrow', 'Hit_Knockback', 'LayToIdle'].includes(name) ? 'ual2' : 'ual1'));
    const movementScale = legLength(data) / legLength(library);
    const source = library.animations.find(clip => clip.name === name);
    if (!source) { throw new Error(`Missing source clip ${name}`); }
    const animation = { name, samplers: [], channels: [] };
    for (const channel of source.channels) {
        const bone = library.nodes[channel.target.node], targetIndex = names.get(bone.name);
        if (targetIndex === undefined) { throw new Error(`Unmapped source bone ${bone.name}`); }
        const target = data.nodes[targetIndex], sampler = source.samplers[channel.sampler];
        if (sampler.interpolation === 'CUBICSPLINE') { throw new Error('Cubic track retargeting needs tangent conversion'); }
        const input = values(sampler.input), output = values(sampler.output), result = [];
        const rotation = channel.target.path === 'rotation', width = rotation ? 4 : 3;
        for (let i = 0; i < output.length; i += width) {
            const frame = output.slice(i, i + width);
            if (rotation) {
                const delta = new Quaternion(...(target.rotation || [0, 0, 0, 1])).multiply(
                    new Quaternion(...(bone.rotation || [0, 0, 0, 1])).invert());
                result.push(...delta.multiply(new Quaternion(...frame)).normalize().toArray());
            } else if (channel.target.path === 'translation') {
                result.push(...frame.map((v, axis) => (target.translation?.[axis] || 0) +
                    (v - (bone.translation?.[axis] || 0)) * movementScale));
            } else {
                result.push(...frame.map((v, axis) => v * (target.scale?.[axis] ?? 1) / (bone.scale?.[axis] ?? 1)));
            }
        }
        const index = animation.samplers.push({ input: append(input, 'SCALAR'),
            output: append(result, rotation ? 'VEC4' : 'VEC3'), interpolation: sampler.interpolation || 'LINEAR' }) - 1;
        animation.channels.push({ sampler: index, target: { node: targetIndex, path: channel.target.path } });
    }
    return animation;
});
fs.writeFileSync(`tools/combat-art/${giant ? 'giant' : 'anatomical'}-base-candidate.gltf`, JSON.stringify(data));
