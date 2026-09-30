/** Original reptilian features on the shared traveller body and motion library. */
import { SphereGeometry, BufferGeometry, Float32BufferAttribute, Matrix4, Quaternion,
    Vector3, AnimationMixer, LoopOnce, Box3 } from '../../vendor/three/three.module.min.js';
import { glbDerivative } from './glb_derivative.mjs';

const { data, read, append, finish } = glbDerivative();
const hidden = new Set(['CoatLong', 'TrousersGathered', 'HairSwept', 'HairCropped', 'TravelHood', 'Brow', 'Scarf wrap']);
for (const node of data.nodes) { if (hidden.has(node.name)) { delete node.mesh; delete node.skin; } }
const tints = { Skin: [.31, .105, .055, 1], 'Slate woven coat': [.14, .12, .08, 1],
    'Charcoal trousers': [.10, .085, .065, 1] };
for (const material of data.materials) {
    if (tints[material.name]) { material.pbrMetallicRoughness.baseColorFactor = tints[material.name]; }
}
const head = data.skins[0].joints.indexOf(data.nodes.findIndex(node => node.name === 'HeadJoint'));
const skin = data.materials.findIndex(material => material.name === 'Skin');
function material(name, colour) {
    return data.materials.push({ name, pbrMetallicRoughness: {
        baseColorFactor: [...colour, 1], metallicFactor: 0, roughnessFactor: .85 } }) - 1;
}
const gold = material('Kobold copper eyes', [.7, .32, .045]), dark = material('Kobold pupils and nostrils', [.008, .006, .004]);
function feature(geometry, mat) {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry, count = flat.attributes.position.count;
    data.meshes[0].primitives.push({ material: mat, attributes: {
        POSITION: append([...flat.attributes.position.array]), NORMAL: append([...flat.attributes.normal.array]),
        JOINTS_0: append(Array.from({ length: count }, () => [head, 0, 0, 0]).flat(), 'VEC4', 5123),
        WEIGHTS_0: append(Array.from({ length: count }, () => [1, 0, 0, 0]).flat(), 'VEC4')
    } });
    flat.dispose(); if (flat !== geometry) { geometry.dispose(); }
}
const jaw = material('Kobold lower jaw scales', [.22, .07, .035]);
feature(new SphereGeometry(1, 12, 8).scale(.058, .021, .095).translate(0, 1.68, .145), jaw);
feature(new SphereGeometry(1, 12, 8).scale(.061, .034, .105).translate(0, 1.712, .146), skin);
for (const sign of [-1, 1]) {
    feature(new SphereGeometry(1, 12, 8).scale(.029, .014, .017).translate(sign * .059, 1.755, .067), skin);
    feature(new SphereGeometry(1, 12, 8).scale(.012, .009, .008).translate(sign * .063, 1.742, .078), gold);
    feature(new SphereGeometry(1, 10, 8).scale(.003, .007, .003).translate(sign * .063, 1.742, .084), dark);
    feature(new SphereGeometry(1, 8, 6).scale(.004, .003, .002).translate(sign * .024, 1.705, .251), dark);
}
const root = data.nodes.findIndex(node => node.name === 'Traveller');
const rootJoint = data.skins[0].joints.indexOf(root);
const inverse = new Matrix4().fromArray(read(data.skins[0].inverseBindMatrices), rootJoint * 16);
const origin = new Vector3(0, 1.0, -.09).applyMatrix4(inverse);
const vertices = [], raised = [], indices = [], rings = 24, sides = 10;
for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings, radius = .065 * (1 - t) + .002;
    for (let side = 0; side < sides; side++) {
        const angle = side / sides * Math.PI * 2;
        vertices.push(Math.sin(angle) * radius + .1 * Math.sin(t * Math.PI), Math.cos(angle) * radius - .65 * t * t, -1.18 * t);
        raised.push(0, .65 * t * t, 0);
        if (ring < rings) {
            const a = ring * sides + side, b = ring * sides + (side + 1) % sides;
            indices.push(a, b, a + sides, b, b + sides, a + sides);
        }
    }
}
const geometry = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(vertices, 3));
geometry.setIndex(indices); geometry.computeVertexNormals();
const mesh = data.meshes.push({ name: 'Kobold tapered tail', weights: [0], primitives: [{ material: skin,
    indices: append(indices, 'SCALAR', 5123), attributes: {
        POSITION: append(vertices), NORMAL: append([...geometry.attributes.normal.array])
    }, targets: [{ POSITION: append(raised) }] }] }) - 1;
geometry.dispose();
const tail = data.nodes.push({ name: 'KoboldTail', mesh, weights: [0], translation: origin.toArray(),
    rotation: new Quaternion().setFromRotationMatrix(inverse).toArray() }) - 1;
(data.nodes[root].children ||= []).push(tail);
await finish('KoboldGround', 'data/graphics/combat/kobold-v1.glb', model => {
    const tailObject = model.scene.getObjectByName('KoboldTail'), parent = tailObject.parent;
    const mixer = new AnimationMixer(model.scene);
    for (const animation of data.animations) {
        const clip = model.animations.find(candidate => candidate.name === animation.name);
        mixer.stopAllAction(); mixer.clipAction(clip).reset().setLoop(LoopOnce, 1).play().clampWhenFinished = true;
        const count = Math.ceil(clip.duration * 60), times = [], rotations = [], weights = [];
        for (let frame = 0; frame <= count; frame++) {
            const time = clip.duration * frame / count;
            mixer.setTime(time); model.scene.updateMatrixWorld(true);
            // Measure the supporting body without the tail, then keep its tip clear of that plane.
            parent.remove(tailObject); const floor = new Box3().setFromObject(model.scene, true).min.y; parent.add(tailObject);
            model.scene.updateMatrixWorld(true);
            const height = tailObject.getWorldPosition(new Vector3()).y - floor;
            const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), .10 * Math.sin(time / clip.duration * Math.PI * 2));
            rotations.push(...parent.getWorldQuaternion(new Quaternion()).invert().multiply(yaw).toArray());
            weights.push(Math.max(0, Math.min(1, 1 - (height - .075) / .65))); times.push(time);
        }
        const input = append(times, 'SCALAR');
        for (const [path, values, type] of [['rotation', rotations, 'VEC4'], ['weights', weights, 'SCALAR']]) {
            const sampler = animation.samplers.push({ input, output: append(values, type), interpolation: 'LINEAR' }) - 1;
            animation.channels.push({ sampler, target: { node: tail, path } });
        }
    }
});
