import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Character } from '../../src/systems/Character.js';
import { gameState } from '../../src/core/GameState.js';
import { RULES } from '../../src/core/rulesEngine.js';
import restManager from '../../src/systems/RestManager.js';
import { getAttributeModifierFor } from '../../src/utils/attributeResolver.js';
import { getKnownAbilityDefinitions } from '../../src/systems/restRecovery.js';
import { CharacterCreationUI } from '../../src/ui/CharacterCreation.js';

const data = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));
const abilitiesData = data('abilities');
const dedication = data('classes').classes.find(calling => calling.id === 'dedication');
const properties = data('itemProperties').properties;

describe('Player rest resource recovery', () => {
    let previous;
    beforeEach(() => {
        previous = gameState.data;
        restManager.abilitiesData = null;
        vi.stubGlobal('window', {
            game: { abilitiesData, questManager: { checkQuestDeadlines: vi.fn() } },
            lootManager: { getPropertyEffect: id => properties.find(property => property.id === id)?.effect },
            dispatchEvent: vi.fn()
        });
        gameState.data = {
            combat: null,
            player: { position: { x: 0, y: 0 } },
            world: { worldClock: 10, generatedRegions: new Map() },
            fatigue: { current: 75, exhaustionLevels: 0, supplies: 3, suppliesZeroStreak: 0 },
            ui: { messageLog: [] }
        };
        vi.spyOn(restManager, 'isPlayerInTavern').mockReturnValue(true);
    });
    afterEach(() => {
        gameState.data = previous;
        restManager.abilitiesData = null;
        restManager.isResting = false;
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    function makeCharacter(level, restored = false) {
        const character = new Character({
            name: 'Rest test', level, class: dedication,
            species: { traits: [], abilityScoreIncrease: {} },
            baseAbilities: { prowess: 14, resilience: 14 },
            selectedAbilities: ['steadyNerve', ...(level >= 2 ? ['actionSurge', 'indomitable'] : [])],
            abilityUses: { steadyNerve: 1, ...(level >= 2 ? { actionSurge: 1, indomitable: 1 } : {}), unknown: 1 },
            equipmentModCharges: { deflecting: 1, unknown: 1 }, resolvePoints: 0
        });
        character.currentHP = 1;
        const saved = restored ? JSON.parse(JSON.stringify(character.toJSON())) : character;
        gameState.set('character', saved);
        return saved;
    }

    it.each([1, 5, 10])('short rest recovers legal level-%s resources after save/load', async level => {
        const character = makeCharacter(level, true);
        const dice = vi.spyOn(Math, 'random').mockReturnValue(0);
        const beforeHP = character.currentHP;
        const expectedHP = Math.min(character.maxHP,
            beforeHP + level * (1 + getAttributeModifierFor(character, 'hp')));
        expect(await restManager.shortRest()).toMatchObject({ success: true, healing: expectedHP - beforeHP });
        expect(dice).toHaveBeenCalledTimes(level);
        expect(character.currentHP).toBe(expectedHP);
        expect(character.abilityUses).toEqual({ unknown: 1 });
        expect(character.equipmentModCharges).toEqual({ unknown: 1 });
        expect(character.resolvePoints).toBe(character.maxResolvePoints);
        expect(character.shortRestsUsed).toBe(1);
        expect(gameState.get('fatigue.supplies')).toBe(3);
        expect(gameState.get('world.worldClock')).toBe(10);
    });

    it.each([1, 5, 10])('long rest recovers level-%s resources and charges time/supplies once', async level => {
        const character = makeCharacter(level, true);
        character.shortRestsUsed = RULES.rest.shortRestsPerLongRest;
        expect(await restManager.longRest()).toEqual({ success: true });
        expect(character.abilityUses).toEqual({ unknown: 1 });
        expect(character.equipmentModCharges).toEqual({ unknown: 1 });
        expect(character.resolvePoints).toBe(character.maxResolvePoints);
        expect(character.shortRestsUsed).toBe(0);
        expect(character.currentHP).toBe(character.maxHP);
        expect(gameState.get('fatigue.supplies')).toBe(3 - RULES.fatigue.suppliesPerLongRest);
        expect(gameState.get('world.worldClock')).toBe(10 + (RULES.quests.clockUnitsPerLongRest || 1));
        expect(window.game.questManager.checkQuestDeadlines).toHaveBeenCalledTimes(1);
    });

    it.each([1, 5, 10])('recovers automatically granted level-%s calling abilities without selected IDs', async level => {
        const character = new Character({
            name: 'Created knight', level, class: dedication,
            species: { traits: [], abilityScoreIncrease: {} },
            baseAbilities: { prowess: 14, resilience: 14 }
        });
        expect(character.selectedAbilities).toEqual([]);
        const saved = JSON.parse(JSON.stringify(character.toJSON()));
        saved.currentHP = 1;
        saved.abilityUses = { steadyNerve: 1, actionSurge: 1, indomitable: 1, unknown: 1 };
        saved.resolvePoints = 0;
        gameState.set('character', saved);
        await restManager.shortRest();
        expect(saved.abilityUses).toEqual(level === 1
            ? { actionSurge: 1, indomitable: 1, unknown: 1 } : { unknown: 1 });
        expect(saved.resolvePoints).toBe(saved.maxResolvePoints);
        saved.abilityUses.steadyNerve = 1;
        if (level >= 2) {
            saved.abilityUses.actionSurge = 1;
            saved.abilityUses.indomitable = 1;
        }
        await restManager.longRest();
        expect(saved.abilityUses).toEqual(level === 1
            ? { actionSurge: 1, indomitable: 1, unknown: 1 } : { unknown: 1 });
    });

    it('respects level, specialization and individual tactic/vow choices even for selected IDs', () => {
        const character = makeCharacter(5);
        const definitions = JSON.parse(JSON.stringify(abilitiesData));
        definitions.abilities.dedication.push(
            { id: 'wrongSpecialization', subtype: 'ability', specialization: 'oath', resourceType: 'shortRest' },
            { id: 'tooHighLevel', subtype: 'ability', levelRequired: 10, resourceType: 'shortRest' },
            { id: 'unchosenTactic', subtype: 'tactic', resourceType: 'shortRest' },
            { id: 'unchosenVow', tags: ['vow'], resourceType: 'shortRest' },
            { id: 'chosenTactic', subtype: 'tactic', resourceType: 'shortRest' },
            { id: 'chosenVow', tags: ['vow'], resourceType: 'shortRest' }
        );
        character.selectedAbilities.push('wrongSpecialization', 'tooHighLevel', 'unchosenTactic', 'unchosenVow');
        character.knownTactics = ['chosenTactic'];
        character.knownVows = ['chosenVow'];
        const ids = getKnownAbilityDefinitions(character, definitions).map(ability => ability.id);
        expect(ids).toContain('steadyNerve');
        expect(ids).toContain('actionSurge');
        expect(ids).toContain('chosenTactic');
        expect(ids).toContain('chosenVow');
        expect(ids).not.toContain('wrongSpecialization');
        expect(ids).not.toContain('tooHighLevel');
        expect(ids).not.toContain('unchosenTactic');
        expect(ids).not.toContain('unchosenVow');
    });

    it('restores Steady Nerve on a character built by the actual creation wizard and saved', async () => {
        vi.stubGlobal('document', { getElementById: () => null });
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => data('items') })));
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const kit = data('kits').dedication.find(entry => entry.id === 'knight');
        const creator = new CharacterCreationUI();
        Object.assign(creator.characterData, {
            name: 'Created knight', avatar: { id: 'test-avatar' }, class: dedication, kit,
            species: data('races').races.find(entry => entry.id === 'human'),
            background: data('backgrounds').backgrounds.find(entry => entry.id === 'soldier'),
            baseAbilities: kit.preset.abilitiesNVSystem,
            fightingStyle: kit.preset.fightingStyle
        });
        await creator.createCharacter();
        const created = gameState.get('character');
        expect(created).toBeInstanceOf(Character);
        expect(created.selectedAbilities).toEqual([]);
        created.abilityUses.steadyNerve = 1;
        const saved = JSON.parse(JSON.stringify(created.toJSON()));
        gameState.set('character', saved);
        expect((await restManager.shortRest()).success).toBe(true);
        expect(saved.abilityUses.steadyNerve).toBeUndefined();
    });

    it('preserves long-rest resources on short rests, then clears them on long rests', async () => {
        const character = makeCharacter(5);
        window.game.abilitiesData = JSON.parse(JSON.stringify(abilitiesData));
        window.game.abilitiesData.abilities.dedication.push({ id: 'longResource', resourceType: 'longRest' });
        character.selectedAbilities.push('longResource');
        character.abilityUses.longResource = 1;
        window.lootManager.getPropertyEffect = id => id === 'longMod'
            ? { recharge: 'longRest' } : properties.find(property => property.id === id)?.effect;
        character.equipmentModCharges.longMod = 1;
        await restManager.shortRest();
        expect(character.abilityUses.longResource).toBe(1);
        expect(character.equipmentModCharges.longMod).toBe(1);
        await restManager.longRest();
        expect(character.abilityUses.longResource).toBeUndefined();
        expect(character.equipmentModCharges.longMod).toBeUndefined();
    });

    it('does not recharge or spend supplies/time when rest is blocked', async () => {
        const character = makeCharacter(5, true);
        character.shortRestsUsed = RULES.rest.shortRestsPerLongRest;
        const before = JSON.parse(JSON.stringify(character));
        expect((await restManager.shortRest()).success).toBe(false);
        gameState.set('combat', { active: true });
        expect((await restManager.longRest()).success).toBe(false);
        expect(character).toEqual(before);
        expect(gameState.get('fatigue.supplies')).toBe(3);
        expect(gameState.get('world.worldClock')).toBe(10);
    });

    it('loads recovery definitions when abilities were not previously cached', async () => {
        const character = makeCharacter(5, true);
        delete window.game.abilitiesData;
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => abilitiesData })));
        await restManager.shortRest();
        expect(character.abilityUses).toEqual({ unknown: 1 });
        await restManager.shortRest();
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('does not consume a rest when recovery definitions fail to load', async () => {
        const character = makeCharacter(5, true);
        delete window.game.abilitiesData;
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
        expect(await restManager.longRest()).toMatchObject({ success: false });
        expect(character.shortRestsUsed).toBe(0);
        expect(character.resolvePoints).toBe(0);
        expect(gameState.get('fatigue.supplies')).toBe(3);
        expect(gameState.get('world.worldClock')).toBe(10);
    });

    it('does not overlap rests while recovery definitions load', async () => {
        const character = makeCharacter(5, true);
        delete window.game.abilitiesData;
        let finishLoading;
        vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => {
            finishLoading = resolve;
        })));
        const firstRest = restManager.shortRest();
        expect((await restManager.shortRest()).success).toBe(false);
        expect((await restManager.longRest()).success).toBe(false);
        finishLoading({ ok: true, json: async () => abilitiesData });
        expect((await firstRest).success).toBe(true);
        expect(character.shortRestsUsed).toBe(1);
        expect(gameState.get('world.worldClock')).toBe(10);
    });

    it.each(['short', 'long'])('rechecks combat eligibility after loading %s-rest definitions', async type => {
        const character = makeCharacter(5, true);
        const before = JSON.parse(JSON.stringify(character));
        delete window.game.abilitiesData;
        let finishLoading;
        vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => {
            finishLoading = resolve;
        })));
        const rest = type === 'short' ? restManager.shortRest() : restManager.longRest();
        gameState.set('combat', { active: true });
        finishLoading({ ok: true, json: async () => abilitiesData });
        expect((await rest).success).toBe(false);
        expect(character).toEqual(before);
        expect(restManager.isResting).toBe(false);
        expect(gameState.get('fatigue.supplies')).toBe(3);
        expect(gameState.get('world.worldClock')).toBe(10);
    });

    it.each(['character', 'world'])('does not apply a pending rest to a replaced %s after loading a save', async path => {
        const character = makeCharacter(5, true);
        const before = JSON.parse(JSON.stringify(character));
        delete window.game.abilitiesData;
        let finishLoading;
        vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => {
            finishLoading = resolve;
        })));
        const rest = restManager.longRest();
        const replacement = path === 'character' ? JSON.parse(JSON.stringify(character))
            : { worldClock: 100, generatedRegions: new Map() };
        gameState.set(path, replacement);
        finishLoading({ ok: true, json: async () => abilitiesData });
        expect((await rest).success).toBe(false);
        expect(character).toEqual(before);
        expect(gameState.get('character')).toEqual(before);
        expect(restManager.isResting).toBe(false);
        expect(gameState.get('fatigue.supplies')).toBe(3);
        expect(gameState.get('world.worldClock')).toBe(path === 'world' ? 100 : 10);
    });

    it('still requires a safe inn and preserves the supply-free HP penalty', async () => {
        const character = makeCharacter(5, true);
        restManager.isPlayerInTavern.mockReturnValue(false);
        expect((await restManager.longRest()).success).toBe(false);
        expect(character.resolvePoints).toBe(0);
        restManager.isPlayerInTavern.mockReturnValue(true);
        gameState.set('fatigue.supplies', 0);
        await restManager.longRest();
        expect(character.currentHP).toBeLessThan(character.maxHP);
        expect(character.resolvePoints).toBe(character.maxResolvePoints);
        expect(character.abilityUses).toEqual({ unknown: 1 });
        expect(gameState.get('world.worldClock')).toBe(10 + (RULES.quests.clockUnitsPerLongRest || 1));
    });

    it.each(['short', 'long'])('the actual %s-rest button callback recharges resources', async type => {
        const character = makeCharacter(5, true);
        character.selectedAbilities = [];
        let click;
        const button = {
            cloneNode: () => ({ addEventListener: (event, callback) => {
                click = callback;
            } }),
            parentNode: { replaceChild: vi.fn() }
        };
        vi.stubGlobal('document', { getElementById: id => id === `${type}RestBtn` ? button : null });
        vi.stubGlobal('CustomEvent', class {
            constructor(name, options) {
                this.type = name;
                this.detail = options.detail;
            }
        });
        vi.spyOn(restManager, 'updateRestUI').mockImplementation(() => {});
        restManager.attachEventHandlers();
        await click();
        expect(character.abilityUses).toEqual({ unknown: 1 });
        expect(character.resolvePoints).toBe(character.maxResolvePoints);
        expect(character.equipmentModCharges).toEqual({ unknown: 1 });
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'restCompleted', detail: { type, result: expect.objectContaining({ success: true }) }
        }));
    });
});
