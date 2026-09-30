import SettlementUI from './SettlementUI.js';
import SettlementManager from '../systems/SettlementManager.js';
import { gameState } from '../core/GameState.js';
import { buildStudyEncounter } from './CombatEncounterSetup.js';

const message = document.getElementById('studyMessages');
try {
    const template = new window.DOMParser().parseFromString(await (await fetch('index.html')).text(), 'text/html');
    for (const id of ['settlementModal', 'buildingModal']) {
        document.getElementById('studyMount').append(template.getElementById(id));
    }
    const read = async name => (await fetch(`data/${name}.json`)).json();
    const data = Object.fromEntries(await Promise.all(['items', 'monsters', 'races', 'classes']
        .map(async name => [name, await read(name)])));
    const encounter = buildStudyEncounter(await read('combatEncounterStudy'), data);
    gameState.set('character', encounter.player);
    const ui = new SettlementUI(null);
    const manager = new SettlementManager(null, ui);
    ui.settlementManager = manager;
    const enter = () => {
        ui.hideSettlementModal();
        const type = document.getElementById('studySettlement').value;
        manager.currentSettlement = { id: `study-${type}`, name: `${type[0].toUpperCase()}${type.slice(1)} square`,
            settlementType: type, x: 0, y: 0, npcs: [] };
        gameState.set('ui.currentSettlement', manager.currentSettlement);
        manager.showSettlementUI();
        message.textContent = 'Visit a building, return to the square, or switch settlement type.';
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
