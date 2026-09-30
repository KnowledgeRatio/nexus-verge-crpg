import { AnimationMixer, Quaternion, Vector3 } from '../../vendor/three/three.module.min.js';

/** Author a head-led strike from the equipped guard, without moving the target. */
export function authorHornAttack(data, model, append, spec) {
    const mixer = new AnimationMixer(model.scene);
    mixer.clipAction(model.animations.find(clip => clip.name === spec.idleClip)).play();
    mixer.setTime(0); model.scene.updateMatrixWorld(true);
    const bones = data.skins[0].joints.map(index => ({ index,
        object: model.scene.getObjectByName(data.nodes[index].name) }));
    const rest = bones.map(({ object }) => ({ position: object.position.clone(), rotation: object.quaternion.clone() }));
    function rotateWorld(name, angle) {
        const bone = model.scene.getObjectByName(name);
        const world = bone.getWorldQuaternion(new Quaternion());
        const parent = bone.parent.getWorldQuaternion(new Quaternion()).invert();
        bone.quaternion.copy(parent.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angle)).multiply(world));
        model.scene.updateMatrixWorld(true);
    }
    const times = [], values = bones.map(() => ({ rotation: [], translation: [] }));
    for (let frame = 0; frame <= 60; frame++) {
        const t = frame / 60;
        times.push(t * spec.seconds);
        bones.forEach(({ object }, i) => { object.position.copy(rest[i].position); object.quaternion.copy(rest[i].rotation); });
        model.scene.updateMatrixWorld(true);
        const phase = t < spec.impact ? t / spec.impact : (1 - t) / (1 - spec.impact);
        const weight = phase * phase * (3 - 2 * phase);
        rotateWorld('spine_02', spec.spineLean * weight);
        rotateWorld('Head', spec.headLean * weight);
        if (spec.forwardShift) {
            const spine = model.scene.getObjectByName('spine_02');
            const parent = spine.parent;
            const shift = new Vector3(0, 0, spec.forwardShift * weight)
                .applyQuaternion(parent.getWorldQuaternion(new Quaternion()).invert())
                .divide(parent.getWorldScale(new Vector3()));
            spine.position.add(shift); model.scene.updateMatrixWorld(true);
        }
        bones.forEach(({ object }, i) => {
            values[i].rotation.push(...object.quaternion.toArray());
            values[i].translation.push(...object.position.toArray());
        });
    }
    const input = append(times, 'SCALAR'), animation = { name: spec.clipName || 'Horn_Gore', samplers: [], channels: [] };
    bones.forEach(({ index }, i) => {
        for (const path of ['rotation', 'translation']) {
            const sampler = animation.samplers.push({ input,
                output: append(values[i][path], path === 'rotation' ? 'VEC4' : 'VEC3'), interpolation: 'LINEAR' }) - 1;
            animation.channels.push({ sampler, target: { node: index, path } });
        }
    });
    if (spec.jaw) {
        const node = data.nodes.findIndex(candidate => candidate.name === spec.jaw.node);
        if (node < 0 || !data.nodes[node].extras?.hingeAxis) { throw new Error('Missing articulated jaw hinge'); }
        const axis = new Vector3(...data.nodes[node].extras.hingeAxis);
        const rotations = times.flatMap(time => {
            const phase = Math.min(1, time / (spec.seconds * spec.impact));
            const opening = Math.sin(Math.PI * phase) * spec.jaw.openAngle;
            return new Quaternion().setFromAxisAngle(axis, opening).toArray();
        });
        const sampler = animation.samplers.push({ input, output: append(rotations, 'VEC4'), interpolation: 'LINEAR' }) - 1;
        animation.channels.push({ sampler, target: { node, path: 'rotation' } });
    }
    data.animations.push(animation);
}
