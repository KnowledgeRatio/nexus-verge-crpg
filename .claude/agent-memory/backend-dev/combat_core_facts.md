---
name: combat-core-facts
description: Core CombatManager/Character API facts and established patterns (action economy, dice imports, gameState persistence)
metadata:
  type: project
---

## Key Architecture Facts
- Characters from gameState are plain objects (no class methods). Use standalone helpers in main.js for calculations (e.g. `calculateACForCharacter`).
- `monster.challengeRating` is the field (NOT `monster.cr`). Always check both.
- `character.abilities` is the ability-SCORE bag (`{str,dex,con,int,wis,cha}`) — never `.find()` on it. To look up a full ability definition by ID at combat time, use `CombatManager._findKnownAbility(character, abilityId)`. See [[fix-findknownability-bug]] for the live-bug history and the on-hit-context gotcha (`buildContext()` output is missing `attacker`/`defender`/`resolveSpent` — always add manually for on-hit handlers).
- `Combatant.hasAction(type)` is a method — checks `this.actions[type] > 0`. No `hasBonusAction` property.
- Dice imports: `rollDice, rollD20, roll` from `../utils/dice.js`. No `rollWithAdvantage` — implement manually with two `rollD20()` calls.

## Established Patterns
- After modifying character in any system, always `gameState.set('character', character)` and call `this.updateHUD(character)`.
- Campaign filtering: every JSON data entry needs `"campaignIds": ["core"]`.
- Formula variable collision bug: sort replacement variables longest-first to prevent substring matches (e.g. `difficultyMultiplier` before `difficulty`).
- `consumeAction(type)` / `hasAction(type)` are the Combatant API. Pass `{ consumeAction: false }` to `attack()` for free attacks (opportunity, cleave, etc.).

## User Preferences
- Do NOT run git commits. User manages all commits through GitHub.

## Files & Locations
- Rules engine: `src/core/rulesEngine.js` — all tunable values go here
- Combat system: `src/systems/CombatManager.js` — Combatant class at bottom of file (~line 1730+)
- Monster data: `data/monsters.json`
- Plans/designs: `docs/plans/YYYY-MM-DD-topic.md`
