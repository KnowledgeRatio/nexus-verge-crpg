/** Target-validity census, not skill/combat balance or a playable route simulation.
 * Run: node tools/balance-sim/investigation-target-audit.js
 * Writes only its adjacent investigation-target-audit.results.json artifact.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';
import WorldGenerator from '../../src/systems/WorldGenerator.js';
import QuestGenerator from '../../src/systems/QuestGenerator.js';
import QuestManager from '../../src/systems/QuestManager.js';

const root = new URL('../../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
globalThis.fetch = async path => {
    const data = JSON.parse(read(String(path).split('?')[0]));
    return { ok: true, json: async () => data };
};
globalThis.window = {};

// Match the actual setup select/startNewGame, rather than campaigns.json's
// defaultCampaignId or WorldGenerator constructor defaults.
const html = read('index.html');
const optionsFor = id => [...html.match(new RegExp(`<select id="${id}">([\\s\\S]*?)</select>`))[1]
    .matchAll(/<option value="([^"]+)"([^>]*)>/g)];
const selectedValue = id => {
    const options = optionsFor(id);
    return (options.find(option => /\bselected\b/.test(option[2])) || options[0])[1];
};
const campaigns = JSON.parse(read('data/campaigns.json'));
const allCampaigns = [...campaigns.campaigns, ...(campaigns.templateCampaigns || [])];
const campaignId = selectedValue('campaign');
const campaign = allCampaigns.find(entry => entry.id === campaignId);
const mapSize = campaign?.mapSize || (campaign?.inherits || [])
    .map(id => allCampaigns.find(entry => entry.id === id)?.mapSize).find(Boolean) || 'medium';
const playerEntryConfig = { mapSize, difficulty: selectedValue('difficulty'), campaignId };
const suites = [
    { id: 'original-small-core', n: 100, config: { mapSize: 'small', difficulty: 'normal', campaignId: 'core' },
        overrides: {}, prefix: 'approved-skill-route-' },
    { id: 'player-entry-default', n: 20, config: playerEntryConfig,
        overrides: campaign?.featureGeneration || {}, prefix: 'investigation-target-default-' }
];
const oldLog = console.log;
const oldWarn = console.warn;
const oldOverrides = RULES.worldGen.campaignOverrides;
console.log = () => {};
console.warn = () => {};
const results = [];
try {
    for (const suite of suites) {
        RULES.worldGen.campaignOverrides = { ...suite.overrides };
        const rows = [];
        for (let seed = 0; seed < suite.n; seed++) {
            gameState.set('world.metadata', null);
            gameState.set('world.generatedRegions', new Map());
            gameState.set('character', { level: 5 });
            const worldSeed = `${suite.prefix}${seed}`;
            const world = new WorldGenerator(worldSeed, suite.config);
            await world.generateWorldMetadata();
            const town = world.worldMetadata.settlements.find(entry => entry.x === 16 && entry.y === 16);
            assert.ok(town, 'Expected guaranteed starting town');
            const generator = new QuestGenerator(worldSeed, suite.config.campaignId);
            const manager = new QuestManager(generator);
            const ownedHooks = generator.getHooksForSettlement(town.id);
            const hooks = ownedHooks.length ? ownedHooks : generator.getNearbyInvestigationHooks(town);
            for (const level of [1, 5, 10]) {
                gameState.set('character', { level });
                const quests = await generator.generateQuestsForSettlement(town, level);
                const investigations = quests.filter(quest => quest.type === 'investigate');
                assert.equal(investigations.length, hooks.length ? 1 : 0);
                gameState.set('quests', { active: investigations });
                let valid = 0;
                for (const quest of investigations) {
                    const target = world.worldMetadata.features.find(feature => `${feature.x},${feature.y}` === quest.dungeonHookId);
                    assert.ok(target);
                    assert.ok(hooks.some(hook => hook.x === target.x && hook.y === target.y));
                    if (ownedHooks.length) {
                        assert.equal(target.questHook.nearestSettlementId, town.id);
                    } else {
                        assert.ok(Math.hypot(target.x - town.x, target.y - town.y) <= RULES.quests.investigationFallbackDistanceTiles);
                    }
                    assert.ok(target.type === 'dungeon' || (target.type === 'poi' && target.resolvedType === 'dungeon'));
                    assert.ok(!target.questBind);
                    assert.equal(quest.objectives[0].targetLocation, quest.dungeonHookId);
                    assert.equal(manager._getRoomInvestigations(target.x, target.y, 0).length, 1);
                    assert.equal(manager._getRoomInvestigations(target.x, target.y, 1).length, 0);
                    assert.equal(manager._getRoomInvestigations(target.x + 1, target.y, 0).length, 0);
                    valid++;
                }
                rows.push({ seed, level, eligibleHooks: hooks.length, offered: investigations.length,
                    withheld: Number(hooks.length === 0), targetValid: valid,
                    totalQuestOffers: quests.length, target: investigations[0]?.dungeonHookId || null });
            }
            if ((seed + 1) % 20 === 0) {
                process.stderr.write(`${suite.id}: ${seed + 1}/${suite.n} worlds checked\n`);
            }
        }
        const summaries = [1, 5, 10].map(level => {
            const cells = rows.filter(row => row.level === level);
            const withheld = cells.reduce((sum, row) => sum + row.withheld, 0);
            const p = withheld / suite.n;
            const margin = 1.96 * Math.sqrt(p * (1 - p) / suite.n);
            return { level, nWorlds: suite.n, offered: cells.reduce((sum, row) => sum + row.offered, 0),
                withheld, targetValid: cells.reduce((sum, row) => sum + row.targetValid, 0),
                withheldFraction: p, ci95: [Math.max(0, p - margin), Math.min(1, p + margin)],
                totalQuestOffers: cells.reduce((sum, row) => sum + row.totalQuestOffers, 0) };
        });
        results.push({ ...suite, summaries, controls: rows.filter(row => row.seed < 2), rows });
    }
    const output = {
        methodology: 'Real seeded world metadata and starting-town quests. Three level evaluations per world are paired, not independent. Validity checked through actual QuestManager room matcher. No travel, rolls, rewards, NPC assignment or legacy-save recovery simulated. Validity counts are exact for the enumerated worlds; withholding CIs describe sampled worlds, not skill/combat win rates. No differences between suites or levels asserted. A reachable metadata target does not prove physically safe access.',
        playerEntrySource: { select: 'index.html', consumers: 'src/main.js startNewGame/loadCampaignFeatureOverrides',
            configuredCampaignDefault: campaigns.defaultCampaignId,
            selectedCampaignDisabledInData: Boolean(campaign?.disabled),
            actualConfig: playerEntryConfig },
        worldHooksEnabled: RULES.quests.enableWorldHooks,
        targetlessNewInvestigations: 0,
        results
    };
    fs.writeFileSync(new URL('./investigation-target-audit.results.json', import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
    oldLog(JSON.stringify({ ...output, results: results.map(({ rows, ...suite }) => suite) }, null, 2));
} finally {
    console.log = oldLog;
    console.warn = oldWarn;
    RULES.worldGen.campaignOverrides = oldOverrides;
}
