import { it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, LoopOnce, Texture } from '../../vendor/three/three.module.min.js';
import { combatActionVisual, combatPresentationSnapshot } from '../../src/ui/CombatPresentation.js';
import { buildStudyEncounter } from '../../src/ui/CombatEncounterSetup.js';
vi.mock('../../src/systems/AudioManager.js', () => ({ default: { play: vi.fn(), playCombatSound: vi.fn() } }));
import { Combatant } from '../../src/systems/CombatManager.js';

const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url)));
const config = read('combatScene');
const data = Object.fromEntries(['items', 'monsters', 'races', 'classes'].map(name => [name, read(name)]));

it('admits the canonical kobold and resolves its dagger and sling', () => {
    const encounter = buildStudyEncounter({ ...read('combatEncounterStudy'), enemies: ['kobold'] }, data);
    const combatants = [new Combatant(encounter.player, 'player'), new Combatant(encounter.enemies[0], 'enemy')];
    const manager = { active: true, combatants, getCurrentCombatant: () => combatants[0] };
    const source = { items: data.items.weapons, monsters: data.monsters.monsters };
    const snapshot = combatPresentationSnapshot(manager, config, source);
    expect(snapshot.reason).toBe('');
    expect(snapshot.state.combatants[1]).toMatchObject({ appearance: 'kobold', weaponModel: 'dagger' });
    const visuals = data.monsters.monsters.find(monster => monster.id === 'kobold').actions.map(action =>
        combatActionVisual(config, { actionName: action.name, weaponId: action.weaponId,
            kind: action.type === 'rangedWeaponAttack' ? 'ranged' : 'melee' }, 'kobold'));
    expect(visuals).toMatchObject([{ model: 'dagger', motion: 'meleeStab1h' }, { model: 'sling', motion: 'throw' }]);
    combatants[1].conditions.push({ type: 'prone' });
    expect(combatPresentationSnapshot(manager, config, source).reason).toBe('');
});

it('keeps the tail above the supporting plane without lifting the body in any retained clip', async () => {
    const bytes = readFileSync(new URL(`../../${config.artAssets.models.kobold.url}`, import.meta.url));
    const gltf = await new GLTFLoader().register(() => ({ name: 'test-textures',
        loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const tail = gltf.scene.getObjectByName('KoboldTail'), parent = tail.parent;
    expect(parent.name).toBe('Traveller');
    expect(tail.geometry.morphAttributes.position).toHaveLength(1);
    const mixer = new AnimationMixer(gltf.scene);
    for (const clip of gltf.animations) {
        expect(clip.tracks.some(track => track.name.includes('KoboldTail') && track.name.includes('morphTargetInfluences'))).toBe(true);
        mixer.stopAllAction();
        mixer.clipAction(clip).reset().setLoop(LoopOnce, 1).play().clampWhenFinished = true;
        for (let i = 0; i <= 13; i++) {
            mixer.setTime(clip.duration * i / 13); gltf.scene.updateMatrixWorld(true);
            expect(new Box3().setFromObject(tail, true).min.y, clip.name).toBeGreaterThan(-.025);
            parent.remove(tail);
            const body = new Box3().setFromObject(gltf.scene, true);
            parent.add(tail);
            expect(body.min.y, clip.name).toBeGreaterThan(-.025);
            expect(body.min.y, clip.name).toBeLessThan(.025);
        }
    }
});
