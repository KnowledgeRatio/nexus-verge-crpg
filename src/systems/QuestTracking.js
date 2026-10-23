/** Pure quest navigation projections. Hidden bindings never leave this module's VM. */
export function parseQuestPosition(value) {
    if (typeof value === 'string') {
        const parts = value.split(',');
        if (parts.length !== 2 || parts.some(part => part.trim() === '')) {
            return null;
        }
        value = { x: Number(parts[0]), y: Number(parts[1]) };
    }
    return Number.isFinite(value?.x) && Number.isFinite(value?.y) ? { x: value.x, y: value.y } : null;
}

export function questTrackingTarget(quest, objective = null) {
    const requirement = objective?.requirement;
    const position = parseQuestPosition(objective?.targetLocation)
        || parseQuestPosition(objective?.dungeonHookId)
        || parseQuestPosition(requirement?.location?.dungeonHookId)
        || parseQuestPosition(requirement?.location)
        || parseQuestPosition(requirement?.source?.siteId)
        || parseQuestPosition(quest.dungeonHookId);
    if (!position && !objective) {
        const first = quest.objectives?.find(entry => !entry.optional && entry.required !== false);
        return first ? questTrackingTarget(quest, first) : null;
    }
    return position ? { ...position, key: `${position.x},${position.y}` } : null;
}

export function questIssuer(quest, world = {}) {
    const id = quest.questGiver?.settlementId || quest.settlementId;
    const settlement = [...(world.settlements || []), ...(world.metadata?.settlements || [])]
        .find(entry => entry.id === id || `${entry.x},${entry.y}` === id);
    const position = parseQuestPosition(settlement) || parseQuestPosition(id);
    return position ? { ...position, label: settlement?.name || quest.questGiver?.npcName || 'Quest giver' } : null;
}

export function questBearing(origin, target, bearings) {
    const index = Math.round(Math.atan2(target.x - origin.x, origin.y - target.y) / (2 * Math.PI / bearings.length));
    return bearings[(index + bearings.length) % bearings.length];
}

export function sanitizeTrackedQuestId(quests) {
    return typeof quests?.trackedQuestId === 'string'
        && quests.active?.some(quest => quest.id === quests.trackedQuestId && !['completed', 'failed'].includes(quest.status))
        ? quests.trackedQuestId : null;
}

function prerequisitesReady(quest, objective) {
    return (objective.requiresObjectives || []).every(id =>
        quest.objectives?.some(entry => entry.id === id && entry.completed))
        && (objective.requiresFacts || []).every(id => quest.evidence?.facts?.includes(id))
        && (objective.requiresActions || []).every(id => quest.evidence?.actions?.includes(id))
        && (objective.excludesObjectives || []).every(id =>
            !quest.objectives?.some(entry => entry.id === id && entry.completed))
        && (objective.excludesActions || []).every(id => !quest.evidence?.actions?.includes(id));
}

function isReturnObjective(objective) {
    return objective.type === 'return' || objective.location === 'settlement';
}

export function questHasLocationProof(quest, target, world, regionSize) {
    if (world.metadata?.features?.some(feature => feature.x === target.x && feature.y === target.y && feature.explored)
        || world.modifiedTiles?.some(tile => tile.x === target.x && tile.y === target.y && tile.explored)) {
        return true;
    }
    const regions = world.generatedRegions;
    const rx = Math.floor(target.x / regionSize);
    const ry = Math.floor(target.y / regionSize);
    const region = regions instanceof Map ? regions.get(`${rx},${ry}`) : null;
    const localX = target.x - rx * regionSize;
    const localY = target.y - ry * regionSize;
    if (region?.tiles?.[localY * regionSize + localX]?.explored
        || region?.exploredTiles?.some(tile => tile.x === localX && tile.y === localY && tile.explored)) {
        return true;
    }
    // These receipts only describe the quest's bound site, never an unrelated later target.
    const rich = quest.procedural || quest.baseline || quest.actions?.length || quest.resolutions?.length;
    return Boolean(rich) && questTrackingTarget(quest)?.key === target.key
        && (quest.evidence?.siteSearched === true || quest.evidence?.facts?.includes('site_observed'));
}

export function projectQuestTracking(quest, world, config) {
    if (!quest || !config?.enabled) {
        return null;
    }
    const required = (quest.objectives || []).filter(objective => !objective.optional && objective.required !== false);
    const fieldwork = required.filter(objective => !isReturnObjective(objective));
    const returning = (quest.objectives || []).length > 0 && fieldwork.every(objective => objective.completed);
    const objective = returning ? required.find(entry => isReturnObjective(entry) && !entry.completed)
        : fieldwork.find(entry => !entry.completed && prerequisitesReady(quest, entry));
    const vm = { questId: quest.id, questName: quest.name,
        stage: returning ? 'return' : 'objective', objectiveId: objective?.id ?? null,
        objectiveText: objective?.description || (returning ? 'Return to the quest giver' : 'Find the quest location'),
        intelQuality: 'none', navigation: { type: 'unknown', label: 'Location unknown' } };
    if (returning) {
        const issuer = questIssuer(quest, world);
        if (issuer) {
            vm.intelQuality = 'high';
            vm.navigation = { type: 'exact', ...issuer };
        }
        return vm;
    }
    // A blocked prerequisite must not guide the player to a later objective.
    if (!objective) {
        vm.stage = 'unlocated';
        return vm;
    }
    const target = questTrackingTarget(quest, objective);
    if (!target) {
        vm.stage = 'unlocated';
        return vm;
    }
    const receipt = quest.trackingIntel?.targetKey === target.key ? quest.trackingIntel : null;
    const recordedQuality = quest.trackingDiscoveries?.[target.key] ? 'high' : receipt?.quality;
    const quality = config.qualityModes[recordedQuality] ? recordedQuality : 'none';
    const mode = config.qualityModes[quality] || 'unknown';
    vm.intelQuality = quality;
    if (mode === 'exact') {
        vm.navigation = { type: 'exact', x: target.x, y: target.y, label: quest.dungeonName || 'Quest site' };
    } else if (mode === 'area') {
        const size = config.searchAreaSize;
        const minX = Math.floor(target.x / size) * size;
        const minY = Math.floor(target.y / size) * size;
        vm.navigation = { type: 'area', minX, minY, maxX: minX + size, maxY: minY + size, label: 'Search area' };
    } else if (mode === 'direction' && receipt?.origin && receipt.bearing) {
        vm.navigation = { type: 'direction', originX: receipt.origin.x, originY: receipt.origin.y,
            bearing: receipt.bearing, label: `Reported ${receipt.bearing} of ${receipt.origin.label}` };
    } else {
        vm.stage = 'unlocated';
    }
    return vm;
}
