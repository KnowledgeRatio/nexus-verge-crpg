import { gameState } from '../core/GameState.js';
import { RULES } from '../core/rulesEngine.js';
import { filterByCampaign } from '../utils/campaignFilter.js';
import { skillRegistry } from './SkillRegistry.js';
import { addFatigue } from './FatigueManager.js';
import { selectHostileSettlementContent } from './hostileSettlementContent.js';

/** Seeded, saved liberation and rebuilding opportunities on existing settlement sites. */
export default class HostileSettlementManager {
    constructor({ worldSeed, campaignId = 'core', skillChallengeManager } = {}) {
        this.worldSeed = worldSeed;
        this.campaignId = campaignId;
        this.skillChallengeManager = skillChallengeManager;
        this.content = {};
    }

    async init() {
        const response = await fetch('data/hostileSettlements.json');
        if (!response.ok) {
            throw new Error(`Failed to load hostile settlements: ${response.status}`);
        }
        const data = await response.json();
        this.messages = data.messages;
        for (const key of ['combat', 'exploration', 'social', 'rebuilding']) {
            this.content[key] = filterByCampaign(data[key], this.campaignId);
        }
        await skillRegistry.load();
        this.recoverInterruptedCombats();
    }

    /** Saves omit runtime combat; an interrupted receipt grants no liberation credit. */
    recoverInterruptedCombats() {
        if (gameState.get('combat')) {
            return;
        }
        for (const settlement of gameState.get('world.settlements') || []) {
            if (settlement.hostileState?.pendingCombat) {
                delete settlement.hostileState.pendingCombat;
                this._persist(settlement);
            }
        }
    }

    _id(settlement) {
        return settlement.id || `${settlement.x},${settlement.y}`;
    }

    _clock() {
        return gameState.get('world.worldClock') || 0;
    }

    _present(settlement) {
        const position = gameState.get('player.position');
        return position?.x === settlement.x && position?.y === settlement.y &&
            !gameState.get('dungeon.active') && !gameState.get('combat');
    }

    /** Freeze content and level on the first actual visit; restored objects need no methods. */
    ensureSettlement(settlement) {
        if (!settlement || !RULES.hostileSettlements?.enabled) {
            return settlement;
        }
        const saved = (gameState.get('world.settlements') || []).find(site => this._id(site) === this._id(settlement));
        if (saved?.hostileState) {
            settlement.hostileState = saved.hostileState;
        }
        const state = settlement.hostileState;
        if (!state || state.phase !== 'hostile' || state.steps || !this._present(settlement)) {
            return settlement;
        }
        const plan = state.contentPlan || selectHostileSettlementContent(
            this.worldSeed ?? gameState.get('seed'), this._id(settlement), this.content,
            RULES.hostileSettlements.rebuildStages
        );
        if (!plan?.steps || !plan.rebuildSteps || plan.steps.some(step => !step) ||
            plan.rebuildSteps.length < RULES.hostileSettlements.rebuildStages) {
            return settlement;
        }
        Object.assign(state, {
            level: gameState.get('character.level') || 1,
            steps: JSON.parse(JSON.stringify(plan.steps)),
            rebuildSteps: JSON.parse(JSON.stringify(plan.rebuildSteps)),
            index: 0, nodeIndex: 0, rebuildIndex: 0, attempt: 0, decisions: [], readyAt: this._clock()
        });
        delete state.contentPlan;
        this._persist(settlement);
        return settlement;
    }

    isRestricted(settlement) {
        return Boolean(RULES.hostileSettlements?.enabled && ['hostile', 'rebuilding'].includes(settlement?.hostileState?.phase));
    }

    _step(state) {
        if (!['hostile', 'rebuilding'].includes(state.phase)) {
            return null;
        }
        return state.phase === 'hostile' ? state.steps?.[state.index] : state.rebuildSteps?.[state.rebuildIndex];
    }

    /** Return a renderer-independent view. remaining is measured in long rests, like quests. */
    getView(settlement) {
        this.ensureSettlement(settlement);
        const state = settlement.hostileState;
        if (!state) {
            return null;
        }
        const step = this._step(state);
        const node = step?.nodes?.[state.nodeIndex || 0];
        const dc = RULES.hostileSettlements.dcByTier.find(tier => state.level <= tier.maxLevel)?.dc;
        const options = (node?.options || step?.options || [])
            .filter(option => !option.requiresDecision || state.decisions?.some(decision =>
                decision.stepId === step.id && decision.decision === option.requiresDecision))
            .map(option => ({ ...option, dc: option.skill ? dc : null }));
        return {
            phase: state.phase, name: settlement.name,
            description: node?.description || step?.description || this.messages?.restored,
            step: step ? { ...step, description: node?.description || step.description, options } : null,
            options, level: state.level, remaining: Math.max(0, (state.readyAt || 0) - this._clock()),
            progress: { completed: state.phase === 'hostile' ? state.index : state.rebuildIndex,
                total: state.phase === 'hostile' ? state.steps?.length : state.rebuildSteps?.length },
            pendingCombat: Boolean(state.pendingCombat), lastResult: state.lastResult
        };
    }

    /** Resolve an authored option once. Combat progression waits for its captured receipt. */
    performAction(settlement, optionId) {
        if (!settlement || !this._present(settlement)) {
            return { success: false, message: this.messages?.mustVisit };
        }
        const view = this.getView(settlement);
        const state = settlement.hostileState;
        if (!this.isRestricted(settlement) || !view?.step || view.remaining || state.pendingCombat) {
            return { success: false, message: this.messages?.unavailable };
        }
        const option = view.options.find(choice => choice.id === optionId);
        if (!option) {
            return { success: false, message: this.messages?.unavailable };
        }
        const step = this._step(state);
        if (step.type === 'combat') {
            const source = { settlementId: this._id(settlement), stepId: step.id, attempt: ++state.attempt };
            state.pendingCombat = source;
            this._persist(settlement);
            return { success: true, message: step.description, combat: {
                monsterPool: step.monsterPoolsByTier?.find(tier => state.level <= tier.maxLevel)?.monsterPool || step.monsterPool,
                difficulty: RULES.hostileSettlements.liberationDifficulty,
                settlementSource: { ...source }, level: state.level
            } };
        }
        const character = gameState.get('character');
        let result = { success: true };
        if (option.skill) {
            const check = { skillId: option.skill, attribute: option.attribute, dc: option.dc,
                advantage: state.phase === 'rebuilding' && state.supportSkill === option.skill };
            result = this.skillChallengeManager
                ? this.skillChallengeManager.rollSkillCheck(character, check)
                : skillRegistry.rollCheck(character, check);
            addFatigue(RULES.fatigue.skillChallengeFatigue, 'skillChallenge', character);
        }
        const outcome = result.success ? option.onSuccess : option.onFailure;
        if (outcome?.effects && this.skillChallengeManager) {
            this.skillChallengeManager.applyConsequences(character, step, outcome.effects, result);
            gameState.set('character', character);
        }
        if (result.success) {
            if (option.decision) {
                state.decisions.push({ stepId: step.id, decision: option.decision });
            }
            if (option.supportSkill) {
                state.supportSkill = option.supportSkill;
            }
            if (step.nodes && state.nodeIndex + 1 < step.nodes.length) {
                state.nodeIndex++;
            } else {
                this._advance(state);
            }
        } else {
            state.readyAt = this._clock() + (state.phase === 'rebuilding' ? RULES.hostileSettlements.retryDelay : 0);
        }
        const response = { ...result, message: outcome?.message || this.messages?.unavailable };
        state.lastResult = response;
        this._persist(settlement);
        return response;
    }

    _advance(state) {
        state.nodeIndex = 0;
        if (state.phase === 'hostile') {
            state.index++;
            if (state.index === state.steps.length) {
                state.phase = 'rebuilding';
                state.liberatedAt = this._clock();
                state.readyAt = this._clock() + RULES.hostileSettlements.rebuildDelay;
            }
        } else {
            state.rebuildIndex++;
            state.readyAt = this._clock() + RULES.hostileSettlements.rebuildDelay;
            if (state.rebuildIndex === state.rebuildSteps.length) {
                state.phase = 'restored';
                state.restoredAt = this._clock();
            }
        }
    }

    /** Only an exact captured combat source can complete the pending fight. */
    recordCombatResult(source, outcome) {
        if (!source) {
            return false;
        }
        const settlement = (gameState.get('world.settlements') || []).find(site => this._id(site) === source.settlementId);
        const pending = settlement?.hostileState?.pendingCombat;
        if (!pending || !['settlementId', 'stepId', 'attempt'].every(key => pending[key] === source[key])) {
            return false;
        }
        delete settlement.hostileState.pendingCombat;
        if (outcome === 'victory') {
            this._advance(settlement.hostileState);
        }
        this._persist(settlement);
        return true;
    }

    _persist(settlement) {
        const id = this._id(settlement);
        const settlements = [...(gameState.get('world.settlements') || [])];
        const index = settlements.findIndex(site => this._id(site) === id);
        if (index < 0) {
            settlements.push(settlement);
        } else {
            settlements[index] = settlement;
        }
        gameState.set('world.settlements', settlements);
        const update = feature => {
            if (feature.type === 'settlement' && feature.x === settlement.x && feature.y === settlement.y) {
                feature.hostileState = settlement.hostileState;
            }
        };
        const metadata = gameState.get('world.metadata');
        metadata?.features?.forEach(update);
        metadata?.settlements?.forEach(site => {
            if (site.x === settlement.x && site.y === settlement.y) {
                site.hostileState = settlement.hostileState;
            }
        });
        if (metadata) {
            gameState.set('world.metadata', metadata);
        }
        const regions = gameState.get('world.generatedRegions');
        regions?.forEach(region => {
            region.features?.forEach(update);
            region.tiles?.forEach(tile => {
                if (tile.feature) {
                    update(tile.feature);
                }
            });
        });
        if (regions) {
            gameState.set('world.generatedRegions', regions);
        }
        const current = gameState.get('ui.currentSettlement');
        if (current && this._id(current) === id) {
            gameState.set('ui.currentSettlement', { ...current, hostileState: settlement.hostileState });
        }
    }
}
