# Skill Challenge Loot Wiring — Design Document
**Date:** 2026-04-14
**Author:** Chief Game Designer
**Status:** Ready for backend-dev implementation

---

## 1. Loot Table Schema Evaluation

### Does the current schema support skill challenge rewards out of the box?

**Verdict: Partially. The JSON data structures are correct; the code pipeline is incomplete.**

The `skillChallengeLootTables` section in `lootTables.json` already exists and already has the right shape (weighted item arrays identical to `itemTables`). The `LootManager.rollOnTable()` method reads from `lootTables.itemTables` by name — it is generic enough to read from any named table in the file if the lookup is extended.

**Gap 1 — Table namespace.** `rollOnTable()` currently looks up `this.lootTables.itemTables[tableName]`. Skill challenge tables live at `this.lootTables.skillChallengeLootTables[tableName]`. The code needs a fallback that checks both namespaces (or they should be merged at load time).

**Gap 2 — No dispatch path.** `SkillChallengeManager.applyEffects()` only handles `goldChange` and `reveal`. The `loot: { table, rolls, chance }` blocks that already exist in several `onSuccess` nodes (e.g., `trap_detect_disarm`, `hidden_treasure`, `boulder_push`, `sneak_past_guards`) are silently ignored. A handler for `loot` must be added to `applyEffects()` (or to the terrain-challenge reward resolver, once that is built).

**Gap 3 — No level-scaled rarity filter for terrain challenges.** The `trap_detect_disarm` disarm stage already has a `rarityFilter` block (`"1-4": ["common"]`, `"5-9": ["common","uncommon"]`, `"10+": ["uncommon","rare"]`). The `rollOnTable` call needs to pass `playerLevel` and honor this filter when resolving items. `LootManager.resolveItem()` already checks `minimumLevel` on items, so this may be sufficient as-is; confirm during implementation.

**Gap 4 — Schema inconsistency in newer challenges.** Some challenges added later (`guard_patrol`, `market_haggle`, `pickpocket_attempt`) use a slightly different node shape (`"skill"/"dc"` at the choice level instead of inside `"onSuccess"`). These challenges also have no `balance` block. They are social/town challenges, not terrain challenges — they should remain gold-only (no loot tables needed) and do not need wiring.

### Structural changes required to `lootTables.json`

None to the outer schema. The `skillChallengeLootTables` namespace is already present and correctly shaped. New tables (see Section 4) are simply added as new keys within that namespace.

---

## 2. Per-Challenge Reward Design

All 23 challenges have been audited. The reward tier logic is:

- **No item reward** — routine traversal challenges where loot would feel gamey or incongruous
- **Gold only** — challenges that have some consequence but no natural reason to yield an item
- **Loot table reference** — challenges that represent discovering something hidden, overcoming a guarded location, or defeating a dangerous encounter without combat

**Rule of thumb applied:** If you could have just walked past it, it does not give items. If you had to work for something that was *there*, it can.

| Challenge ID | Current Reward State | Recommendation | Table ID | Rolls | Chance | Notes |
|---|---|---|---|---|---|---|
| `trap_detect_disarm` | Has `loot` block on disarm success | **Keep as-is** | `trapDisarm_common` (normal) / `trapDisarm_uncommon` (crit) | 1 / 2 | 0.8 / 1.0 | Already wired in JSON. Code gap only. |
| `locked_door` | Gold only | **Gold only — no change** | — | — | — | A door is an obstacle, not a loot source. The reward is access to what's beyond. |
| `bandit_negotiation` | Gold only | **Gold only — no change** | — | — | — | Bandits left; they took their gear. Reward is avoiding damage, not finding items. |
| `cliff_climb` | Gold only | **Gold only — no change** | — | — | — | Summit reached; no reason an item exists there. |
| `hidden_treasure` | Has `loot` block on retrieve success | **Keep as-is** | `hiddenCache_common` | 1 | 0.9 | Already wired. Code gap only. |
| `calm_wild_beast` | Gold only | **Gold only — no change** | — | — | — | Low-value encounter; giving items would trivialize it. |
| `sneak_past_guards` | Has `loot` block on acrobatics/cunning success, not on influence | **Rationalize** | `sneakReward_common` | 1 | 0.3 | Keep on stealth options (you slipped through a secured area). Remove from influence option (you just talked past them — no physical access). |
| `arcane_puzzle` | Gold only | **Add loot table** | `arcaneReward_uncommon` | 1 | 0.5 | A puzzle guards something. Add to Arcana success only (highest skill — deeper understanding). Investigation and Creativity: gold only. |
| `ancient_text` | Gold only | **Add loot table** | `sc_lore_reward` (NEW) | 1 | 0.4 | Text reveals location of something. Scholar/lore-appropriate items only. |
| `stabilize_wounded` | Gold only | **Gold only — no change** | — | — | — | Humanist act. Reward is XP + NPC gratitude; gear would be strange. |
| `track_creature` | Gold only | **Gold only — no change** | — | — | — | Tracking reveals a location, not a cache. |
| `detect_lie` | Gold only | **Gold only — no change** | — | — | — | Information, not loot. |
| `creative_distraction` | Gold only | **Gold only — no change** | — | — | — | You created an opening; the opening is the reward. |
| `holy_ritual` | Gold only | **Add loot table** | `sc_ritual_reward` (NEW) | 1 | 0.35 | Performing a ritual at a sacred site may yield a consecrated item. Low chance, thematic. |
| `narrow_ledge` | Gold only | **No change** | — | — | — | Pure traversal. No loot. |
| `endure_harsh_environment` | Gold only | **No change** | — | — | — | Survival challenge. No loot. |
| `boulder_push` | Has `loot` block | **Keep as-is** | `boulderReward_low` | 2 | 1.0 | Narrative explicitly says something was hidden there. Already correct. |
| `mountain_climb` | Gold only | **No change** | — | — | — | Traversal. |
| `heat_endurance` | Gold only | **No change** | — | — | — | Survival. |
| `swamp_navigation` | Gold only | **No change** | — | — | — | Traversal. |
| `dense_undergrowth` | Gold only | **No change** | — | — | — | Traversal. |
| `cliff_climb_advanced` | Gold only | **No change** | — | — | — | Deadly traversal, no hidden cache. |
| `ice_climbing` | Gold only | **No change** | — | — | — | Traversal. |
| `river_crossing` | Gold only | **No change** | — | — | — | Traversal. |
| `guard_patrol` | XP/reputation only | **No change** | — | — | — | Town social. |
| `market_haggle` | Gold only | **No change** | — | — | — | Gold IS the reward. |
| `pickpocket_attempt` | Gold only | **No change** | — | — | — | Gold reward already present. |

**Summary: 5 challenges get loot table references.** 4 already have them in JSON (code gap only). 1 new reference is added (`arcane_puzzle`). 2 new tables are needed (`ancient_text`, `holy_ritual`).

---

## 3. Schema Recommendation

### Field additions to a skill challenge `onSuccess` block

No new top-level fields are needed on the challenge object itself. The `loot` block already established by `trap_detect_disarm` is the correct pattern. Standardize it as follows:

```json
"onSuccess": {
  "message": "...",
  "xp": 100,
  "gold": 25,
  "loot": {
    "tableId": "trapDisarm_common",
    "rolls": 1,
    "chance": 0.8,
    "rarityFilter": {
      "1-4": ["common"],
      "5-9": ["common", "uncommon"],
      "10+": ["uncommon", "rare"]
    }
  }
}
```

**Field naming note:** The existing challenges use `"table"` as the key inside the `loot` block. Rename to `"tableId"` for clarity and consistency with how `tableName` is used in `LootManager`. This is a one-time data migration on the 4 existing entries — no structural impact.

**`rarityFilter` is optional.** When absent, no rarity filtering is applied (all items in the table are eligible). `rarityFilter` is a level-bracket-keyed object mapping to an array of allowed rarity strings. The `LootManager.resolveItem()` already handles `minimumLevel` — rarity filtering should be layered on top in the new dispatch path, not inside `resolveItem`.

**Critical success loot** uses the same `loot` block shape, placed on the `criticalSuccess` object (already done correctly in `trap_detect_disarm`).

### What the backend dev needs to implement

1. **`LootManager`: extend table lookup** — after checking `itemTables[tableName]`, fall back to `skillChallengeLootTables[tableName]`. Alternatively, merge both namespaces into a single flat map at load time (preferred — simpler at call sites).

2. **`SkillChallengeManager`: new `applyLootReward(lootDef, playerLevel, rng)` method** — reads `tableId`, `rolls`, `chance`, `rarityFilter`, calls `lootManager.rollOnTable()`, grants items to character. Must call `getLootManager()` (already a singleton). Dispatch this from the terrain challenge resolver (not just from `applyEffects`, which is for the social challenge system).

3. **`SkillChallengeManager`: terrain challenge reward path** — terrain challenges (`type: sequential | choice | single` in `skillChallenges.json`) currently have no reward dispatcher. When a terminal `onSuccess` block is resolved, extract `xp`, `gold`, and `loot` from it and apply all three. The `loot` block triggers `applyLootReward()`.

4. **Rename `table` to `tableId`** in the 4 existing `loot` blocks in `skillChallenges.json`.

---

## 4. New Loot Tables

Two new tables are needed. Both belong in `lootTables.json` under `skillChallengeLootTables`.

### `sc_lore_reward`
Triggered by: `ancient_text` on Academia success.
Theme: Knowledge leads to location of something. Scholarly/utility items. No weapons or armor — that's not what you find in an ancient text.

```json
"sc_lore_reward": [
  { "itemId": "gold", "amount": "2d20", "weight": 45 },
  { "itemId": "scrollOfIdentify", "weight": 25 },
  { "itemId": "componentPouch", "weight": 15 },
  { "itemId": "healersKit", "weight": 10 },
  { "itemId": "potionOfHealing", "weight": 5 }
]
```

### `sc_ritual_reward`
Triggered by: `holy_ritual` on Academia success.
Theme: Sacred site blesses the performer. Restorative/protective consumables. No weapons — profane to find a weapon at a shrine.

```json
"sc_ritual_reward": [
  { "itemId": "gold", "amount": "2d12", "weight": 40 },
  { "itemId": "potionOfHealing", "weight": 30 },
  { "itemId": "healersKit", "weight": 20 },
  { "itemId": "antitoxin", "weight": 10 }
]
```

### Existing tables confirmed usable (no changes)
- `trapDisarm_common` — correct
- `trapDisarm_uncommon` — correct
- `hiddenCache_common` — correct
- `hiddenCache_uncommon` — usable for future upgrade path
- `boulderReward_low` — correct
- `sneakReward_common` — correct
- `arcaneReward_uncommon` — added to `arcane_puzzle` (Arcana success only)

---

## 5. Anti-Inflation Guardrails

The design brief explicitly flags loot inflation. These constraints must be respected:

| Control | Value | Rationale |
|---|---|---|
| Max challenges with item rewards | 5 of 23 | 78% of challenges give no items |
| Max loot chance on routine success | 0.5 | Most rolls yield gold, not items |
| Max rolls per challenge | 2 (crit success only) | Boulder push is the exception — it's telegraphed as a cache |
| No weapons/armor in new tables | Enforced | `sc_lore_reward` and `sc_ritual_reward` are consumables/utility only |
| No `magic_items_*` tables referenced | Enforced | Skill challenges never award magic weapons/armor. Those come from combat and dungeons |
| `arcane_puzzle` loot chance | 0.5 | Arcana success only. Investigation/Creativity paths: gold only |

A character who plays every challenge optimally gains maybe 3–5 items per full run through the loot-enabled challenges. Combat with a CR 3–5 enemy has a 70–75% drop chance and often yields magic items by level 5. Skill challenges remain supplemental.

---

## 6. Exact Data Changes Required

### Changes to `skillChallenges.json`

**Rename `"table"` to `"tableId"` in 4 locations:**
- `trap_detect_disarm` > stages[1].onSuccess.loot
- `trap_detect_disarm` > criticalSuccess.loot
- `hidden_treasure` > stages[1].onSuccess.loot
- `boulder_push` > onSuccess.loot
- `sneak_past_guards` > options[0].onSuccess.loot (acrobatics)
- `sneak_past_guards` > options[1].onSuccess.loot (cunning)

**Remove loot block from `sneak_past_guards` options[2] (influence path)** — talking past guards does not grant physical access.

**Add `loot` block to `arcane_puzzle` Arcana option `onSuccess`:**
```json
"loot": {
  "tableId": "arcaneReward_uncommon",
  "rolls": 1,
  "chance": 0.5
}
```

**Add `loot` block to `ancient_text` `onSuccess`:**
```json
"loot": {
  "tableId": "sc_lore_reward",
  "rolls": 1,
  "chance": 0.4
}
```

**Add `loot` block to `holy_ritual` `onSuccess`:**
```json
"loot": {
  "tableId": "sc_ritual_reward",
  "rolls": 1,
  "chance": 0.35
}
```

### Changes to `lootTables.json`

Add under `skillChallengeLootTables`: `sc_lore_reward` and `sc_ritual_reward` as specified in Section 4.

### Changes to `LootManager.js`

Extend `rollOnTable()` to check `skillChallengeLootTables` as fallback when `tableName` not found in `itemTables`. Alternatively, merge namespaces at load time.

### Changes to `SkillChallengeManager.js`

Add `applyLootReward(lootDef, playerLevel)` method. Wire it from the terrain challenge success resolver. Pass a seeded RNG (derive from world seed + challenge ID + timestamp for deterministic-enough behavior).

---

## 7. Handoff

This is ready for `/backend-dev` to implement. No architectural decisions are outstanding. The changes are:

1. **`lootTables.json`** — add 2 new tables (designer provides exact JSON above)
2. **`skillChallenges.json`** — field rename (`table` → `tableId`) + 3 new `loot` blocks + 1 removal
3. **`LootManager.js`** — extend `rollOnTable` table lookup to cover both namespaces
4. **`SkillChallengeManager.js`** — add `applyLootReward()` and wire it from terrain challenge resolution

Run past `/devils-advocate` first to stress-test the inflation guardrails — specifically whether `arcane_puzzle` + `ancient_text` appearing in the same dungeon run creates a local spike.
