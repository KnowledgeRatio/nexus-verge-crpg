import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { isBuildingPersonCompatible } from '../../src/systems/BuildingPresentation.js';
import { selectBuildingInterior } from '../../src/ui/BuildingInteriorArt.js';

const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));

it('keeps each named study occupant illustrated with compatible gender in every room', () => {
    const interiors = read('buildingInteriors');
    const catalogue = read('buildingPeople');
    const { npcs } = read('tavernStudy');
    for (const [type, base] of Object.entries(interiors)) {
        for (const index of base.variants.keys()) {
            const room = selectBuildingInterior(interiors, type, {}, index);
            const remaining = npcs.filter(npc => npc.building === type);
            const used = new Set();
            for (const slot of room.people) {
                const npcIndex = remaining.findIndex(npc => slot.roles.includes(npc.role));
                expect(npcIndex).toBeGreaterThanOrEqual(0);
                const [npc] = remaining.splice(npcIndex, 1);
                expect(['male', 'female']).toContain(npc.gender);
                const choices = catalogue.people.filter(art =>
                    isBuildingPersonCompatible(art, slot, npc, catalogue.version) && !used.has(art.id));
                expect(choices.length).toBeGreaterThan(0);
                for (const art of choices) {
                    expect(art.identityConstraints.gender).toContain(npc.gender);
                }
                used.add(choices[0].id);
            }
            expect(remaining).toHaveLength(0);
        }
    }
});
