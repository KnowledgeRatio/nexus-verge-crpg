import { SeededRandom } from '../utils/rng.js';

/** Select immutable site content with the same seed stream used by saved legacy sites. */
export function selectHostileSettlementContent(worldSeed, settlementId, content, rebuildStages) {
    const rng = new SeededRandom(`${worldSeed}_${settlementId}_liberation`);
    const steps = ['combat', 'exploration', 'social'].map(type => rng.choice(content[type] || []));
    const rebuilding = rng.shuffle(content.rebuilding || []);
    return JSON.parse(JSON.stringify({ steps, rebuildSteps: rebuilding.slice(0, rebuildStages) }));
}
