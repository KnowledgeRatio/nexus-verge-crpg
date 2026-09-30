import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AnimationMixer, Box3, LoopOnce } from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { combatPresentationSnapshot, combatActionVisual } from '../../src/ui/CombatPresentation.js';

const specs = JSON.parse(readFileSync(new URL('../../tools/combat-art/creatureSpecs.json', import.meta.url)));

describe('Adapted creature assets', () => {
    it.each(Object.keys(specs))('admits canonical %s with its own natural attack and size', id => {
        const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
        const monsters = JSON.parse(readFileSync(new URL('../../data/monsters.json', import.meta.url))).monsters;
        const monster = monsters.find(m => m.id === id);
        const actor = { id, team: 'enemy', hp: 20, character: { monsterId: id, equipment: {} },
            toJSON: () => ({ id, team: 'enemy', hp: 20, maxHP: 20, engagedWith: [] }) };
        const result = combatPresentationSnapshot({ combatants: [actor], round: 1,
            getCurrentCombatant: () => actor }, config, { monsters, items: [] });
        expect(result.reason).toBe('');
        expect(result.state.combatants[0].appearance).toBe(id);
        expect(config.appearances[id].creature.sizes).toContain(monster.size);
        expect(config.artAssets.characterModels).toContain(config.appearances[id].asset);
        const visual = combatActionVisual(config, { actionName: monster.actions[0].name, kind: 'melee' }, id);
        expect(visual.model).toBe('unarmed');
        expect(visual.motion).toBe(specs[id].actionMotion || 'bite');
        expect(config.animation.actionProfiles[visual.action].contact).toBe('melee');
    });
    it.each(Object.entries(specs))('%s preserves its floor or hover clearance with finite skinning', async (id, spec) => {
        const bytes = readFileSync(new URL(`../../${spec.output}`, import.meta.url));
        const asset = await new GLTFLoader().parseAsync(
            bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        expect(asset.animations.map(a => a.name).sort()).toEqual([...new Set([...Object.values(spec.clips), 'Hit'])].sort());
        const mixer = new AnimationMixer(asset.scene);
        for (const clip of asset.animations) {
            mixer.stopAllAction();
            const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play();
            action.clampWhenFinished = true;
            for (let i = 0; i <= 40; i++) {
                mixer.setTime(clip.duration * i / 40);
                asset.scene.updateMatrixWorld(true);
                const bounds = new Box3().setFromObject(asset.scene, true);
                expect(bounds.min.toArray().every(Number.isFinite), `${id} ${clip.name}`).toBe(true);
                expect(bounds.min.y, `${id} ${clip.name} ${i}`).toBeGreaterThan(-.002);
                const descent = clip.name === spec.clips.death ? 1 - (i / 40) ** 2 : 1;
                const expected = spec.clearance + (spec.hoverClearance || 0) * descent;
                expect(Math.abs(bounds.min.y - expected), `${id} ${clip.name} ${i}`).toBeLessThan(.025);
            }
        }
    });
});
