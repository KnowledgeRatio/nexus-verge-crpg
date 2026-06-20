# D&D 5e Compliance Rules

## SRD
All mechanics must comply with D&D 5e SRD 5.2.1 (2024) under Creative Commons. No proprietary content.

## Skill System
This project uses a **13-skill system**, not the standard 18. Never reference retired skills (History, Nature, Religion, Insight, Persuasion, Intimidation, Performance, Stealth as standalone).

| Ability | Skills |
|---|---|
| STR | Athletics |
| DEX | Acrobatics, Sleight of Hand |
| CON | Endurance |
| INT | Academia, Arcana, Investigation |
| WIS | Perception, Cunning, Creativity, Empathy |
| CHA | Influence, Deception |

## Core Formulas
- **Proficiency bonus**: `RULES.core.proficiencyBonusByLevel[level]` — never hardcode
- **Ability modifier**: `Math.floor((score - 10) / 2)`
- **Attack roll**: `d20 + ability modifier + proficiency bonus (if proficient)`
- **Passive check**: `10 + modifier` (no dice)
- **Critical hit**: natural 20 = double dice (not double total)
- **Death saves**: 3 successes = stable, 3 failures = dead

## Callings (not Classes)
Three callings only: **Dedication** (martial, STR+CON), **Scholar** (caster, INT+CON), **Wanderlust** (hybrid, DEX+CHA). Level 3 specialization branches. Level 10 capstone (compressed from D&D 20).

## Resources
- **Focus** (Dedication): CON-based martial resource, full recharge on short rest
- **Mana** (Scholar/Wanderlust): Pool-based from D&D 5e Spell Points variant, full recharge on long rest. Scholar gets Arcane Recovery (partial SR).

## Weapon Masteries
All 8 official masteries implemented. Each weapon has exactly one mastery. Character must be proficient with the weapon to use its mastery. See `data/weaponMasteries.json` for assignments.

## Loot and Items
All items distributed in loot must follow D&D 5e SRD treasure distribution and rarity guidelines.
