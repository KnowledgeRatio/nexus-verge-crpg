/** Offline CC0 animation sources -> original traveller retarget. Run with node; no packages required. */
import fs from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import console from 'node:console';
import { fileURLToPath } from 'node:url';
import { Object3D, Vector3, Quaternion, Matrix4 } from '../../vendor/three/three.core.min.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const V = (...args) => new Vector3(...args);
const Q = () => new Quaternion();
const fps = 30;
const requested = [
    { library: 'ual2', name: 'Prone_Idle', segments: ['Hit_Knockback'], poseTime: .75, duration: .5 },
    ...['L', 'R'].map(side => ({ library: 'ual2', name: `Prone_Cast_${side}`,
        segments: ['Hit_Knockback'], poseTime: .75, duration: .5, groundedGesture: side })),
    ...['Melee_1H_Attack_Chop', 'Melee_1H_Attack_Slice_Diagonal', 'Melee_1H_Attack_Stab']
        .map(name => ({ library: 'kaykitMelee', name: `${name}_Left`, segments: [name], inPlace: true, mirrorTarget: true })),
    { library: 'kaykit', name: 'Ranged_1H_Shoot_Left', segments: ['Ranged_1H_Shoot'], inPlace: true, mirrorTarget: true },
    { library: 'ual1', name: 'Punch_Jab_Left', segments: ['Punch_Jab'], mirrorTarget: true },
    { library: 'ual1', name: 'Spell_Simple_Shoot_Right', segments: ['Spell_Simple_Shoot'], mirrorTarget: true },
    ...['Sword_Idle', 'Walk_Loop', 'Sword_Attack', 'Hit_Chest', 'Death01',
        'Idle_Loop', 'Pistol_Idle_Loop', 'Pistol_Shoot', 'Spell_Simple_Idle_Loop',
        'Spell_Simple_Shoot', 'Punch_Jab', 'Punch_Cross'].map(name => ({ library: 'ual1', name })),
    ...['Sword_Regular_A', 'Sword_Regular_B', 'Sword_Block', 'Idle_Shield_Loop', 'Hit_Knockback', 'LayToIdle',
        'OverhandThrow'].map(name => ({ library: 'ual2', name })),
    ...['Ranged_1H_Shoot', 'Ranged_2H_Shoot'].map(name => ({ library: 'kaykit', name, inPlace: true })),
    ...['Ranged_Bow_Idle'].map(name =>
        ({ library: 'kaykit', name, inPlace: true })),
    ...['Ranged_Bow_Draw', 'Ranged_Bow_Release'].map(name =>
        ({ library: 'kaykit', name, inPlace: true })),
    { library: 'kaykit', name: 'Ranged_Bow_Shot',
        segments: ['Ranged_Bow_Draw', 'Ranged_Bow_Release'], inPlace: true },
    ...['Melee_1H_Attack_Chop', 'Melee_1H_Attack_Slice_Diagonal', 'Melee_1H_Attack_Stab',
        'Melee_2H_Attack_Chop', 'Melee_2H_Attack_Slice', 'Melee_2H_Attack_Stab',
        'Melee_Unarmed_Attack_Punch_A', 'Melee_Block', 'Melee_2H_Idle', 'Melee_Unarmed_Idle']
        .map(name => ({ library: 'kaykitMelee', name, inPlace: true }))
];

function readGLB(relative, mirror = false) {
    const file = fs.readFileSync(path.join(ROOT, relative));
    const jsonLength = file.readUInt32LE(12);
    const json = JSON.parse(file.subarray(20, 20 + jsonLength));
    const binary = file.subarray(28 + jsonLength);
    const nodes = json.nodes.map(n => {
        const o = new Object3D(); o.name = n.name;
        if (n.translation) o.position.fromArray(n.translation);
        if (n.rotation) o.quaternion.fromArray(n.rotation);
        if (n.scale) o.scale.fromArray(n.scale);
        if (n.matrix) new Matrix4().fromArray(n.matrix).decompose(o.position, o.quaternion, o.scale);
        if (mirror) {
            o.position.x *= -1;
            o.quaternion.y *= -1;
            o.quaternion.z *= -1;
        }
        return o;
    });
    json.nodes.forEach((n, i) => n.children?.forEach(c => nodes[i].add(nodes[c])));
    const roots = nodes.filter(n => !n.parent);
    const update = () => roots.forEach(n => n.updateMatrixWorld(true)); update();
    const byName = Object.fromEntries(nodes.map(n => [n.name, n]));
    const rest = nodes.map(n => ({ p: n.position.clone(), q: n.quaternion.clone(), s: n.scale.clone(),
        wp: n.getWorldPosition(V()), wq: n.getWorldQuaternion(Q()) }));
    return { json, binary, nodes, byName, roots, rest, update, mirror,
        reset() { nodes.forEach((n, i) => { n.position.copy(rest[i].p); n.quaternion.copy(rest[i].q); n.scale.copy(rest[i].s); }); update(); },
        accessor(index) {
            const a = json.accessors[index], view = json.bufferViews[a.bufferView];
            if (a.componentType !== 5126 || a.sparse) throw new Error('Expected dense float animation accessor');
            const width = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
            const offset = (view.byteOffset || 0) + (a.byteOffset || 0);
            return Array.from({ length: a.count }, (_, i) => Array.from({ length: width }, (_, c) =>
                binary.readFloatLE(offset + i * (view.byteStride || width * 4) + c * 4)));
        }
    };
}

// Both libraries face +Z, but their right limb is on -X. Our authoring rig
// labels +X as right. Reflect the motion's handedness; a yaw also reverses aim.
const sources = {
    ual1: readGLB('tools/combat-art/sources/quaternius-ual1/UAL1_Standard.glb', true),
    ual2: readGLB('tools/combat-art/sources/quaternius-ual2/UAL2_Standard.glb', true),
    kaykit: readGLB('tools/combat-art/sources/kaykit-character-animations-1.1/Rig_Medium_CombatRanged.glb', true),
    kaykitMelee: readGLB('tools/combat-art/sources/kaykit-character-animations-1.1/Rig_Medium_CombatMelee.glb', true)
};
let source = sources.ual1;
let sourceSpec;
let facing;
let mapping;
let sourceHipRest;
let legScale;
let armScale;
let inPlace;
const target = readGLB('data/graphics/combat/traveller-v1.glb');
const pos = n => n.getWorldPosition(V());
const quat = n => n.getWorldQuaternion(Q());
const rest = (rig, name) => rig.rest[rig.nodes.indexOf(rig.byName[name])];
const direction = (rig, a, b) => pos(rig.byName[b]).sub(pos(rig.byName[a])).normalize();

// Frames carry both segment direction and twist. In particular, source arms are
// horizontal in bind, while traveller arms hang down: a raw bind delta is wrong.
function frame(direction, forward) {
    const y = direction.clone().normalize();
    const z = forward.clone().addScaledVector(y, -forward.dot(y)).normalize();
    if (z.lengthSq() < .5) z.copy(V(1, 0, 0)).addScaledVector(y, -y.x).normalize();
    const x = y.clone().cross(z).normalize(); z.crossVectors(x, y).normalize();
    return Q().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
}

const root = target.byName.Traveller;
const targetHip = V(0, .91, 0);
const targetHipLocal = targetHip.clone().applyQuaternion(rest(target, 'Traveller').wq.clone().invert());

const sourceSpecs = {
    ual1: { angle: 0, hip: 'pelvis', spine: 'spine_03', head: 'Head',
        upperArm: s => `upperarm_${s}`, lowerArm: s => `lowerarm_${s}`, hand: s => `hand_${s}`,
        thigh: s => `thigh_${s}`, calf: s => `calf_${s}`, foot: s => `foot_${s}` },
    ual2: { angle: 0, hip: 'pelvis', spine: 'spine_03', head: 'Head',
        upperArm: s => `upperarm_${s}`, lowerArm: s => `lowerarm_${s}`, hand: s => `hand_${s}`,
        thigh: s => `thigh_${s}`, calf: s => `calf_${s}`, foot: s => `foot_${s}` },
    kaykit: { angle: 0, hip: 'hips', spine: 'chest', head: 'head',
        upperArm: s => `upperarm.${s}`, lowerArm: s => `lowerarm.${s}`, hand: s => `hand.${s}`,
        thigh: s => `upperleg.${s}`, calf: s => `lowerleg.${s}`, foot: s => `foot.${s}` },
    kaykitMelee: { angle: 0, hip: 'hips', spine: 'chest', head: 'head',
        upperArm: s => `upperarm.${s}`, lowerArm: s => `lowerarm.${s}`, hand: s => `hand.${s}`,
        thigh: s => `upperleg.${s}`, calf: s => `lowerleg.${s}`, foot: s => `foot.${s}` }
};

function selectSource(library, yawCorrection = 0) {
    source = sources[library];
    source.reset();
    target.reset();
    sourceSpec = sourceSpecs[library];
    facing = Q().setFromAxisAngle(V(0, 1, 0), sourceSpec.angle + yawCorrection);
    // The compact target has one spine joint. Its torso frame is reconstructed
    // from anatomical landmarks below rather than copying source bone axes.
    const entries = [
        ...['L', 'R'].flatMap(side => {
            const s = side.toLowerCase();
            return [['Arm.' + side, sourceSpec.upperArm(s), sourceSpec.lowerArm(s), 'Elbow.' + side],
                ['Elbow.' + side, sourceSpec.lowerArm(s), sourceSpec.hand(s), 'Grip.' + side],
                ['Grip.' + side, sourceSpec.hand(s)],
                ['Leg.' + side, sourceSpec.thigh(s), sourceSpec.calf(s), 'Knee.' + side],
                ['Knee.' + side, sourceSpec.calf(s), sourceSpec.foot(s), 'Foot.' + side],
                ['Foot.' + side, sourceSpec.foot(s)]];
        })
    ];
    mapping = entries.map(([t, s, sc, tc]) => {
        const sb = rest(source, s), tb = rest(target, t);
        const gripSide = t.startsWith('Grip.') ? t.at(-1).toLowerCase() : null;
        if (gripSide) {
            // Preserve the source's prop socket, not the forearm direction. A
            // wrist's forward axis is not the axis along a held sword blade.
            const socket = source.byName[`handslot.${gripSide}`];
            const localSocket = socket ? sb.wq.clone().invert().multiply(quat(socket)) :
                Q().setFromAxisAngle(V(0, 0, 1), Math.PI / 2);
            return { t, s, correction: localSocket.multiply(tb.wq) };
        }
        const sourceFrame = sc ? frame(direction(source, s, sc), V(0, 0, 1)) : sb.wq.clone();
        const targetFrame = tc ? frame(direction(target, t, tc), V(0, 0, 1)) : facing.clone().multiply(sourceFrame);
        return { t, s, correction: sb.wq.clone().invert().multiply(sourceFrame)
            .multiply(targetFrame.clone().invert()).multiply(tb.wq) };
    });
    sourceHipRest = rest(source, sourceSpec.hip);
    legScale = (pos(target.byName['Knee.L']).distanceTo(pos(target.byName['Leg.L'])) +
        pos(target.byName['Foot.L']).distanceTo(pos(target.byName['Knee.L']))) /
        (pos(source.byName[sourceSpec.calf('l')]).distanceTo(pos(source.byName[sourceSpec.thigh('l')])) +
        pos(source.byName[sourceSpec.foot('l')]).distanceTo(pos(source.byName[sourceSpec.calf('l')])));
    armScale = (pos(target.byName['Elbow.L']).distanceTo(pos(target.byName['Arm.L'])) +
        pos(target.byName['Grip.L']).distanceTo(pos(target.byName['Elbow.L']))) /
        (pos(source.byName[sourceSpec.lowerArm('l')]).distanceTo(pos(source.byName[sourceSpec.upperArm('l')])) +
        pos(source.byName[sourceSpec.hand('l')]).distanceTo(pos(source.byName[sourceSpec.lowerArm('l')])));
}

function worldRotation(node, rotation) {
    node.quaternion.copy(node.parent ? quat(node.parent).invert().multiply(rotation) : rotation);
    node.updateMatrixWorld(true);
}

function constrainFoot(side) {
    const suffix = side.toLowerCase();
    const thigh = target.byName['Leg.' + side], knee = target.byName['Knee.' + side], foot = target.byName['Foot.' + side];
    const footRotation = quat(foot);
    const sourceFoot = sourceSpec.foot(suffix);
    const ankle = pos(source.byName[sourceFoot]).sub(rest(source, sourceFoot).wp)
        .applyQuaternion(facing).multiplyScalar(legScale).add(rest(target, 'Foot.' + side).wp);
    // The traveller boot has a different sole from the source. Constrain its
    // actual bind sole corners, rather than equating ankle height with contact.
    const footDelta = footRotation.clone().multiply(rest(target, 'Foot.' + side).wq.clone().invert());
    const bottom = Math.min(...[-.074, .074].flatMap(x => [-.062, .198].map(z =>
        V(x, -.088, z).applyQuaternion(footDelta).y)));
    ankle.y = Math.max(ankle.y, -bottom + .002);
    const hip = pos(thigh), currentKnee = pos(knee), currentFoot = pos(foot);
    const upper = hip.distanceTo(currentKnee), lower = currentKnee.distanceTo(currentFoot);
    const axis = ankle.clone().sub(hip), distance = Math.min(axis.length(), upper + lower - .00001);
    axis.normalize();
    const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
    const height = Math.sqrt(Math.max(0, upper * upper - along * along));
    let bend = pos(source.byName[sourceSpec.calf(suffix)]).sub(pos(source.byName[sourceSpec.thigh(suffix)]))
        .applyQuaternion(facing);
    bend.addScaledVector(axis, -bend.dot(axis));
    if (bend.lengthSq() < .000001) bend = V(0, 0, 1).addScaledVector(axis, -axis.z);
    const desiredKnee = hip.clone().addScaledVector(axis, along).addScaledVector(bend.normalize(), height);
    const upperDelta = Q().setFromUnitVectors(currentKnee.sub(hip).normalize(), desiredKnee.clone().sub(hip).normalize());
    worldRotation(thigh, upperDelta.multiply(quat(thigh)));
    const lowerDelta = Q().setFromUnitVectors(pos(foot).sub(pos(knee)).normalize(), ankle.sub(pos(knee)).normalize());
    worldRotation(knee, lowerDelta.multiply(quat(knee)));
    worldRotation(foot, footRotation);
}

function constrainArm(side) {
    const suffix = side.toLowerCase();
    const upper = target.byName['Arm.' + side];
    const elbow = target.byName['Elbow.' + side];
    const hand = target.byName['Grip.' + side];
    const handRotation = quat(hand);
    const shoulder = pos(upper);
    const currentElbow = pos(elbow);
    const currentHand = pos(hand);
    const upperLength = shoulder.distanceTo(currentElbow);
    const lowerLength = currentElbow.distanceTo(currentHand);
    const sourceShoulder = pos(source.byName[sourceSpec.upperArm(suffix)]);
    const desiredHand = pos(source.byName[sourceSpec.hand(suffix)]).sub(sourceShoulder)
        .applyQuaternion(facing).multiplyScalar(armScale).add(shoulder);
    const axis = desiredHand.clone().sub(shoulder);
    const distance = Math.min(axis.length(), upperLength + lowerLength - .00001);
    axis.normalize();
    const along = (upperLength * upperLength - lowerLength * lowerLength + distance * distance) / (2 * distance);
    const height = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
    let bend = pos(source.byName[sourceSpec.lowerArm(suffix)]).sub(sourceShoulder).applyQuaternion(facing);
    bend.addScaledVector(axis, -bend.dot(axis));
    if (bend.lengthSq() < .000001) {
        bend = V(side === 'L' ? -1 : 1, -1, 0).addScaledVector(axis, -axis.x * (side === 'L' ? -1 : 1));
    }
    const desiredElbow = shoulder.clone().addScaledVector(axis, along).addScaledVector(bend.normalize(), height);
    const upperDelta = Q().setFromUnitVectors(currentElbow.sub(shoulder).normalize(),
        desiredElbow.clone().sub(shoulder).normalize());
    worldRotation(upper, upperDelta.multiply(quat(upper)));
    const lowerDelta = Q().setFromUnitVectors(pos(hand).sub(pos(elbow)).normalize(),
        desiredHand.sub(pos(elbow)).normalize());
    worldRotation(elbow, lowerDelta.multiply(quat(elbow)));
    worldRotation(hand, handRotation);
}

function evaluate(tracks, time) {
    source.reset();
    for (const track of tracks) {
        let hi = track.times.findIndex(t => t[0] > time);
        if (hi < 0) hi = track.times.length - 1;
        const lo = Math.max(0, hi - 1), span = track.times[hi][0] - track.times[lo][0];
        const alpha = track.interpolation === 'STEP' || !span ? 0 : Math.min(1, Math.max(0, (time - track.times[lo][0]) / span));
        const n = source.nodes[track.node];
        if (track.path === 'rotation') n.quaternion.fromArray(track.values[lo]).slerp(Q().fromArray(track.values[hi]), alpha);
        else if (track.path === 'translation') n.position.fromArray(track.values[lo]).lerp(V().fromArray(track.values[hi]), alpha);
        else if (track.path === 'scale') n.scale.fromArray(track.values[lo]).lerp(V().fromArray(track.values[hi]), alpha);
        if (source.mirror && track.path === 'rotation') {
            n.quaternion.y *= -1;
            n.quaternion.z *= -1;
        } else if (source.mirror && track.path === 'translation') {
            n.position.x *= -1;
        }
    }
    source.update();
}

function retarget() {
    target.reset();
    // Use anatomical pelvis axes too: the source pelvis bone's bind-axis tilt
    // is not the target's upright body axis. Copying its quaternion delta
    // introduced a backward pitch even before collapsing the spine chain.
    const sourceHip = source.byName[sourceSpec.hip];
    let lowerSpine = source.byName[sourceSpec.spine];
    while (lowerSpine.parent && lowerSpine.parent !== sourceHip) lowerSpine = lowerSpine.parent;
    const hipUp = pos(lowerSpine).sub(pos(sourceHip)).applyQuaternion(facing).normalize();
    const hipRight = pos(source.byName[sourceSpec.thigh('r')])
        .sub(pos(source.byName[sourceSpec.thigh('l')])).applyQuaternion(facing).normalize();
    worldRotation(root, frame(hipUp, hipRight.cross(hipUp)).multiply(rest(target, 'Traveller').wq));
    const hip = pos(source.byName[sourceSpec.hip]).sub(sourceHipRest.wp).applyQuaternion(facing)
        .multiplyScalar(legScale).add(targetHip);
    root.position.copy(hip.sub(targetHipLocal.clone().applyQuaternion(quat(root))));
    if (inPlace) {
        root.position.x = rest(target, 'Traveller').p.x;
        root.position.z = rest(target, 'Traveller').p.z;
    }
    target.update();
    // Pelvis tilt is not torso tilt: the source's multi-joint spine counters
    // the hips. Collapse that chain into our single spine using the hip/head
    // centreline and shoulder line, preserving the source's forward lean.
    const torsoUp = pos(source.byName[sourceSpec.head]).sub(pos(source.byName[sourceSpec.hip]))
        .applyQuaternion(facing).normalize();
    const shoulderRight = pos(source.byName[sourceSpec.upperArm('r')])
        .sub(pos(source.byName[sourceSpec.upperArm('l')])).applyQuaternion(facing).normalize();
    const torsoForward = shoulderRight.cross(torsoUp).normalize();
    worldRotation(target.byName.Spine, frame(torsoUp, torsoForward).multiply(rest(target, 'Spine').wq));
    for (const { t, s, correction } of mapping) {
        worldRotation(target.byName[t], facing.clone().multiply(quat(source.byName[s])).multiply(correction));
    }
    for (const s of ['L', 'R']) constrainArm(s);
    for (const s of ['L', 'R']) constrainFoot(s);
    // Coat halves follow the corresponding thigh softly; full cloth simulation is
    // deliberately outside this offline retarget and remains a visual review gate.
    for (const s of ['L', 'R']) target.byName['Coat.' + s].quaternion.slerp(target.byName['Leg.' + s].quaternion, .35);
    target.update();
}

const chunks = [target.binary];
let binaryLength = target.binary.length;
function append(values, type) {
    const flat = values.flat();
    if (!flat.every(Number.isFinite)) throw new Error('Nonfinite animation value');
    const pad = (4 - binaryLength % 4) % 4;
    if (pad) { chunks.push(Buffer.alloc(pad)); binaryLength += pad; }
    const bytes = Buffer.alloc(flat.length * 4); flat.forEach((v, i) => bytes.writeFloatLE(v, i * 4));
    const view = target.json.bufferViews.push({ buffer: 0, byteOffset: binaryLength, byteLength: bytes.length }) - 1;
    chunks.push(bytes); binaryLength += bytes.length;
    return target.json.accessors.push({ bufferView: view, componentType: 5126, count: values.length, type,
        ...(type === 'SCALAR' ? { min: [Math.min(...flat)], max: [Math.max(...flat)] } : {}) }) - 1;
}

const report = { sources: {
    ual1: 'Quaternius Universal Animation Library 1 Standard (CC0)',
    ual2: 'Quaternius Universal Animation Library 2 Standard (CC0)',
    kaykit: 'KayKit Character Animations 1.1 Free, Rig_Medium CombatRanged (CC0)',
    kaykitMelee: 'KayKit Character Animations 1.1 Free, Rig_Medium CombatMelee (CC0)'
}, fps, legScales: {},
    method: 'World segment frame retarget; anatomical torso frame collapses source spine chain; explicit source/target facing; hip pivot compensation; two-bone arm and foot constraints using source end-effector paths and target proportions.',
    limitations: ['No clavicle, neck or toe joints on target', 'Coat has only two deforming sections',
        'Weapon grip orientation is calibrated by runtime weapon sockets', 'Numerical checks do not establish visual realism'], clips: {} };
target.json.animations = [];
for (const request of requested) {
    const { library, name } = request;
    selectSource(library, request.yawCorrection);
    inPlace = Boolean(request.inPlace);
    report.legScales[library] ??= legScale;
    const segments = (request.segments || [name]).map(segmentName => {
        const animation = source.json.animations.find(a => a.name === segmentName);
        if (!animation) throw new Error('Missing source clip: ' + segmentName);
        const tracks = animation.channels.map(c => {
            const s = animation.samplers[c.sampler];
            if (s.interpolation === 'CUBICSPLINE') throw new Error('Cubic source requires tangent evaluation');
            return { node: c.target.node, path: c.target.path, times: source.accessor(s.input),
                values: source.accessor(s.output), interpolation: s.interpolation };
        });
        return { name: segmentName, tracks,
            duration: Math.max(...tracks.map(track => track.times.at(-1)[0])) };
    });
    const duration = request.duration ?? segments.reduce((sum, segment) => sum + segment.duration, 0);
    const count = Math.ceil(duration * fps - .0001);
    const times = Array.from({ length: count + 1 }, (_, i) => [duration * i / count]);
    const names = ['Traveller', 'Spine', ...mapping.map(m => m.t), 'Coat.L', 'Coat.R'];
    const rotations = Object.fromEntries(names.map(n => [n, []]));
    const positions = [], feet = [], sourceFeet = [], kneeAngles = [], soleHeights = [], grips = [], hands = [], sourceHands = [];
    for (const [time] of times) {
        let localTime = time;
        let segment = segments.at(-1);
        for (const candidate of segments) {
            if (localTime <= candidate.duration) {
                segment = candidate;
                break;
            }
            localTime -= candidate.duration;
        }
        evaluate(segment.tracks, request.poseTime ?? Math.min(localTime, segment.duration)); retarget();
        if (request.groundedGesture) {
            const progress = time / duration;
            const phase = progress <= .4 ? progress / .4 : (1 - progress) / .6;
            const lift = phase * phase * (3 - 2 * phase);
            for (const [joint, angle] of [['Arm.', -.2], ['Elbow.', -.95]]) {
                const node = target.byName[joint + request.groundedGesture];
                worldRotation(node, Q().setFromAxisAngle(V(1, 0, 0), angle * lift).multiply(quat(node)));
            }
            target.update();
        }
        if (request.mirrorTarget) {
            // The target rig is symmetric about X. Reflect the full pose and
            // exchange paired joints so stance and torso follow the casting hand.
            const paired = n => n.endsWith('.L') ? n.slice(0, -1) + 'R' :
                n.endsWith('.R') ? n.slice(0, -1) + 'L' : n;
            const snapshot = Object.fromEntries(names.map(n => [n, target.byName[n].quaternion.clone()]));
            for (const n of names) {
                const q = snapshot[paired(n)];
                target.byName[n].quaternion.set(q.x, -q.y, -q.z, q.w);
            }
            root.position.x *= -1;
            target.update();
        }
        names.forEach(n => rotations[n].push(target.byName[n].quaternion.toArray()));
        positions.push(root.position.toArray());
        feet.push(['L', 'R'].map(s => pos(target.byName['Foot.' + s]).toArray()));
        sourceFeet.push(['l', 'r'].map(s => pos(source.byName[sourceSpec.foot(s)])
            .applyQuaternion(facing).toArray()));
        kneeAngles.push(['L', 'R'].map(s => {
            const k = pos(target.byName['Knee.' + s]);
            return Math.PI - pos(target.byName['Leg.' + s]).sub(k).angleTo(pos(target.byName['Foot.' + s]).sub(k));
        }));
        soleHeights.push(...['L', 'R'].flatMap(s => {
            const f = target.byName['Foot.' + s];
            const delta = quat(f).multiply(rest(target, 'Foot.' + s).wq.clone().invert());
            return [-.074, .074].flatMap(x => [-.062, .198].map(z => V(x, -.088, z).applyQuaternion(delta).add(pos(f)).y));
        }));
        grips.push({ time, position: pos(target.byName['Grip.R']).toArray() });
        hands.push(['L', 'R'].map(s => pos(target.byName['Grip.' + s]).toArray()));
        sourceHands.push(['l', 'r'].map(s => pos(source.byName[sourceSpec.hand(s)])
            .applyQuaternion(facing).toArray()));
    }
    const input = append(times, 'SCALAR');
    const result = { name, samplers: [], channels: [],
        extras: { sourceLibrary: library.toUpperCase(), sourceAnimations: segments.map(segment => segment.name),
            mirrored: Boolean(request.mirrorTarget), sampleRate: fps,
            ...(request.groundedGesture ? { authoring: 'Original arm gesture over held retargeted prone pose',
                gestureSide: request.groundedGesture, poseTime: request.poseTime } : {}) } };
    function channel(node, property, values, type) {
        const sampler = result.samplers.push({ input, output: append(values, type), interpolation: 'LINEAR' }) - 1;
        result.channels.push({ sampler, target: { node: target.nodes.indexOf(target.byName[node]), path: property } });
    }
    for (const n of names) channel(n, 'rotation', rotations[n], 'VEC4');
    channel('Traveller', 'translation', positions, 'VEC3');
    target.json.animations.push(result);
    const range = (samples, side, axis) => Math.max(...samples.map(f => f[side][axis])) - Math.min(...samples.map(f => f[side][axis]));
    report.clips[name] = { sourceLibrary: library.toUpperCase(), sourceAnimations: segments.map(segment => segment.name),
        mirrored: Boolean(request.mirrorTarget),
        ...(request.poseTime !== undefined ? { heldSourceTime: request.poseTime,
            originalGestureSide: request.groundedGesture || null } : {}),
        duration, frames: times.length,
        ankleHeightMin: Math.min(...feet.flat().map(p => p[1])),
        ankleHeightMax: Math.max(...feet.flat().map(p => p[1])),
        minimumSoleHeight: Math.min(...soleHeights),
        maximumKneeFlexionDegrees: Math.max(...kneeAngles.flat()) * 180 / Math.PI,
        rightHandMaximumForward: grips.reduce((max, p) => p.position[2] > max.position[2] ? p : max),
        midpointHands: hands[Math.floor(hands.length / 2)],
        sourceMidpointHands: sourceHands[Math.floor(sourceHands.length / 2)],
        loopEndpointMaximumJointAngleDegrees: Math.max(...names.map(n => Q().fromArray(rotations[n][0]).angleTo(Q().fromArray(rotations[n].at(-1))))) * 180 / Math.PI,
        feet: ['left', 'right'].map((side, i) => ({ side, rangeMetres: [0, 1, 2].map(a => range(feet, i, a)),
            sourceRangeMetres: [0, 1, 2].map(a => range(sourceFeet, i, a)) })) };
}
target.json.buffers[0].byteLength = binaryLength;
target.json.asset.extras = { ...target.json.asset.extras, animationSources: Object.values(report.sources),
    retargetScript: 'tools/combat-art/retarget_humanoid.mjs', candidate: true };
let json = Buffer.from(JSON.stringify(target.json));
json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
let binary = Buffer.concat(chunks); binary = Buffer.concat([binary, Buffer.alloc((4 - binary.length % 4) % 4)]);
const header = Buffer.alloc(20); header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + json.length + binary.length, 8); header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(binary.length); binHeader.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(path.join(ROOT, 'data/graphics/combat/traveller-animated.glb'), Buffer.concat([header, json, binHeader, binary]));
fs.writeFileSync(path.join(ROOT, 'tools/combat-art/retarget_humanoid.report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
