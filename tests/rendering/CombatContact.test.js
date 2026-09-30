import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { planContact, pathLength, sampleContactPath, segmentClear } from '../../src/rendering/CombatContact.js';
import { CombatSceneLayout } from '../../src/rendering/CombatSceneLayout.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url), 'utf8'));
const study = JSON.parse(readFileSync(new URL('../../data/combatSceneStudy.json', import.meta.url), 'utf8'));

function checkContact(source, target, actors, minimumZ = -Infinity) {
    const before = JSON.stringify(actors);
    const path = planContact(source, target, actors, config.contact, minimumZ);
    expect(path).not.toBeNull();
    expect(path.every(point => point.z >= minimumZ)).toBe(true);
    const obstacles = actors.filter(a => a.id !== source.id).map(a => ({
        ...a, radius: source.radius + a.radius + config.contact.clearance
    }));
    for (let i = 1; i < path.length; i++) {
        expect(segmentClear(path[i - 1], path[i], obstacles)).toBe(true);
    }
    const end = path.at(-1);
    expect(Math.hypot(end.x - target.x, end.z - target.z)).toBeCloseTo(source.reach + target.radius);
    expect(sampleContactPath(path, 0)).toEqual({ x: source.x, z: source.z });
    expect(sampleContactPath(path, 1)).toEqual(end);
    expect(sampleContactPath(path, -1)).toEqual(path[0]);
    expect(JSON.stringify(actors)).toBe(before);
    return path;
}

describe('Presentation melee contact', () => {
    it.each(Object.keys(study.scenarios))('reaches every linked opponent without crossing bodies in %s', scenarioId => {
        const scenario = study.scenarios[scenarioId];
        const combatants = scenario.participants.map(id => ({
            ...study.combatants.find(c => c.id === id), engagedWith: scenario.links.flatMap(([a, b]) =>
                a === id ? [b] : b === id ? [a] : [])
        }));
        const layout = new CombatSceneLayout(config.layout.spacing);
        const positions = layout.update(combatants);
        const minimumZ = layout.world({ q: 0, r: layout.minimumR }).z;
        const actors = combatants.map(c => ({ id: c.id, ...layout.world(positions.get(c.id)),
            radius: config.contact.bodyRadius * config.appearances[c.appearance].height,
            reach: config.contact.reach * config.appearances[c.appearance].height }));
        for (const [a, b] of scenario.links) {
            checkContact(actors.find(c => c.id === a), actors.find(c => c.id === b), actors, minimumZ);
            checkContact(actors.find(c => c.id === b), actors.find(c => c.id === a), actors, minimumZ);
        }
    });

    it('routes around a third actor directly between attacker and target', () => {
        const actors = [0, 3, 6].map((x, id) => ({ id, x, z: 0, radius: 0.43, reach: 0.72 }));
        const path = checkContact(actors[0], actors[2], actors);
        expect(path.length).toBeGreaterThan(2);
        expect(pathLength(path)).toBeGreaterThan(4);
    });

    it('keeps a melee approach and retreat in front of the wall when bodies obstruct its edge', () => {
        const actors = [0, 3, 6].map((x, id) => ({ id, x, z: 0, radius: 0.43, reach: 0.72 }));
        const path = checkContact(actors[0], actors[2], actors, 0);
        expect(path.some(point => point.z > 0)).toBe(true);
        for (let fraction = 0; fraction <= 1; fraction += 0.05) {
            expect(sampleContactPath(path, fraction).z).toBeGreaterThanOrEqual(0);
        }
    });
});
