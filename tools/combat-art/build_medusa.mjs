/** Original animated serpent crown on the reusable traveller body and motion rig. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { CatmullRomCurve3, TubeGeometry, SphereGeometry, Vector3, Quaternion,
    AnimationMixer, Texture, Box3, LoopOnce, PropertyBinding } from '../../vendor/three/three.module.min.js';

const source = fs.readFileSync('data/graphics/combat/traveller-animated.glb');
const length = source.readUInt32LE(12), data = JSON.parse(source.subarray(20, 20 + length));
const binary = source.subarray(28 + length), chunks = [binary];
let offset = binary.length;
function append(values, type = 'VEC3') {
    const width = { VEC3: 3, VEC4: 4, SCALAR: 1 }[type];
    const bytes = Buffer.from(new Float32Array(values).buffer);
    const view = data.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length }) - 1;
    chunks.push(bytes); offset += bytes.length;
    return data.accessors.push({ bufferView: view, componentType: 5126, type, count: values.length / width,
        min: Array.from({ length: width }, (_, axis) => values.reduce((a, v, i) => i % width === axis ? Math.min(a, v) : a, Infinity)),
        max: Array.from({ length: width }, (_, axis) => values.reduce((a, v, i) => i % width === axis ? Math.max(a, v) : a, -Infinity)) }) - 1;
}
const tints = { 'Slate woven coat': [.105, .135, .09, 1], 'Blue grey scarf': [.24, .22, .15, 1] };
for (const material of data.materials) {
    if (tints[material.name]) { material.pbrMetallicRoughness.baseColorFactor = tints[material.name]; }
}
// The source hair and brows share a mesh/material. Replace them with the crown.
const hair = data.materials.findIndex(material => material.name === 'Dark brown hair');
for (const node of data.nodes) {
    if (node.mesh !== undefined && data.meshes[node.mesh].primitives.every(p => p.material === hair)) {
        delete node.mesh; delete node.skin;
    }
}
globalThis.ProgressEvent ??= class ProgressEvent {};
const loader = new GLTFLoader().register(() => ({ name: 'authoring-textures', loadTexture: () => Promise.resolve(new Texture()) }));
const inspect = () => {
    data.buffers[0].byteLength = offset;
    const copy = globalThis.structuredClone(data);
    copy.buffers[0].uri = 'data:application/octet-stream;base64,' + Buffer.concat(chunks).toString('base64');
    return loader.parseAsync(JSON.stringify(copy), '');
};
const model = await inspect(); model.scene.updateMatrixWorld(true);
const headIndex = data.nodes.findIndex(node => node.name === 'HeadJoint');
const head = model.scene.getObjectByName('HeadJoint');
const restRotation = head.getWorldQuaternion(new Quaternion()).invert();
const snakes = [];
const colours = [[.39,.31,.13],[.10,.12,.045],[.015,.02,.013],[.23,.19,.075],
    [.07,.09,.03],[.19,.20,.10],[.035,.043,.026],[.29,.25,.13],[.13,.11,.055]];
for (let i = 0; i < colours.length; i++) {
    const angle = i / colours.length * Math.PI * 2;
    const base = new Vector3(Math.sin(angle) * .071, 1.81, Math.cos(angle) * .058);
    const tip = new Vector3(Math.sin(angle) * .16, 1.92 + (i % 3) * .035, .07 + Math.cos(angle) * .07);
    const reach = new Vector3(Math.sin(angle) * .08, 1.79 + (i % 3) * .024, .46 - (i % 2) * .035);
    function geometry(end, extended) {
        const curve = new CatmullRomCurve3([base,
            new Vector3(base.x * 1.7, 1.94, base.z - .06),
            new Vector3(end.x * 1.1, extended ? 1.95 : end.y + .025, extended ? .24 : end.z - .08), end]);
        const body = new TubeGeometry(curve, 24, .0135, 6, false).toNonIndexed();
        const mouth = new SphereGeometry(1, 10, 6).scale(.021, .014, .031).translate(...end.toArray()).toNonIndexed();
        const positions = [], normals = [];
        for (const part of [body, mouth]) {
            part.translate(-base.x, -base.y, -base.z);
            positions.push(...part.attributes.position.array); normals.push(...part.attributes.normal.array);
            part.dispose();
        }
        return { positions, normals };
    }
    const rest = geometry(tip, false), strike = geometry(reach, true);
    const material = data.materials.push({ name: `Serpent ${i + 1}`, pbrMetallicRoughness: {
        baseColorFactor: [...colours[i], 1], metallicFactor: 0, roughnessFactor: .75
    } }) - 1;
    const mesh = data.meshes.push({ name: `Serpent ${i + 1}`, weights: [0], primitives: [{ material, attributes: {
        POSITION: append(rest.positions), NORMAL: append(rest.normals)
    }, targets: [{ POSITION: append(strike.positions.map((v, j) => v - rest.positions[j])),
        NORMAL: append(strike.normals.map((v, j) => v - rest.normals[j])) }] }] }) - 1;
    const node = data.nodes.push({ name: `Serpent${i + 1}`, mesh,
        translation: head.worldToLocal(base.clone()).toArray(), rotation: restRotation.toArray() }) - 1;
    (data.nodes[headIndex].children ||= []).push(node);
    snakes.push(node);
}
const eyes = [];
for (const [name, colour, size, z] of [
    ['Medusa gold-green iris', [.32, .39, .12, 1], [.009, .007, .003], .091],
    ['Medusa vertical pupil', [.006, .008, .003, 1], [.002, .006, .002], .094]
]) {
    const material = data.materials.push({ name, pbrMetallicRoughness: {
        baseColorFactor: colour, metallicFactor: 0, roughnessFactor: .45
    } }) - 1;
    for (const side of [-1, 1]) {
        const geometry = new SphereGeometry(1, 10, 6).scale(...size).translate(side * .033, 1.738, z)
            .applyMatrix4(head.matrixWorld.clone().invert()).toNonIndexed();
        eyes.push({ material, attributes: { POSITION: append(Array.from(geometry.attributes.position.array)),
            NORMAL: append(Array.from(geometry.attributes.normal.array)) } });
        geometry.dispose();
    }
}
const eyeMesh = data.meshes.push({ name: 'Medusa eyes', primitives: eyes }) - 1;
const eyeNode = data.nodes.push({ name: 'MedusaEyes', mesh: eyeMesh }) - 1;
data.nodes[headIndex].children.push(eyeNode);
// A restrained upper-body advance lets the snakes, rather than a hand punch, make contact.
const mixer = new AnimationMixer(model.scene);
mixer.clipAction(model.animations.find(clip => clip.name === 'Idle_Loop')).play();
mixer.setTime(0); model.scene.updateMatrixWorld(true);
const bones = data.skins[0].joints.map(index => ({ index,
    object: model.scene.getObjectByName(PropertyBinding.sanitizeNodeName(data.nodes[index].name)) }));
const rest = bones.map(({ object }) => ({ position: object.position.clone(), rotation: object.quaternion.clone() }));
const frames = 49, seconds = .8, impact = .45;
const times = Array.from({ length: frames }, (_, i) => i / (frames - 1) * seconds);
const outputs = bones.map(() => ({ rotation: [], translation: [] }));
for (let frame = 0; frame < frames; frame++) {
    bones.forEach(({ object }, i) => { object.position.copy(rest[i].position); object.quaternion.copy(rest[i].rotation); });
    model.scene.updateMatrixWorld(true);
    const t = frame / (frames - 1), phase = t < impact ? t / impact : (1 - t) / (1 - impact);
    const amount = phase * phase * (3 - 2 * phase);
    const spine = model.scene.getObjectByName('Spine');
    const world = spine.getWorldQuaternion(new Quaternion());
    spine.quaternion.copy(spine.parent.getWorldQuaternion(new Quaternion()).invert()
        .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), .26 * amount)).multiply(world));
    bones.forEach(({ object }, i) => {
        outputs[i].rotation.push(...object.quaternion.toArray()); outputs[i].translation.push(...object.position.toArray());
    });
}
const attack = { name: 'Serpent_Strike', samplers: [], channels: [] }, input = append(times, 'SCALAR');
bones.forEach(({ index }, i) => {
    for (const path of ['rotation', 'translation']) {
        const sampler = attack.samplers.push({ input, output: append(outputs[i][path], path === 'rotation' ? 'VEC4' : 'VEC3'),
            interpolation: 'LINEAR' }) - 1;
        attack.channels.push({ sampler, target: { node: index, path } });
    }
});
data.animations.push(attack);
for (const animation of data.animations) {
    const duration = animation.name === attack.name ? seconds : model.animations.find(clip => clip.name === animation.name).duration;
    const steps = Math.ceil(duration * 30), ts = Array.from({ length: steps + 1 }, (_, i) => i / steps * duration);
    const input = append(ts, 'SCALAR');
    snakes.forEach((node, index) => {
        const values = ts.map(time => {
            if (animation.name === 'Serpent_Strike') {
                const t = time / duration, phase = t < impact ? t / impact : (1 - t) / (1 - impact);
                return phase * phase * (3 - 2 * phase);
            }
            return animation.name === 'Death01' ? 0 : .06 + .05 * Math.sin(time / duration * Math.PI * 2 + index * 1.7);
        });
        const sampler = animation.samplers.push({ input, output: append(values, 'SCALAR'), interpolation: 'LINEAR' }) - 1;
        animation.channels.push({ sampler, target: { node, path: 'weights' } });
    });
}
// The crown changes floor contact during defeat as well as the body-led strike.
const posed = await inspect(), groundMixer = new AnimationMixer(posed.scene);
const scene = data.scenes[data.scene || 0];
const ground = data.nodes.push({ name: 'SerpentGround', children: scene.nodes }) - 1;
scene.nodes = [ground];
const groundedClips = new Set(['Serpent_Strike', 'Death01', 'Hit_Chest', 'Ranged_Bow_Idle',
    'Ranged_Bow_Shot', 'Walk_Loop', 'Melee_Unarmed_Idle']);
for (const animation of data.animations.filter(clip => groundedClips.has(clip.name))) {
    const clip = posed.animations.find(clip => clip.name === animation.name);
    groundMixer.stopAllAction();
    groundMixer.clipAction(clip).setLoop(LoopOnce, 1).play().clampWhenFinished = true;
    const steps = Math.ceil(clip.duration * 60), ts = [], ys = [];
    for (let i = 0; i <= steps; i++) {
        const time = i / steps * clip.duration;
        groundMixer.setTime(time); posed.scene.updateMatrixWorld(true);
        ts.push(time); ys.push(0, .004 - new Box3().setFromObject(posed.scene, true).min.y, 0);
    }
    const sampler = animation.samplers.push({ input: append(ts, 'SCALAR'), output: append(ys), interpolation: 'LINEAR' }) - 1;
    animation.channels.push({ sampler, target: { node: ground, path: 'translation' } });
}
data.buffers[0].byteLength = offset;
const encoded = Buffer.from(JSON.stringify(data)), json = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32); encoded.copy(json);
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + offset, 8);
header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync('data/graphics/combat/medusa-v1.glb', Buffer.concat([header, json, binHeader, ...chunks]));
