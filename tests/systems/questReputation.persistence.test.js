import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import RelationManager from '../../src/systems/RelationManager.js';
import saveManager from '../../src/systems/SaveManager.js';
import { gameState } from '../../src/core/GameState.js';
const relations = JSON.parse(readFileSync(new URL('../../data/relations.json', import.meta.url)));
const cultures = JSON.parse(readFileSync(new URL('../../data/cultures.json', import.meta.url)));

let manager;
let originalState;
let originalWindow;

beforeEach(() => {
    originalState = gameState.data;
    originalWindow = globalThis.window;
    gameState.data = { factions: {}, world: null, character: null, quests: {} };
    manager = new RelationManager();
    manager.config = relations;
    manager.tierLookup = [...relations.tiers].sort((a, b) => a.min - b.min);
    globalThis.window = { game: { npcGenerator: { culturesData: cultures.cultures } } };
    vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    gameState.data = originalState;
    globalThis.window = originalWindow;
    vi.restoreAllMocks();
});

describe('Explicit quest faction standing', () => {
    it('changes a second NPC’s actual relation tier and merchant prices without changing personal trust', () => {
        const merchant = { culture: 'kethara', relations: { score: 18, history: [] } };
        const character = { practices: [], skills: {}, abilityModifiers: {} };
        const before = manager.calculateBuyPrice({ value: 100 }, merchant, character);

        manager.modifyFactionReputation('kethara', 20);

        expect(manager.getRelation(merchant).tier.id).toBe('friendly');
        expect(manager.calculateBuyPrice({ value: 100 }, merchant, character)).toBeLessThan(before);
        expect(merchant.relations.score).toBe(18);
        expect(merchant.relations.history).toEqual([]);
    });

    it('suppresses incidental faction credit while preserving personal quest credit', () => {
        const giver = { id: 'giver', culture: 'kethara', relations: { score: 0, history: [] } };
        const neighbour = { id: 'neighbour', culture: 'kethara', relations: { score: 0, history: [] } };
        gameState.set('world', { generatedRegions: new Map([['0,0', { features: [
            { id: 'town', type: 'settlement', npcs: [giver, neighbour] }
        ] }]]) });

        manager.modifyFactionReputation('kethara', 5);
        manager.modifyRelation(giver, 'questCompleteForNPC', { exactPoints: 10, contributeToFaction: false });
        manager.modifySettlementRelations('town', 'giver', { exactPoints: 3, contributeToFaction: false });

        expect(giver.relations.score).toBe(10);
        expect(neighbour.relations.score).toBe(3);
        expect(gameState.get('factions.kethara')).toBe(5);
        manager.modifyRelation(giver, 'successfulTrade');
        expect(gameState.get('factions.kethara')).toBe(5 + relations.factionContribution.baseRate);
    });

    it('rejects unknown or unloaded cultures and nonfinite changes, and clamps existing bounds', () => {
        expect(manager.modifyFactionReputation('invented-faction', 10)).toBeNull();
        expect(manager.modifyFactionReputation('kethara', NaN)).toBeNull();
        expect(manager.modifyFactionReputation('kethara', Infinity)).toBeNull();
        expect(gameState.get('factions')).toEqual({});
        expect(manager.modifyFactionReputation('kethara', 1000).newScore).toBe(100);
        expect(manager.modifyFactionReputation('kethara', -1000).newScore).toBe(-100);
        window.game.npcGenerator.culturesData = [];
        expect(manager.modifyFactionReputation('kethara', 10)).toBeNull();
    });
});

describe('Faction save roundtrip', () => {
    it('preserves fractional scores and their live downstream effect after JSON saving and loading', () => {
        const npc = { culture: 'kethara', relations: { score: 18, history: [] } };
        manager.modifyFactionReputation('kethara', 20.5);
        const save = JSON.parse(JSON.stringify(saveManager.serializeGameState()));
        expect(save.factions).toEqual({ kethara: 20.5 });
        gameState.set('factions', {});
        saveManager.deserializeGameState(save);
        expect(gameState.get('factions.kethara')).toBe(20.5);
        expect(gameState.get('factions')).not.toBeInstanceOf(Map);
        expect(manager.getRelation(npc).tier.id).toBe('friendly');
        manager.modifyFactionReputation('kethara', 2);
        expect(gameState.get('factions.kethara')).toBe(22.5);
    });

    it.each([
        [['kethara', 14.2], ['vaethori', -8]],
        new Map([['kethara', 14.2], ['vaethori', -8]]),
        { kethara: 14.2, vaethori: -8 }
    ])('restores legacy and current faction representations as a dot-addressable object', factions => {
        const save = saveManager.serializeGameState();
        save.factions = factions;
        saveManager.deserializeGameState(save);
        expect(gameState.get('factions.kethara')).toBe(14.2);
        expect(gameState.get('factions.vaethori')).toBe(-8);
        expect(saveManager.serializeGameState().factions).toEqual({ kethara: 14.2, vaethori: -8 });
    });

    it('loads old saves without faction data and ignores malformed score entries', () => {
        const save = saveManager.serializeGameState();
        delete save.factions;
        saveManager.deserializeGameState(save);
        expect(gameState.get('factions')).toEqual({});
        expect(saveManager.normalizeFactionScores([['kethara', 5], null, ['bad', 'NaN']]))
            .toEqual({ kethara: 5 });
    });
});
