/** Retain the six runtime motions and unchanged embedded textures. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { compactSkinnedBuffers } from './compact_skinned_glb.mjs';

const source = fs.readFileSync('tools/combat-art/owlbear-candidate.glb');
const length = source.readUInt32LE(12);
const data = JSON.parse(source.subarray(20, 20 + length));
const binary = source.subarray(28 + length);
const keep = new Set(['bear_idle_01', 'bear_walk', 'bear_attack_01', 'bear_death_01', 'Owlbear_Beak', 'Owlbear_Hit']);
data.animations = data.animations.filter(clip => keep.has(clip.name));
const images = data.images.map(image => {
    const view = data.bufferViews[image.bufferView];
    return { image, bytes: binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength) };
});
delete data.images;
const chunks = [compactSkinnedBuffers(data, binary)];
let offset = chunks[0].length;
data.images = images.map(({ image, bytes }) => {
    const bufferView = data.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length }) - 1;
    const padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4); bytes.copy(padded);
    chunks.push(padded); offset += padded.length;
    return { ...image, bufferView };
});
data.buffers = [{ byteLength: offset }];
const encoded = Buffer.from(JSON.stringify(data));
const json = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32); encoded.copy(json);
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + offset, 8);
header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync('data/graphics/combat/owlbear-v1.glb', Buffer.concat([header, json, binHeader, ...chunks]));
