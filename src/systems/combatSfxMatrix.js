/** Resolve a combat sound from the small set of playable attack families. */
export function combatSfxFamily(config, event = {}) {
    if (event.family && config.matrix[event.family]) {
        return event.family;
    }
    for (const [family, ids] of Object.entries(config.weaponFamilies)) {
        if (ids.includes(event.weaponId)) {
            return family;
        }
    }
    if (event.attackKind?.includes('Spell') ||
        ['fire', 'cold', 'necrotic', 'resonant', 'elemental'].includes(event.damageType)) {
        return null;
    }
    return event.weaponType === 'ranged' ? 'lightProjectile' : 'natural';
}

export function combatSfxKey(config, phase, event = {}) {
    if (event.healing) {
        return phase === 'impact' ? 'heal' : null;
    }
    if (event.downed) {
        if (phase !== 'impact' || config.incorporealMonsters.includes(event.monsterId)) {
            return null;
        }
        if (event.monsterId) {
            return 'creatureFall';
        }
        return config.metalArmor.includes(event.defenderArmorId) ? 'downedArmored' : 'bodyFall';
    }
    const family = combatSfxFamily(config, event);
    const row = family && config.matrix[family];
    if (!row) {
        return null;
    }
    if (phase === 'release') {
        return row.release;
    }
    if (phase !== 'impact' || !event.hit) {
        return null;
    }
    if (event.blocked) {
        return row.block || null;
    }
    const surface = config.metalArmor.includes(event.defenderArmorId) ? 'metal' : 'soft';
    return row[surface];
}
