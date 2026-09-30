/** Render the selectable combat outfits as local portraits using a supplied Playwright page. */
/* global fetch, document, window */
export async function renderPlayerPortraits(page, baseURL) {
    await page.setViewportSize({ width: 512, height: 512 });
    await page.route('**/player-portrait-render.html', route => route.fulfill({
        contentType: 'text/html', body: '<!doctype html><style>body{margin:0}canvas{display:block}</style>'
    }));
    await page.goto(`${baseURL}/player-portrait-render.html`);
    const options = await page.evaluate(async () => {
        const THREE = await import('/vendor/three/three.module.min.js');
        const { CombatArtAssets, attachCharacterArt, poseCharacterArt } = await import('/src/rendering/CombatArtAssets.js');
        const { selectedPlayerParts } = await import('/src/ui/CombatPresentation.js');
        const config = await (await fetch('/data/combatScene.json')).json();
        const assets = new CombatArtAssets({ ...config.artAssets, environment: null, characterModels: ['traveller'] });
        await assets.load();
        const scene = new THREE.Scene();
        scene.add(new THREE.HemisphereLight(0xcbdbe8, 0x4b4032, 2));
        const key = new THREE.DirectionalLight(0xffe5c6, 3); key.position.set(-2, 3, 4); scene.add(key);
        const rim = new THREE.DirectionalLight(0xb7d0de, 2); rim.position.set(2, 2, -2); scene.add(rim);
        const camera = new THREE.OrthographicCamera(-.44, .44, .44, -.44, .1, 20);
        camera.position.set(.9, 1.86, 3); camera.lookAt(0, 1.58, 0);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(512, 512); renderer.setClearColor(0, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
        document.body.append(renderer.domElement);
        let actor;
        window.renderOutfitPortrait = id => {
            if (actor) { scene.remove(actor.body); actor.art.animator.dispose(); }
            const parts = selectedPlayerParts(config, {}), appearance = config.appearances[id];
            actor = { combatant: { id, hp: 10 }, body: new THREE.Group(), weapon: new THREE.Group(),
                weaponModel: 'unarmed', legacyParts: new THREE.Group(), appearance: { ...appearance,
                    ...parts, materialTints: { ...appearance.materialTints, ...parts.materialTints } } };
            attachCharacterArt(actor, assets); scene.add(actor.body);
            actor.art.animator.update(0, { reducedMotion: true, idle: 'unarmed' });
            poseCharacterArt(actor, { now: 0, moving: false, animated: false, strike: { weapon: 0 } });
            actor.body.updateWorldMatrix(true, true);
            const centre = actor.art.joints.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, .05, 0));
            camera.position.copy(centre).add(new THREE.Vector3(.9, .12, 3));
            camera.lookAt(centre);
            renderer.render(scene, camera);
        };
        return config.playerAppearances;
    });
    for (const option of options) {
        await page.evaluate(id => window.renderOutfitPortrait(id), option.id);
        await page.locator('canvas').screenshot({ path: `data/graphics/${option.portrait}`, omitBackground: true });
    }
}
