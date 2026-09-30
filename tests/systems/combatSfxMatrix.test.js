import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { combatSfxFamily, combatSfxKey } from '../../src/systems/combatSfxMatrix.js';

const read = path => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'));
const config = read('data/audio/combat-sfx.json');
const items = read('data/items.json');
const catalog = read('data/audio/cue-versions.json');

describe('combat SFX matrix', () => {
    it('covers every playable weapon exactly once with valid cue assets', () => {
        const mapped = Object.values(config.weaponFamilies).flat();
        expect(mapped.sort()).toEqual(items.weapons.map(item => item.id).sort());
        expect(new Set(mapped).size).toBe(mapped.length);
        for (const row of Object.values(config.matrix)) {
            for (const key of Object.values(row)) {
                expect(config.assets[key]).toBeDefined();
            }
        }
        for (const asset of Object.values(config.assets)) {
            expect(existsSync(new URL(`../../${asset.fallback}`, import.meta.url))).toBe(true);
            expect(Object.values(catalog.versions).some(version => version.source === asset.source)).toBe(true);
        }
    });

    it('keeps release independent from result and never invents miss contact', () => {
        const base = { weaponId: 'longsword', weaponType: 'melee', defenderArmorId: 'plateMail' };
        expect(combatSfxKey(config, 'release', { ...base, hit: false }))
            .toBe(combatSfxKey(config, 'release', { ...base, hit: true }));
        expect(combatSfxKey(config, 'impact', { ...base, hit: false })).toBeNull();
        expect(combatSfxKey(config, 'impact', { ...base, hit: true })).toBe('bladeMetal');
        expect(combatSfxKey(config, 'impact', { ...base, hit: true, critical: true })).toBe('bladeMetal');
    });

    it('uses a parry sound only for an explicit complete melee deflection', () => {
        const melee = { weaponId: 'longsword', weaponType: 'melee' };
        const ranged = { weaponId: 'shortbow', weaponType: 'ranged' };
        expect(combatSfxKey(config, 'impact', { ...melee, hit: false, blocked: true })).toBeNull();
        expect(combatSfxKey(config, 'impact', { ...melee, hit: true, blocked: true })).toBe('meleeBlock');
        expect(combatSfxKey(config, 'impact', { ...ranged, hit: true, blocked: true })).toBeNull();
        expect(combatSfxKey(config, 'impact', { ...ranged, hit: true })).toBe('projectileSoft');
    });

    it('falls back to natural contact but leaves spell attacks outside the physical matrix', () => {
        expect(combatSfxFamily(config, { weaponType: 'melee' })).toBe('natural');
        expect(combatSfxFamily(config, { weaponId: 'glaive' })).toBe('edged');
        expect(combatSfxFamily(config, { weaponId: 'halberd' })).toBe('edged');
        expect(combatSfxKey(config, 'impact', { weaponId: 'whip', hit: true,
            defenderArmorId: 'plateMail' })).toBe('whipMetal');
        expect(combatSfxKey(config, 'release', { weaponId: 'blowgun' })).toBe('blowgunRelease');
        expect(combatSfxFamily(config, { attackKind: 'meleeSpellAttack' })).toBeNull();
        expect(combatSfxFamily(config, { damageType: 'fire', weaponType: 'ranged' })).toBeNull();
        expect(combatSfxKey(config, 'impact', { downed: true })).toBe('bodyFall');
        expect(combatSfxKey(config, 'impact', { downed: true, defenderArmorId: 'plateMail' }))
            .toBe('downedArmored');
        expect(combatSfxKey(config, 'impact', { downed: true, monsterId: 'wolf' })).toBe('creatureFall');
        expect(combatSfxKey(config, 'impact', { downed: true, monsterId: 'specter' })).toBeNull();
    });
});
