/** Remote provisioning coverage: real journeys from geographically chosen town fixtures. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { run,path } from './expedition-review.js';
import { getFatigueState,calcMovementFatigue } from '../../src/systems/FatigueManager.js';
import { RULES } from '../../src/core/rulesEngine.js';
import { gameState } from '../../src/core/GameState.js';
const structuredClone = globalThis.structuredClone;
const print = value => process.stdout.write(`${typeof value === 'string' ? value : JSON.stringify(value)}\n`);
const seeds = Number(process.env.COVERAGE_SEEDS || 5);
const towns = Number(process.env.COVERAGE_TOWNS || 3);
const levels = (process.env.COVERAGE_LEVELS || '1,5,10').split(',').map(Number);
assert.ok(seeds * towns * levels.length * 4 <= 360,'Consult sponsor before expanding beyond 360 runs');
const files = ['tools/balance-sim/wilderness-provisioning-coverage.js','tools/balance-sim/expedition-review.js','src/systems/WorldGenerator.js','src/systems/ProvisioningManager.js','src/systems/Player.js','src/systems/FatigueManager.js','src/systems/CombatManager.js','src/systems/RestManager.js','src/core/rulesEngine.js','data/provisioning.json'];
const hashes = () => Object.fromEntries(files.map(file => [file,createHash('sha256').update(fs.readFileSync(new URL(`../../${file}`,import.meta.url))).digest('hex')]));
const startHashes = hashes(),rows = [];
const functioning = world => world.worldMetadata.settlements.filter(town => !['hostile','rebuilding'].includes(town.hostileState?.phase));
const distance = (a,b) => Math.hypot(a.x - b.x,a.y - b.y);
function proportion(k,n) {
    if (!n) {
        return null;
    }
    const p = k / n,margin = 1.96 * Math.sqrt(p * (1 - p) / n),z = 1.96 ** 2,d = 1 + z / n;
    const center = (p + z / (2 * n)) / d,width = 1.96 * Math.sqrt(p * (1 - p) / n + z / (4 * n * n)) / d;
    return { k,n,p,margin,wald95:[Math.max(0,p - margin),Math.min(1,p + margin)],wilson95:[center - width,center + width] };
}
function describe(values) {
    const sorted = [...values].sort((a,b) => a - b);
    return { min:sorted[0],median:sorted[Math.floor(sorted.length / 2)],max:sorted.at(-1),mean:values.reduce((a,b) => a + b,0) / values.length };
}
for (let seed = 0;seed < seeds;seed++) {
    for (let departure = 0;departure < towns;departure++) {
        for (const level of levels) {
            for (const radius of [3,8]) {
                for (const gather of [false,true]) {
                    const observed = new Map();
                    const diagnostic = { departure:null,target:null,rejectedTowns:[],plannedMainMoves:0,onwardMainMoves:0,outwardMoves:0,detourMoves:0,outwardMovementFatigue:0,remoteMoves:0,maxTownDistance:0,turnback:null,access:[],sources:[],selectedDetours:[],sourceCount:0 };
                    let outward = false;
                    const observe = ({ world,player,steps }) => {
                        for (const feature of world.worldMetadata.features) {
                            if (!feature.provisioning || !['provisioning','sanctuary'].includes(feature.type) || !world.getCachedTile(feature.x,feature.y)?.explored) {
                                continue;
                            }
                            if (!observed.has(feature.id)) {
                                observed.set(feature.id,{ id:feature.id,x:feature.x,y:feature.y,type:feature.type,firstStep:steps,
                                    nearestTownStraightLine:Math.min(...functioning(world).map(town => distance(town,feature))),
                                    reasons:{},minOneWayPath:null,selected:0,attempted:0,gained:0 });
                            }
                        }
                    };
                    const hook = async () => {
                        outward = false;return true;
                    };
                    Object.assign(hook,{ standalone:true,detourBudget:radius * 2,campThreshold:30,lastCampThreshold:30,returnAfterTurnback:true,
                        async departureTown({ world,naturalTown,player,settlement }) {
                            const selected = [naturalTown],available = functioning(world).filter(town => town.id !== naturalTown.id);
                            while (selected.length <= departure && available.length) {
                                available.sort((a,b) => Math.min(...selected.map(town => distance(b,town))) - Math.min(...selected.map(town => distance(a,town))) || String(a.id).localeCompare(String(b.id)));
                                let accepted = null;
                                for (let candidateIndex = 0;candidateIndex < 5 && available.length;candidateIndex++) {
                                    const candidate = available.shift();
                                    player.x = candidate.x;player.y = candidate.y;
                                    gameState.set('player.position',{ x:player.x,y:player.y });
                                    gameState.set('world.currentLocation',{ x:player.x,y:player.y });
                                    await world.getTile(player.x,player.y);
                                    await settlement.enterSettlement();
                                    const publicTargets = (gameState.get('quests.available') || []).filter(offer => offer.settlementId === candidate.id && offer.dungeonHookId);
                                    for (const offer of publicTargets) {
                                        const [x,y] = offer.dungeonHookId.split(',').map(Number);
                                        if (await path(world,candidate,{ x,y })) {
                                            accepted = candidate;break;
                                        }
                                    }
                                    if (accepted) {
                                        break;
                                    }
                                    diagnostic.rejectedTowns.push({ id:candidate.id,x:candidate.x,y:candidate.y,reason:'noReachablePublishedQuestTarget' });
                                }
                                if (!accepted) {
                                    break;
                                }
                                selected.push(accepted);
                            }
                            assert.ok(selected[departure],'World must provide enough functioning town fixtures');
                            const town = selected[departure];
                            diagnostic.departure = { id:town.id,x:town.x,y:town.y,type:town.settlementType || town.type,fixtureRelocation:true,geographicIndex:departure };
                            return town;
                        },
                        async selectTarget({ offers,world,player,town,qm }) {
                            assert.ok(town.npcs?.some(npc => npc.role === 'merchant'),'Departure town must have actual merchant service');
                            assert.equal((await world.getTile(town.x,town.y)).feature?.type,'settlement');
                            diagnostic.sourceCount = world.worldMetadata.features.filter(feature => feature.provisioning).length;
                            const targets = offers.filter(offer => offer.settlementId === town.id && offer.dungeonHookId).map(offer => {
                                const [x,y] = offer.dungeonHookId.split(',').map(Number);return { offer,x,y };
                            }).sort((a,b) => distance(b,town) - distance(a,town));
                            for (const target of targets) {
                                const route = await path(world,player,target);
                                if (!route) {
                                    continue;
                                }
                                diagnostic.target = { offerId:target.offer.id,x:target.x,y:target.y };
                                diagnostic.plannedMainMoves = route.length;
                                qm.acceptQuest(target.offer.id,target.offer.questGiver?.npcId || target.offer.questGiverId);
                                outward = true;return { x:target.x,y:target.y };
                            }
                            return null;
                        },
                        async beforeStep({ step,world,pc,steps,events }) {
                            if (!outward) {
                                return true;
                            }
                            const tile = await world.getTile(step.x,step.y);
                            const terrain = world.terrainTypes.terrains.find(entry => entry.id === tile.terrain);
                            const cost = calcMovementFatigue(terrain?.movementCost || 1,pc),fatigue = getFatigueState();
                            const projected = fatigue.current + diagnostic.outwardMovementFatigue + 2 * cost - fatigue.supplies * RULES.fatigue.makeCampFatigueRecovery;
                            if (projected > 85) {
                                diagnostic.turnback = { steps,projected,...structuredClone(fatigue) };
                                outward = false;events.push({ event:'reserveTurnback',...diagnostic.turnback });return false;
                            }
                            diagnostic.outwardMovementFatigue += cost;
                            return true;
                        },
                        async afterStep(context) {
                            const { world,player,mainRoute } = context;
                            observe(context);
                            const nearest = Math.min(...functioning(world).map(town => distance(town,player)));
                            diagnostic.maxTownDistance = Math.max(diagnostic.maxTownDistance,nearest);
                            if (nearest >= 32) {
                                diagnostic.remoteMoves++;
                            }
                            if (outward) {
                                diagnostic.outwardMoves++;
                                if (mainRoute) {
                                    diagnostic.onwardMainMoves++;
                                }
                            }
                            if (!mainRoute) {
                                diagnostic.detourMoves++;
                            }
                        },
                        async chooseDetour(context) {
                            const { world,player,steps,inspected } = context;
                            observe(context);
                            const candidates = [...observed.values()].filter(source => distance(source,player) <= 8).sort((a,b) => distance(a,player) - distance(b,player));
                            for (const source of candidates) {
                                const feature = world.worldMetadata.features.find(entry => entry.id === source.id);
                                const reject = reason => source.reasons[reason] = (source.reasons[reason] || 0) + 1;
                                if (feature.provisioning.attempt || inspected.has(source.id)) {
                                    reject('spentOrInspected');continue;
                                }
                                if (getFatigueState().supplies >= RULES.fatigue.suppliesMaxCarry) {
                                    reject('fullCapacity');continue;
                                }
                                const route = await path(world,player,source);
                                if (!route) {
                                    reject('noTraversablePath');continue;
                                }
                                source.minOneWayPath = Math.min(source.minOneWayPath ?? Infinity,route.length);
                                if (route.length > radius) {
                                    reject('outsideDetourBudget');continue;
                                }
                                source.selected++;
                                diagnostic.selectedDetours.push({ id:source.id,steps,outward,oneWayMoves:route.length,supplies:getFatigueState().supplies,fatigue:getFatigueState().current });
                                return feature;
                            }
                            return null;
                        },
                        async onProvision({ world,player,feature,result,steps }) {
                            const source = observed.get(feature.id);
                            if (source) {
                                source.attempted++;source.gained += result.suppliesRestored;
                            }
                            const nearest = functioning(world).sort((a,b) => distance(a,player) - distance(b,player)).slice(0,3);
                            const routes = await Promise.all(nearest.map(town => path(world,player,town)));
                            diagnostic.access.push({ id:feature.id,steps,outward,result,nearestTownStraightLine:distance(player,nearest[0]),shortestOfThreeTownRoutes:Math.min(...routes.filter(Boolean).map(route => route.length)) });
                        }
                    });
                    const row = await run(`wilderness-remote-${seed}`,level,true,0,gather ? 'local' : 'noProvision',hook);
                    diagnostic.sources = [...observed.values()];
                    row.gather = gather;row.radius = radius;row.departure = departure;row.coverage = diagnostic;
                    row.suppliesSpentAtCamp = row.camps;
                    row.suppliesSpentAtReturnInn = row.events.filter(event => event.event === 'inn').reduce((sum,event) => sum + Math.max(0,event.before.supplies - event.after.supplies),0);
                    rows.push(row);
                    print(`seed${seed} town${departure} L${level} r${radius} gather=${gather} target=${row.reachedTarget} return=${row.success} main=${diagnostic.onwardMainMoves}/${diagnostic.plannedMainMoves} seen=${observed.size} attempts=${row.attempts} gains=${row.suppliesEarned}`);
                }
            }
        }
    }
}
const cells = levels.flatMap(level => [3,8].flatMap(radius => [false,true].map(gather => {
    const configured = rows.filter(row => row.level === level && row.radius === radius && row.gather === gather);
    const sample = configured.filter(row => row.coverage.target),fights = sample.flatMap(row => row.combats);
    const wins = fights.filter(fight => fight.outcome === 'victory').sort((a,b) => a.rounds - b.rounds),losses = fights.filter(fight => fight.outcome !== 'victory').sort((a,b) => a.rounds - b.rounds);
    return { level,radius,gather,n:sample.length,noPublicTarget:configured.length - sample.length,returnRate:proportion(sample.filter(row => row.success).length,sample.length),targetRate:proportion(sample.filter(row => row.reachedTarget).length,sample.length),combatWinRate:proportion(wins.length,fights.length),
        onwardMainMoves:describe(sample.map(row => row.coverage.onwardMainMoves)),detourMoves:describe(sample.map(row => row.coverage.detourMoves)),remoteMoves:describe(sample.map(row => row.coverage.remoteMoves)),gains:sample.reduce((sum,row) => sum + row.suppliesEarned,0),
        traces:{ medianWin:wins[Math.floor(wins.length / 2)] || null,loss:losses[Math.floor(losses.length / 2)] || null,extreme:[...fights].sort((a,b) => Math.abs(b.margin) - Math.abs(a.margin))[0] || null } };
})));
const geometry = rows.filter(row => !row.gather).map(row => ({ seed:row.seed,departure:row.departure,level:row.level,radius:row.radius,
    town:row.coverage.departure,target:row.coverage.target,seen:row.coverage.sources.map(source => source.id),reachableUnderPolicy:row.coverage.selectedDetours.map(source => source.id),mainMoves:row.coverage.onwardMainMoves,plannedMoves:row.coverage.plannedMainMoves }));
const worldSites = [...new Set(rows.map(row => row.seed))].map(seed => ({ seed,generated:rows.find(row => row.seed === seed).coverage.sourceCount,
    seen:[...new Set(rows.filter(row => row.seed === seed).flatMap(row => row.coverage.sources.map(source => source.id)))],
    attempted:[...new Set(rows.filter(row => row.seed === seed).flatMap(row => row.coverage.access.map(source => source.id)))] }));
const comparisons = cells.filter(cell => cell.gather).map(cell => {
    const declined = cells.find(other => other.level === cell.level && other.radius === cell.radius && !other.gather);
    const delta = cell.returnRate.p - declined.returnRate.p;
    return { level:cell.level,radius:cell.radius,returnDelta:delta,statisticallyDistinguishable:Math.abs(delta) > cell.returnRate.margin + declined.returnRate.margin };
});
const result = { methodology:'Bounded remote-journey diagnostic, not balance clearance. Actual engine, trained Dedication Knight snapshots validated through real progression UI; L1/5/10, one fixed trial, five reused small worlds, starter plus two geographically spread functioning towns. Town fixtures relocate full-health/full-supply characters BEFORE journeys, not played arrival or free recovery during journeys. Town selection uses maximum minimum geographic distance from already chosen towns; no source or biome data. Farthest reachable published quest target, no hidden provisioning navigation. A* terrain foresight; fog observation before source inspection. Only known standalone/revealed shelter sources considered for detours; compare <=3 versus <=8 actual one-way moves, with doubled return budgets. Declined policy visits but refuses gathering. Camp at30; turn back above projected85 fatigue after retracing all outward movement and spending remaining carried supplies. Future combat/skill costs remain uncertain. Main-route moves and detour moves recorded separately. Remote means >=32 straight-line tiles from every functioning settlement. Access logs additionally report shortest actual route among three geographically nearest towns, not guaranteed globally closest route. Real combat, rest, camp, gathering, merchants and inn recovery. No companions, other Callings, natural player navigation, dungeon completion or whole-campaign balance. Geometry observations across levels/policies are correlated routes, not independent worlds. Combat RNG shifts after additional gathering/detours; CI comparisons are descriptive, not causal. Per-world distinct site IDs prevent repeated trials becoming new exposure. Historical result artifacts are untouched.',seeds,towns,levels,rows,cells,geometry,worldSites,comparisons,startHashes,endHashes:hashes() };
result.changedFilesDuringRun = files.filter(file => startHashes[file] !== result.endHashes[file]);
result.departureSelection = 'Geographic max-min spread; each later departure checks at most five candidates per selected-town slot for a reachable public quest before source observation. Rejected towns are logged. Boarding candidate towns is fixture setup only; no travel or healing is claimed. No-public-target fixtures, if any, remain in raw rows but are excluded from outcome cells.';
const output = process.env.COVERAGE_OUTPUT || 'wilderness-provisioning-coverage.results.json';
fs.writeFileSync(new URL(`./${output}`,import.meta.url),JSON.stringify(result,null,2));
print({ worldSites,comparisons });
for (const cell of cells.filter(cell => cell.gather)) {
    for (const [kind,trace] of Object.entries(cell.traces)) {
        if (trace) {
            print(`TRACE L${cell.level} r${cell.radius} ${kind} ${trace.outcome}\n${trace.trace.join('\n')}`);
        }
    }
}
