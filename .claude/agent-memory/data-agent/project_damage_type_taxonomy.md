---
name: project-damage-type-taxonomy
description: Locked 6-type damage taxonomy (blood/bone/injury/elemental/psychic/resonant), migration completed 2026-07-31, schema quirks found during the migration
metadata:
  type: project
---

**Locked taxonomy (decided 2026-07-31, see `docs/plans/2026-07-30-attribute-system-remap.md` "Damage type overhaul"):** 6 types only, two trios.

| Physical | Non-physical | Trait |
|---|---|---|
| blood | elemental | DOT-capable |
| bone | psychic | plain, no resist/vuln behavior |
| injury | resonant | neutral — never resisted or exploited |

Deprecated and fully migrated off as of 2026-07-31: `lightning`, `cold`, `fire`, `piercing`, `necrotic`, `bludgeoning`, `weapon`, `environmental`. Zero remaining as `damageType` (or monster nested `damage.type`) values anywhere in `data/*.json` — verified by grep sweep.

**`src/core/rulesEngine.js:101-108` (`RULES.combat.damageTypes`) is the authoritative structure and was already correct before the data migration** — its `elemental` array (`['fire','cold','lightning','poison','necrotic','acid','void']`) lists granular *sub-flavors* still legitimately used inside `damageResistances`/`damageVulnerabilities`/`damageImmunities` arrays (e.g. a monster can still resist `"fire"` specifically). Those flavor arrays were deliberately **left untouched** in the migration — only the top-level `damageType` field on an actual attack/spell/hazard instance had to collapse to one of the 6 canonical values. Don't blanket-migrate `damageResistances`-style arrays without checking this distinction first.

**Migration mapping applied (judgment calls, not mechanical find-replace):**
- `fire`/`cold`/`lightning`/`necrotic` (as a `damageType`) → `elemental` uniformly. This isn't really a judgment call — `rulesEngine.js` already classifies all four as elemental-family, so it's a direct code-consistency mapping, not narrative inference. Applies to spell damage, monster attacks, and monster DOT traits (e.g. undead life-drain, void-creature "Void Presence" damage-on-turn-start).
- `piercing`/`bludgeoning` → `blood`/`bone` respectively, per the pre-existing weapon-roster precedent (`docs/plans/2026-07-01-core-weapon-roster-expansion.md`: RAW piercing/slashing → blood, RAW bludgeoning → bone). Applied uniformly in `skillChallenges.json` (trap damage, thorns → blood; falls, forced doors, muscle strain, river/surf impacts → bone).
- `environmental` → split per entry, not uniform: fall/physical-hazard flavor (quicksand, losing footing, being swept by current) → `bone`, matching the design lead's own worked example (blunt trauma). Generalized weather/climate-endurance damage with no impact/fall narrative (heat exhaustion, multi-biome "harsh conditions") → `elemental`, since it's temperature/climate-flavored rather than physical impact.
- `weapon` (found once, in `spells.json`'s Hunter's Mark bonus damage) → checked `src/` first: no code anywhere reads `damageType === 'weapon'` or references `huntersMark` by id — the field was unconsumed/dead data, not a live dynamic-resolution sentinel. Mapped to `blood`, reasoning from the ability's fictional fit (Wanderlust calling's typical finesse/ranged weapon kit is piercing/slashing-family). Flagged for `backend-dev`: if this bonus damage effect gets wired up, it arguably should dynamically match the wielding character's actual weapon type rather than being hardcoded.
- `necrotic` → always mapped to `elemental` in this pass (not `psychic`) — every occurrence found was a literal life-force-drain mechanic (HP-max reduction, DOT tick), not a fear/dread-flavored effect, so the "psychic if flavor is dread not decay" branch never actually applied. Keep that branch in mind for *future* necrotic-flavored content that's more about horror than drain.

**Schema quirk found:** monster nested damage objects use `"damage": {"dice": ..., "type": ...}` (key `type`, not `damageType`) for `meleeSpellAttack`/`special` action types — e.g. all 5 void/aberration monsters (`voidTrace`, `voidSpawn`, `voidHunter`, `voidShaper`, `voidTitan`) and their shared `Void Presence` trait's `damageOnTurnStart.type`. A grep for `"damageType"` alone misses this — always also grep for `"type": "<deprecated-value>"` scoped to `damage`/`damageOnTurnStart` objects when auditing damage-type fields in `monsters.json`.

**Code-side stale defaults flagged for `backend-dev` (not fixed by this pass — data-agent doesn't edit `src/`):**
- `src/systems/CombatManager.js:265` — `condition.damageOnTurnStart.type || 'necrotic'` fallback
- `src/systems/CombatManager.js:789` — `action.damageType || 'fire'` fallback
- `src/systems/CombatManager.js:1277` — `swornStrikeAbility?.effects?.variableCostDamage?.damageType ?? 'radiant'` fallback (`'radiant'` was never a real type at all, predates even the old taxonomy)
- `src/systems/SkillChallengeManager.js:859` — `outcome.damageType || 'environmental'` fallback

These are generic fallback defaults (not ability-specific `if` checks, so not an ADR-010 violation by themselves), but they'll silently reintroduce deprecated/invalid type strings into live combat whenever a data entry omits `damageType`. Worth a follow-up pass to update the literals to `'elemental'`/`'blood'` etc.
