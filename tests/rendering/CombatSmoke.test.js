import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { Group, PerspectiveCamera, OrthographicCamera, Vector3,
    Mesh, BoxGeometry, MeshBasicMaterial, Scene } from '../../vendor/three/three.module.min.js';
import { createCombatSmoke, CombatSmokeDepth } from '../../src/rendering/CombatSmoke.js';

const specs = JSON.parse(readFileSync(new URL('../../tools/combat-art/voidSmokeSpecs.json', import.meta.url)));

describe('Local smoke volumes', () => {
    it.each([new PerspectiveCamera(), new OrthographicCamera(-2, 2, 2, -2, .1, 30)])(
        'keeps near-plane rays in the volume frame under actor scaling and facing', camera => {
            const volume = createCombatSmoke(specs.voidTrace);
            const actor = new Group();
            actor.position.set(-3, 0, 2); actor.rotation.y = 1.2; actor.scale.setScalar(1.7);
            actor.add(volume.mesh); actor.updateMatrixWorld(true);
            camera.position.set(3, 4, 8); camera.updateMatrixWorld(true);
            volume.mesh.onBeforeRender(null, null, camera);
            const clipPoint = new Vector3(.3, -.4, -1);
            const expected = clipPoint.clone().unproject(camera);
            const reconstructed = volume.mesh.localToWorld(
                clipPoint.applyMatrix4(volume.mesh.material.uniforms.localFromClip.value));
            expect(reconstructed.distanceTo(expected)).toBeLessThan(.00001);
            expect(volume.mesh.material.depthWrite).toBe(false);
            volume.dispose();
        });

    it('isolates clocks and opacity per actor and releases GPU resources', () => {
        const first = createCombatSmoke(specs.voidTrace), second = createCombatSmoke(specs.voidSpawn);
        first.update(4, 0); second.update(2, 1);
        expect(first.mesh.material.uniforms.opacity.value).toBe(0);
        expect(second.mesh.material.uniforms.opacity.value).toBe(1);
        expect(second.mesh.material.uniforms.time.value).toBe(2);
        const geometry = vi.fn(), material = vi.fn();
        first.mesh.geometry.addEventListener('dispose', geometry);
        first.mesh.material.addEventListener('dispose', material);
        first.dispose(); second.dispose();
        expect(geometry).toHaveBeenCalledOnce(); expect(material).toHaveBeenCalledOnce();
    });

    it('contains every authored density lobe within its raymarch box', () => {
        for (const spec of Object.values(specs)) {
            for (const [index, lobe] of spec.lobes.entries()) {
                expect(new Vector3(...lobe.radius).length()).toBeGreaterThan(0);
                for (let axis = 0; axis < 3; axis++) {
                    expect(Math.abs(lobe.center[axis]) + lobe.radius[axis]).toBeLessThanOrEqual(.5);
                    const motion = spec.lobeMotion?.find(entry => entry.index === index);
                    if (motion) {
                        const edge = Math.abs(lobe.center[axis] + motion.offset[axis]) +
                            lobe.radius[axis] * (motion.radiusScale?.[axis] ?? 1);
                        expect(edge).toBeLessThanOrEqual(.5);
                    }
                }
            }
        }
    });

    it('restores visibility and renderer state even if the depth pass fails', () => {
        const volume = createCombatSmoke(specs.voidTrace), scene = new Scene();
        const opaque = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
        scene.add(volume.mesh, opaque);
        const previous = {}, renderer = {
            getDrawingBufferSize: size => size.set(800, 600),
            getRenderTarget: () => previous, setRenderTarget: vi.fn(), shadowMap: { autoUpdate: true },
            render: () => {
                expect(volume.mesh.visible).toBe(false);
                expect(opaque.visible).toBe(true);
                throw new Error('lost context');
            }
        };
        const depth = new CombatSmokeDepth();
        expect(() => depth.render(renderer, scene, new PerspectiveCamera(), [volume])).toThrow('lost context');
        expect(volume.mesh.visible).toBe(true);
        expect(renderer.shadowMap.autoUpdate).toBe(true);
        expect(renderer.setRenderTarget).toHaveBeenLastCalledWith(previous);
        volume.dispose(); opaque.geometry.dispose(); opaque.material.dispose(); depth.dispose();
    });
});
