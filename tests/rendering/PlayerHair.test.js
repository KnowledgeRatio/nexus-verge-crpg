import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { CombatArtAssets } from '../../src/rendering/CombatArtAssets.js';
import { selectedPlayerParts } from '../../src/ui/CombatPresentation.js';
import { AnimationMixer, Box3, Texture } from '../../vendor/three/three.module.min.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
describe('Modular player hair', () => {
    it('retains facial geometry and isolates hair visibility and skeletons between actors', async () => {
        const bytes = readFileSync(new URL('../../data/graphics/combat/traveller-modular.glb', import.meta.url));
        const loader = new GLTFLoader().register(() => ({ name: 'test-texture-decoder',
            loadTexture: () => Promise.resolve(new Texture()) }));
        const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        const assets = new CombatArtAssets(config.artAssets);
        assets.templates.set('traveller', gltf.scene);
        const models = {};
        for (const hairstyle of ['swept', 'cropped', 'bald']) {
            const saved = JSON.parse(JSON.stringify({ combatAppearance: { parts: { hairstyle } } }));
            const parts = selectedPlayerParts(config, saved);
            const model = assets.create('traveller', parts.materialTints, parts.hiddenMaterials, parts.meshVariants);
            models[hairstyle] = model;
            expect(model.getObjectByName('HairSwept').visible).toBe(hairstyle === 'swept');
            expect(model.getObjectByName('HairCropped').visible).toBe(hairstyle === 'cropped');
            expect(model.getObjectByName('Brow').visible).toBe(true);
            expect(model.getObjectByName('Brow').geometry.index.count).toBeGreaterThan(0);
            const mixer = new AnimationMixer(model);
            for (const name of ['Sword_Idle', 'Ranged_Bow_Shot', 'Death01']) {
                mixer.stopAllAction();
                mixer.clipAction(gltf.animations.find(clip => clip.name === name)).play();
                mixer.setTime(.3); model.updateMatrixWorld(true);
                const head = new Box3().setFromObject(model.getObjectByName('Neck'), true);
                const hair = new Box3().setFromObject(model.getObjectByName(hairstyle === 'cropped' ? 'HairCropped' : 'HairSwept'), true);
                expect(head.distanceToPoint(hair.getCenter(head.min.clone()))).toBeLessThan(.2);
            }
        }
        expect(models.bald.getObjectByName('HairSwept').skeleton).not.toBe(models.swept.getObjectByName('HairSwept').skeleton);
        expect(models.swept.getObjectByName('HairSwept').visible).toBe(true);
        expect(assets.create('traveller').getObjectByName('HairCropped').visible).toBe(false);
        expect(selectedPlayerParts(config, { combatAppearance: { parts: { hairstyle: 'invalid' } } }).meshVariants.hairstyle).toBe('swept');
        assets.dispose();
    });
});

describe('Independent clothing shapes on the shared player rig', () => {
    it('conceals hair under a hood per actor and restores the saved hairstyle when uncovered', async () => {
        const bytes = readFileSync(new URL('../../data/graphics/combat/traveller-modular.glb', import.meta.url));
        const loader = new GLTFLoader().register(() => ({ name: 'test-texture-decoder',
            loadTexture: () => Promise.resolve(new Texture()) }));
        const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        const assets = new CombatArtAssets(config.artAssets); assets.templates.set('traveller', gltf.scene);
        const saved = JSON.parse(JSON.stringify({ combatAppearance: { parts: { hairstyle: 'cropped', headwear: 'hood' } } }));
        const parts = selectedPlayerParts(config, saved);
        const hooded = assets.create('traveller', { 'Slate woven coat': '#c19051' }, [], parts.meshVariants);
        expect(hooded.getObjectByName('TravelHood').visible).toBe(true);
        expect(hooded.getObjectByName('TravelHood').material.color.getHexString()).toBe('c19051');
        expect(hooded.getObjectByName('HairCropped').visible).toBe(false);
        expect(hooded.getObjectByName('HairSwept').visible).toBe(false);
        saved.combatAppearance.parts.headwear = 'none';
        const uncovered = assets.create('traveller', {}, [], selectedPlayerParts(config, saved).meshVariants);
        expect(uncovered.getObjectByName('HairCropped').visible).toBe(true);
        expect(uncovered.getObjectByName('TravelHood').visible).toBe(false);
        expect(hooded.getObjectByName('TravelHood').visible).toBe(true);
        const mixer = new AnimationMixer(hooded);
        for (const name of ['Sword_Idle', 'Ranged_Bow_Shot', 'Death01', 'Prone_Idle']) {
            mixer.stopAllAction();
            const clip = gltf.animations.find(c => c.name === name); mixer.clipAction(clip).play();
            for (const fraction of [.1, .5, .9]) {
                mixer.setTime(clip.duration * fraction); hooded.updateMatrixWorld(true);
                const head = new Box3().setFromObject(hooded.getObjectByName('Neck'), true);
                const hood = new Box3().setFromObject(hooded.getObjectByName('TravelHood'), true);
                expect(head.distanceToPoint(hood.getCenter(head.min.clone()))).toBeLessThan(.1);
            }
        }
        assets.dispose();
    });
    it('preserves sleeves and boot interfaces while independently switching coat and trousers through combat poses', async () => {
        const bytes = readFileSync(new URL('../../data/graphics/combat/traveller-modular.glb', import.meta.url));
        const loader = new GLTFLoader().register(() => ({ name: 'test-texture-decoder',
            loadTexture: () => Promise.resolve(new Texture()) }));
        const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        const assets = new CombatArtAssets(config.artAssets);
        assets.templates.set('traveller', gltf.scene);
        for (const [original, variant, stable] of [
            ['CoatLong', 'CoatShort', y => y >= .94],
            ['TrousersFitted', 'TrousersGathered', y => y < .51 || y > .91]
        ]) {
            const a = gltf.scene.getObjectByName(original).geometry.attributes.position;
            const b = gltf.scene.getObjectByName(variant).geometry.attributes.position;
            let changed = 0;
            for (let i = 0; i < a.count; i++) {
                const before = [a.getX(i), a.getY(i), a.getZ(i)];
                const after = [b.getX(i), b.getY(i), b.getZ(i)];
                if (stable(a.getY(i))) {
                    expect(after).toEqual(before);
                }
                if (before.some((value, axis) => value !== after[axis])) {
                    changed++;
                }
            }
            expect(changed).toBeGreaterThan(20);
        }
        for (const torso of ['long', 'short']) {
            for (const legShape of ['fitted', 'gathered']) {
                const saved = JSON.parse(JSON.stringify({ combatAppearance: { parts: { torso, legShape } } }));
                const parts = selectedPlayerParts(config, saved);
                const model = assets.create('traveller', {}, [], parts.meshVariants);
                expect(model.getObjectByName('CoatShort').visible).toBe(torso === 'short');
                expect(model.getObjectByName('CoatLong').visible).toBe(torso === 'long');
                expect(model.getObjectByName('TrousersGathered').visible).toBe(legShape === 'gathered');
                expect(model.getObjectByName('TrousersFitted').visible).toBe(legShape === 'fitted');
                const mixer = new AnimationMixer(model);
                for (const name of ['Sword_Idle', 'Ranged_Bow_Shot', 'Walk_Loop', 'Death01', 'Prone_Idle']) {
                    mixer.stopAllAction();
                    const clip = gltf.animations.find(animation => animation.name === name);
                    mixer.clipAction(clip).play();
                    for (const fraction of [.1, .5, .9]) {
                        mixer.setTime(clip.duration * fraction); model.updateMatrixWorld(true);
                        const box = new Box3().setFromObject(model, true);
                        expect([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)).toBe(true);
                        expect(box.max.y - box.min.y).toBeLessThan(2.5);
                    }
                }
            }
        }
        assets.dispose();
    });
});
