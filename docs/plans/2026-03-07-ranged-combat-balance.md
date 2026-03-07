# Ranged Combat Balance Plan
**Date:** 2026-03-07
**Status:** Design approved, pending implementation
**Authors:** Game Designer + Devil's Advocate review

---

## Problem Statement

Ranged builds currently have no meaningful constraints:

1. **No ammo pressure** — infinite arrows/bolts, no resource management
2. **No melee pressure in combat** — PHB point-blank (within 5 feet = disadvantage) doesn't exist; non-grid means you're always "adjacent" from turn 1, making direct implementation a build-breaker
3. **Cover is asymmetric** — the enemy roster is ~70% pure melee; adding ranged disadvantage in forest terrain would primarily punish the *player's* ranged attacks while melee enemies are unaffected
4. **Full cover bricks ranged-only builds** — if cover terrain can block ranged attacks entirely and a player has only a ranged weapon equipped, they have no attack option

The root cause of #3 is enemy composition, not missing mechanics. Fix the roster first; then cover becomes symmetric.

---

## Current Enemy Roster (Attack Type Audit)

| CR | Pure Melee | Both | Pure Ranged |
|---|---|---|---|
| 0–0.5 | Goblin, Wolf, Giant Rat, Orc, Gnoll, Shadow, Zombie | Skeleton, Kobold, Bandit, Scout | — |
| 1–2 | Bugbear, Giant Spider, Dire Wolf, Ghoul, Specter, Berserker, Gargoyle | Spy, Ogre | — |
| 3–4 | Minotaur, Owlbear | Wight, Veteran | Flameskull |
| 5–6 | Troll, Wraith | Hill Giant, Young White Dragon | — |
| 7–10 | — | Young Green Dragon, Young Red Dragon | — |

**Gap identified:** No primarily-ranged enemies at CR 3–7 (levels 5–10). The Flameskull is the only pure ranged enemy in the entire roster.

---

## Phase 1 — Enemy Roster Expansion (Root Cause Fix)

Add enemies that actively stay at range and force melee builds to close the gap under fire. This creates organic pressure on melee *and* gives cover terrain symmetric meaning.

### New Enemies

**Low bracket (CR 0.25–0.5, levels 1–3):**

| Enemy | CR | Attack | Notes |
|---|---|---|---|
| Goblin Archer | 0.25 | Shortbow 1d6+2 | Pure ranged; uses Nimble Escape to maintain distance |
| Bandit Crossbowman | 0.125 | Light crossbow 1d8+1 | Pure ranged; hunkers at range, no melee fallback |

**Mid bracket (CR 3, levels 5–7):**

| Enemy | CR | Attack | Notes |
|---|---|---|---|
| Manticore | 3 | Tail Spikes ×3 (1d8+2 each, ranged) | Primarily ranged; only enters melee if cornered — creates "kite danger" |

**Upper bracket (CR 6–7, levels 7–10):**

| Enemy | CR | Attack | Notes |
|---|---|---|---|
| Mage | 6 | Fire Bolt cantrip (2d10, ranged); Fireball, Lightning Bolt | Pure caster = pure ranged threat |
| Medusa | 6 | Longbow (1d8+3, ranged) + Petrifying Gaze (ranged condition) | Unique upper-level ranged threat with debuff application |

### AI Flag
Add `"preferRanged": true` flag to purely ranged enemies in `monsters.json`. The AI uses this to avoid closing to melee range when they have a ranged attack available. Implementation in `CombatManager.js` enemy AI turn logic.

---

## Phase 2 — Ammunition System

The cleanest and most meaningful ranged constraint. Applies symmetrically to player and enemy ranged builds. No balance asymmetry risk.

### Weapon Capacity
Add `ammoCapacity` field to ranged weapon definitions in `items.json` (this is the max/default — distinct from the runtime `ammoCount` stored on the equipped item instance in `character.equipment`):

| Weapon | ammoCapacity |
|---|---|
| Longbow | 20 |
| Shortbow | 20 |
| Light crossbow | 15 |
| Hand crossbow | 15 |
| Heavy crossbow | 10 (slow reload — lower max) |

**Schema separation (per architect review):**
- `items.json` definition: `"ammoCapacity": 20` — maximum/default ammo count, static
- Runtime state on `character.equipment.mainHand`: `"ammoCount": 14` — current charges, serialized with character

### Mechanics
- Each ranged attack consumes 1 charge from `ammoCount` on the equipped weapon instance
- At 0 charges: improvised throw available (see Phase 4 fallback)
- **With Forgecraft practice:** Full ammo refill to `ammoCapacity` during long rest (you craft arrows/bolts from materials gathered during travel)
- **Without Forgecraft practice:** No long rest refill; ammo must be purchased at merchants or found in loot drops
- Short rests do NOT refill ammo regardless of practice
- **Quiver** added as an inventory item: stackable, restores 20 charges (up to `ammoCapacity`) to equipped ranged weapon on use, sold at merchants, found in dungeon loot

### Forgecraft Integration
Forgecraft's description already covers expert equipment maintenance. Fletching arrows and packing bolts during a long rest is a natural extension. No new practice required — gate the refill behind `character.practices.includes('forgecraft')`.

This makes Forgecraft meaningfully more attractive to ranged builds: without it, they are supply-dependent on towns and loot.

---

## Phase 3 — Harried Condition (Non-Grid Point-Blank Equivalent)

PHB point-blank (within 5 feet = disadvantage) cannot be ported directly to non-grid combat. In card-based combat with no positioning, the player is effectively "within 5 feet" of all enemies from turn 1. Applying it constantly from round 1 would make ranged builds non-viable rather than balanced.

### The Harried Condition

> **Harried:** When a melee attacker successfully hits you, you gain Harried until the start of your next turn. While Harried, your ranged attacks have disadvantage.

**Key distinction from point-blank:** Harried is *earned by an enemy success*, not by proximity. This means:

- Enemy wins initiative and hits → player is Harried on their turn
- Player wins initiative → shoots freely first, then becomes Harried if hit
- Player uses Dodge action → prevents hits → prevents Harried → clean ranged attacks next turn
- Multiple melee hits in one round → still only one Harried condition (no stacking)

**Why this works in non-grid:**
- Thematically: "You can't aim properly while actively fending off a sword" — not about distance
- Tactically: Dodge action becomes a genuine tool for ranged builds (not just stalling)
- Initiative matters: higher DEX → shoot before being Harried → meaningful build investment
- Short fights (2–3 rounds): creates real tension rather than guaranteed round-1 penalty

### Implementation
Uses the existing conditions framework (same pattern as Slow, Sap, Dodge, Prone):

```javascript
// Applied in CombatManager.attack() when a melee attack hits
// appliedBy = defender.id — CRITICAL: cleanup loop fires at START OF DEFENDER'S OWN TURN
// The turn-start cleanup in CombatManager iterates combatants, finds conditions where
// c.appliedBy === currentCombatant.id on OTHER combatants, and removes them.
// Using defender.id as appliedBy means the condition is removed when the defender's
// turn arrives — exactly when "until start of your next turn" should expire.
if (!isRanged && attackTotal >= defender.ac) {
    defender.addCondition('harried', 'untilStartOfTurn', defender.id, {
        value: null,
        isBuff: false,
        curable: false,
        icon: '🎯'
    });
    gameState.addMessage(`⚔️ ${defender.name} is harried! Ranged attacks have disadvantage! 🎯`, 'warning');
    if (window.game) window.game.showFloatingCombatText(defender.id, 'HARRIED! 🎯', 'condition');
}
```

Ranged disadvantage check — add to the existing advantage/disadvantage block in `attack()`:
```javascript
// Harried: ranged attacks by this combatant have disadvantage
if (isRanged && attacker.hasCondition('harried')) {
    hasDisadvantage = true;
    gameState.addMessage(`⚔️ ${attacker.name} has disadvantage (Harried)! 🎯`, 'warning');
}
```

**Cleanup note:** The existing `untilStartOfTurn` cleanup loop already handles this correctly — no new cleanup code needed. The loop runs at the start of each combatant's turn, scans all other combatants for conditions where `appliedBy === currentCombatant.id`, and removes them. Because `appliedBy = defender.id`, Harried is removed at the start of the defender's own next turn.

**No-stacking:** `addCondition` already returns `false` if the condition exists — multiple melee hits in one round will not stack Harried.

---

## Phase 4 — Cover System (Deferred Until Phase 1 Complete)

`coverType` data already exists in `terrains.json`. Do not implement until Phase 1 ships — without ranged enemies, cover terrain only nerfs the player's ranged attacks while melee enemies are unaffected.

### Cover Combat Effects

| `coverType` | Combat Effect |
|---|---|
| `null` | No modifier |
| `"half"` | Ranged attacks have disadvantage (both sides) |
| `"threeQuarters"` | Ranged disadvantage + all combatants get +2 AC |
| `"full"` | **Treated as threeQuarters in combat** (see below) |

### Full Cover Cap

Full cover terrain (cave entrance, dungeon wall) is an absolute concept for *pre-combat* hiding and stealth skill challenges. In active combat, full cover is capped at three-quarters effects.

**Rationale:** Once combat is initiated, combatants are moving and aware of each other. Full cover assumes a static, hidden position — incompatible with active fighting. In a cave entrance, you're not behind an impenetrable barrier; you're in very heavy cover.

This is also necessary to prevent build-bricking (see below).

### Resolving the Full Cover Build-Brick Problem

Even with full cover capped at 3/4, a ranged-only build in heavy cover terrain will suffer consistent disadvantage. The solution is a universal fallback that is always available regardless of equipped weapon:

**Improvised Strike:** Always available as a combat action.

- Label: `"Strike with your {weapon}"` (e.g., "Strike with Longbow")
- Damage: 1d4 bludgeoning
- Attack roll: STR modifier, no proficiency bonus
- No weapon mastery applies
- This is PHB RAW: any object can be used as an improvised weapon for 1d4 damage

**Result:**
- Ranged-only player in full/3/4 cover terrain → can shoot at disadvantage (ranged) OR improvised strike (no disadvantage, just weak)
- Never completely bricked — just in a suboptimal situation
- Communicates a design signal: "carry a backup melee weapon, or take Forgecraft for supply autonomy"

The improvised strike should be available as a universal action in combat regardless of cover — it's a quality-of-life catch-all, not a cover-specific mechanic.

---

## What Is Explicitly NOT Being Done

| Mechanic | Reason |
|---|---|
| PHB point-blank (proximity-based disadvantage) | No grid — you're always within 5 feet from turn 1. Replaced by Harried. |
| Melee penalties in cover terrain | Melee ignores cover. This is their natural compensation for closing gap under fire. |
| Permanent ammo depletion across sessions | Too punishing. Quiver items + forgecraft refill creates pressure without frustration. |
| Double disadvantage stacking | 5e doesn't have it. Harried + cover = still just disadvantage. |

---

## Implementation Sequence

```
Phase 1  →  Enemy data (monsters.json) + preferRanged AI flag
             Parallel: No code dependencies, pure data work

Phase 2  →  Ammunition system (items.json capacity field, ammoCount tracking,
             quiver item, forgecraft gate)
             Parallel with Phase 3: independent systems

Phase 3  →  Harried condition (CombatManager.attack() + conditions system)
             Low lift: piggybacks on existing conditions infrastructure

             [Playtest Phase 1–3 before continuing]

Phase 4  →  Cover terrain combat effects (CombatManager.startCombat() reads
             player terrain from gameState, applies battlefield condition)
             + Universal improvised strike action
             Defer until ranged enemies confirmed working in wild
```

---

## Balance Summary

| Build | Before | After |
|---|---|---|
| Ranged vs melee enemies | Free attacks every turn, no cost | Harried after being hit; ammo pressure mid-dungeon |
| Ranged vs ranged enemies | Symmetric but rare | Now common enough to matter; cover affects both sides |
| Melee vs ranged enemies | Closes gap freely | Must advance under fire from new ranged enemy types |
| Melee vs melee enemies | Unchanged | Unchanged — melee-vs-melee is already working |
| Ranged in forest (cover) | No effect | Disadvantage on ranged attacks (both sides) |
| Ranged in cave (full cover) | No effect | 3/4 cover effects; improvised strike as fallback |
| Ranged with Forgecraft | Infinite ammo anyway | Infinite ammo via long rest crafting — meaningful practice benefit |
| Ranged without Forgecraft | Infinite ammo anyway | Supply-dependent; must manage quivers and visit merchants |

---

## Part 2: Terrain Movement

### Problem Statement

`movementCost` exists in `terrains.json` for every terrain type but has no player-felt consequence. It appears in a tile tooltip and nothing else. There is no time system, so difficult terrain cannot slow travel in the traditional sense.

Two mechanics are needed:
1. **Encounter frequency** — difficult terrain should trigger encounter checks more often, creating genuine routing decisions without a clock
2. **Movement feel** — difficult terrain should physically feel slower in real-time, giving immediate tactile feedback

---

### Mechanic 1 — Variable Move Delay

The codebase already has a fixed `moveDelay = 150ms` in `Player.js`. Making it dynamic requires changing one value per move.

```javascript
// Current (fixed)
this.moveDelay = 150;

// Proposed (dynamic, set after each tile move)
const terrainDef = /* current tile terrain from terrains.json */;
const multiplier = Math.min(terrainDef.movementCost || 1.0, RULES.movement.maxMoveDelayMultiplier);
this.currentMoveDelay = RULES.movement.baseMoveDelay * multiplier;
```

**rulesEngine.js additions:**
```javascript
movement: {
    baseMoveDelay: 150,          // ms per tile on standard terrain
    maxMoveDelayMultiplier: 2.0  // cap — prevents swamp feeling like walking through mud for 30 seconds
}
```

**Resulting delays:**

| Terrain | movementCost | Delay | Feel |
|---|---|---|---|
| Road | 0.8 | 120ms | Noticeably snappy |
| Grassland / Plains | 1.0 | 150ms | Baseline |
| Beach / Farmland | 1.2 | 180ms | Slightly resistant |
| Forest / Hills / Desert / Tundra | 1.5 | 225ms | Noticeably slower |
| Mountain / Dense Forest / Shallow Water | 2.0 | 300ms (cap) | Heavy going |
| Swamp / Jungle | 2.5 | 300ms (cap) | Same as mountain — cap prevents frustration |

**Why cap at 2.0× rather than allowing 2.5×:**
375ms per tile in swamp across a large swamp region crosses the frustration threshold. The cap means swamp and mountain feel identical in movement weight, which is acceptable — both are "very hard to traverse." The cap value is in rulesEngine.js and easily tunable.

**Hold-to-move preserved:** Do not switch to tap-to-move (one keypress per tile). Tap-to-move is a classical roguelike pattern but requires autoexplore to be non-punishing over large maps. Until autoexplore exists, hold-to-move with variable delay gives the same tactile feel without the frustration of spamming WASD across an open world.

---

### Mechanic 2 — Step Accumulator for Encounter Frequency

#### The Problem with Naive Implementation

The DA review identified a critical math error in the original proposal. With a naive accumulator (fire check when accumulated cost ≥ threshold, keep same per-check probability):

- Swamp (movementCost 2.5, threshold 10): check fires every **4 tiles**
- At current probability `encounterModifier × 0.01 = 1.2%`: net rate = **0.3% per tile**
- Swamp becomes **safer** than current (1.2% per tile), not more dangerous

#### The Fixed Formula

The accumulator and the per-check probability must be designed together. Net encounter rate per tile is:

```
rate per tile = encounterModifier × BASE_PROBABILITY × movementCost ÷ THRESHOLD
```

Setting `BASE_PROBABILITY = 0.10` and `THRESHOLD = 10`:

```
rate per tile = encounterModifier × movementCost × 0.01
```

This means `encounterModifier` and `movementCost` are now **multiplicative**. Both contribute to encounter rate. The semantic separation is:

- **`movementCost`** — how hard the terrain is to traverse (physical difficulty, also controls move delay)
- **`encounterModifier`** — how inherently encounter-prone this environment is per check (creature density, ambush likelihood)

A dense jungle (movementCost 2.5) is dangerous because it's hard to move through AND creatures are everywhere (encounterModifier 1.0). A mountain (movementCost 2.0) is hard to traverse but sparsely inhabited (encounterModifier 0.60) — so net rate is moderate.

#### Required encounterModifier Recalibration

Because `movementCost` now amplifies encounter rate, all `encounterModifier` values in `terrains.json` must come down to hit intended target rates. This is a pure data change — no code beyond the formula.

| Terrain | movementCost | Target rate/tile | New encounterModifier | Old encounterModifier |
|---|---|---|---|---|
| Road | 0.8 | 0.30% | 0.38 | 0.5 |
| Bridge | 0.8 | 0.30% | 0.38 | 0.5 |
| Grassland | 1.0 | 0.80% | 0.80 | 1.0 |
| Plains | 1.0 | 0.70% | 0.70 | 0.9 |
| Savanna | 1.0 | 1.20% | 1.20 | 1.4 |
| Beach | 1.2 | 0.40% | 0.33 | 0.4 |
| Farmland | 1.2 | 0.30% | 0.25 | 0.4 |
| Forest | 1.5 | 1.50% | 1.00 | 1.3 |
| Hills | 1.5 | 1.00% | 0.67 | 0.8 |
| Desert | 1.5 | 0.80% | 0.53 | 0.6 |
| Desert Hills | 1.5 | 0.70% | 0.47 | 0.7 |
| Tundra | 1.5 | 0.80% | 0.53 | 0.7 |
| Snowy Plains | 1.5 | 0.60% | 0.40 | 0.6 |
| Snow Forest | 1.5 | 1.00% | 0.67 | 1.0 |
| Shallow Water | 2.0 | 0.60% | 0.30 | 0.5 |
| Mountain | 2.0 | 1.20% | 0.60 | 0.7 |
| Dense Forest | 2.0 | 2.00% | 1.00 | 1.5 |
| Swamp | 2.5 | 2.00% | 0.80 | 1.2 |
| Jungle | 2.5 | 2.50% | 1.00 | 1.8 |

Terrains with `encounterModifier: 0` (sanctuary, town, dungeon tiles) are unchanged — zero stays zero.

#### Implementation

~~Add to `rulesEngine.js`~~ — **DONE (architect):** The `movement` config block has already been added to `rulesEngine.js`:
```javascript
movement: {
    baseMoveDelay: 150,
    maxMoveDelayMultiplier: 2.0,
    encounterAccumulatorThreshold: 10,
    baseEncounterProbability: 0.10
}
```

**Save/Load persistence:** Add `encounterAccumulator` to `gameState` in `initNewGame()` so it survives save/load:
```javascript
// In GameState.initNewGame()
this.data.player = {
    encounterAccumulator: 0
};
```
Read/write as `gameState.get('player').encounterAccumulator` from `Player.js`. Reset to 0 on dungeon enter/exit and on encounter trigger.

In `Player.js`, replace the current per-tile encounter check:
```javascript
// Current (every tile)
if (Math.random() < encounterChance * 0.01) { ... }

// Proposed (accumulator)
this.encounterAccumulator = (this.encounterAccumulator || 0) + terrain.movementCost;
if (this.encounterAccumulator >= RULES.movement.encounterAccumulatorThreshold) {
    this.encounterAccumulator = 0;
    const probability = terrain.encounterModifier * RULES.movement.baseEncounterProbability;
    if (Math.random() < probability) { triggerEncounter(); }
}
```

The accumulator resets to 0 on encounter trigger and on entering/exiting a dungeon. It persists across tiles within a session (save/load: persist `encounterAccumulator` in gameState).

---

### What Is Explicitly NOT Being Done

| Mechanic | Reason |
|---|---|
| Stamina/Focus drain from difficult terrain | Deferred — exhaustion and fatigue system is on the roadmap; this will hook into that system when implemented |
| Tap-to-move (one keypress per tile) | Requires autoexplore first; hold-to-move with variable delay achieves the same feel |
| Visible accumulator UI | Unnecessary — the delay itself communicates terrain cost. Encounters remain surprising. |

---

### Movement Implementation Sequence

```
Step 1  →  ✅ DONE (architect): movement config already in rulesEngine.js
            (baseMoveDelay, maxMoveDelayMultiplier, encounterAccumulatorThreshold,
            baseEncounterProbability)

Step 2  →  Add player.encounterAccumulator to gameState.initNewGame()
            gameState.data.player = { encounterAccumulator: 0 }

Step 3  →  Update terrains.json encounterModifier values (table above)
            Pure data change, no code

Step 4  →  Implement variable moveDelay in Player.js handleMovement()
            Replace hardcoded this.moveDelay = 150 with RULES.movement.baseMoveDelay
            Dynamic multiplier per tile: Math.min(movementCost, RULES.movement.maxMoveDelayMultiplier)
            ~5 lines

Step 5  →  Implement step accumulator in Player.js checkForEncounters()
            Replaces current per-tile check, ~10 lines
            Read/write encounterAccumulator via gameState.get('player').encounterAccumulator
            Reset on dungeon enter/exit and on encounter trigger

Step 6  →  Playtest: verify encounter rates feel right across terrains
            Tune encounterModifier values in terrains.json (data-only changes)
```

Steps 1–5 are independent of the ranged combat plan and can be implemented in any order relative to it.

---

## Part 3: Terrain Skill Challenge System

### Bug Fix Prerequisite

`checkForTerrainSkillChallenge()` in `Player.js` calls two methods that **do not exist** on `SkillChallengeManager`:

- `window.skillChallengeManager.shouldTriggerChallenge(challengeId, context)` — line 693
- `window.skillChallengeManager.canAttemptChallenge(challengeId)` — line 1417

Every tile move in mapped terrain silently errors. No terrain challenges trigger in the current build. These must be implemented before anything else in this section.

---

### Schema Addition: `terrainModifiers`

Each challenge in `skillChallenges.json` gains an optional `terrainModifiers` object alongside its existing `balance` block:

```json
{
  "id": "cliff_climb",
  "balance": {
    "triggerFrequency": 0.15,
    "cooldown": 300000,
    ...
  },
  "terrainModifiers": {
    "mountain": 3.0,
    "hills": 2.0,
    "denseForest": 0.5,
    "grassland": 0.0,
    "plains": 0.0,
    "road": 0.0,
    "beach": 0.0,
    "savanna": 0.0,
    "farmland": 0.0,
    "swamp": 0.0,
    "desert": 0.0,
    "tundra": 0.0,
    "snowyPlains": 0.0,
    "sanctuary": 0.0
  }
}
```

**Default rule:** If a terrain is not listed in `terrainModifiers`, the multiplier is **1.0**. Challenge authors must explicitly set terrains to `0.0` to prevent triggering there. This keeps the schema opt-in and avoids needing a whitelist of "allowed" terrains — the JSON is the single source of truth.

**Effective trigger frequency formula:**
```
effectiveChance = balance.triggerFrequency
                × (terrainModifiers[currentTerrain] ?? 1.0)
                × balancing.triggerFrequencyModifiers.terrain_base
```

Example — `cliff_climb` on mountain:
`0.15 × 3.0 × 0.1 = 4.5% per accumulator check`

Example — `cliff_climb` on grassland (explicit 0.0):
`0.15 × 0.0 × 0.1 = 0% — never triggers`

---

### Removing the Hardcoded Terrain Map

`Player.js` currently has a hardcoded `terrainChallengeMap` (lines 661–672) that lists which challenges can trigger in which terrains. This must be replaced with a **dynamic index built from the JSON at load time** in `SkillChallengeManager`:

```javascript
// Built once at load, after challenges JSON is parsed
buildTerrainIndex() {
    this.terrainChallengeIndex = {};
    for (const [id, challenge] of Object.entries(this.challenges.challenges)) {
        const modifiers = challenge.terrainModifiers || {};
        for (const [terrain, modifier] of Object.entries(modifiers)) {
            if (modifier > 0) {
                if (!this.terrainChallengeIndex[terrain]) {
                    this.terrainChallengeIndex[terrain] = [];
                }
                this.terrainChallengeIndex[terrain].push(id);
            }
        }
        // Challenges with no terrainModifiers field trigger anywhere (default 1.0)
        // — they are added to a 'universal' pool, not per-terrain
    }
}
```

`Player.js` then queries the index instead of its own hardcoded map:
```javascript
const candidates = window.skillChallengeManager.getCandidatesForTerrain(tile.terrain);
```

---

### Implementing the Missing Methods

**`shouldTriggerChallenge(challengeId, context)`**
```javascript
shouldTriggerChallenge(challengeId, context) {
    const challenge = this.challenges.challenges[challengeId];
    if (!challenge) return false;

    // Cooldown check
    if (!this.canAttemptChallenge(challengeId)) return false;

    // Effective frequency
    const terrainMod = challenge.terrainModifiers?.[context.terrainType] ?? 1.0;
    const globalMod = this.challenges.balancing.triggerFrequencyModifiers.terrain_base;
    const chance = challenge.balance.triggerFrequency * terrainMod * globalMod;

    return Math.random() < chance;
}
```

**`canAttemptChallenge(challengeId)`**
```javascript
canAttemptChallenge(challengeId) {
    const challenge = this.challenges.challenges[challengeId];
    if (!challenge) return false;

    const lastAttempt = this.lastAttemptTimes?.[challengeId] || 0;
    const cooldown = challenge.balance.cooldown || 0;
    return (Date.now() - lastAttempt) >= cooldown;
}
```

**`recordChallengeAttempt(challengeId)`**
```javascript
recordChallengeAttempt(challengeId) {
    if (!this.lastAttemptTimes) this.lastAttemptTimes = {};
    this.lastAttemptTimes[challengeId] = Date.now();
}
```

---

### Terrain Modifier Reference — All 22 Challenges

For each challenge, the intended terrain modifier pattern. Values not listed default to 1.0.

| Challenge | High terrains (≥2.0) | Boosted (1.5) | Suppressed (0.0) |
|---|---|---|---|
| `trap_detect_disarm` | `ruins` 3.0, `cave` 2.5 | `dungeon` tiles 2.0 | `road`, `beach`, `farmland`, `sanctuary` |
| `locked_door` | — | — | Quest/dungeon triggered only — set all terrain to 0.0 |
| `bandit_negotiation` | — | — | Quest triggered only — set all terrain to 0.0 |
| `cliff_climb` | `mountain` 3.0, `hills` 2.0 | — | `grassland`, `plains`, `road`, `swamp`, `desert`, `beach`, `savanna`, `farmland`, `sanctuary` |
| `hidden_treasure` | `ruins` 3.0, `denseForest` 2.0 | `forest` 1.5, `dungeon` tiles 2.0 | `road`, `beach`, `farmland`, `sanctuary` |
| `calm_wild_beast` | `jungle` 2.5, `forest` 2.0 | `swamp` 1.5, `grassland` 1.5 | `road`, `ruins`, `dungeon` tiles, `farmland`, `sanctuary` |
| `sneak_past_guards` | `denseForest` 2.0, `ruins` 2.0 | `forest` 1.5 | `sanctuary`, `beach`, `swamp`, `desert` |
| `arcane_puzzle` | `ruins` 3.0 | `dungeon` tiles 2.0 | All non-dungeon/ruin terrain set 0.0 |
| `ancient_text` | `ruins` 3.0 | `dungeon` tiles 2.0 | All non-dungeon/ruin terrain set 0.0 |
| `stabilize_wounded` | — | — | Quest triggered only — set all terrain to 0.0 |
| `track_creature` | `jungle` 2.5, `forest` 2.0 | `grassland` 1.5, `hills` 1.5 | `road`, `dungeon` tiles, `ruins`, `sanctuary`, `farmland` |
| `detect_lie` | — | — | Social/quest triggered only — set all terrain to 0.0 |
| `creative_distraction` | — | — | Social/quest triggered only — set all terrain to 0.0 |
| `holy_ritual` | — | — | Quest triggered only — set all terrain to 0.0 |
| `narrow_ledge` | `mountain` 3.0, `ruins` 2.0 | `hills` 1.5, `denseForest` 1.5 | `grassland`, `plains`, `road`, `swamp`, `beach`, `farmland`, `sanctuary` |
| `endure_harsh_environment` | `swamp` 3.0, `jungle` 3.0, `desert` 2.5 | `tundra` 2.0, `snowyPlains` 2.0 | `road`, `grassland`, `plains`, `sanctuary`, `farmland`, `beach` |
| `boulder_push` | `mountain` 3.0, `ruins` 2.0 | `cave` 1.5 | `grassland`, `plains`, `road`, `swamp`, `desert`, `sanctuary` |
| `mountain_climb` | `mountain` 4.0 | `hills` 1.5 | All other terrain set 0.0 |
| `heat_endurance` | `desert` 4.0 | `savanna` 2.0, `desertHills` 2.5 | All non-desert terrain set 0.0 |
| `swamp_navigation` | `swamp` 4.0 | `shallowWater` 2.0 | All non-swamp/water terrain set 0.0 |
| `dense_undergrowth` | `jungle` 4.0, `denseForest` 3.0 | `forest` 1.5 | All other terrain set 0.0 |
| `cliff_climb_advanced` | `mountain` 4.0 | `hills` 2.0 | All other terrain set 0.0 |
| `ice_climbing` | `tundra` 4.0, `snowyPlains` 4.0 | — | All other terrain set 0.0 |
| `river_crossing` | `shallowWater` 4.0 | — | All non-water terrain set 0.0 |

**Note on social/quest-only challenges:** `bandit_negotiation`, `detect_lie`, `creative_distraction`, `holy_ritual`, `stabilize_wounded`, `locked_door` are triggered programmatically (quest events, dungeon features, NPC dialogue). Set all `terrainModifiers` to 0.0 to prevent them appearing as world-exploration events.

---

### Implementation Sequence

```
Step -1  →  Add loadTerrainChallenges() to SkillChallengeManager.js
             Fetches data/skillChallenges.json → sets this.terrainChallengesData
             Call from main.js during init, parallel with existing loadChallenges()
             Then call buildTerrainIndex()
             PREREQUISITE: Steps 0a/0b read this.terrainChallengesData — must exist first

Step 0a  →  Implement shouldTriggerChallenge(), canAttemptChallenge(),
             recordChallengeAttempt() in SkillChallengeManager.js
             (Architect has added stubs — replace TODOs with full logic)
             Prerequisite bug fix — terrain challenges completely broken without this
             NOTE: methods must read this.terrainChallengesData.challenges[id]
             NOT this.challenges (which is a Map for social challenges — different data)

Step 0b  →  Implement buildTerrainIndex() in SkillChallengeManager
             (Architect has added stub — replace TODO with full logic)
             Called after loadTerrainChallenges() sets this.terrainChallengesData

Step 1   →  Add terrainModifiers to all existing challenges in skillChallenges.json
             Pure data change using reference table above
             NOTE: Verify challenge IDs first — boulder_push, mountain_climb,
             heat_endurance, swamp_navigation, dense_undergrowth, cliff_climb_advanced,
             ice_climbing, river_crossing may not yet exist and must be created first

Step 2   →  Remove hardcoded terrainChallengeMap from Player.js (lines 661–672)
             Replace with call to skillChallengeManager.getCandidatesForTerrain()

Step 3   →  Verify: walk through mountain, forest, swamp tiles and confirm
             correct challenges trigger (cliff_climb on mountain, not on road, etc.)
```

Step -1 is prerequisite to everything. Steps 0a/0b are prerequisite to Step 2. Step 1 is pure data and can run in parallel with Step 0a. Steps 2–3 are small Player.js changes.

---

## Architect Notes

**Review date:** 2026-03-07
**Reviewer:** /architect

---

### ADR-000 Compliance Assessment

| Item | Status | Notes |
|---|---|---|
| Enemy data in `/data/monsters.json` | PASS | `preferRanged` flag is a data field, not code |
| Ammo `capacity` field in `items.json` | PASS | Data-driven, no hardcoded values |
| `ammoCount` tracking | CAUTION | Must live on the item instance in character state (persisted), not on the item definition |
| Harried condition via existing conditions system | PASS | Correctly piggybacks on established pattern |
| Movement config in `rulesEngine.js` | PASS — DONE | Config block added (see below) |
| `encounterModifier` recalibration | PASS | Pure data change in `terrains.json` |
| `terrainChallengeMap` hardcoded in `Player.js` | FAIL — flagged | Must move to JSON + SCM index (plan correctly identifies this) |
| Missing SCM methods | FAIL — stub added | Stubs with TODO comments added to SkillChallengeManager.js |

---

### Changes Made (Architectural Only)

**1. `src/core/rulesEngine.js` — Added `movement` config block**

Added between `flee` and `zoom` sections:

```javascript
movement: {
    baseMoveDelay: 150,
    maxMoveDelayMultiplier: 2.0,
    encounterAccumulatorThreshold: 10,
    baseEncounterProbability: 0.10
}
```

All four values the plan requires are now in the rules engine. `Player.js` must import `RULES` and reference `RULES.movement.*` — no magic numbers in code. The comment in the config explains the net-rate formula so future tuners understand the relationship.

**2. `src/systems/SkillChallengeManager.js` — Constructor clarification + method stubs**

- Added `this.terrainChallengesData = null` — explicit property for the flat `skillChallenges.json` data, distinct from `this.challenges` (Map, social challenge trees). Backend-dev must populate this via a new `loadTerrainChallenges()` call during init.
- Added `this.terrainChallengeIndex = {}` and `this.lastAttemptTimes = {}` as initialized properties rather than ad-hoc assignments.
- Added stub implementations with TODO comments for: `buildTerrainIndex()`, `getCandidatesForTerrain()`, `shouldTriggerChallenge()`, `canAttemptChallenge()`, `recordChallengeAttempt()`.
- `recordChallengeAttempt()` is fully implemented (it is pure bookkeeping, no game mechanic logic).

---

### Critical Architectural Issue: Dual Data Source in SkillChallengeManager

**This is the most important finding in this review.**

`SkillChallengeManager` currently serves two distinct purposes with incompatible data structures:

| Purpose | Data source | Shape | Access |
|---|---|---|---|
| Social challenges (bandit negotiation) | `data/skillChallenges/*.json` (one file per challenge) | Individual challenge tree | `this.challenges.get(id)` (Map) |
| Terrain challenges | `data/skillChallenges.json` (flat index) | `{ balancing, challenges: { [id]: def } }` | `this.terrainChallengesData.challenges[id]` |

The plan's stub code references `this.challenges.challenges[id]` — this is incorrect because `this.challenges` is a `Map`. The stubs have been corrected to reference `this.terrainChallengesData.challenges[id]`.

**Backend-dev must add a `loadTerrainChallenges()` method** that fetches `data/skillChallenges.json` and sets `this.terrainChallengesData`, then calls `buildTerrainIndex()`. This must be called during game initialization (in `main.js` alongside `loadChallenges()`).

---

### Save/Load Impact

**New persistent state required:**

1. **`encounterAccumulator`** (numeric, float) — must persist through save/load. The plan correctly calls this out. Add to `gameState.world` or as a top-level `gameState.player` object.

   Recommendation: add to `gameState` in `initNewGame()`:
   ```javascript
   this.data.player = {
       encounterAccumulator: 0
   };
   ```
   This avoids storing it on the `Player` instance (which is not serialized) and matches the established pattern of transient state going in GameState.

2. **`lastAttemptTimes`** (object, SCM cooldowns) — these are wall-clock timestamps. They should NOT persist through save/load (a player who saves and loads should not find all challenges still on cooldown from the previous session). Leave on the SCM instance; do not serialize.

3. **`ammoCount`** (Phase 2) — must be stored on the character's equipped item instance, not on the item definition in `items.json`. Serialized as part of `character.equipment`. No new gameState paths needed.

---

### Ammo System: Schema Concern (Phase 2)

The plan adds `capacity` to `items.json`. This is the maximum/default ammo count. The runtime `ammoCount` is the current charge level. These must not be the same field.

Recommended schema on the item definition (items.json):
```json
{
  "id": "longbow",
  "ammoCapacity": 20
}
```

Recommended schema on the character equipment (runtime state in gameState):
```json
{
  "equipment": {
    "mainHand": {
      "id": "longbow",
      "ammoCount": 14
    }
  }
}
```

The `recalculateCombatStats()` function in `main.js` already handles equipment stat recalculation — ammo display should hook into the same update path.

---

### Harried Condition: Conditions System Compliance

The plan correctly uses `addCondition('harried', 'untilStartOfTurn', attacker.id, {...})`. This is consistent with the established conditions system pattern (see MEMORY.md: Slow mastery uses the same duration type).

One gap: the existing conditions system cleanup at turn start iterates `conditions.filter(c => c.duration === 'untilStartOfTurn' && c.appliedBy === combatant.id)`. Harried is applied by the attacker, cleared when the *defender's* turn starts. Backend-dev must verify the cleanup loop fires on the correct combatant's turn start — it should clear Harried when `currentCombatant === defender`, not when `currentCombatant === attacker`.

---

### terrainModifiers Schema: Missing Challenges

The plan's terrain modifier reference table lists 24 unique challenge IDs. The current `data/skillChallenges.json` has a `challenges` object. Backend-dev must verify these challenge IDs exist before adding `terrainModifiers` to them:

- `boulder_push`, `mountain_climb`, `heat_endurance`, `swamp_navigation`, `dense_undergrowth`, `cliff_climb_advanced`, `ice_climbing`, `river_crossing` — these appear in the plan's table but are **not confirmed to exist** in the current `skillChallenges.json`. They may need to be added as new challenge definitions first.

Architectural rule: `terrainModifiers` keys that reference non-existent challenge IDs will silently produce an empty array from `getCandidatesForTerrain()` — this is safe but should be logged as a warning during `buildTerrainIndex()`.

---

### Implementation Order Recommendation

The plan's sequencing is architecturally sound. One addition:

```
Before Step 0a:
   Add loadTerrainChallenges() to SkillChallengeManager.js
   Call it from main.js during init (parallel with loadChallenges())
   Set this.terrainChallengesData, then call buildTerrainIndex()
```

This is prerequisite to Steps 0a/0b since those methods read `this.terrainChallengesData`.

---

### Handoff

- `/backend-dev` — Implement all method stubs in `SkillChallengeManager.js` (marked TODO). Add `loadTerrainChallenges()`. Add `encounterAccumulator` to gameState. Implement variable moveDelay and step accumulator in `Player.js` using `RULES.movement.*`. Add `terrainModifiers` to `skillChallenges.json` challenges. Remove `terrainChallengeMap` from `Player.js`.
- `/backend-dev` — Phase 1: Add new enemy entries to `monsters.json` with `preferRanged` flag. Wire AI flag into `CombatManager.js` enemy turn logic.
- `/backend-dev` — Phase 2: Add `ammoCapacity` to ranged weapon definitions in `items.json`. Implement ammo consumption/refill in CombatManager attack flow and Character long rest.
- `/backend-dev` — Phase 3: Implement Harried condition application in `CombatManager.attack()` and verify cleanup fires on the correct combatant's turn start.
- `/frontend-dev` — No new UI required for movement (delay is felt, not shown). Ammo count display on equipped weapon (Phase 2) and Harried condition icon on combatant card (Phase 3) are the only UI additions needed.
