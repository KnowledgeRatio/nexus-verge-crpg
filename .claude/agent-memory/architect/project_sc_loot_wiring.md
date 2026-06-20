---
name: Skill Challenge Loot Wiring Architecture (2026-04-14)
description: Architectural review of 2026-04-14 skill challenge loot wiring proposal — key decisions, corrections, and dispatch path
type: project
---

**Decision:** applyConsequences() is the correct and ONLY hook point for loot dispatch — it is called from both promptSkillCheck call sites in main.js but does NOT yet exist in SkillChallengeManager.js. The loot handler must be implemented inside applyConsequences(), not as a separate method.

**Why:** Two call sites in main.js already invoke `window.skillChallengeManager.applyConsequences(character, challenge, outcome, rollContext)`. Adding a standalone `applyLootReward()` wired separately would either duplicate consequence dispatch or require a third call site — both increase coupling. The single correct hook is: inside `applyConsequences()`, after xp/gold/damage, read `outcome.loot` and dispatch to `LootManager`.

**How to apply:** applyConsequences() must be added to SkillChallengeManager.js anyway (it is currently missing and main.js calls it). The loot block handler is added inside that method.

**Namespace fix:** LootManager.rollOnTable() checks only `this.lootTables.itemTables[tableName]`. Skill challenge tables live at `this.lootTables.skillChallengeLootTables[tableName]`. Correct fix: merge both namespaces into a single flat `this.allTables` map at load time inside loadData(). Do NOT fall back at rollOnTable() call site — that adds silent fallback complexity. Merge once, look up once.

**Field rename:** `"table"` → `"tableId"` in loot blocks. The rename affects 7 existing loot blocks in skillChallenges.json (not 4+2 as the designer counted — shipwreck_salvage is a 7th occurrence). No JS code currently reads `.table` or `.tableId` because applyConsequences() doesn't exist yet. Safe to rename all at once.

**rarityFilter placement:** Belongs on the loot BLOCK (per-challenge), not on the table definition. Same table (e.g., trapDisarm_common) should be reusable from different challenges at different rarity levels. Table-level filter would prevent this reuse.

**Critical gap the designer missed:** applyConsequences() doesn't exist in SkillChallengeManager.js. The entire proposal assumes this method exists. It must be implemented as part of this work, not as a pre-existing foundation.

**Second gap:** `shipwreck_salvage` table is referenced in skillChallenges.json (river_crossing challenge) but does NOT exist in lootTables.json skillChallengeLootTables. This is a pre-existing broken reference that must be added to lootTables.json as part of this work.

**Social path safety:** applyConsequences() is called from main.js for BOTH social and terrain challenge modals. The loot block handler must be guarded by checking whether the outcome actually has a `loot` key. Social challenges (bandit_negotiation tree) have no loot blocks in their node onSuccess objects, so if the guard is correct (only runs when `outcome.loot` is present), the social path is unaffected.

**RNG for loot:** LootManager.rollOnTable() requires a SeededRandom instance. getLootManager() returns the singleton. The RNG seed for terrain challenge loot should be derived from worldSeed + challengeId + Date.now() (consistent with designer's recommendation). This is intentionally non-deterministic for skill challenges — unlike combat drops which use a seeded encounter RNG. Rationale: terrain challenges are player-triggered at unpredictable times; true randomness is acceptable here.

**Save/load:** No new state persists. Items granted are immediately added to character.inventory which persists through save normally. applyConsequences() return value (consequences object) is ephemeral — not serialized.
