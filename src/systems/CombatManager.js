/**
 * Combat Manager
 * Handles turn-based tactical combat following D&D 5e rules
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
        this.grid = null;

        // Combat state
        this.playerCombatant = null;
        this.enemyCombatants = [];

        console.log('⚔️ Combat Manager initialized');
    }

    /**
     * Start combat encounter
     * @param {Object} player - Player character
     * @param {Array} enemies - Array of enemy characters
     * @param {Object} battlefield - Battlefield configuration
     */
    async startCombat(player, enemies, battlefield = {}) {
        console.log('⚔️ Starting combat encounter!');

        this.active = true;
        this.round = 1;
        this.combatants = [];
        this.turnOrder = [];

        // Create battlefield grid
        const gridSize = battlefield.size || { width: 12, height: 12 };
        this.grid = new CombatGrid(gridSize.width, gridSize.height);

        // Create player combatant
        this.playerCombatant = new Combatant(player, 'player');
        this.combatants.push(this.playerCombatant);

        // Create enemy combatants
        this.enemyCombatants = enemies.map((enemy, index) => {
            const combatant = new Combatant(enemy, 'enemy', `enemy_${index}`);
            this.combatants.push(combatant);
            return combatant;
        });

        // Place combatants on grid
        this.placeCombatants();

        // Roll initiative
        this.rollInitiative();

        // Update game state
        gameState.set('combat', {
            active: true,
            round: this.round,
            currentTurn: this.getCurrentCombatant()?.id,
            combatants: this.combatants.map(c => c.toJSON()),
            grid: this.grid.toJSON()
        });

        // Add combat start messages
        gameState.addMessage(`⚔️ Combat begins! Round ${this.round}`, 'warning');
        gameState.addMessage(`Turn order: ${this.turnOrder.map(c => c.name).join(' → ')}`, 'info');

        // Start first turn
        this.startTurn();

        return this;
    }

    /**
     * Place combatants on the grid
     */
    placeCombatants() {
        // Place player on left side
        const playerX = 2;
        const playerY = Math.floor(this.grid.height / 2);
        this.grid.placeCombatant(this.playerCombatant, playerX, playerY);

        // Place enemies on right side
        this.enemyCombatants.forEach((enemy, index) => {
            const enemyX = this.grid.width - 3;
            const enemyY = 3 + (index * 2);
            this.grid.placeCombatant(enemy, enemyX, Math.min(enemyY, this.grid.height - 2));
        });
    }

    /**
     * Roll initiative for all combatants
     */
    rollInitiative() {
        this.combatants.forEach(combatant => {
            const roll = rollD20();
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
        gameState.set('combat.currentTurn', combatant.id);

        // If it's an enemy turn, execute AI
        if (combatant.team === 'enemy') {
            console.log('🤖 Enemy turn - executing AI in 500ms');
            setTimeout(() => this.executeEnemyAI(combatant), 500);
        } else {
            console.log('👤 Player turn - waiting for input');
        }
    }

    /**
     * Execute enemy AI turn
     */
    async executeEnemyAI(combatant) {
        console.log(`⚔️ AI executing turn for ${combatant.name}`);
        gameState.addMessage(`${combatant.name} is thinking...`, 'info');

        // Simple AI: Move toward player and attack if in range
        const playerPos = this.grid.getCombatantPosition(this.playerCombatant);
        const enemyPos = this.grid.getCombatantPosition(combatant);

        console.log(`Player pos:`, playerPos, `Enemy pos:`, enemyPos);

        if (!playerPos || !enemyPos) {
            console.log('⚠️ Missing position data, ending turn');
            this.endTurn();
            return;
        }

        // Calculate distance
        const distance = Math.abs(playerPos.x - enemyPos.x) + Math.abs(playerPos.y - enemyPos.y);
        console.log(`Distance to player: ${distance}`);

        // If adjacent, attack
        if (distance <= 1) {
            console.log(`Enemy attacking player!`);
            await this.attack(combatant, this.playerCombatant);
        } else {
            // Move toward player
            const dx = playerPos.x > enemyPos.x ? 1 : playerPos.x < enemyPos.x ? -1 : 0;
            const dy = playerPos.y > enemyPos.y ? 1 : playerPos.y < enemyPos.y ? -1 : 0;

            console.log(`Enemy moving by dx=${dx}, dy=${dy}`);
            const moved = this.move(combatant, enemyPos.x + dx, enemyPos.y + dy);
            console.log(`Move result: ${moved}`);

            // Try to attack after moving if now adjacent
            const newPos = this.grid.getCombatantPosition(combatant);
            const newDistance = Math.abs(playerPos.x - newPos.x) + Math.abs(playerPos.y - newPos.y);

            console.log(`New distance after move: ${newDistance}`);
            if (newDistance <= 1 && combatant.actions.action) {
                console.log(`Enemy attacking after move!`);
                await this.attack(combatant, this.playerCombatant);
            }
        }

        // Force update game state
        this.updateGameState();

        // End turn after a delay
        setTimeout(() => {
            console.log(`Enemy turn ending`);
            this.endTurn();
        }, 1000);
    }

    /**
     * Move a combatant
     */
    move(combatant, toX, toY) {
        const fromPos = this.grid.getCombatantPosition(combatant);
        if (!fromPos) return false;

        const distance = Math.abs(toX - fromPos.x) + Math.abs(toY - fromPos.y);
        const speed = combatant.character.speed / RULES.combat.gridSize; // Convert feet to squares

        if (distance > combatant.actions.movement || distance > speed) {
            gameState.addMessage(`${combatant.name} doesn't have enough movement!`, 'error');
            return false;
        }

        const success = this.grid.moveCombatant(combatant, toX, toY);

        if (success) {
            combatant.actions.movement -= distance;
            gameState.addMessage(`${combatant.name} moves to (${toX}, ${toY})`, 'info');
            this.updateGameState();
            return true;
        } else {
            gameState.addMessage(`${combatant.name} cannot move there!`, 'error');
            return false;
        }
    }

    /**
     * Perform an attack
     */
    async attack(attacker, defender) {
        console.log(`⚔️ ATTACK METHOD CALLED:`, attacker.name, 'attacks', defender.name);
        console.log('Attacker:', attacker);
        console.log('Defender:', defender);

        if (!attacker.actions.action) {
            console.log('⚠️ No action available!');
            gameState.addMessage(`${attacker.name} has no action available!`, 'error');
            return;
        }

        console.log('✅ Action available, proceeding with attack');
        gameState.addMessage(`${attacker.name} attacks ${defender.name}!`, 'warning');

        // Attack roll: d20 + STR/DEX mod + proficiency
        const attackRoll = rollD20();
        const abilityMod = attacker.character.abilityModifiers.str; // Assuming melee
        const proficiency = attacker.character.proficiencyBonus;
        const attackTotal = attackRoll + abilityMod + proficiency;

        const isCritical = RULES.combat.criticalHitRange.includes(attackRoll);
        const isCriticalMiss = RULES.combat.criticalMissRange.includes(attackRoll);

        gameState.addMessage(
            `Attack roll: ${attackRoll} + ${abilityMod} + ${proficiency} = ${attackTotal} vs AC ${defender.ac}`,
            'info'
        );

        if (isCriticalMiss) {
            gameState.addMessage(`💥 Critical miss!`, 'error');
            attacker.actions.action = false;
            return;
        }

        if (isCritical || attackTotal >= defender.ac) {
            // Hit! Roll damage
            let damageRoll = rollDice(8); // d8 longsword
            if (isCritical) {
                damageRoll += rollDice(8); // Double dice on crit
                gameState.addMessage(`⭐ Critical hit!`, 'success');
            }
            const damageTotal = damageRoll + abilityMod;

            gameState.addMessage(
                `💥 Hit! ${damageTotal} damage (${damageRoll} + ${abilityMod})`,
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
     * Handle combatant defeat
     */
    handleDefeat(combatant) {
        // Remove from grid
        this.grid.removeCombatant(combatant);

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

        // Move to next turn
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.filter(c => c.hp > 0).length;

        // If we've cycled back to start, increment round
        if (this.currentTurnIndex === 0) {
            this.round++;
            gameState.addMessage(`⚔️ Round ${this.round} begins!`, 'warning');
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
        } else if (result === 'defeat') {
            gameState.addMessage('💀 You have been defeated...', 'error');
            // TODO: Handle player death
        }

        gameState.set('combat', null);

        // Return to exploration after delay
        setTimeout(() => {
            gameState.set('ui.currentScreen', 'game');
        }, 2000);
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
            combatants: this.combatants.map(c => c.toJSON()),
            grid: this.grid.toJSON()
        });
    }
}

/**
 * Combatant - Wrapper for characters in combat
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

        // Action economy
        this.actions = {
            action: true,
            bonusAction: true,
            movement: character.speed / RULES.combat.gridSize,
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
            movement: this.character.speed / RULES.combat.gridSize,
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

/**
 * Combat Grid - Manages battlefield positioning
 */
class CombatGrid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = Array(height).fill(null).map(() => Array(width).fill(null));
        this.combatantPositions = new Map(); // combatant -> {x, y}
    }

    /**
     * Place combatant on grid
     */
    placeCombatant(combatant, x, y) {
        if (!this.isValidPosition(x, y) || this.grid[y][x]) {
            return false;
        }

        this.grid[y][x] = combatant;
        this.combatantPositions.set(combatant, { x, y });
        return true;
    }

    /**
     * Move combatant
     */
    moveCombatant(combatant, toX, toY) {
        const fromPos = this.combatantPositions.get(combatant);
        if (!fromPos || !this.isValidPosition(toX, toY) || this.grid[toY][toX]) {
            return false;
        }

        // Clear old position
        this.grid[fromPos.y][fromPos.x] = null;

        // Set new position
        this.grid[toY][toX] = combatant;
        this.combatantPositions.set(combatant, { x: toX, y: toY });

        return true;
    }

    /**
     * Remove combatant from grid
     */
    removeCombatant(combatant) {
        const pos = this.combatantPositions.get(combatant);
        if (pos) {
            this.grid[pos.y][pos.x] = null;
            this.combatantPositions.delete(combatant);
        }
    }

    /**
     * Get combatant position
     */
    getCombatantPosition(combatant) {
        return this.combatantPositions.get(combatant);
    }

    /**
     * Check if position is valid
     */
    isValidPosition(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    /**
     * Get combatants in range
     */
    getCombatantsInRange(combatant, range) {
        const pos = this.combatantPositions.get(combatant);
        if (!pos) return [];

        const inRange = [];
        for (const [otherCombatant, otherPos] of this.combatantPositions) {
            if (otherCombatant === combatant) continue;

            const distance = Math.abs(pos.x - otherPos.x) + Math.abs(pos.y - otherPos.y);
            if (distance <= range) {
                inRange.push({ combatant: otherCombatant, distance });
            }
        }

        return inRange;
    }

    /**
     * Serialize to JSON
     */
    toJSON() {
        return {
            width: this.width,
            height: this.height,
            positions: Array.from(this.combatantPositions.entries()).map(([combatant, pos]) => ({
                id: combatant.id,
                x: pos.x,
                y: pos.y
            }))
        };
    }
}

export { CombatManager, Combatant, CombatGrid };
export default CombatManager;
