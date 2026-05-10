# Quest System Redesign
**Date:** 2026-05-03  
**Status:** Decisions locked — ready for implementation  
**Session:** Multi-agent review (game-designer, architect, devils-advocate)

---

## Problem Statement

The existing quest system generates quests post-hoc (at settlement visit time) from templates, then tries to reverse-engineer references into the already-generated world. This creates:

- Retrieve quests with placeholder item IDs that have no loot spawn hook (broken, uncompletable)
- Quest NPC IDs that break after region prune/restore cycles
- Kill quests that can't track location (undefined `world.currentLocation`)
- Quest targets that feel invented rather than discovered — no referential integrity with the world

## Core Architectural Change

**World-first generation.** The world emits `questHook` stubs on dungeons at placement time. Quest generation reads real hooks. Quests feel coherent because their targets genuinely exist in this run's world.

> **Mental model:** The dungeon exists → the nearby settlement knows about it → the innkeeper offers a quest about it. Not: the innkeeper invents a dungeon and hopes one generates nearby.

---

## Locked Decisions

### Quest Economy
- **3 quests per settlement** — village/town/city all offer 3. Not a board of 6-8.
- **One per calling archetype** — Kill-Chief (Dedication primary), Retrieve-Artifact (Wanderlust primary), Investigate-Chain (Scholar primary)
- **All 3 visible to all callings** — no calling gate. Natural self-selection. A Dedication player sees the Investigate-Chain and can attempt it; they just won't be as efficient.
- **3 calling-quests replace (not supplement) the existing random quest count** for those types. Prevents capacity overflow.
- **Quest slot budget by settlement type:** Village: 3, Town: 3, City: 3 (flat — scarcity is the point)

### Quest Types

#### Kill-Chief (Dedication primary)
- A named monster (boss variant) exists in a specific dungeon, seeded at world-gen time via `questHook`
- "Named" means: generated name + elite promotion flag, not a seeded world instance
- First qualifying elite-promoted enemy of the type completes the objective
- `specialSpawnTrigger` is **out of scope** — deferred to DungeonManager final-room injection (`namedBossId` field on `questHook`, future implementation)
- For now: first qualifying encounter with that creature type promotes one enemy to elite

#### Retrieve-Artifact (Wanderlust primary)
- Specific dungeon flagged at world-gen time (`questHook.nearestSettlementId`)
- `questBind: { questId, itemId, itemName }` written to dungeon in `world.metadata` at quest assignment
- DungeonManager reads `questBind` during loot generation and injects item into final room
- One active retrieve bind per dungeon (check `dungeon.questBind` before assigning)
- **Critical:** After writing `questBind`, `SettlementManager` must call `gameState.set('world.metadata', ...)` explicitly — in-memory mutation alone won't survive save/load

#### Investigate-Chain (Scholar primary)
- NPC gives first clue → 2-3 anchored world locations (settlements, landmarks) → resolution at dungeon
- **Solo Scholar path:** payoff object (tablet, journal, inscription) placed in dungeon room 1, accessible via one Investigation check, no combat required. Scholar does not need to clear the dungeon.
- Deeper exploration is optional (rewards scale if player pushes further)

### Architecture: questHook + questBind

```
world.metadata.features[i] (dungeon) = {
  type: 'dungeon',
  x, y, theme, name,
  questHook: {
    nearestSettlementId: '48,32',   // id = "${x},${y}" of nearest settlement
    distanceTiles: 63,
    namedBossId: 'orc_warlord'      // for future DungeonManager final-room injection
  },
  questBind: {                       // written by SettlementManager at quest assignment
    questId: 'quest_48_32_...',
    itemId: 'quest_item_...',
    itemName: 'Corrupted Medallion'
  }
}
```

### Rules Config (to add to `rulesEngine.js`)

```javascript
RULES.quests = {
  enabled: true,
  questsPerSettlement: 3,
  maxHookDistanceTiles: 150,   // dungeons beyond this are explorable but quest-unlinked
  hookRadius: 150,             // alias for getHooksForSettlement() query
  enableWorldHooks: true,      // false = fall back to current generic generation
  questSlotBudget: {
    village: 3,
    town: 3,
    city: 3
  }
}
```

---

## Implementation Plan

### Phase 1 — World Hook Infrastructure
**Files:** `WorldGenerator.js`, `QuestGenerator.js`, `rulesEngine.js`

1. Add `RULES.quests` block to `rulesEngine.js`
2. In `WorldGenerator.preGenerateFeatures()`: after placing each dungeon feature, compute nearest settlement from `worldMetadata.settlements[]`, write `questHook` stub if within `maxHookDistanceTiles`
3. Add `QuestGenerator.getHooksForSettlement(settlementId)` — filters `world.metadata.features` for hooks pointing at this settlement, excludes already-bound hooks (`dungeon.questBind` exists)
4. Update `generateQuestsForSettlement()` to query hooks for Retrieve + Kill types

### Phase 2 — questBind Persistence
**Files:** `SettlementManager.js`

5. After retrieve quest assigned to a dungeon, write `questBind` to dungeon in `world.metadata`
6. **Must** call `gameState.set('world.metadata', worldGenerator.worldMetadata)` after mutation — in-memory-only write does not survive save/load

### Phase 3 — DungeonManager Item Injection
**Files:** `DungeonManager.js` (verify loot generation entry point first)

7. During dungeon loot generation, check if `dungeon.questBind` exists for this dungeon's coordinates
8. If so, inject `questBind.itemId` into the final room's loot table
9. Item should be guaranteed (not probability-gated)

### Phase 4 — Existing Bug Fixes (prerequisite or concurrent)
**Files:** `CombatManager.js`, `QuestManager.js`

10. Fix `playerPos = gameState.get('world.currentLocation')` — field doesn't exist. Use `character.position` or `player.position`
11. Ensure `quests.available` is initialized before any `acceptQuest()` call (GameState already initializes empty array — verify settlement visit is always the first write point)

### Phase 5 — Quest Log UI
**Files:** `src/main.js`, `index.html`, `styles.css`

12. Implement `renderQuestLog()` — currently an empty stub
13. Active quest tracking visible to player

---

## Deferred (Out of Scope for This Implementation)

| Feature | Why Deferred | Future Hook |
|---|---|---|
| `specialSpawnTrigger` in encounter system | No dispatch path in encounter builder | `namedBossId` field on `questHook` — DungeonManager reads when built |
| Named enemy seeded world instances | Requires persistent world actor system | Not warranted by current scope |
| Cross-settlement deliver quests | Needs NPC state tracking across settlements | Current deliver quests target same settlement |
| Faction-specific quest templates | Faction system not yet implemented | `campaignIds` field on quest templates ready |
| Quest failure → world state change | Consequence propagation model not designed | Timed/escalating quests are a future feature |
| Salt quest-type-to-calling assignment by character entropy | Prevents "optimal seed" meta | Low priority until shipping |

---

## DA Risk Register

| Risk | Mitigation | Owner |
|---|---|---|
| `questBind` lost on save/load | Explicit `gameState.set('world.metadata', ...)` after every bind write | backend-dev |
| Scholar Investigate-Chain is a dungeon death trap | Payoff in room 1, Investigation check, no combat gate | game-designer spec ✅ |
| `specialSpawnTrigger` has no dispatch path | Removed from scope; `namedBossId` stubbed on questHook | architect |
| Deep wilderness dungeon orphans | `maxHookDistanceTiles: 150` cap in RULES.quests | backend-dev |
| Settlement quest capacity overflow | 3 quests replace random generation, don't supplement | backend-dev |
| Same seed = same quests | Expected roguelike behavior; future: salt with character entropy | roadmap |
| Calling-gate lockout | No gate — all 3 quests visible to all callings | design ✅ |

---

## Related Docs
- `docs/plans/2026-04-29-npc-conversational-skill-challenges.md` — NPC challenge wiring (Tasks 1–5 still pending)
- `docs/plans/2026-03-09-party-system-amendments.md` — Party system (affects Scholar solo viability long-term)
- `docs/plans/2026-02-19-npc-relations-design.md` — NPC relations (affects quest giver persistence and reward bonuses)
