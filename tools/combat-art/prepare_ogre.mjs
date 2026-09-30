/** Armed giant bodies from giantBodySpecs.json, using the retained anatomical base and CC0 clips. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { Matrix4, Vector3, Quaternion, Texture, CylinderGeometry, BufferGeometry,
    Float32BufferAttribute, AnimationMixer, LoopOnce, Box3 } from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { addBovineFeatures } from './bovine_features.mjs';
import { authorHornAttack } from './author_horn_attack.mjs';
import { addTwinHeads } from './twin_heads.mjs';
import { mirrorBodyMotion } from './mirror_body_motion.mjs';
import { addHyenaFeatures } from './hyena_features.mjs';
import { retargetAnatomicalMelee } from './retarget_anatomical_melee.mjs';
import { addOrcFeatures } from './orc_features.mjs';
import { authorGroundedMotion } from './author_grounded_motion.mjs';
import { addBugbearFeatures } from './bugbear_features.mjs';

const data = JSON.parse(fs.readFileSync('tools/combat-art/giant-base-candidate.gltf'));
const id = process.argv[2] || 'ogre';
const spec = JSON.parse(fs.readFileSync('tools/combat-art/giantBodySpecs.json'))[id];
if (!spec) { throw new Error(`Unknown giant body ${id}`); }
function read(index) {
    const a = data.accessors[index], v = data.bufferViews[a.bufferView];
    const bytes = Buffer.from(data.buffers[v.buffer].uri.split(',')[1], 'base64');
    const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
    const size = { 5126: 4, 5123: 2, 5125: 4, 5121: 1 }[a.componentType];
    const method = { 5126: 'readFloatLE', 5123: 'readUInt16LE', 5125: 'readUInt32LE', 5121: 'readUInt8' }[a.componentType];
    if (!width || !size || (a.normalized && ![5121, 5123].includes(a.componentType))) {
        throw new Error('Unsupported giant accessor');
    }
    const values = Array.from({ length: a.count * width }, (_, i) => bytes[method](
        (v.byteOffset || 0) + (a.byteOffset || 0) + Math.floor(i / width) * (v.byteStride || width * size) + i % width * size));
    return a.normalized ? values.map(value => value / (a.componentType === 5121 ? 255 : 65535)) : values;
}
function append(values, type = 'VEC3', componentType = 5126) {
    const ArrayType = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[componentType];
    if (!ArrayType) { throw new Error('Unsupported giant output component type'); }
    const bytes = Buffer.from(new ArrayType(values).buffer);
    const buffer = data.buffers.length, width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[type];
    data.buffers.push({ byteLength: bytes.length, uri: 'data:application/octet-stream;base64,' + bytes.toString('base64') });
    const view = data.bufferViews.push({ buffer, byteLength: bytes.length }) - 1;
    return data.accessors.push({ bufferView: view, componentType, type, count: values.length / width,
        min: Array.from({ length: width }, (_, axis) => values.reduce((n, x, i) => i % width === axis ? Math.min(n, x) : n, Infinity)),
        max: Array.from({ length: width }, (_, axis) => values.reduce((n, x, i) => i % width === axis ? Math.max(n, x) : n, -Infinity)) }) - 1;
}
const skin = data.skins[0], matrices = read(skin.inverseBindMatrices);
const inverse = skin.joints.map((_, i) => new Matrix4().fromArray(matrices, i * 16));
const bind = inverse.map(matrix => matrix.clone().invert());
const bodyMeshIndex = data.nodes.find(node => node.name === 'SuperHero_Male').mesh;
for (const mesh of data.meshes) {
    for (const primitive of mesh.primitives) {
        const a = primitive.attributes;
        if (a.JOINTS_0 === undefined) { continue; }
        const original = read(a.POSITION), joints = read(a.JOINTS_0), weights = read(a.WEIGHTS_0), positions = [];
        for (let vertex = 0; vertex < original.length / 3; vertex++) {
            const point = new Vector3().fromArray(original, vertex * 3), result = new Vector3();
            if (spec.bovineFeatures && point.y < .14) {
                // Collapse the human foot inside its replacement hoof while preserving the skin weights.
                point.set(Math.sign(point.x) * .114, .14, -.087);
            }
            for (let influence = 0; influence < 4; influence++) {
                const i = vertex * 4 + influence, weight = weights[i];
                if (!weight) { continue; }
                const joint = joints[i], name = data.nodes[skin.joints[joint]].name;
                const factor = /spine|pelvis/.test(name) ? spec.torsoBulk : /Head/.test(name) ? spec.headBulk :
                    /upperarm|lowerarm|thigh|calf/.test(name) ? spec.limbBulk : 1;
                const local = point.clone().applyMatrix4(inverse[joint]);
                local.x *= factor; local.z *= factor;
                if (spec.bovineFeatures && /foot|ball/.test(name)) {
                    local.x *= .65; local.z *= .55;
                }
                result.addScaledVector(local.applyMatrix4(bind[joint]), weight);
            }
            // Broaden the lower jaw and brow without moving the eye sockets or neck pivots.
            if (mesh === data.meshes[bodyMeshIndex] && point.y > 1.60 && point.y < 1.73) {
                const jaw = Math.sin((point.y - 1.60) / .13 * Math.PI);
                result.x *= 1 + jaw * spec.jawWidth;
            }
            if (mesh === data.meshes[bodyMeshIndex] && point.y > 1.73 && point.y < 1.78 && point.z > .025) {
                result.z += Math.sin((point.y - 1.73) / .05 * Math.PI) * spec.browDepth;
            }
            positions.push(...result.toArray());
        }
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geometry.setIndex(read(primitive.indices)); geometry.computeVertexNormals();
        a.POSITION = append(positions); a.NORMAL = append(Array.from(geometry.attributes.normal.array));
    }
}
const ogreSkin = data.materials.find(material => material.name === 'MI_Superhero_Male').pbrMetallicRoughness;
delete ogreSkin.baseColorTexture;
ogreSkin.baseColorFactor = spec.skin;
// Proportion changes apply to rest and animated translations, preserving the original source.
for (const [index, node] of data.nodes.entries()) {
    const factor = /^(lowerarm|hand)_[lr]$/.test(node.name) ? spec.armLength : node.name === 'neck_01' ? spec.neckLength : 1;
    if (factor === 1) { continue; }
    if (node.translation) { node.translation = node.translation.map(value => value * factor); }
    for (const animation of data.animations) {
        for (const channel of animation.channels) {
            if (channel.target.node !== index || channel.target.path !== 'translation') { continue; }
            const sampler = animation.samplers[channel.sampler];
            sampler.output = append(read(sampler.output).map(value => value * factor));
        }
    }
}
data.materials.find(material => material.name === 'MI_Eyes').pbrMetallicRoughness.baseColorFactor = [.38, .33, .24, 1];
const bodyNode = data.nodes.find(node => node.name === 'SuperHero_Male');
const body = data.meshes[bodyNode.mesh].primitives[0], bodyPositions = read(body.attributes.POSITION);
const bodyNormals = read(body.attributes.NORMAL), bodyIndices = read(body.indices);
const clothMaterial = data.materials.push({ name: `${spec.label} coarse woven underlayer`, doubleSided: true,
    pbrMetallicRoughness: { baseColorFactor: spec.cloth, metallicFactor: 0, roughnessFactor: 1 } }) - 1;
const hideMaterial = data.materials.push({ name: `${spec.label} rough hide layers`, doubleSided: true,
    pbrMetallicRoughness: { baseColorFactor: spec.hide, metallicFactor: 0, roughnessFactor: 1 } }) - 1;
// Reuse exact skin weights for fitted cloth: the garment follows the body without rigid intersections.
const garmentPrimitives = [];
for (const [material, depth, select] of [
    [clothMaterial, .009, (x, y) => y > .66 && y < 1.37 && Math.abs(x) < .31],
    [hideMaterial, .021, (x, y) => y > .89 && y < 1.51 && Math.abs(x) < .31 &&
        (y < 1.07 || (x > -.06 && y > 1.19 - x * .48))]
]) {
    const indices = [];
    for (let triangle = 0; triangle < bodyIndices.length; triangle += 3) {
        const corners = bodyIndices.slice(triangle, triangle + 3);
        const centre = corners.reduce((sum, index) => sum.add(new Vector3().fromArray(bodyPositions, index * 3)), new Vector3()).divideScalar(3);
        if (select(centre.x, centre.y)) { indices.push(...corners); }
    }
    // Omit unused body vertices: Three's animated bounds include the entire position buffer.
    const used = [...new Set(indices)], remap = new Map(used.map((index, next) => [index, next]));
    const positions = used.flatMap(index => [0, 1, 2].map(axis =>
        bodyPositions[index * 3 + axis] + bodyNormals[index * 3 + axis] * depth));
    const joints = read(body.attributes.JOINTS_0), weights = read(body.attributes.WEIGHTS_0);
    garmentPrimitives.push({ material, indices: append(indices.map(index => remap.get(index)), 'SCALAR', 5123), attributes: {
        POSITION: append(positions), NORMAL: append(used.flatMap(index => bodyNormals.slice(index * 3, index * 3 + 3))),
        JOINTS_0: append(used.flatMap(index => joints.slice(index * 4, index * 4 + 4)), 'VEC4', 5123),
        WEIGHTS_0: append(used.flatMap(index => weights.slice(index * 4, index * 4 + 4)), 'VEC4')
    } });
}
const garmentMesh = data.meshes.push({ name: `Layered ${id} clothing`, primitives: garmentPrimitives }) - 1;
const garmentNode = data.nodes.push({ name: spec.garmentNode, mesh: garmentMesh, skin: bodyNode.skin }) - 1;
const bodyParent = data.nodes.find(node => node.children?.includes(data.nodes.indexOf(bodyNode)));
bodyParent.children.push(garmentNode);
if (spec.bovineFeatures) { addBovineFeatures(data, { append, skin, inverse }); }
if (spec.orcFeatures) { addOrcFeatures(data, { append, skin, inverse }); }
if (spec.bugbearFeatures) { addBugbearFeatures(data, { read, append, skin, inverse }); }
if (spec.hyenaFeatures) { addHyenaFeatures(data, { read, append, skin, inverse }); }
if (spec.twinHeads) { addTwinHeads(data, { read, append, skin, inverse, specs: spec.twinHeads }); }
globalThis.ProgressEvent ??= class ProgressEvent {};
let model = await new GLTFLoader().register(() => ({ name: 'authoring-textures',
    loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(JSON.stringify(data), '');
model.scene.updateMatrixWorld(true);
if (spec.meleeClips) {
    await retargetAnatomicalMelee(data, model, append, spec.meleeClips);
    model = await new GLTFLoader().register(() => ({ name: 'authoring-textures',
        loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(JSON.stringify(data), '');
    model.scene.updateMatrixWorld(true);
}
for (const motion of spec.mirroredClips || []) {
    mirrorBodyMotion(data, model, append, motion.source, motion.name);
}
if (spec.gore) { authorHornAttack(data, model, append, spec.gore); }
if (spec.groundedAttacks) { authorGroundedMotion(data, model, append, spec.groundedAttacks, spec.groundedPose); }
const hand = model.scene.getObjectByName('hand_r');
const clubMaterial = data.materials.push({ name: 'Rough hardwood',
    pbrMetallicRoughness: { baseColorFactor: [.11, .065, .031, 1], metallicFactor: 0, roughnessFactor: 1 } }) - 1;
const primitives = [];
for (const [top, bottom, length, y] of [[.035, .028, .40, .10], [.09, .045, .38, .46]]) {
    const geometry = new CylinderGeometry(top, bottom, length, 9).toNonIndexed();
    geometry.translate(0, y, 0);
    primitives.push({ material: clubMaterial, attributes: {
        POSITION: append(Array.from(geometry.attributes.position.array)), NORMAL: append(Array.from(geometry.attributes.normal.array))
    } });
}
const clubMesh = data.meshes.push({ name: 'Ogre greatclub study', primitives }) - 1;
const clubNode = data.nodes.push({ name: 'GiantClub', mesh: clubMesh, translation: [0, .045, 0],
    rotation: hand.getWorldQuaternion(new Quaternion()).invert().toArray() }) - 1;
(data.nodes.find(node => node.name === 'hand_r').children ||= []).push(clubNode);
const scene = data.scenes[data.scene || 0], root = data.nodes.length;
data.nodes.push({ name: 'GiantScale', scale: spec.scale, children: [...scene.nodes] });
scene.nodes = [root];
const grounded = await new GLTFLoader().register(() => ({ name: 'authoring-textures',
    loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(JSON.stringify(data), '');
// A carried prop must not lift the body off the floor, especially during defeat.
grounded.scene.getObjectByName('GiantClub').removeFromParent();
const mixer = new AnimationMixer(grounded.scene), groundNode = data.nodes.length;
data.nodes.push({ name: 'GiantGround', children: [...scene.nodes] }); scene.nodes = [groundNode];
for (const animation of data.animations) {
    mixer.stopAllAction();
    const clip = grounded.animations.find(candidate => candidate.name === animation.name);
    mixer.clipAction(clip).setLoop(LoopOnce, 1).play().clampWhenFinished = true;
    const count = Math.ceil(clip.duration * 60), times = [], positions = [];
    for (let frame = 0; frame <= count; frame++) {
        const time = frame / count * clip.duration;
        mixer.setTime(time); grounded.scene.updateMatrixWorld(true);
        times.push(time); positions.push(0, .006 - new Box3().setFromObject(grounded.scene, true).min.y, 0);
    }
    const sampler = animation.samplers.push({ input: append(times, 'SCALAR'), output: append(positions),
        interpolation: 'LINEAR' }) - 1;
    animation.channels.push({ sampler, target: { node: groundNode, path: 'translation' } });
}
fs.writeFileSync(`tools/combat-art/${id}-candidate.gltf`, JSON.stringify(data));
