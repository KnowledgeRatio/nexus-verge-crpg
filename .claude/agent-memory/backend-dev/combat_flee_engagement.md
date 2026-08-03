---
name: combat-flee-engagement
description: Flee check formula/DC and the engagedWith Set-based engagement system (redesigned 2026-03-14)
metadata:
  type: project
---

## Flee Mechanic (updated 2026-03-14 — engagement redesign)
- Formula: `d20 + max(DEX mod, WIS mod) + proficiency >= DC`
- DC: `10 + 2*(engagedCount-1)`, capped at 25. `engagedCount = combatant.engagedWith.size`.
- `isRangedCombatant(combatant)`: checks equipped weapon first, then `character.attackType` field. `"both"` returns false (has melee capability).
- Opportunity attacks use `{ consumeAction: false, isOpportunityAttack: true }` — does NOT consume the attacker's action.
- DO NOT use `combatant.initiative` as a modifier — it is a fully-rolled value (d20 + DEX). Always use `combatant.character.abilityModifiers.dex` directly.
- Wanderlust Cunning Action flee uses bonus action instead of action (same roll, no advantage).

## Engagement System (redesigned 2026-03-14)
- `Combatant.engagedWith` is a `Set<string>` of IDs (was `hasEngaged: boolean`). Bidirectional, many-to-many.
- `get hasEngaged()` getter on Combatant — backward-compat, returns `this.engagedWith.size > 0`.
- Engagement forms ONLY on a confirmed melee hit (not on miss, not on ranged attacks). Both attacker and defender get each other's ID added to their `engagedWith` sets.
- `CombatManager.firstMeleeAttackLanded` — reset in `startCombat()`, set to `true` on first melee hit. Gates the round-1 free-flee path.
- `clearEngagement(defeatedCombatant)` — removes the defeated combatant's ID from all others' sets and clears their own set. Called at the top of `handleDefeat()`.
- `disengage(combatant)` — CombatManager method. Clears `engagedWith`, applies `'disengaged'` condition (`untilStartOfTurn`). Wanderlust L2+ can use as bonus action.
- OA filter in `resolveFleeOpportunityAttacks()`: `combatant.engagedWith.has(c.id) && !this.isRangedCombatant(c) && !c.hasCondition('pushed')`.
- RULES config: `RULES.combat.disengage` block; `RULES.flee.pushBreaksEngagement = false`; `RULES.flee.hitRequiredToReEngage = true`.
- `toJSON()` on Combatant includes `engagedWith: Array.from(this.engagedWith)`.
