/**
 * Data-driven skill catalogue and resolution service.
 *
 * `data/skills.json` is the only source of skill ids and attribute pairings. Systems
 * may keep proficiency state, but must resolve modifiers and rolls through this service.
 */

import { RULES } from '../core/rulesEngine.js';
import { rollD20 } from '../utils/dice.js';
import { getRawAttributeModifier } from '../utils/attributeResolver.js';

class SkillRegistry {
    constructor() {
        this.definitions = [];
        this.byId = new Map();
        this.aliases = new Map();
        this.loadPromise = null;
    }

    /** @param {Array<object>} definitions - Skill entries from data/skills.json */
    setDefinitions(definitions = []) {
        this.definitions = definitions;
        this.byId = new Map(definitions.map(definition => [definition.id, definition]));
        this.aliases = new Map();

        for (const definition of definitions) {
            this.aliases.set(definition.id, definition.id);
            for (const legacyId of (definition.legacyIds || [])) {
                this.aliases.set(legacyId, definition.id);
            }
        }
    }

    /** Load and cache the canonical skill catalogue. */
    async load() {
        if (this.definitions.length > 0) {
            return this.definitions;
        }
        if (!this.loadPromise) {
            this.loadPromise = fetch('data/skills.json')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to load skills.json: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    this.setDefinitions(data.skills || []);
                    return this.definitions;
                })
                .finally(() => {
                    this.loadPromise = null;
                });
        }
        return this.loadPromise;
    }

    getDefinition(skillId) {
        return this.byId.get(this.normalizeId(skillId));
    }

    normalizeId(skillId) {
        return this.aliases.get(skillId) || skillId;
    }

    normalizeIds(skillIds = []) {
        const normalized = skillIds.map(skillId => this.normalizeId(skillId));
        return [...new Set(this.byId.size > 0 ? normalized.filter(skillId => this.byId.has(skillId)) : normalized)];
    }

    /**
     * Resolve the attribute for a specific authored approach.
     * In NVSystem, omitted attributes use the primary. Explicit attributes must be the
     * primary or secondary pairing. 5EClassic retains the legacy single ability.
     */
    resolveAttribute(skillId, requestedAttribute = null) {
        const definition = this.getDefinition(skillId);
        if (!definition) {
            return null;
        }

        if (RULES.attributes.system === '5EClassic') {
            return definition.ability;
        }

        const primary = definition.primaryAttribute || definition.attributeNVSystem;
        const secondary = definition.secondaryAttribute || null;
        const attribute = requestedAttribute || primary;
        if (attribute !== primary && attribute !== secondary) {
            throw new Error(`${attribute} is not an allowed attribute for ${definition.id}`);
        }
        return attribute;
    }

    /** Return the canonical proficiency state, including old-save aliases. */
    getProficiencyState(character, skillId) {
        const canonicalId = this.normalizeId(skillId);
        const direct = character?.skills?.[canonicalId];
        if (direct) {
            return direct;
        }

        const definition = this.byId.get(canonicalId);
        for (const legacyId of (definition?.legacyIds || [])) {
            if (character?.skills?.[legacyId]) {
                return character.skills[legacyId];
            }
        }
        return { proficient: false, expertise: false };
    }

    /** Resolve ability + proficiency for one skill/attribute approach. */
    getModifier(character, skillId, requestedAttribute = null) {
        const attribute = this.resolveAttribute(skillId, requestedAttribute);
        if (!attribute) {
            return 0;
        }

        const state = this.getProficiencyState(character, skillId);
        const proficiencyBonus = character?.proficiencyBonus || 0;
        let modifier = Math.floor(getRawAttributeModifier(character, attribute));
        if (state.proficient) {
            modifier += proficiencyBonus;
        }
        if (state.expertise) {
            modifier += proficiencyBonus;
        }
        return modifier;
    }

    /**
     * Roll a complete skill check using the same result shape on every gameplay surface.
     */
    rollCheck(character, {
        skillId,
        attribute = null,
        dc = null,
        advantage = false,
        disadvantage = false,
        modifierAdjustment = 0
    } = {}) {
        const rollMode = advantage === disadvantage
            ? 'normal'
            : (advantage ? 'advantage' : 'disadvantage');
        const roll = rollD20(rollMode);
        const skillModifier = this.getModifier(character, skillId, attribute);
        const modifier = skillModifier + modifierAdjustment;
        const total = roll.result + modifier;

        return {
            skill: this.normalizeId(skillId),
            attribute: this.resolveAttribute(skillId, attribute),
            naturalRoll: roll.result,
            roll: roll.result,
            rolls: roll.rolls,
            modifier,
            skillModifier,
            modifierAdjustment,
            total,
            dc,
            success: dc === null ? undefined : total >= dc,
            critical: roll.result === 20,
            criticalFail: roll.result === 1,
            advantage: Boolean(roll.advantage),
            disadvantage: Boolean(roll.disadvantage)
        };
    }

    /** Convert old save proficiency/expertise state into the canonical nine-skill set. */
    migrateSkillState(savedSkills = {}, chosenSkills = []) {
        const migrated = Object.fromEntries(this.definitions.map(definition => [definition.id, {
            proficient: false,
            expertise: false,
            bonus: 0
        }]));

        for (const [oldId, state] of Object.entries(savedSkills || {})) {
            const canonicalId = this.normalizeId(oldId);
            if (!migrated[canonicalId]) {
                continue;
            }
            migrated[canonicalId].proficient ||= Boolean(state?.proficient);
            migrated[canonicalId].expertise ||= Boolean(state?.expertise);
        }
        for (const skillId of this.normalizeIds(chosenSkills)) {
            migrated[skillId].proficient = true;
        }
        return migrated;
    }
}

export const skillRegistry = new SkillRegistry();
export default skillRegistry;
