/** Rest-frame retarget of retained CC0 KayKit melee clips onto the anatomical humanoid. */
import fs from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Quaternion, Vector3, Texture, LoopOnce } from '../../vendor/three/three.module.min.js';

export async function retargetAnatomicalMelee(data, target, append, requested) {
    const bytes = fs.readFileSync('tools/combat-art/sources/kaykit-character-animations-1.1/Rig_Medium_CombatMelee.glb');
    const source = await new GLTFLoader().register(() => ({ name: 'authoring-textures',
        loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    source.scene.updateMatrixWorld(true); target.scene.updateMatrixWorld(true);
    const map = { pelvis: 'hips', spine_01: 'spine', spine_03: 'chest', Head: 'head' };
    for (const side of ['l', 'r']) {
        for (const [to, from] of [['upperarm', 'upperarm'], ['lowerarm', 'lowerarm'], ['hand', 'hand'],
            ['thigh', 'upperleg'], ['calf', 'lowerleg'], ['foot', 'foot'], ['ball', 'toes']]) {
            map[`${to}_${side}`] = `${from}.${side}`;
        }
    }
    const bones = [];
    target.scene.traverse(object => {
        const index = data.nodes.findIndex(node => node.name === object.name);
        if (data.skins[0].joints.includes(index)) {
            bones.push({ object, index, position: object.position.clone(), rotation: object.quaternion.clone() });
        }
    });
    const mappings = bones.filter(({ object }) => map[object.name]).map(({ object }) => {
        const from = source.scene.getObjectByName(map[object.name].replaceAll('.', ''));
        if (!from) { throw new Error(`Missing source bone ${map[object.name]}`); }
        return { object, from, correction: from.getWorldQuaternion(new Quaternion()).invert()
            .multiply(object.getWorldQuaternion(new Quaternion())) };
    });
    const sourceHip = source.scene.getObjectByName('hips'), targetHip = target.scene.getObjectByName('pelvis');
    const sourceHipRest = sourceHip.getWorldPosition(new Vector3()), targetHipRest = targetHip.position.clone();
    const scale = targetHip.getWorldPosition(new Vector3()).y / sourceHipRest.y;
    const mixer = new AnimationMixer(source.scene);
    for (const name of requested) {
        const clip = source.animations.find(candidate => candidate.name === name);
        if (!clip) { throw new Error(`Missing melee source ${name}`); }
        mixer.stopAllAction(); mixer.clipAction(clip).reset().setLoop(LoopOnce, 1).play().clampWhenFinished = true;
        const count = Math.ceil(clip.duration * 60), times = [], poses = bones.map(() => ({ translation: [], rotation: [] }));
        for (let frame = 0; frame <= count; frame++) {
            const time = clip.duration * frame / count; times.push(time);
            mixer.setTime(time); source.scene.updateMatrixWorld(true);
            bones.forEach(({ object, position, rotation }) => { object.position.copy(position); object.quaternion.copy(rotation); });
            target.scene.updateMatrixWorld(true);
            for (const { object, from, correction } of mappings) {
                const world = from.getWorldQuaternion(new Quaternion()).multiply(correction);
                object.quaternion.copy(object.parent.getWorldQuaternion(new Quaternion()).invert().multiply(world));
                object.updateMatrixWorld(true);
            }
            const delta = sourceHip.getWorldPosition(new Vector3()).sub(sourceHipRest).multiplyScalar(scale);
            // Approach movement belongs to the combat renderer. Preserve stance height and lateral weight shift only.
            delta.z = 0;
            delta.applyQuaternion(targetHip.parent.getWorldQuaternion(new Quaternion()).invert());
            targetHip.position.copy(targetHipRest).add(delta); target.scene.updateMatrixWorld(true);
            bones.forEach(({ object }, i) => {
                poses[i].rotation.push(...object.quaternion.toArray()); poses[i].translation.push(...object.position.toArray());
            });
        }
        const input = append(times, 'SCALAR'), animation = { name, samplers: [], channels: [] };
        bones.forEach(({ index }, i) => {
            for (const path of ['rotation', 'translation']) {
                const sampler = animation.samplers.push({ input, output: append(poses[i][path], path === 'rotation' ? 'VEC4' : 'VEC3'),
                    interpolation: 'LINEAR' }) - 1;
                animation.channels.push({ sampler, target: { node: index, path } });
            }
        });
        data.animations.push(animation);
    }
    mixer.stopAllAction();
}
