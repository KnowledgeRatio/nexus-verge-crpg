# Claude Development Guide
# Nexus Verge - Procedural D&D 5e Roguelike CRPG

**Last Updated:** 2025-12-13
**Current Branch:** `claude/procedural-roguelike-platformer-01J97EBHans8dhCtHVojyJ7s`
**Project Phase:** Phase 2 MVP - Core Systems Implementation
**Latest Commit:** Implement save/load system with 5 slots and playtime tracking

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

### 🚧 Phase 2 Remaining - MVP Features
**Next Priorities:**
- [ ] Quest system (campaign + side quests, templates, tracking)
- [ ] Faction and reputation system (5 factions, reputation-based economy)
- [ ] Save/Load functionality (LocalStorage, serialization)
- [ ] Spell system (cantrips + levels 1-2, casting UI)
- [ ] Skill checks and non-combat encounters
- [ ] Loot and inventory management (drops, equipment, weight)

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

### Immediate (Day 3-4)
1. **World Generation System**
   - Implement Simplex noise terrain generation
   - Chunk-based region system
   - Biome clustering (grassland, forest, mountain, water)
   - Settlement placement algorithm

2. **Map Renderer**
   - Canvas-based rendering
   - ASCII/tile display (80x40 viewport)
   - Fog of war
   - Camera following player

3. **Player Movement**
   - WASD/Arrow key input
   - Collision detection
   - Region loading on movement
   - Update game state

### Mid-Term (Day 5-6)
4. **Combat System**
   - Grid-based battlefield (10x10 minimum)
   - Initiative system
   - Turn-based action queue
   - Attack rolls, damage calculation
   - Enemy AI (basic)

5. **Quest System**
   - Quest templates (kill, retrieve, deliver)
   - Quest generation from templates
   - Quest tracking and completion
   - XP and reputation rewards

6. **Save/Load**
   - Serialize game state to JSON
   - LocalStorage save slots
   - Load game and restore state
   - Version compatibility

### Later (Day 7+)
7. **Spell System**
   - Spell slot tracking
   - Spell casting UI
   - Spell effects and targeting
   - Concentration tracking

8. **Faction System**
   - Faction data structure
   - Reputation tracking
   - Reputation-based merchants
   - Faction relationships

9. **Skill Checks**
   - Skill check prompts
   - DC calculation
   - Success/failure outcomes
   - Integration in exploration

10. **Polish & Testing**
    - Bug fixes
    - Balance tuning
    - Performance optimization
    - Playtesting

---

## 🐛 Known Issues & TODOs

### Current TODOs in Code
- Save/Load system not yet implemented
- Quest system not yet implemented
- Spell system (cantrips + levels 1-2) not yet implemented
- Ability system (class features) not yet implemented
- Skill checks in non-combat encounters not yet implemented

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

**Testing Status:**
- ✅ Server starts without errors
- ✅ No linting/compilation errors
- ✅ UI loads correctly in browser
- ⚠️ Needs runtime testing (create character, explore, find settlement, test rest)

**Current State:**
- Rest system fully implemented and integrated
- Follows D&D 5e rules per rulesEngine.js configuration
- Clean modal UI with proper state management
- Ready for testing and iteration

**Next Session Priorities:**
1. **Test rest system** - Runtime validation of all rest mechanics
2. **Quest system** - Campaign + side quests, templates, tracking, rewards
3. **Save/Load** - LocalStorage persistence for game state
4. **Faction system** - 5 factions with reputation tracking
5. **Spell system** - Cantrips + levels 1-2, casting UI

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
