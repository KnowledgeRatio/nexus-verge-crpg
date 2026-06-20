/**
 * NPC Generator System
 * Procedurally generates friendly NPCs for settlements with names, roles, and personalities
 */

import { SeededRandom } from '../utils/rng.js';
import { RULES } from '../core/rulesEngine.js';
import { loadCampaigns, isAvailableForCampaign, getDefaultCampaignId } from '../utils/campaignFilter.js';

class NPCGenerator {
    constructor(worldSeed, campaignId = null) {
        this.worldSeed = worldSeed;
        this.campaignId = campaignId;
        this.nameData = null;
        this.dialogueData = null;
        this.racesData = null;
        this.culturesData = null;
    }

    /**
     * Set the campaign ID for filtering
     * @param {string} campaignId - Campaign ID
     */
    setCampaignId(campaignId) {
        this.campaignId = campaignId;
    }

    /**
   * Load NPC name and dialogue data files
   */
    async loadData() {
        if (this.nameData && this.dialogueData && this.racesData && this.culturesData) {
            return;
        }

        try {
            // Load campaign data for filtering
            await loadCampaigns();

            const [nameResponse, dialogueResponse, racesResponse, culturesResponse] = await Promise.all([
                fetch('data/npcNames.json'),
                fetch('data/dialogueTemplates.json'),
                fetch('data/races.json'),
                fetch('data/cultures.json')
            ]);

            const rawNameData = await nameResponse.json();
            this.dialogueData = await dialogueResponse.json();
            const rawRaces = await racesResponse.json();
            const rawCultures = await culturesResponse.json();

            const campaignId = this.campaignId || getDefaultCampaignId();

            this.racesData = (rawRaces.races || rawRaces)
                .filter(r => r.npcWeight > 0 && isAvailableForCampaign(r, campaignId));
            this.culturesData = (rawCultures.cultures || rawCultures)
                .filter(c => c.npcWeight > 0 && isAvailableForCampaign(c, campaignId));

            // Filter name pools by campaign (if they have campaignIds)
            this.nameData = this.filterNameData(rawNameData, campaignId);

            console.log(`📋 NPC data loaded successfully (campaign: ${campaignId})`);
        } catch (error) {
            console.error('Failed to load NPC data:', error);
            throw error;
        }
    }

    /**
     * Filter name data by campaign
     * @param {Object} data - Raw name data
     * @param {string} campaignId - Campaign ID
     * @returns {Object} Filtered name data
     */
    filterNameData(data, campaignId) {
        const filtered = {};
        for (const [key, value] of Object.entries(data)) {
            // Skip description and version fields
            if (key === 'description' || key === 'version') {
                filtered[key] = value;
                continue;
            }
            // Check if name pool has campaignIds and filter accordingly
            if (value && typeof value === 'object' && value.campaignIds) {
                if (isAvailableForCampaign(value, campaignId)) {
                    // Include this pool (remove campaignIds from output)
                    const { campaignIds, ...poolData } = value;
                    filtered[key] = poolData.names || poolData;
                }
            } else {
                // No campaignIds, include everything
                filtered[key] = value;
            }
        }
        return filtered;
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
        const rng = new SeededRandom(seed);

        const npcs = [];

        // Generate NPCs for each building
        npcs.push(...this.generateTavernNPCs(settlement, settlementType, rng));
        npcs.push(...this.generateMerchantNPCs(settlement, settlementType, rng));
        npcs.push(...this.generateBlacksmithNPCs(settlement, settlementType, rng));
        npcs.push(...this.generateGreatHallNPCs(settlement, settlementType, rng));

        // Assign intel flags (limited per settlement, role-weighted)
        this.assignIntelFlags(npcs, rng);

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
        const patronCount = rng.nextInt(npcCounts.min - 1, npcCounts.max - 1); // -1 for innkeeper
        for (let i = 0; i < patronCount; i++) {
            const isNamed = rng.next() < 0.3; // 30% chance of being a named NPC with quest potential
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
        const citizenCount = rng.nextInt(npcCounts.min - 1, npcCounts.max - 1); // -1 for leader
        for (let i = 0; i < citizenCount; i++) {
            const isGuard = i < Math.floor(citizenCount / 2); // Half are guards
            const isNamed = rng.next() < 0.4; // 40% chance of being named

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
        const id = `npc_${settlement.x}_${settlement.y}_${building}_${rng.nextInt(100000, 999999)}`;

        // Cultures (not races — see docs/world/PEOPLES.md) drive NPC naming and voice
        // when available for the active campaign; races.json is the fallback name pool
        // for campaigns with no culture data (e.g. core).
        const culture = this.culturesData.length > 0
            ? this.weightedPick(this.culturesData, rng)
            : null;
        const namePool = culture ? culture.namePool : this.weightedPick(this.racesData, rng).namePool;

        // Generate name
        const name = this.generateName(role, settlementType, rng, namePool);

        // Generate personality
        const personality = rng.choice(RULES.npc.personalityTypes);

        // Determine if this NPC offers quests
        const questChance = RULES.npc.questChanceByRole[role] || 0;
        const offersQuest = isNamed && rng.next() < questChance;

        // Generate dialogue
        const dialogue = this.generateDialogue(role, personality, settlement, name, settlementType, rng);

        // Create shop name for merchants/blacksmiths
        let shopName = null;
        if (role === 'merchant') {
            shopName = rng.choice(this.nameData.merchantShopNames);
        } else if (role === 'blacksmith') {
            shopName = rng.choice(this.nameData.blacksmithShopNames);
        } else if (role === 'innkeeper') {
            shopName = rng.choice(this.nameData.tavernNames);
        }

        return {
            id,
            name,
            role,
            personality,
            culture: culture?.id ?? null,
            building,
            isNamed,
            offersQuest,
            settlementId: `${settlement.x}_${settlement.y}`,
            settlementName: settlement.name,
            shopName,
            dialogue,
            questIds: [], // Will be populated by QuestGenerator
            givenQuestIds: [], // Quests already given to player
            hasIntel: false, // Set by assignIntelFlags after all NPCs generated
            intelStatus: null, // null → "available" (passed passive) → "revealed" (passed active) or "locked" (failed)
            passiveFlags: {}, // Populated by SettlementUI passive approach checks
            relations: {
                score: window.game?.relationManager?.startingScore ?? 0,
                history: []
            }
        };
    }

    /**
     * Assign intel flags to a limited number of NPCs per settlement
     * Uses role-weighted probabilities from relations.json config, capped per settlement
     * @param {Array} npcs - All NPCs in the settlement
     * @param {Object} rng - Seeded RNG
     */
    assignIntelFlags(npcs, rng) {
        const intelConfig = window.game?.relationManager?.config?.intel;
        if (!intelConfig) {
            return;
        }

        const maxIntel = intelConfig.maxIntelNPCsPerSettlement || 3;
        const chanceByRole = intelConfig.intelChanceByRole || {};

        // Build weighted candidates: each NPC rolls against their role chance
        const candidates = [];
        for (const npc of npcs) {
            const chance = chanceByRole[npc.role] || 0.1;
            if (rng.next() < chance) {
                candidates.push(npc);
            }
        }

        // Shuffle and cap to max
        const shuffled = [...candidates].sort(() => rng.next() - 0.5);
        const selected = shuffled.slice(0, maxIntel);

        for (const npc of selected) {
            npc.hasIntel = true;
        }

        if (selected.length > 0) {
            console.log(`🔍 Assigned intel to ${selected.length} NPCs: ${selected.map(n => n.name).join(', ')}`);
        }
    }

    /**
   * Generate a name for an NPC
   * @param {string} role - NPC role
   * @param {string} settlementType - Settlement type
   * @param {Object} rng - Seeded RNG
   * @returns {string} Generated name
   */
    /**
   * Weighted-pick one entry from a list by its npcWeight field
   * @param {Array<Object>} list - Entries with an npcWeight field
   * @param {Object} rng - Seeded RNG
   * @returns {Object} The selected entry
   */
    weightedPick(list, rng) {
        const roll = rng.next();
        let cumulative = 0;
        let selected = list[0];
        for (const entry of list) {
            cumulative += entry.npcWeight;
            if (roll < cumulative) { selected = entry; break; }
        }
        return selected;
    }

    generateName(role, settlementType, rng, namePool) {
        // Determine gender
        const gender = rng.next() < 0.5 ? 'male' : 'female';

        const firstNamePool = this.nameData[`${namePool}FirstNames`];
        const firstName = Array.isArray(firstNamePool)
            ? rng.choice(firstNamePool)
            : firstNamePool?.[gender]
                ? rng.choice(firstNamePool[gender])
                : rng.choice(this.nameData.humanFirstNames[gender]);

        const lastNamePool = this.nameData[`${namePool}LastNames`] || this.nameData.lastNames;
        const lastName = rng.choice(lastNamePool);

        // For leaders and important NPCs, add title
        if (role === 'leader') {
            const title = rng.choice(this.nameData.titles[settlementType].leader);
            return `${title} ${firstName} ${lastName}`;
        } else if (role === 'guard' && rng.next() < 0.3) {
            // Some guards have titles
            const title = rng.choice(this.nameData.titles[settlementType].guard);
            return `${title} ${firstName}`;
        }

        // Most NPCs just have first name + last name
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
            greeting = rng.choice(personalityTemplates);
        } else {
            // Fallback generic greeting
            greeting = 'Hello there!';
        }

        // Fill in template placeholders
        greeting = this.fillTemplate(greeting, {
            settlement: settlement.name,
            name: name,
            title: role,
            tavernName: rng.choice(this.nameData.tavernNames),
            shopName: rng.choice(this.nameData.merchantShopNames)
        });

        // Select random flavor dialogue lines
        const flavorLines = [];
        const flavorCategories = Object.keys(this.dialogueData.flavorDialogue);
        const numLines = rng.nextInt(2, 4);

        for (let i = 0; i < numLines; i++) {
            const category = rng.choice(flavorCategories);
            let line = rng.choice(this.dialogueData.flavorDialogue[category]);
            line = this.fillTemplate(line, { settlement: settlement.name });
            flavorLines.push(line);
        }

        return {
            greeting,
            flavorDialogue: flavorLines,
            questOffer: rng.choice(this.dialogueData.questHooks.casual),
            questAccept: rng.choice(this.dialogueData.questAccept),
            questDecline: rng.choice(this.dialogueData.questDecline),
            questProgress: rng.choice(this.dialogueData.questProgress),
            questComplete: rng.choice(this.dialogueData.questComplete),
            goodbye: rng.choice(this.dialogueData.goodbye)
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
