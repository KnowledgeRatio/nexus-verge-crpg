import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { Texture, Vector3 } from '../../vendor/three/three.module.min.js';
import { CombatAnimator } from '../../src/rendering/CombatAnimator.js';

it.each([['orc', 'axe', 'Ground_Axe'], ['bugbear', 'club', 'Ground_Club']])(
    'keeps %s down while attacking, recovers when cleared, and has a distinct grounded defeat', async (id, attack, clip) => {
        const bytes = readFileSync(new URL(`../../data/graphics/combat/${id}-v1.glb`, import.meta.url));
        const gltf = await new GLTFLoader().register(() => ({ name: 'test-textures',
            loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(
            bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
        const animator = new CombatAnimator(gltf.scene, gltf.animations, config.artAssets.models[id].motion);
        const head = gltf.scene.getObjectByName('Head');
        const height = () => {
            gltf.scene.updateMatrixWorld(true);
            return head.getWorldPosition(new Vector3()).y;
        };
        animator.setCondition('prone');
        const groundedHeight = height();
        expect(animator.current.getClip().name).toBe('Ground_Idle');
        animator.playAction(attack);
        expect(animator.presentation.action.getClip().name).toBe(clip);
        for (let i = 0; i < 60; i++) {
            animator.update(1 / 60);
            expect(height()).toBeLessThan(groundedHeight + .06);
        }
        animator.setCondition(null);
        expect(animator.presentation.action.getClip().name).toBe('Ground_GetUp');
        animator.update(2);
        expect(height()).toBeGreaterThan(groundedHeight + .5);
        animator.setCondition('prone');
        animator.playAction('death');
        expect(animator.presentation.action.getClip().name).toBe('Ground_Death');
        animator.update(1);
        expect(height()).toBeLessThan(groundedHeight - .2);
        expect(animator.held).toBe(true);
        animator.dispose();
    });
