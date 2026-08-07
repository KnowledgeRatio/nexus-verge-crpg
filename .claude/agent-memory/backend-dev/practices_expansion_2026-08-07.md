---
name: practices-expansion-2026-08-07
description: Practices system phase 2 (trading/foraging rank system, Hearthcraft buff resolver fix, Deflecting charge tracker) — file/line locations and brief-vs-real-code mismatches found
metadata:
  type: project
---

Implemented 2026-08-07: Hearthcraft ability-score buff routed through `getRawAttributeModifier()` (`src/utils/attributeResolver.js`), `getBuffedAbility()` deleted from `src/utils/practiceUtils.js` (dead code), `activeMealBuff` cleared on `Character.longRest()`, generic `equipmentModCharges` uses/recharge tracker for equipment mods (Deflecting shield), practice rank system (`maxRank`/occurrence-count in `LevelUpManager.getFilteredPractices()`), Trading passive pricing modifier (`RelationManager`), Foraging banked bonus loot rolls (`Character.bankedForagingRolls`, `main.js` `bankForagingRoll()`, consumed in `CombatManager.endCombat('victory')` and `SkillChallengeManager.applyConsequences()`).

**Why:** [[adr010_ability_dispatch]] and the six-attribute remap ([[attribute_remap_m1_formulas]]) are the load-bearing systems this expansion had to route through generically rather than re-hardcoding.

**How to apply:** Three places the incoming scoping brief didn't match real code, worth checking again if this area comes up:
1. `LootManager.getPropertyEffect(propId)` already returns the inner `.effect` object, not the outer property entry — so callers read `.uses`/`.recharge` directly off the return value, never `.effect.uses`. A brief describing this method as returning the outer entry is describing stale behavior.
2. The Hearthcraft buff match condition (`buff.abilityScore === resolvedKey || RULES.attributes.legacyToNew[buff.abilityScore] === resolvedKey`) only bridges an *old-save legacy-keyed* buff onto a *current* resolved key — it does NOT bridge a current NVSystem-keyed buff onto a hypothetical 5EClassic-mode resolved key (that direction has no matching branch). Given `RULES.attributes.system` defaults to NVSystem and 5EClassic is rollback-only, this asymmetry is intentional/acceptable, but don't assume the match is symmetric if this code is touched again.
3. `Character.updateSkillBonuses()` reading a stale `this.abilityModifiers` snapshot instead of live-resolving was a *named* bug in the brief — but `SkillChallengeManager.getSkillModifier()` had the exact same stale-snapshot pattern (`character.abilityModifiers?.[attributeKey]`) and wasn't mentioned. Per [[architecture]]'s "one instance of a hardcoded-pattern bug means there are more," fixed both. Grep `abilityModifiers\[` / `abilityModifiers\?\.\[` again if a third Hearthcraft-buff-invisible site turns up later.

Full suite (517 tests, up from 495 baseline) green after each incremental step, per-file breakdown in the session's final report.
