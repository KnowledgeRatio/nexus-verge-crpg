/**
 * D&D 5e Dice Rolling System
 * Supports all standard dice notation and D&D mechanics
 */

/**
 * Roll a single die
 * @param {number} sides - Number of sides (4, 6, 8, 10, 12, 20, 100)
 * @returns {number} - Result of roll
 */
export function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll multiple dice and sum
 * @param {number} count - Number of dice
 * @param {number} sides - Sides per die
 * @returns {number} - Sum of all dice
 */
export function rollDice(count, sides) {
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += rollDie(sides);
    }
    return total;
}

/**
 * Parse and roll dice notation (e.g., "1d20", "2d6+3", "1d8+5")
 * @param {string} notation - Dice notation string
 * @returns {number} - Result of roll
 */
export function roll(notation) {
    // Handle simple numbers
    if (!isNaN(notation)) {
        return parseInt(notation);
    }

    // Parse notation: XdY+Z or XdY-Z
    const match = notation.match(/(\d+)d(\d+)([+-]\d+)?/i);
    if (!match) {
        console.error(`Invalid dice notation: ${notation}`);
        return 0;
    }

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const modifier = match[3] ? parseInt(match[3]) : 0;

    return rollDice(count, sides) + modifier;
}

/**
 * Roll with advantage (roll twice, take higher)
 * @param {number} sides - Die sides (usually 20)
 * @returns {object} - {result, rolls: [roll1, roll2]}
 */
export function rollAdvantage(sides = 20) {
    const roll1 = rollDie(sides);
    const roll2 = rollDie(sides);
    return {
        result: Math.max(roll1, roll2),
        rolls: [roll1, roll2],
        advantage: true
    };
}

/**
 * Roll with disadvantage (roll twice, take lower)
 * @param {number} sides - Die sides (usually 20)
 * @returns {object} - {result, rolls: [roll1, roll2]}
 */
export function rollDisadvantage(sides = 20) {
    const roll1 = rollDie(sides);
    const roll2 = rollDie(sides);
    return {
        result: Math.min(roll1, roll2),
        rolls: [roll1, roll2],
        disadvantage: true
    };
}

/**
 * Roll d20 with optional advantage/disadvantage
 * @param {string} type - 'normal', 'advantage', or 'disadvantage'
 * @returns {object} - {result, natural, rolls}
 */
export function rollD20(type = 'normal') {
    if (type === 'advantage') {
        return rollAdvantage(20);
    } else if (type === 'disadvantage') {
        return rollDisadvantage(20);
    } else {
        const result = rollDie(20);
        return {
            result: result,
            natural: result,
            rolls: [result]
        };
    }
}

/**
 * Make an ability check (d20 + modifier)
 * @param {number} modifier - Ability modifier + proficiency (if proficient)
 * @param {string} type - 'normal', 'advantage', or 'disadvantage'
 * @returns {object} - {total, natural, modifier, rolls, success (if DC provided)}
 */
export function abilityCheck(modifier, type = 'normal', dc = null) {
    const roll = rollD20(type);
    const total = roll.result + modifier;

    const result = {
        total: total,
        natural: roll.result,
        modifier: modifier,
        rolls: roll.rolls,
        advantage: roll.advantage,
        disadvantage: roll.disadvantage
    };

    if (dc !== null) {
        result.dc = dc;
        result.success = total >= dc;
        // Natural 1 always fails, natural 20 always succeeds (for some DMs)
        if (roll.result === 1) {
            result.criticalFailure = true;
        }
        if (roll.result === 20) {
            result.criticalSuccess = true;
        }
    }

    return result;
}

/**
 * Make an attack roll (d20 + attack bonus)
 * @param {number} attackBonus - Attack bonus (ability mod + proficiency + magic bonus)
 * @param {number} targetAC - Target's armor class
 * @param {string} type - 'normal', 'advantage', or 'disadvantage'
 * @returns {object} - {total, natural, hit, critical}
 */
export function attackRoll(attackBonus, targetAC, type = 'normal') {
    const roll = rollD20(type);
    const total = roll.result + attackBonus;

    return {
        total: total,
        natural: roll.result,
        attackBonus: attackBonus,
        targetAC: targetAC,
        rolls: roll.rolls,
        hit: total >= targetAC || roll.result === 20, // Natural 20 always hits
        critical: roll.result === 20,
        criticalMiss: roll.result === 1,
        advantage: roll.advantage,
        disadvantage: roll.disadvantage
    };
}

/**
 * Make a saving throw (d20 + save modifier)
 * @param {number} saveModifier - Save modifier (ability mod + proficiency if proficient)
 * @param {number} dc - Difficulty class
 * @param {string} type - 'normal', 'advantage', or 'disadvantage'
 * @returns {object} - {total, natural, success}
 */
export function savingThrow(saveModifier, dc, type = 'normal') {
    const roll = rollD20(type);
    const total = roll.result + saveModifier;

    return {
        total: total,
        natural: roll.result,
        saveModifier: saveModifier,
        dc: dc,
        rolls: roll.rolls,
        success: total >= dc,
        advantage: roll.advantage,
        disadvantage: roll.disadvantage
    };
}

/**
 * Roll damage dice (supports critical hits)
 * @param {string} damageDice - Damage notation (e.g., "1d8+3")
 * @param {boolean} critical - Is this a critical hit? (roll dice twice)
 * @returns {object} - {total, rolls, critical}
 */
export function damageRoll(damageDice, critical = false) {
    // Parse notation
    const match = damageDice.match(/(\d+)d(\d+)([+-]\d+)?/i);
    if (!match) {
        console.error(`Invalid damage dice: ${damageDice}`);
        return { total: 0, rolls: [], critical: false };
    }

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const modifier = match[3] ? parseInt(match[3]) : 0;

    const rolls = [];
    let total = 0;

    // Roll dice (double if critical)
    const diceCount = critical ? count * 2 : count;
    for (let i = 0; i < diceCount; i++) {
        const roll = rollDie(sides);
        rolls.push(roll);
        total += roll;
    }

    // Add modifier only once (not doubled on crit)
    total += modifier;

    return {
        total: total,
        rolls: rolls,
        modifier: modifier,
        critical: critical,
        notation: damageDice
    };
}

/**
 * Roll hit points for leveling up
 * @param {number} hitDie - Hit die size (6, 8, 10, 12)
 * @param {number} conModifier - Constitution modifier
 * @param {boolean} takeAverage - Take average instead of rolling (default for higher levels)
 * @returns {number} - HP gained
 */
export function rollHitPoints(hitDie, conModifier, takeAverage = false) {
    if (takeAverage) {
        return Math.floor(hitDie / 2) + 1 + conModifier;
    }
    return rollDie(hitDie) + conModifier;
}

/**
 * Standard array for ability scores (D&D 5e)
 */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

/**
 * Roll ability scores (4d6 drop lowest, six times)
 * @returns {array} - Six ability scores
 */
export function rollAbilityScores() {
    const scores = [];
    for (let i = 0; i < 6; i++) {
        // Roll 4d6
        const rolls = [rollDie(6), rollDie(6), rollDie(6), rollDie(6)];
        // Drop lowest
        rolls.sort((a, b) => a - b);
        const total = rolls[1] + rolls[2] + rolls[3];
        scores.push(total);
    }
    return scores.sort((a, b) => b - a); // Sort descending
}

/**
 * Calculate ability modifier from ability score
 * @param {number} abilityScore - Ability score (1-30)
 * @returns {number} - Ability modifier
 */
export function getAbilityModifier(abilityScore) {
    return Math.floor((abilityScore - 10) / 2);
}

/**
 * Get proficiency bonus by level (D&D 5e)
 * @param {number} level - Character level (1-20)
 * @returns {number} - Proficiency bonus
 */
export function getProficiencyBonus(level) {
    return Math.ceil(level / 4) + 1;
}

/**
 * Calculate passive score (Passive Perception, etc.)
 * @param {number} bonus - Skill bonus (ability mod + proficiency if applicable)
 * @returns {number} - Passive score (10 + bonus)
 */
export function getPassiveScore(bonus) {
    return 10 + bonus;
}

/**
 * Utility: Format roll result for display
 * @param {object} rollResult - Result from any roll function
 * @returns {string} - Formatted string
 */
export function formatRoll(rollResult) {
    if (rollResult.critical) {
        return `${rollResult.total} (CRITICAL! Rolled: ${rollResult.rolls.join(', ')})`;
    } else if (rollResult.criticalMiss) {
        return `${rollResult.total} (Critical Miss! Rolled: 1)`;
    } else if (rollResult.advantage) {
        return `${rollResult.total} (Advantage: ${rollResult.rolls.join(', ')})`;
    } else if (rollResult.disadvantage) {
        return `${rollResult.total} (Disadvantage: ${rollResult.rolls.join(', ')})`;
    } else {
        return `${rollResult.total}`;
    }
}
