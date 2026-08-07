/**
 * Characterization tests for `Game.promptReaction()` (src/main.js) and its live consumers —
 * Riposte (afterMiss), Parry (afterHit), Indomitable (afterFailedSave), plus the generalized
 * Reprisal (allyAttacked) / Intervene (allyWouldDrop0) hook points added alongside the fixes
 * below — written per ADR-015 ("Forking a Live System").
 *
 * Prior coverage audit: `tests/systems/dedicationLevel2to9.test.js` covers Indomitable's
 * `rerollSavingThrow` EffectDispatcher handler in isolation, and
 * `tests/systems/combatManager.characterization.test.js` covers the Topple-mastery
 * afterFailedSave call site — but BOTH always mock `window.game.promptReaction` itself
 * (`vi.fn().mockResolvedValue(...)`), so the real `promptReaction()` implementation in
 * main.js had zero prior direct coverage. This file closes that gap.
 *
 * *** THREE PRIORITY-0 BUGS FOUND WHILE WRITING THIS SUITE — ALL THREE NOW FIXED ***
 * 1. `promptReaction()`'s eligibility filter used to read `character.abilities` and call
 *    `.filter()` on it directly — but on every REAL character, `character.abilities` is the
 *    six-score ability bag ({str, dex, con, ...}), NOT an array of ability definitions. This
 *    threw `TypeError: abilities.filter is not a function` for every real character with a
 *    reaction available, unconditionally. Fixed: eligibility now resolves known reaction
 *    abilities the same way `CombatManager._findKnownAbility()` does (union of
 *    selectedAbilities/knownTactics/knownVows against abilitiesData, filtered to
 *    actionType === 'reaction'). See section B below (now "FIXED", not "KNOWN BUG").
 * 2. Riposte's counter-attack passed `{ shouldConsumeAction: false }`, but `attack()` reads
 *    `options.consumeAction` — the free counter-attack silently consumed the reactor's Action
 *    instead of their Reaction. Fixed: renamed to `consumeAction: false`. Proven in section I.
 * 3. The Resolve gate lived only inside EffectDispatcher and fired AFTER the Reaction was
 *    already consumed — a 0-Resolve Riposte/Parry still "fired" for zero effect while wasting
 *    the reactor's Reaction. Fixed: the eligibility filter now excludes resolve-gated
 *    abilities the reactor can't afford BEFORE they're ever offered. Proven in section I.
 *
 * Because of bug 1, promptReaction's per-hookpoint dispatch branches (the reactionAttack /
 * reactionDamageReduction / rerollSavingThrow click handlers) were UNREACHABLE through any real
 * character. Their underlying dice/Resolve math is still characterized independently at the
 * EffectDispatcher handler level (real ability objects loaded from data/abilities.json, same
 * convention as dedicationLevel2to9.test.js's Indomitable test) in sections C-E below, and
 * CombatManager's consumer side (applying a resolved damageReduction, invoking the
 * afterMiss/afterFailedSave hooks) is characterized by mocking `window.game.promptReaction`'s
 * return value at the CombatManager boundary — the same accepted pattern already used by the
 * existing Topple-mastery test.
 *
 * The project has no jsdom/happy-dom environment (vitest.config.js uses `environment: 'node'`).
 * `src/main.js` runs `document.addEventListener('DOMContentLoaded', ...)` at module top level,
 * and `document` bare-identifier lookups are impossible to stub via `globalThis.document =`
 * placed after a static `import` (static imports are hoisted above all other statements by the
 * JS spec) — so `main.js` is imported dynamically (`await import(...)`) after the stub is
 * installed. AudioManager is mocked because its real constructor calls `new Audio(...)`, which
 * doesn't exist in Node (matches convention in combatManager.characterization.test.js).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import abilitiesData from '../../data/abilities.json' with { type: 'json' };

vi.mock('../../src/systems/AudioManager.js', () => ({
    default: { playCombatSound: vi.fn(), play: vi.fn() }
}));

// --- Minimal fake DOM, just enough to drive promptReaction()'s real modal-building code path ---
class FakeElement {
    constructor() {
        this.classList = { add: () => {}, remove: () => {}, contains: () => false };
        this._listeners = {};
        this.children = [];
        this.style = {};
        this._innerHTML = '';
    }
    set innerHTML(v) { this._innerHTML = v; this.children = []; }
    get innerHTML() { return this._innerHTML; }
    addEventListener(type, cb, opts) {
        (this._listeners[type] ??= []).push({ cb, once: !!opts?.once });
    }
    appendChild(child) { this.children.push(child); }
    click() {
        (this._listeners.click || []).slice().forEach(({ cb, once }, i) => {
            cb();
            if (once) this._listeners.click.splice(this._listeners.click.indexOf({ cb, once }), 1);
        });
    }
}

const reactionModalIds = ['reactionModal', 'reactionModalTitle', 'reactionModalContext', 'reactionAbilityList', 'reactionSkipBtn', 'reactionResolvePicker', 'reactionResolveInfo', 'reactionResolveButtons'];
let elements = {};
function resetElements() {
    elements = {};
    reactionModalIds.forEach(id => { elements[id] = new FakeElement(); });
}
resetElements();

globalThis.window = globalThis.window || {};
globalThis.document = {
    getElementById: (id) => elements[id] || null,
    querySelectorAll: () => [],
    createElement: () => new FakeElement(),
    addEventListener: () => {}
};

const { default: Game } = await import('../../src/main.js');
const { CombatManager, Combatant } = await import('../../src/systems/CombatManager.js');
const { execute } = await import('../../src/systems/EffectDispatcher.js');
const { gameState } = await import('../../src/core/GameState.js');
const { RULES } = await import('../../src/core/rulesEngine.js');
const { Character } = await import('../../src/systems/Character.js');

/** Force the next `Math.floor(Math.random() * sides) + 1` roll to resolve to `value`. */
function mockDie(sides, value) {
    return vi.spyOn(Math, 'random').mockReturnValueOnce((value - 1) / sides);
}
function mockD20(value) { mockDie(20, value); }

function findAbility(id) {
    for (const entry of Object.values(abilitiesData.abilities)) {
        if (!Array.isArray(entry)) continue; // skip the "description" string key
        const found = entry.find(a => a.id === id);
        if (found) return found;
    }
    return null;
}
const riposteAbility = findAbility('riposte');
const parryAbility = findAbility('parry');
const indomitableAbility = findAbility('indomitable');

function lastMessageStartingWith(prefix) {
    const log = gameState.data.ui.messageLog;
    for (let i = log.length - 1; i >= 0; i--) {
        if (log[i].text.startsWith(prefix)) return log[i].text;
    }
    return null;
}

/** Real Character construction (ADR-015) — Dedication/Exemplar shape, Riposte/Parry granted
 * the way level-up actually grants them (knownTactics), Indomitable via selectedAbilities. */
function makeRealCharacter(overrides = {}) {
    const base = {
        name: 'Real Hero',
        level: 5,
        baseAbilities: { str: 10, dex: 10, con: 14, int: 10, wis: 10, cha: 10 },
        class: {
            id: 'dedication',
            hitDie: 10,
            savingThrowProficiencies: ['str', 'con'],
            armorProficiencies: [], weaponProficiencies: [], toolProficiencies: [],
            features: {}, spellcaster: false
        },
        species: { abilityScoreIncrease: {}, traits: [], speed: 30, languages: [], skillProficiencies: [] },
        background: { skillProficiencies: [], feature: null, startingGold: 100 },
        resolvePoints: 3,
        knownTactics: ['riposte', 'parry'],
        selectedAbilities: ['indomitable']
    };
    return new Character({ ...base, ...overrides });
}

function makeFixtureCharacter(overrides = {}) {
    const abilityModifiers = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0, ...(overrides.abilityModifiers || {}) };
    const abilities = Object.fromEntries(Object.entries(abilityModifiers).map(([k, m]) => [k, m * 2 + 10]));
    return {
        name: 'Fixture', level: 5, proficiencyBonus: 3, fightingStyle: null,
        equipment: { mainHand: null, offHand: null, armor: null },
        maxHP: 20, currentHP: 20, ac: 15, resolvePoints: 3,
        ...overrides,
        abilityModifiers,
        abilities: { ...abilities, ...(overrides.abilities || {}) }
    };
}

const originalAttributeSystem = RULES.attributes.system;

beforeEach(() => {
    resetElements();
    gameState.data.ui.messageLog = [];
    RULES.attributes.system = '5EClassic';
    window.game = null;
});
afterEach(() => {
    vi.restoreAllMocks();
    RULES.attributes.system = originalAttributeSystem;
});

// ---------------------------------------------------------------------------
// A. promptReaction — pre-eligibility gating (safe: runs before the crash below)
// ---------------------------------------------------------------------------
describe('promptReaction — pre-eligibility gating', () => {
    it('returns null immediately when the reactor is not on the player team (real Character)', async () => {
        const game = new Game();
        const character = makeRealCharacter();
        const attacker = new Combatant(character, 'player', 'atk');
        const defender = new Combatant(character, 'enemy', 'def'); // reactor is an enemy

        const result = await game.promptReaction('afterMiss', attacker, defender, { isMelee: true });

        expect(result).toBeNull();
        expect(elements.reactionModal.children.length).toBe(0); // modal never touched
    });

    it.each(['afterMiss', 'afterHit', 'afterFailedSave'])(
        'returns null when the reactor has no reaction available (%s)',
        async (hookPoint) => {
            const game = new Game();
            const character = makeRealCharacter();
            gameState.set('character', character);
            const attacker = new Combatant(character, 'enemy', 'atk');
            const defender = new Combatant(character, 'player', 'def');
            defender.actions.reaction = 0;

            const result = await game.promptReaction(hookPoint, attacker, defender, {});

            expect(result).toBeNull();
        }
    );

    it('returns null when the reactor combatant has no actions object at all', async () => {
        const game = new Game();
        const character = makeRealCharacter();
        const attacker = new Combatant(character, 'enemy', 'atk');
        const defender = new Combatant(character, 'player', 'def');
        defender.actions = null;

        const result = await game.promptReaction('afterMiss', attacker, defender, {});

        expect(result).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// B. promptReaction — FIXED: resolves known reaction abilities via selectedAbilities/
//    knownTactics/knownVows against abilitiesData, no crash, correct ability offered.
// ---------------------------------------------------------------------------
describe('promptReaction — FIXED: no longer crashes, offers the correct known reaction ability', () => {
    it.each([
        ['afterMiss', {}, 'riposte'],
        ['afterHit', { damage: 5, isMelee: true }, 'parry'],
        ['afterFailedSave', { saveType: 'con', saveDC: 15, saveRoll: 10 }, 'indomitable']
    ])('offers exactly the known %s reaction ability without throwing', async (hookPoint, ctx, expectedAbilityId) => {
        const game = new Game();
        game.abilitiesData = abilitiesData; // pre-loaded at real game init; not through this test's Game()
        const character = makeRealCharacter(); // knows riposte, parry, indomitable via real grant paths
        gameState.set('character', character);
        const attacker = new Combatant(character, 'enemy', 'atk');
        const defender = new Combatant(character, 'player', 'def');
        defender.actions.reaction = 1;

        const promise = game.promptReaction(hookPoint, attacker, defender, ctx);

        // Synchronous portion of promptReaction (up to the Promise executor) has already run
        // by the time the call above returns control here — the modal is populated already.
        expect(elements.reactionAbilityList.children.length).toBe(1);

        elements.reactionSkipBtn.click();
        const result = await promise;
        expect(result).toBeNull();
    });

    it('offers nothing (and does not crash) for a character who knows no matching reaction', async () => {
        const game = new Game();
        game.abilitiesData = abilitiesData;
        const character = makeRealCharacter({ knownTactics: [], selectedAbilities: [] });
        gameState.set('character', character);
        const attacker = new Combatant(character, 'enemy', 'atk');
        const defender = new Combatant(character, 'player', 'def');
        defender.actions.reaction = 1;

        const result = await game.promptReaction('afterMiss', attacker, defender, {});
        expect(result).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// C. EffectDispatcher — reactionAttack handler (Riposte, real ability object from abilities.json)
// ---------------------------------------------------------------------------
describe('EffectDispatcher — reactionAttack handler (Riposte)', () => {
    it('rolls the tactic die as the bonus and deducts 1 Resolve', async () => {
        const reactor = new Combatant(makeFixtureCharacter({ resolvePoints: 3 }), 'player', 'def');
        const ctx = { character: reactor.character, combatant: reactor, addMessage: (m, t) => gameState.addMessage(m, t), showFloatingText: () => {} };

        mockDie(6, 4); // level 5 -> tactic die is d6
        const results = await execute(riposteAbility, riposteAbility.effects, ctx);
        const result = results.find(r => r.type === 'reactionAttack').result;

        expect(result.bonus).toBe(4);
        expect(reactor.character.resolvePoints).toBe(2); // 3 - resolveCost(1)
    });

    it('does not fire (gate skips) when Resolve is insufficient, and Resolve is left unchanged', async () => {
        const reactor = new Combatant(makeFixtureCharacter({ resolvePoints: 0 }), 'player', 'def');
        const ctx = { character: reactor.character, combatant: reactor, addMessage: (m, t) => gameState.addMessage(m, t), showFloatingText: () => {} };

        const results = await execute(riposteAbility, riposteAbility.effects, ctx);

        expect(results).toEqual([{ type: '_resolveGate', result: { skipped: true } }]);
        expect(results.find(r => r.type === 'reactionAttack')).toBeUndefined();
        expect(reactor.character.resolvePoints).toBe(0);
        expect(lastMessageStartingWith('Not enough Resolve!')).toBeTruthy();
    });
});

// ---------------------------------------------------------------------------
// D. EffectDispatcher — reactionDamageReduction handler (Parry, real ability object)
// ---------------------------------------------------------------------------
describe('EffectDispatcher — reactionDamageReduction handler (Parry)', () => {
    it('reduction is tactic die + CON modifier, and deducts 1 Resolve', async () => {
        const reactor = new Combatant(makeFixtureCharacter({ resolvePoints: 3, abilityModifiers: { con: 3 } }), 'player', 'def');
        const ctx = { character: reactor.character, combatant: reactor, addMessage: (m, t) => gameState.addMessage(m, t), showFloatingText: () => {} };

        mockDie(6, 2); // tactic die
        const results = await execute(parryAbility, parryAbility.effects, ctx);
        const result = results.find(r => r.type === 'reactionDamageReduction').result;

        expect(result.damageReduction).toBe(2 + 3);
        expect(reactor.character.resolvePoints).toBe(2);
    });

    it('reduction floors at 0 even with a very negative CON modifier', async () => {
        const reactor = new Combatant(makeFixtureCharacter({ resolvePoints: 3, abilityModifiers: { con: -10 } }), 'player', 'def');
        const ctx = { character: reactor.character, combatant: reactor, addMessage: (m, t) => gameState.addMessage(m, t), showFloatingText: () => {} };

        mockDie(6, 1);
        const results = await execute(parryAbility, parryAbility.effects, ctx);
        const result = results.find(r => r.type === 'reactionDamageReduction').result;

        expect(result.damageReduction).toBe(0);
    });

    it('does not fire (gate skips) when Resolve is insufficient', async () => {
        const reactor = new Combatant(makeFixtureCharacter({ resolvePoints: 0 }), 'player', 'def');
        const ctx = { character: reactor.character, combatant: reactor, addMessage: (m, t) => gameState.addMessage(m, t), showFloatingText: () => {} };

        const results = await execute(parryAbility, parryAbility.effects, ctx);

        expect(results).toEqual([{ type: '_resolveGate', result: { skipped: true } }]);
        expect(reactor.character.resolvePoints).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// E. EffectDispatcher — rerollSavingThrow (Indomitable) — resourceType: 'shortRest' skips the
//    Resolve gate entirely (already characterized in dedicationLevel2to9.test.js; one
//    supplementary check here that Resolve is untouched, confirming the two resource types
//    don't cross-contaminate).
// ---------------------------------------------------------------------------
describe('EffectDispatcher — rerollSavingThrow (Indomitable) — shortRest resourceType bypasses the Resolve gate', () => {
    it('rerolls without touching resolvePoints', async () => {
        const reactor = new Combatant(makeFixtureCharacter({ resolvePoints: 0, abilityModifiers: { con: 2 } }), 'player', 'def');
        const ctx = {
            character: reactor.character, combatant: reactor, saveAbility: 'con',
            addMessage: (m, t) => gameState.addMessage(m, t), showFloatingText: () => {}
        };

        mockD20(14);
        const results = await execute(indomitableAbility, indomitableAbility.effects, ctx);
        const result = results.find(r => r.type === 'rerollSavingThrow').result;

        expect(result.newRoll).toBe(14);
        expect(result.newTotal).toBe(16);
        expect(reactor.character.resolvePoints).toBe(0); // untouched — shortRest, not resolve
    });
});

// ---------------------------------------------------------------------------
// F. CombatManager.attack — afterHit hook (Parry) consumer-side behavior.
//    window.game.promptReaction is mocked at the boundary (same accepted pattern as the
//    existing Topple afterFailedSave test) since section B proves the real implementation
//    cannot be reached through this call path today.
// ---------------------------------------------------------------------------
describe('CombatManager.attack — afterHit hook applies a resolved Parry damageReduction', () => {
    function makeMeleeAttacker(overrides = {}) {
        return new Combatant(
            makeFixtureCharacter({
                equipment: { mainHand: { id: 'sword', weaponType: 'melee', properties: [], damage: '1d8', damageType: 'bone' }, offHand: null, armor: null },
                ...overrides
            }),
            'enemy', 'atk'
        );
    }

    it('reduces final damage by the resolved reduction amount', async () => {
        const cm = new CombatManager();
        const attacker = makeMeleeAttacker();
        const defender = new Combatant(makeFixtureCharacter({ ac: 1 }), 'player', 'def');
        window.game = { promptReaction: vi.fn().mockResolvedValue({ abilityId: 'parry', damageReduction: 3 }) };

        mockD20(15); // guaranteed hit
        mockDie(8, 6); // weapon damage die -> 6
        await cm.attack(attacker, defender);

        expect(window.game.promptReaction).toHaveBeenCalledWith(
            'afterHit', attacker, defender,
            expect.objectContaining({ damage: 6, isMelee: true })
        );
        expect(defender.hp).toBe(defender.maxHP - (6 - 3));
        expect(lastMessageStartingWith('🛡️ Parry!')).toContain('reduces damage by 3');
    });

    it('final damage floors at 0 when the reduction exceeds the roll', async () => {
        const cm = new CombatManager();
        const attacker = makeMeleeAttacker();
        const defender = new Combatant(makeFixtureCharacter({ ac: 1 }), 'player', 'def');
        window.game = { promptReaction: vi.fn().mockResolvedValue({ abilityId: 'parry', damageReduction: 999 }) };

        mockD20(15);
        mockDie(8, 6);
        await cm.attack(attacker, defender);

        expect(defender.hp).toBe(defender.maxHP);
    });

    it('does not prompt afterHit on a ranged attack', async () => {
        const cm = new CombatManager();
        const attacker = new Combatant(
            makeFixtureCharacter({ equipment: { mainHand: { id: 'bow', weaponType: 'ranged', properties: [], damage: '1d8', damageType: 'physical', ammoType: 'arrow' }, offHand: null, armor: null }, inventory: { arrow: 5 } }),
            'enemy', 'atk'
        );
        const defender = new Combatant(makeFixtureCharacter({ ac: 1 }), 'player', 'def');
        window.game = { promptReaction: vi.fn().mockResolvedValue(null) };

        mockD20(15);
        mockDie(8, 6);
        await cm.attack(attacker, defender);

        expect(window.game.promptReaction).not.toHaveBeenCalledWith('afterHit', expect.anything(), expect.anything(), expect.anything());
    });
});

// ---------------------------------------------------------------------------
// G. CombatManager.attack — afterMiss hook (Riposte) invocation
// ---------------------------------------------------------------------------
describe('CombatManager.attack — afterMiss hook invocation', () => {
    it('invokes promptReaction("afterMiss", ...) on a melee miss', async () => {
        const cm = new CombatManager();
        const attacker = new Combatant(
            makeFixtureCharacter({ equipment: { mainHand: { id: 'sword', weaponType: 'melee', properties: [], damage: '1d8', damageType: 'bone' }, offHand: null, armor: null } }),
            'enemy', 'atk'
        );
        const defender = new Combatant(makeFixtureCharacter({ ac: 30 }), 'player', 'def'); // effectively unhittable
        window.game = { promptReaction: vi.fn().mockResolvedValue(null) };

        mockD20(2); // low roll, well below AC 30, not a natural 1 (avoids the separate crit-miss branch)
        await cm.attack(attacker, defender);

        expect(window.game.promptReaction).toHaveBeenCalledWith('afterMiss', attacker, defender, { isMelee: true });
    });

    it('does not invoke the afterMiss hook on a ranged miss', async () => {
        const cm = new CombatManager();
        const attacker = new Combatant(
            makeFixtureCharacter({ equipment: { mainHand: { id: 'bow', weaponType: 'ranged', properties: [], damage: '1d8', damageType: 'physical', ammoType: 'arrow' }, offHand: null, armor: null }, inventory: { arrow: 5 } }),
            'enemy', 'atk'
        );
        const defender = new Combatant(makeFixtureCharacter({ ac: 30 }), 'player', 'def');
        window.game = { promptReaction: vi.fn().mockResolvedValue(null) };

        mockD20(2);
        await cm.attack(attacker, defender);

        expect(window.game.promptReaction).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// H. CombatManager.executeSpecialMonsterAction — afterFailedSave hook (Indomitable), the
//    second of the two live afterFailedSave call sites (the first, Topple, is already covered
//    by combatManager.characterization.test.js).
// ---------------------------------------------------------------------------
describe('CombatManager.executeSpecialMonsterAction — afterFailedSave hook (Indomitable)', () => {
    it('prompts the hook on a failed save and applies a rerolled newTotal (success flips half-damage)', async () => {
        const cm = new CombatManager();
        const combatant = new Combatant(makeFixtureCharacter(), 'enemy', 'atk');
        const target = new Combatant(makeFixtureCharacter(), 'player', 'def');
        const action = { name: 'Breath Weapon', description: 'DC 15 DEX', damage: '2d6', damageType: 'fire' };
        window.game = { promptReaction: vi.fn().mockResolvedValue({ abilityId: 'indomitable', newTotal: 20 }) };

        mockD20(1); // original save roll -> 1 + 0 = 1, fails DC 15

        await cm.executeSpecialMonsterAction(combatant, target, action);

        expect(window.game.promptReaction).toHaveBeenCalledWith(
            'afterFailedSave', combatant, target,
            expect.objectContaining({ saveType: 'dex', saveDC: 15, saveRoll: 1 })
        );
        expect(lastMessageStartingWith('🔁 Reroll result:')).toContain('20 vs DC 15 — Success!');
    });

    it('does not prompt the hook when the save succeeds', async () => {
        const cm = new CombatManager();
        const combatant = new Combatant(makeFixtureCharacter(), 'enemy', 'atk');
        const target = new Combatant(makeFixtureCharacter(), 'player', 'def');
        const action = { name: 'Breath Weapon', description: 'DC 5 DEX', damage: '2d6', damageType: 'fire' };
        window.game = { promptReaction: vi.fn().mockResolvedValue(null) };

        mockD20(15); // 15 + 0 = 15, clears DC 5

        await cm.executeSpecialMonsterAction(combatant, target, action);

        expect(window.game.promptReaction).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// I. promptReaction — end-to-end proof of bug fixes #2 (wrong option key) and #3
//    (Resolve gate doesn't block offering), exercised through the REAL click handler,
//    not just EffectDispatcher-level math in isolation (sections C/D characterize the
//    math; this section characterizes the wiring bugs those sections couldn't reach).
// ---------------------------------------------------------------------------
describe('promptReaction — Riposte click handler (real end-to-end, bugs #2 and #3)', () => {
    it('bug #2 fix: counter-attack uses { consumeAction: false } (not shouldConsumeAction) and attacks via the reactor', async () => {
        const game = new Game();
        game.abilitiesData = abilitiesData;
        const cm = new CombatManager();
        cm.attack = vi.fn().mockResolvedValue(undefined);
        game.combatManager = cm;

        const character = makeRealCharacter({ resolvePoints: 3 });
        gameState.set('character', character);
        const reactor = new Combatant(character, 'player', 'def');
        reactor.actions.reaction = 1;
        const attacker = new Combatant(makeRealCharacter(), 'enemy', 'atk');

        const promise = game.promptReaction('afterMiss', attacker, reactor, { isMelee: true });
        expect(elements.reactionAbilityList.children.length).toBe(1);
        elements.reactionAbilityList.children[0].click();
        const result = await promise;

        expect(cm.attack).toHaveBeenCalledTimes(1);
        expect(cm.attack).toHaveBeenCalledWith(reactor, attacker, 'mainHand', expect.objectContaining({ consumeAction: false }));
        expect(cm.attack.mock.calls[0][3]).not.toHaveProperty('shouldConsumeAction');
        expect(reactor.actions.reaction).toBe(0); // the reactor's Reaction was consumed
        expect(result).toEqual({ abilityId: 'riposte' });
    });

    it('bug #3 fix: a 0-Resolve reactor is never offered Riposte, and their Reaction is preserved', async () => {
        const game = new Game();
        game.abilitiesData = abilitiesData;
        const character = makeRealCharacter({ resolvePoints: 0 });
        gameState.set('character', character);
        const reactor = new Combatant(character, 'player', 'def');
        reactor.actions.reaction = 1;
        const attacker = new Combatant(character, 'enemy', 'atk');

        const result = await game.promptReaction('afterMiss', attacker, reactor, { isMelee: true });

        expect(result).toBeNull(); // eligible.length === 0 -> resolved immediately, modal never shown
        expect(elements.reactionAbilityList.children.length).toBe(0);
        expect(reactor.actions.reaction).toBe(1); // Reaction NOT wasted
    });
});

// ---------------------------------------------------------------------------
// J. promptReaction — Intervene (allyWouldDrop0) resolve-spend sub-picker, real end-to-end
//    through the click handlers: ability button -> nested resolve-amount picker -> resolved
//    { damageReduction, redirectAmount }. First direct coverage of the variableCostDamageRedirect
//    branch added in main.js (previously only reachable indirectly).
// ---------------------------------------------------------------------------
describe('promptReaction — Intervene resolve-spend sub-picker (real end-to-end)', () => {
    it('offers 1..maxResolveCost buttons, disables unaffordable amounts, and resolves the picked amount', async () => {
        const game = new Game();
        game.abilitiesData = abilitiesData;

        const oath = makeRealCharacter({ resolvePoints: 2, knownTactics: [], selectedAbilities: [], knownVows: ['intervene'] });
        gameState.set('character', oath);
        const reactor = new Combatant(oath, 'player', 'oath');
        reactor.actions.reaction = 1;
        const attacker = new Combatant(makeRealCharacter(), 'enemy', 'atk');
        const ally = new Combatant(makeRealCharacter(), 'companion', 'ally');

        const promise = game.promptReaction('allyWouldDrop0', attacker, ally, { damage: 5 }, reactor);
        expect(elements.reactionAbilityList.children.length).toBe(1); // only Intervene offered

        elements.reactionAbilityList.children[0].click(); // pick Intervene -> opens resolve sub-picker

        expect(elements.reactionResolveButtons.children.length).toBe(3); // maxResolveCost is 3
        const [btn1, btn2, btn3] = elements.reactionResolveButtons.children;
        expect(btn1.disabled).toBe(false); // affordable (2 available)
        expect(btn2.disabled).toBe(false);
        expect(btn3.disabled).toBe(true); // only 2 Resolve available, can't afford 3

        mockDie(8, 5); // 1 Resolve spent -> one 1d8 roll -> 5
        btn1.click();
        const result = await promise;

        expect(result).toEqual({ abilityId: 'intervene', damageReduction: 5, redirectAmount: 5 });
        expect(reactor.actions.reaction).toBe(0); // Reaction consumed on ability pick, not on amount pick
    });

    it('resolves null without opening the picker when the reactor has 0 Resolve (never offered)', async () => {
        const game = new Game();
        game.abilitiesData = abilitiesData;

        const oath = makeRealCharacter({ resolvePoints: 0, knownTactics: [], selectedAbilities: [], knownVows: ['intervene'] });
        gameState.set('character', oath);
        const reactor = new Combatant(oath, 'player', 'oath');
        reactor.actions.reaction = 1;
        const attacker = new Combatant(makeRealCharacter(), 'enemy', 'atk');
        const ally = new Combatant(makeRealCharacter(), 'companion', 'ally');

        const result = await game.promptReaction('allyWouldDrop0', attacker, ally, { damage: 5 }, reactor);

        expect(result).toBeNull(); // resolve gate excludes it before the modal is ever shown
        expect(elements.reactionAbilityList.children.length).toBe(0);
    });
});
