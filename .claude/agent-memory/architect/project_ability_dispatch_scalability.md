---
name: Ability Dispatch Architecture Scalability Assessment (2026-04-09)
description: Full scalability review of EffectDispatcher, LevelUpManager, CombatManager ability pipeline for 7 callings × 2 specs × ~150 abilities
type: project
---

## Verdict: Needs refactor before expanding (not "must do now", but work-in-front-of not behind)

The foundation (EffectDispatcher dispatch table, data-driven effects) is sound and will hold to scale. Three structural deficiencies will compound painfully if you add more callings before fixing them. One (the maneuver switch block) is a hard blocker for new spec trees.

**Why:** Each new spec tree added without fixing these will increase maintenance surface nonlinearly.

**How to apply:** Fix in priority order below before writing Scholar/Wanderlust/Instinct abilities.

---

## Structural Risks

### Risk 1 (HARD BLOCKER): Maneuver effects are a switch block, not dispatched
`executeOnHitManeuver()` in CombatManager.js (line 2534) is a `switch(maneuverType)` with hardcoded `case 'tripAttack'`, `case 'menacingAttack'`, etc. The `effects` field on these abilities reads `{ "maneuver": "tripAttack" }` — the maneuver string is never routed through EffectDispatcher. It hits CombatManager directly. The `maneuver` effect type has NO registered handler in EffectDispatcher.

At scale: every new Exemplar maneuver (or any other spec that wants a save-based on-hit effect) requires another `case` in this switch. For 6 remaining callings × 2 specs, that's potentially 20-40 more switch cases. The switch is already 60+ lines for 4 maneuvers.

**Fix:** Register `maneuver` effect handlers (or per-maneuver handlers like `maneuver_tripAttack`) in EffectDispatcher. Move the STR/WIS save logic, condition application, and damage roll to handler functions. `executeOnHitManeuver()` becomes a one-liner or disappears.

---

### Risk 2 (MEDIUM): Reaction hook is partially dispatched, partially hardcoded by ability ID
`promptReaction()` in main.js (line 316) has `if (ab.id === 'riposte')` and `else if (ab.id === 'parry')` branches. Each new reaction ability needs its own `else if` branch here. This is exactly the anti-pattern the EffectDispatcher was designed to eliminate.

Riposte fires `cm.attack(defender, attacker, 'mainHand', { shouldConsumeAction: false, extraDamage: dieRoll })`. Parry returns `{ damageReduction: reduction }` to the caller. These are both expressible as EffectDispatcher effect types with appropriate context injection.

At scale (Oath's Retribution, Wanderlust's Uncanny Dodge, Bond's Primal Strike reaction, etc.): `promptReaction()` grows into a long if/else chain. The reaction modal becomes a hardcoded dispatch table.

**Fix:** Reaction abilities execute via EffectDispatcher like any other. The modal calls `execute(ability, ability.effects, reactionContext)`. Two new handler types are needed: `reactionAttack` (fires a counter-attack) and `damageMitigation` (returns reduction to caller via result). The `promptReaction` function reduces to filtering + dispatching.

---

### Risk 3 (MEDIUM): `abilities.json` is organized by calling, but the maneuver-vs-ability distinction is invisible
All Exemplar maneuvers (`tripAttack`, `menacingAttack`, etc.) and all Oath abilities (`swornStrike`, `aidTheVulnerable`) live in the same `"dedication": []` array. The only difference is the `specialization` field. When Scholar, Wanderlust, and Bond are added, their abilities, spells that work as abilities, and practices with active components will share this array unless the schema enforces separation.

`getFilteredAbilities()` in LevelUpManager currently filters by `specialization` — so the grouping is functional. But `renderManeuverChoice()` explicitly grabs `ab.specialization === 'exemplar'` from the dedication array (line 551-552). This hardcodes "Exemplar lives in dedication array" in the UI.

**Fix (schema):** Add a `subtype` field to ability entries: `"subtype": "maneuver"` for Exemplar maneuvers, `"subtype": "ability"` for standard active abilities. The maneuver choice panel filters on `subtype === 'maneuver'` rather than `specialization === 'exemplar'`. This generalizes across future specs that may also have select-from-list mechanics.

---

### Risk 4 (LOW, watch): `getSpecializationDescription()` in LevelUpManager is hardcoded
Line 582: the description lookup is a literal JS object with keys like `exemplar`, `oath`, `champion`, etc. The TODO comment acknowledges this (`// TODO: Load from specializations.json when implemented`). `data/specializations.json.example` exists but the actual file does not.

At scale: 14 specializations × hardcoded descriptions = maintenance pain.

**Fix:** Create `data/specializations.json`. LevelUpManager loads it and looks up by ID. One-time work, but must be done before Scholar level-up UI is needed.

---

### Risk 5 (LOW, architectural hygiene): Spell levels hardcoded in `getFilteredSpells()`
Line 185: `['cantrips', 'level1', 'level2'].forEach(...)`. When spells go to level 3+, this list needs manual extension.

**Fix:** Read max spell level from `RULES.spells.maxSpellLevel` (or derive from levelProgression.json) rather than a hardcoded array.

---

## What Scales Fine (No Changes Needed)

**EffectDispatcher handler map:** A flat `handlers` object with string keys is O(1) lookup. At 50+ handlers it is still a flat map — no naming collisions are possible as long as handler names are unique. The `META_KEYS` set prevents `choice` and `options` from being dispatched. The existing `extraAction`, `heal`, `dodge`, `weapon_attack`, `variableCostDamage`, `variableCostHeal`, `cureCondition` handlers cover the patterns Oath introduces and generalize cleanly. Adding 40 more handler types (one per new effect category) keeps the same flat structure.

**LevelUpManager generic path:** `grantedResource` processing (lines 766-834) reads `id`, `formula`, `minimum`, `recharge` from progression data and sets `character.max{Id}Points`, `character.{id}Points`, `character.{id}Recharge` dynamically — fully generic. Every new calling's resource system works without new LevelUpManager code as long as levelProgression.json has the right `grantedResource` entries.

**`autoGrantAbilities` in specializationFeatures:** Also fully generic. Oath already uses it. Any future spec can list ability IDs in `autoGrantAbilities` and they'll be pushed to `character.selectedAbilities` without code changes.

**`choice` + `options` pattern in effects:** The ability to nest multiple options under `effects.choice: true` (as in Steady Nerve and Aid the Vulnerable) is a clean solution for pick-one abilities. It scales to any number of options without new dispatcher logic.

**Spell vs ability separation:** spells in `data/spells.json`, abilities in `data/abilities.json`. Correct. Do not merge. They have different dispatch paths (spell slots vs resource pools), different UI (spell level badges), and different progression hooks (Scholar's spellbook vs Oath's Resolve).

---

## Priority Order for Changes Before Adding New Callings

**Must do now (before any Scholar/Wanderlust/Instinct abilities are written):**

1. Register `maneuver` effect handlers in EffectDispatcher — eliminates the switch block in CombatManager. This is the only change that blocks new spec trees from being added cleanly.

2. Add `subtype` field to abilities.json entries. Maneuvers get `"subtype": "maneuver"`. Update `renderManeuverChoice()` to filter on `subtype` instead of `specialization === 'exemplar'`. This makes the maneuver-choice panel work for any future spec with a "choose from list" mechanic.

**Can wait (before level 5+ content, or before Oath's additional reactions):**

3. Move Riposte and Parry execution out of `promptReaction()` if/else into EffectDispatcher handlers (`reactionAttack`, `damageMitigation` effect types). Until more reaction abilities exist, the two-branch if/else is manageable.

4. Create `data/specializations.json` and wire `getSpecializationDescription()` to read from it. Required before Scholar/Wanderlust spec choice UI is needed in character creation or level-up.

**Low priority / technical debt (can wait until post-launch or when it bites):**

5. Replace hardcoded `['cantrips', 'level1', 'level2']` with a data-driven max spell level.

---

## Schema Changes Needed in JSON Before More Callings

In `data/abilities.json`: add `"subtype"` field to each ability entry.
- `"subtype": "maneuver"` for Exemplar maneuvers (tripAttack, riposte, parry, etc.)
- `"subtype": "ability"` for standard active abilities (all others)
- `"subtype": "reaction"` optional — or just rely on `actionType: "reaction"` which already exists

In `data/specializations.json`: create this file (currently only `.example` exists). Minimal schema:
```json
{
  "specializations": [
    {
      "id": "exemplar",
      "calling": "dedication",
      "name": "Exemplar",
      "description": "...",
      "campaignIds": ["core"]
    }
  ]
}
```

In `data/levelProgression.json`: the current structure is solid. Ensure each new calling's entries have `grantedResource` blocks for their resource system. No schema changes needed.
