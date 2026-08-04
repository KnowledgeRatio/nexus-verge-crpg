# D&D 5e Compliance Rules

## SRD
All mechanics must comply with D&D 5e SRD 5.2.1 (2024) under Creative Commons. No proprietary content.

## Attribute Systems (parallel, config-driven)
Two ability-score systems exist **side by side**, switched by `RULES.attributes.system` in `rulesEngine.js` — not a one-time migration. Per ADR-000, this is a feature flag, and `'5EClassic'` is deliberately kept live as a rollback path, not dead code to delete.

| Flag value | System |
|---|---|
| `'5EClassic'` | Original STR/DEX/CON/INT/WIS/CHA |
| `'NVSystem'` | **Current default** (flipped 2026-08-03) — Prowess/Vitality/Intellect/Insight/Presence/Composure, on a 3-domain (Physical/Mental/Social) × Outward/Inward grid |

`src/utils/attributeResolver.js` is the single translation point — its canonical keys are always the NVSystem names; under `'5EClassic'` it redirects reads to the matching legacy key via `RULES.attributes.legacyToNew`. New code and new data should reference attributes generically through that resolver, never hardcode one system's key names directly — that's what makes a data entry correct under both flag values instead of needing to be authored twice.

**5e → NVSystem ability mapping** (`docs/plans/2026-07-30-attribute-system-remap.md`): STR→Prowess, CON→Vitality, INT→Intellect all 1:1. DEX splits Prowess (finesse attack)/Insight (reflex, AC-evasion, initiative). WIS splits Insight (perception)/Composure (will). CHA splits Presence (force/command)/Composure (poise).

**Saves under NVSystem:** only the three Inward attributes carry saves — Vitality, Insight, Composure. Prowess-save and Intellect-save are retired; Presence has no save, by design (all three Outward attributes are save-less, not just Presence). Each calling gets one save proficiency, not two (matches 5e's 33% coverage against a smaller 3-slot pool).

**Scope:** only **Dedication** has been remapped to NVSystem identity (Prowess+Vitality) so far — it's the only implemented calling the remap touched. Scholar and Wanderlust have no live NVSystem-specific identity yet; their old two-stat descriptions (INT+CON, DEX+CHA) are 5EClassic-only until those callings are actually built out under the new system.

## Skill System
This project uses a **13-skill system**, not the standard 18. Never reference retired skills (History, Nature, Religion, Insight, Persuasion, Intimidation, Performance, Stealth as standalone).

| 5EClassic ability | NVSystem attribute | Skills |
|---|---|---|
| STR | Prowess | Athletics, Acrobatics, Sleight of Hand |
| DEX | Prowess / Insight (split) | (see Prowess row for Acrobatics/Sleight of Hand) |
| CON | Vitality | Endurance |
| INT | Intellect | Academia, Arcana, Investigation |
| WIS | Insight | Perception, Empathy, Cunning |
| WIS/CHA | Composure | Creativity, Deception |
| CHA | Presence | Influence |

This skill→attribute table is an explicit stopgap (locked in the remap plan) to keep the game functional under NVSystem — it is not a skills redesign. Whether 13 is the right skill count, or Creativity/Cunning/Empathy are the right categories, is out of scope here and belongs to a future skills overhaul.

## Core Formulas
- **Proficiency bonus**: `RULES.core.proficiencyBonusByLevel[level]` — never hardcode
- **Ability modifier**: `Math.floor((score - 10) / 2)`
- **Multi-attribute rounding**: when a derived stat sums modifiers from more than one attribute (e.g. a blended save, a split AC formula), do not floor each attribute's contribution before combining. Sum the raw fractional values (`(score - 10) / 2`, not pre-floored) and floor exactly once, on the total. Single-attribute stats are unaffected — this only applies when two or more attributes combine into one number. Floor-per-attribute-then-sum silently loses up to 1 point whenever more than one contributing modifier is odd.
- **Attack roll**: `d20 + ability modifier + proficiency bonus (if proficient)`
- **Passive check**: `10 + modifier` (no dice)
- **Critical hit**: natural 20 = double dice (not double total)
- **Death saves**: 3 successes = stable, 3 failures = dead

## Callings (not Classes)
Three callings only: **Dedication** (martial), **Scholar** (caster), **Wanderlust** (hybrid). Level 3 specialization branches. Level 10 capstone (compressed from D&D 20).

Governing attribute pair, by active `RULES.attributes.system` (see Attribute Systems above):

| Calling | 5EClassic | NVSystem |
|---|---|---|
| Dedication | STR+CON | **Prowess+Vitality** (only calling actually remapped) |
| Scholar | INT+CON | not yet designed under NVSystem — treat as undecided, not INT+CON-equivalent by default |
| Wanderlust | DEX+CHA | not yet designed under NVSystem — treat as undecided, not DEX+CHA-equivalent by default |

## Resources
- **Focus** (Dedication): CON-based martial resource, full recharge on short rest
- **Mana** (Scholar/Wanderlust): Pool-based from D&D 5e Spell Points variant, full recharge on long rest. Scholar gets Arcane Recovery (partial SR).

## Weapon Masteries
All 8 official masteries implemented. Each weapon has exactly one mastery. Character must be proficient with the weapon to use its mastery. See `data/weaponMasteries.json` for assignments.

## Loot and Items
All items distributed in loot must follow D&D 5e SRD treasure distribution and rarity guidelines.
