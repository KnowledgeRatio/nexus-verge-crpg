import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const claudeSkillsUrl = new URL('../../.claude/skills/', import.meta.url);
const codexSkillsUrl = new URL('../../.agents/skills/', import.meta.url);

describe('Claude and Codex skill parity', () => {
    const skillNames = readdirSync(claudeSkillsUrl);

    for (const skillName of skillNames) {
        it(`${skillName} exposes identical role instructions`, () => {
            const claudeSkillUrl = new URL(`${skillName}/SKILL.md`, claudeSkillsUrl);
            const codexSkillUrl = new URL(`${skillName}/SKILL.md`, codexSkillsUrl);

            expect(existsSync(codexSkillUrl)).toBe(true);
            expect(readFileSync(codexSkillUrl, 'utf8')).toBe(readFileSync(claudeSkillUrl, 'utf8'));
        });
    }
});
