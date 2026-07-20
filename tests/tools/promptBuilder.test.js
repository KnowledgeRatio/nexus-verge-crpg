import { describe, expect, it } from 'vitest';
import { buildPrompt } from '../../tools/image-gen/prompt-builder.js';

const styleGuide = `
## Terrain Art Style
SHARED CARTOGRAPHIC STYLE.

## Terrain Atlases
CONTINUOUS ATLAS CONTRACT.

## Terrain Tiles
LEGACY TILE CONTRACT.
`;

describe('terrain prompt builder', () => {
    it('injects the shared terrain style and continuous-atlas contract', () => {
        const prompt = buildPrompt(styleGuide, 'terrain', {
            name: 'Forest',
            description: 'Player-facing description.',
            imageDescription: 'Model-facing forest description.',
            visual: {
                mode: 'continuousAtlas',
                atlasTilesPerSide: 16,
                motifsPerTile: { min: 3, max: 6 }
            }
        });

        expect(prompt).toContain('SHARED CARTOGRAPHIC STYLE.');
        expect(prompt).toContain('CONTINUOUS ATLAS CONTRACT.');
        expect(prompt).toContain('Model-facing forest description.');
        expect(prompt).not.toContain('Player-facing description.');
        expect(prompt).toContain('16 by 16 world tiles');
        expect(prompt).toContain('3 to 6 broad terrain motifs');
    });

    it('retains the legacy terrain contract for unconfigured assets', () => {
        const prompt = buildPrompt(styleGuide, 'terrain', {
            name: 'Road',
            description: 'A road.'
        });

        expect(prompt).toContain('SHARED CARTOGRAPHIC STYLE.');
        expect(prompt).toContain('LEGACY TILE CONTRACT.');
        expect(prompt).not.toContain('CONTINUOUS ATLAS CONTRACT.');
    });
});
