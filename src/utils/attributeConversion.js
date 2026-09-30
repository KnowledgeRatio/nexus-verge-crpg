/**
 * Shared legacy -> six-attribute ability-score conversion for the attribute-system remap
 * (docs/plans/2026-07-30-attribute-system-remap.md, "Legacy split-attribute conversion").
 *
 * `attributeResolver.js` expects canonical NVSystem keys. New characters and converted
 * monster records now store those keys directly; this module also bridges legacy 5e saves
 * and records created before the Intuition/Resilience rename. Legacy score conversion is a
 * straight base-score copy onto each single bijective new-attribute target
 * (`RULES.attributes.legacyToNew` — str->prowess, con->resilience, int->intellect, dex->intuition,
 * wis->composure, cha->presence), not an average. The narrower wis+cha *save*-averaging case
 * (decision #2) is a separate, already-shared implementation — see
 * `monsterAttributeConversion.js`'s `convertMonsterSavingThrows` — do not conflate the two.
 *
 * Keep conversion and compatibility normalization shared here rather than reimplementing
 * either mapping per loader.
 */

import { RULES } from '../core/rulesEngine.js';

/**
 * Convert a legacy (str/dex/con/int/wis/cha) ability-score bag into the six-attribute-keyed
 * shape ('NVSystem' mode expects character.abilities to already contain these keys).
 * Only produces the six new-system keys — does not remove or alter any existing legacy keys
 * on the object the caller merges this into.
 * @param {Object} [legacyAbilities] - e.g. { str: 15, dex: 12, con: 14, int: 10, wis: 13, cha: 8 }
 * @returns {Object} e.g. { prowess: 15, intuition: 12, resilience: 14, intellect: 10, composure: 13, presence: 8 }
 */
export function convertLegacyAbilitiesToSixAttribute(legacyAbilities = {}) {
    const result = {};
    for (const [legacyKey, newKey] of Object.entries(RULES.attributes.legacyToNew)) {
        if (typeof legacyAbilities[legacyKey] === 'number') {
            result[newKey] = legacyAbilities[legacyKey];
        }
    }
    return result;
}

const RETIRED_ATTRIBUTE_ALIASES = Object.freeze({
    insight: 'intuition',
    vitality: 'resilience'
});

/**
 * Normalize an NVSystem attribute identifier persisted before the 2026 rename.
 * This is save compatibility only; new content must use the canonical identifier.
 * @param {string} attributeKey
 * @returns {string}
 */
export function normalizeNVAttributeKey(attributeKey) {
    return RETIRED_ATTRIBUTE_ALIASES[attributeKey] ?? attributeKey;
}

/**
 * Return a canonical six-attribute score bag. Native canonical values win, followed by
 * retired-name save values, followed by legacy 5e conversion values.
 * @param {Object} [abilities]
 * @returns {Object}
 */
export function normalizeSixAttributeAbilities(abilities = {}) {
    const legacyConverted = convertLegacyAbilitiesToSixAttribute(abilities);
    const retiredConverted = Object.fromEntries(
        Object.entries(abilities).map(([key, value]) => [normalizeNVAttributeKey(key), value])
    );
    const result = {};
    for (const canonicalKey of Object.values(RULES.attributes.legacyToNew)) {
        const value = abilities[canonicalKey]
            ?? retiredConverted[canonicalKey]
            ?? legacyConverted[canonicalKey];
        if (typeof value === 'number') {
            result[canonicalKey] = value;
        }
    }
    return result;
}
