# Nexus Verge
## Procedural D&D 5e Roguelike CRPG

A procedurally generated, top-down roguelike CRPG that faithfully implements D&D 5e 2024 rules. Explore infinite worlds with shareable seeds, engage in turn-based tactical combat, and experience deep character progression with unique class fusion system.

---

## 🎮 Core Features

### Procedural Generation
- **Shareable Seeds:** Generate and share unique worlds with friends (like Minecraft)
- **Infinite Exploration:** Regions generate as you explore, with 18 coherent biome types
- **Persistent World:** Return to previously explored areas exactly as you left them
- **Dynamic Settlements:** Villages, towns, and cities with procedural NPCs and merchants

### D&D 5e 2024 Rules
- **Authentic Implementation:** Combat, skills, and progression follow official rules
- **7 Unique Callings:** Fusion classes combining traditional D&D archetypes
  - **Dedication** (Fighter + Monk): Martial mastery with stamina techniques
  - **Scholar** (Wizard + Artificer): Arcane intellect with magical invention
  - **Pact** (Cleric + Warlock): Divine power meets eldritch might
  - **Wanderlust** (Rogue + Bard): Ultimate skill monkey with charm
  - **Bond** (Ranger + Druid): Nature warrior with wild shape
  - **Oath** (Paladin + Blood Hunter): Sacred oaths with blood magic
  - **Instinct** (Barbarian + Sorcerer): Primal rage meets innate magic
- **5 Cultures:** Human, Elf, Dwarf, Halfling, Dragonborn
- **Streamlined Skills:** 13-skill system (merged from 18 D&D skills for focused gameplay)
- **Weapon Masteries:** 8 mastery types with unique combat techniques
- **Modifiable Rules:** Data-driven design for easy homebrew content

### Gold-Based Trading Economy
- **Traditional Currency:** Buy and sell items with gold pieces
- **CHA-Modified Pricing:** Higher Charisma = better prices (1% per modifier point)
- **Merchant Inventories:** Procedurally generated stock based on settlement tier
- **Settlement Tiers:** Villages (common items) → Towns (uncommon) → Cities (rare/magical)

### Turn-Based Tactical Combat
- **D&D Initiative:** Roll for turn order with DEX modifier, ties broken by DEX score
- **Action Economy:** Action, Bonus Action, Reaction (no grid-based movement)
- **Weapon Masteries:** Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex
- **Two-Weapon Fighting:** Dual-wield light weapons with off-hand attacks
- **Simplified Combat:** No grid positioning, focus on action economy and tactics

### Character Progression
- **Levels 1-5 (Current):** Full progression with calling features
- **Point Buy or Standard Array:** Choose your ability score method
- **Background System:** Soldier, Acolyte, Criminal, Sage, Folk Hero
- **Weapon Mastery Choices:** Select masteries based on your calling
- **Spell Progression:** 5 of 7 callings have spellcasting (varying start levels)

### Quest System
- **Procedurally Generated:** Infinite variety of quests from templates
- **Campaign Quests:** 4-stage main storyline (Monster Threat → Ancient Corruption → Enemy Stronghold → BBEG)
- **Side Quests:** Kill, retrieve, deliver, explore, and skill challenge quests
- **Quest Tracking:** Quest log with objectives, progress bars, and rewards
- **NPC Quest Givers:** Settlement NPCs offer quests based on their roles

### Rich Non-Combat Gameplay
- **13 Skills:** Athletics, Acrobatics, Sleight of Hand, Endurance, Academia, Arcana, Investigation, Perception, Cunning, Creativity, Empathy, Influence, Deception
- **Skill Challenges:** Sequential, choice-based, and contested skill checks
- **Social Encounters:** Dialogue with NPCs, quest acceptance/turn-in
- **Rest System:** Short rests (roll all hit dice, 2 per long rest) and long rests (full HP, requires tavern/sanctuary)
- **Trading:** Buy/sell items with CHA-modified pricing

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
2. **Create Character:**
   - Choose culture (race), background, calling (class)
   - Assign ability scores (Point Buy or Standard Array)
   - Select skills and weapon masteries
3. **Explore:** Use WASD or arrow keys to move around the world
4. **Combat:** Random encounters trigger turn-based combat (8% base chance per move)
5. **Settlements:** Press E near settlements to enter, trade, rest, and accept quests
6. **Rest:** Press R to rest (short rests anywhere, long rests in taverns/sanctuaries)
7. **Save:** Press ESC to save your progress (5 save slots available)

---

## 🎯 Controls

### Exploration
- **WASD / Arrow Keys:** Move character
- **I:** Open inventory
- **C:** Open character sheet
- **Q:** Open quest log
- **R:** Open rest menu (short/long rest)
- **E:** Enter settlement (when near settlement tiles)
- **ESC:** Save menu (5 save slots)

### Combat
- **Click Buttons:** Select action (Attack, Attack Off-Hand, End Turn, Flee)
- **Click Enemy Card:** Target enemy for attack
- **Auto-Targeting:** Enemies targeted by clicking their combat cards
- Combat is turn-based with initiative order displayed

### Settlement UI
- **Click NPCs:** Open dialogue and view quests
- **Trading:** Buy/sell items with merchants and blacksmiths
- **Quest Turn-In:** Return to quest giver NPCs to complete quests
- **Rest:** Long rests available in taverns

### System
- **ESC:** Save menu (during exploration)
- **Load Game:** Main menu → Load Game → Select save slot

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

### ✅ Phase 1: Playable Vertical Slice (Complete)
- [x] Procedural world generation with seeds (18 terrain types)
- [x] Character creation (7 Callings, Point Buy + Standard Array)
- [x] Exploration with fog of war persistence
- [x] Turn-based combat with initiative system
- [x] XP and leveling (1-5)
- [x] Equipment system with proficiency checks
- [x] Save/Load system (5 slots, metadata, playtime tracking)

### ✅ Phase 2: Core Systems (Complete)
- [x] 7 Callings with unique features (Dedication, Scholar, Pact, Wanderlust, Bond, Oath, Instinct)
- [x] 5 Cultures (Human, Elf, Dwarf, Halfling, Dragonborn)
- [x] 13-skill system (streamlined from 18 D&D skills)
- [x] Weapon mastery system (8 masteries: Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex)
- [x] Two-weapon fighting mechanics
- [x] Rest system (short rests with hit dice, long rests in taverns/sanctuaries)
- [x] Settlement system (villages, towns, cities with NPCs)
- [x] Trading system (buy/sell with CHA-modified pricing)
- [x] Quest system (campaign + side quests, tracking, turn-in)

### 🚧 Phase 3: Combat & Abilities (IN PROGRESS)
- [x] Weapon masteries - All 8 masteries fully implemented (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex)
- [ ] Class abilities (Action Surge, Rage, Bardic Inspiration, Wild Shape, etc.)
- [ ] Spell system (cantrips + levels 1-2, casting UI)
- [ ] Resource systems (Stamina, Sorcery Points, Pact Magic)

### 📋 Phase 4: Content Expansion (Future)
- [ ] Calling subpaths (specializations for each calling)
- [ ] Levels 6-10 progression
- [ ] Additional spell levels (3-5)
- [ ] 50+ monsters (expanded CR range)
- [ ] Loot system with combat drops
- [ ] Faction reputation system
- [ ] Advanced skill challenges
- [ ] Audio (sound effects, music)
- [ ] Visual polish and animations
- [ ] Party/companion system (future consideration)

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
- Choose from 5 cultures (Human, Elf, Dwarf, Halfling, Dragonborn)
- Select 1 of 7 callings (Dedication, Scholar, Pact, Wanderlust, Bond, Oath, Instinct)
- Choose background (Soldier, Acolyte, Criminal, Sage, Folk Hero)
- Assign ability scores (Point Buy 27 points or Standard Array)
- Select skills (2-4 based on calling) and weapon masteries (1-3 based on calling)
- Full D&D 5e character sheet with equipment, spells, and features

### Combat System
- Turn-based with initiative (d20 + DEX modifier, ties broken by DEX score)
- Simplified non-grid combat (focus on action economy)
- Action economy: Action, Bonus Action, Reaction (no movement tracking)
- Attack rolls (d20 + mods vs AC), damage rolls with weapon dice + modifiers
- **8 Weapon Masteries fully implemented:**
  - **Cleave:** Extra attack on adjacent enemy for ability modifier damage
  - **Graze:** Ability modifier damage even on a miss
  - **Nick:** Free off-hand light weapon attack as part of main attack action
  - **Push:** Prevents melee attacks next turn (Large or smaller creatures)
  - **Sap:** Target has disadvantage on next attack roll
  - **Slow:** Reduces AC by 1 until attacker's next turn
  - **Topple:** CON save or knocked prone (disadvantage on attacks, advantage for melee attackers)
  - **Vex:** Advantage on next attack vs same target
- Two-weapon fighting: Light weapons in both hands, off-hand uses bonus action
- Conditions system: Buffs/debuffs with duration tracking (combat, rounds, until turn)
- Flee mechanic: d20 + initiative vs DC 30

### Skill System
- 13 streamlined skills (merged from 18 D&D 5e skills)
- Skills by ability: STR (1), DEX (2), CON (1), INT (3), WIS (4), CHA (2)
- Proficiency (+2 to +3) and expertise (double proficiency)
- Skill challenges: Sequential stages, player choice, contested rolls
- Integrated with quest objectives

### Trading System
- Buy/sell items with gold pieces (traditional economy)
- CHA-modified pricing: 1% discount/markup per CHA modifier point
- Merchant inventories: Procedurally generated based on settlement tier
- Settlement tiers affect rarity: Villages (common), Towns (uncommon), Cities (rare/magical)

### Quest System
- Campaign quests: 4-stage main storyline (Monster Threat → Ancient Corruption → Enemy Stronghold → BBEG)
- Side quests: Kill, retrieve, deliver, explore, skill challenge types
- Quest tracking: Objectives with progress bars, rewards (XP/gold/items/reputation)
- NPC quest givers: Roles determine quest types (leaders/guards = combat, merchants = retrieval, etc.)

### World Generation
- Seed-based deterministic generation (shareable seeds)
- Chunk/region system (32x32 tiles, generated on-demand)
- 18 terrain types with Simplex noise (coherent biome clustering)
- Settlements: Villages, towns, cities with procedural NPCs
- Sanctuaries: Safe rest locations scattered across wilderness (2x as common as settlements)

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

**Current Phase:** Phase 2 Complete → Phase 3 In Progress
**Version:** 0.2.0-alpha
**Last Updated:** 2025-12-18

**Playable:** Yes (core systems complete)
**MVP Status:** Core gameplay loop functional
**Production Ready:** No (alpha stage)

---

## 🎮 Current Features

The game is in active development with a functional core gameplay loop:

**Character System:**
- 7 unique Callings with fusion class mechanics
- 5 Cultures with racial traits
- Point Buy + Standard Array ability score assignment
- Weapon mastery selection (8 mastery types)
- Full equipment system with proficiency checks

**World & Exploration:**
- Infinite procedural world with shareable seeds
- 18 terrain biomes with Simplex noise generation
- Settlement system (villages, towns, cities)
- Fog of war with exploration persistence
- Save/Load system (5 slots)

**Combat:**
- Turn-based initiative system
- All 8 weapon masteries fully implemented (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex)
- Two-weapon fighting mechanics
- Simplified action economy (no grid)
- Conditions system tracking buffs/debuffs

**Progression:**
- Quest system with campaign + side quests
- Trading with CHA-modified pricing
- Rest system (short rests with hit dice, long rests in taverns)
- Levels 1-5 progression

**Coming Soon (Phase 3):**
- Class abilities (Action Surge, Rage, Wild Shape, Bardic Inspiration, etc.)
- Spell casting system (cantrips + levels 1-2)
- Resource tracking (Stamina, Sorcery Points, Pact Magic, Ki, Rage uses)
- Advanced combat features (Reactions, Opportunity Attacks)

---

**Made with ❤️ for D&D fans and roguelike enthusiasts**
