import { gameState } from '../core/GameState.js';
import { RULES } from '../core/rulesEngine.js';
import { filterByCampaign, isAvailableForCampaign, loadCampaigns } from '../utils/campaignFilter.js';
import { addFatigue, getSupplyCapacityRemaining, restoreSupplies } from './FatigueManager.js';

/** Finite wilderness opportunities. Receipts live only on canonical world features. */
export default class ProvisioningManager {
    constructor({ worldGenerator = null, skillChallengeManager, data = null } = {}) {
        this.worldGenerator = worldGenerator;
        this.skillChallengeManager = skillChallengeManager;
        this.data = data;
    }

    /** Load authored cues for the current campaign; missing data disables the surface. */
    async loadData(campaignId) {
        try {
            await loadCampaigns();
            const response = await fetch('data/provisioning.json');
            if (!response.ok) {
                throw new Error(`Failed to load provisioning.json: ${response.status}`);
            }
            const data = await response.json();
            this.data = { ...data, cues: filterByCampaign(data.cues || [], campaignId) };
            return this.data;
        } catch (error) {
            this.data = null;
            console.error('Provisioning data unavailable:', error);
            return null;
        }
    }

    /** Inspect a revealed opportunity without spending its attempt. */
    getOpportunityAtPosition(x, y) {
        const feature = gameState.get('world.metadata')?.features?.find(entry =>
            entry.x === x && entry.y === y && entry.provisioning);
        if (!feature || !['sanctuary', 'provisioning'].includes(feature.type)) {
            return null;
        }
        const cue = this.data?.cues?.find(entry => entry.id === feature.provisioning.cueId);
        if (!cue) {
            return null;
        }
        if (feature.type === 'provisioning' && !RULES.provisioning.wilderness?.enabled) {
            return null;
        }
        const challenge = {
            ...this.data.challenge,
            dc: RULES.provisioning?.dc
        };
        const status = feature.provisioning.attempt?.status || 'available';
        const reason = this._unavailableReason(feature, cue, challenge);
        return {
            siteId: feature.provisioning.id || feature.id || `${feature.x},${feature.y}`,
            feature, cue, challenge, status, canAttempt: !reason, reason
        };
    }

    _unavailableReason(feature, cue, challenge) {
        if (!RULES.provisioning?.enabled || !RULES.fatigue.enabled) {
            return 'disabled';
        }
        const combat = gameState.get('combat');
        if (combat?.active || combat?.pending || gameState.get('dungeon.active')) {
            return 'unsafe';
        }
        const position = gameState.get('player.position');
        if (!position || position.x !== feature.x || position.y !== feature.y) {
            return 'wrongLocation';
        }
        if (feature.provisioning.attempt) {
            return 'spent';
        }
        const campaignId = gameState.get('worldConfig.campaignId');
        if (!isAvailableForCampaign(cue, campaignId)) {
            return 'unsupported';
        }
        if (!gameState.get('character') || !this.skillChallengeManager?.rollSkillCheck ||
            !challenge.skillId || !challenge.attribute || !Number.isFinite(challenge.dc) ||
            !Number.isInteger(RULES.provisioning.suppliesReward) || RULES.provisioning.suppliesReward <= 0) {
            return 'unsupported';
        }
        if (getSupplyCapacityRemaining() <= 0) {
            return 'full';
        }
        return null;
    }

    _persist(metadata) {
        // GameState and generator must share the saved receipt rather than a cached copy.
        if (this.worldGenerator) {
            this.worldGenerator.worldMetadata = metadata;
        }
        gameState.set('world.metadata', metadata);
    }

    /**
     * Confirm one attempt synchronously. UI cancellation calls no mutation API.
     * Revalidate after any asynchronous prompt; reserve before notifying or rolling.
     */
    attempt(siteId) {
        const metadata = gameState.get('world.metadata');
        const feature = metadata?.features?.find(entry => entry.provisioning &&
            (entry.provisioning.id || entry.id || `${entry.x},${entry.y}`) === siteId);
        if (!feature) {
            return { attempted: false, reason: 'missing' };
        }
        const preview = this.getOpportunityAtPosition(feature.x, feature.y);
        if (!preview?.canAttempt) {
            return { attempted: false, reason: preview?.reason || 'unrevealed' };
        }
        const receipt = { status: 'pending', suppliesRestored: 0 };
        feature.provisioning.attempt = receipt;
        this._persist(metadata);
        try {
            const character = gameState.get('character');
            addFatigue(RULES.fatigue.skillChallengeFatigue, 'skillChallenge', character);
            const rollResult = this.skillChallengeManager.rollSkillCheck(character, preview.challenge);
            const suppliesRestored = rollResult.success ? restoreSupplies(RULES.provisioning.suppliesReward) : 0;
            Object.assign(receipt, {
                status: rollResult.success ? 'success' : 'failure',
                rollResult, suppliesRestored
            });
            this._persist(metadata);
            return {
                attempted: true, success: rollResult.success, rollResult, suppliesRestored,
                outcome: rollResult.success ? this.data.challenge.onSuccess : this.data.challenge.onFailure,
                consequences: {
                    xpAwarded: 0, goldAwarded: 0, damageDealt: 0, itemsAwarded: [],
                    xp: 0, gold: 0, damage: 0, items: [], conditions: [],
                    messages: [rollResult.success ? this.data.challenge.onSuccess?.message
                        : this.data.challenge.onFailure?.message].filter(Boolean),
                    suppliesRestored
                }
            };
        } catch (error) {
            // A failed resolver cannot reopen the opportunity, including after save/load.
            receipt.status = 'error';
            this._persist(metadata);
            console.error('Provisioning attempt failed:', error);
            return { attempted: true, success: false, suppliesRestored: 0, reason: 'error' };
        }
    }
}
