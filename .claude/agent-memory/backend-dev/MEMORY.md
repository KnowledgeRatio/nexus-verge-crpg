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

## Flee Mechanic (implemented 2026-03-04)
- Formula: `d20 + max(DEX mod, WIS mod) + proficiency >= DC`
- DC: `10 + 2*(engagedCount-1)`, capped at 25. See `RULES.flee` for all modifiers.
- `hasEngaged = true` is set on `Combatant` when a melee attack is MADE (not just hit). Set right after the push restriction check in `attack()`.
- `isRangedCombatant(combatant)`: checks equipped weapon first, then `character.attackType` field. `"both"` returns false (has melee capability).
- Opportunity attacks use `{ consumeAction: false, isOpportunityAttack: true }` — does NOT consume the attacker's action.
- DO NOT use `combatant.initiative` as a modifier — it is a fully-rolled value (d20 + DEX). Always use `combatant.character.abilityModifiers.dex` directly.
- Wanderlust Cunning Action flee uses bonus action instead of action (same roll, no advantage).

## monsters.json attackType field
All monsters now have `attackType`: `"melee"`, `"ranged"`, or `"both"`.
- `"ranged"` only: flameskull (Fire Ray)
- `"both"`: skeleton, bandit, kobold, scout, spy, ogre, wight, veteran, hill giant, all dragons
- Everything else: `"melee"`

## Files & Locations
- Rules engine: `src/core/rulesEngine.js` — all tunable values go here
- Combat system: `src/systems/CombatManager.js` — Combatant class at bottom of file (~line 1730+)
- Monster data: `data/monsters.json`
- Plans/designs: `docs/plans/YYYY-MM-DD-topic.md`
