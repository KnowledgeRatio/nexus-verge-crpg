/**
 * Tests for src/utils/dice.js
 * D&D 5e dice rolling utility — range checks, formula parsing, D&D mechanics.
 */

import { describe, it, expect } from 'vitest';
import {
    rollDie,
    rollDice,
    roll,
    rollAdvantage,
    rollDisadvantage,
    rollD20,
    abilityCheck,
    attackRoll,
    savingThrow,
    damageRoll,
    rollHitPoints,
    rollAbilityScores,
    getAbilityModifier,
    getProficiencyBonus,
    getPassiveScore,
    formatRoll
} from '../../src/utils/dice.js';

// ---------------------------------------------------------------------------
// rollDie
// ---------------------------------------------------------------------------
describe('rollDie', () => {
    it('returns an integer', () => {
        const result = rollDie(6);
        expect(Number.isInteger(result)).toBe(true);
    });

    it('returns a value between 1 and sides (inclusive) for d6', () => {
        for (let i = 0; i < 100; i++) {
            const r = rollDie(6);
            expect(r).toBeGreaterThanOrEqual(1);
            expect(r).toBeLessThanOrEqual(6);
        }
    });

    it('returns a value between 1 and sides (inclusive) for d20', () => {
        for (let i = 0; i < 100; i++) {
            const r = rollDie(20);
            expect(r).toBeGreaterThanOrEqual(1);
            expect(r).toBeLessThanOrEqual(20);
        }
    });

    it('handles d4 correctly', () => {
        for (let i = 0; i < 50; i++) {
            const r = rollDie(4);
            expect(r).toBeGreaterThanOrEqual(1);
            expect(r).toBeLessThanOrEqual(4);
        }
    });
});

// ---------------------------------------------------------------------------
// rollDice
// ---------------------------------------------------------------------------
describe('rollDice', () => {
    it('returns a sum between count and count*sides for 2d6', () => {
        for (let i = 0; i < 100; i++) {
            const r = rollDice(2, 6);
            expect(r).toBeGreaterThanOrEqual(2);
            expect(r).toBeLessThanOrEqual(12);
        }
    });

    it('returns a sum between count and count*sides for 3d8', () => {
        for (let i = 0; i < 100; i++) {
            const r = rollDice(3, 8);
            expect(r).toBeGreaterThanOrEqual(3);
            expect(r).toBeLessThanOrEqual(24);
        }
    });

    it('handles 1d20 the same as rollDie(20)', () => {
        for (let i = 0; i < 50; i++) {
            const r = rollDice(1, 20);
            expect(r).toBeGreaterThanOrEqual(1);
            expect(r).toBeLessThanOrEqual(20);
        }
    });
});

// ---------------------------------------------------------------------------
// roll (notation parser)
// ---------------------------------------------------------------------------
describe('roll', () => {
    it('parses plain number string "5"', () => {
        expect(roll('5')).toBe(5);
    });

    it('parses plain number string "0"', () => {
        expect(roll('0')).toBe(0);
    });

    it('parses "1d20" in range [1, 20]', () => {
        for (let i = 0; i < 50; i++) {
            const r = roll('1d20');
            expect(r).toBeGreaterThanOrEqual(1);
            expect(r).toBeLessThanOrEqual(20);
        }
    });

    it('parses "2d6+3" in range [5, 15]', () => {
        for (let i = 0; i < 100; i++) {
            const r = roll('2d6+3');
            expect(r).toBeGreaterThanOrEqual(5);
            expect(r).toBeLessThanOrEqual(15);
        }
    });

    it('parses "1d8-2" in range [-1, 6]', () => {
        for (let i = 0; i < 100; i++) {
            const r = roll('1d8-2');
            expect(r).toBeGreaterThanOrEqual(-1);
            expect(r).toBeLessThanOrEqual(6);
        }
    });

    it('returns 0 on invalid notation', () => {
        expect(roll('not-a-roll')).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// rollAdvantage
// ---------------------------------------------------------------------------
describe('rollAdvantage', () => {
    it('result equals the maximum of the two rolls', () => {
        for (let i = 0; i < 100; i++) {
            const res = rollAdvantage();
            expect(res.result).toBe(Math.max(...res.rolls));
        }
    });

    it('has advantage flag set to true', () => {
        const res = rollAdvantage();
        expect(res.advantage).toBe(true);
    });

    it('rolls property contains two values in [1, 20]', () => {
        const res = rollAdvantage();
        expect(res.rolls).toHaveLength(2);
        res.rolls.forEach(r => {
            expect(r).toBeGreaterThanOrEqual(1);
            expect(r).toBeLessThanOrEqual(20);
        });
    });
});

// ---------------------------------------------------------------------------
// rollDisadvantage
// ---------------------------------------------------------------------------
describe('rollDisadvantage', () => {
    it('result equals the minimum of the two rolls', () => {
        for (let i = 0; i < 100; i++) {
            const res = rollDisadvantage();
            expect(res.result).toBe(Math.min(...res.rolls));
        }
    });

    it('has disadvantage flag set to true', () => {
        const res = rollDisadvantage();
        expect(res.disadvantage).toBe(true);
    });

    it('rolls property contains two values in [1, 20]', () => {
        const res = rollDisadvantage();
        expect(res.rolls).toHaveLength(2);
        res.rolls.forEach(r => {
            expect(r).toBeGreaterThanOrEqual(1);
            expect(r).toBeLessThanOrEqual(20);
        });
    });
});

// ---------------------------------------------------------------------------
// rollD20
// ---------------------------------------------------------------------------
describe('rollD20', () => {
    it("'normal' returns result in [1, 20]", () => {
        for (let i = 0; i < 50; i++) {
            const res = rollD20('normal');
            expect(res.result).toBeGreaterThanOrEqual(1);
            expect(res.result).toBeLessThanOrEqual(20);
        }
    });

    it("'advantage' sets advantage flag", () => {
        const res = rollD20('advantage');
        expect(res.advantage).toBe(true);
    });

    it("'advantage' result is max of two rolls", () => {
        for (let i = 0; i < 50; i++) {
            const res = rollD20('advantage');
            expect(res.result).toBe(Math.max(...res.rolls));
        }
    });

    it("'disadvantage' sets disadvantage flag", () => {
        const res = rollD20('disadvantage');
        expect(res.disadvantage).toBe(true);
    });

    it("'disadvantage' result is min of two rolls", () => {
        for (let i = 0; i < 50; i++) {
            const res = rollD20('disadvantage');
            expect(res.result).toBe(Math.min(...res.rolls));
        }
    });

    it("defaults to 'normal' when no type given", () => {
        const res = rollD20();
        expect(res.result).toBeGreaterThanOrEqual(1);
        expect(res.result).toBeLessThanOrEqual(20);
    });
});

// ---------------------------------------------------------------------------
// abilityCheck
// ---------------------------------------------------------------------------
describe('abilityCheck', () => {
    it('total equals natural + modifier', () => {
        for (let i = 0; i < 50; i++) {
            const modifier = 3;
            const res = abilityCheck(modifier);
            expect(res.total).toBe(res.natural + modifier);
        }
    });

    it('modifier is stored correctly', () => {
        const res = abilityCheck(5);
        expect(res.modifier).toBe(5);
    });

    it('sets success when total >= dc', () => {
        // Use modifier 20 so we always beat a low DC
        const res = abilityCheck(20, 'normal', 1);
        expect(res.success).toBe(true);
        expect(res.dc).toBe(1);
    });

    it('sets failure when total < dc', () => {
        // modifier = -20, dc = 100 → always fails
        const res = abilityCheck(-20, 'normal', 100);
        expect(res.success).toBe(false);
    });

    it('sets criticalSuccess on natural 20', () => {
        // Run until we get natural 20
        let found = false;
        for (let i = 0; i < 500; i++) {
            const res = abilityCheck(0, 'normal', 1);
            if (res.natural === 20) {
                expect(res.criticalSuccess).toBe(true);
                found = true;
                break;
            }
        }
        expect(found).toBe(true);
    });

    it('sets criticalFailure on natural 1', () => {
        let found = false;
        for (let i = 0; i < 500; i++) {
            const res = abilityCheck(0, 'normal', 1);
            if (res.natural === 1) {
                expect(res.criticalFailure).toBe(true);
                found = true;
                break;
            }
        }
        expect(found).toBe(true);
    });

    it('does not set criticalSuccess/criticalFailure when dc is null', () => {
        const res = abilityCheck(3);
        expect(res.criticalSuccess).toBeUndefined();
        expect(res.criticalFailure).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// attackRoll
// ---------------------------------------------------------------------------
describe('attackRoll', () => {
    it('total equals natural + attackBonus', () => {
        for (let i = 0; i < 50; i++) {
            const bonus = 5;
            const res = attackRoll(bonus, 15);
            expect(res.total).toBe(res.natural + bonus);
        }
    });

    it('stores attackBonus and targetAC', () => {
        const res = attackRoll(4, 13);
        expect(res.attackBonus).toBe(4);
        expect(res.targetAC).toBe(13);
    });

    it('hit is true when total >= targetAC', () => {
        // With bonus = 100 vs AC 1, always hits
        const res = attackRoll(100, 1);
        expect(res.hit).toBe(true);
    });

    it('hit is false when total < targetAC and not natural 20', () => {
        // With bonus = -100 vs AC 100, never hits unless natural 20
        let nonCritMiss = false;
        for (let i = 0; i < 500; i++) {
            const res = attackRoll(-100, 100);
            if (!res.critical) {
                expect(res.hit).toBe(false);
                nonCritMiss = true;
                break;
            }
        }
        expect(nonCritMiss).toBe(true);
    });

    it('natural 20 always hits regardless of AC', () => {
        let found = false;
        for (let i = 0; i < 500; i++) {
            const res = attackRoll(-50, 999);
            if (res.natural === 20) {
                expect(res.hit).toBe(true);
                expect(res.critical).toBe(true);
                found = true;
                break;
            }
        }
        expect(found).toBe(true);
    });

    it('natural 1 sets criticalMiss', () => {
        let found = false;
        for (let i = 0; i < 500; i++) {
            const res = attackRoll(0, 1);
            if (res.natural === 1) {
                expect(res.criticalMiss).toBe(true);
                found = true;
                break;
            }
        }
        expect(found).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// savingThrow
// ---------------------------------------------------------------------------
describe('savingThrow', () => {
    it('total equals natural + saveModifier', () => {
        for (let i = 0; i < 50; i++) {
            const mod = 2;
            const res = savingThrow(mod, 10);
            expect(res.total).toBe(res.natural + mod);
        }
    });

    it('success is true when total >= dc', () => {
        // modifier 100, dc 1 → always success
        const res = savingThrow(100, 1);
        expect(res.success).toBe(true);
    });

    it('success is false when total < dc', () => {
        // modifier -100, dc 100 → always fail
        const res = savingThrow(-100, 100);
        expect(res.success).toBe(false);
    });

    it('stores dc on result', () => {
        const res = savingThrow(3, 15);
        expect(res.dc).toBe(15);
    });
});

// ---------------------------------------------------------------------------
// damageRoll
// ---------------------------------------------------------------------------
describe('damageRoll', () => {
    it('"2d6+3" total is in range [5, 15]', () => {
        for (let i = 0; i < 100; i++) {
            const res = damageRoll('2d6+3', false);
            expect(res.total).toBeGreaterThanOrEqual(5);
            expect(res.total).toBeLessThanOrEqual(15);
        }
    });

    it('"2d6+3" modifier is 3', () => {
        const res = damageRoll('2d6+3', false);
        expect(res.modifier).toBe(3);
    });

    it('"2d6+3" critical doubles dice to 4d6+3, range [7, 27]', () => {
        for (let i = 0; i < 100; i++) {
            const res = damageRoll('2d6+3', true);
            expect(res.total).toBeGreaterThanOrEqual(7);
            expect(res.total).toBeLessThanOrEqual(27);
        }
    });

    it('critical roll has 4 dice entries in rolls array', () => {
        const res = damageRoll('2d6+3', true);
        expect(res.rolls).toHaveLength(4);
    });

    it('non-critical roll has 2 dice entries in rolls array', () => {
        const res = damageRoll('2d6+3', false);
        expect(res.rolls).toHaveLength(2);
    });

    it('critical flag is reflected on result', () => {
        expect(damageRoll('1d8', true).critical).toBe(true);
        expect(damageRoll('1d8', false).critical).toBe(false);
    });

    it('returns zero total on invalid notation', () => {
        const res = damageRoll('not-damage');
        expect(res.total).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// rollHitPoints
// ---------------------------------------------------------------------------
describe('rollHitPoints', () => {
    it('rollHitPoints(8, 2, false) — random roll — returns value in [3, 10]', () => {
        for (let i = 0; i < 100; i++) {
            const r = rollHitPoints(8, 2, false);
            expect(r).toBeGreaterThanOrEqual(3);
            expect(r).toBeLessThanOrEqual(10);
        }
    });

    it('rollHitPoints(8, 2, true) — average — returns floor(8/2)+1+2 = 7', () => {
        // floor(8/2) + 1 + conMod = 4 + 1 + 2 = 7
        expect(rollHitPoints(8, 2, true)).toBe(7);
    });

    it('rollHitPoints(6, 0, true) — d6 average — returns 4', () => {
        // floor(6/2) + 1 + 0 = 3 + 1 = 4
        expect(rollHitPoints(6, 0, true)).toBe(4);
    });

    it('rollHitPoints(10, 3, true) — d10 average with con 3 — returns 9', () => {
        // floor(10/2) + 1 + 3 = 5 + 1 + 3 = 9
        expect(rollHitPoints(10, 3, true)).toBe(9);
    });
});

// ---------------------------------------------------------------------------
// rollAbilityScores
// ---------------------------------------------------------------------------
describe('rollAbilityScores', () => {
    it('returns exactly 6 scores', () => {
        expect(rollAbilityScores()).toHaveLength(6);
    });

    it('each score is an integer between 3 and 18', () => {
        for (let i = 0; i < 20; i++) {
            const scores = rollAbilityScores();
            scores.forEach(score => {
                expect(Number.isInteger(score)).toBe(true);
                expect(score).toBeGreaterThanOrEqual(3);
                expect(score).toBeLessThanOrEqual(18);
            });
        }
    });

    it('scores are sorted in descending order', () => {
        const scores = rollAbilityScores();
        for (let i = 0; i < scores.length - 1; i++) {
            expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
        }
    });
});

// ---------------------------------------------------------------------------
// getAbilityModifier
// ---------------------------------------------------------------------------
describe('getAbilityModifier', () => {
    it('score 10 → modifier 0', () => {
        expect(getAbilityModifier(10)).toBe(0);
    });

    it('score 11 → modifier 0', () => {
        expect(getAbilityModifier(11)).toBe(0);
    });

    it('score 8 → modifier -1', () => {
        expect(getAbilityModifier(8)).toBe(-1);
    });

    it('score 15 → modifier +2', () => {
        expect(getAbilityModifier(15)).toBe(2);
    });

    it('score 20 → modifier +5', () => {
        expect(getAbilityModifier(20)).toBe(5);
    });

    it('score 1 → modifier -5', () => {
        expect(getAbilityModifier(1)).toBe(-5);
    });

    it('score 18 → modifier +4', () => {
        expect(getAbilityModifier(18)).toBe(4);
    });
});

// ---------------------------------------------------------------------------
// getProficiencyBonus
// ---------------------------------------------------------------------------
describe('getProficiencyBonus', () => {
    it('level 1 → +2', () => {
        expect(getProficiencyBonus(1)).toBe(2);
    });

    it('level 4 → +2', () => {
        expect(getProficiencyBonus(4)).toBe(2);
    });

    it('level 5 → +3', () => {
        expect(getProficiencyBonus(5)).toBe(3);
    });

    it('level 8 → +3', () => {
        expect(getProficiencyBonus(8)).toBe(3);
    });

    it('level 9 → +4', () => {
        expect(getProficiencyBonus(9)).toBe(4);
    });

    it('level 12 → +4', () => {
        expect(getProficiencyBonus(12)).toBe(4);
    });

    it('level 13 → +5', () => {
        expect(getProficiencyBonus(13)).toBe(5);
    });

    it('level 17 → +6', () => {
        expect(getProficiencyBonus(17)).toBe(6);
    });

    it('level 20 → +6', () => {
        expect(getProficiencyBonus(20)).toBe(6);
    });
});

// ---------------------------------------------------------------------------
// getPassiveScore
// ---------------------------------------------------------------------------
describe('getPassiveScore', () => {
    it('getPassiveScore(3) → 13', () => {
        expect(getPassiveScore(3)).toBe(13);
    });

    it('getPassiveScore(0) → 10', () => {
        expect(getPassiveScore(0)).toBe(10);
    });

    it('getPassiveScore(-1) → 9', () => {
        expect(getPassiveScore(-1)).toBe(9);
    });

    it('getPassiveScore(7) → 17 (passive perception example)', () => {
        expect(getPassiveScore(7)).toBe(17);
    });
});

// ---------------------------------------------------------------------------
// formatRoll
// ---------------------------------------------------------------------------
describe('formatRoll', () => {
    it('formats a critical hit', () => {
        const result = formatRoll({ total: 28, critical: true, rolls: [8, 8, 4, 4] });
        expect(result).toContain('CRITICAL');
        expect(result).toContain('28');
    });

    it('formats a critical miss', () => {
        const result = formatRoll({ total: -4, criticalMiss: true, rolls: [1] });
        expect(result).toContain('Critical Miss');
        expect(result).toContain('-4');
    });

    it('formats an advantage roll', () => {
        const result = formatRoll({ total: 18, advantage: true, rolls: [15, 13] });
        expect(result).toContain('Advantage');
        expect(result).toContain('18');
    });

    it('formats a disadvantage roll', () => {
        const result = formatRoll({ total: 7, disadvantage: true, rolls: [7, 12] });
        expect(result).toContain('Disadvantage');
        expect(result).toContain('7');
    });

    it('formats a plain roll as just the total', () => {
        const result = formatRoll({ total: 15 });
        expect(result).toBe('15');
    });
});
