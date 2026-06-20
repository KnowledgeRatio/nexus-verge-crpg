// One-off script to reproduce the exact voidSpawn v3 prompt
// Builds the prompt identically to how it was assembled at time of v3 generation
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { generateImage } from './azure-client.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dir, '../..');

for (const envPath of [join(__dir, '.env'), join(REPO_ROOT, '.env')]) {
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
      if (m) process.env[m[1].trim()] ??= m[2].trim();
    }
    break;
  }
}

const artStyle = `Illustrative oil painting — gestural, bold, designed. Strong value contrast: peripheral areas dissolve into loose atmospheric shadow while focal subjects are rendered with precision. Concept art aesthetic, not fine art. Visible impasto brushwork throughout. Colour palette: earth tones as the base (ash grey, iron brown, deep slate) with lifted saturation at focal subjects — rich deep green, warm amber, cold slate-blue. No bright saturated fantasy palette, but not washed out. Single warm light source upper-left, cool atmospheric fill from opposite side. Every asset carries evidence of multiple origins: mismatched materials, two-climate details, rift-geometry seams. Equipment shows use — worn, repaired, improvised. Mood: desperate wonder, survival on a living frontier. No photo-realism. No anime. No modern technology. No industrial equipment.`;

const imageDescription = `A torso-sized mass of dense black smoke, irregular and asymmetric — wider at the top than the bottom, no humanoid shape. No face, no eyes, no features anywhere in the smoke. Frost spreads outward across the dungeon floor in crystalline patterns from where it stands. A torch flame visible in the background leans visibly away. Cold pale light at the boundary between the smoke and the warm-lit surrounding air. Stone walls and floor fully rendered.`;

const oldMonsterArt = `Three-quarter view, creature fills 70% of frame. Bold readable silhouette — threat communicates from shape before detail. Background is dark and loose: ancient stone, dimensional haze, or pure atmospheric shadow. Peripheral background is gestural and unresolved; all rendering precision on the creature. Medieval-fantasy setting only: no modern technology, no industrial elements, no post-apocalyptic debris, no electric lighting. Non-voidborn creatures from other dimensions are biologically wrong in precise ways — wrong proportions, fur adapted to a different climate, eyes built for different light. Render the wrongness as a specific physical observation, not exaggeration. Voidborn are rendered as absence given shape: geometry that should not cohere, dissolving edges, no readable face, no expression, no intent — they are physics, not creatures. No white border, no frame, no bezel.`;

const v3Prompt = [
  artStyle,
  'Fantasy game illustration of a voidSpawn, a small alien creature.',
  imageDescription,
  'Alignment: unaligned.',
  'Defining trait: Void Nature.',
  oldMonsterArt,
].join(' ');

console.log('--- EXACT V3 PROMPT ---');
console.log(v3Prompt);
console.log('---');

const ITERATIONS = 4;
const DELAY_MS = 32000;

async function run() {
  for (let i = 1; i <= ITERATIONS; i++) {
    console.log(`\n[${i}/${ITERATIONS}] Generating voidSpawn-v3-repro-${i}...`);
    try {
      const buf = await generateImage(v3Prompt, { width: 1024, height: 1024 });
      const outPath = join(REPO_ROOT, `data/graphics/monsters/voidSpawn-v3-repro-${i}.png`);
      writeFileSync(outPath, buf);
      console.log(`  saved → ${outPath}`);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
    }
    if (i < ITERATIONS) {
      console.log(`  waiting ${DELAY_MS / 1000}s...`);
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }
  console.log('\nDone.');
}

run();
