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

it('renders the canonical orc with its actual greataxe, including prone', () => {
    const encounter = buildStudyEncounter({ ...read('combatEncounterStudy'), enemies: ['orc'] }, data);
    const combatants = [new Combatant(encounter.player, 'player'), new Combatant(encounter.enemies[0], 'enemy')];
    const manager = { active: true, combatants, getCurrentCombatant: () => combatants[0] };
    const source = { items: data.items.weapons, monsters: data.monsters.monsters };
    const snapshot = combatPresentationSnapshot(manager, config, source);
    expect(snapshot.reason).toBe('');
    expect(snapshot.state.combatants[1]).toMatchObject({ appearance: 'orc', weaponModel: 'axe' });
    const action = data.monsters.monsters.find(monster => monster.id === 'orc').actions[0];
    expect(combatActionVisual(config, { actionName: action.name, weaponId: action.weaponId, kind: 'melee' }, 'orc'))
        .toMatchObject({ model: 'axe', mount: 'axe2h', motion: 'axe' });
    combatants[1].conditions.push({ type: 'prone' });
    expect(combatPresentationSnapshot(manager, config, source).reason).toBe('');
});

it('keeps tusks attached to the head and the body grounded in every configured motion', async () => {
    const bytes = readFileSync(new URL('../../data/graphics/combat/orc-v1.glb', import.meta.url));
    const gltf = await new GLTFLoader().register(() => ({ name: 'test-textures',
        loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    for (const sign of [-1, 1]) {
        expect(gltf.scene.getObjectByName(`OrcTusk${sign}`).parent.name).toBe('Head');
        expect(gltf.scene.getObjectByName(`OrcShoulder${sign}`).parent.name).toBe(sign > 0 ? 'upperarm_l' : 'upperarm_r');
    }
    const mixer = new AnimationMixer(gltf.scene), motion = config.artAssets.models.orc.motion;
    for (const entry of [motion.idle, motion.walk, ...Object.values(motion.actions),
        motion.conditions.prone, ...Object.values(motion.conditions.prone.actions)]) {
        const clip = gltf.animations.find(candidate => candidate.name === entry.clip);
        expect(clip).toBeDefined(); mixer.stopAllAction();
        mixer.clipAction(clip).reset().setLoop(LoopOnce, 1).play().clampWhenFinished = true;
        for (let i = 0; i <= 17; i++) {
            mixer.setTime(clip.duration * i / 17); gltf.scene.updateMatrixWorld(true);
            const bounds = new Box3().setFromObject(gltf.scene, true);
            expect(bounds.min.y, clip.name).toBeGreaterThan(-.025);
            expect(bounds.min.y, clip.name).toBeLessThan(.025);
            expect(bounds.max.y, clip.name).toBeLessThan(2.6);
        }
    }
});
