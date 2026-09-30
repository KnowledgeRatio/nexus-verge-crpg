/** Original goblin anatomy on the reusable traveller rig and licensed motion library. */
import { SphereGeometry, BufferGeometry, Float32BufferAttribute } from '../../vendor/three/three.module.min.js';
import { glbDerivative } from './glb_derivative.mjs';

const { data, read, append, finish } = glbDerivative();
const hidden = new Set(['CoatLong', 'TrousersFitted', 'HairSwept', 'HairCropped', 'TravelHood']);
for (const node of data.nodes) { if (hidden.has(node.name)) { delete node.mesh; delete node.skin; } }
const tints = { Skin: [.34, .39, .16, 1], 'Slate woven coat': [.18, .14, .085, 1],
    'Blue grey scarf': [.25, .22, .12, 1], 'Charcoal trousers': [.12, .14, .10, 1] };
for (const material of data.materials) {
    if (tints[material.name]) { material.pbrMetallicRoughness.baseColorFactor = tints[material.name]; }
}
const changed = new Map();
for (const mesh of data.meshes) {
    for (const primitive of mesh.primitives) {
        const a = primitive.attributes;
        if (changed.has(a.POSITION)) { a.POSITION = changed.get(a.POSITION); continue; }
        const values = read(a.POSITION);
        for (let i = 0; i < values.length; i += 3) {
            if (values[i + 1] < 1.59) { continue; }
            values[i] *= 1.18; values[i + 1] = 1.71 + (values[i + 1] - 1.71) * 1.08; values[i + 2] *= 1.1;
        }
        const next = append(values); changed.set(a.POSITION, next); a.POSITION = next;
    }
}
const headJoint = data.skins[0].joints.indexOf(data.nodes.findIndex(node => node.name === 'HeadJoint'));
if (headJoint < 0) { throw new Error('Goblin requires the traveller head joint'); }
function material(name, colour, roughness = .9) {
    return data.materials.push({ name, doubleSided: true,
        pbrMetallicRoughness: { baseColorFactor: [...colour, 1], metallicFactor: 0, roughnessFactor: roughness } }) - 1;
}
const skin = data.materials.findIndex(entry => entry.name === 'Skin');
const earInner = material('Goblin inner ears', [.23, .26, .095]);
const iris = material('Goblin amber eyes', [.48, .27, .025], .45);
const pupil = material('Goblin dark pupils', [.009, .007, .004], .45);
function add(geometry, mat) {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    const count = flat.attributes.position.count;
    data.meshes[0].primitives.push({ material: mat, attributes: {
        POSITION: append([...flat.attributes.position.array]), NORMAL: append([...flat.attributes.normal.array]),
        JOINTS_0: append(Array.from({ length: count }, () => [headJoint, 0, 0, 0]).flat(), 'VEC4', 5123),
        WEIGHTS_0: append(Array.from({ length: count }, () => [1, 0, 0, 0]).flat(), 'VEC4')
    } });
    flat.dispose(); if (flat !== geometry) { geometry.dispose(); }
}
for (const sign of [-1, 1]) {
    const outline = [[.078, 1.755, 0], [.23, 1.80, -.025], [.19, 1.724, -.01], [.09, 1.69, .012]];
    const vertices = [];
    for (let i = 0; i < outline.length; i++) {
        const points = [[.12, 1.741, .018], outline[i], outline[(i + 1) % outline.length]];
        if (sign < 0) { points.reverse(); }
        for (const [x, y, z] of points) { vertices.push(sign * x, y, z); }
    }
    const ear = new BufferGeometry(); ear.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    ear.computeVertexNormals(); add(ear, skin);
    add(new SphereGeometry(1, 12, 8).scale(.046, .019, .006).rotateZ(sign * .24)
        .translate(sign * .129, 1.741, .019), earInner);
    add(new SphereGeometry(1, 12, 8).scale(.015, .010, .007).translate(sign * .047, 1.738, .099), iris);
    add(new SphereGeometry(1, 10, 8).scale(.005, .007, .003).translate(sign * .047, 1.738, .105), pupil);
}
add(new SphereGeometry(1, 12, 8).scale(.022, .039, .028).translate(0, 1.706, .111), skin);
await finish('GoblinGround', 'data/graphics/combat/goblin-v1.glb');
