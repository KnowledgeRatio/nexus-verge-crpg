/**
 * CompanionManager — Party Member System
 *
 * Owns: party roster, relationship meter, candidate generation, companion creation,
 * devoted passive tracking, rest activity processing, party synergy computation.
 * Does NOT touch the DOM. All UI wired in main.js.
 *
 * Save/load is handled by GameState.toJSON()/fromJSON() — CompanionManager
 * only reads and writes party state through gameState.
 */

import { gameState } from '../core/GameState.js';
import { RULES } from '../core/rulesEngine.js';
import { SeededRandom } from '../utils/rng.js';
import Character from './Character.js';

// ---------------------------------------------------------------------------
// Name-generation data — short procedural fallback when no name is provided
// ---------------------------------------------------------------------------
const NAME_PREFIXES = [
    'Aer', 'Bran', 'Cal', 'Dar', 'Eld', 'Fen', 'Gal', 'Har', 'Isla', 'Jor',
    'Kel', 'Lyr', 'Myr', 'Nar', 'Orin', 'Pell', 'Quen', 'Ran', 'Syl', 'Tor',
    'Ulf', 'Val', 'Wren', 'Xan', 'Yon', 'Zel'
];
const NAME_SUFFIXES = [
    'a', 'an', 'ara', 'en', 'ene', 'ia', 'ic', 'iel', 'in', 'ine',
    'ion', 'is', 'ix', 'on', 'or', 'os', 'ra', 'ric', 'rin', 'ros',
    'syn', 'thal', 'thas', 'wyn', 'yn', 'ys'
];

// ---------------------------------------------------------------------------
// Tier ordering — used for >= comparisons
// ---------------------------------------------------------------------------
const TIER_ORDER = ['hostile', 'unfriendly', 'neutral', 'friendly', 'devoted'];

export default class CompanionManager {
    /**
     * @param {object} config - Defaults to RULES.party
     */
    constructor(config = RULES.party) {
        this.config = config;
        /** @type {object|null} - Parsed companions.json */
        this.companionData = null;
        /** @type {SeededRandom|null} */
        this.rng = null;
    }

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    /**
     * Load companion data and set up the seeded RNG.
     * Subscribes to combat.ended for post-combat handling.
     * @param {string|number} seed - World seed
     */
    async initialize(seed) {
        const response = await fetch('data/companions.json');
        if (!response.ok) {
            throw new Error(`CompanionManager: Failed to load companions.json (${response.status})`);
        }
        this.companionData = await response.json();
        this.rng = new SeededRandom(`${String(seed)  }_companions`);

        // Subscribe to combat.ended so handlePostCombat fires automatically.
        // CombatManager fires: gameState.notify('combat.ended', { outcome })
        gameState.subscribe('combat.ended', (result) => this.handlePostCombat(result));

        console.log('👥 CompanionManager initialized');
    }

    // =========================================================================
    // ROSTER MANAGEMENT
    // =========================================================================

    /**
     * Add a companion to the party. Returns false if already at cap.
     * @param {Character} companion - Character with companionMeta attached
     * @returns {boolean}
     */
    addCompanion(companion) {
        const party = gameState.get('party');
        if (!party) {
            return false;
        }

        if (party.companions.length >= this.config.maxCompanions) {
            console.warn(`👥 Cannot recruit — party at cap (${this.config.maxCompanions} companions)`);
            return false;
        }

        party.companions.push(companion);
        gameState.set('party.companions', party.companions);
        gameState.addMessage(`${companion.name} has joined your party.`, 'success');

        // Recompute synergies after roster change
        this.getActiveSynergies();

        console.log(`👥 ${companion.name} added to party (${party.companions.length}/${this.config.maxCompanions})`);
        return true;
    }

    /**
     * Returns true if the party has room for another companion.
     * @returns {boolean}
     */
    canRecruit() {
        const companions = gameState.get('party.companions') || [];
        return companions.length < this.config.maxCompanions;
    }

    /**
     * Remove a companion from the party.
     * @param {string} companionId
     * @param {'player'|'hostile_departure'|'faction_conflict'|'death'} reason
     */
    dismissCompanion(companionId, reason) {
        const party = gameState.get('party');
        if (!party) {
            return;
        }

        const idx = party.companions.findIndex(c => c.id === companionId);
        if (idx < 0) {
            console.warn(`👥 dismissCompanion: companion ${companionId} not found`);
            return;
        }

        const companion = party.companions[idx];
        party.companions.splice(idx, 1);
        gameState.set('party.companions', party.companions);

        const reasonMessages = {
            player:             `${companion.name} has parted ways with the group.`,
            hostile_departure:  `${companion.name} has left the party — your relationship has broken down.`,
            faction_conflict:   `${companion.name} has departed due to a faction conflict.`,
            death:              `${companion.name} has fallen.`
        };

        const msg = reasonMessages[reason] || `${companion.name} has left the party.`;
        const msgType = reason === 'death' ? 'error' : 'warning';
        gameState.addMessage(msg, msgType);

        if (reason === 'death') {
            const fallen = gameState.get('fallenCompanions') || [];
            fallen.push({
                name:       companion.name,
                calling:    companion.class?.id || 'unknown',
                level:      companion.level,
                motivation: companion.companionMeta?.motivationId || 'unknown',
                cause:      'combat'
            });
            gameState.set('fallenCompanions', fallen);
            console.log(`💀 ${companion.name} added to fallenCompanions`);
        }

        // Recompute synergies after roster change
        this.getActiveSynergies();

        console.log(`👥 ${companion.name} dismissed (reason: ${reason})`);
    }

    /**
     * Returns the current companions array.
     * @returns {Character[]}
     */
    getParty() {
        return gameState.get('party.companions') || [];
    }

    /**
     * Returns total living party size (player + non-downed companions).
     * @returns {number}
     */
    getPartySize() {
        return gameState.getPartySize();
    }

    // =========================================================================
    // COMPANION CREATION
    // =========================================================================

    /**
     * Create a companion Character with companionMeta attached.
     * Loads class data from the already-initialized gameState static data or
     * falls back to a fetch when classes haven't been loaded yet.
     *
     * @param {object} opts
     * @param {string}   [opts.name]             - Companion name (generated if omitted)
     * @param {string}   opts.callingId           - Class id ('dedication'|'scholar'|'wanderlust')
     * @param {'standard'|'wanderlust'} [opts.companionType] - Derived from callingId if omitted
     * @param {string}   [opts.motivationId]      - One of the 5 archetypes (random if omitted)
     * @param {number}   [opts.level]             - Character level (default 1)
     * @param {string}   [opts.source]            - Acquisition source
     * @param {string[]} [opts.skillAssignments]  - Skill ids (picked randomly if omitted)
     * @param {string[]} [opts.campaignIds]       - Campaign filter ids
     * @returns {Character} Character with companionMeta
     */
    async createCompanion({
        name,
        callingId,
        companionType,
        motivationId,
        level = 1,
        source = 'settlement',
        skillAssignments,
        campaignIds = ['core']
    } = {}) {
        // ---- Resolve class data ----
        let classData = null;
        try {
            const resp = await fetch('data/classes.json');
            const json = await resp.json();
            classData = json.classes.find(c => c.id === callingId);
        } catch (err) {
            console.error('CompanionManager: failed to load classes.json', err);
        }
        if (!classData) {
            throw new Error(`CompanionManager.createCompanion: unknown callingId "${callingId}"`);
        }

        // ---- Resolve companionType ----
        if (!companionType) {
            // Derive from companionTypes config in companions.json
            companionType = 'standard';
            if (this.companionData?.companionTypes) {
                for (const [typeId, typeData] of Object.entries(this.companionData.companionTypes)) {
                    if (typeData.callings?.includes(callingId)) {
                        companionType = typeId;
                        break;
                    }
                }
            }
        }

        // ---- Resolve motivationId ----
        if (!motivationId) {
            const archetypeIds = Object.keys(this.companionData?.motivationArchetypes || {});
            motivationId = archetypeIds.length > 0 ? this.rng.choice(archetypeIds) : 'duty';
        }

        // ---- Resolve name ----
        if (!name) {
            const prefix = this.rng.choice(NAME_PREFIXES);
            const suffix = this.rng.choice(NAME_SUFFIXES);
            name = prefix + suffix;
        }

        // ---- Resolve skill assignments ----
        const skillCount = this.config.companionTypeSkillCounts[companionType] ?? 2;
        if (!skillAssignments || skillAssignments.length === 0) {
            const availableSkills = classData.skillChoices?.from || [];
            skillAssignments = availableSkills.length > 0
                ? this.rng.sample(availableSkills, Math.min(skillCount, availableSkills.length))
                : [];
        }

        // ---- Ability scores: sensible defaults per calling ----
        const baseAbilities = this._defaultAbilitiesForCalling(callingId);

        // ---- Load a minimal species (human — no stat changes) ----
        let speciesData = null;
        try {
            const resp = await fetch('data/races.json');
            const json = await resp.json();
            speciesData = json.races?.find(r => r.id === 'human') || json.races?.[0] || null;
        } catch (err) {
            console.warn('CompanionManager: could not load races.json, using null species', err);
        }
        if (!speciesData) {
            // Minimal species stub to satisfy Character constructor
            speciesData = { id: 'human', name: 'Human', speed: 30, abilityScoreIncrease: {}, traits: [], languages: ['Common'] };
        }

        // ---- Background: minimal stub ----
        const backgroundData = {
            id: 'adventurer',
            name: 'Adventurer',
            skillProficiencies: [],
            toolProficiencies: [],
            equipment: [],
            feature: null,
            startingGold: 0
        };

        // ---- Construct Character ----
        const character = new Character({
            name,
            species:        speciesData,
            class:          classData,
            background:     backgroundData,
            level,
            baseAbilities,
            skillChoices:   skillAssignments,
            gold:           0,
            isNPC:          false
        });

        // ---- Attach companionMeta ----
        character.companionMeta = {
            companionType,
            motivationId,
            motivationRevealed: false,
            skillAssignments,
            source,
            relationship: 0,
            devotedPassiveUsedThisRest: false,
            reactionMode: this.config.defaultReactionMode || 'ask',
            dialogueNodeIndex: 0,
            isDowned: false,
            ultimatumPending: false,
            factionId: null
        };

        console.log(`👥 Created companion: ${name} (${callingId}, motivation: ${motivationId})`);
        return character;
    }

    /**
     * Generate default ability scores that favour a calling's primary stats.
     * @private
     */
    _defaultAbilitiesForCalling(callingId) {
        const defaults = {
            dedication: { str: 16, dex: 12, con: 14, int: 8, wis: 13, cha: 10 },
            scholar:    { str: 8,  dex: 12, con: 13, int: 16, wis: 14, cha: 10 },
            wanderlust: { str: 10, dex: 16, con: 12, int: 13, wis: 10, cha: 14 }
        };
        return defaults[callingId] || { str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 12 };
    }

    // =========================================================================
    // RELATIONSHIP
    // =========================================================================

    /**
     * Apply a relationship event to a companion.
     * Only processes events where activeInCode: true.
     *
     * @param {string} companionId
     * @param {string} eventId
     * @returns {{ oldValue: number, newValue: number, tierChanged: boolean, newTier: string }|null}
     */
    applyRelationshipEvent(companionId, eventId) {
        // Guard: overridePreference must not fire during combat
        if (eventId === 'overridePreference' && gameState.get('combat')?.active) {
            return null;
        }

        const companions = gameState.get('party.companions') || [];
        const companion = companions.find(c => c.id === companionId);
        if (!companion || !companion.companionMeta) {
            return null;
        }

        const motivationId = companion.companionMeta.motivationId;
        const archetype = this.companionData?.motivationArchetypes?.[motivationId];
        if (!archetype) {
            console.warn(`👥 applyRelationshipEvent: unknown motivationId "${motivationId}"`);
            return null;
        }

        const eventData = archetype.relationshipEvents?.[eventId];
        if (!eventData) {
            console.warn(`👥 applyRelationshipEvent: unknown eventId "${eventId}" for motivation "${motivationId}"`);
            return null;
        }

        // Only process events with activeInCode: true
        if (eventData.activeInCode === false) {
            return null;
        }

        const oldValue = companion.companionMeta.relationship;
        const newValue = Math.max(
            this.config.relationshipMin,
            Math.min(this.config.relationshipMax, oldValue + eventData.delta)
        );

        const oldTier = this._getTierForValue(oldValue);
        const newTier = this._getTierForValue(newValue);
        const tierChanged = oldTier !== newTier;

        // Persist
        gameState.updateCompanionRelationship(companionId, newValue);

        // Fire reaction line if delta is significant (|delta| >= 8)
        if (Math.abs(eventData.delta) >= 8) {
            const reactionLine = archetype.reactionLines?.[eventId];
            if (reactionLine) {
                const line = reactionLine.replace(/\{name\}/g, companion.name);
                gameState.addMessage(line, 'info');
            }
        }

        console.log(`👥 Relationship [${companion.name}] ${eventId}: ${oldValue} → ${newValue} (${oldTier}→${newTier})`);

        return { oldValue, newValue, tierChanged, newTier };
    }

    /**
     * Get the relationship tier string for a companion.
     * @param {string} companionId
     * @returns {'hostile'|'unfriendly'|'neutral'|'friendly'|'devoted'}
     */
    getRelationshipTier(companionId) {
        const companions = gameState.get('party.companions') || [];
        const companion = companions.find(c => c.id === companionId);
        if (!companion || !companion.companionMeta) {
            return 'neutral';
        }
        return this._getTierForValue(companion.companionMeta.relationship);
    }

    /**
     * Get display info for a companion's relationship.
     * @param {string} companionId
     * @returns {{ label: string, tier: string }}
     */
    getRelationshipDisplay(companionId) {
        const tier = this.getRelationshipTier(companionId);
        const tierData = this.companionData?.relationshipTiers?.[tier];
        return {
            label: tierData?.label || tier,
            tier
        };
    }

    /**
     * Check all companions for ultimatum conditions. Call after every rest.
     * - If relationship <= hostileThreshold and !ultimatumPending → set pending
     * - If already pending and still <= threshold → dismiss
     */
    checkUltimata() {
        const companions = [...(gameState.get('party.companions') || [])];
        const threshold = this.config.hostileThreshold;

        for (const companion of companions) {
            const meta = companion.companionMeta;
            if (!meta) {
                continue;
            }

            const rel = meta.relationship;
            if (rel <= threshold) {
                if (!meta.ultimatumPending) {
                    meta.ultimatumPending = true;
                    gameState.addMessage(
                        `${companion.name} is deeply unhappy. They may leave if things don't improve.`,
                        'warning'
                    );
                    console.log(`👥 Ultimatum pending: ${companion.name} (relationship ${rel})`);
                } else {
                    // Already warned — dismiss
                    gameState.addMessage(
                        `${companion.name} has had enough and storms off.`,
                        'error'
                    );
                    this.dismissCompanion(companion.id, 'hostile_departure');
                }
            } else if (meta.ultimatumPending && rel > threshold) {
                // Relationship recovered — clear ultimatum
                meta.ultimatumPending = false;
            }
        }

        // Persist updated meta flags
        const updatedCompanions = gameState.get('party.companions') || [];
        gameState.set('party.companions', updatedCompanions);
    }

    /**
     * Derive tier string from a numeric relationship value.
     * @private
     * @param {number} value
     * @returns {string}
     */
    _getTierForValue(value) {
        const tiers = this.companionData?.relationshipTiers || {};
        for (const [tierId, tierData] of Object.entries(tiers)) {
            if (value >= tierData.min && value <= tierData.max) {
                return tierId;
            }
        }
        // Fallback: derive from TIER_ORDER extremes
        if (value < -50) {
            return 'hostile';
        }
        if (value < -20) {
            return 'unfriendly';
        }
        if (value <= 20) {
            return 'neutral';
        }
        if (value <= 60) {
            return 'friendly';
        }
        return 'devoted';
    }

    /**
     * Returns true if tierA >= tierB in the tier ordering.
     * @private
     */
    _tierAtLeast(tierA, tierB) {
        return TIER_ORDER.indexOf(tierA) >= TIER_ORDER.indexOf(tierB);
    }

    // =========================================================================
    // REST ACTIVITIES
    // =========================================================================

    /**
     * Process a rest activity for a companion.
     *
     * @param {string} companionId
     * @param {string} activityId
     * @param {number} [playerGoldSpent=0] - For splitTheSpoils
     * @returns {{ relationshipDelta: number, sideEffect: object|null }}
     */
    processRestActivity(companionId, activityId, playerGoldSpent = 0) {
        const companions = gameState.get('party.companions') || [];
        const companion = companions.find(c => c.id === companionId);
        if (!companion || !companion.companionMeta) {
            console.warn(`👥 processRestActivity: companion ${companionId} not found`);
            return { relationshipDelta: 0, sideEffect: null };
        }

        const activity = this.companionData?.restActivities?.[activityId];
        if (!activity) {
            console.warn(`👥 processRestActivity: unknown activityId "${activityId}"`);
            return { relationshipDelta: 0, sideEffect: null };
        }

        let relationshipDelta = 0;
        let sideEffect = null;

        if (activityId === 'splitTheSpoils') {
            // Requires at least 'friendly' tier
            const requiredTier = this.config.splitTheSpoilsRequiredTier || 'friendly';
            const currentTier = this.getRelationshipTier(companionId);
            if (!this._tierAtLeast(currentTier, requiredTier)) {
                gameState.addMessage(
                    `${companion.name} isn't close enough to share the spoils. Build trust first.`,
                    'warning'
                );
                return { relationshipDelta: 0, sideEffect: null };
            }

            const maxDelta = this.config.splitTheSpoilsMax ?? 10;
            // +1 relationship per 5 gold (0.2 per gold), capped at max
            const rawDelta = playerGoldSpent * (activity.relationshipDeltaPerGold ?? 0.2);
            relationshipDelta = Math.min(Math.floor(rawDelta), maxDelta);
            sideEffect = { type: 'goldSpent', value: playerGoldSpent };

        } else if (activityId === 'shareADrink') {
            relationshipDelta = activity.relationshipDelta ?? 5;
            // Reveal motivation
            companion.companionMeta.motivationRevealed = true;
            sideEffect = { type: 'revealMotivation', value: companion.companionMeta.motivationId };

        } else if (activityId === 'spar') {
            // Caller is expected to pass a pre-resolved success/failure via options;
            // We default to success delta here — UI can pass the actual roll result
            // and call this again with the correct activityId variant if needed.
            // For now we use success delta as the optimistic case.
            relationshipDelta = activity.relationshipDeltaSuccess ?? 8;

        } else if (activityId === 'planTheRoute') {
            relationshipDelta = activity.relationshipDelta ?? 5;
            sideEffect = { type: 'revealHiddenRoom', value: true };

        } else {
            // Generic activity with flat delta (e.g. trainTogether)
            relationshipDelta = activity.relationshipDelta ?? 0;
        }

        // Apply the delta
        if (relationshipDelta !== 0) {
            const oldValue = companion.companionMeta.relationship;
            const newValue = Math.max(
                this.config.relationshipMin,
                Math.min(this.config.relationshipMax, oldValue + relationshipDelta)
            );
            gameState.updateCompanionRelationship(companionId, newValue);
        }

        const activityLabel = activity.label || activityId;
        gameState.addMessage(`${companion.name}: ${activityLabel} (+${relationshipDelta} relationship)`, 'info');
        console.log(`👥 Rest activity [${companion.name}] ${activityId}: delta ${relationshipDelta}`);

        return { relationshipDelta, sideEffect };
    }

    // =========================================================================
    // SYNERGIES
    // =========================================================================

    /**
     * Compute active party synergies and write the result to gameState.
     * NOTE: activeSynergies is computed on demand and NOT persisted (per amendments).
     *
     * @returns {{ vanguard: boolean, arcaneAssembly: boolean, bandOfRogues: boolean, trueParty: boolean }}
     */
    getActiveSynergies() {
        const synergies = { vanguard: false, arcaneAssembly: false, bandOfRogues: false, trueParty: false };

        if (!this.config.synergies?.enabled) {
            gameState.notify('party.activeSynergies', synergies);
            return synergies;
        }

        const allMembers = gameState.getFullParty();
        if (!allMembers || allMembers.length === 0) {
            gameState.notify('party.activeSynergies', synergies);
            return synergies;
        }

        // Count callings across player + companions
        const callingCounts = {};
        for (const member of allMembers) {
            const callingId = member?.class?.id;
            if (callingId) {
                callingCounts[callingId] = (callingCounts[callingId] || 0) + 1;
            }
        }

        const syn = this.config.synergies;

        // Vanguard: 3+ Dedication
        if (syn.vanguard?.enabled) {
            synergies.vanguard = (callingCounts['dedication'] || 0) >= (syn.vanguard.minDedication ?? 3);
        }

        // Arcane Assembly: 2+ Scholar
        if (syn.arcaneAssembly?.enabled) {
            synergies.arcaneAssembly = (callingCounts['scholar'] || 0) >= (syn.arcaneAssembly.minScholar ?? 2);
        }

        // Band of Rogues: 3+ Wanderlust
        if (syn.bandOfRogues?.enabled) {
            synergies.bandOfRogues = (callingCounts['wanderlust'] || 0) >= (syn.bandOfRogues.minWanderlust ?? 3);
        }

        // True Party: one of each calling (dedication + scholar + wanderlust in party of any size)
        if (syn.trueParty?.enabled) {
            synergies.trueParty = (
                (callingCounts['dedication'] || 0) >= 1 &&
                (callingCounts['scholar']    || 0) >= 1 &&
                (callingCounts['wanderlust'] || 0) >= 1
            );
        }

        // Notify UI without storing in gameState data (transient compute)
        gameState.notify('party.activeSynergies', synergies);

        console.log(`👥 Synergies: vanguard=${synergies.vanguard} arcane=${synergies.arcaneAssembly} rogues=${synergies.bandOfRogues} trueParty=${synergies.trueParty}`);
        return synergies;
    }

    /**
     * Returns the flat skill challenge bonus granted by the True Party synergy.
     * @returns {number} 0 or 1
     */
    getSkillChallengeSynergyBonus() {
        const synergies = this.getActiveSynergies();
        return synergies.trueParty
            ? (this.config.synergies?.trueParty?.skillChallengeBonus ?? 1)
            : 0;
    }

    // =========================================================================
    // LEVEL-UP
    // =========================================================================

    /**
     * Prepare batch level-up for all companions when the player levels up.
     * Returns an array of companion records that require player input (L3 specialization).
     * ASI levels are auto-applied silently. All other levels are auto-applied.
     *
     * @param {number} newLevel - The level all companions should reach
     * @returns {Array<{ companionId: string, companion: Character, pendingChoice: string }>}
     */
    prepareBatchLevelUp(newLevel) {
        const companions = gameState.get('party.companions') || [];
        const needsChoice = [];

        for (const companion of companions) {
            if (companion.level >= newLevel) {
                continue;
            }

            // Level 3: Specialization choice required — queue for modal
            if (newLevel === 3) {
                // Check if class has specialization at level 3
                const hasSpecialization = companion.class?.features?.['3']?.some(
                    f => f.choices && (f.name?.toLowerCase().includes('specialization') || f.name?.toLowerCase().includes('subclass') || f.name?.toLowerCase().includes('path'))
                );
                if (hasSpecialization) {
                    needsChoice.push({
                        companionId:  companion.id,
                        companion,
                        pendingChoice: 'specialization'
                    });
                    console.log(`👥 ${companion.name} needs specialization choice at level 3`);
                    continue;
                }
            }

            // ASI levels: auto-pick primary ability score
            if (RULES.progression.asiLevels?.includes(newLevel)) {
                this._autoApplyASI(companion, newLevel);
                console.log(`👥 ${companion.name} auto-ASI at level ${newLevel}`);
                continue;
            }

            // All other levels: silent auto-apply
            this._silentLevelUp(companion, newLevel);
        }

        // Persist any changes
        gameState.set('party.companions', companions);
        return needsChoice;
    }

    /**
     * Apply level-up selections to a companion character.
     * Called by main.js after the player makes level-up choices for a companion.
     *
     * @param {string} companionId
     * @param {object} selections - Level-up choices (same format as player level-up)
     */
    applyCompanionLevelUp(companionId, selections) {
        const companions = gameState.get('party.companions') || [];
        const companion = companions.find(c => c.id === companionId);
        if (!companion) {
            console.warn(`👥 applyCompanionLevelUp: companion ${companionId} not found`);
            return;
        }

        if (typeof companion.applyLevelUpSelections === 'function') {
            companion.applyLevelUpSelections(selections);
        } else {
            // Fallback: bump level and HP manually
            companion.level += 1;
            companion.maxHP = companion.calculateMaxHP ? companion.calculateMaxHP() : companion.maxHP + companion.class.hitDie;
            companion.currentHP = companion.maxHP;
            companion.proficiencyBonus = RULES.core.proficiencyBonusByLevel[companion.level] || 2;
        }

        gameState.set('party.companions', companions);
        gameState.addMessage(`${companion.name} reached level ${companion.level}!`, 'success');
        console.log(`👥 ${companion.name} leveled up to ${companion.level}`);
    }

    /**
     * Silently level up a companion without player interaction.
     * @private
     */
    _silentLevelUp(companion, newLevel) {
        if (companion.level >= newLevel) {
            return;
        }

        companion.level = newLevel;
        companion.proficiencyBonus = RULES.core.proficiencyBonusByLevel[newLevel] || 2;

        // Recalculate HP
        if (typeof companion.calculateMaxHP === 'function') {
            companion.maxHP = companion.calculateMaxHP();
        } else {
            const levelsGained = newLevel - (companion.level - 1);
            const avgHitDie = Math.ceil(companion.class.hitDie / 2) + 1;
            companion.maxHP += levelsGained * (avgHitDie + (companion.abilityModifiers?.con || 0));
        }
        companion.currentHP = companion.maxHP;
    }

    /**
     * Auto-apply ASI to a companion's primary ability score.
     * @private
     */
    _autoApplyASI(companion, newLevel) {
        this._silentLevelUp(companion, newLevel);

        // Pick primary ability — caller's class.primaryAbility[0] or STR
        const primaryAbility = companion.class?.primaryAbility?.[0] || 'str';
        if (companion.baseAbilities) {
            companion.baseAbilities[primaryAbility] = Math.min(
                RULES.core.abilityScoreMax,
                (companion.baseAbilities[primaryAbility] || 10) + 2
            );
            // Recalculate derived stats
            if (typeof companion.calculateAbilities === 'function') {
                companion.abilities = companion.calculateAbilities();
            }
            if (typeof companion.calculateAbilityModifiers === 'function') {
                companion.abilityModifiers = companion.calculateAbilityModifiers();
            }
        }
    }

    // =========================================================================
    // POST-COMBAT
    // =========================================================================

    /**
     * Handle post-combat state: stabilize or permanently kill downed companions.
     * Called automatically via the 'combat.ended' subscription.
     *
     * @param {{ outcome: 'victory'|'fled'|'tpk' }} combatResult
     */
    handlePostCombat(combatResult) {
        if (!combatResult) {
            return;
        }

        const outcome = combatResult.outcome || combatResult; // Handle both object and string
        const companions = gameState.get('party.companions') || [];
        const outcomeMap = this.config.outcomeMap || RULES.party?.outcomeMap || {};
        const resolution = outcomeMap[outcome];

        const downedCompanions = companions.filter(c => c.companionMeta?.isDowned);

        if (downedCompanions.length === 0) {
            return;
        }

        console.log(`👥 Post-combat [${outcome}]: ${downedCompanions.length} downed companion(s), resolution: ${resolution}`);

        if (resolution === 'stabilize') {
            // Auto-stabilize: free, no resource cost
            for (const companion of downedCompanions) {
                companion.companionMeta.isDowned = false;
                companion.currentHP = 1;
                gameState.addMessage(`${companion.name} is stabilized (1 HP).`, 'success');
            }
            gameState.set('party.companions', companions);

        } else if (resolution === 'permanent_death') {
            // All downed companions die permanently
            const downedIds = downedCompanions.map(c => c.id);
            const survivingCompanions = companions.filter(c => !c.companionMeta?.isDowned);

            // Fire companionDowned relationship event on all surviving companions
            for (const downed of downedCompanions) {
                for (const survivor of survivingCompanions) {
                    if (survivor.companionMeta) {
                        this.applyRelationshipEvent(survivor.id, 'companionDowned');
                    }
                }
                gameState.addMessage(`${downed.name} has been lost.`, 'error');
            }

            // Dismiss each downed companion as death
            for (const id of downedIds) {
                this.dismissCompanion(id, 'death');
            }
        }
    }

    // =========================================================================
    // CANDIDATE GENERATION
    // =========================================================================

    /**
     * Generate a list of recruitment candidates for a settlement.
     * Candidates are seeded to the settlement so they remain consistent on revisit
     * within a session (they are NOT persisted — regenerated from settlement seed).
     *
     * @param {string} settlementId - Used as RNG seed suffix for determinism
     * @param {number} playerLevel  - Used to clamp companion level
     * @param {number} [count]      - How many candidates (random in settlementCandidateRange if omitted)
     * @returns {Promise<Character[]>} Array of companion candidates (NOT yet in party)
     */
    async generateSettlementCandidates(settlementId, playerLevel, count) {
        const settlementRng = new SeededRandom(`${String(gameState.get('seed'))  }_${  settlementId  }_candidates`);
        const [minCount, maxCount] = this.config.settlementCandidateRange || [1, 3];
        const candidateCount = count ?? settlementRng.nextInt(minCount, maxCount);

        const callingIds = ['dedication', 'scholar', 'wanderlust'];
        const motivationIds = Object.keys(this.companionData?.motivationArchetypes || {});

        const candidates = [];
        for (let i = 0; i < candidateCount; i++) {
            const callingId = settlementRng.choice(callingIds);
            const motivationId = motivationIds.length > 0 ? settlementRng.choice(motivationIds) : 'duty';
            // Companion level: player level -1, min 1
            const companionLevel = Math.max(1, playerLevel - 1);

            try {
                const companion = await this.createCompanion({
                    callingId,
                    motivationId,
                    level: companionLevel,
                    source: 'settlement'
                });
                candidates.push(companion);
            } catch (err) {
                console.error('CompanionManager: failed to create candidate', err);
            }
        }

        // Write to transient candidates slot in party state
        const party = gameState.get('party') || {};
        party.candidates = candidates;
        gameState.set('party', party);

        console.log(`👥 Generated ${candidates.length} settlement candidates for ${settlementId}`);
        return candidates;
    }
}
