#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildPrompt, buildNegativePrompt } from './prompt-builder.js';
import { generateImage, promptHash } from './azure-client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');
const MANIFEST_PATH = join(__dirname, 'manifest.json');
const GRAPHICS_DIR = join(REPO_ROOT, 'data/graphics');

// Load .env — check tools/image-gen/.env first, fall back to project root .env
for (const envPath of [join(__dirname, '.env'), join(REPO_ROOT, '.env')]) {
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
      if (m) process.env[m[1].trim()] ??= m[2].trim();
    }
    break;
  }
}

function loadJson(relativePath) {
  return JSON.parse(readFileSync(join(REPO_ROOT, relativePath), 'utf8'));
}

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return {};
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

function saveManifest(manifest) {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function dateStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function loadStyleGuide() {
  const path = join(__dirname, 'style-guide.md');
  if (!existsSync(path)) throw new Error('style-guide.md not found in tools/image-gen/');
  return readFileSync(path, 'utf8');
}

function flattenData(data) {
  if (Array.isArray(data)) return data.flat(Infinity).filter(x => x && typeof x === 'object' && x.id);
  return Object.values(data).flat(Infinity).filter(x => x && typeof x === 'object' && x.id);
}

function flattenMagicItems(data) {
  return ['weapons', 'armor', 'shields', 'wondrous', 'legendary']
    .flatMap(k => (Array.isArray(data[k]) ? data[k] : []))
    .filter(x => x && x.id);
}

function buildJobs(type, opts, manifest) {
  const jobs = [];

  function addJobs(assetType, assets, outDir) {
    if (outDir) mkdirSync(outDir, { recursive: true });
    const stamp = opts.suffix || dateStamp();
    for (const asset of assets) {
      if (opts.id && asset.id !== opts.id) continue;
      const sep = opts.suffix ? '-' : '_';
      const filename = `${asset.id}${sep}${stamp}.png`;
      const outputPath = outDir ? join(outDir, filename) : join(GRAPHICS_DIR, filename);
      const key = `${assetType}/${asset.id}`;
      if (opts.missingOnly && manifest[key] && existsSync(outputPath)) continue;
      jobs.push({ assetType, asset, outputPath, key });
    }
  }

  if (type === 'terrain' || opts.all) {
    addJobs('terrain', flattenData(loadJson('data/terrains.json')), null);
  }
  if (type === 'monsters' || opts.all) {
    addJobs('monsters', flattenData(loadJson('data/monsters.json')), join(GRAPHICS_DIR, 'monsters'));
  }
  if (type === 'items' || opts.all) {
    const items = flattenData(loadJson('data/items.json'));
    const magic = flattenMagicItems(loadJson('data/magicItems.json'));
    addJobs('items', [...items, ...magic], join(GRAPHICS_DIR, 'items'));
  }
  if (type === 'portraits' || opts.all) {
    addJobs('portraits', flattenData(loadJson('data/races.json')), join(GRAPHICS_DIR, 'portraits'));
  }

  return jobs;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { type: null, id: null, missingOnly: false, dryRun: false, all: false, suffix: null };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--type')          opts.type = args[++i];
    else if (a === '--id')       opts.id = args[++i];
    else if (a === '--suffix')   opts.suffix = args[++i];
    else if (a === '--model')    { process.env.AZURE_FOUNDRY_MODEL = args[++i]; }
    else if (a === '--missing-only') opts.missingOnly = true;
    else if (a === '--dry-run')  opts.dryRun = true;
    else if (a === '--all')      opts.all = true;
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else { console.error(`Unknown flag: ${a}`); printHelp(); process.exit(1); }
  }
  return opts;
}

function printHelp() {
  console.log(`
Usage: node tools/image-gen/generate.js [options]

Flags:
  --type <type>       terrain | monsters | items | portraits
  --id <id>           generate only this asset ID
  --model <name>      override AZURE_FOUNDRY_MODEL (e.g. MAI-Image-2.5-Flash)
  --suffix <suffix>   filename suffix instead of timestamp
  --missing-only      skip assets already in manifest with existing files
  --dry-run           print prompts, do not call the API
  --all               generate all asset types

Env vars (required unless --dry-run):
  AZURE_FOUNDRY_ENDPOINT       e.g. https://my-resource.services.ai.azure.com
  AZURE_FOUNDRY_API_KEY
  AZURE_FOUNDRY_MODEL          MAI-Image-2.5 | MAI-Image-2.5-Flash | MAI-Image-2e | MAI-Image-2
  AZURE_RATE_LIMIT_MS          override inter-request delay (auto-detected from model if unset)
  AZURE_PROVIDER               foundry (default) | openai

Examples:
  node tools/image-gen/generate.js --type terrain --dry-run
  node tools/image-gen/generate.js --type monsters --id goblin
  node tools/image-gen/generate.js --all --missing-only
`.trim());
}

function rateDelay() {
  if (process.env.AZURE_RATE_LIMIT_MS) return parseInt(process.env.AZURE_RATE_LIMIT_MS, 10);
  const model = (process.env.AZURE_FOUNDRY_MODEL || '').toLowerCase();
  if (model.includes('2.5')) return 32000;
  if (model.includes('2e'))  return 4000;
  return 7000;
}

async function run() {
  const opts = parseArgs();

  if (!opts.type && !opts.all) {
    console.error('Error: --type <type> or --all required\n');
    printHelp();
    process.exit(1);
  }

  const styleGuide = loadStyleGuide();
  const manifest = loadManifest();
  const jobs = buildJobs(opts.type, opts, manifest);

  if (jobs.length === 0) {
    console.log('No assets to generate.');
    return;
  }

  console.log(`${opts.dryRun ? '[DRY RUN] ' : ''}${jobs.length} asset(s) queued\n`);

  let done = 0;
  let failed = 0;

  for (let i = 0; i < jobs.length; i++) {
    const { assetType, asset, outputPath, key } = jobs[i];
    const prompt = buildPrompt(styleGuide, assetType, asset);
    const negativePrompt = buildNegativePrompt(styleGuide, assetType);

    if (opts.dryRun) {
      console.log(`[${key}]`);
      console.log(`  out: ${outputPath.replace(REPO_ROOT + '/', '')}`);
      console.log(`  prompt: ${prompt.slice(0, 200)}${prompt.length > 200 ? '…' : ''}`);
      console.log(`  negative: ${negativePrompt.slice(0, 120)}${negativePrompt.length > 120 ? '…' : ''}`);
      console.log();
      continue;
    }

    process.stdout.write(`[${i + 1}/${jobs.length}] ${key} ... `);

    try {
      const imageData = await generateImage(prompt, { negativePrompt });
      writeFileSync(outputPath, imageData);

      manifest[key] = {
        generatedAt: new Date().toISOString(),
        promptHash: promptHash(prompt),
        outputPath: outputPath.replace(REPO_ROOT + '/', ''),
      };
      saveManifest(manifest);

      console.log(`saved`);
      done++;
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      failed++;
    }

    // Rate limit: 2.5/2.5-flash = 2 RPM → 32s; 2e = 18 RPM → 4s; 2 = 9 RPM → 7s
    if (i < jobs.length - 1) await new Promise(r => setTimeout(r, rateDelay()));
  }

  console.log(`\nDone: ${done} saved, ${failed} failed.`);
}

run().catch(err => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
