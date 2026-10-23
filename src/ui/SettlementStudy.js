import SettlementUI from './SettlementUI.js';
import SettlementManager from '../systems/SettlementManager.js';
import MerchantManager from '../systems/MerchantManager.js';
import { gameState } from '../core/GameState.js';
import { buildStudyEncounter } from './CombatEncounterSetup.js';

const message = document.getElementById('studyMessages');
try {
    const template = new window.DOMParser().parseFromString(await (await fetch('index.html')).text(), 'text/html');
    for (const id of ['settlementModal', 'buildingModal', 'npcDialogueModal', 'restModal', 'tradingModal']) {
        document.getElementById('studyMount').append(template.getElementById(id));
    }
    const read = async name => (await fetch(`data/${name}.json`)).json();
    const data = Object.fromEntries(await Promise.all(['items', 'monsters', 'races', 'classes']
        .map(async name => [name, await read(name)])));
    const encounter = buildStudyEncounter(await read('combatEncounterStudy'), data);
    const tavern = await read('tavernStudy');
    const interiors = await read('buildingInteriors');
    const params = new window.URLSearchParams(window.location.search);
    gameState.set('character', encounter.player);
    window.gameState = gameState;
    const ui = new SettlementUI(null, new MerchantManager('settlement-interior-study'));
    const manager = new SettlementManager(null, ui);
    ui.settlementManager = manager;
    const controls = document.querySelector('.study-controls');
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
        enterBuilding(type);
    };
    variantLabel.append(variantChoice);
    controls.append(buildingLabel, variantLabel);
    const visit = () => {
        ui.closeNPCDialogue();
        ui.closeTradingModal();
        manager.exitBuilding();
        if (buildingChoice.value) {
            manager.enterBuilding(buildingChoice.value);
        }
    };
    buildingChoice.addEventListener('change', () => {
        refreshVariants();
        visit();
    });
    variantChoice.addEventListener('change', () => {
        ui.interiorStudyVariant = variantChoice.value === '' ? undefined : Number(variantChoice.value);
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
        gameState.set('ui.currentSettlement', manager.currentSettlement);
        manager.showSettlementUI();
        message.textContent = 'Visit a building, return to the square, or switch settlement type.';
        visit();
    };
    document.getElementById('studySettlement').addEventListener('change', enter);
    document.getElementById('studyReenter').addEventListener('click', enter);
    // Exposed for repeatable browser checks of the real integration boundary.
    window.settlementStudy = { ui, manager, enter };
    enter();
} catch (error) {
    message.textContent = `The study could not load: ${error.message}`;
    console.error(error);
}
