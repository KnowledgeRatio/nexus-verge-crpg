import { describe, it, expect } from 'vitest';
import { CombatSceneLayout, planSceneMoves } from '../../src/rendering/CombatSceneLayout.js';

const fighter = (id, team = 'enemy', engagedWith = []) => ({ id, team, engagedWith, hp: 20, maxHP: 20 });
const cellKey = p => `${p.q},${p.r}`;

function checkMoves(layout, current, targets) {
    const positions = new Map(current);
    const minimumR = layout.minimumR ?? -Infinity;
    const moves = planSceneMoves(current, targets, new Set(), minimumR);
    for (const move of moves) {
        expect(move.path.every(point => point.r >= minimumR)).toBe(true);
        for (let step = 1; step < move.path.length; step++) {
            const start = layout.world(move.path[step - 1]);
            const end = layout.world(move.path[step]);
            for (const [id, cell] of positions) {
                if (id === move.id) {
                    continue;
                }
                const other = layout.world(cell);
                const dx = end.x - start.x;
                const dz = end.z - start.z;
                const t = Math.max(0, Math.min(1, ((other.x - start.x) * dx + (other.z - start.z) * dz) /
                    (dx * dx + dz * dz)));
                const separation = Math.hypot(other.x - start.x - dx * t, other.z - start.z - dz * t);
                expect(separation).toBeGreaterThan(2);
            }
        }
        positions.set(move.id, move.path.at(-1));
    }
    expect([...positions].sort()).toEqual([...targets].sort());
}

describe('Combat scene layout', () => {
    it('routes around actors along the rear wall without stepping behind it', () => {
        const layout = new CombatSceneLayout(3.2);
        layout.minimumR = 0;
        const current = new Map([['moving', { q: -2, r: 0 }], ['guard', { q: 0, r: 0 }]]);
        const targets = new Map(current);
        targets.set('moving', { q: 2, r: 0 });
        checkMoves(layout, current, targets);
        const moves = planSceneMoves(current, targets, new Set(), 0);
        expect(moves[0].path.some(point => point.r > 0)).toBe(true);
    });

    it('starts the sides two clear steps apart and allows the opening gap to be configured', () => {
        const fighters = [fighter('hero', 'player'), fighter('enemy')];
        for (const homeColumn of [1, 2]) {
            const layout = new CombatSceneLayout(3.2, homeColumn);
            const homes = layout.update(fighters);
            const hero = layout.world(homes.get('hero'));
            const enemy = layout.world(homes.get('enemy'));
            expect(enemy.x - hero.x).toBeCloseTo(2 * homeColumn * layout.spacing);
            expect(hero.z).toBe(enemy.z);
        }
    });

    it.each(['hero', 'raider'])('moves only the attacker when %s initiates an engagement', sourceId => {
        const layout = new CombatSceneLayout(3.2);
        const idle = [fighter('hero', 'player'), fighter('raider'), fighter('other')];
        const homes = new Map(layout.update(idle));
        const targetId = sourceId === 'hero' ? 'raider' : 'hero';
        const engaged = idle.map(c => ({ ...c, engagedWith: c.id === sourceId ? [targetId] :
            c.id === targetId ? [sourceId] : [] }));
        const after = new Map(layout.update(engaged, { sourceId, targetId }));
        expect(after.get(targetId)).toEqual(homes.get(targetId));
        expect(after.get('other')).toEqual(homes.get('other'));
        expect(after.get(sourceId)).not.toEqual(homes.get(sourceId));
        expect(planSceneMoves(homes, after).map(move => move.id)).toEqual([sourceId]);
        checkMoves(layout, homes, after);
        expect(layout.update(engaged)).toEqual(after);
        expect(layout.update(idle)).toEqual(homes);
    });

    it('keeps a defender and earlier attackers still as three attackers accumulate', () => {
        const layout = new CombatSceneLayout(3.2);
        const state = [fighter('carbine', 'companion'), fighter('a'), fighter('b'), fighter('c')];
        let previous = new Map(layout.update(state));
        for (const sourceId of ['a', 'b', 'c']) {
            state[0].engagedWith.push(sourceId);
            state.find(c => c.id === sourceId).engagedWith.push('carbine');
            const next = new Map(layout.update(state, { sourceId, targetId: 'carbine' }));
            for (const [id, cell] of previous) {
                if (id !== sourceId) {
                    expect(next.get(id)).toEqual(cell);
                }
            }
            expect(new Set([...next.values()].map(cellKey)).size).toBe(state.length);
            checkMoves(layout, previous, next);
            previous = next;
        }
        expect(state[0].engagedWith).toHaveLength(3);
    });

    it('leaves a defeated actor in place while survivors withdraw', () => {
        const layout = new CombatSceneLayout(3.2);
        const grouped = new Map(layout.update([
            fighter('hero', 'player', ['x', 'y']), fighter('x', 'enemy', ['hero']), fighter('y', 'enemy', ['hero'])
        ]));
        const after = layout.update([fighter('hero', 'player'), { ...fighter('x'), hp: 0 }, fighter('y')]);
        expect(after.get('x')).toEqual(grouped.get('x'));
        const moves = planSceneMoves(grouped, after, new Set(['x']));
        expect(moves.every(move => move.id !== 'x')).toBe(true);
        expect(new Set([...after.values()].map(cellKey)).size).toBe(3);
    });
    it.each([3, 6, 12])('keeps %i opponents distinct around one character and returns to homes', count => {
        const layout = new CombatSceneLayout(3.2);
        const ids = Array.from({ length: count }, (_, i) => `enemy-${i}`);
        const idle = [fighter('hero', 'player'), ...ids.map(id => fighter(id))];
        const homes = new Map(layout.update(idle));
        const engaged = [fighter('hero', 'player', ids), ...ids.map(id => fighter(id, 'enemy', ['hero']))];
        const grouped = new Map(layout.update(engaged));
        expect(grouped.get('hero')).not.toEqual(homes.get('hero'));
        expect(new Set([...grouped.values()].map(cellKey)).size).toBe(count + 1);
        checkMoves(layout, homes, grouped);
        expect(layout.update(JSON.parse(JSON.stringify(engaged)))).toEqual(grouped);
        const returned = new Map(layout.update(idle));
        expect(returned).toEqual(homes);
        checkMoves(layout, grouped, returned);
    });

    it.each([1, 2])('places shared opponents once with a home column of %i', homeColumn => {
        const layout = new CombatSceneLayout(3.2, homeColumn);
        const state = [fighter('a', 'player', ['x', 'y', 'z']), fighter('b', 'companion', ['y', 'z']),
            fighter('c', 'companion', ['w']), fighter('x', 'enemy', ['a']),
            fighter('y', 'enemy', ['a', 'b']), fighter('z', 'enemy', ['a', 'b']), fighter('w', 'enemy', ['c'])];
        const original = JSON.parse(JSON.stringify(state));
        const grouped = new Map(layout.update(state));
        expect(new Set([...grouped.values()].map(cellKey)).size).toBe(7);
        const later = JSON.parse(JSON.stringify(state));
        later[0].engagedWith = [];
        later.forEach(c => c.engagedWith = c.engagedWith.filter(id => id !== 'a'));
        const next = layout.update(later);
        expect(next.get('a')).toEqual(layout.homes.get('a'));
        if (cellKey(grouped.get('c')) !== cellKey(layout.homes.get('a'))) {
            expect(next.get('c')).toEqual(grouped.get('c'));
        }
        expect(next.get('w')).toEqual(grouped.get('w'));
        const c = layout.world(next.get('c'));
        const w = layout.world(next.get('w'));
        expect(Math.hypot(c.x - w.x, c.z - w.z)).toBeCloseTo(layout.spacing);
        checkMoves(layout, grouped, next);
        expect(state).toEqual(original);
    });

    it('stages a swap without passing through another character', () => {
        const current = new Map([['a', { q: 0, r: 0 }], ['b', { q: 1, r: 0 }]]);
        const targets = new Map([['b', { q: 0, r: 0 }], ['a', { q: 1, r: 0 }]]);
        checkMoves(new CombatSceneLayout(3.2), current, targets);
    });

    it('opens a route for a surrounded character whose neighbours stay in place', () => {
        const ring = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
        const current = new Map([['hero', { q: 0, r: 0 }], ...ring.map(([q, r], i) => [`e${i}`, { q, r }])]);
        const targets = new Map(current);
        targets.set('hero', { q: -4, r: 0 });
        checkMoves(new CombatSceneLayout(3.2), current, targets);
    });
});
