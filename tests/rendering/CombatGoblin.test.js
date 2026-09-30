import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { combatActionVisual, combatPresentationSnapshot } from '../../src/ui/CombatPresentation.js';
import { buildStudyEncounter } from '../../src/ui/CombatEncounterSetup.js';
vi.mock('../../src/systems/AudioManager.js', () => ({ default: { play: vi.fn(), playCombatSound: vi.fn() } }));
import { Combatant } from '../../src/systems/CombatManager.js';

const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url)));
const config = read('combatScene');
const data = Object.fromEntries(['items', 'monsters', 'races', 'classes'].map(name => [name, read(name)]));

describe('Goblin combat integration', () => {
    it.each(['goblin', 'goblinArcher'])('admits %s with the shared body, including prone', id => {
        const encounter = buildStudyEncounter({ ...read('combatEncounterStudy'), enemies: [id] }, data);
        const combatants = [new Combatant(encounter.player, 'player'), new Combatant(encounter.enemies[0], 'enemy')];
        const manager = { active: true, combatants, getCurrentCombatant: () => combatants[0] };
        const source = { items: data.items.weapons, monsters: data.monsters.monsters };
        expect(combatPresentationSnapshot(manager, config, source).state.combatants[1].appearance).toBe('goblin');
        combatants[1].conditions.push({ type: 'prone' });
        expect(combatPresentationSnapshot(manager, config, source).reason).toBe('');
    });
    it('resolves the archer’s bow and backup scimitar from canonical actions', () => {
        const visuals = data.monsters.monsters.find(monster => monster.id === 'goblinArcher').actions.map(action =>
            combatActionVisual(config, { actionName: action.name, weaponId: action.weaponId,
                kind: action.type === 'rangedWeaponAttack' ? 'ranged' : 'melee' }, 'goblin'));
        expect(visuals).toMatchObject([{ model: 'bow', motion: 'bow' }, { model: 'sword', motion: 'meleeSlice1h' }]);
    });
});
