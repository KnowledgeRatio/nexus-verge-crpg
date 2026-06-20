/**
 * Consequence Manager
 * Central processor for world-state consequences triggered by quest completion,
 * quest failure, and time-limit expiry.
 *
 * ADR-010 compliant: handler map keyed by event/flag type strings.
 * No quest ID branching — worldTag drives consequence dispatch.
 *
 * Settlement ID convention: "${settlement.x},${settlement.y}"
 * Same convention used by WorldGenerator.persistSettlementData().
 */

import { gameState } from '../core/GameState.js';
import { RULES } from '../core/rulesEngine.js';
import { buildEncounter } from './EncounterBuilder.js';

class ConsequenceManager {
    constructor() {
        // Event handlers — keyed by eventType string.
        // ADR-010: never add quest/ability ID checks here.
        this._eventHandlers = {
            'vengeance_raids':           this._handleVengeance.bind(this),
            'reputation_bleed':          this._handleReputationBleed.bind(this),
            'escalation_confrontation':  this._handleEscalation.bind(this),
            'faction_attention':         this._handleFactionAttention.bind(this),
            'unintended_consequence':    this._handleUnintended.bind(this),
            'quest_failure_consequence': this._handleQuestFailure.bind(this)
        };

        // Flag application handlers — keyed by flagType string.
        this._flagHandlers = {
            'vendetta_active':   this._applyVendetta.bind(this),
            'cursed':            this._applyCursed.bind(this),
            'watch_suspicious':  this._applyWatchSuspicious.bind(this),
            'settlement_sacked': this._applySettlementSacked.bind(this),
            'disease_spreading': this._applyDisease.bind(this)
        };

        // worldTag → consequence event type.
        // Positive tags (safer, cleansed) produce no pending event.
        this._tagToEvent = {
            'powerVacuum': 'vengeance_raids',
            'disturbed':   'unintended_consequence',
            'safer':       null,
            'cleansed':    null
        };

        console.log('🌑 ConsequenceManager initialized');
    }

    // ─── Public API ────────────────────────────────────────────────────────────

    /**
     * Queue a consequence derived from a worldTag on quest completion.
     * Called by QuestManager.completeQuest() after worldTag is written.
     * ADR-010: dispatch by tag, never by quest ID.
     *
     * @param {string} worldTag - The worldTag from the completed quest (e.g. 'powerVacuum')
     * @param {Object} quest    - The completed quest object (used for payload data only)
     */
    queueConsequenceForTag(worldTag, quest) {
        const eventType = this._tagToEvent[worldTag];
        if (!eventType) return; // positive tags produce no pending event

        const windows = RULES.consequences.visitWindows;
        const camelKey = this._camelKey(eventType);
        const cfg = windows[camelKey] || { min: 2, max: 4, useLocalCounter: true };
        const visitWindow = cfg.min === cfg.max
            ? cfg.min
            : cfg.min + Math.floor(Math.random() * (cfg.max - cfg.min + 1));

        const globalCount = gameState.get('world.visitCount') || 0;
        const settlementId = quest.settlementId
            || (quest.questGiver?.settlementId)
            || null;

        const event = {
            id: `evt_${Date.now()}_${eventType}`,
            type: eventType,
            sourceSettlementId: settlementId,
            sourceQuestId: quest.id,   // for UI display only — NOT used for dispatch
            payload: this._buildPayload(eventType, quest),
            expiresAtVisitCount: globalCount + visitWindow,
            visitWindow,
            useLocalCounter: cfg.useLocalCounter ?? true,
            stage: 0,
            isProcessed: false,
            resolved: false
        };

        const pending = gameState.get('world.pendingEvents') || [];
        pending.push(event);
        gameState.set('world.pendingEvents', pending);
        console.log(`🌑 [ConsequenceManager] Queued '${eventType}' for settlement ${settlementId}`);
    }

    /**
     * Queue a consequence directly by event type.
     * Used by failure paths (DungeonManager time-limit, etc.)
     *
     * @param {string} eventType - One of the keys in this._eventHandlers
     * @param {Object} payload   - Arbitrary payload; must include targetSettlementId or sourceSettlementId
     */
    queueConsequence(eventType, payload) {
        const globalCount = gameState.get('world.visitCount') || 0;
        const camelKey = this._camelKey(eventType);
        const cfg = RULES.consequences.visitWindows?.[camelKey]
            || { min: 2, max: 4, useLocalCounter: true };
        const visitWindow = cfg.min === cfg.max
            ? cfg.min
            : cfg.min + Math.floor(Math.random() * (cfg.max - cfg.min + 1));

        const event = {
            id: `evt_${Date.now()}_${eventType}`,
            type: eventType,
            sourceSettlementId: payload.targetSettlementId || payload.sourceSettlementId || null,
            sourceQuestId: payload.sourceQuestId || null,
            payload,
            expiresAtVisitCount: globalCount + visitWindow,
            visitWindow,
            useLocalCounter: cfg.useLocalCounter ?? true,
            stage: 0,
            isProcessed: false,
            resolved: false
        };

        const pending = gameState.get('world.pendingEvents') || [];
        pending.push(event);
        gameState.set('world.pendingEvents', pending);
        console.log(`🌑 [ConsequenceManager] Queued '${eventType}' for settlement ${event.sourceSettlementId}`);
    }

    /**
     * Called by SettlementManager.enterSettlement() on every visit.
     * Increments visit counters, processes pending events, applies active flags.
     *
     * @param {Object} settlement - The settlement feature object (mutated in place)
     * @returns {Array<Object>} Active flag effects for this visit (e.g. [{type:'sacked'}, ...])
     */
    onEnterSettlement(settlement) {
        // Normalise settlement ID
        const settlementId = settlement.id || `${settlement.x},${settlement.y}`;
        if (!settlement.id) settlement.id = settlementId;

        // Increment global visit counter
        const world = gameState.get('world');
        world.visitCount = (world.visitCount || 0) + 1;
        gameState.set('world', world);

        // Increment local visit counter on settlement object
        settlement.localVisitCount = (settlement.localVisitCount || 0) + 1;

        // Initialise flags array if missing
        settlement.flags = settlement.flags || [];

        // Process pending events targeting this settlement
        this._processPendingEvents(settlement);

        // Prune expired / fully-processed events
        this._pruneExpiredEvents(settlement);

        // Apply active flags and collect effects
        const effects = this._applyActiveFlags(settlement);

        // Persist the mutated settlement back into world.settlements
        this._persistSettlement(settlement);

        return effects;
    }

    /**
     * Resolve an active flag via a player action verb.
     * Returns { success, message } — caller handles UI.
     *
     * @param {Object} settlement - Settlement feature object
     * @param {string} flagType   - e.g. 'vendetta_active'
     * @param {string} verb       - e.g. 'confront', 'negotiate', 'cleanse', 'outlast'
     * @returns {{ success: boolean, message: string }}
     */
    resolveFlag(settlement, flagType, verb) {
        const flagDef = RULES.consequences.flagTypes?.[flagType];
        if (!flagDef) return { success: false, message: `Unknown flag: ${flagType}` };

        if (!flagDef.validVerbs.includes(verb)) {
            return {
                success: false,
                message: `'${verb}' cannot resolve a ${flagType.replace(/_/g, ' ')} situation.`
            };
        }

        const flags = settlement.flags || [];
        const flag = flags.find(f => f.type === flagType && f.active);
        if (!flag) return { success: false, message: 'Nothing to resolve here.' };

        // Mark resolved
        flag.active = false;
        flag.resolvedBy = verb;
        flag.resolvedAt = Date.now();

        // Undo sack side-effects
        if (flagType === 'settlement_sacked') {
            settlement.sacked = false;
            settlement.merchantLocked = false;
        }

        const message = this._getResolutionMessage(flagType, verb);
        gameState.addMessage(message, 'success');

        // Persist
        this._persistSettlement(settlement);

        return { success: true, message };
    }

    /**
     * Returns all currently active flags for a settlement (for UI display).
     * @param {Object} settlement
     * @returns {Array<Object>}
     */
    getActiveFlags(settlement) {
        return (settlement.flags || []).filter(f => f.active);
    }

    // ─── Private: Event Processing ────────────────────────────────────────────

    _processPendingEvents(settlement) {
        const settlementId = settlement.id;
        const pending = gameState.get('world.pendingEvents') || [];
        const localCount = settlement.localVisitCount || 0;
        const globalCount = gameState.get('world.visitCount') || 0;
        let anyProcessed = false;

        for (const event of pending) {
            if (event.isProcessed || event.resolved) continue;
            if (event.sourceSettlementId !== settlementId) continue;

            // Check if the event's delay window has elapsed
            const counter = event.useLocalCounter ? localCount : globalCount;
            const dueAt = event.expiresAtVisitCount - event.visitWindow; // first visit where due
            if (counter < dueAt) continue;

            const handler = this._eventHandlers[event.type];
            if (handler) {
                handler(event, settlement);
            } else {
                console.warn(`🌑 [ConsequenceManager] No handler for event type: ${event.type}`);
            }

            event.isProcessed = true;
            anyProcessed = true;
        }

        if (anyProcessed) {
            gameState.set('world.pendingEvents', pending);
        }
    }

    _pruneExpiredEvents(settlement) {
        const globalCount = gameState.get('world.visitCount') || 0;
        const localCount = settlement.localVisitCount || 0;
        const pending = gameState.get('world.pendingEvents') || [];

        const active = pending.filter(event => {
            if (event.resolved || event.isProcessed) return false;
            const counter = event.useLocalCounter ? localCount : globalCount;
            return counter < event.expiresAtVisitCount;
        });

        if (active.length !== pending.length) {
            gameState.set('world.pendingEvents', active);
        }
    }

    _applyActiveFlags(settlement) {
        const effects = [];

        for (const flag of (settlement.flags || [])) {
            if (!flag.active) continue;
            const handler = this._flagHandlers[flag.type];
            if (handler) {
                const effect = handler(flag, settlement);
                if (effect) effects.push(effect);
            }
        }

        return effects;
    }

    // ─── Private: Event Handlers ──────────────────────────────────────────────

    _handleVengeance(event, settlement) {
        const factionId = event.payload?.factionId || 'generic_bandits';
        this._addFlag(settlement, 'vendetta_active', {
            factionId,
            sourceEventId: event.id
        });
        gameState.addMessage(
            `⚔️ Word of your actions has reached the wrong ears. ${settlement.name || 'The settlement'} is being watched.`,
            'warning'
        );
    }

    _handleReputationBleed(event, settlement) {
        this._addFlag(settlement, 'watch_suspicious', {
            reason: 'reputation_bleed',
            sourceEventId: event.id
        });
        gameState.addMessage(
            `📉 Your reputation precedes you. Merchants in ${settlement.name || 'this settlement'} are wary.`,
            'warning'
        );
    }

    _handleEscalation(event, settlement) {
        this._addFlag(settlement, 'vendetta_active', {
            factionId: event.payload?.factionId || 'unknown',
            escalation: true,
            sourceEventId: event.id
        });
        gameState.addMessage(
            `🔥 The situation in ${settlement.name || 'this settlement'} has escalated. This will not resolve on its own.`,
            'error'
        );
    }

    _handleFactionAttention(event, settlement) {
        // Faction system not yet built — log only
        console.log(`🌑 [ConsequenceManager] faction_attention event received (faction system pending)`, event);
        gameState.addMessage('👁️ Someone powerful has taken notice of your actions.', 'info');
    }

    _handleUnintended(event, settlement) {
        this._addFlag(settlement, 'watch_suspicious', {
            reason: 'unintended_disturbance',
            sourceEventId: event.id
        });
        gameState.addMessage(
            `🌑 Something you uncovered has had unexpected consequences near ${settlement.name || 'this area'}.`,
            'warning'
        );
    }

    _handleQuestFailure(event, settlement) {
        // flagToApply may come from either the new ConsequenceManager-routed payload
        // or the legacy direct-write format from DungeonManager
        const flagType = event.payload?.flagToApply || event.flagToApply || 'cursed';
        this._addFlag(settlement, flagType, {
            reason: 'quest_failure',
            sourceQuestId: event.sourceQuestId,
            sourceEventId: event.id
        });
        const flagLabel = flagType.replace(/_/g, ' ');
        gameState.addMessage(
            `💀 The consequences of a failed quest have reached ${settlement.name || 'this settlement'}. It is now ${flagLabel}.`,
            'error'
        );
    }

    // ─── Private: Flag Application ────────────────────────────────────────────

    _applyVendetta(flag, settlement) {
        if (Math.random() >= 0.3) return null;

        const factionLabel = flag.params?.factionId || 'enemy';
        gameState.addMessage(
            `⚔️ Ambush! Agents of the ${factionLabel} attack as you enter ${settlement.name || 'the settlement'}!`,
            'error'
        );

        // Trigger combat asynchronously — don't block the settlement entry flow
        this._triggerAmbushCombat(flag).catch(err =>
            console.error('Ambush combat trigger failed:', err)
        );

        return { type: 'ambush', factionId: flag.params?.factionId };
    }

    async _triggerAmbushCombat(flag) {
        const character = gameState.get('character');
        const worldConfig = gameState.get('worldConfig') || {};
        const partyLevel = character?.level || 1;
        const partySize = (gameState.get('party')?.companions?.filter(c => c.currentHP > 0).length || 0) + 1;

        const encounter = await buildEncounter({
            partySize,
            partyLevel,
            difficulty: 'hard',
            gameDifficulty: worldConfig.difficulty || 'normal',
            context: 'overworld',
            campaignId: worldConfig.campaignId || 'core',
            worldConfig
        });

        if (!encounter?.monsters?.length) {
            console.warn('Ambush: EncounterBuilder returned no monsters, skipping combat');
            return;
        }

        gameState.set('combat', { active: true, pending: true });
        gameState.set('ui.pendingCombat', {
            enemies: encounter.monsters,
            context: 'ambush',
            factionId: flag.params?.factionId
        });
        gameState.set('ui.currentScreen', 'combatScreen');
    }

    _applyCursed(flag, settlement) {
        gameState.addMessage(
            `💀 ${settlement.name || 'This settlement'} is cursed. Long rests here are fitful — you recover only half hit dice.`,
            'warning'
        );
        return { type: 'cursed', halfHitDiceRecovery: true };
    }

    _applyWatchSuspicious(flag, settlement) {
        gameState.addMessage(
            `👁️ The locals watch you with suspicion. Prices here are elevated.`,
            'warning'
        );
        return { type: 'priceIncrease', multiplier: 1.25 };
    }

    _applySettlementSacked(flag, settlement) {
        settlement.sacked = true;
        settlement.merchantLocked = true;
        gameState.addMessage(
            `💀 ${settlement.name || 'This settlement'} has been sacked. The quest board is bare and merchants are gone.`,
            'error'
        );
        return { type: 'sacked', questBoardEmpty: true, merchantLocked: true };
    }

    _applyDisease(flag, settlement) {
        gameState.addMessage(
            `🤒 Disease spreads through ${settlement.name || 'this settlement'}. Rest here risks infection.`,
            'warning'
        );
        return { type: 'disease', restRisk: true };
    }

    // ─── Private: Helpers ─────────────────────────────────────────────────────

    /**
     * Add a flag to a settlement. No stacking — silently skips if already active.
     * @param {Object} settlement
     * @param {string} flagType
     * @param {Object} params
     */
    _addFlag(settlement, flagType, params = {}) {
        settlement.flags = settlement.flags || [];
        if (settlement.flags.some(f => f.type === flagType && f.active)) return;
        settlement.flags.push({
            type: flagType,
            appliedAt: Date.now(),
            params,
            active: true
        });
        console.log(`🌑 [ConsequenceManager] Flag '${flagType}' added to ${settlement.name || settlement.id}`);
    }

    /**
     * Build the initial event payload for a worldTag-derived event.
     * @param {string} eventType
     * @param {Object} quest
     * @returns {Object}
     */
    _buildPayload(eventType, quest) {
        const base = {
            sourceQuestId: quest.id,
            settlementId: quest.settlementId || quest.questGiver?.settlementId || null
        };
        if (eventType === 'vengeance_raids') {
            return {
                ...base,
                factionId: quest.factionConsequence?.factionId || 'generic_bandits'
            };
        }
        return base;
    }

    /**
     * Map eventType snake_case strings to the camelCase keys used in RULES.consequences.visitWindows.
     * @param {string} eventType
     * @returns {string}
     */
    _camelKey(eventType) {
        const map = {
            'vengeance_raids':           'vengeance',
            'reputation_bleed':          'reputationBleed',
            'escalation_confrontation':  'escalation',
            'faction_attention':         'attention',
            'unintended_consequence':    'unintendedConsequence',
            'quest_failure_consequence': 'vengeance'  // fallback window
        };
        return map[eventType] || 'vengeance';
    }

    /**
     * Get a player-facing resolution confirmation message.
     * @param {string} flagType
     * @param {string} verb
     * @returns {string}
     */
    _getResolutionMessage(flagType, verb) {
        const msgs = {
            vendetta_active: {
                confront:  'You face the threat directly. The vendetta ends.',
                negotiate: 'Terms are reached. The faction stands down.'
            },
            cursed: {
                cleanse:  'The curse is lifted. The settlement breathes easier.',
                confront: 'You confront the source of the curse and break it.'
            },
            watch_suspicious: {
                negotiate: 'You smooth things over. Merchants relax.',
                outlast:   'Time passes. Suspicions fade.'
            },
            settlement_sacked: {
                cleanse: 'The settlement is rebuilt. Life returns.'
            },
            disease_spreading: {
                cleanse: 'The source of the disease is dealt with.',
                outlast: 'The disease runs its course.'
            }
        };
        return msgs[flagType]?.[verb] || 'The situation resolves.';
    }

    /**
     * Persist a mutated settlement object back into world.settlements[].
     * Follows the same convention as WorldGenerator.persistSettlementData().
     * @param {Object} settlement
     */
    _persistSettlement(settlement) {
        const settlementId = settlement.id || `${settlement.x},${settlement.y}`;
        const settlements = gameState.get('world.settlements') || [];
        const index = settlements.findIndex(s => s.id === settlementId);

        if (index !== -1) {
            settlements[index] = { ...settlements[index], ...settlement, id: settlementId };
        } else {
            settlements.push({ ...settlement, id: settlementId });
        }

        gameState.set('world.settlements', settlements);
    }
}

const consequenceManager = new ConsequenceManager();
export default consequenceManager;
