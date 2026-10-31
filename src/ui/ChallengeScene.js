import { RULES } from '../core/rulesEngine.js';
import { gameState } from '../core/GameState.js';

/** Match authored variants without consuming RNG or creating saved selections. */
export function resolveChallengeScene(challenge, context = {}) {
    const presentation = challenge?.presentation;
    if (!presentation) {
        return null;
    }
    const environment = gameState.get('dungeon.active') ? 'dungeon' : 'outdoors';
    const matches = scene => scene.image && scene.alt &&
        (!scene.environment || scene.environment === environment) &&
        (!scene.terrains || scene.terrains.includes(context.terrainType));
    return presentation.variants?.find(matches) || (matches(presentation) ? presentation : null);
}

/** Artwork follows authored content; it never consumes gameplay RNG or save state. */
export function mountChallengeScene(modal, challenge, context = {}) {
    modal.querySelector('.challenge-scene')?.remove();
    const scene = resolveChallengeScene(challenge, context);
    if (!RULES.skillChallenges.presentation.enabled || !scene) {
        return;
    }

    const host = modal.querySelector('.modal-content, .outcome-body, .social-challenge-container');
    if (!host) {
        return;
    }
    const figure = document.createElement('figure');
    figure.className = 'challenge-scene';
    figure.hidden = true;
    const image = document.createElement('img');
    image.alt = scene.alt;
    image.decoding = 'async';
    image.onload = () => {
        figure.hidden = false;
    };
    image.onerror = () => {
        figure.hidden = true;
    };
    image.src = scene.image;
    figure.appendChild(image);
    host.insertBefore(figure, host.firstChild);
}
