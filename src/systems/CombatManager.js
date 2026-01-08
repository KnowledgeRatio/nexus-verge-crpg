/**
 * Combat Manager - Simplified Non-Grid Turn-Based Combat
 * Follows D&D 5e SRD 5.2.1 2024 rules
 */

import { gameState } from '../core/GameState.js';
import { RULES } from '../core/rulesEngine.js';
import { rollDice, rollD20 } from '../utils/dice.js';
import { SeededRandom } from '../utils/rng.js';

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

        // Weapon mastery data (lazy-loaded from JSON)
        this.weaponMasteryAssignments = this.getFallbackWeaponMasteryAssignments();
        this.weaponMasteryProficiencyRequired = true;
        this.weaponMasteryDataLoaded = false;

        console.log('⚔️ Combat Manager initialized');
    }

    /**
     * Start combat encounter
     * @param {Object} player - Player character
     * @param {Array} enemies - Array of enemy characters
     */
    async startCombat(player, enemies) {
        // Ensure weapon mastery data is loaded before applying effects
        await this.loadWeaponMasteryData();
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
        const enemyNames = this.enemyCombatants.map(e => e.name).join(', ');
        gameState.addMessage(`⚔️ You encounter: ${enemyNames}!`, 'warning');
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

        // Process round-based conditions on THIS combatant
        combatant.conditions.forEach(condition => {
            if (condition.duration === 'rounds') {
                condition.roundsRemaining--;
                if (condition.roundsRemaining <= 0) {
                    combatant.removeCondition(condition.type, true);
                    gameState.addMessage(`${combatant.name}'s ${condition.type} condition ends!`, 'info');
                }
            }
        });

        // Process conditions with 'untilStartOfTurn' duration where this combatant was the applier
        this.combatants.forEach(target => {
            // Find all conditions applied by this combatant that expire at their turn start
            const conditionsToRemove = target.conditions.filter(
                c => c.duration === 'untilStartOfTurn' && c.appliedBy === combatant.id
            );

            conditionsToRemove.forEach(condition => {
                // Restore AC if slowed
                if (condition.type === 'slowed') {
                    target.ac -= condition.value; // value is -1, so -= -1 = +1
                    gameState.addMessage(`${target.name}'s Slow effect ends (AC restored)`, 'info');
                }

                // Remove the condition
                target.removeCondition(condition.type, true); // ignoreImmunity = true
            });

            // LEGACY: Clear old masteryEffects.slowedBy (can be removed once fully migrated)
            if (target.masteryEffects.slowedBy === combatant.id) {
                target.masteryEffects.slowedBy = null;
                target.ac += 1;
                gameState.addMessage(`${target.name}'s Slow effect ends (AC restored) [LEGACY]`, 'info');
            }
        });

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
     * @param {Object} options - { isCleaveAttack: boolean, consumeAction: boolean }
     */
    async attack(attacker, defender, weaponSlot = 'mainHand', options = {}) {
        // Handle backward compatibility: if weaponSlot is an object, it's actually options
        if (typeof weaponSlot === 'object') {
            options = weaponSlot;
            weaponSlot = 'mainHand';
        }

        const isCleaveAttack = options.isCleaveAttack || false;
        const isOffHandAttack = weaponSlot === 'offHand';
        const shouldConsumeAction = options.consumeAction !== false; // Default to true

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

        // Get weapon from specified slot
        const weapon = attacker.character.equipment?.[weaponSlot];
        const isRanged = weapon?.weaponType === 'ranged';
        const isFinesse = weapon?.properties?.includes('finesse');

        // PUSH MASTERY RESTRICTION: Cannot make melee attacks while pushed
        if (attacker.hasCondition('pushed') && !isRanged) {
            console.log(`⚠️ ${attacker.name} is pushed and cannot make melee attacks!`);
            gameState.addMessage(`💨 ${attacker.name} is pushed away! Cannot make melee attacks! Use ranged weapons, spells, or abilities instead!`, 'error');
            return;
        }

        const handLabel = isOffHandAttack ? ' (off-hand)' : '';
        gameState.addMessage(`${attacker.name} attacks ${defender.name}${handLabel}!`, 'warning');

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

        // Check for advantage/disadvantage from mastery effects
        let hasAdvantage = false;
        let hasDisadvantage = false;

        // Dodge: Defender is dodging - attacker has disadvantage
        if (defender.hasCondition('dodging')) {
            hasDisadvantage = true;
            gameState.addMessage(`⚔️ ${attacker.name} has disadvantage (${defender.name} is dodging)! 🛡️`, 'warning');
        }

        // Prone condition: Attacker has disadvantage on their own attacks while prone
        if (attacker.hasCondition('prone')) {
            hasDisadvantage = true;
            gameState.addMessage(`⚔️ ${attacker.name} has disadvantage (prone)! 🔻`, 'warning');
        }

        // Sap mastery: Attacker has disadvantage if sapped (one-time use, then cleared)
        if (attacker.hasCondition('sapped')) {
            hasDisadvantage = true;
            attacker.removeCondition('sapped', true); // Clear after use (ignoreImmunity = true)
            gameState.addMessage(`⚔️ ${attacker.name} has disadvantage (Sapped)! 💫`, 'warning');
        }

        // Vex mastery: Attacker has advantage vs vexed target (one-time use, then cleared)
        const vexCondition = attacker.getCondition('vexed');
        if (vexCondition && vexCondition.value === defender.id) {
            hasAdvantage = true;
            attacker.removeCondition('vexed', true); // Clear after use (ignoreImmunity = true)
            gameState.addMessage(`⚔️ ${attacker.name} has advantage (Vex)! ⚡`, 'success');
        }

        // LEGACY: Vex mastery via masteryEffects (backwards compatibility)
        if (attacker.masteryEffects.vexed === defender.id) {
            hasAdvantage = true;
            attacker.masteryEffects.vexed = null; // Clear after use
            gameState.addMessage(`⚔️ ${attacker.name} has advantage (Vex)! [LEGACY]`, 'success');
        }

        // Prone condition: Melee attackers have advantage vs prone targets
        if (defender.hasCondition('prone') && !isRanged) {
            hasAdvantage = true;
            gameState.addMessage(`⚔️ ${attacker.name} has advantage (target prone)! 🔻`, 'success');
        }

        // LEGACY: Prone condition via masteryEffects (backwards compatibility)
        if (defender.masteryEffects.prone && !isRanged) {
            hasAdvantage = true;
            gameState.addMessage(`⚔️ ${attacker.name} has advantage (target prone)! [LEGACY]`, 'success');
        }

        // Attack roll: d20 + ability mod + proficiency + ranged bonus
        let attackRollObj = rollD20();
        let attackRoll = attackRollObj.result;

        // Apply advantage/disadvantage
        if (hasAdvantage && !hasDisadvantage) {
            const secondRoll = rollD20().result;
            attackRoll = Math.max(attackRoll, secondRoll);
            gameState.addMessage(`🎲 Advantage: Rolled ${attackRollObj.result} and ${secondRoll}, using ${attackRoll}`, 'info');
        } else if (hasDisadvantage && !hasAdvantage) {
            const secondRoll = rollD20().result;
            attackRoll = Math.min(attackRoll, secondRoll);
            gameState.addMessage(`🎲 Disadvantage: Rolled ${attackRollObj.result} and ${secondRoll}, using ${attackRoll}`, 'info');
        }

        const attackTotal = attackRoll + attackBonus + proficiency;

        const isCritical = RULES.combat.criticalHitRange.includes(attackRoll);
        const isCriticalMiss = RULES.combat.criticalMissRange.includes(attackRoll);

        // Build attack roll message
        let attackMsg = `Attack roll: ${attackRoll}`;
        if (attackBonus !== 0) attackMsg += ` + ${attackBonus} (ability)`;
        if (proficiency !== 0) attackMsg += ` + ${proficiency} (prof)`;
        attackMsg += ` = ${attackTotal} vs AC ${defender.ac}`;

        gameState.addMessage(attackMsg, 'info');

        if (isCriticalMiss) {
            gameState.addMessage(`💥 Critical miss!`, 'error');

            // Floating combat text for critical miss
            if (window.game) {
                window.game.showFloatingCombatText(defender.id, 'CRITICAL MISS!', 'miss');
            }

            if (shouldConsumeAction) {
                attacker.consumeAction(actionType);
            }
            this.updateGameState();
            return;
        }

        if (isCritical || attackTotal >= defender.ac) {
            // Hit! Roll damage
            let damageDice = 8; // Default d8
            if (weapon?.damage?.dice) {
                damageDice = parseInt(weapon.damage.dice.split('d')[1]) || 8;
            }

            // Roll damage dice
            const firstRoll = rollDice(1, damageDice);
            let damageRoll = firstRoll;
            let secondRoll = 0;

            if (isCritical) {
                secondRoll = rollDice(1, damageDice); // Double dice on crit
                damageRoll += secondRoll;
                gameState.addMessage(`⭐ Critical hit!`, 'success');
            }

            // Calculate damage bonus
            let damageBonus = attackBonus;

            // TWO-WEAPON FIGHTING: Off-hand attacks don't add ability modifier to damage
            // (unless character has Two-Weapon Fighting style - not yet implemented)
            if (isOffHandAttack) {
                damageBonus = 0;
                gameState.addMessage(`⚔️ Off-hand attack: No ability modifier to damage`, 'info');
            }

            const damageTotal = damageRoll + damageBonus;

            // Build detailed damage message
            let damageMsg = '💥 Hit! ';
            if (isCritical) {
                // Critical: show both dice rolls
                damageMsg += `Damage: ${firstRoll} + ${secondRoll} (crit)`;
                if (damageBonus !== 0) {
                    damageMsg += ` + ${damageBonus} (ability)`;
                }
                damageMsg += ` = ${damageTotal}`;
            } else {
                // Normal hit: show single die roll
                damageMsg += `Damage: ${firstRoll}`;
                if (damageBonus !== 0) {
                    damageMsg += ` + ${damageBonus} (ability)`;
                }
                damageMsg += ` = ${damageTotal}`;
            }

            gameState.addMessage(
                damageMsg,
                attacker.team === 'player' ? 'success' : 'error'
            );

            // Floating combat text for damage
            if (window.game) {
                const floatingText = `-${damageTotal}`;
                const floatingType = isCritical ? 'critical' : 'damage';
                window.game.showFloatingCombatText(defender.id, floatingText, floatingType);
            }

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
                        const cleaveMsg = attackBonus >= 1
                            ? `💢 Cleave hits! Damage: ${attackBonus} (ability, min 1) = ${cleaveDamage}`
                            : `💢 Cleave hits! Damage: 1 (minimum)`;
                        gameState.addMessage(
                            cleaveMsg,
                            attacker.team === 'player' ? 'success' : 'error'
                        );

                        // Floating combat text for Cleave
                        if (window.game) {
                            window.game.showFloatingCombatText(adjacentEnemy.id, `-${cleaveDamage} CLEAVE`, 'damage');
                        }

                        adjacentEnemy.takeDamage(cleaveDamage);

                        if (adjacentEnemy.hp <= 0) {
                            gameState.addMessage(`💀 ${adjacentEnemy.name} is defeated by Cleave!`, 'warning');
                            this.handleDefeat(adjacentEnemy);
                        }
                    } else {
                        gameState.addMessage(`Cleave misses!`, 'info');

                        // Floating combat text for Cleave miss
                        if (window.game) {
                            window.game.showFloatingCombatText(adjacentEnemy.id, 'MISS', 'miss');
                        }
                    }
                }
            }

            // WEAPON MASTERY: Nick
            // If attacker has Nick mastery with main hand weapon and has Light weapon in off-hand,
            // make additional attack with off-hand (no ability modifier to damage)
            if (!isOffHandAttack && weaponSlot === 'mainHand' &&
                this.hasWeaponMastery(attacker, weapon, 'nick')) {

                const offHandWeapon = attacker.character.equipment?.offHand;
                const isOffHandLight = offHandWeapon?.properties?.includes('light');

                if (offHandWeapon && isOffHandLight) {
                    gameState.addMessage(`⚔️ Nick! ${attacker.name} makes additional attack with ${offHandWeapon.name}!`, 'warning');

                    // Nick attack: Same attack roll logic but NO ability modifier to damage
                    const nickAttackRoll = rollD20().result;
                    const nickAttackTotal = nickAttackRoll + attackBonus + proficiency;

                    gameState.addMessage(
                        `Nick attack roll: ${nickAttackRoll} + ${attackBonus} (ability) + ${proficiency} (prof) = ${nickAttackTotal} vs AC ${defender.ac}`,
                        'info'
                    );

                    if (nickAttackTotal >= defender.ac) {
                        let nickDamageDice = 8; // Default d8
                        if (offHandWeapon?.damage?.dice) {
                            nickDamageDice = parseInt(offHandWeapon.damage.dice.split('d')[1]) || 8;
                        }

                        const nickDamageRoll = rollDice(1, nickDamageDice);
                        // Nick: NO ability modifier to damage (unless negative)
                        const nickDamageBonus = Math.min(0, attackBonus); // Only negative modifiers apply
                        const nickDamageTotal = nickDamageRoll + nickDamageBonus;

                        let nickMsg = `💢 Nick hits! Damage: ${nickDamageRoll}`;
                        if (nickDamageBonus < 0) {
                            nickMsg += ` + ${nickDamageBonus} (negative ability)`;
                        } else {
                            nickMsg += ` (no ability modifier)`;
                        }
                        nickMsg += ` = ${nickDamageTotal}`;

                        gameState.addMessage(
                            nickMsg,
                            attacker.team === 'player' ? 'success' : 'error'
                        );

                        // Floating combat text for Nick
                        if (window.game) {
                            window.game.showFloatingCombatText(defender.id, `-${nickDamageTotal} NICK`, 'damage');
                        }

                        defender.takeDamage(nickDamageTotal);

                        if (defender.hp <= 0) {
                            gameState.addMessage(`💀 ${defender.name} is defeated by Nick!`, 'warning');
                            this.handleDefeat(defender);
                        }
                    } else {
                        gameState.addMessage(`Nick misses!`, 'info');

                        // Floating combat text for Nick miss
                        if (window.game) {
                            window.game.showFloatingCombatText(defender.id, 'MISS', 'miss');
                        }
                    }
                }
            }
        } else {
            gameState.addMessage(`Miss!`, 'info');

            // Floating combat text for regular miss
            if (window.game) {
                window.game.showFloatingCombatText(defender.id, 'MISS', 'miss');
            }

            // WEAPON MASTERY: Graze
            // If attacker missed and has Graze mastery, deal ability modifier damage
            if (this.hasWeaponMastery(attacker, weapon, 'graze')) {
                const grazeDamage = Math.max(0, attackBonus); // Ability modifier, minimum 0

                if (grazeDamage > 0) {
                    gameState.addMessage(
                        `💢 Graze! Despite missing, ${attacker.name} deals damage: ${attackBonus} (ability) = ${grazeDamage}`,
                        'warning'
                    );

                    // Floating combat text for Graze
                    if (window.game) {
                        window.game.showFloatingCombatText(defender.id, `-${grazeDamage} GRAZE`, 'damage');
                    }

                    defender.takeDamage(grazeDamage);

                    if (defender.hp <= 0) {
                        gameState.addMessage(`💀 ${defender.name} is defeated by Graze!`, 'warning');
                        this.handleDefeat(defender);
                    }
                }
            }
        }

        // WEAPON MASTERY: Sap (onHit)
        // Target has disadvantage on next attack roll (one-time use, then clears)
        if (attackTotal >= defender.ac && this.hasWeaponMastery(attacker, weapon, 'sap')) {
            const added = defender.addCondition('sapped', 'combat', attacker.id, {
                value: null,
                isBuff: false,
                curable: true,
                icon: '💫'
            });

            if (added) {
                gameState.addMessage(`⚔️ Sap! ${defender.name} has disadvantage on next attack! 💫`, 'warning');

                // Floating combat text for Sap condition (delayed 300ms to appear after damage)
                if (window.game) {
                    window.game.showFloatingCombatText(defender.id, 'SAPPED! 💫', 'condition', 300);
                }
            } else {
                gameState.addMessage(`⚔️ ${defender.name} is already sapped!`, 'info');
            }
        }

        // WEAPON MASTERY: Slow (onHit)
        // -1 AC until start of attacker's next turn (does not stack)
        if (attackTotal >= defender.ac && this.hasWeaponMastery(attacker, weapon, 'slow')) {
            const added = defender.addCondition('slowed', 'untilStartOfTurn', attacker.id, {
                value: -1,
                isBuff: false,
                curable: false,
                icon: '🐌'
            });

            if (added) {
                defender.ac -= 1;
                gameState.addMessage(`⚔️ Slow! ${defender.name}'s AC reduced by 1! 🐌`, 'warning');

                // Floating combat text for Slow condition (delayed 300ms to appear after damage)
                if (window.game) {
                    window.game.showFloatingCombatText(defender.id, 'SLOWED! 🐌', 'condition', 300);
                }
            } else {
                gameState.addMessage(`⚔️ Slow effect already active on ${defender.name}`, 'info');
            }
        }

        // WEAPON MASTERY: Topple (onHit)
        // Force CON save or knock prone (disadvantage on attacks, advantage for melee attackers)
        if (attackTotal >= defender.ac && this.hasWeaponMastery(attacker, weapon, 'topple')) {
            const saveDC = 8 + proficiency + attackBonus;
            const saveRoll = rollD20().result;
            const saveTotal = saveRoll + defender.character.abilityModifiers.con;

            gameState.addMessage(
                `⚔️ Topple! ${defender.name} must make CON save DC ${saveDC}...`,
                'warning'
            );
            gameState.addMessage(
                `CON save: ${saveRoll} + ${defender.character.abilityModifiers.con} = ${saveTotal}`,
                'info'
            );

            if (saveTotal < saveDC) {
                const added = defender.addCondition('prone', 'rounds', attacker.id, {
                    value: null,
                    roundsRemaining: 1,
                    isBuff: false,
                    curable: true,
                    icon: '🔻'
                });

                if (added) {
                    gameState.addMessage(`💥 ${defender.name} is knocked prone! 🔻`, 'error');

                    // Floating combat text for Topple condition (delayed 300ms to appear after damage)
                    if (window.game) {
                        window.game.showFloatingCombatText(defender.id, 'PRONE! 🔻', 'condition', 300);
                    }
                } else {
                    gameState.addMessage(`💥 ${defender.name} is already prone!`, 'info');
                }
            } else {
                gameState.addMessage(`${defender.name} resists being knocked prone.`, 'info');
            }
        }

        // WEAPON MASTERY: Vex (onHit)
        // Attacker has advantage on next attack vs this target (stores target ID as value, one-time use)
        if (attackTotal >= defender.ac && this.hasWeaponMastery(attacker, weapon, 'vex')) {
            const added = attacker.addCondition('vexed', 'combat', attacker.id, {
                value: defender.id,      // Store target's ID
                isBuff: true,            // Positive effect for attacker
                curable: false,          // Cannot be removed by spells
                icon: '⚡'
            });

            if (added) {
                gameState.addMessage(`⚔️ Vex! ${attacker.name} has advantage on next attack vs ${defender.name}! ⚡`, 'success');
            } else {
                gameState.addMessage(`⚔️ ${attacker.name} is already vexed!`, 'info');
            }
        }

        // WEAPON MASTERY: Push (onHit)
        // Push target 10 feet away - cannot make melee attacks on their next turn
        if (attackTotal >= defender.ac && this.hasWeaponMastery(attacker, weapon, 'push')) {
            const targetSize = defender.character.size || 'Medium';
            const canPush = ['Tiny', 'Small', 'Medium', 'Large'].includes(targetSize);

            if (canPush) {
                const added = defender.addCondition('pushed', 'untilEndOfTurn', defender.id, {
                    value: null,
                    isBuff: false,
                    curable: false,
                    icon: '💨'
                });

                if (added) {
                    gameState.addMessage(`⚔️ Push! ${defender.name} is pushed away! Cannot make melee attacks next turn! 💨`, 'warning');

                    // Floating combat text for Push condition (delayed 300ms to appear after damage)
                    if (window.game) {
                        window.game.showFloatingCombatText(defender.id, 'PUSHED! 💨', 'condition', 300);
                    }
                } else {
                    gameState.addMessage(`⚔️ ${defender.name} is already pushed!`, 'info');
                }
            } else {
                gameState.addMessage(`${defender.name} is too large to push!`, 'info');
            }
        }

        if (shouldConsumeAction) {
            attacker.consumeAction(actionType);
        }
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
     * Take the Dodge action
     * D&D 5e SRD 5.2.1 2024: Until the start of your next turn, any attack roll made against you has disadvantage,
     * and you make Dexterity saving throws with advantage (if not hidden from attacker)
     */
    dodge(combatant) {
        if (!combatant.actions.action) {
            gameState.addMessage(`${combatant.name} has no action available!`, 'error');
            return;
        }

        gameState.addMessage(
            `🛡️ ${combatant.name} takes the Dodge action, focusing entirely on avoiding attacks!`,
            combatant.team === 'player' ? 'success' : 'warning'
        );

        // Apply dodging condition until start of next turn
        combatant.addCondition('dodging', 'untilStartOfTurn', combatant.id, {
            value: null,
            isBuff: true,
            curable: false,
            icon: '🛡️'
        });

        // Floating combat text for Dodge buff
        if (window.game) {
            window.game.showFloatingCombatText(combatant.id, 'DODGING! 🛡️', 'buff');
        }

        gameState.addMessage(
            `Attackers have disadvantage until the start of ${combatant.name}'s next turn!`,
            'info'
        );

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

        // Reset combat movement warning flag
        if (window.game?.player) {
            window.game.player.shownCombatMovementWarning = false;
        }

        // Clean up all combat-only conditions and mastery effects
        this.combatants.forEach(combatant => {
            // Clean up conditions with 'combat' or 'untilStartOfTurn'/'untilEndOfTurn' duration
            // Note: 'rounds' duration conditions (like prone) are handled by auto-countdown and don't need explicit cleanup
            const conditionsToRemove = combatant.conditions.filter(c =>
                c.duration === 'combat' ||
                c.duration === 'untilStartOfTurn' ||
                c.duration === 'untilEndOfTurn'
            );

            conditionsToRemove.forEach(condition => {
                // Restore AC if slowed
                if (condition.type === 'slowed') {
                    combatant.ac -= condition.value; // value is -1, so -= -1 = +1
                }

                // Remove the condition
                combatant.removeCondition(condition.type, true); // ignoreImmunity = true
            });

            // LEGACY: Restore AC if slowed (old system)
            if (combatant.masteryEffects.slowedBy) {
                combatant.ac += 1;
                combatant.masteryEffects.slowedBy = null;
            }
            // Clear other temporary effects
            combatant.masteryEffects.sapped = false;
            combatant.masteryEffects.vexed = null;
            combatant.masteryEffects.prone = false;
        });

        if (result === 'victory') {
            gameState.addMessage('🎉 Victory! All enemies defeated!', 'success');

            const character = gameState.get('character');

            // Award XP
            const xpGained = this.calculateXPReward();
            character.xp += xpGained;
            gameState.addMessage(`+${xpGained} XP (${character.xp} total)`, 'success');

            // Check for level up (guard for deserialized plain objects)
            if (typeof character.checkLevelUp === 'function') {
                const leveledUp = character.checkLevelUp();
                if (leveledUp) {
                    gameState.addMessage(`🎉 Level Up! You are now level ${character.level}!`, 'success');
                }
            } else {
                console.warn('Character.checkLevelUp is missing; ensure character is properly rehydrated from save.');
            }

            // Generate loot from defeated enemies
            if (window.lootManager) {
                const worldSeed = gameState.get('seed');
                const rng = new SeededRandom(`${worldSeed}_combat_${Date.now()}`);

                // Ensure gold is a valid number before awarding more
                character.gold = Number(character.gold) || 0;

                let totalGold = 0;
                const allLootItems = [];

                for (const enemy of this.enemyCombatants) {
                    if (enemy.hp <= 0) {
                        const loot = window.lootManager.generateCombatLoot(
                            enemy.character,
                            character.level,
                            rng
                        );

                        if (loot.gold > 0 || loot.items.length > 0) {
                            totalGold += loot.gold;
                            allLootItems.push(...loot.items);

                            // Display loot message for this enemy
                            const itemNames = loot.items.map(i => i.name + (i.quantity > 1 ? ` (${i.quantity})` : '')).join(', ');
                            const lootMessage = `${enemy.name} dropped: ${loot.gold}g${itemNames ? ', ' + itemNames : ''}`;
                            gameState.addMessage(lootMessage, 'success');
                        }
                    }
                }

                // Add loot to character
                if (totalGold > 0) {
                    character.gold += totalGold;
                    gameState.set('character.gold', character.gold);
                }

                if (allLootItems.length > 0) {
                    character.inventory.push(...allLootItems);
                    gameState.set('character.inventory', character.inventory);
                }
            }

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

            // Update character state
            gameState.set('character', character);

            // Return to exploration after delay
            gameState.set('combat', null);
            setTimeout(() => {
                gameState.set('ui.currentScreen', 'game');
            }, 3000); // Extended to 3 seconds to show loot messages
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

        // Mastery must be assigned to this specific weapon
        const assignedMastery = this.weaponMasteryAssignments[weapon.id];
        if (!assignedMastery || assignedMastery !== masteryId) return false;

        // Character must actually know the mastery
        if (!combatant.character.weaponMasteries.includes(masteryId)) return false;

        // Honor proficiency requirement toggle from data
        if (this.weaponMasteryProficiencyRequired && !combatant.character.isProficientWithWeapon(weapon)) {
            return false;
        }

        return true;
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
     * Load weapon mastery assignments and proficiency rule from data file
     */
    async loadWeaponMasteryData() {
        if (this.weaponMasteryDataLoaded) return;

        try {
            const response = await fetch(`data/weaponMasteries.json?v=${Date.now()}`);
            const data = await response.json();

            const assignments = data.weaponMasteries?.weaponMasteryAssignments?.assignments;
            if (assignments) {
                this.weaponMasteryAssignments = assignments;
            }

            const profRequirement = data.weaponMasteries?.proficiencyRequirement?.enabled;
            this.weaponMasteryProficiencyRequired = profRequirement !== false; // default true

            this.weaponMasteryDataLoaded = true;
        } catch (error) {
            console.error('Failed to load weapon mastery data; using fallback map.', error);
            this.weaponMasteryAssignments = this.getFallbackWeaponMasteryAssignments();
            this.weaponMasteryProficiencyRequired = true;
            this.weaponMasteryDataLoaded = true;
        }
    }

    /**
     * Fallback weapon-to-mastery assignments (kept in sync with data/weaponMasteries.json)
     */
    getFallbackWeaponMasteryAssignments() {
        return {
            club: 'slow',
            dagger: 'nick',
            greatclub: 'push',
            handaxe: 'vex',
            javelin: 'slow',
            lightHammer: 'nick',
            mace: 'sap',
            quarterstaff: 'topple',
            sickle: 'nick',
            spear: 'sap',
            dart: 'vex',
            lightCrossbow: 'slow',
            shortbow: 'vex',
            sling: 'slow',
            battleaxe: 'topple',
            flail: 'sap',
            glaive: 'graze',
            greataxe: 'cleave',
            greatsword: 'graze',
            halberd: 'cleave',
            lance: 'topple',
            longsword: 'sap',
            maul: 'topple',
            morningstar: 'sap',
            pike: 'push',
            rapier: 'vex',
            scimitar: 'nick',
            shortsword: 'vex',
            trident: 'topple',
            warhammer: 'push',
            warpick: 'sap',
            whip: 'slow',
            blowgun: 'vex',
            handCrossbow: 'vex',
            heavyCrossbow: 'push',
            longbow: 'slow'
        };
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

        // Status conditions with structured tracking
        // Format: {
        //   type: string,           // e.g., 'slowed', 'poisoned', 'blessed', 'shielded'
        //   duration: string,       // 'untilStartOfTurn', 'untilEndOfTurn', 'rounds', 'combat', 'permanent'
        //   appliedBy: string,      // ID of combatant who applied this
        //   value: any,             // Effect value (e.g., -1 AC, +2 attack)
        //   roundsRemaining: number,// For 'rounds' duration
        //   isBuff: boolean,        // true = buff (positive), false = debuff (negative)
        //   curable: boolean,       // Can be removed by spells/abilities
        //   icon: string            // Display icon (e.g., '🐌', '🛡️', '⚔️')
        // }
        this.conditions = [];

        // Weapon mastery effects (legacy - kept for backwards compatibility)
        this.masteryEffects = {
            sapped: false,          // DEPRECATED: Use conditions system. Has disadvantage on next attack (Sap mastery)
            slowedBy: null,         // DEPRECATED: Use conditions system. AC reduced by 1 until start of attacker's turn (Slow mastery)
            vexed: null,            // DEPRECATED: Use conditions system. Has advantage on next attack vs specific target (Vex mastery)
            prone: false            // DEPRECATED: Use conditions system. Knocked prone (Topple mastery)
        };
    }

    /**
     * Add a condition to this combatant
     * @param {string} type - Condition type (e.g., 'slowed', 'poisoned', 'blessed')
     * @param {string} duration - 'untilStartOfTurn', 'untilEndOfTurn', 'rounds', 'combat', 'permanent'
     * @param {string} appliedBy - ID of combatant who applied this
     * @param {Object} options - { value, roundsRemaining, isBuff, curable, icon }
     */
    addCondition(type, duration, appliedBy, options = {}) {
        const {
            value = null,
            roundsRemaining = 1,
            isBuff = false,
            curable = true,
            icon = isBuff ? '✨' : '💢'
        } = options;

        // Check if condition already exists (non-stacking by default)
        const existing = this.conditions.find(c => c.type === type);
        if (existing) {
            return false; // Already has this condition
        }

        // For 'permanent' conditions, only allow if curable is explicitly set
        if (duration === 'permanent' && options.curable === undefined) {
            console.warn(`Permanent condition '${type}' should explicitly set curable flag`);
        }

        this.conditions.push({
            type,
            duration,
            appliedBy,
            value,
            roundsRemaining,
            isBuff,
            curable,
            icon
        });
        return true;
    }

    /**
     * Remove a condition by type
     * @param {string} type - Condition type to remove
     * @param {boolean} ignoreImmunity - If false, cannot remove non-curable conditions
     */
    removeCondition(type, ignoreImmunity = false) {
        const index = this.conditions.findIndex(c => c.type === type);
        if (index !== -1) {
            const condition = this.conditions[index];

            // Check if condition can be cured
            if (!ignoreImmunity && !condition.curable) {
                console.warn(`Cannot remove non-curable condition: ${type}`);
                return false;
            }

            this.conditions.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Remove all curable conditions (for spell effects like Lesser Restoration)
     */
    removeCurableConditions() {
        const removed = this.conditions.filter(c => c.curable && !c.isBuff);
        this.conditions = this.conditions.filter(c => !c.curable || c.isBuff);
        return removed;
    }

    /**
     * Check if combatant has a specific condition
     */
    hasCondition(type) {
        return this.conditions.some(c => c.type === type);
    }

    /**
     * Get a specific condition
     */
    getCondition(type) {
        return this.conditions.find(c => c.type === type);
    }

    /**
     * Get all buffs (positive conditions)
     */
    getBuffs() {
        return this.conditions.filter(c => c.isBuff);
    }

    /**
     * Get all debuffs (negative conditions)
     */
    getDebuffs() {
        return this.conditions.filter(c => !c.isBuff);
    }

    /**
     * Get display string for all active conditions
     */
    getConditionsDisplay() {
        if (this.conditions.length === 0) return '';

        return this.conditions.map(c => c.icon).join(' ');
    }

    /**
     * Make a saving throw
     * @param {string} ability - Ability to use (str, dex, con, int, wis, cha)
     * @param {number} dc - Difficulty Class
     * @param {Object} options - { advantage: boolean, disadvantage: boolean, description: string }
     * @returns {Object} - { success: boolean, total: number, roll: number, modifier: number }
     */
    makeSavingThrow(ability, dc, options = {}) {
        const { advantage = false, disadvantage = false, description = '' } = options;

        // Check for advantage from conditions
        let hasAdvantage = advantage;
        let hasDisadvantage = disadvantage;

        // Dodge gives advantage on DEX saves
        if (ability === 'dex' && this.hasCondition('dodging')) {
            hasAdvantage = true;
        }

        // Roll d20 with advantage/disadvantage
        let roll;
        if (hasAdvantage && !hasDisadvantage) {
            const roll1 = rollD20().result;
            const roll2 = rollD20().result;
            roll = Math.max(roll1, roll2);
            gameState.addMessage(
                `🎲 Advantage: Rolled ${roll1} and ${roll2}, using ${roll}`,
                'info'
            );
        } else if (hasDisadvantage && !hasAdvantage) {
            const roll1 = rollD20().result;
            const roll2 = rollD20().result;
            roll = Math.min(roll1, roll2);
            gameState.addMessage(
                `🎲 Disadvantage: Rolled ${roll1} and ${roll2}, using ${roll}`,
                'warning'
            );
        } else {
            roll = rollD20().result;
        }

        // Get ability modifier and proficiency
        const abilityMod = this.character.abilityModifiers[ability];
        const isProficient = this.character.savingThrows[ability].proficient;
        const profBonus = isProficient ? this.character.proficiencyBonus : 0;
        const total = roll + abilityMod + profBonus;

        // Message
        const abilityName = ability.toUpperCase();
        const profText = isProficient ? ' (proficient)' : '';
        gameState.addMessage(
            `${abilityName} save${profText}: ${roll} + ${abilityMod + profBonus} = ${total} vs DC ${dc}`,
            'info'
        );

        const success = total >= dc;

        return {
            success,
            total,
            roll,
            modifier: abilityMod + profBonus
        };
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
        // Clear conditions with 'untilEndOfTurn' duration
        const conditionsToRemove = this.conditions.filter(c => c.duration === 'untilEndOfTurn');

        conditionsToRemove.forEach(condition => {
            this.removeCondition(condition.type);
            console.log(`✅ ${this.name}'s '${condition.type}' condition cleared (end of turn)`);
        });

        // No longer clear Slow here - it clears at start of attacker's turn
        // Note: sapped and vexed clear after being used (one-time effects)
        // Note: prone clears via countdown (roundsRemaining)
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
            conditions: [...this.conditions],
            masteryEffects: { ...this.masteryEffects }
        };
    }
}

export { CombatManager, Combatant };
export default CombatManager;
