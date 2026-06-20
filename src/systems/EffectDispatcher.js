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
    // -----------------------------------------------------------------------
    // PRE-DISPATCH RESOLVE GATE
    // Runs once before any handler fires. Handlers are pure effect code —
    // they never read or write resolvePoints.
    //
    // Only fires when ability.resourceType === 'resolve'.
    // Skips entirely for 'shortRest', 'longRest', or other resource types.
    // -----------------------------------------------------------------------
    if (ability?.resourceType === 'resolve') {
        const cost = context.resolveSpent ?? (typeof ability.resolveCost === 'number' ? ability.resolveCost : 1);
        const current = context.character?.resolvePoints ?? 0;
        if (current < cost) {
            context.addMessage?.(`Not enough Resolve! (need ${cost}, have ${current})`, 'error');
            return [{ type: '_resolveGate', result: { skipped: true } }];
        }
        context.character.resolvePoints = Math.max(0, current - cost);
        gameState.set('character', context.character);
    }

    const results = [];

    for (const [effectType, effectValue] of Object.entries(effects)) {
        if (META_KEYS.has(effectType)) {
            continue;
        }

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
    ctx.showFloatingText(ctx.combatant.id, `${ability.name.toUpperCase()  }!`, 'buff');

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

/**
 * variableCostDamage — Variable Resolve spend: rolls damageFormula per point spent.
 * Used for on-hit post-prompt abilities (Sworn Strike and any future equivalent).
 *
 * Effect value object (from abilities.json effects.variableCostDamage):
 *   damageFormula   {string} Dice formula per Resolve point, e.g. "1d8"
 *   damageType      {string} e.g. "radiant"
 *   bonusVsCreatureTypes {string[]} Optional — adds bonusDice extra dice if defender matches
 *   bonusDice       {string} Extra dice formula for bonus targets, e.g. "1d8"
 *   trigger         {string} "onHit" — this handler only runs post-hit, invoked by CombatManager
 *   rangeType       {string} "melee" — only fires on melee hits
 *
 * Context must include ctx.resolveSpent (number) and ctx.defender (Combatant).
 * Returns { damage, resolveSpent } or { skipped: true }.
 */
registerHandler('variableCostDamage', async (config, ability, ctx) => {
    // This handler is only called from the post-hit path in CombatManager
    // (ctx.resolveSpent and ctx.defender are injected by CombatManager, not standard fields)
    const resolveSpent = ctx.resolveSpent ?? 0;
    if (resolveSpent <= 0) {
        return { skipped: true };
    }

    const defender = ctx.defender;
    if (!defender || defender.hp <= 0) {
        return { skipped: true };
    }

    const isMatchingType = Array.isArray(config.bonusVsCreatureTypes)
        && config.bonusVsCreatureTypes.includes(defender.character?.type);
    const dieCnt = resolveSpent + (isMatchingType ? 1 : 0);

    // Roll damageFormula dieCnt times
    let totalDamage = 0;
    for (let i = 0; i < dieCnt; i++) {
        const { total } = evaluateFormula(config.damageFormula, buildFormulaContext(ctx.character));
        totalDamage += total;
    }

    const bonusNote = isMatchingType ? ` (bonus die vs ${defender.character?.type})` : '';
    ctx.addMessage(
        `✨ ${ability.name}! ${ctx.combatant?.name || 'Attacker'} spends ${resolveSpent} Resolve — ${totalDamage} ${config.damageType || ''} damage!${bonusNote}`,
        'success'
    );
    defender.takeDamage(totalDamage);
    ctx.showFloatingText(defender.id, `✨ ${totalDamage}`, 'buff');

    return { damage: totalDamage, resolveSpent };
});

/**
 * variableCostHeal — Variable Resolve spend: evaluates formula with resolveCost injected.
 * Used for Aid the Vulnerable (heal option) and any future variable-cost heals.
 *
 * Effect value object (from abilities.json effects.variableCostHeal):
 *   formula  {string} Formula using resolveCost, conMod, level — e.g. "resolveCost * conMod + level"
 *
 * Context must include ctx.resolveSpent (injected by showAbilityChoices path or variableCost dispatch).
 * Applies healing to combatant.hp and character.currentHP.
 * Returns { healing, resolveSpent }.
 */
registerHandler('variableCostHeal', async (config, ability, ctx) => {
    const resolveSpent = ctx.resolveSpent ?? 1;
    const character = ctx.character;

    const conMod = character.abilityModifiers?.con ?? 0;
    const level = character.level ?? 1;

    // Evaluate formula with resolveCost, conMod, and level substituted
    const rawFormula = config.formula || 'resolveCost * conMod + level';
    // Substitute named variables (longest-first to prevent substring collisions)
    const vars = [
        ['resolveCost', resolveSpent],
        ['conMod', conMod],
        ['level', level]
    ].sort((a, b) => b[0].length - a[0].length);

    let formula = rawFormula;
    for (const [varName, value] of vars) {
        formula = formula.split(varName).join(String(value));
    }

    // Now evaluate the substituted arithmetic expression (only + and * allowed in these formulas)
    let healAmount = 0;
    try {
        // eslint-disable-next-line no-new-func
        healAmount = Math.max(0, Math.floor(Function(`"use strict"; return (${formula})`)()));
    } catch (e) {
        console.warn('variableCostHeal: formula evaluation error', formula, e);
        healAmount = resolveSpent * Math.max(1, conMod) + level;
    }

    let actual = 0;
    if (ctx.outOfCombat) {
        const oldHP = character.currentHP;
        character.currentHP = Math.min(character.maxHP, character.currentHP + healAmount);
        actual = character.currentHP - oldHP;
    } else {
        const combatant = ctx.combatant;
        const oldHP = combatant.hp;
        combatant.hp = Math.min(combatant.maxHP, combatant.hp + healAmount);
        actual = combatant.hp - oldHP;
        character.currentHP = combatant.hp;
    }

    gameState.set('character', character);

    ctx.addMessage(
        `🤝 ${ability.name} (Heal): ${character.name} heals for ${actual} HP [${resolveSpent} Resolve]`,
        'success'
    );
    if (!ctx.outOfCombat && ctx.combatant) {
        ctx.showFloatingText(ctx.combatant.id, `+${actual} HP`, 'healing');
    }

    return { healing: actual, resolveSpent };
});

/**
 * cureCondition — Remove one or more curable conditions from the caster's combatant.
 * Effect value object:
 *   count  {number} How many conditions to remove (default 1)
 *
 * Context must include ctx.resolveSpent (for the fixed-cost cure path — injected externally).
 * Returns { removed: string[] }.
 */
registerHandler('cureCondition', async (config, ability, ctx) => {
    const count = config.count ?? 1;
    const character = ctx.character;

    let removed = [];
    if (ctx.outOfCombat) {
        // Out of combat: no combatant — nothing to cure (conditions are combat-only currently)
        ctx.addMessage(`🤝 ${ability.name}: No active conditions to cure outside of combat.`, 'info');
    } else {
        const combatant = ctx.combatant;
        const curableDebuffs = combatant.conditions?.filter(c => !c.isBuff && c.curable) || [];
        const toRemove = curableDebuffs.slice(0, count);

        for (const cond of toRemove) {
            const ok = combatant.removeCondition(cond.type, false);
            if (ok) {
                removed.push(cond.type);
            }
        }

        if (removed.length > 0) {
            gameState.set('character', character);
            ctx.addMessage(
                `🤝 ${ability.name} (Cure): Removed ${removed.join(', ')}`,
                'success'
            );
        } else {
            ctx.addMessage(`🤝 ${ability.name}: No curable conditions to remove.`, 'info');
        }
    }

    return { removed };
});

// ---------------------------------------------------------------------------
// Maneuver Handlers (Exemplar specialization — ADR-010 compliant)
// All handlers are keyed by effect type, never by ability name.
// ---------------------------------------------------------------------------

/**
 * Resolve maneuver die size from attacker's character level.
 * L3-6: d6, L7-9: d8, L10+: d10 (mirrors Character.getManeuverDie)
 * @param {Object} character - Plain character object from gameState
 * @returns {number} die sides
 */
function resolveManeuverDieSides(character) {
    const level = character?.level ?? 1;
    if (level >= 10) return 10;
    if (level >= 7)  return 8;
    return 6;
}

/**
 * Roll a maneuver die based on attacker character level.
 * @param {Object} character
 * @returns {{ roll: number, sides: number }}
 */
function rollManeuverDie(character) {
    const sides = resolveManeuverDieSides(character);
    const roll = Math.floor(Math.random() * sides) + 1;
    return { roll, sides };
}

/**
 * Compute maneuver save DC for the attacker.
 * Formula: 8 + proficiency + max(STR mod, DEX mod)
 * @param {Object} character - attacker's plain character object
 * @returns {number}
 */
function maneuverSaveDC(character) {
    const strMod = character?.abilityModifiers?.str ?? 0;
    const dexMod = character?.abilityModifiers?.dex ?? 0;
    const prof   = character?.proficiencyBonus ?? 2;
    return 8 + prof + Math.max(strMod, dexMod);
}

/**
 * Roll a saving throw for the defender.
 * @param {Object} defender   - Combatant
 * @param {string} saveAbility - 'str' | 'wis' | 'dex' | 'con' | 'int' | 'cha'
 * @returns {number} total roll
 */
function rollDefenderSave(defender, saveAbility) {
    const mod = defender.character?.abilityModifiers?.[saveAbility] ?? 0;
    return Math.floor(Math.random() * 20) + 1 + mod;
}

// ---------------------------------------------------------------------------

/**
 * onHitSaveOrCondition — bonus damage + save-or-condition (e.g. Trip Attack, Menacing Attack).
 * Effect config:
 *   bonusDice        {string} "maneuverDie"
 *   saveType         {string} ability score for the save ('str' | 'wis' | ...)
 *   condition        {string} condition type to apply on failed save
 *   conditionDuration {string} duration string
 *   conditionIcon    {string} emoji icon
 *
 * Context must supply ctx.attacker and ctx.defender (injected by CombatManager on-hit path).
 */
registerHandler('onHitSaveOrCondition', (config, ability, ctx) => {
    const attacker = ctx.attacker;
    const defender = ctx.defender;

    if (!attacker || !defender || defender.hp <= 0) {
        return { skipped: true };
    }

    const { roll: dieRoll, sides: dieSides } = rollManeuverDie(attacker.character);
    const saveDC  = maneuverSaveDC(attacker.character);

    // Apply bonus damage
    defender.takeDamage(dieRoll);
    ctx.addMessage(`⚔️ ${ability.name}! +${dieRoll} extra damage (d${dieSides})`, 'success');

    // Save vs condition
    const saveRoll = rollDefenderSave(defender, config.saveType);
    const condLabel = config.condition.toUpperCase();
    const icon      = config.conditionIcon ?? '💢';

    if (saveRoll < saveDC) {
        defender.addCondition(
            config.condition,
            config.conditionDuration,
            attacker.id,
            { isBuff: false, curable: false, icon }
        );
        ctx.addMessage(
            `${icon} ${defender.name} is ${condLabel}! (${config.saveType.toUpperCase()} save ${saveRoll} vs DC ${saveDC})`,
            'warning'
        );
        ctx.showFloatingText(defender.id, `${condLabel}! ${icon}`, 'condition');
    } else {
        ctx.addMessage(
            `${defender.name} resists ${config.condition} (${config.saveType.toUpperCase()} save ${saveRoll} vs DC ${saveDC})`,
            'info'
        );
    }

    return { dieRoll, saveDC, saveRoll, conditionApplied: saveRoll < saveDC };
});

/**
 * onHitCondition — bonus damage + save-or-condition with an optional value on the condition
 * (e.g. Disarming Attack applies conditionValue: -2 to attack rolls).
 * Effect config:
 *   bonusDice        {string} "maneuverDie"
 *   saveType         {string} ability score for the save
 *   condition        {string} condition type
 *   conditionDuration {string}
 *   conditionIcon    {string}
 *   conditionValue   {number} optional — stored as condition.value
 *
 * Context must supply ctx.attacker and ctx.defender.
 */
registerHandler('onHitCondition', (config, ability, ctx) => {
    const attacker = ctx.attacker;
    const defender = ctx.defender;

    if (!attacker || !defender || defender.hp <= 0) {
        return { skipped: true };
    }

    const { roll: dieRoll, sides: dieSides } = rollManeuverDie(attacker.character);
    const saveDC  = maneuverSaveDC(attacker.character);

    // Apply bonus damage
    defender.takeDamage(dieRoll);
    ctx.addMessage(`⚔️ ${ability.name}! +${dieRoll} extra damage (d${dieSides})`, 'success');

    // Save vs condition
    const saveRoll = rollDefenderSave(defender, config.saveType);
    const condLabel = config.condition.toUpperCase();
    const icon      = config.conditionIcon ?? '💢';

    if (saveRoll < saveDC) {
        const condOpts = {
            isBuff: false,
            curable: false,
            icon,
            ...(config.conditionValue !== undefined && { value: config.conditionValue })
        };
        defender.addCondition(config.condition, config.conditionDuration, attacker.id, condOpts);
        ctx.addMessage(
            `${icon} ${defender.name} is ${condLabel}! (${config.saveType.toUpperCase()} save ${saveRoll} vs DC ${saveDC})`,
            'warning'
        );
        ctx.showFloatingText(defender.id, `${condLabel}! ${icon}`, 'condition');
    } else {
        ctx.addMessage(
            `${defender.name} resists ${config.condition} (${config.saveType.toUpperCase()} save ${saveRoll} vs DC ${saveDC})`,
            'info'
        );
    }

    return { dieRoll, saveDC, saveRoll, conditionApplied: saveRoll < saveDC };
});

/**
 * onHitPush — bonus damage + STR save or apply 'pushed' condition (Pushing Attack).
 * Effect config:
 *   bonusDice        {string} "maneuverDie"
 *   saveType         {string} 'str'
 *   condition        {string} 'pushed'
 *   conditionDuration {string} 'untilEndOfTurn'
 *
 * Context must supply ctx.attacker and ctx.defender.
 */
registerHandler('onHitPush', (config, ability, ctx) => {
    const attacker = ctx.attacker;
    const defender = ctx.defender;

    if (!attacker || !defender || defender.hp <= 0) {
        return { skipped: true };
    }

    const { roll: dieRoll, sides: dieSides } = rollManeuverDie(attacker.character);
    const saveDC  = maneuverSaveDC(attacker.character);

    // Apply bonus damage
    defender.takeDamage(dieRoll);
    ctx.addMessage(`⚔️ ${ability.name}! +${dieRoll} extra damage (d${dieSides})`, 'success');

    // STR save or pushed
    const saveRoll = rollDefenderSave(defender, config.saveType ?? 'str');

    if (saveRoll < saveDC) {
        defender.addCondition(
            config.condition ?? 'pushed',
            config.conditionDuration ?? 'untilEndOfTurn',
            attacker.id,
            { isBuff: false, curable: false, icon: '💨' }
        );
        ctx.addMessage(
            `💨 ${defender.name} is PUSHED back! (STR save ${saveRoll} vs DC ${saveDC})`,
            'warning'
        );
        ctx.showFloatingText(defender.id, 'PUSHED! 💨', 'condition');
    } else {
        ctx.addMessage(
            `${defender.name} resists being pushed (STR save ${saveRoll} vs DC ${saveDC})`,
            'info'
        );
    }

    return { dieRoll, saveDC, saveRoll, conditionApplied: saveRoll < saveDC };
});

/**
 * selfTempHP — Grant temporary HP equal to maneuver die + CON mod (Rally).
 * Effect config:
 *   dice   {string} "maneuverDie"
 *   bonus  {string} "conMod"
 *
 * Spends 1 Resolve and consumes Bonus Action (caller already validated availability).
 * Context: ctx.combatant and ctx.character required.
 */
registerHandler('selfTempHP', (config, ability, ctx) => {
    const character = ctx.character;
    const combatant = ctx.combatant;

    if (!combatant) {
        return { skipped: true };
    }

    const { roll: dieRoll, sides: dieSides } = rollManeuverDie(character);
    const conMod = character?.abilityModifiers?.con ?? 0;
    const tempHP = Math.max(1, dieRoll + conMod);

    combatant.addCondition('tempHP', 'combat', combatant.id, {
        value: tempHP,
        isBuff: true,
        curable: false,
        icon: '✨'
    });

    // Consume bonus action
    combatant.actions.bonusAction = Math.max(0, (combatant.actions.bonusAction ?? 1) - 1);

    ctx.addMessage(
        `⚡ ${ability.name}! Gained ${tempHP} temporary HP (d${dieSides}: ${dieRoll} + CON ${conMod})`,
        'success'
    );
    ctx.showFloatingText(combatant.id, `+${tempHP} THP ✨`, 'buff');

    return { tempHP, dieRoll, dieSides };
});

/**
 * precisionAttackBonus — Add maneuver die to attack roll (Precision Strike).
 * Effect config:
 *   dice   {string} "maneuverDie"
 *   timing {string} "beforeAttack"
 *
 * This handler is called from the attack() beforeAttack path.
 * Returns { bonus } so caller can add it to the attack total.
 * Context: ctx.attacker required.
 */
registerHandler('precisionAttackBonus', (config, ability, ctx) => {
    const attacker = ctx.attacker;
    const character = ctx.character;

    if (!attacker) {
        return { bonus: 0 };
    }

    const { roll: dieRoll, sides: dieSides } = rollManeuverDie(character);

    ctx.addMessage(`⚔️ ${ability.name}! +${dieRoll} to attack roll (d${dieSides})`, 'success');

    return { bonus: dieRoll, dieRoll, dieSides };
});

/**
 * reactionAttack — Counter-attack on enemy miss (Riposte).
 * Effect config:
 *   bonusDice {string} "maneuverDie"
 *   trigger   {string} "enemyMissesMelee"
 *
 * Execution is handled inline by main.js promptReaction (it calls cm.attack with extraDamage).
 * This handler returns the bonus roll for the caller to use as extraDamage.
 * Context: ctx.combatant (the reactor) required.
 */
registerHandler('reactionAttack', (config, ability, ctx) => {
    const character = ctx.character;

    const { roll: dieRoll, sides: dieSides } = rollManeuverDie(character);

    ctx.addMessage(
        `⚔️ ${ability.name}! +${dieRoll} bonus damage on counter-attack (d${dieSides})`,
        'success'
    );

    return { bonus: dieRoll, dieRoll, dieSides };
});

/**
 * reactionDamageReduction — Reduce incoming damage by maneuver die + CON mod (Parry).
 * Effect config:
 *   reductionDice  {string} "maneuverDie"
 *   reductionBonus {string} "conMod"
 *
 * Execution is handled inline by main.js promptReaction (it returns damageReduction).
 * This handler computes and returns the reduction for the caller.
 * Context: ctx.combatant (the reactor) required.
 */
registerHandler('reactionDamageReduction', (config, ability, ctx) => {
    const character = ctx.character;

    const { roll: dieRoll, sides: dieSides } = rollManeuverDie(character);
    const conMod    = character?.abilityModifiers?.con ?? 0;
    const reduction = Math.max(0, dieRoll + conMod);

    ctx.addMessage(
        `🛡️ ${ability.name}! Reduces incoming damage by ${dieRoll}+${conMod}=${reduction} (d${dieSides})`,
        'success'
    );

    return { damageReduction: reduction, dieRoll, dieSides };
});
