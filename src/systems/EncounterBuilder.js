/**
 * Nexus Verge - Encounter Builder
 * D&D 5e XP-budget encounter building system
 *
 * Replaces the broken CR-offset formula with proper DMG encounter building:
 * 1. Look up XP budget from thresholds table
 * 2. Filter available monsters by terrain, dungeon pool, campaign
 * 3. Greedily select monsters within budget (adjusted by encounter multiplier)
 * 4. Return full monster stat blocks with actions arrays attached
 */

import { RULES } from '../core/rulesEngine.js';
import { roll } from '../utils/dice.js';
import { filterByCampaign } from '../utils/campaignFilter.js';

// Cache loaded monster data to avoid repeated fetches
let cachedMonsterData = null;

/**
 * Load and cache monster data from JSON
 * @returns {Promise<Array>} Array of monster objects
 */
async function loadMonsters() {
    if (cachedMonsterData) return cachedMonsterData;
    const response = await fetch('data/monsters.json');
    const data = await response.json();
    cachedMonsterData = data.monsters;
    return cachedMonsterData;
}

/**
 * Invalidate cached monster data (call after dynamic monster changes)
 */
export function clearMonsterCache() {
    cachedMonsterData = null;
}

/**
 * Get the encounter multiplier for a given monster count
 * @param {number} count - Number of monsters
 * @returns {number} Multiplier
 */
function getEncounterMultiplier(count) {
    const multipliers = RULES.encounters.encounterMultipliers;
    let multiplier = 1;
    for (const entry of multipliers) {
        if (count >= entry.minCount) {
            multiplier = entry.multiplier;
        }
    }
    return multiplier;
}

/**
 * Get XP value for a monster's Challenge Rating
 * @param {number} cr - Challenge Rating
 * @returns {number} XP value
 */
export function getXPForCR(cr) {
    return RULES.encounters.xpByCR[cr] ?? 0;
}

/**
 * Roll a random difficulty tier based on weight distribution
 * @param {Object} weights - { easy: 0.25, medium: 0.50, hard: 0.20, deadly: 0.05 }
 * @param {Function} rng - Random number generator (0-1)
 * @returns {string} Difficulty tier name
 */
function rollDifficulty(weights, rng) {
    const rand = typeof rng === 'function' ? rng() : Math.random();
    let cumulative = 0;
    for (const [tier, weight] of Object.entries(weights)) {
        cumulative += weight;
        if (rand <= cumulative) return tier;
    }
    return 'medium'; // fallback
}

/**
 * Create an enemy character object from a monster stat block
 * Attaches monster actions directly so CombatManager can use them
 *
 * @param {Object} monster - Monster data from monsters.json
 * @param {Object} options - { isBoss: false }
 * @returns {Object} Enemy character object for CombatManager
 */
function createEnemyFromMonster(monster, options = {}) {
    const { isBoss = false } = options;
    const bossBuffs = RULES.encounters.bossBuffs;

    // Roll HP from hit dice
    let hp;
    if (isBoss) {
        // Boss: use max possible HP from hit dice, then multiply
        hp = rollMaxHP(monster.hitPoints);
        hp = Math.floor(hp * bossBuffs.hpMultiplier);
    } else {
        hp = roll(monster.hitPoints);
    }

    // Ensure minimum 1 HP
    hp = Math.max(1, hp);

    const cr = monster.challengeRating ?? monster.cr ?? 0;
    const profBonus = RULES.encounters.proficiencyByCR[cr] ?? 2;

    let ac = monster.armorClass;
    let name = monster.name;

    if (isBoss) {
        ac += bossBuffs.acBonus;
        // Generate boss name
        const prefixes = RULES.encounters.bossNamePrefixes;
        const suffixes = RULES.encounters.bossNameSuffixes;
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        name = `${prefix} ${monster.name} ${suffix}`;
    }

    // Apply boss attack bonus to all actions
    let monsterActions = monster.actions ? JSON.parse(JSON.stringify(monster.actions)) : [];
    if (isBoss && monsterActions.length > 0) {
        monsterActions = monsterActions.map(action => ({
            ...action,
            attackBonus: action.attackBonus != null
                ? action.attackBonus + bossBuffs.attackBonus
                : action.attackBonus
        }));
    }

    return {
        name,
        monsterId: monster.id,
        race: { id: monster.id, name: monster.type },
        class: { name: isBoss ? 'Boss' : 'Monster' },
        level: 1,
        cr,
        maxHP: hp,
        currentHP: hp,
        ac,
        speed: monster.speed || 30,
        abilities: { ...monster.abilities },
        abilityModifiers: {
            str: Math.floor((monster.abilities.str - 10) / 2),
            dex: Math.floor((monster.abilities.dex - 10) / 2),
            con: Math.floor((monster.abilities.con - 10) / 2),
            int: Math.floor((monster.abilities.int - 10) / 2),
            wis: Math.floor((monster.abilities.wis - 10) / 2),
            cha: Math.floor((monster.abilities.cha - 10) / 2)
        },
        proficiencyBonus: profBonus,
        skills: monster.skills || {},
        senses: monster.senses || {},
        traits: monster.traits || [],
        equipment: {
            mainHand: null,
            offHand: null,
            armor: null
        },
        // Attach monster combat data directly
        monsterActions,
        multiattack: monster.multiattack || null,
        legendaryActions: isBoss && monster.legendaryActions
            ? JSON.parse(JSON.stringify(monster.legendaryActions))
            : null,
        damageResistances: monster.damageResistances || [],
        damageImmunities: monster.damageImmunities || [],
        conditionImmunities: monster.conditionImmunities || [],
        lootTable: monster.lootTable || null,
        isNPC: true,
        isBoss
    };
}

/**
 * Calculate max possible HP from hit dice string (e.g., "7d10+21")
 * @param {string} hitDice - Hit dice notation
 * @returns {number} Maximum possible HP
 */
function rollMaxHP(hitDice) {
    if (typeof hitDice === 'number') return hitDice;
    if (typeof hitDice !== 'string') return 10;

    // Parse "NdM+B" format
    const match = hitDice.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) return roll(hitDice); // fallback to normal roll

    const numDice = parseInt(match[1]);
    const dieSize = parseInt(match[2]);
    const bonus = parseInt(match[3] || 0);

    return (numDice * dieSize) + bonus;
}

/**
 * Build an encounter using D&D 5e XP-budget system
 *
 * @param {Object} options
 * @param {number} options.partySize - Number of party members (default 1)
 * @param {number} options.partyLevel - Average party level
 * @param {string} [options.difficulty] - 'easy'|'medium'|'hard'|'deadly' (if null, rolled randomly)
 * @param {string} [options.gameDifficulty='normal'] - Player's game difficulty setting
 * @param {string} [options.terrain] - Terrain ID for habitat filtering
 * @param {string} [options.dungeonTypeId] - If in dungeon, filter to dungeon's monster pool
 * @param {boolean} [options.isBoss=false] - Boss encounter
 * @param {Array<string>} [options.monsterPool] - Explicit monster ID filter
 * @param {string} [options.campaignId='core'] - Campaign filter
 * @param {string} [options.context='overworld'] - 'overworld' or 'dungeon' (affects difficulty distribution)
 * @param {Function} [options.rng] - Optional seeded RNG function (returns 0-1)
 * @returns {Promise<Object>} { monsters: [], totalXP, adjustedXP, difficultyRating, isBoss }
 */
export async function buildEncounter(options = {}) {
    const {
        partySize = 1,
        partyLevel = 1,
        difficulty = null,
        gameDifficulty = 'normal',
        terrain = null,
        dungeonTypeId = null,
        isBoss = false,
        monsterPool = null,
        campaignId = 'core',
        context = 'overworld',
        rng = null
    } = options;

    const rand = rng || Math.random.bind(Math);

    // Load all monsters
    const allMonsters = await loadMonsters();

    // Determine difficulty tier
    let difficultyTier = difficulty;
    if (!difficultyTier) {
        if (isBoss) {
            difficultyTier = 'deadly';
        } else {
            const weights = context === 'dungeon'
                ? RULES.encounters.dungeonDifficultyWeights
                : RULES.encounters.overworldDifficultyWeights;
            difficultyTier = rollDifficulty(weights, rand);
        }
    }

    // Calculate XP budget
    const thresholds = RULES.encounters.encounterXPThresholds[partyLevel]
        || RULES.encounters.encounterXPThresholds[10]; // cap at 10
    let xpBudget = (thresholds[difficultyTier] || thresholds.medium) * partySize;

    // Apply game difficulty modifier
    const budgetMultiplier = RULES.encounters.gameDifficultyBudgetMultiplier[gameDifficulty] ?? 1.0;
    xpBudget = Math.floor(xpBudget * budgetMultiplier);

    // Filter available monsters
    let availableMonsters = filterMonsterPool(allMonsters, {
        partyLevel,
        terrain,
        dungeonTypeId,
        monsterPool,
        campaignId,
        xpBudget,
        isBoss
    });

    // If no monsters found with strict filtering, relax constraints
    if (availableMonsters.length === 0) {
        availableMonsters = filterMonsterPool(allMonsters, {
            partyLevel,
            terrain: null, // drop terrain filter
            dungeonTypeId,
            monsterPool,
            campaignId,
            xpBudget: xpBudget * 2, // double budget ceiling for fallback
            isBoss
        });
    }

    // Final fallback: just get any low-CR monster
    if (availableMonsters.length === 0) {
        availableMonsters = allMonsters.filter(m => {
            const cr = m.challengeRating ?? m.cr ?? 0;
            return cr <= 1;
        });
    }

    if (availableMonsters.length === 0) {
        console.warn('⚠️ EncounterBuilder: No monsters available at all!');
        return { monsters: [], totalXP: 0, adjustedXP: 0, difficultyRating: difficultyTier, isBoss };
    }

    // Select monsters using greedy XP budget filling
    const selectedMonsters = [];
    let totalRawXP = 0;
    const maxMonsters = isBoss ? 1 : 3; // Boss encounters have 1 boss (minions added separately)

    for (let i = 0; i < maxMonsters; i++) {
        // Calculate adjusted XP with current count + 1
        const nextCount = selectedMonsters.length + 1;
        const nextMultiplier = getEncounterMultiplier(nextCount);

        // Find monsters whose individual XP, when added, keep us within budget
        const eligible = availableMonsters.filter(m => {
            const cr = m.challengeRating ?? m.cr ?? 0;
            const monsterXP = getXPForCR(cr);
            const newTotalRaw = totalRawXP + monsterXP;
            const adjustedXP = newTotalRaw * nextMultiplier;
            return adjustedXP <= xpBudget && monsterXP > 0;
        });

        if (eligible.length === 0) break;

        // Pick a random eligible monster
        const chosen = eligible[Math.floor(rand() * eligible.length)];
        const chosenCR = chosen.challengeRating ?? chosen.cr ?? 0;
        totalRawXP += getXPForCR(chosenCR);
        selectedMonsters.push(chosen);
    }

    // If we selected nothing (budget too low for any monster), pick the cheapest one
    if (selectedMonsters.length === 0 && availableMonsters.length > 0) {
        const cheapest = availableMonsters.reduce((best, m) => {
            const cr = m.challengeRating ?? m.cr ?? 0;
            const bestCR = best.challengeRating ?? best.cr ?? 0;
            return getXPForCR(cr) < getXPForCR(bestCR) ? m : best;
        });
        selectedMonsters.push(cheapest);
        totalRawXP = getXPForCR(cheapest.challengeRating ?? cheapest.cr ?? 0);
    }

    // Build result
    const finalMultiplier = getEncounterMultiplier(selectedMonsters.length);
    const adjustedXP = Math.floor(totalRawXP * finalMultiplier);

    const monsters = selectedMonsters.map(m => createEnemyFromMonster(m, { isBoss }));

    // For boss encounters, add minions
    if (isBoss && dungeonTypeId) {
        const minions = await buildMinionGroup(allMonsters, {
            dungeonTypeId,
            partyLevel,
            partySize,
            campaignId,
            rng: rand
        });
        monsters.push(...minions);
    }

    // Recalculate total XP including minions
    let finalTotalXP = 0;
    for (const m of monsters) {
        finalTotalXP += getXPForCR(m.cr);
    }
    if (isBoss) {
        // Boss XP is multiplied
        const bossXP = getXPForCR(monsters[0]?.cr ?? 0);
        finalTotalXP = finalTotalXP - bossXP + (bossXP * RULES.encounters.bossBuffs.xpMultiplier);
    }

    return {
        monsters,
        totalXP: finalTotalXP,
        adjustedXP: Math.floor(finalTotalXP * getEncounterMultiplier(monsters.length)),
        difficultyRating: difficultyTier,
        isBoss
    };
}

/**
 * Build a small group of minions for a boss encounter
 * Scales minion count by party size: solo (0-1), small party (1), full party (1-2)
 */
async function buildMinionGroup(allMonsters, options) {
    const { dungeonTypeId, partyLevel, partySize = 1, campaignId, rng } = options;
    const bossConfig = RULES.encounters.bossBuffs.minions;

    // Scale minion count by party size
    let minMinionCount, maxMinionCount;
    if (partySize === 1) {
        // Solo: 0-1 minions (50% chance of no minions)
        minMinionCount = 0;
        maxMinionCount = 1;
    } else if (partySize <= 3) {
        // Small party: 1 minion guaranteed
        minMinionCount = 1;
        maxMinionCount = 1;
    } else {
        // Full party (4+): 1-2 minions
        minMinionCount = bossConfig.min;
        maxMinionCount = bossConfig.max;
    }

    const numMinions = Math.floor(rng() * (maxMinionCount - minMinionCount + 1)) + minMinionCount;

    // Load dungeon types to get monster pool
    let dungeonPool = null;
    try {
        const response = await fetch('data/dungeonTypes.json');
        const data = await response.json();
        const dungeonType = data.dungeonTypes.find(d => d.id === dungeonTypeId);
        if (dungeonType) {
            dungeonPool = dungeonType.monsterPool;
        }
    } catch (e) {
        console.warn('⚠️ Could not load dungeon types for minion selection');
    }

    // Filter for minion-appropriate monsters (low CR relative to party level)
    // Level 1: CR 0.25, Level 2+: CR = level/2
    const maxMinionCR = Math.max(0.25, Math.floor(partyLevel / 2));
    let minionCandidates = allMonsters.filter(m => {
        const cr = m.challengeRating ?? m.cr ?? 0;
        if (cr > maxMinionCR) return false;
        if (dungeonPool && !dungeonPool.includes(m.id)) return false;
        // Campaign filter
        if (m.campaignIds && !m.campaignIds.includes('core') && !m.campaignIds.includes(campaignId)) return false;
        return true;
    });

    if (minionCandidates.length === 0) {
        // Fallback: any low CR monster
        minionCandidates = allMonsters.filter(m => {
            const cr = m.challengeRating ?? m.cr ?? 0;
            return cr <= 1;
        });
    }

    const minions = [];
    for (let i = 0; i < numMinions && minionCandidates.length > 0; i++) {
        const chosen = minionCandidates[Math.floor(rng() * minionCandidates.length)];
        minions.push(createEnemyFromMonster(chosen, { isBoss: false }));
    }

    return minions;
}

/**
 * Filter the monster pool based on encounter parameters
 */
function filterMonsterPool(allMonsters, options) {
    const { partyLevel, terrain, dungeonTypeId, monsterPool, campaignId, xpBudget, isBoss } = options;

    return allMonsters.filter(m => {
        const cr = m.challengeRating ?? m.cr ?? 0;
        const monsterXP = getXPForCR(cr);

        // Must have positive XP (CR 0 = 10 XP is fine)
        if (monsterXP <= 0) return false;

        // Individual monster XP must not exceed budget
        if (monsterXP > xpBudget) return false;

        // Explicit monster pool filter (dungeon or custom)
        if (monsterPool && monsterPool.length > 0) {
            if (!monsterPool.includes(m.id)) return false;
        }

        // Campaign filter
        if (campaignId && m.campaignIds) {
            if (!m.campaignIds.includes('core') && !m.campaignIds.includes(campaignId)) return false;
        }

        // Terrain/habitat filter (only for overworld)
        if (terrain && !dungeonTypeId && m.habitats) {
            if (m.habitats.never && m.habitats.never.includes(terrain)) return false;
        }

        // Level appropriateness: monster should be roughly within the party's power range
        // Allow monsters from CR 0 up to partyLevel + 2 (budget handles the actual balancing)
        const maxCR = partyLevel + 2;
        if (cr > maxCR && !isBoss) return false;

        return true;
    });
}

/**
 * Build a boss encounter for a dungeon
 * Selects boss from dungeon type's level-bracketed boss pool
 *
 * @param {Object} options
 * @param {string} options.dungeonTypeId - Dungeon type ID
 * @param {number} options.partyLevel - Party level
 * @param {string} [options.campaignId='core'] - Campaign ID
 * @param {Function} [options.rng] - Optional RNG
 * @returns {Promise<Object>} Encounter result with boss + minions
 */
export async function buildBossEncounter(options = {}) {
    const {
        dungeonTypeId,
        partyLevel = 1,
        partySize = 1,
        campaignId = 'core',
        rng = null
    } = options;

    const rand = rng || Math.random.bind(Math);
    const allMonsters = await loadMonsters();

    // Load dungeon types to get boss pool
    let bossId = null;
    let dungeonMonsterPool = null;
    try {
        const response = await fetch('data/dungeonTypes.json');
        const data = await response.json();
        const dungeonType = data.dungeonTypes.find(d => d.id === dungeonTypeId);
        if (dungeonType) {
            dungeonMonsterPool = dungeonType.monsterPool;

            // Select boss from level-bracketed pool
            const validBosses = dungeonType.bossPool.filter(entry => {
                // Support both old format (string) and new format (object with minLevel/maxLevel)
                if (typeof entry === 'string') return true;
                return partyLevel >= entry.minLevel && partyLevel <= entry.maxLevel;
            });

            if (validBosses.length > 0) {
                const chosen = validBosses[Math.floor(rand() * validBosses.length)];
                bossId = typeof chosen === 'string' ? chosen : chosen.id;
            } else {
                // Fallback: pick highest-level boss available
                const sorted = [...dungeonType.bossPool]
                    .filter(e => typeof e === 'object')
                    .sort((a, b) => b.maxLevel - a.maxLevel);
                if (sorted.length > 0) {
                    bossId = sorted[0].id;
                }
            }
        }
    } catch (e) {
        console.warn('⚠️ Could not load dungeon types for boss selection:', e);
    }

    if (!bossId) {
        console.warn('⚠️ No boss ID found, falling back to regular deadly encounter');
        return buildEncounter({
            partySize, partyLevel,
            difficulty: 'deadly',
            dungeonTypeId,
            campaignId,
            context: 'dungeon',
            rng: rand
        });
    }

    // Find the boss monster data
    const bossMonster = allMonsters.find(m => m.id === bossId);
    if (!bossMonster) {
        console.warn(`⚠️ Boss monster "${bossId}" not found in monsters.json`);
        return buildEncounter({
            partySize, partyLevel,
            difficulty: 'deadly',
            dungeonTypeId,
            campaignId,
            context: 'dungeon',
            rng: rand
        });
    }

    // Create boss enemy with buffs
    const boss = createEnemyFromMonster(bossMonster, { isBoss: true });

    // Build minion group
    const minions = await buildMinionGroup(allMonsters, {
        dungeonTypeId,
        partyLevel,
        partySize,
        campaignId,
        rng: rand
    });

    const allCombatants = [boss, ...minions];

    // Calculate XP
    const bossXP = getXPForCR(boss.cr) * RULES.encounters.bossBuffs.xpMultiplier;
    let minionXP = 0;
    for (const m of minions) {
        minionXP += getXPForCR(m.cr);
    }
    let totalXP = bossXP + minionXP;
    let adjustedXP = Math.floor(totalXP * getEncounterMultiplier(allCombatants.length));

    // XP Budget Validation: Boss encounters should not exceed 3× deadly threshold
    // (Bosses are meant to be challenging, but survivable)
    const thresholds = RULES.encounters.encounterXPThresholds[partyLevel] || RULES.encounters.encounterXPThresholds[1];
    const deadlyThreshold = thresholds.deadly * partySize;
    const maxBossXP = deadlyThreshold * 3; // Boss can be up to 3× deadly

    // If encounter is too deadly, remove minions one by one until under budget
    let finalMinions = [...minions];
    while (adjustedXP > maxBossXP && finalMinions.length > 0) {
        console.warn(`⚠️ Boss encounter too deadly (${adjustedXP} XP > ${maxBossXP} max) - removing minion`);
        finalMinions.pop();

        // Recalculate XP
        totalXP = bossXP;
        for (const m of finalMinions) {
            totalXP += getXPForCR(m.cr);
        }
        const finalCombatants = [boss, ...finalMinions];
        adjustedXP = Math.floor(totalXP * getEncounterMultiplier(finalCombatants.length));
    }

    const finalCombatants = [boss, ...finalMinions];

    return {
        monsters: finalCombatants,
        totalXP,
        adjustedXP,
        difficultyRating: 'deadly',
        isBoss: true,
        bossName: boss.name
    };
}

export default { buildEncounter, buildBossEncounter, getXPForCR, clearMonsterCache };
