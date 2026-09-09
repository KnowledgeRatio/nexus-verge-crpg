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
- Resolve (Dedication's martial resource): Vitality mod + level, min 1, full recharge short rest, unlocks L3. NOTE: `rulesEngine.js` and Rally/Parry's effects still literally say `con_mod`/`conMod` — un-migrated legacy field names, flagged for data-agent/backend-dev, not yet fixed as of 2026-08-04.
- Mana: Pool-based (DMG Spell Points variant). Full LR, Scholar gets Arcane Recovery on SR.
- Attribute identity post-remap (see [[project_attribute_system_proposal]]): Dedication=Prowess+Vitality (only calling live/in-scope for the remap). Scholar/Wanderlust's old STR+CON/DEX+CHA-style two-stat identities are not yet redesigned under the new six-attribute system — don't assume a mapping for them until that work happens.

### Core Architecture
- 3 Callings: Dedication (d10, martial), **Curiosity** (d6, caster), **Audacity** (d8, hybrid). Renamed from Scholar/Wanderlust in commit 5d75d81 — older notes in this file still say the old names.
- Level 10 capstone, 13-skill system, non-grid combat
- Specializations branch at level 3 (Dedication: Exemplar/Oath)
- RULES object in rulesEngine.js is single source of truth for all balance values (ADR-000)
- Six-attribute system (Prowess/Vitality/Intellect/Insight/Presence/Composure) is LIVE DEFAULT as of 2026-08-03 (`RULES.attributes.system === 'NVSystem'`), not a proposal. `.claude/rules/d5e-compliance.md` and this file's own older notes below still describe STR/DEX/CON/INT/WIS/CHA in places — treat those as stale until someone updates the rule file itself.

## Balance Benchmarks
- Bounded accuracy: player attack bonus ranges +4 (L1) to +9 (L10). DC ceiling ~25.
- Proficiency: +2 (L1-4), +3 (L5-8), +4 (L9-10)
- Monster attack bonuses by tier: CR 0.25 = +3-4, CR 1 = +4-5, CR 5 = +7-8

### Skill Challenge Loot Wiring (2026-04-14)
- 5 of 23 challenges get loot; 78% gold/XP only. No magic gear from challenges.
- Schema: `loot: { tableId, rolls, chance, rarityFilter? }` in `onSuccess` blocks
- Rename `"table"` → `"tableId"` in 4 existing entries; add 3 new `loot` blocks
- New tables: `sc_lore_reward` (scrolls/utility), `sc_ritual_reward` (healing only)
- Two code gaps: `LootManager` needs dual-namespace lookup; `SkillChallengeManager` needs `applyLootReward()` wired
- Design doc: `docs/designjams/2026-04-14-skill-challenge-loot-wiring.md`

## Open Proposals
- ~~Attribute system replacement~~ — **no longer a proposal.** Approved 2026-07-31, default flipped to live (`NVSystem`) 2026-08-03 ahead of the original M1.5 playtest gate (playtest still expected to run, just after the flip). Saving-throw gap resolved: saves live only on the three Inward attributes (Vitality/Insight/Composure); Presence has no save, by design, consistently with Prowess/Intellect. See [[project_attribute_system_proposal]] for the full decision trail — that file's own header still says "Proposed," which is now stale too.

## Memory Files
- [Source/Void mechanics](project_source_void_mechanics.md) — no-bonus-damage rule, Hold/Slip, voidwoven rework, Curiosity information-cost constraint
- [Combat engine constraints](project_combat_engine_constraints.md) — inert resistance pipeline, unscanned artifact/helmet slots, stat axes fatigue already owns

## User Preferences
- Brevity preferred: tables over prose, "super brief" responses
- Design docs go to `docs/plans/YYYY-MM-DD-topic.md` — that dir **does** exist (earlier note claiming otherwise was wrong; corrected 2026-09-08). Older docs live in `docs/designjams/`. Every plan needs a `**Status:**` line.
- Capture design sessions into dated markdown files
