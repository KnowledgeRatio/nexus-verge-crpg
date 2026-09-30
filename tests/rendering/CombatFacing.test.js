import { describe, it, expect } from 'vitest';
import { facingPartner } from '../../src/rendering/CombatFacing.js';

const actor = (id, x, z = 0) => ({ combatant: { id, hp: 10 }, root: { position: { x, z } } });

describe('Combat facing', () => {
    it('faces the nearest living engagement instead of the oldest link', () => {
        const hero = actor('hero', 0);
        const actors = new Map([['hero', hero], ['far', actor('far', -10)], ['near', actor('near', 2)]]);
        expect(facingPartner(hero, actors, ['far', 'near'], 100)).toBe('near');
        actors.get('near').combatant.hp = 0;
        expect(facingPartner(hero, actors, ['near', 'missing', 'far'], 100)).toBe('far');
    });

    it('faces an incoming attack and a miss reaction, then returns to the nearest threat', () => {
        const hero = { ...actor('hero', 0), incomingSource: 'far' };
        const far = { ...actor('far', -10), actionUntil: 200 };
        const actors = new Map([['hero', hero], ['far', far], ['near', actor('near', 2)]]);
        expect(facingPartner(hero, actors, ['near', 'far'], 100)).toBe('far');
        hero.miss = true;
        hero.feedbackUntil = 300;
        expect(facingPartner(hero, actors, ['near', 'far'], 250)).toBe('far');
        expect(facingPartner(hero, actors, ['near', 'far'], 400)).toBe('near');
    });

    it('keeps its own active strike facing its target', () => {
        const hero = { ...actor('hero', 0), actionUntil: 200, facingTarget: 'far' };
        const actors = new Map([['hero', hero], ['far', actor('far', -10)], ['near', actor('near', 2)]]);
        expect(facingPartner(hero, actors, ['near', 'far'], 100)).toBe('far');
        expect(facingPartner(hero, actors, [], 300)).toBeUndefined();
    });
});
