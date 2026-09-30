import { AnimationMixer, LoopOnce, Quaternion } from '../../vendor/three/three.module.min.js';

/** Mirror a clip in world space, correcting each destination bone's rest frame. */
export function mirrorBodyMotion(data, model, append, sourceName, targetName) {
    const clip = model.animations.find(candidate => candidate.name === sourceName);
    if (!clip) { throw new Error(`Missing motion to mirror: ${sourceName}`); }
    model.scene.updateMatrixWorld(true);
    const reflect = q => new Quaternion(q.x, -q.y, -q.z, q.w);
    const bones = data.skins[0].joints.map(index => {
        const object = model.scene.getObjectByName(data.nodes[index].name);
        return { index, object, name: object.name, rotation: object.getWorldQuaternion(new Quaternion()),
            position: object.position.clone(), parentRotation: object.parent.getWorldQuaternion(new Quaternion()) };
    });
    const byName = new Map(bones.map(bone => [bone.name, bone]));
    const other = name => name.replace(/_([lr])$/, (_, side) => side === 'l' ? '_r' : '_l');
    const mixer = new AnimationMixer(model.scene);
    mixer.clipAction(clip).setLoop(LoopOnce, 1).play().clampWhenFinished = true;
    const frames = Math.ceil(clip.duration * 60), times = [];
    const outputs = bones.map(() => ({ rotation: [], translation: [] }));
    for (let frame = 0; frame <= frames; frame++) {
        const time = frame / frames * clip.duration;
        times.push(time); mixer.setTime(time); model.scene.updateMatrixWorld(true);
        const desired = new Map(bones.map(bone => {
            const source = byName.get(other(bone.name)) || bone;
            const world = reflect(source.object.getWorldQuaternion(new Quaternion()))
                .multiply(reflect(source.rotation).invert()).multiply(bone.rotation);
            return [bone.object, world];
        }));
        bones.forEach((bone, i) => {
            const parent = desired.get(bone.object.parent) || bone.parentRotation;
            outputs[i].rotation.push(...parent.clone().invert().multiply(desired.get(bone.object)).normalize().toArray());
            const source = byName.get(other(bone.name)) || bone;
            const delta = source.object.position.clone().sub(source.position).applyQuaternion(source.parentRotation);
            delta.x *= -1;
            delta.applyQuaternion(bone.parentRotation.clone().invert());
            outputs[i].translation.push(...bone.position.clone().add(delta).toArray());
        });
    }
    mixer.stopAllAction(); model.scene.updateMatrixWorld(true);
    const input = append(times, 'SCALAR'), animation = { name: targetName, samplers: [], channels: [] };
    bones.forEach(({ index }, i) => {
        for (const path of ['rotation', 'translation']) {
            const sampler = animation.samplers.push({ input,
                output: append(outputs[i][path], path === 'rotation' ? 'VEC4' : 'VEC3'), interpolation: 'LINEAR' }) - 1;
            animation.channels.push({ sampler, target: { node: index, path } });
        }
    });
    data.animations.push(animation);
}
