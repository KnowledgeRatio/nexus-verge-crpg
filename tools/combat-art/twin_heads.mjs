/** Duplicate the retained anatomical head into two distinct, fitted head meshes. */
import { Matrix3, Vector3 } from '../../vendor/three/three.module.min.js';

export function addTwinHeads(data, { read, append, skin, inverse, specs }) {
    const head = data.nodes.findIndex(node => node.name === 'Head');
    const transform = inverse[skin.joints.indexOf(head)];
    const normalTransform = new Matrix3().getNormalMatrix(transform);
    const copies = specs.map(() => []);
    for (const node of [...data.nodes]) {
        if (node.skin === undefined || node.mesh === undefined || !['SuperHero_Male', 'Eyes', 'Eyebrows'].includes(node.name)) {
            continue;
        }
        for (const primitive of data.meshes[node.mesh].primitives) {
            const positions = read(primitive.attributes.POSITION), normals = read(primitive.attributes.NORMAL);
            const joints = read(primitive.attributes.JOINTS_0), weights = read(primitive.attributes.WEIGHTS_0);
            const headWeight = index => [0, 1, 2, 3].reduce((sum, slot) => {
                const joint = joints[index * 4 + slot];
                return sum + (/^(Head|neck_01)$/.test(data.nodes[skin.joints[joint]].name) ? weights[index * 4 + slot] : 0);
            }, 0);
            const surfaces = Object.entries(primitive.attributes).filter(([name]) => /^(TEXCOORD|COLOR)_/.test(name))
                .map(([name, index]) => ({ name, type: data.accessors[index].type, values: read(index),
                    width: { VEC2: 2, VEC3: 3, VEC4: 4 }[data.accessors[index].type] }));
            const retained = [], extracted = [];
            const indices = read(primitive.indices);
            for (let i = 0; i < indices.length; i += 3) {
                const corners = indices.slice(i, i + 3);
                const weight = corners.reduce((sum, index) => sum + headWeight(index), 0) / 3;
                (weight > .5 ? extracted : retained).push(...corners);
            }
            if (!extracted.length) { continue; }
            specs.forEach((spec, side) => {
                const points = [], directions = [];
                for (const index of extracted) {
                    const point = new Vector3().fromArray(positions, index * 3);
                    const transition = Math.max(0, Math.min(1, (point.y - 1.50) / .10));
                    const jaw = Math.max(0, 1 - Math.abs(point.y - 1.65) / .09);
                    point.x *= 1 + jaw * spec.jawWidth;
                    point.x += spec.offsetX * transition;
                    point.z += spec.offsetZ * transition;
                    points.push(...point.applyMatrix4(transform).toArray());
                    directions.push(...new Vector3().fromArray(normals, index * 3).applyMatrix3(normalTransform).normalize().toArray());
                }
                copies[side].push({ material: primitive.material, attributes: {
                    POSITION: append(points), NORMAL: append(directions),
                    ...Object.fromEntries(surfaces.map(({ name, type, values, width }) => [name,
                        append(extracted.flatMap(index => values.slice(index * width, index * width + width)), type)]))
                } });
            });
            if (!retained.length) {
                delete node.mesh;
                continue;
            }
            const used = [...new Set(retained)], remap = new Map(used.map((index, next) => [index, next]));
            for (const [name, index] of Object.entries(primitive.attributes)) {
                const accessor = data.accessors[index], values = read(index);
                const width = { VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
                primitive.attributes[name] = append(used.flatMap(i => values.slice(i * width, i * width + width)),
                    accessor.type, accessor.normalized ? 5126 : accessor.componentType);
            }
            primitive.indices = append(retained.map(index => remap.get(index)), 'SCALAR', 5123);
        }
    }
    copies.forEach((primitives, side) => {
        const name = `EttinHead${side + 1}`;
        const mesh = data.meshes.push({ name, primitives }) - 1;
        const node = data.nodes.push({ name, mesh }) - 1;
        (data.nodes[head].children ||= []).push(node);
    });
}
