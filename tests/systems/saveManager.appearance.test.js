import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import saveManager from '../../src/systems/SaveManager.js';
import { Character } from '../../src/systems/Character.js';
import { buildStudyEncounter } from '../../src/ui/CombatEncounterSetup.js';
import { selectedPlayerAppearance, selectedPlayerParts } from '../../src/ui/CombatPresentation.js';

const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url)));
const config = read('combatScene');
const data = Object.fromEntries(['items', 'monsters', 'races', 'classes'].map(name => [name, read(name)]));

describe('Plain-object character appearance saves', () => {
    it.each(config.playerAppearances)('restores every modular option with $label without changing equipment', avatar => {
        const { player } = buildStudyEncounter(read('combatEncounterStudy'), data);
        const equipment = JSON.parse(JSON.stringify(player.equipment));
        for (const [slot, catalogue] of Object.entries(config.playerAppearanceParts)) {
            for (const option of catalogue.options) {
                player.combatAppearance = { avatarId: avatar.id, parts: { [slot]: option.id } };
                const serialized = JSON.parse(JSON.stringify(saveManager.serializeCharacter(player)));
                const restored = Character.fromJSON(serialized);
                expect(restored.combatAppearance).toEqual(player.combatAppearance);
                expect(selectedPlayerAppearance(config, restored)).toBe(avatar.id);
                expect(selectedPlayerParts(config, restored)).toEqual(selectedPlayerParts(config, player));
                expect(restored.equipment).toEqual(equipment);
                restored.combatAppearance.parts[slot] = 'changed-after-load';
                expect(player.combatAppearance.parts[slot]).toBe(option.id);
            }
        }
    });

    it('preserves independent avatar and part choices when a restored character has no class methods', () => {
        const character = { id: 'appearance-save', name: 'Traveller',
            combatAppearance: { avatarId: 'travellerOchre', parts: {
                headwear: 'hood', hairstyle: 'cropped', torso: 'short', legShape: 'gathered'
            } } };
        const saved = saveManager.serializeCharacter(character);
        expect(saved.combatAppearance).toEqual(character.combatAppearance);
        saved.combatAppearance.parts.headwear = 'none';
        expect(character.combatAppearance.parts.headwear).toBe('hood');
        expect(saveManager.serializeCharacter({ id: 'old-save' }).combatAppearance).toBeNull();
    });
});
