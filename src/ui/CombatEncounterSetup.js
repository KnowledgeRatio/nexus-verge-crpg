import { Character } from '../systems/Character.js';
import { createEnemyFromMonster } from '../systems/EncounterBuilder.js';
import { filterByCampaign } from '../utils/campaignFilter.js';

/** Build disposable study actors through the same character/monster factories as the game. */
export function buildStudyEncounter(config, data) {
    const find = (entries, id) => {
        const record = filterByCampaign(entries, config.campaignId).find(entry => entry.id === id);
        if (!record) {
            throw new Error(`Encounter study references unavailable content: ${id}`);
        }
        return JSON.parse(JSON.stringify(record));
    };
    const items = Object.values(data.items).filter(Array.isArray).flat();
    const party = config.party.map(member => new Character({
        name: member.name, level: config.level, baseAbilities: member.baseAbilities,
        species: find(data.races.races, member.speciesId),
        class: find(data.classes.classes, member.classId),
        equipment: Object.fromEntries(Object.entries(member.equipment).map(([slot, id]) => [slot, find(items, id)]))
    }));
    const enemies = config.enemies.map((id, index) => {
        const monster = find(data.monsters.monsters, id);
        const enemy = createEnemyFromMonster(monster, { worldConfig: config.worldConfig });
        enemy.name = `${monster.name} ${index + 1}`;
        return enemy;
    });
    return { player: party[0], companions: party.slice(1), enemies };
}
