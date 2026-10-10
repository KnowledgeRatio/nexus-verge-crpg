import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { gameState } from '../../src/core/GameState.js';
import SettlementUI from '../../src/ui/SettlementUI.js';
import QuestManager from '../../src/systems/QuestManager.js';

const mainSource = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const boardMethod = mainSource.match(/acceptQuestFromBoard\(questId\) \{([\s\S]*?)\n {4}\}/)[1];
const acceptFromBoard = new Function('gameState', `return function(questId) {${boardMethod}}`)(gameState);

describe('procedural quest presentation', () => {
    let ui;
    let manager;
    let quest;

    beforeEach(() => {
        gameState.reset();
        ui = Object.create(SettlementUI.prototype);
        quest = {
            id: 'disruption', name: 'Missing supplies',
            procedural: { participants: { giver: { npcId: 'giver', name: 'Sender' }, witness: { npcId: 'witness', name: 'Witness' } } },
            evidence: { facts: ['crate_found'] },
            baseline: { facts: [{ id: 'crate_found', text: 'The crate is here.' }, { id: 'secret', text: 'Unseen truth' }] },
            actions: [{ facts: [{ id: 'account', text: 'An account' }] }]
        };
        manager = {
            activeQuests: [quest],
            getQuestActions: vi.fn(() => [
                { id: 'recover', label: 'Recover supplies', location: 'site', available: true },
                { id: 'talk', label: 'Ask about supplies', location: 'settlement', npcParticipant: 'witness', available: false, reason: 'Return to town.' }
            ]),
            getResolutionOptions: vi.fn(() => [{ id: 'return', label: 'Return supplies', available: false, reason: 'Recover the goods first.' }]),
            recordQuestAction: vi.fn(() => ({ success: false, message: 'You must be at the site.' })),
            resolveQuest: vi.fn(() => ({ success: true, quest: { resolution: { reply: 'The shelves are stocked.' } } })),
            acceptQuest: vi.fn(() => true), getQuest: vi.fn(() => quest)
        };
        gameState.set('quests', { active: [quest], available: [], completed: [], failed: [] });
        gameState.set('character', { name: 'Adventurer', gold: 10 });
        vi.stubGlobal('window', { questManager: manager, gameState, game: {
            updateHUD: vi.fn(character => {
                expect(character.name).toBe('Adventurer');
            }),
            renderCurrentQuestTab: vi.fn()
        } });
        vi.stubGlobal('document', { getElementById: vi.fn(() => null) });
    });

    afterEach(() => vi.unstubAllGlobals());

    it('reveals only recorded facts and explains blocked choices in the journal', () => {
        const html = ui.renderProceduralQuest(quest);
        expect(html).toContain('The crate is here.');
        expect(html).not.toContain('Unseen truth');
        expect(html).toContain('Recover the goods first.');
        expect(html).toContain('disabled');
        expect(html).toContain('Ask about supplies — Witness');
    });

    it('shows testimony only at its bound participant and reporting only at the giver', () => {
        const witnessHTML = ui.renderProceduralQuest(quest, { npc: { id: 'witness' } });
        expect(witnessHTML).toContain('Ask about supplies');
        expect(witnessHTML).not.toContain('Recover supplies');
        expect(witnessHTML).not.toContain('Return supplies');
        expect(ui.getParticipantQuests({ id: 'stranger' })).toEqual([]);
        const giverHTML = ui.renderProceduralQuest(quest, { npc: { id: 'giver' } });
        expect(giverHTML).toContain('Return supplies');
        expect(giverHTML).not.toContain('Ask about supplies');
    });

    it('preserves manager rejection and uses the same resolution API for both surfaces', () => {
        expect(ui.performQuestChoice('disruption', 'recover', 'quest-evidence').success).toBe(false);
        expect(manager.recordQuestAction).toHaveBeenCalledExactlyOnceWith('disruption', 'recover', null);
        expect(quest.evidence.facts).toEqual(['crate_found']);
        ui.performQuestChoice('disruption', 'return', 'quest-resolve');
        expect(manager.resolveQuest).toHaveBeenCalledExactlyOnceWith('disruption', 'return');
        expect(window.game.renderCurrentQuestTab).toHaveBeenCalledTimes(2);
        expect(window.game.updateHUD).toHaveBeenCalledWith(gameState.get('character'));
    });

    it('keeps remembered outcomes without offering completed quest actions', () => {
        quest.resolution = { reply: 'The shelves are stocked.' };
        const html = ui.renderProceduralQuest(quest, { active: false });
        expect(html).toContain('The shelves are stocked.');
        expect(html).not.toContain('data-choice-id');
        expect(manager.getQuestActions).not.toHaveBeenCalled();
    });

    it('requires speaking directly to witnesses and forwards the actual interlocutor', () => {
        expect(ui.renderProceduralQuest(quest)).toContain('Speak directly with Witness in town.');
        ui.performQuestChoice('disruption', 'talk', 'quest-evidence', 'witness');
        expect(manager.recordQuestAction).toHaveBeenCalledExactlyOnceWith('disruption', 'talk', 'witness');
    });

    it('presents richer authored quests without requiring procedural generation metadata', () => {
        quest.participants = quest.procedural.participants;
        delete quest.procedural;
        quest.objectives = [
            { id: 'guards', description: 'Defeat the shipment guards', required: 3, progress: 2, completed: false },
            { id: 'cargo', description: 'Keep custody of the recovered cargo', required: 1, progress: 1, completed: true }
        ];
        const html = ui.renderProceduralQuest(quest, { npc: { id: 'giver' } });
        expect(html).toContain('Return supplies');
        expect(html).toContain('data-objective-id="guards"');
        expect(html).toContain('2/3');
        expect(html).toContain('data-objective-id="cargo"');
        expect(html).toContain('1/1');
        expect(ui.getParticipantQuests({ id: 'witness' })).toEqual([quest]);
    });

    it('shows authoritative custody and prerequisite blocks for salvage crafting', () => {
        quest.participants = quest.procedural.participants;
        delete quest.procedural;
        manager.getQuestActions.mockReturnValue([
            { id: 'salvage', label: 'Repair recovered cargo (Craft)', location: 'site', available: false, reason: 'You no longer hold the recovered cargo.' }
        ]);
        manager.getResolutionOptions.mockReturnValue([
            { id: 'deliver', label: 'Deliver repaired cargo', available: false, reason: 'Repair the cargo before delivery.' }
        ]);
        const html = ui.renderProceduralQuest(quest);
        expect(html).toContain('You no longer hold the recovered cargo.');
        expect(html).toContain('Repair the cargo before delivery.');
        expect(html).toContain('data-choice-id="salvage"');
        expect(html.match(/disabled/g)).toHaveLength(2);
    });

    it('renders saved legacy participants while preferring the current participant contract', () => {
        const restored = JSON.parse(JSON.stringify(quest));
        expect(ui.renderProceduralQuest(restored)).toContain('Ask about supplies — Witness');
        restored.participants = { giver: { npcId: 'new-giver' }, witness: { npcId: 'new-witness', name: 'Current witness' } };
        expect(ui.renderProceduralQuest(restored)).toContain('Ask about supplies — Current witness');
        expect(ui.renderProceduralQuest(restored, { npc: { id: 'witness' } })).not.toContain('Ask about supplies');
    });

    it('leaves ordinary objective-only quests on their existing interface', () => {
        const ordinary = { id: 'ordinary', objectives: [{ type: 'kill', required: 3 }] };
        expect(ui.hasQuestChoices(ordinary)).toBe(false);
        expect(ui.renderProceduralQuest(ordinary)).toBe('');
    });

    it('escapes evidence and authored labels', () => {
        quest.baseline.facts[0].text = '<script>bad()</script>';
        expect(ui.renderProceduralQuest(quest)).toContain('&lt;script&gt;');
    });

    it('passes the actual offering NPC to acceptance', () => {
        ui.acceptQuest('disruption', { id: 'giver', dialogue: {} });
        expect(manager.acceptQuest).toHaveBeenCalledExactlyOnceWith('disruption', 'giver');
    });

    it('accepts the displayed procedural board offer using its bound giver and removes it from the board', () => {
        const actualManager = new QuestManager({});
        quest.questGiver = { npcId: 'giver' };
        quest.settlementId = '1,2';
        quest.status = 'available';
        gameState.set('player.position', { x: 1, y: 2 });
        gameState.set('quests', { active: [], available: [quest], completed: [], failed: [] });
        const game = {
            questManager: actualManager,
            settlementManager: { currentSettlement: { id: '1,2' } },
            renderQuestBoard: vi.fn(), renderCurrentQuestTab: vi.fn()
        };
        acceptFromBoard.call(game, 'disruption');
        expect(gameState.get('quests.active')).toEqual([quest]);
        expect(gameState.get('quests.available')).toEqual([]);
        expect(quest.questGiverId).toBe('giver');
        expect(game.renderQuestBoard).toHaveBeenCalledExactlyOnceWith('1,2');
        expect(game.renderCurrentQuestTab).toHaveBeenCalledOnce();
    });

    it('uses the same merchant prices in the selected transaction and the item list', () => {
        ui.selectedItem = { id: 'rations' };
        ui.currentMerchant = { id: 'merchant' };
        ui.tradeMode = 'buy';
        ui.tradeQuantity = 1;
        ui.merchantManager = { calculateBuyPrice: vi.fn(() => 3) };
        gameState.set('character', { gold: 10 });
        ui.renderTransactionPanel();
        expect(ui.merchantManager.calculateBuyPrice).toHaveBeenCalledWith(ui.selectedItem, gameState.get('character'), ui.currentMerchant);
    });

    it('updates the real HUD signature after buying recovered stock', () => {
        ui.selectedItem = { id: 'rations', name: 'Rations', stockId: 'shipment', stock: 3 };
        const stock = ui.selectedItem;
        ui.currentMerchant = { id: 'merchant' };
        ui.tradeMode = 'buy';
        ui.tradeQuantity = 1;
        ui.merchantManager = { buyItem: vi.fn(() => ({ success: true, message: 'Purchased rations', cost: 3 })) };
        ui.renderTradingView = vi.fn();
        ui.executeTrade();
        expect(stock.stock).toBe(2);
        expect(ui.selectedItem).toBeNull();
        expect(window.game.updateHUD).toHaveBeenCalledExactlyOnceWith(gameState.get('character'));
        expect(ui.renderTradingView).toHaveBeenCalledOnce();
    });
});
