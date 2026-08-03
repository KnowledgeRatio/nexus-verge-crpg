/**
 * Tests for src/systems/EffectDispatcher.js's maneuver save-DC / defender-save math under
 * RULES.attributes.system === 'NVSystem' (docs/plans/2026-07-30-attribute-system-remap.md,
 * M1 step 6, decisions #3/#5). Companion to tests/systems/effectDispatcher.characterization.test.js,
 * which pins the '5EClassic'-mode formula this file does not touch.
 *
 * Covers:
 *  - Menacing Attack's `dcContext: "menacingAttackDC"` override — the DC blends
 *    Prowess+Presence only in 'NVSystem' mode; Trip/Pushing/Disarming Attack have no
 *    `dcContext` and stay on the shared meleeAttack (Prowess-only) DC in both modes.
 *  - Trip/Pushing/Disarming Attack's saveType flip from "str" to "vitality" (decision #5's
 *    coupled data change) resolving correctly in 'NVSystem' mode.
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

/** Build a fixture character with new-system attribute keys (NVSystem mode shape). */
function makeSixAttributeCharacter(overrides = {}) {
    const attributes = {
        prowess: 10, vitality: 10, intellect: 10, insight: 10, presence: 10, composure: 10,
        ...(overrides.abilities || {})
    };
    return {
        name: 'Fixture',
        level: 5, // maneuver die: d6 (L3-6); proficiency +3
        proficiencyBonus: 3,
        maxHP: 20,
        currentHP: 20,
        ac: 15,
        ...overrides,
        abilities: attributes
    };
}

const tripAttackAbility = {
    id: 'tripAttack',
    name: 'Trip Attack',
    effects: {
        onHitSaveOrCondition: {
            bonusDice: 'maneuverDie',
            saveType: 'vitality',
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
            conditionIcon: '😱',
            dcContext: 'menacingAttackDC'
        }
    }
};

const originalSystem = RULES.attributes.system;

beforeEach(() => {
    gameState.data.ui.messageLog = [];
    RULES.attributes.system = 'NVSystem';
});

afterEach(() => {
    RULES.attributes.system = originalSystem;
    vi.restoreAllMocks();
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

async function runManeuver(ability, attacker, defender) {
    const results = await execute(ability, ability.effects, buildTestContext(attacker, defender));
    return results.find(r => r.type === 'onHitSaveOrCondition').result;
}

describe('maneuverSaveDC — Menacing Attack dcContext override (NVSystem mode)', () => {
    it('DC = 8 + proficiency + floor((Prowess_mod + Presence_mod) / 2), not Prowess alone', async () => {
        const attacker = new Combatant(
            makeSixAttributeCharacter({ abilities: { prowess: 13, presence: 11 } }), // 1.5 + 0.5 = 2.0
            'player', 'atk'
        );
        const defender = new Combatant(makeSixAttributeCharacter(), 'enemy', 'def');

        mockDie(6, 3);   // maneuver die
        mockDie(20, 10); // defender save roll

        const result = await runManeuver(menacingAttackAbility, attacker, defender);

        // 8 + prof(3) + floor(2.0 / 2) = 12
        expect(result.saveDC).toBe(12);
    });

    it('a pure-Prowess build (Presence dumped) gets a lower DC than a balanced build with the same total investment', async () => {
        const pureProwess = new Combatant(
            makeSixAttributeCharacter({ abilities: { prowess: 18, presence: 8 } }), // 4 + -1 = 3 -> floor(3/2) = 1
            'player', 'atk'
        );
        const balanced = new Combatant(
            makeSixAttributeCharacter({ abilities: { prowess: 14, presence: 14 } }), // 2 + 2 = 4 -> floor(4/2) = 2
            'player', 'atk2'
        );
        const defender = new Combatant(makeSixAttributeCharacter(), 'enemy', 'def');

        mockDie(6, 3);
        mockDie(20, 10);
        const pureResult = await runManeuver(menacingAttackAbility, pureProwess, defender);

        mockDie(6, 3);
        mockDie(20, 10);
        const balancedResult = await runManeuver(menacingAttackAbility, balanced, defender);

        expect(pureResult.saveDC).toBe(8 + 3 + 1); // 12
        expect(balancedResult.saveDC).toBe(8 + 3 + 2); // 13
        expect(balancedResult.saveDC).toBeGreaterThan(pureResult.saveDC);
    });

    it('Trip Attack (no dcContext) stays on the shared meleeAttack (Prowess-only) DC, unaffected by Presence', async () => {
        const attacker = new Combatant(
            makeSixAttributeCharacter({ abilities: { prowess: 14, presence: 20 } }), // Presence must be ignored
            'player', 'atk'
        );
        const defender = new Combatant(makeSixAttributeCharacter(), 'enemy', 'def');

        mockDie(6, 3);
        mockDie(20, 10);

        const result = await runManeuver(tripAttackAbility, attacker, defender);

        // 8 + prof(3) + prowess(2) = 13 — huge Presence(+5) is never consulted
        expect(result.saveDC).toBe(13);
    });
});

describe('rollDefenderSave — Trip/Pushing/Disarming Attack saveType "vitality" (NVSystem mode)', () => {
    it('resolves the defender\'s save off Vitality, not Strength (which no longer exists as an attribute)', async () => {
        const attacker = new Combatant(makeSixAttributeCharacter(), 'player', 'atk');
        const defender = new Combatant(
            makeSixAttributeCharacter({ abilities: { vitality: 18, prowess: -100 } }), // huge Vitality, absurd Prowess ignored
            'enemy', 'def'
        );

        mockDie(6, 2);
        mockDie(20, 10);

        const result = await runManeuver(tripAttackAbility, attacker, defender);

        // Vitality 18 -> mod +4. 10 + 4 = 14.
        expect(result.saveRoll).toBe(14);
    });

    it('condition applies/resists correctly based on the Vitality-driven save total', async () => {
        const attacker = new Combatant(
            makeSixAttributeCharacter({ abilities: { prowess: 10 } }), // DC = 8+3+0 = 11
            'player', 'atk'
        );
        const lowVitality = new Combatant(
            makeSixAttributeCharacter({ abilities: { vitality: 6 } }), // mod -2
            'enemy', 'def'
        );

        mockDie(6, 1);
        mockDie(20, 5); // 5 + -2 = 3, below DC 11

        const result = await runManeuver(tripAttackAbility, attacker, lowVitality);

        expect(result.conditionApplied).toBe(true);
        expect(lowVitality.hasCondition('prone')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Bug 3 regression (2026-08-01): rollDefenderSave() must prefer an explicit
// character.savingThrows override (the monster-loader shim's hand-authored wis/cha save
// bonuses, e.g. zombie/mage — see monsterAttributeConversion.js's convertMonsterSavingThrows)
// over the ability-modifier-derived default, when one exists for the resolved attribute.
// ---------------------------------------------------------------------------
describe('rollDefenderSave — explicit savingThrows override beats derived default (NVSystem mode)', () => {
    it('uses the override value outright, ignoring the ability-modifier default entirely', async () => {
        const attacker = new Combatant(makeSixAttributeCharacter(), 'player', 'atk');
        const defender = new Combatant(
            makeSixAttributeCharacter({
                abilities: { vitality: 10 }, // derived default would be mod 0
                savingThrows: { vitality: 7 } // hand-authored override, e.g. zombie/mage shim
            }),
            'enemy', 'def'
        );

        mockDie(6, 2);
        mockDie(20, 10);

        const result = await runManeuver(tripAttackAbility, attacker, defender);

        // Override wins: 10 (d20) + 7 (override) = 17, not 10 + 0 (derived default) = 10.
        expect(result.saveRoll).toBe(17);
    });

    it('falls back to the ability-modifier default when no override is present for the resolved attribute', async () => {
        const attacker = new Combatant(makeSixAttributeCharacter(), 'player', 'atk');
        const defender = new Combatant(
            makeSixAttributeCharacter({
                abilities: { vitality: 14 }, // mod +2
                savingThrows: { composure: 99 } // override present, but for a different attribute
            }),
            'enemy', 'def'
        );

        mockDie(6, 2);
        mockDie(20, 10);

        const result = await runManeuver(tripAttackAbility, attacker, defender);

        // No vitality override -> falls through to the derived default: 10 + 2 = 12.
        expect(result.saveRoll).toBe(12);
    });
});

// ---------------------------------------------------------------------------
// Regression: saveType "vitality" must not silently zero out in '5EClassic' mode either.
// legacySaveAbilityToContext only has entries for the six legacy abbreviations (str/dex/
// con/int/wis/cha) — "vitality" isn't one of them, so rollDefenderSave's fallback
// (`?? \`${saveAbility}Save\``) is what makes this resolve at all. Without it, this would
// silently return contextKey === undefined -> 0 modifier for every 5EClassic-mode defender,
// in BOTH modes, not just NVSystem. Overrides this file's global beforeEach — '5EClassic'
// was the default before the M1.5 flip (2026-08-03) and remains live as rollback, so this
// mode is still explicitly exercised even though it's no longer the default.
// ---------------------------------------------------------------------------
describe('rollDefenderSave — saveType "vitality" in 5EClassic mode', () => {
    beforeEach(() => {
        RULES.attributes.system = '5EClassic';
    });

    it('redirects vitalitySave -> legacy con, not a silent 0', async () => {
        const attacker = new Combatant(
            { name: 'Fixture', level: 5, proficiencyBonus: 3, maxHP: 20, currentHP: 20, ac: 15, abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } },
            'player', 'atk'
        );
        const defender = new Combatant(
            { name: 'Fixture', level: 5, proficiencyBonus: 3, maxHP: 20, currentHP: 20, ac: 15, abilities: { str: 20, dex: 10, con: 16, int: 10, wis: 10, cha: 10 } },
            'enemy', 'def'
        );

        mockDie(6, 2);
        mockDie(20, 10);

        const result = await runManeuver(tripAttackAbility, attacker, defender);

        // CON 16 -> mod +3. 10 + 3 = 13. (If this silently fell back to 0, result would be 10.)
        expect(result.saveRoll).toBe(13);
    });
});
