import * as THREE from '../../vendor/three/three.module.min.js';
import { CombatSceneLayout, engagementPartners, planSceneMoves } from './CombatSceneLayout.js';
import { planContact, pathLength, sampleContactPath } from './CombatContact.js';
import { facingPartner } from './CombatFacing.js';
import { CombatArtAssets, attachCharacterArt, mountCharacterWeapon, mountCharacterOffHand, poseCharacterArt } from './CombatArtAssets.js';
import { encounterArtConfig } from './CombatArtAssets.js';
import { CombatSmokeDepth } from './CombatSmoke.js';
import { createCombatBreath, updateCombatBreath } from './CombatBreath.js';
import { mediaAssetUrl } from '../utils/mediaAssetUrl.js';
import { formatCombatNumber, fractionalCombatEnabled, conditionDescription } from '../utils/combatNumberFormat.js';

function samplePose(frames, progress) {
    const t = Math.max(0, Math.min(1, progress));
    const end = frames.findIndex(frame => frame.time >= t);
    const b = frames[end];
    const a = frames[Math.max(0, end - 1)];
    const fraction = a === b ? 0 : (t - a.time) / (b.time - a.time);
    const blend = fraction * fraction * (3 - 2 * fraction);
    return {
        lean: a.lean + (b.lean - a.lean) * blend,
        weapon: a.weapon + (b.weapon - a.weapon) * blend
    };
}

export class CombatScene {
    constructor(container, config, { onSelect = () => {}, onFailure = () => {}, combatants } = {}) {
        this.container = container;
        this.config = config;
        this.onSelect = onSelect;
        this.actors = new Map();
        this.layout = new CombatSceneLayout(config.layout.spacing, config.layout.homeColumn);
        this.cells = new Map();
        this.moves = [];
        this.effects = [];
        this.actions = [];
        this.feedbackQueue = [];
        this.running = false;
        this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(config.palette.sky);
        this.scene.fog = new THREE.Fog(config.palette.fog, 35, 85);
        this.camera = new THREE.OrthographicCamera(-15, 15, 12, -12, 0.1, 160);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.35;
        this.renderer.domElement.setAttribute('aria-hidden', 'true');
        this.contextLost = event => {
            event.preventDefault();
            this.stop();
            onFailure();
        };
        this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
        const actorAt = event => {
            const bounds = this.renderer.domElement.getBoundingClientRect();
            const pointer = new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1,
                1 - (event.clientY - bounds.top) / bounds.height * 2);
            const ray = new THREE.Raycaster();
            ray.setFromCamera(pointer, this.camera);
            const hit = ray.intersectObjects([...this.actors.values()].map(actor => actor.root), true)[0];
            let object = hit?.object;
            while (object && !object.userData.combatantId) {
                object = object.parent;
            }
            return object?.userData.combatantId;
        };
        this.pickActor = event => {
            const id = actorAt(event);
            if (id) {
                this.onSelect(id);
            }
        };
        this.hoverActor = event => {
            const id = actorAt(event);
            this.renderer.domElement.style.cursor = id ? 'pointer' : '';
            this.highlight(id);
        };
        this.leaveActor = () => this.highlight(null);
        this.renderer.domElement.addEventListener('click', this.pickActor);
        this.renderer.domElement.addEventListener('pointermove', this.hoverActor);
        this.renderer.domElement.addEventListener('pointerleave', this.leaveActor);
        this.viewport = document.createElement('div');
        this.viewport.className = 'combat-scene-viewport';
        this.viewport.append(this.renderer.domElement);
        this.createCameraControls();
        this.labels = document.createElement('div');
        this.labels.className = 'combat-scene-roster';
        this.labels.setAttribute('role', 'group');
        this.labels.setAttribute('aria-label', 'Combatants — select a target or inspect their engagement partners');
        container.append(this.viewport, this.labels);
        this.materials = new Map();
        this.environmentTextures = new Set();
        this.texturePromises = [];
        this.createEnvironment();
        this.resizeObserver = new window.ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.viewport);
        this.resize();
        this.artAssets = new CombatArtAssets(encounterArtConfig(config, combatants));
        this.ready = Promise.all([this.artAssets.load(), ...this.texturePromises]).then(() => {
            if (!this.disposed) {
                this.installArt();
            }
        });
    }

    installArt() {
        if (this.isBusy()) {
            return;
        }
        for (const actor of this.actors.values()) {
            attachCharacterArt(actor, this.artAssets);
            mountCharacterOffHand(actor, this.config);
        }
        if (!this.artEnvironment && this.config.artAssets?.environment) {
            const environment = this.artAssets.create(this.config.artAssets.environment);
            if (environment) {
                this.artEnvironment = environment;
                environment.position.z = this.environmentOffsetZ || 0;
                this.scene.add(environment);
                this.legacyEnvironment.visible = false;
            }
        }
    }

    createCameraControls() {
        this.cameraZoom = 1;
        const controls = document.createElement('div');
        controls.className = 'combat-scene-camera';
        controls.setAttribute('role', 'group');
        controls.setAttribute('aria-label', 'Camera controls');
        const button = (text, label, action) => {
            const element = document.createElement('button');
            element.type = 'button';
            element.textContent = text;
            element.setAttribute('aria-label', label);
            element.addEventListener('click', action);
            controls.append(element);
            return element;
        };
        this.zoomOut = button('−', 'Zoom out', () => this.setZoom(this.cameraZoom / this.config.camera.zoomStep));
        this.zoomReadout = document.createElement('span');
        controls.append(this.zoomReadout);
        this.zoomIn = button('+', 'Zoom in', () => this.setZoom(this.cameraZoom * this.config.camera.zoomStep));
        button('Fit', 'Fit whole encounter', () => this.setZoom(1));
        this.viewport.append(controls);
        this.zoomWheel = event => {
            if (event.ctrlKey || event.metaKey) {
                return;
            }
            event.preventDefault();
            const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.viewport.clientHeight : 1;
            const delta = Math.max(-100, Math.min(100, event.deltaY * unit));
            this.setZoom(this.cameraZoom * this.config.camera.zoomStep ** (-delta / 100));
        };
        this.renderer.domElement.addEventListener('wheel', this.zoomWheel, { passive: false });
    }

    setZoom(zoom) {
        const settings = this.config.camera;
        this.cameraZoom = Math.max(settings.minimumZoom, Math.min(settings.maximumZoom, zoom));
        this.resize();
    }

    material(name) {
        const colour = this.config.palette[name] || name;
        const textureSpec = this.config.materialTextures?.[name];
        const key = `${colour}:${textureSpec?.url || ''}`;
        if (!this.materials.has(key)) {
            const material = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.95,
                flatShading: !textureSpec });
            if (textureSpec) {
                let texture;
                this.texturePromises.push(new Promise((resolve, reject) => {
                    texture = new THREE.TextureLoader().load(mediaAssetUrl(textureSpec.url), resolve,
                        undefined, reject);
                }));
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.fromArray(textureSpec.repeat || [1, 1]);
                material.map = texture;
                this.environmentTextures.add(texture);
            }
            this.materials.set(key, material);
        }
        return this.materials.get(key);
    }

    part(spec, palette = {}) {
        const constructors = {
            box: THREE.BoxGeometry, cylinder: THREE.CylinderGeometry,
            sphere: THREE.SphereGeometry, cone: THREE.ConeGeometry, ico: THREE.IcosahedronGeometry
        };
        const mesh = new THREE.Mesh(new constructors[spec.shape](...spec.size),
            this.material(palette[spec.material] || spec.material));
        mesh.position.fromArray(spec.position);
        if (spec.rotation) {
            mesh.rotation.set(...spec.rotation);
        }
        if (spec.scale) {
            mesh.scale.fromArray(spec.scale);
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    createEnvironment() {
        this.legacyEnvironment = new THREE.Group();
        this.scene.add(this.legacyEnvironment);
        const lighting = this.config.lighting;
        this.scene.add(new THREE.HemisphereLight(lighting.fillSky, lighting.fillGround, lighting.fillIntensity));
        const sun = new THREE.DirectionalLight(lighting.keyColor, lighting.keyIntensity);
        sun.position.fromArray(lighting.keyPosition);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 });
        sun.shadow.bias = -0.001;
        this.scene.add(sun);
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), this.material('ground'));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.13;
        ground.receiveShadow = true;
        this.scene.add(ground);
        for (const prop of this.config.props) {
            this.legacyEnvironment.add(this.part(prop));
        }
        for (const spec of this.config.rubble) {
            const rock = this.part({ shape: 'ico', size: [spec.radius, 0],
                position: spec.position, rotation: [0, spec.rotation, 0],
                scale: spec.scale, material: spec.material });
            this.legacyEnvironment.add(rock);
        }
        this.environmentLights = new THREE.Group();
        this.scene.add(this.environmentLights);
        if (!lighting.lanternIntensity) {
            return;
        }
        const lantern = this.part({ shape: 'box', size: [0.23, 0.35, 0.23],
            position: this.config.composition.lanternPosition, material: 'lantern' });
        lantern.material = new THREE.MeshBasicMaterial({ color: this.config.palette.lantern });
        this.environmentLights.add(lantern);
        const light = new THREE.PointLight(this.config.palette.lantern,
            lighting.lanternIntensity, lighting.lanternDistance, lighting.lanternDecay);
        light.position.fromArray(this.config.composition.lightPosition);
        this.environmentLights.add(light);
    }

    createActor(combatant) {
        const baseAppearance = this.config.appearances[combatant.appearance] ||
            this.config.appearances[this.config.teamAppearance[combatant.team]] || this.config.appearances.traveller;
        const parts = combatant.team === 'player' ? combatant.appearanceParts : null;
        const appearance = parts ? { ...baseAppearance,
            materialTints: { ...baseAppearance.materialTints, ...parts.materialTints },
            hiddenMaterials: parts.hiddenMaterials, meshVariants: parts.meshVariants } : baseAppearance;
        const root = new THREE.Group();
        root.userData.combatantId = combatant.id;
        const body = new THREE.Group();
        body.rotation.order = 'YXZ';
        const weapon = new THREE.Group();
        weapon.position.fromArray(this.config.animation.weaponPivot);
        const joints = {};
        const legacyParts = new THREE.Group();
        body.add(legacyParts);
        for (const spec of appearance.body || this.config.body) {
            const mesh = this.part(spec, appearance);
            legacyParts.add(mesh);
            if (spec.joint) {
                joints[spec.joint] = mesh;
            }
        }
        const weaponModel = combatant.weaponModel || appearance.weapon;
        for (const spec of this.config.weapons[weaponModel] || []) {
            const mesh = this.part(spec, appearance);
            mesh.position.sub(weapon.position);
            weapon.add(mesh);
        }
        body.add(weapon);
        body.scale.setScalar(appearance.height);
        root.add(body);
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.64, 0.7, 40),
            new THREE.MeshBasicMaterial({ color: this.config.palette[combatant.team === 'enemy' ? 'enemy' : 'ally'],
                transparent: true, opacity: 0.65, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.055;
        root.add(ring);
        const statusRing = new THREE.Mesh(new THREE.RingGeometry(0.51, 0.57, 40),
            new THREE.MeshBasicMaterial({ color: this.config.palette.spell,
                transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
        statusRing.rotation.x = -Math.PI / 2;
        statusRing.position.y = 0.06;
        statusRing.visible = false;
        root.add(statusRing);
        const label = document.createElement('button');
        label.type = 'button';
        label.className = 'combat-scene-actor';
        label.dataset.sceneCombatant = combatant.id;
        label.dataset.team = combatant.team;
        const name = document.createElement('span');
        const hp = document.createElement('span');
        hp.className = 'combat-scene-hp';
        const statuses = document.createElement('span');
        statuses.className = 'combat-scene-statuses';
        statuses.setAttribute('aria-label', 'No active conditions');
        const feedback = document.createElement('span');
        feedback.className = 'combat-scene-feedback';
        label.append(name, hp, statuses, feedback);
        label.addEventListener('click', () => this.onSelect(combatant.id));
        label.addEventListener('pointerenter', () => this.highlight(combatant.id));
        label.addEventListener('pointerleave', () => this.highlight(null));
        label.addEventListener('focus', () => this.highlight(combatant.id));
        label.addEventListener('blur', () => this.highlight(null));
        this.labels.append(label);
        this.scene.add(root);
        const actor = { root, body, weapon, weaponModel, joints, legacyParts, ring, statusRing,
            label, name, hp, statuses, feedback, appearance, combatant };
        this.actors.set(combatant.id, actor);
        if (this.artAssets) {
            attachCharacterArt(actor, this.artAssets);
            if (combatant.hp <= 0) {
                actor.art?.animator?.playAction('death');
            }
        }
        return actor;
    }

    update(state) {
        if (this.moves.length || [...this.actors.values()].some(actor => actor.actionUntil > performance.now())) {
            this.pendingState = state;
            this.state = state;
            this.links = engagementPartners(state.combatants);
            for (const combatant of state.combatants) {
                const actor = this.actors.get(combatant.id);
                if (actor) {
                    this.updateActorState(actor, combatant, state);
                }
            }
            return;
        }
        this.state = state;
        this.links = engagementPartners(state.combatants);
        if (!this.actors.size) {
            // Adjacent travel edges pass at sqrt(3)/2 of cell spacing from a third occupied cell.
            const radius = Math.max(...state.combatants.map(actor =>
                this.config.appearances[actor.appearance || this.config.teamAppearance[actor.team]].footprintRadius));
            this.layout.spacing = Math.max(this.config.layout.spacing, radius * 4 / Math.sqrt(3) + 0.1);
        }
        const targets = this.layout.update(state.combatants, state.approach);
        for (const combatant of state.combatants) {
            let actor = this.actors.get(combatant.id);
            if (!actor) {
                actor = this.createActor(combatant);
                this.cells.set(combatant.id, this.layout.homes.get(combatant.id));
                const p = this.layout.world(this.cells.get(combatant.id));
                actor.root.position.set(p.x, 0, p.z);
            }
            this.updateActorState(actor, combatant, state);
        }
        for (const [id, actor] of this.actors) {
            if (!targets.has(id)) {
                actor.art?.animator?.dispose();
                this.scene.remove(actor.root);
                this.disposeObject(actor.root);
                actor.label.remove();
                this.actors.delete(id);
                this.cells.delete(id);
            }
        }
        const immobile = new Set(state.combatants.filter(c => c.hp <= 0 || c.id === state.approach?.targetId).map(c => c.id));
        this.moves = planSceneMoves(this.cells, targets, immobile, this.layout.minimumR);
        this.resize();
        if (this.motionPreference.matches) {
            this.finishMovement();
        }
    }

    updateActorState(actor, combatant, state) {
        const wasAlive = actor.combatant?.hp > 0;
        const previousMount = actor.weaponMount;
        actor.combatant = combatant;
        const weaponModel = combatant.weaponModel || actor.appearance.weapon;
        actor.weaponMount = combatant.weaponMount || weaponModel;
        if (weaponModel !== actor.weaponModel) {
            this.disposeObject(actor.weapon);
            actor.weapon.clear();
            for (const spec of this.config.weapons[weaponModel] || []) {
                const mesh = this.part(spec, actor.appearance);
                mesh.position.sub(new THREE.Vector3(...this.config.animation.weaponPivot));
                actor.weapon.add(mesh);
            }
            actor.weaponModel = weaponModel;
        }
        if (weaponModel !== actor.art?.mountedWeaponModel || actor.weaponMount !== previousMount) {
            mountCharacterWeapon(actor);
        }
        if (actor.offHandModel !== combatant.offHandModel || actor.offHandMount !== combatant.offHandMount) {
            if (actor.offHand) {
                actor.offHand.removeFromParent();
                this.disposeObject(actor.offHand);
            }
            actor.offHandModel = combatant.offHandModel;
            actor.offHandMount = combatant.offHandMount;
            actor.offHand = new THREE.Group();
            const prop = this.config.offHandModels?.[actor.offHandModel];
            for (const spec of prop?.parts || this.config.weapons[actor.offHandModel] || []) {
                const mesh = this.part(spec, actor.appearance);
                if (!prop) {
                    mesh.position.sub(new THREE.Vector3(...this.config.animation.weaponPivot));
                }
                actor.offHand.add(mesh);
            }
            actor.body.add(actor.offHand);
            mountCharacterOffHand(actor, this.config);
        }
        actor.name.textContent = combatant.name;
        actor.hp.textContent = `HP ${formatCombatNumber(combatant.hp)} / ${formatCombatNumber(combatant.maxHP)}`;
        const partnerNames = [...this.links.get(combatant.id)].map(id =>
            state.combatants.find(c => c.id === id)?.name).join(', ');
        actor.label.title = partnerNames ? `Engaged with ${partnerNames}` : 'Not engaged';
        if (combatant.weaponName) {
            actor.label.title += `. Holding ${combatant.weaponName}`;
        }
        const conditions = combatant.conditions || [];
        actor.weapon.visible = !conditions.some(condition => condition.type === 'disarmed');
        if (actor.offHand && !this.config.offHandModels?.[actor.offHandModel]) {
            actor.offHand.visible = actor.weapon.visible;
        }
        const describeCondition = condition => fractionalCombatEnabled()
            ? conditionDescription(condition, id => state.combatants.find(c => c.id === id)?.name)
            : condition.type;
        const conditionNames = conditions.map(describeCondition).join(', ');
        if (conditionNames) {
            actor.label.title += `. Conditions: ${conditionNames}`;
        }
        if (combatant.ac !== undefined) {
            actor.label.title += `. AC ${combatant.ac}`;
        }
        actor.label.setAttribute('aria-label',
            `${combatant.name}, ${formatCombatNumber(combatant.hp)} of ${formatCombatNumber(combatant.maxHP)} health. ${actor.label.title}`);
        actor.label.classList.toggle('is-active', combatant.id === state.currentTurn);
        actor.label.classList.toggle('is-defeated', combatant.hp <= 0);
        actor.label.classList.toggle('is-downed', Boolean(combatant.isDowned));
        actor.statuses.replaceChildren();
        const visibleConditions = conditions.filter(condition => condition.icon);
        const statusNames = [];
        if (combatant.isDowned) {
            const badge = document.createElement('span');
            badge.className = 'combat-scene-status is-debuff';
            badge.textContent = 'DOWNED';
            badge.title = 'Downed';
            actor.statuses.append(badge);
            statusNames.push('Downed');
        }
        for (const condition of visibleConditions) {
            const badge = document.createElement('span');
            badge.className = `combat-scene-status ${condition.isBuff ? 'is-buff' : 'is-debuff'}`;
            badge.textContent = condition.type === 'tempHP' && condition.value > 0 ?
                `${condition.icon} ${formatCombatNumber(condition.value)}` : condition.icon;
            badge.title = describeCondition(condition);
            actor.statuses.append(badge);
            statusNames.push(describeCondition(condition));
        }
        actor.statuses.setAttribute('aria-label', statusNames.length ?
            `Active conditions: ${statusNames.join(', ')}` : 'No active conditions');
        actor.statusRing.visible = combatant.hp > 0 && visibleConditions.length > 0;
        actor.statusRing.material.color.set(this.config.palette[
            visibleConditions.some(condition => !condition.isBuff) ? 'spell' : 'healing']);
        actor.ring.material.color.set(this.config.palette[combatant.id === state.currentTurn ? 'active' :
            combatant.team === 'enemy' ? 'enemy' : 'ally']);
        actor.art?.animator?.setCondition(combatant.hp <= 0 ? actor.art.animator.condition :
            conditions.some(condition => condition.type === 'prone') ? 'prone' : null);
        if (actor.art?.animator && wasAlive && combatant.hp <= 0) {
            actor.art.animator.playAction('death');
        } else if (actor.art?.animator && !wasAlive && combatant.hp > 0) {
            actor.art.animator.resume();
        }
    }

    highlight(id) {
        for (const [other, actor] of this.actors) {
            const highlighted = other === id || this.links?.get(id)?.has(other);
            actor.label.classList.toggle('is-engaged-highlight', Boolean(highlighted));
            actor.ring.material.opacity = id ? highlighted ? 1 : 0.15 : 0.65;
        }
    }

    feedback({ combatantId, text, type, onImpact }) {
        this.feedbackQueue.push({ combatantId, text, type, onImpact, readyAt: performance.now() + 100 });
    }

    showFeedback({ combatantId, text, type, onImpact }) {
        const actor = this.actors.get(combatantId);
        if (actor) {
            actor.feedback.textContent = text;
            actor.feedback.dataset.type = type;
            actor.feedbackStarted = performance.now();
            actor.feedbackUntil = actor.feedbackStarted + this.config.animation.feedbackSeconds * 1000;
            actor.hit = type === 'damage' || type === 'critical';
            actor.miss = type === 'miss';
            if (actor.hit && actor.combatant.hp > 0) {
                actor.art?.animator?.react('hit');
                actor.animationStartedAt = actor.feedbackStarted;
            }
            if (actor.hit && !this.motionPreference.matches) {
                const spell = actor.incomingKind === 'spell';
                const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(spell ? 0.55 : 0.2, 1),
                    new THREE.MeshBasicMaterial({ color: actor.incomingColor || this.config.palette[spell ? 'spell' : 'active'],
                        transparent: true, opacity: 0.7, depthWrite: false }));
                this.scene.add(mesh);
                this.effects.push({ mesh, target: actor, kind: 'impact', start: performance.now(),
                    duration: this.config.animation.impactSeconds * 1000 });
            }
        }
        onImpact?.();
    }

    action(event) {
        this.actions.push({ ...event, readyAt: performance.now() + 100 });
    }

    deliverReleaseCues(now = Infinity) {
        for (const actor of this.actors.values()) {
            if (actor.releaseCue?.at <= now) {
                const release = actor.releaseCue;
                actor.releaseCue = null;
                release.callback();
            }
        }
    }

    isBusy() {
        return Boolean(this.moves.length || this.actions.length || this.feedbackQueue.length || this.effects.length ||
            [...this.actors.values()].some(actor => actor.actionUntil > performance.now() ||
                actor.art?.animator?.isBusy()));
    }

    finishPresentation() {
        this.deliverReleaseCues();
        for (const action of this.actions) {
            action.onRelease?.();
        }
        const feedback = [...this.feedbackQueue, ...this.actions.flatMap(action => [
            ...(action.feedback ? [{ combatantId: action.targetId, ...action.feedback, onImpact: action.onImpact }] : []),
            ...(action.secondaryFeedback || [])
        ])];
        this.actions = [];
        for (const event of feedback) {
            const actor = this.actors.get(event.combatantId);
            if (actor) {
                actor.feedback.textContent = event.text;
                actor.feedback.dataset.type = event.type;
                actor.feedbackUntil = performance.now() + this.config.animation.feedbackSeconds * 1000;
            }
            event.onImpact?.();
        }
        this.feedbackQueue = [];
        for (const actor of this.actors.values()) {
            actor.pendingAuthoredAction = null;
            actor.authoredActionStarted = false;
            actor.art?.animator?.finishPresentation();
            if (actor.contactPath) {
                const origin = actor.contactPath[0];
                actor.root.position.set(origin.x, 0, origin.z);
                actor.contactPath = null;
            }
            actor.actionUntil = 0;
            actor.hit = false;
            actor.miss = false;
            actor.body.position.set(0, 0, 0);
            actor.body.rotation.x = 0;
            actor.weapon.rotation.x = 0;
        }
        for (const effect of this.effects) {
            this.scene.remove(effect.mesh);
            this.disposeObject(effect.mesh);
        }
        this.effects = [];
        this.finishMovement();
    }

    playAction({ sourceId, targetId, kind = 'melee', motion, weaponSlot, feedback, secondaryFeedback = [], onRelease, onImpact }) {
        const source = this.actors.get(sourceId);
        const target = this.actors.get(targetId);
        if (!source || !target) {
            return;
        }
        if (feedback) {
            this.feedback({ combatantId: targetId, ...feedback, onImpact });
        }
        for (const event of secondaryFeedback) {
            this.feedback(event);
        }
        if (this.motionPreference.matches) {
            onRelease?.();
            return;
        }
        const profile = this.config.animation.actionProfiles[kind] || this.config.animation.actionProfiles.melee;
        source.actionProfile = profile;
        const now = performance.now();
        source.approachSeconds = 0;
        if (kind === 'melee' || profile.contact === 'melee') {
            const bodies = [...this.actors.values()].map(actor => ({
                id: actor.combatant.id, x: actor.root.position.x, z: actor.root.position.z,
                radius: actor.appearance.contact?.bodyRadius ?? this.config.contact.bodyRadius * actor.appearance.height,
                reach: actor.appearance.contact?.reach ?? this.config.contact.reach * actor.appearance.height
            }));
            const contactSource = bodies.find(actor => actor.id === sourceId);
            contactSource.reach = source.appearance.contact?.reachByCondition?.[source.art?.animator?.condition] ??
                source.appearance.contact?.reachByMotion?.[motion || kind] ?? contactSource.reach;
            source.contactPath = planContact(contactSource,
                bodies.find(actor => actor.id === targetId), bodies, this.config.contact,
                this.config.composition.rearZ + (this.environmentOffsetZ || 0) +
                    this.config.composition.rearClearance);
            if (source.contactPath) {
                source.approachSeconds = pathLength(source.contactPath) / this.config.contact.speed;
            }
        }
        source.approachStarted = now;
        source.actionStarted = now + source.approachSeconds * 1000;
        source.actionUntil = source.actionStarted + (profile.seconds + source.approachSeconds) * 1000;
        source.actionKind = kind;
        source.actionHand = weaponSlot === 'offHand' ? 'left' : 'right';
        source.actionWeapon = weaponSlot === 'offHand' ? source.offHand : source.weapon;
        source.actionWeaponModel = weaponSlot === 'offHand' ? source.offHandModel : source.weaponModel;
        source.pendingAuthoredAction = motion || kind;
        source.authoredActionStarted = false;
        source.facingTarget = targetId;
        const releaseAt = source.actionStarted + profile.seconds * profile.impact * 1000;
        source.releaseCue = onRelease ? { at: releaseAt, callback: onRelease } : null;
        this.presentActionTarget(source, target, kind, profile, releaseAt, feedback);
        for (const event of secondaryFeedback) {
            const recipient = this.actors.get(event.combatantId);
            if (recipient) {
                this.presentActionTarget(source, recipient, kind, profile, releaseAt, event);
            }
        }
    }

    presentActionTarget(source, target, kind, actionProfile, releaseAt, feedback) {
        const profile = feedback?.type === 'healing' ? this.config.animation.actionProfiles.healing : actionProfile;
        target.incomingKind = feedback?.type === 'healing' ? 'healing' : kind;
        target.incomingSource = source.combatant.id;
        target.incomingColor = profile.color;
        target.impactAt = releaseAt + (profile.effect && profile.effect !== 'healing' ? profile.travelSeconds * 1000 : 0);
        if (profile.effect === 'breath') {
            const mesh = createCombatBreath(profile);
            mesh.visible = false;
            this.scene.add(mesh);
            this.effects.push({ mesh, source, target, kind: 'breath', start: releaseAt,
                duration: (profile.travelSeconds + profile.emissionSeconds) * 1000,
                miss: feedback?.type === 'miss', spec: profile });
            return;
        }
        if (profile.effect) {
            const healing = profile.effect === 'healing';
            const arrow = profile.effect === 'arrow';
            const shot = profile.effect === 'shot';
            const projectile = profile.effect === 'projectile';
            const geometry = healing ? new THREE.RingGeometry(0.48, 0.57, 48) :
                profile.effect === 'spike' ? new THREE.ConeGeometry(profile.radius, profile.length, profile.sides)
                    .rotateX(Math.PI / 2) :
                    arrow || shot ? new THREE.BoxGeometry(0.035, 0.035, arrow ? 0.55 : 0.24) :
                        new THREE.SphereGeometry(projectile ? 0.055 : 0.09, 8, 6);
            const EffectMaterial = profile.litEffect ? THREE.MeshStandardMaterial : THREE.MeshBasicMaterial;
            const mesh = new THREE.Mesh(geometry, new EffectMaterial({
                color: profile.color || this.config.palette[healing ? 'healing' : arrow || projectile ? 'wood' :
                    shot ? 'lantern' : 'spell'],
                transparent: true, opacity: 1, side: THREE.DoubleSide,
                ...(profile.litEffect ? { flatShading: true } : {})
            }));
            mesh.visible = false;
            if (profile.effectScale) {
                mesh.scale.fromArray(profile.effectScale);
            }
            if (healing) {
                mesh.rotation.x = -Math.PI / 2;
            }
            this.scene.add(mesh);
            this.effects.push({ mesh, source, target, weapon: source.actionWeapon,
                weaponModel: source.actionWeaponModel, kind: profile.effect, start: releaseAt,
                duration: profile.travelSeconds * 1000, miss: feedback?.type === 'miss', arcHeight: profile.arcHeight,
                originJoint: profile.originJoint,
                fixedOrigin: Boolean(profile.fixedOrigin || profile.hideReleasedWeapon) });
            if (shot) {
                const flashSpec = this.config.animation.muzzleFlash;
                const geometry = new THREE.ConeGeometry(flashSpec.radius, flashSpec.length, flashSpec.sides)
                    .rotateX(Math.PI / 2).translate(0, 0, flashSpec.length / 2);
                const flash = new THREE.Mesh(geometry,
                    new THREE.MeshBasicMaterial({ color: this.config.palette.lantern, transparent: true }));
                flash.visible = false;
                this.scene.add(flash);
                this.effects.push({ mesh: flash, source, target, weapon: source.actionWeapon,
                    weaponModel: source.actionWeaponModel, kind: 'flash', start: releaseAt,
                    duration: flashSpec.seconds * 1000 });
            }
        }
    }

    finishMovement() {
        const moved = this.moves.length > 0;
        for (const move of this.moves) {
            const cell = move.path[move.path.length - 1];
            this.cells.set(move.id, cell);
            const p = this.layout.world(cell);
            this.actors.get(move.id)?.root.position.set(p.x, 0, p.z);
        }
        this.moves = [];
        if (moved) {
            this.resize();
        }
        if (this.pendingState && ![...this.actors.values()].some(actor => actor.actionUntil > performance.now())) {
            const pending = this.pendingState;
            this.pendingState = null;
            this.update(pending);
            this.finishMovement();
        }
    }

    resize() {
        const width = this.viewport.clientWidth;
        const height = this.viewport.clientHeight;
        if (!width || !height) {
            return;
        }
        if (this.renderWidth !== width || this.renderHeight !== height) {
            this.renderer.setSize(width, height, false);
            this.renderWidth = width;
            this.renderHeight = height;
        }
        const points = [...this.cells.values(), ...this.layout.positions.values(), ...(this.layout.homes?.values() || []),
            ...this.moves.flatMap(move => move.path)].map(p => this.layout.world(p));
        const xs = points.map(p => p.x);
        const zs = points.map(p => p.z);
        const settings = this.config.camera;
        const composition = this.config.composition;
        if (points.length && !this.cameraCentre) {
            this.cameraCentre = new THREE.Vector3((Math.min(...xs) + Math.max(...xs)) / 2,
                settings.focusHeight, (Math.min(...zs) + Math.max(...zs)) / 2 - composition.backdropBias);
            this.environmentOffsetZ = Math.min(0, Math.min(...zs) - composition.rearClearance - composition.rearZ);
            if (this.artEnvironment) {
                this.artEnvironment.position.z = this.environmentOffsetZ;
            }
            this.environmentLights.position.z = this.environmentOffsetZ;
        }
        const centre = this.cameraCentre || new THREE.Vector3(0, settings.focusHeight, 0);
        // Retain the encounter envelope so attacks and retreats do not pump the camera in and out.
        this.cameraExtentX = Math.max(this.cameraExtentX || 0, ...xs.map(x => Math.abs(x - centre.x)));
        this.cameraExtentZ = Math.max(this.cameraExtentZ || 0, ...zs.map(z => Math.abs(z - centre.z)));
        const projectedDepth = settings.height / Math.hypot(settings.height, settings.depth);
        const projectedHeight = settings.depth / Math.hypot(settings.height, settings.depth);
        const landmarks = this.cameraCentre ? composition.landmarks.map(([x, y, z]) => ({
            x: Math.abs(x - centre.x) + composition.landmarkMargin,
            y: (y - centre.y) * projectedHeight -
                (z + this.environmentOffsetZ - centre.z) * projectedDepth
        })) : [];
        const padding = Math.max(settings.padding,
            ...[...this.actors.values()].map(actor => (actor.appearance?.footprintRadius || 0) * 2));
        const actorHeight = this.cameraExtentZ * projectedDepth + padding / 2;
        const lower = Math.min(-actorHeight, ...landmarks.map(point => point.y - composition.landmarkMargin));
        const upper = Math.max(actorHeight, ...landmarks.map(point => point.y + composition.landmarkMargin));
        // Centre the projected envelope rather than reserving an equally large
        // empty foreground for tall scenery. Keep this focus fixed during play.
        if (this.cameraCentre && this.cameraFramingOffset === undefined) {
            this.cameraFramingOffset = (lower + upper) / 2;
        }
        const offset = this.cameraFramingOffset || 0;
        const span = Math.max(settings.minimumSpan, Math.max(upper - offset, offset - lower) * 2,
            (this.cameraExtentX * 2 + padding) * height / width,
            ...landmarks.map(p => p.x * 2 * height / width)) / this.cameraZoom;
        const focus = centre.clone().add(new THREE.Vector3(0, projectedHeight, -projectedDepth).multiplyScalar(offset));
        this.camera.position.copy(focus).add(new THREE.Vector3(0, settings.height, settings.depth));
        this.camera.lookAt(focus);
        this.camera.top = span / 2;
        this.camera.bottom = -span / 2;
        this.camera.left = -span * width / height / 2;
        this.camera.right = span * width / height / 2;
        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld();
        this.zoomReadout.textContent = `${Math.round(this.cameraZoom * 100)}%`;
        this.zoomOut.disabled = this.cameraZoom <= settings.minimumZoom;
        this.zoomIn.disabled = this.cameraZoom >= settings.maximumZoom;
    }

    effectTarget(actor) {
        const spec = this.config.artAssets?.models[actor.appearance.asset]?.effectTarget;
        const joint = spec && actor.art?.joints[spec.joint];
        if (joint) {
            return joint.localToWorld(new THREE.Vector3(...spec.offset));
        }
        return actor.body.localToWorld(new THREE.Vector3(...this.config.animation.effectTarget));
    }

    effectOrigin(effect, now) {
        const weapon = effect.weapon || effect.source.weapon;
        const muzzle = this.config.weaponMuzzles[effect.weaponModel || effect.source.weaponModel];
        const hand = effect.source.castOrigin || effect.source.joints?.leftHand;
        const socket = effect.source.art?.joints[effect.originJoint] ||
            ((effect.kind === 'spell' || effect.kind === 'breath') && hand);
        const origin = socket ? socket.getWorldPosition(new THREE.Vector3()) :
            muzzle ? weapon.localToWorld(new THREE.Vector3(...muzzle)
                .sub(new THREE.Vector3(...this.config.animation.weaponPivot))) :
                weapon.getWorldPosition(new THREE.Vector3());
        if (effect.fixedOrigin && now >= effect.start) {
            effect.origin ||= origin.clone();
            origin.copy(effect.origin);
        }
        return origin;
    }

    frame(now) {
        if (!this.running) {
            return;
        }
        const deltaSeconds = this.lastFrameTime === undefined ? 0 :
            Math.max(0, (now - this.lastFrameTime) / 1000);
        this.lastFrameTime = now;
        // Finish temporary contact offsets before consuming new layout snapshots or queued actions.
        for (const actor of this.actors.values()) {
            if (actor.contactPath && (now >= actor.actionUntil || this.motionPreference.matches)) {
                const home = actor.contactPath[0];
                actor.root.position.set(home.x, 0, home.z);
                actor.contactPath = null;
                actor.actionUntil = 0;
            }
        }
        if (this.motionPreference.matches) {
            this.finishMovement();
        }
        const move = this.moves[0];
        let movingId;
        if (move) {
            move.start ??= now;
            const elapsed = (now - move.start) / (this.config.animation.secondsPerStep * 1000);
            const step = Math.min(move.path.length - 1, Math.floor(elapsed));
            const a = this.layout.world(move.path[step]);
            const b = this.layout.world(move.path[Math.min(step + 1, move.path.length - 1)]);
            const actor = this.actors.get(move.id);
            const t = elapsed - step;
            actor.root.position.set(a.x + (b.x - a.x) * t, 0, a.z + (b.z - a.z) * t);
            actor.body.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
            movingId = move.id;
            if (step === move.path.length - 1) {
                this.cells.set(move.id, move.path[step]);
                this.moves.shift();
                if (!this.moves.length) {
                    this.resize();
                }
                if (!this.moves.length && this.pendingState) {
                    const pending = this.pendingState;
                    this.pendingState = null;
                    this.update(pending);
                }
            }
        }
        const actionPlaying = [...this.actors.values()].some(actor =>
            actor.actionUntil > now || actor.art?.animator?.isBusy());
        if (!this.moves.length && !actionPlaying && this.pendingState) {
            const pending = this.pendingState;
            this.pendingState = null;
            this.update(pending);
        }
        if (!this.moves.length && !actionPlaying && !this.effects.length && this.actions[0]?.readyAt <= now) {
            this.playAction(this.actions.shift());
        }
        this.deliverReleaseCues(now);
        while (!this.moves.length && this.feedbackQueue[0]?.readyAt <= now) {
            const target = this.actors.get(this.feedbackQueue[0].combatantId);
            if (target?.impactAt > now && !this.motionPreference.matches) {
                break;
            }
            this.showFeedback(this.feedbackQueue.shift());
        }
        for (const [id, actor] of this.actors) {
            const alive = actor.combatant.hp > 0;
            const animated = !this.motionPreference.matches && alive;
            if (actor.contactPath) {
                const approach = actor.approachSeconds * 1000;
                const recovery = actor.actionStarted + actor.actionProfile.seconds * 1000;
                const fraction = now < actor.actionStarted ? (now - actor.approachStarted) / approach :
                    now <= recovery ? 1 : 1 - (now - recovery) / approach;
                const point = sampleContactPath(actor.contactPath, animated ? fraction : 0);
                actor.root.position.set(point.x, 0, point.z);
                if (now >= actor.actionUntil || !animated) {
                    actor.contactPath = null;
                } else if (now < actor.actionStarted || now > recovery) {
                    movingId = id;
                }
            }
            actor.body.position.y = 0;
            const idle = this.config.animation.idle;
            const resting = animated && id !== movingId && !(actor.actionUntil > now) && !(actor.feedbackUntil > now);
            const breath = resting ? Math.sin(now / (idle.periodSeconds * 1000) * Math.PI * 2 + actor.root.position.x) : 0;
            const chest = actor.joints.chest;
            if (chest) {
                chest.scale.set(1 + breath * idle.chestExpansion, 1, 1 + breath * idle.chestExpansion);
            }
            const reactionProgress = Math.max(0, Math.min(1,
                (now - (actor.feedbackStarted || 0)) / (this.config.animation.recoilSeconds * 1000)));
            const reaction = animated ? Math.sin(reactionProgress * Math.PI) : 0;
            actor.body.position.x = actor.miss ? reaction * this.config.animation.missStep : 0;
            actor.body.position.z = actor.hit && !actor.art?.animator ?
                -reaction * this.config.animation.hitStep : 0;
            const strike = animated && actor.actionUntil > now ?
                samplePose(this.config.animation[actor.actionProfile.pose], (now - actor.actionStarted) /
                    (actor.actionProfile.seconds * 1000)) : { lean: 0, weapon: 0 };
            const recoil = animated && actor.hit && actor.feedbackUntil > now ?
                samplePose(this.config.animation.recoil, (now - actor.feedbackStarted) /
                    (this.config.animation.recoilSeconds * 1000)) : { lean: 0, weapon: 0 };
            actor.body.rotation.x = actor.art?.animator ? 0 : strike.lean + recoil.lean;
            actor.body.rotation.z = actor.art?.animator ? 0 : alive ? 0 : Math.PI / 2;
            if (actor.pendingAuthoredAction && !actor.authoredActionStarted && now >= actor.actionStarted) {
                actor.art?.animator?.update(0, { reducedMotion: !animated, attackHand: actor.actionHand });
                actor.authoredActionStarted = actor.art?.animator?.playAction(actor.pendingAuthoredAction) || false;
                actor.animationStartedAt = actor.actionStarted;
            }
            // New actions only inherit elapsed time since their scheduled start, not the preceding frame.
            const animationDelta = actor.animationStartedAt === undefined ? deltaSeconds :
                Math.max(0, (now - actor.animationStartedAt) / 1000);
            actor.animationStartedAt = undefined;
            const weaponMount = actor.art?.weaponMounts?.[actor.weaponMount || actor.weaponModel];
            actor.art?.animator?.update(animationDelta, {
                offHand: weaponMount?.supportHand || weaponMount?.hand === 'left' ? null : actor.offHandModel,
                idle: actor.combatant.conditions?.some(condition => condition.type === 'disarmed') ?
                    'unarmed' : actor.weaponMount || actor.weaponModel,
                moving: id === movingId,
                speed: this.config.animation.authoredWalkSpeed || this.config.contact.speed,
                reducedMotion: !animated
            });
            actor.weapon.rotation.x = actor.art?.animator ? 0 : strike.weapon;
            poseCharacterArt(actor, { now, moving: id === movingId, animated, strike });
            const released = actor.actionProfile?.hideReleasedWeapon && actor.actionUntil > now &&
                now >= actor.actionStarted + actor.actionProfile.seconds * actor.actionProfile.impact * 1000;
            const disarmed = actor.combatant.conditions?.some(condition => condition.type === 'disarmed');
            actor.weapon.visible = !disarmed && !(released && actor.actionWeapon === actor.weapon);
            if (actor.offHand) {
                actor.offHand.visible = !disarmed && !(released && actor.actionWeapon === actor.offHand);
            }
            for (const name of ['leftFoot', 'rightFoot']) {
                const joint = actor.joints[name];
                if (!joint) {
                    continue;
                }
                joint.position.z = id === movingId && animated ?
                    0.08 + Math.sin(now / 75) * (name === 'leftFoot' ? 0.15 : -0.15) : 0.08;
            }
            // A free hand casts; two-handed equipment uses that hand for support.
            // These are presentation poses only and never change equipment or rules.
            const hand = actor.joints.leftHand;
            const arm = actor.joints.leftArm;
            if (hand && arm) {
                const casting = animated && actor.actionUntil > now && actor.actionProfile.pose === 'cast';
                const progress = casting ? (now - actor.actionStarted) / (actor.actionProfile.seconds * 1000) : 0;
                const gesture = Math.sin(Math.PI * progress);
                if (!actor.art?.animator && actor.combatant.weaponAction && actor.combatant.weaponAction !== 'melee') {
                    actor.weapon.rotation.x += gesture * this.config.animation.castingWeaponLower;
                }
                const resting = actor.combatant.twoHanded && actor.combatant.weaponAction !== 'melee' ?
                    new THREE.Vector3(0.35, 0.95, 0.65) : new THREE.Vector3(-0.4, 0.82, 0.05);
                hand.position.copy(resting).lerp(new THREE.Vector3(-0.38, 1.35, 0.65), gesture);
                const shoulder = new THREE.Vector3(-0.29, 1.32, 0);
                const direction = hand.position.clone().sub(shoulder);
                arm.position.copy(shoulder).add(hand.position).multiplyScalar(0.5);
                arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
                arm.scale.y = direction.length() / 0.56;
            }
            if (id !== movingId) {
                const partner = facingPartner(actor, this.actors, this.links?.get(id), now);
                const target = this.actors.get(partner)?.root.position;
                actor.body.rotation.y = target ? Math.atan2(target.x - actor.root.position.x,
                    target.z - actor.root.position.z) : actor.combatant.team === 'enemy' ? -Math.PI / 2 : Math.PI / 2;
            }
            if (actor.contactPath) {
                const target = this.actors.get(actor.facingTarget)?.root.position;
                if (target) {
                    actor.body.rotation.y = Math.atan2(target.x - actor.root.position.x, target.z - actor.root.position.z);
                }
            }
            if (actor.feedbackUntil < now) {
                actor.feedback.textContent = '';
            }
        }
        this.effects = this.effects.filter(effect => {
            const t = Math.max(0, Math.min(1, (now - effect.start) / effect.duration));
            effect.mesh.visible = now >= effect.start;
            if (effect.kind === 'impact') {
                effect.mesh.position.copy(this.effectTarget(effect.target));
                effect.mesh.scale.setScalar(0.45 + t * 1.25);
                effect.mesh.material.opacity = (1 - t) * 0.7;
            } else if (effect.kind === 'healing') {
                const start = effect.target.body.localToWorld(
                    new THREE.Vector3(...this.config.animation.healingStart));
                const destination = this.effectTarget(effect.target);
                destination.y = Math.max(start.y, destination.y) + this.config.animation.healingRise;
                effect.mesh.position.lerpVectors(start, destination, t);
                effect.mesh.scale.setScalar(1 + t * 0.55);
                effect.mesh.material.opacity = Math.sin(t * Math.PI) * 0.8;
            } else {
                const origin = this.effectOrigin(effect, now);
                const destination = this.effectTarget(effect.target);
                if (effect.miss) {
                    const direction = destination.clone().sub(origin).normalize();
                    destination.add(new THREE.Vector3(direction.z, 0, -direction.x)
                        .multiplyScalar(this.config.animation.missOffset));
                }
                if (effect.kind === 'breath') {
                    updateCombatBreath(effect.mesh, origin, destination, (now - effect.start) / 1000, effect.spec);
                } else {
                    effect.mesh.position.lerpVectors(origin, destination, t);
                    effect.mesh.lookAt(destination);
                }
                if (effect.kind === 'spell') {
                    effect.mesh.position.y += Math.sin(t * Math.PI) * (effect.arcHeight ?? 0.35);
                }
                if (effect.kind === 'flash') {
                    effect.mesh.position.copy(origin);
                    effect.mesh.scale.setScalar(1 - t * 0.7);
                    effect.mesh.material.opacity = 1 - t;
                }
            }
            if (t >= 1 || this.motionPreference.matches) {
                this.scene.remove(effect.mesh);
                effect.mesh.geometry.dispose();
                effect.mesh.material.dispose();
                effect.mesh.dispose?.();
                return false;
            }
            return true;
        });
        this.installArt();
        const smoke = [...this.actors.values()].map(actor => actor.art?.smoke).filter(Boolean);
        if (smoke.length) {
            this.smokeDepth ??= new CombatSmokeDepth();
            this.smokeDepth.render(this.renderer, this.scene, this.camera, smoke);
        }
        this.renderer.render(this.scene, this.camera);
        this.frameId = requestAnimationFrame(time => this.frame(time));
    }

    start() {
        if (!this.running) {
            this.running = true;
            this.lastFrameTime = undefined;
            this.resize();
            this.frameId = requestAnimationFrame(time => this.frame(time));
        }
    }

    stop() {
        this.running = false;
        this.lastFrameTime = undefined;
        cancelAnimationFrame(this.frameId);
        this.finishMovement();
    }

    disposeObject(object) {
        object.traverse(child => {
            if (child.userData.sharedCombatArt) {
                return;
            }
            child.geometry?.dispose();
            if (child.isInstancedMesh) {
                child.dispose();
            }
            if (child.material && ![...this.materials.values()].includes(child.material)) {
                child.material.dispose();
            }
        });
    }

    dispose() {
        this.disposed = true;
        this.stop();
        this.resizeObserver.disconnect();
        this.disposeObject(this.scene);
        for (const actor of this.actors.values()) {
            actor.art?.animator?.dispose();
        }
        this.artAssets.dispose();
        this.smokeDepth?.dispose();
        for (const material of this.materials.values()) {
            material.dispose();
        }
        for (const texture of this.environmentTextures) {
            texture.dispose();
        }
        this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost);
        this.renderer.domElement.removeEventListener('click', this.pickActor);
        this.renderer.domElement.removeEventListener('pointermove', this.hoverActor);
        this.renderer.domElement.removeEventListener('pointerleave', this.leaveActor);
        this.renderer.domElement.removeEventListener('wheel', this.zoomWheel);
        this.renderer.dispose();
        this.renderer.forceContextLoss();
        this.viewport.remove();
        this.labels.remove();
    }
}
