import { RULES } from '../core/rulesEngine.js';
import { mountBuildingAmbience } from './BuildingAmbience.js';

let interiors;

export function selectBuildingInterior(catalogue, buildingType, settlement = {}, variantOverride) {
    const base = catalogue[buildingType];
    if (!base) {
        return null;
    }
    const variants = base.variants || [base];
    const identity = settlement.id ?? `${settlement.x ?? 0},${settlement.y ?? 0}:${settlement.name || ''}`;
    let hash = 2166136261;
    for (const character of `${identity}:${buildingType}`) {
        hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
    }
    const index = Number.isInteger(variantOverride) && variantOverride >= 0 && variantOverride < variants.length
        ? variantOverride : hash % variants.length;
    return { ...base, ...variants[index], variantIndex: index };
}

export function mountBuildingInterior(host, buildingType, npcs, onTalk, { settlement, variantOverride } = {}) {
    const lifetime = new window.AbortController();
    const { signal } = lifetime;
    let ambience;
    let figure;
    const dispose = () => {
        lifetime.abort();
        ambience?.dispose();
        figure?.remove();
    };
    const ready = (async () => {
        if (!RULES.buildingPresentation.enabled) {
            return;
        }
        try {
            interiors ??= fetch('data/buildingInteriors.json').then(response => {
                if (!response.ok) {
                    throw new Error('Building artwork unavailable');
                }
                return response.json();
            });
            const config = selectBuildingInterior(await interiors, buildingType, settlement, variantOverride);
            if (!config || signal.aborted || !host.isConnected) {
                return;
            }
            figure = document.createElement('figure');
            figure.className = 'building-art';
            figure.dataset.variant = String(config.variantIndex + 1);
            figure.hidden = true;
            const stage = document.createElement('div');
            stage.className = 'building-art-stage';
            if (config.counterForeground !== undefined) {
                stage.classList.add('building-art-counter');
            }
            const image = document.createElement('img');
            image.alt = config.alt;
            image.decoding = 'async';
            let revealed = false;
            const reveal = () => {
                if (signal.aborted || !host.isConnected || revealed) {
                    return;
                }
                revealed = true;
                figure.hidden = false;
                host.closest('.building-container')?.classList.add('has-building-art');
                const list = host.querySelector('.npc-list');
                if (list) {
                    const details = document.createElement('details');
                    details.className = 'building-people-list';
                    const summary = document.createElement('summary');
                    summary.textContent = `Everyone here (${npcs.length}) · quests and standing`;
                    details.append(summary, list);
                    host.append(details);
                }
            };
            image.addEventListener('load', reveal, { once: true, signal });
            image.addEventListener('error', () => {
                const notice = document.createElement('p');
                notice.textContent = 'Illustration unavailable. Conversations remain available below.';
                stage.replaceChildren(notice);
                figure.hidden = false;
            }, { once: true, signal });
            stage.append(image);
            if (config.glow) {
                const glow = document.createElement('span');
                glow.className = 'building-art-glow';
                glow.setAttribute('aria-hidden', 'true');
                glow.style.left = `${config.glow.x}%`;
                glow.style.top = `${config.glow.y}%`;
                stage.append(glow);
            }
            if (config.counterForeground !== undefined) {
                const foreground = document.createElement('img');
                foreground.className = 'building-art-foreground';
                foreground.src = config.image;
                foreground.alt = '';
                foreground.setAttribute('aria-hidden', 'true');
                foreground.style.clipPath = `inset(${config.counterForeground}% 0 0 0)`;
                stage.append(foreground);
            }
            const remaining = [...npcs];
            for (const slot of config.people || []) {
                const index = remaining.findIndex(npc => !slot.roles || slot.roles.includes(npc.role));
                if (index < 0) {
                    continue;
                }
                const [npc] = remaining.splice(index, 1);
                const person = document.createElement('div');
                person.className = 'building-art-person';
                person.style.setProperty('--person-x', `${slot.x}%`);
                person.style.setProperty('--person-y', `${slot.y}%`);
                person.style.setProperty('--person-width', `${slot.width}%`);
                const portrait = document.createElement('img');
                portrait.src = slot.image;
                portrait.alt = '';
                portrait.addEventListener('error', () => portrait.hidden = true, { once: true, signal });
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'building-art-talk';
                button.textContent = npc.name;
                button.setAttribute('aria-label', `Talk to ${npc.name}`);
                button.addEventListener('click', () => onTalk(npc), { signal });
                person.append(portrait);
                stage.append(person);
                if (config.counterForeground !== undefined) {
                    button.classList.add('building-art-counter-talk');
                    button.style.left = `${slot.x}%`;
                    button.style.top = `${slot.y}%`;
                    stage.append(button);
                } else {
                    person.append(button);
                }
            }
            const caption = document.createElement('figcaption');
            const title = document.createElement('span');
            title.textContent = config.caption;
            caption.append(title);
            if (config.ambience) {
                ambience = mountBuildingAmbience(caption, config.ambience, signal);
            }
            figure.append(stage, caption);
            host.prepend(figure);
            image.src = config.image;
        } catch {
            interiors = null;
            dispose();
        }
    })();
    return { ready, dispose };
}
