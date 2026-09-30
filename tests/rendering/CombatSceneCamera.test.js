import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from '../../vendor/three/three.module.min.js';
import { CombatScene } from '../../src/rendering/CombatScene.js';
import { combatSceneConfig } from '../../src/ui/CombatPresentation.js';

const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url), 'utf8'));

function scene() {
    const actor = { root: new THREE.Group(), combatant: { name: 'Traveller' } };
    return Object.assign(Object.create(CombatScene.prototype), {
        config, viewport: { clientWidth: 1000, clientHeight: 650 }, renderer: { setSize: vi.fn() },
        camera: new THREE.OrthographicCamera(-15, 15, 12, -12, 0.1, 160),
        cameraZoom: 1, actors: new Map([['hero', actor]]),
        environmentLights: new THREE.Group(), artEnvironment: new THREE.Group(),
        cells: new Map(), layout: { positions: new Map(), world: point => point }, moves: [],
        zoomReadout: {}, zoomIn: {}, zoomOut: {}
    });
}

describe('Combat camera', () => {
    it('keeps a duel comparably readable across terrain scenes without clipping fighters', () => {
        const heights = Object.keys(config.sceneVariants).map(sceneId => {
            const view = scene();
            view.config = combatSceneConfig(config, { sceneId });
            view.viewport = { clientWidth: 878, clientHeight: 696 };
            view.cells = new Map([['hero', { x: -3.2, z: 0 }], ['enemy', { x: 3.2, z: 0 }]]);
            view.resize();
            const foot = new THREE.Vector3(-3.2, 0, 0).project(view.camera);
            const head = new THREE.Vector3(-3.2, 1.8, 0).project(view.camera);
            expect(Math.abs(foot.y)).toBeLessThan(1);
            expect(Math.abs(head.y)).toBeLessThan(1);
            return (head.y - foot.y) * view.viewport.clientHeight / 2;
        });
        expect(Math.min(...heights)).toBeGreaterThan(50);
        expect(Math.max(...heights) / Math.min(...heights)).toBeLessThan(1.35);
    });

    it('reserves retreat homes behind an already engaged formation before fixing the scenery', () => {
        const view = scene();
        view.cells = new Map([['hero', { x: 0, z: 0 }]]);
        view.layout.homes = new Map([['hero', { x: 3, z: -8 }]]);
        view.resize();
        const offset = view.environmentOffsetZ;
        expect(config.composition.rearZ + offset + config.composition.rearClearance).toBeLessThanOrEqual(-8);
        view.cells.set('hero', { x: 3, z: -8 });
        view.resize();
        expect(view.environmentOffsetZ).toBe(offset);
    });

    const viewports = Object.keys(config.sceneVariants).flatMap(context =>
        [[665, 620], [1080, 700]].map(([width, height]) => [context, width, height]));
    it.each(viewports)('keeps %s landmarks visible at %i by %i with a crowded formation', (context, width, height) => {
        const view = scene();
        const config = combatSceneConfig(view.config, { sceneId: context });
        view.config = config;
        view.viewport = { clientWidth: width, clientHeight: height };
        view.cells = new Map([['hero', { x: -3.2, z: 0 }], ['rear', { x: 3.2, z: -8.3 }],
            ['front', { x: 3.2, z: 5.5 }]]);
        view.resize();
        const offset = view.environmentOffsetZ;
        expect(config.composition.rearZ + offset).toBeLessThanOrEqual(-8.3 - config.composition.rearClearance);
        expect(view.artEnvironment.position.z).toBe(offset);
        expect(view.environmentLights.position.z).toBe(offset);
        for (const [x, y, z] of config.composition.landmarks) {
            const point = new THREE.Vector3(x, y, z + offset).project(view.camera);
            expect(Math.abs(point.x)).toBeLessThan(1);
            expect(Math.abs(point.y)).toBeLessThan(1);
        }
        view.moves = [{ path: [{ x: 12, z: -12 }] }];
        view.resize();
        expect(view.environmentOffsetZ).toBe(offset);
    });

    it('clamps zoom without reallocating the drawing buffer until the viewport changes', () => {
        const view = scene();
        view.resize();
        view.setZoom(100);
        expect(view.cameraZoom).toBe(config.camera.maximumZoom);
        expect(view.zoomIn.disabled).toBe(true);
        view.setZoom(0);
        expect(view.cameraZoom).toBe(config.camera.minimumZoom);
        expect(view.zoomOut.disabled).toBe(true);
        expect(view.renderer.setSize).toHaveBeenCalledTimes(1);
        view.viewport.clientWidth = 800;
        view.resize();
        expect(view.renderer.setSize).toHaveBeenCalledTimes(2);
        expect(view.cameraZoom).toBe(config.camera.minimumZoom);
    });

    it('holds framing when fighters approach and retains extra room after a wider retreat', () => {
        const view = scene();
        view.cells = new Map([['hero', { x: -3.2, z: 0 }], ['enemy', { x: 3.2, z: 0 }]]);
        view.resize();
        const position = view.camera.position.clone();
        const span = view.camera.top;
        view.cells.set('hero', { x: 0, z: 0 });
        view.resize();
        expect(view.camera.position.toArray()).toEqual(position.toArray());
        expect(view.camera.top).toBe(span);
        view.moves = [{ path: [{ x: 12, z: 0 }] }];
        view.resize();
        const expanded = view.camera.top;
        expect(expanded).toBeGreaterThan(span);
        view.moves = [];
        view.resize();
        expect(view.camera.top).toBe(expanded);
        expect(view.camera.position.toArray()).toEqual(position.toArray());
    });

    it('fits spread-out actors and movement paths at the overview zoom', () => {
        const view = scene();
        const points = [{ x: -12, z: -8 }, { x: 12, z: 8 }, { x: 0, z: -12 }];
        view.moves = [{ path: points }];
        view.resize();
        for (const point of points) {
            for (const height of [0, 2.4]) {
                const screen = new THREE.Vector3(point.x, height, point.z).project(view.camera);
                expect(Math.abs(screen.x)).toBeLessThan(1);
                expect(Math.abs(screen.y)).toBeLessThan(1);
            }
        }
    });
});
