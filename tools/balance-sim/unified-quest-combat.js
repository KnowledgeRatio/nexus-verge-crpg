/** Conditional generated boss combat sample. Production combat math is imported. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const structuredClone = globalThis.structuredClone;
const read = file => JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'));
const log = console.log.bind(console);
console.log = console.warn = () => {};
globalThis.Audio = function() {
    return { play: () => Promise.resolve(), pause() {}, addEventListener() {} };
};
globalThis.window = { game: null, lootManager: null };
globalThis.setTimeout = (fn, delay) => {
    if (delay === 400) {
        fn();
    } return 0;
};
globalThis.fetch = async url => {
    try {
        const data = read(String(url).split('?')[0]); return { ok: true, json: async () => data };
    } catch {
        return { ok: false, json: async () => ({}) };
    }
};
const { Character } = await import('../../src/systems/Character.js');
const { CombatManager } = await import('../../src/systems/CombatManager.js');
const { DungeonGenerator } = await import('../../src/systems/DungeonGenerator.js');
const { DungeonManager } = await import('../../src/systems/DungeonManager.js');
const { buildBossEncounter } = await import('../../src/systems/EncounterBuilder.js');
const { gameState } = await import('../../src/core/GameState.js');
const { RULES } = await import('../../src/core/rulesEngine.js');
const trials = Number(process.env.QUEST_COMBAT_TRIALS || 500);
const calling = read('data/classes.json').classes.find(c => c.id === 'dedication');
const species = read('data/races.json').races.find(r => r.id === 'human');
const backgrounds = read('data/backgrounds.json').backgrounds;
const knight = read('data/kits.json').dedication.find(k => k.id === 'knight').preset;
const originalRandom = Math.random;
function rng(seed) {
    return () => {
        let v = seed += 0x6D2B79F5; v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296;
    };
}
function median(values) {
    const sorted = [...values].sort((a,b) => a - b); return sorted[Math.floor(sorted.length / 2)] ?? null;
}
function quantiles(values) {
    const sorted = [...values].sort((a,b) => a - b); return Object.fromEntries([.05,.5,.95].map(q => [q, sorted[Math.floor(q * (sorted.length - 1))]]));
}
function wilson(p,n) {
    const z = 1.96, z2 = z * z, denominator = 1 + z2 / n;
    const center = (p + z2 / (2 * n)) / denominator;
    const half = z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / denominator;
    return [Math.max(0,center - half),Math.min(1,center + half)];
}
async function character(build, level) {
    const baseAbilities = structuredClone(build === 'knight' ? knight.abilitiesNVSystem : { prowess:8, resilience:12, intellect:15, intuition:13, composure:14, presence:10 });
    // Conditional upper-level projection: every-level +1 player ASI, prioritizing identity stat then Resilience.
    for (let i = 1; i < level; i++) {
        const primary = build === 'knight' ? 'prowess' : 'intellect'; const key = baseAbilities[primary] < 19 ? primary : 'resilience'; baseAbilities[key]++;
    }
    const pc = new Character({ id:'pc', name:build, level, class:structuredClone(calling), species:structuredClone(species), background:structuredClone(backgrounds.find(b => b.id === (build === 'knight' ? knight.background : 'sage'))), baseAbilities,
        fightingStyle:'dueling', skillChoices:build === 'knight' ? knight.skills : ['perception','empathy'], weaponMasteries:knight.weaponMasteries });
    await pc.applyStartingEquipment(); return pc;
}
const generator = new DungeonGenerator('unified-quest-combat-2026-10-10');
await generator.loadData();
// All authored types are core-inherited for nexus-verge. Use first seeded eligible selection, never combat outcomes.
assert.ok(generator.dungeonTypes.every(t => t.campaignIds.includes('core') || t.campaignIds.includes('nexus-verge')));
const encounters = [];
gameState.set('worldConfig',{ campaignId:'nexus-verge', difficulty:'normal' });
for (const level of [1,5,10]) {
    const feature = { x:17, y:23, type:'dungeon' };
    const manager = new DungeonManager(generator, null);
    const anticipated = manager.getQuestDungeonType(feature);
    await generator.generateDungeon(feature, level);
    assert.equal(feature.dungeonTypeId, anticipated.id);
    manager.currentDungeon = feature;
    gameState.set('dungeon', { active:true, rooms:feature.rooms, dungeonTypeId:feature.dungeonTypeId });
    const bossId = manager.getDungeonBoss();
    Math.random = rng(1000 + level);
    const encounter = await buildBossEncounter({ dungeonTypeId:feature.dungeonTypeId, bossId, partyLevel:level, partySize:1, campaignId:'nexus-verge', rng:rng(2000 + level) });
    assert.equal(encounter.monsters[0].species.id, bossId);
    encounters.push({ level, seed:generator.seed, x:feature.x, y:feature.y, dungeonTypeId:feature.dungeonTypeId, bossId, encounter });
}
async function fight(build, cell, trial) {
    Math.random = rng(100000 * cell.level + trial + 700);
    const pc = await character(build, cell.level);
    const cm = new CombatManager(); const trace = [];
    gameState.data.ui.messageLog = [];
    gameState.data.fatigue = { current:0, exhaustionLevels:0 };
    gameState.set('character',pc);
    gameState.set('worldConfig',{ campaignId:'nexus-verge', difficulty:'normal' });
    gameState.addMessage = message => {
        trace.push(`R${cm.round} ${String(message)}`);
    };
    let outcome = null;
    // Observe termination without postcombat XP/loot/quest side effects; combat resolution untouched.
    cm.endCombat = result => {
        outcome = result; cm.active = false;
    };
    await cm.startCombat(pc, structuredClone(cell.encounter.monsters));
    const player = cm.playerCombatant;
    for (const actor of cm.combatants) {
        const take = actor.takeDamage.bind(actor);
        actor.takeDamage = amount => {
            const before = actor.hp; const value = take(amount); trace.push(`R${cm.round} HP ${actor.name} ${before}→${actor.hp} damage=${amount}`); return value;
        };
    }
    let turns = 0;
    while (cm.active && cm.round <= 40 && turns++ < 500) {
        const actor = cm.getCurrentCombatant();
        assert.ok(actor && actor.hp > 0, 'Scheduler must return living actor');
        if (actor.team === 'enemy') {
            await cm.executeEnemyAI(actor);
        } else {
            const target = cm.enemyCombatants.filter(e => e.hp > 0).sort((a,b) => a.hp - b.hp)[0];
            if (!target) {
                break;
            }
            await cm.attack(actor,target);
        }
        assert.ok(cm.combatants.every(c => Number.isFinite(c.hp)), 'Non-finite combat HP');
        if (cm.active) {
            await cm.endTurn();
        }
    }
    const enemyFraction = cm.enemyCombatants.reduce((sum,e) => sum + e.hp,0) / cm.enemyCombatants.reduce((sum,e) => sum + e.maxHP,0);
    return { trial, won:outcome === 'victory', outcome:outcome || 'timeout', rounds:cm.round, hp:player.hp, hpFraction:player.hp / player.maxHP, margin:player.hp / player.maxHP - enemyFraction,
        resolve:pc.resolvePoints, abilityUses:pc.abilityUses, maxHP:player.maxHP, ac:player.ac, abilities:pc.abilities, equipment:Object.fromEntries(Object.entries(pc.equipment).map(([k,v]) => [k,v?.id || null])), trace };
}
const cells = [];
try {
    for (const encounter of encounters) {
        for (const build of ['knight','sage']) {
            const runs = [];
            for (let trial = 0; trial < trials; trial++) {
                runs.push(await fight(build,encounter,trial));
            }
            const wins = runs.filter(r => r.won).sort((a,b) => a.rounds - b.rounds);
            const losses = runs.filter(r => !r.won).sort((a,b) => a.rounds - b.rounds);
            const p = wins.length / trials, margin = 1.96 * Math.sqrt(p * (1 - p) / trials);
            const wilsonCI95 = wilson(p,trials);
            const wilsonMargin = Math.max(p - wilsonCI95[0],wilsonCI95[1] - p);
            const selected = { medianWin:wins[Math.floor(wins.length / 2)] || null, medianLoss:losses[Math.floor(losses.length / 2)] || null, extremeMargin:[...runs].sort((a,b) => Math.abs(b.margin) - Math.abs(a.margin))[0] };
            const result = { build, level:encounter.level, bossId:encounter.bossId, dungeonTypeId:encounter.dungeonTypeId, trials, wins:wins.length, winRate:p, ci95:wilsonCI95, ciMethod:'Wilson', ciMargin:wilsonMargin,
                waldCI95:[Math.max(0,p - margin),Math.min(1,p + margin)], waldMargin:margin,
                medianRounds:median(runs.map(r => r.rounds)), medianHP:median(runs.map(r => r.hp)), medianHPFraction:median(runs.map(r => r.hpFraction)), medianResolve:median(runs.map(r => r.resolve)), timeouts:runs.filter(r => r.outcome === 'timeout').length,
                distributions:{ rounds:quantiles(runs.map(r => r.rounds)), hpFraction:quantiles(runs.map(r => r.hpFraction)), winRounds:quantiles(wins.map(r => r.rounds)), winHPFraction:quantiles(wins.map(r => r.hpFraction)), lossRounds:quantiles(losses.map(r => r.rounds)) },
                chassis:{ maxHP:runs[0].maxHP, ac:runs[0].ac, abilities:runs[0].abilities, equipment:runs[0].equipment }, traces:selected };
            cells.push(result); log(`${build} L${encounter.level}: ${wins.length}/${trials}; 95% CI ${result.ci95.map(x => (100 * x).toFixed(2)).join('–')}%; rounds ${result.medianRounds}, HP ${result.medianHP}`);
        }
    }
} finally {
    Math.random = originalRandom;
}
const comparisons = [1,5,10].map(level => {
    const [a,b] = cells.filter(c => c.level === level); return { level, knightMinusSage:a.winRate - b.winRate, sumMargins:a.ciMargin + b.ciMargin, distinguishable:Math.abs(a.winRate - b.winRate) >= a.ciMargin + b.ciMargin && a.winRate !== b.winRate };
});
const files = ['src/systems/CombatManager.js','src/core/rulesEngine.js','src/systems/Character.js','src/systems/DungeonGenerator.js','src/systems/DungeonManager.js','src/systems/EncounterBuilder.js','data/classes.json','data/kits.json','data/dungeonTypes.json','data/monsters.json'];
const hashes = Object.fromEntries(files.map(file => [file,createHash('sha256').update(readFileSync(new URL(`../../${file}`,import.meta.url))).digest('hex')]));
const results = { trialsPerCell:trials, totalTrials:trials * cells.length, hashes, productionDamageOverTime:RULES.combat.damageOverTime,
    methodology:['Actual DungeonGenerator seeded type/layout/boss, DungeonManager boss lookup, buildBossEncounter buffed boss and actual minions; same fixed encounter per level shared by both builds.',
        'Actual Character full constructor and applyStartingEquipment; legal Knight preset and custom standard-array Dedication with Sage background; both Varath species.',
        'Upper levels are conditional stat projections (+1 each player level, identity primary then Resilience), not played or UI-confirmed full progression. No specialization or picked traits.',
        'Weapon-only policy: one normal action attack, lowest-HP living enemy; real enemy AI and authored multiattack. Known Sap/Topple/Vex mastery flows are real engine dispatch.',
        'Full initial HP and constructor resources do NOT mean full combat policy: Steady Nerve healing/dodge, Action Surge, Resolve tactics, bonus attacks and consumables unused; no companions.',
        'Actual engine initiative, unseeded-production combat RNG replaced only in harness by repeatable per-trial PRNG. Timer-driven enemy AI suppressed and invoked serially; real endTurn/startTurn.',
        'Conditional isolated boss combat only, excluding travel, dungeon attrition, quest skill checks, encounter diversity, elite legacy kill-chief promotion and turn-in.',
        'Primary CI is Wilson 95%; requested Wald p±1.96sqrt(p(1-p)/n) retained separately and degenerates at 0/100%. Comparison uses sum of conservative Wilson half-margins.'],
    encounters:encounters.map(({ encounter,...meta }) => ({ ...meta, adjustedXP:encounter.adjustedXP, enemies:encounter.monsters.map(e => ({ id:e.species.id,name:e.name,maxHP:e.maxHP,ac:e.ac,isBoss:e.isBoss })) })), cells, comparisons };
writeFileSync(new URL('./unified-quest-combat.results.json', import.meta.url),JSON.stringify(results,null,2));
for (const cell of cells) {
    log(`TRACE ${cell.build} L${cell.level}`);
    for (const [kind,run] of Object.entries(cell.traces)) {
        if (!run) {
            continue;
        }
        log(`${kind}: trial ${run.trial}, ${run.outcome}, rounds=${run.rounds}, margin=${run.margin}`);
        const rounds = new Map();
        for (const line of run.trace.filter(line => /roll|Rolled Damage|damage roll|HP |ongoing effects|Multiattack|miss|Critical/i.test(line))) {
            const round = line.match(/^R\d+/)[0];
            rounds.set(round,[...(rounds.get(round) || []),line.replace(/^R\d+ /,'')]);
        }
        for (const [round,lines] of rounds) {
            log(`${round}: ${lines.join(' | ')}`);
        }
    }
}
