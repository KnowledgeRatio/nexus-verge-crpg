import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { CombatArtAssets } from '../../src/rendering/CombatArtAssets.js';
import { CombatAnimator } from '../../src/rendering/CombatAnimator.js';
import { combatActionVisual, combatPresentationSnapshot } from '../../src/ui/CombatPresentation.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
const monsters = JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url))).monsters;

describe.each(['voidTrace', 'voidSpawn', 'voidHunter', 'voidShaper', 'voidTitan'])('%s smoke presentation', id => {
    it('admits the canonical creature size and uses its existing attack', () => {
        const actor = { id, team: 'enemy', hp: 2, character: { monsterId: id },
            toJSON: () => ({ id, team: 'enemy', hp: 2, maxHP: 2, engagedWith: [] }) };
        const snapshot = combatPresentationSnapshot({ combatants: [actor], getCurrentCombatant: () => actor },
            config, { monsters, items: [] });
        expect(snapshot.reason).toBe('');
        expect(snapshot.state.combatants[0].appearance).toBe(id);
        for (const action of monsters.find(monster => monster.id === id).actions.filter(a => a.type !== 'multiattack')) {
            const visual = combatActionVisual(config, { actionName: action.name,
                kind: action.type === 'special' ? 'spell' : 'melee' }, id);
            expect(config.artAssets.models[id].motion.actions[visual.motion]).toBeDefined();
            if (action.type === 'special') {
                expect(visual.motion).toBe('pulse');
            }
        }
    });

    it('attacks, recoils, dissolves and revives without affecting another instance', async () => {
        const spec = config.artAssets.models[id];
        const bytes = readFileSync(new URL(`../../${spec.url}`, import.meta.url));
        const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        const assets = new CombatArtAssets(config.artAssets);
        assets.templates.set(id, gltf.scene);
        const model = assets.create(id), other = assets.create(id);
        const animator = new CombatAnimator(model, gltf.animations, spec.motion);
        const body = model.getObjectByName('SmokeBody'), opacity = model.getObjectByName('SmokeOpacity');
        expect(model.getObjectByName('SmokeBounds').visible).toBe(false);
        expect(model.userData.combatSmoke.mesh.parent).toBe(body);
        animator.playAction('touch'); animator.update(.36);
        expect(body.position.z).toBeCloseTo(.25);
        expect(body.scale.z).toBeCloseTo(1.65);
        expect(other.getObjectByName('SmokeBody').scale.z).toBe(1);
        animator.update(1); animator.update(.2);
        animator.react('hit'); animator.update(.12);
        expect(body.scale.x).toBeGreaterThan(1.2);
        animator.playAction('death'); animator.update(1);
        expect(opacity.scale.x).toBe(0);
        expect(animator.held).toBe(true);
        animator.resume(); animator.update(.2);
        expect(opacity.scale.x).toBe(1);
        expect(body.scale.z).toBe(1);
        if (spec.smoke.reachNode) {
            animator.playAction('strike'); animator.update(.36);
            model.userData.combatSmoke.update(.36, 1, model.getObjectByName('SmokeReach').scale.x);
            const motion = spec.smoke.lobeMotion[0];
            const centre = model.userData.combatSmoke.mesh.material.uniforms.centers.value[motion.index];
            expect(centre.z).toBeCloseTo(spec.smoke.lobes[motion.index].center[2] + motion.offset[2]);
            expect(body.scale.z).toBe(1);
            model.updateMatrixWorld(true);
            const contact = model.userData.combatSmoke.mesh.localToWorld(centre.clone());
            expect(Math.abs(contact.x)).toBeLessThan(.02);
            expect(contact.y).toBeGreaterThan(.8);
            expect(contact.y).toBeLessThan(1.5);
        }
        animator.dispose(); model.userData.combatSmoke.dispose(); other.userData.combatSmoke.dispose(); assets.dispose();
    });
});
