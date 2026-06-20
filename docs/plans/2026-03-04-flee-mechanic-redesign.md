# Flee Mechanic Redesign
**Date:** 2026-03-04
**Status:** Approved — Ready for Implementation
**Branch:** main-beta-quests

---

## Problem with Current System

- `d20 + combatant.initiative vs DC 30` — double-random (initiative is already a d20 roll)
- DC 30 is hardcoded in CombatManager.js, not in rulesEngine.js (violates ADR-000)
- ~10-20% success for martial builds — flee is a trap, not a choice
- No opportunity attacks — no cost for attempting flee
- Flee button never disabled when Action is spent (UI bug)
- No condition interactions despite conditions system existing

---

## Final Design

### Check Formula

```
d20 + max(DEX modifier, WIS modifier) + proficiency bonus >= DC
```

**Why DEX or WIS:** Physical agility (DEX) OR tactical intuition (WIS) — whichever is stronger. Mirrors finesse weapon logic. Makes Scholar viable at fleeing via WIS without needing to be fast.

### DC Formula

```
DC = 10 + 2 * (engaged_enemies - 1) + situational modifiers
```

**Key: only `engaged_enemies` count toward DC** — see Engagement below.

### DC Table

| Engaged Enemies | Base DC | + Boss (+5) | + Ambush R1 (+3) |
|---|---|---|---|
| 1 | 10 | 15 | 13 |
| 2 | 12 | 17 | 15 |
| 3 | 14 | 19 | 17 |
| DC cap | — | — | 25 |

### Success Probability (standard, no advantage)

| Level | Prof | Calling | Flee Mod | vs DC 10 | vs DC 12 | vs DC 14 |
|---|---|---|---|---|---|---|
| 1 | +2 | Dedication (WIS +1) | +3 | 70% | 60% | 50% |
| 1 | +2 | Scholar (WIS +2) | +4 | 75% | 65% | 55% |
| 1 | +2 | Wanderlust (DEX +3) | +5 | 80% | 70% | 60% |
| 5 | +3 | Dedication (WIS +1) | +4 | 75% | 65% | 55% |
| 5 | +3 | Scholar (WIS +2) | +5 | 80% | 70% | 60% |
| 5 | +3 | Wanderlust (DEX +3) | +6 | 85% | 75% | 65% |
| 10 | +4 | Dedication (WIS +2) | +6 | 85% | 75% | 65% |
| 10 | +4 | Scholar (WIS +2) | +6 | 85% | 75% | 65% |
| 10 | +4 | Wanderlust (DEX +4) | +8 | 95% | 85% | 75% |

---

## Engagement System

### Rule
Only enemies that have made at least one melee attack (against anyone) during this combat get an opportunity attack and count toward the flee DC.

### Implementation
Add `hasEngaged: false` to each Combatant on creation.
Set `hasEngaged = true` on any combatant the moment they make a melee attack.

### Why This Matters
- **Round 1 flee (before anything has attacked):** Zero opp attacks, DC 10 (1 enemy). Clean escape with ~70-80% success. Correct — you spotted the threat and bolted.
- **Mid-combat flee:** Enemies that have been trading blows are engaged. Enemies that haven't acted yet are not.
- **Thematic:** A wolf circling at the edge hasn't committed. The bugbear that just hit you has.

---

## Opportunity Attacks

### Rules
- Every **engaged** enemy with a **melee attack type** makes one opportunity attack
- Attacks resolve **before** the flee check (always happens, win or lose)
- Standard attack roll: enemy's `attackBonus` vs player AC, normal damage
- Crits and misses apply normally
- **No HP floor** — opportunity attacks can kill you. Fleeing at 1 HP vs 3 engaged enemies is a genuine death gamble.

### Ranged Enemies
- Ranged-only enemies: **no opportunity attack**, but still count toward DC if engaged
- Mixed enemies (melee + ranged): use melee attack for opportunity attack

---

## Monster Attack Type Classification

Add `attackType` field to all entries in `monsters.json`:

| Value | Meaning |
|---|---|
| `"melee"` | Natural melee attacker (wolf, rat, zombie). Gets opp attack. |
| `"ranged"` | Natural ranged attacker. Counts toward DC but no opp attack. |
| `"both"` | Has both (dragon: claws + breath). Uses melee for opp attack. |

Weapon-wielding monsters: check `equipment.mainHand.weaponType` first, fall back to `attackType`.

Implement as `isRangedCombatant(combatant)` utility in CombatManager:
1. If equipped mainHand weapon exists → check `weaponType === 'ranged'`
2. Else → check `combatant.character.attackType` (from monster data)
3. Default to melee if undefined

---

## Wanderlust Cunning Action (Level 2+)

| Property | Standard Flee | Cunning Action Flee |
|---|---|---|
| Action cost | Action | **Bonus Action** |
| Check | d20 + max(DEX,WIS) + prof | d20 + max(DEX,WIS) + prof (same roll) |
| Opportunity attacks | All engaged melee enemies attack | Same — **opp attacks still apply** |
| Can attack same turn | No | **Yes** (action unused) |

The differentiator is action economy only — Wanderlust can attack AND flee in the same turn. The check itself is identical. Advantage was dropped as it would trivialise the escape; the Bonus Action cost is the class perk.

---

## Condition Interactions

| Condition | Effect |
|---|---|
| Restrained, Grappled, Stunned, Paralyzed, Unconscious | **Blocks flee entirely** |
| Prone | **Disadvantage** on flee check |
| Frightened | **Advantage** on flee check |

Advantage + Disadvantage cancel per 5e RAW (straight roll).

---

## Per-Encounter Overrides

Fields on encounter/combat data objects:

| Field | Type | Effect |
|---|---|---|
| `unfleeable: true` | bool | Flee button disabled. Show `fleeDescription`. |
| `fleeModifier: N` | number | Added to DC (positive = harder, negative = easier) |
| `fleeDescription: "..."` | string | Custom message when flee blocked or attempted |

---

## RULES.flee Configuration Block

Add to `src/core/rulesEngine.js`:

```javascript
flee: {
    enabled: true,
    baseDC: 10,
    dcPerExtraEnemy: 2,
    dcCapMax: 25,
    bossDCBonus: 5,
    ambushDCBonus: 3,
    ambushRoundLimit: 1,
    modifier: ['dex', 'wis'],          // take max of these
    addProficiency: true,
    actionCost: 'action',
    opportunityAttacks: {
        enabled: true,
        requiresEngaged: true,          // only engaged enemies attack
        requiresMelee: true,            // only melee enemies attack
        resolveBeforeCheck: true
    },
    blockingConditions: ['restrained', 'grappled', 'stunned', 'paralyzed', 'unconscious'],
    disadvantageConditions: ['prone'],
    advantageConditions: ['frightened'],
    cunningAction: {
        callingId: 'wanderlust',
        levelRequired: 2,
        actionCost: 'bonusAction'
        // No advantage — bonus action cost is the differentiator
    },
    rangedHarassmentAttacks: false     // dormant — enable if ranged flee becomes dominant
}
```

---

## UI Changes (main.js)

1. **Disable flee button** when no Action available — add `${!hasAction ? 'disabled' : ''}` matching pattern of Attack/Dodge/Spell
2. **Tooltip** shows: `"DC [X] — [N] enemies will attack before this resolves"`
3. **Cunning Action Flee button** for Wanderlust L2+ with Bonus Action available
4. **Blocking condition message**: `"You cannot flee while [condition]!"`
5. **Unfleeable message**: show `encounter.fleeDescription` if set

---

## Files to Change

| File | Change |
|---|---|
| `src/core/rulesEngine.js` | Add `RULES.flee` block |
| `src/systems/CombatManager.js` | Add `hasEngaged` to Combatant; add `isRangedCombatant()`; rewrite `flee()`; set `hasEngaged = true` on melee attacks |
| `data/monsters.json` | Add `attackType` field to all monsters |
| `src/main.js` | Fix flee button disabled state; update tooltip; add Cunning Action flee button |

---

## Implementation Notes for Backend Dev

- **DO NOT use `combatant.initiative`** for the flee modifier — that is the full rolled initiative value (d20 + DEX), not a modifier. Use `combatant.character.abilityModifiers.dex` and `combatant.character.abilityModifiers.wis` directly.
- `hasEngaged` must be set on the first melee attack in both player and enemy attack flows
- `isRangedCombatant()` must be a named method (will be reused for archer AI later)
- Opportunity attacks during flee use the same attack resolution path as normal attacks
- Opp attacks can reduce player to 0 HP — handle death/unconscious state before flee check resolves

---

## Design Notes

- Flee is a **roguelike tension engine**, not a safety net. Round 1 escape from an unknown threat is easy and fast. Escape from an engaged 3-enemy fight is a gamble that could accelerate your death.
- Scholar surviving via WIS (tactical read) not DEX (speed) is intentional calling identity.
- The `hasEngaged` system eliminates the need for an artificial HP floor — early flee is naturally safe, late flee is naturally risky.
- `rangedHarassmentAttacks: false` is a dormant flag. Enable in rulesEngine if playtest shows ranged encounter flee becomes a dominant strategy.
