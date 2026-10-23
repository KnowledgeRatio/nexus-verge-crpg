import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';
import { escapeAttribute } from '../../src/utils/combatNumberFormat.js';
import SettlementUI, { formatQuestReputation } from '../../src/ui/SettlementUI.js';
import RelationManager from '../../src/systems/RelationManager.js';
import QuestManager from '../../src/systems/QuestManager.js';

const source = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const extract = name => {
    const [, parameters, body] = source.match(new RegExp(` {4}${name}\\(([^)]*)\\) \\{([\\s\\S]*?)\\n {4}\\}`));
    return new Function('gameState', 'RULES', 'escapeAttribute', 'isRichQuest', 'formatQuestReputation',
        `return function(${parameters}) {${body}}`)(gameState, RULES, escapeAttribute, () => false, formatQuestReputation);
};
const methods = Object.fromEntries(['renderQuestCard', 'renderQuestBoard', 'renderFactionStanding',
    'setupCharacterSheet'].map(name => [name, extract(name)]));
const quest = { id: 'standing-quest', name: 'A commission', status: 'available', settlementId: 'town',
    objectives: [], rewards: { xp: 100, gold: 20, reputation: { faction: 'all', amount: 25 } } };
const cultures = [{ id: 'riverfolk', name: 'Riverfolk' }, { id: 'townbound', name: 'Townbound' }];
const preview = { available: true, changes: cultures.map(culture => ({
    targetId: culture.id, targetName: culture.name, amount: 25
})) };
const unsubscribes = [];

beforeEach(() => {
    gameState.reset();
    vi.useFakeTimers();
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', { getElementById: () => null, querySelectorAll: () => [], addEventListener: vi.fn() });
});
afterEach(() => {
    for (const unsubscribe of unsubscribes.splice(0)) {
        unsubscribe();
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('named quest standing previews', () => {
    it('names every affected culture with the signed authored reward in board and journal', () => {
        const board = {};
        document.getElementById = id => id === 'questBoardCards' ? board : null;
        gameState.set('quests.available', [quest]);
        const ui = { ...methods, questManager: { getQuestReputationPreview: vi.fn(() => preview) } };
        ui.renderQuestBoard('town');
        const journal = ui.renderQuestCard(quest, 'active');
        for (const html of [board.innerHTML, journal]) {
            expect(html).toContain('+25 standing with Riverfolk');
            expect(html).toContain('+25 standing with Townbound');
            expect(html).not.toContain('+25 Rep');
        }
    });

    it('shows signed losses correctly and does not promise unavailable targets', () => {
        expect(formatQuestReputation({ available: true, changes: [{ targetName: 'Riverfolk', amount: -25 }] }))
            .toBe('-25 standing with Riverfolk');
        const ui = { ...methods,
            questManager: { getQuestReputationPreview: () => ({ available: false, changes: [] }) } };
        const html = ui.renderQuestCard(quest, 'active');
        expect(html).toContain('Standing reward unavailable');
        expect(html).not.toContain('+25');
        expect(formatQuestReputation({ available: true, changes: [] })).toBe('');
    });

    it('escapes culture names in journal and NPC offer HTML', () => {
        const malicious = { available: true, changes: [{ targetName: '<img src=x>', amount: 25 }] };
        const manager = { getQuest: () => quest, getQuestReputationPreview: () => malicious };
        const ui = { ...methods, questManager: manager };
        expect(ui.renderQuestCard(quest, 'active')).toContain('&lt;img');
        expect(ui.renderQuestCard(quest, 'active')).not.toContain('<img');
        window.questManager = manager;
        const text = {};
        const options = { querySelector: () => null };
        document.getElementById = id => id === 'npcDialogueText' ? text : options;
        SettlementUI.prototype.showQuestDetails.call({ renderQuestStakes: () => '' }, quest.id, {});
        expect(text.innerHTML).toContain('+25 standing with &lt;img src=x&gt;');
        expect(text.innerHTML).not.toContain('<img');
    });

    it('uses the same target list on the NPC offer surface', () => {
        window.questManager = { getQuest: () => quest, getQuestReputationPreview: () => preview };
        const text = {};
        const options = { querySelector: () => null };
        document.getElementById = id => id === 'npcDialogueText' ? text : options;
        SettlementUI.prototype.showQuestDetails.call({ renderQuestStakes: () => '' }, quest.id, {});
        expect(text.innerHTML).toContain('+25 standing with Riverfolk; +25 standing with Townbound');
    });
});

describe('actual standing feedback and character sheet', () => {
    it('keeps an accepted ordinary skill quest available for NPC turn-in despite incidental evidence', () => {
        const npc = { id: 'giver', name: 'A guide', dialogue: {} };
        const ordinary = { ...quest, id: 'ordinary-skill', questGiver: { npcId: npc.id },
            actions: [], resolutions: [], objectives: [{ type: 'skill', description: 'Make a check',
                requirement: { challengeId: 'normal-check', requireSuccess: true },
                required: 1, progress: 0, completed: false }] };
        gameState.set('quests', { available: [ordinary], active: [], completed: [], failed: [] });
        const manager = new QuestManager({});
        window.questManager = manager;
        expect(manager.acceptQuest(ordinary.id, npc.id)).toBe(true);
        expect(ordinary.evidence).toBeDefined();
        manager.onSkillChallengeCompleted('normal-check', { success: true });
        expect(manager.isQuestReadyToComplete(ordinary.id)).toBe(true);
        const rich = { ...quest, id: 'choice-quest', questGiver: { npcId: npc.id },
            participants: { issuer: { npcId: npc.id } }, actions: [{ id: 'inspect' }], status: 'active' };
        gameState.get('quests.active').push(rich);
        const ui = Object.create(SettlementUI.prototype);
        const text = {};
        const options = { querySelectorAll: () => [], querySelector: () => null };
        ui.showQuestOptions(npc, text, options);
        expect(ui.hasQuestChoices(ordinary)).toBe(false);
        expect(options.innerHTML).toContain('class="dialogue-option quest-turn-in" data-quest-id="ordinary-skill"');
        expect(options.innerHTML).not.toContain('data-quest-id="choice-quest"');
        expect(ui.hasQuestChoices(rich)).toBe(true);
        expect(ui.getParticipantQuests(npc)).toEqual([rich]);
    });

    it('shows actual capped delta and zero change without claiming the authored reward was received', () => {
        const actual = [{ targetId: 'riverfolk', targetName: 'Riverfolk', amount: 1, previous: 99, current: 100 },
            { targetId: 'townbound', targetName: 'Townbound', amount: 0, previous: 100, current: 100 }];
        const text = {};
        document.getElementById = () => text;
        const claimed = { dataset: { questId: quest.id }, disabled: false, textContent: 'Turn in' };
        const other = { dataset: { questId: 'other-quest' }, disabled: false, textContent: 'Turn in another quest' };
        document.querySelectorAll = selector => selector === '#npcDialogueOptions .quest-turn-in' ? [claimed, other] : [];
        window.questManager = { getQuest: () => quest,
            completeQuest: () => ({ success: true, rewards: { xp: 100, gold: 20, reputation: actual } }) };
        window.showQuestNotification = vi.fn();
        const messages = vi.spyOn(gameState, 'addMessage');
        SettlementUI.prototype.turnInQuest.call({ closeNPCDialogue: vi.fn() }, quest.id, { dialogue: {} });
        expect(text.innerHTML).toContain('+1 standing with Riverfolk (99 → 100)');
        expect(text.innerHTML).toContain('Townbound: standing unchanged (100)');
        expect(text.innerHTML).not.toContain('+25');
        expect(window.showQuestNotification).toHaveBeenCalledWith('Quest Complete!', quest.name, 'success');
        expect(messages).not.toHaveBeenCalled();
        expect(claimed.disabled).toBe(true);
        expect(claimed.textContent).toBe(`✓ Claimed: ${quest.name}`);
        expect(other.disabled).toBe(false);
        expect(other.textContent).toBe('Turn in another quest');
        const journal = methods.renderQuestCard.call({ questManager: { getQuestReputationPreview: () => preview } },
            { ...quest, rewardReceipt: { summary: { reputation: actual } } }, 'completed');
        expect(journal).toContain('+1 standing with Riverfolk (99 → 100)');
        expect(journal).not.toContain('+25');
    });

    it('shows a standing warning while preserving the actual XP and gold received', () => {
        const text = {};
        document.getElementById = () => text;
        window.questManager = { getQuest: () => quest, completeQuest: () => ({ success: true,
            rewards: { xp: 100, gold: 20, reputation: [], reputationWarning: 'Community not identified' } }) };
        SettlementUI.prototype.turnInQuest.call({ closeNPCDialogue: vi.fn() }, quest.id, { dialogue: {} });
        expect(text.innerHTML).toContain('100 XP');
        expect(text.innerHTML).toContain('20 Gold');
        expect(text.innerHTML).toContain('Standing reward unavailable: Community not identified');
        expect(text.innerHTML).not.toContain('+25');
    });

    it('shows numeric standing and tier from the actual RelationManager before and after save restoration', () => {
        const relationManager = new RelationManager();
        relationManager.config = JSON.parse(readFileSync(new URL('../../data/relations.json', import.meta.url)));
        relationManager.tierLookup = relationManager.config.tiers;
        const ui = { ...methods, relationManager, npcGenerator: { culturesData: cultures } };
        window.game = ui;
        gameState.set('factions.riverfolk', 99);
        relationManager.modifyFactionReputation('riverfolk', 25);
        expect(ui.renderFactionStanding()).toContain('100 · Allied');
        expect(ui.renderFactionStanding()).toContain('0 · Neutral');
        const saved = JSON.parse(JSON.stringify(gameState.get('factions')));
        gameState.set('factions', saved);
        expect(ui.renderFactionStanding()).toContain('100 · Allied');
    });

    it('updates an open sheet on standing changes and load without duplicating subscriptions', () => {
        let active = true;
        const modal = { classList: { contains: () => active } };
        document.getElementById = id => id === 'characterSheetModal' ? modal : null;
        const subscribe = gameState.subscribe.bind(gameState);
        const spy = vi.spyOn(gameState, 'subscribe').mockImplementation((path, callback) => {
            const unsubscribe = subscribe(path, callback);
            unsubscribes.push(unsubscribe);
            return unsubscribe;
        });
        const ui = { ...methods, renderCharacterSheet: vi.fn() };
        ui.setupCharacterSheet();
        ui.setupCharacterSheet();
        expect(spy.mock.calls.map(([path]) => path)).toEqual(['factions', '*']);
        gameState.set('factions.riverfolk', 25);
        expect(ui.renderCharacterSheet).toHaveBeenCalledOnce();
        gameState.notify('*', gameState.data);
        expect(ui.renderCharacterSheet).toHaveBeenCalledTimes(2);
        active = false;
        gameState.set('factions.riverfolk', 26);
        expect(ui.renderCharacterSheet).toHaveBeenCalledTimes(2);
    });
});
