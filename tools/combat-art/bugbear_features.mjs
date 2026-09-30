/** Original coarse fur and ursine/primate facial features on the shared body. */
import { SphereGeometry, BufferGeometry, Float32BufferAttribute, Vector3 } from '../../vendor/three/three.module.min.js';

export function addBugbearFeatures(data, { read, append, skin, inverse }) {
    const material = (name, colour) => data.materials.push({ name,
        pbrMetallicRoughness: { baseColorFactor: [...colour, 1], metallicFactor: 0, roughnessFactor: 1 } }) - 1;
    const fur = material('Bugbear coarse brown-black fur', [.055, .037, .025]);
    const face = material('Bugbear broad muzzle', [.095, .064, .04]);
    const nose = material('Bugbear dark nose', [.025, .019, .016]);
    const eyes = data.materials.find(entry => entry.name === 'MI_Eyes');
    eyes.pbrMetallicRoughness.baseColorFactor = [.65, .43, .035, 1];
    const head = data.nodes.findIndex(node => node.name === 'Head');
    function feature(name, centre, radii, mat) {
        const geometry = new SphereGeometry(1, 14, 9).scale(...radii).translate(...centre)
            .applyMatrix4(inverse[skin.joints.indexOf(head)]).toNonIndexed();
        const mesh = data.meshes.push({ name, primitives: [{ material: mat, attributes: {
            POSITION: append([...geometry.attributes.position.array]), NORMAL: append([...geometry.attributes.normal.array])
        } }] }) - 1;
        const node = data.nodes.push({ name, mesh }) - 1;
        (data.nodes[head].children ||= []).push(node); geometry.dispose();
    }
    feature('BugbearMuzzle', [0, 1.66, .105], [.063, .038, .048], face);
    feature('BugbearNose', [0, 1.682, .143], [.04, .021, .025], nose);
    for (const sign of [-1, 1]) {
        feature(`BugbearEar${sign}`, [sign * .117, 1.756, -.006], [.039, .051, .024], fur);
        feature(`BugbearBrow${sign}`, [sign * .046, 1.736, .082], [.044, .02, .025], fur);
    }
    const body = data.nodes.find(node => node.name === 'SuperHero_Male');
    const source = data.meshes[body.mesh].primitives[0];
    const positions = read(source.attributes.POSITION), normals = read(source.attributes.NORMAL);
    const joints = read(source.attributes.JOINTS_0), weights = read(source.attributes.WEIGHTS_0);
    const points = [], furJoints = [], furWeights = [], seen = new Set();
    for (let vertex = 0; vertex < positions.length / 3; vertex++) {
        const p = new Vector3().fromArray(positions, vertex * 3), n = new Vector3().fromArray(normals, vertex * 3).normalize();
        const key = p.toArray().map(value => value.toFixed(3)).join(',');
        if (seen.has(key)) { continue; } seen.add(key);
        const influences = joints.slice(vertex * 4, vertex * 4 + 4), w = weights.slice(vertex * 4, vertex * 4 + 4);
        const dominant = influences[w.indexOf(Math.max(...w))], bone = data.nodes[skin.joints[dominant]].name;
        if (/^(hand|thumb|index|middle|ring|pinky|foot|ball)/.test(bone)) { continue; }
        const exposed = Math.abs(p.x) > .31 || p.y < .66 || p.y > 1.49;
        if (!exposed || (p.y > 1.6 && p.z > .025 && Math.abs(p.x) < .09)) { continue; }
        const variation = Math.abs(Math.sin(vertex * 12.9898 + 7.233));
        if (variation < .62) { continue; }
        const tangent = new Vector3().crossVectors(n, new Vector3(0, 1, 0));
        if (tangent.lengthSq() < .001) { tangent.set(1, 0, 0); } else { tangent.normalize(); }
        const root = p.clone().addScaledVector(n, .004), width = .012 + variation * .008;
        const tip = root.clone().addScaledVector(n, .028 + variation * .018).add(new Vector3(0, -.045, 0));
        const left = root.clone().addScaledVector(tangent, -width), right = root.clone().addScaledVector(tangent, width);
        for (const point of [left, tip, right]) { points.push(...point.toArray()); furJoints.push(...influences); furWeights.push(...w); }
    }
    const geometry = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(points, 3));
    geometry.computeVertexNormals(); data.materials[fur].doubleSided = true;
    const mesh = data.meshes.push({ name: 'Bugbear skinned fur', primitives: [{ material: fur, attributes: {
        POSITION: append(points), NORMAL: append([...geometry.attributes.normal.array]),
        JOINTS_0: append(furJoints, 'VEC4', 5123), WEIGHTS_0: append(furWeights, 'VEC4')
    } }] }) - 1;
    const node = data.nodes.push({ name: 'BugbearFur', mesh, skin: body.skin }) - 1;
    data.nodes.find(parent => parent.children?.includes(data.nodes.indexOf(body))).children.push(node);
    geometry.dispose();
}
