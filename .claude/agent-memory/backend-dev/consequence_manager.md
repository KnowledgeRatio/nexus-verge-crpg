---
name: consequence-manager
description: ConsequenceManager singleton — world-tag-driven delayed consequence events for settlements
metadata:
  type: project
---

## ConsequenceManager (implemented 2026-05-06)
- `src/systems/ConsequenceManager.js` — singleton default export (`consequenceManager`). Imported in main.js, exposed as `window.consequenceManager` inside `setupQuestSystem()`.
- ADR-010 compliant: `_eventHandlers` and `_flagHandlers` maps keyed by type strings. No quest ID branching anywhere.
- `queueConsequenceForTag(worldTag, quest)` — called by QuestManager.completeQuest() AFTER worldTag is written to modifiedTiles. Maps worldTag → eventType via `_tagToEvent`. Positive tags ('safer', 'cleansed') produce null → no event queued.
- `queueConsequence(eventType, payload)` — used by DungeonManager time-limit failure path. Payload must have `targetSettlementId` or `sourceSettlementId`.
- `onEnterSettlement(settlement)` — called at top of SettlementManager.enterSettlement() AFTER `_restoreSettlementFromPersistent()`. Increments `world.visitCount` (global) and `settlement.localVisitCount` (local). Returns array of active flag effects.
- Settlement ID convention: `"${x},${y}"` — same as WorldGenerator.persistSettlementData(). ConsequenceManager sets `settlement.id` if missing.
- Local vs global counter: vengeance/attention/reputationBleed use `useLocalCounter: true` (per-settlement). Escalation/unintendedConsequence use global.
- Event processing guard: `counter < (expiresAtVisitCount - visitWindow)` = not yet due. Event fires when counter >= that threshold. Prune when `counter >= expiresAtVisitCount` (expired unprocessed).
- `_persistSettlement(settlement)` — writes mutated settlement back to `world.settlements[]`. Called after `onEnterSettlement()` and `resolveFlag()`.
- `SettlementManager._restoreSettlementFromPersistent(settlement)` — reads flags/localVisitCount/merchantLocked/sacked from `world.settlements[]` back onto live region feature before ConsequenceManager runs.
- `WorldGenerator.persistSettlementData()` — includes `flags`, `localVisitCount`, `merchantLocked`, `sacked` in the push block (update block uses spread so already covered).
- Merchant lock gate: `SettlementUI.js` case 'trade' — checks `gameState.get('ui.currentSettlement')?.merchantLocked` before opening trading modal. SettlementUI uses global `gameState` (no ES module import — assigned to `window.gameState` in main.js).
- `_handleQuestFailure` reads `event.payload?.flagToApply || event.flagToApply` — handles both new ConsequenceManager-routed events AND legacy DungeonManager direct-write format.
- One cascade level enforced by architecture: Vengeance → Sack is future work; Sack handler itself doesn't queue further events.
