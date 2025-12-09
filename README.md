# Nexus Verge
## Procedural D&D 5e Roguelike CRPG

A procedurally generated, top-down roguelike CRPG that faithfully implements D&D 5e 2024 rules with a unique reputation-based economy. Explore infinite worlds with shareable seeds, engage in turn-based tactical combat, and experience deep character progression.

---

## 🎮 Core Features

### Procedural Generation
- **Shareable Seeds:** Generate and share unique worlds with friends (like Minecraft)
- **Infinite Exploration:** Regions generate as you explore, with coherent biome clustering
- **Persistent World:** Return to previously explored areas exactly as you left them
- **Dynamic Content:** Quest-driven changes affect towns and NPCs

### D&D 5e 2024 Rules
- **Authentic Implementation:** Combat, skills, spells, and progression follow official rules
- **5 Core Classes:** Fighter, Wizard, Cleric, Rogue, Ranger (more coming)
- **5 Races:** Human, Elf, Dwarf, Halfling, Dragonborn
- **Full Skill System:** All 18 D&D skills with meaningful checks
- **Spell System:** 20+ spells (cantrips through level 2) with proper spellcasting mechanics
- **Modifiable Rules:** Easy-to-edit rules engine for balance and homebrew content

### Unique Reputation Economy
- **No Gold Currency:** Earn reputation with factions instead
- **Unlock Items:** Access better equipment by completing faction quests
- **Faction Relationships:** Your choices affect standing with different groups
- **Meaningful Choices:** Supporting one faction may harm relationships with others

### Turn-Based Tactical Combat
- **D&D Initiative:** Roll for turn order, strict 5e rules
- **Action Economy:** Action, Bonus Action, Movement, Reaction
- **Positioning Matters:** Grid-based combat with cover and terrain effects
- **Full Combat Actions:** Dodge, Disengage, Dash, Help, Hide, Ready, and more

### Character Progression
- **Levels 1-5 (MVP):** Full progression with class features
- **Point Buy or Standard Array:** Choose your ability score method
- **Background System:** Flavor your character's history
- **Spell Progression:** Spellcasters gain new slots and spells as they level

### Quest System
- **Procedurally Generated:** Infinite variety of quests from templates
- **Campaign Objectives:** Choose your main goal at game start
- **Multiple Quest Types:** Combat, retrieval, delivery, investigation, social
- **Consequence-Driven:** Quest outcomes affect the world and factions

### Rich Non-Combat Gameplay
- **All Skills Matter:** Persuasion, Stealth, Perception, Investigation, and more
- **Social Encounters:** Talk your way through problems
- **Exploration:** Discover hidden caches, avoid traps, overcome obstacles
- **Rest System:** Short rests (2x per long rest) and long rests (tavern required)

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
2. **Create Character:** Choose race, class, background, and assign ability scores
3. **Explore:** Use WASD or arrow keys to move around the world
4. **Combat:** Enter turn-based combat when encountering enemies
5. **Quest:** Visit towns to find quest givers and advance your story
6. **Save:** Save your progress at any time (outside of combat)

---

## 🎯 Controls

### Exploration
- **WASD / Arrow Keys:** Move character
- **I:** Open inventory
- **C:** Open character sheet
- **Q:** Open quest log
- **M:** Open map
- **R:** Rest (short or long)
- **Space:** Interact with NPCs/objects
- **ESC:** Close menus / Cancel action

### Combat
- **Click:** Select tile / target
- **1-9:** Quick action buttons
- **Space:** Confirm action
- **ESC:** Cancel action
- **Enter:** End turn

### System
- **H:** Help screen
- **F1:** Save game
- **F9:** Load game

---

## 📚 Documentation

### For Players
- **[Game Rules](docs/GAME_RULES.md):** Complete gameplay guide (coming soon)
- **[FAQ](docs/FAQ.md):** Common questions (coming soon)

### For Developers
- **[PRD](docs/PRD.md):** Product Requirements Document with full feature specification
- **[Architecture](docs/ARCHITECTURE.md):** Technical decisions and system architecture
- **[Project Plan](docs/PROJECT_PLAN.md):** Day-by-day development timeline
- **[Data Schema](docs/DATA_SCHEMA.md):** Complete data structure reference

### For Modders
- **[Modding Guide](docs/MODDING.md):** How to add custom content (coming soon)
- **Data Files:** All content in `/data/` as JSON (easy to edit)
- **Rules Engine:** Modify game balance in `src/core/rulesEngine.js`

---

## 🗺️ Development Roadmap

### ✅ Phase 1: Playable Vertical Slice (Days 1-2)
- [x] Procedural world generation with seeds
- [x] Character creation (Fighter class, Standard Array)
- [x] Exploration with fog of war
- [x] 1v1 turn-based combat
- [x] XP and leveling (1-3)
- [x] Basic loot system
- [x] Save/Load system

### 🚧 Phase 2: MVP (Days 3-7) - IN PROGRESS
- [ ] 5 classes with full features
- [ ] Point Buy system
- [ ] Quest system (campaign + side quests)
- [ ] Reputation and faction system
- [ ] All 18 skills with checks
- [ ] Spell system (20+ spells)
- [ ] Rest system (short/long)
- [ ] Advanced combat (full action economy)
- [ ] 25+ monsters (CR 0-5)

### 📋 Phase 3: Content Expansion (Future)
- [ ] All 13 D&D 5e classes
- [ ] Subclass system
- [ ] Levels 1-20
- [ ] Full spell list (levels 0-9)
- [ ] 100+ monsters (CR 0-30)
- [ ] Party/companion system
- [ ] Crafting system
- [ ] Audio (sound effects, music)
- [ ] Visual enhancements
- [ ] Multiplayer/co-op

---

## 🏗️ Project Structure

```
nexus-verge-crpg-5e/
├── index.html              # Main entry point
├── styles.css              # Global styles
├── README.md              # This file
├── docs/                  # Documentation
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── PROJECT_PLAN.md
│   └── DATA_SCHEMA.md
├── src/                   # Source code
│   ├── main.js           # Application entry
│   ├── core/             # Core engine
│   ├── systems/          # Game systems
│   ├── rendering/        # Rendering layer
│   ├── ui/               # UI components
│   └── utils/            # Utilities
├── data/                 # Game data (JSON)
│   ├── classes.json
│   ├── races.json
│   ├── spells.json
│   ├── items.json
│   ├── monsters.json
│   └── ...
└── assets/               # Future: images, sounds
```

---

## 🛠️ Technical Stack

- **Frontend:** Vanilla JavaScript (ES6 modules)
- **Rendering:** HTML5 Canvas for game view, DOM for UI
- **Storage:** LocalStorage (save files), JSON (game data)
- **Architecture:** 100% client-side, no backend required
- **RNG:** Mulberry32 seeded PRNG for deterministic generation
- **World Gen:** Simplex noise for coherent terrain
- **Bundle Size:** <500KB (lightweight and fast)

---

## 🎲 Game Systems Overview

### Character Creation
- Choose from 5 races and 5 classes
- Assign ability scores (Point Buy or Standard Array)
- Select background for flavor and skills
- Full D&D 5e character sheet

### Combat System
- Turn-based with initiative (d20 + DEX modifier)
- Grid-based positioning (10x10 minimum)
- Full action economy (Action, Bonus, Movement, Reaction)
- Attack rolls vs AC, damage rolls with modifiers
- Status conditions and tactical options

### Skill System
- All 18 D&D 5e skills implemented
- Proficiency and expertise support
- Advantage/disadvantage system
- Passive scores for automatic checks

### Spell System
- Spell slots by class and level
- Prepared vs known spells (class dependent)
- Spell attacks and saving throws
- Concentration tracking
- Cantrips scale with level

### Reputation System
- 5 reputation levels per faction (Stranger → Exalted)
- Complete quests to earn reputation
- Unlock items at merchants based on reputation
- Faction relationships affect gameplay

### World Generation
- Seed-based deterministic generation
- Chunk/region system (32x32 tiles)
- Coherent biome clustering (Simplex noise)
- Towns, settlements, dungeons procedurally placed
- NPCs with roles and personalities

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

## 📧 Contact

For questions, feedback, or support:
- **GitHub Issues:** [Report bugs or suggest features]
- **Project Lead:** KnowledgeRatio

---

## 🌟 Project Status

**Current Phase:** Phase 1 Complete → Phase 2 In Progress
**Version:** 0.1.0-alpha
**Last Updated:** 2025-12-09

**Playable:** Yes (vertical slice)
**MVP Complete:** In progress (Day 3 of 7)
**Production Ready:** No

---

## 🎮 Play Now

The game is currently in active development. A playable vertical slice is available:
- Character creation (Fighter class)
- Exploration with procedural generation
- Turn-based combat (1v1)
- Leveling system (1-3)
- Save/Load functionality

**Coming Soon:**
- More classes and spells
- Quest system
- Faction reputation
- Full skill checks

---

**Made with ❤️ for D&D fans and roguelike enthusiasts**
