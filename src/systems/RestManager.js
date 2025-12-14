/**
 * Rest Manager
 * Handles short and long rest mechanics for the player
 */

import { gameState } from '../core/GameState.js';
import { RULES } from '../core/rulesEngine.js';

class RestManager {
    constructor() {
        this.isResting = false;
    }

    /**
     * Check if player can take a short rest
     * @returns {Object} { canRest: boolean, reason: string }
     */
    canShortRest() {
        // Cannot rest in combat
        if (gameState.get('combat')) {
            return { canRest: false, reason: "Cannot rest during combat!" };
        }

        const character = gameState.get('character');
        
        // Check if short rests remaining
        if (character.shortRestsUsed >= RULES.rest.shortRestsPerLongRest) {
            return { canRest: false, reason: "No short rests remaining. You need a long rest." };
        }

        // In D&D 5e, you can take a short rest even without hit dice to spend
        // (for class features, or just to take a break)
        // Only prevent if already fully recovered AND at max hit dice AND no class features to recover
        if (character.currentHP >= character.maxHP && 
            character.hitDice.current >= character.hitDice.max) {
            // For now, allow rest even if at full health - player may want to rest for RP reasons
            // or we may add class features that recover on short rest
            return { canRest: true, reason: "" };
        }

        return { canRest: true, reason: "" };
    }

    /**
     * Check if player can take a long rest
     * @returns {Object} { canRest: boolean, reason: string }
     */
    canLongRest() {
        // Cannot rest in combat
        if (gameState.get('combat')) {
            return { canRest: false, reason: "Cannot rest during combat!" };
        }

        const character = gameState.get('character');

        // Check if in a tavern/inn (if required by rules)
        if (RULES.rest.longRestRequiresTavern) {
            const playerPos = gameState.get('player.position');
            if (!playerPos) {
                return { canRest: false, reason: "You must be in a tavern or inn to take a long rest." };
            }

            // Check if current tile has a tavern/inn feature
            const isInTavern = this.isPlayerInTavern();
            if (!isInTavern) {
                return { canRest: false, reason: "You must be in a tavern or inn to take a long rest." };
            }
        }

        // Check if rest is needed
        if (character.currentHP >= character.maxHP && 
            character.hitDice.current >= character.hitDice.max &&
            character.shortRestsUsed === 0) {
            
            // Check spell slots for casters
            if (character.spellcasting) {
                let needsSlots = false;
                for (const level in character.spellcasting.spellSlots) {
                    const slots = character.spellcasting.spellSlots[level];
                    if (slots.current < slots.max) {
                        needsSlots = true;
                        break;
                    }
                }
                if (!needsSlots) {
                    return { canRest: false, reason: "You don't need to rest - you're fully recovered!" };
                }
            } else {
                return { canRest: false, reason: "You don't need to rest - you're fully recovered!" };
            }
        }

        return { canRest: true, reason: "" };
    }

    /**
     * Check if player is currently in a tavern or inn
     * @returns {boolean}
     */
    isPlayerInTavern() {
        const playerPos = gameState.get('player.position');
        if (!playerPos) return false;

        const world = gameState.get('world');
        if (!world || !world.generatedRegions) return false;

        // Get current region
        const regionX = Math.floor(playerPos.x / 32);
        const regionY = Math.floor(playerPos.y / 32);
        const regionKey = `${regionX},${regionY}`;
        
        const region = world.generatedRegions.get(regionKey);
        if (!region) return false;

        // Get tile within region
        const localX = ((playerPos.x % 32) + 32) % 32;
        const localY = ((playerPos.y % 32) + 32) % 32;
        const tile = region.tiles[localY]?.[localX];

        if (!tile) return false;

        // Check if tile has a settlement feature (any settlement has tavern/inn)
        if (tile.feature && tile.feature.type === 'settlement') {
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
                if (dx === 0 && dy === 0) continue;
                
                const checkX = playerPos.x + dx;
                const checkY = playerPos.y + dy;
                
                // Get region for this position
                const checkRegionX = Math.floor(checkX / 32);
                const checkRegionY = Math.floor(checkY / 32);
                const checkRegionKey = `${checkRegionX},${checkRegionY}`;
                
                const checkRegion = world.generatedRegions.get(checkRegionKey);
                if (!checkRegion) continue;
                
                const checkLocalX = ((checkX % 32) + 32) % 32;
                const checkLocalY = ((checkY % 32) + 32) % 32;
                const checkTile = checkRegion.tiles[checkLocalY]?.[checkLocalX];
                
                if (checkTile && checkTile.feature) {
                    if (checkTile.feature.type === 'settlement' || checkTile.feature.type === 'sanctuary') {
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
        const canRest = this.canShortRest();
        if (!canRest.canRest) {
            return { success: false, reason: canRest.reason };
        }

        this.isResting = true;
        const character = gameState.get('character');

        // If no specific dice count provided, auto-calculate
        if (hitDiceToSpend === null) {
            // Default: spend half of available hit dice (minimum 1)
            hitDiceToSpend = Math.max(1, Math.floor(character.hitDice.current / 2));
        }

        // Clamp to available dice
        hitDiceToSpend = Math.min(hitDiceToSpend, character.hitDice.current);

        // Perform the rest on the character
        const result = character.shortRest();

        // Update game state
        gameState.set('character', character);

        // Add message
        if (result.success) {
            gameState.addMessage(`You take a short rest and recover ${result.healing} HP.`, 'success');
            gameState.addMessage(`Short rests remaining: ${result.shortRestsRemaining}`, 'info');
        } else {
            gameState.addMessage(result.reason, 'error');
        }

        this.isResting = false;
        return result;
    }

    /**
     * Perform a long rest
     * @returns {Object} Result of the rest
     */
    async longRest() {
        const canRest = this.canLongRest();
        if (!canRest.canRest) {
            return { success: false, reason: canRest.reason };
        }

        this.isResting = true;
        const character = gameState.get('character');

        // Perform the rest on the character
        const result = character.longRest();

        // Update game state
        gameState.set('character', character);

        // Add messages
        gameState.addMessage('You take a long rest at the inn...', 'info');
        gameState.addMessage('You wake up feeling refreshed!', 'success');
        gameState.addMessage(`HP: ${character.currentHP}/${character.maxHP} (fully restored)`, 'success');
        gameState.addMessage(`Hit dice: ${character.hitDice.current}/${character.hitDice.max}`, 'info');
        
        if (character.spellcasting) {
            gameState.addMessage('All spell slots restored!', 'success');
        }

        this.isResting = false;
        return result;
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
        if (!character) return;

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

        // Update info text
        const infoEl = document.getElementById('restInfo');
        if (infoEl) {
            const isInTavern = this.isPlayerInTavern();
            infoEl.innerHTML = `
                <p><strong>Short Rest:</strong> Roll all your hit dice to recover HP. Max ${RULES.rest.shortRestsPerLongRest} per long rest.</p>
                <p><strong>Long Rest:</strong> Fully restore HP, regain all spell slots, and reset short rest counter. ${RULES.rest.longRestRequiresTavern ? '(Requires tavern or inn)' : ''}</p>
                ${RULES.rest.longRestRequiresTavern && !isInTavern ? 
                    '<p class="warning">⚠️ You are not in a tavern. Find an inn to take a long rest.</p>' : 
                    ''}
            `;
        }
    }
}

// Export singleton instance
const restManager = new RestManager();
export default restManager;
