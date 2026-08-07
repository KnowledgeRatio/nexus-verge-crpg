const registry = new Map();

export function registerFightingStyle(styleId, hooks) {
    registry.set(styleId, hooks);
}

export function getPassiveAttackBonus(styleId, ctx) {
    return registry.get(styleId)?.attackBonus?.(ctx) ?? 0;
}

export function getPassiveACBonus(styleId, ctx) {
    return registry.get(styleId)?.acBonus?.(ctx) ?? 0;
}

export function getPassiveDamageBonus(styleId, ctx) {
    return registry.get(styleId)?.damageBonus?.(ctx) ?? 0;
}

export function getPassiveUnarmedDie(styleId, ctx) {
    return registry.get(styleId)?.unarmedDie?.(ctx) ?? null;
}

export function passiveAddsOffHandAbilityMod(styleId) {
    return registry.get(styleId)?.addsOffHandAbilityMod ?? false;
}

export function passiveShouldRerollDamage(styleId, roll, ctx) {
    return registry.get(styleId)?.shouldRerollDamage?.(roll, ctx) ?? false;
}

registerFightingStyle('marksmanship', {
    attackBonus: (ctx) => ctx.isRanged ? 2 : 0,
});

registerFightingStyle('defense', {
    acBonus: (ctx) => ctx.wearingArmor ? 1 : 0,
});

registerFightingStyle('mariner', {
    acBonus: (ctx) => (!ctx.heavyArmor && !ctx.shield) ? 1 : 0,
});

registerFightingStyle('dueling', {
    damageBonus: (ctx) => (!ctx.isRanged && !ctx.isOffHand && !ctx.twoHanded && ctx.offHandEmptyOrShield) ? 2 : 0,
});

registerFightingStyle('greatWeaponFighting', {
    shouldRerollDamage: (roll, ctx) => ctx.twoHanded && roll <= 2,
});

registerFightingStyle('twoWeaponFighting', {
    addsOffHandAbilityMod: true,
});

registerFightingStyle('unarmedFighting', {
    unarmedDie: (ctx) => ctx.bothHandsFree ? 8 : 6,
});

// ---------------------------------------------------------------------------
// Auras (Oath specialization) — cross-character, unlike the single-character fighting
// style lookups above. Scans allied combatants for a trait source generically
// (selectedTraits.includes(traitId)), never an ability/trait-name check on the target.
// ---------------------------------------------------------------------------

/**
 * Aura of Sanctuary (+1 AC to the source and allies engaged with the same enemy) and
 * Aura of Exposure (-1 AC to enemies engaged with the source) — additive.
 * @param {Object} combatManager - CombatManager instance
 * @param {Object} defenderCombatant - Combatant whose AC is being computed
 * @returns {number} Net AC delta (can be negative)
 */
export function getAuraACBonus(combatManager, defenderCombatant) {
    if (!combatManager || !defenderCombatant) {
        return 0;
    }
    const allies = [combatManager.playerCombatant, ...(combatManager.companionCombatants || [])].filter(Boolean);
    let bonus = 0;

    const sanctuarySource = allies.find(c => c.character?.selectedTraits?.includes('aura_of_sanctuary'));
    if (sanctuarySource) {
        const isSelf = defenderCombatant.id === sanctuarySource.id;
        const sharesEngagement = [...defenderCombatant.engagedWith].some(id => sanctuarySource.engagedWith.has(id));
        if (isSelf || sharesEngagement) {
            bonus += 1;
        }
    }

    const exposureSource = allies.find(c => c.character?.selectedTraits?.includes('aura_of_exposure'));
    if (exposureSource && exposureSource.engagedWith.has(defenderCombatant.id)) {
        bonus -= 1;
    }

    return bonus;
}

/**
 * Aura of Mercy: +1 to saving throws for the source and all allies (unconditional, not
 * engagement-gated).
 * @param {Object} combatManager - CombatManager instance
 * @param {Object} defenderCombatant - Combatant making the save
 * @returns {number}
 */
export function getAuraSaveBonus(combatManager, defenderCombatant) {
    if (!combatManager || !defenderCombatant) {
        return 0;
    }
    if (defenderCombatant.team !== 'player' && defenderCombatant.team !== 'companion') {
        return 0;
    }
    const allies = [combatManager.playerCombatant, ...(combatManager.companionCombatants || [])].filter(Boolean);
    const hasMercy = allies.some(c => c.character?.selectedTraits?.includes('aura_of_mercy'));
    return hasMercy ? 1 : 0;
}
