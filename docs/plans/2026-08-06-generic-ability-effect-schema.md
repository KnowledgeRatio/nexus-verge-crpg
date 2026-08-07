# Generic Ability/Effect Schema

**Status:** Proposed — 2026-08-06

An ADR-015 fork design for making `abilities.json` maximally composable — new abilities (including future Scholar/Wanderlust spells) authorable as JSON declaring a resource, trigger, damage formula, save/DC, target scope, and a list of effects, instead of each new shape needing its own named handler in `EffectDispatcher.js`. See `.claude/agent-memory/architect/effect_architecture_ceiling_2026-08.md` for the full evidence trail this proposal builds on.

## Scope and boundaries (ADR-015 fork, not a migration)

`EffectDispatcher.js`/`CombatManager.js` are the most load-bearing code in the game (8 tactics, Sworn Strike, Aid the Vulnerable, Steady Nerve, Action Surge, Indomitable, Grace Under Pressure, Vanguard all route through them today). Nothing in this proposal edits their existing behavior — every new mechanism is either a new file or an additive call site next to existing code. Migrating existing content onto the new schema is explicitly **not** part of this proposal — that's Phase 7, human-gated, may never happen.

## 1. The schema

Reused unchanged: `actionType` (`action`/`bonusAction`/`reaction`/`onHit`/`free`/`passive`), `reactionTrigger` (`afterMiss`/`afterHit`/`afterFailedSave`) — already read generically today.

New top-level fields:

```jsonc
{
  "schemaVersion": "composable",              // discriminator — absent/"legacy" = today's shape, untouched
  "resource": { "id": "resolve", "cost": 1 }, // generic — any resource id, not a hardcoded enum
  "saveDC": { "context": "menacingAttackDC" }, // reuses RULES.attributes.derivedStatMap, no new formula language
  "target": { "scope": "singleEnemy" },        // see §3
  "effects": [ /* composable primitives, see below */ ]
}
```

`effects[]` primitive vocabulary (MVP — extend only when real content needs more):

| `type` | Fields | Behavior |
|---|---|---|
| `damage` | `formula`, `damageType`, optional `halfOnSuccess` | Reuses existing dice/formula evaluation; independently gated on save result via `requiresSaveFail`/`requiresSaveSuccess` |
| `applyCondition` | `condition` (any string), `duration`, `roundsRemaining?`, `icon?`, `requiresSaveFail?` | Calls existing generic `addCondition()` — zero change to condition storage |
| `heal` | `formula` | Reuses existing heal handler's HP-clamping |
| `tempHP` | `formula` | Reuses existing temp-HP-via-condition pattern |

**Worked example 1 (Menacing Attack re-expressed, proves no behavior change):**
```jsonc
{
  "id": "menacingAttack", "actionType": "onHit", "schemaVersion": "composable",
  "resource": { "id": "resolve", "cost": 1 },
  "saveDC": { "context": "menacingAttackDC" },
  "target": { "scope": "singleEnemy" },
  "effects": [
    { "type": "damage", "formula": "tacticDie", "damageType": "bludgeoning" },
    { "type": "applyCondition", "condition": "frightened", "saveType": "composure",
      "duration": "untilEndOfTurn", "icon": "😱", "requiresSaveFail": true }
  ]
}
```

**Worked example 2 (a hypothetical new ability, proves the schema generalizes past Dedication/Resolve):**
```jsonc
{
  "id": "unnervingGlareEXAMPLE", "actionType": "onHit", "schemaVersion": "composable",
  "resource": { "id": "focus", "cost": 2 },
  "saveDC": { "context": "focusGlareDC" },
  "target": { "scope": "singleEnemy" },
  "effects": [
    { "type": "damage", "formula": "2d6", "damageType": "psychic" },
    { "type": "applyCondition", "condition": "frightened", "saveType": "composure",
      "duration": "rounds", "roundsRemaining": 2, "icon": "😱", "requiresSaveFail": true }
  ]
}
```
Paired with one `data/resources.json` entry for `focus` and one `derivedStatMap` entry for `focusGlareDC`, this is a complete new ability authored entirely in JSON, spending a resource that doesn't exist anywhere else — proof the schema doesn't secretly assume Dedication/Resolve.

**Spells as a special case, not a separate system:** since this engine has no movement grid (ADR-014), and the schema's `resource`/`saveDC`/variable-cost patterns already generalize, a future Scholar spell is expected to just be an ability with `resource: {id: "mana"}` and `tags: ["spell"]` for UI classification — the same relationship "tactic" already has to the base ability schema (a `tags` value, not a separate mechanism). Variable-cost abilities (Sworn Strike, Aid the Vulnerable) already have the same shape as 5e's "cast at a higher slot level does more" — no new infrastructure needed for that specifically. The one real exception: **concentration** (an exclusivity/lock mechanic, not a resource-cost question) isn't solved by this schema and isn't blocking anything since no live spells exist yet — flagged for whenever Scholar is actually designed.

## 2. Generic resource pools

`resource.id` resolves against a new `data/resources.json` (definitions, not ability data):
```jsonc
{ "resources": [ { "id": "focus", "name": "Focus", "recharge": "shortRest", "maxFormula": "conMod + level" } ] }
```
`recharge`: `shortRest`/`longRest`/`combat`/`turn` — the last two close the "no per-combat/per-turn primitive" gap found in the reusability audit, for resource-pool-gated abilities specifically (the existing `usesPerShortRest`/`usesPerLongRest` ability-uses tracker is untouched).

`character.resourcePools = { focus: { current, max } }` — new, generic container. Populated/refreshed by a new `refreshResourcePools(character, trigger)`, called additively from inside existing `shortRest()`/`longRest()` — does not touch the existing `abilityUses = {}` reset line.

## 3. Targeting and AOE

Non-grid combat (ADR-014) means AOE can't be shape/radius-based ("15ft cone") — `data/spells.json` already has dormant `areaOfEffect` fields like this, unenforced since Scholar isn't live, a real latent contradiction. Resolution: **AOE is scope-based, not shape-based** — "all enemies," not "everyone in a cube." Reuses `combatant.team` filtering already used elsewhere in `CombatManager.js`.

Core scopes (locked direction, not yet finalized as a full list):
```jsonc
"target": { "scope": "self" | "singleAlly" | "singleEnemy" | "allAllies" | "allEnemies" | "allCombatants" }
```

**Parked for a dedicated game-designer pass — not yet decided which of these ship in v1:**

| Proposed scope | What it reads | Reuses |
|---|---|---|
| `engaged` | Everyone currently locked in melee with you | `combatant.engagedWith` (already live — Vanguard, Rally, flee-DC) |
| `engagedWithSameTarget` | Allies engaged with the same enemy as you | Same `engagedWith`, read from the other side |
| `turnOrderAdjacent` | Whoever acts immediately before/after you in initiative | The unified initiative queue (ADR-012) — the non-grid substitute for "adjacent," worth an ADR-014 table entry once locked |
| `lowestHP` / `highestHP` | Single most/least-wounded ally or enemy | Sort over `combatant.hp`, no new tracking |
| `random` (+ count) | N random valid targets from a pool | Non-grid stand-in for a chain/bounce effect |
| `conditioned` | All combatants (team-scoped) carrying a specific condition | `combatant.conditions` — chains off the same pattern Grace Under Pressure uses |

`random` and `conditioned` are lower priority — useful later, not blocking. `turnOrderAdjacent` is the one closest to "needs to exist" since it's the direct non-grid substitute for a real spatial concept other systems will eventually want.

## 4. Closing "conditions are storage-generic, not effect-generic"

New `data/conditions.json` (declarative condition → roll-modifier table) + new `src/systems/ConditionEffects.js` (`getConditionModifiers(combatant, context)`, pure/stateless, modeled on the confirmed-working `PassiveModifierRegistry.js` pattern).

```jsonc
{ "conditions": { "frightened": { "modifiers": [ { "context": "attackRoll", "disadvantage": true } ] } } }
```

**Additive-only for the duration of the fork** — the ~15 existing hardcoded `hasCondition('...')` checks in `CombatManager.attack()` are not rewired. `getConditionModifiers()` gets exactly one new call site, feeding a new accumulator alongside existing ones (`fatigueAttackMod`, etc.). Net effect: a brand-new condition gets real mechanical teeth with zero new JS; existing conditions (frightened, dodging, prone, sapped, harried, pushed, disarmed) keep behaving exactly as today. Collapsing those onto the registry is a separate, later, behavior-preserving `refactor-engineer` cleanup.

Does not solve Vanguard's pre-attack unengaged-target check or Grace Under Pressure's condition-history cross-reference — those are condition-*presence* checks against a specific attacker's history, a different primitive, not attempted here.

## 5. `traits.json`'s dead effect schema

**Recommendation: retire, don't resurrect.** Its vocabulary (`attackBonus`, `acBonus`, `damageBonus`, etc.) is shaped for passive always-on stat modifiers — `PassiveModifierRegistry.js` already handles this shape and is confirmed live. Both traits shipped since (Vanguard, Grace Under Pressure) ship `effects: []` because the old vocabulary doesn't fit triggered effects anyway. Concrete plan: migrate the 8 Fighting Styles into a new `data/fightingStyles.json` using `PassiveModifierRegistry`'s convention, delete the dead vocabulary from `traits.json`. Independent of this whole proposal — a `refactor-engineer` job, can happen any time, not gated on the fork.

## 6. Fork mechanics

```js
// rulesEngine.js
effects: { composableSchemaEnabled: false }  // master kill switch, default off
```

Per-ability `schemaVersion` discriminator + one master boolean — **not** a single global mode enum like the attribute system's `RULES.attributes.system`, because abilities are permanently heterogeneous content (old and new shapes coexist forever), unlike attributes which describe one uniform interpretation layer.

New files: `data/resources.json`, `data/conditions.json`, `src/systems/EffectDispatcherV2.js`, `src/systems/ConditionEffects.js`, `data/fightingStyles.json` (independent, §5).

Additive-only edits: `rulesEngine.js` (new block), `formulaEvaluator.js` (**must** gain new-system attribute keys before Phase 3 — today only knows legacy `str/dex/con/int/wis/cha` shortcuts, silently drops unknown keys via a `console.warn`, not a hard failure — a real trap if missed), `Character.js` (new `resourcePools` branch in `shortRest()`/`longRest()`, doesn't touch existing `abilityUses` line), `main.js` (one new branch at the existing `useAbility()` dispatch site), `CombatManager.js` (one new branch at the existing onHit dispatch site, one new additive call near the existing `hasCondition` block).

## 7. Prerequisite: characterization test coverage audit

**Gap found, must close before Phase 3:** no dedicated characterization tests found for Sworn Strike (`variableCostDamage`), Aid the Vulnerable (`variableCostHeal`), Steady Nerve, or Action Surge (`extraAction`). Existing coverage: `tests/systems/effectDispatcher.characterization.test.js`, `tests/systems/dedicationLevel2to9.test.js`, `tests/systems/combatManager.characterization.test.js`, `tests/systems/effectDispatcher.sixAttribute.test.js`. Per ADR-015, "old path must be provably unchanged" — this gap gets closed first, not discovered after.

## 8. Phased implementation order (not started — for later execution)

1. Characterization-test coverage audit + gap-fill (Sworn Strike, Aid the Vulnerable, Steady Nerve, Action Surge)
2. Flag + `schemaVersion` discriminator plumbing only — zero new gameplay, prove nothing changes with the flag off
3. Resource pools (`data/resources.json`, `character.resourcePools`, rest-hook wiring)
4. `EffectDispatcherV2` core primitives + `formulaEvaluator` extension + one real composable ability built end-to-end as a smoke test, flag still off
5. `ConditionEffects.js` + `data/conditions.json` + the one additive `attack()` call site
6. (Independent of the flag) `data/fightingStyles.json` migration + `traits.json` dead-vocabulary deletion
7. (Separate, later, human-gated, may never happen) Migrating existing abilities onto the composable schema, after real playtesting per ADR-015's cutover rule

## Risks

- **Resource-id collision**: new content using `resource.id: "resolve"` would split tracking across the old `character.resolvePoints` and the new `character.resourcePools.resolve` — two counters for what looks like one pool. Mitigation: new content avoids reusing `resolve` as an id during the fork; route all pool reads through one resolver function now so unifying later (if Phase 7 happens) is a one-place fix.
- **Two permanently-coexisting ability shapes** if Phase 7 never happens — mitigated by `data-agent` schema validation asserting `schemaVersion` consistency at load time.
- **Scope creep risk on `ConditionEffects.js`**: someone could assume it retroactively makes existing conditions data-driven. It doesn't — stated explicitly here and should be a top-of-file comment in `conditions.json` too.

## Save/load impact
`character.resourcePools` — new field, `{}` default on old saves, no migration script (ADR-011). `combatant.conditions` — unchanged shape, already serialized via `Combatant.toJSON()`.

## Handoff
Phase 1 (characterization-test audit) — `backend-dev`/`refactor-engineer`, ready to start pending design-lead greenlight. `data/fightingStyles.json` + `traits.json` cleanup (§5) — `data-agent` + `refactor-engineer`, independently ready any time. Targeting-scope finalization (§3 table) — needs a dedicated `game-designer` pass before Phase 4 needs it, not urgent yet.
