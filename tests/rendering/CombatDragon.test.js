import { it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from '../../vendor/three/three.module.min.js';
import { combatActionVisual, combatPresentationSnapshot } from '../../src/ui/CombatPresentation.js';
import { buildStudyEncounter } from '../../src/ui/CombatEncounterSetup.js';
import { CombatScene } from '../../src/rendering/CombatScene.js';
import { updateCombatBreath } from '../../src/rendering/CombatBreath.js';
vi.mock('../../src/systems/AudioManager.js', () => ({ default: { play: vi.fn(), playCombatSound: vi.fn() } }));
import { Combatant } from '../../src/systems/CombatManager.js';

const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url)));
const config = read('combatScene');
const data = Object.fromEntries(['items', 'monsters', 'races', 'classes'].map(name => [name, read(name)]));

it.each(['youngRedDragon', 'youngGreenDragon', 'youngWhiteDragon'])('admits canonical %s and resolves every action', id => {
    const encounter = buildStudyEncounter({ ...read('combatEncounterStudy'), enemies: [id] }, data);
    const combatants = [new Combatant(encounter.player, 'player'), new Combatant(encounter.enemies[0], 'enemy')];
    const manager = { active: true, combatants, getCurrentCombatant: () => combatants[0] };
    const source = { items: data.items.weapons, monsters: data.monsters.monsters };
    const snapshot = combatPresentationSnapshot(manager, config, source);
    expect(snapshot.reason).toBe('');
    expect(snapshot.state.combatants[1]).toMatchObject({ appearance: id, weaponModel: 'unarmed' });
    const visuals = data.monsters.monsters.find(monster => monster.id === id).actions.map(action =>
        combatActionVisual(config, { actionName: action.name, kind: action.type === 'special' ? 'spell' : 'melee' }, id));
    expect(visuals.map(visual => visual.motion)).toEqual(['bite', 'claw', 'breath']);
    for (const visual of visuals) {
        expect(config.artAssets.models.dragon.motion.actions[visual.motion]).toBeDefined();
        expect(config.animation.actionProfiles[visual.action]).toBeDefined();
    }
    combatants[1].conditions.push({ type: 'prone' });
    expect(combatPresentationSnapshot(manager, config, source).reason).toContain('condition');
});

it('times the breath impact at first arrival while the stream continues, then releases instance resources', () => {
    const view = Object.assign(Object.create(CombatScene.prototype), {
        config, effects: [], scene: new THREE.Scene(), materials: new Map()
    });
    const source = { combatant: { id: 'dragon' } }, target = { combatant: { id: 'hero' } };
    const profile = config.animation.actionProfiles.youngRedDragonBreath;
    view.presentActionTarget(source, target, 'youngRedDragonBreath', profile, 1000, { type: 'damage' });
    expect(target.impactAt).toBe(1250);
    expect(view.effects).toHaveLength(1);
    const effect = view.effects[0];
    expect(effect.duration).toBe(600);
    const origin = new THREE.Vector3(2, 2, 3), destination = new THREE.Vector3(-3, 1, 3);
    updateCombatBreath(effect.mesh, origin, destination, .15, profile);
    effect.mesh.updateMatrixWorld(true);
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3();
    let visible = 0;
    for (let i = 0; i < effect.mesh.count; i++) {
        effect.mesh.getMatrixAt(i, matrix);
        scale.setFromMatrixScale(matrix);
        if (scale.length() > 0) {
            visible++;
            position.setFromMatrixPosition(matrix).applyMatrix4(effect.mesh.matrixWorld);
            expect(position.x).toBeLessThanOrEqual(origin.x);
            expect(position.x).toBeGreaterThan(destination.x);
            expect(Math.abs(position.z - origin.z)).toBeLessThan(profile.radius);
        }
    }
    expect(visible).toBeGreaterThan(1);
    const disposed = vi.fn();
    effect.mesh.addEventListener('dispose', disposed);
    view.disposeObject(effect.mesh);
    expect(disposed).toHaveBeenCalledOnce();
});
