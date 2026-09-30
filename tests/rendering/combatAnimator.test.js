import { describe, expect, it, vi } from 'vitest';
import * as THREE from '../../vendor/three/three.module.min.js';
import { CombatAnimator } from '../../src/rendering/CombatAnimator.js';

function fixture() {
    const model = new THREE.Group();
    const bone = new THREE.Bone();
    bone.name = 'Spine';
    model.add(bone);
    const clips = [
        new THREE.AnimationClip('Guard', 1, [new THREE.NumberKeyframeTrack('Spine.position[y]', [0, 0.5, 1], [0, 0.1, 0])]),
        new THREE.AnimationClip('Stride', 1, [new THREE.NumberKeyframeTrack('Spine.position[y]', [0, 0.5, 1], [0, 0.2, 0])]),
        new THREE.AnimationClip('Strike', 1, [new THREE.NumberKeyframeTrack('Spine.rotation[x]', [0, 0.5, 1], [0, 1, 0])]),
        new THREE.AnimationClip('Fall', 1, [new THREE.NumberKeyframeTrack('Spine.position[y]', [0, 1], [0, -1])]),
        new THREE.AnimationClip('Ready', 1, [new THREE.NumberKeyframeTrack('Spine.position[y]', [0, 0.5, 1], [0.2, 0.3, 0.2])])
    ];
    const profile = { idle: { clip: 'Guard', poseTime: 0.5 }, walk: { clip: 'Stride', nominalSpeed: 2 },
        idles: { aiming: { clip: 'Ready', poseTime: 0.5 }, unavailable: { clip: 'Missing' } },
        blendDuration: 0.1, actions: { attack: { clip: 'Strike', impact: 0.4 }, hit: { clip: 'Strike' },
            death: { clip: 'Fall', hold: true } },
        conditions: { prone: { clip: 'Fall', poseTime: 0.75 } } };
    return { model, bone, clips, profile, animator: new CombatAnimator(model, clips, profile) };
}

describe('CombatAnimator', () => {
    it('selects an equipment-specific held condition pose and restores the default when unequipped', () => {
        const { animator, profile } = fixture();
        profile.conditions.prone.idles = { aiming: { clip: 'Ready', poseTime: .3 } };
        profile.conditions.prone.offHandIdles = { shield: { clip: 'Guard', poseTime: .2 } };
        animator.update(0, { idle: 'aiming' });
        animator.setCondition('prone');
        expect(animator.current.getClip().name).toBe('Ready');
        expect(animator.current.time).toBe(.3);
        expect(animator.current.paused).toBe(true);
        animator.update(.2, { offHand: 'shield' });
        expect(animator.current.getClip().name).toBe('Guard');
        animator.update(.2, { offHand: null, idle: 'unavailable' });
        expect(animator.current.getClip().name).toBe('Fall');
        animator.setCondition(null);
        expect(animator.current.getClip().name).toBe('Guard');
    });

    it('plays a configured condition exit once and returns to the equipped guard', () => {
        const { animator, profile } = fixture();
        profile.conditions.prone.exit = 'getUp';
        profile.actions.getUp = { clip: 'Ready', preservePose: true };
        animator.update(0, { idle: 'aiming' });
        animator.setCondition('prone');
        animator.setCondition(null);
        const presentation = animator.presentation;
        expect(presentation.spec.preservePose).toBe(true);
        expect(animator.isBusy()).toBe(true);
        animator.update(0.3);
        animator.setCondition(null);
        expect(animator.presentation).toBe(presentation);
        expect(presentation.elapsed).toBeCloseTo(0.3);
        animator.update(1);
        expect(animator.isBusy()).toBe(false);
        expect(animator.current.getClip().name).toBe('Ready');
    });

    it('interrupts recovery when knocked prone again and skips it for reduced motion or missing art', () => {
        const { animator, profile } = fixture();
        profile.conditions.prone.exit = 'getUp';
        profile.actions.getUp = { clip: 'Ready', preservePose: true };
        animator.setCondition('prone');
        animator.setCondition(null);
        animator.update(0.3);
        animator.setCondition('prone');
        expect(animator.isBusy()).toBe(false);
        expect(animator.current.getClip().name).toBe('Fall');
        animator.update(0, { reducedMotion: true });
        animator.setCondition(null);
        expect(animator.isBusy()).toBe(false);
        animator.update(0, { reducedMotion: false });
        profile.conditions.prone.exit = 'unavailableRecovery';
        animator.setCondition('prone');
        animator.setCondition(null);
        expect(animator.isBusy()).toBe(false);
        expect(animator.current.getClip().name).toBe('Guard');
    });

    it('uses an off-hand guard through recovery without overriding walking, conditions or actions', () => {
        const { animator, profile } = fixture();
        profile.offHandIdles = { shield: { clip: 'Ready', poseTime: 0.5 }, unknown: { clip: 'Missing' } };
        animator.update(0.2, { offHand: 'shield' });
        expect(animator.current.getClip().name).toBe('Ready');
        animator.update(0.2);
        expect(animator.current.time).toBeCloseTo(0.4);
        animator.update(0.1, { moving: true, speed: 2 });
        expect(animator.current.getClip().name).toBe('Stride');
        animator.playAction('attack');
        animator.update(0.2, { moving: false });
        expect(animator.current.getClip().name).toBe('Strike');
        animator.update(0.8);
        expect(animator.current.getClip().name).toBe('Ready');
        animator.setCondition('prone');
        expect(animator.current.getClip().name).toBe('Fall');
        animator.setCondition(null);
        animator.update(0, { reducedMotion: true });
        expect(animator.current.getClip().name).toBe('Ready');
        expect(animator.current.time).toBe(0.5);
        animator.update(0, { offHand: 'unknown' });
        expect(animator.current.getClip().name).toBe('Guard');
        animator.update(0, { offHand: null, idle: 'aiming' });
        expect(animator.current.getClip().name).toBe('Ready');
    });
    it('selects the striking hand without mutating a playing action or the shared profile', () => {
        const { animator, profile } = fixture();
        profile.actions.attack.attackHand = 'right';
        profile.actions.attack.handClips = { left: 'Ready' };
        animator.update(0, { attackHand: 'left' });
        animator.playAction('attack');
        expect(animator.current.getClip().name).toBe('Ready');
        animator.update(0.2, { attackHand: 'right' });
        expect(animator.presentation.spec.attackHand).toBe('left');
        animator.finishPresentation();
        animator.playAction('attack');
        expect(animator.current.getClip().name).toBe('Strike');
        expect(profile.actions.attack.attackHand).toBe('right');
    });
    it('selects handed casting clips without changing an active action or the shared profile', () => {
        const { animator, profile } = fixture();
        profile.actions.cast = { clip: 'Strike', gestureHand: 'left', handClips: { right: 'Ready' } };
        animator.update(0, { weaponHand: 'left' });
        animator.playAction('cast');
        expect(animator.current.getClip().name).toBe('Ready');
        expect(animator.presentation.spec.gestureHand).toBe('right');
        animator.update(0.2, { weaponHand: 'right' });
        expect(animator.presentation.spec.gestureHand).toBe('right');
        animator.finishPresentation();
        animator.playAction('cast');
        expect(animator.current.getClip().name).toBe('Strike');
        expect(animator.presentation.spec.gestureHand).toBe('left');
        animator.finishPresentation();
        animator.update(0, { weaponHand: 'left' });
        animator.playAction('cast');
        expect(animator.current.getClip().name).toBe('Ready');
        expect(profile.actions.cast.clip).toBe('Strike');
        expect(profile.actions.cast.gestureHand).toBe('left');
    });

    it('blends support-grip release and recovery without advancing while paused', () => {
        const { animator, profile } = fixture();
        profile.actions.attack.supportGrip = false;
        animator.playAction('attack');
        animator.update(0.025);
        expect(animator.supportGripWeight).toBeCloseTo(0.75);
        animator.update(0.075);
        expect(animator.supportGripWeight).toBeCloseTo(0);
        animator.finishPresentation();
        animator.update(0.05);
        expect(animator.supportGripWeight).toBeCloseTo(0.5);
        animator.update(10, { paused: true });
        expect(animator.supportGripWeight).toBeCloseTo(0.5);
        animator.update(0.05, { paused: false });
        expect(animator.supportGripWeight).toBe(1);
        animator.playAction('attack');
        animator.update(1, { reducedMotion: true });
        expect(animator.supportGripWeight).toBe(1);
    });

    it('selects equipment idles without restarting each frame and falls back for missing assets', () => {
        const { animator, bone } = fixture();
        animator.update(0.2, { idle: 'aiming' });
        expect(animator.current.getClip().name).toBe('Ready');
        animator.update(0.2, { idle: 'aiming' });
        expect(animator.current.time).toBeCloseTo(0.4);
        animator.update(0, { reducedMotion: true });
        expect(bone.position.y).toBeCloseTo(0.3);
        animator.update(0, { idle: 'unavailable' });
        expect(animator.current.getClip().name).toBe('Guard');
        expect(bone.position.y).toBeCloseTo(0.1);
    });

    it('defers an equipment idle until the action finishes and preserves held conditions', () => {
        const { animator } = fixture();
        const impact = vi.fn();
        animator.playAction('attack', { onImpact: impact });
        animator.update(0.2, { idle: 'aiming' });
        expect(animator.current.getClip().name).toBe('Strike');
        expect(impact).not.toHaveBeenCalled();
        animator.update(0.8);
        expect(impact).toHaveBeenCalledOnce();
        expect(animator.current.getClip().name).toBe('Ready');
        animator.setCondition('prone');
        animator.update(0.5, { idle: 'unknown' });
        expect(animator.current.getClip().name).toBe('Fall');
        animator.setCondition(null);
        expect(animator.current.getClip().name).toBe('Guard');
        animator.playAction('death');
        animator.update(2, { idle: 'aiming' });
        expect(animator.current.getClip().name).toBe('Fall');
        animator.resume();
        expect(animator.current.getClip().name).toBe('Ready');
    });

    it('gives actors independent mixers while sharing immutable source clips', () => {
        const a = fixture();
        const model = a.model.clone(true);
        const b = new CombatAnimator(model, a.clips, a.profile);
        a.animator.update(0.25);
        expect(a.bone.position.y).toBeCloseTo(0.05);
        expect(model.children[0].position.y).toBe(0);
        expect(b.isBusy()).toBe(false);
        expect(a.clips[0].tracks[0].values[0]).toBe(0);
    });

    it('blends guard and locomotion, deriving cadence from actual travel speed', () => {
        const { animator } = fixture();
        animator.update(0.1, { moving: true, speed: 4 });
        expect(animator.current.getClip().name).toBe('Stride');
        expect(animator.current.getEffectiveTimeScale()).toBe(2);
        expect(animator.isBusy()).toBe(false);
        animator.update(0.1, { moving: false });
        expect(animator.current.getClip().name).toBe('Guard');
    });

    it('delivers contact then completion once even when a frame crosses both deadlines', () => {
        const { animator } = fixture();
        const events = [];
        animator.playAction('attack', { onImpact: () => events.push('impact'), onComplete: () => events.push('complete') });
        animator.update(0.39);
        expect(events).toEqual([]);
        animator.update(60);
        animator.finishPresentation();
        expect(events).toEqual(['impact', 'complete']);
        expect(animator.isBusy()).toBe(false);
    });

    it('preserves the attack blend and scales its contact deadline with playback speed', () => {
        const { animator, profile } = fixture();
        profile.actions.attack.timeScale = 2;
        const onImpact = vi.fn();
        animator.playAction('attack', { onImpact });
        animator.update(0.05);
        expect(animator.current.getEffectiveWeight()).toBeCloseTo(0.5);
        expect(onImpact).not.toHaveBeenCalled();
        animator.update(0.15);
        expect(onImpact).toHaveBeenCalledTimes(1);
        animator.finishPresentation();
        expect(onImpact).toHaveBeenCalledTimes(1);
    });

    it('settles skipped or interrupted actions without replaying their cues', () => {
        const { animator } = fixture();
        const onImpact = vi.fn();
        const onComplete = vi.fn();
        animator.playAction('attack', { onImpact, onComplete });
        animator.react();
        animator.finishPresentation();
        animator.update(2);
        expect(onImpact).toHaveBeenCalledTimes(1);
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('keeps a still guard under reduced motion and freezes playback while paused', () => {
        const { animator, bone } = fixture();
        animator.update(0.2, { reducedMotion: true, moving: true, speed: 2 });
        expect(bone.position.y).toBeCloseTo(0.1);
        animator.update(20);
        expect(bone.position.y).toBeCloseTo(0.1);
        animator.update(0, { reducedMotion: false });
        const onImpact = vi.fn();
        animator.playAction('attack', { onImpact });
        animator.update(10, { paused: true });
        expect(onImpact).not.toHaveBeenCalled();
        animator.update(0.5, { paused: false });
        expect(onImpact).toHaveBeenCalledTimes(1);
    });

    it('holds a terminal death pose when reduced motion skips the clip', () => {
        const { animator, bone } = fixture();
        animator.update(0, { reducedMotion: true });
        const onComplete = vi.fn();
        animator.playAction('death', { onComplete });
        expect(bone.position.y).toBeCloseTo(-1);
        animator.update(5, { reducedMotion: false, moving: true, speed: 2 });
        expect(bone.position.y).toBeCloseTo(-1);
        expect(animator.isBusy()).toBe(false);
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('returns a revived actor from a terminal death pose to guard', () => {
        const { animator, bone } = fixture();
        animator.playAction('death');
        animator.update(2);
        expect(bone.position.y).toBeCloseTo(-1);
        animator.resume();
        expect(animator.current.getClip().name).toBe('Guard');
        expect(animator.isBusy()).toBe(false);
        expect(bone.position.y).toBeCloseTo(0);
    });

    it('holds a persistent condition pose between actions and clears it back to guard', () => {
        const { animator, bone } = fixture();
        animator.setCondition('prone');
        expect(animator.current.getClip().name).toBe('Fall');
        expect(animator.current.paused).toBe(true);
        expect(bone.position.y).toBeCloseTo(-0.75);
        animator.playAction('attack');
        animator.update(2);
        expect(animator.current.getClip().name).toBe('Fall');
        expect(bone.position.y).toBeCloseTo(-0.75);
        animator.setCondition(null);
        expect(animator.current.getClip().name).toBe('Guard');
        expect(bone.position.y).toBeCloseTo(0);
    });

    it('preserves a held prone pose when standing hit reactions are disabled for that condition', () => {
        const { animator, bone, profile } = fixture();
        profile.conditions.prone.reactions = { hit: false };
        animator.setCondition('prone');
        expect(animator.react('hit')).toBe(false);
        animator.update(0.4);
        expect(animator.current.getClip().name).toBe('Fall');
        expect(bone.position.y).toBeCloseTo(-0.75);
        expect(animator.isBusy()).toBe(false);
        animator.setCondition(null);
        expect(animator.react('hit')).toBe(true);
        expect(animator.current.getClip().name).toBe('Strike');
    });

    it('selects a condition-specific reaction when a compatible clip is configured', () => {
        const { animator, profile } = fixture();
        profile.actions.lowHit = { clip: 'Fall' };
        profile.conditions.prone.reactions = { hit: 'lowHit' };
        animator.setCondition('prone');
        expect(animator.react('hit')).toBe(true);
        expect(animator.current.getClip().name).toBe('Fall');
        animator.update(1.1);
        expect(animator.condition).toBe('prone');
        expect(animator.current.paused).toBe(true);
    });

    it('supports fallback for missing clips and releases outstanding callbacks on disposal', () => {
        const { animator } = fixture();
        expect(animator.playAction('unknown')).toBe(false);
        const onComplete = vi.fn();
        animator.playAction('attack', { onComplete });
        animator.dispose();
        animator.dispose();
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(animator.isBusy()).toBe(false);
        expect(animator.playAction('attack')).toBe(false);
    });
});
