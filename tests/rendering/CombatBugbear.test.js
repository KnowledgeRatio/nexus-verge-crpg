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

it('admits the canonical bugbear with its morningstar, including prone', () => {
    const encounter = buildStudyEncounter({ ...read('combatEncounterStudy'), enemies: ['bugbear'] }, data);
    const combatants = [new Combatant(encounter.player, 'player'), new Combatant(encounter.enemies[0], 'enemy')];
    const manager = { active: true, combatants, getCurrentCombatant: () => combatants[0] };
    const source = { items: data.items.weapons, monsters: data.monsters.monsters };
    const snapshot = combatPresentationSnapshot(manager, config, source);
    expect(snapshot.reason).toBe('');
    expect(snapshot.state.combatants[1]).toMatchObject({ appearance: 'bugbear', weaponModel: 'morningstar' });
    const action = data.monsters.monsters.find(monster => monster.id === 'bugbear').actions[0];
    expect(combatActionVisual(config, { actionName: action.name, weaponId: action.weaponId, kind: 'melee' }, 'bugbear'))
        .toMatchObject({ model: 'morningstar', mount: 'mace', motion: 'club' });
    combatants[1].conditions.push({ type: 'prone' });
    expect(combatPresentationSnapshot(manager, config, source).reason).toBe('');
});

it('retains skinned fur and grounded motion in the packaged model', async () => {
    const bytes = readFileSync(new URL('../../data/graphics/combat/bugbear-v1.glb', import.meta.url));
    const gltf = await new GLTFLoader().register(() => ({ name: 'test-textures',
        loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const fur = gltf.scene.getObjectByName('BugbearFur');
    expect(fur.isSkinnedMesh).toBe(true);
    expect(fur.geometry.attributes.position.count).toBeGreaterThan(500);
    expect(gltf.scene.getObjectByName('BugbearNose').parent.name).toBe('Head');
    const mixer = new AnimationMixer(gltf.scene);
    for (const clip of gltf.animations) {
        mixer.stopAllAction();
        mixer.clipAction(clip).reset().setLoop(LoopOnce, 1).play().clampWhenFinished = true;
        for (let i = 0; i <= 17; i++) {
            mixer.setTime(clip.duration * i / 17); gltf.scene.updateMatrixWorld(true);
            const bounds = new Box3().setFromObject(gltf.scene, true);
            expect(bounds.min.y, clip.name).toBeGreaterThan(-.025);
            expect(bounds.min.y, clip.name).toBeLessThan(.025);
            expect(bounds.max.y, clip.name).toBeLessThan(2.8);
        }
    }
});
