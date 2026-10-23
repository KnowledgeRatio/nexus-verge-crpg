/** Bounded real dungeon movement pilot; route geometry is known, trap state is not used to route. */
import fs from 'node:fs';
import { run } from './expedition-review.js';
import DungeonGenerator from '../../src/systems/DungeonGenerator.js';
import DungeonManager from '../../src/systems/DungeonManager.js';
import { gameState } from '../../src/core/GameState.js';
const structuredClone = globalThis.structuredClone;
const out = process.stdout.write.bind(process.stdout);
document.querySelector = () => null;
function route(room,start,end){
    const queue = [start],parent = new Map(),key = p => `${p.x},${p.y}`,seen = new Set([key(start)]);
    while (queue.length){
        const p = queue.shift();if (key(p) === key(end)){
            const steps = [];let k = key(p);while (parent.has(k)){
                const [x,y] = k.split(',').map(Number);steps.unshift({ x,y });k = parent.get(k);
            } return steps;
        }
        for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
            const n = { x:p.x + dx,y:p.y + dy },k = key(n);if (!room.tiles[n.y]?.[n.x] || room.tiles[n.y][n.x].isWall || seen.has(k)) {
                continue;
            }seen.add(k);parent.set(k,key(p));queue.push(n);
        }
    }
    return null;
}
async function dungeonHook({ game,player,world,pc,skills,quest,qm,fight,events }){
    const dm = game.dungeonManager;
    game.dungeonManager = player.dungeonManager = dm;
    const pilot = { event:'dungeonPilot',entered:false,moves:0,rooms:[],checks:[],trapCrossings:0,trapDamage:0,actions:[],exit:false };events.push(pilot);
    const ordinaryPrompt = game.promptSkillCheck;
    game.promptSkillCheck = async (config,challenge,stage) => {
        if (config.title !== '🪤 Trap Detected!' && !challenge?.doorChallenge) {
            return ordinaryPrompt(config,challenge,stage);
        }
        const roll = skills.rollSkillCheck(pc,{ skillId:stage?.skill || config.skill,attribute:stage?.attribute || config.attribute,dc:config.dc,advantage:config.advantage,disadvantage:config.disadvantage });
        const critical = skills.checkCritical(roll.roll,roll.total,config.dc),success = roll.total >= config.dc;
        const outcome = skills.getOutcome(challenge,stage,success,critical);
        const consequences = outcome ? skills.applyConsequences(pc,challenge,outcome,{ ...roll,success,critical:critical.isCritical,criticalType:critical.type }) : null;
        pilot.checks.push({ title:config.title,skill:config.skill,roll:roll.roll,modifier:roll.modifier,total:roll.total,dc:config.dc,success });
        return { attempted:true,success,rollResult:roll,outcome,consequences };
    };
    game.promptChoiceSkillChallenge = async challenge => {
        if (!challenge.doorChallenge) {
            return { attempted:false,success:false };
        }
        const options = skills.getChallengeOptions(challenge).filter(o => o.skill && !(o.costGold > 0)).sort((a,b) => skills.getSkillCheckContext(pc,b.skill,{ attribute:b.attribute }).modifier - skills.getSkillCheckContext(pc,a.skill,{ attribute:a.attribute }).modifier);
        const option = options[0];if (!option) {
            return { attempted:false,success:false };
        }
        return game.promptSkillCheck({ title:challenge.name,skill:option.skill,attribute:option.attribute,dc:skills.calculateAdjustedDC(option.baseDC,pc.level) },challenge,option);
    };
    pilot.entered = await dm.enterDungeon();if (!pilot.entered) {
        return false;
    }
    // DFS graph; traverse every accessible room once, return through actual doors.
    const visited = new Set();let failed = false;
    const doActions = () => {
        if (!quest) {
            return;
        } for (const action of qm.getQuestActions(quest.id).filter(a => a.available)){
            const result = qm.recordQuestAction(quest.id,action.id);pilot.actions.push({ id:action.id,success:result.success });
        }
    };
    async function walkTo(target){
        const room = dm.getCurrentRoom(),path = route(room,gameState.get('dungeon.playerPosition'),target);if (!path) {
            return false;
        }
        for (const step of path){
            const p = gameState.get('dungeon.playerPosition'),tile = room.tiles[step.y][step.x],trap = tile.isTrap,hp = pc.currentHP;
            if (!await player.move(step.x - p.x,step.y - p.y)) {
                return false;
            }pilot.moves++;
            if (trap){
                pilot.trapCrossings++;pilot.trapDamage += Math.max(0,hp - pc.currentHP);
            }
            const outcome = await fight();if (pc.currentHP <= 0 || outcome === 'defeat' || outcome === 'timeout') {
                return false;
            }
            doActions();
        }
        return true;
    }
    async function visit(index){
        visited.add(index);pilot.rooms.push(index);doActions();const room = dm.getCurrentRoom();
        for (const next of room.connections){
            if (visited.has(next)) {
                continue;
            }
            const door = room.tiles.flat().find(t => t.isDoor && t.connectsTo === next);if (!door) {
                continue;
            }
            // Tile coordinates are not guaranteed embedded in tile data.
            const y = room.tiles.findIndex(row => row.includes(door)),x = room.tiles[y].indexOf(door);
            if (!await walkTo({ x,y })){
                failed = true;return;
            }
            await player.handleInteraction();const outcome = await fight();if (pc.currentHP <= 0 || outcome === 'defeat' || outcome === 'timeout'){
                failed = true;return;
            }
            if (gameState.get('dungeon.currentRoomIndex') !== next){
                pilot.actions.push({ blockedDoor:`${index}:${next}` });continue;
            }
            await visit(next);if (failed) {
                return;
            }
            const current = dm.getCurrentRoom(),back = current.tiles.flat().find(t => t.isDoor && t.connectsTo === index);
            if (!back){
                failed = true;return;
            } const by = current.tiles.findIndex(row => row.includes(back)),bx = current.tiles[by].indexOf(back);
            if (!await walkTo({ x:bx,y:by })){
                failed = true;return;
            } await player.handleInteraction();await fight();
            if (gameState.get('dungeon.currentRoomIndex') !== index){
                failed = true;return;
            }
        }
    }
    await visit(0);
    pilot.objectives = quest ? structuredClone(qm.getQuest(quest.id)?.objectives) : [];pilot.bossDefeated = gameState.get('dungeon.bossDefeated');
    if (failed) {
        return false;
    }
    const room = dm.getCurrentRoom(),exit = room.tiles.flat().find(t => t.isExit);if (!exit) {
        return false;
    }
    const y = room.tiles.findIndex(row => row.includes(exit)),x = room.tiles[y].indexOf(exit);
    if (!await walkTo({ x,y })) {
        return false;
    } await player.handleInteraction();pilot.exit = !dm.isInDungeon();
    return pilot.exit;
}
dungeonHook.setup = async ({ game,player,world }) => {
    const dg = new DungeonGenerator(gameState.get('seed'));await dg.loadData();
    const dm = new DungeonManager(dg,world);dm.setMonstersData(JSON.parse(fs.readFileSync(new URL('../../data/monsters.json',import.meta.url))));
    game.dungeonManager = player.dungeonManager = dm;
};
dungeonHook.onReturn = async ({ quest,qm,events,settlement }) => {
    if (!quest) {
        return;
    }
    await settlement.enterSettlement();
    const available = qm.getResolutionOptions(quest.id).filter(r => r.available);
    const chosen = available.find(r => r.id.includes('fulfill')) || available[0];
    const result = chosen ? qm.resolveQuest(quest.id,chosen.id) : qm.isQuestReadyToComplete(quest.id) ? qm.completeQuest(quest.id) : { success:false };
    events.push({ event:'questTurnIn',available:available.map(r => r.id),chosen:chosen?.id,result:result.success,status:qm.getQuest(quest.id)?.status });
};
const rows = [];
const outputName = process.env.DUNGEON_OUTPUT || 'expedition-review-dungeon.results.json';
for (let seed = 0;seed < Number(process.env.DUNGEON_SEEDS || 3);seed++) {
    for (const level of [1,5,10]) {
        for (let trial = 0;trial < Number(process.env.DUNGEON_TRIALS || 3);trial++){
            try {
                const result = await run(`expedition-review-${seed}`,level,false,trial,'local',dungeonHook);rows.push(result);out(`seed${seed} L${level} trial${trial} success=${result.success} fights=${result.combats.length} pilot=${JSON.stringify(result.events.find(e => e.event === 'dungeonPilot'))}\n`);
            } catch (error){
                rows.push({ level,trial,error:error.stack });out(`${error.stack}\n`);
            }
            fs.writeFileSync(new URL(`./${outputName}`,import.meta.url),JSON.stringify(rows,null,2));
        }
    }
}
