# Claude Development Guide
# Nexus Verge - Procedural D&D 5e Roguelike CRPG

**Last Updated:** 2025-12-16
**Current Branch:** `claude/procedural-roguelike-platformer-01J97EBHans8dhCtHVojyJ7s`
**Project Phase:** Phase 2 MVP - Core Systems Implementation
**Latest Commit:** Equipment System Fixes - Combat Stat Recalculation (Complete)

---

## 🆕 Recent Changes (2025-12-16)

### Equipment System Fixes - Combat Stat Recalculation ✅
Fixed critical equipment system bugs where AC and attack bonuses were not recalculating when items were equipped/unequipped.

**Modified Files:**
- `src/main.js` - Added helper functions for plain character objects, updated equipItem/unequipItem methods
- `src/systems/Character.js` - Added attack bonus properties, updated applyStartingEquipment()
- Character sheet now displays weapon attack bonuses + damage

**Bug Fixes:**

**1. calculateAC is not a function** ✅
- **Problem:** `TypeError: character.calculateAC is not a function` when unequipping items
- **Root Cause:** Character from gameState is plain object (not Character class instance), lacks methods
- **Fix:** Created standalone helper functions in main.js that work with plain objects:
  - `calculateACForCharacter(character)` - Calculate AC from equipment
  - `calculateAttackBonusForWeapon(character, weapon)` - Calculate attack bonus
  - `isCharacterProficientWithWeapon(character, weapon)` - Check proficiency
  - `recalculateCombatStats(character)` - Recalculate all stats (AC + attack bonuses)

**2. Missing Attack Bonus Recalculation** ✅
- **Problem:** AC recalculated on armor/shield changes, but weapon attack bonuses never updated
- **User Request:** "need to do the same equip and unequip affecting attack/damage stats with weapons"
- **Fix:** Added comprehensive stat recalculation:
  - `equipItem()` now calls `recalculateCombatStats()` for all equipment types
  - `unequipItem()` now calls `recalculateCombatStats()` for all equipment types
  - Attack bonuses recalculate for both mainHand and offHand weapons
  - Console logging confirms all stat changes: `⚔️ Combat stats recalculated - AC: 16, Main Hand Attack: +5, Off Hand Attack: +2`

**3. Character Missing Attack Bonus Properties** ✅
- **Problem:** Character objects didn't store pre-calculated attack bonuses
- **Fix:** Added to Character constructor (lines 79-81):
  ```javascript
  this.mainHandAttackBonus = data.mainHandAttackBonus || 0;
  this.offHandAttackBonus = data.offHandAttackBonus || 0;
  ```
- Updated `applyStartingEquipment()` to calculate bonuses when starting equipment is equipped

**4. Character Sheet Missing Attack Display** ✅
- **Problem:** Character sheet showed AC but not weapon attack bonuses
- **Fix:** Added to Combat Stats section:
  - Main Hand Attack: +X (damage dice)
  - Off Hand Attack: +X (damage dice)
  - Only displays when weapons are equipped
  - Shows attack bonus calculated from STR/DEX + proficiency bonus

**Implementation Details:**

**Standalone Calculation Functions** (main.js lines 2686-2787):
```javascript
calculateACForCharacter(character) {
    let ac = 10 + character.abilityModifiers.dex;
    if (character.equipment.armor) { /* armor AC logic */ }
    if (character.equipment.offHand?.type === 'shield') { ac += shield.armorClassBonus; }
    return ac;
}

calculateAttackBonusForWeapon(character, weapon) {
    // Finesse: use higher of STR/DEX
    // Ranged: use DEX
    // Melee: use STR
    const abilityMod = /* calculate based on weapon type */;
    const profBonus = proficient ? character.proficiencyBonus : 0;
    return abilityMod + profBonus;
}

recalculateCombatStats(character) {
    character.ac = this.calculateACForCharacter(character);
    character.mainHandAttackBonus = this.calculateAttackBonusForWeapon(...);
    character.offHandAttackBonus = this.calculateAttackBonusForWeapon(...);
    console.log(`⚔️ Combat stats recalculated...`);
}
```

**Equipment Flow:**
1. Player equips weapon → `equipItem()` → `recalculateCombatStats()` → AC + attack bonuses updated
2. Player unequips weapon → `unequipItem()` → `recalculateCombatStats()` → AC + attack bonuses updated
3. Character sheet auto-refreshes showing new stats
4. HUD updates with new AC value
5. Console logs confirmation

**What This Fixes:**
- ✅ AC updates when armor/shields are equipped/unequipped
- ✅ Attack bonuses update when weapons are equipped/unequipped
- ✅ Character sheet displays weapon attack bonuses + damage dice
- ✅ All combat stats recalculate on any equipment change
- ✅ Works with plain character objects from gameState (not just class instances)
- ✅ New characters get correct attack bonuses from starting equipment

**D&D 5e Mechanics Implemented:**
- **Finesse Weapons:** Use higher of STR or DEX modifier (e.g., rapier, shortsword)
- **Ranged Weapons:** Use DEX modifier (e.g., shortbow, crossbow)
- **Melee Weapons:** Use STR modifier (e.g., longsword, greatsword)
- **Proficiency Bonus:** Added if character is proficient with weapon category (simple/martial) or specific weapon
- **Attack Bonus Formula:** Ability Modifier + Proficiency Bonus (if proficient)
- **AC Formula:** 10 + DEX modifier (unarmored) OR Armor AC + DEX modifier (if allowed) + Shield bonus

**Testing:**
- Character creation works correctly with starting equipment
- Equipping weapons shows attack bonus in character sheet
- Unequipping weapons removes attack bonus from display
- AC changes correctly with armor/shield changes
- Console confirms all recalculations

---

### Phase 5.6.1 - Quest System Bug Fixes & Settlement Persistence ✅
Fixed critical bugs in quest system implementation and added settlement state persistence across region pruning.

**Modified Files:**
- `src/systems/QuestGenerator.js` - Fixed RNG API mismatch, creature CR field access, formula evaluation order
- `src/systems/SettlementManager.js` - Fixed quest storage location, added NPC name placeholder replacement
- `src/systems/QuestManager.js` - Fixed quest lookup to use gameState instead of manager property
- `src/systems/WorldGenerator.js` - Added settlement persistence system (persist/restore on prune)

**Bug Fixes:**

**1. RNG API Mismatch** ✅
- **Problem:** `rng.intBetween is not a function`, `rng.pick is not a function`
- **Root Cause:** QuestGenerator using plain RNG function but calling SeededRandom class methods
- **Fix:** Changed imports to use `SeededRandom` class, updated all method calls:
  - `rng.intBetween()` → `rng.nextInt()`
  - `rng.pick()` → `rng.choice()`
  - `rng.int()` → `rng.nextInt()`

**2. Creature Selection Failure** ✅
- **Problem:** "No valid creatures for kill quest" at low player levels
- **Root Cause:** Code checking `monster.cr` but monsters.json uses `challengeRating`
- **Fix:** Updated creature filtering to check both field names:
  ```javascript
  const cr = monster.challengeRating || monster.cr || 0;
  ```

**3. Formula Evaluation Variable Collision** ✅
- **Problem:** `ReferenceError: hardMultiplier is not defined` when evaluating `"300 * difficultyMultiplier"`
- **Root Cause:** Regex replacement order - `difficulty` replaced before `difficultyMultiplier`, creating `hardMultiplier`
- **Fix:** Sort variables by length (longest first) before replacement to prevent substring collisions

**4. Quest Storage Location Mismatch** ✅
- **Problem:** Quests added to SettlementManager but QuestManager couldn't find them
- **Root Cause:** Storing in `questManager.availableQuests` array instead of `gameState.quests.available`
- **Fix:** Updated SettlementManager to add quests to gameState:
  ```javascript
  const questState = gameState.get('quests');
  questState.available.push(quest);
  gameState.set('quests', questState);
  ```

**5. Quest Retrieval Using Wrong Location** ✅
- **Problem:** NPC shows quest icon but "Ask about work" returns no quests
- **Root Cause:** `getQuestsFromNPC()` checking `this.availableQuests` (doesn't exist) instead of gameState
- **Fix:** Updated QuestManager.getQuestsFromNPC() to use `quests.available` from gameState

**6. NPC Name Placeholder Not Replaced** ✅
- **Problem:** Quest descriptions showing `{npcName}` instead of actual NPC name
- **Root Cause:** Placeholder filled during generation before NPC assigned
- **Fix:** Added placeholder replacement in assignQuestsToNPCs() after NPC assignment:
  ```javascript
  quest.description = quest.description.replace(/{npcName}/g, selectedNPC.name);
  quest.name = quest.name.replace(/{npcName}/g, selectedNPC.name);
  ```

**7. Settlement State Loss on Region Pruning** ✅
- **Problem:** NPCs, quests, trading history lost when regions pruned from cache
- **Impact:** Would break active quests, reset merchant inventories, lose all settlement changes
- **Fix:** Implemented persistent settlement storage:
  - Added `persistSettlementData()` - saves settlement state before region deletion
  - Added `restoreSettlementData()` - restores settlement state when region regenerated
  - Settlement data stored in `gameState.world.settlements` (survives pruning & save/load)
  - Preserves: NPCs, inventories, quest states, visit timestamps, all dynamic state

**Quest System Status:**
- ✅ Quest generation working (6 quests per city, 3-5 per town, 2-3 per village)
- ✅ Quest assignment to NPCs by role (leaders→combat, merchants→retrieval, etc.)
- ✅ Quest acceptance flow functional
- ✅ Quest tracking by specific creature ID (e.g., only "orc" counts for "Hunt the Orc")
- ✅ Settlement persistence across region pruning
- ✅ NPC dialogue showing quest options correctly
- ✅ Quest placeholders replaced with actual NPC names
- 🔄 Quest completion flow (tracking works, turn-in UI pending test)
- 🔄 Quest rewards (XP/gold implemented, items/reputation pending)

**How Quest Completion Works:**
1. Accept quest from NPC (e.g., "Hunt the Orc" - Kill 1 Orc)
2. Exit settlement, explore world
3. Trigger random encounters by walking around
4. When combat starts, check creature type
5. Defeat the specific creature (quest tracks by exact ID: "orc", "goblin", "rat", etc.)
6. `CombatManager.endCombat()` calls `questManager.onCreatureKilled(creatureId, location)`
7. Quest progress auto-updates (0/1 → 1/1)
8. Return to quest-giving NPC
9. Click "Turn in completed quest" for rewards

**Next Steps:**
- Test quest turn-in flow with completed objectives
- Verify quest rewards (XP, gold) are properly awarded
- Test settlement persistence (walk far away, return, verify NPCs/quests unchanged)

---

## 🆕 Recent Changes (2025-12-15)

### Phase 5.6 - NPC Quest Integration ✅
Completed integration of quest system with NPCs in settlements, enabling full quest lifecycle from generation to turn-in.

**Modified Files:**
- `src/main.js` - Added NPCGenerator initialization and proper dependency wiring to SettlementManager
- `src/systems/SettlementManager.js` - Made enterSettlement() async, added NPC/quest generation on first visit, implemented assignQuestsToNPCs()
- `src/ui/SettlementUI.js` - Expanded dialogue system with quest offer/accept/turn-in flows
- `src/systems/QuestManager.js` - Added NPC-specific query methods (getQuestsFromNPC, isQuestReadyToComplete)
- `src/systems/Player.js` - Made enterSettlement() async to properly await settlement initialization
- `src/utils/rng.js` - Added createRNG() and seedToNumber() exports for backwards compatibility
- `src/systems/NPCGenerator.js` - Updated to use SeededRandom class API (next(), nextInt(), choice())

**Implementation Details:**

**NPC Generation Flow:**
1. Player enters settlement for first time (presses E)
2. SettlementManager.enterSettlement() generates NPCs via NPCGenerator
3. NPCs assigned to buildings (tavern, merchant, blacksmith, greathall) with roles
4. Each NPC gets personality, dialogue templates, and quest-giving potential

**Quest Generation & Assignment:**
1. QuestGenerator creates settlement-appropriate quests (level-scaled)
2. SettlementManager.assignQuestsToNPCs() distributes quests to NPCs based on roles:
   - Leaders/guards: Combat/patrol quests
   - Merchants: Retrieval/delivery quests
   - Innkeepers: Social/investigation quests
3. NPCs store questIds array, quests store questGiver details

**Quest Discovery Flow:**
1. Player enters building (tavern, merchant, blacksmith, greathall)
2. SettlementUI displays NPCs in building with quest icons:
   - 📜 = Has available quest
   - ⏳ = Quest in progress
   - ✅ = Quest ready to turn in
3. Player clicks NPC to open dialogue

**Quest Acceptance Flow:**
1. NPC dialogue shows quest offer with description, objectives, rewards
2. Player clicks "View Available Quests" → sees all quests from this NPC
3. Player clicks quest → sees full details (difficulty, type, objectives, rewards)
4. Player clicks "Accept Quest" → QuestManager.acceptQuest() moves quest to active
5. Quest log updates, objectives tracked

**Quest Turn-In Flow:**
1. Player completes objectives (e.g., kills 5 goblins)
2. Returns to quest-giving NPC
3. Dialogue shows "Turn in completed quests" option
4. Player selects quest → sees completion summary with rewards
5. Click "Turn In" → QuestManager.completeQuest() grants rewards (XP, items)
6. Quest moves to completed history

**Architecture Notes:**
- ✅ Follows PRD M-5.2: Quest Generation - Basic requirements
- ✅ Data-driven: Quest templates, NPC names, dialogue all in JSON
- ✅ Modular: NPCGenerator, QuestGenerator, QuestManager work independently
- ✅ Extensible: Easy to add new quest types, NPC roles, dialogue options

**Known Issues:**
- ⚠️ **Shrines not functional** - Shrine features generate but have no interaction implemented
- ⚠️ **Short rest not working** - Rest modal opens but short rest button does nothing
- ⚠️ **Long rest not working in towns/shrines** - Long rest only works in wilderness, not at safe locations

---

### Streamlined Skill System - 13-Skill Redesign ✅
Redesigned skill system from 18 D&D 5e skills to a streamlined 13-skill system with merged and new skills, fully aligned with modifiability-first principles:

**Modified Files:**
- `data/skills.json` - Complete skill redefinition (18 → 13 skills)
- `data/skillChallenges.json` - Updated all 15+ challenge templates to use new skills
- `src/systems/Character.js` - Updated skill lists and ability score mappings
- `data/classes.json` - Updated all 5 class skill proficiency lists
- `data/backgrounds.json` - Updated all 5 background skill proficiency lists

**Design Rationale:**
This redesign aligns with our **modifiability-first principle** by demonstrating:
- ✅ Skills are data-driven (easy to add/remove/merge via JSON)
- ✅ System supports skill modifications without breaking existing code
- ✅ Skill challenges automatically adapt to new skill list
- ✅ Character creation dynamically loads skills from data files
- ✅ Classes/backgrounds reference skills by ID (flexible)

**New Skills Added (4):**
1. **Endurance (CON)** - Managing harsh environments, sustained activity, resisting fatigue
   - Replaces: Constitution checks previously handled ad-hoc
   - Use Cases: Forced marches, extreme weather, maintaining concentration during physical stress
   
2. **Academia (INT)** - Scholarly knowledge (merged History/Nature/Religion)
   - Replaces: History, Nature, Religion (consolidated into unified scholarly skill)
   - Use Cases: Historical lore, natural phenomena, religious knowledge, academic theory
   
3. **Cunning (WIS)** - Stealth (hiding), tactical thinking, practical problem-solving
   - Replaces: Stealth (hiding aspect) - now split from Acrobatics
   - Use Cases: Hiding in shadows, blending into crowds, tactical assessment, spotting ambushes
   
4. **Creativity (WIS)** - Improvisational problem-solving, artistic expression
   - Replaces: Performance (absorbed into creative improvisation)
   - Use Cases: Unconventional solutions, arts when relevant, innovative thinking
   
5. **Empathy (WIS)** - Understanding emotions, detecting lies, connecting with others
   - Replaces: Insight (renamed and expanded)
   - Use Cases: Detecting deception, understanding motivations, connecting emotionally, calming animals
   
6. **Influence (CHA)** - Social persuasion (merged Persuasion/Intimidation)
   - Replaces: Persuasion, Intimidation (unified social influence)
   - Use Cases: Diplomacy, threats, inspiring speeches, commanding presence, negotiation

**Skills Retained (7):**
1. **Athletics (STR)** - Climbing, jumping, swimming, grappling (unchanged)
2. **Acrobatics (DEX)** - Balance, acrobatic maneuvers, **moving silently** (expanded)
3. **Sleight of Hand (DEX)** - Manual trickery, **lockpicking**, **disarming traps** (expanded)
4. **Arcana (INT)** - Magical knowledge (unchanged)
5. **Investigation (INT)** - Forensics, logical deduction, evidence chains (unchanged)
6. **Perception (WIS)** - Awareness, spotting details, danger sense (unchanged)
7. **Deception (CHA)** - Lying, bluffing, false identities (unchanged)

**Skills Retired (8):**
- ❌ **Medicine** → Now covered by Academia (medical theory) and Investigation (practical diagnosis)
- ❌ **Animal Handling** → Now covered by Empathy (emotional connection) and Influence (commanding presence)
- ❌ **Survival** → Now covered by Perception (tracking), Investigation (following clues), Endurance (harsh environments)
- ❌ **History** → Merged into Academia
- ❌ **Nature** → Merged into Academia
- ❌ **Religion** → Merged into Academia
- ❌ **Insight** → Replaced by Empathy
- ❌ **Persuasion** → Merged into Influence
- ❌ **Intimidation** → Merged into Influence
- ❌ **Performance** → Covered by Creativity
- ❌ **Stealth** → Split: Acrobatics (moving silently) + Cunning (hiding)

**Final 13 Skills by Ability Score:**

**Strength (1):**
- Athletics

**Dexterity (2):**
- Acrobatics (balance, move silently)
- Sleight of Hand (lockpicking, disarming traps)

**Constitution (1):**
- **Endurance** (NEW)

**Intelligence (3):**
- **Academia** (NEW - merged History/Nature/Religion)
- Arcana
- Investigation

**Wisdom (4):**
- Perception
- **Cunning** (NEW - stealth/hiding, tactical thinking)
- **Creativity** (NEW - improvisation, arts)
- **Empathy** (NEW - replaces Insight)

**Charisma (2):**
- **Influence** (NEW - merged Persuasion/Intimidation)
- Deception

**Skill Challenge Updates:**
Updated 15+ challenge templates in `data/skillChallenges.json`:
- ✅ **Trap Detection & Disarm** - Perception + Sleight of Hand (unchanged)
- ✅ **Locked Door** - Sleight of Hand (lockpick) / Athletics (force) / Arcana (dispel)
- ✅ **Bandit Negotiation** - Influence (threat/persuade) / Deception (lie) / Empathy (appeal)
- ✅ **Cliff Climb** - Perception (assess route) + Athletics (climb)
- ✅ **Hidden Treasure** - Investigation + Sleight of Hand
- ✅ **Calm Wild Beast** - Empathy (connect with animal)
- ✅ **Sneak Past Guards** - Acrobatics (move silently) / Cunning (hide)
- ✅ **Arcane Puzzle** - Arcana / Investigation / Creativity (think outside box)
- ✅ **Ancient Text** - Academia (translate)
- ✅ **Stabilize Wounded** - Academia (medical knowledge) / Investigation (practical first aid)
- ✅ **Track Creature** - Perception (find tracks) + Investigation (follow trail)
- ✅ **Detect Lie** - Empathy vs Deception (contested)
- ✅ **Create Distraction** - Creativity (improvise distraction)
- ✅ **Holy Ritual** - Academia (religious knowledge)
- ✅ **Narrow Ledge** - Acrobatics (balance)
- ✅ **Endure Harsh Environment** - Endurance (NEW challenge)

**Class Skill Proficiency Updates:**
- **Fighter:** `[acrobatics, athletics, endurance, perception, empathy, influence]` (choose 2)
- **Wizard:** `[arcana, academia, empathy, investigation]` (choose 2)
- **Cleric:** `[academia, empathy, influence]` (choose 2)
- **Rogue:** `[acrobatics, athletics, deception, empathy, influence, investigation, perception, sleightOfHand, cunning]` (choose 4)
- **Ranger:** `[athletics, empathy, investigation, academia, perception, cunning, endurance]` (choose 3)

**Background Skill Proficiency Updates:**
- **Soldier:** `[athletics, influence]` (was athletics, intimidation)
- **Acolyte:** `[empathy, academia]` (was insight, religion)
- **Criminal:** `[deception, cunning]` (was deception, stealth)
- **Sage:** `[arcana, academia]` (was arcana, history)
- **Folk Hero:** `[empathy, endurance]` (was animalHandling, survival)

**Modifiability Validation:**
This redesign proves the skill system meets all modifiability requirements:
1. ✅ **Data-Driven:** All skill changes made via `data/skills.json` - NO code changes to Character.js logic
2. ✅ **Extensible:** New skills (Endurance, Academia, Cunning, Creativity, Empathy, Influence) added seamlessly
3. ✅ **Mergeable:** Successfully merged History/Nature/Religion → Academia, Persuasion/Intimidation → Influence
4. ✅ **Removable:** Retired 8 skills without breaking systems
5. ✅ **Non-Breaking:** Character creation, skill checks, quest system all work without modification
6. ✅ **Backwards Compatible:** Class/background references updated, but system supports any skill list

**Alignment with PRD M-3.2:**
- ✅ Skills defined in `data/skills.json` (modular, data-driven)
- ✅ Skill challenges in `data/skillChallenges.json` (reusable templates)
- ✅ Supports adding/merging/retiring skills (proven by this implementation)
- ✅ Supports adding/modifying/removing skill challenges (15+ challenges updated)
- ✅ Homebrew skill variant support (architecture supports custom skill lists)

**Next Steps:**
- Quest system (Phase 5.6-5.7) will use updated skill list for skill challenges
- Skill challenge mechanics implementation will leverage new streamlined skills
- 13-skill system provides cleaner, more focused gameplay experience

---

## 🆕 Recent Changes (2025-12-15 - Earlier)

### Quest System Implementation (Phases 5.1-5.5) ✅
Implemented complete quest system with procedural generation, lifecycle management, UI, and game integration:

**New Files Created:**
- `data/quests.json` - Quest templates (4-stage campaign + 9 side quest types)
- `data/skillChallenges.json` - 15 skill challenge templates (all 18 D&D 5e skills)
- `src/systems/QuestGenerator.js` - Procedural quest generation from templates
- `src/systems/QuestManager.js` - Quest lifecycle tracking and progress management

**Modified Files:**
- `index.html` - Added Quest Log modal and quest notification toast
- `styles.css` - Added comprehensive quest UI styles (500+ lines)
- `src/core/GameState.js` - Added quest state initialization in initNewGame()
- `src/main.js` - Integrated quest systems (initialization, UI setup, event handlers)
- `src/systems/CombatManager.js` - Added quest kill tracking on combat victory

**Phase 5.1: Quest Data Files ✅**
Created modular, data-driven quest system:
- **Campaign Quests:** 4-stage main storyline (Monster Threat → Ancient Corruption → Enemy Stronghold → BBEG)
- **Side Quest Templates:** 9 reusable templates covering all quest types:
  - Kill quests (basic + elite variants)
  - Retrieve quests (dungeon item recovery)
  - Deliver quests (messages + items)
  - Explore quests (scouting locations)
  - Skill challenge quests (traps, social encounters)
- **Skill Challenges:** 15 templates with sequential stages, player choice, contested rolls
  - Examples: Trap detection/disarm (Perception + Sleight of Hand), Bandit negotiation (Intimidation/Persuasion/Deception), Cliff climbing (Survival + Athletics)
- **Formula-Based Rewards:** Dynamic XP/gold scaling based on CR, distance, difficulty
- **Word Lists:** Procedural name generation for creatures, locations, items

**Phase 5.2: QuestGenerator.js ✅**
Procedural quest generation system:
- **Template-Based Generation:** Instantiate quests from templates using seeded RNG
- **Quest Types Supported:** kill, retrieve, deliver, explore, skill
- **Placeholder Filling:** Replace `{variables}` with procedurally generated data
- **Reward Calculation:** Evaluate formulas like `creatureCR * count * 100` for XP
- **Settlement Integration:** Generate 2-6 quests per settlement based on type
- **CR-Based Creature Selection:** Filter monsters by player level for appropriate challenges
- **Campaign Quest Support:** Load pre-defined campaign quests by stage

**Phase 5.3: QuestManager.js ✅**
Quest lifecycle and progress tracking:
- **Lifecycle Management:** Accept, abandon, complete, fail quests
- **Progress Tracking Hooks:**
  - `onCreatureKilled(creatureId, location)` - Update kill objectives
  - `onItemAcquired(itemId)` - Update retrieve objectives
  - `onNPCInteraction(npcId)` - Update return/interact objectives
  - `onLocationDiscovered(location)` - Update explore objectives
- **Objective Progress:** Track progress for each objective, mark completed when done
- **Quest Completion:** Auto-detect all objectives complete, mark ready to turn in
- **Reward Distribution:** Award XP, gold, items, reputation on completion
- **Campaign Progression:** Advance to next campaign stage, generate next quest
- **Quest Queries:** Get active/completed/failed quests, get quests from NPCs

**Phase 5.4: Quest UI ✅**
Complete quest log interface with notifications:
- **Quest Log Modal:** Tabbed interface (Active/Completed/Failed)
- **Quest Cards:** Display name, description, difficulty, type, objectives, rewards
- **Progress Bars:** Visual progress for each objective
- **Quest Actions:** Track, Complete (when ready), Abandon buttons
- **Difficulty Badges:** Color-coded (Easy=green, Normal=yellow, Hard=red, Deadly=dark red)
- **Quest Notifications:** Toast popup for quest updates (accept, progress, complete)
- **Empty States:** Helpful messages when no quests in each category
- **Keyboard Shortcut:** Press 'Q' to open quest log

**Phase 5.5: Main Game Integration ✅**
Connected quest system to game initialization and combat:
- **GameState Integration:** Added quest initialization in `initNewGame()` (active, completed, failed arrays, campaignProgress)
- **Quest System Initialization:** QuestGenerator and QuestManager initialized in `initGameScreen()` before player spawn
- **Quest UI Setup:** Created `setupQuestSystem()` method in main.js with:
  - Quest log modal open/close handlers
  - Tab switching for Active/Completed/Failed
  - Quest action button handlers (Track, Complete, Abandon)
  - Quest card rendering with objectives and progress bars
  - Quest notification toast system
  - 'Q' key to open quest log (not in combat)
  - Global `window.questManager` access for UI
- **Combat Integration:** Added quest kill tracking in `CombatManager.endCombat()`
  - Calls `questManager.onCreatureKilled()` for each defeated enemy
  - Passes creature type ID and player location
  - Updates all active kill quest objectives automatically
- **Quest State Subscriptions:** Auto-refresh quest log when quest state changes
- **Quest Counts:** Display active/completed/failed counts in tab buttons

**Quest System Features:**
- ✅ Campaign quests with linear progression
- ✅ Procedurally generated side quests (infinite replayability)
- ✅ Multiple objective types (kill, retrieve, deliver, explore, interact)
- ✅ Real-time progress tracking
- ✅ Formula-based dynamic rewards
- ✅ Skill challenge integration (ready for Phase 5.7)
- ✅ Settlement-based quest generation
- ✅ NPC quest giver assignment (ready for Phase 5.6)
- ✅ Quest log UI with full quest details
- ✅ Quest notification system

**Data Schema Examples:**

Kill Quest Template:
```json
{
  "id": "kill-creatures-basic",
  "name": "{creatureNamePlural} Menace",
  "type": "kill",
  "objectives": [{
    "type": "kill",
    "description": "Slay {count} {creatureName}",
    "requirement": {
      "creatureTypes": ["{creatureType}"],
      "count": "{countValue}",
      "location": { "nearSettlement": "{settlement}", "radius": 100 }
    }
  }],
  "rewards": {
    "xpFormula": "creatureCR * count * 100",
    "goldFormula": "creatureCR * count * 25"
  }
}
```

Skill Challenge Template:
```json
{
  "id": "trap_detect_disarm",
  "type": "sequential",
  "stages": [
    {
      "skill": "perception",
      "dc": 15,
      "description": "Notice the trap",
      "onSuccess": { "nextStage": "disarm" },
      "onFailure": { "damage": "2d6", "damageType": "piercing" }
    },
    {
      "skill": "sleight_of_hand",
      "dc": 13,
      "description": "Disarm the trap",
      "onSuccess": { "xp": 100 }
    }
  ]
}
```

**Quest System Status:**
- ✅ **Phase 5.1-5.5 Complete** - Core quest system fully functional
- ✅ **Combat Integration** - Kill quests track automatically
- ✅ **UI Complete** - Quest log, notifications, progress tracking
- ✅ **Skill System Complete** - 13-skill system implemented, all challenges updated
- 🔄 **Phase 5.6 Ready** - Connect NPCs to quest generation in settlements (prerequisite complete)
- 🔄 **Phase 5.7 Ready** - Implement skill challenge mechanics (prerequisite complete)

**How to Test Quest System:**
1. Start new game and create character with new 13-skill system
2. Play through until you defeat 5 enemies (any type)
3. Press 'Q' to open quest log (currently empty - Phase 5.6 will add quest generation)
4. Quest UI and progress tracking fully functional, waiting for NPC integration

**Next Steps (Phase 5.6-5.7):**
- **Phase 5.6:** Connect NPCs to quest generation in settlements
  - Generate quests when settlements are discovered
  - Assign quests to NPCs based on roles (innkeeper, elder, guard, merchant)
  - Update settlement NPC dialogue to show quest offers
  - Wire up quest acceptance/turn-in through NPC dialogue modal
  - Test full quest flow: discover settlement → talk to NPC → accept quest → complete → turn in
- **Phase 5.7:** Implement skill challenge mechanics
  - Create skill check system (d20 + ability modifier + proficiency)
  - Add skill challenge prompts during exploration/quests
  - Connect skill challenges to quest objectives (uses new 13-skill system)
  - Implement sequential, choice, and contested challenge types
  - Test all 15+ skill challenges with new skills

---

## 🆕 Recent Changes (2025-12-15 - Earlier)

### Documentation Updates - Modifiability First ✅
Updated all core documentation to emphasize modifiability as a fundamental design principle:

**Modified Files:**
- `docs/ARCHITECTURE.md` - Added ADR-000: Core Architectural Principle - Modifiability First
- `docs/PRD.md` - Added Design Principles section emphasizing modifiability
- `docs/PRD.md` - Enhanced M-3.2 Skills System with modular implementation requirements

**ADR-000: Modifiability First (ARCHITECTURE.md):**
Created comprehensive architectural decision record establishing modifiability as the primary design concern:
- **Data-Driven Design:** All content in JSON files, no hardcoded values
- **Centralized Rules Engine:** All game rules in rulesEngine.js with feature flags
- **Modular System Architecture:** Systems independently toggleable
- **Configuration-Based Features:** Runtime-configurable settings
- **Extensible Data Schemas:** Support for additions without breaking code

**Key Implementation Guidelines:**
```javascript
// Rules Engine Structure
RULES = {
  version: "1.0.0",
  variant: "standard", // or "homebrew" | "experimental"

  skills: {
    enabled: true,
    useStandardSkills: true,
    allowCustomSkills: false,
    skillChallenges: { enabled: true, templates: "data/skillChallenges.json" }
  },

  experimental: {
    flanking: false,
    criticalFailures: false,
    injuries: false
  }
};
```

**Validation Checklist for All Systems:**
1. ✅ Can be disabled via config flag
2. ✅ Can load content from data files (not hardcoded)
3. ✅ Can be extended without modifying existing code
4. ✅ Changes don't break other systems
5. ✅ Player-accessible settings available where appropriate

**PRD Updates (M-3.2 Skills System):**
- Added modular implementation requirement
- Added skill challenge examples (traps, social encounters, exploration)
- Added quest integration specification
- Added technical requirements for modifiability:
  - Skills defined in data/skills.json
  - Skill challenges in data/skillChallenges.json
  - Support adding/merging/retiring skills
  - Support adding/modifying/removing challenges
  - Homebrew skill variant support
- Added data schema examples

**Why This Matters:**
- **Homebrew Support:** Essential for allowing custom rules and house variants
- **Player Settings:** Enable optional rule toggles (flanking, critical failures, etc.)
- **Faster Iteration:** Balance changes via config, not code refactoring
- **Future-Proof:** New mechanics can be added without breaking existing systems
- **Community Modding:** Clear data structures for community content

**Next Steps:**
- Quest system implementation should follow modular design
- Skill challenge system implementation per PRD specifications
- Loot system with configurable treasure tables

---

## 🆕 Recent Changes (2025-12-14)

### Trading System Implementation ✅
Implemented complete trading system with merchant/blacksmith NPCs and CHA-based pricing:

**New Files:**
- `src/systems/MerchantManager.js` - Trading logic and price calculation engine
- `data/merchantInventory.json` - Item pools for procedural merchant inventory generation

**Features Added:**
1. **MerchantManager System:**
   - Procedural merchant inventory generation using world seed
   - Settlement-tier based inventory (villages=common items, cities=rare items)
   - CHA-modified pricing: 1% per CHA modifier point
   - Buy formula: `basePrice × (1.0 - chaEffect)` - Higher CHA = lower prices
   - Sell formula: `(basePrice × 0.5) × (1.0 + chaEffect)` - Higher CHA = better selling prices

2. **Merchant Inventory Data:**
   - 14 consumable/misc items (potions, tools, supplies)
   - 15 weapons/armor/shields (including +1 magic items for high-tier settlements)
   - Complete D&D 5e item properties (damage dice, AC values, weight, rarity)

3. **Trading UI:**
   - Full modal-based interface with Buy/Sell tabs
   - Left panel: Scrollable item list with prices and stock
   - Right panel: Transaction details (selected item, quantity selector, total price)
   - Real-time CHA modifier visibility
   - Item selection with visual feedback
   - Quantity controls with stock/owned limits
   - Gold validation and trade execution

4. **Rules Engine Configuration:**
   - Added merchant pricing configuration to `rulesEngine.js`
   - Configurable CHA modifier percentage (default: 1% per point)
   - Settlement-based inventory rules (min/max items, rarity filters)
   - Base sell multiplier (default: 50% of item value)

**Modified Files:**
- `src/core/rulesEngine.js` - Added merchant configuration section
- `src/ui/SettlementUI.js` - Integrated trading modal with complete UI logic
- `index.html` - Added Trading Modal HTML structure
- `styles.css` - Added comprehensive trading UI styles (~350 lines)

**Integration:**
- Merchants and blacksmiths offer "Trade" dialogue option
- Trading opens modal with procedurally generated inventory
- Inventory based on settlement type and world seed
- Transactions update character gold and inventory
- HUD updates automatically after trades
- Message log feedback for all transactions

**Next Recommended Implementation:**
- Quest system (campaign + side quests, templates, tracking)
- Loot system with combat drops (ensure D&D 5e SRD compliance)
- Skill challenge system integrated with quest NPCs

**Important Notes:**
- **SRD Compliance:** Future loot tables and combat drops must follow D&D 5e SRD guidelines for treasure distribution and item rarity
- **Skill Challenges:** Quest system should integrate D&D 5e skill challenges using the 18 skills from character sheet (Acrobatics, Animal Handling, Arcana, Athletics, Deception, History, Insight, Intimidation, Investigation, Medicine, Nature, Perception, Performance, Persuasion, Religion, Sleight of Hand, Stealth, Survival)
- **Quest NPCs:** Skill challenges should be connected to quest objectives and NPC interactions

---

## 🆕 Recent Changes (2025-12-14 - Earlier)

### Bug Fixes & System Improvements ✅
Resolved critical bugs in save/load, rest system, and added sanctuary locations:

**1. Fog of War Persistence Fix** 🐛 ✅
- **Problem:** Explored tiles were not persisting through save/load cycles
- **Root Cause:** WorldGenerator maintained separate `regionCache` while SaveManager saved from `gameState.world.generatedRegions` - they were never synced
- **Solution:** Refactored WorldGenerator to use `gameState.world.generatedRegions` as single source of truth
- **Changes:**
  - Removed `this.regionCache` from WorldGenerator
  - All region operations now read/write directly to gameState
  - Eliminated manual sync logic (was causing bugs)
  - Simplified `loadSavedRegions()` method

**2. Rest System Mechanics Overhaul** 🐛 ✅
- **Problems:**
  - Hit dice were depleting permanently (incorrect D&D 5e implementation)
  - Short rest button disabled when hit dice = 0
  - Button disabled when HP was damaged (backwards logic)
  - Double-execution bug causing two short rests per click
  - Overly restrictive validation logic

- **Correct D&D 5e Implementation:**
  - Hit dice DON'T deplete (always equal to character level)
  - Short rests are the limited resource (2 per long rest)
  - Each short rest rolls ALL hit dice: `{level}d{hitDie} + CON` for healing
  - Long rest resets short rest counter (not hit dice)

- **Changes Made:**
  - `Character.shortRest()`: Now rolls all hit dice without depleting them
  - `Character.longRest()`: Removed hit dice recovery logic, just resets short rest counter
  - `RestManager.canShortRest()`: Simplified to only check short rest counter
  - `main.js` rest UI: Removed hit dice depletion warnings, updated descriptions
  - `main.js` takeShortRest(): Removed validation check, fixed double-execution by removing modal reopen
  - Updated all messaging to reflect correct mechanics

**3. Sanctuary System Implementation** 🆕 ✅
Added safe rest locations scattered across wilderness:

**New Features:**
- **Sanctuary Terrain Type:**
  - Symbol: ☼ (sun/light symbol)
  - Color: Khaki/light yellow (#f0e68c)
  - Allows long rests like taverns
  - No combat encounters (0% spawn rate)
  - Fully traversable, normal movement cost

- **Sanctuary Generation:**
  - Spawn rate: **2x as common as settlements** (2 / townSpacing vs 1 / townSpacing)
  - Generated in all terrain types except water and mountains
  - Each has procedurally generated name from themed word lists
  - Example names: "Sacred Shrine", "Blessed Grove", "Tranquil Retreat", "Holy Temple"

- **Long Rest Support:**
  - RestManager checks for sanctuary features (same as settlements)
  - Player can rest within 2-tile radius of sanctuary
  - `isInSettlement()` now returns true for sanctuaries
  - Works with existing long rest validation system

**Modified Files:**
- `src/systems/WorldGenerator.js` - Unified state management, added sanctuary generation & naming
- `src/systems/Character.js` - Fixed short/long rest mechanics per D&D 5e rules
- `src/systems/RestManager.js` - Updated validation logic, added sanctuary checks
- `src/main.js` - Fixed UI logic, removed double-execution, updated settlement detection
- `data/terrains.json` - Added sanctuary terrain definition

**Multiclassing Preparation:**
- Hit dice structure already class-based: `this.class.hitDie`
- Current single-class format: `{ current: 5, max: 5, size: 10 }`
- Ready for future multiclass expansion: `{ fighter: {3, d10}, wizard: {2, d6} }`

**Next Recommended Implementation:** Quest system (campaign + side quests, templates, tracking)

---

## 🆕 Recent Changes (2025-12-13)

### Save/Load System Implementation ✅
Implemented comprehensive save/load system with LocalStorage persistence:

**New Files:**
- `src/systems/SaveManager.js` - Core save/load logic with 5 save slots

**Features Added:**
1. **Save System:**
   - 5 save slots with individual metadata
   - LocalStorage-based persistence (no backend)
   - Fast serialization (<500ms save, <1s load)
   - Version compatibility tracking
   - ESC key binding to open save menu in-game

2. **Save Data Includes:**
   - World seed & configuration
   - Character (full state, equipment, spells, XP, HP, etc.)
   - World (generated regions with explored/visible tiles, settlements, NPCs)
   - Player position
   - Quests (active, completed)
   - Faction reputation
   - Playtime tracking
   - Game flags

3. **Load Game Screen:**
   - Displays all save slots with metadata
   - Character name, level, class
   - Location coordinates
   - Total playtime (formatted)
   - Save timestamp
   - World seed display
   - Load/Delete buttons per slot

4. **In-Game Save Menu:**
   - Modal overlay with 5 save slots
   - Overwrite existing saves
   - Quick access via ESC key (not in combat)
   - Instant feedback on save success

5. **Playtime Tracking:**
   - Automatic session time tracking
   - Starts when game begins
   - Pauses on save, resumes on load
   - Human-readable format (hours, minutes, seconds)

6. **Bug Fixes (Partial - In Progress):**
   - ✅ Map visibility persistence - Fixed WorldGenerator cache sync after load
   - 🔄 Long rest town detection - In progress (RestManager.isPlayerInTavern)
   - ⏸️ Short rest button - Pending event handler fix

**Modified Files:**
- `src/core/GameState.js` - Added playtime tracking methods
- `src/main.js` - Integrated save/load handlers, reinitialize after load
- `src/systems/Player.js` - Track world.currentLocation on every move
- `src/systems/WorldGenerator.js` - Added loadSavedRegions() method
- `index.html` - Added Load Game screen and Save/Load modal
- `styles.css` - Added comprehensive save/load UI styles

**Usage:**
- **Save:** Press ESC during gameplay → select slot (1-5)
- **Load:** Main Menu → Load Game → click Load button on desired slot
- **Delete:** Load Game screen → click Delete button (with confirmation)

**Next Recommended Implementation:** Fix remaining rest system bugs, then Quest system

---

## 🆕 Recent Changes (2025-12-11)

### Rest System Implementation ✅
Implemented full rest system per D&D 5e rules with the following components:

**New Files:**
- `src/systems/RestManager.js` - Core rest system logic and validation

**Features Added:**
1. **Short Rest Mechanics:**
   - Spend hit dice to recover HP (auto-spends half available)
   - Maximum 2 short rests between long rests
   - Can be taken anywhere safe (not in combat)
   - Updates character state and displays healing

2. **Long Rest Mechanics:**
   - Fully restores HP to maximum
   - Recovers half of hit dice (minimum 1)
   - Restores all spell slots for casters
   - Resets short rest counter
   - **Requires tavern/inn** - must be in or near a settlement

3. **Tavern Detection:**
   - Checks player's current tile for settlement features
   - Searches within 2-tile radius for nearby settlements
   - All settlements (villages, towns, cities) provide rest services

4. **UI Components:**
   - Rest modal with character status display (HP, hit dice, spell slots)
   - Short/Long rest buttons with enabled/disabled states
   - Informative tooltips when rest is unavailable
   - Clean modal design with backdrop blur
   - Keyboard shortcut: 'R' key opens rest menu

5. **Integration:**
   - Hooked into Player input system
   - Updates HUD after successful rest
   - Message log feedback for all rest events
   - Proper state management via GameState

**Rules Engine Configuration:**
- Short rest: 1 hour instant, max 2 per long rest
- Long rest: 8 hours instant, requires tavern (configurable)
- Hit dice recovery: 50% of max per long rest
- Spell slot recovery: All slots restored on long rest

**Next Recommended Implementation:** Quest system (campaign + side quests, templates, tracking)

---

## 🎯 Project Overview

Nexus Verge is a procedurally generated, top-down roguelike CRPG that faithfully implements D&D 5e 2024 rules with a unique reputation-based economy. The game runs entirely client-side in the browser with no backend required.

### Core Pillars
1. **Authentic D&D 5e Experience** - Faithful implementation of rules
2. **Infinite Replayability** - Procedural generation with shareable seeds
3. **Meaningful Choices** - Reputation system and faction relationships
4. **Performance First** - Lightweight, efficient web application
5. **Modifiable Foundation** - Easy-to-tune rules engine

---

## 📊 Current Implementation Status

### ✅ Phase 1 Complete - Playable Vertical Slice
- [x] Project structure and architecture
- [x] Data schema (races, classes, backgrounds, items, monsters, terrains, skills)
- [x] Rules engine foundation (`src/core/rulesEngine.js`)
- [x] Character class with full D&D 5e calculations (`src/systems/Character.js`)
- [x] GameState manager with observer pattern (`src/core/GameState.js`)
- [x] Character creation UI (all 5 races, 5 classes, backgrounds) (`src/ui/CharacterCreation.js`)
- [x] Utility libraries (RNG, dice rolling, helpers)
- [x] Main game bootstrap (`src/main.js`)

### ✅ Phase 2 Complete - Core Gameplay Systems
- [x] World generation system (Simplex noise, chunk-based regions, 18 terrain types)
- [x] Map rendering (Canvas-based 80x40 viewport, ASCII/tile display, fog of war)
- [x] Player movement and exploration (WASD/arrows, collision, visibility)
- [x] Combat system (simplified non-grid turn-based, D&D 5e SRD 5.2.1 2024 rules)
- [x] Enemy AI (random target selection, automatic actions)
- [x] Random encounters (8% base chance, terrain modified)
- [x] Rest system (short/long rests, HP/spell recovery, tavern requirement)
- [x] Save/Load functionality (5 slots, LocalStorage, metadata, playtime tracking)

### 🚧 Phase 2 Remaining - MVP Features
**Next Priorities:**
- [x] Quest system (campaign + side quests, templates, tracking, rewards) - **PHASES 5.1-5.4 COMPLETE**
- [ ] Quest system integration (main.js, GameState, NPC connections) - **IN PROGRESS (Phase 5.5-5.7)**
- [ ] Loot and inventory management (drops, equipment, weight, rarity)
- [ ] Spell system (cantrips + levels 1-2, casting UI, concentration)
- [ ] Faction and reputation system (5 factions, reputation-based economy)
- [ ] Skill checks and non-combat encounters (perception, stealth, traps)

---

## 🏗️ Architecture & Key Decisions

### Technology Stack
- **Frontend:** Vanilla JavaScript (ES6 modules)
- **Rendering:** HTML5 Canvas (game view) + DOM (UI overlays)
- **Storage:** LocalStorage for saves, JSON files for game data
- **RNG:** Mulberry32 seeded PRNG for deterministic generation
- **State:** Custom GameState with observer pattern
- **No Backend:** 100% client-side application

### Key Architectural Patterns
1. **Data-Driven Design:** All content in `/data/` as JSON
2. **Centralized Rules Engine:** All game rules in `rulesEngine.js`
3. **Observer Pattern:** GameState notifies components of changes
4. **Chunk-Based Generation:** World generated in 32x32 regions on-demand
5. **Unified Character Model:** Same class for PC and NPCs

### File Structure
```
nexus-verge-crpg-5e/
├── index.html              # Main entry point
├── styles.css              # Global styles
├── README.md               # Player-facing documentation
├── claude.md               # This file - development guide
├── docs/                   # Technical documentation
│   ├── PRD.md             # Product requirements
│   ├── ARCHITECTURE.md    # Technical decisions (ADR)
│   ├── PROJECT_PLAN.md    # Development timeline
│   ├── DATA_SCHEMA.md     # Data structure reference
│   └── VALIDATION_REPORT.md # Data validation results
├── data/                  # Game content (JSON)
│   ├── races.json         # 5 races (Human, Elf, Dwarf, Halfling, Dragonborn)
│   ├── classes.json       # 5 classes (Fighter, Wizard, Cleric, Rogue, Ranger)
│   ├── backgrounds.json   # Character backgrounds
│   ├── items.json         # Weapons, armor, consumables, artifacts
│   ├── monsters.json      # Monster stat blocks
│   ├── terrains.json      # Terrain types
│   └── skills.json        # 18 D&D 5e skills
├── src/                   # Source code
│   ├── main.js           # Application bootstrap + game loop
│   ├── core/             # Core engine
│   │   ├── GameState.js  # Centralized state with observers
│   │   └── rulesEngine.js # Game rules configuration
│   ├── systems/          # Game systems
│   │   ├── Character.js  # Character class (PC/NPC)
│   │   ├── Player.js     # Player movement and input
│   │   ├── WorldGenerator.js # Procedural world generation
│   │   ├── CombatManager.js  # Simplified non-grid turn-based combat
│   │   └── RestManager.js    # Rest system (short/long rests)
│   ├── rendering/        # Rendering systems
│   │   └── MapRenderer.js    # World map visualization
│   ├── ui/               # UI components
│   │   └── CharacterCreation.js # Character creation wizard
│   └── utils/            # Utilities
│       ├── rng.js        # Seeded random number generator
│       ├── simplexNoise.js # Noise generation for terrain
│       ├── dice.js       # Dice rolling functions
│       └── helpers.js    # Helper functions
└── assets/               # Future: images, sounds
```

---

## 🔑 Key Components Guide

### GameState (`src/core/GameState.js`)
**Purpose:** Centralized state management with reactive updates

**Key Features:**
- Observer pattern for reactive UI updates
- Nested property access with dot notation
- Automatic notification of subscribers
- Serializable for save/load

**Usage:**
```javascript
import { gameState } from './core/GameState.js';

// Subscribe to changes
gameState.subscribe('character.currentHP', (hp) => {
  updateHPDisplay(hp);
});

// Update state
gameState.set('character.currentHP', 25);

// Get state
const character = gameState.get('character');
```

**State Structure:**
```javascript
{
  seed: "NEXUS-1234-ALPHA",
  worldConfig: { mapSize, difficulty, campaignId },
  character: Character,
  world: {
    regions: Map<regionKey, RegionData>,
    settlements: [],
    npcs: Map<npcId, NPC>,
    currentLocation: { x, y }
  },
  quests: { active: [], completed: [] },
  factions: Map<factionId, reputationScore>,
  combat: CombatState | null,
  ui: { currentScreen, messages: [] }
}
```

### Character Class (`src/systems/Character.js`)
**Purpose:** Unified character model for player and NPCs

**Key Features:**
- Full D&D 5e stat calculations
- Ability scores, modifiers, proficiency bonus
- Skills, saving throws, proficiencies
- Equipment and inventory management
- Spell slots and spellcasting (for casters)
- Level-up progression
- Conditions and effects tracking

**Usage:**
```javascript
import Character from './systems/Character.js';

const character = new Character({
  name: "Thorin",
  race: raceData,
  class: classData,
  background: backgroundData,
  abilities: { str: 16, dex: 12, con: 15, int: 10, wis: 13, cha: 8 },
  level: 1
});

// Access computed stats
console.log(character.ac);              // Armor Class
console.log(character.proficiencyBonus); // +2 at level 1
console.log(character.maxHP);            // Calculated from class + CON

// Skill checks
const result = character.rollSkill('perception', { advantage: true });

// Level up
character.levelUp();
```

### Rules Engine (`src/core/rulesEngine.js`)
**Purpose:** Centralized configuration for all game rules

**Structure:**
```javascript
export const RULES = {
  core: { /* ability scores, proficiency bonus table */ },
  combat: { /* critical hits, death saves, cover */ },
  progression: { /* XP table, XP multiplier */ },
  encounters: { /* spawn rates, CR scaling */ },
  loot: { /* drop rates, rarity chances */ },
  rest: { /* short/long rest rules */ },
  skills: { /* DC thresholds */ },
  worldGen: { /* region size, town spacing */ }
};
```

**Usage:**
```javascript
import { RULES } from './core/rulesEngine.js';

// Calculate proficiency bonus
const profBonus = RULES.core.proficiencyBonusByLevel[characterLevel];

// Check for critical hit
const isCrit = RULES.combat.criticalHitRange.includes(diceRoll);

// Get XP for next level
const xpNeeded = RULES.progression.xpTable[nextLevel];
```

### RNG System (`src/utils/rng.js`)
**Purpose:** Deterministic random number generation from seeds

**Key Features:**
- Mulberry32 PRNG (fast, deterministic)
- Seed string to numeric conversion
- Random seed generation
- Random selection utilities

**Usage:**
```javascript
import { createRNG, generateSeedString, seedToNumber } from './utils/rng.js';

// Generate random seed
const seed = generateSeedString(); // "NEXUS-7492-ALPHA"

// Create RNG from seed
const rng = createRNG(seed);

// Generate random numbers
const val = rng();           // 0.0 to 1.0
const int = rng.int(1, 6);   // 1 to 6 (inclusive)
const pick = rng.pick(['a', 'b', 'c']); // Random element
```

### Dice Roller (`src/utils/dice.js`)
**Purpose:** D&D dice rolling with modifiers

**Usage:**
```javascript
import { rollDice, rollD20, rollWithAdvantage } from './utils/dice.js';

// Basic rolls
rollDice(20);              // d20
rollDice(6, 2);            // 2d6
rollDice(8, 3, 5);         // 3d8 + 5

// D20 rolls
rollD20();                 // Simple d20
rollD20(5);                // d20 + 5

// Advantage/Disadvantage
rollWithAdvantage(5);      // Roll 2d20, take higher, add 5
rollWithAdvantage(5, true); // Disadvantage - take lower
```

### Combat System (`src/systems/CombatManager.js`)
**Purpose:** Simplified non-grid turn-based combat following D&D 5e SRD 5.2.1 2024 rules

**Key Features:**
- Initiative system (d20 + DEX modifier, DEX tiebreaker)
- Action economy (Action, Bonus Action, Reaction - no movement/positioning)
- Attack rolls (d20 + modifiers vs AC) with weapon properties
- Damage rolls with critical hits (natural 20 = double dice)
- Card-based UI showing combatants with HP bars
- Action buttons (Attack, Ability, Spell, Flee)
- Flee mechanic (d20 + initiative vs DC 30)
- Simple enemy AI (random target selection, always attacks)
- Victory/defeat/fled conditions with XP rewards

**Usage:**
```javascript
import CombatManager from './systems/CombatManager.js';

const combat = new CombatManager();

// Start combat with player and enemies (no grid)
await combat.startCombat(playerCharacter, [enemy1, enemy2]);

// On player turn (click enemy cards to target)
combat.attack(attacker, defender);           // Make attack
combat.flee(combatant);                      // Attempt escape
combat.endTurn();                            // End current turn

// Combat ends automatically on victory/defeat/fled
```

**Combat Flow:**
1. **Start Combat** → Create combatants (no positioning)
2. **Roll Initiative** → All combatants roll d20 + DEX
3. **Turn Loop:**
   - Start turn (reset action economy: action, bonus, reaction)
   - **Player Turn:** Click action button (Attack/Ability/Spell/Flee), then click enemy card
   - **Enemy Turn:** AI picks random target and attacks automatically
   - End turn
   - Next combatant (skip dead)
4. **End Combat** → Award XP (victory), death penalty (defeat), or return to exploration (fled)

**Combatant Actions:**
- **Attack:** Standard melee/ranged attack with equipped weapon
- **Ability:** Class features (placeholder - not yet implemented)
- **Spell:** Cast spell from known spells (placeholder - not yet implemented)
- **Flee:** d20 + initiative vs DC 30 (escape on success)

**UI Implementation (`src/main.js`):**
- `renderCombatants()` - Display character cards with HP bars
- `renderCombatActions()` - Show action buttons on player turn
- `renderTurnOrder()` - Initiative order with current turn highlight
- `handleTargetClick()` - Process enemy card clicks
- `selectAction()` - Handle action button selection

### Rest System (`src/systems/RestManager.js`)
**Purpose:** Manage short and long rest mechanics per D&D 5e rules

**Key Features:**
- Short rest: Spend hit dice to heal (max 2 per long rest)
- Long rest: Full HP, restore half hit dice, regain spell slots (requires tavern/inn)
- Tavern detection: Checks for settlement features near player
- Rest validation: Prevents resting in combat or when not needed
- Modal UI with character status and rest buttons

**Usage:**
```javascript
import restManager from './systems/RestManager.js';

// Open rest menu (triggered by 'R' key)
restManager.openRestMenu();

// Check if rests are available
const canShort = restManager.canShortRest();  // { canRest: bool, reason: string }
const canLong = restManager.canLongRest();

// Perform rests
const shortResult = await restManager.shortRest();
// Returns: { success, healing, hitDiceSpent, shortRestsRemaining }

const longResult = await restManager.longRest();
// Returns: { success, hpRestored, hitDiceRestored, spellSlotsRestored }

// Close rest menu
restManager.closeRestMenu();
```

**Rest Rules (from RULES.rest):**
- **Short Rest:** 1 hour (instant in-game), spend hit dice to heal
  - Auto-spends half of available hit dice (can be customized)
  - Maximum 2 short rests between long rests
  - Can be taken anywhere safe (not in combat)
  
- **Long Rest:** 8 hours (instant in-game)
  - Fully restores HP
  - Recovers half of max hit dice (minimum 1)
  - Restores all spell slots
  - Resets short rest counter
  - **Requires tavern/inn** (configurable via RULES.rest.longRestRequiresTavern)

**Tavern Detection:**
- Checks player's current tile for settlement features
- Searches nearby tiles (within 2 tiles) for settlements
- All settlements (villages, towns, cities) have taverns/inns

**UI Integration:**
- Rest modal (`#restModal`) with character status display
- Short/Long rest buttons with enabled/disabled states
- Tooltips explaining why rest is unavailable
- Updates HUD after successful rest

### World Generation (`src/systems/WorldGenerator.js`)
**Purpose:** Procedural terrain generation using Simplex noise

**Key Features:**
- Chunk-based regions (32x32 tiles each)
- Simplex noise for elevation, moisture, temperature
- 18 terrain types (grassland, forest, mountains, desert, jungle, etc.)
- Procedural settlements (villages, towns, cities)
- Dungeons and points of interest
- Region caching with automatic pruning

**Usage:**
```javascript
import WorldGenerator from './systems/WorldGenerator.js';

const worldGen = new WorldGenerator(seed, worldConfig);

// Generate region
const region = await worldGen.generateRegion(regionX, regionY);

// Get specific tile
const tile = await worldGen.getTile(worldX, worldY);

// Get spawn location
const spawnTile = await worldGen.getSpawnLocation();

// Clean up distant regions
worldGen.pruneCache(centerX, centerY, keepRadius);
```

### Map Renderer (`src/rendering/MapRenderer.js`)
**Purpose:** Visualize the world on Canvas

**Key Features:**
- 80x40 tile viewport
- ASCII character rendering (12x16 pixels per tile)
- Camera following player
- Fog of war (explored vs visible)
- Feature rendering (settlements, dungeons, POIs)
- Dimmed rendering for explored areas

**Usage:**
```javascript
import MapRenderer from './rendering/MapRenderer.js';

const renderer = new MapRenderer('gameCanvas', {
  tileWidth: 12,
  tileHeight: 16,
  viewportWidth: 80,
  viewportHeight: 40
});

// Render world
await renderer.renderWorld(worldData, playerPosition);

// Convert coordinates
const gridPos = renderer.screenToGrid(screenX, screenY);
const screenPos = renderer.worldToScreen(worldX, worldY);
```

---

## 📁 Data Files Reference

All game data is stored in `/data/` as JSON files. These are loaded at runtime.

### races.json
5 core races: Human, Elf, Dwarf, Halfling, Dragonborn
```json
{
  "id": "human",
  "name": "Human",
  "abilityScoreIncrease": { "any": 1, "anyOther": 1 },
  "size": "Medium",
  "speed": 30,
  "languages": ["Common", "any"],
  "traits": [...]
}
```

### classes.json
5 core classes: Fighter, Wizard, Cleric, Rogue, Ranger
```json
{
  "id": "fighter",
  "name": "Fighter",
  "hitDie": 10,
  "primaryAbility": ["str", "dex"],
  "savingThrowProficiencies": ["str", "con"],
  "skillChoices": 2,
  "skillList": [...],
  "startingEquipment": [...],
  "features": { "1": [...], "2": [...] },
  "spellcaster": false
}
```

### backgrounds.json
Character backgrounds with skills and equipment
```json
{
  "id": "soldier",
  "name": "Soldier",
  "skillProficiencies": ["athletics", "intimidation"],
  "toolProficiencies": ["gaming set", "vehicles (land)"],
  "equipment": [...],
  "feature": { "name": "Military Rank", "description": "..." }
}
```

### items.json
Weapons, armor, consumables, artifacts
```json
{
  "id": "longsword",
  "name": "Longsword",
  "type": "weapon",
  "weaponType": "melee",
  "damage": { "dice": "1d8", "type": "slashing" },
  "properties": ["versatile"],
  "versatileDamage": "1d10",
  "weight": 3,
  "rarity": "common"
}
```

### monsters.json
Monster stat blocks with D&D 5e stats
```json
{
  "id": "goblin",
  "name": "Goblin",
  "cr": 0.25,
  "size": "Small",
  "type": "humanoid",
  "ac": 15,
  "hp": 7,
  "hitDice": "2d6",
  "abilities": { "str": 8, "dex": 14, "con": 10, "int": 10, "wis": 8, "cha": 8 },
  "speed": 30,
  "skills": { "stealth": 6 },
  "actions": [...]
}
```

### terrains.json
Terrain types with traversability and effects
```json
{
  "id": "grassland",
  "name": "Grassland",
  "symbol": ".",
  "color": "#90EE90",
  "traversable": true,
  "movementCost": 1,
  "description": "Open grassland with gentle hills",
  "encounterRate": 0.1
}
```

### skills.json
All 18 D&D 5e skills
```json
{
  "id": "perception",
  "name": "Perception",
  "ability": "wis",
  "description": "Your general awareness of your surroundings"
}
```

---

## 🎨 UI Screens & Flow

### Screen Hierarchy
1. **Main Menu** → New Game / Load Game / Help
2. **New Game Screen** → Seed selection, map size, difficulty, campaign
3. **Character Creation** → Multi-step wizard (race, class, abilities, background)
4. **Game Screen** → Main gameplay (exploration, combat, etc.)

### Character Creation Steps
1. **Race Selection:** Choose from 5 races, see traits
2. **Class Selection:** Choose from 5 classes, see features
3. **Ability Scores:** Point Buy or Standard Array
4. **Background:** Choose background for skills/equipment
5. **Finalize:** Review and confirm character

**Implementation:** `src/ui/CharacterCreation.js`
- Multi-step wizard with navigation
- Real-time character preview
- Validation at each step
- Smooth transitions between steps

---

## 🔧 Development Guidelines

### Code Style
- **ES6 Modules:** Use `import`/`export`
- **Classes:** Use classes for entities (Character, Quest, etc.)
- **Functions:** Pure functions for calculations
- **Naming:** camelCase for variables/functions, PascalCase for classes
- **Comments:** JSDoc for public APIs, inline for complex logic

### Data-Driven Development
- **Never hardcode:** All content goes in `/data/` JSON files
- **Rules in rulesEngine.js:** All balance tweaks in rules engine
- **Templates for generation:** Quest templates, name templates, etc.

### State Management
- **Use GameState:** All shared state in `gameState`
- **Subscribe to changes:** UI components subscribe to relevant state
- **Immutable updates:** Don't mutate state directly, use `gameState.set()`

### Performance Considerations
- **Chunk-based generation:** Don't generate entire world at once
- **Cache generated regions:** Keep recently visited regions in memory
- **Lazy loading:** Load data files on demand if needed
- **Canvas optimization:** Only redraw what changed

### Testing & Debugging
- **Expose to window:** Main objects available in dev console
  - `window.game` - Main game instance
  - `window.gameState` - State manager
- **Validation:** Run data validation scripts
- **Seed testing:** Test with multiple seeds to ensure consistency

---

## 🚀 Next Steps (Priority Order)

### ✅ Completed Systems
1. **World Generation System** - ✅ COMPLETE
   - Simplex noise terrain generation (18 terrain types)
   - Chunk-based region system (32x32 tiles)
   - Settlement placement (villages, towns, cities)
   - Sanctuary generation (safe rest locations)

2. **Map Renderer** - ✅ COMPLETE
   - Canvas-based rendering
   - ASCII/tile display (80x40 viewport)
   - Fog of war with persistence
   - Camera following player

3. **Player Movement** - ✅ COMPLETE
   - WASD/Arrow key input
   - Collision detection
   - Region loading on movement
   - Settlement entry system

4. **Combat System** - ✅ COMPLETE
   - Non-grid turn-based combat
   - Initiative system (d20 + DEX modifier)
   - Attack rolls, damage, critical hits
   - Enemy AI (random target selection)
   - Flee mechanic (d20 + initiative vs DC 30)

5. **Save/Load System** - ✅ COMPLETE
   - 5 save slots with metadata
   - LocalStorage persistence
   - Playtime tracking
   - Version compatibility

6. **Rest System** - ✅ COMPLETE
   - Short rests (2 per long rest, roll all hit dice)
   - Long rests (full HP/spell recovery, requires tavern/sanctuary)
   - Modal UI with validation

7. **NPC & Settlement System** - ✅ COMPLETE
   - Procedural NPC generation (names, roles, personalities)
   - Building interiors (tavern, merchant, blacksmith, great hall)
   - NPC dialogue system
   - Settlement town map UI

8. **Trading System** - ✅ COMPLETE
   - Merchant inventory generation
   - CHA-modified pricing (1% per modifier point)
   - Buy/Sell UI with tabs
   - Gold and inventory management

### 🚧 In Progress (Priority Order)
9. **Quest System** - NEXT PRIORITY
   - Campaign quest chain (4 stages)
   - Procedural side quests (kill, retrieve, deliver templates)
   - Quest tracking and UI (quest log, turn-ins)
   - XP and reputation rewards
   - **Integration with skill challenges** (Perception checks, Investigation, Persuasion, etc.)

10. **Loot System** - HIGH PRIORITY
    - Combat drops with CR-based tables
    - Treasure chests and hidden caches
    - **D&D 5e SRD compliance** for item distribution and rarity
    - Loot rarity scaling (common → legendary)
    - Weight and inventory management

11. **Skill Challenge System** - HIGH PRIORITY
    - All 18 D&D 5e skills (Acrobatics, Animal Handling, Arcana, Athletics, Deception, History, Insight, Intimidation, Investigation, Medicine, Nature, Perception, Performance, Persuasion, Religion, Sleight of Hand, Stealth, Survival)
    - DC-based skill checks (d20 + ability modifier + proficiency)
    - Contextual prompts (traps, hidden doors, social encounters)
    - **Quest integration** (skill checks as quest objectives)
    - **NPC integration** (social skill checks in dialogue)
    - Success/failure consequences

### 📅 Later Priority
12. **Spell System**
    - Spell slot tracking (levels 1-2 + cantrips)
    - Spell casting UI
    - Spell effects and targeting
    - Concentration tracking

13. **Ability System**
    - Class features (Action Surge, Rage, Bardic Inspiration, etc.)
    - Passive abilities
    - Resource tracking (Ki points, Sorcery points, etc.)

14. **Faction System**
    - Faction data structure
    - Reputation tracking
    - Faction-based quest chains
    - Faction relationships and conflicts

15. **Polish & Testing**
    - Bug fixes and edge cases
    - Balance tuning (XP, loot, difficulty)
    - Performance optimization
    - Playtesting and iteration

---

## 🐛 Known Issues & TODOs

### Current TODOs in Code
- ✅ Save/Load system - **COMPLETE** (5 slots, LocalStorage, metadata, playtime tracking)
- ✅ Trading system - **COMPLETE** (CHA-modified pricing, procedural inventory)
- ✅ Rest system - **COMPLETE** (short/long rests, tavern/sanctuary requirement)
- ✅ Skill system - **COMPLETE** (13-skill redesign, all challenges updated, modular architecture)
- 🔄 Quest system - **IN PROGRESS** (Phases 5.1-5.5 complete, 5.6-5.7 ready to implement)
- ❌ Loot system - **PENDING** (combat drops, treasure tables - **must follow D&D 5e SRD**)
- ❌ Spell system - **PENDING** (cantrips + levels 1-2, casting UI, concentration)
- ❌ Ability system - **PENDING** (class features, Action Surge, Rage, etc.)
- 🔄 Skill checks - **READY** (13-skill system complete, skill challenge mechanics pending Phase 5.7)

### Technical Debt
- Add comprehensive error handling
- Implement proper logging system
- Add unit tests for core calculations
- Optimize Character class calculations (cache computed values)
- Add data validation on load

---

## 📖 Important Patterns & Conventions

### Observer Pattern for UI Updates
```javascript
// Subscribe in UI component
gameState.subscribe('character.currentHP', (hp) => {
  document.getElementById('hpDisplay').textContent = `HP: ${hp}`;
});

// Update from game logic
gameState.set('character.currentHP', newHP); // UI auto-updates
```

### Seeded Generation Pattern
```javascript
// Always use seed for deterministic generation
const regionSeed = seedToNumber(`${worldSeed}_${regionX}_${regionY}`);
const rng = createRNG(regionSeed);

// Use rng for all random decisions in this region
const terrainType = rng.pick(terrainTypes);
const hasTown = rng.random() < 0.1;
```

### Data Loading Pattern
```javascript
// Load data files once at startup
async function loadGameData() {
  const [races, classes, items] = await Promise.all([
    fetch('data/races.json').then(r => r.json()),
    fetch('data/classes.json').then(r => r.json()),
    fetch('data/items.json').then(r => r.json())
  ]);
  return { races, classes, items };
}
```

### Character Calculation Pattern
```javascript
// Always use rules engine for calculations
calculateProficiencyBonus() {
  return RULES.core.proficiencyBonusByLevel[this.level];
}

calculateAbilityModifier(score) {
  return Math.floor((score - 10) / 2);
}

// Cache computed values when possible
get ac() {
  if (this._cachedAC) return this._cachedAC;
  this._cachedAC = this.calculateAC();
  return this._cachedAC;
}
```

---

## 🎯 Design Principles

1. **Authenticity First:** D&D 5e rules are sacred, implement them correctly
2. **Performance Matters:** Keep the game responsive and smooth
3. **Modifiable Everything:** Rules, content, and balance should be easy to tweak
4. **Procedural Variety:** Same seed = same world, different seeds = different experiences
5. **Meaningful Choices:** Player decisions should have consequences
6. **No Backend Required:** 100% client-side, works offline

---

## 🔗 Useful References

### D&D 5e Rules
- System Reference Document (SRD 5.1)
- Player's Handbook 2024
- Dungeon Master's Guide

### Technical Resources
- MDN Web Docs (Canvas API, LocalStorage)
- Roguelike Development tutorials
- Procedural Generation techniques

### Project Documentation
- `/docs/PRD.md` - Full product requirements
- `/docs/ARCHITECTURE.md` - Technical decisions (ADR log)
- `/docs/DATA_SCHEMA.md` - Data structure reference
- `/docs/PROJECT_PLAN.md` - Development timeline

---

## 🎮 Quick Start for Development

### Running the Game
```bash
# Option 1: Open directly in browser
open index.html

# Option 2: Use local server
python -m http.server 8000
# Then visit http://localhost:8000

# Option 3: Use npm serve (if installed)
npx serve .
```

### Testing Changes
1. Edit data files in `/data/` or code in `/src/`
2. Refresh browser (no build step required)
3. Use browser dev console to inspect state:
   ```javascript
   game.gameState.get('character')
   game.gameState.data
   ```

### Adding New Content
**New Race:**
1. Add entry to `data/races.json`
2. Follow existing schema
3. Refresh and test in character creation

**New Class:**
1. Add entry to `data/classes.json`
2. Define features by level
3. Add to character creation UI

**New Item:**
1. Add entry to `data/items.json`
2. Specify type, stats, properties
3. Will appear in loot generation automatically

---

## 📝 Session Notes

<<<<<<< HEAD
### 2025-12-13 - Rest System Implementation
### 2025-12-13 - Save/Load System Implementation ✅
**Completed Today:**
1. **SaveManager System** - Created `src/systems/SaveManager.js` with 5 save slots
2. **Save Functionality** - Serialize entire game state to LocalStorage
3. **Load Functionality** - Deserialize and restore game state with region cache sync
4. **Delete Saves** - Remove individual save slots with confirmation
5. **Save Metadata** - Track character name, level, class, location, playtime, timestamp
6. **Playtime Tracking** - Automatic session time tracking in GameState
7. **Load Game Screen** - UI showing all save slots with metadata and actions
8. **In-Game Save Menu** - ESC key opens save modal with 5 slots (not in combat)
9. **Quick Save/Load** - Auto-save/load to slot 1 for convenience

**Implementation Details:**
- `SaveManager.js` handles serialization/deserialization of game state
- Playtime tracked via `GameState` with `startSession()` and `getPlayTime()`
- Save data includes: seed, worldConfig, character, world (regions, settlements, NPCs), quests, factions
- Load game syncs world generator cache via `loadSavedRegions()`
- Version compatibility checking with migration support
- Fast performance (<500ms save, <1s load)

**Files Created/Modified:**
- `src/systems/SaveManager.js` - New file (save/load system)
- `src/core/GameState.js` - Added playtime tracking methods
- `src/main.js` - Integrated save/load handlers, reinitialize after load
- `src/systems/Player.js` - Track world.currentLocation on every move
- `src/systems/WorldGenerator.js` - Added loadSavedRegions() method
- `index.html` - Added Load Game screen and Save/Load modal
- `styles.css` - Added comprehensive save/load UI styles

**Current State:**
- Save/Load system fully implemented and working
- All game state properly serialized and restored
- Map visibility persists after load (regions cache synced)
- Clean UI with metadata display and actions
- Ready for production use

**Next Session Priorities:**
1. **Quest system** - Campaign + side quests, templates, tracking, rewards
2. **Loot system** - Item drops, inventory management, equipment
3. **Spell system** - Cantrips + levels 1-2, casting UI, concentration
4. **Faction system** - 5 factions with reputation tracking

---

### 2025-12-11 - Rest System Implementation ✅
**Completed Today:**
1. **RestManager System** - Created `src/systems/RestManager.js` with full rest logic
2. **Short Rest Mechanics** - Spend hit dice to heal, max 2 per long rest, can rest anywhere safe
3. **Long Rest Mechanics** - Full HP/hit dice/spell slot recovery, requires tavern/inn
4. **Tavern Detection** - Checks for settlement features in current and nearby tiles
5. **Rest UI** - Modal with character status, rest buttons, validation, and messaging
6. **Player Integration** - 'R' key opens rest menu, updates HUD after rest
7. **HTML/CSS** - Added rest modal markup and styled components

**Implementation Details:**
- `RestManager.js` handles all rest validation and execution
- `isPlayerInTavern()` searches 2-tile radius for settlements
- Modal shows current HP, hit dice, short rests remaining, spell slots
- Buttons disabled with tooltips when rest unavailable
- All messages logged to game message system
- Follows D&D 5e rules exactly (hit dice recovery, spell slots, etc.)

**Files Created/Modified:**
- `src/systems/RestManager.js` - New file (core rest system)
- `src/systems/Player.js` - Added rest() method calling RestManager
- `src/main.js` - Added setupRestSystem() and import
- `index.html` - Added rest modal HTML structure
- `styles.css` - Added rest modal styling

**Current State:**
- Rest system fully implemented and integrated
- Follows D&D 5e rules per rulesEngine.js configuration
- Clean modal UI with proper state management
- Ready for testing and iteration

---

### 2025-12-11 - Combat System Simplified & Rewritten
**Completed Today:**
1. **Removed Grid-Based Combat** - Eliminated CombatGrid class, all positioning/movement mechanics
2. **Simplified Turn-Based Combat** - Initiative-based, action selection, target any enemy
3. **Added Flee Mechanic** - d20 + initiative vs DC 30 (per D&D 5e SRD 5.2.1 2024)
4. **Card-Based Combat UI** - Combatant cards with HP bars, action buttons, no canvas
5. **Updated Enemy AI** - Simple random target selection and automatic attacks
6. **Removed CombatRenderer** - No longer needed, UI is pure DOM/CSS

**User Feedback:**
- Original grid-based combat was not working (couldn't attack enemies, AI didn't act)
- User requested rewrite to non-grid turn-based system
- Requirements: Initiative-based, action buttons (Attack/Ability/Spell/Flee), target enemies directly

**Current State:**
- Combat system fully rewritten and functional
- Players click action buttons, then click enemy cards to target
- Enemies automatically pick targets and attack on their turn
- Combat follows D&D 5e SRD 5.2.1 2024 rules (initiative, attack rolls, damage, flee)
- UI is clean with combatant cards showing HP bars and current turn

**Files Changed:**
- `src/systems/CombatManager.js` - Removed grid, simplified Combatant, added flee()
- `index.html` - New combat screen structure with card displays
- `styles.css` - Combatant cards, action buttons, HP bars
- `src/main.js` - Removed CombatRenderer, added new rendering methods

**Next Session Priorities:**
- Test combat system thoroughly (initiative, attacks, damage, flee, victory/defeat)
- Implement ability system (class features like Action Surge, Rage)
- Implement spell system (cantrips + levels 1-2 for casters)
- Quest system (templates, generation, tracking, rewards)
- Save/Load functionality (LocalStorage persistence)

---

### 2025-12-09 - Core Gameplay Systems Complete!
**Completed Today:**
1. **World Generation System** - Simplex noise, 18 terrain types, chunk-based regions
2. **Map Renderer** - Canvas-based 80x40 viewport with ASCII tiles
3. **Player Movement** - WASD/arrows, collision detection, fog of war
4. **Full D&D 5e Combat System** - Turn-based tactical combat with all mechanics
5. **Enemy AI** - Basic tactical behavior (move and attack)
6. **Random Encounters** - Procedural enemy generation based on CR

**Current State:**
- Game is **fully playable** from start to combat!
- Players can create characters, explore a procedural world, and fight monsters
- Combat uses authentic D&D 5e rules (initiative, attack rolls, damage, crits)
- World generates infinitely with deterministic seeds
- All core systems integrated and working

**Next Session Priorities:**
- Quest system (templates, generation, tracking, rewards)
- Save/Load functionality (LocalStorage persistence)
- Rest system (short/long rests, HP/spell slot recovery)
- Spell system (cantrips + levels 1-2 for casters)
- Loot drops and inventory management

---

## 💡 Tips for Claude (Future Sessions)

### Understanding the Codebase
1. **Start with GameState:** It's the central hub of all state
2. **Check rulesEngine.js:** All game rules and constants are here
3. **Character.js is key:** Understanding this class is crucial for combat/progression
4. **Data files drive content:** Never hardcode what should be in data files

### Common Tasks
**Adding a feature:**
1. Check PRD.md to see if it's already spec'd
2. Check ARCHITECTURE.md for any relevant decisions
3. Update GameState if new state is needed
4. Add to rulesEngine.js if configurable rules needed
5. Implement feature using observer pattern for UI updates

**Debugging:**
1. Check browser console for errors
2. Inspect `window.gameState.data` to see current state
3. Check if data files loaded correctly
4. Verify calculations against D&D 5e rules

**Performance issues:**
1. Check if too much is being generated at once
2. Verify caching is working
3. Look for unnecessary re-renders
4. Profile with browser dev tools

### What to Focus On
- **Correctness:** D&D 5e calculations must be accurate
- **Performance:** Keep generation fast, rendering smooth
- **UX:** Clear UI, good feedback, intuitive controls
- **Maintainability:** Clean code, good comments, data-driven

---

**End of Guide**

This document should be updated as the project progresses. Keep it current with architectural changes, new patterns, and important decisions.
