import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/systems/AudioManager.js', () => ({
    default: { playCombatSound: vi.fn(), play: vi.fn() }
}));

import { CombatManager, Combatant } from '../../src/systems/CombatManager.js';
import { Character } from '../../src/systems/Character.js';
import { createEnemyFromMonster } from '../../src/systems/EncounterBuilder.js';
import { execute } from '../../src/systems/EffectDispatcher.js';
import { gameState } from '../../src/core/GameState.js';

const readData = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));
const monsters = readData('monsters').monsters;
const abilities = readData('abilities');
const trip = abilities.abilities.dedication.find(ability => ability.id === 'tripAttack');

function enemy(id = 'shadow') {
    const source = createEnemyFromMonster(monsters.find(monster => monster.id === id), {
        worldConfig: { useAverageMonsterHP: true }
    });
    return new Combatant(JSON.parse(JSON.stringify(source)), 'enemy', id);
}

function player(level = 5) {
    const character = new Character({
        name: 'Exemplar', level,
        class: readData('classes').classes.find(calling => calling.id === 'dedication'),
        species: { traits: [], abilityScoreIncrease: {} },
        specialization: 'exemplar', knownTactics: ['tripAttack'], resolvePoints: 3,
        baseAbilities: { prowess: 20, resilience: 14, intuition: 12 }
    });
    const restored = { ...Character.fromJSON(JSON.parse(JSON.stringify(character.toJSON()))) };
    restored.equipment.mainHand = { id: 'quarterstaff', weaponType: 'melee', properties: [], damage: '1d4', damageType: 'bone' };
    restored.weaponMasteries = ['topple'];
    return new Combatant(restored, 'player', 'player');
}

function context(attacker, defender, combatManager = null) {
    return { character: attacker.character, combatant: attacker, attacker, defender, combatManager,
        addMessage: vi.fn(), showFloatingText: vi.fn() };
}

beforeEach(() => {
    globalThis.window = globalThis.window || {};
    window.game = { abilitiesData: abilities };
    vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
    window.game = null;
});

describe('canonical condition immunities at the shared condition boundary', () => {
    it('enforces every authored monster condition immunity without an ID-specific exception', () => {
        for (const monster of monsters.filter(entry => entry.conditionImmunities?.length)) {
            const target = new Combatant(createEnemyFromMonster(monster), 'enemy');
            for (const type of monster.conditionImmunities) {
                expect(target.addCondition(type, 'combat', 'player')).toBe(false);
            }
            expect(target.conditions).toEqual([]);
        }
    });

    it('retains generated immunity data through plain JSON and combat serialization', () => {
        const target = enemy();
        expect(target.conditionImmunities).toEqual(monsters.find(monster => monster.id === 'shadow').conditionImmunities);
        expect(target.addCondition('prone', 'combat', 'player')).toBe(false);
        expect(target.conditions).toEqual([]);
        const saved = JSON.parse(JSON.stringify(target.toJSON()));
        const restored = new Combatant(saved, 'enemy');
        expect(restored.addCondition('prone', 'combat', 'player')).toBe(false);
        expect(restored.conditionImmunities).toEqual(target.conditionImmunities);
    });

    it('rejects stacking and refresh before mutation, and follows runtime source replacement', () => {
        const target = enemy('goblin');
        expect(target.addCondition('prone', 'rounds', 'player', { value: 2, roundsRemaining: 2 })).toBe(true);
        target.character.conditionImmunities = ['prone'];
        const before = JSON.stringify(target.conditions);
        for (const stackBehavior of ['addValue', 'refreshDuration']) {
            expect(target.addCondition('prone', 'rounds', 'other', {
                stackable: true, stackBehavior, value: 5, roundsRemaining: 7
            })).toBe(false);
        }
        expect(JSON.stringify(target.conditions)).toBe(before);
        target.conditionImmunities = [];
        expect(target.character.conditionImmunities).toEqual([]);
        expect(target.addCondition('prone', 'rounds', 'player', { stackable: true, value: 3 })).toBe(true);
        expect(target.getCondition('prone').value).toBe(5);
    });

    it.each([1, 5, 10])('level %s Topple rejects a generated shadow and still affects a generated goblin', async level => {
        for (const id of ['shadow', 'goblin']) {
            const manager = new CombatManager();
            manager.weaponMasteryProficiencyRequired = false;
            const attacker = player(level);
            // Canonical low-HP goblins can die to the hit; a boss has canonical boss HP.
            const target = id === 'goblin'
                ? new Combatant(createEnemyFromMonster(monsters.find(monster => monster.id === id), {
                    isBoss: true, worldConfig: { useAverageMonsterHP: true }
                }), 'enemy', id) : enemy(id);
            const messages = vi.spyOn(gameState, 'addMessage');
            const events = vi.spyOn(gameState, 'notify');
            vi.spyOn(Math, 'random').mockReturnValueOnce(0.9).mockReturnValue(0);
            await manager.attack(attacker, target);
            expect(target.hasCondition('prone')).toBe(id === 'goblin');
            expect(attacker.actions.action).toBe(0);
            if (id === 'shadow') {
                expect(messages).toHaveBeenCalledWith(`${target.name} is immune to prone.`, 'info');
                expect(events.mock.calls.some(([event, value]) => event === 'combat.floatingText' && value.text?.includes('PRONE'))).toBe(false);
            }
            messages.mockRestore();
            events.mockRestore();
            vi.mocked(Math.random).mockRestore();
        }
    });

    it.each([1, 5, 10])('level %s generic control preserves damage and resource cost without an immune tactic marker', async level => {
        const attacker = player(level);
        const target = enemy();
        const ctx = context(attacker, target);
        const hp = target.hp;
        const resolveBefore = attacker.character.resolvePoints;
        vi.spyOn(Math, 'random').mockReturnValue(0);
        // Level one has no legal Trip Attack/Resolve grant: exercise the generic effect
        // boundary there, and the authored resource-bearing ability at legal levels.
        const ability = level === 1 ? { name: 'Control' } : trip;
        const [{ result }] = await execute(ability, trip.effects, ctx);
        expect(result).toMatchObject({ conditionApplied: false, conditionOutcome: 'immune', saveRoll: null });
        expect(target.conditions).toEqual([]);
        expect(target.hp).toBeLessThan(hp);
        expect(attacker.character.resolvePoints).toBe(resolveBefore - (level === 1 ? 0 : 1));
        expect(ctx.showFloatingText.mock.calls.some(([, , type]) => type === 'condition')).toBe(false);
    });

    it('a queued legal Trip Attack still pays one Resolve and one Action against an immune target', async () => {
        const manager = new CombatManager();
        const attacker = player(5);
        attacker.character.weaponMasteries = [];
        attacker.pendingTactic = trip.id;
        const target = enemy();
        vi.spyOn(Math, 'random').mockReturnValueOnce(0.9).mockReturnValue(0);
        await manager.attack(attacker, target);
        expect(attacker.character.resolvePoints).toBe(2);
        expect(attacker.actions.action).toBe(0);
        expect(attacker.pendingTactic).toBeNull();
        expect(target.hasCondition('prone')).toBe(false);
    });

    it.each(['onHitSaveOrCondition', 'onHitCondition', 'onHitPush'])('%s cannot bypass immunity or consume Exposed', async effectType => {
        const attacker = player();
        attacker.character.selectedTraits = ['grace_under_pressure'];
        const target = enemy();
        target.addCondition('sapped', 'combat', attacker.id, { inflictedByTactic: true });
        const ctx = context(attacker, target);
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const [{ result }] = await execute({ name: 'Control' }, {
            [effectType]: { saveType: 'resilience', condition: 'prone', conditionDuration: 'combat' }
        }, ctx);
        expect(result).toMatchObject({ conditionApplied: false, conditionOutcome: 'immune' });
        expect(target.getCondition('sapped').exposedConsumed).toBeUndefined();
        expect(target.conditions).toHaveLength(1);
    });

    it('distinguishes applied, already affected and saved outcomes on nonimmune controls', async () => {
        const attacker = player();
        const target = enemy('goblin');
        target.hp = 100;
        const ctx = context(attacker, target);
        const effects = { onHitCondition: { saveType: 'resilience', condition: 'prone', conditionDuration: 'combat' } };
        const random = vi.spyOn(Math, 'random').mockReturnValue(0);
        expect((await execute({ name: 'Control' }, effects, ctx))[0].result.conditionOutcome).toBe('applied');
        ctx.showFloatingText.mockClear();
        expect((await execute({ name: 'Control' }, effects, ctx))[0].result.conditionOutcome).toBe('alreadyAffected');
        expect(ctx.showFloatingText.mock.calls.some(([, , type]) => type === 'condition')).toBe(false);
        target.removeCondition('prone', true);
        random.mockReturnValue(0.999);
        expect((await execute({ name: 'Control' }, effects, ctx))[0].result.conditionOutcome).toBe('saved');
        expect(target.hasCondition('prone')).toBe(false);
    });

    it('blocked targeted control never starts concentration', async () => {
        const attacker = player();
        const target = enemy();
        const ctx = context(attacker, target);
        const [{ result }] = await execute({ id: 'control', name: 'Control' }, {
            targetedSaveOrCondition: { condition: 'frightened', saveType: 'composure', dcContext: 'meleeAttack', concentration: true }
        }, ctx);
        expect(result).toMatchObject({ conditionApplied: false, conditionOutcome: 'immune' });
        expect(attacker.concentratingOn).toBeNull();
        expect(ctx.showFloatingText).not.toHaveBeenCalled();
    });

    it('a blocked ally buff never announces a buff or adds a condition', async () => {
        const attacker = player();
        const ally = player();
        ally.id = 'ally';
        ally.engagedWith.add('enemy');
        ally.conditionImmunities = ['inspired'];
        const ctx = context(attacker, null, { companionCombatants: [ally] });
        const [{ result }] = await execute({ name: 'Support' }, {
            grantCondition: { condition: 'inspired', duration: 'combat' }
        }, ctx);
        expect(result).toMatchObject({ conditionApplied: false, conditionOutcome: 'immune' });
        expect(ctx.showFloatingText).not.toHaveBeenCalled();
        expect(ally.conditions).toEqual([]);
    });

    it('immune Slow mastery cannot leave an AC penalty', async () => {
        const attacker = player();
        attacker.character.weaponMasteries = ['slow'];
        attacker.character.equipment.mainHand.id = 'club';
        const target = enemy('goblin');
        target.conditionImmunities = ['slowed'];
        target.hp = 100;
        const ac = target.ac;
        const manager = new CombatManager();
        manager.weaponMasteryProficiencyRequired = false;
        const messages = vi.spyOn(gameState, 'addMessage');
        vi.spyOn(Math, 'random').mockReturnValueOnce(0.9).mockReturnValue(0);
        await manager.attack(attacker, target);
        expect(target.ac).toBe(ac);
        expect(target.conditions).toEqual([]);
        expect(messages).toHaveBeenCalledWith(`${target.name} is immune to slowed.`, 'info');
    });

    it.each(['selfTempHP', 'allyTempHP'])('%s preserves its action cost without false immunity feedback', async effectType => {
        const attacker = player();
        const ally = player();
        ally.id = 'ally';
        ally.engagedWith.add('enemy');
        const recipient = effectType === 'selfTempHP' ? attacker : ally;
        recipient.conditionImmunities = ['tempHP'];
        const ctx = context(attacker, null, { companionCombatants: [ally] });
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const [{ result }] = await execute({ name: 'Support' }, { [effectType]: {} }, ctx);
        expect(result).toMatchObject({ tempHP: 0, conditionApplied: false, conditionOutcome: 'immune' });
        expect(attacker.actions.bonusAction).toBe(0);
        expect(ctx.showFloatingText).not.toHaveBeenCalled();
        expect(recipient.conditions).toEqual([]);
    });

    it('stronger temporary HP replacement retains its existing boolean contract', async () => {
        const attacker = player();
        attacker.addCondition('tempHP', 'combat', attacker.id, { value: 1, isBuff: true });
        expect(attacker.addCondition('tempHP', 'combat', attacker.id, { value: 2, isBuff: true })).toBe(false);
        expect(attacker.getCondition('tempHP').value).toBe(2);
        const ctx = context(attacker, null);
        vi.spyOn(Math, 'random').mockReturnValue(0.999);
        const [{ result }] = await execute({ name: 'Support' }, { selfTempHP: {} }, ctx);
        expect(result.tempHP).toBeGreaterThan(2);
        expect(ctx.showFloatingText).toHaveBeenCalled();
    });

    it('stackable monster traits cannot report success against an immune target', async () => {
        const source = monsters.find(monster => monster.traits?.some(trait => trait.effectType === 'applyConditionOnTurnStart'));
        const caster = new Combatant(createEnemyFromMonster(source), 'enemy', 'caster');
        const conditionType = source.traits.find(trait => trait.effectType === 'applyConditionOnTurnStart').condition.type;
        const target = player();
        target.conditionImmunities = [conditionType];
        const manager = new CombatManager();
        manager.active = true;
        manager.combatants = [caster, target];
        manager.turnOrder = [caster, target];
        manager.playerCombatant = target;
        manager.companionCombatants = [];
        vi.spyOn(manager, 'attack').mockResolvedValue(undefined);
        vi.spyOn(manager, 'endTurn').mockImplementation(() => {});
        vi.spyOn(manager, 'executeSpecialMonsterAction').mockResolvedValue(undefined);
        const messages = vi.spyOn(gameState, 'addMessage');
        await manager.executeEnemyAI(caster);
        expect(target.conditions).toEqual([]);
        expect(messages).toHaveBeenCalledWith(`${target.name} is immune to ${conditionType}.`, 'info');
        expect(messages.mock.calls.some(([text]) => text.includes('seeps into'))).toBe(false);
    });
});
