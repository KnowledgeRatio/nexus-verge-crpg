import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { combatActionVisual, combatPresentationSnapshot } from '../../src/ui/CombatPresentation.js';
import { buildStudyEncounter } from '../../src/ui/CombatEncounterSetup.js';
vi.mock('../../src/systems/AudioManager.js', () => ({ default: { play: vi.fn(), playCombatSound: vi.fn() } }));
import { Combatant } from '../../src/systems/CombatManager.js';

const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url)));
const config = read('combatScene');
const data = Object.fromEntries(['items', 'monsters', 'races', 'classes'].map(name => [name, read(name)]));

describe('Gnoll combat integration', () => {
    it('admits the canonical gnoll and resolves its spear and natural Bite independently', () => {
        const encounter = buildStudyEncounter({ ...read('combatEncounterStudy'), enemies: ['gnoll'] }, data);
        const combatants = [new Combatant(encounter.player, 'player'), new Combatant(encounter.enemies[0], 'enemy')];
        const manager = { active: true, combatants, getCurrentCombatant: () => combatants[0] };
        const source = { items: data.items.weapons, monsters: data.monsters.monsters };
        const snapshot = combatPresentationSnapshot(manager, config, source);
        expect(snapshot.reason).toBe('');
        expect(snapshot.state.combatants[1].appearance).toBe('gnoll');
        const visuals = data.monsters.monsters.find(monster => monster.id === 'gnoll').actions.map(action =>
            combatActionVisual(config, { actionName: action.name, weaponId: action.weaponId, kind: 'melee' }, 'gnoll'));
        expect(visuals[0]).toMatchObject({ model: 'unarmed', motion: 'bite' });
        expect(visuals[1]).toMatchObject({ model: 'spear', motion: 'meleeStab2h' });
        combatants[1].conditions.push({ type: 'prone' });
        expect(combatPresentationSnapshot(manager, config, source).reason).toContain('condition');
    });
});
