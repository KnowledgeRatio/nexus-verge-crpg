/** Advisory fixture study. No mixed weapon producer exists in production.
 * Hypothetical mixtures combine real weapon budgets and component mitigation into
 * one impact event, then feed the real target-start scheduler its normal tranches.
 * No copied dice, attack, defense, concentration or HP math; no production edits.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createHash } from 'node:crypto';
const log = console.log.bind(console);
console.log = () => {};
globalThis.Audio = function() {
    return { play: () => Promise.resolve(), pause() {}, addEventListener() {}, volume: 1 };
};
globalThis.window = { game: null, lootManager: null };
globalThis.fetch = async url => {
    try {
        const data = JSON.parse(readFileSync(String(url).split('?')[0], 'utf8'));
        return { ok: true, json: async () => data };
    } catch {
        return { ok: false, json: async () => ({}) };
    }
};
const { RULES } = await import('../../src/core/rulesEngine.js');
const { CombatManager, Combatant } = await import('../../src/systems/CombatManager.js');
const { resolveDamageComponents, resolveDamageModifier } = await import('../../src/systems/DamageResolver.js');
const { gameState } = await import('../../src/core/GameState.js');
const original = { enabled: RULES.combat.damageOverTime.enabled,
    reduction: RULES.combat.damageReductionSystem.enabled,
    multiplier: RULES.combat.damageOverTime.totalMultiplier,
    fraction: RULES.combat.damageOverTime.immediateFraction,
    addMessage: gameState.addMessage, random: Math.random };
const output = path.resolve(process.env.INJURY_OUTPUT || '/tmp/nexus-injury-study');
mkdirSync(output, { recursive: true });
const monsters = JSON.parse(readFileSync('data/monsters.json', 'utf8')).monsters;
const items = JSON.parse(readFileSync('data/items.json', 'utf8'));
const sourceHashes = Object.fromEntries(['src/core/rulesEngine.js', 'src/systems/CombatManager.js',
    'src/systems/DamageResolver.js', 'src/utils/damagePrecision.js', 'data/items.json', 'data/monsters.json']
    .map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
const candidates = [{ id: 'bone', type: 'bone', share: 0 }, { id: 'injury', type: 'injury', share: 1 },
    { id: 'blood120', type: 'blood', share: 0 }, { id: 'injury25_blood75', type: 'blood', share: .25 },
    { id: 'injury50_blood50', type: 'blood', share: .5 }];
function setup(profile, defenseOn, temporaryHP = 0) {
    RULES.combat.damageOverTime.enabled = true;
    RULES.combat.damageOverTime.totalMultiplier = 1.2;
    RULES.combat.damageOverTime.immediateFraction = 2 / 3;
    RULES.combat.damageReductionSystem.enabled = defenseOn;
    const cm = new CombatManager();
    const actor = new Combatant({ name: 'source', currentHP: 1000, maxHP: 1000, ac: 10 }, 'enemy', 'source');
    const target = new Combatant({ name: 'target', currentHP: 1000, maxHP: 1000, ac: 10 }, 'enemy', 'target');
    cm.combatants = [actor, target];
    target.combatManager = cm;
    if (profile === 'resistant') {
        target.damageResistances = ['blood'];
    }
    if (profile === 'vulnerable') {
        target.damageVulnerabilities = ['blood'];
    }
    if (profile === 'immune') {
        target.damageImmunities = ['blood'];
    }
    if (profile === 'allTypedImmune') {
        target.damageImmunities = ['blood', 'bone', 'injury'];
    }
    if (profile === 'bleedImmune') {
        target.character.conditionImmunities = ['bleeding'];
    }
    if (profile === 'nonmagicalImmune') {
        target.damageImmunities = ['nonmagical blood', 'nonmagical bone'];
    }
    if (profile.startsWith('authored:')) {
        const monster = monsters.find(entry => entry.id === profile.split(':')[1]);
        assert.ok(monster, 'Authored affinity fixture must exist');
        target.damageResistances = [...(monster.damageResistances || [])];
        target.damageImmunities = [...(monster.damageImmunities || [])];
        target.damageVulnerabilities = [...(monster.damageVulnerabilities || [])];
        target.character.conditionImmunities = [...(monster.conditionImmunities || [])];
    }
    if (temporaryHP) {
        target.addCondition('tempHP', 'combat', actor.id, { value: temporaryHP, isBuff: true });
    }
    return { cm, actor, target };
}
function mixedImpact(state, base, share, rider = 0, isMagical = false) {
    const { cm, actor, target } = state;
    // Share is a fraction of original base. Only the remaining eligible blood base
    // receives its premium. Explicit blood rider stays immediate and unamplified.
    const neutral = base * share;
    const typedBase = base - neutral;
    const budget = cm.getWeaponDamageBudget(typedBase + rider, 'blood', { eligibleAmount: typedBase });
    const rules = RULES.combat.damageOverTime;
    const immune = (target.character.conditionImmunities || []).includes(rules.conditionType)
        || resolveDamageModifier(target, 'blood', isMagical) === 'immune';
    if (budget.deferred > 0 && !immune) {
        target.addCondition(rules.conditionType, 'combat', actor.id, { curable: rules.curable,
            icon: rules.conditionIcon, isBuff: false });
        target.getCondition(rules.conditionType).periodicDamage = { tranches: [{ sourceId: actor.id,
            damageType: 'blood', isMagical, damageFlavor: null, ticksUnits: budget.ticksUnits, cursor: 0 }] };
    }
    const result = resolveDamageComponents(target, [
        { amount: neutral, damageType: 'injury', sourceId: actor.id },
        { amount: budget.immediate, damageType: 'blood', isMagical, sourceId: actor.id }
    ]);
    return { ...result, deferred: budget.deferred, suppressedDeferred: immune ? budget.deferred : 0,
        neutral, typedBase, totalBudget: neutral + budget.immediate + budget.deferred };
}
function fixture(candidate, profile, defenseOn, { base = 10, rider = 0, tempHP = 0, isMagical = false } = {}) {
    const state = setup(profile, defenseOn, tempHP);
    const { cm, actor, target } = state;
    const trace = [];
    gameState.addMessage = message => trace.push(String(message));
    const result = candidate.id.startsWith('injury25') || candidate.id.startsWith('injury50')
        ? mixedImpact(state, base, candidate.share, rider, isMagical)
        : cm.applyWeaponDamage(actor, target, base + rider, candidate.type, { eligibleAmount: base, isMagical });
    const impact = 1000 - target.hp;
    const pendingBefore = cm.getPendingDamage(target).totalPending;
    if (profile === 'cleanse') {
        target.removeCondition('bleeding');
    }
    const ticks = [];
    for (let index = 0; index < 3; index++) {
        const before = target.hp;
        cm.processPeriodicDamage(target);
        ticks.push(before - target.hp);
    }
    return { candidate: candidate.id, profile, defenseOn, base, rider, tempHP, isMagical,
        impact, ticks, totalHP: 1000 - target.hp, pendingBefore,
        remainingTempHP: target.getCondition('tempHP')?.value || 0,
        suppressedDeferred: result.suppressedDeferred, totalBudget: result.totalBudget, trace };
}
const fixtures = [];
try {
    for (const defenseOn of [false, true]) {
        for (const profile of ['normal', 'resistant', 'vulnerable', 'immune', 'bleedImmune', 'cleanse',
            'allTypedImmune', 'nonmagicalImmune']) {
            for (const candidate of candidates) {
                fixtures.push(fixture(candidate, profile, defenseOn));
            }
        }
    }
    for (const base of [1, 20]) {
        for (const candidate of candidates) {
            fixtures.push(fixture(candidate, 'normal', false, { base }));
        }
    }
    for (const defenseOn of [false, true]) {
        for (const monster of ['skeleton', 'shadow', 'voidTitan']) {
            for (const candidate of candidates) {
                fixtures.push(fixture(candidate, `authored:${monster}`, defenseOn));
            }
        }
    }
    for (const candidate of candidates) {
        fixtures.push(fixture(candidate, 'normal', false, { rider: 6 }));
        fixtures.push(fixture(candidate, 'normal', false, { tempHP: 9 }));
        fixtures.push(fixture(candidate, 'nonmagicalImmune', true, { isMagical: true }));
    }
    const lookup = (candidate, profile, defenseOn = true) => fixtures.find(record => record.candidate === candidate
        && record.profile === profile && record.defenseOn === defenseOn);
    const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= .003, `${actual} != ${expected}`);
    for (const [candidate, normal, resistant, immune, vulnerable] of [
        ['bone', 10, 10, 10, 10], ['injury', 10, 10, 10, 10], ['blood120', 12, 6, 0, 24],
        ['injury25_blood75', 11.5, 7, 2.5, 20.5], ['injury50_blood50', 11, 8, 5, 17]
    ]) {
        for (const [profile, expected] of [['normal', normal], ['resistant', resistant], ['immune', immune], ['vulnerable', vulnerable]]) {
            close(lookup(candidate, profile).totalHP, expected);
        }
        close(lookup(candidate, 'immune', false).totalHP, normal);
    }
    const concentrationChecks = [];
    Math.random = () => .999;
    for (const candidate of candidates) {
        const state = setup('normal', false);
        state.target.character.baseAbilities = { prowess: 10, resilience: 10, intuition: 10,
            intellect: 10, presence: 10, composure: 10 };
        state.target.concentratingOn = { abilityId: 'fixture' };
        const messages = [];
        gameState.addMessage = message => messages.push(String(message));
        if (candidate.id.startsWith('injury25') || candidate.id.startsWith('injury50')) {
            mixedImpact(state, 10, candidate.share);
        } else {
            state.cm.applyWeaponDamage(state.actor, state.target, 10, candidate.type);
        }
        for (let tick = 0; tick < 3; tick++) {
            state.cm.processPeriodicDamage(state.target);
        }
        const checks = messages.filter(message => message.includes('concentration check:'));
        assert.equal(checks.length, candidate.type === 'blood' ? 4 : 1);
        concentrationChecks.push({ candidate: candidate.id, checks: checks.length, trace: checks });
    }
    const inventory = {
        weaponsByType: Object.fromEntries(['blood', 'bone', 'injury'].map(type => [type,
            items.weapons.filter(weapon => weapon.damageType === type).map(weapon => weapon.id)])),
        monstersWithAffinities: monsters.filter(monster => [...(monster.damageResistances || []),
            ...(monster.damageImmunities || []), ...(monster.damageVulnerabilities || [])].length)
            .map(monster => ({ id: monster.id, resistant: monster.damageResistances || [],
                immune: monster.damageImmunities || [], vulnerable: monster.damageVulnerabilities || [] }))
    };
    writeFileSync(path.join(output, 'injury-neutral-study.json'), JSON.stringify({ sourceHashes,
        fixtureCount: fixtures.length, mode: 'real production primitives; analysis-only mixed producer; no combat win rates',
        fixtures, concentrationChecks, inventory }, null, 2));
    log(`${fixtures.length} deterministic fixtures and ${concentrationChecks.length} single-event concentration checks passed.`);
} finally {
    RULES.combat.damageOverTime.enabled = original.enabled;
    RULES.combat.damageReductionSystem.enabled = original.reduction;
    RULES.combat.damageOverTime.totalMultiplier = original.multiplier;
    RULES.combat.damageOverTime.immediateFraction = original.fraction;
    gameState.addMessage = original.addMessage;
    Math.random = original.random;
    console.log = log;
}
