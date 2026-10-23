export function hasExplicitQuestStanding(quest) {
    return Boolean(quest.rewards?.reputation || quest.resolutions?.some(choice =>
        choice.effects?.some(effect => effect.type === 'faction')));
}

export function hasFactionResolution(quest) {
    return quest.resolutions?.some(choice => choice.effects?.some(effect => effect.type === 'faction'));
}

export function questOriginSettlementId(quest) {
    const candidates = [quest.questGiver?.settlementId, quest.settlementId,
        quest.objectives?.find(objective => objective.type === 'return')?.requirement?.settlementId,
        Number.isFinite(quest.settlement?.x) && Number.isFinite(quest.settlement?.y)
            ? `${quest.settlement.x},${quest.settlement.y}` : quest.settlement?.id];
    return candidates.find(value => typeof value === 'string' && value && !/[{}]/.test(value)) || null;
}

export function settlementCultureTargets(world, settlementId, cultures, giver = null) {
    const settlements = [...Object.values(world.settlements || {}), ...(world.metadata?.settlements || []),
        ...Array.from(world.generatedRegions?.values?.() || []).flatMap(region => region.features || [])];
    const coordinateId = /^-?\d+_-?\d+$/.test(settlementId) ? settlementId.replace('_', ',') : settlementId;
    const rosters = settlements.filter(settlement => settlementId && (settlement.id === settlementId
        || `${settlement.x},${settlement.y}` === coordinateId)).map(settlement => settlement.npcs || []);
    const roster = rosters.find(npcs => npcs.some(npc => cultures.some(culture => culture.id === npc.culture)));
    const ids = roster ? roster.map(npc => npc.culture) : giver?.culture ? [giver.culture] : [];
    return cultures.filter(culture => ids.includes(culture.id));
}

export function questStandingPreview(quest, world, cultures, giver, relationManager) {
    const reward = quest.rewards?.reputation;
    if (!reward || hasFactionResolution(quest)) {
        return { available: true, reason: null, changes: [] };
    }
    const unavailable = reason => ({ available: false, reason, changes: [] });
    if (!Number.isFinite(reward.amount)) {
        return unavailable('The standing reward amount is invalid.');
    }
    if (!cultures?.length || !relationManager?.config || !relationManager.tierLookup?.length
        || !relationManager.modifyFactionReputation || !relationManager.previewFactionReputation) {
        return unavailable('Culture standing is not currently available.');
    }
    let targets;
    if (reward.faction === 'all') {
        targets = cultures;
    } else if (['settlement', 'both'].includes(reward.faction)) {
        const originId = questOriginSettlementId(quest);
        targets = settlementCultureTargets(world, originId, cultures, giver);
        if (!targets.length) {
            return unavailable('The issuing community for this standing reward is unknown.');
        }
        if (reward.faction === 'both') {
            const destinationId = quest.generationData?.targetSettlementId
                || quest.objectives?.find(objective => objective.type === 'travel')?.requirement?.settlementId;
            const destination = settlementCultureTargets(world, destinationId, cultures);
            if (!destination.length) {
                return unavailable('The delivery community for this standing reward is unknown.');
            }
            targets = [...targets, ...destination];
        }
    } else {
        return unavailable('The authored standing reward target is unsupported.');
    }
    return { available: true, reason: null, changes: [...new Map(targets.map(target => [target.id, target])).values()]
        .map(target => ({ targetId: target.id, targetName: target.name || target.id, amount: reward.amount })) };
}
