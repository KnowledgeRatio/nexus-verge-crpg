import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { Buffer } from 'node:buffer';
import console from 'node:console';
import { deflateSync } from 'node:zlib';
import * as THREE from '../../vendor/three/three.module.min.js';
import { mergeGeometries } from '../../vendor/three/addons/utils/BufferGeometryUtils.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(root, 'data/tavernInteriorScene.json')));
const buckets = new Map();
let authorTransform;
const materials = {
    oak: { colour: '#746453', texture: 'wood', roughness: 0.84 },
    darkOak: { colour: '#493e32', texture: 'wood', roughness: 0.94 },
    cutWood: { colour: '#8e795f', texture: 'wood', roughness: 0.78 },
    ceilingWood: { colour: '#554634', texture: 'wood', roughness: 0.94 },
    rightWall: { colour: '#b3a58e', texture: 'stone', roughness: 1 },
    flagstone: { colour: '#b5b3a9', texture: 'floor', roughness: 0.82 },
    slate: { colour: '#919590', texture: 'floor', roughness: 0.89 },
    stone: { colour: '#afa597', texture: 'stone', roughness: 0.96 },
    soot: { colour: '#40382f', texture: 'stone', roughness: 1 },
    plaster: { colour: '#b9ac8f', texture: 'stone', roughness: 1 },
    iron: { colour: '#29251f', metalness: 0.12, roughness: 0.96 },
    brass: { colour: '#b18b4d', metalness: 0.72, roughness: 0.43 },
    pottery: { colour: '#8e5940', roughness: 0.82 },
    greenGlass: { colour: '#4d6d48', metalness: 0.12, roughness: 0.25 },
    cloth: { colour: '#596f6b', roughness: 1 },
    cream: { colour: '#d4bd8d', roughness: 0.85 },
    flame: { colour: '#ffad37', emissive: '#ff8a21', roughness: 1 },
    pane: { colour: '#6f8790', emissive: '#334754', roughness: 0.65 },
    rug: { colour: '#7a4b3d', roughness: 1 }
};

function part(shape, size, position, material, rotation = [0, 0, 0], parent) {
    const types = { box: THREE.BoxGeometry, cylinder: THREE.CylinderGeometry, sphere: THREE.SphereGeometry,
        torus: THREE.TorusGeometry, cone: THREE.ConeGeometry };
    let geometry = new types[shape](...size);
    if (shape === 'box') {
        const uv = geometry.attributes.uv;
        for (let i = 0; i < uv.count; i++) {
            const face = Math.floor(i / 4);
            const dims = face < 2 ? [size[2], size[1]] : face < 4 ? [size[0], size[2]] : [size[0], size[1]];
            uv.setXY(i, uv.getX(i) * dims[0], uv.getY(i) * dims[1]);
        }
    }
    const transform = new THREE.Object3D();
    transform.position.fromArray(position);
    transform.rotation.set(...rotation);
    transform.updateMatrix();
    if (parent) transform.matrix.premultiply(parent);
    if (authorTransform) transform.matrix.premultiply(authorTransform);
    geometry.applyMatrix4(transform.matrix);
    if (geometry.index) {
        const indexed = geometry;
        geometry = indexed.toNonIndexed();
        indexed.dispose();
    }
    if (!buckets.has(material)) buckets.set(material, []);
    buckets.get(material).push(geometry);
}
const box = (size, position, mat, rotation, parent) => part('box', size, position, mat, rotation, parent);
const cylinder = (size, position, mat, rotation, parent) => part('cylinder', size, position, mat, rotation, parent);
const ring = (radius, tube, position, material, rotation = [Math.PI / 2, 0, 0], parent) =>
    part('torus', [radius, tube, 6, 20], position, material, rotation, parent);
const { width, depth, height } = config.room;
box([width, 0.25, depth], [0, -0.15, 0], 'soot');
for (let row = 0; row < 16; row++) {
    let x = -width / 2;
    let column = 0;
    while (x < width / 2 - 0.01) {
        const slabWidth = Math.min(width / 2 - x, column === 0 ? 0.5 + row % 3 * 0.27 :
            0.7 + ((row * 7 + column * 3) % 5) * 0.17);
        box([slabWidth - 0.025, 0.065, 0.6], [x + slabWidth / 2, 0.004, -depth / 2 + row * 0.625 + 0.31],
            (row * 7 + column * 3) % 5 ? 'flagstone' : 'slate', [0, Math.sin(row * 9 + column) * 0.006, 0]);
        x += slabWidth;
        column++;
    }
}
for (let plank = 0; plank < 24; plank++) {
    box([0.49, 0.12, depth], [-5.75 + plank * 0.5, height + 0.06, 0], 'ceilingWood');
}
box([width, height, 0.22], [0, height / 2, -depth / 2], 'plaster');
box([0.22, height, depth], [-width / 2, height / 2, 0], 'plaster');
// A low cutaway on the camera side keeps the single room readable while orbiting.
box([0.22, 1.05, depth], [width / 2, 0.5, 0], 'stone');
box([0.22, height - 1.05, depth], [width / 2, 1.05 + (height - 1.05) / 2, 0], 'rightWall');
box([width, 0.62, 0.3], [0, 0.3, -4.85], 'stone');
box([0.3, 0.62, depth], [-5.85, 0.3, 0], 'stone');
for (const x of [-5.7, -2, 2, 5.7]) {
    box([0.27, height, 0.32], [x, height / 2, -4.8], 'darkOak');
    box([0.45, 0.2, 0.45], [x, 0.15, -4.8], 'stone');
}
for (const y of [1, 3.95]) box([width, 0.2, 0.24], [0, y, -4.78], 'darkOak');
for (const z of [-4.65, -0.7, 3.2]) {
    box([0.32, height, 0.32], [-5.65, height / 2, z], 'darkOak');
    box([0.32, height, 0.32], [5.65, height / 2, z], 'darkOak');
    if (z < 0) box([width, 0.22, 0.25], [0, height - 0.12, z], 'darkOak');
    box([1.65, 0.18, 0.2], [-5.15, height - 0.65, z], 'oak', [0, 0, 0.7]);
}
// Stone fireplace, open firebox, chimney and timber mantel.
authorTransform = new THREE.Matrix4().makeTranslation(9, 0, 0.55);
box([2.6, 0.2, 1.5], [-4.5, 0.12, -3.95], 'stone');
for (const x of [-5.55, -3.45]) {
    for (let row = 0; row < 5; row++) box([0.45, 0.32, 1], [x, 0.4 + row * 0.34, -4.15], 'stone');
}
box([2.6, 0.45, 1.1], [-4.5, 2.03, -4.15], 'stone');
box([2.05, 2, 0.85], [-4.5, 3.22, -4.35], 'stone');
box([2.85, 0.19, 1.3], [-4.5, 2.3, -4.03], 'darkOak');
box([1.65, 1.6, 0.05], [-4.5, 1.05, -4.7], 'soot');
box([1.7, 0.04, 0.85], [-4.5, 0.25, -4.05], 'soot');
for (let i = 0; i < 4; i++) {
    cylinder([0.12, 0.13, 1.3, 9], [-4.5, 0.4 + i * 0.04, -4.1 + (i - 1.5) * 0.16], 'darkOak',
        [0, 0.25 * (i % 2 ? 1 : -1), Math.PI / 2]);
    part('cone', [0.14, 0.37 + (i % 3) * 0.14, 7], [-4.95 + i * 0.3, 0.66, -4.02], 'flame',
        [0, 0, Math.sin(i * 2) * 0.13]);
}
for (const x of [-5.1, -3.9]) box([0.06, 0.45, 0.04], [x, 0.45, -3.55], 'iron');
box([1.4, 0.04, 0.04], [-4.5, 0.6, -3.55], 'iron');
for (let row = 0; row < 7; row++) {
    for (let column = 0; column < 4; column++) {
        box([0.48, 0.27, 0.12], [-5.25 + column * 0.5, 2.4 + row * 0.29, -3.89],
            (row + column) % 4 ? 'stone' : 'slate', [0, 0, Math.sin(row * 5 + column) * 0.015]);
    }
}
ring(0.3, 0.025, [-4.5, 1.55, -3.98], 'iron', [0, 0, 0]);
part('sphere', [0.28, 16, 10], [-4.5, 1.18, -3.98], 'iron');
authorTransform = null;

// Back bar has panelled joinery, a foot rail, open shelves and visible crockery.
authorTransform = new THREE.Matrix4().makeRotationY(Math.PI / 2);
authorTransform.setPosition(-1.2, 0, -0.3);
box([5.4, 1.13, 0.8], [1, 0.59, -2.75], 'darkOak');
for (let i = 0; i < 6; i++) {
    box([0.75, 0.83, 0.035], [-1.2 + i * 0.87, 0.62, -2.33], 'oak');
    box([0.6, 0.62, 0.04], [-1.2 + i * 0.87, 0.62, -2.3], 'cutWood');
}
box([5.7, 0.18, 1.1], [1, 1.25, -2.7], 'cutWood');
cylinder([0.035, 0.035, 5.3, 10], [1, 0.22, -2.02], 'brass', [0, 0, Math.PI / 2]);
for (const x of [-1.3, 1, 3.3]) box([0.04, 0.24, 0.35], [x, 0.15, -2.15], 'iron');
for (const y of [0.9, 1.8, 2.7]) box([5.5, 0.11, 0.45], [1.2, y, -4.55], 'darkOak');
for (const x of [-1.55, 1.2, 3.95]) box([0.13, 2.6, 0.4], [x, 1.6, -4.6], 'darkOak');
function bottle(x, y, z, parent) {
    cylinder([0.085, 0.09, 0.27, 10], [x, y + 0.14, z], 'greenGlass', undefined, parent);
    cylinder([0.035, 0.04, 0.14, 10], [x, y + 0.34, z], 'greenGlass', undefined, parent);
    cylinder([0.04, 0.04, 0.035, 8], [x, y + 0.42, z], 'cutWood', undefined, parent);
}
function mug(x, y, z, parent) {
    cylinder([0.09, 0.075, 0.16, 12], [x, y + 0.08, z], 'pottery', undefined, parent);
    cylinder([0.073, 0.073, 0.006, 12], [x, y + 0.163, z], 'soot', undefined, parent);
    ring(0.065, 0.017, [x + 0.1, y + 0.09, z], 'pottery', [0, 0, 0], parent);
}
for (const y of [0.96, 1.86, 2.76]) {
    for (let i = 0; i < 14; i++) {
        const x = -1.3 + i * 0.35;
        if (i % 4 === 0) mug(x, y, -4.5); else bottle(x, y, -4.55);
    }
}
for (const x of [-0.7, 0.3, 2.7]) mug(x, 1.34, -2.55);
bottle(1.8, 1.34, -2.8);
box([0.48, 0.015, 0.36], [2.15, 1.35, -2.55], 'cream', [0, 0.2, 0]);
for (const x of [-0.4, 1.3, 2.8]) {
    cylinder([0.28, 0.26, 0.11, 16], [x, 0.82, -1.65], 'darkOak');
    for (const [dx, dz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) {
        box([0.07, 0.8, 0.07], [x + dx, 0.4, -1.65 + dz], 'oak');
    }
}
box([0.7, 0.025, 0.9], [-0.7, 1.36, -2.65], 'cloth');
box([0.7, 0.55, 0.025], [-0.7, 1.1, -2.18], 'cloth', [0, 0, -0.03]);
authorTransform = null;

function barrel(x, z) {
    const points = [[0.37, 0], [0.44, 0.15], [0.49, 0.5], [0.44, 0.9], [0.37, 1.05]];
    for (let i = 0; i < points.length - 1; i++) {
        const [bottom, y0] = points[i], [top, y1] = points[i + 1];
        cylinder([top, bottom, y1 - y0, 16], [x, (y0 + y1) / 2, z], 'oak');
    }
    for (const y of [0.14, 0.53, 0.92]) ring(y === 0.53 ? 0.49 : 0.44, 0.028, [x, y, z], 'iron');
    cylinder([0.36, 0.36, 0.025, 16], [x, 1.06, z], 'cutWood');
}
barrel(-4.9, -4.1);
barrel(-5.15, 2.3);
barrel(5.2, 2.35);

function candle(x, y, z, parent) {
    cylinder([0.12, 0.12, 0.025, 12], [x, y, z], 'brass', undefined, parent);
    cylinder([0.045, 0.05, 0.21, 10], [x, y + 0.12, z], 'cream', undefined, parent);
    part('cone', [0.033, 0.1, 8], [x, y + 0.275, z], 'flame', undefined, parent);
}
for (const table of config.tables) {
    const transform = new THREE.Object3D();
    transform.position.fromArray(table.position);
    transform.rotation.y = table.rotation;
    transform.updateMatrix();
    const parent = transform.matrix;
    for (let plank = 0; plank < 4; plank++) {
        box([table.length, 0.12, 0.255], [0, 0.92, (plank - 1.5) * 0.265], 'cutWood', undefined, parent);
    }
    for (const x of [-table.length * 0.34, table.length * 0.34]) {
        box([0.16, 0.87, 0.7], [x, 0.44, 0], 'darkOak', undefined, parent);
        box([0.38, 0.12, 0.9], [x, 0.1, 0], 'oak', undefined, parent);
        for (const z of [-0.88, 0.88]) box([0.12, 0.42, 0.35], [x, 0.22, z], 'darkOak', undefined, parent);
    }
    box([table.length * 0.75, 0.12, 0.12], [0, 0.35, 0], 'oak', undefined, parent);
    for (const z of [-0.88, 0.88]) box([table.length, 0.1, 0.38], [0, 0.47, z], 'oak', undefined, parent);
    box([0.38, 0.012, 1.03], [0.35, 0.988, 0], 'cloth', undefined, parent);
    candle(0.35, 1.01, 0.1, parent);
    mug(-0.65, 0.99, 0.28, parent);
    mug(0.85, 0.99, -0.25, parent);
    cylinder([0.19, 0.15, 0.035, 18], [-0.4, 1, -0.15], 'cream', undefined, parent);
    bottle(0, 0.99, -0.2, parent);
    for (let i = 0; i < 4; i++) {
        part('sphere', [0.07, 10, 6], [-0.5 + i * 0.07, 1.055, -0.15], 'cutWood', undefined, parent);
    }
    box([0.38, 0.43, 0.018], [0.35, 0.77, 0.53], 'cloth', [0.04, 0, 0], parent);
}
for (const x of [-1.15, 1.15]) {
    box([1.2, 1.7, 0.06], [x, 2.3, -4.84], 'pane');
    for (const offset of [-0.65, 0, 0.65]) box([0.08, 1.9, 0.14], [x + offset, 2.3, -4.77], 'darkOak');
    for (const y of [1.4, 2.3, 3.2]) box([1.5, 0.09, 0.14], [x, y, -4.77], 'darkOak');
    box([1.7, 0.12, 0.4], [x, 1.35, -4.65], 'oak');
    for (let row = 0; row < 4; row++) for (let column = 0; column < 3; column++) {
        for (const angle of [-0.6, 0.6]) box([0.018, 0.48, 0.02],
            [x - 0.4 + column * 0.4, 1.65 + row * 0.42, -4.73], 'iron', [0, 0, angle]);
    }
}
for (const [x, z] of [[-3.4, -1.2], [-0.3, 1.4]]) {
    cylinder([0.018, 0.018, 1.4, 8], [x, 3.6, z], 'iron');
    ring(0.48, 0.035, [x, 2.83, z], 'iron');
    for (let i = 0; i < 5; i++) candle(x + Math.cos(i * Math.PI * 2 / 5) * 0.48,
        2.85, z + Math.sin(i * Math.PI * 2 / 5) * 0.48);
}
// Firewood, hanging cloth and mismatched pots break the repeated furniture silhouettes.
for (let i = 0; i < 12; i++) {
    cylinder([0.11, 0.13, 0.55 + (i % 3) * 0.1, 9], [5.6 - (i % 3) * 0.22,
        0.2 + Math.floor(i / 3) * 0.18, -2.1], 'oak', [Math.PI / 2, 0.04 * i, 0]);
}
for (const [x, z, y] of [[4, -3.5, 2.42], [4.7, -3.5, 2.42], [-5.55, 0.2, 2.85], [-5.55, -2.7, 2.85],
    [3.9, 3.35, 1.03], [-3.7, 3.6, 1.03]]) {
    part('sphere', [0.16, 16, 10], [x, y + 0.16, z], 'pottery');
    cylinder([0.08, 0.11, 0.2, 12], [x, y + 0.32, z], 'pottery');
    ring(0.12, 0.025, [x + 0.18, y + 0.25, z], 'pottery', [0, 0, 0]);
}
for (const x of [-2.5, 2.4]) {
    box([0.65, 1.15, 0.035], [x, 3.3, -4.57], x < 0 ? 'cloth' : 'rug');
    cylinder([0.025, 0.025, 0.85, 8], [x, 3.89, -4.55], 'brass', [0, 0, Math.PI / 2]);
}

// Small original wood texture, embedded in the GLB; no external authoring dependency.
function pngWood() {
    const size = 256, bytes = Buffer.alloc((size * 4 + 1) * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const offset = y * (size * 4 + 1) + 1 + x * 4;
        const grain = Math.sin(y * 0.23 + Math.sin(x * 0.028) * 3.3) * 5 +
            Math.sin(y * 1.47 + Math.cos(x * 0.013)) * 2;
        const noise = (((x * 73856093) ^ (y * 19349663)) >>> 0) % 23 - 11;
        const scar = (x * 7 + y * 37) % 257 < 2 ? -28 : 0;
        bytes[offset] = 190 + grain + noise + scar;
        bytes[offset + 1] = 179 + grain + noise + scar;
        bytes[offset + 2] = 162 + grain + noise + scar;
        bytes[offset + 3] = 255;
    }
    const crc = buffer => {
        let value = 0xffffffff;
        for (const byte of buffer) {
            value ^= byte;
            for (let i = 0; i < 8; i++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
        }
        return (value ^ 0xffffffff) >>> 0;
    };
    const chunk = (type, data) => {
        const label = Buffer.from(type), header = Buffer.alloc(4), footer = Buffer.alloc(4);
        header.writeUInt32BE(data.length); footer.writeUInt32BE(crc(Buffer.concat([label, data])));
        return Buffer.concat([header, label, data, footer]);
    };
    const header = Buffer.alloc(13);
    header.writeUInt32BE(size); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header),
        chunk('IDAT', deflateSync(bytes)), chunk('IEND', Buffer.alloc(0))]);
}

const gltf = { asset: { version: '2.0', generator: 'Nexus Verge original tavern mesh builder' }, scene: 0,
    scenes: [{ name: 'Single room tavern cutaway', nodes: [] }], nodes: [], meshes: [], materials: [],
    accessors: [], bufferViews: [], buffers: [{ byteLength: 0 }], images: [], textures: [],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }] };
const chunks = [];
let offset = 0;
function append(buffer, target) {
    const aligned = Buffer.alloc(Math.ceil(buffer.byteLength / 4) * 4);
    Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength).copy(aligned);
    const index = gltf.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: buffer.byteLength,
        ...(target ? { target } : {}) }) - 1;
    chunks.push(aligned); offset += aligned.byteLength;
    return index;
}
const textureIds = {};
for (const [name, bytes] of Object.entries({ wood: pngWood(),
    stone: fs.readFileSync(path.join(root, 'data/graphics/combat/textures/dungeon-masonry-v1.png')),
    floor: fs.readFileSync(path.join(root, 'data/graphics/combat/textures/dungeon-flagstone-v1.png')) })) {
    const image = gltf.images.push({ bufferView: append(bytes), mimeType: 'image/png', name }) - 1;
    textureIds[name] = gltf.textures.push({ source: image, sampler: 0 }) - 1;
}
let triangles = 0;
for (const [name, geometries] of buckets) {
    const geometry = mergeGeometries(geometries);
    geometry.computeBoundingBox();
    const attributes = {};
    for (const [key, semantic] of [['position', 'POSITION'], ['normal', 'NORMAL'], ['uv', 'TEXCOORD_0']]) {
        const attribute = geometry.attributes[key];
        attributes[semantic] = gltf.accessors.push({ bufferView: append(attribute.array, 34962),
            componentType: 5126, count: attribute.count, type: attribute.itemSize === 2 ? 'VEC2' : 'VEC3',
            ...(key === 'position' ? { min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray() } : {}) }) - 1;
    }
    const spec = materials[name], colour = new THREE.Color(spec.colour);
    const material = gltf.materials.push({ name, pbrMetallicRoughness: {
        baseColorFactor: [...colour.toArray(), 1], roughnessFactor: spec.roughness,
        metallicFactor: spec.metalness || 0,
        ...(spec.texture ? { baseColorTexture: { index: textureIds[spec.texture] } } : {}) },
    ...(spec.emissive ? { emissiveFactor: new THREE.Color(spec.emissive).toArray() } : {}) }) - 1;
    const mesh = gltf.meshes.push({ name, primitives: [{ attributes, material, mode: 4 }] }) - 1;
    gltf.scenes[0].nodes.push(gltf.nodes.push({ name, mesh }) - 1);
    triangles += geometry.attributes.position.count / 3;
    geometry.dispose(); geometries.forEach(part => part.dispose());
}
gltf.buffers[0].byteLength = offset;
const jsonBytes = Buffer.from(JSON.stringify(gltf));
const json = Buffer.alloc(Math.ceil(jsonBytes.length / 4) * 4, 32); jsonBytes.copy(json);
const header = Buffer.alloc(20), binaryHeader = Buffer.alloc(8);
header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + offset, 8);
header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binaryHeader.writeUInt32LE(offset); binaryHeader.writeUInt32LE(0x004e4942, 4);
const output = path.join(root, config.model);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, Buffer.concat([header, json, binaryHeader, ...chunks]));
console.log(`${config.model}: ${triangles.toLocaleString()} triangles, ${gltf.meshes.length} material batches, ${fs.statSync(output).size} bytes`);
