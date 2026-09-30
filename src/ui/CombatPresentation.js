import { seedToNumber } from '../utils/rng.js';

/** Hold affected combatants at their pre-impact state until each resolved effect is shown. */
export function stageEncounterSnapshot(next, displayed, targetIds) {
    const affected = new Set([targetIds].flat().filter(Boolean));
    const fatal = new Set(next.combatants.filter(actor => affected.has(actor.id) && actor.hp <= 0)
        .map(actor => actor.id));
    return { ...next, combatants: next.combatants.map(actor => {
        const previous = displayed?.combatants.find(entry => entry.id === actor.id);
        const holdsFatalFormation = previous?.engagedWith?.some(id => fatal.has(id));
        if (!affected.has(actor.id) && !holdsFatalFormation) {
            return actor;
        }
        const staged = { ...actor, hp: affected.has(actor.id) ? previous?.hp ?? actor.hp : actor.hp,
            engagedWith: fatal.has(actor.id) || holdsFatalFormation
                ? previous?.engagedWith ?? actor.engagedWith : actor.engagedWith };
        if (affected.has(actor.id) && previous) {
            for (const field of ['conditions', 'masteryEffects', 'isDowned', 'ac']) {
                if (Object.hasOwn(previous, field)) {
                    staged[field] = previous[field];
                } else {
                    delete staged[field];
                }
            }
        }
        return staged;
    }) };
}

/** Select presentation scenery from encounter metadata without changing combat rules. */
export function combatSceneConfig(config, context = {}) {
    const inDungeon = context.context === 'dungeon' || context.isBossFight;
    const terrain = (inDungeon ? config.sceneSelection?.dungeonTerrains :
        config.sceneSelection?.terrains)?.[context.terrainId];
    const choices = Array.isArray(terrain) ? terrain : [terrain];
    const terrainScene = choices[context.scenerySeed === undefined || context.scenerySeed === null ? 0 :
        seedToNumber(String(context.scenerySeed)) % choices.length];
    const key = context.sceneId || (inDungeon ? terrainScene || 'dungeon' :
        ['ambush', 'settlement'].includes(context.context) ? 'settlement' :
            terrainScene || config.sceneSelection?.default);
    const variant = config.sceneVariants?.[key];
    if (!variant) {
        return config;
    }
    const artAssets = { ...config.artAssets };
    if (Object.hasOwn(variant, 'artEnvironment')) {
        artAssets.environment = variant.artEnvironment;
    }
    return {
        ...config,
        activeScene: key,
        name: variant.name || config.name,
        palette: { ...config.palette, ...variant.palette },
        lighting: { ...config.lighting, ...variant.lighting },
        composition: { ...config.composition, ...variant.composition },
        preview: { ...config.preview, ...(variant.preview || {}) },
        materialTextures: { ...config.materialTextures, ...variant.materialTextures },
        props: variant.props || config.props,
        rubble: variant.rubble || config.rubble,
        artAssets
    };
}

/** Resolve weapon-specific motion before generic action presentation. */
export function combatActionVisual(config, event, appearance) {
    if (event.weaponId) {
        const visual = config.appearances[appearance]?.weaponVisuals?.find(entry => entry.itemId === event.weaponId) ||
            config.weaponVisuals.find(entry => entry.itemId === event.weaponId);
        return visual && { ...visual, ...visual.byKind?.[event.kind] };
    }
    const overrides = config.appearances[appearance]?.actionVisuals;
    return overrides?.find(entry => entry.name && entry.name === event.actionName) ||
        overrides?.find(entry => !entry.name && entry.kind === event.kind) ||
        config.actionVisuals?.find(entry => entry.name && entry.name === event.actionName) ||
        config.actionVisuals?.find(entry => !entry.name && entry.kind === event.kind);
}

/** Only player-selectable appearances may override the player's default model. */
export function selectedPlayerAppearance(config, character) {
    const id = character.combatAppearance?.avatarId;
    return config.playerAppearances?.some(option => option.id === id) && config.appearances[id] ? id : null;
}

/** Resolve saved slot IDs through the catalogue; never accept arbitrary material names from saves. */
export function selectedPlayerParts(config, character) {
    const materialTints = {}, hiddenMaterials = [], meshVariants = {};
    for (const [slot, catalogue] of Object.entries(config.playerAppearanceParts || {})) {
        const id = character.combatAppearance?.parts?.[slot] || catalogue.default;
        const option = catalogue.options.find(entry => entry.id === id) ||
            catalogue.options.find(entry => entry.id === catalogue.default);
        Object.assign(materialTints, option?.materialTints);
        hiddenMaterials.push(...option?.hiddenMaterials || []);
        Object.assign(meshVariants, option?.meshVariants);
    }
    return { materialTints, hiddenMaterials, meshVariants };
}

/** Presentation metadata is derived from live equipment and canonical content, never display names. */
export function combatPresentationSnapshot(manager, config, data, heldWeapons = new Map()) {
    let reason = '';
    const combatants = manager.combatants.map(actor => {
        const character = actor.character;
        const monster = data.monsters.find(entry => entry.id === character.monsterId);
        const size = actor.team === 'enemy' ? monster?.size : character.species?.size || 'medium';
        const appearance = (actor.team === 'player' && selectedPlayerAppearance(config, character)) ||
            (actor.team === 'enemy' && config.monsterAppearance?.[character.monsterId]) ||
            config.sizeAppearance?.[size]?.[actor.team] || config.teamAppearance[actor.team];
        const creature = config.appearances[appearance]?.creature;
        if (!(creature?.sizes || config.preview.sizes).includes(size) || (actor.team === 'enemy' &&
            !config.preview.creatureTypes.includes(monster?.type) && !creature)) {
            reason = 'This encounter includes creatures without a matching 3D preview. Using combat cards.';
        }
        if (creature?.unsupportedConditions?.some(type => actor.toJSON().conditions?.some(condition => condition.type === type))) {
            reason = 'This creature condition has no matching 3D pose. Using combat cards.';
        }
        const held = heldWeapons.get(actor.id);
        const loadout = actor.team === 'enemy' ? config.appearances[appearance]?.loadout : null;
        // Presentation-only hand assignments must refer to the creature's canonical weapons.
        const canonicalItem = slot => monster?.actions?.some(action => action.weaponId === loadout?.[slot])
            ? loadout?.[slot] : undefined;
        const offHandAttack = (held?.visual?.weaponSlot ?? held?.weaponSlot) === 'offHand';
        const heldWeaponId = typeof held === 'string' ? held : offHandAttack ? null : held?.weaponId;
        const weaponId = heldWeaponId || character.equipment?.mainHand?.id || canonicalItem('mainHand') ||
            character.monsterActions?.find(action => action.weaponId)?.weaponId;
        const equipmentOverride = !offHandAttack && held?.visual?.model ? held.visual : null;
        const visual = equipmentOverride || combatActionVisual(config, { weaponId, kind: 'melee' }, appearance);
        const weapon = data.items.find(entry => entry.id === weaponId);
        const offHandId = character.equipment?.offHand?.id || canonicalItem('offHand');
        const offHandVisual = offHandAttack && held?.visual?.model ? held.visual :
            config.offHandVisuals?.find(entry => entry.itemId === offHandId) ||
            (offHandId && combatActionVisual(config, { weaponId: offHandId, kind: 'melee' }, appearance));
        if (!visual || (weaponId && !weapon && !equipmentOverride)) {
            reason ||= 'An equipped weapon has no matching 3D preview. Using combat cards.';
        }
        return { ...actor.toJSON(), appearance,
            ...(actor.team === 'player' ? { appearanceParts: selectedPlayerParts(config, character) } : {}),
            offHandModel: offHandVisual?.model,
            offHandMount: offHandVisual?.mount,
            weaponModel: visual?.model, weaponName: weapon?.name || visual?.name,
            weaponAction: visual?.action, weaponMount: visual?.mount,
            twoHanded: Boolean(weapon?.twoHanded || weapon?.properties?.includes('twoHanded')) };
    });
    return { reason, state: JSON.parse(JSON.stringify({ active: true, round: manager.round,
        currentTurn: manager.active ? manager.getCurrentCombatant()?.id : null, combatants })) };
}
