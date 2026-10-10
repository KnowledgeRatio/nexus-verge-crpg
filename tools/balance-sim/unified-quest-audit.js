/** Publication census, not played travel/completion. Run from any directory with Node. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';
import WorldGenerator from '../../src/systems/WorldGenerator.js';
import NPCGenerator from '../../src/systems/NPCGenerator.js';
import QuestGenerator from '../../src/systems/QuestGenerator.js';
import QuestManager from '../../src/systems/QuestManager.js';
import SettlementManager from '../../src/systems/SettlementManager.js';
import MerchantManager from '../../src/systems/MerchantManager.js';
import RelationManager from '../../src/systems/RelationManager.js';
import { DungeonGenerator } from '../../src/systems/DungeonGenerator.js';
import { DungeonManager } from '../../src/systems/DungeonManager.js';
import { Character } from '../../src/systems/Character.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import SkillChallengeManager from '../../src/systems/SkillChallengeManager.js';
import { isRichQuest } from '../../src/systems/ProceduralQuest.js';

const root = new URL('../../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
globalThis.fetch = async path => ({ ok: true, json: async () => JSON.parse(read(String(path).split('?')[0])) });
globalThis.window = {};
const campaignId = 'nexus-verge';
const campaign = JSON.parse(read('data/campaigns.json')).campaigns.find(entry => entry.id === campaignId);
const worldCount = Number(process.env.QUEST_AUDIT_WORLDS || 20);
assert.ok(Number.isInteger(worldCount) && worldCount >= 2);
const quantiles = values => {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    return Object.fromEntries([0, 0.5, 0.9, 0.95, 1].map(p => [p, sorted[Math.floor((sorted.length - 1) * p)] ?? null]));
};
const worldInterval = values => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
    const margin = 1.96 * Math.sqrt(variance / values.length);
    return { mean, ci95: [Math.max(0, mean - margin), Math.min(1, mean + margin)], independentWorlds: values.length };
};
const oldLog = console.log;
const oldWarn = console.warn;
const oldOverrides = RULES.worldGen.campaignOverrides;
const worlds = [];
let authored = null;
const structureDefinitions = {};
const structuralSignature = quest => {
    const shape = {
        objectives: (quest.objectives || []).map(objective => ({ type: objective.type,
            role: objective.requirement?.source?.encounterRole ?? null })),
        actions: (quest.actions || []).map(action => ({ kind: action.acquire ? 'acquire' : action.salvage ? 'salvage' : action.skillId ? 'check' : 'observe',
            skill: action.skillId ?? null, location: action.location,
            requiresFacts: action.requiresFacts || [], requiresActions: action.requiresActions || [],
            requiresObjectives: action.requiresObjectives || [] })),
        resolutions: (quest.resolutions || []).map(choice => ({ fulfilled: Boolean(choice.fulfilled),
            requiresFacts: choice.requiresFacts || [], requiresActions: choice.requiresActions || [],
            requiresObjectives: choice.requiresObjectives || [], effects: (choice.effects || []).map(effect => ({
                type: effect.type, participant: effect.participant ?? null, modifier: effect.modifier ?? null,
                tier: effect.rewardTier ?? null })) }))
    };
    const signature = createHash('sha256').update(JSON.stringify(shape)).digest('hex').slice(0, 16);
    structureDefinitions[signature] = shape;
    return signature;
};
const frequency = values => Object.fromEntries([...new Set(values)].sort().map(value => [value, values.filter(entry => entry === value).length]));
function exactSkillChecks() {
    const data = path => JSON.parse(read(path));
    const calling = data('data/classes.json').classes.find(row => row.id === 'dedication');
    const backgrounds = data('data/backgrounds.json').backgrounds;
    const species = data('data/races.json').races.find(row => row.id === 'human');
    const knight = data('data/kits.json').dedication.find(row => row.id === 'knight').preset;
    const keys = ['prowess', 'resilience', 'intellect', 'intuition', 'presence', 'composure'];
    const profiles = [
        { id: 'knight', background: knight.background, skills: knight.skills,
            base: keys.map(key => knight.abilitiesNVSystem[key]), investments: ['prowess', 'resilience'] },
        { id: 'dedicationSage', background: 'sage', skills: ['athletics', 'perception'],
            base: [8, 12, 15, 13, 10, 14], investments: ['intellect', 'composure'] }
    ];
    const manager = new SkillChallengeManager();
    manager.skillsData = data('data/skills.json').skills;
    skillRegistry.setDefinitions(manager.skillsData);
    const random = Math.random;
    const cells = [];
    let resolutions = 0;
    try {
        for (const profile of profiles) {
            const background = backgrounds.find(row => row.id === profile.background);
            assert.equal(profile.skills.length, calling.skillChoices.choose);
            assert.ok(profile.skills.every(skill => calling.skillChoices.from.includes(skill)
                && !background.skillProficiencies.includes(skill)));
            if (profile.id !== 'knight') {
                assert.deepEqual([...profile.base].sort((a, b) => a - b), [...RULES.core.standardArray].sort((a, b) => a - b));
            }
            for (const level of [1, 5, 10]) {
                const actor = new Character({ id: profile.id, name: profile.id, species, class: calling, background,
                    baseAbilities: Object.fromEntries(keys.map((key, i) => [key, profile.base[i]])),
                    skillChoices: profile.skills, fightingStyle: profile.id === 'knight' ? knight.fightingStyle : 'defense' });
                for (let next = 2; next <= level; next++) {
                    actor.levelUp(next);
                    actor.applyLevelUpSelections({ asiChoice: profile.investments[next <= 5 ? 0 : 1] });
                }
                assert.ok(Object.values(actor.skills).every(skill => !skill.expertise));
                for (const skillId of ['investigation', 'craft']) {
                    for (const fatigue of [0, 75, 90]) {
                        gameState.set('party.activeSynergies', {});
                        gameState.set('party.companions', []);
                        gameState.set('fatigue', { current: fatigue, exhaustionLevels: 0, supplies: 0 });
                        const options = { skillId, dc: RULES.quests.proceduralCore.investigationDC };
                        const context = manager.getSkillCheckContext(actor, skillId, options);
                        const faces = context.disadvantage || context.advantage ? 400 : 20;
                        const trials = [];
                        for (let index = 0; index < faces; index++) {
                            const draws = faces === 20 ? [index + 1] : [Math.floor(index / 20) + 1, index % 20 + 1];
                            let cursor = 0;
                            Math.random = () => (draws[cursor++] - 0.5) / 20;
                            trials.push(manager.rollSkillCheck(actor, options));
                            resolutions++;
                        }
                        const wins = trials.filter(row => row.success);
                        const losses = trials.filter(row => !row.success);
                        const extreme = trials.reduce((a, b) => Math.abs(b.total - b.dc) > Math.abs(a.total - a.dc) ? b : a);
                        cells.push({ profile: profile.id, level, skillId, fatigue, modifier: context.modifier,
                            proficient: actor.skills[skillId].proficient, dc: options.dc, faces,
                            exactSuccessProbability: wins.length / faces,
                            traces: [wins[Math.floor(wins.length / 2)], losses[0], extreme].filter(Boolean)
                                .map(({ rolls, total, dc, modifier, success }) => ({ rolls, total, dc, modifier, success })) });
                    }
                }
            }
        }
    } finally {
        Math.random = random;
    }
    return { methodology: 'Complete die support through live SkillChallengeManager for legal Dedication Knight/Sage. Upper levels are conditional skill-stat/ASI projections. Fatigue is supplied at roll time. No companions/expertise, no actual quest paths or payout/travel simulation. Exact probabilities have no sampling error CI.', resolutions, cells };
}
console.log = () => {};
console.warn = () => {};
try {
    RULES.worldGen.campaignOverrides = { ...campaign.featureGeneration };
    for (const order of ['ascending', 'descending']) {
        for (const level of [1, 5, 10]) {
            for (let seed = 0; seed < worldCount; seed++) {
                gameState.reset();
                gameState.set('character', { level });
                gameState.set('quests', { available: [], active: [], completed: [], failed: [] });
                const worldSeed = `procedural-quest-publication-${seed}`;
                const world = new WorldGenerator(worldSeed, { mapSize: 'small', difficulty: 'normal', campaignId });
                await world.generateWorldMetadata();
                const npcGenerator = new NPCGenerator(worldSeed, campaignId);
                const generator = new QuestGenerator(worldSeed, campaignId);
                const questManager = new QuestManager(generator);
                const relationManager = new RelationManager();
                const merchantManager = new MerchantManager(worldSeed, campaignId);
                const dungeonGenerator = new DungeonGenerator(worldSeed);
                const dungeonManager = new DungeonManager(dungeonGenerator, world);
                dungeonManager.setMonstersData(JSON.parse(read('data/monsters.json')));
                await Promise.all([npcGenerator.loadData(), generator.loadData(), relationManager.init(campaignId), merchantManager.loadData(), dungeonGenerator.loadData()]);
                assert.ok(dungeonGenerator.dungeonTypes.length);
                if (!authored) {
                    const grammar = generator.questData.questComposition;
                    const combinations = generator.getCompatibleCompositions();
                    authored = { rawCartesian: Object.values(grammar.dimensions).reduce((n, entries) => n * entries.length, 1),
                        compatibleComponentAssignments: combinations.length,
                        activitySets: frequency(combinations.map(combination => Object.keys(grammar.activities)
                            .filter(id => Object.values(combination).some(component => component.activities?.includes(id))).join('>'))) };
                }
                window.game = { worldGenerator: world, npcGenerator, questGenerator: generator,
                    questManager, relationManager, merchantManager, dungeonManager };
                const settlementManager = new SettlementManager(world, { showSettlementModal() {} }, npcGenerator, generator, questManager);
                const towns = [];
                let combatBindingTrace = null;
                const sorted = [...world.worldMetadata.settlements].sort((a, b) => a.x - b.x || a.y - b.y);
                if (order === 'descending') {
                    sorted.reverse();
                }
                for (const town of sorted) {
                    // Synthetic visit policy: skip walking/region streaming; retain real entry/publication path.
                    gameState.set('player.position', { x: town.x, y: town.y });
                    settlementManager.getSettlementAtPlayerPosition = () => town;
                    const hooksBefore = generator.getHooksForSettlement(town.id).length;
                    const nearbyBefore = generator.getNearbyInvestigationHooks(town).length;
                    const previous = gameState.get('quests.available').length;
                    assert.equal(await settlementManager.enterSettlement(), true);
                    const published = gameState.get('quests.available').slice(previous);
                    const procedural = published.filter(isRichQuest);
                    const allProcedural = gameState.get('quests.available').filter(quest => quest.procedural);
                    const targets = allProcedural.map(quest => quest.dungeonHookId);
                    assert.equal(new Set(targets).size, targets.length, 'No simultaneous duplicate procedural incidents');
                    const budget = RULES.quests.questSlotBudget[town.settlementType];
                    assert.ok(published.length <= budget);
                    for (const quest of published.filter(quest => quest.dungeonHookId)) {
                        const target = world.worldMetadata.features.find(feature => `${feature.x},${feature.y}` === quest.dungeonHookId);
                        assert.ok(target);
                        assert.ok(!quest.pendingBind);
                        if (quest.type === 'retrieve' && !quest.procedural) {
                            assert.equal(target.questBind?.questId, quest.id);
                        }
                    }
                    for (const quest of procedural) {
                        assert.ok(town.npcs.some(npc => npc.id === quest.questGiverId));
                        for (const participant of Object.values(quest.procedural.participants)) {
                            assert.ok(town.npcs.some(npc => npc.id === participant.npcId));
                        }
                    }
                    const combatQuest = procedural.find(quest => quest.objectives.some(objective => objective.type === 'defeat_encounter'));
                    if (combatQuest && !combatBindingTrace) {
                        const source = combatQuest.objectives.find(objective => objective.type === 'defeat_encounter').requirement.source;
                        const target = world.worldMetadata.features.find(feature => `${feature.x},${feature.y}` === source.siteId);
                        const expectedType = dungeonManager.getQuestDungeonType(target);
                        const generated = await dungeonGenerator.generateDungeon(target, level);
                        const bossRoom = generated.rooms.find(room => room.isBossRoom);
                        assert.equal(generated.dungeonTypeId, expectedType.id);
                        assert.ok(bossRoom.boss);
                        assert.ok(dungeonManager.monstersData.monsters.some(monster => monster.id === bossRoom.boss));
                        combatBindingTrace = { questId: combatQuest.id, source, dungeonType: generated.dungeonTypeId,
                            boss: bossRoom.boss, roomIndex: generated.rooms.indexOf(bossRoom), rooms: generated.rooms.length };
                    }
                    towns.push({ id: town.id, x: town.x, y: town.y, type: town.settlementType, budget,
                        localHooksBefore: hooksBefore, nearbyCandidateBefore: nearbyBefore > 0,
                        offers: published.map(quest => ({ id: quest.id, type: quest.type, target: quest.dungeonHookId ?? null,
                            arrangement: quest.procedural?.arrangement ?? null,
                            variantId: quest.procedural?.variantId ?? null, components: quest.procedural?.components ?? null,
                            structure: isRichQuest(quest) ? structuralSignature(quest) : null,
                            objectiveTypes: quest.objectives.map(objective => objective.type),
                            skills: (quest.actions || []).filter(action => action.skillId).map(action => action.skillId),
                            distance: quest.distanceTiles ?? null,
                            worldEffectOpportunity: Boolean(quest.resolutions?.some(choice => choice.effects?.some(effect => ['merchant_stock', 'target_cleared'].includes(effect.type)))),
                            factionOpportunity: Boolean(quest.resolutions?.some(choice => choice.effects?.some(effect => effect.type === 'faction'))) })) });
                }
                worlds.push({ order, level, seed: worldSeed, towns, combatBindingTrace, eligibleFeatures: world.worldMetadata.features.filter(feature =>
                    feature.type === 'dungeon' || (feature.type === 'poi' && feature.resolvedType === 'dungeon')).length });
            }
            process.stderr.write(`Unified census: ${order}, level ${level}, ${worldCount} worlds complete\n`);
        }
    }
    const summaries = ['ascending', 'descending'].flatMap(order => [1, 5, 10].map(level => {
        const selected = worlds.filter(world => world.level === level && world.order === order);
        const towns = selected.flatMap(world => world.towns);
        const offers = towns.flatMap(town => town.offers);
        const procedural = offers.filter(quest => quest.arrangement);
        const structureCounts = frequency(procedural.map(quest => quest.structure));
        const sortedCounts = Object.values(structureCounts).sort((a, b) => b - a);
        return { order, level, worlds: selected.length, settlements: towns.length, offers: offers.length,
            proceduralOffers: procedural.length,
            composedOffers: procedural.filter(quest => quest.components).length,
            generatedComponentAssignments: frequency(procedural.filter(quest => quest.components)
                .map(quest => JSON.stringify(quest.components))),
            structures: structureCounts, distinctStructures: sortedCounts.length,
            mostCommonStructureShare: sortedCounts[0] / procedural.length,
            topThreeStructureShare: sortedCounts.slice(0, 3).reduce((a, b) => a + b, 0) / procedural.length,
            skillsOffered: frequency(procedural.flatMap(quest => quest.skills)),
            combatOpportunityOffers: procedural.filter(quest => quest.objectiveTypes.includes('defeat_encounter')).length,
            mixedRecoveryCombatOffers: procedural.filter(quest => quest.objectiveTypes.includes('defeat_encounter') && quest.objectiveTypes.includes('retrieve')).length,
            consecutiveStructureRepeats: selected.reduce((count, world) => {
                const signatures = world.towns.flatMap(town => town.offers.filter(quest => quest.structure).map(quest => quest.structure));
                return count + signatures.filter((signature, i) => i > 0 && signature === signatures[i - 1]).length;
            }, 0),
            firstFiveDistinctStructures: quantiles(selected.map(world => new Set(world.towns
                .flatMap(town => town.offers.filter(quest => quest.structure).map(quest => quest.structure)).slice(0, 5)).size)),
            fallbackInvestigations: offers.filter(quest => quest.type === 'investigate' && !quest.arrangement).length,
            worldEffectOpportunities: procedural.filter(quest => quest.worldEffectOpportunity).length,
            factionOpportunities: procedural.filter(quest => quest.factionOpportunity).length,
            eligibleBeforeEntry: towns.filter(town => town.localHooksBefore || town.nearbyCandidateBefore).length,
            zeroOfferBoards: towns.filter(town => !town.offers.length).length,
            variants: Object.fromEntries([...new Set(procedural.map(quest => quest.variantId))].sort()
                .map(variant => [variant, procedural.filter(quest => quest.variantId === variant).length])),
            arrangements: Object.fromEntries([...new Set(procedural.map(quest => quest.arrangement))].sort()
                .map(arrangement => [arrangement, procedural.filter(quest => quest.arrangement === arrangement).length])),
            proceduralDistance: quantiles(procedural.map(quest => quest.distance)),
            boardOffers: quantiles(towns.map(town => town.offers.length)),
            proceduralCoverage: worldInterval(selected.map(world => world.towns.filter(town => town.offers.some(quest => quest.arrangement)).length / world.towns.length)),
            worldEffectCoverage: worldInterval(selected.map(world => world.towns.filter(town => town.offers.some(quest => quest.worldEffectOpportunity)).length / world.towns.length)),
            supportedSiteQuestCoverage: worldInterval(selected.map(world => world.towns
                .filter(town => town.offers.some(quest => quest.structure || quest.type === 'investigate')).length / world.towns.length)),
            investigationCoverage: worldInterval(selected.map(world => world.towns.filter(town => town.offers.some(quest => quest.type === 'investigate')).length / world.towns.length)) };
    }));
    const rows = worlds.filter(world => world.level === 1 && world.order === 'ascending').flatMap(world => world.towns.map(town => ({ seed: world.seed, ...town })));
    const offered = rows.filter(town => town.offers.some(quest => quest.arrangement))
        .sort((a, b) => a.offers.find(quest => quest.arrangement).distance - b.offers.find(quest => quest.arrangement).distance);
    const traces = [offered[Math.floor(offered.length / 2)], rows.find(town => !town.offers.some(quest => quest.arrangement)), offered.at(-1)].filter(Boolean);
    const output = { methodology: `${worldCount} independent seeded small nexus-verge worlds, paired level 1/5/10 projections and two coordinate visit orders; real loaded DungeonGenerator/DungeonManager capabilities and one actual boss-layout binding per world-level-order where available. Real WorldGenerator/NPCGenerator/QuestGenerator/SettlementManager publication and pendingBind consumption; all offers retained available. Synthetic coordinate-sorted visits, no walking, encounters, acceptance, completion, reward receipts or renewals. World intervals use independent world fractions; towns are not independent trials. No combat win rates. Fixed seeds and policy characterize this sampled distribution only.`,
        authored, structureDefinitions, exactSkills: exactSkillChecks(), playedJourneys: 0, campaignId, worldCount,
        config: { proceduralCore: RULES.quests.proceduralCore, questSlotBudget: RULES.quests.questSlotBudget },
        simultaneousDuplicateIncidents: 0, summaries, traces, worlds };
    fs.writeFileSync(new URL('./unified-quest-audit.results.json', import.meta.url), `${JSON.stringify(output)}\n`);
    oldLog(JSON.stringify({ summaries, traces }, null, 2));
} finally {
    console.log = oldLog;
    console.warn = oldWarn;
    RULES.worldGen.campaignOverrides = oldOverrides;
}
