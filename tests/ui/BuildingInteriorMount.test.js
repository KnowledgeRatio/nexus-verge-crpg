import { afterEach, expect, it, vi } from 'vitest';
import { mountBuildingInterior } from '../../src/ui/BuildingInteriorArt.js';
const { Event, EventTarget, AbortController } = globalThis;

class Element extends EventTarget {
    constructor(tag) {
        super();
        this.tagName = tag;
        this.children = [];
        this.dataset = {};
        this.style = { setProperty() {} };
        this.classList = { add() {} };
        this.isConnected = true;
    }
    append(...children) {
        this.children.push(...children);
    }
    prepend(child) {
        this.children.unshift(child);
    }
    replaceChildren(...children) {
        this.children = children;
    }
    setAttribute(name, value) {
        this[name] = value;
    }
    querySelector() {
        return null;
    }
    closest() {
        return null;
    }
    remove() {
        this.isConnected = false;
    }
}

afterEach(() => vi.unstubAllGlobals());

it('uses saved NPC bindings despite input order and keeps named interaction after portrait failure', async () => {
    vi.stubGlobal('window', { AbortController });
    vi.stubGlobal('document', { createElement: tag => new Element(tag) });
    const host = new Element('div');
    const npcs = [{ id: 'first', role: 'patron', name: 'First' }, { id: 'saved', role: 'patron', name: 'Saved person' }];
    const onTalk = vi.fn();
    const previewConfig = { id: 'tavern-v1', variantIndex: 0, image: 'room.png', alt: 'Room', caption: 'Talk',
        people: [{ id: 'patron1', npcId: 'saved', image: 'person.png', x: 50, y: 80, width: 18 }] };
    const before = JSON.stringify(npcs);
    const mounted = mountBuildingInterior(host, 'tavern', npcs, onTalk, { previewConfig });
    await mounted.ready;
    const figure = host.children[0];
    const stage = figure.children[0];
    stage.children[0].dispatchEvent(new Event('load'));
    expect(figure.hidden).toBe(false);
    const person = stage.children[1];
    const [portrait, button] = person.children;
    expect(person.dataset.npcId).toBe('saved');
    expect(button['aria-label']).toBe('Talk to Saved person');
    portrait.dispatchEvent(new Event('error'));
    expect(portrait.hidden).toBe(true);
    button.dispatchEvent(new Event('click'));
    expect(onTalk).toHaveBeenCalledWith(npcs[1]);
    expect(JSON.stringify(npcs)).toBe(before);
    mounted.dispose();
    button.dispatchEvent(new Event('click'));
    expect(onTalk).toHaveBeenCalledTimes(1);
    expect(figure.isConnected).toBe(false);
});

it('does not substitute another NPC when the saved occupant is absent', async () => {
    vi.stubGlobal('window', { AbortController });
    vi.stubGlobal('document', { createElement: tag => new Element(tag) });
    const host = new Element('div');
    const mounted = mountBuildingInterior(host, 'merchant', [{ id: 'other', role: 'merchant' }], vi.fn(), {
        previewConfig: { image: 'room.png', people: [{ npcId: 'missing', image: 'person.png' }] }
    });
    await mounted.ready;
    expect(host.children[0].children[0].children).toHaveLength(1);
    mounted.dispose();
});
