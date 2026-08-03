/**
 * Attribute Resolver — generic ability/attribute modifier resolution
 * See docs/plans/2026-07-30-attribute-system-remap.md (M0 — plumbing, zero behavior change).
 *
 * Implements the "Engine rule: fractional attribute rounding" from that plan:
 * ability modifiers are exact fractional values, (score - 10) / 2, not pre-floored
 * integers. Round down (floor) exactly once, on the TOTAL, never on each attribute's
 * individual contribution. Single-attribute contexts are unaffected (floor-of-one-term
 * is identical either way); multi-attribute (blend) contexts must sum raw modifiers
 * first and floor once at the end, or a half-point contribution from one attribute can
 * be silently discarded (see the plan's worked examples).
 *
 * Scope note (2026-07-31): this module is pure additive plumbing. RULES.attributes.system
 * was '5EClassic' at the time this module was introduced and nothing in the codebase
 * called these functions yet — wiring real call sites over to this resolver was a
 * separate, later step (M1, see plan's "Architecture approach" and "Recommended execution
 * order" sections), since completed.
 *
 * 5EClassic-mode key redirection (fixed 2026-08-01): `derivedStatMap` always expresses
 * attribute keys in the new six-attribute naming (`prowess`/`insight`/`vitality`/...),
 * but under `RULES.attributes.system === '5EClassic'` every live character only ever
 * populates `character.abilities` with legacy keys (`str`/`dex`/`con`/...). `getRawAttributeModifier`
 * redirects new-system keys to their legacy source key (via the inverse of
 * `RULES.attributes.legacyToNew`) before reading `character.abilities` — without this,
 * every lookup silently misses and returns 0 regardless of the character's real scores.
 *
 * RULES.attributes.derivedStatMap is the single source of truth for which attribute(s)
 * feed a given derived-stat context, and whether that context is a single-attribute
 * lookup or a multi-attribute blend. See rulesEngine.js for the map itself.
 */

import { RULES } from '../core/rulesEngine.js';

// Built lazily from RULES.attributes.legacyToNew (the single source of truth for the
// legacy<->new attribute bijection) — never hardcode a second copy of this mapping here.
let newToLegacyKeyMap = null;

/**
 * Translate a `derivedStatMap` attribute key (always a new-system name, e.g. `prowess`)
 * to the key that should actually be read off `character.abilities` under the current
 * `RULES.attributes.system`. In `'5EClassic'` mode every live character only ever populates
 * legacy keys (str/dex/con/int/wis/cha), so new-system keys must be redirected to their
 * legacy source key. In `'NVSystem'` mode the new key is read as-is.
 * @param {string} attrKey
 * @returns {string}
 */
function resolveAbilityKey(attrKey) {
    if (RULES.attributes?.system !== '5EClassic') {
        return attrKey;
    }
    if (!newToLegacyKeyMap) {
        newToLegacyKeyMap = Object.fromEntries(
            Object.entries(RULES.attributes.legacyToNew).map(([legacyKey, newKey]) => [newKey, legacyKey])
        );
    }
    return newToLegacyKeyMap[attrKey] ?? attrKey;
}

/**
 * Raw (unfloored) ability modifier for a single attribute, straight from the
 * character's base score. Never floors — callers floor once, at the appropriate point.
 * @param {Object} character - Character-shaped object with an `abilities` score bag
 *   (e.g. { str: 15, dex: 12, ... } today under the legacy system; new attribute keys
 *   like `vitality`/`composure` once a character actually has them populated).
 * @param {string} attrKey - Attribute key from RULES.attributes.derivedStatMap (a
 *   new-system name). Redirected to its legacy source key under `system: '5EClassic'`.
 * @returns {number} Raw fractional modifier, e.g. score 15 -> 2.5. Returns 0 if the
 *   character or the requested attribute score is missing (defensive default, matches
 *   the zero-default pattern used elsewhere for missing character data).
 */
export function getRawAttributeModifier(character, attrKey) {
    const resolvedKey = resolveAbilityKey(attrKey);
    const score = character?.abilities?.[resolvedKey];
    if (typeof score !== 'number') {
        return 0;
    }
    return (score - 10) / 2;
}

/**
 * Look up a derived-stat context in RULES.attributes.derivedStatMap.
 * @param {string} contextKey
 * @returns {{ type: 'single'|'blend', attributes: string[] } | null}
 */
function resolveDerivedStatEntry(contextKey) {
    const entry = RULES.attributes?.derivedStatMap?.[contextKey];
    if (!entry || !Array.isArray(entry.attributes) || entry.attributes.length === 0) {
        console.warn(`attributeResolver: no derivedStatMap entry for context "${contextKey}"`);
        return null;
    }
    return entry;
}

/**
 * Resolve a single-attribute derived-stat context (e.g. AC evasion, initiative, an
 * individual saving throw). Floors once, internally — for any single-attribute context
 * this is identical to today's `Math.floor((score - 10) / 2)` / `character.abilityModifiers[key]`
 * lookup, i.e. zero behavior change versus the current pre-floored-integer pattern.
 * @param {Object} character
 * @param {string} contextKey - Key into RULES.attributes.derivedStatMap, expected type 'single'
 * @returns {number} Floored modifier
 */
export function getAttributeModifierFor(character, contextKey) {
    const entry = resolveDerivedStatEntry(contextKey);
    if (!entry) {
        return 0;
    }
    if (entry.type !== 'single') {
        console.warn(`attributeResolver: getAttributeModifierFor called on "${contextKey}" (type "${entry.type}") — use getBlendedAttributeModifier for blend contexts`);
    }
    return Math.floor(getRawAttributeModifier(character, entry.attributes[0]));
}

/**
 * Resolve a multi-attribute (blend) derived-stat context (e.g. concentration, flee,
 * Menacing Attack DC). Sums the RAW (unfloored) modifier of every attribute in the
 * blend, divides by the number of attributes blended, then floors exactly once on the
 * result — per the plan's locked formulas (decisions #3/#4/#5 are all explicitly
 * `floor((A+B)/2)`, not just `floor(A+B)`). Dividing by `entry.attributes.length` (not a
 * hardcoded `/2`) generalizes to any future blend width. This also carries forward the
 * "floor each attribute, then sum" double-floor fix from the engine rule: two half-point
 * contributions that individually round down to nothing can still combine into a real
 * bonus once averaged and floored together, instead of being discarded per-term.
 * @param {Object} character
 * @param {string} contextKey - Key into RULES.attributes.derivedStatMap, expected type 'blend'
 * @returns {number} Floored average modifier across all attributes in the blend
 */
export function getBlendedAttributeModifier(character, contextKey) {
    const entry = resolveDerivedStatEntry(contextKey);
    if (!entry) {
        return 0;
    }
    if (entry.type !== 'blend') {
        console.warn(`attributeResolver: getBlendedAttributeModifier called on "${contextKey}" (type "${entry.type}") — use getAttributeModifierFor for single-attribute contexts`);
    }
    const total = entry.attributes.reduce(
        (sum, attrKey) => sum + getRawAttributeModifier(character, attrKey),
        0
    );
    return Math.floor(total / entry.attributes.length);
}
