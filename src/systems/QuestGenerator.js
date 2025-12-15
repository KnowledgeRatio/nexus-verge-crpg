/**
 * Quest Generator System
 * Procedurally generates quests from templates using seeded RNG
 */

import { createRNG, seedToNumber } from '../utils/rng.js';
import { RULES } from '../core/rulesEngine.js';

class QuestGenerator {
  constructor(worldSeed) {
    this.worldSeed = worldSeed;
    this.questData = null;
    this.monsterData = null;
  }

  /**
   * Load quest and monster data
   */
  async loadData() {
    if (this.questData && this.monsterData) {
      return; // Already loaded
    }

    try {
      const [questResponse, monsterResponse] = await Promise.all([
        fetch('data/quests.json'),
        fetch('data/monsters.json')
      ]);

      this.questData = await questResponse.json();
      this.monsterData = await monsterResponse.json();

      console.log('📜 Quest data loaded successfully');
    } catch (error) {
      console.error('Failed to load quest data:', error);
      throw error;
    }
  }

  /**
   * Generate quests for a settlement when first discovered
   * @param {Object} settlement - Settlement feature data
   * @param {number} playerLevel - Current player level
   * @returns {Array<Object>} Generated quest instances
   */
  async generateQuestsForSettlement(settlement, playerLevel) {
    await this.loadData();

    const seed = `${this.worldSeed}_settlement_${settlement.x}_${settlement.y}_quests`;
    const rng = createRNG(seedToNumber(seed));

    const quests = [];

    // Determine quest count based on settlement type
    const questCounts = {
      'village': { min: 2, max: 3 },
      'town': { min: 3, max: 5 },
      'city': { min: 4, max: 6 }
    };

    const settlementType = settlement.settlementType || 'village';
    const config = questCounts[settlementType] || questCounts['village'];
    const questCount = rng.intBetween(config.min, config.max);

    // Select random templates
    const templates = this.questData.sideQuestTemplates;
    const selectedTemplates = [];

    for (let i = 0; i < questCount; i++) {
      const template = rng.pick(templates);
      selectedTemplates.push(template);
    }

    // Generate quest instances from templates
    for (const template of selectedTemplates) {
      const quest = await this.generateFromTemplate(template, settlement, playerLevel, rng);
      if (quest) {
        quests.push(quest);
      }
    }

    console.log(`📜 Generated ${quests.length} quests for ${settlement.name}`);
    return quests;
  }

  /**
   * Generate a quest instance from a template
   * @param {Object} template - Quest template
   * @param {Object} settlement - Settlement context
   * @param {number} playerLevel - Player level
   * @param {Object} rng - Seeded RNG
   * @returns {Object} Generated quest instance
   */
  async generateFromTemplate(template, settlement, playerLevel, rng) {
    const questId = `quest_${settlement.x}_${settlement.y}_${rng.int(100000, 999999)}`;

    // Generate quest based on type
    let questData = null;
    switch (template.type) {
      case 'kill':
        questData = this.generateKillQuest(template, settlement, playerLevel, rng);
        break;
      case 'retrieve':
        questData = this.generateRetrieveQuest(template, settlement, playerLevel, rng);
        break;
      case 'deliver':
        questData = this.generateDeliverQuest(template, settlement, playerLevel, rng);
        break;
      case 'explore':
        questData = this.generateExploreQuest(template, settlement, playerLevel, rng);
        break;
      case 'skill':
        questData = this.generateSkillQuest(template, settlement, playerLevel, rng);
        break;
      default:
        console.warn(`Unknown quest type: ${template.type}`);
        return null;
    }

    if (!questData) return null;

    // Build complete quest instance
    return {
      id: questId,
      templateId: template.id,
      name: questData.name,
      description: questData.description,
      type: template.type,
      difficulty: template.difficulty,
      objectives: questData.objectives,
      rewards: questData.rewards,
      status: 'available', // available | active | completed | failed
      questGiver: questData.questGiver,
      settlement: {
        id: `${settlement.x}_${settlement.y}`,
        name: settlement.name,
        x: settlement.x,
        y: settlement.y
      },
      generationData: questData.generationData, // Store for progress tracking
      acceptedAt: null,
      completedAt: null
    };
  }

  /**
   * Generate a kill quest
   * @param {Object} template - Quest template
   * @param {Object} settlement - Settlement data
   * @param {number} playerLevel - Player level
   * @param {Object} rng - Seeded RNG
   * @returns {Object} Quest data
   */
  generateKillQuest(template, settlement, playerLevel, rng) {
    const gen = template.generation;

    // Calculate CR range
    const minCR = typeof gen.minCR === 'number' ? gen.minCR : playerLevel - 1;
    const maxCR = this.evaluateFormula(gen.maxCRFormula || 'playerLevel + 2', { playerLevel });

    // Pick appropriate creature
    const validCreatures = this.monsterData.monsters.filter(monster => {
      return monster.cr >= Math.max(0.125, minCR) && monster.cr <= maxCR;
    });

    if (validCreatures.length === 0) {
      console.warn('No valid creatures for kill quest');
      return null;
    }

    const creature = rng.pick(validCreatures);

    // Determine count
    const countRange = gen.countRange || [3, 8];
    const count = rng.intBetween(countRange[0], countRange[1]);

    // Pick quest giver NPC role
    const npcRole = rng.pick(gen.validNPCRoles || ['innkeeper', 'leader']);

    // Calculate rewards
    const rewards = this.calculateRewards(template.rewards, {
      creatureCR: creature.cr,
      count,
      playerLevel,
      difficulty: template.difficulty
    });

    // Fill template strings
    const creatureName = creature.name;
    const creatureNamePlural = creature.namePlural || `${creature.name}s`;

    const name = this.fillTemplate(template.name, {
      creatureName,
      creatureNamePlural,
      count
    });

    const description = this.fillTemplate(template.description, {
      npcRole: this.formatRole(npcRole),
      count,
      creatureName,
      creatureNamePlural,
      settlement: settlement.name
    });

    // Build objectives
    const objectives = template.objectives.map((objTemplate, idx) => {
      return {
        id: `obj_${idx}`,
        type: objTemplate.type,
        description: this.fillTemplate(objTemplate.description, {
          count,
          creatureName,
          creatureNamePlural
        }),
        progress: 0,
        required: count,
        completed: false,
        requirement: {
          ...objTemplate.requirement,
          creatureTypes: [creature.id],
          count: count
        }
      };
    });

    return {
      name,
      description,
      objectives,
      rewards,
      questGiver: { role: npcRole },
      generationData: {
        creatureId: creature.id,
        creatureName,
        count
      }
    };
  }

  /**
   * Generate a retrieve quest
   * @param {Object} template - Quest template
   * @param {Object} settlement - Settlement data
   * @param {number} playerLevel - Player level
   * @param {Object} rng - Seeded RNG
   * @returns {Object} Quest data
   */
  generateRetrieveQuest(template, settlement, playerLevel, rng) {
    const gen = template.generation;

    // Pick item type and dungeon type
    const itemType = rng.pick(gen.validItemTypes || ['heirloom', 'artifact']);
    const dungeonType = rng.pick(gen.dungeonTypes || ['Cave', 'Ruins']);
    const itemName = `Lost ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`;
    const itemId = `quest_item_${itemType}_${rng.int(1000, 9999)}`;

    // Pick quest giver
    const npcRole = rng.pick(gen.validNPCRoles || ['merchant', 'innkeeper']);

    // Calculate rewards
    const rewards = this.calculateRewards(template.rewards, {
      playerLevel,
      difficulty: template.difficulty,
      difficultyMultiplier: this.getDifficultyMultiplier(template.difficulty)
    });

    // Fill templates
    const name = this.fillTemplate(template.name, { itemType, itemName });
    const description = this.fillTemplate(template.description, {
      npcName: '{npcName}', // Will be filled when assigned to NPC
      itemName,
      dungeonType
    });

    // Build objectives
    const objectives = template.objectives.map((objTemplate, idx) => {
      let desc = objTemplate.description;
      desc = this.fillTemplate(desc, { dungeonType, itemName, npcName: '{npcName}' });

      return {
        id: `obj_${idx}`,
        type: objTemplate.type,
        description: desc,
        progress: 0,
        required: 1,
        completed: false,
        requirement: { ...objTemplate.requirement, itemId }
      };
    });

    return {
      name,
      description,
      objectives,
      rewards,
      questGiver: { role: npcRole },
      generationData: {
        itemId,
        itemName,
        dungeonType
      }
    };
  }

  /**
   * Generate a deliver quest
   * @param {Object} template - Quest template
   * @param {Object} settlement - Settlement data
   * @param {number} playerLevel - Player level
   * @param {Object} rng - Seeded RNG
   * @returns {Object} Quest data
   */
  generateDeliverQuest(template, settlement, playerLevel, rng) {
    const gen = template.generation;

    // Pick quest giver
    const npcRole = rng.pick(gen.validNPCRoles || ['merchant', 'innkeeper']);

    // For simplicity, target same settlement (future: different settlements)
    const targetSettlement = settlement;
    const targetNpcRole = rng.pick(['merchant', 'blacksmith', 'leader']);

    // Calculate distance (for now, use proximity)
    const distance = rng.intBetween(gen.minDistance || 50, gen.maxDistance || 200);

    // Calculate rewards
    const rewards = this.calculateRewards(template.rewards, {
      playerLevel,
      distance,
      difficulty: template.difficulty
    });

    // Fill templates
    const name = template.name;
    const description = this.fillTemplate(template.description, {
      npcName: '{npcName}',
      targetNpc: '{targetNpc}',
      targetSettlement: targetSettlement.name
    });

    // Build objectives
    const objectives = template.objectives.map((objTemplate, idx) => {
      let desc = this.fillTemplate(objTemplate.description, {
        targetSettlement: targetSettlement.name,
        targetNpc: '{targetNpc}'
      });

      return {
        id: `obj_${idx}`,
        type: objTemplate.type,
        description: desc,
        progress: 0,
        required: 1,
        completed: false,
        requirement: objTemplate.requirement
      };
    });

    return {
      name,
      description,
      objectives,
      rewards,
      questGiver: { role: npcRole },
      generationData: {
        targetSettlement: targetSettlement.name,
        targetNpcRole,
        distance
      }
    };
  }

  /**
   * Generate an explore quest
   * @param {Object} template - Quest template
   * @param {Object} settlement - Settlement data
   * @param {number} playerLevel - Player level
   * @param {Object} rng - Seeded RNG
   * @returns {Object} Quest data
   */
  generateExploreQuest(template, settlement, playerLevel, rng) {
    const gen = template.generation;

    // Pick location type
    const locationTypes = gen.locationTypes || ['dungeon', 'ruins', 'cave'];
    const locationType = rng.pick(locationTypes);
    const locationName = `Nearby ${locationType.charAt(0).toUpperCase() + locationType.slice(1)}`;

    // Pick quest giver
    const npcRole = rng.pick(gen.validNPCRoles || ['leader', 'guard']);

    // Calculate rewards
    const rewards = this.calculateRewards(template.rewards, {
      playerLevel,
      difficulty: template.difficulty
    });

    // Fill templates
    const name = this.fillTemplate(template.name, { locationName });
    const description = this.fillTemplate(template.description, {
      npcName: '{npcName}',
      locationType,
      locationName
    });

    // Build objectives
    const objectives = template.objectives.map((objTemplate, idx) => {
      let desc = this.fillTemplate(objTemplate.description, {
        locationType,
        locationName,
        npcName: '{npcName}'
      });

      return {
        id: `obj_${idx}`,
        type: objTemplate.type,
        description: desc,
        progress: 0,
        required: 1,
        completed: false,
        requirement: objTemplate.requirement
      };
    });

    return {
      name,
      description,
      objectives,
      rewards,
      questGiver: { role: npcRole },
      generationData: {
        locationType,
        locationName
      }
    };
  }

  /**
   * Generate a skill challenge quest
   * @param {Object} template - Quest template
   * @param {Object} settlement - Settlement data
   * @param {number} playerLevel - Player level
   * @param {Object} rng - Seeded RNG
   * @returns {Object} Quest data
   */
  generateSkillQuest(template, settlement, playerLevel, rng) {
    const gen = template.generation;

    // Pick quest giver
    const npcRole = rng.pick(gen.validNPCRoles || ['guard', 'leader']);

    // Fill templates
    const name = this.fillTemplate(template.name, {
      npcName: '{npcName}',
      settlement: settlement.name
    });

    const description = this.fillTemplate(template.description, {
      npcName: '{npcName}',
      settlement: settlement.name
    });

    // Build objectives (copy from template)
    const objectives = template.objectives.map((objTemplate, idx) => {
      return {
        id: `obj_${idx}`,
        type: objTemplate.type,
        description: objTemplate.description,
        progress: 0,
        required: objTemplate.requirement.count || 1,
        completed: false,
        requirement: objTemplate.requirement
      };
    });

    return {
      name,
      description,
      objectives,
      rewards: template.rewards,
      questGiver: { role: npcRole },
      generationData: {
        skillChallengeId: template.skillChallengeId
      }
    };
  }

  /**
   * Get campaign quest for a specific stage
   * @param {number} stage - Campaign stage number (1-4)
   * @returns {Object} Campaign quest
   */
  getCampaignQuest(stage) {
    if (!this.questData) {
      console.error('Quest data not loaded');
      return null;
    }

    const campaignQuest = this.questData.campaignQuests.find(q => q.stage === stage);
    if (!campaignQuest) {
      console.warn(`Campaign quest for stage ${stage} not found`);
      return null;
    }

    // Return a copy with unique ID
    return {
      ...campaignQuest,
      id: `campaign_stage_${stage}`,
      status: 'available',
      acceptedAt: null,
      completedAt: null
    };
  }

  /**
   * Calculate quest rewards based on formulas
   * @param {Object} rewardTemplate - Reward template with formulas
   * @param {Object} data - Generation data (creatureCR, count, distance, etc.)
   * @returns {Object} Calculated rewards
   */
  calculateRewards(rewardTemplate, data) {
    const rewards = {};

    // XP reward
    if (rewardTemplate.xpFormula) {
      rewards.xp = this.evaluateFormula(rewardTemplate.xpFormula, data);
    } else if (rewardTemplate.xp) {
      rewards.xp = rewardTemplate.xp;
    }

    // Gold reward
    if (rewardTemplate.goldFormula) {
      rewards.gold = this.evaluateFormula(rewardTemplate.goldFormula, data);
    } else if (rewardTemplate.gold) {
      rewards.gold = rewardTemplate.gold;
    }

    // Item reward
    if (rewardTemplate.itemChance) {
      rewards.item = Math.random() < rewardTemplate.itemChance ? 'random' : null;
    } else if (rewardTemplate.item) {
      rewards.item = rewardTemplate.item;
    }

    // Reputation reward
    if (rewardTemplate.reputation) {
      rewards.reputation = { ...rewardTemplate.reputation };
    }

    return rewards;
  }

  /**
   * Evaluate a formula string with variable substitution
   * @param {string} formula - Formula string (e.g., "creatureCR * count * 100")
   * @param {Object} variables - Variable values
   * @returns {number} Calculated result
   */
  evaluateFormula(formula, variables) {
    try {
      // Replace variables in formula
      let expression = formula;
      for (const [key, value] of Object.entries(variables)) {
        expression = expression.replace(new RegExp(key, 'g'), value);
      }

      // Evaluate safely (basic math only)
      // eslint-disable-next-line no-eval
      const result = eval(expression);
      return Math.round(result);
    } catch (error) {
      console.error('Formula evaluation error:', formula, error);
      return 0;
    }
  }

  /**
   * Fill template placeholders with values
   * @param {string} template - Template string with {placeholders}
   * @param {Object} data - Data to fill in
   * @returns {string} Filled template
   */
  fillTemplate(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    }
    return result;
  }

  /**
   * Format NPC role for display
   * @param {string} role - NPC role
   * @returns {string} Formatted role
   */
  formatRole(role) {
    const roleNames = {
      'innkeeper': 'innkeeper',
      'leader': 'village elder',
      'merchant': 'merchant',
      'guard': 'guard captain',
      'blacksmith': 'blacksmith'
    };
    return roleNames[role] || role;
  }

  /**
   * Get difficulty multiplier
   * @param {string} difficulty - Quest difficulty
   * @returns {number} Multiplier
   */
  getDifficultyMultiplier(difficulty) {
    const multipliers = {
      'easy': 0.75,
      'normal': 1.0,
      'hard': 1.5,
      'deadly': 2.0
    };
    return multipliers[difficulty] || 1.0;
  }
}

export default QuestGenerator;
