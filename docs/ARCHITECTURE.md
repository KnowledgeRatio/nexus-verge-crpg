# Architectural Decisions Log (ADL)
# Nexus Verge - D&D 5e Roguelike CRPG

**Last Updated:** 2025-12-09

---

## ADR-001: Technology Stack - Pure Client-Side Architecture

**Status:** Proposed
**Date:** 2025-12-09
**Decision Makers:** Development Team

### Context
Need to choose technology stack that enables:
- 100% client-side operation (no backend)
- Fast development (2-day vertical slice, 1-week MVP)
- Good performance with procedural generation
- Easy maintenance and modding

### Options Considered

#### Option A: Vanilla JavaScript + Canvas
**Pros:**
- Zero build step, fastest to start
- No dependencies, smallest bundle
- Full control over rendering
- Easy to debug
- No framework learning curve

**Cons:**
- More boilerplate for state management
- Manual reactivity
- More code to write for UI

#### Option B: Svelte + Canvas
**Pros:**
- Reactive state management
- Component-based architecture
- Compiles to vanilla JS (small bundle)
- Clean syntax
- Good for complex UI

**Cons:**
- Build step required (Vite/Rollup)
- Framework learning curve
- Slightly larger bundle
- Additional complexity

#### Option C: React + Canvas
**Pros:**
- Most popular, lots of resources
- Component-based
- Rich ecosystem

**Cons:**
- Larger bundle size (React + ReactDOM)
- Virtual DOM overhead not needed for game
- Overkill for this project

### Decision
**RECOMMEND: Vanilla JavaScript + Canvas (Option A)**

**Rationale:**
1. **Speed to MVP:** No build setup, start coding immediately
2. **Performance:** Direct control over rendering loop, no framework overhead
3. **Bundle Size:** Minimal (~50KB for core engine)
4. **Learning Curve:** Team knows JS, no new framework
5. **Debugging:** Easier to trace issues without framework abstractions
6. **Modding:** Easier for community to understand and mod

**Alternative:** If team prefers component architecture, use Svelte (not React)

### Implementation Details
- **Rendering:** HTML5 Canvas for main game view, DOM for UI overlays
- **State Management:** Custom state object with observer pattern
- **Modules:** ES6 modules for organization
- **Build:** Optional bundler (esbuild) for production only

---

## ADR-002: Data Storage - LocalStorage + JSON

**Status:** Proposed
**Date:** 2025-12-09

### Context
Need to store:
- Game saves (character, world state, progress)
- Game data (classes, races, items, monsters, rules)

No backend available. Must work offline.

### Options Considered

#### Option A: LocalStorage + JSON
**Pros:**
- Simple API
- Synchronous (easier to use)
- Built into all browsers
- 5-10MB storage (enough for saves)
- Easy serialization

**Cons:**
- Size limit (5-10MB)
- Synchronous (can block main thread)
- No indexing/querying

#### Option B: IndexedDB
**Pros:**
- Larger storage (50MB+)
- Asynchronous
- Can index and query
- Better for large datasets

**Cons:**
- Complex API
- Overkill for this use case
- More code to manage

#### Option C: SQLite via WASM (sql.js)
**Pros:**
- Relational database
- SQL queries
- Familiar to developers

**Cons:**
- Large bundle size (~500KB)
- Requires WASM support
- Complex setup
- Overkill for client-side game

### Decision
**SELECTED: LocalStorage + JSON (Option A)**

**Rationale:**
1. **Simplicity:** Easiest API, least code
2. **Size:** Save files <1MB, well within limits
3. **Performance:** Synchronous is fine for turn-based game
4. **Compatibility:** Works everywhere
5. **Serialization:** JSON.stringify/parse built-in

### Implementation Details
```javascript
// Save game
const saveGame = (slot, gameState) => {
  const saveData = {
    version: "1.0",
    timestamp: Date.now(),
    state: gameState
  };
  localStorage.setItem(`save_${slot}`, JSON.stringify(saveData));
};

// Load game
const loadGame = (slot) => {
  const data = localStorage.getItem(`save_${slot}`);
  return data ? JSON.parse(data) : null;
};
```

**Game Data:** Store static data (classes, races, items) as JSON files in `/data/` directory
- Load on game start
- Cache in memory
- ~100-200KB total

---

## ADR-003: Procedural Generation - Seeded RNG with Chunked Generation

**Status:** Proposed
**Date:** 2025-12-09

### Context
Need procedural generation that is:
- Deterministic (same seed = same world)
- Shareable (players can exchange seeds)
- Performant (no lag when exploring)
- Infinite (or very large)

### Algorithm Selection

#### Random Number Generator
**Selected: Mulberry32 PRNG**

```javascript
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
```

**Why:**
- Fast (no trig, no complex math)
- Good distribution
- Small code size
- Seedable

**Alternative:** sfc32 (slightly better quality, minimally slower)

#### World Generation Strategy
**Selected: Chunk-Based with Noise**

**World Structure:**
- World divided into **regions** (chunks), each 32x32 tiles
- Regions generated on-demand when player explores
- Each region has deterministic seed derived from: `worldSeed + regionX + regionY`
- Generated regions cached in memory, saved in save file

**Terrain Generation:**
- Use **Simplex/Perlin Noise** for coherent terrain
  - Library: `simplex-noise` (~2KB)
- Multiple octaves for detail
- Biome determined by noise value thresholds

**Pseudo-code:**
```javascript
function generateRegion(worldSeed, regionX, regionY) {
  const regionSeed = hashString(`${worldSeed}_${regionX}_${regionY}`);
  const rng = mulberry32(regionSeed);
  const noise = new SimplexNoise(regionSeed);

  const tiles = [];
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const worldX = regionX * 32 + x;
      const worldY = regionY * 32 + y;
      const elevation = noise.noise2D(worldX * 0.05, worldY * 0.05);
      const moisture = noise.noise2D(worldX * 0.03 + 1000, worldY * 0.03 + 1000);

      const terrain = selectTerrain(elevation, moisture);
      tiles.push({ x: worldX, y: worldY, terrain });
    }
  }

  // Generate features (towns, dungeons, NPCs)
  const features = generateFeatures(rng, regionX, regionY, tiles);

  return { tiles, features };
}
```

### Decision
**SELECTED: Chunk-based + Simplex Noise + Seeded RNG**

**Rationale:**
1. **Determinism:** Seeded RNG ensures same world every time
2. **Performance:** Only generate visible/adjacent regions
3. **Memory:** Cache generated regions, discard far regions if needed
4. **Coherence:** Simplex noise creates realistic terrain clustering
5. **Shareability:** Seed is just a string

### Implementation Details
- **Seed Format:** `WORD-NNNN-WORD` (e.g., "NEXUS-7492-ALPHA")
- **Region Size:** 32x32 tiles
- **Noise Scale:** Elevation 0.05, Moisture 0.03 (tune for desired variety)
- **Caching:** Keep 9 regions in memory (current + 8 adjacent), LRU eviction
- **Save Size:** Only save modified regions (quest changes, NPCs killed, etc.)

---

## ADR-004: Rendering - HTML5 Canvas with ASCII

**Status:** Proposed
**Date:** 2025-12-09

### Context
Need to render:
- Top-down game world (map, character, NPCs, terrain)
- UI overlays (character sheet, inventory, combat)
- Must be performant (60 FPS or instant turn updates)
- Aesthetic: ASCII/roguelike style

### Options Considered

#### Option A: Canvas + ASCII
**Pros:**
- Full control over rendering
- Fast (direct pixel manipulation)
- Can do fancy effects (glow, fade, particles)
- Single rendering context
- Good for animations

**Cons:**
- More code to draw text/glyphs
- Need to manage font rendering

#### Option B: DOM + Styled Divs/Spans
**Pros:**
- Easy to render text/characters
- CSS styling
- Inspector-friendly
- Accessibility (screen readers)

**Cons:**
- Slower for large grids (100x100)
- Layout reflow overhead
- More DOM nodes to manage

#### Option C: WebGL + Sprite Atlas
**Pros:**
- Fastest rendering (GPU)
- Can scale to huge maps
- Shader effects

**Cons:**
- Overkill for ASCII game
- Larger bundle (Three.js, Pixi.js)
- More complex code

### Decision
**SELECTED: Canvas + ASCII (Option A)**

**With DOM overlays for UI panels**

**Rationale:**
1. **Performance:** Canvas is fast enough for 80x40 grid at 60 FPS
2. **Control:** Can optimize exactly what we need
3. **Effects:** Can add glow, color, animations easily
4. **Simplicity:** Less abstraction than WebGL
5. **Bundle Size:** No extra libraries

**Hybrid Approach:**
- **Canvas:** Game map/viewport (main game area)
- **DOM:** UI panels (character sheet, inventory, menus) overlaid with CSS

### Implementation Details

**Canvas Setup:**
```javascript
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ASCII rendering at 12px monospace font
const TILE_WIDTH = 12;
const TILE_HEIGHT = 16;
const VIEWPORT_WIDTH = 80; // tiles
const VIEWPORT_HEIGHT = 40; // tiles

canvas.width = VIEWPORT_WIDTH * TILE_WIDTH;
canvas.height = VIEWPORT_HEIGHT * TILE_HEIGHT;

// Draw tile
function drawTile(x, y, char, fgColor, bgColor) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(x * TILE_WIDTH, y * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT);

  ctx.fillStyle = fgColor;
  ctx.font = '12px "Courier New"';
  ctx.fillText(char, x * TILE_WIDTH, (y + 1) * TILE_HEIGHT - 4);
}
```

**ASCII Character Set:**
- Player: `@`
- NPCs: `A-Z` (Hostile), `a-z` (Friendly)
- Terrain: `. , ' " ` (grass), `^` (mountain), `T` (tree), `~` (water), `#` (wall), `=` (road), `+` (door)
- Items: `!` (potion), `?` (scroll), `/|` (weapons), `[` (armor), `*` (gold/treasure), `%` (food)
- Monsters: `g` (goblin), `o` (orc), `D` (dragon), `Z` (zombie), etc.

**Color Palette:**
- High contrast for readability
- Distinct colors for different terrain/entities
- Configurable (theme support)

---

## ADR-005: Combat System - Turn-Based Grid with Action Queue

**Status:** Proposed
**Date:** 2025-12-09

### Context
Implement turn-based tactical combat following D&D 5e rules:
- Initiative order
- Action economy (action, bonus action, movement, reaction)
- Grid positioning
- Attacks, spells, movement

### Architecture

#### Turn Order Management
```javascript
class CombatManager {
  constructor() {
    this.combatants = [];
    this.turnOrder = [];
    this.currentTurnIndex = 0;
  }

  // Roll initiative for all combatants
  rollInitiative() {
    this.combatants.forEach(c => {
      c.initiative = rollDice(20) + c.dexModifier;
    });
    this.turnOrder = [...this.combatants].sort((a, b) => b.initiative - a.initiative);
  }

  // Get current combatant
  getCurrentCombatant() {
    return this.turnOrder[this.currentTurnIndex];
  }

  // End turn, move to next
  endTurn() {
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;

    // Check for combat end
    if (this.isPlayerDefeated() || this.areAllEnemiesDefeated()) {
      this.endCombat();
    }
  }
}
```

#### Action System
```javascript
class Combatant {
  constructor(characterData) {
    this.name = characterData.name;
    this.hp = characterData.hp;
    this.ac = characterData.ac;
    // ... stats

    // Action economy reset each turn
    this.resetActions();
  }

  resetActions() {
    this.actions = {
      action: true,         // Main action
      bonusAction: true,    // Bonus action
      movement: this.speed, // Movement points
      reaction: true,       // Reaction (for opportunity attacks)
    };
  }

  // Use action
  useAction(type) {
    if (this.actions[type]) {
      this.actions[type] = type === 'movement'
        ? Math.max(0, this.actions.movement - amount)
        : false;
      return true;
    }
    return false;
  }
}
```

#### Grid System
```javascript
class CombatGrid {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.grid = Array(height).fill(null).map(() => Array(width).fill(null));
    this.combatants = new Map(); // combatant -> {x, y}
  }

  // Place combatant
  placeCombatant(combatant, x, y) {
    if (this.isValidPosition(x, y) && !this.grid[y][x]) {
      this.grid[y][x] = combatant;
      this.combatants.set(combatant, {x, y});
      return true;
    }
    return false;
  }

  // Move combatant
  moveCombatant(combatant, toX, toY) {
    const from = this.combatants.get(combatant);
    if (!from) return false;

    const distance = Math.abs(toX - from.x) + Math.abs(toY - from.y);
    if (distance > combatant.actions.movement) return false;

    // Check path (basic, no diagonal)
    if (!this.hasValidPath(from.x, from.y, toX, toY)) return false;

    // Move
    this.grid[from.y][from.x] = null;
    this.grid[toY][toX] = combatant;
    this.combatants.set(combatant, {x: toX, y: toY});
    combatant.actions.movement -= distance;

    return true;
  }

  // Get combatants in range
  getCombatantsInRange(combatant, range) {
    const pos = this.combatants.get(combatant);
    return Array.from(this.combatants.entries())
      .filter(([c, p]) => {
        if (c === combatant) return false;
        const dist = Math.abs(p.x - pos.x) + Math.abs(p.y - pos.y);
        return dist <= range;
      })
      .map(([c, p]) => c);
  }
}
```

### Decision
**SELECTED: Turn-Based Grid Combat with Action Queue**

**Features:**
1. **Initiative:** Roll d20 + DEX, sorted descending
2. **Turn Structure:** Each combatant's turn has: Action, Bonus Action, Movement, Reaction
3. **Grid:** 10x10 minimum, expand based on encounter
4. **Movement:** Grid-based, 1 square = 5 feet, diagonal costs 1.5x (or use Manhattan distance)
5. **Actions:** Attack, Cast Spell, Dodge, Disengage, Dash, Help, Hide, Ready, Use Object
6. **Attacks:** Melee (adjacent), Ranged (line of sight, range limits)
7. **Cover:** Detect obstacles between attacker/target, grant +2 (half) or +5 (three-quarters) to AC

### Implementation Details
- **Phase 1:** Basic actions (Move, Attack, End Turn)
- **Phase 2:** Full action economy, reactions, advanced actions
- **AI:** Simple heuristic (move toward player, attack if in range, else ranged attack or move)

---

## ADR-006: Rules Engine - Centralized Configuration

**Status:** Proposed
**Date:** 2025-12-09

### Context
Need modifiable rules system for:
- Game balance tuning
- Homebrew support
- Easy developer adjustments
- No recompilation for changes

### Architecture

#### Rules Configuration Structure
```javascript
// rulesEngine.js
export const RULES = {
  // Core D&D 5e Rules
  core: {
    abilityScoreMax: 20,
    abilityScoreMin: 1,
    proficiencyBonusByLevel: {
      1: 2, 2: 2, 3: 2, 4: 2,
      5: 3, 6: 3, 7: 3, 8: 3,
      9: 4, 10: 4, 11: 4, 12: 4,
      // ... up to 20
    },
    advantageDisadvantageMode: "rollTwice", // "rollTwice" or "static"
  },

  // Combat Rules
  combat: {
    criticalHitRange: [20], // Natural 20
    criticalMissRange: [1],  // Natural 1
    opportunityAttacks: true,
    deathSaveDC: 10,
    deathSaveSuccessThreshold: 3,
    deathSaveFailureThreshold: 3,
    coverBonuses: {
      half: 2,        // +2 AC
      threeQuarters: 5, // +5 AC
      full: Infinity    // Can't target
    },
    initiative: {
      tiebreaker: "dexterity", // "dexterity" or "reroll"
    },
  },

  // Progression
  progression: {
    xpTable: {
      2: 300, 3: 900, 4: 2700, 5: 6500,
      // ... D&D 5e XP thresholds
    },
    xpMultiplier: 1.0, // Adjust for faster/slower leveling
  },

  // Encounter Generation
  encounters: {
    combatFrequency: 0.15,      // 15% chance per wilderness tile
    trapFrequency: 0.05,        // 5% chance in dungeons
    socialEncounterFrequency: 0.08, // 8% chance in towns
    crScaling: "levelBased",    // "levelBased", "static", "randomRange"
    crRangeOffset: [-1, 2],     // Enemy CR = playerLevel + random(-1 to 2)
  },

  // Loot Generation
  loot: {
    dropRateByCR: {
      0: 0.3,   // 30% chance to drop loot
      1: 0.5,
      2: 0.6,
      // ...
    },
    rarityChances: {
      common: 0.60,
      uncommon: 0.25,
      rare: 0.10,
      veryRare: 0.04,
      legendary: 0.01,
    },
    magicItemChanceByLevel: {
      1: 0.05,
      2: 0.08,
      // ...
    },
  },

  // Rest System
  rest: {
    shortRestDuration: 1,         // 1 hour
    longRestDuration: 8,          // 8 hours
    shortRestsPerLongRest: 2,     // Max 2 short rests
    longRestRequiresTavern: true, // Must be in inn
    hitDiceRecoverPerLongRest: 0.5, // Recover half (min 1)
  },

  // Skills
  skills: {
    baseDC: {
      easy: 10,
      medium: 15,
      hard: 20,
      veryHard: 25,
    },
    passiveBonus: 10, // Passive Perception = 10 + Perception bonus
  },

  // World Generation
  worldGen: {
    regionSize: 32,              // 32x32 tiles per region
    townSpacing: 5,              // Min regions between towns
    dungeonFrequency: 0.1,       // 10% of regions have dungeon
    biomeNoiseScale: 0.05,       // Simplex noise scale for biomes
    riverNoiseScale: 0.08,
  },
};
```

#### Rules Access Pattern
```javascript
// Anywhere in code:
import { RULES } from './rulesEngine.js';

// Calculate proficiency bonus
const proficiencyBonus = RULES.core.proficiencyBonusByLevel[characterLevel];

// Check for critical hit
const isCritical = RULES.combat.criticalHitRange.includes(diceRoll);

// Generate encounter
if (Math.random() < RULES.encounters.combatFrequency) {
  spawnEncounter();
}
```

### Decision
**SELECTED: Centralized Rules Configuration**

**Rationale:**
1. **Single Source of Truth:** All rules in one place
2. **Easy Tuning:** Change values without code changes
3. **Homebrew Support:** Users can edit rulesEngine.js
4. **Debugging:** Clear what rules are active
5. **Documentation:** Comments in rules file explain each setting

### Future Enhancement
- Load rules from external JSON (allow in-game editor)
- Rule presets (Classic 5e, Hardcore, Easy Mode)
- Version compatibility (migrate old saves to new rules)

---

## ADR-007: Character Sheet Data Model

**Status:** Proposed
**Date:** 2025-12-09

### Context
Character sheets represent both player characters and NPCs. Need unified data model.

### Structure
```javascript
class Character {
  constructor(data) {
    // Core Identity
    this.id = generateUUID();
    this.name = data.name;
    this.race = data.race;          // Reference to race definition
    this.class = data.class;        // Reference to class definition
    this.level = data.level || 1;
    this.xp = data.xp || 0;

    // Ability Scores
    this.abilities = {
      str: data.abilities.str,
      dex: data.abilities.dex,
      con: data.abilities.con,
      int: data.abilities.int,
      wis: data.abilities.wis,
      cha: data.abilities.cha,
    };

    // Computed Stats
    this.proficiencyBonus = this.calculateProficiencyBonus();
    this.abilityModifiers = this.calculateAbilityModifiers();
    this.ac = this.calculateAC();
    this.initiative = this.abilityModifiers.dex;
    this.speed = this.calculateSpeed();

    // Hit Points
    this.hp = {
      current: data.hp?.current || this.maxHP,
      max: data.hp?.max || this.maxHP,
      temp: 0,
    };
    this.hitDice = {
      current: this.level,
      max: this.level,
      size: data.class.hitDie, // e.g., 8 for d8
    };

    // Skills (proficiency and bonuses)
    this.skills = this.initializeSkills(data);

    // Saving Throws
    this.savingThrows = this.initializeSavingThrows(data);

    // Proficiencies
    this.proficiencies = {
      armor: data.class.armorProficiencies,
      weapons: data.class.weaponProficiencies,
      tools: data.background?.toolProficiencies || [],
      languages: [...data.race.languages, ...(data.background?.languages || [])],
    };

    // Equipment
    this.inventory = data.inventory || [];
    this.equipment = {
      mainHand: null,
      offHand: null,
      armor: null,
      helmet: null,
      shield: null,
      artifact: null,
    };

    // Spellcasting (if applicable)
    this.spellcasting = data.class.spellcaster ? {
      spellcastingAbility: data.class.spellcastingAbility,
      spellSlots: this.calculateSpellSlots(),
      spellsKnown: [],
      spellsPrepared: [],
      cantripsKnown: [],
    } : null;

    // Features & Traits
    this.features = this.getClassFeatures(data.class, this.level);
    this.racialTraits = data.race.traits;
    this.feats = data.feats || [];

    // Status
    this.conditions = []; // Blinded, Charmed, etc.
    this.effects = [];     // Temporary effects (buff/debuff)

    // Combat State (if in combat)
    this.combatState = null;

    // NPC-specific
    this.isHostile = data.isHostile || false;
    this.faction = data.faction || null;

    // Background & Personality
    this.background = data.background || null;
    this.alignment = data.alignment || null;
    this.personality = data.personality || null;
  }

  calculateAbilityModifier(score) {
    return Math.floor((score - 10) / 2);
  }

  calculateAbilityModifiers() {
    return {
      str: this.calculateAbilityModifier(this.abilities.str),
      dex: this.calculateAbilityModifier(this.abilities.dex),
      con: this.calculateAbilityModifier(this.abilities.con),
      int: this.calculateAbilityModifier(this.abilities.int),
      wis: this.calculateAbilityModifier(this.abilities.wis),
      cha: this.calculateAbilityModifier(this.abilities.cha),
    };
  }

  // ... more methods
}
```

### Decision
**SELECTED: Unified Character class for PC and NPC**

**Rationale:**
1. **Code Reuse:** Same logic for player and NPCs
2. **Combat Consistency:** Both use same combat calculations
3. **Flexibility:** NPCs can be as complex or simple as needed
4. **Save Size:** Only instantiate complex NPCs when needed

---

## ADR-008: Quest System - Template-Based Generation

**Status:** Proposed
**Date:** 2025-12-09

### Context
Need procedurally generated quests that feel varied and meaningful.

### Architecture

#### Quest Template Structure
```json
{
  "id": "kill_monsters",
  "name": "{{enemyType}} Extermination",
  "description": "{{questGiver}} needs help clearing {{enemyType}}s from {{location}}.",
  "type": "kill",
  "objectives": [
    {
      "type": "killEnemies",
      "target": "{{enemyType}}",
      "count": "{{enemyCount}}"
    }
  ],
  "rewards": {
    "xp": "{{enemyCount}} * {{enemyCR}} * 100",
    "reputation": "10",
    "items": ["{{rewardItem}}"]
  },
  "difficulty": "medium",
  "timeLimit": null
}
```

#### Quest Generator
```javascript
class QuestGenerator {
  constructor(worldSeed, gameState) {
    this.rng = mulberry32(worldSeed);
    this.templates = loadQuestTemplates();
    this.gameState = gameState;
  }

  generateQuest(location, questGiver, playerLevel) {
    // Select template based on context
    const template = this.selectTemplate(location, playerLevel);

    // Fill in template variables
    const quest = this.instantiateTemplate(template, {
      questGiver: questGiver.name,
      location: this.selectLocation(location),
      enemyType: this.selectEnemy(playerLevel),
      enemyCount: this.selectCount(playerLevel),
      rewardItem: this.selectReward(playerLevel),
      // ...
    });

    return quest;
  }

  selectTemplate(location, playerLevel) {
    // Filter templates by context (e.g., can't escort in wilderness)
    const suitable = this.templates.filter(t => {
      return t.allowedLocations.includes(location.type) &&
             t.minLevel <= playerLevel &&
             t.maxLevel >= playerLevel;
    });

    // Random selection
    return suitable[Math.floor(this.rng() * suitable.length)];
  }
}
```

### Decision
**SELECTED: Template-Based Quest Generation with Variable Substitution**

**Rationale:**
1. **Variety:** Many templates × random variables = infinite quests
2. **Maintainability:** Easy to add new quest types
3. **Quality:** Hand-crafted templates ensure coherence
4. **Balance:** Templates specify difficulty and rewards

**Quest Types for MVP:**
- Kill X enemies
- Retrieve item from location
- Deliver item to NPC
- Escort NPC to location
- Investigate location

---

## ADR-009: State Management Pattern

**Status:** Proposed
**Date:** 2025-12-09

### Context
Need to manage complex game state:
- Character stats
- World state
- Combat state
- UI state

### Pattern Selection

#### Option A: Centralized Store (Redux-like)
**Pros:**
- Single source of truth
- Predictable state changes
- Easy to debug
- Time-travel debugging possible

**Cons:**
- Boilerplate (actions, reducers)
- Overhead for simple changes

#### Option B: Reactive State (Observables)
**Pros:**
- Simple API
- Components subscribe to changes
- No boilerplate

**Cons:**
- Can be hard to trace updates
- Memory leaks if not unsubscribed

#### Option C: Plain Objects + Manual Updates
**Pros:**
- Simplest possible
- No abstractions
- Direct control

**Cons:**
- No automatic UI updates
- Easy to create bugs

### Decision
**SELECTED: Hybrid - Centralized GameState with Observer Pattern**

```javascript
class GameState {
  constructor() {
    this.data = {
      seed: null,
      character: null,
      world: {
        regions: new Map(),
        settlements: [],
        npcs: new Map(),
      },
      quests: {
        active: [],
        completed: [],
      },
      combat: null,
      ui: {
        currentScreen: 'mainMenu',
        modalOpen: null,
      },
    };

    this.observers = new Map();
  }

  // Subscribe to state changes
  subscribe(path, callback) {
    if (!this.observers.has(path)) {
      this.observers.set(path, []);
    }
    this.observers.get(path).push(callback);
  }

  // Update state and notify observers
  update(path, value) {
    setNestedProperty(this.data, path, value);
    this.notify(path, value);
  }

  notify(path, value) {
    // Notify exact path
    if (this.observers.has(path)) {
      this.observers.get(path).forEach(cb => cb(value));
    }

    // Notify parent paths (e.g., "character" when "character.hp" changes)
    const parts = path.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join('.');
      if (this.observers.has(parentPath)) {
        const parentValue = getNestedProperty(this.data, parentPath);
        this.observers.get(parentPath).forEach(cb => cb(parentValue));
      }
    }
  }

  get(path) {
    return getNestedProperty(this.data, path);
  }
}

// Global game state
export const gameState = new GameState();
```

**Usage:**
```javascript
// Subscribe to character HP changes
gameState.subscribe('character.hp', (hp) => {
  updateHPDisplay(hp);
});

// Update HP
gameState.update('character.hp.current', newHP);
```

**Rationale:**
1. **Centralized:** All state in one place
2. **Reactive:** UI updates automatically
3. **Simple:** No heavy framework
4. **Debuggable:** Can log all state changes
5. **Serializable:** Easy to save/load

---

## Summary of Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Technology Stack** | Vanilla JS + Canvas | Speed, simplicity, performance |
| **Data Storage** | LocalStorage + JSON | Simple, sufficient, offline |
| **RNG** | Mulberry32 seeded PRNG | Fast, deterministic, small |
| **World Gen** | Chunk-based + Simplex Noise | Performant, coherent, infinite |
| **Rendering** | Canvas (game) + DOM (UI) | Fast, flexible, hybrid approach |
| **Combat** | Turn-based grid with action queue | Authentic D&D 5e, tactical |
| **Rules Engine** | Centralized config object | Modifiable, maintainable |
| **Character Model** | Unified class for PC/NPC | Code reuse, consistency |
| **Quest System** | Template-based generation | Variety, quality, maintainable |
| **State Management** | Centralized store + observers | Reactive, debuggable, simple |

---

## Next Steps
1. Review and approve architectural decisions
2. Set up project structure based on these decisions
3. Begin Phase 1 implementation
4. Iterate and refine as needed

---

**Document Status:** Proposed - Awaiting Review
**Last Updated:** 2025-12-09
