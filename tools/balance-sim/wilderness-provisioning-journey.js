/** Bounded paired journey diagnostic. Production rules are never changed. */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { run,path } from './expedition-review.js';
import { getFatigueState,calcMovementFatigue } from '../../src/systems/FatigueManager.js';
import { RULES } from '../../src/core/rulesEngine.js';
const structuredClone = globalThis.structuredClone;

const print = message => process.stdout.write(`${message}\n`);
const seeds = Number(process.env.WILDERNESS_SEEDS || 5);
const trials = Number(process.env.WILDERNESS_TRIALS || 2);
const rows = [];
const files = ['tools/balance-sim/wilderness-provisioning-journey.js','tools/balance-sim/expedition-review.js','src/systems/WorldGenerator.js','src/systems/ProvisioningManager.js','src/systems/Player.js','src/systems/FatigueManager.js','src/core/rulesEngine.js','data/provisioning.json'];
const hashes = () => Object.fromEntries(files.map(file => [file,createHash('sha256').update(fs.readFileSync(new URL(`../../${file}`,import.meta.url))).digest('hex')]));
const startHashes = hashes();
function rate(k,n) {
    if (!n) {
        return null;
    }
    const p = k / n,margin = 1.96 * Math.sqrt(p * (1 - p) / n);
    const d = 1 + 1.96 ** 2 / n,center = (p + 1.96 ** 2 / (2 * n)) / d;
    const width = 1.96 * Math.sqrt(p * (1 - p) / n + 1.96 ** 2 / (4 * n * n)) / d;
    return { k,n,p,margin,wald95:[Math.max(0,p - margin),Math.min(1,p + margin)],wilson95:[center - width,center + width] };
}
function distribution(values) {
    const sorted = [...values].sort((a,b) => a - b);
    return { mean:values.reduce((a,b) => a + b,0) / values.length,min:sorted[0],median:sorted[Math.floor(sorted.length / 2)],max:sorted.at(-1) };
}
for (let seed = 0;seed < seeds;seed++) {
    for (const level of [1,5,10]) {
        for (let trial = 0;trial < trials;trial++) {
            for (const trained of [false,true]) {
                for (const gather of [false,true]) {
                    const diagnostic = { selectedPublicTarget:null,plannedMoves:0,outwardSteps:0,outwardMovementFatigue:0,maxNearestTownStraightLine:0,remoteSteps:0,turnback:null,provisionAccess:[],generatedSites:null };
                    let outward = false;
                    const hook = async () => {
                        outward = false;return true;
                    };
                    Object.assign(hook,{ standalone:true,detourBudget:6,campThreshold:30,lastCampThreshold:30,returnAfterTurnback:true,
                        async selectTarget({ offers,world,player,town,pc,qm }) {
                            const targets = offers.filter(offer => offer.dungeonHookId).map(offer => {
                                const [x,y] = offer.dungeonHookId.split(',').map(Number);return { offer,x,y };
                            }).sort((a,b) => Math.hypot(b.x - town.x,b.y - town.y) - Math.hypot(a.x - town.x,a.y - town.y));
                            diagnostic.generatedSites = world.worldMetadata.features.filter(site => site.provisioning).length;
                            for (const target of targets) {
                                const route = await path(world,player,target);
                                if (!route) {
                                    continue;
                                }
                                diagnostic.selectedPublicTarget = { id:target.offer.id,x:target.x,y:target.y,level:pc.level };
                                diagnostic.plannedMoves = route.length;
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
                            const terrain = world.terrainTypes.terrains.find(t => t.id === tile.terrain);
                            const nextCost = calcMovementFatigue(terrain?.movementCost || 1,pc);
                            const fatigue = getFatigueState();
                            // Reserve enough fatigue capacity to retrace all outward moves. Detours
                            // count in full, making the estimate conservative for a shorter return.
                            const projected = fatigue.current + diagnostic.outwardMovementFatigue + 2 * nextCost - fatigue.supplies * RULES.fatigue.makeCampFatigueRecovery;
                            if (projected > 85) {
                                outward = false;diagnostic.turnback = { steps,projected,...structuredClone(fatigue) };
                                events.push({ event:'reserveTurnback',...diagnostic.turnback });return false;
                            }
                            diagnostic.outwardMovementFatigue += nextCost;
                            return true;
                        },
                        async afterStep({ world,player }) {
                            const towns = world.worldMetadata.settlements.filter(t => !['hostile','rebuilding'].includes(t.hostileState?.phase));
                            const nearest = Math.min(...towns.map(t => Math.hypot(player.x - t.x,player.y - t.y)));
                            diagnostic.maxNearestTownStraightLine = Math.max(diagnostic.maxNearestTownStraightLine,nearest);
                            if (nearest >= 32) {
                                diagnostic.remoteSteps++;
                            }
                            if (outward) {
                                diagnostic.outwardSteps++;
                            }
                        },
                        async onProvision({ world,player,feature,result }) {
                            const towns = world.worldMetadata.settlements.filter(t => !['hostile','rebuilding'].includes(t.hostileState?.phase))
                                .sort((a,b) => Math.hypot(player.x - a.x,player.y - a.y) - Math.hypot(player.x - b.x,player.y - b.y)).slice(0,3);
                            const routes = await Promise.all(towns.map(town => path(world,player,town)));
                            diagnostic.provisionAccess.push({ site:feature.id,x:player.x,y:player.y,outward,result,
                                nearestTownStraightLine:Math.hypot(player.x - towns[0].x,player.y - towns[0].y),
                                shortestOfThreeTownRoutes:Math.min(...routes.filter(Boolean).map(route => route.length)) });
                        }
                    });
                    const row = await run(`wilderness-remote-${seed}`,level,trained,trial,gather ? 'local' : 'noProvision',hook);
                    row.gather = gather;row.remoteDiagnostic = diagnostic;rows.push(row);
                    print(`seed${seed} L${level} t${trial} trained=${trained} gather=${gather} return=${row.success} outward=${diagnostic.outwardSteps}/${diagnostic.plannedMoves} remote=${diagnostic.remoteSteps} seen=${row.seenProvisionSites} attempts=${row.attempts} gains=${row.suppliesEarned}`);
                }
            }
        }
    }
}
const cells = [1,5,10].flatMap(level => [false,true].flatMap(trained => [false,true].map(gather => {
    const cell = rows.filter(row => row.level === level && row.trained === trained && row.gather === gather);
    const fights = cell.flatMap(row => row.combats),wins = fights.filter(fight => fight.outcome === 'victory').sort((a,b) => a.rounds - b.rounds);
    const losses = fights.filter(fight => fight.outcome !== 'victory').sort((a,b) => a.rounds - b.rounds);
    return { level,trained,gather,n:cell.length,returnRate:rate(cell.filter(row => row.success).length,cell.length),combatWinRate:rate(wins.length,fights.length),
        outwardSteps:distribution(cell.map(row => row.remoteDiagnostic.outwardSteps)),remoteSteps:distribution(cell.map(row => row.remoteDiagnostic.remoteSteps)),
        seen:distribution(cell.map(row => row.seenProvisionSites)),attempts:distribution(cell.map(row => row.attempts)),gains:distribution(cell.map(row => row.suppliesEarned)),
        traces:{ medianWin:wins[Math.floor(wins.length / 2)] || null,loss:losses[Math.floor(losses.length / 2)] || null,extreme:[...fights].sort((a,b) => Math.abs(b.margin) - Math.abs(a.margin))[0] || null } };
})));
const pairs = rows.filter(row => row.gather).map(row => {
    const declined = rows.find(other => !other.gather && other.seed === row.seed && other.level === row.level && other.trial === row.trial && other.trained === row.trained);
    return { seed:row.seed,level:row.level,trial:row.trial,trained:row.trained,gains:row.suppliesEarned,
        outwardDelta:row.remoteDiagnostic.outwardSteps - declined.remoteDiagnostic.outwardSteps,
        bothReturned:row.success && declined.success,returnWithGather:row.success,returnDeclined:declined.success,
        usefulExtension:row.success && row.remoteDiagnostic.outwardSteps > declined.remoteDiagnostic.outwardSteps };
});
const result = { methodology:'Bounded diagnostic, not balance clearance. Five reused small worlds by default; Dedication Knight only, real UI-validated L1/5/10 snapshots, trained/untrained Survival, two RNG trials, paired gathering allowed/declined on identical cached worlds. Farthest reachable published quest destination is chosen without source metadata. No dungeon entry, free healing or synthetic recharge. Real movement, fog discovery, combat, short rest, Make Camp, gathering, merchant purchase and inn rest. Six-move local detours to explored POIs/standalone sources; declined policy takes identical visible-source detours but refuses gathering. Camp at fatigue30 to open carrying capacity. Turn back when current fatigue plus retracing all outbound movement minus carried camp recovery would exceed85; combat and skill costs make future return uncertain. A* has terrain foresight. Remote means >=32 Euclidean tiles from every functioning settlement, a lower bound; gathering logs also give shortest traversable route among three closest towns (not guaranteed globally closest by route). No later-town departure coverage, companions, other Callings, natural browser behavior or unlimited wilderness objective. Combat CIs are descriptive: repeated fights and reused worlds are correlated. Paired RNG streams diverge after additional gathering rolls. No unobserved gain is counted as successful travel.',worlds:seeds,trials,cells,pairs,rows,
    pairedExtensionRate:rate(pairs.filter(pair => pair.usefulExtension).length,pairs.length),
    startHashes,hashes:hashes() };
result.changedFilesDuringRun = files.filter(file => result.startHashes[file] !== result.hashes[file]);
result.returnComparisons = cells.filter(cell => cell.gather).map(cell => {
    const declined = cells.find(other => !other.gather && other.level === cell.level && other.trained === cell.trained);
    const delta = cell.returnRate.p - declined.returnRate.p;
    return { level:cell.level,trained:cell.trained,delta,distinguishable:Math.abs(delta) > cell.returnRate.margin + declined.returnRate.margin,
        caveat:'Wald margins are descriptive and degenerate at0/1; Wilson intervals are also supplied. Reused worlds and paired rolls prevent independent population inference.' };
});
fs.writeFileSync(new URL('./wilderness-provisioning-journey.results.json',import.meta.url),JSON.stringify(result,null,2));
print(JSON.stringify(cells.map(({ traces,...rest }) => rest),null,2));
for (const cell of cells.filter(cell => cell.gather)) {
    for (const [kind,trace] of Object.entries(cell.traces)) {
        if (trace) {
            print(`TRACE L${cell.level} trained=${cell.trained} ${kind} ${trace.outcome}\n${trace.trace.join('\n')}`);
        }
    }
}
print(`PAIRS ${JSON.stringify(result.pairedExtensionRate)}`);
