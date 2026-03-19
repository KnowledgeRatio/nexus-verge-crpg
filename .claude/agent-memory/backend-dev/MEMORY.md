# Backend Dev Memory — Nexus Verge

## Key Architecture Facts
- Characters from gameState are plain objects (no class methods). Use standalone helpers in main.js for calculations (e.g. `calculateACForCharacter`).
- `monster.challengeRating` is the field (NOT `monster.cr`). Always check both.
- `Combatant.hasAction(type)` is a method — checks `this.actions[type] > 0`. No `hasBonusAction` property.
- Dice imports: `rollDice, rollD20, roll` from `../utils/dice.js`. No `rollWithAdvantage` — implement manually with two `rollD20()` calls.

## Established Patterns
- After modifying character in any system, always `gameState.set('character', character)` and call `this.updateHUD(character)`.
- Campaign filtering: every JSON data entry needs `"campaignIds": ["core"]`.
- Formula variable collision bug: sort replacement variables longest-first to prevent substring matches (e.g. `difficultyMultiplier` before `difficulty`).
- `consumeAction(type)` / `hasAction(type)` are the Combatant API. Pass `{ consumeAction: false }` to `attack()` for free attacks (opportunity, cleave, etc.).

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
- `disengage(combatant)` — new CombatManager method. Clears `engagedWith`, applies `'disengaged'` condition (`untilStartOfTurn`). Wanderlust L2+ can use as bonus action.
- OA filter in `resolveFleeOpportunityAttacks()`: `combatant.engagedWith.has(c.id) && !this.isRangedCombatant(c) && !c.hasCondition('pushed')`.
- RULES config: `RULES.combat.disengage` block; `RULES.flee.pushBreaksEngagement = false`; `RULES.flee.hitRequiredToReEngage = true`.
- `toJSON()` on Combatant now includes `engagedWith: Array.from(this.engagedWith)`.

## monsters.json attackType field
All monsters now have `attackType`: `"melee"`, `"ranged"`, or `"both"`.
- `"ranged"` only: flameskull (Fire Ray)
- `"both"`: skeleton, bandit, kobold, scout, spy, ogre, wight, veteran, hill giant, all dragons, goblinArcher, banditCrossbowman, manticore, mage, medusa
- Everything else: `"melee"`

## monsters.json preferRanged field (added 2026-03-07)
- `"preferRanged": true` on monster data makes the AI lead with rangedWeaponAttack actions.
- Implemented in `executeMonsterActions()` in CombatManager.js — builds `orderedActions` with ranged first, melee as fallback.
- The field is read from `combatant.character?.preferRanged` (character is the raw monster data object).
- monsters.json schema: `armorClass` (not `ac`), `hitPoints` as dice string (e.g. `"2d6"`), range as `{ "normal": N, "long": N }`, action type `"rangedWeaponAttack"` or `"meleeWeaponAttack"`.
- Level gating lives ONLY in `rulesEngine.js` `enemyTypesByLevel` — monsters.json has NO level field.

## Ammunition System (implemented 2026-03-08)
- `ammoCapacity` field on ranged weapon items.json entries is the magazine size (shortbow/longbow=20, crossbows=15, heavyCrossbow=10).
- `ammoCount` is set at runtime on the equipped weapon object (initialized lazily from `ammoCapacity ?? 20` on first attack).
- Ammo check block goes BEFORE the push restriction check in `attack()` (returns early if 0). Decrement goes AFTER all mastery/condition blocks, BEFORE `consumeAction`.
- Only the player's ammoCount is persisted to gameState (`attacker.id === 'player'`). Monster ammo is not tracked.
- Consumable `quiverOfArrows` (`effect: "refillAmmo"`, `charges: 20`) in items.json consumables array. Frontend must handle `effect === "refillAmmo"` to set `weapon.ammoCount = weapon.ammoCapacity ?? 20`.
- Forgecraft practice check in `Character.longRest()`: if `this.practices?.includes('forgecraft')` and mainHand is ranged, refills to `ammoCapacity ?? 20`.
- `handCrossbow` and `heavyCrossbow` added as full weapon entries in items.json (they were only referenced in weaponMasteries.json/classes.json before).

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

## Terrain Lookup Pattern (combat / HUD)
- `worldGenerator.getCachedTile(x, y)` — sync, returns tile from cache or null.
- `worldGenerator.terrainTypes` — the parsed terrains.json object (has `.terrains` array).
- `worldGenerator.terrainData` is used in some older main.js code — same object, different alias; prefer `terrainTypes` when inside systems.

## Phase 4a CombatManager Party Changes (implemented 2026-03-10)
- `startCombat(player, enemies, companions = [])` — companions param defaults to [] (backward compatible). Filters `isDowned`, creates `Combatant(companion, 'companion', 'companion_N')`, sets `combatant.sourceCharacter = companion` for writeback.
- `Combatant` constructor now has `this.isDowned = false` and `this.sourceCharacter = null` initialized.
- `startTurn()` companion branch: `gameState.set('combat.isCompanionTurn', true)` + `gameState.set('combat.activeCompanionId', combatant.id)` + addMessage. Waits for player input.
- `endTurn()` clears `isCompanionTurn` and `activeCompanionId` at start (before processLegendaryActions).
- `updateGameState()` and `syncCombatState()` now include `isCompanionTurn` and `activeCompanionId` in every full `gameState.set('combat', {...})` call. ALWAYS include these when replacing the full combat object.
- `executeEnemyAI()` targets: `[this.playerCombatant, ...(this.companionCombatants || [])].filter(c => c.hp > 0 && !c.isDowned)`.
- `handleDefeat()` companion branch: sets `isDowned = true`, writes back to `sourceCharacter.companionMeta.isDowned`, removes from `turnOrder` (NOT from `combatants` — still need them for UI). Does NOT end combat.
- `Combatant.heal(amount, combatManager = null)` — revives downed companions at newHP > 0. Re-inserts into `turnOrder` after current combatant.
- `endCombat()` emits `gameState.notify('combat.ended', { outcome })` where outcome is `'victory'` / `'tpk'` / `'fled'`. 'defeat' result maps to 'tpk'. Clears `isCompanionTurn` + `activeCompanionId` at top of endCombat.
- Call site in `main.js` `initCombatScreen()`: `const companions = gameState.get('party')?.companions || []; combatManager.startCombat(player, enemies, companions)`.

## Phase 4b Party Hooks (implemented 2026-03-10)
- `SkillChallengeManager.getSkillModifier(character, skillId, companions = [])` — backward-compatible overload. Import RULES added. Private helpers: `_getActiveCompanions()` reads `gameState.get('party')?.companions` filtered by `!isDowned`; `_getSynergyBonus()` reads `gameState.get('party.activeSynergies')?.trueParty`.
- `LevelUpManager.confirmLevelUp(targetCharacter = null)` — when null, player path (existing). When companion passed, writes to `gameState.set('party.companions', companions)`, skips HUD update.
- `Player.js` encounter call: `partySize: Math.floor(gameState.getEffectivePartySize?.() ?? 1)` — uses optional chaining so solo play returns 1 when party system not yet initialized.
- `EncounterBuilder.buildMinionGroup` partySize check changed from `=== 1` to `<= 1` (safe for floored floats).

## Fatigue System (implemented 2026-03-16)
- `src/systems/FatigueManager.js` — pure-function module, no class. Exports: `getFatigueState`, `getThresholdName`, `getFatigueModifiers`, `addFatigue`, `removeFatigue`, `applyLongRestFatigue`, `calcMovementFatigue`.
- `gameState.get('fatigue')` holds: `{ current, exhaustionLevels, supplies, suppliesZeroStreak, lastThreshold }`.
- `applyLongRestFatigue()` returns `{ hpRecoveryMultiplier, exhaustionCleared, suppliesConsumed, exhaustionGained }`. When `hpRecoveryMultiplier < 1`, HP cap must OVERWRITE the full restore (set AFTER `character.currentHP = character.maxHP`).
- `RULES.fatigue.enabled` guards all fatigue code — always check this flag before reading fatigue state in UI.
- Rest modal supplies display: uses IIFE `(() => { ... })()` pattern inside template literal to call `getFatigueState()` only when `RULES.fatigue.enabled` is true.
- `_updateFatigueHUD()` in FatigueManager calls `window.game?.updateFatigueHUD()` — frontend must implement this method.

## User Preferences
- Do NOT run git commits. User manages all commits through GitHub.

## Files & Locations
- Rules engine: `src/core/rulesEngine.js` — all tunable values go here
- Combat system: `src/systems/CombatManager.js` — Combatant class at bottom of file (~line 1730+)
- Monster data: `data/monsters.json`
- Plans/designs: `docs/plans/YYYY-MM-DD-topic.md`
