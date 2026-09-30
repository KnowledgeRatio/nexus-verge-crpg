import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/systems/AudioManager.js', () => ({
    default: { playCombatSound: vi.fn(), play: vi.fn() }
}));

import { CombatManager, Combatant } from '../../src/systems/CombatManager.js';
import { gameState } from '../../src/core/GameState.js';

function actor(id, team, level = 1) {
    // Plain data deliberately matches characters restored from saves.
    return new Combatant(JSON.parse(JSON.stringify({
        name: id, level, currentHP: 100, maxHP: 100, ac: 15,
        proficiencyBonus: 2, abilities: {}, abilityModifiers: {},
        equipment: { mainHand: null }, selectedAbilities: []
    })), team, id);
}

function link(a, b) {
    a.engagedWith.add(b.id);
    b.engagedWith.add(a.id);
}

describe('Accumulating melee engagement', () => {
    let manager;
    let player;
    let companion;
    let enemies;

    beforeEach(() => {
        vi.stubGlobal('window', { game: null });
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(gameState, 'addMessage').mockImplementation(() => {});
        vi.spyOn(Math, 'random').mockReturnValue(0);
        manager = new CombatManager();
        player = actor('player', 'player');
        companion = actor('companion', 'companion');
        enemies = [0, 1, 2].map(index => actor(`enemy-${index}`, 'enemy'));
        manager.combatants = [player, companion, ...enemies];
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it.each([1, 5, 10])('retains incoming and shared links when a level %i player changes targets', async level => {
        player.character.level = level;
        link(player, enemies[0]);
        link(player, enemies[1]);
        link(companion, enemies[0]);

        await manager.attack(player, enemies[2]);

        expect(player.engagedWith).toEqual(new Set(enemies.map(enemy => enemy.id)));
        expect(enemies[0].engagedWith).toEqual(new Set([player.id, companion.id]));
        expect(enemies[1].engagedWith).toEqual(new Set([player.id]));
        expect(enemies[2].engagedWith).toEqual(new Set([player.id]));
        expect(player.actions.action).toBe(0);
        expect(player.toJSON().engagedWith).toEqual(enemies.map(enemy => enemy.id));
    });

    it('accumulates companion engagements and does not duplicate repeated targets', async () => {
        await manager.attack(companion, enemies[0]);
        companion.actions.action = 1;
        await manager.attack(companion, enemies[1]);
        companion.actions.action = 1;
        await manager.attack(companion, enemies[0]);
        expect(companion.engagedWith).toEqual(new Set([enemies[0].id, enemies[1].id]));
        expect(enemies[0].engagedWith).toEqual(new Set([companion.id]));
        expect(enemies[1].engagedWith).toEqual(new Set([companion.id]));
    });

    it.each([0, 0.5])('preserves monster engagements on a new target with random roll %s', async roll => {
        vi.mocked(Math.random).mockReturnValue(roll);
        companion.ac = 1;
        link(enemies[0], player);
        await manager.executeMonsterAttack(enemies[0], companion, {
            name: 'Strike', type: 'meleeWeaponAttack', damage: '1d4'
        });
        expect(enemies[0].engagedWith).toEqual(new Set([player.id, companion.id]));
        expect(player.engagedWith).toEqual(new Set([enemies[0].id]));
        expect(companion.engagedWith).toEqual(new Set([enemies[0].id]));
        expect(companion.hp < companion.maxHP).toBe(roll !== 0);
    });

    it('leaves the graph unchanged for ranged attacks and rejected melee attacks', async () => {
        link(player, enemies[0]);
        link(enemies[1], companion);
        const before = manager.combatants.map(c => c.toJSON().engagedWith);
        player.character.equipment.mainHand = { weaponType: 'ranged', ammoCount: 2 };
        await manager.attack(player, enemies[1]);
        await manager.executeMonsterAttack(enemies[1], player, {
            name: 'Shot', type: 'rangedWeaponAttack', damage: '1d4'
        });
        player.character.equipment.mainHand = null;
        // The ranged attack already spent the action; this melee request is rejected.
        await manager.attack(player, enemies[2]);
        expect(manager.combatants.map(c => c.toJSON().engagedWith)).toEqual(before);
    });

    it('removes only the defeated actor’s links', () => {
        link(player, enemies[0]);
        link(player, enemies[1]);
        link(companion, enemies[0]);
        manager.enemyCombatants = enemies;
        enemies[0].hp = 0;
        manager.handleDefeat(enemies[0]);
        expect(enemies[0].engagedWith.size).toBe(0);
        expect(player.engagedWith).toEqual(new Set([enemies[1].id]));
        expect(enemies[1].engagedWith).toEqual(new Set([player.id]));
        expect(companion.engagedWith.size).toBe(0);
    });
});
