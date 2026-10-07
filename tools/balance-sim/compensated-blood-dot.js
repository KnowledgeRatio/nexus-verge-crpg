/**
 * Actual compensated damage simulation, no copied combat formula.
 * Imports the edited production CombatManager, Character and monster factory.
 * Enables the normally-OFF fork deliberately; precision100/0 is the fair control.
 * Runtime wrappers observe resolver/scheduler/condition removal without calculating damage.
 * Shared melee chassis across three Calling HP/proficiency profiles, one attack/action;
 * real monster multiattack and target-start processing. No Extra Attack or invented kits.
 * Test-only semantic-role RNG overrides Math.random; live combat RNG remains untouched.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const structuredClone = globalThis.structuredClone;
const testedSourceHashes = Object.fromEntries(['src/core/rulesEngine.js','src/systems/CombatManager.js','src/systems/Character.js','src/systems/EffectDispatcher.js','src/systems/DamageResolver.js','src/utils/damagePrecision.js'].map(file => [file,createHash('sha256').update(readFileSync(path.join(root,file))).digest('hex')]));
const read = p => JSON.parse(readFileSync(path.join(root, p), 'utf8'));
const realLog = console.log.bind(console); console.log = () => {};
globalThis.Audio = function() {
    return { play: () => Promise.resolve(), pause() {}, addEventListener() {}, volume: 1 };
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
const { RULES } = await import('../../src/core/rulesEngine.js');
const { Character } = await import('../../src/systems/Character.js');
const { CombatManager, Combatant, applyDamage } = await import('../../src/systems/CombatManager.js');
const { createEnemyFromMonster } = await import('../../src/systems/EncounterBuilder.js');
const { gameState } = await import('../../src/core/GameState.js');
assert.ok(RULES.combat.damageOverTime, 'Real feature fork config required; no fallback simulation');
assert.equal(typeof CombatManager.prototype.applyWeaponDamage, 'function');
assert.equal(typeof CombatManager.prototype.processPeriodicDamage, 'function');
const items = read('data/items.json'); const monsters = read('data/monsters.json').monsters;
const callings = read('data/classes.json').classes;
const mastery = read('data/weaponMasteries.json');
const originalMessage = gameState.addMessage.bind(gameState);
const TRIALS = Number(process.env.DOT_TRIALS || 300);
const CANDIDATES = [
    { name:'instant100',total:1,split:1 }, { name:'old80_20',total:1,split:.8 },
    { name:'premium70_70',total:1.4,split:.5 }, { name:'premium80_60',total:1.4,split:4 / 7 },
    { name:'premium84_56',total:1.4,split:.6 }, { name:'premium80_40',total:1.2,split:2 / 3 },
    { name:'instant140',total:1.4,split:1 }
]; const SCALE = RULES.combat.damageOverTime.unitsPerHP;
if (process.env.DOT_CANDIDATES){
    const selected = new Set(process.env.DOT_CANDIDATES.split(','));
    for (let index = CANDIDATES.length - 1;index >= 0;index--){
        if (!selected.has(CANDIDATES[index].name)){
            CANDIDATES.splice(index,1);
        }
    }
    assert.ok(CANDIDATES.length,'At least one candidate must be selected');
}
const SHORT = { 1: 'goblin', 5: 'gnoll', 10: 'bugbear' };
const DURABLE = { 1: 'gnoll', 5: 'ogre', 10: 'veteran' };
const ROUND_CAP = 30; const OUT = path.resolve(root, process.env.DOT_OUTPUT || 'tools/balance-sim/results-compensated');
mkdirSync(OUT, { recursive: true });
function hash(text) {
    let h = 2166136261; for (const c of text) {
        h ^= c.charCodeAt(0); h = Math.imul(h,16777619);
    } return h >>> 0;
}
function rng(seed) {
    return () => {
        let v = seed += 0x6D2B79F5; v = Math.imul(v ^ v >>> 15,v | 1); v ^= v + Math.imul(v ^ v >>> 7,v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296;
    };
}
function near(a,b,message) {
    assert.ok(Math.abs(a - b) <= 1 / SCALE + 1e-9, `${message}: ${a} != ${b}`);
}
function confidence(wins,n) {
    const p = wins / n,half = 1.96 * Math.sqrt(p * (1 - p) / n);return [Math.max(0,p - half),Math.min(1,p + half)];
}
function character(level,weapon,id,callingId = 'dedication') {
    const c = new Character({ id,name:id,level,class:callings.find(calling => calling.id === callingId),background:{},species:{},
        baseAbilities:{ prowess:{ 1:15,5:17,10:19 }[level],resilience:15,intuition:13,intellect:10,presence:10,composure:10 },
        equipment:{ mainHand:structuredClone(items.weapons.find(w => w.id === weapon)),offHand:null,armor:structuredClone(items.armor.find(a => a.id === { 1:'ringMail',5:'chainMail',10:'plateMail' }[level])) } }); c.companionMeta = { isDowned:false }; return c;
}
function pending(target) {
    const result = [];
    for (const condition of target.conditions) {
        for (const q of condition.periodicDamage?.tranches || []) {
            const units = q.ticksUnits.slice(q.cursor).reduce((a,b) => a + b,0);
            if (units) {
                result.push({ sourceId:q.sourceId,raw:units / SCALE });
            }
        }
    }
    return result;
}
function sideOf(cm,id) {
    return cm.combatants.find(c => c.id === id)?.team === 'enemy' ? 'enemy' : 'player';
}
function initialize(scenario,split,trial) {
    const seedKey = `${JSON.stringify({ level:scenario.level,calling:scenario.calling,weapon:scenario.weapon,profile:scenario.profile,party:scenario.party,defense:scenario.defense,state:scenario.state })  }:${  trial}`;
    Math.random = rng(hash(`${seedKey}:construct`));
    RULES.attributes.system = 'NVSystem'; RULES.combat.damageOverTime.enabled = scenario.mode !== 'legacy';
    RULES.combat.damageOverTime.immediateFraction = split; RULES.combat.damageReductionSystem.enabled = scenario.defense !== 'off';
    RULES.combat.damageOverTime.totalMultiplier = scenario.total ?? 1;
    const cm = new CombatManager(); const pcChar = character(scenario.level,scenario.weapon,'player',scenario.calling);const pc = new Combatant(pcChar,'player','pc');
    const companions = scenario.party === 2 ? [new Combatant(character(scenario.level,scenario.weapon,'ally',scenario.calling),'companion','ally')] : [];
    if (scenario.weaponType){
        for (const c of [pc,...companions]){
            c.character.equipment.mainHand.damageType = scenario.weaponType;
        }
    }
    companions.forEach(c => {
        c.sourceCharacter = c.character;
    });
    const monsterId = (scenario.profile === 'short' ? SHORT : DURABLE)[scenario.level];
    const enemies = Array.from({ length:scenario.party },(_,i) => new Combatant(createEnemyFromMonster(monsters.find(m => m.id === monsterId),{ worldConfig:{ difficulty:'normal',useAverageMonsterHP:true } }),'enemy',`enemy${i}`));
    for (const target of enemies) {
        if (scenario.defense === 'resistant') {
            target.damageResistances = ['blood'];
        }
        if (scenario.defense === 'vulnerable') {
            target.damageVulnerabilities = ['blood'];
        }
        if (scenario.defense === 'immune') {
            target.damageImmunities = ['blood'];
        }
    }
    cm.combatants = [pc,...companions,...enemies];cm.playerCombatant = pc;cm.enemyCombatants = enemies;cm.companionCombatants = companions;
    cm.combatants.forEach(c => {
        c.combatManager = cm;
    });cm.coverType = null;cm.coverWinner = null;
    if (scenario.state === 'halfHP'){
        for (const c of [pc,...companions]){
            c.hp = Math.floor(c.hp / 2);c.character.currentHP = c.hp;
        }
    }
    if (scenario.concentration){
        pc.concentratingOn = { abilityId:'simulationConcentration' };
    }
    cm.weaponMasteryAssignments = mastery.weaponMasteries?.weaponMasteryAssignments?.assignments || cm.weaponMasteryAssignments;
    cm.weaponMasteryProficiencyRequired = mastery.weaponMasteries?.proficiencyRequirement?.enabled ?? true;cm.weaponMasteryDataLoaded = true;
    gameState.data.ui.messageLog = [];gameState.data.items = items.weapons;gameState.data.fatigue = { current:0,exhaustionLevels:0 };gameState.set('character',pcChar);gameState.set('seed','fractional-dot-tests');
    cm.active = true;cm.round = 0;cm.rollInitiative();return { cm,pc,companions,enemies,monsterId,seedKey };
}
function deterministicFixtures() {
    const records = [];
    const base = { level:1,weapon:'longsword',profile:'short',party:2,defense:'off',mode:'fractional',cohort:'resolverFixture' };
    function fixture(name,fn) {
        gameState.addMessage = originalMessage;const state = initialize(base,.8,0);
        for (const target of state.enemies){
            target.hp = 100;target.maxHP = 100;target.character.currentHP = 100;target.character.maxHP = 100;
        }
        const observed = fn(state);records.push({ name,passed:true,observed });
    }
    for (const raw of [1,2]) {
        for (const defense of ['off','normal','resistant','vulnerable','immune']){
            fixture(`raw${raw}-${defense}`,({ cm,pc,enemies }) => {
                const target = enemies[0];RULES.combat.damageReductionSystem.enabled = defense !== 'off';
                if (defense === 'resistant'){
                    target.damageResistances = ['blood'];
                }
                if (defense === 'vulnerable'){
                    target.damageVulnerabilities = ['blood'];
                }
                if (defense === 'immune'){
                    target.damageImmunities = ['blood'];
                }
                const result = cm.applyWeaponDamage(pc,target,raw,'blood');near(result.immediate + result.deferred,raw,'fixture raw conservation');
                if (defense !== 'immune'){
                    assert.ok(cm.getPendingDamage(target).totalPending > 0,'tiny nonimmune hit must bleed');
                }
                const ticks = [];for (let i = 0;i < 3;i++){
                    const before = target.hp;cm.processPeriodicDamage(target);ticks.push(before - target.hp);
                }
                const delivered = 100 - target.hp;const multiplier = defense === 'resistant' ? .5 : defense === 'vulnerable' ? 2 : defense === 'immune' ? 0 : 1;
                assert.ok(Math.abs(delivered - raw * multiplier) <= .002 + 1e-9,'documented fixed-unit event quantization');
                near(cm.getPendingDamage(target).totalPending,0,'fixture expired queue');
                return { raw,immediate:result.immediate,deferred:result.deferred,suppressed:result.suppressedDeferred,ticks,delivered,exactMitigated:raw * multiplier };
            });
        }
    }
    fixture('three-independent-tranches-conserve-schedule',({ cm,pc,enemies }) => {
        RULES.combat.damageOverTime.immediateFraction = .5;const target = enemies[0],ticks = [];
        for (let i = 0;i < 5;i++){
            if (i < 3){
                cm.applyWeaponDamage(pc,target,12,'blood');
            } const before = target.hp;cm.processPeriodicDamage(target);ticks.push(before - target.hp);
        }
        assert.deepEqual(ticks,[2,4,6,4,2]);near(100 - target.hp,36,'three hit total');return { ticks,delivered:100 - target.hp };
    });
    fixture('cleanse-cancels-pending-without-accelerating',({ cm,pc,enemies }) => {
        const target = enemies[0];cm.applyWeaponDamage(pc,target,1,'blood');const afterImpact = target.hp,pendingBefore = cm.getPendingDamage(target).totalPending;
        target.removeCondition(RULES.combat.damageOverTime.conditionType);for (let i = 0;i < 3;i++){
            cm.processPeriodicDamage(target);
        }
        near(target.hp,afterImpact,'cleanse damage');near(cm.getPendingDamage(target).totalPending,0,'cleanse queue');return { pendingCancelled:pendingBefore,delivered:100 - target.hp };
    });
    fixture('condition-immunity-suppresses-deferred-no-conversion',({ cm,pc,enemies }) => {
        const target = enemies[0];target.character.conditionImmunities = ['bleeding'];const result = cm.applyWeaponDamage(pc,target,1,'blood');
        near(result.suppressedDeferred,.2,'condition immune cancellation');near(100 - target.hp,.8,'no instant fallback');return { delivered:100 - target.hp,suppressed:result.suppressedDeferred };
    });
    fixture('source-defeat-does-not-cancel-applied-tranche',({ cm,companions,enemies }) => {
        const source = companions[0],target = enemies[0];cm.applyWeaponDamage(source,target,1,'blood');source.hp = 0;cm.handleDefeat(source);
        assert.ok(cm.active);for (let i = 0;i < 3;i++){
            cm.processPeriodicDamage(target);
        }near(100 - target.hp,1,'source death persists');return { delivered:100 - target.hp,sourceDowned:source.isDowned };
    });
    fixture('target-defeat-cancels-own-pending',({ cm,pc,enemies }) => {
        const target = enemies[0];cm.applyWeaponDamage(pc,target,1,'blood');target.hp = 0;cm.handleDefeat(target);
        near(cm.getPendingDamage(target).totalPending,0,'defeated target cleared');assert.ok(cm.active);return { pendingAfterDefeat:cm.getPendingDamage(target).totalPending };
    });
    fixture('temporary-health-absorbs-fractional-impact-and-ticks',({ cm,pc,enemies }) => {
        const target = enemies[0];target.addCondition('tempHP','combat',pc.id,{ value:1,isBuff:true });cm.applyWeaponDamage(pc,target,1,'blood');
        for (let i = 0;i < 3;i++){
            cm.processPeriodicDamage(target);
        }near(target.hp,100,'temp HP exact absorption');return { hp:target.hp,tempHP:target.getCondition('tempHP')?.value || 0 };
    });
    fixture('healing-adds-fractions-consistently',({ enemies }) => {
        const target = enemies[0];applyDamage(target,1,'bone');target.heal(.333);near(target.hp,99.333,'fractional heal');return { hp:target.hp };
    });
    fixture('neutral-injury-retains-type-and-bypasses-resistance',({ enemies }) => {
        const target = enemies[0];RULES.combat.damageReductionSystem.enabled = true;target.damageResistances = ['injury'];const result = applyDamage(target,1,'injury');
        near(result.final,1,'neutral rule');return { final:result.final };
    });
    fixture('real-startTurn-lethal-tick-advances-once',({ cm,pc,companions,enemies }) => {
        const target = enemies[0];target.hp = .85;cm.applyWeaponDamage(pc,target,1,'blood');
        assert.ok(target.hp > 0);cm.turnOrder = [target,pc,...companions,enemies[1]];cm.currentTurnIndex = 0;cm.round = 1;
        cm.startTurn();assert.equal(target.hp,0);assert.equal(cm.getCurrentCombatant(),pc);assert.ok(cm.active);
        return { deadTargetHP:target.hp,nextActor:cm.getCurrentCombatant().id };
    });
    writeFileSync(path.join(OUT,'resolver-fixtures.json'),JSON.stringify({ unitsPerHP:SCALE,fixtures:records },null,2));
    realLog(`Actual resolver/lifecycle fixtures: ${records.length} passed`);return records;
}
async function fight(scenario,split,trial) {
    gameState.addMessage = originalMessage;
    const { cm,pc,companions,enemies,monsterId,seedKey } = initialize(scenario,split,trial);
    const stats = { rounds:0,playerAttacks:0,enemyTurns:0,enemyAttacks:0,playerRaw:0,enemyRaw:0,playerDeferred:0,enemyDeferred:0,
        playerScheduled:0,enemyScheduled:0,playerSuppressed:0,enemySuppressed:0,playerTickRaw:0,enemyTickRaw:0,
        playerTickEffective:0,enemyTickEffective:0,playerCancelled:0,enemyCancelled:0,playerEligibleHits:0,enemyEligibleHits:0,
        playerZeroDeferred:0,enemyZeroDeferred:0,playerImpactEffective:0,enemyImpactEffective:0,immediateKills:0,tickKills:0,
        rawPotentialImmediateFinishers:0,playerOverkill:0,enemyOverkill:0,timeoutCount:0 };
    const trace = [];let outcome = null,attackIndex = 0,currentSource = null,phase = 'impact';
    gameState.addMessage = (message,type) => {
        if (/roll|miss|Damage:|Critical hit|uses Multiattack/i.test(String(message))){
            trace.push(`R${cm.round} ${message}`);
        } return originalMessage(message,type);
    };
    const originalEnd = cm.endCombat.bind(cm);cm.endCombat = result => {
        outcome = result;return originalEnd(result);
    };
    for (const target of cm.combatants) {
        const originalRemove = target.removeCondition.bind(target);
        target.removeCondition = (...args) => {
            const before = pending(target);const result = originalRemove(...args);const after = pending(target);
            const bySource = new Map();for (const p of before){
                bySource.set(p.sourceId,(bySource.get(p.sourceId) || 0) + p.raw);
            }
            for (const p of after){
                bySource.set(p.sourceId,(bySource.get(p.sourceId) || 0) - p.raw);
            }
            for (const [source,raw] of bySource) {
                if (raw > 0){
                    stats[`${sideOf(cm,source)}Cancelled`] += raw;
                }
            }
            return result;
        };
        const originalTake = target.takeDamage.bind(target);
        target.takeDamage = amount => {
            const before = target.hp;const result = originalTake(amount);const effective = before - target.hp;
            if (phase !== 'tick') {
                const side = currentSource?.team === 'enemy' ? 'enemy' : 'player';stats[`${side}ImpactEffective`] += effective;
                stats[`${side}Overkill`] += Math.max(0,amount - before);
                if (side === 'player' && before > 0 && target.hp === 0){
                    stats.immediateKills++;
                }
            }
            trace.push(`R${cm.round} ${phase} ${currentSource?.id || 'scheduler'}→${target.id} final${amount} HP${before}→${target.hp}`);
            return result;
        };
    }
    const originalWeapon = cm.applyWeaponDamage.bind(cm);
    cm.applyWeaponDamage = (source,target,raw,type,opts = {}) => {
        const prior = currentSource;currentSource = source;const before = target.hp;
        try {
            const effectiveSplit = source.team === 'enemy' && scenario.enemySplit !== undefined ? scenario.enemySplit : split;
            const previous = RULES.combat.damageOverTime.immediateFraction;RULES.combat.damageOverTime.immediateFraction = effectiveSplit;
            const previousTotal = RULES.combat.damageOverTime.totalMultiplier;
            if (source.team === 'enemy' && scenario.enemySplit !== undefined){
                RULES.combat.damageOverTime.totalMultiplier = 1;
            }
            let result;try {
                result = originalWeapon(source,target,raw,type,opts);
            } finally {
                RULES.combat.damageOverTime.immediateFraction = previous;
                RULES.combat.damageOverTime.totalMultiplier = previousTotal;
            }
            if (type === 'blood' && opts.eligible !== false && raw > 0) {
                const side = source.team === 'enemy' ? 'enemy' : 'player';stats[`${side}Raw`] += raw;stats[`${side}EligibleHits`]++;
                const deferred = result.deferred ?? 0,suppressed = result.suppressedDeferred ?? 0;
                stats[`${side}Deferred`] += deferred;stats[`${side}Suppressed`] += suppressed;stats[`${side}Scheduled`] += deferred - suppressed;
                if (deferred - suppressed <= 0){
                    stats[`${side}ZeroDeferred`]++;
                }
                if (scenario.mode !== 'legacy'){
                    near(raw * (source.team === 'enemy' && scenario.enemySplit !== undefined ? 1 : scenario.total ?? 1),(result.immediate ?? raw) + deferred,'landed amplified raw budget');
                }
                if (side === 'player' && raw >= before && (result.immediate ?? raw) < before){
                    stats.rawPotentialImmediateFinishers++;
                }
            }
            return result;
        } finally {
            currentSource = prior;
        }
    };
    const originalPeriodic = cm.processPeriodicDamage.bind(cm);
    cm.processPeriodicDamage = target => {
        const old = phase;phase = 'tick';const before = target.hp;
        try {
            const result = originalPeriodic(target);
            const finalBySide = { player:0,enemy:0 };
            for (const c of result?.components || []) {
                const side = sideOf(cm,c.sourceId);stats[`${side}TickRaw`] += c.raw;finalBySide[side] += c.final;
            }
            if (result?.final > 0) {
                for (const side of ['player','enemy']) {
                    const share = finalBySide[side] / result.final;stats[`${side}TickEffective`] += result.hpDamage * share;
                    stats[`${side}Overkill`] += Math.max(0,result.final - result.hpDamage - (result.tempHPUsed || 0)) * share;
                }
            }
            if (before > 0 && target.hp === 0 && target.team === 'enemy'){
                stats.tickKills++;
            }
            return result;
        } finally {
            phase = old;
        }
    };
    const actorTurns = new Map(cm.combatants.map(c => [c.id,0]));
    const originalStart = cm.startTurn.bind(cm);cm.startTurn = () => {
        const actor = cm.getCurrentCombatant();if (actor){
            actorTurns.set(actor.id,actorTurns.get(actor.id) + 1);
        }
        return originalStart();
    };
    const originalAttack = cm.attack.bind(cm);cm.attack = async (a,d,slot = 'mainHand',opts = {}) => {
        Math.random = rng(hash(`${seedKey}:turn${actorTurns.get(a.id)}:${a.id}:attack${attackIndex++}`));if (a.team !== 'enemy'){
            stats.playerAttacks++;
        }
        const prior = currentSource;currentSource = a;try {
            return await originalAttack(a,d,slot,opts);
        } finally {
            currentSource = prior;
        }
    };
    const originalMonster = cm.executeMonsterAttack.bind(cm);cm.executeMonsterAttack = async (a,d,action) => {
        Math.random = rng(hash(`${seedKey}:turn${actorTurns.get(a.id)}:${a.id}:attack${attackIndex++}`));stats.enemyAttacks++;
        const prior = currentSource;currentSource = a;try {
            return await originalMonster(a,d,action);
        } finally {
            currentSource = prior;
        }
    };
    function targetFor(actor) {
        const living = (actor.team === 'enemy' ? [pc,...companions] : enemies).filter(c => c.hp > 0);return living.sort((a,b) => a.hp - b.hp)[0] || null;
    }
    cm.round = 1;cm.currentTurnIndex = 0;cm.startTurn();
    let actionTurns = 0;
    while (cm.active && pc.hp > 0 && actionTurns < ROUND_CAP * cm.combatants.length) {
        const actor = cm.getCurrentCombatant();if (!actor || actor.hp <= 0) {
            break;
        }
        stats.rounds = Math.max(...actorTurns.values());if (stats.rounds > ROUND_CAP) {
            break;
        }
        attackIndex = 0;currentSource = null;const target = targetFor(actor);if (!target) {
            break;
        }
        actionTurns++;
        if (actor.team === 'enemy'){
            stats.enemyTurns++;await cm.executeMonsterActions(actor,target,actor.character.monsterActions);
        } else {
            await cm.attack(actor,target);
        }
        if (cm.active) {
            await cm.endTurn();
        }
    }
    const outstanding = { player:0,enemy:0 };for (const actor of cm.combatants) {
        for (const p of pending(actor)){
            outstanding[sideOf(cm,p.sourceId)] += p.raw;
        }
    }
    for (const side of ['player','enemy']){
        near(stats[`${side}Scheduled`],stats[`${side}TickRaw`] + stats[`${side}Cancelled`] + outstanding[side],`scheduled reconciliation ${side}`);
    }
    assert.ok(cm.combatants.every(c => Number.isFinite(c.hp) && c.hp >= 0));stats.timeoutCount = outcome ? 0 : 1;
    return { ...stats,playerPendingLost:stats.playerCancelled + outstanding.player,enemyPendingLost:stats.enemyCancelled + outstanding.enemy,
        won:outcome === 'victory',pcHP:pc.hp / pc.maxHP,partyHP:[pc,...companions].reduce((a,c) => a + c.hp,0) / [pc,...companions].reduce((a,c) => a + c.maxHP,0),monster:monsterId,trace };
}
async function cell(scenario,split) {
    const totals = {},trials = [];let wins = 0;
    for (let i = 0;i < TRIALS;i++){
        const r = await fight(scenario,split,i);trials.push(r);wins += Number(r.won);for (const [k,v] of Object.entries(r)) {
            if (typeof v === 'number'){
                totals[k] = (totals[k] || 0) + v;
            }
        }
    }
    const ordered = [...trials].sort((a,b) => a.rounds - b.rounds),winsOnly = ordered.filter(t => t.won),losses = ordered.filter(t => !t.won);
    return { ...scenario,split,trials:TRIALS,monster:trials[0].monster,winRate:wins / TRIALS,winCI95:confidence(wins,TRIALS),
        means:Object.fromEntries(Object.entries(totals).map(([k,v]) => [k,v / TRIALS])),
        playerZeroDeferredHitRate:totals.playerEligibleHits ? totals.playerZeroDeferred / totals.playerEligibleHits : 0,
        enemyZeroDeferredHitRate:totals.enemyEligibleHits ? totals.enemyZeroDeferred / totals.enemyEligibleHits : 0,
        achievedDeferredFraction:totals.playerRaw ? totals.playerDeferred / totals.playerRaw : 0,
        pairedOutcomes:trials.map(t => [Number(t.won),t.enemyTurns,t.rounds,t.partyHP,t.timeoutCount]),
        traces:{ medianWin:winsOnly[Math.floor(winsOnly.length / 2)]?.trace || null,loss:losses[0]?.trace || null,extreme:[...trials].sort((a,b) => b.partyHP - a.partyHP)[0].trace } };
}
const scenarios = [];
for (const level of [1,5,10]) {
    for (const calling of ['dedication','audacity','curiosity']) {
        for (const profile of ['short','durable']) {
            for (const party of [1,2]) {
                scenarios.push({ level,calling,weapon:calling === 'dedication' ? 'longsword' : 'dagger',profile,party,defense:'off',mode:'fractional',cohort:'main' });
            }
        }
    }
}
for (const level of [1,5,10]){
    for (const weaponType of ['blood','bone']){
        scenarios.push({ level,weapon:'longsword',weaponType,profile:'durable',party:1,defense:'off',mode:'fractional',enemySplit:1,cohort:'matchedType' });
    }
}
for (const level of [1,5,10]) {
    for (const weapon of ['longsword']) {
        for (const profile of ['short','durable']) {
            for (const defense of ['resistant','vulnerable','immune']){
                scenarios.push({ level,weapon,profile,party:1,defense,mode:'fractional',cohort:'defenseSensitivity' });
            }
            scenarios.push({ level,weapon,profile,party:1,defense:'off',mode:'fractional',enemySplit:1,cohort:'playerOnly' });
            scenarios.push({ level,weapon,profile,party:1,defense:'off',mode:'fractional',state:'halfHP',cohort:'halfHP' });
        }
    }
}
if (process.env.DOT_FOCUSED === '1') {
    const level = Number(process.env.DOT_FOCUS_LEVEL || 10);const selected = scenarios.filter(s => s.cohort === 'main' && s.level === level && s.weapon === 'longsword' && s.party === 2 && s.profile === 'durable');scenarios.splice(0,scenarios.length,...selected);
}
if (process.env.DOT_MATCHED === '1'){
    scenarios.splice(0,scenarios.length);
    for (const level of [1,5,10]){
        for (const profile of ['short','durable']){
            for (const weaponType of ['blood','bone']){
                scenarios.push({ level,weapon:'longsword',weaponType,profile,party:1,defense:'off',mode:'fractional',enemySplit:1,cohort:'matchedType' });
            }
        }
    }
}
const originalRandom = Math.random,originalFlag = RULES.combat.damageOverTime.enabled,originalFraction = RULES.combat.damageOverTime.immediateFraction,originalReduction = RULES.combat.damageReductionSystem.enabled,originalTotal = RULES.combat.damageOverTime.totalMultiplier;
const results = [];
try {
    deterministicFixtures();
    const concentrationResults = [];
    for (const candidate of CANDIDATES){
        let kept = 0;const diagnostics = [];
        for (let trial = 0;trial < TRIALS;trial++){
            const { cm,pc,enemies } = initialize({ level:5,weapon:'longsword',profile:'durable',party:2,defense:'off',mode:'fractional',total:candidate.total },candidate.split,trial);
            const target = enemies[0];target.hp = 100;target.maxHP = 100;target.concentratingOn = { abilityId:'fixture' };
            Math.random = rng(hash(`concentration:${trial}`));
            const trace = [];gameState.addMessage = message => {
                trace.push(String(message));
            };
            cm.applyWeaponDamage(pc,target,10,'blood');
            for (let tick = 0;tick < 3;tick++){
                cm.processPeriodicDamage(target);
            }
            if (target.concentratingOn){
                kept++;
            }
            diagnostics.push({ kept:!!target.concentratingOn,trace });
        }
        concentrationResults.push({ candidate:candidate.name,trials:TRIALS,maintainedRate:kept / TRIALS,CI95:confidence(kept,TRIALS),traces:{ maintained:diagnostics.find(d => d.kept)?.trace,broken:diagnostics.find(d => !d.kept)?.trace } });
    }
    writeFileSync(path.join(OUT,'concentration-fixtures.json'),JSON.stringify(concentrationResults,null,2));
    gameState.addMessage = originalMessage;
    assert.equal(typeof RULES.combat.damageOverTime.totalMultiplier,'number','Actual production total multiplier required');
    const expected = scenarios.length * CANDIDATES.length;realLog(`Real compensated engine: ${expected} cells × ${TRIALS}`);
    for (let i = 0;i < scenarios.length;i++) {
        for (const candidate of CANDIDATES){
            results.push(await cell({ ...scenarios[i],candidate:candidate.name,total:candidate.total },candidate.split));
        }
        if (i % 6 === 0){
            realLog(`Completed ${results.length}/${expected} cells`);
        }
    }
    writeFileSync(path.join(OUT,'compensated-blood-dot.json'),JSON.stringify({ testedSourceHashes,feature:'actual compensated weapon engine',unitsPerHP:SCALE,trials:TRIALS,cells:results,
        assumptions:['Production CombatManager resolver/scheduler imported directly; no copied combat math','Three Callings weapon-only chassis; not full Calling kit balance','One player attack/action intentionally, enemy authored multiattack','Average authored monster HP, normal difficulty, no cover','Constructed same-level companion; deterministic lowest-HP target policy','Test-only semantic RNG; not production seeding','No tactics, spells, consumables, Void monsters or Extra Attack; premium does not yet prove full build parity','Fractional100 control uses same precision; symmetric rule except playerOnly diagnostic'] },null,2));
    const csv = ['cohort,calling,level,weapon,profile,party,defense,candidate,total,split,winRate,ciLow,ciHigh,rounds,enemyTurns,partyHP,playerTickEffective,playerPendingLost,timeouts'];
    for (const r of results){
        csv.push([r.cohort,r.calling || 'dedication',r.level,r.weapon,r.profile,r.party,r.defense,r.candidate,r.total,r.split,r.winRate,...r.winCI95,r.means.rounds,r.means.enemyTurns,r.means.partyHP,r.means.playerTickEffective,r.means.playerPendingLost,r.means.timeoutCount * r.trials].join(','));
    }
    writeFileSync(path.join(OUT,'compensated-blood-dot.csv'),csv.join('\n'));
    realLog(`FINISHED ${results.length} cells × ${TRIALS} = ${results.length * TRIALS} fights; actual fork budget/HP checks passed.`);
} finally {
    Math.random = originalRandom;RULES.combat.damageOverTime.enabled = originalFlag;RULES.combat.damageOverTime.immediateFraction = originalFraction;RULES.combat.damageReductionSystem.enabled = originalReduction;RULES.combat.damageOverTime.totalMultiplier = originalTotal;gameState.addMessage = originalMessage;
}
