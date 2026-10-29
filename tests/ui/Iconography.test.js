import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { iconId, iconMarkup, conditionIconId, conditionMarkup, drawIcon } from '../../src/ui/Iconography.js';
import { iconCatalogue, iconAliases } from '../../src/ui/iconCatalogue.js';

describe('Shared iconography contract', () => {
    it('renders legacy restored conditions without changing mechanical state or exposing hidden markers', () => {
        const conditions = JSON.parse(JSON.stringify([
            { type: 'bleeding', icon: String.fromCodePoint(0x1fa78), duration: 3, value: 1.2 },
            { type: 'prone', icon: null, duration: 1 },
            { type: 'unknown', icon: 'unrecognised', isBuff: false }
        ]));
        const before = JSON.stringify(conditions);
        expect(conditionIconId(conditions[0])).toBe('condition.bleeding');
        expect(conditionMarkup(conditions[0])).toContain('<svg');
        expect(conditionMarkup(conditions[0])).not.toMatch(/\p{Extended_Pictographic}/u);
        expect(conditionMarkup(conditions[1])).toBe('');
        expect(conditionMarkup({ type: 'prone' })).toBe('');
        expect(conditionMarkup({ type: 'prone', icon: false })).toBe('');
        expect(conditionIconId(conditions[2])).toBe('condition.debuff');
        expect(JSON.stringify(conditions)).toBe(before);
    });

    it('escapes accessible labels and leaves adjacent-text icons decorative', () => {
        expect(iconMarkup('system.save')).toContain('aria-hidden="true"');
        expect(iconMarkup('system.save', { label: 'Save "first" <slot>' })).toContain('aria-label="Save &quot;first&quot; &lt;slot&gt;"');
        expect(iconMarkup('missing')).toContain('data-symbol="outcome.warning"');
        expect(iconId('~', null)).toBeNull();
        expect(iconId(String.fromCodePoint(0x2692), null)).toBe('system.settings');
    });

    it('uses the same path for canvas and SVG and reuses cached geometry', () => {
        const Path = vi.fn(function(path) {
            this.path = path;
        });
        vi.stubGlobal('Path2D', Path);
        const ctx = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), stroke: vi.fn(), fill: vi.fn() };
        try {
            drawIcon(ctx, 'system.save', 10, 20, 24, '#ffffff');
            drawIcon(ctx, 'system.save', 10, 20, 16, '#ffffff');
            expect(Path).toHaveBeenCalledTimes(2);
            expect(iconMarkup('system.save')).toContain(Path.mock.calls[0][0]);
            expect(ctx.translate).toHaveBeenCalledWith(10, 20);
            expect(ctx.restore).toHaveBeenCalledTimes(2);
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it('resolves every authored data icon and every library alias', () => {
        for (const target of Object.values(iconAliases)) {
            expect(iconCatalogue[target]).toBeDefined();
        }
        const walk = value => {
            if (!value || typeof value !== 'object') {
                return;
            }
            for (const [key, child] of Object.entries(value)) {
                if (key.startsWith('_')) {
                    continue;
                }
                if (['icon', 'conditionIcon'].includes(key) && typeof child === 'string') {
                    expect(iconId(child, null), child).not.toBeNull();
                }
                walk(child);
            }
        };
        for (const file of readdirSync(new URL('../../data/', import.meta.url)).filter(name => /\.json(?:\.example)?$/.test(name))) {
            walk(JSON.parse(readFileSync(new URL(`../../data/${file}`, import.meta.url), 'utf8')));
        }
    });

    it('keeps game-authored content emoji-free without banning legal copyright or ordinary text', () => {
        const scan = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
            const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
            return entry.isDirectory() ? scan(path) : /\.(js|json|example)$/.test(entry.name) ? [path] : [];
        });
        const root = new URL('../../', import.meta.url);
        const files = [...scan(new URL('src/', root)), ...scan(new URL('data/', root)), new URL('index.html', root), new URL('styles.css', root)];
        for (const file of files) {
            const text = readFileSync(file, 'utf8').replace(/©/g, '');
            expect(text, file.pathname).not.toMatch(/\p{Extended_Pictographic}|\uFE0F|\u20E3|[\u{1F1E6}-\u{1F1FF}]/u);
        }
    });
});
