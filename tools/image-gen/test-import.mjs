import { buildPrompt, buildNegativePrompt } from './prompt-builder.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const styleGuide = readFileSync(join(__dirname, 'style-guide.md'), 'utf8');
const neg = buildNegativePrompt(styleGuide);
const fakeItem = { id: 'dagger', name: 'Dagger', type: 'weapon', category: 'simple', weaponType: 'melee', damageType: 'piercing', properties: ['finesse','light','thrown'], rarity: 'common', description: 'test desc' };
const prompt = buildPrompt(styleGuide, 'items', fakeItem);
console.log('NEGATIVE:', neg.slice(0, 100));
console.log('PROMPT:', prompt.slice(0, 300));
