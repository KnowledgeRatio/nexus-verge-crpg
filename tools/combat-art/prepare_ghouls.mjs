/** Original clawed corpse candidates on the shared traveller/zombie rig. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { TubeGeometry, CatmullRomCurve3, Vector3, Matrix4, AnimationMixer, Quaternion, Texture } from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { spiritSurface } from './spirit_surface.mjs';

const source = fs.readFileSync('data/graphics/combat/zombie-v1.glb');
const length = source.readUInt32LE(12);
const original = JSON.parse(source.subarray(20, 20 + length));
const binary = source.subarray(28 + length);
for (const id of ['ghoul', 'ghast']) {
    const data = globalThis.structuredClone(original), chunks = [binary];
    let offset = binary.length;
    function append(values, type, componentType = 5126) {
        const bytes = Buffer.from((componentType === 5123 ? new Uint16Array(values) : new Float32Array(values)).buffer);
        const view = data.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length }) - 1;
        chunks.push(bytes); offset += bytes.length;
        const width = { SCALAR: 1, VEC3: 3, VEC4: 4 }[type];
        const accessor = { bufferView: view, componentType, type, count: values.length / width };
        if (width === 1) { accessor.min = [Math.min(...values)]; accessor.max = [Math.max(...values)]; }
        if (width === 3) {
            accessor.min = [0, 1, 2].map(axis => Math.min(...values.filter((_, i) => i % 3 === axis)));
            accessor.max = [0, 1, 2].map(axis => Math.max(...values.filter((_, i) => i % 3 === axis)));
        }
        return data.accessors.push(accessor) - 1;
    }
    const loader = new GLTFLoader().register(() => ({ name: 'authoring-textures',
        loadTexture: () => Promise.resolve(new Texture()) }));
    const model = await loader.parseAsync(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength), '');
    model.scene.updateMatrixWorld(true);
    const clawMaterial = data.materials.push({ name: 'Dark horn claw tips',
        pbrMetallicRoughness: { baseColorFactor: [.08, .06, .045, 1], metallicFactor: 0, roughnessFactor: .8 } }) - 1;
    const skinMaterial = data.materials.findIndex(material => material.name === 'Skin');
    data.materials[skinMaterial].pbrMetallicRoughness.baseColorFactor = id === 'ghoul' ? [.42, .44, .39, 1] : [.42, .40, .38, 1];
    const coat = data.materials.find(material => material.name === 'Slate woven coat');
    coat.pbrMetallicRoughness.baseColorFactor = id === 'ghoul' ? [.09, .075, .06, 1] : [.085, .085, .09, 1];
    // Expose a gaunt torso and arms instead of hiding the creature under the traveller coat.
    for (const node of data.nodes) {
        if (node.mesh !== undefined && !['Neck', 'Brow', 'Trouser L'].includes(node.name)) {
            delete node.mesh; delete node.skin;
        }
    }
    const flesh = spiritSurface(name => data.skins[0].joints.indexOf(data.nodes.findIndex(n => n.name === name)),
        { includeHead: false, gaunt: true });
    const fleshMesh = data.meshes.push({ name: 'Gaunt corpse body', primitives: [{ material: skinMaterial, attributes: {
        POSITION: append(flesh.positions, 'VEC3'), NORMAL: append(flesh.normals, 'VEC3'),
        WEIGHTS_0: append(flesh.weights, 'VEC4'), JOINTS_0: append(flesh.joints, 'VEC4', 5123)
    } }] }) - 1;
    const fleshNode = data.nodes.push({ name: 'GauntBody', mesh: fleshMesh, skin: 0 }) - 1;
    data.scenes[data.scene || 0].nodes.push(fleshNode);
    for (const sign of [-1, 1]) {
        const side = sign < 0 ? 'L' : 'R', boneName = `Grip.${side}`;
        const boneIndex = data.nodes.findIndex(node => node.name === boneName);
        const bone = model.scene.getObjectByName(`Grip${side}`);
        const inverse = new Matrix4().copy(bone.matrixWorld).invert();
        const positions = [[], []], normals = [[], []];
        for (let finger = 0; finger < 4; finger++) {
            const x = sign * .30 + (finger - 1.5) * .018;
            const extension = id === 'ghast' ? .04 : 0;
            const curves = [
                [[x, .91, .15], [x, .855 - extension, .17], [x, .835 - extension, .22]],
                [[x, .835 - extension, .22], [x, .835 - extension, .25], [x, .87 - extension, .28]]
            ];
            curves.forEach((points, material) => {
                const tube = new TubeGeometry(new CatmullRomCurve3(points.map(p => new Vector3(...p))),
                    6, material ? .005 : .008, 6, false).toNonIndexed();
                tube.applyMatrix4(inverse);
                positions[material].push(...tube.attributes.position.array);
                normals[material].push(...tube.attributes.normal.array);
            });
        }
        const mesh = data.meshes.push({ name: `${id} extended fingers ${side}`, primitives: positions.map((values, i) => ({
            material: i ? clawMaterial : skinMaterial,
            attributes: { POSITION: append(values, 'VEC3'), NORMAL: append(normals[i], 'VEC3') }
        })) }) - 1;
        const node = data.nodes.push({ name: `ClawedHand${side}`, mesh }) - 1;
        (data.nodes[boneIndex].children ||= []).push(node);
    }
    const headIndex = data.nodes.findIndex(node => node.name === 'HeadJoint');
    const mouth = model.scene.getObjectByName('HeadJoint').worldToLocal(new Vector3(0, 1.67, .12));
    const mouthIndex = data.nodes.push({ name: 'BiteContact', translation: mouth.toArray() }) - 1;
    (data.nodes[headIndex].children ||= []).push(mouthIndex);
    const mixer = new AnimationMixer(model.scene);
    mixer.clipAction(model.animations.find(clip => clip.name === 'Zombie_Idle')).play();
    mixer.setTime(0); model.scene.updateMatrixWorld(true);
    const bite = { name: 'Corpse_Bite', samplers: [], channels: [] };
    const times = append([0, .18, .35, .48, .75], 'SCALAR');
    for (const nodeIndex of data.skins[0].joints) {
        const node = data.nodes[nodeIndex], bone = model.scene.getObjectByName(node.name.replaceAll('.', ''));
        if (!bone) { throw new Error(`Missing corpse joint ${node.name}`); }
        const strength = node.name === 'HeadJoint' ? .30 : node.name === 'Spine' ? .18 : 0;
        const values = [0, .3, 1, .75, 0].flatMap(amount => bone.quaternion.clone().premultiply(
            new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), strength * amount)).toArray());
        const sampler = bite.samplers.push({ input: times, output: append(values, 'VEC4'), interpolation: 'LINEAR' }) - 1;
        bite.channels.push({ sampler, target: { node: nodeIndex, path: 'rotation' } });
    }
    data.animations.push(bite);
    data.buffers = [{ byteLength: offset, uri: 'data:application/octet-stream;base64,' + Buffer.concat(chunks).toString('base64') }];
    fs.writeFileSync(`tools/combat-art/${id}-candidate.gltf`, JSON.stringify(data));
}
