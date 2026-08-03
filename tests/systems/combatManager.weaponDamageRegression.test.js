/**
 * Regression coverage for two severe bugs found during a balance validation pass
 * (docs/plans/2026-07-30-attribute-system-remap.md), both orthogonal to the attribute
 * remap itself:
 *
 * Bug 1 — CombatManager.attack() read `weapon.damage.dice` / `weapon.damage.type`,
 * assuming an object shape. Every weapon in data/items.json stores `damage` as a plain
 * dice-notation string (e.g. "1d12") with `damageType` as a sibling field. The mismatch
 * silently fell through to the unarmed-d4 fallback for every equipped weapon in live
 * combat. Deliberately built against REAL data/items.json weapon entries (not a
 * hand-built fixture matching the buggy expected shape) — a hand-built fixture is
 * exactly the blind spot that let this ship undetected.
 *
 * Bug 2 — CombatManager.calculateMonsterAttackStats() assumed `action.damage` was always
 * a dice-notation string and called `.match()` on it directly, throwing for the 5
 * void-family monster actions in data/monsters.json that use an object shape
 * `{ dice, bonus?, type }` instead. Also built against real monster action data.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

globalThis.window = globalThis.window || {};
window.game = null;
window.lootManager = null;

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const itemsData = JSON.parse(readFileSync(join(repoRoot, 'data/items.json'), 'utf8'));
const monstersData = JSON.parse(readFileSync(join(repoRoot, 'data/monsters.json'), 'utf8'));

function findWeapon(id) {
    const weapon = itemsData.weapons.find(w => w.id === id);
    if (!weapon) throw new Error(`fixture weapon "${id}" not found in data/items.json`);
    return weapon;
}

function findMonster(name) {
    const monster = monstersData.monsters.find(m => m.name === name);
    if (!monster) throw new Error(`fixture monster "${name}" not found in data/monsters.json`);
    return monster;
}

function makeCharacter(overrides = {}) {
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

// Default flag flipped to 'NVSystem' at M1.5 (2026-08-03). This file's fixtures only
// populate legacy `abilities.str`, so force '5EClassic' mode for the resolver redirect
// to find it (matches this file's pre-flip authoring intent, orthogonal to the remap).
const originalAttributeSystem = RULES.attributes.system;

beforeEach(() => {
    gameState.data.ui.messageLog = [];
    RULES.attributes.system = '5EClassic';
});

afterEach(() => {
    vi.restoreAllMocks();
    RULES.attributes.system = originalAttributeSystem;
});

describe('Bug 1 regression — weapon.damage is a plain string in items.json, not { dice, type }', () => {
    it('a real weapon (greataxe, "1d12") rolls its actual die, not the 1d4 unarmed fallback', async () => {
        const cm = new CombatManager();
        const greataxe = findWeapon('greataxe');
        expect(typeof greataxe.damage).toBe('string'); // sanity: confirms items.json's real shape
        expect(greataxe.damage).toBe('1d12');

        const attacker = new Combatant(
            makeCharacter({ equipment: { mainHand: greataxe, offHand: null, armor: null } }),
            'enemy', 'atk'
        );
        const defender = new Combatant(makeCharacter({ ac: 5, damageResistances: ['blood'] }), 'enemy', 'def');

        RULES.combat.damageReductionSystem.enabled = true;
        try {
            vi.spyOn(Math, 'random')
                .mockReturnValueOnce(9 / 20)   // attack d20 = 10, guaranteed hit vs AC 5, not a crit
                .mockReturnValueOnce(0.99);    // damage die roll — near-max

            await cm.attack(attacker, defender);

            // 0.99 on a real 1d12 rolls 12; the pre-fix fallback (damageDice stuck at the
            // unarmed default of 4) would have rolled a 4 here instead.
            expect(lastMessageStartingWith('💥 Hit! Damage:')).toBe('💥 Hit! Damage: 12 = 12');

            // damageType also comes from a sibling field (weapon.damageType), not weapon.damage.type —
            // confirmed via the resistance message, which only fires if the real type ("blood") matched.
            expect(lastMessageStartingWith('Fixture resists')).toBe('Fixture resists blood (12 → 6)');
        } finally {
            RULES.combat.damageReductionSystem.enabled = false;
        }
    });
});

describe('Bug 2 regression — calculateMonsterAttackStats() must not crash on object-shape action.damage', () => {
    it('does not throw for the void-family { dice, type } shape (no bonus field)', () => {
        const cm = new CombatManager();
        const voidTrace = findMonster('Void Trace');
        const action = voidTrace.actions[0];
        expect(action.name).toBe('Void Touch');
        expect(typeof action.damage).toBe('object'); // sanity: confirms monsters.json's real shape

        const combatant = { character: { abilities: { str: 14 }, proficiencyBonus: 3 } };

        let stats;
        expect(() => { stats = cm.calculateMonsterAttackStats(combatant, action); }).not.toThrow();

        expect(stats.damageDice).toBe('1d4');
        expect(stats.damageType).toBe('necrotic');
        // No explicit `bonus` on this action's damage object — damage bonus falls back to
        // the real ability modifier (str 14 -> +2), not silently zeroed or NaN.
        expect(stats.damageBonus).toBe(2);
        expect(stats.attackBonus).toBe(2 + 3);
    });

    it('does not throw for the void-family { dice, bonus, type } shape, and the explicit bonus only overrides damage, not the to-hit bonus', () => {
        const cm = new CombatManager();
        const voidHunter = findMonster('Void Hunter');
        const action = voidHunter.actions[0];
        expect(action.name).toBe('Void Claw');
        expect(action.damage.bonus).toBe(3);

        const combatant = { character: { abilities: { str: 14 }, proficiencyBonus: 3 } };

        let stats;
        expect(() => { stats = cm.calculateMonsterAttackStats(combatant, action); }).not.toThrow();

        expect(stats.damageDice).toBe('2d6');
        expect(stats.damageType).toBe('necrotic');
        // The stat block's explicit damage bonus (3) replaces the generic ability modifier
        // for damage only...
        expect(stats.damageBonus).toBe(3);
        // ...the to-hit attackBonus is unaffected and still derives from the real ability
        // modifier (str 14 -> +2) + proficiency, not corrupted by the damage-object bonus.
        expect(stats.attackBonus).toBe(2 + 3);
    });

    it('all 5 void-family monster actions with object-shape damage resolve without throwing', () => {
        const cm = new CombatManager();
        const combatant = { character: { abilities: { str: 14 }, proficiencyBonus: 3 } };
        const objectDamageActions = [];
        for (const monster of monstersData.monsters) {
            for (const action of monster.actions || []) {
                if (action.damage && typeof action.damage === 'object') {
                    objectDamageActions.push({ monster: monster.name, action });
                }
            }
        }

        expect(objectDamageActions.length).toBeGreaterThanOrEqual(5);
        for (const { monster, action } of objectDamageActions) {
            expect(() => cm.calculateMonsterAttackStats(combatant, action), `${monster} / ${action.name}`).not.toThrow();
        }
    });
});
