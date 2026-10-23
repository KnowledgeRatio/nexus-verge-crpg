import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/systems/AudioManager.js', () => ({ default: { play: vi.fn() } }));
import { gameState, GameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';
import QuestManager from '../../src/systems/QuestManager.js';
import saveManager from '../../src/systems/SaveManager.js';
import { projectQuestTracking, questHasLocationProof, questTrackingTarget } from '../../src/systems/QuestTracking.js';
import { applyQuestResolution } from '../../src/systems/ProceduralQuest.js';
import Player from '../../src/systems/Player.js';

const config = RULES.quests.tracking;
let manager;

function quest(overrides = {}) {
    return { id: 'quest', name: 'Find the cargo', status: 'active', settlementId: '0,0', dungeonHookId: '91,-35',
        objectives: [{ id: 'find', type: 'explore', description: 'Find the site', completed: false }],
        ...overrides };
}

function active(entry = quest()) {
    gameState.set('quests', { available: [], active: [entry], completed: [], failed: [], trackedQuestId: entry.id });
    return entry;
}

function heard(entry, quality) {
    entry.trackingIntel = { quality, origin: { x: 0, y: 0, label: 'Town' }, targetKey: entry.dungeonHookId,
        ...(quality === 'low' ? { bearing: 'NE' } : {}) };
    return entry;
}

beforeEach(() => {
    gameState.reset();
    gameState.set('world', { generatedRegions: new Map(), modifiedTiles: [], metadata: { features: [] },
        settlements: [{ id: '0,0', x: 0, y: 0, name: 'Town' }] });
    globalThis.window = globalThis.window || {};
    window.game = {};
    manager = new QuestManager({ loadData: vi.fn() });
    vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
    window.game = null;
    config.enabled = true;
});

describe('quest tracking knowledge projection', () => {
    it('projects heard high as an entrance and medium as a fixed negative-coordinate search grid', () => {
        const entry = active(heard(quest(), 'high'));
        expect(manager.getTrackedQuestGuidance().navigation).toEqual({ type: 'exact', x: 91, y: -35, label: 'Quest site' });
        entry.trackingIntel.quality = 'medium';
        const vm = manager.getTrackedQuestGuidance();
        expect(vm.navigation).toEqual({ type: 'area', minX: 64, minY: -64, maxX: 128, maxY: 0, label: 'Search area' });
        expect(Object.keys(vm).sort()).toEqual([
            'questId', 'questName', 'stage', 'objectiveId', 'objectiveText', 'intelQuality', 'navigation'
        ].sort());
        expect(JSON.stringify(vm)).not.toContain('91');
        expect(JSON.stringify(vm)).not.toContain('-35');
        expect(vm.navigation.x).toBeUndefined();
        expect(vm.navigation.y).toBeUndefined();
    });

    it('never upgrades old accepted quests from raw tier, NPC intel or interpretation facts', () => {
        active(quest({ intelQuality: 'high', intelDialogue: { high: 'Exact location' },
            evidence: { facts: ['cause_established'] }, questGiver: { npcId: 'giver', intelStatus: 'high' } }));
        expect(manager.refreshTrackingIntel()).toBe(false);
        expect(manager.getTrackedQuestGuidance()).toMatchObject({ stage: 'unlocated', intelQuality: 'none',
            navigation: { type: 'unknown', label: 'Location unknown' } });
    });

    it('keeps low direction tied to its recorded issuer after player movement', () => {
        active(heard(quest(), 'low'));
        const before = manager.getTrackedQuestGuidance();
        gameState.set('player', { x: 1000, y: 999 });
        expect(manager.getTrackedQuestGuidance()).toEqual(before);
        expect(before.navigation).toEqual({ type: 'direction', originX: 0, originY: 0,
            bearing: 'NE', label: 'Reported NE of Town' });
        expect(JSON.stringify(before)).not.toContain('91');
    });

    it('records only newly accepted selected briefings actually delivered to the message log', () => {
        const entry = quest({ status: 'available', intelQuality: 'low', intelDialogue: { high: 'Other', low: 'East of town' } });
        gameState.set('quests', { available: [entry], active: [], completed: [], failed: [], trackedQuestId: null });
        const message = vi.spyOn(gameState, 'addMessage');
        expect(manager.acceptQuest(entry.id, 'giver')).toBe(true);
        expect(message).toHaveBeenCalledWith('East of town', 'info');
        expect(message).not.toHaveBeenCalledWith('Other', 'info');
        expect(entry.trackingIntel).toMatchObject({ quality: 'low', targetKey: '91,-35', bearing: 'E',
            origin: { x: 0, y: 0, label: 'Town' } });
        expect(gameState.get('quests.trackedQuestId')).toBeNull();
        expect(manager.setTrackedQuest(entry.id)).toBe(true);
        expect(manager.getTrackedQuestGuidance().navigation.type).toBe('direction');
        expect(manager.acceptQuest(entry.id, 'giver')).toBe(false);
    });

    it('accepting without the selected briefing cannot claim the raw tier was heard', () => {
        const entry = quest({ status: 'available', intelQuality: 'high', intelDialogue: { low: 'Rumour only' } });
        gameState.set('quests', { available: [entry], active: [], completed: [], failed: [], trackedQuestId: null });
        expect(manager.acceptQuest(entry.id, 'giver')).toBe(true);
        expect(entry.trackingIntel).toBeUndefined();
    });

    it.each(['canonical', 'modified', 'loaded', 'compressed', 'rich'])('promotes %s exploration once and never loses exact knowledge after pruning', source => {
        const entry = active(quest());
        const world = gameState.get('world');
        if (source === 'canonical') {
            world.metadata.features.push({ x: 91, y: -35, explored: true });
        } else if (source === 'modified') {
            world.modifiedTiles.push({ x: 91, y: -35, explored: true });
        } else if (source === 'loaded') {
            const tiles = [];
            tiles[29 * 32 + 27] = { explored: true };
            world.generatedRegions.set('2,-2', { tiles });
        } else if (source === 'compressed') {
            world.generatedRegions.set('2,-2', { exploredTiles: [{ x: 27, y: 29, explored: true }] });
        } else {
            entry.baseline = { roomIndex: 0 };
            entry.evidence = { siteSearched: true };
        }
        expect(manager.refreshTrackingIntel()).toBe(true);
        expect(manager.refreshTrackingIntel()).toBe(false);
        expect(entry.trackingDiscoveries).toEqual({ '91,-35': true });
        world.metadata.features = [];
        world.modifiedTiles = [];
        world.generatedRegions.clear();
        delete entry.evidence;
        expect(manager.refreshTrackingIntel()).toBe(false);
        expect(manager.getTrackedQuestGuidance().navigation.type).toBe('exact');
    });

    it('reads existing regions without invoking cache accessors that could regenerate terrain', () => {
        active(quest());
        const generator = { getCachedTile: vi.fn(() => ({ explored: true })), getTile: vi.fn(), reveal: vi.fn() };
        window.game.worldGenerator = generator;
        const before = JSON.stringify(gameState.get('quests'));
        manager.getTrackedQuestGuidance();
        expect(JSON.stringify(gameState.get('quests'))).toBe(before);
        expect(generator.getCachedTile).not.toHaveBeenCalled();
        expect(manager.refreshTrackingIntel()).toBe(false);
        expect(generator.getCachedTile).not.toHaveBeenCalled();
        expect(generator.getTile).not.toHaveBeenCalled();
        expect(generator.reveal).not.toHaveBeenCalled();
    });

    it('refreshes late discovery for an old save and keeps it after a plain JSON round trip', () => {
        const entry = active(quest());
        expect(manager.getTrackedQuestGuidance().navigation.type).toBe('unknown');
        gameState.get('world.modifiedTiles').push({ x: 91, y: -35, explored: true });
        manager.refreshTrackingIntel();
        gameState.set('quests', JSON.parse(JSON.stringify(gameState.get('quests'))));
        gameState.get('world').modifiedTiles = [];
        expect(manager.getTrackedQuestGuidance().navigation.type).toBe('exact');
        expect(entry.trackingDiscoveries['91,-35']).toBe(true);
    });

    it('chooses ready required steps, keeps targets distinct and returns despite unfinished optional work', () => {
        const entry = active(heard(quest({ objectives: [
            { id: 'first', type: 'explore', description: 'First site', targetLocation: '91,-35' },
            { id: 'second', type: 'explore', description: 'Second site', targetLocation: '-90,100', requiresObjectives: ['first'] },
            { id: 'optional', type: 'explore', description: 'Optional search', optional: true },
            { id: 'return', type: 'return', description: 'Report back' }
        ] }), 'high'));
        expect(manager.getTrackedQuestGuidance().objectiveId).toBe('first');
        entry.objectives[0].completed = true;
        expect(manager.getTrackedQuestGuidance()).toMatchObject({ objectiveId: 'second', stage: 'unlocated', navigation: { type: 'unknown' } });
        entry.trackingDiscoveries = { '-90,100': true };
        expect(manager.getTrackedQuestGuidance().navigation).toMatchObject({ type: 'exact', x: -90, y: 100 });
        entry.objectives[1].completed = true;
        expect(manager.getTrackedQuestGuidance()).toMatchObject({ stage: 'return', objectiveId: 'return',
            navigation: { type: 'exact', x: 0, y: 0, label: 'Town' } });
        expect(entry.objectives[2].completed).toBeUndefined();
        expect(entry.resolution).toBeUndefined();
        expect(entry.resolutionPending).toBeUndefined();
    });

    it('site observations never disclose an unrelated target', () => {
        const entry = quest({ baseline: { roomIndex: 0 }, evidence: { facts: ['site_observed'], siteSearched: true } });
        const other = questTrackingTarget(entry, { targetLocation: '-90,100' });
        expect(questHasLocationProof(entry, other, gameState.get('world'), 32)).toBe(false);
    });

    it('tracking selection validates active IDs, supports clear and honors the flag', () => {
        active(quest());
        expect(manager.setTrackedQuest('missing')).toBe(false);
        expect(manager.getTrackedQuestGuidance().questId).toBe('quest');
        expect(manager.setTrackedQuest(null)).toBe(true);
        expect(manager.getTrackedQuestGuidance()).toBeNull();
        expect(manager.setTrackedQuest('quest')).toBe(true);
        config.enabled = false;
        expect(manager.getTrackedQuestGuidance()).toBeNull();
    });

    it('sanitizes removed IDs without leaking mutations through getter projection', () => {
        active(quest());
        gameState.get('quests').active = [];
        const before = JSON.stringify(gameState.get('quests'));
        expect(manager.getTrackedQuestGuidance()).toBeNull();
        expect(JSON.stringify(gameState.get('quests'))).toBe(before);
        expect(manager.refreshTrackingIntel()).toBe(true);
        expect(gameState.get('quests.trackedQuestId')).toBeNull();
    });

    it.each(['abandonQuest', 'failQuest'])('%s clears tracked IDs', method => {
        active(quest());
        manager[method]('quest', 'test');
        expect(gameState.get('quests.trackedQuestId')).toBeNull();
    });

    it('ordinary completion and the direct state completion helper clear tracking', () => {
        active(quest({ objectives: [{ id: 'find', completed: true }] }));
        gameState.set('character', {});
        vi.spyOn(manager, 'awardRewards').mockReturnValue({ xp: 0, gold: 0 });
        expect(manager.completeQuest('quest').success).toBe(true);
        expect(gameState.get('quests.trackedQuestId')).toBeNull();
        active(quest());
        gameState.completeQuest('quest');
        expect(gameState.get('quests.trackedQuestId')).toBeNull();
    });

    it('rich handover and expiry clear tracking without auto-selecting another quest', () => {
        const entry = active(quest({ resolutions: [{ id: 'report', location: 'settlement', reply: 'Reported', effects: [] }] }));
        gameState.set('player', { x: 0, y: 0 });
        gameState.set('character', {});
        vi.spyOn(manager, 'awardRewards').mockReturnValue({ xp: 0, gold: 0 });
        expect(applyQuestResolution(manager, entry, 'report').success).toBe(true);
        expect(gameState.get('quests.trackedQuestId')).toBeNull();
        active(quest({ iteration: true, deadlineDuration: 1, deadlineAt: 1 }));
        gameState.set('world.worldClock', 2);
        manager.checkQuestDeadlines();
        expect(gameState.get('quests.trackedQuestId')).toBeNull();
        expect(gameState.get('quests.failed')[0].failReason).toBe('expired');
    });

    it('visibility refresh acquires only an actually explored bound tile', async () => {
        active(quest({ dungeonHookId: '3,2' }));
        const tiles = Array.from({ length: 32 * 32 }, () => ({ explored: false }));
        gameState.get('world.generatedRegions').set('0,0', { tiles });
        window.game.questManager = manager;
        const generator = { getTile: vi.fn(async (x, y) =>
            x >= 0 && y >= 0 && x < 32 && y < 32 ? tiles[y * 32 + x] : null) };
        await Player.prototype.updateVisibility.call({ x: 0, y: 0, worldGenerator: generator });
        expect(gameState.get('quests.active')[0].trackingDiscoveries).toEqual({ '3,2': true });
        expect(manager.getTrackedQuestGuidance().navigation).toMatchObject({ type: 'exact', x: 3, y: 2 });
    });

    it('defaults all new/reset state and sanitizes both save boundaries', async () => {
        const state = new GameState();
        expect(state.get('quests.trackedQuestId')).toBeNull();
        state.initNewGame('tracking', {});
        expect(state.get('quests.trackedQuestId')).toBeNull();
        const entry = active(heard(quest(), 'medium'));
        const saves = saveManager;
        const saved = saves.serializeGameState();
        expect(saved.quests.trackedQuestId).toBe(entry.id);
        expect(saved.quests.active[0].trackingIntel.quality).toBe('medium');
        saves.deserializeGameState(JSON.parse(JSON.stringify(saved)));
        expect(gameState.get('quests.trackedQuestId')).toBe(entry.id);
        saved.quests.trackedQuestId = 'bad';
        saves.deserializeGameState(saved);
        expect(gameState.get('quests.trackedQuestId')).toBeNull();
        const direct = state.toJSON();
        direct.quests.trackedQuestId = 'missing';
        await state.fromJSON(direct);
        expect(state.get('quests.trackedQuestId')).toBeNull();
        state.reset();
        expect(state.get('quests.trackedQuestId')).toBeNull();
    });

    it('pure projections do not change raw quest bindings or discovery receipts', () => {
        const entry = heard(quest(), 'medium');
        const before = JSON.stringify(entry);
        projectQuestTracking(entry, gameState.get('world'), config);
        expect(JSON.stringify(entry)).toBe(before);
    });
});
