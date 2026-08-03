---
name: monsters-data-schema
description: monsters.json field conventions — attackType, preferRanged, level gating location
metadata:
  type: project
---

## monsters.json attackType field
All monsters have `attackType`: `"melee"`, `"ranged"`, or `"both"`.
- `"ranged"` only: flameskull (Fire Ray)
- `"both"`: skeleton, bandit, kobold, scout, spy, ogre, wight, veteran, hill giant, all dragons, goblinArcher, banditCrossbowman, manticore, mage, medusa
- Everything else: `"melee"`

## monsters.json preferRanged field (added 2026-03-07)
- `"preferRanged": true` on monster data makes the AI lead with rangedWeaponAttack actions.
- Implemented in `executeMonsterActions()` in CombatManager.js — builds `orderedActions` with ranged first, melee as fallback.
- The field is read from `combatant.character?.preferRanged` (character is the raw monster data object).
- monsters.json schema: `armorClass` (not `ac`), `hitPoints` as dice string (e.g. `"2d6"`), range as `{ "normal": N, "long": N }`, action type `"rangedWeaponAttack"` or `"meleeWeaponAttack"`.
- Level gating lives ONLY in `rulesEngine.js` `enemyTypesByLevel` — monsters.json has NO level field.
