import { RULES } from '../core/rulesEngine.js';

export function fractionalCombatEnabled() {
    return RULES.combat.damageOverTime?.enabled === true;
}

export function formatCombatNumber(value, enabled = fractionalCombatEnabled()) {
    if (!enabled || typeof value !== 'number' || !Number.isFinite(value)) {
        return String(value);
    }
    const rounded = Math.round(value * 1000) / 1000;
    if (value > 0 && rounded === 0) {
        return '<0.001';
    }
    return String(Object.is(rounded, -0) ? 0 : rounded);
}

export function healthBarAttributes(hp, maxHP) {
    if (!fractionalCombatEnabled()) {
        return '';
    }
    const current = Math.max(0, Math.min(maxHP, hp));
    return ` role="progressbar" aria-label="Health" aria-valuemin="0" aria-valuemax="${maxHP}" aria-valuenow="${current}" aria-valuetext="${formatCombatNumber(current)} of ${formatCombatNumber(maxHP)} health"`;
}

export function conditionDescription(condition, sourceName = id => id) {
    const base = `${condition.icon} ${condition.type}`;
    if (!fractionalCombatEnabled() || !condition.periodicDamage?.tranches?.length) {
        return base;
    }
    const unitsPerHP = RULES.combat.damageOverTime.unitsPerHP;
    const pending = condition.periodicDamage.tranches.map(tranche => ({
        ...tranche,
        remaining: tranche.ticksUnits.slice(tranche.cursor)
    })).filter(tranche => tranche.remaining.length);
    const nextTick = pending.reduce((sum, tranche) => sum + tranche.remaining[0], 0) / unitsPerHP;
    const total = pending.reduce((sum, tranche) => sum + tranche.remaining.reduce((a, b) => a + b, 0), 0) / unitsPerHP;
    const turns = Math.max(0, ...pending.map(tranche => tranche.remaining.length));
    const sources = [...new Set(pending.map(tranche => sourceName(tranche.sourceId) || 'Unknown source'))];
    const damageTypes = [...new Set(pending.map(tranche => tranche.damageType))].join('/');
    return `${base}: next turn ${formatCombatNumber(nextTick)}, pending ${formatCombatNumber(total)} ${damageTypes} damage before defenses; final tick in ${turns} target turn${turns === 1 ? '' : 's'}. Sources: ${sources.join(', ')}. Cleansing cancels remaining damage.`;
}

export function escapeAttribute(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
