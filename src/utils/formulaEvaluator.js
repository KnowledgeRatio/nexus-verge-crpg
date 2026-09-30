/**
 * Formula Evaluator - Parses formulas like "1d8 + level + resilience"
 * Pure function, no side effects. Reusable across abilities, spells, quest rewards.
 */

import { roll } from './dice.js';
import { RULES } from '../core/rulesEngine.js';

/**
 * Evaluate a formula string with character context
 * @param {string} formula - e.g. "1d8 + level + resilience", "level + proficiency"
 * @param {Object} context - Named numeric values available to the formula
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
        if (!trimmed) {
            continue;
        }

        // Dice notation: 1d8, 2d6, etc.
        if (/^\d+d\d+$/i.test(trimmed)) {
            const rolled = roll(trimmed);
            total += rolled;
            parts.push(`${trimmed}(${rolled})`);
        } else if (trimmed === 'level' && context.level !== undefined) {
            // Named context values
            total += context.level;
            parts.push(`level(${context.level})`);
        } else if (trimmed === 'proficiency' && context.proficiency !== undefined) {
            total += context.proficiency;
            parts.push(`prof(${context.proficiency})`);
        } else if (typeof context[trimmed] === 'number') {
            // Generic named context value (including active-system attribute modifiers)
            total += context[trimmed];
            parts.push(`${trimmed}(${context[trimmed]})`);
        } else if (!isNaN(trimmed)) {
            // Plain number
            const num = parseInt(trimmed);
            total += num;
            parts.push(String(num));
        } else {
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
    const supportedAttributes = [
        ...Object.keys(RULES.attributes.legacyToNew),
        ...Object.values(RULES.attributes.legacyToNew)
    ];
    return {
        ...Object.fromEntries(supportedAttributes.map(key => [key, mods[key] ?? 0])),
        level: character.level || 1,
        proficiency: character.proficiencyBonus || 2
    };
}
