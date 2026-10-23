import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { selectBuildingInterior } from '../../src/ui/BuildingInteriorArt.js';

const catalogue = JSON.parse(readFileSync(new URL('../../data/buildingInteriors.json', import.meta.url), 'utf8'));
afterEach(() => vi.restoreAllMocks());

it('keeps each settlement interior stable through serialization without consuming gameplay randomness', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
        throw new Error('Must not consume gameplay RNG');
    });
    const settlement = { id: 'frontier-73', x: 10, y: -7, name: 'A settlement' };
    const before = JSON.stringify(settlement);
    const selected = selectBuildingInterior(catalogue, 'merchant', settlement);
    expect(selectBuildingInterior(catalogue, 'merchant', JSON.parse(before))).toEqual(selected);
    expect(JSON.stringify(settlement)).toBe(before);
    expect(random).not.toHaveBeenCalled();
});

it('provides both stable variants across settlements and uses coordinate identity when there is no ID', () => {
    const variants = new Set();
    for (let x = 0; x < 12; x++) {
        const settlement = { x, y: -3, name: 'Outpost' };
        const selection = selectBuildingInterior(catalogue, 'tavern', settlement);
        variants.add(selection.variantIndex);
        expect(selectBuildingInterior(catalogue, 'tavern', { ...settlement }).image).toBe(selection.image);
    }
    expect([...variants].sort()).toEqual([0, 1]);
});

it('limits explicit previews to available variants and preserves per-variant portrait and counter alignment', () => {
    const settlement = { id: 'preview' };
    const first = selectBuildingInterior(catalogue, 'merchant', settlement, 0);
    const second = selectBuildingInterior(catalogue, 'merchant', settlement, 1);
    expect(first.counterForeground).toBe(catalogue.merchant.variants[0].counterForeground);
    expect(first.people[0].image).toContain('merchant-keeper-v1.png');
    expect(second.people[0].image).toContain('merchant-keeper-v2.png');
    expect(second.caption).toBe(first.caption);
    expect(selectBuildingInterior(catalogue, 'merchant', settlement, 99)).toEqual(
        selectBuildingInterior(catalogue, 'merchant', settlement));
    expect(selectBuildingInterior(catalogue, 'unknown', settlement)).toBeNull();
});

it('covers all settlement building roles with two illustrated variants and keeps ambience only in the tavern', () => {
    const roles = { tavern: 'innkeeper', merchant: 'merchant', blacksmith: 'blacksmith', greathall: 'leader' };
    for (const [type, role] of Object.entries(roles)) {
        expect(catalogue[type].variants).toHaveLength(2);
        for (const index of [0, 1]) {
            const selected = selectBuildingInterior(catalogue, type, {}, index);
            expect(selected.people[0].roles).toContain(role);
            expect(selected.scene3d).toBeUndefined();
            expect(selected.alt.length).toBeGreaterThan(20);
        }
        if (type !== 'tavern') {
            expect(catalogue[type].ambience).toBeUndefined();
        }
    }
    expect(catalogue.tavern.ambience).toHaveLength(1);
    expect(catalogue.tavern.ambience[0].tracks.map(track => track.url)).toEqual([
        'data/sound/tavern-voices-v2.wav', 'data/sound/tavern-activity-v2.wav'
    ]);
});
