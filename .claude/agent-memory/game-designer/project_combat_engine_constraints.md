---
name: project-combat-engine-constraints
description: Load-bearing implementation limits in the combat/item engine that constrain design — inert resistance pipeline, unscanned equipment slots, fatigue's owned stat axes
metadata:
  type: project
---

Facts about the *implemented* engine that repeatedly constrain design proposals. Verified 2026-09-08 — re-check before relying on any of them, they are the kind of thing that gets fixed without announcement.

**Why:** Several obvious-looking design answers are no-ops or blocked in this codebase, and it is not visible from the data files. Each of these killed or reshaped a recommendation during the Source/Void design pass ([[project_source_void_mechanics]]).

**How to apply:** check these before proposing a mechanic that depends on damage types, non-hand equipment slots, or a new attrition penalty.

### The damage-resistance pipeline is inert
`RULES.combat.damageReductionSystem.enabled` is `false`. `resolveDamageModifier()` returns `'normal'` immediately. **Any mechanic whose value comes from resistance/immunity/vulnerability interaction does nothing today.**

Worse: `RULES.combat.damageTypes.neutral: ['injury','resonant']` with its comment *"never resisted or exploited"* is **never read by any code**. Matching is raw-string against monster lists. `resonant` is unresisted only incidentally — because no monster lists it — not because anything enforces it. Do not cite that config as if it were a guarantee.

Flipping the flag is a large balance event on its own (with `immunityMultiplier: 0`, a typeless weapon becomes the only thing that can hurt an immune creature). Never bundle it with an unrelated change.

### Only three equipment slots are scanned for item properties
`Character.equipment` has `mainHand`, `offHand`, `armor`, `helmet`, `artifact` — but `CombatManager.getActiveEffect()` / `getActiveEffectSource()` and `main.js recalculateCombatStats()` all hardcode `['mainHand','offHand','armor']`. **`artifact` and `helmet` item properties never fire.** Any accessory/amulet/trinket design is blocked until that list is widened. There is no accessory slot at all — "amulet"/"charm" concepts must map to `artifact` (one slot) or to consumables.

### Fatigue already owns attack rolls and skill checks
`RULES.fatigue.thresholds` applies −1 skills (wearied), −1 skills/−1 attacks (tired), disadvantage on both (staggering). A new attrition penalty must **not** target those same numbers or the two systems become mutually illegible. Saving throws are the clean unclaimed lane.

### Generic infrastructure that does work well
- `EffectDispatcher` registers handlers by `effect.type`; `execute()` iterates the effects object. Genuinely ADR-010 clean.
- `applyConditionOnTurnStart` monster traits, `damageOnTurnStart` conditions, and `stackable`/`stackBehavior: 'addValue'` are all implemented generically — data-only for new content.
- `equipmentModCharges` + `_resetEquipmentModChargesByRecharge()` gives any property with `uses`/`recharge` in its effect real rate-limiting for free.
- Conditions are stored generically, but **their meanings are hardcoded** — `hasCondition('prone')`, `hasCondition('sapped')` etc. are literal checks throughout `CombatManager`. A new condition *type* with new mechanical meaning always requires code.
