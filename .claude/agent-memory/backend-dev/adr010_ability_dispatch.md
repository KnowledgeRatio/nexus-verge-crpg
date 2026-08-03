---
name: adr010-ability-dispatch
description: ADR-010 data-driven ability dispatch — EffectDispatcher Resolve gate, effect-type handlers, and the Exemplar maneuver migration
metadata:
  type: project
---

## Core rule
NEVER write `if (ability.id === 'X')` or `if (ability.effects?.specificName)` for a named ability. Register a handler by effect-type key in EffectDispatcher. `character.selectedAbilities` — array of known ability IDs (includes auto-granted). NOT `character.abilities` (that's `{str, dex...}` — see [[fix-findknownability-bug]] for a bug caused by confusing the two).

## EffectDispatcher Resolve Gate (implemented 2026-04-09)
- `execute()` has a single pre-dispatch Resolve gate: checks + deducts BEFORE any handler fires.
- Gate only fires when `ability.resourceType === 'resolve'` AND `!context.resolveAlreadyDeducted`.
- Cost priority: `ctx.resolveSpent` (variable-cost) > `ability.resolveCost` (number) > 1 (default).
- Returns `[{ type: '_resolveGate', result: { skipped: true } }]` and stops if insufficient Resolve.
- Handlers (`variableCostDamage`, `variableCostHeal`, `cureCondition`, `selfTempHP`) are pure effect code — they never read or write `resolvePoints`.
- Maneuver beforeAttack/onHit paths in CombatManager set `ctx.resolveAlreadyDeducted = true` when Resolve was already deducted at queue time in main.js (not dispatch time). Reaction maneuvers (Riposte, Parry) do NOT set this flag — their Resolve is deducted by the gate at dispatch time.
- `resourceType: 'shortRest'` abilities (Steady Nerve, Action Surge) are unaffected — the gate skips them entirely.

## Effect handler catalog
- `variableCostDamage` (EffectDispatcher): reads `ctx.resolveSpent` + `ctx.defender` (both must be injected manually by the caller — not part of standard `buildContext()` output). Config in JSON: `{ damageFormula, damageType, bonusVsCreatureTypes, bonusDice, trigger: "onHit", rangeType: "melee" }`. Dispatch wiring lives in `CombatManager.attack()`'s post-hit block — as of 2026-07-31 this searches `window.game.abilitiesData.abilities[character.class.id]` for abilities with `effects.variableCostDamage.trigger === 'onHit'` known via `character.selectedAbilities`, calls `window.game.promptVariableCostDamage(attacker, defender, ability)` for the Resolve-spend prompt, then dispatches via `EffectDispatcher.execute()` with `ctx.defender` and `ctx.resolveSpent` added on top of `buildContext()`. (Earlier memory claiming this loop already existed was wrong — it was actually a hardcoded, broken `swornStrike`-only block; fixed in [[fix-findknownability-bug]].)
- `variableCostHeal`: reads `ctx.resolveSpent` (injected by showAbilityChoices). Formula string e.g. `"resolveCost * conMod + level"` — evaluates via `Function()` after longest-first substitution.
- `cureCondition`: reads `ctx.resolveSpent` as fixed cost (1). Calls `combatant.removeCurableConditions()` limited to `count`.
- On-hit abilities hidden from the active ability list via: `ability.actionType === 'onHit' && ability.effects?.variableCostDamage?.trigger === 'onHit'`.
- `showAbilityChoices` (combat) and `showOutOfCombatAbilityChoices`: expand `variableCostHeal` options into per-resolve-spend buttons; pass `data-resolve-spend` attribute. `executeAbilityChoice` / `executeOutOfCombatChoice` injects `context.resolveSpent = resolveSpend`.
- `LevelUpManager.confirmLevelUp`: after `applyLevelUpSelections`, reads `specializationFeatures[spec].autoGrantAbilities` from progression data and pushes to `character.selectedAbilities`. Also reads `newFeatures[].grantedResource` and sets `character.max{Id}Points`, `character.{id}Points`, `character.{id}Recharge` generically from data.
- `aidTheVulnerable` uses `effects.choice` + options — routes through `showAbilityChoices` / `executeAbilityChoice` (same as Steady Nerve). No inline modal.

## ADR-010: Exemplar Maneuver Migration (implemented 2026-04-09)
- All 8 Exemplar maneuvers in abilities.json use typed effect keys — the old `"maneuver": "tripAttack"` pattern is gone.
- Effect type → maneuver mapping: `precisionAttackBonus` (Precision Strike), `onHitSaveOrCondition` (Trip Attack, Menacing Attack), `onHitPush` (Pushing Attack), `onHitCondition` (Disarming Attack), `selfTempHP` (Rally), `reactionAttack` (Riposte), `reactionDamageReduction` (Parry).
- EffectDispatcher.js handlers: `resolveManeuverDieSides(character)` — L3-6=d6, L7-9=d8, L10+=d10. `maneuverSaveDC(character, config)` — as of the attribute-system remap (2026-08-01, see [[attribute_remap_m1_formulas]]) default is `8+prof+getAttributeModifierFor(character,'meleeAttack')` (Prowess-only, legacy mode redirects to STR — the old max(STR,DEX) comparison is gone); `config?.dcContext` + `RULES.attributes.system==='sixAttribute'` overrides to a blended context (Menacing Attack only). Both are module-level helpers, not exported.
- All on-hit handlers (`onHitSaveOrCondition`, `onHitCondition`, `onHitPush`) require `ctx.attacker` and `ctx.defender` injected by CombatManager (NOT in standard `buildContext()` output — must be added manually). As of 2026-07-31, `CombatManager.attack()`'s pending-maneuver dispatch does this via `buildContext()` + manually setting `.attacker`/`.defender`/`.resolveSpent` — see [[fix-findknownability-bug]].
- `precisionAttackBonus` handler returns `{ bonus: N }` — CombatManager reads `result.bonus` to add to attackTotal.
- `selfTempHP` handler consumes bonusAction internally — Resolve is deducted by the pre-dispatch gate in `execute()`, not inside the handler.
- `reactionAttack` / `reactionDamageReduction` return the die roll — `promptReaction` in main.js dispatches them via EffectDispatcher and reads `result.bonus` / `result.damageReduction` to pass to `cm.attack(extraDamage)` / `resolve({ damageReduction })`.
- The full ability lookup for a queued `pendingManeuver` ID is `CombatManager._findKnownAbility(character, abilityId)` (reads `window.game.abilitiesData.abilities[class.id]`, gated on `character.selectedAbilities`). Do not assume a differently-named helper exists — check the file directly.
- main.js: `_isManeuverAbility(ability)` helper — returns true when any maneuver effect key is present in `ability.effects`. Used everywhere `ability.effects?.maneuver` was previously checked. Do NOT check `ability.effects?.maneuver` anywhere — that key no longer exists.
