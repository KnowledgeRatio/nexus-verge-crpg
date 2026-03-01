/**
 * EffectDispatcher - Generic ability/spell effect execution system
 *
 * Dispatches on effect.type instead of ability.id, so new abilities
 * with known effect types require zero JS changes — only JSON edits.
 *
 * RULES: No DOM refs. No document access. Stateless.
 */

import { evaluateFormula, buildFormulaContext } from '../utils/formulaEvaluator.js';
import { gameState } from '../core/GameState.js';

// ---------------------------------------------------------------------------
// Handler Registry
// ---------------------------------------------------------------------------

const handlers = {};

/**
 * Register an effect handler
 * @param {string} effectType - Key matching abilities.json effects (e.g. 'heal', 'dodge')
 * @param {Function} handlerFn - async (effectValue, ability, context) => result
 */
export function registerHandler(effectType, handlerFn) {
    handlers[effectType] = handlerFn;
}

// Meta-keys in effects objects that are NOT effect types
const META_KEYS = new Set(['choice', 'options']);

/**
 * Execute all effects in an effects object
 * @param {Object} ability - Full ability definition from abilities.json
 * @param {Object} effects - Keyed by effect type, e.g. { heal: "1d8 + level + con" }
 * @param {Object} context - { character, combatant, combatManager, addMessage, showFloatingText }
 * @returns {Array<{ type: string, result: any }>}
 */
export async function execute(ability, effects, context) {
    const results = [];

    for (const [effectType, effectValue] of Object.entries(effects)) {
        if (META_KEYS.has(effectType)) continue;

        const handler = handlers[effectType];
        if (!handler) {
            console.warn(`EffectDispatcher: no handler for "${effectType}"`);
            context.addMessage(`${ability.name} used! (Effect "${effectType}" not yet implemented)`, 'info');
            results.push({ type: effectType, result: null });
            continue;
        }

        try {
            const result = await handler(effectValue, ability, context);
            results.push({ type: effectType, result });
        } catch (err) {
            console.error(`EffectDispatcher: handler "${effectType}" threw:`, err);
            context.addMessage(`${ability.name}: effect error (${effectType})`, 'error');
            results.push({ type: effectType, result: null });
        }
    }

    return results;
}

/**
 * Execute a single choice option's effects (passthrough to execute)
 * @param {Object} option - Single option from ability.effects.options[]
 * @param {Object} ability - Parent ability definition
 * @param {Object} context
 * @returns {Array<{ type: string, result: any }>}
 */
export async function executeOption(option, ability, context) {
    if (!option.effects || typeof option.effects !== 'object') {
        console.warn(`EffectDispatcher: option "${option.id}" has no effects object`);
        context.addMessage(`${option.name || option.id} has no effects defined`, 'warning');
        return [];
    }
    return execute(ability, option.effects, context);
}

/**
 * Check if any result is deferred (needs target selection before completing)
 * @param {Array} results - From execute()
 * @returns {boolean}
 */
export function isDeferred(results) {
    return results.some(r => r.result?.deferred === true);
}

/**
 * Build the standard context object for dispatch
 * @param {Object} character - From gameState
 * @param {Object} combatant - Live Combatant instance
 * @param {Object} combatManager - CombatManager instance
 * @returns {Object} context
 */
export function buildContext(character, combatant, combatManager) {
    return {
        character,
        combatant,
        combatManager,
        outOfCombat: false,
        addMessage: (msg, type) => gameState.addMessage(msg, type),
        showFloatingText: (id, text, type) => {
            if (window.game?.showFloatingCombatText) {
                window.game.showFloatingCombatText(id, text, type);
            }
        }
    };
}

/**
 * Build a lightweight context for out-of-combat ability/spell use.
 * No combatant or combatManager — effects operate directly on character.
 * @param {Object} character - From gameState
 * @returns {Object} context
 */
export function buildOutOfCombatContext(character) {
    return {
        character,
        combatant: null,
        combatManager: null,
        outOfCombat: true,
        addMessage: (msg, type) => gameState.addMessage(msg, type),
        showFloatingText: () => {} // No floating text outside combat
    };
}

// ---------------------------------------------------------------------------
// Built-in Handlers
// ---------------------------------------------------------------------------

/**
 * extraAction — Grant additional actions (Action Surge)
 * Effect value: number of actions to add (usually 1)
 */
registerHandler('extraAction', (value, ability, ctx) => {
    const count = typeof value === 'number' ? value : 1;
    ctx.combatant.actions.action += count;

    ctx.addMessage(`⚡ ${ability.name}! ${ctx.combatant.name} gains an additional action!`, 'success');
    ctx.showFloatingText(ctx.combatant.id, ability.name.toUpperCase() + '!', 'buff');

    // Re-render combat actions to show updated action count
    const combatState = gameState.get('combat');
    if (combatState && window.game?.renderCombatActions) {
        window.game.renderCombatActions(combatState);
    }

    return { actionsAdded: count };
});

/**
 * heal — Roll healing formula and apply to combatant HP
 * Effect value: formula string like "1d8 + level + con"
 */
registerHandler('heal', (formula, ability, ctx) => {
    const formulaCtx = buildFormulaContext(ctx.character);
    const { total: healAmount, breakdown } = evaluateFormula(formula, formulaCtx);

    let oldHP, actual;

    if (ctx.outOfCombat) {
        // Out of combat: modify character directly
        oldHP = ctx.character.currentHP;
        ctx.character.currentHP = Math.min(ctx.character.maxHP, ctx.character.currentHP + healAmount);
        actual = ctx.character.currentHP - oldHP;
    } else {
        // In combat: modify combatant
        oldHP = ctx.combatant.hp;
        ctx.combatant.hp = Math.min(ctx.combatant.maxHP, ctx.combatant.hp + healAmount);
        actual = ctx.combatant.hp - oldHP;
    }

    ctx.addMessage(`💚 ${ability.name} (Heal): ${ctx.character.name} heals for ${actual} HP! [${breakdown}]`, 'success');
    if (!ctx.outOfCombat) {
        ctx.showFloatingText(ctx.combatant.id, `+${actual} HP`, 'healing');
    }

    return { healing: actual, rolled: healAmount };
});

/**
 * dodge — Apply the Dodging condition (attackers have disadvantage)
 * Effect value: true (boolean flag)
 */
registerHandler('dodge', (value, ability, ctx) => {
    ctx.combatant.addCondition('dodging', 'untilStartOfTurn', ctx.combatant.id, {
        isBuff: true,
        curable: false,
        icon: '🛡️'
    });

    ctx.addMessage(`🛡️ ${ability.name} (Dodge): ${ctx.character.name} takes the Dodge action! Attackers have disadvantage.`, 'info');
    ctx.showFloatingText(ctx.combatant.id, 'DODGING! 🛡️', 'buff');

    return { condition: 'dodging' };
});

/**
 * weapon_attack — Deferred: requires target selection
 * Sets up pending action state; main.js handleTargetClick completes it.
 * Effect value: true (boolean flag)
 */
registerHandler('weapon_attack', (value, ability, ctx) => {
    ctx.addMessage(`⚔️ ${ability.name} (Attack): Select a target to attack`, 'info');

    return { deferred: true, type: 'weapon_attack' };
});
