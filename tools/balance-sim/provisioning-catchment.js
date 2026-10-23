import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
// Reuse the existing headless engine bootstrap, not a replacement generation model.
import './expedition-review.js';
import WorldGenerator from '../../src/systems/WorldGenerator.js';
import { gameState } from '../../src/core/GameState.js';

const baseline = JSON.parse(fs.readFileSync(new URL('./provisioning-exposure.baseline-8.results.json', import.meta.url)));
const cues = JSON.parse(fs.readFileSync(new URL('../../data/provisioning.json', import.meta.url))).cues;
const rows = [];
for (const sample of baseline.rows.filter(row => row.level === 1 && !row.trained && row.trial === 0)) {
    gameState.reset();
    const world = new WorldGenerator(`expedition-review-${sample.seed}`, {
        mapSize: 'small', difficulty: 'normal', campaignId: 'nexus-verge'
    });
    await world.generateWorldMetadata();
    const sources = world.worldMetadata.features.filter(site => site.provisioning);
    assert.equal(sources.length, sample.generatedSources);
    const eligible = world.worldMetadata.features.filter(site => site.resolvedType === 'sanctuary' &&
        cues.some(cue => cue.eligiblePoiTypes?.includes(site.poiType) &&
            cue.eligibleBiomes.includes(world._sampleTerrainAt(site.x, site.y))));
    const nearest = sites => sites.map(site => ({
        id: site.id, poiType: site.poiType,
        distance: Math.hypot(site.x - sample.journey.town.x, site.y - sample.journey.town.y),
        source: !!site.provisioning
    })).sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))[0] || null;
    rows.push({ seed: sample.seed, town: sample.journey.town,
        sources: sources.length, eligibleShelters: eligible.length,
        nearestSource: nearest(sources), nearestEligibleShelter: nearest(eligible) });
}
const result = {
    methodology: 'Real metadata regenerated for the same starter-town samples, with source-count assertions. ' +
        'Distances are Euclidean lower bounds, not traversable paths, detours or accepted intel radii. ' +
        'This tests existing eligible sites before proposing allocation or shelter leads; no new sites or rules.',
    catchments: [32, 64, 96, 128].map(radius => ({ radius, worlds: rows.length,
        withSource: rows.filter(row => row.nearestSource?.distance <= radius).length,
        withEligibleShelter: rows.filter(row => row.nearestEligibleShelter?.distance <= radius).length })),
    hashes: Object.fromEntries(['src/systems/WorldGenerator.js', 'src/core/rulesEngine.js', 'data/provisioning.json']
        .map(file => [file, createHash('sha256').update(fs.readFileSync(new URL(`../../${file}`, import.meta.url)))
            .digest('hex')])), rows
};
fs.writeFileSync(new URL('./provisioning-catchment.results.json', import.meta.url), JSON.stringify(result, null, 2));
process.stdout.write(JSON.stringify(result.catchments) + '\n');
