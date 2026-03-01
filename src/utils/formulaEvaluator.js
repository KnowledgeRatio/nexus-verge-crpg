/**
 * Formula Evaluator - Parses D&D-style formulas like "1d8 + level + con"
 * Pure function, no side effects. Reusable across abilities, spells, quest rewards.
 */

import { roll } from './dice.js';

/**
 * Evaluate a formula string with character context
 * @param {string} formula - e.g. "1d8 + level + con", "2d6 + str", "level + proficiency"
 * @param {Object} context - { level, str, dex, con, int, wis, cha, proficiency }
 * @returns {{ total: number, breakdown: string }}
 */
export function evaluateFormula(formula, context) {
    if (typeof formula === 'number') {
        return { total: formula, breakdown: String(formula) };
    }

    if (typeof formula !== 'string') {
        console.warn(`evaluateFormula: unexpected type ${typeof formula}`, formula);
        return { total: 0, breakdown: '0' };
    }

    const tokens = formula.split(/\s*\+\s*/);
    let total = 0;
    const parts = [];

    for (const token of tokens) {
        const trimmed = token.trim();
        if (!trimmed) continue;

        // Dice notation: 1d8, 2d6, etc.
        if (/^\d+d\d+$/i.test(trimmed)) {
            const rolled = roll(trimmed);
            total += rolled;
            parts.push(`${trimmed}(${rolled})`);
        }
        // Named context values
        else if (trimmed === 'level' && context.level !== undefined) {
            total += context.level;
            parts.push(`level(${context.level})`);
        }
        else if (trimmed === 'proficiency' && context.proficiency !== undefined) {
            total += context.proficiency;
            parts.push(`prof(${context.proficiency})`);
        }
        // Ability modifier shortcuts
        else if (['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(trimmed) && context[trimmed] !== undefined) {
            total += context[trimmed];
            parts.push(`${trimmed}(${context[trimmed]})`);
        }
        // Plain number
        else if (!isNaN(trimmed)) {
            const num = parseInt(trimmed);
            total += num;
            parts.push(String(num));
        }
        else {
            console.warn(`evaluateFormula: unknown token "${trimmed}"`);
        }
    }

    return { total, breakdown: parts.join(' + ') };
}

/**
 * Build a formula context from a character object
 * @param {Object} character - Character from gameState
 * @returns {Object} context for evaluateFormula
 */
export function buildFormulaContext(character) {
    const mods = character.abilityModifiers || {};
    return {
        level: character.level || 1,
        str: mods.str || 0,
        dex: mods.dex || 0,
        con: mods.con || 0,
        int: mods.int || 0,
        wis: mods.wis || 0,
        cha: mods.cha || 0,
        proficiency: character.proficiencyBonus || 2
    };
}
