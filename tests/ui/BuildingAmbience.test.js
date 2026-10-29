import { afterEach, expect, it, vi } from 'vitest';
import { mountBuildingAmbience } from '../../src/ui/BuildingAmbience.js';

const { Event, EventTarget, AbortController } = globalThis;

class Element extends EventTarget {
    children = [];
    value = '';
    append(...children) {
        this.children.push(...children);
        if (!this.value && children[0]?.value) {
            this.value = children[0].value;
        }
    }
    setAttribute() {}
}

afterEach(() => vi.unstubAllGlobals());

it('retries failed media with fresh elements, unregisters old tracks, and stops on exit', async () => {
    const audios = [];
    const registered = new Set();
    const document = new Element();
    document.createElement = () => new Element();
    vi.stubGlobal('document', document);
    vi.stubGlobal('window', { AbortController, game: { audioManager: {
        enabled: true, masterVolume: 1, musicVolume: 1,
        registerAmbience(audio) {
            registered.add(audio);
            return () => registered.delete(audio);
        }
    } } });
    vi.stubGlobal('Audio', class extends Element {
        paused = true;
        constructor() {
            super(); audios.push(this);
        }
        pause() {
            this.paused = true; this.dispatchEvent(new Event('pause'));
        }
        async play() {
            if (this === audios[0]) {
                throw new Error('Persistent media load failure');
            }
            this.paused = false;
            this.dispatchEvent(new Event('play'));
        }
    });
    const host = new Element();
    const controller = new AbortController();
    mountBuildingAmbience(host, [{ label: 'Room', tracks: [{ url: 'room.wav', volume: 0.4 }] }], controller.signal);
    const button = host.children[1];
    button.dispatchEvent(new Event('click'));
    await vi.waitFor(() => expect(button.textContent).toBe('Sound unavailable · retry'));
    button.dispatchEvent(new Event('click'));
    await vi.waitFor(() => expect(button.textContent).toBe('Mute ambience'));
    expect(audios).toHaveLength(2);
    expect([...registered]).toEqual([audios[1]]);
    expect(audios[0].paused).toBe(true);
    controller.abort();
    expect(audios.every(audio => audio.paused)).toBe(true);
    expect(registered.size).toBe(0);
});

it('starts muted at the saved mix, changes sound only on request, and cannot restart after disposal', async () => {
    const audios = [];
    const document = new Element();
    document.createElement = () => new Element();
    vi.stubGlobal('document', document);
    vi.stubGlobal('window', { AbortController });
    vi.stubGlobal('Audio', class extends Element {
        paused = true;
        constructor(url) {
            super();
            this.url = url;
            audios.push(this);
        }
        pause() {
            this.paused = true;
            this.dispatchEvent(new Event('pause'));
        }
        async play() {
            this.paused = false;
            this.dispatchEvent(new Event('play'));
        }
    });
    const host = new Element();
    const controller = new AbortController();
    const mixes = ['lane', 'market'].map(id => ({ id, label: id, tracks: [{ url: `${id}.wav`, volume: 0.4 }] }));
    const mounted = mountBuildingAmbience(host, mixes, controller.signal, {
        initialMixId: 'market', levelLabelText: 'Ambience level'
    });
    const [choice, button, level] = host.children;
    const select = choice.children[0];
    expect(select.value).toBe('1');
    expect(choice.hidden).toBe(false);
    expect(level.textContent).toBe('Ambience level ');
    expect(audios[0].url).toBe('market.wav');
    expect(audios[0].paused).toBe(true);
    select.value = '0';
    select.dispatchEvent(new Event('change'));
    expect(audios[1].url).toBe('lane.wav');
    expect(audios.every(audio => audio.paused)).toBe(true);
    button.dispatchEvent(new Event('click'));
    await vi.waitFor(() => expect(button.textContent).toBe('Mute ambience'));
    select.value = '1';
    select.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(audios[2].paused).toBe(false));
    expect(audios[1].paused).toBe(true);
    expect(audios[2].url).toBe('market.wav');
    document.hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(audios.every(audio => audio.paused)).toBe(true);
    document.hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(audios.every(audio => audio.paused)).toBe(true);
    mounted.dispose();
    button.dispatchEvent(new Event('click'));
    select.dispatchEvent(new Event('change'));
    expect(audios).toHaveLength(3);
    expect(audios.every(audio => audio.paused)).toBe(true);
});

it('creates no controls or media for a stripped empty catalogue', () => {
    const host = new Element();
    const controller = new AbortController();
    const audio = vi.fn();
    vi.stubGlobal('Audio', audio);
    mountBuildingAmbience(host, [], controller.signal).dispose();
    expect(host.children).toHaveLength(0);
    expect(audio).not.toHaveBeenCalled();
});
