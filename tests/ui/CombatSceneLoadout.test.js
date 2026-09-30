import { it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
vi.mock('../../src/systems/AudioManager.js', () => ({ default: {} }));
vi.mock('../../src/core/GameState.js', () => ({ gameState: {} }));
import { CombatSceneUI } from '../../src/ui/CombatSceneUI.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
it('stages the Ettin morningstar in its declared hand without changing the rules event', () => {
    const ui = Object.assign(Object.create(CombatSceneUI.prototype), {
        config, displayed: { combatants: [{ id: 'ettin', appearance: 'ettin' }] },
        isShowing: () => true, setBusy: vi.fn()
    });
    const event = { sourceId: 'ettin', targetId: 'hero', kind: 'melee', weaponId: 'morningstar', weaponSlot: 'mainHand' };
    ui.beginAction(event);
    expect(ui.record.event).toMatchObject({ weaponSlot: 'offHand', motion: 'leftStrike' });
    expect(event.weaponSlot).toBe('mainHand');
    expect(ui.setBusy).toHaveBeenCalledOnce();
});
