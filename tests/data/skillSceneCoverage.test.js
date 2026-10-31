import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolveChallengeScene } from '../../src/ui/ChallengeScene.js';
import { gameState } from '../../src/core/GameState.js';

afterEach(() => vi.restoreAllMocks());

describe('authored skill scene coverage', () => {
    it('provides real default and context images for every catalogue definition and the social tree', () => {
        const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));
        const definitions = Object.values(read('skillChallenges').challenges);
        definitions.push(read('skillChallenges/bandit-negotiation'));
        const saved = gameState.data;
        vi.spyOn(Math, 'random').mockImplementation(() => {
            throw new Error('Presentation consumed gameplay RNG');
        });
        try {
            for (const active of [false, true]) {
                gameState.data = { dungeon: { active } };
                const initial = JSON.stringify(gameState.data);
                for (const challenge of definitions) {
                    const terrains = [undefined, ...Object.keys(challenge.terrainModifiers || {})];
                    for (const terrainType of terrains) {
                        const scene = resolveChallengeScene(challenge, { terrainType });
                        expect(scene, `${challenge.id} in ${terrainType || 'unknown terrain'}`).toBeTruthy();
                        expect(scene.alt.length).toBeGreaterThan(0);
                        expect(existsSync(new URL(`../../${scene.image}`, import.meta.url)), scene.image).toBe(true);
                    }
                }
                expect(JSON.stringify(gameState.data)).toBe(initial);
            }
        } finally {
            gameState.data = saved;
        }
    });
});
