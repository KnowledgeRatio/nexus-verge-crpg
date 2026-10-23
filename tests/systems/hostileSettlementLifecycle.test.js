import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HostileSettlementManager from '../../src/systems/HostileSettlementManager.js';
import { gameState } from '../../src/core/GameState.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import { RULES } from '../../src/core/rulesEngine.js';
import { selectHostileSettlementContent } from '../../src/systems/hostileSettlementContent.js';

const data = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));

describe('Hostile settlement lifecycle', () => {
    let previous;
    let manager;
    let settlement;
    let checks;
    beforeEach(async () => {
        previous = { state: gameState.data, skills: skillRegistry.definitions };
        skillRegistry.setDefinitions(data('skills').skills);
        settlement = { id: '12,3', type: 'settlement', x: 12, y: 3, name: 'Town', hostileState: { phase: 'hostile' } };
        gameState.data = { character: { level: 5, gold: 0 }, player: { position: { x: 12, y: 3 } },
            world: { seed: 'TEST', worldClock: 10, settlements: [], metadata: { features: [settlement] },
                generatedRegions: new Map([['0,0', { features: [JSON.parse(JSON.stringify(settlement))] }]]) },
            dungeon: { active: false }, combat: null, ui: { currentSettlement: settlement, messageLog: [] } };
        vi.stubGlobal('window', {});
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => data('hostileSettlements') })));
        checks = { rollSkillCheck: vi.fn(() => ({ success: true, roll: 18, total: 20, dc: 14 })) };
        manager = new HostileSettlementManager({ worldSeed: 'TEST', skillChallengeManager: checks });
        await manager.init();
    });
    afterEach(() => {
        gameState.data = previous.state;
        skillRegistry.setDefinitions(previous.skills);
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });
    const act = (instance, site) => instance.performAction(site, instance.getView(site).options[0]?.id);
    function liberate() {
        const result = act(manager, settlement);
        manager.recordCombatResult(result.combat.settlementSource, 'victory');
        act(manager, settlement);
        act(manager, settlement);
        act(manager, settlement);
    }

    it.each([1, 5, 10])('freezes seeded content and level %s only on actual entry', level => {
        gameState.set('character.level', level);
        gameState.set('player.position', { x: 0, y: 0 });
        manager.ensureSettlement(settlement);
        expect(settlement.hostileState.steps).toBeUndefined();
        gameState.set('player.position', { x: 12, y: 3 });
        manager.ensureSettlement(settlement);
        const restored = JSON.parse(JSON.stringify(settlement));
        gameState.set('character.level', 10);
        manager.ensureSettlement(restored);
        expect(restored.hostileState.level).toBe(level);
        expect(restored.hostileState.steps).toEqual(settlement.hostileState.steps);
        expect(manager.getView(restored).level).toBe(level);
        const result = act(manager, restored);
        expect(result.combat.monsterPool).toEqual(restored.hostileState.steps[0].monsterPoolsByTier
            .find(tier => level <= tier.maxLevel).monsterPool);
    });

    it('requires exact mandatory combat receipts and retains progress after fleeing', () => {
        const first = act(manager, settlement).combat.settlementSource;
        expect(act(manager, settlement).combat).toBeUndefined();
        expect(manager.recordCombatResult({ ...first, attempt: 2 }, 'victory')).toBe(false);
        expect(settlement.hostileState.index).toBe(0);
        manager.recordCombatResult(first, 'fled');
        expect(settlement.hostileState.index).toBe(0);
        const second = act(manager, settlement).combat.settlementSource;
        expect(second.attempt).toBe(2);
        expect(manager.recordCombatResult(first, 'victory')).toBe(false);
        manager.recordCombatResult(second, 'victory');
        expect(settlement.hostileState.index).toBe(1);
        expect(manager.recordCombatResult(second, 'victory')).toBe(false);
    });

    it('requires every pillar then gates distinct rebuilding tasks on the saved quest clock', () => {
        liberate();
        expect(settlement.hostileState.phase).toBe('rebuilding');
        expect(settlement.hostileState.decisions[0].decision).toBe('repair_crew');
        expect(manager.getView(settlement).remaining).toBe(RULES.hostileSettlements.rebuildDelay);
        expect(act(manager, settlement).success).toBe(false);
        const tasks = settlement.hostileState.rebuildSteps;
        expect(new Set(tasks.map(step => step.id)).size).toBe(RULES.hostileSettlements.rebuildStages);
        expect(tasks.some(step => step.type === 'commission')).toBe(true);
        while (settlement.hostileState.phase === 'rebuilding') {
            gameState.set('world.worldClock', settlement.hostileState.readyAt);
            act(manager, settlement);
        }
        expect(manager.isRestricted(settlement)).toBe(false);
        expect(act(manager, settlement).success).toBe(false);
        expect(gameState.get('character.gold')).toBe(0);
        expect(gameState.get('world.generatedRegions').get('0,0').features[0].hostileState.phase).toBe('restored');
    });

    it('grants crew advantage and preserves failures with fatigue; rebuilding retry uses clock', () => {
        liberate();
        gameState.set('world.worldClock', settlement.hostileState.readyAt);
        checks.rollSkillCheck.mockReturnValue({ success: false, roll: 1, total: 1 });
        const step = manager.getView(settlement).step;
        if (step.nodes) {
            act(manager, settlement);
        }
        const option = manager.getView(settlement).options[0];
        const index = settlement.hostileState.rebuildIndex;
        manager.performAction(settlement, option.id);
        expect(settlement.hostileState.rebuildIndex).toBe(index);
        expect(manager.getView(settlement).remaining).toBe(RULES.hostileSettlements.retryDelay);
        if (option.skill === 'craft') {
            expect(checks.rollSkillCheck).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ advantage: true }));
        }
        expect(manager.getView(settlement).lastResult.success).toBe(false);
    });

    it('rejects remote, dungeon and in-combat actions and recovers saved interrupted fights', () => {
        gameState.set('dungeon.active', true);
        expect(act(manager, settlement).combat).toBeUndefined();
        gameState.set('dungeon.active', false);
        const source = act(manager, settlement).combat.settlementSource;
        gameState.set('combat', {});
        expect(act(manager, settlement).combat).toBeUndefined();
        gameState.set('combat', null);
        gameState.set('world.settlements', JSON.parse(JSON.stringify(gameState.get('world.settlements'))));
        manager.recoverInterruptedCombats();
        expect(manager.recordCombatResult(source, 'victory')).toBe(false);
        expect(manager.getView(settlement).pendingCombat).toBe(false);
        gameState.set('player.position', { x: 13, y: 3 });
        expect(act(manager, settlement).combat).toBeUndefined();
    });

    it('authors valid canonical skills, monsters, campaign content and seeded variants', () => {
        const content = data('hostileSettlements');
        const monsters = new Set(data('monsters').monsters.map(monster => monster.id));
        for (const pillar of ['combat', 'exploration', 'social']) {
            expect(content[pillar].length).toBeGreaterThanOrEqual(3);
        }
        for (const step of [...content.combat, ...content.exploration, ...content.social, ...content.rebuilding]) {
            expect(step.campaignIds).toContain('core');
            step.monsterPool?.forEach(id => expect(monsters.has(id)).toBe(true));
            step.monsterPoolsByTier?.forEach(tier => tier.monsterPool.forEach(id => expect(monsters.has(id)).toBe(true)));
            for (const option of [...(step.options || []), ...(step.nodes || []).flatMap(node => node.options)]) {
                if (option.skill) {
                    expect(skillRegistry.getDefinition(option.skill)?.id).toBe(option.skill);
                }
            }
        }
        const first = JSON.stringify(manager.getView(settlement).step);
        const second = new HostileSettlementManager({ worldSeed: 'TEST' });
        second.content = manager.content;
        second.messages = manager.messages;
        expect(JSON.stringify(second.getView(JSON.parse(JSON.stringify(settlement))).step)).toBe(first);
    });

    it('activates generation-time content without choosing again after a seed change', () => {
        const plan = selectHostileSettlementContent('GENERATION_SEED', settlement.id, manager.content,
            RULES.hostileSettlements.rebuildStages);
        settlement.hostileState.contentPlan = JSON.parse(JSON.stringify(plan));
        manager.worldSeed = 'A_DIFFERENT_RUNTIME_SEED';
        gameState.set('seed', 'A_DIFFERENT_SAVE_SEED');
        manager.ensureSettlement(settlement);
        expect(settlement.hostileState.steps).toEqual(plan.steps);
        expect(settlement.hostileState.rebuildSteps).toEqual(plan.rebuildSteps);
        expect(settlement.hostileState.contentPlan).toBeUndefined();
        expect(settlement.hostileState.level).toBe(5);
    });
});
