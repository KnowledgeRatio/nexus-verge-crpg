import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import console from 'node:console';
import { iconCatalogue, iconAliases } from '../src/ui/iconCatalogue.js';
import { iconMarkup } from '../src/ui/Iconography.js';

const root = new URL('../data/icons/', import.meta.url);
await mkdir(root, { recursive: true });
const entries = { ...Object.fromEntries(Object.keys(iconCatalogue).map(id => [id, id])), ...iconAliases };
for (const [id, target] of Object.entries(entries)) {
    const svg = iconMarkup(target, { label: iconCatalogue[target].label })
        .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" ');
    await writeFile(new URL(`${id}.svg`, root), `${svg}\n`);
}
await writeFile(new URL('catalogue.json', root), `${JSON.stringify(Object.fromEntries(
    Object.entries(entries).map(([id, target]) => [id, { label: iconCatalogue[target].label, file: `${id}.svg`, master: target }])
), null, 2)}\n`);
const cells = Object.entries(entries).map(([id, target]) => `<article><h2>${iconCatalogue[target].label}</h2><code>${id}</code><div class="samples">${[16, 24, 32, 48].map(size => `<span>${iconMarkup(target)}<small>${size}px</small></span>`).join('')}</div></article>`).join('\n');
await writeFile(new URL('../../docs/art/iconography/library.html', root), `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nexus Verge iconography library</title>
<style>body{background:#102e35;color:#f3e9d2;font:16px Georgia,serif;margin:2rem}h1{font-weight:normal}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem}article{border:1px solid #6f6d67;padding:1rem;background:#0a2730}h2{font-size:18px;margin:0 0 .5rem}code{font-size:12px;color:#d5a425}.samples{display:flex;align-items:end;justify-content:space-between;margin-top:1.5rem}.samples span{display:grid;justify-items:center;gap:8px}.samples span:nth-child(1) svg{width:16px;height:16px}.samples span:nth-child(2) svg{width:24px;height:24px}.samples span:nth-child(3) svg{width:32px;height:32px}.samples span:nth-child(4) svg{width:48px;height:48px}small{font:11px monospace}</style>
<h1>Nexus Verge — Iconography library</h1><p>Shared SVG and canvas masters. Actual CSS sizes: 16, 24, 32 and 48 pixels. Labels remain part of the game interface.</p><main>${cells}</main></html>\n`);
console.log(`Exported ${Object.keys(entries).length} symbols to ${fileURLToPath(root)}`);
