import { CombatManager } from '../systems/CombatManager.js';
import audioManager from '../systems/AudioManager.js';
import { gameState } from '../core/GameState.js';
import { skillRegistry } from '../systems/SkillRegistry.js';
import { loadCampaigns } from '../utils/campaignFilter.js';
import { buildStudyEncounter } from './CombatEncounterSetup.js';
import { combatActionVisual, combatPresentationSnapshot, stageEncounterSnapshot } from './CombatPresentation.js';

const element = name => document.getElementById(`encounter${name}`);
const mobile = window.matchMedia('(max-width: 767px)');
const pause = () => new Promise(resolve => setTimeout(resolve, 50));
let manager;
let scene;
let sceneConfig;
let config;
let data;
let displayed;
let selectedTarget;
let started = false;
let compact = false;
let rendering = false;
let resolving = false;
let outcome;
let refreshScheduled = false;
let needsRefresh = false;
let loadingScene = false;
let messages = [];
let activeRecord;
const sounds = [];
const queue = [];
const heldWeapons = new Map();

function playSounds(pending) {
    for (const sound of pending.splice(0)) {
        if (!document.hidden) {
            sound();
        }
    }
}

function snapshot() {
    const { state } = combatPresentationSnapshot(manager, sceneConfig,
        { items: data.items.weapons, monsters: data.monsters.monsters }, heldWeapons);
    return { ...state,
        combatants: state.combatants.map(actor => {
            const combatant = manager.combatants.find(entry => entry.id === actor.id);
            const memberIndex = actor.team === 'player' ? 0 : manager.companionCombatants.indexOf(combatant) + 1;
            return { ...actor, appearance: actor.team === 'enemy' ? actor.appearance : config.party[memberIndex].appearance };
        }) };
}

function chooseTarget(id) {
    const target = manager?.enemyCombatants.find(actor => actor.id === id && actor.hp > 0);
    if (target) {
        selectedTarget = id;
        updateControls();
    }
}

function updateControls() {
    if (!started) {
        return;
    }
    const current = manager.getCurrentCombatant();
    const busy = resolving || rendering || Boolean(scene?.isBusy()) || queue.length > 0;
    const controlled = manager.active && current?.hp > 0 && current.team !== 'enemy' && !busy;
    const targets = busy && displayed ? displayed.combatants.filter(actor => actor.team === 'enemy' && actor.hp > 0) :
        manager.enemyCombatants.filter(actor => actor.hp > 0);
    if (!targets.some(actor => actor.id === selectedTarget)) {
        selectedTarget = targets[0]?.id;
    }
    const select = element('Target');
    select.replaceChildren(...targets.map(target => new window.Option(target.name, target.id)));
    select.value = selectedTarget || '';
    select.disabled = !controlled;
    const weapon = current?.character.equipment?.mainHand;
    const empty = weapon?.weaponType === 'ranged' && (weapon.ammoCount ?? weapon.ammoCapacity) <= 0;
    element('Attack').textContent = `Attack${weapon ? ` · ${weapon.name}` : ''}`;
    element('Attack').disabled = !controlled || !selectedTarget || !current?.hasAction('action') || empty;
    element('Dodge').disabled = !controlled || !current?.hasAction('action');
    element('Disengage').disabled = !controlled || !current?.hasAction('action');
    element('EndTurn').disabled = !controlled;
    element('Skip').disabled = !busy;
    element('Cards').disabled = mobile.matches || loadingScene;
    element('Cards').textContent = loadingScene ? 'Loading 3D…' : compact ? 'Use 3D view' : 'Use compact view';
    element('Cards').setAttribute('aria-pressed', String(compact));
    element('Resources').textContent = current && manager.active ?
        `Action ${current.actions.action} · Bonus ${current.actions.bonusAction} · Reaction ${current.actions.reaction}` +
        (weapon?.weaponType === 'ranged' ? ` · Ammunition ${weapon.ammoCount ?? weapon.ammoCapacity}` : '') : '';
    if (!busy) {
        element('Order').textContent = `Round ${manager.round} · ${manager.turnOrder.filter(actor => actor.hp > 0).map(actor => actor.name).join(' → ')}`;
        const log = element('Log');
        log.replaceChildren(...messages.slice(-30).map(message => {
            const row = document.createElement('li');
            row.textContent = message.text;
            return row;
        }));
        log.scrollTop = log.scrollHeight;
    }
    element('Status').textContent = busy ? 'Resolving the action…' : outcome ?
        outcome === 'victory' ? 'Victory. All enemies defeated.' : 'Defeat. Restart to try again.' :
        current?.team === 'enemy' ? `${current.name} is taking their turn.` : `${current?.name}’s turn — select a target or defensive action.`;
    if (compact || mobile.matches) {
        element('Fallback').replaceChildren(...(displayed?.combatants || []).map(actor => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = `${actor.name} · HP ${actor.hp}/${actor.maxHP} · ${actor.engagedWith.length} engaged`;
            button.disabled = actor.team !== 'enemy' || actor.hp <= 0;
            button.setAttribute('aria-pressed', String(actor.id === selectedTarget));
            button.addEventListener('click', () => chooseTarget(actor.id));
            return button;
        }));
    }
}

async function waitForScene() {
    while (scene?.isBusy()) {
        if (document.hidden || compact || mobile.matches) {
            scene.finishPresentation();
        }
        await pause();
    }
}

async function drain() {
    if (rendering || !started) {
        return;
    }
    rendering = true;
    needsRefresh = false;
    updateControls();
    try {
        while (queue.length) {
            const record = queue.shift();
            activeRecord = record;
            if (record.event.weaponId) {
                heldWeapons.set(record.event.sourceId, {
                    weaponId: record.event.weaponId, weaponSlot: record.event.weaponSlot
                });
            }
            const next = snapshot();
            // Stage the new engagement while retaining pre-impact health/death poses.
            const staged = stageEncounterSnapshot(next, displayed, record.event.targetId);
            const appearance = next.combatants.find(actor => actor.id === record.event.sourceId)?.appearance;
            const visual = combatActionVisual(sceneConfig, record.event, appearance);
            scene?.update({ ...staged, approach: record.event });
            if (scene && !compact && !mobile.matches && !document.hidden) {
                scene.start();
                scene.action({ ...record.event, kind: visual?.action || record.event.kind,
                    motion: visual?.motion, feedback: record.feedback,
                    onRelease: () => playSounds(record.releaseSounds),
                    onImpact: () => playSounds(record.sounds) });
                await waitForScene();
            }
            // Compact/reduced/failed presentation still settles every cue exactly once.
            playSounds(record.releaseSounds);
            playSounds(record.sounds);
            activeRecord = null;
            displayed = snapshot();
            scene?.update(displayed);
            await waitForScene();
        }
        needsRefresh = false;
        displayed = snapshot();
        scene?.update(displayed);
        await waitForScene();
    } catch (error) {
        console.error('Encounter presentation failed:', error);
        useCompact();
    } finally {
        rendering = false;
        if (activeRecord) {
            playSounds(activeRecord.releaseSounds);
            playSounds(activeRecord.sounds);
            activeRecord = null;
        }
        // Defeat and non-action sounds follow the resolved visual state.
        playSounds(sounds);
        updateControls();
        if (queue.length || needsRefresh) {
            scheduleRefresh();
        }
    }
}

function scheduleRefresh() {
    needsRefresh = true;
    if (!refreshScheduled) {
        refreshScheduled = true;
        window.queueMicrotask(() => {
            refreshScheduled = false;
            void drain();
        });
    }
}

async function waitForPlayback() {
    while (rendering || queue.length || scene?.isBusy() || document.hidden) {
        if (document.hidden) {
            scene?.finishPresentation();
        }
        await pause();
    }
}

function useCompact({ failed = false } = {}) {
    compact = true;
    scene?.finishPresentation();
    scene?.stop();
    if (failed) {
        scene?.dispose();
        scene = null;
    }
    element('Stage').hidden = true;
    element('Fallback').hidden = false;
    updateControls();
}

async function useScene() {
    if (mobile.matches || loadingScene) {
        return;
    }
    loadingScene = true;
    updateControls();
    element('Stage').hidden = false;
    try {
        if (!scene) {
            const { CombatScene } = await import('../rendering/CombatScene.js');
            scene = new CombatScene(element('Stage'), sceneConfig, {
                combatants: displayed?.combatants,
                onSelect: chooseTarget, onFailure: () => useCompact({ failed: true })
            });
            await scene.ready;
            if (!scene || mobile.matches) {
                useCompact();
                return;
            }
        }
        compact = false;
        element('Fallback').hidden = true;
        if (displayed) {
            scene.update(displayed);
        }
        scene.start();
        scheduleRefresh();
    } catch (error) {
        console.warn('3D unavailable:', error);
        useCompact({ failed: true });
    } finally {
        loadingScene = false;
        updateControls();
    }
}

async function perform(action) {
    if (resolving || rendering || queue.length || scene?.isBusy() || !manager.active) {
        return;
    }
    const current = manager.getCurrentCombatant();
    if (!current || current.team === 'enemy' || current.hp <= 0) {
        return;
    }
    resolving = true;
    updateControls();
    try {
        if (action === 'attack') {
            const target = manager.enemyCombatants.find(actor => actor.id === selectedTarget && actor.hp > 0);
            if (target) {
                await manager.attack(current, target);
            }
        } else if (action === 'dodge') {
            manager.dodge(current);
        } else if (action === 'disengage') {
            manager.disengage(current);
        } else if (action === 'endTurn') {
            await manager.endTurn();
        }
    } finally {
        resolving = false;
        scheduleRefresh();
        updateControls();
    }
}

async function start() {
    if (started) {
        window.location.reload();
        return;
    }
    started = true;
    element('Start').disabled = true;
    const encounter = buildStudyEncounter(config, data);
    const deferSound = (method, args) => {
        const record = queue.at(-1) || activeRecord;
        const pending = method === 'playCombatRelease' && record ? record.releaseSounds :
            method === 'playCombatSound' && record ? record.sounds : sounds;
        pending.push(() => audioManager[method](...args));
        scheduleRefresh();
    };
    manager = new CombatManager({ beforeEnemyTurn: waitForPlayback, audio: {
        play: (...args) => deferSound('play', args),
        playCombatRelease: (...args) => deferSound('playCombatRelease', args),
        playCombatSound: (...args) => deferSound('playCombatSound', args)
    } });
    gameState.set('character', encounter.player);
    gameState.set('worldConfig', { ...config.worldConfig, campaignId: config.campaignId });
    gameState.set('items', Object.values(data.items).filter(Array.isArray).flat());
    if (!mobile.matches) {
        await useScene();
    } else {
        useCompact();
    }
    gameState.subscribe('combat.presentationAction', event => {
        queue.push({ event, sounds: [], releaseSounds: [] });
        scheduleRefresh();
    });
    gameState.subscribe('combat.floatingText', feedback => {
        const record = queue.findLast(entry => entry.event.targetId === feedback.combatantId && !entry.feedback);
        if (record) {
            record.feedback = { text: feedback.text, type: feedback.type };
        } else {
            scene?.feedback(feedback);
        }
    });
    gameState.subscribe('combat', state => {
        if (state?.combatants || !manager.active) {
            scheduleRefresh();
        }
    });
    gameState.subscribe('combat.ended', result => {
        outcome = result.outcome;
        scheduleRefresh();
    });
    await manager.startCombat(encounter.player, encounter.enemies, encounter.companions);
    if (!compact) {
        scene?.start();
    }
    element('Start').textContent = 'Restart encounter';
    element('Start').disabled = false;
    scheduleRefresh();
}

async function init() {
    const names = ['combatEncounterStudy', 'combatScene', 'items', 'classes', 'races', 'monsters'];
    const loaded = await Promise.all(names.map(async name => {
        const response = await fetch(`data/${name}.json`);
        if (!response.ok) {
            throw new Error(`${name}: HTTP ${response.status}`);
        }
        return [name, await response.json()];
    }));
    data = Object.fromEntries(loaded);
    config = data.combatEncounterStudy;
    sceneConfig = data.combatScene;
    await Promise.all([loadCampaigns(), skillRegistry.load()]);
    gameState.subscribe('ui.messageLog', next => {
        messages = next;
        scheduleRefresh();
    });
    element('Start').disabled = false;
    element('Status').textContent = 'Ready. Start the encounter to roll initiative.';
    element('Start').addEventListener('click', () => start().catch(error => {
        console.error(error);
        element('Status').textContent = 'The encounter could not start. Reload to try again.';
    }));
    element('Target').addEventListener('change', event => chooseTarget(event.target.value));
    for (const [id, action] of [['Attack', 'attack'], ['Dodge', 'dodge'], ['Disengage', 'disengage'], ['EndTurn', 'endTurn']]) {
        element(id).addEventListener('click', () => perform(action).catch(error => {
            console.error(error);
            element('Status').textContent = 'The action failed. Restart the encounter to retry.';
        }));
    }
    element('Skip').addEventListener('click', () => scene?.finishPresentation());
    element('Cards').addEventListener('click', () => compact ? void useScene() : useCompact());
    mobile.addEventListener('change', () => {
        if (mobile.matches && started) {
            useCompact();
        }
        updateControls();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            scene?.finishPresentation();
            scene?.stop();
        } else if (!compact) {
            scene?.start();
        }
    });
    window.addEventListener('pagehide', () => {
        if (manager) {
            manager.active = false;
        }
        scene?.dispose();
    }, { once: true });
}

init().catch(error => {
    console.error(error);
    element('Status').textContent = 'Encounter data could not load. Reload to try again.';
});
