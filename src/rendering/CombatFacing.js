/** Choose a visual threat; engagement order is not a facing or movement rule. */
export function facingPartner(actor, actors, partners, now) {
    const living = id => id !== actor.combatant.id && actors.get(id)?.combatant.hp > 0;
    if (actor.actionUntil > now && living(actor.facingTarget)) {
        return actor.facingTarget;
    }
    const incoming = actors.get(actor.incomingSource);
    if (living(actor.incomingSource) && (incoming?.actionUntil > now ||
        (actor.hit || actor.miss) && actor.feedbackUntil > now)) {
        return actor.incomingSource;
    }
    let closest;
    let distance = Infinity;
    for (const id of partners || []) {
        if (!living(id)) {
            continue;
        }
        const position = actors.get(id).root.position;
        const next = Math.hypot(position.x - actor.root.position.x, position.z - actor.root.position.z);
        if (next < distance) {
            closest = id;
            distance = next;
        }
    }
    return closest;
}
