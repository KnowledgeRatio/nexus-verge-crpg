/**
 * Nine-skill coverage and live-resolution balance audit.
 *
 * Uses SkillRegistry for every modifier and roll. Authored checks are gathered from
 * terrain/dungeon challenges, the bandit dialogue tree, and settlement passive checks.
 * Quest requirements are reported as wiring coverage but are not rolled a second time.
 */

import fs from 'node:fs';
import { RULES, getProficiencyBonus } from '../../src/core/rulesEngine.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import SkillChallengeManager from '../../src/systems/SkillChallengeManager.js';

const trials = Number(process.argv[2] || 10000);
const read = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));
const skills = read('../../data/skills.json').skills;
const general = read('../../data/skillChallenges.json');
const bandit = read('../../data/skillChallenges/bandit-negotiation.json');
const relations = read('../../data/relations.json');
const quests = read('../../data/quests.json');

RULES.attributes.system = 'NVSystem';
skillRegistry.setDefinitions(skills);
const manager = new SkillChallengeManager();
manager.skillsData = skills;
manager.terrainChallengesData = general;

function visit(value, source, checks) {
    if (Array.isArray(value)) {
        value.forEach(item => visit(item, source, checks));
        return;
    }
    if (!value || typeof value !== 'object') return;

    if (typeof value.skill === 'string' && (value.dc !== undefined || value.baseDC !== undefined)) {
        checks.push({
            source,
            skill: skillRegistry.normalizeId(value.skill),
            attribute: value.attribute || null,
            dc: value.baseDC ?? value.dc,
            scalable: source === 'challenge'
        });
    }
    for (const child of Object.values(value)) visit(child, source, checks);
}

const checks = [];
visit(general.challenges, 'challenge', checks);
visit(bandit.nodes, 'dialogue', checks);
visit(relations.passiveApproachChecks, 'settlement', checks);

const questRequirements = [];
visit(quests.sideQuestTemplates, 'quest', questRequirements);

const invalid = [];
for (const check of [...checks, ...questRequirements]) {
    const definition = skillRegistry.getDefinition(check.skill);
    if (!definition) {
        invalid.push(`${check.source}: unknown skill ${check.skill}`);
        continue;
    }
    try {
        skillRegistry.resolveAttribute(check.skill, check.attribute);
    } catch (error) {
        invalid.push(`${check.source}: ${error.message}`);
    }
}

const profiles = {
    dedication: { prowess: 18, resilience: 18, intellect: 10, intuition: 12, presence: 10, composure: 14 },
    curiosity: { prowess: 10, resilience: 12, intellect: 18, intuition: 16, presence: 10, composure: 14 },
    audacity: { prowess: 14, resilience: 10, intellect: 12, intuition: 14, presence: 18, composure: 18 }
};

function levelAdjustedScores(scores, level) {
    const delta = level === 1 ? -2 : level === 10 ? 2 : 0;
    return Object.fromEntries(Object.entries(scores).map(([key, score]) => [key, Math.max(8, Math.min(20, score + delta))]));
}

function character(profile, level, skill, rank) {
    const proficiency = rank !== 'untrained';
    return {
        level,
        abilities: levelAdjustedScores(profiles[profile], level),
        proficiencyBonus: getProficiencyBonus(level),
        skills: Object.fromEntries(skills.map(definition => [definition.id, {
            proficient: proficiency && definition.id === skill,
            expertise: rank === 'expert' && definition.id === skill
        }]))
    };
}

function simulate(check, profile, level, rank) {
    const actor = character(profile, level, check.skill, rank);
    const dc = check.scalable ? manager.calculateAdjustedDC(check.dc, level) : check.dc;
    let successes = 0;
    for (let i = 0; i < trials; i++) {
        successes += Number(skillRegistry.rollCheck(actor, {
            skillId: check.skill,
            attribute: check.attribute,
            dc
        }).success);
    }
    return successes / trials;
}

function pad(value, width) {
    return String(value).padEnd(width);
}

console.log(`Nine-skill live balance audit (${trials.toLocaleString()} rolls per cell)`);
console.log(`Authored checks: ${checks.length}; quest wiring requirements: ${questRequirements.length}; validation errors: ${invalid.length}`);
if (invalid.length) invalid.forEach(error => console.log(`ERROR ${error}`));

console.log('\nCOVERAGE');
console.log(`${pad('Skill', 15)} ${pad('Checks', 7)} ${pad('Primary', 8)} ${pad('Secondary', 10)} ${pad('Defaulted', 10)} Avg DC`);
for (const definition of skills) {
    const own = checks.filter(check => check.skill === definition.id);
    const primary = own.filter(check => check.attribute === definition.primaryAttribute).length;
    const secondary = own.filter(check => check.attribute === definition.secondaryAttribute).length;
    const defaulted = own.filter(check => !check.attribute).length;
    const averageDC = own.length ? (own.reduce((sum, check) => sum + check.dc, 0) / own.length).toFixed(1) : '-';
    console.log(`${pad(definition.name, 15)} ${pad(own.length, 7)} ${pad(primary, 8)} ${pad(secondary, 10)} ${pad(defaulted, 10)} ${averageDC}`);
}

console.log('\nSUCCESS RATES ACROSS AUTHORED CHECKS');
console.log('Profile is a deliberately specialised level-5 build; L1/L10 shift every score -2/+2.');
for (const level of [1, 5, 10]) {
    for (const profile of Object.keys(profiles)) {
        const rates = {};
        for (const rank of ['untrained', 'trained', 'expert']) {
            const samples = checks.map(check => simulate(check, profile, level, rank));
            rates[rank] = samples.reduce((sum, rate) => sum + rate, 0) / samples.length;
        }
        console.log(`${pad(`${profile} L${level}`, 15)} untrained ${(rates.untrained * 100).toFixed(1)}%  trained ${(rates.trained * 100).toFixed(1)}%  expert ${(rates.expert * 100).toFixed(1)}%`);
    }
}

console.log('\nPER-SKILL TRAINED RANGE AT LEVEL 5');
for (const definition of skills) {
    const own = checks.filter(check => check.skill === definition.id);
    if (!own.length) {
        console.log(`${pad(definition.name, 15)} NO AUTHORED CHECKS`);
        continue;
    }
    const rates = Object.keys(profiles).map(profile => {
        const values = own.map(check => simulate(check, profile, 5, 'trained'));
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    });
    console.log(`${pad(definition.name, 15)} ${(Math.min(...rates) * 100).toFixed(1)}%–${(Math.max(...rates) * 100).toFixed(1)}% across specialised profiles`);
}

if (invalid.length) process.exitCode = 1;
