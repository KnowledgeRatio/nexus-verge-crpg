/**
 * FatigueManager
 * Central utility for the fatigue / exhaustion / supplies system.
 * All reads and writes to gameState.fatigue go through here.
 */

import { RULES } from '../core/rulesEngine.js';
import { gameState } from '../core/GameState.js';

// ─── Read helpers ────────────────────────────────────────────────────────────

export function getFatigueState() {
    return gameState.get('fatigue') || {
        current: 0,
        exhaustionLevels: 0,
        supplies: RULES.fatigue.suppliesStartCount,
        suppliesZeroStreak: 0,
        lastThreshold: 'rested'
    };
}

/** Returns named threshold for a given fatigue % */
export function getThresholdName(pct) {
    const t = RULES.fatigue.thresholds;
    if (pct >= t.spent) {
        return 'spent';
    }
    if (pct >= t.staggering) {
        return 'staggering';
    }
    if (pct >= t.tired) {
        return 'tired';
    }
    if (pct >= t.wearied) {
        return 'wearied';
    }
    return 'rested';
}

/**
 * Returns modifiers imposed by current fatigue + exhaustion levels.
 * Callers apply these to their rolls.
 */
export function getFatigueModifiers() {
    if (!RULES.fatigue.enabled) {
        return { attackMod: 0, skillMod: 0, disadvantageAttacks: false, disadvantageSkills: false };
    }

    const { current, exhaustionLevels } = getFatigueState();
    const threshold = getThresholdName(current);
    const exPenalty = -exhaustionLevels; // cumulative -1 per level

    let attackMod = exPenalty;
    let skillMod = exPenalty;
    let disadvantageAttacks = false;
    let disadvantageSkills = false;

    if (threshold === 'wearied') {
        skillMod -= 1;
    }
    if (threshold === 'tired') {
        skillMod -= 1; attackMod -= 1;
    }
    if (threshold === 'staggering') {
        disadvantageAttacks = true; disadvantageSkills = true;
    }

    return { attackMod, skillMod, disadvantageAttacks, disadvantageSkills };
}

// ─── Write helpers ────────────────────────────────────────────────────────────

/**
 * Add fatigue percent. Handles threshold crossings and exhaustion triggers.
 * @param {number} amount  Positive number (% to add)
 * @param {string} _source  For log messages: 'movement' | 'combat' | 'skillChallenge'
 */
export function addFatigue(amount, _source = 'movement', character = null) {
    if (!RULES.fatigue.enabled) {
        return;
    }

    // Apply meal buff multiplier for non-movement sources (movement applies it in calcMovementFatigue)
    const mealMult = (_source !== 'movement')
        ? (character?.activeMealBuff?.fatigueRateMultiplier ?? 1)
        : 1;
    const effectiveAmount = amount * mealMult;

    const state = getFatigueState();
    const prevThreshold = getThresholdName(state.current);
    let newPct = Math.min(100, state.current + effectiveAmount);

    // Trigger exhaustion level if hitting 100
    if (newPct >= RULES.fatigue.thresholds.spent) {
        const maxExhaustionLevel = RULES.fatigue.maxExhaustionLevels;
        state.exhaustionLevels = Math.min(maxExhaustionLevel, state.exhaustionLevels + 1);
        newPct = RULES.fatigue.exhaustionTriggerResetTo;
        const msg = state.exhaustionLevels >= maxExhaustionLevel
            ? '☠️ Total exhaustion — death approaches.'
            : `😩 Exhaustion sets in! (Level ${state.exhaustionLevels}) — find a safe place to rest.`;
        gameState.addMessage(msg, 'error');
        _showFloatingFatigueText('SPENT! 💀');
    } else {
        const newThreshold = getThresholdName(newPct);
        if (newThreshold !== prevThreshold) {
            _onThresholdCrossed(newThreshold);
        }
    }

    state.current = Math.max(0, newPct);
    state.lastThreshold = getThresholdName(state.current);
    gameState.set('fatigue', state);
    _updateFatigueHUD();
}

/**
 * Remove fatigue percent (Make Camp action).
 */
export function removeFatigue(amount) {
    if (!RULES.fatigue.enabled) {
        return;
    }

    const state = getFatigueState();
    const prev = state.current;
    state.current = Math.max(0, state.current - amount);
    state.lastThreshold = getThresholdName(state.current);
    gameState.set('fatigue', state);

    if (prev > 0) {
        gameState.addMessage(`🏕️ You make camp and rest. Fatigue reduced to ${Math.round(state.current)}%.`, 'success');
    }
    _updateFatigueHUD();
}

/**
 * Handle long rest effects on fatigue:
 * - Reset fatigue to 0
 * - Clear 1 exhaustion level
 * - Consume 1 supply (handle penalties at 0)
 * Returns { hpRecoveryMultiplier, exhaustionCleared, suppliesConsumed, exhaustionGained }
 */
export function applyLongRestFatigue() {
    if (!RULES.fatigue.enabled) {
        return { hpRecoveryMultiplier: 1, exhaustionCleared: 0, suppliesConsumed: 0, exhaustionGained: 0 };
    }

    const state = getFatigueState();
    let hpRecoveryMultiplier = 1;
    let exhaustionCleared = 0;
    let suppliesConsumed = 0;
    let exhaustionGained = 0;

    // Consume supply
    if (state.supplies > 0) {
        state.supplies -= RULES.fatigue.suppliesPerLongRest;
        suppliesConsumed = RULES.fatigue.suppliesPerLongRest;
        state.suppliesZeroStreak = 0;
        gameState.addMessage(`🎒 Supplies consumed. ${state.supplies} remaining.`, 'info');
    } else {
        // No supplies
        state.suppliesZeroStreak++;
        hpRecoveryMultiplier = RULES.fatigue.suppliesZeroHPRecovery;
        gameState.addMessage('⚠️ No supplies! HP recovery halved.', 'warning');

        if (state.suppliesZeroStreak >= RULES.fatigue.suppliesZeroExhaustionRests) {
            const maxExhaustionLevel = RULES.fatigue.maxExhaustionLevels;
            state.exhaustionLevels = Math.min(maxExhaustionLevel, state.exhaustionLevels + 1);
            state.suppliesZeroStreak = 0;
            exhaustionGained = 1;
            gameState.addMessage(`😩 Hunger sets in — Exhaustion Level ${state.exhaustionLevels} gained.`, 'error');
        }
    }

    // Clear fatigue
    state.current = 0;
    state.lastThreshold = 'rested';

    // Clear 1 exhaustion level (only if not just gained one)
    if (state.exhaustionLevels > 0 && exhaustionGained === 0) {
        state.exhaustionLevels--;
        exhaustionCleared = 1;
        if (state.exhaustionLevels === 0) {
            gameState.addMessage('✅ Exhaustion cleared.', 'success');
        } else {
            gameState.addMessage(`😴 Exhaustion reduced to Level ${state.exhaustionLevels}.`, 'info');
        }
    }

    gameState.set('fatigue', state);
    _updateFatigueHUD();
    return { hpRecoveryMultiplier, exhaustionCleared, suppliesConsumed, exhaustionGained };
}

// ─── Movement fatigue helper ──────────────────────────────────────────────────

/**
 * Calculate fatigue gain for one tile of movement.
 * @param {number} movementCost  Terrain movementCost value
 * @param {Object} character     Character object (needs abilityModifiers + class.id)
 * @returns {number}  Fatigue % to add
 */
export function calcMovementFatigue(movementCost, character) {
    if (!RULES.fatigue.enabled) {
        return 0;
    }

    const r = RULES.fatigue;

    // Terrain cap: never multiply fatigue beyond maxFatigueTerrainMultiplier even in swamp/mountain
    const terrainMult = Math.min(movementCost || 1, r.maxFatigueTerrainMultiplier);

    // CON factor (Wanderlust may use DEX instead)
    const conMod = character.abilityModifiers?.con ?? 0;
    const dexMod = character.abilityModifiers?.dex ?? 0;
    const isWanderlust = character.class?.id === 'wanderlust';
    const statMod = isWanderlust ? Math.max(conMod, dexMod) : conMod;
    const conFactor = Math.max(r.minFatigueMultiplier, 1 - statMod * r.conModMultiplier);

    const mealMult = character?.activeMealBuff?.fatigueRateMultiplier ?? 1;
    return r.baseFatiguePerTile * terrainMult * conFactor * mealMult;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function _onThresholdCrossed(name) {
    const messages = {
        wearied: { msg: '😴 You feel wearied. (−1 skill checks)', type: 'warning', float: 'WEARIED 😴' },
        tired: { msg: '😩 You feel tired. (−1 skills & attacks)', type: 'warning', float: 'TIRED 😩' },
        staggering: {
            msg: '⚠️ You are staggering with exhaustion! (Disadvantage on attacks & skills)',
            type: 'error',
            float: 'STAGGERING ⚠️'
        }
    };
    const entry = messages[name];
    if (!entry) {
        return;
    }
    gameState.addMessage(entry.msg, entry.type);
    _showFloatingFatigueText(entry.float);
}

function _showFloatingFatigueText(text) {
    // Uses existing floating combat text system via window.game
    if (window.game?.showFloatingCombatText) {
        // Show relative to player card or centre-screen — use null to trigger centre fallback
        window.game.showFloatingCombatText(null, text, 'condition');
    }
}

function _updateFatigueHUD() {
    if (window.game?.updateFatigueHUD) {
        window.game.updateFatigueHUD();
    }
}
