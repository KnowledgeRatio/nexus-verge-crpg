---
name: party-companion-system
description: CompanionManager API plus Phase 4a/4b CombatManager and skill/level-up party integration points
metadata:
  type: project
---

## Party / CompanionManager (implemented 2026-03-09)
- `src/systems/CompanionManager.js` — default export. Instantiate in main.js, assign to `window.game.companionManager`. No singleton exported from file.
- `initialize(seed)` — async, fetches companions.json + subscribes to `'combat.ended'`.
- `addCompanion(companion)` writes to `gameState.get('party').companions` then `gameState.set('party.companions', ...)`.
- `activeSynergies` is NOT stored in gameState data (amendment). Computed on demand by `getActiveSynergies()`, notifies `'party.activeSynergies'` for UI.
- `handlePostCombat` accepts `{ outcome }` OR bare string — always extract via `combatResult.outcome || combatResult`.
- `checkUltimata()` must be called by main.js after every long rest completion.
- `dismissCompanion(id, 'death')` adds to `gameState.data.fallenCompanions[]` with `{ name, calling, level, motivation, cause }`.
- `companions.json` duty `reactionLines` had hardcoded "Mira" — fixed to `{name}` placeholder. Always use `{name}` in reaction line strings.
- `generateSettlementCandidates()` writes to `party.candidates` (transient, not persisted).
- Only 4 relationship events are `activeInCode: true`: `winHardFight`, `fleeCowardly`, `takeAllLoot`, `companionDowned`. Others are roadmap items.

## Phase 4a CombatManager Party Changes (implemented 2026-03-10)
- `startCombat(player, enemies, companions = [])` — companions param defaults to [] (backward compatible). Filters `isDowned`, creates `Combatant(companion, 'companion', 'companion_N')`, sets `combatant.sourceCharacter = companion` for writeback.
- `Combatant` constructor now has `this.isDowned = false` and `this.sourceCharacter = null` initialized.
- `startTurn()` companion branch: `gameState.set('combat.isCompanionTurn', true)` + `gameState.set('combat.activeCompanionId', combatant.id)` + addMessage. Waits for player input.
- `endTurn()` clears `isCompanionTurn` and `activeCompanionId` at start (before processLegendaryActions).
- `updateGameState()` and `syncCombatState()` include `isCompanionTurn` and `activeCompanionId` in every full `gameState.set('combat', {...})` call. ALWAYS include these when replacing the full combat object.
- `executeEnemyAI()` targets: `[this.playerCombatant, ...(this.companionCombatants || [])].filter(c => c.hp > 0 && !c.isDowned)`.
- `handleDefeat()` companion branch: sets `isDowned = true`, writes back to `sourceCharacter.companionMeta.isDowned`, removes from `turnOrder` (NOT from `combatants` — still need them for UI). Does NOT end combat.
- `Combatant.heal(amount, combatManager = null)` — revives downed companions at newHP > 0. Re-inserts into `turnOrder` after current combatant.
- `endCombat()` emits `gameState.notify('combat.ended', { outcome })` where outcome is `'victory'` / `'tpk'` / `'fled'`. 'defeat' result maps to 'tpk'. Clears `isCompanionTurn` + `activeCompanionId` at top of endCombat.
- Call site in `main.js` `initCombatScreen()`: `const companions = gameState.get('party')?.companions || []; combatManager.startCombat(player, enemies, companions)`.

## Phase 4b Party Hooks (implemented 2026-03-10)
- `SkillChallengeManager.getSkillModifier(character, skillId, companions = [])` — backward-compatible overload. Private helpers: `_getActiveCompanions()` reads `gameState.get('party')?.companions` filtered by `!isDowned`; `_getSynergyBonus()` reads `gameState.get('party.activeSynergies')?.trueParty`.
- `LevelUpManager.confirmLevelUp(targetCharacter = null)` — when null, player path (existing). When companion passed, writes to `gameState.set('party.companions', companions)`, skips HUD update.
- `Player.js` encounter call: `partySize: Math.floor(gameState.getEffectivePartySize?.() ?? 1)` — optional chaining so solo play returns 1 when party system not yet initialized.
- `EncounterBuilder.buildMinionGroup` partySize check changed from `=== 1` to `<= 1` (safe for floored floats).
