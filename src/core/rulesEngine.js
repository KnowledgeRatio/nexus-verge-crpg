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
        advantageMode: "rollTwice", // "rollTwice" or "static" (+5/-5)
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
        instantDeathThreshold: "maxHP", // or specific number

        // Cover bonuses
        coverBonuses: {
            half: 2,         // +2 AC and DEX saves
            threeQuarters: 5, // +5 AC and DEX saves
            full: Infinity    // Can't be targeted directly
        },

        // Initiative
        initiative: {
            tiebreaker: "dexterity", // "dexterity", "reroll", or "random"
        },

        // Flanking (optional rule)
        flanking: false, // If true, flanking grants advantage

        // Grid combat
        gridSize: 5, // feet per square
        diagonalMovementCost: 1, // 1 (simple) or 1.5 (alternating 5/10)
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
                enemyStatMultiplier: 0.9,  // 90% HP/damage
            },
            normal: {
                skillCheckDCModifier: 0,
                enemyCRModifier: 0,
                encounterFrequency: 1.0,
                enemyStatMultiplier: 1.0,
            },
            hard: {
                skillCheckDCModifier: +2,  // Increase DC by 2
                enemyCRModifier: +1,       // Enemies 1 CR higher
                encounterFrequency: 1.3,   // 130% encounter rate
                enemyStatMultiplier: 1.2,  // 120% HP/damage
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
            // Enemy types change with level
            enemyTypesByLevel: {
                1: ["bandit", "giantRat", "goblin", "wolf"],
                3: ["goblin", "orc", "bugbear", "skeleton", "zombie", "wolf"],
                5: ["orc", "skeleton", "zombie"],
                7: ["bugbear", "ogre", "ghoul"],
                10: ["veteran", "werewolf", "wraith"]
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
        asiIncrease: 2, // Can split into two +1s
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
        crScaling: "levelBased", // "levelBased", "static", "randomRange"

        // CR offset from player level (min, max)
        crRangeOffset: [-1, 2], // Enemy CR = playerLevel + random(-1 to 2)

        // Encounter size (number of enemies)
        encounterSize: {
            min: 1,
            max: 3, // For Phase 1, limited to 3
            scaleWithLevel: true
        },
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
            5: 0.8
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
        longRestSpellSlots: true,   // All spellcasters recover on long rest
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
            "friendly", "grumpy", "mysterious", "fearful",
            "jovial", "stern", "greedy", "nervous",
            "wise", "honorable", "proud"
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
        expertiseMultiplier: 2,
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
            method: "additive", // "additive" or "multiplicative"
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

        // Settlement generation
        townSpacing: 5,           // Minimum regions between towns
        villageFrequency: 0.02,   // 2% chance per region
        dungeonFrequency: 0.10,   // 10% of regions have dungeon/ruins

        // Noise scales for terrain generation
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
            mountain: 0.8,        // < 0.8 = mountain
            // > 0.8 = peaks
        },

        // Starting location
        startingRegion: {x: 0, y: 0},
        guaranteeStartingTown: true,

        // Finite world generation settings
        finiteWorld: {
            enabled: true,                    // Use finite pre-generated worlds
            defaultSize: 'medium',            // Default world size
            preGenerateMetadata: true,        // Generate all settlements/roads upfront
            terrainOnDemand: true,            // Generate terrain tiles on-demand (deterministic)
            metadataGenerationTimeout: 30000, // Max time to generate metadata (30s)
        }
    },

    // ====================
    // BIOME TERRAIN POOLS
    // ====================
    biomes: {
        // Macro biome definitions - each biome restricts which terrain types can appear
        terrainPools: {
            ocean: ['ocean'],
            coastal: ['shallowWater', 'beach', 'swamp'],
            temperateForest: ['grassland', 'plains', 'forest', 'denseForest'],
            coldForest: ['tundra', 'snowyPlains'],
            grassland: ['plains', 'grassland', 'savanna'],
            desert: ['desert'],
            jungle: ['jungle', 'swamp'],
            mountain: ['hills', 'mountain'],
            tundra: ['snowyPlains', 'tundra'],
            swampland: ['swamp', 'grassland', 'shallowWater']
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
            swampland: 'swampland'
        }
    },

    // ====================
    // REPUTATION SYSTEM
    // ====================
    reputation: {
        // Reputation levels (0-100 scale)
        levels: {
            stranger: {min: 0, max: 19},
            acquaintance: {min: 20, max: 39},
            friendly: {min: 40, max: 59},
            honored: {min: 60, max: 79},
            exalted: {min: 80, max: 100}
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
        opposingFactionPenalty: -10,
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
            1: "easy",
            3: "medium",
            5: "medium",
            7: "hard",
            10: "hard"
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
        allowUpcasting: true,
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
        victoryReputation: 50, // Bonus reputation with relevant faction
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
        .map(([level, requiredXP]) => ({level: parseInt(level), xp: requiredXP}))
        .sort((a, b) => b.xp - a.xp); // Sort descending

    for (const {level, xp: requiredXP} of levels) {
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
export function getSkillCheckDC(difficulty, playerLevel, gameDifficulty = "normal") {
    let baseDC = RULES.skills.baseDC[difficulty] || 15;

    // Apply game difficulty modifier
    const difficultyMod = RULES.difficulty.levels[gameDifficulty]?.skillCheckDCModifier || 0;
    baseDC += difficultyMod;

    // Apply level scaling
    const levelBrackets = Object.entries(RULES.difficulty.scalingByLevel.skillCheckDCScaling)
        .map(([level, mod]) => ({level: parseInt(level), mod}))
        .sort((a, b) => b.level - a.level); // Sort descending

    for (const {level, mod} of levelBrackets) {
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
    for (const [level, {min, max}] of Object.entries(RULES.reputation.levels)) {
        if (reputation >= min && reputation <= max) {
            return level;
        }
    }
    return "stranger";
}

/**
 * Calculate encounter CR for player level
 * @param {number} playerLevel - Player level
 * @param {string} difficulty - Game difficulty
 * @returns {number} - Suggested CR
 */
export function getEncounterCR(playerLevel, difficulty = "normal") {
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

export default RULES;
