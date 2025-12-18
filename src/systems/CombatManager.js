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
     * @param {Object} attacker - Attacking combatant
     * @param {Object} defender - Defending combatant
     * @param {String} weaponSlot - 'mainHand' or 'offHand' (defaults to mainHand for backward compatibility)
     * @param {Object} options - { isCleaveAttack: boolean }
     */
    async attack(attacker, defender, weaponSlot = 'mainHand', options = {}) {
        // Handle backward compatibility: if weaponSlot is an object, it's actually options
        if (typeof weaponSlot === 'object') {
            options = weaponSlot;
            weaponSlot = 'mainHand';
        }

        const isCleaveAttack = options.isCleaveAttack || false;
        const isOffHandAttack = weaponSlot === 'offHand';

        // Determine which action type to check/consume
        const actionType = isOffHandAttack ? 'bonusAction' : 'action';

        console.log(`⚔️ ATTACK:`, attacker.name, 'attacks', defender.name,
            isCleaveAttack ? '(Cleave)' : '',
            isOffHandAttack ? '(Off-Hand)' : '(Main Hand)');

        if (!attacker.hasAction(actionType)) {
            console.log(`⚠️ No ${actionType} available!`);
            gameState.addMessage(`${attacker.name} has no ${actionType} available!`, 'error');
            return;
        }

        const handLabel = isOffHandAttack ? ' (off-hand)' : '';
        gameState.addMessage(`${attacker.name} attacks ${defender.name}${handLabel}!`, 'warning');

        // Get weapon from specified slot
        const weapon = attacker.character.equipment?.[weaponSlot];
        const isRanged = weapon?.weaponType === 'ranged';
        const isFinesse = weapon?.properties?.includes('finesse');

        let attackBonus = 0;

        // Determine which ability modifier to use
        if (isRanged) {
            // Ranged weapons use DEX
            attackBonus = attacker.character.abilityModifiers.dex;
        } else if (isFinesse) {
            // Finesse weapons use higher of STR or DEX
            attackBonus = Math.max(
                attacker.character.abilityModifiers.str,
                attacker.character.abilityModifiers.dex
            );
        } else if (weapon) {
            // Melee weapons use STR
            attackBonus = attacker.character.abilityModifiers.str;
        } else {
            // Unarmed uses STR
            attackBonus = attacker.character.abilityModifiers.str;
        }

        // Add proficiency bonus
        const proficiency = attacker.character.proficiencyBonus;

        // Ranged weapon bonus: +2 to hit (easier to aim from distance)
        let rangedBonus = 0;
        if (isRanged) {
            rangedBonus = 2;
            gameState.addMessage(`🏹 Ranged attack: +2 to hit`, 'info');
        }

        // Attack roll: d20 + ability mod + proficiency + ranged bonus
        const attackRollObj = rollD20();
        const attackRoll = attackRollObj.result;
        const attackTotal = attackRoll + attackBonus + proficiency + rangedBonus;

        const isCritical = RULES.combat.criticalHitRange.includes(attackRoll);
        const isCriticalMiss = RULES.combat.criticalMissRange.includes(attackRoll);

        // Build attack roll message
        let attackMsg = `Attack roll: ${attackRoll}`;
        if (attackBonus !== 0) attackMsg += ` + ${attackBonus} (ability)`;
        if (proficiency !== 0) attackMsg += ` + ${proficiency} (prof)`;
        if (rangedBonus !== 0) attackMsg += ` + ${rangedBonus} (ranged)`;
        attackMsg += ` = ${attackTotal} vs AC ${defender.ac}`;

        gameState.addMessage(attackMsg, 'info');

        if (isCriticalMiss) {
            gameState.addMessage(`💥 Critical miss!`, 'error');
            attacker.consumeAction(actionType);
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

            // Calculate damage bonus
            let damageBonus = attackBonus;

            // TWO-WEAPON FIGHTING: Off-hand attacks don't add ability modifier to damage
            // (unless character has Two-Weapon Fighting style - not yet implemented)
            if (isOffHandAttack) {
                damageBonus = 0;
                gameState.addMessage(`⚔️ Off-hand attack: No ability modifier to damage`, 'info');
            } else if (isRanged) {
                // Ranged weapons get -2 penalty
                damageBonus = Math.max(0, attackBonus - 2); // -2 damage for ranged, minimum 0
                gameState.addMessage(`🏹 Ranged penalty: -2 damage`, 'info');
            }

            const damageTotal = damageRoll + damageBonus;

            const damageMsg = damageBonus > 0
                ? `💥 Hit! ${damageTotal} damage (${damageRoll} + ${damageBonus})`
                : `💥 Hit! ${damageTotal} damage`;

            gameState.addMessage(
                damageMsg,
                attacker.team === 'player' ? 'success' : 'error'
            );

            // Apply damage
            defender.takeDamage(damageTotal);

            // Check if defender is defeated
            if (defender.hp <= 0) {
                gameState.addMessage(`💀 ${defender.name} is defeated!`, 'warning');
                this.handleDefeat(defender);
            }

            // WEAPON MASTERY: Cleave
            // If attacker hit with a melee weapon and has Cleave mastery, attack adjacent enemy
            if (!isCleaveAttack && !isRanged && this.hasWeaponMastery(attacker, weapon, 'cleave')) {
                const adjacentEnemy = this.getAdjacentEnemy(defender);
                if (adjacentEnemy && adjacentEnemy.hp > 0) {
                    gameState.addMessage(`⚔️ Cleave! ${attacker.name} attacks ${adjacentEnemy.name}!`, 'warning');

                    // Cleave attack: make attack roll, deal ability modifier damage (minimum 1)
                    const cleaveAttackRoll = rollD20().result;
                    const cleaveAttackTotal = cleaveAttackRoll + attackBonus + proficiency;

                    gameState.addMessage(
                        `Cleave attack roll: ${cleaveAttackRoll} + ${attackBonus} (ability) + ${proficiency} (prof) = ${cleaveAttackTotal} vs AC ${adjacentEnemy.ac}`,
                        'info'
                    );

                    if (cleaveAttackTotal >= adjacentEnemy.ac) {
                        const cleaveDamage = Math.max(1, attackBonus); // Ability modifier, minimum 1
                        gameState.addMessage(
                            `💥 Cleave hits! ${cleaveDamage} damage`,
                            attacker.team === 'player' ? 'success' : 'error'
                        );

                        adjacentEnemy.takeDamage(cleaveDamage);

                        if (adjacentEnemy.hp <= 0) {
                            gameState.addMessage(`💀 ${adjacentEnemy.name} is defeated by Cleave!`, 'warning');
                            this.handleDefeat(adjacentEnemy);
                        }
                    } else {
                        gameState.addMessage(`Cleave misses!`, 'info');
                    }
                }
            }
        } else {
            gameState.addMessage(`Miss!`, 'info');

            // WEAPON MASTERY: Graze
            // If attacker missed and has Graze mastery, deal ability modifier damage
            if (this.hasWeaponMastery(attacker, weapon, 'graze')) {
                const grazeDamage = Math.max(0, attackBonus); // Ability modifier, minimum 0

                if (grazeDamage > 0) {
                    gameState.addMessage(`⚔️ Graze! Despite missing, ${attacker.name} deals ${grazeDamage} damage!`, 'warning');

                    defender.takeDamage(grazeDamage);

                    if (defender.hp <= 0) {
                        gameState.addMessage(`💀 ${defender.name} is defeated by Graze!`, 'warning');
                        this.handleDefeat(defender);
                    }
                }
            }
        }

        attacker.consumeAction(actionType);
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

        combatant.consumeAction('action');
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
     * Check if combatant has a specific weapon mastery
     * @param {Combatant} combatant
     * @param {Object} weapon - Equipped weapon
     * @param {String} masteryId - Mastery to check for (e.g., 'cleave')
     * @returns {Boolean}
     */
    hasWeaponMastery(combatant, weapon, masteryId) {
        if (!combatant.character.weaponMasteries) return false;
        if (!weapon) return false;

        // Check if character has this mastery
        return combatant.character.weaponMasteries.includes(masteryId);
    }

    /**
     * Get adjacent enemy for Cleave mastery
     * @param {Combatant} defender - The enemy that was just hit
     * @returns {Combatant|null} - The adjacent enemy (next in enemy list)
     */
    getAdjacentEnemy(defender) {
        // Parse enemy index from ID (e.g., "enemy_0" → 0)
        const match = defender.id.match(/enemy_(\d+)/);
        if (!match) return null;

        const currentIndex = parseInt(match[1]);
        const nextIndex = currentIndex + 1;
        const nextId = `enemy_${nextIndex}`;

        // Find the next enemy
        const adjacentEnemy = this.enemyCombatants.find(c => c.id === nextId);

        return adjacentEnemy || null;
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

        // Action economy (counts per turn)
        this.actions = {
            action: 1,
            bonusAction: 1,
            reaction: 1
        };

        this.maxActions = {
            action: 1,
            bonusAction: 1,
            reaction: 1
        };

        // Status
        this.conditions = [];
    }

    /**
     * Start turn - reset action economy
     */
    startTurn() {
        this.actions = {
            action: this.maxActions.action,
            bonusAction: this.maxActions.bonusAction,
            reaction: this.maxActions.reaction
        };
    }

    /**
     * Check if combatant has an action available
     */
    hasAction(actionType = 'action') {
        return this.actions[actionType] > 0;
    }

    /**
     * Consume an action
     */
    consumeAction(actionType = 'action') {
        if (this.actions[actionType] > 0) {
            this.actions[actionType]--;
            return true;
        }
        return false;
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
