/**
 * Combat Manager - Simplified Non-Grid Turn-Based Combat
 * Follows D&D 5e SRD 5.2.1 2024 rules
 */

import { gameState } from '../core/GameState.js';
import { RULES } from '../core/rulesEngine.js';
import { rollDice, rollD20, roll } from '../utils/dice.js';
import { SeededRandom } from '../utils/rng.js';
import audioManager from './AudioManager.js';
import { addFatigue, getFatigueModifiers } from './FatigueManager.js';

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
        this.companionCombatants = [];

        // Cover type for current encounter ('partial', 'substantial', or null)
        // Read from terrain at player's position when combat starts.
        this.coverType = null;

        // Which side won the initiative contest for cover ('player' | 'enemy' | null).
        // Winner gets full coverBonus; loser gets Math.ceil(bonus * loserMultiplier).
        // Null when coverType is null (no cover terrain).
        this.coverWinner = null;

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
     * @param {Array} companions - Array of companion characters (defaults to empty for backward compatibility)
     */
    async startCombat(player, enemies, companions = []) {
        // Ensure weapon mastery data is loaded before applying effects
        await this.loadWeaponMasteryData();
        console.log('⚔️ Starting combat encounter!');

        this.active = true;
        this.round = 1;
        this.combatants = [];
        this.turnOrder = [];
        this.companionCombatants = [];
        // Create player combatant
        this.playerCombatant = new Combatant(player, 'player');
        this.combatants.push(this.playerCombatant);

        // Create companion combatants (skip downed companions)
        this.companionCombatants = companions
            .filter(c => !c.companionMeta?.isDowned)
            .map((companion, index) => {
                const combatant = new Combatant(companion, 'companion', `companion_${index}`);
                combatant.sourceCharacter = companion; // CRITICAL: back-reference for isDowned writeback
                this.combatants.push(combatant);
                return combatant;
            });

        if (this.companionCombatants.length > 0) {
            const names = this.companionCombatants.map(c => c.name).join(', ');
            console.log(`👥 ${this.companionCombatants.length} companion(s) joining combat: ${names}`);
        }

        // Create enemy combatants
        this.enemyCombatants = enemies.map((enemy, index) => {
            const combatant = new Combatant(enemy, 'enemy', `enemy_${index}`);
            this.combatants.push(combatant);
            return combatant;
        });

        // Roll initiative
        this.rollInitiative();

        // Read terrain cover at the player's position and store on manager
        this.coverType = null;
        try {
            const playerPos = gameState.get('player.position') || gameState.get('character.position');
            if (playerPos && window.game?.worldGenerator) {
                const tile = window.game.worldGenerator.getCachedTile(playerPos.x, playerPos.y);
                if (tile) {
                    const terrainDef = window.game.worldGenerator.terrainTypes?.terrains?.find(t => t.id === tile.terrain);
                    const rawCover = terrainDef?.coverType ?? null;
                    // 'substantial' covers all strong cover (three-quarters + any full cover edge cases)
                    this.coverType = rawCover;
                }
            }
        } catch (e) {
            console.warn('⚠️ Could not read terrain cover type:', e.message);
        }

        // Determine cover winner via initiative contest (if cover terrain and mode enabled).
        // Player side = 'player' + 'companion' combatants. Enemy side = 'enemy' combatants.
        // Winner gets full cover bonus; loser gets Math.ceil(bonus * loserMultiplier).
        this.coverWinner = null;
        if (this.coverType && RULES.combat.coverInitiativeMode?.enabled) {
            const playerSideInits = this.combatants
                .filter(c => c.team === 'player' || c.team === 'companion')
                .map(c => c.initiative);
            const enemySideInits = this.combatants
                .filter(c => c.team === 'enemy')
                .map(c => c.initiative);
            const playerBest = playerSideInits.length ? Math.max(...playerSideInits) : -Infinity;
            const enemyBest = enemySideInits.length ? Math.max(...enemySideInits) : -Infinity;
            // Ties go to player (benefit of the doubt)
            this.coverWinner = playerBest >= enemyBest ? 'player' : 'enemy';
        }

        // Cover is handled per-attack in attack() — no flat AC mutation here.

        // Update game state
        gameState.set('combat', {
            active: true,
            round: this.round,
            currentTurn: this.getCurrentCombatant()?.id,
            combatants: this.combatants.map(c => c.toJSON()),
            coverType: this.coverType,
            coverWinner: this.coverWinner,
            isCompanionTurn: false,
            activeCompanionId: null
        });

        // Add combat start messages
        const enemyNames = this.enemyCombatants.map(e => e.name).join(', ');
        gameState.addMessage(`⚔️ You encounter: ${enemyNames}!`, 'warning');
        gameState.addMessage(`⚔️ Combat begins! Round ${this.round}`, 'warning');
        gameState.addMessage(`Turn order: ${this.turnOrder.map(c => c.name).join(' → ')}`, 'info');

        // Announce cover contest result
        if (this.coverType && RULES.combat.coverInitiativeMode?.enabled) {
            const bonuses = RULES.combat.coverBonuses;
            const loserMult = RULES.combat.coverInitiativeMode.loserMultiplier;
            const fullBonus = bonuses[this.coverType] || 0;
            const reducedBonus = Math.ceil(fullBonus * loserMult);
            const coverLabel = this.coverType === 'substantial' ? '🏰 Substantial' : '🌿 Partial';
            if (this.coverWinner === 'player') {
                gameState.addMessage(`${coverLabel} cover — your side claimed position! +${fullBonus} AC vs ranged. Enemies: +${reducedBonus} AC vs your ranged.`, 'success');
            } else {
                gameState.addMessage(`${coverLabel} cover — enemies claimed position! +${fullBonus} AC vs your ranged. Your side: +${reducedBonus} AC vs enemy ranged.`, 'warning');
            }
        } else if (this.coverType) {
            // Fallback: initiative mode disabled — original asymmetric behaviour
            const bonus = RULES.combat.coverBonuses[this.coverType] || 0;
            const coverLabel = this.coverType === 'substantial' ? '🏰 Substantial cover' : '🌿 Partial cover';
            gameState.addMessage(`${coverLabel}! Enemy ranged attacks suffer +${bonus} effective AC penalty.`, 'info');
        }

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

        // Reset legendary actions at the start of the boss's own turn
        if (combatant.legendaryActionsMax > 0) {
            combatant.legendaryActionsRemaining = combatant.legendaryActionsMax;
        }

        gameState.addMessage(
            `📍 ${combatant.name}'s turn (HP: ${combatant.hp}/${combatant.maxHP})`,
            combatant.team === 'player' ? 'success' : 'warning'
        );

        // Update game state
        this.updateGameState();

        // If it's an enemy turn, execute AI; companions wait for player input
        if (combatant.team === 'enemy') {
            console.log('🤖 Enemy turn - executing AI in 500ms');
            setTimeout(() => this.executeEnemyAI(combatant), 500);
        } else if (combatant.team === 'companion') {
            console.log(`👥 Companion turn (${combatant.name}) - waiting for player input`);
            gameState.set('combat.isCompanionTurn', true);
            gameState.set('combat.activeCompanionId', combatant.id);
            gameState.addMessage(`${combatant.name}'s turn — you control them.`, 'info');
            // UI handles panel switch via 'combat.activeCompanionId' subscription
        } else {
            console.log('👤 Player turn - waiting for input');
        }
    }

    /**
     * Execute enemy AI turn — uses monster actions if available, falls back to generic attack
     */
    async executeEnemyAI(combatant) {
        console.log(`⚔️ AI executing turn for ${combatant.name}`);
        gameState.addMessage(`${combatant.name} is acting...`, 'info');

        // Pick random living friendly target (player + companions)
        const targets = [this.playerCombatant, ...(this.companionCombatants || [])]
            .filter(c => c.hp > 0 && !c.isDowned);

        if (targets.length === 0) {
            console.log('⚠️ No valid targets, ending turn');
            this.endTurn();
            return;
        }

        const target = targets[Math.floor(Math.random() * targets.length)];

        // Check if this monster has stat-block actions from monsters.json
        const monsterActions = combatant.character.monsterActions;
        if (monsterActions && monsterActions.length > 0) {
            await this.executeMonsterActions(combatant, target, monsterActions);
        } else {
            // Fallback: generic attack for enemies without action data
            await this.attack(combatant, target);
        }

        // End turn after a delay (only if combat is still active)
        setTimeout(() => {
            if (!this.active) {
                return;
            }
            console.log('Enemy turn ending');
            this.endTurn();
        }, 1000);
    }

    /**
     * Execute monster stat-block actions, handling multiattack
     */
    async executeMonsterActions(combatant, target, actions) {
        const multiattack = combatant.character.multiattack;
        let attackCount = 1;

        // Parse multiattack description to determine number of attacks
        if (multiattack) {
            const match = multiattack.match(/\b(two|three|four|2|3|4)\b/i);
            if (match) {
                const word = match[1].toLowerCase();
                const wordMap = { 'two': 2, 'three': 3, 'four': 4 };
                attackCount = wordMap[word] || parseInt(word) || 2;
            } else {
                attackCount = 2; // Default multiattack = 2 attacks
            }
            gameState.addMessage(`⚔️ ${combatant.name} uses Multiattack!`, 'warning');
        }

        // Filter to attack-type actions (melee/ranged weapon attacks with a weapon or damage dice)
        const attackActions = actions.filter(a =>
            (a.type === 'meleeWeaponAttack' || a.type === 'rangedWeaponAttack') &&
            (a.weaponId || a.damage)
        );
        // Save-based actions (breath weapons, etc.) — type 'special' with damage in description
        const specialActions = actions.filter(a => a.type === 'special' && a.description);

        // Use special action (like breath weapon) occasionally if available
        if (specialActions.length > 0 && Math.random() < 0.3) {
            const special = specialActions[Math.floor(Math.random() * specialActions.length)];
            await this.executeSpecialMonsterAction(combatant, target, special);
            return;
        }

        if (attackActions.length === 0) {
            // No usable attack actions, fall back to generic
            await this.attack(combatant, target);
            return;
        }

        // Build ordered action list: preferRanged monsters lead with ranged attacks
        let orderedActions = attackActions;
        if (combatant.character?.preferRanged) {
            const rangedActions = attackActions.filter(a => a.type === 'rangedWeaponAttack');
            const meleeActions = attackActions.filter(a => a.type !== 'rangedWeaponAttack');
            if (rangedActions.length > 0) {
                // Ranged actions first; fall back to melee if ranged pool exhausted
                orderedActions = [...rangedActions, ...meleeActions];
                console.log(`🏹 ${combatant.name} prefers ranged — leading with ${rangedActions[0].name}`);
            }
        }

        // Execute each attack in the multiattack sequence
        for (let i = 0; i < attackCount; i++) {
            if (target.hp <= 0) {
                break;
            } // Stop if target dies

            // Pick action — cycle through available attacks for variety
            const action = orderedActions[i % orderedActions.length];
            await this.executeMonsterAttack(combatant, target, action);

            // Small delay between multiattack hits
            if (i < attackCount - 1) {
                await new Promise(resolve => setTimeout(resolve, 400));
            }
        }
    }

    /**
     * Look up a weapon from the loaded items data by ID.
     * @param {string} weaponId
     * @returns {object|null} weapon item or null if not found
     */
    getWeaponById(weaponId) {
        const items = gameState.data?.items;
        if (!items || !weaponId) {
            return null;
        }
        return items.find(i => i.id === weaponId) || null;
    }

    /**
     * Calculate attack bonus for a monster action.
     * Replaces the old hardcoded action.attackBonus.
     *
     * @param {Combatant} combatant - the attacking monster combatant
     * @param {object} action - the action being executed
     * @returns {{ attackBonus: number, damageBonus: number, damageDice: string, damageType: string }}
     */
    calculateMonsterAttackStats(combatant, action) {
        const mods = combatant.character.abilityModifiers;
        const proficiency = combatant.character.proficiencyBonus || 2;
        let abilityMod;
        let damageDice;
        let damageType;

        if (action.weaponId) {
            const weapon = this.getWeaponById(action.weaponId);
            if (weapon) {
                const props = weapon.properties || [];
                const isFinesse = props.includes('finesse');
                const isThrown = props.includes('thrown');
                const isRanged = weapon.weaponType === 'ranged';

                if (isFinesse) {
                    abilityMod = Math.max(mods.str, mods.dex);
                } else if (isRanged && !isThrown) {
                    abilityMod = mods.dex;
                } else {
                    abilityMod = mods.str;
                }

                damageDice = weapon.damage;
                damageType = weapon.damageType;
            } else {
                console.warn(`[CombatManager] weaponId "${action.weaponId}" not found in items data`);
                abilityMod = mods.str;
                damageDice = '1d4';
                damageType = 'bludgeoning';
            }
        } else {
            const isRangedAction = action.type === 'rangedWeaponAttack';
            if (action.finesse) {
                abilityMod = Math.max(mods.str, mods.dex);
            } else if (isRangedAction && !action.thrown) {
                abilityMod = mods.dex;
            } else {
                abilityMod = mods.str;
            }

            const diceMatch = (action.damage || '1d4').match(/^(\d+d\d+)/);
            damageDice = diceMatch ? diceMatch[1] : (action.damage || '1d4');
            damageType = action.damageType || 'bludgeoning';
        }

        return {
            attackBonus: abilityMod + proficiency,
            damageBonus: abilityMod,
            damageDice,
            damageType
        };
    }

    /**
     * Execute a single monster attack action using stat-block data
     */
    async executeMonsterAttack(combatant, target, action) {
        const actionName = action.name || 'Attack';
        gameState.addMessage(`${combatant.name} uses ${actionName}!`, 'warning');

        // PUSH MASTERY RESTRICTION: Cannot make melee attacks while pushed
        const isMeleeAction = action.type === 'meleeWeaponAttack' || action.type === 'melee';
        if (combatant.hasCondition && combatant.hasCondition('pushed') && isMeleeAction) {
            console.log(`⚠️ ${combatant.name} is pushed and cannot make melee attacks!`);
            gameState.addMessage(`💨 ${combatant.name} is pushed away! Cannot make melee attacks!`, 'error');
            return;
        }

        // Attack roll: derive bonus from monster stats + proficiency
        const attackStats = this.calculateMonsterAttackStats(combatant, action);
        const attackBonus = attackStats.attackBonus + (combatant.character.bossAttackBonus || 0);

        // Check advantage/disadvantage
        let hasAdvantage = false;
        let hasDisadvantage = false;

        // Prone: Attacker has advantage vs prone target (melee only)
        if (target.hasCondition && target.hasCondition('prone') && isMeleeAction) {
            hasAdvantage = true;
        } else if (target.hasCondition && target.hasCondition('prone') && !isMeleeAction) {
            // Ranged has disadvantage vs prone targets (D&D 5e rule)
            hasDisadvantage = true;
        }

        // Sapped: Monster has disadvantage on its attack
        if (combatant.hasCondition && combatant.hasCondition('sapped')) {
            hasDisadvantage = true;
            gameState.addMessage(`⚔️ ${combatant.name} has disadvantage (Sapped)! 💫`, 'warning');
        }

        // Dodging: Defender is dodging - attacker has disadvantage
        if (target.hasCondition && target.hasCondition('dodging')) {
            hasDisadvantage = true;
            gameState.addMessage(`⚔️ ${combatant.name} has disadvantage (${target.name} is dodging)! 🛡️`, 'warning');
        }

        // Attacker prone: Monster has disadvantage on its own attacks while prone
        if (combatant.hasCondition && combatant.hasCondition('prone')) {
            hasDisadvantage = true;
            gameState.addMessage(`⚔️ ${combatant.name} has disadvantage (prone)! 🔻`, 'warning');
        }

        // FRIGHTENED: attacker has disadvantage on attacks when frightened
        if (combatant.hasCondition && combatant.hasCondition('frightened')) {
            hasDisadvantage = true;
            gameState.addMessage(`😱 ${combatant.name} has disadvantage (Frightened)! 😱`, 'warning');
        }

        // Vexed: Monster has advantage vs the vexed target (one-time use, then cleared)
        const vexCondition = combatant.getCondition ? combatant.getCondition('vexed') : null;
        if (vexCondition && vexCondition.value === target.id) {
            hasAdvantage = true;
            combatant.removeCondition('vexed', true);
            gameState.addMessage(`⚔️ ${combatant.name} has advantage (Vex)! ⚡`, 'success');
        }

        let d20Result;
        if (hasAdvantage && !hasDisadvantage) {
            const roll1 = rollD20();
            const roll2 = rollD20();
            d20Result = roll1.natural >= roll2.natural ? roll1 : roll2;
            gameState.addMessage(`🎲 Advantage: Rolled ${roll1.natural} and ${roll2.natural}, using ${d20Result.natural}`, 'info');
        } else if (hasDisadvantage && !hasAdvantage) {
            const roll1 = rollD20();
            const roll2 = rollD20();
            d20Result = roll1.natural <= roll2.natural ? roll1 : roll2;
            gameState.addMessage(`🎲 Disadvantage: Rolled ${roll1.natural} and ${roll2.natural}, using ${d20Result.natural}`, 'info');
        } else {
            d20Result = rollD20();
        }

        let isCritical = d20Result.natural === 20;
        const isCriticalMiss = d20Result.natural === 1;
        const attackTotal = d20Result.natural + attackBonus;

        // Forgecraft: Adaptive mod on target negates critical hits
        if (isCritical && this.hasForgecraftMod(target, 'adaptive')) {
            isCritical = false;
            gameState.addMessage(`🛡️ ${target.name}'s adaptive armor absorbs the critical strike!`, 'info');
        }

        gameState.addMessage(`🎲 ${combatant.name} rolls ${d20Result.natural} + ${attackBonus} = ${attackTotal} vs AC ${target.ac}`, 'info');

        // MELEE ENGAGEMENT: attacker switches focus — clear previous engagements, form new one with target
        if (isMeleeAction) {
            combatant.engagedWith.forEach(oldId => {
                const old = this.combatants.find(c => c.id === oldId);
                if (old) {
                    old.engagedWith.delete(combatant.id);
                }
            });
            combatant.engagedWith.clear();
            combatant.engagedWith.add(target.id);
            target.engagedWith.add(combatant.id);
        }

        if (isCriticalMiss) {
            gameState.addMessage('❌ Critical miss!', 'info');
            audioManager.playCombatSound({ weaponType: 'melee', hit: false, critical: true });
            if (window.game) {
                window.game.showFloatingCombatText(target.id, 'MISS', 'miss');
            }
            // Clear sapped condition after attacking (even on a critical miss)
            if (combatant.hasCondition && combatant.hasCondition('sapped')) {
                combatant.removeCondition('sapped', true);
            }
            return;
        }

        if (isCritical || attackTotal >= target.ac) {

            // Hit! Roll damage using stats derived from weapon data or action fallback
            const damageDice = attackStats.damageDice;
            const damageBonus = attackStats.damageBonus;
            const damageType = attackStats.damageType;
            let damageRoll = 0;

            try {
                // Roll the base dice then add the ability modifier bonus
                const diceMatch = damageDice.match(/^(\d+)d(\d+)/);
                if (diceMatch) {
                    const numDice = parseInt(diceMatch[1]);
                    const dieSize = parseInt(diceMatch[2]);
                    damageRoll = rollDice(numDice, dieSize) + damageBonus;
                    if (isCritical) {
                        // Critical: roll damage dice again (not the modifier)
                        damageRoll += rollDice(numDice, dieSize);
                    }
                } else {
                    damageRoll = rollDice(1, 4) + damageBonus; // Last resort fallback
                }
            } catch (e) {
                // Fallback: parse with roll() utility if available
                try {
                    damageRoll = roll(damageDice) + damageBonus;
                } catch (e2) {
                    damageRoll = rollDice(1, 8) + damageBonus;
                }
            }

            const damageTotal = Math.max(1, damageRoll);

            let damageMsg = isCritical ? '⭐ Critical hit! ' : '💥 Hit! ';
            damageMsg += `${actionName}: ${damageTotal} ${damageType} damage`;
            gameState.addMessage(damageMsg, 'error');

            if (window.game) {
                window.game.showFloatingCombatText(target.id, `-${damageTotal}`, isCritical ? 'critical' : 'damage');
            }

            audioManager.playCombatSound({ weaponType: 'melee', hit: true, critical: isCritical });
            target.takeDamage(damageTotal);
            this.updateGameState();

            // Check if target is defeated
            if (target.hp <= 0) {
                gameState.addMessage(`💀 ${target.name} is defeated!`, 'warning');
                setTimeout(() => {
                    audioManager.play('death');
                }, 1000);
                this.handleDefeat(target);
            }

            // Clear sapped condition after attacking
            if (combatant.hasCondition && combatant.hasCondition('sapped')) {
                combatant.removeCondition('sapped', true);
            }
        } else {
            gameState.addMessage(`❌ ${combatant.name} misses!`, 'info');
            audioManager.playCombatSound({ weaponType: 'melee', hit: false, critical: false });
            if (window.game) {
                window.game.showFloatingCombatText(target.id, 'MISS', 'miss');
            }
            // Clear sapped condition after attacking (even on a miss)
            if (combatant.hasCondition && combatant.hasCondition('sapped')) {
                combatant.removeCondition('sapped', true);
            }
        }
    }

    /**
     * Execute a special monster action (save-based, like breath weapons)
     */
    async executeSpecialMonsterAction(combatant, target, action) {
        const actionName = action.name || 'Special Attack';
        gameState.addMessage(`🔥 ${combatant.name} uses ${actionName}!`, 'warning');

        // Parse save DC from description or use default
        let saveDC = 13;
        let saveAbility = 'dex';
        if (action.description) {
            const dcMatch = action.description.match(/DC\s*(\d+)\s*(STR|DEX|CON|INT|WIS|CHA)/i);
            if (dcMatch) {
                saveDC = parseInt(dcMatch[1]);
                saveAbility = dcMatch[2].toLowerCase();
            }
        }

        // Target makes saving throw
        const saveMod = target.character.abilityModifiers?.[saveAbility] || 0;
        const saveRoll = rollD20();
        let saveTotal = saveRoll.natural + saveMod;

        // Forgecraft: Deflecting mod — use reaction to add shield AC to saving throw
        let deflectBonus = 0;
        const targetMods = target.character?.equipmentMods;
        if (targetMods) {
            const hasDeflecting = Object.values(targetMods).some(m => m.modId === 'deflecting');
            if (hasDeflecting && target.actions?.reaction > 0) {
                const shield = target.character.equipment?.offHand;
                if (shield?.type === 'shield' && shield?.armorClassBonus) {
                    deflectBonus = shield.armorClassBonus;
                    target.actions.reaction -= 1;
                    saveTotal += deflectBonus;
                    gameState.addMessage(
                        `🛡️ Deflecting! ${target.name} uses reaction to add +${deflectBonus} (shield) to saving throw!`,
                        'success'
                    );
                }
            }
        }

        const saved = saveTotal >= saveDC;

        let saveMsg = `🎲 ${target.name} ${saveAbility.toUpperCase()} save: ${saveRoll.natural} + ${saveMod}`;
        if (deflectBonus > 0) {
            saveMsg += ` + ${deflectBonus} (deflecting)`;
        }
        saveMsg += ` = ${saveTotal} vs DC ${saveDC}`;
        gameState.addMessage(saveMsg, 'info');

        // Roll damage
        let damageRoll = 0;
        try {
            damageRoll = roll(action.damage);
        } catch (e) {
            damageRoll = rollDice(3, 6); // Fallback
        }

        // Half damage on save
        const damageTotal = saved ? Math.floor(damageRoll / 2) : damageRoll;
        const damageType = action.damageType || 'fire';

        if (saved) {
            gameState.addMessage(`🛡️ ${target.name} saves! Takes ${damageTotal} ${damageType} damage (half).`, 'warning');
        } else {
            gameState.addMessage(`💥 ${target.name} fails! Takes ${damageTotal} ${damageType} damage!`, 'error');
        }

        if (window.game) {
            window.game.showFloatingCombatText(target.id, `-${damageTotal}`, saved ? 'damage' : 'critical');
        }

        audioManager.playCombatSound({ weaponType: 'ranged', hit: true, critical: !saved });
        target.takeDamage(damageTotal);
        this.updateGameState();

        // Check if target is defeated
        if (target.hp <= 0) {
            gameState.addMessage(`💀 ${target.name} is defeated!`, 'warning');
            setTimeout(() => {
                audioManager.play('death');
            }, 1000);
            this.handleDefeat(target);
        }
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

        console.log('⚔️ ATTACK:', attacker.name, 'attacks', defender.name,
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

        // AMMO CHECK: ranged attacks require ammunition
        if (isRanged && weapon) {
            // Initialize ammoCount from ammoCapacity if not yet set on the equipped weapon object
            if (weapon.ammoCount === undefined) {
                // TODO: use getItemDefinition() when available; fall back to ammoCapacity field or default 20
                weapon.ammoCount = weapon.ammoCapacity ?? 20;
            }

            if (weapon.ammoCount <= 0) {
                gameState.addMessage(`❌ ${attacker.name} has no ammunition! Use a Quiver of Arrows from inventory or visit a merchant.`, 'error');
                return;
            }
        }

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

        // Fighting Style: Marksmanship (+2 to ranged attack rolls only, not damage)
        const fightingStyleAttackBonus = (isRanged && attacker.character.fightingStyle === 'marksmanship') ? 2 : 0;

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

        // HARRIED: ranged attacker has disadvantage when harried by a melee hit this turn
        if (isRanged && attacker.hasCondition('harried')) {
            hasDisadvantage = true;
            gameState.addMessage(`🎯 ${attacker.name} has disadvantage (Harried — can't steady their aim)!`, 'warning');
        }

        // FRIGHTENED: attacker has disadvantage on attacks when frightened
        if (attacker.hasCondition('frightened')) {
            hasDisadvantage = true;
            gameState.addMessage(`😱 ${attacker.name} has disadvantage (Frightened)! 😱`, 'warning');
        }

        // FATIGUE: player attacker only — staggering threshold imposes disadvantage on attacks
        let fatigueAttackMod = 0;
        if (attacker.team === 'player') {
            const fatigueMods = getFatigueModifiers();
            if (fatigueMods.disadvantageAttacks && !hasDisadvantage) {
                hasDisadvantage = true;
                gameState.addMessage(`😩 ${attacker.name} has disadvantage (staggering fatigue)!`, 'warning');
            }
            fatigueAttackMod = fatigueMods.attackMod;
            if (fatigueAttackMod !== 0) {
                gameState.addMessage(`😴 Fatigue penalty: ${fatigueAttackMod} to attack roll`, 'warning');
            }
        }

        // COVER: symmetric, initiative-contested. Both sides can benefit.
        // Winner gets full bonus; loser gets Math.ceil(bonus * loserMultiplier).
        // Applies to ranged attacks only; no permanent AC mutation.
        let coverACBonus = 0;
        if (isRanged && this.coverType) {
            const baseBonus = RULES.combat.coverBonuses[this.coverType] || 0;
            const defenderIsPlayerSide = defender.team === 'player' || defender.team === 'companion';
            const defenderIsEnemySide = defender.team === 'enemy';
            const modeEnabled = RULES.combat.coverInitiativeMode?.enabled;
            if (modeEnabled && this.coverWinner) {
                const loserMult = RULES.combat.coverInitiativeMode.loserMultiplier;
                if (defenderIsPlayerSide) {
                    coverACBonus = this.coverWinner === 'player'
                        ? baseBonus
                        : Math.ceil(baseBonus * loserMult);
                } else if (defenderIsEnemySide) {
                    coverACBonus = this.coverWinner === 'enemy'
                        ? baseBonus
                        : Math.ceil(baseBonus * loserMult);
                }
            } else if (defenderIsPlayerSide) {
                // Fallback: initiative mode disabled — original player-only behaviour
                coverACBonus = baseBonus;
            }
        }

        // Attack roll: d20 + ability mod + proficiency + ranged bonus
        const attackRollObj = rollD20();
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

        // MANEUVER: Precision Strike — adds maneuver die to attack roll (beforeAttack, spend 1 Resolve)
        let maneuverAttackBonus = 0;
        if (attacker.pendingManeuver === 'precisionStrike' && attacker.team === 'player') {
            const dieSides = attacker.character.getManeuverDie?.() || 6;
            maneuverAttackBonus = rollDice(1, dieSides);
            gameState.addMessage(`⚔️ Precision Strike! +${maneuverAttackBonus} to attack roll (d${dieSides})`, 'success');
        }

        // MANEUVER CONDITION: Disarmed — -2 to attack rolls until start of attacker's next turn
        let disarmedPenalty = 0;
        if (attacker.hasCondition && attacker.hasCondition('disarmed')) {
            const cond = attacker.getCondition('disarmed');
            disarmedPenalty = cond?.value || -2;
            gameState.addMessage(`🗡️ ${attacker.name} is disarmed! (${disarmedPenalty} to attack)`, 'warning');
        }

        const attackTotal = attackRoll + attackBonus + proficiency + fightingStyleAttackBonus + maneuverAttackBonus + disarmedPenalty + fatigueAttackMod;
        const effectiveAC = defender.ac + coverACBonus;

        // Forgecraft: Keen mod expands crit range to 19-20
        const critRange = [...RULES.combat.criticalHitRange];
        if (this.hasForgecraftModOnSlot(attacker, weaponSlot, 'keen') && !critRange.includes(19)) {
            critRange.push(19);
        }

        let isCritical = critRange.includes(attackRoll);
        const isCriticalMiss = RULES.combat.criticalMissRange.includes(attackRoll);

        // Forgecraft: Adaptive mod on defender negates critical hits
        if (isCritical && this.hasForgecraftMod(defender, 'adaptive')) {
            isCritical = false;
            gameState.addMessage(`🛡️ ${defender.name}'s adaptive armor absorbs the critical strike!`, 'info');
        }

        // Build attack roll message
        let attackMsg = `Attack roll: ${attackRoll}`;
        if (attackBonus !== 0) {
            attackMsg += ` + ${attackBonus} (ability)`;
        }
        if (proficiency !== 0) {
            attackMsg += ` + ${proficiency} (prof)`;
        }
        if (fightingStyleAttackBonus !== 0) {
            attackMsg += ` + ${fightingStyleAttackBonus} (marksmanship)`;
        }
        if (fatigueAttackMod !== 0) {
            attackMsg += ` ${fatigueAttackMod > 0 ? '+' : ''}${fatigueAttackMod} (fatigue)`;
        }
        attackMsg += ` = ${attackTotal} vs AC ${effectiveAC}${coverACBonus > 0 ? ` (+${coverACBonus} cover)` : ''}`;

        gameState.addMessage(attackMsg, 'info');

        // MELEE ENGAGEMENT: attacker switches focus — clear previous engagements, form new one with target
        if (!isRanged) {
            attacker.engagedWith.forEach(oldId => {
                const old = this.combatants.find(c => c.id === oldId);
                if (old) {
                    old.engagedWith.delete(attacker.id);
                }
            });
            attacker.engagedWith.clear();
            attacker.engagedWith.add(defender.id);
            defender.engagedWith.add(attacker.id);
        }

        if (isCriticalMiss) {
            gameState.addMessage('💥 Critical miss!', 'error');

            // Floating combat text for critical miss
            if (window.game) {
                window.game.showFloatingCombatText(defender.id, 'CRITICAL MISS!', 'miss');
            }

            // Play miss sound (critical miss uses same sound)
            audioManager.playCombatSound({
                weaponType: isRanged ? 'ranged' : 'melee',
                hit: false,
                critical: true
            });

            // Clear pending maneuver on critical miss
            if (attacker.team === 'player') {
                attacker.pendingManeuver = null;
            }

            if (shouldConsumeAction) {
                attacker.consumeAction(actionType);
            }
            this.updateGameState();
            return;
        }

        if (isCritical || attackTotal >= effectiveAC) {

            // Hit! Roll damage
            let damageDice = 4; // Default unarmed d4
            if (weapon?.damage?.dice) {
                damageDice = parseInt(weapon.damage.dice.split('d')[1]) || 8;
            } else if (!weapon && attacker.character.fightingStyle === 'unarmedFighting') {
                // Unarmed Fighting style: 1d8 if both hands free, 1d6 otherwise
                const mainHandFree = !attacker.character.equipment?.mainHand;
                const offHandFree = !attacker.character.equipment?.offHand || attacker.character.equipment.offHand.type === 'shield';
                damageDice = (mainHandFree && offHandFree) ? 8 : 6;
            }

            // Roll damage dice
            let firstRoll = rollDice(1, damageDice);
            let damageRoll = firstRoll;
            let secondRoll = 0;

            if (isCritical) {
                secondRoll = rollDice(1, damageDice); // Double dice on crit
                damageRoll += secondRoll;
                gameState.addMessage('⭐ Critical hit!', 'success');
            }

            // Fighting Style: Great Weapon Fighting (reroll 1s and 2s on two-handed damage)
            if (attacker.character.fightingStyle === 'greatWeaponFighting' && !isOffHandAttack) {
                const isTwoHandedWeapon = weapon?.properties?.includes('twoHanded') || weapon?.properties?.includes('versatile');
                if (isTwoHandedWeapon) {
                    const gwfParts = [];
                    if (firstRoll <= 2) {
                        const rerolled = rollDice(1, damageDice);
                        gwfParts.push(`${firstRoll}→${rerolled}`);
                        damageRoll += rerolled - firstRoll;
                        firstRoll = rerolled;
                    }
                    if (isCritical && secondRoll <= 2) {
                        const rerolled2 = rollDice(1, damageDice);
                        gwfParts.push(`crit: ${secondRoll}→${rerolled2}`);
                        damageRoll += rerolled2 - secondRoll;
                        secondRoll = rerolled2;
                    }
                    if (gwfParts.length > 0) {
                        gameState.addMessage(`⚔️ Great Weapon Fighting reroll [${gwfParts.join(', ')}]`, 'info');
                    }
                }
            }

            // Calculate damage bonus
            let damageBonus = attackBonus;

            // TWO-WEAPON FIGHTING: Off-hand attacks don't add ability modifier to damage
            // unless the character has the Two-Weapon Fighting style
            if (isOffHandAttack) {
                if (attacker.character.fightingStyle !== 'twoWeaponFighting') {
                    damageBonus = 0;
                    gameState.addMessage('⚔️ Off-hand attack: No ability modifier to damage', 'info');
                }
            }

            // Fighting Style: Dueling (+2 damage with one-handed melee, off-hand empty or shield)
            if (!isRanged && !isOffHandAttack && attacker.character.fightingStyle === 'dueling' && weapon) {
                const isTwoHandedWeapon = weapon.properties?.includes('twoHanded');
                const offHand = attacker.character.equipment?.offHand;
                const offHandIsEmptyOrShield = !offHand || offHand.type === 'shield';
                if (!isTwoHandedWeapon && offHandIsEmptyOrShield) {
                    damageBonus += 2;
                }
            }

            // Forgecraft: Tempered mod adds +1 damage
            let forgecraftDamageBonus = 0;
            if (this.hasForgecraftModOnSlot(attacker, weaponSlot, 'tempered')) {
                forgecraftDamageBonus = 1;
            }

            // Extra damage from special sources (e.g., Riposte maneuver die added in promptReaction)
            const extraDamage = options.extraDamage || 0;
            const damageTotal = damageRoll + damageBonus + forgecraftDamageBonus + extraDamage;

            // Build detailed damage message
            let damageMsg = '💥 Hit! ';
            if (isCritical) {
                // Critical: show both dice rolls
                damageMsg += `Damage: ${firstRoll} + ${secondRoll} (crit)`;
                if (damageBonus !== 0) {
                    damageMsg += ` + ${damageBonus} (ability)`;
                }
                if (forgecraftDamageBonus > 0) {
                    damageMsg += ` + ${forgecraftDamageBonus} (tempered)`;
                }
                damageMsg += ` = ${damageTotal}`;
            } else {
                // Normal hit: show single die roll
                damageMsg += `Damage: ${firstRoll}`;
                if (damageBonus !== 0) {
                    damageMsg += ` + ${damageBonus} (ability)`;
                }
                if (forgecraftDamageBonus > 0) {
                    damageMsg += ` + ${forgecraftDamageBonus} (tempered)`;
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

            // Play hit sound
            audioManager.playCombatSound({
                weaponType: isRanged ? 'ranged' : 'melee',
                hit: true,
                critical: isCritical
            });

            // REACTION HOOK: afterHit — e.g., Parry fires when defender is hit (damage already rolled)
            // Parry can reduce damage before it's applied
            let finalDamage = damageTotal;
            if (!isRanged && window.game?.promptReaction) {
                const reactionResult = await window.game.promptReaction('afterHit', attacker, defender, {
                    damage: damageTotal,
                    damageType: weapon?.damage?.type || 'bludgeoning',
                    isMelee: true
                });
                // If Parry was used: reduce damage by maneuver die + CON mod (handled by caller returning reduction)
                if (reactionResult?.damageReduction) {
                    finalDamage = Math.max(0, damageTotal - reactionResult.damageReduction);
                    gameState.addMessage(`🛡️ Parry! ${defender.name} reduces damage by ${reactionResult.damageReduction}! (${finalDamage} total)`, 'success');
                }
            }

            // Apply damage
            defender.takeDamage(finalDamage);

            // Check if defender is defeated
            if (defender.hp <= 0) {
                gameState.addMessage(`💀 ${defender.name} is defeated!`, 'warning');

                // Play death sound 1 second after damage sound
                setTimeout(() => {
                    audioManager.play('death');
                }, 1000);

                this.handleDefeat(defender);
            }

            // MANEUVER: On-hit effects (tripAttack, menacingAttack, pushingAttack, disarmingAttack)
            // Only fire when the defender is still alive (not defeated by main hit)
            const onHitManeuvers = ['tripAttack', 'menacingAttack', 'pushingAttack', 'disarmingAttack'];
            if (attacker.pendingManeuver && onHitManeuvers.includes(attacker.pendingManeuver)
                && attacker.team === 'player' && defender.hp > 0) {
                const dieSides = attacker.character.getManeuverDie?.() || 6;
                const dieRoll  = rollDice(1, dieSides);
                const saveDC   = this.getManeuverSaveDC(attacker);
                this.executeOnHitManeuver(attacker.pendingManeuver, attacker, defender, dieRoll, dieSides, saveDC);
            }
            // Always clear pending maneuver after a hit
            if (attacker.team === 'player') {
                attacker.pendingManeuver = null;
            }

            // SWORN STRIKE: Oath specialization — prompt Resolve spend for bonus radiant damage
            if (!isRanged && attacker.team === 'player' && window.game?.promptSwornStrike) {
                const resolveSpent = await window.game.promptSwornStrike(attacker, defender);
                if (resolveSpent > 0 && defender.hp > 0) {
                    const isUndead = ['undead', 'fiend'].includes(defender.character?.type);
                    const dieCnt = resolveSpent + (isUndead ? 1 : 0);
                    let smiteDmg = 0;
                    for (let i = 0; i < dieCnt; i++) {
                        smiteDmg += rollDice(1, 8);
                    }
                    gameState.addMessage(`✨ Sworn Strike! ${attacker.name} spends ${resolveSpent} Resolve — ${smiteDmg} radiant damage!${isUndead ? ' (bonus vs undead/fiend)' : ''}`, 'success');
                    defender.takeDamage(smiteDmg);
                    window.game.showFloatingCombatText(defender.id, `✨ ${smiteDmg}`, 'buff');
                    // Deduct Resolve from character
                    const char = gameState.get('character');
                    char.resolvePoints = Math.max(0, (char.resolvePoints ?? 0) - resolveSpent);
                    gameState.set('character', char);
                    // Check defeat again after smite damage
                    if (defender.hp <= 0 && !this.defeatedThisTurn?.has(defender.id)) {
                        gameState.addMessage(`💀 ${defender.name} is defeated by Sworn Strike!`, 'warning');
                        this.handleDefeat(defender);
                    }
                }
            }

            // HARRIED CONDITION: a melee hit makes the target's ranged attacks harder
            // appliedBy = defender.id so the condition clears at the START OF THE DEFENDER'S OWN TURN
            // (the untilStartOfTurn cleanup loop fires when combatant.id === condition.appliedBy)
            const defenderHasRanged = defender.character?.attackType === 'ranged' || defender.character?.attackType === 'both'
                || defender.character?.actions?.some(a => a.type === 'rangedWeaponAttack')
                || defender.character?.equipment?.mainHand?.weaponType === 'ranged';
            if (!isRanged && !isCriticalMiss && defenderHasRanged) {
                const harriedAdded = defender.addCondition('harried', 'untilStartOfTurn', defender.id, {
                    value: null,
                    isBuff: false,
                    curable: false,
                    icon: '🎯'
                });
                if (harriedAdded) {
                    gameState.addMessage(`⚔️ ${defender.name} is harried! Ranged attacks have disadvantage! 🎯`, 'warning');
                    if (window.game?.showFloatingCombatText) {
                        window.game.showFloatingCombatText(defender.id, 'HARRIED! 🎯', 'condition');
                    }
                }
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
                            : '💢 Cleave hits! Damage: 1 (minimum)';
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

                            // Play death sound 1 second after damage sound
                            setTimeout(() => {
                                audioManager.play('death');
                            }, 1000);

                            this.handleDefeat(adjacentEnemy);
                        }
                    } else {
                        gameState.addMessage('Cleave misses!', 'info');

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
                            nickMsg += ' (no ability modifier)';
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

                            // Play death sound 1 second after damage sound
                            setTimeout(() => {
                                audioManager.play('death');
                            }, 1000);

                            this.handleDefeat(defender);
                        }
                    } else {
                        gameState.addMessage('Nick misses!', 'info');

                        // Floating combat text for Nick miss
                        if (window.game) {
                            window.game.showFloatingCombatText(defender.id, 'MISS', 'miss');
                        }
                    }
                }
            }
        } else {
            gameState.addMessage('Miss!', 'info');

            // Floating combat text for regular miss
            if (window.game) {
                window.game.showFloatingCombatText(defender.id, 'MISS', 'miss');
            }

            // Play miss sound
            audioManager.playCombatSound({
                weaponType: isRanged ? 'ranged' : 'melee',
                hit: false,
                critical: false
            });

            // Clear pending maneuver on miss (maneuvers are wasted if the attack misses)
            if (attacker.team === 'player') {
                attacker.pendingManeuver = null;
            }

            // REACTION HOOK: afterMiss — e.g., Riposte fires when attacker misses defender
            if (!isRanged && window.game?.promptReaction) {
                await window.game.promptReaction('afterMiss', attacker, defender, { isMelee: true });
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

                        // Play death sound 1 second after damage sound
                        setTimeout(() => {
                            audioManager.play('death');
                        }, 1000);

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

        // AMMO DECREMENT: spend one arrow/bolt after the attack resolves (hit or miss)
        if (isRanged && weapon && weapon.ammoCount !== undefined) {
            weapon.ammoCount = Math.max(0, weapon.ammoCount - 1);
            // Persist the change to GameState if this is the player character
            if (attacker.id === 'player') {
                const playerChar = gameState.get('character');
                if (playerChar) {
                    playerChar.equipment[weaponSlot] = weapon;
                    gameState.set('character', playerChar);
                }
            }
            if (weapon.ammoCount <= 3 && weapon.ammoCount > 0) {
                gameState.addMessage(`⚠️ Low ammo: ${weapon.ammoCount} shot(s) remaining.`, 'warning');
            } else if (weapon.ammoCount === 0) {
                gameState.addMessage('❌ Out of ammunition! Use a Quiver of Arrows from inventory to reload.', 'error');
            }
            console.log(`🪶 Ammo: ${attacker.name} fired ${weapon.name}. ${weapon.ammoCount} remaining.`);
        }

        if (shouldConsumeAction) {
            attacker.consumeAction(actionType);
        }
        this.updateGameState();
    }

    /**
     * Determine if a combatant is primarily ranged (no opportunity attack on flee).
     * Check equipped weapon first, then fall back to monster attackType field.
     * A 'both' attackType returns false (has melee capability — can make opp attack).
     * @param {Object} combatant - Combatant instance
     * @returns {boolean} true if ranged-only
     */
    isRangedCombatant(combatant) {
        // Check equipped weapon first (weapon-wielding monsters and players)
        const mainHand = combatant.character?.equipment?.mainHand;
        if (mainHand?.weaponType) {
            return mainHand.weaponType === 'ranged';
        }
        // Fall back to monster attackType field
        const attackType = combatant.character?.attackType;
        if (attackType) {
            return attackType === 'ranged'; // 'both' returns false (has melee capability)
        }
        return false; // default to melee
    }

    /**
     * Check if a Wanderlust combatant can use Cunning Action for a bonus-action flee.
     * @param {Object} combatant - Combatant instance
     * @returns {boolean}
     */
    isCunningActionFlee(combatant) {
        const ca = RULES.flee.cunningAction;
        if (!ca) {
            return false;
        }
        const callingId = combatant.character?.class?.id;
        if (callingId !== ca.callingId) {
            return false;
        }
        if ((combatant.character?.level ?? 1) < ca.levelRequired) {
            return false;
        }
        return combatant.hasAction('bonusAction');
    }

    /**
     * Resolve opportunity attacks from engaged melee enemies when a combatant flees.
     * Attacks resolve before the flee check (plan design).
     * @param {Object} combatant - The fleeing combatant
     */
    resolveFleeOpportunityAttacks(combatant) {

        // If combatant disengaged this turn, no OAs fire
        if (combatant.hasCondition('disengaged')) {
            gameState.addMessage(`${combatant.name} disengaged — no opportunity attacks.`, 'info');
            return;
        }

        const oppAttackers = this.combatants.filter(c =>
            c.id !== combatant.id &&
            c.character.currentHP > 0 &&
            c.hp > 0 &&
            combatant.engagedWith.has(c.id) &&
            !this.isRangedCombatant(c) &&
            !c.hasCondition('pushed')
        );

        if (oppAttackers.length === 0) {
            gameState.addMessage('No engaged melee enemies — no opportunity attacks.', 'info');
            return;
        }

        const count = oppAttackers.length;
        gameState.addMessage(
            `⚔️ ${count} ${count === 1 ? 'enemy makes an' : 'enemies make'} opportunity attack${count > 1 ? 's' : ''}!`,
            'warning'
        );

        for (const attacker of oppAttackers) {
            // Stop if the fleeing combatant is already downed
            const target = this.combatants.find(c => c.id === combatant.id);
            if (!target || target.hp <= 0) {
                break;
            }
            // Opportunity attack doesn't consume the attacker's action
            this.attack(attacker, target, 'mainHand', { consumeAction: false, isOpportunityAttack: true });
        }
    }

    /**
     * Attempt to flee from combat
     * New design: d20 + max(DEX, WIS) + proficiency vs DC (10 + 2 * engaged_enemies - 1)
     * Opportunity attacks from engaged melee enemies resolve before the flee check.
     */
    flee(combatant) {
        // --- Action availability check ---
        const isCunningFlee = this.isCunningActionFlee(combatant);
        if (isCunningFlee) {
            if (!combatant.hasAction('bonusAction')) {
                gameState.addMessage(`${combatant.name} has no bonus action remaining!`, 'warning');
                return;
            }
        } else {
            if (!combatant.hasAction('action')) {
                gameState.addMessage(`${combatant.name} has no action remaining!`, 'warning');
                return;
            }
        }

        // --- Per-encounter unfleeable override ---
        const combatState = gameState.get('combat');
        if (combatState?.unfleeable) {
            const msg = combatState.fleeDescription || 'There is no escape from this fight!';
            gameState.addMessage(`⚔️ ${msg}`, 'error');
            return;
        }

        // --- Blocking conditions ---
        const fleeRules = RULES.flee;
        for (const condition of fleeRules.blockingConditions) {
            if (combatant.hasCondition && combatant.hasCondition(condition)) {
                gameState.addMessage(`${combatant.name} cannot flee while ${condition}!`, 'error');
                return;
            }
        }

        // --- Consume action ---
        if (isCunningFlee) {
            combatant.consumeAction('bonusAction');
            gameState.addMessage(`🏃 ${combatant.name} uses Cunning Action to attempt to flee!`, 'info');
        } else {
            combatant.consumeAction('action');
            gameState.addMessage(`🏃 ${combatant.name} attempts to flee!`, 'info');
        }

        // --- Opportunity attacks from engaged melee enemies (resolve BEFORE flee check) ---
        if (fleeRules.opportunityAttacks.enabled) {
            this.resolveFleeOpportunityAttacks(combatant);
        }

        // --- Check if combatant survived opportunity attacks ---
        const updatedCombatant = this.combatants.find(c => c.id === combatant.id);
        if (!updatedCombatant || updatedCombatant.hp <= 0) {
            gameState.addMessage(`💀 ${combatant.name} was cut down while fleeing!`, 'error');
            this.endCombat('defeat');
            return;
        }

        // --- Calculate flee DC ---
        // Use the fleeing combatant's own engagedWith set for DC calculation
        const engagedCount = combatant.engagedWith.size;

        let dc = fleeRules.baseDC + fleeRules.dcPerExtraEnemy * Math.max(0, engagedCount - 1);

        // Situational modifiers
        if (combatState?.isBoss) {
            dc += fleeRules.bossDCBonus;
        }
        if (combatState?.isAmbush && (combatState?.round || 1) <= fleeRules.ambushRoundLimit) {
            dc += fleeRules.ambushDCBonus;
        }
        if (typeof combatState?.fleeModifier === 'number') {
            dc += combatState.fleeModifier;
        }

        dc = Math.min(dc, fleeRules.dcCapMax);

        // --- Flee roll modifier: max(DEX, WIS) + proficiency ---
        // IMPORTANT: use abilityModifiers directly — NOT combatant.initiative (that is d20 + DEX already rolled)
        const dexMod = combatant.character.abilityModifiers?.dex ?? 0;
        const wisMod = combatant.character.abilityModifiers?.wis ?? 0;
        const statMod = Math.max(dexMod, wisMod);
        const profBonus = fleeRules.addProficiency ? (combatant.character.proficiencyBonus ?? 2) : 0;
        const totalMod = statMod + profBonus;

        // --- Advantage / Disadvantage from conditions ---
        let hasAdvantage = false;
        let hasDisadvantage = false;
        if (combatant.hasCondition) {
            for (const cond of fleeRules.advantageConditions) {
                if (combatant.hasCondition(cond)) {
                    hasAdvantage = true;
                }
            }
            for (const cond of fleeRules.disadvantageConditions) {
                if (combatant.hasCondition(cond)) {
                    hasDisadvantage = true;
                }
            }
        }
        // Advantage and disadvantage cancel per 5e RAW
        if (hasAdvantage && hasDisadvantage) {
            hasAdvantage = false;
            hasDisadvantage = false;
        }

        // --- Roll ---
        let fleeRoll;
        let fleeRollDisplay;
        if (hasAdvantage) {
            const r1 = rollD20().result;
            const r2 = rollD20().result;
            fleeRoll = Math.max(r1, r2);
            fleeRollDisplay = fleeRoll;
            gameState.addMessage(`🎲 Flee check (advantage): Rolled ${r1} and ${r2}, using ${fleeRoll}`, 'info');
        } else if (hasDisadvantage) {
            const r1 = rollD20().result;
            const r2 = rollD20().result;
            fleeRoll = Math.min(r1, r2);
            fleeRollDisplay = fleeRoll;
            gameState.addMessage(`🎲 Flee check (disadvantage): Rolled ${r1} and ${r2}, using ${fleeRoll}`, 'info');
        } else {
            const rollObj = rollD20();
            fleeRoll = rollObj.result;
            fleeRollDisplay = fleeRoll;
        }

        const fleeTotal = fleeRoll + totalMod;

        gameState.addMessage(
            `🏃 Flee check: ${fleeRollDisplay} + ${totalMod} (max DEX/WIS + prof) = ${fleeTotal} vs DC ${dc} (${engagedCount} engaged ${engagedCount === 1 ? 'enemy' : 'enemies'})`,
            'info'
        );

        if (fleeTotal >= dc) {
            gameState.addMessage(`✅ ${combatant.name} escapes!`, 'success');
            this.endCombat('fled');
        } else {
            gameState.addMessage(`❌ ${combatant.name} failed to escape!`, 'warning');
            this.updateGameState();
        }
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
     * Disengage action — clears engagement and prevents opportunity attacks this turn.
     * Wanderlust (level 2+) can use Cunning Action to disengage as a bonus action.
     * @param {Combatant} combatant - The combatant taking the Disengage action
     * @returns {{ success: boolean, reason?: string, actionCost?: string, clearedEngagement?: string[] }}
     */
    disengage(combatant) {
        const disengageRules = RULES.combat.disengage;
        if (!disengageRules?.enabled) {
            return { success: false, reason: 'Disengage is disabled.' };
        }

        // Determine if Wanderlust Cunning Action applies
        const isWanderlust = combatant.character?.class?.id === disengageRules.cunningAction?.callingId;
        const level = combatant.character?.level ?? 1;
        const cunningActionAvailable = isWanderlust &&
            level >= (disengageRules.cunningAction?.levelRequired ?? 2) &&
            combatant.hasAction('bonusAction');

        // Determine action cost
        let actionCost = 'action';
        if (cunningActionAvailable) {
            actionCost = 'bonusAction';
        }

        // Check action availability
        if (actionCost === 'action' && !combatant.hasAction('action')) {
            return { success: false, reason: 'No Action available to Disengage.' };
        }
        if (actionCost === 'bonusAction' && !combatant.hasAction('bonusAction')) {
            return { success: false, reason: 'No Bonus Action available to Disengage.' };
        }

        // Consume action
        combatant.consumeAction(actionCost);

        // Apply 'disengaged' condition — clears at start of this combatant's NEXT turn
        // appliedBy = combatant.id so the untilStartOfTurn cleanup fires when their turn starts
        combatant.addCondition('disengaged', 'untilStartOfTurn', combatant.id, {
            isBuff: true,
            curable: false,
            icon: null   // No visible icon — internal-use only
        });

        // Snapshot and clear engagement
        const wasEngagedWith = Array.from(combatant.engagedWith);
        combatant.engagedWith.clear();

        // Build log message
        const engagedNames = wasEngagedWith
            .map(id => this.combatants.find(c => c.id === id)?.name ?? id)
            .join(', ');
        const actionWord = actionCost === 'bonusAction' ? 'Bonus Action' : 'Action';

        if (wasEngagedWith.length > 0) {
            gameState.addMessage(
                `🏃 ${combatant.name} disengages (${actionWord}) — engagement cleared with ${engagedNames}. No opportunity attacks this turn.`,
                'info'
            );
        } else {
            gameState.addMessage(`🏃 ${combatant.name} disengages (${actionWord}).`, 'info');
        }

        console.log(`🏃 ${combatant.name} disengaged. Was engaged with: [${engagedNames}]`);

        this.updateGameState();

        return { success: true, actionCost, clearedEngagement: wasEngagedWith };
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
     * Clear a combatant from all engagement sets when they are removed from combat.
     * @param {Combatant} defeatedCombatant
     */
    clearEngagement(defeatedCombatant) {
        this.combatants.forEach(other => {
            other.engagedWith.delete(defeatedCombatant.id);
        });
        defeatedCombatant.engagedWith.clear();
        console.log(`⚔️ Engagement cleared for ${defeatedCombatant.name}`);
    }

    /**
     * Handle combatant defeat
     */
    handleDefeat(combatant) {
        // Clear engagement for the defeated combatant
        this.clearEngagement(combatant);

        // Check for combat end
        if (combatant.team === 'player') {
            this.endCombat('defeat');
        } else if (combatant.team === 'companion') {
            // Companions go "downed" rather than dying outright (CompanionManager handles post-combat fate)
            combatant.isDowned = true;
            if (combatant.sourceCharacter) {
                combatant.sourceCharacter.companionMeta.isDowned = true;
            }
            // Remove from turn order so they don't get future turns
            this.turnOrder = this.turnOrder.filter(c => c.id !== combatant.id);
            gameState.addMessage(`💔 ${combatant.name} is downed!`, 'error');
            if (window.game?.showFloatingCombatText) {
                window.game.showFloatingCombatText(combatant.id, 'DOWNED!', 'condition');
            }
            console.log(`👥 Companion ${combatant.name} downed. sourceCharacter.companionMeta.isDowned = true`);
            // Update game state so UI reflects the downed status
            this.updateGameState();
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
    async endTurn() {
        const combatant = this.getCurrentCombatant();
        if (combatant) {
            combatant.endTurn();
        }

        // Clear companion turn flags when any turn ends
        gameState.set('combat.isCompanionTurn', false);
        gameState.set('combat.activeCompanionId', null);

        // Legendary action: After a non-boss combatant's turn, a boss can use a legendary action
        if (combatant && this.active) {
            await this.processLegendaryActions(combatant);
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

            // Only update combat state if combat is still active
            if (this.active && gameState.get('combat')) {
                gameState.set('combat.round', this.round);
            }
        }

        // Start next turn (only if combat still active)
        if (this.active) {
            this.startTurn();
        }
    }

    /**
     * Process legendary actions — boss uses one after each non-boss combatant's turn
     */
    async processLegendaryActions(justActedCombatant) {
        // Find alive boss combatants with legendary actions remaining
        const bosses = this.combatants.filter(c =>
            c.hp > 0 &&
            c.legendaryActionsRemaining > 0 &&
            c.legendaryActionsList.length > 0 &&
            c.id !== justActedCombatant.id // Boss doesn't use legendary action on its own turn
        );

        for (const boss of bosses) {
            // Pick a legendary action the boss can afford
            const affordableActions = boss.legendaryActionsList.filter(a =>
                (a.cost || 1) <= boss.legendaryActionsRemaining
            );

            if (affordableActions.length === 0) {
                continue;
            }

            // AI: prefer attack-type actions
            const attackActions = affordableActions.filter(a => a.attackBonus !== undefined);
            const chosen = attackActions.length > 0
                ? attackActions[Math.floor(Math.random() * attackActions.length)]
                : affordableActions[Math.floor(Math.random() * affordableActions.length)];

            const cost = chosen.cost || 1;
            boss.legendaryActionsRemaining -= cost;

            gameState.addMessage(`🐉 ${boss.name} uses Legendary Action: ${chosen.name}! (${boss.legendaryActionsRemaining} remaining)`, 'danger');

            // Find target (the player, or the combatant that just acted if enemy)
            const target = this.playerCombatant.hp > 0 ? this.playerCombatant : null;
            if (!target) {
                continue;
            }

            if (chosen.attackBonus !== undefined && chosen.damage) {
                // Attack-type legendary action
                await this.executeMonsterAttack(boss, target, chosen);
            } else if (chosen.description) {
                // Save-based legendary action (e.g., Wing Attack)
                const special = {
                    name: chosen.name,
                    damage: chosen.damage || '2d6+4',
                    damageType: chosen.damageType || 'bludgeoning',
                    description: chosen.description
                };
                await this.executeSpecialMonsterAction(boss, target, special);
            }

            await new Promise(resolve => setTimeout(resolve, 600));
        }
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

        this.coverType = null;
        this.coverWinner = null;

        // Clean up all combat-only conditions and mastery effects
        this.combatants.forEach(combatant => {
            // Clean up conditions with 'combat' or 'untilStartOfTurn'/'untilEndOfTurn' duration
            // Also remove tempHP (any duration) — temp HP is lost after combat
            // Note: 'rounds' duration conditions (like prone) are handled by auto-countdown and don't need explicit cleanup
            const conditionsToRemove = combatant.conditions.filter(c =>
                c.duration === 'combat' ||
                c.duration === 'untilStartOfTurn' ||
                c.duration === 'untilEndOfTurn' ||
                c.type === 'tempHP'
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

        // Clear companion turn flags regardless of outcome
        gameState.set('combat.isCompanionTurn', false);
        gameState.set('combat.activeCompanionId', null);

        // Fatigue from combat encounter (applies regardless of outcome)
        addFatigue(RULES.fatigue.combatEncounterFatigue, 'combat');

        if (result === 'victory') {
            const character = gameState.get('character');

            // Award XP
            const xpGained = this.calculateXPReward();
            character.xp += xpGained;

            // Check for level up (guard for deserialized plain objects)
            let leveledUp = false;
            if (typeof character.checkLevelUp === 'function') {
                leveledUp = character.checkLevelUp();
            } else {
                console.warn('Character.checkLevelUp is missing; ensure character is properly rehydrated from save.');
            }

            // Generate loot from defeated enemies
            let totalGold = 0;
            const allLootItems = [];
            const lootMessages = [];

            if (window.lootManager) {
                const worldSeed = gameState.get('seed');
                const rng = new SeededRandom(`${worldSeed}_combat_${Date.now()}`);

                // Ensure gold is a valid number before awarding more
                character.gold = Number(character.gold) || 0;

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

                            // Store loot message for later
                            const itemNames = loot.items.map(i => i.name + (i.quantity > 1 ? ` (${i.quantity})` : '')).join(', ');
                            const lootMessage = `${enemy.name} dropped: ${loot.gold}g${itemNames ? `, ${  itemNames}` : ''}`;
                            lootMessages.push(lootMessage);
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
                const playerPos = gameState.get('player.position');
                this.enemyCombatants.forEach(enemy => {
                    if (enemy.hp <= 0) {
                        // Get creature type ID (race.id or monster type)
                        const creatureId = enemy.character.race?.id || enemy.character.type || 'unknown';
                        window.questManager.onCreatureKilled(creatureId, playerPos);
                    }
                });
            }

            // Check if this was a boss fight victory
            const wasBossFight = this.enemyCombatants.some(e => e.character?.isBoss);
            if (wasBossFight && window.game?.dungeonManager) {
                window.game.dungeonManager.markBossDefeated();
            }

            // Update character state
            gameState.set('character', character);

            // Store combat result for challenge resumption
            gameState.set('lastCombatResult', 'victory');

            // Emit combat.ended event so CompanionManager can handle post-combat logic
            // (auto-stabilize downed companions, fire relationship events, etc.)
            gameState.notify('combat.ended', { outcome: 'victory' });
            console.log('⚔️ combat.ended emitted: victory');

            // Show victory modal
            this.showVictoryModal(xpGained, character.xp, leveledUp, totalGold, allLootItems, lootMessages);

            // Return to exploration after delay
            gameState.set('combat', null);
        } else if (result === 'defeat') {
            gameState.addMessage('💀 You have been defeated...', 'error');
            gameState.addMessage('🎮 Game Over', 'error');

            // Store combat result for challenge resumption
            gameState.set('lastCombatResult', 'defeat');

            // Emit combat.ended event (tpk — permanent death for downed companions)
            gameState.notify('combat.ended', { outcome: 'tpk' });
            console.log('⚔️ combat.ended emitted: tpk');

            // Show game over screen
            gameState.set('combat', null);
            setTimeout(() => {
                this.showGameOver();
            }, 2000);
        } else if (result === 'fled') {
            gameState.addMessage('🏃 You have escaped from combat!', 'warning');

            // Store combat result for challenge resumption
            gameState.set('lastCombatResult', 'fled');

            // Emit combat.ended event (fled — permanent death for downed companions per Decision 3)
            gameState.notify('combat.ended', { outcome: 'fled' });
            console.log('⚔️ combat.ended emitted: fled');

            // Return to appropriate screen after delay (dungeon if in dungeon, otherwise world map)
            gameState.set('combat', null);
            setTimeout(() => {
                const dungeonState = gameState.get('dungeon');
                if (dungeonState?.active) {
                    gameState.set('ui.currentScreen', 'dungeonScreen');
                } else {
                    gameState.set('ui.currentScreen', 'game');
                }
            }, 2000);
        }
    }

    /**
     * Show victory modal with loot summary
     */
    showVictoryModal(xpGained, totalXP, leveledUp, totalGold, allLootItems, lootMessages) {
        const modalOverlay = document.getElementById('modalOverlay');
        const modalContent = document.getElementById('modalContent');

        if (modalOverlay && modalContent) {
            // Build loot summary
            let lootSummary = '';
            if (totalGold > 0 || allLootItems.length > 0) {
                lootSummary = '<div style="margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px; text-align: left;">';
                lootSummary += '<h3 style="color: var(--accent-color); margin-bottom: 10px;">💰 Loot:</h3>';

                if (totalGold > 0) {
                    lootSummary += `<p style="color: var(--warning-color); margin: 5px 0;">+${totalGold} gold</p>`;
                }

                if (allLootItems.length > 0) {
                    allLootItems.forEach(item => {
                        const quantity = item.quantity > 1 ? ` (x${item.quantity})` : '';
                        lootSummary += `<p style="color: var(--success-color); margin: 5px 0;">• ${item.name}${quantity}</p>`;
                    });
                }

                lootSummary += '</div>';
            }

            // Build "Those We Lost" section (populated by party system UI helper)
            const fallenSection = window.game?.buildFallenCompanionsHTML?.() || '';

            modalContent.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <h2 style="color: var(--success-color); font-size: 3rem; margin-bottom: 20px;">🎉 VICTORY! 🎉</h2>
                    <p style="font-size: 1.2rem; margin-bottom: 20px;">All enemies defeated!</p>

                    <div style="margin: 20px 0; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px;">
                        <p style="font-size: 1.1rem; color: var(--accent-color); margin: 10px 0;">
                            +${xpGained} XP
                        </p>
                        <p style="color: var(--text-secondary); margin: 5px 0;">
                            Total XP: ${totalXP}
                        </p>
                        ${leveledUp ? '<p style="color: var(--warning-color); font-size: 1.2rem; margin-top: 10px;">⭐ LEVEL UP! ⭐</p>' : ''}
                    </div>

                    ${lootSummary}

                    ${fallenSection}

                    <button class="menu-btn" id="victoryContinueBtn" style="margin: 30px auto 0;">
                        Continue
                    </button>
                </div>
            `;
            modalOverlay.classList.add('active');

            // Add click handler to continue button
            setTimeout(() => {
                const continueBtn = document.getElementById('victoryContinueBtn');
                if (continueBtn) {
                    continueBtn.addEventListener('click', () => {
                        modalOverlay.classList.remove('active');

                        // Add loot messages to message log AFTER modal closes
                        gameState.addMessage('🎉 Victory! All enemies defeated!', 'success');
                        gameState.addMessage(`+${xpGained} XP (${totalXP} total)`, 'success');

                        if (leveledUp) {
                            const character = gameState.get('character');
                            gameState.addMessage(`🎉 Level Up! You are now level ${character.level}!`, 'success');
                        }

                        // Add loot messages
                        lootMessages.forEach(msg => {
                            gameState.addMessage(msg, 'success');
                        });

                        // Return to appropriate screen (dungeon if in dungeon, otherwise world map)
                        setTimeout(() => {
                            const dungeonState = gameState.get('dungeon');
                            if (dungeonState?.active) {
                                gameState.set('ui.currentScreen', 'dungeonScreen');
                            } else {
                                gameState.set('ui.currentScreen', 'game');
                            }
                        }, 100);
                    });
                }
            }, 100);
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
            // Build "Those We Lost" section (includes downed companions who died in this combat)
            const fallenSection = window.game?.buildFallenCompanionsHTML?.() || '';

            modalContent.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <h2 style="color: var(--danger-color); font-size: 3rem; margin-bottom: 20px;">💀 GAME OVER 💀</h2>
                    <p style="font-size: 1.2rem; margin-bottom: 30px;">You have been defeated in combat.</p>
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">Your adventure ends here.</p>
                    ${fallenSection}
                    <button class="menu-btn" onclick="location.reload()" style="margin: 30px auto 0;">
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
            const cr = enemy.character.cr || enemy.character.challengeRating || 0.25;
            let xp = this.getXPByCR(cr);
            // Boss monsters give multiplied XP
            if (enemy.character.isBoss) {
                xp = Math.floor(xp * (RULES.encounters.bossBuffs?.xpMultiplier || 2));
            }
            totalXP += xp;
        });
        return totalXP;
    }

    /**
     * Get XP by CR (Challenge Rating)
     */
    getXPByCR(cr) {
        const xpTable = RULES.encounters.xpByCR || {
            0: 10, 0.125: 25, 0.25: 50, 0.5: 100,
            1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800,
            6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900
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
        if (!combatant.character.weaponMasteries) {
            return false;
        }
        if (!weapon) {
            return false;
        }

        // Mastery must be assigned to this specific weapon
        const assignedMastery = this.weaponMasteryAssignments[weapon.id];
        if (!assignedMastery || assignedMastery !== masteryId) {
            return false;
        }

        // Character must actually know the mastery
        if (!combatant.character.weaponMasteries.includes(masteryId)) {
            return false;
        }

        // Honor proficiency requirement toggle from data
        if (this.weaponMasteryProficiencyRequired && !combatant.character.isProficientWithWeapon(weapon)) {
            return false;
        }

        return true;
    }

    /**
     * Check if a combatant has a specific Forgecraft mod on any equipment slot
     */
    hasForgecraftMod(combatant, modId) {
        const mods = combatant.character?.equipmentMods;
        if (!mods) {
            return false;
        }
        return Object.values(mods).some(m => m.modId === modId);
    }

    /**
     * Check if a combatant has a Forgecraft mod on a specific weapon slot
     */
    hasForgecraftModOnSlot(combatant, slot, modId) {
        return combatant.character?.equipmentMods?.[slot]?.modId === modId;
    }

    /**
     * Get adjacent enemy for Cleave mastery
     * @param {Combatant} defender - The enemy that was just hit
     * @returns {Combatant|null} - The adjacent enemy (next in enemy list)
     */
    getAdjacentEnemy(defender) {
        // Parse enemy index from ID (e.g., "enemy_0" → 0)
        const match = defender.id.match(/enemy_(\d+)/);
        if (!match) {
            return null;
        }

        const currentIndex = parseInt(match[1]);
        const nextIndex = currentIndex + 1;
        const nextId = `enemy_${nextIndex}`;

        // Find the next enemy
        const adjacentEnemy = this.enemyCombatants.find(c => c.id === nextId);

        return adjacentEnemy || null;
    }

    /**
     * Maneuver save DC = 8 + proficiency + max(STR, DEX) for a player combatant
     */
    getManeuverSaveDC(attacker) {
        const char = attacker.character;
        const strMod = char.abilityModifiers?.str || 0;
        const dexMod = char.abilityModifiers?.dex || 0;
        const profBonus = char.proficiencyBonus || 2;
        return 8 + profBonus + Math.max(strMod, dexMod);
    }

    /**
     * Execute an on-hit maneuver effect (tripAttack, menacingAttack, pushingAttack, disarmingAttack)
     * Adds maneuver die damage + applies condition on failed save.
     */
    executeOnHitManeuver(maneuverType, attacker, defender, dieRoll, dieSides, saveDC) {
        const strSave  = () => rollD20().result + (defender.character?.abilityModifiers?.str || 0);
        const wisSave  = () => rollD20().result + (defender.character?.abilityModifiers?.wis || 0);

        switch (maneuverType) {
            case 'tripAttack': {
                defender.takeDamage(dieRoll);
                gameState.addMessage(`⚔️ Trip Attack! +${dieRoll} extra damage (d${dieSides})`, 'success');
                const save = strSave();
                if (save < saveDC) {
                    defender.addCondition('prone', 'combat', attacker.id, { isBuff: false, curable: false, icon: '🔻' });
                    gameState.addMessage(`🔻 ${defender.name} is PRONE! (STR save ${save} vs DC ${saveDC})`, 'warning');
                    if (window.game?.showFloatingCombatText) {
                        window.game.showFloatingCombatText(defender.id, 'PRONE! 🔻', 'condition');
                    }
                } else {
                    gameState.addMessage(`${defender.name} resists the trip (STR save ${save} vs DC ${saveDC})`, 'info');
                }
                break;
            }
            case 'menacingAttack': {
                defender.takeDamage(dieRoll);
                gameState.addMessage(`⚔️ Menacing Attack! +${dieRoll} extra damage (d${dieSides})`, 'success');
                const save = wisSave();
                if (save < saveDC) {
                    defender.addCondition('frightened', 'untilEndOfTurn', attacker.id, { isBuff: false, curable: false, icon: '😱' });
                    gameState.addMessage(`😱 ${defender.name} is FRIGHTENED until end of their turn! (WIS save ${save} vs DC ${saveDC})`, 'warning');
                    if (window.game?.showFloatingCombatText) {
                        window.game.showFloatingCombatText(defender.id, 'FRIGHTENED! 😱', 'condition');
                    }
                } else {
                    gameState.addMessage(`${defender.name} resists fear (WIS save ${save} vs DC ${saveDC})`, 'info');
                }
                break;
            }
            case 'pushingAttack': {
                defender.takeDamage(dieRoll);
                gameState.addMessage(`⚔️ Pushing Attack! +${dieRoll} extra damage (d${dieSides})`, 'success');
                const save = strSave();
                if (save < saveDC) {
                    defender.addCondition('pushed', 'untilEndOfTurn', attacker.id, { isBuff: false, curable: false, icon: '💨' });
                    gameState.addMessage(`💨 ${defender.name} is PUSHED back! (STR save ${save} vs DC ${saveDC})`, 'warning');
                    if (window.game?.showFloatingCombatText) {
                        window.game.showFloatingCombatText(defender.id, 'PUSHED! 💨', 'condition');
                    }
                } else {
                    gameState.addMessage(`${defender.name} resists being pushed (STR save ${save} vs DC ${saveDC})`, 'info');
                }
                break;
            }
            case 'disarmingAttack': {
                defender.takeDamage(dieRoll);
                gameState.addMessage(`⚔️ Disarming Attack! +${dieRoll} extra damage (d${dieSides})`, 'success');
                const save = strSave();
                if (save < saveDC) {
                    defender.addCondition('disarmed', 'untilStartOfTurn', attacker.id, { value: -2, isBuff: false, curable: false, icon: '🗡️' });
                    gameState.addMessage(`🗡️ ${defender.name} is DISARMED! -2 to attacks until their next turn. (STR save ${save} vs DC ${saveDC})`, 'warning');
                    if (window.game?.showFloatingCombatText) {
                        window.game.showFloatingCombatText(defender.id, 'DISARMED! 🗡️', 'condition');
                    }
                } else {
                    gameState.addMessage(`${defender.name} keeps hold of their weapon (STR save ${save} vs DC ${saveDC})`, 'info');
                }
                break;
            }
        }
    }

    /**
     * Load weapon mastery assignments and proficiency rule from data file
     */
    async loadWeaponMasteryData() {
        if (this.weaponMasteryDataLoaded) {
            return;
        }

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
     * Improvised Strike — PHB RAW: any held object used as improvised weapon deals 1d4 bludgeoning.
     * Attack roll uses STR modifier only (no proficiency bonus, no weapon mastery).
     * @param {Object} attacker - Attacking combatant (must be on player team)
     * @param {Object} defender - Defending combatant
     */
    async improvisedStrike(attacker, defender) {
        if (!attacker.hasAction('action')) {
            gameState.addMessage(`${attacker.name} has no action available!`, 'error');
            return;
        }

        const strMod = attacker.character.abilityModifiers?.str ?? 0;

        gameState.addMessage(`${attacker.name} makes an improvised strike against ${defender.name}!`, 'warning');

        // Attack roll: d20 + STR mod only (no proficiency bonus)
        const attackRollObj = rollD20();
        const attackTotal = attackRollObj.result + strMod;

        let attackMsg = `🎲 Improvised strike: Rolled ${attackRollObj.result}`;
        if (strMod !== 0) {
            attackMsg += ` + ${strMod} (STR)`;
        }
        attackMsg += ` = ${attackTotal} vs AC ${defender.ac}`;
        gameState.addMessage(attackMsg, 'info');

        if (attackRollObj.result === 1) {
            // Critical miss
            gameState.addMessage('💥 Critical miss!', 'error');
            if (window.game?.showFloatingCombatText) {
                window.game.showFloatingCombatText(defender.id, 'CRITICAL MISS!', 'miss');
            }
            audioManager.playCombatSound({ weaponType: 'melee', hit: false, critical: true });
        } else if (attackTotal >= defender.ac || attackRollObj.result === 20) {
            // Hit (natural 20 always hits)
            const isCritical = attackRollObj.result === 20;
            let dmg = rollDice(1, 4);
            if (isCritical) {
                dmg += rollDice(1, 4); // Double dice on crit
                gameState.addMessage('⭐ Critical hit!', 'success');
            }
            const damage = Math.max(1, dmg);

            gameState.addMessage(
                `✊ Hit! Improvised strike deals ${damage} bludgeoning damage.`,
                attacker.team === 'player' ? 'success' : 'error'
            );

            if (window.game?.showFloatingCombatText) {
                window.game.showFloatingCombatText(defender.id, `-${damage}`, isCritical ? 'critical' : 'damage');
            }

            audioManager.playCombatSound({ weaponType: 'melee', hit: true, critical: isCritical });
            defender.takeDamage(damage);

            if (defender.hp <= 0) {
                gameState.addMessage(`💀 ${defender.name} is defeated!`, 'warning');
                setTimeout(() => {
                    audioManager.play('death');
                }, 1000);
                this.handleDefeat(defender);
            }
        } else {
            // Miss
            gameState.addMessage(`💨 Miss! Improvised strike misses ${defender.name}.`, 'info');
            if (window.game?.showFloatingCombatText) {
                window.game.showFloatingCombatText(defender.id, 'MISS', 'miss');
            }
            audioManager.playCombatSound({ weaponType: 'melee', hit: false, critical: false });
        }

        // Consume action
        attacker.consumeAction('action');
        this.updateGameState();
    }

    /**
     * Update game state with current combat data
     */
    updateGameState() {
        if (!this.active) {
            return;
        }

        // Determine current companion turn state
        const currentCombatant = this.getCurrentCombatant();
        const isCompanionTurn = currentCombatant?.team === 'companion';
        const activeCompanionId = isCompanionTurn ? currentCombatant.id : null;

        gameState.set('combat', {
            active: true,
            round: this.round,
            currentTurn: currentCombatant?.id,
            combatants: this.combatants.map(c => c.toJSON()),
            coverType: this.coverType,
            coverWinner: this.coverWinner,
            isCompanionTurn,
            activeCompanionId
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
        this.hp = character.currentHP !== null && character.currentHP !== undefined ? character.currentHP : character.maxHP;
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

        // Queued maneuver: set before attacking, consumed on attack resolution
        // e.g., 'precisionStrike' | 'tripAttack' | 'menacingAttack' | etc.
        this.pendingManeuver = null;

        // Weapon mastery effects (legacy - kept for backwards compatibility)
        this.masteryEffects = {
            sapped: false,          // DEPRECATED: Use conditions system. Has disadvantage on next attack (Sap mastery)
            slowedBy: null,         // DEPRECATED: Use conditions system. AC reduced by 1 until start of attacker's turn (Slow mastery)
            vexed: null,            // DEPRECATED: Use conditions system. Has advantage on next attack vs specific target (Vex mastery)
            prone: false            // DEPRECATED: Use conditions system. Knocked prone (Topple mastery)
        };

        // Engagement tracking for flee mechanic and opportunity attacks.
        // Contains IDs of combatants this combatant is currently engaged with (bidirectional, many-to-many).
        this.engagedWith = new Set();

        // Downed tracking for companions (goes to 0 HP but not permanently dead until post-combat)
        // Only meaningful for team === 'companion'; enemies and player use the normal defeat flow.
        this.isDowned = false;

        // Back-reference to the original companion Character object (set by startCombat for companions)
        // Used to write isDowned state back after combat resolves
        this.sourceCharacter = null;

        // Legendary actions (boss monsters only)
        const legendary = character.legendaryActions;
        if (legendary && legendary.count) {
            this.legendaryActionsMax = legendary.count;
            this.legendaryActionsRemaining = legendary.count;
            this.legendaryActionsList = legendary.actions || [];
        } else {
            this.legendaryActionsMax = 0;
            this.legendaryActionsRemaining = 0;
            this.legendaryActionsList = [];
        }
    }

    /**
     * Backward-compat getter — true when this combatant is engaged with at least one other.
     * Replaces the old boolean `hasEngaged` property.
     */
    get hasEngaged() {
        return this.engagedWith.size > 0;
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
            // tempHP: keep the higher value (D&D 5e rule — they don't stack, but new pool can replace)
            if (type === 'tempHP' && options.value !== null && options.value !== undefined && options.value > (existing.value || 0)) {
                existing.value = options.value;
                existing.roundsRemaining = options.roundsRemaining ?? existing.roundsRemaining;
                existing.duration = duration;
            }
            return false; // Already has this condition (or updated)
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
        if (this.conditions.length === 0) {
            return '';
        }

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
        const hasDisadvantage = disadvantage;

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
        let total = roll + abilityMod + profBonus;

        // Forgecraft: Deflecting mod — use reaction to add shield AC to saving throw
        let deflectingBonus = 0;
        const mods = this.character?.equipmentMods;
        if (mods) {
            const hasDeflecting = Object.values(mods).some(m => m.modId === 'deflecting');
            if (hasDeflecting && this.actions?.reaction > 0) {
                const shield = this.character.equipment?.offHand;
                if (shield?.type === 'shield' && shield?.armorClassBonus) {
                    deflectingBonus = shield.armorClassBonus;
                    this.actions.reaction -= 1;
                    total += deflectingBonus;
                    gameState.addMessage(
                        `🛡️ Deflecting! ${this.name} uses reaction to add +${deflectingBonus} (shield) to saving throw!`,
                        'success'
                    );
                }
            }
        }

        // Message
        const abilityName = ability.toUpperCase();
        const profText = isProficient ? ' (proficient)' : '';
        let saveMsg = `${abilityName} save${profText}: ${roll} + ${abilityMod + profBonus}`;
        if (deflectingBonus > 0) {
            saveMsg += ` + ${deflectingBonus} (deflecting)`;
        }
        saveMsg += ` = ${total} vs DC ${dc}`;
        gameState.addMessage(saveMsg, 'info');

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
     * Take damage — absorbs through tempHP condition first
     */
    takeDamage(amount) {
        let remaining = amount;

        // TempHP absorbs damage first (D&D 5e rule)
        const tempHPCondition = this.getCondition('tempHP');
        if (tempHPCondition && tempHPCondition.value > 0) {
            const absorbed = Math.min(tempHPCondition.value, remaining);
            tempHPCondition.value -= absorbed;
            remaining -= absorbed;
            if (tempHPCondition.value <= 0) {
                this.removeCondition('tempHP', true);
                gameState.addMessage(`🛡️ ${this.name}'s temporary HP is depleted!`, 'info');
            } else {
                gameState.addMessage(`🛡️ ${this.name}'s temporary HP absorbs ${absorbed} damage! (${tempHPCondition.value} remaining)`, 'info');
            }
        }

        this.hp = Math.max(0, this.hp - remaining);

        // Update character
        if (this.team === 'player') {
            gameState.set('character.currentHP', this.hp);
        }
    }

    /**
     * Heal
     * If a downed companion receives healing that brings them above 0 HP, they are revived.
     * @param {number} amount - Amount to heal
     * @param {CombatManager} combatManager - Reference to manager (needed for turn order re-insertion)
     */
    heal(amount, combatManager = null) {
        const newHP = Math.min(this.maxHP, this.hp + amount);

        // Revive downed companion when healing brings them above 0
        if (this.isDowned && newHP > 0 && this.team === 'companion') {
            this.isDowned = false;
            if (this.sourceCharacter) {
                this.sourceCharacter.companionMeta.isDowned = false;
            }
            this.hp = newHP;

            // Re-insert into turn order after the current combatant
            if (combatManager) {
                const currentIdx = combatManager.turnOrder.indexOf(combatManager.getCurrentCombatant());
                const insertAt = currentIdx >= 0 ? currentIdx + 1 : combatManager.turnOrder.length;
                combatManager.turnOrder.splice(insertAt, 0, this);
            }

            gameState.addMessage(`💚 ${this.name} is back in the fight!`, 'success');
            console.log(`👥 Companion ${this.name} revived from downed state.`);
        } else {
            this.hp = newHP;
        }

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
            masteryEffects: { ...this.masteryEffects },
            engagedWith: Array.from(this.engagedWith)
        };
    }
}

export { CombatManager, Combatant };
export default CombatManager;
