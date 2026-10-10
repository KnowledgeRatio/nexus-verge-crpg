# Development Changelog

Archived session notes. For active work see `docs/plans/` and `.claude/rules/architecture.md`.

---

## 2026-10-10 — Unified quest composition

Sponsor-approved composition is enabled locally for new town offers. Six compatible component dimensions yield seven activity structures combining observation, interpretation, actual boss victory, source-bound recovery and Craft salvage. Shared decisions work for generated and authored content; signatures retain their conversations. Handover drives actual finite stock, and resolved boss threats remain removed across revisit/save/regeneration. Ordinary purchases cannot contaminate quest custody; competing board jobs reserve combat targets. Boss contracts show Deadly regardless of proximity. Existing boards and legacy bundles are preserved; renewal remains deferred.

All 1,418 tests in 123 files pass, as do six desktop/mobile integration fixtures, web build and legal verification. Repository lint retains 175/3,251 existing errors. The audit distinguishes 19 compatible assignments from seven structures, samples 20 worlds at levels 1/5/10 under two visit orders, enumerates 5,280 skill checks and runs 3,000 conditional attack-policy fights. Severe level-5 combat attrition requires complete-policy investigation; neither those fights nor synthetic browser locations clear whole-journey balance or sponsor acceptance. See [validation](reports/2026-10-10-unified-quest-validation.md). Product Owner amended #57; #39/#41/#57 remain open. Nothing committed or deployed.

## 2026-10-10 — Procedural quest core

Sponsor-approved Trace a disruption is implemented and enabled locally: four causal bundles, actual named participants/sites, no-roll observations, optional DC12 interpretation, evidence-sensitive choices, full/incomplete commissions, culture standing and saved replies. Recovery restores a finite shipment to the bound merchant; purchases and exhausted receipts persist. Generated kill/retrieval contracts and faction serialization are repaired. Existing boards and legacy quests are not regenerated or migrated.

All 1,368 tests in 117 files pass with one worker and a 30-second timeout for asset tests; default-timeout runs hit existing rendering timeouts. Desktop/mobile recovery, resolution, purchase and save/load fixtures pass. Legal verification passes; existing repository lint failures remain. A reproducible 20-world audit finds 95.26% combined Investigation coverage, 71.05% procedural coverage and no duplicate simultaneous procedural targets; optional Knight/Sage check arithmetic is separately enumerated. These are publication/check measurements, not played-run profitability or sponsor acceptance. Median procedural target distance is 131 tiles. See the [validation report](reports/2026-10-10-procedural-quest-validation.md) and [approved design](plans/2026-10-10-procedural-quest-core.md). Board renewal and additional families remain deferred. Nothing committed or deployed.

## 2026-10-10 — Investigation target prevention

Sponsor-approved continuation expands Investigation availability: settlements without owned hooks can use the nearest real eligible dungeon within a separate 300-tile radius. The all-town audit checks 6,800 settlements in 120 worlds at levels 1/5/10: 97.64% of small-world towns and 99.56% of actual-entry medium-world towns have valid offers, including later towns. Shared destinations and travel cost remain measured limitations, not full skill-value acceptance. World generation, other quest candidates, rewards and DCs are unchanged.

The separately authorized reward repair resolves the turn-in blocker below. XP/gold work for real/restored/plain characters, earned pending level-ups survive saving, and completion rewards remain exactly once. Desktop/mobile fallback quest acceptance, search/retry and successful turn-in pass. All 1,325 tests in 113 files pass; existing lint errors remain. The original prevention validation below is historical; the latest evidence is appended to the report/specification. Old generated offers and targetless saved quests remain unchanged. Nothing committed or deployed.

With sponsor authorization, newly generated Investigation offers are withheld when no eligible world hook exists. Valid targets and RNG behavior retain their baseline; old saved targetless quests remain unchanged. Twenty new integration tests cover matching, excluded hooks, budgets and persistence. A reproducible audit of 120 worlds at levels 1/5/10 produced zero newly targetless Investigations. The full suite passes 1,296 tests in 112 files; existing lint errors remain.

Desktop/mobile fixtures verify reduced offers, acceptance and deliberate room-search retry. Full completion acceptance is blocked by an existing `QuestManager.awardRewards` call to nonexistent `character.addXP`; actual characters implement `gainXP`. Recorded for separate sponsor approval, without expanding this repair. See the [repair specification](plans/2026-10-09-investigation-target-repair.md) and [investigation report](reports/2026-10-09-skill-balance-investigation.md). Nothing committed or deployed.

## 2026-10-07 — Whole-game skill checks and challenge paths

Follow-up skill-value review: #41 now requires generated/reachable/offered/attempted/resolved exposure, legal-build and acquisition evidence, and qualitative consequences; earlier catalogue odds are not campaign balance proof. Verified real social intel/relations and combat avoidance, but generated Investigation remains single-room completion/rewards with a cosmetic map tag, rather than evidence interpretation or branching resolution. Created #57 for a bounded quest-consequence slice after the #41 baseline, then a repeat evaluation; #39 remains narrow parallel tracking/reputation work. Added a real-generation dungeon-offer diagnostic with explicit synthetic-route limits. No production balance tuning in this follow-up.

Audited skill consumers across dialogue, settlement services, quest investigation, terrain, dungeon rooms/traps/doors and pricing; combat currently has no skill-roll consumer. Repaired shared party/fatigue math, plain-save handling, incompatible choice shapes, staged preparation/progression, reward duplication, authored dialogue endings, cancellation/death promises and paid/no-roll approaches. Quest room reentry no longer gives free Investigation rerolls: E offers a deliberate search using the existing fatigue cost. NPC knowledge and cooldowns persist. Kept nine skills and helper/expertise caps; adjusted a few existing authored approaches following designer review.

The full suite passes 1,276 tests in 111 files; desktop/mobile browser fixtures, web build, legal verification and data checks pass. Repository lint retains existing errors. Generic world-discovery/path/clue and untargeted reputation flags still need authored context, and true opposed checks remain unimplemented. See `docs/reports/2026-10-07-whole-game-skill-audit.md` for the map, repairs, evidence and limits. #41 remains open for this content work and sponsor play acceptance. Nothing committed or deployed.

## 2026-10-07 — Compensated blood damage over time

Local playtest activation: at the user's request, `RULES.combat.damageOverTime.enabled` is now `true`. The 120-percent budget and 80/40 delivery are unchanged; the independent resistance system remains disabled. Reload the local game to exercise the feature. This activation is not a deployment or completed hands-on acceptance; setting the switch to `false` rolls back. Activation checks passed in 105 test files; the remaining weapon-damage regression fixture was updated to exercise both explicit rollback and enabled modes, and its five tests passed alongside the 27 blood-damage tests.

The Game Designer replaced the uncompensated 80/20 prototype with a 120-percent potential budget: 80 percent of eligible weapon-base damage on impact plus 40 percent bleeding over three target turns. Total multiplier and timing split are independent rules controls; the tested 140-percent alternative remains configurable. Paid riders remain immediate and unboosted. The same rules apply to player, companion and eligible monster weapon hits. Intervene now predicts lethal immediate HP damage using the same partition, defenses and temporary-HP calculations as actual resolution. Pending damage messages distinguish damage before defenses and avoid claiming a schedule survives target defeat.

The Balance Engineer ran 271,200 actual-engine fights plus 12,100 concentration trials. Higher-sample matched-weapon probes show a smaller durable-target advantage at 120 percent than 140 percent, while short-target outcomes retain a timing cost. The independent review found no remaining production blocker. All 1,243 tests across 106 files passed using `npm test -- --testTimeout 10000` before local activation; standard lint retains the same 205 pre-existing errors with no new error signatures. Full Calling kits, actual concentration/cleanse choices, Void interactions and hands-on presentation remain acceptance work. The user subsequently authorized the local playtest activation recorded above; global resistance and authored elemental effects retain their independent configuration.

Evidence and reproducibility: [compensated report](../tools/balance-sim/results-compensated/report.md), [matched follow-up](../tools/balance-sim/results-compensated/matched-followup.md), [final-source verification](../tools/balance-sim/results-compensated/final-verification.json), and [updated specification](plans/2026-10-04-blood-dot-precision.md). The original 100-percent-budget simulation report is explicitly historical and superseded.

Elemental proposal, not implemented: add a generic authored periodic-damage producer using the existing typed/flavored resolver and schedule consumer. Compare an optional fire Burn at 120-percent total/80-40 delivery against an equally costly instant fire effect; do not add automatic burn to all fire attacks. Cold and lightning should spend their effect budget on meaningful non-grid control or reaction suppression; acid/poison sustained effects should price damage and debuffs together. Preserve authored necrotic/Void escalation. No broad damage-type remap is necessary.

---

## 2026-10-04 — Blood damage over time prototype

Added a default-disabled combat fork using 1,000 integer units per HP. Positive eligible blood-weapon damage splits into 80 percent immediate damage and 20 percent bleeding over three independent target-turn starts. Reapplication preserves earlier schedules; immunity, cleansing, target defeat, and encounter completion follow explicit cancellation rules.

Shared fractional resolution covers direct and periodic damage, healing, temporary HP, elemental-flavor defenses, and neutral damage types. The fork repairs periodic expiration and lethal-tick turn advancement, and adds fractional health displays and bleed details. Global resistance remains independently disabled; ordinary weapons retain single damage types. Elemental burn content and hands-on activation are not part of this delivery.

Validation: 1,235 tests passed with an explicit ten-second test timeout; 128,800 actual-engine simulation fights and 19 numerical/lifecycle fixtures completed. Existing lint errors are unchanged. Concentration pressure, complete Calling and companion gameplay, and mobile visual acceptance remain gates before enabling the fork. Design and evidence: `docs/plans/2026-10-04-blood-dot-precision.md` and `docs/plans/2026-10-04-blood-dot-simulation.md`.

---

## Session 21 — 2026-09-22
**Nine-skill redesign and attribute-integrity completion pass** — Plan: `docs/plans/2026-09-22-skill-system-redesign.md`; backlog: #41 and #42.

Replaced the thirteen-skill stopgap with nine broad skills: Athletics, Finesse, Survival, Craft, Lore, Investigation, Perception, Empathy, and Influence. Each skill has one primary and one secondary NVSystem attribute; players choose authored fictional approaches rather than freely attaching their best attribute. `SkillRegistry` is now the shared boundary for identifiers, aliases, modifiers, rolls, and old-save migration.

Migrated existing challenge, class, background, companion, quest, relation, and monster content. Repaired missing DC/critical plumbing, conversational d20 resolution, locked-door lookup, choice/stage attributes, and stage-specific quest progress. The 10,000-roll-per-cell live-resolver audit found no invalid mappings and level-5 trained aggregate success of 51.4–56.9% across specialised profiles. Automated suite: 603 tests passing.

Also completed the canonical Insight→Intuition and Vitality→Resilience migration, removed `acSoak`, prohibited Resilience-based AC/general damage reduction, and routed initiative through Intuition. ADR-019 now finalises NVSystem AC as a 2:1 Intuition:Prowess weighted average under the existing armour gates, while 5EClassic remains Dexterity-only. A 36,000-fight real-engine comparison covered levels 1/5/10, three allocation shapes, and all four armour categories; all 46 monster native attribute blocks passed structural validation. Automated suite: 610 tests passing. Hands-on acceptance remains for #42; hands-on skill acceptance and party-help ceiling validation remain in #41.

---

## Session 19a — 2026-07-31 to 2026-08-04 (backfilled 2026-09-08)
**Six-attribute system remap (NVSystem)** — STR/DEX/CON/INT/WIS/CHA → Prowess/Vitality/Intellect/Insight/Presence/Composure. Plan: `docs/plans/2026-07-30-attribute-system-remap.md`. Forked behind `RULES.attributes.system` per ADR-015; **default flipped to `'NVSystem'` on 2026-08-03**.

*Backfilled entry — this shipped without a changelog record, which is why the change was invisible in session history for five weeks. The rule requiring an entry when a plan reaches `Implemented` was added to `workflow.md` on 2026-09-08 as a result.*

`src/utils/attributeResolver.js` is the single translation point (`getRawAttributeModifier`, `getAttributeModifierFor`, `getBlendedAttributeModifier`). `RULES.attributes.derivedStatMap` maps every derived stat to its attribute(s), `type: 'single'` or `type: 'blend'` — blends sum raw unfloored modifiers and floor once on the total, which is now a standing rule in `d5e-compliance.md`. Four blends live: concentration, flee, menacingAttackDC, challengeDC.

Data converted to the dual-field pattern: all 46 monsters (`abilitiesNVSystem`), 5 races, 5 backgrounds, 3 classes, kits, and all 13 skills (`attributeNVSystem` + `descriptionNVSystem`). Chargen remapped to allocate natively into the six new attributes.

Saves narrowed to the three Inward attributes (Vitality, Insight, Composure); Prowess-save and Intellect-save retired. One save proficiency per calling, not two. Only **Dedication** was remapped to an NVSystem identity (Prowess+Vitality) — Curiosity and Audacity have no NVSystem identity yet, and no `savingThrowProficienciesNVSystem` was invented for them (both legacy pairs included `int`, which has no valid target). Tracked as #14.

ADR-015 ("Forking a Live System") and ADR-016 ("NVSystem Balance Baseline") were both established out of this work. ADR-011 save-file compatibility was **waived** on 2026-08-01 — old saves are not required to keep working, and `Character.fromJSON` upconversion was dropped.

Gotchas recorded: a stray `git checkout` briefly reverted 19 monsters' ability blocks to `[]` — the incident behind `workflow.md`'s "Git Safety for Subagents" rule. Balance validation proved CR parity by construction across all 46 monsters rather than by sampling; two SRD deviations found (minotaur WIS 20 vs 16, hillGiant INT 3 vs 5), both CR-inert and left as-is.

Epic #19 closed 2026-09-08. Step 13 (shim retirement, flag removal) was **not** done and is now superseded by ADR-016 — see #34.

---

## Session 20 — 2026-08-14
**Server-Held Saves (ADR-017)** — built behind `RULES.saves.backend`, default remains `'local'`.

Setup doc: `docs/CLOUD_SAVES_SETUP.md`.

`SaveManager` reduced to serialization only; persistence moved behind an async store contract (`getSlots`/`read`/`write`/`remove`). `LocalSaveStore` preserves the original LocalStorage behaviour; `CloudSaveStore` wraps it as a write-through cache and falls back to it on every failure path, returning `{ synced, warning }` so the UI reports "device only" instead of a false success.

Identity is a player name **plus** a recovery code, both required — blob key is `HMAC-SHA256(username + ":" + code, SAVE_TOKEN_SECRET)`. No identity provider, no password, no PII. Azure Functions API in `api/` (4 routes) over a single new storage account; SWA Free plan is sufficient.

Restored a real 5-slot save/load UI — `renderSaveSlots`/`renderLoadSlots` had been reduced to file export/import only, and `saveToSlot`/`loadFromSlot`/`getSaveSlots` had no UI callers at all.

Gotcha recorded: `SAVE_TOKEN_SECRET` can never be rotated once players have saves — every storage path derives from it.

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
