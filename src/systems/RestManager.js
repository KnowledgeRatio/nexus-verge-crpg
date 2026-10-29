/**
 * Rest Manager
 * Handles short and long rest mechanics for the player
 */

import { gameState } from '../core/GameState.js';
import { RULES } from '../core/rulesEngine.js';
import { roll } from '../utils/dice.js';
import { getAttributeModifierFor } from '../utils/attributeResolver.js';
import { applyLongRestFatigue, getFatigueState } from './FatigueManager.js';
import { damagePrecisionEnabled, normalizeHP, addHP } from '../utils/damagePrecision.js';
import { formatCombatNumber } from '../utils/combatNumberFormat.js';
import { recoverRestResources } from './restRecovery.js';

class RestManager {
    constructor() {
        this.isResting = false;
        this.abilitiesData = null;
    }

    async loadRecoveryAbilities() {
        const character = gameState.get('character');
        if (!Object.keys(character.abilityUses || {}).length) {
            return null;
        }
        const loaded = globalThis.window?.game?.abilitiesData || this.abilitiesData;
        if (loaded) {
            return loaded;
        }
        const response = await fetch('data/abilities.json');
        if (!response.ok) {
            throw new Error('Unable to load rest recovery abilities');
        }
        this.abilitiesData = await response.json();
        return this.abilitiesData;
    }

    async prepareRest(type) {
        if (this.isResting) {
            return { canRest: false, reason: 'A rest is already in progress.' };
        }
        const check = () => type === 'short' ? this.canShortRest() : this.canLongRest();
        const eligibility = check();
        if (!eligibility.canRest) {
            return eligibility;
        }
        const restingCharacter = gameState.get('character');
        const restingWorld = gameState.get('world');
        this.isResting = true;
        try {
            const abilitiesData = await this.loadRecoveryAbilities();
            if (gameState.get('character') !== restingCharacter || gameState.get('world') !== restingWorld) {
                this.isResting = false;
                return { canRest: false, reason: 'The game changed while preparing this rest. Please try again.' };
            }
            const result = { ...check(), abilitiesData };
            if (!result.canRest) {
                this.isResting = false;
            }
            return result;
        } catch {
            this.isResting = false;
            const reason = 'Rest recovery data could not load. Please try again.';
            gameState.addMessage(reason, 'error');
            return { canRest: false, reason };
        }
    }

    /**
     * Check if player can take a short rest
     * @returns {Object} { canRest: boolean, reason: string }
     */
    canShortRest() {
        // Cannot rest in combat
        if (gameState.get('combat')) {
            return { canRest: false, reason: 'Cannot rest during combat!' };
        }

        const character = gameState.get('character');

        // Check if short rests remaining
        if (character.shortRestsUsed >= RULES.rest.shortRestsPerLongRest) {
            return { canRest: false, reason: 'No short rests remaining. You need a long rest.' };
        }

        // In D&D 5e, you can take a short rest even without hit dice to spend
        // (for class features, or just to take a break)
        // Only prevent if already fully recovered AND at max hit dice AND no class features to recover
        if (character.currentHP >= character.maxHP &&
            character.hitDice.current >= character.hitDice.max) {
            // For now, allow rest even if at full health - player may want to rest for RP reasons
            // or we may add class features that recover on short rest
            return { canRest: true, reason: '' };
        }

        return { canRest: true, reason: '' };
    }

    /**
     * Check if player can take a long rest
     * @returns {Object} { canRest: boolean, reason: string }
     */
    canLongRest() {
        // Cannot rest in combat
        if (gameState.get('combat')) {
            return { canRest: false, reason: 'Cannot rest during combat!' };
        }

        // Check if in a tavern/inn (if required by rules)
        if (RULES.rest.longRestRequiresTavern) {
            const playerPos = gameState.get('player.position');
            if (!playerPos) {
                return { canRest: false, reason: 'You must be in a tavern or inn to take a long rest.' };
            }

            // Check if current tile has a tavern/inn feature
            const isInTavern = this.isPlayerInTavern();
            if (!isInTavern) {
                return { canRest: false, reason: 'You must be in a tavern or inn to take a long rest.' };
            }
        }

        // Long rests also advance accepted quest deadlines and settlement rebuilding.
        return { canRest: true, reason: '' };
    }

    /**
     * Check if player is currently in a tavern or inn
     * @returns {boolean}
     */
    isPlayerInTavern() {
        const playerPos = gameState.get('player.position');
        if (!playerPos) {
            console.log('Tavern check: No player position');
            return false;
        }

        const world = gameState.get('world');
        if (!world || !world.generatedRegions) {
            console.log('Tavern check: No world data');
            return false;
        }

        const settlements = [...(world.settlements || []), ...(world.metadata?.settlements || [])];
        const settlement = settlements.find(site => site.x === playerPos.x && site.y === playerPos.y);
        if (RULES.hostileSettlements.enabled && ['hostile', 'rebuilding'].includes(settlement?.hostileState?.phase)) {
            return false;
        }

        // Get current region
        const regionX = Math.floor(playerPos.x / 32);
        const regionY = Math.floor(playerPos.y / 32);
        const regionKey = `${regionX},${regionY}`;

        const region = world.generatedRegions.get(regionKey);
        if (!region) {
            console.log(`Tavern check: No region at ${regionKey}`);
            return false;
        }

        // Get tile within region (tiles are stored as 1D array)
        const localX = ((playerPos.x % 32) + 32) % 32;
        const localY = ((playerPos.y % 32) + 32) % 32;
        const index = localY * 32 + localX;
        const tile = region.tiles[index];

        if (!tile) {
            console.log(`Tavern check: No tile at local ${localX},${localY} (index ${index})`);
            return false;
        }

        console.log(`Tavern check at world (${playerPos.x},${playerPos.y}), local (${localX},${localY})`);
        console.log(`   - tile.terrain: ${tile.terrain}`);
        console.log('   - tile.feature:', tile.feature);

        // Check if tile has a settlement feature (any settlement has tavern/inn)
        if (tile.feature && tile.feature.type === 'settlement') {
            if (RULES.hostileSettlements.enabled && ['hostile', 'rebuilding'].includes(tile.feature.hostileState?.phase)) {
                return false;
            }
            console.log('   Found settlement feature on current tile');
            return true;
        }

        // Check if tile has a sanctuary feature
        if (tile.feature && tile.feature.type === 'sanctuary') {
            return true;
        }

        // Also check if we're on a specific terrain type marked as town/city/sanctuary
        if (tile.terrain === 'town' || tile.terrain === 'city' || tile.terrain === 'sanctuary') {
            return true;
        }

        // Check nearby tiles for settlement or sanctuary features (within 1-2 tiles)
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (dx === 0 && dy === 0) {
                    continue;
                }

                const checkX = playerPos.x + dx;
                const checkY = playerPos.y + dy;

                // Get region for this position
                const checkRegionX = Math.floor(checkX / 32);
                const checkRegionY = Math.floor(checkY / 32);
                const checkRegionKey = `${checkRegionX},${checkRegionY}`;

                const checkRegion = world.generatedRegions.get(checkRegionKey);
                if (!checkRegion) {
                    continue;
                }

                const checkLocalX = ((checkX % 32) + 32) % 32;
                const checkLocalY = ((checkY % 32) + 32) % 32;
                const checkTile = checkRegion.tiles[checkLocalY]?.[checkLocalX];

                if (checkTile && checkTile.feature) {
                    if (checkTile.feature.type === 'sanctuary' ||
                        (checkTile.feature.type === 'settlement' &&
                            (!RULES.hostileSettlements.enabled ||
                                !['hostile', 'rebuilding'].includes(checkTile.feature.hostileState?.phase)))) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Perform a short rest
     * @param {number} hitDiceToSpend - Number of hit dice player wants to spend (optional)
     * @returns {Object} Result of the rest
     */
    async shortRest(hitDiceToSpend = null) {
        const canRest = await this.prepareRest('short');
        if (!canRest.canRest) {
            return { success: false, reason: canRest.reason };
        }

        this.isResting = true;
        const character = gameState.get('character');

        // D&D 5e Short Rest: Roll all hit dice to heal
        const diceToRoll = character.hitDice.current; // Hit dice = level (they don't deplete)
        let healing = 0;

        // Roll each hit die + physical resilience modifier
        for (let i = 0; i < diceToRoll; i++) {
            healing += roll(`1d${character.hitDice.size}`) + getAttributeModifierFor(character, 'hp');
        }

        // Apply healing
        if (healing > 0) {
            const oldHP = character.currentHP;
            character.currentHP = addHP(character.currentHP, healing, character.maxHP);
            healing = normalizeHP(character.currentHP - oldHP); // Actual healing applied
        }

        // Increment short rests used
        character.shortRestsUsed++;
        recoverRestResources(character, 'short', canRest.abilitiesData);

        // Update game state
        gameState.set('character', character);

        // Add messages
        gameState.addMessage(`You take a short rest and recover ${healing} HP by rolling ${diceToRoll}d${character.hitDice.size}.`, 'success');
        gameState.addMessage(`Short rests remaining: ${2 - character.shortRestsUsed}`, 'info');

        this.isResting = false;
        return {
            success: true,
            healing: healing,
            hitDiceRolled: diceToRoll,
            shortRestsRemaining: 2 - character.shortRestsUsed
        };
    }

    /**
     * Perform a long rest
     * @returns {Object} Result of the rest
     */
    async longRest() {
        const canRest = await this.prepareRest('long');
        if (!canRest.canRest) {
            return { success: false, reason: canRest.reason };
        }

        this.isResting = true;
        const character = gameState.get('character');

        // D&D 5e Long Rest: Restore all HP
        character.currentHP = character.maxHP;

        // Apply fatigue long-rest effects (supplies, exhaustion clearing, fatigue reset)
        const fatigueResult = applyLongRestFatigue();

        // If out of supplies, cap HP recovery at 50% of max
        if (fatigueResult.hpRecoveryMultiplier < 1) {
            character.currentHP = damagePrecisionEnabled()
                ? normalizeHP(character.maxHP * fatigueResult.hpRecoveryMultiplier)
                : Math.floor(character.maxHP * fatigueResult.hpRecoveryMultiplier);
        }

        // Hit dice don't need restoring (they equal level and don't deplete)
        character.hitDice.current = character.hitDice.max;

        // Reset short rests counter
        character.shortRestsUsed = 0;
        recoverRestResources(character, 'long', canRest.abilitiesData);

        // Recover spell slots
        if (character.spellcasting) {
            for (const level in character.spellcasting.spellSlots) {
                character.spellcasting.spellSlots[level].current = character.spellcasting.spellSlots[level].max;
            }
        }

        // Update game state
        gameState.set('character', character);

        // Advance world clock — one long rest = one week on the Verge
        const world = gameState.get('world');
        world.worldClock = (world.worldClock || 0) + (RULES.quests.clockUnitsPerLongRest || 1);
        gameState.set('world', world);
        globalThis.window?.game?.questManager?.checkQuestDeadlines?.();
        gameState.addMessage('One week passes on the Verge. Urgent quest deadlines and rebuilding both advance.', 'info');

        // Add messages
        gameState.addMessage('You take a long rest at the inn...', 'info');
        gameState.addMessage('You wake up feeling refreshed!', 'success');
        const hpLabel = fatigueResult.hpRecoveryMultiplier < 1 ? 'halved — no supplies!' : 'fully restored';
        gameState.addMessage(`HP: ${formatCombatNumber(character.currentHP)}/${formatCombatNumber(character.maxHP)} (${hpLabel})`, fatigueResult.hpRecoveryMultiplier < 1 ? 'warning' : 'success');
        gameState.addMessage(`Hit dice: ${character.hitDice.current}/${character.hitDice.max}`, 'info');

        if (character.spellcasting) {
            gameState.addMessage('All spell slots restored!', 'success');
        }

        this.isResting = false;
        return { success: true };
    }

    /**
     * Open the rest menu UI
     */
    openRestMenu() {
        // Show rest modal
        const restModal = document.getElementById('restModal');
        if (restModal) {
            restModal.classList.add('active');
            this.updateRestUI();

            // Attach event handlers (in case they weren't set up yet or need refreshing)
            this.attachEventHandlers();
        }
    }

    /**
     * Attach event handlers to rest buttons
     */
    attachEventHandlers() {
        // Short rest button
        const shortRestBtn = document.getElementById('shortRestBtn');
        if (shortRestBtn) {
            // Remove old handler if exists
            const newShortRestBtn = shortRestBtn.cloneNode(true);
            shortRestBtn.parentNode.replaceChild(newShortRestBtn, shortRestBtn);

            newShortRestBtn.addEventListener('click', async () => {
                const result = await this.shortRest();
                if (result.success) {
                    this.updateRestUI(); // Refresh UI after rest
                    // Notify main.js to update HUD
                    window.dispatchEvent(new CustomEvent('restCompleted', { detail: { type: 'short', result } }));
                } else {
                    // Show error in UI
                    this.updateRestUI();
                }
            });
        }

        // Long rest button
        const longRestBtn = document.getElementById('longRestBtn');
        if (longRestBtn) {
            // Remove old handler if exists
            const newLongRestBtn = longRestBtn.cloneNode(true);
            longRestBtn.parentNode.replaceChild(newLongRestBtn, longRestBtn);

            newLongRestBtn.addEventListener('click', async () => {
                const result = await this.longRest();
                if (result.success) {
                    this.updateRestUI(); // Refresh UI after rest
                    // Notify main.js to update HUD
                    window.dispatchEvent(new CustomEvent('restCompleted', { detail: { type: 'long', result } }));
                } else {
                    // Show error in UI
                    this.updateRestUI();
                }
            });
        }

        // Make Camp button
        const makeCampBtn = document.getElementById('makeCampBtn');
        if (makeCampBtn) {
            // Remove old handler if exists
            const newMakeCampBtn = makeCampBtn.cloneNode(true);
            makeCampBtn.parentNode.replaceChild(newMakeCampBtn, makeCampBtn);

            newMakeCampBtn.addEventListener('click', () => {
                if (window.game?.player) {
                    window.game.player.makeCamp();
                    this.updateRestUI();
                }
            });
        }

        const gatherBtn = document.getElementById('gatherProvisionsBtn');
        if (gatherBtn) {
            const button = gatherBtn.cloneNode(true);
            gatherBtn.parentNode.replaceChild(button, gatherBtn);
            button.addEventListener('click', () => window.game?.promptProvisioning?.());
        }

        // Close button
        const closeRestBtn = document.getElementById('closeRestBtn');
        if (closeRestBtn) {
            // Remove old handler if exists
            const newCloseBtn = closeRestBtn.cloneNode(true);
            closeRestBtn.parentNode.replaceChild(newCloseBtn, closeRestBtn);

            newCloseBtn.addEventListener('click', () => {
                this.closeRestMenu();
            });
        }
    }

    /**
     * Close the rest menu UI
     */
    closeRestMenu() {
        const restModal = document.getElementById('restModal');
        if (restModal) {
            restModal.classList.remove('active');
        }
    }

    /**
     * Update the rest UI with current character state
     */
    updateRestUI() {
        const character = gameState.get('character');
        if (!character) {
            return;
        }

        // Update character status display
        const statusEl = document.getElementById('restCharacterStatus');
        if (statusEl) {
            statusEl.innerHTML = `
                <div class="rest-stat">
                    <span class="label">HP:</span>
                    <span class="value">${character.currentHP} / ${character.maxHP}</span>
                </div>
                <div class="rest-stat">
                    <span class="label">Hit Dice:</span>
                    <span class="value">${character.hitDice.current}d${character.hitDice.size} (always available)</span>
                </div>
                <div class="rest-stat">
                    <span class="label">Short Rests:</span>
                    <span class="value">${RULES.rest.shortRestsPerLongRest - character.shortRestsUsed} remaining</span>
                </div>
                ${RULES.fatigue.enabled ? (() => {
        const fatigueState = getFatigueState();
        const suppliesWarning = fatigueState.supplies <= 0;
        return `
                <div class="rest-stat">
                    <span class="label">Supplies:</span>
                    <span class="value${suppliesWarning ? ' warning-text' : ''}">${fatigueState.supplies} remaining${suppliesWarning ? ' — HP recovery halved!' : ''}</span>
                </div>
                ${fatigueState.exhaustionLevels > 0 ? `
                <div class="rest-stat">
                    <span class="label">Exhaustion:</span>
                    <span class="value warning-text">Level ${fatigueState.exhaustionLevels}</span>
                </div>
                ` : ''}
                `;
    })() : ''}
                ${character.spellcasting ? `
                    <div class="rest-stat">
                        <span class="label">Spell Slots:</span>
                        <div class="spell-slots">
                            ${Object.entries(character.spellcasting.spellSlots).map(([level, slots]) =>
        `<span>L${level}: ${slots.current}/${slots.max}</span>`
    ).join(' ')}
                        </div>
                    </div>
                ` : ''}
            `;
        }

        // Update short rest button
        const shortRestBtn = document.getElementById('shortRestBtn');
        const shortRestCheck = this.canShortRest();
        if (shortRestBtn) {
            shortRestBtn.disabled = !shortRestCheck.canRest;
            if (!shortRestCheck.canRest) {
                shortRestBtn.title = shortRestCheck.reason;
            }
        }

        // Update long rest button
        const longRestBtn = document.getElementById('longRestBtn');
        const longRestCheck = this.canLongRest();
        if (longRestBtn) {
            longRestBtn.disabled = !longRestCheck.canRest;
            if (!longRestCheck.canRest) {
                longRestBtn.title = longRestCheck.reason;
            }
        }

        // Update Make Camp button
        const makeCampBtn = document.getElementById('makeCampBtn');
        if (makeCampBtn) {
            const combat = gameState.get('combat');
            const fatigueState = RULES.fatigue.enabled ? getFatigueState() : null;
            const campDisabled = !!(
                combat?.active ||
                (fatigueState && fatigueState.supplies <= 0) ||
                (fatigueState && fatigueState.current <= 0)
            );
            makeCampBtn.disabled = campDisabled;
            if (campDisabled) {
                if (combat?.active) {
                    makeCampBtn.title = 'Cannot make camp during combat!';
                } else if (fatigueState && fatigueState.supplies <= 0) {
                    makeCampBtn.title = 'No supplies remaining.';
                } else if (fatigueState && fatigueState.current <= 0) {
                    makeCampBtn.title = 'You are already well rested.';
                }
            } else {
                makeCampBtn.title = '';
            }
        }

        const position = gameState.get('player.position');
        const opportunity = position && window.game?.provisioningManager?.getOpportunityAtPosition(
            position.x, position.y
        );
        const cueEl = document.getElementById('provisioningCue');
        const gatherBtn = document.getElementById('gatherProvisionsBtn');
        const visibleOpportunity = opportunity && RULES.provisioning.enabled && RULES.fatigue.enabled;
        if (cueEl) {
            cueEl.hidden = !visibleOpportunity;
            cueEl.textContent = visibleOpportunity ? `${opportunity.cue.title}: ${opportunity.cue.description}` : '';
        }
        if (gatherBtn) {
            gatherBtn.hidden = !visibleOpportunity;
            if (visibleOpportunity) {
                gatherBtn.disabled = !opportunity.canAttempt;
                gatherBtn.querySelector('.btn-title').textContent = opportunity.cue.actionLabel || 'Gather provisions';
                const reasons = {
                    full: 'Supplies full — leave this opportunity for later.',
                    spent: 'This opportunity has already been attempted.',
                    unsafe: 'Unavailable during combat or dungeon exploration.',
                    disabled: 'Provisioning is disabled.'
                };
                const label = reasons[opportunity.reason] ||
                    `Survival · DC ${opportunity.challenge.dc} · +${RULES.provisioning.suppliesReward} supply · One attempt`;
                gatherBtn.querySelector('.btn-desc').textContent = label;
                gatherBtn.title = label;
            }
        }

        // Update info text
        const infoEl = document.getElementById('restInfo');
        if (infoEl) {
            const isInTavern = this.isPlayerInTavern();
            infoEl.innerHTML = `
                <p><strong>Short Rest:</strong> Roll all your hit dice to recover HP. Restore Resolve and abilities/equipment charges that recharge on a short rest. Max ${RULES.rest.shortRestsPerLongRest} per long rest. Does not advance the world clock.</p>
                <p><strong>Long Rest:</strong> Fully restore HP, regain all spell slots, restore Resolve and short/long-rest ability and equipment charges, and reset short rest counter. ${RULES.rest.longRestRequiresTavern ? '(Requires a safe inn or sanctuary)' : ''} Advances the world clock by one week, consumes supplies and advances accepted urgent quest deadlines. Available even when fully recovered.</p>
                ${RULES.rest.longRestRequiresTavern && !isInTavern ?
        '<p class="warning">You are not in a tavern. Find an inn to take a long rest.</p>' :
        ''}
            `;
        }
    }
}

// Export singleton instance
const restManager = new RestManager();
export default restManager;
