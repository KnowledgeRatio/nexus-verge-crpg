import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from '../../vendor/three/three.module.min.js';
import { CombatAnimator } from '../../src/rendering/CombatAnimator.js';
import { CombatScene } from '../../src/rendering/CombatScene.js';

vi.mock('../../src/rendering/CombatArtAssets.js', async importOriginal => ({
    ...await importOriginal(), poseCharacterArt: vi.fn()
}));

function fixture() {
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    const model = new THREE.Group();
    model.name = 'Body';
    const clip = name => new THREE.AnimationClip(name, 1,
        [new THREE.NumberKeyframeTrack('Body.position[y]', [0, 1], [0, 1])]);
    const animator = new CombatAnimator(model, [clip('Idle'), clip('Strike'), clip('Hit')], {
        idle: { clip: 'Idle' }, actions: { attack: { clip: 'Strike' }, hit: { clip: 'Hit' } }
    });
    const actor = { root: new THREE.Group(), body: new THREE.Group(), weapon: new THREE.Group(),
        combatant: { id: 'hero', hp: 20, team: 'player' }, joints: {
            leftFoot: new THREE.Group(), rightFoot: new THREE.Group()
        }, appearance: { asset: 'traveller' }, feedback: { dataset: {} }, art: { animator, joints: {} } };
    const scene = Object.assign(Object.create(CombatScene.prototype), {
        config: JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url), 'utf8')),
        actors: new Map([['hero', actor]]), scene: new THREE.Scene(), running: true,
        lastFrameTime: 0, moves: [], actions: [], feedbackQueue: [], effects: [],
        motionPreference: { matches: false }, renderer: { render: vi.fn() }, installArt: vi.fn()
    });
    return { scene, actor, animator };
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('Combat scene animation clock', () => {
    it('lights the physical thrown rock while preserving the existing javelin effect material', () => {
        const { scene, actor } = fixture();
        actor.actionWeapon = actor.weapon;
        for (const name of ['hillGiantRock', 'javelinThrow']) {
            scene.presentActionTarget(actor, actor, name, scene.config.animation.actionProfiles[name], 0, {});
        }
        expect(scene.effects[0].mesh.material.isMeshStandardMaterial).toBe(true);
        expect(scene.effects[1].mesh.material.isMeshBasicMaterial).toBe(true);
        for (const effect of scene.effects) {
            effect.mesh.geometry.dispose(); effect.mesh.material.dispose();
        }
    });
    it('releases a thrown weapon once and keeps its flight origin separate from hand recovery', () => {
        const { scene, actor } = fixture();
        actor.actionProfile = { pose: 'cast', seconds: 1, impact: .2, hideReleasedWeapon: true };
        actor.actionStarted = 0; actor.actionUntil = 1000; actor.actionWeapon = actor.weapon;
        actor.weapon.position.set(1, 1, 0);
        vi.spyOn(scene, 'effectTarget').mockReturnValue(new THREE.Vector3(8, 1, 0));
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
        scene.effects.push({ kind: 'arrow', source: actor, target: actor, weapon: actor.weapon,
            mesh, start: 200, duration: 800, fixedOrigin: true });
        scene.frame(100); expect(actor.weapon.visible).toBe(true);
        scene.frame(200); expect(actor.weapon.visible).toBe(false);
        actor.weapon.position.x = 10;
        scene.frame(400); expect(mesh.position.x).toBeCloseTo(2.75);
        scene.frame(1100); expect(actor.weapon.visible).toBe(true);
        actor.combatant.conditions = [{ type: 'disarmed' }];
        scene.frame(1200); expect(actor.weapon.visible).toBe(false);
    });
    it('keeps a configured straight ray between its non-hand socket and recipient', () => {
        const { scene, actor } = fixture();
        const origin = new THREE.Group(); origin.position.set(0, 1.5, 0);
        actor.castOrigin = origin;
        vi.spyOn(scene, 'effectTarget').mockReturnValue(new THREE.Vector3(4, 1.5, 0));
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshBasicMaterial());
        scene.effects.push({ kind: 'spell', source: actor, target: actor, mesh, start: 0,
            duration: 1000, arcHeight: 0 });
        scene.frame(500);
        expect(mesh.position.toArray()).toEqual([2, 1.5, 0]);
        mesh.geometry.dispose(); mesh.material.dispose();
    });
    it('waits for authored recovery before starting the next queued action', () => {
        const { scene, animator } = fixture();
        const play = vi.spyOn(scene, 'playAction').mockImplementation(() => {});
        animator.playAction('attack');
        scene.actions.push({ readyAt: 0, sourceId: 'hero' });
        scene.frame(500);
        expect(play).not.toHaveBeenCalled();
        scene.frame(1100);
        expect(play).not.toHaveBeenCalled();
        scene.frame(1200);
        expect(play).toHaveBeenCalledOnce();
    });

    it('keeps healing rising above a prone recipient instead of sinking into the floor', () => {
        const { scene, actor } = fixture();
        vi.spyOn(scene, 'effectTarget').mockImplementation(() => new THREE.Vector3(0.3, 0.07, 0));
        const mesh = new THREE.Mesh(new THREE.RingGeometry(), new THREE.MeshBasicMaterial());
        scene.effects.push({ kind: 'healing', target: actor, mesh, start: 0, duration: 1000 });
        scene.frame(250);
        const earlyHeight = mesh.position.y;
        scene.frame(900);
        expect(mesh.position.y).toBeGreaterThan(earlyHeight);
        expect(mesh.position.y).toBeCloseTo(0.555);
        expect(mesh.position.x).toBeCloseTo(0.27);
        mesh.geometry.dispose();
        mesh.material.dispose();
    });

    it('only supplies an off-hand guard when the primary weapon leaves that hand available', () => {
        const { scene, actor, animator } = fixture();
        actor.art.weaponMounts = scene.config.artAssets.models.traveller.weaponMounts;
        actor.offHandModel = 'roundShield';
        for (const [weapon, expected] of [['sword', 'roundShield'], ['sidearm', 'roundShield'],
            ['sword2h', null], ['carbine', null], ['bow', null]]) {
            actor.weaponMount = weapon;
            scene.frame(performance.now());
            expect(animator.motion.offHand).toBe(expected);
        }
        actor.weaponMount = 'sword';
        actor.offHandModel = null;
        scene.frame(performance.now());
        expect(animator.motion.offHand).toBeNull();
    });
    it('catches up a late-started clip and keeps full elapsed time across slow frames', () => {
        const { scene, actor, animator } = fixture();
        animator.update(0, { reducedMotion: true });
        actor.pendingAuthoredAction = 'attack';
        actor.actionStarted = 900;
        actor.actionUntil = 1900;
        actor.actionProfile = scene.config.animation.actionProfiles.melee;
        scene.frame(1000);
        expect(animator.presentation.elapsed).toBeCloseTo(0.1);
        expect(animator.current.time).toBeCloseTo(0.1);
        scene.frame(1400);
        expect(animator.presentation.elapsed).toBeCloseTo(0.5);
        expect(animator.current.time).toBeCloseTo(0.5);
        scene.frame(1950);
        expect(animator.isBusy()).toBe(false);
        expect(animator.current.getClip().name).toBe('Idle');
    });

    it('does not age a fresh hit reaction by the previous slow frame', () => {
        const { scene, animator } = fixture();
        scene.lastFrameTime = 1000;
        vi.spyOn(performance, 'now').mockReturnValue(1400);
        scene.showFeedback({ combatantId: 'hero', text: '-2', type: 'damage' });
        scene.frame(1400);
        expect(animator.presentation.elapsed).toBe(0);
        expect(animator.current.getClip().name).toBe('Hit');
        scene.frame(1800);
        expect(animator.presentation.elapsed).toBeCloseTo(0.4);
    });
});
