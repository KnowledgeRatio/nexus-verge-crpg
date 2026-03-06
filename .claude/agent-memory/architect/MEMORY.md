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
- **ADR-010 Continental Biome Generation (proposed 2026-03-04):** World Climate Map pre-pass in generateWorldMetadata(). Low-res per-region overlay (continent mask, latitude temp, rain shadow moisture, resolved biome). Stored in `world.metadata.climateMap`. Old saves regenerate from seed. Beach validation is per-chunk post-processing. River carving filtered by biome. All thresholds in RULES.worldGen.biomeGeneration (already exists, was unused).

## Data Schemas
- abilities.json effects object keys serve as implicit effect types: extraAction, choice, healing, dodge, attacks, rerollSavingThrow, damageMitigation, inspirationDie, recoverSlotLevels, bonus
- Formula strings like "1d8 + level + con" used for healing/damage; parsed by evaluateFormula()

## World Generation Architecture
- **6 noise layers:** elevation, moisture, temperature, feature, river, biome (macro) -- all SimplexNoise with offset seeds
- **generateWorldMetadata()** pre-pass: settlements (quota-based), features (dungeons/sanctuaries/POIs), roads. Stored in `world.metadata` in gameState.
- **RULES.worldGen.biomeGeneration** section exists with continentalScale, latitudeInfluence, etc. but NONE are currently wired into WorldGenerator.js code
- **RULES.worldGen.waterGeneration.beaches.requiresAdjacentDeepWater** exists but is NEVER enforced
- **selectMacroBiome()** at line 214, selectTerrain() at line 301, generateTile() at line 150

## Red Flags to Watch
- Any new `if (ability.id === '...')` branches in main.js -- should use EffectDispatcher instead
- Hardcoded ability names/descriptions in JS instead of reading from abilities.json
- CSS class names referencing specific abilities (e.g., `steadyNerveModal`) instead of generic names
