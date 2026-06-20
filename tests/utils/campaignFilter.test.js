/**
 * Tests for src/utils/campaignFilter.js
 * Campaign filtering — only testing sync functions (no fetch dependency).
 */

import { describe, it, expect } from 'vitest';
import {
    filterByCampaign,
    isAvailableForCampaign,
    getEffectiveCampaignIds,
    filterObjectArraysByCampaign,
    filterLoadedData
} from '../../src/utils/campaignFilter.js';

// NOTE: campaignInheritance is NOT loaded (loadCampaigns is async and fetch-dependent).
// All tests run with the "not loaded" fallback behaviour.

// ---------------------------------------------------------------------------
// filterByCampaign
// ---------------------------------------------------------------------------
describe('filterByCampaign', () => {
    it('keeps entries whose campaignIds include the target campaign', () => {
        const entries = [
            { id: 'a', campaignIds: ['core'] },
            { id: 'b', campaignIds: ['nexus-verge'] }
        ];
        const result = filterByCampaign(entries, 'core');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('a');
    });

    it('keeps entries with no campaignIds (defaults to core)', () => {
        const entries = [
            { id: 'x' },  // no campaignIds field
            { id: 'y', campaignIds: ['nexus-verge'] }
        ];
        const result = filterByCampaign(entries, 'core');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('x');
    });

    it('defaults campaignId to "core" when null is passed', () => {
        const entries = [
            { id: 'core-item', campaignIds: ['core'] },
            { id: 'other-item', campaignIds: ['other'] }
        ];
        const result = filterByCampaign(entries, null);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('core-item');
    });

    it('returns empty array when nothing matches', () => {
        const entries = [{ id: 'z', campaignIds: ['special'] }];
        expect(filterByCampaign(entries, 'core')).toHaveLength(0);
    });

    it('returns non-array input unchanged', () => {
        const obj = { id: 'not-array' };
        expect(filterByCampaign(obj, 'core')).toBe(obj);
    });

    it('handles empty array input', () => {
        expect(filterByCampaign([], 'core')).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// isAvailableForCampaign
// ---------------------------------------------------------------------------
describe('isAvailableForCampaign', () => {
    it('entry with no campaignIds is available for "core"', () => {
        expect(isAvailableForCampaign({ id: 'no-campaign' }, 'core')).toBe(true);
    });

    it('entry with campaignIds: ["core"] is available for "core"', () => {
        expect(isAvailableForCampaign({ id: 'a', campaignIds: ['core'] }, 'core')).toBe(true);
    });

    it('entry with campaignIds: ["nexus-verge"] is NOT available for "core" (inheritance not loaded)', () => {
        // Without inheritance loaded, getEffectiveCampaignIds('core') = ['core','core'].
        // 'nexus-verge' is not in that list.
        expect(isAvailableForCampaign({ id: 'b', campaignIds: ['nexus-verge'] }, 'core')).toBe(false);
    });

    it('returns false for null/undefined entry', () => {
        expect(isAvailableForCampaign(null, 'core')).toBe(false);
        expect(isAvailableForCampaign(undefined, 'core')).toBe(false);
    });

    it('entry is available when its campaign matches the queried campaign', () => {
        // getEffectiveCampaignIds('nexus-verge') = ['nexus-verge', 'core']
        expect(isAvailableForCampaign({ campaignIds: ['nexus-verge'] }, 'nexus-verge')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// getEffectiveCampaignIds (without inheritance loaded)
// ---------------------------------------------------------------------------
describe('getEffectiveCampaignIds', () => {
    it('includes the queried campaign ID', () => {
        const ids = getEffectiveCampaignIds('core');
        expect(ids).toContain('core');
    });

    it('returns an array', () => {
        expect(Array.isArray(getEffectiveCampaignIds('core'))).toBe(true);
    });

    it('includes "core" in the result', () => {
        // Fallback path: returns [campaignId, 'core']
        const ids = getEffectiveCampaignIds('any-campaign');
        expect(ids).toContain('core');
    });
});

// ---------------------------------------------------------------------------
// filterObjectArraysByCampaign
// ---------------------------------------------------------------------------
describe('filterObjectArraysByCampaign', () => {
    it('filters arrays inside an object by campaign', () => {
        const obj = {
            weapons: [
                { id: 'sword', campaignIds: ['core'] },
                { id: 'laser', campaignIds: ['scifi'] }
            ],
            count: 2  // non-array value — should pass through unchanged
        };
        const result = filterObjectArraysByCampaign(obj, 'core');
        expect(result.weapons).toHaveLength(1);
        expect(result.weapons[0].id).toBe('sword');
        expect(result.count).toBe(2);
    });

    it('non-array values are passed through unchanged', () => {
        const obj = { label: 'hello', num: 42 };
        const result = filterObjectArraysByCampaign(obj, 'core');
        expect(result.label).toBe('hello');
        expect(result.num).toBe(42);
    });

    it('handles null input gracefully', () => {
        expect(filterObjectArraysByCampaign(null, 'core')).toBeNull();
    });

    it('handles non-object input gracefully', () => {
        expect(filterObjectArraysByCampaign('string', 'core')).toBe('string');
    });
});

// ---------------------------------------------------------------------------
// filterLoadedData
// ---------------------------------------------------------------------------
describe('filterLoadedData', () => {
    it('filters the specified arrayKey by campaign', () => {
        const data = {
            items: [
                { id: 'core-item', campaignIds: ['core'] },
                { id: 'other-item', campaignIds: ['special'] }
            ],
            title: 'Test Data'
        };
        const result = filterLoadedData(data, 'core', { arrayKeys: ['items'] });
        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe('core-item');
    });

    it('preserves non-array properties', () => {
        const data = { items: [], title: 'Hello', count: 7 };
        const result = filterLoadedData(data, 'core', { arrayKeys: ['items'] });
        expect(result.title).toBe('Hello');
        expect(result.count).toBe(7);
    });

    it('ignores arrayKeys that are not present in data', () => {
        const data = { title: 'Only title' };
        expect(() => filterLoadedData(data, 'core', { arrayKeys: ['missing'] })).not.toThrow();
    });

    it('handles null data gracefully', () => {
        expect(filterLoadedData(null, 'core', {})).toBeNull();
    });

    it('handles missing options gracefully', () => {
        const data = { items: [{ id: 'x', campaignIds: ['core'] }] };
        expect(() => filterLoadedData(data, 'core')).not.toThrow();
    });
});
