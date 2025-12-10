# Claude Development Guide
# Nexus Verge - Procedural D&D 5e Roguelike CRPG

**Last Updated:** 2025-12-09
**Current Branch:** `claude/procedural-roguelike-platformer-01J97EBHans8dhCtHVojyJ7s`
**Project Phase:** Phase 2 MVP - Core Systems Complete
**Latest Commit:** Implement full D&D 5e turn-based combat system

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
- [x] Combat system (full D&D 5e turn-based tactical combat)
- [x] Enemy AI (basic tactical behavior)
- [x] Random encounters (8% base chance, terrain modified)

### 🚧 Phase 2 Remaining - MVP Features
**Next Priorities:**
- [ ] Quest system (campaign + side quests, templates, tracking)
- [ ] Faction and reputation system (5 factions, reputation-based economy)
- [ ] Save/Load functionality (LocalStorage, serialization)
- [ ] Rest system (short/long rests, recovery, taverns)
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
│   │   └── CombatManager.js  # Turn-based combat system
│   ├── rendering/        # Rendering systems
│   │   ├── MapRenderer.js    # World map visualization
│   │   └── CombatRenderer.js # Combat grid visualization
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
**Purpose:** Turn-based tactical combat following D&D 5e rules

**Key Features:**
- Initiative system (d20 + DEX modifier)
- Action economy (Action, Bonus Action, Movement, Reaction)
- Attack rolls (d20 + modifiers vs AC)
- Damage rolls with critical hits (natural 20)
- 12x12 grid-based battlefield
- Enemy AI with tactical behavior
- Victory/defeat conditions with XP rewards

**Usage:**
```javascript
import CombatManager from './systems/CombatManager.js';

const combat = new CombatManager();

// Start combat with player and enemies
await combat.startCombat(playerCharacter, [enemy1, enemy2]);

// On player turn
combat.move(combatant, toX, toY);           // Move combatant
combat.attack(attacker, defender);           // Make attack
combat.endTurn();                             // End current turn

// Combat ends automatically on victory/defeat
```

**Combat Flow:**
1. **Start Combat** → Generate 12x12 grid, place combatants
2. **Roll Initiative** → All combatants roll d20 + DEX
3. **Turn Loop:**
   - Start turn (reset action economy)
   - Player acts (click to move/attack) or AI executes
   - End turn
   - Next combatant
4. **End Combat** → Award XP, return to exploration

**Combatant Actions:**
- **Action:** Attack, special abilities (once per turn)
- **Bonus Action:** Quick actions (once per turn)
- **Movement:** Character speed / 5 feet per square
- **Reaction:** Opportunity attacks (when triggered)

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
- `src/main.js:184` - World generation not yet implemented
- Save/Load system not yet implemented
- Combat system not yet implemented
- Quest system not yet implemented
- Map rendering not yet implemented

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
