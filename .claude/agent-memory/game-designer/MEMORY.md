# Game Designer Agent Memory

## Key Design Decisions

### Flee Mechanic (2026-02-28, updated 2026-03-14)
- d20 + max(DEX mod, WIS mod) + proficiency vs DC 10 + 2*(engaged_enemies-1). Costs Action.
- OAs from engaged melee enemies ONLY (before result). Ranged enemies: no OA but count for DC.
- Wanderlust Cunning Action (L2+): Bonus Action flee (same check, no advantage).
- Boss encounters: +5 DC. Ambush: +3 DC round 1. DC cap: 25.
- Prone = disadvantage. Restrained/Grappled/Stunned/Paralyzed/Unconscious = cannot flee. Frightened = advantage.
- Config in RULES.flee (rulesEngine.js). Per-encounter overrides via encounterData.

### Engagement System (designed 2026-03-14 — not yet implemented)
**Data structure:** `engagedWith: Set<id>` per Combatant (replaces boolean `hasEngaged`).
- Backward-compat getter: `get hasEngaged() { return this.engagedWith.size > 0; }`
- Set needs special JSON handling (serialize as Array, deserialize back to Set).

**Engagement triggers:** Melee attack is *made* (roll attempted) in either direction → both combatants added to each other's `engagedWith`. Ranged attacks never engage.

**Engagement breaks:** Enemy death/down, enemy flees, Disengage action by combatant, end of combat.

**Flee interaction:** OAs and DC use `combatant.engagedWith` set, not global `hasEngaged`. More accurate: enemies who attacked *you* in melee also count.

**Mitigation for L1 fairness:** Consider: bidirectional engagement only after combatant has taken their first turn (prevents "3 enemies attack on round 1 → DC 16 before player acts").

**Disengage action (new):**
- Cost: Action. Effect: clears `engagedWith` for that combatant for rest of turn.
- Wanderlust Cunning Action (L2+): Disengage as Bonus Action (PHB 2024 Rogue RAW).
- Config: `RULES.combat.disengage` block.
- Disengage vs Flee distinction: Disengage = safe repositioning, stays in combat. Flee = exit attempt, has OAs + check.

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
