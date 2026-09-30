import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/systems/AudioManager.js', () => ({
    default: { playCombatSound: vi.fn(), play: vi.fn() }
}));

import { CombatManager, Combatant } from '../../src/systems/CombatManager.js';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';

function makeCombatant(id, team = 'enemy', level = 1, callingId = 'exemplar') {
    return new Combatant(JSON.parse(JSON.stringify({
        name: id, level, class: { id: callingId }, currentHP: 20, maxHP: 20, ac: 12
    })), team, id);
}

function engage(first, second) {
    first.engagedWith.add(second.id);
    second.engagedWith.add(first.id);
}

describe('Disengage engagement cleanup', () => {
    let manager;
    let player;
    let enemies;

    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(gameState, 'addMessage').mockImplementation(() => {});
        manager = new CombatManager();
        player = makeCombatant('player', 'player');
        enemies = Array.from({ length: 3 }, (_, index) => makeCombatant(`enemy-${index}`));
        manager.combatants = [player, ...enemies];
        for (const enemy of enemies) {
            engage(player, enemy);
        }
    });

    afterEach(() => vi.restoreAllMocks());

    it.each([1, 5, 10])('clears all three reciprocal links at level %i and spends one action', level => {
        player.character.level = level;

        expect(manager.disengage(player)).toEqual({
            success: true,
            actionCost: 'action',
            clearedEngagement: enemies.map(enemy => enemy.id)
        });
        for (const combatant of manager.combatants) {
            expect(combatant.engagedWith.size).toBe(0);
            expect(combatant.toJSON().engagedWith).toEqual([]);
        }
        expect(player.actions).toEqual({ action: 0, bonusAction: 1, reaction: 1 });
        expect(player.conditions).toEqual([expect.objectContaining({
            type: 'disengaged', duration: 'untilStartOfTurn', appliedBy: player.id
        })]);
    });

    it('preserves shared opponents’ links with the companion', () => {
        const companion = makeCombatant('companion', 'companion');
        manager.combatants.push(companion);
        engage(companion, enemies[0]);
        engage(companion, enemies[1]);

        manager.disengage(player);

        expect(player.engagedWith.size).toBe(0);
        expect(companion.engagedWith).toEqual(new Set([enemies[0].id, enemies[1].id]));
        expect(enemies[0].engagedWith).toEqual(new Set([companion.id]));
        expect(enemies[1].engagedWith).toEqual(new Set([companion.id]));
        expect(enemies[2].engagedWith.size).toBe(0);
    });

    it('does not mutate engagement, conditions or other actions when no action is available', () => {
        player.actions.action = 0;
        const before = manager.combatants.map(combatant => combatant.toJSON());

        expect(manager.disengage(player)).toEqual({
            success: false, reason: 'No Action available to Disengage.'
        });
        expect(manager.combatants.map(combatant => combatant.toJSON())).toEqual(before);
    });

    it('retains Cunning Action cost and opportunity-attack protection after re-engagement', () => {
        player.character.class.id = RULES.combat.disengage.cunningAction.callingId;
        player.character.level = RULES.combat.disengage.cunningAction.levelRequired;
        const attack = vi.spyOn(manager, 'attack').mockImplementation(() => {});

        expect(manager.disengage(player).actionCost).toBe('bonusAction');
        expect(player.actions).toEqual({ action: 1, bonusAction: 0, reaction: 1 });
        engage(player, enemies[0]);
        manager.resolveFleeOpportunityAttacks(player);

        expect(attack).not.toHaveBeenCalled();
    });
});
