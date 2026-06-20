# Proposed Pattern: EffectDispatcher

## Problem
Each ability/spell requires new if/else branches in main.js.
Abilities and spells share the same effect vocabulary but have no shared execution layer.

## Proposed Solution
```javascript
// src/systems/EffectDispatcher.js
const EFFECT_HANDLERS = {
    extraAction: (ctx) => { ctx.combatant.actions.action += ctx.value; },
    healing: (ctx) => { /* parse formula, apply to combatant */ },
    dodge: (ctx) => { ctx.combatant.addCondition('dodging', 'untilStartOfTurn', ...); },
    weapon_attack: (ctx) => { /* set selectedAction, await target pick */ },
    damage: (ctx) => { /* roll dice, apply to target */ },
    // etc.
};

// Generic choice handler (not per-ability)
function showAbilityChoices(ability, character) {
    // Render ability.effects.options generically
    // On selection, dispatch through EFFECT_HANDLERS
}

// Unified dispatch for abilities AND spells
function executeEffect(effectType, value, context) {
    const handler = EFFECT_HANDLERS[effectType];
    if (handler) handler({ ...context, value });
}
```

## Benefits
- Adding new ability: edit abilities.json only (0 JS changes)
- Adding new spell: edit spells.json only (0 JS changes)
- Adding new effect TYPE: one handler function (~5-10 lines)
- Abilities and spells share execution layer
- Choice-based abilities use generic `showAbilityChoices()` not `showSteadyNerveChoices()`

## Review Findings (2026-02-27)

### Critical: Normalize option schemas in abilities.json
Options currently use inconsistent formats (`"healing": "..."` vs `"effect": "dodge"`).
Fix: give each option an `"effects": {}` block matching top-level ability format.
This eliminates the option-to-effects mapping if-chain entirely.

### Critical: Deferred pattern needs explicit PendingAction
Magic strings (`selectedAction = 'abilityWeaponAttack'`) and `_pending*` fields are
implicit state machines. Replace with explicit `pendingAction` object:
```javascript
this.pendingAction = {
    type: 'abilityWeaponAttack',
    ability, actionCost, onComplete, onCancel
};
```
Clear on: combat end, turn end, modal close, ESC.

### Important: Scope to abilities only initially
Spell schemas have attackType, savingThrow, concentration, areaOfEffect, upcast --
none handled by the 5 MVP handlers. Don't design around speculative spell compat.

### Important: Action economy belongs in the dispatcher
Handlers should not consume actions. Dispatcher manages economy based on handler
return value `{ deferred: true/false }`.

### Minor: Restrict gameRef access
Pass a limited API object to handlers, not the entire Game class.
