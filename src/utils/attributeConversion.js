/**
 * Shared legacy -> six-attribute ability-score conversion for the attribute-system remap
 * (docs/plans/2026-07-30-attribute-system-remap.md, "Legacy split-attribute conversion").
 *
 * `attributeResolver.js`'s resolver is a pass-through in 'NVSystem' mode — it expects
 * `character.abilities.prowess` / `.vitality` / etc. to already exist on the character or
 * monster object. Nothing populates those keys on its own; base ability-score population
 * (Character.js's `calculateAbilities()`, EncounterBuilder.js's `createEnemyFromMonster()`)
 * still only ever writes legacy keys (str/dex/con/int/wis/cha), since neither player
 * character creation nor monster data (`data/monsters.json`, batch-convert deferred to M2)
 * has been migrated off legacy keys yet. This module bridges that gap: a straight base-score
 * copy from each legacy key onto its single bijective new-attribute target
 * (`RULES.attributes.legacyToNew` — str->prowess, con->vitality, int->intellect, dex->insight,
 * wis->composure, cha->presence), not an average. The narrower wis+cha *save*-averaging case
 * (decision #2) is a separate, already-shared implementation — see
 * `monsterAttributeConversion.js`'s `convertMonsterSavingThrows` — do not conflate the two.
 *
 * One shared implementation, callable from both Character.js (player) and
 * EncounterBuilder.js (monster) — do not reimplement this per call site, same "shim
 * landmine" caution as monsterAttributeConversion.js.
 */

import { RULES } from '../core/rulesEngine.js';

/**
 * Convert a legacy (str/dex/con/int/wis/cha) ability-score bag into the six-attribute-keyed
 * shape ('NVSystem' mode expects character.abilities to already contain these keys).
 * Only produces the six new-system keys — does not remove or alter any existing legacy keys
 * on the object the caller merges this into.
 * @param {Object} [legacyAbilities] - e.g. { str: 15, dex: 12, con: 14, int: 10, wis: 13, cha: 8 }
 * @returns {Object} e.g. { prowess: 15, insight: 12, vitality: 14, intellect: 10, composure: 13, presence: 8 }
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
