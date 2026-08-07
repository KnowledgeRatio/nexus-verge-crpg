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
import { RULES } from '../core/rulesEngine.js';
import { getAttributeModifierFor, getBlendedAttributeModifier } from '../utils/attributeResolver.js';
import { getAuraSaveBonus } from './PassiveModifierRegistry.js';

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
 * Check if any result is deferred (needs target selection before completing).
 * Returns the deferred result's `type` field (e.g. 'weapon_attack', 'abilityTargetedSave')
 * so callers can route to the correct follow-up UI state instead of assuming every
 * deferred ability is a weapon attack.
 * @param {Array} results - From execute()
 * @returns {string|boolean} The deferred type, or `true` if a deferred result has no type,
 *   or `false` if nothing is deferred.
 */
export function isDeferred(results) {
    const deferredResult = results.find(r => r.result?.deferred === true);
    if (!deferredResult) {
        return false;
    }
    return deferredResult.result.type ?? true;
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

/**
 * rerollSavingThrow — Indomitable (Dedication L2, both specs): reroll a failed saving
 * throw and use the new result. Called from the 'afterFailedSave' reaction hook
 * (CombatManager.executeSpecialMonsterAction via main.js's promptReaction).
 * Effect value: true (boolean flag)
 *
 * Context must supply ctx.combatant (the reactor whose save is being rerolled) and
 * ctx.saveAbility (the ability/attribute key the failed save used — legacy key or
 * new-system attribute name, same convention as rollDefenderSave below).
 * Returns { newRoll, newTotal } for the caller to recompute pass/fail against saveDC.
 */
registerHandler('rerollSavingThrow', (value, ability, ctx) => {
    const defender = ctx.combatant;
    const saveAbility = ctx.saveAbility;
    const contextKey = RULES.attributes.legacySaveAbilityToContext[saveAbility] ?? `${saveAbility}Save`;
    const mod = getAttributeModifierFor(defender?.character, contextKey);
    const newRoll = Math.floor(Math.random() * 20) + 1;
    const newTotal = newRoll + mod;

    ctx.addMessage(
        `🔁 ${ability.name}! ${defender?.name || ctx.character?.name} rerolls: ${newRoll} + ${mod} = ${newTotal}`,
        'info'
    );

    return { newRoll, newTotal };
});

// ---------------------------------------------------------------------------
// Tactic Handlers (Exemplar specialization — ADR-010 compliant)
// All handlers are keyed by effect type, never by ability name.
// ---------------------------------------------------------------------------

/**
 * Resolve tactic die size from attacker's character level.
 * L3-6: d6, L7-8: d8, L9: d10, L10+: d12 (mirrors Character.getTacticDie)
 * @param {Object} character - Plain character object from gameState
 * @returns {number} die sides
 */
function resolveTacticDieSides(character) {
    const level = character?.level ?? 1;
    if (level >= 10) return 12;
    if (level >= 9)  return 10;
    if (level >= 7)  return 8;
    return 6;
}

/**
 * Roll a tactic die based on attacker character level.
 * @param {Object} character
 * @returns {{ roll: number, sides: number }}
 */
function rollTacticDie(character) {
    const sides = resolveTacticDieSides(character);
    const roll = Math.floor(Math.random() * sides) + 1;
    return { roll, sides };
}

/**
 * Exposed passive (Dedication L3, Exemplar-only, ADR-010: checked via
 * character.selectedAbilities — same convention as other auto-granted passives, not an
 * ability.id branch): a target with an active condition inflicted by one of the
 * attacker's own tactics has disadvantage on its save against the attacker's next
 * tactic. One-shot per triggering use, not a standing aura — see point 3 below.
 * @param {Object} attacker - Combatant
 * @param {Object} defender - Combatant
 * @returns {{ disadvantage: boolean, sourceCondition: Object|null }}
 */
function checkExposedDisadvantage(attacker, defender) {
    const hasExposed = attacker?.character?.selectedTraits?.includes('grace_under_pressure');
    if (!hasExposed) {
        return { disadvantage: false, sourceCondition: null };
    }
    const sourceCondition = defender?.conditions?.find(
        c => c.appliedBy === attacker.id && c.inflictedByTactic && !c.exposedConsumed
    );
    return { disadvantage: !!sourceCondition, sourceCondition: sourceCondition || null };
}

/**
 * Compute tactic save DC for the attacker.
 *
 * Default formula: 8 + proficiency + Prowess modifier (resolver 'meleeAttack' context,
 * 5EClassic mode redirects to STR). Legacy behavior was 8 + proficiency + max(STR mod, DEX
 * mod); dropping the DEX comparison is an accepted 5EClassic-mode approximation under the
 * attribute-remap plan's relaxed fidelity rule — these tactics (Trip/Push/Disarm) are
 * melee-only STR abilities, matching the same simplification as attack-bonus resolution.
 *
 * 'NVSystem'-mode override (ADR-010 compliant, no ability.id branching): if the effect
 * config carries a `dcContext` field (e.g. Menacing Attack's "menacingAttackDC"), and
 * RULES.attributes.system is 'NVSystem', the DC blends the attributes named by that
 * context instead — 8 + proficiency + getBlendedAttributeModifier(character, dcContext).
 * Absent `dcContext`, or in '5EClassic' mode, this is a no-op and the default formula above
 * applies — Trip/Pushing/Disarming Attack have no `dcContext` and are unaffected either way.
 * See docs/plans/2026-07-30-attribute-system-remap.md, decision #5.
 * @param {Object} character - attacker's plain character object
 * @param {Object} [config] - the effect config passed to the calling handler; only
 *   `config.dcContext` is consulted here
 * @returns {number}
 */
function tacticSaveDC(character, config) {
    const prof = character?.proficiencyBonus ?? 2;
    if (RULES.attributes.system === 'NVSystem' && config?.dcContext) {
        return 8 + prof + getBlendedAttributeModifier(character, config.dcContext);
    }
    return 8 + prof + getAttributeModifierFor(character, 'meleeAttack');
}

/**
 * Roll a saving throw for the defender.
 *
 * `saveAbility` (abilities.json's `saveType` field) may be either a legacy ability key
 * ('str' | 'dex' | 'con' | 'int' | 'wis' | 'cha' — resolved via
 * RULES.attributes.legacySaveAbilityToContext) or, since the attribute-system remap
 * (docs/plans/2026-07-30-attribute-system-remap.md, decision #5), a new-system attribute
 * name directly (e.g. "vitality" for Trip/Pushing/Disarming Attack's retargeted save) —
 * matched against derivedStatMap's `${attr}Save` naming convention. Works unchanged in
 * both '5EClassic' and 'NVSystem' mode: the resulting context still resolves through
 * getAttributeModifierFor(), which redirects new-system keys to their legacy source
 * under '5EClassic' mode same as any other context.
 *
 * Explicit-override-beats-derived-default (Bug 3 fix, 2026-08-01): a small number of
 * monsters (zombie, mage) have hand-authored wis/cha save bonuses that don't perfectly
 * match their ability modifier — decision #2's monster-loader shim
 * (`monsterAttributeConversion.js`'s `convertMonsterSavingThrows`) attaches those as
 * `character.savingThrows.{vitality|insight|composure}` plain-number overrides. If one
 * exists for this context's attribute, it wins outright; every other character (including
 * every player character, whose own `character.savingThrows` is a differently-shaped
 * {proficient, bonus} object keyed by legacy ability abbreviations — the `typeof === 'number'`
 * check is what excludes that shape here) falls through to the ability-modifier-derived
 * default, unaffected.
 * `disadvantage` (Exposed passive, ADR-010-generic — set by the calling handler after
 * checkExposedDisadvantage(), never a hardcoded ability-name check here): rolls twice,
 * takes the lower, mirroring the attack-roll disadvantage pattern in
 * CombatManager.attack() (~line 1029).
 * `combatManager` (optional): when supplied, adds Aura of Mercy's flat +1 ally-save bonus
 * via PassiveModifierRegistry.getAuraSaveBonus() — additive, keyed generically off any
 * ally combatant with `selectedTraits.includes('aura_of_mercy')`, not an ability-name check.
 * @param {Object} defender   - Combatant
 * @param {string} saveAbility - legacy ability key or new-system attribute name
 * @param {Object} [options]
 * @param {boolean} [options.disadvantage=false]
 * @param {Object} [options.combatManager=null]
 * @returns {number} total roll
 */
function rollDefenderSave(defender, saveAbility, { disadvantage = false, combatManager = null } = {}) {
    const contextKey = RULES.attributes.legacySaveAbilityToContext[saveAbility] ?? `${saveAbility}Save`;
    const overrideAttrKey = RULES.attributes.derivedStatMap[contextKey]?.attributes?.[0];
    const override = defender.character?.savingThrows?.[overrideAttrKey];
    const baseMod = typeof override === 'number'
        ? override
        : getAttributeModifierFor(defender.character, contextKey);
    const mod = baseMod + (combatManager ? getAuraSaveBonus(combatManager, defender) : 0);

    const rollOnce = () => Math.floor(Math.random() * 20) + 1;
    if (!disadvantage) {
        return rollOnce() + mod;
    }
    const roll1 = rollOnce();
    const roll2 = rollOnce();
    return Math.min(roll1, roll2) + mod;
}

// ---------------------------------------------------------------------------

/**
 * onHitSaveOrCondition — bonus damage + save-or-condition (e.g. Trip Attack, Menacing Attack).
 * Effect config:
 *   bonusDice        {string} "tacticDie"
 *   saveType         {string} ability score for the save ('str' | 'wis' | ...)
 *   condition        {string} condition type to apply on failed save
 *   conditionDuration {string} duration string
 *   conditionIcon    {string} emoji icon
 *   dcContext        {string} optional — derivedStatMap blend context overriding the DC
 *                    formula in 'NVSystem' mode only (see tacticSaveDC())
 *
 * Context must supply ctx.attacker and ctx.defender (injected by CombatManager on-hit path).
 */
registerHandler('onHitSaveOrCondition', (config, ability, ctx) => {
    const attacker = ctx.attacker;
    const defender = ctx.defender;

    if (!attacker || !defender || defender.hp <= 0) {
        return { skipped: true };
    }

    const { roll: dieRoll, sides: dieSides } = rollTacticDie(attacker.character);
    const saveDC  = tacticSaveDC(attacker.character, config);

    // Apply bonus damage
    defender.takeDamage(dieRoll);
    ctx.addMessage(`⚔️ ${ability.name}! +${dieRoll} extra damage (d${dieSides})`, 'success');

    // EXPOSED: disadvantage on this save if the target is already suffering a condition
    // from one of the attacker's own tactics (one-shot, see checkExposedDisadvantage doc)
    const { disadvantage: exposedDisadvantage, sourceCondition: exposedSource } = checkExposedDisadvantage(attacker, defender);
    if (exposedDisadvantage) {
        exposedSource.exposedConsumed = true;
        ctx.addMessage(`🎯 ${defender.name} has disadvantage on this save (Exposed)!`, 'info');
    }

    // Save vs condition
    const saveRoll = rollDefenderSave(defender, config.saveType, { disadvantage: exposedDisadvantage, combatManager: ctx.combatManager });
    const condLabel = config.condition.toUpperCase();
    const icon      = config.conditionIcon ?? '💢';

    if (saveRoll < saveDC) {
        defender.addCondition(
            config.condition,
            config.conditionDuration,
            attacker.id,
            { isBuff: false, curable: false, icon, inflictedByTactic: true }
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
 *   bonusDice        {string} "tacticDie"
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

    const { roll: dieRoll, sides: dieSides } = rollTacticDie(attacker.character);
    const saveDC  = tacticSaveDC(attacker.character, config);

    // Apply bonus damage
    defender.takeDamage(dieRoll);
    ctx.addMessage(`⚔️ ${ability.name}! +${dieRoll} extra damage (d${dieSides})`, 'success');

    // EXPOSED: disadvantage on this save if the target is already suffering a condition
    // from one of the attacker's own tactics (one-shot, see checkExposedDisadvantage doc)
    const { disadvantage: exposedDisadvantage, sourceCondition: exposedSource } = checkExposedDisadvantage(attacker, defender);
    if (exposedDisadvantage) {
        exposedSource.exposedConsumed = true;
        ctx.addMessage(`🎯 ${defender.name} has disadvantage on this save (Exposed)!`, 'info');
    }

    // Save vs condition
    const saveRoll = rollDefenderSave(defender, config.saveType, { disadvantage: exposedDisadvantage, combatManager: ctx.combatManager });
    const condLabel = config.condition.toUpperCase();
    const icon      = config.conditionIcon ?? '💢';

    if (saveRoll < saveDC) {
        const condOpts = {
            isBuff: false,
            curable: false,
            icon,
            inflictedByTactic: true,
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
 * onHitPush — bonus damage + save or apply 'pushed' condition (Pushing Attack).
 * Effect config:
 *   bonusDice        {string} "tacticDie"
 *   saveType         {string} ability score for the save, default 'str' if omitted
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

    const { roll: dieRoll, sides: dieSides } = rollTacticDie(attacker.character);
    const saveDC  = tacticSaveDC(attacker.character, config);

    // Apply bonus damage
    defender.takeDamage(dieRoll);
    ctx.addMessage(`⚔️ ${ability.name}! +${dieRoll} extra damage (d${dieSides})`, 'success');

    // EXPOSED: disadvantage on this save if the target is already suffering a condition
    // from one of the attacker's own tactics (one-shot, see checkExposedDisadvantage doc)
    const { disadvantage: exposedDisadvantage, sourceCondition: exposedSource } = checkExposedDisadvantage(attacker, defender);
    if (exposedDisadvantage) {
        exposedSource.exposedConsumed = true;
        ctx.addMessage(`🎯 ${defender.name} has disadvantage on this save (Exposed)!`, 'info');
    }

    // Save (config.saveType, default 'str' for backward compatibility) or pushed
    const saveType = config.saveType ?? 'str';
    const saveRoll = rollDefenderSave(defender, saveType, { disadvantage: exposedDisadvantage, combatManager: ctx.combatManager });
    const saveLabel = saveType.toUpperCase();

    if (saveRoll < saveDC) {
        defender.addCondition(
            config.condition ?? 'pushed',
            config.conditionDuration ?? 'untilEndOfTurn',
            attacker.id,
            { isBuff: false, curable: false, icon: '💨', inflictedByTactic: true }
        );
        ctx.addMessage(
            `💨 ${defender.name} is PUSHED back! (${saveLabel} save ${saveRoll} vs DC ${saveDC})`,
            'warning'
        );
        ctx.showFloatingText(defender.id, 'PUSHED! 💨', 'condition');
    } else {
        ctx.addMessage(
            `${defender.name} resists being pushed (${saveLabel} save ${saveRoll} vs DC ${saveDC})`,
            'info'
        );
    }

    return { dieRoll, saveDC, saveRoll, conditionApplied: saveRoll < saveDC };
});

/**
 * selfTempHP — Grant temporary HP equal to tactic die + CON mod (Rally).
 * Effect config:
 *   dice   {string} "tacticDie"
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

    const { roll: dieRoll, sides: dieSides } = rollTacticDie(character);
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
 * allyTempHP — Grant temporary HP equal to tactic die + CON mod to an engaged ally
 * (Rally's ally option). Effect config:
 *   dice   {string} "tacticDie"
 *   bonus  {string} "conMod"
 *
 * Scope note: no multi-ally target picker exists in this codebase yet (ADR-000 — not
 * building one speculatively). Minimal behavior: targets one companion combatant that is
 * currently engaged in melee (`engagedWith.size > 0`), matching the description's "an
 * ally you are engaged alongside." If no such ally exists, the effect no-ops with a
 * message instead of silently doing nothing.
 * Context: ctx.combatant, ctx.character, ctx.combatManager required.
 */
registerHandler('allyTempHP', (config, ability, ctx) => {
    const character = ctx.character;
    const combatant = ctx.combatant;
    const combatManager = ctx.combatManager;

    if (!combatant || !combatManager) {
        return { skipped: true };
    }

    const ally = (combatManager.companionCombatants || []).find(c => c.hp > 0 && c.engagedWith.size > 0);
    if (!ally) {
        ctx.addMessage(`${ability.name}: No engaged ally to target.`, 'info');
        return { skipped: true, reason: 'noAlly' };
    }

    const { roll: dieRoll, sides: dieSides } = rollTacticDie(character);
    const conMod = character?.abilityModifiers?.con ?? 0;
    const tempHP = Math.max(1, dieRoll + conMod);

    ally.addCondition('tempHP', 'combat', combatant.id, {
        value: tempHP,
        isBuff: true,
        curable: false,
        icon: '✨'
    });

    // Consume bonus action
    combatant.actions.bonusAction = Math.max(0, (combatant.actions.bonusAction ?? 1) - 1);

    ctx.addMessage(
        `⚡ ${ability.name}! ${ally.name} gains ${tempHP} temporary HP (d${dieSides}: ${dieRoll} + CON ${conMod})`,
        'success'
    );
    ctx.showFloatingText(ally.id, `+${tempHP} THP ✨`, 'buff');

    return { tempHP, dieRoll, dieSides, allyId: ally.id };
});

/**
 * precisionAttackBonus — Add tactic die to attack roll (Precision Strike).
 * Effect config:
 *   dice   {string} "tacticDie"
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

    const { roll: dieRoll, sides: dieSides } = rollTacticDie(character);

    ctx.addMessage(`⚔️ ${ability.name}! +${dieRoll} to attack roll (d${dieSides})`, 'success');

    return { bonus: dieRoll, dieRoll, dieSides };
});

/**
 * reactionAttack — Counter-attack on enemy miss (Riposte).
 * Effect config:
 *   bonusDice {string} "tacticDie"
 *   trigger   {string} "enemyMissesMelee"
 *
 * Execution is handled inline by main.js promptReaction (it calls cm.attack with extraDamage).
 * This handler returns the bonus roll for the caller to use as extraDamage.
 * Context: ctx.combatant (the reactor) required.
 */
registerHandler('reactionAttack', (config, ability, ctx) => {
    // Reprisal reuses this handler but omits bonusDice (config: { trigger: "allyHit" }) —
    // it's a plain counter-attack with no maneuver-die bonus damage, unlike Riposte.
    if (!config.bonusDice) {
        return { bonus: 0 };
    }

    const character = ctx.character;

    const { roll: dieRoll, sides: dieSides } = rollTacticDie(character);

    ctx.addMessage(
        `⚔️ ${ability.name}! +${dieRoll} bonus damage on counter-attack (d${dieSides})`,
        'success'
    );

    return { bonus: dieRoll, dieRoll, dieSides };
});

/**
 * reactionDamageReduction — Reduce incoming damage by tactic die + CON mod (Parry).
 * Effect config:
 *   reductionDice  {string} "tacticDie"
 *   reductionBonus {string} "conMod"
 *
 * Execution is handled inline by main.js promptReaction (it returns damageReduction).
 * This handler computes and returns the reduction for the caller.
 * Context: ctx.combatant (the reactor) required.
 */
registerHandler('reactionDamageReduction', (config, ability, ctx) => {
    const character = ctx.character;

    const { roll: dieRoll, sides: dieSides } = rollTacticDie(character);
    const conMod    = character?.abilityModifiers?.con ?? 0;
    const reduction = Math.max(0, dieRoll + conMod);

    ctx.addMessage(
        `🛡️ ${ability.name}! Reduces incoming damage by ${dieRoll}+${conMod}=${reduction} (d${dieSides})`,
        'success'
    );

    return { damageReduction: reduction, dieRoll, dieSides };
});

// ---------------------------------------------------------------------------
// Vow Handlers (Oath specialization — ADR-010 compliant, keyed by effect type)
// ---------------------------------------------------------------------------

/**
 * targetedSaveOrCondition — target makes a saving throw (no attack roll) or suffers a
 * condition, optionally starting concentration (Challenge). Effect config:
 *   saveType      {string} new-system attribute name or legacy key (e.g. "composure")
 *   dcContext     {string} derivedStatMap blend context for the DC (e.g. "challengeDC")
 *   condition     {string} condition type applied on a failed save
 *   concentration {boolean} true — attacker starts concentrating on this ability vs the target
 *   conditionIcon {string}
 *
 * Deferred until a target is chosen: when `ctx.defender` is absent this returns
 * `{ deferred: true, type: 'abilityTargetedSave' }` (mirrors weapon_attack's deferred
 * pattern) rather than rolling anything. The actual save/condition only happens once a
 * caller re-invokes this handler with `ctx.defender` populated.
 * Context must supply ctx.attacker (the caster's combatant) once resolved.
 */
registerHandler('targetedSaveOrCondition', (config, ability, ctx) => {
    if (!ctx.defender) {
        return { deferred: true, type: 'abilityTargetedSave' };
    }

    const attacker = ctx.attacker;
    const defender = ctx.defender;
    if (!attacker) {
        return { skipped: true };
    }

    const prof = attacker.character?.proficiencyBonus ?? 2;
    const dc = 8 + prof + getBlendedAttributeModifier(attacker.character, config.dcContext);
    const saveRoll = rollDefenderSave(defender, config.saveType, { combatManager: ctx.combatManager });
    const icon = config.conditionIcon ?? '💢';
    const conditionApplied = saveRoll < dc;

    if (conditionApplied) {
        defender.addCondition(config.condition, 'combat', attacker.id, { isBuff: false, curable: true, icon });
        if (config.concentration) {
            attacker.concentratingOn = { abilityId: ability.id, targetId: defender.id };
        }
        ctx.addMessage(
            `${icon} ${defender.name} is ${config.condition.toUpperCase()}! (${config.saveType.toUpperCase()} save ${saveRoll} vs DC ${dc})`,
            'warning'
        );
        ctx.showFloatingText(defender.id, `${config.condition.toUpperCase()}! ${icon}`, 'condition');
    } else {
        ctx.addMessage(
            `${defender.name} resists ${config.condition} (${config.saveType.toUpperCase()} save ${saveRoll} vs DC ${dc})`,
            'info'
        );
    }

    return { dc, saveRoll, conditionApplied };
});

/**
 * grantCondition — apply a buff condition to an engaged ally (Bolster). Effect config:
 *   condition {string} condition type, e.g. "inspired"
 *   duration  {string} condition duration
 *   isBuff    {boolean} defaults true
 *   icon      {string}
 *
 * Scope note (matches allyTempHP's documented limitation): no multi-ally target picker
 * exists yet — targets the first engaged companion combatant.
 * Context: ctx.combatant, ctx.combatManager required.
 */
registerHandler('grantCondition', (config, ability, ctx) => {
    const combatant = ctx.combatant;
    const combatManager = ctx.combatManager;

    const ally = (combatManager?.companionCombatants || []).find(c => c.hp > 0 && c.engagedWith.size > 0);
    if (!ally) {
        ctx.addMessage(`${ability.name}: No engaged ally to target.`, 'info');
        return { skipped: true, reason: 'noAlly' };
    }

    ally.addCondition(config.condition, config.duration, combatant?.id ?? ally.id, {
        isBuff: config.isBuff ?? true,
        curable: false,
        icon: config.icon ?? '✨'
    });

    ctx.addMessage(`✨ ${ability.name}! ${ally.name} is ${config.condition}!`, 'success');
    ctx.showFloatingText(ally.id, `${config.condition.toUpperCase()}! ✨`, 'buff');

    return { allyId: ally.id, condition: config.condition };
});

/**
 * variableCostDamageRedirect — Intervene: rolls damageFormula per Resolve point spent,
 * caps the result at the hit's original damage, and returns it as both the damage
 * reduction to apply to the ally and the amount to redirect onto the caster.
 * Effect config:
 *   damageFormula {string} dice formula per Resolve point, e.g. "1d8"
 *
 * Context must supply ctx.resolveSpent (number, injected by the reaction UI's resolve-spend
 * sub-picker) and ctx.originalDamage (the incoming hit's damage against the ally).
 */
registerHandler('variableCostDamageRedirect', (config, ability, ctx) => {
    const resolveSpent = ctx.resolveSpent ?? 0;
    if (resolveSpent <= 0) {
        return { skipped: true };
    }

    const originalDamage = ctx.originalDamage ?? 0;
    let rolled = 0;
    for (let i = 0; i < resolveSpent; i++) {
        const { total } = evaluateFormula(config.damageFormula, buildFormulaContext(ctx.character));
        rolled += total;
    }
    const reduction = Math.min(originalDamage, rolled);

    ctx.addMessage(
        `🛡️ ${ability.name}! ${ctx.combatant?.name || ctx.character?.name} spends ${resolveSpent} Resolve — redirects ${reduction} damage!`,
        'success'
    );

    return { damageReduction: reduction, redirectAmount: reduction, resolveSpent, rolled };
});
