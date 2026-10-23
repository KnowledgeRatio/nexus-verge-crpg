import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { run } from './expedition-review.js';
import { RULES } from '../../src/core/rulesEngine.js';

const variant = process.env.PROVISION_VARIANT || 'baseline';
const budget = Number(process.env.PROVISION_DETOUR_BUDGET || 8);
const seeds = Number(process.env.PROVISION_SEEDS || 15);
const trials = Number(process.env.PROVISION_TRIALS || 4);
if (!['baseline', 'allCandidates'].includes(variant) || ![0, 8, 16].includes(budget)) {
    throw new Error('Expected baseline/allCandidates and detour budget 0/8/16');
}
if (variant === 'allCandidates') {
    RULES.provisioning.generation.candidateFraction = 1;
}

const rows = [];
for (let seed = 0; seed < seeds; seed++) {
    for (const level of [1, 5, 10]) {
        for (let trial = 0; trial < trials; trial++) {
            for (const trained of [false, true]) {
                let world;
                let initial;
                const revealed = [];
                const hook = async () => true;
                hook.detourBudget = budget;
                hook.setup = async context => {
                    world = context.world;
                    const cues = context.game.provisioningManager.data.cues;
                    initial = world.worldMetadata.features.filter(site => site.type === 'poi').map(site => ({
                        id: site.id, x: site.x, y: site.y,
                        eligible: site.resolvedType === 'sanctuary' && cues.some(cue =>
                            cue.eligiblePoiTypes?.includes(site.poiType) &&
                            cue.eligibleBiomes.includes(world._sampleTerrainAt(site.x, site.y))),
                        source: !!site.provisioning
                    }));
                    const reveal = context.player._revealPoiAtPlayerPosition.bind(context.player);
                    context.player._revealPoiAtPlayerPosition = async () => {
                        const site = await reveal();
                        if (site) {
                            const opportunity = context.game.provisioningManager
                                .getOpportunityAtPosition(site.x, site.y);
                            revealed.push({ id: site.id, type: site.type, source: !!site.provisioning,
                                capacityQualified: !!opportunity?.canAttempt, reason: opportunity?.reason });
                        }
                        return site;
                    };
                };
                const result = await run(`expedition-review-${seed}`, level, trained, trial,
                    budget === 0 ? 'direct' : 'local', hook);
                const visible = initial.filter(site => world.getCachedTile(site.x, site.y)?.explored);
                const eligibleIds = new Set(initial.filter(site => site.eligible).map(site => site.id));
                const eligibleReveals = revealed.filter(site => eligibleIds.has(site.id));
                rows.push({ seed, level, trained, trial, success: result.success, dead: result.dead,
                    terminalPhase: result.terminalPhase, steps: result.steps, detourSteps: result.detourSteps,
                    generatedSources: initial.filter(site => site.source).length,
                    visibleAmbiguousSites: visible.length, inspectedAmbiguousSites: result.inspectedPOIs,
                    revealedAmbiguousSites: revealed.length,
                    revealedEligibleSanctuaries: eligibleReveals.length,
                    selectedSourcesRevealed: eligibleReveals.filter(site => site.source).length,
                    visibleSourceTiles: visible.filter(site => site.source).length,
                    cluesSeen: result.seenProvisionSites,
                    capacityQualifiedReveals: revealed.filter(site => site.capacityQualified).length,
                    attempts: result.attempts, suppliesEarned: result.suppliesEarned,
                    goldSpent: result.goldSpent, goldFinal: result.goldFinal,
                    fights: result.combats.length, revealed, events: result.events,
                    // Preserve outcome-selected traces and rest/resource evidence for later review.
                    journey: result });
                process.stdout.write(`${variant} budget${budget} seed${seed} L${level} t${trial} ` +
                    `trained${trained} shelters${eligibleReveals.length} clues${result.seenProvisionSites}\n`);
            }
        }
    }
}
const representative = rows.filter(row => !row.trained);
const sum = key => representative.reduce((total, row) => total + row[key], 0);
const hashes = Object.fromEntries([
    'src/systems/WorldGenerator.js', 'src/systems/ProvisioningManager.js', 'src/systems/Player.js',
    'src/systems/CombatManager.js', 'src/main.js', 'src/systems/restRecovery.js',
    'src/core/rulesEngine.js', 'data/provisioning.json',
    'tools/balance-sim/provisioning-exposure.js', 'tools/balance-sim/expedition-review.js'
].map(file => [file, createHash('sha256').update(fs.readFileSync(new URL(`../../${file}`, import.meta.url)))
    .digest('hex')]));
const result = { variant, budget, seeds, trials, rules: RULES.provisioning, hashes,
    methodology: 'Actual existing expedition runner; no forced arrival, victory, source, supply or roll outcome. ' +
        'One independent process per allocation variant avoids cached metadata crossing configurations. ' +
        'Hidden eligibility classified only after the same site-blind navigation choices. ' +
        'Source visibility alone does not mean a cue was revealed or gathering was useful. ' +
        'Fixed-level snapshots, shared-world clusters, full-terrain pathfinder knowledge, no quest completion, ' +
        'declined optional road events and controlled reaction policy retain the original harness limits.',
    summary: { representativeTrials: representative.length,
        worldsWithClues: new Set(representative.filter(row => row.cluesSeen).map(row => row.seed)).size,
        sourcesPerWorld: representative.filter(row => row.level === 1 && row.trial === 0)
            .map(row => ({ seed: row.seed, sources: row.generatedSources })),
        visibleAmbiguousSites: sum('visibleAmbiguousSites'), inspectedAmbiguousSites: sum('inspectedAmbiguousSites'),
        revealedAmbiguousSites: sum('revealedAmbiguousSites'),
        revealedEligibleSanctuaries: sum('revealedEligibleSanctuaries'),
        selectedSourcesRevealed: sum('selectedSourcesRevealed'), visibleSourceTiles: sum('visibleSourceTiles'),
        capacityQualifiedReveals: sum('capacityQualifiedReveals'), attempts: sum('attempts'),
        suppliesEarned: sum('suppliesEarned'),
        returned: representative.filter(row => row.success).length,
        dead: representative.filter(row => row.dead).length,
        alivePlannerStops: representative.filter(row => !row.success && !row.dead).length }, rows };
fs.writeFileSync(new URL(`./provisioning-exposure.${variant}-${budget}.results.json`, import.meta.url),
    JSON.stringify(result, null, 2));
process.stdout.write(JSON.stringify(result.summary) + '\n');
