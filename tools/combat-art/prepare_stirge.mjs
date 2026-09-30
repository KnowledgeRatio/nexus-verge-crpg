/** Adapt the retained CC0 wasp into a Stirge authoring candidate, not a runtime registration. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { CylinderGeometry, Quaternion, Vector3, Matrix4 } from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';

const source = 'tools/combat-art/sources/quaternius-easy-enemies/Wasp-candidate.gltf';
const data = JSON.parse(fs.readFileSync(source));
const binary = Buffer.from(data.buffers[0].uri.split(',')[1], 'base64');
globalThis.ProgressEvent ??= class ProgressEvent {};
const loaded = await new GLTFLoader().parseAsync(JSON.stringify(data), '');
loaded.scene.updateMatrixWorld(true);
const head = loaded.scene.getObjectByName('Head');
const headIndex = data.nodes.findIndex(node => node.name === 'Head');
function append(values, type, componentType = 5126) {
    const array = componentType === 5126 ? new Float32Array(values) : new Uint32Array(values);
    const bytes = Buffer.from(array.buffer), buffer = data.buffers.length;
    data.buffers.push({ byteLength: bytes.length, uri: 'data:application/octet-stream;base64,' + bytes.toString('base64') });
    const view = data.bufferViews.push({ buffer, byteLength: bytes.length }) - 1;
    const width = { SCALAR: 1, VEC3: 3, VEC4: 4 }[type];
    const accessor = { bufferView: view, componentType, type, count: values.length / width };
    if (type === 'SCALAR') { accessor.min = [Math.min(...values)]; accessor.max = [Math.max(...values)]; }
    return data.accessors.push(accessor) - 1;
}
function read(index) {
    const a = data.accessors[index], view = data.bufferViews[a.bufferView];
    const width = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
    const size = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[a.componentType];
    const method = { 5126: 'readFloatLE', 5125: 'readUInt32LE', 5123: 'readUInt16LE', 5121: 'readUInt8' }[a.componentType];
    return Array.from({ length: a.count * width }, (_, i) => binary[method](
        (view.byteOffset || 0) + (a.byteOffset || 0) + Math.floor(i / width) * (view.byteStride || width * size) + i % width * size));
}
// Tone down the source's yellow bands and bright toy-like blue wings.
const colours = [[.23, .045, .027, 1], [.055, .035, .031, 1], [.17, .095, .20, .45], [.085, .025, .019, 1]];
data.materials.forEach((material, i) => {
    material.pbrMetallicRoughness.baseColorFactor = colours[i];
    if (i === 2) { material.alphaMode = 'BLEND'; material.doubleSided = true; }
});
const stingJoint = data.skins[0].joints.indexOf(data.nodes.findIndex(n => n.name === 'Sting'));
const headJoint = data.skins[0].joints.indexOf(headIndex);
for (const primitive of data.meshes[0].primitives) {
    const joints = read(primitive.attributes.JOINTS_0), weights = read(primitive.attributes.WEIGHTS_0);
    const indices = read(primitive.indices), kept = [];
    const influence = (vertex, joint) => [0, 1, 2, 3].reduce((sum, k) =>
        sum + (joints[vertex * 4 + k] === joint ? weights[vertex * 4 + k] : 0), 0);
    for (let i = 0; i < indices.length; i += 3) {
        if (!indices.slice(i, i + 3).some(vertex => influence(vertex, stingJoint) > .5)) {
            kept.push(...indices.slice(i, i + 3));
        }
    }
    primitive.indices = append(kept, 'SCALAR', 5125);
    // Keep dark insect eyes, but reduce the source's oversized spherical eye profile.
    if (primitive.material === 1) {
        const a = data.accessors[primitive.attributes.POSITION], view = data.bufferViews[a.bufferView];
        const p = read(primitive.attributes.POSITION), selected = [];
        for (let i = 0; i < a.count; i++) { if (influence(i, headJoint) > .8) { selected.push(i); } }
        if (selected.length) {
            const center = [0, 1, 2].map(axis => selected.reduce((sum, i) => sum + p[i * 3 + axis], 0) / selected.length);
            for (const i of selected) {
                for (let axis = 0; axis < 3; axis++) {
                    binary.writeFloatLE(center[axis] + (p[i * 3 + axis] - center[axis]) * .7,
                        (view.byteOffset || 0) + (a.byteOffset || 0) + i * (view.byteStride || 12) + axis * 4);
                }
            }
        }
    }
}
const start = new Vector3(1.62, 2.89, -.033), end = new Vector3(3.05, 2.75, -.033);
const direction = end.clone().sub(start);
const needle = new CylinderGeometry(.012, .052, direction.length(), 10, 1, true);
needle.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()));
needle.translate(...start.clone().add(end).multiplyScalar(.5).toArray());
needle.applyMatrix4(new Matrix4().copy(head.matrixWorld).invert());
const geometry = needle.toNonIndexed();
const positions = append([...geometry.attributes.position.array], 'VEC3');
geometry.computeBoundingBox();
data.accessors[positions].min = geometry.boundingBox.min.toArray();
data.accessors[positions].max = geometry.boundingBox.max.toArray();
const mesh = data.meshes.push({ name: 'Original feeding proboscis', primitives: [{ material: 3, attributes: {
    POSITION: positions, NORMAL: append([...geometry.attributes.normal.array], 'VEC3')
} }] }) - 1;
const node = data.nodes.push({ name: 'StirgeProboscis', mesh }) - 1;
(data.nodes[headIndex].children ||= []).push(node);
const tip = head.worldToLocal(end.clone());
const tipNode = data.nodes.push({ name: 'StirgeContact', translation: tip.toArray() }) - 1;
data.nodes[headIndex].children.push(tipNode);
// A forward feeding strike keeps flight posture. Discard the source's abdominal sting action.
const flight = data.animations.find(clip => clip.name === 'Wasp_Flying');
const strike = globalThis.structuredClone(flight); strike.name = 'Stirge_Feed';
for (const sampler of strike.samplers) {
    sampler.input = append(read(sampler.input).map(time => time * .4), 'SCALAR');
}
data.animations = data.animations.filter(clip => clip.name !== 'Wasp_Attack');
data.animations.push(strike);
data.buffers[0].uri = 'data:application/octet-stream;base64,' + binary.toString('base64');
fs.writeFileSync('tools/combat-art/stirge-candidate.gltf', JSON.stringify(data));
