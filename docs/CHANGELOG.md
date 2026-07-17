# Development Changelog

Archived session notes. For active work see `docs/plans/` and `.claude/rules/architecture.md`.

---

## Session 19 — 2026-03-09
**Party Member System — Design Review & Decisions Locked (Planning Only)**
Plan: `docs/plans/2026-03-09-party-system-amendments.md`

Locked decisions: BG3-style direct control, individual initiative for all combatants (team: 'companion'), 4 relationship event triggers only (`companionDowned`, `winHardFight`, `fleeCowardly`, `takeAllLoot`), fled = permanent death for downed companions.

Key values: `companionActionEconomyFactor: 0.75`, `splitTheSpoils` max delta 10 (requires Trusted), companion level-up batch modal.

Architecture gaps flagged: `combat.ended` event missing, `sourceCharacter` back-reference needed, `getEffectivePartySize()` float bug, `activeSynergies` computed not persisted, `devotedPassiveUsedThisRest` excluded from save/load.

---

## Session 18b — 2026-03-07
**Party Member System — Design & Architecture (Planning Only)**
Docs: `docs/designjams/2026-03-07-party-member-system.md`, `docs/plans/2026-03-07-party-member-architecture.md`

Max party 4 (player + 3 companions). Companions from: taverns (primary), quest rewards, combat rescue (6%), dungeon rescue. Permanent death. Relationship score -100 to +100, 5 motivation archetypes, Devoted tier unlocks unique passive. No code implemented.

---

## Session 18 — 2026-03-07
**Ranged Combat Balance Phase 1 + Terrain Movement**
Plan: `docs/plans/2026-03-07-ranged-combat-balance.md`

Added 5 ranged enemies with `preferRanged: true` flag (Goblin Archer CR0.25, Bandit Crossbowman CR0.125, Manticore CR3, Mage CR6, Medusa CR6). `preferRanged` AI wiring in CombatManager pending.

Terrain movement: `RULES.movement` config block, variable move delay (`baseMoveDelay × movementCost`), step accumulator for encounters, `encounterAccumulator` persists to gameState. All terrain `encounterModifier` values recalibrated for multiplicative formula.

Terrain skill challenges: `terrainModifiers` added to all challenges in `skillChallenges.json`. SkillChallengeManager method stubs added. Full logic pending. Hardcoded `terrainChallengeMap` in Player.js not yet replaced.

---

## Session 17 — 2026-03-05
**Biome & Terrain Generation Fixes**
Plan: `docs/plans/2026-03-05-biome-terrain-fixes.md`

Fix 1 — Double-scaling bug: `preScaled: true` flag in worldbuilder overrides; `getScaledFeatureGeneration()` skips re-scaling.
Fix 2 — Inland beaches: sample 4 cardinal neighbors before assigning beach; demote to grassland if no ocean-level neighbor.
Fix 3 — Climate coherence: latitude-based temperature, elevation-based moisture, continental biome scale wired into WorldGenerator.

New terrain types: `desertHills`, `snowForest`. Combat fixes: melee blocked with `pushed` condition, `hasEngaged = true` on melee attacks, advantage/disadvantage rules tightened.

---

## Session 16 — 2026-03-04
**Flee Mechanic Redesign**
Plan: `docs/plans/2026-03-04-flee-mechanic-redesign.md`

New flee formula: `d20 + max(DEX, WIS) + prof >= DC`. DC = `10 + 2×(engaged-1) + situational`. Boss: +5, Ambush round 1: +3. DC cap 25. `hasEngaged` flag on combatants. Opp attacks resolve before flee check. `attackType` field added to all monsters.

---

## Session 15 — 2026-02-28
**Social Challenge System — Multi-Turn NPC Conversations**

New files: `src/systems/SkillChallengeManager.js`, `data/skillChallenges/bandit-negotiation.json`.

Architecture: environmental challenges use `skillCheckModal`; social challenges use `socialChallengeModal` + SkillChallengeManager. Tension meter 0-100, combat at threshold 80. Conversation trees in JSON.

---

## Session 14 — 2026-01-20
**Tile Graphics Mapping & Zoom System**

Explicit `tileImage` field in `terrains.json` (single source of truth). 4 zoom levels: 16/24/32/48px via `+`/`-` hotkeys and settings UI. Zoom persisted to localStorage. Current tiles: `grassland.png`, `forest.png`, `mountain.png`. All others null (ASCII fallback).

---

## Session 13 — 2026-01-19
**Campaign Filtering System**

New: `data/campaigns.json`, `src/utils/campaignFilter.js`. Inheritance system: core → nexus-verge → campaign-specific. All data entries support `campaignIds` field; missing defaults to `["core"]`. Systems (CharacterCreation, QuestGenerator, LootManager, MerchantManager, NPCGenerator) filter by campaign ID.

---

## Session 12 — 2026-01-14
**Skill Challenge Damage Persistence — Critical Bug Fix**

Bug: `character.takeDamage()` modified character in memory but never saved back to gameState. Fix: add `gameState.set('character', character)` + `updateHUD(character)` after both `applyConsequences()` call sites in main.js.

Also: equipment slot harmonization — removed redundant Shield slot, added Helmet/Artifact slots. Off-Hand is unified for weapons and shields.

---

## Session 11 — 2026-01-08
**Combat Audio System**

New: `src/systems/AudioManager.js`. Audio pooling (3 instances per sound). Three-tier volume (master/sfx/music). Combat sounds: melee/ranged × hit/miss/critical. Framework ready for exploration, UI, terrain, ambient music.

---

## Session 10 — 2026-01-03
**Floating Combat Text**

Floating text above combatant cards: red=damage, yellow=critical (rotation animation), green=healing, cyan=buff, orange=condition, grey=miss. `showFloatingCombatText(combatantId, text, type)` in main.js. 1.5s lifetime. Triggered from CombatManager for all combat events.

---

## Session 9 — 2025-12-23
**In-Game Help Manual (H key)**

8-section help modal: Controls, Exploration, Combat, Progression, Rest, Trading, Quests, D&D 5e Rules. Styled `kbd` tags, responsive grid, scrollable. Closes via X, ESC, backdrop click.

Also: responsive combat UI, fixed combat log overflow, widened sidebar (350px → 600px at 1920px+).

---

## Session 8 — 2025-12-21
**Hydrology Pass + Lower Encounter Rate**

River noise channel added to WorldGenerator. Encounter base rate 4% → 1%. Water thresholds shifted for deeper lakes.

---

## Session 7 — 2025-12-18
**Multi-Enemy Encounter System**

Removed single-enemy limit. Level 1-2: 1-2 enemies; Level 3+: 1-3. CR-based enemy selection. Bugbear moved from level 5 bracket to level 3. Encounter fallback now preserves type restrictions (no more level-1 bugbears).

---

## Session 6 — 2025-12-18
**Weapon Mastery Character Sheet Display**

Weapon masteries section in character sheet with icons and descriptions. `renderWeaponMasteries()` in main.js. Orange accent color to distinguish from class features.

---

## Session 5 — 2025-12-18
**Conditions System**

Object-based conditions array on Combatant replacing ad-hoc flags. Supports `untilStartOfTurn`, `untilEndOfTurn`, `rounds`, `combat`, `permanent` durations. Buff/debuff distinction. Curability flag. Slow mastery migrated as proof-of-concept. UI shows condition icons with tooltips.

---

## Session 4 — 2025-12-18
**All 8 Weapon Masteries in Combat**

Implemented Nick, Push, Sap, Slow, Topple, Vex (Cleave and Graze were already done). `masteryEffects` object on Combatant. Advantage/disadvantage wired for Sap, Vex, Topple/prone.

---

## Session 3 — 2025-12-18
**Weapon Mastery Corrections & UI Fixes**

Corrected all weapon-to-mastery mappings to match official D&D 5e variant rules. Cache-busting (`?v=${Date.now()}`) for data files. Inventory Off-Hand slot fix. Character sheet spellcasting crash fix.

---

## Session 2 — 2025-12-18
**Two-Weapon Fighting**

Light weapon off-hand equipping. Combat bonus action Attack (Off-Hand) button. Off-hand attack deals weapon damage only (no ability modifier). D&D 5e RAW compliant.

---

## Session 1 — 2025-12-18
**Weapon Mastery Combat (Cleave, Graze) + Inventory UI**

Cleave: extra attack on adjacent enemy for ability modifier damage. Graze: miss still deals ability modifier damage. Armor/shield proficiency enforcement (hard block). Inventory tag system (armor type, weapon type, properties). Load game screen → file upload.

---

## Sessions 1-7 (2025-12-09 to 2025-12-17)
Core systems built: world generation, map rendering, player movement, combat (rewritten from grid to non-grid), rest system, save/load (5 slots LocalStorage), NPC generation, trading system (CHA-modified pricing), 13-skill system redesign, quest system phases 1-7 (generation, lifecycle, UI, NPC integration, settlement persistence), calling system redesign (7 → 3 callings: Dedication/Scholar/Wanderlust), weapon masteries data, abilities data, spells data.
