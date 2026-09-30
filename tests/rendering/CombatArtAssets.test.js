import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { CombatArtAssets, attachCharacterArt, mountCharacterWeapon, mountCharacterOffHand,
    poseCharacterArt, encounterArtConfig } from '../../src/rendering/CombatArtAssets.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url), 'utf8'));
const assetConfig = config.artAssets;

describe('Authored combat assets', () => {
    it.each(['shadow', 'specter', 'wraith'])('attaches the unarmed %s without weapon mount metadata', async id => {
        const bytes = readFileSync(new URL(`../../${assetConfig.models[id].url}`, import.meta.url));
        const gltf = await new GLTFLoader().parseAsync(
            bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        const assets = new CombatArtAssets(assetConfig);
        assets.templates.set(id, gltf.scene);
        assets.animations.set(id, gltf.animations);
        const actor = { body: new THREE.Group(), weapon: new THREE.Group(), weaponModel: 'unarmed',
            appearance: { asset: id }, legacyParts: new THREE.Group() };
        try {
            attachCharacterArt(actor, assets);
            expect(actor.artUnavailable).not.toBe(true);
            expect(actor.art.animator).toBeDefined();
            expect(actor.weapon.position.toArray()).toEqual([0, 0, 0]);
        } finally {
            actor.art?.animator?.dispose(); assets.dispose();
        }
    });

    it('loads only the selected terrain and distinct roster bodies, including player clothing variants', async () => {
        const load = vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async () =>
            ({ scene: new THREE.Group(), animations: [] }));
        const original = config.artAssets.characterModels.slice();
        const roster = [{ appearance: 'travellerSlate' }, { appearance: 'travellerOchre' },
            { appearance: 'zombie' }, { appearance: 'zombie' }];
        const selected = encounterArtConfig(config, roster);
        const assets = new CombatArtAssets(selected);
        try {
            await assets.load();
            expect(new Set(load.mock.calls.map(([url]) => url))).toEqual(new Set([
                selected.models.traveller.url, selected.models.zombie.url,
                selected.models[selected.environment].url
            ]));
            expect(config.artAssets.characterModels).toEqual(original);
            expect(assets.templates.has('wolf')).toBe(false);
            expect(assets.templates.has('zombie')).toBe(true);
        } finally {
            assets.dispose(); load.mockRestore();
        }
    });

    it('does not download the full catalogue for an explicitly empty roster without scenery', async () => {
        const load = vi.spyOn(GLTFLoader.prototype, 'loadAsync');
        const selected = encounterArtConfig({ ...config, artAssets: { ...assetConfig, environment: null } }, []);
        const assets = new CombatArtAssets(selected);
        try {
            await assets.load();
            expect(load).not.toHaveBeenCalled();
        } finally {
            assets.dispose(); load.mockRestore();
        }
    });
    it('bounds concurrent model loads for a populated encounter', async () => {
        let inFlight = 0;
        let peak = 0;
        const load = vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async () => {
            inFlight++;
            peak = Math.max(peak, inFlight);
            await new Promise(resolve => setTimeout(resolve, 2));
            inFlight--;
            return { scene: new THREE.Group(), animations: [] };
        });
        const ids = ['traveller', 'zombie', 'wolf', 'skeleton', 'orc'];
        const assets = new CombatArtAssets({ enabled: true, models: Object.fromEntries(ids.map(id =>
            [id, assetConfig.models[id]])), characterModels: ids, environment: null });
        try {
            await assets.load();
            expect(load).toHaveBeenCalledTimes(ids.length);
            expect(peak).toBeLessThanOrEqual(3);
            expect(peak).toBeGreaterThan(1);
        } finally {
            assets.dispose(); load.mockRestore();
        }
    });
    it('hides optional clothing on one cloned actor without changing other actors or source meshes', async () => {
        const bytes = readFileSync(new URL(`../../${assetConfig.models.traveller.url}`, import.meta.url));
        const loader = new GLTFLoader().register(() => ({ name: 'test-texture-decoder',
            loadTexture: () => Promise.resolve(new THREE.Texture()) }));
        const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        const assets = new CombatArtAssets(assetConfig);
        assets.templates.set('traveller', gltf.scene);
        const bare = assets.create('traveller', {}, ['Blue grey scarf']);
        const dressed = assets.create('traveller');
        const scarves = model => {
            const meshes = [];
            model.traverse(node => {
                if ([node.material].flat().some(material => material?.name === 'Blue grey scarf')) {
                    meshes.push(node);
                }
            });
            return meshes;
        };
        expect(scarves(bare).length).toBeGreaterThan(0);
        expect(scarves(bare).every(mesh => !mesh.visible)).toBe(true);
        expect(scarves(dressed).every(mesh => mesh.visible)).toBe(true);
        expect(scarves(gltf.scene).every(mesh => mesh.visible)).toBe(true);
        assets.dispose();
    });
    it.each([
        ['settlement', 'Detailed street paving material', 'Street floor'],
        ['dungeon', 'Detailed dungeon paving material', 'Dungeon floor'],
        ['waystation', 'Detailed courtyard paving material', 'Courtyard floor']
    ])('preserves the detailed %s floor image at the fallback texture scale', async (id, materialName, groupName) => {
        const source = readFileSync(new URL(`../../${assetConfig.models[id].url}`, import.meta.url));
        const json = JSON.parse(source.toString('utf8', 20, 20 + source.readUInt32LE(12)));
        const material = json.materials.find(entry => entry.name === materialName);
        const texture = json.textures[material.pbrMetallicRoughness.baseColorTexture.index];
        expect(json.images[texture.source].name).toMatch(/^dungeon-flagstone-v1/);
        const loader = new GLTFLoader().register(() => ({ name: 'test-texture-decoder',
            loadTexture: () => Promise.resolve(new THREE.Texture()) }));
        const gltf = await loader.parseAsync(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength), '');
        const group = gltf.scene.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(groupName));
        expect(group.children).toHaveLength(1);
        const floor = group.children[0];
        expect(floor.geometry.index.count / 3).toBe(12);
        const uv = floor.geometry.getAttribute('uv');
        gltf.scene.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(floor).getSize(new THREE.Vector3());
        const variant = { ...config, ...config.sceneVariants[id] };
        const size = variant.props.find(prop => prop.material === 'flagstone').size;
        for (const [axis, span, dimension] of [['x', bounds.x, 0], ['y', bounds.z, 2]]) {
            const values = Array.from({ length: uv.count }, (_, i) => axis === 'x' ? uv.getX(i) : uv.getY(i));
            const repeats = variant.materialTextures.flagstone.repeat[axis === 'x' ? 0 : 1];
            expect(Math.max(...values) - Math.min(...values)).toBeCloseTo(span * repeats / size[dimension]);
        }
    });
    it.each([
        ['woodland', ['Pine 0', 'Pine 4', 'Uneven woodland verge']],
        ['woodlandGlade', ['Pine 0', 'Pine 4', 'Uneven woodland verge']],
        ['woodlandBend', ['Pine 0', 'Pine 4', 'Uneven woodland verge']],
        ['grassland', ['Uneven woodland verge']],
        ['mountain', ['Uneven woodland verge']],
        ['desert', ['A wind-scoured dune hollow']],
        ['snowyPlains', ['A windswept snowfield']],
        ['snowForest', ['Pine 0', 'Pine 4']],
        ['hills', ['A rolling hillside saddle']],
        ['desertHills', ['An eroded sandstone pass']],
        ['plains', ['An open grass plain']],
        ['tundra', ['A lichen-covered tundra shelf']],
        ['beach', ['A tidal strand']],
        ['shallowWater', ['A broad shallow ford']],
        ['swamp', ['Weathered snag 0', 'Weathered snag 1']],
        ['denseForest', ['Broadleaf tree 0', 'Frond plant 0']],
        ['jungle', ['Broadleaf tree 0', 'Frond plant 0', 'Frond plant 4']],
        ['savanna', ['Broadleaf tree 0', 'Broadleaf tree 1']],
        ['road', ['A frontier road']],
        ['bridge', ['A broad timber crossing']],
        ['farmland', ['A farm field headland']],
        ['camp', ['Canvas tent 0', 'Canvas tent 1']],
        ['cave', ['Natural rock arch 0']],
        ['ruins', ['Masonry arch 0']],
        ['temple', ['Masonry arch 0']],
        ['monastery', ['Masonry arch 0', 'Masonry arch 2']],
        ['watchtower', ['A watchtower forecourt']],
        ['villa', ['Building frontage 0']],
        ['residential', ['Building frontage 0', 'Building frontage 1']],
        ['industrial', ['Building frontage 0']],
        ['dungeonDoor', ['Masonry arch 0']],
        ['dungeonExit', ['Stairs toward daylight']],
        ['dungeonTreasure', ['A forgotten strongroom']],
        ['dungeonTrap', ['An ancient pressure-plate hall']],
        ['dungeonAltar', ['A subterranean ritual altar']],
        ['dungeonRubble', ['A collapsed underground gallery']],
        ['dungeonWeb', ['A web-choked crypt']],
        ['dungeonIce', ['A frostbound vault']],
        ['dungeonMushroom', ['A fungal cavern']],
        ['dungeonBones', ['An ossuary gallery']],
        ['dungeon', ['Passage arch', 'Left wall', 'Right wall', 'Left buttress', 'Right buttress',
            'Left passage return', 'Right passage return', 'Timber repair', 'Dungeon floor']],
        ['settlement', ['Left frontage', 'Right frontage', 'Left frontage roof', 'Right frontage roof',
            'Alley lintel', 'Market stall', 'Stacked crates', 'Street floor']]
    ])('keeps %s modules reusable and tall scenery outside the combat clearing', async (id, modules) => {
        const source = readFileSync(new URL(`../../${assetConfig.models[id].url}`, import.meta.url));
        const loader = new GLTFLoader().register(() => ({ name: 'test-texture-decoder',
            loadTexture: () => Promise.resolve(new THREE.Texture()) }));
        const gltf = await loader.parseAsync(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength), '');
        for (const name of modules) {
            const module = gltf.scene.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
            expect(module, name).toBeDefined();
            expect(module.children.length).toBeGreaterThan(0);
        }
        const rear = config.sceneVariants[id].composition.rearZ;
        gltf.scene.updateMatrixWorld(true);
        let terrainSlopeMeshes = 0;
        gltf.scene.traverse(node => {
            if (!node.isMesh) {
                return;
            }
            if (node.material.map) {
                expect(node.geometry.getAttribute('uv'), `${id}: ${node.name} texture coordinates`).toBeDefined();
            }
            const bounds = new THREE.Box3().setFromObject(node, true);
            if (config.sceneVariants[id].authoring?.softBanks && node.name.startsWith('Distant_terrain_rise')) {
                terrainSlopeMeshes++;
                const normals = node.geometry.getAttribute('normal');
                const normalMatrix = new THREE.Matrix3().getNormalMatrix(node.matrixWorld);
                for (let i = 0; i < normals.count; i++) {
                    expect(new THREE.Vector3().fromBufferAttribute(normals, i)
                        .applyNormalMatrix(normalMatrix).y).toBeGreaterThan(0);
                }
            }
            if (bounds.max.y > 0.4) {
                expect(bounds.max.z, node.name).toBeLessThan(rear + 0.7);
            }
        });
        if (config.sceneVariants[id].authoring?.softBanks) {
            expect(terrainSlopeMeshes).toBeGreaterThan(0);
        }
    });
    it('attaches a shield independently and follows the off-hand joint without altering the weapon', () => {
        const hand = new THREE.Group();
        const weapon = new THREE.Group();
        const body = new THREE.Group();
        body.add(hand, weapon);
        const actor = { body, weapon, offHand: new THREE.Group(), offHandModel: 'roundShield',
            art: { joints: { leftHand: hand } } };
        mountCharacterOffHand(actor, config);
        expect(actor.offHand.parent).toBe(hand);
        expect(weapon.parent).toBe(body);
        const before = actor.offHand.getWorldPosition(new THREE.Vector3());
        hand.position.x += 0.4;
        const after = actor.offHand.getWorldPosition(new THREE.Vector3());
        expect(after.x - before.x).toBeCloseTo(0.4);
        expect(actor.offHand.visible).toBe(true);
    });
    it('ships complete local glTF dependencies with every configured attachment node', () => {
        for (const spec of Object.values(assetConfig.models)) {
            const buffer = readFileSync(new URL(`../../${spec.url}`, import.meta.url));
            expect(buffer.toString('ascii', 0, 4)).toBe('glTF');
            expect(buffer.readUInt32LE(4)).toBe(2);
            expect(buffer.readUInt32LE(8)).toBe(buffer.length);
            const length = buffer.readUInt32LE(12);
            const gltf = JSON.parse(buffer.toString('utf8', 20, 20 + length));
            expect(gltf.meshes.length).toBeGreaterThan(0);
            expect(gltf.buffers.every(entry => !entry.uri)).toBe(true);
            for (const image of gltf.images || []) {
                if (image.bufferView !== undefined) {
                    expect(gltf.bufferViews[image.bufferView]).toBeDefined();
                    expect(image.uri).toBeUndefined();
                } else {
                    // Shared textures must remain packaged locally, never fetched from a remote host.
                    expect(image.uri).toMatch(/^textures\/[A-Za-z0-9_-]+\.png$/);
                    const assetURL = new URL(`../../${spec.url}`, import.meta.url);
                    const png = readFileSync(new URL(image.uri, assetURL));
                    expect(Array.from(png.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
                }
            }
            for (const name of Object.values(spec.joints || {})) {
                expect(gltf.nodes.filter(node => node.name === name)).toHaveLength(1);
            }
            if (spec.joints) {
                if (spec.rig === 'rigidNodes') {
                    expect(gltf.animations.some(clip => clip.channels.some(channel =>
                        gltf.nodes[channel.target.node].children?.length))).toBe(true);
                } else {
                    expect(gltf.skins.length).toBeGreaterThan(0);
                    expect(gltf.meshes.some(mesh => mesh.primitives.some(part =>
                        part.attributes.JOINTS_0 !== undefined && part.attributes.WEIGHTS_0 !== undefined))).toBe(true);
                }
                const clipNames = new Set((gltf.animations || []).map(clip => clip.name));
                for (const entry of [spec.motion?.idle, spec.motion?.walk,
                    ...Object.values(spec.motion?.idles || {}),
                    ...Object.values(spec.motion?.offHandIdles || {}),
                    ...Object.values(spec.motion?.actions || {}),
                    ...Object.values(spec.motion?.conditions || {}),
                    ...Object.values(spec.motion?.conditions || {}).flatMap(condition =>
                        Object.values(condition.actions || {}))]) {
                    if (entry?.clip) {
                        expect(clipNames.has(entry.clip), `Missing configured clip ${entry.clip}`).toBe(true);
                    }
                    for (const clip of Object.values(entry?.handClips || {})) {
                        expect(clipNames.has(clip), `Missing handed clip ${clip}`).toBe(true);
                    }
                }
            } else {
                expect(gltf.skins).toBeUndefined();
            }
        }
    });

    it('attaches weapons in the existing forward frame and keeps cloned joints independent', () => {
        const assets = new CombatArtAssets(assetConfig);
        const template = new THREE.Group();
        template.rotation.x = -Math.PI / 2;
        for (const name of Object.values(assetConfig.models.traveller.joints)) {
            const joint = new THREE.Group();
            joint.name = THREE.PropertyBinding.sanitizeNodeName(name);
            template.add(joint);
        }
        assets.templates.set('traveller', template);
        const makeActor = () => ({ body: new THREE.Group(), weapon: new THREE.Group(), weaponModel: 'carbine',
            appearance: { asset: 'traveller' }, legacyParts: new THREE.Group() });
        const a = makeActor();
        const b = makeActor();
        attachCharacterArt(a, assets);
        attachCharacterArt(b, assets);
        // This fixture deliberately has no limb hierarchy: exercise legacy fallback.
        a.art.stances = null;
        b.art.stances = null;
        a.body.updateWorldMatrix(true, true);
        expect(a.weapon.getWorldDirection(new THREE.Vector3()).distanceTo(new THREE.Vector3(0, 0, 1)))
            .toBeLessThan(0.00001);
        expect(a.art.grip.parent).toBe(a.art.joints.rightHand);
        expect(a.weapon.position.toArray())
            .toEqual(assetConfig.models.traveller.weaponMounts.carbine.anchor.map(n => -n));
        a.weaponModel = 'bow';
        mountCharacterWeapon(a);
        expect(a.art.grip.parent).toBe(a.art.joints.leftHand);
        expect(a.weapon.position.toArray())
            .toEqual(assetConfig.models.traveller.weaponMounts.bow.anchor.map(n => -n));
        expect(a.weapon.getWorldDirection(new THREE.Vector3()).distanceTo(new THREE.Vector3(0, 0, 1)))
            .toBeLessThan(0.00001);
        expect(a.legacyParts.visible).toBe(false);
        poseCharacterArt(a, { now: 100, moving: true, animated: true, strike: { weapon: 0 } });
        expect(a.art.joints.leftLeg.rotation.x).not.toBe(0);
        expect(b.art.joints.leftLeg.rotation.x).toBeCloseTo(0);
        poseCharacterArt(a, { now: 200, moving: true, animated: false, strike: { weapon: 0 } });
        expect(a.art.joints.leftLeg.rotation.x).toBeCloseTo(0);
        const melee = makeActor();
        melee.weaponModel = 'sword';
        attachCharacterArt(melee, assets);
        melee.body.updateWorldMatrix(true, true);
        const blade = new THREE.Vector3(0, 1, 0).applyQuaternion(
            melee.art.grip.getWorldQuaternion(new THREE.Quaternion()));
        expect(blade.length()).toBeCloseTo(1);
        expect(melee.weapon.position.toArray())
            .toEqual(assetConfig.models.traveller.weaponMounts.sword.anchor.map(n => -n));
    });

    it('plants staggered feet with bent knees and supports the firearm in reduced motion', () => {
        const assets = new CombatArtAssets(assetConfig);
        const template = new THREE.Group();
        const spec = assetConfig.models.traveller;
        const nodes = {};
        const add = (key, position, parentKey) => {
            const joint = new THREE.Group();
            joint.name = THREE.PropertyBinding.sanitizeNodeName(spec.joints[key]);
            const parent = nodes[parentKey] || template;
            parent.add(joint);
            template.updateWorldMatrix(true, true);
            joint.position.copy(parent.worldToLocal(new THREE.Vector3(...position)));
            nodes[key] = joint;
        };
        for (const [side, sign] of [['left', -1], ['right', 1]]) {
            add(`${side}Leg`, [sign * 0.115, 0.91, 0]);
            add(`${side}Knee`, [sign * 0.14, 0.51, 0.01], `${side}Leg`);
            add(`${side}Ankle`, [sign * 0.14, 0.09, 0.01], `${side}Knee`);
            add(`${side}Arm`, [sign * 0.235, 1.4, 0]);
            add(`${side}Elbow`, [sign * 0.315, 1.12, 0.035], `${side}Arm`);
            add(`${side}Hand`, [sign * 0.30, 0.93, 0.13], `${side}Elbow`);
            add(`${side}Coat`, [sign * 0.12, 1.02, 0]);
        }
        add('spine', [0, 1.05, 0]);
        add('head', [0, 1.6, 0]);
        // Match the exported rig: local -Y is the face, local +Z is up.
        nodes.head.rotation.x = -Math.PI / 2;
        assets.templates.set('traveller', template);
        const actor = { body: new THREE.Group(), weapon: new THREE.Group(), weaponModel: 'carbine', legacyParts: new THREE.Group(),
            appearance: { asset: 'traveller' }, combatant: { id: 'guard', hp: 10, weaponAction: 'firearm' } };
        attachCharacterArt(actor, assets);
        poseCharacterArt(actor, { now: 100, moving: false, animated: false, strike: { weapon: 0 } });
        actor.body.updateWorldMatrix(true, true);
        const stance = spec.stances.firearm;
        for (const side of ['left', 'right']) {
            const foot = actor.art.joints[`${side}Ankle`];
            const hand = actor.art.joints[`${side}Hand`];
            expect(foot.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(...stance.feet[side])))
                .toBeLessThan(0.00001);
            expect(hand.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(...stance.hands[side])))
                .toBeLessThan(0.00001);
            expect(foot.getWorldQuaternion(new THREE.Quaternion()).angleTo(new THREE.Quaternion()))
                .toBeLessThan(0.00001);
            expect(actor.art.joints[`${side}Knee`].quaternion.angleTo(new THREE.Quaternion())).toBeGreaterThan(0.1);
        }
        expect(actor.weapon.getWorldDirection(new THREE.Vector3()).distanceTo(new THREE.Vector3(0, 0, 1)))
            .toBeLessThan(0.00001);
        const before = actor.art.joints.leftHand.getWorldPosition(new THREE.Vector3());
        poseCharacterArt(actor, { now: 3200, moving: false, animated: true, strike: { weapon: 0 } });
        expect(actor.art.joints.leftHand.getWorldPosition(new THREE.Vector3()).distanceTo(before))
            .toBeLessThan(0.00001);
        const mount = spec.weaponMounts.carbine;
        actor.body.updateWorldMatrix(true, true);
        const support = actor.weapon.localToWorld(new THREE.Vector3(...mount.supportPoint));
        const unsupportedDistance = actor.art.joints.leftHand.getWorldPosition(new THREE.Vector3()).distanceTo(support);
        actor.art.animator = {};
        poseCharacterArt(actor, { now: 3200, moving: false, animated: true, strike: { weapon: 0 } });
        actor.body.updateWorldMatrix(true, true);
        expect(actor.art.joints.leftHand.getWorldPosition(new THREE.Vector3()).distanceTo(support))
            .toBeLessThan(unsupportedDistance);
        const headRotation = actor.art.joints.head.getWorldQuaternion(new THREE.Quaternion());
        const bodyRotation = actor.body.getWorldQuaternion(new THREE.Quaternion());
        expect(new THREE.Vector3(0, -1, 0).applyQuaternion(headRotation)
            .dot(new THREE.Vector3(0, 0, 1).applyQuaternion(bodyRotation))).toBeGreaterThan(0.999);
        expect(new THREE.Vector3(0, 0, 1).applyQuaternion(headRotation)
            .dot(new THREE.Vector3(0, 1, 0).applyQuaternion(bodyRotation))).toBeGreaterThan(0.999);
        actor.art.animator = null;
        actor.combatant.hp = 0;
        poseCharacterArt(actor, { now: 3300, moving: false, animated: false, strike: { weapon: 0 } });
        expect(actor.art.model.position.y).toBe(0);
        expect(actor.art.joints.leftKnee.quaternion.angleTo(new THREE.Quaternion())).toBeLessThan(0.00001);
    });

    it('keeps shared geometry alive until the scene asset owner is disposed', () => {
        const assets = new CombatArtAssets(assetConfig);
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshStandardMaterial();
        const releaseGeometry = vi.spyOn(geometry, 'dispose');
        const releaseMaterial = vi.spyOn(material, 'dispose');
        assets.templates.set('sample', new THREE.Mesh(geometry, material));
        const clone = assets.create('sample');
        expect(clone.geometry).toBe(geometry);
        expect(releaseGeometry).not.toHaveBeenCalled();
        assets.dispose();
        expect(releaseGeometry).toHaveBeenCalledOnce();
        expect(releaseMaterial).toHaveBeenCalledOnce();
        expect(assets.create('sample')).toBeUndefined();
    });

    it('shares textures and geometry but isolates cached palette materials between actors', () => {
        const assets = new CombatArtAssets(assetConfig);
        const texture = new THREE.Texture();
        const source = new THREE.MeshStandardMaterial({ map: texture });
        source.name = 'Scales';
        const geometry = new THREE.BoxGeometry();
        assets.templates.set('dragon', new THREE.Mesh(geometry, source));
        const red = { Scales: { shadow: '#270409', light: '#b83c24' } };
        const white = { Scales: { shadow: '#6b8c9d', light: '#f1fbff' } };
        const first = assets.create('dragon', {}, [], {}, red);
        const repeat = assets.create('dragon', {}, [], {}, red);
        const other = assets.create('dragon', {}, [], {}, white);
        expect(first.material).toBe(repeat.material);
        expect(first.material).not.toBe(other.material);
        expect(first.material).not.toBe(source);
        expect(first.geometry).toBe(other.geometry);
        expect(first.material.map).toBe(texture);
        expect(other.material.map).toBe(texture);
        const shaders = [first, other].map(model => {
            const shader = { uniforms: {}, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
            model.material.onBeforeCompile(shader);
            return shader;
        });
        expect(shaders[0].fragmentShader).toBe(shaders[1].fragmentShader);
        expect(shaders[0].uniforms.combatPaletteLight.value.getHexString()).toBe('b83c24');
        expect(shaders[1].uniforms.combatPaletteLight.value.getHexString()).toBe('f1fbff');
        expect(source.color.getHexString()).toBe('ffffff');
        const releaseTexture = vi.spyOn(texture, 'dispose');
        const releaseVariant = vi.spyOn(first.material, 'dispose');
        assets.dispose();
        expect(releaseTexture).toHaveBeenCalledOnce();
        expect(releaseVariant).toHaveBeenCalledOnce();
    });

    it('reuses tinted materials across actors without mutating the source material', () => {
        const assets = new CombatArtAssets(assetConfig);
        const source = new THREE.MeshStandardMaterial({ color: '#ffffff' });
        source.name = 'Slate woven coat';
        assets.templates.set('traveller', new THREE.Mesh(new THREE.BoxGeometry(), source));
        const tint = { 'Slate woven coat': '#8b594d' };
        const first = assets.create('traveller', tint);
        const second = assets.create('traveller', tint);
        const other = assets.create('traveller', { 'Slate woven coat': '#8ba0a5' });

        expect(first.material).toBe(second.material);
        expect(first.material).not.toBe(source);
        expect(other.material).not.toBe(first.material);
        expect(first.material.color.getHexString()).toBe('8b594d');
        expect(source.color.getHexString()).toBe('ffffff');
        assets.dispose();
    });
});
