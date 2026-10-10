import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildBossEncounter, clearMonsterCache } from '../../src/systems/EncounterBuilder.js';

const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));

describe('generated dungeon boss identity', () => {
    beforeEach(() => {
        clearMonsterCache();
        vi.stubGlobal('fetch', vi.fn(async url => ({ json: async () => read(url.replace('data/', '').replace('.json', '')) })));
        vi.stubGlobal('window', {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        clearMonsterCache();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('honors an already generated boss even when entry level has changed', async () => {
        const result = await buildBossEncounter({
            dungeonTypeId: 'banditHideout', bossId: 'spy', partyLevel: 5,
            campaignId: 'nexus-verge', rng: () => 0.9
        });
        expect(result.monsters[0].isBoss).toBe(true);
        expect(result.monsters[0].species.id).toBe('spy');
    });

    it('does not construct a requested boss that is outside the site pool', async () => {
        const result = await buildBossEncounter({
            dungeonTypeId: 'banditHideout', bossId: 'ghast', partyLevel: 1,
            campaignId: 'nexus-verge', rng: () => 0
        });
        expect(result.monsters.some(monster => monster.isBoss)).toBe(false);
        expect(result.isBoss).not.toBe(true);
    });

    it('keeps normal level-based boss selection when no generated identity is supplied', async () => {
        const result = await buildBossEncounter({
            dungeonTypeId: 'banditHideout', partyLevel: 5,
            campaignId: 'nexus-verge', rng: () => 0
        });
        expect(result.monsters[0].species.id).toBe('berserker');
    });
});
