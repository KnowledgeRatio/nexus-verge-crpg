/** Original folded stone wings, authored in body bind space and attached to the spine. */
import { BufferGeometry, Float32BufferAttribute, TubeGeometry, CatmullRomCurve3,
    Vector3 } from '../../vendor/three/three.module.min.js';

export function addStoneWings(data, { append, parentInverse, colour }) {
    const parent = data.nodes.findIndex(node => node.name === 'spine_03');
    if (parent < 0) { throw new Error('Folded wings require an upper spine'); }
    const material = data.materials.push({ name: 'Weathered stone wings', doubleSided: true,
        pbrMetallicRoughness: { baseColorFactor: [...colour, 1], metallicFactor: 0, roughnessFactor: 1 } }) - 1;
    const positions = [], normals = [];
    function add(geometry) {
        geometry.applyMatrix4(parentInverse);
        const flat = geometry.index ? geometry.toNonIndexed() : geometry;
        positions.push(...flat.attributes.position.array); normals.push(...flat.attributes.normal.array);
        if (flat !== geometry) { flat.dispose(); }
        geometry.dispose();
    }
    for (const side of [-1, 1]) {
        const point = (x, y, z) => new Vector3(side * x, y, z);
        const shoulder = point(.13, 1.02, -.08);
        const elbow = point(.32, 1.21, -.16);
        const wrist = point(.36, 1.05, -.32);
        const roots = [shoulder, elbow, wrist];
        const tips = [point(.34, .55, -.53), point(.23, .66, -.57), point(.14, .72, -.36)];
        // Narrow swept panels stay folded alongside the back, rather than spanning the arena.
        const faces = [shoulder, elbow, wrist, shoulder, wrist, tips[2]];
        for (let i = 0; i < tips.length - 1; i++) {
            const notch = tips[i].clone().lerp(tips[i + 1], .5).lerp(wrist, .20);
            faces.push(wrist, tips[i], notch, wrist, notch, tips[i + 1]);
        }
        const panel = new BufferGeometry();
        panel.setAttribute('position', new Float32BufferAttribute(faces.flatMap(v => v.toArray()), 3));
        panel.computeVertexNormals(); add(panel);
        add(new TubeGeometry(new CatmullRomCurve3(roots), 12, .026, 6, false));
        for (const tip of tips) {
            add(new TubeGeometry(new CatmullRomCurve3([wrist, wrist.clone().lerp(tip, .5)
                .add(new Vector3(0, 0, -.025)), tip]), 12, .014, 5, false));
        }
    }
    const mesh = data.meshes.push({ name: 'Folded stone wings', primitives: [{ material, attributes: {
        POSITION: append(positions, 'VEC3'), NORMAL: append(normals, 'VEC3')
    } }] }) - 1;
    const node = data.nodes.push({ name: 'FoldedStoneWings', mesh }) - 1;
    (data.nodes[parent].children ||= []).push(node);
}
