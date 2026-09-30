/** Original manticore anatomy and motion on the CC BY-SA 3.0 Wildfire Games lion. */
import fs from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Texture, Vector3, Quaternion, Group, SphereGeometry,
    TubeGeometry, CatmullRomCurve3, BufferGeometry, Float32BufferAttribute } from '../../vendor/three/three.module.min.js';
import { glbDerivative } from './glb_derivative.mjs';

const path = 'tools/combat-art/lion-candidate.glb';
const { data, read, append, finish } = glbDerivative(path);
const bytes = fs.readFileSync(path);
const gltf = await new GLTFLoader().register(() => ({ name: 'authoring-textures',
    loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const mixer = new AnimationMixer(gltf.scene);
mixer.clipAction(gltf.animations.find(clip => clip.name === 'lion_idle_01')).play();
mixer.setTime(0); gltf.scene.updateMatrixWorld(true);
const nodeIndex = name => data.nodes.findIndex(node => node.name === name);
const object = name => gltf.scene.getObjectByName(name);

// Preserve the textured mane and body; replace the forward muzzle and thin tail.
for (const node of data.nodes.filter(node => node.mesh !== undefined && node.skin !== undefined)) {
    const mesh = object(node.name);
    for (const primitive of data.meshes[node.mesh].primitives) {
        const indices = read(primitive.indices), kept = [];
        const replaced = index => {
            const point = mesh.getVertexPosition(index, new Vector3()).applyMatrix4(mesh.matrixWorld);
            return point.z > 1.26 && point.y > 1.2 || point.z < -1.17 && Math.abs(point.x) < .16;
        };
        for (let i = 0; i < indices.length; i += 3) {
            const face = indices.slice(i, i + 3);
            if (!face.every(replaced)) { kept.push(...face); }
        }
        primitive.indices = append(kept, 'SCALAR', 5123);
    }
}

function frame(name, parentName, position) {
    const parent = object(parentName), group = new Group();
    group.name = name;
    group.position.copy(parent.worldToLocal(new Vector3(...position)));
    group.quaternion.copy(parent.getWorldQuaternion(new Quaternion()).invert());
    parent.add(group); gltf.scene.updateMatrixWorld(true);
    const index = data.nodes.push({ name, translation: group.position.toArray(), rotation: group.quaternion.toArray() }) - 1;
    (data.nodes[nodeIndex(parentName)].children ||= []).push(index);
    return name;
}
frame('ManticoreJaw', 'Horse_Head', [0, 1.37, 1.32]);
frame('ManticoreTail', 'Horse_Tail', [0, 1.37, -1.1]);
frame('ManticoreWings', 'Horse_Neck', [0, 1.48, .1]);
frame('ManticoreMouth', 'Horse_Head', [0, 1.43, 1.64]);
frame('ManticoreSpike', 'ManticoreTail', [0, 2.35, -1.25]);
frame('ManticoreClaw', 'Horse_R_Finger0', [-.285, .15, .68]);
const material = (name, color, roughness = .9) => data.materials.push({ name, doubleSided: true,
    pbrMetallicRoughness: { baseColorFactor: [...color, 1], metallicFactor: 0, roughnessFactor: roughness } }) - 1;
const skin = material('Manticore weathered reddish face', [.095, .033, .019]);
const dark = material('Manticore recessed eyes and mouth', [.025, .017, .011]);
const eyes = material('Manticore golden iris', [.65, .36, .045], .4);
const bone = material('Manticore worn bone spikes', [.62, .52, .35]);
const membrane = material('Manticore grey purple membrane', [.075, .055, .095]);
const rib = material('Manticore wing ribs and tail', [.065, .027, .014]);
const groups = new Map();
function add(geometry, mat, parent) {
    geometry.applyMatrix4(object(parent).matrixWorld.clone().invert());
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    const key = `${parent}:${mat}`;
    if (!groups.has(key)) { groups.set(key, { parent, mat, positions: [], normals: [] }); }
    const group = groups.get(key);
    group.positions.push(...flat.attributes.position.array); group.normals.push(...flat.attributes.normal.array);
    geometry.dispose(); if (flat !== geometry) { flat.dispose(); }
}
function mass(position, scale, mat, parent = 'Horse_Head') {
    add(new SphereGeometry(1, 20, 14).scale(...scale).translate(...position), mat, parent);
}
function tube(points, radius, mat, parent, segments = 18, taper = false) {
    const curve = new CatmullRomCurve3(points.map(point => new Vector3(...point)));
    const geometry = new TubeGeometry(curve, segments, radius, 8, false);
    if (taper) {
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const t = Math.floor(i / 9) / segments, centre = curve.getPointAt(t);
            const point = new Vector3().fromBufferAttribute(positions, i).sub(centre)
                .multiplyScalar(Math.max(.01, 1 - t)).add(centre);
            positions.setXYZ(i, point.x, point.y, point.z);
        }
        geometry.computeVertexNormals();
    }
    add(geometry, mat, parent);
}
// A broad brow, short nose and distinct chin produce the canonical human-like face.
mass([0, 1.62, 1.37], [.255, .285, .225], skin);
mass([0, 1.36, 1.45], [.175, .10, .16], skin, 'ManticoreJaw');
mass([0, 1.47, 1.59], [.19, .025, .035], dark);
mass([0, 1.58, 1.615], [.074, .13, .071], skin);
mass([0, 1.515, 1.65], [.09, .052, .075], skin);
for (const sign of [-1, 1]) {
    mass([sign * .137, 1.695, 1.568], [.091, .064, .04], dark);
    mass([sign * .137, 1.695, 1.597], [.037, .032, .018], eyes);
    mass([sign * .137, 1.695, 1.613], [.012, .023, .006], dark);
    mass([sign * .135, 1.75, 1.571], [.117, .04, .049], skin);
    mass([sign * .18, 1.58, 1.541], [.045, .075, .032], skin);
    mass([sign * .048, 1.494, 1.703], [.021, .013, .009], dark);
    tube([[sign * .13, 1.48, 1.62], [sign * .13, 1.435, 1.64], [sign * .115, 1.39, 1.63]],
        .021, bone, 'Horse_Head', 8, true);
    const root = [sign * .22, 1.52, .1], elbow = [sign * .53, 1.97, -.32];
    const tips = [[sign * .59, .97, -1.03], [sign * .53, .84, -.87], [sign * .4, 1.03, -.46]];
    tube([root, [sign * .4, 1.83, -.08], elbow], .037, rib, 'ManticoreWings');
    const positions = [];
    for (let i = 0; i < tips.length; i++) {
        const a = i ? tips[i - 1] : root, b = tips[i];
        const centre = new Vector3(...elbow).add(new Vector3(...a)).add(new Vector3(...b)).divideScalar(3);
        centre.x += sign * .08;
        for (const pair of [[elbow, a], [a, b], [b, elbow]]) {
            positions.push(...pair[0], ...pair[1], ...centre.toArray());
        }
        tube([elbow, b], .022, rib, 'ManticoreWings', 6);
    }
    const wing = new BufferGeometry(); wing.setAttribute('position', new Float32BufferAttribute(positions, 3));
    wing.computeVertexNormals(); add(wing, membrane, 'ManticoreWings');
}
tube([[0, 1.37, -1.1], [0, 1.35, -1.55], [0, 1.74, -1.93], [0, 2.22, -1.72], [0, 2.35, -1.25]],
    .11, rib, 'ManticoreTail', 30);
mass([0, 2.35, -1.25], [.17, .14, .22], rib, 'ManticoreTail');
for (let i = 0; i < 9; i++) {
    const angle = i / 9 * Math.PI * 2, x = Math.cos(angle), y = Math.sin(angle);
    const points = [[x * .09, 2.35 + y * .085, -1.18], [x * .23, 2.35 + y * .21, -1.34],
        [x * .27, 2.35 + y * .25, -1.58]];
    tube(points, .041, bone, 'ManticoreTail', 10, true);
}
for (const { parent, mat, positions, normals } of groups.values()) {
    const name = `${parent}_${data.materials[mat].name}`;
    const mesh = data.meshes.push({ name, primitives: [{ material: mat,
        attributes: { POSITION: append(positions), NORMAL: append(normals) } }] }) - 1;
    const node = data.nodes.push({ name, mesh }) - 1;
    (data.nodes[nodeIndex(parent)].children ||= []).push(node);
}

await finish('ManticoreGround', 'tools/combat-art/manticore-candidate.glb', model => {
    // Fold the membranes into the body during the fall so they do not prop the corpse up.
    const death = data.animations.find(animation => animation.name === 'lion_death');
    const duration = model.animations.find(clip => clip.name === death.name).duration;
    const fold = death.samplers.push({ input: append([0, duration * .25, duration * .55, duration], 'SCALAR'),
        output: append([1, 1, 1, .65, 1, 1, .3, 1, 1, .3, 1, 1]), interpolation: 'LINEAR' }) - 1;
    death.channels.push({ sampler: fold, target: { node: nodeIndex('ManticoreWings'), path: 'scale' } });
    const animationMixer = new AnimationMixer(model.scene);
    animationMixer.clipAction(model.animations.find(clip => clip.name === 'lion_idle_01')).play();
    animationMixer.setTime(0); model.scene.updateMatrixWorld(true);
    const nodes = [];
    model.scene.traverse(node => {
        if (node.isBone || ['ManticoreJaw', 'ManticoreTail', 'ManticoreWings'].includes(node.name)) {
            nodes.push({ node, index: nodeIndex(node.name), position: node.position.clone(), rotation: node.quaternion.clone() });
        }
    });
    const rotate = (name, angle, axis = new Vector3(1, 0, 0)) => {
        const node = model.scene.getObjectByName(name);
        const world = new Quaternion().setFromAxisAngle(axis, angle).multiply(node.getWorldQuaternion(new Quaternion()));
        node.quaternion.copy(node.parent.getWorldQuaternion(new Quaternion()).invert().multiply(world));
        model.scene.updateMatrixWorld(true);
    };
    for (const [name, seconds, impact] of [['Manticore_Bite', .8, .5], ['Manticore_Claw', .9, .5],
        ['Manticore_Spike', 1, .45], ['Manticore_Hit', .35, .25]]) {
        const count = Math.ceil(seconds * 60), times = [], values = nodes.map(() => ({ rotation: [], translation: [] }));
        for (let i = 0; i <= count; i++) {
            const t = i / count, phase = t < impact ? t / impact : (1 - t) / (1 - impact);
            const weight = phase * phase * (3 - 2 * phase);
            nodes.forEach(({ node, position, rotation }) => { node.position.copy(position); node.quaternion.copy(rotation); });
            model.scene.updateMatrixWorld(true);
            if (name === 'Manticore_Bite') {
                rotate('Horse_Neck1', .27 * weight); rotate('Horse_Head', .12 * weight);
                rotate('ManticoreJaw', .45 * weight);
            } else if (name === 'Manticore_Claw') {
                rotate('Horse_R_UpperArm', -.93 * weight);
                rotate('Horse_R_Forearm', .22 * weight);
                rotate('Horse_R_UpperArm', .29 * weight, new Vector3(0, 1, 0));
                rotate('Horse_R_Finger0', .5 * weight);
            } else if (name === 'Manticore_Spike') {
                rotate('ManticoreTail', .65 * weight);
                rotate('Horse_Head', -.06 * weight);
            } else {
                rotate('Horse_Neck1', -.12 * weight); rotate('Horse_Head', -.08 * weight);
            }
            times.push(t * seconds);
            nodes.forEach(({ node }, index) => {
                values[index].rotation.push(...node.quaternion.toArray());
                values[index].translation.push(...node.position.toArray());
            });
        }
        const input = append(times, 'SCALAR'), animation = { name, samplers: [], channels: [] };
        nodes.forEach(({ index }, i) => {
            for (const path of ['rotation', 'translation']) {
                const sampler = animation.samplers.push({ input,
                    output: append(values[i][path], path === 'rotation' ? 'VEC4' : 'VEC3'), interpolation: 'LINEAR' }) - 1;
                animation.channels.push({ sampler, target: { node: index, path } });
            }
        });
        data.animations.push(animation);
    }
});
