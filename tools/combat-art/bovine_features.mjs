/** Original bull head and split hooves fitted to the shared anatomical bind pose. */
import { SphereGeometry, CylinderGeometry, Vector3, Quaternion } from '../../vendor/three/three.module.min.js';

export function addBovineFeatures(data, { append, skin, inverse }) {
    const materials = [
        ['Bovine dark fur', [.034, .024, .017, 1], 1],
        ['Bovine muzzle', [.045, .032, .028, 1], .85],
        ['Bovine horn and hoof', [.14, .115, .08, 1], .9],
        ['Bovine nostrils', [.005, .004, .004, 1], 1],
        ['Bovine amber eyes', [.055, .029, .01, 1], .45]
    ].map(([name, colour, roughness]) => data.materials.push({ name,
        pbrMetallicRoughness: { baseColorFactor: colour, metallicFactor: 0, roughnessFactor: roughness }
    }) - 1);
    const groups = new Map();
    function add(geometry, bone, material) {
        const parent = data.nodes.findIndex(node => node.name === bone);
        const joint = skin.joints.indexOf(parent);
        if (joint < 0) { throw new Error(`Bovine feature requires ${bone}`); }
        geometry.applyMatrix4(inverse[joint]);
        const flat = geometry.toNonIndexed();
        const key = `${parent}:${material}`;
        if (!groups.has(key)) { groups.set(key, { parent, material, positions: [], normals: [] }); }
        const group = groups.get(key);
        group.positions.push(...flat.attributes.position.array); group.normals.push(...flat.attributes.normal.array);
        geometry.dispose(); flat.dispose();
    }
    function mass(position, scale, material = 0, bone = 'Head') {
        add(new SphereGeometry(1, 16, 12).scale(...scale).translate(...position), bone, materials[material]);
    }
    function taper(a, b, from, to) {
        const start = new Vector3(...a), end = new Vector3(...b), delta = end.clone().sub(start);
        const shape = new CylinderGeometry(to, from, delta.length(), 10);
        shape.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize()));
        shape.translate(...start.add(end).multiplyScalar(.5).toArray()); add(shape, 'Head', materials[2]);
    }
    const skull = new SphereGeometry(1, 16, 12);
    const vertices = skull.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
        const y = vertices.getY(i);
        vertices.setX(i, vertices.getX(i) * (y > -.15 ? 1 : .73));
        vertices.setY(i, Math.min(.86, y));
    }
    skull.scale(.13, .20, .11).translate(0, 1.735, .025);
    skull.computeVertexNormals(); add(skull, 'Head', materials[0]);
    mass([0, 1.665, .12], [.085, .115, .14]);
    mass([0, 1.61, .235], [.102, .048, .051], 1);
    for (const sign of [-1, 1]) {
        mass([sign * .062, 1.626, .279], [.023, .01, .005], 3);
        mass([sign * .12, 1.765, .075], [.01, .009, .014], 4);
        mass([sign * .128, 1.765, .082], [.004, .006, .007], 3);
        mass([sign * .17, 1.79, -.008], [.077, .018, .034]);
        const points = [[.103, 1.85, .006], [.23, 1.925, -.015], [.37, 1.94, .045], [.40, 1.96, .15], [.34, 1.97, .24]];
        points.forEach(point => { point[0] *= sign; });
        for (let i = 0; i < points.length - 1; i++) {
            taper(points[i], points[i + 1], .033 * (1 - i / 4), .033 * (1 - (i + 1) / 4));
        }
        const bone = sign > 0 ? 'foot_l' : 'foot_r';
        for (const split of [-1, 1]) {
            const hoof = new CylinderGeometry(.053, .066, .18, 8);
            hoof.scale(.65, 1, 1.3).translate(sign * .115 + split * .034, .09, -.025);
            add(hoof, bone, materials[2]);
        }
    }
    for (const { parent, material, positions, normals } of groups.values()) {
        const name = data.materials[material].name;
        const mesh = data.meshes.push({ name, primitives: [{ material, attributes: {
            POSITION: append(positions), NORMAL: append(normals)
        } }] }) - 1;
        const node = data.nodes.push({ name, mesh }) - 1;
        (data.nodes[parent].children ||= []).push(node);
    }
    for (const name of ['Eyes', 'Eyebrows']) {
        const node = data.nodes.find(node => node.name === name);
        if (node) { delete node.mesh; }
    }
    const head = data.nodes.findIndex(node => node.name === 'Head');
    const joint = skin.joints.indexOf(head);
    const point = new Vector3(.34, 1.97, .24).applyMatrix4(inverse[joint]);
    const contact = data.nodes.push({ name: 'HornContact', translation: point.toArray() }) - 1;
    (data.nodes[head].children ||= []).push(contact);
}
