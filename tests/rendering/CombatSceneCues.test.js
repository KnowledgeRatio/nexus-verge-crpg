import { describe, it, expect, vi } from 'vitest';
import { CombatScene } from '../../src/rendering/CombatScene.js';
import { readFileSync } from 'node:fs';
import * as THREE from '../../vendor/three/three.module.min.js';

function scene() {
    return Object.assign(Object.create(CombatScene.prototype), {
        actors: new Map(), actions: [], feedbackQueue: [], effects: [], finishMovement: vi.fn()
    });
}

describe('Combat impact cues', () => {
    it('uses motion reach without moving the recipient or changing later short attacks', () => {
        const view = scene();
        view.config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url), 'utf8'));
        view.motionPreference = { matches: false };
        const source = { combatant: { id: 'source' }, root: new THREE.Group(), weapon: {},
            appearance: { height: 1, contact: { bodyRadius: .3, reach: .65, reachByMotion: { thrust: 1.4 } } } };
        const target = { combatant: { id: 'target' }, root: new THREE.Group(),
            appearance: { height: 1, contact: { bodyRadius: .3, reach: .65 } } };
        source.root.position.x = 5;
        view.actors.set('source', source); view.actors.set('target', target);
        view.playAction({ sourceId: 'source', targetId: 'target', kind: 'meleeStab2h', motion: 'thrust' });
        const thrust = source.contactPath.at(-1);
        expect(Math.hypot(thrust.x, thrust.z)).toBeCloseTo(1.7);
        view.playAction({ sourceId: 'source', targetId: 'target', kind: 'owlBeak', motion: 'bite' });
        const bite = source.contactPath.at(-1);
        expect(Math.hypot(bite.x, bite.z)).toBeCloseTo(.95);
        source.appearance.contact.reachByCondition = { prone: .5 };
        source.art = { animator: { condition: 'prone' } };
        view.playAction({ sourceId: 'source', targetId: 'target', kind: 'meleeStab2h', motion: 'thrust' });
        const grounded = source.contactPath.at(-1);
        expect(Math.hypot(grounded.x, grounded.z)).toBeCloseTo(.8);
        source.art.animator.condition = null;
        view.playAction({ sourceId: 'source', targetId: 'target', kind: 'meleeStab2h', motion: 'thrust' });
        const standing = source.contactPath.at(-1);
        expect(Math.hypot(standing.x, standing.z)).toBeCloseTo(1.7);
        expect(target.root.position.toArray()).toEqual([0, 0, 0]);
    });
    it('tracks a scaled recipient through motion and a fallen pose using its configured joint', () => {
        const view = scene();
        view.config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url), 'utf8'));
        const root = new THREE.Group();
        const body = new THREE.Group();
        const spine = new THREE.Bone();
        root.add(body);
        body.add(spine);
        body.scale.setScalar(0.76);
        spine.position.y = 1.05;
        const actor = { root, body, appearance: { asset: 'traveller' }, art: { joints: { spine } } };
        expect(view.effectTarget(actor).y).toBeCloseTo(0.798);
        root.position.set(3, 0, -2);
        spine.position.set(0, 0.2, 0.8);
        const target = view.effectTarget(actor);
        expect(target.x).toBeCloseTo(3);
        expect(target.y).toBeCloseTo(0.152);
        expect(target.z).toBeCloseTo(-1.392);
    });

    it('uses body-local fallback coordinates before art loads and supports a non-hand target socket', () => {
        const view = scene();
        view.config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url), 'utf8'));
        const body = new THREE.Group();
        body.position.set(2, 0, 3);
        body.scale.setScalar(0.5);
        const actor = { body, appearance: { asset: 'testCreature' } };
        expect(view.effectTarget(actor).toArray()).toEqual([2, 0.55, 3]);
        const torso = new THREE.Bone();
        torso.position.set(0, 0.6, 0.2);
        body.add(torso);
        actor.art = { joints: { torso } };
        view.config.artAssets.models.testCreature = { effectTarget: { joint: 'torso', offset: [0, 0, 0.1] } };
        expect(view.effectTarget(actor).y).toBeCloseTo(0.3);
        expect(view.effectTarget(actor).z).toBeCloseTo(3.15);
    });

    it('binds an off-hand shot and muzzle flash to the firing weapon', () => {
        const view = scene();
        view.config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url), 'utf8'));
        view.motionPreference = { matches: false };
        view.scene = { add: vi.fn() };
        const source = { combatant: { id: 'source' }, weapon: {}, offHand: {},
            weaponModel: 'sword', offHandModel: 'sidearm' };
        view.actors.set('source', source);
        view.actors.set('target', { combatant: { id: 'target' } });
        view.playAction({ sourceId: 'source', targetId: 'target', kind: 'firearm',
            motion: 'sidearm', weaponSlot: 'offHand' });
        expect(source.actionHand).toBe('left');
        expect(view.effects.map(effect => effect.kind)).toEqual(['shot', 'flash']);
        expect(view.effects[1].start).toBe(view.effects[0].start);
        expect(view.effects[1].duration).toBeLessThan(view.effects[0].duration);
        for (const effect of view.effects) {
            expect(effect.weapon).toBe(source.offHand);
            expect(effect.weaponModel).toBe('sidearm');
            effect.mesh.geometry.dispose();
            effect.mesh.material.dispose();
        }
    });
    it('sends one cast to all recipients at the same release and impact time', () => {
        const view = scene();
        view.config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url), 'utf8'));
        view.motionPreference = { matches: false };
        view.scene = { add: vi.fn() };
        for (const id of ['caster', 'first', 'second', 'third', 'ally']) {
            view.actors.set(id, { combatant: { id } });
        }
        view.playAction({ sourceId: 'caster', targetId: 'first', kind: 'spell',
            feedback: { type: 'damage', text: '-4' }, secondaryFeedback: [
                { combatantId: 'second', type: 'miss', text: 'MISS' },
                { combatantId: 'third', type: 'damage', text: '-2' },
                { combatantId: 'ally', type: 'healing', text: '+2' }
            ] });
        expect(view.effects.map(effect => effect.target.combatant.id)).toEqual(['first', 'second', 'third', 'ally']);
        expect(new Set(view.effects.map(effect => effect.start)).size).toBe(1);
        expect(view.effects[1].miss).toBe(true);
        expect(view.feedbackQueue).toHaveLength(4);
        expect(view.effects[3].kind).toBe('healing');
        expect(view.actors.get('ally').incomingKind).toBe('healing');
        expect(new Set(['first', 'second', 'third'].map(id => view.actors.get(id).impactAt)).size).toBe(1);
        expect(view.actors.get('caster').pendingAuthoredAction).toBe('spell');
        for (const id of ['first', 'second', 'third']) {
            expect(view.actors.get(id).incomingKind).toBe('spell');
            expect(view.actors.get(id).incomingSource).toBe('caster');
            expect(view.actors.get(id).pendingAuthoredAction).toBeUndefined();
        }
        for (const effect of view.effects) {
            effect.mesh.geometry.dispose();
            effect.mesh.material.dispose();
        }
    });

    it('settles every recipient once when a multi-target cast is skipped before starting', () => {
        const view = scene();
        const first = vi.fn();
        const second = vi.fn();
        view.action({ targetId: 'first', feedback: { type: 'damage', text: '-2' }, onImpact: first,
            secondaryFeedback: [{ combatantId: 'second', type: 'damage', text: '-2', onImpact: second }] });
        view.finishPresentation();
        view.finishPresentation();
        expect(first).toHaveBeenCalledOnce();
        expect(second).toHaveBeenCalledOnce();
    });
    it('holds a cue until its feedback is presented', () => {
        const view = scene();
        const onImpact = vi.fn();
        view.feedback({ combatantId: 'target', type: 'miss', text: 'MISS', onImpact });
        expect(onImpact).not.toHaveBeenCalled();
        view.showFeedback(view.feedbackQueue.shift());
        expect(onImpact).toHaveBeenCalledOnce();
        view.finishPresentation();
        expect(onImpact).toHaveBeenCalledOnce();
    });

    it('settles queued action and feedback cues once when animation is skipped', () => {
        const view = scene();
        const queued = vi.fn();
        const playing = vi.fn();
        view.action({ targetId: 'target', feedback: { type: 'damage', text: '-2' }, onImpact: queued });
        view.feedback({ combatantId: 'target', type: 'miss', text: 'MISS', onImpact: playing });
        view.finishPresentation();
        view.finishPresentation();
        expect(queued).toHaveBeenCalledOnce();
        expect(playing).toHaveBeenCalledOnce();
    });

    it('delivers a release cue at its scheduled visual time, before impact', () => {
        const view = scene();
        const order = [];
        view.actors.set('source', { releaseCue: { at: 120, callback: () => order.push('release') } });
        view.deliverReleaseCues(119);
        expect(order).toEqual([]);
        view.deliverReleaseCues(120);
        view.deliverReleaseCues(121);
        view.showFeedback({ combatantId: 'target', onImpact: () => order.push('impact') });
        expect(order).toEqual(['release', 'impact']);
    });

    it('settles queued release before impact once when presentation is skipped', () => {
        const view = scene();
        const order = [];
        view.action({ targetId: 'target', feedback: { type: 'damage', text: '-2' },
            onRelease: () => order.push('release'), onImpact: () => order.push('impact') });
        view.finishPresentation();
        view.finishPresentation();
        expect(order).toEqual(['release', 'impact']);
    });

    it('delivers release immediately for reduced motion', () => {
        const view = scene();
        view.motionPreference = { matches: true };
        view.actors.set('source', { combatant: { id: 'source' } });
        view.actors.set('target', { combatant: { id: 'target' } });
        const release = vi.fn();
        view.playAction({ sourceId: 'source', targetId: 'target',
            feedback: { type: 'miss', text: 'MISS' }, onRelease: release });
        expect(release).toHaveBeenCalledOnce();
        view.deliverReleaseCues();
        expect(release).toHaveBeenCalledOnce();
    });
});
