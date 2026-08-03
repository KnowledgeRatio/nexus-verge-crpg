# Backend Dev Memory — Nexus Verge

- [Combat core facts & patterns](combat_core_facts.md) — plain-object characters, `Combatant.hasAction`, dice imports, gameState persist pattern, git/file conventions
- [Flee check & engagement system](combat_flee_engagement.md) — flee DC formula, `Combatant.engagedWith` Set-based bidirectional engagement
- [monsters.json field schema](monsters_data_schema.md) — `attackType`, `preferRanged`, level gating lives in rulesEngine not monster data
- [Ammunition system](combat_ammunition_system.md) — `ammoCapacity`/`ammoCount`, refill consumable, forgecraft practice refill
- [Harried/Cover/Improvised Strike](combat_conditions_cover.md) — ranged-disadvantage condition, terrain cover AC, unarmed-weapon strike action
- [Party / CompanionManager](party_companion_system.md) — companion API, Phase 4a combat integration, Phase 4b skill/level-up hooks
- [Terrain lookup pattern](terrain_lookup_pattern.md) — `worldGenerator.getCachedTile` / `terrainTypes` usage in combat and HUD code
- [Fatigue system](fatigue_system.md) — `FatigueManager` pure-function API, long-rest HP recovery multiplier
- [ADR-010 ability dispatch](adr010_ability_dispatch.md) — EffectDispatcher Resolve gate, effect-type handler catalog, Exemplar maneuver migration
- [ConsequenceManager](consequence_manager.md) — world-tag-driven delayed settlement consequence events
- [PassiveModifierRegistry](passive_modifier_registry.md) — fighting-style bonuses, never check `fightingStyle === 'X'` directly
- [CombatManager DOM decoupling](combat_dom_decoupling.md) — floating text/victory/game-over now go through `gameState.notify`
- [character.abilities `.find()` bug fix](fix_findKnownAbility_bug.md) — 2026-07-31 live bug: ability-score bag isn't an array; use `CombatManager._findKnownAbility()`
- [Attribute remap M1 step 6](attribute_remap_m1_formulas.md) — blend formulas, monster save shim; **2026-08-01 correction**: 3 bugs found post-"370 passing" (missing /2 division, unpopulated six-attribute abilities, unused save override) — real-construction-vs-fixture test blind spot
- [Attribute remap M2-readiness sweep](attribute_remap_m2_readiness_sweep.md) — 2026-08-01: generic `calculateAbilityModifiers` fix, `skills.json` dual-attribute field, 4 hardcoded skill->ability copies found; all 4 now fixed (last 2, `SettlementUI`/`Character.updateSkillBonuses`, closed same-day follow-up)
- [Attribute remap M1 gate — real end-to-end verification](attribute_remap_m1_gate_e2e_verification.md) — 2026-08-01: real chargen→Character, real monster spawns (all 3 paths), real live combat, 0 new bugs, system judged genuinely functional; found non-blocking `.con`-hardcode debt + `initializeSavingThrows()` still 6-key not 3-key
- [Weapon/monster damage shape bugs fixed](combat_weapon_damage_shape_bugs.md) — 2026-08-01: `weapon.damage` string-vs-object mismatch (every weapon fell back to 1d4), void-monster `action.damage` object crash; saving-throws sixAttribute gap found but not fixed (design call)
