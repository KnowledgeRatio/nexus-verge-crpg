/** Canonical condition immunity also works with restored plain character data. */
export function isConditionImmune(target, type) {
    return (target.conditionImmunities ?? target.character?.conditionImmunities ?? []).includes(type);
}

/** Explain a rejected addCondition call without claiming an effect was applied. */
export function conditionRejectionMessage(target, type) {
    return isConditionImmune(target, type)
        ? `${target.name} is immune to ${type}.`
        : `${target.name} is already affected by ${type}.`;
}
