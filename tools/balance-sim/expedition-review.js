/** Bounded actual overland journeys. No dungeon completion or forced victories. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const structuredClone = globalThis.structuredClone;
const read = path => JSON.parse(fs.readFileSync(new URL(`../../${path}`, import.meta.url)));
const print = console.log.bind(console);
console.log = console.warn = () => {};
globalThis.fetch = async path => ({ ok:true, json:async () => read(String(path).split('?')[0]) });
globalThis.Audio = function() {
    return { play:async () => {}, pause(){}, addEventListener(){} };
};
const element = { classList:{ remove(){},add(){} }, addEventListener(){}, style:{}, querySelector(){
    return element;
} };
globalThis.document = { addEventListener(){}, removeEventListener(){}, getElementById(){
    return element;
}, querySelectorAll(){
    return [];
} };
globalThis.window = { game:null };
// Only presentation/AI delay timers are suppressed; the harness serially drives actual AI.
globalThis.setTimeout = (fn,delay) => {
    if (delay === 400 || delay === 600){
        fn();
    } return 0;
};
const { gameState } = await import('../../src/core/GameState.js');
const { RULES } = await import('../../src/core/rulesEngine.js');
const { Character } = await import('../../src/systems/Character.js');
const { default:Player } = await import('../../src/systems/Player.js');
const { default:WorldGenerator } = await import('../../src/systems/WorldGenerator.js');
const { default:Game } = await import('../../src/main.js');
const { default:LevelUpManager } = await import('../../src/systems/LevelUpManager.js');
const { default:SkillChallengeManager } = await import('../../src/systems/SkillChallengeManager.js');
const { default:ProvisioningManager } = await import('../../src/systems/ProvisioningManager.js');
const { default:MerchantManager } = await import('../../src/systems/MerchantManager.js');
const { default:LootManager } = await import('../../src/systems/LootManager.js');
const { default:NPCGenerator } = await import('../../src/systems/NPCGenerator.js');
const { default:QuestGenerator } = await import('../../src/systems/QuestGenerator.js');
const { default:QuestManager } = await import('../../src/systems/QuestManager.js');
const { default:SettlementManager } = await import('../../src/systems/SettlementManager.js');
const { default:RelationManager } = await import('../../src/systems/RelationManager.js');
const { CombatManager } = await import('../../src/systems/CombatManager.js');
const { DungeonGenerator } = await import('../../src/systems/DungeonGenerator.js');
const { DungeonManager } = await import('../../src/systems/DungeonManager.js');
const { skillRegistry } = await import('../../src/systems/SkillRegistry.js');
const { default:restManager } = await import('../../src/systems/RestManager.js');
const { getFatigueState } = await import('../../src/systems/FatigueManager.js');
const { execute,buildContext } = await import('../../src/systems/EffectDispatcher.js');
const originalRandom = Math.random;
const originalNow = Date.now;
function rng(seed) {
    return () => {
        let v = seed += 0x6D2B79F5;v = Math.imul(v ^ v >>> 15,v | 1);v ^= v + Math.imul(v ^ v >>> 7,v | 61);return ((v ^ v >>> 14) >>> 0) / 4294967296;
    };
}
function hash(value) {
    return [...value].reduce((sum,c) => Math.imul(sum,31) + c.charCodeAt(0) | 0,0) >>> 0;
}
const abilities = read('data/abilities.json').abilities.dedication;
const calling = read('data/classes.json').classes.find(x => x.id === 'dedication');
const background = read('data/backgrounds.json').backgrounds.find(x => x.id === 'soldier');
const species = read('data/races.json').races.find(x => x.id === 'human');
const preset = read('data/kits.json').dedication.find(x => x.id === 'knight').preset;
skillRegistry.setDefinitions(read('data/skills.json').skills);
RULES.worldGen.campaignOverrides = read('data/campaigns.json').campaigns.find(x => x.id === 'nexus-verge').featureGeneration;
const levelManager = new LevelUpManager(); await levelManager.initialize();
const pathCache = new Map(),metadataCache = new Map();
async function character(level,trained) {
    const pc = new Character({ id:'expedition',name:'Knight',class:structuredClone(calling),species:structuredClone(species),background:structuredClone(background),baseAbilities:structuredClone(preset.abilitiesNVSystem),skillChoices:[trained ? 'survival' : 'empathy','perception'],fightingStyle:'dueling',weaponMasteries:['sap','topple','vex'] });
    await pc.applyStartingEquipment();
    gameState.set('character',pc);
    const progressionChecks = [];
    for (let next = 2;next <= level;next++) {
        pc.levelUp(next);
        levelManager.currentSelections = { asiChoice:next <= 5 ? 'prowess' : 'resilience',abilities:[],spells:[],traits:[],practices:next === 4 ? ['hearthcraft'] : next === 6 ? ['forgecraft'] : next === 8 ? ['trading'] : [],specialization:next === 3 ? 'exemplar' : null,tactics:next === 3 ? ['precisionStrike','tripAttack','parry'] : next === 7 ? ['rally'] : next === 9 ? ['riposte'] : [],vows:[] };
        levelManager.availableChoices = levelManager.getAvailableChoices(pc.class.id,next);
        levelManager.validateAndUpdateUI();
        assert.equal(element.disabled,false,`Actual progression UI validation L${next}: ${element.textContent}`);
        progressionChecks.push({ level:next,valid:!element.disabled,hint:element.textContent });
        levelManager.confirmLevelUp();
    }
    assert.equal(pc.level,level);
    pc.expeditionProgressionChecks = progressionChecks;
    return pc;
}
function summarise(values) {
    const rows = [...values].sort((a,b) => a - b);return { mean:rows.reduce((a,b) => a + b,0) / rows.length,min:rows[0],p50:rows[Math.floor((rows.length - 1) * .5)],p95:rows[Math.floor((rows.length - 1) * .95)],max:rows.at(-1) };
}
function proportion(success,n) {
    const p = success / n,m = 1.96 * Math.sqrt(p * (1 - p) / n),z2 = 1.96 ** 2,d = 1 + z2 / n,c = (p + z2 / (2 * n)) / d,w = 1.96 * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / d;return { success,n,rate:p,wald95:[Math.max(0,p - m),Math.min(1,p + m)],waldMargin:m,wilson95:[Math.max(0,c - w),Math.min(1,c + w)] };
}
function verifyRestRecovery(pc,before,restType) {
    const recharged = [];
    for (const id of Object.keys(before.uses || {})) {
        const definition = abilities.find(ability => ability.id === id);
        const eligible = definition?.resourceType === 'shortRest' ||
            (restType === 'long' && definition?.resourceType === 'longRest');
        if (eligible) {
            assert.equal(pc.abilityUses?.[id] || 0,0,`${restType} rest must recharge used available ${id}`);
            recharged.push(id);
        }
    }
    assert.equal(pc.resolvePoints,pc.maxResolvePoints,`${restType} rest must restore Resolve capacity`);
    return { recharged,resolveBefore:before.resolve,resolveAfter:pc.resolvePoints };
}
export async function path(world,start,goal) {
    const cacheKey = `${world.worldSeed}:${start.x},${start.y}:${goal.x},${goal.y}`;
    if (pathCache.has(cacheKey)) {
        return structuredClone(pathCache.get(cacheKey));
    }
    // A* uses actual traversable tiles; target is published, no provisioning metadata search.
    const key = p => `${p.x},${p.y}`;
    const heuristic = p => Math.abs(p.x - goal.x) + Math.abs(p.y - goal.y);
    const open = [{ ...start,g:0,f:heuristic(start) }],seen = new Map([[key(start),0]]),parent = new Map();
    let expansions = 0;
    while (open.length && expansions++ < 18000) {
        open.sort((a,b) => b.f - a.f);const p = open.pop();
        if (p.x === goal.x && p.y === goal.y) {
            const out = [];let k = key(p);while (parent.has(k)){
                const [x,y] = k.split(',').map(Number);out.unshift({ x,y });k = parent.get(k);
            }pathCache.set(cacheKey,out);return structuredClone(out);
        }
        for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const n = { x:p.x + dx,y:p.y + dy }; if (heuristic(n) > heuristic(start) + 40) {
                continue;
            }
            const tile = await world.getTile(n.x,n.y),terrain = world.terrainTypes.terrains.find(t => t.id === tile?.terrain);
            if (!terrain?.traversable) {
                continue;
            }
            const g = p.g + (terrain.movementCost || 1),k = key(n);if (g >= (seen.get(k) ?? Infinity)) {
                continue;
            }
            seen.set(k,g);parent.set(k,key(p));open.push({ ...n,g,f:g + heuristic(n) });
        }
    }
    pathCache.set(cacheKey,null);return null;
}
export async function run(seed,level,trained,trial,policy = 'local',destinationHook = null) {
    gameState.reset();Math.random = rng(hash(`${seed}:${level}:${trial}`));Date.now = () => 1700000000000 + hash(`${seed}:${level}:${trial}`);
    gameState.set('seed',seed);gameState.set('worldConfig',{ campaignId:'nexus-verge',mapSize:'small',difficulty:'normal' });
    gameState.set('party.companions',[]);gameState.set('party.activeSynergies',{});
    gameState.set('fatigue',{ current:0,supplies:RULES.fatigue.suppliesStartCount,exhaustionLevels:0,suppliesZeroStreak:0 });
    if (metadataCache.has(seed)){
        gameState.set('world.metadata',structuredClone(metadataCache.get(seed)));
    }
    const world = new WorldGenerator(seed,{ mapSize:'small',difficulty:'normal',campaignId:'nexus-verge' });await world.generateWorldMetadata();await world.loadTerrainData();
    if (!metadataCache.has(seed)){
        metadataCache.set(seed,structuredClone(world.worldMetadata));
    }
    Math.random = rng(hash(`${seed}:${level}:${trial}`));
    const pc = await character(level,trained);const chassis = { level,hp:pc.maxHP,ac:pc.ac,stats:structuredClone(pc.abilities),resolve:pc.resolvePoints,abilities:structuredClone(pc.selectedAbilities),tactics:structuredClone(pc.knownTactics),practices:structuredClone(pc.practices),gold:pc.gold,progressionChecks:pc.expeditionProgressionChecks };
    const skills = new SkillChallengeManager(); await Promise.all([skills.loadSkillsData(),skills.loadTerrainChallenges(),skills.loadChallenges()]);
    const provisioning = new ProvisioningManager({ worldGenerator:world,skillChallengeManager:skills });await provisioning.loadData('nexus-verge');
    const merchant = new MerchantManager(seed,'nexus-verge'),loot = new LootManager(seed,'nexus-verge'),npc = new NPCGenerator(seed,'nexus-verge'),qg = new QuestGenerator(seed,'nexus-verge'),relations = new RelationManager();
    await Promise.all([merchant.loadData(),loot.loadData(),npc.loadData(),qg.loadData(),relations.init('nexus-verge')]);
    const qm = new QuestManager(qg);const settlement = new SettlementManager(world,{ showSettlementModal(){} },npc,qg,qm);
    const dungeonGenerator = new DungeonGenerator(seed);await dungeonGenerator.loadData();const dungeonManager = new DungeonManager(dungeonGenerator,world);dungeonManager.setMonstersData(read('data/monsters.json'));
    const game = Object.create(Game.prototype);Object.assign(game,{ worldGenerator:world,dungeonManager,questManager:qm,merchantManager:merchant,relationManager:relations,lootManager:loot,provisioningManager:provisioning,skillChallengeManager:skills,abilitiesData:read('data/abilities.json'),syncCombatState(){},updateHUD(){} });
    window.game = game;window.lootManager = loot;window.skillChallengeManager = skills;window.questManager = qm;
    const events = [],combats = [],seen = new Set(),visited = new Set(),inspected = new Set();let steps = 0,camps = 0,shortRests = 0,attempts = 0,suppliesEarned = 0,goldSpent = 0,damage = 0,prompts = 0,detourSteps = 0;
    let currentCombat = null;
    gameState.addMessage = message => {
        if (currentCombat){
            currentCombat.trace.push(`R${currentCombat.cm.round} ${message}`);
        }
    };
    game.promptSkillCheck = async (config,challenge,stage) => {
        prompts++;
        // Optional road events are declined: route-first policy isolates provisioning without loot farming.
        if (!config.isPassiveRoll && !stage?.passiveRoll) {
            return { attempted:false,success:false };
        }
        const roll = skills.rollSkillCheck(pc,{ skillId:stage?.skill || config.skill,attribute:stage?.attribute || config.attribute,dc:config.dc });
        const critical = skills.checkCritical(roll.roll,roll.total,config.dc),success = roll.total >= config.dc;
        const outcome = challenge ? skills.getOutcome(challenge,stage,success,critical) : null;
        const consequences = outcome ? skills.applyConsequences(pc,challenge,outcome,{ ...roll,success,critical:critical.isCritical,criticalType:critical.type }) : null;
        return { attempted:true,success,rollResult:roll,outcome,consequences };
    };
    game.promptChoiceSkillChallenge = async () => {
        prompts++;return { attempted:false,success:false };
    };
    const player = new Player(world,null,settlement,null);game.player = player;
    // Catch the actual async encounter producer so no pending encounter is lost between moves.
    const trigger = player.triggerCombatEncounter.bind(player);let pendingEncounter = null;
    player.triggerCombatEncounter = (...args) => pendingEncounter = trigger(...args);
    async function fight() {
        if (pendingEncounter){
            await pendingEncounter;pendingEncounter = null;
        }
        const pending = gameState.get('ui.pendingCombat');if (!pending?.enemies || !gameState.get('combat')?.active) {
            return;
        }
        const cm = new CombatManager();game.combatManager = cm;const trace = [];
        const record = { step:steps,terrain:pending.terrainId,enemyIds:pending.enemies.map(e => e.species?.id),hpBefore:pc.currentHP,fatigueBefore:getFatigueState().current,resolveBefore:pc.resolvePoints,cm,trace };currentCombat = record;
        let outcome = null;const end = cm.endCombat.bind(cm);cm.endCombat = result => {
            outcome = result;end(result);
        };
        game.promptReaction = async (type,attacker,defender) => {
            const actor = cm.playerCombatant;if (defender !== actor || !actor.hasAction('reaction') || !(pc.resolvePoints > 0) || !pc.knownTactics?.includes('parry') || type !== 'afterHit') {
                return null;
            }
            const ab = abilities.find(a => a.id === 'parry');actor.consumeAction('reaction');const result = await execute(ab,{ reactionDamageReduction:ab.effects.reactionDamageReduction },buildContext(pc,actor,cm));
            return { abilityId:ab.id,damageReduction:result.find(r => r.type === 'reactionDamageReduction')?.result?.damageReduction || 0 };
        };
        await cm.startCombat(pc,pending.enemies,[],pending.questEncounterSource || pending.encounterSource || null);
        let turns = 0;
        while (cm.active && turns++ < 500 && cm.round <= 50){
            const actor = cm.getCurrentCombatant();if (!actor) {
                break;
            }
            if (actor.team === 'enemy') {
                await cm.executeEnemyAI(actor);
            } else {
                const steady = abilities.find(a => a.id === 'steadyNerve');
                if (actor.hp <= actor.maxHP * .5 && actor.hasAction('bonusAction') && (pc.abilityUses?.steadyNerve || 0) < 1) {
                    await game.executeAbilityChoice(steady.effects.options[0],steady,pc);
                }
                const surge = abilities.find(a => a.id === 'actionSurge');
                if (pc.level >= 2 && cm.enemyCombatants.filter(e => e.hp > 0).length > 1 && (pc.abilityUses?.actionSurge || 0) < (pc.level === 10 ? 2 : 1)) {
                    await game.useAbility(surge,pc);
                }
                for (let attack = 0;actor.hasAction('action') && cm.active && attack < 6;attack++){
                    const target = cm.enemyCombatants.filter(e => e.hp > 0).sort((a,b) => a.hp - b.hp)[0];if (!target) {
                        break;
                    }
                    if (pc.resolvePoints > 0 && pc.knownTactics?.includes('tripAttack') && !target.hasCondition('prone')){
                        actor.pendingTactic = 'tripAttack';
                    }
                    await cm.attack(actor,target);
                    if (actor.hasAction('action') && actor.hasCondition('pushed')) {
                        break;
                    }
                }
            }
            if (cm.active) {
                await cm.endTurn();
            }
        }
        currentCombat = null;delete record.cm;Object.assign(record,{ outcome:outcome || 'timeout',rounds:cm.round,hpAfter:pc.currentHP,resolveAfter:pc.resolvePoints,abilityUses:structuredClone(pc.abilityUses),margin:cm.playerCombatant.hp / cm.playerCombatant.maxHP - cm.enemyCombatants.reduce((s,e) => s + e.hp,0) / cm.enemyCombatants.reduce((s,e) => s + e.maxHP,0) });combats.push(record);
        gameState.set('ui.pendingCombat',null);game.combatManager = null;
        // XP is real; pending earned level-ups are deliberately deferred during this fixed-level cell.
        return outcome;
    }
    async function walk(route,allowDetour = true){
        if (!route) {
            return false;
        }
        for (const step of route){
            if (destinationHook?.beforeStep && !await destinationHook.beforeStep({ step,player,world,pc,steps,events,mainRoute:allowDetour })) {
                return false;
            }
            if (pc.currentHP <= 0) {
                return false;
            }
            const beforeHP = pc.currentHP;const moved = await player.move(step.x - player.x,step.y - player.y);assert.equal(moved,true,'planned traversable path');steps++;
            const outcome = await fight();damage += Math.max(0,beforeHP - pc.currentHP);if (outcome === 'defeat' || outcome === 'timeout') {
                return false;
            }
            if (destinationHook?.afterStep) {
                await destinationHook.afterStep({ player,world,pc,steps,events,mainRoute:allowDetour });
            }
            for (const feature of world.worldMetadata.features){
                const tile = world.getCachedTile(feature.x,feature.y);if (tile?.explored && (feature.type === 'sanctuary' || (destinationHook?.standalone && feature.type === 'provisioning')) && feature.provisioning){
                    seen.add(feature.id);
                }
            }
            if (getFatigueState().current >= (destinationHook?.campThreshold ?? 75) && (getFatigueState().supplies > 1 || (getFatigueState().supplies === 1 && getFatigueState().current >= (destinationHook?.lastCampThreshold ?? 90)))){
                const lastSupply = getFatigueState().supplies === 1;player.makeCamp();camps++;events.push({ step:steps,event:'camp',lastSupply,fatigue:getFatigueState().current,supplies:getFatigueState().supplies });
            }
            if (pc.currentHP < pc.maxHP * .55 && restManager.canShortRest().canRest){
                const before = { hp:pc.currentHP,resolve:pc.resolvePoints,uses:structuredClone(pc.abilityUses) };
                const result = await restManager.shortRest();
                assert.equal(result.success,true,'Eligible serial short rest should complete');
                const recovery = verifyRestRecovery(pc,before,'short');
                shortRests++;
                events.push({ step:steps,event:'shortRest',before,after:{ hp:pc.currentHP,resolve:pc.resolvePoints,uses:structuredClone(pc.abilityUses) },recovery });
            }
            const feature = world.worldMetadata.features.find(f => f.x === player.x && f.y === player.y);
            if (feature?.type === 'poi') {
                await player._revealPoiAtPlayerPosition();
            }
            if (feature?.provisioning && (feature.type === 'sanctuary' || (destinationHook?.standalone && feature.type === 'provisioning'))){
                seen.add(feature.id);const preview = provisioning.getOpportunityAtPosition(player.x,player.y);visited.add(feature.id);if (policy !== 'noProvision' && preview?.canAttempt){
                    const result = provisioning.attempt(preview.siteId);attempts++;suppliesEarned += result.suppliesRestored;events.push({ step:steps,event:'provision',site:feature.id,result });
                    if (destinationHook?.onProvision) {
                        await destinationHook.onProvision({ player,world,pc,steps,events,feature,result });
                    }
                }
            }
            if (allowDetour && policy !== 'direct'){
                // Inspect visible ambiguous POIs, not hidden provisioning metadata or resolvedType.
                const candidate = destinationHook?.chooseDetour
                    ? await destinationHook.chooseDetour({ player,world,pc,steps,events,inspected })
                    : world.worldMetadata.features.filter(f => (f.type === 'poi' || (destinationHook?.standalone && f.type === 'provisioning' && getFatigueState().supplies < RULES.fatigue.suppliesMaxCarry)) && !inspected.has(f.id) && world.getCachedTile(f.x,f.y)?.explored && Math.abs(f.x - player.x) + Math.abs(f.y - player.y) <= 3).sort((a,b) => Math.abs(a.x - player.x) + Math.abs(a.y - player.y) - Math.abs(b.x - player.x) - Math.abs(b.y - player.y))[0];
                if (candidate){
                    inspected.add(candidate.id);const origin = { x:player.x,y:player.y };const out = await path(world,origin,candidate);if (out && out.length * 2 <= (destinationHook?.detourBudget ?? 8)){
                        const beforeSteps = steps;if (!await walk(out,false)) {
                            return false;
                        } const back = await path(world,{ x:player.x,y:player.y },origin);if (!await walk(back,false)) {
                            return false;
                        }detourSteps += steps - beforeSteps;
                    }
                }
            }
        }
        return true;
    }
    if (destinationHook?.setup) {
        await destinationHook.setup({ game,player,world,pc,skills,qg,qm,settlement });
    }
    await player.spawn();
    let spawn = { x:player.x,y:player.y };
    const naturalTown = [...world.worldMetadata.settlements].filter(t => !['hostile','rebuilding'].includes(t.hostileState?.phase)).sort((a,b) => Math.hypot(a.x - spawn.x,a.y - spawn.y) - Math.hypot(b.x - spawn.x,b.y - spawn.y))[0];
    const town = destinationHook?.departureTown
        ? await destinationHook.departureTown({ world,player,pc,spawn,naturalTown,settlement,qm }) : naturalTown;
    if (destinationHook?.departureTown) {
        player.x = town.x;player.y = town.y;spawn = { x:town.x,y:town.y };
        gameState.set('player.position',spawn);gameState.set('world.currentLocation',spawn);
        await player.updateVisibility();
    }
    let phase = 'spawnToTown';let success = await walk(await path(world,spawn,town));let quest = null,target = null,reachedTarget = false;
    if (success){
        await settlement.enterSettlement();
        const offers = gameState.get('quests.available') || [];quest = offers.filter(q => q.dungeonHookId).sort((a,b) => {
            const d = q => {
                const [x,y] = q.dungeonHookId.split(',').map(Number);return Math.hypot(x - town.x,y - town.y);
            };return d(a) - d(b);
        })[0];
        if (quest){
            if (!destinationHook?.selectTarget) {
                qm.acceptQuest(quest.id,quest.questGiver?.npcId || quest.questGiverId);
            }
            const [x,y] = quest.dungeonHookId.split(',').map(Number);target = { x,y };
        } else {
            target = [...world.worldMetadata.features].filter(f => f.type === 'dungeon' || f.resolvedType === 'dungeon').sort((a,b) => Math.hypot(a.x - town.x,a.y - town.y) - Math.hypot(b.x - town.x,b.y - town.y))[0];
        }
        if (destinationHook?.selectTarget) {
            target = await destinationHook.selectTarget({ offers,world,player,pc,town,quest,qm });
        }
        phase = 'townToTarget';if (target){
            success = await walk(await path(world,{ x:player.x,y:player.y },target));
        } else {
            success = false;
        }reachedTarget = success;
        if (success && destinationHook){
            success = await destinationHook({ game,player,world,pc,skills,quest,settlement,qm,fight,events });
        }
        // Ordinary cell turns around at the entrance; optional companion harness owns actual dungeon path.
        if (success || (destinationHook?.returnAfterTurnback && pc.currentHP > 0)){
            phase = 'return';success = await walk(await path(world,{ x:player.x,y:player.y },town));
        }
        if (success){
            if (destinationHook?.onReturn) {
                await destinationHook.onReturn({ game,player,world,pc,skills,quest,settlement,qm,events });
            }
            const inventory = await merchant.generateMerchantInventory(town);const item = inventory.find(i => i.purchaseEffect?.type === 'restoreSupplies');const merchantNPC = town.npcs?.find(n => n.role === 'merchant');
            if (item && merchantNPC){
                while (getFatigueState().supplies < RULES.fatigue.suppliesMaxCarry){
                    const before = pc.gold;const result = merchant.buyItem(item,pc,1,merchantNPC);if (!result.success) {
                        break;
                    }goldSpent += before - pc.gold;
                }
            }
            const before = { hp:pc.currentHP,resolve:pc.resolvePoints,uses:structuredClone(pc.abilityUses),supplies:getFatigueState().supplies };
            const result = await restManager.longRest();
            assert.equal(result.success,true,'Returned functioning town should allow a serial long rest');
            const recovery = verifyRestRecovery(pc,before,'long');
            events.push({ event:'inn',success:result.success,before,after:{ hp:pc.currentHP,resolve:pc.resolvePoints,uses:structuredClone(pc.abilityUses),supplies:getFatigueState().supplies },recovery });
        }
    }
    return { seed,trial,level,trained,policy,chassis,spawn,town:{ id:town.id,x:town.x,y:town.y },target,quest:quest ? { id:quest.id,type:quest.type,risk:quest.risk,deadlineDuration:quest.deadlineDuration } : null,success,reachedTarget,terminalPhase:phase,dead:pc.currentHP <= 0,steps,detourSteps,camps,shortRests,attempts,suppliesEarned,goldSpent,goldFinal:pc.gold,xp:pc.xp,hp:pc.currentHP,fatigue:structuredClone(getFatigueState()),worldClock:gameState.get('world.worldClock'),generatedProvisionSites:world.worldMetadata.features.filter(f => f.provisioning).length,seenProvisionSites:seen.size,visitedProvisionSites:visited.size,inspectedPOIs:inspected.size,prompts,damage,combats,events };
}
if (process.argv[1] === new URL(import.meta.url).pathname){
    const outputName = process.env.EXPEDITION_OUTPUT || 'expedition-review.results.json';
    const seeds = Number(process.env.EXPEDITION_SEEDS || 3),trials = Number(process.env.EXPEDITION_TRIALS || 3),rows = [];
    try {
        for (let seed = 0;seed < seeds;seed++) {
            for (const level of [1,5,10]) {
                for (let trial = 0;trial < trials;trial++) {
                    for (const trained of [false,true]){
                        const row = await run(`expedition-review-${seed}`,level,trained,trial);rows.push(row);print(`seed${seed} L${level} t${trial} trained${trained} return=${row.success} steps=${row.steps} fights=${row.combats.length} seen=${row.seenProvisionSites} attempts=${row.attempts} camps=${row.camps}`);
                        fs.writeFileSync(new URL('./expedition-review.partial.json',import.meta.url),JSON.stringify(rows));
                    }
                }
            }
        }
    } finally {
        Math.random = originalRandom;Date.now = originalNow;
    }
    const cells = [1,5,10].flatMap(level => [false,true].map(trained => {
        const runs = rows.filter(r => r.level === level && r.trained === trained),fights = runs.flatMap(r => r.combats),wins = fights.filter(f => f.outcome === 'victory').sort((a,b) => a.rounds - b.rounds),losses = fights.filter(f => f.outcome === 'defeat').sort((a,b) => a.rounds - b.rounds);return { level,trained,trials:runs.length,returnRate:proportion(runs.filter(r => r.success).length,runs.length),combatWinRate:proportion(wins.length,fights.length),steps:summarise(runs.map(r => r.steps)),camps:summarise(runs.map(r => r.camps)),seen:summarise(runs.map(r => r.seenProvisionSites)),attempts:summarise(runs.map(r => r.attempts)),earned:summarise(runs.map(r => r.suppliesEarned)),goldSpent:summarise(runs.map(r => r.goldSpent)),traces:{ medianWin:wins[Math.floor(wins.length / 2)] || null,medianLoss:losses[Math.floor(losses.length / 2)] || null,extremeMargin:[...fights].sort((a,b) => Math.abs(b.margin) - Math.abs(a.margin))[0] } };
    }));
    const files = ['src/systems/Player.js','src/systems/CombatManager.js','src/systems/RestManager.js','src/systems/restRecovery.js','src/systems/LevelUpManager.js','src/systems/DungeonManager.js','src/systems/ProvisioningManager.js','src/systems/WorldGenerator.js','src/core/rulesEngine.js','data/abilities.json','data/levelProgression.json'];
    const result = { methodology:'Actual Player.spawn and awaited move through generated terrain, visibility, encounter accumulator, actual EncounterBuilder and complete CombatManager fights with Game ability dispatch, real termination, loot and XP. Public settlement quest publication with loaded DungeonManager/Generator, NPC, Merchant, Loot and Relation consumers. Destination-bound overland return, no dungeon entry or quest commissions. A* grants full traversable-terrain navigation foresight; not a measured natural-player route distribution. Locally visible ambiguous POIs within three tiles may be inspected with at most eight additional moves each, independent of hidden resolved type/provisioning. Provisioning only after actual shelter revelation and only with capacity. All optional road skill events declined. Camp at >=75 with more than one supply, last supply reserved until >=90. Actual short rests below55%HP, actual stock purchase then long rest at returned safe town. Upper-level selected choices pass the actual UI validator before real confirmation; fixed diagnostic snapshots, not earned playthrough progression, and pending earned progression deferred. Fixed RNG and Date.now are harness-only. Actual repaired live RestManager recovers resources using loaded ability definitions; no synthetic recharge or Character rest substitute. Practice selections legal but active practice effects unexercised. No companions. Outcomes cluster by fifteen worlds and sequential combats; CIs are descriptive, not independent population estimates.',seeds,trialsPerSeed:trials,cells,rows,hashes:Object.fromEntries(files.map(file => [file,createHash('sha256').update(fs.readFileSync(new URL(`../../${file}`,import.meta.url))).digest('hex')])) };
    const pairs = rows.filter(row => !row.trained);
    result.pairedSkillComparison = { pairs:pairs.length,differentObservedRoutes:pairs.filter(row => {
        const other = rows.find(candidate => candidate.seed === row.seed && candidate.level === row.level && candidate.trial === row.trial && candidate.trained);return row.steps !== other.steps || row.hp !== other.hp || row.goldFinal !== other.goldFinal || row.success !== other.success;
    }).length,observedProvisionAttempts:rows.reduce((sum,row) => sum + row.attempts,0),conclusion:'No skill-effect estimate when no opportunity is encountered; zero differences are not whole-game equivalence.' };
    const worlds = rows.filter(row => row.level === 1 && !row.trained && row.trial === 0),exposedWorlds = new Set(rows.filter(row => row.seenProvisionSites > 0).map(row => row.seed));
    result.worldExposure = { worlds:worlds.length,worldsWithObservedClue:exposedWorlds.size,ci:proportion(exposedWorlds.size,worlds.length),generatedSites:worlds.map(row => row.generatedProvisionSites),totalGeneratedSites:worlds.reduce((sum,row) => sum + row.generatedProvisionSites,0) };
    fs.writeFileSync(new URL(`./${outputName}`,import.meta.url),JSON.stringify(result,null,2));print(JSON.stringify(cells.map(({ traces,...rest }) => rest),null,2));
    for (const cell of cells) {
        for (const [kind,trace] of Object.entries(cell.traces)) {
            if (trace){
                print(`TRACE L${cell.level} trained${cell.trained} ${kind} ${trace.outcome}`);print(trace.trace.filter(line => /roll|damage|miss|Heal|Surge|Trip|Parry|HP /i.test(line)).join('\n'));
            }
        }
    }
}
