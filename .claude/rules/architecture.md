# Architecture Rules

## Modifiability First (ADR-000)
The primary design concern. Every system must pass this checklist:
1. Can be disabled via a config flag in `rulesEngine.js`
2. Loads content from data files (not hardcoded)
3. Can be extended without modifying existing code
4. Changes don't break other systems

## Data Drives Code — Never the Reverse (ADR-010)
JSON files are the single source of truth for what abilities exist, what they cost, and what effects they apply. The code provides **generic dispatch infrastructure** keyed to *effect handler types*, not to specific ability IDs or names.

**If you find yourself writing `if (ability.id === 'X')` or `if (ability.effects?.specificAbilityName)` for a named ability — stop.** Define a generic handler and wire the JSON to it.

## Observer Pattern
All shared state lives in `gameState`. UI components subscribe to relevant state keys and auto-update.

```javascript
gameState.subscribe('character.currentHP', (hp) => updateHPDisplay(hp));
gameState.set('character.currentHP', newHP); // triggers subscriber
```

Never mutate state directly. Always use `gameState.set()`.

## Seeded Generation
All procedural generation must use the world seed for determinism.

```javascript
const regionSeed = seedToNumber(`${worldSeed}_${regionX}_${regionY}`);
const rng = createRNG(regionSeed);
```

Same seed = same world, always.

## World-Gen-Time Computation
Anything computable from the seed must be computed at world-gen time in `worldMetadata`, not deferred to region load time. Use `_sampleTerrainAt(x, y)` to query terrain type without loading a full region.

## Rules Engine
All balance values and game rules go in `src/core/rulesEngine.js`. No magic numbers in system code. If a value might ever need tuning, it belongs in `RULES`.

```javascript
RULES = {
  combat: { criticalHitRange: [20], ... },
  flee: { baseDC: 10, engagedEnemyDCModifier: 2, ... },
  movement: { baseMoveDelay: 150, maxMoveDelayMultiplier: 2.0, ... },
}
```

## Known Architecture Gaps (Pre-Implementation)
These must be fixed before party system implementation:
- `CombatManager.endCombat()` must emit `combat.ended` event (currently missing)
- `Combatant` needs `sourceCharacter` back-reference for `isDowned` writeback
- `getEffectivePartySize()` must `Math.floor()` before `buildMinionGroup` (integer equality bug)
- `activeSynergies` should be computed on read, not persisted
- `devotedPassiveUsedThisRest` must be excluded from save/load (transient)
