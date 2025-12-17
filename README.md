# Nexus Verge
## Procedural D&D 5e Roguelike CRPG

A procedurally generated, top-down roguelike CRPG that faithfully implements D&D 5e 2024 rules. Explore infinite worlds with shareable seeds, engage in turn-based combat, complete quests, and build your character with authentic D&D mechanics.

---

## 🎮 Core Features

### Procedural Generation
- **Shareable Seeds:** Generate and share unique worlds with friends (like Minecraft)
- **18 Terrain Types:** Grassland, forest, mountains, desert, jungle, tundra, swamp, and more
- **Infinite Exploration:** Regions generate as you explore with coherent biome clustering
- **Persistent World:** Fog of war tracks explored areas, regions cache and restore
- **Settlements & Sanctuaries:** Villages, towns, and cities with NPCs and quests

### D&D 5e 2024 Rules
- **Authentic Implementation:** Combat, skills, progression follow official 5e SRD
- **5 Core Classes:** Fighter, Wizard, Cleric, Rogue, Ranger
- **5 Races:** Human, Elf, Dwarf, Halfling, Dragonborn
- **13-Skill System:** Streamlined from 18 D&D skills (modular and data-driven)
- **Equipment Proficiencies:** Weapon/armor restrictions based on class
- **Modifiable Rules:** Easy-to-edit rules engine for balance and homebrew

### Turn-Based Combat
- **D&D Initiative:** Roll d20 + DEX modifier with tiebreaker
- **Action Economy:** Action, Bonus Action, Reaction (no grid movement)
- **Attack Rolls:** d20 + modifiers vs AC, damage with critical hits
- **Flee Mechanic:** d20 + initiative vs DC 30 to escape combat
- **Simple AI:** Enemies automatically target and attack

### Character Progression
- **Point Buy or Standard Array:** Choose your ability score method
- **Background System:** 5 backgrounds with skills, equipment, and features
- **Equipment System:** Weapons, armor, shields with proficiency requirements
- **Stat Recalculation:** AC and attack bonuses update on equipment changes
- **Level 1-5:** Full XP progression with class features

### Quest System
- **Procedurally Generated:** Quests generated per settlement with templates
- **NPC Quest Givers:** NPCs in taverns, greathalls assign quests by role
- **Quest Types:** Kill, retrieve, deliver, explore, skill challenge
- **Real-Time Tracking:** Objectives update automatically during gameplay
- **Settlement Persistence:** NPCs and quests persist across region pruning

### Trading & Economy
- **CHA-Modified Pricing:** Charisma affects buy/sell prices (1% per modifier point)
- **Merchant Inventories:** Procedurally generated based on settlement tier
- **Buy/Sell System:** Full trading modal with tabs and quantity selection

### Rest System
- **Short Rests:** Roll all hit dice to heal (max 2 per long rest)
- **Long Rests:** Full HP/spell slot recovery (requires tavern or sanctuary)
- **Tavern Detection:** Automatic check for nearby settlements
- **Rest Modal:** Clean UI with character status and validation

### Save/Load System
- **5 Save Slots:** Complete game state serialization
- **LocalStorage:** No backend required, works offline
- **Metadata Display:** Character name, level, class, location, playtime
- **Playtime Tracking:** Automatic session time tracking

---

## 🚀 Getting Started

### Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No installation needed - runs 100% in browser
- Works offline after initial load

### How to Run
```bash
# Clone the repository
git clone <repository-url>
cd nexus-verge-crpg-5e

# Open index.html in your browser
# OR use a local server:
python -m http.server 8000
# Then visit http://localhost:8000
```

### Quick Start Guide
1. **New Game:** Enter a seed (or generate random), select map size and difficulty
2. **Create Character:** Choose race, class, background, assign ability scores
3. **Explore:** Use WASD or arrow keys to move around the procedural world
4. **Combat:** Engage in turn-based combat when encountering enemies
5. **Quest:** Visit settlements (towns/cities) to get quests from NPCs
6. **Trade:** Buy/sell equipment at merchants with CHA-modified pricing
7. **Rest:** Short rest anywhere safe, long rest at taverns/sanctuaries
8. **Save:** Press ESC to open save menu (5 slots available)

---

## 🎯 Controls

### Exploration
- **WASD / Arrow Keys:** Move character
- **E:** Enter settlement when adjacent
- **I:** Open inventory
- **C:** Open character sheet
- **Q:** Open quest log
- **R:** Rest menu (short/long rest options)
- **ESC:** Save menu / Close dialogs

### Combat
- **Click Action Button:** Select Attack/Ability/Spell/Flee
- **Click Enemy Card:** Target enemy for selected action
- **Auto Turn:** Enemy turns execute automatically

### System
- **ESC:** Save game menu (5 slots)
- **F5:** Refresh browser (reloads from gameState)

---

## 📚 Current Implementation Status

### ✅ Complete Systems

**World & Exploration:**
- ✅ Procedural world generation (18 terrain types, Simplex noise)
- ✅ Map rendering (80x40 viewport, ASCII tiles, camera follow)
- ✅ Fog of war (explored/visible tracking with persistence)
- ✅ Settlement generation (villages, towns, cities)
- ✅ Sanctuary generation (safe rest locations)
- ✅ Region caching and pruning (3-region radius)

**Character Systems:**
- ✅ Character creation (5 races, 5 classes, 5 backgrounds)
- ✅ Point Buy & Standard Array ability score systems
- ✅ Equipment system with proficiency validation
- ✅ Inventory management (equip/unequip/drop/use)
- ✅ Stat recalculation (AC, attack bonuses on equipment change)
- ✅ 13-skill system (streamlined from 18 D&D skills)

**Combat:**
- ✅ Turn-based combat (initiative, action economy)
- ✅ Attack rolls (d20 + modifiers vs AC)
- ✅ Damage rolls with critical hits (natural 20)
- ✅ Flee mechanic (d20 + initiative vs DC 30)
- ✅ Simple enemy AI (random targeting)
- ✅ XP rewards and leveling

**NPCs & Quests:**
- ✅ NPC generation (names, roles, personalities)
- ✅ Settlement system (buildings, NPCs, dialogue)
- ✅ Quest generation (templates, procedural content)
- ✅ Quest assignment to NPCs by role
- ✅ Quest tracking (objectives, progress)
- ✅ Quest UI (quest log, notifications)

**Trading:**
- ✅ Merchant inventory generation (settlement-tier based)
- ✅ CHA-modified pricing (1% per modifier)
- ✅ Buy/sell system with full UI

**Progression:**
- ✅ Rest system (short/long rests, D&D 5e rules)
- ✅ Save/load system (5 slots, metadata, playtime)
- ✅ Settlement persistence across region pruning

### 🔄 In Progress

- 🔄 Quest turn-in testing (mechanics implemented, needs verification)
- 🔄 Skill challenge system (Phase 5.7 - templates ready, mechanics pending)

### ❌ Not Yet Implemented

- ❌ Loot system (combat drops, treasure tables)
- ❌ Spell system (cantrips + levels 1-2, casting UI)
- ❌ Class abilities (Action Surge, Rage, Sneak Attack, etc.)
- ❌ Faction reputation system
- ❌ Advanced combat (reactions, opportunity attacks)
- ❌ Party/companion system
- ❌ Crafting system
- ❌ Audio (sound effects, music)

---

## 🗺️ Development Roadmap

### ✅ Phase 1: Playable Vertical Slice (COMPLETE)
- [x] Procedural world generation with seeds
- [x] Character creation (5 classes, Point Buy/Standard Array)
- [x] Exploration with fog of war
- [x] Turn-based combat
- [x] XP and leveling
- [x] Save/Load system

### 🚧 Phase 2: MVP (IN PROGRESS - 85% Complete)
- [x] 5 classes with proficiencies
- [x] Equipment system with proficiency validation
- [x] Quest system (generation, tracking, NPC integration)
- [x] Trading system (CHA-modified pricing)
- [x] Rest system (short/long rests)
- [x] Settlement & NPC system
- [x] 13-skill system (streamlined)
- [ ] Loot system with D&D 5e SRD compliance
- [ ] Spell system (20+ spells, cantrips-level 2)
- [ ] Class abilities (Action Surge, Rage, etc.)
- [ ] Skill challenge mechanics
- [ ] Faction reputation system

### 📋 Phase 3: Content Expansion (Future)
- [ ] All 13 D&D 5e classes
- [ ] Subclass system
- [ ] Levels 6-10 progression
- [ ] Full spell list (levels 3-5)
- [ ] 100+ monsters (CR 0-10)
- [ ] Party/companion system
- [ ] Crafting system
- [ ] Audio and visual polish

---

## 🏗️ Project Structure

```
nexus-verge-crpg-5e/
├── index.html              # Main entry point
├── styles.css              # Global styles
├── README.md              # This file
├── CLAUDE.md              # Developer guide
├── docs/                  # Documentation
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── PROJECT_PLAN.md
│   └── DATA_SCHEMA.md
├── src/                   # Source code
│   ├── main.js           # Application entry
│   ├── core/             # Core engine
│   │   ├── GameState.js
│   │   └── rulesEngine.js
│   ├── systems/          # Game systems
│   │   ├── Character.js
│   │   ├── WorldGenerator.js
│   │   ├── CombatManager.js
│   │   ├── QuestManager.js
│   │   ├── SettlementManager.js
│   │   ├── NPCGenerator.js
│   │   ├── RestManager.js
│   │   └── SaveManager.js
│   ├── rendering/        # Rendering
│   │   └── MapRenderer.js
│   ├── ui/               # UI components
│   │   ├── CharacterCreation.js
│   │   └── SettlementUI.js
│   └── utils/            # Utilities
│       ├── rng.js
│       ├── dice.js
│       └── simplexNoise.js
└── data/                 # Game data (JSON)
    ├── classes.json
    ├── races.json
    ├── backgrounds.json
    ├── skills.json
    ├── items.json
    ├── monsters.json
    ├── terrains.json
    ├── quests.json
    ├── skillChallenges.json
    └── merchantInventory.json
```

---

## 🛠️ Technical Stack

- **Frontend:** Vanilla JavaScript (ES6 modules)
- **Rendering:** HTML5 Canvas (game view) + DOM (UI overlays)
- **Storage:** LocalStorage (save files), JSON (game data)
- **Architecture:** 100% client-side, no backend required
- **RNG:** Mulberry32 seeded PRNG for deterministic generation
- **World Gen:** Simplex noise for coherent terrain clustering
- **State Management:** Custom GameState with observer pattern
- **Bundle Size:** ~200KB base + ~100KB data files

---

## 🎲 Key Game Systems

### Character Creation
- 5 races with unique traits and ability bonuses
- 5 classes with proficiencies and features
- Point Buy (27 points) or Standard Array (15,14,13,12,10,8)
- 5 backgrounds with skills, equipment, and features
- Full D&D 5e character sheet with all stats

### Combat System
- Initiative: d20 + DEX modifier (DEX score tiebreaker)
- Attack: d20 + ability mod + proficiency vs target AC
- Damage: weapon dice + ability mod (critical = double dice)
- Flee: d20 + initiative bonus vs DC 30
- Victory: XP reward based on CR, automatic looting (future)

### Equipment System
- Proficiency validation (weapons, armor, shields)
- Weapons: Can equip without proficiency (no bonus to hit)
- Armor/Shields: Cannot equip without proficiency
- Stat recalculation: AC and attack bonuses update automatically
- Character sheet displays current attack bonuses + damage

### Quest System
- **Generation:** 2-6 quests per settlement (tier-based)
- **Assignment:** NPCs get quests based on roles (leader, merchant, guard)
- **Types:** Kill (specific creature), retrieve, deliver, explore, skill
- **Tracking:** Real-time objective progress, automatic updates
- **Rewards:** XP, gold, items (formulas evaluate dynamically)

### Trading System
- **Pricing:** Base price × (1.0 - CHA effect) for buying
- **Selling:** (Base price × 0.5) × (1.0 + CHA effect)
- **CHA Effect:** 1% per CHA modifier point
- **Inventory:** Procedurally generated per settlement tier

### Rest System
- **Short Rest:** Roll all hit dice (level × d{hitDie} + CON) for healing
- **Hit Dice:** Don't deplete, always equal to character level
- **Short Rest Limit:** Max 2 per long rest
- **Long Rest:** Full HP, all spell slots, reset short rest counter
- **Long Rest Location:** Requires tavern (settlement) or sanctuary

---

## 📖 Documentation

### For Players
- **Quick Start:** See "Getting Started" above
- **Controls:** See "Controls" section
- **Current Features:** See "Implementation Status" section

### For Developers
- **[CLAUDE.md](CLAUDE.md):** Comprehensive developer guide with session notes
- **[PRD](docs/PRD.md):** Product Requirements Document
- **[Architecture](docs/ARCHITECTURE.md):** Technical decisions (ADR log)
- **[Data Schema](docs/DATA_SCHEMA.md):** Complete data structure reference

### For Modders
- **Data Files:** All content in `/data/` as JSON (easy to edit)
- **Rules Engine:** Modify game balance in [src/core/rulesEngine.js](src/core/rulesEngine.js)
- **Skill System:** Add/modify/remove skills in [data/skills.json](data/skills.json)
- **Quest Templates:** Add new quest types in [data/quests.json](data/quests.json)

---

## 🤝 Contributing

This is currently a solo project in active development. Contributions, bug reports, and feature suggestions are welcome!

### Reporting Bugs
- Check existing issues first
- Provide seed, save file, and steps to reproduce
- Include browser and OS information

### Suggesting Features
- Check the roadmap first
- Explain use case and benefit
- Consider D&D 5e rules compatibility

---

## 📜 License

MIT License - See LICENSE file for details

D&D 5e content used under the Open Game License (OGL) and System Reference Document (SRD).

---

## 🙏 Acknowledgments

- **Wizards of the Coast** for D&D 5e and the SRD
- **Roguelike community** for inspiration (NetHack, DCSS, ToME)
- **Procedural generation pioneers** (Perlin noise, simplex noise)

---

## 🌟 Project Status

**Current Phase:** Phase 2 MVP - 85% Complete
**Version:** 0.2.0-alpha
**Last Updated:** 2025-12-17

**Playable:** Yes (extensive features implemented)
**MVP Complete:** 85% (quest system, trading, rest, equipment all working)
**Production Ready:** No (still in active development)

---

## 🎮 What You Can Do Now

The game currently supports:
- ✅ Create D&D 5e characters (5 races, 5 classes, 5 backgrounds)
- ✅ Explore procedurally generated infinite worlds
- ✅ Engage in turn-based combat with D&D 5e rules
- ✅ Accept quests from NPCs in settlements
- ✅ Track quest objectives in real-time
- ✅ Trade with merchants (CHA-modified pricing)
- ✅ Equip weapons/armor with proficiency validation
- ✅ Take short/long rests following D&D 5e rules
- ✅ Save/load game across 5 slots

**Coming Soon:**
- Quest turn-in and reward distribution
- Skill challenge mechanics
- Loot drops from combat
- Spell casting system
- Class abilities (Action Surge, Rage, etc.)
- Faction reputation system

---

**Made with ❤️ for D&D fans and roguelike enthusiasts**
