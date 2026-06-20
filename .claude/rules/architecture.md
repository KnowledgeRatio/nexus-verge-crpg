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

**Exemption — live combat and interactive rewards**: Combat dice rolls (attack, damage, saves, maneuver dice) and consequence reward amounts intentionally use `Math.random()`. Seeding these would allow save-scumming (reload → same outcome). This exemption is deliberate and does not apply to world/dungeon generation.

## Non-Grid Combat (ADR-014)
This game has no movement grid. Speed values and distance are narrative-only. Any D&D 5e mechanic that is purely a movement modifier (e.g. the Slow weapon mastery's "reduce speed by 10 ft") is meaningless in this context and **must be replaced with a functionally equivalent non-movement effect** when implemented.

Current substitutions:
| RAW mechanic | This game's substitute | Rationale |
|---|---|---|
| Slow mastery: -10 ft speed | -1 AC until start of your next turn | Speed is N/A; AC reduction preserves the "slowing" tactical feel |

Document any future substitutions in this table.

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

## Save/Load Serialization Contract (ADR-011)

`Map` objects (`generatedRegions`, `npcs`) must be serialized as arrays and reconstructed via `deserializeMap()` on load. Never `JSON.stringify` a Map directly.

Transient fields must be **excluded from `toJSON`** and initialized to defaults in `fromJSON`:

| Field | Default on load |
|-------|----------------|
| `party.candidates[]` | `[]` |
| `party.activeSynergies` | computed on read — never stored |
| `companionMeta.devotedPassiveUsedThisRest` | `false` |
| `dungeon.active` | `false` |

Old saves load gracefully via `savedData.party ?? defaultValue` patterns. Never write migration scripts. Never fail on missing keys.

## Campaign Content Filtering (ADR-013)

`campaignIds` on every data entry controls which campaigns include it. Filtering runs **once at load time** in each manager — never at runtime lookup. Absent or `["core"]` = included everywhere. Campaign inheritance is defined in `data/campaigns.json`.

Never reference `campaignIds` in game logic. If a manager loads data without filtering by campaign, that's a bug.

## Party System Architecture (ADR-012)

Design is locked (2026-03-09). Key constraints:

- Companions are `Character` instances with `companionMeta` attached after construction. `party.candidates[]` is transient (not persisted). `party.activeSynergies` is computed on read via `CompanionManager.getActiveSynergies()` — never stored.
- Combat uses BG3-style direct control. Every combatant rolls **individual initiative**. Turn order is a single unified queue — no team grouping.
- Effective party size uses `1 + (companionCount * 0.75)`. **Floor this before passing to `buildMinionGroup`** — integer equality breaks on floats.
- `CombatManager.endCombat()` **must** emit `gameState.notify('combat.ended', { outcome })` before returning. `CompanionManager` subscribes to this — it is the only coupling point between the two systems.
- Fled/TPK outcomes = permanent companion death. Victory = auto-stabilize to 1 HP.
- `CompanionManager` does not touch the DOM. All UI wiring is in `main.js`.

