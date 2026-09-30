import * as THREE from '../../vendor/three/three.module.min.js';

/** Per-character clip playback. Timing here describes presentation, never combat rules. */
export class CombatAnimator {
    constructor(model, clips, profile = {}) {
        this.mixer = new THREE.AnimationMixer(model);
        this.profile = profile;
        this.clips = new Map(clips.map(clip => [clip.name, clip]));
        this.actions = new Map();
        this.current = null;
        this.presentation = null;
        this.held = false;
        this.condition = null;
        this.supportGripWeight = 1;
        this.disposed = false;
        this.motion = { moving: false, speed: 0, reducedMotion: false, paused: false };
        this.setBase(true);
    }

    entry(key) {
        const value = key?.startsWith('offHandIdle:') ? this.profile.offHandIdles?.[key.slice('offHandIdle:'.length)] :
            key?.startsWith('idle:') ? this.profile.idles?.[key.slice('idle:'.length)] :
                key === 'idle' || key === 'walk' ? this.profile[key] :
                    this.profile.conditions?.[key] || this.profile.actions?.[key];
        const base = typeof value === 'string' ? { clip: value } : value;
        const override = this.profile.conditions?.[this.condition]?.actions?.[key];
        const resting = key === this.condition &&
            (base?.offHandIdles?.[this.motion.offHand] || base?.idles?.[this.motion.idle]);
        const spec = override || resting ? { ...base, ...resting, ...override } : base;
        if (spec?.attackHand && this.motion.attackHand && spec.attackHand !== this.motion.attackHand) {
            const clip = spec.handClips?.[this.motion.attackHand];
            if (this.clips.has(clip)) {
                return { ...spec, clip, attackHand: this.motion.attackHand };
            }
        }
        if (spec?.gestureHand && spec.gestureHand === this.motion.weaponHand) {
            const hand = spec.gestureHand === 'left' ? 'right' : 'left';
            const clip = spec.handClips?.[hand];
            if (this.clips.has(clip)) {
                return { ...spec, clip, gestureHand: hand };
            }
        }
        return spec;
    }

    action(key) {
        const clipName = this.entry(key)?.clip;
        const cacheKey = `${key}:${clipName}`;
        if (!this.actions.has(cacheKey)) {
            const clip = this.clips.get(clipName);
            if (!clip) {
                return null;
            }
            // Distinct logical states may use the same source clip with different playback settings.
            this.actions.set(cacheKey, this.mixer.clipAction(clip.clone()));
        }
        return this.actions.get(cacheKey);
    }

    transition(action, immediate = false) {
        if (this.current === action) {
            return;
        }
        const previous = this.current;
        action.reset().setEffectiveWeight(1).play();
        if (previous) {
            if (immediate) {
                previous.stop();
            } else {
                previous.crossFadeTo(action, this.profile.blendDuration ?? 0.15, false);
            }
        }
        this.current = action;
    }

    setBase(immediate = false) {
        if (this.held || this.presentation || this.disposed) {
            return;
        }
        const conditionPose = this.condition && this.action(this.condition);
        const staticPose = this.motion.reducedMotion || Boolean(conditionPose);
        const equippedIdle = `idle:${this.motion.idle}`;
        const offHandIdle = `offHandIdle:${this.motion.offHand}`;
        const idle = this.clips.has(this.entry(offHandIdle)?.clip) ? offHandIdle :
            this.clips.has(this.entry(equippedIdle)?.clip) ? equippedIdle : 'idle';
        const key = conditionPose ? this.condition :
            this.motion.moving && !staticPose && this.action('walk') ? 'walk' : idle;
        const action = this.action(key);
        if (!action) {
            return;
        }
        this.transition(action, immediate || staticPose);
        action.setLoop(conditionPose ? THREE.LoopOnce : THREE.LoopRepeat, conditionPose ? 1 : Infinity);
        action.clampWhenFinished = Boolean(conditionPose);
        action.paused = staticPose;
        if (staticPose) {
            action.time = this.entry(key).poseTime ?? (conditionPose ? action.getClip().duration : 0);
        }
        const nominalSpeed = this.entry(key).nominalSpeed;
        action.setEffectiveTimeScale(key === 'walk' && nominalSpeed > 0
            ? Math.max(0, this.motion.speed) / nominalSpeed : 1);
        this.mixer.update(0);
    }

    /** Persistent rules conditions select a held base pose without interrupting an active action. */
    setCondition(key = null) {
        const next = key && this.entry(key)?.clip ? key : null;
        if (this.condition === next || this.disposed) {
            return;
        }
        const exit = !next && this.entry(this.condition)?.exit;
        this.condition = next;
        if (next && this.presentation?.spec.preservePose) {
            this.finishPresentation();
        }
        if (exit && !this.held && !this.motion.reducedMotion && this.playAction(exit)) {
            return;
        }
        if (!this.presentation && !this.held) {
            this.current?.stop();
            this.current = null;
            this.setBase(true);
        }
    }

    /** Returns false when no authored clip exists, allowing the scene's existing fallback. */
    playAction(key, { onImpact, onComplete } = {}) {
        if (this.disposed) {
            return false;
        }
        const action = this.action(key);
        if (!action) {
            return false;
        }
        this.finishPresentation();
        this.held = false;
        const spec = this.entry(key);
        const timeScale = spec.timeScale > 0 ? spec.timeScale : 1;
        action.reset();
        this.transition(action);
        action.setLoop(THREE.LoopOnce, 1).setEffectiveTimeScale(timeScale).play();
        action.clampWhenFinished = true;
        this.presentation = {
            action, spec, elapsed: 0, duration: action.getClip().duration / timeScale,
            impact: Math.max(0, Math.min(1, spec.impact ?? 0.5)), onImpact, onComplete,
            impacted: false
        };
        if (this.motion.reducedMotion) {
            this.finishPresentation();
        }
        return true;
    }

    react(key = 'hit') {
        const reaction = this.entry(this.condition)?.reactions?.[key];
        return reaction === false ? false : this.playAction(reaction || key);
    }

    deliverImpact(presentation) {
        if (!presentation.impacted) {
            presentation.impacted = true;
            presentation.onImpact?.();
        }
    }

    update(delta, motion = {}) {
        if (this.disposed) {
            return;
        }
        Object.assign(this.motion, motion);
        if (this.motion.paused) {
            return;
        }
        if (this.motion.reducedMotion && this.presentation) {
            this.finishPresentation();
        }
        this.setBase();
        const step = Number.isFinite(delta) ? Math.max(0, delta) : 0;
        this.mixer.update(step);
        const gripTarget = this.presentation?.spec.supportGrip === false ? 0 : 1;
        const gripStep = this.motion.reducedMotion ? 1 : step / (this.profile.blendDuration || 0.15);
        this.supportGripWeight += Math.sign(gripTarget - this.supportGripWeight) *
            Math.min(Math.abs(gripTarget - this.supportGripWeight), gripStep);
        const presentation = this.presentation;
        if (!presentation) {
            return;
        }
        presentation.elapsed += step;
        if (presentation.elapsed >= presentation.duration * presentation.impact) {
            this.deliverImpact(presentation);
        }
        if (this.presentation === presentation && presentation.elapsed >= presentation.duration) {
            this.finishPresentation();
        }
    }

    /** Skipping, interruption and disposal settle each outstanding cue exactly once. */
    finishPresentation() {
        const presentation = this.presentation;
        if (!presentation) {
            return;
        }
        this.presentation = null;
        this.held = Boolean(presentation.spec.hold);
        if (this.held) {
            for (const action of this.actions.values()) {
                if (action !== presentation.action) {
                    action.stop();
                }
            }
            presentation.action.stopFading().setEffectiveWeight(1);
            presentation.action.time = presentation.action.getClip().duration;
            presentation.action.paused = true;
            this.mixer.update(0);
        } else {
            this.setBase(this.motion.reducedMotion);
        }
        try {
            this.deliverImpact(presentation);
        } finally {
            presentation.onComplete?.();
        }
    }

    isBusy() {
        return Boolean(this.presentation);
    }

    resume() {
        if (this.disposed) {
            return;
        }
        this.finishPresentation();
        this.held = false;
        this.current?.stop();
        this.current = null;
        this.setBase(true);
    }

    dispose() {
        try {
            this.finishPresentation();
        } finally {
            this.disposed = true;
            this.mixer.stopAllAction();
            this.mixer.uncacheRoot(this.mixer.getRoot());
            this.actions.clear();
        }
    }
}
