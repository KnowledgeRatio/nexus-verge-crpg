import { SeededRandom } from '../utils/rng.js';
import { filterByCampaign, loadCampaigns } from '../utils/campaignFilter.js';

const catalogues = new Map();
const byId = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

export function loadSettlementSoundscapes(campaignId = 'core') {
    if (!catalogues.has(campaignId)) {
        const pending = (async () => {
            await loadCampaigns();
            const [interiors, exteriors] = await Promise.all(
                ['data/buildingInteriors.json', 'data/settlementSoundscapes.json'].map(async path => {
                    const response = await fetch(path);
                    if (!response.ok) {
                        throw new Error(`Settlement soundscapes unavailable: ${path}`);
                    }
                    return response.json();
                })
            );
            return {
                version: exteriors.version,
                buildings: Object.fromEntries(Object.entries(interiors).map(([type, room]) =>
                    [type, filterByCampaign(room.ambience || [], campaignId)])),
                exteriors: Object.fromEntries(Object.entries(exteriors).filter(([, mixes]) => Array.isArray(mixes))
                    .map(([size, mixes]) => [size, filterByCampaign(mixes, campaignId)]))
            };
        })().catch(error => {
            catalogues.delete(campaignId);
            throw error;
        });
        catalogues.set(campaignId, pending);
    }
    return catalogues.get(campaignId);
}

function candidates(mixes, settlement, version, buildingType = null) {
    const cultures = new Set((settlement.npcs || [])
        .filter(npc => !buildingType || npc.building === buildingType).map(npc => npc.culture));
    return (mixes || []).filter(mix => mix.id && (mix.introducedVersion ?? 1) <= version
        && (!mix.cultureIds || mix.cultureIds.some(id => cultures.has(id)))
        && (!mix.settlementTypes || mix.settlementTypes.includes(settlement.settlementType || 'village')))
        .sort(byId);
}

/** Pin choices independently of presentation and gameplay RNG; missing/private saved IDs remain intact. */
export function prepareSettlementSoundscapes(settlement, { seed, catalogue, catalogueVersion }) {
    const receipt = settlement.soundscapes ??= {
        schemaVersion: 1,
        catalogueVersion: catalogueVersion ?? catalogue.version,
        buildings: {}
    };
    const pick = (mixes, context, buildingType = null) => {
        // Finite worlds prepare receipts before generating residents on first entry.
        if (!settlement.npcs?.length && mixes?.some(mix => mix.cultureIds?.length
            && (mix.introducedVersion ?? 1) <= receipt.catalogueVersion)) {
            return undefined;
        }
        return new SeededRandom(
            `${seed}:settlement-soundscapes:1:${settlement.id ?? `${settlement.x},${settlement.y}`}:${context}`
        ).choice(candidates(mixes, settlement, receipt.catalogueVersion, buildingType))?.id ?? null;
    };
    if (receipt.exteriorMixId === undefined) {
        receipt.exteriorMixId = pick(catalogue.exteriors[settlement.settlementType || 'village'], 'exterior');
    }
    for (const [type, mixes] of Object.entries(catalogue.buildings)) {
        if (receipt.buildings[type] === undefined) {
            receipt.buildings[type] = pick(mixes, type, type);
        }
    }
    return receipt;
}

/** Resolve only the available media; a public build must never erase a private saved selection. */
export function resolveSettlementSoundscape(catalogue, settlement, buildingType = null) {
    const receipt = settlement?.soundscapes;
    const pool = buildingType ? catalogue.buildings[buildingType]
        : catalogue.exteriors[settlement?.settlementType || 'village'];
    const mixes = candidates(pool, settlement || {}, catalogue.version, buildingType);
    const selected = buildingType ? receipt?.buildings[buildingType] : receipt?.exteriorMixId;
    return { mixes, initialMixId: mixes.find(mix => mix.id === selected)?.id ?? mixes[0]?.id ?? null };
}
