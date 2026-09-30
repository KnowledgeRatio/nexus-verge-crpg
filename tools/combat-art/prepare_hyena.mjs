/** Anatomy/coat candidate derived from the retained CC0 wolf; inspect before admission. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { deflateSync } from 'node:zlib';
import { SphereGeometry, Vector3 } from '../../vendor/three/three.module.min.js';
const root = new URL('../../', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('tools/combat-art/sources/quaternius-animals/Wolf.gltf', root)));
const buffers = data.buffers.map(b => Buffer.from(b.uri.split(',')[1], 'base64'));
const clamp = x => Math.max(0, Math.min(1, x));
const seen = new Map();
// A procedural planar coat retains clear spots on the source's sparse triangles.
const width = 1024, height = 512, pixels = Buffer.alloc(height * (width * 4 + 1));
function coat(y, z, top = false) {
    const row = Math.floor(y / .34), col = Math.floor(z / .39 + (row % 2) * .5);
    const jitter = Math.sin(row * 17.31 + col * 29.73);
    const cy = (row + .5) * .34 + jitter * .055;
    const cz = (col + .5 - (row % 2) * .5) * .39 + jitter * .04;
    const distance = Math.hypot((y - cy) / (.095 + jitter * .012), (z - cz) / .115);
    const black = !top && (y < .40 || (z > 2.0 && y < 2.23));
    const dark = distance > .28 && distance < 1;
    return black ? [36, 29, 20] : dark ? [67, 47, 26] : [174, 144, 98];
}
for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
        const top = px >= 512;
        const y = (1 - py / (height - 1)) * (top ? 1.6 : 2.7);
        const z = (px % 512) / 511 * 5.6 - 3;
        const rgb = coat(y, z, top), at = py * (width * 4 + 1) + 1 + px * 4;
        const grain = Math.sin(px * 19.1 + py * 31.7) * 4;
        for (let c = 0; c < 3; c++) { pixels[at + c] = rgb[c] + grain; }
        pixels[at + 3] = 255;
    }
}
function pngChunk(type, payload) {
    const body = Buffer.concat([Buffer.from(type), payload]); let crc = 0xffffffff;
    for (const byte of body) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) { crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    }
    const header = Buffer.alloc(4), footer = Buffer.alloc(4);
    header.writeUInt32BE(payload.length); footer.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([header, body, footer]);
}
const imageHeader = Buffer.alloc(13); imageHeader.writeUInt32BE(width); imageHeader.writeUInt32BE(height, 4);
imageHeader[8] = 8; imageHeader[9] = 6;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', imageHeader),
    pngChunk('IDAT', deflateSync(pixels)), pngChunk('IEND', Buffer.alloc(0))]);
const imageBuffer = buffers.push(png) - 1;
const imageView = data.bufferViews.push({ buffer: imageBuffer, byteOffset: 0, byteLength: png.length }) - 1;
data.images = [{ name: 'Original procedural hyena coat', mimeType: 'image/png', bufferView: imageView }];
data.textures = [{ source: 0 }];
function read(id, i) {
    const a = data.accessors[id], v = data.bufferViews[a.bufferView];
    const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    const size = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[a.componentType];
    const method = { 5121: 'readUInt8', 5123: 'readUInt16LE', 5125: 'readUInt32LE', 5126: 'readFloatLE' }[a.componentType];
    return Array.from({ length: n }, (_, c) => buffers[v.buffer][method](
        (v.byteOffset || 0) + (a.byteOffset || 0) + i * (v.byteStride || n * size) + c * size));
}
function attribute(values, type, joints = false) {
    const width = { VEC2: 2, VEC3: 3, VEC4: 4 }[type];
    const bytes = Buffer.from((joints ? new Uint16Array(values) : new Float32Array(values)).buffer);
    const buffer = buffers.push(bytes) - 1;
    const view = data.bufferViews.push({ buffer, byteOffset: 0, byteLength: bytes.length }) - 1;
    const a = { bufferView: view, componentType: joints ? 5123 : 5126, type, count: values.length / width };
    if (type === 'VEC3') {
        a.min = [0, 1, 2].map(axis => Math.min(...values.filter((_, i) => i % 3 === axis)));
        a.max = [0, 1, 2].map(axis => Math.max(...values.filter((_, i) => i % 3 === axis)));
    }
    return data.accessors.push(a) - 1;
}
for (const mesh of data.meshes) {
    for (const primitive of mesh.primitives) {
        const material = data.materials[primitive.material];
        const id = primitive.attributes.POSITION;
        if (seen.has(id)) { continue; }
        const a = data.accessors[id], v = data.bufferViews[a.bufferView], bytes = buffers[v.buffer];
        const uv = [], bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
        for (let i = 0; i < a.count; i++) {
            const at = (v.byteOffset || 0) + (a.byteOffset || 0) + i * (v.byteStride || 12);
            const x = bytes.readFloatLE(at), y = bytes.readFloatLE(at + 4), z = bytes.readFloatLE(at + 8);
            const fore = Math.exp(-(((z - .8) / .8) ** 2)) * clamp((y - .45) / 1.0);
            const hind = clamp((-z + .3) / 1.5) * clamp((y - .4) / 1.0);
            const head = clamp((z - 1.4) / .5) * clamp((y - 1.5) / .5);
            let nx = x * (1 + .38 * fore + .15 * head);
            let ny = y + .20 * fore - .28 * hind;
            let nz = z > 1.8 ? 1.8 + (z - 1.8) * .72 : z;
            if (z < -1.45) { nz = -1.45 + (z + 1.45) * .50; }
            if (y > 2.40 && z > 1.3) {
                ny = 2.40 + (y - 2.40) * .53;
                nx *= 1.08;
            }
            [nx, ny, nz].forEach((value, axis) => {
                bytes.writeFloatLE(value, at + axis * 4);
                bounds.min[axis] = Math.min(bounds.min[axis], value);
                bounds.max[axis] = Math.max(bounds.max[axis], value);
            });
            uv.push((z + 3) / 5.6 * .5, 1 - y / 2.7);
        }
        Object.assign(a, bounds); seen.set(id, true);
        if (['Main', 'Main_Light'].includes(material.name)) {
            const buffer = Buffer.from(new Float32Array(uv).buffer), index = buffers.push(buffer) - 1;
            const view = data.bufferViews.push({ buffer: index, byteOffset: 0, byteLength: buffer.length }) - 1;
            primitive.attributes.TEXCOORD_0 = data.accessors.push({ bufferView: view, componentType: 5126, type: 'VEC2', count: a.count }) - 1;
            material.pbrMetallicRoughness.baseColorTexture = { index: 0 };
            material.pbrMetallicRoughness.baseColorFactor = [1, 1, 1, 1];
            material.pbrMetallicRoughness.roughnessFactor = .95;
        }
        if (material.name === 'Eyes_Black') { material.pbrMetallicRoughness.baseColorFactor = [.32, .16, .015, 1]; }
        if (['Main', 'Main_Light'].includes(material.name)) {
            const values = Object.fromEntries(Object.keys(primitive.attributes).map(key => [key, []]));
            const ids = primitive.indices === undefined ? Array.from({ length: a.count }, (_, i) => i) :
                Array.from({ length: data.accessors[primitive.indices].count }, (_, i) => read(primitive.indices, i)[0]);
            for (let tri = 0; tri < ids.length; tri += 3) {
                const indices = ids.slice(tri, tri + 3);
                const points = indices.map(i => new Vector3(...read(primitive.attributes.POSITION, i)));
                // Remove the old pointed ear tips before adding round, independently skinned ears.
                if (points.some(p => p.y > 2.38 && p.z > 1.3)) { continue; }
                const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
                const top = points.every(p => p.y > .6 && p.z < 1.8) &&
                    Math.abs(normal.y) > Math.abs(normal.x) && Math.abs(normal.y) > Math.abs(normal.z);
                for (const [j, i] of indices.entries()) {
                    for (const [key, accessor] of Object.entries(primitive.attributes)) {
                        const p = points[j];
                        values[key].push(...(key === 'TEXCOORD_0' && top ?
                            [.5 + clamp((p.z + 3) / 5.6) * .5, 1 - clamp((p.x + .8) / 1.6)] : read(accessor, i)));
                    }
                }
            }
            primitive.attributes = Object.fromEntries(Object.entries(values).map(([key, values]) =>
                [key, attribute(values, data.accessors[primitive.attributes[key]].type, key === 'JOINTS_0')]));
            delete primitive.indices;
        }
    }
}
const earMaterial = data.materials.push({ name: 'Hyena rounded ears', pbrMetallicRoughness: {
    baseColorFactor: [.29, .20, .10, 1], roughnessFactor: 1, metallicFactor: 0 } }) - 1;
const headJoint = data.skins[0].joints.indexOf(data.nodes.findIndex(node => node.name === 'Neck3'));
for (const sign of [-1, 1]) {
    const geo = new SphereGeometry(1, 12, 10).scale(.105, .14, .04)
        .translate(sign * .28, 2.42, 1.99).toNonIndexed();
    const count = geo.attributes.position.count;
    data.meshes[0].primitives.push({ material: earMaterial, attributes: {
        POSITION: attribute([...geo.attributes.position.array], 'VEC3'),
        NORMAL: attribute([...geo.attributes.normal.array], 'VEC3'),
        JOINTS_0: attribute(Array.from({ length: count }, () => [headJoint, 0, 0, 0]).flat(), 'VEC4', true),
        WEIGHTS_0: attribute(Array.from({ length: count }, () => [1, 0, 0, 0]).flat(), 'VEC4') } });
    geo.dispose();
}
data.buffers = buffers.map(bytes => ({ byteLength: bytes.length, uri: 'data:application/octet-stream;base64,' + bytes.toString('base64') }));
data.asset.extras = { source: 'Quaternius CC0 Wolf', status: 'Hyena anatomy and coat candidate; not proof of visual acceptance' };
fs.writeFileSync(new URL('tools/combat-art/hyena-candidate.gltf', root), JSON.stringify(data));
