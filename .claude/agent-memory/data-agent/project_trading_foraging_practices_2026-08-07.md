---
name: project-trading-foraging-practices-2026-08-07
description: Trading/Foraging practices added 2026-08-07 — new maxRank field precedent, Scholar/Wanderlust practice-slot gap fix, wildernessReward_common as the canonical minor-travel-find loot table
metadata:
  type: project
---

Added `trading` and `foraging` to `data/practices.json`, both carrying a `"maxRank": 2` field. This is a **new field in this file** — `forgecraft`/`hearthcraft` have no rank concept at all (single-tier, gated by character level instead, e.g. `maxModifiedItems: {"2": 1, "6": 2}`). No code anywhere (`LevelUpManager.js`, `Character.js`) currently tracks a practice rank — `character.practices` is a flat array of learned practice ids with no rank field. `maxRank`/`rollsPerRank`/discount-rank-2 values are data-only scaffolding until backend-dev builds rank selection UI + storage.

**Why:** Practice brief explicitly asked for the rank shape and said "backend-dev builds code against what you land here" — this is intentional forward-authoring, not a mistake. But it means `maxRank` is currently a silently-unread field: don't assume it's wired just because it's present.

**How to apply:** When touching `practices.json` again, check whether rank tracking has shipped in `Character.js`/`LevelUpManager.js` before assuming `maxRank`/rank-2 values are live. If adding more ranked practices, `maxRank` is now the established field name — reuse it, don't invent a synonym.

Also fixed a real Scholar/Wanderlust gap: neither calling had any `{"type": "practice"}` entry in `levelProgression.json`'s `choices[]` at any level, meaning Forgecraft/Hearthcraft (and now Trading/Foraging) were silently Dedication-only despite `callings: null` marking them universal. Added practice choice entries at scholar/wanderlust levels 4, 6, 8, appended alongside existing spell-choice entries (not replacing them). Root cause was likely: Dedication's practice slots were added when practices shipped, and the other two callings' progression tables were never revisited.

**How to apply:** When any new calling-agnostic system is added (marked `callings: null` in its own data file), verify all three callings' `levelProgression.json` entries actually expose a matching choice type — `callings: null` in the source file does not guarantee the progression table offers a slot to pick it.

`wildernessReward_common` (in `data/lootTables.json`'s `skillChallengeLootTables`) is the established table for "a modest bonus find while traveling" — gold, rations, animalPelt, rawMeat, all common-tier, no magic items. Used it for Foraging's `bank.bonusLoot.tableId` instead of creating a new table. Reuse this key for any future non-combat/travel-flavored minor reward rather than adding a new table.

Note: the practices brief itself claimed relations.json already had a "Forgecraft/Foraging rank 2 doubling" convention in `defaults` — that convention didn't exist (relations.json defaults only had `startingScore`/`historyMaxLength`/`influencePercentPerPoint` before this change). Implemented the literal instruction (0.05 / 0.10) since it was unambiguous, but the brief's stated precedent was inaccurate — worth double-checking cited "existing conventions" against the actual file before trusting them.
