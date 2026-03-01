# Architect Memory

## Key Patterns Confirmed
- **useAbility() in main.js** is the execution layer for abilities; data layer (abilities.json) and UI layer (showAbilitySelection, renderAbilityOption, canUseAbility) are already generic
- **Combatant state** is transient (combat-only); character.abilityUses persists through save/load
- **CombatManager.playerCombatant** is the live combatant; has `.actions`, `.hasAction()`, `.consumeAction()`
- **Conditions system** already exists on combatants: `addCondition(type, duration, appliedBy, options)`
- **Combat state sync** pattern: `gameState.set('combat', { active, round, currentTurn, combatants: [...toJSON()] })`

## Architectural Decisions
- **EffectDispatcher (designed 2026-02-27):** Dispatch table keyed on effect TYPE not ability ID. File: `src/systems/EffectDispatcher.js`. Exports: dispatchEffect(), dispatchChoiceOption(), registerEffectHandler(). No new gameState paths. No save/load impact.
- **Reactive abilities** (Uncanny Dodge, Indomitable) use `combatant._abilityFlags` -- CombatManager must check these during damage/save resolution. Not yet implemented in CombatManager.

## Data Schemas
- abilities.json effects object keys serve as implicit effect types: extraAction, choice, healing, dodge, attacks, rerollSavingThrow, damageMitigation, inspirationDie, recoverSlotLevels, bonus
- Formula strings like "1d8 + level + con" used for healing/damage; parsed by evaluateFormula()

## Red Flags to Watch
- Any new `if (ability.id === '...')` branches in main.js -- should use EffectDispatcher instead
- Hardcoded ability names/descriptions in JS instead of reading from abilities.json
- CSS class names referencing specific abilities (e.g., `steadyNerveModal`) instead of generic names
