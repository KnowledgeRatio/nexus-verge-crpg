# Representative actual feature-fork traces

Actual engine roll messages, HP events, and real scheduler processing. Selected median-length win, a loss if present, and largest remaining-HP margin.

## L1 gnoll, sword party2, 100/0

Win 7.20%, Wilson95% 5.76%–8.97%

### medianWin

```text
R1 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R1 ❌ Gnoll misses!
R1 Attack roll: 18 + 2 (ability) + 2 (prof) = 22 vs AC 15
R1 💥 Hit! Rolled Damage: 5 + 2 (ability) = 7
R1 impact ally→enemy0 final7 HP22→15
R1 🎲 Gnoll rolls 16 + 4 = 20 vs AC 14
R1 impact enemy0→pc final3 HP12→9
R1 Attack roll: 9 + 2 (ability) + 2 (prof) = 13 vs AC 15
R1 Miss!
R2 🎲 Gnoll rolls 10 + 4 = 14 vs AC 14
R2 impact enemy1→pc final6 HP9→3
R2 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R2 💥 Hit! Rolled Damage: 3 + 2 (ability) = 5
R2 impact ally→enemy0 final5 HP15→10
R2 🎲 Gnoll rolls 1 + 4 = 5 vs AC 14
R2 ❌ Critical miss!
R2 Attack roll: 13 + 2 (ability) + 2 (prof) = 17 vs AC 15
R2 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R2 impact pc→enemy0 final9 HP10→1
R3 🎲 Gnoll rolls 3 + 4 = 7 vs AC 14
R3 ❌ Gnoll misses!
R3 Attack roll: 14 + 2 (ability) + 2 (prof) = 18 vs AC 15
R3 💥 Hit! Rolled Damage: 8 + 2 (ability) = 10
R3 impact ally→enemy0 final10 HP1→0
R3 Attack roll: 15 + 2 (ability) + 2 (prof) = 19 vs AC 15
R3 💥 Hit! Rolled Damage: 2 + 2 (ability) = 4
R3 impact pc→enemy1 final4 HP22→18
R4 🎲 Gnoll rolls 7 + 4 = 11 vs AC 14
R4 ❌ Gnoll misses!
R4 Attack roll: 11 + 2 (ability) + 2 (prof) = 15 vs AC 15
R4 💥 Hit! Rolled Damage: 1 + 2 (ability) = 3
R4 impact ally→enemy1 final3 HP18→15
R4 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R4 💥 Hit! Rolled Damage: 5 + 2 (ability) = 7
R4 impact pc→enemy1 final7 HP15→8
R5 🎲 Gnoll rolls 8 + 4 = 12 vs AC 14
R5 ❌ Gnoll misses!
R5 Attack roll: 18 + 2 (ability) + 2 (prof) = 22 vs AC 15
R5 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R5 impact ally→enemy1 final9 HP8→0
```

### loss

```text
R1 Attack roll: 9 + 2 (ability) + 2 (prof) = 13 vs AC 15
R1 Miss!
R1 🎲 Gnoll rolls 14 + 4 = 18 vs AC 14
R1 impact enemy0→pc final4 HP12→8
R1 🎲 Gnoll rolls 20 + 4 = 24 vs AC 14
R1 ⭐ Critical hit! Bite: 9 blood damage
R1 impact enemy1→pc final9 HP8→0
```

### extreme

```text
R1 Attack roll: 2 + 2 (ability) + 2 (prof) = 6 vs AC 15
R1 Miss!
R1 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R1 ⭐ Critical hit!
R1 💥 Hit! Rolled Damage: 8 + 2 (crit) + 2 (ability) = 12
R1 impact ally→enemy0 final12 HP22→10
R1 🎲 Gnoll rolls 9 + 4 = 13 vs AC 14
R1 ❌ Gnoll misses!
R1 🎲 Gnoll rolls 1 + 4 = 5 vs AC 14
R1 ❌ Critical miss!
R2 Attack roll: 11 + 2 (ability) + 2 (prof) = 15 vs AC 15
R2 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R2 impact pc→enemy0 final6 HP10→4
R2 Attack roll: 18 + 2 (ability) + 2 (prof) = 22 vs AC 15
R2 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R2 impact ally→enemy0 final6 HP4→0
R2 🎲 Gnoll rolls 3 + 4 = 7 vs AC 14
R2 ❌ Gnoll misses!
R3 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R3 ⭐ Critical hit!
R3 💥 Hit! Rolled Damage: 5 + 5 (crit) + 2 (ability) = 12
R3 impact pc→enemy1 final12 HP22→10
R3 Attack roll: 14 + 2 (ability) + 2 (prof) = 18 vs AC 15
R3 💥 Hit! Rolled Damage: 6 + 2 (ability) = 8
R3 impact ally→enemy1 final8 HP10→2
R3 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R3 ❌ Gnoll misses!
R4 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R4 💥 Hit! Rolled Damage: 1 + 2 (ability) = 3
R4 impact pc→enemy1 final3 HP2→0
```

## L1 gnoll, sword party2, 80/20

Win 5.80%, Wilson95% 4.51%–7.42%

### medianWin

```text
R1 Attack roll: 15 + 2 (ability) + 2 (prof) = 19 vs AC 15
R1 💥 Hit! Rolled Damage: 8 + 2 (ability) = 10
R1 impact pc→enemy0 final8 HP22→14
R1 tick scheduler→enemy0 final0.667 HP14→13.333
R1 🎲 Gnoll rolls 15 + 4 = 19 vs AC 14
R1 impact enemy0→pc final2.4 HP12→9.6
R1 🎲 Gnoll rolls 1 + 4 = 5 vs AC 14
R1 ❌ Critical miss!
R1 Attack roll: 5 + 2 (ability) + 2 (prof) = 9 vs AC 15
R1 Miss!
R2 tick scheduler→pc final0.2 HP9.6→9.4
R2 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R2 ⭐ Critical hit!
R2 💥 Hit! Rolled Damage: 1 + 6 (crit) + 2 (ability) = 9
R2 impact pc→enemy0 final7.2 HP13.333→6.133
R2 tick scheduler→enemy0 final1.267 HP6.133→4.866
R2 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R2 ❌ Gnoll misses!
R2 🎲 Gnoll rolls 14 + 4 = 18 vs AC 14
R2 impact enemy1→pc final4 HP9.4→5.4
R2 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R2 ⭐ Critical hit!
R2 💥 Hit! Rolled Damage: 1 + 4 (crit) + 2 (ability) = 7
R2 impact ally→enemy0 final5.6 HP4.866→0
R3 tick scheduler→pc final0.534 HP5.4→4.866
R3 Attack roll: 16 + 2 (ability) + 2 (prof) = 20 vs AC 15
R3 💥 Hit! Rolled Damage: 6 + 2 (ability) = 8
R3 impact pc→enemy1 final6.4 HP22→15.6
R3 tick scheduler→enemy1 final0.534 HP15.6→15.066
R3 🎲 Gnoll rolls 4 + 4 = 8 vs AC 14
R3 ❌ Gnoll misses!
R3 Attack roll: 10 + 2 (ability) + 2 (prof) = 14 vs AC 15
R3 Miss!
R4 tick scheduler→pc final0.533 HP4.866→4.333
R4 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R4 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R4 impact pc→enemy1 final4.8 HP15.066→10.266
R4 tick scheduler→enemy1 final0.933 HP10.266→9.333
R4 🎲 Gnoll rolls 13 + 4 = 17 vs AC 14
R4 impact enemy1→pc final3.2 HP4.333→1.133
R4 Attack roll: 6 + 2 (ability) + 2 (prof) = 10 vs AC 15
R4 Miss!
R5 tick scheduler→pc final0.6 HP1.133→0.533
R5 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R5 💥 Hit! Rolled Damage: 1 + 2 (ability) = 3
R5 impact pc→enemy1 final2.4 HP9.333→6.933
R5 tick scheduler→enemy1 final1.133 HP6.933→5.8
R5 🎲 Gnoll rolls 4 + 4 = 8 vs AC 14
R5 ❌ Gnoll misses!
R5 Attack roll: 8 + 2 (ability) + 2 (prof) = 12 vs AC 15
R5 Miss!
R6 tick scheduler→pc final0.267 HP0.533→0.266
R6 Attack roll: 11 + 2 (ability) + 2 (prof) = 15 vs AC 15
R6 💥 Hit! Rolled Damage: 8 + 2 (ability) = 10
R6 impact pc→enemy1 final8 HP5.8→0
```

### loss

```text
R1 🎲 Gnoll rolls 20 + 4 = 24 vs AC 14
R1 ⭐ Critical hit! Bite: 9 blood damage
R1 impact enemy1→pc final7.2 HP12→4.8
R1 tick scheduler→pc final0.6 HP4.8→4.2
R1 Attack roll: 8 + 2 (ability) + 2 (prof) = 12 vs AC 15
R1 Miss!
R1 🎲 Gnoll rolls 18 + 4 = 22 vs AC 14
R1 impact enemy0→pc final4.8 HP4.2→0
```

### extreme

```text
R1 🎲 Gnoll rolls 3 + 4 = 7 vs AC 14
R1 ❌ Gnoll misses!
R1 Attack roll: 15 + 2 (ability) + 2 (prof) = 19 vs AC 15
R1 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R1 impact pc→enemy0 final7.2 HP22→14.8
R1 🎲 Gnoll rolls 5 + 4 = 9 vs AC 14
R1 ❌ Gnoll misses!
R1 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R1 💥 Hit! Rolled Damage: 2 + 2 (ability) = 4
R1 impact ally→enemy0 final3.2 HP14.8→11.6
R2 tick scheduler→enemy0 final0.867 HP11.6→10.733
R2 🎲 Gnoll rolls 4 + 4 = 8 vs AC 14
R2 ❌ Gnoll misses!
R2 Attack roll: 6 + 2 (ability) + 2 (prof) = 10 vs AC 15
R2 Miss!
R2 🎲 Gnoll rolls 8 + 4 = 12 vs AC 14
R2 ❌ Gnoll misses!
R2 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R2 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R2 impact ally→enemy0 final4.8 HP10.733→5.933
R3 tick scheduler→enemy0 final1.267 HP5.933→4.666
R3 🎲 Gnoll rolls 5 + 4 = 9 vs AC 14
R3 ❌ Gnoll misses!
R3 Attack roll: 11 + 2 (ability) + 2 (prof) = 15 vs AC 15
R3 💥 Hit! Rolled Damage: 6 + 2 (ability) = 8
R3 impact pc→enemy0 final6.4 HP4.666→0
R3 🎲 Gnoll rolls 1 + 4 = 5 vs AC 14
R3 ❌ Critical miss!
R3 Attack roll: 15 + 2 (ability) + 2 (prof) = 19 vs AC 15
R3 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R3 impact ally→enemy1 final4.8 HP22→17.2
R4 Attack roll: 14 + 2 (ability) + 2 (prof) = 18 vs AC 15
R4 💥 Hit! Rolled Damage: 6 + 2 (ability) = 8
R4 impact pc→enemy1 final6.4 HP17.2→10.8
R4 tick scheduler→enemy1 final0.934 HP10.8→9.866
R4 🎲 Gnoll rolls 1 + 4 = 5 vs AC 14
R4 ❌ Critical miss!
R4 Attack roll: 16 + 2 (ability) + 2 (prof) = 20 vs AC 15
R4 💥 Hit! Rolled Damage: 3 + 2 (ability) = 5
R4 impact ally→enemy1 final4 HP9.866→5.866
R5 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R5 ⭐ Critical hit!
R5 💥 Hit! Rolled Damage: 5 + 5 (crit) + 2 (ability) = 12
R5 impact pc→enemy1 final9.6 HP5.866→0
```

## L1 gnoll, sword party2, 70/30

Win 5.50%, Wilson95% 4.25%–7.09%

### medianWin

```text
R1 Attack roll: 13 + 2 (ability) + 2 (prof) = 17 vs AC 15
R1 💥 Hit! Rolled Damage: 5 + 2 (ability) = 7
R1 impact ally→enemy0 final4.9 HP22→17.1
R1 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R1 ❌ Gnoll misses!
R1 Attack roll: 14 + 2 (ability) + 2 (prof) = 18 vs AC 15
R1 💥 Hit! Rolled Damage: 5 + 2 (ability) = 7
R1 impact pc→enemy0 final4.9 HP17.1→12.2
R1 tick scheduler→enemy0 final1.4 HP12.2→10.8
R1 🎲 Gnoll rolls 2 + 4 = 6 vs AC 14
R1 ❌ Gnoll misses!
R2 Attack roll: 14 + 2 (ability) + 2 (prof) = 18 vs AC 15
R2 💥 Hit! Rolled Damage: 1 + 2 (ability) = 3
R2 impact ally→enemy0 final2.1 HP10.8→8.7
R2 🎲 Gnoll rolls 12 + 4 = 16 vs AC 14
R2 impact enemy1→pc final2.1 HP12→9.9
R2 tick scheduler→pc final0.3 HP9.9→9.6
R2 Attack roll: 7 + 2 (ability) + 2 (prof) = 11 vs AC 15
R2 Miss!
R2 tick scheduler→enemy0 final1.7 HP8.7→7
R2 🎲 Gnoll rolls 13 + 4 = 17 vs AC 14
R2 impact enemy0→pc final3.5 HP9.6→6.1
R3 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R3 💥 Hit! Rolled Damage: 1 + 2 (ability) = 3
R3 impact ally→enemy0 final2.1 HP7→4.9
R3 🎲 Gnoll rolls 5 + 4 = 9 vs AC 14
R3 ❌ Gnoll misses!
R3 tick scheduler→pc final0.8 HP6.1→5.3
R3 Attack roll: 14 + 2 (ability) + 2 (prof) = 18 vs AC 15
R3 💥 Hit! Rolled Damage: 6 + 2 (ability) = 8
R3 impact pc→enemy0 final5.6 HP4.9→0
R4 Attack roll: 14 + 2 (ability) + 2 (prof) = 18 vs AC 15
R4 💥 Hit! Rolled Damage: 6 + 2 (ability) = 8
R4 impact ally→enemy1 final5.6 HP22→16.4
R4 tick scheduler→enemy1 final0.8 HP16.4→15.6
R4 🎲 Gnoll rolls 6 + 4 = 10 vs AC 14
R4 ❌ Gnoll misses!
R4 tick scheduler→pc final0.8 HP5.3→4.5
R4 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R4 💥 Hit! Rolled Damage: 8 + 2 (ability) = 10
R4 impact pc→enemy1 final7 HP15.6→8.6
R5 Attack roll: 11 + 2 (ability) + 2 (prof) = 15 vs AC 15
R5 💥 Hit! Rolled Damage: 1 + 2 (ability) = 3
R5 impact ally→enemy1 final2.1 HP8.6→6.5
R5 tick scheduler→enemy1 final2.1 HP6.5→4.4
R5 🎲 Gnoll rolls 3 + 4 = 7 vs AC 14
R5 ❌ Gnoll misses!
R5 tick scheduler→pc final0.5 HP4.5→4
R5 Attack roll: 4 + 2 (ability) + 2 (prof) = 8 vs AC 15
R5 Miss!
R6 Attack roll: 2 + 2 (ability) + 2 (prof) = 6 vs AC 15
R6 Miss!
R6 tick scheduler→enemy1 final2.1 HP4.4→2.3
R6 🎲 Gnoll rolls 7 + 4 = 11 vs AC 14
R6 ❌ Gnoll misses!
R6 Attack roll: 15 + 2 (ability) + 2 (prof) = 19 vs AC 15
R6 💥 Hit! Rolled Damage: 5 + 2 (ability) = 7
R6 impact pc→enemy1 final4.9 HP2.3→0
```

### loss

```text
R1 Attack roll: 18 + 2 (ability) + 2 (prof) = 22 vs AC 15
R1 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R1 impact ally→enemy0 final6.3 HP22→15.7
R1 tick scheduler→enemy0 final0.9 HP15.7→14.8
R1 🎲 Gnoll rolls 20 + 4 = 24 vs AC 14
R1 ⭐ Critical hit! Bite: 9 blood damage
R1 impact enemy0→pc final6.3 HP12→5.7
R1 tick scheduler→pc final0.9 HP5.7→4.8
R1 Attack roll: 11 + 2 (ability) + 2 (prof) = 15 vs AC 15
R1 💥 Hit! Rolled Damage: 3 + 2 (ability) = 5
R1 impact pc→enemy0 final3.5 HP14.8→11.3
R1 🎲 Gnoll rolls 20 + 4 = 24 vs AC 14
R1 ⭐ Critical hit! Bite: 7 blood damage
R1 impact enemy1→pc final4.9 HP4.8→0
```

### extreme

```text
R1 🎲 Gnoll rolls 3 + 4 = 7 vs AC 14
R1 ❌ Gnoll misses!
R1 Attack roll: 15 + 2 (ability) + 2 (prof) = 19 vs AC 15
R1 💥 Hit! Rolled Damage: 7 + 2 (ability) = 9
R1 impact pc→enemy0 final6.3 HP22→15.7
R1 🎲 Gnoll rolls 5 + 4 = 9 vs AC 14
R1 ❌ Gnoll misses!
R1 Attack roll: 17 + 2 (ability) + 2 (prof) = 21 vs AC 15
R1 💥 Hit! Rolled Damage: 2 + 2 (ability) = 4
R1 impact ally→enemy0 final2.8 HP15.7→12.9
R2 tick scheduler→enemy0 final1.3 HP12.9→11.6
R2 🎲 Gnoll rolls 4 + 4 = 8 vs AC 14
R2 ❌ Gnoll misses!
R2 Attack roll: 6 + 2 (ability) + 2 (prof) = 10 vs AC 15
R2 Miss!
R2 🎲 Gnoll rolls 8 + 4 = 12 vs AC 14
R2 ❌ Gnoll misses!
R2 Attack roll: 19 + 2 (ability) + 2 (prof) = 23 vs AC 15
R2 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R2 impact ally→enemy0 final4.2 HP11.6→7.4
R3 tick scheduler→enemy0 final1.9 HP7.4→5.5
R3 🎲 Gnoll rolls 5 + 4 = 9 vs AC 14
R3 ❌ Gnoll misses!
R3 Attack roll: 11 + 2 (ability) + 2 (prof) = 15 vs AC 15
R3 💥 Hit! Rolled Damage: 6 + 2 (ability) = 8
R3 impact pc→enemy0 final5.6 HP5.5→0
R3 🎲 Gnoll rolls 1 + 4 = 5 vs AC 14
R3 ❌ Critical miss!
R3 Attack roll: 15 + 2 (ability) + 2 (prof) = 19 vs AC 15
R3 💥 Hit! Rolled Damage: 4 + 2 (ability) = 6
R3 impact ally→enemy1 final4.2 HP22→17.8
R4 Attack roll: 14 + 2 (ability) + 2 (prof) = 18 vs AC 15
R4 💥 Hit! Rolled Damage: 6 + 2 (ability) = 8
R4 impact pc→enemy1 final5.6 HP17.8→12.2
R4 tick scheduler→enemy1 final1.4 HP12.2→10.8
R4 🎲 Gnoll rolls 1 + 4 = 5 vs AC 14
R4 ❌ Critical miss!
R4 Attack roll: 16 + 2 (ability) + 2 (prof) = 20 vs AC 15
R4 💥 Hit! Rolled Damage: 3 + 2 (ability) = 5
R4 impact ally→enemy1 final3.5 HP10.8→7.3
R5 Attack roll: 20 + 2 (ability) + 2 (prof) = 24 vs AC 15
R5 ⭐ Critical hit!
R5 💥 Hit! Rolled Damage: 5 + 5 (crit) + 2 (ability) = 12
R5 impact pc→enemy1 final8.4 HP7.3→0
```

## L10 veteran, sword party2, 100/0

Win 28.90%, Wilson95% 26.18%–31.79%

### medianWin

```text
R1 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R1 💥 Critical miss!
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R1 ❌ Veteran misses!
R1 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R1 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R1 impact pc→enemy0 final7 HP58→51
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R1 ❌ Veteran misses!
R2 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R2 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R2 impact ally→enemy0 final12 HP51→39
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R2 ❌ Veteran misses!
R2 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R2 💥 Hit! Rolled Damage: 4 + 4 (ability) = 8
R2 impact pc→enemy0 final8 HP39→31
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R2 ⭐ Critical hit! Sword: 9 blood damage
R2 impact enemy1→pc final9 HP84→75
R2 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R2 ❌ Critical miss!
R3 Attack roll: 6 + 4 (ability) + 4 (prof) = 14 vs AC 17
R3 Miss!
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R3 ❌ Veteran misses!
R3 Attack roll: 11 + 4 (ability) + 4 (prof) = 19 vs AC 17
R3 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R3 impact pc→enemy0 final10 HP31→21
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R3 impact enemy1→pc final11 HP75→64
R3 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R3 ❌ Veteran misses!
R4 Attack roll: 2 + 4 (ability) + 4 (prof) = 10 vs AC 17
R4 Miss!
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R4 impact enemy0→pc final7 HP64→57
R4 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R4 ❌ Veteran misses!
R4 Attack roll: 20 + 4 (ability) + 4 (prof) = 28 vs AC 17
R4 ⭐ Critical hit!
R4 💥 Hit! Rolled Damage: 5 + 5 (crit) + 4 (ability) = 14
R4 impact pc→enemy0 final14 HP21→7
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R4 impact enemy1→pc final7 HP57→50
R4 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R4 ❌ Veteran misses!
R5 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R5 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R5 impact ally→enemy0 final12 HP7→0
R5 Attack roll: 9 + 4 (ability) + 4 (prof) = 17 vs AC 17
R5 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R5 impact pc→enemy1 final9 HP58→49
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R5 impact enemy1→pc final5 HP50→45
R5 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R5 ❌ Veteran misses!
R6 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R6 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R6 impact ally→enemy1 final7 HP49→42
R6 Attack roll: 14 + 4 (ability) + 4 (prof) = 22 vs AC 17
R6 💥 Hit! Rolled Damage: 4 + 4 (ability) = 8
R6 impact pc→enemy1 final8 HP42→34
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R6 impact enemy1→pc final11 HP45→34
R6 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R6 impact enemy1→pc final4 HP34→30
R7 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R7 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R7 impact ally→enemy1 final6 HP34→28
R7 Attack roll: 17 + 4 (ability) + 4 (prof) = 25 vs AC 17
R7 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R7 impact pc→enemy1 final6 HP28→22
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R7 ❌ Veteran misses!
R7 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R7 impact enemy1→pc final6 HP30→24
R8 Attack roll: 5 + 4 (ability) + 4 (prof) = 13 vs AC 17
R8 Miss!
R8 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R8 💥 Critical miss!
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R8 impact enemy1→pc final9 HP24→15
R8 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R8 impact enemy1→pc final4 HP15→11
R9 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R9 Miss!
R9 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R9 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R9 impact pc→enemy1 final10 HP22→12
R9 ⚔️ Veteran uses Multiattack!
R9 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R9 ❌ Veteran misses!
R9 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R9 ❌ Critical miss!
R10 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R10 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R10 impact ally→enemy1 final9 HP12→3
R10 Attack roll: 14 + 4 (ability) + 4 (prof) = 22 vs AC 17
R10 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R10 impact pc→enemy1 final6 HP3→0
```

### loss

```text
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R1 impact enemy0→pc final9 HP84→75
R1 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R1 ⭐ Critical hit! Shortsword: 14 blood damage
R1 impact enemy0→pc final14 HP75→61
R1 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R1 💥 Critical miss!
R1 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R1 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R1 impact pc→enemy0 final5 HP58→53
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R1 impact enemy1→pc final9 HP61→52
R1 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R1 ❌ Veteran misses!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R2 ⭐ Critical hit! Sword: 15 blood damage
R2 impact enemy0→pc final15 HP52→37
R2 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R2 impact enemy0→pc final7 HP37→30
R2 Attack roll: 3 + 4 (ability) + 4 (prof) = 11 vs AC 17
R2 Miss!
R2 Attack roll: 17 + 4 (ability) + 4 (prof) = 25 vs AC 17
R2 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R2 impact pc→enemy0 final11 HP53→42
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 13 + 5 = 18 vs AC 18
R2 impact enemy1→pc final8 HP30→22
R2 🎲 Veteran rolls 13 + 5 = 18 vs AC 18
R2 impact enemy1→pc final9 HP22→13
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R3 impact enemy0→pc final4 HP13→9
R3 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R3 impact enemy0→pc final9 HP9→0
```

### extreme

```text
R1 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R1 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R1 impact pc→enemy0 final12 HP58→46
R1 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R1 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R1 impact ally→enemy0 final10 HP46→36
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R1 ❌ Veteran misses!
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R1 ❌ Veteran misses!
R2 Attack roll: 8 + 4 (ability) + 4 (prof) = 16 vs AC 17
R2 Miss!
R2 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R2 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R2 impact ally→enemy0 final10 HP36→26
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R2 ❌ Veteran misses!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R2 ❌ Veteran misses!
R3 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R3 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R3 impact pc→enemy0 final10 HP26→16
R3 Attack roll: 3 + 4 (ability) + 4 (prof) = 11 vs AC 17
R3 Miss!
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R3 impact enemy1→pc final5 HP84→79
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R3 impact enemy0→pc final9 HP79→70
R3 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R3 ❌ Veteran misses!
R4 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R4 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R4 impact pc→enemy0 final10 HP16→6
R4 Attack roll: 11 + 4 (ability) + 4 (prof) = 19 vs AC 17
R4 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R4 impact ally→enemy0 final9 HP6→0
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R4 ❌ Veteran misses!
R5 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R5 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R5 impact pc→enemy1 final6 HP58→52
R5 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R5 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R5 impact ally→enemy1 final10 HP52→42
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R5 ❌ Veteran misses!
R5 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R5 ❌ Veteran misses!
R6 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact pc→enemy1 final12 HP42→30
R6 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R6 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R6 impact ally→enemy1 final6 HP30→24
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R6 ❌ Veteran misses!
R7 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R7 Miss!
R7 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R7 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R7 impact ally→enemy1 final10 HP24→14
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R7 impact enemy1→pc final8 HP70→62
R7 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R7 ❌ Veteran misses!
R8 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R8 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R8 impact pc→enemy1 final12 HP14→2
R8 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R8 💥 Critical miss!
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R8 ❌ Veteran misses!
R8 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R8 ❌ Veteran misses!
R9 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R9 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R9 impact pc→enemy1 final5 HP2→0
```

## L10 veteran, sword party2, 80/20

Win 26.00%, Wilson95% 23.38%–28.81%

### medianWin

```text
R1 Attack roll: 5 + 4 (ability) + 4 (prof) = 13 vs AC 17
R1 Miss!
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R1 impact enemy0→pc final6.4 HP84→77.6
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R1 impact enemy1→pc final8.8 HP77.6→68.8
R1 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R1 ❌ Veteran misses!
R1 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R1 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R1 impact ally→enemy0 final7.2 HP58→50.8
R2 tick scheduler→pc final1.268 HP68.8→67.532
R2 Attack roll: 4 + 4 (ability) + 4 (prof) = 12 vs AC 17
R2 Miss!
R2 tick scheduler→enemy0 final0.6 HP50.8→50.2
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R2 ❌ Critical miss!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R2 ❌ Veteran misses!
R2 Attack roll: 14 + 4 (ability) + 4 (prof) = 22 vs AC 17
R2 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R2 impact ally→enemy0 final5.6 HP50.2→44.6
R3 tick scheduler→pc final1.266 HP67.532→66.266
R3 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R3 💥 Critical miss!
R3 tick scheduler→enemy0 final1.067 HP44.6→43.533
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R3 ❌ Veteran misses!
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R3 ❌ Veteran misses!
R3 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R3 Miss!
R4 tick scheduler→pc final1.266 HP66.266→65
R4 Attack roll: 11 + 4 (ability) + 4 (prof) = 19 vs AC 17
R4 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R4 impact pc→enemy0 final8 HP43.533→35.533
R4 tick scheduler→enemy0 final1.734 HP35.533→33.799
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R4 ❌ Veteran misses!
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R4 ❌ Veteran misses!
R4 Attack roll: 18 + 4 (ability) + 4 (prof) = 26 vs AC 17
R4 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R4 impact ally→enemy0 final4 HP33.799→29.799
R5 Attack roll: 17 + 4 (ability) + 4 (prof) = 25 vs AC 17
R5 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R5 impact pc→enemy0 final4.8 HP29.799→24.999
R5 tick scheduler→enemy0 final1.867 HP24.999→23.132
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R5 impact enemy0→pc final5.6 HP65→59.4
R5 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R5 ❌ Veteran misses!
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R5 ❌ Veteran misses!
R5 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R5 ❌ Veteran misses!
R5 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R5 💥 Hit! Rolled Damage: 4 + 4 (ability) = 8
R5 impact ally→enemy0 final6.4 HP23.132→16.732
R6 tick scheduler→pc final0.467 HP59.4→58.933
R6 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R6 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R6 impact pc→enemy0 final4 HP16.732→12.732
R6 tick scheduler→enemy0 final2.267 HP12.732→10.465
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R6 impact enemy0→pc final4 HP58.933→54.933
R6 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R6 impact enemy0→pc final6.4 HP54.933→48.533
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R6 impact enemy1→pc final7.2 HP48.533→41.333
R6 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R6 impact enemy1→pc final4.8 HP41.333→36.533
R6 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact ally→enemy0 final9.6 HP10.465→0.865
R7 tick scheduler→pc final2.335 HP36.533→34.198
R7 Attack roll: 11 + 4 (ability) + 4 (prof) = 19 vs AC 17
R7 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R7 impact pc→enemy0 final9.6 HP0.865→0
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R7 ❌ Veteran misses!
R7 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R7 ❌ Veteran misses!
R7 Attack roll: 6 + 4 (ability) + 4 (prof) = 14 vs AC 17
R7 Miss!
R8 tick scheduler→pc final2.332 HP34.198→31.866
R8 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R8 Miss!
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R8 ❌ Veteran misses!
R8 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R8 impact enemy1→pc final3.2 HP31.866→28.666
R8 Attack roll: 20 + 4 (ability) + 4 (prof) = 28 vs AC 17
R8 ⭐ Critical hit!
R8 💥 Hit! Rolled Damage: 7 + 8 (crit) + 4 (ability) = 19
R8 impact ally→enemy1 final15.2 HP58→42.8
R9 tick scheduler→pc final2.133 HP28.666→26.533
R9 Attack roll: 12 + 4 (ability) + 4 (prof) = 20 vs AC 17
R9 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R9 impact pc→enemy1 final9.6 HP42.8→33.2
R9 tick scheduler→enemy1 final2.067 HP33.2→31.133
R9 ⚔️ Veteran uses Multiattack!
R9 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R9 ❌ Veteran misses!
R9 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R9 ❌ Critical miss!
R9 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R9 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R9 impact ally→enemy1 final4.8 HP31.133→26.333
R10 tick scheduler→pc final0.267 HP26.533→26.266
R10 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R10 💥 Hit! Rolled Damage: 4 + 4 (ability) = 8
R10 impact pc→enemy1 final6.4 HP26.333→19.933
R10 tick scheduler→enemy1 final3.001 HP19.933→16.932
R10 ⚔️ Veteran uses Multiattack!
R10 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R10 ⭐ Critical hit! Sword: 8 blood damage
R10 impact enemy1→pc final6.4 HP26.266→19.866
R10 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R10 ❌ Veteran misses!
R10 Attack roll: 12 + 4 (ability) + 4 (prof) = 20 vs AC 17
R10 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R10 impact ally→enemy1 final8 HP16.932→8.932
R11 tick scheduler→pc final0.8 HP19.866→19.066
R11 Attack roll: 18 + 4 (ability) + 4 (prof) = 26 vs AC 17
R11 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R11 impact pc→enemy1 final8.8 HP8.932→0.132
R11 tick scheduler→enemy1 final4.4 HP0.132→0
```

### loss

```text
R1 Attack roll: 12 + 4 (ability) + 4 (prof) = 20 vs AC 17
R1 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R1 impact pc→enemy0 final7.2 HP58→50.8
R1 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R1 💥 Hit! Rolled Damage: 4 + 4 (ability) = 8
R1 impact ally→enemy0 final6.4 HP50.8→44.4
R1 tick scheduler→enemy0 final1.134 HP44.4→43.266
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R1 impact enemy0→pc final4.8 HP84→79.2
R1 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R1 ⭐ Critical hit! Shortsword: 14 blood damage
R1 impact enemy0→pc final11.2 HP79.2→68
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R1 impact enemy1→pc final3.2 HP68→64.8
R1 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R1 ⭐ Critical hit! Shortsword: 10 blood damage
R1 impact enemy1→pc final8 HP64.8→56.8
R2 tick scheduler→pc final2.268 HP56.8→54.532
R2 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R2 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R2 impact pc→enemy0 final8.8 HP43.266→34.466
R2 Attack roll: 8 + 4 (ability) + 4 (prof) = 16 vs AC 17
R2 Miss!
R2 tick scheduler→enemy0 final1.867 HP34.466→32.599
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R2 ❌ Veteran misses!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R2 impact enemy1→pc final5.6 HP54.532→48.932
R2 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R2 impact enemy1→pc final7.2 HP48.932→41.732
R3 tick scheduler→pc final3.334 HP41.732→38.398
R3 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R3 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R3 impact pc→enemy0 final7.2 HP32.599→25.399
R3 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R3 💥 Critical miss!
R3 tick scheduler→enemy0 final2.466 HP25.399→22.933
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R3 ⭐ Critical hit! Sword: 17 blood damage
R3 impact enemy0→pc final13.6 HP38.398→24.798
R3 🎲 Veteran rolls 13 + 5 = 18 vs AC 18
R3 impact enemy0→pc final5.6 HP24.798→19.198
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R3 impact enemy1→pc final5.6 HP19.198→13.598
R4 tick scheduler→pc final5.4 HP13.598→8.198
R4 Attack roll: 2 + 4 (ability) + 4 (prof) = 10 vs AC 17
R4 Miss!
R4 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R4 💥 Critical miss!
R4 tick scheduler→enemy0 final1.333 HP22.933→21.6
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R4 impact enemy0→pc final6.4 HP8.198→1.798
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy1→pc final4.8 HP1.798→0
```

### extreme

```text
R1 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R1 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R1 impact pc→enemy0 final9.6 HP58→48.4
R1 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R1 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R1 impact ally→enemy0 final8 HP48.4→40.4
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R1 ❌ Veteran misses!
R1 tick scheduler→enemy0 final1.467 HP40.4→38.933
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R1 ❌ Veteran misses!
R2 Attack roll: 8 + 4 (ability) + 4 (prof) = 16 vs AC 17
R2 Miss!
R2 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R2 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R2 impact ally→enemy0 final8 HP38.933→30.933
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R2 ❌ Veteran misses!
R2 tick scheduler→enemy0 final2.134 HP30.933→28.799
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R2 ❌ Veteran misses!
R3 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R3 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R3 impact pc→enemy0 final8 HP28.799→20.799
R3 Attack roll: 3 + 4 (ability) + 4 (prof) = 11 vs AC 17
R3 Miss!
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R3 impact enemy1→pc final4 HP84→80
R3 tick scheduler→enemy0 final2.8 HP20.799→17.999
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R3 impact enemy0→pc final7.2 HP80→72.8
R3 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R3 ❌ Veteran misses!
R4 tick scheduler→pc final0.934 HP72.8→71.866
R4 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R4 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R4 impact pc→enemy0 final8 HP17.999→9.999
R4 Attack roll: 11 + 4 (ability) + 4 (prof) = 19 vs AC 17
R4 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R4 impact ally→enemy0 final7.2 HP9.999→2.799
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R4 ❌ Veteran misses!
R4 tick scheduler→enemy0 final2.6 HP2.799→0.199
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R4 ❌ Veteran misses!
R5 tick scheduler→pc final0.933 HP71.866→70.933
R5 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R5 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R5 impact pc→enemy0 final4.8 HP0.199→0
R5 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R5 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R5 impact ally→enemy1 final8 HP58→50
R5 tick scheduler→enemy1 final0.667 HP50→49.333
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R5 ❌ Veteran misses!
R5 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R5 ❌ Veteran misses!
R6 tick scheduler→pc final0.933 HP70.933→70
R6 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact pc→enemy1 final9.6 HP49.333→39.733
R6 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R6 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R6 impact ally→enemy1 final4.8 HP39.733→34.933
R6 tick scheduler→enemy1 final1.867 HP34.933→33.066
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R6 ❌ Veteran misses!
R7 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R7 Miss!
R7 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R7 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R7 impact ally→enemy1 final8 HP33.066→25.066
R7 tick scheduler→enemy1 final2.533 HP25.066→22.533
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R7 impact enemy1→pc final6.4 HP70→63.6
R7 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R7 ❌ Veteran misses!
R8 tick scheduler→pc final0.534 HP63.6→63.066
R8 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R8 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R8 impact pc→enemy1 final9.6 HP22.533→12.933
R8 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R8 💥 Critical miss!
R8 tick scheduler→enemy1 final2.667 HP12.933→10.266
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R8 ❌ Veteran misses!
R8 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R8 ❌ Veteran misses!
R9 tick scheduler→pc final0.533 HP63.066→62.533
R9 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R9 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R9 impact pc→enemy1 final4 HP10.266→6.266
R9 Attack roll: 18 + 4 (ability) + 4 (prof) = 26 vs AC 17
R9 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R9 impact ally→enemy1 final8.8 HP6.266→0
```

## L10 veteran, sword party2, 70/30

Win 24.60%, Wilson95% 22.03%–27.36%

### medianWin

```text
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R1 impact enemy1→pc final4.2 HP84→79.8
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R1 impact enemy0→pc final3.5 HP79.8→76.3
R1 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R1 ❌ Veteran misses!
R1 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R1 Miss!
R1 tick scheduler→pc final1.1 HP76.3→75.2
R1 Attack roll: 17 + 4 (ability) + 4 (prof) = 25 vs AC 17
R1 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R1 impact pc→enemy0 final6.3 HP58→51.7
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R2 ❌ Veteran misses!
R2 tick scheduler→enemy0 final0.9 HP51.7→50.8
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R2 ❌ Veteran misses!
R2 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R2 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R2 impact ally→enemy0 final3.5 HP50.8→47.3
R2 tick scheduler→pc final1.1 HP75.2→74.1
R2 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R2 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R2 impact pc→enemy0 final6.3 HP47.3→41
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R3 ❌ Critical miss!
R3 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R3 ❌ Veteran misses!
R3 tick scheduler→enemy0 final2.3 HP41→38.7
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R3 ❌ Veteran misses!
R3 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R3 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R3 impact ally→enemy0 final3.5 HP38.7→35.2
R3 tick scheduler→pc final1.1 HP74.1→73
R3 Attack roll: 9 + 4 (ability) + 4 (prof) = 17 vs AC 17
R3 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R3 impact pc→enemy0 final6.3 HP35.2→28.9
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R4 impact enemy1→pc final3.5 HP73→69.5
R4 tick scheduler→enemy0 final3.7 HP28.9→25.2
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R4 ❌ Veteran misses!
R4 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R4 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R4 impact ally→enemy0 final7 HP25.2→18.2
R4 tick scheduler→pc final0.5 HP69.5→69
R4 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R4 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R4 impact pc→enemy0 final7 HP18.2→11.2
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R5 impact enemy1→pc final2.8 HP69→66.2
R5 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R5 ❌ Veteran misses!
R5 tick scheduler→enemy0 final4.8 HP11.2→6.4
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R5 impact enemy0→pc final6.3 HP66.2→59.9
R5 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R5 impact enemy0→pc final3.5 HP59.9→56.4
R5 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R5 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R5 impact ally→enemy0 final4.9 HP6.4→1.5
R5 tick scheduler→pc final2.3 HP56.4→54.1
R5 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R5 💥 Hit! Rolled Damage: 4 + 4 (ability) = 8
R5 impact pc→enemy0 final5.6 HP1.5→0
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R6 impact enemy1→pc final3.5 HP54.1→50.6
R6 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R6 ❌ Veteran misses!
R6 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R6 💥 Hit! Rolled Damage: 4 + 4 (ability) = 8
R6 impact ally→enemy1 final5.6 HP58→52.4
R6 tick scheduler→pc final2.8 HP50.6→47.8
R6 Attack roll: 17 + 4 (ability) + 4 (prof) = 25 vs AC 17
R6 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R6 impact pc→enemy1 final7.7 HP52.4→44.7
R7 tick scheduler→enemy1 final1.9 HP44.7→42.8
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R7 ❌ Veteran misses!
R7 🎲 Veteran rolls 13 + 5 = 18 vs AC 18
R7 impact enemy1→pc final2.8 HP47.8→45
R7 Attack roll: 12 + 4 (ability) + 4 (prof) = 20 vs AC 17
R7 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R7 impact ally→enemy1 final7.7 HP42.8→35.1
R7 tick scheduler→pc final2.7 HP45→42.3
R7 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R7 💥 Critical miss!
R8 tick scheduler→enemy1 final3 HP35.1→32.1
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 1 + 5 = 6 vs AC 18
R8 ❌ Critical miss!
R8 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R8 ❌ Veteran misses!
R8 Attack roll: 11 + 4 (ability) + 4 (prof) = 19 vs AC 17
R8 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R8 impact ally→enemy1 final4.2 HP32.1→27.9
R8 tick scheduler→pc final0.9 HP42.3→41.4
R8 Attack roll: 8 + 4 (ability) + 4 (prof) = 16 vs AC 17
R8 Miss!
R9 tick scheduler→enemy1 final3.6 HP27.9→24.3
R9 ⚔️ Veteran uses Multiattack!
R9 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R9 ❌ Veteran misses!
R9 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R9 ❌ Veteran misses!
R9 Attack roll: 5 + 4 (ability) + 4 (prof) = 13 vs AC 17
R9 Miss!
R9 tick scheduler→pc final0.4 HP41.4→41
R9 Attack roll: 14 + 4 (ability) + 4 (prof) = 22 vs AC 17
R9 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R9 impact pc→enemy1 final6.3 HP24.3→18
R10 tick scheduler→enemy1 final2.6 HP18→15.4
R10 ⚔️ Veteran uses Multiattack!
R10 🎲 Veteran rolls 13 + 5 = 18 vs AC 18
R10 impact enemy1→pc final6.3 HP41→34.7
R10 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R10 impact enemy1→pc final4.2 HP34.7→30.5
R10 Attack roll: 8 + 4 (ability) + 4 (prof) = 16 vs AC 17
R10 Miss!
R10 tick scheduler→pc final1.5 HP30.5→29
R10 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R10 💥 Hit! Rolled Damage: 3 + 4 (ability) = 7
R10 impact pc→enemy1 final4.9 HP15.4→10.5
R11 tick scheduler→enemy1 final2.2 HP10.5→8.3
R11 ⚔️ Veteran uses Multiattack!
R11 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R11 ❌ Veteran misses!
R11 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R11 ❌ Veteran misses!
R11 Attack roll: 6 + 4 (ability) + 4 (prof) = 14 vs AC 17
R11 Miss!
R11 tick scheduler→pc final1.5 HP29→27.5
R11 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R11 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R11 impact pc→enemy1 final7 HP8.3→1.3
R12 tick scheduler→enemy1 final2.6 HP1.3→0
```

### loss

```text
R1 Attack roll: 12 + 4 (ability) + 4 (prof) = 20 vs AC 17
R1 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R1 impact pc→enemy0 final6.3 HP58→51.7
R1 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R1 💥 Hit! Rolled Damage: 4 + 4 (ability) = 8
R1 impact ally→enemy0 final5.6 HP51.7→46.1
R1 tick scheduler→enemy0 final1.7 HP46.1→44.4
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R1 impact enemy0→pc final4.2 HP84→79.8
R1 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R1 ⭐ Critical hit! Shortsword: 14 blood damage
R1 impact enemy0→pc final9.8 HP79.8→70
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 14 + 5 = 19 vs AC 18
R1 impact enemy1→pc final2.8 HP70→67.2
R1 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R1 ⭐ Critical hit! Shortsword: 10 blood damage
R1 impact enemy1→pc final7 HP67.2→60.2
R2 tick scheduler→pc final3.4 HP60.2→56.8
R2 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R2 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R2 impact pc→enemy0 final7.7 HP44.4→36.7
R2 Attack roll: 8 + 4 (ability) + 4 (prof) = 16 vs AC 17
R2 Miss!
R2 tick scheduler→enemy0 final2.8 HP36.7→33.9
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R2 ❌ Veteran misses!
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R2 impact enemy1→pc final4.9 HP56.8→51.9
R2 🎲 Veteran rolls 19 + 5 = 24 vs AC 18
R2 impact enemy1→pc final6.3 HP51.9→45.6
R3 tick scheduler→pc final5 HP45.6→40.6
R3 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R3 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R3 impact pc→enemy0 final6.3 HP33.9→27.6
R3 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R3 💥 Critical miss!
R3 tick scheduler→enemy0 final3.7 HP27.6→23.9
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 20 + 5 = 25 vs AC 18
R3 ⭐ Critical hit! Sword: 17 blood damage
R3 impact enemy0→pc final11.9 HP40.6→28.7
R3 🎲 Veteran rolls 13 + 5 = 18 vs AC 18
R3 impact enemy0→pc final4.9 HP28.7→23.8
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 12 + 5 = 17 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R3 impact enemy1→pc final4.9 HP23.8→18.9
R4 tick scheduler→pc final8.1 HP18.9→10.8
R4 Attack roll: 2 + 4 (ability) + 4 (prof) = 10 vs AC 17
R4 Miss!
R4 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R4 💥 Critical miss!
R4 tick scheduler→enemy0 final2 HP23.9→21.9
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 10 + 5 = 15 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 16 + 5 = 21 vs AC 18
R4 impact enemy0→pc final5.6 HP10.8→5.2
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 6 + 5 = 11 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 18 + 5 = 23 vs AC 18
R4 impact enemy1→pc final4.2 HP5.2→1
R5 tick scheduler→pc final6.1 HP1→0
```

### extreme

```text
R1 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R1 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R1 impact pc→enemy0 final8.4 HP58→49.6
R1 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R1 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R1 impact ally→enemy0 final7 HP49.6→42.6
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R1 ❌ Veteran misses!
R1 tick scheduler→enemy0 final2.2 HP42.6→40.4
R1 ⚔️ Veteran uses Multiattack!
R1 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R1 ❌ Veteran misses!
R1 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R1 ❌ Veteran misses!
R2 Attack roll: 8 + 4 (ability) + 4 (prof) = 16 vs AC 17
R2 Miss!
R2 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R2 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R2 impact ally→enemy0 final7 HP40.4→33.4
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R2 ❌ Veteran misses!
R2 tick scheduler→enemy0 final3.2 HP33.4→30.2
R2 ⚔️ Veteran uses Multiattack!
R2 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R2 ❌ Veteran misses!
R2 🎲 Veteran rolls 9 + 5 = 14 vs AC 18
R2 ❌ Veteran misses!
R3 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R3 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R3 impact pc→enemy0 final7 HP30.2→23.2
R3 Attack roll: 3 + 4 (ability) + 4 (prof) = 11 vs AC 17
R3 Miss!
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R3 ❌ Veteran misses!
R3 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R3 impact enemy1→pc final3.5 HP84→80.5
R3 tick scheduler→enemy0 final4.2 HP23.2→19
R3 ⚔️ Veteran uses Multiattack!
R3 🎲 Veteran rolls 17 + 5 = 22 vs AC 18
R3 impact enemy0→pc final6.3 HP80.5→74.2
R3 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R3 ❌ Veteran misses!
R4 tick scheduler→pc final1.4 HP74.2→72.8
R4 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R4 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R4 impact pc→enemy0 final7 HP19→12
R4 Attack roll: 11 + 4 (ability) + 4 (prof) = 19 vs AC 17
R4 💥 Hit! Rolled Damage: 5 + 4 (ability) = 9
R4 impact ally→enemy0 final6.3 HP12→5.7
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R4 ❌ Veteran misses!
R4 tick scheduler→enemy0 final3.9 HP5.7→1.8
R4 ⚔️ Veteran uses Multiattack!
R4 🎲 Veteran rolls 8 + 5 = 13 vs AC 18
R4 ❌ Veteran misses!
R4 🎲 Veteran rolls 5 + 5 = 10 vs AC 18
R4 ❌ Veteran misses!
R5 tick scheduler→pc final1.4 HP72.8→71.4
R5 Attack roll: 10 + 4 (ability) + 4 (prof) = 18 vs AC 17
R5 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R5 impact pc→enemy0 final4.2 HP1.8→0
R5 Attack roll: 13 + 4 (ability) + 4 (prof) = 21 vs AC 17
R5 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R5 impact ally→enemy1 final7 HP58→51
R5 tick scheduler→enemy1 final1 HP51→50
R5 ⚔️ Veteran uses Multiattack!
R5 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R5 ❌ Veteran misses!
R5 🎲 Veteran rolls 11 + 5 = 16 vs AC 18
R5 ❌ Veteran misses!
R6 tick scheduler→pc final1.4 HP71.4→70
R6 Attack roll: 19 + 4 (ability) + 4 (prof) = 27 vs AC 17
R6 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R6 impact pc→enemy1 final8.4 HP50→41.6
R6 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R6 💥 Hit! Rolled Damage: 2 + 4 (ability) = 6
R6 impact ally→enemy1 final4.2 HP41.6→37.4
R6 tick scheduler→enemy1 final2.8 HP37.4→34.6
R6 ⚔️ Veteran uses Multiattack!
R6 🎲 Veteran rolls 3 + 5 = 8 vs AC 18
R6 ❌ Veteran misses!
R6 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R6 ❌ Veteran misses!
R7 Attack roll: 7 + 4 (ability) + 4 (prof) = 15 vs AC 17
R7 Miss!
R7 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R7 💥 Hit! Rolled Damage: 6 + 4 (ability) = 10
R7 impact ally→enemy1 final7 HP34.6→27.6
R7 tick scheduler→enemy1 final3.8 HP27.6→23.8
R7 ⚔️ Veteran uses Multiattack!
R7 🎲 Veteran rolls 15 + 5 = 20 vs AC 18
R7 impact enemy1→pc final5.6 HP70→64.4
R7 🎲 Veteran rolls 2 + 5 = 7 vs AC 18
R7 ❌ Veteran misses!
R8 tick scheduler→pc final0.8 HP64.4→63.6
R8 Attack roll: 16 + 4 (ability) + 4 (prof) = 24 vs AC 17
R8 💥 Hit! Rolled Damage: 8 + 4 (ability) = 12
R8 impact pc→enemy1 final8.4 HP23.8→15.4
R8 Attack roll: 1 + 4 (ability) + 4 (prof) = 9 vs AC 17
R8 💥 Critical miss!
R8 tick scheduler→enemy1 final4 HP15.4→11.4
R8 ⚔️ Veteran uses Multiattack!
R8 🎲 Veteran rolls 4 + 5 = 9 vs AC 18
R8 ❌ Veteran misses!
R8 🎲 Veteran rolls 7 + 5 = 12 vs AC 18
R8 ❌ Veteran misses!
R9 tick scheduler→pc final0.8 HP63.6→62.8
R9 Attack roll: 15 + 4 (ability) + 4 (prof) = 23 vs AC 17
R9 💥 Hit! Rolled Damage: 1 + 4 (ability) = 5
R9 impact pc→enemy1 final3.5 HP11.4→7.9
R9 Attack roll: 18 + 4 (ability) + 4 (prof) = 26 vs AC 17
R9 💥 Hit! Rolled Damage: 7 + 4 (ability) = 11
R9 impact ally→enemy1 final7.7 HP7.9→0.2
R9 tick scheduler→enemy1 final3.8 HP0.2→0
```
