import { RULES } from '../core/rulesEngine.js';
import { gameState } from '../core/GameState.js';

/** Owns optional settlement scenery without delaying the existing service UI. */
export class SettlementSceneUI {
    constructor(ui) {
        this.ui = ui;
        this.host = document.getElementById('settlementSceneHost');
        this.button = document.getElementById('settlementSceneToggle');
        this.status = document.getElementById('settlementSceneStatus');
        this.map = document.querySelector('#settlementModal .town-map');
        this.mobile = window.matchMedia('(max-width: 767px)');
        this.enabled = true;
        this.generation = 0;
        this.button?.addEventListener('click', () => {
            this.enabled = !this.enabled;
            void this.refresh();
        });
        this.mobile.addEventListener('change', () => void this.refresh());
    }

    show(settlement) {
        this.settlement = settlement;
        this.suspended = false;
        void this.refresh();
    }

    async refresh() {
        if (!this.host || !this.button || !this.status || !this.map) {
            return;
        }
        const generation = ++this.generation;
        this.scene?.dispose();
        this.scene = null;
        this.map.hidden = false;
        this.host.hidden = true;
        this.status.textContent = '';
        this.button.hidden = !RULES.settlementPresentation.enabled;
        this.button.disabled = this.mobile.matches;
        this.button.textContent = this.mobile.matches ? '3D view · desktop' :
            this.enabled ? 'Use service list' : 'Show settlement';
        this.button.setAttribute('aria-pressed', String(this.enabled && !this.mobile.matches));
        if (!this.settlement || !this.enabled || this.mobile.matches || !RULES.settlementPresentation.enabled) {
            return;
        }
        this.status.textContent = 'Preparing the square… Services are available below.';
        try {
            const { SettlementScene } = await import('../rendering/SettlementScene.js');
            if (generation !== this.generation) {
                return;
            }
            this.host.hidden = false;
            const settlement = this.settlement;
            const scene = new SettlementScene(this.host, {
                settlement, character: gameState.get('character'),
                onError: error => this.fail(error, generation),
                onEnter: building => {
                    if (generation === this.generation && !this.suspended &&
                        this.ui.settlementManager.currentSettlement === settlement) {
                        this.ui.settlementManager.enterBuilding(building);
                    }
                }
            });
            this.scene = scene;
            await scene.ready;
            if (generation !== this.generation) {
                return;
            }
            this.map.hidden = true;
            this.status.textContent = 'Choose a building to visit.';
            scene.setActive(!this.suspended);
        } catch (error) {
            this.fail(error, generation);
        }
    }

    fail(error, generation) {
        if (generation !== this.generation) {
            return;
        }
        ++this.generation;
        this.scene?.dispose();
        this.scene = null;
        this.host.hidden = true;
        this.map.hidden = false;
        this.status.textContent = 'The scene is unavailable. All services remain available below.';
        console.warn('Settlement scenery unavailable:', error);
    }

    setActive(active) {
        this.suspended = !active;
        this.scene?.setActive(active);
    }

    hide() {
        ++this.generation;
        this.settlement = null;
        this.scene?.dispose();
        this.scene = null;
    }
}
