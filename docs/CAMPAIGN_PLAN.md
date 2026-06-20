> **⚠️ NARRATIVE FLAG (2026-06-16):** This draft predates the world canon in `docs/world/` (`WORLD.md`, `CREATURES.md`). All Voidborn dialogue below — boss pre-combat/mid-battle/on-defeat lines, anything giving them menace, intent, or awareness of the player ("Mortal... you dare approach the rift?") — contradicts the established rule that Voidborn are written with zero emotional language; they are physics, not characters. Before this campaign is implemented, every Voidborn dialogue block here needs a worldbuilder rewrite pass against `docs/world/CREATURES.md`. The mechanical/architecture content (boss system, episode structure, data schemas) is unaffected.

Based on the exploration results and user requirements, design a comprehensive plan for the new campaign system. Focus on:

**User Requirements:**
1. **10-Episode Campaign Structure** - Expand from 4 to 10 quest episodes
2. **"Terrors of the Voidborn" Campaign** - First campaign MVP
   - Theme: Hero accidentally arrives in Nexus Verge dimension
   - Voidborn: Apex predator race harvesting organic life energy
   - Narrative: Hero discovers new dimension, must survive/understand Voidborn threat
3. **Campaign-Specific NPCs on World Map** - NPCs can spawn as encounters, not just in settlements
   - Example: Companion NPC appears near hero at start, initiates main questline
4. **Campaign-Specific Generation Variables:**
   - Monsters: Campaign-specific types, prevalence modifications
   - Terrains: Campaign-specific types, prevalence modifications
   - Items: Campaign-specific loot, drops near settlements/specific terrains
5. **Boss Encounters** - Special combat encounters with dialogue/setpieces
   - Appear on world map as features
   - Use existing combat engine but with special initialization
   - Can have pre-combat dialogue
6. **Campaign-Specific NPC Dialogue** - Generic NPCs have campaign-aware dialogue variations

**Design Tasks:**

**1. Campaign Data Architecture:**
- Design `data/campaigns.json` schema for 10-episode campaigns
- Each episode should include:
  - Narrative description
  - World generation modifiers (monster types, terrain prevalence, item drops)
  - Special encounter definitions (bosses, NPC encounters)
  - Location-specific objectives
  - Dialogue variations for generic NPCs
- Design how campaigns reference monsters/terrains/items without hardcoding

**2. "Terrors of the Voidborn" Episode 1 Design:**
- Write narrative for Episode 1
- Define starting NPC encounter (companion who helps hero)
- Design initial Voidborn enemy types (variants, CR levels)
- Define terrain modifications (if any)
- Design first boss encounter or major objective
- Write generic NPC dialogue variations for this campaign

**3. World Map NPC Encounter System:**
- Design how NPCs spawn on world map vs settlements
- NPC encounter spawn rules (location, frequency, persistence)
- How NPCs initiate dialogue when encountered
- How to differentiate between "encounter NPC" vs "settlement NPC"

**4. Boss Encounter System:**
- Design boss feature type for WorldGenerator
- Boss definition schema (stats, dialogue, location requirements)
- How bosses integrate with combat system
- Pre-combat dialogue system
- Boss spawn persistence (can't fight same boss twice)

**5. Campaign-Aware Generation Hooks:**
- Design how WorldGenerator checks campaignId during feature generation
- Monster spawn modifications per campaign/episode
- Terrain prevalence modifications
- Item drop table modifications
- Settlement composition changes

**6. Technical Implementation Plan:**
- List all new systems needed
- Identify which existing systems need modification
- Define data flow: campaignId → episode → generation modifiers
- Define save/load requirements for campaign state

**Deliverables:**
- Complete campaign.json schema with annotations
- Episode 1 "Terrors of the Voidborn" full specification
- Boss encounter system design
- World map NPC encounter system design
- Technical implementation checklist
- Migration plan from current 4-stage system

Be creative with the Voidborn narrative but keep it grounded in the technical constraints. Think about how to make this campaign feel distinct from side quests while using the same underlying systems.

Claude’s Plan
Campaign System Redesign: "Terrors of the Voidborn"
Executive Summary
This plan outlines a comprehensive redesign of Nexus Verge's campaign system, expanding from a linear 4-stage campaign to a rich 10-episode narrative experience. The first campaign, "Terrors of the Voidborn," will serve as the MVP, implementing Episodes 1-3 to prove all core concepts (world map NPCs, boss encounters, campaign-specific generation, dialogue systems, visual theming). MVP Scope (User Confirmed):
✅ Episodes 1-3 only (arrival, corrupted village, boss fight)
✅ Full dialogue system for bosses (pre-combat, mid-battle, post-defeat)
✅ Campaign-specific visual styling (purple/void theme)
✅ Full dialogue system for world map NPCs (Vex as recurring companion)
🔄 Episodes 4-10 designed but implemented later
Background: Current System Analysis
Current Campaign Implementation
4 linear stages: Monster Threat → Ancient Corruption → Enemy Stronghold → Defeat BBEG
Static progression: Same quests every playthrough
Campaign-agnostic world: campaignId stored but never used in generation
Settlement-only NPCs: No world map NPC encounters
No boss system: Stage 4 references bossId: "dark-sorcerer" but no spawn mechanism
Generic dialogue: NPCs don't acknowledge campaign context
Critical Gaps Identified
No campaign-specific feature generation in WorldGenerator
No support for world map NPC spawns (NPCs only in settlements)
No boss encounter mechanics or pre-combat dialogue
No location-specific encounter rules
No campaign-aware monster/terrain/item generation
No dialogue variations based on campaign progress
New Campaign Vision: "Terrors of the Voidborn"
Narrative Premise
The hero accidentally travels to Nexus Verge, one of infinite dimensions, while embarking on a new adventure. This dimension is being harvested by the Voidborn, an apex predator race that feeds on organic life energy. The hero must survive, understand the threat, and ultimately stop the Voidborn from consuming this world.
Design Pillars
Epic Setpiece Quests: Each episode is a major narrative beat (not simple fetch quests)
World Consequences: Campaign affects monster spawns, terrain, item availability
Narrative NPCs: Key characters appear on world map, not just in settlements
Boss Encounters: Special combat encounters with dialogue and unique mechanics
Dynamic World: Generic NPCs react to campaign progress in dialogue
10-Episode Campaign Structure
Episode 1: "Arrival in the Verge"
Narrative: Hero awakens in strange dimension, meets companion Vex
Objectives:
Encounter Vex (NPC) spawned 5 tiles north of player start
Defeat 3 Void Spawn (new enemy type)
Reach nearest settlement
World Modifications: 30% Voidborn creature prevalence
Rewards: 500 XP, Void Crystal Shard (key item)
Episode 2: "The Corrupted Village"
Narrative: First settlement is under attack, corruption spreading
Objectives:
Clear 5 Void Spawn from settlement vicinity
Talk to Village Elder about corruption
Investigate corrupted well (POI feature)
World Modifications: Void Spawn replace 50% of goblins
Rewards: 750 XP, Anti-Void Charm (protective item)
Episode 3: "Seal the Rift"
Narrative: First boss encounter - seal a dimensional rift
Objectives:
Find Void Rift (special terrain feature within 150 tiles)
Defeat Rift Guardian (Boss - CR 3)
Seal rift using Void Crystal Shard
World Modifications: Void Rifts appear (new terrain type, 5% prevalence)
Boss: Rift Guardian (pre-combat dialogue, phase-based fight)
Rewards: 1500 XP, Voidbane Dagger (+1 vs Voidborn)
Episode 4: "The Scholar's Discovery"
Narrative: Find scholar NPC who knows Voidborn origins
Objectives:
Locate Scholar Thaddeus (world map NPC, spawns near city)
Retrieve 3 Ancient Texts from dungeons
Return texts to scholar
World Modifications: Dungeons have +30% Voidborn spawn rate
Rewards: 2000 XP, Knowledge of Voidborn (unlock special dialogue options)
Episode 5: "Cleanse the Corruption"
Narrative: Environmental threat - corruption zones spreading
Objectives:
Purify 5 Corrupted Land tiles (new terrain feature)
Collect 10 Corruption Samples (item drops from Voidborn)
Deliver samples to settlement alchemist
World Modifications: Corrupted Land terrain (10% prevalence in some regions)
Rewards: 2500 XP, Purification Amulet (terrain cleansing item)
Episode 6: "Refugee Exodus"
Narrative: Escort refugees to safety, moral stakes
Objectives:
Find Refugee Camp (world map feature)
Defend camp from 3 waves of Void Hunters (CR 4)
Escort refugees to sanctuary
World Modifications: Void Hunters replace 30% of orcs
Rewards: 3000 XP, 500 faction reputation (all factions)
Episode 7: "Assault the Hive"
Narrative: Major offensive - attack Voidborn Hive
Objectives:
Locate Voidborn Hive (fortress feature within 400 tiles)
Defeat 10 Hive Guardians (CR 5)
Defeat Hive Queen (Boss - CR 7)
World Modifications: Hive terrain feature, 40% Voidborn prevalence
Boss: Hive Queen (multi-phase, summons minions)
Rewards: 4000 XP, Queen's Essence (crafting material), +1 Voidbane Weapon
Episode 8: "The Overmind Revealed"
Narrative: True threat revealed - Overmind Avatar boss
Objectives:
Follow Vex to Void Nexus (special POI)
Defeat Overmind Avatar (Boss - CR 9)
Discover Overmind's true location (The Void dimension)
Boss: Overmind Avatar (dialogue reveals final objective)
Rewards: 5000 XP, Void Lens (see hidden void rifts)
Episode 9: "Prepare for the End"
Narrative: Rally forces, gather artifacts, defend against siege
Objectives:
Collect 5 Void Anchors from bosses/dungeons
Defend settlement from Void Titan (Boss - CR 10) siege
Speak to all faction leaders (NPC dialogue quest)
World Modifications: Void Titans spawn (rare, CR 10), cities under siege
Boss: Void Titan (city defense scenario)
Rewards: 6000 XP, Void Key (unlock Episode 10)
Episode 10: "Into the Void"
Narrative: Final battle - enter The Void, defeat Overmind
Objectives:
Use Void Key to open portal at main settlement
Enter The Void (special combat zone)
Defeat the Overmind (Final Boss - CR 12)
World Modifications: The Void terrain (separate small region)
Boss: Overmind (multi-phase, dialogue at 75%/50%/25% HP, epic rewards)
Rewards: 10000 XP, Legendary Voidbreaker Weapon, game completion flag
Ending: Dialogue with Vex, dimension saved, hero can return home or stay
Campaign-Specific Systems Design
1. World Map NPC Encounter System
Feature Type: npcEncounter Schema:

{
  "type": "npcEncounter",
  "npcId": "vex_companion",
  "spawnCondition": {
    "episode": 1,
    "triggerType": "episodeStart" | "proximity" | "quest",
    "location": { "relative": "playerStart", "offset": { "x": 0, "y": 5 } }
  },
  "persistent": true,
  "interactionType": "dialogue",
  "symbol": "☺",
  "color": "#FFD700"
}
Spawn Rules:
Episode-triggered: NPC spawns when episode begins
Proximity-triggered: NPC spawns when player within X tiles of location
Quest-triggered: NPC spawns when specific quest accepted/completed
Persistent: NPC remains on map until interacted with (or can respawn)
Interaction Flow:
Player moves onto NPC tile → interaction prompt appears
Click "Talk to [NPC Name]" → dialogue modal opens
Dialogue tree with topics (similar to settlement NPCs)
Can offer quests, give items, advance campaign
Differentiation from Settlement NPCs:
World map NPCs are campaign-specific (tied to episodes)
Settlement NPCs are procedural (random names, generic roles)
World map NPCs have named identities (Vex, Scholar Thaddeus)
Settlement NPCs have campaign-aware dialogue (react to episode progress)
2. Boss Encounter System
Feature Type: bossEncounter Schema:

{
  "type": "bossEncounter",
  "bossId": "rift_guardian",
  "name": "Rift Guardian",
  "symbol": "⚠️",
  "color": "#FF0000",
  "spawnCondition": {
    "episode": 3,
    "requiresQuest": "campaign_episode_3",
    "location": { "featureType": "voidRift", "radius": 5 }
  },
  "preCombatDialogue": [
    { "speaker": "Rift Guardian", "text": "Mortal... you dare approach the rift?" },
    { "speaker": "Player", "text": "I'm here to seal this tear in reality!" },
    { "speaker": "Rift Guardian", "text": "Then you shall join the Void!" }
  ],
  "combatEnhancements": {
    "hpMultiplier": 2.5,
    "damageBonus": 5,
    "acBonus": 2,
    "abilities": [
      {
        "name": "Void Blast",
        "cooldown": 3,
        "damage": "3d8",
        "effect": "All enemies within 10 feet"
      }
    ]
  },
  "midBattleDialogue": [
    { "trigger": { "type": "hp", "threshold": 0.5 }, "text": "The Void empowers me!" }
  ],
  "onDefeatDialogue": [
    { "speaker": "Rift Guardian", "text": "Impossible... the rift..." },
    { "speaker": "Vex", "text": "Quick! Seal it with the crystal!" }
  ],
  "guaranteedLoot": [
    { "itemId": "voidbane_dagger", "quantity": 1 }
  ],
  "defeatedFlag": "boss_rift_guardian_defeated"
}
Boss Spawn Logic:
Bosses spawn as world features when episode condition met
Marked with ⚠️ symbol (distinct from normal encounters)
Player can see boss from distance, choose to engage
Boss location persists until defeated
Pre-Combat Flow:
Player moves onto boss tile → "Engage [Boss Name]" prompt
Click engage → pre-combat dialogue modal
Dialogue plays sequentially (can be multi-page)
After dialogue → combat starts with CombatManager.startCombat()
Combat Enhancements:
Boss stats multiplied (HP × 2.5, AC +2, damage +5)
Unique abilities with cooldowns:
Tracked in boss's Combatant object
Triggered on boss's turn via AI
Examples: Void Blast (AoE), Summon Minions, Phase Shift
Mid-battle dialogue triggers:
At specific HP thresholds (75%, 50%, 25%)
Brief message log entry, not full modal
Example: "The Overmind laughs: 'You think you can defeat me?'"
Multi-phase mechanics (advanced):
At HP threshold, boss changes form (stats/abilities update)
New dialogue plays
Example: Overmind at 50% HP enters "Empowered Form"
Post-Combat Flow:
Boss defeated → on-defeat dialogue plays (message log)
XP/loot awarded (guaranteed drops + normal loot table)
Quest objective completed if quest active
Boss defeated flag set in gameState (prevent respawn)
Integration with CombatManager:
Add isBoss flag to Combatant
Add bossAbilities array to Combatant
Add onTurnStart() hook to check ability cooldowns
Add checkDialogueTriggers() after damage dealt
No major refactor needed - boss is enhanced enemy
3. Campaign-Aware World Generation
WorldGenerator Modifications: During Feature Generation (generateFeatures()):

generateFeatures(regionX, regionY, rng, tiles) {
  const campaign = this.getCampaignData(); // Load from campaigns.json
  const episode = gameState.get('campaignProgress') || 1;
  const episodeData = campaign.episodes[episode - 1];

  // Apply episode-specific feature generation
  if (episodeData.worldModifications) {
    // Add boss encounters
    if (episodeData.worldModifications.bossEncounters) {
      this.spawnBossEncounters(regionX, regionY, episodeData.bossEncounters, tiles);
    }

    // Add NPC encounters
    if (episodeData.worldModifications.npcEncounters) {
      this.spawnNPCEncounters(regionX, regionY, episodeData.npcEncounters, tiles);
    }

    // Add campaign-specific POIs
    if (episodeData.worldModifications.specialFeatures) {
      this.spawnSpecialFeatures(regionX, regionY, episodeData.specialFeatures, tiles);
    }
  }

  // Continue normal feature generation...
}
During Terrain Generation (generateRegion()):

generateRegion(regionX, regionY) {
  const campaign = this.getCampaignData();
  const episode = gameState.get('campaignProgress') || 1;
  const episodeData = campaign.episodes[episode - 1];

  // Apply terrain prevalence overrides
  let terrainWeights = { ...defaultTerrainWeights };
  if (episodeData.worldModifications?.terrainOverrides) {
    terrainWeights = this.applyTerrainOverrides(
      terrainWeights,
      episodeData.worldModifications.terrainOverrides
    );
  }

  // Generate tiles with modified weights...
}
Monster Spawn Modifications (Player.generateEnemy()):

async generateEnemy(playerLevel) {
  const campaign = this.getCampaignData();
  const episode = gameState.get('campaignProgress') || 1;
  const episodeData = campaign.episodes[episode - 1];

  // Apply monster overrides
  let monsterPool = await this.getMonsterPool(playerLevel);

  if (episodeData.worldModifications?.monsterOverrides) {
    monsterPool = this.applyMonsterOverrides(
      monsterPool,
      episodeData.worldModifications.monsterOverrides
    );
  }

  // Select from modified pool...
}
Item Drop Modifications (Future - Loot System):

generateLoot(enemyType, location) {
  const campaign = this.getCampaignData();
  const episode = gameState.get('campaignProgress') || 1;
  const episodeData = campaign.episodes[episode - 1];

  // Base loot table
  let lootTable = this.getLootTable(enemyType);

  // Apply campaign loot overrides
  if (episodeData.worldModifications?.lootOverrides) {
    lootTable = this.applyLootOverrides(
      lootTable,
      episodeData.worldModifications.lootOverrides
    );
  }

  // Roll on modified table...
}
4. Campaign-Aware NPC Dialogue
Generic NPC Dialogue Variations: Settlement NPCs have dialogue that changes based on current episode:

// NPCGenerator.js - generateDialogue()
generateDialogue(npcRole, campaignId, currentEpisode) {
  const campaign = this.getCampaignData(campaignId);
  const dialogueVariations = campaign.genericNPCDialogue || [];

  // Find dialogue for current episode range
  const relevantDialogue = dialogueVariations.find(d =>
    currentEpisode >= d.episodeRange[0] &&
    currentEpisode <= d.episodeRange[1]
  );

  return {
    greeting: this.selectGreeting(npcRole, relevantDialogue),
    topics: this.generateTopics(npcRole, relevantDialogue),
    farewell: this.selectFarewell(npcRole)
  };
}
Example Dialogue Variations (from campaigns.json):

"genericNPCDialogue": [
  {
    "episodeRange": [1, 2],
    "greetings": [
      "Welcome, traveler. Strange times we're living in...",
      "Be careful out there. Pale creatures lurking in the woods."
    ],
    "topics": {
      "voidborn": "I've heard tales of ghostly beings that drain life. Stay alert.",
      "corruption": "Some say the very land is turning against us..."
    }
  },
  {
    "episodeRange": [3, 5],
    "greetings": [
      "You're still alive? The rifts are spreading...",
      "Every day more corruption. Where will it end?"
    ],
    "topics": {
      "voidborn": "The Voidborn are everywhere now. We're losing this fight.",
      "rifts": "I've seen tears in the sky. What madness is this?"
    }
  },
  {
    "episodeRange": [6, 8],
    "greetings": [
      "Half the villages are abandoned. We're running out of time.",
      "They say you're our only hope. Please, stop them."
    ],
    "topics": {
      "voidborn": "The Hive... that's where they come from. Can it be destroyed?",
      "refugees": "So many have lost their homes. Where can they go?"
    }
  },
  {
    "episodeRange": [9, 10],
    "greetings": [
      "This is it. The end, unless you can stop them.",
      "The Overmind... it's real. Can you truly face it?"
    ],
    "topics": {
      "finalBattle": "We're all counting on you. Don't let us down.",
      "hope": "If you succeed, perhaps we can rebuild. If not..."
    }
  }
]
Implementation:
SettlementUI loads campaign data when opening dialogue
Passes current episode to NPCGenerator for dialogue selection
Generic NPCs pull from episode-appropriate dialogue pools
Named campaign NPCs have unique dialogue (not affected by this system)
Data Architecture
1. campaigns.json Schema
File: data/campaigns.json

{
  "campaigns": [
    {
      "id": "terrors_of_voidborn",
      "name": "Terrors of the Voidborn",
      "description": "You awaken in Nexus Verge, a dimension under siege by the Voidborn...",
      "episodeCount": 10,
      "defaultDifficulty": "normal",

      "episodes": [
        {
          "episode": 1,
          "name": "Arrival in the Verge",
          "description": "You awaken in a strange land. A mysterious figure approaches...",
          "objectives": [
            {
              "type": "npcInteraction",
              "description": "Meet Vex, the wanderer",
              "requirement": { "npcId": "vex_companion" }
            },
            {
              "type": "kill",
              "description": "Defeat 3 Void Spawn",
              "requirement": { "creatureTypes": ["void_spawn"], "count": 3 }
            },
            {
              "type": "explore",
              "description": "Reach the nearest settlement",
              "requirement": { "featureType": "settlement" }
            }
          ],
          "rewards": {
            "xp": 500,
            "gold": 50,
            "items": [{ "itemId": "void_crystal_shard", "quantity": 1 }]
          },

          "worldModifications": {
            "monsterOverrides": {
              "addTypes": [
                { "monsterId": "void_spawn", "prevalence": 0.3 }
              ]
            },
            "npcEncounters": [
              {
                "npcId": "vex_companion",
                "spawnCondition": {
                  "triggerType": "episodeStart",
                  "location": { "relative": "playerStart", "offset": { "x": 0, "y": 5 } }
                }
              }
            ]
          }
        },

        {
          "episode": 2,
          "name": "The Corrupted Village",
          "description": "A nearby settlement is under attack. Corruption spreads...",
          "objectives": [
            {
              "type": "kill",
              "description": "Clear Void Spawn from settlement",
              "requirement": {
                "creatureTypes": ["void_spawn"],
                "count": 5,
                "location": { "nearFeature": "settlement", "radius": 10 }
              }
            },
            {
              "type": "npcInteraction",
              "description": "Speak with Village Elder",
              "requirement": { "npcRole": "leader", "topic": "corruption" }
            },
            {
              "type": "investigate",
              "description": "Investigate the corrupted well",
              "requirement": { "featureType": "corrupted_well" }
            }
          ],
          "rewards": {
            "xp": 750,
            "gold": 100,
            "items": [{ "itemId": "anti_void_charm", "quantity": 1 }],
            "reputation": { "settlement": 50 }
          },

          "worldModifications": {
            "monsterOverrides": {
              "replacements": [
                { "replace": "goblin", "with": "void_spawn", "chance": 0.5 }
              ]
            },
            "specialFeatures": [
              {
                "featureType": "corrupted_well",
                "spawnCondition": {
                  "location": { "nearFeature": "settlement", "radius": 5 }
                }
              }
            ]
          }
        },

        {
          "episode": 3,
          "name": "Seal the Rift",
          "description": "A dimensional rift tears reality. You must close it before it's too late.",
          "objectives": [
            {
              "type": "explore",
              "description": "Locate the Void Rift",
              "requirement": {
                "featureType": "voidRift",
                "radius": 150
              }
            },
            {
              "type": "bossEncounter",
              "description": "Defeat the Rift Guardian",
              "requirement": { "bossId": "rift_guardian" }
            },
            {
              "type": "interact",
              "description": "Seal the rift using the Void Crystal Shard",
              "requirement": { "featureType": "voidRift", "hasItem": "void_crystal_shard" }
            }
          ],
          "rewards": {
            "xp": 1500,
            "gold": 200,
            "items": [{ "itemId": "voidbane_dagger", "quantity": 1 }]
          },

          "worldModifications": {
            "terrainOverrides": {
              "addTypes": [
                {
                  "terrainId": "void_rift",
                  "prevalence": 0.05,
                  "regions": "random"
                }
              ]
            },
            "bossEncounters": [
              {
                "bossId": "rift_guardian",
                "spawnCondition": {
                  "location": { "nearFeature": "voidRift", "radius": 5 }
                }
              }
            ]
          }
        }

        // Episodes 4-10 follow same structure...
      ],

      "genericNPCDialogue": [
        {
          "episodeRange": [1, 2],
          "greetings": [
            "Welcome, traveler. Strange times we're living in...",
            "Be careful out there. Pale creatures lurking in the woods."
          ],
          "topics": {
            "voidborn": "I've heard tales of ghostly beings that drain life. Stay alert.",
            "corruption": "Some say the very land is turning against us..."
          }
        }
        // More dialogue variations for episodes 3-10...
      ],

      "customMonsters": [
        "void_spawn",
        "void_hunter",
        "void_corruptor",
        "void_titan"
      ],

      "customTerrains": [
        "void_rift",
        "corrupted_land"
      ],

      "customItems": [
        "void_crystal_shard",
        "anti_void_charm",
        "voidbane_dagger",
        "purification_amulet",
        "void_lens",
        "void_key",
        "voidbreaker_weapon"
      ],

      "namedNPCs": [
        {
          "id": "vex_companion",
          "name": "Vex",
          "role": "companion",
          "personality": "mysterious",
          "appearanceEpisodes": [1, 3, 8, 10],
          "dialogue": {
            "1": {
              "greeting": "You... you're not from here, are you?",
              "topics": {
                "identity": "I'm Vex. I've been tracking the Voidborn for years.",
                "voidborn": "Creatures from beyond. They feed on life itself.",
                "help": "Stick with me. I can teach you to survive here."
              }
            }
            // More episode-specific dialogue...
          }
        },
        {
          "id": "scholar_thaddeus",
          "name": "Scholar Thaddeus",
          "role": "scholar",
          "personality": "eccentric",
          "appearanceEpisodes": [4, 8],
          "dialogue": {
            "4": {
              "greeting": "Ah! A visitor! Tell me, have you encountered the Voidborn?",
              "topics": {
                "origins": "They're not native to any dimension. They're parasites.",
                "research": "I need ancient texts. Three, to be precise.",
                "danger": "The more I learn, the more I fear. But knowledge is power."
              }
            }
          }
        }
      ],

      "bosses": [
        {
          "id": "rift_guardian",
          "name": "Rift Guardian",
          "description": "A towering figure wreathed in void energy, guardian of the dimensional tear.",
          "baseMonster": "void_titan",
          "episode": 3,
          "cr": 3,
          "enhancements": {
            "hpMultiplier": 2.5,
            "damageBonus": 5,
            "acBonus": 2
          },
          "abilities": [
            {
              "name": "Void Blast",
              "cooldown": 3,
              "type": "aoe",
              "damage": "3d8",
              "damageType": "necrotic",
              "range": 10,
              "description": "Unleashes void energy in a 10-foot radius"
            }
          ],
          "dialogue": {
            "preCombat": [
              { "speaker": "Rift Guardian", "text": "Mortal... you dare approach the rift?" },
              { "speaker": "Player", "text": "I'm here to seal this tear in reality!" },
              { "speaker": "Rift Guardian", "text": "Then you shall join the Void!" }
            ],
            "midBattle": [
              {
                "trigger": { "type": "hp", "threshold": 0.5 },
                "speaker": "Rift Guardian",
                "text": "The Void empowers me! You cannot win!"
              }
            ],
            "onDefeat": [
              { "speaker": "Rift Guardian", "text": "Impossible... the rift..." },
              { "speaker": "Vex", "text": "Quick! Seal it with the crystal!" }
            ]
          },
          "guaranteedLoot": [
            { "itemId": "voidbane_dagger", "quantity": 1 }
          ]
        }
        // More bosses: Hive Queen, Overmind Avatar, Void Titan, Overmind...
      ]
    }
    // Future campaigns can be added here...
  ]
}
2. New Monster Definitions (monsters.json additions)
Voidborn Creatures:

{
  "id": "void_spawn",
  "name": "Void Spawn",
  "cr": 0.5,
  "size": "Small",
  "type": "aberration",
  "tags": ["voidborn"],
  "ac": 13,
  "hp": 15,
  "hitDice": "3d6 + 3",
  "abilities": {
    "str": 10,
    "dex": 16,
    "con": 12,
    "int": 4,
    "wis": 10,
    "cha": 6
  },
  "speed": 30,
  "resistances": ["necrotic"],
  "immunities": ["poison"],
  "senses": ["darkvision 60 ft"],
  "actions": [
    {
      "name": "Draining Touch",
      "type": "melee",
      "attackBonus": 5,
      "reach": 5,
      "damage": { "dice": "1d6", "bonus": 3, "type": "necrotic" },
      "effect": "Target's max HP reduced by damage dealt until long rest"
    }
  ],
  "description": "Pale, ethereal creatures that phase in and out of reality. Their touch drains life force."
},
{
  "id": "void_hunter",
  "name": "Void Hunter",
  "cr": 4,
  "size": "Medium",
  "type": "aberration",
  "tags": ["voidborn"],
  "ac": 16,
  "hp": 60,
  "hitDice": "8d8 + 24",
  "abilities": {
    "str": 14,
    "dex": 18,
    "con": 16,
    "int": 6,
    "wis": 12,
    "cha": 8
  },
  "speed": 40,
  "resistances": ["necrotic", "psychic"],
  "immunities": ["poison", "frightened"],
  "senses": ["darkvision 120 ft", "life sense 60 ft"],
  "actions": [
    {
      "name": "Void Claws",
      "type": "melee",
      "attackBonus": 7,
      "reach": 5,
      "damage": { "dice": "2d6", "bonus": 4, "type": "slashing" },
      "additionalDamage": { "dice": "1d8", "type": "necrotic" }
    },
    {
      "name": "Phase Strike",
      "type": "special",
      "recharge": 5,
      "effect": "Teleport up to 30 feet and make Void Claws attack with advantage"
    }
  ],
  "description": "Predatory Voidborn that hunt living creatures with relentless efficiency."
},
{
  "id": "void_titan",
  "name": "Void Titan",
  "cr": 10,
  "size": "Huge",
  "type": "aberration",
  "tags": ["voidborn", "elite"],
  "ac": 18,
  "hp": 200,
  "hitDice": "16d12 + 96",
  "abilities": {
    "str": 22,
    "dex": 10,
    "con": 22,
    "int": 8,
    "wis": 14,
    "cha": 12
  },
  "speed": 40,
  "resistances": ["necrotic", "psychic", "non-magical weapons"],
  "immunities": ["poison", "charmed", "frightened"],
  "senses": ["darkvision 120 ft", "life sense 120 ft"],
  "actions": [
    {
      "name": "Multiattack",
      "effect": "Makes two Void Slam attacks"
    },
    {
      "name": "Void Slam",
      "type": "melee",
      "attackBonus": 11,
      "reach": 10,
      "damage": { "dice": "3d10", "bonus": 6, "type": "bludgeoning" },
      "additionalDamage": { "dice": "2d10", "type": "necrotic" }
    },
    {
      "name": "Void Pulse",
      "type": "aoe",
      "recharge": 5,
      "range": 30,
      "damage": { "dice": "6d8", "type": "necrotic" },
      "effect": "All creatures within 30 feet take damage and are slowed (half speed) until end of next turn"
    }
  ],
  "legendaryActions": 3,
  "description": "Towering behemoths of void energy, capable of decimating entire settlements."
}
3. New Terrain Definitions (terrains.json additions)

{
  "id": "voidRift",
  "name": "Void Rift",
  "symbol": "◊",
  "color": "#9400D3",
  "traversable": true,
  "movementCost": 2,
  "description": "A tear in reality where the Void bleeds through. Dangerous and unstable.",
  "encounterRate": 0.3,
  "encounterTypes": ["voidborn"],
  "effects": {
    "corruption": true,
    "description": "Each turn spent on this tile: DC 12 CON save or take 1d6 necrotic damage"
  },
  "canSeal": true,
  "sealRequirement": { "itemId": "void_crystal_shard" }
},
{
  "id": "corruptedLand",
  "name": "Corrupted Land",
  "symbol": "≋",
  "color": "#4B0082",
  "traversable": true,
  "movementCost": 2,
  "description": "Land twisted by void energy. Plants wither, water turns black.",
  "encounterRate": 0.15,
  "encounterTypes": ["voidborn", "undead"],
  "effects": {
    "corruption": true,
    "description": "Short rests take double time. Long rests impossible."
  },
  "canPurify": true,
  "purifyRequirement": { "itemId": "purification_amulet" }
}
4. New Item Definitions (items.json additions)

{
  "id": "void_crystal_shard",
  "name": "Void Crystal Shard",
  "type": "consumable",
  "subtype": "quest",
  "description": "A fragment of crystallized void energy. Pulses with otherworldly power.",
  "weight": 0.5,
  "rarity": "rare",
  "questItem": true,
  "usableOn": ["voidRift"],
  "effect": "Can seal a Void Rift when used at the rift location"
},
{
  "id": "anti_void_charm",
  "name": "Anti-Void Charm",
  "type": "accessory",
  "description": "A charm imbued with protective magic. Shields against void corruption.",
  "weight": 0.1,
  "rarity": "uncommon",
  "equipped": "accessory",
  "effects": {
    "resistance": ["necrotic"],
    "savingThrowBonus": { "con": 2, "condition": "vs void effects" }
  }
},
{
  "id": "voidbane_dagger",
  "name": "Voidbane Dagger",
  "type": "weapon",
  "weaponType": "melee",
  "damage": { "dice": "1d4 + 1", "type": "piercing" },
  "properties": ["finesse", "light", "thrown"],
  "range": { "normal": 20, "max": 60 },
  "weight": 1,
  "rarity": "rare",
  "specialAbility": {
    "name": "Voidbane",
    "description": "Deals an extra 1d6 radiant damage to Voidborn creatures"
  }
},
{
  "id": "purification_amulet",
  "name": "Purification Amulet",
  "type": "accessory",
  "description": "Blessed amulet that cleanses corruption. Can purify tainted land.",
  "weight": 0.2,
  "rarity": "rare",
  "equipped": "accessory",
  "usableOn": ["corruptedLand"],
  "charges": 5,
  "effect": "Can purify one Corrupted Land tile per charge"
},
{
  "id": "void_lens",
  "name": "Void Lens",
  "type": "accessory",
  "description": "A crystal lens that reveals hidden void rifts and corruption.",
  "weight": 0.3,
  "rarity": "very rare",
  "equipped": "accessory",
  "effects": {
    "detectVoidRifts": { "range": 20, "description": "Reveals hidden void rifts on map" }
  }
},
{
  "id": "void_key",
  "name": "Void Key",
  "type": "consumable",
  "subtype": "quest",
  "description": "Forged from five Void Anchors. Opens the portal to The Void dimension.",
  "weight": 1,
  "rarity": "legendary",
  "questItem": true,
  "usableOn": ["voidPortal"],
  "effect": "Opens the portal to The Void for final battle"
},
{
  "id": "voidbreaker_weapon",
  "name": "Voidbreaker",
  "type": "weapon",
  "weaponType": "melee",
  "damage": { "dice": "2d6 + 3", "type": "slashing" },
  "properties": ["versatile", "magical"],
  "versatileDamage": "2d8 + 3",
  "weight": 6,
  "rarity": "legendary",
  "specialAbility": {
    "name": "Void Slayer",
    "description": "Deals an extra 2d10 radiant damage to Voidborn. On critical hit, banishes Voidborn creature (no save)."
  },
  "lore": "Forged in the heart of a dying star, this blade was created specifically to combat the Voidborn menace."
}
Integration with Existing Systems
Critical: Campaign Must Work WITH Existing Code
The campaign system is an ENHANCEMENT, not a replacement. All existing systems must continue to work:
1. Quest System Integration (QuestManager + QuestGenerator)
Current Implementation (Keep Working):
✅ QuestManager.js tracks active/completed/failed quests
✅ QuestGenerator.js generates side quests from templates
✅ Quest objectives: kill, retrieve, deliver, explore, skill
✅ Progress tracking hooks: onCreatureKilled(), onNPCInteraction(), etc.
✅ Quest log UI with tabs (Active/Completed/Failed)
✅ Quest acceptance/abandonment/turn-in flows
Campaign Quest Integration (Add, Don't Replace):

// QuestManager.js - ADD campaign quest methods alongside existing ones
class QuestManager {
  // EXISTING METHODS - KEEP UNCHANGED
  acceptQuest(questId) { /* ... */ }
  completeQuest(questId) { /* ... */ }
  abandonQuest(questId) { /* ... */ }
  onCreatureKilled(creatureId, location) { /* ... */ }

  // NEW CAMPAIGN METHODS - EXTEND, DON'T REPLACE
  isCampaignQuest(questId) {
    return questId.startsWith('campaign_episode_');
  }

  completeCampaignQuest(questId) {
    // Call existing completeQuest() first
    this.completeQuest(questId);

    // THEN add campaign-specific logic
    if (this.isCampaignQuest(questId)) {
      const episode = parseInt(questId.split('_')[2]);
      if (episode < 3) {
        this.generateNextEpisodeQuest(episode + 1);
      }
    }
  }

  // NEW: Generate campaign quest from campaign data
  generateCampaignQuest(episode) {
    const campaignData = campaignManager.getEpisodeData(episode);

    // Convert campaign episode to quest format (same schema as side quests)
    const campaignQuest = {
      id: `campaign_episode_${episode}`,
      name: campaignData.name,
      description: campaignData.description,
      type: 'campaign',  // ← FLAG for special handling
      difficulty: campaignData.difficulty || 'normal',
      objectives: campaignData.objectives,  // ← Same format as side quests
      rewards: campaignData.rewards,
      status: 'available'
    };

    // Use EXISTING addQuest method
    const quests = gameState.get('quests');
    quests.available.push(campaignQuest);
    gameState.set('quests', quests);

    return campaignQuest;
  }
}
Quest Log UI Integration:
Campaign quests show in Active tab alongside side quests
Campaign quests have distinct badge: [CAMPAIGN] or [EPISODE 1]
Can track campaign quests (same as side quests)
Campaign quests CANNOT be abandoned (validation check)
All existing quest UI code unchanged
2. NPC Dialogue Integration (SettlementUI + NPCGenerator)
Current Implementation (Keep Working):
✅ Settlement NPCs generated by NPCGenerator.js
✅ Dialogue modal in SettlementUI.js with topics
✅ NPCs can offer quests via "Ask about work" topic
✅ Quest assignment in SettlementManager.assignQuestsToNPCs()
Campaign Dialogue Integration (Extend, Don't Replace): SettlementUI.js - MINIMAL CHANGES:

// EXISTING: openNPCDialogue()
openNPCDialogue(npc) {
  // EXISTING: Load NPC data
  const npcData = this.getNPCData(npc.id);

  // NEW: Add campaign context (just pass episode number)
  const episode = gameState.get('campaignProgress') || 1;

  // EXISTING: Render dialogue with topics
  this.renderDialogueTopics(npcData, episode);  // ← Just add episode param
}

// EXISTING: renderDialogueTopics()
renderDialogueTopics(npcData, episode) {  // ← Add episode param
  const topicsHTML = npcData.dialogue.topics.map(topic => {
    // NEW: Campaign topics have episodeRange check
    if (topic.episodeRange) {
      if (episode < topic.episodeRange[0] || episode > topic.episodeRange[1]) {
        return '';  // Skip this topic (not relevant to current episode)
      }
    }

    // EXISTING: Render topic button
    return `<button class="dialogue-topic" data-topic="${topic.id}">${topic.label}</button>`;
  }).join('');

  // EXISTING: Render in modal (unchanged)
  document.getElementById('dialogueTopics').innerHTML = topicsHTML;
}
NPCGenerator.js - ADD Campaign Dialogue Loading:

// EXISTING: generateDialogue()
generateDialogue(npcRole) {
  // EXISTING: Base dialogue generation
  const baseDialogue = {
    greeting: this.selectGreeting(npcRole),
    topics: this.generateTopics(npcRole),
    farewell: this.selectFarewell(npcRole)
  };

  // NEW: Load campaign dialogue variations
  const campaignId = gameState.get('worldConfig')?.campaignId;
  if (campaignId && campaignId !== 'default') {
    const campaignDialogue = this.loadCampaignDialogue(campaignId);
    baseDialogue.topics.push(...campaignDialogue);  // ← ADD campaign topics
  }

  return baseDialogue;
}

// NEW: Load campaign-specific topics
loadCampaignDialogue(campaignId) {
  const campaign = campaignManager.getCampaignData();

  // Convert campaign dialogue format to topic format
  return campaign.genericNPCDialogue.map(dialogueSet => ({
    id: `campaign_${dialogueSet.episodeRange.join('_')}`,
    label: "Recent events...",
    episodeRange: dialogueSet.episodeRange,  // ← For filtering
    responses: dialogueSet.topics
  }));
}
World Map NPC Dialogue (New Feature):
Create WorldNPCDialogueModal component (separate from SettlementUI)
Reuse dialogue rendering logic from SettlementUI
Named campaign NPCs (Vex, Scholar) use custom dialogue trees
World map NPC dialogue can offer campaign quests
3. World Generation Integration (WorldGenerator)
Current Implementation (Keep Working):
✅ generateRegion() creates 32x32 tile regions
✅ generateFeatures() spawns settlements, dungeons, POIs
✅ Settlements generate NPCs via NPCGenerator
✅ Region caching and pruning
Campaign Feature Integration (ADD to existing features):

// WorldGenerator.js - EXTEND generateFeatures()
async generateFeatures(regionX, regionY, rng, tiles) {
  const features = [];

  // EXISTING: Generate standard features (UNCHANGED)
  const settlement = this.generateSettlement(regionX, regionY, rng, tiles);
  if (settlement) features.push(settlement);

  const dungeon = this.generateDungeon(regionX, regionY, rng, tiles);
  if (dungeon) features.push(dungeon);

  // ... other existing features ...

  // NEW: Generate campaign-specific features (IF campaign active)
  const campaignId = this.config.campaignId;
  if (campaignId && campaignId !== 'default') {
    const episode = gameState.get('campaignProgress') || 1;

    // Check for NPC encounters in this region
    const npcEncounter = await this.checkForNPCEncounter(regionX, regionY, episode);
    if (npcEncounter) features.push(npcEncounter);

    // Check for boss encounters in this region
    const bossEncounter = await this.checkForBossEncounter(regionX, regionY, episode);
    if (bossEncounter) features.push(bossEncounter);

    // Check for special terrain (void rifts, etc.)
    const specialTerrain = await this.generateCampaignTerrain(regionX, regionY, episode, tiles);
    if (specialTerrain) features.push(...specialTerrain);
  }

  return features;
}

// NEW: Campaign feature generators (don't interfere with existing)
checkForNPCEncounter(regionX, regionY, episode) {
  const npcDefs = campaignManager.getNPCEncounters(episode);

  for (const npcDef of npcDefs) {
    // Check if NPC should spawn in this region
    if (this.shouldSpawnNPCHere(npcDef, regionX, regionY)) {
      return {
        type: 'npcEncounter',
        npcId: npcDef.npcId,
        location: this.calculateNPCSpawnLocation(npcDef, regionX, regionY),
        symbol: '☺',
        color: '#FFD700',
        interactable: true
      };
    }
  }

  return null;
}
Terrain Generation Integration:

// WorldGenerator.js - EXTEND generateTerrain()
generateTerrain(regionX, regionY, terrainOverrides = {}) {
  // EXISTING: Base terrain generation (UNCHANGED)
  const tiles = new Array(32);
  for (let y = 0; y < 32; y++) {
    tiles[y] = new Array(32);
    for (let x = 0; x < 32; x++) {
      // ... existing elevation/moisture/temperature noise ...

      // EXISTING: Determine base terrain type
      let terrainId = this.getTerrainFromNoise(elevation, moisture, temperature);

      // NEW: Apply campaign overrides (if any)
      if (terrainOverrides.replacements) {
        terrainId = this.applyCampaignTerrainReplacement(terrainId, terrainOverrides);
      }

      tiles[y][x] = { terrain: terrainId, explored: false, visible: false };
    }
  }

  // NEW: Add campaign-specific terrain patches (void rifts, corrupted land)
  if (terrainOverrides.addTypes) {
    this.addCampaignTerrainPatches(tiles, terrainOverrides.addTypes);
  }

  return tiles;
}
4. Combat Integration (CombatManager + Player)
Current Implementation (Keep Working):
✅ CombatManager.js handles turn-based combat
✅ Player.generateEnemy() spawns random encounters
✅ Combat end calls questManager.onCreatureKilled()
✅ XP/loot awarded on victory
Boss Combat Integration (EXTEND existing combat):

// CombatManager.js - ADD boss support to existing combat
async startCombat(player, enemies, options = {}) {
  // EXISTING: Create combatants (UNCHANGED)
  this.combatants = [
    new Combatant(player, true),
    ...enemies.map(e => new Combatant(e, false))
  ];

  // NEW: Check if this is a boss fight
  if (options.bossId) {
    const bossData = bossEncounterManager.getBossData(options.bossId);

    // Show pre-combat dialogue (NEW modal)
    await this.showBossDialogue(bossData.dialogue.preCombat);

    // Enhance boss stats (modify first enemy)
    this.combatants[1] = this.enhanceBoss(this.combatants[1], bossData);
  }

  // EXISTING: Roll initiative, start combat (UNCHANGED)
  this.rollInitiative();
  this.combatants.sort((a, b) => b.initiative - a.initiative);
  this.currentTurn = 0;

  gameState.set('combat', {
    active: true,
    round: 1,
    currentTurn: 0,
    combatants: this.combatants
  });

  this.startTurn();
}

// NEW: Boss enhancement (doesn't break normal combat)
enhanceBoss(combatant, bossData) {
  combatant.isBoss = true;
  combatant.bossId = bossData.id;
  combatant.maxHP = Math.floor(combatant.maxHP * bossData.enhancements.hpMultiplier);
  combatant.currentHP = combatant.maxHP;
  combatant.ac += bossData.enhancements.acBonus;
  combatant.bossAbilities = bossData.abilities || [];
  combatant.dialogueTriggers = bossData.dialogue.midBattle || [];
  return combatant;
}

// EXISTING: resolveDamage() - ADD dialogue trigger check
async resolveDamage(attacker, defender, damage) {
  defender.currentHP -= damage;

  // NEW: Boss dialogue triggers (doesn't affect normal combat)
  if (defender.isBoss && defender.dialogueTriggers) {
    const hpPercent = defender.currentHP / defender.maxHP;
    for (const trigger of defender.dialogueTriggers) {
      if (hpPercent <= trigger.trigger.threshold && !trigger.triggered) {
        gameState.addMessage(`💬 ${defender.name}: ${trigger.text}`, 'boss');
        trigger.triggered = true;
      }
    }
  }

  // EXISTING: Check for death (UNCHANGED)
  if (defender.currentHP <= 0) {
    defender.isDead = true;
    gameState.addMessage(`${defender.name} defeated!`, 'combat');
  }
}

// EXISTING: endCombat() - ADD boss loot/flag
endCombat(result) {
  // NEW: Boss-specific handling
  if (result === 'victory') {
    const boss = this.combatants.find(c => c.isBoss && c.isDead);
    if (boss) {
      // Award boss loot
      bossEncounterManager.awardBossLoot(boss.bossId);

      // Mark boss defeated (prevent respawn)
      const defeatedBosses = gameState.get('defeatedBosses') || [];
      defeatedBosses.push(boss.bossId);
      gameState.set('defeatedBosses', defeatedBosses);

      // Update campaign quest
      questManager.onBossDefeated(boss.bossId);
    }
  }

  // EXISTING: Award XP, call quest hooks (UNCHANGED)
  if (result === 'victory') {
    this.combatants.filter(c => !c.isPlayer && c.isDead).forEach(enemy => {
      questManager.onCreatureKilled(enemy.monsterId, player.location);
    });
  }

  // EXISTING: Clear combat state (UNCHANGED)
  gameState.set('combat', { active: false });
}
Monster Spawn Integration:

// Player.js - EXTEND generateEnemy()
async generateEnemy(playerLevel) {
  const response = await fetch('data/monsters.json');
  const monsterData = await response.json();

  // EXISTING: Base monster filtering (UNCHANGED)
  const targetCR = this.getEncounterCR(playerLevel, difficulty);
  let monsterPool = monsterData.monsters.filter(m => {
    const cr = m.challengeRating || 0.25;
    return cr >= targetCR - 1 && cr <= targetCR + 1;
  });

  // NEW: Apply campaign monster overrides
  const campaignId = gameState.get('worldConfig')?.campaignId;
  if (campaignId && campaignId !== 'default') {
    const episode = gameState.get('campaignProgress') || 1;
    const overrides = campaignManager.getMonsterOverrides(episode);

    // Add campaign-specific monsters
    if (overrides.addTypes) {
      monsterPool = this.addCampaignMonsters(monsterPool, overrides.addTypes);
    }

    // Replace standard monsters with campaign variants
    if (overrides.replacements) {
      monsterPool = this.applyCampaignReplacements(monsterPool, overrides.replacements);
    }
  }

  // EXISTING: Select random monster (UNCHANGED)
  const monster = monsterPool[Math.floor(Math.random() * monsterPool.length)];
  return Character.createFromMonster(monster);
}
5. Save/Load Integration (SaveManager)
Current Implementation (Keep Working):
✅ SaveManager.js serializes entire game state
✅ Saves: character, world, quests, factions, playtime
✅ 5 save slots with metadata
Campaign State Integration (ADD to save data):

// SaveManager.js - EXTEND saveGame()
saveGame(slotIndex, character) {
  const saveData = {
    version: 2.0,  // ← Increment version
    timestamp: Date.now(),

    // EXISTING: Standard save data (UNCHANGED)
    seed: gameState.get('worldConfig').seed,
    worldConfig: gameState.get('worldConfig'),
    character: character,
    world: gameState.get('world'),
    quests: gameState.get('quests'),
    factions: gameState.get('factions'),
    playtime: gameState.getPlayTime(),

    // NEW: Campaign-specific state
    campaignId: gameState.get('worldConfig').campaignId || 'default',
    campaignProgress: gameState.get('campaignProgress') || 1,
    defeatedBosses: gameState.get('defeatedBosses') || [],
    metNPCs: gameState.get('metNPCs') || []  // World map NPC encounters
  };

  // EXISTING: Save to LocalStorage (UNCHANGED)
  localStorage.setItem(`save_slot_${slotIndex}`, JSON.stringify(saveData));
}

// EXTEND: loadGame() - restore campaign state
loadGame(slotIndex) {
  const saveData = JSON.parse(localStorage.getItem(`save_slot_${slotIndex}`));

  // EXISTING: Restore standard state (UNCHANGED)
  gameState.set('worldConfig', saveData.worldConfig);
  gameState.set('character', saveData.character);
  gameState.set('world', saveData.world);
  gameState.set('quests', saveData.quests);

  // NEW: Restore campaign state
  if (saveData.campaignId && saveData.campaignId !== 'default') {
    campaignManager.loadCampaign(saveData.campaignId);
    gameState.set('campaignProgress', saveData.campaignProgress || 1);
    gameState.set('defeatedBosses', saveData.defeatedBosses || []);
    gameState.set('metNPCs', saveData.metNPCs || []);
  }

  // EXISTING: Reinitialize systems (UNCHANGED)
  this.worldGenerator.loadSavedRegions(saveData.world.generatedRegions);
}
6. UI Integration (main.js + index.html)
Current Implementation (Keep Working):
✅ Quest log modal with tabs
✅ HUD with HP/AC/XP display
✅ Settlement entry UI
✅ Combat UI with action buttons
Campaign UI Integration (ADD elements, don't replace): HUD Enhancement:

<!-- index.html - ADD campaign tracker to HUD -->
<div id="hud">
  <!-- EXISTING: Character stats (UNCHANGED) -->
  <div id="characterStats">...</div>

  <!-- NEW: Campaign progress (only shown if campaign active) -->
  <div id="campaignProgress" style="display: none;">
    <span id="campaignEpisode">Episode 1: Arrival in the Verge</span>
  </div>
</div>

// main.js - UPDATE HUD on episode change
function updateCampaignHUD() {
  const campaignId = gameState.get('worldConfig')?.campaignId;
  const progressDiv = document.getElementById('campaignProgress');

  if (campaignId && campaignId !== 'default') {
    const episode = gameState.get('campaignProgress') || 1;
    const episodeData = campaignManager.getEpisodeData(episode);

    progressDiv.style.display = 'block';
    document.getElementById('campaignEpisode').textContent =
      `Episode ${episode}/10: ${episodeData.name}`;
  } else {
    progressDiv.style.display = 'none';
  }
}

// Subscribe to campaign progress changes
gameState.subscribe('campaignProgress', updateCampaignHUD);
Quest Log UI Enhancement:

// main.js - EXTEND renderQuestCard()
function renderQuestCard(quest) {
  // EXISTING: Quest card rendering (UNCHANGED)
  const card = document.createElement('div');
  card.className = 'quest-card';

  // NEW: Add campaign badge if campaign quest
  const isCampaign = quest.id?.startsWith('campaign_episode_');
  const badge = isCampaign ? '<span class="campaign-badge">EPISODE</span>' : '';

  card.innerHTML = `
    ${badge}
    <h3>${quest.name}</h3>
    <p>${quest.description}</p>
    <!-- EXISTING: objectives, rewards, actions (UNCHANGED) -->
  `;

  return card;
}
Integration Summary: What Changes, What Doesn't
✅ NO CHANGES NEEDED (Works as-is):
Quest objective tracking (kill, retrieve, deliver, explore)
Quest log UI tabs (Active/Completed/Failed)
Settlement NPC dialogue modal structure
Combat system core logic (initiative, attacks, damage)
Save/load file format (just add fields)
World generation region caching
Player movement and exploration
🔧 MINIMAL CHANGES (Add, don't replace):
QuestManager: Add isCampaignQuest(), generateCampaignQuest() methods
NPCGenerator: Add loadCampaignDialogue() to append campaign topics
WorldGenerator: Add campaign feature checks in generateFeatures()
CombatManager: Add boss enhancement in startCombat(), dialogue triggers in resolveDamage()
Player: Add campaign overrides in generateEnemy()
SaveManager: Add campaign fields to save data
main.js: Add campaign HUD element, update quest card rendering
🆕 NEW SYSTEMS (Don't interfere with existing):
CampaignManager.js - Loads campaign data, provides overrides
WorldEncounterManager.js - Spawns world map NPCs
BossEncounterManager.js - Handles boss fights
styles-voidborn.css - Campaign-specific visual theme
World NPC dialogue modal - Separate from settlement dialogue
Technical Implementation Plan
Phase 1: Data Files & Core Infrastructure (Week 1)
Tasks:
Create data/campaigns.json
Define complete "Terrors of the Voidborn" campaign (10 episodes)
All boss definitions, NPC encounters, dialogue variations
World modification rules per episode
Update data/monsters.json
Add 4 Voidborn creatures: Void Spawn, Void Hunter, Void Corruptor, Void Titan
Add boss variants: Rift Guardian, Hive Queen, Overmind Avatar, Overmind
Update data/terrains.json
Add Void Rift terrain (sealable with item)
Add Corrupted Land terrain (purifiable with item)
Update data/items.json
Add 7 campaign-specific items (Void Crystal Shard, Anti-Void Charm, etc.)
Add Voidbane weapons with special Voidborn damage
Files Modified:
data/campaigns.json (NEW)
data/monsters.json (ADD 8 entries)
data/terrains.json (ADD 2 entries)
data/items.json (ADD 7 entries)
Acceptance Criteria:
✅ All data files validate against schema
✅ Episode 1 fully specified with objectives, rewards, world modifications
✅ All Voidborn monsters have complete stat blocks
✅ Campaign-specific items have proper usability rules
Phase 2: Campaign Management System (Week 2)
Tasks:
Create src/systems/CampaignManager.js
Load campaigns.json on initialization
Track current episode progress
Provide campaign data to other systems
Apply world generation overrides
Handle episode advancement
Create src/systems/WorldEncounterManager.js
Spawn NPC encounters on world map
Handle NPC interaction triggers (proximity, quest, episode)
Dialogue modal for world map NPCs
Persistent NPC state tracking
Create src/systems/BossEncounterManager.js
Spawn boss encounters as world features
Pre-combat dialogue system
Combat enhancement application (HP multiplier, abilities)
Mid-battle dialogue triggers
Post-combat loot and flag setting
New Files:
src/systems/CampaignManager.js
src/systems/WorldEncounterManager.js
src/systems/BossEncounterManager.js
CampaignManager.js Methods:

class CampaignManager {
  constructor(campaignId) { /* Load campaign data */ }

  getCurrentEpisode() { /* Get active episode number */ }
  getEpisodeData(episode) { /* Get episode definition */ }
  advanceEpisode(nextEpisode) { /* Progress campaign */ }

  // Override providers
  getMonsterOverrides(episode) { /* Monster spawn modifications */ }
  getTerrainOverrides(episode) { /* Terrain prevalence modifications */ }
  getLootOverrides(episode) { /* Item drop modifications */ }

  // Special spawns
  getNPCEncounters(episode) { /* World map NPC spawns */ }
  getBossEncounters(episode) { /* Boss spawn definitions */ }
  getSpecialFeatures(episode) { /* Campaign POIs */ }

  // Dialogue
  getGenericNPCDialogue(episode) { /* Settlement NPC dialogue */ }
  getNamedNPCDialogue(npcId, episode) { /* Campaign NPC dialogue */ }
}
Acceptance Criteria:
✅ CampaignManager loads campaigns.json and tracks episode
✅ WorldEncounterManager spawns Vex at Episode 1 start
✅ BossEncounterManager spawns Rift Guardian at Episode 3
✅ Pre-combat dialogue displays before boss fight
Phase 3: World Generation Integration (Week 3)
Tasks:
Modify src/systems/WorldGenerator.js
Inject CampaignManager dependency
Apply terrain overrides during region generation
Spawn NPC encounters via WorldEncounterManager
Spawn boss encounters via BossEncounterManager
Generate campaign-specific POIs
Modify src/systems/Player.js
Apply monster overrides to encounter generation
Handle NPC encounter interaction
Handle boss encounter interaction
Item usage on terrain (seal rifts, purify corruption)
Modify src/systems/CombatManager.js
Support boss flag on Combatant
Apply combat enhancements to bosses
Trigger mid-battle dialogue at HP thresholds
Boss ability system with cooldowns
Guaranteed loot drops for bosses
Files Modified:
src/systems/WorldGenerator.js (ADD campaign hooks)
src/systems/Player.js (ADD encounter handlers, item usage)
src/systems/CombatManager.js (ADD boss support)
WorldGenerator.js Changes:

class WorldGenerator {
  constructor(worldSeed, config = {}) {
    this.campaignManager = new CampaignManager(config.campaignId);
    // ...
  }

  async generateRegion(regionX, regionY) {
    const episode = gameState.get('campaignProgress') || 1;
    const terrainOverrides = this.campaignManager.getTerrainOverrides(episode);

    // Apply overrides to terrain generation...
    const tiles = this.generateTerrain(regionX, regionY, terrainOverrides);

    // Generate features with campaign awareness
    const features = await this.generateFeatures(regionX, regionY, rng, tiles, episode);

    return { tiles, features };
  }

  async generateFeatures(regionX, regionY, rng, tiles, episode) {
    const features = [];

    // Standard features (settlements, dungeons, POIs)...

    // Campaign-specific features
    const npcEncounters = this.campaignManager.getNPCEncounters(episode);
    for (const npcDef of npcEncounters) {
      if (this.shouldSpawnNPC(npcDef, regionX, regionY)) {
        const npc = await worldEncounterManager.spawnNPCEncounter(npcDef, regionX, regionY);
        features.push(npc);
      }
    }

    const bossEncounters = this.campaignManager.getBossEncounters(episode);
    for (const bossDef of bossEncounters) {
      if (this.shouldSpawnBoss(bossDef, regionX, regionY)) {
        const boss = await bossEncounterManager.spawnBossEncounter(bossDef, regionX, regionY);
        features.push(boss);
      }
    }

    return features;
  }
}
Player.js Changes:

class Player {
  async generateEnemy(playerLevel) {
    const episode = gameState.get('campaignProgress') || 1;
    const monsterOverrides = this.campaignManager.getMonsterOverrides(episode);
7
    // Apply overrides to monster pool
    let monsterPool = await this.loadMonsters();
    monsterPool = this.applyMonsterOverrides(monsterPool, monsterOverrides);

    // Select from modified pool...
  }

  handleInteract() {
    const tile = this.getCurrentTile();
    const feature = tile.feature;

    if (feature?.type === 'npcEncounter') {
      worldEncounterManager.interactWithNPC(feature.npcId);
    } else if (feature?.type === 'bossEncounter') {
      bossEncounterManager.engageBoss(feature.bossId);
    } else if (feature?.type === 'settlement') {
      this.enterSettlement();
    }
  }
}
CombatManager.js Changes:

class CombatManager {
  async startCombat(player, enemies, options = {}) {
    // Check if this is a boss fight
    if (options.isBoss) {
      const bossData = bossEncounterManager.getBossData(options.bossId);

      // Show pre-combat dialogue
      await this.showBossDialogue(bossData.dialogue.preCombat);

      // Enhance boss stats
      enemies[0] = this.enhanceBoss(enemies[0], bossData);
    }

    // Normal combat flow...
  }

  enhanceBoss(enemy, bossData) {
    enemy.isBoss = true;
    enemy.bossId = bossData.id;
    enemy.maxHP *= bossData.enhancements.hpMultiplier;
    enemy.currentHP = enemy.maxHP;
    enemy.ac += bossData.enhancements.acBonus;
    enemy.bossAbilities = bossData.abilities;
    enemy.dialogueTriggers = bossData.dialogue.midBattle;
    return enemy;
  }

  async resolveDamage(attacker, defender, damage) {
    defender.currentHP -= damage;

    // Check boss dialogue triggers
    if (defender.isBoss && defender.dialogueTriggers) {
      for (const trigger of defender.dialogueTriggers) {
        const hpPercent = defender.currentHP / defender.maxHP;
        if (hpPercent <= trigger.trigger.threshold && !trigger.triggered) {
          gameState.addMessage(`${defender.name}: ${trigger.text}`, 'boss');
          trigger.triggered = true;
        }
      }
    }

    // Normal damage flow...
  }
}
Acceptance Criteria:
✅ Void Rift terrain spawns in Episode 3+
✅ Void Spawn replace 50% of goblins in Episode 2+
✅ Vex NPC appears 5 tiles north on Episode 1 start
✅ Rift Guardian boss spawns near Void Rift in Episode 3
✅ Boss fight shows pre-combat dialogue before combat starts
✅ Boss has enhanced stats (2.5× HP, +2 AC, +5 damage)
Phase 4: Quest & Dialogue Integration (Week 4)
Tasks:
Modify src/systems/QuestManager.js
Support 10-episode campaign structure
New objective types: bossEncounter, npcInteraction, investigate
Episode advancement on quest completion
Hook into CampaignManager for episode data
Modify src/systems/NPCGenerator.js
Load campaign dialogue variations
Select dialogue based on current episode
Apply to generic settlement NPCs
Modify src/ui/SettlementUI.js
Pass episode to NPC dialogue generation
Display campaign-aware dialogue topics
Modify src/main.js
Initialize CampaignManager on new game
Display campaign progress in UI
Episode advancement notifications
Files Modified:
src/systems/QuestManager.js (ADD episode support)
src/systems/NPCGenerator.js (ADD campaign dialogue)
src/ui/SettlementUI.js (PASS episode context)
src/main.js (INITIALIZE campaign)
QuestManager.js Changes:

class QuestManager {
  completeQuest(questId) {
    const quest = this.getQuest(questId);

    // Campaign quest completion
    if (quest.type === 'campaign') {
      const currentEpisode = gameState.get('campaignProgress') || 1;
      const nextEpisode = currentEpisode + 1;

      if (nextEpisode <= 10) {
        campaignManager.advanceEpisode(nextEpisode);
        gameState.set('campaignProgress', nextEpisode);

        // Generate next episode quest
        const nextQuest = campaignManager.getEpisodeData(nextEpisode);
        this.addQuest(nextQuest);

        gameState.addMessage(`🎬 Episode ${nextEpisode}: ${nextQuest.name}`, 'campaign');
      } else {
        // Campaign complete!
        gameState.set('campaignComplete', true);
        this.showCampaignEndingCutscene();
      }
    }

    // Normal quest completion...
  }

  // New objective types
  onBossDefeated(bossId) {
    const activeQuests = this.getActiveQuests();
    for (const quest of activeQuests) {
      for (const obj of quest.objectives) {
        if (obj.type === 'bossEncounter' && obj.requirement.bossId === bossId) {
          obj.completed = true;
          this.checkQuestCompletion(quest.id);
        }
      }
    }
  }

  onNPCInteraction(npcId, topic) {
    // Similar tracking for NPC interaction objectives
  }
}
NPCGenerator.js Changes:

class NPCGenerator {
  generateDialogue(npcRole, settlementId) {
    const campaignId = gameState.get('worldConfig')?.campaignId || 'default';
    const episode = gameState.get('campaignProgress') || 1;

    const campaignDialogue = campaignManager.getGenericNPCDialogue(episode);

    return {
      greeting: rng.choice(campaignDialogue.greetings),
      topics: {
        ...this.generateGenericTopics(npcRole),
        ...campaignDialogue.topics
      },
      farewell: this.selectFarewell(npcRole)
    };
  }
}
Acceptance Criteria:
✅ Quest log shows "Episode 1: Arrival in the Verge"
✅ Completing Episode 1 quest advances to Episode 2
✅ Generic NPCs say episode-appropriate dialogue
✅ Campaign progress displayed in HUD
✅ Episode 10 completion shows ending cutscene
Phase 5: Visual Theming & Polish (Week 5)
Tasks:
Campaign-Specific Visual Styling:
Add styles-voidborn.css with purple/void color palette
Void Rift terrain: Dark purple gradient background
Corrupted Land terrain: Indigo/violet tint
Boss health bars: Red with purple glow/pulse effect
Voidborn enemy cards: Purple border in combat
Campaign UI elements: Subtle void-themed accents
Episode transition: Purple fade effect with void particles
UI Enhancements:
Campaign episode tracker in HUD (shows "Episode 1/10: Arrival in the Verge")
Boss health bars with distinct styling (larger, pulsing, red-purple gradient)
NPC encounter icons on map (☺ with golden glow for named NPCs)
World map NPC dialogue modal (similar to settlement UI but distinct styling)
Episode transition cutscenes (fade to purple, show episode title card)
Balance Tuning (Episodes 1-3 Only):
Test Episode 1-3 for difficulty curve
Adjust Rift Guardian boss stats for level 3-4 players
Tune XP rewards for episode completion (500, 750, 1500)
Test Void Spawn prevalence (30% in Ep1, 50% goblin replacement in Ep2)
Bug Fixes:
Boss respawn prevention (defeatedBosses flag in gameState)
NPC encounter persistence (world map NPCs stay until interacted)
Episode progress save/load (campaignProgress in save data)
Dialogue trigger edge cases (HP threshold rounding, multiple triggers)
Vex appearance in multiple episodes (don't duplicate)
Documentation:
Update CLAUDE.md with campaign system architecture
Document Episode 4-10 placeholder structure for future implementation
Add inline code comments to all new managers
Create campaign design guidelines (how to add new campaigns)
Acceptance Criteria:
✅ Full Episodes 1-3 playthrough without bugs
✅ Boss fights feel epic (pre-combat dialogue, mid-battle triggers, enhanced stats)
✅ Vex encounter feels meaningful (recurring companion with dialogue)
✅ Campaign progression feels smooth (Episode 1 → 2 → 3 transitions)
✅ Generic NPC dialogue reacts to episode (Episodes 1-2 vs 3-5 dialogue)
✅ Save/load preserves campaign state (episode, defeated bosses, NPC encounters)
✅ Purple/void visual theme applied (terrains, bosses, UI accents)
✅ Episodes 4-10 data complete (designed but not fully implemented)
Migration Strategy
From Current 4-Stage System to 10-Episode System
Backwards Compatibility:
Keep quests.json for side quests (not campaign)
Deprecate campaignQuests array in quests.json
Add campaigns.json as primary campaign source
Legacy saves auto-convert: If save has old campaign, map to default campaign
Save File Migration:

function migrateSaveData(saveData) {
  if (saveData.version < 2.0) {
    // Old campaign stage (1-4) → New episode (1-10)
    const stageToEpisodeMap = { 1: 1, 2: 3, 3: 7, 4: 10 };
    saveData.campaignProgress = stageToEpisodeMap[saveData.campaignStage] || 1;
    delete saveData.campaignStage;
  }
  return saveData;
}
Character Creation Flow:
Campaign selection dropdown now loads from campaigns.json
Default campaign: "Terrors of the Voidborn"
Future campaigns added to dropdown automatically
Performance & Optimization Considerations
Data Loading Strategy
Lazy load campaigns.json: Only on New Game, not main menu
Cache campaign in memory: Don't reload on every episode check
Pre-compute monster pools: Calculate override pools at episode start, cache for session
Boss data on-demand: Load boss definition only when spawning boss encounter
World Generation Performance
Episode checks are cheap: Simple number comparison
Override application is efficient: Monster pool filtering is O(n)
NPC spawns are conditional: Only check NPC spawns in relevant regions
Boss spawns are rare: Max 1-2 bosses per episode
Save File Size
Campaign state adds minimal data:
campaignId: string (20 bytes)
campaignProgress: number (4 bytes)
defeatedBosses: array of strings (50-100 bytes)
Total: ~150 bytes overhead
Future Expansion: Additional Campaigns
The system is designed for extensibility. Future campaigns can be added by:
Adding to campaigns.json:
Define new campaign ID
Write 10 episodes
Define custom monsters/terrains/items
No code changes required (ideally):
Campaign selection dropdown auto-populates
World generation uses same override system
Quest system handles any episode structure
Example Future Campaigns:
"The Crimson Plague" (undead/disease theme)
"War of the Eternal Flame" (elemental warfare)
"The Forgotten Gods" (divine/cult theme)
Summary of Critical Files
New Files (6):
data/campaigns.json - Campaign definitions
src/systems/CampaignManager.js - Campaign coordination
src/systems/WorldEncounterManager.js - World map NPC spawning
src/systems/BossEncounterManager.js - Boss fights
Modified Files (8):
data/monsters.json - Add Voidborn creatures
data/terrains.json - Add Void Rift, Corrupted Land
data/items.json - Add campaign items
src/systems/WorldGenerator.js - Campaign-aware generation
src/systems/Player.js - Encounter handlers, item usage
src/systems/CombatManager.js - Boss support
src/systems/QuestManager.js - 10-episode support
src/systems/NPCGenerator.js - Campaign dialogue
src/ui/SettlementUI.js - Dialogue context
src/main.js - Campaign initialization
Implementation Risks & Mitigations
Risk 1: Complexity Overload
Risk: Too many interconnected systems, hard to debug Mitigation:
Implement Phase 1 (data) completely before Phase 2 (code)
Test each manager independently before integration
Use CampaignManager as single source of truth (loose coupling)
Risk 2: Performance Degradation
Risk: Campaign checks slow down world generation Mitigation:
Cache campaign data in memory
Pre-compute override pools
Profile world generation with campaign vs without
Risk 3: Save/Load Compatibility
Risk: Campaign state breaks old saves Mitigation:
Implement save migration system
Add version field to save data
Test loading old saves with new code
Risk 4: Balancing Difficulty
Risk: Boss fights too easy/hard, episode pacing off Mitigation:
Make boss stats configurable (easy to tune)
Playtesting with different character builds
CR-based scaling as fallback
Next Steps After Plan Approval
Review Plan with User:
Confirm 10-episode structure matches vision
Confirm "Terrors of the Voidborn" narrative direction
Confirm boss/NPC encounter approach
Confirm campaign-specific generation approach
Clarify Scope:
Implement all 10 episodes or just Episode 1 MVP?
Implement full dialogue system or simplified version?
Boss abilities system full or basic?
Begin Phase 1:
Create campaigns.json with Episode 1 fully detailed
Add Voidborn monsters to monsters.json
Add Void terrain to terrains.json
Add campaign items to items.json
End of Plan