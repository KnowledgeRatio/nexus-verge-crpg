/** Known ability definitions for class instances and restored plain characters. */
export function getKnownAbilityDefinitions(character, abilitiesData) {
    const data = abilitiesData || globalThis.window?.game?.abilitiesData;
    return (data?.abilities?.[character.class?.id] || []).filter(ability => {
        if (character.level < (ability.levelRequired || 1) ||
            (ability.specialization && ability.specialization !== character.specialization)) {
            return false;
        }
        if (ability.subtype === 'tactic' || ability.tags?.includes('tactic')) {
            return character.knownTactics?.includes(ability.id);
        }
        if (ability.subtype === 'vow' || ability.tags?.includes('vow')) {
            return character.knownVows?.includes(ability.id);
        }
        // Base calling abilities are granted by level, not stored in selectedAbilities.
        return true;
    });
}

/** Recharge resources only; callers own healing, rest eligibility and world time. */
export function recoverRestResources(character, restType, abilitiesData) {
    const rechargeTypes = restType === 'long' ? ['shortRest', 'longRest'] : ['shortRest'];
    const knownAbilities = getKnownAbilityDefinitions(character, abilitiesData);
    for (const id of Object.keys(character.abilityUses || {})) {
        const definition = knownAbilities.find(ability => ability.id === id);
        if (definition && rechargeTypes.includes(definition.resourceType)) {
            delete character.abilityUses[id];
        }
    }

    const lootManager = globalThis.window?.lootManager;
    for (const id of Object.keys(character.equipmentModCharges || {})) {
        const effect = lootManager?.getPropertyEffect(id);
        if (effect && rechargeTypes.includes(effect.recharge)) {
            delete character.equipmentModCharges[id];
        }
    }

    if (character.maxResolvePoints !== undefined) {
        character.resolvePoints = character.maxResolvePoints;
    }
}
