/** Original reusable volume control rig: motion nodes, not a humanoid skeleton. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { BoxGeometry } from '../../vendor/three/three.module.min.js';

const data = { asset: { version: '2.0', generator: 'Nexus Verge original smoke control rig' },
    scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ name: 'SmokeRig', children: [1, 2, 5] },
        { name: 'SmokeBody', children: [3, 4] }, { name: 'SmokeOpacity', scale: [1, 1, 1] },
        { name: 'SmokeBounds', mesh: 0 }, { name: 'SmokeCore', translation: [0, .5, 0] },
        { name: 'SmokeReach', scale: [0, 1, 1] }],
    meshes: [], materials: [{ name: 'Volume authoring bounds', pbrMetallicRoughness: { baseColorFactor: [.02, .02, .02, 1] } }],
    animations: [], buffers: [], bufferViews: [], accessors: [] };
const chunks = []; let offset = 0;
function append(values, type = 'VEC3') {
    const width = type === 'SCALAR' ? 1 : 3, bytes = Buffer.from(new Float32Array(values).buffer);
    const view = data.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length }) - 1;
    chunks.push(bytes); offset += bytes.length;
    return data.accessors.push({ bufferView: view, componentType: 5126, type, count: values.length / width,
        min: Array.from({ length: width }, (_, axis) => values.reduce((a, v, i) => i % width === axis ? Math.min(a, v) : a, Infinity)),
        max: Array.from({ length: width }, (_, axis) => values.reduce((a, v, i) => i % width === axis ? Math.max(a, v) : a, -Infinity)) }) - 1;
}
const box = new BoxGeometry(1, 1, 1).toNonIndexed();
data.meshes.push({ primitives: [{ material: 0, attributes: {
    POSITION: append([...box.attributes.position.array]), NORMAL: append([...box.attributes.normal.array])
} }] });
function clip(name, times, scales, positions, opacity, reach = times.map(() => [0, 1, 1])) {
    const input = append(times, 'SCALAR'), samplers = [], channels = [];
    for (const [node, path, values] of [[1, 'scale', scales], [1, 'translation', positions],
        [2, 'scale', opacity], [5, 'scale', reach]]) {
        const sampler = samplers.push({ input, output: append(values.flat()), interpolation: 'LINEAR' }) - 1;
        channels.push({ sampler, target: { node, path } });
    }
    data.animations.push({ name, samplers, channels });
}
const unit = [1, 1, 1], origin = [0, 0, 0];
clip('Smoke_Idle', [0, 2], [unit, unit], [origin, origin], [unit, unit]);
clip('Smoke_Touch', [0, .16, .36, .56, .8],
    [unit, [.85, 1.08, .85], [.85, .95, 1.65], [.95, 1, 1.2], unit],
    [origin, [0, 0, -.05], [0, 0, .25], [0, 0, .08], origin], Array(5).fill(unit));
clip('Smoke_Hit', [0, .12, .35], [unit, [1.25, .85, .75], unit],
    [origin, [0, 0, -.08], origin], Array(3).fill(unit));
clip('Smoke_Dissolve', [0, .3, .85], [unit, [1.15, 1.1, 1.15], [1.5, 1.3, 1.5]],
    [origin, [0, .06, 0], [0, .18, 0]], [unit, [.7, 1, 1], [0, 1, 1]]);
clip('Smoke_Strike', [0, .16, .36, .56, .8], Array(5).fill(unit),
    [origin, [0, 0, -.03], [0, 0, .1], [0, 0, .04], origin], Array(5).fill(unit),
    [[0, 1, 1], [0, 1, 1], [1, 1, 1], [.4, 1, 1], [0, 1, 1]]);
clip('Smoke_Pulse', [0, .18, .36, .6, .9],
    [unit, [.94, 1, .94], [1.08, 1.03, 1.08], [1.04, 1, 1.04], unit],
    Array(5).fill(origin), Array(5).fill(unit));
data.buffers = [{ byteLength: offset }];
const encoded = Buffer.from(JSON.stringify(data)), json = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32);
encoded.copy(json);
const header = Buffer.alloc(20), binaryHeader = Buffer.alloc(8);
header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + offset, 8);
header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binaryHeader.writeUInt32LE(offset); binaryHeader.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync('data/graphics/combat/smoke-rig-v1.glb', Buffer.concat([header, json, binaryHeader, ...chunks]));
