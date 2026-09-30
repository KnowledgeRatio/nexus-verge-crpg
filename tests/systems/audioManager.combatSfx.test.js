import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../../data/audio/combat-sfx.json', import.meta.url), 'utf8'));

describe('live combat audio', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it('plays release before outcome, chooses material, and leaves misses without contact', async () => {
        const played = [];
        class FakeAudio {
            constructor(src) {
                this.src = src;
                this.paused = true;
            }
            play() {
                played.push(this.src);
                this.paused = false;
                return Promise.resolve();
            }
        }
        vi.stubGlobal('window', { AudioContext: class {} });
        vi.stubGlobal('Audio', FakeAudio);
        vi.stubGlobal('fetch', vi.fn(async (url, options) => {
            if (url === 'data/audio/combat-sfx.json') {
                return { ok: true, json: async () => config };
            }
            return { ok: options?.method === 'HEAD' && !url.includes('sfx_blunt_hit_metal') };
        }));
        const { default: manager } = await import('../../src/systems/AudioManager.js');
        await vi.waitFor(() => expect(manager.combatSfx).toBe(config));

        const blade = { weaponId: 'longsword', weaponType: 'melee', defenderArmorId: 'plateMail' };
        manager.playCombatRelease(blade);
        manager.playCombatSound({ ...blade, hit: false });
        expect(played).toEqual(['data/audio/local/sfx_melee_swing.mp3']);
        manager.playCombatSound({ ...blade, hit: true, critical: true });
        expect(played.at(-1)).toBe('data/audio/local/sfx_blade_hit_metal.mp3');
        manager.playCombatSound({ ...blade, hit: true, blocked: true });
        expect(played.at(-1)).toBe('data/audio/local/sfx_parry.mp3');

        manager.playCombatSound({ weaponId: 'mace', weaponType: 'melee',
            defenderArmorId: 'plateMail', hit: true });
        expect(played.at(-1)).toBe('data/sound/sword-impact-hit-2.wav');
        manager.play('death', 1, { armorId: 'plateMail' });
        expect(played.at(-1)).toBe('data/audio/local/sfx_downed.mp3');
        manager.play('death');
        expect(played.at(-1)).toBe('data/audio/local/sfx_body_fall.mp3');
        manager.play('death', 1, { monsterId: 'specter' });
        expect(played).toHaveLength(6);
    });
});
