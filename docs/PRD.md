# Product Requirements Document
# Nexus Verge - Procedural D&D 5e Roguelike CRPG

**Version:** 1.0
**Date:** 2025-12-09
**Status:** Draft for Review

---

## Executive Summary

Nexus Verge is a procedurally generated, top-down roguelike CRPG that faithfully implements D&D 5e 2024 rules with a unique reputation-based economy. Players explore dynamically generated worlds with shareable seeds, engage in turn-based tactical combat, and experience deep character progression through a modifiable rules engine.

### Core Pillars
1. **Authentic D&D 5e Experience** - Faithful implementation of combat, skills, spells, and progression
2. **Infinite Replayability** - Procedurally generated worlds with shareable seeds
3. **Meaningful Choices** - Reputation system, faction relationships, and consequence-driven gameplay
4. **Performance First** - Lightweight, efficient client-side web application
5. **Modifiable Foundation** - Easily tunable rules engine for balance and homebrew content

### Design Principles

**MODIFIABILITY FIRST:** All game systems must be designed with modifiability as the primary architectural concern:

- **Data-Driven:** All content (items, monsters, skills, spells) in JSON files, not code
- **Rules Engine:** All game rules centralized in `rulesEngine.js` with feature flags
- **Modular Systems:** Systems can be enabled/disabled/modified independently
- **Extensible Schemas:** Data structures support additions without breaking existing code
- **Homebrew Support:** DMs can add custom rules, skills, classes, and content
- **Player Settings:** Players can toggle optional rules and difficulty modifiers

**Why This Matters:**
- Enable future homebrew rule variants (flanking, critical failures, etc.)
- Support player customization of game mechanics
- Faster iteration and balance tuning during development
- Community modding and content creation
- Easy experimentation with new features

**Implementation Example:**
```javascript
// Rules can be toggled without refactoring
RULES.skills.enabled = true;
RULES.experimental.flanking = false;
RULES.variant = "standard"; // or "homebrew"
```

---

## Development Phases

### Phase 1: Playable Vertical Slice (2 Days)
**Goal:** Single class, small world, core gameplay loop demonstrable

### Phase 2: MVP (1 Week Total)
**Goal:** Full character creation, expanded world, complete core systems

### Phase 3: Content Expansion (Roadmap)
**Goal:** All classes/races, advanced features, polish

---

## MoSCoW Prioritization

### Legend
- **M** - Must Have (Phase 1/2)
- **S** - Should Have (Phase 2/MVP)
- **C** - Could Have (Phase 3/Roadmap)
- **W** - Won't Have (Explicitly out of scope)

---

## Epic 1: Core Game Loop
**Priority:** MUST HAVE
**Description:** Establish the fundamental gameplay experience from character creation through exploration, combat, and progression.

### User Stories

#### M-1.1: Game Initialization
**As a** player
**I want to** start a new game with seed generation
**So that** I can begin my adventure with a unique world

**Acceptance Criteria:**
- User can input custom seed OR generate random seed
- Seed string is displayed and can be copied
- User can select map size (Small/Medium/Large)
- User can select difficulty (Easy/Normal/Hard)
- User can select campaign objective from list
- Game initializes procedural generation from seed

**Technical Notes:**
- Seed should use deterministic RNG (seeded random)
- Store seed in game state for save/load

---

#### M-1.2: Character Creation - Basic
**As a** player
**I want to** create a character with fundamental attributes
**So that** I can begin playing with a defined character

**Acceptance Criteria:**
- User can enter character name
- User can select race (Phase 1: 3 races minimum - Human, Elf, Dwarf)
- User can select class (Phase 1: 1 class - Fighter)
- User can assign ability scores using Standard Array (15, 14, 13, 12, 10, 8)
- All racial bonuses are applied automatically
- Character sheet displays all statistics correctly
- User sees explanatory text for each choice

**Technical Notes:**
- Standard Array is default and recommended
- Point Buy system is SHOULD HAVE for Phase 2

---

#### S-1.3: Character Creation - Complete
**As a** player
**I want to** create a character with full D&D 5e options
**So that** I can express my character concept fully

**Acceptance Criteria:**
- User can select from 5 core classes (Fighter, Wizard, Cleric, Rogue, Ranger)
- User can select from 5 core races (Human, Elf, Dwarf, Halfling, Dragonborn)
- User can choose background (impacts starting skills)
- User can select starting equipment
- Point Buy system available as alternative to Standard Array
- All racial traits properly applied
- Character creation wizard has clear explanations for each step

**Technical Notes:**
- Full 13 classes in COULD HAVE (Phase 3)

---

#### M-1.4: World Map Display
**As a** player
**I want to** view the game world as a top-down map
**So that** I can navigate and explore

**Acceptance Criteria:**
- Map displays as ASCII or lightweight grid (tiles ~16x16 chars visible)
- Player character displayed with distinct symbol (@)
- Terrain types visually distinguishable (. grass, ^ mountain, T tree, ~ water, # wall, = road)
- Current location name/description displayed
- Fog of war for unexplored areas
- Smooth scrolling or recentering as player moves

**Technical Notes:**
- Use Canvas or DOM-based rendering
- Consider viewport of 80x24 or 100x30 characters

---

#### M-1.5: Basic Movement
**As a** player
**I want to** move my character on the world map
**So that** I can explore the world

**Acceptance Criteria:**
- Arrow keys or WASD moves character
- Movement respects terrain traversability
- Movement reveals fog of war
- Movement triggers region generation if entering unexplored area
- Movement costs display (if implementing movement points)
- Can't move through impassable terrain

**Technical Notes:**
- Region-based generation: load adjacent regions on demand
- Cache generated regions in memory

---

#### M-1.6: Basic Combat Encounter
**As a** player
**I want to** engage in turn-based combat
**So that** I can overcome hostile enemies

**Acceptance Criteria:**
- Random encounter triggers while exploring wilderness
- Combat screen shows grid-based battlefield (minimum 10x10)
- Player and enemy positions shown clearly
- Initiative rolled per D&D 5e rules (d20 + DEX mod)
- Turn order displayed
- Player can take actions on their turn: Move, Attack, End Turn
- Enemy takes AI-controlled turn
- Attack rolls follow D&D 5e rules (d20 + mods vs AC)
- Damage rolls follow weapon dice + STR/DEX mod
- HP tracked for all combatants
- Combat ends when all enemies or player defeated

**Technical Notes:**
- Phase 1: 1v1 combat only
- Grid should support tactical positioning

---

#### S-1.7: Advanced Combat Actions
**As a** player
**I want to** use full D&D 5e combat actions
**So that** I can engage in tactical combat

**Acceptance Criteria:**
- Action economy: Action, Bonus Action, Movement, Reaction
- Full action list: Attack, Dodge, Disengage, Dash, Help, Hide, Ready, Search, Use Object
- Bonus actions from class features work correctly
- Opportunity attacks trigger correctly
- Advantage/Disadvantage system implemented
- Cover system (half/three-quarters/full)
- Flanking rules (optional)
- Status effects: Prone, Grappled, Restrained, etc.

---

#### M-1.8: Character Progression - Basic
**As a** player
**I want to** gain experience and level up
**So that** my character becomes more powerful

**Acceptance Criteria:**
- XP awarded after combat encounters
- XP required for leveling follows D&D 5e chart
- Level up notification triggers at threshold
- Player can increase HP (class hit die roll or average)
- Proficiency bonus increases per table
- Level-appropriate features granted automatically
- Character sheet updated with new stats

**Technical Notes:**
- Phase 1: Levels 1-3
- Phase 2: Levels 1-5

---

#### S-1.9: Character Progression - Complete
**As a** player
**I want to** develop my character to level 20
**So that** I can experience full class progression

**Acceptance Criteria:**
- Support levels 1-20
- Ability Score Improvements (ASI) at appropriate levels
- Feat selection option at ASI levels
- Subclass selection at appropriate level
- Spell progression for spellcasters
- Class features unlock at correct levels
- Multi-classing support (COULD HAVE)

---

#### M-1.10: Save/Load Game
**As a** player
**I want to** save and load my game progress
**So that** I can continue my adventure later

**Acceptance Criteria:**
- User can save game at any time (out of combat)
- Save includes: world seed, character state, current location, quest progress, explored regions, faction reputation
- Multiple save slots (minimum 3)
- Load game restores exact state
- Save files show: character name, level, location, playtime, timestamp
- Can delete save files

**Technical Notes:**
- Use LocalStorage or IndexedDB
- JSON serialization
- Implement save state versioning for future updates

---

#### M-1.11: Death and Permadeath
**As a** player
**I want** the consequences of character death clearly handled
**So that** I understand the stakes

**Acceptance Criteria:**
- When HP reaches 0, death saving throws commence (if not instant death)
- 3 failures or 3 successes resolves death saves
- On character death, death screen displays
- Option to load previous save
- Option to start new game with same seed
- Death statistics tracked (optional: death count, cause, etc.)

---

## Epic 2: Procedural World Generation
**Priority:** MUST HAVE (Basic) / SHOULD HAVE (Complete)
**Description:** Create infinite, coherent, shareable worlds through procedural generation.

### User Stories

#### M-2.1: Seed-Based World Generation
**As a** player
**I want** worlds generated from seeds deterministically
**So that** I can share worlds with others

**Acceptance Criteria:**
- Same seed always generates same world
- Seed is alphanumeric string (e.g., "NEXUS-7492-ALPHA")
- World generation is fast enough for smooth gameplay
- Regions generate on-demand as player explores
- Generated regions cached and persisted in save file

**Technical Notes:**
- Use seeded PRNG (e.g., mulberry32, sfc32)
- Hash seed string to numeric seed value

---

#### M-2.2: Terrain Generation - Basic
**As a** developer
**I want** coherent biome clustering
**So that** the world feels realistic

**Acceptance Criteria:**
- Biomes cluster together (forests near forests, mountains near mountains)
- Smooth transitions between biomes
- At least 5 terrain types: Grassland, Forest, Mountain, Water, Road
- Terrain affects traversability
- Terrain description displayed when entering tile

**Technical Notes:**
- Use Perlin noise or Simplex noise for coherent generation
- Consider wave function collapse or cellular automata

---

#### S-2.3: Terrain Generation - Complete
**As a** player
**I want** diverse and detailed terrain
**So that** exploration feels rich and varied

**Acceptance Criteria:**
- 10+ terrain types: Plains, Forest, Dense Forest, Hills, Mountains, Rivers, Lakes, Swamp, Desert, Tundra, Coast
- Terrain has movement costs
- Terrain affects combat (cover, difficult terrain)
- Special locations procedurally placed: caves, ruins, shrines
- Roads connect settlements

---

#### M-2.4: Settlement Generation - Basic
**As a** player
**I want** towns to exist in the world
**So that** I can rest, trade, and get quests

**Acceptance Criteria:**
- At least 1 starting town generated near player spawn
- Towns have: Tavern, Merchant, Quest Giver
- Town name generated procedurally
- Town marked clearly on map
- Cannot have random combat encounters inside towns

**Technical Notes:**
- Phase 1: 1-3 towns
- Town spacing should be reasonable (not too close/far)

---

#### S-2.5: Settlement Generation - Complete
**As a** player
**I want** diverse and detailed settlements
**So that** towns feel unique and alive

**Acceptance Criteria:**
- Settlement types: Village (small), Town (medium), City (large)
- Each has unique name from generation tables
- Population size affects available services
- Cities have multiple merchants, quest givers, faction offices
- Settlement history generated (flavor text)
- Named NPCs with roles
- Faction affiliations per settlement

---

#### M-2.6: NPC Generation - Basic
**As a** player
**I want** NPCs to populate the world
**So that** I can interact with the world

**Acceptance Criteria:**
- NPCs have names (procedurally generated)
- NPCs have basic description
- NPCs have role (merchant, quest giver, innkeeper, guard)
- NPCs in settlements are non-hostile
- NPCs have basic dialogue

**Technical Notes:**
- Phase 1: 5-10 NPCs total

---

#### S-2.7: NPC Generation - Complete
**As a** player
**I want** NPCs to be as complex as player characters
**So that** combat and interaction feel meaningful

**Acceptance Criteria:**
- NPCs have full character sheets (race, class, levels, stats)
- NPCs have faction affiliations
- NPCs have personality traits (friendly, hostile, neutral)
- Hostile NPCs use proper combat AI
- NPC inventories for merchants
- Named NPCs vs generic NPCs

---

#### M-2.8: Enemy/Monster Generation
**As a** player
**I want** to encounter monsters during exploration
**So that** I face challenges and gain XP

**Acceptance Criteria:**
- Monsters spawn in wilderness (not in towns)
- Monsters scale to player level (CR appropriate)
- At least 5 monster types for Phase 1 (Goblin, Wolf, Skeleton, Orc, Bandit)
- Monsters have accurate D&D 5e stat blocks
- Monsters use appropriate AI in combat
- Loot drops from defeated monsters

**Technical Notes:**
- Use D&D 5e Challenge Rating (CR) for balance
- CR 0-2 for Phase 1

---

## Epic 3: D&D 5e Rules Implementation
**Priority:** MUST HAVE (Core) / SHOULD HAVE (Complete)
**Description:** Faithful implementation of D&D 5e 2024 rules as a modifiable engine.

### User Stories

#### M-3.1: Core Ability System
**As a** player
**I want** the six ability scores to work per D&D 5e
**So that** my character is authentic

**Acceptance Criteria:**
- Six abilities: STR, DEX, CON, INT, WIS, CHA
- Ability modifiers calculated correctly: (Score - 10) / 2, rounded down
- Ability checks use d20 + ability modifier
- Saving throws use d20 + ability modifier + proficiency (if proficient)
- Ability scores can increase from ASI, magic items, effects

---

#### M-3.2: Skills System
**As a** player
**I want** all 18 D&D 5e skills implemented with contextual skill challenges
**So that** I can attempt diverse actions and overcome obstacles through skill use

**Acceptance Criteria:**
- All 18 skills: Acrobatics, Animal Handling, Arcana, Athletics, Deception, History, Insight, Intimidation, Investigation, Medicine, Nature, Perception, Performance, Persuasion, Religion, Sleight of Hand, Stealth, Survival
- Skill checks use d20 + ability modifier + proficiency bonus (if proficient)
- Proficiency determined by class and background
- Expertise doubles proficiency bonus (if applicable)
- Advantage/Disadvantage applies to skill checks
- Skill challenges integrated into exploration, quests, and NPC interactions
- **Modular implementation:** Skills must be data-driven and easily modifiable

**Skill Challenge Examples:**
- **Traps:** Perception check to detect traps, Sleight of Hand to disarm them
- **Social Encounters:** Intimidation to avoid bandit combat, Persuasion for better quest rewards, Deception to lie to NPCs
- **Exploration:** Investigation to find hidden objects, Survival to track creatures, Athletics to climb/swim
- **Dungeon Hazards:** Acrobatics to dodge traps, Athletics to force doors, Arcana to decipher magical runes

**Quest Integration:**
- Skill challenges can be quest objectives (e.g., "Sneak past guards using Stealth")
- Quest NPCs can offer skill-based alternatives (e.g., "Intimidate the bandit leader or fight them")
- Skill success/failure affects quest outcomes and rewards

**Technical Requirements (Modifiability):**
- Skills defined in `data/skills.json` for easy modification
- Skill challenges defined in `data/skillChallenges.json` as reusable templates
- DCs configurable in rules engine (`RULES.skills.dcThresholds`)
- System must support:
  - Adding new skills without code changes
  - Merging skills (e.g., Investigation + Perception combined)
  - Retiring/removing skills
  - Adding/modifying/removing skill challenges
  - Homebrew skill variants

**Data Schema Example:**
```json
{
  "id": "perception",
  "name": "Perception",
  "ability": "wis",
  "description": "Your general awareness of your surroundings",
  "enabled": true,
  "homebrew": false
}
```

**Skill Challenge Template Example:**
```json
{
  "id": "trap_detect_disarm",
  "name": "Trap Detection & Disarm",
  "description": "Spot and disable a trap",
  "stages": [
    { "skill": "perception", "dc": 15, "description": "Notice the trap" },
    { "skill": "sleight_of_hand", "dc": 13, "description": "Disarm the trap" }
  ],
  "onSuccess": { "xp": 100 },
  "onFailure": { "damage": "2d6", "type": "piercing" }
}
```

---

#### M-3.3: Combat Rules - Core
**As a** player
**I want** combat to follow D&D 5e rules
**So that** combat feels authentic

**Acceptance Criteria:**
- Initiative: d20 + DEX modifier
- Attack rolls: d20 + ability modifier + proficiency (if proficient)
- AC (Armor Class) determines hit threshold
- Damage rolls: weapon dice + ability modifier
- Critical hits on natural 20 (roll damage dice twice)
- Critical miss on natural 1
- Death at 0 HP (death saving throws)

**Technical Notes:**
- Phase 1: Melee attacks only
- Phase 2: Ranged attacks, spell attacks

---

#### S-3.4: Combat Rules - Complete
**As a** player
**I want** full D&D 5e combat depth
**So that** I can use advanced tactics

**Acceptance Criteria:**
- Conditions: Blinded, Charmed, Deafened, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious
- Damage types: Bludgeoning, Piercing, Slashing, Acid, Cold, Fire, Force, Lightning, Necrotic, Poison, Psychic, Radiant, Thunder
- Resistances, immunities, vulnerabilities
- Concentration for spells
- Grappling and shoving
- Two-weapon fighting
- Reaction timing

---

#### M-3.5: Rest System
**As a** player
**I want** to rest to recover resources
**So that** I can manage my character's endurance

**Acceptance Criteria:**
- Short Rest: 1 hour, can be taken anywhere safe (not in combat), maximum 2 per long rest
- Short Rest recovers: Hit Dice usage, some class features
- Long Rest: 8 hours, only in tavern/inn
- Long Rest recovers: all HP, half of max hit dice (minimum 1), spell slots, all class features
- Counter tracks short rests taken since last long rest
- Clear UI for rest status

---

#### S-3.6: Spell System - Basic
**As a** player playing a spellcaster
**I want** to cast spells per D&D 5e rules
**So that** I can use magic in combat and exploration

**Acceptance Criteria:**
- Spell slots per class and level
- Cantrips don't consume slots
- Prepared spells vs known spells (class dependent)
- Spell attack rolls: d20 + spellcasting ability + proficiency
- Spell save DC: 8 + spellcasting ability + proficiency
- Concentration tracking
- Spell descriptions and effects
- At least 20 core spells implemented (5 per spell level 0-2)

**Technical Notes:**
- Phase 2: Spell levels 0-2
- Phase 3: Spell levels 3-9

---

#### C-3.7: Spell System - Complete
**As a** player
**I want** access to the full D&D 5e spell list
**So that** I can use any spell my character could know

**Acceptance Criteria:**
- All spells from D&D 5e 2024 SRD
- Ritual casting
- Upcasting
- Spell components (verbal, somatic, material)
- Spell schools
- Spell targeting and areas of effect

---

#### M-3.8: Equipment System - Basic
**As a** player
**I want** to equip weapons and armor
**So that** my character's effectiveness changes

**Acceptance Criteria:**
- Weapons: 10 basic types (Dagger, Shortsword, Longsword, Greatsword, Mace, Spear, Shortbow, Longbow, Light Crossbow, Heavy Crossbow)
- Weapon properties: Damage die, damage type, properties (Light, Heavy, Finesse, Two-Handed, Versatile, Range)
- Armor: 5 types (Clothing, Leather, Chain Shirt, Scale Mail, Plate)
- Armor provides AC
- Equipment slots: Main Hand, Off Hand, Armor, Helmet, Shield
- Equip/Unequip functionality
- Weight limit (carrying capacity = STR × 15)

---

#### S-3.9: Equipment System - Complete
**As a** player
**I want** full equipment options
**So that** I can customize my character's loadout

**Acceptance Criteria:**
- All D&D 5e weapons
- All D&D 5e armor types (Light, Medium, Heavy)
- Shields
- Armor proficiency restrictions enforced
- Magic items with special properties
- Consumables (potions, scrolls)
- Artifacts (unique equippable items, one at a time)
- Equipment comparison UI
- Item rarity (Common, Uncommon, Rare, Very Rare, Legendary)

---

#### M-3.10: Loot System
**As a** player
**I want** to find loot from enemies and chests
**So that** I can improve my character

**Acceptance Criteria:**
- Enemies drop loot on death (procedurally determined)
- Loot tables scale with enemy CR
- Loot can include: weapons, armor, consumables, quest items
- Player can pick up loot
- Inventory system to store items
- Weight management

---

## Epic 4: Reputation & Faction System
**Priority:** SHOULD HAVE
**Description:** Replace gold currency with reputation-based economy and faction relationships.

### User Stories

#### S-4.1: Faction System
**As a** player
**I want** to interact with different factions
**So that** my choices have lasting consequences

**Acceptance Criteria:**
- At least 5 factions generated per world (based on campaign type)
- Factions include: Town/City factions, Guilds (Thieves, Mages, Fighters, etc.), Religious Orders, Noble Houses
- Each faction tracks reputation separately (0-100 scale)
- Reputation displayed in character sheet
- Faction relationships (allied, neutral, hostile with other factions)
- Completing quests for faction increases reputation

---

#### S-4.2: Reputation-Based Economy
**As a** player
**I want** to unlock items through reputation
**So that** I earn rewards through deeds, not gold

**Acceptance Criteria:**
- Items have reputation requirements instead of gold cost
- Merchant inventories filter by player's reputation with merchant's faction
- Reputation levels: 0-19 (Stranger), 20-39 (Acquaintance), 40-59 (Friendly), 60-79 (Honored), 80-100 (Exalted)
- Item quality scales with reputation requirement
- Reputation can decrease from opposing faction quests
- Lost reputation locks previously available items

**Technical Notes:**
- No gold currency in game
- Consider quest rewards being items directly

---

#### S-4.3: Faction Offices
**As a** player
**I want** to visit faction offices in settlements
**So that** I can engage with faction-specific content

**Acceptance Criteria:**
- Cities have faction offices (based on which factions control the city)
- Faction office has: Representative NPC, Reputation display, Quest board, Merchant
- Can check current standing with faction
- Faction-specific quests available
- Reputation rewards clearly shown on quests

---

## Epic 5: Quest System
**Priority:** MUST HAVE (Basic) / SHOULD HAVE (Complete)
**Description:** Procedurally generated quest system with main campaign and side quests.

### User Stories

#### M-5.1: Campaign Quest
**As a** player
**I want** a main objective to pursue
**So that** I have a goal and win condition

**Acceptance Criteria:**
- Player selects campaign objective at game start from list (e.g., "Defeat the Lich King", "Unite the Kingdoms", "Recover the Lost Artifact")
- Campaign generates key NPCs and locations related to objective
- Campaign quest has multiple stages/chapters
- Campaign quest cannot be abandoned
- Completing campaign shows victory screen with statistics

**Technical Notes:**
- Phase 1: Simple 3-stage campaign
- Phase 2: 5-7 stage campaign

---

#### M-5.2: Quest Generation - Basic
**As a** player
**I want** side quests to undertake
**So that** I can gain XP, loot, and reputation

**Acceptance Criteria:**
- Quests procedurally generated from templates
- At least 5 quest types: Kill X enemies, Retrieve item, Deliver item, Escort NPC, Investigate location
- Quests have: Title, Description, Objectives, Rewards (XP, items, reputation)
- Quests can be accepted from quest givers in towns
- Quest log shows active quests
- Quest objectives tracked (e.g., "Goblins Killed: 3/5")
- Completing quest grants rewards

---

#### S-5.3: Quest Generation - Complete
**As a** player
**I want** diverse and interesting quests
**So that** gameplay stays fresh

**Acceptance Criteria:**
- 15+ quest templates
- Quest chains (completing one unlocks another)
- Time-sensitive quests (failure conditions)
- Moral choice quests (different paths/outcomes)
- Faction-specific quests
- Quest rewards scale to player level
- Quest difficulty rating
- Can abandon quests (lose reputation if applicable)

---

#### S-5.4: Quest Impact on World
**As a** player
**I want** my quest completion to affect the world
**So that** I feel my actions matter

**Acceptance Criteria:**
- Completing certain quests changes NPC dialogue
- Some quests affect faction relationships
- Completed quests update town/NPC state (e.g., saved NPC now appears in town)
- Quest history tracked
- NPCs reference player's past deeds

---

## Epic 6: Skill Checks & Non-Combat Gameplay
**Priority:** SHOULD HAVE
**Description:** Implement all D&D 5e skills with meaningful encounters and checks.

### User Stories

#### S-6.1: Skill Check System
**As a** player
**I want** to make skill checks in various situations
**So that** non-combat abilities matter

**Acceptance Criteria:**
- All 18 skills have encounter opportunities
- Skill checks triggered contextually (e.g., Perception to spot hidden door)
- DC (Difficulty Class) scales appropriately
- Success/Failure have meaningful consequences
- Passive scores calculated (Passive Perception = 10 + bonus)
- Group checks supported (if party system in future)

---

#### S-6.2: Exploration Encounters
**As a** player
**I want** to encounter non-combat challenges while exploring
**So that** exploration is more than just movement

**Acceptance Criteria:**
- Random exploration encounters: Hidden caches (Perception/Investigation), Traps (Perception to spot, Acrobatics/Athletics to avoid), Natural hazards, Environmental puzzles
- Skill check prompts with clear consequences
- Can choose to avoid risky situations (e.g., don't open suspicious chest)
- Rewards for successful checks (loot, shortcuts, info)

---

#### S-6.3: Social Encounters
**As a** player
**I want** to use social skills in interactions
**So that** I can solve problems without combat

**Acceptance Criteria:**
- Dialogue options use skills: Persuasion, Deception, Intimidation, Insight
- NPCs have attitudes and can be influenced
- Successful social checks open new dialogue paths or quest solutions
- Can negotiate with hostile NPCs to avoid combat
- Bribery and favors as alternative mechanics (given no gold currency, use items/reputation)

---

#### S-6.4: Trap System
**As a** player
**I want** to encounter and interact with traps
**So that** dungeons and exploration are dangerous

**Acceptance Criteria:**
- Traps procedurally placed in dungeons and wilderness
- Perception check to spot traps
- Investigation check to understand mechanism
- Thieves' Tools (Sleight of Hand) to disarm
- Failure triggers trap effect (damage, status, alert enemies)
- Trap types: Dart trap, Pitfall, Poison gas, Magic alarm, Tripwire

---

## Epic 7: Rules Engine & Modifiability
**Priority:** MUST HAVE (Foundation) / SHOULD HAVE (UI)
**Description:** Centralized, modifiable rules engine for game balance and homebrew support.

### User Stories

#### M-7.1: Centralized Rules Configuration
**As a** developer
**I want** all game rules in one configuration file
**So that** balance changes are easy to make

**Acceptance Criteria:**
- Single configuration file/module for rules (e.g., `rulesEngine.json` or `rulesEngine.js`)
- Sections for: Combat (attack bonuses, damage calculations, critical rules), Skills (DC guidelines, check frequencies), Progression (XP tables, level thresholds), Loot (drop rates, rarity chances), Encounters (frequency, scaling), Resting (short/long rest recovery), Magic (spell slot progression, spell power scaling)
- All gameplay systems reference rules engine
- Changing values in rules engine immediately affects gameplay
- Well-commented and documented

**Technical Notes:**
- This is architectural foundation, must be in place early

---

#### S-7.2: Homebrew Rule Support
**As a** game master/modder
**I want** to modify game rules easily
**So that** I can create custom experiences

**Acceptance Criteria:**
- Can edit rules JSON file to change values
- Can add custom items to loot tables
- Can add custom monsters with stat blocks
- Can modify XP and difficulty scaling
- Can add custom spells
- Documentation for modding

---

#### C-7.3: In-Game Rules Editor
**As a** player
**I want** to adjust rules within the game
**So that** I don't need to edit files manually

**Acceptance Criteria:**
- In-game menu for rule adjustments
- Can modify: Encounter frequency, Difficulty scaling, Critical hit rules, Resting rules, Death/permadeath settings
- Presets: Classic 5e, Hardcore, Easy Mode, Custom
- Changes save with game profile

---

## Epic 8: User Interface & Experience
**Priority:** MUST HAVE (Functional) / SHOULD HAVE (Polished)
**Description:** Clean, informative UI that communicates game state clearly.

### User Stories

#### M-8.1: Core UI Layout
**As a** player
**I want** a clear, readable interface
**So that** I can understand game state at a glance

**Acceptance Criteria:**
- Main areas: Map view (largest area), Character info panel (HP, AC, level, XP), Action log/message feed, Quick stats (position, active effects), Context menu (location-specific actions)
- ASCII/text-based aesthetic (lightweight)
- Responsive layout
- Hotkeys for common actions (I for inventory, C for character sheet, M for map, Q for quests, etc.)
- Help screen (H) with controls

---

#### M-8.2: Character Sheet UI
**As a** player
**I want** to view my full character sheet
**So that** I can see all my statistics

**Acceptance Criteria:**
- Modal or panel showing: Ability scores and modifiers, Skills and proficiencies, Saving throws, AC, HP, Speed, Proficiency bonus, Class features, Equipment, Spells (if applicable)
- Clear formatting
- Can access from hotkey (C)

---

#### M-8.3: Inventory UI
**As a** player
**I want** to manage my inventory
**So that** I can organize and use items

**Acceptance Criteria:**
- List of all carried items
- Item details on hover/select
- Equip/Unequip buttons
- Use/Consume for usable items
- Drop item option
- Weight/capacity display
- Sort and filter options

---

#### M-8.4: Combat UI
**As a** player
**I want** clear combat information
**So that** I can make tactical decisions

**Acceptance Criteria:**
- Battlefield grid display
- Turn order indicator
- Available actions clearly shown
- Movement range highlighted
- Attack range shown
- HP bars for all combatants
- Action log of combat events
- Can view enemy stats (Knowledge check or just show)

---

#### S-8.5: Quest Log UI
**As a** player
**I want** to track my active quests
**So that** I remember what I'm doing

**Acceptance Criteria:**
- List of active quests
- Quest details: Description, objectives, progress, rewards
- Can set active quest (tracked on HUD)
- Completed quests viewable
- Failed/abandoned quests archived
- Quest locations marked on map (if known)

---

#### S-8.6: Map UI
**As a** player
**I want** to view a larger map
**So that** I can plan my travels

**Acceptance Criteria:**
- Zoomed-out world map showing explored regions
- Legend for terrain types
- Towns/cities marked
- Points of interest marked
- Current location indicator
- Can see unexplored fog of war
- Fast travel (if implemented) from map

---

## Epic 9: Technical Foundation
**Priority:** MUST HAVE
**Description:** Core technical architecture and performance.

### User Stories

#### M-9.1: Client-Side Architecture
**As a** developer
**I want** a performant client-side application
**So that** the game runs smoothly in browsers

**Acceptance Criteria:**
- 100% client-side (no backend server required)
- JavaScript-based (vanilla or lightweight framework)
- LocalStorage for save files
- JSON data files for rules, tables, content
- Efficient rendering (60 FPS target)
- Small bundle size (<500KB uncompressed for MVP)
- Works offline

**Technical Notes:**
- Recommend: Vanilla JS or Svelte for minimal overhead
- Canvas for rendering or optimized DOM

---

#### M-9.2: Procedural Generation Performance
**As a** player
**I want** world generation to be instant
**So that** I don't experience loading delays

**Acceptance Criteria:**
- Region generation <50ms per region
- No noticeable lag when moving to new regions
- Caching of generated regions
- Background generation of adjacent regions (prefetch)
- Seed determinism verified

**Technical Notes:**
- Use Web Workers for generation if needed

---

#### M-9.3: Save/Load Performance
**As a** player
**I want** saving and loading to be fast
**So that** I can quickly continue playing

**Acceptance Criteria:**
- Save game <500ms
- Load game <1 second
- Save file size <1MB (5MB acceptable)
- JSON serialization of game state
- Version compatibility (handle old saves gracefully)

---

#### M-9.4: Data Structure - Core Tables
**As a** developer
**I want** well-structured data tables
**So that** content is maintainable and extensible

**Acceptance Criteria:**
- JSON tables for: Classes, Races, Spells, Items (weapons, armor, consumables, artifacts), Monsters, Skills, Feats, Campaign templates, Quest templates, Name generation (places, NPCs), Terrain types, Faction types
- Relational structure where needed (IDs to link)
- Validation schema
- Documentation for each table structure

---

## Epic 10: Content & Balancing
**Priority:** SHOULD HAVE
**Description:** Sufficient content for engaging gameplay.

### User Stories

#### S-10.1: Monster Roster
**As a** player
**I want** diverse enemies to fight
**So that** combat stays interesting

**Acceptance Criteria:**
- Phase 2: 25+ monster types
- CR range 0-5 for Phase 2
- Various damage types and abilities
- Monsters from D&D 5e SRD
- Accurate stat blocks

---

#### S-10.2: Item Variety
**As a** player
**I want** diverse loot to find
**So that** character builds feel unique

**Acceptance Criteria:**
- 50+ weapons
- 30+ armor pieces
- 20+ consumables (potions, scrolls)
- 10+ artifacts (unique items)
- Magic item modifiers (+1, +2, elemental damage, etc.)

---

#### S-10.3: Quest Variety
**As a** player
**I want** quests to feel different
**So that** I'm not doing repetitive tasks

**Acceptance Criteria:**
- 15+ quest templates with variations
- Mix of combat, exploration, social, puzzle quests
- Dynamic quest parameters (locations, NPCs, enemies change)
- Quest difficulty scales appropriately

---

## Epic 11: Polish & Juice
**Priority:** COULD HAVE
**Description:** Enhanced experience elements (mostly Phase 3/roadmap).

### User Stories

#### C-11.1: Audio
**As a** player
**I want** sound effects and music
**So that** the game feels more immersive

**Acceptance Criteria:**
- Background music (town, wilderness, combat)
- Sound effects for: Combat (hits, misses, spells), Movement, UI interactions, Level up, Quest complete
- Volume controls
- Can mute audio

---

#### C-11.2: Visual Enhancements
**As a** player
**I want** improved visuals
**So that** the game is more appealing

**Acceptance Criteria:**
- Texture pack system (alternative tilesets)
- Color themes
- Animations (attack animations, spell effects)
- Particle effects
- Screen shake for impacts

---

#### C-11.3: Advanced Features
**As a** player
**I want** additional gameplay depth
**So that** there's more to discover

**Acceptance Criteria:**
- Crafting system
- Base building
- Resource gathering
- Companions/party members
- Romance/relationship system
- Dynamic world events
- Meta-progression between runs

---

## Functional Requirements Summary

### Phase 1: Playable Vertical Slice (2 Days)
**Goal:** Prove core gameplay loop works

**Must Have:**
- [ ] Seed-based world generation (basic)
- [ ] Single class (Fighter) character creation with Standard Array
- [ ] Top-down ASCII map with movement
- [ ] 1v1 turn-based combat (basic actions: Move, Attack)
- [ ] 3 terrain types, 1 town, 5 enemies
- [ ] XP and leveling (1-3)
- [ ] Basic loot system
- [ ] Save/Load
- [ ] Death handling

**Out of Scope for Phase 1:**
- Multiple classes
- Spells
- Advanced combat actions
- Quest system (can be simulated with "kill X enemies" goal)
- Faction/reputation system

---

### Phase 2: MVP (1 Week Total)
**Goal:** Complete core feature set

**Must Have (Adding to Phase 1):**
- [ ] 5 classes (Fighter, Wizard, Cleric, Rogue, Ranger)
- [ ] 5 races
- [ ] Point Buy system
- [ ] Full character creation with backgrounds
- [ ] Complete terrain generation (10+ types)
- [ ] 3-5 towns with named NPCs
- [ ] Quest system (campaign + side quests)
- [ ] Reputation and faction system
- [ ] All 18 skills with checks
- [ ] Advanced combat actions (full D&D 5e action economy)
- [ ] Spell system (cantrips + spell levels 1-2)
- [ ] Rest system (short/long)
- [ ] Equipment system (all basic weapons/armor)
- [ ] 25+ monsters (CR 0-5)
- [ ] Levels 1-5
- [ ] Trap system
- [ ] Social encounters
- [ ] Rules engine implemented

**Should Have (If Time Permits):**
- Levels 6-10
- More quest types
- Faction offices
- Magic items

---

### Phase 3: Content & Polish (Roadmap)
**Could Have:**
- All 13 classes with subclasses
- All races from 5e
- Levels 1-20
- Full spell list (levels 0-9)
- 100+ monsters
- Crafting
- Party/companions
- Multiplayer/co-op
- Audio
- Visual enhancements
- Meta-progression
- Advanced AI

**Won't Have:**
- 3D graphics
- Real-time combat
- Multiplayer PvP
- Mobile app version (web only)

---

## Non-Functional Requirements

### Performance
- **Page Load:** <3 seconds
- **Region Generation:** <50ms
- **Frame Rate:** 60 FPS (or smooth turn-based updates)
- **Save/Load:** <1 second

### Reliability
- **Save Integrity:** No data loss on save/load
- **Deterministic Generation:** Same seed = same world always
- **Error Handling:** Graceful failure, no crashes

### Usability
- **Learning Curve:** New players can start playing within 5 minutes (with tutorial/tooltips)
- **Accessibility:** Keyboard navigation for all functions, clear text, colorblind-friendly palette
- **Documentation:** In-game help, README with rules/controls

### Maintainability
- **Code Quality:** Clean, commented, modular code
- **Data-Driven:** All content in JSON tables, not hardcoded
- **Extensibility:** Easy to add new classes, monsters, items, rules

### Compatibility
- **Browsers:** Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Offline:** Works without internet after initial load
- **LocalStorage:** Graceful handling if storage is full/unavailable

---

## Technical Recommendations

### Technology Stack
**Frontend:**
- **Option A (Recommended for MVP Speed):** Vanilla JavaScript + HTML5 Canvas
  - Pros: No build step, minimal overhead, full control
  - Cons: More boilerplate for reactivity

- **Option B (Recommended for Scalability):** Svelte
  - Pros: Reactive, compiles to vanilla JS, small bundle, fast
  - Cons: Build step required

**Rendering:**
- ASCII characters via Canvas or DOM (recommend Canvas for performance)
- Monospace font (e.g., Courier New, Consolas)

**Data Storage:**
- LocalStorage for save files (JSON serialization)
- JSON files for game data (rules, content tables)

**RNG:**
- Seeded PRNG (e.g., mulberry32, sfc32, Alea)

**No Backend Required** (100% client-side)

---

### Architecture Layers
1. **Data Layer:** JSON tables (classes, races, items, monsters, spells, etc.)
2. **Rules Engine:** Game logic and calculations (attacks, checks, generation algorithms)
3. **Game State:** Current world, character, quests (saved/loaded)
4. **Rendering Layer:** Canvas or DOM display
5. **Input Layer:** Keyboard/mouse handling
6. **UI Layer:** Menus, character sheets, dialogs

---

### Key Architectural Patterns
- **Entity-Component System** (ECS) for characters/monsters (consider for scalability)
- **Data-Driven Design:** All content in JSON, rules in config
- **Procedural Generation:** Seed-based, deterministic, chunked regions
- **State Machine:** For game states (Menu, Exploration, Combat, etc.)
- **Command Pattern:** For actions (enables undo, replay, networking later)

---

## Open Questions for Review

1. **Spell Implementation Priority:** Which 20 spells should we implement for Phase 2? (Suggest: 10 combat, 5 utility, 5 healing/buff)

2. **Combat Grid Size:** 10x10, 15x15, or dynamic based on encounter?

3. **Leveling Speed:** Should Phase 1 have accelerated XP to test leveling quickly?

4. **Tooltip Depth:** How much D&D rules explanation in tooltips? (Assume player knows 5e, or teach from scratch?)

5. **Difficulty Scaling:** Should difficulty selection affect enemy stats, encounter frequency, or both?

6. **Map Size:** For "Small" map in Phase 1, how many regions? (Suggest: 20x20 region grid, each region ~10x10 tiles)

7. **Starting Equipment:** Random, chosen during character creation, or class default?

8. **Quest Notification:** How does player know about quests? Talk to NPCs, or quest board in town?

---

## Success Metrics

### Phase 1 Success Criteria
- [ ] Can generate world from seed
- [ ] Can create character and see stats
- [ ] Can move around map
- [ ] Can enter combat and win/lose
- [ ] Can level up and see improvements
- [ ] Can save and load game
- [ ] Zero critical bugs
- [ ] Playable for 30+ minutes without repetition

### Phase 2 Success Criteria
- [ ] All core systems implemented
- [ ] 5 classes playable and balanced
- [ ] Can complete a campaign objective
- [ ] Faction system functional
- [ ] Reputation economy works
- [ ] 3+ hours of unique gameplay
- [ ] <5 critical bugs
- [ ] Performance targets met

### Phase 3 Success Criteria
- [ ] All 13 classes available
- [ ] 20 levels of progression
- [ ] 10+ hours of gameplay per run
- [ ] Positive player feedback
- [ ] Modding community started
- [ ] No critical bugs

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Procedural generation creates unbalanced worlds | High | Medium | Extensive testing with multiple seeds, adjustable rules engine |
| Performance issues with large maps | High | Medium | Chunk-based generation, caching, profiling |
| D&D 5e rules too complex to implement quickly | High | Low | Start with core rules, add complexity incrementally |
| Save file corruption | High | Low | Versioning, validation, backup saves |
| Combat AI too simple/predictable | Medium | Medium | Iterative AI improvement, multiple difficulty settings |
| Scope creep delaying MVP | Medium | High | Strict MoSCoW prioritization, resist feature additions |
| Browser compatibility issues | Low | Low | Test on major browsers, use standard APIs |

---

## Timeline Estimate

### Phase 1: Days 1-2
- **Day 1 Morning:** Project setup, data structures, rules engine foundation
- **Day 1 Afternoon:** Character creation (Fighter only), basic UI
- **Day 1 Evening:** World generation (basic), map rendering, movement
- **Day 2 Morning:** Combat system (1v1), damage, HP, death
- **Day 2 Afternoon:** XP/leveling, loot, save/load
- **Day 2 Evening:** Testing, bug fixes, playable vertical slice

### Phase 2: Days 3-7
- **Day 3:** Add 4 more classes, expand races, Point Buy, complete character creation
- **Day 4:** Quest system (campaign + side quests), quest log UI
- **Day 5:** Faction system, reputation economy, merchants
- **Day 6:** Skills (all 18), skill checks, social encounters, traps
- **Day 7:** Spell system, rest system, advanced combat, polish, testing

---

## Appendix: Data Structure Overview

### Core Data Tables (JSON)
1. **classes.json:** Class definitions (name, hit die, proficiencies, features by level)
2. **races.json:** Race definitions (name, ability bonuses, traits, speed)
3. **spells.json:** Spell definitions (name, level, school, components, range, duration, effect)
4. **items.json:** Item definitions (weapons, armor, consumables, artifacts)
5. **monsters.json:** Monster stat blocks (name, CR, stats, attacks, abilities)
6. **skills.json:** Skill definitions (name, ability, description)
7. **feats.json:** Feat definitions (name, prerequisites, benefits)
8. **backgrounds.json:** Background definitions (name, skill proficiencies, equipment, feature)
9. **terrains.json:** Terrain type definitions (name, symbol, traversable, movement cost, description)
10. **factions.json:** Faction templates (types, names, relationships)
11. **quests.json:** Quest templates (types, objectives, rewards)
12. **campaigns.json:** Campaign objective templates
13. **names.json:** Name generation tables (settlements, NPCs, etc.)

### Game State Structure (Saved)
```json
{
  "version": "1.0",
  "seed": "NEXUS-1234",
  "worldConfig": {
    "mapSize": "medium",
    "difficulty": "normal",
    "campaignType": "defeat_lich"
  },
  "character": {
    "name": "Thorin",
    "race": "dwarf",
    "class": "fighter",
    "level": 3,
    "xp": 950,
    "abilityScores": {...},
    "skills": {...},
    "hp": {"current": 28, "max": 32},
    "inventory": [...],
    "equipment": {...},
    "position": {"x": 45, "y": 67}
  },
  "world": {
    "generatedRegions": [...],
    "settlements": [...],
    "npcs": [...]
  },
  "quests": {
    "active": [...],
    "completed": [...]
  },
  "factions": {
    "ironhillDwarves": 45,
    "magesGuild": 20
  },
  "flags": {...}
}
```

---

## Next Steps

1. **Review & Approve PRD:** Gather feedback on priorities and scope
2. **Architectural Decisions Log:** Document key technical decisions
3. **Project Plan:** Detailed task breakdown for Phase 1 & 2
4. **Data Structure Design:** Finalize JSON schemas
5. **Rules Engine Design:** Define configuration format
6. **Begin Development:** Phase 1 implementation

---

**Document Status:** Draft - Awaiting Review
**Next Review Date:** 2025-12-09
**Owner:** KnowledgeRatio
**Contributors:** Claude (Game Designer/Architect)
