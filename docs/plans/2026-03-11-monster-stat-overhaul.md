# Monster Stat Overhaul — Calculated Attacks & Proper HP
**Date:** 2026-03-11
**Status:** Implemented (verified 2026-09-08) — `RULES.combat.monsterProficiencyByCR` and `RULES.monsterHP` are live in `src/core/rulesEngine.js`. Companion doc: `docs/plans/2026-03-11-monster-stat-overhaul-impl.md`.

---

## Problem

Monster attack bonuses and damage are hardcoded in `monsters.json` action blocks (`attackBonus: 4`, `damage: "1d6+2"`). They are not derived from the monster's ability scores or CR-based proficiency. This means:

- Ranged enemies are silently weakened by asymmetric cover with no way to compensate
- Monsters don't benefit from weapon-system improvements (e.g., finesse, damage dice changes)
- HP is not calculated consistently at spawn (formula exists but handling is unclear)
- Stale/redundant fields accumulate in the JSON

---

## Design

### Monster Action Schema

**Two action types — hybrid approach:**

**Humanoid / weapon-wielding monsters** — reference `items.json`:
```json
{
  "name": "Scimitar",
  "type": "meleeWeaponAttack",
  "weaponId": "scimitar"
}
```
System looks up the weapon, reads damage dice, properties (finesse, ranged, thrown, etc.). All weapon property logic reuses the existing player attack code path.

**Natural attacks (beasts, boss abilities)** — inline damage, no weaponId:
```json
{
  "name": "Bite",
  "type": "meleeWeaponAttack",
  "damage": "1d6",
  "damageType": "piercing"
}
```

**Fields removed from all actions:**
- `attackBonus` — no longer hardcoded, always calculated at runtime
- `damage` — removed from `weaponId` actions (comes from weapon lookup); kept on natural attacks

---

### Ability Score Resolution

Ability used for attack bonus and damage bonus:

| Attack type | Default | `finesse: true` | `thrown: true` |
|---|---|---|---|
| Melee weapon (`weaponId`) | weapon `properties` | weapon `properties` | — |
| Ranged weapon (`weaponId`) | weapon `properties` | weapon `properties` | — |
| Natural melee | STR | max(STR, DEX) | — |
| Natural ranged | DEX | — | STR |

For `weaponId` actions, all property flags (finesse, thrown, ranged) come from the weapon's own `properties` array in `items.json` — same resolution logic as player attacks.

For natural attacks, `finesse` and `thrown` can be set directly on the action:
```json
{ "name": "Claw", "type": "meleeWeaponAttack", "damage": "1d6", "damageType": "slashing", "finesse": true }
{ "name": "Boulder", "type": "rangedWeaponAttack", "damage": "3d6", "damageType": "bludgeoning", "thrown": true }
```

---

### Proficiency Bonus by CR

Added to `rulesEngine.js` under `RULES.combat`:

```javascript
monsterProficiencyByCR: {
    0: 2, 0.125: 2, 0.25: 2, 0.5: 2,
    1: 2, 2: 2, 3: 2, 4: 2,
    5: 3, 6: 3, 7: 3, 8: 3,
    9: 4, 10: 4
}
```

Runtime formula:
```
attackBonus = abilityMod + monsterProficiencyByCR[monster.challengeRating]
damageBonus = abilityMod
```

---

### HP Calculation

**Default: rolled on spawn** (roguelike feel — every encounter feels fresh).
**Toggle: average HP** available in worldbuilder settings for players who want predictability.
**Difficulty multipliers** applied after roll or average, then `floor()`, minimum 1.

```javascript
// rulesEngine.js
monsterHP: {
    roll: true,
    difficultyMultipliers: {
        easy:   0.75,
        normal: 1.0,
        hard:   1.25,
        deadly: 1.5
    }
}
```

Worldbuilder toggle:
```javascript
// worldConfig
useAverageMonsterHP: false  // true = skip rolling, use average
```

Spawn flow:
1. Parse `hitPoints` formula (e.g., `"2d8+6"`)
2. Roll dice OR calculate `floor(dice × (sides/2 + 0.5)) + flat`
3. Multiply by `difficultyMultipliers[difficulty]`
4. `floor()`, clamp to minimum 1

---

### Monster Abilities (Framework Only)

Monsters have their own abilities and spells — separate from player callings. This is intentional: monster abilities are what make encounters surprising and bosses feel monstrous.

Each monster gets an `abilities: []` array stub. Not all monsters will have entries. Implementation of specific abilities is deferred — the schema is established now so it can be populated incrementally.

```json
{
  "id": "wraith",
  "abilities": [
    { "id": "life_drain", "name": "Life Drain", "implemented": false }
  ]
}
```

---

## Migration Checklist

### `monsters.json` — all 15 monsters

| Monster | Action changes |
|---|---|
| Goblin, Orc, Bandit, Bugbear, Veteran | Add `weaponId`, remove `attackBonus` + `damage` |
| Wolf, Giant Rat, Werewolf | Remove `attackBonus`, keep inline damage, add `finesse`/`thrown` where appropriate |
| Wraith, Ghoul, Skeleton, Zombie | Remove `attackBonus`, keep inline damage, add `abilities: []` stub |
| Mage, Medusa, Manticore | Mixed — weapon actions get `weaponId`, natural/spell attacks stay inline; add `abilities: []` stub |
| Goblin Archer, Bandit Crossbowman | Add `weaponId` for ranged weapons, remove `attackBonus` + `damage` |
| Ogre | Greatclub → `weaponId`, Javelin → `weaponId` (thrown), remove hardcoded fields |

### `rulesEngine.js`
- Add `RULES.combat.monsterProficiencyByCR` table
- Add `RULES.monsterHP` block (roll flag + difficulty multipliers)

### `src/core/GameState.js` / worldbuilder config
- Add `useAverageMonsterHP: false` to worldConfig defaults

### `src/systems/CombatManager.js`
- Rewrite `executeMonsterAttack()` to calculate `attackBonus` at runtime
- Add weapon lookup from items.json cache for `weaponId` actions
- Move HP calculation to monster spawn (wherever enemies are instantiated for an encounter)

### JSON cleanup (remove stale fields)
- Strip `attackBonus` from all action blocks
- Strip `damage` from all `weaponId` action blocks
- Remove any other orphaned fields found during migration pass

---

## What Doesn't Change

- Monster `abilities` array (ability scores) — already correct, stays as-is
- Monster `armorClass` — stays hardcoded (intentional per stat block)
- `preferRanged: true` flag — kept, still drives action selection order
- `challengeRating` — stays, now also drives proficiency lookup
- `hitPoints` formula string — stays, now properly parsed at spawn
