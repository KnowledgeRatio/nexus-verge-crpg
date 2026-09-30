import * as THREE from '../../vendor/three/three.module.min.js';
import { applyCombatMaterialPalette } from './CombatMaterialPalette.js';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { CombatAnimator } from './CombatAnimator.js';
import { RULES } from '../core/rulesEngine.js';
import { mediaAssetUrl } from '../utils/mediaAssetUrl.js';
import { createCombatSmoke } from './CombatSmoke.js';

const poseAxis = new THREE.Vector3(1, 0, 0);
const poseRotation = new THREE.Quaternion();
const headAimRotation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(
    new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0)));

function weaponMount(actor) {
    const key = actor.combatant?.weaponMount || actor.weaponMount || actor.weaponModel;
    const base = actor.art.weaponMounts?.[key] || actor.art.weaponMounts?.[actor.weaponModel];
    const animator = actor.art.animator;
    const override = animator?.profile?.conditions?.[animator.condition]?.weaponMounts?.[key];
    return { key, spec: override ? { ...base, ...override } : base };
}

function canAimWeapon(actor) {
    return !(actor.combatant?.hp <= 0 || actor.art.animator?.condition ||
        actor.art.animator?.presentation?.spec.preservePose);
}

function canAimGroundedWeapon(actor) {
    const animator = actor.art.animator;
    return actor.combatant?.hp > 0 && animator?.profile?.conditions?.[animator.condition]?.aimWeapons === true;
}

function applyMountRotation(actor, hand, mount) {
    actor.body.updateWorldMatrix(true, true);
    actor.art.grip.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion()).invert())
        .multiply(actor.body.getWorldQuaternion(new THREE.Quaternion()));
    if (mount?.rotation) {
        actor.art.grip.quaternion.multiply(new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(...mount.rotation)));
    }
}

function alignGrip(actor) {
    const { grip, joints } = actor.art;
    const { key, spec: mount } = weaponMount(actor);
    const hand = mount?.hand === 'left' ? joints.leftHand : joints.rightHand;
    if (!hand) {
        return;
    }
    const changed = actor.art.mountedWeaponModel !== actor.weaponModel || actor.art.mountedWeaponKey !== key ||
        actor.art.mountedWeaponCondition !== actor.art.animator?.condition;
    if (grip.parent !== hand || changed) {
        grip.removeFromParent();
        hand.add(grip);
        actor.art.weaponHand = mount?.hand || 'right';
        actor.art.mountedWeaponModel = actor.weaponModel;
        actor.art.mountedWeaponKey = key;
        actor.art.mountedWeaponCondition = actor.art.animator?.condition;
        const bind = actor.art.gripBind?.[actor.art.weaponHand];
        if (bind) {
            grip.quaternion.copy(bind);
            if (mount?.rotation) {
                grip.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...mount.rotation)));
            }
        } else {
            applyMountRotation(actor, hand, mount);
        }
    }
    grip.position.set(0, 0, 0);
    if (mount?.align === 'forward') {
        if (canAimWeapon(actor) || canAimGroundedWeapon(actor)) {
            applyMountRotation(actor, hand, mount);
        } else {
            grip.quaternion.copy(actor.art.gripBind[actor.art.weaponHand]);
            if (mount.rotation) {
                grip.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...mount.rotation)));
            }
        }
    }
}

function alignSupportHand(actor) {
    const mount = weaponMount(actor).spec;
    const weight = actor.art.animator?.supportGripWeight ?? 1;
    if (!weight || !mount?.supportHand || !mount.supportPoint ||
        !(canAimWeapon(actor) || canAimGroundedWeapon(actor)) ||
        actor.combatant?.conditions?.some(condition => condition.type === 'disarmed')) {
        return;
    }
    const side = mount.supportHand;
    const upper = actor.art.joints[`${side}Arm`];
    const lower = actor.art.joints[`${side}Elbow`];
    const hand = actor.art.joints[`${side}Hand`];
    if (!upper || !lower || !hand) {
        return;
    }
    actor.body.updateWorldMatrix(true, true);
    const animatedHand = hand.getWorldPosition(new THREE.Vector3());
    const supportTarget = () => animatedHand.clone().lerp(
        actor.weapon.localToWorld(new THREE.Vector3().fromArray(mount.supportPoint)), weight);
    let target = supportTarget();
    // A rigid two-handed weapon couples both arms. Move the holding hand when
    // the support socket is unreachable, rather than leaving the support hand
    // floating at full extension. Alternate the two reach constraints.
    const primary = mount.hand || 'right';
    const primaryHand = actor.art.joints[`${primary}Hand`];
    const shoulder = upper.getWorldPosition(new THREE.Vector3());
    const elbow = lower.getWorldPosition(new THREE.Vector3());
    const reach = shoulder.distanceTo(elbow) + elbow.distanceTo(hand.getWorldPosition(new THREE.Vector3())) - 0.0001;
    for (let iteration = 0; iteration < 6; iteration++) {
        const offset = target.clone().sub(shoulder);
        if (offset.length() <= reach + 0.0001) {
            break;
        }
        const correction = offset.clone().setLength(reach).sub(offset);
        const hold = actor.body.worldToLocal(primaryHand.getWorldPosition(new THREE.Vector3()).add(correction));
        solveLimb(actor.body, actor.art.joints[`${primary}Arm`], actor.art.joints[`${primary}Elbow`],
            primaryHand, hold.toArray(), [primary === 'left' ? -1 : 1, -1, 0]);
        actor.body.updateWorldMatrix(true, true);
        target = supportTarget();
    }
    const local = actor.body.worldToLocal(target);
    solveLimb(actor.body, upper, lower, hand, local.toArray(),
        [side === 'left' ? -1 : 1, -1, 0]);
}

function alignHoldingHand(actor) {
    const mount = weaponMount(actor).spec;
    if (!mount?.hold || !canAimWeapon(actor) ||
        actor.combatant?.conditions?.some(condition => condition.type === 'disarmed')) {
        return;
    }
    const side = mount.hand || 'right';
    const { joints } = actor.art;
    actor.body.updateWorldMatrix(true, true);
    const centre = joints.leftArm.getWorldPosition(new THREE.Vector3())
        .add(joints.rightArm.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
    actor.body.worldToLocal(centre);
    const hand = joints[`${side}Hand`];
    const motion = actor.body.worldToLocal(hand.getWorldPosition(new THREE.Vector3())).sub(centre)
        .multiply(new THREE.Vector3(...mount.hold.motionScale));
    const target = centre.add(new THREE.Vector3(...mount.hold.position)).add(motion);
    solveLimb(actor.body, joints[`${side}Arm`], joints[`${side}Elbow`], hand,
        target.toArray(), [side === 'left' ? -1 : 1, -1, 0]);
}

function alignHead(actor) {
    const head = actor.art.joints.head;
    if (!actor.art.headAim || !head?.parent) {
        return;
    }
    if (actor.art.animator?.presentation?.spec.preservePose) {
        return;
    }
    if (actor.combatant?.hp <= 0 || actor.art.animator?.condition) {
        head.quaternion.copy(actor.art.rest.head);
        return;
    }
    actor.body.updateWorldMatrix(true, true);
    const desired = actor.body.getWorldQuaternion(new THREE.Quaternion()).multiply(headAimRotation);
    head.quaternion.copy(head.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired));
    const angle = actor.art.rest.head.angleTo(head.quaternion);
    if (angle > actor.art.headAimMaxRadians) {
        head.quaternion.copy(actor.art.rest.head.clone().slerp(head.quaternion, actor.art.headAimMaxRadians / angle));
    }
    actor.body.updateWorldMatrix(true, true);
}

export function mountCharacterWeapon(actor) {
    if (!actor.art?.joints.rightHand && !actor.art?.joints.leftHand) {
        return;
    }
    alignGrip(actor);
    if (actor.art.animator) {
        actor.art.animator.motion.weaponHand = actor.art.weaponHand;
    }
    actor.art.grip.add(actor.weapon);
    const mount = weaponMount(actor).spec;
    if (mount?.anchor) {
        actor.weapon.position.fromArray(mount.anchor).multiplyScalar(-1);
    } else {
        actor.weapon.position.fromArray(actor.art.weaponOffset || [0, 0, 0]);
    }
}

/** Independent off-hand props share the humanoid rig without replacing its main weapon. */
export function mountCharacterOffHand(actor, config) {
    const spec = config.offHandModels?.[actor.offHandModel];
    const mount = actor.art?.weaponMounts?.[actor.offHandMount || actor.offHandModel];
    if (!actor.offHand || (!spec && !mount)) {
        return;
    }
    const jointName = spec?.joint || 'leftHand';
    const joint = actor.art?.joints[jointName] || actor.joints[jointName];
    if (!joint) {
        actor.offHand.visible = false;
        return;
    }
    if (actor.offHand.parent === joint) {
        return;
    }
    joint.add(actor.offHand);
    if (spec) {
        actor.offHand.position.fromArray(spec.position);
        actor.offHand.rotation.set(...spec.rotation);
    } else {
        actor.offHand.quaternion.copy(actor.art.gripBind.left);
        if (mount.rotation) {
            actor.offHand.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...mount.rotation)));
        }
        actor.offHand.position.fromArray(mount.anchor || [0, 0, 0]).multiplyScalar(-1)
            .applyQuaternion(actor.offHand.quaternion);
    }
    actor.offHand.visible = true;
}

function alignOffHandWeapon(actor) {
    const mount = actor.art.weaponMounts?.[actor.offHandMount || actor.offHandModel];
    if (!actor.offHand || mount?.align !== 'forward') {
        return;
    }
    actor.body.updateWorldMatrix(true, true);
    if (canAimWeapon(actor) || canAimGroundedWeapon(actor)) {
        actor.offHand.quaternion.copy(actor.art.joints.leftHand.getWorldQuaternion(new THREE.Quaternion()).invert())
            .multiply(actor.body.getWorldQuaternion(new THREE.Quaternion()));
    } else {
        actor.offHand.quaternion.copy(actor.art.gripBind.left);
    }
    if (mount.rotation) {
        actor.offHand.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...mount.rotation)));
    }
    actor.offHand.position.fromArray(mount.anchor || [0, 0, 0]).multiplyScalar(-1)
        .applyQuaternion(actor.offHand.quaternion);
}

/** Select the roster's reusable bodies without changing the shared model catalogue. */
export function encounterArtConfig(config, combatants) {
    if (!combatants) {
        return config.artAssets;
    }
    const characterModels = [...new Set(combatants.map(actor =>
        config.appearances[actor.appearance]?.asset).filter(Boolean))];
    return { ...config.artAssets, characterModels };
}

/** Optional visual assets own their shared GPU resources for one scene lifetime. */
export class CombatArtAssets {
    constructor(config = {}) {
        this.config = config;
        this.templates = new Map();
        this.animations = new Map();
        this.variantMaterials = new Map();
        this.skeletons = new Set();
        this.disposed = false;
    }

    async load() {
        if (!this.config.enabled) {
            return;
        }
        const loader = new GLTFLoader();
        const needed = new Set([...(this.config.characterModels || []), this.config.environment].filter(Boolean));
        const unrestricted = this.config.characterModels === undefined && !this.config.environment;
        const selected = Object.entries(this.config.models).filter(([id]) => unrestricted || needed.has(id));
        let next = 0;
        const loadNext = async () => {
            while (next < selected.length && !this.disposed) {
                const [id, spec] = selected[next++];
                try {
                    const result = await loader.loadAsync(mediaAssetUrl(spec.url));
                    if (this.disposed) {
                        disposeArt(result.scene);
                        return;
                    }
                    result.scene.traverse(node => {
                        node.castShadow = spec.castShadow !== false;
                        node.receiveShadow = true;
                        node.userData.sharedCombatArt = true;
                    });
                    this.templates.set(id, result.scene);
                    this.animations.set(id, result.animations || []);
                } catch (error) {
                    console.warn(`Combat art ${id} unavailable; retaining study geometry.`, error);
                }
            }
        };
        await Promise.all(Array.from({ length: Math.min(RULES.combatPresentation.mediaConcurrency,
            selected.length) }, () => loadNext()));
    }

    create(id, materialTints = {}, hiddenMaterials = [], meshVariants = {}, materialPalettes = {}) {
        const template = this.templates.get(id);
        if (!template) {
            return;
        }
        const model = template.clone(true);
        const hiddenMeshes = new Set();
        for (const [slot, catalogue] of Object.entries(this.config.models?.[id]?.meshVariants || {})) {
            const choice = Object.hasOwn(catalogue.options, meshVariants[slot]) ? meshVariants[slot] : catalogue.default;
            const selected = catalogue.options[choice];
            for (const name of catalogue.hiddenMeshes?.[choice] || []) {
                hiddenMeshes.add(name);
            }
            const managed = new Set(Object.values(catalogue.options).flat());
            model.traverse(node => {
                if (managed.has(node.name)) {
                    node.visible = selected.includes(node.name);
                }
            });
        }
        model.traverse(node => {
            if (hiddenMeshes.has(node.name)) {
                node.visible = false;
            }
        });
        const originals = [];
        const copies = [];
        template.traverse(node => originals.push(node));
        model.traverse(node => copies.push(node));
        const nodes = new Map(originals.map((node, index) => [node, copies[index]]));
        const skeletons = new Map();
        for (const original of originals) {
            if (!original.isSkinnedMesh) {
                continue;
            }
            // Object3D.clone shares the skeleton; each actor must deform only its own bones.
            const copy = nodes.get(original);
            let skeleton = skeletons.get(original.skeleton);
            if (!skeleton) {
                skeleton = original.skeleton.clone();
                skeleton.bones = original.skeleton.bones.map(bone => nodes.get(bone));
                skeletons.set(original.skeleton, skeleton);
                this.skeletons.add(skeleton);
            }
            copy.bind(skeleton, original.bindMatrix);
        }
        model.traverse(node => {
            if (!node.material) {
                return;
            }
            if ([node.material].flat().every(material => hiddenMaterials.includes(material.name))) {
                node.visible = false;
            }
            const variant = material => {
                const tint = materialTints[material.name];
                const palette = materialPalettes[material.name];
                if (!tint && !palette) {
                    return material;
                }
                const key = `${id}:${material.uuid}:${tint}:${JSON.stringify(palette)}`;
                if (!this.variantMaterials.has(key)) {
                    const copy = material.clone();
                    if (tint) {
                        copy.color?.set(tint);
                    }
                    if (palette) {
                        applyCombatMaterialPalette(copy, palette);
                    }
                    this.variantMaterials.set(key, copy);
                }
                return this.variantMaterials.get(key);
            };
            node.material = Array.isArray(node.material) ? node.material.map(variant) : variant(node.material);
        });
        const smoke = this.config.models[id]?.smoke;
        if (smoke) {
            const volume = createCombatSmoke(smoke);
            model.getObjectByName(smoke.boundsNode).visible = false;
            model.getObjectByName(smoke.bodyNode).add(volume.mesh);
            model.getObjectByName(smoke.targetNode).position.fromArray(smoke.position);
            model.userData.combatSmoke = volume;
        }
        return model;
    }

    dispose() {
        this.disposed = true;
        this.skeletons.forEach(skeleton => skeleton.dispose());
        this.skeletons.clear();
        for (const template of this.templates.values()) {
            disposeArt(template);
        }
        this.templates.clear();
        this.animations.clear();
        this.variantMaterials.forEach(material => material.dispose());
        this.variantMaterials.clear();
    }
}

function disposeArt(root) {
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    const skeletons = new Set();
    root.traverse(node => {
        if (node.skeleton) {
            skeletons.add(node.skeleton);
        }
        if (node.geometry) {
            geometries.add(node.geometry);
        }
        for (const material of [].concat(node.material || [])) {
            materials.add(material);
            for (const value of Object.values(material)) {
                if (value?.isTexture) {
                    textures.add(value);
                }
            }
        }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    skeletons.forEach(skeleton => skeleton.dispose());
    textures.forEach(texture => {
        texture.source?.data?.close?.();
        texture.dispose();
    });
}

export function attachCharacterArt(actor, assets) {
    if (actor.art || actor.artUnavailable || !actor.appearance.asset) {
        return;
    }
    const model = assets.create(actor.appearance.asset,
        actor.appearance.materialTints, actor.appearance.hiddenMaterials, actor.appearance.meshVariants,
        actor.appearance.materialPalettes);
    if (!model) {
        return;
    }
    const spec = assets.config.models[actor.appearance.asset];
    const clips = assets.animations.get(actor.appearance.asset) || [];
    if (clips.length && spec.modelRotation) {
        model.rotation.set(...spec.modelRotation);
    }
    const joints = Object.fromEntries(Object.entries(spec.joints).map(([key, name]) =>
        [key, model.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name))]));
    if (Object.values(joints).some(joint => !joint)) {
        actor.artUnavailable = true;
        console.warn('Character asset is missing required attachment nodes; retaining study geometry.');
        return;
    }
    if (spec.headRotation) {
        joints.head.quaternion.multiply(new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(...spec.headRotation)));
    }
    actor.body.add(model);
    actor.body.updateWorldMatrix(true, true);
    // Convert the author's joint axes into the existing Y-up/+Z-forward weapon frame.
    const grip = new THREE.Group();
    actor.legacyParts.visible = false;
    const rest = Object.fromEntries(Object.entries(joints).map(([key, joint]) => [key, joint.quaternion.clone()]));
    const restScale = Object.fromEntries(Object.entries(joints).map(([key, joint]) => [key, joint.scale.clone()]));
    const gripBind = Object.fromEntries(['left', 'right'].filter(side => joints[`${side}Hand`]).map(side => [side,
        joints[`${side}Hand`].getWorldQuaternion(new THREE.Quaternion()).invert()
            .multiply(actor.body.getWorldQuaternion(new THREE.Quaternion()))]));
    actor.art = { model, joints, rest, restScale, grip, stances: spec.stances,
        smoke: model.userData.combatSmoke,
        smokeOpacity: spec.smoke && model.getObjectByName(spec.smoke.opacityNode),
        smokeReach: spec.smoke?.reachNode && model.getObjectByName(spec.smoke.reachNode),
        weaponOffset: spec.weaponOffset, weaponMounts: spec.weaponMounts,
        gripBind, headAim: spec.headAim, headAimMaxRadians: spec.headAimMaxRadians ?? Math.PI / 3,
        origin: model.position.clone() };
    mountCharacterWeapon(actor);
    if (clips.length && spec.motion) {
        actor.art.animator = new CombatAnimator(model, clips, spec.motion);
        actor.art.animator.motion.weaponHand = actor.art.weaponHand;
    }
    actor.castOrigin = joints[spec.castOrigin] || joints.leftHand;
}

export function poseCharacterArt(actor, { now, moving, animated, strike }) {
    if (!actor.art) {
        return;
    }
    // Authored animation owns every bone on animated assets. The procedural
    // fallback remains available for rigs without clips.
    if (actor.art.animator) {
        actor.art.smoke?.update(animated ? actor.art.animator.mixer.time : 0,
            actor.art.smokeOpacity.scale.x, actor.art.smokeReach?.scale.x || 0);
        const gestureHand = actor.art.animator.presentation?.spec.gestureHand;
        if (gestureHand) {
            actor.castOrigin = actor.art.joints[`${gestureHand}Hand`];
        }
        alignHead(actor);
        alignHoldingHand(actor);
        alignGrip(actor);
        alignSupportHand(actor);
        alignOffHandWeapon(actor);
        return;
    }
    const { joints, rest, restScale, model, origin, stances, grip } = actor.art;
    for (const [key, joint] of Object.entries(joints)) {
        joint.quaternion.copy(rest[key]);
        joint.scale.copy(restScale[key]);
    }
    const rotate = (key, angle) => {
        joints[key]?.quaternion.multiply(poseRotation.setFromAxisAngle(poseAxis, angle));
    };
    model.position.copy(origin);
    const stance = actor.combatant?.hp <= 0 ? null :
        stances?.[actor.weaponModel] || stances?.[actor.combatant?.weaponAction] || stances?.melee;
    if (stance) {
        model.position.y -= stance.lower;
        actor.body.updateWorldMatrix(true, true);
        for (const side of ['left', 'right']) {
            const foot = stance.feet[side].slice();
            const step = moving && animated ? Math.sin(now / 115) * (side === 'left' ? 1 : -1) : 0;
            foot[2] += step * 0.14;
            foot[1] += Math.max(0, step) * 0.06;
            solveLimb(actor.body, joints[`${side}Leg`], joints[`${side}Knee`],
                joints[`${side}Ankle`], foot, [0, 0, 1]);
        }
    }
    const stride = moving && animated ? Math.sin(now / 115) * 0.30 : 0;
    if (!stance) {
        rotate('leftLeg', stride);
        rotate('rightLeg', -stride);
    }
    rotate('leftCoat', stride * 0.35);
    rotate('rightCoat', -stride * 0.35);
    const casting = animated && actor.actionUntil > now && actor.actionProfile?.pose === 'cast';
    const progress = casting ? Math.max(0, Math.min(1, (now - actor.actionStarted) /
        (actor.actionProfile.seconds * 1000))) : 0;
    const gesture = Math.sin(Math.PI * progress);
    if (stance) {
        for (const side of ['right', 'left']) {
            const hand = stance.hands[side].slice();
            if (side === 'left') {
                hand[1] += gesture * 0.12;
                hand[2] += gesture * 0.1;
            } else {
                hand[2] += Math.max(0, strike.weapon) * 0.06;
            }
            solveLimb(actor.body, joints[`${side}Arm`], joints[`${side}Elbow`],
                joints[`${side}Hand`], hand, [side === 'left' ? -1 : 1, -1, 0]);
        }
    } else {
        rotate('leftArm', stride * 0.35 - gesture * 1.35);
        rotate('rightArm', -stride * 0.35 - Math.max(0, strike.weapon) * 0.28);
    }
    // Keep equipment in the renderer's forward frame as the forearm changes angle.
    actor.body.updateWorldMatrix(true, true);
    grip.quaternion.copy(joints.rightHand.getWorldQuaternion(new THREE.Quaternion()).invert())
        .multiply(actor.body.getWorldQuaternion(new THREE.Quaternion()));
    if (stance?.weaponRotation) {
        grip.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...stance.weaponRotation)));
    }
}

/** Place a two-segment limb without stretching; preserve the hand/sole orientation. */
function solveLimb(frame, upper, lower, end, targetArray, bendArray) {
    if (!upper || !lower || !end) {
        return;
    }
    frame.updateWorldMatrix(true, true);
    const start = upper.getWorldPosition(new THREE.Vector3());
    const middle = lower.getWorldPosition(new THREE.Vector3());
    const finish = end.getWorldPosition(new THREE.Vector3());
    const orientation = end.getWorldQuaternion(new THREE.Quaternion());
    const firstLength = start.distanceTo(middle);
    const secondLength = middle.distanceTo(finish);
    if (firstLength < 0.00001 || secondLength < 0.00001) {
        return;
    }
    const target = frame.localToWorld(new THREE.Vector3().fromArray(targetArray));
    const direction = target.clone().sub(start);
    const distance = THREE.MathUtils.clamp(direction.length(),
        Math.abs(firstLength - secondLength) + 0.00001, firstLength + secondLength - 0.00001);
    direction.normalize();
    const bend = new THREE.Vector3().fromArray(bendArray)
        .transformDirection(frame.matrixWorld);
    bend.addScaledVector(direction, -bend.dot(direction)).normalize();
    const along = (firstLength ** 2 + distance ** 2 - secondLength ** 2) / (2 * distance);
    const desiredMiddle = start.clone().addScaledVector(direction, along)
        .addScaledVector(bend, Math.sqrt(Math.max(0, firstLength ** 2 - along ** 2)));
    aimBone(upper, middle.clone().sub(start), desiredMiddle.clone().sub(start));
    frame.updateWorldMatrix(true, true);
    const actualMiddle = lower.getWorldPosition(new THREE.Vector3());
    const actualFinish = end.getWorldPosition(new THREE.Vector3());
    const reachable = start.clone().addScaledVector(direction, distance);
    aimBone(lower, actualFinish.sub(actualMiddle), reachable.sub(actualMiddle));
    frame.updateWorldMatrix(true, true);
    end.quaternion.copy(end.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(orientation);
}

function aimBone(bone, from, to) {
    const rotation = new THREE.Quaternion().setFromUnitVectors(from.normalize(), to.normalize());
    const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.premultiply(parent.clone().invert().multiply(rotation).multiply(parent));
}
