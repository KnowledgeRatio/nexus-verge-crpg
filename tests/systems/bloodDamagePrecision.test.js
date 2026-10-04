import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../src/systems/AudioManager.js', () => ({ default: { play: vi.fn(), playCombatSound: vi.fn() } }));

import { RULES } from '../../src/core/rulesEngine.js';
import { gameState } from '../../src/core/GameState.js';
import { Character } from '../../src/systems/Character.js';
import { CombatManager, Combatant, applyDamage } from '../../src/systems/CombatManager.js';
import { createEnemyFromMonster } from '../../src/systems/EncounterBuilder.js';
import { execute } from '../../src/systems/EffectDispatcher.js';
import { resolveDamageComponents } from '../../src/systems/DamageResolver.js';
import { hpToUnits, partitionDamage } from '../../src/utils/damagePrecision.js';

const items = JSON.parse(readFileSync(new URL('../../data/items.json', import.meta.url), 'utf8'));
const classes = JSON.parse(readFileSync(new URL('../../data/classes.json', import.meta.url), 'utf8')).classes;
const monsters = JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url), 'utf8')).monsters;
let enabled, reduction, fraction;

function fixture(prowess = 15) {
    const character = new Character({ name: 'Fighter', level: 5,
        class: classes.find(entry => entry.id === 'dedication'), species: {}, background: {},
        baseAbilities: { prowess, intuition: 13, resilience: 15, composure: 10, intellect: 10, presence: 10 },
        equipment: { mainHand: JSON.parse(JSON.stringify(items.weapons.find(entry => entry.id === 'longsword'))), offHand: null, armor: null }
    });
    const manager = new CombatManager();
    const player = new Combatant(character, 'player', 'pc');
    const enemy = new Combatant(createEnemyFromMonster(monsters.find(entry => entry.id === 'ogre'), {
        worldConfig: { useAverageMonsterHP: true }
    }), 'enemy', 'enemy');
    manager.combatants = [player, enemy]; manager.playerCombatant = player;
    manager.enemyCombatants = [enemy]; manager.companionCombatants = [];
    manager.turnOrder = [player, enemy]; manager.currentTurnIndex = 0;
    for (const actor of manager.combatants) {
        actor.combatManager = manager;
    }
    gameState.set('character', character); gameState.data.items = items.weapons;
    return { manager, character, player, enemy };
}

beforeEach(() => {
    enabled = RULES.combat.damageOverTime.enabled;
    reduction = RULES.combat.damageReductionSystem.enabled;
    fraction = RULES.combat.damageOverTime.immediateFraction;
    RULES.combat.damageOverTime.enabled = true;
    RULES.combat.damageOverTime.immediateFraction = 0.8;
    RULES.combat.damageReductionSystem.enabled = false;
    globalThis.window = { game: null, lootManager: null };
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    gameState.data.ui.messageLog = [];
    gameState.data.fatigue = { current: 0, exhaustionLevels: 0 };
});

afterEach(() => {
    RULES.combat.damageOverTime.enabled = enabled;
    RULES.combat.damageReductionSystem.enabled = reduction;
    RULES.combat.damageOverTime.immediateFraction = fraction;
    vi.useRealTimers(); vi.restoreAllMocks();
});

describe('blood damage precision fork', () => {
    it('preserves flag-off whole-point resistance and absence of bleed', () => {
        RULES.combat.damageOverTime.enabled = false;
        RULES.combat.damageReductionSystem.enabled = true;
        const { manager, player, enemy } = fixture(); enemy.damageResistances = ['blood'];
        const before = enemy.hp;
        manager.applyWeaponDamage(player, enemy, 5, 'blood');
        expect(enemy.hp).toBe(before - 2);
        expect(manager.getPendingDamage(enemy).totalPending).toBe(0);
    });

    it('preserves flag-off rounds expiry before tick', () => {
        RULES.combat.damageOverTime.enabled = false;
        const { manager, enemy } = fixture(); manager.currentTurnIndex = 1;
        const before = enemy.hp;
        enemy.addCondition('legacyPeriodic', 'rounds', 'pc', { roundsRemaining: 1, value: 2, damageOnTurnStart: { type: 'blood' } });
        manager.startTurn(); expect(enemy.hp).toBe(before);
        expect(enemy.getCondition('legacyPeriodic')).toBeUndefined();
    });

    it('conserves authored one and two HP hits with three positive schedules', () => {
        for (const raw of [1, 2]) {
            const split = partitionDamage(raw, 0.8, 3);
            expect(split.ticksUnits.every(amount => amount > 0)).toBe(true);
            expect(hpToUnits(split.immediate) + split.ticksUnits.reduce((sum, amount) => sum + amount, 0)).toBe(hpToUnits(raw));
            const { manager, player, enemy } = fixture(); const before = enemy.hp;
            manager.applyWeaponDamage(player, enemy, raw, 'blood');
            for (let tick = 0; tick < 3; tick++) {
                manager.processPeriodicDamage(enemy);
            }
            expect(hpToUnits(before - enemy.hp)).toBe(hpToUnits(raw));
            expect(manager.getPendingDamage(enemy).totalPending).toBe(0);
        }
    });

    it('uses real attack dice and one critical result before partitioning', async () => {
        const { manager, player, enemy } = fixture(); const before = enemy.hp;
        vi.spyOn(Math, 'random').mockReturnValue(0.99);
        await manager.attack(player, enemy, 'mainHand', { extraDamage: 4 });
        expect(manager.getPendingDamage(enemy).totalPending).toBe(3.6);
        expect(hpToUnits(before - enemy.hp)).toBe(18400);
    });

    it('uses the same landed packet rule for natural monster weapon attacks', async () => {
        const { manager, player, enemy } = fixture(); const before = player.hp;
        vi.spyOn(Math, 'random').mockReturnValue(0.99);
        const action = { name: 'Claw', type: 'meleeWeaponAttack', attackBonus: 99,
            damage: { dice: '1d4', bonus: 0, type: 'blood' } };
        await manager.executeMonsterAttack(enemy, player, action);
        expect(manager.getPendingDamage(player).totalPending).toBeGreaterThan(0);
        expect(player.hp).toBeLessThan(before);
    });

    it.each([
        { prowess: 8, dieRandom: 0.125, rider: 0, immediate: 0.8, deferred: 0.2 },
        { prowess: 8, dieRandom: 0, rider: 0, immediate: 0, deferred: 0 },
        { prowess: 4, dieRandom: 0, rider: 0, immediate: 0, deferred: 0 },
        { prowess: 8, dieRandom: 0, rider: 4, immediate: 4, deferred: 0 }
    ])('preserves weak-attribute eligible weapon budgets: %j', async ({ prowess, dieRandom, rider, immediate, deferred }) => {
        const { manager, player, enemy } = fixture(prowess);
        const before = enemy.hp;
        vi.spyOn(Math, 'random').mockReturnValueOnce(0.75).mockReturnValue(dieRandom);
        await manager.attack(player, enemy, 'mainHand', { extraDamage: rider });
        expect(hpToUnits(before - enemy.hp)).toBe(hpToUnits(immediate));
        expect(manager.getPendingDamage(enemy).totalPending).toBe(deferred);
    });

    it('keeps independent schedules and resolves one concentration event per boundary', () => {
        const { manager, player, enemy } = fixture(); const check = vi.spyOn(enemy, '_checkConcentration').mockImplementation(() => {});
        manager.applyWeaponDamage(player, enemy, 1, 'blood');
        manager.processPeriodicDamage(enemy);
        manager.applyWeaponDamage(player, enemy, 2, 'blood');
        enemy.concentratingOn = { abilityId: 'test' };
        const result = manager.processPeriodicDamage(enemy);
        expect(result.components).toHaveLength(2);
        expect(check).toHaveBeenCalledTimes(1);
        expect(manager.getPendingDamage(enemy).tranches.map(tranche => tranche.cursor)).toEqual([2, 1]);
    });

    it('evaluates changed defenses per tick without whole-HP flooring', () => {
        const { manager, player, enemy } = fixture();
        manager.applyWeaponDamage(player, enemy, 1, 'blood');
        RULES.combat.damageReductionSystem.enabled = true; enemy.damageResistances = ['blood'];
        expect(manager.processPeriodicDamage(enemy).final).toBe(0.034);
        enemy.damageResistances = []; enemy.damageVulnerabilities = ['blood'];
        expect(manager.processPeriodicDamage(enemy).final).toBe(0.134);
        enemy.damageImmunities = ['blood'];
        expect(manager.processPeriodicDamage(enemy).final).toBe(0);
    });

    it('enforces neutral damage and magical qualifiers through the shared resolver', () => {
        const { enemy } = fixture(); RULES.combat.damageReductionSystem.enabled = true;
        enemy.damageResistances = ['injury', 'resonant', 'nonmagical blood'];
        expect(applyDamage(enemy, 1, 'injury').final).toBe(1);
        expect(applyDamage(enemy, 1, 'resonant').final).toBe(1);
        expect(applyDamage(enemy, 1, 'blood', false).final).toBe(0.5);
        expect(applyDamage(enemy, 1, 'blood', true).final).toBe(1);
        enemy.damageResistances = ['fire'];
        expect(applyDamage(enemy, 1, 'elemental', false, 'fire').final).toBe(0.5);
        enemy.damageResistances = ['elemental'];
        expect(applyDamage(enemy, 1, 'elemental', false, 'fire').final).toBe(0.5);
        expect(applyDamage(enemy, 1, 'fire').final).toBe(0.5);
        enemy.damageImmunities = ['fire'];
        expect(applyDamage(enemy, 1, 'elemental', false, 'fire').final).toBe(0);
        expect(applyDamage(enemy, 1, 'resonant', false, 'fire').final).toBe(1);
    });

    it('absorbs fractional tempHP before HP and clamps heals without drift', () => {
        const { enemy, character } = fixture();
        enemy.addCondition('tempHP', 'combat', 'enemy', { value: 0.15 });
        const before = enemy.hp;
        const result = resolveDamageComponents(enemy, [{ amount: 0.2, damageType: 'blood' }]);
        expect(result.tempHPUsed).toBe(0.15); expect(result.hpDamage).toBe(0.05);
        enemy.heal(0.05); expect(enemy.hp).toBe(before);
        character.currentHP = 0.001; character.heal(0.002); expect(character.currentHP).toBe(0.003);
        character.takeDamage(0.002); expect(character.currentHP).toBe(0.001);
        expect(Character.fromJSON(JSON.parse(JSON.stringify(character.toJSON()))).currentHP).toBe(0.001);
    });

    it('routes instant ability damage through identical fractional defenses', async () => {
        const { manager, player, enemy, character } = fixture();
        RULES.combat.damageReductionSystem.enabled = true; enemy.damageResistances = ['blood'];
        const before = enemy.hp;
        const results = await execute({ id: 'generic', name: 'Generic' }, { variableCostDamage: { damageFormula: '1', damageType: 'blood' } }, {
            character, combatant: player, combatManager: manager, defender: enemy, resolveSpent: 1, addMessage: () => {}, showFloatingText: () => {}
        });
        expect(enemy.hp).toBe(before - 0.5); expect(results[0].result.damage).toBe(0.5);
        expect(manager.getPendingDamage(enemy).totalPending).toBe(0);
    });

    it('makes cleansing cancel budgets and condition immunity suppress the deferred part', () => {
        const { manager, player, enemy } = fixture();
        manager.applyWeaponDamage(player, enemy, 1, 'blood');
        expect(enemy.removeCondition('bleeding')).toBe(true);
        expect(manager.getPendingDamage(enemy).totalPending).toBe(0);
        enemy.character.conditionImmunities = ['bleeding'];
        const before = enemy.hp; const result = manager.applyWeaponDamage(player, enemy, 1, 'blood');
        expect(result.suppressedDeferred).toBe(0.2);
        expect(hpToUnits(enemy.hp)).toBe(hpToUnits(before) - 800);
        expect(manager.getPendingDamage(enemy).totalPending).toBe(0);
    });

    it('preserves source-death budgets but removes target and encounter budgets', () => {
        const { manager, player, enemy } = fixture();
        manager.applyWeaponDamage(enemy, player, 1, 'blood');
        enemy.hp = 0; manager.enemyCombatants = [enemy, new Combatant(enemy.character, 'enemy', 'other')];
        manager.handleDefeat(enemy);
        expect(manager.getPendingDamage(player).totalPending).toBe(0.2);
        player.hp = 0; const end = vi.spyOn(manager, 'endCombat').mockImplementation(() => {
            manager.active = false;
        });
        manager.handleDefeat(player); expect(manager.getPendingDamage(player).totalPending).toBe(0); expect(end).toHaveBeenCalledTimes(1);
    });

    it('ticks a rounds1 ongoing effect exactly once before expiration', () => {
        const { manager, enemy } = fixture(); manager.currentTurnIndex = 1; const before = enemy.hp;
        enemy.addCondition('genericPeriodic', 'rounds', 'pc', { roundsRemaining: 1, value: 0.2, damageOnTurnStart: { type: 'fire' } });
        manager.startTurn(); expect(enemy.hp).toBe(before - 0.2);
        expect(enemy.getCondition('genericPeriodic')).toBeUndefined();
    });

    it('advances from a lethal tick to the next living actor without replaying its turn', () => {
        const { manager, player, enemy } = fixture();
        const next = new Combatant(enemy.character, 'enemy', 'next'); next.combatManager = manager;
        manager.enemyCombatants.push(next); manager.combatants.push(next); manager.turnOrder = [player, enemy, next];
        manager.applyWeaponDamage(player, enemy, 1, 'blood'); enemy.hp = 0.01;
        manager.active = true; manager.currentTurnIndex = 1;
        const nextStart = vi.spyOn(next, 'startTurn'); manager.startTurn();
        expect(enemy.hp).toBe(0); expect(manager.getCurrentCombatant()).toBe(next);
        expect(nextStart).toHaveBeenCalledTimes(1);
    });

    it('clears periodic effects on every encounter outcome', () => {
        for (const outcome of ['victory', 'fled', 'defeat']) {
            const { manager, player, enemy } = fixture();
            manager.applyWeaponDamage(enemy, player, 1, 'blood');
            player.addCondition('ongoing', 'rounds', 'enemy', { roundsRemaining: 3, value: 0.2, damageOnTurnStart: { type: 'fire' } });
            manager.endCombat(outcome);
            expect(manager.getPendingDamage(player).totalPending).toBe(0);
            expect(player.getCondition('ongoing')).toBeUndefined();
        }
    });
});
