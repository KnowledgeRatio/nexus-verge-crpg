import { SeededRandom } from '../utils/rng.js';
import { filterByCampaign, loadCampaigns } from '../utils/campaignFilter.js';

const catalogues = new Map();
const byId = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const eligibleVersion = (entry, version) => (entry.introducedVersion ?? 1) <= version;
const pick = (entries, seed) => new SeededRandom(seed).choice([...entries].sort(byId));

/** Load and campaign-filter once; a failed request can be retried without changing receipts. */
export function loadBuildingPresentation(campaignId = 'core') {
    if (!catalogues.has(campaignId)) {
        const pending = (async () => {
            await loadCampaigns();
            const [interiors, characters] = await Promise.all(
                ['data/buildingInteriors.json', 'data/buildingPeople.json'].map(async path => {
                    const response = await fetch(path);
                    if (!response.ok) {
                        throw new Error(`Building presentation unavailable: ${path}`);
                    }
                    return response.json();
                })
            );
            return {
                version: characters.version,
                people: filterByCampaign(characters.people, campaignId),
                interiors: Object.fromEntries(Object.entries(interiors).map(([type, base]) => [type, {
                    ...base, variants: filterByCampaign(base.variants || [base], campaignId)
                }]))
            };
        })().catch(error => {
            catalogues.delete(campaignId);
            throw error;
        });
        catalogues.set(campaignId, pending);
    }
    return catalogues.get(campaignId);
}

function legacyRoomId(base, type, settlement) {
    // Settlement entry historically supplies a coordinate ID before rendering.
    const identity = settlement.id ?? `${settlement.x ?? 0},${settlement.y ?? 0}`;
    let hash = 2166136261;
    for (const character of `${identity}:${type}`) {
        hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
    }
    const ids = base.legacyVariantIds || [];
    return ids[hash % ids.length];
}

/** Prepare seed-computable room choices before NPCs are instantiated. */
export function prepareBuildingPresentation(settlement, { seed, catalogue, legacy = false, catalogueVersion }) {
    const receipt = settlement.buildingPresentation ??= {
        schemaVersion: 1,
        algorithmVersion: 1,
        catalogueVersion: catalogueVersion ?? catalogue.version,
        seed: `${seed}:building-presentation:1:${settlement.id ?? `${settlement.x},${settlement.y}`}`,
        buildings: {}
    };
    for (const [type, base] of Object.entries(catalogue.interiors)) {
        const candidates = base.variants.filter(room => eligibleVersion(room, receipt.catalogueVersion));
        const existing = receipt.buildings[type];
        if (existing && (existing.roomId === null || candidates.some(room => room.id === existing.roomId))) {
            continue;
        }
        const legacyId = legacy && !existing ? legacyRoomId(base, type, settlement) : null;
        const selected = candidates.find(room => room.id === legacyId)
            || pick(candidates, `${receipt.seed}:room:${type}`);
        receipt.buildings[type] = { roomId: selected?.id ?? null, slots: {} };
    }
    return receipt;
}

function roomConfig(catalogue, type, receipt) {
    const base = catalogue.interiors[type];
    const room = base?.variants.find(candidate => candidate.id === receipt?.roomId);
    return room ? { ...base, ...room, variantIndex: base.variants.indexOf(room) } : null;
}

export function isBuildingPersonCompatible(art, slot, npc, version) {
    return eligibleVersion(art, version) && art.roles.includes(npc.role)
        && art.profiles.includes(slot.profile)
        && Object.entries(art.identityConstraints || {}).every(([field, allowed]) =>
            npc[field] === undefined || npc[field] === null || allowed.includes(npc[field]));
}

/** Bind actual NPCs in stable order, keeping saved choices and deliberate omissions. */
export function assignBuildingPeople(settlement, catalogue) {
    const receipt = settlement.buildingPresentation;
    if (!receipt) {
        return;
    }
    for (const [type, building] of Object.entries(receipt.buildings)) {
        const room = roomConfig(catalogue, type, building);
        if (!room) {
            continue;
        }
        const npcs = (settlement.npcs || []).filter(npc => npc.building === type).sort(byId);
        const usedNPCs = new Set();
        const usedArt = new Set();
        const slots = [...(room.people || [])].sort((a, b) =>
            Number(Boolean(b.roles?.length)) - Number(Boolean(a.roles?.length)) || byId(a, b));
        for (const slot of slots) {
            const eligible = npc => !usedNPCs.has(npc.id) && (!slot.roles || slot.roles.includes(npc.role));
            const savedId = building.slots[slot.id];
            if (savedId === null) {
                continue;
            }
            const npc = npcs.find(candidate => candidate.id === savedId && eligible(candidate))
                || npcs.find(eligible);
            building.slots[slot.id] = npc?.id ?? null;
            if (!npc) {
                continue;
            }
            usedNPCs.add(npc.id);
            const savedArt = npc.buildingAppearance;
            const candidates = catalogue.people.filter(art => isBuildingPersonCompatible(art, slot, npc, receipt.catalogueVersion));
            let art = candidates.find(candidate => candidate.id === savedArt?.artworkId);
            if (!savedArt || (savedArt.artworkId !== null && (!art || usedArt.has(art.id)))) {
                art = pick(candidates.filter(candidate => !usedArt.has(candidate.id)), `${receipt.seed}:person:${npc.id}`);
                npc.buildingAppearance = { artworkId: art?.id ?? null };
            }
            if (art && !usedArt.has(art.id)) {
                usedArt.add(art.id);
            }
        }
        for (const npc of npcs.filter(candidate => !usedNPCs.has(candidate.id))) {
            const candidates = catalogue.people.filter(art => (room.people || []).some(slot =>
                (!slot.roles || slot.roles.includes(npc.role)) && isBuildingPersonCompatible(art, slot, npc, receipt.catalogueVersion)));
            if (npc.buildingAppearance && (npc.buildingAppearance.artworkId === null
                || candidates.some(candidate => candidate.id === npc.buildingAppearance.artworkId))) {
                continue;
            }
            npc.buildingAppearance = { artworkId: pick(candidates, `${receipt.seed}:person:${npc.id}`)?.id ?? null };
        }
    }
    return receipt;
}

/** Read-only scene resolution: no selection, receipt repair, or save mutation in the renderer. */
export function resolveBuildingPresentation(catalogue, buildingType, settlement, npcs = settlement?.npcs || []) {
    const receipt = settlement?.buildingPresentation;
    const building = receipt?.buildings[buildingType];
    const room = roomConfig(catalogue, buildingType, building);
    if (!room) {
        return null;
    }
    const usedArt = new Set();
    const usedNPCs = new Set();
    const people = [];
    for (const slot of room.people || []) {
        const npc = npcs.find(candidate => candidate.id === building.slots[slot.id]);
        const art = catalogue.people.find(candidate => candidate.id === npc?.buildingAppearance?.artworkId);
        if (!npc || !art || usedNPCs.has(npc.id) || usedArt.has(art.id)
            || (slot.roles && !slot.roles.includes(npc.role)) || !isBuildingPersonCompatible(art, slot, npc, receipt.catalogueVersion)) {
            continue;
        }
        usedNPCs.add(npc.id);
        usedArt.add(art.id);
        people.push({ ...slot, image: art.image, npcId: npc.id });
    }
    return { ...room, people };
}
