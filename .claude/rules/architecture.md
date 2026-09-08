# Architecture Rules

## Modifiability First (ADR-000)
The primary design concern. Every system must pass this checklist:
1. Can be disabled via a config flag in `rulesEngine.js`
2. Loads content from data files (not hardcoded)
3. Can be extended without modifying existing code
4. Changes don't break other systems

## Data Drives Code — Never the Reverse (ADR-010)
JSON files are the single source of truth for what abilities exist, what they cost, and what effects they apply. The code provides **generic dispatch infrastructure** keyed to *effect handler types*, not to specific ability IDs or names.

**If you find yourself writing `if (ability.id === 'X')` or `if (ability.effects?.specificAbilityName)` for a named ability — stop.** Define a generic handler and wire the JSON to it.

## Observer Pattern
All shared state lives in `gameState`. UI components subscribe to relevant state keys and auto-update.

```javascript
gameState.subscribe('character.currentHP', (hp) => updateHPDisplay(hp));
gameState.set('character.currentHP', newHP); // triggers subscriber
```

Never mutate state directly. Always use `gameState.set()`.

## Seeded Generation
All procedural generation must use the world seed for determinism.

```javascript
const regionSeed = seedToNumber(`${worldSeed}_${regionX}_${regionY}`);
const rng = createRNG(regionSeed);
```

Same seed = same world, always.

**Exemption — live combat and interactive rewards**: Combat dice rolls (attack, damage, saves, maneuver dice) and consequence reward amounts intentionally use `Math.random()`. Seeding these would allow save-scumming (reload → same outcome). This exemption is deliberate and does not apply to world/dungeon generation.

## Non-Grid Combat (ADR-014)
This game has no movement grid. Speed values and distance are narrative-only. Any D&D 5e mechanic that is purely a movement modifier (e.g. the Slow weapon mastery's "reduce speed by 10 ft") is meaningless in this context and **must be replaced with a functionally equivalent non-movement effect** when implemented.

Current substitutions:
| RAW mechanic | This game's substitute | Rationale |
|---|---|---|
| Slow mastery: -10 ft speed | -1 AC until start of your next turn | Speed is N/A; AC reduction preserves the "slowing" tactical feel |
| Pushing Attack: push target away | Target cannot make melee attacks against the attacker until the start of their next turn | Distance/positioning is N/A in this game; disabling their retaliation preserves the "pushed away" tactical feel |

Document any future substitutions in this table.

## World-Gen-Time Computation
Anything computable from the seed must be computed at world-gen time in `worldMetadata`, not deferred to region load time. Use `_sampleTerrainAt(x, y)` to query terrain type without loading a full region.

## Rules Engine
All balance values and game rules go in `src/core/rulesEngine.js`. No magic numbers in system code. If a value might ever need tuning, it belongs in `RULES`.

```javascript
RULES = {
  combat: { criticalHitRange: [20], ... },
  flee: { baseDC: 10, engagedEnemyDCModifier: 2, ... },
  movement: { baseMoveDelay: 150, maxMoveDelayMultiplier: 2.0, ... },
}
```

## Save/Load Serialization Contract (ADR-011)

`Map` objects (`generatedRegions`, `npcs`) must be serialized as arrays and reconstructed via `deserializeMap()` on load. Never `JSON.stringify` a Map directly.

Transient fields must be **excluded from `toJSON`** and initialized to defaults in `fromJSON`:

| Field | Default on load |
|-------|----------------|
| `party.candidates[]` | `[]` |
| `party.activeSynergies` | computed on read — never stored |
| `companionMeta.devotedPassiveUsedThisRest` | `false` |
| `dungeon.active` | `false` |

Old saves load gracefully via `savedData.party ?? defaultValue` patterns. Never write migration scripts. Never fail on missing keys.

## Campaign Content Filtering (ADR-013)

`campaignIds` on every data entry controls which campaigns include it. Filtering runs **once at load time** in each manager — never at runtime lookup. Absent or `["core"]` = included everywhere. Campaign inheritance is defined in `data/campaigns.json`.

Never reference `campaignIds` in game logic. If a manager loads data without filtering by campaign, that's a bug.

## Party System Architecture (ADR-012)

Design is locked (2026-03-09). Key constraints:

- Companions are `Character` instances with `companionMeta` attached after construction. `party.candidates[]` is transient (not persisted). `party.activeSynergies` is computed on read via `CompanionManager.getActiveSynergies()` — never stored.
- Combat uses BG3-style direct control. Every combatant rolls **individual initiative**. Turn order is a single unified queue — no team grouping.
- Effective party size uses `1 + (companionCount * 0.75)`. **Floor this before passing to `buildMinionGroup`** — integer equality breaks on floats.
- `CombatManager.endCombat()` **must** emit `gameState.notify('combat.ended', { outcome })` before returning. `CompanionManager` subscribes to this — it is the only coupling point between the two systems.
- Fled/TPK outcomes = permanent companion death. Victory = auto-stabilize to 1 HP.
- `CompanionManager` does not touch the DOM. All UI wiring is in `main.js`.

## Forking a Live System (ADR-015)

*Established 2026-08-03, from the six-attribute system remap.*

When replacing a live, load-bearing system (a whole stat system, a combat formula set, anything ADR-000's "changes don't break other systems" clause is really worried about), fork it behind a single config flag rather than migrating in place. The old path must stay byte-identical and fully functional for the entire time the new one is being built — verified by characterization tests written *before* any refactoring starts, not after.

**Sub-rules, each earned by a real bug this session:**
- **Data must actually flow, not just be structurally correct.** A resolver/handler that's generically correct is worthless if nothing populates the data it reads. Every "the code handles this generically" claim needs a paired "and something real feeds it data" check.
- **Test through real construction, not hand-built fixtures.** Fixtures encode what the author *expected* the data to look like, which is exactly where production drift hides. Build the object through its real constructor/factory in tests, not a synthetic stand-in — this is how multiple critical bugs shipped past isolated unit tests in this remap.
- **One instance of a hardcoded-pattern bug means there are more.** When a hardcoded-legacy-keys or hand-copied-mapping bug is found and fixed in one place, grep the whole codebase for the same pattern before moving on — it recurred 3-4 times in this remap alone.
- **Stack independent verification layers.** Design-stage math review, implementation architecture review, balance simulation, adversarial stress-test, and a real end-to-end integration run each caught something the previous layer missed. None of them alone was sufficient.
- **Uncommitted parallel work is still real work.** Never run `git checkout`/`reset`/`stash`/`clean` on a file with uncommitted changes, even to self-correct — see workflow.md's "Git Safety for Subagents." A fork process routinely has substantial uncommitted state across many files at once.
- **The cutover is a human decision, not a milestone.** Flipping the flag to make the fork live is gated on real hands-on playtesting with a defined rollback window — "tests are green" is necessary, never sufficient.

**Maintaining a fork while both paths are active:** the dual-field data pattern (an old-path field plus a sibling new-path field on the same entry) is temporary scaffolding with an end date, not a new permanent authoring style — it retires once the fork is proven and the old path is deleted. While it's active:
- **New content is authored in both shapes, always, in the same change.** A new data entry with only the old-path field populated works today (the old path is what's exercised) and silently breaks the new path the moment anyone checks it — this was a repeated failure mode in this remap.
- **New code never reads the old path's raw fields directly.** Route through the generic resolver/dispatch layer the fork introduced, not the legacy field names — that's what makes new code automatically correct on both paths instead of needing to be written twice.
- **Test coverage must exercise the inactive path deliberately.** Whichever path isn't the current default is invisible to normal testing unless a test explicitly switches to it — every test added for a fork-affected feature needs a variant on the other path, or regressions there go undetected until the flip.

## Server-Held Saves (ADR-017)

*Established 2026-08-14.*

Save persistence is forked behind `RULES.saves.backend` (`'local'` | `'cloud'`), per ADR-015.
`'local'` is the default and remains the rollback path.

- `SaveManager` owns **serialization only**. Persistence goes through a store implementing
  `getSlots()` / `read(slot)` / `write(slot, save, metadata)` / `remove(slot)`, all async.
  No `localStorage` access may return to `SaveManager`.
- `CloudSaveStore` wraps `LocalSaveStore` as a **write-through cache**, not a replacement.
  Every cloud path falls back to the cache on failure — an unreachable API must never lose a save.
  Writes return `{ synced, warning }` so the UI can say "device only" rather than claiming success.
- Identity is a **player name plus a recovery code, both required**. The blob key is
  `HMAC-SHA256(username + ":" + code, SAVE_TOKEN_SECRET)`. There is no identity provider, no
  password, and no PII.
- **`SAVE_TOKEN_SECRET` is permanent.** Every save's storage path derives from it; rotating it
  orphans all saves simultaneously. It is not a credential that can be cycled on a schedule.
- Server-held saves are **continuity, not trust**. The rules engine remains client-side, so the
  API stores whatever the client submits. Do not build leaderboards or anti-cheat on this.
- SWA managed functions allow **HTTP triggers/bindings only** — blob access uses the
  `@azure/storage-blob` SDK directly, never an input/output binding.

Setup and operations: [`docs/CLOUD_SAVES_SETUP.md`](../../docs/CLOUD_SAVES_SETUP.md).

## NVSystem Balance Baseline (ADR-016)

*Established 2026-08-04.*

All new game balance is set against the NVSystem attribute model, not `5EClassic`.

- Balance targets, encounter math, item and ability tuning, and simulation baselines use the NV canonical attribute names and modifiers.
- `5EClassic` remains a compatibility and rollback path only; it is not a tuning reference.
- When NVSystem and classic numbers disagree, NVSystem wins for all new balance decisions.

This does not remove or disable `5EClassic`. It only defines the baseline used for future tuning and verification.

