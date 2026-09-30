import { it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { combatActionVisual, combatPresentationSnapshot } from '../../src/ui/CombatPresentation.js';
import { buildStudyEncounter } from '../../src/ui/CombatEncounterSetup.js';
vi.mock('../../src/systems/AudioManager.js', () => ({ default: { play: vi.fn(), playCombatSound: vi.fn() } }));
import { Combatant } from '../../src/systems/CombatManager.js';

const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url)));
const config = read('combatScene');
const data = Object.fromEntries(['items', 'monsters', 'races', 'classes'].map(name => [name, read(name)]));
const clips = new Map();
function modelClips(asset) {
    if (!clips.has(asset)) {
        const bytes = readFileSync(new URL(`../../${config.artAssets.models[asset].url}`, import.meta.url));
        const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
        clips.set(asset, new Set(gltf.animations.map(animation => animation.name)));
    }
    return clips.get(asset);
}

it.each([1, 5, 10])('admits every canonical monster alongside a level-%i player with packaged action clips', level => {
    for (const monster of data.monsters.monsters) {
        const encounter = buildStudyEncounter({ ...read('combatEncounterStudy'), level, enemies: [monster.id] }, data);
        const combatants = [new Combatant(encounter.player, 'player'), new Combatant(encounter.enemies[0], 'enemy')];
        const manager = { active: true, combatants, getCurrentCombatant: () => combatants[0] };
        const snapshot = combatPresentationSnapshot(manager, config,
            { items: data.items.weapons, monsters: data.monsters.monsters });
        expect(snapshot.reason, monster.id).toBe('');
        const appearance = snapshot.state.combatants[1].appearance;
        const asset = config.appearances[appearance].asset;
        const motions = config.artAssets.models[asset].motion;
        expect(modelClips(asset).has(motions.idle.clip), monster.id).toBe(true);
        expect(modelClips(asset).has(motions.actions.death.clip), monster.id).toBe(true);
        for (const action of monster.actions) {
            const kind = action.type === 'special' ? 'spell' : action.type === 'rangedWeaponAttack' ? 'ranged' : 'melee';
            const visual = combatActionVisual(config,
                { actionName: action.name, weaponId: action.weaponId, kind }, appearance);
            const label = `${monster.id}: ${action.name}`;
            expect(visual, label).toBeDefined();
            expect(config.animation.actionProfiles[visual.action], label).toBeDefined();
            const motion = motions.actions[visual.motion || visual.action];
            expect(motion, label).toBeDefined();
            expect(modelClips(asset).has(motion.clip), label).toBe(true);
            for (const clip of Object.values(motion.handClips || {})) {
                expect(modelClips(asset).has(clip), label).toBe(true);
            }
        }
    }
});
