import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/systems/AudioManager.js', () => ({ default: { play: vi.fn(), playCombatSound: vi.fn() } }));

import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';
import restManager from '../../src/systems/RestManager.js';
import SettlementManager from '../../src/systems/SettlementManager.js';
import HostileSettlementManager from '../../src/systems/HostileSettlementManager.js';
import CombatManager from '../../src/systems/CombatManager.js';
import { Character } from '../../src/systems/Character.js';
import { createEnemyFromMonster } from '../../src/systems/EncounterBuilder.js';

const data = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));
let previousState;
let town;
let lifecycle;

beforeEach(() => {
    previousState = gameState.data;
    town = { type: 'settlement', settlementType: 'village', id: '0,0', x: 0, y: 0, name: 'Ashford',
        hostileState: { phase: 'hostile' } };
    gameState.data = { world: { worldClock: 0, settlements: [town], metadata: { settlements: [town] },
        generatedRegions: new Map([['0,0', { features: [town], tiles: [{ terrain: 'town', feature: town }] }]]) },
    seed: 'liberation-integration', player: { position: { x: 0, y: 0 } },
    character: { level: 1, currentHP: 10, maxHP: 10, shortRestsUsed: 0,
        hitDice: { current: 1, max: 1 }, inventory: [] },
    fatigue: { current: 0, exhaustionLevels: 0, supplies: 10, suppliesZeroStreak: 0 },
    ui: { messageLog: [] }, stats: {}, combat: null, dungeon: { active: false } };
    lifecycle = new HostileSettlementManager({ worldSeed: 'liberation-integration' });
    const content = data('hostileSettlements');
    lifecycle.messages = content.messages;
    lifecycle.content = content;
    vi.stubGlobal('window', { game: { hostileSettlementManager: lifecycle,
        questManager: { checkQuestDeadlines: vi.fn() } } });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.useFakeTimers();
    restManager.isResting = false;
});

afterEach(() => {
    gameState.data = previousState;
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('hostile settlement integration', () => {
    it('guards settlement services and long rests through hostile and rebuilding phases', () => {
        const ui = { showBuildingModal: vi.fn() };
        const manager = new SettlementManager(null, ui);
        manager.hostileSettlementManager = lifecycle;
        manager.currentSettlement = town;
        for (const phase of ['hostile', 'rebuilding']) {
            town.hostileState.phase = phase;
            manager.enterBuilding('tavern');
            expect(restManager.canLongRest().canRest).toBe(false);
        }
        expect(ui.showBuildingModal).not.toHaveBeenCalled();
        town.hostileState.phase = 'restored';
        manager.enterBuilding('tavern');
        expect(ui.showBuildingModal).toHaveBeenCalledWith('tavern');
        expect(restManager.canLongRest().canRest).toBe(true);
        town.hostileState.phase = 'hostile';
        const enabled = RULES.hostileSettlements.enabled;
        RULES.hostileSettlements.enabled = false;
        try {
            expect(lifecycle.isRestricted(town)).toBe(false);
            expect(restManager.canLongRest().canRest).toBe(true);
        } finally {
            RULES.hostileSettlements.enabled = enabled;
        }
    });

    it('allows fully recovered safe long rests, advancing the quest clock and deadline consumer once', async () => {
        town.hostileState.phase = 'restored';
        const supplies = gameState.get('fatigue.supplies');
        expect(restManager.canLongRest().canRest).toBe(true);
        expect((await restManager.longRest()).success).toBe(true);
        expect(gameState.get('world.worldClock')).toBe(RULES.quests.clockUnitsPerLongRest);
        expect(window.game.questManager.checkQuestDeadlines).toHaveBeenCalledTimes(1);
        expect(gameState.get('fatigue.supplies')).toBeLessThan(supplies);
        const clock = gameState.get('world.worldClock');
        expect((await restManager.shortRest()).success).toBe(true);
        expect(gameState.get('world.worldClock')).toBe(clock);
    });

    it.each([1, 5, 10])('credits real captured victory at level %s, with restored character support', async level => {
        const character = new Character({ name: 'Liberator', level,
            class: data('classes').classes.find(entry => entry.id === 'dedication'), species: {}, background: {},
            baseAbilities: { prowess: 15, intuition: 13, resilience: 15, composure: 10, intellect: 10, presence: 10 },
            equipment: { mainHand: null, offHand: null, armor: null } });
        gameState.set('character', level === 5 ? JSON.parse(JSON.stringify(character)) : character);
        lifecycle.ensureSettlement(town);
        const result = lifecycle.performAction(town, lifecycle.getView(town).options[0].id);
        const source = { ...result.combat.settlementSource };
        const combat = new CombatManager();
        vi.spyOn(combat, 'loadWeaponMasteryData').mockResolvedValue();
        vi.spyOn(combat, 'startTurn').mockImplementation(() => {});
        const monster = data('monsters').monsters.find(entry => entry.id === 'goblin');
        await combat.startCombat(gameState.get('character'), [createEnemyFromMonster(monster)], [], null, source);
        source.settlementId = '99,99';
        gameState.set('player.position', { x: 99, y: 99 });
        combat.enemyCombatants.forEach(enemy => {
            enemy.hp = 0;
        });
        combat.endCombat('victory');
        expect(town.hostileState.index).toBe(1);
        expect(town.hostileState.pendingCombat).toBeUndefined();
        expect(lifecycle.getView(town).step.type).toBe('exploration');
    });

    it.each(['fled', 'defeat', 'unsupportedVictory'])('%s grants no liberation credit', async outcome => {
        const character = new Character({ name: 'Liberator', level: 1,
            class: data('classes').classes.find(entry => entry.id === 'dedication'), species: {}, background: {},
            baseAbilities: { prowess: 15, intuition: 13, resilience: 15, composure: 10, intellect: 10, presence: 10 },
            equipment: { mainHand: null, offHand: null, armor: null } });
        gameState.set('character', character);
        lifecycle.ensureSettlement(town);
        const result = lifecycle.performAction(town, lifecycle.getView(town).options[0].id);
        const combat = new CombatManager();
        vi.spyOn(combat, 'loadWeaponMasteryData').mockResolvedValue();
        vi.spyOn(combat, 'startTurn').mockImplementation(() => {});
        const monster = data('monsters').monsters.find(entry => entry.id === 'goblin');
        await combat.startCombat(character, [createEnemyFromMonster(monster)], [], null, result.combat.settlementSource);
        combat.endCombat(outcome === 'unsupportedVictory' ? 'victory' : outcome);
        expect(town.hostileState.index).toBe(0);
        expect(town.hostileState.pendingCombat).toBeUndefined();
    });
});
