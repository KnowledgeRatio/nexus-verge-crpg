# Game Designer Agent Memory

## Key Design Decisions

### Flee Mechanic (2026-02-28)
- d20 + DEX mod + proficiency vs DC 10 + 2*(enemies-1). Costs Action.
- Opportunity attacks from ALL living enemies ALWAYS trigger (before result).
- Wanderlust Cunning Action: Bonus Action + Advantage on flee check (level 2+).
- Boss encounters: +5 DC. Ambush: +3 DC round 1.
- Prone = disadvantage. Restrained/Grappled/Stunned = cannot flee. Frightened = advantage.
- Ranged-only enemies: no opportunity attacks but still count for DC.
- Config in RULES.flee (rulesEngine.js). Per-encounter overrides via encounterData.

### Resource System (from design docs)
- Focus (was Stamina): CON mod + (level-2), full recharge short rest. Dedication only.
- Mana: Pool-based (DMG Spell Points variant). Full LR, Scholar gets Arcane Recovery on SR.
- All callings are two-stat: Dedication=STR+CON, Scholar=INT+CON, Wanderlust=DEX+CHA.

### Core Architecture
- 3 Callings: Dedication (d10, martial), Scholar (d6, caster), Wanderlust (d8, hybrid)
- Level 10 capstone, 13-skill system, non-grid combat
- Specializations branch at level 3 (Dedication: Exemplar/Oath)
- RULES object in rulesEngine.js is single source of truth for all balance values (ADR-000)

## Balance Benchmarks
- Bounded accuracy: player attack bonus ranges +4 (L1) to +9 (L10). DC ceiling ~25.
- Proficiency: +2 (L1-4), +3 (L5-8), +4 (L9-10)
- Monster attack bonuses by tier: CR 0.25 = +3-4, CR 1 = +4-5, CR 5 = +7-8

## User Preferences
- Brevity preferred: tables over prose, "super brief" responses
- Design docs go to docs/designjams/ (not docs/plans/ - that dir doesn't exist)
- Capture design sessions into dated markdown files
