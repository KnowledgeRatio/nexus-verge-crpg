import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCallingReference, renderCallingReference } from '../../src/ui/CallingReference.js';
import { Character } from '../../src/systems/Character.js';

const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));
const data = Object.fromEntries(['classes', 'abilities', 'traits', 'practices', 'specializations',
    'levelProgression', 'callingReferences'].map(name => [name, read(name)]));

describe('Dedication reference from production content', () => {
    it('renders real constructed and serialized characters with attribute-score objects', () => {
        const character = new Character({ name: 'Iona', species: { traits: [] },
            class: data.classes.classes.find(entry => entry.id === 'dedication'), level: 5,
            specialization: 'exemplar', knownTactics: ['riposte'], fightingStyle: 'greatWeaponFighting' });
        for (const source of [character, JSON.parse(JSON.stringify(character.toJSON()))]) {
            const model = buildCallingReference(data, 'dedication', source);
            expect(model.sections.find(section => section.id === 'tactics').entries
                .find(entry => entry.id === 'riposte').known).toBe(true);
            expect(model.sections.find(section => section.id === 'styles').entries
                .find(entry => entry.id === 'fighting_style_great_weapon_fighting').known).toBe(true);
            expect(renderCallingReference(model)).toContain('Iona');
        }
    });

    it('shows shared unlocks and distinct subclass choices without legacy features', () => {
        const model = buildCallingReference(data, 'dedication');
        expect(model.levels).toHaveLength(10);
        expect(model.levels[1].shared.map(item => item.name)).toEqual(['Action Surge', 'Indomitable']);
        expect(model.levels[2].paths.exemplar.choices[0]).toMatchObject({ type: 'tactic', count: 3 });
        expect(model.levels[2].paths.oath.grants.map(item => item.id)).toEqual(['swornStrike', 'aidTheVulnerable']);
        expect(model.levels[4].paths.exemplar.grants.map(item => item.id)).toEqual(['vanguard']);
        expect(model.levels[2].paths.exemplar.die).toBe('1d6');
        expect(model.levels[6].paths.exemplar.die).toBe('1d8');
        expect(model.levels[9].paths.exemplar.die).toBe('1d12');
        const html = renderCallingReference(model);
        expect(html).not.toContain('Deflect Missiles');
        expect(html).not.toContain('Stunning Strike');
        expect(html).toContain('Not yet available');
        expect(html).toContain('Conviction');
        expect(html).toContain('Resilience saving throw');
        expect(html).toContain('Composure saving throw');
        expect(html).not.toContain('STR saving throw');
        expect(html).not.toContain('Strength modifier');
    });

    it.each([1, 5, 10])('marks only confirmed choices for a plain level %i character', level => {
        const character = JSON.parse(JSON.stringify({ class: { id: 'dedication' }, name: '<Hero>', level,
            specialization: level >= 3 ? 'oath' : null, selectedTraits: ['aura_of_mercy'],
            knownVows: ['conviction'], practices: ['forgecraft'] }));
        const model = buildCallingReference(data, 'dedication', character);
        expect(model.levels.filter(row => row.current).map(row => row.level)).toEqual([level]);
        expect(model.sections.flatMap(section => section.entries).find(entry => entry.id === 'conviction').known)
            .toBe(level >= 5);
        const html = renderCallingReference(model);
        expect(html).toContain('&lt;Hero&gt;');
        expect(html).not.toContain('<Hero>');
        expect(character.knownVows).toEqual(['conviction']);
    });

    it('keeps future options distinct from known choices and includes passive vows', () => {
        const model = buildCallingReference(data, 'dedication', { class: { id: 'curiosity' }, level: 10 });
        expect(model.levels.some(row => row.current)).toBe(false);
        expect(model.sections.flatMap(section => section.entries).some(entry => entry.known)).toBe(false);
        expect(model.sections.find(section => section.id === 'vows').entries.map(entry => entry.id))
            .toContain('conviction');
        expect(model.levels[3].choices[0]).toMatchObject({ type: 'practice', required: false });
    });
});
