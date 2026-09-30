import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url), 'utf8'));
const study = JSON.parse(readFileSync(new URL('../../data/combatSceneStudy.json', import.meta.url), 'utf8'));
const items = JSON.parse(readFileSync(new URL('../../data/items.json', import.meta.url), 'utf8'));
const spells = JSON.parse(readFileSync(new URL('../../data/spells.json', import.meta.url), 'utf8'));
const abilities = JSON.parse(readFileSync(new URL('../../data/abilities.json', import.meta.url), 'utf8'));
const monsters = JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url), 'utf8'));

describe('Combat scene data', () => {
    it('packages a local portrait for every player-selectable combat outfit', () => {
        for (const option of config.playerAppearances) {
            expect(config.appearances[option.id]).toBeDefined();
            expect(option.portrait).toMatch(/^combat\/portrait-[A-Za-z]+\.png$/);
            const image = readFileSync(new URL(`../../data/graphics/${option.portrait}`, import.meta.url));
            expect(Array.from(image.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
            expect(image.readUInt32BE(16)).toBe(512);
            expect(image.readUInt32BE(20)).toBe(512);
        }
    });
    it('maps canonical challenge-combat terrains even when random encounters are disabled', () => {
        const challenges = JSON.parse(readFileSync(new URL('../../data/skillChallenges.json', import.meta.url))).challenges;
        const terrains = JSON.parse(readFileSync(new URL('../../data/terrains.json', import.meta.url))).terrains;
        const canonical = new Set(terrains.map(terrain => terrain.id));
        const startsCombat = value => Boolean(value && typeof value === 'object' &&
            (value.consequences?.includes('initiateCombat') || value.triggerCombat?.length ||
                Object.values(value).some(startsCombat)));
        const forcedTerrains = new Set(Object.values(challenges).filter(startsCombat)
            .flatMap(challenge => challenge.contextualTriggers?.exploration?.terrain || [])
            .filter(id => canonical.has(id)));
        expect(forcedTerrains.has('town')).toBe(true);
        for (const terrain of forcedTerrains) {
            expect(config.sceneSelection.terrains[terrain], terrain).toBeDefined();
        }
    });
    it('maps all walkable dungeon terrains, including tiles using room-level encounter chances', () => {
        const terrains = JSON.parse(readFileSync(new URL('../../data/terrains.json', import.meta.url), 'utf8'));
        const walkable = terrains.terrains.filter(terrain => terrain.traversable && terrain.id.startsWith('dungeon'));
        expect(walkable.length).toBeGreaterThan(0);
        for (const terrain of walkable) {
            expect(config.sceneSelection.dungeonTerrains[terrain.id], terrain.id).toBeDefined();
        }
    });
    it('maps every traversable overworld terrain with a positive random-encounter modifier', () => {
        const terrains = JSON.parse(readFileSync(new URL('../../data/terrains.json', import.meta.url), 'utf8'));
        const encounterTerrains = terrains.terrains.filter(terrain => terrain.traversable &&
            terrain.encounterModifier > 0 && !terrain.id.startsWith('dungeon'));
        expect(encounterTerrains.length).toBeGreaterThan(0);
        for (const terrain of encounterTerrains) {
            expect(config.sceneSelection.terrains[terrain.id], terrain.id).toBeDefined();
        }
    });
    it('maps only canonical terrains to existing scenes and keeps woodland obstacles behind the fighting area', () => {
        const terrains = JSON.parse(readFileSync(new URL('../../data/terrains.json', import.meta.url), 'utf8'));
        const mappings = { ...config.sceneSelection.terrains, ...config.sceneSelection.dungeonTerrains };
        for (const [terrain, scenes] of Object.entries(mappings)) {
            expect(terrains.terrains.some(entry => entry.id === terrain)).toBe(true);
            for (const scene of [scenes].flat()) {
                expect(config.sceneVariants[scene]).toBeDefined();
            }
        }
        for (const woodland of Object.values(config.sceneVariants).filter(scene => scene.authoring?.trees)) {
            for (const [, z, height] of woodland.authoring.trees) {
                expect(z + height * .34).toBeLessThan(woodland.composition.rearZ);
            }
            for (const [, z, radius] of woodland.authoring.rocks) {
                expect(z + radius).toBeLessThan(woodland.composition.rearZ);
            }
            for (const [, z] of woodland.authoring.snags || []) {
                expect(z + .3).toBeLessThan(woodland.composition.rearZ);
            }
            for (const part of woodland.authoring.sceneryBoxes || []) {
                expect(part.position[2] + part.size[2] / 2).toBeLessThan(woodland.composition.rearZ);
                expect(part.size.every(size => Number.isFinite(size) && size > 0)).toBe(true);
            }
            for (const part of woodland.authoring.scenerySpheres || []) {
                expect(part.position[2] + part.size[2]).toBeLessThan(woodland.composition.rearZ);
                expect(part.size.every(size => Number.isFinite(size) && size > 0)).toBe(true);
            }
            for (const part of woodland.authoring.sceneryTubes || []) {
                expect(part.radius).toBeGreaterThan(0);
                expect(part.points.length).toBeGreaterThan(1);
                for (const point of part.points) {
                    expect(point.every(Number.isFinite)).toBe(true);
                    expect(point[2] + part.radius).toBeLessThan(woodland.composition.rearZ);
                }
            }
            for (const tent of woodland.authoring.tents || []) {
                expect(tent.position[1] + tent.size[2] / 2).toBeLessThan(woodland.composition.rearZ);
            }
            for (const facade of woodland.authoring.frontages || []) {
                expect(facade.position[1] + .4).toBeLessThan(woodland.composition.rearZ);
            }
            for (const arch of woodland.authoring.arches || []) {
                expect(arch.position[1] + arch.depth / 2).toBeLessThan(woodland.composition.rearZ);
            }
            for (const crown of woodland.authoring.broadTrees || []) {
                expect(crown.position[1] + crown.radius * 1.02).toBeLessThan(woodland.composition.rearZ);
                expect(crown.height).toBeGreaterThan(0);
                expect(crown.depth).toBeGreaterThan(0);
            }
            for (const [, z, height, reach] of woodland.authoring.fronds || []) {
                expect(z + reach * 1.17).toBeLessThan(woodland.composition.rearZ);
                expect(height).toBeGreaterThan(0);
            }
            for (const zone of woodland.authoring.wetZones || []) {
                expect(zone).toHaveLength(4);
                expect(zone.every(Number.isFinite)).toBe(true);
                expect(zone[2]).toBeGreaterThan(0);
                expect(zone[3]).toBeGreaterThan(0);
            }
            for (const [, z, , , depth] of woodland.authoring.banks || []) {
                expect(z + depth).toBeLessThan(woodland.composition.rearZ);
            }
        }
    });
    it('resolves off-hand props to canonical items, humanoid joints and scene materials', () => {
        const allItems = Object.values(items).filter(Array.isArray).flat();
        for (const entry of config.offHandVisuals) {
            expect(allItems.find(item => item.id === entry.itemId)).toBeDefined();
            const model = config.offHandModels[entry.model];
            expect(model).toBeDefined();
            expect(config.artAssets.models.traveller.joints[model.joint]).toBeDefined();
            expect(model.position).toHaveLength(3);
            expect(model.rotation).toHaveLength(3);
            for (const part of model.parts) {
                expect(config.palette[part.material]).toBeDefined();
            }
        }
    });
    it('resolves all appearance, material and geometry references', () => {
        for (const appearance of Object.values(config.appearances)) {
            expect(config.weapons[appearance.weapon]).toBeDefined();
            if (!appearance.creature) {
                expect(config.palette[appearance.cloth]).toBeDefined();
                expect(config.palette[appearance.skin]).toBeDefined();
            } else {
                expect(config.artAssets.models[appearance.asset]).toBeDefined();
            }
            expect(appearance.height).toBeGreaterThan(0);
            expect(appearance.footprintRadius).toBeGreaterThan(0);
        }
        for (const id of Object.values(config.teamAppearance)) {
            expect(config.appearances[id]).toBeDefined();
        }
        for (const mapping of Object.values(config.sizeAppearance || {})) {
            for (const id of Object.values(mapping)) {
                expect(config.appearances[id]).toBeDefined();
            }
        }
        for (const id of Object.values(config.monsterAppearance || {})) {
            expect(config.appearances[id]).toBeDefined();
        }
        for (const part of [...config.props, ...config.body, ...Object.values(config.weapons).flat()]) {
            expect(['box', 'cylinder', 'sphere', 'cone', 'ico']).toContain(part.shape);
            expect(config.palette[part.material]).toBeDefined();
            expect(part.position).toHaveLength(3);
            expect(part.size.every(Number.isFinite)).toBe(true);
        }
        for (const piece of config.rubble) {
            expect(config.palette[piece.material]).toBeDefined();
            expect(piece.position).toHaveLength(3);
            expect(piece.position.every(Number.isFinite)).toBe(true);
            expect(piece.radius).toBeGreaterThan(0);
        }
        for (const variant of Object.values(config.sceneVariants || {})) {
            for (const part of variant.props || []) {
                expect(['box', 'cylinder', 'sphere', 'cone', 'ico']).toContain(part.shape);
                expect(part.position).toHaveLength(3);
                expect(part.size.every(Number.isFinite)).toBe(true);
                expect(variant.palette?.[part.material] || config.palette[part.material]).toBeDefined();
            }
            for (const piece of variant.rubble || []) {
                expect(piece.position).toHaveLength(3);
                expect(piece.radius).toBeGreaterThan(0);
            }
            for (const [material, texture] of Object.entries(variant.materialTextures || {})) {
                expect(variant.palette?.[material] || config.palette[material]).toBeDefined();
                expect(readFileSync(new URL(`../../${texture.url}`, import.meta.url)).length).toBeGreaterThan(0);
                expect(texture.repeat).toHaveLength(2);
            }
        }
        for (const profile of Object.values(config.animation.actionProfiles)) {
            expect(config.animation[profile.pose]).toBeDefined();
            expect(profile.seconds).toBeGreaterThan(0);
            expect(profile.impact).toBeGreaterThan(0);
            expect(profile.impact).toBeLessThan(1);
        }
        for (const frames of [config.animation.strike, config.animation.recoil,
            config.animation.shoot, config.animation.draw, config.animation.cast]) {
            expect(frames[0].time).toBe(0);
            expect(frames.at(-1)).toEqual({ time: 1, lean: 0, weapon: 0 });
            for (let i = 1; i < frames.length; i++) {
                expect(frames[i].time).toBeGreaterThan(frames[i - 1].time);
                expect(Number.isFinite(frames[i].lean)).toBe(true);
                expect(Number.isFinite(frames[i].weapon)).toBe(true);
            }
        }
    });

    it('resolves study examples against game content, including legacy firearm IDs', () => {
        for (const entry of config.weaponVisuals) {
            const item = items.weapons.find(weapon => weapon.id === entry.itemId);
            expect(item).toBeDefined();
            expect(config.weapons[entry.model]).toBeDefined();
            expect(config.animation.actionProfiles[entry.action]).toBeDefined();
            if (entry.action === 'firearm') {
                expect(item.ammunition).toBe('shot');
                expect(item.weaponType).toBe('ranged');
            }
            if (entry.action === 'bow') {
                expect(item.ammunition).toBe('arrow');
            }
            if (entry.motion) {
                expect(config.artAssets.models.traveller.motion.actions[entry.motion]).toBeDefined();
            }
            if (entry.mount) {
                expect(config.artAssets.models.traveller.weaponMounts[entry.mount]).toBeDefined();
            }
            if (item.weaponType === 'melee') {
                expect(entry.motion, `${item.id}: distinct melee motion`).toBeDefined();
                expect(config.animation.actionProfiles[entry.action].contact).toBe('melee');
            }
        }
        expect(config.weaponVisuals.find(entry => entry.itemId === 'handCrossbow')?.motion).toBe('sidearm');
        expect(config.weaponVisuals.find(entry => entry.itemId === 'lightCrossbow')?.motion).toBe('longarm');
        expect(config.weaponVisuals.find(entry => entry.itemId === 'heavyCrossbow')?.motion).toBe('longarm');
        expect(config.weaponVisuals.find(entry => entry.itemId === 'shortbow')?.motion).toBe('bow');
        expect(config.weaponVisuals.find(entry => entry.itemId === 'longbow')?.motion).toBe('bow');
        expect(config.weaponVisuals.find(entry => entry.itemId === 'dagger')?.motion).toBe('meleeStab1h');
        expect(config.weaponVisuals.find(entry => entry.itemId === 'greataxe')?.motion).toBe('meleeChop2h');
        expect(config.weaponVisuals.find(entry => entry.itemId === 'pike')?.motion).toBe('meleeStab2h');
        expect(config.weaponVisuals.find(entry => entry.itemId === 'sling')?.motion).toBe('throw');
        expect(config.artAssets.models.traveller.modelRotation).toHaveLength(3);
        expect(config.artAssets.models.traveller.headRotation).toHaveLength(3);
        expect(config.artAssets.models.traveller.headRotation.every(Number.isFinite)).toBe(true);
        expect(config.artAssets.models.traveller.headAim).toBe(true);
        for (const [model, mount] of Object.entries(config.artAssets.models.traveller.weaponMounts)) {
            expect(config.weapons[mount.model || model]).toBeDefined();
            expect(['left', 'right']).toContain(mount.hand);
            expect(mount.anchor).toHaveLength(3);
            expect(mount.anchor.every(Number.isFinite)).toBe(true);
            if (mount.align) {
                expect(mount.align).toBe('forward');
            }
            if (mount.rotation) {
                expect(mount.rotation).toHaveLength(3);
            }
            if (mount.supportHand) {
                expect(['left', 'right']).toContain(mount.supportHand);
                expect(mount.supportHand).not.toBe(mount.hand);
                expect(mount.supportPoint).toHaveLength(3);
            }
        }
        for (const entry of config.actionVisuals) {
            if (entry.model) {
                expect(config.weapons[entry.model]).toBeDefined();
            }
            expect(config.animation.actionProfiles[entry.action]).toBeDefined();
        }
        const allSpells = Object.values(spells.spells).filter(Array.isArray).flat();
        const allAbilities = Object.values(abilities.abilities).filter(Array.isArray).flat();
        expect(allSpells.find(spell => spell.id === study.spellExample)?.damage).toBeDefined();
        for (const entry of study.healingExamples) {
            const record = (entry.source === 'abilities' ? allAbilities : allSpells).find(item => item.id === entry.id);
            expect(record).toBeDefined();
            if (entry.source === 'abilities') {
                expect(record.effects.options.find(option => option.id === entry.optionId)?.effects.heal).toBeDefined();
                expect(entry.target).toBe('self');
            } else {
                expect(record.healing).toBeDefined();
            }
        }
    });

    it('keeps demonstration combatants and engagement references self-contained', () => {
        const ids = study.combatants.map(c => c.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const c of study.combatants) {
            expect(config.appearances[c.appearance]).toBeDefined();
        }
        for (const scenario of Object.values(study.scenarios)) {
            expect(new Set(scenario.participants).size).toBe(scenario.participants.length);
            scenario.participants.forEach(id => expect(ids).toContain(id));
            for (const [a, b] of scenario.links) {
                expect(a).not.toBe(b);
                expect(scenario.participants).toContain(a);
                expect(scenario.participants).toContain(b);
            }
        }
    });

    it('covers every implemented humanoid opponent and each of its executable attacks', () => {
        const humanoids = monsters.monsters.filter(monster => monster.type === 'humanoid');
        const weaponVisuals = new Map(config.weaponVisuals.map(entry => [entry.itemId, entry]));
        const namedActions = new Set(config.actionVisuals.filter(entry => entry.name).map(entry => entry.name));
        expect(humanoids.length).toBeGreaterThan(0);
        for (const monster of humanoids) {
            expect(config.preview.creatureTypes).toContain(monster.type);
            expect(config.preview.sizes).toContain(monster.size);
            for (const action of monster.actions || []) {
                if (action.weaponId) {
                    expect(weaponVisuals.has(action.weaponId), `${monster.id}: ${action.weaponId}`).toBe(true);
                } else {
                    expect(namedActions.has(action.name), `${monster.id}: ${action.name}`).toBe(true);
                }
            }
        }
    });
});
