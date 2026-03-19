# Dedication Calling: Full 1-10 Progression

**Date:** 2026-02-26
**Status:** Design Draft — Partially Implemented
**Participants:** Game Designer (Crawford persona) + Project Lead

---

## Summary

Complete level 1-10 progression for the Dedication calling with two specializations (Exemplar, Oath), a choice-driven leveling system, and a new "Practice" mechanic inspired by LotR 5e Crafts.

---

## Core Resource: Resolve (CON-based)

- **Pool:** CON mod + level (min 1)
- **Recharge:** Full on short rest
- **Arrives at:** Level 3 (with spec choice — no pool without spenders)
- **Renamed from:** Stamina → Focus → Resolve

See [resource-system-redesign.md](2026-02-25-resource-system-redesign.md) for full resource economy.

---

## Progression Framework

### Terminology

| Term | Definition |
|------|-----------|
| **Trait** | Passive. Always on once taken. No resource cost. |
| **Ability** | Active. Costs Resolve, or limited uses (SR/LR). Player activates. |
| **Practice** | Utility craft/discipline. Non-combat capability. `-craft` naming convention. |

### Level-by-Level

| Lvl | Tier | Grants | Choice? |
|-----|------|--------|---------|
| 1 | Adventurer | Fighting Style + Steady Nerve | Choose 1 Fighting Style |
| 2 | Adventurer | Action Surge + Practice | Choose 1 Practice |
| 3 | Master | Spec choice + Resolve pool + Spec Trait (auto) | Choose Exemplar or Oath |
| 4 | Master | Spec/Class Ability | Choose 1 from spec + shared pool |
| 5 | Master | Extra Attack | Auto-grant |
| 6 | Master | Trait OR Practice | Choose from trait pool OR take another practice |
| 7 | Legend | Spec/Class Ability | Choose 1 from spec + shared pool |
| 8 | Legend | Trait | Choose 1 from trait pool |
| 9 | Legend | Capstone Ability | Choose 1 from: 2 spec + 1 shared |
| 10 | Myth | Capstone Trait | Choose 1 from: 2 spec + 1 shared |

---

## Practices

Utility disciplines available to all callings (some may be calling-exclusive). Named with `-craft` suffix.

### Forgecraft (IMPLEMENTED in practices.json)

Equipment modification. Apply mods to weapons, armor, and shields during long rest.

- **1 mod per item max**
- **Maintain 1 modified item at L2, 2 at L6**
- **Persists until swapped at next long rest**

**Armor Mods:**

| Mod | Level | Effect |
|-----|-------|--------|
| Tailored | 2 | Max DEX mod for AC +1 |
| Adaptive | 2 | Crits against you count as normal hits |
| Reinforced | 6 | +1 AC |

**Shield Mods:**

| Mod | Level | Effect |
|-----|-------|--------|
| Optimised | 2 | +1 AC (shield becomes +3 total) |
| Deflecting | 2 | 1/SR reaction: add shield AC to a saving throw |

**Weapon Mods:**

| Mod | Level | Effect |
|-----|-------|--------|
| Keen | 2 | Crit range 19-20 |
| Tempered | 2 | +1 damage rolls |
| Balanced | 6 | +1 attack rolls |

### Other Practices (Concepts — Not Yet Implemented)

| Practice | Fantasy | Core Benefit |
|----------|---------|-------------|
| Hearthcraft | Cooking/food preparation | Meals during rest grant temporary buffs |
| Lorecraft | Beast/monster knowledge | Reveal enemy stats, know vulnerabilities |
| Wardcraft | Protective preparations | Prevent surprise, reduce first-hit damage |
| Fieldcraft | Foraging/survival | Find rations, herbs, rare ingredients |
| Warcraft | Tactical preparation | Initiative bonuses, battlefield reads |

---

## Auto-Granted Features (No Choice)

### Level 1

**Fighting Style** — Choose 1:

| Style | Effect |
|-------|--------|
| Defense | +1 AC while wearing armor |
| Dueling | +2 damage one-handed melee, off-hand empty |
| Great Weapon Fighting | Reroll 1s/2s on two-handed damage dice |
| Marksmanship | +2 ranged attack rolls |

**Steady Nerve** — Bonus Action, 1/short rest (no Resolve cost):
- Heal: 1d8 + level + CON mod HP
- Dodge: Disadvantage on attacks against you until next turn

### Level 2

**Action Surge** — Free action, 1/short rest (no Resolve cost):
- Gain 1 additional Action this turn
- Exemplar capstone scales to 2/SR at L10

### Level 5

**Extra Attack** — When you take the Attack action, attack twice.

---

## Exemplar — The Tactical Weapon Master

*Spends Resolve on maneuvers: precision, control, defense.*

### L3 Trait (auto): Combat Maneuvers

- Learn 3 maneuvers
- Cost: 1 Resolve per maneuver
- Trigger: On weapon hit (or as noted per maneuver)
- Maneuver Die: 1d6 (L3-6) → 1d8 (L7-9) → 1d10 (L10)
- Limit: 1 maneuver per attack
- Save DC: 8 + proficiency + STR or DEX mod

| Maneuver | Trigger | Effect |
|----------|---------|--------|
| Precision Strike | Before hit determined | Add die to attack roll |
| Trip Attack | On hit | +die damage, STR save or prone |
| Riposte | Reaction: enemy misses melee | Weapon attack + die damage |
| Menacing Attack | On hit | +die damage, WIS save or frightened 1 round |
| Pushing Attack | On hit | +die damage, STR save or can't melee you next turn |
| Rally | Bonus Action | Gain temp HP = die + CON mod |
| Parry | Reaction: hit by melee | Reduce damage by die + CON mod |
| Disarming Attack | On hit | +die damage, STR save or -2 attacks 1 turn |

### L4 Ability Pool (Exemplar)

| Ability | Cost | Action | Effect |
|---------|------|--------|--------|
| Feinting Strike | 1 Resolve | Free | Next attack has advantage |
| Commander's Strike | 1 Resolve | Bonus Action | Ally attacks as reaction + maneuver die |
| Brace | 1 Resolve | Reaction | Attack enemy that enters reach |

### L7 Ability Pool (Exemplar + Shared)

| Ability | Cost | Source |
|---------|------|--------|
| Indomitable | 1/LR | Shared — reroll failed save |
| Whirlwind | 2 Resolve | Exemplar — attack every enemy once |
| Know Your Enemy | Passive | Exemplar — learn enemy AC/HP%/top stat at combat start |

### L9 Capstone Abilities (Choose 1 of 3)

| Ability | Effect | Source |
|---------|--------|--------|
| Supreme Warrior | 3 attacks/action, Action Surge 2/SR | Exemplar |
| Maneuver Master | 2 maneuvers per attack, die → 1d12 | Exemplar |
| Unbreakable | 0 HP → CON save DC 10 to stay at 1 HP (DC +5 each time, resets SR) | Shared |

### L10 Capstone Traits (Choose 1 of 3)

| Trait | Effect | Source |
|-------|--------|--------|
| Perfected Form | Maneuver save DC +2. Max die roll = refund Resolve | Exemplar |
| Weapon Supremacy | Mastery effects can stack on same target. Master all weapons | Exemplar |
| Undying Resolve | Start combat with temp HP = Resolve max. SR: Resolve max +1 until LR (stacks) | Shared |

---

## Oath — The Sworn Warrior

*Spends Resolve on smite (burst damage) or healing. The core tension: every smite point is healing you don't have.*

*Flavour: The Oath is not divine mandate — it is personal conviction. A soldier sworn to avenge the fallen, a knight pledged to protect the innocent, a warrior who made a promise they intend to keep. The source of power is the oath itself.*

### L3 Trait (auto): Oath's Edge

**Sworn Strike** — On melee hit, spend 1-3 Resolve:
- 1d8 radiant per Resolve spent
- +1d8 bonus vs undead/fiend
- Limit: once per attack

| Resolve | Damage | vs Undead | Avg |
|---------|--------|-----------|-----|
| 1 | 1d8 | 2d8 | 4.5 / 9 |
| 2 | 2d8 | 3d8 | 9 / 13.5 |
| 3 | 3d8 | 4d8 | 13.5 / 18 |

**Aid the Vulnerable** — Bonus Action, spend 1+ Resolve:
- Heal: (Resolve spent × CON mod) + level HP
- OR spend 1 Resolve to cure one curable condition

| Resolve | Heal (CON+3, L5) | Heal (CON+3, L10) |
|---------|-------------------|---------------------|
| 1 | 8 | 13 |
| 2 | 11 | 16 |
| 3 | 14 | 19 |

### L4 Ability Pool (Oath)

| Ability | Cost | Action | Effect |
|---------|------|--------|--------|
| Binding Challenge | 1 Resolve | Bonus Action | Target WIS save or can only attack you 2 rounds, you have advantage vs them |
| Wrathful Strike | 1 Resolve | Free | Next hit: +1d6 psychic, WIS save or frightened |
| Ironclad Stance | 1 Resolve | Bonus Action | +2 AC until end of next turn |

### L7 Ability Pool (Oath + Shared)

| Ability | Cost | Source |
|---------|------|--------|
| Indomitable | 1/LR | Shared — reroll failed save |
| Aura of Protection | Passive | Oath — allies get +CON mod to saves in combat |
| The Vow (sub-choice) | 1/LR active | Oath — see below |

**The Vow sub-choices:**

| Vow | Passive | Active (1/LR) |
|-----|---------|---------------|
| Stalwart | Immune to frightened | Oath's Retribution: reaction, attacker takes `level` radiant |
| Vengeance | +1d4 vs enemy who damaged you this combat | Vow of Enmity: advantage vs one target all combat |
| Warden | Resistance to spell damage | Warden's Grasp: all enemies STR save or restrained 1 round |

### L9 Capstone Abilities (Choose 1 of 3)

| Ability | Effect | Source |
|---------|--------|--------|
| Champion of the Vow | Sworn Strike max 4 Resolve (4d8). 1/LR: 0 HP → 1 HP + regain CON mod Resolve | Oath |
| Sworn Protector | Sworn Strike heals you for half damage dealt. Aid the Vulnerable can target allies | Oath |
| Unbreakable | (Same shared option) | Shared |

### L10 Capstone Traits (Choose 1 of 3)

| Trait | Effect | Source |
|-------|--------|--------|
| Aura of Conviction | Allies regain 1d6 HP at start of your turn. Enemies hitting you take CON mod radiant | Oath |
| Resolute Strikes | All weapon attacks +1d4 radiant (free). Sworn Strike damage type chooseable: radiant/fire/thunder | Oath |
| Undying Resolve | (Same shared option) | Shared |

---

## Shared Dedication Traits (L6, L8 Pools)

| Trait | Effect |
|-------|--------|
| Resilient Mind | Proficiency in WIS saving throws |
| Tough | +2 HP per level (retroactive) |
| Sentinel | Reaction hits set target speed to 0 until end of their turn |
| Durable | Short rest healing dice: minimum roll = CON mod |
| Alert | +3 initiative, can't be surprised |
| Martial Adept | Learn 1 Exemplar maneuver, 1 free use/SR (no Resolve cost) |

---

## Resource Summary

| Resource | Type | Recharge | Used By |
|----------|------|----------|---------|
| Resolve | Pool (CON + level) | Short rest | Maneuvers (Exemplar), Smite + Heal + Cleanse (Oath) |
| Steady Nerve | 1 use | Short rest | Both specs |
| Action Surge | 1 use (2 at L10 Exemplar) | Short rest | Both specs |
| Indomitable | 1 use | Long rest | Shared choice at L7 |
| Sacred Oath active | 1 use | Long rest | Oath only |

---

## Implementation Status

- [x] Forgecraft practice created (`data/practices.json`)
- [x] Action Surge updated for L10 cap (`data/abilities.json`)
- [ ] Resolve system (rename stamina in classes.json, abilities.json, rulesEngine.js)
- [ ] Exemplar maneuvers data
- [ ] Oath smite/heal data
- [ ] Shared trait pool data
- [ ] Capstone abilities/traits data
- [ ] Practice integration with rest system
- [ ] Forgecraft modification UI
