/**
 * NPC Generator System
 * Procedurally generates friendly NPCs for settlements with names, roles, and personalities
 */

import { createRNG, seedToNumber } from '../utils/rng.js';
import { RULES } from '../core/rulesEngine.js';

class NPCGenerator {
  constructor(worldSeed) {
    this.worldSeed = worldSeed;
    this.nameData = null;
    this.dialogueData = null;
  }

  /**
   * Load NPC name and dialogue data files
   */
  async loadData() {
    if (this.nameData && this.dialogueData) {
      return; // Already loaded
    }

    try {
      const [nameResponse, dialogueResponse] = await Promise.all([
        fetch('data/npcNames.json'),
        fetch('data/dialogueTemplates.json')
      ]);

      this.nameData = await nameResponse.json();
      this.dialogueData = await dialogueResponse.json();

      console.log('📋 NPC data loaded successfully');
    } catch (error) {
      console.error('Failed to load NPC data:', error);
      throw error;
    }
  }

  /**
   * Generate NPCs for a settlement
   * @param {Object} settlement - Settlement feature data
   * @returns {Array<Object>} Array of generated NPCs
   */
  async generateNPCsForSettlement(settlement) {
    await this.loadData();

    const settlementType = settlement.settlementType || 'village';
    const seed = `${this.worldSeed}_settlement_${settlement.x}_${settlement.y}_npcs`;
    const rng = createRNG(seedToNumber(seed));

    const npcs = [];

    // Generate NPCs for each building
    npcs.push(...this.generateTavernNPCs(settlement, settlementType, rng));
    npcs.push(...this.generateMerchantNPCs(settlement, settlementType, rng));
    npcs.push(...this.generateBlacksmithNPCs(settlement, settlementType, rng));
    npcs.push(...this.generateGreatHallNPCs(settlement, settlementType, rng));

    console.log(`👥 Generated ${npcs.length} NPCs for ${settlement.name} (${settlementType})`);
    return npcs;
  }

  /**
   * Generate NPCs for the Tavern
   * @param {Object} settlement - Settlement data
   * @param {string} settlementType - village/town/city
   * @param {Object} rng - Seeded RNG
   * @returns {Array<Object>} Tavern NPCs
   */
  generateTavernNPCs(settlement, settlementType, rng) {
    const npcs = [];
    const npcCounts = RULES.npc.countBySettlementType[settlementType].tavern;

    // Always generate an innkeeper (named NPC)
    const innkeeper = this.generateNPC({
      settlement,
      building: 'tavern',
      role: 'innkeeper',
      isNamed: true,
      rng
    });
    npcs.push(innkeeper);

    // Generate patrons (mix of named and generic)
    const patronCount = rng.intBetween(npcCounts.min - 1, npcCounts.max - 1); // -1 for innkeeper
    for (let i = 0; i < patronCount; i++) {
      const isNamed = rng.random() < 0.3; // 30% chance of being a named NPC with quest potential
      const patron = this.generateNPC({
        settlement,
        building: 'tavern',
        role: 'patron',
        isNamed,
        rng
      });
      npcs.push(patron);
    }

    return npcs;
  }

  /**
   * Generate NPCs for the Merchant
   * @param {Object} settlement - Settlement data
   * @param {string} settlementType - village/town/city
   * @param {Object} rng - Seeded RNG
   * @returns {Array<Object>} Merchant NPCs
   */
  generateMerchantNPCs(settlement, settlementType, rng) {
    // Always 1 merchant (named NPC)
    const merchant = this.generateNPC({
      settlement,
      building: 'merchant',
      role: 'merchant',
      isNamed: true,
      rng
    });

    return [merchant];
  }

  /**
   * Generate NPCs for the Blacksmith
   * @param {Object} settlement - Settlement data
   * @param {string} settlementType - village/town/city
   * @param {Object} rng - Seeded RNG
   * @returns {Array<Object>} Blacksmith NPCs
   */
  generateBlacksmithNPCs(settlement, settlementType, rng) {
    // Always 1 blacksmith (named NPC)
    const blacksmith = this.generateNPC({
      settlement,
      building: 'blacksmith',
      role: 'blacksmith',
      isNamed: true,
      rng
    });

    return [blacksmith];
  }

  /**
   * Generate NPCs for the Great Hall
   * @param {Object} settlement - Settlement data
   * @param {string} settlementType - village/town/city
   * @param {Object} rng - Seeded RNG
   * @returns {Array<Object>} Great Hall NPCs
   */
  generateGreatHallNPCs(settlement, settlementType, rng) {
    const npcs = [];
    const npcCounts = RULES.npc.countBySettlementType[settlementType].greathall;

    // Always generate a leader (named NPC)
    const leader = this.generateNPC({
      settlement,
      building: 'greathall',
      role: 'leader',
      isNamed: true,
      rng
    });
    npcs.push(leader);

    // Generate guards and citizens (mix of named and generic)
    const citizenCount = rng.intBetween(npcCounts.min - 1, npcCounts.max - 1); // -1 for leader
    for (let i = 0; i < citizenCount; i++) {
      const isGuard = i < Math.floor(citizenCount / 2); // Half are guards
      const isNamed = rng.random() < 0.4; // 40% chance of being named

      const npc = this.generateNPC({
        settlement,
        building: 'greathall',
        role: isGuard ? 'guard' : 'citizen',
        isNamed,
        rng
      });
      npcs.push(npc);
    }

    return npcs;
  }

  /**
   * Generate a single NPC
   * @param {Object} params - NPC generation parameters
   * @returns {Object} Generated NPC
   */
  generateNPC({ settlement, building, role, isNamed, rng }) {
    const settlementType = settlement.settlementType || 'village';
    const id = `npc_${settlement.x}_${settlement.y}_${building}_${rng.int(100000, 999999)}`;

    // Generate name
    const name = this.generateName(role, settlementType, rng);

    // Generate personality
    const personality = rng.pick(RULES.npc.personalityTypes);

    // Determine if this NPC offers quests
    const questChance = RULES.npc.questChanceByRole[role] || 0;
    const offersQuest = isNamed && rng.random() < questChance;

    // Generate dialogue
    const dialogue = this.generateDialogue(role, personality, settlement, name, settlementType, rng);

    // Create shop name for merchants/blacksmiths
    let shopName = null;
    if (role === 'merchant') {
      shopName = rng.pick(this.nameData.merchantShopNames);
    } else if (role === 'blacksmith') {
      shopName = rng.pick(this.nameData.blacksmithShopNames);
    } else if (role === 'innkeeper') {
      shopName = rng.pick(this.nameData.tavernNames);
    }

    return {
      id,
      name,
      role,
      personality,
      building,
      isNamed,
      offersQuest,
      settlementId: `${settlement.x}_${settlement.y}`,
      settlementName: settlement.name,
      shopName,
      dialogue,
      questIds: [], // Will be populated by QuestGenerator
      givenQuestIds: [] // Quests already given to player
    };
  }

  /**
   * Generate a name for an NPC
   * @param {string} role - NPC role
   * @param {string} settlementType - Settlement type
   * @param {Object} rng - Seeded RNG
   * @returns {string} Generated name
   */
  generateName(role, settlementType, rng) {
    // Determine race (mostly humans in settlements)
    const raceRoll = rng.random();
    let race = 'human';
    if (raceRoll < 0.1) race = 'elf';
    else if (raceRoll < 0.15) race = 'dwarf';

    // Determine gender
    const gender = rng.random() < 0.5 ? 'male' : 'female';

    let firstName;
    if (race === 'human') {
      firstName = rng.pick(this.nameData.humanFirstNames[gender]);
    } else if (race === 'elf') {
      firstName = rng.pick(this.nameData.elfFirstNames[gender]);
    } else if (race === 'dwarf') {
      firstName = rng.pick(this.nameData.dwarfFirstNames[gender]);
    }

    // For leaders and important NPCs, add title
    if (role === 'leader') {
      const title = rng.pick(this.nameData.titles[settlementType].leader);
      const lastName = rng.pick(this.nameData.lastNames);
      return `${title} ${firstName} ${lastName}`;
    } else if (role === 'guard' && rng.random() < 0.3) {
      // Some guards have titles
      const title = rng.pick(this.nameData.titles[settlementType].guard);
      return `${title} ${firstName}`;
    }

    // Most NPCs just have first name + last name
    const lastName = rng.pick(this.nameData.lastNames);
    return `${firstName} ${lastName}`;
  }

  /**
   * Generate dialogue for an NPC
   * @param {string} role - NPC role
   * @param {string} personality - NPC personality
   * @param {Object} settlement - Settlement data
   * @param {string} name - NPC name
   * @param {string} settlementType - Settlement type
   * @param {Object} rng - Seeded RNG
   * @returns {Object} Dialogue object
   */
  generateDialogue(role, personality, settlement, name, settlementType, rng) {
    const templates = this.dialogueData.greetings[role];
    const personalityTemplates = templates ? templates[personality] || templates['friendly'] : null;

    let greeting;
    if (personalityTemplates && personalityTemplates.length > 0) {
      greeting = rng.pick(personalityTemplates);
    } else {
      // Fallback generic greeting
      greeting = "Hello there!";
    }

    // Fill in template placeholders
    greeting = this.fillTemplate(greeting, {
      settlement: settlement.name,
      name: name,
      title: role,
      tavernName: rng.pick(this.nameData.tavernNames),
      shopName: rng.pick(this.nameData.merchantShopNames)
    });

    // Select random flavor dialogue lines
    const flavorLines = [];
    const flavorCategories = Object.keys(this.dialogueData.flavorDialogue);
    const numLines = rng.intBetween(2, 4);

    for (let i = 0; i < numLines; i++) {
      const category = rng.pick(flavorCategories);
      let line = rng.pick(this.dialogueData.flavorDialogue[category]);
      line = this.fillTemplate(line, { settlement: settlement.name });
      flavorLines.push(line);
    }

    return {
      greeting,
      flavorDialogue: flavorLines,
      questOffer: rng.pick(this.dialogueData.questHooks.casual),
      questAccept: rng.pick(this.dialogueData.questAccept),
      questDecline: rng.pick(this.dialogueData.questDecline),
      questProgress: rng.pick(this.dialogueData.questProgress),
      questComplete: rng.pick(this.dialogueData.questComplete),
      goodbye: rng.pick(this.dialogueData.goodbye)
    };
  }

  /**
   * Fill template placeholders with actual values
   * @param {string} template - Template string with {placeholders}
   * @param {Object} data - Data to fill in
   * @returns {string} Filled template
   */
  fillTemplate(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    return result;
  }
}

export default NPCGenerator;
