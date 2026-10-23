import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { gameState } from '../../src/core/GameState.js';
import { Combatant } from '../../src/systems/CombatManager.js';
import { conditionRejectionMessage } from '../../src/systems/conditionApplication.js';

vi.mock('../../src/systems/AudioManager.js', () => ({ default: {} }));

const source = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const body = source.match(/ {4}dodge\(\) \{([\s\S]*?)\n {4}\}/)[1];
const dodge = new Function('gameState', 'conditionRejectionMessage',
    `return function() {${body}}`)(gameState, conditionRejectionMessage);

afterEach(() => vi.restoreAllMocks());

it.each([true, false])('the player Dodge entry point explains rejection (immune=%s)', immune => {
    const actor = new Combatant({ name: 'Traveller', maxHP: 20, currentHP: 20,
        conditionImmunities: immune ? ['dodging'] : [] }, 'player');
    if (!immune) {
        actor.addCondition('dodging', 'combat', actor.id, { isBuff: true });
    }
    const before = JSON.stringify(actor.conditions);
    const messages = vi.spyOn(gameState, 'addMessage').mockImplementation(() => {});
    const floating = vi.spyOn(gameState, 'notify');
    const endTurn = vi.fn();
    dodge.call({ combatManager: { active: true, playerCombatant: actor, endTurn } });
    expect(messages).toHaveBeenCalledWith(immune
        ? 'Traveller is immune to dodging.' : 'Traveller is already affected by dodging.', 'warning');
    expect(JSON.stringify(actor.conditions)).toBe(before);
    expect(floating).not.toHaveBeenCalled();
    expect(endTurn).not.toHaveBeenCalled();
});
