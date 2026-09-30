import * as THREE from '../../vendor/three/three.module.min.js';
import { CombatArtAssets, attachCharacterArt, mountCharacterOffHand, poseCharacterArt } from './CombatArtAssets.js';
import { combatSceneConfig, combatActionVisual, selectedPlayerAppearance, selectedPlayerParts } from '../ui/CombatPresentation.js';
import { mediaAssetUrl } from '../utils/mediaAssetUrl.js';

/** Presentation only. Service entry remains owned by SettlementManager. */
export class SettlementScene {
    constructor(host, { settlement, character = {}, onEnter = () => {}, onError = () => {} } = {}) {
        this.host = host;
        this.settlement = settlement;
        this.character = character;
        this.onEnter = onEnter;
        this.onError = onError;
        this.active = true;
        this.disposed = false;
        this.actors = [];
        this.materials = new Map();
        this.textures = new Set();
        this.textureLoads = [];
        this.geometries = new Set();
        this.hotspots = [];
        this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.viewport = document.createElement('div');
        this.viewport.className = 'settlement-scene-viewport';
        this.labels = document.createElement('div');
        this.labels.className = 'settlement-scene-hotspots';
        this.labels.setAttribute('role', 'group');
        this.labels.setAttribute('aria-label', 'Settlement services');
        this.status = document.createElement('p');
        this.status.className = 'settlement-scene-status';
        this.status.setAttribute('aria-live', 'polite');
        this.status.textContent = 'Opening the settlement square…';
        this.viewport.append(this.labels);
        host.append(this.viewport, this.status);
        this.ready = this.load();
    }

    async load() {
        const read = async path => {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Could not load settlement presentation (${response.status})`);
            }
            return response.json();
        };
        const [settings, base] = await Promise.all([read('data/settlementScene.json'), read('data/combatScene.json')]);
        if (this.disposed) {
            return;
        }
        const variantId = settings.variantBySettlementType?.[this.settlement?.settlementType] || 'village';
        const variant = settings.variants?.[variantId] || {};
        this.settings = { ...settings, ...variant, variantId,
            palette: { ...settings.palette, ...variant.palette },
            materialTextures: { ...settings.materialTextures, ...variant.materialTextures },
            services: settings.services.map(service => ({ ...service,
                frontage: variant.serviceFrontages?.[service.id] || service.frontage })) };
        const sceneSettings = this.settings;
        this.config = combatSceneConfig(base, { sceneId: 'settlement' });
        this.config.palette = { ...this.config.palette, ...sceneSettings.palette };
        this.config.materialTextures = { ...this.config.materialTextures };
        for (const [name, override] of Object.entries(sceneSettings.materialTextures || {})) {
            this.config.materialTextures[name] = { ...this.config.materialTextures[name], ...override };
        }
        const appearances = [selectedPlayerAppearance(base, this.character) || base.teamAppearance.player,
            ...sceneSettings.residents.map(resident => resident.appearance),
            ...(sceneSettings.pedestrians || []).map(resident => resident.appearance)];
        this.assets = new CombatArtAssets({ ...base.artAssets, enabled: true, environment: sceneSettings.environment,
            characterModels: [...new Set(appearances.map(id => base.appearances[id].asset))] });
        await this.assets.load();
        if (this.disposed) {
            return;
        }
        const environment = this.assets.create(sceneSettings.environment);
        if (!environment || appearances.some(id => !this.assets.templates.has(base.appearances[id].asset))) {
            throw new Error('Settlement scenery or inhabitants could not load');
        }
        for (const name of sceneSettings.hiddenEnvironmentNodes || []) {
            const node = environment.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
            if (node) {
                node.visible = false;
            }
        }
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(sceneSettings.background);
        this.camera = new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 100);
        this.camera.position.fromArray(sceneSettings.camera.position);
        this.camera.lookAt(new THREE.Vector3(...sceneSettings.camera.target));
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.domElement.setAttribute('aria-hidden', 'true');
        this.contextLost = event => {
            event.preventDefault();
            this.setActive(false);
            this.status.textContent = 'The scene is unavailable. Use the settlement service list.';
            this.onError(new Error('Settlement graphics context lost'));
        };
        this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
        this.viewport.prepend(this.renderer.domElement);
        this.scene.add(environment);
        this.scene.add(new THREE.HemisphereLight(sceneSettings.lighting.sky, sceneSettings.lighting.ground, 2));
        const key = new THREE.DirectionalLight(sceneSettings.lighting.key, sceneSettings.lighting.intensity);
        key.position.fromArray(sceneSettings.lighting.position);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        Object.assign(key.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16 });
        key.shadow.bias = -0.001;
        this.scene.add(key);
        this.scene.add(this.part(sceneSettings.ground));
        if (sceneSettings.paving) {
            this.createPaving(sceneSettings.paving);
        }
        this.createServices();
        this.createNeighbourhood();
        this.player = this.createActor(appearances[0], sceneSettings.playerStart, 0, this.character);
        for (const resident of sceneSettings.residents) {
            this.createActor(resident.appearance, resident.position, resident.facing,
                { combatAppearance: { parts: resident.parts || {} } }, resident.scale || 1, resident.accessories);
        }
        for (const pedestrian of sceneSettings.pedestrians || []) {
            const actor = this.createActor(pedestrian.appearance, pedestrian.position, pedestrian.facing,
                { combatAppearance: { parts: pedestrian.parts || {} } }, pedestrian.scale || 1, pedestrian.accessories);
            actor.pedestrian = { route: pedestrian.route.map(point => new THREE.Vector3(...point)),
                waypoint: 1, speed: pedestrian.speed, dwell: pedestrian.dwell,
                pause: pedestrian.startDelay || 0 };
        }
        await Promise.all(this.textureLoads);
        if (this.disposed) {
            return;
        }
        this.resizeObserver = new window.ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.viewport);
        this.resize();
        this.status.textContent = 'Choose a service to walk over and enter.';
        this.setActive(this.active);
    }

    material(name) {
        if (!this.materials.has(name)) {
            const material = new THREE.MeshStandardMaterial({ color: this.config.palette[name] || name, roughness: 0.9 });
            const spec = this.config.materialTextures?.[name];
            if (spec) {
                this.textureLoads.push(new THREE.TextureLoader().loadAsync(mediaAssetUrl(spec.url)).then(texture => {
                    if (this.disposed) {
                        texture.dispose();
                        return;
                    }
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.fromArray(spec.repeat || [1, 1]);
                    material.map = texture;
                    material.needsUpdate = true;
                    this.textures.add(texture);
                }));
            }
            this.materials.set(name, material);
        }
        return this.materials.get(name);
    }

    part(spec, appearance = {}) {
        const constructors = { box: THREE.BoxGeometry, cylinder: THREE.CylinderGeometry,
            sphere: THREE.SphereGeometry, cone: THREE.ConeGeometry, ico: THREE.IcosahedronGeometry };
        const geometry = new constructors[spec.shape](...spec.size);
        this.geometries.add(geometry);
        const mesh = new THREE.Mesh(geometry, this.material(appearance[spec.material] || spec.material));
        mesh.position.fromArray(spec.position);
        if (spec.rotation) {
            mesh.rotation.fromArray(spec.rotation);
        }
        if (spec.scale) {
            mesh.scale.fromArray(spec.scale);
        }
        mesh.castShadow = mesh.receiveShadow = true;
        return mesh;
    }

    createPaving(paving) {
        const [width, depth] = paving.stone;
        const [cx, cy, cz] = paving.position;
        const geometry = new THREE.BoxGeometry(width - paving.joint, 0.06, depth - paving.joint);
        this.geometries.add(geometry);
        const count = paving.columns * paving.rows;
        const stones = new THREE.InstancedMesh(geometry, this.material('civicPaver'), count);
        const transform = new THREE.Object3D();
        for (let row = 0; row < paving.rows; row++) {
            for (let col = 0; col < paving.columns; col++) {
                const index = row * paving.columns + col;
                const stagger = row % 2 ? width * 0.5 : 0;
                transform.position.set(cx + (col - (paving.columns - 1) / 2) * width + stagger,
                    cy, cz + (row - (paving.rows - 1) / 2) * depth);
                transform.updateMatrix();
                stones.setMatrixAt(index, transform.matrix);
                const colour = paving.colours[(row * 17 + col * 13 + row * col * 3) % paving.colours.length];
                stones.setColorAt(index, new THREE.Color(colour));
            }
        }
        stones.instanceMatrix.needsUpdate = true;
        stones.instanceColor.needsUpdate = true;
        stones.receiveShadow = true;
        this.scene.add(stones);
        const spanX = paving.columns * width + width * 0.5;
        const spanZ = paving.rows * depth;
        for (const side of [-1, 1]) {
            this.scene.add(this.part({ shape: 'box', size: [0.18, 0.08, spanZ + 0.2],
                position: [cx + side * spanX / 2, cy, cz], material: paving.border }));
            this.scene.add(this.part({ shape: 'box', size: [spanX + 0.2, 0.08, 0.18],
                position: [cx, cy, cz + side * spanZ / 2], material: paving.border }));
        }
    }

    createServices() {
        for (const service of this.settings.services) {
            const front = service.frontage;
            if (front) {
                const [x, y, z] = front.position;
                const h = front.height, w = front.width;
                const urban = this.settings.variantId === 'urban';
                const pieces = [
                    { size: [w, h, 2.2], position: [x, y + h / 2, z], material: urban ? 'ashPlaster' : 'masonry' },
                    { size: [w + 0.3, 0.25, 2.6], position: [x, y + h, z], material: urban ? 'slateRoof' : 'stone' },
                    { size: [1.15, 2.15, 0.12], position: [x, y + 1.075, z + 1.15], material: 'wood' },
                    { size: [w - 0.5, 0.32, 0.15], position: [x, y + 2.7, z + 1.15],
                        material: urban ? 'civicBorder' : service.colour }
                ];
                for (const piece of pieces) {
                    this.scene.add(this.part({ shape: 'box', ...piece }));
                }
                for (const side of [-1, 1]) {
                    this.scene.add(this.part({ shape: 'box', size: [0.6, 0.8, 0.12],
                        position: [x + side * 1.05, y + 1.8, z + 1.15], material: 'wood' }));
                    if (urban) {
                        this.scene.add(this.part({ shape: 'box', size: [0.2, h - 0.2, 0.24],
                            position: [x + side * (w / 2 - 0.18), y + h / 2, z + 1.22], material: 'civicBorder' }));
                        this.scene.add(this.part({ shape: 'box', size: [0.7, 0.82, 0.08],
                            position: [x + side * w * 0.27, y + h - 1.05, z + 1.16], material: 'darkStone' }));
                        this.scene.add(this.part({ shape: 'box', size: [0.82, 0.12, 0.2],
                            position: [x + side * w * 0.27, y + h - 1.53, z + 1.19], material: 'slateRoof' }));
                    }
                }
                if (urban) {
                    this.scene.add(this.part({ shape: 'box', size: [w + 0.25, 0.18, 0.3],
                        position: [x, y + 3.05, z + 1.21], material: 'slateRoof' }));
                }
            }
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'settlement-scene-hotspot';
            button.dataset.building = service.id;
            button.textContent = service.label;
            button.setAttribute('aria-label', `Visit the ${service.label}`);
            button.addEventListener('click', () => this.visit(service.id));
            this.labels.append(button);
            this.hotspots.push({ button, service });
        }
    }

    createNeighbourhood() {
        const box = (size, position, material, rotation) => this.scene.add(this.part({
            shape: 'box', size, position, material, ...(rotation ? { rotation } : {})
        }));
        for (const building of this.settings.buildings || []) {
            const [x, y, z] = building.position;
            const { width: w, depth: d, height: h } = building;
            const face = z + d / 2 + 0.04;
            const trim = building.roof;
            // Differing rooflines, recessed doors, and uneven materials imply a
            // whole occupied street beyond the four playable service buildings.
            box([w, h, d], [x, y + h / 2, z], building.wall);
            box([w + 0.16, 0.18, d + 0.16], [x, y + 0.12, z], 'stone');
            if (building.roofStyle === 'pitched') {
                const rise = Math.min(1.1, w * 0.25);
                const halfSpan = Math.hypot(w / 2 + 0.22, rise);
                const slope = Math.atan2(rise, w / 2 + 0.22);
                for (const side of [-1, 1]) {
                    box([halfSpan, 0.2, d + 0.42],
                        [x + side * (w / 4 + 0.05), y + h + rise / 2, z], trim,
                        [0, 0, -side * slope]);
                }
            } else {
                box([w + 0.45, 0.24, d + 0.45], [x, y + h, z], trim);
                for (const side of [-1, 1]) {
                    box([0.16, 0.48, d + 0.48], [x + side * w / 2, y + h + 0.29, z], trim);
                }
            }
            const doorX = x + building.doorSide * w * 0.21;
            box([0.85, 1.85, 0.09], [doorX, y + 0.94, face], 'wood');
            box([1.02, 0.16, 0.16], [doorX, y + 1.92, face + 0.04], trim);
            const windowX = x - building.doorSide * w * 0.23;
            for (const windowY of h > 4 ? [1.55, 3.15] : [1.7]) {
                box([0.7, 0.76, 0.08], [windowX, y + windowY, face], 'darkStone');
                box([0.82, 0.12, 0.21], [windowX, y + windowY - 0.43, face + 0.05], trim);
                box([0.08, 0.76, 0.11], [windowX, y + windowY, face + 0.06], 'wood');
            }
            box([w + 0.08, 0.15, 0.12], [x, y + h * 0.57, face], trim);
            if (building.timberFrame) {
                for (const side of [-1, 1]) {
                    box([0.16, h - 0.1, 0.14], [x + side * (w / 2 - 0.12), y + h / 2, face], 'wood');
                }
                box([w - 0.12, 0.14, 0.14], [x, y + h - 0.45, face], 'wood');
            }
        }
        for (const stall of this.settings.streetFurniture || []) {
            const [x, y, z] = stall.position;
            const w = stall.width;
            box([w, 0.17, 1.1], [x, y + 1.0, z], 'wood');
            for (const side of [-1, 1]) {
                box([0.12, 2.25, 0.12], [x + side * (w / 2 - 0.13), y + 1.13, z - 0.42], 'wood');
            }
            box([w + 0.26, 0.12, 1.45], [x, y + 2.22, z], stall.colour);
            for (const side of [-1, 1]) {
                box([0.38, 0.3, 0.36], [x + side * w * 0.25, y + 1.24, z], 'stone');
            }
        }
        for (const [x, y, z] of this.settings.civicFurniture?.planters || []) {
            box([1.25, 0.48, 0.8], [x, y + 0.25, z], 'civicBorder');
            box([1.08, 0.07, 0.63], [x, y + 0.52, z], 'plant');
            for (const side of [-1, 1]) {
                this.scene.add(this.part({ shape: 'sphere', size: [0.37, 7, 5],
                    position: [x + side * 0.27, y + 0.72, z], material: 'plant' }));
            }
        }
        for (const [x, y, z] of this.settings.civicFurniture?.benches || []) {
            box([1.8, 0.16, 0.55], [x, y + 0.58, z], 'stone');
            for (const side of [-1, 1]) {
                box([0.2, 0.55, 0.55], [x + side * 0.68, y + 0.28, z], 'civicBorder');
            }
        }
    }

    createActor(appearanceId, position, facing, character, scale = 1, accessories = []) {
        const base = this.config.appearances[appearanceId];
        const parts = selectedPlayerParts(this.config, character || {});
        const appearance = { ...base, ...parts, materialTints: { ...base.materialTints, ...parts.materialTints } };
        const weaponId = character?.equipment?.mainHand?.id;
        const visual = weaponId && combatActionVisual(this.config, { weaponId, kind: 'melee' }, appearanceId);
        const weaponModel = visual?.model || 'unarmed';
        const actor = { root: new THREE.Group(), body: new THREE.Group(), weapon: new THREE.Group(),
            legacyParts: new THREE.Group(), weaponModel, appearance,
            combatant: { hp: 1, conditions: [], weaponMount: visual?.mount } };
        actor.body.rotation.order = 'YXZ';
        actor.body.scale.setScalar(appearance.height * scale);
        actor.body.rotation.y = facing;
        actor.root.position.fromArray(position);
        actor.root.add(actor.body);
        actor.body.add(actor.weapon);
        for (const spec of this.config.weapons[weaponModel] || []) {
            const mesh = this.part(spec, appearance);
            mesh.position.sub(new THREE.Vector3(...this.config.animation.weaponPivot));
            actor.weapon.add(mesh);
        }
        attachCharacterArt(actor, this.assets);
        for (const accessory of accessories || []) {
            const anchor = accessory.anchor === 'body' ? actor.body : actor.art?.joints?.[accessory.anchor];
            if (anchor) {
                anchor.add(this.part(accessory));
            }
        }
        const offId = character?.equipment?.offHand?.id;
        const offVisual = this.config.offHandVisuals?.find(entry => entry.itemId === offId) ||
            (offId && combatActionVisual(this.config, { weaponId: offId, kind: 'melee' }, appearanceId));
        if (offVisual) {
            actor.offHandModel = offVisual.model;
            actor.offHandMount = offVisual.mount;
            actor.offHand = new THREE.Group();
            const prop = this.config.offHandModels?.[actor.offHandModel];
            for (const spec of prop?.parts || this.config.weapons[actor.offHandModel] || []) {
                const mesh = this.part(spec, appearance);
                if (!prop) {
                    mesh.position.sub(new THREE.Vector3(...this.config.animation.weaponPivot));
                }
                actor.offHand.add(mesh);
            }
            mountCharacterOffHand(actor, this.config);
        }
        // Town inhabitants use relaxed authored breathing. Equipment is carried
        // on the body, so combat aiming and support-hand corrections do not apply.
        if (actor.art?.animator) {
            actor.art.animator.profile = { ...actor.art.animator.profile,
                idle: this.settings.idle, idles: {}, offHandIdles: {} };
            actor.art.animator.setBase(true);
            actor.art.headAim = false;
            actor.art.weaponMounts = {};
            this.stow(actor, actor.weapon, this.settings.carriedWeapons[weaponModel] || this.settings.carriedWeapon);
            if (actor.offHand) {
                this.stow(actor, actor.offHand, this.settings.carriedOffHand);
            }
        }
        this.scene.add(actor.root);
        this.actors.push(actor);
        return actor;
    }

    stow(actor, prop, placement) {
        actor.body.add(prop);
        prop.position.fromArray(placement.position);
        prop.rotation.fromArray(placement.rotation);
        actor.root.updateMatrixWorld(true);
        actor.art.joints.spine.attach(prop);
    }

    visit(id) {
        const service = this.settings?.services.find(entry => entry.id === id);
        if (!service || !this.player || !this.active || this.disposed) {
            return;
        }
        const current = this.player.root.position;
        const destination = new THREE.Vector3(...service.position);
        this.journey = { service, points: [new THREE.Vector3(current.x, 0, this.settings.streetZ),
            new THREE.Vector3(destination.x, 0, this.settings.streetZ), destination] };
        this.status.textContent = `Walking to the ${service.label}…`;
        if (this.motionPreference.matches) {
            current.copy(destination);
            this.completeVisit();
        }
    }

    completeVisit() {
        const service = this.journey?.service;
        this.journey = null;
        if (service && !this.disposed) {
            this.status.textContent = service.label;
            this.onEnter(service.id);
        }
    }

    resize() {
        if (!this.renderer || this.disposed) {
            return;
        }
        const width = Math.max(1, this.viewport.clientWidth), height = Math.max(1, this.viewport.clientHeight);
        const span = Math.max(this.settings.camera.span, this.settings.camera.minimumWidth * height / width);
        this.camera.left = -span * width / height / 2;
        this.camera.right = -this.camera.left;
        this.camera.top = span / 2;
        this.camera.bottom = -span / 2;
        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld();
        this.renderer.setSize(width, height, false);
        for (const { button, service } of this.hotspots) {
            const p = new THREE.Vector3(...service.labelPosition).project(this.camera);
            button.style.left = `${(p.x + 1) * width / 2}px`;
            button.style.top = `${(1 - p.y) * height / 2}px`;
        }
        this.render(0);
    }

    render(delta) {
        if (this.journey) {
            const target = this.journey.points[0];
            const offset = target.clone().sub(this.player.root.position);
            const distance = offset.length(), step = this.settings.walkSpeed * delta;
            if (distance <= Math.max(step, 0.01)) {
                this.player.root.position.copy(target);
                this.journey.points.shift();
                if (!this.journey.points.length) {
                    this.completeVisit();
                    if (this.disposed) {
                        return;
                    }
                }
            } else {
                this.player.body.rotation.y = Math.atan2(offset.x, offset.z);
                this.player.root.position.addScaledVector(offset.normalize(), step);
            }
        }
        for (const actor of this.actors) {
            let moving = actor === this.player && Boolean(this.journey);
            if (actor.pedestrian && !this.motionPreference.matches && delta > 0) {
                const walk = actor.pedestrian;
                if (walk.pause > 0) {
                    walk.pause = Math.max(0, walk.pause - delta);
                } else {
                    const target = walk.route[walk.waypoint];
                    const offset = target.clone().sub(actor.root.position);
                    const distance = offset.length();
                    if (distance <= walk.speed * delta) {
                        actor.root.position.copy(target);
                        walk.waypoint = (walk.waypoint + 1) % walk.route.length;
                        walk.pause = walk.waypoint === 1 ? walk.dwell : 0;
                        moving = walk.pause === 0;
                    } else {
                        actor.body.rotation.y = Math.atan2(offset.x, offset.z);
                        actor.root.position.addScaledVector(offset.normalize(), walk.speed * delta);
                        moving = true;
                    }
                }
            }
            actor.art?.animator?.update(delta, { moving, speed: actor.pedestrian?.speed || this.settings.walkSpeed,
                reducedMotion: this.motionPreference.matches, idle: actor.weaponModel, offHand: actor.offHandModel });
            poseCharacterArt(actor, { now: performance.now(), moving, animated: !this.motionPreference.matches, strike: { weapon: 0 } });
        }
        this.renderer.render(this.scene, this.camera);
    }

    setActive(active) {
        this.active = active && !this.disposed;
        cancelAnimationFrame(this.frame);
        if (!this.active || !this.renderer) {
            return;
        }
        this.lastFrame = performance.now();
        const tick = now => {
            if (!this.active || this.disposed) {
                return;
            }
            this.render(Math.min(0.05, (now - this.lastFrame) / 1000));
            this.lastFrame = now;
            if (this.active && !this.disposed) {
                this.frame = requestAnimationFrame(tick);
            }
        };
        this.frame = requestAnimationFrame(tick);
    }

    dispose() {
        this.disposed = true;
        this.setActive(false);
        this.journey = null;
        this.resizeObserver?.disconnect();
        this.actors.forEach(actor => actor.art?.animator?.dispose());
        this.assets?.dispose();
        this.geometries.forEach(geometry => geometry.dispose());
        this.materials.forEach(material => material.dispose());
        this.textures.forEach(texture => texture.dispose());
        if (this.renderer) {
            this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost);
            this.scene?.traverse(node => node.shadow?.dispose());
            this.renderer.dispose();
        }
        this.viewport.remove();
        this.status.remove();
    }
}
