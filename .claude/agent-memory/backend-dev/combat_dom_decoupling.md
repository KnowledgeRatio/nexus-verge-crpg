---
name: combat-dom-decoupling
description: CombatManager no longer touches the DOM directly — floating text/victory/game-over go through gameState.notify events
metadata:
  type: project
---

## CombatManager DOM Decoupling (implemented 2026-05-27)
- `showFloatingCombatText` calls replaced with `gameState.notify('combat.floatingText', { combatantId, text, type, delay? })`.
- `showVictoryModal` / `showGameOver` methods removed from CombatManager. CombatManager now fires `gameState.notify('combat.victoryScreen', { xpGained, totalXP, leveledUp, totalGold, allLootItems, lootMessages })` and `gameState.notify('combat.gameOver', {})`.
- Subscribers in main.js `init()` wire `combat.floatingText` → `this.showFloatingCombatText(...)`, `combat.victoryScreen` → `this.showVictoryModal(...)`, `combat.gameOver` → `this.showGameOver()`.
- `showVictoryModal` and `showGameOver` now live as methods on the NexusVerge game class in `main.js` (just before the helper functions section).
- Condition floating texts (Sap, Slow, Topple, Push, Harried, Downed, Dodging) pass `delay` as a property in the notify payload — the subscriber passes it as the 4th arg to `showFloatingCombatText`.
- Note: `EffectDispatcher.buildContext()`'s `showFloatingText` still calls `window.game.showFloatingCombatText` directly rather than going through `gameState.notify` — an inconsistency with this decoupling, not yet reconciled.
