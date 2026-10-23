import * as THREE from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { CombatArtAssets, attachCharacterArt } from './CombatArtAssets.js';
import { selectedPlayerParts } from '../ui/CombatPresentation.js';
import { mediaAssetUrl } from '../utils/mediaAssetUrl.js';

export class TavernInteriorScene {
    constructor(host, { config = 'data/tavernInteriorScene.json', onError = () => {} } = {}) {
        this.host = host;
        this.onError = onError;
        this.disposed = false;
        this.lifetime = new window.AbortController();
        this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.motion.addEventListener('change', () => {
            this.needsRender = true;
        }, { signal: this.lifetime.signal });
        this.actors = [];
        this.actorGeometries = new Set();
        this.cameraMode = 'entrance';
        this.ready = this.load(config);
    }

    async load(source) {
        const read = async path => {
            const response = await fetch(path, { signal: this.lifetime.signal });
            if (!response.ok) {
                throw new Error(`Tavern presentation unavailable (${response.status})`);
            }
            return response.json();
        };
        this.config = typeof source === 'string' ? await read(source) : source;
        if (this.disposed) {
            return;
        }
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.config.background);
        this.camera = new THREE.PerspectiveCamera(this.config.camera.fieldOfView, 1, 0.1, 100);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.config.camera.pixelRatio));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = this.config.lighting.exposure;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        const canvas = this.renderer.domElement;
        canvas.className = 'tavern-interior-canvas';
        canvas.tabIndex = 0;
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', 'Three-dimensional tavern common room. Drag to look around. Arrow keys rotate, plus and minus zoom, Home resets the view.');
        canvas.style.touchAction = 'none';
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        this.host.append(canvas);
        this.bindControls(canvas);
        const lighting = this.config.lighting;
        this.scene.add(new THREE.HemisphereLight(lighting.sky, lighting.ground, lighting.ambient));
        const key = new THREE.DirectionalLight(lighting.key, lighting.keyIntensity);
        key.position.fromArray(lighting.keyPosition);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.1, far: 30 });
        key.shadow.normalBias = 0.035;
        this.scene.add(key);
        this.lights = lighting.points.map(spec => {
            const light = new THREE.PointLight(spec.colour, spec.intensity, spec.distance, 2);
            light.position.fromArray(spec.position);
            this.scene.add(light);
            return { light, spec };
        });
        const room = await new GLTFLoader().loadAsync(mediaAssetUrl(this.config.model));
        this.room = room.scene;
        if (this.disposed) {
            this.releaseRoom();
            return;
        }
        this.room.traverse(node => {
            if (node.isMesh) {
                node.castShadow = node.receiveShadow = true;
                if (node.material.name === 'flame') {
                    const original = node.material;
                    node.material = new THREE.MeshBasicMaterial({ color: original.emissive, toneMapped: false });
                    original.dispose();
                }
                if (node.material.map) {
                    node.material.map.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
                    if (['oak', 'darkOak', 'cutWood', 'stone', 'flagstone', 'slate'].includes(node.material.name)) {
                        node.material.bumpMap = node.material.map;
                        node.material.bumpScale = node.material.name.includes('Wood') ? 0.025 : 0.045;
                        node.material.needsUpdate = true;
                    }
                }
            }
        });
        this.scene.add(this.room);
        this.roomBounds = new THREE.Box3().setFromObject(this.room);
        await this.loadInhabitants(await read('data/combatScene.json'));
        if (this.disposed) {
            return;
        }
        this.resizeObserver = new window.ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.host);
        this.resetCamera();
        this.resize();
        this.frame = requestAnimationFrame(time => this.render(time));
    }

    async loadInhabitants(base) {
        const residents = this.config.inhabitants || [];
        this.assets = new CombatArtAssets({ ...base.artAssets, enabled: true, environment: null,
            characterModels: [...new Set(residents.map(spec => base.appearances[spec.appearance].asset))] });
        await this.assets.load();
        if (this.disposed) {
            return;
        }
        for (const spec of residents) {
            const appearance = base.appearances[spec.appearance];
            const parts = selectedPlayerParts(base, { combatAppearance: { parts: spec.parts } });
            const actor = { root: new THREE.Group(), body: new THREE.Group(), weapon: new THREE.Group(),
                legacyParts: new THREE.Group(), weaponModel: 'unarmed',
                appearance: { ...appearance, ...parts,
                    materialTints: { ...appearance.materialTints, ...parts.materialTints } },
                combatant: { hp: 1, conditions: [] } };
            actor.body.scale.setScalar(appearance.height);
            actor.body.rotation.y = spec.facing;
            actor.root.position.fromArray(spec.position);
            actor.presentation = spec;
            actor.phase = this.actors.length * 1.7;
            actor.root.add(actor.body);
            actor.body.add(actor.weapon);
            attachCharacterArt(actor, this.assets);
            if (!actor.art) {
                throw new Error('The tavern inhabitants could not load');
            }
            this.trimInhabitantGeometry(actor.art.model);
            if (actor.art.animator) {
                actor.art.animator.profile = { ...actor.art.animator.profile,
                    idle: { clip: 'Idle_Loop', poseTime: 0.2 }, idles: {}, offHandIdles: {} };
                actor.art.animator.setBase(true);
                actor.art.animator.mixer.update(0.2 + actor.phase * 0.1);
            }
            this.scene.add(actor.root);
            if (spec.seatHeight) {
                actor.root.updateMatrixWorld(true);
                const hips = actor.art.joints.leftLeg.getWorldPosition(new THREE.Vector3());
                actor.root.position.y += spec.seatHeight + 0.06 - hips.y;
            }
            this.poseInhabitant(actor, 0);
            this.actors.push(actor);
        }
    }

    trimInhabitantGeometry(model) {
        model.traverse(node => {
            if (!node.isMesh) {
                return;
            }
            const regions = (this.config.inhabitantHiddenGeometry || [])
                .filter(region => region.materials.includes(node.material.name))
                .map(region => new THREE.Box3(new THREE.Vector3(...region.min), new THREE.Vector3(...region.max)));
            if (!regions.length) {
                return;
            }
            const source = node.geometry, positions = source.attributes.position;
            const kept = [], center = new THREE.Vector3(), vertex = new THREE.Vector3();
            const count = source.index?.count || positions.count;
            for (let triangle = 0; triangle < count; triangle += 3) {
                const indices = [0, 1, 2].map(offset => source.index ? source.index.getX(triangle + offset) : triangle + offset);
                center.set(0, 0, 0);
                indices.forEach(index => center.add(vertex.fromBufferAttribute(positions, index)));
                center.multiplyScalar(1 / 3);
                if (!regions.some(region => region.containsPoint(center))) {
                    kept.push(...indices);
                }
            }
            if (kept.length < count) {
                node.geometry = source.clone();
                node.geometry.setIndex(kept);
                this.actorGeometries.add(node.geometry);
            }
        });
    }

    poseInhabitant(actor, time) {
        const { joints } = actor.art;
        if (actor.presentation.seatHeight) {
            const facing = actor.body.getWorldQuaternion(new THREE.Quaternion());
            const aim = (joint, child, localDirection) => {
                actor.root.updateMatrixWorld(true);
                const start = joint.getWorldPosition(new THREE.Vector3());
                const current = child.getWorldPosition(new THREE.Vector3()).sub(start).normalize();
                const desired = new THREE.Vector3(...localDirection).normalize().applyQuaternion(facing);
                const rotation = new THREE.Quaternion().setFromUnitVectors(current, desired)
                    .multiply(joint.getWorldQuaternion(new THREE.Quaternion()));
                joint.quaternion.copy(joint.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));
            };
            for (const side of ['left', 'right']) {
                const spread = side === 'left' ? -0.08 : 0.08;
                aim(joints[`${side}Leg`], joints[`${side}Knee`], [spread, -0.08, 1]);
                aim(joints[`${side}Knee`], joints[`${side}Ankle`], [0, -1, 0]);
                aim(joints[`${side}Arm`], joints[`${side}Elbow`], [spread, -0.7, 0.7]);
                aim(joints[`${side}Elbow`], joints[`${side}Hand`], [0, 0.1, 1]);
            }
        }
        // The idle clip resets the bones each frame; these small gestures never accumulate.
        const gesture = Math.sin(time * 0.0007 + actor.phase);
        joints.head.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 0, 1), gesture * 0.045));
    }

    bindControls(canvas) {
        const options = { signal: this.lifetime.signal };
        canvas.addEventListener('webglcontextlost', event => {
            event.preventDefault();
            this.onError(new Error('Tavern graphics context lost. The illustrated room is still available.'));
            this.dispose();
        }, options);
        canvas.addEventListener('pointerdown', event => {
            if (event.button !== 0 || this.drag) {
                return;
            }
            canvas.focus({ preventScroll: true });
            canvas.setPointerCapture(event.pointerId);
            this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }, options);
        canvas.addEventListener('pointermove', event => {
            if (this.drag?.id !== event.pointerId) {
                return;
            }
            this.orbit((this.drag.x - event.clientX) * 0.004, (event.clientY - this.drag.y) * 0.003);
            this.drag.x = event.clientX;
            this.drag.y = event.clientY;
        }, options);
        for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
            canvas.addEventListener(name, event => {
                if (this.drag?.id === event.pointerId) {
                    this.drag = null;
                }
            }, options);
        }
        canvas.addEventListener('wheel', event => {
            if (document.activeElement !== canvas) {
                return;
            }
            event.preventDefault();
            this.zoom(Math.sign(event.deltaY) * 0.6);
        }, { ...options, passive: false });
        canvas.addEventListener('keydown', event => {
            const actions = {
                ArrowLeft: () => this.orbit(-0.08, 0), ArrowRight: () => this.orbit(0.08, 0),
                ArrowUp: () => this.orbit(0, 0.05), ArrowDown: () => this.orbit(0, -0.05),
                '+': () => this.zoom(-0.6), '=': () => this.zoom(-0.6), '-': () => this.zoom(0.6),
                Home: () => this.resetCamera()
            };
            if (actions[event.key]) {
                event.preventDefault();
                event.stopPropagation();
                actions[event.key]();
            }
        }, options);
    }

    resetCamera() {
        if (!this.config) {
            return;
        }
        const { radius, azimuth, elevation } = this.cameraSettings();
        this.view = { radius, azimuth, elevation };
        for (const name of this.config.overviewHiddenMeshes || []) {
            const mesh = this.room?.getObjectByName(name);
            if (mesh) {
                mesh.visible = this.cameraMode !== 'overview';
            }
        }
        this.updateCamera();
    }

    cameraSettings() {
        return this.cameraMode === 'overview' ? this.config.overviewCamera : this.config.camera;
    }

    setCameraMode(mode) {
        if (!['entrance', 'overview'].includes(mode)) {
            return;
        }
        this.cameraMode = mode;
        this.resetCamera();
    }

    orbit(horizontal, vertical) {
        if (!this.view) {
            return;
        }
        const config = this.cameraSettings();
        this.view.azimuth = THREE.MathUtils.clamp(this.view.azimuth + horizontal, config.minAzimuth, config.maxAzimuth);
        this.view.elevation = THREE.MathUtils.clamp(this.view.elevation + vertical,
            config.minElevation, config.maxElevation);
        this.updateCamera();
    }

    zoom(delta) {
        if (!this.view) {
            return;
        }
        this.view.radius = THREE.MathUtils.clamp(this.view.radius + delta,
            this.cameraSettings().minRadius, this.cameraSettings().maxRadius);
        this.updateCamera();
    }

    updateCamera() {
        if (!this.view || this.disposed) {
            return;
        }
        const { radius, azimuth, elevation } = this.view;
        const settings = this.cameraSettings();
        const target = new THREE.Vector3(...settings.target);
        this.camera.fov = settings.fieldOfView;
        if (this.cameraMode === 'entrance') {
            this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(
                Math.tan(THREE.MathUtils.degToRad(settings.fieldOfView / 2)) *
                Math.max(1, 1.35 / this.camera.aspect)));
        }
        const direction = new THREE.Vector3(Math.sin(azimuth) * Math.cos(elevation),
            Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation));
        const right = new THREE.Vector3(Math.cos(azimuth), 0, -Math.sin(azimuth));
        const up = new THREE.Vector3().crossVectors(direction, right);
        const verticalTangent = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
        const horizontalTangent = verticalTangent * (this.camera.aspect || 1);
        let fittedRadius = settings.radius;
        if (this.roomBounds && this.cameraMode === 'overview') {
            const { min, max } = this.roomBounds;
            for (const x of [min.x, max.x]) {
                for (const y of [min.y, max.y]) {
                    for (const z of [min.z, max.z]) {
                        const corner = new THREE.Vector3(x, y, z).sub(target);
                        const depth = corner.dot(direction);
                        fittedRadius = Math.max(fittedRadius,
                            depth + Math.abs(corner.dot(right)) * 1.08 / horizontalTangent,
                            depth + Math.abs(corner.dot(up)) * 1.08 / verticalTangent);
                    }
                }
            }
        }
        // Fit the actual cutaway at the default zoom; intentional zooming can still inspect close details.
        const responsiveRadius = radius / settings.radius * fittedRadius;
        this.camera.position.copy(direction).multiplyScalar(responsiveRadius).add(target);
        this.camera.lookAt(target);
        this.camera.updateProjectionMatrix();
        this.needsRender = true;
    }

    resize() {
        if (this.disposed) {
            return;
        }
        const width = Math.max(1, this.host.clientWidth), height = Math.max(1, this.host.clientHeight);
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.updateCamera();
    }

    render(time) {
        if (this.disposed) {
            return;
        }
        const delta = Math.min(0.05, Math.max(0, (time - (this.lastTime || time)) / 1000));
        this.lastTime = time;
        if (!document.hidden && this.host.isConnected && this.host.clientWidth > 0) {
            if (!this.motion.matches) {
                for (const { light, spec } of this.lights) {
                    if (spec.flicker) {
                        light.intensity = spec.intensity * (1 + Math.sin(time * 0.005) * 0.045);
                    }
                }
                for (const actor of this.actors) {
                    actor.art?.animator?.mixer.update(delta);
                    this.poseInhabitant(actor, time);
                }
            }
            if (!this.motion.matches || this.needsRender) {
                this.renderer.render(this.scene, this.camera);
                this.needsRender = false;
            }
        }
        this.frame = requestAnimationFrame(next => this.render(next));
    }

    releaseRoom() {
        const materials = new Set(), textures = new Set();
        this.room?.traverse(node => {
            node.geometry?.dispose();
            for (const material of [].concat(node.material || [])) {
                materials.add(material);
                for (const value of Object.values(material)) {
                    if (value?.isTexture) {
                        textures.add(value);
                    }
                }
            }
        });
        materials.forEach(material => material.dispose());
        textures.forEach(texture => {
            texture.source?.data?.close?.();
            texture.dispose();
        });
        this.room = null;
    }

    dispose() {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.lifetime.abort();
        cancelAnimationFrame(this.frame);
        this.resizeObserver?.disconnect();
        this.actors.forEach(actor => actor.art?.animator?.mixer.stopAllAction());
        this.assets?.dispose();
        this.actorGeometries.forEach(geometry => geometry.dispose());
        this.actorGeometries.clear();
        this.releaseRoom();
        this.scene?.traverse(node => node.shadow?.dispose());
        this.renderer?.dispose();
        this.renderer?.domElement.remove();
    }
}
