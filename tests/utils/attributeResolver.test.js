/**
 * Tests for src/utils/attributeResolver.js
 * Attribute system remap (docs/plans/2026-07-30-attribute-system-remap.md). The default
 * flag flipped to 'NVSystem' at M1.5 (2026-08-03); '5EClassic' mode is exercised here via
 * explicit overrides where the test's whole point is the legacy-mode redirect behavior.
 * These tests verify the resolver's math in isolation, including the "floor once on the
 * total, not per-term" engine rule that blend formulas (concentration, flee, Menacing
 * Attack DC) depend on.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getRawAttributeModifier,
    getAttributeModifierFor,
    getBlendedAttributeModifier
} from '../../src/utils/attributeResolver.js';
import { getAbilityModifier } from '../../src/utils/dice.js';
import { RULES } from '../../src/core/rulesEngine.js';

afterEach(() => {
    vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Sanity: current milestone state
// ---------------------------------------------------------------------------
describe('RULES.attributes scaffolding', () => {
    it('system defaults to NVSystem (M1.5 flip, 2026-08-03)', () => {
        expect(RULES.attributes.system).toBe('NVSystem');
    });

    it('derivedStatMap has entries for the documented single-attribute contexts', () => {
        for (const key of ['meleeAttack', 'rangedFinesseAttack', 'acEvasion', 'acSoak', 'hp', 'initiative', 'passivePerception', 'vitalitySave', 'insightSave', 'composureSave']) {
            expect(RULES.attributes.derivedStatMap[key]?.type).toBe('single');
        }
    });

    it('derivedStatMap has entries for the documented blend contexts', () => {
        for (const key of ['concentration', 'flee', 'menacingAttackDC']) {
            expect(RULES.attributes.derivedStatMap[key]?.type).toBe('blend');
        }
    });
});

// ---------------------------------------------------------------------------
// getRawAttributeModifier
// ---------------------------------------------------------------------------
// NOTE: RULES.attributes.system is explicitly forced to '5EClassic' for all of these
// (the pre-M1.5 default, still live as rollback) — so a realistic character's
// `abilities` bag is keyed by legacy names (str/dex/con/int/wis/cha) even though attrKey
// (as it would come from derivedStatMap) is always a new-system name. That redirection is
// the fix for the 2026-08-01 bug: without it, every one of these lookups silently returned 0.
describe('getRawAttributeModifier (5EClassic mode — real character shape)', () => {
    const originalSystem = RULES.attributes.system;
    beforeEach(() => {
        RULES.attributes.system = '5EClassic';
    });
    afterEach(() => {
        RULES.attributes.system = originalSystem;
    });

    it('score 10 -> raw modifier 0', () => {
        expect(getRawAttributeModifier({ abilities: { con: 10 } }, 'vitality')).toBe(0);
    });

    it('score 15 -> raw modifier 2.5 (unfloored)', () => {
        expect(getRawAttributeModifier({ abilities: { con: 15 } }, 'vitality')).toBe(2.5);
    });

    it('score 13 -> raw modifier 1.5 (unfloored)', () => {
        expect(getRawAttributeModifier({ abilities: { wis: 13 } }, 'composure')).toBe(1.5);
    });

    it('score 8 -> raw modifier -1', () => {
        expect(getRawAttributeModifier({ abilities: { str: 8 } }, 'prowess')).toBe(-1);
    });

    it('is a no-op pass-through when attrKey is already a legacy key', () => {
        expect(getRawAttributeModifier({ abilities: { str: 17 } }, 'str')).toBe(3.5);
    });

    it('returns 0 when character is missing', () => {
        expect(getRawAttributeModifier(undefined, 'vitality')).toBe(0);
    });

    it('returns 0 when abilities bag is missing', () => {
        expect(getRawAttributeModifier({}, 'vitality')).toBe(0);
    });

    it('returns 0 when the requested attribute score is missing', () => {
        expect(getRawAttributeModifier({ abilities: { con: 15 } }, 'composure')).toBe(0);
    });

    it('regression: real ability scores (16/14/12/10/13/15) resolve to non-zero legacy-equivalent modifiers, not 0', () => {
        // str 16, dex 14, con 12, int 10, wis 13, cha 15 — the exact repro used to catch the
        // original bug (every resolver call silently returned 0 regardless of real scores).
        const character = { abilities: { str: 16, dex: 14, con: 12, int: 10, wis: 13, cha: 15 } };
        expect(getRawAttributeModifier(character, 'prowess')).toBe(3);   // str 16 -> +3
        expect(getRawAttributeModifier(character, 'insight')).toBe(2);   // dex 14 -> +2
        expect(getRawAttributeModifier(character, 'vitality')).toBe(1); // con 12 -> +1
        expect(getRawAttributeModifier(character, 'intellect')).toBe(0); // int 10 -> +0
        expect(getRawAttributeModifier(character, 'composure')).toBe(1.5); // wis 13 -> +1.5 (unfloored)
        expect(getRawAttributeModifier(character, 'presence')).toBe(2.5); // cha 15 -> +2.5 (unfloored)
    });
});

describe('getRawAttributeModifier (NVSystem mode — reads new key directly)', () => {
    const originalSystem = RULES.attributes.system;
    afterEach(() => {
        RULES.attributes.system = originalSystem;
    });

    it('does not redirect new-system keys when system is NVSystem', () => {
        RULES.attributes.system = 'NVSystem';
        expect(getRawAttributeModifier({ abilities: { vitality: 15 } }, 'vitality')).toBe(2.5);
        // Legacy key would NOT resolve in this mode — confirms no accidental fallback.
        expect(getRawAttributeModifier({ abilities: { con: 15 } }, 'vitality')).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// getBlendedAttributeModifier (NVSystem mode) — the real target-system formulas
// (docs/plans/2026-07-30-attribute-system-remap.md, M1 step 6). These are the "real,
// intended behavior once the system flips to 'NVSystem'" formulas — concentration
// (decision #3), flee (decision #4), Menacing Attack DC (decision #5). All three are
// already declared in RULES.attributes.derivedStatMap; these tests exercise them with
// realistic new-system attribute keys directly, not legacy-redirected ones, since the
// 5EClassic-mode blend tests below only prove the redirection layer, not the target formula.
// ---------------------------------------------------------------------------
describe('getBlendedAttributeModifier (NVSystem mode)', () => {
    const originalSystem = RULES.attributes.system;
    beforeEach(() => {
        RULES.attributes.system = 'NVSystem';
    });
    afterEach(() => {
        RULES.attributes.system = originalSystem;
    });

    it('concentration: floor((Vitality_mod + Composure_mod) / 2) — plan worked example, Vitality 15 / Composure 13', () => {
        const character = { abilities: { vitality: 15, composure: 13 } };
        // 2.5 + 1.5 = 4.0 -> floor(4.0 / 2) = 2 (not the double-floor bug's 3, and not the
        // missing-division bug's 4 — sum-then-floor with no averaging)
        expect(getBlendedAttributeModifier(character, 'concentration')).toBe(2);
    });

    it('concentration: a half-point contribution alone floors to nothing, but pairs to push the total over a threshold', () => {
        const aloneCase = { abilities: { vitality: 13, composure: 10 } }; // 1.5 + 0 = 1.5 -> floor(1.5/2) = 0
        expect(getBlendedAttributeModifier(aloneCase, 'concentration')).toBe(0);
        const pairedCase = { abilities: { vitality: 13, composure: 13 } }; // 1.5 + 1.5 = 3.0 -> floor(3.0/2) = 1
        expect(getBlendedAttributeModifier(pairedCase, 'concentration')).toBe(1);
    });

    it('flee: floor((Prowess_mod + Insight_mod) / 2)', () => {
        const character = { abilities: { prowess: 14, insight: 13 } }; // 2.0 + 1.5 = 3.5 -> floor(3.5/2) = 1
        expect(getBlendedAttributeModifier(character, 'flee')).toBe(1);
    });

    it('flee: a dump-Prowess build still gets a real (if small) blended modifier from Insight alone', () => {
        const character = { abilities: { prowess: 8, insight: 16 } }; // -1 + 3 = 2 -> floor(2/2) = 1
        expect(getBlendedAttributeModifier(character, 'flee')).toBe(1);
    });

    it('menacingAttackDC: floor((Prowess_mod + Presence_mod) / 2) — plan worked example, Prowess +2.5 / Presence +1.5', () => {
        const character = { abilities: { prowess: 15, presence: 13 } };
        // 2.5 + 1.5 = 4.0 -> floor(4.0 / 2) = 2 (not the double-floor bug's 3, and not the
        // missing-division bug's 4)
        expect(getBlendedAttributeModifier(character, 'menacingAttackDC')).toBe(2);
    });

    it('menacingAttackDC: negative raw modifiers sum correctly (point-buy floor, score 8 both stats)', () => {
        const character = { abilities: { prowess: 8, presence: 8 } }; // -1 + -1 = -2 -> floor(-2/2) = -1
        expect(getBlendedAttributeModifier(character, 'menacingAttackDC')).toBe(-1);
    });
});

// ---------------------------------------------------------------------------
// getAttributeModifierFor (single-attribute contexts) — exercised under '5EClassic'
// mode, since these tests rely on the legacy-key redirect (e.g. insight -> dex).
// ---------------------------------------------------------------------------
describe('getAttributeModifierFor', () => {
    const originalSystem = RULES.attributes.system;
    beforeEach(() => {
        RULES.attributes.system = '5EClassic';
    });
    afterEach(() => {
        RULES.attributes.system = originalSystem;
    });

    it('floors a single attribute exactly like the existing floored-integer pattern (zero behavior change)', () => {
        // acEvasion -> ['insight'] (type: 'single'), which redirects to legacy 'dex' under
        // system: '5EClassic'. For any single term, floor(raw) === the game's existing
        // Math.floor((score - 10) / 2) modifier — this IS the "zero behavior change"
        // guarantee for single-attribute contexts: there's nothing to blend, so the
        // floor-once rule collapses to today's per-attribute floor.
        for (const score of [8, 10, 11, 13, 15, 18, 20]) {
            const character = { abilities: { dex: score } };
            expect(getAttributeModifierFor(character, 'acEvasion')).toBe(getAbilityModifier(score));
        }
    });

    it('resolves initiative from insight -> legacy dex (per derivedStatMap + legacyToNew)', () => {
        const character = { abilities: { dex: 14 } };
        expect(getAttributeModifierFor(character, 'initiative')).toBe(2);
    });

    it('resolves vitalitySave from vitality -> legacy con', () => {
        const character = { abilities: { con: 17 } };
        expect(getAttributeModifierFor(character, 'vitalitySave')).toBe(3);
    });

    it('floors a half-point score down (13 -> +1, not +1.5)', () => {
        const character = { abilities: { wis: 13 } };
        expect(getAttributeModifierFor(character, 'composureSave')).toBe(1);
    });

    it('returns 0 and warns for an unknown context key', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const character = { abilities: { dex: 20 } };
        expect(getAttributeModifierFor(character, 'notARealContext')).toBe(0);
        expect(warnSpy).toHaveBeenCalled();
    });

    it('returns 0 for a missing character', () => {
        expect(getAttributeModifierFor(undefined, 'acEvasion')).toBe(0);
    });

    it('melee attack context (str 16) resolves to +3 — the exact scenario from the live repro', () => {
        const character = { abilities: { str: 16, dex: 14, con: 12, int: 10, wis: 13, cha: 15 } };
        expect(getAttributeModifierFor(character, 'meleeAttack')).toBe(3);
    });
});

// ---------------------------------------------------------------------------
// getBlendedAttributeModifier (multi-attribute contexts, '5EClassic' legacy-key
// redirect) — the engine rule
// ---------------------------------------------------------------------------
describe('getBlendedAttributeModifier', () => {
    const originalSystem = RULES.attributes.system;
    beforeEach(() => {
        RULES.attributes.system = '5EClassic';
    });
    afterEach(() => {
        RULES.attributes.system = originalSystem;
    });

    // Blend attribute keys redirect through legacyToNew too: concentration (vitality+composure)
    // -> con+wis; flee (prowess+insight) -> str+dex; menacingAttackDC (prowess+presence) -> str+cha.
    it('plan worked example: Vitality 15 / Composure 13 (concentration) -> floor(4.0 / 2) = 2, not 3 or 4', () => {
        const character = { abilities: { con: 15, wis: 13 } };
        const result = getBlendedAttributeModifier(character, 'concentration');

        expect(result).toBe(2);
        // Guard against both the double-floor bug (floor-each-then-sum) AND the
        // missing-division bug (sum-then-floor with no averaging) the engine rule
        // and the locked formula (decision #3) exist to prevent, respectively.
        const buggyFloorEachThenSum = Math.floor(2.5) + Math.floor(1.5);
        const buggyMissingDivision = Math.floor(2.5 + 1.5);
        expect(buggyFloorEachThenSum).toBe(3);
        expect(buggyMissingDivision).toBe(4);
        expect(result).not.toBe(buggyFloorEachThenSum);
        expect(result).not.toBe(buggyMissingDivision);
    });

    it('plan worked example: Prowess +2.5 / Presence +1.5 (menacingAttackDC) -> floor(4.0 / 2) = 2, not 3 or 4', () => {
        // +2.5 mod <- score 15, +1.5 mod <- score 13
        const character = { abilities: { str: 15, cha: 13 } };
        const result = getBlendedAttributeModifier(character, 'menacingAttackDC');

        expect(result).toBe(2);
        const buggyFloorEachThenSum = Math.floor(2.5) + Math.floor(1.5);
        const buggyMissingDivision = Math.floor(2.5 + 1.5);
        expect(buggyFloorEachThenSum).toBe(3);
        expect(buggyMissingDivision).toBe(4);
        expect(result).not.toBe(buggyFloorEachThenSum);
        expect(result).not.toBe(buggyMissingDivision);
    });

    it('flee blend (prowess + insight) sums raw and floors once', () => {
        const character = { abilities: { str: 14, dex: 13 } }; // 2.0 + 1.5 = 3.5 -> floor(3.5/2) = 1
        expect(getBlendedAttributeModifier(character, 'flee')).toBe(1);
    });

    it('handles negative raw modifiers correctly when summed', () => {
        const character = { abilities: { con: 8, wis: 9 } }; // -1 + -0.5 = -1.5 -> floor(-1.5/2) = -1
        expect(getBlendedAttributeModifier(character, 'concentration')).toBe(Math.floor(-1.5 / 2));
        expect(getBlendedAttributeModifier(character, 'concentration')).toBe(-1);
    });

    it('a single half-point contribution alone would floor to nothing (contrast case)', () => {
        // Confirms the "worthless in isolation" half-point framing from the plan: a lone
        // +0.5 does nothing on its own until it is combined with another attribute's raw value.
        const character = { abilities: { con: 10, wis: 11 } }; // 0 + 0.5 = 0.5
        expect(getBlendedAttributeModifier(character, 'concentration')).toBe(0);
    });

    it('returns 0 and warns for an unknown context key', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const character = { abilities: { con: 15, wis: 13 } };
        expect(getBlendedAttributeModifier(character, 'notARealContext')).toBe(0);
        expect(warnSpy).toHaveBeenCalled();
    });

    it('warns (but still computes) when called on a single-type context', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const character = { abilities: { dex: 14 } };
        expect(getBlendedAttributeModifier(character, 'initiative')).toBe(2);
        expect(warnSpy).toHaveBeenCalled();
    });

    it('regression: real ability scores (16/14/12/10/13/15) resolve flee to a real non-zero value, not 0', () => {
        // flee = floor((prowess(str) + insight(dex)) / 2). str 16 -> +3, dex 14 -> +2 -> sum 5 -> floor(5/2) = 2
        const character = { abilities: { str: 16, dex: 14, con: 12, int: 10, wis: 13, cha: 15 } };
        expect(getBlendedAttributeModifier(character, 'flee')).toBe(2);
    });
});
