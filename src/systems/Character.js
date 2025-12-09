/**
 * Character Class - D&D 5e Character System
 * Handles both player characters and NPCs with full D&D mechanics
 */

import { generateUUID } from '../utils/helpers.js';
import { getAbilityModifier, getProficiencyBonus, rollHitPoints, roll } from '../utils/dice.js';
import { getProficiencyBonus as getRulesProfBonus, getLevelFromXP, isASILevel } from '../core/rulesEngine.js';

export class Character {
    constructor(data) {
        // Core identity
        this.id = data.id || generateUUID();
        this.name = data.name;
        this.race = data.race;           // Race object from races.json
        this.class = data.class;         // Class object from classes.json
        this.background = data.background; // Background object from backgrounds.json
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

        // Armor Class
        this.baseAC = 10; // Base AC
        this.armorBonus = 0;
        this.shieldBonus = 0;
        this.ac = data.ac || this.calculateAC();

        // Speed
        this.speed = data.speed || this.calculateSpeed();

        // Initiative
        this.initiative = this.abilityModifiers.dex;

        // Proficiencies
        this.proficiencies = this.initializeProficiencies();

        // Skills (proficiency tracking and bonuses)
        this.skills = this.initializeSkills(data.skillChoices);

        // Saving throws
        this.savingThrows = this.initializeSavingThrows();

        // Inventory
        this.inventory = data.inventory || [];

        // Equipment slots
        this.equipment = {
            mainHand: null,
            offHand: null,
            armor: null,
            helmet: null,
            shield: null,
            artifact: null
        };

        // Apply starting equipment if new character
        if (!data.equipment) {
            this.applyStartingEquipment();
        } else {
            this.equipment = data.equipment;
        }

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

        // Shield
        if (this.equipment.shield) {
            ac += this.equipment.shield.armorClassBonus || 0;
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
            'acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception',
            'history', 'insight', 'intimidation', 'investigation', 'medicine',
            'nature', 'perception', 'performance', 'persuasion', 'religion',
            'sleightOfHand', 'stealth', 'survival'
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
            acrobatics: 'dex',
            animalHandling: 'wis',
            arcana: 'int',
            athletics: 'str',
            deception: 'cha',
            history: 'int',
            insight: 'wis',
            intimidation: 'cha',
            investigation: 'int',
            medicine: 'wis',
            nature: 'int',
            perception: 'wis',
            performance: 'cha',
            persuasion: 'cha',
            religion: 'int',
            sleightOfHand: 'dex',
            stealth: 'dex',
            survival: 'wis'
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
    applyStartingEquipment() {
        // For Phase 1, use class defaults
        // TODO: Implement choice system for Phase 2

        const startingItems = this.class.startingEquipment?.defaults || [];

        // Add items to inventory
        for (const itemId of startingItems) {
            this.inventory.push({ id: itemId, quantity: 1, equipped: false });
        }

        // Auto-equip basic gear
        // TODO: Implement proper equipment from inventory system
    }

    /**
     * Initialize spellcasting for spellcasters
     */
    initializeSpellcasting() {
        if (!this.class.spellcaster) return null;

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
        if (!this.class.spellcaster) return {};

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
     * Level up character
     */
    levelUp(newLevel) {
        const oldLevel = this.level;
        this.level = newLevel;

        // Increase max HP
        const hpGain = rollHitPoints(this.class.hitDie, this.abilityModifiers.con, true);
        this.maxHP += hpGain;
        this.currentHP += hpGain;

        // Update proficiency bonus
        this.proficiencyBonus = getRulesProfBonus(this.level);

        // Update hit dice
        this.hitDice.max = this.level;
        this.hitDice.current = Math.min(this.hitDice.current + 1, this.level);

        // Update spell slots if spellcaster
        if (this.spellcasting) {
            this.spellcasting.spellSlots = this.getSpellSlots();
        }

        // Get new class features
        this.features = this.getClassFeatures();

        // Check for ASI
        if (isASILevel(this.level)) {
            // Mark that ASI is available (will be selected by player)
            this.asiAvailable = true;
        }

        // Update all calculated values
        this.updateCalculatedStats();

        return {
            oldLevel,
            newLevel,
            hpGain,
            newFeatures: this.class.features?.[newLevel] || []
        };
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
            return { success: false, reason: "Already used all short rests. Need a long rest." };
        }

        // Spend hit dice to heal (player chooses how many)
        // For now, auto-spend half available hit dice
        const diceToSpend = Math.floor(this.hitDice.current / 2);
        let healing = 0;

        for (let i = 0; i < diceToSpend; i++) {
            healing += roll(`1d${this.hitDice.size}`) + this.abilityModifiers.con;
            this.hitDice.current--;
        }

        this.heal(healing);
        this.shortRestsUsed++;

        // Recover some class features (e.g., Fighter's Second Wind, Action Surge)
        // TODO: Implement class feature recovery

        return {
            success: true,
            healing: healing,
            hitDiceSpent: diceToSpend,
            shortRestsRemaining: 2 - this.shortRestsUsed
        };
    }

    /**
     * Take a long rest
     */
    longRest() {
        // Restore all HP
        this.currentHP = this.maxHP;

        // Restore half of hit dice (minimum 1)
        const diceToRecover = Math.max(1, Math.floor(this.hitDice.max / 2));
        this.hitDice.current = Math.min(this.hitDice.max, this.hitDice.current + diceToRecover);

        // Reset short rests
        this.shortRestsUsed = 0;

        // Recover spell slots
        if (this.spellcasting) {
            for (const level in this.spellcasting.spellSlots) {
                this.spellcasting.spellSlots[level].current = this.spellcasting.spellSlots[level].max;
            }
        }

        // Recover all class features
        // TODO: Implement class feature recovery

        this.lastLongRest = Date.now();

        return {
            success: true,
            hitDiceRecovered: diceToRecover
        };
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
        if (!weapon) return false;

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
     * Serialize character for saving
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            race: this.race,
            class: this.class,
            background: this.background,
            level: this.level,
            xp: this.xp,
            baseAbilities: this.baseAbilities,
            maxHP: this.maxHP,
            currentHP: this.currentHP,
            tempHP: this.tempHP,
            hitDice: this.hitDice,
            ac: this.ac,
            speed: this.speed,
            skills: this.skills,
            inventory: this.inventory,
            equipment: this.equipment,
            spellcasting: this.spellcasting,
            conditions: this.conditions,
            effects: this.effects,
            position: this.position,
            shortRestsUsed: this.shortRestsUsed,
            lastLongRest: this.lastLongRest,
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
