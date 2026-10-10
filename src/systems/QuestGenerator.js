/**
 * Quest Generator System
 * Procedurally generates quests from templates using seeded RNG
 */

import { SeededRandom } from '../utils/rng.js';
import { RULES } from '../core/rulesEngine.js';
import { loadCampaigns, filterByCampaign, getDefaultCampaignId } from '../utils/campaignFilter.js';
import { gameState } from '../core/GameState.js';
import { questEffectTypes } from './ProceduralQuest.js';
import { skillRegistry } from './SkillRegistry.js';

class QuestGenerator {
    constructor(worldSeed, campaignId = null) {
        this.worldSeed = worldSeed;
        this.campaignId = campaignId;
        this.questData = null;
        this.monsterData = null;
    }

    /**
     * Set the campaign ID for filtering
     * @param {string} campaignId - Campaign ID
     */
    setCampaignId(campaignId) {
        this.campaignId = campaignId;
        // Re-filter data if already loaded
        if (this.rawQuestData) {
            this.applyFiltering();
        }
    }

    /**
     * Apply campaign filtering to loaded data
     */
    applyFiltering() {
        const campaignId = this.campaignId || getDefaultCampaignId();

        // Filter quest templates
        this.questData = {
            ...this.rawQuestData,
            sideQuestTemplates: filterByCampaign(this.rawQuestData.sideQuestTemplates, campaignId),
            campaignQuests: filterByCampaign(this.rawQuestData.campaignQuests, campaignId),
            proceduralBundles: filterByCampaign(this.rawQuestData.proceduralBundles || [], campaignId),
            questComposition: this.rawQuestData.questComposition ? {
                ...this.rawQuestData.questComposition,
                dimensions: Object.fromEntries(Object.entries(this.rawQuestData.questComposition.dimensions)
                    .map(([key, entries]) => [key, filterByCampaign(entries, campaignId)]))
            } : null
        };

        // Filter monsters
        this.monsterData = {
            ...this.rawMonsterData,
            monsters: filterByCampaign(this.rawMonsterData.monsters, campaignId)
        };

        console.log(`🎯 Quest data filtered for campaign: ${campaignId}`);
        console.log(`   - ${this.questData.sideQuestTemplates?.length || 0} quest templates`);
        console.log(`   - ${this.monsterData.monsters?.length || 0} monsters`);
    }

    /**
   * Load quest and monster data
   */
    async loadData() {
        if (this.questData && this.monsterData) {
            if ((this.questData.proceduralBundles?.length || this.questData.questComposition)
                && !skillRegistry.definitions.length) {
                await skillRegistry.load();
            }
            return; // Already loaded
        }

        try {
            // Load campaign data for filtering
            await loadCampaigns();

            const [questResponse, monsterResponse] = await Promise.all([
                fetch('data/quests.json'),
                fetch('data/monsters.json')
            ]);

            // Store raw data
            this.rawQuestData = await questResponse.json();
            this.rawMonsterData = await monsterResponse.json();
            await skillRegistry.load();

            // Apply campaign filtering
            this.applyFiltering();

            console.log('📜 Quest data loaded successfully');
        } catch (error) {
            console.error('Failed to load quest data:', error);
            throw error;
        }
    }

    /**
     * Return unbound dungeon hooks that point to a given settlement.
     * Includes standalone dungeons and Unified-POI-System POIs that resolved to
     * 'dungeon' — sanctuary-outcome POIs deliberately never enter this path
     * (approved design: no quest-hook intel for sanctuaries, asymmetric by design).
     * @param {string} settlementId - e.g. "12,34"
     * @returns {Array<Object>} Matching feature objects from world.metadata
     */
    getHooksForSettlement(settlementId) {
        const metadata = gameState.get('world.metadata');
        if (!metadata?.features) {
            return [];
        }
        return metadata.features.filter(f =>
            (f.type === 'dungeon' || (f.type === 'poi' && f.resolvedType === 'dungeon')) &&
            f.questHook?.nearestSettlementId === settlementId &&
            !f.questBind
        );
    }

    /** Find the closest real Investigation site without changing its settlement ownership. */
    getNearbyInvestigationHooks(settlement) {
        const features = gameState.get('world.metadata')?.features || [];
        const candidates = features.filter(feature =>
            (feature.type === 'dungeon' || (feature.type === 'poi' && feature.resolvedType === 'dungeon')) &&
            !feature.questBind
        ).map(feature => ({
            feature,
            distance: Math.hypot(feature.x - settlement.x, feature.y - settlement.y)
        })).filter(candidate => candidate.distance <= RULES.quests.investigationFallbackDistanceTiles);
        candidates.sort((a, b) => a.distance - b.distance || a.feature.x - b.feature.x || a.feature.y - b.feature.y);
        const nearest = candidates[0];
        return nearest ? [{
            ...nearest.feature,
            questHook: { ...nearest.feature.questHook, distanceTiles: Math.round(nearest.distance) }
        }] : [];
    }

    /**
   * Generate quests for a settlement when first discovered.
   * Uses world hook stubs (Phase 1) to create contextual, world-grounded quests.
   * @param {Object} settlement - Settlement feature data
   * @param {number} playerLevel - Current player level
   * @returns {Array<Object>} Generated quest instances
   */
    async generateQuestsForSettlement(settlement, playerLevel) {
        console.log('📜 QuestGenerator.generateQuestsForSettlement() called');
        console.log(`   - Settlement: ${settlement.name} (${settlement.settlementType})`);
        console.log(`   - Player level: ${playerLevel}`);

        await this.loadData();

        const budget = RULES.quests.questSlotBudget?.[settlement.settlementType]
            ?? RULES.quests.questsPerSettlement
            ?? 3;

        const settlementId = settlement.id || `${settlement.x},${settlement.y}`;
        const hooks = RULES.quests.enableWorldHooks
            ? this.getHooksForSettlement(settlementId)
            : [];
        const investigationHooks = hooks.length || !RULES.quests.enableWorldHooks
            ? hooks : this.getNearbyInvestigationHooks(settlement);

        console.log(`   - Quest budget: ${budget}, world hooks found: ${hooks.length}`);

        const rng = new SeededRandom(
            `${this.worldSeed}_settlement_${settlement.x}_${settlement.y}_quests`
        );

        const composed = this._generateComposedQuest(settlement, playerLevel, investigationHooks, rng);
        const hasBoundCombat = composed?.objectives.some(objective => objective.type === 'defeat_encounter');
        const independentHooks = hasBoundCombat
            ? hooks.filter(hook => `${hook.x},${hook.y}` !== composed.dungeonHookId) : hooks;
        const quests = [
            this._generateKillChief(settlement, playerLevel, independentHooks, rng),
            this._generateNegotiateQuest(settlement, playerLevel, independentHooks, rng) || this._generateRetrieveArtifact(settlement, playerLevel, independentHooks, rng),
            composed
                || this._generateProceduralQuest(settlement, playerLevel, investigationHooks, rng)
                || this._generateInvestigateChain(settlement, playerLevel, investigationHooks, rng)
        ].filter(Boolean).slice(0, budget);

        console.log(`📜 Generated ${quests.length} quests for ${settlement.name}`);
        return quests;
    }

    /**
     * Slot 1: Kill-Chief quest — clear the dungeon leader.
     * @param {Object} settlement
     * @param {number} playerLevel
     * @param {Array<Object>} hooks
     * @param {SeededRandom} rng
     * @returns {Object} Quest object
     */
    _generateKillChief(settlement, playerLevel, hooks, rng) {
        const hook = hooks.find(h => h.questHook?.namedBossId) || hooks[0] || null;
        if (!hook?.questHook?.namedBossId) {
            return null;
        }
        const bossName = hook?.questHook?.namedBossId || this._pickCreatureForLevel(playerLevel, rng);
        const dungeonName = hook?.name || 'the nearby ruin';
        const direction = hook ? this._getDirection(settlement, hook) : 'nearby';
        const difficulty = this._getDifficultyLabel(hook?.questHook?.distanceTiles, playerLevel);

        const questId = `quest_kill_chief_${settlement.x}_${settlement.y}_${rng.nextInt(1000, 9999)}`;
        return {
            id: questId,
            type: 'kill',
            callingArchetype: 'dedication',
            name: `End the ${bossName} Chief`,
            description: `A named ${bossName} leads raids from ${dungeonName}, to the ${direction}.`,
            objectives: [{
                type: 'kill',
                requirement: { creatureTypes: [bossName], location: { dungeonHookId: `${hook.x},${hook.y}` } },
                required: 1,
                completed: false,
                progress: 0,
                description: `Defeat the ${bossName} chief in ${dungeonName}`
            }],
            rewards: {
                xp: Math.round(RULES.quests.baseXPReward * (RULES.quests.xpMultiplierByDifficulty?.[difficulty] || 1.5) * playerLevel),
                gold: Math.round(25 * playerLevel)
            },
            dungeonHookId: hook ? `${hook.x},${hook.y}` : null,
            dungeonName,
            distanceTiles: hook?.questHook?.distanceTiles || null,
            difficulty,
            intelQuality: 'high',
            intelDialogue: {
                high: `I know exactly where they lair — ${dungeonName}, to the ${direction}.`,
                medium: `Somewhere to the ${direction}. A ruin, I think.`,
                low: 'I\'ve only heard rumours from the merchants.',
                none: 'I have no information to give you.'
            },
            timeLimit: null,
            competingParty: false,
            worldTag: 'powerVacuum',
            status: 'available',
            questGiverId: null,
            settlementId: settlement.id || `${settlement.x},${settlement.y}`
        };
    }

    /**
     * Check whether a creature ID is a bandit-type enemy.
     * @param {string} creatureId
     * @returns {boolean}
     */
    _isBanditType(creatureId) {
        if (!creatureId) {
            return false;
        }
        const banditTypes = ['bandit', 'bandit_captain', 'brigand', 'cutthroat', 'outlaw', 'thug', 'marauder'];
        return banditTypes.some(t => creatureId.toLowerCase().includes(t));
    }

    /**
     * Slot 2 (Audacity alternate): Negotiate-Bandits quest — world-first social quest.
     * Only generated when a bandit-type dungeon hook exists near the settlement.
     * @param {Object} settlement
     * @param {number} playerLevel
     * @param {Array<Object>} hooks
     * @param {SeededRandom} rng
     * @returns {Object|null} Quest object, or null if no bandit hook is available
     */
    _generateNegotiateQuest(settlement, playerLevel, hooks, rng) {
        // Find a dungeon hook whose named boss is a bandit type
        const hook = hooks.find(h => this._isBanditType(h.questHook?.namedBossId)) || null;
        if (!hook) {
            return null;
        } // Only generate if a bandit dungeon exists nearby

        const dungeonName = hook.name || 'the bandit camp';
        const direction = this._getDirection(settlement, hook);
        const difficulty = this._getDifficultyLabel(hook.questHook?.distanceTiles, playerLevel);
        const questId = `quest_negotiate_${settlement.x}_${settlement.y}_${rng.nextInt(1000, 9999)}`;
        const settlementId = settlement.id || `${settlement.x},${settlement.y}`;

        return {
            id: questId,
            type: 'social',
            callingArchetype: 'audacity',
            name: `The Bandits Threatening ${settlement.name || 'the Settlement'}`,
            description: `Bandits are demanding tribute. Find their camp at ${dungeonName} and make them leave — through words or fear.`,
            objectives: [
                {
                    type: 'reach_location',
                    description: `Find the bandit camp at ${dungeonName}`,
                    dungeonHookId: `${hook.x},${hook.y}`,
                    radius: 3,
                    progress: 0,
                    completed: false
                },
                {
                    type: 'social_challenge',
                    challengeId: 'bandit_negotiation',
                    description: 'Negotiate with or intimidate the bandit leader',
                    skills: ['influence'],
                    dc: 14,
                    progress: 0,
                    completed: false
                }
            ],
            rewards: {
                xp: Math.round(RULES.quests.baseXPReward * 1.2 * playerLevel),
                gold: Math.round(30 * playerLevel)
            },
            dungeonHookId: `${hook.x},${hook.y}`,
            dungeonName,
            distanceTiles: hook.questHook?.distanceTiles || null,
            difficulty,
            intelQuality: 'high',
            intelDialogue: {
                high: `They're camped at ${dungeonName}, to the ${direction}. I know exactly where.`,
                medium: `Somewhere to the ${direction}. I've seen their scouts on that road.`,
                low: `They come from the ${direction}. I haven't found the camp.`,
                none: 'I have no idea where they\'re based.'
            },
            timeLimit: null,
            competingParty: false,
            worldTag: 'safer',
            status: 'available',
            questGiverId: null,
            settlementId
        };
    }

    /**
     * Slot 2: Retrieve-Artifact quest — recover an item from a dungeon.
     * Writes pendingBind so SettlementManager can mark the dungeon as bound.
     * @param {Object} settlement
     * @param {number} playerLevel
     * @param {Array<Object>} hooks
     * @param {SeededRandom} rng
     * @returns {Object} Quest object
     */
    _generateRetrieveArtifact(settlement, playerLevel, hooks, rng) {
        const hook = hooks.find(h => !h.questBind) || null;
        if (!hook) {
            return null;
        }
        const itemNames = ['Corrupted Medallion', 'Ancient Seal', 'Stolen Ledger', 'Cursed Idol', 'Lost Relic'];
        const itemName = itemNames[rng.nextInt(0, itemNames.length - 1)];
        const itemId = `quest_item_${rng.nextInt(10000, 99999)}`;
        const dungeonName = hook?.name || 'a nearby dungeon';
        const direction = hook ? this._getDirection(settlement, hook) : 'nearby';
        const difficulty = this._getDifficultyLabel(hook?.questHook?.distanceTiles, playerLevel);

        const questId = `quest_retrieve_${settlement.x}_${settlement.y}_${rng.nextInt(1000, 9999)}`;
        return {
            id: questId,
            type: 'retrieve',
            callingArchetype: 'audacity',
            name: `Recover the ${itemName}`,
            description: `Retrieve the ${itemName} from ${dungeonName}, to the ${direction}.`,
            objectives: [{
                type: 'retrieve',
                requirement: { itemId },
                required: 1,
                completed: false,
                targetItemName: itemName,
                progress: 0,
                description: `Find the ${itemName} in ${dungeonName}`
            }],
            rewards: {
                xp: Math.round(RULES.quests.baseXPReward * (RULES.quests.xpMultiplierByDifficulty?.[difficulty] || 1.0) * playerLevel),
                gold: Math.round(40 * playerLevel)
            },
            dungeonHookId: hook ? `${hook.x},${hook.y}` : null,
            dungeonName,
            distanceTiles: hook?.questHook?.distanceTiles || null,
            difficulty,
            intelQuality: hook ? 'medium' : 'low',
            intelDialogue: {
                high: `I know exactly where the ${itemName} is — ${dungeonName}, to the ${direction}.`,
                medium: `It's in ${dungeonName}, somewhere to the ${direction}. I don't know which room.`,
                low: 'Somewhere in the ruins nearby. I haven\'t been there.',
                none: 'I have no useful information.'
            },
            timeLimit: null,
            competingParty: false,
            worldTag: null,
            status: 'available',
            questGiverId: null,
            settlementId: settlement.id || `${settlement.x},${settlement.y}`,
            pendingBind: hook ? { dungeonX: hook.x, dungeonY: hook.y, itemId, itemName } : null
        };
    }

    /**
     * Slot 3: Investigate-Chain quest — find out why something is wrong.
     * Does not consume a hook.
     * @param {Object} settlement
     * @param {number} playerLevel
     * @param {Array<Object>} hooks
     * @param {SeededRandom} rng
     * @returns {Object|null} Quest object, or null if no eligible target exists
     */
    _generateInvestigateChain(settlement, playerLevel, hooks, rng) {
        if (hooks.length === 0) {
            return null;
        }
        const subjects = [
            { creature: 'wolves', description: 'acting outside their normal range' },
            { creature: 'bandits', description: 'using unusual tactics' },
            { creature: 'undead', description: 'stirring in the old burial grounds' },
            { creature: 'cultists', description: 'gathering in secret' }
        ];
        const subject = subjects[rng.nextInt(0, subjects.length - 1)];
        const hook = hooks[rng.nextInt(0, Math.max(0, hooks.length - 1))] || null;
        const dungeonName = hook?.name || 'a nearby ruin';
        const direction = hook ? this._getDirection(settlement, hook) : 'nearby';
        const dc = 12 + Math.floor(playerLevel / 3);

        const questId = `quest_investigate_${settlement.x}_${settlement.y}_${rng.nextInt(1000, 9999)}`;
        const creatureCap = subject.creature.charAt(0).toUpperCase() + subject.creature.slice(1);
        const descCap = subject.description.charAt(0).toUpperCase() + subject.description.slice(1);
        return {
            id: questId,
            type: 'investigate',
            callingArchetype: 'curiosity',
            name: `Why Are the ${creatureCap} ${descCap}?`,
            description: `Someone needs to understand why the ${subject.creature} have been ${subject.description}. The answer may lie in ${dungeonName}.`,
            objectives: [{
                type: 'investigate',
                targetLocation: hook ? `${hook.x},${hook.y}` : null,
                investigationDC: dc,
                progress: 0,
                description: `Find evidence in ${dungeonName}`
            }],
            rewards: {
                xp: Math.round(RULES.quests.baseXPReward * 0.8 * playerLevel),
                gold: Math.round(20 * playerLevel)
            },
            dungeonHookId: hook ? `${hook.x},${hook.y}` : null,
            dungeonName,
            distanceTiles: hook?.questHook?.distanceTiles || null,
            difficulty: 'easy',
            intelQuality: 'low',
            intelDialogue: {
                high: `I know exactly what you'll find — look in room one of ${dungeonName}.`,
                medium: `Start in ${dungeonName}. The answer should be near the entrance.`,
                low: `I only know the ${subject.creature} have changed. Look for signs.`,
                none: 'I have no useful information.'
            },
            timeLimit: null,
            competingParty: false,
            worldTag: null,
            status: 'available',
            questGiverId: null,
            settlementId: settlement.id || `${settlement.x},${settlement.y}`,
            pendingBind: null
        };
    }

    /**
     * Enumerate compatible component assignments. Content declares dependencies;
     * the compiler does not branch on a story, subject or component ID.
     */
    getCompatibleCompositions() {
        const dimensions = this.questData?.questComposition?.dimensions;
        if (!dimensions) {
            return [];
        }
        let combinations = [{}];
        for (const [dimension, entries] of Object.entries(dimensions)) {
            combinations = combinations.flatMap(combination =>
                entries.map(entry => ({ ...combination, [dimension]: entry })));
        }
        return combinations.filter(combination => Object.values(combination).every(component =>
            Object.entries(component.requires || {}).every(([dimension, ids]) =>
                ids.includes(combination[dimension]?.id))));
    }

    /** Compose one truth-consistent incident and bind only supported producers. */
    _generateComposedQuest(settlement, playerLevel, hooks, rng) {
        const grammar = this.questData?.questComposition;
        if (!RULES.quests.proceduralCore.enabled || !grammar) {
            return null;
        }
        const game = globalThis.window?.game;
        const settlementId = settlement.id || `${settlement.x},${settlement.y}`;
        const history = Object.values(gameState.get('quests') || {}).filter(Array.isArray).flat();
        const occupied = new Set(history.filter(quest => quest.procedural
            && ['available', 'active', 'ready_to_turn_in'].includes(quest.status))
            .map(quest => quest.dungeonHookId));
        const cultures = game?.npcGenerator?.culturesData || [];
        const npcs = (settlement.npcs || []).filter(npc => npc.id
            && cultures.some(culture => culture.id === npc.culture))
            .sort((a, b) => a.id.localeCompare(b.id));
        const giver = npcs.find(npc => npc.offersQuest);
        if (!giver || !game?.relationManager?.modifyFactionReputation) {
            return null;
        }
        const merchant = npcs.find(npc => npc.role === 'merchant');
        const participants = { giver, merchant };
        const combinations = this.getCompatibleCompositions();
        const candidates = [];
        for (const site of [...hooks].sort((a, b) => a.x - b.x || a.y - b.y)) {
            const siteId = `${site.x},${site.y}`;
            if (occupied.has(siteId)) {
                continue;
            }
            const dungeonType = game?.dungeonManager?.getQuestDungeonType?.(site) || site.dungeonType
                || game?.dungeonManager?.dungeonGenerator?.dungeonTypes?.find(type => type.id === site.dungeonTypeId);
            const bossPool = dungeonType?.bossPool || [];
            const hasBoss = bossPool.some(entry => typeof entry === 'string'
                || (entry.id && playerLevel >= (entry.minLevel || 1) && playerLevel <= (entry.maxLevel || 10)));
            for (const components of combinations) {
                const capabilities = new Set(Object.values(components).flatMap(component => component.capabilities || []));
                if (capabilities.has('combat') && (!hasBoss
                    || history.some(quest => ['available', 'active', 'ready_to_turn_in'].includes(quest.status)
                        && quest.type === 'kill' && quest.dungeonHookId === siteId)
                    || [...(site.questEncounterClears || []), ...(site.questEncounterVictories || [])]
                        .some(receipt => receipt.encounterKey === `${siteId}:boss`)
                    || !game?.dungeonManager?.canClearQuestEncounter
                    || !game?.dungeonManager?.clearQuestEncounter)) {
                    continue;
                }
                if (capabilities.has('goods') && (!merchant || !game?.merchantManager?.canAddQuestStock(
                    settlementId, components.subject.itemId, merchant.role))) {
                    continue;
                }
                const requested = new Set(Object.values(components).flatMap(component => component.activities || []));
                const activityIds = Object.keys(grammar.activities).filter(id => requested.has(id));
                if ([...requested].some(id => !grammar.activities[id])) {
                    continue;
                }
                const activities = activityIds.map(id => grammar.activities[id]);
                if (activities.some(activity => !activity
                    || (activity.action?.skillId && !skillRegistry.getDefinition(activity.action.skillId)))) {
                    continue;
                }
                if ((components.goal.resolutions || []).some(choice => (choice.effects || []).some(effect =>
                    !questEffectTypes.includes(effect.type) || !participants[effect.participant]
                    || (effect.type === 'faction' && !Number.isFinite(RULES.reputation.questRewards[effect.rewardTier]))
                    || (effect.type === 'relation' && !game.relationManager.config?.modifiers?.[effect.modifier])))) {
                    continue;
                }
                candidates.push({ site, components, activities });
            }
        }
        if (!candidates.length) {
            return null;
        }
        const signature = components => Object.fromEntries(Object.entries(components).map(([key, value]) => [key, value.id]));
        const seen = new Set(history.filter(quest => quest.procedural?.components)
            .map(quest => JSON.stringify(quest.procedural.components)));
        const fresh = candidates.filter(candidate => !seen.has(JSON.stringify(signature(candidate.components))));
        const arrangements = new Set(history.filter(quest => quest.procedural?.components)
            .map(quest => quest.procedural.arrangement));
        const distinct = candidates.filter(candidate =>
            !arrangements.has(candidate.activities.map(activity => activity.id).join('>')));
        const { site, components, activities } = rng.choice(distinct.length ? distinct : fresh.length ? fresh : candidates);
        const siteId = `${site.x},${site.y}`;
        const quantity = RULES.quests.proceduralCore.shipmentQuantity;
        const salvageQuantity = components.materialState.salvage
            ? RULES.quests.proceduralCore.salvageQuantity : 0;
        const baseQuantity = quantity - salvageQuantity;
        const context = {
            siteId, siteName: site.name || 'the bound site', giverName: giver.name,
            merchantName: merchant?.name || giver.name, itemId: components.subject.itemId || '',
            subjectName: components.subject.name, causeText: components.cause.text,
            custodyText: components.custody.text, hazardText: components.hazard.text,
            materialText: components.materialState.text, goalText: components.goal.text, baseQuantity, salvageQuantity,
            encounterKey: `${siteId}:boss`
        };
        context.goalText = this.fillTemplate(context.goalText, context);
        const bind = value => {
            if (typeof value === 'string') {
                if (/^\{\w+\}$/.test(value) && Object.hasOwn(context, value.slice(1, -1))) {
                    return context[value.slice(1, -1)];
                }
                return this.fillTemplate(value, context);
            }
            if (Array.isArray(value)) {
                return value.map(bind);
            }
            if (value && typeof value === 'object') {
                return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, bind(entry)]));
            }
            return value;
        };
        const objectives = activities.flatMap(activity => activity.objective ? [bind(activity.objective)] : [])
            .map(objective => ({ completed: false, progress: 0, required: 1, ...objective }));
        const actions = activities.flatMap(activity => activity.action ? [bind(activity.action)] : []);
        const combatObjectives = objectives.filter(objective => objective.type === 'defeat_encounter').map(objective => objective.id);
        for (const action of actions.filter(entry => entry.acquire || entry.salvage)) {
            action.requiresObjectives = [...new Set([...(action.requiresObjectives || []), ...combatObjectives])];
        }
        const obtainableFacts = new Set([...(grammar.baseline.facts || []),
            ...actions.flatMap(action => action.facts || [])].map(fact => fact.id));
        const resolutions = bind(components.goal.resolutions).filter(choice =>
            (choice.requiresFacts || []).every(id => obtainableFacts.has(id)));
        const requiredObjectives = objectives.map(objective => objective.id);
        for (const choice of resolutions.filter(choice => choice.incomplete)) {
            const recoveryObjectives = objectives.filter(objective => objective.type === 'retrieve').map(objective => objective.id);
            choice.excludesObjectives = recoveryObjectives.length ? recoveryObjectives
                : requiredObjectives.filter(id => id !== grammar.baseline.objectiveId);
        }
        for (const choice of resolutions.filter(choice => choice.fulfilled)) {
            choice.requiresObjectives = requiredObjectives;
            if (components.hazard.capabilities?.includes('combat')) {
                choice.effects.push({ id: 'cleared_occupation', type: 'target_cleared', sourceObjectiveId: 'defeat_occupation' });
            }
        }
        const distance = site.questHook?.distanceTiles ?? Math.round(Math.hypot(site.x - settlement.x, site.y - settlement.y));
        return {
            id: `quest_composed_${settlement.x}_${settlement.y}_${rng.nextInt(1000, 9999)}`,
            type: components.goal.questType, family: grammar.family,
            name: bind(components.goal.name),
            description: bind(grammar.description),
            settlementId, dungeonHookId: siteId, dungeonName: site.name, distanceTiles: distance,
            questGiverId: giver.id,
            questGiver: { npcId: giver.id, npcName: giver.name, role: giver.role, settlementId },
            procedural: { version: grammar.version, components: signature(components),
                arrangement: activities.map(activity => activity.id).join('>'),
                participants: Object.fromEntries(Object.entries(participants).filter(([, npc]) => npc)
                    .map(([role, npc]) => [role, { npcId: npc.id, name: npc.name, culture: npc.culture, role: npc.role }])) },
            evidence: { siteSearched: false, facts: [], actions: [], attempts: {} },
            baseline: bind(grammar.baseline), actions, resolutions, objectives,
            rewards: { xp: Math.round(RULES.quests.baseXPReward * RULES.quests.proceduralCore.xpMultiplier * playerLevel),
                gold: RULES.quests.proceduralCore.goldPerLevel * playerLevel },
            difficulty: combatObjectives.length ? 'deadly' : this._getDifficultyLabel(distance, playerLevel),
            status: 'available', worldTag: null, pendingBind: null
        };
    }

    _generateProceduralQuest(settlement, playerLevel, hooks, rng) {
        if (!RULES.quests.proceduralCore.enabled) {
            return null;
        }
        const history = Object.values(gameState.get('quests') || {}).filter(Array.isArray).flat();
        const occupied = new Set(history.filter(quest => quest.procedural
            && ['available', 'active', 'ready_to_turn_in'].includes(quest.status)).map(quest => quest.dungeonHookId));
        const sites = hooks.filter(hook => !occupied.has(`${hook.x},${hook.y}`))
            .sort((a, b) => a.x - b.x || a.y - b.y);
        if (!sites.length) {
            return null;
        }
        const cultures = globalThis.window?.game?.npcGenerator?.culturesData || [];
        const npcs = (settlement.npcs || []).filter(npc => npc.id
            && cultures.some(culture => culture.id === npc.culture))
            .sort((a, b) => a.id.localeCompare(b.id));
        const giver = npcs.find(npc => npc.offersQuest);
        if (!giver || !globalThis.window?.game?.relationManager?.modifyFactionReputation) {
            return null;
        }
        const others = npcs.filter(npc => npc.id !== giver.id);
        const merchant = npcs.find(npc => npc.role === 'merchant') || npcs.find(npc => npc.role === 'blacksmith');
        const participants = { giver, witness: others[0], claimant: others[1], merchant };
        const merchantManager = globalThis.window?.game?.merchantManager;
        const relationManager = globalThis.window?.game?.relationManager;
        const candidates = (this.questData.proceduralBundles || []).filter(bundle =>
            (bundle.requiredParticipants || []).every(role => participants[role])
            && bundle.actions.every(action => ['site', 'settlement'].includes(action.location)
                && (!action.skillId || skillRegistry.getDefinition(action.skillId))
                && (!action.npcParticipant || participants[action.npcParticipant]))
            && bundle.resolutions.every(choice => (choice.effects || []).every(effect =>
                questEffectTypes.includes(effect.type) && participants[effect.participant]
                && (effect.type !== 'faction' || Number.isFinite(RULES.reputation.questRewards[effect.rewardTier]))
                && (effect.type !== 'relation' || relationManager?.config?.modifiers?.[effect.modifier])
                && (effect.type !== 'merchant_stock' || merchantManager?.canAddQuestStock(
                    settlement.id || `${settlement.x},${settlement.y}`, effect.itemId, merchant?.role))
            )));
        if (!candidates.length) {
            return null;
        }
        const used = new Set(history.filter(quest => quest.procedural).map(quest => quest.procedural.arrangement));
        const fresh = candidates.filter(bundle => !used.has(bundle.arrangement));
        const bundle = rng.choice(fresh.length ? fresh : candidates);
        const site = sites[0];
        const distance = site.questHook?.distanceTiles ?? Math.round(Math.hypot(site.x - settlement.x, site.y - settlement.y));
        const names = Object.fromEntries(Object.entries(participants).filter(([, npc]) => npc)
            .map(([role, npc]) => [`${role}Name`, npc.name]));
        const fillBoundContent = value => {
            if (typeof value === 'string') {
                return this.fillTemplate(value, names);
            }
            if (Array.isArray(value)) {
                return value.map(fillBoundContent);
            }
            if (value && typeof value === 'object') {
                return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, fillBoundContent(entry)]));
            }
            return value;
        };
        const bound = fillBoundContent(bundle);
        const settlementId = settlement.id || `${settlement.x},${settlement.y}`;
        return {
            id: `quest_trace_${settlement.x}_${settlement.y}_${rng.nextInt(1000, 9999)}`,
            type: 'investigate', family: 'trace_disruption', name: bound.name,
            description: `${bound.description} Search ${site.name || 'the bound site'}.`,
            settlementId, dungeonHookId: `${site.x},${site.y}`, dungeonName: site.name,
            distanceTiles: distance,
            questGiverId: giver.id,
            questGiver: { npcId: giver.id, npcName: giver.name, role: giver.role, settlementId },
            procedural: { templateId: bound.id, variantId: bound.id, arrangement: bound.arrangement,
                participants: Object.fromEntries(Object.entries(participants).filter(([, npc]) => npc)
                    .map(([role, npc]) => [role, { npcId: npc.id, name: npc.name, culture: npc.culture, role: npc.role }])) },
            evidence: { siteSearched: false, facts: [], actions: [], attempts: {} },
            baseline: bound.baseline, actions: bound.actions, resolutions: bound.resolutions,
            objectives: [{ type: 'observe', description: `Examine the signs in ${site.name || 'the site'}`,
                completed: false, progress: 0, required: 1 }],
            rewards: { xp: Math.round(RULES.quests.baseXPReward * RULES.quests.proceduralCore.xpMultiplier * playerLevel),
                gold: RULES.quests.proceduralCore.goldPerLevel * playerLevel },
            difficulty: this._getDifficultyLabel(distance, playerLevel), status: 'available', worldTag: null, pendingBind: null
        };
    }

    /**
     * Compute cardinal direction from settlement to feature.
     * @param {Object} settlement
     * @param {Object} feature
     * @returns {string} 'north'|'south'|'east'|'west'
     */
    _getDirection(settlement, feature) {
        const dx = feature.x - settlement.x;
        const dy = feature.y - settlement.y;
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'east' : 'west';
        }
        return dy > 0 ? 'south' : 'north';
    }

    /**
     * Map distance-tiles to a difficulty label.
     * @param {number|null} distanceTiles
     * @param {number} playerLevel
     * @returns {string}
     */
    _getDifficultyLabel(distanceTiles, playerLevel) {
        if (!distanceTiles) {
            return 'normal';
        }
        if (distanceTiles < 30) {
            return 'easy';
        }
        if (distanceTiles < 80) {
            return 'normal';
        }
        if (distanceTiles < 130) {
            return 'hard';
        }
        return 'deadly';
    }

    /**
     * Pick a creature appropriate for the player's level.
     * @param {number} playerLevel
     * @param {SeededRandom} rng
     * @returns {string} Creature type ID
     */
    _pickCreatureForLevel(playerLevel, rng) {
        const byLevel = [
            ['goblin', 'bandit', 'wolf'],
            ['orc', 'bugbear', 'skeleton'],
            ['gnoll', 'hobgoblin', 'ghoul'],
            ['ogre', 'werewolf', 'wraith'],
            ['veteran', 'mage', 'medusa']
        ];
        const bracket = byLevel[Math.min(Math.floor((playerLevel - 1) / 2), byLevel.length - 1)];
        return bracket[rng.nextInt(0, bracket.length - 1)];
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
        const questId = `quest_${settlement.x}_${settlement.y}_${rng.nextInt(100000, 999999)}`;

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

        if (!questData) {
            return null;
        }

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

        // Pick appropriate creature (use challengeRating field from monsters.json)
        const validCreatures = this.monsterData.monsters.filter(monster => {
            const cr = monster.challengeRating || monster.cr || 0;
            return cr >= Math.max(0.125, minCR) && cr <= maxCR;
        });

        if (validCreatures.length === 0) {
            console.warn(`No valid creatures for kill quest (CR ${minCR}-${maxCR})`);
            console.warn('Available monsters:', this.monsterData.monsters.map(m => ({ name: m.name, cr: m.challengeRating || m.cr })));
            return null;
        }

        const creature = rng.choice(validCreatures);
        const creatureCR = creature.challengeRating || creature.cr || 1;

        // Determine count
        const countRange = gen.countRange || [3, 8];
        const count = rng.nextInt(countRange[0], countRange[1]);

        // Pick quest giver NPC role
        const npcRole = rng.choice(gen.validNPCRoles || ['innkeeper', 'leader']);

        // Calculate rewards
        const rewards = this.calculateRewards(template.rewards, {
            creatureCR: creatureCR,
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
        const itemType = rng.choice(gen.validItemTypes || ['heirloom', 'artifact']);
        const dungeonType = rng.choice(gen.dungeonTypes || ['Cave', 'Ruins']);
        const itemName = `Lost ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`;
        const itemId = `quest_item_${itemType}_${rng.nextInt(1000, 9999)}`;

        // Pick quest giver
        const npcRole = rng.choice(gen.validNPCRoles || ['merchant', 'innkeeper']);

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
        const npcRole = rng.choice(gen.validNPCRoles || ['merchant', 'innkeeper']);

        // For simplicity, target same settlement (future: different settlements)
        const targetSettlement = settlement;
        const targetNpcRole = rng.choice(['merchant', 'blacksmith', 'leader']);

        // Calculate distance (for now, use proximity)
        const distance = rng.nextInt(gen.minDistance || 50, gen.maxDistance || 200);

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
            const desc = this.fillTemplate(objTemplate.description, {
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
        const locationType = rng.choice(locationTypes);
        const locationName = `Nearby ${locationType.charAt(0).toUpperCase() + locationType.slice(1)}`;

        // Pick quest giver
        const npcRole = rng.choice(gen.validNPCRoles || ['leader', 'guard']);

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
            const desc = this.fillTemplate(objTemplate.description, {
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
        const npcRole = rng.choice(gen.validNPCRoles || ['guard', 'leader']);

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
        let expression = formula;
        try {
            // Replace variables in formula
            // IMPORTANT: Sort by length (longest first) to avoid partial replacements
            // e.g., "difficulty" shouldn't replace part of "difficultyMultiplier"
            const sortedKeys = Object.keys(variables).sort((a, b) => b.length - a.length);
            for (const key of sortedKeys) {
                const value = variables[key];
                expression = expression.replace(new RegExp(key, 'g'), value);
            }

            console.log(`📊 Evaluating formula: "${formula}" with variables:`, variables);
            console.log(`📊 Result expression: "${expression}"`);

            // Evaluate safely (basic math only)

            const result = eval(expression);
            return Math.round(result);
        } catch (error) {
            console.error('Formula evaluation error:', formula, error);
            console.error('Variables:', variables);
            console.error('Expression after substitution:', expression);
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
