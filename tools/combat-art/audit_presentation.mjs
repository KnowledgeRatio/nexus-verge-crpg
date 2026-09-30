/** Inventory only: configured coverage is not proof of visual quality or runtime correctness. */
import { readFileSync } from 'node:fs';

const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));
const scene = read('combatScene');
const monsters = read('monsters').monsters;
const weapons = read('items').weapons;
const races = read('races').races;
const mapping = new Map(scene.weaponVisuals.map(entry => [entry.itemId, entry]));
const humanoids = monsters.filter(monster => monster.type === 'humanoid');
const modelForTeam = team => scene.appearances[scene.teamAppearance[team]]?.asset || null;
const missingWeapons = weapons.filter(weapon => !mapping.has(weapon.id)).map(weapon => weapon.id);
const report = {
    note: 'Inventory only. Appearance suitability, action playback, effects, scene selection and game flows need separate acceptance.',
    humanoids: humanoids.map(monster => ({
        id: monster.id,
        size: monster.size,
        sizeSupported: scene.preview.sizes.includes(monster.size),
        teamModel: modelForTeam('enemy'),
        actions: (monster.actions || []).map(action => ({
            name: action.name,
            type: action.type,
            weaponId: action.weaponId || null,
            model: mapping.get(action.weaponId)?.model || null
        }))
    })),
    weapons: { total: weapons.length, mapped: weapons.length - missingWeapons.length, missing: missingWeapons },
    teamModels: Object.fromEntries(['player', 'companion', 'enemy'].map(team => [team, modelForTeam(team)])),
    playerSizes: races.map(race => ({ id: race.id, size: race.size, supported: scene.preview.sizes.includes(race.size) })),
    assets: Object.entries(scene.artAssets.models).map(([id, spec]) => {
        const buffer = readFileSync(new URL(`../../${spec.url}`, import.meta.url));
        const gltf = JSON.parse(buffer.toString('utf8', 20, 20 + buffer.readUInt32LE(12)));
        return { id, bytes: buffer.length, skins: gltf.skins?.length || 0,
            clips: (gltf.animations || []).map(clip => clip.name), meshes: gltf.meshes?.length || 0 };
    }),
    configuredEnvironment: scene.artAssets.environment,
    creatureTypesDeferred: [...new Set(monsters.filter(monster => monster.type !== 'humanoid').map(monster => monster.type))]
};
console.log(JSON.stringify(report, null, 2));
