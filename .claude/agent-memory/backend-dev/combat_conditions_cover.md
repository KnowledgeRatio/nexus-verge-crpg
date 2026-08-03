---
name: combat-conditions-cover
description: Harried condition, terrain cover AC/disadvantage system, and the Improvised Strike action
metadata:
  type: project
---

## Harried Condition (implemented 2026-03-08)
- Applied by melee hit on defender: `appliedBy = defender.id`, duration `'untilStartOfTurn'` — clears at start of THE DEFENDER'S OWN TURN.
- Effect: attacker (the harried target) has disadvantage on ranged attacks.
- Check is `if (isRanged && attacker.hasCondition('harried'))` in the advantage/disadvantage block.
- Applied block is inside `if (isCritical || attackTotal >= defender.ac)` — only on confirmed hits, before mastery blocks.
- `addCondition` returns false if already harried — no stacking by design.

## Cover System (implemented 2026-03-08)
- `coverType` is stored on `CombatManager` instance (`this.coverType`), NOT inside combatant state.
- Read from terrain via `worldGenerator.getCachedTile(x, y)` (sync) + `worldGenerator.terrainTypes.terrains.find(...)` at combat start.
- Player position key is `gameState.get('player.position')` (set by Player.js on every move).
- `full` cover → normalized to `threeQuarters` at combat start (full cover = impassable, so treat as heavy cover in combat).
- `threeQuarters`: +2 AC to ALL combatants at start, reversed in `endCombat()` before condition cleanup.
- `half` / `threeQuarters`: ranged attacks have disadvantage (checked via `this.coverType` in `attack()`).
- Every `gameState.set('combat', {...})` call must include `coverType: this.coverType` — including `updateGameState()` and `syncCombatState()` in main.js.
- `endCombat()` sets `this.coverType = null` after restoring AC.

## Improvised Strike (implemented 2026-03-08)
- `improvisedStrike(attacker, defender)` on CombatManager — 1d4 bludgeoning, STR mod to hit only, no proficiency.
- Natural 1 = critical miss (same sound/text as normal crit miss). Natural 20 = critical hit (double dice: 2d4).
- Consumes action via `attacker.consumeAction('action')`.
- In main.js: button added to `renderCombatActions()` as "Strike" between Off-Hand and Dodge. `selectAction('improvisedStrike')` sets `this.selectedAction` and prompts for target. `handleTargetClick()` switch case calls `combatManager.improvisedStrike()`.
