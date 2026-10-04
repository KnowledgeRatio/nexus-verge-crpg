import { RULES } from '../core/rulesEngine.js';

export function damagePrecisionEnabled() {
    return RULES.combat.damageOverTime.enabled;
}

export function hpToUnits(value) {
    if (!Number.isFinite(value)) {
        throw new TypeError('HP must be a finite number');
    }
    return Math.round(value * RULES.combat.damageOverTime.unitsPerHP);
}

export function unitsToHP(value) {
    return value / RULES.combat.damageOverTime.unitsPerHP;
}

export function normalizeHP(value) {
    return damagePrecisionEnabled() ? unitsToHP(hpToUnits(value)) : value;
}

export function subtractHP(hp, amount) {
    return damagePrecisionEnabled()
        ? unitsToHP(Math.max(0, hpToUnits(hp) - Math.max(0, hpToUnits(amount))))
        : Math.max(0, hp - amount);
}

export function addHP(hp, amount, maximum) {
    return damagePrecisionEnabled()
        ? unitsToHP(Math.max(0, Math.min(hpToUnits(maximum), hpToUnits(hp) + Math.max(0, hpToUnits(amount)))))
        : Math.min(maximum, hp + amount);
}

export function partitionDamage(amount, immediateFraction, ticks) {
    const rawUnits = Math.max(0, hpToUnits(amount));
    const immediateUnits = Math.round(rawUnits * immediateFraction);
    const deferredUnits = rawUnits - immediateUnits;
    const base = Math.floor(deferredUnits / ticks);
    const remainder = deferredUnits % ticks;
    return {
        raw: unitsToHP(rawUnits), immediate: unitsToHP(immediateUnits), deferred: unitsToHP(deferredUnits),
        ticksUnits: Array.from({ length: ticks }, (_, index) => base + (index < remainder ? 1 : 0))
    };
}
