# Dungeon expedition pilot

27 fixed-seed trials across three generated small worlds and Knight levels 1, 5, 10. Upper-level characters are engine-confirmed snapshots, not UI-confirmed legal progression. Actual Player moves, doors, trap dispatch, encounters, combat termination, quest observation and town turn-in; no forced victory, objective injection or teleport. Four-way BFS knows room geometry and room connection graph, but does not route around or seek hidden traps. Select strongest free skill approach at locked doors; disarm every detected physical trap immediately. No rest within dungeon; overland rest follows parent policy. This is a harness feasibility and failure-mode pilot, not quest acceptance or comparative build verdict. Trials share worlds; proportion confidence intervals below are descriptive only.

```json
{
  "level": 1,
  "trials": 9,
  "entered": 6,
  "return": {
    "success": 3,
    "n": 9,
    "rate": 0.3333333333333333,
    "wald95": [
      0.02534904641652591,
      0.6413176202501407
    ],
    "wilson95": [
      0.12058159868274293,
      0.6458026525009102
    ]
  },
  "completed": 1,
  "traps": 2,
  "trapDamage": 3,
  "bosses": 0,
  "combatWin": {
    "success": 19,
    "n": 19,
    "rate": 1,
    "wald95": [
      1,
      1
    ],
    "wilson95": [
      0.8318156346315496,
      1.0000000000000002
    ]
  }
}
```

L1 median-length win: victory, 2 rounds, 12 -> 8.133 HP, margin 0.67775
```text
R1 Knight rolls initiative: 11 + 0 = 11
R1 Stirge rolls initiative: 16 + 3 = 19
R1 Giant Rat rolls initiative: 17 + 2 = 19
R1 ⚔️ You encounter: Stirge, Giant Rat!
R1 ⚔️ Combat begins! Round 1
R1 Turn order: Stirge → Giant Rat → Knight
R1 📍 Stirge's turn (HP: 2/2)
R1 Stirge is acting...
R1 Stirge uses Blood Drain!
R1 🎲 Stirge rolls 19 + -1 = 18 vs AC 18
R1 💥 Hit! Blood Drain: 1 blood base damage
R1 Knight takes 0.8 HP damage; 0.4 blood damage pending before defenses.
R1 📍 Giant Rat's turn (HP: 5/5)
R1 Giant Rat is acting...
R1 Giant Rat uses Bite!
R1 🎲 Giant Rat rolls 9 + 0 = 9 vs AC 18
R1 ❌ Giant Rat misses!
R1 Knight takes 0.134 HP damage from ongoing effects.
R1 📍 Knight's turn (HP: 11.066/12)
R1 Knight attacks Stirge!
R1 😴 Fatigue penalty: -2 to attack roll
R1 Attack roll: 18 + 3 (ability) + 2 (prof) -2 (fatigue) = 21 vs AC 14
R1 💥 Hit! Rolled Damage: 5 + 5 (ability) = 10 base damage
R1 Stirge takes 2 HP damage.
R1 💀 Stirge is defeated!
R1 ⚔️ Sap! Stirge has disadvantage on next attack! 💫
R2 📍 Giant Rat's turn (HP: 5/5)
R2 Giant Rat is acting...
R2 Giant Rat uses Bite!
R2 🎲 Giant Rat rolls 20 + 0 = 20 vs AC 18
R2 ⭐ Critical hit! Bite: 3 blood base damage
R2 Knight takes 2.4 HP damage; 1.2 blood damage pending before defenses.
R2 Knight takes 0.533 HP damage from ongoing effects.
R2 📍 Knight's turn (HP: 8.133/12)
R2 Knight attacks Giant Rat!
R2 😴 Fatigue penalty: -2 to attack roll
R2 Attack roll: 15 + 3 (ability) + 2 (prof) -2 (fatigue) = 18 vs AC 12
R2 💥 Hit! Rolled Damage: 4 + 5 (ability) = 9 base damage
R2 Giant Rat takes 5 HP damage.
R2 💀 Giant Rat is defeated!
R2 ⚔️ Sap! Giant Rat has disadvantage on next attack! 💫
```

L1 extreme margin: victory, 2 rounds, 12 -> 12 HP, margin 1
```text
R1 Knight rolls initiative: 13 + 0 = 13
R1 Giant Rat rolls initiative: 14 + 2 = 16
R1 ⚔️ You encounter: Giant Rat!
R1 ⚔️ Combat begins! Round 1
R1 Turn order: Giant Rat → Knight
R1 📍 Giant Rat's turn (HP: 8/8)
R1 Giant Rat is acting...
R1 Giant Rat uses Bite!
R1 🎲 Giant Rat rolls 17 + 0 = 17 vs AC 18
R1 ❌ Giant Rat misses!
R1 📍 Knight's turn (HP: 12/12)
R1 Knight attacks Giant Rat!
R1 Attack roll: 13 + 3 (ability) + 2 (prof) = 18 vs AC 12
R1 💥 Hit! Rolled Damage: 2 + 5 (ability) = 7 base damage
R1 Giant Rat takes 5.6 HP damage; 2.8 blood damage pending before defenses.
R1 ⚔️ Sap! Giant Rat has disadvantage on next attack! 💫
R2 Giant Rat takes 0.934 HP damage from ongoing effects.
R2 📍 Giant Rat's turn (HP: 1.466/8)
R2 Giant Rat is acting...
R2 Giant Rat uses Bite!
R2 ⚔️ Giant Rat has disadvantage (Sapped)! 💫
R2 🎲 Disadvantage: Rolled 9 and 8, using 8
R2 🎲 Giant Rat rolls 8 + 0 = 8 vs AC 18
R2 ❌ Giant Rat misses!
R2 📍 Knight's turn (HP: 12/12)
R2 Knight attacks Giant Rat!
R2 Attack roll: 19 + 3 (ability) + 2 (prof) = 24 vs AC 12
R2 💥 Hit! Rolled Damage: 7 + 5 (ability) = 12 base damage
R2 Giant Rat takes 1.466 HP damage.
R2 💀 Giant Rat is defeated!
R2 ⚔️ Sap! Giant Rat has disadvantage on next attack! 💫
```

```json
{
  "level": 5,
  "trials": 9,
  "entered": 5,
  "return": {
    "success": 3,
    "n": 9,
    "rate": 0.3333333333333333,
    "wald95": [
      0.02534904641652591,
      0.6413176202501407
    ],
    "wilson95": [
      0.12058159868274293,
      0.6458026525009102
    ]
  },
  "completed": 0,
  "traps": 2,
  "trapDamage": 15,
  "bosses": 0,
  "combatWin": {
    "success": 21,
    "n": 24,
    "rate": 0.875,
    "wald95": [
      0.7426848774075062,
      1
    ],
    "wilson95": [
      0.6899571185214243,
      0.9565574496068442
    ]
  }
}
```

L5 median-length win: victory, 4 rounds, 27.8 -> 22.8 HP, margin 0.5181818181818182
```text
R1 Knight rolls initiative: 13 + 0 = 13
R1 Kobold rolls initiative: 2 + 2 = 4
R1 Bandit Crossbowman rolls initiative: 15 + 1 = 16
R1 Skeleton rolls initiative: 8 + 2 = 10
R1 ⚔️ You encounter: Kobold, Bandit Crossbowman, Skeleton!
R1 ⚔️ Combat begins! Round 1
R1 Turn order: Bandit Crossbowman → Knight → Skeleton → Kobold
R1 📍 Bandit Crossbowman's turn (HP: 14/14)
R1 Bandit Crossbowman is acting...
R1 Bandit Crossbowman uses Light Crossbow!
R1 🎲 Bandit Crossbowman rolls 7 + 2 = 9 vs AC 18
R1 ❌ Bandit Crossbowman misses!
R1 📍 Knight's turn (HP: 27.8/44)
R1 Knight attacks Kobold!
R1 😴 Fatigue penalty: -1 to attack roll
R1 🐎 Vanguard's Charge! +1 to attack, +1 bonus damage (unengaged target)
R1 Attack roll: 1 + 5 (ability) + 3 (prof) -1 (fatigue) + 1 (Vanguard's Charge) = 9 vs AC 12
R1 💥 Critical miss!
R1 📍 Skeleton's turn (HP: 7/7)
R1 Skeleton is acting...
R1 Skeleton uses Shortsword!
R1 🎲 Skeleton rolls 5 + 2 = 7 vs AC 18
R1 ❌ Skeleton misses!
R1 📍 Kobold's turn (HP: 1/1)
R1 Kobold is acting...
R1 Kobold uses Dagger!
R1 🎲 Kobold rolls 6 + 0 = 6 vs AC 18
R1 ❌ Kobold misses!
R2 📍 Bandit Crossbowman's turn (HP: 14/14)
R2 Bandit Crossbowman is acting...
R2 Bandit Crossbowman uses Light Crossbow!
R2 🎲 Bandit Crossbowman rolls 12 + 2 = 14 vs AC 18
R2 ❌ Bandit Crossbowman misses!
R2 📍 Knight's turn (HP: 27.8/44)
R2 Knight attacks Kobold!
R2 😴 Fatigue penalty: -1 to attack roll
R2 Attack roll: 16 + 5 (ability) + 3 (prof) -1 (fatigue) = 23 vs AC 12
R2 💥 Hit! Rolled Damage: 5 + 7 (ability) = 12 base damage
R2 Kobold takes 1 HP damage.
R2 💀 Kobold is defeated!
R2 ⚔️ Sap! Kobold has disadvantage on next attack! 💫
R2 📍 Skeleton's turn (HP: 7/7)
R2 Skeleton is acting...
R2 Skeleton uses Shortsword!
R2 🎲 Skeleton rolls 4 + 2 = 6 vs AC 18
R2 ❌ Skeleton misses!
R3 📍 Bandit Crossbowman's turn (HP: 14/14)
R3 Bandit Crossbowman is acting...
R3 Bandit Crossbowman uses Light Crossbow!
R3 🎲 Bandit Crossbowman rolls 16 + 2 = 18 vs AC 18
R3 💥 Hit! Light Crossbow: 1 bone base damage
R3 Knight takes 1 HP damage.
R3 📍 Knight's turn (HP: 26.8/44)
R3 Knight attacks Skeleton!
R3 😴 Fatigue penalty: -1 to attack roll
R3 Attack roll: 15 + 5 (ability) + 3 (prof) -1 (fatigue) = 22 vs AC 13
R3 💥 Hit! Rolled Damage: 4 + 7 (ability) = 11 base damage
R3 Skeleton takes 7 HP damage.
R3 💀 Skeleton is defeated!
R3 ⚔️ Sap! Skeleton has disadvantage on next attack! 💫
R4 📍 Bandit Crossbowman's turn (HP: 14/14)
R4 Bandit Crossbowman is acting...
R4 Bandit Crossbowman uses Light Crossbow!
R4 🎲 Bandit Crossbowman rolls 16 + 2 = 18 vs AC 18
R4 💥 Hit! Light Crossbow: 4 bone base damage
R4 Knight takes 4 HP damage.
R4 📍 Knight's turn (HP: 22.8/44)
R4 Knight attacks Bandit Crossbowman!
R4 😴 Fatigue penalty: -1 to attack roll
R4 🐎 Vanguard's Charge! +1 to attack, +4 bonus damage (unengaged target)
R4 Attack roll: 9 + 5 (ability) + 3 (prof) -1 (fatigue) + 1 (Vanguard's Charge) = 17 vs AC 12
R4 💥 Hit! Rolled Damage: 7 + 7 (ability) = 18 base damage
R4 Bandit Crossbowman takes 14 HP damage.
R4 💀 Bandit Crossbowman is defeated!
R4 ⚔️ Sap! Bandit Crossbowman has disadvantage on next attack! 💫
```

L5 loss: defeat, 9 rounds, 22 -> 0 HP, margin -0.6977761904761904
```text
R1 Knight rolls initiative: 8 + 0 = 8
R1 Cursed Ettin Warlord rolls initiative: 11 + -1 = 10
R1 ⚔️ You encounter: Cursed Ettin Warlord!
R1 ⚔️ Combat begins! Round 1
R1 Turn order: Cursed Ettin Warlord → Knight
R1 📍 Cursed Ettin Warlord's turn (HP: 420/420)
R1 Cursed Ettin Warlord is acting...
R1 ⚔️ Cursed Ettin Warlord uses Multiattack!
R1 Cursed Ettin Warlord uses Axe!
R1 🎲 Cursed Ettin Warlord rolls 6 + 7 = 13 vs AC 18
R1 ❌ Cursed Ettin Warlord misses!
R1 Cursed Ettin Warlord uses Morningstar!
R1 🎲 Cursed Ettin Warlord rolls 7 + 7 = 14 vs AC 18
R1 ❌ Cursed Ettin Warlord misses!
R1 📍 Knight's turn (HP: 22/44)
R1 💚 Steady Nerve (Heal): Knight heals for 6 HP! [1d8(1) + level(5) + con(0)]
R1 Knight attacks Cursed Ettin Warlord!
R1 Attack roll: 20 + 5 (ability) + 3 (prof) = 28 vs AC 16
R1 ⭐ Critical hit!
R1 💥 Hit! Rolled Damage: 5 + 6 (crit) + 7 (ability) = 18 base damage
R1 Cursed Ettin Warlord takes 14.4 HP damage; 7.2 blood damage pending before defenses.
R1 Trip Attack: 6 HP damage.
R1 ⚔️ Trip Attack! +6 extra damage (d6)
R1 Cursed Ettin Warlord resists prone (RESILIENCE save 22 vs DC 16)
R1 ⚔️ Sap! Cursed Ettin Warlord has disadvantage on next attack! 💫
R2 Cursed Ettin Warlord takes 2.4 HP damage from ongoing effects.
R2 📍 Cursed Ettin Warlord's turn (HP: 397.2/420)
R2 Cursed Ettin Warlord is acting...
R2 ⚔️ Cursed Ettin Warlord uses Multiattack!
R2 Cursed Ettin Warlord uses Axe!
R2 ⚔️ Cursed Ettin Warlord has disadvantage (Sapped)! 💫
R2 🎲 Disadvantage: Rolled 16 and 19, using 16
R2 🎲 Cursed Ettin Warlord rolls 16 + 7 = 23 vs AC 18
R2 💥 Hit! Axe: 9 bone base damage
R2 Knight takes 9 HP damage.
R2 Cursed Ettin Warlord uses Morningstar!
R2 🎲 Cursed Ettin Warlord rolls 1 + 7 = 8 vs AC 18
R2 ❌ Critical miss!
R2 📍 Knight's turn (HP: 19/44)
R2 Knight attacks Cursed Ettin Warlord!
R2 Attack roll: 8 + 5 (ability) + 3 (prof) = 16 vs AC 16
R2 💥 Hit! Rolled Damage: 5 + 7 (ability) = 12 base damage
R2 Cursed Ettin Warlord takes 9.6 HP damage; 4.8 blood damage pending before defenses.
R2 Trip Attack: 4 HP damage.
R2 ⚔️ Trip Attack! +4 extra damage (d6)
R2 Cursed Ettin Warlord resists prone (RESILIENCE save 22 vs DC 16)
R2 ⚔️ Sap! Cursed Ettin Warlord has disadvantage on next attack! 💫
R3 Cursed Ettin Warlord takes 4 HP damage from ongoing effects.
R3 📍 Cursed Ettin Warlord's turn (HP: 379.6/420)
R3 Cursed Ettin Warlord is acting...
R3 ⚔️ Cursed Ettin Warlord uses Multiattack!
R3 Cursed Ettin Warlord uses Axe!
R3 ⚔️ Cursed Ettin Warlord has disadvantage (Sapped)! 💫
R3 🎲 Disadvantage: Rolled 19 and 3, using 3
R3 🎲 Cursed Ettin Warlord rolls 3 + 7 = 10 vs AC 18
R3 ❌ Cursed Ettin Warlord misses!
R3 Cursed Ettin Warlord uses Morningstar!
R3 🎲 Cursed Ettin Warlord rolls 7 + 7 = 14 vs AC 18
R3 ❌ Cursed Ettin Warlord misses!
R3 📍 Knight's turn (HP: 19/44)
R3 Knight attacks Cursed Ettin Warlord!
R3 Attack roll: 10 + 5 (ability) + 3 (prof) = 18 vs AC 16
R3 💥 Hit! Rolled Damage: 4 + 7 (ability) = 11 base damage
R3 Cursed Ettin Warlord takes 8.8 HP damage; 4.4 blood damage pending before defenses.
R3 Trip Attack: 6 HP damage.
R3 ⚔️ Trip Attack! +6 extra damage (d6)
R3 🔻 Cursed Ettin Warlord is PRONE! (RESILIENCE save 6 vs DC 16)
R3 ⚔️ Sap! Cursed Ettin Warlord has disadvantage on next attack! 💫
R4 Cursed Ettin Warlord takes 5.467 HP damage from ongoing effects.
R4 📍 Cursed Ettin Warlord's turn (HP: 359.333/420)
R4 Cursed Ettin Warlord is acting...
R4 ⚔️ Cursed Ettin Warlord uses Multiattack!
R4 Cursed Ettin Warlord uses Axe!
R4 ⚔️ Cursed Ettin Warlord has disadvantage (Sapped)! 💫
R4 ⚔️ Cursed Ettin Warlord has disadvantage (prone)! 🔻
R4 🎲 Disadvantage: Rolled 20 and 16, using 16
R4 🎲 Cursed Ettin Warlord rolls 16 + 7 = 23 vs AC 18
R4 💥 Hit! Axe: 6 bone base damage
R4 Knight takes 6 HP damage.
R4 Cursed Ettin Warlord uses Morningstar!
R4 ⚔️ Cursed Ettin Warlord has disadvantage (prone)! 🔻
R4 🎲 Disadvantage: Rolled 7 and 13, using 7
R4 🎲 Cursed Ettin Warlord rolls 7 + 7 = 14 vs AC 18
R4 ❌ Cursed Ettin Warlord misses!
R4 📍 Knight's turn (HP: 13/44)
R4 Knight attacks Cursed Ettin Warlord!
R4 ⚔️ Knight has advantage (target prone)! 🔻
R4 🎲 Advantage: Rolled 20 and 3, using 20
R4 Attack roll: 20 + 5 (ability) + 3 (prof) = 28 vs AC 16
R4 ⭐ Critical hit!
R4 💥 Hit! Rolled Damage: 1 + 7 (crit) + 7 (ability) = 15 base damage
R4 Cursed Ettin Warlord takes 12 HP damage; 6 blood damage pending before defenses.
R4 ⚔️ Sap! Cursed Ettin Warlord has disadvantage on next attack! 💫
R5 Cursed Ettin Warlord takes 5.067 HP damage from ongoing effects.
R5 📍 Cursed Ettin Warlord's turn (HP: 342.266/420)
R5 Cursed Ettin Warlord is acting...
R5 ⚔️ Cursed Ettin Warlord uses Multiattack!
R5 Cursed Ettin Warlord uses Axe!
R5 ⚔️ Cursed Ettin Warlord has disadvantage (Sapped)! 💫
R5 ⚔️ Cursed Ettin Warlord has disadvantage (prone)! 🔻
R5 🎲 Disadvantage: Rolled 1 and 1, using 1
R5 🎲 Cursed Ettin Warlord rolls 1 + 7 = 8 vs AC 18
R5 ❌ Critical miss!
R5 Cursed Ettin Warlord uses Morningstar!
R5 ⚔️ Cursed Ettin Warlord has disadvantage (prone)! 🔻
R5 🎲 Disadvantage: Rolled 20 and 10, using 10
R5 🎲 Cursed Ettin Warlord rolls 10 + 7 = 17 vs AC 18
R5 ❌ Cursed Ettin Warlord misses!
R5 📍 Knight's turn (HP: 13/44)
R5 Knight attacks Cursed Ettin Warlord!
R5 ⚔️ Knight has advantage (target prone)! 🔻
R5 🎲 Advantage: Rolled 14 and 19, using 19
R5 Attack roll: 19 + 5 (ability) + 3 (prof) = 27 vs AC 16
R5 💥 Hit! Rolled Damage: 4 + 7 (ability) = 11 base damage
R5 Cursed Ettin Warlord takes 8.8 HP damage; 4.4 blood damage pending before defenses.
R5 ⚔️ Sap! Cursed Ettin Warlord has disadvantage on next attack! 💫
R6 Cursed Ettin Warlord takes 4.933 HP damage from ongoing effects.
R6 📍 Cursed Ettin Warlord's turn (HP: 328.533/420)
R6 Cursed Ettin Warlord is acting...
R6 ⚔️ Cursed Ettin Warlord uses Multiattack!
R6 Cursed Ettin Warlord uses Axe!
R6 ⚔️ Cursed Ettin Warlord has disadvantage (Sapped)! 💫
R6 ⚔️ Cursed Ettin Warlord has disadvantage (prone)! 🔻
R6 🎲 Disadvantage: Rolled 20 and 4, using 4
R6 🎲 Cursed Ettin Warlord rolls 4 + 7 = 11 vs AC 18
R6 ❌ Cursed Ettin Warlord misses!
R6 Cursed Ettin Warlord uses Morningstar!
R6 ⚔️ Cursed Ettin Warlord has disadvantage (prone)! 🔻
R6 🎲 Disadvantage: Rolled 5 and 17, using 5
R6 🎲 Cursed Ettin Warlord rolls 5 + 7 = 12 vs AC 18
R6 ❌ Cursed Ettin Warlord misses!
R6 📍 Knight's turn (HP: 13/44)
R6 Knight attacks Cursed Ettin Warlord!
R6 ⚔️ Knight has advantage (target prone)! 🔻
R6 🎲 Advantage: Rolled 2 and 13, using 13
R6 Attack roll: 13 + 5 (ability) + 3 (prof) = 21 vs AC 16
R6 💥 Hit! Rolled Damage: 6 + 7 (ability) = 13 base damage
R6 Cursed Ettin Warlord takes 10.4 HP damage; 5.2 blood damage pending before defenses.
R6 ⚔️ Sap! Cursed Ettin Warlord has disadvantage on next attack! 💫
R7 Cursed Ettin Warlord takes 5.201 HP damage from ongoing effects.
R7 📍 Cursed Ettin Warlord's turn (HP: 312.932/420)
R7 Cursed Ettin Warlord is acting...
R7 ⚔️ Cursed Ettin Warlord uses Multiattack!
R7 Cursed Ettin Warlord uses Axe!
R7 ⚔️ Cursed Ettin Warlord has disadvantage (Sapped)! 💫
R7 ⚔️ Cursed Ettin Warlord has disadvantage (prone)! 🔻
R7 🎲 Disadvantage: Rolled 11 and 10, using 10
R7 🎲 Cursed Ettin Warlord rolls 10 + 7 = 17 vs AC 18
R7 ❌ Cursed Ettin Warlord misses!
R7 Cursed Ettin Warlord uses Morningstar!
R7 ⚔️ Cursed Ettin Warlord has disadvantage (prone)! 🔻
R7 🎲 Disadvantage: Rolled 18 and 1, using 1
R7 🎲 Cursed Ettin Warlord rolls 1 + 7 = 8 vs AC 18
R7 ❌ Critical miss!
R7 📍 Knight's turn (HP: 13/44)
R7 Knight attacks Cursed Ettin Warlord!
R7 ⚔️ Knight has advantage (target prone)! 🔻
R7 🎲 Advantage: Rolled 16 and 4, using 16
R7 Attack roll: 16 + 5 (ability) + 3 (prof) = 24 vs AC 16
R7 💥 Hit! Rolled Damage: 7 + 7 (ability) = 14 base damage
R7 Cursed Ettin Warlord takes 11.2 HP damage; 5.6 blood damage pending before defenses.
R7 ⚔️ Sap! Cursed Ettin Warlord has disadvantage on next attack! 💫
R8 Cursed Ettin Warlord takes 5.066 HP damage from ongoing effects.
R8 📍 Cursed Ettin Warlord's turn (HP: 296.666/420)
R8 Cursed Ettin Warlord is acting...
R8 ⚔️ Cursed Ettin Warlord uses Multiattack!
R8 Cursed Ettin Warlord uses Axe!
R8 ⚔️ Cursed Ettin Warlord has disadvantage (Sapped)! 💫
R8 ⚔️ Cursed Ettin Warlord has disadvantage (prone)! 🔻
R8 🎲 Disadvantage: Rolled 2 and 19, using 2
R8 🎲 Cursed Ettin Warlord rolls 2 + 7 = 9 vs AC 18
R8 ❌ Cursed Ettin Warlord misses!
R8 Cursed Ettin Warlord uses Morningstar!
R8 ⚔️ Cursed Ettin Warlord has disadvantage (prone)! 🔻
R8 🎲 Disadvantage: Rolled 13 and 16, using 13
R8 🎲 Cursed Ettin Warlord rolls 13 + 7 = 20 vs AC 18
R8 💥 Hit! Morningstar: 6 bone base damage
R8 Knight takes 6 HP damage.
R8 📍 Knight's turn (HP: 7/44)
R8 Knight attacks Cursed Ettin Warlord!
R8 ⚔️ Knight has advantage (target prone)! 🔻
R8 🎲 Advantage: Rolled 2 and 3, using 3
R8 Attack roll: 3 + 5 (ability) + 3 (prof) = 11 vs AC 16
R8 Miss!
R9 Cursed Ettin Warlord takes 3.6 HP damage from ongoing effects.
R9 📍 Cursed Ettin Warlord's turn (HP: 293.066/420)
R9 Cursed Ettin Warlord is acting...
R9 ⚔️ Cursed Ettin Warlord uses Multiattack!
R9 Cursed Ettin Warlord uses Axe!
R9 ⚔️ Cursed Ettin Warlord has disadvantage (prone)! 🔻
R9 🎲 Disadvantage: Rolled 9 and 11, using 9
R9 🎲 Cursed Ettin Warlord rolls 9 + 7 = 16 vs AC 18
R9 ❌ Cursed Ettin Warlord misses!
R9 Cursed Ettin Warlord uses Morningstar!
R9 ⚔️ Cursed Ettin Warlord has disadvantage (prone)! 🔻
R9 🎲 Disadvantage: Rolled 18 and 11, using 11
R9 🎲 Cursed Ettin Warlord rolls 11 + 7 = 18 vs AC 18
R9 💥 Hit! Morningstar: 8 bone base damage
R9 😩 You feel tired. (−1 skills & attacks)
R9 💀 You have been defeated...
R9 🎮 Game Over
R9 Knight takes 7 HP damage.
R9 💀 Knight is defeated!
```

L5 extreme margin: victory, 4 rounds, 44 -> 44 HP, margin 1
```text
R1 Knight rolls initiative: 2 + 0 = 2
R1 Ghast rolls initiative: 4 + 3 = 7
R1 ⚔️ You encounter: Ghast!
R1 ⚔️ Combat begins! Round 1
R1 Turn order: Ghast → Knight
R1 📍 Ghast's turn (HP: 39/39)
R1 Ghast is acting...
R1 ⚔️ Ghast uses Multiattack!
R1 Ghast uses Bite!
R1 🎲 Ghast rolls 9 + 5 = 14 vs AC 18
R1 ❌ Ghast misses!
R1 Ghast uses Claws!
R1 🎲 Ghast rolls 4 + 5 = 9 vs AC 18
R1 ❌ Ghast misses!
R1 📍 Knight's turn (HP: 44/44)
R1 Knight attacks Ghast!
R1 😴 Fatigue penalty: -2 to attack roll
R1 Attack roll: 12 + 5 (ability) + 3 (prof) -2 (fatigue) = 18 vs AC 13
R1 💥 Hit! Rolled Damage: 2 + 7 (ability) = 9 base damage
R1 Ghast takes 7.2 HP damage; 3.6 blood damage pending before defenses.
R1 Trip Attack: 3 HP damage.
R1 ⚔️ Trip Attack! +3 extra damage (d6)
R1 🔻 Ghast is PRONE! (RESILIENCE save 7 vs DC 16)
R1 ⚔️ Sap! Ghast has disadvantage on next attack! 💫
R2 Ghast takes 1.2 HP damage from ongoing effects.
R2 📍 Ghast's turn (HP: 27.6/39)
R2 Ghast is acting...
R2 ⚔️ Ghast uses Multiattack!
R2 Ghast uses Bite!
R2 ⚔️ Ghast has disadvantage (Sapped)! 💫
R2 ⚔️ Ghast has disadvantage (prone)! 🔻
R2 🎲 Disadvantage: Rolled 15 and 4, using 4
R2 🎲 Ghast rolls 4 + 5 = 9 vs AC 18
R2 ❌ Ghast misses!
R2 Ghast uses Claws!
R2 ⚔️ Ghast has disadvantage (prone)! 🔻
R2 🎲 Disadvantage: Rolled 5 and 8, using 5
R2 🎲 Ghast rolls 5 + 5 = 10 vs AC 18
R2 ❌ Ghast misses!
R2 📍 Knight's turn (HP: 44/44)
R2 Knight attacks Ghast!
R2 ⚔️ Knight has advantage (target prone)! 🔻
R2 😴 Fatigue penalty: -2 to attack roll
R2 🎲 Advantage: Rolled 11 and 2, using 11
R2 Attack roll: 11 + 5 (ability) + 3 (prof) -2 (fatigue) = 17 vs AC 13
R2 💥 Hit! Rolled Damage: 1 + 7 (ability) = 8 base damage
R2 Ghast takes 6.4 HP damage; 3.2 blood damage pending before defenses.
R2 ⚔️ Sap! Ghast has disadvantage on next attack! 💫
R3 Ghast takes 2.267 HP damage from ongoing effects.
R3 📍 Ghast's turn (HP: 18.933/39)
R3 Ghast is acting...
R3 ⚔️ Ghast uses Multiattack!
R3 Ghast uses Bite!
R3 ⚔️ Ghast has disadvantage (Sapped)! 💫
R3 ⚔️ Ghast has disadvantage (prone)! 🔻
R3 🎲 Disadvantage: Rolled 11 and 3, using 3
R3 🎲 Ghast rolls 3 + 5 = 8 vs AC 18
R3 ❌ Ghast misses!
R3 Ghast uses Claws!
R3 ⚔️ Ghast has disadvantage (prone)! 🔻
R3 🎲 Disadvantage: Rolled 18 and 4, using 4
R3 🎲 Ghast rolls 4 + 5 = 9 vs AC 18
R3 ❌ Ghast misses!
R3 📍 Knight's turn (HP: 44/44)
R3 Knight attacks Ghast!
R3 ⚔️ Knight has advantage (target prone)! 🔻
R3 😴 Fatigue penalty: -2 to attack roll
R3 🎲 Advantage: Rolled 14 and 15, using 15
R3 Attack roll: 15 + 5 (ability) + 3 (prof) -2 (fatigue) = 21 vs AC 13
R3 💥 Hit! Rolled Damage: 4 + 7 (ability) = 11 base damage
R3 Ghast takes 8.8 HP damage; 4.4 blood damage pending before defenses.
R3 ⚔️ Sap! Ghast has disadvantage on next attack! 💫
R4 Ghast takes 3.734 HP damage from ongoing effects.
R4 📍 Ghast's turn (HP: 6.399/39)
R4 Ghast is acting...
R4 ⚔️ Ghast uses Multiattack!
R4 Ghast uses Bite!
R4 ⚔️ Ghast has disadvantage (Sapped)! 💫
R4 ⚔️ Ghast has disadvantage (prone)! 🔻
R4 🎲 Disadvantage: Rolled 11 and 19, using 11
R4 🎲 Ghast rolls 11 + 5 = 16 vs AC 18
R4 ❌ Ghast misses!
R4 Ghast uses Claws!
R4 ⚔️ Ghast has disadvantage (prone)! 🔻
R4 🎲 Disadvantage: Rolled 10 and 5, using 5
R4 🎲 Ghast rolls 5 + 5 = 10 vs AC 18
R4 ❌ Ghast misses!
R4 📍 Knight's turn (HP: 44/44)
R4 Knight attacks Ghast!
R4 ⚔️ Knight has advantage (target prone)! 🔻
R4 😴 Fatigue penalty: -2 to attack roll
R4 🎲 Advantage: Rolled 19 and 9, using 19
R4 Attack roll: 19 + 5 (ability) + 3 (prof) -2 (fatigue) = 25 vs AC 13
R4 💥 Hit! Rolled Damage: 3 + 7 (ability) = 10 base damage
R4 Ghast takes 6.399 HP damage.
R4 💀 Ghast is defeated!
R4 ⚔️ Sap! Ghast has disadvantage on next attack! 💫
```

```json
{
  "level": 10,
  "trials": 9,
  "entered": 5,
  "return": {
    "success": 4,
    "n": 9,
    "rate": 0.4444444444444444,
    "wald95": [
      0.11980050104447498,
      0.7690883878444139
    ],
    "wilson95": [
      0.188775429471914,
      0.7333526542559703
    ]
  },
  "completed": 1,
  "traps": 1,
  "trapDamage": 16,
  "bosses": 0,
  "combatWin": {
    "success": 20,
    "n": 22,
    "rate": 0.9090909090909091,
    "wald95": [
      0.7889607517792768,
      1
    ],
    "wilson95": [
      0.7218461934161421,
      0.9747051037171622
    ]
  }
}
```

L10 median-length win: victory, 6 rounds, 71.2 -> 42.4 HP, margin 0.4711111111111111
```text
R1 Knight rolls initiative: 3 + 0 = 3
R1 Skeleton rolls initiative: 14 + 2 = 16
R1 Bandit rolls initiative: 5 + 1 = 6
R1 Dire Wolf rolls initiative: 12 + 2 = 14
R1 ⚔️ You encounter: Skeleton, Bandit, Dire Wolf!
R1 ⚔️ Combat begins! Round 1
R1 Turn order: Skeleton → Dire Wolf → Bandit → Knight
R1 📍 Skeleton's turn (HP: 14/14)
R1 Skeleton is acting...
R1 Skeleton uses Shortsword!
R1 🎲 Skeleton rolls 3 + 2 = 5 vs AC 18
R1 ❌ Skeleton misses!
R1 📍 Dire Wolf's turn (HP: 34/34)
R1 Dire Wolf is acting...
R1 Dire Wolf uses Bite!
R1 🎲 Dire Wolf rolls 18 + 5 = 23 vs AC 18
R1 💥 Hit! Bite: 7 blood base damage
R1 Knight takes 5.6 HP damage; 2.8 blood damage pending before defenses.
R1 📍 Bandit's turn (HP: 9/9)
R1 Bandit is acting...
R1 Bandit uses Scimitar!
R1 🎲 Bandit rolls 13 + 2 = 15 vs AC 18
R1 ❌ Bandit misses!
R1 Knight takes 0.934 HP damage from ongoing effects.
R1 📍 Knight's turn (HP: 64.666/90)
R1 Knight attacks Bandit!
R1 😴 Fatigue penalty: -1 to attack roll
R1 Attack roll: 11 + 5 (ability) + 4 (prof) -1 (fatigue) = 19 vs AC 12
R1 💥 Hit! Rolled Damage: 7 + 7 (ability) = 14 base damage
R1 Bandit takes 9 HP damage.
R1 💀 Bandit is defeated!
R1 ⚔️ Sap! Bandit has disadvantage on next attack! 💫
R2 📍 Skeleton's turn (HP: 14/14)
R2 Skeleton is acting...
R2 Skeleton uses Shortsword!
R2 🎲 Skeleton rolls 15 + 2 = 17 vs AC 18
R2 ❌ Skeleton misses!
R2 📍 Dire Wolf's turn (HP: 34/34)
R2 Dire Wolf is acting...
R2 Dire Wolf uses Bite!
R2 🎲 Dire Wolf rolls 15 + 5 = 20 vs AC 18
R2 💥 Hit! Bite: 10 blood base damage
R2 Knight takes 8 HP damage; 4 blood damage pending before defenses.
R2 Knight takes 2.267 HP damage from ongoing effects.
R2 📍 Knight's turn (HP: 54.399/90)
R2 Knight attacks Skeleton!
R2 😴 Fatigue penalty: -1 to attack roll
R2 Attack roll: 11 + 5 (ability) + 4 (prof) -1 (fatigue) = 19 vs AC 13
R2 💥 Hit! Rolled Damage: 8 + 7 (ability) = 15 base damage
R2 Skeleton takes 12 HP damage; 6 blood damage pending before defenses.
R2 Trip Attack: 2 HP damage.
R2 ⚔️ Sap! Skeleton has disadvantage on next attack! 💫
R3 📍 Dire Wolf's turn (HP: 34/34)
R3 Dire Wolf is acting...
R3 Dire Wolf uses Bite!
R3 🎲 Dire Wolf rolls 4 + 5 = 9 vs AC 18
R3 ❌ Dire Wolf misses!
R3 Knight takes 2.266 HP damage from ongoing effects.
R3 📍 Knight's turn (HP: 52.133/90)
R3 Knight attacks Dire Wolf!
R3 😴 Fatigue penalty: -1 to attack roll
R3 Attack roll: 14 + 5 (ability) + 4 (prof) -1 (fatigue) = 22 vs AC 14
R3 💥 Hit! Rolled Damage: 3 + 7 (ability) = 10 base damage
R3 Dire Wolf takes 8 HP damage; 4 blood damage pending before defenses.
R3 Trip Attack: 2 HP damage.
R3 ⚔️ Trip Attack! +2 extra damage (d12)
R3 🔻 Dire Wolf is PRONE! (RESILIENCE save 3 vs DC 17)
R3 ⚔️ Sap! Dire Wolf has disadvantage on next attack! 💫
R4 Dire Wolf takes 1.334 HP damage from ongoing effects.
R4 📍 Dire Wolf's turn (HP: 22.666/34)
R4 Dire Wolf is acting...
R4 Dire Wolf uses Bite!
R4 ⚔️ Dire Wolf has disadvantage (Sapped)! 💫
R4 ⚔️ Dire Wolf has disadvantage (prone)! 🔻
R4 🎲 Disadvantage: Rolled 20 and 3, using 3
R4 🎲 Dire Wolf rolls 3 + 5 = 8 vs AC 18
R4 ❌ Dire Wolf misses!
R4 Knight takes 1.333 HP damage from ongoing effects.
R4 📍 Knight's turn (HP: 50.8/90)
R4 Knight attacks Dire Wolf!
R4 ⚔️ Knight has advantage (target prone)! 🔻
R4 😴 Fatigue penalty: -1 to attack roll
R4 🎲 Advantage: Rolled 2 and 14, using 14
R4 Attack roll: 14 + 5 (ability) + 4 (prof) -1 (fatigue) = 22 vs AC 14
R4 💥 Hit! Rolled Damage: 3 + 7 (ability) = 10 base damage
R4 Dire Wolf takes 8 HP damage; 4 blood damage pending before defenses.
R4 ⚔️ Sap! Dire Wolf has disadvantage on next attack! 💫
R5 Dire Wolf takes 2.667 HP damage from ongoing effects.
R5 📍 Dire Wolf's turn (HP: 11.999/34)
R5 Dire Wolf is acting...
R5 Dire Wolf uses Bite!
R5 ⚔️ Dire Wolf has disadvantage (Sapped)! 💫
R5 ⚔️ Dire Wolf has disadvantage (prone)! 🔻
R5 🎲 Disadvantage: Rolled 19 and 13, using 13
R5 🎲 Dire Wolf rolls 13 + 5 = 18 vs AC 18
R5 💥 Hit! Bite: 9 blood base damage
R5 Knight takes 7.2 HP damage; 3.6 blood damage pending before defenses.
R5 Knight takes 1.2 HP damage from ongoing effects.
R5 📍 Knight's turn (HP: 42.4/90)
R5 Knight attacks Dire Wolf!
R5 ⚔️ Knight has advantage (target prone)! 🔻
R5 😴 Fatigue penalty: -1 to attack roll
R5 🎲 Advantage: Rolled 18 and 4, using 18
R5 Attack roll: 18 + 5 (ability) + 4 (prof) -1 (fatigue) = 26 vs AC 14
R5 💥 Hit! Rolled Damage: 3 + 7 (ability) = 10 base damage
R5 Dire Wolf takes 8 HP damage; 4 blood damage pending before defenses.
R5 ⚔️ Sap! Dire Wolf has disadvantage on next attack! 💫
R6 Dire Wolf takes 3.999 HP damage from ongoing effects.
R6 ⚠️ You are staggering with exhaustion! (Disadvantage on attacks & skills)
```

L10 loss: defeat, 7 rounds, 90 -> 0 HP, margin -0.8174144144144144
```text
R1 Knight rolls initiative: 15 + 0 = 15
R1 Bugbear rolls initiative: 3 + 2 = 5
R1 Manticore rolls initiative: 17 + 3 = 20
R1 Goblin Archer rolls initiative: 8 + 2 = 10
R1 ⚔️ You encounter: Bugbear, Manticore, Goblin Archer!
R1 ⚔️ Combat begins! Round 1
R1 Turn order: Manticore → Knight → Goblin Archer → Bugbear
R1 📍 Manticore's turn (HP: 82/82)
R1 Manticore is acting...
R1 ⚔️ Manticore uses Multiattack!
R1 Manticore uses Tail Spike!
R1 🎲 Manticore rolls 5 + 5 = 10 vs AC 18
R1 ❌ Manticore misses!
R1 Manticore uses Claw!
R1 🎲 Manticore rolls 7 + 5 = 12 vs AC 18
R1 ❌ Manticore misses!
R1 Manticore uses Bite!
R1 🎲 Manticore rolls 14 + 5 = 19 vs AC 18
R1 💥 Hit! Bite: 9 blood base damage
R1 Knight takes 7.2 HP damage; 3.6 blood damage pending before defenses.
R1 Knight takes 1.2 HP damage from ongoing effects.
R1 📍 Knight's turn (HP: 81.6/90)
R1 Knight attacks Goblin Archer!
R1 🐎 Vanguard's Charge! +1 to attack, +3 bonus damage (unengaged target)
R1 Attack roll: 4 + 5 (ability) + 4 (prof) + 1 (Vanguard's Charge) = 14 vs AC 15
R1 Miss!
R1 📍 Goblin Archer's turn (HP: 6/6)
R1 Goblin Archer is acting...
R1 Goblin Archer uses Shortbow!
R1 🎲 Goblin Archer rolls 16 + 1 = 17 vs AC 18
R1 ❌ Goblin Archer misses!
R1 📍 Bugbear's turn (HP: 23/23)
R1 Bugbear is acting...
R1 Bugbear uses Morningstar!
R1 🎲 Bugbear rolls 18 + 4 = 22 vs AC 18
R1 💥 Hit! Morningstar: 6 bone base damage
R1 Knight takes 6 HP damage.
R2 📍 Manticore's turn (HP: 82/82)
R2 Manticore is acting...
R2 ⚔️ Manticore uses Multiattack!
R2 Manticore uses Tail Spike!
R2 🎲 Manticore rolls 1 + 5 = 6 vs AC 18
R2 ❌ Critical miss!
R2 Manticore uses Claw!
R2 🎲 Manticore rolls 16 + 5 = 21 vs AC 18
R2 💥 Hit! Claw: 8 blood base damage
R2 Knight takes 6.4 HP damage; 3.2 blood damage pending before defenses.
R2 Manticore uses Bite!
R2 🎲 Manticore rolls 16 + 5 = 21 vs AC 18
R2 💥 Hit! Bite: 7 blood base damage
R2 Knight takes 5.6 HP damage; 2.8 blood damage pending before defenses.
R2 Knight takes 3.201 HP damage from ongoing effects.
R2 📍 Knight's turn (HP: 60.399/90)
R2 Knight attacks Goblin Archer!
R2 Attack roll: 4 + 5 (ability) + 4 (prof) = 13 vs AC 15
R2 Miss!
R2 📍 Goblin Archer's turn (HP: 6/6)
R2 Goblin Archer is acting...
R2 Goblin Archer uses Shortbow!
R2 🎲 Goblin Archer rolls 13 + 1 = 14 vs AC 18
R2 ❌ Goblin Archer misses!
R2 📍 Bugbear's turn (HP: 23/23)
R2 Bugbear is acting...
R2 Bugbear uses Morningstar!
R2 🎲 Bugbear rolls 18 + 4 = 22 vs AC 18
R2 💥 Hit! Morningstar: 4 bone base damage
R2 Knight takes 4 HP damage.
R3 📍 Manticore's turn (HP: 82/82)
R3 Manticore is acting...
R3 ⚔️ Manticore uses Multiattack!
R3 Manticore uses Tail Spike!
R3 🎲 Manticore rolls 10 + 5 = 15 vs AC 18
R3 ❌ Manticore misses!
R3 Manticore uses Claw!
R3 🎲 Manticore rolls 1 + 5 = 6 vs AC 18
R3 ❌ Critical miss!
R3 Manticore uses Bite!
R3 🎲 Manticore rolls 14 + 5 = 19 vs AC 18
R3 💥 Hit! Bite: 11 blood base damage
R3 Knight takes 8.8 HP damage; 4.4 blood damage pending before defenses.
R3 Knight takes 4.667 HP damage from ongoing effects.
R3 📍 Knight's turn (HP: 42.932/90)
R3 Knight attacks Goblin Archer!
R3 Attack roll: 2 + 5 (ability) + 4 (prof) = 11 vs AC 15
R3 Miss!
R3 📍 Goblin Archer's turn (HP: 6/6)
R3 Goblin Archer is acting...
R3 Goblin Archer uses Shortbow!
R3 🎲 Goblin Archer rolls 11 + 1 = 12 vs AC 18
R3 ❌ Goblin Archer misses!
R3 📍 Bugbear's turn (HP: 23/23)
R3 Bugbear is acting...
R3 Bugbear uses Morningstar!
R3 🎲 Bugbear rolls 20 + 4 = 24 vs AC 18
R3 ⭐ Critical hit! Morningstar: 6 bone base damage
R3 Knight takes 6 HP damage.
R4 📍 Manticore's turn (HP: 82/82)
R4 Manticore is acting...
R4 ⚔️ Manticore uses Multiattack!
R4 Manticore uses Tail Spike!
R4 🎲 Manticore rolls 4 + 5 = 9 vs AC 18
R4 ❌ Manticore misses!
R4 Manticore uses Claw!
R4 🎲 Manticore rolls 13 + 5 = 18 vs AC 18
R4 💥 Hit! Claw: 9 blood base damage
R4 Knight takes 7.2 HP damage; 3.6 blood damage pending before defenses.
R4 Manticore uses Bite!
R4 🎲 Manticore rolls 14 + 5 = 19 vs AC 18
R4 💥 Hit! Bite: 10 blood base damage
R4 Knight takes 8 HP damage; 4 blood damage pending before defenses.
R4 Knight takes 6 HP damage from ongoing effects.
R4 📍 Knight's turn (HP: 15.732/90)
R4 Knight attacks Goblin Archer!
R4 Attack roll: 15 + 5 (ability) + 4 (prof) = 24 vs AC 15
R4 💥 Hit! Rolled Damage: 1 + 7 (ability) = 8 base damage
R4 Goblin Archer takes 6 HP damage.
R4 💀 Goblin Archer is defeated!
R4 ⚔️ Sap! Goblin Archer has disadvantage on next attack! 💫
R4 📍 Bugbear's turn (HP: 23/23)
R4 Bugbear is acting...
R4 Bugbear uses Morningstar!
R4 🎲 Bugbear rolls 4 + 4 = 8 vs AC 18
R4 ❌ Bugbear misses!
R5 📍 Manticore's turn (HP: 82/82)
R5 Manticore is acting...
R5 ⚔️ Manticore uses Multiattack!
R5 Manticore uses Tail Spike!
R5 🎲 Manticore rolls 4 + 5 = 9 vs AC 18
R5 ❌ Manticore misses!
R5 Manticore uses Claw!
R5 🎲 Manticore rolls 17 + 5 = 22 vs AC 18
R5 💥 Hit! Claw: 4 blood base damage
R5 Knight takes 3.2 HP damage; 1.6 blood damage pending before defenses.
R5 Manticore uses Bite!
R5 🎲 Manticore rolls 6 + 5 = 11 vs AC 18
R5 ❌ Manticore misses!
R5 Knight takes 4.533 HP damage from ongoing effects.
R5 📍 Knight's turn (HP: 7.999/90)
R5 Knight attacks Bugbear!
R5 Attack roll: 4 + 5 (ability) + 4 (prof) = 13 vs AC 16
R5 Miss!
R5 📍 Bugbear's turn (HP: 23/23)
R5 Bugbear is acting...
R5 Bugbear uses Morningstar!
R5 🎲 Bugbear rolls 5 + 4 = 9 vs AC 18
R5 ❌ Bugbear misses!
R6 📍 Manticore's turn (HP: 82/82)
R6 Manticore is acting...
R6 ⚔️ Manticore uses Multiattack!
R6 Manticore uses Tail Spike!
R6 🎲 Manticore rolls 11 + 5 = 16 vs AC 18
R6 ❌ Manticore misses!
R6 Manticore uses Claw!
R6 🎲 Manticore rolls 12 + 5 = 17 vs AC 18
R6 ❌ Manticore misses!
R6 Manticore uses Bite!
R6 🎲 Manticore rolls 6 + 5 = 11 vs AC 18
R6 ❌ Manticore misses!
R6 Knight takes 3.066 HP damage from ongoing effects.
R6 📍 Knight's turn (HP: 4.933/90)
R6 Knight attacks Bugbear!
R6 Attack roll: 11 + 5 (ability) + 4 (prof) = 20 vs AC 16
R6 💥 Hit! Rolled Damage: 4 + 7 (ability) = 11 base damage
R6 Bugbear takes 8.8 HP damage; 4.4 blood damage pending before defenses.
R6 Trip Attack: 4 HP damage.
R6 ⚔️ Trip Attack! +4 extra damage (d12)
R6 🔻 Bugbear is PRONE! (RESILIENCE save 5 vs DC 17)
R6 ⚔️ Sap! Bugbear has disadvantage on next attack! 💫
R6 Bugbear takes 1.467 HP damage from ongoing effects.
R6 📍 Bugbear's turn (HP: 8.733/23)
R6 Bugbear is acting...
R6 Bugbear uses Morningstar!
R6 ⚔️ Bugbear has disadvantage (Sapped)! 💫
R6 ⚔️ Bugbear has disadvantage (prone)! 🔻
R6 🎲 Disadvantage: Rolled 15 and 6, using 6
R6 🎲 Bugbear rolls 6 + 4 = 10 vs AC 18
R6 ❌ Bugbear misses!
R7 📍 Manticore's turn (HP: 82/82)
R7 Manticore is acting...
R7 ⚔️ Manticore uses Multiattack!
R7 Manticore uses Tail Spike!
R7 🎲 Manticore rolls 13 + 5 = 18 vs AC 18
R7 💥 Hit! Tail Spike: 11 blood base damage
R7 💀 You have been defeated...
R7 🎮 Game Over
R7 Knight takes 4.933 HP damage.
R7 💀 Knight is defeated!
```

L10 extreme margin: victory, 4 rounds, 90 -> 90 HP, margin 1
```text
R1 Knight rolls initiative: 8 + 0 = 8
R1 Wraith rolls initiative: 1 + 3 = 4
R1 ⚔️ You encounter: Wraith!
R1 ⚔️ Combat begins! Round 1
R1 Turn order: Knight → Wraith
R1 📍 Knight's turn (HP: 90/90)
R1 Knight attacks Wraith!
R1 🐎 Vanguard's Charge! +1 to attack, +1 bonus damage (unengaged target)
R1 Attack roll: 19 + 5 (ability) + 4 (prof) + 1 (Vanguard's Charge) = 29 vs AC 13
R1 💥 Hit! Rolled Damage: 8 + 7 (ability) = 16 base damage
R1 Wraith takes 13 HP damage; 6 blood damage pending before defenses.
R1 Trip Attack: 12 HP damage.
R1 ⚔️ Trip Attack! +12 extra damage (d12)
R1 Wraith resists prone (RESILIENCE save 18 vs DC 17)
R1 ⚔️ Sap! Wraith has disadvantage on next attack! 💫
R1 Wraith takes 2 HP damage from ongoing effects.
R1 📍 Wraith's turn (HP: 39/66)
R1 Wraith is acting...
R1 Wraith uses Life Drain!
R1 ⚔️ Wraith has disadvantage (Sapped)! 💫
R1 🎲 Disadvantage: Rolled 7 and 13, using 7
R1 🎲 Wraith rolls 7 + 1 = 8 vs AC 18
R1 ❌ Wraith misses!
R2 📍 Knight's turn (HP: 90/90)
R2 Knight attacks Wraith!
R2 Attack roll: 1 + 5 (ability) + 4 (prof) = 10 vs AC 13
R2 💥 Critical miss!
R2 Wraith takes 2 HP damage from ongoing effects.
R2 📍 Wraith's turn (HP: 37/66)
R2 Wraith is acting...
R2 Wraith uses Life Drain!
R2 🎲 Wraith rolls 15 + 1 = 16 vs AC 18
R2 ❌ Wraith misses!
R3 📍 Knight's turn (HP: 90/90)
R3 Knight attacks Wraith!
R3 Attack roll: 12 + 5 (ability) + 4 (prof) = 21 vs AC 13
R3 💥 Hit! Rolled Damage: 6 + 7 (ability) = 13 base damage
R3 Wraith takes 10.4 HP damage; 5.2 blood damage pending before defenses.
R3 Trip Attack: 12 HP damage.
R3 ⚔️ Trip Attack! +12 extra damage (d12)
R3 Wraith resists prone (RESILIENCE save 22 vs DC 17)
R3 ⚔️ Sap! Wraith has disadvantage on next attack! 💫
R3 Wraith takes 3.734 HP damage from ongoing effects.
R3 📍 Wraith's turn (HP: 10.866/66)
R3 Wraith is acting...
R3 Wraith uses Life Drain!
R3 ⚔️ Wraith has disadvantage (Sapped)! 💫
R3 🎲 Disadvantage: Rolled 8 and 3, using 3
R3 🎲 Wraith rolls 3 + 1 = 4 vs AC 18
R3 ❌ Wraith misses!
R4 📍 Knight's turn (HP: 90/90)
R4 Knight attacks Wraith!
R4 Attack roll: 18 + 5 (ability) + 4 (prof) = 27 vs AC 13
R4 💥 Hit! Rolled Damage: 8 + 7 (ability) = 15 base damage
R4 😩 You feel tired. (−1 skills & attacks)
R4 Wraith takes 10.866 HP damage.
R4 💀 Wraith is defeated!
R4 ⚔️ Sap! Wraith has disadvantage on next attack! 💫
```

Observed 26 blocked outbound edges. Player.handleInteraction tests each door tile independently; reverse passage may receive another permanent-lock check after the forward passage succeeded. Dungeon generation itself did not predeclare these challenge doors. This can strand the pilot and prevent quest completion independently of trap or combat difficulty. Recommend Game Designer/Mechanics Master assess alternate access and return-passage policy before judging skill success rates or tuning trap rewards.

Raw results include actual trap/disarm rolls and objective snapshots. Two completions were legacy Investigation, not composed deliveries. No boss victory observed; no estimate of boss suitability from this sample. Seed 2 failed path construction before dungeon exposure in every cell, which is a harness route boundary rather than a combat loss. Nine seed2 trials must not be labelled deaths or failed quest playthroughs.