# Project Plan - Nexus Verge
# D&D 5e Roguelike CRPG

**Version:** 1.0
**Last Updated:** 2025-12-09
**Timeline:** 7 Days (2 days for vertical slice, 5 additional days for MVP)

---

## Phase 1: Playable Vertical Slice
**Duration:** Days 1-2
**Goal:** Demonstrate core gameplay loop end-to-end

### Day 1: Foundation & Core Systems

#### Morning Session (4 hours)
**Task 1.1: Project Setup (30 min)**
- [ ] Initialize project structure
- [ ] Create directory structure:
  ```
  /src
    /core         (game engine)
    /systems      (combat, character, world)
    /rendering    (canvas, UI)
    /data         (JSON files)
    /utils        (helpers, RNG, dice)
  /docs           (documentation)
  /assets         (future: images, sounds)
  ```
- [ ] Create index.html with canvas element
- [ ] Set up ES6 modules
- [ ] Create basic CSS for layout

**Task 1.2: Data Structures - Core Tables (1.5 hours)**
- [ ] Create `data/races.json` (Human, Elf, Dwarf for Phase 1)
- [ ] Create `data/classes.json` (Fighter for Phase 1)
- [ ] Create `data/items.json` (10 basic weapons, 5 armor types)
- [ ] Create `data/monsters.json` (5 basic enemies: Goblin, Wolf, Skeleton, Orc, Bandit)
- [ ] Create `data/terrains.json` (5 terrain types: grass, forest, mountain, water, road)
- [ ] Create `data/skills.json` (18 D&D 5e skills)

**Task 1.3: Rules Engine Foundation (1 hour)**
- [ ] Create `src/core/rulesEngine.js`
- [ ] Define core rules object (ability scores, proficiency, combat, XP)
- [ ] Export RULES constant
- [ ] Add documentation comments

**Task 1.4: Utilities & Helpers (1 hour)**
- [ ] Create `src/utils/rng.js` (Mulberry32 PRNG)
- [ ] Create `src/utils/dice.js` (rollDice, rollAbilityCheck, rollAttack)
- [ ] Create `src/utils/hash.js` (string hashing for seeds)
- [ ] Create `src/utils/helpers.js` (UUID, nested property getters/setters)
- [ ] Unit test dice roller (manual checks in console)

#### Afternoon Session (4 hours)
**Task 1.5: Character System (2 hours)**
- [ ] Create `src/systems/Character.js` class
- [ ] Implement constructor with ability scores, race, class
- [ ] Implement ability modifier calculation
- [ ] Implement proficiency bonus calculation
- [ ] Implement HP calculation (class hit die + CON mod)
- [ ] Implement AC calculation (10 + DEX mod + armor)
- [ ] Implement skill bonuses
- [ ] Implement saving throws
- [ ] Implement equipment slots (mainHand, offHand, armor)
- [ ] Implement equip/unequip methods
- [ ] Test with sample character creation

**Task 1.6: Character Creation UI - Basic (1.5 hours)**
- [ ] Create `src/ui/CharacterCreation.js`
- [ ] Build character creation form:
  - Name input
  - Race selection (3 races)
  - Class selection (Fighter only)
  - Ability score assignment (Standard Array: 15,14,13,12,10,8)
  - Display racial bonuses
  - Show computed stats (HP, AC, mods)
- [ ] Implement "Create Character" button
- [ ] Store character in game state
- [ ] Transition to game after creation

**Task 1.7: Game State Manager (30 min)**
- [ ] Create `src/core/GameState.js`
- [ ] Implement observer pattern (subscribe, update, notify)
- [ ] Initialize game state structure (character, world, combat, ui)
- [ ] Export global gameState instance

#### Evening Session (2-3 hours)
**Task 1.8: World Generation - Basic (2 hours)**
- [ ] Create `src/systems/WorldGenerator.js`
- [ ] Implement seed hashing to numeric seed
- [ ] Integrate Simplex Noise library (or write basic Perlin noise)
- [ ] Implement `generateRegion(seed, regionX, regionY)`:
  - Create 32x32 tile grid
  - Use noise for elevation and moisture
  - Map noise values to terrain types
  - Return region data structure
- [ ] Implement region caching (Map of regionKey -> region)
- [ ] Implement `getRegion(x, y)` with lazy generation
- [ ] Generate starting region (0, 0) with guaranteed town

**Task 1.9: Map Rendering (1 hour)**
- [ ] Create `src/rendering/MapRenderer.js`
- [ ] Set up Canvas context (80x40 viewport)
- [ ] Implement `drawTile(x, y, char, fgColor, bgColor)`
- [ ] Implement `renderMap(player, world)`:
  - Calculate visible region based on player position
  - Draw terrain tiles with appropriate characters
  - Draw player character (@)
  - Implement fog of war (unexplored = dark)
- [ ] Test rendering with generated region

---

### Day 2: Combat & Progression

#### Morning Session (4 hours)
**Task 2.1: Movement System (1 hour)**
- [ ] Create `src/systems/MovementSystem.js`
- [ ] Implement keyboard input handler (WASD/Arrow keys)
- [ ] Implement `movePlayer(dx, dy)`:
  - Check terrain traversability
  - Update player position
  - Generate adjacent regions if needed
  - Reveal fog of war
  - Trigger encounters
- [ ] Update map renderer to recenter on player
- [ ] Test movement across region boundaries

**Task 2.2: Combat System - Core (3 hours)**
- [ ] Create `src/systems/CombatManager.js`
- [ ] Implement `CombatGrid` class:
  - Grid array (10x10 for Phase 1)
  - Place combatant at position
  - Move combatant (check valid, update grid)
  - Get adjacent tiles
  - Get tile occupant
- [ ] Implement `CombatManager` class:
  - Initialize with player and enemies
  - Roll initiative for all combatants
  - Sort turn order by initiative
  - Track current turn
  - End turn, advance to next
  - Check for combat end (all enemies or player defeated)
- [ ] Implement combat actions:
  - `attackAction(attacker, target)`:
    - Roll d20 + attack bonus
    - Compare to target AC
    - On hit: roll damage, apply to HP
    - Log result
  - `moveAction(combatant, toX, toY)`
  - `endTurnAction()`
- [ ] Test combat with 1 player vs 1 goblin

#### Afternoon Session (4 hours)
**Task 2.3: Combat UI (2 hours)**
- [ ] Create `src/rendering/CombatRenderer.js`
- [ ] Implement combat screen layout:
  - Combat grid (center)
  - Turn order (top or side)
  - Current combatant highlight
  - HP bars for all combatants
  - Action buttons (Move, Attack, End Turn)
  - Combat log (bottom)
- [ ] Implement `renderCombatGrid()`:
  - Draw grid lines
  - Draw terrain (if applicable)
  - Draw combatants with health indicators
  - Highlight selected tile
- [ ] Implement action UI:
  - Select target for attack
  - Select destination for move
  - Confirm action
- [ ] Implement combat log (scrolling text feed)
- [ ] Test UI with sample combat

**Task 2.4: Encounter System (1 hour)**
- [ ] Create `src/systems/EncounterSystem.js`
- [ ] Implement `checkForEncounter()`:
  - Roll against encounter frequency (RULES.encounters.combatFrequency)
  - If triggered, select enemy based on CR and player level
  - Generate enemy character from monster data
  - Initialize combat
  - Transition to combat screen
- [ ] Hook encounter check into movement system
- [ ] Test random encounters while exploring

**Task 2.5: XP & Leveling (1 hour)**
- [ ] Implement `grantXP(amount)` in Character class:
  - Add XP to character
  - Check if level threshold reached
  - If yes, level up
- [ ] Implement `levelUp()`:
  - Increment level
  - Increase max HP (roll hit die or take average)
  - Update proficiency bonus
  - Grant class features (if applicable)
  - Show level up notification
- [ ] Award XP after combat victory (enemy CR × 100)
- [ ] Test leveling from 1 to 3

#### Evening Session (2-3 hours)
**Task 2.6: Loot System (1 hour)**
- [ ] Create `src/systems/LootSystem.js`
- [ ] Implement `generateLoot(enemyCR)`:
  - Roll drop chance based on CR
  - If loot drops, select random item from appropriate tier
  - Return item(s)
- [ ] Implement loot pickup after combat
- [ ] Implement inventory display (simple list)
- [ ] Implement equip item from inventory
- [ ] Update character AC/attack when equipment changes
- [ ] Test looting and equipping

**Task 2.7: Save/Load System (1.5 hours)**
- [ ] Create `src/core/SaveManager.js`
- [ ] Implement `saveGame(slot)`:
  - Serialize game state to JSON
  - Store in LocalStorage with key `save_${slot}`
  - Include metadata (timestamp, character name, level)
- [ ] Implement `loadGame(slot)`:
  - Retrieve from LocalStorage
  - Deserialize JSON
  - Restore game state
  - Reconstruct Character instances
  - Resume game
- [ ] Implement `listSaves()`: return array of save metadata
- [ ] Create save/load UI (modal with save slots)
- [ ] Test save, close tab, reload, load

**Task 2.8: Death Handling (30 min)**
- [ ] Implement death check (HP <= 0)
- [ ] Show death screen with message
- [ ] Options: Load Save, New Game
- [ ] Test character death in combat

**Task 2.9: Polish & Testing (30 min)**
- [ ] Add main menu (New Game, Load Game, Continue)
- [ ] Add help screen (controls, basic rules)
- [ ] Playtesting: full loop (create char -> explore -> fight -> level -> loot -> save -> load)
- [ ] Fix critical bugs
- [ ] Add basic styling (colors, layout)

---

## Phase 1 Deliverables Checklist
**End of Day 2:**
- [ ] Can start new game with seed input
- [ ] Can create Fighter character with Standard Array
- [ ] Character sheet displays stats correctly
- [ ] Can move on procedurally generated map
- [ ] Fog of war reveals explored areas
- [ ] Random encounters trigger in wilderness
- [ ] 1v1 turn-based combat works (initiative, attacks, damage, HP)
- [ ] Combat UI shows grid, turn order, actions
- [ ] Player can win or lose combat
- [ ] XP awarded after victory
- [ ] Character can level up (1-3)
- [ ] Loot drops from enemies
- [ ] Loot can be picked up and equipped
- [ ] Equipment affects stats (AC, attack bonus, damage)
- [ ] Can save game to slot
- [ ] Can load game from slot
- [ ] Death screen appears when HP = 0
- [ ] Game is playable for 30+ minutes
- [ ] Zero critical bugs

---

## Phase 2: MVP Completion
**Duration:** Days 3-7
**Goal:** Complete core feature set for full gameplay experience

### Day 3: Expanded Character Creation & Classes

#### Morning Session (4 hours)
**Task 3.1: Expand Races (1 hour)**
- [ ] Add 2 more races to `data/races.json`: Halfling, Dragonborn
- [ ] Implement racial traits:
  - Halfling: Lucky, Brave, Nimble
  - Dragonborn: Breath Weapon, Damage Resistance
- [ ] Update Character class to apply racial traits
- [ ] Test new races

**Task 3.2: Add 4 More Classes (3 hours)**
- [ ] Add to `data/classes.json`: Wizard, Cleric, Rogue, Ranger
- [ ] Define for each:
  - Hit die
  - Proficiencies (armor, weapons, skills, saving throws)
  - Starting equipment
  - Spellcasting info (if applicable)
  - Class features by level (1-5)
- [ ] Update Character class to handle class features
- [ ] Implement spellcaster flag and spellcasting ability
- [ ] Test character creation with each class

#### Afternoon Session (4 hours)
**Task 3.3: Point Buy System (1.5 hours)**
- [ ] Create `src/ui/PointBuy.js`
- [ ] Implement point buy calculator:
  - Start with all abilities at 8
  - 27 points to spend
  - Cost table (8=0, 9=1, 10=2, ... 15=9)
  - Max 15 before racial bonuses
- [ ] Add toggle between Standard Array and Point Buy
- [ ] Update character creation UI
- [ ] Test point buy allocation

**Task 3.4: Backgrounds (1.5 hours)**
- [ ] Create `data/backgrounds.json` (5 backgrounds: Soldier, Sage, Criminal, Acolyte, Folk Hero)
- [ ] Define: name, skill proficiencies, tool/language proficiencies, equipment, feature
- [ ] Add background selection to character creation
- [ ] Apply background benefits to character
- [ ] Test backgrounds

**Task 3.5: Improved Character Creation UX (1 hour)**
- [ ] Add explanatory text for each step
- [ ] Show tooltips for abilities, skills, etc.
- [ ] Add "Recommended" label on Standard Array
- [ ] Preview final character before confirming
- [ ] Add back/next navigation in creation wizard
- [ ] Polish styling

#### Evening Session (2 hours)
**Task 3.6: Testing & Bug Fixes**
- [ ] Test all 5 classes
- [ ] Test all 5 races
- [ ] Test all backgrounds
- [ ] Verify stat calculations for each combo
- [ ] Fix bugs

---

### Day 4: Quest System

#### Morning Session (4 hours)
**Task 4.1: Quest Data Structures (1 hour)**
- [ ] Create `data/quests.json` with 5 templates:
  - Kill X enemies
  - Retrieve item from location
  - Deliver item to NPC
  - Escort NPC to location (simplified)
  - Investigate location
- [ ] Create `data/campaigns.json` with 3 campaign types:
  - Defeat the Lich King
  - Unite the Kingdoms
  - Recover the Lost Artifact
- [ ] Define template structure with variables

**Task 4.2: Quest Generator (2 hours)**
- [ ] Create `src/systems/QuestGenerator.js`
- [ ] Implement `selectTemplate(context, playerLevel)`
- [ ] Implement `instantiateQuest(template, variables)`:
  - Replace {{placeholders}} with values
  - Generate quest-specific data (locations, NPCs, enemies)
  - Return quest instance
- [ ] Implement `generateCampaignQuest(campaignType, stage)`
- [ ] Test quest generation with different templates

**Task 4.3: Quest Manager (1 hour)**
- [ ] Create `src/systems/QuestManager.js`
- [ ] Implement quest tracking:
  - Active quests list
  - Completed quests list
  - Current objectives for each quest
- [ ] Implement `updateQuestProgress(questId, objectiveId, progress)`
- [ ] Implement `completeQuest(questId)` with rewards
- [ ] Implement `failQuest(questId)` (if applicable)
- [ ] Integrate with game state

#### Afternoon Session (4 hours)
**Task 4.4: Quest UI (2 hours)**
- [ ] Create `src/ui/QuestLog.js`
- [ ] Implement quest log modal:
  - List of active quests
  - Quest details (description, objectives, rewards)
  - Progress bars/counters for objectives
  - Mark active quest (tracked on HUD)
- [ ] Create HUD element for active quest tracker
- [ ] Add hotkey (Q) to open quest log
- [ ] Style quest log

**Task 4.5: Quest Integration (2 hours)**
- [ ] Add quest givers to towns (NPCs with quest flag)
- [ ] Implement dialogue system (simple text with options)
- [ ] Implement "Talk to NPC" action when adjacent
- [ ] NPC offers quest, player accepts
- [ ] Quest added to active quests
- [ ] Implement quest objective tracking:
  - Kill objectives: increment on enemy death
  - Retrieve objectives: check for item in inventory
  - Location objectives: check player position
- [ ] Implement quest completion check after each action
- [ ] Grant rewards on completion (XP, items, reputation)
- [ ] Test full quest loop

#### Evening Session (2 hours)
**Task 4.6: Campaign Quest Integration**
- [ ] Generate campaign quest at game start based on selected objective
- [ ] Place campaign-relevant NPCs and locations in world
- [ ] Create 3-stage campaign structure for Phase 2
- [ ] Test campaign quest progression
- [ ] Implement victory screen when campaign completed

---

### Day 5: Faction & Reputation System

#### Morning Session (4 hours)
**Task 5.1: Faction Data (1 hour)**
- [ ] Create `data/factions.json` (5 factions):
  - Major Cities (e.g., Ironhill Dwarves, Elvenhome)
  - Guilds (Mages Guild, Thieves Guild, Fighters Guild)
  - Religious Orders
  - Noble Houses
- [ ] Define: name, description, relationships (allied/hostile with others)
- [ ] Generate factions as part of world generation

**Task 5.2: Reputation System (2 hours)**
- [ ] Add reputation tracking to game state (faction -> reputation value 0-100)
- [ ] Implement `modifyReputation(faction, amount)`
- [ ] Implement reputation levels:
  - 0-19: Stranger
  - 20-39: Acquaintance
  - 40-59: Friendly
  - 60-79: Honored
  - 80-100: Exalted
- [ ] Implement reputation UI (character sheet tab)
- [ ] Implement reputation effects on quest rewards
- [ ] Test reputation changes

**Task 5.3: Reputation-Based Economy (1 hour)**
- [ ] Modify item data to include reputation requirements
- [ ] Update merchant inventory filtering by player reputation
- [ ] Remove gold currency (no coin drops)
- [ ] Update loot system to drop items directly
- [ ] Display reputation requirement on items
- [ ] Test unlocking items via reputation

#### Afternoon Session (4 hours)
**Task 5.4: Enhanced Settlement Generation (2 hours)**
- [ ] Update WorldGenerator to place settlements intelligently:
  - Towns spawn on plains/grasslands near water
  - Min spacing between settlements
  - Settlement size scales with importance
- [ ] Generate settlement data:
  - Name (from name tables)
  - Population size
  - Controlling faction
  - Buildings (Tavern, Merchant, Faction Office, Quest Giver)
- [ ] Create name generation tables for settlements
- [ ] Test settlement generation

**Task 5.5: NPC Generation (2 hours)**
- [ ] Create `src/systems/NPCGenerator.js`
- [ ] Generate NPCs for settlements:
  - Name (from name tables)
  - Role (merchant, quest giver, innkeeper, guard, citizen)
  - Faction affiliation
  - Basic dialogue
  - For important NPCs: full character sheet
- [ ] Create name generation tables (first names, surnames)
- [ ] Place NPCs in settlements
- [ ] Implement NPC interaction (talk, trade, quest)
- [ ] Test NPC generation and interaction

#### Evening Session (2 hours)
**Task 5.6: Merchant System**
- [ ] Create merchant inventory based on faction and settlement size
- [ ] Implement trade UI:
  - Show merchant inventory
  - Show player inventory
  - Display reputation requirements
  - "Take" item if requirements met
- [ ] Implement item comparison (preview stats)
- [ ] Test merchant interactions

---

### Day 6: Skills & Non-Combat Gameplay

#### Morning Session (4 hours)
**Task 6.1: Skill Check System (1.5 hours)**
- [ ] Create `src/systems/SkillSystem.js`
- [ ] Implement `makeSkillCheck(character, skillName, dc)`:
  - Roll d20
  - Add ability modifier
  - Add proficiency bonus (if proficient)
  - Return success/failure and roll details
- [ ] Implement advantage/disadvantage (roll twice, take higher/lower)
- [ ] Implement passive scores (10 + skill bonus)
- [ ] Test skill checks

**Task 6.2: Exploration Encounters (2.5 hours)**
- [ ] Create `src/systems/ExplorationEncounters.js`
- [ ] Implement encounter types:
  - **Hidden Cache:** Perception/Investigation to find loot
  - **Trap:** Perception to spot, Acrobatics/Athletics to avoid, Sleight of Hand to disarm
  - **Natural Obstacle:** Athletics/Acrobatics to overcome or take alternate route
  - **Environmental Hazard:** Survival to navigate safely
- [ ] Implement encounter triggering (random chance when exploring)
- [ ] Create encounter UI (prompt with skill check option)
- [ ] Implement success/failure consequences
- [ ] Test exploration encounters

#### Afternoon Session (4 hours)
**Task 6.3: Social Encounters (2 hours)**
- [ ] Enhance dialogue system for social skill checks
- [ ] Implement dialogue options with skill requirements:
  - Persuasion: Convince NPC
  - Deception: Lie or mislead
  - Intimidation: Threaten or coerce
  - Insight: Read NPC's intentions
- [ ] Implement NPC attitudes (friendly, neutral, hostile, indifferent)
- [ ] Implement attitude shifts based on social checks
- [ ] Implement alternate quest solutions via social checks
- [ ] Test social encounters

**Task 6.4: Trap System (2 hours)**
- [ ] Create trap data (dart trap, pitfall, poison gas, magic alarm)
- [ ] Procedurally place traps in dungeons and wilderness
- [ ] Implement trap interaction flow:
  1. Passive Perception to notice automatically (or active check)
  2. Investigation to understand mechanism
  3. Sleight of Hand to disarm
  4. If failed: trigger trap effect
- [ ] Implement trap effects (damage, status, alert enemies)
- [ ] Test trap encounters

#### Evening Session (2 hours)
**Task 6.5: Dungeon Generation (Optional Enhancement)**
- [ ] Create basic dungeon generation (rooms and corridors)
- [ ] Place dungeons in world
- [ ] Populate with enemies and traps
- [ ] Add loot chests
- [ ] Test dungeon exploration

**OR**

**Task 6.5: Polish Non-Combat Systems**
- [ ] Add flavor text for terrain descriptions
- [ ] Add more encounter variations
- [ ] Balance skill check DCs
- [ ] Playtesting and bug fixes

---

### Day 7: Spell System & Final Polish

#### Morning Session (4 hours)
**Task 7.1: Spell Data (1 hour)**
- [ ] Create `data/spells.json` with 20 core spells:
  - **Cantrips (0):** Fire Bolt, Sacred Flame, Mage Hand, Prestidigitation, Guidance
  - **Level 1:** Cure Wounds, Magic Missile, Shield, Healing Word, Sleep, Thunderwave
  - **Level 2:** Scorching Ray, Hold Person, Prayer of Healing, Invisibility, Misty Step
- [ ] Define for each: name, level, school, casting time, range, components, duration, description, effect

**Task 7.2: Spellcasting System (2 hours)**
- [ ] Create `src/systems/SpellcastingSystem.js`
- [ ] Implement spell slot tracking (by level)
- [ ] Implement spell preparation (for Clerics, Wizards)
- [ ] Implement spell learning (for Wizards)
- [ ] Implement `castSpell(caster, spell, target)`:
  - Check spell slot availability
  - Consume spell slot (unless cantrip)
  - Make spell attack or force saving throw
  - Apply spell effect
- [ ] Implement spell effects:
  - Damage spells: roll damage, apply to target
  - Healing spells: restore HP
  - Utility spells: apply status or effect
- [ ] Test spellcasting

**Task 7.3: Spell UI (1 hour)**
- [ ] Add spellcasting to combat actions
- [ ] Create spell selection UI (list of prepared/known spells)
- [ ] Show spell details (range, components, effect)
- [ ] Display spell slots available
- [ ] Implement target selection for spells
- [ ] Update combat log for spell effects
- [ ] Test spell UI

#### Afternoon Session (4 hours)
**Task 7.4: Rest System (1 hour)**
- [ ] Implement short rest:
  - Can be triggered anywhere safe (not in combat)
  - Duration: 1 hour (instant in-game)
  - Max 2 per long rest
  - Recovery: Can spend hit dice to heal, some class features
- [ ] Implement long rest:
  - Only in tavern/inn
  - Duration: 8 hours (instant in-game)
  - Recovery: Full HP, half hit dice (min 1), all spell slots, all class features
  - Reset short rest counter
- [ ] Add rest UI (Rest button, select type, confirm)
- [ ] Test rest system

**Task 7.5: Advanced Combat Actions (1.5 hours)**
- [ ] Implement full action economy:
  - Action, Bonus Action, Movement, Reaction
  - Track which used each turn
- [ ] Implement additional actions:
  - Dodge: Grant disadvantage to attackers until next turn
  - Disengage: Move without provoking opportunity attacks
  - Dash: Double movement speed
  - Help: Grant advantage to ally's next check/attack
  - Hide: Make Stealth check
  - Ready: Delay action until trigger
- [ ] Implement opportunity attacks (reaction)
- [ ] Test advanced actions

**Task 7.6: Enhanced Combat (1.5 hours)**
- [ ] Implement cover system (detect obstacles, grant AC bonus)
- [ ] Implement conditions: Prone, Grappled, Restrained, Blinded, Poisoned
- [ ] Implement advantage/disadvantage in combat
- [ ] Implement critical hits (natural 20: double damage dice)
- [ ] Implement death saving throws (at 0 HP, not instant death)
- [ ] Test enhanced combat

#### Evening Session (3 hours)
**Task 7.7: Content & Balancing (1 hour)**
- [ ] Expand monster roster to 25+ (CR 0-5)
- [ ] Add 10+ more quest templates
- [ ] Add more items (weapons, armor, consumables)
- [ ] Balance encounter frequency
- [ ] Balance loot drop rates
- [ ] Balance XP progression
- [ ] Tune rules engine values

**Task 7.8: UI/UX Polish (1 hour)**
- [ ] Improve visual design (colors, fonts, spacing)
- [ ] Add animations (smooth transitions, combat effects)
- [ ] Improve information density (show more relevant info)
- [ ] Add tooltips everywhere
- [ ] Improve error messages
- [ ] Add loading indicators

**Task 7.9: Final Testing & Bug Fixes (1 hour)**
- [ ] Full playthrough test (character creation -> campaign completion)
- [ ] Test all 5 classes
- [ ] Test all major features
- [ ] Fix critical bugs
- [ ] Fix game-breaking bugs
- [ ] Performance profiling and optimization
- [ ] Create bug list for post-MVP

**Task 7.10: Documentation**
- [ ] Write README.md with:
  - How to run the game
  - Controls
  - Game rules
  - Known issues
- [ ] Document modding guide (how to edit data files)
- [ ] Comment code for maintainability

---

## Phase 2 Deliverables Checklist
**End of Day 7:**
- [ ] 5 playable classes (Fighter, Wizard, Cleric, Rogue, Ranger)
- [ ] 5 playable races
- [ ] Point Buy and Standard Array
- [ ] Background selection
- [ ] Procedurally generated world with towns and settlements
- [ ] Named NPCs with roles
- [ ] Quest system (campaign + side quests)
- [ ] Quest log UI
- [ ] Faction system with 5+ factions
- [ ] Reputation-based economy
- [ ] Merchants with filtered inventories
- [ ] All 18 skills implemented
- [ ] Skill checks in various contexts
- [ ] Exploration encounters (traps, caches, obstacles)
- [ ] Social encounters with skill-based dialogue
- [ ] Trap system
- [ ] Spell system (20+ spells, levels 0-2)
- [ ] Spellcasting in combat
- [ ] Rest system (short/long)
- [ ] Advanced combat actions (full action economy)
- [ ] Opportunity attacks
- [ ] Cover system
- [ ] Status conditions
- [ ] Death saving throws
- [ ] 25+ monsters (CR 0-5)
- [ ] Leveling 1-5
- [ ] Save/Load system
- [ ] Comprehensive UI (character sheet, inventory, quest log, combat)
- [ ] Playable for 3+ hours
- [ ] <5 critical bugs
- [ ] Documented and ready for feedback

---

## Phase 3: Content Expansion & Polish (Roadmap)
**Duration:** TBD
**Goal:** Reach feature-complete state with all D&D 5e content

### Major Tasks
- [ ] Add remaining 8 classes (Barbarian, Bard, Druid, Monk, Paladin, Sorcerer, Warlock, Artificer)
- [ ] Implement subclasses for all classes
- [ ] Add remaining races
- [ ] Implement levels 6-20
- [ ] Add spell levels 3-9 (full spell list)
- [ ] Add 100+ monsters (CR 0-30)
- [ ] Advanced world generation (dynamic events, weather, seasons)
- [ ] Party/companion system
- [ ] Crafting system
- [ ] Base building
- [ ] Meta-progression
- [ ] Audio (sound effects, music)
- [ ] Visual enhancements (animations, particle effects, alternative tilesets)
- [ ] Multiplayer/co-op
- [ ] Advanced AI
- [ ] Modding tools

---

## Risk Management

### Critical Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Scope creep delays MVP** | HIGH | HIGH | Strict adherence to MoSCoW, defer features to Phase 3 |
| **Procedural generation creates broken worlds** | MEDIUM | HIGH | Extensive seed testing, fallbacks for failed generation |
| **Performance issues with large maps** | MEDIUM | MEDIUM | Profile early, optimize hot paths, implement caching |
| **Complex D&D rules slow development** | MEDIUM | MEDIUM | Start with simplified rules, iterate toward full complexity |
| **Combat AI is too simple** | LOW | MEDIUM | Accept basic AI for MVP, enhance in Phase 3 |
| **Save file corruption** | LOW | HIGH | Version saves, validate on load, keep backups |

---

## Quality Assurance Plan

### Testing Strategy
1. **Unit Testing:** Test critical functions (dice, stats, generation) manually in console
2. **Integration Testing:** Test systems together (character creation -> combat -> leveling)
3. **Playthrough Testing:** Full game playthrough at end of each day
4. **Edge Case Testing:** Test boundary conditions (level 0, negative HP, empty inventory)
5. **Cross-Browser Testing:** Test on Chrome, Firefox, Safari
6. **Performance Testing:** Profile with browser dev tools, optimize bottlenecks

### Bug Triage
- **P0 (Critical):** Game-breaking, must fix immediately (crashes, data loss, can't progress)
- **P1 (High):** Major feature broken, fix before phase end
- **P2 (Medium):** Minor bug, fix if time permits
- **P3 (Low):** Polish issue, defer to later phase

---

## Success Criteria

### Phase 1 Success (Day 2)
✅ Vertical slice is playable end-to-end
✅ Core gameplay loop demonstrated
✅ Zero P0/P1 bugs
✅ Can play for 30+ minutes

### Phase 2 Success (Day 7)
✅ All MVP features implemented
✅ 5 classes fully playable
✅ Quest system functional
✅ Faction/reputation system works
✅ Can complete a campaign
✅ <5 P1 bugs
✅ Performance targets met (60 FPS, <1s load)
✅ 3+ hours of unique gameplay

---

## Daily Schedule Template

**Morning (4 hours):**
- Stand-up: Review yesterday, plan today
- Implementation: Major features
- Quick testing

**Afternoon (4 hours):**
- Implementation: Integration & UI
- Integration testing
- Bug fixing

**Evening (2-3 hours):**
- Polish & refinement
- Playtesting
- Documentation
- Prepare for next day

**End of Day:**
- Commit code
- Update task checklist
- Note blockers/issues

---

## Communication & Progress Tracking

**Daily Updates:**
- End of day summary: what's done, what's next, any blockers
- Update project plan with checkmarks
- Log bugs in issue tracker (or simple markdown file)

**Milestones:**
- End of Day 2: Vertical slice demo
- End of Day 7: MVP demo
- Feedback sessions after each milestone

---

## Post-MVP Roadmap Preview

**Week 2-3: Content Expansion**
- All 13 classes
- Levels 1-20
- Full spell list
- 100+ monsters
- Advanced quests

**Week 4: Polish & Juice**
- Audio integration
- Visual effects
- Animations
- Alternative tilesets

**Week 5+: Advanced Features**
- Party system
- Multiplayer/co-op
- Crafting
- Base building
- Meta-progression

---

## Appendix: File Structure

```
nexus-verge-crpg-5e/
├── index.html
├── styles.css
├── README.md
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── PROJECT_PLAN.md
│   └── DATA_SCHEMA.md
├── src/
│   ├── main.js (entry point)
│   ├── core/
│   │   ├── GameState.js
│   │   ├── rulesEngine.js
│   │   ├── SaveManager.js
│   │   └── GameLoop.js
│   ├── systems/
│   │   ├── Character.js
│   │   ├── CombatManager.js
│   │   ├── WorldGenerator.js
│   │   ├── QuestGenerator.js
│   │   ├── QuestManager.js
│   │   ├── SkillSystem.js
│   │   ├── SpellcastingSystem.js
│   │   ├── LootSystem.js
│   │   ├── EncounterSystem.js
│   │   ├── ExplorationEncounters.js
│   │   ├── NPCGenerator.js
│   │   └── FactionSystem.js
│   ├── rendering/
│   │   ├── MapRenderer.js
│   │   ├── CombatRenderer.js
│   │   └── UIRenderer.js
│   ├── ui/
│   │   ├── CharacterCreation.js
│   │   ├── CharacterSheet.js
│   │   ├── Inventory.js
│   │   ├── QuestLog.js
│   │   ├── DialogueSystem.js
│   │   ├── CombatUI.js
│   │   └── MenuSystem.js
│   └── utils/
│       ├── rng.js
│       ├── dice.js
│       ├── hash.js
│       ├── helpers.js
│       └── noise.js (Simplex/Perlin)
├── data/
│   ├── classes.json
│   ├── races.json
│   ├── spells.json
│   ├── items.json
│   ├── monsters.json
│   ├── skills.json
│   ├── feats.json
│   ├── backgrounds.json
│   ├── terrains.json
│   ├── factions.json
│   ├── quests.json
│   ├── campaigns.json
│   └── names.json
└── assets/ (future)
    ├── sounds/
    └── tilesets/
```

---

**Document Status:** Ready for Development
**Next Action:** Begin Day 1, Task 1.1 - Project Setup
**Last Updated:** 2025-12-09
