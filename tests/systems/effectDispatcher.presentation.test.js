import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/systems/AudioManager.js', () => ({
    default: { playCombatSound: vi.fn(), play: vi.fn() }
}));

import { buildContext, buildOutOfCombatContext, executeOption } from '../../src/systems/EffectDispatcher.js';
import { Combatant } from '../../src/systems/CombatManager.js';
import { gameState } from '../../src/core/GameState.js';

const abilities = JSON.parse(readFileSync(new URL('../../data/abilities.json', import.meta.url)));
const steadyNerve = abilities.abilities.dedication.find(ability => ability.id === 'steadyNerve');
const healingOption = steadyNerve.effects.options.find(option => option.effects.heal);
const dodgeOption = steadyNerve.effects.options.find(option => option.effects.dodge);

function character(level = 1) {
    return JSON.parse(JSON.stringify({
        name: 'Traveller', level, currentHP: 2, maxHP: 40, ac: 12,
        resolvePoints: 3, abilityUses: {},
        abilities: { prowess: 10, resilience: 10, intuition: 10, intellect: 10, composure: 10, presence: 10 },
        abilityModifiers: {}, equipment: { mainHand: null }
    }));
}

describe('effect feedback presentation boundary', () => {
    let events;
    let unsubscribe;

    beforeEach(() => {
        events = [];
        unsubscribe = gameState.subscribe('combat.floatingText', event => events.push(event));
        vi.spyOn(gameState, 'addMessage').mockImplementation(() => {});
        vi.spyOn(Math, 'random').mockReturnValue(0);
        vi.stubGlobal('window', undefined);
    });

    afterEach(() => {
        unsubscribe();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('emits feedback without a window or DOM', () => {
        buildContext(null, null, null).showFloatingText('ally', '+4 HP', 'healing');
        expect(events).toEqual([{ combatantId: 'ally', text: '+4 HP', type: 'healing' }]);
    });

    it('uses only the event subscriber when a legacy UI callback exists', () => {
        const directUI = vi.fn();
        vi.stubGlobal('window', { game: { showFloatingCombatText: directUI } });
        buildContext(null, null, null).showFloatingText('enemy', 'PRONE!', 'condition');
        expect(events).toEqual([{ combatantId: 'enemy', text: 'PRONE!', type: 'condition' }]);
        expect(directUI).not.toHaveBeenCalled();
    });

    it.each([1, 5, 10])('preserves level %i healing and resources with one event', async level => {
        const source = character(level);
        const actor = new Combatant(source, 'player', 'traveller');
        const resources = { resolve: source.resolvePoints, uses: { ...source.abilityUses } };
        const actions = { ...actor.actions };
        const results = await executeOption(healingOption, steadyNerve, buildContext(source, actor, null));

        expect(results).toEqual([{ type: 'heal', result: { healing: level + 1, rolled: level + 1 } }]);
        expect(actor.hp).toBe(2 + level + 1);
        expect(source.resolvePoints).toBe(resources.resolve);
        expect(source.abilityUses).toEqual(resources.uses);
        expect(actor.actions).toEqual(actions);
        expect(events).toEqual([{
            combatantId: 'traveller', sourceId: 'traveller',
            text: `+${level + 1} HP`, type: 'healing', effectType: 'heal'
        }]);
    });

    it('keeps out-of-combat healing silent and applies it to the plain character', async () => {
        const source = character();
        const context = buildOutOfCombatContext(source);
        await executeOption(healingOption, steadyNerve, context);
        context.showFloatingText('traveller', 'unused', 'healing');
        expect(source.currentHP).toBe(4);
        expect(events).toEqual([]);
    });

    it.each([1, 5, 10])('identifies level %i Dodge without changing its rules or context', async level => {
        const source = character(level);
        const actor = new Combatant(source, 'player', 'traveller');
        const context = buildContext(source, actor, null);
        const originalFeedback = context.showFloatingText;
        const actions = { ...actor.actions };
        vi.spyOn(console, 'log').mockImplementation(() => {});
        await executeOption(dodgeOption, steadyNerve, context);
        expect(actor.conditions).toContainEqual(expect.objectContaining({
            type: 'dodging', duration: 'untilStartOfTurn', appliedBy: 'traveller'
        }));
        expect(actor.actions).toEqual(actions);
        expect(source.resolvePoints).toBe(3);
        expect(context.showFloatingText).toBe(originalFeedback);
        expect(events).toEqual([expect.objectContaining({
            sourceId: 'traveller', combatantId: 'traveller', effectType: 'dodge', type: 'buff'
        })]);
    });
});

describe('combatant presentation serialization', () => {
    it('exposes downed state as a boolean through JSON and clears it after revival', () => {
        vi.spyOn(gameState, 'addMessage').mockImplementation(() => {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const actor = new Combatant(character(), 'companion', 'ally');
        expect(JSON.parse(JSON.stringify(actor)).isDowned).toBe(false);
        actor.hp = 0;
        actor.isDowned = true;
        const downed = JSON.parse(JSON.stringify(actor));
        expect(downed).toMatchObject({ id: 'ally', hp: 0, isDowned: true });
        actor.heal(3);
        expect(JSON.parse(JSON.stringify(actor))).toMatchObject({ hp: 3, isDowned: false });
        expect(downed.isDowned).toBe(true);
        vi.restoreAllMocks();
    });
});
