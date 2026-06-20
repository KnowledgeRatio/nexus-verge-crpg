# Nexus Verge
## Procedural D&D 5e Roguelike CRPG

A procedurally generated, top-down roguelike CRPG built on D&D 5e 2024 SRD rules. Explore infinite worlds with shareable seeds, engage in turn-based tactical combat, and experience deep character progression across levels 1–10.

---

## 🎮 Core Features

### Procedural Generation
- **Shareable Seeds:** Generate and share unique worlds
- **Infinite Exploration:** Regions generate on demand, 18+ coherent biome types with climate-coherent terrain
- **Persistent World:** Return to previously explored areas exactly as you left them
- **Dynamic Settlements:** Villages, towns, and cities with procedural NPCs, merchants, and quest givers

### D&D 5e 2024 Rules
- **Authentic Implementation:** Combat, skills, and progression follow SRD 5.2.1 rules
- **3 Callings:** Custom fusion classes compressing D&D archetypes to levels 1–10
  - **Dedication** (martial): STR + CON build. Focus resource (CON-based, recharges on short rest)
  - **Scholar** (caster): INT + CON build. Mana pool (recharges on long rest) + Arcane Recovery
  - **Wanderlust** (hybrid): DEX + CHA build. Mana pool (recharges on long rest)
- **Specializations** branch at level 3; capstone at level 10
- **5 Cultures:** Human, Elf, Dwarf, Halfling, Dragonborn
- **13-Skill System:** Streamlined from the standard 18 D&D 5e skills
- **8 Weapon Masteries:** All official 2024 masteries implemented
- **Data-Driven Rules Engine:** All balance values in `src/core/rulesEngine.js`

### Turn-Based Tactical Combat
- **D&D Initiative:** d20 + DEX modifier; individual initiative per combatant
- **Action Economy:** Action, Bonus Action, Reaction — no movement grid
- **8 Weapon Masteries fully implemented:**
  - Cleave, Graze, Nick, Push, Sap, Slow (→ –1 AC substitute), Topple, Vex
- **Two-Weapon Fighting:** Dual-wield light weapons with off-hand bonus action
- **Conditions System:** Object-based conditions with typed durations (rounds, combat, turn-end, permanent)
- **Flee Mechanic:** d20 + max(DEX, WIS) + prof vs dynamic DC (base 10, +2 per engaged enemy)
- **Floating Combat Text:** Damage, crits, heals, conditions over combatant cards
- **Ranged Enemies:** Distinct AI behaviour with `preferRanged` flag; 5 ranged monster types
- **Void Creatures:** Void enemy type with turn-damage aura

### Rich Non-Combat Gameplay
- **Skill Challenges:** Sequential, choice-based, and contested checks with terrain modifiers
- **Social Encounters:** Multi-turn NPC conversations with tension meter; combat triggers at threshold
- **Dungeon System:** Procedurally generated dungeons with dedicated DungeonManager
- **NPC Relations:** Relationship scoring system per NPC
- **Rest System:** Short rests (hit dice recovery, 2/long rest) and long rests (full HP, tavern/sanctuary required)
- **Fatigue System:** FatigueManager tracking exhaustion over time

### Economy & Quests
- **Trading:** Buy/sell with gold; CHA-modified pricing (1% per modifier point)
- **Settlement Tiers:** Villages (common) → Towns (uncommon) → Cities (rare/magical)
- **Campaign Quests:** 4-stage main storyline (Monster Threat → Ancient Corruption → Enemy Stronghold → BBEG)
- **Side Quests:** Kill, retrieve, deliver, explore, and skill challenge types
- **Quest Tracking:** Objectives with progress bars, XP/gold/item rewards

### Audio
- **AudioManager:** Pooled audio (3 instances/sound), three-tier volume (master/sfx/music)
- **Combat Sounds:** Melee/ranged × hit/miss/critical, floating text integration
- **13 Audio Assets** by Thomas Devlin ([tommusic.itch.io](https://tommusic.itch.io/))

---

## 🚀 Getting Started

### Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No installation needed — runs 100% in browser
- Works offline after initial load

### How to Run
```bash
git clone <repository-url>
cd nexus-verge-crpg-5e

# Open index.html directly, or use a local server:
python -m http.server 8000
# Then visit http://localhost:8000
```

### Quick Start
1. **New Game:** Enter a seed (or generate random), select map size and difficulty
2. **Create Character:** Choose culture, background, calling; assign ability scores (Point Buy or Standard Array); select skills and weapon masteries
3. **Explore:** WASD / arrow keys to move
4. **Combat:** Encounters trigger automatically (1% base chance per move, terrain-modified)
5. **Settlements:** Press E near settlement tiles to enter, trade, rest, and accept quests
6. **Rest:** Press R for rest menu (short rests anywhere; long rests in taverns/sanctuaries)
7. **Help:** Press H for full in-game manual
8. **Save:** Press ESC (5 save slots)

---

## 🎯 Controls

### Exploration
| Key | Action |
|---|---|
| WASD / Arrow Keys | Move |
| I | Inventory |
| C | Character sheet |
| Q | Quest log |
| R | Rest menu |
| E | Enter settlement |
| H | Help manual |
| +/− | Zoom in/out |
| ESC | Save menu |

### Combat
- Click buttons to select action (Attack, Attack Off-Hand, End Turn, Flee)
- Click an enemy card to target
- Initiative order displayed in turn tracker

---

## 🗺️ Development Roadmap

### ✅ Phase 1 — Vertical Slice (Complete)
- [x] Procedural world generation with seeds (18+ terrain types, climate-coherent biomes)
- [x] Character creation (3 Callings, Point Buy + Standard Array)
- [x] Exploration with fog of war persistence
- [x] Turn-based combat with initiative system
- [x] XP and leveling (1–10 framework)
- [x] Equipment system with proficiency checks
- [x] Save/Load system (5 slots)

### ✅ Phase 2 — Core Systems (Complete)
- [x] 3 Callings with unique features (Dedication, Scholar, Wanderlust)
- [x] 5 Cultures (Human, Elf, Dwarf, Halfling, Dragonborn)
- [x] 13-skill system
- [x] 8 Weapon masteries fully implemented in combat
- [x] Two-weapon fighting
- [x] Rest system (hit dice / long rest)
- [x] Settlement system with procedural NPCs
- [x] Trading with CHA-modified pricing
- [x] Quest system (campaign + side quests)
- [x] Conditions system (typed durations)
- [x] AudioManager (pooled audio, three-tier volume)
- [x] Floating combat text

### 🚧 Phase 3 — Combat & Content Expansion (In Progress)
- [x] Ranged enemy AI (`preferRanged` flag, 5 ranged monsters)
- [x] Terrain movement costs + encounter rate accumulator
- [x] Flee mechanic redesign (DEX/WIS + prof vs dynamic DC)
- [x] Biome generation fixes (inland beaches, climate coherence, hydrology)
- [x] Skill challenges with terrain modifiers
- [x] Social encounter system (multi-turn NPC conversations, tension meter)
- [x] Campaign content filtering system (`campaignIds`)
- [x] Tile graphics + 4-level zoom system
- [x] Dungeon system (DungeonGenerator + DungeonManager)
- [x] NPC Relations system (RelationManager)
- [x] Void creatures + turn-damage aura
- [x] ConsequenceManager + effect dispatcher
- [x] FatigueManager
- [ ] Calling abilities fully implemented (Action Surge, Rage, Arcane Recovery, etc.)
- [ ] Spell casting system (cantrips + levels 1–5, Mana pool UI)
- [ ] Levelling 6–10 + specialization branches

### 📋 Phase 4 — Party & Polish (Next)
- [ ] Companion/party system (design locked — up to 3 companions, BG3-style direct control, permanent death, relationship scoring)
- [ ] Advanced skill challenges and NPC dialogue trees
- [ ] Faction reputation
- [ ] Loot system overhaul
- [ ] Visual polish and animations
- [ ] Music tracks

---

## 🏗️ Project Structure

```
nexus-verge-crpg-5e/
├── index.html              # Main entry point
├── styles.css              # Global styles
├── src/
│   ├── main.js             # App entry, UI wiring
│   ├── core/               # rulesEngine.js, gameState.js
│   ├── systems/            # Game systems (see below)
│   ├── rendering/          # Canvas renderer
│   ├── ui/                 # UI components
│   └── utils/              # Helpers, campaignFilter.js
├── data/                   # JSON game data (single source of truth)
│   ├── callings.json
│   ├── cultures.json
│   ├── items.json / magicItems.json
│   ├── monsters.json
│   ├── spells.json
│   ├── weaponMasteries.json
│   ├── skillChallenges.json
│   ├── terrains.json
│   ├── campaigns.json
│   └── ...
├── legal/                  # SRD attribution, SBOM, third-party notices
└── docs/                   # Architecture, PRD, changelog, plans
```

**Key systems (`src/systems/`):** `CombatManager`, `WorldGenerator`, `QuestManager`, `QuestGenerator`, `SettlementManager`, `NPCGenerator`, `MerchantManager`, `LootManager`, `AudioManager`, `SkillChallengeManager`, `DialogueManager`, `RelationManager`, `CompanionManager`, `DungeonGenerator`, `DungeonManager`, `EffectDispatcher`, `ConsequenceManager`, `FatigueManager`, `PassiveModifierRegistry`, `LevelUpManager`, `RestManager`, `SaveManager`, `Player`, `Character`, `EncounterBuilder`

---

## 🛠️ Technical Stack

- **Frontend:** Vanilla JavaScript (ES6 modules), no framework
- **Rendering:** HTML5 Canvas (game view) + DOM (UI)
- **Storage:** LocalStorage (saves), JSON (game data)
- **Architecture:** 100% client-side, no backend
- **RNG:** Mulberry32 seeded PRNG for deterministic world generation; `Math.random()` for live combat rolls (prevents save-scumming)
- **World Gen:** Simplex noise with latitude/elevation-based climate coherence
- **State:** Observer pattern via `gameState.subscribe()` / `gameState.set()`

---

## 📚 Documentation

| Doc | Purpose |
|---|---|
| [PRD](docs/PRD.md) | Product requirements and design pillars |
| [Architecture](docs/ARCHITECTURE.md) | ADRs, system design, known gaps |
| [Changelog](docs/CHANGELOG.md) | Session-by-session history |
| [plans/](docs/plans/) | Design jam notes and implementation plans |
| [legal/](legal/) | SRD attribution, asset credits, SBOM |

---

## 📜 License & Legal

**Nexus Verge** is licensed under the **MIT License** — see [LICENSE](LICENSE).

This project uses content from the **System Reference Document 5.2** (SRD 5.2) by Wizards of the Coast LLC, licensed under **CC BY 4.0**.

Full attribution: [legal/SRD_ATTRIBUTION.md](legal/SRD_ATTRIBUTION.md)

*Wizards of the Coast, Dungeons & Dragons, D&D, and their respective logos are trademarks of Wizards of the Coast LLC. © Wizards of the Coast LLC.*

**Third-party notices:** [legal/THIRD_PARTY_NOTICES.md](legal/THIRD_PARTY_NOTICES.md)  
**Asset attributions:** [legal/ASSET_ATTRIBUTIONS.md](legal/ASSET_ATTRIBUTIONS.md)  
**SBOM:** [legal/sbom/](legal/sbom/)

```bash
npm run legal:verify    # check compliance
npm run legal:generate  # regenerate legal artifacts
```

---

## 🌟 Project Status

**Phase:** 3 — Combat & Content Expansion (in progress)  
**Branch:** `main-beta-quests`  
**Last Updated:** 2026-06-20  
**Playable:** Yes — core gameplay loop functional  
**Production Ready:** No (alpha)

---

**Made for D&D fans and roguelike enthusiasts**
