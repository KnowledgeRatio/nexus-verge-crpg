/**
 * Characterization tests for src/systems/CombatManager.js — LEGACY (str/dex/con/int/wis/cha)
 * behavior, captured before the attribute-system remap (docs/plans/2026-07-30-attribute-
 * system-remap.md). Locks in the current to-hit roll formula (melee/ranged/finesse),
 * initiative rolling, and the flee check so M1 refactors can be verified against a
 * known-good baseline.
 *
 * Historical scope note: earlier versions of this file deliberately stayed on the MISS
 * path of attack() because the hit branch (~line 1107+) called
 * `attacker.character.abilities?.find(ab => ab.id === ...)` to look up on-hit maneuver/
 * variable-cost-damage abilities — `character.abilities` is the ability-SCORE bag
 * ({str, dex, ...}), not an array, so `.find` threw on every confirmed player/companion
 * melee hit. That's now fixed: ability lookups go through
 * `CombatManager._findKnownAbility(character, abilityId)`, which reads the full ability
 * definition from `window.game.abilitiesData.abilities[character.class.id]`, gated on
 * `character.selectedAbilities` OR `character.knownTactics`. The "hit path is safe now"
 * tests below exercise that.
 *
 * Tactic/maneuver rename (2026-08-05): `Combatant.pendingManeuver` -> `pendingTactic`.
 * Also fixed a real bug found during the rename: Exemplar tactics are stored exclusively
 * in `character.knownTactics` by `Character.applyLevelUpSelections` (never in
 * `selectedAbilities` — those are two separate level-up choice paths), so a
 * `selectedAbilities`-only lookup here silently no-opped every on-hit tactic effect for
 * every real character. `_findKnownAbility` now checks both lists.
 *
 * AudioManager is mocked because its real constructor calls `new Audio(...)`, which
 * doesn't exist in the Node test environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/systems/AudioManager.js', () => ({
    default: {
        playCombatSound: vi.fn(),
        play: vi.fn()
    }
}));

import { CombatManager, Combatant } from '../../src/systems/CombatManager.js';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';

// window.game / window.lootManager are read via optional chaining deep in CombatManager;
// `window` itself must exist as a global or those reads throw ReferenceError.
globalThis.window = globalThis.window || {};
window.game = null;
window.lootManager = null;

/** Force the next rollD20()/rollDie(20) call to resolve to `value` (1-20). */
function mockD20(value) {
    vi.spyOn(Math, 'random').mockReturnValueOnce((value - 1) / 20);
}

function makeCharacter(overrides = {}) {
    // abilityModifiers stays the primary fixture input (tests express intent in
    // modifiers), but the attributeResolver reads raw `.abilities` scores, not
    // pre-floored modifiers — so derive a matching `.abilities` bag too (score =
    // mod*2+10, the exact inverse of floor((score-10)/2) for integer modifiers).
    // An explicit `overrides.abilities` (e.g. the initiative tests below) still wins.
    const abilityModifiers = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0, ...(overrides.abilityModifiers || {}) };
    const derivedAbilities = Object.fromEntries(
        Object.entries(abilityModifiers).map(([key, mod]) => [key, mod * 2 + 10])
    );
    return {
        name: 'Fixture',
        level: 5,
        proficiencyBonus: 3,
        fightingStyle: null,
        equipment: { mainHand: null, offHand: null, armor: null },
        maxHP: 20,
        currentHP: 20,
        ac: 15,
        ...overrides,
        abilityModifiers,
        abilities: { ...derivedAbilities, ...(overrides.abilities || {}) }
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

// Default flag flipped to 'NVSystem' at M1.5 (2026-08-03). This file characterizes
// '5EClassic' (legacy str/dex/con/int/wis/cha) behavior specifically, so force that mode
// for every test in this file except the explicit 'NVSystem mode' describe block below,
// which overrides it back to 'NVSystem' in its own nested beforeEach.
const originalAttributeSystem = RULES.attributes.system;

beforeEach(() => {
    gameState.data.ui.messageLog = [];
    RULES.attributes.system = '5EClassic';
});

afterEach(() => {
    vi.restoreAllMocks();
    RULES.attributes.system = originalAttributeSystem;
});

// ---------------------------------------------------------------------------
// Attack roll resolution — melee / ranged / finesse / unarmed
// ---------------------------------------------------------------------------
describe('CombatManager.attack — to-hit roll resolution (legacy ability keys)', () => {
    it('melee weapon uses STR modifier + proficiency', async () => {
        const cm = new CombatManager();
        const attacker = new Combatant(
            makeCharacter({
                abilityModifiers: { str: 3, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
                equipment: { mainHand: { id: 'sword', weaponType: 'melee', properties: [], damage: { dice: '1d8' }, damageType: 'bone' }, offHand: null, armor: null }
            }),
            'enemy', 'atk'
        );
        const defender = new Combatant(makeCharacter({ ac: 999 }), 'enemy', 'def');

        mockD20(10); // attack roll, avoids crit (20) and crit-miss (1)
        await cm.attack(attacker, defender);

        expect(lastMessageStartingWith('Attack roll:')).toBe(
            'Attack roll: 10 + 3 (ability) + 3 (prof) = 16 vs AC 999'
        );
    });

    // Updated 2026-08-01 (attribute-remap M1): ranged and finesse attack bonus now both
    // resolve through the resolver's 'rangedFinesseAttack' context (Prowess -> legacy
    // STR), dropping the old DEX-only ranged bonus and max(STR,DEX) finesse bonus. An
    // accepted legacy-mode approximation (see docs/plans/2026-07-30-attribute-system-
    // remap.md, relaxed fidelity rule); finesse fidelity specifically is out of scope,
    // tracked separately (issue #21).
    it('ranged weapon resolves through Prowess (STR), ignoring DEX', async () => {
        const cm = new CombatManager();
        const attacker = new Combatant(
            makeCharacter({
                abilityModifiers: { str: 2, dex: 4, con: 0, int: 0, wis: 0, cha: 0 },
                equipment: { mainHand: { id: 'bow', weaponType: 'ranged', properties: [], damage: { dice: '1d8' }, damageType: 'bone', ammoCapacity: 20 }, offHand: null, armor: null }
            }),
            'enemy', 'atk'
        );
        const defender = new Combatant(makeCharacter({ ac: 999 }), 'enemy', 'def');

        mockD20(10);
        await cm.attack(attacker, defender);

        expect(lastMessageStartingWith('Attack roll:')).toBe(
            'Attack roll: 10 + 2 (ability) + 3 (prof) = 15 vs AC 999'
        );
    });

    it('finesse weapon resolves through Prowess (STR), ignoring the higher DEX modifier', async () => {
        const cm = new CombatManager();
        const attacker = new Combatant(
            makeCharacter({
                abilityModifiers: { str: 2, dex: 5, con: 0, int: 0, wis: 0, cha: 0 },
                equipment: { mainHand: { id: 'rapier', weaponType: 'melee', properties: ['finesse'], damage: { dice: '1d8' }, damageType: 'bone' }, offHand: null, armor: null }
            }),
            'enemy', 'atk'
        );
        const defender = new Combatant(makeCharacter({ ac: 999 }), 'enemy', 'def');

        mockD20(10);
        await cm.attack(attacker, defender);

        expect(lastMessageStartingWith('Attack roll:')).toBe(
            'Attack roll: 10 + 2 (ability) + 3 (prof) = 15 vs AC 999'
        );
    });

    it('finesse weapon resolves through Prowess (STR) when STR is already higher', async () => {
        const cm = new CombatManager();
        const attacker = new Combatant(
            makeCharacter({
                abilityModifiers: { str: 4, dex: 1, con: 0, int: 0, wis: 0, cha: 0 },
                equipment: { mainHand: { id: 'rapier', weaponType: 'melee', properties: ['finesse'], damage: { dice: '1d8' }, damageType: 'bone' }, offHand: null, armor: null }
            }),
            'enemy', 'atk'
        );
        const defender = new Combatant(makeCharacter({ ac: 999 }), 'enemy', 'def');

        mockD20(10);
        await cm.attack(attacker, defender);

        expect(lastMessageStartingWith('Attack roll:')).toBe(
            'Attack roll: 10 + 4 (ability) + 3 (prof) = 17 vs AC 999'
        );
    });

    it('unarmed attack uses STR modifier', async () => {
        const cm = new CombatManager();
        const attacker = new Combatant(
            makeCharacter({
                abilityModifiers: { str: 2, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
                equipment: { mainHand: null, offHand: null, armor: null }
            }),
            'enemy', 'atk'
        );
        const defender = new Combatant(makeCharacter({ ac: 999 }), 'enemy', 'def');

        mockD20(10);
        await cm.attack(attacker, defender);

        expect(lastMessageStartingWith('Attack roll:')).toBe(
            'Attack roll: 10 + 2 (ability) + 3 (prof) = 15 vs AC 999'
        );
    });

    it('natural 1 is always a critical miss, regardless of bonus', async () => {
        const cm = new CombatManager();
        const attacker = new Combatant(
            makeCharacter({ abilityModifiers: { str: 10, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } }),
            'enemy', 'atk'
        );
        const defender = new Combatant(makeCharacter({ ac: 1 }), 'enemy', 'def');

        mockD20(1);
        await cm.attack(attacker, defender);

        expect(lastMessageStartingWith('💥 Critical miss!')).toBe('💥 Critical miss!');
    });

    it('consumes the attacker action on a resolved attack', async () => {
        const cm = new CombatManager();
        const attacker = new Combatant(makeCharacter(), 'enemy', 'atk');
        const defender = new Combatant(makeCharacter({ ac: 999 }), 'enemy', 'def');

        expect(attacker.actions.action).toBe(1);
        mockD20(10);
        await cm.attack(attacker, defender);
        expect(attacker.actions.action).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Attack roll resolution — 'NVSystem' mode (ADR-015 characterization prerequisite,
// 2026-08-07, ahead of the Hearthcraft buff-aware branch landing in
// getRawAttributeModifier()). 'NVSystem' is the live default (flipped at M1.5,
// 2026-08-03) — every 5EClassic-mode test above pins the rollback path, but until now
// nothing pinned the to-hit roll (the single hottest consumer of the resolver) under the
// mode actually running in production. Mirrors the 5EClassic block's assertions/message
// format, with 'prowess'/'insight' fixture keys instead of legacy 'str'/'dex' — meleeAttack
// and rangedFinesseAttack both resolve to Prowess only in this mode (no dropped-DEX
// nuance to characterize, unlike 5EClassic), so melee + ranged is sufficient to lock the
// formula and message shape without redundant near-duplicate finesse/unarmed variants.
// ---------------------------------------------------------------------------
describe('CombatManager.attack — to-hit roll resolution (NVSystem mode)', () => {
    const originalSystem = RULES.attributes.system;
    beforeEach(() => {
        RULES.attributes.system = 'NVSystem';
    });
    afterEach(() => {
        RULES.attributes.system = originalSystem;
    });

    it('melee weapon uses Prowess modifier + proficiency', async () => {
        const cm = new CombatManager();
        const attacker = new Combatant(
            makeCharacter({
                abilities: { prowess: 16 }, // +3
                equipment: { mainHand: { id: 'sword', weaponType: 'melee', properties: [], damage: { dice: '1d8' }, damageType: 'bone' }, offHand: null, armor: null }
            }),
            'enemy', 'atk'
        );
        const defender = new Combatant(makeCharacter({ ac: 999 }), 'enemy', 'def');

        mockD20(10); // avoids crit (20) and crit-miss (1)
        await cm.attack(attacker, defender);

        expect(lastMessageStartingWith('Attack roll:')).toBe(
            'Attack roll: 10 + 3 (ability) + 3 (prof) = 16 vs AC 999'
        );
    });

    it('ranged weapon also resolves through Prowess, ignoring Insight', async () => {
        const cm = new CombatManager();
        const attacker = new Combatant(
            makeCharacter({
                abilities: { prowess: 14, insight: 20 }, // Insight must be ignored
                equipment: { mainHand: { id: 'bow', weaponType: 'ranged', properties: [], damage: { dice: '1d8' }, damageType: 'bone', ammoCapacity: 20 }, offHand: null, armor: null }
            }),
            'enemy', 'atk'
        );
        const defender = new Combatant(makeCharacter({ ac: 999 }), 'enemy', 'def');

        mockD20(10);
        await cm.attack(attacker, defender);

        expect(lastMessageStartingWith('Attack roll:')).toBe(
            'Attack roll: 10 + 2 (ability) + 3 (prof) = 15 vs AC 999'
        );
    });
});

// ---------------------------------------------------------------------------
// Hit path — on-hit ability dispatch (regression coverage for the
// `attacker.character.abilities?.find(...)` TypeError fixed via
// CombatManager._findKnownAbility; `character.abilities` is the ability-SCORE
// bag, not an array of known ability definitions)
// ---------------------------------------------------------------------------
describe('CombatManager.attack — confirmed hit resolves without throwing', () => {
    afterEach(() => {
        window.game = null;
    });

    it('a plain confirmed hit with no pending maneuver does not throw and consumes the action', async () => {
        const cm = new CombatManager();
        const attacker = new Combatant(makeCharacter(), 'enemy', 'atk');
        const defender = new Combatant(makeCharacter({ ac: 1 }), 'enemy', 'def');

        mockD20(15); // guaranteed hit, not a natural 1/20
        await expect(cm.attack(attacker, defender)).resolves.not.toThrow();
        expect(attacker.actions.action).toBe(0);
    });

    it('a confirmed player hit with an unknown pendingTactic value does not throw', async () => {
        const cm = new CombatManager();
        const attacker = new Combatant(makeCharacter(), 'player', 'atk');
        const defender = new Combatant(makeCharacter({ ac: 1 }), 'enemy', 'def');
        attacker.pendingTactic = 'notARealAbility';

        mockD20(15);
        await expect(cm.attack(attacker, defender)).resolves.not.toThrow();
        expect(attacker.pendingTactic).toBeNull(); // still cleared after the hit
    });

    it('_findKnownAbility returns abilities known via selectedAbilities', () => {
        const cm = new CombatManager();
        window.game = {
            abilitiesData: {
                abilities: {
                    dedication: [{ id: 'testTrip', name: 'Test Trip', actionType: 'onHit', effects: {} }]
                }
            }
        };
        const known = makeCharacter({ class: { id: 'dedication' }, selectedAbilities: ['testTrip'] });
        const unknown = makeCharacter({ class: { id: 'dedication' }, selectedAbilities: [] });

        expect(cm._findKnownAbility(known, 'testTrip')?.id).toBe('testTrip');
        expect(cm._findKnownAbility(unknown, 'testTrip')).toBeNull();
        expect(cm._findKnownAbility(known, null)).toBeNull();
        expect(cm._findKnownAbility(known, undefined)).toBeNull();
    });

    it('_findKnownAbility also returns tactics known only via knownTactics (the real Character.applyLevelUpSelections path — tactics are never added to selectedAbilities)', () => {
        const cm = new CombatManager();
        window.game = {
            abilitiesData: {
                abilities: {
                    dedication: [{ id: 'testTrip', name: 'Test Trip', actionType: 'onHit', effects: {} }]
                }
            }
        };
        const knownByTactic = makeCharacter({ class: { id: 'dedication' }, selectedAbilities: [], knownTactics: ['testTrip'] });
        const knowsNeither = makeCharacter({ class: { id: 'dedication' }, selectedAbilities: [], knownTactics: [] });

        expect(cm._findKnownAbility(knownByTactic, 'testTrip')?.id).toBe('testTrip');
        expect(cm._findKnownAbility(knowsNeither, 'testTrip')).toBeNull();
    });

    it('a confirmed hit dispatches a known queued onHit tactic via EffectDispatcher (real construction path — knownTactics, not selectedAbilities)', async () => {
        const cm = new CombatManager();
        const attackerChar = makeCharacter({
            class: { id: 'dedication' },
            selectedAbilities: [],
            knownTactics: ['testTrip']
        });
        const attacker = new Combatant(attackerChar, 'player', 'atk');
        const defender = new Combatant(makeCharacter({ ac: 1 }), 'enemy', 'def');
        attacker.pendingTactic = 'testTrip';

        window.game = {
            abilitiesData: {
                abilities: {
                    dedication: [{
                        id: 'testTrip',
                        name: 'Test Trip',
                        actionType: 'onHit',
                        effects: {
                            onHitSaveOrCondition: {
                                saveType: 'str',
                                condition: 'prone',
                                conditionDuration: 'untilEndOfTurn'
                            }
                        }
                    }]
                }
            }
        };

        mockD20(15);
        await expect(cm.attack(attacker, defender)).resolves.not.toThrow();

        expect(attacker.pendingTactic).toBeNull();
        expect(lastMessageStartingWith('⚔️ Test Trip!')).toContain('extra damage');
    });
});

// ---------------------------------------------------------------------------
// Initiative
// ---------------------------------------------------------------------------
describe('CombatManager.rollInitiative', () => {
    it('initiative = d20 + DEX modifier, per combatant', () => {
        const cm = new CombatManager();
        const a = new Combatant(makeCharacter({ abilityModifiers: { str: 0, dex: 2, con: 0, int: 0, wis: 0, cha: 0 }, abilities: { dex: 14 } }), 'player', 'a');
        const b = new Combatant(makeCharacter({ abilityModifiers: { str: 0, dex: -1, con: 0, int: 0, wis: 0, cha: 0 }, abilities: { dex: 8 } }), 'enemy', 'b');
        cm.combatants = [a, b];

        vi.spyOn(Math, 'random')
            .mockReturnValueOnce((12 - 1) / 20) // a rolls 12
            .mockReturnValueOnce((15 - 1) / 20); // b rolls 15

        cm.rollInitiative();

        expect(a.initiative).toBe(14); // 12 + 2
        expect(b.initiative).toBe(14); // 15 - 1
    });

    it('sorts turn order highest initiative first, DEX as tiebreaker', () => {
        const cm = new CombatManager();
        const a = new Combatant(makeCharacter({ abilityModifiers: { str: 0, dex: 2, con: 0, int: 0, wis: 0, cha: 0 }, abilities: { dex: 14 } }), 'player', 'a');
        const b = new Combatant(makeCharacter({ abilityModifiers: { str: 0, dex: -1, con: 0, int: 0, wis: 0, cha: 0 }, abilities: { dex: 8 } }), 'enemy', 'b');
        cm.combatants = [a, b];

        vi.spyOn(Math, 'random')
            .mockReturnValueOnce((12 - 1) / 20) // a: 12 + 2 = 14
            .mockReturnValueOnce((15 - 1) / 20); // b: 15 - 1 = 14 (tie, a wins on DEX)

        cm.rollInitiative();

        expect(cm.turnOrder.map(c => c.id)).toEqual(['a', 'b']);
    });
});

// ---------------------------------------------------------------------------
// Flee check
// ---------------------------------------------------------------------------
describe('CombatManager.flee', () => {
    beforeEach(() => {
        gameState.data.combat = null;
    });

    it('DC is baseDC when the fleeing combatant is not engaged with anyone', async () => {
        const cm = new CombatManager();
        const fleeing = new Combatant(
            makeCharacter({ abilityModifiers: { str: 0, dex: 2, con: 0, int: 0, wis: 4, cha: 0 } }),
            'player', 'flee-me'
        );
        cm.combatants = [fleeing]; // no engaged enemies present

        mockD20(15); // roll + max(dex,wis)=4 + prof(3) = 22 >= dc(10)
        cm.flee(fleeing);
        await Promise.resolve();

        expect(lastMessageStartingWith('🏃 Flee check:')).toBe(
            '🏃 Flee check: 15 + 7 (max DEX/WIS + prof) = 22 vs DC 10 (0 engaged enemies)'
        );
        expect(lastMessageStartingWith('✅')).toBe('✅ Fixture escapes!');
    });

    it('DC scales with engaged enemy count: 10 + 2 * (engaged - 1), capped at 25', async () => {
        const cm = new CombatManager();
        const fleeing = new Combatant(makeCharacter(), 'player', 'flee-me');
        // Fake engagement — IDs don't need to resolve to real combatants for the DC formula;
        // resolveFleeOpportunityAttacks only matches against `this.combatants`, which is just
        // the fleeing combatant here, so 0 real opportunity attacks fire.
        fleeing.engagedWith = new Set(['e1', 'e2', 'e3']);
        cm.combatants = [fleeing];

        mockD20(20); // guarantee success so we only need to read the DC out of the message
        cm.flee(fleeing);
        await Promise.resolve();

        // engagedCount = 3 -> dc = 10 + 2*(3-1) = 14
        expect(lastMessageStartingWith('🏃 Flee check:')).toContain('vs DC 14 (3 engaged enemies)');
    });

    it('DC is capped at dcCapMax even with many engaged enemies', async () => {
        const cm = new CombatManager();
        const fleeing = new Combatant(makeCharacter(), 'player', 'flee-me');
        fleeing.engagedWith = new Set(Array.from({ length: 20 }, (_, i) => `e${i}`));
        cm.combatants = [fleeing];

        mockD20(20);
        cm.flee(fleeing);
        await Promise.resolve();

        expect(lastMessageStartingWith('🏃 Flee check:')).toContain(`vs DC ${RULES.flee.dcCapMax}`);
    });

    it('modifier is max(DEX, WIS) + proficiency, not a sum of both', async () => {
        const cm = new CombatManager();
        const fleeing = new Combatant(
            makeCharacter({ abilityModifiers: { str: 0, dex: 5, con: 0, int: 0, wis: -2, cha: 0 } }),
            'player', 'flee-me'
        );
        cm.combatants = [fleeing];

        mockD20(10);
        cm.flee(fleeing);
        await Promise.resolve();

        // max(5, -2) + prof(3) = 8, not 5 + -2 + 3 = 6
        expect(lastMessageStartingWith('🏃 Flee check:')).toBe(
            '🏃 Flee check: 10 + 8 (max DEX/WIS + prof) = 18 vs DC 10 (0 engaged enemies)'
        );
    });

    it('fails when the total is below the DC', async () => {
        const cm = new CombatManager();
        const fleeing = new Combatant(
            makeCharacter({ abilityModifiers: { str: 0, dex: -2, con: 0, int: 0, wis: -2, cha: 0 } }),
            'player', 'flee-me'
        );
        cm.combatants = [fleeing];

        mockD20(2); // 2 + max(-2,-2) + 3 = 3, below dc 10
        cm.flee(fleeing);
        await Promise.resolve();

        expect(lastMessageStartingWith('❌')).toBe('❌ Fixture failed to escape!');
    });

    it('blocking conditions prevent fleeing outright', () => {
        const cm = new CombatManager();
        const fleeing = new Combatant(makeCharacter(), 'player', 'flee-me');
        cm.combatants = [fleeing];
        fleeing.addCondition('restrained', 'combat', 'someone', { curable: true });

        cm.flee(fleeing);

        expect(lastMessageStartingWith('Fixture cannot flee')).toBe('Fixture cannot flee while restrained!');
        expect(fleeing.actions.action).toBe(1); // action was not consumed
    });

    it('consumes the action attempting to flee', () => {
        const cm = new CombatManager();
        const fleeing = new Combatant(makeCharacter(), 'player', 'flee-me');
        cm.combatants = [fleeing];

        mockD20(1);
        cm.flee(fleeing);

        expect(fleeing.actions.action).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Flee check — 'NVSystem' mode (docs/plans/2026-07-30-attribute-system-remap.md,
// decision #4). Exercises the target-system formula directly by temporarily flipping
// RULES.attributes.system, mirroring the pattern used in
// tests/utils/attributeResolver.test.js's NVSystem-mode tests. '5EClassic'-mode behavior
// (above) is untouched by this milestone step.
// ---------------------------------------------------------------------------
describe('CombatManager.flee (NVSystem mode)', () => {
    const originalSystem = RULES.attributes.system;

    beforeEach(() => {
        gameState.data.combat = null;
        RULES.attributes.system = 'NVSystem';
    });

    afterEach(() => {
        RULES.attributes.system = originalSystem;
    });

    it('modifier is floor((Prowess_mod + Insight_mod) / 2) + proficiency, replacing max(DEX, WIS)', async () => {
        const cm = new CombatManager();
        const fleeing = new Combatant(
            makeCharacter({ abilities: { prowess: 14, insight: 13 } }), // 2.0 + 1.5 = 3.5 -> floor(3.5/2) = 1
            'player', 'flee-me'
        );
        cm.combatants = [fleeing];

        mockD20(10);
        cm.flee(fleeing);
        await Promise.resolve();

        // 10 + (1 blend + 3 prof) = 14
        expect(lastMessageStartingWith('🏃 Flee check:')).toBe(
            '🏃 Flee check: 10 + 4 (Prowess+Insight blend + prof) = 14 vs DC 10 (0 engaged enemies)'
        );
        expect(lastMessageStartingWith('✅')).toBe('✅ Fixture escapes!');
    });

    it('a dump-Prowess build still flees on Insight alone, unlike a single-stat design would allow a total dump', async () => {
        const cm = new CombatManager();
        const fleeing = new Combatant(
            makeCharacter({ abilities: { prowess: 8, insight: 16 } }), // -1 + 3 = 2 -> floor(2/2) = 1
            'player', 'flee-me'
        );
        cm.combatants = [fleeing];

        mockD20(10);
        cm.flee(fleeing);
        await Promise.resolve();

        // 10 + (1 blend + 3 prof) = 14 — even fully dumping Prowess, Insight alone still
        // produces a real (non-zero) modifier, not a total dump.
        expect(lastMessageStartingWith('🏃 Flee check:')).toContain('10 + 4 (Prowess+Insight blend + prof) = 14');
    });
});

// ---------------------------------------------------------------------------
// Topple weapon mastery — afterFailedSave reaction hook (Indomitable-reroll gap fix).
// Site 3 of the three separate save implementations (see architect scoping pass,
// 2026-08-06): this inline CON-save-vs-DC check previously had no reaction hook at all,
// unlike executeSpecialMonsterAction()'s save. Confirms the hook actually fires, not just
// that the code compiles.
// ---------------------------------------------------------------------------
describe('CombatManager.attack — Topple weapon mastery afterFailedSave reaction hook', () => {
    afterEach(() => {
        window.game = null;
    });

    it('prompts the afterFailedSave reaction hook (Indomitable) on a failed Topple save', async () => {
        const cm = new CombatManager();
        cm.weaponMasteryProficiencyRequired = false; // bypass isProficientWithWeapon() on the plain fixture

        const attacker = new Combatant(
            makeCharacter({
                equipment: {
                    mainHand: { id: 'quarterstaff', weaponType: 'melee', properties: [], damage: { dice: '1d6' }, damageType: 'bludgeoning' },
                    offHand: null,
                    armor: null
                },
                weaponMasteries: ['topple']
            }),
            'enemy', 'atk'
        );
        const defender = new Combatant(makeCharacter({ ac: 1 }), 'player', 'def');

        window.game = { promptReaction: vi.fn().mockResolvedValue(null) };

        vi.spyOn(Math, 'random')
            .mockReturnValueOnce(0.7) // attack roll -> 15: guaranteed hit, not a crit/crit-miss
            .mockReturnValue(0);      // every roll after (damage, Topple's own CON save) -> minimum, guarantees the save fails

        await cm.attack(attacker, defender);

        expect(window.game.promptReaction).toHaveBeenCalledWith(
            'afterFailedSave',
            attacker,
            defender,
            expect.objectContaining({ saveType: 'con', saveDC: expect.any(Number), saveRoll: expect.any(Number) })
        );
    });

    it('does not prompt the reaction hook when the Topple save succeeds', async () => {
        const cm = new CombatManager();
        cm.weaponMasteryProficiencyRequired = false;

        const attacker = new Combatant(
            makeCharacter({
                equipment: {
                    mainHand: { id: 'quarterstaff', weaponType: 'melee', properties: [], damage: { dice: '1d6' }, damageType: 'bludgeoning' },
                    offHand: null,
                    armor: null
                },
                weaponMasteries: ['topple']
            }),
            'enemy', 'atk'
        );
        const defender = new Combatant(makeCharacter({ ac: 1, abilityModifiers: { str: 0, dex: 0, con: 5, int: 0, wis: 0, cha: 0 } }), 'player', 'def');

        window.game = { promptReaction: vi.fn().mockResolvedValue(null) };

        vi.spyOn(Math, 'random')
            .mockReturnValueOnce(0.7)  // attack roll -> 15: guaranteed hit
            .mockReturnValueOnce(0.5)  // damage roll (1d6), value irrelevant to this assertion
            .mockReturnValueOnce(0.95); // Topple's CON save roll -> 20 + 5 con easily clears DC

        await cm.attack(attacker, defender);

        const failedSaveCalls = window.game.promptReaction.mock.calls.filter(call => call[0] === 'afterFailedSave');
        expect(failedSaveCalls).toHaveLength(0);
    });
});
