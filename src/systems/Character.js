/**
 * Character Class - D&D 5e Character System
 * Handles both player characters and NPCs with full D&D mechanics
 */

import { generateUUID } from '../utils/helpers.js';
import { getAbilityModifier, getProficiencyBonus, rollHitPoints, roll } from '../utils/dice.js';
import { getProficiencyBonus as getRulesProfBonus, getLevelFromXP, isASILevel, RULES } from '../core/rulesEngine.js';

export class Character {
    constructor(data) {
        // Core identity
        this.id = data.id || generateUUID();
        this.name = data.name;
        this.avatar = data.avatar || null;
        this.race = data.race;           // Race object from races.json
        this.class = data.class;         // Class object from classes.json
        this.background = data.background; // Background object from backgrounds.json
        this.fightingStyle = data.fightingStyle || null; // Fighting style choice (if applicable)
        this.level = data.level || 1;
        this.xp = data.xp || 0;

        // Ability scores (base scores before racial bonuses)
        this.baseAbilities = data.baseAbilities || {
            str: 10,
            dex: 10,
            con: 10,
            int: 10,
            wis: 10,
            cha: 10
        };

        // Calculate final abilities (with racial bonuses)
        this.abilities = this.calculateAbilities();

        // Calculated stats
        this.proficiencyBonus = getRulesProfBonus(this.level);
        this.abilityModifiers = this.calculateAbilityModifiers();

        // Hit Points
        this.maxHP = data.maxHP || this.calculateMaxHP();
        this.currentHP = data.currentHP !== undefined ? data.currentHP : this.maxHP;
        this.tempHP = data.tempHP || 0;

        // Hit Dice
        this.hitDice = {
            current: data.hitDice?.current !== undefined ? data.hitDice.current : this.level,
            max: this.level,
            size: this.class.hitDie
        };

        // Initialize equipment BEFORE AC calculation (AC needs equipment data)
        // Gold
        this.gold = data.gold !== undefined ? data.gold : 0;

        // Inventory
        this.inventory = data.inventory || [];

        // Equipment slots
        this.equipment = {
            mainHand: null,
            offHand: null,
            armor: null,
            helmet: null,
            artifact: null
        };

        // Equipment will be applied after construction via applyStartingEquipment()
        // This is async, so it must be called externally
        if (data.equipment) {
            this.equipment = data.equipment;
        }

        // Armor Class (calculated AFTER equipment is initialized)
        this.baseAC = 10; // Base AC
        this.armorBonus = 0;
        this.shieldBonus = 0;
        this.ac = data.ac || this.calculateAC();

        // Attack bonuses (calculated from equipped weapons)
        this.mainHandAttackBonus = data.mainHandAttackBonus || 0;
        this.offHandAttackBonus = data.offHandAttackBonus || 0;

        // Speed
        this.speed = data.speed || this.calculateSpeed();

        // Initiative
        this.initiative = this.abilityModifiers.dex;

        // Proficiencies
        this.proficiencies = this.initializeProficiencies();

        // Track chosen skill proficiencies (needed for save/load)
        this.skillChoices = data.skillChoices || [];

        // Skills (proficiency tracking and bonuses)
        this.skills = this.initializeSkills(this.skillChoices);

        // Saving throws
        this.savingThrows = this.initializeSavingThrows();

        // Spellcasting (if applicable)
        this.spellcasting = null;
        if (this.class.spellcaster) {
            this.spellcasting = this.initializeSpellcasting();
        }

        // Class features
        this.features = this.getClassFeatures();

        // Racial traits
        this.racialTraits = this.race.traits || [];

        // Background feature
        this.backgroundFeature = this.background?.feature || null;

        // Weapon Masteries
        this.weaponMasteries = data.weaponMasteries || [];

        // Status conditions
        this.conditions = data.conditions || [];
        this.effects = data.effects || [];

        // Combat state
        this.combatState = null;

        // NPC-specific
        this.isNPC = data.isNPC || false;
        this.isHostile = data.isHostile || false;
        this.faction = data.faction || null;

        // Position (for world map)
        this.position = data.position || { x: 0, y: 0 };

        // Rest tracking
        this.shortRestsUsed = data.shortRestsUsed || 0;
        this.lastLongRest = data.lastLongRest || Date.now();

        // Traversal abilities (for impassable terrain navigation)
        this.traversalAbilities = data.traversalAbilities || ['swimming']; // Base ability for all characters

        // Exhaustion tracking (D&D 5e exhaustion levels 0-6)
        this.exhaustionLevel = data.exhaustionLevel || 0;
        this.injuries = data.injuries || [];

        // Currency
        this.gold = data.gold !== undefined ? data.gold : (this.background?.startingGold || 150);

        // Ability uses tracking (for abilities with limited uses)
        this.abilityUses = data.abilityUses || {};

        // Level-up state (pending changes until player confirms)
        this.pendingLevelUp = data.pendingLevelUp || null;
        this.levelUpSelections = data.levelUpSelections || null;

        // Selected abilities/traits/practices (from level-up choices)
        this.selectedAbilities = data.selectedAbilities || [];
        this.selectedTraits = data.selectedTraits || [];
        this.practices = data.practices || [];
        this.equipmentMods = data.equipmentMods || {};
    }

    /**
     * Calculate final ability scores with racial bonuses
     */
    calculateAbilities() {
        const abilities = { ...this.baseAbilities };

        if (this.race?.abilityScoreIncrease) {
            for (const [ability, bonus] of Object.entries(this.race.abilityScoreIncrease)) {
                abilities[ability] = (abilities[ability] || 10) + bonus;
            }
        }

        // Cap at 20 (standard D&D rule)
        for (const ability in abilities) {
            abilities[ability] = Math.min(20, abilities[ability]);
        }

        return abilities;
    }

    /**
     * Calculate ability modifiers from ability scores
     */
    calculateAbilityModifiers() {
        return {
            str: getAbilityModifier(this.abilities.str),
            dex: getAbilityModifier(this.abilities.dex),
            con: getAbilityModifier(this.abilities.con),
            int: getAbilityModifier(this.abilities.int),
            wis: getAbilityModifier(this.abilities.wis),
            cha: getAbilityModifier(this.abilities.cha)
        };
    }

    /**
     * Calculate maximum HP
     */
    calculateMaxHP() {
        // First level: max hit die + CON modifier
        let hp = this.class.hitDie + this.abilityModifiers.con;

        // Additional levels: roll or take average
        for (let level = 2; level <= this.level; level++) {
            hp += rollHitPoints(this.class.hitDie, this.abilityModifiers.con, true);
        }

        return Math.max(1, hp); // Minimum 1 HP
    }

    /**
     * Calculate Armor Class
     */
    calculateAC() {
        let ac = this.baseAC;

        // Armor
        if (this.equipment.armor) {
            const armor = this.equipment.armor;
            ac = armor.armorClass;

            // Add DEX modifier if allowed
            if (armor.addDexModifier) {
                const dexBonus = armor.maxDexBonus !== null
                    ? Math.min(this.abilityModifiers.dex, armor.maxDexBonus)
                    : this.abilityModifiers.dex;
                ac += dexBonus;
            }
        } else {
            // No armor: 10 + DEX modifier
            ac = 10 + this.abilityModifiers.dex;
        }

        // Shield (shields are equipped in offHand slot)
        if (this.equipment.offHand && this.equipment.offHand.type === 'shield') {
            ac += this.equipment.offHand.armorClassBonus || 0;
        }

        // Other bonuses (magic items, spells, etc.)
        ac += this.armorBonus;

        return ac;
    }

    /**
     * Calculate speed
     */
    calculateSpeed() {
        return this.race?.speed || 30;
    }

    /**
     * Initialize proficiencies
     */
    initializeProficiencies() {
        return {
            armor: this.class.armorProficiencies || [],
            weapons: this.class.weaponProficiencies || [],
            tools: this.class.toolProficiencies || [],
            languages: this.race?.languages || []
        };
    }

    /**
     * Initialize skills with proficiency tracking
     */
    initializeSkills(chosenSkills = []) {
        const skills = {};
        const skillList = [
            'athletics', 'acrobatics', 'sleightOfHand', 'endurance',
            'academia', 'arcana', 'investigation',
            'perception', 'cunning', 'creativity', 'empathy',
            'influence', 'deception'
        ];

        // Initialize all skills
        for (const skill of skillList) {
            skills[skill] = {
                proficient: false,
                expertise: false,
                bonus: 0
            };
        }

        // Apply class skill proficiencies (chosen by player)
        for (const skill of chosenSkills) {
            if (skills[skill]) {
                skills[skill].proficient = true;
            }
        }

        // Apply background skill proficiencies
        if (this.background?.skillProficiencies) {
            for (const skill of this.background.skillProficiencies) {
                if (skills[skill]) {
                    skills[skill].proficient = true;
                }
            }
        }

        // Apply racial skill proficiencies (e.g., Elf Keen Senses)
        if (this.race?.id === 'elf') {
            skills.perception.proficient = true;
        }

        // Calculate bonuses
        this.updateSkillBonuses(skills);

        return skills;
    }

    /**
     * Update skill bonuses based on proficiency and ability modifiers
     */
    updateSkillBonuses(skills = this.skills) {
        const skillAbilities = {
            athletics: 'str',
            acrobatics: 'dex',
            sleightOfHand: 'dex',
            endurance: 'con',
            academia: 'int',
            arcana: 'int',
            investigation: 'int',
            perception: 'wis',
            cunning: 'wis',
            creativity: 'wis',
            empathy: 'wis',
            influence: 'cha',
            deception: 'cha'
        };

        for (const [skill, data] of Object.entries(skills)) {
            const ability = skillAbilities[skill];
            let bonus = this.abilityModifiers[ability];

            if (data.proficient) {
                bonus += this.proficiencyBonus;
            }

            if (data.expertise) {
                bonus += this.proficiencyBonus; // Double proficiency
            }

            data.bonus = bonus;
        }
    }

    /**
     * Get skill bonus (ability modifier + proficiency)
     * @param {string} skillId - Skill ID
     * @returns {number} - Total skill bonus
     */
    getSkillBonus(skillId) {
        const skill = this.skills[skillId];
        if (!skill) {
            console.warn(`⚠️ Skill not found: ${skillId}`);
            return 0;
        }

        return skill.bonus;
    }

    /**
     * Roll a skill check with advantage/disadvantage support
     * @param {string} skillId - Skill ID
     * @param {Object} options - Options (advantage, disadvantage)
     * @returns {Object} - Roll result with total, modifier, and roll details
     */
    rollSkill(skillId, options = {}) {
        const { advantage = false, disadvantage = false } = options;

        const skillBonus = this.getSkillBonus(skillId);

        // Roll d20 (with advantage/disadvantage)
        let roll = 0;
        let rolls = [];

        if (advantage && !disadvantage) {
            // Roll twice, take higher
            const roll1 = Math.floor(Math.random() * 20) + 1;
            const roll2 = Math.floor(Math.random() * 20) + 1;
            roll = Math.max(roll1, roll2);
            rolls = [roll1, roll2];
        } else if (disadvantage && !advantage) {
            // Roll twice, take lower
            const roll1 = Math.floor(Math.random() * 20) + 1;
            const roll2 = Math.floor(Math.random() * 20) + 1;
            roll = Math.min(roll1, roll2);
            rolls = [roll1, roll2];
        } else {
            // Normal roll
            roll = Math.floor(Math.random() * 20) + 1;
            rolls = [roll];
        }

        const total = roll + skillBonus;

        return {
            roll,           // Natural d20 roll (before modifiers)
            total,          // Total result (roll + modifier)
            modifier: skillBonus,
            advantage,
            disadvantage,
            rolls,          // All rolls (for display)
            skillId
        };
    }

    /**
     * Initialize saving throws
     */
    initializeSavingThrows() {
        const saves = {};
        const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

        for (const ability of abilities) {
            const proficient = this.class.savingThrowProficiencies?.includes(ability) || false;
            saves[ability] = {
                proficient: proficient,
                bonus: this.abilityModifiers[ability] + (proficient ? this.proficiencyBonus : 0)
            };
        }

        return saves;
    }

    /**
     * Apply starting equipment from class and background
     */
    async applyStartingEquipment() {
        // Load items data
        const itemsData = await this.loadItemsData();

        // Get starting equipment from class
        const startingItemIds = this.class.startingEquipment?.defaults || [];

        // Get starting gold (D&D 5e class-based starting gold)
        this.gold = this.getStartingGold();

        // Convert item IDs to actual item objects
        for (const itemEntry of startingItemIds) {
            const item = this.getItemFromId(itemEntry, itemsData);
            if (item) {
                // Check if item should be equipped
                if (item.type === 'weapon' || item.type === 'armor' || item.type === 'shield') {
                    this.autoEquipItem(item);
                } else {
                    this.inventory.push(item);
                }
            }
        }

        // Add background equipment (use optionA by default)
        if (this.background.equipment && this.background.equipment.optionA) {
            for (const itemEntry of this.background.equipment.optionA) {
                const item = this.getItemFromId(itemEntry, itemsData);
                if (item) {
                    this.inventory.push(item);
                }
            }

            // Add background gold
            if (this.background.equipment.gold) {
                this.gold += this.background.equipment.gold;
            }
        }

        // Recalculate AC and attack bonuses after equipping items
        this.ac = this.calculateAC();

        // Calculate attack bonuses for equipped weapons
        if (this.equipment.mainHand) {
            this.mainHandAttackBonus = this.getAttackBonus(this.equipment.mainHand);
        }
        if (this.equipment.offHand && this.equipment.offHand.type === 'weapon') {
            this.offHandAttackBonus = this.getAttackBonus(this.equipment.offHand);
        }
    }

    /**
     * Load items data from JSON file
     */
    async loadItemsData() {
        try {
            const response = await fetch('data/items.json');
            return await response.json();
        } catch (error) {
            console.error('Failed to load items data:', error);
            return { weapons: [], armor: [], consumables: [], misc: [] };
        }
    }

    /**
     * Get item object from ID
     */
    getItemFromId(itemEntry, itemsData) {
        // Handle quantity notation (e.g., "bolt:20")
        let itemId = itemEntry;
        let quantity = 1;

        if (itemEntry.includes(':')) {
            const parts = itemEntry.split(':');
            itemId = parts[0];
            quantity = parseInt(parts[1]) || 1;
        }

        // Search for item in all categories
        const allItems = [
            ...(itemsData.weapons || []),
            ...(itemsData.armor || []),
            ...(itemsData.shields || []),
            ...(itemsData.consumables || []),
            ...(itemsData.ammunition || []),
            ...(itemsData.gear || []),
            ...(itemsData.misc || [])
        ];

        const baseItem = allItems.find(item => item.id === itemId);

        if (!baseItem) {
            console.warn(`Item not found: ${itemId}`);
            return null;
        }

        // Create item copy with quantity
        return {
            ...baseItem,
            quantity: quantity
        };
    }

    /**
     * Auto-equip an item to appropriate slot
     */
    autoEquipItem(item) {
        if (item.type === 'weapon') {
            if (!this.equipment.mainHand) {
                if (item.weaponType === 'ranged' && item.ammoCount === undefined) {
                    item.ammoCount = item.ammoCapacity ?? 20;
                }
                this.equipment.mainHand = item;
            } else {
                this.inventory.push(item);
            }
        } else if (item.type === 'armor') {
            if (!this.equipment.armor) {
                this.equipment.armor = item;
            } else {
                this.inventory.push(item);
            }
        } else if (item.type === 'shield') {
            if (!this.equipment.offHand) {
                this.equipment.offHand = item;
            } else {
                this.inventory.push(item);
            }
        } else {
            this.inventory.push(item);
        }
    }

    /**
     * Get starting gold based on class (D&D 5e SRD)
     */
    getStartingGold() {
        const goldByClass = {
            fighter: 150,  // 5d4 × 10 gp (average)
            wizard: 100,   // 4d4 × 10 gp (average)
            cleric: 125,   // 5d4 × 10 gp (average)
            rogue: 100,    // 4d4 × 10 gp (average)
            ranger: 125    // 5d4 × 10 gp (average)
        };

        return goldByClass[this.class.id] || 100;
    }

    /**
     * Initialize spellcasting for spellcasters
     */
    initializeSpellcasting() {
        if (!this.class.spellcaster) {
            return null;
        }

        return {
            spellcastingAbility: this.class.spellcastingAbility,
            spellSaveDC: 8 + this.proficiencyBonus + this.abilityModifiers[this.class.spellcastingAbility],
            spellAttackBonus: this.proficiencyBonus + this.abilityModifiers[this.class.spellcastingAbility],
            spellSlots: this.getSpellSlots(),
            spellSlotsUsed: {},
            spellsKnown: [],
            spellsPrepared: [],
            cantripsKnown: []
        };
    }

    /**
     * Get spell slots for current level
     */
    getSpellSlots() {
        if (!this.class.spellcaster) {
            return {};
        }

        const slots = this.class.spellSlotsByLevel?.[this.level] || [];
        const slotsByLevel = {};

        for (let i = 0; i < slots.length; i++) {
            if (slots[i] > 0) {
                slotsByLevel[i + 1] = {
                    max: slots[i],
                    current: slots[i]
                };
            }
        }

        return slotsByLevel;
    }

    /**
     * Get class features for current level
     */
    getClassFeatures() {
        const features = [];

        for (let level = 1; level <= this.level; level++) {
            const levelFeatures = this.class.features?.[level] || [];
            features.push(...levelFeatures);
        }

        return features;
    }

    /**
     * Gain XP and check for level up
     */
    gainXP(amount) {
        this.xp += amount;

        const newLevel = getLevelFromXP(this.xp);

        if (newLevel > this.level) {
            this.levelUp(newLevel);
            return true;
        }

        return false;
    }

    /**
     * Check if character has enough XP to level up and trigger level up
     * Used after combat XP awards
     * @returns {boolean} True if leveled up, false otherwise
     */
    checkLevelUp() {
        const xpNeeded = RULES.progression.xpTable[this.level + 1];

        if (!xpNeeded) {
            // Already at max level
            return false;
        }

        if (this.xp >= xpNeeded) {
            const newLevel = getLevelFromXP(this.xp);
            this.levelUp(newLevel);

            // Import gameState to add level up message
            import('../core/GameState.js').then(module => {
                const gameState = module.gameState || module.default;
                gameState.addMessage(`🎉 Level Up! You are now level ${this.level}!`, 'success');
            });

            return true;
        }

        return false;
    }

    /**
     * Level up character
     */
    /**
     * Level up - Calculate what WOULD change (but don't apply yet!)
     * Changes are stored in pendingLevelUp and applied when player confirms
     *
     * ⚠️ CRITICAL: This method does NOT modify character stats!
     * Stats only change when applyLevelUpSelections() is called.
     */
    levelUp(newLevel) {
        const oldLevel = this.level;

        // Calculate what WOULD change (but don't apply yet!)
        const hpGain = rollHitPoints(this.class.hitDie, this.abilityModifiers.con, true);
        const oldProfBonus = this.proficiencyBonus;
        const newProfBonus = getRulesProfBonus(newLevel);
        const profBonusChanged = newProfBonus !== oldProfBonus;

        // Get new features for this level
        const newFeatures = this.class.features?.[newLevel] || [];

        // Store PENDING changes (don't modify character stats yet!)
        this.pendingLevelUp = {
            newLevel: newLevel,
            oldLevel: oldLevel,
            hpGain: hpGain,
            oldHP: this.maxHP,
            newHP: this.maxHP + hpGain,
            oldProfBonus: oldProfBonus,
            newProfBonus: newProfBonus,
            profBonusChanged: profBonusChanged,
            newFeatures: newFeatures
        };

        // Reset selections
        this.levelUpSelections = {
            asiChoice: null,
            abilities: [],
            spells: [],
            traits: [],
            specialization: null
        };

        return this.pendingLevelUp;
    }

    /**
     * Apply Ability Score Improvement
     */
    applyASI(increases) {
        // increases is an object like { str: 1, dex: 1 } or { str: 2 }
        for (const [ability, increase] of Object.entries(increases)) {
            this.baseAbilities[ability] = Math.min(20, this.baseAbilities[ability] + increase);
        }

        this.abilities = this.calculateAbilities();
        this.abilityModifiers = this.calculateAbilityModifiers();
        this.updateCalculatedStats();
        this.asiAvailable = false;
    }

    /**
     * Apply level-up selections (ONLY called when player confirms level-up modal)
     * This is where stats actually change!
     *
     * @param {object} selections - Player's choices (asiChoice, abilities, spells, traits, specialization)
     */
    applyLevelUpSelections(selections) {
        if (!this.pendingLevelUp) {
            console.error('No pending level-up to apply!');
            return;
        }

        console.log(`📈 Applying level-up to level ${this.pendingLevelUp.newLevel}`);

        // NOW apply the stat changes that were calculated earlier
        this.level = this.pendingLevelUp.newLevel;
        this.maxHP = this.pendingLevelUp.newHP;
        this.currentHP += this.pendingLevelUp.hpGain; // Heal by HP gain amount

        // Update proficiency bonus if changed
        if (this.pendingLevelUp.profBonusChanged) {
            this.proficiencyBonus = this.pendingLevelUp.newProfBonus;
        }

        // Increment hit dice max (matches new level)
        this.hitDice.max = this.level;
        if (this.hitDice.current < this.level) {
            this.hitDice.current = this.level;
        }

        // Update spell slots if spellcaster
        if (this.spellcasting) {
            this.spellcasting.spellSlots = this.getSpellSlots();
        }

        // Get new class features for this level
        this.features = this.getClassFeatures();

        // Apply ASI (single ability increase)
        if (selections.asiChoice) {
            const ability = selections.asiChoice;
            this.baseAbilities[ability] = Math.min(20, this.baseAbilities[ability] + 1);
            this.abilities = this.calculateAbilities();
            this.abilityModifiers = this.calculateAbilityModifiers();
            console.log(`  +1 ${ability.toUpperCase()} (${this.baseAbilities[ability] - 1} → ${this.baseAbilities[ability]})`);
        }

        // Add selected abilities
        if (selections.abilities && selections.abilities.length > 0) {
            if (!this.selectedAbilities) this.selectedAbilities = [];
            this.selectedAbilities.push(...selections.abilities);
            console.log(`  Added ${selections.abilities.length} abilities`);
        }

        // Add selected spells
        if (selections.spells && selections.spells.length > 0) {
            if (!this.spellcasting.knownSpells) {
                this.spellcasting.knownSpells = [];
            }
            this.spellcasting.knownSpells.push(...selections.spells);
            console.log(`  Learned ${selections.spells.length} spells`);
        }

        // Add selected traits
        if (selections.traits && selections.traits.length > 0) {
            if (!this.selectedTraits) this.selectedTraits = [];
            this.selectedTraits.push(...selections.traits);
            console.log(`  Added ${selections.traits.length} traits`);
        }

        // Add selected practices
        if (selections.practices && selections.practices.length > 0) {
            if (!this.practices) this.practices = [];
            this.practices.push(...selections.practices);
            console.log(`  Learned ${selections.practices.length} practice(s): ${selections.practices.join(', ')}`);
        }

        // Set specialization
        if (selections.specialization) {
            this.specialization = selections.specialization;
            console.log(`  Specialization: ${selections.specialization}`);
        }

        // Update all calculated stats
        this.updateCalculatedStats();

        // Clear pending state (level-up complete!)
        this.pendingLevelUp = null;
        this.levelUpSelections = null;

        console.log(`✅ Level-up complete! Now level ${this.level}`);
    }

    /**
     * Update all calculated stats after changes
     */
    updateCalculatedStats() {
        this.ac = this.calculateAC();
        this.speed = this.calculateSpeed();
        this.initiative = this.abilityModifiers.dex;
        this.updateSkillBonuses();

        // Update saving throws
        for (const [ability, save] of Object.entries(this.savingThrows)) {
            save.bonus = this.abilityModifiers[ability] + (save.proficient ? this.proficiencyBonus : 0);
        }

        // Update spell save DC and attack bonus if spellcaster
        if (this.spellcasting) {
            const ability = this.spellcasting.spellcastingAbility;
            this.spellcasting.spellSaveDC = 8 + this.proficiencyBonus + this.abilityModifiers[ability];
            this.spellcasting.spellAttackBonus = this.proficiencyBonus + this.abilityModifiers[ability];
        }
    }

    /**
     * Take damage
     */
    takeDamage(amount, damageType = null) {
        // Apply temp HP first
        if (this.tempHP > 0) {
            if (amount <= this.tempHP) {
                this.tempHP -= amount;
                return { damage: amount, newHP: this.currentHP, tempHPUsed: amount };
            } else {
                amount -= this.tempHP;
                this.tempHP = 0;
            }
        }

        // Apply to current HP
        this.currentHP = Math.max(0, this.currentHP - amount);

        return {
            damage: amount,
            newHP: this.currentHP,
            isDead: this.currentHP === 0
        };
    }

    /**
     * Heal character
     */
    heal(amount) {
        const oldHP = this.currentHP;
        this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
        return {
            healed: this.currentHP - oldHP,
            newHP: this.currentHP
        };
    }

    /**
     * Take a short rest
     */
    shortRest() {
        // Can only take 2 short rests per long rest
        if (this.shortRestsUsed >= 2) {
            return { success: false, reason: 'Already used all short rests. Need a long rest.' };
        }

        // Roll ALL hit dice to heal (hit dice = level, they don't deplete)
        const diceToRoll = this.hitDice.current; // This equals level
        let healing = 0;

        for (let i = 0; i < diceToRoll; i++) {
            healing += roll(`1d${this.hitDice.size}`) + this.abilityModifiers.con;
        }

        if (healing > 0) {
            this.heal(healing);
        }

        this.shortRestsUsed++;

        // Reset short rest abilities (abilities with resourceType: 'shortRest')
        if (this.abilityUses) {
            // Reset all ability uses that recharge on short rest
            this.abilityUses = {};
        }

        return {
            success: true,
            healing: healing,
            hitDiceRolled: diceToRoll,
            shortRestsRemaining: 2 - this.shortRestsUsed
        };
    }

    /**
     * Take a long rest
     */
    longRest() {
        // Restore all HP
        this.currentHP = this.maxHP;

        // Hit dice don't need restoring (they equal level and don't deplete)
        // Just ensure they're set correctly in case of any issues
        this.hitDice.current = this.hitDice.max;

        // Reset short rests counter
        this.shortRestsUsed = 0;

        // Recover spell slots
        if (this.spellcasting) {
            for (const level in this.spellcasting.spellSlots) {
                this.spellcasting.spellSlots[level].current = this.spellcasting.spellSlots[level].max;
            }
        }

        // Recover all class features
        // TODO: Implement class feature recovery

        // FORGECRAFT PRACTICE: refill ammunition during long rest
        // Characters with the forgecraft practice can craft arrows/bolts during a long rest
        if (this.practices?.includes('forgecraft') && this.equipment?.mainHand) {
            const rangedWeapon = this.equipment.mainHand;
            if (rangedWeapon.weaponType === 'ranged' &&
                (rangedWeapon.ammoCapacity !== undefined || rangedWeapon.ammoCount !== undefined)) {
                const capacity = rangedWeapon.ammoCapacity ?? 20;
                rangedWeapon.ammoCount = capacity;
                console.log(`🪶 Forgecraft: ${this.name} crafts arrows during long rest. Ammo refilled to ${capacity}.`);
            }
        }

        this.lastLongRest = Date.now();

        return {
            success: true
        };
    }

    /**
     * Traversal Abilities - Add/remove special terrain traversal abilities
     */
    addTraversalAbility(ability) {
        if (!this.traversalAbilities.includes(ability)) {
            this.traversalAbilities.push(ability);
        }
    }

    removeTraversalAbility(ability) {
        this.traversalAbilities = this.traversalAbilities.filter(a => a !== ability);
    }

    hasTraversalAbility(ability) {
        return this.traversalAbilities.includes(ability);
    }

    /**
     * Exhaustion System - D&D 5e exhaustion levels (0-6)
     */
    addExhaustion(levels = 1) {
        this.exhaustionLevel = Math.min(6, this.exhaustionLevel + levels); // Max 6 levels

        // Apply exhaustion penalties
        if (this.exhaustionLevel >= 6) {
            this.die(); // Death at level 6
        }
    }

    removeExhaustion(levels = 1) {
        this.exhaustionLevel = Math.max(0, this.exhaustionLevel - levels);
    }

    getExhaustionPenalties() {
        // D&D 5e exhaustion levels
        const penalties = [
            'None',
            'Disadvantage on ability checks',
            'Speed halved',
            'Disadvantage on attack rolls and saving throws',
            'Hit point maximum halved',
            'Speed reduced to 0',
            'Death'
        ];

        return penalties[this.exhaustionLevel];
    }

    /**
     * Equipment Loss - Randomly lose an equipped item
     */
    loseRandomEquipment() {
        const equipped = this.inventory.filter(item => item.equipped);
        if (equipped.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * equipped.length);
        const lostItem = equipped[randomIndex];

        // Remove from inventory
        this.inventory = this.inventory.filter(item => item.id !== lostItem.id);

        // Unequip if it was equipped
        for (const slot in this.equipment) {
            if (this.equipment[slot]?.id === lostItem.id) {
                this.equipment[slot] = null;
            }
        }

        // Recalculate AC (armor/shield might be lost)
        this.ac = this.calculateAC();

        return lostItem;
    }

    /**
     * Get attack bonus for a weapon
     */
    getAttackBonus(weapon) {
        // Determine which ability modifier to use
        let abilityMod;

        if (weapon.properties?.includes('finesse')) {
            // Finesse weapons can use DEX or STR (whichever is higher)
            abilityMod = Math.max(this.abilityModifiers.str, this.abilityModifiers.dex);
        } else if (weapon.weaponType === 'ranged') {
            abilityMod = this.abilityModifiers.dex;
        } else {
            abilityMod = this.abilityModifiers.str;
        }

        // Check weapon proficiency
        const proficient = this.isProficientWithWeapon(weapon);
        const profBonus = proficient ? this.proficiencyBonus : 0;

        return abilityMod + profBonus;
    }

    /**
     * Check if proficient with weapon
     */
    isProficientWithWeapon(weapon) {
        if (!weapon) {
            return false;
        }

        // Check if proficient with weapon category (simple, martial)
        if (this.proficiencies.weapons.includes(weapon.category)) {
            return true;
        }

        // Check if proficient with specific weapon
        if (this.proficiencies.weapons.includes(weapon.id)) {
            return true;
        }

        return false;
    }

    /**
     * Check if proficient with armor
     */
    isProficientWithArmor(armor) {
        if (!armor) {
            return false;
        }

        // Check if proficient with armor type (light, medium, heavy)
        if (this.proficiencies.armor.includes(armor.armorType)) {
            return true;
        }

        // Check if proficient with specific armor
        if (this.proficiencies.armor.includes(armor.id)) {
            return true;
        }

        return false;
    }

    /**
     * Check if proficient with shield
     */
    isProficientWithShield() {
        return this.proficiencies.armor.includes('shields');
    }

    // ==================== INVENTORY MANAGEMENT ====================

    /**
     * Add an item to inventory
     * @param {Object} item - Item object from items.json
     * @param {number} quantity - Number of items to add (default: 1)
     * @returns {boolean} - Success
     */
    addItem(item, quantity = 1) {
        // Check if item already exists in inventory
        const existingItem = this.inventory.find(inv => inv.id === item.id);

        if (existingItem) {
            // Stack consumables and misc items
            if (item.type === 'consumable' || item.type === 'misc') {
                existingItem.quantity = (existingItem.quantity || 1) + quantity;
            } else {
                // Non-stackable items - add as separate entry
                this.inventory.push({
                    ...item,
                    quantity: 1,
                    instanceId: generateUUID() // Unique instance ID
                });
            }
        } else {
            // New item - add to inventory
            this.inventory.push({
                ...item,
                quantity: quantity,
                instanceId: generateUUID()
            });
        }

        return true;
    }

    /**
     * Remove an item from inventory
     * @param {string} itemId - Item ID or instanceId
     * @param {number} quantity - Number to remove (default: 1)
     * @returns {boolean} - Success
     */
    removeItem(itemId, quantity = 1) {
        const itemIndex = this.inventory.findIndex(
            inv => inv.id === itemId || inv.instanceId === itemId
        );

        if (itemIndex === -1) {
            console.warn(`Item ${itemId} not found in inventory`);
            return false;
        }

        const item = this.inventory[itemIndex];

        // Handle stackable items
        if (item.quantity && item.quantity > quantity) {
            item.quantity -= quantity;
        } else {
            // Remove entire item
            this.inventory.splice(itemIndex, 1);
        }

        return true;
    }

    /**
     * Equip an item from inventory
     * @param {string} itemId - Item ID or instanceId
     * @returns {boolean} - Success
     */
    equipItem(itemId) {
        const item = this.inventory.find(
            inv => inv.id === itemId || inv.instanceId === itemId
        );

        if (!item) {
            console.warn(`Item ${itemId} not found in inventory`);
            return false;
        }

        // Determine equipment slot
        let slot = null;
        if (item.type === 'weapon') {
            slot = 'mainHand';
        } else if (item.type === 'armor') {
            slot = 'armor';
        } else if (item.type === 'shield') {
            slot = 'offHand';  // Shields equip to off-hand slot
        } else if (item.type === 'artifact') {
            slot = 'artifact';
        } else if (item.type === 'helmet') {
            slot = 'helmet';
        } else {
            console.warn(`Item ${item.id} cannot be equipped (type: ${item.type})`);
            return false;
        }

        // Unequip current item in slot (if any)
        if (this.equipment[slot]) {
            this.unequipItem(slot);
        }

        // Equip new item
        this.equipment[slot] = item;

        // Recalculate AC if armor/shield changed
        if (slot === 'armor' || slot === 'shield') {
            this.ac = this.calculateAC();
        }

        console.log(`✅ Equipped ${item.name} to ${slot}`);
        return true;
    }

    /**
     * Unequip an item and return it to inventory
     * @param {string} slot - Equipment slot name
     * @returns {boolean} - Success
     */
    unequipItem(slot) {
        if (!this.equipment[slot]) {
            console.warn(`No item equipped in ${slot}`);
            return false;
        }

        const item = this.equipment[slot];
        this.equipment[slot] = null;

        // Recalculate AC if armor/shield changed
        if (slot === 'armor' || slot === 'shield') {
            this.ac = this.calculateAC();
        }

        console.log(`✅ Unequipped ${item.name} from ${slot}`);
        return true;
    }

    /**
     * Use a consumable item
     * @param {string} itemId - Item ID or instanceId
     * @returns {Object|null} - Item effect or null
     */
    useItem(itemId) {
        const item = this.inventory.find(
            inv => inv.id === itemId || inv.instanceId === itemId
        );

        if (!item) {
            console.warn(`Item ${itemId} not found in inventory`);
            return null;
        }

        if (item.type !== 'consumable') {
            console.warn(`Item ${item.id} is not consumable`);
            return null;
        }

        // Apply item effect (e.g., healing potion)
        let effect = null;
        if (item.effect) {
            effect = this.applyItemEffect(item.effect);
        }

        // Remove one from inventory
        this.removeItem(itemId, 1);

        console.log(`✅ Used ${item.name}`);
        return effect;
    }

    /**
     * Apply item effect to character
     * @param {Object} effect - Effect definition
     * @returns {Object} - Effect result
     */
    applyItemEffect(effect) {
        const result = {};

        // Healing effect
        if (effect.healing) {
            const healing = roll(effect.healing);
            this.currentHP = Math.min(this.maxHP, this.currentHP + healing);
            result.healing = healing;
            console.log(`💚 Healed ${healing} HP (${this.currentHP}/${this.maxHP})`);
        }

        // Temporary HP
        if (effect.tempHP) {
            const tempHP = roll(effect.tempHP);
            this.tempHP = Math.max(this.tempHP, tempHP);
            result.tempHP = tempHP;
            console.log(`🛡️ Gained ${tempHP} temporary HP`);
        }

        // Buff effect (future: implement conditions)
        if (effect.buff) {
            // TODO: Implement buff system
            result.buff = effect.buff;
        }

        return result;
    }

    /**
     * Add gold to character
     * @param {number} amount - Amount to add
     */
    addGold(amount) {
        this.gold += amount;
        console.log(`💰 Gained ${amount} gold (total: ${this.gold} gp)`);
    }

    /**
     * Remove gold from character
     * @param {number} amount - Amount to remove
     * @returns {boolean} - Success (false if insufficient gold)
     */
    removeGold(amount) {
        if (this.gold < amount) {
            console.warn(`❌ Insufficient gold (need ${amount}, have ${this.gold})`);
            return false;
        }

        this.gold -= amount;
        console.log(`💸 Spent ${amount} gold (remaining: ${this.gold} gp)`);
        return true;
    }

    /**
     * Calculate total inventory weight
     * @returns {number} - Total weight in lbs
     */
    calculateInventoryWeight() {
        let totalWeight = 0;

        // Inventory items
        for (const item of this.inventory) {
            const weight = item.weight || 0;
            const quantity = item.quantity || 1;
            totalWeight += weight * quantity;
        }

        // Equipped items
        for (const slot in this.equipment) {
            const item = this.equipment[slot];
            if (item && item.weight) {
                totalWeight += item.weight;
            }
        }

        return totalWeight;
    }

    /**
     * Calculate max carrying capacity (STR score × 15 lbs)
     * @returns {number} - Max weight in lbs
     */
    getMaxCarryingCapacity() {
        return this.abilities.str * 15;
    }

    /**
     * Check if character is over-encumbered
     * @returns {boolean}
     */
    isEncumbered() {
        return this.calculateInventoryWeight() > this.getMaxCarryingCapacity();
    }

    /**
     * Serialize character for saving
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            avatar: this.avatar,
            race: this.race,
            class: this.class,
            background: this.background,
            fightingStyle: this.fightingStyle,
            level: this.level,
            xp: this.xp,
            baseAbilities: this.baseAbilities,
            maxHP: this.maxHP,
            currentHP: this.currentHP,
            tempHP: this.tempHP,
            hitDice: this.hitDice,
            ac: this.ac,
            speed: this.speed,
            skillChoices: this.skillChoices, // Save chosen skill proficiencies for proper restoration
            skills: this.skills,
            inventory: this.inventory,
            equipment: this.equipment,
            gold: this.gold,
            spellcasting: this.spellcasting,
            weaponMasteries: this.weaponMasteries,
            conditions: this.conditions,
            effects: this.effects,
            position: this.position,
            shortRestsUsed: this.shortRestsUsed,
            lastLongRest: this.lastLongRest,
            abilityUses: this.abilityUses,
            practices: this.practices,
            equipmentMods: this.equipmentMods,
            isNPC: this.isNPC,
            isHostile: this.isHostile,
            faction: this.faction
        };
    }

    /**
     * Create character from saved data
     */
    static fromJSON(data) {
        return new Character(data);
    }
}

export default Character;
