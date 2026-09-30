/** Original hand-sized scorched skull: canonical steady eye fire, no body or flame plume. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { SphereGeometry, BoxGeometry, TubeGeometry, CatmullRomCurve3, Vector3, Quaternion } from '../../vendor/three/three.module.min.js';

const root = new URL('../../', import.meta.url);
const data = { asset: { version: '2.0', generator: 'Nexus Verge original flameskull' }, scene: 0,
    scenes: [{ nodes: [0] }], nodes: [{ name: 'Skull', translation: [0, 1.5, 0], children: [] }],
    meshes: [], materials: [], animations: [], accessors: [], bufferViews: [], buffers: [] };
const chunks = []; let offset = 0;
function append(values, type) {
    const bytes = Buffer.from(new Float32Array(values).buffer), width = { SCALAR: 1, VEC3: 3, VEC4: 4 }[type];
    const view = data.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length }) - 1;
    chunks.push(bytes); offset += bytes.length;
    const a = { bufferView: view, componentType: 5126, type, count: values.length / width };
    a.min = Array.from({ length: width }, (_, axis) => Math.min(...values.filter((_, i) => i % width === axis)));
    a.max = Array.from({ length: width }, (_, axis) => Math.max(...values.filter((_, i) => i % width === axis)));
    return data.accessors.push(a) - 1;
}
data.materials = [
    { name: 'Scorched matte bone', pbrMetallicRoughness: { baseColorFactor: [.028, .023, .019, 1], metallicFactor: 0, roughnessFactor: 1 } },
    { name: 'Exposed ivory ridges', pbrMetallicRoughness: { baseColorFactor: [.55, .48, .35, 1], metallicFactor: 0, roughnessFactor: .9 } },
    { name: 'Empty sockets', pbrMetallicRoughness: { baseColorFactor: [.003, .002, .002, 1], metallicFactor: 0, roughnessFactor: 1 } },
    { name: 'Steady orange-white eye fire', emissiveFactor: [1, .32, .055],
        pbrMetallicRoughness: { baseColorFactor: [1, .68, .27, 1], metallicFactor: 0, roughnessFactor: 1 } }
];
function mesh(name, geo, material, parent = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const index = data.meshes.push({ name, primitives: [{ material, attributes: {
        POSITION: append([...g.attributes.position.array], 'VEC3'), NORMAL: append([...g.attributes.normal.array], 'VEC3') } }] }) - 1;
    const node = data.nodes.push({ name, mesh: index }) - 1;
    data.nodes[parent].children ||= []; data.nodes[parent].children.push(node);
    g.dispose(); if (g !== geo) { geo.dispose(); }
    return node;
}
function sphere(name, position, size, material, parent = 0) {
    return mesh(name, new SphereGeometry(1, 16, 12).scale(...size).translate(...position), material, parent);
}
function curve(name, points, radius, material, parent = 0) {
    return mesh(name, new TubeGeometry(new CatmullRomCurve3(points.map(p => new Vector3(...p))), 16, radius, 8, false), material, parent);
}
sphere('Scorched cranium', [0, .025, -.018], [.087, .103, .078], 0);
sphere('Ivory forehead', [0, .070, .035], [.062, .050, .042], 1);
for (const sign of [-1, 1]) {
    sphere('Socket ' + sign, [sign * .033, .033, .054], [.027, .029, .022], 2);
    curve('Orbital ridge ' + sign, [[sign * .01, .050, .073], [sign * .029, .056, .072],
        [sign * .054, .050, .062], [sign * .064, .029, .05]], .004, 1);
    curve('Cheekbone ' + sign, [[sign * .07, .012, .038], [sign * .059, -.016, .059],
        [sign * .038, -.027, .072]], .008, 0);
}
sphere('Nasal cavity', [0, -.003, .073], [.012, .020, .011], 2);
const jaw = data.nodes.push({ name: 'Jaw', children: [] }) - 1; data.nodes[0].children.push(jaw);
curve('Mandible', [[-.052, -.018, .027], [-.048, -.068, .052], [0, -.083, .077],
    [.048, -.068, .052], [.052, -.018, .027]], .012, 0, jaw);
for (let i = 0; i < 8; i++) {
    const x = (i - 3.5) * .010;
    mesh('Upper tooth ' + i, new BoxGeometry(.008, .015, .009).translate(x, -.042, .073), 1);
    mesh('Lower tooth ' + i, new BoxGeometry(.008, .012, .009).translate(x, -.064, .074), 1, jaw);
}
const eyes = data.nodes.push({ name: 'EyeFire', children: [] }) - 1; data.nodes[0].children.push(eyes);
for (const sign of [-1, 1]) { sphere('Fire point ' + sign, [sign * .033, .033, .077], [.0035, .0045, .0025], 3, eyes); }
const origin = data.nodes.push({ name: 'RayOrigin', translation: [0, .03, .085] }) - 1; data.nodes[0].children.push(origin);
function animation(name, tracks) {
    const a = { name, samplers: [], channels: [] };
    for (const [node, path, times, values] of tracks) {
        const type = path === 'rotation' ? 'VEC4' : 'VEC3';
        const sampler = a.samplers.push({ input: append(times, 'SCALAR'), output: append(values.flat(), type), interpolation: 'LINEAR' }) - 1;
        a.channels.push({ sampler, target: { node, path } });
    }
    data.animations.push(a);
}
const rotation = angle => new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angle).toArray();
animation('Float', [[0, 'translation', [0, 1, 2, 3, 4], [[0, 1.5, 0], [0, 1.516, 0], [0, 1.5, 0], [0, 1.484, 0], [0, 1.5, 0]]]]);
animation('Fire', [[0, 'translation', [0, .2, .4, .8], [[0, 1.5, 0], [0, 1.5, -.045], [0, 1.5, .035], [0, 1.5, 0]]],
    [jaw, 'rotation', [0, .2, .4, .8], [rotation(0), rotation(.18), rotation(.12), rotation(0)]]]);
animation('Hit', [[0, 'rotation', [0, .1, .32], [rotation(0), rotation(-.20), rotation(0)]]]);
animation('Death', [[0, 'translation', [0, .15, .65, .8, 1], [[0, 1.5, 0], [0, 1.43, 0], [0, .11, 0], [0, .145, -.025], [0, .104, -.03]]],
    [0, 'rotation', [0, .65, 1], [rotation(0), rotation(-.4), rotation(-.7)]],
    [eyes, 'scale', [0, .15, .3, 1], [[1, 1, 1], [.7, .7, .7], [0, 0, 0], [0, 0, 0]]]]);
data.buffers = [{ byteLength: offset }];
let json = Buffer.from(JSON.stringify(data)); json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + offset, 8);
header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(new URL('data/graphics/combat/flameskull-v1.glb', root), Buffer.concat([header, json, binHeader, ...chunks]));
