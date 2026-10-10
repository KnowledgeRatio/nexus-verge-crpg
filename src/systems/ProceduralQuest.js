import { gameState } from '../core/GameState.js';
import { RULES } from '../core/rulesEngine.js';
import { skillRegistry } from './SkillRegistry.js';
import { addFatigue } from './FatigueManager.js';

export const isRichQuest = quest => Boolean(quest && (quest.procedural
    || quest.actions?.length || quest.resolutions?.length || quest.baseline));
export const questEffectTypes = ['faction', 'relation', 'merchant_stock', 'target_cleared'];

export function ensureQuestState(quest) {
    quest.evidence ||= {};
    quest.evidence.facts ||= [];
    quest.evidence.actions ||= [];
    quest.evidence.attempts ||= {};
    quest.receipts ||= { acquisitions: [], victories: [] };
    quest.receipts.acquisitions ||= [];
    quest.receipts.victories ||= [];
    for (const [index, objective] of (quest.objectives || []).entries()) {
        objective.id ||= `${objective.type}_${index}`;
    }
    return quest;
}

export const getQuestParticipants = quest => quest.participants || quest.procedural?.participants || {};

export function matchesQuestEncounter(expected, source) {
    if (!expected?.siteId || !expected.encounterKey || !expected.encounterRole
        || !source?.targetId || !source.encounterId || !Number.isInteger(source.roomIndex)) {
        return false;
    }
    return ['siteId', 'encounterKey', 'encounterRole', 'roomIndex', 'targetId', 'encounterId']
        .every(key => expected[key] === undefined || expected[key] === source[key]);
}

export function getCustodyQuantity(quest, custody, character = gameState.get('character')) {
    return (character?.inventory || []).filter(item => item.id === custody.itemId
        && item.questSource?.questId === quest.id && item.questSource?.sourceId === custody.sourceId)
        .reduce((quantity, item) => quantity + (Number.isInteger(item.quantity) ? Math.max(0, item.quantity) : 0), 0);
}

export function refreshCustodyObjectives(quest, character = gameState.get('character')) {
    ensureQuestState(quest);
    for (const objective of quest.objectives || []) {
        const requirement = objective.requirement;
        if (objective.type === 'retrieve' && requirement?.sourceId) {
            objective.progress = getCustodyQuantity(quest, requirement, character);
            objective.completed = objective.progress >= (objective.required || requirement.quantity || 1);
        }
    }
}

export function prerequisitesMet(quest, entry) {
    ensureQuestState(quest);
    return (entry.requiresFacts || []).every(id => quest.evidence.facts.includes(id))
        && (entry.requiresActions || []).every(id => quest.evidence.actions.includes(id))
        && (entry.excludesActions || []).every(id => !quest.evidence.actions.includes(id))
        && (entry.excludesObjectives || []).every(id => !quest.objectives?.some(objective =>
            objective.id === id && objective.completed))
        && (entry.requiresObjectives || []).every(id => quest.objectives?.some(objective =>
            objective.id === id && objective.completed))
        && (quest.resolutionPending?.choiceId === entry.id && quest.resolutionPending.custodyConsumed
            || (entry.custody || []).every(custody => custody.itemId && custody.sourceId
                && Number.isInteger(custody.quantity ?? custody.minimumQuantity ?? 1)
                && (custody.quantity ?? custody.minimumQuantity ?? 1) > 0
                && getCustodyQuantity(quest, custody) >= (custody.quantity ?? custody.minimumQuantity ?? 1)));
}

export function atQuestLocation(quest, entry) {
    if (gameState.get('combat.active') || gameState.get('combat.inCombat')) {
        return false;
    }
    const dungeon = gameState.get('dungeon');
    if (entry.location === 'site') {
        return dungeon?.active && dungeon.dungeonId === quest.dungeonHookId?.replace(',', '_')
            && dungeon.currentRoomIndex === (entry.roomIndex ?? 0);
    }
    const position = gameState.get('player.position') || gameState.get('player');
    return !dungeon?.active && `${position?.x},${position?.y}` === quest.settlementId;
}

export function questEntries(quest, entries) {
    if (!quest || !['active', 'ready_to_turn_in'].includes(quest.status)) {
        return [];
    }
    ensureQuestState(quest);
    return (entries || []).map(entry => ({ ...entry,
        available: prerequisitesMet(quest, entry) && atQuestLocation(quest, entry)
            && (!entry.id || !quest.evidence.actions.includes(entry.id))
            && (!quest.resolutionPending || quest.resolutionPending.choiceId === entry.id),
        reason: !prerequisitesMet(quest, entry) ? 'Complete the required objectives, evidence and goods recovery first.'
            : !atQuestLocation(quest, entry) ? 'Visit the indicated place first.' : null
    }));
}

export function observeQuestRoom(quest, dungeonX, dungeonY, roomIndex) {
    if (!quest.baseline || quest.dungeonHookId !== `${dungeonX},${dungeonY}` || roomIndex !== quest.baseline.roomIndex
        || !atQuestLocation(quest, { location: 'site', roomIndex })) {
        return false;
    }
    ensureQuestState(quest);
    let changed = false;
    for (const fact of quest.baseline.facts) {
        if (!quest.evidence.facts.includes(fact.id)) {
            quest.evidence.facts.push(fact.id);
            gameState.addMessage(fact.text, 'info');
            changed = true;
        }
    }
    quest.evidence.siteSearched = true;
    const objective = quest.baseline.objectiveId
        ? quest.objectives.find(entry => entry.id === quest.baseline.objectiveId)
        : quest.objectives.find(entry => entry.type === 'observe');
    if (objective?.type === 'observe' && !objective.completed && prerequisitesMet(quest, objective)) {
        objective.completed = true;
        objective.progress = 1;
        changed = true;
    }
    return changed;
}

export function performQuestAction(quest, actionId, npcId) {
    const action = quest.actions?.find(entry => entry.id === actionId);
    if (!action || !questEntries(quest, [action])[0]?.available) {
        return { success: false };
    }
    if (action.npcParticipant) {
        const settlement = (gameState.get('world.settlements') || []).find(entry => entry.id === quest.settlementId);
        if (getQuestParticipants(quest)[action.npcParticipant]?.npcId !== npcId
            || !settlement?.npcs?.some(npc => npc.id === npcId)) {
            return { success: false };
        }
    }
    const character = gameState.get('character');
    if (!character) {
        return { success: false };
    }
    const acquisition = action.acquire || action.salvage;
    const itemDefinition = acquisition && (globalThis.window?.lootManager?.getItemById(acquisition.itemId)
        || Object.values(globalThis.window?.game?.merchantManager?.merchantInventoryData || {})
            .filter(Array.isArray).flat().find(item => item.id === acquisition.itemId));
    if (acquisition && (!itemDefinition || !acquisition.sourceId || !Number.isInteger(acquisition.quantity)
        || acquisition.quantity <= 0 || quest.receipts.acquisitions.includes(action.id))) {
        return { success: false };
    }
    if (action.skillId) {
        const attempts = quest.evidence.attempts[action.id] || 0;
        if (attempts) {
            addFatigue(RULES.fatigue.skillChallengeFatigue, 'skillChallenge', character);
        }
        const config = { skillId: action.skillId, attribute: action.attribute,
            dc: action.dc ?? RULES.quests.proceduralCore.investigationDC };
        const manager = globalThis.window?.skillChallengeManager;
        const result = manager?.rollSkillCheck ? manager.rollSkillCheck(character, config)
            : skillRegistry.rollCheck(character, config);
        quest.evidence.attempts[action.id] = attempts + 1;
        gameState.set('character', character);
        if (!result.success) {
            gameState.addMessage('You cannot corroborate the cause yet. Your observations remain; another attempt adds fatigue.', 'warning');
            gameState.set('quests', gameState.get('quests'));
            return { success: false, attempted: true, check: result, quest };
        }
    }
    quest.evidence.actions.push(action.id);
    if (acquisition) {
        quest.receipts.acquisitions.push(action.id);
        character.inventory ||= [];
        const stack = character.inventory.find(item => item.id === acquisition.itemId
            && item.questSource?.questId === quest.id && item.questSource?.sourceId === acquisition.sourceId);
        if (stack) {
            stack.quantity += acquisition.quantity;
        } else {
            character.inventory.push({ ...itemDefinition, quantity: acquisition.quantity,
                type: 'quest_item', canDrop: false, usable: false,
                instanceId: `${quest.id}:${acquisition.sourceId}`,
                questSource: { questId: quest.id, sourceId: acquisition.sourceId } });
        }
        refreshCustodyObjectives(quest, character);
        gameState.set('character', character);
    }
    for (const fact of action.facts || []) {
        if (!quest.evidence.facts.includes(fact.id)) {
            quest.evidence.facts.push(fact.id);
        }
        gameState.addMessage(fact.text, 'info');
    }
    gameState.set('quests', gameState.get('quests'));
    return { success: true, quest };
}

function prepareDeliveries(quest, choice) {
    return (choice.custody || []).map(custody => ({ ...custody,
        quantity: custody.quantity ?? getCustodyQuantity(quest, custody)
    }));
}

function consumeDeliveries(quest, deliveries, character) {
    for (const delivery of deliveries.filter(entry => entry.consume)) {
        let remaining = delivery.quantity;
        for (const item of character.inventory || []) {
            if (item.id === delivery.itemId && item.questSource?.questId === quest.id
                && item.questSource?.sourceId === delivery.sourceId) {
                const consumed = Math.min(item.quantity, remaining);
                item.quantity -= consumed;
                remaining -= consumed;
            }
        }
    }
    character.inventory = (character.inventory || []).filter(item => !item.questSource || item.quantity > 0);
}

export function applyQuestResolution(manager, quest, choiceId) {
    manager.resolvingQuests ||= new Set();
    if (manager.resolvingQuests.has(quest.id)) {
        return { success: false };
    }
    const choice = quest.resolutions?.find(entry => entry.id === choiceId);
    if (!choice || quest.resolution || !questEntries(quest, [choice])[0]?.available) {
        return { success: false };
    }
    const character = gameState.get('character');
    const relations = globalThis.window?.game?.relationManager;
    const merchants = globalThis.window?.game?.merchantManager;
    const dungeons = globalThis.window?.game?.dungeonManager;
    if (!character) {
        return { success: false };
    }
    const deliveries = quest.resolutionPending?.deliveries || prepareDeliveries(quest, choice);
    const custodyKeys = deliveries.map(delivery => `${delivery.sourceId}:${delivery.itemId}`);
    if (new Set(custodyKeys).size !== custodyKeys.length) {
        return { success: false };
    }
    const effectQuantity = effect => effect.quantityFromCustody
        ? deliveries.filter(delivery => delivery.sourceId === effect.quantityFromCustody
            && delivery.itemId === effect.itemId && delivery.consume)
            .reduce((quantity, delivery) => quantity + delivery.quantity, 0)
        : effect.quantity ?? RULES.quests.proceduralCore.shipmentQuantity;
    const effectProof = effect => quest.objectives.find(objective =>
        objective.id === effect.sourceObjectiveId && objective.completed)?.proof;
    const effectIds = (choice.effects || []).map(effect => effect.id);
    if (effectIds.some(id => !id) || new Set(effectIds).size !== effectIds.length) {
        return { success: false };
    }
    for (const effect of choice.effects || []) {
        if (quest.resolutionPending?.appliedEffects.includes(effect.id)) {
            continue;
        }
        const participant = getQuestParticipants(quest)[effect.participant];
        if (effect.type !== 'target_cleared' && !participant) {
            return { success: false };
        }
        if (!questEffectTypes.includes(effect.type)) {
            return { success: false };
        }
        if (effect.type === 'faction' && !globalThis.window?.game?.npcGenerator?.culturesData
            ?.some(culture => culture.id === participant.culture)) {
            return { success: false };
        }
        if (effect.type === 'faction' && !Number.isFinite(RULES.reputation.questRewards[effect.rewardTier])) {
            return { success: false };
        }
        if (effect.type === 'faction' && !relations?.modifyFactionReputation) {
            return { success: false };
        }
        if (effect.type === 'relation' && (!relations?.config?.modifiers?.[effect.modifier]
            || !manager._findNPCById(participant.npcId))) {
            return { success: false };
        }
        if (effect.type === 'merchant_stock' && (!Number.isInteger(effectQuantity(effect))
            || effectQuantity(effect) <= 0)) {
            return { success: false };
        }
        if (effect.type === 'merchant_stock' && !merchants?.canAddQuestStock(quest.settlementId, effect.itemId, participant.role)) {
            return { success: false };
        }
        if (effect.type === 'target_cleared') {
            const objective = quest.objectives.find(entry => entry.id === effect.sourceObjectiveId);
            if (!matchesQuestEncounter(objective?.requirement?.source, effectProof(effect))
                || !dungeons?.canClearQuestEncounter(effectProof(effect))) {
                return { success: false };
            }
        }
    }
    manager.resolvingQuests.add(quest.id);
    try {
        quest.resolutionPending ||= { choiceId, deliveries, custodyConsumed: false, appliedEffects: [], rewards: null };
        const pending = quest.resolutionPending;
        if (!pending.custodyConsumed) {
            consumeDeliveries(quest, deliveries, character);
            pending.custodyConsumed = true;
            gameState.set('character', character);
        }
        for (const effect of choice.effects || []) {
            if (pending.appliedEffects.includes(effect.id)) {
                continue;
            }
            const participant = getQuestParticipants(quest)[effect.participant];
            pending.appliedEffects.push(effect.id);
            let applied;
            if (effect.type === 'faction') {
                applied = relations.modifyFactionReputation(participant.culture,
                    RULES.reputation.questRewards[effect.rewardTier]);
            } else if (effect.type === 'relation') {
                const npc = manager._findNPCById(participant.npcId);
                applied = relations.modifyRelation(npc, effect.modifier,
                    { contributeToFaction: false });
                if (applied) {
                    manager._persistNPCRelations(npc);
                }
            } else if (effect.type === 'merchant_stock') {
                applied = merchants.addQuestStock(quest.settlementId, quest.id, effect.id, effect.itemId,
                    participant.role, effectQuantity(effect));
            } else if (effect.type === 'target_cleared') {
                applied = dungeons.clearQuestEncounter(effectProof(effect), quest.id, effect.id);
            }
            if (!applied) {
                pending.appliedEffects = pending.appliedEffects.filter(id => id !== effect.id);
                gameState.set('quests', gameState.get('quests'));
                return { success: false };
            }
        }
        const multiplier = choice.incomplete ? RULES.quests.proceduralCore.incompleteRewardMultiplier : 1;
        if (!pending.rewards) {
            const rewards = {
                xp: Math.round((quest.rewards?.xp || 0) * multiplier),
                gold: Math.round((quest.rewards?.gold || 0) * multiplier)
            };
            pending.rewards = { ...rewards, item: null, reputation: null };
            pending.rewards = manager.awardRewards({ ...quest, rewards }, character);
        }
        const rewards = pending.rewards;
        quest.resolution = { choiceId, result: choice.reply, reply: choice.reply,
            appliedEffects: pending.appliedEffects, deliveries: pending.deliveries, rewards };
        delete quest.resolutionPending;
        quest.status = 'completed';
        quest.completedAt = Date.now();
        const state = gameState.get('quests');
        state.active = state.active.filter(entry => entry.id !== quest.id);
        state.completed.push(quest);
        gameState.set('quests', state);
        gameState.addMessage(`${quest.name}: ${choice.reply} (+${rewards.xp} XP, +${rewards.gold} Gold)`, 'success');
        return { success: true, quest, rewards };
    } finally {
        manager.resolvingQuests.delete(quest.id);
    }
}
