/** Adapt embedded glTF creature candidates; runtime selection is configured separately. */
import fs from 'node:fs';
import process from 'node:process';
import console from 'node:console';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { AnimationMixer, Box3, LoopOnce, Quaternion, Euler } from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';

const root = new URL('../../', import.meta.url);
const specs = JSON.parse(fs.readFileSync(new URL('tools/combat-art/creatureSpecs.json', root)));
const id = process.argv[2];
const spec = specs[id];
if (!spec) { throw new Error('Specify a creature ID from creatureSpecs.json'); }
const json = JSON.parse(fs.readFileSync(new URL(spec.source, root)));
const buffers = json.buffers.map(buffer => Buffer.from(buffer.uri.split(',')[1], 'base64'));
function values(index) {
    const a = json.accessors[index], v = json.bufferViews[a.bufferView];
    const width = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
    if (a.componentType !== 5126 || !width) { throw new Error('Expected float animation accessor'); }
    return Array.from({ length: a.count * width }, (_, i) => buffers[v.buffer].readFloatLE(
        (v.byteOffset || 0) + (a.byteOffset || 0) + Math.floor(i / width) * (v.byteStride || width * 4) + i % width * 4));
}
function append(data, type) {
    const bytes = Buffer.from(new Float32Array(data).buffer), buffer = buffers.length;
    buffers.push(bytes);
    json.buffers.push({ byteLength: bytes.length, uri: 'data:application/octet-stream;base64,' + bytes.toString('base64') });
    const view = json.bufferViews.length;
    json.bufferViews.push({ buffer, byteLength: bytes.length });
    const index = json.accessors.length;
    json.accessors.push({ bufferView: view, componentType: 5126, type,
        count: data.length / ({ SCALAR: 1, VEC3: 3, VEC4: 4 }[type]),
        ...(type === 'SCALAR' ? { min: [Math.min(...data)], max: [Math.max(...data)] } : {}) });
    return index;
}
json.animations = json.animations.filter(a => Object.values(spec.clips).includes(a.name));
if (spec.collapseDuration) {
    const death = json.animations.find(a => a.name === spec.clips.death);
    // Interpolate to the source's final collapsed pose instead of retaining its airborne somersault.
    for (const channel of death.channels) {
        const sampler = death.samplers[channel.sampler], path = channel.target.path;
        const width = path === 'rotation' ? 4 : 3;
        const end = values(sampler.output).slice(-width);
        const node = json.nodes[channel.target.node];
        const start = node[path] || (path === 'rotation' ? [0, 0, 0, 1] : path === 'scale' ? [1, 1, 1] : [0, 0, 0]);
        const frames = [];
        for (let i = 0; i <= 30; i++) {
            const t = i / 30, smooth = t * t * (3 - 2 * t);
            frames.push(...(path === 'rotation' ? new Quaternion().fromArray(start)
                .slerp(new Quaternion().fromArray(end), smooth).toArray() : start.map((x, k) => x + (end[k] - x) * smooth)));
        }
        sampler.input = append(Array.from({ length: 31 }, (_, i) => i / 30 * spec.collapseDuration), 'SCALAR');
        sampler.output = append(frames, path === 'rotation' ? 'VEC4' : 'VEC3');
        sampler.interpolation = 'LINEAR';
    }
}
const headIndex = json.nodes.findIndex(n => n.name === spec.head);
if (headIndex < 0) { throw new Error('Missing head joint'); }
const head = json.nodes[headIndex], rest = new Quaternion().fromArray(head.rotation || [0, 0, 0, 1]);
const recoil = rest.clone().multiply(new Quaternion().setFromEuler(new Euler(spec.hitPitch, 0, 0)));
const hit = spec.hitSourceClip ? globalThis.structuredClone(json.animations.find(a => a.name === spec.hitSourceClip)) :
    { samplers: [], channels: [] };
hit.name = 'Hit';
if (spec.hitSourceClip) {
    for (const sampler of hit.samplers) {
        const times = values(sampler.input), duration = Math.max(...times);
        sampler.input = append(times.map(t => t / duration * .32), 'SCALAR');
    }
    hit.channels = hit.channels.filter(channel => channel.target.node !== headIndex || channel.target.path !== 'rotation');
}
const hitSampler = hit.samplers.length;
hit.samplers.push({ input: append([0, .07, .18, .32], 'SCALAR'),
    output: append([...rest.toArray(), ...recoil.toArray(), ...recoil.toArray(), ...rest.toArray()], 'VEC4'),
    interpolation: 'LINEAR' });
hit.channels.push({ sampler: hitSampler, target: { node: headIndex, path: 'rotation' } });
json.animations.push(hit);

globalThis.ProgressEvent ??= class ProgressEvent {};
const asset = await new GLTFLoader().parseAsync(JSON.stringify(json), '');
const model = asset.scene, mixer = new AnimationMixer(model), report = [];
const groundIndex = json.nodes.length;
json.nodes.push({ name: 'CreatureGround', scale: [spec.scale, spec.scale, spec.scale],
    children: [...json.scenes[0].nodes] });
json.scenes[0].nodes = [groundIndex];
for (const animation of json.animations) {
    const clip = asset.animations.find(c => c.name === animation.name);
    mixer.stopAllAction();
    const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play();
    action.clampWhenFinished = true;
    const count = Math.ceil(clip.duration * 60), times = [], positions = [];
    let minCorrection = Infinity, maxCorrection = -Infinity;
    for (let i = 0; i <= count; i++) {
        const time = i / count * clip.duration;
        mixer.setTime(time); model.updateMatrixWorld(true);
        const descent = animation.name === spec.clips.death ? 1 - (i / count) ** 2 : 1;
        const clearance = spec.clearance + (spec.hoverClearance || 0) * descent;
        const y = clearance - new Box3().setFromObject(model, true).min.y * spec.scale;
        times.push(time); positions.push(0, y, 0);
        minCorrection = Math.min(minCorrection, y); maxCorrection = Math.max(maxCorrection, y);
    }
    const sampler = animation.samplers.length;
    animation.samplers.push({ input: append(times, 'SCALAR'), output: append(positions, 'VEC3'), interpolation: 'LINEAR' });
    animation.channels.push({ sampler, target: { node: groundIndex, path: 'translation' } });
    report.push({ name: clip.name, seconds: clip.duration, minCorrection, maxCorrection });
}
// Keep a self-contained inspection artifact, then pack the same data into runtime GLB.
fs.writeFileSync(new URL(spec.auditSource, root), JSON.stringify(json));
const chunks = []; let offset = 0;
for (let index = 0; index < buffers.length; index++) {
    const bytes = buffers[index], padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4);
    bytes.copy(padded);
    for (const view of json.bufferViews.filter(v => v.buffer === index)) {
        view.buffer = 0; view.byteOffset = (view.byteOffset || 0) + offset;
    }
    chunks.push(padded); offset += padded.length;
}
json.buffers = [{ byteLength: offset }];
const encoded = Buffer.from(JSON.stringify(json)), jsonChunk = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32);
encoded.copy(jsonChunk);
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + jsonChunk.length + offset, 8);
header.writeUInt32LE(jsonChunk.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(new URL(spec.output, root), Buffer.concat([header, jsonChunk, binHeader, ...chunks]));
fs.writeFileSync(new URL(`tools/combat-art/${id}-build-report.json`, root), JSON.stringify({ spec, clips: report }, null, 2));
console.log('Built', id, report);
