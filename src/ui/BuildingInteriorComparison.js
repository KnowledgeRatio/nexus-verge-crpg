export function mountInteriorComparison(figure, illustration, config, npcs, onTalk, signal, onReady) {
    const toolbar = document.createElement('div');
    toolbar.className = 'building-view-controls';
    toolbar.setAttribute('role', 'group');
    toolbar.setAttribute('aria-label', 'Compare tavern views');
    const flat = document.createElement('button');
    flat.type = 'button';
    flat.textContent = 'Illustration';
    const spatial = document.createElement('button');
    spatial.type = 'button';
    spatial.textContent = '3D room';
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Reset camera';
    reset.hidden = true;
    const inside = document.createElement('button');
    inside.type = 'button';
    inside.textContent = 'Inside tavern';
    inside.hidden = true;
    const overview = document.createElement('button');
    overview.type = 'button';
    overview.textContent = 'Room overview';
    overview.hidden = true;
    toolbar.append(flat, spatial, inside, overview, reset);
    if (config.modelDownload) {
        const download = document.createElement('a');
        download.href = config.modelDownload;
        download.download = '';
        download.textContent = 'Download 3D model';
        toolbar.append(download);
    }
    const host = document.createElement('div');
    host.className = 'building-3d-host';
    host.hidden = true;
    const people = document.createElement('div');
    people.className = 'building-3d-people';
    people.hidden = true;
    people.setAttribute('role', 'group');
    people.setAttribute('aria-label', 'People in the tavern');
    for (const npc of npcs) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = npc.name;
        button.setAttribute('aria-label', `Talk to ${npc.name}`);
        button.addEventListener('click', () => onTalk(npc), { signal });
        people.append(button);
    }
    const status = document.createElement('p');
    status.className = 'building-view-status';
    status.setAttribute('role', 'status');
    figure.prepend(toolbar);
    illustration.after(host, people, status);
    let scene;
    let generation = 0;
    const markCamera = mode => {
        inside.setAttribute('aria-pressed', String(mode === 'entrance'));
        overview.setAttribute('aria-pressed', String(mode === 'overview'));
    };
    const setMode = is3d => {
        illustration.hidden = is3d;
        host.hidden = !is3d;
        people.hidden = !is3d;
        reset.hidden = !is3d;
        inside.hidden = !is3d;
        overview.hidden = !is3d;
        flat.setAttribute('aria-pressed', String(!is3d));
        spatial.setAttribute('aria-pressed', String(is3d));
    };
    const dispose = () => {
        generation++;
        scene?.dispose();
        scene = null;
    };
    const showIllustration = () => {
        dispose();
        setMode(false);
        status.textContent = '';
    };
    const show3d = async () => {
        dispose();
        const request = generation;
        setMode(true);
        markCamera('entrance');
        inside.disabled = overview.disabled = reset.disabled = true;
        figure.hidden = false;
        status.textContent = 'Opening the 3D room…';
        const fail = () => {
            if (request !== generation || signal.aborted) {
                return;
            }
            showIllustration();
            status.textContent = 'The 3D room could not load. Illustration and conversations are still available.';
        };
        try {
            const { TavernInteriorScene } = await import('../rendering/TavernInteriorScene.js');
            if (request !== generation || signal.aborted) {
                return;
            }
            scene = new TavernInteriorScene(host, { config: config.scene3d, onError: fail });
            await scene.ready;
            if (request !== generation || signal.aborted) {
                return;
            }
            onReady();
            inside.disabled = overview.disabled = reset.disabled = false;
            status.textContent = 'Drag to look around · focus the room to scroll/zoom · arrow keys, +/− and Home also work.';
        } catch {
            fail();
        }
    };
    flat.addEventListener('click', showIllustration, { signal });
    spatial.addEventListener('click', () => void show3d(), { signal });
    reset.addEventListener('click', () => scene?.resetCamera(), { signal });
    inside.addEventListener('click', () => {
        scene?.setCameraMode('entrance');
        markCamera('entrance');
    }, { signal });
    overview.addEventListener('click', () => {
        scene?.setCameraMode('overview');
        markCamera('overview');
    }, { signal });
    signal.addEventListener('abort', dispose, { once: true });
    setMode(false);
    if (new window.URLSearchParams(window.location.search).get('view') === '3d') {
        void show3d();
    }
    return { dispose };
}
