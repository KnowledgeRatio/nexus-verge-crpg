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
