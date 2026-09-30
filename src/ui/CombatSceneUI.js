import { RULES } from '../core/rulesEngine.js';
import { gameState } from '../core/GameState.js';
import audioManager from '../systems/AudioManager.js';
import { combatActionVisual, combatPresentationSnapshot, combatSceneConfig, stageEncounterSnapshot } from './CombatPresentation.js';

const pause = () => new Promise(resolve => setTimeout(resolve, 50));

export class CombatSceneUI {
    constructor(onSelect, { getManager, onPresented, onBusy, onFloatingText }) {
        Object.assign(this, { onSelect, getManager, onPresented, onBusy, onFloatingText });
        this.button = document.getElementById('combatSceneToggle');
        this.skip = document.getElementById('combatSceneSkip');
        this.stage = document.getElementById('combatSceneStage');
        this.content = document.querySelector('#combatScreen .combat-content');
        this.status = document.getElementById('combatSceneStatus');
        this.mobile = window.matchMedia('(max-width: 767px)');
        this.enabled = false;
        this.generation = 0;
        this.endCallbacks = [];
        this.effectQueue = [];
        this.actionStack = [];
        this.button.hidden = !RULES.combatPresentation.enabled;
        this.button.addEventListener('click', () => {
            if (this.enabled) {
                this.useCards();
            } else {
                this.enabled = true;
                this.reason = '';
                void this.refresh();
            }
        });
        this.skip.addEventListener('click', () => this.scene?.finishPresentation());
        this.mobile.addEventListener('change', () => void this.refresh());
        document.addEventListener('visibilitychange', () => void this.refresh());
        document.addEventListener('keydown', event => {
            const cameraControl = event.target.closest?.('.combat-scene-toolbar, .combat-scene-camera');
            if (this.isBusy() && !event.ctrlKey && !event.metaKey && event.key !== 'Tab' &&
                !(cameraControl && ['Enter', ' '].includes(event.key))) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }, true);
        gameState.subscribe('combat.presentationAction', event => this.beginAction(event));
        gameState.subscribe('combat.floatingText', event => this.feedback(event));
    }

    isShowing() {
        return Boolean(this.enabled && RULES.combatPresentation.enabled && this.scene && !this.loading &&
            !this.mobile.matches && !document.hidden);
    }

    isBusy() {
        return Boolean(this.record || this.playing || this.moving);
    }

    setBusy() {
        this.skip.hidden = !this.isBusy() || this.loading;
        this.skip.disabled = !this.playing && !this.moving;
        this.onBusy(this.isBusy());
    }

    snapshot(overrides) {
        return combatPresentationSnapshot(this.getManager(), this.config, this.data, overrides);
    }

    playSounds(record, impactOnly = false) {
        if (!impactOnly && record.prefix) {
            this.playReleaseSounds(record.prefix);
            this.playSounds(record.prefix);
        }
        const remaining = [];
        for (const sound of record.sounds.splice(0)) {
            if (impactOnly && !['playCombatSound', 'playHealSound'].includes(sound.method)) {
                remaining.push(sound);
            } else if (!document.hidden) {
                audioManager[sound.method](...sound.args);
            }
        }
        record.sounds.push(...remaining);
    }

    playReleaseSounds(record) {
        for (const sound of record.releaseSounds?.splice(0) || []) {
            if (!document.hidden) {
                audioManager.playCombatRelease(...sound.args);
            }
        }
    }

    audio(method, args) {
        if (this.record) {
            if (method === 'playCombatRelease') {
                this.record.releaseSounds.push({ method, args });
            } else {
                this.record.sounds.push({ method, args });
            }
        } else {
            audioManager[method](...args);
        }
    }

    beginAction(event) {
        if (!this.isShowing()) {
            return;
        }
        const appearance = this.displayed?.combatants.find(actor => actor.id === event.sourceId)?.appearance;
        const visual = combatActionVisual(this.config, event, appearance);
        if (!visual || !this.config.animation.actionProfiles[visual.action] || this.playing || this.moving || this.loading) {
            this.useCards('This action has no matching 3D preview. Using combat cards.');
            return;
        }
        if (this.record) {
            // A resolved trigger (for example a miss) must appear before its nested reaction.
            if (this.record.feedback.length) {
                const parent = this.record;
                parent.prefix = { ...parent, snapshot: this.snapshot(new Map([[parent.event.sourceId, {
                    weaponId: parent.event.weaponId, weaponSlot: parent.event.weaponSlot, visual: parent.visual
                }]])) };
                parent.feedback = [];
                parent.sounds = [];
                parent.releaseSounds = [];
                parent.presentationStarted = true;
            }
            this.actionStack ||= [];
            this.actionStack.push(this.record);
        }
        const presentationEvent = { ...event, kind: visual.action, motion: visual.motion,
            weaponSlot: visual.weaponSlot ?? event.weaponSlot };
        this.record = { event: presentationEvent, visual, sounds: [], releaseSounds: [], feedback: [] };
        this.setBusy();
    }

    feedback(event) {
        if (event.type === 'healing') {
            if (this.record) {
                this.record.sounds.push({ method: 'playHealSound', args: [] });
            } else if (!this.isShowing()) {
                audioManager.playHealSound();
            }
        }
        if (this.record) {
            this.record.feedback.push(event);
        } else if (!this.record && this.isShowing() && event.sourceId &&
            ['healing', 'buff', 'condition', 'damage', 'critical', 'miss'].includes(event.type)) {
            this.effectQueue.push(event);
            if (!this.effectPlayback) {
                this.effectPlayback = this.presentEffectQueue().finally(() => {
                    this.effectPlayback = null;
                    if (this.effectQueue.length && this.isShowing()) {
                        this.feedback(this.effectQueue.shift());
                    }
                });
            }
        } else if (this.isShowing()) {
            this.useCards('This effect uses combat cards while its 3D presentation is unfinished.');
            this.onFloatingText(event);
        }
    }

    async presentEffectQueue() {
        this.playing = true;
        this.setBusy();
        try {
            while (this.effectQueue.length && this.isShowing()) {
                const event = this.effectQueue.shift();
                const { state, reason } = this.snapshot();
                const ids = new Set(state?.combatants?.map(actor => actor.id));
                if (reason || !ids.has(event.sourceId) || !ids.has(event.combatantId)) {
                    if (event.type === 'healing') {
                        audioManager.playHealSound();
                    }
                    this.onFloatingText(event);
                    this.useCards(reason || 'This effect has no matching 3D combatant. Using combat cards.');
                    break;
                }
                const staged = stageEncounterSnapshot(state, this.displayed, event.combatantId);
                this.scene.update(staged);
                const visual = this.config.effectVisuals?.[event.effectType];
                let effectSoundPlayed = false;
                const playEffectSound = () => {
                    if (event.type === 'healing' && !effectSoundPlayed) {
                        effectSoundPlayed = true;
                        audioManager.playHealSound();
                    }
                };
                if (visual?.feedbackOnly || ['damage', 'critical', 'miss'].includes(event.type)) {
                    this.scene.feedback(event);
                } else {
                    this.scene.action({
                        sourceId: event.sourceId,
                        targetId: event.combatantId,
                        kind: event.type === 'healing' ? 'healing' : 'spell',
                        feedback: event,
                        onImpact: event.type === 'healing' ? playEffectSound : undefined
                    });
                }
                await this.waitForScene();
                playEffectSound();
                if (this.isShowing()) {
                    this.scene.update(state);
                    await this.waitForScene();
                }
                this.displayed = state;
            }
        } catch (error) {
            console.warn('Combat effect playback unavailable:', error);
            this.useCards('3D effect playback unavailable. Combat cards are still available.', true);
        } finally {
            this.playing = false;
            this.setBusy();
            this.update(this.state);
            this.flushEndCallbacks();
        }
    }

    async waitForScene() {
        while (this.scene?.isBusy()) {
            if (!this.isShowing()) {
                this.scene.finishPresentation();
            }
            await pause();
        }
    }

    async waitForPlayback() {
        while (this.isBusy() || this.scene?.isBusy()) {
            if (!this.isShowing()) {
                this.scene?.finishPresentation();
            }
            await pause();
        }
    }

    async completeAction() {
        const record = this.record;
        if (!record) {
            return;
        }
        for (const parent of this.actionStack || []) {
            if (parent.prefix) {
                const prefix = parent.prefix;
                delete parent.prefix;
                await this.presentActionRecord(prefix);
            }
        }
        await this.presentActionRecord(record);
    }

    async presentActionRecord(record) {
        this.playing = true;
        this.setBusy();
        try {
            const { state, reason } = record.snapshot || this.snapshot(new Map([[record.event.sourceId, {
                weaponId: record.event.weaponId, weaponSlot: record.event.weaponSlot, visual: record.visual
            }]]));
            if (record.presentationStarted && !record.feedback.length) {
                return;
            }
            if (reason || !record.feedback.length) {
                this.useCards(reason || 'This action uses combat cards while its 3D presentation is unfinished.');
                return;
            }
            const affected = [...new Set(record.feedback.map(event => event.combatantId))];
            const staged = stageEncounterSnapshot(state, this.displayed, affected);
            if (this.isShowing()) {
                this.scene.update({ ...staged, approach: record.event });
                const primary = record.feedback.find(event => event.combatantId === record.event.targetId &&
                    ['damage', 'critical', 'miss'].includes(event.type)) ||
                    record.feedback.find(event => event.combatantId === record.event.targetId) || record.feedback[0];
                const recipients = new Set([primary.combatantId]);
                const secondaryFeedback = !record.presentationStarted &&
                    ['spell', 'healing'].includes(record.event.kind) ? record.feedback.filter(event => {
                        if (recipients.has(event.combatantId)) {
                            return false;
                        }
                        recipients.add(event.combatantId);
                        return true;
                    }) : [];
                if (record.presentationStarted) {
                    this.scene.feedback({ ...primary, onImpact: () => this.playSounds(record, true) });
                } else {
                    this.scene.action({ ...record.event, targetId: primary.combatantId, feedback: primary, secondaryFeedback,
                        onRelease: () => this.playReleaseSounds(record),
                        onImpact: () => this.playSounds(record, true) });
                }
                await this.waitForScene();
                if (this.isShowing()) {
                    for (const feedback of record.feedback.filter(event => event !== primary &&
                        !secondaryFeedback.includes(event))) {
                        this.scene.feedback(feedback);
                        await this.waitForScene();
                    }
                    this.scene.update(state);
                    await this.waitForScene();
                }
            }
            this.displayed = state;
        } catch (error) {
            console.warn('Combat playback unavailable:', error);
            this.useCards('3D playback unavailable. Combat cards are still available.', true);
        } finally {
            this.playReleaseSounds(record);
            this.playSounds(record);
            if (this.record === record) {
                this.record = this.actionStack?.pop() || null;
            }
            this.playing = false;
            this.setBusy();
            this.update(this.state);
            this.flushEndCallbacks();
        }
    }

    afterPlayback(callback) {
        if (this.isBusy()) {
            this.endCallbacks.push(callback);
        } else {
            callback();
        }
    }

    flushEndCallbacks() {
        if (!this.isBusy()) {
            for (const callback of this.endCallbacks.splice(0)) {
                callback();
            }
        }
    }

    update(state) {
        this.state = state;
        if (!state?.active && this.loading) {
            this.disposeScene();
            this.setBusy();
        }
        if (this.isBusy()) {
            return;
        }
        if (!state?.active) {
            this.disposeScene();
            this.displayed = null;
        } else if (this.isShowing()) {
            try {
                const snapshot = this.snapshot();
                if (snapshot.reason) {
                    this.useCards(snapshot.reason);
                    return;
                }
                this.displayed = snapshot.state;
                this.scene.update(this.displayed);
                if (this.scene.isBusy()) {
                    this.moving = true;
                    this.setBusy();
                    void this.waitForScene().finally(() => {
                        this.moving = false;
                        this.setBusy();
                        this.update(this.state);
                        this.flushEndCallbacks();
                    });
                    return;
                }
            } catch (error) {
                console.warn('Combat scene update failed:', error);
                this.useCards('3D view unavailable. Combat cards are still available.', true);
                return;
            }
        }
        this.onPresented(state);
        void this.refresh();
    }

    disposeScene() {
        this.generation++;
        this.loading = false;
        this.effectQueue = [];
        this.actionStack = [];
        this.scene?.finishPresentation();
        this.scene?.dispose();
        this.scene = null;
    }

    useCards(message = '', failed = false) {
        this.enabled = false;
        this.reason = message;
        this.effectQueue = [];
        this.scene?.finishPresentation();
        this.scene?.stop();
        if (this.record) {
            this.playSounds(this.record);
            this.record = null;
        }
        for (const record of this.actionStack?.splice(0) || []) {
            this.playSounds(record);
        }
        if (failed || this.loading) {
            this.disposeScene();
        }
        this.setBusy();
        if (!this.isBusy()) {
            this.onPresented(this.state);
            this.flushEndCallbacks();
        }
        void this.refresh();
    }

    createScene(Scene, combatants) {
        return new Scene(this.stage, this.config, {
            combatants,
            onSelect: id => {
                if (!this.isBusy()) {
                    this.onSelect(id);
                }
            },
            onFailure: () => this.useCards('3D view unavailable. Combat cards are still available.', true)
        });
    }

    async refresh() {
        const visible = this.enabled && RULES.combatPresentation.enabled && this.state?.active &&
            !this.mobile.matches && !document.hidden;
        this.button.disabled = this.mobile.matches;
        this.button.textContent = this.mobile.matches ? '3D preview · desktop' : this.enabled ? 'Show cards' : 'Show 3D preview';
        this.button.setAttribute('aria-pressed', String(this.enabled));
        const sceneReady = Boolean(visible && this.scene && !this.loading);
        this.stage.hidden = !sceneReady;
        this.content.classList.toggle('has-combat-scene', sceneReady);
        if (!visible) {
            this.needsSync = true;
            this.scene?.finishPresentation();
            this.scene?.stop();
            this.status.textContent = this.reason || '';
            return;
        }
        if (this.loading) {
            return;
        }
        if (this.scene) {
            this.scene.start();
            this.status.textContent = this.config.preview.status;
            if (this.needsSync && !this.isBusy()) {
                this.needsSync = false;
                this.update(this.state);
            }
            return;
        }
        this.loading = true;
        this.setBusy();
        const generation = ++this.generation;
        this.status.textContent = 'Loading combat scene…';
        try {
            const [{ CombatScene }, config, items, monsters] = await Promise.all([
                import('../rendering/CombatScene.js'), ...['combatScene', 'items', 'monsters'].map(async name => {
                    const response = await fetch(`data/${name}.json`);
                    if (!response.ok) {
                        throw new Error(`${name}: HTTP ${response.status}`);
                    }
                    return response.json();
                })
            ]);
            if (generation !== this.generation) {
                return;
            }
            this.config = combatSceneConfig(config, this.getManager().presentationContext);
            this.data = { items: Object.values(items).filter(Array.isArray).flat(), monsters: monsters.monsters };
            const snapshot = this.snapshot();
            if (snapshot.reason) {
                this.loading = false;
                this.useCards(snapshot.reason);
                return;
            }
            const scene = this.createScene(CombatScene, snapshot.state.combatants);
            this.scene = scene;
            let timeout;
            try {
                const prepare = async () => {
                    await scene.ready;
                    if (generation !== this.generation || !this.state?.active) {
                        return;
                    }
                    const initial = this.snapshot();
                    if (!initial.reason) {
                        scene.update(initial.state);
                        await Promise.all(scene.texturePromises);
                        await scene.renderer.compileAsync(scene.scene, scene.camera);
                    }
                };
                await Promise.race([prepare(), new Promise((_, reject) => {
                    timeout = setTimeout(() => reject(new Error('3D scene load timed out')),
                        RULES.combatPresentation.loadTimeoutMs);
                })]);
            } finally {
                clearTimeout(timeout);
            }
            if (generation !== this.generation || !this.state?.active) {
                if (!scene.disposed) {
                    scene.dispose();
                }
                return;
            }
            const latest = this.snapshot();
            if (latest.reason) {
                this.useCards(latest.reason, true);
                return;
            }
            const missingCreature = latest.state.combatants.some(actor => {
                const appearance = this.config.appearances[actor.appearance];
                return appearance.creature && !scene.artAssets.templates.has(appearance.asset);
            });
            if (missingCreature) {
                this.useCards('A creature model could not be loaded. Using combat cards.', true);
                return;
            }
            this.loading = false;
            this.setBusy();
            await this.refresh();
            this.update(this.state);
        } catch (error) {
            if (generation === this.generation) {
                console.warn('Combat scene unavailable:', error);
                this.useCards('3D view unavailable. Combat cards are still available.', true);
            }
        }
    }
}
