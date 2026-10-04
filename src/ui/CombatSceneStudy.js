import { combatSceneConfig, combatActionVisual, selectedPlayerParts } from './CombatPresentation.js';
import { combatSfxKey } from '../systems/combatSfxMatrix.js';
import { formatCombatNumber } from '../utils/combatNumberFormat.js';

const stage = document.getElementById('studyStage');
const status = document.getElementById('studyStatus');
const fallback = document.getElementById('studyFallback');
const scenarioSelect = document.getElementById('studyScenario');
const environmentSelect = document.getElementById('studyEnvironment');
const appearanceSelect = document.getElementById('studyAppearance');
const weaponSelect = document.getElementById('studyWeapon');
const offHandSelect = document.getElementById('studyOffHand');
const healingSelect = document.getElementById('studyHealing');
const musicToggle = document.getElementById('studyMusic');
const musicCueSelect = document.getElementById('studyMusicCue');
const soundEffectsToggle = document.getElementById('studySoundEffects');
const audioStatus = document.getElementById('studyAudioStatus');
const mobile = window.matchMedia('(max-width: 767px)');
const audioPaths = {};
const music = new Audio();
music.loop = true;
music.preload = 'none';
music.volume = 0.25;
let loadedMusicCue;
let scene;
let state;
let config;
let baseConfig;
let study;
let Scene;
let failed = false;
let items;
let spells;
let abilities;
let monsters;
let sfxConfig;
let selectedTarget;
const appearanceParts = {};

function creatureActions() {
    const source = state?.combatants.find(actor => actor.id === selectedTarget);
    return monsters?.find(monster => monster.id === source?.monsterId)?.actions || [];
}

function updateCreatureActions() {
    const actions = creatureActions();
    document.getElementById('studyCreatureAction').replaceChildren(...actions.map((action, i) =>
        new window.Option(action.name, String(i))));
    document.getElementById('studyEnemyStrike').disabled = !actions.length;
}

function reportFailure(error) {
    failed = true;
    console.error('Combat study failed:', error);
    status.textContent = `3D study error: ${error?.message || String(error)}. Choose Reset scene to retry.`;
    scene?.stop();
    stage.hidden = true;
    fallback.hidden = false;
    if (state) {
        showFallback();
    }
}

window.addEventListener('error', event => reportFailure(event.error || event.message));
window.addEventListener('unhandledrejection', event => reportFailure(event.reason));

async function loadMusicCues() {
    const response = await fetch('data/audio/cue-versions.json', { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Audio catalogue: HTTP ${response.status}`);
    }
    const catalog = await response.json();
    musicCueSelect.replaceChildren();
    for (const id of catalog.previewOrder) {
        const entry = catalog.versions[id];
        if (!entry || !entry.file?.startsWith('local/')) {
            throw new Error(`Invalid audio version: ${id}`);
        }
        audioPaths[id] = `${catalog.assetRoot}/${entry.previewFile || entry.file}`;
        const suffix = Object.values(catalog.current).includes(id) ? ' · current' :
            entry.status === 'rejected' ? ' · rejected' : '';
        musicCueSelect.add(new window.Option(`${entry.label}${suffix}`, id));
    }
    if (!audioPaths[catalog.current.combat]) {
        throw new Error('Current combat audio version is missing from the preview');
    }
    musicCueSelect.value = catalog.current.combat;
    musicCueSelect.disabled = false;
    musicToggle.disabled = false;
}

function reportAudioFailure(error) {
    console.warn('Audio preview unavailable:', error);
    audioStatus.textContent = 'Audio catalogue unavailable. Reload the local preview.';
    musicCueSelect.replaceChildren(new window.Option('Audio unavailable · reload from local preview', ''));
    musicCueSelect.title = error?.message || String(error);
    musicCueSelect.disabled = true;
    musicToggle.disabled = true;
}

function playEffect(name) {
    if (!soundEffectsToggle.checked || document.hidden) {
        return;
    }
    const sound = new Audio(audioPaths[name]);
    sound.volume = 0.55;
    // Audio is optional in this study; unavailable local files leave the visual cue intact.
    sound.play().catch(() => {});
}

function syncMusic() {
    if (!musicToggle.checked || document.hidden) {
        music.pause();
        return;
    }
    audioStatus.textContent = '';
    const cue = musicCueSelect.value;
    if (!audioPaths[cue]) {
        musicToggle.checked = false;
        return;
    }
    if (loadedMusicCue !== cue) {
        music.src = audioPaths[cue];
        loadedMusicCue = cue;
    }
    music.play().catch(error => {
        if (loadedMusicCue === cue && musicToggle.checked) {
            musicToggle.checked = false;
            audioStatus.textContent = `Could not play ${musicCueSelect.selectedOptions[0]?.textContent || cue}.`;
            console.warn('Music preview failed:', error);
        }
    });
}

music.addEventListener('error', () => {
    musicToggle.checked = false;
    music.pause();
    audioStatus.textContent = `Could not load ${musicCueSelect.selectedOptions[0]?.textContent || 'this cue'}.`;
});
music.addEventListener('playing', () => {
    audioStatus.textContent = '';
});

function attackFeedback() {
    const type = document.getElementById('studyOutcome').value;
    return { text: type === 'miss' ? 'MISS' : type === 'block' ? 'PARRIED' : 'HIT',
        type: type === 'block' ? 'miss' : type };
}

function attackAudio(event) {
    const outcome = document.getElementById('studyOutcome').value;
    const context = { ...event, hit: outcome !== 'miss', blocked: outcome === 'block',
        defenderArmorId: document.getElementById('studyTargetSurface').value === 'metal' ?
            sfxConfig.metalArmor[0] : undefined };
    return { release: combatSfxKey(sfxConfig, 'release', context),
        impact: combatSfxKey(sfxConfig, 'impact', context) };
}

function selectedWeapon() {
    return config.weaponVisuals.find(entry => entry.itemId === weaponSelect.value);
}

function equipWeapon() {
    const entry = selectedWeapon();
    const item = items.weapons.find(weapon => weapon.id === entry.itemId);
    Object.assign(state.combatants.find(c => c.id === 'hero'), {
        weaponModel: entry.model, weaponName: item.name,
        twoHanded: Boolean(item.twoHanded || item.properties?.includes('twoHanded')),
        weaponAction: entry.action, weaponMount: entry.mount, itemId: item.id
    });
    document.getElementById('studyStrike').textContent = `Attack · ${item.name}`;
    equipOffHand();
}

function equipOffHand() {
    const hero = state.combatants.find(c => c.id === 'hero');
    const mount = config.artAssets.models.traveller.weaponMounts[hero.weaponMount || hero.weaponModel];
    offHandSelect.disabled = hero.twoHanded || mount?.hand === 'left';
    offHandSelect.title = offHandSelect.disabled ? 'Off-hand examples currently require a one-handed main weapon.' : '';
    if (offHandSelect.disabled) {
        offHandSelect.value = '';
    }
    const visual = config.offHandVisuals.find(entry => entry.itemId === offHandSelect.value) ||
        config.weaponVisuals.find(entry => entry.itemId === offHandSelect.value);
    hero.offHandModel = visual?.model;
    hero.offHandMount = visual?.mount;
    hero.offHandItemId = offHandSelect.value;
    document.getElementById('studyOffHandStrike').disabled = !visual?.action;
}

function attack(weaponSlot = 'mainHand') {
    const hero = state.combatants.find(c => c.id === 'hero');
    const offHand = weaponSlot === 'offHand';
    const visual = offHand ? config.weaponVisuals.find(entry => entry.itemId === hero.offHandItemId) : selectedWeapon();
    if (!visual) {
        return;
    }
    const kind = visual.action;
    const melee = kind === 'melee' || config.animation.actionProfiles[kind]?.contact === 'melee';
    const targetId = melee ? hero.engagedWith.find(id => id === selectedTarget) : selectedTarget;
    if (!targetId) {
        status.textContent = 'Engage opponents first, then select an engaged enemy for the melee example.';
        return;
    }
    const feedback = attackFeedback();
    const item = items.weapons.find(entry => entry.id === visual.itemId);
    const audio = attackAudio({ weaponId: item?.id, weaponType: item?.weaponType });
    scene?.action({ sourceId: 'hero', targetId, kind, motion: visual.motion, weaponSlot, feedback,
        onRelease: audio.release ? () => playEffect(audio.release) : undefined,
        onImpact: audio.impact ? () => playEffect(audio.impact) : undefined
    });
    status.textContent = `${item.name}${offHand ? ' off-hand' : ''} attack example. This study does not roll dice or change health.`;
}

function healingExample() {
    const entry = study.healingExamples[Number(healingSelect.value)];
    const record = (entry.source === 'abilities' ? abilities : spells).find(item => item.id === entry.id);
    return { entry, record };
}

function updateHealingControls() {
    const { entry, record } = healingExample();
    document.getElementById('studyHealAlly').disabled = entry.target === 'self';
    status.textContent = `${record.name}: ${entry.target === 'self' ? 'self-healing' : 'self or companion'} visual example. Health and resources are unchanged.`;
}

function heal(targetId) {
    const { entry, record } = healingExample();
    if (targetId !== 'hero' && entry.target === 'self') {
        return;
    }
    scene?.action({ sourceId: 'hero', targetId, kind: 'healing',
        feedback: { text: 'HEALING', type: 'healing' }, onImpact: () => playEffect('heal') });
    const recipient = state.combatants.find(c => c.id === targetId);
    status.textContent = `${record.name} → ${recipient.name}. Visual example only; no healing roll or resource cost is simulated.`;
}

function showFallback() {
    fallback.replaceChildren();
    const intro = document.createElement('p');
    intro.textContent = mobile.matches ? 'Compact view · open on desktop to explore the 3D scene.' :
        '3D could not start on this device. The encounter remains readable below.';
    const list = document.createElement('ul');
    for (const c of state.combatants) {
        const item = document.createElement('li');
        const names = c.engagedWith.map(id => state.combatants.find(other => other.id === id).name);
        item.textContent = `${c.name} · ${formatCombatNumber(c.hp)}/${formatCombatNumber(c.maxHP)} · ${names.length ? `Engaged with ${names.join(', ')}` : 'Not engaged'}`;
        list.append(item);
    }
    fallback.append(intro, list);
}

function render() {
    const compact = mobile.matches || failed;
    stage.hidden = compact;
    fallback.hidden = !compact;
    if (compact) {
        scene?.stop();
        showFallback();
    } else {
        if (!scene) {
            try {
                scene = new Scene(stage, config, {
                    combatants: state.combatants,
                    onSelect: id => {
                        const c = state.combatants.find(actor => actor.id === id);
                        if (c.team === 'enemy') {
                            selectedTarget = id;
                            updateCreatureActions();
                        }
                        status.textContent = `${c.name}: ${c.engagedWith.length} engagement(s).`;
                    },
                    onFailure: () => {
                        failed = true;
                        status.textContent = '3D rendering stopped. Choose Reset scene to retry.';
                        render();
                    }
                });
                const loadingScene = scene;
                status.textContent = 'Loading character models…';
                void scene.ready.then(() => {
                    if (scene !== loadingScene || failed) {
                        return;
                    }
                    const missing = [...scene.actors.values()].filter(actor => actor.appearance.creature &&
                        (!scene.artAssets.templates.has(actor.appearance.asset) || actor.artUnavailable));
                    if (missing.length) {
                        failed = true;
                        status.textContent = 'The creature model did not load. Choose Reset scene to retry.';
                        render();
                    } else {
                        status.textContent = `Scene ready: ${config.name}. Choose Engage opponents to see the group form.`;
                    }
                }).catch(error => {
                    if (scene === loadingScene) {
                        reportFailure(error);
                    }
                });
            } catch (error) {
                reportFailure(error);
                return;
            }
        }
        scene.update(state);
        if (!document.hidden) {
            scene.start();
        }
    }
}

function reset() {
    if (!baseConfig.sceneVariants?.[environmentSelect.value]) {
        reportFailure(new Error('The selected environment is missing from the loaded scene data. Reload this page'));
        return;
    }
    scene?.dispose();
    scene = null;
    failed = false;
    config = combatSceneConfig(baseConfig, { sceneId: environmentSelect.value });
    document.getElementById('studySceneName').textContent = config.name;
    stage.setAttribute('aria-label', `${config.name} combat scene`);
    const scenario = study.scenarios[scenarioSelect.value];
    state = { active: true, round: 1, currentTurn: 'hero', combatants: scenario.participants.map(id => ({
        ...study.combatants.find(c => c.id === id), engagedWith: []
    })) };
    state.combatants.find(c => c.id === 'hero').appearance = appearanceSelect.value;
    state.combatants.find(c => c.id === 'hero').appearanceParts = selectedPlayerParts(baseConfig,
        { combatAppearance: { parts: appearanceParts } });
    selectedTarget = state.combatants.find(c => c.team === 'enemy').id;
    updateCreatureActions();
    equipWeapon();
    status.textContent = 'Choose Engage opponents to see the group form.';
    render();
}

async function init() {
    const responses = await Promise.all(['combatScene', 'combatSceneStudy', 'items', 'spells', 'abilities', 'monsters', 'audio/combat-sfx'].map(name =>
        fetch(`data/${name}.json`, { cache: 'no-store' }).then(response => {
            if (!response.ok) {
                throw new Error(`Scene data: HTTP ${response.status}`);
            }
            return response.json();
        })));
    [baseConfig, study, items] = responses;
    appearanceSelect.replaceChildren(...baseConfig.playerAppearances.map(option =>
        new window.Option(option.label, option.id)));
    const partsPanel = document.createElement('details');
    const partsTitle = document.createElement('summary');
    partsTitle.textContent = 'Customise player appearance';
    partsPanel.append(partsTitle);
    for (const [slot, catalogue] of Object.entries(baseConfig.playerAppearanceParts || {})) {
        const label = document.createElement('label');
        label.textContent = catalogue.label;
        const select = document.createElement('select');
        select.dataset.appearanceSlot = slot;
        select.append(...catalogue.options.map(option => new window.Option(option.label, option.id)));
        select.value = catalogue.default;
        label.append(select);
        partsPanel.append(label);
        select.addEventListener('change', () => {
            appearanceParts[slot] = select.value;
            reset();
        });
    }
    appearanceSelect.closest('label').after(partsPanel);
    for (const [id, variant] of Object.entries(baseConfig.sceneVariants)) {
        if (![...environmentSelect.options].some(option => option.value === id)) {
            environmentSelect.add(new window.Option(variant.name, id));
        }
    }
    config = baseConfig;
    spells = Object.values(responses[3].spells).filter(Array.isArray).flat();
    abilities = Object.values(responses[4].abilities).filter(Array.isArray).flat();
    monsters = responses[5].monsters;
    sfxConfig = responses[6];
    for (const [key, asset] of Object.entries(sfxConfig.assets)) {
        audioPaths[key] = `data/audio/local/${asset.source}.mp3`;
    }
    for (const entry of config.weaponVisuals) {
        const item = items.weapons.find(weapon => weapon.id === entry.itemId);
        weaponSelect.add(new window.Option(item.name, item.id));
        const motion = config.artAssets.models.traveller.motion.actions[entry.motion || entry.action];
        if (motion?.handClips?.left) {
            offHandSelect.add(new window.Option(item.name, item.id));
        }
    }
    for (const entry of config.offHandVisuals) {
        const item = Object.values(items).filter(Array.isArray).flat().find(item => item.id === entry.itemId);
        offHandSelect.add(new window.Option(item.name, item.id));
    }
    for (const [index, entry] of study.healingExamples.entries()) {
        const record = (entry.source === 'abilities' ? abilities : spells).find(item => item.id === entry.id);
        healingSelect.add(new window.Option(record.name, String(index)));
    }
    const spell = spells.find(item => item.id === study.spellExample);
    document.getElementById('studySpell').textContent = `Cast · ${spell.name}`;
    updateHealingControls();
    // Mobile never downloads or initialises the graphics library unless resized to desktop.
    if (!mobile.matches) {
        ({ CombatScene: Scene } = await import('../rendering/CombatScene.js'));
    }
    reset();
    scenarioSelect.addEventListener('change', reset);
    document.getElementById('studyEnemyStrike').addEventListener('click', () => {
        const source = state.combatants.find(actor => actor.id === selectedTarget);
        const action = creatureActions()[Number(document.getElementById('studyCreatureAction').value)];
        if (!action || scene?.isBusy()) {
            status.textContent = 'Select a creature with a canonical attack once the current action finishes.';
            return;
        }
        const visual = combatActionVisual(config, { actionName: action.name,
            weaponId: action.weaponId, kind: action.type === 'rangedWeaponAttack' ? 'ranged' : 'melee' }, source.appearance);
        const modelKey = visual.weaponSlot === 'offHand' ? 'offHandModel' : 'weaponModel';
        const mountKey = visual.weaponSlot === 'offHand' ? 'offHandMount' : 'weaponMount';
        if (source[modelKey] !== visual.model || source[mountKey] !== visual.mount) {
            source[modelKey] = visual.model;
            source[mountKey] = visual.mount;
            scene.update(state);
        }
        if (visual.action === 'melee' && !source.engagedWith.includes('hero')) {
            status.textContent = 'Engage the selected melee opponent before previewing its attack.';
            return;
        }
        const audio = attackAudio({ weaponId: action.weaponId,
            weaponType: action.type === 'meleeWeaponAttack' ? 'melee' : 'ranged',
            attackKind: action.type, damageType: action.damageType });
        scene.action({ sourceId: source.id, targetId: 'hero', kind: visual.action,
            motion: visual.motion, weaponSlot: visual.weaponSlot, feedback: attackFeedback(),
            onRelease: audio.release ? () => playEffect(audio.release) : undefined,
            onImpact: audio.impact ? () => playEffect(audio.impact) : undefined });
        status.textContent = `${source.name} · ${action.name}`;
    });
    environmentSelect.addEventListener('change', reset);
    appearanceSelect.addEventListener('change', reset);
    weaponSelect.addEventListener('change', () => {
        if (scene?.isBusy()) {
            weaponSelect.value = state.combatants.find(c => c.id === 'hero').itemId;
            status.textContent = 'Let the action finish before changing weapons.';
            return;
        }
        equipWeapon();
        render();
        status.textContent = `${state.combatants.find(c => c.id === 'hero').weaponName} equipped. Appearance and engagement positions are retained.`;
    });
    offHandSelect.addEventListener('change', () => {
        if (scene?.isBusy()) {
            offHandSelect.value = state.combatants.find(c => c.id === 'hero').offHandItemId || '';
            status.textContent = 'Let the action finish before changing equipment.';
            return;
        }
        equipOffHand();
        render();
        status.textContent = `${offHandSelect.selectedOptions[0].textContent} selected for the off hand.`;
    });
    healingSelect.addEventListener('change', updateHealingControls);
    document.getElementById('studyHealSelf').addEventListener('click', () => heal('hero'));
    document.getElementById('studyHealAlly').addEventListener('click', () => heal('companion'));
    document.getElementById('studyReset').addEventListener('click', reset);
    document.getElementById('studyEngage').addEventListener('click', () => {
        state.combatants.forEach(c => c.engagedWith = []);
        for (const [a, b] of study.scenarios[scenarioSelect.value].links) {
            state.combatants.find(c => c.id === a).engagedWith.push(b);
            state.combatants.find(c => c.id === b).engagedWith.push(a);
        }
        status.textContent = 'Each character has a separate position. Hover a figure or roster entry to inspect its engagement partners.';
        render();
    });
    document.getElementById('studyDisengage').addEventListener('click', () => {
        state.combatants.forEach(c => c.engagedWith = c.id === 'hero' ? [] : c.engagedWith.filter(id => id !== 'hero'));
        status.textContent = 'The traveller withdraws to their original position. Other engagements remain.';
        render();
    });
    document.getElementById('studyStrike').addEventListener('click', () => attack());
    document.getElementById('studyOffHandStrike').addEventListener('click', () => attack('offHand'));
    document.getElementById('studySpell').addEventListener('click', () => {
        const targetId = selectedTarget;
        scene?.action({ sourceId: 'hero', targetId, kind: 'spell', feedback: attackFeedback() });
        status.textContent = `${spell.name} animation example. No resource costs or outcomes are simulated.`;
    });
    document.getElementById('studySkip').addEventListener('click', () => scene?.finishMovement());
    mobile.addEventListener('change', async () => {
        if (!mobile.matches && !Scene) {
            ({ CombatScene: Scene } = await import('../rendering/CombatScene.js'));
        }
        render();
    });
    document.addEventListener('visibilitychange', () => {
        syncMusic();
        if (document.hidden) {
            scene?.stop();
        } else {
            render();
        }
    });
    window.addEventListener('pagehide', () => {
        music.pause();
        scene?.dispose();
    }, { once: true });
}

musicToggle.addEventListener('change', syncMusic);
musicCueSelect.addEventListener('change', syncMusic);
void loadMusicCues().catch(reportAudioFailure);

init().catch(error => {
    console.error('Visual study failed to load:', error);
    status.textContent = 'The study could not load. Return to the game or reload to try again.';
    document.querySelectorAll('.combat-study-controls button').forEach(button => button.disabled = true);
});
