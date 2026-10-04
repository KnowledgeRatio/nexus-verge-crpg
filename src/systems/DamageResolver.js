import { RULES } from '../core/rulesEngine.js';
import { hpToUnits, unitsToHP } from '../utils/damagePrecision.js';

export function resolveDamageModifier(target, damageType, isMagical = false, damageFlavor = null) {
    const rules = RULES.combat.damageReductionSystem;
    if (!rules.enabled || RULES.combat.damageTypes.neutral.includes(damageType)) {
        return 'normal';
    }
    const types = [damageType];
    if (RULES.combat.damageTypes.elemental.includes(damageType)) {
        types.push('elemental');
    }
    if (damageType === 'elemental' && RULES.combat.damageTypes.elemental.includes(damageFlavor)) {
        types.push(damageFlavor);
    }
    const matches = entries => (entries ?? []).some(entry => types.some(type => entry === type
        || (!isMagical && entry === `nonmagical ${type}`)));
    if (matches(target.damageImmunities ?? target.character?.damageImmunities)) {
        return 'immune';
    }
    if (matches(target.damageVulnerabilities ?? target.character?.damageVulnerabilities)) {
        return 'vulnerable';
    }
    if (matches(target.damageResistances ?? target.character?.damageResistances)) {
        return 'resistant';
    }
    return 'normal';
}

// Components are mitigated independently, then delivered as one damage event so that
// subdividing a bleed cannot multiply concentration checks. Public HP stays in points.
export function resolveDamageComponents(target, components) {
    const rules = RULES.combat.damageReductionSystem;
    let totalUnits = 0;
    const resolved = components.map(component => {
        const rawUnits = Math.max(0, hpToUnits(component.amount));
        const modifier = resolveDamageModifier(target, component.damageType, component.isMagical, component.damageFlavor);
        const multiplier = { normal: 1, immune: rules.immunityMultiplier,
            resistant: rules.resistanceMultiplier, vulnerable: rules.vulnerabilityMultiplier }[modifier];
        const finalUnits = Math.round(rawUnits * multiplier);
        totalUnits += finalUnits;
        return { ...component, raw: unitsToHP(rawUnits), modifier, final: unitsToHP(finalUnits) };
    });
    const hpBefore = target.hp ?? target.currentHP;
    const final = unitsToHP(totalUnits);
    const damage = target.takeDamage(final);
    const hpDamage = unitsToHP(hpToUnits(hpBefore) - hpToUnits(target.hp ?? target.currentHP));
    return { raw: unitsToHP(resolved.reduce((sum, component) => sum + hpToUnits(component.raw), 0)),
        final, hpDamage, tempHPUsed: damage?.tempHPUsed ?? 0, components: resolved,
        modifier: resolved.length === 1 ? resolved[0].modifier : 'mixed' };
}
