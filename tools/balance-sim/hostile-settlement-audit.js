/** Reproducible conditional hostile-settlement combat audit; production math only. */
/* eslint-disable no-magic-numbers, max-len -- Fixed experimental matrix, PRNG and statistical constants. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const structuredClone = globalThis.structuredClone;
const read = file => JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'));
const print = console.log.bind(console);
console.log = console.warn = () => {};
globalThis.Audio = function() {
    return { play: () => Promise.resolve(), pause() {}, addEventListener() {} };
};
globalThis.window = { game: null, lootManager: null };
globalThis.setTimeout = (fn,delay) => {
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
const { buildEncounter } = await import('../../src/systems/EncounterBuilder.js');
const { gameState } = await import('../../src/core/GameState.js');
const { RULES } = await import('../../src/core/rulesEngine.js');
const templates = read('data/hostileSettlements.json').combat;
const classes = read('data/classes.json').classes;
const species = read('data/races.json').races.find(r => r.id === 'human');
const backgrounds = read('data/backgrounds.json').backgrounds;
const knight = read('data/kits.json').dedication.find(k => k.id === 'knight').preset;
const trials = Number(process.env.HOSTILE_COMBAT_TRIALS || 300);
const originalRandom = Math.random;
const rng = initial => {
    let seed = initial;
    return () => {
        let v = seed += 0x6D2B79F5; v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296;
    };
};
const quantiles = values => {
    const sorted = [...values].sort((a,b) => a - b);
    return Object.fromEntries([.05,.5,.95].map(q => [q, sorted[Math.floor(q * (sorted.length - 1))] ?? null]));
};
function ci(p,n) {
    const margin = 1.96 * Math.sqrt(p * (1 - p) / n);
    const z2 = 1.96 ** 2, d = 1 + z2 / n;
    const center = (p + z2 / (2 * n)) / d;
    const half = 1.96 * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / d;
    return { wald:[Math.max(0,p - margin),Math.min(1,p + margin)], waldMargin:margin,
        wilson:[Math.max(0,center - half),Math.min(1,center + half)], comparisonMargin:Math.max(p - center + half,center + half - p) };
}
async function character(calling,level,hpFraction) {
    const baseAbilities = structuredClone(calling === 'dedication' ? knight.abilitiesNVSystem
        : calling === 'curiosity' ? { prowess:8,resilience:14,intellect:15,intuition:12,composure:13,presence:10 }
            : { prowess:10,resilience:14,intellect:8,intuition:15,composure:12,presence:13 });
    const primary = { dedication:'prowess',curiosity:'intellect',audacity:'intuition' }[calling];
    for (let i = 1; i < level; i++) {
        baseAbilities[baseAbilities[primary] < 19 ? primary : 'resilience']++;
    }
    const pc = new Character({ id:'pc',name:calling,level,class:structuredClone(classes.find(c => c.id === calling)),
        species:structuredClone(species),background:structuredClone(backgrounds.find(b => b.id === (calling === 'curiosity' ? 'sage' : 'soldier'))),
        baseAbilities,fightingStyle:calling === 'dedication' ? knight.fightingStyle : undefined,
        skillChoices:calling === 'dedication' ? knight.skills : calling === 'curiosity' ? ['empathy','craft','finesse'] : ['finesse','craft','perception','empathy'],
        weaponMasteries:calling === 'dedication' ? knight.weaponMasteries : [] });
    await pc.applyStartingEquipment();
    pc.currentHP = Math.max(1,Math.floor(pc.maxHP * hpFraction));
    return pc;
}
async function encounter(level,template,trial,partySize = 1) {
    Math.random = rng(level * 100000 + trial + 31);
    return buildEncounter({ partyLevel:level,partySize,difficulty:RULES.hostileSettlements.liberationDifficulty,
        campaignId:'nexus-verge',monsterPool:template.monsterPoolsByTier.find(t => level <= t.maxLevel).monsterPool,
        rng:rng(level * 100000 + trial + 19),worldConfig:{ difficulty:'normal' } });
}
async function fight(calling,level,hpFraction,trial) {
    const template = templates[trial % templates.length];
    const enemies = await encounter(level,template,trial);
    Math.random = rng(level * 1000000 + trial + 701);
    const pc = await character(calling,level,hpFraction), cm = new CombatManager(), trace = [];
    gameState.data.fatigue = { current:0,exhaustionLevels:0 };
    gameState.set('character',pc); gameState.set('companions',[]);
    gameState.set('worldConfig',{ campaignId:'nexus-verge',difficulty:'normal' });
    gameState.addMessage = message => trace.push(`R${cm.round} ${String(message)}`);
    let outcome;
    cm.endCombat = result => {
        outcome = result; cm.active = false;
    };
    await cm.startCombat(pc,structuredClone(enemies.monsters));
    for (const actor of cm.combatants) {
        const take = actor.takeDamage.bind(actor);
        actor.takeDamage = amount => {
            const before = actor.hp, value = take(amount); trace.push(`R${cm.round} HP ${actor.name} ${before}->${actor.hp} damage=${amount}`); return value;
        };
    }
    let turns = 0;
    while (cm.active && cm.round <= 40 && turns++ < 500) {
        const actor = cm.getCurrentCombatant(); assert.ok(actor && actor.hp > 0);
        if (actor.team === 'enemy') {
            await cm.executeEnemyAI(actor);
        } else {
            const target = cm.enemyCombatants.filter(e => e.hp > 0).sort((a,b) => a.hp - b.hp)[0];
            if (!target) {
                break;
            }
            await cm.attack(actor,target);
        }
        assert.ok(cm.combatants.every(c => Number.isFinite(c.hp)));
        if (cm.active) {
            await cm.endTurn();
        }
    }
    const player = cm.playerCombatant, enemyFraction = cm.enemyCombatants.reduce((s,e) => s + e.hp,0) / cm.enemyCombatants.reduce((s,e) => s + e.maxHP,0);
    return { trial,template:template.id,enemies:enemies.monsters.map(m => m.monsterId),outcome:outcome || 'timeout',won:outcome === 'victory',
        rounds:cm.round,hpFraction:player.hp / player.maxHP,margin:player.hp / player.maxHP - enemyFraction,
        chassis:{ maxHP:player.maxHP,ac:player.ac,abilities:pc.abilities,equipment:Object.fromEntries(Object.entries(pc.equipment).map(([k,v]) => [k,v?.id || null])) },trace };
}
const coverage = [], cells = [];
try {
    for (const level of [1,5,10]) {
        for (const template of templates) {
            for (const partySize of [1,3]) {
                const runs = [], combinations = {};
                for (let trial = 0; trial < 500; trial++) {
                    const e = await encounter(level,template,trial,partySize);
                    const key = e.monsters.map(m => m.monsterId).sort().join('+');
                    combinations[key] = (combinations[key] || 0) + 1;
                    runs.push(e);
                }
                const budget = RULES.encounters.encounterXPThresholds[level][RULES.hostileSettlements.liberationDifficulty] * partySize;
                coverage.push({ level,template:template.id,partySize,trials:500,budget,adjustedXP:quantiles(runs.map(e => e.adjustedXP)),
                    budgetFill:quantiles(runs.map(e => e.adjustedXP / budget)),enemyCount:quantiles(runs.map(e => e.monsters.length)),combinations });
            }
        }
        for (const calling of ['dedication','curiosity','audacity']) {
            for (const hpFraction of [1,.5]) {
                const runs = [];
                for (let trial = 0; trial < trials; trial++) {
                    runs.push(await fight(calling,level,hpFraction,trial));
                }
                const wins = runs.filter(r => r.won).sort((a,b) => a.rounds - b.rounds), losses = runs.filter(r => !r.won).sort((a,b) => a.rounds - b.rounds);
                const p = wins.length / trials;
                const cell = { calling,level,initialHPFraction:hpFraction,trials,wins:wins.length,winRate:p,ci95:ci(p,trials),
                    rounds:quantiles(runs.map(r => r.rounds)),hpFraction:quantiles(runs.map(r => r.hpFraction)),winHPFraction:quantiles(wins.map(r => r.hpFraction)),
                    timeouts:runs.filter(r => r.outcome === 'timeout').length,chassis:runs[0].chassis,
                    traces:{ medianWin:wins[Math.floor(wins.length / 2)] || null,medianLoss:losses[Math.floor(losses.length / 2)] || null,
                        extremeMargin:[...runs].sort((a,b) => Math.abs(b.margin) - Math.abs(a.margin))[0] } };
                cells.push(cell); print(`${calling} L${level} initialHP=${hpFraction}: ${wins.length}/${trials}; 95% Wald ${cell.ci95.wald.map(x => (x * 100).toFixed(1)).join('-')}%; Wilson ${cell.ci95.wilson.map(x => (x * 100).toFixed(1)).join('-')}%; rounds=${JSON.stringify(cell.rounds)}`);
            }
        }
    }
} finally {
    Math.random = originalRandom;
}
const comparisons = cells.filter(c => c.initialHPFraction === 1).map(a => {
    const b = cells.find(c => c.level === a.level && c.calling === a.calling && c.initialHPFraction === .5);
    return { calling:a.calling,level:a.level,freshMinusHalfHP:a.winRate - b.winRate,
        sumMargins:a.ci95.comparisonMargin + b.ci95.comparisonMargin,
        distinguishable:Math.abs(a.winRate - b.winRate) > a.ci95.comparisonMargin + b.ci95.comparisonMargin };
});
const files = ['data/hostileSettlements.json','data/monsters.json','data/classes.json','data/kits.json','src/systems/CombatManager.js','src/systems/Character.js','src/systems/EncounterBuilder.js','src/core/rulesEngine.js'];
const hashes = Object.fromEntries(files.map(file => [file,createHash('sha256').update(readFileSync(new URL(`../../${file}`,import.meta.url))).digest('hex')]));
const results = { totalCombatTrials:trials * cells.length,encounterBuildTrials:coverage.length * 500,hashes,coverage,cells,comparisons,
    methodology:['Actual EncounterBuilder pools, XP budget, rolled spawn HP and CombatManager enemy AI/actions/multiattack, attack/initiative/masteries/damage and turn lifecycle.',
        'All three authored combat templates evenly cycle per combat cell; repeatable seeded encounter composition/spawn HP and paired combat RNG.',
        'Legal Knight preset; Curiosity/Audacity custom standard-array human with legal calling skill selections and normal starting equipment. Upper levels are conditional stat projections (authored identity stat to19 then Resilience), not a played progression. Actual attack and damage resolve to Prowess for every weapon, including finesse: projected Audacity Intuition increases defenses/initiative, not weapon damage.',
        'Solo weapon-only normal-action policy attacks lowest living enemy HP. No selected specialization, spells, tactics, healing, bonus-action abilities or companion policy: these are baseline vulnerability probes, not Calling/full-kit balance acceptance.',
        'Fresh and 50% HP; constructor ability resources available but unused. Fatigue/exhaustion excluded. Liberation has one combat, so this is not repeated combat attrition.',
        'Combat RNG replaced only in harness; production intentionally unseeded. Scheduler timers suppressed; real turns invoked serially. Postcombat rewards suppressed.',
        'Requested Wald CI supplied; Wilson additionally supplied because Wald degenerates at 0%/100%. Comparisons use sum of conservative Wilson margins.'] };
writeFileSync(new URL('./hostile-settlement-audit.results.json',import.meta.url),JSON.stringify(results,null,2));
for (const cell of cells.filter(c => c.initialHPFraction === 1)) {
    print(`TRACE ${cell.calling} L${cell.level}`);
    for (const [kind,run] of Object.entries(cell.traces)) {
        if (!run) {
            continue;
        }
        print(`${kind}: trial ${run.trial}, ${run.outcome}, enemies=${run.enemies.join('+')}, rounds=${run.rounds}, margin=${run.margin}`);
        for (const line of run.trace.filter(line => /roll|HP |Multiattack|miss|Critical/i.test(line))) {
            print(line);
        }
    }
}
