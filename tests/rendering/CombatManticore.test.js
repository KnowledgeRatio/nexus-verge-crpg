import { it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import * as THREE from '../../vendor/three/three.module.min.js';
import { combatActionVisual, combatPresentationSnapshot } from '../../src/ui/CombatPresentation.js';
import { buildStudyEncounter } from '../../src/ui/CombatEncounterSetup.js';
import { CombatScene } from '../../src/rendering/CombatScene.js';
vi.mock('../../src/systems/AudioManager.js', () => ({ default: { play: vi.fn(), playCombatSound: vi.fn() } }));
import { Combatant } from '../../src/systems/CombatManager.js';

const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url)));
const config = read('combatScene');
const data = Object.fromEntries(['items', 'monsters', 'races', 'classes'].map(name => [name, read(name)]));

it('admits the canonical manticore and resolves tail spike, claw and bite independently', () => {
    const encounter = buildStudyEncounter({ ...read('combatEncounterStudy'), enemies: ['manticore'] }, data);
    const combatants = [new Combatant(encounter.player, 'player'), new Combatant(encounter.enemies[0], 'enemy')];
    const manager = { active: true, combatants, getCurrentCombatant: () => combatants[0] };
    const source = { items: data.items.weapons, monsters: data.monsters.monsters };
    const snapshot = combatPresentationSnapshot(manager, config, source);
    expect(snapshot.reason).toBe('');
    expect(snapshot.state.combatants[1]).toMatchObject({ appearance: 'manticore', weaponModel: 'unarmed' });
    const visuals = data.monsters.monsters.find(monster => monster.id === 'manticore').actions.map(action =>
        combatActionVisual(config, { actionName: action.name,
            kind: action.type === 'rangedWeaponAttack' ? 'ranged' : 'melee' }, 'manticore'));
    expect(visuals.map(visual => visual.motion)).toEqual(['tailSpike', 'claw', 'bite']);
    for (const visual of visuals) {
        expect(config.artAssets.models.manticore.motion.actions[visual.motion]).toBeDefined();
        expect(config.animation.actionProfiles[visual.action]).toBeDefined();
    }
    combatants[1].conditions.push({ type: 'prone' });
    expect(combatPresentationSnapshot(manager, config, source).reason).toContain('condition');
});

it('emits a physical spike from the selected socket and fixes its origin only after release', () => {
    const view = Object.assign(Object.create(CombatScene.prototype), {
        config, effects: [], scene: new THREE.Scene(), materials: new Map()
    });
    const tail = new THREE.Group(); tail.position.set(2, 3, 4);
    const source = { combatant: { id: 'manticore' }, weapon: new THREE.Group(), art: { joints: { tail } } };
    const target = { combatant: { id: 'hero' } };
    view.presentActionTarget(source, target, 'tailSpike', config.animation.actionProfiles.tailSpike, 1000, { type: 'damage' });
    const effect = view.effects[0];
    expect(effect.mesh.geometry.type).toBe('ConeGeometry');
    expect(target.impactAt).toBe(1300);
    expect(view.effectOrigin(effect, 900).toArray()).toEqual([2, 3, 4]);
    expect(effect.origin).toBeUndefined();
    tail.position.x = 3;
    expect(view.effectOrigin(effect, 1000).toArray()).toEqual([3, 3, 4]);
    tail.position.set(10, 10, 10);
    expect(view.effectOrigin(effect, 1100).toArray()).toEqual([3, 3, 4]);
    expect(source.weapon.position.toArray()).toEqual([0, 0, 0]);
    view.disposeObject(effect.mesh);
});

it('keeps the body supported through all clips and moves each attack socket at its configured impact', async () => {
    const bytes = readFileSync(new URL('../../data/graphics/combat/manticore-v1.glb', import.meta.url));
    const candidate = readFileSync(new URL('../../tools/combat-art/manticore-candidate.glb', import.meta.url));
    expect(bytes.equals(candidate)).toBe(true);
    const gltf = await new GLTFLoader().register(() => ({ name: 'test-textures',
        loadTexture: () => Promise.resolve(new THREE.Texture()) })).parseAsync(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const mixer = new THREE.AnimationMixer(gltf.scene);
    const sample = (name, fraction) => {
        const clip = gltf.animations.find(entry => entry.name === name);
        mixer.stopAllAction(); mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce, 1).play().clampWhenFinished = true;
        mixer.setTime(clip.duration * fraction); gltf.scene.updateMatrixWorld(true);
    };
    for (const clip of gltf.animations) {
        for (let i = 0; i <= 20; i++) {
            sample(clip.name, i / 20);
            const bounds = new THREE.Box3().setFromObject(gltf.scene, true);
            expect(bounds.min.y, clip.name).toBeGreaterThan(-.025);
            expect(bounds.min.y, clip.name).toBeLessThan(.025);
            expect(new THREE.Box3().setFromObject(gltf.scene.getObjectByName('mesh'), true).min.y, clip.name)
                .toBeLessThan(.07);
        }
    }
    const position = name => gltf.scene.getObjectByName(name).getWorldPosition(new THREE.Vector3());
    sample('lion_idle_01', 0);
    const mouth = position('ManticoreMouth'), claw = position('ManticoreClaw'), tail = position('ManticoreSpike');
    sample('Manticore_Bite', .5);
    expect(position('ManticoreMouth').y).toBeLessThan(mouth.y - .2);
    sample('Manticore_Claw', .5);
    expect(position('ManticoreClaw').z).toBeGreaterThan(claw.z + .6);
    expect(Math.abs(position('ManticoreClaw').x)).toBeLessThan(.05);
    sample('Manticore_Spike', .45);
    expect(position('ManticoreSpike').z).toBeGreaterThan(tail.z + .5);
});
