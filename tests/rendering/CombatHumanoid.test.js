import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { CombatArtAssets, attachCharacterArt, mountCharacterWeapon, mountCharacterOffHand,
    poseCharacterArt } from '../../src/rendering/CombatArtAssets.js';

function humanoid() {
    const model = new THREE.Group();
    const joints = {};
    for (const name of ['spine', 'head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg',
        'leftHand', 'rightHand', 'leftCoat', 'rightCoat']) {
        const bone = new THREE.Bone();
        bone.name = name;
        bone.rotation.set(0.12, 0.08, -0.04);
        model.add(bone);
        joints[name] = name;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 1, 0], 3));
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute([0, 0, 0, 0], 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0], 4));
    const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = 'skin';
    model.add(mesh);
    model.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton([model.getObjectByName('leftArm')]));
    const assets = new CombatArtAssets({ models: { humanoid: {
        joints, weaponOffset: [0, 0, 0], idle: {
            periodSeconds: 4.8, spineRadians: 0.012, headRadians: 0.007, armRadians: 0.01
        }
    } } });
    assets.templates.set('humanoid', model);
    const actor = id => {
        const result = { combatant: { id }, appearance: { asset: 'humanoid' },
            body: new THREE.Group(), weapon: new THREE.Group(), legacyParts: new THREE.Group() };
        attachCharacterArt(result, assets);
        return result;
    };
    return { assets, model, a: actor('a'), b: actor('b') };
}

function pose(actor, overrides = {}) {
    poseCharacterArt(actor, { now: 1000, moving: false, animated: true, strike: { weapon: 0 }, ...overrides });
    actor.body.updateMatrixWorld(true);
}

describe('Reusable humanoid presentation', () => {
    it('casts from the floor with either free hand while the torso and legs remain prone', async () => {
        const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url), 'utf8'));
        const spec = config.artAssets.models.traveller;
        const source = readFileSync(new URL(`../../${spec.url}`, import.meta.url));
        const loader = new GLTFLoader().register(() => ({ name: 'test-texture-decoder',
            loadTexture: () => Promise.resolve(new THREE.Texture()) }));
        const gltf = await loader.parseAsync(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength), '');
        const assets = new CombatArtAssets(config.artAssets);
        assets.templates.set('traveller', gltf.scene);
        assets.animations.set('traveller', gltf.animations);
        for (const weaponModel of ['bow', 'sidearm']) {
            const actor = { combatant: { id: weaponModel, hp: 10 }, appearance: { asset: 'traveller' },
                body: new THREE.Group(), weapon: new THREE.Group(), legacyParts: new THREE.Group(), weaponModel };
            attachCharacterArt(actor, assets);
            const animator = actor.art.animator;
            animator.setCondition('prone');
            pose(actor);
            const fixed = ['spine', 'leftAnkle', 'rightAnkle'].map(key => ({
                joint: actor.art.joints[key], position: actor.art.joints[key].getWorldPosition(new THREE.Vector3())
            }));
            const free = actor.art.joints[weaponModel === 'bow' ? 'rightHand' : 'leftHand'];
            const initialHeight = free.getWorldPosition(new THREE.Vector3()).y;
            for (const action of ['spell', 'healing']) {
                animator.playAction(action);
                expect(animator.current.getClip().name).toBe(weaponModel === 'bow' ?
                    'Ground_Spell_Simple_Shoot_Right' : 'Ground_Spell_Simple_Shoot');
                let highestHand = initialHeight;
                for (let frame = 0; frame < 40; frame++) {
                    animator.update(1 / 30);
                    pose(actor);
                    highestHand = Math.max(highestHand, free.getWorldPosition(new THREE.Vector3()).y);
                    for (const { joint, position } of fixed) {
                        expect(joint.getWorldPosition(new THREE.Vector3()).distanceTo(position)).toBeLessThan(0.0001);
                    }
                }
                expect(highestHand - initialHeight).toBeGreaterThan(0.15);
                expect(animator.condition).toBe('prone');
                expect(animator.current.getClip().name).toBe('Ground_Idle');
            }
            animator.dispose();
        }
        assets.dispose();
    });

    it('lets held firearms follow falling hands and restores aiming after recovery', async () => {
        const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url), 'utf8'));
        const spec = config.artAssets.models.traveller;
        const source = readFileSync(new URL(`../../${spec.url}`, import.meta.url));
        const loader = new GLTFLoader().register(() => ({ name: 'test-texture-decoder',
            loadTexture: () => Promise.resolve(new THREE.Texture()) }));
        const gltf = await loader.parseAsync(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength), '');
        const assets = new CombatArtAssets(config.artAssets);
        assets.templates.set('traveller', gltf.scene);
        assets.animations.set('traveller', gltf.animations);
        const actor = { combatant: { id: 'gunner', hp: 10 }, appearance: { asset: 'traveller' },
            body: new THREE.Group(), weapon: new THREE.Group(), legacyParts: new THREE.Group(),
            weaponModel: 'sidearm', offHandModel: 'sidearm', offHand: new THREE.Group() };
        attachCharacterArt(actor, assets);
        mountCharacterOffHand(actor, config);
        const animator = actor.art.animator;
        actor.body.rotation.y = 1.2;
        for (const state of ['ready', 'prone', 'recovered', 'dead', 'revived']) {
            actor.combatant.hp = state === 'dead' ? 0 : 10;
            animator.setCondition(state === 'prone' ? 'prone' : null);
            if (state === 'dead') {
                animator.playAction('death');
            }
            if (state === 'revived') {
                animator.resume();
            }
            for (let frame = 0; frame < 60; frame++) {
                animator.update(1 / 30, { idle: 'sidearm' });
                pose(actor);
                for (const [prop, grip, side] of [[actor.weapon, actor.art.grip, 'right'],
                    [actor.offHand, actor.offHand, 'left']]) {
                    const hand = actor.art.joints[`${side}Hand`];
                    const anchor = prop.localToWorld(new THREE.Vector3(...spec.weaponMounts.sidearm.anchor));
                    expect(anchor.distanceTo(hand.getWorldPosition(new THREE.Vector3()))).toBeLessThan(0.0001);
                    if (state === 'dead' || animator.presentation?.spec.preservePose) {
                        expect(grip.quaternion.angleTo(actor.art.gripBind[side])).toBeLessThan(0.0001);
                    } else {
                        expect(prop.getWorldQuaternion(new THREE.Quaternion()).angleTo(
                            actor.body.getWorldQuaternion(new THREE.Quaternion()))).toBeLessThan(0.0001);
                    }
                }
            }
            if (state === 'recovered') {
                expect(animator.isBusy()).toBe(false);
                expect(animator.condition).toBeNull();
            }
        }
        animator.dispose();
        assets.dispose();
    });
    it('keeps both real-rig grips attached throughout mirrored off-hand attacks and recovery', async () => {
        const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url), 'utf8'));
        const spec = config.artAssets.models.traveller;
        const source = readFileSync(new URL(`../../${spec.url}`, import.meta.url));
        const loader = new GLTFLoader().register(() => ({ name: 'test-texture-decoder',
            loadTexture: () => Promise.resolve(new THREE.Texture()) }));
        const gltf = await loader.parseAsync(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength), '');
        const assets = new CombatArtAssets(config.artAssets);
        assets.templates.set('traveller', gltf.scene);
        assets.animations.set('traveller', gltf.animations);
        for (const [model, action] of [['dagger', 'meleeStab1h'], ['sword', 'meleeSlice1h'],
            ['axe', 'meleeChop1h'], ['sidearm', 'sidearm']]) {
            const actor = { combatant: { id: model, hp: 10 }, appearance: { asset: 'traveller' },
                body: new THREE.Group(), weapon: new THREE.Group(), legacyParts: new THREE.Group(),
                weaponModel: 'sword', offHandModel: model, offHand: new THREE.Group() };
            attachCharacterArt(actor, assets);
            mountCharacterOffHand(actor, config);
            actor.body.rotation.y = 1.2;
            actor.art.animator.update(0, { attackHand: 'left' });
            actor.art.animator.playAction(action);
            expect(actor.art.animator.current.getClip().name).toBe(spec.motion.actions[action].handClips.left);
            for (let frame = 0; frame < 40; frame++) {
                actor.art.animator.update(1 / 30);
                pose(actor);
                for (const [prop, side, mount] of [[actor.weapon, 'right', spec.weaponMounts.sword],
                    [actor.offHand, 'left', spec.weaponMounts[model]]]) {
                    const anchor = prop.localToWorld(new THREE.Vector3(...mount.anchor));
                    expect(anchor.distanceTo(actor.art.joints[`${side}Hand`].getWorldPosition(new THREE.Vector3())))
                        .toBeLessThan(0.0001);
                }
                if (model === 'sidearm') {
                    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(actor.offHand.getWorldQuaternion(new THREE.Quaternion()));
                    const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(actor.body.getWorldQuaternion(new THREE.Quaternion()));
                    expect(forward.angleTo(facing)).toBeLessThan(0.0001);
                }
            }
            expect(actor.art.animator.isBusy()).toBe(false);
            actor.art.animator.dispose();
        }
        assets.dispose();
    });
    it('casts from the free hand while retaining a left-held bow, including after equipment changes', async () => {
        const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url), 'utf8'));
        const spec = config.artAssets.models.traveller;
        const source = readFileSync(new URL(`../../${spec.url}`, import.meta.url));
        const loader = new GLTFLoader().register(() => ({ name: 'test-texture-decoder',
            loadTexture: () => Promise.resolve(new THREE.Texture()) }));
        const gltf = await loader.parseAsync(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength), '');
        const assets = new CombatArtAssets(config.artAssets);
        assets.templates.set('traveller', gltf.scene);
        assets.animations.set('traveller', gltf.animations);
        const actor = { combatant: { id: 'caster', hp: 10 }, appearance: { asset: 'traveller' },
            body: new THREE.Group(), weapon: new THREE.Group(), legacyParts: new THREE.Group(), weaponModel: 'bow' };
        attachCharacterArt(actor, assets);
        actor.body.rotation.y = 0.9;
        for (const weaponModel of ['bow', 'carbine', 'bow']) {
            actor.weaponModel = weaponModel;
            mountCharacterWeapon(actor);
            const mount = spec.weaponMounts[weaponModel];
            const holding = actor.art.joints[`${mount.hand}Hand`];
            const free = actor.art.joints[mount.hand === 'left' ? 'rightHand' : 'leftHand'];
            for (const action of ['spell', 'healing']) {
                actor.art.animator.playAction(action);
                actor.art.animator.update(0.4);
                pose(actor);
                expect(actor.castOrigin).toBe(free);
                const anchor = actor.weapon.localToWorld(new THREE.Vector3(...mount.anchor));
                expect(anchor.distanceTo(holding.getWorldPosition(new THREE.Vector3()))).toBeLessThan(0.0001);
                const cast = actor.body.worldToLocal(free.getWorldPosition(new THREE.Vector3()));
                const hold = actor.body.worldToLocal(holding.getWorldPosition(new THREE.Vector3()));
                expect(cast.z - hold.z).toBeGreaterThan(0.3);
                expect(actor.art.animator.current.getClip().name).toBe(mount.hand === 'left' ?
                    'Spell_Simple_Shoot_Right' : 'Spell_Simple_Shoot');
                actor.art.animator.finishPresentation();
            }
        }
        actor.art.animator.dispose();
        assets.dispose();
    });

    it('keeps real-rig grips within reach and equipment changes independent of the equip pose', async () => {
        const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url), 'utf8'));
        const spec = config.artAssets.models.traveller;
        const source = readFileSync(new URL(`../../${spec.url}`, import.meta.url));
        const loader = new GLTFLoader().register(() => ({ name: 'test-texture-decoder',
            loadTexture: () => Promise.resolve(new THREE.Texture()) }));
        const gltf = await loader.parseAsync(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength), '');
        const assets = new CombatArtAssets(config.artAssets);
        assets.templates.set('traveller', gltf.scene);
        assets.animations.set('traveller', gltf.animations);
        for (const mountKey of ['carbine', 'rifle', 'sidearm', 'blowgun', 'sword2h', 'axe2h', 'staff2h']) {
            const mount = spec.weaponMounts[mountKey];
            const weaponModel = mount.model || mountKey;
            const actor = { combatant: { id: mountKey, hp: 10, weaponMount: mountKey }, appearance: { asset: 'traveller' },
                body: new THREE.Group(), weapon: new THREE.Group(), legacyParts: new THREE.Group(), weaponModel };
            attachCharacterArt(actor, assets);
            actor.body.rotation.y = 1.2;
            actor.art.animator.update(0.5, { idle: mountKey });
            pose(actor);
            expect(actor.art.animator.current.getClip().name).toBe(spec.motion.idles[mountKey].clip);
            const motion = { sword2h: 'meleeSlice2h', axe2h: 'meleeChop2h', staff2h: 'meleeStab2h', sidearm: 'sidearm' };
            actor.art.animator.playAction(motion[mountKey] || 'longarm');
            for (let frame = 0; frame < 35; frame++) {
                actor.art.animator.update(1 / 30, { idle: mountKey });
                pose(actor);
                const anchor = actor.weapon.localToWorld(new THREE.Vector3(...mount.anchor));
                expect(anchor.distanceTo(actor.art.joints.rightHand.getWorldPosition(new THREE.Vector3())))
                    .toBeLessThan(0.0001);
                if (mount.supportPoint) {
                    const support = actor.weapon.localToWorld(new THREE.Vector3(...mount.supportPoint));
                    expect(support.distanceTo(actor.art.joints.leftHand.getWorldPosition(new THREE.Vector3())))
                        .toBeLessThan(0.015);
                }
                expect(actor.art.rest.head.angleTo(actor.art.joints.head.quaternion)).toBeLessThan(Math.PI / 3 + 0.0001);
            }
            delete actor.combatant.weaponMount;
            actor.weaponModel = 'sword';
            mountCharacterWeapon(actor);
            const equipped = actor.art.grip.quaternion.clone();
            actor.weaponModel = 'carbine';
            mountCharacterWeapon(actor);
            actor.art.animator.update(0.4);
            actor.weaponModel = 'sword';
            mountCharacterWeapon(actor);
            expect(actor.art.grip.quaternion.angleTo(equipped)).toBeLessThan(0.0001);
            actor.art.animator.playAction('meleeSlice1h');
            actor.art.animator.update(0.4 / spec.motion.actions.meleeSlice1h.timeScale);
            pose(actor);
            const blade = new THREE.Vector3(0, 1, 0).applyQuaternion(actor.weapon.getWorldQuaternion(new THREE.Quaternion()));
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(actor.body.quaternion);
            expect(blade.dot(forward)).toBeGreaterThan(0.8);
            const face = new THREE.Vector3(0, -1, 0)
                .applyQuaternion(actor.art.joints.head.getWorldQuaternion(new THREE.Quaternion()));
            expect(face.dot(forward)).toBeGreaterThan(0.99);
            actor.weaponModel = weaponModel;
            actor.combatant.weaponMount = mountKey;
            mountCharacterWeapon(actor);
            actor.art.animator.finishPresentation();
            for (const action of ['spell', 'healing']) {
                actor.art.animator.playAction(action);
                actor.art.animator.update(0.3);
                actor.body.updateMatrixWorld(true);
                const castingHand = actor.art.joints.leftHand.getWorldPosition(new THREE.Vector3());
                pose(actor);
                expect(actor.art.joints.leftHand.getWorldPosition(new THREE.Vector3()).distanceTo(castingHand))
                    .toBeLessThan(0.0001);
                const anchor = actor.weapon.localToWorld(new THREE.Vector3(...mount.anchor));
                expect(anchor.distanceTo(actor.art.joints.rightHand.getWorldPosition(new THREE.Vector3())))
                    .toBeLessThan(0.0001);
                actor.art.animator.finishPresentation();
                actor.art.animator.update(0.2);
                pose(actor);
                if (mount.supportPoint) {
                    const support = actor.weapon.localToWorld(new THREE.Vector3(...mount.supportPoint));
                    expect(support.distanceTo(actor.art.joints.leftHand.getWorldPosition(new THREE.Vector3())))
                        .toBeLessThan(0.015);
                }
            }
            actor.combatant.conditions = [{ type: 'disarmed' }];
            actor.art.animator.update(0.5, { idle: 'unarmed' });
            actor.body.updateMatrixWorld(true);
            const hands = ['leftHand', 'rightHand'].map(key =>
                actor.art.joints[key].getWorldPosition(new THREE.Vector3()));
            pose(actor);
            for (const [index, key] of ['leftHand', 'rightHand'].entries()) {
                expect(actor.art.joints[key].getWorldPosition(new THREE.Vector3()).distanceTo(hands[index]))
                    .toBeLessThan(0.0001);
            }
            actor.art.animator.dispose();
        }
        assets.dispose();
    });

    it('drives independently cloned live rigs with the authored clip library', async () => {
        const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url), 'utf8'));
        const source = readFileSync(new URL(`../../${config.artAssets.models.traveller.url}`, import.meta.url));
        const loader = new GLTFLoader().register(() => ({ name: 'test-texture-decoder',
            loadTexture: () => Promise.resolve(new THREE.Texture()) }));
        const gltf = await loader.parseAsync(source.buffer.slice(source.byteOffset,
            source.byteOffset + source.byteLength), '');
        const assets = new CombatArtAssets(config.artAssets);
        assets.templates.set('traveller', gltf.scene);
        assets.animations.set('traveller', gltf.animations);
        const makeActor = id => {
            const actor = { combatant: { id, hp: 10, weaponAction: 'melee' },
                appearance: { asset: 'traveller' }, body: new THREE.Group(),
                weapon: new THREE.Group(), legacyParts: new THREE.Group() };
            attachCharacterArt(actor, assets);
            return actor;
        };
        const first = makeActor('first');
        const second = makeActor('second');
        expect(first.art.animator.current.getClip().name).toBe('Sword_Idle');
        // A ready stance keeps the chest over/forward of the hips. Pelvis-only
        // retargeting previously leaned the entire torso away from the enemy.
        for (let sample = 0; sample < 20; sample++) {
            first.art.animator.update(0.1);
            pose(first);
            const torsoUp = new THREE.Vector3(0, 0, 1)
                .applyQuaternion(first.art.joints.spine.getWorldQuaternion(new THREE.Quaternion()));
            expect(torsoUp.z).toBeGreaterThan(0.05);
            expect(torsoUp.y).toBeGreaterThan(0.95);
            const pelvisUp = new THREE.Vector3(0, 0, 1).applyQuaternion(
                first.art.model.getObjectByName('Traveller').getWorldQuaternion(new THREE.Quaternion()));
            expect(pelvisUp.z).toBeGreaterThan(-0.1);
        }
        const secondHand = second.art.joints.rightHand.quaternion.clone();
        expect(first.art.animator.playAction('melee')).toBe(true);
        first.art.animator.update(0.2);
        expect(first.art.animator.current.getClip().name).toBe('Sword_Attack');
        expect(second.art.joints.rightHand.quaternion.angleTo(secondHand)).toBeCloseTo(0);
        first.art.animator.dispose();
        second.art.animator.dispose();
        assets.dispose();
    });

    it('loads the authored traveller and poses independently bound skinned instances', async () => {
        const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url), 'utf8'));
        const source = readFileSync(new URL(`../../${config.artAssets.models.traveller.url}`, import.meta.url));
        // Node has no browser image decoder; retain real geometry, skin, and scene loading.
        const loader = new GLTFLoader().register(() => ({ name: 'test-texture-decoder',
            loadTexture: () => Promise.resolve(new THREE.Texture()) }));
        const gltf = await loader.parseAsync(source.buffer.slice(source.byteOffset,
            source.byteOffset + source.byteLength), '');
        const assets = new CombatArtAssets(config.artAssets);
        assets.templates.set('traveller', gltf.scene);
        const actors = ['first', 'second'].map(id => {
            const actor = { combatant: { id, hp: 10, weaponAction: 'firearm' }, appearance: { asset: 'traveller' },
                body: new THREE.Group(), weapon: new THREE.Group(), legacyParts: new THREE.Group() };
            attachCharacterArt(actor, assets);
            return actor;
        });
        const [a, b] = actors;
        expect(a.art.joints.spine.isBone).toBe(true);
        const skins = [];
        a.art.model.traverse(node => {
            if (node.isSkinnedMesh) {
                skins.push(node);
            }
        });
        expect(skins.length).toBeGreaterThan(0);
        const before = skins.map(mesh => mesh.getVertexPosition(0, new THREE.Vector3()));
        pose(a, { moving: true });
        expect(skins.some((mesh, index) => mesh.getVertexPosition(0, new THREE.Vector3())
            .distanceTo(before[index]) > 0.001)).toBe(true);
        expect(b.art.joints.leftLeg.quaternion.angleTo(b.art.rest.leftLeg)).toBeCloseTo(0);
        pose(a, { moving: false });
        expect(a.art.joints.leftKnee.quaternion.angleTo(a.art.rest.leftKnee)).toBeGreaterThan(0.1);
        const guard = a.art.joints.leftKnee.quaternion.clone();
        pose(a, { animated: false });
        expect(a.art.joints.spine.scale.distanceTo(a.art.restScale.spine)).toBe(0);
        expect(a.art.joints.leftKnee.quaternion.angleTo(guard)).toBeCloseTo(0);
        const stance = config.artAssets.models.traveller.stances.firearm;
        for (const side of ['left', 'right']) {
            expect(a.art.joints[`${side}Ankle`].getWorldPosition(new THREE.Vector3())
                .distanceTo(new THREE.Vector3(...stance.feet[side]))).toBeLessThan(0.0001);
            expect(a.art.joints[`${side}Hand`].getWorldPosition(new THREE.Vector3())
                .distanceTo(new THREE.Vector3(...stance.hands[side]))).toBeLessThan(0.0001);
        }
        for (const skin of skins) {
            expect(skin.skeleton.bones.every(bone =>
                bone && bone !== gltf.scene.getObjectByName(bone.name))).toBe(true);
        }
        assets.dispose();
    });

    it('deforms each clone independently while sharing mesh resources', () => {
        const { assets, model, a, b } = humanoid();
        const original = model.getObjectByName('skin');
        const first = a.art.model.getObjectByName('skin');
        const second = b.art.model.getObjectByName('skin');
        expect(first.geometry).toBe(original.geometry);
        expect(first.material).toBe(original.material);
        expect(first.skeleton).not.toBe(second.skeleton);
        expect(first.skeleton.bones[0]).toBe(a.art.joints.leftArm);
        const before = second.applyBoneTransform(0, new THREE.Vector3(0, 1, 0));
        a.art.joints.leftArm.rotation.x += 0.8;
        a.body.updateMatrixWorld(true);
        expect(first.applyBoneTransform(0, new THREE.Vector3(0, 1, 0)).distanceTo(before)).toBeGreaterThan(0.1);
        expect(second.applyBoneTransform(0, new THREE.Vector3(0, 1, 0)).distanceTo(before)).toBe(0);
        const release = vi.spyOn(first.skeleton, 'dispose');
        assets.dispose();
        expect(release).toHaveBeenCalledOnce();
    });

    it('keeps unconfigured rigs still instead of manufacturing rocking or scale breathing', () => {
        const { a } = humanoid();
        const feet = a.art.joints.leftLeg.getWorldPosition(new THREE.Vector3());
        pose(a);
        expect(a.art.joints.spine.quaternion.angleTo(a.art.rest.spine)).toBeCloseTo(0);
        expect(a.art.joints.leftLeg.quaternion.angleTo(a.art.rest.leftLeg)).toBeCloseTo(0);
        expect(a.art.joints.leftLeg.getWorldPosition(new THREE.Vector3()).distanceTo(feet)).toBe(0);
        expect(a.body.position.length()).toBe(0);
        const first = a.art.joints.spine.quaternion.clone();
        pose(a);
        expect(a.art.joints.spine.quaternion.angleTo(first)).toBeCloseTo(0);
        expect(a.art.joints.spine.scale.distanceTo(a.art.restScale.spine)).toBe(0);
    });

    it('restores authored bone orientations for reduced motion and suppresses idle during actions', () => {
        const { a } = humanoid();
        pose(a, { moving: true });
        expect(a.art.joints.leftLeg.quaternion.angleTo(a.art.rest.leftLeg)).toBeGreaterThan(0.01);
        pose(a, { animated: false });
        for (const [key, joint] of Object.entries(a.art.joints)) {
            expect(joint.quaternion.angleTo(a.art.rest[key])).toBeCloseTo(0);
        }
        a.actionUntil = 2000;
        a.actionStarted = 500;
        a.actionProfile = { pose: 'cast', seconds: 1 };
        pose(a);
        expect(a.art.joints.spine.quaternion.angleTo(a.art.rest.spine)).toBeCloseTo(0);
        expect(a.art.joints.leftArm.quaternion.angleTo(a.art.rest.leftArm)).toBeGreaterThan(1);
        expect(a.weapon.parent.parent).toBe(a.art.joints.rightHand);
    });
});
