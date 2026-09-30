import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { CombatArtAssets, attachCharacterArt, poseCharacterArt } from '../../src/rendering/CombatArtAssets.js';
import { combatActionVisual, combatPresentationSnapshot } from '../../src/ui/CombatPresentation.js';
import { buildStudyEncounter } from '../../src/ui/CombatEncounterSetup.js';
vi.mock('../../src/systems/AudioManager.js', () => ({ default: { play: vi.fn(), playCombatSound: vi.fn() } }));
import { Combatant } from '../../src/systems/CombatManager.js';

const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));
const config = read('combatScene');
const data = Object.fromEntries(['items', 'monsters', 'races', 'classes'].map(name => [name, read(name)]));

function snapshot(monsterId) {
    const encounter = buildStudyEncounter({ ...read('combatEncounterStudy'), enemies: [monsterId] }, data);
    const actors = [new Combatant(encounter.player, 'player'), new Combatant(encounter.enemies[0], 'enemy')];
    return { manager: { active: true, combatants: actors, getCurrentCombatant: () => actors[0] },
        data: { items: data.items.weapons, monsters: data.monsters.monsters } };
}

describe('Wolf combat presentation', () => {
    it.each(['wolf', 'direWolf'])('admits canonical %s and selects its Bite while keeping unsupported creatures on cards', id => {
        const fixture = snapshot(id);
        const result = combatPresentationSnapshot(fixture.manager, config, fixture.data);
        expect(result.reason).toBe('');
        expect(result.state.combatants[1]).toMatchObject({ appearance: id, weaponModel: 'unarmed', weaponAction: 'bite' });
        const wolf = fixture.manager.combatants[1];
        const action = wolf.character.monsterActions[0];
        expect(combatActionVisual(config, { actionName: action.name, kind: 'melee' }, 'wolf').motion).toBe('bite');
        const unavailable = { ...config, monsterAppearance: { ...config.monsterAppearance, [id]: undefined } };
        expect(combatPresentationSnapshot(fixture.manager, unavailable, fixture.data).reason).toContain('without a matching');
        wolf.conditions.push({ type: 'prone' });
        expect(combatPresentationSnapshot(fixture.manager, config, fixture.data).reason).toContain('condition');
    });

    it.each(['wolf', 'direWolf'])('animates %s without hands and keeps complete clips above the floor', async id => {
        const source = readFileSync(new URL(`../../${config.artAssets.models[id].url}`, import.meta.url));
        const gltf = await new GLTFLoader().parseAsync(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength), '');
        const assets = new CombatArtAssets(config.artAssets);
        assets.templates.set(id, gltf.scene);
        assets.animations.set(id, gltf.animations);
        const actor = { appearance: config.appearances[id], combatant: { hp: 11 }, body: new THREE.Group(),
            weapon: new THREE.Group(), legacyParts: new THREE.Group(), weaponModel: 'unarmed' };
        attachCharacterArt(actor, assets);
        expect(actor.art.joints.mouth).toBeDefined();
        expect(actor.art.joints.rightHand).toBeUndefined();
        expect(() => poseCharacterArt(actor, {})).not.toThrow();
        const model = actor.art.model;
        actor.art.animator.dispose();
        const mixer = new THREE.AnimationMixer(model);
        for (const clip of gltf.animations) {
            mixer.stopAllAction();
            const action = mixer.clipAction(clip).setLoop(THREE.LoopOnce, 1).play();
            action.clampWhenFinished = true;
            for (let i = 0; i <= 80; i++) {
                mixer.setTime(clip.duration * i / 80);
                model.updateMatrixWorld(true);
                const bounds = new THREE.Box3().setFromObject(model, true);
                expect(bounds.min.y, `${clip.name} frame ${i}`).toBeGreaterThan(-.006);
                expect(bounds.min.y, `${clip.name} frame ${i}`).toBeLessThan(.025);
            }
        }
        assets.dispose();
    }, 20000);
});
