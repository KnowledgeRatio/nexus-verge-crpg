---
name: Hearthcraft Architecture (2026-04-10)
description: Complete design for wiring Hearthcraft practice into long rest, fatigue, and party systems
type: project
---

**Fact:** Hearthcraft meal buff lives on `character.activeMealBuff` (per-character field). Applied to each party member individually. Cleared before new meal on every long rest. Persists through save/load via Character.fromJSON/toJSON.

**Why:** Party members are Character instances stored in gameState.party.companions. The cleanest save/load path is attaching the buff state to each character, not to a separate gameState key — that way companions naturally carry their own meal buff through serialisation without extra fromJSON wiring.

**How to apply:** Any system that queries an ability score or fatigue rate must check `character.activeMealBuff` before reading the base value. FatigueManager.calcMovementFatigue reads the multiplier from the buff directly.

---

## Level-keyed resolver pattern (generic utility)

`resolveLevelKeyedValue(levelKeyedObj, level)` — same algorithm used by Forgecraft's `maxModifiedItems`. Backend-dev adds this to `src/utils/practiceUtils.js`. Both Forgecraft and Hearthcraft call it.

## Mode resolution

`hearthcraft.meal.effects[0].bonusApplication.mode` is `{ "1": "uniformChoice", "6": "individualChoice" }`.
Resolved via `resolveLevelKeyedValue(modeMap, character.level)`.
The result drives which UI path opens in `openHearthcraftModal()`.

## State fields added to Character constructor

```
this.activeMealBuff = data.activeMealBuff || null;
// Shape when active:
// {
//   practiceId: 'hearthcraft',      // for ADR-010 audit trail
//   abilityScore: 'str',            // which score is boosted
//   bonusMagnitude: 1,              // from JSON, not hardcoded
//   fatigueRateMultiplier: 0.75,    // from JSON, not hardcoded
//   appliedAtRest: <timestamp>      // for debugging only, not behaviour logic
// }
```

## RestManager hook point

After `gameState.set('character', character)` at line ~279, before `this.isResting = false` at line ~292.
Emits `restCompleted` custom event with `{ type: 'long', result }` — main.js catches this and opens the Hearthcraft modal in the same block that already opens Forgecraft (lines 7621–7632).

Pattern: check `character?.practices?.includes('hearthcraft')` then `setTimeout(() => this.openHearthcraftModal(), 1000)` (500ms after Forgecraft to avoid modal stacking).

## FatigueManager change

In `calcMovementFatigue()`, after computing `conFactor` (line ~212), multiply final return value by `character.activeMealBuff?.fatigueRateMultiplier ?? 1`. One line addition. No hardcoded practice ID — the multiplier value comes from the character's buff object which was populated from JSON.

## Party application

`openHearthcraftModal()` reads party via `gameState.getFullParty()`. On confirmation:
- uniformChoice: iterate `getFullParty()`, set `member.activeMealBuff` with same abilityScore for all
- individualChoice: UI shows one choice per party member in sequence; each member gets their own abilityScore

`applyHearthcraftBuff(member, chosenScore, practiceData)` is a shared helper that:
1. Clears existing `member.activeMealBuff` (if any) from ability totals
2. Sets `member.activeMealBuff` from the practice JSON data (no hardcoded values)
3. Calls `gameState.set('character', member)` for player; for companions uses `gameState.set('party.companions', [...])` via standard companion update path

## Clear-before-apply pattern

`applyHearthcraftBuff()` must clear any previous buff before writing the new one. This handles the "replaces previous meal" semantic from the JSON. Clearing only touches `member.activeMealBuff = null` — ability scores are stored as base values in `character.abilities`, so the buff is applied as a display/modifier overlay, not a mutation of the base score. See schema decision below.

## Buff application model (IMPORTANT)

Do NOT mutate `character.abilities.str` etc. The meal buff is an additive modifier read at the point of use. Systems that need the buffed score call a helper `getBuffedAbility(character, abilityKey)` which returns `character.abilities[abilityKey] + (character.activeMealBuff?.abilityScore === abilityKey ? character.activeMealBuff.bonusMagnitude : 0)`. This avoids the "buff stacked on top of buff" desync that happens when you mutate base scores and then fail to undo them on the next rest.

## Save/load compatibility

`activeMealBuff` is a plain object — no Map, no class instance. Serialises cleanly via existing `Character.toJSON()` spread pattern. `Character.fromJSON()` restores it via `data.activeMealBuff || null`. No migration needed for old saves (null default is correct — no active meal).

## ADR-010 compliance

The trigger in main.js checks `character?.practices?.includes('hearthcraft')` — this is a practice membership check (equivalent to Forgecraft's existing pattern) not an ability ID check. The modal logic reads all effect values from `this.practicesData`. No hardcoded practice-specific numbers appear in JS code. The `fatigueRateMultiplier` value `0.75` lives only in `data/practices.json`.
