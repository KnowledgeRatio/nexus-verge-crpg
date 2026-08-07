# Architect Memory

## Reviews
- [Context Engineering Review 2026-07-17](context_engineering_review.md) — rules-loading tiering, main.js god-module, data/ split candidates, root/docs cruft list
- [Effect Architecture Ceiling Audit 2026-08-06](effect_architecture_ceiling_2026-08.md) — conditions=storage-not-effect, saving throws triplicated, no pre-roll conditional-modifier hook, traits.json vocabulary confirmed dead, abilityUses reset bug, fighting styles dual-hardcoded
- [Oath Scoping Pass 2026-08-06](oath_scoping_2026-08.md) — Auras + Vow pool file-by-file plan; promptReaction reactor/defender conflation (3 branches, not just the entry gate); no generic targeted-save-no-attack-roll dispatch exists; monster NaN bug does not reproduce; PassiveModifierRegistry can't do cross-character aura queries

## Key Patterns Confirmed
- **useAbility() in main.js** is the execution layer for abilities; data layer (abilities.json) and UI layer (showAbilitySelection, renderAbilityOption, canUseAbility) are already generic
- **Combatant state** is transient (combat-only); character.abilityUses persists through save/load
- **CombatManager.playerCombatant** is the live combatant; has `.actions`, `.hasAction()`, `.consumeAction()`
- **Conditions system** already exists on combatants: `addCondition(type, duration, appliedBy, options)`
- **Combat state sync** pattern: `gameState.set('combat', { active, round, currentTurn, combatants: [...toJSON()] })`

## Architectural Decisions
- **EffectDispatcher (designed 2026-02-27):** Dispatch table keyed on effect TYPE not ability ID. File: `src/systems/EffectDispatcher.js`. Exports: dispatchEffect(), dispatchChoiceOption(), registerEffectHandler(). No new gameState paths. No save/load impact.
- **Reactive abilities** (STALE as of 2026-08-06, superseded): Indomitable is actually implemented via `ability.reactionTrigger` + `promptReaction(hookPoint, ...)` in main.js, not `_abilityFlags`. See [[effect-architecture-ceiling-2026-08]] finding #2 — the `afterFailedSave` hookpoint only fires from one call site, not universally.
- **ADR-010 Continental Biome Generation (proposed 2026-03-04):** World Climate Map pre-pass in generateWorldMetadata(). Low-res per-region overlay (continent mask, latitude temp, rain shadow moisture, resolved biome). Stored in `world.metadata.climateMap`. Old saves regenerate from seed. Beach validation is per-chunk post-processing. River carving filtered by biome. All thresholds in RULES.worldGen.biomeGeneration (already exists, was unused).
- **Effect Schema (decided 2026-04-09):** HYBRID — source-specific JSON schemas + shared Effect Primitive runtime interface + single EffectDispatcher. See ADR-011 note below.

## ADR-011: Effect Schema — Hybrid Model
**Verdict:** Source-specific data schemas with a shared internal Effect Primitive and single EffectDispatcher.

**Two execution models that must NOT be collapsed:**
- **Model A (Executed):** On-use, on-hit, reaction effects. Handled by EffectDispatcher registered handlers.
- **Model B (Persistent Modifier):** Passive stat modifiers from fighting styles, forgecraft mods, equipment. Must go into PassiveModifierRegistry (not yet built).

**Per-source schema status:**
- `abilities.json`: effects key = handler type. CORRECT. No change needed.
- `spells.json`: flat top-level fields (`damage`, `savingThrow`, `effect: string`). The string `effect` field is NOT dispatchable — must become structured `onHitEffects: []` before spell resolver is built.
- `practices.json`: `effect: { type, property, bonus }` objects. Need `timing: "passive"` field added when PassiveModifierRegistry is built.
- Fighting styles: NO data schema — hardcoded if-branches in Character.js and CombatManager. Must be extracted to `data/fightingStyles.json` when PassiveModifierRegistry is built.
- Equipment flat bonuses: Direct property reads (`item.armorClassBonus`). Leave as-is — not complex enough to dispatch.
- Level-up grants: `grantedResource` and `autoGrantAbilities` are already generic. Do not touch.

**Must-do-now (before any new spec tree):**
1. Register maneuver handlers in EffectDispatcher. Delete `executeOnHitManeuver()` switch block in CombatManager.
2. Replace `if (ab.id === 'riposte') / if (ab.id === 'parry')` in `promptReaction()` (main.js) with effect-type routing.

**Deferred (before Scholar/Bond spec trees):**
3. Build `PassiveModifierRegistry.js` + `data/fightingStyles.json`
4. Normalise `spells.json` `effect` string fields to structured `onHitEffects` arrays

**PassiveModifierRegistry API (planned):**
- `rebuild(character)` — call on load and equipment change
- `getACBonus(ctx)`, `getAttackBonus(ctx)`, `getCritRange(slot)`, `getCritImmunity()`
- No new gameState paths. Rebuilt from character data on every load.

## Data Schemas
- abilities.json effects object keys serve as implicit effect types: extraAction, choice, healing, dodge, attacks, rerollSavingThrow, damageMitigation, inspirationDie, recoverSlotLevels, bonus
- Formula strings like "1d8 + level + con" used for healing/damage; parsed by evaluateFormula()

## World Generation Architecture
- **6 noise layers:** elevation, moisture, temperature, feature, river, biome (macro) -- all SimplexNoise with offset seeds
- **generateWorldMetadata()** pre-pass: settlements (quota-based), features (dungeons/sanctuaries/POIs), roads. Stored in `world.metadata` in gameState.
- **RULES.worldGen.biomeGeneration** section (continentalScale, latitudeInfluence, elevationWeight) IS NOW WIRED into generateTile() and _sampleTerrainAt() in WorldGenerator.js
- **RULES.worldGen.waterGeneration.beaches.requiresAdjacentDeepWater** exists but is NEVER enforced (still open)
- **Biome elevation/moisture thresholds** in selectMacroBiome() (e.g. ocean < 0.10, coastal < 0.30, mountain > 0.75) are still hardcoded magic numbers — not in RULES. Medium-priority violation.
- **selectMacroBiome()** at line 230, selectTerrain() at line 324, generateTile() at line 150

## SkillChallengeManager Dual Data Source (2026-03-07)
- `this.challenges` = Map, stores social challenge trees from `data/skillChallenges/*.json`
- `this.terrainChallengesData` = flat JSON from `data/skillChallenges.json`, shape: `{ balancing, challenges: { [id]: def } }`
- These are TWO DIFFERENT properties. Plan docs that write `this.challenges.challenges[id]` are WRONG -- must be `this.terrainChallengesData.challenges[id]`
- Backend-dev must add `loadTerrainChallenges()` to populate `terrainChallengesData`, then call `buildTerrainIndex()`
- `lastAttemptTimes` must NOT be serialized to save/load (wall-clock timestamps are meaningless across sessions)
- `encounterAccumulator` MUST persist (add to `gameState.player` object in `initNewGame()`)

## RULES.movement Config Block (2026-03-07)
Added to rulesEngine.js between `flee` and `zoom`:
- `baseMoveDelay: 150` (ms)
- `maxMoveDelayMultiplier: 2.0`
- `encounterAccumulatorThreshold: 10`
- `baseEncounterProbability: 0.10`
Net rate per tile formula: `encounterModifier × movementCost × baseEncounterProbability / threshold`

## Ability Dispatch Scalability (2026-04-09, updated 2026-08-06)
- **RESOLVED as of 2026-08-06:** `executeOnHitManeuver()` no longer exists in CombatManager.js — confirmed by grep, zero matches. Tactics now dispatch cleanly through EffectDispatcher's registered handlers (onHitSaveOrCondition, onHitCondition, onHitPush, etc.), gated by `_isTacticAbility()`'s effect-type-set check (main.js ~3467), not ability ID.
- **RESOLVED:** `promptReaction()` in main.js routes by effect type (`ab.effects?.reactionAttack`, `ab.effects?.reactionDamageReduction`, `ab.effects?.rerollSavingThrow`) — NOT by ability ID. ADR-010 compliant.
- **RESOLVED as of 2026-08-06 (Oath scoping pass):** `data/specializations.json` now exists for real (dedication.exemplar + dedication.oath entries present) — prior "missing file" note was stale. `subtype` field also now exists and is populated (`"ability"`, `"tactic"` seen) — prior "schema gap" note about the field itself was stale.
- **Still open:** `renderTacticChoice()`/`renderManeuverChoice()` in LevelUpManager.js (~line 562-580) still hardcodes `ab.specialization === 'exemplar'` rather than reading `subtype` — the picker-logic gap is real even though the field now exists.
- **New ceiling findings:** see [[effect-architecture-ceiling-2026-08]] — conditions are storage-only not effect-generic, saving throws are implemented three separate times, no generic pre-attack-roll conditional-modifier hook exists (Vanguard trait hardcoded directly into CombatManager.attack()), traits.json's flat-modifier vocabulary is confirmed dead code.
- **Safe to scale:** EffectDispatcher handler map (flat, O(1)), `grantedResource` processing (fully generic), `autoGrantAbilities`, `choice + options` pattern, spell/ability file separation, Resolve resource gate (execute() lines 49-58), condition storage/duration-expiry (not condition *effects*).

## Hearthcraft Architecture (2026-04-10)
- Meal buff lives on `character.activeMealBuff` (plain object, null when inactive). NOT on gameState.
- Buff does NOT mutate `character.abilities`. Use `getBuffedAbility(char, key)` helper at call sites.
- Level-keyed resolver `resolveLevelKeyedValue(obj, level)` goes in `src/utils/practiceUtils.js` — both practices use it.
- FatigueManager multiplier: one line in `calcMovementFatigue()` after conFactor; reads from `character.activeMealBuff?.fatigueRateMultiplier ?? 1`. No hardcoded practice ID.
- Clear-before-apply: `applyHearthcraftBuff()` sets `activeMealBuff = null` before writing new buff.
- Party application via `gameState.getFullParty()`. uniformChoice iterates all; individualChoice loops UI per member.
- Modal trigger in main.js: same restCompleted block as Forgecraft (lines 7621–7632), 1000ms delay offset.

## Skill Challenge Loot Wiring (2026-04-14)
- `applyConsequences()` IS NOW IMPLEMENTED in SkillChallengeManager.js (~line 826). It is called by main.js at two sites. Loot wiring appears complete.
- `shipwreck_salvage` table is referenced in skillChallenges.json but missing from lootTables.json — pre-existing broken reference, must be added
- Correct loot hook is INSIDE applyConsequences(), not a separate applyLootReward() method
- LootManager namespace fix: merge `itemTables` + `skillChallengeLootTables` into single `allTables` flat map at loadData() time
- `rarityFilter` belongs on the loot BLOCK (per-challenge), not the table definition — same table must be reusable at different rarity brackets
- `"table"` → `"tableId"` rename affects 7 loot blocks in skillChallenges.json (not 4 as designer counted — shipwreck_salvage is a 7th)

## Red Flags to Watch
- Any new `if (ability.id === '...')` branches in main.js -- should use EffectDispatcher instead
- Hardcoded ability names/descriptions in JS instead of reading from abilities.json
- CSS class names referencing specific abilities (e.g., `steadyNerveModal`) instead of generic names
- `terrainChallengeMap` hardcoded in Player.js IS RESOLVED — now calls `window.skillChallengeManager?.getCandidatesForTerrain(tile.terrain)` at Player.js line 686.
- Any new `if (character.fightingStyle === '...')` branches in CombatManager or Character.js — should go through PassiveModifierRegistry once built
- Any new `hasForgecraftMod()` call-sites for new mod types — should eventually become registry queries
