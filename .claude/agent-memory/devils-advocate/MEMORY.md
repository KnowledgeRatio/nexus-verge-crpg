# Devil's Advocate - Agent Memory

## Recurring Anti-Patterns

### 1. Hardcoded Per-Ability Branches (2026-02-27)
- `useAbility()` in `src/main.js` uses `if (ability.id === 'xxx')` for each ability
- No generic effect dispatch system exists
- Same problem will affect spells -- both share effect vocabulary (damage, healing, dodge, etc.)
- Data schema in `abilities.json` and `spells.json` already describes effects generically, but code doesn't interpret them
- See `patterns.md` for proposed EffectDispatcher design

### 2. Incomplete Resource Checking
- `canUseAbility()` only handles `shortRest` resource type
- Missing: `stamina`/`focus`, `longRest`, `perTurn`, `none`
- Will silently allow using abilities when resources are depleted

### 3. endTurn() Called After Bonus Actions
- `executeSteadyNerveOption()` calls `endTurn()` after consuming bonus action
- This steals the player's main Action -- gameplay bug
- Pattern: always separate "consume action economy" from "end turn"

## Key Architectural Principle
- ADR-000 in `docs/ARCHITECTURE.md`: Modifiability First
- All content data-driven, no hardcoded values
- Systems independently toggleable
- Adding new abilities/spells should require 0 JS changes

### 4. Magic-String State Machines (2026-02-27)
- `selectedAction` in main.js uses magic strings ('steadyNerveAttack', 'attack', 'attackOffHand')
- Deferred actions store state in `_pending*` fields with no cleanup on combat end/ESC/turn end
- Stale pending state can leak into next combat or next turn
- Pattern: use explicit PendingAction object with onComplete/onCancel, cleared on lifecycle events

### 5. Inconsistent Data Schemas (2026-02-27)
- Ability options use mixed formats: `"healing": "..."` vs `"effect": "dodge"` vs `"effect": "weapon_attack"`
- This forces if-chains in any code that interprets options
- Fix: normalize to `"effects": { "heal": "..." }` matching top-level ability format

## Key Architectural Principle
- ADR-000 in `docs/ARCHITECTURE.md`: Modifiability First
- All content data-driven, no hardcoded values
- Systems independently toggleable
- Adding new abilities/spells should require 0 JS changes

### 6. Flee Mechanic Implementation Traps (2026-03-04)
- `combatant.initiative` is the ROLLED VALUE (1-24), NOT the modifier. Flee bonus must use `abilityModifiers.dex + proficiencyBonus` separately.
- Melee vs ranged classification needs an explicit utility function `isRangedCombatant()` — monsters with natural attacks (wolf, rat) have no weapon slot, default to melee.
- L1 Scholar (6-8 HP) vs 3 melee enemies: expected opp attack damage 11-14 = near-certain death. Add `RULES.flee.oppAttackMinHP: 1` (cannot kill during flee attempt) or the flee button becomes a suicide button for squishy callings.
- Ranged-only encounters: zero opp attack cost = dominant "always flee" strategy for squishy callings at 50-65% success rate with no downside on failure. Accept or add ranged harassment rule.

### 7. Scope Creep in World Generation (2026-03-04)
- 5 specialists proposed rain shadow, flow rivers, 16 new terrains, climate map, transition biomes
- Actual bugs: inland beaches, double-scaling in getScaledFeatureGeneration(), no terrain validation for features
- rulesEngine.js lines 684-700 define biomeGeneration config (continentalScale, latitudeInfluence) that generateTile() NEVER USES
- Fix beaches at source (selectTerrain) not via cross-chunk post-processing -- consistency trap
- Pattern: always wire up existing config before adding new systems

### 8. Dead Config Anti-Pattern (2026-03-04)
- `RULES.worldGen.biomeGeneration` has continentalScale, latitudeInfluence, elevationWeight, boundarySharpness
- None of these are read by generateTile() or selectMacroBiome() -- they use hardcoded values
- biomeNoise channel exists (line 29) at hardcoded 0.02 scale instead of configured 0.005
- Always grep for config usage before adding new config

### 9. Party System Design Traps (2026-03-09)
- BG3 direct-control model creates pacing death in a roguelike — 4-turn rounds vs. procedural encounters. Semi-autonomous stances (Aggressive/Defensive/Support) with single override prompt is the correct model.
- Relationship event system: 12 event types × 5 motivations = 60 deltas, but 10 of 12 event triggers don't exist in the codebase yet. Only "companion downed" and "win fight" have existing hooks. Gate rest behind authored content milestones.
- `fled` vs. `retreat` outcome ambiguity in handlePostCombat — if `fled` triggers companion permanent death, fleeing with a downed companion is a silent trap. Must be defined in RULES before implementation.
- 0.6 action economy factor was not derived from a balance model. Level 1 companion may over-scale XP budget vs. actual effective contribution.
- Without mid-event companion reaction lines (brief dialogue), the hidden motivation system teaches players nothing before the Hostile departure triggers. Feedback loop is broken.

### 10. Engagement System Design Traps (2026-03-14)
- `engagedWith: Set<string>` design is sound; backward-compat getter `get hasEngaged()` is correct
- Critical flaw: OA triggers and DC formula must use the SAME authoritative set. OAs from "who has you in their set" vs DC from "your own set.size" diverge under round-1 gate.
- Round-1 gate ("combatant completed one turn") inverts DEX incentive: slow-DEX player who goes last has free escape even after 3 enemies pile on. Replace with `CombatManager.firstMeleeAttackLanded: boolean` flag.
- `pushed` condition blocks melee attacks on actor's own turn (`executeMonsterAttack()` line 467) but does NOT block OAs in `resolveFleeOpportunityAttacks()` (line 1428) — OA filter must add `!c.hasCondition('pushed')`.
- `disengagedThisTurn` flag should be a condition (`untilStartOfTurn`) to stay consistent with `pushed`, `harried`, etc.
- Disengage + Cunning Flee both cost Bonus Action — cannot chain on same turn. UI must make this clear.

### 11. Fatigue System Design Traps (2026-03-16)
- Swamp (movementCost 2.5) forces CON+0 player into Exhaustion Level on ANY inter-rest journey >80 tiles — minimum spacing is 100 tiles. Brutal cliff edge on a common terrain type.
- Mountain (movementCost 2.0): Spent at 100 tiles with CON+0. Same trap.
- Road travel (movementCost 0.8): Spent at 250 tiles. Fine. CON modifier matters far more on difficult terrain than flat land — the penalty is front-loaded where players explore interesting terrain.
- Combat grinding suppression is near-zero: 1 encounter per ~100 tiles = +3% per encounter = ~0.03% fatigue per tile from combat vs 0.5% from movement. The stated goal of "discouraging combat grinding" is not achieved by this formula alone.
- Ration system adds friction without fun: 1gp per ration, 2-3 rests between towns = 2-3gp cost. Trivially cheap. Players who think to buy rations are never punished; players who forget suffer a harsh HP penalty. Binary with no interesting decision.
- Short rest cap (2/long rest) means: at 90% fatigue with both short rests used, any movement forces Spent + Exhaustion Level with no way to avoid it. This is the hardest cliff edge.
- The reset-to-60 on Exhaustion is benign for normal play but creates a perverse ceiling: walking at 99% is costly, but crossing 100% and resetting to 60% means heavy-terrain players rationally want to burn to 100%, get the reset, then continue. The threshold incentivizes burning through rather than managing.
- Fieldcraft is a trap abstraction: Trail Sense addresses the symptom (rate) rather than the real problem (difficult terrain cliff edge). The 15%+20% reductions don't help much on swamp/mountain where the rate is 2.5x baseline.
- No negative CON ceiling defined: CON -2 (score 6) gives `max(0.5, 1.2) = 1.2` factor. That's correct math but 60% worse than CON +0 — Scholar builds that dump CON face brutal penalties on difficult terrain.

### 12. Loot System Silent Null Anti-Pattern (2026-04-14)
- `resolveItem()` in LootManager.js silently returns null for any itemId not in allItems — logs a warn, drops nothing
- ALL beast and undead flavor tables (`beast_parts_*`, `undead_remains_*`) are broken today: items exist in lootTables.json but not in items.json, so every beast/undead loot roll produces nothing
- `humanoid_armor_tier1` references `"hide"` (wrong) — actual ID is `"hideArmor"` — currently broken
- `humanoid_armor_tier3` and `tier4` reference `"halfPlate"` which doesn't exist in items.json — currently broken
- Consumables tables reference `antitoxin`, `arrow`, `bolt`, `potionOfSuperiorHealing`, `potionOfSupremeHealing` — none exist in items.json — currently broken
- Pattern: before adding entries to lootTables.json, grep items.json to verify the itemId exists exactly (IDs are case-sensitive and camelCase)

### 13. Quest Reward ID Mismatch Pattern (2026-04-14)
- Quest rewards use snake-case IDs (`"potion-greater-healing"`, `"legendary-weapon"`) that don't match camelCase item IDs in items.json (`"potionOfGreaterHealing"`, `"vorpal-sword"`)
- QuestManager currently has a TODO stub — item rewards are logged but never granted
- `vorpal-sword` has `minimumLevel: 15` but game caps at L10 — the final boss reward will NEVER drop for any player in normal play
- Pattern: quest item reward IDs must be verified against items.json AND magicItems.json; level gates must be checked against actual game level cap

### 14. Balance Systems Must Be Tuned Together (2026-04-14)
- XP formula multiplier, magic item minimum levels, and boss loot guarantees are interdependent
- Tuning them independently (separate sessions, separate proposals) creates compounding errors that only appear in combined playthroughs
- Example: XP × 2.5 + +2 items at L7 + guaranteed boss magic at L1-3 together destroy the "mildly starved" economy even if each change seems reasonable in isolation
- Pattern: balance proposals that touch XP, item gate levels, or drop rates must be reviewed in the same session

## Key File Locations
- Ability data: `data/abilities.json`
- Spell data: `data/spells.json`
- Ability UI+execution: `src/main.js` lines ~2133-2323
- Combat action dispatch: `src/main.js` lines ~1240-1290
- Resource redesign plan: `docs/plans/2026-02-25-resource-system-redesign.md`
- EffectDispatcher design + review: `.claude/agent-memory/devils-advocate/patterns.md`
- Current flee method: `src/systems/CombatManager.js` lines ~1462-1590 (redesigned, functional)
- OA resolution: `src/systems/CombatManager.js` lines 1428-1455 (`resolveFleeOpportunityAttacks`)
- Engagement flag (current boolean): `CombatManager.js` lines 473-476 (monster) and 764-766 (player)
- World gen tile selection: `src/systems/WorldGenerator.js` lines 150-412
- World gen metadata: `src/systems/WorldGenerator.js` lines 1175-1274
- Unused biome config: `src/core/rulesEngine.js` lines 684-700
- Biome terrain pools: referenced via `RULES.biomes.terrainPools` in selectTerrain()
- Loot system: `src/systems/LootManager.js` (getLevelTier, resolveItem, rollGold all share tier keys)
- Loot tables: `data/lootTables.json` (monsterLootTables use "1-4"/"5-9"/"10-14"/"15+" keys; goldTables use same keys — must be updated together if rebucketing)
- Magic items: `data/magicItems.json` (all +1 items have minimumLevel 5; +2 have minimumLevel 10; +3 have minimumLevel 15 — all too high for L1-10 game)
- Quest rewards: `data/quests.json` (campaign stage 2 reward ID "potion-greater-healing" is broken; stage 4 "legendary-weapon" is broken; stage 3 "longsword-plus-1" is correct)
