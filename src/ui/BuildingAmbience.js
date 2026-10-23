export function mountBuildingAmbience(host, mixes, signal) {
    const manager = window.game?.audioManager;
    const label = document.createElement('label');
    label.className = 'building-sound-choice';
    label.textContent = 'Sound ';
    const select = document.createElement('select');
    mixes.forEach((mix, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = mix.label;
        select.append(option);
    });
    label.append(select);
    label.hidden = mixes.length === 1;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'building-ambience-toggle';
    const levelLabel = document.createElement('label');
    levelLabel.className = 'building-sound-choice';
    levelLabel.textContent = 'Room level ';
    const level = document.createElement('input');
    level.type = 'range';
    level.min = '0';
    level.max = '1';
    level.step = '0.05';
    level.value = '1';
    levelLabel.append(level);
    let tracks = [];
    let wanted = false;
    let pending = false;
    let failure = '';
    let generation = 0;
    const sync = () => {
        const playing = tracks.some(track => !track.audio.paused);
        if (!playing && !pending) {
            wanted = false;
        }
        button.textContent = failure || (playing ? 'Mute ambience' : 'Enable ambience');
        button.setAttribute('aria-pressed', String(playing));
    };
    const stop = () => {
        generation++;
        wanted = false;
        pending = false;
        failure = '';
        tracks.forEach(track => track.audio.pause());
        sync();
    };
    const release = () => {
        stop();
        tracks.forEach(track => track.unregister?.());
        tracks = [];
    };
    const prepare = () => {
        release();
        tracks = mixes[Number(select.value)].tracks.map(source => {
            const audio = new Audio(source.url);
            audio.loop = true;
            audio.preload = 'none';
            const volume = source.volume * Number(level.value);
            audio.volume = volume;
            audio.addEventListener('play', sync, { signal });
            audio.addEventListener('pause', sync, { signal });
            return { audio, sourceVolume: source.volume, unregister: manager?.registerAmbience(audio, volume) };
        });
        sync();
    };
    const play = async () => {
        if (manager && (!manager.enabled || manager.masterVolume === 0 || manager.musicVolume === 0)) {
            button.textContent = 'Sound is muted in Settings';
            return;
        }
        wanted = true;
        pending = true;
        failure = '';
        const request = ++generation;
        const playingTracks = [...tracks];
        try {
            await Promise.all(playingTracks.map(track => track.audio.play()));
            if (request !== generation || signal.aborted || document.hidden || manager?.enabled === false || !wanted) {
                playingTracks.forEach(track => track.audio.pause());
            }
            if (request === generation) {
                pending = false;
                sync();
            }
        } catch {
            playingTracks.forEach(track => track.audio.pause());
            if (request === generation && !signal.aborted) {
                wanted = false;
                pending = false;
                failure = 'Sound unavailable · retry';
                sync();
            }
        }
    };
    button.addEventListener('click', () => {
        if (wanted || tracks.some(track => !track.audio.paused)) {
            stop();
        } else {
            void play();
        }
    }, { signal });
    select.addEventListener('change', () => {
        const resume = tracks.some(track => !track.audio.paused);
        prepare();
        if (resume) {
            void play();
        }
    }, { signal });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stop();
        }
    }, { signal });
    signal.addEventListener('abort', release, { once: true });
    level.addEventListener('input', () => {
        for (const track of tracks) {
            const volume = track.sourceVolume * Number(level.value);
            if (manager) {
                manager.setAmbienceVolume(track.audio, volume);
            } else {
                track.audio.volume = volume;
            }
        }
    }, { signal });
    host.append(label, button, levelLabel);
    prepare();
    return { dispose: release };
}
