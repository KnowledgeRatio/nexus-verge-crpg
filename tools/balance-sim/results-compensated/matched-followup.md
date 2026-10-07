# Matched weapon-family follow-up

84 cells ×1000 =84,000 actual-engine fights, plus7000 concentration trials. Same blood/bone longsword clone diagnostic, unchanged enemies; levels1/5/10 and both short/durable targets. Candidate values configured explicitly. Full results: /tmp/nexus-dot-matched-84k/compensated-blood-dot.json.

| Level/profile | Candidate | Win95%CI | Enemy turns |
|---|---|---:|---:|
| L1 short | instant100 | 96.20% (95.01–97.39%) | 2.37 |
| L1 short | premium70_70 | 96.40% (95.25–97.55%) | 2.31 |
| L1 short | premium80_40 | 96.10% (94.90–97.30%) | 2.44 |
| L1 durable | instant100 | 31.50% (28.62–34.38%) | 4.58 |
| L1 durable | premium70_70 | 43.20% (40.13–46.27%) | 4.16 |
| L1 durable | premium80_40 | 36.70% (33.71–39.69%) | 4.41 |
| L5 short | instant100 | 99.90% (99.70–100.00%) | 4.90 |
| L5 short | premium70_70 | 100.00% (100.00–100.00%) | 4.21 |
| L5 short | premium80_40 | 100.00% (100.00–100.00%) | 4.55 |
| L5 durable | instant100 | 46.80% (43.71–49.89%) | 8.23 |
| L5 durable | premium70_70 | 70.30% (67.47–73.13%) | 6.93 |
| L5 durable | premium80_40 | 59.00% (55.95–62.05%) | 7.58 |
| L10 short | instant100 | 100.00% (100.00–100.00%) | 5.03 |
| L10 short | premium70_70 | 100.00% (100.00–100.00%) | 4.24 |
| L10 short | premium80_40 | 100.00% (100.00–100.00%) | 4.64 |
| L10 durable | instant100 | 75.40% (72.73–78.07%) | 10.53 |
| L10 durable | premium70_70 | 89.80% (87.92–91.68%) | 8.46 |
| L10 durable | premium80_40 | 83.70% (81.41–85.99%) | 9.51 |

120%80/40 keeps the long-target reward smaller than140%70/70. L1short goblin outcomes are statistically indistinguishable (baseline96.2%,12096.1%,14096.4%);120 has slight turn timing cost2.44enemy turns vs2.37baseline. Durable L5 reward120+12.2points,140+23.5points; durableL10 reward120+8.3points,140+14.4points: all exceed summed margins. L1durable120+5.2points is not distinguishable,140+11.7points is. ShortL5/L10 outcomes are ceiling-limited at99.9–100%; do not infer equivalence from win rates. Normal approximationCI has zero width at100%; Wilson1000/1000 is99.62–100%.

## Traces

### L1 short instant100

**medianWin**
```text
R1 Attack roll: 6 + 2 (ability) + 2 (prof) = 10 vs AC 15
R1 Miss!
R1 🎲 Goblin rolls 12 + 1 = 13 vs AC 14
R1 ❌ Goblin misses!
R2 Attack roll: 11 + 2 (ability) + 2 (prof) = 15 vs AC 15
R2 💥 Hit! Rolled Damage: 8 + 2 (ability) = 10
R2 impact pc→enemy0 final10 HP7→0
```

**loss**
```text
R1 Attack roll: 5 + 2 (ability) + 2 (prof) = 9 vs AC 15
R1 Miss!
R1 🎲 Goblin rolls 20 + 1 = 21 vs AC 14
R1 ⭐ Critical hit! Scimitar: 8 blood damage
R1 impact enemy0→pc final8 HP12→4
R2 Attack roll: 4 + 2 (ability) + 2 (prof) = 8 vs AC 15
R2 Miss!
R2 🎲 Goblin rolls 13 + 1 = 14 vs AC 14
R2 impact enemy0→pc final4 HP4→0
```

**extreme**
```text
R1 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R1 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R1 impact pc→enemy0 final6 HP7→1
R1 🎲 Goblin rolls 11 + 1 = 12 vs AC 14
R1 ❌ Goblin misses!
R2 Attack roll: 15 + 2 (ability) + 2 (prof) = 19 vs AC 15
R2 💥 Hit! Rolled Damage: 3 + 2 (ability) = 5
R2 impact pc→enemy0 final5 HP1→0
```

### L1 short premium70_70

**medianWin**
```text
R1 Attack roll: 11 + 2 (ability) + 2 (prof) = 15 vs AC 15
R1 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R1 impact pc→enemy0 final4.2 HP7→2.8
R1 tick scheduler→enemy0 final1.4 HP2.8→1.4
R1 🎲 Goblin rolls 1 + 1 = 2 vs AC 14
R1 ❌ Critical miss!
R2 Attack roll: 8 + 2 (ability) + 2 (prof) = 12 vs AC 15
R2 Miss!
R2 tick scheduler→enemy0 final1.4 HP1.4→0
```

**loss**
```text
R1 Attack roll: 5 + 2 (ability) + 2 (prof) = 9 vs AC 15
R1 Miss!
R1 🎲 Goblin rolls 20 + 1 = 21 vs AC 14
R1 ⭐ Critical hit! Scimitar: 8 blood damage
R1 impact enemy0→pc final8 HP12→4
R2 Attack roll: 4 + 2 (ability) + 2 (prof) = 8 vs AC 15
R2 Miss!
R2 🎲 Goblin rolls 13 + 1 = 14 vs AC 14
R2 impact enemy0→pc final4 HP4→0
```

**extreme**
```text
R1 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R1 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R1 impact pc→enemy0 final4.2 HP7→2.8
R1 tick scheduler→enemy0 final1.4 HP2.8→1.4
R1 🎲 Goblin rolls 11 + 1 = 12 vs AC 14
R1 ❌ Goblin misses!
R2 Attack roll: 15 + 2 (ability) + 2 (prof) = 19 vs AC 15
R2 💥 Hit! Rolled Damage: 3 + 2 (ability) = 5
R2 impact pc→enemy0 final3.5 HP1.4→0
```

### L1 short premium80_40

**medianWin**
```text
R1 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R1 💥 Hit! Rolled Damage: 5 + 2 (ability) = 7
R1 impact pc→enemy0 final5.6 HP7→1.4
R1 tick scheduler→enemy0 final0.934 HP1.4→0.466
R1 🎲 Goblin rolls 5 + 1 = 6 vs AC 14
R1 ❌ Goblin misses!
R2 Attack roll: 10 + 2 (ability) + 2 (prof) = 14 vs AC 15
R2 Miss!
R2 tick scheduler→enemy0 final0.933 HP0.466→0
```

**loss**
```text
R1 Attack roll: 5 + 2 (ability) + 2 (prof) = 9 vs AC 15
R1 Miss!
R1 🎲 Goblin rolls 20 + 1 = 21 vs AC 14
R1 ⭐ Critical hit! Scimitar: 8 blood damage
R1 impact enemy0→pc final8 HP12→4
R2 Attack roll: 4 + 2 (ability) + 2 (prof) = 8 vs AC 15
R2 Miss!
R2 🎲 Goblin rolls 13 + 1 = 14 vs AC 14
R2 impact enemy0→pc final4 HP4→0
```

**extreme**
```text
R1 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R1 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R1 impact pc→enemy0 final4.8 HP7→2.2
R1 tick scheduler→enemy0 final0.8 HP2.2→1.4
R1 🎲 Goblin rolls 11 + 1 = 12 vs AC 14
R1 ❌ Goblin misses!
R2 Attack roll: 15 + 2 (ability) + 2 (prof) = 19 vs AC 15
R2 💥 Hit! Rolled Damage: 3 + 2 (ability) = 5
R2 impact pc→enemy0 final4 HP1.4→0
```

### L1 durable instant100

**medianWin**
```text
R1 🎲 Gnoll rolls 3 + 4 = 7 vs AC 14
R1 ❌ Gnoll misses!
R1 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R1 💥 Hit! Rolled Damage: 6 + 2 (ability) = 8
R1 impact pc→enemy0 final8 HP22→14
R2 🎲 Gnoll rolls 20 + 4 = 24 vs AC 14
R2 ⭐ Critical hit! Bite: 4 blood damage
R2 impact enemy0→pc final4 HP12→8
R2 Attack roll: 1 + 2 (ability) + 2 (prof) = 5 vs AC 15
R2 💥 Critical miss!
R3 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R3 ❌ Gnoll misses!
R3 Attack roll: 18 + 2 (ability) + 2 (prof) = 22 vs AC 15
R3 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R3 impact pc→enemy0 final6 HP14→8
R4 🎲 Gnoll rolls 10 + 4 = 14 vs AC 14
R4 impact enemy0→pc final3 HP8→5
R4 Attack roll: 3 + 2 (ability) + 2 (prof) = 7 vs AC 15
R4 Miss!
R5 🎲 Gnoll rolls 1 + 4 = 5 vs AC 14
R5 ❌ Critical miss!
R5 Attack roll: 13 + 2 (ability) + 2 (prof) = 17 vs AC 15
R5 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R5 impact pc→enemy0 final9 HP8→0
```

**loss**
```text
R1 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R1 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R1 impact pc→enemy0 final9 HP22→13
R1 🎲 Gnoll rolls 20 + 4 = 24 vs AC 14
R1 ⭐ Critical hit! Bite: 10 blood damage
R1 impact enemy0→pc final10 HP12→2
R2 Attack roll: 10 + 2 (ability) + 2 (prof) = 14 vs AC 15
R2 Miss!
R2 🎲 Gnoll rolls 13 + 4 = 17 vs AC 14
R2 impact enemy0→pc final5 HP2→0
```

**extreme**
```text
R1 Attack roll: 14 + 2 (ability) + 2 (prof) = 18 vs AC 15
R1 💥 Hit! Rolled Damage: 2 + 2 (ability) = 4
R1 impact pc→enemy0 final4 HP22→18
R1 🎲 Gnoll rolls 9 + 4 = 13 vs AC 14
R1 ❌ Gnoll misses!
R2 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R2 ⭐ Critical hit!
R2 💥 Hit! Rolled Damage: 8 + 7 (crit) + 2 (ability) = 17
R2 impact pc→enemy0 final17 HP18→1
R2 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R2 ❌ Gnoll misses!
R3 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R3 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R3 impact pc→enemy0 final6 HP1→0
```

### L1 durable premium70_70

**medianWin**
```text
R1 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R1 💥 Hit! Rolled Damage: 2 + 2 (ability) = 4
R1 impact pc→enemy0 final2.8 HP22→19.2
R1 tick scheduler→enemy0 final0.934 HP19.2→18.266
R1 🎲 Gnoll rolls 16 + 4 = 20 vs AC 14
R1 impact enemy0→pc final3 HP12→9
R2 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R2 💥 Hit! Rolled Damage: 5 + 2 (ability) = 7
R2 impact pc→enemy0 final4.9 HP18.266→13.366
R2 tick scheduler→enemy0 final2.567 HP13.366→10.799
R2 🎲 Gnoll rolls 12 + 4 = 16 vs AC 14
R2 impact enemy0→pc final3 HP9→6
R3 Attack roll: 8 + 2 (ability) + 2 (prof) = 12 vs AC 15
R3 Miss!
R3 tick scheduler→enemy0 final2.566 HP10.799→8.233
R3 🎲 Gnoll rolls 1 + 4 = 5 vs AC 14
R3 ❌ Critical miss!
R4 Attack roll: 16 + 2 (ability) + 2 (prof) = 20 vs AC 15
R4 💥 Hit! Rolled Damage: 6 + 2 (ability) = 8
R4 impact pc→enemy0 final5.6 HP8.233→2.633
R4 tick scheduler→enemy0 final3.5 HP2.633→0
```

**loss**
```text
R1 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R1 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R1 impact pc→enemy0 final6.3 HP22→15.7
R1 tick scheduler→enemy0 final2.1 HP15.7→13.6
R1 🎲 Gnoll rolls 20 + 4 = 24 vs AC 14
R1 ⭐ Critical hit! Bite: 10 blood damage
R1 impact enemy0→pc final10 HP12→2
R2 Attack roll: 10 + 2 (ability) + 2 (prof) = 14 vs AC 15
R2 Miss!
R2 tick scheduler→enemy0 final2.1 HP13.6→11.5
R2 🎲 Gnoll rolls 13 + 4 = 17 vs AC 14
R2 impact enemy0→pc final5 HP2→0
```

**extreme**
```text
R1 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R1 ⭐ Critical hit!
R1 💥 Hit! Rolled Damage: 7 + 3 (crit) + 2 (ability) = 12
R1 impact pc→enemy0 final8.4 HP22→13.6
R1 tick scheduler→enemy0 final2.8 HP13.6→10.8
R1 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R1 ❌ Gnoll misses!
R2 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R2 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R2 impact pc→enemy0 final6.3 HP10.8→4.5
R2 tick scheduler→enemy0 final4.9 HP4.5→0
```

### L1 durable premium80_40

**medianWin**
```text
R1 Attack roll: 6 + 2 (ability) + 2 (prof) = 10 vs AC 15
R1 Miss!
R1 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R1 ❌ Gnoll misses!
R2 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R2 ⭐ Critical hit!
R2 💥 Hit! Rolled Damage: 6 + 5 (crit) + 2 (ability) = 13
R2 impact pc→enemy0 final10.4 HP22→11.6
R2 tick scheduler→enemy0 final1.734 HP11.6→9.866
R2 🎲 Gnoll rolls 19 + 4 = 23 vs AC 14
R2 impact enemy0→pc final3 HP12→9
R3 Attack roll: 9 + 2 (ability) + 2 (prof) = 13 vs AC 15
R3 Miss!
R3 tick scheduler→enemy0 final1.733 HP9.866→8.133
R3 🎲 Gnoll rolls 9 + 4 = 13 vs AC 14
R3 ❌ Gnoll misses!
R4 Attack roll: 11 + 2 (ability) + 2 (prof) = 15 vs AC 15
R4 💥 Hit! Rolled Damage: 3 + 2 (ability) = 5
R4 impact pc→enemy0 final4 HP8.133→4.133
R4 tick scheduler→enemy0 final2.4 HP4.133→1.733
R4 🎲 Gnoll rolls 5 + 4 = 9 vs AC 14
R4 ❌ Gnoll misses!
R5 Attack roll: 13 + 2 (ability) + 2 (prof) = 17 vs AC 15
R5 💥 Hit! Rolled Damage: 1 + 2 (ability) = 3
R5 impact pc→enemy0 final2.4 HP1.733→0
```

**loss**
```text
R1 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R1 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R1 impact pc→enemy0 final7.2 HP22→14.8
R1 tick scheduler→enemy0 final1.2 HP14.8→13.6
R1 🎲 Gnoll rolls 20 + 4 = 24 vs AC 14
R1 ⭐ Critical hit! Bite: 10 blood damage
R1 impact enemy0→pc final10 HP12→2
R2 Attack roll: 10 + 2 (ability) + 2 (prof) = 14 vs AC 15
R2 Miss!
R2 tick scheduler→enemy0 final1.2 HP13.6→12.4
R2 🎲 Gnoll rolls 13 + 4 = 17 vs AC 14
R2 impact enemy0→pc final5 HP2→0
```

**extreme**
```text
R1 Attack roll: 14 + 2 (ability) + 2 (prof) = 18 vs AC 15
R1 💥 Hit! Rolled Damage: 2 + 2 (ability) = 4
R1 impact pc→enemy0 final3.2 HP22→18.8
R1 tick scheduler→enemy0 final0.534 HP18.8→18.266
R1 🎲 Gnoll rolls 9 + 4 = 13 vs AC 14
R1 ❌ Gnoll misses!
R2 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R2 ⭐ Critical hit!
R2 💥 Hit! Rolled Damage: 8 + 7 (crit) + 2 (ability) = 17
R2 impact pc→enemy0 final13.6 HP18.266→4.666
R2 tick scheduler→enemy0 final2.8 HP4.666→1.866
R2 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R2 ❌ Gnoll misses!
R3 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R3 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R3 impact pc→enemy0 final4.8 HP1.866→0
```

### L5 durable instant100

**medianWin**
```text
R1 🎲 Ogre rolls 6 + 6 = 12 vs AC 16
R1 ❌ Ogre misses!
R1 Attack roll: 19 + 3 (ability) + 3 (prof) = 25 vs AC 11
R1 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R1 impact pc→enemy0 final11 HP59→48
R2 🎲 Ogre rolls 9 + 6 = 15 vs AC 16
R2 ❌ Ogre misses!
R2 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R2 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R2 impact pc→enemy0 final11 HP48→37
R3 🎲 Ogre rolls 9 + 6 = 15 vs AC 16
R3 ❌ Ogre misses!
R3 Attack roll: 12 + 3 (ability) + 3 (prof) = 18 vs AC 11
R3 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R3 impact pc→enemy0 final7 HP37→30
R4 🎲 Ogre rolls 14 + 6 = 20 vs AC 16
R4 impact enemy0→pc final6 HP44→38
R4 Attack roll: 13 + 3 (ability) + 3 (prof) = 19 vs AC 11
R4 💥 Hit! Rolled Damage: 6 + 3 (ability) = 9
R4 impact pc→enemy0 final9 HP30→21
R5 🎲 Ogre rolls 3 + 6 = 9 vs AC 16
R5 ❌ Ogre misses!
R5 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R5 💥 Hit! Rolled Damage: 2 + 3 (ability) = 5
R5 impact pc→enemy0 final5 HP21→16
R6 🎲 Ogre rolls 19 + 6 = 25 vs AC 16
R6 impact enemy0→pc final8 HP38→30
R6 Attack roll: 4 + 3 (ability) + 3 (prof) = 10 vs AC 11
R6 Miss!
R7 🎲 Ogre rolls 8 + 6 = 14 vs AC 16
R7 ❌ Ogre misses!
R7 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R7 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R7 impact pc→enemy0 final7 HP16→9
R8 🎲 Ogre rolls 1 + 6 = 7 vs AC 16
R8 ❌ Critical miss!
R8 Attack roll: 2 + 3 (ability) + 3 (prof) = 8 vs AC 11
R8 Miss!
R9 🎲 Ogre rolls 10 + 6 = 16 vs AC 16
R9 impact enemy0→pc final7 HP30→23
R9 Attack roll: 11 + 3 (ability) + 3 (prof) = 17 vs AC 11
R9 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R9 impact pc→enemy0 final10 HP9→0
```

**loss**
```text
R1 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R1 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R1 impact pc→enemy0 final10 HP59→49
R1 🎲 Ogre rolls 17 + 6 = 23 vs AC 16
R1 impact enemy0→pc final10 HP44→34
R2 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R2 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R2 impact pc→enemy0 final7 HP49→42
R2 🎲 Ogre rolls 20 + 6 = 26 vs AC 16
R2 ⭐ Critical hit! Greatclub: 13 bone damage
R2 impact enemy0→pc final13 HP34→21
R3 Attack roll: 13 + 3 (ability) + 3 (prof) = 19 vs AC 11
R3 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R3 impact pc→enemy0 final7 HP42→35
R3 🎲 Ogre rolls 14 + 6 = 20 vs AC 16
R3 impact enemy0→pc final9 HP21→12
R4 Attack roll: 1 + 3 (ability) + 3 (prof) = 7 vs AC 11
R4 💥 Critical miss!
R4 🎲 Ogre rolls 12 + 6 = 18 vs AC 16
R4 impact enemy0→pc final12 HP12→0
```

**extreme**
```text
R1 🎲 Ogre rolls 4 + 6 = 10 vs AC 16
R1 ❌ Ogre misses!
R1 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R1 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R1 impact pc→enemy0 final7 HP59→52
R2 🎲 Ogre rolls 5 + 6 = 11 vs AC 16
R2 ❌ Ogre misses!
R2 Attack roll: 17 + 3 (ability) + 3 (prof) = 23 vs AC 11
R2 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R2 impact pc→enemy0 final11 HP52→41
R3 🎲 Ogre rolls 7 + 6 = 13 vs AC 16
R3 ❌ Ogre misses!
R3 Attack roll: 13 + 3 (ability) + 3 (prof) = 19 vs AC 11
R3 💥 Hit! Rolled Damage: 5 + 3 (ability) = 8
R3 impact pc→enemy0 final8 HP41→33
R4 🎲 Ogre rolls 1 + 6 = 7 vs AC 16
R4 ❌ Critical miss!
R4 Attack roll: 11 + 3 (ability) + 3 (prof) = 17 vs AC 11
R4 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R4 impact pc→enemy0 final10 HP33→23
R5 🎲 Ogre rolls 9 + 6 = 15 vs AC 16
R5 ❌ Ogre misses!
R5 Attack roll: 18 + 3 (ability) + 3 (prof) = 24 vs AC 11
R5 💥 Hit! Rolled Damage: 5 + 3 (ability) = 8
R5 impact pc→enemy0 final8 HP23→15
R6 🎲 Ogre rolls 14 + 6 = 20 vs AC 16
R6 impact enemy0→pc final5 HP44→39
R6 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R6 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R6 impact pc→enemy0 final10 HP15→5
R7 🎲 Ogre rolls 9 + 6 = 15 vs AC 16
R7 ❌ Ogre misses!
R7 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R7 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R7 impact pc→enemy0 final6 HP5→0
```

### L5 durable premium70_70

**medianWin**
```text
R1 Attack roll: 2 + 3 (ability) + 3 (prof) = 8 vs AC 11
R1 Miss!
R1 🎲 Ogre rolls 16 + 6 = 22 vs AC 16
R1 impact enemy0→pc final11 HP44→33
R2 Attack roll: 15 + 3 (ability) + 3 (prof) = 21 vs AC 11
R2 💥 Hit! Rolled Damage: 2 + 3 (ability) = 5
R2 impact pc→enemy0 final3.5 HP59→55.5
R2 tick scheduler→enemy0 final1.167 HP55.5→54.333
R2 🎲 Ogre rolls 12 + 6 = 18 vs AC 16
R2 impact enemy0→pc final6 HP33→27
R3 Attack roll: 19 + 3 (ability) + 3 (prof) = 25 vs AC 11
R3 💥 Hit! Rolled Damage: 2 + 3 (ability) = 5
R3 impact pc→enemy0 final3.5 HP54.333→50.833
R3 tick scheduler→enemy0 final2.334 HP50.833→48.499
R3 🎲 Ogre rolls 10 + 6 = 16 vs AC 16
R3 impact enemy0→pc final8 HP27→19
R4 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R4 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R4 impact pc→enemy0 final7.7 HP48.499→40.799
R4 tick scheduler→enemy0 final4.9 HP40.799→35.899
R4 🎲 Ogre rolls 1 + 6 = 7 vs AC 16
R4 ❌ Critical miss!
R5 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R5 💥 Hit! Rolled Damage: 6 + 3 (ability) = 9
R5 impact pc→enemy0 final6.3 HP35.899→29.599
R5 tick scheduler→enemy0 final5.833 HP29.599→23.766
R5 🎲 Ogre rolls 19 + 6 = 25 vs AC 16
R5 impact enemy0→pc final6 HP19→13
R6 Attack roll: 16 + 3 (ability) + 3 (prof) = 22 vs AC 11
R6 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R6 impact pc→enemy0 final7 HP23.766→16.766
R6 tick scheduler→enemy0 final7 HP16.766→9.766
R6 🎲 Ogre rolls 1 + 6 = 7 vs AC 16
R6 ❌ Critical miss!
R7 Attack roll: 11 + 3 (ability) + 3 (prof) = 17 vs AC 11
R7 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R7 impact pc→enemy0 final4.9 HP9.766→4.866
R7 tick scheduler→enemy0 final6.067 HP4.866→0
```

**loss**
```text
R1 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R1 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R1 impact pc→enemy0 final7 HP59→52
R1 tick scheduler→enemy0 final2.334 HP52→49.666
R1 🎲 Ogre rolls 17 + 6 = 23 vs AC 16
R1 impact enemy0→pc final10 HP44→34
R2 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R2 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R2 impact pc→enemy0 final4.9 HP49.666→44.766
R2 tick scheduler→enemy0 final3.967 HP44.766→40.799
R2 🎲 Ogre rolls 20 + 6 = 26 vs AC 16
R2 ⭐ Critical hit! Greatclub: 13 bone damage
R2 impact enemy0→pc final13 HP34→21
R3 Attack roll: 13 + 3 (ability) + 3 (prof) = 19 vs AC 11
R3 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R3 impact pc→enemy0 final4.9 HP40.799→35.899
R3 tick scheduler→enemy0 final5.6 HP35.899→30.299
R3 🎲 Ogre rolls 14 + 6 = 20 vs AC 16
R3 impact enemy0→pc final9 HP21→12
R4 Attack roll: 1 + 3 (ability) + 3 (prof) = 7 vs AC 11
R4 💥 Critical miss!
R4 tick scheduler→enemy0 final3.266 HP30.299→27.033
R4 🎲 Ogre rolls 12 + 6 = 18 vs AC 16
R4 impact enemy0→pc final12 HP12→0
```

**extreme**
```text
R1 🎲 Ogre rolls 6 + 6 = 12 vs AC 16
R1 ❌ Ogre misses!
R1 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R1 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R1 impact pc→enemy0 final4.2 HP59→54.8
R2 tick scheduler→enemy0 final1.4 HP54.8→53.4
R2 🎲 Ogre rolls 7 + 6 = 13 vs AC 16
R2 ❌ Ogre misses!
R2 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R2 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R2 impact pc→enemy0 final4.2 HP53.4→49.2
R3 tick scheduler→enemy0 final2.8 HP49.2→46.4
R3 🎲 Ogre rolls 1 + 6 = 7 vs AC 16
R3 ❌ Critical miss!
R3 Attack roll: 10 + 3 (ability) + 3 (prof) = 16 vs AC 11
R3 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R3 impact pc→enemy0 final7.7 HP46.4→38.7
R4 tick scheduler→enemy0 final5.367 HP38.7→33.333
R4 🎲 Ogre rolls 3 + 6 = 9 vs AC 16
R4 ❌ Ogre misses!
R4 Attack roll: 18 + 3 (ability) + 3 (prof) = 24 vs AC 11
R4 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R4 impact pc→enemy0 final7 HP33.333→26.333
R5 tick scheduler→enemy0 final6.301 HP26.333→20.032
R5 🎲 Ogre rolls 6 + 6 = 12 vs AC 16
R5 ❌ Ogre misses!
R5 Attack roll: 12 + 3 (ability) + 3 (prof) = 18 vs AC 11
R5 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R5 impact pc→enemy0 final7.7 HP20.032→12.332
R6 tick scheduler→enemy0 final7.466 HP12.332→4.866
R6 🎲 Ogre rolls 2 + 6 = 8 vs AC 16
R6 ❌ Ogre misses!
R6 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R6 💥 Hit! Rolled Damage: 6 + 3 (ability) = 9
R6 impact pc→enemy0 final6.3 HP4.866→0
```

### L5 durable premium80_40

**medianWin**
```text
R1 Attack roll: 19 + 3 (ability) + 3 (prof) = 25 vs AC 11
R1 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R1 impact pc→enemy0 final5.6 HP59→53.4
R1 tick scheduler→enemy0 final0.934 HP53.4→52.466
R1 🎲 Ogre rolls 10 + 6 = 16 vs AC 16
R1 impact enemy0→pc final12 HP44→32
R2 Attack roll: 2 + 3 (ability) + 3 (prof) = 8 vs AC 11
R2 Miss!
R2 tick scheduler→enemy0 final0.933 HP52.466→51.533
R2 🎲 Ogre rolls 13 + 6 = 19 vs AC 16
R2 impact enemy0→pc final5 HP32→27
R3 Attack roll: 15 + 3 (ability) + 3 (prof) = 21 vs AC 11
R3 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R3 impact pc→enemy0 final4.8 HP51.533→46.733
R3 tick scheduler→enemy0 final1.733 HP46.733→45
R3 🎲 Ogre rolls 12 + 6 = 18 vs AC 16
R3 impact enemy0→pc final11 HP27→16
R4 Attack roll: 20 + 3 (ability) + 3 (prof) = 26 vs AC 11
R4 ⭐ Critical hit!
R4 💥 Hit! Rolled Damage: 3 + 3 (crit) + 3 (ability) = 9
R4 impact pc→enemy0 final7.2 HP45→37.8
R4 tick scheduler→enemy0 final2 HP37.8→35.8
R4 🎲 Ogre rolls 1 + 6 = 7 vs AC 16
R4 ❌ Critical miss!
R5 Attack roll: 19 + 3 (ability) + 3 (prof) = 25 vs AC 11
R5 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R5 impact pc→enemy0 final4.8 HP35.8→31
R5 tick scheduler→enemy0 final2.8 HP31→28.2
R5 🎲 Ogre rolls 12 + 6 = 18 vs AC 16
R5 impact enemy0→pc final7 HP16→9
R6 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R6 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R6 impact pc→enemy0 final5.6 HP28.2→22.6
R6 tick scheduler→enemy0 final2.934 HP22.6→19.666
R6 🎲 Ogre rolls 17 + 6 = 23 vs AC 16
R6 impact enemy0→pc final8 HP9→1
R7 Attack roll: 18 + 3 (ability) + 3 (prof) = 24 vs AC 11
R7 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R7 impact pc→enemy0 final8 HP19.666→11.666
R7 tick scheduler→enemy0 final3.067 HP11.666→8.599
R7 🎲 Ogre rolls 3 + 6 = 9 vs AC 16
R7 ❌ Ogre misses!
R8 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R8 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R8 impact pc→enemy0 final8 HP8.599→0.599
R8 tick scheduler→enemy0 final3.6 HP0.599→0
```

**loss**
```text
R1 Attack roll: 5 + 3 (ability) + 3 (prof) = 11 vs AC 11
R1 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R1 impact pc→enemy0 final8 HP59→51
R1 tick scheduler→enemy0 final1.334 HP51→49.666
R1 🎲 Ogre rolls 17 + 6 = 23 vs AC 16
R1 impact enemy0→pc final10 HP44→34
R2 Attack roll: 14 + 3 (ability) + 3 (prof) = 20 vs AC 11
R2 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R2 impact pc→enemy0 final5.6 HP49.666→44.066
R2 tick scheduler→enemy0 final2.267 HP44.066→41.799
R2 🎲 Ogre rolls 20 + 6 = 26 vs AC 16
R2 ⭐ Critical hit! Greatclub: 13 bone damage
R2 impact enemy0→pc final13 HP34→21
R3 Attack roll: 13 + 3 (ability) + 3 (prof) = 19 vs AC 11
R3 💥 Hit! Rolled Damage: 4 + 3 (ability) = 7
R3 impact pc→enemy0 final5.6 HP41.799→36.199
R3 tick scheduler→enemy0 final3.2 HP36.199→32.999
R3 🎲 Ogre rolls 14 + 6 = 20 vs AC 16
R3 impact enemy0→pc final9 HP21→12
R4 Attack roll: 1 + 3 (ability) + 3 (prof) = 7 vs AC 11
R4 💥 Critical miss!
R4 tick scheduler→enemy0 final1.866 HP32.999→31.133
R4 🎲 Ogre rolls 12 + 6 = 18 vs AC 16
R4 impact enemy0→pc final12 HP12→0
```

**extreme**
```text
R1 🎲 Ogre rolls 6 + 6 = 12 vs AC 16
R1 ❌ Ogre misses!
R1 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R1 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R1 impact pc→enemy0 final4.8 HP59→54.2
R2 tick scheduler→enemy0 final0.8 HP54.2→53.4
R2 🎲 Ogre rolls 7 + 6 = 13 vs AC 16
R2 ❌ Ogre misses!
R2 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R2 💥 Hit! Rolled Damage: 3 + 3 (ability) = 6
R2 impact pc→enemy0 final4.8 HP53.4→48.6
R3 tick scheduler→enemy0 final1.6 HP48.6→47
R3 🎲 Ogre rolls 1 + 6 = 7 vs AC 16
R3 ❌ Critical miss!
R3 Attack roll: 10 + 3 (ability) + 3 (prof) = 16 vs AC 11
R3 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R3 impact pc→enemy0 final8.8 HP47→38.2
R4 tick scheduler→enemy0 final3.067 HP38.2→35.133
R4 🎲 Ogre rolls 3 + 6 = 9 vs AC 16
R4 ❌ Ogre misses!
R4 Attack roll: 18 + 3 (ability) + 3 (prof) = 24 vs AC 11
R4 💥 Hit! Rolled Damage: 7 + 3 (ability) = 10
R4 impact pc→enemy0 final8 HP35.133→27.133
R5 tick scheduler→enemy0 final3.601 HP27.133→23.532
R5 🎲 Ogre rolls 6 + 6 = 12 vs AC 16
R5 ❌ Ogre misses!
R5 Attack roll: 12 + 3 (ability) + 3 (prof) = 18 vs AC 11
R5 💥 Hit! Rolled Damage: 8 + 3 (ability) = 11
R5 impact pc→enemy0 final8.8 HP23.532→14.732
R6 tick scheduler→enemy0 final4.266 HP14.732→10.466
R6 🎲 Ogre rolls 2 + 6 = 8 vs AC 16
R6 ❌ Ogre misses!
R6 Attack roll: 9 + 3 (ability) + 3 (prof) = 15 vs AC 11
R6 💥 Hit! Rolled Damage: 6 + 3 (ability) = 9
R6 impact pc→enemy0 final7.2 HP10.466→3.266
R7 tick scheduler→enemy0 final4 HP3.266→0
```

### L10 durable instant100

**medianWin**
```text
R1 Attack roll: 9 + 4 (ability) + 4 (prof) = 17 vs AC 17
R1 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R1 impact pc→enemy0 final12 HP58→46
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R1 ⭐ Critical hit! Sword: 12 blood damage
R1 impact enemy0→pc final12 HP84→72
R1 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R1 ❌ Veteran misses!
R2 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R2 💥 Hit! Rolled Damage: 4 + 4 (ability) = 8
R2 impact pc→enemy0 final8 HP46→38
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R2 impact enemy0→pc final8 HP72→64
R2 🎲 Veteran rolls 13 + 5 = 18 vs AC 18
R2 impact enemy0→pc final5 HP64→59
R3 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R3 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R3 impact pc→enemy0 final7 HP38→31
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R3 ❌ Veteran misses!
R4 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R4 Miss!
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R4 ⭐ Critical hit! Sword: 10 blood damage
R4 impact enemy0→pc final10 HP59→49
R4 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R4 impact enemy0→pc final4 HP49→45
R5 Attack roll: 14 + 4 (ability) + 4 (prof) = 22 vs AC 17
R5 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R5 impact pc→enemy0 final9 HP31→22
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R5 impact enemy0→pc final5 HP45→40
R5 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R5 ❌ Veteran misses!
R6 Attack roll: 18 + 4 (ability) + 4 (prof) = 26 vs AC 17
R6 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R6 impact pc→enemy0 final9 HP22→13
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R6 impact enemy0→pc final7 HP40→33
R7 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R7 💥 Critical miss!
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R7 ❌ Veteran misses!
R7 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R7 ❌ Critical miss!
R8 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R8 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R8 impact pc→enemy0 final6 HP13→7
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R8 ❌ Veteran misses!
R8 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R8 impact enemy0→pc final4 HP33→29
R9 Attack roll: 5 + 4 (ability) + 4 (prof) = 13 vs AC 17
R9 Miss!
R9 ⚔️ Veteran uses Multiattack!
R9 🎲 Veteran rolls 13 + 5 = 18 vs AC 18
R9 impact enemy0→pc final11 HP29→18
R9 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R9 ❌ Veteran misses!
R10 Attack roll: 9 + 4 (ability) + 4 (prof) = 17 vs AC 17
R10 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R10 impact pc→enemy0 final6 HP7→1
R10 ⚔️ Veteran uses Multiattack!
R10 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R10 impact enemy0→pc final9 HP18→9
R10 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R10 ❌ Veteran misses!
R11 Attack roll: 9 + 4 (ability) + 4 (prof) = 17 vs AC 17
R11 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R11 impact pc→enemy0 final11 HP1→0
```

**loss**
```text
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R1 impact enemy0→pc final8 HP84→76
R1 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R1 💥 Critical miss!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R2 impact enemy0→pc final6 HP76→70
R2 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R2 ❌ Veteran misses!
R2 Attack roll: 2 + 4 (ability) + 4 (prof) = 10 vs AC 17
R2 Miss!
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R3 ⭐ Critical hit! Sword: 13 blood damage
R3 impact enemy0→pc final13 HP70→57
R3 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R3 ❌ Veteran misses!
R3 Attack roll: 5 + 4 (ability) + 4 (prof) = 13 vs AC 17
R3 Miss!
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final7 HP57→50
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final8 HP50→42
R4 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R4 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R4 impact pc→enemy0 final11 HP58→47
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R5 impact enemy0→pc final10 HP42→32
R5 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R5 impact enemy0→pc final6 HP32→26
R5 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R5 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R5 impact pc→enemy0 final12 HP47→35
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 13 + 5 = 18 vs AC 18
R6 impact enemy0→pc final10 HP26→16
R6 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R6 ⭐ Critical hit! Shortsword: 13 blood damage
R6 impact enemy0→pc final13 HP16→3
R6 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact pc→enemy0 final12 HP35→23
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R7 impact enemy0→pc final5 HP3→0
```

**extreme**
```text
R1 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R1 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R1 impact pc→enemy0 final6 HP58→52
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R1 ❌ Critical miss!
R2 Attack roll: 17 + 4 (ability) + 4 (prof) = 25 vs AC 17
R2 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R2 impact pc→enemy0 final5 HP52→47
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R2 ❌ Veteran misses!
R3 Attack roll: 12 + 4 (ability) + 4 (prof) = 20 vs AC 17
R3 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R3 impact pc→enemy0 final7 HP47→40
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R3 ❌ Veteran misses!
R4 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R4 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R4 impact pc→enemy0 final12 HP40→28
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R4 impact enemy0→pc final9 HP84→75
R5 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R5 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R5 impact pc→enemy0 final11 HP28→17
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R5 ❌ Veteran misses!
R5 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R5 ❌ Veteran misses!
R6 Attack roll: 18 + 4 (ability) + 4 (prof) = 26 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact pc→enemy0 final12 HP17→5
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R6 ❌ Veteran misses!
R7 Attack roll: 9 + 4 (ability) + 4 (prof) = 17 vs AC 17
R7 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R7 impact pc→enemy0 final10 HP5→0
```

### L10 durable premium70_70

**medianWin**
```text
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R1 ❌ Veteran misses!
R1 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R1 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R1 impact pc→enemy0 final8.4 HP58→49.6
R2 tick scheduler→enemy0 final2.8 HP49.6→46.8
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R2 ❌ Veteran misses!
R2 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R2 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R2 impact pc→enemy0 final3.5 HP46.8→43.3
R3 tick scheduler→enemy0 final3.967 HP43.3→39.333
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R3 impact enemy0→pc final5 HP84→79
R3 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R3 impact enemy0→pc final6 HP79→73
R3 Attack roll: 2 + 4 (ability) + 4 (prof) = 10 vs AC 17
R3 Miss!
R4 tick scheduler→enemy0 final3.967 HP39.333→35.366
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final5 HP73→68
R4 Attack roll: 2 + 4 (ability) + 4 (prof) = 10 vs AC 17
R4 Miss!
R5 tick scheduler→enemy0 final1.166 HP35.366→34.2
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R5 ❌ Critical miss!
R5 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R5 impact enemy0→pc final4 HP68→64
R5 Attack roll: 18 + 4 (ability) + 4 (prof) = 26 vs AC 17
R5 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R5 impact pc→enemy0 final8.4 HP34.2→25.8
R6 tick scheduler→enemy0 final2.8 HP25.8→23
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R6 impact enemy0→pc final4 HP64→60
R6 Attack roll: 12 + 4 (ability) + 4 (prof) = 20 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact pc→enemy0 final8.4 HP23→14.6
R7 tick scheduler→enemy0 final5.6 HP14.6→9
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R7 impact enemy0→pc final6 HP60→54
R7 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R7 ❌ Critical miss!
R7 Attack roll: 3 + 4 (ability) + 4 (prof) = 11 vs AC 17
R7 Miss!
R8 tick scheduler→enemy0 final5.6 HP9→3.4
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R8 ❌ Veteran misses!
R8 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R8 ❌ Veteran misses!
R8 Attack roll: 9 + 4 (ability) + 4 (prof) = 17 vs AC 17
R8 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R8 impact pc→enemy0 final7.7 HP3.4→0
```

**loss**
```text
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R1 impact enemy0→pc final8 HP84→76
R1 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R1 💥 Critical miss!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R2 impact enemy0→pc final6 HP76→70
R2 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R2 ❌ Veteran misses!
R2 Attack roll: 2 + 4 (ability) + 4 (prof) = 10 vs AC 17
R2 Miss!
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R3 ⭐ Critical hit! Sword: 13 blood damage
R3 impact enemy0→pc final13 HP70→57
R3 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R3 ❌ Veteran misses!
R3 Attack roll: 5 + 4 (ability) + 4 (prof) = 13 vs AC 17
R3 Miss!
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final7 HP57→50
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final8 HP50→42
R4 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R4 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R4 impact pc→enemy0 final7.7 HP58→50.3
R5 tick scheduler→enemy0 final2.567 HP50.3→47.733
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R5 impact enemy0→pc final10 HP42→32
R5 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R5 impact enemy0→pc final6 HP32→26
R5 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R5 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R5 impact pc→enemy0 final8.4 HP47.733→39.333
R6 tick scheduler→enemy0 final5.367 HP39.333→33.966
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 13 + 5 = 18 vs AC 18
R6 impact enemy0→pc final10 HP26→16
R6 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R6 ⭐ Critical hit! Shortsword: 13 blood damage
R6 impact enemy0→pc final13 HP16→3
R6 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact pc→enemy0 final8.4 HP33.966→25.566
R7 tick scheduler→enemy0 final8.166 HP25.566→17.4
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R7 impact enemy0→pc final5 HP3→0
```

**extreme**
```text
R1 Attack roll: 20 + 4 (ability) + 4 (prof) = 28 vs AC 17
R1 ⭐ Critical hit!
R1 💥 Hit! Rolled Damage: 2 + 3 (crit) + 4 (ability) = 9
R1 impact pc→enemy0 final6.3 HP58→51.7
R1 tick scheduler→enemy0 final2.1 HP51.7→49.6
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R1 ❌ Critical miss!
R2 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R2 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R2 impact pc→enemy0 final6.3 HP49.6→43.3
R2 tick scheduler→enemy0 final4.2 HP43.3→39.1
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R2 ❌ Critical miss!
R2 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R2 ❌ Veteran misses!
R3 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R3 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R3 impact pc→enemy0 final6.3 HP39.1→32.8
R3 tick scheduler→enemy0 final6.3 HP32.8→26.5
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R3 ❌ Veteran misses!
R4 Attack roll: 8 + 4 (ability) + 4 (prof) = 16 vs AC 17
R4 Miss!
R4 tick scheduler→enemy0 final4.2 HP26.5→22.3
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R4 ❌ Veteran misses!
R5 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R5 Miss!
R5 tick scheduler→enemy0 final2.1 HP22.3→20.2
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R5 ❌ Veteran misses!
R5 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R5 ❌ Veteran misses!
R6 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R6 Miss!
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R6 ❌ Veteran misses!
R7 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R7 💥 Hit! Rolled Damage: 4 + 4 (ability) = 8
R7 impact pc→enemy0 final5.6 HP20.2→14.6
R7 tick scheduler→enemy0 final1.867 HP14.6→12.733
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R7 ❌ Veteran misses!
R7 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R7 ❌ Veteran misses!
R8 Attack roll: 2 + 4 (ability) + 4 (prof) = 10 vs AC 17
R8 Miss!
R8 tick scheduler→enemy0 final1.867 HP12.733→10.866
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R8 ❌ Veteran misses!
R8 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R8 ❌ Veteran misses!
R9 Attack roll: 9 + 4 (ability) + 4 (prof) = 17 vs AC 17
R9 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R9 impact pc→enemy0 final7 HP10.866→3.866
R9 tick scheduler→enemy0 final4.2 HP3.866→0
```

### L10 durable premium80_40

**medianWin**
```text
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R1 ❌ Veteran misses!
R1 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R1 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R1 impact pc→enemy0 final5.6 HP58→52.4
R2 tick scheduler→enemy0 final0.934 HP52.4→51.466
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R2 ❌ Veteran misses!
R2 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R2 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R2 impact pc→enemy0 final9.6 HP51.466→41.866
R3 tick scheduler→enemy0 final2.533 HP41.866→39.333
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R3 impact enemy0→pc final6 HP84→78
R3 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R3 ❌ Critical miss!
R3 Attack roll: 12 + 4 (ability) + 4 (prof) = 20 vs AC 17
R3 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R3 impact pc→enemy0 final5.6 HP39.333→33.733
R4 tick scheduler→enemy0 final3.467 HP33.733→30.266
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final7 HP78→71
R4 Attack roll: 9 + 4 (ability) + 4 (prof) = 17 vs AC 17
R4 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R4 impact pc→enemy0 final9.6 HP30.266→20.666
R5 tick scheduler→enemy0 final4.133 HP20.666→16.533
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R5 impact enemy0→pc final10 HP71→61
R5 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R5 ❌ Veteran misses!
R5 Attack roll: 5 + 4 (ability) + 4 (prof) = 13 vs AC 17
R5 Miss!
R6 tick scheduler→enemy0 final2.533 HP16.533→14
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R6 ❌ Veteran misses!
R6 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R6 💥 Critical miss!
R7 tick scheduler→enemy0 final1.6 HP14→12.4
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R7 ❌ Veteran misses!
R7 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R7 ❌ Veteran misses!
R7 Attack roll: 12 + 4 (ability) + 4 (prof) = 20 vs AC 17
R7 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R7 impact pc→enemy0 final8 HP12.4→4.4
R8 tick scheduler→enemy0 final1.334 HP4.4→3.066
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R8 impact enemy0→pc final7 HP61→54
R8 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R8 ❌ Veteran misses!
R8 Attack roll: 8 + 4 (ability) + 4 (prof) = 16 vs AC 17
R8 Miss!
R9 tick scheduler→enemy0 final1.333 HP3.066→1.733
R9 ⚔️ Veteran uses Multiattack!
R9 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R9 ❌ Veteran misses!
R9 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R9 impact enemy0→pc final4 HP54→50
R9 Attack roll: 12 + 4 (ability) + 4 (prof) = 20 vs AC 17
R9 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R9 impact pc→enemy0 final4.8 HP1.733→0
```

**loss**
```text
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R1 impact enemy0→pc final8 HP84→76
R1 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R1 💥 Critical miss!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R2 impact enemy0→pc final6 HP76→70
R2 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R2 ❌ Veteran misses!
R2 Attack roll: 2 + 4 (ability) + 4 (prof) = 10 vs AC 17
R2 Miss!
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R3 ⭐ Critical hit! Sword: 13 blood damage
R3 impact enemy0→pc final13 HP70→57
R3 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R3 ❌ Veteran misses!
R3 Attack roll: 5 + 4 (ability) + 4 (prof) = 13 vs AC 17
R3 Miss!
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final7 HP57→50
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy0→pc final8 HP50→42
R4 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R4 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R4 impact pc→enemy0 final8.8 HP58→49.2
R5 tick scheduler→enemy0 final1.467 HP49.2→47.733
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R5 impact enemy0→pc final10 HP42→32
R5 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R5 impact enemy0→pc final6 HP32→26
R5 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R5 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R5 impact pc→enemy0 final9.6 HP47.733→38.133
R6 tick scheduler→enemy0 final3.067 HP38.133→35.066
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 13 + 5 = 18 vs AC 18
R6 impact enemy0→pc final10 HP26→16
R6 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R6 ⭐ Critical hit! Shortsword: 13 blood damage
R6 impact enemy0→pc final13 HP16→3
R6 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact pc→enemy0 final9.6 HP35.066→25.466
R7 tick scheduler→enemy0 final4.666 HP25.466→20.8
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R7 impact enemy0→pc final5 HP3→0
```

**extreme**
```text
R1 Attack roll: 11 + 4 (ability) + 4 (prof) = 19 vs AC 17
R1 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R1 impact pc→enemy0 final8 HP58→50
R1 tick scheduler→enemy0 final1.334 HP50→48.666
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R1 ❌ Veteran misses!
R2 Attack roll: 4 + 4 (ability) + 4 (prof) = 12 vs AC 17
R2 Miss!
R2 tick scheduler→enemy0 final1.333 HP48.666→47.333
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R2 ❌ Veteran misses!
R3 Attack roll: 14 + 4 (ability) + 4 (prof) = 22 vs AC 17
R3 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R3 impact pc→enemy0 final5.6 HP47.333→41.733
R3 tick scheduler→enemy0 final2.267 HP41.733→39.466
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R3 ❌ Veteran misses!
R4 Attack roll: 9 + 4 (ability) + 4 (prof) = 17 vs AC 17
R4 💥 Hit! Rolled Damage: 4 + 4 (ability) = 8
R4 impact pc→enemy0 final6.4 HP39.466→33.066
R4 tick scheduler→enemy0 final2 HP33.066→31.066
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R4 ❌ Veteran misses!
R5 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R5 Miss!
R5 tick scheduler→enemy0 final2 HP31.066→29.066
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R5 ❌ Veteran misses!
R5 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R5 ❌ Veteran misses!
R6 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R6 Miss!
R6 tick scheduler→enemy0 final1.066 HP29.066→28
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R6 ❌ Veteran misses!
R7 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R7 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R7 impact pc→enemy0 final8 HP28→20
R7 tick scheduler→enemy0 final1.334 HP20→18.666
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R7 ❌ Veteran misses!
R7 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R7 ❌ Critical miss!
R8 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R8 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R8 impact pc→enemy0 final8.8 HP18.666→9.866
R8 tick scheduler→enemy0 final2.8 HP9.866→7.066
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R8 ❌ Veteran misses!
R8 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R8 ❌ Veteran misses!
R9 Attack roll: 11 + 4 (ability) + 4 (prof) = 19 vs AC 17
R9 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R9 impact pc→enemy0 final8.8 HP7.066→0
```

## Tested sources
```json
{
  "src/core/rulesEngine.js": "5b640103393081979c6eea741926d8d149538bc898e899457783cf94ddc204b9",
  "src/systems/CombatManager.js": "82d0464a021d68a107239b97673804652f76d506ef8e9fc1ac144de87e61299a",
  "src/systems/Character.js": "39da47924b6ced9885091328659e6d9e7cab470bb8f5e10d0d5d2cbf6d951f9b",
  "src/systems/EffectDispatcher.js": "227c168da0bbf63ebbff8a924769c759746b85d449f4c340ae8674c5c39a48f9",
  "src/systems/DamageResolver.js": "a7700c620e0e8ec071de6fcdbc3ea415a7979a370fc7df59a1b1349bc8b6c4df",
  "src/utils/damagePrecision.js": "5cee5ad7c2a530158e598007776937a52d675a7c8d2ee30e7779f14f6aee4e7c"
}
```
