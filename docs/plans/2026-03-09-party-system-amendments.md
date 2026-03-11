# Party Member System — Approved Amendments
**Date:** 2026-03-09
**Amends:** `docs/designjams/2026-03-07-party-member-system.md` + `docs/plans/2026-03-07-party-member-architecture.md`
**Status:** All decisions locked. Ready for implementation.

---

## Decision 1 — Combat Control Model

**Decision:** Full BG3-style direct control. Player manually controls each party member on their turn.

**Initiative (locked):** Every combatant — player, each companion, each enemy — rolls individual initiative (d20 + DEX modifier) at combat start. Turn order is a single unified queue sorted highest to lowest, DEX as tiebreaker. No grouping by team. Companions and enemies are fully interleaved in the queue. This is the existing system; companions are added to the same initiative roll loop with `team: 'companion'`.

**Implementation:** `startTurn()` detects team. Player/companion turns wait for player input via the action panel. Enemy turns auto-resolve. No stance system needed.

---

## Decision 2 — Relationship Event Triggers

**Decision:** Ship only the 4 events that have existing code hooks. The other 8 are roadmap items — do not wire phantom triggers.

**Ship with:**
| Event ID | Hook Location |
|----------|--------------|
| `companionDowned` | `CombatManager.endCombat()` |
| `winHardFight` | `CombatManager` victory branch |
| `fleeCowardly` | Flee mechanic in `CombatManager` |
| `takeAllLoot` | `LootManager` (hook on loot distribution) |

**Roadmap (do not implement now):** `saveCivilian`, `abandonCivilian`, `exploreOptionalRuin`, `letCompanionDecide`, `skipDungeonExploration`, `acceptHighRiskQuest`, `shareLootFairly`, `overridePreference`

The `companions.json` schema retains all 12 event types with their deltas — the data is complete. Only the code trigger sites are deferred.

---

## Decision 3 — Retreat Outcome

**Decision:** `fled` outcome = permanent companion death for downed companions. Same as `tpk`.

**RULES.party addition:**
```javascript
outcomeMap: {
    victory: 'stabilize',   // Downed companions auto-stabilise to 1 HP, free
    fled:    'permanent_death',
    tpk:     'permanent_death'
}
```

**UI requirement:** When the player attempts to flee with one or more companions downed, the flee button tooltip must show: *"Flee — [CompanionName] will be lost (downed)."* This must be implemented in Phase 5 (UI glue) alongside the flee button rendering.

---

## Design Amendments

### `RULES.party` value changes
| Field | Old | New |
|-------|-----|-----|
| `companionActionEconomyFactor` | 0.6 | **0.75** |

### `companions.json` value changes
| Item | Old | New |
|------|-----|-----|
| `splitTheSpoils.maxRelationshipDelta` | 15 | **10** |
| `splitTheSpoils` — access requirement | none | **requires Trusted tier** |

### Knowledge devoted passive — replace
Old: "Companion reveals the type of the next dungeon boss before entry."
**New:** "Companion grants +1 to all Investigation and Academia skill checks for the next dungeon."
Update `trigger` to `onDungeonEntry`, effect to `{ skillBonus: 1, skills: ["investigation", "academia"], scope: "nextDungeon" }`.

### Freedom companion — combat override exemption
The `overridePreference` relationship event (`delta: -15` for Freedom) must **not** fire during combat turns. Direct control during combat is mechanical, not a social override. The event only fires for explicit out-of-combat decisions (quest path choices, dismissing a companion mid-conversation, forcing a rest activity).

Add a guard in `applyRelationshipEvent()`:
```javascript
if (eventId === 'overridePreference' && gameState.get('combat')?.active) return;
```

### Companion level-up — batched modal
- All companions level up simultaneously with the player.
- **Only L3 specialization** requires player choice per companion (modal prompt, one companion at a time).
- **L4 ASI**: auto-pick the companion's primary ability score. No modal.
- All other levels: auto-apply, no modal.
- The level-up sequence fires: player modal → companion L3 modals (if applicable) → done.

### Fallen companions record
Add to save file:
```json
"fallenCompanions": [
    { "name": "Mira", "calling": "dedication", "level": 5, "motivation": "duty", "cause": "tpk" }
]
```
Display on game over screen and victory screen as a "Those We Lost" section. Implementation in Phase 5.

### Companion reaction lines
Add 20–25 short authored strings for high-delta events (≥ ±8 delta). These are brief floating log messages, not dialogue trees. Format: `"[Name] looks disappointed as you retreat."` Stored in `companions.json` under each motivation archetype's `reactionLines` object, keyed by event ID. Implementation in Phase 4 (CompanionManager fires the line when the event fires).

---

## Architecture Amendments

### `combat.ended` event emission (MUST add)
`CombatManager.endCombat()` must emit this event at the end of each branch (victory, fled, tpk) **before** returning:
```javascript
gameState.notify('combat.ended', { outcome: result }); // 'victory' | 'fled' | 'tpk'
```
`CompanionManager.initialize()` subscribes:
```javascript
gameState.subscribe('combat.ended', (result) => this.handlePostCombat(result));
```

### Combatant → Character back-reference
In `startCombat()`, when creating companion Combatants:
```javascript
combatant.sourceCharacter = companion; // Back-reference for isDowned writeback
```

### `buildMinionGroup` — floor effective partySize
`getEffectivePartySize()` returns a float. Floor it before passing to `buildEncounter()` to avoid `partySize === 1` strict-equality failures in `buildMinionGroup`:
```javascript
partySize: Math.floor(gameState.getEffectivePartySize?.() ?? 1)
```

### `activeSynergies` — computed, not persisted
Remove `activeSynergies` from `gameState.data.party` storage and `toJSON`. Compute via `CompanionManager.getActiveSynergies()` on read. This eliminates the sync bug where dismissing a companion leaves stale synergy state.

### `devotedPassiveUsedThisRest` — transient only
Exclude from `toJSON`. In `fromJSON`, initialize to `false` explicitly. Do not persist.

---

## Implementation Checklist

**Before writing any code:**
- [x] Decision 1 locked: BG3 direct control + individual initiative
- [x] Decision 2 locked: 4 event triggers only
- [x] Decision 3 locked: fled = permanent death, surfaced in flee UI

**Phase 1 (Data):**
- [ ] Create `data/companions.json` per architecture doc schema, with amendments above applied
- [ ] Add `RULES.party` to `rulesEngine.js` with `factor: 0.75`, `outcomeMap`, `splitTheSpoilsMax: 10`

**Phase 2 (CompanionManager):**
- [ ] Implement all methods per architecture doc
- [ ] Only wire 4 relationship event triggers (see Decision 2)
- [ ] Include `overridePreference` combat guard
- [ ] Include reaction line firing on high-delta events

**Phase 3 (GameState):**
- [ ] Add `party` state, methods per architecture doc
- [ ] `activeSynergies` computed only (not stored)
- [ ] `fallenCompanions: []` added to `initNewGame()`

**Phase 4 (System hooks):**
- [ ] `CombatManager`: add `combat.ended` emit, companion combatants, individual initiative, `sourceCharacter` ref, downed handling
- [ ] `EncounterBuilder`: floor partySize
- [ ] `SkillChallengeManager`: `getSkillModifier` overload
- [ ] `LevelUpManager`: decouple `confirmLevelUp`, batch companion modal flow
- [ ] `Player.js`: pass `getEffectivePartySize` to `buildEncounter`

**Phase 5 (UI):**
- [ ] Party health bar (persistent, all 4 members)
- [ ] Turn order tracker (unified, companion entities labeled distinctly)
- [ ] Companion action panel (switches context on companion turn)
- [ ] Flee button tooltip with downed companion warning
- [ ] Fallen companions display on game over / victory screen
