/** Reuse the CC0 hyena head and original coat on the humanoid bind pose. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { Vector3, Matrix3, SphereGeometry } from '../../vendor/three/three.module.min.js';

export function addHyenaFeatures(data, { read, append, skin, inverse }) {
    const source = JSON.parse(fs.readFileSync('tools/combat-art/hyena-candidate.gltf'));
    const buffers = source.buffers.map(buffer => Buffer.from(buffer.uri.split(',')[1], 'base64'));
    function sourceRead(index) {
        const a = source.accessors[index], view = source.bufferViews[a.bufferView];
        const [method, size] = { 5121: ['readUInt8', 1], 5123: ['readUInt16LE', 2],
            5125: ['readUInt32LE', 4], 5126: ['readFloatLE', 4] }[a.componentType];
        const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type], bytes = buffers[view.buffer];
        return Array.from({ length: a.count * width }, (_, i) => bytes[method]((view.byteOffset || 0) +
            (a.byteOffset || 0) + Math.floor(i / width) * (view.byteStride || width * size) + i % width * size));
    }
    const view = source.bufferViews[source.images[0].bufferView];
    const png = buffers[view.buffer].subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    const image = data.images.push({ name: 'Reused original procedural hyena coat',
        uri: 'data:image/png;base64,' + png.toString('base64') }) - 1;
    const texture = data.textures.push({ source: image }) - 1;
    const materials = source.materials.map(material => {
        const copy = JSON.parse(JSON.stringify(material)); copy.name = 'Gnoll ' + copy.name;
        if (copy.pbrMetallicRoughness.baseColorTexture) { copy.pbrMetallicRoughness.baseColorTexture.index = texture; }
        if (material.name === 'Eyes_Black') { copy.pbrMetallicRoughness.baseColorFactor = [.35, .31, .12, 1]; }
        return data.materials.push(copy) - 1;
    });
    const parent = data.nodes.findIndex(node => node.name === 'Head');
    const transform = inverse[skin.joints.indexOf(parent)], normalMatrix = new Matrix3().getNormalMatrix(transform);
    const headJoints = new Set(source.skins[0].joints.flatMap((node, joint) =>
        /^(Head|Ear|Neck3)/.test(source.nodes[node].name) ? [joint] : []));
    const primitives = [], jawPrimitives = [];
    const jawOrigin = new Vector3(0, 1.672, .121).applyMatrix4(transform);
    function ellipsoid(centre, radii, material, jaw = false) {
        const geometry = new SphereGeometry(1, 20, 14).scale(...radii).translate(...centre).toNonIndexed();
        const positions = geometry.attributes.position, normals = geometry.attributes.normal;
        const points = [], directions = [];
        for (let i = 0; i < positions.count; i++) {
            const point = new Vector3().fromBufferAttribute(positions, i)
                .sub(new Vector3(0, 2.08, 1.88)).multiplyScalar(.4).add(new Vector3(0, 1.72, .065));
            point.applyMatrix4(transform);
            if (jaw) { point.sub(jawOrigin); }
            points.push(...point.toArray());
            directions.push(...new Vector3().fromBufferAttribute(normals, i).applyMatrix3(normalMatrix).normalize().toArray());
        }
        (jaw ? jawPrimitives : primitives).push({ material: materials[material], attributes: {
            POSITION: append(points), NORMAL: append(directions), TEXCOORD_0: append([...geometry.attributes.uv.array], 'VEC2')
        } });
        geometry.dispose();
    }
    // Close the cut quadruped skull; this also joins the retained rounded ears to the cranium.
    ellipsoid([0, 2.08, 1.99], [.3, .24, .24], 4);
    for (const sign of [-1, 1]) {
        ellipsoid([sign * .235, 2.17, 2.112], [.025, .023, .021], 3);
        ellipsoid([sign * .249, 2.175, 2.125], [.009, .014, .008], 1);
    }
    ellipsoid([0, 1.965, 2.19], [.15, .055, .18], 1, true);
    for (const primitive of source.meshes[0].primitives) {
        if (primitive.material === 3) { continue; }
        const a = primitive.attributes, positions = sourceRead(a.POSITION), normals = sourceRead(a.NORMAL);
        const joints = sourceRead(a.JOINTS_0), weights = sourceRead(a.WEIGHTS_0);
        const indices = primitive.indices === undefined ? Array.from({ length: positions.length / 3 }, (_, i) => i) : sourceRead(primitive.indices);
        const uv = a.TEXCOORD_0 === undefined ? null : sourceRead(a.TEXCOORD_0);
        const points = [], directions = [], texcoords = [];
        for (let i = 0; i < indices.length; i += 3) {
            const triangle = indices.slice(i, i + 3);
            const headWeight = triangle.reduce((sum, vertex) => sum + [0, 1, 2, 3].reduce((total, slot) =>
                total + (headJoints.has(joints[vertex * 4 + slot]) ? weights[vertex * 4 + slot] : 0), 0), 0) / 3;
            if (headWeight < .5) { continue; }
            const centre = triangle.reduce((sum, vertex) => sum.add(new Vector3().fromArray(positions, vertex * 3)),
                new Vector3()).divideScalar(3);
            if (centre.y < 2.04 && centre.z > 2) { continue; }
            for (const vertex of triangle) {
                const point = new Vector3().fromArray(positions, vertex * 3);
                if (primitive.material !== 4) {
                    // Fold the severed quadruped neck rim into the skull instead of leaving pointed flaps.
                    point.z = Math.max(1.9, point.z);
                    point.x = Math.max(-.34, Math.min(.34, point.x));
                }
                if (primitive.material !== 4 && point.y > 2.16) {
                    // Flatten the residual wolf ear bases; the two rounded ears are retained separately.
                    point.x *= .72;
                    point.y = Math.min(point.y, 2.28);
                }
                point.sub(new Vector3(0, 2.08, 1.88)).multiplyScalar(.4).add(new Vector3(0, 1.72, .065));
                points.push(...point.applyMatrix4(transform).toArray());
                directions.push(...new Vector3().fromArray(normals, vertex * 3).applyMatrix3(normalMatrix).normalize().toArray());
                if (uv) { texcoords.push(...uv.slice(vertex * 2, vertex * 2 + 2)); }
            }
        }
        if (!points.length) { continue; }
        const attributes = { POSITION: append(points), NORMAL: append(directions) };
        if (uv) { attributes.TEXCOORD_0 = append(texcoords, 'VEC2'); }
        primitives.push({ material: materials[primitive.material], attributes });
    }
    const mesh = data.meshes.push({ name: 'Reused hyena head', primitives }) - 1;
    const node = data.nodes.push({ name: 'GnollHead', mesh }) - 1;
    (data.nodes[parent].children ||= []).push(node);
    const jawMesh = data.meshes.push({ name: 'Gnoll articulated lower jaw', primitives: jawPrimitives }) - 1;
    const jaw = data.nodes.push({ name: 'GnollJaw', mesh: jawMesh, translation: jawOrigin.toArray(),
        extras: { hingeAxis: new Vector3(1, 0, 0).applyMatrix3(normalMatrix).normalize().toArray() } }) - 1;
    data.nodes[parent].children.push(jaw);
    const mouth = new Vector3(0, 1.696, .253).applyMatrix4(transform);
    data.nodes[parent].children.push(data.nodes.push({ name: 'GnollMouth', translation: mouth.toArray() }) - 1);
    for (const name of ['Eyes', 'Eyebrows']) { delete data.nodes.find(node => node.name === name).mesh; }
    const body = data.meshes[data.nodes.find(node => node.name === 'SuperHero_Male').mesh].primitives[0];
    const bodyJoints = read(body.attributes.JOINTS_0), bodyWeights = read(body.attributes.WEIGHTS_0);
    const headJoint = skin.joints.indexOf(parent), indices = read(body.indices), kept = [];
    for (let i = 0; i < indices.length; i += 3) {
        const triangle = indices.slice(i, i + 3);
        const headWeight = triangle.reduce((sum, vertex) => sum + [0, 1, 2, 3].reduce((total, slot) =>
            total + (bodyJoints[vertex * 4 + slot] === headJoint ? bodyWeights[vertex * 4 + slot] : 0), 0), 0) / 3;
        if (headWeight < .4) { kept.push(...triangle); }
    }
    body.indices = append(kept, 'SCALAR', 5123);
    const positions = read(body.attributes.POSITION), uv = [];
    for (let i = 0; i < positions.length; i += 3) {
        const [x, y, z] = positions.slice(i, i + 3);
        // Reuse the unchanged tile: spotted upper body, plain close hide below the waist.
        uv.push(y > .99 ? (((x + z) * .6 + .25) % .5 + .5) % .5 : .75,
            1 - Math.max(.45, y * 2.2) / 2.7);
    }
    body.attributes.TEXCOORD_0 = append(uv, 'VEC2');
    const material = data.materials[body.material].pbrMetallicRoughness;
    material.baseColorTexture = { index: texture }; material.baseColorFactor = [1, 1, 1, 1];
}
