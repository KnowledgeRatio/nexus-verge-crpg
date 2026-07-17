# Quest System — Implementation Plan
**Date:** 2026-05-05  
**Status:** Approved (unverified — flagged 2026-07-17, original text was "Ready for implementation"; CLAUDE.md's Current State lists "Quest system polish" as in progress, which suggests this was implemented and is now being refined — check `src/systems/QuestManager.js` before treating this plan as current)  
**Depends on:** `docs/plans/2026-05-03-quest-system-redesign.md` (locked decisions)  
**Review chain:** game-designer → architect → devils-advocate → architect (pruning, pending)

---

## Summary

Replace post-hoc quest generation with world-first generation. Dungeons emit `questHook` stubs at world placement time. Quest generation reads those hooks. Retrieve quests write `questBind` back to the dungeon. DungeonManager injects the quest item. 3 quests per settlement (Kill-Chief / Retrieve-Artifact / Investigate-Chain), all visible to all callings.

---

## Pre-Implementation Checklist

Before writing any code, grep and confirm:

```
# Breaking rename — anything reading the old key will break
grep -r "questsPerSettlement" src/ data/
# Expected: QuestGenerator.js lines 104-112 (local questCounts object to delete)
# Expected: rulesEngine.js (old config block to replace)

# Confirm worldGenerator reference pattern
grep -r "worldGenerator.worldMetadata" src/
# Must re-sync this reference in _writeQuestBind after any mutation

# Confirm DungeonManager loot generation entry point
grep -r "generateLoot\|roomLoot\|finalRoom" src/systems/DungeonManager.js
# Find exact injection point for Phase 3
```

---

## Phase 1 — WorldGenerator Hook Infrastructure

**Files:** `src/systems/WorldGenerator.js`, `src/core/rulesEngine.js`

### 1a. Add `RULES.quests` config block

Replace the existing `RULES.quests` block in `rulesEngine.js`:

```javascript
quests: {
    enabled: true,
    questsPerSettlement: 3,           // flat — all settlement types offer 3
    maxHookDistanceTiles: 150,        // dungeons beyond this distance are quest-unlinked
    hookRadius: 150,                  // alias used by getHooksForSettlement()
    enableWorldHooks: true,           // false = fall back to existing generic generation
    questSlotBudget: {                // replaces old questsPerSettlement object
        village: 3,
        town: 3,
        city: 3
    },
    questDifficultyByLevel: {
        1: 'easy', 3: 'medium', 5: 'medium', 7: 'hard', 10: 'hard'
    },
    baseXPReward: 100,
    xpMultiplierByDifficulty: {
        trivial: 0.5, easy: 1.0, medium: 1.5, hard: 2.0, deadly: 3.0
    }
}
```

### 1b. Add `_computeQuestHook(x, y)` to WorldGenerator

New private method — call it inside `preGenerateFeatures()` after each dungeon is pushed to the features array:

```javascript
_computeQuestHook(x, y) {
    if (!RULES.quests.enableWorldHooks) return null;
    const maxDist = RULES.quests.maxHookDistanceTiles;
    let nearest = null;
    let nearestDist = Infinity;
    for (const s of this.worldMetadata.settlements) {
        const dist = Math.sqrt(Math.pow(s.x - x, 2) + Math.pow(s.y - y, 2));
        if (dist < nearestDist) { nearestDist = dist; nearest = s; }
    }
    if (!nearest || nearestDist > maxDist) return null;
    return {
        nearestSettlementId: nearest.id,    // "${x},${y}"
        distanceTiles: Math.round(nearestDist),
        namedBossId: null                   // populated later by enrichDungeonFeature()
    };
}
```

Call site in `preGenerateFeatures()` — after `features.push(dungeonStub)`:
```javascript
const hook = this._computeQuestHook(pos.x, pos.y);
if (hook) dungeonStub.questHook = hook;
```

### 1c. Populate `namedBossId` in `enrichDungeonFeature()`

At the end of `enrichDungeonFeature()`, after `dungeon.dominantCreatures` is assigned:
```javascript
if (dungeon.questHook && dungeon.questHook.namedBossId === null
    && dungeon.dominantCreatures?.length > 0) {
    dungeon.questHook.namedBossId = dungeon.dominantCreatures[0];
}
```

---

## Phase 2 — QuestGenerator Slot-Based Generation

**File:** `src/systems/QuestGenerator.js`

### 2a. Add `getHooksForSettlement(settlementId)`

```javascript
getHooksForSettlement(settlementId) {
    const metadata = gameState.get('world.metadata');
    if (!metadata?.features) return [];
    return metadata.features.filter(f =>
        f.type === 'dungeon' &&
        f.questHook?.nearestSettlementId === settlementId &&
        !f.questBind   // exclude already-bound dungeons
    );
}
```

### 2b. Replace `generateQuestsForSettlement()` local questCounts

Delete lines 104–112 (the local `questCounts` object). Replace with:

```javascript
generateQuestsForSettlement(settlement, playerLevel) {
    const budget = RULES.quests.questSlotBudget[settlement.settlementType]
        ?? RULES.quests.questsPerSettlement;
    const hooks = RULES.quests.enableWorldHooks
        ? this.getHooksForSettlement(settlement.id)
        : [];
    const rng = new SeededRandom(
        `${this.worldSeed}_settlement_${settlement.x}_${settlement.y}_quests`
    );

    const quests = [
        this._generateKillChief(settlement, playerLevel, hooks, rng),
        this._generateRetrieveArtifact(settlement, playerLevel, hooks, rng),
        this._generateInvestigateChain(settlement, playerLevel, hooks, rng)
    ].filter(Boolean);

    return quests;
}
```

### 2c. Add three slot-specific generator methods

**`_generateKillChief(settlement, playerLevel, hooks, rng)`**
- Pick hook where `hook.namedBossId !== null`. If no hook available, fall back to generic creature from CR bracket.
- Pick variant index: `rng.nextInt(0, 3)` → selects one of 4 Kill-Chief templates.
- Return quest instance with `dungeonHookId: hook?.id ?? null`.

**`_generateRetrieveArtifact(settlement, playerLevel, hooks, rng)`**
- Pick hook with no existing `questBind`. If no hook, fall back to generic dungeon reference.
- Generate `itemId: \`quest_item_${rng.nextInt(10000, 99999)}\`` and `itemName` from variant word lists.
- Return quest instance with `pendingBind: { dungeonX: hook.x, dungeonY: hook.y, itemId, itemName }`.
- `SettlementManager` reads `pendingBind` immediately after generation and calls `_writeQuestBind()`, then deletes `pendingBind` from the quest instance before persisting.

**`_generateInvestigateChain(settlement, playerLevel, hooks, rng)`**
- Does not consume a hook. Clue chain is narrative.
- Pick variant index from 4 Investigate-Chain templates.
- Generate 2–3 anchor locations from nearby settlements in `world.metadata.settlements`.
- Return quest instance with anchor location IDs.

---

## Phase 3 — SettlementManager questBind Write

**File:** `src/systems/SettlementManager.js`

### 3a. Add `_writeQuestBind(dungeonX, dungeonY, questId, itemId, itemName)`

```javascript
_writeQuestBind(dungeonX, dungeonY, questId, itemId, itemName) {
    // Always read from gameState — not from worldGenerator.worldMetadata
    // (the two references diverge after save/load)
    const metadata = gameState.get('world.metadata');
    if (!metadata?.features) {
        console.warn('_writeQuestBind: world.metadata not available');
        return;
    }
    const feature = metadata.features.find(f => f.x === dungeonX && f.y === dungeonY);
    if (!feature) {
        console.warn(`_writeQuestBind: dungeon at (${dungeonX},${dungeonY}) not found`);
        return;
    }
    feature.questBind = { questId, itemId, itemName, bindType: 'retrieve' };

    // Explicit set required — in-memory mutation alone does not survive save/load
    gameState.set('world.metadata', metadata);

    // Re-sync worldGenerator in-memory reference to prevent ghost-object writes later
    if (window.game?.worldGenerator) {
        window.game.worldGenerator.worldMetadata = metadata;
    }
}
```

### 3b. Call `_writeQuestBind()` in `enterSettlement()` after quest generation

```javascript
// After generating quests array:
for (const quest of quests) {
    if (quest.pendingBind) {
        const { dungeonX, dungeonY, itemId, itemName } = quest.pendingBind;
        this._writeQuestBind(dungeonX, dungeonY, quest.id, itemId, itemName);
        delete quest.pendingBind;  // do not persist pendingBind on quest instance
    }
}
```

---

## Phase 4 — DungeonManager Item Injection

**File:** `src/systems/DungeonManager.js`

### 4a. Add `_injectQuestBind(dungeonX, dungeonY, roomLoot)`

```javascript
_injectQuestBind(dungeonX, dungeonY, roomLoot) {
    // Always look up from world.metadata by coordinate — never from region feature object.
    // (questBind is written to world.metadata; region features are re-inflated from
    // compressed save data and will not contain questBind written after initial generation.)
    const metadata = gameState.get('world.metadata');
    const feature = metadata?.features?.find(f => f.x === dungeonX && f.y === dungeonY);
    if (!feature?.questBind || feature.questBind.bindType !== 'retrieve') return;

    const { itemId, itemName } = feature.questBind;
    roomLoot.guaranteedItems = roomLoot.guaranteedItems || [];
    roomLoot.guaranteedItems.push({ id: itemId, name: itemName, type: 'quest_item' });
}
```

Call `_injectQuestBind()` in the final-room loot generation pass.  
**Before implementing:** grep `DungeonManager.js` for `generateLoot`, `finalRoom`, `roomLoot` to find the exact injection site.

---

## Phase 5 — Bug Fixes (prerequisite, implement first or concurrent)

**Files:** `src/systems/CombatManager.js`, `src/systems/QuestManager.js`

### 5a. Fix undefined `playerPos` in kill tracking

**CombatManager.js** — in `endCombat()`, around line 2210:
```javascript
// Wrong — this field does not exist in GameState:
const playerPos = gameState.get('world.currentLocation');

// Correct:
const playerPos = gameState.get('player.position');
```

**QuestManager.js** — same fix wherever `world.currentLocation` appears.

### 5b. Fix `quests.available` source in `acceptQuest()`

Confirm `acceptQuest()` reads from `gameState.get('quests').available` not `this.availableQuests`.  
If it reads `this.availableQuests`, replace with gameState read.

### 5c. Remove local `questCounts` from `QuestGenerator`

Already covered in Phase 2b. Listed here as a standalone bug fix because it currently overrides `RULES.quests` silently.

---

## Phase 6 — Quest Template Data (`data/quests.json`)

Add 12 new quest template entries (3 types × 4 variants). Each entry adds these fields beyond the existing schema:

```json
{
    "id": "kill-chief-warlord",
    "name": "End [ENEMY_TYPE] Warlord [BOSS_NAME] of [DUNGEON_NAME]",
    "type": "kill",
    "callingArchetype": "dedication",
    "intelQuality": "high",
    "intelDialogue": {
        "high": "I know exactly where they lair — {dungeonName}, to the {direction}.",
        "medium": "Somewhere nearby. A ruin, I think.",
        "low": "I've only heard rumours.",
        "none": "I have no information to give you."
    },
    "timeLimit": null,
    "competingParty": false,
    "factionConsequence": null,
    "worldTag": "powerVacuum",
    "generation": { ... }
}
```

### The 12 templates — full content spec

#### Kill-Chief (callingArchetype: "dedication")

**1. `kill-chief-warlord`**
- Name pattern: `"End [ENEMY_TYPE] Warlord [BOSS_NAME] of [DUNGEON_NAME]"`
- Quest giver: Settlement Elder (political — raids threatening trade routes)
- What makes it different: Boss fight with 2 guards — combat-forward, no shortcut
- World consequence (worldTag: "powerVacuum"): Enemy faction spawns from power vacuum; dungeon re-rolls as abandoned on next entry
- intelQuality: "high" — giver knows dungeon name, direction, enemy type
- intelDialogue.high: "I know exactly where [BOSS_NAME] lairs — [DUNGEON_NAME], to the [DIRECTION]."
- intelDialogue.medium: "Somewhere to the east. A ruin, I think."
- intelDialogue.low: "I've only heard rumours from the merchants."
- intelDialogue.none: "I have no information to give you."
- timeLimit: null, competingParty: false

**2. `kill-chief-bounty`**
- Name pattern: `"The Bounty on [BOSS_NAME]: Dead or Alive"`
- Quest giver: Traveling Merchant NPC (personal loss — this warlord robbed them)
- What makes it different: Giver has specific intel — tells player ONE concrete detail (weapon type, lair terrain type, or number of guards). Better prep opportunity.
- World consequence (worldTag: null): Merchant upgrades settlement inventory (expanded stock flag for 3 in-game days)
- intelQuality: "medium"
- competingParty: true — another bounty hunter is also after this target. Probabilistic: 20% chance on dungeon entry that item/proof is already claimed.
- timeLimit: null

**3. `kill-chief-extermination`**
- Name pattern: `"Cull the [CREATURE_PLURAL] Before Winter"`
- Quest giver: Farmer or Forager (survival — they'll raid food stores)
- What makes it different: Two-phase objective. Phase 1: Kill [COUNT] [CREATURE]. Phase 2: Kill named den mother (elite mob). Must complete Phase 1 before Phase 2 objective unlocks.
- World consequence (worldTag: "safer"): That terrain hex's encounter rate drops by half permanently for this run
- intelQuality: "low" — giver knows creature type and general direction, nothing else
- timeLimit: null, competingParty: false
- Generation note: COUNT is `rng.nextInt(3, 6)`. Creatures are from dungeon's `dominantCreatures[0]`.

**4. `kill-chief-sacrifice`**
- Name pattern: `"Stop the [ENEMY_TYPE] Ritual at [DUNGEON_NAME]"`
- Quest giver: Temple Keeper (religious urgency — sacrifice is scheduled)
- What makes it different: timeLimit: 3 — the ritual leader must be killed within 3 dungeon room entries. Forces fast play; no room-by-room looting.
- World consequence (worldTag: "cleansed"): On success, dungeon is tagged cleansed. On FAILURE (timeLimit exceeded): nearest settlement gets a Cursed flag — log a debuff message on next long rest attempt there.
- intelQuality: "high" — giver knows dungeon, enemy type, and that time is critical
- timeLimit: 3, competingParty: false
- Generation note: Quest description must display the time limit visibly: "You have three rooms."

---

#### Retrieve-Artifact (callingArchetype: "wanderlust")

**5. `retrieve-heirloom`**
- Name pattern: `"Recover the [ITEM_TYPE] of [FAMILY_NAME]"`
- Quest giver: Grieving Noble NPC (sentimental — family crest, ring, or ancestral weapon)
- What makes it different: Item appears on a named dead body in the dungeon (not a chest). The body has a generated name. It's humanizing — the player sees a name before taking the item.
- World consequence (worldTag: null): Quest giver opens a "vault" tab in their merchant UI with 1-2 normally-unavailable items after completion
- intelQuality: "high" — giver knows item description, dungeon name, and that it's on a body
- factionConsequence: null, competingParty: false, timeLimit: null

**6. `retrieve-contraband`**
- Name pattern: `"Don't Ask What It Is — Just Bring It Back"`
- Quest giver: Sketchy Merchant (evasive — profitable, clearly illegal)
- What makes it different: Player doesn't know what they're carrying. Full contents only revealed on delivery. Item name displayed as "Sealed Crate" until turnin.
- World consequence (worldTag: null): On delivery, infamy score rises slightly; merchants in the next settlement visited may have elevated prices ("word travels")
- intelQuality: "none" — giver reveals nothing about the item or dungeon deliberately
- factionConsequence: `{ factionId: "city_watch", delta: -10 }` (stubbed — logs but doesn't apply until faction system built)
- competingParty: false, timeLimit: null
- Generation note: `itemName` is stored internally but rendered as "Sealed Crate" until `quest.status === 'completed'`

**7. `retrieve-relic`**
- Name pattern: `"The [DUNGEON_NAME] Held Our People's [RELIC_NAME]"`
- Quest giver: Cultural Elder (historical — artifact was looted generations ago)
- What makes it different: Passive discovery mechanic — Wanderlust's Investigation auto-pings proximity to the item in the dungeon (message in combat log: "You sense something significant nearby"). Scholar gets a clue scroll at quest accept. Dedication gets no hint — must check every room.
- World consequence (worldTag: null): Settlement relation score +20 on completion; unlocks an additional quest from this NPC on next visit
- intelQuality: "medium" — giver knows the dungeon but not the exact room
- factionConsequence: null, competingParty: false, timeLimit: null
- Generation note: Calling-specific hint at quest accept time: `if (character.class === 'wanderlust') { addPassiveProximityHint(); }`

**8. `retrieve-trophy`**
- Name pattern: `"Bring Me Proof It's Dead"`
- Quest giver: Mercenary Captain (professional — client wants confirmation of kill)
- What makes it different: Trophy drops off the elite mob — this quest is simultaneously a Kill-Chief and a Retrieve. Wanderlust players grab the trophy without full clear; Dedication players fight through everything. Same quest, different optimal paths.
- World consequence (worldTag: null): Mercenary company adds a temporary vendor at the next Sanctuary the player rests at
- intelQuality: "medium" — giver knows creature type and dungeon area, not exact location
- competingParty: false, timeLimit: null
- Generation note: Trophy item ID is generated as `quest_trophy_[CREATURE_ID]`. Drops from elite mob kill, not from chest.

---

#### Investigate-Chain (callingArchetype: "scholar")

**All Investigate-Chain variants share these properties:**
- Payoff object (tablet, journal, inscription, body with letter) is always placed in dungeon room 1
- Completion requires one Investigation check (DC set by variant, range 12-16)
- No combat required for completion — Scholar can enter, check, leave
- Deeper dungeon exploration is optional (bonus XP if player pushes further)
- Non-Scholar callings: same quest, same DC, but no passive bonuses to the check

**9. `investigate-outbreak`**
- Name pattern: `"Why Are the [CREATURE_PLURAL] Acting Strange?"`
- Quest giver: Healer NPC (concerned — creatures attacking outside normal range/season)
- Payoff: Corrupted altar, alchemical spill, or cursed well inscription in room 1
- World consequence (worldTag: "cleansed"): Creature encounter rate drops 25% in that terrain type for the rest of the run. Log: "The source has been identified. The [CREATURE] should retreat."
- intelQuality: "low" — giver knows creature type and general direction, nothing else
- DC: 12 (easiest — intended as the introductory investigate quest)
- timeLimit: null, competingParty: false

**10. `investigate-disappearance`**
- Name pattern: `"[COUNT] [NPC_TYPE] Vanished on the [ROAD_NAME] Road"`
- Quest giver: Settlement Guard Captain (duty — bodies found but no witnesses)
- Payoff: Ambush evidence (broken arrow, wagon wheel, discarded crest) in dungeon room 1
- Two-stage reward: Report back after check for partial reward (50% XP/gold). Optionally investigate further room for full reward + consequence.
- World consequence (worldTag: "safer"): Road encounter rate drops; a "safe path" notation on that road segment on map (visual — deferred)
- intelQuality: "medium" — giver knows route and general area
- DC: 14
- timeLimit: null, competingParty: false

**11. `investigate-conspiracy`**
- Name pattern: `"The [FACTION_NAME] Are Hiding Something in [DUNGEON_NAME]"`
- Quest giver: Rival Faction NPC (political — wants leverage)
- Payoff: Document or sealed letter in room 1. Evidence item persists in inventory after quest completion.
- Post-completion player choice (NOT automated): player can (a) deliver to quest giver for reward, (b) sell to highest-bidding NPC in next settlement, (c) show to city watch, or (d) destroy it. Different NPC dialogue acknowledges choice on next visit.
- World consequence (worldTag: "disturbed"): Faction relation changes based on what player does with evidence (factionConsequence fires on delivery action, not on quest complete)
- intelQuality: "low" — giver is vague deliberately
- DC: 15, timeLimit: null, competingParty: false
- factionConsequence: `{ factionId: "{targetFaction}", delta: -20 }` — applied when evidence is delivered TO quest giver

**12. `investigate-awakening`**
- Name pattern: `"That [DUNGEON_NAME] Didn't Used to Be Dangerous"`
- Quest giver: Old Farmer or Retired Adventurer (nostalgic — used to pass through safely)
- Payoff: Clue about what changed — broken seal, completed summoning circle, disturbed tomb inscription
- What makes it different: Scholar identifies the trigger and connects it to world gen (the log entry references what world-gen flagged as the dungeon's theme). Other callings see "something changed here." Scholar sees WHY.
- World consequence (worldTag: "disturbed"): Dungeon gains a unique boss variant on next entry — the player created consequences by learning the cause. Log: "Your investigation has disturbed something deeper."
- intelQuality: "none" — giver has no useful information beyond "it used to be fine"
- DC: 16 (hardest investigate — Scholar's class bonuses matter here)
- timeLimit: null, competingParty: false

---

### Procedural Uniqueness — Structural Variables

Beyond name substitution, these variables change what the player actually *does*:

| Variable | How generated | Effect on gameplay |
|---|---|---|
| **Kill-Chief time pressure** | worldGen dungeon flag "activeRaid" (15% chance) | Adds `timeLimit: 3` to warlord/bounty variants even if template says null |
| **Retrieve item location** | `rng.choice(['knownLocation', 'unknown'])` | "known" = giver tells player the room; "unknown" = player checks every room |
| **Investigate complication** | 15% roll at generation time | Adds a second investigate lead in a second nearby dungeon; optional depth |
| **Intel quality override** | Based on giver's NPC relation score | High-relation NPC always gives "high" intel regardless of template default |
| **Elite promotion quality** | Based on dungeon difficulty tier | A promoted elite in a tier-3 dungeon has more HP/damage than tier-1 |

### The Emergent Story Pattern

The world-first architecture allows all 3 quests in a settlement to reference the same dungeon. When this happens (any settlement with only 1 nearby dungeon within range), the player can connect the quests themselves:

> Seed 4471 — Millhaven has one dungeon in range. Board shows: Kill-Chief (Bandit Warlord Gregor, Saltmere Vault), Retrieve-Contraband (Sketchy Merchant, same vault), Investigate-Disappearance (Guard Captain, same road the vault is on).
> 
> Player accepts all three. In room 1: finds the sealed crate (Retrieve done). Finds ambush evidence naming Gregor's crew (Investigate done). Pushes to boss room for Gregor (Kill-Chief done).
> 
> No code authored this connection. The world-first architecture did it.

This is the target player experience. It emerges from correct architecture, not authored scripting.

---

### Scaling Across the Run

| Tier | Kill-Chief | Retrieve-Artifact | Investigate-Chain |
|---|---|---|---|
| **L1-3** | 1 elite mob, direct fight, no puzzle. Difficulty badge is accurate. | Item near dungeon entrance, known or unknown location, no competing party. | 1 check in room 1, DC 12-13, single outcome. Scholar trivially completes. |
| **L4-7** | 2-phase fight (guards first, chief second). Chief has 1 unique combat ability. | Competing party possible (20%). Relic variant proximity hint active. | 2-dungeon chain with optional second location. Evidence choices matter. |
| **L8-10** | Multi-stage dungeon. Chief may retreat — pursuit through second room. Named death affects faction state. | Item has active properties — buff or curse until delivered. Delivering to wrong NPC has consequences the player now knows enough to navigate. | 3-stage chain. Scholar gets unique lore payoff that recontextualises earlier world events. Awakening variant triggers unique boss on next dungeon entry. |

---

## Phase 7 — worldTag Write Path

**File:** `src/systems/QuestManager.js`

In `completeQuest()`, after rewards are applied:

```javascript
if (quest.worldTag && quest.dungeonHookId) {
    const [x, y] = quest.dungeonHookId.split(',').map(Number);
    const modifiedTiles = gameState.get('world.modifiedTiles') || [];
    modifiedTiles.push({ x, y, tag: quest.worldTag, timestamp: Date.now() });
    gameState.set('world.modifiedTiles', modifiedTiles);
}
```

**Read path (deferred):** `MapRenderer` visual override for tagged tiles is a future frontend task. No rendering change needed to ship the core quest loop.

---

## Phase 8 — Quest Log UI + Quest Board

**Files:** `src/main.js`, `index.html`, `styles.css`

### 8a. Quest Board (settlement UI — when player enters)

The board shows 3 quest cards. Information visible BEFORE accepting:

| Field | Visible | Notes |
|---|---|---|
| Quest name | ✅ | With procedural nouns filled |
| Quest type | ✅ | CallingArchetype badge (hint, not gate) |
| One-line description | ✅ | From template, nouns filled |
| Reward | ✅ | XP + gold only. Magic items never shown upfront. |
| Difficulty badge | ✅ | Easy/Normal/Hard/Deadly based on target CR vs player level |
| Dungeon distance | ✅ for Retrieve/Kill | Shown in tiles: "63 tiles east" |
| Time limit warning | ✅ if present | "⚠ Time-sensitive" shown on board card |
| Intel quality | ❌ | Discovered by talking to quest giver |
| Competing party | ❌ | Hidden — discovered on dungeon entry |
| Giver's motivation | ❌ | Discovered in dialogue |

**Example board text (render exactly this format):**

```
┌─────────────────────────────────────────┐
│ [DEDICATION]  ⚔ HARD                   │
│ End Bandit Warlord Gregor               │
│ of Saltmere Vault                       │
│ Saltmere's guilds are funding this.     │
│ Gregor's bled the road for two seasons. │
│ 340 XP | 85 gold          63 tiles →   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ [WANDERLUST]  🎒 NORMAL                 │
│ Don't Ask What It Is —                  │
│ Just Bring It Back                      │
│ Serafine won't say what's in the crate. │
│ She says it's hers. She's paying well.  │
│ 280 XP | 120 gold  ⚠ Faction risk      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ [SCHOLAR]  🔍 EASY                      │
│ Why Are the Wolves Running South?       │
│                                         │
│ Tomas has farmed this valley 30 years.  │
│ Wolves don't run south in autumn.       │
│ 180 XP | 40 gold      + terrain bonus  │
└─────────────────────────────────────────┘
```

CallingArchetype badge colours: Dedication=`#c0392b` (red), Wanderlust=`#16a085` (teal), Scholar=`#8e44ad` (purple). These are hints, not gates — all callings see all quests.

### 8b. Quest Log (`renderQuestLog()`)

`renderQuestLog()` is currently an empty stub. Implement:

- **Active tab:** Quest cards with name, type badge, objective progress bar, difficulty badge, dungeon name if applicable, "Track" button
- **Completed tab:** Summary cards showing name, reward received, worldTag consequence if any
- **Failed tab:** Summary cards with failure reason

Each active quest card shows:
- Quest name and one-line description
- Objective progress: `[████░░] 2/5 Goblins killed` or `[░░░░░░] Item not yet found`
- Intel revealed by giver (shown after accepting): e.g. "Gregor lairs in Saltmere Vault, 63 tiles east"
- Time limit countdown if present: `⚠ 2 rooms remaining`
- Abandon button (with relation penalty warning)

### 8c. Intel dialogue display

When player talks to quest giver AFTER accepting, show the `intelDialogue[quest.intelQuality]` text as an additional NPC dialogue line. This is the only place `intelQuality` is visible to the player — not on the board, not in the quest log.

---

## Deferred (Do Not Implement Now)

| Feature | Reason | Future hook |
|---|---|---|
| `worldTag` read path / visual | No rendering infrastructure | `world.modifiedTiles` written; frontend task later |
| `timeLimit` dungeon enforcement | `advanceRoom()` check is 1 line but needs DungeonManager room system confirmed | `quest.timeLimit` field is in schema; wire in Phase 4 follow-up |
| `competingParty` live actor | Out of scope; implement as probabilistic item-removal | `quest.competingParty` field in schema; probability check in `_injectQuestBind()` |
| Scholar room-1 payoff object | Needs DungeonManager room layout system | `investigate-*` templates have `payoffRoom: 1` stub field |
| `namedBossId` final-room injection | DungeonManager final room system not confirmed | `questHook.namedBossId` stubbed; wire when DungeonManager boss system built |
| Cross-settlement deliver quests | NPC state tracking across settlements | Template field `targetSettlementId` can be added when ready |
| `factionConsequence` wiring | Faction system not yet implemented | Field present on templates; `completeQuest()` logs it but doesn't apply |
| Quest log `intelDialogue` display | Depends on Phase 8 UI | `intelQuality` and `intelDialogue` in data; UI reads at render time |

---

## Known Risks During Implementation

| Risk | Mitigation |
|---|---|
| `worldGenerator.worldMetadata` reference diverges after load | `_writeQuestBind()` re-syncs via `window.game.worldGenerator.worldMetadata = metadata` |
| `questBind` lost via region restore | `DungeonManager` reads from `world.metadata` by coordinate — never from region feature object |
| RULES.quests breaking rename | Grep `questsPerSettlement` before landing — delete local `questCounts` in QuestGenerator |
| `eval()` in reward formula calculation | Known issue; safe for now, replace with safe parser when faction/reputation rewards added |
| Pruning system interaction | ✅ **Confirmed safe** — architect review complete. `world.metadata` survives save/load intact. `regenerateAndMerge()` and `restoreSettlementData()` never touch `world.metadata`. No changes needed to prune/restore system. |

---

## DA Risk Register — Consequence & Difficulty System
**Review date:** 2026-05-05  **Reviewer:** devils-advocate (post game-designer + architect chain)

### Critical Blockers (must fix before implementing ConsequenceManager)

**1. Global visit counter miscalibrates all timed consequences**
- **Problem:** Player triggers Vengeance (window 2–4). Visits two other villages to buy rations. Vengeance expires without them returning to the source. Attention (1–2 visits) fires only if player returns immediately — punishes players who do the right thing (go straight back) and rewards wandering.
- **Fix:** Split the clock. Keep `world.visitCount` global for display/logging. Add `settlement.localVisitCount` per-settlement, incremented only on `enterSettlement(thatSettlement)`. Vengeance, Attention, and Reputation Bleed use local counter. Unintended Consequence and Escalation can remain global.
- **Schema change:** `settlement.localVisitCount: number` (init 0). `processPendingEvents` routes to local or global count based on `RULES.consequences.visitWindows[eventType].useLocalCounter`.

**2. Silent competing-party failure destroys quest trust**
- **Problem:** Player accepts Retrieve quest, fights through dungeon, reaches final room — item is gone. No explanation. Player cannot distinguish quest bug from intended mechanic. Will assume the game is broken.
- **Fix (three parts):**
  1. Move the 20% flag check to dungeon ENTRY, not item-find. On entry: if flag set, add journal entry "Signs suggest another group reached this location before you."
  2. Breadcrumb in final room: room description reads "recently disturbed, signs of another group."
  3. Auto-fail path: if player enters dungeon with competing-party flag set, update quest to `status: 'contested'`. On exit, offer partial reward (50% XP, 0 gold) for the attempt.
- **DO NOT implement competing-party mechanic without these three parts.** A mechanic that produces silent failure is worse than no mechanic.

**3. Resolution verbs have no semantic constraints**
- **Problem:** `resolveFlag(settlement, 'vendetta_active', 'Cleanse')` is semantically wrong (you don't cleanse a vendetta). `resolveFlag(settlement, 'cursed', 'Outlast')` is impossible (escalation is permanent). UI will surface invalid verbs per flag type, confusing players.
- **Fix:** Add `validVerbs: ['Confront', 'Negotiate']` field to each flag definition in `RULES.consequences.flagTypes`. `resolveFlag()` checks this before dispatching. UI only surfaces valid verbs.
- **Example mapping:**
  - `vendetta_active` → `['Confront', 'Negotiate']`
  - `cursed` → `['Cleanse', 'Confront']`
  - `disease_spreading` → `['Cleanse', 'Outlast']`
  - `watch_suspicious` → `['Negotiate', 'Outlast']`
  - `settlement_sacked` → `['Cleanse']`

### Secondary Concerns (non-blocking, add to implementation checklist)

| Issue | Risk | Fix |
|---|---|---|
| Save/load double-fire | On reload at a visit boundary, `processPendingEvents` may re-fire an already-triggered event | Add `isProcessed: boolean` to event object; check before triggering, set after |
| Difficulty badge staleness | Badge computed at quest-accept time goes stale if player levels up before reaching dungeon | `getTierBadge(dungeon, player.level)` must be a runtime calculation at render time — never store the badge string |
| Sack mechanical payload undefined | `settlement_sacked` flag exists but the system doesn't define what it disables (quests? NPCs? merchants?) | Define before implementing ConsequenceManager. Recommend: sacked = quest board empty + merchant inventory locked until Cleansed |
| Nearest settlement ambiguity for timed-quest failure | "Nearest settlement" at failure time may be unvisited, unknown, or in a pruned region | Precompute and store `consequenceSettlementId` on the quest at generation time (same pattern as `questBind`) |

### Decisions Unlocked by DA Review

These were design-open questions that the DA review has resolved:

| Decision | Resolution |
|---|---|
| Global vs local visit counter | **Local** for Vengeance/Attention/Reputation Bleed; global for Unintended Consequence/Escalation |
| Competing party mechanic | **Deferred** until breadcrumb + journal + partial reward are authored. Do not ship as silent failure. |
| Valid verbs per consequence type | **Must be data-driven** — `validVerbs[]` field in RULES.consequences. Not a code check. |
| Sack payload | **Define before code** — quest board + merchant lock recommended. Reversible via Cleanse. |

---

## Implementation Order

```
Phase 5 (bug fixes) → Phase 1 (WorldGenerator hooks) → Phase 2 (QuestGenerator)
→ Phase 3 (SettlementManager questBind) → Phase 4 (DungeonManager injection)
→ Phase 6 (quest template data) → Phase 7 (worldTag write) → Phase 8 (UI)
```

Phases 5, 6, and 8 can be worked concurrently by different developers once Phase 1 is complete.

---

## Related Docs
- `docs/plans/2026-05-03-quest-system-redesign.md` — locked decisions and DA risk register  
- `docs/plans/2026-04-29-npc-conversational-skill-challenges.md` — NPC challenge wiring (parallel track)  
- `docs/plans/2026-03-09-party-system-amendments.md` — party system (affects encounter CR when party implemented)
