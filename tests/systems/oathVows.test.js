/**
 * Tests for Oath's second-half vow/aura/concentration implementation:
 *   - targetedSaveOrCondition (Challenge), reactionAttack's bonusDice guard (Reprisal),
 *     grantCondition (Bolster), variableCostDamageRedirect (Intervene) — EffectDispatcher
 *     handlers, fixture-character convention matching dedicationLevel2to9.test.js.
 *   - Combatant.concentratingOn break check (Combatant.takeDamage) and Taunted mechanics —
 *     real CombatManager/Combatant construction (needed for the combatManager back-reference
 *     and CombatManager.attack()'s condition-handling block).
 *   - Aura of Sanctuary/Exposure/Mercy — PassiveModifierRegistry cross-character helpers.
 *   - Character.knownVows + applyLevelUpSelections' Conviction dual-bookkeeping into
 *     selectedTraits — real Character construction (ADR-015: this exact class of bug —
 *     selections not actually reaching the field a later check reads — has shipped
 *     undetected behind fixture-only tests before in this project).
 *
 * AudioManager is mocked because its real constructor calls `new Audio(...)`, which
 * doesn't exist in the Node test environment (CombatManager.js imports it).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/systems/AudioManager.js', () => ({
    default: { playCombatSound: vi.fn(), play: vi.fn() }
}));

import { execute } from '../../src/systems/EffectDispatcher.js';
import { CombatManager, Combatant } from '../../src/systems/CombatManager.js';
import { getAuraACBonus, getAuraSaveBonus } from '../../src/systems/PassiveModifierRegistry.js';
import { Character } from '../../src/systems/Character.js';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';

globalThis.window = globalThis.window || {};

/** Force the next `Math.floor(Math.random() * sides) + 1` roll to resolve to `value`. */
function mockDie(sides, value) {
    return vi.spyOn(Math, 'random').mockReturnValueOnce((value - 1) / sides);
}
function mockD20(value) { mockDie(20, value); }

function makeCharacter(overrides = {}) {
    const abilityModifiers = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0, ...(overrides.abilityModifiers || {}) };
    const abilities = Object.fromEntries(Object.entries(abilityModifiers).map(([k, m]) => [k, m * 2 + 10]));
    return {
        name: 'Fixture', level: 5, proficiencyBonus: 3, fightingStyle: null,
        equipment: { mainHand: null, offHand: null, armor: null },
        maxHP: 20, currentHP: 20, ac: 15, resolvePoints: 3, maxResolvePoints: 5,
        selectedTraits: [], selectedAbilities: [], savingThrows: {},
        ...overrides,
        abilityModifiers,
        abilities: { ...abilities, ...(overrides.abilities || {}) }
    };
}

function buildTestContext(attacker, defender, combatManager = null) {
    return {
        character: attacker.character,
        combatant: attacker,
        combatManager,
        outOfCombat: false,
        attacker,
        defender,
        addMessage: (msg, type) => gameState.addMessage(msg, type),
        showFloatingText: () => {}
    };
}

function lastMessageStartingWith(prefix) {
    const log = gameState.data.ui.messageLog;
    for (let i = log.length - 1; i >= 0; i--) {
        if (log[i].text.startsWith(prefix)) return log[i].text;
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

// ---------------------------------------------------------------------------
// targetedSaveOrCondition (Challenge)
// ---------------------------------------------------------------------------
describe('EffectDispatcher — targetedSaveOrCondition (Challenge)', () => {
    const challengeAbility = {
        id: 'challenge', name: 'Challenge',
        effects: { targetedSaveOrCondition: { saveType: 'wis', condition: 'taunted', concentration: true, conditionIcon: '😤' } }
    };

    it('defers when ctx.defender is absent (no target chosen yet)', async () => {
        const attacker = new Combatant(makeCharacter(), 'player', 'atk');
        const ctx = buildTestContext(attacker, null);
        delete ctx.defender;

        const results = await execute(challengeAbility, challengeAbility.effects, ctx);
        const result = results.find(r => r.type === 'targetedSaveOrCondition').result;

        expect(result).toEqual({ deferred: true, type: 'abilityTargetedSave' });
        expect(attacker.character.resolvePoints).toBe(3); // resolve gate ran (resourceType undefined here) — unaffected either way
    });

    it('applies taunted and sets concentratingOn on a failed save', async () => {
        const attacker = new Combatant(makeCharacter({ resourceType: undefined }), 'player', 'atk');
        const defender = new Combatant(makeCharacter({ abilityModifiers: { wis: 0 } }), 'enemy', 'def');
        const ctx = buildTestContext(attacker, defender);

        mockD20(1); // save roll -> 1 + 0 = 1, well below any DC
        const results = await execute(challengeAbility, challengeAbility.effects, ctx);
        const result = results.find(r => r.type === 'targetedSaveOrCondition').result;

        expect(result.conditionApplied).toBe(true);
        expect(defender.hasCondition('taunted')).toBe(true);
        expect(defender.getCondition('taunted').appliedBy).toBe(attacker.id);
        expect(attacker.concentratingOn).toEqual({ abilityId: 'challenge', targetId: defender.id });
    });

    it('does not apply taunted or start concentration on a successful save', async () => {
        const attacker = new Combatant(makeCharacter(), 'player', 'atk');
        const defender = new Combatant(makeCharacter({ abilityModifiers: { wis: 10 } }), 'enemy', 'def');
        const ctx = buildTestContext(attacker, defender);

        mockD20(20);
        const results = await execute(challengeAbility, challengeAbility.effects, ctx);
        const result = results.find(r => r.type === 'targetedSaveOrCondition').result;

        expect(result.conditionApplied).toBe(false);
        expect(defender.hasCondition('taunted')).toBe(false);
        expect(attacker.concentratingOn).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// reactionAttack bonusDice guard (Reprisal reuses Riposte's handler)
// ---------------------------------------------------------------------------
describe('EffectDispatcher — reactionAttack bonusDice guard (Reprisal)', () => {
    it('returns bonus 0 without rolling when config omits bonusDice', async () => {
        const reprisalAbility = { id: 'reprisal', name: 'Reprisal', effects: { reactionAttack: { trigger: 'allyHit' } } };
        const reactor = new Combatant(makeCharacter(), 'player', 'def');
        const ctx = buildTestContext(reactor, null);

        const randomSpy = vi.spyOn(Math, 'random');
        const results = await execute(reprisalAbility, reprisalAbility.effects, ctx);
        const result = results.find(r => r.type === 'reactionAttack').result;

        expect(result).toEqual({ bonus: 0 });
        expect(randomSpy).not.toHaveBeenCalled(); // no die rolled
    });

    it('still rolls a bonus die when config has bonusDice (Riposte)', async () => {
        const riposteAbility = { id: 'riposte', name: 'Riposte', effects: { reactionAttack: { bonusDice: 'tacticDie', trigger: 'enemyMissesMelee' } } };
        const reactor = new Combatant(makeCharacter(), 'player', 'def');
        const ctx = buildTestContext(reactor, null);

        mockDie(6, 4);
        const results = await execute(riposteAbility, riposteAbility.effects, ctx);
        const result = results.find(r => r.type === 'reactionAttack').result;

        expect(result.bonus).toBe(4);
    });
});

// ---------------------------------------------------------------------------
// grantCondition (Bolster)
// ---------------------------------------------------------------------------
describe('EffectDispatcher — grantCondition (Bolster)', () => {
    const bolsterAbility = { id: 'bolster', name: 'Bolster', effects: { grantCondition: { condition: 'inspired', duration: 'untilStartOfTurn', isBuff: true } } };

    it('applies the condition to the first engaged companion', async () => {
        const cm = new CombatManager();
        const caster = new Combatant(makeCharacter(), 'player', 'atk');
        const ally = new Combatant(makeCharacter(), 'companion', 'ally1');
        ally.engagedWith.add('enemy_0');
        cm.companionCombatants = [ally];
        const ctx = buildTestContext(caster, null, cm);

        const results = await execute(bolsterAbility, bolsterAbility.effects, ctx);
        const result = results.find(r => r.type === 'grantCondition').result;

        expect(result.allyId).toBe('ally1');
        expect(ally.hasCondition('inspired')).toBe(true);
        expect(ally.getCondition('inspired').isBuff).toBe(true);
    });

    it('no-ops with a message when no ally is engaged', async () => {
        const cm = new CombatManager();
        const caster = new Combatant(makeCharacter(), 'player', 'atk');
        const ally = new Combatant(makeCharacter(), 'companion', 'ally1'); // not engaged
        cm.companionCombatants = [ally];
        const ctx = buildTestContext(caster, null, cm);

        const results = await execute(bolsterAbility, bolsterAbility.effects, ctx);
        const result = results.find(r => r.type === 'grantCondition').result;

        expect(result).toEqual({ skipped: true, reason: 'noAlly' });
        expect(lastMessageStartingWith('Bolster: No engaged ally')).toBeTruthy();
    });
});

// ---------------------------------------------------------------------------
// variableCostDamageRedirect (Intervene)
// ---------------------------------------------------------------------------
describe('EffectDispatcher — variableCostDamageRedirect (Intervene)', () => {
    const interveneAbility = { id: 'intervene', name: 'Intervene', effects: { variableCostDamageRedirect: { damageFormula: '1d8' } } };

    it('rolls resolveSpent dice and caps the redirect at originalDamage', async () => {
        const caster = new Combatant(makeCharacter(), 'player', 'atk');
        const ctx = buildTestContext(caster, null);
        ctx.resolveSpent = 2;
        ctx.originalDamage = 5;

        mockDie(8, 6); // first d8 -> 6
        mockDie(8, 6); // second d8 -> 6 (12 total, capped at 5)
        const results = await execute(interveneAbility, interveneAbility.effects, ctx);
        const result = results.find(r => r.type === 'variableCostDamageRedirect').result;

        expect(result.rolled).toBe(12);
        expect(result.damageReduction).toBe(5);
        expect(result.redirectAmount).toBe(5);
    });

    it('skips when resolveSpent is 0', async () => {
        const caster = new Combatant(makeCharacter(), 'player', 'atk');
        const ctx = buildTestContext(caster, null);
        ctx.resolveSpent = 0;
        ctx.originalDamage = 5;

        const results = await execute(interveneAbility, interveneAbility.effects, ctx);
        const result = results.find(r => r.type === 'variableCostDamageRedirect').result;

        expect(result).toEqual({ skipped: true });
    });
});

// ---------------------------------------------------------------------------
// Concentration break check (Combatant.takeDamage)
// ---------------------------------------------------------------------------
describe('Combatant.takeDamage — concentration break check', () => {
    it('breaks concentration on a failed check and removes Taunted from the target', async () => {
        const cm = new CombatManager();
        const caster = new Combatant(makeCharacter({ abilityModifiers: { wis: 0, cha: 0 } }), 'player', 'atk');
        const target = new Combatant(makeCharacter(), 'enemy', 'def');
        cm.combatants = [caster, target];
        caster.combatManager = cm;
        caster.concentratingOn = { abilityId: 'challenge', targetId: target.id };
        target.addCondition('taunted', 'combat', caster.id, { isBuff: false, curable: true, icon: '😤' });

        mockD20(1); // concentration check roll -> 1 + 0 = 1, fails vs DC max(10, floor(20/2))=10
        caster.takeDamage(20);

        expect(caster.concentratingOn).toBeNull();
        expect(target.hasCondition('taunted')).toBe(false);
    });

    it('maintains concentration on a successful check', async () => {
        const cm = new CombatManager();
        const caster = new Combatant(makeCharacter({ abilityModifiers: { wis: 10, cha: 10 } }), 'player', 'atk');
        const target = new Combatant(makeCharacter(), 'enemy', 'def');
        cm.combatants = [caster, target];
        caster.combatManager = cm;
        caster.concentratingOn = { abilityId: 'challenge', targetId: target.id };
        target.addCondition('taunted', 'combat', caster.id, { isBuff: false, curable: true, icon: '😤' });

        mockD20(15);
        caster.takeDamage(4); // DC = max(10, 2) = 10; 15 + 10 = 25, passes

        expect(caster.concentratingOn).toEqual({ abilityId: 'challenge', targetId: target.id });
        expect(target.hasCondition('taunted')).toBe(true);
    });

    it('does not run the check when not concentrating', () => {
        const caster = new Combatant(makeCharacter(), 'player', 'atk');
        const randomSpy = vi.spyOn(Math, 'random');
        caster.takeDamage(5);
        expect(randomSpy).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Taunted mechanics (CombatManager.attack())
// ---------------------------------------------------------------------------
describe('CombatManager.attack — Taunted mechanics', () => {
    function makeMeleeAttacker(overrides = {}) {
        return new Combatant(
            makeCharacter({ equipment: { mainHand: { id: 'sword', weaponType: 'melee', properties: [], damage: '1d8', damageType: 'bone' }, offHand: null, armor: null }, ...overrides }),
            'enemy', 'atk'
        );
    }

    it('has disadvantage when attacking someone other than the Challenge source', async () => {
        const cm = new CombatManager();
        const attacker = makeMeleeAttacker();
        const other = new Combatant(makeCharacter({ ac: 30 }), 'player', 'def');
        attacker.addCondition('taunted', 'combat', 'oath_combatant', { isBuff: false, curable: true, icon: '😤' });

        mockD20(15); mockD20(3); // advantage/disadvantage roll pair -> disadvantage takes the lower (3)
        mockDie(8, 5);
        await cm.attack(attacker, other);

        expect(lastMessageStartingWith('😤')).toContain('disadvantage (Taunted)');
    });

    it('applies tauntBacklash (-1 AC, self-clearing) when attacking the Challenge source anyway', async () => {
        const cm = new CombatManager();
        const attacker = makeMeleeAttacker({ ac: 15 });
        const oath = new Combatant(makeCharacter({ ac: 30 }), 'player', 'oath_combatant');
        attacker.addCondition('taunted', 'combat', 'oath_combatant', { isBuff: false, curable: true, icon: '😤' });

        mockD20(15);
        mockDie(8, 5);
        await cm.attack(attacker, oath);

        expect(attacker.ac).toBe(14); // -1 applied
        expect(attacker.hasCondition('tauntBacklash')).toBe(true);

        // Restored at the bearer's own next turn start (self-applied, untilStartOfTurn)
        cm.combatants = [attacker];
        cm.turnOrder = [attacker];
        cm.currentTurnIndex = 0;
        cm.startTurn();
        expect(attacker.ac).toBe(15);
        expect(attacker.hasCondition('tauntBacklash')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Auras (PassiveModifierRegistry)
// ---------------------------------------------------------------------------
describe('PassiveModifierRegistry — Oath auras', () => {
    it('getAuraACBonus: +1 for the Sanctuary source itself and allies sharing engagement, -1 for enemies engaged with the Exposure source', () => {
        const cm = new CombatManager();
        const oath = new Combatant(makeCharacter({ selectedTraits: ['aura_of_sanctuary', 'aura_of_exposure'] }), 'player', 'oath');
        const ally = new Combatant(makeCharacter(), 'companion', 'ally1');
        const enemy = new Combatant(makeCharacter(), 'enemy', 'enemy1');
        cm.playerCombatant = oath;
        cm.companionCombatants = [ally];

        oath.engagedWith.add('enemy1');
        enemy.engagedWith.add('oath');
        ally.engagedWith.add('enemy1'); // shares engagement with the Sanctuary source

        expect(getAuraACBonus(cm, oath)).toBe(1); // self
        expect(getAuraACBonus(cm, ally)).toBe(1); // shared engagement
        expect(getAuraACBonus(cm, enemy)).toBe(-1); // engaged with Exposure source
    });

    it('getAuraSaveBonus: +1 for any ally when Aura of Mercy is present, 0 for enemies or when absent', () => {
        const cm = new CombatManager();
        const oath = new Combatant(makeCharacter({ selectedTraits: ['aura_of_mercy'] }), 'player', 'oath');
        const ally = new Combatant(makeCharacter(), 'companion', 'ally1');
        const enemy = new Combatant(makeCharacter(), 'enemy', 'enemy1');
        cm.playerCombatant = oath;
        cm.companionCombatants = [ally];

        expect(getAuraSaveBonus(cm, oath)).toBe(1);
        expect(getAuraSaveBonus(cm, ally)).toBe(1);
        expect(getAuraSaveBonus(cm, enemy)).toBe(0);

        oath.character.selectedTraits = [];
        expect(getAuraSaveBonus(cm, ally)).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Character — knownVows + Conviction dual-bookkeeping (real Character construction, ADR-015)
// ---------------------------------------------------------------------------
describe('Character — knownVows and Conviction dual-bookkeeping', () => {
    function makeRealCharacter(overrides = {}) {
        const base = {
            name: 'Real Oath', level: 5,
            baseAbilities: { str: 10, dex: 10, con: 14, int: 10, wis: 10, cha: 10 },
            class: { id: 'dedication', hitDie: 10, savingThrowProficiencies: ['str', 'con'], armorProficiencies: [], weaponProficiencies: [], toolProficiencies: [], features: {}, spellcaster: false },
            species: { abilityScoreIncrease: {}, traits: [], speed: 30, languages: [], skillProficiencies: [] },
            background: { skillProficiencies: [], feature: null, startingGold: 100 },
            specialization: 'oath',
            resolvePoints: 3
        };
        return new Character({ ...base, ...overrides });
    }

    it('starts with an empty knownVows array and persists it through toJSON', () => {
        const character = makeRealCharacter();
        expect(character.knownVows).toEqual([]);
        expect(character.toJSON().knownVows).toEqual([]);
    });

    it('applyLevelUpSelections: a plain vow (Challenge) is added to knownVows only', () => {
        const character = makeRealCharacter();
        character.pendingLevelUp = { newLevel: 5, newHP: character.maxHP, hpGain: 0, newFeatures: [] };
        character.applyLevelUpSelections({ vows: ['challenge'] });

        expect(character.knownVows).toContain('challenge');
        expect(character.selectedTraits).not.toContain('challenge');
    });

    it('applyLevelUpSelections: Conviction (a trait wearing a vow tag) is added to BOTH knownVows and selectedTraits', () => {
        const character = makeRealCharacter();
        character.pendingLevelUp = { newLevel: 9, newHP: character.maxHP, hpGain: 0, newFeatures: [] };
        window.game = { traitsData: { traits: [{ id: 'conviction', tags: ['vow'] }] } };

        character.applyLevelUpSelections({ vows: ['conviction'] });

        expect(character.knownVows).toContain('conviction');
        expect(character.selectedTraits).toContain('conviction');
    });

    it('_getKnownAbilityDefinitions includes knownVows in the union', () => {
        const character = makeRealCharacter({ knownVows: ['challenge'] });
        const abilitiesData = { abilities: { dedication: [{ id: 'challenge', name: 'Challenge' }, { id: 'other', name: 'Other' }] } };
        const known = character._getKnownAbilityDefinitions(abilitiesData);
        expect(known.map(a => a.id)).toEqual(['challenge']);
    });
});
