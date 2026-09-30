import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('../../src/systems/AudioManager.js', () => ({ default: { playCombatSound: vi.fn(), play: vi.fn() } }));
import { buildStudyEncounter } from '../../src/ui/CombatEncounterSetup.js';
import { stageEncounterSnapshot } from '../../src/ui/CombatPresentation.js';
import { CombatManager, Combatant } from '../../src/systems/CombatManager.js';
import { gameState } from '../../src/core/GameState.js';
import audioManager from '../../src/systems/AudioManager.js';

const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));
const config = read('combatEncounterStudy');
const data = Object.fromEntries(['items', 'classes', 'races', 'monsters'].map(name => [name, read(name)]));

describe('Playable encounter uses canonical factories and rules', () => {
    it('keeps a fatal hit in its prior formation without changing the resolved engine snapshot', () => {
        const displayed = { combatants: [
            { id: 'hero', hp: 20, engagedWith: ['enemy'] }, { id: 'enemy', hp: 3, engagedWith: ['hero'] }
        ] };
        const next = { combatants: [
            { id: 'hero', hp: 20, engagedWith: [] }, { id: 'enemy', hp: 0, engagedWith: [] }
        ] };
        const stage = stageEncounterSnapshot(next, displayed, 'enemy');
        expect(stage.combatants).toEqual(displayed.combatants);
        expect(next.combatants[1]).toEqual({ id: 'enemy', hp: 0, engagedWith: [] });
    });

    it('stages newly formed engagement before a non-fatal strike but retains pre-hit health', () => {
        const displayed = { combatants: [{ id: 'enemy', hp: 11, engagedWith: [] }] };
        const next = { combatants: [{ id: 'enemy', hp: 3, engagedWith: ['hero'] }] };
        expect(stageEncounterSnapshot(next, displayed, 'enemy').combatants[0])
            .toEqual({ id: 'enemy', hp: 11, engagedWith: ['hero'] });
    });

    it('holds every affected target for a resolved multi-target effect', () => {
        const displayed = { combatants: [
            { id: 'first', hp: 10, engagedWith: [] }, { id: 'second', hp: 8, engagedWith: [] }
        ] };
        const next = { combatants: [
            { id: 'first', hp: 4, engagedWith: [] }, { id: 'second', hp: 2, engagedWith: [] }
        ] };
        expect(stageEncounterSnapshot(next, displayed, ['first', 'second']).combatants.map(actor => actor.hp))
            .toEqual([10, 8]);
    });

    it('holds new and removed conditions, downing and defenses until their effect is presented', () => {
        const displayed = { combatants: [
            { id: 'first', hp: 10, conditions: [], isDowned: false, ac: 15, masteryEffects: {} },
            { id: 'second', hp: 0, conditions: [{ type: 'prone' }], isDowned: true, ac: 12 },
            { id: 'bystander', hp: 10, conditions: [] }
        ] };
        const next = { combatants: [
            { id: 'first', hp: 0, conditions: [{ type: 'disarmed' }], isDowned: true,
                ac: 13, masteryEffects: { sapped: true } },
            { id: 'second', hp: 5, conditions: [], isDowned: false, ac: 15 },
            { id: 'bystander', hp: 10, conditions: [{ type: 'dodging' }] }
        ] };
        const resolved = JSON.stringify(next);
        const stage = stageEncounterSnapshot(next, displayed, ['first', 'second']);
        for (const index of [0, 1]) {
            expect(stage.combatants[index]).toMatchObject(displayed.combatants[index]);
        }
        expect(stage.combatants[2]).toBe(next.combatants[2]);
        expect(JSON.stringify(next)).toBe(resolved);
    });
    beforeEach(() => {
        vi.stubGlobal('window', {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(gameState, 'addMessage').mockImplementation(() => {});
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        gameState.set('items', Object.values(data.items).filter(Array.isArray).flat());
    });
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it.each([1, 5, 10])('builds level %i party members and spends real attack ammunition/actions', async level => {
        const before = JSON.stringify(data);
        const encounter = buildStudyEncounter({ ...config, level }, data);
        const manager = new CombatManager();
        const attacker = new Combatant(encounter.companions[0], 'companion', 'ally');
        const target = new Combatant(encounter.enemies[0], 'enemy', 'foe');
        manager.combatants = [attacker, target];
        const weapon = attacker.character.equipment.mainHand;
        expect(attacker.character.level).toBe(level);
        expect(attacker.hp).toBeGreaterThan(0);
        expect(target.character.monsterActions).toEqual(data.monsters.monsters.find(m => m.id === config.enemies[0]).actions);
        await manager.attack(attacker, target);
        expect(attacker.actions.action).toBe(0);
        expect(weapon.ammoCount).toBe(weapon.ammoCapacity - 1);
        const hpAfterAttack = target.hp;
        await manager.attack(attacker, target);
        expect(target.hp).toBe(hpAfterAttack);
        expect(weapon.ammoCount).toBe(weapon.ammoCapacity - 1);
        expect(JSON.stringify(data)).toBe(before);
    });

    it('rejects missing content instead of synthesising replacement mechanics', () => {
        expect(() => buildStudyEncounter({ ...config, enemies: ['missing'] }, data)).toThrow('unavailable content');
    });

    it('routes attack and delayed defeat sounds through the encounter audio adapter', async () => {
        vi.useFakeTimers();
        try {
            const audio = { play: vi.fn(), playCombatSound: vi.fn() };
            audioManager.play.mockClear();
            audioManager.playCombatSound.mockClear();
            const manager = new CombatManager({ audio });
            const encounter = buildStudyEncounter(config, data);
            const attacker = new Combatant(encounter.companions[0], 'companion', 'ally');
            const target = new Combatant(encounter.enemies[0], 'enemy', 'foe');
            target.hp = 1;
            const survivor = new Combatant(encounter.enemies[1], 'enemy', 'survivor');
            manager.enemyCombatants = [target, survivor];
            manager.combatants = [attacker, target, survivor];
            await manager.attack(attacker, target);
            expect(target.hp).toBe(0);
            expect(audio.playCombatSound).toHaveBeenCalledWith(expect.objectContaining({ hit: true }));
            await vi.advanceTimersByTimeAsync(1000);
            expect(audio.play).toHaveBeenCalledWith('death', 1, expect.any(Object));
            expect(audioManager.playCombatSound).not.toHaveBeenCalled();
            expect(audioManager.play).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

    it('ignores a queued enemy turn after combat ends without a presentation hook', async () => {
        const manager = new CombatManager();
        const encounter = buildStudyEncounter(config, data);
        const enemy = new Combatant(encounter.enemies[0], 'enemy', 'enemy');
        manager.turnOrder = [enemy];
        const attack = vi.spyOn(manager, 'executeMonsterActions');
        await expect(manager.executeEnemyAI(enemy)).resolves.toBeUndefined();
        expect(attack).not.toHaveBeenCalled();
    });

    it('waits for presentation before an enemy acts, then respects cancellation', async () => {
        let release;
        const beforeEnemyTurn = vi.fn(() => new Promise(resolve => {
            release = resolve;
        }));
        const manager = new CombatManager({ beforeEnemyTurn });
        const encounter = buildStudyEncounter(config, data);
        const enemy = new Combatant(encounter.enemies[0], 'enemy', 'enemy');
        manager.active = true;
        manager.turnOrder = [enemy];
        const attack = vi.spyOn(manager, 'executeMonsterActions');
        const pending = manager.executeEnemyAI(enemy);
        expect(beforeEnemyTurn).toHaveBeenCalledOnce();
        expect(attack).not.toHaveBeenCalled();
        manager.active = false;
        release();
        await pending;
        expect(attack).not.toHaveBeenCalled();
    });
});
