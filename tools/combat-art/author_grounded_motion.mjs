/** Shared armed ground poses: retain a supported torso/legs while reusing arm motion. */
import { AnimationMixer, LoopOnce, Quaternion, Vector3, PropertyBinding, Box3 } from '../../vendor/three/three.module.min.js';

export function authorGroundedMotion(data, model, append, spec, options = {}) {
    const mixer = new AnimationMixer(model.scene);
    const bones = [];
    model.scene.traverse(object => {
        const index = data.nodes.findIndex(node => PropertyBinding.sanitizeNodeName(node.name || '') === object.name);
        if (data.skins[0].joints.includes(index)) { bones.push({ object, index }); }
    });
    const recovery = model.animations.find(clip => clip.name === 'LayToIdle');
    if (!recovery) { throw new Error('Grounded motion requires LayToIdle'); }
    const sample = (clip, time) => {
        mixer.stopAllAction();
        mixer.clipAction(clip).reset().setLoop(LoopOnce, 1).play().clampWhenFinished = true;
        mixer.setTime(time); model.scene.updateMatrixWorld(true);
    };
    const start = recovery.duration * (options.recoveryPhase ?? .3);
    const arms = options.arms || ['upperarm_l', 'upperarm_r'];
    const hands = options.hands || ['hand_l', 'hand_r'];
    const prefixes = options.armPrefixes || ['clavicle', 'upperarm', 'lowerarm', 'hand', 'thumb', 'index', 'middle', 'ring', 'pinky'];
    const morphs = (options.morphNodes || []).map(name => ({
        index: data.nodes.findIndex(node => node.name === name), object: model.scene.getObjectByName(name)
    }));
    const tail = options.tail && model.scene.getObjectByName(options.tail.node);
    sample(recovery, start);
    const base = bones.map(({ object }) => ({ position: object.position.clone(), rotation: object.quaternion.clone() }));
    const requests = [{ name: 'Ground_Idle', source: options.idleSource || 'Sword_Idle', hold: .2, duration: .5 },
        ...spec.map(entry => ({ ...entry })),
        { name: 'Ground_GetUp', source: 'LayToIdle', start, recovery: true },
        { name: 'Ground_Death', source: 'LayToIdle', start, reverse: true, duration: .65, recovery: true }];
    for (const request of requests) {
        const source = model.animations.find(clip => clip.name === request.source);
        if (!source) { throw new Error(`Missing grounded source ${request.source}`); }
        const duration = request.duration || source.duration - (request.start || 0);
        const count = Math.ceil(duration * 60), times = [], poses = bones.map(() => ({ rotation: [], translation: [] }));
        const weights = morphs.map(() => []);
        const tailRotations = [], tailWeights = [];
        for (let frame = 0; frame <= count; frame++) {
            const time = duration * frame / count;
            sample(source, request.reverse ? request.start * (1 - time / duration) :
                request.hold ?? time + (request.start || 0));
            morphs.forEach(({ object }, index) => {
                weights[index].push(...object.morphTargetInfluences.map(value => request.reverse ? 0 : value));
            });
            const armRotations = request.recovery ? [] : arms.map(name => {
                const object = model.scene.getObjectByName(name);
                // Raise the guard slightly so the reused chop finishes at the opponent's shins, not the floor.
                const pitch = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), request.pitch ?? options.pitch ?? -.3);
                return { object, world: pitch.multiply(object.getWorldQuaternion(new Quaternion())) };
            });
            bones.forEach(({ object }, i) => {
                if (!request.recovery && !prefixes.some(prefix => object.name.startsWith(prefix))) {
                    object.position.copy(base[i].position); object.quaternion.copy(base[i].rotation);
                }
            });
            model.scene.updateMatrixWorld(true);
            if (options.torsoPitch) {
                const spine = model.scene.getObjectByName('Spine');
                const amount = options.torsoPitch * (request.recovery ? 1 - time / duration : 1);
                const world = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), amount)
                    .multiply(spine.getWorldQuaternion(new Quaternion()));
                spine.quaternion.copy(spine.parent.getWorldQuaternion(new Quaternion()).invert().multiply(world));
                spine.updateMatrixWorld(true);
            }
            for (const { object, world } of armRotations) {
                object.quaternion.copy(object.parent.getWorldQuaternion(new Quaternion()).invert().multiply(world));
                object.updateMatrixWorld(true);
            }
            // Keep follow-through hands above the supporting body plane. Otherwise the
            // grounding pass would lift the entire seated body to rescue a low wrist.
            for (const [side, name] of (request.recovery ? [] : arms).entries()) {
                const arm = model.scene.getObjectByName(name);
                const hand = model.scene.getObjectByName(hands[side]);
                for (let attempt = 0; attempt < 3; attempt++) {
                    const origin = arm.getWorldPosition(new Vector3()), point = hand.getWorldPosition(new Vector3());
                    if (point.y >= .035) { break; }
                    const from = point.clone().sub(origin), to = point.clone().setY(.06).sub(origin);
                    const correction = new Quaternion().setFromUnitVectors(from.normalize(), to.normalize());
                    const world = correction.multiply(arm.getWorldQuaternion(new Quaternion()));
                    arm.quaternion.copy(arm.parent.getWorldQuaternion(new Quaternion()).invert().multiply(world));
                    arm.updateMatrixWorld(true);
                }
            }
            bones.forEach(({ object }, i) => {
                poses[i].rotation.push(...object.quaternion.toArray()); poses[i].translation.push(...object.position.toArray());
            });
            if (tail) {
                model.scene.updateMatrixWorld(true);
                const parent = tail.parent;
                parent.remove(tail);
                const floor = new Box3().setFromObject(model.scene, true).min.y;
                parent.add(tail); model.scene.updateMatrixWorld(true);
                const height = tail.getWorldPosition(new Vector3()).y - floor;
                // Counter the pelvis rotation while flattening the hanging tip near the floor.
                const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0),
                    request.reverse ? 0 : options.tail.sway * Math.sin(time / duration * Math.PI * 2));
                tailRotations.push(...parent.getWorldQuaternion(new Quaternion()).invert().multiply(yaw).toArray());
                tailWeights.push(Math.max(0, Math.min(1,
                    1 - (height - options.tail.clearance) / options.tail.droop)));
            }
            times.push(time);
        }
        const input = append(times, 'SCALAR'), animation = { name: request.name, samplers: [], channels: [] };
        bones.forEach(({ index }, i) => {
            for (const path of ['rotation', 'translation']) {
                const sampler = animation.samplers.push({ input, output: append(poses[i][path], path === 'rotation' ? 'VEC4' : 'VEC3'),
                    interpolation: 'LINEAR' }) - 1;
                animation.channels.push({ sampler, target: { node: index, path } });
            }
        });
        morphs.forEach(({ index }, i) => {
            const sampler = animation.samplers.push({ input, output: append(weights[i], 'SCALAR'),
                interpolation: 'LINEAR' }) - 1;
            animation.channels.push({ sampler, target: { node: index, path: 'weights' } });
        });
        if (tail) {
            const node = data.nodes.findIndex(entry => entry.name === options.tail.node);
            for (const [path, values, type] of [['rotation', tailRotations, 'VEC4'], ['weights', tailWeights, 'SCALAR']]) {
                const sampler = animation.samplers.push({ input, output: append(values, type), interpolation: 'LINEAR' }) - 1;
                animation.channels.push({ sampler, target: { node, path } });
            }
        }
        data.animations.push(animation);
    }
    mixer.stopAllAction();
}
