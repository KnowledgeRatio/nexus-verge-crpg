---
name: Skill Challenge Loot Wiring Design
description: Design decisions for wiring loot table rewards into terrain skill challenges (2026-04-14)
type: project
---

Skill challenge loot wiring approved 2026-04-14. Design doc at `/docs/designjams/2026-04-14-skill-challenge-loot-wiring.md`.

**Key decisions:**
- 5 of 23 challenges get loot table references; 78% give no items (anti-inflation)
- Schema: `loot: { tableId, rolls, chance, rarityFilter? }` inside `onSuccess` blocks
- Field rename required: `"table"` → `"tableId"` in 4 existing entries
- No magic weapons/armor from skill challenges — consumables/utility only
- `arcane_puzzle`: Arcana path only gets loot (chance 0.5, `arcaneReward_uncommon`)
- `ancient_text`: new table `sc_lore_reward` (scrolls, pouches — no weapons)
- `holy_ritual`: new table `sc_ritual_reward` (healing items only)
- `sneak_past_guards`: loot on stealth paths only, NOT the influence path

**Why:** Loot from skill challenges must be supplemental. Combat + dungeon chests remain primary drivers. Scholar/lore tables intentionally exclude weapons — wrong context.

**Code gaps (not yet implemented):**
- `LootManager.rollOnTable()` only checks `itemTables`, not `skillChallengeLootTables`
- `SkillChallengeManager.applyEffects()` handles `goldChange` and `reveal` only — `loot` blocks are silently ignored
- Need new `applyLootReward()` method in SkillChallengeManager wired from terrain challenge success resolver
