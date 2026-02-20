# NPC Relations System — Design Document

**Date:** 2026-02-19
**Status:** Approved
**Branch:** `main-beta-quests`

---

## Overview

Implement an NPC relations system that tracks personal disposition between the player and each NPC on a -100 to +100 scale. Relations are influenced by quest completion, dialogue skill checks, trading, faction standing, and campaign defaults. In turn, relations gate quest availability, affect merchant pricing, and drive dialogue tone — making every NPC interaction feel personal and consequential.

This design also includes dungeon enrichment (names, themes, creature types generated at world creation time) and a dialogue variety system (static pools + dynamic world-aware templates) to support contextual, truthful NPC chatter.

---

## 1. Relation Score

### Scale
- **-100 to +100** integer score per NPC
- Stored on each NPC object as `npc.relations.score`
- Never stores faction modifier — that's calculated at runtime

### Starting Score
- Default: `0` (defined in `data/relations.json` → `defaults.startingScore`)
- Overridable per campaign in `data/campaigns.json` → `featureGeneration.startingRelation`
- Campaign inheritance applies (e.g., `defeatLichKing` inherits from `nexus-verge` inherits from `core`)

### Effective Relation
Calculated at runtime, never persisted:
```
effectiveRelation = clamp(npc.relations.score + factionModifier, -100, 100)
```
Faction modifier is derived from the player's standing with the NPC's faction (when faction system is implemented), scaled via `relations.json` config.

### History
Each NPC tracks recent relation changes:
```javascript
npc.relations.history = [
    { type: "questCompleteForNPC", points: +15, timestamp: 1234567890 },
    { type: "dialogueSkillCheckFail", points: -8, timestamp: 1234567900 }
]
```
Capped at `defaults.historyMaxLength` (20) entries. Enables tooltip showing why an NPC likes/dislikes you.

---

## 2. Relation Tiers

| Range | Tier ID | Label | Color | Effect Summary |
|---|---|---|---|---|
| -100 to -51 | `hostile` | Hostile | `#ff3333` | Refuses speech, no trading, no quests |
| -50 to -21 | `unfriendly` | Unfriendly | `#ff8844` | Minimal dialogue, no quests (except great hall), heavy markup |
| -20 to -1 | `wary` | Wary | `#ccaa44` | Basic dialogue, no quests, slight markup |
| 0 to 19 | `neutral` | Neutral | `#aaaaaa` | Normal dialogue, no quests, normal prices |
| 20 to 39 | `friendly` | Friendly | `#44bb44` | Opens up, offers quests, slight discount |
| 40 to 69 | `trusted` | Trusted | `#4488ff` | Better quests/rewards, good discounts |
| 70 to 100 | `allied` | Allied | `#aa44ff` | Best prices, exclusive content, unique dialogue |

All tier boundaries defined in `data/relations.json` — not hardcoded.

---

## 3. Relation Modifiers

All point values defined in `data/relations.json` → `modifiers` section. Code references modifier keys, never raw numbers.

### Positive Modifiers
| Key | Points | Description |
|---|---|---|
| `questCompleteForNPC` | +10 to +20 | Completed a quest for this specific NPC |
| `questCompleteInSettlement` | +3 to +5 | Completed a quest for any NPC in same settlement |
| `dialogueSkillCheckPass` | +5 to +10 | Passed a skill check in dialogue |
| `successfulTrade` | +1 | Completed a buy or sell transaction |

### Negative Modifiers
| Key | Points | Description |
|---|---|---|
| `dialogueSkillCheckFail` | -5 to -10 | Failed a skill check in dialogue |
| `questAbandoned` | -10 | Abandoned a quest from this NPC |
| `questFailed` | -10 | Failed a quest from this NPC |

### Faction Modifier (Passive Overlay)
- Max bonus: +15, max penalty: -15
- Scaling: `factionScore * scalingPerPoint` (0.15 per point)
- Applied at runtime, never stored on NPC
- Config in `relations.json` → `factionModifier`

---

## 4. Content Gating

### Quest Availability
- **Standard NPCs:** Require tier `friendly` (+20) or above to offer quests
- **Great Hall exception:** Town leaders/great hall NPCs offer quests at any tier EXCEPT `hostile` (-51 and below)
- Both thresholds defined in `relations.json` → `thresholds.questMinimumTier` and `thresholds.greatHallQuestMinimumTier`

### Trading
- **Hostile tier:** Trading blocked entirely (`buyMultiplier: 0`, `sellMultiplier: 0`)
- **All other tiers:** Trading available with tier-based multipliers

### Dialogue
- **Hostile tier:** NPC refuses to speak (only hostile dismissal lines)
- **All other tiers:** Full dialogue available, tone varies by tier

---

## 5. Merchant Pricing

### Formula (No Double Counting)
Replaces current raw CHA modifier system. Two independent factors:

**Tier multiplier** (from relation disposition):
```
tierBuyMultiplier  = pricingByTier[tier].buyMultiplier   // e.g., 0.95 for friendly
tierSellMultiplier = pricingByTier[tier].sellMultiplier  // e.g., 0.55 for friendly
```

**Influence skill modifier** (from character skill proficiency):
```
influenceMod   = character.getSkillModifier('influence')  // ability mod + proficiency if proficient
influenceEffect = influenceMod * influencePercentPerPoint  // 1% per point, configurable
```

**Final prices:**
```
buyPrice  = basePrice * tierBuyMultiplier * (1.0 - influenceEffect)
sellPrice = basePrice * tierSellMultiplier * (1.0 + influenceEffect)
```

Relation tier handles *how much the NPC likes you*. Influence handles *how good you are at negotiating*. Separate concerns, multiplicative stacking, no overlap.

### Pricing Table
| Tier | Buy Multiplier | Sell Multiplier |
|---|---|---|
| hostile | 0 (blocked) | 0 (blocked) |
| unfriendly | 1.15 | 0.35 |
| wary | 1.05 | 0.42 |
| neutral | 1.00 | 0.50 |
| friendly | 0.95 | 0.55 |
| trusted | 0.88 | 0.62 |
| allied | 0.80 | 0.70 |

---

## 6. Dialogue Tone System

### Tone Mapping
Each relation tier maps to a dialogue tone in `relations.json` → `dialogueToneByTier`:

| Tier | Tone |
|---|---|
| hostile | `hostile` |
| unfriendly | `cold` |
| wary | `guarded` |
| neutral | `neutral` |
| friendly | `warm` |
| trusted | `affable` |
| allied | `devoted` |

### Dialogue Template Lookup
Extended from `greetings[role][personality]` to `greetings[role][personality][tone]`:
```json
{
    "greetings": {
        "innkeeper": {
            "friendly": {
                "hostile": ["Get out of my tavern. Now."],
                "neutral": ["Welcome, traveler. What can I get you?"],
                "warm": ["Good to see you again, friend! The usual?"],
                "devoted": ["You honour us! Anything you need, just say the word."]
            }
        }
    }
}
```
Fallback chain: specific tone → `"neutral"` tone → flat personality array (backwards compat).

### Dialogue Pools (Variety System)
To prevent repetitive dialogue, NPCs draw from multiple pools:

**Static pools** (pre-written in `dialogueTemplates.json`):
- **Tone lines** — 15-20+ per tone, generic disposition lines
- **Role lines** — 10-15+ per role, role-specific chatter
- **Personality lines** — 10-15+ per personality type
- **Filler lines** — 30+ universal small talk anyone could say

**Dynamic templates** (generated at runtime from world data):
- Query nearby features within configurable scan radius
- Only reference things that actually exist in the generated world
- Template examples:
  - `"I heard {dungeonName} to the {direction} is full of {creatureType}."`
  - `"Trade's been good with {settlementName} to the {direction}."`
  - `"Watch yourself in the {terrainType} to the {direction}."`
  - `"You're the one who cleared out {dungeonName}, aren't you?"` (completed quest reference)

**Selection algorithm:** Each interaction pulls 2-3 lines from weighted mix: heavy on tone + role, sprinkled with personality/world/filler. Two NPCs with same role and personality still feel distinct due to different world context and random pool draws.

---

## 7. Dungeon Enrichment

### Problem
Dungeons currently store only `type`, `x`, `y`, `difficulty`, `explored`. No name, no creatures. Dynamic dialogue needs this data.

### Solution
Enrich dungeons at generation time in `WorldGenerator.js`. New dungeon feature structure:
```javascript
{
    type: 'dungeon',
    x: 42, y: 17,
    difficulty: 3,
    explored: false,
    // NEW fields:
    name: "The Whispering Crypt",
    theme: "tomb",
    creatureType: "undead",
    dominantCreatures: ["skeleton", "zombie", "ghoul"]
}
```

### Dungeon Themes
All defined in `data/dungeons.json`. Each theme includes:
- `id` — Theme key (e.g., `"tomb"`)
- `creatureType` — Category label for dialogue (e.g., `"undead"`)
- `creatures` — Pools by difficulty tier (keys: `"1"`, `"2"`, `"3"`, `"5"`)
- `namePatterns` — Template strings (e.g., `"The {adjective} {noun}"`)
- `adjectives`, `nouns`, `concepts` — Word pools for name generation

### Themes

| Theme | Creature Type | Signature Biomes |
|---|---|---|
| `tomb` | undead | desert, swamp, mountain |
| `warren` | goblinoid | grassland, hills, forest |
| `beast_lair` | beasts | savanna, jungle, tundra |
| `bandit` | humanoid | plains, grassland, beach |
| `cult` | fiend/aberration | swamp, jungle, desert |
| `fey_grove` | fey | forest, denseForest, jungle |
| `frost_hold` | cold creatures | tundra, snowyPlains |
| `dragon_den` | draconic | mountain |

### Terrain-to-Theme Weights
Defined in `data/dungeons.json` → `terrainThemeWeights`. Every spawnable biome has weights:

```json
{
    "grassland":    { "bandit": 0.30, "warren": 0.25, "beast_lair": 0.25, "tomb": 0.20 },
    "plains":       { "bandit": 0.35, "warren": 0.25, "beast_lair": 0.20, "tomb": 0.20 },
    "forest":       { "warren": 0.25, "beast_lair": 0.25, "fey_grove": 0.25, "bandit": 0.25 },
    "denseForest":  { "beast_lair": 0.30, "fey_grove": 0.30, "warren": 0.25, "cult": 0.15 },
    "mountain":     { "tomb": 0.25, "dragon_den": 0.20, "warren": 0.20, "beast_lair": 0.20, "bandit": 0.15 },
    "hills":        { "bandit": 0.30, "warren": 0.25, "tomb": 0.25, "beast_lair": 0.20 },
    "swamp":        { "tomb": 0.30, "cult": 0.25, "beast_lair": 0.25, "warren": 0.20 },
    "desert":       { "tomb": 0.35, "cult": 0.25, "beast_lair": 0.20, "bandit": 0.20 },
    "tundra":       { "frost_hold": 0.30, "beast_lair": 0.30, "tomb": 0.25, "bandit": 0.15 },
    "snowyPlains":  { "frost_hold": 0.35, "beast_lair": 0.25, "tomb": 0.25, "bandit": 0.15 },
    "jungle":       { "beast_lair": 0.25, "cult": 0.25, "fey_grove": 0.20, "tomb": 0.20, "warren": 0.10 },
    "savanna":      { "beast_lair": 0.35, "bandit": 0.25, "tomb": 0.20, "warren": 0.20 },
    "beach":        { "bandit": 0.35, "beast_lair": 0.25, "tomb": 0.25, "cult": 0.15 }
}
```

---

## 8. RelationManager API

New file: `src/systems/RelationManager.js`

```javascript
class RelationManager {
    // Setup
    async init(campaignId)

    // Score management
    getRelation(npc)                          // → { score, effectiveScore, tier, tierLabel, color }
    modifyRelation(npc, modifierKey, options)  // Apply change, record history
    getHistory(npc)                           // → recent changes array

    // Queries
    canOfferQuest(npc)        // tier >= questMinimumTier OR great hall exception (not hostile)
    canTrade(npc)             // tier !== hostile
    canSpeak(npc)             // tier !== hostile
    getDialogueTone(npc)      // → tone string for template lookup

    // Pricing
    calculateBuyPrice(item, npc, character)   // Tier multiplier + Influence modifier
    calculateSellPrice(item, npc, character)  // Tier multiplier + Influence modifier
}
```

---

## 9. DialogueManager API

New file: `src/systems/DialogueManager.js`

```javascript
class DialogueManager {
    async init()

    // Get contextual dialogue lines for an NPC interaction
    getGreeting(npc, tone)                    // → greeting string
    getFlavorLines(npc, tone, count)           // → array of mixed pool lines
    getDynamicLines(npc, settlement, world)    // → array of world-aware lines

    // Utility
    getDirection(fromX, fromY, toX, toY)      // → compass string
    getDistanceLabel(fromX, fromY, toX, toY)  // → "nearby" / "a day's travel" / "far"
    scanNearbyFeatures(settlement, world, radius) // → { dungeons, settlements, terrain }
}
```

---

## 10. File Changes Summary

### New Files
| File | Purpose |
|---|---|
| `data/relations.json` | Tiers, thresholds, modifiers, pricing, dialogue tones, faction config |
| `data/dungeons.json` | Themes, creature pools, name templates, terrain weights |
| `src/systems/RelationManager.js` | Relation scoring, tier resolution, pricing, gating queries |
| `src/systems/DialogueManager.js` | Static pools + dynamic world-aware dialogue generation |

### Modified Files
| File | Change |
|---|---|
| `src/systems/MerchantManager.js` | Replace CHA pricing with RelationManager (tier + Influence) |
| `src/systems/NPCGenerator.js` | Add `relations: { score, history }` to NPC objects |
| `src/systems/WorldGenerator.js` | Enrich dungeons at generation (name, theme, creatures) |
| `src/systems/QuestManager.js` | Call RelationManager on quest complete/fail/abandon |
| `src/ui/SettlementUI.js` | Use RelationManager for quest gating, tone lookup, trade checks |
| `src/main.js` | Initialize RelationManager + DialogueManager, wire skill checks |
| `data/campaigns.json` | Add `startingRelation` override per campaign |
| `data/dialogueTemplates.json` | Expand with tone-keyed variants + static pools + dynamic templates |

### Architectural Commitments
- All numeric values in JSON data files, never hardcoded in source
- Faction modifier is a runtime overlay, never baked into stored score
- Dungeon enrichment at generation time, persists with feature object
- Dialogue falls back gracefully if tone variants missing
- Campaign inheritance applies to `startingRelation`
- Influence skill (not raw CHA) for merchant pricing negotiation bonus

---

## 11. Roadmap Items (Not In This Implementation)

### Alignment System
D&D 5e alignment (Lawful Good → Chaotic Evil) to be added as:
- Character creation choice (9 alignments)
- NPC alignment generated procedurally
- Alignment influences dialogue options and quest availability
- Alignment shifts based on player actions
- Connected to faction relationships

### Town/City Reputation
Settlement-wide reputation (separate from individual NPC relations):
- Aggregate of NPC relations + quest completion + faction standing
- Gates settlement-level features (access to restricted areas, leadership quests)
- Can trigger settlement-wide events (welcome feast, bounty on player)

### Faction System (Full)
- Faction membership and ranks
- Faction-specific quests and rewards
- Inter-faction conflicts affecting NPC relations
- Faction reputation decay over time
