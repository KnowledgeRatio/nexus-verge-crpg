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
