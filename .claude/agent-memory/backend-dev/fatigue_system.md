---
name: fatigue-system
description: FatigueManager pure-function module API and long-rest HP recovery interaction
metadata:
  type: project
---

## Fatigue System (implemented 2026-03-16)
- `src/systems/FatigueManager.js` — pure-function module, no class. Exports: `getFatigueState`, `getThresholdName`, `getFatigueModifiers`, `addFatigue`, `removeFatigue`, `applyLongRestFatigue`, `calcMovementFatigue`.
- `gameState.get('fatigue')` holds: `{ current, exhaustionLevels, supplies, suppliesZeroStreak, lastThreshold }`.
- `applyLongRestFatigue()` returns `{ hpRecoveryMultiplier, exhaustionCleared, suppliesConsumed, exhaustionGained }`. When `hpRecoveryMultiplier < 1`, HP cap must OVERWRITE the full restore (set AFTER `character.currentHP = character.maxHP`).
- `RULES.fatigue.enabled` guards all fatigue code — always check this flag before reading fatigue state in UI.
- Rest modal supplies display: uses IIFE `(() => { ... })()` pattern inside template literal to call `getFatigueState()` only when `RULES.fatigue.enabled` is true.
- `_updateFatigueHUD()` in FatigueManager calls `window.game?.updateFatigueHUD()` — frontend must implement this method.
