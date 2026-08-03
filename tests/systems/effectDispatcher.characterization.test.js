/**
 * Characterization tests for the maneuver save-DC / defender-save math in
 * src/systems/EffectDispatcher.js — LEGACY (str/dex/con/int/wis/cha) behavior, captured
 * before the attribute-system remap (docs/plans/2026-07-30-attribute-system-remap.md).
 *
 * `maneuverSaveDC()` and `rollDefenderSave()` are module-private, so they're exercised
 * indirectly through the public `execute()` entry point against the `onHitSaveOrCondition`
 * handler (the same handler Trip Attack / Menacing Attack use). The effect config here is
 * built inline rather than loaded from data/abilities.json, so this test stays pinned to
 * the CODE formula regardless of future data changes to those abilities.
 *
 * AudioManager is mocked because its real constructor calls `new Audio(...)`, which
 * doesn't exist in the Node test environment (CombatManager.js, which defines Combatant,
 * imports it).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/systems/AudioManager.js', () => ({
    default: { playCombatSound: vi.fn(), play: vi.fn() }
}));

import { execute } from '../../src/systems/EffectDispatcher.js';
import { Combatant } from '../../src/systems/CombatManager.js';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';

globalThis.window = globalThis.window || {};
window.game = null;

/** Force the next `Math.floor(Math.random() * sides) + 1` roll to resolve to `value`. */
function mockDie(sides, value) {
    return vi.spyOn(Math, 'random').mockReturnValueOnce((value - 1) / sides);
}

function makeCharacter(overrides = {}) {
    // abilityModifiers stays the primary fixture input (existing tests express intent
    // in modifiers), but the attributeResolver reads raw `.abilities` scores, not
    // pre-floored modifiers — so derive a matching `.abilities` bag too (score = mod*2+10,
    // the exact inverse of floor((score-10)/2) for integer modifiers).
    const abilityModifiers = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0, ...(overrides.abilityModifiers || {}) };
    const abilities = Object.fromEntries(
        Object.entries(abilityModifiers).map(([key, mod]) => [key, mod * 2 + 10])
    );
    return {
        name: 'Fixture',
        level: 5, // maneuver die: d6 (L3-6); proficiency +3
        proficiencyBonus: 3,
        maxHP: 20,
        currentHP: 20,
        ac: 15,
        ...overrides,
        abilityModifiers,
        abilities
    };
}

const tripAttackAbility = {
    id: 'tripAttack',
    name: 'Trip Attack',
    effects: {
        onHitSaveOrCondition: {
            bonusDice: 'maneuverDie',
            saveType: 'str',
            condition: 'prone',
            conditionDuration: 'combat',
            conditionIcon: '🔻'
        }
    }
};

const menacingAttackAbility = {
    id: 'menacingAttack',
    name: 'Menacing Attack',
    effects: {
        onHitSaveOrCondition: {
            bonusDice: 'maneuverDie',
            saveType: 'wis',
            condition: 'frightened',
            conditionDuration: 'untilEndOfTurn',
            conditionIcon: '😱'
        }
    }
};

// Default flag flipped to 'NVSystem' at M1.5 (2026-08-03). This file characterizes
// '5EClassic' (legacy str/dex/con/int/wis/cha) behavior specifically, so force that mode.
const originalAttributeSystem = RULES.attributes.system;

beforeEach(() => {
    gameState.data.ui.messageLog = [];
    RULES.attributes.system = '5EClassic';
});

afterEach(() => {
    vi.restoreAllMocks();
    RULES.attributes.system = originalAttributeSystem;
});

function buildTestContext(attacker, defender) {
    return {
        character: attacker.character,
        combatant: attacker,
        combatManager: null,
        outOfCombat: false,
        attacker,
        defender,
        addMessage: (msg, type) => gameState.addMessage(msg, type),
        showFloatingText: () => {}
    };
}

/** Run the maneuver ability and return the onHitSaveOrCondition handler's result. */
async function runManeuver(ability, attacker, defender) {
    const results = await execute(ability, ability.effects, buildTestContext(attacker, defender));
    return results.find(r => r.type === 'onHitSaveOrCondition').result;
}

describe('maneuverSaveDC (via onHitSaveOrCondition)', () => {
    // Updated 2026-08-01 (attribute-remap M1): maneuverSaveDC now resolves through the
    // resolver's single-attribute 'meleeAttack' context (Prowess -> legacy STR), dropping
    // the old max(STR mod, DEX mod) comparison — an accepted 5EClassic-mode approximation
    // (see docs/plans/2026-07-30-attribute-system-remap.md, relaxed fidelity rule).
    it('DC = 8 + proficiency + STR mod (Prowess)', async () => {
        const attacker = new Combatant(
            makeCharacter({ abilityModifiers: { str: 4, dex: 1, con: 0, int: 0, wis: 0, cha: 0 } }),
            'player', 'atk'
        );
        const defenderMods = { str: -10, dex: -10, con: 0, int: 0, wis: 0, cha: 0 };
        const defender = new Combatant(makeCharacter({ abilityModifiers: defenderMods }), 'enemy', 'def');

        mockDie(6, 3);   // maneuver die (d6 at level 5)
        mockDie(20, 10); // defender save roll

        const result = await runManeuver(tripAttackAbility, attacker, defender);

        // 8 + prof(3) + str(4) = 15
        expect(result.saveDC).toBe(15);
    });

    it('ignores DEX even when it is higher than STR', async () => {
        const attacker = new Combatant(
            makeCharacter({ abilityModifiers: { str: 0, dex: 5, con: 0, int: 0, wis: 0, cha: 0 } }),
            'player', 'atk'
        );
        const defenderMods = { str: -10, dex: -10, con: 0, int: 0, wis: 0, cha: 0 };
        const defender = new Combatant(makeCharacter({ abilityModifiers: defenderMods }), 'enemy', 'def');

        mockDie(6, 3);
        mockDie(20, 10);

        const result = await runManeuver(tripAttackAbility, attacker, defender);

        // 8 + prof(3) + str(0) = 11 — DEX(5) is no longer consulted
        expect(result.saveDC).toBe(11);
    });
});

describe('rollDefenderSave (via onHitSaveOrCondition)', () => {
    it('total = d20 + defender ability modifier for the configured saveType, no proficiency added', async () => {
        const attacker = new Combatant(makeCharacter(), 'player', 'atk');
        const defender = new Combatant(
            makeCharacter({ abilityModifiers: { str: 4, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }),
            'enemy', 'def'
        );

        mockDie(6, 2);   // maneuver die
        mockDie(20, 12); // defender's STR save roll

        const result = await runManeuver(tripAttackAbility, attacker, defender);

        expect(result.saveRoll).toBe(12 + 4); // 16 — no proficiency bonus for the defender's save
    });

    it('reads the ability modifier matching effects.onHitSaveOrCondition.saveType, not always STR', async () => {
        const attacker = new Combatant(makeCharacter(), 'player', 'atk');
        const defender = new Combatant(
            makeCharacter({ abilityModifiers: { str: 99, dex: 0, con: 0, int: 0, wis: -2, cha: 0 } }),
            'enemy', 'def'
        );

        mockDie(6, 2);
        mockDie(20, 10);

        const result = await runManeuver(menacingAttackAbility, attacker, defender);

        // Menacing Attack's saveType is 'wis' — must ignore the defender's (huge) STR mod.
        expect(result.saveRoll).toBe(10 + -2);
    });

    it('condition is applied when the save fails (roll < DC)', async () => {
        const attacker = new Combatant(
            makeCharacter({ abilityModifiers: { str: 10, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }),
            'player', 'atk'
        );
        const defender = new Combatant(
            makeCharacter({ abilityModifiers: { str: -10, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }),
            'enemy', 'def'
        );

        mockDie(6, 1);
        mockDie(20, 1); // 1 + (-10) = -9, far below any DC

        const result = await runManeuver(tripAttackAbility, attacker, defender);

        expect(result.conditionApplied).toBe(true);
        expect(defender.hasCondition('prone')).toBe(true);
    });

    it('condition is NOT applied when the save succeeds (roll >= DC)', async () => {
        const attacker = new Combatant(
            makeCharacter({ abilityModifiers: { str: -5, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }),
            'player', 'atk'
        );
        const defender = new Combatant(
            makeCharacter({ abilityModifiers: { str: 10, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }),
            'enemy', 'def'
        );

        mockDie(6, 1);
        mockDie(20, 20); // 20 + 10 = 30, comfortably beats any DC

        const result = await runManeuver(tripAttackAbility, attacker, defender);

        expect(result.conditionApplied).toBe(false);
        expect(defender.hasCondition('prone')).toBe(false);
    });
});
