# Party Member System — Technical Architecture

**Date:** 2026-03-07
**Status:** Approved (unverified — flagged 2026-07-17, original text was "Ready for Implementation"; the party system has since had further amendments in `docs/plans/2026-03-09-party-system-amendments.md` and ADR-012 in `.claude/rules/architecture.md` — check those first)
**Design source:** `docs/designjams/2026-03-07-party-member-system.md`
**ADR compliance:** ADR-000 Modifiability First — validated

---

## ADR-000 Checklist

| Criterion | Status | Notes |
|-----------|--------|-------|
| Data in `/data/*.json`, not hardcoded | PASS | Companion templates, motivation archetypes, relationship tiers, devoted passives all in `data/companions.json` |
| Rules in `rulesEngine.js` with feature flags | PASS | `RULES.party` block required; synergies have `enabled` flags |
| Can be toggled/disabled via config | PASS | `RULES.party.enabled: true` wraps the system; disabling falls back to `partySize: 1` |
| Can be extended without modifying existing code | PASS | `buildEncounter()` already accepts `partySize`; `getSkillModifier()` gets a new overload, not a rewrite |
| Changes don't break other systems | CONDITIONAL | `LevelUpManager.confirmLevelUp()` must accept an explicit character argument — the one breaking change to audit carefully |

---

## Implementation Order

**Phase 1 — Data and Rules (no code dependencies)**
1. `/data/companions.json` — New file
2. `src/core/rulesEngine.js` — Add `RULES.party` block

**Phase 2 — Core System**
3. `src/systems/CompanionManager.js` — New file

**Phase 3 — State Integration**
4. `src/core/GameState.js` — Add `party` state fields, extend `toJSON`/`fromJSON`, add `getFullParty()` and `getPartySize()`

**Phase 4 — System Extensions**
5. `src/systems/CombatManager.js` — Extend `startCombat()`, fix AI targeting, companion turn sequencing
6. `src/systems/EncounterBuilder.js` — Wire HP scaling after monster selection
7. `src/systems/SkillChallengeManager.js` — Extend `getSkillModifier()` with companions
8. `src/systems/LevelUpManager.js` — Decouple `confirmLevelUp()` from hardcoded player character
9. `src/systems/Player.js` — Pass `partySize` from GameState to `buildEncounter()`

**Phase 5 — UI Glue (frontend scope)**
10. `src/main.js` — Party health bar, companion action panel subscription, turn order tracker

---

## 1. `data/companions.json` — Full Schema

```json
{
  "version": "1.0",
  "companionTypes": {
    "standard": {
      "skillContributions": 2,
      "callings": ["dedication", "scholar"],
      "description": "Standard companion with 2 skill proficiencies"
    },
    "wanderlust": {
      "skillContributions": 3,
      "callings": ["wanderlust"],
      "description": "Wanderlust companion with 3 skill proficiencies"
    }
  },
  "motivationArchetypes": {
    "duty": {
      "id": "duty",
      "label": "Duty",
      "description": "Cares about protecting innocents and keeping promises",
      "relationshipEvents": {
        "saveCivilian":                { "delta": 10 },
        "acceptHighRiskQuest":         { "delta": 3 },
        "shareLootFairly":             { "delta": 5 },
        "exploreOptionalRuin":         { "delta": 0 },
        "letCompanionDecide":          { "delta": 0 },
        "winHardFight":                { "delta": 5 },
        "abandonCivilian":             { "delta": -15 },
        "fleeCowardly":                { "delta": -5 },
        "takeAllLoot":                 { "delta": 0 },
        "skipDungeonExploration":      { "delta": 0 },
        "overridePreference":          { "delta": -5 },
        "companionDownedUnstabilized": { "delta": -10 }
      },
      "devotedPassive": {
        "id": "duty_devoted",
        "name": "Shield of Duty",
        "description": "Once per long rest, companion uses their Reaction to impose Disadvantage on an attack targeting the player.",
        "trigger": "onAttackTargetingPlayer",
        "usesPerLongRest": 1
      }
    },
    "wealth": {
      "id": "wealth",
      "label": "Wealth",
      "description": "Cares about gold, rewards, and not dying for nothing",
      "relationshipEvents": {
        "saveCivilian":                { "delta": 0 },
        "acceptHighRiskQuest":         { "delta": -5 },
        "shareLootFairly":             { "delta": 15 },
        "exploreOptionalRuin":         { "delta": -3 },
        "letCompanionDecide":          { "delta": 0 },
        "winHardFight":                { "delta": 3 },
        "abandonCivilian":             { "delta": 0 },
        "fleeCowardly":                { "delta": 8 },
        "takeAllLoot":                 { "delta": -20 },
        "skipDungeonExploration":      { "delta": 5 },
        "overridePreference":          { "delta": -5 },
        "companionDownedUnstabilized": { "delta": -10 }
      },
      "devotedPassive": {
        "id": "wealth_devoted",
        "name": "Lucky Haul",
        "description": "Companion's loot rolls have +1 tier bonus (uncommon to rare). Shared with player.",
        "trigger": "onLootRoll",
        "tierUpgrade": 1
      }
    },
    "glory": {
      "id": "glory",
      "label": "Glory",
      "description": "Cares about facing worthy opponents and being recognized",
      "relationshipEvents": {
        "saveCivilian":                { "delta": 2 },
        "acceptHighRiskQuest":         { "delta": 10 },
        "shareLootFairly":             { "delta": 0 },
        "exploreOptionalRuin":         { "delta": 2 },
        "letCompanionDecide":          { "delta": 2 },
        "winHardFight":                { "delta": 12 },
        "abandonCivilian":             { "delta": -3 },
        "fleeCowardly":                { "delta": -15 },
        "takeAllLoot":                 { "delta": 0 },
        "skipDungeonExploration":      { "delta": -2 },
        "overridePreference":          { "delta": -5 },
        "companionDownedUnstabilized": { "delta": -10 }
      },
      "devotedPassive": {
        "id": "glory_devoted",
        "name": "First Blood",
        "description": "Companion deals +2 damage on their first attack of any combat.",
        "trigger": "onFirstAttackOfCombat",
        "damageBonus": 2
      }
    },
    "knowledge": {
      "id": "knowledge",
      "label": "Knowledge",
      "description": "Cares about discovery, ruins, and lore",
      "relationshipEvents": {
        "saveCivilian":                { "delta": 0 },
        "acceptHighRiskQuest":         { "delta": 5 },
        "shareLootFairly":             { "delta": 0 },
        "exploreOptionalRuin":         { "delta": 15 },
        "letCompanionDecide":          { "delta": 0 },
        "winHardFight":                { "delta": 0 },
        "abandonCivilian":             { "delta": 0 },
        "fleeCowardly":                { "delta": 0 },
        "takeAllLoot":                 { "delta": 0 },
        "skipDungeonExploration":      { "delta": -15 },
        "overridePreference":          { "delta": -5 },
        "companionDownedUnstabilized": { "delta": -10 }
      },
      "devotedPassive": {
        "id": "knowledge_devoted",
        "name": "Scholar's Foresight",
        "description": "Companion reveals the type of the next dungeon boss before entry.",
        "trigger": "onDungeonEntry",
        "revealBossType": true
      }
    },
    "freedom": {
      "id": "freedom",
      "label": "Freedom",
      "description": "Cares about autonomy and resents being ordered around",
      "relationshipEvents": {
        "saveCivilian":                { "delta": 3 },
        "acceptHighRiskQuest":         { "delta": 2 },
        "shareLootFairly":             { "delta": 8 },
        "exploreOptionalRuin":         { "delta": 5 },
        "letCompanionDecide":          { "delta": 12 },
        "winHardFight":                { "delta": 0 },
        "abandonCivilian":             { "delta": 0 },
        "fleeCowardly":                { "delta": 0 },
        "takeAllLoot":                 { "delta": -5 },
        "skipDungeonExploration":      { "delta": 0 },
        "overridePreference":          { "delta": -15 },
        "companionDownedUnstabilized": { "delta": -10 }
      },
      "devotedPassive": {
        "id": "freedom_devoted",
        "name": "Free Action",
        "description": "Companion can take the Help action as a free action once per combat.",
        "trigger": "onCompanionHelpAction",
        "freeActionPerCombat": 1
      }
    }
  },
  "relationshipTiers": {
    "hostile":    { "min": -100, "max": -51, "label": "Distant",  "tier": "hostile" },
    "unfriendly": { "min": -50,  "max": -21, "label": "Wary",     "tier": "unfriendly" },
    "neutral":    { "min": -20,  "max": 20,  "label": "Cordial",  "tier": "neutral" },
    "friendly":   { "min": 21,   "max": 60,  "label": "Trusted",  "tier": "friendly" },
    "devoted":    { "min": 61,   "max": 100, "label": "Devoted",  "tier": "devoted" }
  },
  "combatRelationshipEvents": {
    "playerSavesCompanionFromKillRange":  { "delta": 3 },
    "companionDownedByPlayerOrder":       { "delta": -8 },
    "companionIgnoredWhileAttacked":      { "delta": -5 },
    "companionLandsKillingBlow":          { "delta": 5 }
  },
  "restActivities": {
    "trainTogether": {
      "id": "trainTogether",
      "label": "Train Together",
      "description": "Dedicated training with the companion.",
      "relationshipDelta": 8,
      "usesPerLongRest": 1,
      "motivationAffinity": []
    },
    "shareADrink": {
      "id": "shareADrink",
      "label": "Share a Drink",
      "description": "Casual conversation and camaraderie.",
      "relationshipDelta": 5,
      "usesPerLongRest": 1,
      "advancesDialogue": true,
      "motivationAffinity": []
    },
    "spar": {
      "id": "spar",
      "label": "Spar (Friendly)",
      "description": "Player makes one attack roll vs companion AC (no damage). Success: +8, failure: +4.",
      "relationshipDeltaSuccess": 8,
      "relationshipDeltaFailure": 4,
      "usesPerLongRest": 1,
      "motivationAffinity": ["glory", "duty"]
    },
    "planTheRoute": {
      "id": "planTheRoute",
      "label": "Plan the Route",
      "description": "Strategic planning. Reveals one hidden room on next dungeon map.",
      "relationshipDelta": 5,
      "usesPerLongRest": 1,
      "revealHiddenRoom": true,
      "motivationAffinity": ["knowledge", "duty"]
    },
    "splitTheSpoils": {
      "id": "splitTheSpoils",
      "label": "Split the Spoils",
      "description": "Offer gold to the companion. +1 relationship per 5 gold, up to +15.",
      "relationshipDeltaPerGold": 0.2,
      "maxRelationshipDelta": 15,
      "usesPerLongRest": 1,
      "motivationAffinity": ["wealth"]
    }
  },
  "acquisitionSources": {
    "settlement": {
      "id": "settlement",
      "candidateRange": [1, 3],
      "seededToSettlement": true,
      "candidatesPersist": false
    },
    "rescue": {
      "id": "rescue",
      "encounterChance": 0.06,
      "levelOffset": -1,
      "requiresPostCombatDialogue": true
    },
    "quest": {
      "id": "quest",
      "named": true,
      "hasAuthoredDialogue": true
    },
    "dungeon": {
      "id": "dungeon",
      "requiresFreeing": true,
      "startingRelationship": 0,
      "departureSensitivity": "high"
    }
  },
  "partySynergies": {
    "vanguard": {
      "id": "vanguard",
      "description": "3+ Dedication party members gain +1 to attack rolls.",
      "requiredCallings": { "dedication": 3 },
      "effect": { "attackBonus": 1, "appliesTo": "dedication" }
    },
    "arcaneAssembly": {
      "id": "arcaneAssembly",
      "description": "2+ Scholar party members: Arcane Recovery recovers 1 additional mana.",
      "requiredCallings": { "scholar": 2 },
      "effect": { "arcaneRecoveryBonus": 1, "appliesTo": "scholar" }
    },
    "bandOfRogues": {
      "id": "bandOfRogues",
      "description": "3+ Wanderlust party members: Bardic Inspiration dice upgrade one step.",
      "requiredCallings": { "wanderlust": 3 },
      "effect": { "inspirationDieUpgrade": true, "appliesTo": "wanderlust" }
    },
    "trueParty": {
      "id": "trueParty",
      "description": "One of each Calling in party: all skill challenges gain +1 flat bonus.",
      "requireAllCallings": true,
      "effect": { "skillChallengeBonus": 1, "appliesTo": "all" }
    }
  },
  "namedCompanions": []
}
```

---

## 2. `rulesEngine.js` — `RULES.party` Addition

Add alongside `RULES.combat`, `RULES.skills`, etc.:

```javascript
party: {
    enabled: true,

    maxSize: 4,
    maxCompanions: 3,

    // Effective party size for XP budget = 1 + (companionCount * this factor)
    // Prevents double-scaling: XP budget already selects harder enemies; no HP multiplier needed
    // e.g. 3 companions → effectivePartySize 2.8 not 4.0
    companionActionEconomyFactor: 0.6,

    // Cap companion skill challenge contributions at the player's proficiency bonus
    skillContributionCap: "proficiencyBonus",

    companionTypeSkillCounts: {
        standard:   2,
        wanderlust: 3
    },

    relationshipMin: -100,
    relationshipMax: 100,
    hostileThreshold: -51,

    synergies: {
        enabled: true,
        vanguard:       { enabled: true, minDedication: 3, attackBonus: 1 },
        arcaneAssembly: { enabled: true, minScholar: 2,    arcaneRecoveryBonus: 1 },
        bandOfRogues:   { enabled: true, minWanderlust: 3, inspirationDieUpgrade: true },
        trueParty:      { enabled: true, requireAllCallings: true, skillChallengeBonus: 1 }
    },

    defaultReactionMode: 'ask',      // 'always' | 'ask' | 'never' — ask matches BG3 behaviour
    rescueEncounterChance: 0.06,     // tertiary source; ~6% per non-boss dungeon encounter
    settlementCandidateRange: [1, 3]
}
```

---

## 3. `CompanionManager.js` — API

**Responsibility boundary:**

| CompanionManager owns | Delegates to |
|----------------------|--------------|
| Party roster management | `Character.js` — stat calculation, HP, leveling |
| Relationship meter and event processing | `companions.json` — event deltas by motivation |
| Recruitment candidate generation | SeededRandom — deterministic candidates |
| Companion creation from class + motivation seed | `Character.js` constructor |
| Devoted passive tracking | `CombatManager.js` — reaction resolution via events |
| Rest activity processing | `GameState` — persistence |
| Party synergy computation | `RULES.party.synergies` |
| Save/load serialization | `GameState.toJSON()` / `fromJSON()` |

Does NOT touch the DOM. All UI wired in `main.js`.

### Constructor

```javascript
constructor(config = RULES.party) {
    this.config = config;
    this.companionData = null;
    this.rng = null;
}

async initialize(seed) {
    const response = await fetch('data/companions.json');
    this.companionData = await response.json();
    this.rng = new SeededRandom(seed + '_companions');
}
```

### Companion `companionMeta` Shape

Attached to Character instances by CompanionManager after construction:

```javascript
character.companionMeta = {
    companionType: 'standard' | 'wanderlust',
    motivationId: string,
    motivationRevealed: boolean,
    skillAssignments: string[],        // length matches companionType count
    source: string,
    relationship: number,              // -100 to +100
    devotedPassiveUsedThisRest: false,
    reactionMode: 'always' | 'ask' | 'never',  // default: 'ask'
    dialogueNodeIndex: 0,
    isDowned: false,
    ultimatumPending: false,
    factionId: null
}
```

### Key Method Signatures

```javascript
// Roster
addCompanion(companion)                                        // → true | false (at cap)
canRecruit()                                                   // → boolean
dismissCompanion(companionId, reason)                          // reason: 'player'|'hostile_departure'|'faction_conflict'|'death'
getParty()                                                     // → Companion[]
getPartySize()                                                 // → number (player + companions)

// Creation
createCompanion({ name, callingId, companionType, motivationId, level, source, skillAssignments, campaignIds })
// → Character instance with companionMeta attached

// Relationship
applyRelationshipEvent(companionId, eventId)                   // → { oldValue, newValue, tierChanged, newTier }
getRelationshipTier(companionId)                               // → 'hostile'|'unfriendly'|'neutral'|'friendly'|'devoted'
getRelationshipDisplay(companionId)                            // → { label: string, tier: string }
checkUltimata()                                                // Called after every rest

// Rest activities
processRestActivity(companionId, activityId, playerGoldSpent) // → { relationshipDelta, sideEffect | null }

// Synergies
getActiveSynergies()                                           // → { vanguard: bool, arcaneAssembly: bool, bandOfRogues: bool, trueParty: bool }
getSkillChallengeSynergyBonus()                                // → 0 | 1

// Level-up
prepareBatchLevelUp(newLevel)                                  // → Array<{ companionId, pendingLevelUp }>
applyCompanionLevelUp(companionId, selections)

// Post-combat
handlePostCombat(combatResult)                                 // auto-stabilize, permanent death check, relationship events
```

---

## 4. `GameState.js` Changes

### New State Fields (in constructor `this.data`)

```javascript
party: {
    companions: [],       // Array of Character instances with companionMeta
    candidates: [],       // Transient — NOT persisted
    activeSynergies: {
        vanguard: false,
        arcaneAssembly: false,
        bandOfRogues: false,
        trueParty: false
    }
}
```

### New Methods

```javascript
getFullParty() {
    const player = this.data.character;
    const companions = this.data.party?.companions || [];
    return [player, ...companions];
}

getPartySize() {
    return 1 + (this.data.party?.companions?.filter(c => !c.companionMeta?.isDowned).length || 0);
}

// For encounter scaling — applies companionActionEconomyFactor to avoid double-scaling
getEffectivePartySize() {
    const companionCount = this.data.party?.companions?.filter(
        c => !c.companionMeta?.isDowned
    ).length || 0;
    const factor = RULES.party?.companionActionEconomyFactor ?? 0.6;
    return 1 + (companionCount * factor);
}

updateCompanionRelationship(companionId, value) {
    const companions = this.data.party.companions;
    const idx = companions.findIndex(c => c.id === companionId);
    if (idx >= 0) {
        companions[idx].companionMeta.relationship = value;
        this.notify('party.companions', companions);
    }
}
```

### `toJSON()` Extension

```javascript
party: {
    companions: this.data.party.companions.map(c => ({
        characterData: c.toJSON(),
        companionMeta: { ...c.companionMeta }
    })),
    candidates: [],   // intentionally not persisted
    activeSynergies: { ...this.data.party.activeSynergies }
}
```

### `fromJSON()` Extension

```javascript
if (savedData.party?.companions) {
    this.data.party.companions = savedData.party.companions.map(entry => {
        const character = Character.fromJSON(entry.characterData);
        character.companionMeta = entry.companionMeta;
        return character;
    });
}
```

**Note:** Old saves without `party` key load gracefully as solo runs — no migration needed.

---

## 5. `CombatManager.js` Changes

### `startCombat()` Signature

```javascript
// Before: startCombat(player, enemies)
// After:
async startCombat(player, enemies, companions = [])
```

After creating `this.playerCombatant`, add companion combatants:

```javascript
this.companionCombatants = companions
    .filter(c => !c.companionMeta?.isDowned)
    .map((companion, index) => {
        const combatant = new Combatant(companion, 'companion', `companion_${index}`);
        this.combatants.push(combatant);
        return combatant;
    });
```

### Turn Sequencing — `startTurn()` New Branch

```javascript
} else if (combatant.team === 'companion') {
    gameState.set('combat.activeCompanionId', combatant.id);
    gameState.addMessage(`${combatant.name}'s turn — you control them.`, 'info');
    // Waits for player input. UI handles panel switch via 'combat.activeCompanionId' subscription.
}
```

### AI Target Selection Fix

```javascript
// Before:
const targets = [this.playerCombatant].filter(c => c.hp > 0);

// After:
const targets = [this.playerCombatant, ...this.companionCombatants]
    .filter(c => c.hp > 0);
```

### Companion Downed Handling

```javascript
// When companion reaches 0 HP:
combatant.isDowned = true;
combatant.hp = 0;
this.turnOrder = this.turnOrder.filter(c => c.id !== combatant.id);
gameState.addMessage(`${combatant.name} is downed!`, 'error');
// Write back to companionMeta so handlePostCombat sees the downed state
companion.companionMeta.isDowned = true;
```

### In-Combat Revival

A Downed companion can be brought back to 1 HP by any healing effect (spell, potion) targeting them. This uses the same healing resolution path as player healing — no special case needed. When healing lands on a Downed companion:

```javascript
// In the heal resolution path, after setting hp:
if (combatant.isDowned && newHP > 0) {
    combatant.isDowned = false;
    combatant.companionMeta.isDowned = false;
    // Re-insert into turn order at next initiative slot
    this._reinsertIntoTurnOrder(combatant);
    gameState.addMessage(`${combatant.name} is back up!`, 'success');
}
```

### Post-Combat Stabilisation

`CompanionManager.handlePostCombat(combatResult)` subscribes to `'combat.ended'`:

```javascript
// outcome: 'victory' | 'tpk' | 'retreat'
const downed = companions.filter(c => c.companionMeta.isDowned);
if (combatResult.outcome === 'victory') {
    // Auto-stabilise: free, no resource cost
    downed.forEach(c => { c.companionMeta.isDowned = false; c.currentHP = 1; });
} else {
    // TPK or retreat: permanent death
    downed.forEach(c => {
        this.dismissCompanion(c.id, 'death');
        // Fire companionDownedUnstabilized on all survivors
    });
}
```

---

## 6. `EncounterBuilder.js` — Encounter Scaling

The XP budget system already multiplies by `partySize`. No HP layer is added on top (that would double-scale). The only change is ensuring `partySize` passed to `buildEncounter()` uses the effective party size formula to account for companion action economy:

**`Player.js` call site** — replace hardcoded `partySize: 1`:

```javascript
// Before:
partySize: 1

// After:
partySize: gameState.getEffectivePartySize?.() ?? 1,
```

**New `GameState.getEffectivePartySize()` method:**

```javascript
getEffectivePartySize() {
    const companionCount = this.data.party?.companions?.filter(
        c => !c.companionMeta?.isDowned
    ).length || 0;
    const factor = RULES.party?.companionActionEconomyFactor ?? 0.6;
    return 1 + (companionCount * factor);
    // Solo: 1.0 | 1 companion: 1.6 | 2: 2.2 | 3: 2.8
}
```

This passes a non-integer to `buildEncounter()`. Ensure the XP budget calculation handles floats (multiply then floor). No other changes to `EncounterBuilder.js` are required.

---

## 7. `SkillChallengeManager.js` — `getSkillModifier()` Extension

```javascript
// Before: getSkillModifier(character, skillId)
// After (backward compatible):
getSkillModifier(character, skillId, companions = []) {
    // Existing player base calculation (unchanged)
    const skillData = character.skills.find(s => s.id === skillId);
    if (!skillData) return 0;
    const abilityMod = character.abilityModifiers[skillData.ability];
    const profBonus = character.skillProficiencies.includes(skillId)
        ? character.proficiencyBonus : 0;
    const playerBase = abilityMod + profBonus;

    if (!RULES.party?.enabled || companions.length === 0) return playerBase;

    // Companion contribution: capped at player's proficiency bonus
    const cap = character.proficiencyBonus;
    let companionContribution = 0;

    for (const companion of companions) {
        const meta = companion.companionMeta;
        if (!meta || !meta.skillAssignments.includes(skillId)) continue;
        if (meta.isDowned) continue;
        companionContribution = Math.min(cap, companionContribution + companion.proficiencyBonus);
        if (companionContribution >= cap) break;
    }

    const synergyBonus = this._getSynergyBonus();

    return playerBase + companionContribution + synergyBonus;
}

_getActiveCompanions() {
    return gameState.get('party.companions') || [];
}

_getSynergyBonus() {
    const synergies = gameState.get('party.activeSynergies');
    return synergies?.trueParty ? 1 : 0;
}
```

All internal calls to `getSkillModifier` pass `this._getActiveCompanions()` as the third argument.

---

## 8. `LevelUpManager.js` — Decouple from Hardcoded Player

```javascript
// Before: confirmLevelUp()
// After:
confirmLevelUp(targetCharacter = null) {
    const character = targetCharacter || gameState.get('character');

    character.applyLevelUpSelections(this.currentSelections);

    if (targetCharacter) {
        const companions = gameState.get('party.companions') || [];
        const idx = companions.findIndex(c => c.id === character.id);
        if (idx >= 0) {
            companions[idx] = character;
            gameState.set('party.companions', companions);
        }
    } else {
        gameState.set('character', character);
    }

    gameState.addMessage(`Level ${character.level} reached!`, 'success');
    this.closeModal();
    if (window.game?.updateHUD) window.game.updateHUD(gameState.get('character'));
}
```

### Companion Level-Up Flow

1. Player levels up → `confirmLevelUp()` (no arg) → player done
2. `CompanionManager.prepareBatchLevelUp(newLevel)` called
3. Levels requiring choices (level 3 specialization, level 4 ASI): `LevelUpManager.openLevelUpModal(companion)` called per companion in sequence
4. Choice-free levels: `CompanionManager.applyCompanionLevelUp(companionId, autoSelections)` auto-applies sensible defaults without opening a modal

The modal is character-agnostic — it reads from `character.pendingLevelUp` and `character.class.id`. Passing a companion Character works with zero modal code changes.

---

## 9. Integration Surface Map

```
data/companions.json
    ← read by → CompanionManager (init, createCompanion, applyRelationshipEvent, processRestActivity)

RULES.party (rulesEngine.js)
    ← read by → CompanionManager (caps, thresholds, synergies)
    ← read by → EncounterBuilder (encounterScalingMultiplier)
    ← read by → SkillChallengeManager (skillContributionCap, enabled flag)
    ← read by → CombatManager (party.enabled)

CompanionManager
    → writes → GameState ('party.companions', 'party.activeSynergies')
    → reads  → GameState ('character', 'party.companions', 'worldConfig.campaignId')
    → uses   → Character.js (constructor, levelUp, applyLevelUpSelections)
    → uses   → SeededRandom

CombatManager
    → reads  → GameState ('party.companions')
    → writes → GameState ('combat', 'combat.activeCompanionId')
    → fires  → 'combat.ended' event → CompanionManager.handlePostCombat() subscribes

SkillChallengeManager
    → reads  → GameState ('party.companions', 'party.activeSynergies')
    → reads  → RULES.party

LevelUpManager
    → reads  → GameState ('character', 'party.companions')
    → writes → GameState ('character', 'party.companions')
    → calls  → CompanionManager.prepareBatchLevelUp() after player level-up

Player.js
    → reads  → GameState.getPartySize() for partySize
    → calls  → EncounterBuilder.buildEncounter({ partySize: n })

main.js (UI glue)
    → subscribes → 'party.companions' (party health bar)
    → subscribes → 'combat.activeCompanionId' (companion action panel)
    → subscribes → 'party.activeSynergies' (synergy HUD)
```

### No circular imports. Dependency graph is a DAG.

| Potential risk | Resolution |
|---------------|------------|
| SkillChallengeManager → CompanionManager | Read from GameState instead. No direct import. |
| CombatManager → CompanionManager (post-combat) | CombatManager fires `combat.ended` event; CompanionManager subscribes. No direct call. |
| LevelUpManager → CompanionManager | One-directional call. No cycle. |

---

## 10. Save/Load — Companion State Serialization

### Serialized companion entry in `save.party.companions[]`

```json
{
  "characterData": {
    "id": "uuid",
    "name": "Mira",
    "level": 3,
    "class": { "id": "dedication" },
    "baseAbilities": { "str": 15, "dex": 12, "con": 14, "int": 10, "wis": 13, "cha": 8 },
    "maxHP": 28,
    "currentHP": 22,
    "skillChoices": ["athletics", "perception"],
    "abilities": [], "spells": [], "traits": [],
    "specialization": null
  },
  "companionMeta": {
    "companionType": "standard",
    "motivationId": "duty",
    "motivationRevealed": false,
    "skillAssignments": ["athletics", "perception"],
    "source": "settlement",
    "relationship": 15,
    "devotedPassiveUsedThisRest": false,
    "reactionMode": "ask",
    "dialogueNodeIndex": 1,
    "isDowned": false,
    "ultimatumPending": false,
    "factionId": null
  }
}
```

### What does NOT persist

- `candidates[]` — regenerate from world seed on settlement revisit
- `devotedPassiveUsedThisRest`, `lastStandUsedThisRest` — reset on long rest; default `false` on load

### Save compatibility

Old saves without `party` key load gracefully as solo runs. No migration script needed. Future schema changes handled via existing `version` field in save data.

---

## Pre-Existing Red Flags (do not worsen)

1. **`weaponMasteries` hardcoded in `GameState.loadStaticData()`** — ADR-000 violation. Do not touch in this PR; flag for separate fix.
2. **`fromJSON()` uses `require()` in ES module** — bundler shim currently makes it work. Party system uses same pattern for consistency. Correct fix is `async fromJSON()` + `await import()`, but out of scope here.
3. **`Player.js` hardcodes `partySize: 1`** — MUST be fixed in same PR as CompanionManager ships. If not done simultaneously, encounter scaling never triggers.
4. **`LevelUpManager` DOM calls in `renderChoiceSections()`** — companion-context mode handled by passing `targetCharacter` to `confirmLevelUp()`. No DOM changes needed.

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| `startCombat()` signature breaks callers | Medium | High | Default `companions = []` makes change backward-compatible |
| `getSkillModifier()` changes existing check results | Low | Medium | Default `companions = []` — all existing calls return identical results |
| `confirmLevelUp()` refactor regression | Low | Low | Default `targetCharacter = null` preserves current behavior |
| Encounter scaling `1.25x` is wrong | High | Medium | Lives in `RULES.party.encounterScalingMultiplier` — single number change. Run past `/devils-advocate` before tuning. |
| Companion initiative + combat UI | Medium | High | Largest frontend surface area. `combat.activeCompanionId` state path is the integration point. |

---

## Summary

**New files (2):**
- `data/companions.json`
- `src/systems/CompanionManager.js`

**Modified files (7):**
- `src/core/rulesEngine.js` — add `RULES.party`
- `src/core/GameState.js` — add `party` state, extend save/load, add `getFullParty()` / `getPartySize()`
- `src/systems/CombatManager.js` — extend `startCombat()`, fix AI targeting, companion turn branch
- `src/systems/EncounterBuilder.js` — apply HP scaling after monster selection
- `src/systems/SkillChallengeManager.js` — extend `getSkillModifier()` with companions
- `src/systems/LevelUpManager.js` — decouple `confirmLevelUp()` from hardcoded player reference
- `src/systems/Player.js` — pass `partySize` from GameState to `buildEncounter()`

**Frontend scope (separate):**
- `src/main.js` — party health bar, companion action panel, turn order tracker
