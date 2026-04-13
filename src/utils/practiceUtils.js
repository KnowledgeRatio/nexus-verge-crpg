/**
 * Resolves a level-keyed value object to the effective value at a given character level.
 * Works for any level-scaled practice field.
 *
 * e.g. { "1": "uniformChoice", "6": "individualChoice" } at level 7 → "individualChoice"
 * e.g. { "2": 1, "6": 2 } at level 5 → 1
 *
 * @param {Object} levelKeyedObj
 * @param {number} level
 * @returns {*} Value for the highest key the character meets, or null if none
 */
export function resolveLevelKeyedValue(levelKeyedObj, level) {
    let resolved = null;
    for (const [lvl, value] of Object.entries(levelKeyedObj)) {
        if (level >= parseInt(lvl, 10)) {
            resolved = value;
        }
    }
    return resolved;
}

/**
 * Returns the effective ability score for a character, including any active meal buff.
 * Use this instead of character.abilities[key] in systems that should respect Hearthcraft buffs.
 *
 * @param {Object} character
 * @param {string} abilityKey  'str'|'dex'|'con'|'int'|'wis'|'cha'
 * @returns {number}
 */
export function getBuffedAbility(character, abilityKey) {
    const base = character.abilities?.[abilityKey] ?? 10;
    const buff = character.activeMealBuff;
    if (buff && buff.abilityScore === abilityKey) {
        return base + (buff.bonusMagnitude ?? 1);
    }
    return base;
}
