/**
 * Combat Manager - Simplified Non-Grid Turn-Based Combat
 * Follows D&D 5e SRD 5.2.1 2024 rules
 */

import { gameState } from '../core/GameState.js';
import { RULES } from '../core/rulesEngine.js';
import { rollDice, rollD20 } from '../utils/dice.js';

class CombatManager {
    constructor() {
        this.active = false;
        this.combatants = [];
        this.turnOrder = [];
        this.currentTurnIndex = 0;
        this.round = 0;

        // Combat state
        this.playerCombatant = null;
        this.enemyCombatants = [];

        console.log('⚔️ Combat Manager initialized');
    }

    /**
     * Start combat encounter
     * @param {Object} player - Player character
     * @param {Array} enemies - Array of enemy characters
     */
    async startCombat(player, enemies) {
        console.log('⚔️ Starting combat encounter!');

        this.active = true;
        this.round = 1;
        this.combatants = [];
        this.turnOrder = [];

        // Create player combatant
        this.playerCombatant = new Combatant(player, 'player');
        this.combatants.push(this.playerCombatant);

        // Create enemy combatants
        this.enemyCombatants = enemies.map((enemy, index) => {
            const combatant = new Combatant(enemy, 'enemy', `enemy_${index}`);
            this.combatants.push(combatant);
            return combatant;
        });

        // Roll initiative
        this.rollInitiative();

        // Update game state
        gameState.set('combat', {
            active: true,
            round: this.round,
            currentTurn: this.getCurrentCombatant()?.id,
            combatants: this.combatants.map(c => c.toJSON())
        });

        // Add combat start messages
        gameState.addMessage(`⚔️ Combat begins! Round ${this.round}`, 'warning');
        gameState.addMessage(`Turn order: ${this.turnOrder.map(c => c.name).join(' → ')}`, 'info');

        // Start first turn
        this.startTurn();

        return this;
    }

    /**
     * Roll initiative for all combatants
     */
    rollInitiative() {
        this.combatants.forEach(combatant => {
            const rollObj = rollD20();
            const roll = rollObj.result;
            const modifier = combatant.character.abilityModifiers.dex;
            combatant.initiative = roll + modifier;

            gameState.addMessage(
                `${combatant.name} rolls initiative: ${roll} + ${modifier} = ${combatant.initiative}`,
                'info'
            );
        });

        // Sort by initiative (highest first)
        this.turnOrder = [...this.combatants].sort((a, b) => {
            if (b.initiative !== a.initiative) {
                return b.initiative - a.initiative;
            }
            // Tiebreaker: higher DEX wins
            return b.character.abilityModifiers.dex - a.character.abilityModifiers.dex;
        });

        this.currentTurnIndex = 0;
    }

    /**
     * Get current combatant
     */
    getCurrentCombatant() {
        return this.turnOrder[this.currentTurnIndex];
    }

    /**
     * Start a turn
     */
    startTurn() {
        const combatant = this.getCurrentCombatant();
        console.log('🎯 START TURN for:', combatant?.name, 'Team:', combatant?.team);

        if (!combatant) {
            console.log('⚠️ No current combatant!');
            return;
        }

        combatant.startTurn();

        gameState.addMessage(
            `📍 ${combatant.name}'s turn (HP: ${combatant.hp}/${combatant.maxHP})`,
            combatant.team === 'player' ? 'success' : 'warning'
        );

        // Update game state
        this.updateGameState();

        // If it's an enemy turn, execute AI
        if (combatant.team === 'enemy') {
            console.log('🤖 Enemy turn - executing AI in 500ms');
            setTimeout(() => this.executeEnemyAI(combatant), 500);
        } else {
            console.log('👤 Player turn - waiting for input');
        }
    }

    /**
     * Execute enemy AI turn - Simple: pick random target and attack
     */
    async executeEnemyAI(combatant) {
        console.log(`⚔️ AI executing turn for ${combatant.name}`);
        gameState.addMessage(`${combatant.name} is acting...`, 'info');

        // Pick random living player target (for now just the player)
        const targets = [this.playerCombatant].filter(c => c.hp > 0);

        if (targets.length === 0) {
            console.log('⚠️ No valid targets, ending turn');
            this.endTurn();
            return;
        }

        const target = targets[Math.floor(Math.random() * targets.length)];

        // For now, always attack (can add ability/spell logic later)
        await this.attack(combatant, target);

        // End turn after a delay
        setTimeout(() => {
            console.log(`Enemy turn ending`);
            this.endTurn();
        }, 1000);
    }

    /**
     * Perform an attack
     */
    async attack(attacker, defender) {
        console.log(`⚔️ ATTACK:`, attacker.name, 'attacks', defender.name);

        if (!attacker.actions.action) {
            console.log('⚠️ No action available!');
            gameState.addMessage(`${attacker.name} has no action available!`, 'error');
            return;
        }

        gameState.addMessage(`${attacker.name} attacks ${defender.name}!`, 'warning');

        // Get weapon for attack bonus
        const weapon = attacker.character.equipment?.mainHand;
        let attackBonus = attacker.character.abilityModifiers.str;

        // If using DEX weapon or no weapon, use DEX
        if (weapon?.properties?.includes('finesse') || !weapon) {
            attackBonus = Math.max(
                attacker.character.abilityModifiers.str,
                attacker.character.abilityModifiers.dex
            );
        }

        // Add proficiency bonus
        const proficiency = attacker.character.proficiencyBonus;

        // Attack roll: d20 + ability mod + proficiency
        const attackRollObj = rollD20();
        const attackRoll = attackRollObj.result;
        const attackTotal = attackRoll + attackBonus + proficiency;

        const isCritical = RULES.combat.criticalHitRange.includes(attackRoll);
        const isCriticalMiss = RULES.combat.criticalMissRange.includes(attackRoll);

        gameState.addMessage(
            `Attack roll: ${attackRoll} + ${attackBonus} + ${proficiency} = ${attackTotal} vs AC ${defender.ac}`,
            'info'
        );

        if (isCriticalMiss) {
            gameState.addMessage(`💥 Critical miss!`, 'error');
            attacker.actions.action = false;
            this.updateGameState();
            return;
        }

        if (isCritical || attackTotal >= defender.ac) {
            // Hit! Roll damage
            let damageDice = 8; // Default d8
            if (weapon?.damage?.dice) {
                damageDice = parseInt(weapon.damage.dice.split('d')[1]) || 8;
            }

            let damageRoll = rollDice(1, damageDice);
            if (isCritical) {
                damageRoll += rollDice(1, damageDice); // Double dice on crit
                gameState.addMessage(`⭐ Critical hit!`, 'success');
            }
            const damageTotal = damageRoll + attackBonus;

            gameState.addMessage(
                `💥 Hit! ${damageTotal} damage (${damageRoll} + ${attackBonus})`,
                attacker.team === 'player' ? 'success' : 'error'
            );

            // Apply damage
            defender.takeDamage(damageTotal);

            // Check if defender is defeated
            if (defender.hp <= 0) {
                gameState.addMessage(`💀 ${defender.name} is defeated!`, 'warning');
                this.handleDefeat(defender);
            }
        } else {
            gameState.addMessage(`Miss!`, 'info');
        }

        attacker.actions.action = false;
        this.updateGameState();
    }

    /**
     * Attempt to flee from combat
     * D&D 5e SRD 5.2.1 2024: d20 + initiative modifier vs DC 30
     */
    flee(combatant) {
        if (!combatant.actions.action) {
            gameState.addMessage(`${combatant.name} has no action available!`, 'error');
            return;
        }

        const fleeRollObj = rollD20();
        const fleeRoll = fleeRollObj.result;
        const fleeTotal = fleeRoll + combatant.initiative;
        const fleeDC = 30;

        gameState.addMessage(
            `${combatant.name} attempts to flee! (${fleeRoll} + ${combatant.initiative} = ${fleeTotal} vs DC ${fleeDC})`,
            'warning'
        );

        if (fleeTotal >= fleeDC) {
            gameState.addMessage(`${combatant.name} successfully escapes!`, 'success');
            this.endCombat('fled');
        } else {
            gameState.addMessage(`${combatant.name} fails to escape!`, 'error');
        }

        combatant.actions.action = false;
        this.updateGameState();
    }

    /**
     * Use an ability (placeholder for future implementation)
     */
    useAbility(combatant, ability, target) {
        gameState.addMessage('Abilities not yet implemented', 'error');
        // TODO: Implement class features and abilities
    }

    /**
     * Cast a spell (placeholder for future implementation)
     */
    castSpell(combatant, spell, target) {
        gameState.addMessage('Spells not yet implemented', 'error');
        // TODO: Implement spell casting system
    }

    /**
     * Handle combatant defeat
     */
    handleDefeat(combatant) {
        // Check for combat end
        if (combatant.team === 'player') {
            this.endCombat('defeat');
        } else {
            // Check if all enemies defeated
            const aliveEnemies = this.enemyCombatants.filter(e => e.hp > 0);
            if (aliveEnemies.length === 0) {
                this.endCombat('victory');
            }
        }
    }

    /**
     * End current turn
     */
    endTurn() {
        const combatant = this.getCurrentCombatant();
        if (combatant) {
            combatant.endTurn();
        }

        // Get alive combatants
        const aliveCombatants = this.turnOrder.filter(c => c.hp > 0);

        if (aliveCombatants.length === 0) {
            console.log('⚠️ No alive combatants!');
            return;
        }

        // Move to next alive combatant
        let nextIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;

        // Skip dead combatants
        while (this.turnOrder[nextIndex].hp <= 0) {
            nextIndex = (nextIndex + 1) % this.turnOrder.length;
        }

        this.currentTurnIndex = nextIndex;

        // If we've cycled back to start, increment round
        if (this.currentTurnIndex === 0 || this.currentTurnIndex < (this.currentTurnIndex - 1)) {
            this.round++;
            gameState.addMessage(`⚔️ Round ${this.round} begins!`, 'warning');
            gameState.set('combat.round', this.round);
        }

        // Start next turn
        this.startTurn();
    }

    /**
     * End combat
     */
    endCombat(result) {
        this.active = false;

        if (result === 'victory') {
            gameState.addMessage('🎉 Victory! All enemies defeated!', 'success');

            // Award XP
            const xpGained = this.calculateXPReward();
            gameState.addMessage(`+${xpGained} XP`, 'success');

            // TODO: Add XP to character

            // Notify quest system of kills
            if (window.questManager) {
                const playerPos = gameState.get('world.currentLocation');
                this.enemyCombatants.forEach(enemy => {
                    if (enemy.hp <= 0) {
                        // Get creature type ID (race.id or monster type)
                        const creatureId = enemy.character.race?.id || enemy.character.type || 'unknown';
                        window.questManager.onCreatureKilled(creatureId, playerPos);
                    }
                });
            }

            // Return to exploration after delay
            gameState.set('combat', null);
            setTimeout(() => {
                gameState.set('ui.currentScreen', 'game');
            }, 2000);
        } else if (result === 'defeat') {
            gameState.addMessage('💀 You have been defeated...', 'error');
            gameState.addMessage('🎮 Game Over', 'error');

            // Show game over screen
            gameState.set('combat', null);
            setTimeout(() => {
                this.showGameOver();
            }, 2000);
        } else if (result === 'fled') {
            gameState.addMessage('🏃 You have escaped from combat!', 'warning');

            // Return to exploration after delay
            gameState.set('combat', null);
            setTimeout(() => {
                gameState.set('ui.currentScreen', 'game');
            }, 2000);
        }
    }

    /**
     * Show game over screen
     */
    showGameOver() {
        // Show game over modal
        const modalOverlay = document.getElementById('modalOverlay');
        const modalContent = document.getElementById('modalContent');

        if (modalOverlay && modalContent) {
            modalContent.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <h2 style="color: var(--danger-color); font-size: 3rem; margin-bottom: 20px;">💀 GAME OVER 💀</h2>
                    <p style="font-size: 1.2rem; margin-bottom: 30px;">You have been defeated in combat.</p>
                    <p style="color: var(--text-secondary); margin-bottom: 40px;">Your adventure ends here.</p>
                    <button class="menu-btn" onclick="location.reload()" style="margin: 0 auto;">
                        Return to Main Menu
                    </button>
                </div>
            `;
            modalOverlay.classList.add('active');
        }
    }

    /**
     * Calculate XP reward
     */
    calculateXPReward() {
        let totalXP = 0;
        this.enemyCombatants.forEach(enemy => {
            // XP based on enemy CR
            const cr = enemy.character.cr || 0.25;
            const xp = this.getXPByCR(cr);
            totalXP += xp;
        });
        return totalXP;
    }

    /**
     * Get XP by CR (Challenge Rating)
     */
    getXPByCR(cr) {
        const xpTable = {
            0: 10, 0.125: 25, 0.25: 50, 0.5: 100,
            1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800
        };
        return xpTable[cr] || 100;
    }

    /**
     * Update game state with current combat data
     */
    updateGameState() {
        if (!this.active) return;

        gameState.set('combat', {
            active: true,
            round: this.round,
            currentTurn: this.getCurrentCombatant()?.id,
            combatants: this.combatants.map(c => c.toJSON())
        });
    }
}

/**
 * Combatant - Wrapper for characters in combat
 * Simplified without grid positioning
 */
class Combatant {
    constructor(character, team, id = null) {
        this.character = character;
        this.team = team; // 'player' or 'enemy'
        this.id = id || `${team}_${character.name}`;
        this.name = character.name;

        // Combat stats
        this.hp = character.currentHP || character.maxHP;
        this.maxHP = character.maxHP;
        this.ac = character.ac;
        this.initiative = 0;

        // Action economy (no movement)
        this.actions = {
            action: true,
            bonusAction: true,
            reaction: true
        };

        // Status
        this.conditions = [];
    }

    /**
     * Start turn - reset action economy
     */
    startTurn() {
        this.actions = {
            action: true,
            bonusAction: true,
            reaction: true
        };
    }

    /**
     * End turn
     */
    endTurn() {
        // Process end-of-turn effects here
    }

    /**
     * Take damage
     */
    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);

        // Update character
        if (this.team === 'player') {
            gameState.set('character.currentHP', this.hp);
        }
    }

    /**
     * Heal
     */
    heal(amount) {
        this.hp = Math.min(this.maxHP, this.hp + amount);

        if (this.team === 'player') {
            gameState.set('character.currentHP', this.hp);
        }
    }

    /**
     * Serialize to JSON
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            team: this.team,
            hp: this.hp,
            maxHP: this.maxHP,
            ac: this.ac,
            initiative: this.initiative,
            actions: { ...this.actions },
            conditions: [...this.conditions]
        };
    }
}

export { CombatManager, Combatant };
export default CombatManager;
