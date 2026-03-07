/**
 * Nexus Verge - Rules Engine
 * Centralized configuration for all game rules and mechanics
 * Easily modifiable for balance tuning and homebrew content
 */

export const RULES = {
    // ====================
    // CORE D&D 5E RULES
    // ====================
    core: {
        abilityScoreMax: 20,
        abilityScoreMin: 1,
        levelMax: 20,
        levelMin: 1,

        // Proficiency bonus by character level
        proficiencyBonusByLevel: {
            1: 2, 2: 2, 3: 2, 4: 2,
            5: 3, 6: 3, 7: 3, 8: 3,
            9: 4, 10: 4, 11: 4, 12: 4,
            13: 5, 14: 5, 15: 5, 16: 5,
            17: 6, 18: 6, 19: 6, 20: 6
        },

        // Standard array for ability scores
        standardArray: [15, 14, 13, 12, 10, 8],

        // Point buy costs
        pointBuyCosts: {
            8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
        },
        pointBuyTotal: 27,
        pointBuyMin: 8,
        pointBuyMax: 15,

        // Advantage/disadvantage mode
        advantageMode: 'rollTwice' // "rollTwice" or "static" (+5/-5)
    },

    // ====================
    // COMBAT RULES
    // ====================
    combat: {
        // Critical hits
        criticalHitRange: [20], // Natural 20
        criticalMissRange: [1],  // Natural 1
        criticalHitDamageMultiplier: 2, // Roll damage dice twice

        // Opportunity attacks
        opportunityAttacks: true,
        opportunityAttackRange: 5, // feet (1 square)

        // Death and dying
        deathSaveDC: 10,
        deathSaveSuccessThreshold: 3,
        deathSaveFailureThreshold: 3,
        instantDeathThreshold: 'maxHP', // or specific number

        // Cover bonuses
        coverBonuses: {
            half: 2,         // +2 AC and DEX saves
            threeQuarters: 5, // +5 AC and DEX saves
            full: Infinity    // Can't be targeted directly
        },

        // Initiative
        initiative: {
            tiebreaker: 'dexterity' // "dexterity", "reroll", or "random"
        },

        // Flanking (optional rule)
        flanking: false, // If true, flanking grants advantage

        // Grid combat
        gridSize: 5, // feet per square
        diagonalMovementCost: 1 // 1 (simple) or 1.5 (alternating 5/10)
    },

    // ====================
    // DIFFICULTY SCALING
    // ====================
    difficulty: {
        // Base difficulty settings (Easy, Normal, Hard)
        levels: {
            easy: {
                skillCheckDCModifier: -2,  // Reduce DC by 2
                enemyCRModifier: -0.5,     // Enemies 0.5 CR lower
                encounterFrequency: 0.7,   // 70% of normal encounters
                enemyStatMultiplier: 0.9  // 90% HP/damage
            },
            normal: {
                skillCheckDCModifier: 0,
                enemyCRModifier: 0,
                encounterFrequency: 1.0,
                enemyStatMultiplier: 1.0
            },
            hard: {
                skillCheckDCModifier: +2,  // Increase DC by 2
                enemyCRModifier: +1,       // Enemies 1 CR higher
                encounterFrequency: 1.3,   // 130% encounter rate
                enemyStatMultiplier: 1.2  // 120% HP/damage
            }
        },

        // Scaling by player level
        scalingByLevel: {
            // DC increases as player levels up
            skillCheckDCScaling: {
                1: 0,
                5: +2,
                10: +4,
                15: +6,
                20: +8
            },
            // Enemy types available at each level bracket (cumulative with lower brackets)
            // All IDs must exist in data/monsters.json
            enemyTypesByLevel: {
                1: ['commoner', 'bandit', 'kobold', 'giantRat', 'goblin', 'stirge', 'goblinArcher', 'banditCrossbowman'],
                3: ['goblin', 'wolf', 'skeleton', 'zombie', 'gnoll', 'shadow', 'scout', 'giantSpider', 'direWolf'],
                5: ['orc', 'bugbear', 'ghoul', 'giantHyena', 'specter', 'spy', 'ogre', 'ghast', 'berserker', 'gargoyle', 'manticore'],
                7: ['minotaur', 'wight', 'owlbear', 'veteran', 'flameskull', 'ettin', 'mage', 'medusa'],
                10: ['troll', 'wraith', 'hillGiant', 'youngWhiteDragon']
            }
        }
    },

    // ====================
    // PROGRESSION
    // ====================
    progression: {
        // XP thresholds by level (D&D 5e PHB)
        xpTable: {
            1: 0,
            2: 300,
            3: 900,
            4: 2700,
            5: 6500,
            6: 14000,
            7: 23000,
            8: 34000,
            9: 48000,
            10: 64000,
            11: 85000,
            12: 100000,
            13: 120000,
            14: 140000,
            15: 165000,
            16: 195000,
            17: 225000,
            18: 265000,
            19: 305000,
            20: 355000
        },

        // XP multiplier for adjusting leveling speed
        xpMultiplier: 1.0,

        // ASI (Ability Score Improvement) levels
        asiLevels: [4, 8, 12, 16, 19],

        // Max ability score increase per ASI
        asiIncrease: 2 // Can split into two +1s
    },

    // ====================
    // ENCOUNTER GENERATION
    // ====================
    encounters: {
        // Encounter frequency (chance per wilderness tile)
        combatFrequency: 0.15,      // 15% base chance
        trapFrequency: 0.05,        // 5% in dungeons
        socialEncounterFrequency: 0.08, // 8% in towns
        treasureFrequency: 0.10,    // 10% hidden caches

        // CR scaling method
        crScaling: 'xpBudget', // "xpBudget" (D&D 5e proper), "levelBased" (legacy), "static", "randomRange"

        // Legacy CR offset (kept for backward compat, prefer xpBudget)
        crRangeOffset: [-1, 2],

        // Encounter size (number of enemies)
        encounterSize: {
            min: 1,
            max: 3,
            scaleWithLevel: true
        },

        // ===================================
        // D&D 5e XP BUDGET ENCOUNTER BUILDING
        // ===================================

        // XP thresholds per character level (DMG p.82)
        // Budget = threshold[level][difficulty] × partySize
        encounterXPThresholds: {
            1:  { easy: 25,   medium: 50,   hard: 75,    deadly: 100   },
            2:  { easy: 50,   medium: 100,  hard: 150,   deadly: 200   },
            3:  { easy: 75,   medium: 150,  hard: 225,   deadly: 400   },
            4:  { easy: 125,  medium: 250,  hard: 375,   deadly: 500   },
            5:  { easy: 250,  medium: 500,  hard: 750,   deadly: 1100  },
            6:  { easy: 300,  medium: 600,  hard: 900,   deadly: 1400  },
            7:  { easy: 350,  medium: 750,  hard: 1100,  deadly: 1700  },
            8:  { easy: 450,  medium: 900,  hard: 1400,  deadly: 2100  },
            9:  { easy: 550,  medium: 1100, hard: 1600,  deadly: 2400  },
            10: { easy: 600,  medium: 1200, hard: 1900,  deadly: 2800  }
        },

        // XP value by Challenge Rating (DMG p.274)
        xpByCR: {
            0: 10, 0.125: 25, 0.25: 50, 0.5: 100,
            1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800,
            6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900
        },

        // Encounter multipliers by monster count (DMG p.82)
        // Adjusted XP = sum(monsterXP) × multiplier
        encounterMultipliers: [
            { minCount: 1, multiplier: 1 },
            { minCount: 2, multiplier: 1.5 },
            { minCount: 3, multiplier: 2 },
            { minCount: 7, multiplier: 2.5 },
            { minCount: 11, multiplier: 3 },
            { minCount: 15, multiplier: 4 }
        ],

        // Difficulty distribution for random overworld encounters
        overworldDifficultyWeights: {
            easy: 0.25,
            medium: 0.50,
            hard: 0.20,
            deadly: 0.05
        },

        // Difficulty distribution for dungeon room encounters
        dungeonDifficultyWeights: {
            easy: 0.25,
            medium: 0.30,
            hard: 0.30,
            deadly: 0.15
        },

        // Game difficulty modifiers applied to XP budget
        gameDifficultyBudgetMultiplier: {
            easy: 0.8,
            normal: 1.0,
            hard: 1.3
        },

        // Proficiency bonus by CR (for monster save DCs etc.)
        proficiencyByCR: {
            0: 2, 0.125: 2, 0.25: 2, 0.5: 2, 1: 2, 2: 2, 3: 2, 4: 2,
            5: 3, 6: 3, 7: 3, 8: 3, 9: 4, 10: 4
        },

        // ===================================
        // BOSS ENCOUNTER CONFIGURATION
        // ===================================
        bossBuffs: {
            hpMultiplier: 1.5,       // 150% of max possible HP
            acBonus: 2,
            attackBonus: 2,
            xpMultiplier: 2,
            goldMultiplier: 3,
            guaranteedLoot: true,
            extraLootRolls: 2,
            minions: { min: 1, max: 2 }  // Boss rooms spawn 1-2 adds
        },

        // Boss name prefixes and suffixes
        bossNamePrefixes: ["Ancient", "Savage", "Dire", "Shadow", "Cursed", "Elder", "Dread"],
        bossNameSuffixes: ["Warlord", "Champion", "Alpha", "Overlord", "Matriarch", "Tyrant"]
    },

    // ====================
    // LOOT GENERATION
    // ====================
    loot: {
        // Drop rate by enemy CR
        dropRateByCR: {
            0: 0.2,
            0.125: 0.3,
            0.25: 0.4,
            0.5: 0.5,
            1: 0.6,
            2: 0.65,
            3: 0.7,
            4: 0.75,
            5: 0.8,
            6: 0.85,
            7: 0.85,
            8: 0.9,
            9: 0.9,
            10: 0.95
        },

        // Item rarity chances (should sum to ~1.0)
        rarityChances: {
            common: 0.60,
            uncommon: 0.25,
            rare: 0.10,
            veryRare: 0.04,
            legendary: 0.01
        },

        // Magic item chance by player level
        magicItemChanceByLevel: {
            1: 0.05,
            2: 0.08,
            3: 0.10,
            4: 0.12,
            5: 0.15,
            10: 0.25,
            15: 0.35,
            20: 0.50
        },

        // Magic item bonus by level (+1, +2, +3 weapons/armor)
        magicItemBonusByLevel: {
            1: 0,
            5: 1,
            10: 2,
            15: 3
        }
    },

    // ====================
    // REST SYSTEM
    // ====================
    rest: {
        // Short rest
        shortRestDuration: 1,      // 1 hour (instant in-game)
        shortRestsPerLongRest: 2,  // Max 2 short rests between long rests

        // Long rest
        longRestDuration: 8,         // 8 hours (instant in-game)
        longRestRequiresTavern: true, // Must be in inn/tavern

        // Recovery
        hitDiceRecoverPerLongRest: 0.5, // Recover half (minimum 1)

        // Spell slot recovery
        shortRestSpellSlots: false, // Warlocks only (not in Phase 1)
        longRestSpellSlots: true   // All spellcasters recover on long rest
    },

    // ====================
    // NPC GENERATION
    // ====================
    npc: {
        // NPC count by settlement type and building
        countBySettlementType: {
            village: {
                tavern: { min: 3, max: 4 },      // Innkeeper + 2-3 patrons
                greathall: { min: 3, max: 4 }    // Leader + 2-3 guards/citizens
            },
            town: {
                tavern: { min: 5, max: 7 },      // Innkeeper + 4-6 patrons
                greathall: { min: 4, max: 6 }    // Leader + 3-5 guards/citizens
            },
            city: {
                tavern: { min: 7, max: 11 },     // Innkeeper + 6-10 patrons
                greathall: { min: 6, max: 10 }   // Leader + 5-9 guards/citizens
            }
        },

        // Quest offering chance by NPC role
        questChanceByRole: {
            innkeeper: 0.50,     // 50% chance
            patron: 0.30,        // 30% chance
            merchant: 0.40,      // 40% chance
            blacksmith: 0.30,    // 30% chance
            leader: 0.80,        // 80% chance
            guard: 0.60,         // 60% chance
            citizen: 0.20        // 20% chance
        },

        // NPC personality types
        personalityTypes: [
            'friendly', 'grumpy', 'mysterious', 'fearful',
            'jovial', 'stern', 'greedy', 'nervous',
            'wise', 'honorable', 'proud'
        ]
    },

    // ====================
    // MERCHANT & TRADING
    // ====================
    merchant: {
        // Pricing
        chaModifierPercent: 0.01,    // 1% per CHA modifier point
        baseSellMultiplier: 0.5,     // Players sell items at 50% base value

        // Inventory size by settlement type
        inventoryBySettlementType: {
            village: {
                minItems: 8,
                maxItems: 12,
                allowedRarities: ['common']
            },
            town: {
                minItems: 12,
                maxItems: 18,
                allowedRarities: ['common', 'uncommon']
            },
            city: {
                minItems: 18,
                maxItems: 25,
                allowedRarities: ['common', 'uncommon', 'rare']
            }
        }
    },

    // ====================
    // ABILITIES
    // ====================
    abilities: {
        enabled: true,
        effectDispatcher: { enabled: true }
    },

    // SKILLS
    // ====================
    skills: {
        // Base difficulty classes
        baseDC: {
            veryEasy: 5,
            easy: 10,
            medium: 15,
            hard: 20,
            veryHard: 25,
            nearlyImpossible: 30
        },

        // Passive bonus (Passive Perception = 10 + Perception)
        passiveBonus: 10,

        // Advantage/disadvantage on passive scores
        passiveAdvantageBonus: 5,
        passiveDisadvantageBonus: -5,

        // Expertise multiplier (Rogue feature)
        expertiseMultiplier: 2
    },

    // ====================
    // SKILL CHALLENGES
    // ====================
    skillChallenges: {
        // Balance system for skill challenge rewards
        balancing: {
            // Skill value multipliers - skills with high external value get lower challenge rewards
            // very_high: Skills that already provide major benefits (stealth = sneak attack + combat avoidance)
            // high: Skills with significant external benefits (influence = better prices, quest alternatives)
            // medium: Skills with moderate external benefits (investigation = find clues)
            // low: Skills with limited external benefits (athletics = grapple, climb)
            // very_low: Rarely-used skills that need incentive
            skillValueMultipliers: {
                very_high: 0.5,   // 50% rewards (stealth, perception)
                high: 0.75,       // 75% rewards (influence, deception)
                medium: 1.0,      // 100% rewards (investigation, arcana)
                low: 1.25,        // 125% rewards (athletics, endurance)
                very_low: 1.5     // 150% rewards (rarely-used skills)
            },

            // Base reward rates - starting point for scaling
            baseRewardRates: {
                xpPerDCPoint: 10,       // 10 XP per DC point
                goldPerDCPoint: 5,      // 5 gold per DC point
                lootChancePerDC: 0.02   // 2% loot chance per DC point
            },

            // Level scaling parameters
            levelScaling: {
                dcIncreasePerLevel: 0.5,      // +0.5 DC per player level
                xpMultiplierPerLevel: 0.15,   // +15% XP per level
                goldMultiplierPerLevel: 0.20  // +20% gold per level
            },

            // Risk level modifiers - higher risk (combat on failure) = higher rewards
            riskLevelModifiers: {
                low: 0.8,      // 80% rewards (low risk)
                medium: 1.0,   // 100% rewards (standard)
                high: 1.3,     // 130% rewards (failure = combat)
                deadly: 1.6    // 160% rewards (failure = death possible)
            },

            // Critical success/failure thresholds
            criticalThresholds: {
                naturalCrit: true,          // Natural 20/1 = critical
                marginCrit: true,           // ±10 from DC = critical
                critMargin: 10,             // DC ± 10 triggers critical
                critSuccessBonus: 0.5,      // +50% rewards on crit success
                critFailureSeverity: 1.5    // 150% damage/consequences on crit failure
            },

            // Trigger frequency modifiers by context
            triggerFrequencyModifiers: {
                terrain_base: 1.0,          // 1.0 = use challenge's base frequency (15-25%)
                quest_objective: 10.0,      // 10.0 = guaranteed trigger if quest requires
                npc_dialogue: 1.0,          // 1.0 = use base frequency for NPC dialogue
                dungeon_feature: 1.5        // 1.5 = 50% higher chance in dungeons
            },

            // Loot chance modifiers by skill value
            lootChanceBySkillValue: {
                very_high: 0.3,   // 30% base loot chance (stealth, perception)
                high: 0.5,        // 50% (influence, deception)
                medium: 0.7,      // 70% (investigation, arcana)
                low: 1.0,         // 100% (athletics, endurance)
                very_low: 1.2     // 120% (can roll multiple times)
            }
        },

        // Challenge difficulty scaling by player level
        difficultyScaling: {
            enabled: true,
            method: 'additive' // "additive" or "multiplicative"
        },

        // Cooldown system to prevent spam
        cooldowns: {
            enabled: true,
            defaultCooldown: 300000, // 5 minutes in milliseconds
            perChallengeOverride: true // Allow per-challenge cooldown settings
        },

        // Critical success/failure outcomes
        criticals: {
            enabled: true,
            naturalCritOnly: false,  // If false, also check margin (±10 from DC)
            critSuccessRewards: {
                xpBonus: 0.5,        // +50% XP
                goldBonus: 0.5,      // +50% gold
                lootRollsBonus: 1    // +1 extra loot roll
            },
            critFailureConsequences: {
                damageMultiplier: 1.5,  // 150% damage
                conditionChance: 0.5     // 50% chance of additional condition
            }
        }
    },

    // ====================
    // WORLD GENERATION
    // ====================
    worldGen: {
        // Region size (tiles per region chunk)
        regionSize: 32, // 32x32 tiles per region

        // World size configuration (finite world boundaries)
        worldSizes: {
            small: 50,    // 50x50 regions = 1,600x1,600 tiles (~50 MB metadata)
            medium: 100,  // 100x100 regions = 3,200x3,200 tiles (~200 MB metadata)
            large: 150    // 150x150 regions = 4,800x4,800 tiles (~450 MB metadata)
        },

        // ====================
        // FEATURE GENERATION
        // ====================
        // All frequencies/counts scale with world size automatically.
        // Base values are calibrated for 'medium' size (100x100 regions = 10,000 regions).
        // Campaigns can override these via campaignOverrides below.
        //
        // Formula: actualCount = baseCount * (worldRegions / 10000)
        // Example: medium world (10,000 regions) with baseSettlements 150 = 150 settlements
        //          small world (2,500 regions) = 37 settlements
        //          large world (22,500 regions) = 337 settlements

        featureGeneration: {
            // --- SETTLEMENTS ---
            // Total settlements across the world (scales with size)
            baseSettlements: 150,         // ~150 settlements in medium world

            // Distribution ratios (must sum to 1.0)
            settlementDistribution: {
                village: 0.60,            // 60% villages (~90 in medium)
                town: 0.30,               // 30% towns (~45 in medium)
                city: 0.10                // 10% cities (~15 in medium)
            },

            // Minimum spacing between settlements (in regions)
            settlementSpacing: {
                village: 3,               // Villages can be closer together
                town: 5,                  // Towns need breathing room
                city: 10                  // Cities are far apart
            },

            // --- DUNGEONS ---
            baseDungeons: 200,            // ~200 dungeons in medium world

            // Dungeon difficulty distribution
            dungeonDifficultyDistribution: {
                1: 0.30,                  // 30% easy (level 1-3)
                2: 0.30,                  // 30% medium (level 4-6)
                3: 0.25,                  // 25% hard (level 7-9)
                4: 0.10,                  // 10% very hard (level 10-12)
                5: 0.05                   // 5% deadly (level 13+)
            },

            // --- SANCTUARIES (Safe Rest Locations) ---
            baseSanctuaries: 100,         // ~100 sanctuaries in medium world

            // --- POINTS OF INTEREST (POIs) ---
            basePOIs: 300,                // ~300 POIs in medium world

            // POI type distribution
            poiDistribution: {
                shrine: 0.20,             // 20% shrines (minor religious sites)
                ruins: 0.25,              // 25% ruins (explorable areas)
                cave: 0.20,               // 20% caves (potential lairs)
                camp: 0.15,               // 15% camps (bandit/creature camps)
                landmark: 0.20            // 20% landmarks (navigation aids)
            },

            // --- GENERATION CONSTRAINTS ---
            // Minimum distance from world edge (in regions)
            edgeBuffer: 2,

            // Features avoid spawning on these terrains
            excludedTerrains: ['deepWater', 'shallowWater', 'mountain', 'peaks'],

            // Dungeons prefer these terrains (weighted)
            dungeonTerrainWeights: {
                mountain: 2.0,            // 2x likely in mountains
                hills: 1.5,               // 1.5x likely in hills
                forest: 1.2,              // Slightly more in forests
                default: 1.0              // Base weight for other terrains
            },

            // Sanctuary terrain preferences
            sanctuaryTerrainWeights: {
                forest: 1.5,              // Groves and glades
                grassland: 1.3,           // Open shrines
                hills: 1.2,               // Hilltop temples
                default: 1.0
            }
        },

        // Campaign-specific overrides (loaded from data/campaigns.json)
        // Example: A "wilderness survival" campaign might have:
        //   { baseSettlements: 50, baseSanctuaries: 30, baseDungeons: 300 }
        // Example: A "city intrigue" campaign might have:
        //   { baseSettlements: 300, settlementDistribution: { city: 0.40 } }
        campaignOverrides: {},

        // Legacy settings (kept for backwards compatibility, prefer featureGeneration)
        townSpacing: 5,           // Minimum regions between towns (legacy)
        villageFrequency: 0.02,   // 2% chance per region (legacy)
        dungeonFrequency: 0.10,   // 10% of regions have dungeon/ruins (legacy)

        // Noise scales for terrain generation (deprecated - see biomeGeneration)
        biomeNoiseScale: 0.05,    // Larger scale = bigger biomes
        elevationNoiseScale: 0.08,
        moistureNoiseScale: 0.06,
        riverNoiseScale: 0.12,

        // Terrain distribution thresholds (based on noise values)
        terrainThresholds: {
            water: -0.3,          // < -0.3 = deep water
            shallowWater: -0.1,   // < -0.1 = shallow water
            grassland: 0.2,       // < 0.2 = grassland
            forest: 0.4,          // < 0.4 = forest
            hill: 0.6,            // < 0.6 = hill
            mountain: 0.8        // < 0.8 = mountain
            // > 0.8 = peaks
        },

        // Starting location
        startingRegion: { x: 0, y: 0 },
        guaranteeStartingTown: true,

        // Finite world generation settings
        finiteWorld: {
            enabled: true,                    // Use finite pre-generated worlds
            defaultSize: 'medium',            // Default world size
            preGenerateMetadata: true,        // Generate all settlements/roads upfront
            terrainOnDemand: true,            // Generate terrain tiles on-demand (deterministic)
            metadataGenerationTimeout: 30000 // Max time to generate metadata (30s)
        },

        // ====================
        // CONTINENT-SCALE BIOME GENERATION
        // ====================
        biomeGeneration: {
            // Primary biome scale - creates 200-400 tile macro biomes (10x larger than before)
            // Now WIRED into generateTile() biomeNoise sampling
            continentalScale: 0.005,  // Was 0.05 in biomeNoiseScale

            // Secondary variation scale - adds local terrain variety within biomes
            regionalScale: 0.02,

            // Biome boundary sharpness (0.0-1.0)
            // Higher = sharper transitions, Lower = gradual blending
            boundarySharpness: 0.7,

            // Elevation dominance - how much elevation reduces moisture (mountains = drier)
            // Now WIRED into generateTile() moisture calculation
            elevationWeight: 0.6,  // Applied above normalizedElevation 0.6 threshold

            // Temperature latitude influence (pole-to-equator gradient)
            // Now WIRED into generateTile() temperature calculation
            // Increased from 0.4 to 0.6 for more pronounced climate bands
            latitudeInfluence: 0.6  // 0.0 = pure noise, 1.0 = realistic poles
        },

        // ====================
        // WATER BODY GENERATION
        // ====================
        waterGeneration: {
            // Ocean generation (world edges only)
            oceanEdgeDistance: 5,  // Regions from edge that are ocean
            oceanDepthFade: 3,     // Additional regions for depth gradient

            // Lake generation
            lakes: {
                minSize: 20,          // Minimum tiles for a lake
                maxSize: 150,         // Maximum tiles for a lake
                frequency: 0.15,      // Chance per suitable location
                depthThreshold: -0.25, // Elevation below this = lake core
                shallowThreshold: -0.15, // Edge of lake
                requiresBasin: true   // Must be surrounded by higher elevation
            },

            // River generation
            rivers: {
                sourceElevation: 0.6,  // Rivers start in mountains/hills
                flowWidth: 2,          // Tiles wide (main channel + banks)
                branchProbability: 0.1, // Chance of river branching
                minFlowLength: 50,     // Minimum tiles before reaching water
                connectsLakes: true    // Rivers connect lakes to ocean
            },

            // Beach generation (FIX for beach bug)
            beaches: {
                requiresAdjacentDeepWater: true,  // Must be next to lake/ocean
                minWaterBodySize: 15,  // Minimum water tiles for coastline
                elevationRange: [0.15, 0.25],  // Elevation band for beaches
                width: 1  // Tiles wide
            }
        },

        // ====================
        // URBAN SPRAWL GENERATION
        // ====================
        urbanSprawl: {
            // Urban sprawl radii by settlement type (in tiles)
            // Creates realistic urban outskirts around settlements
            // Rings: Inner = industrial, Middle = residential, Outer = farmland
            city: {
                industrial: 8,    // Inner ring: warehouses, workshops (closest to settlement)
                residential: 15,  // Middle ring: houses, shops
                farmland: 25      // Outer ring: crops, pastures (farthest)
            },
            town: {
                industrial: 5,    // Inner ring
                residential: 10,  // Middle ring
                farmland: 18      // Outer ring
            },
            village: {
                industrial: 3,    // Inner ring
                residential: 5,   // Middle ring
                farmland: 10      // Outer ring
            }
        },

        // ====================
        // MOUNTAIN RANGE GENERATION
        // ====================
        mountainGeneration: {
            // Elevation thresholds for mountain layers
            peakElevation: 0.90,      // Impassable peaks
            slopeElevation: 0.80,     // Difficult slopes
            foothillElevation: 0.70,  // Moderate hills

            // Ridge factor requirements (mountain ridge noise)
            peakRidge: 0.6,    // High ridge = sharp peaks
            slopeRidge: 0.5,   // Moderate ridge = slopes
            foothillRidge: 0.3, // Low ridge = foothills

            // Range continuity (how connected mountains are)
            rangeContinuity: 0.7,  // 0.0-1.0 (higher = longer ranges)

            // Valley width between parallel ranges
            valleyWidth: 3  // Tiles between ranges
        }
    },

    // ====================
    // BIOME TERRAIN POOLS
    // ====================
    biomes: {
        // Macro biome definitions - each biome restricts which terrain types can appear
        // UPDATED: Biome-exclusive terrain pools for better world coherence
        terrainPools: {
            // Pure water biome (world edges only)
            ocean: ['ocean', 'deepWater'],

            // Ocean transition biome (beach retired - not orientation-safe)
            coastal: ['shallowWater', 'grassland', 'plains'],

            // Temperate forest biome (no tundra mixing)
            temperateForest: ['grassland', 'plains', 'forest', 'denseForest'],

            // Boreal forest biome (taiga/conifer on snow)
            coldForest: ['snowForest', 'tundra', 'snowyPlains'],

            // Pure grassland biome
            grassland: ['plains', 'grassland', 'savanna'],

            // Pure desert biome (EXCLUSIVE - single terrain type)
            desert: ['desert'],

            // Tropical rainforest biome (wet tropics only)
            jungle: ['jungle', 'swamp', 'denseForest'],

            // Mountain biome (added mountainPeak for impassable summits, desertHills for hot/dry context)
            mountain: ['hills', 'desertHills', 'mountain', 'mountainPeak'],

            // Pure polar biome (EXCLUSIVE - no temperate mixing)
            tundra: ['snowyPlains', 'tundra'],

            // Wetlands biome
            swampland: ['swamp', 'shallowWater', 'grassland'],

            // Alpine biome (high cold mountain valleys - below peaks, above treeline)
            alpine: ['snowyPlains', 'tundra', 'mountain'],

            // Badlands biome (warm very-dry eroded terrain - cracked earth and ridges)
            badlands: ['desertHills', 'plains', 'desert']
        },

        // Macro biome selection based on elevation, moisture, temperature
        // This determines which pool to use for terrain selection
        macroTypes: {
            ocean: 'ocean',
            coastal: 'coastal',
            temperateForest: 'temperateForest',
            coldForest: 'coldForest',
            grassland: 'grassland',
            desert: 'desert',
            jungle: 'jungle',
            mountain: 'mountain',
            tundra: 'tundra',
            swampland: 'swampland',
            alpine: 'alpine',
            badlands: 'badlands'
        }
    },

    // ====================
    // REPUTATION SYSTEM
    // ====================
    reputation: {
        // Reputation levels (0-100 scale)
        levels: {
            stranger: { min: 0, max: 19 },
            acquaintance: { min: 20, max: 39 },
            friendly: { min: 40, max: 59 },
            honored: { min: 60, max: 79 },
            exalted: { min: 80, max: 100 }
        },

        // Reputation rewards from quests
        questRewards: {
            trivial: 5,
            easy: 10,
            medium: 15,
            hard: 20,
            deadly: 30
        },

        // Reputation loss from opposing faction quests
        opposingFactionPenalty: -10
    },

    // ====================
    // QUEST SYSTEM
    // ====================
    quests: {
        // Quest generation frequency
        questsPerSettlement: {
            village: 1,
            town: 2,
            city: 4
        },

        // Quest difficulty scaling
        questDifficultyByLevel: {
            1: 'easy',
            3: 'medium',
            5: 'medium',
            7: 'hard',
            10: 'hard'
        },

        // Quest rewards
        baseXPReward: 100,
        xpMultiplierByDifficulty: {
            trivial: 0.5,
            easy: 1.0,
            medium: 1.5,
            hard: 2.0,
            deadly: 3.0
        }
    },

    // ====================
    // SPELLCASTING
    // ====================
    spellcasting: {
        // Spell slot recovery
        recoverSlotsOnLongRest: true,
        recoverSlotsOnShortRest: false, // Warlocks only

        // Concentration
        concentrationCheckDC: 10, // Or half damage taken, whichever is higher

        // Spell save DC formula: 8 + proficiency + spellcasting ability mod
        spellSaveDCBase: 8,

        // Spell attack bonus formula: proficiency + spellcasting ability mod
        // (no base)

        // Upcasting
        allowUpcasting: true
    },

    // ====================
    // FLEE MECHANIC
    // ====================
    flee: {
        enabled: true,
        baseDC: 10,
        dcPerExtraEnemy: 2,
        dcCapMax: 25,
        bossDCBonus: 5,
        ambushDCBonus: 3,
        ambushRoundLimit: 1,
        modifier: ['dex', 'wis'],          // take max of these two modifiers
        addProficiency: true,
        actionCost: 'action',
        opportunityAttacks: {
            enabled: true,
            requiresEngaged: true,          // only engaged enemies attack
            requiresMelee: true,            // only melee-type enemies attack
            resolveBeforeCheck: true
        },
        blockingConditions: ['restrained', 'grappled', 'stunned', 'paralyzed', 'unconscious'],
        disadvantageConditions: ['prone'],
        advantageConditions: ['frightened'],
        cunningAction: {
            callingId: 'wanderlust',
            levelRequired: 2,
            actionCost: 'bonusAction'
            // No advantage — bonus action cost is the only differentiator
        },
        rangedHarassmentAttacks: false      // dormant — enable if ranged flee becomes dominant
    },

    // ====================
    // CAMPAIGN
    // ====================
    campaign: {
        // Campaign length (number of stages)
        stagesPerCampaign: {
            short: 3,
            medium: 5,
            long: 7
        },

        // Victory conditions
        victoryXP: 0, // Bonus XP on campaign completion
        victoryReputation: 50 // Bonus reputation with relevant faction
    },

    // ====================
    // MOVEMENT & ENCOUNTERS
    // ====================
    movement: {
        // Base move delay in ms for standard (movementCost 1.0) terrain
        baseMoveDelay: 150,
        // Cap on delay multiplier — prevents extreme frustration in swamp/jungle
        maxMoveDelayMultiplier: 2.0,

        // Step accumulator threshold — encounter check fires once this much
        // movement cost has been accumulated (not every tile)
        encounterAccumulatorThreshold: 10,
        // Per-check probability base — multiplied by terrain encounterModifier
        // Net rate per tile = encounterModifier × movementCost × baseEncounterProbability / threshold
        baseEncounterProbability: 0.10
    },

    // ====================
    // DISPLAY / ZOOM
    // ====================
    zoom: {
        // Available tile sizes in pixels (must be sorted ascending)
        levels: [10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 40, 48],
        // Default index into levels array (16px = 1×, matches startup tile size)
        defaultIndex: 3,
        // Base size for multiplier display (this size = 1×)
        baseSize: 16,
        // localStorage key for persisting user preference
        storageKey: 'nexusVerge_zoomIndex'
    }
};

/**
 * Get proficiency bonus for a given level
 * @param {number} level - Character level
 * @returns {number} - Proficiency bonus
 */
export function getProficiencyBonus(level) {
    return RULES.core.proficiencyBonusByLevel[level] || 2;
}

/**
 * Get XP required for next level
 * @param {number} currentLevel - Current character level
 * @returns {number} - XP needed for next level
 */
export function getXPForLevel(currentLevel) {
    return RULES.progression.xpTable[currentLevel + 1] || Infinity;
}

/**
 * Get current level from XP total
 * @param {number} xp - Total XP
 * @returns {number} - Character level
 */
export function getLevelFromXP(xp) {
    const levels = Object.entries(RULES.progression.xpTable)
        .map(([level, requiredXP]) => ({ level: parseInt(level), xp: requiredXP }))
        .sort((a, b) => b.xp - a.xp); // Sort descending

    for (const { level, xp: requiredXP } of levels) {
        if (xp >= requiredXP) {
            return level;
        }
    }
    return 1;
}

/**
 * Get base skill check DC for difficulty level and player level
 * @param {string} difficulty - "veryEasy", "easy", "medium", "hard", "veryHard"
 * @param {number} playerLevel - Current player level
 * @param {string} gameDifficulty - "easy", "normal", "hard"
 * @returns {number} - DC
 */
export function getSkillCheckDC(difficulty, playerLevel, gameDifficulty = 'normal') {
    let baseDC = RULES.skills.baseDC[difficulty] || 15;

    // Apply game difficulty modifier
    const difficultyMod = RULES.difficulty.levels[gameDifficulty]?.skillCheckDCModifier || 0;
    baseDC += difficultyMod;

    // Apply level scaling
    const levelBrackets = Object.entries(RULES.difficulty.scalingByLevel.skillCheckDCScaling)
        .map(([level, mod]) => ({ level: parseInt(level), mod }))
        .sort((a, b) => b.level - a.level); // Sort descending

    for (const { level, mod } of levelBrackets) {
        if (playerLevel >= level) {
            baseDC += mod;
            break;
        }
    }

    return baseDC;
}

/**
 * Get reputation level name from reputation score
 * @param {number} reputation - Reputation score (0-100)
 * @returns {string} - Reputation level name
 */
export function getReputationLevel(reputation) {
    for (const [level, { min, max }] of Object.entries(RULES.reputation.levels)) {
        if (reputation >= min && reputation <= max) {
            return level;
        }
    }
    return 'stranger';
}

/**
 * Calculate encounter CR for player level
 * @param {number} playerLevel - Player level
 * @param {string} difficulty - Game difficulty
 * @returns {number} - Suggested CR
 */
export function getEncounterCR(playerLevel, difficulty = 'normal') {
    const difficultyMod = RULES.difficulty.levels[difficulty]?.enemyCRModifier || 0;
    const [min, max] = RULES.encounters.crRangeOffset;

    const offset = Math.floor(Math.random() * (max - min + 1)) + min;
    const cr = Math.max(0, playerLevel + offset + difficultyMod);

    return cr;
}

/**
 * Check if level grants an ASI (Ability Score Improvement)
 * @param {number} level - Character level
 * @returns {boolean} - True if this level grants ASI
 */
export function isASILevel(level) {
    return RULES.progression.asiLevels.includes(level);
}

/**
 * Calculate scaled feature counts based on world size
 * Base values are calibrated for 'medium' size (10,000 regions)
 *
 * @param {string} worldSize - 'small', 'medium', or 'large'
 * @param {Object} campaignOverrides - Optional campaign-specific overrides
 * @returns {Object} - Scaled feature generation parameters
 */
export function getScaledFeatureGeneration(worldSize = 'medium', campaignOverrides = {}) {
    const sizes = RULES.worldGen.worldSizes;
    const regionCount = sizes[worldSize] || sizes.medium;
    const totalRegions = regionCount * regionCount;
    const baseRegions = 10000; // Medium world baseline

    const scaleFactor = totalRegions / baseRegions;
    const fg = { ...RULES.worldGen.featureGeneration };

    // Apply campaign overrides first
    const overrides = { ...RULES.worldGen.campaignOverrides, ...campaignOverrides };
    Object.assign(fg, overrides);

    // Worldbuilder overrides are already scaled to final counts (preScaled: true).
    // Campaign JSON overrides are base counts and must be scaled by world size.
    const sf = fg.preScaled ? 1 : scaleFactor;

    // Scale counts by world size
    return {
        // Scaled totals
        settlements: Math.round(fg.baseSettlements * sf),
        dungeons: Math.round(fg.baseDungeons * sf),
        sanctuaries: Math.round(fg.baseSanctuaries * sf),
        pois: Math.round(fg.basePOIs * sf),

        // Breakdowns
        settlementCounts: {
            village: Math.round(fg.baseSettlements * sf * fg.settlementDistribution.village),
            town: Math.round(fg.baseSettlements * sf * fg.settlementDistribution.town),
            city: Math.round(fg.baseSettlements * sf * fg.settlementDistribution.city)
        },

        poiCounts: {
            shrine: Math.round(fg.basePOIs * sf * fg.poiDistribution.shrine),
            ruins: Math.round(fg.basePOIs * sf * fg.poiDistribution.ruins),
            cave: Math.round(fg.basePOIs * sf * fg.poiDistribution.cave),
            camp: Math.round(fg.basePOIs * sf * fg.poiDistribution.camp),
            landmark: Math.round(fg.basePOIs * sf * fg.poiDistribution.landmark)
        },

        // Pass through other settings
        settlementSpacing: fg.settlementSpacing,
        dungeonDifficultyDistribution: fg.dungeonDifficultyDistribution,
        dungeonTerrainWeights: fg.dungeonTerrainWeights,
        sanctuaryTerrainWeights: fg.sanctuaryTerrainWeights,
        excludedTerrains: fg.excludedTerrains,
        edgeBuffer: fg.edgeBuffer,
        poiDistribution: fg.poiDistribution,

        // Metadata for debugging
        _meta: {
            worldSize,
            regionCount,
            totalRegions,
            scaleFactor: scaleFactor.toFixed(2)
        }
    };
}

export default RULES;
