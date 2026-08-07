/**
 * Tests for the Dedication L2-L9 tactic/maneuver-rename work (2026-08-05):
 *   - Indomitable (L2, both specs): rerollSavingThrow handler
 *   - Exposed (L3, Exemplar): disadvantage-on-next-tactic-save passive, including the
 *     addCondition stacking-guard interaction explicitly called out for verification
 *   - Vanguard's Charge (L5, Exemplar): +1 attack / +1d4 damage vs an unengaged target
 *   - Rally's ally option (allyTempHP): minimal single-engaged-ally targeting
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
import { CombatManager, Combatant } from '../../src/systems/CombatManager.js';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';

globalThis.window = globalThis.window || {};
window.game = null;

/** Force the next `Math.floor(Math.random() * sides) + 1` roll to resolve to `value`. */
function mockDie(sides, value) {
    return vi.spyOn(Math, 'random').mockReturnValueOnce((value - 1) / sides);
}

function makeCharacter(overrides = {}) {
    const abilityModifiers = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0, ...(overrides.abilityModifiers || {}) };
    const abilities = Object.fromEntries(
        Object.entries(abilityModifiers).map(([key, mod]) => [key, mod * 2 + 10])
    );
    return {
        name: 'Fixture',
        level: 5, // tactic die: d6 (L3-6); proficiency +3
        proficiencyBonus: 3,
        fightingStyle: null,
        equipment: { mainHand: null, offHand: null, armor: null },
        maxHP: 20,
        currentHP: 20,
        ac: 15,
        selectedAbilities: [],
        ...overrides,
        abilityModifiers,
        abilities: { ...abilities, ...(overrides.abilities || {}) }
    };
}

function lastMessageStartingWith(prefix) {
    const log = gameState.data.ui.messageLog;
    for (let i = log.length - 1; i >= 0; i--) {
        if (log[i].text.startsWith(prefix)) {
            return log[i].text;
        }
    }
    return null;
}

const originalAttributeSystem = RULES.attributes.system;

beforeEach(() => {
    gameState.data.ui.messageLog = [];
    RULES.attributes.system = '5EClassic';
    window.game = null;
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

// ---------------------------------------------------------------------------
// Indomitable
// ---------------------------------------------------------------------------
describe('Indomitable — rerollSavingThrow handler', () => {
    const indomitableAbility = { id: 'indomitable', name: 'Indomitable', effects: { rerollSavingThrow: true } };

    it('rerolls using the save-ability modifier named by ctx.saveAbility', async () => {
        const reactor = new Combatant(makeCharacter({ abilityModifiers: { con: 3 } }), 'player', 'def');
        const ctx = {
            character: reactor.character,
            combatant: reactor,
            combatManager: null,
            outOfCombat: false,
            saveAbility: 'con',
            addMessage: (msg, type) => gameState.addMessage(msg, type),
            showFloatingText: () => {}
        };

        mockDie(20, 17);
        const results = await execute(indomitableAbility, indomitableAbility.effects, ctx);
        const result = results.find(r => r.type === 'rerollSavingThrow').result;

        expect(result.newRoll).toBe(17);
        expect(result.newTotal).toBe(17 + 3);
    });
});

// ---------------------------------------------------------------------------
// Exposed
// ---------------------------------------------------------------------------
describe('Exposed passive (onHitSaveOrCondition disadvantage)', () => {
    const tripAttackAbility = {
        id: 'tripAttack',
        name: 'Trip Attack',
        effects: {
            onHitSaveOrCondition: {
                saveType: 'str', condition: 'prone', conditionDuration: 'combat', conditionIcon: '🔻'
            }
        }
    };
    const menacingAttackAbility = {
        id: 'menacingAttack',
        name: 'Menacing Attack',
        effects: {
            onHitSaveOrCondition: {
                saveType: 'wis', condition: 'frightened', conditionDuration: 'untilEndOfTurn', conditionIcon: '😱'
            }
        }
    };

    it('no disadvantage without the exposed ability, even with a qualifying tactic condition present', async () => {
        const attacker = new Combatant(makeCharacter({ abilityModifiers: { str: 10 } }), 'player', 'atk');
        const defender = new Combatant(makeCharacter({ abilityModifiers: { str: 0 } }), 'enemy', 'def');
        defender.addCondition('slowed', 'combat', attacker.id, { inflictedByTactic: true });

        mockDie(6, 1);   // tactic die
        mockDie(20, 15); // single save roll (no disadvantage -> only one Math.random call)
        const results = await execute(tripAttackAbility, tripAttackAbility.effects, buildTestContext(attacker, defender));
        const result = results.find(r => r.type === 'onHitSaveOrCondition').result;

        expect(result.saveRoll).toBe(15 + 0);
    });

    it('applies disadvantage when attacker has exposed and defender carries an unconsumed tactic condition', async () => {
        const attacker = new Combatant(
            makeCharacter({ abilityModifiers: { str: 10 }, selectedTraits: ['grace_under_pressure'] }),
            'player', 'atk'
        );
        const defender = new Combatant(makeCharacter({ abilityModifiers: { str: 0 } }), 'enemy', 'def');
        defender.addCondition('slowed', 'combat', attacker.id, { inflictedByTactic: true });

        mockDie(6, 1);   // tactic die
        mockDie(20, 18); // first save roll
        mockDie(20, 3);  // second save roll — disadvantage takes the lower
        const results = await execute(tripAttackAbility, tripAttackAbility.effects, buildTestContext(attacker, defender));
        const result = results.find(r => r.type === 'onHitSaveOrCondition').result;

        expect(result.saveRoll).toBe(3 + 0);
        expect(defender.getCondition('slowed').exposedConsumed).toBe(true);
    });

    it('a condition applied by a tactic effect handler is tagged inflictedByTactic', async () => {
        const attacker = new Combatant(makeCharacter({ abilityModifiers: { str: 10 } }), 'player', 'atk');
        const defender = new Combatant(makeCharacter({ abilityModifiers: { str: -10 } }), 'enemy', 'def');

        mockDie(6, 1);
        mockDie(20, 1); // guaranteed save failure
        await execute(tripAttackAbility, tripAttackAbility.effects, buildTestContext(attacker, defender));

        const prone = defender.getCondition('prone');
        expect(prone.inflictedByTactic).toBe(true);
        expect(prone.appliedBy).toBe(attacker.id);
    });

    // Brief-mandated explicit verification of the addCondition stacking-guard interaction.
    describe('addCondition stacking-guard interaction', () => {
        it('different condition types (Trip then Menacing) on an already-prone target both apply cleanly', async () => {
            const attacker = new Combatant(
                makeCharacter({ abilityModifiers: { str: 10, wis: 10 }, selectedTraits: ['grace_under_pressure'] }),
                'player', 'atk'
            );
            const defender = new Combatant(makeCharacter({ abilityModifiers: { str: -10, wis: -10 } }), 'enemy', 'def');
            // Already prone from an earlier (unrelated) application of this attacker's tactic
            defender.addCondition('prone', 'combat', attacker.id, {
                isBuff: false, curable: false, icon: '🔻', inflictedByTactic: true
            });

            mockDie(6, 1);   // menacing tactic die
            mockDie(20, 18); // save roll 1
            mockDie(20, 2);  // save roll 2 — disadvantage consumes Prone's exposed charge
            await execute(menacingAttackAbility, menacingAttackAbility.effects, buildTestContext(attacker, defender));

            expect(defender.hasCondition('prone')).toBe(true);
            expect(defender.hasCondition('frightened')).toBe(true);
            expect(defender.getCondition('prone').exposedConsumed).toBe(true); // consumed by Menacing's proc
            expect(defender.getCondition('frightened').inflictedByTactic).toBe(true);
            expect(defender.getCondition('frightened').exposedConsumed).toBeFalsy(); // fresh, not yet consumed
        });

        it('same condition type reapplied (Trip Attack twice on an already-prone target): addCondition no-ops on the ' +
            'second call (confirmed real interaction), but exposedConsumed still persists because it is set via a ' +
            'direct mutation on the found condition object, not threaded through addCondition\'s options', async () => {
            const attacker = new Combatant(
                makeCharacter({ abilityModifiers: { str: 10 }, selectedTraits: ['grace_under_pressure'] }),
                'player', 'atk'
            );
            const defender = new Combatant(makeCharacter({ abilityModifiers: { str: -10 } }), 'enemy', 'def');
            defender.addCondition('prone', 'combat', attacker.id, {
                isBuff: false, curable: false, icon: '🔻', inflictedByTactic: true
            });

            // Second Trip Attack use: exposed proc should fire off the existing (unconsumed) Prone.
            mockDie(6, 1);   // tactic die
            mockDie(20, 18); // save roll 1
            mockDie(20, 2);  // save roll 2 — disadvantage
            await execute(tripAttackAbility, tripAttackAbility.effects, buildTestContext(attacker, defender));

            // Confirms the stacking guard: reapplying the same condition type does not create a
            // second entry — addCondition's `existing = this.conditions.find(...)` branch returns
            // false and leaves the array untouched.
            expect(defender.conditions.filter(c => c.type === 'prone').length).toBe(1);
            // Confirms exposedConsumed survived that no-op (set by direct object mutation in the
            // handler, before addCondition is ever called for the reapplication).
            expect(defender.getCondition('prone').exposedConsumed).toBe(true);

            // Third Trip Attack use: no unconsumed tactic condition remains, so no disadvantage —
            // only a single Math.random call for the save roll this time.
            mockDie(6, 1);
            mockDie(20, 12);
            const results = await execute(tripAttackAbility, tripAttackAbility.effects, buildTestContext(attacker, defender));
            const result = results.find(r => r.type === 'onHitSaveOrCondition').result;
            expect(result.saveRoll).toBe(12 - 10); // defender STR mod is -10 in this describe block
        });
    });
});

// ---------------------------------------------------------------------------
// Vanguard's Charge
// ---------------------------------------------------------------------------
describe('Vanguard\'s Charge (CombatManager.attack — melee, unengaged target)', () => {
    function makeAttacker(overrides = {}) {
        return new Combatant(
            makeCharacter({
                abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
                equipment: { mainHand: { id: 'sword', weaponType: 'melee', properties: [], damage: '1d8', damageType: 'bone' }, offHand: null, armor: null },
                selectedTraits: ['vanguard'],
                ...overrides
            }),
            'player', 'atk'
        );
    }

    it('adds +1 to the attack roll and +1d4 bonus damage when a tactic is queued against an unengaged target', async () => {
        const cm = new CombatManager();
        const attacker = makeAttacker();
        attacker.pendingTactic = 'someTactic';
        const defender = new Combatant(makeCharacter({ ac: 5 }), 'enemy', 'def');

        mockDie(20, 15); // attack roll
        mockDie(4, 3);   // Vanguard's Charge bonus damage die
        mockDie(8, 5);   // weapon damage die
        await cm.attack(attacker, defender);

        expect(lastMessageStartingWith('Attack roll:')).toContain('+ 1 (Vanguard\'s Charge)');
        expect(lastMessageStartingWith('Attack roll:')).toContain('= 19 vs AC 5');
        expect(defender.hp).toBe(defender.maxHP - (5 + 3)); // weapon die + vanguard bonus die
    });

    it('does not fire when the target is already engaged with someone', async () => {
        const cm = new CombatManager();
        const attacker = makeAttacker();
        attacker.pendingTactic = 'someTactic';
        const defender = new Combatant(makeCharacter({ ac: 5 }), 'enemy', 'def');
        defender.engagedWith.add('someoneElse'); // already engaged before this attack

        mockDie(20, 15);
        mockDie(8, 5);
        await cm.attack(attacker, defender);

        expect(lastMessageStartingWith('🐎')).toBeNull();
        expect(lastMessageStartingWith('Attack roll:')).toContain('= 18 vs AC 5');
    });

    it('does not fire without a queued tactic', async () => {
        const cm = new CombatManager();
        const attacker = makeAttacker();
        // attacker.pendingTactic left null
        const defender = new Combatant(makeCharacter({ ac: 5 }), 'enemy', 'def');

        mockDie(20, 15);
        mockDie(8, 5);
        await cm.attack(attacker, defender);

        expect(lastMessageStartingWith('🐎')).toBeNull();
    });

    it('does not fire without the vanguard passive', async () => {
        const cm = new CombatManager();
        const attacker = makeAttacker({ selectedTraits: [] });
        attacker.pendingTactic = 'someTactic';
        const defender = new Combatant(makeCharacter({ ac: 5 }), 'enemy', 'def');

        mockDie(20, 15);
        mockDie(8, 5);
        await cm.attack(attacker, defender);

        expect(lastMessageStartingWith('🐎')).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Rally — ally option (allyTempHP)
// ---------------------------------------------------------------------------
describe('allyTempHP (Rally ally option)', () => {
    it('grants temp HP to an engaged companion combatant', async () => {
        const cm = new CombatManager();
        const userChar = makeCharacter({ abilityModifiers: { con: 2 } });
        const user = new Combatant(userChar, 'player', 'usr');
        const companion = new Combatant(makeCharacter(), 'companion', 'comp1');
        companion.engagedWith.add('enemy1');
        cm.companionCombatants = [companion];

        const ctx = {
            character: userChar, combatant: user, combatManager: cm, outOfCombat: false,
            addMessage: (msg, type) => gameState.addMessage(msg, type), showFloatingText: () => {}
        };
        mockDie(6, 4); // tactic die (level 5 -> d6)
        const results = await execute(
            { id: 'rally', name: 'Rally' },
            { allyTempHP: { dice: 'tacticDie', bonus: 'conMod' } },
            ctx
        );
        const result = results.find(r => r.type === 'allyTempHP').result;

        expect(result.tempHP).toBe(4 + 2);
        expect(companion.getCondition('tempHP').value).toBe(6);
        expect(user.actions.bonusAction).toBe(0);
    });

    it('no-ops when no ally is currently engaged', async () => {
        const cm = new CombatManager();
        const userChar = makeCharacter();
        const user = new Combatant(userChar, 'player', 'usr');
        const companion = new Combatant(makeCharacter(), 'companion', 'comp1'); // not engaged
        cm.companionCombatants = [companion];

        const ctx = {
            character: userChar, combatant: user, combatManager: cm, outOfCombat: false,
            addMessage: (msg, type) => gameState.addMessage(msg, type), showFloatingText: () => {}
        };
        const results = await execute(
            { id: 'rally', name: 'Rally' },
            { allyTempHP: { dice: 'tacticDie', bonus: 'conMod' } },
            ctx
        );
        const result = results.find(r => r.type === 'allyTempHP').result;

        expect(result.skipped).toBe(true);
        expect(companion.conditions.length).toBe(0);
    });
});
