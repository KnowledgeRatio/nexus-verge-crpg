import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/systems/AudioManager.js', () => ({
    default: { playCombatSound: vi.fn(), play: vi.fn() }
}));

import { CombatManager, Combatant } from '../../src/systems/CombatManager.js';
import { gameState } from '../../src/core/GameState.js';

function combatant(id, team) {
    return new Combatant({
        name: id, level: 1, currentHP: 100, maxHP: 100, ac: 15,
        proficiencyBonus: 2, abilities: {}, abilityModifiers: {},
        equipment: { mainHand: null }, selectedAbilities: []
    }, team, id);
}

describe('combat presentation action events', () => {
    let manager;
    let attacker;
    let target;
    let events;
    let unsubscribe;

    beforeEach(() => {
        vi.stubGlobal('window', { game: null });
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(gameState, 'addMessage').mockImplementation(() => {});
        vi.spyOn(Math, 'random').mockReturnValue(0);
        manager = new CombatManager();
        attacker = combatant('source', 'enemy');
        target = combatant('target', 'companion');
        manager.combatants = [attacker, target];
        events = [];
        unsubscribe = gameState.subscribe('combat.presentationAction', event => events.push(event));
    });

    afterEach(() => {
        unsubscribe();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('emits the accepted melee source before its miss outcome', async () => {
        const notify = vi.spyOn(gameState, 'notify');
        await manager.attack(attacker, target);

        expect(events).toEqual([{ sourceId: attacker.id, targetId: target.id, kind: 'melee', weaponSlot: 'mainHand' }]);
        const paths = notify.mock.calls.map(([path]) => path);
        expect(paths.indexOf('combat.presentationAction')).toBeLessThan(paths.indexOf('combat.floatingText'));
        expect(attacker.actions.action).toBe(0);
    });

    it.each([1, 5, 10])('awaits optional playback after level %i attack rules have resolved', async level => {
        attacker.character.level = level;
        let finish;
        manager.afterAction = vi.fn(() => new Promise(resolve => {
            finish = resolve;
        }));
        let returned = false;
        const action = manager.attack(attacker, target).then(() => {
            returned = true;
        });
        await vi.waitFor(() => expect(manager.afterAction).toHaveBeenCalledOnce());
        expect(attacker.actions.action).toBe(0);
        expect(returned).toBe(false);
        finish();
        await action;
        expect(returned).toBe(true);
    });

    it('does not undo a resolved attack when the optional playback hook fails', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        manager.afterAction = async () => {
            throw new Error('renderer unavailable');
        };
        await expect(manager.attack(attacker, target)).resolves.toBeUndefined();
        expect(attacker.actions.action).toBe(0);
    });

    it.each(['action', 'ammo', 'pushed'])('emits nothing for a rejected %s attack', async guard => {
        if (guard === 'action') {
            attacker.actions.action = 0;
        } else if (guard === 'ammo') {
            attacker.character.equipment.mainHand = { weaponType: 'ranged', ammoCount: 0 };
        } else {
            attacker.addCondition('pushed', 'untilStartOfTurn', target.id);
        }

        await manager.attack(attacker, target);

        expect(events).toEqual([]);
    });

    it('identifies an accepted ranged attack', async () => {
        attacker.character.equipment.mainHand = { weaponType: 'ranged', ammoCount: 2 };
        await manager.attack(attacker, target);
        expect(events).toEqual([{ sourceId: attacker.id, targetId: target.id, kind: 'ranged', weaponSlot: 'mainHand' }]);
    });

    it('distinguishes identical main/off-hand weapons and spends the existing action types', async () => {
        const weapon = { id: 'dagger', weaponType: 'melee', damage: '1d4', properties: ['light'] };
        attacker.character.equipment = { mainHand: { ...weapon }, offHand: { ...weapon } };
        await manager.attack(attacker, target, 'mainHand');
        await manager.attack(attacker, target, 'offHand');
        expect(events.map(event => [event.weaponId, event.weaponSlot])).toEqual([
            ['dagger', 'mainHand'], ['dagger', 'offHand']
        ]);
        expect(attacker.actions.action).toBe(0);
        expect(attacker.actions.bonusAction).toBe(0);
    });

    it.each([
        ['meleeWeaponAttack', 'melee'], ['rangedWeaponAttack', 'ranged']
    ])('identifies a monster %s even when it misses', async (type, kind) => {
        await manager.executeMonsterAttack(attacker, target, { name: 'Attack', type, damage: '1d4' });
        expect(events).toEqual([{ sourceId: attacker.id, targetId: target.id, kind, actionName: 'Attack' }]);
    });

    it('does not animate a monster melee attack blocked by pushed', async () => {
        attacker.addCondition('pushed', 'untilStartOfTurn', target.id);
        await manager.executeMonsterAttack(attacker, target, { type: 'meleeWeaponAttack', damage: '1d4' });
        expect(events).toEqual([]);
    });

    it('identifies special monster actions as spell presentation', async () => {
        await manager.executeSpecialMonsterAction(attacker, target, { name: 'Breath', damage: '1d4' });
        expect(events).toEqual([{
            sourceId: attacker.id, targetId: target.id, kind: 'spell', actionName: 'Breath'
        }]);
        expect(target.hp).toBeLessThan(100);
    });

    it('presents an improvised strike as an unarmed melee action', async () => {
        await manager.improvisedStrike(attacker, target);
        expect(events).toEqual([{
            sourceId: attacker.id, targetId: target.id, kind: 'melee', actionName: 'Improvised Strike'
        }]);
        expect(attacker.actions.action).toBe(0);
    });

    it('attributes fleeing opportunity attacks to each actual enemy', () => {
        const secondEnemy = combatant('second-enemy', 'enemy');
        manager.combatants.push(secondEnemy);
        target.engagedWith = new Set([attacker.id, secondEnemy.id]);

        manager.resolveFleeOpportunityAttacks(target);

        expect(events).toEqual([
            { sourceId: attacker.id, targetId: target.id, kind: 'melee', weaponSlot: 'mainHand' },
            { sourceId: secondEnemy.id, targetId: target.id, kind: 'melee', weaponSlot: 'mainHand' }
        ]);
        expect(attacker.actions.action).toBe(1);
        expect(secondEnemy.actions.action).toBe(1);
    });

    it('sequences fleeing opportunity attacks when presentation playback is enabled', async () => {
        const secondEnemy = combatant('second-enemy', 'enemy');
        manager.combatants.push(secondEnemy);
        target.engagedWith = new Set([attacker.id, secondEnemy.id]);
        const releases = [];
        manager.afterAction = vi.fn(() => new Promise(resolve => releases.push(resolve)));

        const fleeing = manager.resolveFleeOpportunityAttacks(target, { awaitPlayback: true });
        await vi.waitFor(() => expect(manager.afterAction).toHaveBeenCalledTimes(1));
        expect(events).toHaveLength(1);
        releases.shift()();
        await vi.waitFor(() => expect(manager.afterAction).toHaveBeenCalledTimes(2));
        expect(events).toHaveLength(2);
        releases.shift()();
        await fleeing;
    });

    it('continues combat if a presentation observer throws', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const unsubscribeBroken = gameState.subscribe('combat.presentationAction', () => {
            throw new Error('Renderer unavailable');
        });
        try {
            await expect(manager.attack(attacker, target)).resolves.toBeUndefined();
            expect(attacker.actions.action).toBe(0);
            expect(error).toHaveBeenCalled();
        } finally {
            unsubscribeBroken();
        }
    });
});
