import SettlementUI from './SettlementUI.js';
import { hydrateIcons } from './Iconography.js';
import SettlementManager from '../systems/SettlementManager.js';
import MerchantManager from '../systems/MerchantManager.js';
import { gameState } from '../core/GameState.js';
import { buildStudyEncounter } from './CombatEncounterSetup.js';
import { selectBuildingInterior } from './BuildingInteriorArt.js';
import { isBuildingPersonCompatible } from '../systems/BuildingPresentation.js';
import { loadSettlementSoundscapes, prepareSettlementSoundscapes } from '../systems/SettlementSoundscapes.js';

const message = document.getElementById('studyMessages');
try {
    const template = new window.DOMParser().parseFromString(await (await fetch('index.html')).text(), 'text/html');
    for (const id of ['settlementModal', 'buildingModal', 'npcDialogueModal', 'restModal', 'tradingModal']) {
        document.getElementById('studyMount').append(template.getElementById(id));
    }
    hydrateIcons(document.getElementById('studyMount'));
    const read = async name => (await fetch(`data/${name}.json`)).json();
    const data = Object.fromEntries(await Promise.all(['items', 'monsters', 'races', 'classes']
        .map(async name => [name, await read(name)])));
    const encounter = buildStudyEncounter(await read('combatEncounterStudy'), data);
    const tavern = await read('tavernStudy');
    const interiors = await read('buildingInteriors');
    const peopleCatalogue = await read('buildingPeople');
    const soundscapes = await loadSettlementSoundscapes('nexus-verge');
    const { cultures } = await read('cultures');
    const params = new window.URLSearchParams(window.location.search);
    gameState.set('character', encounter.player);
    gameState.set('worldConfig.campaignId', 'nexus-verge');
    window.gameState = gameState;
    const ui = new SettlementUI(null, new MerchantManager('settlement-interior-study'));
    const manager = new SettlementManager(null, ui);
    ui.settlementManager = manager;
    const controls = document.querySelector('.study-controls');
    const cultureLabel = document.createElement('label');
    cultureLabel.textContent = 'Music tradition ';
    const cultureChoice = document.createElement('select');
    cultureChoice.id = 'studyCulture';
    for (const culture of [{ id: '', name: 'Unspecified (ambience only)' }, ...cultures]) {
        const option = document.createElement('option');
        option.value = culture.id;
        option.textContent = culture.name;
        cultureChoice.append(option);
    }
    cultureChoice.value = cultures.some(culture => culture.id === params.get('culture')) ? params.get('culture') : '';
    cultureLabel.append(cultureChoice);
    controls.append(cultureLabel);
    const peopleControls = document.createElement('div');
    peopleControls.className = 'study-people-controls';
    const artworkChoices = {};
    for (const slot of ['keeper', 'patron1', 'patron2']) {
        if (params.has(slot)) {
            artworkChoices[slot] = params.get(slot);
        }
    }
    const refreshPeople = () => {
        peopleControls.replaceChildren();
        const settlement = manager.currentSettlement;
        const config = selectBuildingInterior(interiors, buildingChoice.value, settlement, ui.interiorStudyVariant);
        ui.interiorStudyConfig = undefined;
        if (!config || !settlement) {
            return;
        }
        const remaining = settlement.npcs.filter(npc => npc.building === buildingChoice.value);
        const used = new Set();
        const people = [];
        for (const slot of config.people || []) {
            const index = remaining.findIndex(npc => !slot.roles || slot.roles.includes(npc.role));
            if (index < 0) {
                continue;
            }
            const [npc] = remaining.splice(index, 1);
            const compatible = peopleCatalogue.people.filter(person =>
                isBuildingPersonCompatible(person, slot, npc, peopleCatalogue.version) && !used.has(person.id));
            const chosen = compatible.find(person => person.id === artworkChoices[slot.id]) || compatible[0];
            const label = document.createElement('label');
            label.textContent = `${npc.name} artwork `;
            const choice = document.createElement('select');
            choice.id = `studyArtwork-${slot.id}`;
            choice.disabled = !compatible.length;
            for (const person of compatible) {
                const option = document.createElement('option');
                option.value = person.id;
                option.textContent = person.id;
                choice.append(option);
            }
            if (chosen) {
                choice.value = chosen.id;
                used.add(chosen.id);
                people.push({ ...slot, image: chosen.image, npcId: npc.id });
            }
            choice.addEventListener('change', () => {
                artworkChoices[slot.id] = choice.value;
                refreshPeople();
                ui.renderBuildingContent(manager.currentBuilding);
            });
            label.append(choice);
            peopleControls.append(label);
        }
        ui.interiorStudyConfig = { ...config, people };
    };
    const buildingLabel = document.createElement('label');
    buildingLabel.textContent = 'Visit ';
    const buildingChoice = document.createElement('select');
    buildingChoice.id = 'studyBuilding';
    for (const [value, title] of [['', 'Settlement square'], ['tavern', 'Tavern'], ['merchant', 'Merchant'],
        ['blacksmith', 'Blacksmith'], ['greathall', 'Great hall']]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = title;
        buildingChoice.append(option);
    }
    buildingChoice.value = Object.hasOwn(interiors, params.get('building')) ? params.get('building') : '';
    buildingLabel.append(buildingChoice);
    const variantLabel = document.createElement('label');
    variantLabel.textContent = 'Interior version ';
    const variantChoice = document.createElement('select');
    variantChoice.id = 'studyInteriorVariant';
    const refreshVariants = () => {
        variantChoice.replaceChildren();
        const variants = interiors[buildingChoice.value]?.variants || [];
        for (let index = -1; index < variants.length; index++) {
            const option = document.createElement('option');
            option.value = index < 0 ? '' : String(index);
            option.textContent = index < 0 ? 'Settlement default' : `Version ${index + 1}`;
            variantChoice.append(option);
        }
        variantChoice.value = ui.interiorStudyVariant === undefined ? '' : String(ui.interiorStudyVariant);
        variantChoice.disabled = !variants.length;
    };
    if (params.get('variant') === '1' || params.get('variant') === '2') {
        ui.interiorStudyVariant = Number(params.get('variant')) - 1;
    }
    refreshVariants();
    const enterBuilding = manager.enterBuilding.bind(manager);
    manager.enterBuilding = type => {
        buildingChoice.value = type;
        refreshVariants();
        refreshPeople();
        enterBuilding(type);
    };
    variantLabel.append(variantChoice);
    controls.append(buildingLabel, variantLabel, peopleControls);
    const visit = () => {
        ui.closeNPCDialogue();
        ui.closeTradingModal();
        manager.exitBuilding();
        if (buildingChoice.value) {
            manager.enterBuilding(buildingChoice.value);
        } else {
            refreshPeople();
        }
    };
    buildingChoice.addEventListener('change', () => {
        refreshVariants();
        visit();
    });
    variantChoice.addEventListener('change', () => {
        ui.interiorStudyVariant = variantChoice.value === '' ? undefined : Number(variantChoice.value);
        refreshPeople();
        if (manager.currentBuilding) {
            ui.renderBuildingContent(manager.currentBuilding);
        }
    });
    document.getElementById('closeDialogueBtn').addEventListener('click', () => ui.closeNPCDialogue());
    const enter = () => {
        manager.exitBuilding();
        ui.hideSettlementModal();
        const type = document.getElementById('studySettlement').value;
        manager.currentSettlement = { id: `study-${type}`, name: `${type[0].toUpperCase()}${type.slice(1)} square`,
            settlementType: type, x: 0, y: 0, npcs: window.structuredClone(tavern.npcs) };
        for (const npc of manager.currentSettlement.npcs) {
            npc.culture = cultureChoice.value || null;
        }
        prepareSettlementSoundscapes(manager.currentSettlement, { seed: 'settlement-study', catalogue: soundscapes });
        gameState.set('ui.currentSettlement', manager.currentSettlement);
        manager.showSettlementUI();
        message.textContent = 'Visit a building, return to the square, or switch settlement type.';
        visit();
    };
    document.getElementById('studySettlement').addEventListener('change', enter);
    cultureChoice.addEventListener('change', enter);
    document.getElementById('studyReenter').addEventListener('click', enter);
    // Exposed for repeatable browser checks of the real integration boundary.
    window.settlementStudy = { ui, manager, enter };
    enter();
} catch (error) {
    message.textContent = `The study could not load: ${error.message}`;
    console.error(error);
}
