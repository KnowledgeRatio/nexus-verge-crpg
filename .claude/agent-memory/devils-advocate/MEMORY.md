# Devil's Advocate - Agent Memory

## Recurring Anti-Patterns

### 1. Hardcoded Per-Ability Branches (2026-02-27)
- `useAbility()` in `src/main.js` uses `if (ability.id === 'xxx')` for each ability
- No generic effect dispatch system exists
- Same problem will affect spells -- both share effect vocabulary (damage, healing, dodge, etc.)
- Data schema in `abilities.json` and `spells.json` already describes effects generically, but code doesn't interpret them
- See `patterns.md` for proposed EffectDispatcher design

### 2. Incomplete Resource Checking
- `canUseAbility()` only handles `shortRest` resource type
- Missing: `stamina`/`focus`, `longRest`, `perTurn`, `none`
- Will silently allow using abilities when resources are depleted

### 3. endTurn() Called After Bonus Actions
- `executeSteadyNerveOption()` calls `endTurn()` after consuming bonus action
- This steals the player's main Action -- gameplay bug
- Pattern: always separate "consume action economy" from "end turn"

## Key Architectural Principle
- ADR-000 in `docs/ARCHITECTURE.md`: Modifiability First
- All content data-driven, no hardcoded values
- Systems independently toggleable
- Adding new abilities/spells should require 0 JS changes

### 4. Magic-String State Machines (2026-02-27)
- `selectedAction` in main.js uses magic strings ('steadyNerveAttack', 'attack', 'attackOffHand')
- Deferred actions store state in `_pending*` fields with no cleanup on combat end/ESC/turn end
- Stale pending state can leak into next combat or next turn
- Pattern: use explicit PendingAction object with onComplete/onCancel, cleared on lifecycle events

### 5. Inconsistent Data Schemas (2026-02-27)
- Ability options use mixed formats: `"healing": "..."` vs `"effect": "dodge"` vs `"effect": "weapon_attack"`
- This forces if-chains in any code that interprets options
- Fix: normalize to `"effects": { "heal": "..." }` matching top-level ability format

## Key Architectural Principle
- ADR-000 in `docs/ARCHITECTURE.md`: Modifiability First
- All content data-driven, no hardcoded values
- Systems independently toggleable
- Adding new abilities/spells should require 0 JS changes

### 6. Flee Mechanic Implementation Traps (2026-03-04)
- `combatant.initiative` is the ROLLED VALUE (1-24), NOT the modifier. Flee bonus must use `abilityModifiers.dex + proficiencyBonus` separately.
- Melee vs ranged classification needs an explicit utility function `isRangedCombatant()` — monsters with natural attacks (wolf, rat) have no weapon slot, default to melee.
- L1 Scholar (6-8 HP) vs 3 melee enemies: expected opp attack damage 11-14 = near-certain death. Add `RULES.flee.oppAttackMinHP: 1` (cannot kill during flee attempt) or the flee button becomes a suicide button for squishy callings.
- Ranged-only encounters: zero opp attack cost = dominant "always flee" strategy for squishy callings at 50-65% success rate with no downside on failure. Accept or add ranged harassment rule.

## Key File Locations
- Ability data: `data/abilities.json`
- Spell data: `data/spells.json`
- Ability UI+execution: `src/main.js` lines ~2133-2323
- Combat action dispatch: `src/main.js` lines ~1240-1290
- Resource redesign plan: `docs/plans/2026-02-25-resource-system-redesign.md`
- EffectDispatcher design + review: `.claude/agent-memory/devils-advocate/patterns.md`
- Current flee method: `src/systems/CombatManager.js` lines 1061-1090 (full rewrite needed)
