import { gameState } from '../core/GameState.js';
import { selectedPlayerAppearance } from './CombatPresentation.js';

let configuration;

/** Add a persistent appearance choice to the character sheet without loading WebGL. */
export async function renderCharacterAppearance(host) {
    host.classList.add('character-appearance');
    const characterId = gameState.get('character')?.id;
    host.textContent = 'Loading appearance choices…';
    try {
        configuration ||= fetch('data/combatScene.json').then(response => {
            if (!response.ok) {
                throw new Error('Appearance choices unavailable');
            }
            return response.json();
        });
        const config = await configuration;
        if (!host.isConnected || gameState.get('character')?.id !== characterId) {
            return;
        }
        host.replaceChildren();
        const title = document.createElement('h3');
        title.textContent = 'Appearance';
        const label = document.createElement('label');
        label.className = 'appearance-choice';
        label.textContent = 'Combat outfit ';
        const select = document.createElement('select');
        for (const option of config.playerAppearances || []) {
            const element = document.createElement('option');
            element.value = option.id;
            element.textContent = option.label;
            select.append(element);
        }
        select.value = selectedPlayerAppearance(config, gameState.get('character')) || config.teamAppearance.player;
        select.disabled = Boolean(gameState.get('combat')?.active);
        label.append(select);
        const note = document.createElement('p');
        note.className = 'appearance-note';
        note.textContent = select.disabled ? 'Change your outfit outside combat.' :
            'Your outfit is included when you save your character. Weapons follow your equipment.';
        select.addEventListener('change', () => {
            const character = gameState.get('character');
            if (character?.id !== characterId || gameState.get('combat')?.active ||
                !config.playerAppearances.some(option => option.id === select.value)) {
                return;
            }
            character.combatAppearance = { ...character.combatAppearance, avatarId: select.value };
            gameState.set('character', character);
        });
        host.append(title, label, note);
        for (const [slot, catalogue] of Object.entries(config.playerAppearanceParts || {})) {
            const row = document.createElement('label');
            row.className = 'appearance-choice';
            row.textContent = `${catalogue.label} `;
            const choice = document.createElement('select');
            choice.dataset.appearanceSlot = slot;
            for (const option of catalogue.options) {
                const item = document.createElement('option');
                item.value = option.id;
                item.textContent = option.label;
                choice.append(item);
            }
            const saved = gameState.get('character')?.combatAppearance?.parts?.[slot];
            choice.value = catalogue.options.some(option => option.id === saved) ? saved : catalogue.default;
            choice.disabled = select.disabled;
            choice.addEventListener('change', () => {
                const character = gameState.get('character');
                if (character?.id !== characterId || gameState.get('combat')?.active ||
                    !catalogue.options.some(option => option.id === choice.value)) {
                    return;
                }
                character.combatAppearance = { ...character.combatAppearance,
                    parts: { ...character.combatAppearance?.parts, [slot]: choice.value } };
                gameState.set('character', character);
            });
            row.append(choice);
            host.insertBefore(row, note);
        }
    } catch {
        configuration = null;
        if (host.isConnected) {
            host.textContent = 'Appearance choices are unavailable. Reopen the character sheet to retry.';
        }
    }
}
