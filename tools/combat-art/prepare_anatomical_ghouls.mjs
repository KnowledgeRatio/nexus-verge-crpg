/** Continuous anatomical corpse candidates; never modifies the retained CC0 source. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { BufferGeometry, Float32BufferAttribute, Matrix4, Vector3, TubeGeometry,
    CatmullRomCurve3, Quaternion, AnimationMixer, Texture, Box3, LoopOnce } from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { addStoneWings } from './stone_wings.mjs';

const original = JSON.parse(fs.readFileSync('tools/combat-art/anatomical-base-candidate.gltf'));
const specs = JSON.parse(fs.readFileSync('tools/combat-art/clawedBodySpecs.json'));
const requested = process.argv.slice(2);
for (const id of requested.length ? requested : ['ghoul', 'ghast']) {
    const spec = specs[id];
    if (!spec) { throw new Error(`Unknown clawed body ${id}`); }
    const data = globalThis.structuredClone(original);
    function read(index) {
        const accessor = data.accessors[index], view = data.bufferViews[accessor.bufferView];
        const bytes = Buffer.from(data.buffers[view.buffer].uri.split(',')[1], 'base64');
        const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[accessor.type];
        const size = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[accessor.componentType];
        const method = { 5126: 'readFloatLE', 5125: 'readUInt32LE', 5123: 'readUInt16LE', 5121: 'readUInt8' }[accessor.componentType];
        if (!width || !size || accessor.normalized) { throw new Error('Unsupported candidate accessor'); }
        return Array.from({ length: accessor.count * width }, (_, i) => bytes[method](
            (view.byteOffset || 0) + (accessor.byteOffset || 0) +
            Math.floor(i / width) * (view.byteStride || width * size) + i % width * size));
    }
    function append(values, type) {
        const bytes = Buffer.from(new Float32Array(values).buffer), buffer = data.buffers.length;
        data.buffers.push({ byteLength: bytes.length, uri: 'data:application/octet-stream;base64,' + bytes.toString('base64') });
        const view = data.bufferViews.push({ buffer, byteLength: bytes.length }) - 1;
        const width = { SCALAR: 1, VEC3: 3, VEC4: 4 }[type];
        const accessor = { bufferView: view, componentType: 5126, type, count: values.length / width };
        accessor.min = Array.from({ length: width }, (_, axis) => values.reduce((v, n, i) => i % width === axis ? Math.min(v, n) : v, Infinity));
        accessor.max = Array.from({ length: width }, (_, axis) => values.reduce((v, n, i) => i % width === axis ? Math.max(v, n) : v, -Infinity));
        return data.accessors.push(accessor) - 1;
    }
    const body = data.nodes.find(node => node.name === 'SuperHero_Male');
    const skin = data.skins[body.skin], inverseValues = read(skin.inverseBindMatrices);
    const inverseBinds = skin.joints.map((_, i) => new Matrix4().fromArray(inverseValues, i * 16));
    const binds = inverseBinds.map(matrix => matrix.clone().invert());
    const primitive = data.meshes[body.mesh].primitives[0], a = primitive.attributes;
    const sourcePositions = read(a.POSITION), joints = read(a.JOINTS_0), weights = read(a.WEIGHTS_0);
    const positions = [], colours = [];
    const flesh = spec.skin;
    for (let vertex = 0; vertex < sourcePositions.length / 3; vertex++) {
        const point = new Vector3().fromArray(sourcePositions, vertex * 3), result = new Vector3();
        for (let influence = 0; influence < 4; influence++) {
            const index = vertex * 4 + influence, weight = weights[index];
            if (!weight) { continue; }
            const joint = joints[index], name = data.nodes[skin.joints[joint]].name;
            // Shrink perpendicular to each bone, keeping its length and all joint pivots.
            const radial = /Head|neck|hand|foot|finger|thumb|index|middle|ring|pinky/.test(name) ? 1 :
                /spine/.test(name) ? spec.torsoBulk : /pelvis/.test(name) ? spec.pelvisBulk : spec.limbBulk;
            const local = point.clone().applyMatrix4(inverseBinds[joint]);
            local.x *= radial; local.z *= radial;
            result.addScaledVector(local.applyMatrix4(binds[joint]), weight);
        }
        positions.push(...result.toArray());
        // Integrated cloth surface avoids a second pair of trousers clipping through the body.
        const clothed = !spec.stoneSurface && point.y > .73 && point.y < 1.005;
        const scarred = spec.scars?.some(scar => {
            const delta = point.clone().sub(new Vector3(...scar.centre));
            return delta.length() < scar.radius && Math.abs(delta.dot(new Vector3(...scar.normal).normalize())) < scar.halfWidth;
        });
        const grain = spec.stoneSurface ? .86 + .14 * Math.sin(point.x * 173 + point.y * 127 + point.z * 199) : 1;
        colours.push(...(clothed ? [.045, .038, .032] : scarred ? spec.scarColour : flesh.map(c => c * grain)));
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setIndex(read(primitive.indices)); geometry.computeVertexNormals();
    a.POSITION = append(positions, 'VEC3');
    a.NORMAL = append(Array.from(geometry.attributes.normal.array), 'VEC3');
    a.COLOR_0 = append(colours, 'VEC3'); delete a.COLOR_1;
    const material = data.materials[primitive.material];
    delete material.pbrMetallicRoughness.baseColorTexture;
    material.pbrMetallicRoughness.baseColorFactor = [1, 1, 1, 1];
    material.pbrMetallicRoughness.roughnessFactor = .92;
    material.name = `${id} corpse skin and integrated cloth`;
    if (spec.stoneSurface) {
        material.name = 'Granite body';
        delete material.normalTexture;
        delete material.pbrMetallicRoughness.metallicRoughnessTexture;
        const brows = data.nodes.find(node => node.name === 'Eyebrows');
        if (brows) { delete brows.mesh; }
    }
    const clawMaterial = data.materials.push({ name: spec.stoneSurface ? 'Stone claws' : 'Dark keratin claws',
        pbrMetallicRoughness: { baseColorFactor: [...(spec.stoneSurface ? flesh : [.028, .022, .018]), 1],
            metallicFactor: 0, roughnessFactor: spec.stoneSurface ? 1 : .75 } }) - 1;
    for (const side of ['l', 'r']) {
        for (const finger of ['index', 'middle', 'ring', 'pinky', 'thumb']) {
            const parent = data.nodes.findIndex(node => node.name === `${finger}_03_${side}`);
            if (parent < 0) { throw new Error(`Missing distal finger ${finger}_${side}`); }
            const length = spec.clawLength;
            const tube = new TubeGeometry(new CatmullRomCurve3([
                new Vector3(0, .017, 0), new Vector3(0, .017 + length * .6, -.003),
                new Vector3(0, .017 + length, -.018)
            ]), 8, .0045, 6, false).toNonIndexed();
            tube.scale(spec.clawWidth, 1, spec.clawDepth);
            const mesh = data.meshes.push({ name: `${finger} claw ${side}`, primitives: [{ material: clawMaterial,
                attributes: { POSITION: append(Array.from(tube.attributes.position.array), 'VEC3'),
                    NORMAL: append(Array.from(tube.attributes.normal.array), 'VEC3') } }] }) - 1;
            const node = data.nodes.push({ name: `Claw_${finger}_${side}`, mesh }) - 1;
            (data.nodes[parent].children ||= []).push(node);
        }
    }
    if (spec.armLength !== 1) {
        for (const [index, node] of data.nodes.entries()) {
            if (!/^(lowerarm|hand)_[lr]$/.test(node.name)) { continue; }
            node.translation = node.translation.map(value => value * spec.armLength);
            for (const animation of data.animations) {
                for (const channel of animation.channels) {
                    if (channel.target.node !== index || channel.target.path !== 'translation') { continue; }
                    const sampler = animation.samplers[channel.sampler];
                    sampler.output = append(read(sampler.output).map(value => value * spec.armLength), 'VEC3');
                }
            }
        }
    }
    // Aim the crouched head along the ground plane using the actual animated parent frame.
    // A fixed local Euler correction would twist the neck as the crouch turns.
    globalThis.ProgressEvent ??= class ProgressEvent {};
    const loader = new GLTFLoader().register(() => ({ name: 'authoring-textures',
        loadTexture: () => Promise.resolve(new Texture()) }));
    const model = await loader.parseAsync(JSON.stringify(data), '');
    model.scene.updateMatrixWorld(true);
    const head = model.scene.getObjectByName('Head'), headIndex = data.nodes.findIndex(node => node.name === 'Head');
    const localForward = new Vector3(0, 0, 1).applyQuaternion(head.getWorldQuaternion(new Quaternion()).invert());
    const mixer = new AnimationMixer(model.scene);
    for (const animation of data.animations.filter(clip => clip.name.startsWith('Crouch_'))) {
        mixer.stopAllAction();
        const clip = model.animations.find(clip => clip.name === animation.name);
        mixer.clipAction(clip).play();
        const channel = animation.channels.find(track => track.target.node === headIndex && track.target.path === 'rotation');
        if (!channel) { throw new Error('Crouch is missing its head rotation'); }
        const sampler = animation.samplers[channel.sampler], times = read(sampler.input), rotations = [];
        for (const time of times) {
            mixer.setTime(Math.min(time, clip.duration - .000001)); model.scene.updateMatrixWorld(true);
            const world = head.getWorldQuaternion(new Quaternion());
            const forward = localForward.clone().applyQuaternion(world).normalize();
            const level = new Vector3(forward.x, -.08, forward.z).normalize();
            const correction = new Quaternion().setFromUnitVectors(forward, level);
            const parentInverse = head.parent.getWorldQuaternion(new Quaternion()).invert();
            rotations.push(...parentInverse.multiply(correction.multiply(world)).normalize().toArray());
        }
        sampler.output = append(rotations, 'VEC4');
    }
    const actor = await loader.parseAsync(JSON.stringify(data), '');
    actor.scene.updateMatrixWorld(true);
    const mouth = actor.scene.getObjectByName('Head').worldToLocal(new Vector3(0, 1.655, .103));
    const contactIndex = data.nodes.push({ name: 'BiteContact', translation: mouth.toArray() }) - 1;
    (data.nodes[headIndex].children ||= []).push(contactIndex);
    const actorMixer = new AnimationMixer(actor.scene);
    const idle = actorMixer.clipAction(actor.animations.find(clip => clip.name === 'Crouch_Idle_Loop')).play();
    actorMixer.setTime(0); actor.scene.updateMatrixWorld(true);
    if (spec.foldedWings) {
        addStoneWings(data, { append, colour: flesh,
            parentInverse: actor.scene.getObjectByName('spine_03').matrixWorld.clone().invert() });
    }
    const bones = skin.joints.map(index => ({ index, object: actor.scene.getObjectByName(data.nodes[index].name) }));
    const rest = bones.map(({ object }) => ({ position: object.position.clone(), rotation: object.quaternion.clone() }));
    idle.stop();
    function restorePose() {
        bones.forEach(({ object }, i) => { object.position.copy(rest[i].position); object.quaternion.copy(rest[i].rotation); });
        actor.scene.updateMatrixWorld(true);
    }
    function rotateWorld(bone, correction) {
        const world = bone.getWorldQuaternion(new Quaternion());
        const parentInverse = bone.parent.getWorldQuaternion(new Quaternion()).invert();
        bone.quaternion.copy(parentInverse.multiply(correction).multiply(world));
        actor.scene.updateMatrixWorld(true);
    }
    function pointBone(bone, child, target) {
        const origin = bone.getWorldPosition(new Vector3());
        const current = child.getWorldPosition(new Vector3()).sub(origin).normalize();
        rotateWorld(bone, new Quaternion().setFromUnitVectors(current, target.clone().sub(origin).normalize()));
    }
    const upper = actor.scene.getObjectByName('upperarm_r'), lower = actor.scene.getObjectByName('lowerarm_r');
    const hand = actor.scene.getObjectByName('hand_r');
    restorePose();
    const idleWrist = hand.getWorldPosition(new Vector3());
    // Two-bone authoring IK keeps elbow/wrist connected while the open hand rakes forward.
    function reach(target, amount) {
        const shoulder = upper.getWorldPosition(new Vector3());
        const upperLength = shoulder.distanceTo(lower.getWorldPosition(new Vector3()));
        const lowerLength = lower.getWorldPosition(new Vector3()).distanceTo(hand.getWorldPosition(new Vector3()));
        const direction = target.clone().sub(shoulder).normalize();
        const distance = Math.min(upperLength + lowerLength - .004,
            Math.max(Math.abs(upperLength - lowerLength) + .004, shoulder.distanceTo(target)));
        const along = (upperLength ** 2 - lowerLength ** 2 + distance ** 2) / (2 * distance);
        const bend = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
        const pole = lower.getWorldPosition(new Vector3()).sub(shoulder).normalize().lerp(new Vector3(-1, -.25, 0), amount);
        pole.addScaledVector(direction, -pole.dot(direction)).normalize();
        const elbow = shoulder.clone().addScaledVector(direction, along).addScaledVector(pole, bend);
        pointBone(upper, lower, elbow);
        pointBone(lower, hand, shoulder.clone().addScaledVector(direction, distance));
        const fingerDirection = new Vector3(0, 1, 0).applyQuaternion(hand.getWorldQuaternion(new Quaternion()));
        const handCorrection = new Quaternion().setFromUnitVectors(fingerDirection, new Vector3(.05, -.25, 1).normalize());
        rotateWorld(hand, new Quaternion().slerp(handCorrection, amount));
    }
    for (const name of ['Corpse_Bite', 'Corpse_Claw', 'Corpse_Hit']) {
        const duration = name === 'Corpse_Hit' ? .32 : name === 'Corpse_Bite' ? .8 : .9, frames = 49;
        const times = Array.from({ length: frames }, (_, i) => i / (frames - 1) * duration);
        const outputs = bones.map(() => ({ rotation: [], translation: [] }));
        for (let frame = 0; frame < frames; frame++) {
            restorePose();
            const t = frame / (frames - 1), strikeAt = .45;
            const phase = t < strikeAt ? t / strikeAt : (1 - t) / (1 - strikeAt);
            const amount = phase * phase * (3 - 2 * phase);
            if (name === 'Corpse_Claw') {
                const target = idleWrist.clone().lerp(new Vector3(.04, .91, .30), amount);
                if (amount > .0001) { reach(target, amount); }
            } else if (name === 'Corpse_Hit') {
                rotateWorld(actor.scene.getObjectByName('spine_02'),
                    new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -amount * .09));
                rotateWorld(actor.scene.getObjectByName('Head'),
                    new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -amount * .1));
            } else {
                const spine = actor.scene.getObjectByName('spine_02');
                const biteLean = spec.biteLean ?? .18;
                rotateWorld(spine, new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), amount * biteLean));
                const neck = actor.scene.getObjectByName('neck_01');
                const delta = new Vector3(0, .008, .032).applyQuaternion(neck.parent.getWorldQuaternion(new Quaternion()).invert());
                neck.position.addScaledVector(delta, amount);
                actor.scene.updateMatrixWorld(true);
                const skull = actor.scene.getObjectByName('Head');
                rotateWorld(skull, new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -amount * (biteLean + .06)));
            }
            bones.forEach(({ object }, i) => {
                outputs[i].rotation.push(...object.quaternion.toArray());
                outputs[i].translation.push(...object.position.toArray());
            });
        }
        const animation = { name, samplers: [], channels: [] }, input = append(times, 'SCALAR');
        bones.forEach(({ index }, i) => {
            for (const path of ['rotation', 'translation']) {
                const sampler = animation.samplers.push({ input, output: append(outputs[i][path], path === 'rotation' ? 'VEC4' : 'VEC3'),
                    interpolation: 'LINEAR' }) - 1;
                animation.channels.push({ sampler, target: { node: index, path } });
            }
        });
        data.animations.push(animation);
    }
    // The library death starts standing. Collapse from our actual crouch instead of standing up first.
    actorMixer.stopAllAction();
    const sourceDeath = actor.animations.find(clip => clip.name === 'Death01');
    actorMixer.clipAction(sourceDeath).setLoop(LoopOnce, 1).play().clampWhenFinished = true;
    actorMixer.setTime(sourceDeath.duration); actor.scene.updateMatrixWorld(true);
    const defeated = bones.map(({ object }) => ({ position: object.position.clone(), rotation: object.quaternion.clone() }));
    const death = { name: 'Corpse_Death', samplers: [], channels: [] };
    const deathTimes = Array.from({ length: 61 }, (_, i) => i / 60);
    const deathInput = append(deathTimes, 'SCALAR');
    bones.forEach(({ index }, i) => {
        const rotations = [], translations = [];
        for (const t of deathTimes) {
            const primary = ['root', 'pelvis'].includes(data.nodes[index].name);
            const phase = primary ? Math.min(1, t / .55) : Math.max(0, (t - .35) / .65);
            const amount = phase * phase * (3 - 2 * phase);
            rotations.push(...rest[i].rotation.clone().slerp(defeated[i].rotation, amount).toArray());
            translations.push(...rest[i].position.clone().lerp(defeated[i].position, amount).toArray());
        }
        for (const [path, values] of [['rotation', rotations], ['translation', translations]]) {
            const sampler = death.samplers.push({ input: deathInput, output: append(values, path === 'rotation' ? 'VEC4' : 'VEC3'),
                interpolation: 'LINEAR' }) - 1;
            death.channels.push({ sampler, target: { node: index, path } });
        }
    });
    data.animations.push(death);
    if (spec.stillIdle) {
        const idleClip = data.animations.find(clip => clip.name === 'Crouch_Idle_Loop');
        for (const sampler of idleClip.samplers) {
            const accessor = data.accessors[sampler.output];
            const width = { VEC3: 3, VEC4: 4 }[accessor.type];
            if (!width) { throw new Error('Unsupported still-idle track'); }
            const first = read(sampler.output).slice(0, width);
            sampler.output = append(Array.from({ length: accessor.count }, () => first).flat(), accessor.type);
        }
    }
    const grounded = await loader.parseAsync(JSON.stringify(data), '');
    const groundMixer = new AnimationMixer(grounded.scene);
    const scene = data.scenes[data.scene || 0], groundNode = data.nodes.length;
    data.nodes.push({ name: 'CorpseGround', translation: [0, 0, .25 * spec.scale[2]], scale: spec.scale,
        children: [...scene.nodes] });
    scene.nodes = [groundNode];
    for (const animation of data.animations) {
        groundMixer.stopAllAction();
        const clip = grounded.animations.find(candidate => candidate.name === animation.name);
        const action = groundMixer.clipAction(clip).setLoop(LoopOnce, 1).play();
        action.clampWhenFinished = true;
        const steps = Math.ceil(clip.duration * 60), times = [], translations = [];
        for (let frame = 0; frame <= steps; frame++) {
            const time = frame / steps * clip.duration;
            groundMixer.setTime(time); grounded.scene.updateMatrixWorld(true);
            times.push(time);
            translations.push(0, .006 - new Box3().setFromObject(grounded.scene, true).min.y * spec.scale[1], .25 * spec.scale[2]);
        }
        const sampler = animation.samplers.push({ input: append(times, 'SCALAR'), output: append(translations, 'VEC3'),
            interpolation: 'LINEAR' }) - 1;
        animation.channels.push({ sampler, target: { node: groundNode, path: 'translation' } });
    }
    fs.writeFileSync(`tools/combat-art/${id}-anatomical-candidate.gltf`, JSON.stringify(data));
}
